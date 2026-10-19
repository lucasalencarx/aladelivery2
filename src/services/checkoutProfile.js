import {commerce,orderCredentials} from './commerceApi';
import {customerAuth,nationalPhone} from './customerAuth';
const KEY='ala_checkout_profiles_v1';
const fields=['cep','street','number','complement','neighborhood','city','reference'];
export const emptyCheckoutAddress=()=>Object.fromEntries([...fields.map(k=>[k,'']),['state','MS']]);
export function normalizeCheckoutProfile(value){
 const phone=nationalPhone(value?.phone),name=String(value?.name||'').trim().slice(0,150);
 if(!/^\d{10,11}$/.test(phone)||!name)return null;
 const source=value.address||{},address=emptyCheckoutAddress();
 for(const key of fields)address[key]=String(source[key]??(key==='cep'?source.zip_code:'')??'').slice(0,300);
 return {phone,name,address,...(/^[0-9a-f-]{36}$/i.test(value.document_order_id||'')?{document_order_id:value.document_order_id}:{})};
}
export function readCheckoutProfiles(){
 try{const values=JSON.parse(localStorage.getItem(KEY)||'[]');return Array.isArray(values)?values.map(normalizeCheckoutProfile).filter(Boolean):[];}catch{return [];}
}
export function readCheckoutProfile(phone){return readCheckoutProfiles().find(p=>p.phone===nationalPhone(phone))||null;}
export function saveCheckoutProfile(value){
 const profile=normalizeCheckoutProfile(value);if(!profile)return;
 const previous=readCheckoutProfile(profile.phone);if(!profile.document_order_id&&previous?.document_order_id)profile.document_order_id=previous.document_order_id;
 let values=[];try{values=JSON.parse(localStorage.getItem(KEY)||'[]');}catch{}if(!Array.isArray(values))values=[];
 try{localStorage.setItem(KEY,JSON.stringify([profile,...values.map(normalizeCheckoutProfile).filter(p=>p&&p.phone!==profile.phone)].slice(0,10)));
 }catch{/* Checkout continues if browser storage is blocked/full. */}
}
export function hasCheckoutAddress(profile){return ['street','number','neighborhood','city'].every(k=>profile?.address?.[k]?.trim());}
function privateOrders(preferred){
 const ids=[];try{for(const id of [preferred,localStorage.getItem('ala_last_order'),...Object.keys(localStorage).filter(k=>k.startsWith('ala_order_')).map(k=>k.slice(10))])if(id&&!ids.includes(id))ids.push(id);}catch{}
 return ids.slice(0,30).map(id=>({id,token:orderCredentials(id)?.token})).filter(o=>o.token);
}
export async function findCheckoutProfile(phone){
 phone=nationalPhone(phone);const local=readCheckoutProfile(phone);if(local)return local;
 try{const {data}=await customerAuth.auth.getSession();
  if(data.session&&nationalPhone(data.session.user.phone)===phone){
   const response=await commerce('/customer/checkout-profile?phone='+encodeURIComponent(phone),{customer:true});
   const profile=normalizeCheckoutProfile(response.profile);if(profile?.phone===phone){saveCheckoutProfile(profile);return profile;}
  }
 }catch{/* A failed session lookup must not hide the private orders on this device. */}
 for(const reference of privateOrders()){
  try{const {order}=await commerce('/orders/'+encodeURIComponent(reference.id)+'?summary=1',{token:reference.token,timeoutMs:6000});
   const profile=normalizeCheckoutProfile({phone:order?.customer_phone,name:order?.customer_name,address:order?.address,...(order?.has_saved_document?{document_order_id:reference.id}:{})});
   if(profile?.phone===phone){saveCheckoutProfile(profile);return profile;}
  }catch(e){if(e.code==='API_UNREACHABLE')break;}
 }
 return null;
}
export async function savedPixProfile(phone,profile){
 const refs=privateOrders(profile?.document_order_id);
 for(const reference of [...refs,null]){
  try{const result=await commerce('/checkout/pix-document',{customer:true,method:'POST',body:JSON.stringify({phone:nationalPhone(phone),reference})});
   if(result.available===true){if(reference&&profile)saveCheckoutProfile({...profile,document_order_id:reference.id});return {available:true,reference};}
  }catch(e){if(e.code==='API_UNREACHABLE')break;}
 }
 return {available:false,reference:null};
}

export async function recoverCheckoutSuggestions(){
 const saved=readCheckoutProfiles();if(saved.length)return saved;
 const reference=privateOrders()[0];if(!reference)return [];
 try{const {order}=await commerce('/orders/'+encodeURIComponent(reference.id)+'?summary=1',{token:reference.token,timeoutMs:6000});
  const profile=normalizeCheckoutProfile({name:order?.customer_name,phone:order?.customer_phone,address:order?.address});if(profile)saveCheckoutProfile(profile);
 }catch{/* Suggestions never block filling in a phone manually. */}
 return readCheckoutProfiles();
}
