import {it,expect,vi,beforeEach} from 'vitest';
const f=vi.hoisted(()=>({commerce:vi.fn(),session:vi.fn(),credentials:vi.fn()}));
vi.mock('../src/services/commerceApi',()=>({commerce:f.commerce,orderCredentials:f.credentials}));
vi.mock('../src/services/customerAuth',()=>({customerAuth:{auth:{getSession:f.session}},nationalPhone:v=>String(v||'').replace(/\D/g,'').replace(/^55(?=\d{10,11}$)/,'')}));
import {saveCheckoutProfile,readCheckoutProfile,findCheckoutProfile,savedPixProfile} from '../src/services/checkoutProfile';
const profile={name:'Lucas',phone:'67999999999',address:{street:'Rua teste',number:'10',neighborhood:'Centro',city:'Corumbá',state:'MS'}};
beforeEach(()=>{localStorage.clear();vi.clearAllMocks();f.session.mockResolvedValue({data:{session:null}});});
it('reaproveita dados por telefone no aparelho sem salvar CPF, tokens ou pagamento',async()=>{
 saveCheckoutProfile({...profile,document:'cpf',access_token:'secret',payment_method:'pix'});expect(readCheckoutProfile('(67) 99999-9999').name).toBe('Lucas');expect(localStorage.getItem('ala_checkout_profiles_v1')).not.toContain('secret');expect(localStorage.getItem('ala_checkout_profiles_v1')).not.toContain('document');expect(await findCheckoutProfile(profile.phone)).toMatchObject(profile);expect(f.commerce).not.toHaveBeenCalled();
});
it('um telefone diferente não recupera os dados da sessão de outro cliente',async()=>{
 f.session.mockResolvedValue({data:{session:{user:{phone:'+5567888888888'}}}});expect(await findCheckoutProfile(profile.phone)).toBeNull();expect(f.commerce).not.toHaveBeenCalled();
});
it('recupera do servidor somente com sessão do mesmo telefone',async()=>{
 f.session.mockResolvedValue({data:{session:{user:{phone:'+55'+profile.phone}}}});f.commerce.mockResolvedValue({profile});expect(await findCheckoutProfile(profile.phone)).toMatchObject(profile);expect(f.commerce).toHaveBeenCalledWith('/customer/checkout-profile?phone='+profile.phone,{customer:true});
});
it('usa o link privado da última compra para reconhecer clientes anteriores à atualização',async()=>{
 localStorage.setItem('ala_last_order','last-order');f.credentials.mockReturnValue({token:'private'});f.commerce.mockResolvedValue({order:{customer_name:profile.name,customer_phone:profile.phone,address:profile.address}});expect(await findCheckoutProfile(profile.phone)).toMatchObject(profile);expect(f.commerce).toHaveBeenCalledWith('/orders/last-order?summary=1',{token:'private',timeoutMs:6000});
});
it('ignora armazenamento inválido e não mistura nomes de telefones diferentes',()=>{
 localStorage.setItem('ala_checkout_profiles_v1','invalid');expect(readCheckoutProfile(profile.phone)).toBeNull();saveCheckoutProfile(profile);saveCheckoutProfile({...profile,phone:'67988888888',name:'Maria'});expect(readCheckoutProfile(profile.phone).name).toBe('Lucas');expect(readCheckoutProfile('67988888888').name).toBe('Maria');
});

it('reconhece compras anteriores mesmo quando a última compra pertence a outro telefone',async()=>{
 localStorage.setItem('ala_last_order','other');localStorage.setItem('ala_order_older',JSON.stringify({token:'older-token'}));f.credentials.mockImplementation(id=>({token:id+'-token'}));
 f.commerce.mockImplementation(async path=>({order:{customer_name:'Lucas',customer_phone:path.includes('/older')?profile.phone:'21988888888',address:profile.address}}));expect((await findCheckoutProfile(profile.phone)).name).toBe('Lucas');expect(f.commerce).toHaveBeenCalledWith('/orders/older?summary=1',{token:'older-token',timeoutMs:6000});
});
it('preserva referência do CPF ao atualizar nome e endereço e procura em compras anteriores',async()=>{
 const id='11111111-1111-4111-8111-111111111111';saveCheckoutProfile({...profile,document_order_id:id});saveCheckoutProfile({...profile,name:'Lucas atualizado'});expect(readCheckoutProfile(profile.phone).document_order_id).toBe(id);
 localStorage.setItem('ala_last_order','cash');localStorage.setItem('ala_order_'+id,'{}');f.credentials.mockImplementation(id=>({token:id+'-token'}));f.commerce.mockImplementation(async(path,opts)=>({available:JSON.parse(opts.body).reference?.id===id}));const pix=await savedPixProfile(profile.phone,readCheckoutProfile(profile.phone));expect(pix.available).toBe(true);expect(pix.reference.id).toBe(id);
});
