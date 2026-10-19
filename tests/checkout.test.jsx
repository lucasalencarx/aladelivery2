import React,{useEffect} from 'react';
import {describe,it,expect,vi,beforeEach} from 'vitest';
import {render,screen,fireEvent,waitFor,cleanup} from '@testing-library/react';
import {CheckoutProvider,useCheckout} from '../src/contexts/CheckoutContext';
import {CartProvider,useCart} from '../src/contexts/CartContext';
import CheckoutDrawer from '../src/components/CheckoutDrawer/CheckoutDrawer';
const api=vi.hoisted(()=>({commerce:vi.fn(),rememberOrder:vi.fn(),orderCredentials:()=>({token:'test-token'}),trackingURL:()=>'/rastrear#id=test&token=test-token'}));
vi.mock('../src/services/commerceApi',()=>api);
vi.mock('../src/services/addressApi',()=>({supportedCities:['Corumbá','Ladário'],loadDeliveryZones:async()=>[{id:'z',city:'Corumbá',neighborhood:'Centro',fee:5,eta_minutes:30}],lookupCEP:vi.fn()}));
const product={id:'11111111-1111-4111-8111-111111111111',name:'Produto de teste',price:10,promotional_price:8,stock:10,active:true};
const zones=[{id:'z',city:'Corumbá',neighborhood:'Centro',fee:5,eta_minutes:30}];
const created={id:'22222222-2222-4222-8222-222222222222',protocol:'ALA-TESTE',access_token:'test-token'};
function Seed({step='payment',pixReady=false}){
 const c=useCheckout(),cart=useCart();
 useEffect(()=>{
  c.setCustomer({name:'Cliente teste',phone:'67999999999',pixReady});
  c.setAddress({cep:'79300000',street:'Rua teste',number:'10',complement:'',neighborhood:'Centro',city:'Corumbá',state:'MS',reference:''});
  c.setCheckoutStep(step);c.openCheckout();cart.addToCart(product);
 },[]);
 return <CheckoutDrawer embedded/>;
}
function mount(step='payment',pixReady=false){return render(<CartProvider><CheckoutProvider><Seed step={step} pixReady={pixReady}/></CheckoutProvider></CartProvider>);}
beforeEach(()=>{
 cleanup();localStorage.clear();sessionStorage.clear();api.commerce.mockReset();api.rememberOrder.mockReset();window.alert=vi.fn();
 api.commerce.mockImplementation(async(path)=>path==='/zones'?zones:path==='/orders'?created:{});
});
describe('Checkout com taxas',()=>{
 it('inclui taxa no total e registra pagamento na entrega no servidor',async()=>{
  mount();await waitFor(()=>expect(screen.getByTestId('delivery-fee-row').textContent).toMatch(/5,00/));
  expect(screen.getAllByText(/13,00/).length).toBeGreaterThan(0);expect(screen.getByTestId('delivery-fee-row').closest('.checkoutPaymentSummary')).not.toBeNull();expect(screen.queryByText(/Total com entrega/)).toBeNull();
  fireEvent.click(screen.getByText('Dinheiro'));
  fireEvent.click(screen.getByText('Não preciso'));
  fireEvent.click(screen.getByRole('button',{name:'Finalizar pedido',exact:true}));
  await waitFor(()=>expect(api.rememberOrder).toHaveBeenCalled());
  const call=api.commerce.mock.calls.find(c=>c[0]==='/orders'),payload=JSON.parse(call[1].body);
  expect(payload.expected_total).toBe(13);expect(payload.payment_method).toBe('dinheiro');
  expect(payload.items).toEqual([{id:product.id,quantity:1}]);expect(payload).not.toHaveProperty('payment_status');
  expect(window.alert).not.toHaveBeenCalled();
  await waitFor(()=>expect(JSON.parse(localStorage.getItem('ala-delivery-cart-v2')||'[]')).toEqual([]));
  expect(localStorage.getItem('ala_delivery_active_order_v1')).toBeNull();
 });
 it('gera Pix vinculado ao pedido e ao token, sem enviar valor ao gateway',async()=>{
  api.commerce.mockImplementation(async(path)=>path==='/zones'?zones:path==='/orders'?created:{order_id:'or_test',qr_code:'pix-teste',expires_at:new Date(Date.now()+600000).toISOString()});
  mount();await waitFor(()=>expect(screen.getByTestId('delivery-fee-row').textContent).toMatch(/5,00/));
  fireEvent.click(screen.getByText('Pix'));
  fireEvent.change(screen.getByLabelText('CPF'),{target:{value:'12345678909'}});
  expect(screen.queryByRole('button',{name:'Finalizar pedido',exact:true})).toBeNull();
  await waitFor(()=>expect(api.commerce.mock.calls.some(c=>c[0].endsWith('/pix'))).toBe(true));
  const call=api.commerce.mock.calls.find(c=>c[0].endsWith('/pix'));
  expect(call[1].token).toBe('test-token');expect(JSON.parse(call[1].body)).toEqual({document:'12345678909'});
 });
});

it('cliente recorrente continua direto à revisão com nome/endereço salvos',async()=>{
 localStorage.setItem('ala_checkout_profiles_v1',JSON.stringify([{name:'Lucas',phone:'67999999999',address:{street:'Rua América',number:'100',neighborhood:'Centro',city:'Corumbá',state:'MS'}}]));
 mount('phone');await screen.findByText('Olá, Lucas!');await waitFor(()=>expect(screen.getByRole('button',{name:'Continuar',exact:true}).disabled).toBe(false));
 fireEvent.click(screen.getByRole('button',{name:'Continuar',exact:true}));await screen.findByText('Confira seu pedido');expect(screen.getByText('Lucas')).toBeTruthy();expect(screen.queryByLabelText('Seu nome')).toBeNull();
});
it('trocar o telefone não reaproveita nome nem endereço de outro cliente',async()=>{
 localStorage.setItem('ala_checkout_profiles_v1',JSON.stringify([{name:'Lucas',phone:'67999999999',address:{street:'Rua América',number:'100',neighborhood:'Centro',city:'Corumbá'}}]));
 mount('phone');await screen.findByText('Olá, Lucas!');fireEvent.change(screen.getByLabelText('WhatsApp / Telefone'),{target:{value:'67988888888'}});expect(screen.queryByText('Olá, Lucas!')).toBeNull();fireEvent.click(screen.getByRole('button',{name:'Continuar',exact:true}));await waitFor(()=>expect(document.querySelector('input[name="name"]')?.value).toBe(''));expect(screen.queryByText('Rua América')).toBeNull();
});

it('remove opção de recuperação e não mostra CPF quando já está salvo no servidor',async()=>{
 mount('payment',true);await waitFor(()=>expect(screen.getByTestId('delivery-fee-row')).toBeTruthy());fireEvent.click(screen.getByText('Pix'));expect(screen.queryByLabelText('CPF')).toBeNull();expect(screen.queryByText(/Já comprou em outro aparelho/)).toBeNull();
 api.commerce.mockImplementation(async(path)=>path==='/orders'?{...created,has_saved_document:true}:{qr_code:'pix-salvo',order_id:'or_test',expires_at:new Date(Date.now()+600000).toISOString()});expect(screen.queryByRole('button',{name:'Finalizar pedido',exact:true})).toBeNull();await waitFor(()=>expect(api.commerce.mock.calls.some(c=>c[0].endsWith('/pix'))).toBe(true));expect(JSON.parse(api.commerce.mock.calls.find(c=>c[0].endsWith('/pix'))[1].body).document).toBe('');
});

it('reconhece automaticamente telefone, restaura endereço e mantém CPF oculto até gerar Pix',async()=>{
 localStorage.setItem('ala_checkout_profiles_v1',JSON.stringify([{name:'Lucas',phone:'67999999999',document_order_id:'11111111-1111-4111-8111-111111111111',address:{street:'Rua América',number:'100',neighborhood:'Centro',city:'Corumbá',state:'MS'}}]));
 api.commerce.mockImplementation(async(path)=>path==='/checkout/pix-document'?{available:true}:path==='/orders'?{...created,has_saved_document:true}:{qr_code:'pix-recorrente',order_id:'or_test',expires_at:new Date(Date.now()+600000).toISOString()});
 mount('phone');await screen.findByText('Confira seu pedido',{}, {timeout:2500});expect(screen.getByText('Lucas')).toBeTruthy();fireEvent.click(screen.getByRole('button',{name:'Ir para pagamento'}));fireEvent.click(screen.getByText('Pix'));expect(screen.queryByLabelText('CPF')).toBeNull();expect(screen.queryByRole('button',{name:'Finalizar pedido',exact:true})).toBeNull();await waitFor(()=>expect(api.commerce.mock.calls.some(c=>c[0].endsWith('/pix'))).toBe(true));expect(JSON.parse(api.commerce.mock.calls.find(c=>c[0]==='/orders')[1].body).pix_reference.token).toBe('test-token');
});
it('selecionar Pix repetidamente não duplica cobrança em andamento',async()=>{
 let release;const pending=new Promise(r=>{release=r;});api.commerce.mockImplementation(async path=>path==='/orders'?created:pending);mount('payment',true);await waitFor(()=>expect(screen.getByTestId('delivery-fee-row')).toBeTruthy());fireEvent.click(screen.getByText('Pix'));await waitFor(()=>expect(api.commerce.mock.calls.filter(c=>c[0].endsWith('/pix'))).toHaveLength(1));fireEvent.click(screen.getByText('Pix'));fireEvent.click(screen.getByText('Pix'));release({qr_code:'pix-unico',order_id:'or_test',expires_at:new Date(Date.now()+600000).toISOString()});await waitFor(()=>expect(screen.getByLabelText('Código Pix copia e cola')).toBeTruthy());expect(api.commerce.mock.calls.filter(c=>c[0]==='/orders')).toHaveLength(1);expect(api.commerce.mock.calls.filter(c=>c[0].endsWith('/pix'))).toHaveLength(1);
});
it('se o CPF salvo não estiver disponível, pede uma vez e gera ao completar o campo',async()=>{
 let tries=0;api.commerce.mockImplementation(async path=>{if(path==='/orders')return created;if(path.endsWith('/pix')){if(tries++===0){const e=Error('Informe o CPF');e.code='CPF_REQUIRED';throw e;}return {qr_code:'pix-cpf',order_id:'or_test',expires_at:new Date(Date.now()+600000).toISOString()};}return {};});mount('payment',true);await waitFor(()=>expect(screen.getByTestId('delivery-fee-row')).toBeTruthy());fireEvent.click(screen.getByText('Pix'));await screen.findByLabelText('CPF');fireEvent.change(screen.getByLabelText('CPF'),{target:{value:'12345678909'}});await screen.findByLabelText('Código Pix copia e cola');expect(api.commerce.mock.calls.filter(c=>c[0].endsWith('/pix'))).toHaveLength(2);
});
it('sugestão de telefone reconhece cliente sem esperar a recuperação do CPF',async()=>{
 localStorage.setItem('ala_checkout_profiles_v1',JSON.stringify([{name:'Lucas',phone:'67999999999',address:{street:'Rua América',number:'100',neighborhood:'Centro',city:'Corumbá',state:'MS'}}]));
 api.commerce.mockImplementation(path=>path==='/checkout/pix-document'?new Promise(()=>{}):Promise.resolve({}));
 mount('phone');fireEvent.click(await screen.findByRole('button',{name:/Lucas.*67/}));
 await screen.findByText('Confira seu pedido');expect(screen.getByText('Rua América, 100')).toBeTruthy();
});
