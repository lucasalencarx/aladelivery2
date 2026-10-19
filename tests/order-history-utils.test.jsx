import {it,expect} from 'vitest';
import {mergeOrders,activeOrder,privateOrderProofs} from '../src/utils/customerOrders';
it('mescla consultas usando atualização mais recente e preserva a credencial privada',()=>{const fresh={id:'1',created_at:'2026-10-16T10:00Z',updated_at:'2026-10-16T12:00Z',order_status:'delivered',access_token:'private'};const old={...fresh,updated_at:'2026-10-16T11:00Z',order_status:'out_for_delivery',access_token:undefined};expect(mergeOrders([fresh],[old])[0]).toEqual(fresh);expect(activeOrder(fresh)).toBe(false);expect(activeOrder(old)).toBe(true);});
it('um item local inválido não impede recuperar os outros links',()=>{localStorage.clear();localStorage.setItem('ala_order_broken','not-json');localStorage.setItem('ala_order_ok','{"id":"1","token":"private"}');expect(privateOrderProofs()).toEqual([{id:'1',token:'private'}]);localStorage.clear();});
it('resposta rápida aparece sem aguardar outro pedido lento do mesmo lote',async()=>{
 const {refreshOrdersProgressively}=await import('../src/utils/customerOrders');
 let release;const updates=[];const slow=new Promise(resolve=>{release=resolve;});
 const task=refreshOrdersProgressively([{id:'slow'},{id:'fast'}],proof=>proof.id==='slow'?slow:Promise.resolve({id:'fast'}),order=>updates.push(order.id));
 await Promise.resolve();await Promise.resolve();expect(updates).toEqual(['fast']);release({id:'slow'});await task;expect(updates).toEqual(['fast','slow']);
});
