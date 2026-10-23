-- Execute após SQL15 e as migrações anteriores já instaladas. Reexecutável.
BEGIN;
ALTER TABLE public.shop_orders ADD COLUMN IF NOT EXISTS courier_accuracy double precision;
CREATE OR REPLACE FUNCTION public.shop_courier_position(p_id uuid,p_auth uuid,p_lat double precision,p_lng double precision,p_accuracy double precision) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE o public.shop_orders; distance_m double precision;
BEGIN
 IF p_lat IS NULL OR p_lng IS NULL OR p_accuracy IS NULL OR NOT(p_lat BETWEEN -90 AND 90) OR NOT(p_lng BETWEEN -180 AND 180) OR NOT(p_accuracy BETWEEN 0 AND 100000) THEN RAISE EXCEPTION 'Coordenadas inválidas';END IF;
 SELECT * INTO o FROM public.shop_orders WHERE id=p_id FOR UPDATE;
 IF NOT FOUND OR NOT EXISTS(SELECT 1 FROM public.delivery_couriers c WHERE c.id::text=o.courier_id AND c.auth_user_id=p_auth AND c.active) THEN RAISE EXCEPTION 'Entrega não atribuída' USING ERRCODE='42501';END IF;
 IF o.order_status<>'out_for_delivery' THEN RAISE EXCEPTION 'Entrega não está em rota';END IF;
 IF o.courier_location_at IS NOT NULL AND o.courier_location_at>now()-interval '10 seconds' THEN RETURN o.delivery_nearby_at IS NOT NULL;END IF;
 UPDATE public.shop_orders SET courier_lat=p_lat,courier_lng=p_lng,courier_accuracy=p_accuracy,courier_location_at=clock_timestamp() WHERE id=p_id;
 IF o.delivery_lat IS NOT NULL AND o.delivery_lng IS NOT NULL AND p_accuracy<=100 AND o.delivery_nearby_at IS NULL THEN
  distance_m:=6371000*2*asin(sqrt(least(1.0,power(sin(radians(p_lat-o.delivery_lat)/2),2)+cos(radians(o.delivery_lat))*cos(radians(p_lat))*power(sin(radians(p_lng-o.delivery_lng)/2),2))));
  IF distance_m<=300 THEN PERFORM public.shop_courier_action(p_id,p_auth,'nearby',NULL);RETURN true;END IF;
 END IF;
 RETURN o.delivery_nearby_at IS NOT NULL;
END$$;
REVOKE ALL ON FUNCTION public.shop_courier_position(uuid,uuid,double precision,double precision,double precision) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.shop_courier_position(uuid,uuid,double precision,double precision,double precision) TO service_role;
CREATE OR REPLACE FUNCTION public.shop_courier_tracking_stop(p_id uuid,p_auth uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE o public.shop_orders;
BEGIN
 SELECT * INTO o FROM public.shop_orders WHERE id=p_id FOR UPDATE;
 IF NOT FOUND OR NOT EXISTS(SELECT 1 FROM public.delivery_couriers c WHERE c.id::text=o.courier_id AND c.auth_user_id=p_auth AND c.active) THEN RAISE EXCEPTION 'Entrega não atribuída' USING ERRCODE='42501';END IF;
 UPDATE public.shop_orders SET courier_lat=NULL,courier_lng=NULL,courier_accuracy=NULL,courier_location_at=NULL WHERE id=p_id;
END$$;
REVOKE ALL ON FUNCTION public.shop_courier_tracking_stop(uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.shop_courier_tracking_stop(uuid,uuid) TO service_role;
CREATE OR REPLACE FUNCTION public.shop_clear_courier_position() RETURNS trigger
LANGUAGE plpgsql SET search_path=pg_catalog,public AS $$
BEGIN
 IF NEW.order_status<>'out_for_delivery' OR NEW.courier_id IS DISTINCT FROM OLD.courier_id THEN
  NEW.courier_lat:=NULL;NEW.courier_lng:=NULL;NEW.courier_accuracy:=NULL;NEW.courier_location_at:=NULL;
  IF NEW.courier_id IS DISTINCT FROM OLD.courier_id THEN NEW.delivery_nearby_at:=NULL;END IF;
 END IF;
 RETURN NEW;
END$$;
DROP TRIGGER IF EXISTS shop_clear_courier_position ON public.shop_orders;
CREATE TRIGGER shop_clear_courier_position BEFORE UPDATE ON public.shop_orders FOR EACH ROW EXECUTE FUNCTION public.shop_clear_courier_position();
UPDATE public.shop_orders SET courier_lat=NULL,courier_lng=NULL,courier_accuracy=NULL,courier_location_at=NULL WHERE order_status<>'out_for_delivery';
-- SSE existente usa Realtime pelo backend; não abre acesso público à tabela.
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM pg_publication WHERE pubname='supabase_realtime') AND NOT EXISTS(SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='shop_orders') THEN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.shop_orders;
 END IF;
END $$;
COMMIT;
