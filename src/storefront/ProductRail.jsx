import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import ProductCard from './ProductCard';
import { sectionIcon } from './sectionIcons';
function ProductRow({products,name,row,onDetails}) {
 const rail=useRef(null),drag=useRef(null),track=useRef(null),suppress=useRef(false),[position,setPosition]=useState({left:false,right:false,});
 function measure(){const node=rail.current;if(!node)return;const max=Math.max(0,node.scrollWidth-node.clientWidth);node.dataset.overflow=max>1?"true":"false";if(track.current)track.current.style.transform=`translateX(${(max?node.scrollLeft/max:0)*200}%)`;const left=node.scrollLeft>2,right=node.scrollLeft<max-2;setPosition(previous=>previous.left===left&&previous.right===right?previous:{left,right});}
 useEffect(()=>{measure();const observer=new ResizeObserver(measure);observer.observe(rail.current);return()=>observer.disconnect();},[products.length]);
 function move(direction){const node=rail.current;node?.scrollBy({left:direction*node.clientWidth*.85,behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});}
 function down(e){suppress.current=false;if(e.pointerType!=='mouse'||e.button!==0)return;drag.current={id:e.pointerId,x:e.clientX,left:rail.current.scrollLeft,moved:false};}
 function dragMove(e){const current=drag.current;if(!current||current.id!==e.pointerId)return;const delta=e.clientX-current.x;if(Math.abs(delta)>3&&!current.moved){current.moved=true;suppress.current=true;rail.current.dataset.dragging='true';rail.current.setPointerCapture(e.pointerId);}if(current.moved){e.preventDefault();rail.current.scrollLeft=current.left-delta;}}
 function up(e){if(drag.current?.id!==e.pointerId)return;drag.current=null;delete rail.current.dataset.dragging;if(rail.current.hasPointerCapture(e.pointerId))rail.current.releasePointerCapture(e.pointerId);}
 return <div className="sf-independent-row"><div ref={rail} className="sf-product-rail sf-single-row" role="region" aria-label={`Produtos de ${name}, linha ${row}`} tabIndex={0} onDragStart={e=>e.preventDefault()} onScroll={measure} onPointerDown={down} onPointerMove={dragMove} onPointerUp={up} onPointerCancel={up} onClickCapture={e=>{if(suppress.current){suppress.current=false;e.preventDefault();e.stopPropagation();}}} onKeyDown={e=>{if(e.target!==rail.current)return;if(e.key==='ArrowRight'){e.preventDefault();move(1);}if(e.key==='ArrowLeft'){e.preventDefault();move(-1);}}}>{products.map(product=><ProductCard key={product.id} product={product} onDetails={onDetails}/>)}</div>{(position.left||position.right)&&<div className="sf-row-controls"><div className="sf-rail-track" aria-hidden="true"><span ref={track}/></div><div className="sf-rail-actions"><button aria-label={`Voltar produtos de ${name}, linha ${row}`} disabled={!position.left} onClick={()=>move(-1)}><ChevronLeft size={16}/></button><button aria-label={`Avançar produtos de ${name}, linha ${row}`} disabled={!position.right} onClick={()=>move(1)}><ChevronRight size={16}/></button></div></div>}</div>;
}
export default function ProductRail({section,onDetails}) {
 const Icon=sectionIcon(section.name);
 // Preserva a disposição anterior: itens pares na primeira linha, ímpares na segunda.
 const rows=[section.products.filter((_,i)=>i%2===0),section.products.filter((_,i)=>i%2===1)];
 return <section className="sf-section" id={`sf-section-${section.id}`}><div className="sf-section-heading"><div><h2><Icon size={19}/>{section.name}</h2></div><span>{section.products.length} {section.products.length===1?'produto':'produtos'}</span></div><div className="sf-independent-rows">{rows.filter(products=>products.length).map((products,index)=><ProductRow key={index} products={products} name={section.name} row={index+1} onDetails={onDetails}/>)}</div></section>;
}
