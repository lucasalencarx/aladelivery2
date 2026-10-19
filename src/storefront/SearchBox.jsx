import { useEffect, useRef, useState } from 'react';
import { Search, X, ArrowUpRight } from 'lucide-react';
import ProductImage from './ProductImage';
import { getProductPrice, money } from '../utils/commerce';
const fold=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
export default function SearchBox({query,onSearch,products=[],onSelect}){
 const [open,setOpen]=useState(false),[active,setActive]=useState(-1),wrap=useRef(null),input=useRef(null),pending=useRef(null);
 const matches=products.filter(p=>!query.trim()||fold(`${p.name} ${p.category_name||''}`).includes(fold(query.trim()))).slice(0,6);
 useEffect(()=>()=>pending.current?.(),[]);
 useEffect(()=>{if(!open)return;let frame;const viewport=window.visualViewport;
  const size=()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>{if(!wrap.current)return;const rect=wrap.current.getBoundingClientRect();wrap.current.style.setProperty('--sf-search-space',`${Math.min(360,Math.max(110,(viewport?viewport.height+viewport.offsetTop:innerHeight)-rect.bottom-12))}px`);});};
  const outside=event=>{if(!wrap.current?.contains(event.target)){setOpen(false);input.current?.blur();}};
  document.documentElement.classList.add('sf-search-active');document.addEventListener('pointerdown',outside,true);viewport?.addEventListener('resize',size);viewport?.addEventListener('scroll',size);window.addEventListener('resize',size);size();
  return()=>{document.documentElement.classList.remove('sf-search-active');document.removeEventListener('pointerdown',outside,true);viewport?.removeEventListener('resize',size);viewport?.removeEventListener('scroll',size);window.removeEventListener('resize',size);cancelAnimationFrame(frame);};
 },[open]);
 function dismissThen(action){setOpen(false);setActive(-1);input.current?.blur();pending.current?.();const viewport=window.visualViewport;let timer,done=false;
  const cleanup=()=>{clearTimeout(timer);viewport?.removeEventListener('resize',resized);};
  const finish=()=>{if(done)return;done=true;cleanup();pending.current=null;action();};
  const resized=()=>{if(!viewport||viewport.height>=innerHeight*.85)finish();};
  pending.current=()=>{done=true;cleanup();};
  if(viewport&&viewport.height<innerHeight*.85){viewport.addEventListener('resize',resized);timer=setTimeout(finish,350);}else timer=setTimeout(finish,80);
 }
 function choose(product){dismissThen(()=>onSelect?.(product));}
 function submit(event){event?.preventDefault();dismissThen(()=>{onSearch(query);document.getElementById('vitrine')?.scrollIntoView({block:'start',behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});});}
 function keys(event){if(event.key==='Escape'){event.preventDefault();setOpen(false);input.current?.blur();return;}if(event.key==='ArrowDown'){event.preventDefault();setOpen(true);setActive(i=>Math.min(i+1,matches.length-1));}if(event.key==='ArrowUp'){event.preventDefault();setActive(i=>Math.max(i-1,0));}if(event.key==='Enter'&&open&&active>=0&&matches[active]){event.preventDefault();choose(matches[active]);}}
 return <div ref={wrap} className="sf-search-wrap"><form className="searchArea" role="search" onSubmit={submit}><Search size={20} className="searchIcon"/><input ref={input} type="search" enterKeyHint="search" autoComplete="off" autoCorrect="off" spellCheck={false} placeholder="O que você quer beber hoje?" aria-label="Buscar produtos" role="combobox" aria-autocomplete="list" aria-expanded={open} aria-controls="sf-search-suggestions" aria-activedescendant={open&&active>=0?`sf-suggestion-${active}`:undefined} value={query} onFocus={()=>setOpen(true)} onKeyDown={keys} onChange={event=>{setActive(-1);setOpen(true);onSearch(event.target.value);}}/>{query&&<button type="button" className="sf-search-clear" aria-label="Limpar busca" onClick={()=>{onSearch('');setActive(-1);input.current?.focus();}}><X size={15}/></button>}<button type="submit" className="searchHint">Buscar</button></form>{open&&<div className="sf-search-panel"><div className="sf-search-panel-head"><strong>{query.trim()?'Produtos encontrados':'Sugestões de bebidas'}</strong><button type="button" aria-label="Fechar sugestões" onClick={()=>{setOpen(false);input.current?.blur();}}><X size={16}/></button></div><div id="sf-search-suggestions" role="listbox" aria-label="Sugestões de produtos">{matches.map((p,index)=><button key={p.id} type="button" role="option" aria-selected={active===index} id={`sf-suggestion-${index}`} className="sf-suggestion" onMouseDown={event=>event.preventDefault()} onClick={()=>choose(p)}><span className="sf-suggestion-photo"><ProductImage product={p}/></span><span><strong>{p.name}</strong><small>{p.category_name||'Produtos'}</small></span><b>{money(getProductPrice(p))}</b><ArrowUpRight size={15}/></button>)}{!matches.length&&<p className="sf-search-no-results">Nenhum produto encontrado. Tente outro nome.</p>}</div>{query.trim()&&matches.length>0&&<button type="button" className="sf-all-results" onClick={submit}>Ver todos os resultados <ArrowUpRight size={14}/></button>}</div>}</div>;
}
