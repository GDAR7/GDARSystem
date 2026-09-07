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
 +'\n;global._calcPlanRow=_calcPlanRow;global.PL_COLS=PL_COLS;_plGenMes=7;_plGenAnio=2026;';
eval(src);
let ok=0,mal=0;
const es=(l,g,e)=>{const b=String(g)===String(e);b?ok++:mal++;
  console.log((b?'  OK  ':'  MAL ')+l.padEnd(56)+'= '+g+(b?'':'  (esperado '+e+')'));};

const P=id=>({id,dni:'7632240'+id,ape:'URBANO ACOSTA',nom:'FRANS',cargo:'X',sue:3000,asig:0,est:'Activo'});
DB.personal=[P(1),P(2)];
const m=(id,tipo,desde,n)=>{for(let d=desde;d<desde+n;d++)
  DB.tareaje.push({personalId:id,fecha:'2026-07-'+String(d).padStart(2,'0'),tipo});};

// Trabajador 1: el caso de la captura — 20 trabajados y 12 libres = 32 en un mes de 31
m(1,'TD',1,20); m(1,'DL',20,12);      // el dia 20 queda marcado TD y DL a la vez
// Trabajador 2: bien marcado
m(2,'TD',1,20); m(2,'DL',21,11);

const c1=_calcPlanRow(DB.personal[0],null);
const c2=_calcPlanRow(DB.personal[1],null);

console.log('\n== Se reproduce el 32 de la captura ==');
es('subtotal 20',c1.diasSubTotal,20);
es('libres 12',c1.diasDL,12);
es('total 32, mas de los que tiene el mes',c1.diasTotal,32);
es('pero solo hay 31 fechas marcadas',c1.diasMarcados,31);

console.log('\n== El sistema ya lo detecta y dice cual ==');
es('encuentra 1 dia con doble marca',c1.fechasDobles.length,1);
es('  y dice que es el 20',c1.fechasDobles[0],'20 (TD + DL)');
es('la diferencia coincide con los duplicados',c1.diasTotal-c1.diasMarcados,c1.fechasDobles.length);

console.log('\n== Quien esta bien marcado no se marca ==');
es('total 31',c2.diasTotal,31);
es('31 fechas',c2.diasMarcados,31);
es('ningun duplicado',c2.fechasDobles.length,0);

console.log('\n== La celda avisa ==');
const col=PL_COLS.find(c=>c.k==='diasTotal');
const cel1=col.c(c1), cel2=col.c(c2);
es('la de Frans sale marcada',/⚠/.test(cel1),true);
es('  en rojo',/239,68,68/.test(cel1),true);
es('  y el detalle nombra el dia',/20 \(TD \+ DL\)/.test(cel1),true);
es('la del otro sale normal',/⚠/.test(cel2),false);
es('  en ambar',/245,158,11/.test(cel2),true);
es('las dos muestran el desglose',/subtotal/.test(cel1)&&/subtotal/.test(cel2),true);

console.log('\n== Un doble turno legitimo no se confunde ==');
DB.personal.push(P(3));
m(3,'TD',1,15); m(3,'TN',16,10); m(3,'DL',26,6);   // sin solaparse
const c3=_calcPlanRow(DB.personal[2],null);
es('31 dias',c3.diasTotal,31);
es('sin aviso',c3.fechasDobles.length,0);

console.log('\n== Cuanto se estaria pagando de mas ==');
const jornal=Math.round(3000/30*100)/100;
es('el dia repetido vale un jornal',jornal,100);
es('Frans cobra 20 dias de tarea',c1.tareaOrdinaria,+(jornal*20).toFixed(2));
es('  y 12 de dia libre',c1.remunDL,+(jornal*12).toFixed(2));
es('  o sea 32 jornales en un mes de 31',
   +((c1.tareaOrdinaria+c1.remunDL)/jornal).toFixed(0),32);

console.log('\n'+(mal?'X '+mal+' fallo(s)':'OK todo bien')+'  ·  '+ok+'/'+(ok+mal));
process.exit(mal?1:0);
