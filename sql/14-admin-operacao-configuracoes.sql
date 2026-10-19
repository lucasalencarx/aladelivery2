-- Execute após SQL13. Migração reexecutável, sem apagar pedidos/cadastros.
BEGIN;
CREATE TABLE IF NOT EXISTS public.store_status(id integer PRIMARY KEY DEFAULT 1,is_open boolean DEFAULT false,manual_override boolean DEFAULT true,opening_time time DEFAULT '09:00',closing_time time DEFAULT '23:00',closed_message text DEFAULT 'Voltamos em breve.');
ALTER TABLE public.store_status ADD COLUMN IF NOT EXISTS timezone text NOT NULL DEFAULT 'America/Campo_Grande';
INSERT INTO public.store_status(id) VALUES(1) ON CONFLICT DO NOTHING;
ALTER TABLE public.store_status ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS operations_store_admin ON public.store_status;
CREATE POLICY operations_store_admin ON public.store_status FOR ALL TO authenticated USING(public.admin_has_access()) WITH CHECK(public.admin_has_access());
GRANT SELECT,UPDATE ON public.store_status TO authenticated;
CREATE TABLE IF NOT EXISTS public.shop_store_settings(
 id integer PRIMARY KEY CHECK(id=1),name text NOT NULL DEFAULT 'Ala Delivery',slogan text DEFAULT 'Seu momento, entregue.',logo_url text DEFAULT '',cnpj text DEFAULT '',address text DEFAULT '',whatsapp text DEFAULT '',announcement text DEFAULT '',
 banners jsonb NOT NULL DEFAULT '[{"image":"","alt":"Ofertas especiais"},{"image":"","alt":"Bebidas geladas"},{"image":"","alt":"Promoções do delivery"}]'::jsonb CHECK(jsonb_typeof(banners)='array' AND jsonb_array_length(banners)=3),updated_at timestamptz NOT NULL DEFAULT now());
INSERT INTO public.shop_store_settings(id) VALUES(1) ON CONFLICT DO NOTHING;
ALTER TABLE public.shop_store_settings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.shop_store_settings FROM anon;
GRANT SELECT,UPDATE ON public.shop_store_settings TO authenticated;
DROP POLICY IF EXISTS shop_settings_admin ON public.shop_store_settings;
CREATE POLICY shop_settings_admin ON public.shop_store_settings FOR ALL TO authenticated USING(public.admin_has_access()) WITH CHECK(public.admin_has_access());
CREATE OR REPLACE FUNCTION public.shop_store_is_open() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
 SELECT coalesce((SELECT CASE WHEN coalesce(manual_override,true) THEN is_open ELSE CASE
 WHEN opening_time=closing_time THEN true WHEN opening_time<closing_time THEN (now() AT TIME ZONE timezone)::time>=opening_time AND (now() AT TIME ZONE timezone)::time<closing_time
 ELSE (now() AT TIME ZONE timezone)::time>=opening_time OR (now() AT TIME ZONE timezone)::time<closing_time END END FROM public.store_status WHERE id=1),false)
$$;
REVOKE ALL ON FUNCTION public.shop_store_is_open() FROM PUBLIC;GRANT EXECUTE ON FUNCTION public.shop_store_is_open() TO service_role;
CREATE OR REPLACE FUNCTION public.shop_public_settings() RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
 SELECT jsonb_build_object('settings',to_jsonb(s),'status',jsonb_build_object('is_open',public.shop_store_is_open(),'opening_time',t.opening_time,'closing_time',t.closing_time,'closed_message',t.closed_message,'timezone',t.timezone)) FROM public.shop_store_settings s CROSS JOIN public.store_status t WHERE s.id=1 AND t.id=1
$$;
REVOKE ALL ON FUNCTION public.shop_public_settings() FROM PUBLIC;GRANT EXECUTE ON FUNCTION public.shop_public_settings() TO anon,authenticated,service_role;
CREATE TABLE IF NOT EXISTS public.shop_media(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),name text NOT NULL,image_url text NOT NULL,storage_path text NOT NULL,created_at timestamptz NOT NULL DEFAULT now());
ALTER TABLE public.shop_media ENABLE ROW LEVEL SECURITY;GRANT SELECT,INSERT ON public.shop_media TO authenticated;
DROP POLICY IF EXISTS shop_media_admin ON public.shop_media;
CREATE POLICY shop_media_admin ON public.shop_media FOR ALL TO authenticated USING(public.admin_has_access()) WITH CHECK(public.admin_has_access());
INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types) VALUES('store-media','store-media',true,5242880,ARRAY['image/jpeg','image/png','image/webp']) ON CONFLICT(id) DO NOTHING;
DROP POLICY IF EXISTS store_media_admin ON storage.objects;
CREATE POLICY store_media_admin ON storage.objects FOR ALL TO authenticated USING(bucket_id='store-media' AND public.admin_has_access()) WITH CHECK(bucket_id='store-media' AND public.admin_has_access());
ALTER TABLE public.shop_orders ADD COLUMN IF NOT EXISTS admin_read_message_id bigint NOT NULL DEFAULT 0;
CREATE TABLE IF NOT EXISTS public.shop_visits(day date NOT NULL,visitor_id uuid NOT NULL,PRIMARY KEY(day,visitor_id));
ALTER TABLE public.shop_visits ENABLE ROW LEVEL SECURITY;REVOKE ALL ON public.shop_visits FROM anon,authenticated;GRANT SELECT,INSERT ON public.shop_visits TO service_role;
CREATE OR REPLACE FUNCTION public.shop_record_visit(p_visitor uuid) RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
 INSERT INTO public.shop_visits(day,visitor_id) VALUES((now() AT TIME ZONE 'America/Campo_Grande')::date,p_visitor) ON CONFLICT DO NOTHING
$$;
REVOKE ALL ON FUNCTION public.shop_record_visit(uuid) FROM PUBLIC,anon,authenticated;GRANT EXECUTE ON FUNCTION public.shop_record_visit(uuid) TO service_role;
CREATE OR REPLACE FUNCTION public.shop_mark_messages_read(p_id uuid,p_until bigint) RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
 UPDATE public.shop_orders SET admin_read_message_id=greatest(admin_read_message_id,least(p_until,coalesce((SELECT max(id) FROM public.shop_messages WHERE order_id=p_id AND sender='customer'),0))) WHERE id=p_id
$$;
REVOKE ALL ON FUNCTION public.shop_mark_messages_read(uuid,bigint) FROM PUBLIC,anon,authenticated;GRANT EXECUTE ON FUNCTION public.shop_mark_messages_read(uuid,bigint) TO service_role;
CREATE TABLE IF NOT EXISTS public.shop_order_reviews(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),order_id uuid NOT NULL UNIQUE REFERENCES public.shop_orders(id) ON DELETE CASCADE,rating smallint NOT NULL CHECK(rating BETWEEN 1 AND 5),comment text NOT NULL DEFAULT '' CHECK(length(comment)<=2000),admin_response text NOT NULL DEFAULT '' CHECK(length(admin_response)<=1000),created_at timestamptz NOT NULL DEFAULT now());
ALTER TABLE public.shop_order_reviews ENABLE ROW LEVEL SECURITY;REVOKE ALL ON public.shop_order_reviews FROM anon,authenticated;GRANT ALL ON public.shop_order_reviews TO service_role;
CREATE OR REPLACE FUNCTION public.shop_operations_snapshot() RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE base jsonb; recent jsonb; inbox jsonb;counts jsonb; low jsonb;
BEGIN
 IF NOT public.admin_has_access() THEN RAISE EXCEPTION 'Acesso administrativo necessário' USING ERRCODE='42501';END IF;
 base:=public.admin_dashboard_snapshot();
 SELECT coalesce(jsonb_agg(to_jsonb(o)-'access_token'-'request_key'-'customer_document'-'pix_data' ORDER BY o.created_at DESC),'[]') INTO recent FROM (SELECT * FROM public.shop_orders WHERE order_status<>'cancelled' AND (payment_method<>'pix' OR payment_status='paid') ORDER BY created_at DESC LIMIT 8)o;
 SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY x.last_at DESC),'[]') INTO inbox FROM (
 SELECT o.id,o.protocol,o.customer_name,o.customer_phone,count(*)::int unread,max(m.id) last_message_id,max(m.created_at) last_at,(array_agg(m.body ORDER BY m.id DESC))[1] preview FROM public.shop_messages m JOIN public.shop_orders o ON o.id=m.order_id WHERE m.sender='customer' AND m.id>o.admin_read_message_id GROUP BY o.id ORDER BY max(m.created_at) DESC LIMIT 30)x;
 SELECT jsonb_build_object('confirmed',count(*) FILTER(WHERE order_status='confirmed'),'preparing',count(*) FILTER(WHERE order_status='preparing'),'out_for_delivery',count(*) FILTER(WHERE order_status='out_for_delivery'),'pending_pix',count(*) FILTER(WHERE payment_method='pix' AND payment_status='pending' AND order_status='pending')) INTO counts FROM public.shop_orders;
 SELECT coalesce(jsonb_agg(to_jsonb(x)),'[]') INTO low FROM(SELECT id,name,stock FROM public.products WHERE active AND stock<=5 ORDER BY stock,name LIMIT 6)x;
 RETURN base||jsonb_build_object('orders',recent,'inbox',inbox,'counts',counts,'low_stock',low,'unread_messages',(SELECT count(*) FROM public.shop_messages m JOIN public.shop_orders o ON o.id=m.order_id WHERE m.sender='customer' AND m.id>o.admin_read_message_id),'visitors',jsonb_build_object('today',(SELECT count(*) FROM public.shop_visits WHERE day=(now() AT TIME ZONE 'America/Campo_Grande')::date),'total',(SELECT count(DISTINCT visitor_id) FROM public.shop_visits)),'reviews',jsonb_build_object('total',(SELECT count(*) FROM public.shop_order_reviews),'average',(SELECT round(avg(rating),1) FROM public.shop_order_reviews)));
END$$;
REVOKE ALL ON FUNCTION public.shop_operations_snapshot() FROM PUBLIC,anon;GRANT EXECUTE ON FUNCTION public.shop_operations_snapshot() TO authenticated;
-- Regras de cupom preservadas. Loja fechada impede novos pedidos; retries já criados continuam acessíveis.
CREATE OR REPLACE FUNCTION public.shop_create_order_checked(p jsonb,p_verified_phone text DEFAULT NULL) RETURNS public.shop_orders LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE owner text;
BEGIN
 IF NOT public.shop_store_is_open() AND NOT EXISTS(SELECT 1 FROM public.shop_orders WHERE request_key=(p->>'request_key')::uuid AND access_token=(p->>'access_token')::uuid) THEN RAISE EXCEPTION 'A loja está fechada. Confira nosso horário de funcionamento.';END IF;
 SELECT customer_phone INTO owner FROM public.discount_coupons WHERE upper(code)=upper(p->>'coupon_code');
 IF owner IS NOT NULL AND (p_verified_phone IS DISTINCT FROM owner OR p->>'customer_phone' IS DISTINCT FROM owner) THEN RAISE EXCEPTION 'Confirme o telefone para usar seu benefício pessoal.';END IF;
 RETURN public.shop_create_order(p);
END$$;
COMMIT;
