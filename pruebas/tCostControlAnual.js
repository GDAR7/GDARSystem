// La matriz anual de Cost Control. Lo que más importa: que use el MISMO motor
// que la pestaña Equipos, porque si los dos cálculos se separan, dos pantallas
// del mismo módulo mostrarían márgenes distintos y nadie sabría cuál creer.
const fs=require('fs');
const R=require('path').join(__dirname,'..')+'/';
let ok=0,mal=0;
const es=(l,g,e)=>{const b=String(g)===String(e);b?ok++:mal++;
  console.log((b?'  OK  ':'  MAL ')+l.padEnd(60)+'= '+g+(b?'':'  (esperado '+e+')'));};

const cc=fs.readFileSync(R+'js/costcontrol.js','utf8');
const ca=fs.readFileSync(R+'js/costcontrolAnual.js','utf8');
const html=fs.readFileSync(R+'index.html','utf8');

console.log('\n== El motor quedó extraído, no duplicado ==');
es('_ccCalcEq existe en costcontrol.js',/function _ccCalcEq\(per,KEY\)\{/.test(cc),true);
es('rCostControl lo llama',/const _C=_ccCalcEq\(per,KEY\);/.test(cc),true);
es('  y ya no calcula eqRows por su cuenta',
  /const eqRows=Object\.values\(eqMap\)\.map/.test(cc.slice(cc.indexOf('function rCostControl'))),false);
es('la matriz anual llama al mismo motor',/_ccCalcEq\(per,KEY\)/.test(ca),true);
es('  y no reimplementa el margen',/venta-costoProveedor/.test(ca),false);
es('  ni el combustible',/_ccFComb\(\)/.test(ca),false);
es('devuelve todo lo que el render necesita',
  /return\{eqRows,totalVentaEq,totalCostoEq,totalGalEq,totalCombEq,totalMargenEq,/.test(cc),true);

console.log('\n== Los doce períodos 21→20 ==');
// Se ejecuta la función real
// costcontrolAnual.js delega el corte contable en gdarPeriodoDeMes(), que vive
// en js/utils.js. Hay que dárselo igual que se lo da el navegador, o la función
// no encuentra de dónde saca las fechas.
const _uts=fs.readFileSync(R+'js/utils.js','utf8');
const _per=_uts.slice(_uts.indexOf('// ══ EL PERÍODO CONTABLE'),_uts.indexOf('// ══ CLOCK ══'));
Object.assign(global,new Function('EMPRESA_CORTE',
  _per+';return{gdarPeriodoDeMes,gdarPeriodo,gdarPeriodoOffset,gdarCorte};')(21));

const iP=ca.indexOf('function _ccaPeriodos');
const _ccaPeriodos=new Function('_CCA_MESES','return '+
  ca.slice(iP,ca.indexOf('\n}',iP)+2))(
  ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']);
const P=_ccaPeriodos(2026);
es('son doce',P.length,12);
es('Enero abre el 21 de diciembre anterior',P[0].desde,'2025-12-21');
es('  y cierra el 20 de enero',P[0].hasta,'2026-01-20');
es('  con 31 días',P[0].dias,31);
es('Febrero abre el 21 de enero',P[1].desde,'2026-01-21');
es('Diciembre cierra el 20 de diciembre',P[11].hasta,'2026-12-20');
es('los períodos no se solapan',
  P.every((p,i)=>i===0||p.desde>P[i-1].hasta),true);
es('  ni dejan huecos',
  P.every((p,i)=>{if(!i)return true;
    const d=new Date(P[i-1].hasta+'T00:00:00');d.setDate(d.getDate()+1);
    return p.desde===d.toISOString().slice(0,10);}),true);
es('febrero de año bisiesto sale bien',_ccaPeriodos(2024)[2].desde,'2024-02-21');

console.log('\n== Los conceptos, según el modo de tarifa ==');
const lista=n=>[...(ca.match(new RegExp('const '+n+'=\\[[\\s\\S]*?\\];'))||[''])[0]
  .matchAll(/lab:'(0\d\.-[^']+)'/g)].map(m=>m[1]).join(' · ');
es('Máq. Seca: las cuatro de siempre',lista('_CCA_CONCEPTOS_SECA'),
  '01.-Alquiler · 02.-Combustible · 03.-Venta · 04.-Margen');
es('Tarifa Full: la venta se abre en dos',lista('_CCA_CONCEPTOS_FULL'),
  '01.-Alquiler · 02.-Combustible · 03.-Venta Equipo · 04.-Venta Combustible · 05.-Margen');
es('la lista se elige por el modo',
  /return _ccTarifaModo==='full'\?_CCA_CONCEPTOS_FULL:_CCA_CONCEPTOS_SECA/.test(ca),true);
es('  y el panel usa la función, no una lista fija',/_ccaConceptos\(\)\.forEach/.test(ca),true);
es('  el Excel también',/_ccaConceptos\(\)\.forEach/.test(ca.slice(ca.indexOf('function _ccaExcel'))),true);
es('el color del Excel va por clave, no por etiqueta',/XL_COL\[C\.k\]/.test(ca),true);
es('  porque la etiqueta cambia de número entre modos',/XL_COL\[C\.lab\]/.test(ca),false);
es('Alquiler ← costoProveedor',/m\.alquiler=r\.costoProveedor/.test(ca),true);
es('Combustible ← costoComb',/m\.comb=r\.costoComb/.test(ca),true);
es('Venta ← costo',/m\.venta=r\.costo;/.test(ca),true);
es('Margen ← margen',/m\.margen=r\.margen/.test(ca),true);

console.log('\n== Agrupación y columnas planas ==');
es('agrupa por el subtipo del Máster',/a\.eq\.sub\|\|a\.eq\.tipo/.test(ca),true);
es('la fila de familia es el margen del grupo',/margen<0\?'#ef4444':'#10b981'/.test(ca),true);
['TIPO DE EQUIPO','CONTRATISTA','EQUIPO CODIGO','CONCEPTO','MONEDA'].forEach(c=>
  es('  el Excel lleva la columna '+c,ca.includes("'"+c+"'"),true));
es('cada fila repite tipo/contratista/equipo',
  /S\(G\.nombre\),S\(a\.eq\.proveedor\|\|'—'\),S\(a\.eq\.codigo\|\|''/.test(ca),true);
es('  con autofiltro para segmentar',/!autofilter/.test(ca),true);
es('  y cabecera congelada',/!freeze.*ySplit:3/.test(ca),true);
es('el Excel trae los doce meses',
  /\.\.\._CCA_MESES\.map\(m=>m\.toUpperCase\(\)\)/.test(ca),true);

console.log('\n== Las celdas estimadas se distinguen ==');
es('sin EDP → estimado',/m\.est=!r\.edp/.test(ca),true);
es('solo el alquiler puede ser estimado',/C\.k==='alquiler'&&m\.hay&&m\.est/.test(ca),true);
es('  en pantalla va en cursiva punteada',/font-style:italic;border-bottom:1px dotted/.test(ca),true);
es('  y en el Excel en cursiva',/it:C\.k==='alquiler'/.test(ca),true);
es('el título explica qué significa',/Estimado: horas × tarifa del Máster/.test(ca),true);

console.log('\n== No encarece las otras pestañas ==');
es('el panel solo se arma si la pestaña está activa',
  /_ccTabActiva==='anual'&&typeof _ccaPanel==='function'\?_ccaPanel\(\):''/.test(cc),true);
es('_ccTab lo pinta al entrar',/if\(t==='anual'&&typeof _ccaPintar==='function'\)_ccaPintar\(\)/.test(cc),true);
es('  y conoce las cuatro pestañas',/\['equipos','personal','resumen','anual'\]/.test(cc),true);
es('hay caché por año',/_ccaCache&&_ccaCache\.clave===clave/.test(ca),true);
es('  que distingue modo y combustible',
  /\[anio,KEY,_ccSinIgv\?1:0,_ccPrecioManual\?1:0,_ccPrecioComb\|\|0,/.test(ca),true);
es('  y también el proyecto filtrado',/_ccProyecto!=='undefined'\?_ccProyecto:''\]/.test(ca),true);
es('  y se descarta al recargar datos',/if\(typeof _ccaCache!=='undefined'\)_ccaCache=null/.test(cc),true);

console.log('\n== Enganche en la página ==');
// El sello ya no es un número que se sube a mano: es el hash del contenido,
// que pone `npm run sellar`.
es('el script está declarado',/js\/costcontrolAnual\.js\?v=[A-Za-z0-9]+/.test(html),true);
es('  después de costcontrol.js',
  html.indexOf('costcontrolAnual.js')>html.indexOf('js/costcontrol.js'),true);
es('la pestaña aparece en la barra',/_tabBtn\('anual','📅 Anual'\)/.test(cc),true);
es('el contenedor existe',/id="ccPanel-anual"/.test(cc),true);
es('las otras tres pestañas siguen ahí',
  ['equipos','personal','resumen'].every(k=>cc.includes(`id="ccPanel-${k}"`)),true);

console.log('\n== Filtros ==');
['tipo','contratista','buscar'].forEach(f=>
  es('  filtra por '+f,new RegExp("campo==='"+f+"'").test(ca),true));
es('el buscador no pierde el foco al tipear',/setSelectionRange\(pos,pos\)/.test(ca),true);
es('los combos no se vacían al filtrar',/D\.grupos\.map\(G=>G\.nombre\)/.test(ca),true);
es('el total de familia se recalcula sobre lo visible',
  /equipos\.forEach\(a=>\{\s*a\.meses\.forEach\(\(m,i\)=>sumar\(meses\[i\],m\)\);/.test(ca),true);
es('  sumando todos los campos, no solo cuatro',
  /_CCA_CAMPOS=\['alquiler','comb','venta','ventaEq','ventaComb','margen'\]/.test(ca),true);
es('se escapa el HTML del usuario',/function _ccaEsc/.test(ca),true);

console.log('\n== La venta partida en dos ==');
es('el motor la calcula',/const dif=\(\+t\.full\|\|0\)-\(\+t\.seca\|\|0\);/.test(cc),true);
es('  solo en Tarifa Full',/if\(t&&KEY==='full'\)\{/.test(cc),true);
es('  ventaEq se despeja restando, para que la suma cuadre exacta',
  /const ventaEq=venta-ventaComb;/.test(cc),true);
es('  y se devuelven en la fila',/costo:venta,ventaEq,ventaComb,/.test(cc),true);
es('el motor entrega los dos totales',
  /totalVentaEqSolo,totalVentaComb,precioAlm,precioComb/.test(cc),true);
es('la tabla parte la columna solo en Full',/const esFull=KEY==='full';/.test(cc),true);
// Las columnas dejaron de estar escritas a mano: ahora son una lista, y el
// ancho de la tabla sale de contarla. Así ocultar una no descuadra los colspan.
es('  el ancho se calcula, no está escrito',/const NC=2\+COLS\.length;/.test(cc),true);
es('  ya no hay un número de columnas fijo',/const NC=esFull\?11:10;/.test(cc),false);
es('  Venta Comb. está marcada como solo-Full',/k:'vcomb'[\s\S]{0,80}soloFull:true/.test(cc),true);
es('  y la cabecera de Venta cambia de nombre',
  /th:f=>f\?'Venta Equipo':'Venta'/.test(cc),true);
es('el colspan del subtotal se calcula',/colspan="\$\{2\+lead\}"/.test(cc),true);
es('  contando las columnas sin subtotal',/for\(const c of COLS\)\{ if\(c\.sub\) break; lead\+\+; \}/.test(cc),true);
es('el anual guarda las dos ventas',/m\.ventaComb=r\.ventaComb\|\|0;/.test(ca),true);
es('  y en Seca ventaEq es toda la venta',
  /m\.ventaEq=r\.ventaEq!=null\?r\.ventaEq:r\.costo;/.test(ca),true);

console.log('\n== Proyecto: de columna a selector ==');
es('ya no es una columna de la tabla',/<th style="\$\{TH\}">Proyecto<\/th>/.test(cc),false);
es('  ni una celda por fila',/r\.eq\.proyecto\|\|'—'/.test(cc),false);
es('el filtro vive en el motor',
  /if\(_ccProyecto&&String\(eq\.proyecto\|\|''\)!==_ccProyecto\)return;/.test(cc),true);
es('  así alcanza a KPI, tabla, Resumen y Anual',
  cc.indexOf('_ccProyecto&&String(eq.proyecto')>cc.indexOf('function _ccCalcEq'),true);
es('hay estado y setter',/let _ccProyecto='';/.test(cc)&&/function _ccSetProyecto\(v\)/.test(cc),true);
es('  que invalida el caché del anual',
  /_ccSetProyecto[\s\S]{0,160}_ccaCache=null/.test(cc),true);
es('las opciones salen del Máster',/function _ccProyectosDisponibles\(\)/.test(cc),true);
es('el selector va en la barra de pestañas',
  /_tabBtn\('anual','📅 Anual'\)\}[\s\S]{0,400}_ccSetProyecto\(this\.value\)/.test(cc),true);
es('se avisa cuando hay filtro puesto',/· SOLO \$\{_ccProyecto\}/.test(cc),true);
es('  también en el KPI de venta',/solo \$\{_ccProyecto\}/.test(cc),true);

console.log('\n== Sin choques de nombres ==');
const glob=n=>new RegExp('^(?:const|let|function)\\s+'+n+'\\b','m');
['_CCA_MESES','_CCA_MES3','_CCA_CONCEPTOS','_ccaAnio','_ccaCache'].forEach(n=>{
  es('  '+n+' solo se declara en costcontrolAnual.js',glob(n).test(cc),false);
});
es('todo lo nuevo lleva prefijo _cca',
  [...ca.matchAll(/^(?:const|let|function)\s+([A-Za-z_$][\w$]*)/gm)]
    .map(m=>m[1]).every(n=>/^_[Cc][Cc][Aa]/.test(n)),true);

console.log('\n'+(mal?'X '+mal+' fallo(s)':'OK todo bien')+'  ·  '+ok+'/'+(ok+mal));
process.exit(mal?1:0);
