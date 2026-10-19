import React from 'react';
import {it,expect,vi,afterEach} from 'vitest';
import {render,screen,fireEvent,waitFor,cleanup} from '@testing-library/react';
const f=vi.hoisted(()=>({offer:vi.fn(),send:vi.fn(),verify:vi.fn(),session:null}));
vi.mock('../src/services/commerceApi',()=>({commerce:f.offer}));
vi.mock('../src/services/customerAuth',()=>({nationalPhone:v=>String(v||'').replace(/^55/,'').replace(/\D/g,''),customerE164:v=>'+55'+v,customerAuth:{auth:{getSession:async()=>({data:{session:f.session}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe:vi.fn()}}}),signInWithOtp:f.send,verifyOtp:f.verify,signOut:vi.fn()}}}));
import LoyaltyBenefit from '../src/components/LoyaltyBenefit';
import PhoneVerification from '../src/components/PhoneVerification';
afterEach(()=>{cleanup();vi.clearAllMocks();f.session=null;});
it('aplica benefício automaticamente apenas para telefone confirmado e mínimo atendido',async()=>{
 f.session={user:{phone:'5567999999999'}};const offer={available:true,code:'FIEL-1',value:5,min_order:30,max_discount:10,reason:'Você já tem 5 pedidos pagos.',expires_at:new Date(Date.now()+86400000).toISOString()};f.offer.mockResolvedValue(offer);const apply=vi.fn();
 const ui=render(<LoyaltyBenefit phone="67999999999" subtotal={40} onOffer={apply}/>);await screen.findByText('Presente da loja: 5% de desconto');await waitFor(()=>expect(apply).toHaveBeenCalledWith(offer));
 ui.rerender(<LoyaltyBenefit phone="67999999999" subtotal={20} onOffer={apply}/>);await screen.findByText(/Disponível a partir/);expect(apply.mock.calls.at(-1)[0]).toBe(null);
});
it('não consulta benefício pelo número digitado sem confirmação',async()=>{
 const apply=vi.fn();render(<LoyaltyBenefit phone="21988888888" subtotal={40} onOffer={apply}/>);await waitFor(()=>expect(apply).toHaveBeenCalledWith(null));expect(screen.queryByText('Já comprou com a gente?')).toBeNull();expect(screen.queryByRole('button',{name:/Confirmar telefone/})).toBeNull();expect(f.offer).not.toHaveBeenCalled();expect(f.send).not.toHaveBeenCalled();
});
it('envia e verifica OTP somente após ações do usuário',async()=>{
 f.send.mockResolvedValue({error:null});f.verify.mockResolvedValue({error:null});render(<PhoneVerification initialPhone="67999999999"/>);expect(f.send).not.toHaveBeenCalled();fireEvent.click(await screen.findByRole('button',{name:'Receber código'}));await screen.findByLabelText('Código SMS');expect(f.send).toHaveBeenCalledWith({phone:'+5567999999999'});fireEvent.change(screen.getByLabelText('Código SMS'),{target:{value:'123456'}});fireEvent.click(screen.getByRole('button',{name:'Confirmar',exact:true}));await waitFor(()=>expect(f.verify).toHaveBeenCalledWith({phone:'+5567999999999',token:'123456',type:'sms'}));expect(document.querySelector('form form')).toBeNull();
});
