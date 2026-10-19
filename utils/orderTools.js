export const orderStages={pending:'Aguardando pagamento',confirmed:'Pedido confirmado',preparing:'Em preparação',out_for_delivery:'Saiu para entrega',delivered:'Entregue',cancelled:'Cancelado'};
export const brl=v=>Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
export function orderMessage(order,greeting='neutral'){
 const first=String(order.customer_name||'').trim().split(/\s+/)[0];
 const hello=greeting==='friend_m'?'Olá, meu amigo':greeting==='friend_f'?'Olá, minha amiga':`Olá${first?', '+first:''}`;
 return `${hello}! Aqui é da Ala Delivery. 🛍️\nSeu pedido ${order.protocol||order.id} está com o status: ${orderStages[order.order_status]||order.order_status}.\nTotal: ${brl(order.total_amount)}.\nVocê pode acompanhar as atualizações em tempo real no link privado recebido ao finalizar a compra. Qualquer dúvida, fale com a gente por lá!`;
}
export function whatsappLink(order,greeting='neutral'){
 let phone=String(order.customer_phone||'').replace(/\D/g,'');
 if(phone.length===10||phone.length===11)phone='55'+phone;
 if(!/^55\d{10,11}$/.test(phone))return null;
 return `https://wa.me/${phone}?text=${encodeURIComponent(orderMessage(order,greeting))}`;
}
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function receiptHTML(o){
 const a=o.address||{},items=Array.isArray(o.items)?o.items:[];
 const address=[a.street,a.number,a.complement,a.neighborhood,a.city,a.state||'MS',a.cep].filter(Boolean).join(', ');
 return `<!doctype html><html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width"><title>Pedido ${esc(o.protocol||o.id)}</title><style>@page{size:80mm auto;margin:5mm}*{box-sizing:border-box}body{max-width:72mm;margin:0 auto;color:#111;font:12px Arial,sans-serif}h1{font-size:20px;margin:0}h2{font-size:14px}header{text-align:center;padding:12px 0;border-bottom:1px dashed #333}p{line-height:1.5;overflow-wrap:anywhere}table{width:100%;border-collapse:collapse}td{padding:7px 0;vertical-align:top;border-bottom:1px dashed #ccc}td:last-child{text-align:right;white-space:nowrap}small{font-size:10px;color:#444}.line{display:flex;justify-content:space-between;gap:8px;margin:9px 0}.total{font-size:17px;font-weight:bold;border-top:1px dashed;padding-top:10px}footer{text-align:center;border-top:1px dashed;margin-top:16px;padding:12px 0;font-size:10px}@media screen{body{padding:14px;max-width:360px}}</style></head><body><header><h1>Ala Delivery</h1><p>COMPROVANTE DO PEDIDO<br><b>${esc(o.protocol||o.id)}</b><br><small>${esc(o.created_at?new Date(o.created_at).toLocaleString('pt-BR'):'')}</small></p></header><h2>Cliente</h2><p>${esc(o.customer_name)}<br>${esc(o.customer_phone)}</p><h2>Entrega</h2><p>${esc(address)}${a.reference?'<br>Referência: '+esc(a.reference):''}</p><h2>Produtos</h2><table>${items.map(i=>`<tr><td><b>${esc(i.quantity)} × ${esc(i.product_name)}</b><br><small>Unidade: ${esc(brl(i.unit_price))}</small></td><td>${esc(brl(i.total_price))}</td></tr>`).join('')}</table><div class="line"><span>Subtotal</span><b>${esc(brl(o.subtotal))}</b></div><div class="line"><span>Desconto${o.coupon_code?' ('+esc(o.coupon_code)+')':''}</span><b>− ${esc(brl(o.discount_amount))}</b></div><div class="line"><span>Taxa de entrega</span><b>${esc(brl(o.delivery_fee))}</b></div><div class="line total"><span>Total</span><span>${esc(brl(o.total_amount))}</span></div><p>Pagamento: ${esc({pix:'Pix',cartao:'Cartão na entrega',dinheiro:'Dinheiro na entrega'}[o.payment_method]||o.payment_method)}<br>Situação: ${o.payment_status==='paid'?'Pago':'Pendente'}${o.card_type?'<br>Tipo: '+esc(o.card_type):''}${o.change_for?'<br>Troco para: '+esc(o.change_for):''}<br>Status: ${esc(orderStages[o.order_status]||o.order_status)}</p>${o.observation?'<p><b>Observações:</b> '+esc(o.observation)+'</p>':''}<footer>Documento de conferência do pedido.<br>NÃO É DOCUMENTO FISCAL.</footer></body></html>`;
}
export function printOrder(order){
 const popup=window.open('','_blank','width=440,height=720');
 if(!popup)throw Error('Permita a abertura da janela de impressão neste navegador.');
 popup.opener=null;popup.document.open();popup.document.write(receiptHTML(order));popup.document.close();popup.focus();
 setTimeout(()=>{if(!popup.closed)popup.print();},200);
}
