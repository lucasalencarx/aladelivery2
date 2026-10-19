import { useEffect, useState } from 'react';
import { Smartphone, Share, PlusSquare, X } from 'lucide-react';
import AnimatedDialog from './AnimatedDialog';
let pending=null;
window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();pending=event;});
export default function InstallApp(){
 const standalone=()=>window.matchMedia('(display-mode: standalone)').matches||window.navigator.standalone===true;
 const [installed,setInstalled]=useState(standalone),[open,setOpen]=useState(false),[busy,setBusy]=useState(false);
 useEffect(()=>{const onInstall=()=>{pending=null;setInstalled(true);setOpen(false);};window.addEventListener('appinstalled',onInstall);const media=window.matchMedia('(display-mode: standalone)');const change=()=>setInstalled(standalone());media.addEventListener('change',change);return()=>{window.removeEventListener('appinstalled',onInstall);media.removeEventListener('change',change);};},[]);
 async function install(){if(busy)return;if(!pending){setOpen(true);return;}setBusy(true);try{await pending.prompt();await pending.userChoice;pending=null;}catch{setOpen(true);}finally{setBusy(false);}}
 if(installed)return null;
 const ios=/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
 return <><button className="sf-install-button" disabled={busy} onClick={install}><Smartphone size={16}/>Usar como app</button><AnimatedDialog open={open} onClose={()=>setOpen(false)} label="Instalar Ala Delivery"><div className="sf-install-content"><button className="sf-close" aria-label="Fechar instalação" onClick={()=>setOpen(false)}><X size={18}/></button><Smartphone size={28}/><h2>Ala Delivery na sua tela inicial</h2><p>Abra a loja como um app, direto pelo ícone no celular.</p>{ios?<ol><li><Share size={16}/> Abra o menu Compartilhar do navegador.</li><li><PlusSquare size={16}/> Toque em Adicionar à Tela de Início.</li><li>Confirme em Adicionar.</li></ol>:<p>No menu do navegador, escolha <strong>Instalar app</strong> ou <strong>Adicionar à tela inicial</strong>. Se a opção não aparecer, abra este site no Chrome, Edge ou Safari atualizado.</p>}<button className="sf-primary" onClick={()=>setOpen(false)}>Entendi</button></div></AnimatedDialog></>;
}
