-- Atualização do catálogo público para mostrar as marcas do admin.
-- Execute no Supabase; não altera nem apaga produtos existentes.
-- Execute uma vez no SQL Editor do Supabase após a estrutura do admin.
-- Leitura pública limitada às seções ativas e aos campos necessários para a loja.
BEGIN;
DO $$BEGIN
 IF to_regclass('public.products') IS NULL OR to_regclass('public.catalog_sections') IS NULL
 OR to_regclass('public.catalog_section_products') IS NULL OR to_regclass('public.categories') IS NULL
 THEN RAISE EXCEPTION 'Execute primeiro a estrutura e os SQLs do admin (products, categories e seções).';END IF;
END$$;
CREATE OR REPLACE FUNCTION public.storefront_catalog() RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE result jsonb;store_config jsonb;is_open boolean;opening time;closing time;current_time_sp time;public_brands jsonb;
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
     current_time_sp=(now() AT TIME ZONE 'America/Sao_Paulo')::time;
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
 RETURN result;
END$$;
REVOKE ALL ON FUNCTION public.storefront_catalog() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.storefront_catalog() TO anon,authenticated;
COMMIT;
