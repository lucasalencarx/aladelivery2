import { useEffect, useState } from 'react';
import { ImageOff } from 'lucide-react';
export default function ProductImage({product,className=''}){const [failed,setFailed]=useState(false);useEffect(()=>setFailed(false),[product.image_url]);return product.image_url&&!failed?<img draggable={false} className={className} src={product.image_url} alt={product.name} loading="lazy" decoding="async" onError={()=>setFailed(true)}/>:<span className={`sf-no-image ${className}`}><ImageOff size={38}/><small>Imagem indisponível</small></span>;}
