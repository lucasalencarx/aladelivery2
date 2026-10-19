import React from 'react';
import {it,expect,vi,beforeEach,afterEach} from 'vitest';
import {render,screen,cleanup,fireEvent,waitFor} from '@testing-library/react';
const f=vi.hoisted(()=>({commerce:vi.fn(),session:null}));
vi.mock('../src/services/commerceApi',()=>({commerce:f.commerce,rememberOrder:vi.fn(),trackingURL:()=>'/rastrear',statusLabels:{preparing:'Em preparação',delivered:'Entregue'}}));
vi.mock('../src/services/customerAuth',()=>({customerAuth:{auth:{getSession:async()=>({data:{session:f.session}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})}}}));
vi.mock('../src/components/PhoneVerification',()=>({default:()=> <p>Recuperação opcional por telefone</p>}));
import MyOrders from '../src/storefront/MyOrders';
import OrderReview from '../src/components/OrderReview';
beforeEach(()=>{localStorage.clear();f.session=null;HTMLDialogElement.prototype.showModal=function(){this.open=true;};HTMLDialogElement.prototype.close=function(){this.open=false;};});afterEach(()=>{cleanup();vi.clearAllMocks();});
it('cache abre sem login, destaca ativos e deixa entregues recolhidos',async()=>{
 const live={id:'live',protocol:'ALA-ATIVO',order_status:'preparing',created_at:new Date().toISOString(),total_amount:20,items:[]};const old={...live,id:'done',protocol:'ALA-ENTREGUE',order_status:'delivered',created_at:'2025-01-01T12:00:00Z'};localStorage.setItem('ala_order_live',JSON.stringify({id:'live',token:'token-live'}));localStorage.setItem('ala_order_done',JSON.stringify({id:'done',token:'token-done'}));f.commerce.mockImplementation(async path=>({order:path.includes('/live')?live:old}));render(<MyOrders/>);await screen.findByText('ALA-ATIVO');expect(screen.getByText('ALA-ATIVO').closest('article').className).toContain('my-live-card');const closed=screen.getByText('ALA-ENTREGUE').closest('details');expect(closed.open).toBe(false);expect(screen.getByText(/Se limpar os dados do navegador/)).toBeTruthy();expect(f.commerce.mock.calls.every(([p])=>p.startsWith('/orders/'))).toBe(true);
});
it('avaliação automática é opcional, aparece após consulta e pode ser dispensada',async()=>{
 f.commerce.mockResolvedValue({review:null});render(<OrderReview id="delivered-order" token="private" autoPrompt/>);await waitFor(()=>expect(screen.getByRole('dialog').open).toBe(true));fireEvent.click(screen.getByRole('button',{name:'Agora não, continuar acompanhando'}));expect(localStorage.getItem('ala_review_prompt_delivered-order')).toBe('later');expect(screen.queryByRole('dialog')).toBeNull();
});
it('avaliação envia estrelas e comentário sem publicar outra informação do pedido',async()=>{
 f.commerce.mockResolvedValue({review:null});render(<OrderReview id="order" token="private"/>);fireEvent.click(screen.getByRole('button',{name:'5 estrelas'}));fireEvent.change(screen.getByLabelText('Comentário sobre a entrega'),{target:{value:'Muito bom!'}});fireEvent.click(screen.getByRole('button',{name:'Enviar minha avaliação'}));await waitFor(()=>expect(f.commerce).toHaveBeenCalledWith('/orders/order/review',{token:'private',method:'POST',body:'{"rating":5,"comment":"Muito bom!"}'}));await screen.findByText('Obrigado pela sua avaliação!');
});
it('mostra o resumo salvo imediatamente enquanto a rede ainda está pendente',()=>{
 const snapshot={id:'cached',protocol:'ALA-CACHE-RAPIDO',created_at:new Date().toISOString(),order_status:'preparing',total_amount:20,items:[]};
 localStorage.setItem('ala_order_cached',JSON.stringify({id:'cached',token:'private',snapshot}));f.commerce.mockImplementation(()=>new Promise(()=>{}));
 render(<MyOrders/>);expect(screen.getByText('ALA-CACHE-RAPIDO')).toBeTruthy();expect(screen.getByRole('button',{name:'Acompanhar pedido e conversar'})).toBeTruthy();
});
