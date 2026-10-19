import {useEffect,useRef,useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {Bell,CheckCircle2,MapPin,Package,Phone,Volume2,VolumeX,X,ArrowUpRight} from 'lucide-react';
import {commerce,watchOrder} from '../../services/commerceApi';
import storePhoto from '../../assets/images/logomarca.png';
import './order-alerts.css';
const money=v=>Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const soundURL=import.meta.env.VITE_ORDER_ALERT_SOUND||'/audio/novo-pedido.wav';
export default function OrderAlerts(){
 const [alerts,setAlerts]=useState([]),[error,setError]=useState(''),[sound,setSound]=useState(false),[soundError,setSoundError]=useState(''),[busy,setBusy]=useState(false);
 const audio=useRef(null),dialog=useRef(null),mounted=useRef(false),loading=useRef(false),version=useRef(0),played=useRef(null);
 const navigate=useNavigate(),current=alerts[0],order=current?.order;
 useEffect(()=>{
  const player=new Audio(soundURL);player.preload='auto';audio.current=player;
  return()=>{player.pause();audio.current=null;};
 },[]);
 useEffect(()=>{
  mounted.current=true;
  async function load(){
   if(loading.current)return;loading.current=true;const seq=version.current;
   try{const data=await commerce('/admin/notifications',{admin:true});if(mounted.current&&seq===version.current){setAlerts(data.alerts||[]);setError('');}}
   catch(e){if(mounted.current)setError(e.message);}
   finally{loading.current=false;}
  }
  load();const stop=watchOrder('/admin/notifications/stream',{admin:true,onChange:load});
  const timer=setInterval(load,5000);document.addEventListener('visibilitychange',load);
  return()=>{mounted.current=false;version.current++;clearInterval(timer);stop();document.removeEventListener('visibilitychange',load);};
 },[]);
 useEffect(()=>{
  const node=dialog.current;if(!node)return;
  if(current&&!node.open)node.showModal();else if(!current&&node.open)node.close();
 },[current?.id]);
 useEffect(()=>{
  if(!current||!sound||played.current===current.id)return;
  played.current=current.id;
  audio.current.currentTime=0;
  audio.current.play().catch(()=>{if(mounted.current){setSound(false);setSoundError('Som bloqueado. Clique em Ativar som para liberar.');}});
 },[current?.id,sound]);
 async function enableSound(){
  if(sound){audio.current?.pause();setSound(false);return;}
  try{audio.current.currentTime=0;await audio.current.play();setSound(true);setSoundError('');played.current=current?.id||null;}
  catch{setSoundError('Não foi possível tocar o áudio. Confira o arquivo e tente novamente.');}
 }
 async function dismiss(openOrder=false){
  if(!current||busy)return;setBusy(true);setError('');
  try{await commerce('/admin/notifications/'+current.id+'/ack',{admin:true,method:'POST',body:'{}'});version.current++;setAlerts(list=>list.filter(a=>a.id!==current.id));audio.current?.pause();if(openOrder)navigate('/admin/orders?pedido='+encodeURIComponent(current.order_id));}
  catch(e){setError(e.message);}finally{setBusy(false);}
 }
 return <>
  <div className="oa-monitor"><span><i className={error?'offline':''}/><Bell size={15}/>{error?'Avisos sem conexão · tentando novamente':'Monitor de novos pedidos ativo'}{alerts.length>0&&<b>{alerts.length} para conferir</b>}</span><button type="button" onClick={enableSound}>{sound?<Volume2 size={16}/>:<VolumeX size={16}/>} {sound?'Som ativado':'Ativar som'}</button></div>
  {soundError&&<p className="oa-sound-note" role="status">{soundError}</p>}
  {error&&!current&&<p className="oa-sound-note" role="alert">{error}</p>}
  <dialog className="oa-dialog" ref={dialog} aria-labelledby="oa-title" onCancel={e=>{e.preventDefault();dismiss();}}>
   {order&&<><header className="oa-header"><img src={storePhoto} alt="Ala Delivery"/><div><span>NOVO PEDIDO NA LOJA</span><h2 id="oa-title">Pode preparar! <CheckCircle2 size={23}/></h2><p>{order.protocol} · {new Date(current.created_at).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}</p></div><button type="button" aria-label="Fechar aviso" disabled={busy} onClick={()=>dismiss()}><X size={21}/></button></header>
   <div className="oa-body"><div className="oa-customer"><div><small>CLIENTE</small><h3>{order.customer_name}</h3><p><Phone size={14}/>{order.customer_phone}</p></div><span className="oa-payment">{order.payment_method==='pix'?'Pix confirmado':order.payment_method==='cartao'?'Cartão na entrega':'Dinheiro na entrega'}</span></div>
   <div className="oa-products">{(order.items||[]).map((item,index)=><article key={item.product_id||index}><div className="oa-product-photo">{item.image_url?<img src={item.image_url} alt={item.product_name} onError={e=>{e.currentTarget.hidden=true;}}/>:<Package size={24}/>}</div><div><h4>{item.product_name}</h4><p>{item.quantity} × {money(item.unit_price)}</p></div><strong>{money(item.total_price)}</strong></article>)}</div>
   <div className="oa-address"><MapPin size={20}/><div><small>ENTREGAR EM</small><strong>{order.address?.street}, {order.address?.number}</strong><p>{[order.address?.complement,order.address?.neighborhood,order.address?.city,'MS'].filter(Boolean).join(' · ')}</p>{order.address?.reference&&<p>Referência: {order.address.reference}</p>}</div></div>
   {order.observation&&<p className="oa-observation"><b>Observação:</b> {order.observation}</p>}
   <dl className="oa-totals"><div><dt>Produtos</dt><dd>{money(order.subtotal)}</dd></div>{Number(order.discount_amount)>0&&<div><dt>Desconto</dt><dd>− {money(order.discount_amount)}</dd></div>}<div><dt>Entrega</dt><dd>{money(order.delivery_fee)}</dd></div><div className="oa-grand"><dt>Total do pedido</dt><dd>{money(order.total_amount)}</dd></div></dl>
   {error&&<p role="alert" className="oa-error">{error}</p>}
   </div><footer className="oa-footer"><small>{alerts.length>1?`${alerts.length-1} outro(s) aviso(s) na fila`:'Pedido salvo no painel'}</small><div><button type="button" disabled={busy} onClick={()=>dismiss()}>{busy?'Salvando…':'Fechar'}</button><button type="button" disabled={busy} className="oa-open" onClick={()=>dismiss(true)}>Ver pedido <ArrowUpRight size={17}/></button></div></footer></>}
  </dialog>
 </>;
}
