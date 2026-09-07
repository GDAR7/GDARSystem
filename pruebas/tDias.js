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
 +'\n;global._calcPlanRow=_calcPlanRow;global.PL_COLS=PL_COLS;global.PL_VISTAS=PL_VISTAS;'
 +'global.genPlanilla=genPlanilla;global.plSetVista=plSetVista;global._PL_CV_TASA=_PL_CV_TASA;'
 +'global._PL_TIPOS_CONOCIDOS=_PL_TIPOS_CONOCIDOS;_plGenMes=7;_plGenAnio=2026;';
eval(src);

let ok=0,mal=0;
const es=(l,g,e)=>{const b=String(g)===String(e);b?ok++:mal++;
  console.log((b?'  OK  ':'  MAL ')+l.padEnd(58)+'= '+g+(b?'':'  (esperado '+e+')'));};

// El caso de la captura: 17 de subtotal (incluye 4 de A5) y 7 libres = 24
const P=(id)=>({id,dni:'7251269'+id,ape:'SANCHEZ ROJAS',nom:'PIERO',cargo:'CONTROLADOR',
  sue:3000,asig:0,movilidad:0,afp:'SNP',est:'Activo'});
DB.personal=[P(1),P(2),P(3)];
const marcar=(id,tipo,desde,n)=>{for(let d=desde;d<desde+n;d++)
  DB.tareaje.push({personalId:id,fecha:'2026-07-'+String(d).padStart(2,'0'),tipo});};
marcar(1,'TD',1,13); marcar(1,'A5',14,4); marcar(1,'DL',18,7);        // 13+4=17 · 7 libres
marcar(2,'TD',1,10); marcar(2,'LP',11,5); marcar(2,'LM',16,3); marcar(2,'LF',19,2); marcar(2,'DM',21,4);
marcar(3,'TD',1,12); marcar(3,'P',13,3);  marcar(3,'V',16,5);  marcar(3,'R',21,2);   // marcas sueltas

const c1=_calcPlanRow(DB.personal[0],null);
const c2=_calcPlanRow(DB.personal[1],null);
const c3=_calcPlanRow(DB.personal[2],null);

console.log('\n== El caso de la captura ==');
es('subtotal 17 (13 TD + 4 A5)',c1.diasSubTotal,17);
es('el Anexo 5 sigue contándose dentro',c1.diasA5,4);
es('7 días libres',c1.diasDL,7);
es('DÍAS TOTAL 24',c1.diasTotal,24);
es('y la suma cuadra',c1.diasSubTotal+c1.diasDL+c1.diasLic+c1.otrosDias,c1.diasTotal);

console.log('\n== Las licencias, contadas y desglosadas ==');
es('paternidad',c2.diasLP,5);
es('maternidad',c2.diasLM,3);
es('fallecimiento',c2.diasLF,2);
es('licencias = las tres juntas',c2.diasLic,10);
es('el descanso médico va en otros días',c2.otrosDias,4);
es('  y no se cuela en licencias',c2.diasLic,10);
es('total = 10 trabajados + 10 licencias + 4 médico',c2.diasTotal,24);
es('la suma cuadra',c2.diasSubTotal+c2.diasDL+c2.diasLic+c2.otrosDias,c2.diasTotal);

console.log('\n== Las marcas que antes se perdían ==');
es('la lista nombra 11 tipos',_PL_TIPOS_CONOCIDOS.length,11);
es('P y R no están en ella',['P','R'].some(t=>_PL_TIPOS_CONOCIDOS.includes(t)),false);
es('  pero V sí (se paga)',_PL_TIPOS_CONOCIDOS.includes('V'),true);
es('5 marcas sin reconocer (3 P + 2 R)',c3.diasOtroTipo,5);
es('  van a No Pagados',c3.diasNoPag+'|'+c3.otrosDias,'5|0');
// Las vacaciones sí se pagan; el permiso y el retiro no
es('el total paga 12 trabajados + 5 de vacaciones',c3.diasTotal,17);
es('  y los 5 no pagados quedan fuera',c3.diasTotal+c3.diasNoPag,22);
es('la suma cuadra',c3.diasSubTotal+c3.diasDL+c3.diasLic+c3.otrosDias+c3.diasV,c3.diasTotal);

console.log('\n== La bonificación de costo de vida NO cambia ==');
const r2=n=>Math.round(n*100)/100;
es('se calcula sobre trabajados + libres',c1.diasCv,c1.diasSubTotal+c1.diasDL);
es('  = 24 en el primer caso',c1.diasCv,24);
es('  y el importe es el de siempre',c1.bCv,r2(24*_PL_CV_TASA));
es('con licencias, la base NO las incluye',c2.diasCv,10);
es('  aunque los días totales sean 24',c2.diasTotal,24);
es('  así el pago no se movió solo',c2.bCv,r2(10*_PL_CV_TASA));

console.log('\n== Las columnas nuevas ==');
const col=k=>PL_COLS.find(c=>c.k===k);
['diasLic','diasLP','diasLM','diasLF','diasDM'].forEach(k=>es('existe '+k,!!col(k),true));
es('Anexo 5 sigue disponible',!!col('diasA5'),true);
es('todas están en el grupo DÍAS',['diasLic','diasLP','diasLM','diasLF','diasDM'].every(k=>col(k).g==='dias'),true);
const celda=col('diasLic').c(c2);
es('la celda de licencias muestra 10',/>10</.test(celda),true);
es('  y el detalle en el tooltip',/Paternidad 5 · Maternidad 3 · Fallecimiento 2/.test(celda),true);
const celdaTot=col('diasTotal').c(c2);
es('el total explica su suma',/10 subtotal \+ 0 libres \+ 10 licencias \+ 4 d\. médico/.test(celdaTot),true);

console.log('\n== La vista Días y Horas ==');
const v=PL_VISTAS.find(x=>x.k==='dias');
es('ya no muestra el Anexo 5',v.cols.includes('diasA5'),false);
es('muestra las licencias',v.cols.includes('diasLic'),true);
es('y los días libres, que faltaban a la vista',v.cols.indexOf('diasDL')<v.cols.indexOf('diasTotal'),true);
es('el total va al final de los días',v.cols.indexOf('diasTotal')>v.cols.indexOf('otrosDias'),true);
plSetVista('dias');
genPlanilla();
es('la vista se dibuja',nodos.thPlanilla.innerHTML.length>0,true);
es('  con la columna Licencias',/Licencias/.test(nodos.thPlanilla.innerHTML),true);

console.log('\n== Sin ningún día sigue sin pagarse ==');
DB.personal.push({id:9,dni:'99',ape:'X',nom:'Y',cargo:'Z',sue:3000,asig:1,movilidad:200,est:'Activo'});
const c9=_calcPlanRow(DB.personal[3],null);
es('lo detecta',c9.sinDias,true);
es('neto cero',c9.neto,0);
es('días total cero',c9.diasTotal,0);

console.log('\n'+(mal?'X '+mal+' fallo(s)':'OK todo bien')+'  ·  '+ok+'/'+(ok+mal));
process.exit(mal?1:0);
