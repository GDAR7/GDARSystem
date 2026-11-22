// Resumen Diario de Tareaje · histograma vertical por cargo (según filtros),
// incluido en el PDF, y exportar como imagen.
const fs=require('fs'),path=require('path'),vm=require('vm');
const R=path.join(__dirname,'..')+'/';
let ok=0,mal=0;
const es=(l,g,e)=>{const b=JSON.stringify(g)===JSON.stringify(e);b?ok++:mal++;
  console.log((b?'  OK  ':'  MAL ')+l.padEnd(58)+'= '+JSON.stringify(g)+(b?'':'  (esperado '+JSON.stringify(e)+')'));};
const TAR=fs.readFileSync(R+'js/tareaje.js','utf8');
const HTML=fs.readFileSync(R+'index.html','utf8');
const GD=fs.readFileSync(R+'js/guardiasFbnv.js','utf8');

// Página simulada con los elementos del Resumen
const el={};
const campos={tarPgFecha:'2026-11-22',tarPgProy:'',tarPgGuardia:'',tarPgCat:''};
const doc={getElementById:id=>{
  if(id in campos)return{value:campos[id]};
  return el[id]=el[id]||{innerHTML:'',id};
}};
let abierto='';
const ctx={console,Math,JSON,Object,Array,String,Number,Set,Date,
  document:doc,today:()=>'2026-11-22',toast:()=>{},
  window:{open:()=>({document:{write:h=>{abierto+=h;},close(){}},focus(){}}),location:{href:'https://x/index.html'}},
  setTimeout:()=>{},EMPRESA:{logo:'logo.png'},
  _TARE_T:{TD:{l:'Trabajo Día',bg:'#10b981',tx:'#fff'},A5:{l:'Anexo 5',bg:'#f97316',tx:'#fff'},
           F:{l:'Falta',bg:'#ef4444',tx:'#fff'},DL:{l:'Día Libre',bg:'#6b7280',tx:'#fff'}},
  DB:{proyectos:[],personal:[
    {id:1,est:'Activo',tipo:'Obrero',cargo:'Peon',guardia:'A'},
    {id:2,est:'Activo',tipo:'Obrero',cargo:'Peon',guardia:'B'},
    {id:3,est:'Activo',tipo:'Obrero',cargo:'Peon',guardia:'A'},
    {id:4,est:'Activo',tipo:'Obrero',cargo:'Op. Volquete',guardia:'A'},
    {id:5,est:'Activo',tipo:'Staff',cargo:'Ing. Residente',guardia:'A'},
    {id:6,est:'Activo',tipo:'Obrero',cargo:'Vigia',guardia:'B'}],
   tareaje:[
    {personalId:1,fecha:'2026-11-22',tipo:'TD'},{personalId:2,fecha:'2026-11-22',tipo:'A5'},
    {personalId:3,fecha:'2026-11-22',tipo:'F'},{personalId:4,fecha:'2026-11-22',tipo:'TD'},
    {personalId:5,fecha:'2026-11-22',tipo:'TD'},{personalId:6,fecha:'2026-11-22',tipo:'DL'}]}};
vm.createContext(ctx);
// Solo lo necesario de tareaje.js: filtros de categoría, resumen, histograma y documento
const tramo=(a,b)=>TAR.slice(TAR.indexOf(a),TAR.indexOf(b));
vm.runInContext('let _tarResCache=null,_tarPgColVis=null;'
  +tramo('function _tarPgCatVal','// Popup detalle doble-clic'),ctx);
const ev=s=>vm.runInContext(s,ctx);
const IDS="{fecha:'tarPgFecha',proy:'tarPgProy',guardia:'tarPgGuardia',cat:'tarPgCat',kpis:'tarPgKpis',tabla:'tarPgTabla',chart:'tarPgChart',histo:'tarPgHisto'}";
const cols=()=>[...el.tarPgHisto.innerHTML.matchAll(/class="thc-col"[\s\S]*?font-weight:800[^>]*>(\d+)<[\s\S]*?word-break:break-word[^>]*>([^<]+)</g)].map(m=>[m[2],+m[1]]);

ev('_buildTareResumen('+IDS+',null)');
es('una columna por cargo, de mayor a menor',cols(),[['PEON',3],['IGN. RESIDENTE'.replace('IGN','ING'),1],['OP. VOLQUETE',1],['VIGIA',1]]);
es('  apilada por tipo: PEON = TD + A5 + F',
  (el.tarPgHisto.innerHTML.match(/title="(\w+): (\d+)"/g)||[]).slice(0,3),['title="TD: 1"','title="A5: 1"','title="F: 1"']);
es('  con leyenda de los tipos',['TD Trabajo Día','A5 Anexo 5','F Falta'].every(t=>el.tarPgHisto.innerHTML.includes(t)),true);

campos.tarPgCat='Staff';ev('_buildTareResumen('+IDS+',null)');
es('filtro Staff: solo el cargo de staff',cols(),[['ING. RESIDENTE',1]]);
campos.tarPgCat='';campos.tarPgGuardia='B';ev('_buildTareResumen('+IDS+',null)');
es('filtro guardia B',cols(),[['PEON',1],['VIGIA',1]]);
campos.tarPgGuardia='';
ev('_buildTareResumen('+IDS+',new Set(["TD"]))');
es('columnas: solo TD → la altura cuenta solo TD',cols(),[['ING. RESIDENTE',1],['OP. VOLQUETE',1],['PEON',1]]);
campos.tarPgFecha='2026-01-01';ev('_buildTareResumen('+IDS+',null)');
es('fecha sin datos: el histograma se limpia',el.tarPgHisto.innerHTML,'');
campos.tarPgFecha='2026-11-22';

console.log('\n== PDF ==');
ev('_printTareResumen('+IDS+')');
es('el PDF incluye el histograma',/class="histo"[\s\S]*HISTOGRAMA POR CARGO/.test(abierto),true);
es('  dos columnas: izquierda tabla, derecha histograma',
  /<div class="hoja2"><div class="izq"><table[\s\S]*<\/div><div class="histo">/.test(abierto),true);
es('  por defecto sin tarjetas',/<div class="kpis">/.test(abierto),false);
const hoja=abierto.split('class="histo"')[1]||'';
es('  el histograma va de arriba hacia abajo (cargo y su barra)',
  [...hoja.matchAll(/text-align:right;word-break:break-word">([^<]+)<[\s\S]*?<b[^>]*>(\d+)<\/b>/g)].map(m=>[m[1],+m[2]]),
  [['PEON',3],['ING. RESIDENTE',1],['OP. VOLQUETE',1],['VIGIA',1]]);
es('  barra de PEON con sus 3 tipos',(hoja.split('PEON')[1]||'').split('</b>')[0].match(/flex:1 1 0;background/g).length,3);
es('  sin variables del tema oscuro',/var\(--/.test(hoja),false);
es('  no se parte entre hojas',/\.histo\{[^}]*break-inside:avoid/.test(abierto),true);
es('  líneas de la tabla en negro (antes plomo)',/th,td\{border:\.5px solid #000!important/.test(abierto)&&!/#94a3b8!important/.test(abierto),true);
es('  texto de las celdas en negro',/\btd\{color:#000\}/.test(abierto),true);
es('  marco del histograma en negro',/\.histo\{[^}]*border:\.5px solid #000/.test(abierto),true);
es('  textos del histograma en negro',!/color:#(334155|475569|1e3a5f)/.test(hoja),true);
es('imagen: el negro de las celdas le gana al tema oscuro',/\(table\|tr\|td\|/.test(TAR),true);
console.log('\n== Opciones antes del PDF ==');
const LS={};ctx.localStorage={getItem:k=>LS[k]??null,setItem:(k,v)=>{LS[k]=String(v);}};
LS.gdar_tarres_hoja=JSON.stringify({kpis:true,histo:true});abierto='';ev('_printTareResumen('+IDS+')');
es('con "Tarjetas" marcado: salen las tarjetas a la izquierda',/<div class="izq"><div class="kpis">/.test(abierto),true);
LS.gdar_tarres_hoja=JSON.stringify({kpis:false,histo:false});abierto='';ev('_printTareResumen('+IDS+')');
es('sin tarjetas ni histograma: solo la tabla',[/class="kpis"/.test(abierto),/class="histo"/.test(abierto),/<table/.test(abierto)],[false,false,true]);
LS.gdar_tarres_hoja='{malo';
es('preferencia dañada: por defecto (sin tarjetas, con histograma)',ev('_tarResPref()'),{kpis:false,histo:true});
delete LS.gdar_tarres_hoja;
campos.tarPgFecha='2026-01-01';abierto='';ev('_printTareResumen('+IDS+')');
es('sin datos: hoja de una columna, sin histograma viejo',/class="hoja2"|class="histo"/.test(abierto),false);
campos.tarPgFecha='2026-11-22';

console.log('\n== Conexión ==');
es('contenedor del histograma en la página',/id="tarPgHisto"/.test(HTML),true);
es('botón Imagen junto al PDF, con su menú de opciones',/id="tarPgBtnImg" onclick="_tarResOpciones\('img',this\)"/.test(HTML),true);
es('botón PDF también pregunta antes',/id="tarPgBtnPdf" onclick="_tarResOpciones\('pdf'\)"/.test(HTML),true);
es('el menú tiene Tarjetas e Histograma',/'Tarjetas'[\s\S]{0,200}'Histograma por cargo'/.test(TAR),true);
es('todas las llamadas pasan el histograma',(TAR.match(/chart:'tarPgChart',histo:'tarPgHisto'/g)||[]).length,5);
es('Imagen se oculta en los otros tabs',/'tarPgBtnImg'/.test(GD),true);
es('la imagen usa la misma hoja que el PDF',/imgTareResumenPg[\s\S]{0,400}_tarResumenDoc\(ids\)/.test(TAR),true);

console.log(`\n${mal?'✗ '+mal+' FALLAS':'OK todo bien'}  ·  ${ok}/${ok+mal}`);
process.exitCode=mal?1:0;
