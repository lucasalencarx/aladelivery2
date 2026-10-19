import {secureUUID} from '../../utils/uuid';
import {commerce} from '../../services/commerceApi';
import { supabase } from '../../supabase/supabase';

async function unwrap(request) {
  const { data, error } = await request;
  if (error) throw error;
  return data;
}
export const listRows = (table) => unwrap(supabase.from(table).select('*').order('created_at', { ascending: false }));
export const saveRow = (table, id, values) => unwrap((id ? supabase.from(table).update(values).eq('id', id) : supabase.from(table).insert(values)).select().single());
export const deleteRow = (table, id) => unwrap(supabase.from(table).delete().eq('id', id));
export const getClients = async () => (await unwrap(supabase.from('clients').select('id,name,phone,email,profile_image,admin_photo_path,active,created_at').order('name'))).map(c=>({...c,profile_image:c.admin_photo_path??c.profile_image}));
export const getClientOrders = (clientId) => unwrap(supabase.from('orders').select('id,protocol,total_amount,payment_status,order_status,created_at').eq('client_id', clientId).order('created_at', {ascending:false}));
export const getClientSummary = () => unwrap(supabase.rpc('admin_client_summary'));
export const getImageCatalog = async () => {const results=await Promise.allSettled([unwrap(supabase.from('imported_product_catalog').select('*').order('name')),unwrap(supabase.from('shop_media').select('*').order('created_at',{ascending:false}))]);if(results.every(r=>r.status==='rejected'))throw results[1].reason;return [...(results[1].status==='fulfilled'?results[1].value.map(p=>({...p,source_id:p.id,category_name:'Enviadas pela loja',source_price:0})):[]),...(results[0].status==='fulfilled'?results[0].value:[])];};
export const setProductImage = (id, image_url) => saveRow('products', id, {image_url});
export const publishReview = (id, status, response) => saveRow('customer_reviews', id, {status,admin_response:response?.trim()||null});

// Fotos novas de clientes/entregadores: ficam no Storage, não em um link de terceiros.
export async function uploadProfilePhoto(file) {
  if (!['image/jpeg','image/png','image/webp'].includes(file.type) || file.size > 3*1024*1024) throw new Error('Use JPG, PNG ou WebP de até 3 MB.');
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error('Entre com sua conta administrativa para enviar uma foto.');
  const ext = {'image/jpeg':'jpg','image/png':'png','image/webp':'webp'}[file.type];
  const path = `${data.user.id}/${secureUUID()}.${ext}`;
  await unwrap(supabase.storage.from('admin-photos').upload(path, file, {contentType:file.type,upsert:false}));
  return path;
}
export async function signedProfilePhoto(path) {
  if (!path) return null;
  if (/^https?:\/\//i.test(path) || path.startsWith('/')) return path;
  const data = await unwrap(supabase.storage.from('admin-photos').createSignedUrl(path, 3600));
  return data.signedUrl;
}

export const getLegacyOrders = () => unwrap(supabase.from('orders').select('*').order('created_at',{ascending:false}).limit(200));
export const getOrders=()=>commerce('/admin/orders',{admin:true});
export const getDashboardStats=()=>commerce('/admin/stats',{admin:true});

export const getDashboardSnapshot=()=>unwrap(supabase.rpc('admin_dashboard_snapshot'));
