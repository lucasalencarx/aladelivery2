import React from 'react';
import {it,expect,vi,beforeEach} from 'vitest';
import {render,screen,fireEvent,waitFor,cleanup} from '@testing-library/react';
import AdminOffers from '../src/admin/pages/AdminOffers';
import OrderConversation from '../src/components/OrderConversation';
const f=vi.hoisted(()=>({rpc:vi.fn(),commerce:vi.fn(),watchOrder:vi.fn(),reorder:vi.fn(),products:[],items:[]}));
vi.mock('../src/supabase/supabase',()=>({supabase:{rpc:f.rpc}}));
vi.mock('../src/services/commerceApi',()=>({commerce:f.commerce,watchOrder:f.watchOrder,statusLabels:{confirmed:'Confirmado'}}));
vi.mock('../src/admin/services/adminService',()=>({getSections:async()=>[{id:'section',name:'Ofertas',active:true}],getProducts:async()=>f.products,getSectionProducts:async()=>f.items,reorderSectionProducts:f.reorder,createSection:vi.fn(),updateSection:vi.fn(),deleteSection:vi.fn(),removeProductFromSection:vi.fn()}));
beforeEach(()=>{cleanup();vi.clearAllMocks();f.watchOrder.mockReturnValue(()=>{});Element.prototype.scrollIntoView=vi.fn();f.rpc.mockResolvedValue({error:null});f.products=[{id:'p1',name:'Produto pausado',active:false,price:10}];f.items=[];});
it('adiciona e ativa produto com a chamada transacional do admin',async()=>{
 render(<AdminOffers/>);await screen.findByText('Produto pausado');
 fireEvent.click(screen.getByRole('button',{name:/Produto pausado/}));
 await waitFor(()=>expect(f.rpc).toHaveBeenCalledWith('admin_include_product',{section_ref:'section',product_ref:'p1'}));
});
it('salva nova ordem pela prévia com alternativa ao arrastar',async()=>{
 f.items=[{product_id:'p1',product:{name:'Primeiro',active:true,price:10}},{product_id:'p2',product:{name:'Segundo',active:true,price:20}}];
 render(<AdminOffers/>);const buttons=await screen.findAllByRole('button',{name:'Mover produto para próxima posição'});
 fireEvent.click(buttons[0]);await waitFor(()=>expect(f.reorder).toHaveBeenCalledWith('section',['p2','p1']));
});
it('envia mensagem usando a credencial privada do pedido e conecta atualizações',async()=>{
 const order={id:'o',protocol:'ALA-TESTE',customer_name:'Cliente',total_amount:10,order_status:'confirmed',eta_minutes:30,address:{street:'Rua',number:'1'},items:[]};
 f.commerce.mockImplementation(async(path,options)=>options?.method==='POST'?{success:true}:{order,events:[],messages:[]});
 render(<OrderConversation id="o" token="privado"/>);await screen.findByText('Falar com a loja');
 fireEvent.change(screen.getByLabelText('Mensagem'),{target:{value:'Pode entregar no portão?'}});fireEvent.click(screen.getByRole('button',{name:'Enviar'}));
 await waitFor(()=>expect(f.commerce).toHaveBeenCalledWith('/orders/o/messages',expect.objectContaining({token:'privado',method:'POST',body:JSON.stringify({body:'Pode entregar no portão?'})})));
 expect(f.watchOrder).toHaveBeenCalledWith('/orders/o/stream',expect.objectContaining({token:'privado',admin:false}));
});
