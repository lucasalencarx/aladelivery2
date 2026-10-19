export const money = value => Number(value || 0).toLocaleString('pt-BR', {style:'currency',currency:'BRL'});
export function getProductPrice(product) {
  const regular = Number(product?.price);
  const promo = Number(product?.promotional_price);
  if (!Number.isFinite(regular) || regular < 0) return 0;
  return Number.isFinite(promo) && promo > 0 && promo < regular ? promo : regular;
}
export function stockLimit(product) {
  if (product.stock == null) return 0;
  const stock = Number(product.stock);
  return Number.isFinite(stock) ? Math.max(0, Math.floor(stock)) : 0;
}
export function normalizeCart(value) {
  if (!Array.isArray(value)) return [];
  const seen = new Set();
  return value.filter(p => p && (typeof p.id === 'string' || (typeof p.id === 'number' && Number.isSafeInteger(p.id))) && typeof p.name === 'string' && Number.isFinite(Number(p.price)) && Number(p.price) >= 0 && !seen.has(String(p.id)) && seen.add(String(p.id)))
    .map(p => ({...p,id:String(p.id),quantity:Math.min(stockLimit(p),Math.max(0,Math.floor(Number(p.quantity)||0)))})).filter(p => p.quantity > 0);
}
