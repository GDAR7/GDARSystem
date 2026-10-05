// Auxilios Mecánicos · insumos y repuestos.
// Si el ítem está en el catálogo de materiales, su Código de Almacén y su
// Unidad salen de ahí y no se pueden editar en el auxilio. Un ítem que no
// está en el catálogo se escribe libremente.
const fs=require('fs'),vm=require('vm');
const R='c:/Users/LENOVO/OneDrive/Documents/GitHub/GDARSystem/';
let ok=0,mal=0;
const es=(l,g,e)=>{const b=String(g)===String(e);b?ok++:mal++;
  console.log((b?'  OK  ':'  MAL ')+l.padEnd(60)+'= '+g+(b?'':'  (esperado '+e+')'));};

const DB={
  catalogoItems:[
    {id:1,tipo:'INSUMOS',    cod:'INS-0015',desc:'ADBLUE / URI',      und:'GL'},
    {id:2,tipo:'MATERIALES', cod:'M-001',   desc:'FILTRO DE ACEITE',  und:'UND'},
    {id:3,tipo:'MATERIALES', cod:'M-002',   desc:'GRASA EP-2',        und:'KG'}
  ],
  auxiliosMecanicos:[],auxMecInsumos:[],equipos:[],partes:[],proveedores:[]
};

// ── DOM mínimo: una fila con sus 5 controles ───────────────────────────────
const Ctrl=v=>({value:v==null?'':String(v),readOnly:false,dataset:{},style:{cssText:''},title:''});
function fila(desc,cod,cant,und,origen){
  const inp=[Ctrl(desc),Ctrl(cod),Ctrl(cant),Ctrl(und),Ctrl(origen||'Almacén ECO')];
  return{_inp:inp,querySelectorAll:()=>inp};
}
const cuerpo={children:[]};
const ctx=vm.createContext({
  DB,console,Date,Math,Number,String,Object,Array,JSON,Set,
  document:{getElementById:id=>id==='amInsumosBody'?cuerpo:null,
    querySelector:()=>null,querySelectorAll:()=>[],
    createElement:()=>({style:{},dataset:{},innerHTML:'',appendChild(){}})},
  window:{location:{href:'https://ecosermo.gdarei.com/index.html'},open:()=>null},
  location:{href:'https://ecosermo.gdarei.com/index.html'},
  localStorage:{getItem:()=>null,setItem(){},removeItem(){}},
  EMPRESA:{nombre:'ECOSERMO',logo:'img/logo.png'},CU:{nombre:'Prueba'},
  toast(){},confirm:()=>true,openM(){},closeM(){},fmt:v=>String(v),today:()=>'2026-09-28',
  supaUpsert:async()=>null,supaDelete:async()=>{},nidSeguro:()=>1,setTimeout:()=>0,
  _provOptsHtml:()=>''
});
vm.runInContext(fs.readFileSync(R+'js/auxmec.js','utf8'),ctx,{filename:'auxmec.js'});
const sync=tr=>ctx._amInsumoSyncCatalogo(tr);
const bloq=c=>!!(c.readOnly&&c.dataset.bloq);

console.log('\n== Un ítem del catálogo ==');
let tr=fila('ADBLUE / URI','MAL-999','10','LITROS');
let mat=sync(tr);
es('se reconoce el material',mat&&mat.cod,'INS-0015');
es('el código se corrige al del catálogo',tr._inp[1].value,'INS-0015');
es('  y la unidad también',tr._inp[3].value,'GL');
es('el código queda bloqueado',bloq(tr._inp[1]),true);
es('  y la unidad igual',bloq(tr._inp[3]),true);
es('  se explica por qué',/catálogo de materiales/.test(tr._inp[3].title),true);
es('la cantidad sigue siendo editable',tr._inp[2].readOnly,false);
es('  y la descripción también',tr._inp[0].readOnly,false);
es('  y el origen',tr._inp[4].readOnly,false);

console.log('\n== Se reconoce aunque se escriba distinto ==');
tr=fila('  adblue / uri  ','','','');
sync(tr);
es('sin importar mayúsculas ni espacios',tr._inp[1].value,'INS-0015');
es('  trae su unidad',tr._inp[3].value,'GL');

console.log('\n== Un ítem que no está en el catálogo ==');
tr=fila('PERNO ESPECIAL HECHO A MEDIDA','LIBRE-1','2','JGO');
es('no se reconoce',sync(tr),null);
es('el código se respeta',tr._inp[1].value,'LIBRE-1');
es('  la unidad también',tr._inp[3].value,'JGO');
es('  y ambos quedan editables',bloq(tr._inp[1])||bloq(tr._inp[3]),false);

console.log('\n== Cambiar de un material a otro, y a uno libre ==');
tr=fila('ADBLUE / URI','','1','');
sync(tr);
es('primero toma ADBLUE',tr._inp[1].value+' · '+tr._inp[3].value,'INS-0015 · GL');
tr._inp[0].value='GRASA EP-2';
sync(tr);
es('al cambiar de material cambian los dos campos',tr._inp[1].value+' · '+tr._inp[3].value,'M-002 · KG');
es('  y siguen bloqueados',bloq(tr._inp[1])&&bloq(tr._inp[3]),true);
tr._inp[0].value='REPUESTO QUE NO ESTÁ EN ALMACÉN';
sync(tr);
es('al pasar a un ítem libre se desbloquean',bloq(tr._inp[1])||bloq(tr._inp[3]),false);
es('  sin borrar lo que ya estaba escrito',tr._inp[1].value,'M-002');
es('  y se quita la explicación',tr._inp[1].title,'');

console.log('\n== Lo que se guarda ==');
cuerpo.children=[
  fila('ADBLUE / URI','INVENTADO','10','LITROS'),          // manipulado a mano
  fila('FILTRO DE ACEITE','','4',''),                       // sin llenar
  fila('PERNO ESPECIAL','LIBRE-9','2','JGO'),               // libre
  fila('','','5','UND')                                     // sin descripción
];
const guardado=ctx.amGetInsumos();
es('las filas sin descripción se descartan',guardado.length,3);
es('el del catálogo se guarda con SU código',guardado[0].cod,'INS-0015');
es('  y con SU unidad, no la escrita',guardado[0].und,'GL');
es('  aunque la casilla dijera otra cosa',guardado[0].und==='LITROS',false);
es('el que no se llenó se completa solo',guardado[1].cod+' · '+guardado[1].und,'M-001 · UND');
es('el ítem libre conserva lo suyo',guardado[2].cod+' · '+guardado[2].und,'LIBRE-9 · JGO');
es('las cantidades no se tocan',guardado.map(g=>g.cant).join(','),'10,4,2');

console.log('\n== Buscador de equipo, ordenado por tipo ==');
DB.equipos=[
  {id:1,codigo:'VOL ECOP-001',nombre:'Volquete Volvo FMX',tipo:'Línea Blanca',placa:'BLS-845',sub:'Volquete'},
  {id:2,codigo:'EXC ECOP-003',nombre:'Excavadora Hyundai',tipo:'Línea Amarilla',sub:'Excavadora'},
  {id:3,codigo:'LUM ECOP-001',nombre:'Luminaria',tipo:'Equipos Menores',sub:'Luminaria'},
  {id:4,codigo:'CAM ECOP-001',nombre:'Camioneta Toyota Hilux',tipo:'Vehículo Menor',placa:'CBL-881',sub:'Camioneta'},
  {id:5,codigo:'EXC ECOP-001',nombre:'Excavadora CAT',tipo:'Línea Amarilla',sub:'Excavadora'},
  {id:6,codigo:'GRU-001',nombre:'Grúa',tipo:'Especial'}
];
let O=ctx._amEqOpcionesHtml('','');
const posG=t=>O.indexOf('label="'+t);
es('los grupos van en el orden de la operación',
  posG('Línea Amarilla')<posG('Línea Blanca')&&posG('Línea Blanca')<posG('Vehículo Menor')
  &&posG('Vehículo Menor')<posG('Equipos Menores')&&posG('Equipos Menores')<posG('Especial'),true);
es('  cada grupo dice cuántos tiene',/label="Línea Amarilla \(2\)"/.test(O),true);
es('  dentro del grupo, por código',O.indexOf('EXC ECOP-001')<O.indexOf('EXC ECOP-003'),true);
es('un tipo fuera de la lista va al final',posG('Especial')>posG('Equipos Menores'),true);
O=ctx._amEqOpcionesHtml('exc','');
es('buscar «exc» deja solo las excavadoras',(O.match(/<option value="\d/g)||[]).length,2);
es('  sin grupos vacíos',/Línea Blanca/.test(O),false);
es('busca por placa',/CAM ECOP-001/.test(ctx._amEqOpcionesHtml('cbl-881','')),true);
es('busca sin tildes ni mayúsculas',/LUM ECOP-001/.test(ctx._amEqOpcionesHtml('LUMINARÍA','')),true);
es('busca por subtipo',/VOL ECOP-001/.test(ctx._amEqOpcionesHtml('volquete','')),true);
es('el equipo ya elegido no desaparece al filtrar',/value="1"/.test(ctx._amEqOpcionesHtml('exc','1')),true);
es('cuántos coinciden',ctx._amEqCoinciden('exc',null).length,2);
const html2=fs.readFileSync(R+'index.html','utf8');
es('el buscador está sobre el combo',
  html2.indexOf('id="amEqBuscar"')>0&&html2.indexOf('id="amEqBuscar"')<html2.indexOf('id="amEq"'),true);
es('  y filtra al escribir',/oninput="_amEqFiltrar\(this\.value\)"/.test(html2),true);
const srcAm=fs.readFileSync(R+'js/auxmec.js','utf8');
es('si queda uno solo, queda elegido',/if\(q&&opciones\.length===1\)sel\.value=opciones\[0\]\.value/.test(srcAm),true);
es('al abrir un auxilio el buscador empieza vacío',/eqBus\.value=''/.test(srcAm),true);

console.log('\n== Enganche ==');
const src=fs.readFileSync(R+'js/auxmec.js','utf8');
const html=fs.readFileSync(R+'index.html','utf8');
es('al escribir la descripción se resuelve el catálogo',/oninput="_amInsumoDescInput\(this\)"/.test(src),true);
es('al abrir un auxilio guardado también',/_amInsumoSyncCatalogo\(tr\);\s*\r?\n\s*return tr;/.test(src),true);
es('el guardado no confía en la pantalla',/const mat=_amMatDe\(desc\)/.test(src),true);
es('index carga el módulo',/js\/auxmec\.js\?v=/.test(html),true);

console.log('\n'+(mal?'X '+mal+' fallo(s)':'OK todo bien')+'  ·  '+ok+'/'+(ok+mal));
process.exit(mal?1:0);
