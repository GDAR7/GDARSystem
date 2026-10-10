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

console.log('\n== Proyecto: arranca en el N° 04 ==');
es('el filtro de proyecto arranca en EPY-004-26',ev('_mqProy'),'EPY-004-26');
// Tres equipos de prueba pasan a otros proyectos
DB.equipos[0].proyecto='EPY-004-26';DB.equipos[1].proyecto='EPY-004-26';DB.equipos[2].proyecto='EPY-001-26';
es('  solo muestra los del 04',cods(),'EXC-1,EXC-2');
es('  y los conteos de Estado son del 04',ev("DB.equipos.filter(_mqEnProy).filter(e=>_mqGrupo(e)==='activos').length"),2);
ev("_mqSetProy('EPY-001-26')");
es('cambiar de proyecto',cods(),'VOL-1');
ev("_mqSetProy('EPY-001-26')");
es('tocar el elegido lo suelta: todos los proyectos',ev('_mqProy'),'');
es('  y vuelven los diez',ev('_mqFiltrados().length'),10);
es('sin proyecto se agrupa aparte',ev("_mqProyDe({})"),'(sin proyecto)');
es('la etiqueta del PDF dice el proyecto',(ev("_mqProy='EPY-004-26'"),ev('_mqEtiqueta()')),'EPY-004-26 · Todos');
ev("_mqBotones()");
const HP=nodo('mqFiltros').innerHTML;
es('la fila de proyecto va antes que Estado',HP.indexOf('Proyecto:')<HP.indexOf('Estado:'),true);
es('  con cada proyecto y su cantidad',/EPY-004-26 <span[^>]*>2 eq\./.test(HP)&&/EPY-001-26 <span[^>]*>1 eq\./.test(HP),true);
// El resto de la suite mide los niveles con todos los proyectos
ev("_mqProy=''");
DB.equipos.forEach(e=>{delete e.proyecto;});

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
es('rótulo Estado adelante, como en combustible',/>Estado:</.test(H),true);
es('los cuatro principales',/Todos <span/.test(H)&&/Activos <span/.test(H)&&/Desmovilizados <span/.test(H)&&/Otros <span/.test(H),true);
es('  con su cantidad',/Activos <span[^>]*>7 eq\.</.test(H)&&/Otros <span[^>]*>2 eq\.</.test(H),true);
es('  en píldoras redondeadas',/border-radius:20px/.test(H),true);
es('  Todos marcado en celeste al inicio',/border:1\.5px solid #06b6d4/.test(H),true);
es('  sin el segundo nivel todavía',/OPERATIVOS/.test(H),false);
ev('_mqSet("activos");_mqBotones()');
H=nodo('mqFiltros').innerHTML;
es('Activos queda en naranja con ✕',/rgba\(249,115,22,\.18\)/.test(H)&&/ ✕/.test(H),true);
es('  y tocarlo de nuevo lo suelta',/_mqSet\('todos'\)" style="display:inline-flex;align-items:center;gap:\.4rem;padding:\.35rem \.8rem;border-radius:20px;cursor:pointer;font-size:\.76rem;font-weight:700;border:1\.5px solid #f97316/.test(H),true);
es('aparece el recuadro punteado con ↳',/border:1px dashed rgba\(139,92,246,\.4\)/.test(H)&&/↳ Condición:/.test(H),true);
es('  con Operativos e Inoperativos',/OPERATIVOS <span[^>]*>3 eq\.</.test(H)&&/INOPERATIVOS <span[^>]*>3 eq\.</.test(H),true);
es('  y Parados, porque hay',/PARADOS <span[^>]*>1 eq\.</.test(H),true);
ev('_mqSet("activos","inop");_mqBotones()');
es('el sub elegido en violeta con ✕',/rgba\(139,92,246,\.2\)/.test(nodo('mqFiltros').innerHTML),true);
es('  y tocarlo de nuevo vuelve a todos los activos',/_mqSet\('activos',''\)/.test(nodo('mqFiltros').innerHTML),true);
DB.equipos=DB.equipos.filter(e=>e.est!=='Parado');
ev('_mqBotones()');
es('sin parados, ese botón no aparece',/PARADOS/.test(nodo('mqFiltros').innerHTML),false);

console.log('\n== Tercer y cuarto nivel: tipo y subtipo ==');
const _eqPrev=DB.equipos;
DB.equipos=[
  {id:1,codigo:'EXC-1',est:'Operativo',tipo:'Línea Amarilla',sub:'Excavadora'},
  {id:2,codigo:'EXC-2',est:'Operativo',tipo:'Línea Amarilla',sub:'Excavadora'},
  {id:3,codigo:'TRA-1',est:'Operativo',tipo:'Línea Amarilla',sub:'Tractor Oruga'},
  {id:4,codigo:'VOL-1',est:'Operativo',tipo:'Línea Blanca',sub:'Volquete'},
  {id:5,codigo:'CIS-1',est:'Operativo',tipo:'Línea Blanca',sub:'Cisterna de agua'},
  {id:6,codigo:'CAM-1',est:'Operativo',tipo:'Vehículo Menor',sub:'Camioneta'},
  {id:7,codigo:'LUM-1',est:'Operativo',tipo:'Equipos Menores',sub:'Luminaria'},
  {id:8,codigo:'RAR-1',est:'Operativo',tipo:'Maquinaria rara',sub:'Grúa'},     // tipo fuera de la lista
  {id:9,codigo:'EXC-9',est:'Inoperativo',tipo:'Línea Amarilla',sub:'Excavadora'},
  {id:10,codigo:'EXC-D',est:'Desmovilizado',tipo:'Línea Amarilla',sub:'Excavadora'}
];
ev('_mqSet("activos")');ev('_mqBotones()');
es('sin condición elegida no aparece el tipo',/por tipo:/.test(nodo('mqFiltros').innerHTML),false);
ev('_mqSet("activos","oper");_mqBotones()');
let T=nodo('mqFiltros').innerHTML;
es('elegida la condición, aparece «Operativos por tipo»',/↳ Operativos por tipo:/.test(T),true);
es('  con los cinco tipos',['Línea Amarilla','Línea Blanca','Vehículo Menor','Equipos Menores','Otros']
  .every(t=>T.includes(t+' <span')),true);
es('  y su cantidad dentro de los operativos',/Línea Amarilla <span[^>]*>3 eq\./.test(T),true);
es('  el inoperativo no se cuenta aquí',/Línea Amarilla <span[^>]*>4 eq\./.test(T),false);
es('un tipo que no está en la lista va a Otros',ev('_mqTipoDe({tipo:"Maquinaria rara"})'),'Otros');
ev('_mqSetTipo("Línea Amarilla")');
es('Línea Amarilla operativa',cods(),'EXC-1,EXC-2,TRA-1');
ev('_mqBotones()');T=nodo('mqFiltros').innerHTML;
es('aparece el cuarto nivel con sus subtipos',/↳ Línea Amarilla:/.test(T),true);
es('  Excavadora con 2, primero porque tiene más',T.indexOf('EXCAVADORA')<T.indexOf('TRACTOR ORUGA'),true);
es('  sin subtipos de otras líneas',/VOLQUETE/.test(T),false);
ev('_mqSetSubtipo("Excavadora")');
es('solo las excavadoras operativas',cods(),'EXC-1,EXC-2');
es('  sin la inoperativa ni la desmovilizada',cods().includes('EXC-9')||cods().includes('EXC-D'),false);
es('la etiqueta del PDF dice los cuatro niveles',ev('_mqEtiqueta()'),'Activos · Operativos · Línea Amarilla · Excavadora');
ev('_mqSetSubtipo("Excavadora")');
es('tocarlo de nuevo suelta el subtipo',cods(),'EXC-1,EXC-2,TRA-1');
ev('_mqSetSubtipo("Excavadora");_mqSetTipo("Línea Blanca")');
es('cambiar de tipo suelta el subtipo anterior',ev('_mqSubtipo'),'');
es('  y muestra Línea Blanca',cods(),'VOL-1,CIS-1');
ev('_mqSet("activos","inop")');
es('cambiar de condición suelta tipo y subtipo',ev('_mqTipo+"|"+_mqSubtipo'),'|');
DB.equipos=_eqPrev;

console.log('\n== Etiqueta para el PDF ==');
ev('_mqSet("activos","inop")');
es('dice el filtro completo',ev('_mqEtiqueta()'),'Activos · Inoperativos');
ev('_mqSet("todos")');
es('sin filtro',ev('_mqEtiqueta()'),'Todos');

console.log('\n== Enganche ==');
const html=fs.readFileSync(R+'index.html','utf8');
es('el contenedor está en la página',/id="mqFiltros"/.test(html),true);
es('  sobre la tabla, a todo el ancho, no en la cabecera',
  html.indexOf('id="mqFiltros"')<html.indexOf('<span class="card-title">Flota Completa</span>'),true);
es('la tabla usa el filtro',/const sorted=_mqFiltrados\(\)/.test(src),true);
es('el PDF imprime lo filtrado',/typeof _mqFiltrados==='function'\?_mqFiltrados\(\)/.test(src),true);
es('  y lo dice en el subtítulo',/'Filtro: '\+_mqEtiqueta\(\)/.test(src),true);

console.log('\n'+(mal?'X '+mal+' fallo(s)':'OK todo bien')+'  ·  '+ok+'/'+(ok+mal));
process.exit(mal?1:0);
