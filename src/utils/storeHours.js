export function isStoreOpen(status,now=new Date()){
 if(!status)return false;if(status.manual_override!==false)return status.is_open===true;
 const parts=new Intl.DateTimeFormat('en-GB',{timeZone:status.timezone||'America/Campo_Grande',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(now);
 const current=Number(parts.find(p=>p.type==='hour').value)*60+Number(parts.find(p=>p.type==='minute').value);
 const minutes=v=>{const [h,m]=String(v||'00:00').split(':');return Number(h)*60+Number(m);};const open=minutes(status.opening_time),close=minutes(status.closing_time);
 return open===close|| (open<close?current>=open&&current<close:current>=open||current<close);
}
