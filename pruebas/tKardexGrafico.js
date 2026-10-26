// Kardex · «Movimiento Diario del Mes»: el gráfico sigue los mismos filtros que
// la tabla (movimiento, proyecto, tipo de material, materiales elegidos y
// buscador). La fecha exacta solo filtra la tabla.
const fs=require('fs'),vm=require('vm');
const R='c:/Users/LENOVO/OneDrive/Documents/GitHub/GDARSystem/';
let ok=0,mal=0;
const es=(l,g,e)=>{const b=String(g)===String(e);b?ok++:mal++;
  console.log((b?'  OK  ':'  MAL ')+l.padEnd(62)+'= '+g+(b?'':'  (esperado '+e+')'));};

const m=(id,fecha,codigo,nombre,unidad,tipo,cant,codProy)=>({id,fecha,codigo,nombre,unidad,tipo,cant,codProy,proyecto:codProy});
const DB={almacen:[
  m(1,'2026-10-01','INS-0023','CEMENTO TIPO ULTRA HS','bls','E',150,'EPY-004-26'),
  m(2,'2026-10-07','INS-0023','CEMENTO TIPO ULTRA HS','bls','E',658,'EPY-004-26'),
  m(3,'2026-10-07','INS-0023','CEMENTO TIPO ULTRA HS','bls','S',120,'EPY-004-26'),
  m(4,'2026-10-05','EPP-0001','Guantes de nitrilo','par','S',40,'EPY-004-26'),
  m(5,'2026-10-05','EPP-0002','Lentes de seguridad','und','E',30,'EPY-002-26'),
  m(6,'2026-09-15','INS-0023','CEMENTO TIPO ULTRA HS','bls','E',100,'EPY-004-26')
],proyectos:[],tipoMaterial:[],requerimientos:[]};
const nodos={};
const Nodo=id=>({id,innerHTML:'',value:'',checked:false,disabled:false,style:{},options:[1],appendChild(){},remove(){},querySelector(){return null;}});
const nodo=id=>nodos[id]||(nodos[id]=Nodo(id));
nodo('almPeriodoSel').value='0';                 // todo el historial cargado
nodo('almChartMes').value='10';nodo('almChartAnio').value='2026';
const ctx=vm.createContext({DB,console:{warn(){},log(){}},Math,Number,String,Object,Array,JSON,Set,Map,isFinite,parseFloat,parseInt,Promise,setTimeout,Date,
  document:{getElementById:nodo,createElement:()=>Nodo('x'),body:{appendChild(){}},addEventListener(){},removeEventListener(){},querySelector:()=>null},
  window:{innerWidth:1400},toast(){},fmtN:n=>String(Math.round(+n*100)/100),bge:x=>String(x||''),REQ_PREFIXES:{},
  supa:{from:()=>({select:()=>({order:()=>({range:async()=>({data:[],error:null})})})})},toCamel:o=>o});
vm.runInContext(fs.readFileSync(R+'js/almacen.js','utf8').replace(/^const /gm,'var ').replace(/^let /gm,'var '),ctx,{filename:'almacen.js'});
const ev=x=>vm.runInContext(x,ctx);
const tot=()=>nodo('almChartTotals').innerHTML;
const barra=(d,tipo)=>{const re=new RegExp('title="'+(tipo==='E'?'Entradas':'Salidas')+' día '+d+': ([0-9.]+)');const x=nodo('almChartBody').innerHTML.match(re);return x?+x[1]:null;};
const filtrar=js=>{ev('_almFiltTipo="";_almFiltProy="";_almFiltMat="";_almFiltFecha="";_almFiltText="";_almMatSel.clear();'+js+';rAlm()');};

console.log('\n== Sin filtros: todo el mes ==');
filtrar('');
es('entradas del mes (150 + 658 + 30)',/⬆ 838 uds/.test(tot()),true);
es('salidas del mes (120 + 40)',/⬇ 160 uds/.test(tot()),true);
es('sin etiqueta de filtro',/🔍/.test(tot()),false);

console.log('\n== Buscar «cemento» ==');
filtrar('_almFiltText="cemento"');
es('solo el cemento: entradas 808',/⬆ 808 bls/.test(tot()),true);
es('  salidas 120',/⬇ 120 bls/.test(tot()),true);
es('  con su unidad (bls), no «uds»',/uds/.test(tot()),false);
es('  barra del día 7: 658 de entrada',barra(7,'E'),658);
es('  el día 5 (guantes y lentes) queda en cero',barra(5,'E')+' · '+barra(5,'S'),'0 · 0');
es('  dice qué filtra',/🔍 «cemento»/.test(tot()),true);
es('  y la tabla muestra lo mismo',(nodo('tbAlm').innerHTML.match(/<tr>/g)||[]).length,4);

console.log('\n== Otros filtros ==');
filtrar('_almFiltTipo="S"');
es('solo salidas: no hay entradas',/⬆ 0 uds/.test(tot())&&/⬇ 160 uds/.test(tot()),true);
filtrar('_almFiltProy="EPY-002-26"');
es('por proyecto: solo los lentes del EPY-002-26',/⬆ 30 und/.test(tot()),true);
filtrar('_almFiltMat="EPP"');
es('por tipo de material (EPP): mezcla unidades → «uds»',/⬆ 30 uds/.test(tot())&&/⬇ 40 uds/.test(tot()),true);
filtrar('_almMatSel.add("EPP-0001")');
es('multi-filtro de materiales: solo los guantes',/⬇ 40 par/.test(tot())&&/1 material|EPP-0001/.test(tot()),true);
filtrar('_almFiltText="cemento";_almFiltFecha="2026-10-07"');
es('la fecha exacta solo filtra la tabla: el gráfico sigue con el mes',/⬆ 808 bls/.test(tot()),true);
es('  y la tabla, ese día',(nodo('tbAlm').innerHTML.match(/<tr>/g)||[]).length,2);

console.log('\n== Otro mes ==');
nodo('almChartMes').value='9';
filtrar('_almFiltText="cemento"');
es('septiembre: la entrada de 100 del 15',barra(15,'E'),100);
nodo('almChartMes').value='11';
filtrar('_almFiltText="cemento"');
es('un mes sin movimientos de lo filtrado lo dice',/Sin movimientos de lo filtrado en este mes/.test(nodo('almChartBody').innerHTML),true);

console.log('\n== Subtotal de todo lo filtrado ==');
nodo('almChartMes').value='10';
const pie=()=>nodo('almTfoot').innerHTML;
filtrar('_almFiltText="cemento"');
es('aparece al pie de la tabla',/SUBTOTAL/.test(pie()),true);
es('  cuenta todos los registros filtrados (no solo la página)',/· 4 registros filtrados · en bls/.test(pie()),true);
es('  entradas: 150 + 658 + 100',/⬆ 908</.test(pie()),true);
es('  salidas: 120',/⬇ 120</.test(pie()),true);
es('  neto: 788',/>788<div/.test(pie()),true);
es('  una sola unidad: sin aviso',/varias unidades/.test(pie()),false);
filtrar('_almFiltMat="EPP"');
es('varias unidades: lo avisa',/varias unidades: la suma las mezcla/.test(pie()),true);
filtrar('_almFiltText="zzz"');
es('sin resultados: sin subtotal',pie(),'');
// Más de una página: el subtotal suma todo
for(let i=0;i<30;i++)DB.almacen.push(m(100+i,'2026-10-20','INS-0099','ARENA','m3','E',2,'EPY-004-26'));
filtrar('_almFiltText="arena"');
es('con 30 registros (2 páginas) suma los 30: 60 m3',/· 30 registros filtrados · en m3/.test(pie())&&/⬆ 60</.test(pie()),true);
es('  aunque la tabla muestre 20',(nodo('tbAlm').innerHTML.match(/<tr>/g)||[]).length,20);
DB.almacen.splice(-30);
filtrar('_almFiltText="cemento";_almModoStock=true');
es('en «Último stock»: total de stock de lo filtrado',/TOTAL[\s\S]*1 material filtrado[\s\S]*>788</.test(pie()),true);
ev('_almModoStock=false');

console.log('\n== El valor encima de cada barra ==');
filtrar('_almFiltText="cemento"');
const G=nodo('almChartBody').innerHTML;
es('la entrada del día 7 muestra 658',/writing-mode:vertical-rl[^>]*color:#10b981[^>]*>658</.test(G),true);
es('la salida del día 7 muestra 120',/writing-mode:vertical-rl[^>]*color:#ef4444[^>]*>120</.test(G),true);
es('los días sin movimiento no muestran «0»',(G.match(/writing-mode:vertical-rl/g)||[]).length,3);

console.log('\n== Una sola regla de filtros ==');
const SRC=fs.readFileSync(R+'js/almacen.js','utf8');
es('la tabla usa _almFiltrarMovs',/let filasMostrar=_almFiltrarMovs\(filas,true\);/.test(SRC),true);
es('el gráfico también (con todo el historial)',/const movs=_almFiltrarMovs\(_almMovsCompletos\(\),false\);/.test(SRC),true);
es('el texto del filtro no se interpreta como código',(filtrar('_almFiltText="<b>"'),/<b>/.test(tot())),false);

console.log('\n'+(mal?'✗ '+mal+' FALLAS':'OK todo bien')+'  ·  '+ok+'/'+(ok+mal));
process.exit(mal?1:0);
