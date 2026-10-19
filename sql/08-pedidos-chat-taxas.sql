-- Atualização 16/10/2026. Execute após os SQLs anteriores do catálogo/admin.
-- Novos pedidos ficam em shop_orders; orders anteriores são preservados.
BEGIN;
CREATE TABLE IF NOT EXISTS public.delivery_zones (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),city text NOT NULL CHECK(city IN ('Corumbá','Ladário')),
 neighborhood text NOT NULL, fee numeric(12,2) NOT NULL CHECK(fee>=0),eta_minutes integer NOT NULL DEFAULT 45 CHECK(eta_minutes BETWEEN 5 AND 240),
 active boolean NOT NULL DEFAULT true,created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(city,neighborhood));
CREATE TABLE IF NOT EXISTS public.shop_orders (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),protocol text NOT NULL UNIQUE DEFAULT ('ALA-'||upper(replace(gen_random_uuid()::text,'-',''))),
 access_token uuid NOT NULL UNIQUE,request_key uuid NOT NULL UNIQUE,customer_name text NOT NULL,customer_phone text NOT NULL,
 customer_document text,payment_method text NOT NULL CHECK(payment_method IN ('pix','dinheiro','cartao')),
 payment_status text NOT NULL DEFAULT 'pending' CHECK(payment_status IN ('pending','paid','failed','refunded')),
 order_status text NOT NULL DEFAULT 'pending' CHECK(order_status IN ('pending','confirmed','preparing','out_for_delivery','delivered','cancelled')),
 subtotal numeric(12,2) NOT NULL,discount_amount numeric(12,2) NOT NULL DEFAULT 0,delivery_fee numeric(12,2) NOT NULL,total_amount numeric(12,2) NOT NULL,
 coupon_code text,observation text,address jsonb NOT NULL,items jsonb NOT NULL,zone_id uuid REFERENCES public.delivery_zones,
 courier_id text,eta_minutes integer,card_type text,change_for text,
 pagarme_order_id text UNIQUE,pix_data jsonb,paid_at timestamptz,created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS public.shop_order_events (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,order_id uuid NOT NULL REFERENCES public.shop_orders ON DELETE CASCADE,
 status text NOT NULL,description text NOT NULL,created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS public.shop_messages (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,order_id uuid NOT NULL REFERENCES public.shop_orders ON DELETE CASCADE,
 sender text NOT NULL CHECK(sender IN ('customer','store')),body text NOT NULL CHECK(length(trim(body)) BETWEEN 1 AND 2000),
 created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS shop_messages_order_idx ON public.shop_messages(order_id,id);
CREATE INDEX IF NOT EXISTS shop_events_order_idx ON public.shop_order_events(order_id,id);
CREATE INDEX IF NOT EXISTS shop_orders_recent_idx ON public.shop_orders(created_at DESC);
-- Todas as operações privadas passam pelo Node com service_role e validação administrativa/token.
ALTER TABLE public.delivery_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_order_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_messages ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.shop_orders,public.shop_order_events,public.shop_messages FROM anon,authenticated;
GRANT ALL ON public.shop_orders,public.shop_order_events,public.shop_messages,public.delivery_zones TO service_role;
GRANT USAGE,SELECT ON SEQUENCE public.shop_order_events_id_seq,public.shop_messages_id_seq TO service_role;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.delivery_zones TO authenticated;
DROP POLICY IF EXISTS delivery_zones_admin ON public.delivery_zones;
CREATE POLICY delivery_zones_admin ON public.delivery_zones FOR ALL TO authenticated USING(public.admin_has_access()) WITH CHECK(public.admin_has_access());
INSERT INTO public.delivery_zones(city,neighborhood,fee,eta_minutes) VALUES
 ('Corumbá','Centro',5,30),('Corumbá','Universitário',7,40),('Corumbá','Popular Velha',7,40),
 ('Corumbá','Popular Nova',8,45),('Corumbá','Cristo Redentor',8,45),('Corumbá','Nova Corumbá',10,50),
 ('Corumbá','Aeroporto',8,45),('Corumbá','Dom Bosco',7,40),('Corumbá','Maria Leite',8,45),
 ('Corumbá','Guanã',9,50),('Corumbá','Jardim dos Estados',9,50),('Corumbá','Guatós',10,55),
 ('Ladário','Centro',10,45),('Ladário','Almirante Tamandaré',12,50),('Ladário','Boa Esperança',12,55),
 ('Ladário','Seac',12,55),('Ladário','Nova Aliança',14,60)
 ON CONFLICT(city,neighborhood) DO NOTHING;
-- Valores e prazos acima são SIMULADOS e devem ser revisados antes de publicar.
CREATE OR REPLACE FUNCTION public.shop_create_order(p jsonb) RETURNS public.shop_orders
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE o public.shop_orders;z public.delivery_zones;pr public.products;it jsonb;quantity integer;price numeric;sub numeric:=0;discount numeric:=0;line_items jsonb:='[]';c jsonb;coupon text;
BEGIN
 SELECT * INTO o FROM public.shop_orders WHERE request_key=(p->>'request_key')::uuid FOR UPDATE;
 IF FOUND THEN
  IF o.access_token<>(p->>'access_token')::uuid THEN RAISE EXCEPTION 'Chave inválida'; END IF;
  RETURN o;
 END IF;
 IF jsonb_array_length(p->'items') NOT BETWEEN 1 AND 100 THEN RAISE EXCEPTION 'Carrinho inválido';END IF;
 IF length(trim(p->>'customer_name')) NOT BETWEEN 2 AND 160 OR (p->>'customer_phone') !~ '^[0-9]{10,11}$' THEN RAISE EXCEPTION 'Cliente inválido'; END IF;
 IF length(trim(p->'address'->>'street'))<2 OR length(trim(p->'address'->>'number'))<1 THEN RAISE EXCEPTION 'Endereço inválido';END IF;
 SELECT * INTO z FROM public.delivery_zones WHERE active AND lower(city)=lower(trim(p->'address'->>'city')) AND lower(neighborhood)=lower(trim(p->'address'->>'neighborhood')) FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Bairro não atendido. Escolha uma área de entrega cadastrada.';END IF;
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(p->'items') a GROUP BY a->>'id' HAVING count(*)>1) THEN RAISE EXCEPTION 'Itens repetidos';END IF;
 -- Ordem estável de bloqueio para dois carrinhos concorrentes.
 FOR it IN SELECT value FROM jsonb_array_elements(p->'items') ORDER BY value->>'id' LOOP
  quantity=(it->>'quantity')::integer;
  SELECT * INTO pr FROM public.products WHERE id::text=it->>'id' FOR UPDATE;
  IF NOT FOUND OR NOT pr.active OR quantity NOT BETWEEN 1 AND 999 OR coalesce(pr.stock,0)<quantity THEN RAISE EXCEPTION 'Produto indisponível ou estoque insuficiente';END IF;
  price=round(CASE WHEN pr.promotional_price>0 AND pr.promotional_price<pr.price THEN pr.promotional_price ELSE pr.price END,2);
  IF price IS NULL OR price<0 THEN RAISE EXCEPTION 'Preço inválido';END IF;
  sub=sub+price*quantity;
  line_items=line_items||jsonb_build_array(jsonb_build_object('product_id',pr.id::text,'product_name',pr.name,'quantity',quantity,'unit_price',price,'total_price',price*quantity,'image_url',pr.image_url));
  UPDATE public.products SET stock=stock-quantity WHERE id=pr.id;
 END LOOP;
 coupon=nullif(upper(trim(p->>'coupon_code')),'');
 IF coupon IS NOT NULL THEN
  SELECT to_jsonb(d) INTO c FROM public.discount_coupons d WHERE upper(d.code)=coupon FOR UPDATE;
  IF c IS NULL OR NOT (c->>'active')::boolean OR sub<coalesce((c->>'min_order')::numeric,0)
   OR (c->>'starts_at')::timestamptz>now() OR (c->>'ends_at')::timestamptz<now()
   OR (c->>'usage_limit' IS NOT NULL AND coalesce((c->>'used_count')::int,0)>=(c->>'usage_limit')::int) THEN RAISE EXCEPTION 'Cupom indisponível';END IF;
  discount=CASE WHEN c->>'discount_type'='percentage' THEN sub*(c->>'discount_value')::numeric/100 ELSE (c->>'discount_value')::numeric END;
  discount=round(greatest(0,least(sub,discount,coalesce((c->>'max_discount')::numeric,sub))),2);
  UPDATE public.discount_coupons SET used_count=coalesce(used_count,0)+1 WHERE upper(code)=coupon;
 END IF;
 IF round((p->>'expected_total')::numeric,2)<>round(sub-discount+z.fee,2) THEN RAISE EXCEPTION 'Preços ou taxa foram atualizados. Reabra o carrinho e confira os valores.';END IF;
 INSERT INTO public.shop_orders(access_token,request_key,customer_name,customer_phone,customer_document,payment_method,order_status,subtotal,discount_amount,delivery_fee,total_amount,coupon_code,observation,address,items,zone_id,eta_minutes,card_type,change_for)
 VALUES((p->>'access_token')::uuid,(p->>'request_key')::uuid,trim(p->>'customer_name'),p->>'customer_phone',p->>'customer_document',p->>'payment_method',CASE WHEN p->>'payment_method'='pix' THEN 'pending' ELSE 'confirmed' END,sub,discount,z.fee,sub-discount+z.fee,coupon,left(p->>'observation',2000),p->'address',line_items,z.id,z.eta_minutes,p->>'card_type',p->>'change_for') RETURNING * INTO o;
 INSERT INTO public.shop_order_events(order_id,status,description) VALUES(o.id,o.order_status,CASE WHEN o.payment_method='pix' THEN 'Pedido recebido. Aguardando Pix.' ELSE 'Pedido recebido. Pagamento na entrega.' END);
 RETURN o;
END$$;
REVOKE ALL ON FUNCTION public.shop_create_order(jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.shop_create_order(jsonb) TO service_role;
CREATE OR REPLACE FUNCTION public.shop_transition(p_id uuid,p_status text,p_description text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE o public.shop_orders;it jsonb;
BEGIN
 SELECT * INTO o FROM public.shop_orders WHERE id=p_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Pedido não encontrado'; END IF;
 IF o.order_status=p_status THEN RETURN;END IF;
 IF NOT ((o.order_status='pending' AND p_status IN ('confirmed','cancelled')) OR
 (o.order_status='confirmed' AND p_status IN ('preparing','cancelled')) OR
 (o.order_status='preparing' AND p_status IN ('out_for_delivery','cancelled')) OR
 (o.order_status='out_for_delivery' AND p_status IN ('delivered','cancelled'))) THEN RAISE EXCEPTION 'Mudança de etapa inválida'; END IF;
 IF p_status='confirmed' AND o.payment_method='pix' AND o.payment_status<>'paid' THEN RAISE EXCEPTION 'Pix ainda não confirmado';END IF;
 IF p_status='cancelled' THEN
  FOR it IN SELECT value FROM jsonb_array_elements(o.items) LOOP
   UPDATE public.products SET stock=stock+(it->>'quantity')::int WHERE id::text=it->>'product_id';
  END LOOP;
  IF o.coupon_code IS NOT NULL THEN UPDATE public.discount_coupons SET used_count=greatest(0,coalesce(used_count,0)-1) WHERE upper(code)=o.coupon_code;END IF;
 END IF;
 UPDATE public.shop_orders SET order_status=p_status,updated_at=now() WHERE id=p_id;
 INSERT INTO public.shop_order_events(order_id,status,description) VALUES(p_id,p_status,left(p_description,500));
END$$;
REVOKE ALL ON FUNCTION public.shop_transition(uuid,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.shop_transition(uuid,text,text) TO service_role;
-- Complemento do upload de fotos que já existe no admin.
ALTER TABLE public.delivery_couriers ADD COLUMN IF NOT EXISTS photo_path text;
INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types) VALUES('admin-photos','admin-photos',false,3145728,ARRAY['image/jpeg','image/png','image/webp']) ON CONFLICT(id) DO NOTHING;
DROP POLICY IF EXISTS shop_admin_photos ON storage.objects;
CREATE POLICY shop_admin_photos ON storage.objects FOR ALL TO authenticated USING(bucket_id='admin-photos' AND public.admin_has_access()) WITH CHECK(bucket_id='admin-photos' AND public.admin_has_access());
CREATE OR REPLACE FUNCTION public.admin_include_product(section_ref text,product_ref text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE sid public.catalog_sections.id%TYPE;pid public.products.id%TYPE;
BEGIN
 IF NOT public.admin_has_access() THEN RAISE EXCEPTION 'Acesso negado';END IF;
 SELECT id INTO STRICT sid FROM public.catalog_sections WHERE id::text=section_ref FOR UPDATE;
 SELECT id INTO STRICT pid FROM public.products WHERE id::text=product_ref;
 UPDATE public.products SET active=true WHERE id=pid;
 INSERT INTO public.catalog_section_products(section_id,product_id,display_order) VALUES(sid,pid,(SELECT coalesce(max(display_order),0)+1 FROM public.catalog_section_products WHERE section_id=sid)) ON CONFLICT(section_id,product_id) DO NOTHING;
END$$;
REVOKE ALL ON FUNCTION public.admin_include_product(text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_include_product(text,text) TO authenticated;
CREATE OR REPLACE FUNCTION public.shop_reorder_sections(refs text[]) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE ref text;i integer:=0;
BEGIN
 IF NOT public.admin_has_access() THEN RAISE EXCEPTION 'Acesso negado';END IF;
 IF cardinality(refs)<>(SELECT count(*) FROM public.catalog_sections) OR cardinality(refs)<>(SELECT count(DISTINCT x) FROM unnest(refs) x) THEN RAISE EXCEPTION 'Lista de seções mudou. Atualize o painel.';END IF;
 FOREACH ref IN ARRAY refs LOOP
  UPDATE public.catalog_sections SET display_order=i WHERE id::text=ref;
  IF NOT FOUND THEN RAISE EXCEPTION 'Seção inválida';END IF;i=i+1;
 END LOOP;
END$$;
REVOKE ALL ON FUNCTION public.shop_reorder_sections(text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.shop_reorder_sections(text[]) TO authenticated;
-- O Node assina as mudanças usando service_role; clientes recebem apenas avisos via SSE.
DO $$DECLARE t text;BEGIN
 IF EXISTS(SELECT 1 FROM pg_publication WHERE pubname='supabase_realtime') THEN
  FOREACH t IN ARRAY ARRAY['shop_orders','shop_messages','shop_order_events'] LOOP
   IF NOT EXISTS(SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename=t) THEN
    EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I',t);
   END IF;
  END LOOP;
 END IF;
END$$;
CREATE OR REPLACE FUNCTION public.shop_dashboard_stats() RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
 SELECT jsonb_build_object('orders_total',count(*),'orders_today',count(*) FILTER (WHERE (created_at AT TIME ZONE 'America/Sao_Paulo')::date=(now() AT TIME ZONE 'America/Sao_Paulo')::date),
 'revenue_total',coalesce(sum(total_amount) FILTER (WHERE payment_status='paid' AND order_status<>'cancelled'),0),
 'revenue_today',coalesce(sum(total_amount) FILTER (WHERE payment_status='paid' AND order_status<>'cancelled' AND (created_at AT TIME ZONE 'America/Sao_Paulo')::date=(now() AT TIME ZONE 'America/Sao_Paulo')::date),0)) FROM public.shop_orders;
$$;
REVOKE ALL ON FUNCTION public.shop_dashboard_stats() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.shop_dashboard_stats() TO service_role;
COMMIT;
