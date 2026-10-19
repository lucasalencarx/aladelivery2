-- Depois de 08-pedidos-chat-taxas.sql. Bairros do admin visíveis no checkout sem depender do Node.
BEGIN;
CREATE OR REPLACE FUNCTION public.storefront_delivery_zones() RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
 SELECT coalesce(jsonb_agg(jsonb_build_object('id',id,'city',city,'neighborhood',neighborhood,'fee',fee,'eta_minutes',eta_minutes) ORDER BY city,neighborhood),'[]'::jsonb)
 FROM public.delivery_zones WHERE active;
$$;
REVOKE ALL ON FUNCTION public.storefront_delivery_zones() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.storefront_delivery_zones() TO anon,authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
