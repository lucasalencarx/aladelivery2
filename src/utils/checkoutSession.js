export const pendingCheckoutKey='ala_delivery_active_order_v1';
export function readPendingCheckout(){try{const value=JSON.parse(localStorage.getItem(pendingCheckoutKey)||'null');return value?.status==='waiting_payment'&&value.local_order_id?value:null;}catch{return null;}}
export function forgetPendingCheckout(id){try{const current=JSON.parse(localStorage.getItem(pendingCheckoutKey)||'null');if(!id||current?.local_order_id===id)localStorage.removeItem(pendingCheckoutKey);}catch{}}
export function cartSignature(items=[]){return JSON.stringify(items.map(p=>[String(p.id),Number(p.quantity)]).sort((a,b)=>a[0].localeCompare(b[0])));}
export function checkoutProblem(customer,address,items){
 const phone=String(customer?.phone||'').replace(/\D/g,'').replace(/^55(?=\d{10,11}$)/,'');
 if(!/^\d{10,11}$/.test(phone))return {step:'phone',message:'Informe um telefone válido com DDD.'};
 if(!String(customer?.name||'').trim())return {step:'customer',message:'Informe seu nome para continuar.'};
 if(!items?.length||items.some(p=>!p.id||!Number.isInteger(Number(p.quantity))||Number(p.quantity)<1))return {step:'phone',message:'Confira os itens do carrinho antes de continuar.'};
 if(['street','number','neighborhood','city'].some(key=>!String(address?.[key]||'').trim()))return {step:'address-form',message:'Confira rua, número, cidade e bairro antes de continuar.'};
 return null;
}
