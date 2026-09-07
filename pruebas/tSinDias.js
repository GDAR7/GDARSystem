const fs=require('fs');
const R='c:/Users/LENOVO/OneDrive/Documents/GitHub/GDARSystem/';
global.localStorage={getItem:()=>null,setItem:()=>{},removeItem:()=>{}};
const nodos={};
const mk=id=>nodos[id]={id,innerHTML:'',style:{},value:'',textContent:'',classList:{contains:()=>false,add(){}}};
['thPlanilla','tbPlanillaBody','tfPlanilla','planillaResumen','planillaCard','plVistas','plFiltros',
 'plCierreBar','plMes','plAnio','plProy','blPanel','blLista','plTablaWrap','tbPlanilla'].forEach(mk);
nodos.plMes.value='7';nodos.plAnio.value='2026';nodos.plProy.value='';
nodos.tbPlanilla.tHead=null;nodos.tbPlanilla.tBodies=[];nodos.tbPlanilla.tFoot=null;
global.document={getElementById:id=>nodos[id]||null,querySelector:()=>null,querySelectorAll:()=>[]};
global.window={location:{href:'https://x/i.html'},open:()=>null};
global.toast=()=>{};global.openM=()=>{};global.closeM=()=>{};global.confirm=()=>true;
global.isModuleReadOnly=()=>false;global.nid=()=>1;let q=0;global.nidSeguro=()=>++q;
global.EMPRESA={nombre:'ECOSERMO',ruc:'20571533180',logo:'09.-ERP/Imagenes/ECOSERMO-LOGO.png'};
global.supaUpsert=async()=>null;global.syncSheet=()=>{};
global.DB={personal:[],tareaje:[],planillaMes:[],afpTasas:[],proyectos:[],planillaCierre:[],planillaCerrada:[]};

const src=fs.readFileSync(R+'js/planilla.js','utf8')+'\n'+fs.readFileSync(R+'js/afpTasas.js','utf8')
  +'\n'+fs.readFileSync(R+'js/planillaCierre.js','utf8')+'\n'+fs.readFileSync(R+'js/boletaPago.js','utf8')
  +'\n;global._calcPlanRow=_calcPlanRow;global.blFila=blFila;global._blDoc=_blDoc;'
  +'global._blConceptos=_blConceptos;_plGenMes=7;_plGenAnio=2026;';
eval(src);

let ok=0,mal=0;
const es=(l,g,e)=>{const b=String(g)===String(e);b?ok++:mal++;
  console.log((b?'  OK  ':'  MAL ')+l.padEnd(58)+'= '+g+(b?'':'  (esperado '+e+')'));};

// El caso de la captura: 0 días tareados, con asignación familiar y movilidad
const P=(id,extra)=>Object.assign({id,dni:'7158983'+id,ape:'VALENZUELA SEGURA',nom:'ADRIAN JOSE',
  cargo:'COND. DE CAMIONETA',cat:'Conductor VM',sue:2300,asig:1,movilidad:250,afp:'SNP',
  ing:'2026-08-07',est:'Activo'},extra||{});
DB.personal=[P(1),P(2),P(3),P(4)];
// 2 · un mes entero de faltas   3 · con días trabajados   4 · solo descanso médico
for(let d=1;d<=31;d++)DB.tareaje.push({personalId:2,fecha:'2026-07-'+String(d).padStart(2,'0'),tipo:'F'});
for(let d=1;d<=31;d++)DB.tareaje.push({personalId:3,fecha:'2026-07-'+String(d).padStart(2,'0'),tipo:'TD'});
for(let d=1;d<=5;d++) DB.tareaje.push({personalId:4,fecha:'2026-07-'+String(d).padStart(2,'0'),tipo:'DM'});

const c1=_calcPlanRow(DB.personal[0],null);   // sin ninguna marca
const c2=_calcPlanRow(DB.personal[1],null);   // solo faltas
const c3=_calcPlanRow(DB.personal[2],null);   // trabajó
const c4=_calcPlanRow(DB.personal[3],null);   // descanso médico

console.log('\n== Sin ningún día tareado no le corresponde nada ==');
es('lo detecta',c1.sinDias,true);
es('días pagables',c1.diasPagables,0);
es('asignación familiar',c1.asigFam,0);
es('movilidad',c1.movilidad,0);
es('total ingresos',c1.subtotal2,0);
es('descuentos',c1.totalDeduccion,0);
es('  pensiones',c1.totalPensiones,0);
es('NETO A PAGAR',c1.neto,0);
es('aportes del empleador',c1.totalAportaciones,0);
es('  ESSALUD',c1.essalud,0);

console.log('\n== Un mes entero de faltas tampoco paga ==');
es('lo detecta',c2.sinDias,true);
es('asignación familiar',c2.asigFam,0);
es('movilidad',c2.movilidad,0);
es('neto',c2.neto,0);
es('  pero las faltas sí se cuentan',c2.diasF,31);

console.log('\n== Quien sí trabajó cobra igual que antes ==');
es('no está marcado',c3.sinDias,false);
es('asignación familiar completa',c3.asigFam,113);
es('movilidad completa',c3.movilidad,250);
es('tarea ordinaria = jornal × días',c3.tareaOrdinaria,+(Math.round(2300/30*100)/100*31).toFixed(2));
es('el neto es positivo',c3.neto>0,true);

console.log('\n== Con solo descanso médico sí corresponde ==');
es('no está marcado',c4.sinDias,false);
es('  porque hay días pagables',c4.diasPagables,5);
es('cobra su asignación familiar',c4.asigFam,113);
es('y el descanso médico',c4.totalDM>0,true);

console.log('\n== Lo cargado a mano se respeta ==');
// Una liquidación: sin días, pero con gratificación trunca escrita a propósito
const det={personalId:1,mes:7,anio:2026,gratifTrunca:1500};
const cL=_calcPlanRow(DB.personal[0],det);
es('sigue sin días',cL.sinDias,true);
es('la asignación familiar sigue en cero',cL.asigFam,0);
es('pero la gratificación trunca se paga',cL.totalGratifTrunca>0,true);
es('y el neto la refleja',cL.neto>0,true);

console.log('\n== La boleta ya no descuadra ==');
const f=blFila(1);
const K=_blConceptos(f.c);
es('no lista "Jornal básico" como importe',K.ing.some(([n])=>/Jornal/.test(n)),false);
es('sin días no hay ningún ingreso',K.ing.length,0);
es('ni descuentos',K.pens.length+K.otr.length,0);
const doc=_blDoc([f],'gdar');
es('avisa que no tiene días',/no tiene ningún día tareado/.test(doc),true);
es('y lo dice en la columna de ingresos',/no corresponde ningún pago/.test(doc),true);
es('el neto impreso es 0.00',/Neto a pagar<br><b>S\/ 0,00|S\/ 0\.00/.test(doc.replace(/&nbsp;/g,'')),true);
const docO=_blDoc([f],'oficial');
es('el formato oficial también avisa',/Sin días tareados/.test(docO),true);

console.log('\n== Y con días, la boleta cuadra ==');
const f3=blFila(3), K3=_blConceptos(f3.c);
const sumaIng=K3.ing.reduce((s,[,v])=>s+v,0);
es('la suma de los ingresos = total ingresos',+sumaIng.toFixed(2),f3.c.subtotal2);
es('  aparece la tarea ordinaria',K3.ing.some(([n])=>/Tarea ordinaria/.test(n)),true);
es('  una sola vez',K3.ing.filter(([n])=>/Tarea ordinaria/.test(n)).length,1);
es('sin cartel de aviso',/no tiene ningún día tareado/.test(_blDoc([f3],'gdar')),false);

console.log('\n'+(mal?'X '+mal+' fallo(s)':'OK todo bien')+'  ·  '+ok+'/'+(ok+mal));
process.exit(mal?1:0);
