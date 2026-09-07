const fs=require('fs');
const R='c:/Users/LENOVO/OneDrive/Documents/GitHub/GDARSystem/';
global.localStorage={getItem:()=>null,setItem:()=>{},removeItem:()=>{}};
global.document={getElementById:()=>null,querySelector:()=>null};
global.toast=()=>{};global.openM=()=>{};global.closeM=()=>{};
global.isModuleReadOnly=()=>false;
global.nid=()=>1;let q=0;global.nidSeguro=()=>++q;global.supaUpsert=async()=>null;global.syncSheet=()=>{};
global.DB={personal:[],tareaje:[],planillaMes:[],afpTasas:[],proyectos:[],planillaCierre:[],planillaCerrada:[]};

const src=fs.readFileSync(R+'js/planilla.js','utf8')+'\n'+fs.readFileSync(R+'js/afpTasas.js','utf8')
  +'\n;global._calcPlanRow=_calcPlanRow;global._AFP_SEMILLA=_AFP_SEMILLA;'
  +'global._plTasaCodigo=_plTasaCodigo;global.afpTasaDe=afpTasaDe;'
  +'global._plAfpDesconocidas=_plAfpDesconocidas;_plGenMes=6;_plGenAnio=2026;';
eval(src);

let ok=0,mal=0;
const es=(l,g,e)=>{const b=String(g)===String(e);b?ok++:mal++;
  console.log((b?'  OK  ':'  MAL ')+l.padEnd(56)+'= '+g+(b?'':'  (esperado '+e+')'));};

const P=(id,afp)=>({id,dni:'1'+id,ape:'X',nom:'Y',cargo:'Z',sue:9000,asig:0,afp,est:'Activo'});
for(let d=1;d<=30;d++)for(let id=1;id<=9;id++)DB.tareaje.push({personalId:id,fecha:'2026-06-'+String(d).padStart(2,'0'),tipo:'TD'});
const calc=(id,afp)=>_calcPlanRow(P(id,afp),null);

console.log('\n== La lista del formulario y la semilla dicen lo mismo ==');
const html=fs.readFileSync(R+'index.html','utf8');
const sel=(html.match(/<select id="pdAfp">([\s\S]*?)<\/select>/)||[])[1]||'';
const opciones=[...sel.matchAll(/<option>([^<]+)<\/option>/g)].map(m=>m[1]);
es('el desplegable está en mayúsculas',opciones.join(','),'ONP,SNP,INTEGRA,PROFUTURO,PRIMA,HABITAT');
es('hay dos formularios con la misma lista',(html.match(/<option>PROFUTURO<\/option>/g)||[]).length,2);
const semilla=_AFP_SEMILLA.map(s=>s.nombre);
es('la semilla trae los mismos nombres',opciones.every(o=>semilla.includes(o)),true);
es('y todos en mayúsculas',semilla.every(n=>n===n.toUpperCase()),true);

console.log('\n== Sin la tabla cargada, el respaldo del código ==');
DB.afpTasas=[];
const base=calc(1,'PROFUTURO').baseLeySociales;
const r2=n=>Math.round(n*100)/100;
const tres=c=>+(c.obligAfp+c.primaAfp+c.sobreAfp).toFixed(2);
const espera=(o,p,cm)=>r2(base*o)+r2(base*p)+r2(base*cm);
es('PROFUTURO en mayúsculas encuentra su tasa',tres(calc(1,'PROFUTURO')),espera(.10,.0137,.0169));
es('Profuturo como se escribía antes, igual',tres(calc(2,'Profuturo')),espera(.10,.0137,.0169));
es('profuturo en minúsculas, igual',tres(calc(3,'profuturo')),espera(.10,.0137,.0169));
es('"PRO FUTURO" con espacio, igual',tres(calc(4,'PRO FUTURO')),espera(.10,.0137,.0169));
es('HABITAT 12.84 %',tres(calc(5,'HABITAT')),espera(.10,.0137,.0147));
es('INTEGRA 12.92 %',tres(calc(6,'INTEGRA')),espera(.10,.0137,.0155));
es('PRIMA 12.97 %',tres(calc(7,'PRIMA')),espera(.10,.0137,.0160));
es('ninguna quedó sin reconocer',_plAfpDesconocidas.size,0);

console.log('\n== El bug que esto arregla ==');
// Antes, _PL_AFP_RATES['PROFUTURO'] era undefined y solo se aplicaba el 10 %
const cP=calc(1,'PROFUTURO');
es('no se queda solo en el 10 % obligatorio',cP.totalPensiones===r2(base*0.10),false);
es('cobra también la prima',cP.primaAfp>0,true);
es('y la comisión',cP.sobreAfp>0,true);
es('la diferencia son ~S/ 277 al mes',Math.round(cP.totalPensiones-r2(base*0.10)),Math.round(r2(base*0.0137)+r2(base*0.0169)));

console.log('\n== Un régimen inexistente sigue avisando ==');
_plAfpDesconocidas.clear();
const raro=calc(8,'AFP QUE NO EXISTE');
es('aplica solo el 10 %',raro.obligAfp,r2(base*0.10));
es('y lo registra para avisar',_plAfpDesconocidas.size,1);

console.log('\n== Con la tabla cargada manda la tabla ==');
DB.afpTasas=_AFP_SEMILLA.map((t,i)=>({id:i+1,...t}));
es('PROFUTURO se halla en la tabla',(afpTasaDe('PROFUTURO')||{}).nombre,'PROFUTURO');
es('y también escrito distinto',(afpTasaDe('Profuturo')||{}).nombre,'PROFUTURO');
es('ONP sigue siendo régimen nacional',calc(9,'ONP').esOnp,true);
es('SNP también',calc(9,'SNP').esOnp,true);
es('el cálculo no cambió respecto del respaldo',tres(calc(1,'PROFUTURO')),espera(.10,.0137,.0169));

console.log('\n== Una tabla vieja con nombres en minúscula se sigue leyendo ==');
DB.afpTasas=[{id:1,nombre:'Profuturo',oblig:0.10,prima:0.0137,comision:0.0169,esOnp:0}];
es('la ficha en mayúsculas encuentra la fila vieja',tres(calc(1,'PROFUTURO')),espera(.10,.0137,.0169));

console.log('\n'+(mal?'X '+mal+' fallo(s)':'OK todo bien')+'  ·  '+ok+'/'+(ok+mal));
process.exit(mal?1:0);
