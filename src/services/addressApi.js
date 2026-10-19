import {supabase} from '../supabase/supabase';
export const normalizeAddressText=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
export const supportedCities=['Corumbá','Ladário'];
export async function loadDeliveryZones(){const {data,error}=await supabase.rpc('storefront_delivery_zones');if(error)throw Error('Não foi possível carregar os bairros. Execute o SQL 10 e confira a conexão com o Supabase.');return data||[];}
export async function lookupCEP(value,signal){
 const cep=String(value).replace(/\D/g,'');if(cep.length!==8)throw Error('Digite os 8 números do CEP.');
 let response;try{response=await fetch(`https://viacep.com.br/ws/${cep}/json/`,{signal:signal||AbortSignal.timeout(8000)});}catch(e){if(e.name==='AbortError')throw e;throw Error('Não foi possível consultar o CEP. Você pode preencher o endereço manualmente.');}
 if(!response.ok)throw Error('Consulta de CEP indisponível. Preencha o endereço manualmente.');
 const d=await response.json();if(d.erro)throw Error('CEP não encontrado. Confira os números ou preencha manualmente.');
 const city=supportedCities.find(c=>normalizeAddressText(c)===normalizeAddressText(d.localidade));
 if(d.uf!=='MS'||!city)throw Error('Este CEP é de outra localidade. Atendemos Corumbá-MS e Ladário-MS.');
 return {cep:d.cep,street:d.logradouro||'',neighborhood:d.bairro||'',city,state:'MS'};
}
