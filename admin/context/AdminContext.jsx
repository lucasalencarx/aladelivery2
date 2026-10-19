import {createContext,useContext,useEffect,useState,useCallback} from 'react';
import {supabase} from '../../supabase/supabase';
import {isStoreOpen} from '../../utils/storeHours';
const Context=createContext(null);
export function AdminProvider({children}){
 const [sidebarOpen,setSidebarOpen]=useState(false),[storeStatus,setStoreStatus]=useState(null),[loadingStoreStatus,setLoading]=useState(true),[changingStoreStatus,setBusy]=useState(false),[clock,setClock]=useState(Date.now());
 const loadStoreStatus=useCallback(async()=>{try{const {data,error}=await supabase.from('store_status').select('*').eq('id',1).single();if(error)throw error;setStoreStatus(data);}finally{setLoading(false);}},[]);
 useEffect(()=>{loadStoreStatus().catch(()=>{});const t=setInterval(()=>{setClock(Date.now());loadStoreStatus().catch(()=>{});},30000);return()=>clearInterval(t);},[loadStoreStatus]);
 async function update(values){setBusy(true);try{const {data,error}=await supabase.from('store_status').update(values).eq('id',1).select().single();if(error)throw error;setStoreStatus(data);window.dispatchEvent(new Event('store-settings-updated'));return {success:true};}catch(error){return {success:false,error};}finally{setBusy(false);}}
 const storeOpen=isStoreOpen(storeStatus,new Date(clock));
 const value={sidebarOpen,setSidebarOpen,storeStatus,storeOpen,loadingStoreStatus,changingStoreStatus,loadStoreStatus,toggleStore:()=>update({is_open:!storeOpen,manual_override:true}),openStore:()=>update({is_open:true,manual_override:true}),closeStore:()=>update({is_open:false,manual_override:true}),enableAutomaticStoreStatus:()=>update({manual_override:false}),updateStoreSchedule:({openingTime,closingTime,closedMessage})=>update({opening_time:openingTime,closing_time:closingTime,closed_message:closedMessage,timezone:'America/Campo_Grande'})};
 return <Context.Provider value={value}>{children}</Context.Provider>;
}
export const useAdmin=()=>useContext(Context);
