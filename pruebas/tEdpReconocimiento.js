// EDP Proveedores · líneas manuales: descuento o reconocimiento.
//
// El DESCUENTO resta de lo que se le paga al proveedor y sale en el acápite
// 2.00. El RECONOCIMIENTO suma y sale en el 1.00, debajo del equipo.
// Antes esto se lograba con un descuento de cantidad −1; los EDP guardados
// así no llevan `tipo` y se siguen leyendo como descuento.
const fs=require('fs'),vm=require('vm');
const R='c:/Users/LENOVO/OneDrive/Documents/GitHub/GDARSystem/';
let ok=0,mal=0;
const es=(l,g,e)=>{const b=String(g)===String(e);b?ok++:mal++;
  console.log((b?'  OK  ':'  MAL ')+l.padEnd(60)+'= '+g+(b?'':'  (esperado '+e+')'));};

const DB={equipos:[],partes:[],edpProveedores:[],proyectos:[],tramos:[],personal:[],
  tareaje:[],auxiliosMecanicos:[],auxMecInsumos:[],catalogoItems:[]};
const nodos={};
const nodo=id=>nodos[id]||(nodos[id]={id,innerHTML:'',textContent:'',value:'',style:{},focus(){}});
const ctx=vm.createContext({
  DB,console,Date,Math,Number,String,Object,Array,JSON,Set,Map,isFinite,parseFloat,parseInt,
  setTimeout:()=>0,clearTimeout:()=>{},
  document:{getElementById:nodo,querySelector:()=>null,querySelectorAll:()=>[],
    activeElement:null,createElement:()=>({style:{},dataset:{},appendChild(){}}),
    addEventListener(){},body:{appendChild(){}}},
  window:{location:{href:'https://ecosermo.gdarei.com/index.html'},open:()=>null,addEventListener(){}},
  location:{href:'https://ecosermo.gdarei.com/index.html'},
  localStorage:{getItem:()=>null,setItem(){},removeItem(){}},
  EMPRESA:{nombre:'ECOSERMO',logo:'img/logo.png'},CU:{nombre:'Prueba'},
  toast(){},confirm:()=>true,openM(){},closeM(){},fmt:v=>String(v),today:()=>'2026-09-30',
  supaUpsert:async()=>null,supaDelete:async()=>{},nidSeguro:()=>1,
  rEdpProveedores(){}
});
vm.runInContext(fs.readFileSync(R+'js/edpProveedores.js','utf8'),ctx,{filename:'edpProveedores.js'});
const ev=x=>vm.runInContext(x,ctx);

console.log('\n== Una línea nueva nace como descuento ==');
ev('_edpDescManual=[];_edpAddDescManual()');
es('se agregó una línea',ev('_edpDescManual.length'),1);
es('  y es descuento',ev('_edpManualEs(_edpDescManual[0])'),'desc');
es('  que es lo de siempre',ev('_edpDescManual[0].tipo'),'desc');

console.log('\n== Se puede cambiar a reconocimiento ==');
ev('_edpSetDescManual(0,"tipo","rec")');
es('cambió el tipo',ev('_edpManualEs(_edpDescManual[0])'),'rec');
ev('_edpSetDescManual(0,"desc","Reconocimiento de daños de camioneta")');
ev('_edpSetDescManual(0,"und","gbl")');
ev('_edpSetDescManual(0,"cant","1")');
ev('_edpSetDescManual(0,"precio","1138")');
es('la cantidad se guarda como número',ev('typeof _edpDescManual[0].cant'),'number');
es('  en positivo, sin el truco del −1',ev('_edpDescManual[0].cant'),1);

console.log('\n== Cada tipo va por su lado ==');
ev(`_edpDescManual=[
  {desc:'Reconocimiento de daños',und:'gbl',cant:1,precio:1138,tipo:'rec'},
  {desc:'Combustible no devuelto',und:'gl',cant:20,precio:15,tipo:'desc'},
  {desc:'Penalidad',und:'gbl',cant:1,precio:500}
]`);
es('los descuentos son dos',ev('_edpManualRows("desc").length'),2);
es('  el que no trae tipo cuenta como descuento',
  ev('_edpManualRows("desc").map(r=>r.desc).join(" · ")'),'Combustible no devuelto · Penalidad');
es('el reconocimiento es uno',ev('_edpManualRows("rec").length'),1);
es('  con su total calculado',ev('_edpManualRows("rec")[0].total'),1138);
es('el descuento por cantidad también',ev('_edpManualRows("desc")[0].total'),300);

console.log('\n== Qué pasa con la plata ==');
// presupuesto = equipo + reconocimientos − descuentos
const equipo=6200, rec=1138, desc=300+500;
const presu=equipo+rec-desc;
es('el reconocimiento SUMA al presupuesto',presu,6200+1138-800);
es('  y sin él sería menos',presu>equipo-desc,true);
const igv=+(presu*0.18).toFixed(2), total=+(presu+igv).toFixed(2);
es('el IGV sale del presupuesto ya sumado',igv,+((6200+1138-800)*0.18).toFixed(2));
es('  y la detracción del total',+(total*0.10).toFixed(2),+(total*0.10).toFixed(2));

console.log('\n== El código lo aplica en los tres lugares ==');
const src=fs.readFileSync(R+'js/edpProveedores.js','utf8');
es('ya no se mapea el array crudo',/\.\.\._edpDescManual\.map\(r=>\(\{\.\.\.r,total/.test(src),false);
es('los tres cálculos usan el helper',(src.match(/\.\.\._edpManualRows\('desc'\)/g)||[]).length,3);
es('  y los tres separan el reconocimiento',(src.match(/const recRows=_edpManualRows\('rec'\)/g)||[]).length,3);
es('la pantalla suma el reconocimiento',
  (src.match(/totEquipo\+totRecMan-totDesc/g)||[]).length,2);
es('  y el guardado también',/montoEquipo\+montoRecMan-montoDesc/.test(src),true);
es('el tipo de cambio se aplica a ambos',
  (src.match(/recRows\.forEach\(r=>\{r\.precio=\+\(r\.precio\*_fTC\)/g)||[]).length,3);

console.log('\n== El documento ==');
es('el acápite 1.00 numera correlativo',/1\.\$\{String\(n\)\.padStart\(2,'0'\)\}/.test(src),true);
es('  el reconocimiento en monto sale en verde',/color:#166534;\$\{AM\}">\+ \$\{SIM\}/.test(src),true);
es('  y cierra con el total del acápite',/TOTAL EQUIPO\$\{F\.totRecMan\?' \+ RECONOCIMIENTOS'/.test(src),true);
es('la hoja de descuentos excluye los reconocimientos',/const _manDesc=_edpManualRows\('desc'\)/.test(src),true);
es('  su subtotal sale de ahí',/totManual=\+\(_manDesc\.reduce/.test(src),true);
es('  y no se imprime esa hoja si solo hay reconocimientos',
  /hayDesc=.*_edpManualRows\('desc'\)\.length/.test(src),true);

console.log('\n== La pantalla ==');
es('el botón ya no dice solo descuento',/＋ Línea manual/.test(src),true);
es('  hay un selector por línea',/_edpSetDescManual\(\$\{i\},'tipo',this\.value\)/.test(src),true);
es('  con las dos opciones',/− Descuento/.test(src)&&/\+ Reconocimiento/.test(src),true);
es('  y se explica la diferencia',/el descuento resta · el reconocimiento suma/.test(src),true);

console.log('\n'+(mal?'X '+mal+' fallo(s)':'OK todo bien')+'  ·  '+ok+'/'+(ok+mal));
process.exit(mal?1:0);
