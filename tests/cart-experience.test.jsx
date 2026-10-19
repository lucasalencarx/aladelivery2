import React from 'react';
import {it,expect,vi,afterEach} from 'vitest';
import {render,screen,fireEvent,cleanup,act} from '@testing-library/react';
import {CartProvider,useCart} from '../src/contexts/CartContext';
import ProductDetails from '../src/storefront/ProductDetails';
vi.mock('../src/storefront/AnimatedDialog',()=>({default:({children})=><div>{children}</div>}));
afterEach(()=>{cleanup();localStorage.clear();vi.useRealTimers();});
const product={id:'p1',name:'Heineken 350ml',price:10,stock:10,active:true};
function Harness(){const c=useCart();return <><ProductDetails product={product} open onClose={()=>{}} onAdded={c.openCart}/><output>{c.cartOpen?'Carrinho aberto':'Carrinho fechado'}</output><button onClick={c.closeCart}>Fechar sacola</button><button onClick={c.clearCart}>Limpar</button><span data-testid="notice">{c.notification?.message}</span><span data-testid="quantity">{c.totalItems}</span></>;}
it('adiciona a quantidade escolhida, abre carrinho e conserva aviso até fechar',()=>{vi.useFakeTimers();render(<CartProvider><Harness/></CartProvider>);fireEvent.click(screen.getByLabelText('Aumentar quantidade'));fireEvent.click(screen.getByRole('button',{name:/Adicionar/}));expect(screen.getByTestId('quantity').textContent).toBe('2');expect(screen.getByText('Carrinho aberto')).toBeTruthy();act(()=>vi.advanceTimersByTime(20000));expect(screen.getByTestId('notice').textContent).toContain('adicionado');fireEvent.click(screen.getByText('Fechar sacola'));expect(screen.getByTestId('notice').textContent).toContain('adicionado');act(()=>vi.advanceTimersByTime(4500));expect(screen.getByTestId('notice').textContent).toBe('');});
it('limpar carrinho persiste vazio e elimina confirmação antiga',()=>{render(<CartProvider><Harness/></CartProvider>);fireEvent.click(screen.getByRole('button',{name:/Adicionar/}));fireEvent.click(screen.getByText('Limpar'));expect(screen.getByTestId('quantity').textContent).toBe('0');expect(screen.getByTestId('notice').textContent).toBe('');expect(JSON.parse(localStorage.getItem('ala-delivery-cart-v2')||'[]')).toEqual([]);});
