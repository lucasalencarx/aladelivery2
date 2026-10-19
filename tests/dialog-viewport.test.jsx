import React,{useRef} from 'react';
import {it,expect,vi,afterEach} from 'vitest';
import {render,act,cleanup} from '@testing-library/react';
import useDialogViewport from '../src/storefront/useDialogViewport';
afterEach(()=>{cleanup();vi.useRealTimers();vi.unstubAllGlobals();});
function Harness(){const ref=useRef(null);useDialogViewport(ref,true);return <div ref={ref} data-testid="drawer"><div className="checkoutContent"><input/></div></div>;}
it('espera teclado estabilizar e rola só o conteúdo, sem reagir a scroll do viewport',()=>{
 vi.useFakeTimers();const viewport=new EventTarget();Object.assign(viewport,{height:800,offsetTop:0,scale:1});vi.stubGlobal('visualViewport',viewport);
 vi.stubGlobal('requestAnimationFrame',fn=>{fn();return 1;});vi.stubGlobal('cancelAnimationFrame',()=>{});
 const {getByTestId,unmount}=render(<Harness/>);const drawer=getByTestId('drawer'),input=drawer.querySelector('input'),scroller=input.parentElement;
 scroller.getBoundingClientRect=()=>({top:70,bottom:330});input.getBoundingClientRect=()=>({top:380,bottom:424});input.scrollIntoView=vi.fn();input.focus();
 act(()=>{viewport.height=360;viewport.offsetTop=24;viewport.dispatchEvent(new Event('resize'));});
 expect(scroller.scrollTop).toBe(0);act(()=>vi.advanceTimersByTime(200));expect(scroller.scrollTop).toBe(112);expect(input.scrollIntoView).not.toHaveBeenCalled();
 act(()=>{viewport.offsetTop=80;viewport.dispatchEvent(new Event('scroll'));vi.advanceTimersByTime(500);});expect(scroller.scrollTop).toBe(112);expect(drawer.style.getPropertyValue('--sf-visible-top')).toBe('24px');
 act(()=>{viewport.height=180;viewport.scale=2;viewport.dispatchEvent(new Event('resize'));});expect(drawer.style.getPropertyValue('--sf-visible-height')).toBe('360px');
 unmount();expect(drawer.style.getPropertyValue('--sf-visible-height')).toBe('');
});
