const fs=require('fs');
const R='c:/Users/LENOVO/OneDrive/Documents/GitHub/GDARSystem/';
global.localStorage={getItem:()=>null,setItem:()=>{},removeItem:()=>{}};
const nodos={};
const mk=id=>nodos[id]={id,innerHTML:'',style:{},value:'',textContent:'',classList:{contains:()=>false,add(){}}};
['thPlanilla','tbPlanillaBody','tfPlanilla','planillaResumen','planillaCard','plVistas','plFiltros',
 'plCierreBar','plMes','plAnio','plProy','blPanel','blLista','plTablaWrap','tbPlanilla','plCascada'].forEach(mk);
nodos.plMes.value='7';nodos.plAnio.value='2026';nodos.plProy.value='';
nodos.tbPlanilla.tHead=null;nodos.tbPlanilla.tBodies=[];nodos.tbPlanilla.tFoot=null;
global.document={getElementById:id=>nodos[id]||null,querySelector:()=>null,querySelectorAll:()=>[]};
global.window={location:{href:'https://x/i.html'},open:()=>null};
global.toast=()=>{};global.openM=()=>{};global.closeM=()=>{};global.confirm=()=>true;
global.isModuleReadOnly=()=>false;global.nid=()=>1;let q=0;global.nidSeguro=()=>++q;
global.supaUpsert=async()=>null;global.syncSheet=()=>{};
global.DB={personal:[],tareaje:[],planillaMes:[],afpTasas:[],proyectos:[],planillaCierre:[],planillaCerrada:[]};

const src=fs.readFileSync(R+'js/planilla.js','utf8')+'\n'+fs.readFileSync(R+'js/afpTasas.js','utf8')
 +'\n'+fs.readFileSync(R+'js/planillaCierre.js','utf8')+'\n'+fs.readFileSync(R+'js/boletaPago.js','utf8')
 +'\n;global.genPlanilla=genPlanilla;global.PL_COLS=PL_COLS;global.PL_GRUPOS=PL_GRUPOS;'
 +'global.PL_VISTAS=PL_VISTAS;global.plSetGrupo=plSetGrupo;global.plToggleColCascada=plToggleColCascada;'
 +'global.plLimpiarCascada=plLimpiarCascada;global.plSetVista=plSetVista;'
 +'global._plColsVisibles=_plColsVisibles;global._plCampoDe=_plCampoDe;global._plGruposConCols=_plGruposConCols;'
 +'global._PL_IDENT=_PL_IDENT;global._getGrupo=()=>_plGrupo;global._getVista=()=>_plVista;global._getOff=()=>_plColOff;'
 +'_plGenMes=7;_plGenAnio=2026;';
eval(src);

let ok=0,mal=0;
const es=(l,g,e)=>{const b=String(g)===String(e);b?ok++:mal++;
  console.log((b?'  OK  ':'  MAL ')+l.padEnd(56)+'= '+g+(b?'':'  (esperado '+e+')'));};

DB.personal=[
  {id:1,dni:'10199407',ape:'RODRIGUEZ',nom:'ANDRES',cargo:'ING',cat:'Staff',sue:9000,asig:1,movilidad:250,afp:'SNP',est:'Activo',tipo:'Staff'},
  {id:2,dni:'46108109',ape:'ROJAS',nom:'MARIA',cargo:'ADM',cat:'Staff',sue:8000,asig:0,movilidad:0,afp:'INTEGRA',est:'Activo',tipo:'Staff'},
  {id:3,dni:'43616432',ape:'MELENDREZ',nom:'YONDER',cargo:'ALM',cat:'Obrero',sue:3000,asig:0,movilidad:0,afp:'SNP',est:'Activo',tipo:'Obrero'}
];
[1,2,3].forEach(id=>{for(let d=1;d<=31;d++)DB.tareaje.push({personalId:id,fecha:'2026-07-'+String(d).padStart(2,'0'),tipo:'TD'});});
// Solo uno tiene gratificación y bono; así los contadores tienen algo que decir
DB.planillaMes=[{id:9,personalId:1,mes:7,anio:2026,gratificacion:4500,bono:300,adelanto:200}];

console.log('\n== Los grupos que se pueden filtrar ==');
const grupos=_plGruposConCols().map(([g])=>g);
es('están los de la captura',grupos.includes('gratif')&&grupos.includes('bases'),true);
es('también las dos deducciones',grupos.includes('dedApo')&&grupos.includes('dedOtr'),true);
es('los botones no son un grupo',grupos.includes('acc'),false);
es('ni la columna de identificación',grupos.includes('datos'),false);
es('todos tienen rótulo',grupos.every(g=>PL_GRUPOS[g]&&PL_GRUPOS[g].l),true);

console.log('\n== De qué campo sale cada columna ==');
const campo=k=>_plCampoDe(PL_COLS.find(c=>c.k===k));
es('asigFam',campo('asigFam'),'asigFam');
es('gratif',campo('gratif'),'gratificacion');
es('totDed',campo('totDed'),'totalDeduccion');
es('neto',campo('neto'),'neto');
es('baseRenta5',campo('baseRenta5'),'baseRenta5');
es('snp: no confunde el régimen con el importe',campo('snp'),'snp');
es('obligAfp: igual',campo('obligAfp'),'obligAfp');
es('adelantos',campo('adelantos'),'adelanto');

console.log('\n== Elegir un grupo deja solo sus columnas ==');
genPlanilla();
const nTodas=PL_COLS.length;   // el total real, no el de la vista Resumen
plSetGrupo('gratif');
es('el grupo queda elegido',_getGrupo(),'gratif');
const vis=_plColsVisibles().map(c=>c.k);
es('todas las visibles son del grupo o identifican',
   vis.every(k=>{const c=PL_COLS.find(x=>x.k===k);return c.g==='gratif'||_PL_IDENT.includes(k)||k==='acc';}),true);
es('sigue el nombre del trabajador',vis.includes('nom'),true);
es('y el DNI',vis.includes('dni'),true);
es('están las columnas de gratificaciones',vis.includes('gratif')&&vis.includes('totGratif'),true);
es('no hay columnas de otro grupo',vis.includes('neto'),false);
es('son menos que todas',vis.length<nTodas,true);

console.log('\n== Apagar y encender columnas del grupo ==');
plToggleColCascada('bonif9');
es('la columna se apagó',_getOff().has('bonif9'),true);
es('  y ya no se muestra',_plColsVisibles().some(c=>c.k==='bonif9'),false);
es('  pero las demás siguen',_plColsVisibles().some(c=>c.k==='gratif'),true);
plToggleColCascada('bonif9');
es('vuelve a encenderse',_plColsVisibles().some(c=>c.k==='bonif9'),true);

console.log('\n== Cambiar de grupo ==');
plSetGrupo('bases');
es('ahora es afectos base',_getGrupo(),'bases');
es('con sus columnas',_plColsVisibles().some(c=>c.k==='baseRenta5'),true);
es('  y sin las de gratificaciones',_plColsVisibles().some(c=>c.k==='totGratif'),false);
es('lo apagado antes no se arrastra',_getOff().size,0);
plSetGrupo('bases');
es('volver a pulsarlo lo quita',_getGrupo(),'null');

console.log('\n== La cascada y las vistas no se pisan ==');
plSetGrupo('dedApo');
es('con grupo, ninguna vista queda activa',_getVista(),'');
es('  y la barra no marca ninguna',/border:1\.5px solid var\(--adm\)/.test(nodos.plVistas.innerHTML),false);
plSetVista('resumen');
es('elegir una vista limpia el grupo',_getGrupo(),'null');
es('  y sus columnas apagadas',_getOff().size,0);
es('  y vuelve a mandar la vista',_plColsVisibles().some(c=>c.k==='neto'),true);

console.log('\n== Los chips y sus contadores ==');
plSetGrupo('gratif');
const h=nodos.plCascada.innerHTML;
es('hay una fila de grupos',/Grupo:/.test(h),true);
es('con el botón Todos',/plLimpiarCascada\(\)/.test(h),true);
es('y una fila de columnas debajo',/↳ GRATIFICACIONES|↳ Gratificaciones/i.test(h),true);
es('cada columna es pulsable',/plToggleColCascada\(/.test(h),true);
es('solo uno tiene gratificación',/>Gratif\.<\/?[^>]*>?\s*<span[^>]*>1</.test(h)||h.includes('>1<'),true);
es('se explica el número',/cuántos trabajadores tienen dato/.test(h),true);
plLimpiarCascada();
es('al limpiar no queda la fila de columnas',/↳/.test(nodos.plCascada.innerHTML),false);
es('y vuelve una vista',_getVista(),'resumen');

console.log('\n== En el tab de boletas no hay cascada ==');
plSetVista('boletas');
es('la barra queda vacía',nodos.plCascada.innerHTML,'');

console.log('\n== La tabla se dibuja bien con cada grupo ==');
plSetVista('resumen');
let rotos=0;
_plGruposConCols().forEach(([g])=>{
  plSetGrupo(g);
  const cols=_plColsVisibles();
  const th=(nodos.thPlanilla.innerHTML.match(/<th/g)||[]).length;
  // La cabecera tiene dos filas: la de grupos y la de columnas
  if(!cols.length||th<cols.length){rotos++;console.log('     falla el grupo '+g);}
  plSetGrupo(g);
});
es('los '+_plGruposConCols().length+' grupos se dibujan',rotos,0);

console.log('\n'+(mal?'X '+mal+' fallo(s)':'OK todo bien')+'  ·  '+ok+'/'+(ok+mal));
process.exit(mal?1:0);
