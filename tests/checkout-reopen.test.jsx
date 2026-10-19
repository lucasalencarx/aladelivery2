import React,{useEffect} from 'react';
import {it,expect,vi,beforeEach,afterEach} from 'vitest';
import {render,screen,fireEvent,waitFor,cleanup,act} from '@testing-library/react';
import {CartProvider,useCart} from '../src/contexts/CartContext';
import {CheckoutProvider,useCheckout} from '../src/contexts/CheckoutContext';
const api=vi.hoisted(()=>({commerce:vi.fn(),rememberOrder:vi.fn(),orderCredentials:()=>({token:'private'}),trackingURL:id=>'/rastrear#id='+id,loadPublicCatalog:vi.fn()}));
vi.mock('../src/services/commerceApi',()=>api);
vi.mock('../src/storefront/catalogService',()=>({loadPublicCatalog:api.loadPublicCatalog}));
vi.mock('../src/services/addressApi',()=>({supportedCities:['Corumbá','Ladário'],loadDeliveryZones:async()=>[{city:'Corumbá',neighborhood:'Centro',fee:5}],lookupCEP:vi.fn()}));
import CartDrawer from '../src/components/CartDrawer/CartDrawer';
const product={id:'product',name:'Cerveja',price:10,stock:20,active:true};
const order={id:'order',protocol:'ALA-PIX',created_at:new Date().toISOString(),payment_method:'pix',payment_status:'pending',order_status:'pending'};
function Seed({invalid=false}){const cart=useCart(),checkout=useCheckout();useEffect(()=>{cart.addToCart(product);checkout.setCustomer({name:'Lucas',phone:'67999999999',pixReady:true});checkout.setAddress({street:invalid?'':'Rua A',number:'10',neighborhood:'Centro',city:'Corumbá',state:'MS',cep:''});checkout.setCheckoutStep('payment');checkout.openCheckout();},[]);return <><button onClick={cart.openCart}>Abrir sacola</button><button onClick={()=>cart.addToCart({...product,id:'extra',name:'Água'})}>Outro produto</button><CartDrawer/></>;}
function mount(props){return render(<CartProvider><CheckoutProvider><Seed {...props}/></CheckoutProvider></CartProvider>);}
beforeEach(()=>{localStorage.clear();sessionStorage.clear();HTMLDialogElement.prototype.showModal=function(){this.open=true;};HTMLDialogElement.prototype.close=function(){this.open=false;};window.matchMedia=()=>({matches:true});api.commerce.mockReset();api.rememberOrder.mockReset();api.loadPublicCatalog.mockResolvedValue({products:[product],store:{is_open:true}});api.commerce.mockImplementation(async path=>path==='/orders'?order:path.endsWith('/pix')?{order_id:'or_test',qr_code:'pix-code',expires_at:new Date(Date.now()+600000).toISOString()}:{order});});
afterEach(()=>cleanup());
it('fechar Pix e escolher outro item reabre a sacola, sem restaurar etapa de pagamento',async()=>{
 mount();await screen.findByText('Pix');fireEvent.click(screen.getByText('Pix'));await screen.findByLabelText('Código Pix copia e cola');
 fireEvent.click(screen.getByLabelText('Fechar checkout'));fireEvent.click(screen.getByText('Outro produto'));fireEvent.click(screen.getByText('Abrir sacola'));
 await screen.findByText('Meu carrinho');expect(screen.getByText('Água')).toBeTruthy();expect(screen.queryByLabelText('Código Pix copia e cola')).toBeNull();
 expect(screen.getByText('Você tem um pedido aguardando Pix')).toBeTruthy();expect(screen.getByRole('link',{name:/Ver pedido e continuar pagamento/}).getAttribute('href')).toBe('/rastrear#id=order');
});
it('pagamento inválido volta ao endereço e não cria pedido nem cobrança',async()=>{
 mount({invalid:true});await screen.findByText('Endereço de entrega');expect(api.commerce.mock.calls.some(([path])=>path==='/orders'||path.endsWith('/pix'))).toBe(false);
});
it('resposta tardia de geração Pix não reabre nem altera a tela após fechar',async()=>{
 let finishPix;api.commerce.mockImplementation(async path=>path==='/orders'?order:path.endsWith('/pix')?new Promise(resolve=>{finishPix=resolve;}):{order});
 mount();await screen.findByText('Pix');fireEvent.click(screen.getByText('Pix'));await waitFor(()=>expect(finishPix).toBeTypeOf('function'));
 fireEvent.click(screen.getByLabelText('Fechar checkout'));fireEvent.click(screen.getByText('Abrir sacola'));
 await act(async()=>finishPix({order_id:'or_test',qr_code:'late-pix',expires_at:new Date(Date.now()+600000).toISOString()}));
 expect(screen.queryByLabelText('Código Pix copia e cola')).toBeNull();expect(screen.getByText('Meu carrinho')).toBeTruthy();
});
