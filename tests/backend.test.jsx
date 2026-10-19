// @vitest-environment node
import {it,expect,vi,beforeEach,afterEach} from 'vitest';
const state=vi.hoisted(()=>({order:null,rpcCalls:[],history:[]}));
vi.mock('@supabase/supabase-js',()=>({createClient:()=>({
 auth:{getUser:async token=>({data:{user:token==='verified-customer'?{phone:'5567999999999',phone_confirmed_at:new Date().toISOString()}:token==='unconfirmed-customer'?{phone:'5567999999999'}:null},error:null})},
 from(table){let filters={},updates;const q={select(){return q;},order(){return q;},limit(){return q;},not(){return q;},eq(k,v){filters[k]=v;return q;},neq(){return q;},update(v){updates=v;return q;},upsert(v){updates=v;return q;},maybeSingle(){return execute();},single(){return execute();},then(resolve,reject){return execute().then(resolve,reject);}};
 async function execute(){if(table==='shop_orders'){const row=state.order;if(!row||(filters.id&&filters.id!==row.id)||(filters.access_token&&filters.access_token!==row.access_token)||(filters.pagarme_order_id&&filters.pagarme_order_id!==row.pagarme_order_id))return {data:null,error:null};if(updates)Object.assign(row,updates);return {data:{...row},error:null};}return {data:[],error:null};}return q;},
 rpc:async(name,p)=>{state.rpcCalls.push({name,p});if(name==='shop_create_order_checked')return {data:{...state.order,id:'44444444-4444-4444-8444-444444444444',access_token:p.p.access_token,customer_document:p.p.customer_document},error:null};if(name==='shop_customer_history')return {data:{orders:state.history,total:state.history.length},error:null};if(name==='shop_loyalty_offer')return {data:{available:false,paid_orders:0},error:null};if(name==='shop_expire_pix'){state.order.order_status='cancelled';return {data:{...state.order},error:null};}if(name==='shop_confirm_pix'){state.order.payment_status='paid';if(state.order.order_status==='pending')state.order.order_status='confirmed';return {data:{...state.order},error:null};}if(name==='shop_transition')state.order.order_status=p.p_status;return {data:null,error:null};}
})}));
import {createApp} from '../backend/server.js';
const realFetch=globalThis.fetch;let server,base,gatewayCalls;
beforeEach(async()=>{
 vi.stubEnv('SUPABASE_URL','https://example.supabase.co');vi.stubEnv('SUPABASE_ANON_KEY','fake-public');vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY','fake-service');vi.stubEnv('PAGARME_SECRET_KEY','fake-gateway');vi.stubEnv('FRONTEND_ORIGINS','');vi.stubEnv('FRONTEND_URL','http://10.0.0.103:5173');
 state.order={id:'11111111-1111-4111-8111-111111111111',access_token:'22222222-2222-4222-8222-222222222222',protocol:'ALA-TESTE',customer_name:'Cliente',customer_phone:'67999999999',payment_method:'pix',payment_status:'pending',order_status:'pending',total_amount:13,address:{street:'Rua',number:'1',neighborhood:'Centro',city:'Corumbá',state:'MS',cep:'79300000'}};
 gatewayCalls=[];state.rpcCalls=[];state.history=[];
 vi.stubGlobal('fetch',async(url,options)=>{if(String(url).startsWith('https://api.pagar.me/')){gatewayCalls.push({url,options});return new Response(JSON.stringify(options?.method==='POST'?{id:'or_test',amount:1300,status:'pending',charges:[{id:'ch_test',last_transaction:{id:'tx_test',status:'waiting_payment',qr_code:'pix-code',qr_code_url:'https://example.test/qr.png',expires_at:new Date(Date.now()+600000).toISOString()}}]}:{id:'or_test',amount:1300,status:'paid'}),{status:200,headers:{'Content-Type':'application/json'}});}return realFetch(url,options);});
 const app=createApp();server=app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));base='http://127.0.0.1:'+server.address().port;
});
afterEach(async()=>{await new Promise(resolve=>server.close(resolve));vi.unstubAllEnvs();vi.unstubAllGlobals();});
it('inicia mesmo sem service_role e explica a configuração que falta',async()=>{
 vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY','');const app=createApp(),s=app.listen(0,'127.0.0.1');await new Promise(resolve=>s.once('listening',resolve));try{const b='http://127.0.0.1:'+s.address().port;const h=await (await fetch(b+'/api/health')).json();expect(h.online).toBe(true);expect(h.missing).toContain('SUPABASE_SERVICE_ROLE_KEY');const r=await fetch(b+'/api/commerce/zones');expect(r.status).toBe(503);}finally{await new Promise(resolve=>s.close(resolve));}
});
it('gera QR pela rota Pagar.me conhecida, usa total do banco e confirma pagamento',async()=>{
 const r=await fetch(base+'/api/pagarme/create-pix',{method:'POST',headers:{'Content-Type':'application/json','X-Order-Token':state.order.access_token,Origin:'http://10.0.0.103:5173'},body:JSON.stringify({amount:1,customer:{document:'12345678909'},metadata:{local_order_id:state.order.id}})});
 expect(r.status).toBe(200);expect(r.headers.get('access-control-allow-origin')).toBe('http://10.0.0.103:5173');expect((await r.json()).qr_code).toBe('pix-code');
 const g=JSON.parse(gatewayCalls[0].options.body);expect(g.items[0].amount).toBe(1300);expect(gatewayCalls[0].options.headers['Idempotency-Key']).toBe(state.order.id);
 const status=await (await fetch(base+'/api/pagarme/pix-status/or_test',{headers:{'X-Order-Token':state.order.access_token}})).json();expect(status.paid).toBe(true);expect(state.order.order_status).toBe('confirmed');
});
it('não cria cobrança com token de outro pedido',async()=>{
 const r=await fetch(base+'/api/commerce/orders/'+state.order.id+'/pix',{method:'POST',headers:{'Content-Type':'application/json','X-Order-Token':'33333333-3333-4333-8333-333333333333'},body:JSON.stringify({document:'12345678909'})});expect(r.status).toBe(404);expect(gatewayCalls).toHaveLength(0);
});

it('histórico exige telefone confirmado e ignora telefone enviado na URL',async()=>{
 const denied=await fetch(base+'/api/commerce/customer/orders?phone=21988888888');expect(denied.status).toBe(401);
 const unconfirmed=await fetch(base+'/api/commerce/customer/orders',{headers:{Authorization:'Bearer unconfirmed-customer'}});expect(unconfirmed.status).toBe(401);
 const allowed=await fetch(base+'/api/commerce/customer/orders?period=1y&phone=21988888888',{headers:{Authorization:'Bearer verified-customer'}});expect(allowed.status).toBe(200);
 const call=state.rpcCalls.find(c=>c.name==='shop_customer_history');expect(call.p.p_phone).toBe('67999999999');expect(call.p.p_period).toBe('1y');
});

it('Pix vencido consulta gateway antes de cancelar a reserva',async()=>{
 state.order.pagarme_order_id='or_expired';state.order.pix_data={expires_at:new Date(Date.now()-300000).toISOString()};
 vi.stubGlobal('fetch',async(url,options)=>String(url).startsWith('https://api.pagar.me/')?new Response(JSON.stringify({id:'or_expired',amount:1300,status:'pending'}),{status:200,headers:{'Content-Type':'application/json'}}):realFetch(url,options));
 const r=await fetch(base+'/api/commerce/orders/'+state.order.id+'/pix-status',{headers:{'X-Order-Token':state.order.access_token}});expect(r.status).toBe(200);expect(state.order.order_status).toBe('cancelled');expect(state.rpcCalls.some(c=>c.name==='shop_expire_pix')).toBe(true);
});
it('QR salvo fica acessível somente com a credencial privada do pedido',async()=>{
 state.order.pix_data={qr_code:'pix-restaurado',expires_at:new Date(Date.now()+600000).toISOString()};
 const denied=await fetch(base+'/api/commerce/orders/'+state.order.id);expect(denied.status).toBe(404);
 const r=await fetch(base+'/api/commerce/orders/'+state.order.id,{headers:{'X-Order-Token':state.order.access_token}});const d=await r.json();expect(d.payment.qr_code).toBe('pix-restaurado');expect(d.order.access_token).toBeUndefined();
});

it('webhook confirma Pix sem nenhuma consulta do navegador e reenvio não duplica etapa',async()=>{
 state.order.pagarme_order_id='or_test';
 const hook=()=>fetch(base+'/api/commerce/pagarme/webhook',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({type:'order.paid',data:{id:'or_test',status:'paid'}})});
 expect((await hook()).status).toBe(200);expect(state.order.payment_status).toBe('paid');expect(state.order.order_status).toBe('confirmed');
 expect((await hook()).status).toBe(200);expect(state.rpcCalls.filter(c=>c.name==='shop_confirm_pix')).toHaveLength(1);
});
it('charge.paid também encontra o pedido e consulta o gateway',async()=>{
 state.order.pagarme_order_id='or_test';const r=await fetch(base+'/api/commerce/pagarme/webhook',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({type:'charge.paid',data:{id:'ch_test',order:{id:'or_test'}}})});expect(r.status).toBe(200);expect(state.order.payment_status).toBe('paid');expect(gatewayCalls).toHaveLength(1);
});
it('não confia no status recebido no webhook quando o gateway informa pendente',async()=>{
 state.order.pagarme_order_id='or_test';vi.stubGlobal('fetch',async(url,options)=>String(url).startsWith('https://api.pagar.me/')?new Response(JSON.stringify({id:'or_test',amount:1300,status:'pending'}),{status:200}):realFetch(url,options));
 await fetch(base+'/api/commerce/pagarme/webhook',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({type:'order.paid',data:{id:'or_test',status:'paid'}})});expect(state.order.payment_status).toBe('pending');expect(state.rpcCalls).toHaveLength(0);
});
it('valor divergente não confirma nem cancela o pedido e permite reenvio',async()=>{
 state.order.pagarme_order_id='or_test';state.order.pix_data={expires_at:new Date(Date.now()-600000).toISOString()};vi.stubGlobal('fetch',async(url,options)=>String(url).startsWith('https://api.pagar.me/')?new Response(JSON.stringify({id:'or_test',amount:1,status:'paid'}),{status:200}):realFetch(url,options));
 const r=await fetch(base+'/api/commerce/pagarme/webhook',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({type:'order.paid',data:{id:'or_test'}})});expect(r.status).toBe(503);expect(state.order.order_status).toBe('pending');expect(state.order.payment_status).toBe('pending');
});
it('avisos do admin são privados',async()=>{expect((await fetch(base+'/api/commerce/admin/notifications')).status).toBe(401);expect((await fetch(base+'/api/commerce/admin/notifications/1/ack',{method:'POST'})).status).toBe(401);});

it('corrige pagamento já salvo como pago cuja etapa ficou pendente',async()=>{
 state.order.pagarme_order_id='or_test';state.order.payment_status='paid';
 const r=await fetch(base+'/api/commerce/orders/'+state.order.id+'/pix-status',{headers:{'X-Order-Token':state.order.access_token}});expect(r.status).toBe(200);expect(state.order.order_status).toBe('confirmed');expect(gatewayCalls).toHaveLength(0);
});
it('falha do gateway mantém pendente e devolve erro para reenvio do webhook',async()=>{
 state.order.pagarme_order_id='or_test';vi.stubGlobal('fetch',async(url,options)=>{if(String(url).startsWith('https://api.pagar.me/'))throw Error('offline');return realFetch(url,options);});
 const r=await fetch(base+'/api/commerce/pagarme/webhook',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({type:'order.paid',data:{id:'or_test'}})});expect(r.status).toBe(503);expect(state.order.payment_status).toBe('pending');expect(state.rpcCalls).toHaveLength(0);
});

it('perfil do checkout exige confirmação do mesmo telefone e retorna somente nome e endereço',async()=>{
 state.history=[{customer_name:'Lucas',order_status:'confirmed',customer_document:'private',access_token:'secret',address:{street:'Rua América',number:'100',city:'Corumbá',neighborhood:'Centro',private:'hidden'}}];
 const path=base+'/api/commerce/customer/checkout-profile?phone=67999999999';expect((await fetch(path)).status).toBe(401);
 expect((await fetch(path,{headers:{Authorization:'Bearer unconfirmed-customer'}})).status).toBe(401);
 expect((await fetch(base+'/api/commerce/customer/checkout-profile?phone=21988888888',{headers:{Authorization:'Bearer verified-customer'}})).status).toBe(403);
 const response=await fetch(path,{headers:{Authorization:'Bearer verified-customer'}});expect(response.status).toBe(200);const data=await response.json();expect(data.profile.name).toBe('Lucas');expect(data.profile.address.street).toBe('Rua América');expect(JSON.stringify(data)).not.toContain('secret');expect(JSON.stringify(data)).not.toContain('private');
});

it('CPF salvo só é usado com credencial privada do mesmo telefone e nunca é devolvido',async()=>{
 state.order.customer_document='12345678909';
 const check=async(phone,token)=>{const r=await fetch(base+'/api/commerce/checkout/pix-document',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({phone,reference:{id:state.order.id,token}})});return r.json();};
 expect(await check(state.order.customer_phone,state.order.access_token)).toEqual({available:true});
 expect(await check('21988888888',state.order.access_token)).toEqual({available:false});
 expect(await check(state.order.customer_phone,'33333333-3333-4333-8333-333333333333')).toEqual({available:false});
 const result=await (await fetch(base+'/api/commerce/orders/'+state.order.id,{headers:{'X-Order-Token':state.order.access_token}})).json();expect(result.order.has_saved_document).toBe(true);expect(JSON.stringify(result)).not.toContain('12345678909');
});
it('gera Pix com CPF do pedido no servidor sem reenviar o documento do navegador',async()=>{
 state.order.customer_document='12345678909';const r=await fetch(base+'/api/commerce/orders/'+state.order.id+'/pix',{method:'POST',headers:{'Content-Type':'application/json','X-Order-Token':state.order.access_token},body:'{}'});expect(r.status).toBe(200);expect(JSON.parse(gatewayCalls[0].options.body).customer.document).toBe('12345678909');
});
it('pedido sem CPF salvo informa código recuperável para pedir o documento',async()=>{
 const r=await fetch(base+'/api/commerce/orders/'+state.order.id+'/pix',{method:'POST',headers:{'Content-Type':'application/json','X-Order-Token':state.order.access_token},body:'{}'});expect(r.status).toBe(422);expect((await r.json()).code).toBe('CPF_REQUIRED');expect(gatewayCalls).toHaveLength(0);
});

it('segunda compra copia CPF no servidor com referência privada sem devolvê-lo',async()=>{
 state.order.customer_document='12345678909';const reference={id:state.order.id,token:state.order.access_token};const payload={request_key:'55555555-5555-4555-8555-555555555555',access_token:'66666666-6666-4666-8666-666666666666',customer_name:'Cliente',customer_phone:state.order.customer_phone,payment_method:'pix',items:[{id:'product',quantity:1}],address:state.order.address,expected_total:13,pix_reference:reference};
 const r=await fetch(base+'/api/commerce/orders',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});expect(r.status).toBe(200);const data=await r.json();expect(data.has_saved_document).toBe(true);expect(data.customer_document).toBeUndefined();expect(state.rpcCalls.find(c=>c.name==='shop_create_order_checked').p.p.customer_document).toBe('12345678909');
});

it('avaliação exige credencial privada e entrega concluída',async()=>{
 const path=base+'/api/commerce/orders/'+state.order.id+'/review';
 expect((await fetch(path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({rating:5,comment:'Ótima entrega'})})).status).toBe(404);
 const options={method:'POST',headers:{'Content-Type':'application/json','X-Order-Token':state.order.access_token},body:JSON.stringify({rating:5,comment:'Ótima entrega'})};
 expect((await fetch(path,options)).status).toBe(409);state.order.order_status='delivered';expect((await fetch(path,{...options,body:JSON.stringify({rating:6})})).status).toBe(422);expect((await fetch(path,options)).status).toBe(200);
});
it('visitantes não aceita identificadores arbitrários e leitura exige admin',async()=>{
 const r=await fetch(base+'/api/commerce/visits',{method:'POST',headers:{'Content-Type':'application/json'},body:'{"visitor_id":"telefone"}'});expect(r.status).toBe(422);
 expect((await fetch(base+'/api/commerce/admin/orders/'+state.order.id+'/read',{method:'POST',headers:{'Content-Type':'application/json'},body:'{"until":1}'})).status).toBe(401);
});
it('consulta leve do histórico mantém autenticação e não espera gateway nem conversa',async()=>{
 state.order.pagarme_order_id='or_test';
 const path=base+'/api/commerce/orders/'+state.order.id+'?summary=1';
 expect((await fetch(path)).status).toBe(404);
 const response=await fetch(path,{headers:{'X-Order-Token':state.order.access_token}});const data=await response.json();
 expect(response.status).toBe(200);expect(data.order.protocol).toBe('ALA-TESTE');expect(data.messages).toBeUndefined();expect(data.payment).toBeUndefined();expect(gatewayCalls).toHaveLength(0);
});
it('não gera Pix de pedido sem endereço completo',async()=>{
 state.order.address.number='';
 const response=await fetch(base+'/api/commerce/orders/'+state.order.id+'/pix',{method:'POST',headers:{'Content-Type':'application/json','X-Order-Token':state.order.access_token},body:JSON.stringify({document:'12345678909'})});
 expect(response.status).toBe(422);expect((await response.json()).code).toBe('ADDRESS_REQUIRED');expect(gatewayCalls).toHaveLength(0);
});
