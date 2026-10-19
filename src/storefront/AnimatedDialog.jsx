import { useEffect, useRef, useState } from 'react';
import useDialogViewport from './useDialogViewport';
let locks=0,previousOverflow='';
export default function AnimatedDialog({open,onClose,label,drawer=false,dismissible=true,onExited,keepMounted=false,children}){
 const [mounted,setMounted]=useState(open),[visible,setVisible]=useState(false),ref=useRef(null),close=useRef(onClose),exited=useRef(onExited);close.current=onClose;exited.current=onExited;
 useEffect(()=>{
  let timer,frame,second;
  if(open){setMounted(true);frame=requestAnimationFrame(()=>{second=requestAnimationFrame(()=>setVisible(true));});}
  else{setVisible(false);timer=setTimeout(()=>{setMounted(false);exited.current?.();},window.matchMedia('(prefers-reduced-motion: reduce)').matches?20:300);}
  return()=>{clearTimeout(timer);cancelAnimationFrame(frame);cancelAnimationFrame(second);};
 },[open]);
 useEffect(()=>{if(!mounted)return;const dialog=ref.current,previous=document.activeElement;if(locks++===0){previousOverflow=document.body.style.overflow;document.body.style.overflow='hidden';}dialog?.showModal();return()=>{dialog?.close();if(--locks===0)document.body.style.overflow=previousOverflow;previous?.focus?.({preventScroll:true});};},[mounted]);
 useDialogViewport(ref,mounted&&drawer);
 if(!mounted&&!keepMounted)return null;
 return <dialog ref={ref} className={`sf-dialog ${drawer?'sf-drawer':''}`} data-visible={visible} aria-label={label} onCancel={e=>{e.preventDefault();if(dismissible)close.current?.();}} onPointerDown={e=>{if(dismissible&&e.target===ref.current)close.current?.();}}><div className="sf-dialog-inner">{children}</div></dialog>;
}
