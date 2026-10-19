import React from 'react';
import {it,expect,vi,afterEach,beforeEach} from 'vitest';
import {render,screen,fireEvent,cleanup,waitFor} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
const f=vi.hoisted(()=>({toggle:vi.fn(),schedule:vi.fn(),automatic:vi.fn(),save:vi.fn(),load:vi.fn(),upload:vi.fn(),print:vi.fn()}));
vi.mock('../src/admin/context/OperationsContext',()=>({useOperations:()=>({data:{stats:{orders_today:3,revenue_today:125.50},counts:{confirmed:1},visitors:{today:7,total:12},orders:[],inbox:[{id:'order-1',protocol:'ALA-1',customer_name:'Lucas',preview:'Preciso de ajuda',unread:2}],unread_messages:2},refresh:vi.fn(),loading:false})}));
vi.mock('../src/admin/context/AdminContext',()=>({useAdmin:()=>({setSidebarOpen:vi.fn(),storeOpen:true,storeStatus:{manual_override:true,opening_time:'09:00',closing_time:'23:00'},toggleStore:f.toggle,updateStoreSchedule:f.schedule,enableAutomaticStoreStatus:f.automatic})}));
vi.mock('../src/services/storeSettings',()=>({usePublicStoreSettings:()=>({settings:{name:'Loja de teste'}})}));
vi.mock('../src/admin/services/storeManagement',()=>({loadStoreSettings:f.load,saveStoreSettings:f.save,uploadStoreMedia:f.upload}));
vi.mock('../src/utils/orderTools',()=>({printOrder:f.print,whatsappLink:()=>null}));
import AdminDashboard from '../src/admin/pages/AdminDashboard';
import AdminHeader from '../src/admin/components/AdminHeader';
import AdminSettings from '../src/admin/pages/AdminSettings';
beforeEach(()=>{localStorage.clear();f.toggle.mockResolvedValue({success:true});f.schedule.mockResolvedValue({success:true});f.automatic.mockResolvedValue({success:true});f.load.mockResolvedValue({id:1,name:'Minha loja',slogan:'Bebidas geladas',logo_url:'',cnpj:'',whatsapp:'',address:'',announcement:'',banners:[{image:'',alt:'A'},{image:'',alt:'B'},{image:'',alt:'C'}]});f.save.mockResolvedValue(undefined);HTMLDialogElement.prototype.showModal=function(){this.open=true;};HTMLDialogElement.prototype.close=function(){this.open=false;};});
afterEach(()=>{cleanup();vi.clearAllMocks();});
it('oculta receita e memoriza preferência sem remover resumo ou mensagens',async()=>{
 render(<MemoryRouter><AdminDashboard/></MemoryRouter>);expect(screen.getByText(/125,50/)).toBeTruthy();fireEvent.click(screen.getByRole('button',{name:'Ocultar receita paga'}));expect(screen.queryByText(/125,50/)).toBeNull();expect(localStorage.getItem('ala_show_revenue')).toBe('false');expect(screen.getByText('Preciso de ajuda')).toBeTruthy();expect(screen.queryByText('produtos cadastrados')).toBeNull();
});
it('header tem uma área de controle e badge de mensagens com link ao pedido',async()=>{
 render(<MemoryRouter><AdminHeader/></MemoryRouter>);fireEvent.click(screen.getByRole('button',{name:'Mensagens de clientes: 2 não lidas'}));expect(screen.getByText('Preciso de ajuda').closest('a').getAttribute('href')).toContain('pedido=order-1');fireEvent.click(screen.getByRole('button',{name:/Loja aberta/}));expect(screen.getAllByRole('switch')).toHaveLength(1);fireEvent.click(screen.getByRole('switch',{name:'Loja aberta'}));await waitFor(()=>expect(f.toggle).toHaveBeenCalledTimes(1));fireEvent.click(screen.getByRole('button',{name:'Salvar horários'}));await waitFor(()=>expect(f.schedule).toHaveBeenCalledWith(expect.objectContaining({openingTime:'09:00',closingTime:'23:00'})));
});
it('configura nome, aviso e três banners e salva os valores publicados',async()=>{
 render(<AdminSettings/>);await screen.findByLabelText('Nome da loja');fireEvent.change(screen.getByLabelText('Nome da loja'),{target:{value:'Ala Nova'}});fireEvent.change(screen.getByLabelText('Aviso público na vitrine'),{target:{value:'Entrega rápida'}});fireEvent.change(screen.getByLabelText('Descrição do banner 3'),{target:{value:'Promoção de gelo'}});fireEvent.click(screen.getByRole('button',{name:'Salvar e publicar configurações'}));await waitFor(()=>expect(f.save).toHaveBeenCalledWith(expect.objectContaining({name:'Ala Nova',announcement:'Entrega rápida',banners:[{image:'',alt:'A'},{image:'',alt:'B'},{image:'',alt:'Promoção de gelo'}]})));
});

it('envia a logo, aguarda upload e salva URL pública nas configurações',async()=>{
 f.upload.mockResolvedValue({image_url:'https://example.test/logo.webp'});render(<AdminSettings/>);await screen.findByLabelText('Nome da loja');const input=screen.getAllByText('Enviar imagem')[0].closest('label').querySelector('input');fireEvent.change(input,{target:{files:[new File(['image'],'logo.webp',{type:'image/webp'})]}});await waitFor(()=>expect(screen.getByAltText('Logomarca').getAttribute('src')).toBe('https://example.test/logo.webp'));fireEvent.click(screen.getByRole('button',{name:'Salvar e publicar configurações'}));await waitFor(()=>expect(f.save).toHaveBeenCalledWith(expect.objectContaining({logo_url:'https://example.test/logo.webp'})));
});
