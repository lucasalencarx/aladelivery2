import React from 'react';
import {it,expect,vi,beforeEach,afterEach} from 'vitest';
import {render,screen,fireEvent,cleanup,waitFor,within} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
const media=vi.hoisted(()=>({uploadStoreMedia:vi.fn()}));
vi.mock('../src/admin/services/storeManagement',()=>media);
const api=vi.hoisted(()=>({getCategories:vi.fn(),getCategoryProductCounts:vi.fn(),getProductsByCategory:vi.fn(),getProducts:vi.fn(),getActiveBrands:vi.fn(),createCategory:vi.fn(),deleteCategory:vi.fn(),toggleCategoryStatus:vi.fn(),updateCategory:vi.fn(),addProductStock:vi.fn(),createProduct:vi.fn(),deleteProduct:vi.fn(),getProductByBarcode:vi.fn(),updateProduct:vi.fn()}));
vi.mock('../src/admin/services/adminService',()=>api);
import AdminCategories from '../src/admin/pages/AdminCategories';
import AdminProducts from '../src/admin/pages/AdminProducts';
import CategoryImage from '../src/components/CategoryImage';
const category={id:'cat-1',name:'Churrasco',slug:'churrasco',active:true};
const product={id:'prod-1',name:'Picanha',price:60,stock:4,active:true,category_id:'cat-1'};
beforeEach(()=>{HTMLDialogElement.prototype.showModal=function(){this.open=true;};HTMLDialogElement.prototype.close=function(){this.open=false;};api.getCategories.mockResolvedValue([category]);api.getCategoryProductCounts.mockResolvedValue({'cat-1':2});api.getProductsByCategory.mockResolvedValue([product,{...product,id:'prod-2',name:'Carvão',active:false,stock:0}]);api.getProducts.mockResolvedValue([product,{...product,id:'other',name:'Outra categoria',category_id:'cat-2'}]);api.getActiveBrands.mockResolvedValue([]);});
afterEach(()=>{cleanup();vi.clearAllMocks();});
it('abre produtos da categoria, filtra inativos e oferece edição e cadastro na categoria correta',async()=>{
 render(<MemoryRouter><AdminCategories/></MemoryRouter>);
 fireEvent.click(await screen.findByRole('button',{name:'Ver produtos de Churrasco'}));
 await screen.findByText('Picanha');expect(api.getProductsByCategory).toHaveBeenCalledWith('cat-1');
 expect(screen.getByRole('link',{name:'Editar Picanha'}).getAttribute('href')).toBe('/admin/products?category=cat-1&edit=prod-1');
 expect(screen.getByRole('link',{name:'Adicionar produto'}).getAttribute('href')).toBe('/admin/products?category=cat-1&new=1');
 fireEvent.change(screen.getByLabelText('Status dos produtos'),{target:{value:'inactive'}});
 expect(screen.queryByText('Picanha')).toBeNull();expect(screen.getByText('Carvão')).toBeTruthy();
});
it('link de edição abre cadastro do produto mantendo a categoria filtrada',async()=>{
 render(<MemoryRouter initialEntries={['/admin/products?category=cat-1&edit=prod-1']}><AdminProducts/></MemoryRouter>);
 await waitFor(()=>expect(document.querySelector('.productFormField input')?.value).toBe('Picanha'));
 expect(screen.queryByText('Outra categoria')).toBeNull();expect(document.querySelector('.catalogFilterSelect').value).toBe('cat-1');
});
it('categoria nova ou imagem quebrada sempre recebe imagem alternativa',()=>{
 const {rerender}=render(<CategoryImage category={{name:'Energéticos'}}/>);expect(screen.getByRole('img').getAttribute('src')).toContain('energeticos-261');
 rerender(<CategoryImage category={{name:'Especial',image_url:'https://invalid.test/foto.png'}}/>);
 fireEvent.error(screen.getByRole('img'));expect(screen.getByRole('img').getAttribute('src')).toBe('/categories/default.svg');
});

it('envia capa e salva a URL no cadastro da categoria',async()=>{
 media.uploadStoreMedia.mockResolvedValue({image_url:'https://example.test/capa.webp'});
 api.updateCategory.mockImplementation(async(id,payload)=>({...category,...payload}));
 render(<MemoryRouter><AdminCategories/></MemoryRouter>);
 fireEvent.click(await screen.findByTitle('Editar categoria'));
 fireEvent.change(screen.getByLabelText('Selecionar foto de capa'),{target:{files:[new File(['image'],'capa.webp',{type:'image/webp'})]}});
 await waitFor(()=>expect(screen.getByLabelText('URL da imagem (opcional; vazia usa imagem automática)').value).toBe('https://example.test/capa.webp'));
 fireEvent.click(screen.getByRole('button',{name:'Salvar alterações'}));
 await waitFor(()=>expect(api.updateCategory).toHaveBeenCalledWith('cat-1',expect.objectContaining({image_url:'https://example.test/capa.webp'})));
});
