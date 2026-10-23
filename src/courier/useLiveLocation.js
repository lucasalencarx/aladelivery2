import {useEffect,useRef,useState} from 'react';
// O consentimento é sempre iniciado pelo botão; não inicia GPS no login.
export default function useLiveLocation(orderId,api,onEnded){
 const [note,setNote]=useState(''),apiRef=useRef(api),endRef=useRef(onEnded);
 apiRef.current=api;endRef.current=onEnded;
 useEffect(()=>{
  if(!orderId){setNote(previous=>/negada|HTTPS/.test(previous)?previous:'');return;}
  let live=true,position=null,sending=false,last=0,lock=null,watch=null,acquiring=false;
  const controller=new AbortController();
  const update=message=>{if(live)setNote(message);};
  async function wake(){if(!live||document.hidden||lock||!navigator.wakeLock)return;try{const value=await navigator.wakeLock.request('screen');if(!live){await value.release();return;}lock=value;value.addEventListener('release',()=>{lock=null;});}catch{/* A atualização continua, mas o sistema pode apagar a tela. */}}
  async function send(){
   if(!live||sending||!position||Date.now()-last<15000||Date.now()-position.timestamp>30000)return;
   sending=true;last=Date.now();
   try{const {latitude:lat,longitude:lng,accuracy}=position.coords;const result=await apiRef.current('/orders/'+orderId+'/position',{method:'POST',signal:controller.signal,body:JSON.stringify({lat,lng,accuracy})});
    update(result.nearby?'Localização compartilhada · cliente avisado da aproximação.':'Localização compartilhada · mantenha esta tela aberta.');
   }catch(e){if(!live)return;update('Posição não enviada. Verifique a internet; tentaremos novamente.');if([401,403,409].includes(e.status))endRef.current();}
   finally{sending=false;}
  }
  function visibility(){if(!document.hidden){wake();send();}else update('Volte a esta tela para manter o rastreamento. Outros aplicativos podem suspender o GPS.');}
  if(!navigator.geolocation||!window.isSecureContext){setNote('O GPS exige HTTPS e um navegador com localização.');endRef.current();return;}
  setNote('Aguardando permissão e sinal do GPS…');
  const received=p=>{if(!live)return;position=p;send();};
  const failed=e=>{if(!live)return;
   if(e.code===1){update('Localização negada. Autorize nas configurações do navegador e tente novamente.');endRef.current();}
   else update('GPS sem sinal. Aguardando nova posição; a posição anterior pode estar desatualizada.');
  };
  const options={enableHighAccuracy:true,maximumAge:0,timeout:20000};
  watch=navigator.geolocation.watchPosition(received,failed,options);
  const timer=setInterval(()=>{
   if((!position||Date.now()-position.timestamp>=15000)&&!acquiring&&navigator.geolocation.getCurrentPosition){
    acquiring=true;navigator.geolocation.getCurrentPosition(p=>{acquiring=false;received(p);},e=>{acquiring=false;failed(e);},options);
   }else send();
  },15000);wake();document.addEventListener('visibilitychange',visibility);
  return()=>{live=false;controller.abort();clearInterval(timer);if(watch!==null)navigator.geolocation.clearWatch(watch);document.removeEventListener('visibilitychange',visibility);lock?.release().catch(()=>{});};
 },[orderId]);
 return note;
}
