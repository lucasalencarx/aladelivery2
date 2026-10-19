import {useEffect,useState} from 'react';
import {Star} from 'lucide-react';
import {commerce} from '../services/commerceApi';
export default function OrderReview({id,token}){
 const [rating,setRating]=useState(0),[comment,setComment]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[note,setNote]=useState('');
 useEffect(()=>{let live=true;commerce('/orders/'+id+'/review',{token}).then(({review})=>{if(live&&review){setRating(review.rating);setComment(review.comment);}}).catch(()=>{});return()=>{live=false;};},[id,token]);
 async function save(e){e.preventDefault();setBusy(true);setError('');try{await commerce('/orders/'+id+'/review',{token,method:'POST',body:JSON.stringify({rating,comment})});setNote('Obrigado! Sua avaliação foi enviada para a loja.');}catch(e){setError(e.message);}finally{setBusy(false);}}
 return <section className="oc-card op-review"><h2>Como foi sua entrega?</h2><p>Sua opinião ajuda a loja a melhorar.</p><form onSubmit={save}><div className="op-review-stars" role="group" aria-label="Nota da entrega">{[1,2,3,4,5].map(n=><button key={n} type="button" aria-label={n+' estrelas'} aria-pressed={rating===n} onClick={()=>setRating(n)}><Star size={26} fill={n<=rating?'#ffc800':'none'} color={n<=rating?'#b18b00':'#bbb'}/></button>)}</div><textarea aria-label="Comentário sobre a entrega" maxLength={2000} value={comment} onChange={e=>setComment(e.target.value)} placeholder="Quer deixar um comentário? (opcional)"/><button className="oc-button oc-primary" disabled={busy||rating===0}>{busy?'Enviando…':'Enviar avaliação'}</button></form>{error&&<p role="alert">{error}</p>}{note&&<p role="status">{note}</p>}</section>;
}
