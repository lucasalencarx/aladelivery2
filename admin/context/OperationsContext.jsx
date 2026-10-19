import {createContext,useCallback,useContext,useEffect,useRef,useState} from 'react';
import {supabase} from '../../supabase/supabase';
import {watchOrder} from '../../services/commerceApi';
const Context=createContext(null);
export function OperationsProvider({children}){
 const [data,setData]=useState({}),[error,setError]=useState(''),[loading,setLoading]=useState(true),busy=useRef(false),live=useRef(false);
 const refresh=useCallback(async()=>{if(busy.current)return;busy.current=true;try{const {data,error}=await supabase.rpc('shop_operations_snapshot');if(error)throw error;if(live.current){setData(data||{});setError('');}}catch(e){if(live.current)setError(e.message);}finally{busy.current=false;if(live.current)setLoading(false);}},[]);
 useEffect(()=>{live.current=true;refresh();const t=setInterval(refresh,5000),stop=watchOrder('/admin/notifications/stream',{admin:true,onChange:refresh});window.addEventListener('focus',refresh);window.addEventListener('admin-messages-read',refresh);return()=>{live.current=false;clearInterval(t);stop();window.removeEventListener('focus',refresh);window.removeEventListener('admin-messages-read',refresh);};},[refresh]);
 return <Context.Provider value={{data,error,loading,refresh}}>{children}</Context.Provider>;
}
export const useOperations=()=>useContext(Context);
