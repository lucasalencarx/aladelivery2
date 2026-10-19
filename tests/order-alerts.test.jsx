import React from 'react';
import {it,expect,vi,beforeEach,afterEach} from 'vitest';
import {render,screen,fireEvent,cleanup,waitFor,act} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
const f=vi.hoisted(()=>({commerce:vi.fn(),change:null,play:vi.fn(),pause:vi.fn()}));
vi.mock('../src/services/commerceApi',()=>({commerce:f.commerce,watchOrder:(path,{onChange})=>{f.change=onChange;return ()=>{};}}));
import OrderAlerts from '../src/admin/components/OrderAlerts';
const order={id:'order-1',protocol:'ALA-123',customer_name:'Lucas',customer_phone:'67999999999',payment_method:'pix',payment_status:'paid',subtotal:20,total_amount:25,delivery_fee:5,address:{street:'Rua América',number:'100',neighborhood:'Centro',city:'Corumbá'},items:[{product_id:'beer',product_name:'Cerveja gelada',quantity:2,unit_price:10,total_price:20,image_url:'https://example.test/beer.png'}]};
let queue;
function show(){return render(<MemoryRouter><OrderAlerts/></MemoryRouter>);}
beforeEach(()=>{
 localStorage.clear();localStorage.setItem('ala-order-sound','off');queue=[];f.play.mockResolvedValue(undefined);vi.stubGlobal('Audio',class{constructor(){this.play=f.play;this.pause=f.pause;this.currentTime=0;}});
 HTMLDialogElement.prototype.showModal=function(){this.open=true;};HTMLDialogElement.prototype.close=function(){this.open=false;};
 f.commerce.mockImplementation(async(path,opts)=>{if(opts?.method==='POST'){queue=queue.filter(a=>!path.includes('/'+a.id+'/ack'));return {success:true};}return {alerts:queue};});
});
afterEach(()=>{cleanup();vi.clearAllMocks();vi.unstubAllGlobals();});
it('recebe aviso em tempo real, exibe produtos/endereço e toca após ativação',async()=>{
 show();fireEvent.click(screen.getByRole('button',{name:'Ativar som'}));await screen.findByRole('button',{name:'Som ativado'});queue=[{id:1,order_id:order.id,created_at:new Date().toISOString(),order}];await act(async()=>{await f.change();});
 expect(await screen.findByText('ALA-123 · '+new Date(queue[0].created_at).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}))).toBeTruthy();expect(screen.getByAltText('Cerveja gelada')).toBeTruthy();expect(screen.getByText('Rua América, 100')).toBeTruthy();expect(screen.getByText('Pix confirmado')).toBeTruthy();expect(f.play).toHaveBeenCalledTimes(2);
 await act(async()=>{await f.change();});expect(f.play).toHaveBeenCalledTimes(2);
});
it('fecha um aviso por vez e não reapresenta o confirmado ao recarregar',async()=>{
 queue=[{id:1,order_id:order.id,created_at:new Date().toISOString(),order},{id:2,order_id:'order-2',created_at:new Date().toISOString(),order:{...order,id:'order-2',protocol:'ALA-456'}}];const view=show();await screen.findByText(/ALA-123/);fireEvent.click(await screen.findByRole('button',{name:'Fechar',exact:true}));await screen.findByText(/ALA-456/);expect(f.commerce).toHaveBeenCalledWith('/admin/notifications/1/ack',expect.objectContaining({admin:true,method:'POST'}));view.unmount();show();await screen.findByText(/ALA-456/);expect(screen.queryByText(/ALA-123/)).toBeNull();
});
it('mantém aviso se o banco não confirmar o fechamento',async()=>{
 queue=[{id:1,order_id:order.id,created_at:new Date().toISOString(),order}];show();await screen.findByText(/ALA-123/);f.commerce.mockImplementation(async(path,opts)=>{if(opts?.method==='POST')throw Error('Sem conexão');return {alerts:queue};});fireEvent.click(await screen.findByRole('button',{name:'Fechar',exact:true}));await screen.findByText('Sem conexão');expect(screen.getByText(/ALA-123/)).toBeTruthy();
});
it('explica quando o navegador bloqueia o som',async()=>{
 f.play.mockRejectedValue(new Error('blocked'));show();fireEvent.click(screen.getByRole('button',{name:'Ativar som'}));await waitFor(()=>expect(screen.getByRole('status').textContent).toContain('Não foi possível tocar'));expect(screen.getByRole('button',{name:'Ativar som'})).toBeTruthy();
});
it('som bloqueado pode ser liberado dentro do próprio modal',async()=>{
 localStorage.setItem('ala-order-sound','on');f.play.mockRejectedValue(Error('blocked'));queue=[{id:1,order_id:order.id,created_at:new Date().toISOString(),order}];show();await screen.findByText(/ALA-123/);await waitFor(()=>expect(screen.getAllByText(/Som bloqueado/).length).toBeGreaterThan(0));const button=screen.getByRole('button',{name:'Ativar / testar som'});expect(button.closest('dialog').open).toBe(true);f.play.mockResolvedValue(undefined);fireEvent.click(button);await screen.findByRole('button',{name:'Som ativado'});expect(localStorage.getItem('ala-order-sound')).toBe('on');
});
