const fs=require('fs');
const R='c:/Users/LENOVO/OneDrive/Documents/GitHub/GDARSystem/';
global.localStorage={getItem:()=>null,setItem:()=>{},removeItem:()=>{}};
const nodos={};
const mk=id=>nodos[id]={id,innerHTML:'',style:{},value:'',textContent:'',classList:{contains:()=>false,add(){}}};
['thPlanilla','tbPlanillaBody','tfPlanilla','planillaResumen','planillaCard','plVistas','plFiltros',
 'plCierreBar','plMes','plAnio','plProy','blPanel','plTablaWrap','tbPlanilla','plCascada'].forEach(mk);
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
 +'\n;global.PL_COLS=PL_COLS;global.PL_VISTAS=PL_VISTAS;global.PL_GRUPOS=PL_GRUPOS;'
 +'global.genPlanilla=genPlanilla;global.plSetVista=plSetVista;global.plSetGrupo=plSetGrupo;'
 +'global._plGruposConCols=_plGruposConCols;global._plColsVisibles=_plColsVisibles;_plGenMes=7;_plGenAnio=2026;';
eval(src);
// Sin trabajadores activos genPlanilla no llega a dibujar
DB.personal=[{id:1,dni:'10199407',ape:'RODRIGUEZ',nom:'ANDRES',cargo:'ING',cat:'Staff',sue:9000,asig:1,movilidad:250,afp:'SNP',est:'Activo',tipo:'Staff'}];
for(let d=1;d<=31;d++)DB.tareaje.push({personalId:1,fecha:'2026-07-'+String(d).padStart(2,'0'),tipo:d>24?'DL':'TD'});
let ok=0,mal=0;
const es=(l,g,e)=>{const b=String(g)===String(e);b?ok++:mal++;
  console.log((b?'  OK  ':'  MAL ')+l.padEnd(56)+'= '+g+(b?'':'  (esperado '+e+')'));};

console.log('\n== Dias Lib. ya esta en DIAS ==');
const col=k=>PL_COLS.find(c=>c.k===k);
es('grupo de Dias Lib.',col('diasDL').g,'dias');
es('  ya no esta en TAREA',col('diasDL').g==='tarea',false);
es('el rotulo no cambio',col('diasDL').l,'Días Lib.');

console.log('\n== El grupo TAREA conserva lo suyo ==');
const tarea=PL_COLS.filter(c=>c.g==='tarea').map(c=>c.k);
es('quedan 5 columnas',tarea.length,5);
es('  '+tarea.join(' · '),tarea.join(','),'tareaOrd,remunDL,totalDM,licPat,licSind');

console.log('\n== El orden del grupo DIAS se lee bien ==');
const dias=PL_COLS.filter(c=>c.g==='dias').map(c=>c.k);
console.log('     '+dias.join(' · '));
es('Dias Lib. va tras el subtotal',dias.indexOf('diasDL')>dias.indexOf('diasSub'),true);
es('  y antes del total',dias.indexOf('diasDL')<dias.indexOf('diasTotal'),true);
es('  y antes de las licencias',dias.indexOf('diasDL')<dias.indexOf('diasLic'),true);

console.log('\n== Las columnas de cada grupo siguen juntas ==');
// Si un grupo aparece en dos tramos, su cabecera saldria partida
let roto=[];
const vistos=new Set();let ant=null;
PL_COLS.forEach(c=>{
  if(c.g!==ant){ if(vistos.has(c.g))roto.push(c.g); vistos.add(c.g); ant=c.g; }
});
es('ningun grupo partido en dos tramos',roto.join(',')||'ninguno','ninguno');

console.log('\n== La cascada y las vistas ==');
es('DIAS sigue siendo un grupo filtrable',_plGruposConCols().some(([g])=>g==='dias'),true);
plSetGrupo('dias');
es('  y trae Dias Lib.',_plColsVisibles().some(c=>c.k==='diasDL'),true);
plSetGrupo('dias');
plSetVista('dias');
es('la vista Dias y Horas lo sigue mostrando',PL_VISTAS.find(v=>v.k==='dias').cols.includes('diasDL'),true);

console.log('\n== Ninguna vista quedo rota ==');
const todas=PL_COLS.map(c=>c.k);
let malas=0;
PL_VISTAS.forEach(v=>{if(!v.cols)return;
  const f=v.cols.filter(k=>!todas.includes(k));
  if(f.length){malas++;console.log('     '+v.k+' pide: '+f.join(', '));}});
es('todas las vistas apuntan a columnas que existen',malas,0);
['resumen','dias','ingresos','gratif','desc','aportes','todo'].forEach(k=>{
  plSetVista(k);genPlanilla();
  es('  vista '+k+' se dibuja',nodos.thPlanilla.innerHTML.length>0,true);
});

console.log('\n'+(mal?'X '+mal+' fallo(s)':'OK todo bien')+'  ·  '+ok+'/'+(ok+mal));
process.exit(mal?1:0);
