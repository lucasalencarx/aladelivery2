// Independent of browser traffic. A failed gateway call never confirms/cancels an order.
export function startReconciliation({loadBatch,check,onError=()=>{},interval=15000}) {
 let busy=false,stopped=false;
 async function tick(){
  if(busy||stopped)return;busy=true;
  try{for(const order of await loadBatch()){if(stopped)break;try{await check(order);}catch(e){onError(e);}}}
  catch(e){onError(e);}finally{busy=false;}
 }
 const first=setTimeout(tick,0),timer=setInterval(tick,interval);
 first.unref?.();timer.unref?.();
 return ()=>{stopped=true;clearTimeout(first);clearInterval(timer);};
}
