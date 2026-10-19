import React from 'react';
import {it,expect,vi,afterEach} from 'vitest';
import {render,screen,fireEvent,cleanup,waitFor} from '@testing-library/react';
const f=vi.hoisted(()=>({commerce:vi.fn(),login:vi.fn(),session:null}));
vi.mock('../src/services/courierAuth',()=>({courierAuth:{auth:{getSession:async()=>({data:{session:f.session}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}}),signInWithPassword:f.login,signOut:vi.fn()}}}));
vi.mock('../src/services/commerceApi',()=>({commerce:f.commerce,statusLabels:{preparing:'Em preparação',out_for_delivery:'Saiu para entrega'}}));
import CourierApp,{navigationURL} from '../src/courier/CourierApp';
afterEach(()=>{cleanup();f.session=null;vi.clearAllMocks();});
it('login separado informa falha sem mostrar dados de pedidos',async()=>{
 f.login.mockResolvedValue({error:Error('bad')});render(<CourierApp/>);await screen.findByRole('heading',{name:'Área do entregador'});fireEvent.change(screen.getByLabelText('E-mail'),{target:{value:'moto@loja.test'}});fireEvent.change(screen.getByLabelText('Senha'),{target:{value:'password'}});fireEvent.click(screen.getByRole('button',{name:'Entrar'}));await screen.findByRole('alert');expect(f.login).toHaveBeenCalledWith({email:'moto@loja.test',password:'password'});expect(f.commerce).not.toHaveBeenCalled();
});
it('exibe produtos, referência e WhatsApp com link do pedido; exige código para concluir',async()=>{
 f.session={user:{id:'courier'}};f.commerce.mockImplementation(async path=>path.endsWith('/me')?{name:'João'}:{orders:[{id:'order',protocol:'ALA-1',customer_name:'Maria',customer_phone:'67999999999',order_status:'out_for_delivery',payment_status:'paid',tracking_url:'https://loja.test/rastrear#id=order&token=private',address:{street:'Rua América',number:'10',city:'Corumbá',reference:'Portão branco'},items:[{product_id:'SKU1',quantity:2,product_name:'Água',total_price:10}],total_amount:15}]});
 render(<CourierApp/>);await screen.findByText('Maria');expect(screen.getByText('2 × Água')).toBeTruthy();expect(screen.getByText('Referência: Portão branco')).toBeTruthy();expect(new URL(screen.getByRole('link',{name:'WhatsApp + rastreio'}).href).searchParams.get('text')).toContain('token=private');fireEvent.click(screen.getByRole('button',{name:'Concluir entrega'}));expect(screen.getByRole('button',{name:'Confirmar entrega'}).disabled).toBe(true);fireEvent.change(screen.getByLabelText('Código de entrega'),{target:{value:'9999'}});fireEvent.click(screen.getByRole('button',{name:'Confirmar entrega'}));await waitFor(()=>expect(f.commerce).toHaveBeenCalledWith('/courier/orders/order/finish',expect.objectContaining({courier:true,body:'{"code":"9999"}'})));
});
it('mapas usam ponto confirmado quando existe, ou endereço completo',()=>{
 expect(new URL(navigationURL({delivery_lat:-19,delivery_lng:-57,address:{}})).searchParams.get('ll')).toBe('-19,-57');const url=new URL(navigationURL({address:{street:'Rua América',number:'10',city:'Corumbá'}}));expect(url.searchParams.get('q')).toContain('Rua América, 10, Corumbá, MS');expect(url.searchParams.get('navigate')).toBe('yes');
});
