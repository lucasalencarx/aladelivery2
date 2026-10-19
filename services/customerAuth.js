import {createClient} from '@supabase/supabase-js';
// Sessão independente: verificar o cliente não encerra o login do admin.
export const customerAuth=createClient(import.meta.env.VITE_SUPABASE_URL,import.meta.env.VITE_SUPABASE_ANON_KEY,{auth:{storageKey:'ala-customer-auth',persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});
export function nationalPhone(v){let p=String(v||'').replace(/\D/g,'');if(p.startsWith('55')&&p.length>11)p=p.slice(2);return p;}
export function customerE164(v){const p=nationalPhone(v);if(!/^\d{10,11}$/.test(p))throw Error('Informe o telefone com DDD.');return '+55'+p;}
