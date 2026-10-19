export const foldCategory=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const pictures=[
 [/churrasco|barbecue|carne/,'/catalogo-zpedidos/churrasco-478.webp'],
 [/vinho|wine/,'/catalogo-zpedidos/vinhos-328.webp'],
 [/energet|energy/,'/catalogo-zpedidos/energeticos-261.webp'],
 [/nao alcool|sem alcool|non alcohol/,'/catalogo-zpedidos/nao-alcoolicos-227.webp'],
 [/refrigerante|soft drink|soda/,'/catalogo-zpedidos/refrigerantes-202.webp'],
 [/chopp|chope/,'/catalogo-zpedidos/chopp-heineken-5l.png'],
 [/cerveja|beer/,'/catalogo-zpedidos/cervejas-81.webp'],
 [/destilad|spirit|whisky|vodka|gin/,'/catalogo-zpedidos/destilados-57.webp'],
 [/agua|water|gelo|ice/,'/catalogo-zpedidos/aguas-e-gelo-48.webp'],
 [/sobremesa|chocolate|dessert|doce/,'/catalogo-zpedidos/sobremesas-27.webp'],
 [/drink|coquetel/,'/catalogo-zpedidos/drinks-prontos-364.webp'],
 [/maromba/,'/catalogo-zpedidos/mansao-maromba-1.webp'],
 [/petisco|snack/,'/categories/petiscos.svg'],
 [/cigarro|tabac|cigarette/,'/categories/cigarros.svg'],
 [/mercearia|grocery/,'/categories/mercearia.svg'],
 [/conven|utilidade/,'/categories/conveniencia.svg'],
 [/oferta|promoc|sale/,'/categories/ofertas.svg'],
 [/recomend|destaque|favorit/,'/categories/recomendados.svg'],
];
export function categoryImageURL(category){return category?.image_url||pictures.find(([match])=>match.test(foldCategory(`${category?.name||''} ${category?.slug||''}`)))?.[1]||'/categories/default.svg';}
