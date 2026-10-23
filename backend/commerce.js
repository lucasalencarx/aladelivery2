import {installCustomerAccounts} from './customerAccounts.js';
import {installTracking} from './tracking.js';
import {installCouriers} from './couriers.js';
import { Router } from 'express';
import {startReconciliation} from './reconciliation.js';
import { createClient } from '@supabase/supabase-js';
export const labels={pending:'Aguardando pagamento',confirmed:'Confirmado',preparing:'Em preparação',out_for_delivery:'Saiu para entrega',delivered:'Entregue',cancelled:'Cancelado'};
const uuid=v=>/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v||'');
export function commerceRouter(){
 const router=Router();
 const db=createClient(process.env.SUPABASE_URL||process.env.VITE_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
 const run=async q=>{const {data,error}=await q;if(error)throw error;return data;};
 const safe=fn=>(req,res,next)=>Promise.resolve(fn(req,res,next)).catch(next);
 // Limite em memória por IP: em múltiplas instâncias, usar proxy/limite distribuído.
 const rates=new Map();router.use((req,res,next)=>{const key=req.ip;const now=Date.now();let v=rates.get(key);if(!v||v.until<now){v={until:now+60000,count:0};rates.set(key,v);}if(++v.count>180)return res.status(429).json({message:'Aguarde um minuto e tente novamente.'});if(rates.size>10000)for(const [k,v] of rates)if(v.until<now)rates.delete(k);next();});
 const admin=safe(async(req,res,next)=>{const token=(req.headers.authorization||'').replace(/^Bearer /,'');const {data,error}=await db.auth.getUser(token);if(error||!data.user)return res.status(401).json({message:'Entre no painel.'});const scoped=createClient(process.env.SUPABASE_URL||process.env.VITE_SUPABASE_URL,process.env.VITE_SUPABASE_ANON_KEY||process.env.SUPABASE_ANON_KEY,{global:{headers:{Authorization:`Bearer ${token}`}},auth:{persistSession:false}});const {data:allowed,error:e}=await scoped.rpc('admin_has_access');if(e||!allowed)return res.status(403).json({message:'Acesso administrativo necessário.'});next();});
 const access=safe(async(req,res,next)=>{const token=req.headers['x-order-token'];if(!uuid(req.params.id)||!uuid(token))return res.status(404).json({message:'Pedido não encontrado. Use o link privado recebido após a compra.'});req.order=await run(db.from('shop_orders').select('*').eq('id',req.params.id).eq('access_token',token).maybeSingle());if(!req.order)return res.status(404).json({message:'Pedido não encontrado.'});next();});
 async function verifiedPhone(req,required=false){
  const bearer=(req.headers.authorization||'').replace(/^Bearer /,'');
  if(!bearer){if(required)throw Error('Confirme seu telefone para consultar seus pedidos.');return null;}
  const {data,error}=await db.auth.getUser(bearer);const u=data?.user;
  if(error||!u?.phone_confirmed_at||!u.phone||u.is_anonymous){if(required)throw Error('Sessão inválida. Confirme seu telefone novamente.');return null;}
  let phone=u.phone.replace(/\D/g,'');if(phone.startsWith('55')&&phone.length>11)phone=phone.slice(2);
  if(!/^\d{10,11}$/.test(phone)){if(required)throw Error('Utilize um telefone brasileiro com DDD.');return null;}return phone;
 }
 const customer=safe(async(req,res,next)=>{try{req.customerPhone=await verifiedPhone(req,true);next();}catch(e){res.status(401).json({message:e.message});}});
 const publicOrder=o=>{const {access_token,request_key,customer_document,pix_data,courier_lat,courier_lng,courier_accuracy,courier_location_at,...rest}=o;return {...rest,has_saved_document:/^\d{11}$/.test(customer_document||'')};};

 function trackingURL(o,req){
  const configured=process.env.PUBLIC_STOREFRONT_URL||process.env.FRONTEND_URL||'http://localhost:5173';
  const base=new URL(configured);if(!['https:','http:'].includes(base.protocol))throw Error('URL pública da loja inválida.');
  return new URL('/rastrear?pedido='+encodeURIComponent(o.protocol||'')+'#id='+encodeURIComponent(o.id)+'&token='+encodeURIComponent(o.access_token),base).href;
 }
 installCustomerAccounts(router,{db,run,safe});
 router.get('/admin/financial-report',admin,safe(async(req,res)=>res.json(await run(db.rpc('shop_financial_report',{p_start:req.query.start,p_end:req.query.end,p_grain:req.query.grain||'day'})))));
 installCouriers(router,{db,run,safe,admin,publicOrder,trackingURL});
 installTracking(router,{db,run,safe,access,admin});
 router.get('/admin/orders/:id/tracking',admin,safe(async(req,res)=>{const o=await run(db.from('shop_orders').select('id,protocol,access_token').eq('id',req.params.id).single());res.json({tracking_url:trackingURL(o,req)});}));
 async function gateway(path,options={}){if(!process.env.PAGARME_SECRET_KEY)throw Error('Configure PAGARME_SECRET_KEY no servidor.');const response=await fetch(`https://api.pagar.me/core/v5${path}`,{...options,signal:AbortSignal.timeout(20000),headers:{Authorization:`Basic ${Buffer.from(process.env.PAGARME_SECRET_KEY+':').toString('base64')}`,'Content-Type':'application/json',...options.headers}});const data=await response.json();if(!response.ok){console.error('Pagar.me HTTP',response.status);throw Error('O Pagar.me não concluiu a operação. Tente novamente ou contate a loja.');}return data;}
 const refreshing=new Map();
 function refresh(o){
  if(refreshing.has(o.id))return refreshing.get(o.id);
  const work=refreshPayment(o).finally(()=>refreshing.delete(o.id));refreshing.set(o.id,work);return work;
 }
 async function refreshPayment(o){
  if(o.payment_method!=='pix'||!o.pagarme_order_id)return o;
  if(o.payment_status==='paid'){
   if(o.order_status==='pending')return await confirmPix(o);
   return o;
  }
  const g=await gateway(`/orders/${encodeURIComponent(o.pagarme_order_id)}`);
  if(g.id!==o.pagarme_order_id)throw Error('Resposta do gateway não corresponde ao pedido.');
  if(g.status==='paid'&&Number.isSafeInteger(g.amount)&&g.amount===Math.round(Number(o.total_amount)*100))return await confirmPix(o,g.amount);
  if(g.status==='paid')throw Error('Valor pago diverge do pedido. Revise no Pagar.me.');
  const expiry=o.pix_data?.expires_at?Date.parse(o.pix_data.expires_at):Date.parse(o.created_at)+15*60000;
  if(o.order_status==='pending'&&Number.isFinite(expiry)&&Date.now()>expiry+120000){
   const result=await run(db.rpc('shop_expire_pix',{p_id:o.id}));return Array.isArray(result)?result[0]:result;
  }
  return o;
 }
 async function confirmPix(o,amount=Math.round(Number(o.total_amount)*100)){
  const result=await run(db.rpc('shop_confirm_pix',{p_id:o.id,p_gateway_order_id:o.pagarme_order_id,p_amount:amount}));
  return Array.isArray(result)?result[0]:result;
 }
 if(process.env.NODE_ENV!=='test')startReconciliation({
  loadBatch:async()=>await run(db.from('shop_orders').select('*').eq('payment_method','pix').eq('order_status','pending').in('payment_status',['pending','paid']).order('payment_checked_at',{ascending:true,nullsFirst:true}).limit(25))||[],
  check:async o=>{
   await run(db.from('shop_orders').update({payment_checked_at:new Date().toISOString()}).eq('id',o.id));
   if(o.pagarme_order_id)await refresh(o);
   else if(Date.now()-Date.parse(o.created_at)>17*60000)await run(db.rpc('shop_expire_pix',{p_id:o.id}));
  },
  onError:e=>console.error('Reconciliação Pix:',e.code||e.name)
 });

 async function savedPixDocument(req,phone,reference){
  if(reference&&uuid(reference.id)&&uuid(reference.token)){
   const source=await run(db.from('shop_orders').select('customer_phone,customer_document').eq('id',reference.id).eq('access_token',reference.token).maybeSingle());
   if(source?.customer_phone===phone&&/^\d{11}$/.test(source.customer_document||''))return source.customer_document;
  }
  if(await verifiedPhone(req)===phone){
   const source=await run(db.from('shop_orders').select('customer_document').eq('customer_phone',phone).not('customer_document','is',null).order('created_at',{ascending:false}).limit(1).maybeSingle());
   if(/^\d{11}$/.test(source?.customer_document||''))return source.customer_document;
  }
  return null;
 }
 router.post('/checkout/pix-document',safe(async(req,res)=>{
  const phone=String(req.body.phone||'');if(!/^\d{10,11}$/.test(phone))return res.status(422).json({message:'Telefone inválido.'});
  res.json({available:!!await savedPixDocument(req,phone,req.body.reference)});
 }));
 router.post('/visits',safe(async(req,res)=>{if(!uuid(req.body.visitor_id))return res.status(422).json({message:'Visita inválida.'});await run(db.rpc('shop_record_visit',{p_visitor:req.body.visitor_id}));res.json({success:true});}));
 router.post('/orders/:id/review',access,safe(async(req,res)=>{
  if(req.order.order_status!=='delivered')return res.status(409).json({message:'Avalie após receber a entrega.'});
  const {rating,comment=''}=req.body;if(!Number.isInteger(rating)||rating<1||rating>5||typeof comment!=='string'||comment.length>2000)return res.status(422).json({message:'Informe de 1 a 5 estrelas e um comentário de até 2.000 caracteres.'});
  await run(db.from('shop_order_reviews').upsert({order_id:req.order.id,rating,comment:comment.trim()},{onConflict:'order_id'}));res.json({success:true});
 }));
 router.get('/orders/:id/review',access,safe(async(req,res)=>res.json({review:await run(db.from('shop_order_reviews').select('rating,comment').eq('order_id',req.order.id).maybeSingle())})));
 router.get('/admin/reviews',admin,safe(async(req,res)=>res.json(await run(db.from('shop_order_reviews').select('*,shop_orders(protocol,customer_name)').order('created_at',{ascending:false}).limit(200)))));
 router.post('/admin/reviews/:id/reply',admin,safe(async(req,res)=>{const body=req.body.response;if(!uuid(req.params.id)||typeof body!=='string'||body.length>1000)return res.status(422).json({message:'Resposta inválida.'});await run(db.from('shop_order_reviews').update({admin_response:body.trim()}).eq('id',req.params.id));res.json({success:true});}));
 router.post('/admin/orders/:id/read',admin,safe(async(req,res)=>{if(!uuid(req.params.id)||!Number.isSafeInteger(req.body.until)||req.body.until<0)return res.status(422).json({message:'Leitura inválida.'});await run(db.rpc('shop_mark_messages_read',{p_id:req.params.id,p_until:req.body.until}));res.json({success:true});}));
 router.get('/zones',safe(async(req,res)=>res.json(await run(db.from('delivery_zones').select('id,city,neighborhood,fee,eta_minutes').eq('active',true).order('city').order('neighborhood')))));
 router.post('/coupon',safe(async(req,res)=>{const c=await run(db.from('discount_coupons').select('*').eq('code',String(req.body.code||'').trim().toUpperCase()).maybeSingle());if(c?.customer_phone&&c.customer_phone!==await verifiedPhone(req))return res.status(403).json({message:'Confirme seu telefone para usar seu cupom pessoal.'});const sub=Number(req.body.subtotal),now=Date.now();if(!c||!c.active||!Number.isFinite(sub)||sub<Number(c.min_order||0)||(c.starts_at&&Date.parse(c.starts_at)>now)||(c.ends_at&&Date.parse(c.ends_at)<now)||(c.usage_limit!=null&&Number(c.used_count||0)>=c.usage_limit))return res.status(422).json({message:'Cupom inválido, expirado ou pedido abaixo do mínimo.'});res.json({code:c.code,type:c.discount_type,value:Number(c.discount_value),max_discount:c.max_discount==null?null:Number(c.max_discount),label:c.discount_type==='percentage'?`${c.discount_value}% de desconto`:`R$ ${c.discount_value} de desconto`});}));
 router.post('/orders',safe(async(req,res)=>{const p={...req.body};if(!uuid(p.request_key)||!uuid(p.access_token)||!Array.isArray(p.items)||!Number.isFinite(p.expected_total))return res.status(422).json({message:'Pedido inválido.'});if(typeof p.customer_name!=='string'||!p.customer_name.trim()||typeof p.customer_phone!=='string'||!/^\d{10,11}$/.test(p.customer_phone)||!p.address||['street','number','city','neighborhood'].some(key=>typeof p.address[key]!=='string'||!p.address[key].trim())||!['pix','cartao','dinheiro'].includes(p.payment_method)||p.items.some(i=>!i||!i.id||!Number.isInteger(i.quantity)||i.quantity<1))return res.status(422).json({message:'Confira cliente, endereço e itens.'});if(!p.customer_document)p.customer_document=await savedPixDocument(req,p.customer_phone,p.pix_reference);delete p.pix_reference;const result=await run(db.rpc('shop_create_order_checked',{p,p_verified_phone:await verifiedPhone(req)}));const o=Array.isArray(result)?result[0]:result;if(!o?.id)throw Error('O banco não retornou o pedido.');if(o.order_status==='cancelled')return res.status(409).json({message:'O pedido anterior foi cancelado. Tente finalizar novamente.',code:'ORDER_CLOSED'});try{const bearer=String(req.headers.authorization||'').replace(/^Bearer /,'');if(bearer){const {data}=await db.auth.getUser(bearer);if(data?.user?.id&&data.user.email_confirmed_at&&!data.user.is_anonymous)await run(db.rpc('shop_link_customer_order',{p_user:data.user.id,p_order:o.id,p_token:p.access_token}));}}catch{/* A compra continua; Meus pedidos permite proteger este link depois. */}res.json({...publicOrder(o),access_token:p.access_token});}));
 router.post(['/orders/:id/pix','/pagarme/create-pix'],(req,res,next)=>{if(!req.params.id)req.params.id=req.body.local_order_id||req.body.metadata?.local_order_id;if(!req.body.document)req.body.document=req.body.customer?.document;next();},access,safe(async(req,res)=>{const o=req.order;if(o.order_status==='cancelled'||o.payment_method!=='pix')return res.status(409).json({message:'Pedido não permite Pix.'});if(o.pix_data){if(o.pix_data.expires_at&&Date.parse(o.pix_data.expires_at)<=Date.now())return res.status(409).json({message:'Este Pix venceu. Peça à loja para revisar/cancelar este pedido antes de refazer a compra.'});return res.json(o.pix_data);}const document=String(req.body.document||o.customer_document||'').replace(/\D/g,'');if(document.length!==11)return res.status(422).json({message:'Informe o CPF para o Pix.',code:'CPF_REQUIRED'});const phone=o.customer_phone;const a=o.address;if(!a||['street','number','city','neighborhood'].some(key=>!String(a[key]||'').trim()))return res.status(422).json({message:'Este pedido está sem endereço completo. Fale com a loja para revisar a entrega antes de gerar o Pix.',code:'ADDRESS_REQUIRED'});
 const g=await gateway('/orders',{method:'POST',headers:{'Idempotency-Key':o.id},body:JSON.stringify({code:o.protocol,closed:true,items:[{amount:Math.round(Number(o.total_amount)*100),description:`Pedido ${o.protocol} (itens e entrega)`,quantity:1,code:o.id}],customer:{name:o.customer_name,email:process.env.PAGARME_CUSTOMER_EMAIL||'email@aladelivery.com.br',type:'individual',document,document_type:'CPF',phones:{mobile_phone:{country_code:'55',area_code:phone.slice(0,2),number:phone.slice(2)}},...(/^\d{8}$/.test(String(a.cep||'').replace(/\D/g,''))?{address:{country:'BR',state:'MS',city:a.city,zip_code:String(a.cep).replace(/\D/g,''),line_1:`${a.number}, ${a.street}, ${a.neighborhood}`,line_2:a.complement||''}}:{})},payments:[{payment_method:'pix',pix:{expires_in:600}}],metadata:{local_order_id:o.id}})});
 const charge=g.charges?.[0],t=charge?.last_transaction;const pix={success:true,order_id:g.id,order_code:o.protocol,charge_id:charge?.id,transaction_id:t?.id,status:t?.status||g.status,amount:g.amount,qr_code:t?.qr_code,qr_code_url:t?.qr_code_url,expires_at:t?.expires_at};
 // Mesmo sem QR, guardar vínculo para reconciliação; repetição usa a mesma chave.
 await run(db.from('shop_orders').update({customer_document:document,pagarme_order_id:g.id,...(pix.qr_code?{pix_data:pix}:{})}).eq('id',o.id));if(!pix.qr_code)return res.status(502).json({message:'Pix sem QR Code. Contate a loja com o protocolo.'});res.json(pix);
 }));
 function stream(req,res){
  res.set({'Content-Type':'text/event-stream','Cache-Control':'no-cache, no-transform','Connection':'keep-alive','X-Accel-Buffering':'no'});res.flushHeaders();res.write('data: ready\n\n');
  const channel=db.channel('order-stream-'+req.params.id+'-'+crypto.randomUUID());
  for(const table of ['shop_orders','shop_messages','shop_order_events'])channel.on('postgres_changes',{event:'*',schema:'public',table,filter:table==='shop_orders'?`id=eq.${req.params.id}`:`order_id=eq.${req.params.id}`},()=>res.write('data: changed\n\n'));
  channel.subscribe();const heartbeat=setInterval(()=>res.write(': ping\n\n'),20000);const ttl=setTimeout(()=>res.end(),25*60000);
  res.on('close',()=>{clearInterval(heartbeat);clearTimeout(ttl);db.removeChannel(channel);});
 }
 router.get('/orders/:id/stream',access,stream);
 router.get('/admin/orders/:id/stream',admin,stream);
 router.get('/orders/:id',access,safe(async(req,res)=>{let o=req.order;if(req.query.summary==='1')return res.json({order:publicOrder(o)});try{o=await refresh(o);}catch{ /* O acompanhamento continua disponível se o gateway cair. */ }const [events,messages]=await Promise.all([run(db.from('shop_order_events').select('*').eq('order_id',o.id).order('id')),run(db.from('shop_messages').select('*').eq('order_id',o.id).order('id',{ascending:false}).limit(500))]);const payment=o.payment_method==='pix'&&o.payment_status==='pending'&&o.order_status==='pending'&&o.pix_data?{...o.pix_data,expired:!!o.pix_data.expires_at&&Date.parse(o.pix_data.expires_at)<=Date.now()}:null;res.json({order:publicOrder(o),payment,events,messages:messages.reverse()});}));
 router.get(['/orders/:id/pix-status','/pagarme/pix-status/:orderId'],safe(async(req,res,next)=>{if(req.params.orderId){const token=req.headers['x-order-token'];if(!uuid(token))return res.status(404).json({message:'Pedido não encontrado.'});const order=await run(db.from('shop_orders').select('id').eq('pagarme_order_id',req.params.orderId).eq('access_token',token).maybeSingle());if(!order)return res.status(404).json({message:'Pedido não encontrado.'});req.params.id=order.id;}next();}),access,safe(async(req,res)=>{const o=await refresh(req.order);res.json({success:true,paid:o.payment_status==='paid',status:o.payment_status==='pending'?'waiting_payment':o.payment_status,order_id:o.pagarme_order_id});}));
 router.post('/orders/:id/messages',access,safe(async(req,res)=>{if(['cancelled','delivered'].includes(req.order.order_status)&&Date.now()-Date.parse(req.order.updated_at)>7*86400000)return res.status(409).json({message:'Atendimento deste pedido encerrado.'});await send(req.params.id,'customer',req.body.body);res.json({success:true});}));
 async function send(id,sender,body){if(typeof body!=='string'||!body.trim()||body.length>2000)throw Error('Escreva uma mensagem de até 2.000 caracteres.');await run(db.from('shop_messages').insert({order_id:id,sender,body:body.trim()}));}
 router.get('/admin/stats',admin,safe(async(req,res)=>{
 const old=await run(db.rpc('admin_dashboard_stats'))||{};
 const metrics=await run(db.rpc('shop_dashboard_stats'));
 res.json({...old,orders_today:Number(old.orders_today||0)+Number(metrics.orders_today||0),orders_total:Number(old.orders_total||0)+Number(metrics.orders_total||0),revenue_today:Number(old.revenue_today||0)+Number(metrics.revenue_today||0),revenue_total:Number(old.revenue_total||0)+Number(metrics.revenue_total||0)});
 }));
 router.get('/admin/orders',admin,safe(async(req,res)=>res.json(await run(db.rpc('shop_list_orders',{p_period:req.query.period||'today',p_bucket:req.query.bucket||'ready',p_page:Number(req.query.page)||1,p_query:String(req.query.q||'').slice(0,100),p_status:req.query.status||'all',p_phone:null})))));
 router.get('/customer/checkout-profile',customer,safe(async(req,res)=>{
  if(req.query.phone!==req.customerPhone)return res.status(403).json({message:'Confirme o telefone informado no checkout.'});
  const history=await run(db.rpc('shop_customer_history',{p_phone:req.customerPhone,p_period:'all',p_page:1}));
  const o=history?.orders?.find(o=>o.order_status!=='cancelled'&&o.customer_name);
  if(!o)return res.json({profile:null});
  const address={state:'MS'};for(const key of ['cep','street','number','complement','neighborhood','city','reference'])address[key]=String(o.address?.[key]??(key==='cep'?o.address?.zip_code:'')??'');
  res.json({profile:{name:o.customer_name,phone:req.customerPhone,address}});
 }));
 router.get('/customer/orders',customer,safe(async(req,res)=>res.json(await run(db.rpc('shop_customer_history',{p_period:req.query.period||'1m',p_page:Number(req.query.page)||1,p_phone:req.customerPhone})))));
 router.get('/customer/loyalty',customer,safe(async(req,res)=>res.json(await run(db.rpc('shop_loyalty_offer',{p_phone:req.customerPhone,p_force:false})))));
 router.get('/admin/loyalty',admin,safe(async(req,res)=>{const [ranking,settings]=await Promise.all([run(db.rpc('shop_top_customers',{p_period:req.query.period||'1y'})),run(db.from('shop_loyalty_settings').select('*').eq('id',1).single())]);res.json({ranking,settings});}));
 router.post('/admin/loyalty/settings',admin,safe(async(req,res)=>{const b=req.body;res.json(await run(db.from('shop_loyalty_settings').update({active:b.active===true,min_orders:Number(b.min_orders),discount_percent:Number(b.discount_percent),max_discount:Number(b.max_discount),min_order:Number(b.min_order),valid_days:Number(b.valid_days)}).eq('id',1).select().single()));}));
 router.post('/admin/loyalty/grant',admin,safe(async(req,res)=>res.json(await run(db.rpc('shop_loyalty_offer',{p_phone:String(req.body.phone||''),p_force:true})))));

 router.get('/admin/notifications',admin,safe(async(req,res)=>{
  const alerts=await run(db.from('shop_order_alerts').select('id,order_id,created_at').is('acknowledged_at',null).order('id').limit(50));
  const orders=alerts?.length?await run(db.from('shop_orders').select('*').in('id',alerts.map(a=>a.order_id))):[];
  res.json({alerts:(alerts||[]).map(a=>({...a,order:orders.find(o=>o.id===a.order_id)})).filter(a=>a.order&&!['cancelled','delivered'].includes(a.order.order_status)&&(a.order.payment_method!=='pix'||a.order.payment_status==='paid')).map(a=>({...a,order:publicOrder(a.order)}))});
 }));
 router.post('/admin/notifications/:id/ack',admin,safe(async(req,res)=>{
  if(!/^[0-9]+$/.test(req.params.id))return res.status(400).json({message:'Aviso inválido.'});
  await run(db.from('shop_order_alerts').update({acknowledged_at:new Date().toISOString()}).eq('id',req.params.id).is('acknowledged_at',null));res.json({success:true});
 }));
 router.get('/admin/notifications/stream',admin,(req,res)=>{
  res.set({'Content-Type':'text/event-stream','Cache-Control':'no-cache, no-transform','Connection':'keep-alive','X-Accel-Buffering':'no'});res.flushHeaders();res.write('data: ready\n\n');
  const channel=db.channel('admin-alerts-'+crypto.randomUUID()).on('postgres_changes',{event:'*',schema:'public',table:'shop_order_alerts'},()=>res.write('data: changed\n\n')).on('postgres_changes',{event:'INSERT',schema:'public',table:'shop_messages'},()=>res.write('data: changed\n\n')).subscribe();
  const heartbeat=setInterval(()=>res.write(': ping\n\n'),20000),ttl=setTimeout(()=>res.end(),25*60000);
  res.on('close',()=>{clearInterval(heartbeat);clearTimeout(ttl);db.removeChannel(channel);});
 });
 router.get('/admin/orders/:id',admin,safe(async(req,res)=>{const o=await run(db.from('shop_orders').select('*').eq('id',req.params.id).single());const [messages,events]=await Promise.all([run(db.from('shop_messages').select('*').eq('order_id',o.id).order('id',{ascending:false}).limit(500)),run(db.from('shop_order_events').select('*').eq('order_id',o.id).order('id'))]);res.json({order:{...publicOrder(o),tracking_url:trackingURL(o,req)},messages:messages.reverse(),events});}));
 router.post('/admin/orders/:id/messages',admin,safe(async(req,res)=>{await send(req.params.id,'store',req.body.body);res.json({success:true});}));
 router.post('/admin/orders/:id/collect',admin,safe(async(req,res)=>{const o=await run(db.from('shop_orders').select('*').eq('id',req.params.id).single());if(o.payment_method==='pix'||o.order_status!=='delivered')return res.status(409).json({message:'Confirme o recebimento somente após a entrega. Pix é confirmado pelo gateway.'});await run(db.from('shop_orders').update({payment_status:'paid',paid_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq('id',o.id));res.json({success:true});}));
 router.post('/admin/orders/:id/status',admin,safe(async(req,res)=>{const {status,courier_id}=req.body;if(!labels[status])throw Error('Status inválido');if(courier_id){const c=await run(db.from('delivery_couriers').select('id,active').eq('id',courier_id).single());if(!c.active)throw Error('Entregador inativo');}await run(db.rpc('shop_transition',{p_id:req.params.id,p_status:status,p_description:labels[status]}));if(courier_id!==undefined)await run(db.from('shop_orders').update({courier_id:courier_id||null}).eq('id',req.params.id));res.json({success:true});}));
 // Webhook é apenas um sinal. A confirmação vem de GET autenticado no gateway.
 router.post('/pagarme/webhook',safe(async(req,res)=>{
  const type=req.body?.type;
  if(!['order.paid','order.updated','charge.paid'].includes(type))return res.json({received:true,ignored:true});
  const id=type.startsWith('order.')?req.body?.data?.id:req.body?.data?.order?.id;
  if(typeof id!=='string'||!/^or_[a-zA-Z0-9]+$/.test(id))return res.status(400).json({message:'Identificador de pedido inválido.'});
  const o=await run(db.from('shop_orders').select('*').eq('pagarme_order_id',id).maybeSingle());
  // Unknown binding may be a race with Pix creation: ask the gateway to retry.
  if(!o)return res.status(503).json({message:'Vínculo ainda indisponível. Reenvie o evento.'});
  try{await refresh(o);}catch{return res.status(503).json({message:'Gateway indisponível. Reenvie o evento.'});}
  res.json({received:true});
 }));

 router.use((err,req,res,next)=>{console.error('Commerce:',err.code||err.name);res.status(err.code==='23505'?409:400).json({message:err.message?.includes('fetch')?'Serviço temporariamente indisponível.':err.message||'Não foi possível concluir.'});});
 return router;
}
