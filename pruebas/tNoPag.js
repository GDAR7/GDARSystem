const fs=require('fs');
const R='c:/Users/LENOVO/OneDrive/Documents/GitHub/GDARSystem/';
global.localStorage={getItem:()=>null,setItem:()=>{},removeItem:()=>{}};
global.document={getElementById:()=>null,querySelector:()=>null,querySelectorAll:()=>[]};
global.window={location:{href:'https://x/i.html'},open:()=>null};
global.toast=()=>{};global.openM=()=>{};global.closeM=()=>{};global.confirm=()=>true;
global.isModuleReadOnly=()=>false;global.nid=()=>1;let q=0;global.nidSeguro=()=>++q;
global.supaUpsert=async()=>null;global.syncSheet=()=>{};
global.DB={personal:[],tareaje:[],planillaMes:[],afpTasas:[],proyectos:[],planillaCierre:[],planillaCerrada:[]};
const src=fs.readFileSync(R+'js/planilla.js','utf8')+'\n'+fs.readFileSync(R+'js/afpTasas.js','utf8')
 +'\n'+fs.readFileSync(R+'js/planillaCierre.js','utf8')
 +'\n;global._calcPlanRow=_calcPlanRow;global.PL_COLS=PL_COLS;global.PL_VISTAS=PL_VISTAS;'
 +'global._PL_CV_TASA=_PL_CV_TASA;_plGenMes=8;_plGenAnio=2026;';
eval(src);

let ok=0,mal=0;
const es=(l,g,e)=>{const b=String(g)===String(e);b?ok++:mal++;
  console.log((b?'  OK  ':'  MAL ')+l.padEnd(58)+'= '+g+(b?'':'  (esperado '+e+')'));};

// NAVARRO BARRA en agosto: 31 días de mes, uno de permiso
const P=id=>({id,dni:'7099933'+id,ape:'NAVARRO BARRA',nom:'JOSE ALBERTO',cargo:'MECANICO',
  sue:3000,asig:0,movilidad:0,afp:'SNP',est:'Activo'});
DB.personal=[P(0),P(1)];
const m=(id,tipo,desde,n)=>{for(let d=desde;d<desde+n;d++)
  DB.tareaje.push({personalId:id,fecha:'2026-08-'+String(d).padStart(2,'0'),tipo});};
// 11 TD + 12 TN + 7 DL = 30 pagables · el día 24 es permiso = 31 del mes
m(0,'TD',1,11); m(0,'TN',12,12); m(0,'P',24,1); m(0,'DL',25,7);
// Otro con vacaciones y retén
m(1,'TD',1,20); m(1,'DL',21,5); m(1,'V',26,4); m(1,'R',30,2);

const c=_calcPlanRow(DB.personal[0],null);
const c2=_calcPlanRow(DB.personal[1],null);

console.log('\n== El caso de NAVARRO BARRA ==');
es('11 días de día',c.diasTD,11);
es('12 de noche',c.diasTN,12);
es('subtotal 23',c.diasSubTotal,23);
es('7 días libres',c.diasDL,7);
es('1 permiso',c.diasNoPag,1);
es('  y dice cuál es',c.tiposNoPag,'P');
es('DÍAS TOTAL = 30, lo que se le paga',c.diasTotal,30);
es('  el permiso queda fuera',c.diasTotal,c.diasSubTotal+c.diasDL);
es('el mes tiene 31 fechas marcadas',c.diasMarcados,31);
es('  30 pagados + 1 permiso',c.diasTotal+c.diasNoPag,31);
es('sin días con doble marca',c.fechasDobles.length,0);

console.log('\n== Ya no se pasa de los días del mes ==');
es('el total no supera las fechas marcadas',c.diasTotal<=c.diasMarcados,true);
es('  antes salía 31 (con el permiso dentro)',c.diasSubTotal+c.diasDL+c.diasNoPag,31);

console.log('\n== Las vacaciones sí; el retén no ==');
es('solo 2 no pagados (el retén)',c2.diasNoPag,2);
es('  y es R',c2.tiposNoPag,'R');
es('total 29: 20 + 5 libres + 4 de vacaciones',c2.diasTotal,29);
es('  las vacaciones cuentan',c2.diasTotal,c2.diasSubTotal+c2.diasDL+c2.diasV);

console.log('\n== El descanso médico sí se paga ==');
DB.personal.push(P(2));
m(2,'TD',1,20); m(2,'DM',21,5); m(2,'P',26,2);
const c3=_calcPlanRow(DB.personal[2],null);
es('5 días de descanso médico',c3.diasDM,5);
es('  van en Otros días',c3.otrosDias,5);
es('  y entran al total',c3.diasTotal,25);
es('los 2 de permiso no',c3.diasNoPag,2);

console.log('\n== Lo que se paga baja con el permiso ==');
const r2=n=>Math.round(n*100)/100;
const jornal=r2(3000/30);
es('tarea ordinaria = 23 jornales',c.tareaOrdinaria,r2(jornal*23));
es('día libre = 7 jornales',c.remunDL,r2(jornal*7));
es('  en total 30 jornales, no 31',+((c.tareaOrdinaria+c.remunDL)/jornal).toFixed(0),30);
es('la bonif. costo de vida usa 30 días',c.diasCv,30);
es('  y no cuenta el permiso',c.bCv,r2(30*_PL_CV_TASA));

console.log('\n== La columna nueva ==');
const col=k=>PL_COLS.find(x=>x.k===k);
es('existe No Pagados',!!col('noPag'),true);
es('  en el grupo DÍAS',col('noPag').g,'dias');
es('  antes de Faltas',PL_COLS.indexOf(col('noPag'))<PL_COLS.indexOf(col('faltas')),true);
const celda=col('noPag').c(c);
es('muestra 1',/>1</.test(celda),true);
es('  y explica qué es',/no se pagan: P/.test(celda),true);
es('en quien no tiene, sale 0 sin resaltar',/#f59e0b/.test(col('noPag').c(c3)),true);
es('la vista Días y Horas la incluye',PL_VISTAS.find(v=>v.k==='dias').cols.includes('noPag'),true);

console.log('\n== El tooltip del total lo aclara ==');
const t=col('diasTotal').c(c);
es('dice el desglose',/23 subtotal \+ 7 libres/.test(t),true);
es('  y menciona el no pagado',/1 no pagado\(s\) fuera del total/.test(t),true);
es('quien no tiene, no lo menciona',/no pagado/.test(col('diasTotal').c(c2)),true);

console.log('\n'+(mal?'X '+mal+' fallo(s)':'OK todo bien')+'  ·  '+ok+'/'+(ok+mal));
process.exit(mal?1:0);
