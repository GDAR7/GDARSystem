// Planilla · modo de pago del mes: «Pago por día» (sueldo ÷ 30 por día, como
// siempre) o «Incidencia por mes» (sueldo ÷ días del mes; el mes completo paga
// el sueldo exacto). Lo que importa: que sin elegir nada la planilla no cambie,
// que el mes completo pague justo el sueldo en meses de 28, 30 y 31 días, que
// un mes incompleto pague la parte, y que las horas extras no se muevan.
const fs=require('fs');
const R='c:/Users/LENOVO/OneDrive/Documents/GitHub/GDARSystem/';
global.localStorage={getItem:()=>null,setItem:()=>{},removeItem:()=>{}};
const nodos={};
const mk=id=>nodos[id]={id,innerHTML:'',style:{},value:'',textContent:'',classList:{contains:()=>false,add(){}}};
['thPlanilla','tbPlanillaBody','tfPlanilla','planillaResumen','planillaCard','plVistas','plFiltros',
 'plCierreBar','plMes','plAnio','plProy','blPanel','blLista','plTablaWrap','tbPlanilla'].forEach(mk);
nodos.plMes.value='10';nodos.plAnio.value='2026';nodos.plProy.value='';
nodos.tbPlanilla.tHead=null;nodos.tbPlanilla.tBodies=[];nodos.tbPlanilla.tFoot=null;
global.document={getElementById:id=>nodos[id]||null,querySelector:()=>null,querySelectorAll:()=>[]};
global.window={location:{href:'https://x/i.html'},open:()=>null};
let avisos=[];global.toast=(m,e)=>avisos.push(m);global.openM=()=>{};global.closeM=()=>{};global.confirm=()=>true;
global.isModuleReadOnly=()=>false;global.nid=()=>1;let q=0;global.nidSeguro=()=>++q;
global.EMPRESA={nombre:'ECOSERMO',ruc:'20571533180',logo:''};
global.supaUpsert=async()=>null;global.syncSheet=()=>{};
global.CU={nombre:'Abel Rodríguez A.',codigo:'EIBEL25'};
let guardado=null,faltaTabla=false;
global.supa={from:t=>({
  select:async()=>({data:[],error:null}),
  upsert:async r=>{if(faltaTabla)return{error:{code:'PGRST205',message:'planilla_modo'}};guardado={t,r};return{error:null};}
})};
global.DB={personal:[],tareaje:[],planillaMes:[],afpTasas:[],proyectos:[],planillaCierre:[],planillaCerrada:[],planillaModo:[]};

const src=fs.readFileSync(R+'js/planilla.js','utf8')+'\n'+fs.readFileSync(R+'js/afpTasas.js','utf8')
  +'\n'+fs.readFileSync(R+'js/planillaCierre.js','utf8')
  +'\n;global._calcPlanRow=_calcPlanRow;global.plSetModo=plSetModo;global.plModoDe=plModoDe;'
  +'global._plModoHtml=_plModoHtml;global.setMes=(m,a)=>{_plGenMes=m;_plGenAnio=a;};';
eval(src);

let ok=0,mal=0;
const es=(l,g,e)=>{const b=String(g)===String(e);b?ok++:mal++;
  console.log((b?'  OK  ':'  MAL ')+l.padEnd(62)+'= '+g+(b?'':'  (esperado '+e+')'));};

const P={id:1,dni:'1',ape:'PRUEBA',nom:'UNO',cargo:'PEON',sue:2000,asig:0,movilidad:0,afp:'SNP',est:'Activo'};
DB.personal=[P];
const pad=n=>String(n).padStart(2,'0');
const tarea=(anio,mes,n,tipo)=>{DB.tareaje=DB.tareaje.filter(r=>!String(r.fecha).startsWith(anio+'-'+pad(mes)));
  for(let d=1;d<=n;d++)DB.tareaje.push({personalId:1,fecha:`${anio}-${pad(mes)}-${pad(d)}`,tipo:tipo||'TD'});};
const modo=(mes,anio,m)=>{DB.planillaModo=DB.planillaModo.filter(x=>!(x.mes===mes&&x.anio===anio));if(m)DB.planillaModo.push({mes,anio,modo:m});};
const calc=(mes,anio,det)=>{setMes(mes,anio);return _calcPlanRow(P,det||null);};
const pagoDias=c=>+(c.tareaOrdinaria+c.remunDL+c.totalDM+c.totalLicPat).toFixed(2);

console.log('\n== Sin elegir nada: se paga por día, como siempre ==');
tarea(2026,10,31);
let c=calc(10,2026);
es('modo por defecto',c.modoPago,'dia');
es('jornal = 2000 ÷ 30',c.jornal,66.67);
es('octubre completo (31 días) paga 31 jornales',c.tareaOrdinaria,2066.77);

console.log('\n== Incidencia por mes: el mes completo paga el sueldo exacto ==');
modo(10,2026,'mes');
c=calc(10,2026);
es('modo',c.modoPago,'mes');
es('octubre trae 31 días',c.diasMes,31);
es('jornal = 2000 ÷ 31',c.jornal,64.52);
es('octubre completo',c.tareaOrdinaria,2000);
es('  lo marca como mes completo',c.mesCompleto,true);
tarea(2026,11,30);modo(11,2026,'mes');
es('noviembre completo (30 días)',calc(11,2026).tareaOrdinaria,2000);
tarea(2026,2,28);modo(2,2026,'mes');
es('febrero completo (28 días)',calc(2,2026).tareaOrdinaria,2000);
tarea(2028,2,29);modo(2,2028,'mes');
es('febrero bisiesto completo (29 días)',calc(2,2028).tareaOrdinaria,2000);

console.log('\n== Mes incompleto: se paga la parte de los días ==');
tarea(2026,10,20);
c=calc(10,2026);
es('20 de 31 días = 2000 × 20 ÷ 31',c.tareaOrdinaria,1290.32);
es('  no es mes completo',c.mesCompleto,false);
tarea(2026,2,20);
es('20 de 28 días = 2000 × 20 ÷ 28',calc(2,2026).tareaOrdinaria,1428.57);

console.log('\n== Días libres, descanso médico y licencias también cuentan ==');
DB.tareaje=DB.tareaje.filter(r=>!String(r.fecha).startsWith('2026-10'));
for(let d=1;d<=31;d++)DB.tareaje.push({personalId:1,fecha:'2026-10-'+pad(d),tipo:d<=21?'TD':d<=28?'DL':d<=30?'DM':'LP'});
c=calc(10,2026);
es('21 TD + 7 DL + 2 DM + 1 LP = mes completo',c.mesCompleto,true);
es('  la suma de las partes es el sueldo',pagoDias(c),2000);
es('  días libres = 2000 × 7 ÷ 31',c.remunDL,451.61);

console.log('\n== Un día marcado dos veces no paga de más ==');
tarea(2026,10,31);DB.tareaje.push({personalId:1,fecha:'2026-10-05',tipo:'DL'});
c=calc(10,2026);
es('32 días pagados en un mes de 31 → sigue siendo el sueldo',pagoDias(c),2000);

console.log('\n== Las horas extras no cambian con el modo ==');
tarea(2026,10,31);
const det={he25:10};
modo(10,2026,'dia');const hDia=calc(10,2026,det).impHE25;
modo(10,2026,'mes');const hMes=calc(10,2026,det).impHE25;
es('valor hora = 2000 ÷ 30 ÷ 8',calc(10,2026,det).jHora,8.33);
es('10 h al 25 % igual en los dos modos',hDia+' = '+hMes,'104.13 = 104.13');

console.log('\n== Sin días no paga nada en ningún modo ==');
DB.tareaje=[];
c=calc(10,2026);
es('neto',c.neto,0);

console.log('\n== El botón ==');
// Al guardar, la planilla se redibuja y toma el mes del selector
modo(11,2026,null);setMes(11,2026);nodos.plMes.value='11';
es('se muestran las dos opciones',/Pago por día/.test(_plModoHtml(false))&&/Incidencia por mes/.test(_plModoHtml(false)),true);
(async()=>{
  await plSetModo('mes');
  es('guarda en planilla_modo',guardado&&guardado.t,'planilla_modo');
  es('  una fila por mes (id 202611)',guardado&&guardado.r.id,202611);
  es('  y queda en incidencia por mes',plModoDe(11,2026),'mes');
  DB.planillaCierre=[{mes:11,anio:'2026'}];guardado=null;
  await plSetModo('dia');
  es('mes cerrado: no deja cambiar el modo',guardado===null&&plModoDe(11,2026)==='mes',true);
  es('  y en la barra solo se lee',/<button/.test(_plModoHtml(true)),false);
  DB.planillaCierre=[];faltaTabla=true;avisos=[];
  await plSetModo('dia');
  es('sin el SQL avisa que falta sql/planilla_modo.sql',avisos.some(a=>/sql\/planilla_modo\.sql/.test(a)),true);
  es('  y no cambia el modo',plModoDe(11,2026),'mes');
  console.log('\n'+(mal?'✗ '+mal+' FALLAS':'OK todo bien')+'  ·  '+ok+'/'+(ok+mal));
  process.exit(mal?1:0);
})();
