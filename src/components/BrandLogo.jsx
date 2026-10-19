import {useEffect,useState} from 'react';
import {brandLogoURL,foldBrand} from '../utils/brands';
import catalog from '../../public/catalogo-zpedidos/catalogo.json';
export default function BrandLogo({brand}){
 const logo=brandLogoURL(brand),name=foldBrand(brand.name),catalogImage=catalog.find(p=>name&&(' '+foldBrand(p.name)+' ').includes(' '+name+' ')&&p.image_url)?.image_url;
 const fallback=brand.product_image_url||catalogImage;
 const [failed,setFailed]=useState([]);
 useEffect(()=>setFailed([]),[logo,fallback]);
 const url=[logo,fallback].find(v=>v&&!failed.includes(v));
 return url?<img loading="lazy" src={url} alt={(url===logo?'Logo ':'Produto da marca ')+brand.name} onError={()=>setFailed(list=>[...list,url])}/>:<span className="brand-initials" aria-label={brand.name}>{String(brand.name||'').slice(0,2).toUpperCase()}</span>;
}
