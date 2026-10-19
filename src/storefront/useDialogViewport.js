import {useEffect} from 'react';
export default function useDialogViewport(ref,enabled){
 useEffect(()=>{
  const dialog=ref.current,viewport=window.visualViewport;
  if(!enabled||!dialog)return;
  let frame,settle;
  function reveal(){
   if(viewport&&Math.abs((viewport.scale||1)-1)>.05)return;
   const field=document.activeElement,scroller=field?.closest?.('.checkoutContent');
   if(!dialog.contains(field)||!field?.matches('input,textarea,select')||!scroller)return;
   const fieldBox=field.getBoundingClientRect(),box=scroller.getBoundingClientRect(),padding=18;
   const delta=fieldBox.bottom>box.bottom-padding?fieldBox.bottom-box.bottom+padding:fieldBox.top<box.top+padding?fieldBox.top-box.top-padding:0;
   // Move only the inner scroll area, never the page/visual viewport.
   if(Math.abs(delta)>1)scroller.scrollTop+=delta;
  }
  function queueReveal(){clearTimeout(settle);settle=setTimeout(reveal,200);}
  function update(){
   cancelAnimationFrame(frame);
   frame=requestAnimationFrame(()=>{
    if(viewport&&Math.abs((viewport.scale||1)-1)>.05)return;
    const height=Math.round(viewport?.height||window.innerHeight),top=Math.round(viewport?.offsetTop||0);
    if(dialog.style.getPropertyValue('--sf-visible-height')!==height+'px')dialog.style.setProperty('--sf-visible-height',height+'px');
    if(dialog.style.getPropertyValue('--sf-visible-top')!==top+'px')dialog.style.setProperty('--sf-visible-top',top+'px');
    queueReveal();
   });
  }
  update();viewport?.addEventListener('resize',update);window.addEventListener('resize',update);dialog.addEventListener('focusin',queueReveal);
  // Do not listen to viewport scroll: scrolling a focused input can emit another
  // scroll event and create a resize/scrollIntoView feedback loop on mobile.
  return()=>{clearTimeout(settle);cancelAnimationFrame(frame);viewport?.removeEventListener('resize',update);window.removeEventListener('resize',update);dialog.removeEventListener('focusin',queueReveal);dialog.style.removeProperty('--sf-visible-height');dialog.style.removeProperty('--sf-visible-top');};
 },[ref,enabled]);
}
