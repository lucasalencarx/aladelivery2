import {useState} from 'react';
import {ImagePlus} from 'lucide-react';
import {uploadStoreMedia} from '../services/storeManagement';
export default function StoreImageField({label,value,onChange,onBusy,suggestion}){
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 async function upload(e){const file=e.target.files?.[0];if(!file)return;setBusy(true);onBusy?.(1);setError('');try{const image=await uploadStoreMedia(file,label);onChange(image.image_url);}catch(e){setError(e.message);}finally{setBusy(false);onBusy?.(-1);e.target.value='';}}
 return <div className="op-image-field"><strong>{label}</strong><div className="op-image-preview">{value?<img src={value} alt={label}/>:<ImagePlus size={28}/>}</div><small>{suggestion}</small><label className="ux-button"><ImagePlus size={15}/>{busy?'Enviando…':'Enviar imagem'}<input hidden type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={upload}/></label>{value&&<button type="button" className="ux-button" disabled={busy} onClick={()=>onChange('')}>Usar padrão</button>}{error&&<p role="alert">{error}</p>}</div>;
}
