import {useEffect,useState} from 'react';
import {categoryImageURL} from '../utils/categories';
export default function CategoryImage({category,className=''}){
 const primary=categoryImageURL(category),fallback=categoryImageURL({...category,image_url:null});
 const [failed,setFailed]=useState([]);useEffect(()=>setFailed([]),[primary,fallback]);
 const src=[primary,fallback,'/categories/default.svg'].find(url=>!failed.includes(url));
 return <img className={className} src={src||'/categories/default.svg'} alt={category?.name||'Categoria'} loading="lazy" onError={()=>setFailed(list=>[...list,src])}/>;
}
