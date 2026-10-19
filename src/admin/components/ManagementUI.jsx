import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Plus, RefreshCw, Search, X, ImagePlus } from 'lucide-react';
import { signedProfilePhoto, uploadProfilePhoto } from '../services/managementService';

export const money = value => Number(value||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
export const dateTime = value => value ? new Date(value).toLocaleString('pt-BR') : '—';
export function messageFor(error) {
  if (['42P01','42703','PGRST202','PGRST205'].includes(error?.code)) return 'A estrutura do banco ainda não está atualizada. Execute os SQLs incluídos no pacote.';
  if (['42501','PGRST301'].includes(error?.code)) return 'Sua conta precisa de acesso administrativo. Confira o login e a configuração de acesso no guia.';
  return error?.message || 'Não foi possível concluir a operação. Tente novamente.';
}
export function useRecords(loader) {
  const [rows,setRows]=useState([]), [loading,setLoading]=useState(true), [error,setError]=useState('');
  const request = useRef(0);
  const reload=useCallback(async()=>{const current=++request.current;setLoading(true);setError('');try{const value=await loader();if(current===request.current)setRows(value||[]);}catch(e){if(current===request.current)setError(messageFor(e));}finally{if(current===request.current)setLoading(false);}},[loader]);
  useEffect(()=>{reload();return()=>{request.current++;};},[reload]);
  return {rows,setRows,loading,error,setError,reload};
}
export function Notice({children,kind='error'}) {return children?<div className={`ux-notice ${kind}`} role={kind==='error'?'alert':'status'}>{children}</div>:null;}
export function Stats({items}) {return <div className="ux-stats">{items.map(([label,value,note])=><div className="ux-stat" key={label}><span>{label}</span><strong>{value}</strong>{note&&<small>{note}</small>}</div>)}</div>;}
export function Toolbar({query,setQuery,placeholder='Buscar...',reload,loading,children}) {return <div className="ux-toolbar"><label className="ux-search"><Search size={18}/><input aria-label={placeholder} placeholder={placeholder} value={query} onChange={e=>setQuery(e.target.value)}/></label>{children}<button className="ux-button" disabled={loading} onClick={reload}><RefreshCw size={16}/>Atualizar</button></div>;}
export function AddButton({onClick,children}) {return <button className="ux-button primary" onClick={onClick}><Plus size={17}/>{children}</button>;}
export function Empty({loading,text='Nenhum registro encontrado.'}) {return <div className="ux-empty" role="status">{loading?'Carregando registros…':text}</div>;}
export function Field({label,children,...props}) {return <label className="ux-field"><span>{label}</span>{children||<input {...props}/>}</label>;}
export function Modal({title,onClose,children}) {
  const ref=useRef(null),id=useId();
  useEffect(()=>{ref.current?.showModal();const node=ref.current;return()=>node?.close();},[]);
  return <dialog className="ux-modal" ref={ref} aria-labelledby={id} onCancel={e=>{e.preventDefault();onClose();}}><div className="ux-modal-head"><h3 id={id}>{title}</h3><button type="button" className="ux-icon" aria-label="Fechar" onClick={onClose}><X size={20}/></button></div>{children}</dialog>;
}
export function Avatar({name,path,size=44}) {
  const [url,setUrl]=useState(null),[failed,setFailed]=useState(false);
  useEffect(()=>{let live=true;setUrl(null);setFailed(false);signedProfilePhoto(path).then(v=>{if(live)setUrl(v);}).catch(()=>{if(live)setFailed(true);});return()=>{live=false;};},[path]);
  return <span className="ux-avatar" style={{width:size,height:size}}>{url&&!failed?<img src={url} alt={`Foto de ${name}`} onError={()=>setFailed(true)}/>:String(name||'?').split(' ').filter(Boolean).slice(0,2).map(x=>x[0]).join('').toUpperCase()}</span>;
}
export function PhotoField({name,value,onChange,onBusyChange}) {
  const [busy,setBusy]=useState(false),[error,setError]=useState('');
  async function upload(e){const file=e.target.files?.[0];if(!file)return;setBusy(true);onBusyChange?.(true);setError('');try{onChange(await uploadProfilePhoto(file));}catch(err){setError(messageFor(err));}finally{setBusy(false);onBusyChange?.(false);e.target.value='';}}
  return <div className="ux-photo-field"><Avatar name={name} path={value} size={70}/><div><label className="ux-button"><ImagePlus size={16}/>{busy?'Enviando…':'Escolher foto'}<input hidden type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={upload}/></label>{value&&<button className="ux-button" type="button" onClick={()=>onChange('')}>Remover foto</button>}<small>JPG, PNG ou WebP · até 3 MB</small><Notice>{error}</Notice></div></div>;
}
export function Stars({value}) {return <span className="ux-stars" aria-label={`${value} de 5 estrelas`}>{Array.from({length:5},(_,i)=><span key={i} className={i<value?'filled':''}>★</span>)}</span>;}
