import {useEffect,useState} from 'react';
import {supabase} from '../supabase/supabase';
import {commerce} from './commerceApi';
import {secureUUID} from '../utils/uuid';
export function usePublicStoreSettings(){
 const [value,setValue]=useState(null);
 useEffect(()=>{let live=true;async function load(){try{const {data,error}=await supabase.rpc('shop_public_settings');if(!error&&live)setValue(data);}catch{}}
 load();const timer=setInterval(load,30000);window.addEventListener('store-settings-updated',load);return()=>{live=false;clearInterval(timer);window.removeEventListener('store-settings-updated',load);};},[]);return value;
}
export function recordStoreVisit(){try{let id=localStorage.getItem('ala_visitor_id');if(!/^[0-9a-f-]{36}$/i.test(id||'')){id=secureUUID();localStorage.setItem('ala_visitor_id',id);}return commerce('/visits',{method:'POST',body:JSON.stringify({visitor_id:id})}).catch(()=>{});}catch{return Promise.resolve();}}
