import React,{useEffect} from 'react';
import {it,expect,vi,beforeEach} from 'vitest';
import {render,screen,fireEvent,waitFor,cleanup} from '@testing-library/react';
import {CheckoutProvider,useCheckout} from '../src/contexts/CheckoutContext';
import {CartProvider,useCart} from '../src/contexts/CartContext';
import CheckoutDrawer from '../src/components/CheckoutDrawer/CheckoutDrawer';
const mocks=vi.hoisted(()=>({cep:vi.fn()}));
vi.mock('../src/services/addressApi',()=>({supportedCities:['Corumbá','Ladário'],lookupCEP:mocks.cep,loadDeliveryZones:async()=>[{id:'c',city:'Corumbá',neighborhood:'Centro',fee:5,eta_minutes:30},{id:'l',city:'Ladário',neighborhood:'Almirante Tamandaré',fee:12,eta_minutes:50}]}));
vi.mock('../src/services/commerceApi',()=>({commerce:vi.fn(),rememberOrder:vi.fn(),orderCredentials:vi.fn(),trackingURL:vi.fn()}));
function Seed(){const c=useCheckout(),cart=useCart();useEffect(()=>{c.setCustomer({name:'Cliente',phone:'67999999999'});c.setCheckoutStep('address-form');c.openCheckout();cart.addToCart({id:'p',name:'Produto',price:10,stock:10});},[]);return <CheckoutDrawer embedded/>;}
function mount(){render(<CartProvider><CheckoutProvider><Seed/></CheckoutProvider></CartProvider>);}
beforeEach(()=>{cleanup();localStorage.clear();sessionStorage.clear();mocks.cep.mockReset();window.alert=vi.fn();});
it('remove UF e mostra cidades fixas e bairros cadastrados da cidade selecionada',async()=>{
 mount();await screen.findByLabelText('Cidade');expect(screen.queryByLabelText('UF')).toBeNull();
 const city=screen.getByLabelText('Cidade');expect([...city.options].map(o=>o.textContent)).toEqual(['Selecione a cidade','Corumbá-MS','Ladário-MS']);
 fireEvent.change(city,{target:{value:'Ladário'}});await screen.findByRole('option',{name:/Almirante Tamandaré/});expect(screen.queryByRole('option',{name:/Centro/})).toBeNull();
});
it('CEP sugere rua e bairro cadastrado e permite chegar à forma de pagamento',async()=>{
 mocks.cep.mockResolvedValue({cep:'79300-100',street:'Rua Cabral',city:'Corumbá',neighborhood:'centro',state:'MS'});
 mount();fireEvent.change(await screen.findByLabelText('CEP'),{target:{value:'79300100'}});
 await waitFor(()=>expect(screen.getByLabelText('Rua').value).toBe('Rua Cabral'));
 expect(screen.getByLabelText('Bairro').value).toBe('Centro');expect(screen.getByLabelText('Cidade').value).toBe('Corumbá');
 fireEvent.change(screen.getByLabelText('Número'),{target:{value:'10'}});fireEvent.click(screen.getByRole('button',{name:'Continuar',exact:true}));
 fireEvent.click(await screen.findByRole('button',{name:'Ir para pagamento'}));await screen.findByText('Forma de pagamento');expect(window.alert).not.toHaveBeenCalled();
});
it('permite preenchimento manual quando CEP não responde',async()=>{
 mocks.cep.mockRejectedValue(Error('Consulta de CEP indisponível. Preencha manualmente.'));
 mount();fireEvent.change(await screen.findByLabelText('CEP'),{target:{value:'79300100'}});await screen.findByText(/Consulta de CEP indisponível/);
 fireEvent.change(screen.getByLabelText('Cidade'),{target:{value:'Corumbá'}});fireEvent.change(screen.getByLabelText('Rua'),{target:{value:'Rua manual'}});fireEvent.change(screen.getByLabelText('Número'),{target:{value:'1'}});
 fireEvent.change(screen.getByLabelText('Bairro'),{target:{value:'Centro'}});fireEvent.click(screen.getByRole('button',{name:'Continuar',exact:true}));await screen.findByRole('button',{name:'Ir para pagamento'});
});
