const fs=require('fs');
const R='c:/Users/LENOVO/OneDrive/Documents/GitHub/GDARSystem/';
global.localStorage={getItem:()=>null,setItem:()=>{},removeItem:()=>{}};
global.document={getElementById:()=>null,querySelector:()=>null,querySelectorAll:()=>[]};
global.window={location:{href:'https://x/i.html'},open:()=>null};
global.toast=()=>{};global.openM=()=>{};global.closeM=()=>{};global.confirm=()=>true;
global.isModuleReadOnly=()=>false;global.nid=()=>1;let q=0;global.nidSeguro=()=>++q;
global.supaUpsert=async()=>null;global.syncSheet=()=>{};
global.DB={personal:[],tareaje:[],planillaMes:[],afpTasas:[],proyectos:[],planillaCierre:[],planillaCerrada:[]};
eval(fs.readFileSync(R+'js/planilla.js','utf8')+'\n'+fs.readFileSync(R+'js/afpTasas.js','utf8')
 +'\n'+fs.readFileSync(R+'js/planillaCierre.js','utf8')
 +'\n;global._calcPlanRow=_calcPlanRow;global.PL_COLS=PL_COLS;global.PL_VISTAS=PL_VISTAS;'
 +'global._PL_TIPOS_CONOCIDOS=_PL_TIPOS_CONOCIDOS;_plGenMes=8;_plGenAnio=2026;');
let ok=0,mal=0;
const es=(l,g,e)=>{const b=String(g)===String(e);b?ok++:mal++;
  console.log((b?'  OK  ':'  MAL ')+l.padEnd(56)+'= '+g+(b?'':'  (esperado '+e+')'));};

const P=id=>({id,dni:'70999'+id,ape:'X',nom:'Y',cargo:'MECANICO',sue:3000,asig:0,movilidad:0,afp:'SNP',est:'Activo'});
DB.personal=[P(1),P(2),P(3)];
const m=(id,tipo,desde,n)=>{for(let d=desde;d<desde+n;d++)
  DB.tareaje.push({personalId:id,fecha:'2026-08-'+String(d).padStart(2,'0'),tipo});};
m(1,'TD',1,15); m(1,'V',16,10); m(1,'DL',26,6);            // vacaciones
m(2,'TD',1,20); m(2,'P',21,3);  m(2,'F',24,4); m(2,'R',28,4); // nada de esto se paga
m(3,'TD',1,11); m(3,'TN',12,12); m(3,'P',24,1); m(3,'DL',25,7); // NAVARRO

const c1=_calcPlanRow(DB.personal[0],null);
const c2=_calcPlanRow(DB.personal[1],null);
const c3=_calcPlanRow(DB.personal[2],null);

console.log('\n== Las vacaciones si se reconocen ==');
es('V esta entre los tipos conocidos',_PL_TIPOS_CONOCIDOS.includes('V'),true);
es('10 dias de vacaciones',c1.diasV,10);
es('  no salen como no pagados',c1.diasNoPag,0);
es('DIAS TOTAL = 15 + 10 + 6',c1.diasTotal,31);
es('  y no supera el mes',c1.diasTotal<=c1.diasMarcados,true);

console.log('\n== Permiso, falta y retiro no ==');
es('3 permisos + 4 retiros no pagados',c2.diasNoPag,7);
es('  P y R',c2.tiposNoPag,'P R');
es('4 faltas, contadas aparte',c2.diasF,4);
es('  las faltas nunca entran al total',c2.diasTotal,20);
es('el total son solo los 20 trabajados',c2.diasTotal,c2.diasSubTotal);
es('  de 31 dias marcados',c2.diasMarcados,31);

console.log('\n== NAVARRO BARRA sigue en 30 ==');
es('subtotal 23',c3.diasSubTotal,23);
es('7 libres',c3.diasDL,7);
es('1 permiso fuera',c3.diasNoPag,1);
es('DIAS TOTAL 30',c3.diasTotal,30);

console.log('\n== La columna de vacaciones ==');
const col=k=>PL_COLS.find(x=>x.k===k);
es('existe',!!col('diasVac'),true);
es('  en el grupo DIAS',col('diasVac').g,'dias');
es('  y no choca con el importe de gratificaciones',col('vacaciones').g,'gratif');
const celda=col('diasVac').c(c1);
es('muestra 10',/>10</.test(celda),true);
es('  y aclara de donde sale el importe',/campo Vacaciones del detalle/.test(celda),true);
es('la vista Dias y Horas la incluye',PL_VISTAS.find(v=>v.k==='dias').cols.includes('diasVac'),true);

console.log('\n== El tooltip del total ==');
const t=col('diasTotal').c(c1);
es('menciona las vacaciones',/10 vacac\./.test(t),true);
es('quien no tiene, no las menciona',/vacac\./.test(col('diasTotal').c(c2)),false);
es('el aviso de no pagados ya no dice vacaciones',/Permiso, falta o retiro/.test(col('noPag').c(c2)),true);

console.log('\n== El importe no se duplica ==');
const r2=n=>Math.round(n*100)/100, jornal=r2(3000/30);
es('la tarea ordinaria son los 15 trabajados',c1.tareaOrdinaria,r2(jornal*15));
es('  las vacaciones no se pagan como jornal',c1.tareaOrdinaria<r2(jornal*25),true);
es('el importe sigue viniendo del detalle',c1.vacaciones,0);
const cDet=_calcPlanRow(DB.personal[0],{vacaciones:1500});
es('  y si se carga, se respeta',cDet.vacaciones,1500);
es('  sin tocar los dias',cDet.diasTotal,c1.diasTotal);

console.log('\n'+(mal?'X '+mal+' fallo(s)':'OK todo bien')+'  ·  '+ok+'/'+(ok+mal));
process.exit(mal?1:0);
