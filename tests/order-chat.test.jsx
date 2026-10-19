import React from 'react';
import {it,expect,vi,afterEach} from 'vitest';
import {render,screen,fireEvent,cleanup} from '@testing-library/react';
const f=vi.hoisted(()=>({commerce:vi.fn(),print:vi.fn()}));
vi.mock('../src/services/commerceApi',()=>({commerce:f.commerce,watchOrder:()=>()=>{},statusLabels:{pending:'Aguardando Pix',confirmed:'Confirmado',preparing:'Em preparação',out_for_delivery:'Saiu para entrega',delivered:'Entregue'}}));
vi.mock('../src/supabase/supabase',()=>({supabase:{from:()=>({select:()=>({eq:async()=>({data:[]})})})}}));
vi.mock('../src/utils/orderTools',async importOriginal=>({...await importOriginal(),printOrder:f.print}));
import OrderConversation from '../src/components/OrderConversation';
afterEach(()=>{cleanup();vi.clearAllMocks();});
it('oferece saudação manual, WhatsApp preparado e impressão sem enviar mensagem automaticamente',async()=>{
 Element.prototype.scrollIntoView=vi.fn();const order={id:'o',protocol:'ALA-123',customer_name:'Maria Souza',customer_phone:'67999999999',total_amount:13,subtotal:8,delivery_fee:5,order_status:'confirmed',payment_method:'pix',payment_status:'paid',eta_minutes:30,address:{street:'Rua',number:'1'},items:[{product_id:'p',product_name:'Cerveja',unit_price:8,total_price:8,quantity:1}]};
 f.commerce.mockResolvedValue({order,events:[],messages:[{id:1,sender:'store',body:'Pedido confirmado!',status_event_id:1,created_at:new Date().toISOString()}]});render(<OrderConversation id="o" admin/>);
 await screen.findByText('Conversa com o cliente');expect(screen.getByText('Automático')).toBeTruthy();expect(screen.getByText('Cerveja')).toBeTruthy();
 fireEvent.change(screen.getByLabelText('Saudação da mensagem pronta'),{target:{value:'friend_f'}});fireEvent.click(screen.getByRole('button',{name:'Atualização do pedido'}));expect(screen.getByLabelText('Mensagem').value).toContain('Olá, minha amiga!');expect(screen.getByLabelText('Mensagem').value).toContain('ALA-123');
 expect(new URL(screen.getAllByRole('link',{name:'WhatsApp'})[0].href).searchParams.get('text')).toContain('Olá, minha amiga!');
 expect(f.commerce.mock.calls.some(c=>c[1]?.method==='POST')).toBe(false);
 fireEvent.click(screen.getByRole('button',{name:'Imprimir pedido'}));expect(f.print).toHaveBeenCalledWith(order);
});
