import {supabase} from '../../supabase/supabase';
import {secureUUID} from '../../utils/uuid';
async function unwrap(request){const {data,error}=await request;if(error)throw error;return data;}
export const loadStoreSettings=()=>unwrap(supabase.from('shop_store_settings').select('*').eq('id',1).single());
export async function saveStoreSettings(settings){const {id,updated_at,...values}=settings;await unwrap(supabase.from('shop_store_settings').update({...values,updated_at:new Date().toISOString()}).eq('id',1));window.dispatchEvent(new Event('store-settings-updated'));}
export async function uploadStoreMedia(file,name=file.name){
 if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>5*1024*1024)throw Error('Use JPG, PNG ou WebP de até 5 MB.');
 const ext={'image/jpeg':'jpg','image/png':'png','image/webp':'webp'}[file.type],path='library/'+secureUUID()+'.'+ext;
 await unwrap(supabase.storage.from('store-media').upload(path,file,{contentType:file.type,upsert:false}));
 const {data}=supabase.storage.from('store-media').getPublicUrl(path);
 try{return await unwrap(supabase.from('shop_media').insert({name:String(name||file.name).slice(0,150),storage_path:path,image_url:data.publicUrl}).select().single());}catch(e){await supabase.storage.from('store-media').remove([path]);throw e;}
}
