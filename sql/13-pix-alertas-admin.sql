-- Execute depois dos SQLs 08 a 12. Pode ser reexecutado.
BEGIN;
ALTER TABLE public.shop_orders ADD COLUMN IF NOT EXISTS payment_checked_at timestamptz;
CREATE INDEX IF NOT EXISTS shop_pix_reconciliation_idx ON public.shop_orders(payment_checked_at NULLS FIRST)
 WHERE payment_method='pix' AND order_status='pending';

CREATE TABLE IF NOT EXISTS public.shop_order_alerts (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 order_id uuid NOT NULL UNIQUE REFERENCES public.shop_orders(id) ON DELETE CASCADE,
 created_at timestamptz NOT NULL DEFAULT now(), acknowledged_at timestamptz
);
CREATE INDEX IF NOT EXISTS shop_order_alerts_unread_idx ON public.shop_order_alerts(id) WHERE acknowledged_at IS NULL;
ALTER TABLE public.shop_order_alerts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.shop_order_alerts FROM PUBLIC,anon,authenticated;
GRANT SELECT,UPDATE ON public.shop_order_alerts TO service_role;

CREATE OR REPLACE FUNCTION public.shop_enqueue_order_alert() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
BEGIN
 IF NEW.order_status IN ('confirmed','preparing','out_for_delivery') AND
    (NEW.payment_method<>'pix' OR NEW.payment_status='paid') THEN
   INSERT INTO public.shop_order_alerts(order_id) VALUES(NEW.id) ON CONFLICT(order_id) DO NOTHING;
 END IF;
 IF NEW.order_status IN ('cancelled','delivered') THEN
   UPDATE public.shop_order_alerts SET acknowledged_at=coalesce(acknowledged_at,now()) WHERE order_id=NEW.id;
 END IF;
 RETURN NEW;
END$$;
REVOKE ALL ON FUNCTION public.shop_enqueue_order_alert() FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS shop_order_alert_enqueue ON public.shop_orders;
CREATE TRIGGER shop_order_alert_enqueue AFTER INSERT OR UPDATE OF order_status,payment_status ON public.shop_orders
 FOR EACH ROW EXECUTE FUNCTION public.shop_enqueue_order_alert();

-- Pagamento, etapa, mensagem automática e aviso são gravados na mesma transação.
-- Somente o backend pode chamar, depois de consultar o gateway autenticado.
CREATE OR REPLACE FUNCTION public.shop_confirm_pix(p_id uuid,p_gateway_order_id text,p_amount bigint)
RETURNS public.shop_orders LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE o public.shop_orders;
BEGIN
 SELECT * INTO o FROM public.shop_orders WHERE id=p_id FOR UPDATE;
 IF NOT FOUND OR o.payment_method<>'pix' OR o.pagarme_order_id IS DISTINCT FROM p_gateway_order_id
    OR round(o.total_amount*100)::bigint IS DISTINCT FROM p_amount THEN
   RAISE EXCEPTION 'Pagamento não corresponde ao pedido';
 END IF;
 IF o.payment_status IN ('refunded','failed') THEN RAISE EXCEPTION 'Pagamento exige revisão pela loja'; END IF;
 IF o.payment_status<>'paid' THEN
   UPDATE public.shop_orders SET payment_status='paid',paid_at=now(),updated_at=now() WHERE id=p_id;
 END IF;
 IF o.order_status='pending' THEN
   PERFORM public.shop_transition(p_id,'confirmed','Pix confirmado pelo Pagar.me.');
 END IF;
 -- Pedido já cancelado não retorna à produção. Loja deve revisar/estornar.
 SELECT * INTO o FROM public.shop_orders WHERE id=p_id;
 RETURN o;
END$$;
REVOKE ALL ON FUNCTION public.shop_confirm_pix(uuid,text,bigint) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.shop_confirm_pix(uuid,text,bigint) TO service_role;
-- Revalida a reserva sob lock para não cancelar um Pix confirmado em paralelo.
CREATE OR REPLACE FUNCTION public.shop_expire_pix(p_id uuid) RETURNS public.shop_orders
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE o public.shop_orders; expires timestamptz;
BEGIN
 SELECT * INTO o FROM public.shop_orders WHERE id=p_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Pedido não encontrado'; END IF;
 expires:=coalesce(nullif(o.pix_data->>'expires_at','')::timestamptz,o.created_at+interval '15 minutes');
 IF o.payment_method='pix' AND o.order_status='pending' AND o.payment_status='pending' AND now()>expires+interval '2 minutes' THEN
   PERFORM public.shop_transition(p_id,'cancelled','Pix vencido sem pagamento. Reserva de estoque liberada.');
 END IF;
 SELECT * INTO o FROM public.shop_orders WHERE id=p_id;
 RETURN o;
END$$;
REVOKE ALL ON FUNCTION public.shop_expire_pix(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.shop_expire_pix(uuid) TO service_role;
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM pg_publication WHERE pubname='supabase_realtime') AND
 NOT EXISTS(SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='shop_order_alerts') THEN
   ALTER PUBLICATION supabase_realtime ADD TABLE public.shop_order_alerts;
 END IF;
END $$;
COMMIT;
