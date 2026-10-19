BEGIN;
CREATE OR REPLACE FUNCTION public.shop_period_start(p_period text) RETURNS timestamptz LANGUAGE sql STABLE SET search_path=pg_catalog,public AS $$
 SELECT CASE p_period WHEN 'today' THEN date_trunc('day',now() AT TIME ZONE 'America/Sao_Paulo') AT TIME ZONE 'America/Sao_Paulo' WHEN '1m' THEN now()-interval '1 month' WHEN '3m' THEN now()-interval '3 months' WHEN '1y' THEN now()-interval '1 year' ELSE '-infinity'::timestamptz END;
$$;
CREATE OR REPLACE FUNCTION public.shop_national_phone(v text) RETURNS text LANGUAGE sql IMMUTABLE SET search_path=pg_catalog AS $$
 WITH digits AS(SELECT regexp_replace(coalesce(v,''),'[^0-9]','','g') AS p) SELECT CASE WHEN p ~ '^55[0-9]{10,11}$' THEN substr(p,3) ELSE p END FROM digits;
$$;
REVOKE ALL ON FUNCTION public.shop_national_phone(text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.shop_national_phone(text) TO service_role;
-- Visão privada de histórico, incluindo orders da versão anterior quando existir.
DO $$DECLARE legacy_sql text:='';items_sql text:='''[]''::jsonb';BEGIN
 IF to_regclass('public.orders') IS NOT NULL THEN
  IF to_regclass('public.order_items') IS NOT NULL THEN items_sql='(SELECT coalesce(jsonb_agg(to_jsonb(i)),''[]'') FROM public.order_items i WHERE to_jsonb(i)->>''order_id''=to_jsonb(o)->>''id'')';END IF;
  legacy_sql=' UNION ALL SELECT to_jsonb(o)->>''id'',public.shop_national_phone(to_jsonb(o)->>''customer_phone''),(to_jsonb(o)->>''created_at'')::timestamptz,coalesce(to_jsonb(o)->>''payment_status'',''pending''),coalesce(to_jsonb(o)->>''order_status'',''pending''),coalesce((to_jsonb(o)->>''total_amount'')::numeric,0),to_jsonb(o)->>''customer_name'',coalesce(to_jsonb(o)->>''payment_method'',''dinheiro''),(to_jsonb(o)-''customer_document''-''access_token''-''request_key''-''pix_data'')||jsonb_build_object(''legacy'',true,''items'','||items_sql||',''address'',jsonb_build_object(''street'',to_jsonb(o)->>''address_street'',''number'',to_jsonb(o)->>''address_number'',''neighborhood'',to_jsonb(o)->>''address_neighborhood'',''city'',to_jsonb(o)->>''address_city'',''state'',to_jsonb(o)->>''address_state'',''complement'',to_jsonb(o)->>''address_complement'')) FROM public.orders o';
 END IF;
 EXECUTE 'CREATE OR REPLACE VIEW public.shop_order_history AS SELECT id::text id,public.shop_national_phone(customer_phone) AS customer_phone,created_at,payment_status,order_status,total_amount::numeric AS total_amount,customer_name,payment_method,(to_jsonb(o)-''customer_document''-''request_key''-''pix_data'')||jsonb_build_object(''legacy'',false) payload FROM public.shop_orders o'||legacy_sql;
END$$;
REVOKE ALL ON public.shop_order_history FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.shop_order_history TO service_role;
CREATE OR REPLACE FUNCTION public.shop_customer_history(p_phone text,p_period text DEFAULT '1m',p_page integer DEFAULT 1) RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
 WITH filtered AS(SELECT * FROM public.shop_order_history WHERE customer_phone=p_phone AND created_at>=public.shop_period_start(p_period)),page AS(SELECT * FROM filtered ORDER BY created_at DESC,id DESC LIMIT 30 OFFSET (greatest(1,least(coalesce(p_page,1),10000))-1)*30)
 SELECT jsonb_build_object('orders',coalesce((SELECT jsonb_agg(payload ORDER BY created_at DESC,id DESC) FROM page),'[]'),'total',(SELECT count(*) FROM filtered),'page',greatest(1,coalesce(p_page,1)),'pages',greatest(1,ceil((SELECT count(*) FROM filtered)/30.0)));
$$;
REVOKE ALL ON FUNCTION public.shop_customer_history(text,text,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.shop_customer_history(text,text,integer) TO service_role;
CREATE OR REPLACE FUNCTION public.shop_list_orders(p_period text DEFAULT 'today',p_bucket text DEFAULT 'ready',p_page integer DEFAULT 1,p_query text DEFAULT '',p_status text DEFAULT 'all',p_phone text DEFAULT NULL) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE result jsonb;total bigint;counts jsonb;page_num integer:=greatest(1,least(coalesce(p_page,1),10000));
BEGIN
 SELECT jsonb_build_object('ready',count(*) FILTER(WHERE order_status NOT IN ('cancelled','canceled','cancelado') AND (payment_method<>'pix' OR payment_status IN ('paid','approved','pago'))),'pending',count(*) FILTER(WHERE payment_method='pix' AND payment_status='pending' AND order_status='pending'),'all',count(*)) INTO counts
 FROM public.shop_order_history WHERE created_at>=public.shop_period_start(p_period) AND (p_phone IS NULL OR customer_phone=p_phone);
 WITH filtered AS(SELECT * FROM public.shop_order_history WHERE created_at>=public.shop_period_start(p_period)
 AND (p_phone IS NULL OR customer_phone=p_phone)
 AND (p_bucket='all' OR (p_bucket='pending' AND payment_method='pix' AND payment_status='pending' AND order_status='pending') OR (p_bucket='ready' AND order_status NOT IN ('cancelled','canceled','cancelado') AND (payment_method<>'pix' OR payment_status IN ('paid','approved','pago'))))
 AND (p_status='all' OR order_status=p_status) AND (coalesce(p_query,'')='' OR concat_ws(' ',payload->>'protocol',customer_name,customer_phone) ILIKE '%'||p_query||'%'))
 SELECT count(*) INTO total FROM filtered;
 SELECT coalesce(jsonb_agg(payload ORDER BY created_at DESC,id DESC),'[]') INTO result FROM(
 SELECT id,created_at,(o.payload-'access_token')||CASE WHEN p_phone IS NOT NULL THEN jsonb_build_object('access_token',o.payload->'access_token') ELSE '{}'::jsonb END AS payload
 FROM public.shop_order_history o WHERE created_at>=public.shop_period_start(p_period) AND (p_phone IS NULL OR customer_phone=p_phone)
 AND (p_bucket='all' OR (p_bucket='pending' AND payment_method='pix' AND payment_status='pending' AND order_status='pending') OR (p_bucket='ready' AND order_status NOT IN ('cancelled','canceled','cancelado') AND (payment_method<>'pix' OR payment_status IN ('paid','approved','pago'))))
 AND (p_status='all' OR order_status=p_status) AND (coalesce(p_query,'')='' OR concat_ws(' ',payload->>'protocol',customer_name,customer_phone) ILIKE '%'||p_query||'%')
 ORDER BY created_at DESC,id DESC LIMIT 30 OFFSET (page_num-1)*30) x;
 RETURN jsonb_build_object('orders',result,'total',total,'page',page_num,'pages',greatest(1,ceil(total/30.0)),'counts',counts);
END$$;
REVOKE ALL ON FUNCTION public.shop_list_orders(text,text,integer,text,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.shop_list_orders(text,text,integer,text,text,text) TO service_role;
CREATE TABLE IF NOT EXISTS public.shop_loyalty_settings(id integer PRIMARY KEY DEFAULT 1 CHECK(id=1),active boolean NOT NULL DEFAULT true,min_orders integer NOT NULL DEFAULT 5 CHECK(min_orders BETWEEN 1 AND 1000),discount_percent numeric NOT NULL DEFAULT 5 CHECK(discount_percent>0 AND discount_percent<=100),max_discount numeric NOT NULL DEFAULT 10 CHECK(max_discount>0),min_order numeric NOT NULL DEFAULT 30 CHECK(min_order>=0),valid_days integer NOT NULL DEFAULT 30 CHECK(valid_days BETWEEN 1 AND 365));
INSERT INTO public.shop_loyalty_settings(id) VALUES(1) ON CONFLICT DO NOTHING;
CREATE TABLE IF NOT EXISTS public.shop_loyalty_rewards(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),customer_phone text NOT NULL,milestone integer NOT NULL,coupon_code text NOT NULL UNIQUE,created_at timestamptz DEFAULT now(),UNIQUE(customer_phone,milestone));
ALTER TABLE public.shop_loyalty_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_loyalty_rewards ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.shop_loyalty_settings,public.shop_loyalty_rewards FROM anon,authenticated;
GRANT ALL ON public.shop_loyalty_settings,public.shop_loyalty_rewards TO service_role;
ALTER TABLE public.discount_coupons ADD COLUMN IF NOT EXISTS customer_phone text;
ALTER TABLE public.discount_coupons ADD COLUMN IF NOT EXISTS description text;
CREATE OR REPLACE FUNCTION public.shop_loyalty_offer(p_phone text,p_force boolean DEFAULT false) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE config public.shop_loyalty_settings;n integer;milestone_no integer;reward_code text;campaign jsonb;reason text;
BEGIN
 IF p_phone !~ '^[0-9]{10,11}$' THEN RAISE EXCEPTION 'Telefone inválido';END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_phone,41));
 SELECT * INTO config FROM public.shop_loyalty_settings WHERE id=1;
 SELECT count(*) INTO n FROM public.shop_order_history WHERE customer_phone=p_phone AND payment_status IN ('paid','approved','pago') AND order_status NOT IN ('cancelled','canceled','cancelado');
 IF NOT config.active THEN RETURN jsonb_build_object('available',false,'paid_orders',n);END IF;
 IF n<config.min_orders AND NOT p_force THEN RETURN jsonb_build_object('available',false,'paid_orders',n,'next_at',config.min_orders);END IF;
 milestone_no=greatest(1,n/config.min_orders);
 SELECT coupon_code INTO reward_code FROM public.shop_loyalty_rewards WHERE customer_phone=p_phone AND shop_loyalty_rewards.milestone=milestone_no;
 reason=CASE WHEN p_force AND n<config.min_orders THEN 'Um presente da Ala Delivery para você!' ELSE 'Obrigado pela fidelidade! Você já tem '||n||' pedidos pagos com a gente.' END;
 IF reward_code IS NULL THEN
  reward_code='FIEL-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,16));
  INSERT INTO public.discount_coupons(code,description,discount_type,discount_value,min_order,max_discount,usage_limit,used_count,starts_at,ends_at,active,customer_phone)
  VALUES(reward_code,reason,'percentage',config.discount_percent,config.min_order,config.max_discount,1,0,now(),now()+make_interval(days=>config.valid_days),true,p_phone);
  INSERT INTO public.shop_loyalty_rewards(customer_phone,milestone,coupon_code) VALUES(p_phone,milestone_no,reward_code);
 END IF;
 SELECT to_jsonb(c) INTO campaign FROM public.discount_coupons c WHERE c.code=reward_code;
 IF campaign IS NULL OR NOT (campaign->>'active')::boolean OR (campaign->>'ends_at')::timestamptz<=now() OR coalesce((campaign->>'used_count')::integer,0)>=1 THEN RETURN jsonb_build_object('available',false,'paid_orders',n,'next_at',(milestone_no+1)*config.min_orders);END IF;
 RETURN jsonb_build_object('available',true,'paid_orders',n,'code',reward_code,'type','percentage','value',(campaign->>'discount_value')::numeric,'max_discount',(campaign->>'max_discount')::numeric,'min_order',(campaign->>'min_order')::numeric,'expires_at',campaign->>'ends_at','reason',campaign->>'description','label',(campaign->>'discount_value')||'% de fidelidade');
END$$;
REVOKE ALL ON FUNCTION public.shop_loyalty_offer(text,boolean) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.shop_loyalty_offer(text,boolean) TO service_role;
CREATE OR REPLACE FUNCTION public.shop_create_order_checked(p jsonb,p_verified_phone text DEFAULT NULL) RETURNS public.shop_orders
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE owner text;
BEGIN
 SELECT customer_phone INTO owner FROM public.discount_coupons WHERE upper(code)=upper(p->>'coupon_code');
 IF owner IS NOT NULL AND (p_verified_phone IS DISTINCT FROM owner OR p->>'customer_phone' IS DISTINCT FROM owner) THEN RAISE EXCEPTION 'Confirme o telefone para usar seu benefício pessoal.';END IF;
 RETURN public.shop_create_order(p);
END$$;
REVOKE ALL ON FUNCTION public.shop_create_order_checked(jsonb,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.shop_create_order_checked(jsonb,text) TO service_role;
CREATE OR REPLACE FUNCTION public.shop_top_customers(p_period text DEFAULT '1y') RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
 SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY x.order_count DESC,x.spent DESC),'[]') FROM(
 SELECT customer_phone,(array_agg(customer_name ORDER BY created_at DESC))[1] AS customer_name,count(*) AS order_count,sum(total_amount) AS spent,max(created_at) AS last_order
 FROM public.shop_order_history WHERE payment_status IN ('paid','approved','pago') AND order_status NOT IN ('cancelled','canceled','cancelado') AND created_at>=public.shop_period_start(p_period)
 GROUP BY customer_phone ORDER BY count(*) DESC,sum(total_amount) DESC LIMIT 10) x;
$$;
REVOKE ALL ON FUNCTION public.shop_top_customers(text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.shop_top_customers(text) TO service_role;
-- Métricas operacionais: Pix não pago não entra na fila de atendimento.
CREATE OR REPLACE FUNCTION public.shop_dashboard_stats() RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
 SELECT jsonb_build_object('orders_total',count(*),'orders_today',count(*) FILTER (WHERE created_at>=public.shop_period_start('today')),
 'revenue_total',coalesce(sum(total_amount) FILTER (WHERE payment_status='paid'),0),
 'revenue_today',coalesce(sum(total_amount) FILTER (WHERE payment_status='paid' AND created_at>=public.shop_period_start('today')),0)) FROM public.shop_orders WHERE order_status<>'cancelled' AND (payment_method<>'pix' OR payment_status='paid');
$$;
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
  FROM public.shop_orders WHERE order_status<>'cancelled' AND (payment_method<>'pix' OR payment_status='paid') ORDER BY created_at DESC LIMIT 8
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
