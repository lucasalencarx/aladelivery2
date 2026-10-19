-- Atualizações automáticas no chat, vinculadas aos eventos já existentes do pedido.
BEGIN;
ALTER TABLE public.shop_messages ADD COLUMN IF NOT EXISTS status_event_id bigint REFERENCES public.shop_order_events(id) ON DELETE SET NULL;
CREATE UNIQUE INDEX IF NOT EXISTS shop_messages_status_event_unique ON public.shop_messages(status_event_id) WHERE status_event_id IS NOT NULL;
CREATE OR REPLACE FUNCTION public.shop_status_chat_message() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE o public.shop_orders;message text;first_name text;
BEGIN
 SELECT * INTO o FROM public.shop_orders WHERE id=NEW.order_id;
 IF NOT FOUND THEN RETURN NEW;END IF;
 first_name=split_part(trim(o.customer_name),' ',1);
 message=CASE NEW.status
  WHEN 'pending' THEN 'Recebemos seu pedido. Estamos aguardando a confirmação do Pix.'
  WHEN 'confirmed' THEN 'Seu pedido está confirmado! Vamos cuidar de tudo por aqui.'
  WHEN 'preparing' THEN 'Seu pedido está em preparação. Estamos separando seus produtos com carinho.'
  WHEN 'out_for_delivery' THEN 'Seu pedido saiu para entrega! Fique de olho na chegada do entregador.'
  WHEN 'delivered' THEN 'Seu pedido foi marcado como entregue. Obrigado por escolher a Ala Delivery!'
  WHEN 'cancelled' THEN 'Seu pedido foi cancelado. Se precisar de ajuda ou de informações sobre o pagamento, fale com a loja aqui no chat.'
  ELSE 'O status do seu pedido foi atualizado.' END;
 INSERT INTO public.shop_messages(order_id,sender,body,status_event_id)
 VALUES(o.id,'store','Olá'||CASE WHEN first_name<>'' THEN ', '||first_name ELSE '' END||'! Aqui é da Ala Delivery. Pedido '||o.protocol||': '||message,NEW.id)
 ON CONFLICT(status_event_id) WHERE status_event_id IS NOT NULL DO NOTHING;
 RETURN NEW;
END$$;
REVOKE ALL ON FUNCTION public.shop_status_chat_message() FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS shop_status_chat ON public.shop_order_events;
CREATE TRIGGER shop_status_chat AFTER INSERT ON public.shop_order_events FOR EACH ROW EXECUTE FUNCTION public.shop_status_chat_message();
NOTIFY pgrst,'reload schema';
COMMIT;
