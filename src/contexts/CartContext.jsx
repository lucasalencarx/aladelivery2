import {cartSignature} from '../utils/checkoutSession';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { getProductPrice, normalizeCart, stockLimit } from '../utils/commerce';
const CartContext=createContext(null),storageKey='ala-delivery-cart-v2';
function restore(){try{return normalizeCart(JSON.parse(localStorage.getItem(storageKey)||'[]'));}catch{return [];}}
export function CartProvider({children}){
 const [cart,setCart]=useState(restore),ref=useRef(cart),[cartOpen,setCartOpen]=useState(false),[notification,setNotification]=useState(null);
 const commit=useCallback(next=>{ref.current=next;setCart(next);},[]);
 useEffect(()=>{try{localStorage.setItem(storageKey,JSON.stringify(cart));}catch{/* Navegação privada pode impedir a persistência. */}},[cart]);
 const notify=useCallback((message,type='success',product=null)=>setNotification({message,type,product,id:globalThis.crypto?.randomUUID?.()||`${Date.now()}-${Math.random()}`}),[]);
 useEffect(()=>{if(!notification||cartOpen)return;const timer=setTimeout(()=>setNotification(null),4500);return()=>clearTimeout(timer);},[notification,cartOpen]);
 const addToCart=useCallback((product,quantity=1)=>{
  const amount=Math.floor(Number(quantity));if(!product?.id||product.active===false||!Number.isFinite(Number(product.price))||Number(product.price)<0||!Number.isFinite(amount)||amount<1)return false;
  const id=String(product.id),existing=ref.current.find(p=>String(p.id)===id),limit=stockLimit(product);
  if((existing?.quantity||0)+amount>limit){notify(limit===0?'Este produto está indisponível.':'Você já atingiu o estoque disponível.','warning',product);return false;}
  const next=existing?ref.current.map(p=>String(p.id)===id?{...product,id,quantity:p.quantity+amount}:p):[...ref.current,{...product,id,quantity:amount}];
  commit(next);notify(`${product.name} adicionado ao carrinho${amount>1?` · ${amount} unidades`:''}.`,'success',product);return true;
 },[commit,notify]);
 const increaseQuantity=useCallback(id=>{const p=ref.current.find(x=>String(x.id)===String(id));if(p)addToCart(p);},[addToCart]);
 const decreaseQuantity=useCallback(id=>commit(ref.current.map(p=>String(p.id)===String(id)?{...p,quantity:p.quantity-1}:p).filter(p=>p.quantity>0)),[commit]);
 const removeFromCart=useCallback(id=>commit(ref.current.filter(p=>String(p.id)!==String(id))),[commit]);
 const clearCart=useCallback(()=>{commit([]);setNotification(null);try{localStorage.removeItem(storageKey);}catch{}},[commit]);
 const clearCartIfMatches=useCallback(items=>{if(cartSignature(ref.current)===cartSignature(items)){clearCart();return true;}return false;},[clearCart]);
 const reconcileCart=useCallback(products=>{
  const live=new Map(products.map(p=>[String(p.id),p]));const old=ref.current;
  const next=old.flatMap(p=>{const current=live.get(String(p.id));if(!current||current.active===false)return [];const quantity=Math.min(p.quantity,stockLimit(current));return quantity>0?[{...current,id:String(current.id),quantity}]:[];});
  const changed=old.length!==next.length||old.some((p,i)=>String(p.id)!==String(next[i]?.id)||p.quantity!==next[i]?.quantity||getProductPrice(p)!==getProductPrice(next[i]));
  commit(next);return {changed,items:next};
 },[commit]);
 const totalItems=useMemo(()=>cart.reduce((n,p)=>n+p.quantity,0),[cart]);
 const totalPrice=useMemo(()=>cart.reduce((n,p)=>n+Math.round(getProductPrice(p)*100)*p.quantity,0)/100,[cart]);
 const openCart=useCallback(()=>setCartOpen(true),[]),closeCart=useCallback(()=>setCartOpen(false),[]),dismissNotification=useCallback(()=>setNotification(null),[]);
 return <CartContext.Provider value={{cart,cartOpen,openCart,closeCart,addToCart,increaseQuantity,decreaseQuantity,removeFromCart,clearCart,clearCartIfMatches,reconcileCart,totalItems,totalPrice,notification,notify,dismissNotification}}>{children}</CartContext.Provider>;
}
export function useCart(){const context=useContext(CartContext);if(!context)throw new Error('useCart precisa de CartProvider');return context;}
