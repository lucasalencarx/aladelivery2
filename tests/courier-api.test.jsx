// @vitest-environment node
import {it,expect,beforeEach,afterEach,vi} from 'vitest';
import express from 'express';
import {installCouriers} from '../backend/couriers';
let server,base,queries,calls,active,orders,account;
const own='11111111-1111-4111-8111-111111111111';
beforeEach(async()=>{
 queries=[];calls=[];active=true;account={id:'courier-1',active:true};orders=[{id:own,courier_id:'courier-1',payment_method:'pix',payment_status:'paid',access_token:'private',customer_document:'cpf'},{id:'pending',courier_id:'courier-1',payment_method:'pix',payment_status:'pending'}];
 const db={auth:{getUser:async t=>({data:{user:t==='courier'?{id:'auth-courier'}:null}}),admin:{createUser:vi.fn(async()=>({data:{user:{id:'new-user'}}})),updateUserById:vi.fn()}},from(table){const filters={};let update;const q={select:()=>q,eq:(k,v)=>{filters[k]=v;return q;},in:()=>q,order:()=>q,update:v=>{update=v;return q;},single:async()=>account,maybeSingle:async()=>active?{id:'courier-1',name:'Lucas',active:true}:null,then(resolve,reject){queries.push({table,filters,update});return Promise.resolve(table==='shop_orders'?orders:account).then(resolve,reject);}};return q;},rpc:async(name,p)=>{calls.push({name,p});return {data:{id:p.p_id,order_status:p.p_action==='finish'?'delivered':'out_for_delivery'}};}};
 const app=express();app.use(express.json());const safe=f=>(req,res,next)=>Promise.resolve(f(req,res,next)).catch(next);const run=async q=>{const r=await q;if(r?.error)throw r.error;return r?.data??r;};installCouriers(app,{db,run,safe,admin:(req,res,next)=>req.headers.authorization==='Bearer admin'?next():res.status(403).end(),publicOrder:o=>{const {access_token,customer_document,...rest}=o;return rest;},trackingURL:o=>'https://loja.test/rastrear#id='+o.id+'&token='+o.access_token});app.use((e,req,res,next)=>res.status(400).json({message:e.message}));
 server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));base='http://127.0.0.1:'+server.address().port;
});
afterEach(()=>new Promise(r=>server.close(r)));
it('exige login de entregador ativo e filtra pedidos pela atribuição no servidor',async()=>{
 expect((await fetch(base+'/courier/orders')).status).toBe(401);
 const response=await fetch(base+'/courier/orders?courier_id=other',{headers:{Authorization:'Bearer courier'}});const data=await response.json();expect(response.status).toBe(200);expect(queries[0].filters.courier_id).toBe('courier-1');expect(data.orders).toHaveLength(1);expect(data.orders[0].tracking_url).toContain('token=private');expect(data.orders[0].access_token).toBeUndefined();expect(data.orders[0].customer_document).toBeUndefined();
 active=false;expect((await fetch(base+'/courier/orders',{headers:{Authorization:'Bearer courier'}})).status).toBe(403);
});
it('ação usa identidade autenticada, nunca o identificador enviado pelo navegador',async()=>{
 const response=await fetch(base+'/courier/orders/'+own+'/finish',{method:'POST',headers:{Authorization:'Bearer courier','Content-Type':'application/json'},body:JSON.stringify({code:'9999',p_auth:'another-user',courier_id:'other'})});expect(response.status).toBe(200);expect(calls[0]).toEqual({name:'shop_courier_action',p:{p_id:own,p_auth:'auth-courier',p_action:'finish',p_code:'9999'}});
 const bad=await fetch(base+'/courier/orders/'+own+'/finish',{method:'POST',headers:{Authorization:'Bearer courier','Content-Type':'application/json'},body:JSON.stringify({code:'1'})});expect(bad.status).toBe(422);expect(calls).toHaveLength(1);
});
it('entregador não cria contas e não envia coordenadas inválidas',async()=>{
 expect((await fetch(base+'/admin/couriers/courier-1/account',{method:'POST',headers:{Authorization:'Bearer courier'}})).status).toBe(403);
 const response=await fetch(base+'/courier/orders/'+own+'/position',{method:'POST',headers:{Authorization:'Bearer courier','Content-Type':'application/json'},body:JSON.stringify({lat:200,lng:0,accuracy:1})});expect(response.status).toBe(422);expect(calls).toHaveLength(0);
});
