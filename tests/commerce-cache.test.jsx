import {it,expect,vi,afterEach} from 'vitest';
vi.mock('../src/services/customerAuth',()=>({customerAuth:{}}));
vi.mock('../src/supabase/supabase',()=>({supabase:{}}));
import {rememberOrder,orderCredentials} from '../src/services/commerceApi';
afterEach(()=>localStorage.clear());
it('resumo instantâneo preserva credencial ao atualizar e não guarda CPF/endereço',()=>{
 const order={id:'one',access_token:'private',created_at:new Date().toISOString(),protocol:'ALA-ONE',total_amount:10,order_status:'pending',payment_method:'pix',customer_document:'12345678909',address:{street:'Rua privada'},items:[{product_name:'Água',quantity:1}]};
 rememberOrder(order);rememberOrder({...order,access_token:undefined,order_status:'confirmed'});
 const saved=orderCredentials('one');expect(saved.token).toBe('private');expect(saved.snapshot.order_status).toBe('confirmed');expect(saved.snapshot.items[0].product_name).toBe('Água');expect(JSON.stringify(saved)).not.toContain('Rua privada');expect(JSON.stringify(saved)).not.toContain('12345678909');
});
