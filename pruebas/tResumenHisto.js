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
es('el PDF incluye el histograma',/class="histo"[\s\S]*Histograma por cargo/.test(abierto),true);
es('  sin variables del tema oscuro',/var\(--/.test(abierto.split('class="histo"')[1]||''),false);
es('  no se parte entre hojas',/\.histo\{[^}]*break-inside:avoid/.test(abierto),true);
es('  y sigue con tabla y KPIs',/class="kpis"/.test(abierto)&&/<table/.test(abierto),true);

console.log('\n== Conexión ==');
es('contenedor del histograma en la página',/id="tarPgHisto"/.test(HTML),true);
es('botón Imagen junto al PDF',/id="tarPgBtnImg" onclick="imgTareResumenPg\(this\)"/.test(HTML),true);
es('todas las llamadas pasan el histograma',(TAR.match(/chart:'tarPgChart',histo:'tarPgHisto'/g)||[]).length,5);
es('Imagen se oculta en los otros tabs',/'tarPgBtnImg'/.test(GD),true);
es('la imagen usa la misma hoja que el PDF',/imgTareResumenPg[\s\S]{0,400}_tarResumenDoc\(ids\)/.test(TAR),true);

console.log(`\n${mal?'✗ '+mal+' FALLAS':'OK todo bien'}  ·  ${ok}/${ok+mal}`);
process.exitCode=mal?1:0;
