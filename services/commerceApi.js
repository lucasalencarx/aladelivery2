import {customerAuth} from './customerAuth';
import { supabase } from '../supabase/supabase';
export const commerceURL=(import.meta.env.DEV?'':String(import.meta.env.VITE_API_URL||'').replace(/\/$/,''))+'/api/commerce';
export async function commerce(path,{admin=false,customer=false,token,...options}={}){
 const headers={'Content-Type':'application/json'};
 if(token)headers['X-Order-Token']=token;
 if(customer){const {data}=await customerAuth.auth.getSession();if(data.session)headers.Authorization=`Bearer ${data.session.access_token}`;}
 if(admin){const {data}=await supabase.auth.getSession();headers.Authorization=`Bearer ${data.session?.access_token||''}`;}
 let res;try{res=await fetch(commerceURL+path,{...options,headers,cache:'no-store',signal:AbortSignal.timeout(25000)});}catch{const e=Error(`Não foi possível conectar ao servidor de pedidos em ${new URL(commerceURL,window.location.origin).origin}. Reinicie npm run dev na raiz do projeto. Em produção, confira o encaminhamento /api ou VITE_API_URL.`);e.code='API_UNREACHABLE';throw e;}let data;try{data=await res.json();}catch{throw Error('A URL da API retornou uma página em vez de JSON. Confira VITE_API_URL e o encaminhamento /api no servidor.');}if(!res.ok){const e=Error(data.message||'Não foi possível concluir.');e.code=data.code;throw e;}return data;
}
export const orderCredentials=id=>{try{return JSON.parse(localStorage.getItem('ala_order_'+id)||'null');}catch{return null;}};
export function rememberOrder(o){localStorage.setItem('ala_order_'+o.id,JSON.stringify({id:o.id,token:o.access_token,protocol:o.protocol}));localStorage.setItem('ala_last_order',o.id);}
export function trackingURL(id){const o=orderCredentials(id);return `/rastrear?pedido=${encodeURIComponent(o?.protocol||'')}#id=${encodeURIComponent(id||'')}&token=${encodeURIComponent(o?.token||'')}`;}
export const statusLabels={pending:'Aguardando Pix',confirmed:'Confirmado',preparing:'Em preparação',out_for_delivery:'Saiu para entrega',delivered:'Entregue',cancelled:'Cancelado'};

// SSE com token no cabeçalho: o link privado não aparece nos logs de URL da API.
export function watchOrder(path,{admin,token,onChange}){
 const controller=new AbortController();let retry;
 async function connect(){
  try{const headers={Accept:'text/event-stream'};if(token)headers['X-Order-Token']=token;if(admin){const {data}=await supabase.auth.getSession();headers.Authorization=`Bearer ${data.session?.access_token||''}`;}
   const r=await fetch(commerceURL+path,{headers,signal:controller.signal});if(!r.ok||!r.body)throw Error();const reader=r.body.getReader(),decoder=new TextDecoder();let pending='';
   while(!controller.signal.aborted){const {value,done}=await reader.read();if(done)break;pending+=decoder.decode(value,{stream:true});let end;while((end=pending.indexOf('\n\n'))>=0){const event=pending.slice(0,end);pending=pending.slice(end+2);if(event.startsWith('data:'))onChange();}}
  }catch{/* Consulta periódica cobre reconexões. */}if(!controller.signal.aborted)retry=setTimeout(connect,5000);
 }
 connect();return()=>{controller.abort();clearTimeout(retry);};
}
