// @vitest-environment node
import {it,expect,vi} from 'vitest';
import express from 'express';
import {installTracking} from '../backend/tracking';
it('exige token privado, limita perfil e oculta posição depois de entregue',async()=>{
 let order={id:'order',courier_id:'c',order_status:'out_for_delivery',courier_lat:-19,courier_lng:-57,courier_accuracy:12,courier_location_at:new Date().toISOString()};
 const signer=vi.fn(async()=>({data:{signedUrl:'https://storage.test/signed'}}));
 const c={name:'João',vehicle:'Moto',plate:'ABC1234',photo_path:'user/photo.jpg',phone:'private',notes:'private',auth_user_id:'private'};
 const db={from(){const q={select:()=>q,eq:()=>q,maybeSingle:async()=>c};return q;},storage:{from:()=>({createSignedUrl:signer})}};
 const app=express(),safe=f=>(req,res,next)=>Promise.resolve(f(req,res,next)).catch(next);
 installTracking(app,{db,run:async q=>q,safe,access:(req,res,next)=>{if(req.headers['x-order-token']!=='secret')return res.sendStatus(404);req.order=order;next();},admin:(req,res)=>res.sendStatus(403)});
 const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));const base='http://127.0.0.1:'+server.address().port;
 try{
  expect((await fetch(base+'/orders/order/tracking')).status).toBe(404);
  const r=await fetch(base+'/orders/order/tracking',{headers:{'X-Order-Token':'secret'}}),data=await r.json();expect(r.headers.get('cache-control')).toContain('no-store');expect(data.courier).toEqual({name:'João',vehicle:'Moto',plate:'ABC1234',photo_url:'https://storage.test/signed'});expect(data.position.accuracy).toBe(12);
  order={...order,order_status:'delivered'};const done=await (await fetch(base+'/orders/order/tracking',{headers:{'X-Order-Token':'secret'}})).json();expect(done.position).toBeNull();expect(done.courier).toBeNull();
 }finally{await new Promise(r=>server.close(r));}
});
