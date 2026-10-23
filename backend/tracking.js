// Leitura sempre autorizada pelo token privado do pedido ou pela sessão administrativa.
export function installTracking(router,{db,run,safe,access,admin}){
 const photos=new Map();
 async function photo(path){
  if(!path)return null;
  if(/^https?:\/\//i.test(path)||path.startsWith('/'))return path;
  const old=photos.get(path);if(old&&old.until>Date.now())return old.url;
  const {data,error}=await db.storage.from('admin-photos').createSignedUrl(path,3600);
  if(error)return null;
  if(photos.size>200)photos.clear();
  photos.set(path,{url:data.signedUrl,until:Date.now()+3000000});return data.signedUrl;
 }
 const respond=safe(async(req,res)=>{
  res.set('Cache-Control','private, no-store');
  const o=req.order||await run(db.from('shop_orders').select('*').eq('id',req.params.id).single());
  const active=o.order_status==='out_for_delivery';
  const c=o.courier_id&&active?await run(db.from('delivery_couriers').select('name,photo_path,vehicle,plate').eq('id',o.courier_id).eq('active',true).maybeSingle()):null;
  res.json({status:o.order_status,active:active&&!!c,courier:c?{name:c.name,vehicle:c.vehicle,plate:c.plate,photo_url:await photo(c.photo_path)}:null,
   position:active&&c&&Number.isFinite(o.courier_lat)&&Number.isFinite(o.courier_lng)&&o.courier_location_at?{lat:o.courier_lat,lng:o.courier_lng,accuracy:o.courier_accuracy??null,updated_at:o.courier_location_at}:null,
   destination:active&&Number.isFinite(o.delivery_lat)&&Number.isFinite(o.delivery_lng)?{lat:o.delivery_lat,lng:o.delivery_lng}:null});
 });
 router.get('/orders/:id/tracking',access,respond);
 router.get('/admin/orders/:id/live-tracking',admin,respond);
}
