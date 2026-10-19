import {createClient} from '@supabase/supabase-js';
export const courierAuth=createClient(import.meta.env.VITE_SUPABASE_URL,import.meta.env.VITE_SUPABASE_ANON_KEY,{auth:{storageKey:'ala-courier-auth',persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});
