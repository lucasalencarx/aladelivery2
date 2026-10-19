import React from 'react';
import {it,expect,vi,afterEach} from 'vitest';
import {render,screen,fireEvent,waitFor,cleanup} from '@testing-library/react';
const f=vi.hoisted(()=>({rpc:vi.fn(),getBrands:vi.fn(),updateBrand:vi.fn()}));
vi.mock('../src/admin/services/adminService',()=>({getBrands:f.getBrands,createBrand:vi.fn(),updateBrand:f.updateBrand,deleteBrand:vi.fn()}));
vi.mock('../src/admin/services/storeManagement',()=>({uploadStoreMedia:vi.fn()}));
vi.mock('../src/supabase/supabase',()=>({supabase:{rpc:f.rpc,from:()=>({select:()=>({order:async()=>({data:[{id:'p1',name:'Cerveja Heineken',active:true,brand_id:null},{id:'p2',name:'Produto inativo',active:false,brand_id:'brand'}]})})})}}));
import AdminBrands from '../src/admin/pages/AdminBrands';
afterEach(()=>{cleanup();vi.clearAllMocks();});
it('abre produtos pelo contador e salva sugestões sem incluir produto inativo',async()=>{
 HTMLDialogElement.prototype.showModal=function(){this.open=true;};HTMLDialogElement.prototype.close=function(){this.open=false;};
 f.getBrands.mockResolvedValue([{id:'brand',name:'Heineken',active:true,products_count:1,active_products_count:0}]);f.rpc.mockResolvedValue({error:null});render(<AdminBrands/>);const count=await screen.findByRole('button',{name:/0 produtos ativos/});fireEvent.click(count);expect(screen.queryByText('Produto inativo')).toBeNull();fireEvent.click(screen.getByRole('button',{name:'Selecionar 1 sugestão pelo nome'}));fireEvent.click(screen.getByRole('button',{name:'Salvar 1 associação'}));await waitFor(()=>expect(f.rpc).toHaveBeenCalledWith('shop_set_brand_products',{p_brand:'brand',p_products:['p1']}));
});

it('editar logo envia só campos da marca, sem contadores calculados',async()=>{
 HTMLDialogElement.prototype.showModal=function(){this.open=true;};HTMLDialogElement.prototype.close=function(){this.open=false;};
 f.getBrands.mockResolvedValue([{id:'brand',name:'Heineken',slug:'heineken',active:true,featured:false,logo_url:'',products_count:8,active_products_count:5,products:8,created_at:'2026-01-01'}]);
 f.updateBrand.mockResolvedValue({id:'brand'});render(<AdminBrands/>);fireEvent.click(await screen.findByRole('button',{name:'Editar / logo'}));
 fireEvent.change(screen.getByLabelText('URL da logomarca'),{target:{value:'https://example.test/heineken.png'}});fireEvent.click(screen.getByRole('button',{name:'Salvar marca'}));
 await waitFor(()=>expect(f.updateBrand).toHaveBeenCalledWith('brand',expect.objectContaining({logo_url:'https://example.test/heineken.png'})));
 const payload=f.updateBrand.mock.calls[0][1];expect(payload).not.toHaveProperty('active_products_count');expect(payload).not.toHaveProperty('products_count');expect(payload).not.toHaveProperty('products');expect(payload).not.toHaveProperty('id');
});
