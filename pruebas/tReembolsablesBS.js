// Reembolsables B.S. · filtros del registro. Se ejecuta el módulo real
// (js/reembolsables_otros.js, prefijo _via) con un DOM simulado.
//
// El filtro por EDP es el que se agregó último: el EDP llega a veces como
// número y a veces como texto, así que se comparan como texto.
const fs=require('fs'),vm=require('vm');
const R='c:/Users/LENOVO/OneDrive/Documents/GitHub/GDARSystem/';
let ok=0,mal=0;
const es=(l,g,e)=>{const b=String(g)===String(e);b?ok++:mal++;
  console.log((b?'  OK  ':'  MAL ')+l.padEnd(62)+'= '+g+(b?'':'  (esperado '+e+')'));};

const V=(id,edp,proy,prov,cod,importe)=>({id,edp,proyecto:proy,proveedor:prov,codigo:cod,
  nombreCodif:'Cod '+cod,fecha:'2026-08-1'+(id%9),serie:'FFA1',correlativo:5270+id,
  ruc:'20391062057',desc:'Servicio '+id,cantidad:1,unidad:'UND',precioUnit:importe,importe,tc:3.75,
  moneda:'SOLES',tipoCp:'FE',itemFac:1,obs:''});

const DB={viaticos:[
  V(1, 4,'RELAVERA R3','ISEM','R02',1000),
  V(2,'4','RELAVERA R3','ISEM','R02', 500),   // el mismo EDP, guardado como texto
  V(3,10,'RELAVERA R3','SODEXO','R05',300),
  V(4, 4,'OTRO PROYECTO','SODEXO','R05',200),
  V(5,null,'RELAVERA R3','ISEM','R02',100)    // sin EDP
]};

const nodos={};
const nodo=id=>nodos[id]||(nodos[id]={id,innerHTML:'',textContent:'',value:'',style:{},focus(){}});
let ventana=null;
const ctx=vm.createContext({
  DB,console,Date,Math,Number,String,Object,Array,JSON,Set,isNaN,parseFloat,parseInt,
  setTimeout:()=>0,
  document:{getElementById:nodo,querySelector:()=>null,querySelectorAll:()=>[],
    createElement:()=>({style:{},dataset:{},appendChild(){}})},
  window:{location:{href:'https://ecosermo.gdarei.com/index.html'},
    open:()=>{ventana={html:'',document:{write(h){ventana.html+=h;},close(){}},focus(){},print(){}};return ventana;}},
  location:{href:'https://ecosermo.gdarei.com/index.html'},
  localStorage:{getItem:()=>null,setItem(){},removeItem(){}},
  EMPRESA:{nombre:'ECOSERMO',logo:'img/logo.png'},
  toast(){},confirm:()=>true,CU:{nombre:'Prueba'},buscarFoco(){},
  openM(){},closeM(){},supaUpsert:async()=>null,supaDelete:async()=>{},nidSeguro:()=>99
});
vm.runInContext(fs.readFileSync(R+'js/reembolsables_otros.js','utf8'),ctx,{filename:'reembolsables_otros.js'});
const ev=x=>vm.runInContext(x,ctx);
const ids=()=>ev('_viaRows().map(r=>r.id).sort((a,b)=>a-b).join(",")');

console.log('\n== Sin filtros ==');
es('salen los cinco registros',ids(),'1,2,3,4,5');

console.log('\n== Filtro por EDP ==');
ev('_viaFiltEdp="4"');
es('el EDP 4 trae sus tres registros',ids(),'1,2,4');
es('  incluye el guardado como texto y el guardado como número',ids().includes('1')&&ids().includes('2'),true);
es('  deja fuera el EDP 10',ids().includes('3'),false);
es('  y el que no tiene EDP',ids().includes('5'),false);
ev('_viaFiltEdp="10"');
es('el EDP 10 trae solo el suyo',ids(),'3');
ev('_viaFiltEdp="99"');
es('un EDP que no existe no trae nada',ids(),'');

console.log('\n== Se combina con los demás filtros ==');
ev('_viaFiltEdp="4";_viaFiltProy="RELAVERA R3"');
es('EDP 4 + proyecto',ids(),'1,2');
ev('_viaFiltProv="SODEXO";_viaFiltProy=""');
es('EDP 4 + proveedor',ids(),'4');
ev('_viaFiltProv="";_viaFiltCod="R02"');
es('EDP 4 + código',ids(),'1,2');
ev('_viaQ="Servicio 1"');
es('  y con el buscador',ids(),'1');
ev('_viaQ="";_viaFiltCod="";_viaFiltEdp=""');

console.log('\n== La pantalla ==');
ev('rViaticos()');
let H=nodo('page-viaticos').innerHTML;
es('la barra tiene el selector de EDP',/_viaFiltEdp=this\.value;rViaticos\(\)/.test(H),true);
es('  rotulado EDP',/>EDP<\/span>/.test(H),true);
es('  con los EDP que existen',/>N° 4</.test(H)&&/>N° 10</.test(H),true);
es('  el 4 antes que el 10, ordenado como número',
  H.indexOf('>N° 4<')<H.indexOf('>N° 10<'),true);
es('  sin repetir el que está dos veces',(H.match(/>N° 4</g)||[]).length,1);
es('  y sin una opción vacía para los que no tienen EDP',(H.match(/>N° </g)||[]).length,0);
es('el buscador quedó después de ＋ Nuevo Registro',
  H.indexOf('id="viaBuscar"')>H.indexOf('＋ Nuevo Registro'),true);
es('  y sigue siendo uno solo',(H.match(/id="viaBuscar"/g)||[]).length,1);
es('sin filtros no se ofrece Limpiar',/✕ Limpiar<\/button>/.test(H),false);

ev('_viaFiltEdp="10";rViaticos()');
H=nodo('page-viaticos').innerHTML;
es('con el EDP filtrado aparece Limpiar',/✕ Limpiar<\/button>/.test(H),true);
es('  y Limpiar también borra el EDP',/_viaFiltEdp='';rViaticos\(\)/.test(H),true);
es('  el selector queda marcado',/value="10" selected/.test(H),true);
es('  los KPI cuentan solo lo filtrado',/>1<\/div>/.test(H),true);

console.log('\n== El Detalle por Código obedece al EDP, como al período ==');
ev('_viaFiltEdp="";_viaTab="detalle";_viaDetCod=""');
es('sin filtro, el detalle agrupa los dos códigos',
  ev('_viaDetGrupos().codsOrd.join(",")'),'R02,R05');
es('  con el total de todo',ev('_viaDetGrupos().totGen'),2100);
ev('_viaFiltEdp="10"');
es('con el EDP 10 queda un solo código',ev('_viaDetGrupos().codsOrd.join(",")'),'R05');
es('  y solo su registro',ev('_viaDetGrupos().rows.map(r=>r.id).join(",")'),'3');
es('  el total baja a lo del EDP',ev('_viaDetGrupos().totGen'),300);
ev('_viaFiltEdp="4"');
es('con el EDP 4 quedan los dos códigos',ev('_viaDetGrupos().codsOrd.join(",")'),'R02,R05');
es('  sin el registro del EDP 10',ev('_viaDetGrupos().rows.some(r=>r.id===3)'),false);
es('  ni el que no tiene EDP',ev('_viaDetGrupos().rows.some(r=>r.id===5)'),false);
es('  total 1000 + 500 + 200',ev('_viaDetGrupos().totGen'),1700);
es('el período sigue filtrando junto al EDP',
  (ev('_viaFDesde="2026-08-15";_viaDetGrupos().rows.length'),ev('_viaDetGrupos().rows.every(r=>r.fecha>="2026-08-15")')),true);
ev('_viaFDesde=""');

ev('rViaticos()');
let HD=nodo('page-viaticos').innerHTML;
es('la pestaña Detalle también muestra el selector de EDP',/_viaFiltEdp=this\.value;rViaticos\(\)/.test(HD),true);
es('  y solo los chips de código que quedan',/R05/.test(HD),true);
ev('_viaFiltEdp="10";rViaticos()');
HD=nodo('page-viaticos').innerHTML;
es('con el EDP 10 el chip R02 ya no se ofrece',/_viaDetSetCod\('R02'\)/.test(HD),false);

console.log('\n== El PDF del detalle ==');
ventana=null;ev('_viaDetPrint()');
es('se abre la ventana de impresión',!!ventana,true);
es('  con el EDP en el encabezado',/EDP N° 10/.test(ventana.html),true);
es('  y en el pie',(ventana.html.match(/EDP N° 10/g)||[]).length,2);
es('  solo con lo del EDP filtrado',/Servicio 3/.test(ventana.html),true);
es('  sin lo de los otros EDP',/Servicio 1<|Servicio 4/.test(ventana.html),false);
ev('_viaFiltEdp="";_viaTab="reg"');

console.log('\n== Si el EDP filtrado desaparece ==');
DB.viaticos=DB.viaticos.filter(r=>String(r.edp)!=='10');
ev('rViaticos()');
es('el filtro se suelta solo, no deja la tabla vacía',ev('_viaFiltEdp'),'');
es('  y vuelven los registros que quedan',ids(),'1,2,4,5');

console.log('\n== Enganche ==');
const src=fs.readFileSync(R+'js/reembolsables_otros.js','utf8');
const html=fs.readFileSync(R+'index.html','utf8');
es('el filtro está declarado con los otros',/let _viaFiltProv='',_viaFiltProy='',_viaFiltCod='',_viaFiltEdp=''/.test(src),true);
es('compara el EDP como texto',/String\(r&&r\.edp!=null\?r\.edp:''\)\.trim\(\)/.test(src),true);
es('los dos tabs usan el mismo filtro',(src.match(/_viaEnEdp/g)||[]).length>=4,true);
es('el selector vive en la barra de período, con la fecha',
  src.indexOf('_viaFiltEdp=this.value')>src.indexOf('function _viaFechaBar')
  &&src.indexOf('_viaFiltEdp=this.value')<src.indexOf('function _viaNuevo'),true);
es('index carga el módulo',/js\/reembolsables_otros\.js\?v=/.test(html),true);

console.log('\n'+(mal?'X '+mal+' fallo(s)':'OK todo bien')+'  ·  '+ok+'/'+(ok+mal));
process.exit(mal?1:0);
