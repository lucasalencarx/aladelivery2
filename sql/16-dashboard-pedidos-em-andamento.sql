-- Execute após as migrações 14 e 15. Mantém histórico e indicadores. Reexecutável.
BEGIN;
CREATE OR REPLACE FUNCTION public.shop_operations_snapshot() RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE base jsonb; recent jsonb; inbox jsonb;counts jsonb; low jsonb;
BEGIN
 IF NOT public.admin_has_access() THEN RAISE EXCEPTION 'Acesso administrativo necessário' USING ERRCODE='42501';END IF;
 base:=public.admin_dashboard_snapshot();
 SELECT coalesce(jsonb_agg(to_jsonb(o)-'access_token'-'request_key'-'customer_document'-'pix_data' ORDER BY o.created_at DESC),'[]') INTO recent FROM (SELECT * FROM public.shop_orders WHERE order_status IN ('confirmed','preparing','out_for_delivery') AND (payment_method<>'pix' OR payment_status='paid') ORDER BY created_at DESC LIMIT 8)o;
 SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY x.last_at DESC),'[]') INTO inbox FROM (
 SELECT o.id,o.protocol,o.customer_name,o.customer_phone,count(*)::int unread,max(m.id) last_message_id,max(m.created_at) last_at,(array_agg(m.body ORDER BY m.id DESC))[1] preview FROM public.shop_messages m JOIN public.shop_orders o ON o.id=m.order_id WHERE m.sender='customer' AND m.id>o.admin_read_message_id GROUP BY o.id ORDER BY max(m.created_at) DESC LIMIT 30)x;
 SELECT jsonb_build_object('confirmed',count(*) FILTER(WHERE order_status='confirmed'),'preparing',count(*) FILTER(WHERE order_status='preparing'),'out_for_delivery',count(*) FILTER(WHERE order_status='out_for_delivery'),'pending_pix',count(*) FILTER(WHERE payment_method='pix' AND payment_status='pending' AND order_status='pending')) INTO counts FROM public.shop_orders;
 SELECT coalesce(jsonb_agg(to_jsonb(x)),'[]') INTO low FROM(SELECT id,name,stock FROM public.products WHERE active AND stock<=5 ORDER BY stock,name LIMIT 6)x;
 RETURN base||jsonb_build_object('orders',recent,'inbox',inbox,'counts',counts,'low_stock',low,'unread_messages',(SELECT count(*) FROM public.shop_messages m JOIN public.shop_orders o ON o.id=m.order_id WHERE m.sender='customer' AND m.id>o.admin_read_message_id),'visitors',jsonb_build_object('today',(SELECT count(*) FROM public.shop_visits WHERE day=(now() AT TIME ZONE 'America/Campo_Grande')::date),'total',(SELECT count(DISTINCT visitor_id) FROM public.shop_visits)),'reviews',jsonb_build_object('total',(SELECT count(*) FROM public.shop_order_reviews),'average',(SELECT round(avg(rating),1) FROM public.shop_order_reviews)));
END$$;
REVOKE ALL ON FUNCTION public.shop_operations_snapshot() FROM PUBLIC,anon;GRANT EXECUTE ON FUNCTION public.shop_operations_snapshot() TO authenticated;
COMMIT;
