import React from 'react';
import {it,expect,vi,afterEach} from 'vitest';
import {render,screen,fireEvent,waitFor,cleanup} from '@testing-library/react';
const f=vi.hoisted(()=>({commerce:vi.fn()}));vi.mock('../src/services/commerceApi',()=>({commerce:f.commerce}));
import OrderWhatsAppLink from '../src/components/OrderWhatsAppLink';
afterEach(()=>{cleanup();vi.restoreAllMocks();f.commerce.mockReset();});
const order={id:'order-1',protocol:'ALA-1',customer_name:'Lucas',customer_phone:'67999999999',order_status:'preparing'};
it('busca link privado com autenticação antes de abrir mensagem da lista admin',async()=>{
 const popup={location:{href:''},close:vi.fn()};vi.spyOn(window,'open').mockReturnValue(popup);f.commerce.mockResolvedValue({tracking_url:'https://loja.test/rastrear#id=order-1&token=secret'});render(<OrderWhatsAppLink order={order}>WhatsApp</OrderWhatsAppLink>);fireEvent.click(screen.getByText('WhatsApp'));await waitFor(()=>expect(popup.location.href).toContain('wa.me'));expect(f.commerce).toHaveBeenCalledWith('/admin/orders/order-1/tracking',{admin:true});expect(new URL(popup.location.href).searchParams.get('text')).toContain('token=secret');expect(popup.opener).toBeNull();
});
it('falha de acesso impede mensagem sem link e informa o problema',async()=>{
 const popup={location:{href:''},close:vi.fn()};vi.spyOn(window,'open').mockReturnValue(popup);f.commerce.mockRejectedValue(Error('Entre no painel.'));render(<OrderWhatsAppLink order={order}>WhatsApp</OrderWhatsAppLink>);fireEvent.click(screen.getByText('WhatsApp'));await screen.findByRole('alert');expect(popup.close).toHaveBeenCalled();expect(popup.location.href).toBe('');
});
