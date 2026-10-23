// Rotas do entregador: autorização sempre validada no servidor e nas ações SQL.
export function installCouriers(router,{db,run,safe,admin,publicOrder,trackingURL}){
 const courier=safe(async(req,res,next)=>{
  const token=String(req.headers.authorization||'').replace(/^Bearer /,'');
  const {data,error}=await db.auth.getUser(token);
  if(error||!data?.user)return res.status(401).json({message:'Entre na área do entregador.'});
  const c=await run(db.from('delivery_couriers').select('id,name,photo_path,active').eq('auth_user_id',data.user.id).eq('active',true).maybeSingle());
  if(!c)return res.status(403).json({message:'Acesso de entregador não cadastrado ou inativo. Fale com a loja.'});
  req.courier=c;req.courierAuth=data.user.id;next();
 });
 router.post('/admin/couriers/:id/account',admin,safe(async(req,res)=>{
  const email=String(req.body.email||'').trim(),password=String(req.body.password||'');
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||password.length<8||password.length>128)return res.status(422).json({message:'Informe um e-mail válido e senha de 8 a 128 caracteres.'});
  const c=await run(db.from('delivery_couriers').select('id,auth_user_id,active').eq('id',req.params.id).single());
  if(!c.active)return res.status(409).json({message:'Ative o cadastro do entregador primeiro.'});
  const result=c.auth_user_id?await db.auth.admin.updateUserById(c.auth_user_id,{email,password,email_confirm:true}):await db.auth.admin.createUser({email,password,email_confirm:true});
  if(result.error)throw Error('Não foi possível criar o acesso. Verifique se este e-mail já está cadastrado em outra conta.');
  await run(db.from('delivery_couriers').update({auth_user_id:result.data.user.id,login_email:email}).eq('id',c.id));
  res.json({success:true});
 }));
 router.get('/courier/me',courier,(req,res)=>res.json(req.courier));
 router.get('/courier/orders',courier,safe(async(req,res)=>{
  const list=await run(db.from('shop_orders').select('*').eq('courier_id',String(req.courier.id)).in('order_status',['confirmed','preparing','out_for_delivery']).order('created_at'));
  res.json({orders:(list||[]).filter(o=>o.payment_method!=='pix'||o.payment_status==='paid').map(o=>({...publicOrder(o),tracking_url:trackingURL(o,req)}))});
 }));
 for(const action of ['start','nearby','finish'])router.post('/courier/orders/:id/'+action,courier,safe(async(req,res)=>{
  if(!/^[0-9a-f-]{36}$/i.test(req.params.id))return res.status(422).json({message:'Pedido inválido.'});
  if(action==='finish'&&!/^\d{4}$/.test(String(req.body.code||'')))return res.status(422).json({message:'Digite os quatro últimos números do telefone do cliente.'});
  const result=await run(db.rpc('shop_courier_action',{p_id:req.params.id,p_auth:req.courierAuth,p_action:action,p_code:action==='finish'?String(req.body.code):null}));
  res.json({order:publicOrder(Array.isArray(result)?result[0]:result)});
 }));
 router.post('/courier/orders/:id/tracking-stop',courier,safe(async(req,res)=>{
  await run(db.rpc('shop_courier_tracking_stop',{p_id:req.params.id,p_auth:req.courierAuth}));
  res.json({success:true});
 }));
 router.post('/courier/orders/:id/position',courier,safe(async(req,res)=>{
  const {lat,lng,accuracy}=req.body;
  if(!Number.isFinite(lat)||!Number.isFinite(lng)||Math.abs(lat)>90||Math.abs(lng)>180||!Number.isFinite(accuracy)||accuracy<0)return res.status(422).json({message:'Localização inválida.'});
  const result=await run(db.rpc('shop_courier_position',{p_id:req.params.id,p_auth:req.courierAuth,p_lat:lat,p_lng:lng,p_accuracy:accuracy}));res.json({nearby:!!result});
 }));
 router.post('/admin/orders/:id/destination',admin,safe(async(req,res)=>{
  const {lat,lng}=req.body;if(!Number.isFinite(lat)||!Number.isFinite(lng)||Math.abs(lat)>90||Math.abs(lng)>180)return res.status(422).json({message:'Informe latitude e longitude válidas.'});
  await run(db.from('shop_orders').update({delivery_lat:lat,delivery_lng:lng}).eq('id',req.params.id));res.json({success:true});
 }));
}
