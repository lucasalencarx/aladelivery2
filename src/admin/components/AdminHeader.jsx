import {useState} from 'react';
import {Link} from 'react-router-dom';
import {ExternalLink,Menu,MessageCircle,ChevronDown} from 'lucide-react';
import {useAdmin} from '../context/AdminContext';
import {useOperations} from '../context/OperationsContext';
import {usePublicStoreSettings} from '../../services/storeSettings';
import StoreControl from './StoreControl';
export default function AdminHeader(){
 const {setSidebarOpen}=useAdmin(),{data,error}=useOperations(),[inbox,setInbox]=useState(false),config=usePublicStoreSettings()?.settings;
 return <header className="adminTopbar op-topbar"><button className="adminMobileMenu" aria-label="Abrir menu" onClick={()=>setSidebarOpen(true)}><Menu size={21}/></button><div className="op-brand"><span>PAINEL DA LOJA</span><strong>{config?.name||'Ala Delivery'}</strong><small>Pedidos e atendimento em um só lugar</small></div><div className="op-top-actions"><StoreControl/><div className="op-inbox-wrapper"><button type="button" className="op-inbox-button" aria-label={`Mensagens de clientes: ${data.unread_messages||0} não lidas`} aria-expanded={inbox} onClick={()=>setInbox(v=>!v)}><MessageCircle size={21}/>{data.unread_messages>0&&<b>{data.unread_messages>99?'99+':data.unread_messages}</b>}<ChevronDown size={12}/></button>{inbox&&<section className="op-inbox-popover" aria-label="Mensagens não lidas"><header><strong>Conversas dos pedidos</strong><button onClick={()=>setInbox(false)} aria-label="Fechar mensagens">×</button></header>{error?<p>Não foi possível atualizar as mensagens.</p>:!data.inbox?.length?<p>Nenhuma mensagem não lida.</p>:data.inbox.map(m=><Link key={m.id} to={'/admin/orders?pedido='+m.id+'&chat=1'} onClick={()=>setInbox(false)}><div><strong>{m.customer_name}</strong><small>{m.protocol}</small><p>{m.preview}</p></div><b>{m.unread}</b></Link>)}</section>}</div><a href="/" target="_blank" rel="noopener noreferrer" className="op-view-store">Ver loja <ExternalLink size={14}/></a></div></header>;
}
