-- Execute após SQL16. Não apaga marcas, produtos ou pedidos.
BEGIN;
CREATE OR REPLACE FUNCTION public.shop_set_brand_products(p_brand text,p_products text[]) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE expected integer;
BEGIN
 IF NOT public.admin_has_access() THEN RAISE EXCEPTION 'Acesso administrativo necessário' USING ERRCODE='42501';END IF;
 PERFORM 1 FROM public.brands WHERE id::text=p_brand FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Marca inexistente';END IF;
 IF p_products IS NULL OR cardinality(p_products)>10000 THEN RAISE EXCEPTION 'Seleção inválida';END IF;
 SELECT count(DISTINCT x) INTO expected FROM unnest(p_products)x;
 IF expected<>(SELECT count(*) FROM public.products WHERE active AND id::text=ANY(p_products)) THEN RAISE EXCEPTION 'Algum produto ficou inativo ou foi excluído. Atualize a lista';END IF;
 UPDATE public.products SET brand_id=NULL WHERE active AND brand_id::text=p_brand AND NOT(id::text=ANY(p_products));
 UPDATE public.products p SET brand_id=b.id FROM public.brands b WHERE b.id::text=p_brand AND p.active AND p.id::text=ANY(p_products);
END$$;
REVOKE ALL ON FUNCTION public.shop_set_brand_products(text,text[]) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.shop_set_brand_products(text,text[]) TO authenticated;

CREATE TABLE IF NOT EXISTS public.shop_customer_order_accounts(order_id uuid PRIMARY KEY REFERENCES public.shop_orders(id) ON DELETE CASCADE,user_id uuid NOT NULL,created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS shop_account_orders_user_idx ON public.shop_customer_order_accounts(user_id);
ALTER TABLE public.shop_customer_order_accounts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.shop_customer_order_accounts FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.shop_customer_order_accounts TO service_role;
CREATE OR REPLACE FUNCTION public.shop_link_customer_order(p_user uuid,p_order uuid,p_token uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
BEGIN
 IF p_user IS NULL OR NOT EXISTS(SELECT 1 FROM public.shop_orders WHERE id=p_order AND access_token=p_token) THEN RAISE EXCEPTION 'Link privado inválido' USING ERRCODE='42501';END IF;
 INSERT INTO public.shop_customer_order_accounts(order_id,user_id) VALUES(p_order,p_user) ON CONFLICT(order_id) DO NOTHING;
 IF NOT EXISTS(SELECT 1 FROM public.shop_customer_order_accounts WHERE order_id=p_order AND user_id=p_user) THEN RAISE EXCEPTION 'Pedido já protegido por outra conta' USING ERRCODE='42501';END IF;
END$$;
REVOKE ALL ON FUNCTION public.shop_link_customer_order(uuid,uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.shop_link_customer_order(uuid,uuid,uuid) TO service_role;
CREATE OR REPLACE FUNCTION public.shop_account_orders(p_user uuid) RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
 SELECT jsonb_build_object('orders',coalesce(jsonb_agg(to_jsonb(o)-'customer_document'-'request_key'-'pix_data' ORDER BY o.created_at DESC),'[]'))
 FROM public.shop_orders o JOIN public.shop_customer_order_accounts a ON a.order_id=o.id WHERE a.user_id=p_user;
$$;
REVOKE ALL ON FUNCTION public.shop_account_orders(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.shop_account_orders(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.shop_financial_report(p_start date,p_end date,p_grain text DEFAULT 'day') RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE summary jsonb;series jsonb;payments jsonb;recent jsonb;
BEGIN
 IF p_start IS NULL OR p_end IS NULL OR p_end<p_start OR p_end-p_start>3660 OR p_grain IS NULL OR p_grain NOT IN ('day','week','month','year') THEN RAISE EXCEPTION 'Período ou agrupamento inválido';END IF;
 WITH scoped AS(SELECT *,coalesce(nullif(payload->>'paid_at','')::timestamptz,created_at) paid_on FROM public.shop_order_history),selected AS(SELECT *,order_status IN ('cancelled','canceled','cancelado') cancelled FROM scoped WHERE (paid_on AT TIME ZONE 'America/Campo_Grande')::date BETWEEN p_start AND p_end)
 SELECT jsonb_build_object('paid_orders',count(*) FILTER(WHERE payment_status IN ('paid','approved','pago') AND NOT cancelled),'revenue',coalesce(sum(total_amount) FILTER(WHERE payment_status IN ('paid','approved','pago') AND NOT cancelled),0),'delivery_fees',coalesce(sum(coalesce((payload->>'delivery_fee')::numeric,0)) FILTER(WHERE payment_status IN ('paid','approved','pago') AND NOT cancelled),0),'discounts',coalesce(sum(coalesce((payload->>'discount_amount')::numeric,0)) FILTER(WHERE payment_status IN ('paid','approved','pago') AND NOT cancelled),0),'cancelled_paid',coalesce(sum(total_amount) FILTER(WHERE payment_status IN ('paid','approved','pago') AND cancelled),0),'to_collect',coalesce(sum(total_amount) FILTER(WHERE payment_status NOT IN ('paid','approved','pago') AND payment_method<>'pix' AND NOT cancelled),0)) INTO summary FROM selected;
 WITH paid AS(SELECT *,coalesce(nullif(payload->>'paid_at','')::timestamptz,created_at) paid_on FROM public.shop_order_history WHERE payment_status IN ('paid','approved','pago') AND order_status NOT IN ('cancelled','canceled','cancelado')),agg AS(SELECT date_trunc(p_grain,paid_on AT TIME ZONE 'America/Campo_Grande')::date period,count(*) orders,sum(total_amount) revenue FROM paid WHERE (paid_on AT TIME ZONE 'America/Campo_Grande')::date BETWEEN p_start AND p_end GROUP BY 1),buckets AS(SELECT generate_series(date_trunc(p_grain,p_start::timestamp),date_trunc(p_grain,p_end::timestamp),('1 '||p_grain)::interval)::date period)
 SELECT coalesce(jsonb_agg(jsonb_build_object('period',b.period,'orders',coalesce(a.orders,0),'revenue',coalesce(a.revenue,0)) ORDER BY b.period),'[]') INTO series FROM buckets b LEFT JOIN agg a USING(period);
 WITH paid AS(SELECT *,coalesce(nullif(payload->>'paid_at','')::timestamptz,created_at) paid_on FROM public.shop_order_history WHERE payment_status IN ('paid','approved','pago') AND order_status NOT IN ('cancelled','canceled','cancelado')) SELECT coalesce(jsonb_agg(x),'[]') INTO payments FROM(SELECT payment_method,count(*) orders,sum(total_amount) revenue FROM paid WHERE (paid_on AT TIME ZONE 'America/Campo_Grande')::date BETWEEN p_start AND p_end GROUP BY payment_method)x;
 WITH paid AS(SELECT *,coalesce(nullif(payload->>'paid_at','')::timestamptz,created_at) paid_on FROM public.shop_order_history WHERE payment_status IN ('paid','approved','pago') AND order_status NOT IN ('cancelled','canceled','cancelado')) SELECT coalesce(jsonb_agg(x ORDER BY x.paid_on DESC),'[]') INTO recent FROM(SELECT payload->>'protocol' protocol,paid_on,payment_method,total_amount FROM paid WHERE (paid_on AT TIME ZONE 'America/Campo_Grande')::date BETWEEN p_start AND p_end ORDER BY paid_on DESC LIMIT 100)x;
 RETURN jsonb_build_object('summary',summary,'series',series,'payments',payments,'recent',recent,'start',p_start,'end',p_end,'grain',p_grain);
END$$;
REVOKE ALL ON FUNCTION public.shop_financial_report(date,date,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.shop_financial_report(date,date,text) TO service_role;
CREATE OR REPLACE FUNCTION public.storefront_catalog() RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE result jsonb;store_config jsonb;is_open boolean;opening time;closing time;current_time_sp time;public_brands jsonb; all_products jsonb;
BEGIN
 WITH public_products AS (
  SELECT p.id::text AS id,jsonb_build_object('id',p.id::text,'name',p.name,'description',p.description,
   'price',p.price,'promotional_price',p.promotional_price,'image_url',p.image_url,'unit',p.unit,
   'stock',coalesce(p.stock,0),'active',true,'brand_id',to_jsonb(p)->>'brand_id','category_id',p.category_id::text,
   'category_name',(SELECT c.name FROM public.categories c WHERE c.id=p.category_id LIMIT 1)) AS payload
  FROM public.products p WHERE p.active=true
 )
 SELECT jsonb_build_object('sections',coalesce(jsonb_agg(s ORDER BY s.display_order,s.name,s.id),'[]'::jsonb)) INTO result
 FROM (
  SELECT s.id::text AS id,s.name,s.slug,s.display_order,
   coalesce(to_jsonb(s)->>'description','') AS description,
   coalesce((SELECT jsonb_agg(p.payload ORDER BY sp.display_order,p.id)
    FROM public.catalog_section_products sp JOIN public_products p ON p.id=sp.product_id::text
    WHERE sp.section_id=s.id),'[]'::jsonb) AS products
  FROM public.catalog_sections s WHERE s.active=true
 ) s;
 -- Marcas públicas: somente identidade visual e nomes ativos.
 IF to_regclass('public.brands') IS NOT NULL THEN
  EXECUTE $brands$SELECT coalesce(jsonb_agg(jsonb_build_object('id',b.id::text,'name',b.name,
   'logo_url',to_jsonb(b)->>'logo_url') ORDER BY coalesce((to_jsonb(b)->>'featured')::boolean,false) DESC,b.name),'[]'::jsonb)
   FROM public.brands b WHERE coalesce((to_jsonb(b)->>'active')::boolean,true)$brands$ INTO public_brands;
  result=result||jsonb_build_object('brands',public_brands);
 END IF;
 -- Configuração pública de horário, sem campos privados da loja.
 IF to_regclass('public.store_status') IS NOT NULL THEN
  EXECUTE 'SELECT to_jsonb(s) FROM public.store_status s WHERE id=1 LIMIT 1' INTO store_config;
  IF store_config IS NOT NULL THEN
   BEGIN
    IF coalesce((store_config->>'manual_override')::boolean,false) THEN
     is_open=coalesce((store_config->>'is_open')::boolean,false);
    ELSE
     opening=(store_config->>'opening_time')::time;closing=(store_config->>'closing_time')::time;
     current_time_sp=(now() AT TIME ZONE 'America/Campo_Grande')::time;
     is_open=CASE WHEN opening IS NULL OR closing IS NULL THEN NULL WHEN opening=closing THEN true
      WHEN opening<closing THEN current_time_sp>=opening AND current_time_sp<closing
      ELSE current_time_sp>=opening OR current_time_sp<closing END;
    END IF;
   EXCEPTION WHEN invalid_text_representation OR invalid_datetime_format THEN is_open=NULL;
   END;
   result=result||jsonb_build_object('store',jsonb_build_object('is_open',is_open,'opening_time',store_config->>'opening_time',
    'closing_time',store_config->>'closing_time','closed_message',store_config->>'closed_message'));
  END IF;
 END IF;
 SELECT coalesce(jsonb_agg(jsonb_build_object('id',p.id::text,'name',p.name,'description',p.description,'price',p.price,'promotional_price',p.promotional_price,'image_url',p.image_url,'unit',p.unit,'stock',coalesce(p.stock,0),'active',true,'brand_id',to_jsonb(p)->>'brand_id','category_id',p.category_id::text,'category_name',(SELECT name FROM public.categories WHERE id=p.category_id LIMIT 1)) ORDER BY p.name),'[]') INTO all_products FROM public.products p WHERE p.active;
 result=result||jsonb_build_object('products',all_products);
 RETURN result;
END$$;
REVOKE ALL ON FUNCTION public.storefront_catalog() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.storefront_catalog() TO anon,authenticated;

-- Associa apenas produtos ativos sem marca quando há uma única correspondência pelo nome.
WITH candidates AS (
 SELECT p.id product_id,b.id brand_id,count(*) OVER(PARTITION BY p.id) matches
 FROM public.products p JOIN public.brands b ON coalesce(b.active,true)
 AND length(trim(regexp_replace(lower(b.name),'[^a-z0-9]+',' ','g')))>=3
 AND (' '||regexp_replace(lower(p.name),'[^a-z0-9]+',' ','g')||' ') LIKE ('% '||trim(regexp_replace(lower(b.name),'[^a-z0-9]+',' ','g'))||' %')
 WHERE p.active AND p.brand_id IS NULL
)
UPDATE public.products p SET brand_id=c.brand_id FROM candidates c WHERE c.product_id=p.id AND c.matches=1 AND p.active AND p.brand_id IS NULL;


-- Preenche apenas logomarcas ausentes das referências incluídas no pacote.
UPDATE public.brands b SET logo_url=v.url FROM (VALUES
('heineken','/brands/heineken.svg'),
('ambev','/brands/ambev.svg'),
('antarctica','/brands/antarctica.svg'),
('brahma','/brands/brahma.svg'),
('budweiser','/brands/budweiser.svg'),
('cocacola','/brands/cocacola.svg'),
('redbull','/brands/redbull.svg'),
('monster','/brands/monsterenergy.svg'),
('monsterenergy','/brands/monsterenergy.svg')
) AS v(name,url) WHERE regexp_replace(lower(translate(b.name,'áàãâéêíóôõúç','aaaaeeiooouc')),'[^a-z0-9]','','g')=v.name AND trim(coalesce(b.logo_url,''))='';

COMMIT;
