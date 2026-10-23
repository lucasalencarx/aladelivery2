import {lazy,Suspense,useEffect,useState} from 'react';
import {commerce} from '../services/commerceApi';
import './live-delivery.css';
const DeliveryMap=lazy(()=>import('./DeliveryMap'));
export function locationAge(position,now=Date.now()){
 if(!position?.updated_at)return null;const value=Date.parse(position.updated_at);return Number.isFinite(value)?Math.max(0,Math.floor((now-value)/1000)):null;
}
export default function LiveDeliveryMap({id,token,admin=false}){
 const [data,setData]=useState(null),[error,setError]=useState(''),[now,setNow]=useState(Date.now()),[open,setOpen]=useState(false),[badPhoto,setBadPhoto]=useState(false);
 useEffect(()=>{
  let live=true,busy=false,finished=false;const controller=new AbortController();
  async function load(){if(busy||document.hidden||finished)return;busy=true;try{
   const d=await commerce(admin?'/admin/orders/'+id+'/live-tracking':'/orders/'+id+'/tracking',{admin,token,signal:controller.signal,timeoutMs:12000});
   if(live){setData(d);setError('');if(d.status!=='out_for_delivery')finished=true;}
  }catch(e){if(live)setError(e.message);}finally{busy=false;}}
  load();const timer=setInterval(load,10000),clock=setInterval(()=>setNow(Date.now()),1000);document.addEventListener('visibilitychange',load);
  return()=>{live=false;controller.abort();clearInterval(timer);clearInterval(clock);document.removeEventListener('visibilitychange',load);};
 },[id,token,admin]);
 useEffect(()=>setBadPhoto(false),[data?.courier?.photo_url]);
 const age=locationAge(data?.position,now),fresh=age!==null&&age<=45&&!error;
 const c=data?.courier;
 return <section className="oc-card live-delivery" aria-label="Rastreamento da entrega"><div className="live-title"><span>🛵</span><div><h2>Sua entrega no mapa</h2><p>Acompanhe o caminho até você</p></div><span className={fresh?'live-badge active':'live-badge'}>{fresh?'Atualizando':data&&!data.active?'Encerrado':'Aguardando sinal'}</span></div>
 {c&&<div className="live-person">{c.photo_url&&!badPhoto?<img src={c.photo_url} onError={()=>setBadPhoto(true)} alt={'Foto de '+c.name}/>:<div className="live-avatar" aria-label="Foto não cadastrada">{String(c.name||'E').slice(0,1)}</div>}<div><small>SEU ENTREGADOR</small><strong>{c.name}</strong><span>{c.vehicle||'Veículo não informado'}{c.plate?' · Placa '+c.plate:c.vehicle==='Bicicleta'||c.vehicle==='A pé'?' · Sem placa':' · Placa não informada'}</span></div></div>}
 {error&&<p className="live-warning" role="status">Não foi possível atualizar o rastreamento. Tentaremos novamente. {data?.position&&'A posição abaixo pode estar desatualizada.'}</p>}
 {!data&&!error&&<p role="status">Consultando rastreamento…</p>}
 {data&&!data.active&&<p>O compartilhamento desta entrega foi encerrado ou está indisponível.</p>}
 {data?.active&&!data.position&&<p>Assim que o entregador compartilhar o GPS, a posição aparecerá aqui.</p>}
 {data?.active&&data.position&&<><p className={fresh?'live-time':'live-time live-warning'} role="status">{fresh?'● Posição recebida':'● Sinal desatualizado'} · há {age===null?'alguns instantes':age<60?`${age} s`:`${Math.floor(age/60)} min`}{data.position.accuracy!=null&&` · precisão aproximada de ${Math.round(data.position.accuracy)} m`}</p><button type="button" className="oc-button oc-primary" onClick={()=>setOpen(v=>!v)} aria-expanded={open}>{open?'Recolher mapa':'Rastrear entrega'}</button>{open&&<div className={fresh?'live-map-wrap':'live-map-wrap stale'}><Suspense fallback={<p role="status">Abrindo mapa…</p>}><DeliveryMap position={data.position} destination={data.destination}/></Suspense></div>}<small className="live-disclaimer">Posição aproximada enviada pelo celular. O marcador acompanha as atualizações recebidas; pode haver atraso de sinal.</small></>}
 </section>;
}
