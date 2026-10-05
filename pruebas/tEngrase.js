// Engrase mensual · qué equipos salen, en qué orden, y la cruz al pasar el
// mouse. Se ejecuta rEngrase() real: así se atrapa cualquier función usada
// sin definir, que la revisión de sintaxis no detecta.
const fs=require('fs'),vm=require('vm');
const R='c:/Users/LENOVO/OneDrive/Documents/GitHub/GDARSystem/';
let ok=0,mal=0;
const es=(l,g,e)=>{const b=String(g)===String(e);b?ok++:mal++;
  console.log((b?'  OK  ':'  MAL ')+l.padEnd(62)+'= '+g+(b?'':'  (esperado '+e+')'));};

const DB={
  equipos:[
    {id:1,codigo:'VOL ECOP-001',nombre:'Volquete',tipo:'Línea Blanca',sub:'Volquete',est:'Operativo'},
    {id:2,codigo:'TOR ECOP-001',nombre:'Tractor',tipo:'Línea Amarilla',sub:'Tractor Oruga',est:'Operativo'},
    {id:3,codigo:'EXC ECOP-003',nombre:'Excavadora 336',tipo:'Línea Amarilla',sub:'Excavadora',est:'Operativo'},
    {id:4,codigo:'EXC ECOP-002',nombre:'Excavadora 336',tipo:'Línea Amarilla',sub:'Excavadora',est:'Inoperativo'},
    // Desmovilizados, por estado y por subtipo (el caso real de EXC ECOP-001)
    {id:5,codigo:'MOT ECOP-001',nombre:'Motoniveladora',tipo:'Línea Amarilla',sub:'Motoniveladora',est:'Desmovilizado'},
    {id:6,codigo:'EXC ECOP-001',nombre:'Desmovilizado CATERPILLAR 336NG',tipo:'Línea Amarilla',sub:'Desmovilizado',est:'Operativo'},
    {id:7,codigo:'LUM ECOP-001',nombre:'Luminaria',tipo:'Equipos Menores',sub:'Luminaria',est:'Operativo'},
    {id:8,codigo:'CAM ECOP-001',nombre:'Camioneta',tipo:'Vehículo Menor',sub:'Camioneta',est:'Operativo'}
  ],
  engrase:[{id:1,eqId:3,fecha:'2026-10-14',tipo:'E'}],
  proyectos:[]
};
const nodos={};
const nodo=id=>nodos[id]||(nodos[id]={id,innerHTML:'',value:'',style:{},
  addEventListener(){},querySelectorAll:()=>[]});
nodo('engraseMes').value='2026-10';
const ctx=vm.createContext({
  DB,console,Date,Math,Number,String,Object,Array,JSON,Set,
  document:{getElementById:nodo,querySelector:()=>null,querySelectorAll:()=>[],
    addEventListener(){},createElement:()=>({style:{}})},
  localStorage:{getItem:()=>null,setItem(){}},window:{open:()=>null},toast(){}
});
vm.runInContext(fs.readFileSync(R+'js/engrase.js','utf8'),ctx,{filename:'engrase.js'});
const ev=x=>vm.runInContext(x,ctx);

console.log('\n== La pantalla se dibuja ==');
let error=null;
try{ev('rEngrase()');}catch(e){error=e.message;}
es('rEngrase() corre sin errores',error,null);
es('al abrir arranca en Línea Amarilla',nodo('engraseTipoFilt').value,'Línea Amarilla');
es('  y solo muestra esa línea',/VOL ECOP-001/.test(nodo('tbEngrase').innerHTML),false);

console.log('\n== «Todos los tipos» ya no rebota ==');
nodo('engraseTipoFilt').value='';                        // el usuario elige Todos
ev('rEngrase()');
es('elegir Todos se respeta',nodo('engraseTipoFilt').value,'');
const H=nodo('tbEngrase').innerHTML;
es('  y produce la grilla con toda la flota',/VOL ECOP-001/.test(H)&&/LUM ECOP-001/.test(H),true);
es('el combo lista los tipos en el orden de la operación',
  (o=>o.indexOf('Línea Amarilla')<o.indexOf('Línea Blanca')&&o.indexOf('Vehículo Menor')<o.indexOf('Equipos Menores'))(nodo('engraseTipoFilt').innerHTML),true);

console.log('\n== Ningún desmovilizado ==');
es('MOT ECOP-001 (estado Desmovilizado) no sale',/MOT ECOP-001/.test(H),false);
es('EXC ECOP-001 (subtipo Desmovilizado) tampoco',/EXC ECOP-001/.test(H),false);
es('el inoperativo sí sale: sigue en obra',/EXC ECOP-002/.test(H),true);
es('  regla por estado',ev('_engDesmovilizado({est:"Desmovilizado"})'),true);
es('  regla por subtipo',ev('_engDesmovilizado({est:"Operativo",sub:"Desmovilizado"})'),true);
es('  un operativo normal no',ev('_engDesmovilizado({est:"Operativo",sub:"Excavadora"})'),false);

console.log('\n== Orden: tipo → subtipo → código ==');
const pos=c=>H.indexOf(c);
es('Línea Amarilla antes que Línea Blanca',pos('EXC ECOP-002')<pos('VOL ECOP-001'),true);
es('Línea Blanca antes que Vehículo Menor',pos('VOL ECOP-001')<pos('CAM ECOP-001'),true);
es('Vehículo Menor antes que Equipos Menores',pos('CAM ECOP-001')<pos('LUM ECOP-001'),true);
es('dentro de Línea Amarilla, Excavadora antes que Tractor',pos('EXC ECOP-003')<pos('TOR ECOP-001'),true);
es('y entre excavadoras, por código',pos('EXC ECOP-002')<pos('EXC ECOP-003'),true);

console.log('\n== Encabezados de grupo ==');
es('un encabezado por cada tipo·subtipo',(H.match(/class="eng-grupo"/g)||[]).length,5);
es('  con su cantidad',/Línea Amarilla · EXCAVADORA <span[^>]*>\(2\)/.test(H),true);
es('  que ocupa todo el ancho',new RegExp('colspan="'+(5+31+1)+'"').test(H),true);
es('la numeración sigue corrida por equipo, no por grupo',/>6<\/td>/.test(H)&&!/>7<\/td>/.test(H),true);

console.log('\n== La cruz al pasar el mouse ==');
es('cada celda de día sabe su columna',(H.match(/<td id="eng-\d+-[\d-]+" data-c="\d+"/g)||[]).length,6*31);
es('  y el encabezado del día también',(H.match(/<th data-c="\d+"/g)||[]).length,31);
const css=fs.readFileSync(R+'css/styles.css','utf8');
es('la fila y la columna en blanco suave',/#tbEngrase tr\.eng-hrow>td,#tbEngrase \.eng-hcol\{box-shadow:inset 0 0 0 999px rgba\(255,255,255/.test(css),true);
es('  el cruce en amarillo',/#tbEngrase td\.eng-hcross\{box-shadow:inset 0 0 0 999px rgba\(250,204,21/.test(css),true);
es('  sin tapar el color de P y E (sombra interior)',/inset 0 0 0 999px/.test(css),true);
const src=fs.readFileSync(R+'js/engrase.js','utf8');
es('se engancha una sola vez aunque la grilla se redibuje',/if\(!tb\|\|tb\._engHover\)return/.test(src),true);
es('  y se apaga al salir de la tabla',/addEventListener\('mouseleave',_engHoverOff\)/.test(src),true);

console.log('\n== El PDF muestra lo mismo ==');
es('también sin desmovilizados y ordenado',
  /\.filter\(eq=>\(!tipoFiltroP\|\|eq\.tipo===tipoFiltroP\)&&!_engDesmovilizado\(eq\)\)\s*\.sort\(_engOrden\)/.test(src),true);

console.log('\n'+(mal?'X '+mal+' fallo(s)':'OK todo bien')+'  ·  '+ok+'/'+(ok+mal));
process.exit(mal?1:0);
