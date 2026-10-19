import {commerce,trackingURL,orderCredentials,rememberOrder} from '../../services/commerceApi';
import {readPendingCheckout,forgetPendingCheckout} from '../../utils/checkoutSession';
import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { X, Plus, Minus, Trash2, ShoppingBag, ArrowRight, ShieldCheck } from 'lucide-react';
import { useCart } from '../../contexts/CartContext';
import { useCheckout } from '../../contexts/CheckoutContext';
import { getProductPrice, money, stockLimit } from '../../utils/commerce';
import { loadPublicCatalog } from '../../storefront/catalogService';
import AnimatedDialog from '../../storefront/AnimatedDialog';
import ProductImage from '../../storefront/ProductImage';
const CheckoutDrawer=lazy(()=>import('../CheckoutDrawer/CheckoutDrawer'));
import '../../storefront/checkout.css';
export default function CartDrawer({onCatalogUpdated}){
 const [pending,setPending]=useState(readPendingCheckout);
 const cart=useCart(),checkout=useCheckout(),[checking,setChecking]=useState(false),[checkoutSeen,setCheckoutSeen]=useState(false),alive=useRef(true),attempt=useRef(0),screen=useRef(false);
 if(checkout.checkoutOpen)screen.current=true;else if(cart.cartOpen)screen.current=false;
 const showCheckout=screen.current;
 useEffect(()=>{const update=()=>setPending(readPendingCheckout());window.addEventListener('checkout-pending-updated',update);return()=>window.removeEventListener('checkout-pending-updated',update);},[]);
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
 useEffect(()=>{if(checkout.checkoutOpen)setCheckoutSeen(true);},[checkout.checkoutOpen]);
 function cancelAndClose(){attempt.current++;setChecking(false);cart.closeCart();checkout.closeCheckout();setCheckoutSeen(false);setPending(readPendingCheckout());if(checkout.checkoutStep==='success'){checkout.clearCheckout();}}
 function backToCart(){checkout.closeCheckout();setCheckoutSeen(false);setPending(readPendingCheckout());cart.openCart();requestAnimationFrame(()=>document.querySelector('.sf-cart-panel .sf-close')?.focus({preventScroll:true}));}
 useEffect(()=>{
  if(!cart.cartOpen)return;
  const saved=readPendingCheckout();setPending(saved);if(!saved)return;
  let live=true;const credentials=orderCredentials(saved.local_order_id);
  if(credentials?.token)commerce('/orders/'+encodeURIComponent(saved.local_order_id)+'?summary=1',{token:credentials.token,timeoutMs:7000}).then(({order})=>{
   if(!live||!order)return;rememberOrder({...order,access_token:credentials.token});
   if(order.payment_status==='paid'||['cancelled','delivered'].includes(order.order_status)){forgetPendingCheckout(saved.local_order_id);setPending(null);if(order.payment_status==='paid')cart.clearCartIfMatches(saved.order_snapshot?.items||[]);}
  }).catch(()=>{});
  return()=>{live=false;};
 },[cart.cartOpen]);
 async function proceed(){
  if(checking||!cart.cart.length)return;setChecking(true);const sequence=++attempt.current;
  try{
   const live=await loadPublicCatalog();if(!alive.current||sequence!==attempt.current)return;onCatalogUpdated?.(live);const result=cart.reconcileCart(live.products);
   if(live.store?.is_open===false){cart.notify('A loja está fechada agora. Confira o horário para finalizar.','warning');return;}
   if(!result.items.length){cart.notify('Os produtos do carrinho não estão mais disponíveis.','warning');return;}
   if(result.changed){cart.notify('Atualizamos o carrinho com os preços e estoque atuais. Revise antes de continuar.','warning');return;}
   const latestPending=readPendingCheckout();if(latestPending&&latestPending.local_order_id!==pending?.local_order_id){setPending(latestPending);cart.notify('Seu pedido anterior foi registrado. Confira o Pix pendente antes de iniciar outra compra.','warning');return;}
   if(pending){forgetPendingCheckout(pending.local_order_id);try{sessionStorage.removeItem('ala_pending_checkout');}catch{}setPending(null);}
   checkout.setCheckoutStep('phone');checkout.setPaymentMethod('');checkout.openCheckout();cart.closeCart();
   return;
  }catch{if(alive.current&&sequence===attempt.current)cart.notify('Não foi possível conferir o estoque agora. Tente novamente.','warning');}
  finally{if(alive.current&&sequence===attempt.current)setChecking(false);}
 }
 return <AnimatedDialog open={cart.cartOpen||checkout.checkoutOpen} onClose={cancelAndClose} label={showCheckout?"Finalizar pedido":"Seu carrinho"} drawer keepMounted><div className="sf-cart-panel" hidden={showCheckout}><div className="sf-cart-head"><div><span className="sf-eyebrow">SEUS FAVORITOS</span><h2>Meu carrinho <span>{cart.totalItems}</span></h2></div><button className="sf-close static" aria-label="Fechar carrinho" onClick={cancelAndClose}><X size={22}/></button></div>{pending&&<aside className="sf-pending-order"><strong>Você tem um pedido aguardando Pix</strong><p>{pending.protocol} · O pagamento deste pedido continua separado dos itens abaixo.</p><a href={orderCredentials(pending.local_order_id)?.token?trackingURL(pending.local_order_id):'/pedidos'}>Ver pedido e continuar pagamento →</a><small>Para outra compra, revise os itens e use “Iniciar outra compra”.</small></aside>}<div className="sf-cart-items">{cart.cart.length?cart.cart.map(p=><article className="sf-cart-item" key={p.id}><button className="sf-cart-photo" tabIndex={-1} disabled><ProductImage product={p}/></button><div className="sf-cart-info"><h3>{p.name}</h3><small>{money(getProductPrice(p))} / {p.unit||'UN'}</small><div className="sf-quantity"><button disabled={checking} aria-label={`Diminuir ${p.name}`} onClick={()=>cart.decreaseQuantity(p.id)}><Minus size={16}/></button><b>{p.quantity}</b><button disabled={checking||p.quantity>=stockLimit(p)} aria-label={`Aumentar ${p.name}`} onClick={()=>cart.increaseQuantity(p.id)}><Plus size={16}/></button></div></div><div className="sf-cart-right"><button className="sf-remove" disabled={checking} aria-label={`Remover ${p.name}`} onClick={()=>cart.removeFromCart(p.id)}><Trash2 size={16}/></button><strong>{money(Math.round(getProductPrice(p)*100)*p.quantity/100)}</strong></div></article>):<div className="sf-empty-cart"><ShoppingBag size={56}/><h3>O carrinho está esperando você</h3><p>Escolha seus favoritos e deixe o resto com a gente.</p><button className="sf-primary" onClick={cart.closeCart}>Explorar produtos</button></div>}</div>{cart.notification&&<p className={`sf-cart-notice ${cart.notification.type}`} role="status">{cart.notification.message}</p>}{cart.cart.length>0&&<div className="sf-cart-summary"><button className="sf-clear" disabled={checking} onClick={cart.clearCart}>Esvaziar carrinho</button><div><span>Subtotal</span><strong>{money(cart.totalPrice)}</strong></div><p>Entrega e eventuais descontos aparecem na próxima etapa.</p><small><ShieldCheck size={14}/> Compra exclusiva para maiores de 18 anos.</small><button className="sf-primary" disabled={checking} onClick={proceed}>{checking?'Conferindo seu carrinho…':pending?'Iniciar outra compra':'Continuar para entrega'}<ArrowRight size={18}/></button><button className="sf-secondary" onClick={cancelAndClose}>Continuar comprando</button></div>}</div><div className="sf-checkout-host" hidden={!showCheckout}>{(checkoutSeen||checkout.checkoutOpen)&&<Suspense fallback={<div className="sf-checkout-loading" role="status">Preparando a próxima etapa…</div>}><CheckoutDrawer embedded onBackToCart={backToCart} onRequestClose={cancelAndClose}/></Suspense>}</div></AnimatedDialog>;
}
