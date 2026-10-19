import { useSyncExternalStore } from 'react';
const key='ala-delivery-favorites-v1';
let ids=[];try{const stored=JSON.parse(localStorage.getItem(key)||'[]');if(Array.isArray(stored))ids=stored.filter(id=>typeof id==='string');}catch{/* Favoritos disponíveis nesta visita. */}
const listeners=new Set();
const emit=()=>listeners.forEach(fn=>fn());
window.addEventListener('storage',event=>{if(event.key!==key)return;try{const next=JSON.parse(event.newValue||'[]');ids=Array.isArray(next)?next.filter(id=>typeof id==='string'):[];}catch{ids=[];}emit();});
export function useFavorites(){const selected=useSyncExternalStore(fn=>{listeners.add(fn);return()=>listeners.delete(fn);},()=>ids);return {isFavorite:id=>selected.includes(String(id)),toggle:id=>{const value=String(id);ids=ids.includes(value)?ids.filter(item=>item!==value):[...ids,value];try{localStorage.setItem(key,JSON.stringify(ids));}catch{/* Sem armazenamento, mantém nesta visita. */}emit();}};}
