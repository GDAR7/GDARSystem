// Cost Control · buscador de Equipos y Personal. Lo que importa: que al
// escribir NO se redibuje la caja (el cursor no se pierde), que filtre bien
// (sin tildes, varias palabras) y que los totales y la exportación cuadren.
const fs=require('fs'),vm=require('vm');
const R='c:/Users/LENOVO/OneDrive/Documents/GitHub/GDARSystem/';
let ok=0,mal=0;
const es=(l,g,e)=>{const b=String(g)===String(e);b?ok++:mal++;
  console.log((b?'  OK  ':'  MAL ')+l.padEnd(62)+'= '+g+(b?'':'  (esperado '+e+')'));};

const DB={
  tarifasEq:[],ventaPersonal:[],
  equipos:[
    {id:1,codigo:'VOL_ECOP-001',marca:'VOLVO',modelo:'FMX 6X4 R',sub:'Volquete',tipo:'Línea Blanca',proveedor:'PANDAL',tarifa:80,tarifaUn:'HM',proyecto:'EPY-001-26'},
    {id:2,codigo:'VOL_ECOP-003',marca:'VOLVO',modelo:'FMX 6X4 R',sub:'Volquete',tipo:'Línea Blanca',proveedor:'PANDAL',tarifa:80,tarifaUn:'HM',proyecto:'EPY-001-26'},
    {id:3,codigo:'CAG_ECOP-001',marca:'HINO',modelo:'500',sub:'Cisterna de agua',tipo:'Línea Blanca',proveedor:'2MMICON',tarifa:90,tarifaUn:'HM',proyecto:'EPY-001-26'},
    {id:4,codigo:'EXC-01',marca:'CAT',modelo:'336',sub:'Excavadora',tipo:'Línea Amarilla',proveedor:'Ecosermo',tarifa:120,tarifaUn:'HM',proyecto:'EPY-004-26'}
  ],
  partes:[{id:1,eqId:1,fecha:'2026-02-01',ef:10},{id:2,eqId:2,fecha:'2026-02-02',ef:6},
          {id:3,eqId:3,fecha:'2026-02-03',ef:8},{id:4,eqId:4,fecha:'2026-02-05',ef:4}],
  combustible:[],edpProveedores:[]
};

// DOM mínimo: cada nodo recuerda cuántas veces se le cambió el innerHTML
const nodos={};let activo=null;
const nodo=id=>nodos[id]||(nodos[id]={id,_html:'',escrito:0,style:{},value:'',textContent:'',
  get innerHTML(){return this._html;},set innerHTML(h){this._html=h;this.escrito++;},
  focus(){activo=this;},setSelectionRange(a){this.cursor=a;},selectionStart:0});
const timers=[];
const ctx=vm.createContext({
  DB,console,Date,Math,Number,String,Object,Array,JSON,isNaN,parseFloat,parseInt,Set,Map,
  localStorage:{getItem:()=>null,setItem(){},removeItem(){}},
  document:{getElementById:nodo,addEventListener(){},querySelectorAll:()=>[],get activeElement(){return activo;}},
  toast(){},XLSX:{utils:{aoa_to_sheet:a=>({aoa:a}),book_new:()=>({hojas:[]}),
    book_append_sheet:(wb,ws,n)=>wb.hojas.push({ws,n}),encode_range:()=>'A1'},writeFile:(wb)=>{ctx.libro=wb;}},
  window:{location:{href:'x'}},
  setTimeout:f=>{timers.push(f);return timers.length;},clearTimeout:()=>{timers.length=0;},
  hhVentaPeriodo:()=>({filas:[
    {p:{ape:'RODRÍGUEZ ALCALDE',nom:'ABEL',dni:'94208972',cargo:'Operador Excavadora'},cargo:'Operador Excavadora',trab:20,libre:4,dlt:2,tarifa:6091.40,venta:5200.10},
    {p:{ape:'CRUZ PEÑA',nom:'LUIS',dni:'40000001',cargo:'Operario'},cargo:'Operario',trab:18,libre:3,dlt:0,tarifa:5237.30,venta:3900.55}]})
});
['js/costcontrol.js','js/costcontrolAnual.js','js/costcontrolExport.js'].forEach(f=>
  vm.runInContext(fs.readFileSync(R+f,'utf8'),ctx,{filename:f}));
vm.runInContext(`_aSoles=v=>+v||0;_ccPeriodo=()=>({desde:'2026-01-21',hasta:'2026-02-20',label:'Febrero 2026',dias:31});`,ctx);
const ev=x=>vm.runInContext(x,ctx);
const filasEq=()=>(nodo('ccPanel-equipos').innerHTML.match(/ondblclick="editEquipo\(\d+\)"/g)||[]).length;
const filasHH=()=>(nodo('ccPanel-personal').innerHTML.match(/<tr onmouseover/g)||[]).length;
const tecla=v=>{ev(`_ccBuscar(${JSON.stringify(v)})`);};
const espera=()=>{while(timers.length)timers.shift()();};

console.log('\n== La caja de búsqueda ==');
ev('_ccTabActiva="equipos";rCostControl()');
const pag=nodo('page-costControl');
// El DOM simulado no separa los paneles del innerHTML de la página: se llenan aparte
ev('_ccBuscaAplicar()');
es('aparece en la barra de pestañas',/id="ccBusca"[^>]*oninput="_ccBuscar\(this\.value\)"/.test(pag.innerHTML),true);
es('sin filtro: los 4 equipos',filasEq(),4);

console.log('\n== Escribir no redibuja la caja ==');
const antesPag=pag.escrito;
tecla('v');tecla('vo');tecla('vol');
es('mientras se escribe aún no se repinta nada',nodo('ccPanel-equipos').innerHTML.includes('CAG_ECOP-001'),true);
espera();
es('tras la última tecla filtra: 2 volquetes Volvo',filasEq(),2);
es('la página (y la caja) no se volvió a escribir',pag.escrito,antesPag);
es('contador',nodo('ccBuscaCnt').textContent,'2 de 4');
es('total de la tabla = lo que se ve (2 × 80 × h)',/TOTAL EQUIPOS/.test(nodo('ccPanel-equipos').innerHTML),true);

console.log('\n== Cómo busca ==');
tecla('003');espera();es('por código',filasEq(),1);
tecla('cisterna');espera();es('por descripción',filasEq(),1);
tecla('LINEA AMARILLA');espera();es('sin tildes ni mayúsculas (Línea Amarilla)',filasEq(),1);
tecla('volvo 003');espera();es('varias palabras, en cualquier orden',filasEq(),1);
tecla('pandal');espera();es('por proveedor',filasEq(),2);
tecla('zzz');espera();
es('sin coincidencias: lo dice y ofrece limpiar',/Nada coincide[\s\S]*Limpiar búsqueda/.test(nodo('ccPanel-equipos').innerHTML),true);
ev(`_ccBuscar('',true)`);es('limpiar (✕ / Esc): vuelven los 4 al instante',filasEq(),4);

console.log('\n== Personal ==');
ev('_ccTab("personal")');
tecla('rodriguez');espera();
es('busca por nombre, sin tilde',filasHH(),1);
tecla('40000001');espera();es('  y por DNI',filasHH(),1);
tecla('rodriguez');espera();
es('contador según la pestaña',nodo('ccBuscaCnt').textContent,'1 de 2');
ev('_ccTab("resumen")');es('en Resumen la caja se oculta',nodo('ccBuscaWrap').style.display,'none');
ev('_ccTab("personal")');es('vuelve en Personal',nodo('ccBuscaWrap').style.display,'flex');

console.log('\n== Si la página se redibuja mientras se escribe ==');
ev('_ccTabActiva="equipos"');ev(`_ccBuscar('volvo',true)`);
activo=nodo('ccBusca');activo.selectionStart=3;activo.id='ccBusca';
ev('rCostControl()');
es('conserva lo escrito',/id="ccBusca" type="text" value="volvo"/.test(pag.innerHTML),true);
es('devuelve el foco a la caja',activo===nodo('ccBusca'),true);
es('  con el cursor donde estaba',nodo('ccBusca').cursor,3);
es('y sigue filtrado',filasEq(),2);
activo=null;

console.log('\n== KPI y exportación ==');
const tot=ev('_ccCalcEq(_ccPeriodo(),"seca").totalVentaEq');
es('los KPI de arriba siguen siendo del período completo',pag.innerHTML.includes(ev(`_ccFmt(${tot})`)),true);
const D=ev('_ccxDatos()');
es('el Excel/PDF de Equipos trae solo lo filtrado',D.eqRows.length,2);
es('  con su total rehecho',Math.round(D.totalVentaEq),Math.round(D.eqRows.reduce((s,r)=>s+r.costo,0)));
es('  y lo anota en el encabezado',/búsqueda "volvo"/.test(ev('_ccxContexto(_ccxDatos())')),true);
ev('_ccTabActiva="resumen"');
es('el Resumen no se filtra',ev('_ccxDatos().eqRows.length'),4);
es('texto con comillas no rompe la caja',(ev(`_ccBusca='a"b<c';_ccTabActiva="equipos";rCostControl();`),/value="a&quot;b&lt;c"/.test(pag.innerHTML)),true);

console.log('\n'+(mal?'✗ '+mal+' FALLAS':'OK todo bien')+'  ·  '+ok+'/'+(ok+mal));
process.exit(mal?1:0);
