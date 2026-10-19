import {useState} from 'react';
import {commerce} from '../services/commerceApi';
import {whatsappLink} from '../utils/orderTools';
export default function OrderWhatsAppLink({order,greeting='neutral',children,...props}){
 const [error,setError]=useState('');
 async function open(e){
  if(order.tracking_url||order.legacy)return;
  e.preventDefault();setError('');const popup=window.open('','_blank');
  if(!popup){setError('Permita a abertura do WhatsApp neste navegador.');return;}
  popup.opener=null;
  try{const data=await commerce('/admin/orders/'+order.id+'/tracking',{admin:true});if(!data.tracking_url)throw Error('Link de acompanhamento indisponível.');popup.location.href=whatsappLink({...order,tracking_url:data.tracking_url},greeting);}
  catch(err){popup.close();setError(err.message);}
 }
 return <><a {...props} href={whatsappLink(order,greeting)||undefined} target="_blank" rel="noopener noreferrer" onClick={open}>{children}</a>{error&&<small role="alert">{error}</small>}</>;
}
