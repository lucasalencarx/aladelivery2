import React,{useState} from 'react';
import {it,expect,vi,afterEach} from 'vitest';
import {render,screen,fireEvent,cleanup,waitFor,act} from '@testing-library/react';
import SearchBox from '../src/storefront/SearchBox';
import useLiveLocation from '../src/courier/useLiveLocation';
import LiveDeliveryMap,{locationAge} from '../src/tracking/LiveDeliveryMap';
const f=vi.hoisted(()=>({commerce:vi.fn()}));
vi.mock('../src/services/commerceApi',()=>({commerce:f.commerce}));
vi.mock('../src/tracking/DeliveryMap',()=>({default:()=> <div>MAPA GPS</div>}));
afterEach(()=>{cleanup();vi.useRealTimers();vi.unstubAllGlobals();vi.restoreAllMocks();f.commerce.mockReset();});
it('busca vazia não mostra sugestões; coc filtra e limpar recolhe',()=>{
 vi.stubGlobal('requestAnimationFrame',fn=>setTimeout(fn,0));vi.stubGlobal('cancelAnimationFrame',clearTimeout);
 function Search(){const [q,setQ]=useState('');return <SearchBox query={q} onSearch={setQ} products={[{id:'a',name:'Coca-Cola',price:8},{id:'b',name:'Heineken',price:10}]}/>;}
 render(<Search/>);const input=screen.getByRole('combobox');fireEvent.focus(input);expect(screen.queryByRole('listbox')).toBeNull();
 fireEvent.keyDown(input,{key:'ArrowDown'});expect(screen.queryByRole('listbox')).toBeNull();
 fireEvent.change(input,{target:{value:'coc'}});expect(screen.getByRole('option').textContent).toContain('Coca-Cola');expect(screen.queryByText('Heineken')).toBeNull();
 fireEvent.click(screen.getByRole('button',{name:'Limpar busca'}));expect(screen.queryByRole('listbox')).toBeNull();
});
it('GPS continua após aviso de proximidade e encerra o watch ao desmontar',async()=>{
 vi.useFakeTimers();vi.stubGlobal('isSecureContext',true);let success;
 const clearWatch=vi.fn();vi.stubGlobal('navigator',{geolocation:{watchPosition:vi.fn(fn=>{success=fn;return 7;}),clearWatch}});
 const api=vi.fn().mockResolvedValue({nearby:true}),ended=vi.fn();
 function Gps(){const note=useLiveLocation('order',api,ended);return <p>{note}</p>;}
 const {unmount}=render(<Gps/>);
 await act(async()=>{success({timestamp:Date.now(),coords:{latitude:-19,longitude:-57,accuracy:12}});});
 expect(api).toHaveBeenCalledTimes(1);expect(ended).not.toHaveBeenCalled();expect(screen.getByText(/cliente avisado/)).toBeTruthy();
 await act(async()=>{vi.advanceTimersByTime(15000);});expect(api).toHaveBeenCalledTimes(2);
 unmount();expect(clearWatch).toHaveBeenCalledWith(7);
});
it('rastreador exibe perfil, mapa e erro de conexão sem fingir posição atual',async()=>{
 f.commerce.mockResolvedValue({status:'out_for_delivery',active:true,courier:{name:'João',vehicle:'Moto',plate:'ABC1D23',photo_url:'/foto.jpg'},position:{lat:-19,lng:-57,accuracy:12,updated_at:new Date(Date.now()-60000).toISOString()}});
 render(<LiveDeliveryMap id="order" token="secret"/>);await screen.findByText('João');expect(screen.getByText(/ABC1D23/)).toBeTruthy();expect(screen.getByAltText('Foto de João')).toBeTruthy();expect(screen.getByText(/Sinal desatualizado/)).toBeTruthy();fireEvent.click(screen.getByRole('button',{name:'Rastrear entrega'}));await screen.findByText('MAPA GPS');
 expect(f.commerce).toHaveBeenCalledWith('/orders/order/tracking',expect.objectContaining({token:'secret'}));
});
it('encerrado não mostra posição nem identidade do entregador',async()=>{
 f.commerce.mockResolvedValue({status:'delivered',active:false,courier:null,position:null});render(<LiveDeliveryMap id="order" token="secret"/>);await screen.findByText('Encerrado');expect(screen.queryByRole('button',{name:'Rastrear entrega'})).toBeNull();
 expect(locationAge({updated_at:'invalid'})).toBeNull();
});
