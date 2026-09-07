const fs=require('fs');
const R='c:/Users/LENOVO/OneDrive/Documents/GitHub/GDARSystem/';
const ep=fs.readFileSync(R+'js/edpProveedores.js','utf8');
let ok=0,mal=0;
const es=(l,g,e)=>{const b=String(g)===String(e);b?ok++:mal++;
  console.log((b?'  OK  ':'  MAL ')+l.padEnd(56)+'= '+g+(b?'':'  (esperado '+e+')'));};

console.log('\n== El campo ya no se repinta al teclear ==');
const tag=(ep.match(/<input[^>]*id="edp_tc"[\s\S]*?>/)||[''])[0];
es('existe el input',tag.length>0,true);
es('oninput solo guarda',/oninput="_edpSet\('tc',this\.value\)"/.test(tag),true);
es('  sin el tercer parametro que repinta',/oninput="_edpSet\('tc',this\.value,1\)"/.test(tag),false);
es('el repintado va en onchange',/onchange="_edpSet\('tc',this\.value,1\)"/.test(tag),true);

console.log('\n== La etiqueta quedo bien formada ==');
es('no hay comentario HTML dentro',/<!--/.test(tag),false);
es('  ni un cierre suelto',/-->/.test(tag),false);
es('abre y cierra una sola vez',(tag.match(/</g)||[]).length,1);
es('el placeholder sigue',/placeholder="Ej: 3\.75"/.test(tag),true);
// Ya no es type=number, así que step y min no aplican: se valida en el código
es('acepta decimales por ser texto',/type="text"/.test(tag),true);
es('  con teclado numérico en móvil',/inputmode="decimal"/.test(tag),true);
es('los negativos se cortan en el codigo',ep.includes('Math.max(0,+String(val)'),true);
es('  y la coma decimal se admite',ep.includes(".replace(',','.')"),true);

console.log('\n== Ningun otro campo repinta al teclear ==');
const conRepintado=[...ep.matchAll(/oninput="_edpSet\('([a-zA-Z]+)',this\.value,1\)"/g)].map(m=>m[1]);
es('ninguno',conRepintado.join(',')||'ninguno','ninguno');

console.log('\n== El resto del bloque sigue entero ==');
es('el rotulo esta',/Tipo de cambio S\/ →/.test(ep),true);
es('el aviso de faltante tambien',/se restan sin convertir/.test(ep),true);
es('el borde cambia de color',/_edpTCFalta\(eq\)\?';border-color:#ef4444'/.test(ep),true);
es('solo aparece si hace falta',/_edpNecesitaTC\(eq\)\?/.test(ep),true);

console.log('\n'+(mal?'X '+mal+' fallo(s)':'OK todo bien')+'  ·  '+ok+'/'+(ok+mal));
process.exit(mal?1:0);
