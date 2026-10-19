import { supabase } from '../supabase/supabase';
export async function loadPublicCatalog(){
 const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),12000);
 let result;try{const request=supabase.rpc('storefront_catalog');result=await (typeof request.abortSignal==='function'?request.abortSignal(controller.signal):request);}finally{clearTimeout(timeout);}
 const {data,error}=result;
 if(error)throw error;
 if(!data||!Array.isArray(data.sections))throw new Error('Resposta do catálogo inválida.');
 const sections=data.sections.map(s=>({...s,products:(s.products||[]).filter(p=>p.active!==false)}));
 const products=[...new Map([...(data.products||[]).filter(p=>p.active!==false),...sections.flatMap(s=>s.products)].map(p=>[String(p.id),p])).values()];
 return {...data,sections,products};
}
export function catalogError(error){
 if(['PGRST202','42883'].includes(error?.code))return 'O catálogo ainda precisa ser configurado. Tente novamente mais tarde.';
 return 'Não foi possível carregar os produtos agora. Tente novamente.';
}
