import React from 'react';
import {it,expect,vi,afterEach} from 'vitest';
import {render,screen,fireEvent,waitFor,cleanup} from '@testing-library/react';
const f=vi.hoisted(()=>({signup:vi.fn(),reset:vi.fn()}));vi.mock('../src/services/customerAuth',()=>({customerAuth:{auth:{signUp:f.signup,resetPasswordForEmail:f.reset}}}));
import CustomerAccount from '../src/components/CustomerAccount';
afterEach(()=>{cleanup();vi.clearAllMocks();});
it('conta opcional usa confirmação por e-mail e senha de oito caracteres',async()=>{
 f.signup.mockResolvedValue({data:{},error:null});render(<CustomerAccount/>);fireEvent.click(screen.getByRole('button',{name:'Criar conta',exact:true}));fireEvent.change(screen.getByLabelText('E-mail'),{target:{value:'cliente@example.test'}});const password=screen.getByLabelText(/Senha/);expect(password.minLength).toBe(8);fireEvent.change(password,{target:{value:'password8'}});fireEvent.click(screen.getByRole('button',{name:'Criar conta e confirmar e-mail'}));await waitFor(()=>expect(f.signup).toHaveBeenCalledWith({email:'cliente@example.test',password:'password8',options:{emailRedirectTo:location.origin+'/conta/retorno'}}));
});
