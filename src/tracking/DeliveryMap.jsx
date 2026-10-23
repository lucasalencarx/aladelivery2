import {useEffect,useRef,useState} from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
const helmet='<svg viewBox="0 0 48 48" width="36" height="36" aria-hidden="true"><path fill="#ffd32b" stroke="#171717" stroke-width="2" d="M7 29C4 10 19 3 30 8c10 4 13 13 11 25l-13 8H12z"/><path fill="#171717" d="M25 13c8 1 12 6 13 14H23l-5-8z"/><path fill="none" stroke="#171717" stroke-width="3" d="M8 30h14l7 10"/><path fill="none" stroke="#fff" stroke-width="2" d="M27 16l7 7"/></svg>';
export default function DeliveryMap({position,destination}){
 const node=useRef(null),state=useRef(null),[tilesFailed,setTilesFailed]=useState(false);
 useEffect(()=>{
  const map=L.map(node.current,{scrollWheelZoom:false}).setView([position.lat,position.lng],16);
  const tiles=L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a>'}).addTo(map);
  tiles.on('tileerror',()=>setTilesFailed(true));tiles.on('load',()=>setTilesFailed(false));
  const marker=L.marker([position.lat,position.lng],{icon:L.divIcon({className:'live-helmet',html:helmet,iconSize:[48,48],iconAnchor:[24,24]}),title:'Última posição recebida do entregador'}).addTo(map);
  const circle=L.circle([position.lat,position.lng],{radius:0,color:'#e8b923',weight:1,fillOpacity:.1}).addTo(map);
  state.current={map,marker,circle,follow:true};map.on('dragstart',()=>{state.current.follow=false;});
  const resize=new ResizeObserver(()=>map.invalidateSize());resize.observe(node.current);
  return()=>{resize.disconnect();map.remove();state.current=null;};
 },[]);
 useEffect(()=>{
  const s=state.current;if(!s)return;
  s.marker.setLatLng([position.lat,position.lng]);s.circle.setLatLng([position.lat,position.lng]).setRadius(Math.min(position.accuracy||0,2000));
  if(s.follow)s.map.panTo([position.lat,position.lng],{animate:!window.matchMedia('(prefers-reduced-motion: reduce)').matches});
 },[position.lat,position.lng,position.accuracy]);
 useEffect(()=>{
  if(!destination||!state.current)return;
  const marker=L.marker([destination.lat,destination.lng],{icon:L.divIcon({className:'live-home',html:'<span>⌂</span>',iconSize:[32,32],iconAnchor:[16,16]}),title:'Ponto confirmado de entrega'}).addTo(state.current.map);
  return()=>marker.remove();
 },[destination?.lat,destination?.lng]);
 return <><div className="live-map" ref={node} role="region" aria-label="Mapa da última posição recebida do entregador"/><button type="button" className="live-center" onClick={()=>{state.current.follow=true;state.current.map.setView([position.lat,position.lng],16);}}>Centralizar entregador</button>{tilesFailed&&<p role="status">Não foi possível carregar parte do mapa. Verifique sua conexão.</p>}</>;
}
