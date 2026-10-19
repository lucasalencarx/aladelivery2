import {useEffect,useRef,useState} from 'react';
import {customerAuth,nationalPhone} from '../services/customerAuth';
import {commerce} from '../services/commerceApi';
import './customer-orders.css';
const money=v=>Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
export default function LoyaltyBenefit({phone,subtotal,onOffer}){
 const [verified,setVerified]=useState(null),[offer,setOffer]=useState(null),[error,setError]=useState('');const callback=useRef(onOffer);callback.current=onOffer;
 useEffect(()=>{let live=true;customerAuth.auth.getSession().then(({data})=>{if(live)setVerified(data.session?nationalPhone(data.session.user.phone):null);});const {data:{subscription}}=customerAuth.auth.onAuthStateChange((e,s)=>{if(live)setVerified(s?nationalPhone(s.user.phone):null);});return()=>{live=false;subscription.unsubscribe();};},[]);
 useEffect(()=>{let live=true;setOffer(null);setError('');callback.current(null);if(!verified||verified!==nationalPhone(phone))return;commerce('/customer/loyalty',{customer:true}).then(r=>{if(!live)return;setOffer(r);if(r.available&&subtotal>=r.min_order)callback.current(r);}).catch(e=>{if(live)setError(e.message);});return()=>{live=false;};},[verified,phone,subtotal]);
 if(!offer?.available)return null;
 return <section className="loyalty-banner"><strong>Presente da loja: {offer.value}% de desconto</strong><p>{offer.reason}</p><small>{subtotal>=offer.min_order?'Benefício disponível para aplicar automaticamente no resumo.':`Disponível a partir de ${money(offer.min_order)} em produtos.`} Máximo {money(offer.max_discount)} · válido até {new Date(offer.expires_at).toLocaleDateString('pt-BR')}</small>{error&&<p role="alert">{error}</p>}</section>;
}
