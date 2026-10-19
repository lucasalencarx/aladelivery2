-- Execute após SQL14. Reexecutável.
BEGIN;
ALTER TABLE public.delivery_couriers ADD COLUMN IF NOT EXISTS auth_user_id uuid UNIQUE;
ALTER TABLE public.delivery_couriers ADD COLUMN IF NOT EXISTS login_email text;
ALTER TABLE public.shop_orders ADD COLUMN IF NOT EXISTS delivery_nearby_at timestamptz;
ALTER TABLE public.shop_orders ADD COLUMN IF NOT EXISTS delivery_lat double precision;
ALTER TABLE public.shop_orders ADD COLUMN IF NOT EXISTS delivery_lng double precision;
ALTER TABLE public.shop_orders ADD COLUMN IF NOT EXISTS courier_lat double precision;
ALTER TABLE public.shop_orders ADD COLUMN IF NOT EXISTS courier_lng double precision;
ALTER TABLE public.shop_orders ADD COLUMN IF NOT EXISTS courier_location_at timestamptz;
CREATE INDEX IF NOT EXISTS shop_courier_orders_idx ON public.shop_orders(courier_id,order_status);
CREATE OR REPLACE FUNCTION public.shop_courier_action(p_id uuid,p_auth uuid,p_action text,p_code text DEFAULT NULL) RETURNS public.shop_orders
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE o public.shop_orders;
BEGIN
 SELECT * INTO o FROM public.shop_orders WHERE id=p_id FOR UPDATE;
 IF NOT FOUND OR NOT EXISTS(SELECT 1 FROM public.delivery_couriers c WHERE c.id::text=o.courier_id AND c.auth_user_id=p_auth AND c.active) THEN RAISE EXCEPTION 'Entrega não atribuída a este entregador' USING ERRCODE='42501';END IF;
 IF o.payment_method='pix' AND o.payment_status<>'paid' THEN RAISE EXCEPTION 'Pedido ainda não pago';END IF;
 IF p_action='start' THEN
  IF o.order_status='out_for_delivery' THEN RETURN o;END IF;
  IF o.order_status<>'preparing' THEN RAISE EXCEPTION 'A loja precisa colocar o pedido em preparo antes da saída';END IF;
  PERFORM public.shop_transition(p_id,'out_for_delivery','O entregador iniciou a rota. Seu pedido saiu para entrega!');
 ELSIF p_action='nearby' THEN
  IF o.order_status<>'out_for_delivery' THEN RAISE EXCEPTION 'A entrega ainda não está em rota';END IF;
  IF o.delivery_nearby_at IS NULL THEN
   UPDATE public.shop_orders SET delivery_nearby_at=now(),updated_at=now() WHERE id=p_id;
   INSERT INTO public.shop_messages(order_id,sender,body) VALUES(p_id,'store','Seu pedido já está chegando, eba! O entregador está próximo. Prepare-se para receber e informe os 4 últimos dígitos do seu telefone para confirmar a entrega.');
  END IF;
 ELSIF p_action='finish' THEN
  IF o.order_status='delivered' THEN RETURN o;END IF;
  IF o.order_status<>'out_for_delivery' THEN RAISE EXCEPTION 'Inicie a rota antes de concluir';END IF;
  IF p_code IS NULL OR p_code !~ '^[0-9]{4}$' OR p_code<>right(regexp_replace(o.customer_phone,'[^0-9]','','g'),4) THEN RAISE EXCEPTION 'Código de entrega incorreto';END IF;
  PERFORM public.shop_transition(p_id,'delivered','Entrega confirmada pelo entregador com o código do cliente.');
 ELSE RAISE EXCEPTION 'Ação inválida';END IF;
 SELECT * INTO o FROM public.shop_orders WHERE id=p_id;
 RETURN o;
END$$;
REVOKE ALL ON FUNCTION public.shop_courier_action(uuid,uuid,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.shop_courier_action(uuid,uuid,text,text) TO service_role;
CREATE OR REPLACE FUNCTION public.shop_list_orders(p_period text DEFAULT 'today',p_bucket text DEFAULT 'ready',p_page integer DEFAULT 1,p_query text DEFAULT '',p_status text DEFAULT 'all',p_phone text DEFAULT NULL) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE result jsonb;total bigint;counts jsonb;page_num integer:=greatest(1,least(coalesce(p_page,1),10000));
BEGIN
 SELECT jsonb_build_object('ready',count(*) FILTER(WHERE order_status NOT IN ('cancelled','canceled','cancelado') AND (payment_method<>'pix' OR payment_status IN ('paid','approved','pago'))),'pending',count(*) FILTER(WHERE payment_method='pix' AND payment_status='pending' AND order_status='pending'),'all',count(*)) INTO counts
 FROM public.shop_order_history WHERE created_at>=public.shop_period_start(p_period) AND (p_phone IS NULL OR customer_phone=p_phone) AND (p_phone IS NOT NULL OR payment_method<>'pix' OR payment_status<>'pending');
 WITH filtered AS(SELECT * FROM public.shop_order_history WHERE created_at>=public.shop_period_start(p_period)
 AND (p_phone IS NULL OR customer_phone=p_phone) AND (p_phone IS NOT NULL OR payment_method<>'pix' OR payment_status<>'pending')
 AND (p_bucket='all' OR (p_bucket='pending' AND payment_method='pix' AND payment_status='pending' AND order_status='pending') OR (p_bucket='ready' AND order_status NOT IN ('cancelled','canceled','cancelado') AND (payment_method<>'pix' OR payment_status IN ('paid','approved','pago'))))
 AND (p_status='all' OR order_status=p_status) AND (coalesce(p_query,'')='' OR concat_ws(' ',payload->>'protocol',customer_name,customer_phone) ILIKE '%'||p_query||'%'))
 SELECT count(*) INTO total FROM filtered;
 SELECT coalesce(jsonb_agg(payload ORDER BY created_at DESC,id DESC),'[]') INTO result FROM(
 SELECT id,created_at,(o.payload-'access_token')||CASE WHEN p_phone IS NOT NULL THEN jsonb_build_object('access_token',o.payload->'access_token') ELSE '{}'::jsonb END AS payload
 FROM public.shop_order_history o WHERE created_at>=public.shop_period_start(p_period) AND (p_phone IS NULL OR customer_phone=p_phone) AND (p_phone IS NOT NULL OR payment_method<>'pix' OR payment_status<>'pending')
 AND (p_bucket='all' OR (p_bucket='pending' AND payment_method='pix' AND payment_status='pending' AND order_status='pending') OR (p_bucket='ready' AND order_status NOT IN ('cancelled','canceled','cancelado') AND (payment_method<>'pix' OR payment_status IN ('paid','approved','pago'))))
 AND (p_status='all' OR order_status=p_status) AND (coalesce(p_query,'')='' OR concat_ws(' ',payload->>'protocol',customer_name,customer_phone) ILIKE '%'||p_query||'%')
 ORDER BY created_at DESC,id DESC LIMIT 30 OFFSET (page_num-1)*30) x;
 RETURN jsonb_build_object('orders',result,'total',total,'page',page_num,'pages',greatest(1,ceil(total/30.0)),'counts',counts);
END$$;
REVOKE ALL ON FUNCTION public.shop_list_orders(text,text,integer,text,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.shop_list_orders(text,text,integer,text,text,text) TO service_role;

CREATE OR REPLACE FUNCTION public.shop_courier_position(p_id uuid,p_auth uuid,p_lat double precision,p_lng double precision,p_accuracy double precision) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE o public.shop_orders; distance_m double precision;
BEGIN
 IF p_lat IS NULL OR p_lng IS NULL OR p_accuracy IS NULL OR abs(p_lat)>90 OR abs(p_lng)>180 OR p_accuracy<0 OR p_accuracy='NaN'::float8 THEN RAISE EXCEPTION 'Coordenadas inválidas';END IF;
 SELECT * INTO o FROM public.shop_orders WHERE id=p_id FOR UPDATE;
 IF NOT FOUND OR NOT EXISTS(SELECT 1 FROM public.delivery_couriers c WHERE c.id::text=o.courier_id AND c.auth_user_id=p_auth AND c.active) THEN RAISE EXCEPTION 'Entrega não atribuída' USING ERRCODE='42501';END IF;
 IF o.order_status<>'out_for_delivery' THEN RAISE EXCEPTION 'Entrega não está em rota';END IF;
 IF o.courier_location_at IS NOT NULL AND o.courier_location_at>now()-interval '10 seconds' THEN RETURN o.delivery_nearby_at IS NOT NULL;END IF;
 UPDATE public.shop_orders SET courier_lat=p_lat,courier_lng=p_lng,courier_location_at=now() WHERE id=p_id;
 IF o.delivery_lat IS NOT NULL AND o.delivery_lng IS NOT NULL AND p_accuracy<=100 THEN
  distance_m:=6371000*2*asin(sqrt(least(1.0,power(sin(radians(p_lat-o.delivery_lat)/2),2)+cos(radians(o.delivery_lat))*cos(radians(p_lat))*power(sin(radians(p_lng-o.delivery_lng)/2),2))));
  IF distance_m<=300 THEN PERFORM public.shop_courier_action(p_id,p_auth,'nearby',NULL);RETURN true;END IF;
 END IF;
 RETURN o.delivery_nearby_at IS NOT NULL;
END$$;
REVOKE ALL ON FUNCTION public.shop_courier_position(uuid,uuid,double precision,double precision,double precision) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.shop_courier_position(uuid,uuid,double precision,double precision,double precision) TO service_role;
COMMIT;
