export function couponState(coupon,now=new Date()) {
 if(!coupon.active)return 'Inativo';if(coupon.ends_at&&new Date(coupon.ends_at)<=now)return 'Expirado';if(coupon.starts_at&&new Date(coupon.starts_at)>now)return 'Agendado';if(coupon.usage_limit!=null&&Number(coupon.used_count)>=Number(coupon.usage_limit))return 'Esgotado';return 'Ativo';
}
export function validateCoupon(v) {
 if(!/^[A-Z0-9_-]{3,32}$/.test(v.code))return 'O código deve ter 3 a 32 letras, números, hífens ou sublinhados.';
 if(!Number.isFinite(v.discount_value)||v.discount_value<=0||(v.discount_type==='percentage'&&v.discount_value>100))return 'Use desconto positivo; porcentagens vão até 100%.';
 if(!Number.isFinite(v.min_order)||v.min_order<0)return 'O pedido mínimo não pode ser negativo.';
 if(v.max_discount!=null&&(!Number.isFinite(v.max_discount)||v.max_discount<=0))return 'O teto do desconto deve ser positivo.';
 if(v.usage_limit!=null&&(!Number.isInteger(v.usage_limit)||v.usage_limit<1))return 'O limite de usos deve ser um inteiro positivo.';
 if(v.starts_at&&v.ends_at&&new Date(v.ends_at)<=new Date(v.starts_at))return 'O término deve ser posterior ao início.';return '';
}
export function localDatetime(v){if(!v)return '';const d=new Date(v);if(Number.isNaN(d.getTime()))return '';return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,16);}
