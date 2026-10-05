// Máster de Equipos · filtros por estado.
// Todos · Activos (con Operativos / Inoperativos / Parados) · Desmovilizados ·
// Otros. Se ejecuta la lógica real de js/mantenimiento.js.
const fs=require('fs'),vm=require('vm');
const R='c:/Users/LENOVO/OneDrive/Documents/GitHub/GDARSystem/';
let ok=0,mal=0;
const es=(l,g,e)=>{const b=String(g)===String(e);b?ok++:mal++;
  console.log((b?'  OK  ':'  MAL ')+l.padEnd(62)+'= '+g+(b?'':'  (esperado '+e+')'));};

const DB={equipos:[
  {id:1,codigo:'EXC-1',est:'Operativo'},
  {id:2,codigo:'EXC-2',est:'Operativo'},
  {id:3,codigo:'VOL-1',est:'Inoperativo'},
  {id:4,codigo:'ROD-1',est:'En Mantenimiento'},
  {id:5,codigo:'MOT-1',est:'Parado'},
  {id:6,codigo:'CFO-0',est:'Desmovilizado'},
  {id:7,codigo:'CAM-9',est:'En Tránsito'},
  {id:8,codigo:'CIS-9',est:'Alquilado'},
  {id:9,codigo:'GEN-1'},                                   // sin estado: cuenta como Operativo
  {id:10,codigo:'LUM-1',est:'',status:'Inoperativo'}        // solo con status
]};
const nodos={};
const nodo=id=>nodos[id]||(nodos[id]={id,innerHTML:''});
const src=fs.readFileSync(R+'js/mantenimiento.js','utf8');
// Solo la lógica de los filtros: desde sus variables hasta antes de rMaster
const ini=src.indexOf('let _mqFiltro=');
const fin=src.indexOf('function rMaster(){');
const ctx=vm.createContext({DB,document:{getElementById:nodo},console,String,Object,Array,rMaster(){}});
vm.runInContext(src.slice(ini,fin),ctx,{filename:'mantenimiento.js'});
const ev=x=>vm.runInContext(x,ctx);
const cods=()=>ev('_mqFiltrados().map(e=>e.codigo).join(",")');

console.log('\n== Todos ==');
es('arranca mostrando todo, como hasta ahora',ev('_mqFiltro'),'todos');
es('  los diez equipos',ev('_mqFiltrados().length'),10);

console.log('\n== Activos: los que están en el proyecto ==');
ev('_mqSet("activos")');
es('operativos, inoperativos, en mantenimiento y parados',cods(),'EXC-1,EXC-2,VOL-1,ROD-1,MOT-1,GEN-1,LUM-1');
es('  sin estado cuenta como operativo',cods().includes('GEN-1'),true);
es('  y se lee el status si est viene vacío',cods().includes('LUM-1'),true);
es('  no entra el desmovilizado',cods().includes('CFO-0'),false);
es('  ni el que está en tránsito',cods().includes('CAM-9'),false);

console.log('\n== Dentro de Activos ==');
ev('_mqSet("activos","oper")');
es('Operativos',cods(),'EXC-1,EXC-2,GEN-1');
ev('_mqSet("activos","inop")');
es('Inoperativos: inoperativo y en mantenimiento',cods(),'VOL-1,ROD-1,LUM-1');
ev('_mqSet("activos","parado")');
es('Parados aparte: sanos pero sin trabajar',cods(),'MOT-1');
ev('_mqSet("activos","")');
es('Todos los activos vuelve a los siete',ev('_mqFiltrados().length'),7);

console.log('\n== Desmovilizados y Otros ==');
ev('_mqSet("desmovilizados")');
es('Desmovilizados',cods(),'CFO-0');
es('  el sub-filtro de activos no se arrastra',ev('_mqSub'),'');
ev('_mqSet("otros")');
es('Otros: en tránsito, alquilado',cods(),'CAM-9,CIS-9');

console.log('\n== Nadie se pierde ==');
const suma=['activos','desmovilizados','otros']
  .reduce((s,g)=>s+ev(`DB.equipos.filter(e=>_mqGrupo(e)==="${g}").length`),0);
es('activos + desmovilizados + otros = todos',suma,DB.equipos.length);
const sumaSub=['oper','inop','parado']
  .reduce((s,g)=>s+ev(`DB.equipos.filter(e=>_mqGrupo(e)==="activos"&&_mqSubGrupo(e)==="${g}").length`),0);
es('operativos + inoperativos + parados = activos',sumaSub,7);

console.log('\n== Los botones ==');
ev('_mqSet("todos");_mqBotones()');
let H=nodo('mqFiltros').innerHTML;
es('los cuatro principales',/>Todos </.test(H)&&/>Activos </.test(H)&&/>Desmovilizados </.test(H)&&/>Otros </.test(H),true);
es('  con su cantidad',/Activos <span[^>]*>7</.test(H)&&/Otros <span[^>]*>2</.test(H),true);
es('  sin los de Activos todavía',/Operativos/.test(H),false);
ev('_mqSet("activos");_mqBotones()');
H=nodo('mqFiltros').innerHTML;
es('al elegir Activos aparecen Operativos e Inoperativos',/Operativos <span[^>]*>3</.test(H)&&/Inoperativos <span[^>]*>3</.test(H),true);
es('  y Parados, porque hay',/Parados <span[^>]*>1</.test(H),true);
DB.equipos=DB.equipos.filter(e=>e.est!=='Parado');
ev('_mqBotones()');
es('sin parados, ese botón no aparece',/Parados/.test(nodo('mqFiltros').innerHTML),false);

console.log('\n== Etiqueta para el PDF ==');
ev('_mqSet("activos","inop")');
es('dice el filtro completo',ev('_mqEtiqueta()'),'Activos · Inoperativos');
ev('_mqSet("todos")');
es('sin filtro',ev('_mqEtiqueta()'),'Todos');

console.log('\n== Enganche ==');
const html=fs.readFileSync(R+'index.html','utf8');
es('el contenedor está en la página',/id="mqFiltros"/.test(html),true);
es('la tabla usa el filtro',/const sorted=_mqFiltrados\(\)/.test(src),true);
es('el PDF imprime lo filtrado',/typeof _mqFiltrados==='function'\?_mqFiltrados\(\)/.test(src),true);
es('  y lo dice en el subtítulo',/'Filtro: '\+_mqEtiqueta\(\)/.test(src),true);

console.log('\n'+(mal?'X '+mal+' fallo(s)':'OK todo bien')+'  ·  '+ok+'/'+(ok+mal));
process.exit(mal?1:0);
