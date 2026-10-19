import React from 'react';
import {it,expect,afterEach} from 'vitest';
import {render,screen,cleanup} from '@testing-library/react';
import StoreFooter from '../src/storefront/StoreFooter';
afterEach(cleanup);
it('rodapé mostra dados reais da loja e abre mapa do endereço cadastrado',()=>{
 render(<StoreFooter settings={{name:'Minha loja',address:'Rua América, 100, Corumbá - MS',cnpj:'12.345.678/0001-90',whatsapp:'67999999999'}} status={{opening_time:'09:00:00',closing_time:'23:00:00'}}/>);
 expect(screen.getByText('CNPJ: 12.345.678/0001-90')).toBeTruthy();const map=new URL(screen.getByRole('link',{name:/Ver loja no mapa/}).href);expect(map.searchParams.get('query')).toBe('Rua América, 100, Corumbá - MS');expect(screen.getByRole('link',{name:'Fale com a loja'}).href).toBe('https://wa.me/5567999999999');expect(screen.queryByText('Onde aplico meu cupom?')).toBeNull();
});
it('não inventa endereço, CNPJ ou localização quando não foram cadastrados',()=>{render(<StoreFooter/>);expect(screen.queryByRole('link',{name:/Ver loja no mapa/})).toBeNull();expect(screen.queryByText(/CNPJ:/)).toBeNull();expect(screen.getByText('Compra segura')).toBeTruthy();});
