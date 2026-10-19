-- Executar depois de 08-pedidos-chat-taxas.sql.
-- O dashboard lê pelo Supabase com login administrativo; não depende do Node.
BEGIN;
CREATE OR REPLACE FUNCTION public.admin_dashboard_snapshot() RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE old_stats jsonb;new_stats jsonb;recent jsonb;
BEGIN
 IF NOT public.admin_has_access() THEN RAISE EXCEPTION 'Acesso administrativo necessário' USING ERRCODE='42501';END IF;
 old_stats=coalesce(public.admin_dashboard_stats()::jsonb,'{}');
 new_stats=public.shop_dashboard_stats();
 SELECT coalesce(jsonb_agg(x.payload ORDER BY x.created_at DESC),'[]') INTO recent FROM (
  SELECT created_at,jsonb_build_object('id',id,'protocol',protocol,'customer_name',customer_name,'created_at',created_at,
   'total_amount',total_amount,'payment_status',payment_status,'order_status',order_status) payload
  FROM public.shop_orders ORDER BY created_at DESC LIMIT 8
 ) x;
 RETURN jsonb_build_object('stats',old_stats||jsonb_build_object(
  'orders_today',coalesce((old_stats->>'orders_today')::numeric,0)+coalesce((new_stats->>'orders_today')::numeric,0),
  'orders_total',coalesce((old_stats->>'orders_total')::numeric,0)+coalesce((new_stats->>'orders_total')::numeric,0),
  'revenue_today',coalesce((old_stats->>'revenue_today')::numeric,0)+coalesce((new_stats->>'revenue_today')::numeric,0),
  'revenue_total',coalesce((old_stats->>'revenue_total')::numeric,0)+coalesce((new_stats->>'revenue_total')::numeric,0)),
  'orders',recent);
END$$;
REVOKE ALL ON FUNCTION public.admin_dashboard_snapshot() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.admin_dashboard_snapshot() TO authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
