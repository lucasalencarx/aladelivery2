import React from 'react';
import {it,expect,vi,afterEach} from 'vitest';
import {render,screen,fireEvent,cleanup,act} from '@testing-library/react';
import BrandMarquee from '../src/storefront/BrandMarquee';
import {suggestedBrand,brandLogoURL} from '../src/utils/brands';
afterEach(()=>{cleanup();vi.useRealTimers();vi.unstubAllGlobals();});
const brands=[{id:'a',name:'Marca A',active:true,active_products_count:3},{id:'b',name:'Marca B',active:true,active_products_count:1}];
it('aguarda intervalo, desliza por etapas e pausa ao interagir, sem duplicar marcas',()=>{
 vi.useFakeTimers();vi.stubGlobal('matchMedia',()=>({matches:false}));const select=vi.fn();render(<BrandMarquee brands={brands} onSelect={select}/>);const rail=screen.getByLabelText('Marcas que amamos').querySelector('.sf-brand-rail');Object.defineProperty(rail,'scrollWidth',{value:1000});Object.defineProperty(rail,'clientWidth',{value:400});rail.scrollTo=vi.fn(({left})=>{rail.scrollLeft=left;});act(()=>vi.advanceTimersByTime(4499));expect(rail.scrollTo).not.toHaveBeenCalled();act(()=>vi.advanceTimersByTime(1));expect(rail.scrollTo).toHaveBeenCalledWith({left:300,behavior:'smooth'});fireEvent.mouseEnter(rail);act(()=>vi.advanceTimersByTime(9000));expect(rail.scrollTo).toHaveBeenCalledTimes(1);expect(screen.getByText('3 produtos')).toBeTruthy();fireEvent.click(screen.getByRole('button',{name:/Marca A: 3 produtos ativos/}));expect(select).toHaveBeenCalledWith(brands[0]);expect(rail.querySelectorAll('button')).toHaveLength(2);
});
it('reduzir movimento desativa avanço automático e mantém navegação manual',()=>{
 vi.useFakeTimers();vi.stubGlobal('matchMedia',()=>({matches:true}));render(<BrandMarquee brands={brands} onSelect={()=>{}}/>);const rail=document.querySelector('.sf-brand-rail');Object.defineProperty(rail,'scrollWidth',{value:1000});Object.defineProperty(rail,'clientWidth',{value:400});rail.scrollTo=vi.fn();act(()=>vi.advanceTimersByTime(9000));expect(rail.scrollTo).not.toHaveBeenCalled();fireEvent.click(screen.getByRole('button',{name:'Próximas marcas'}));expect(rail.scrollTo).toHaveBeenCalledWith({left:300,behavior:'auto'});
});
it('sugere por palavras completas, apenas ativos sem marca, priorizando nome mais específico',()=>{
 const b=[{id:1,name:'Heineken',active:true},{id:2,name:'Heineken Zero',active:true}];expect(suggestedBrand({name:'Cerveja Heineken Zero 350 ml',active:true},b).id).toBe(2);expect(suggestedBrand({name:'Heineken',active:false},b)).toBeNull();expect(suggestedBrand({name:'Heineken',active:true,brand_id:'other'},b)).toBeNull();expect(suggestedBrand({name:'Heinekenzinha',active:true},b)).toBeNull();expect(brandLogoURL({name:'Teste',logo_url:'https://example.test/logo.png'})).toContain('example.test');
});
