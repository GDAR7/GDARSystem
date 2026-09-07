const fs=require('fs');
const R='c:/Users/LENOVO/OneDrive/Documents/GitHub/GDARSystem/';
global.localStorage={getItem:()=>null,setItem:()=>{},removeItem:()=>{}};
const nodos={};
const mk=id=>nodos[id]={id,innerHTML:'',style:{},value:'',classList:{contains:()=>false}};
['thPlanilla','tbPlanillaBody','tfPlanilla','planillaResumen','planillaCard','plVistas','plFiltros','plCierreBar','plMes','plAnio','plProy'].forEach(mk);
nodos.plMes.value='6';nodos.plAnio.value='2026';nodos.plProy.value='';
global.document={getElementById:id=>nodos[id]||null,querySelector:()=>null,querySelectorAll:()=>[]};
global.toast=()=>{};global.openM=()=>{};global.closeM=()=>{};
global.isModuleReadOnly=()=>false;
global.nid=()=>1;global.nidSeguro=()=>1;global.supaUpsert=async()=>null;global.syncSheet=()=>{};
global.DB={personal:[],tareaje:[],planillaMes:[],afpTasas:[],proyectos:[],planillaCierre:[],planillaCerrada:[]};

const src=fs.readFileSync(R+'js/planilla.js','utf8')+'\n'+fs.readFileSync(R+'js/afpTasas.js','utf8')
  +'\n'+fs.readFileSync(R+'js/planillaCierre.js','utf8')
  +'\n;global._calcPlanRow=_calcPlanRow;global.PL_COLS=PL_COLS;global.PL_GRUPOS=(typeof PL_GRUPOS!=="undefined")?PL_GRUPOS:null;'
  +'global.PL_VISTAS=PL_VISTAS;global.genPlanilla=genPlanilla;'
  +'global._setVista=v=>{_plVista=v};_plGenMes=6;_plGenAnio=2026;';
eval(src);

let ok=0,mal=0;
const es=(l,g,e)=>{const b=String(g)===String(e);b?ok++:mal++;
  console.log((b?'  OK  ':'  MAL ')+l.padEnd(54)+'= '+g+(b?'':'  (esperado '+e+')'));};

// Dos trabajadores: uno en ONP, otro en AFP, con descuentos variados
DB.personal=[
  {id:1,dni:'11111111',ape:'ONP',nom:'UNO',cargo:'X',sue:9000,asig:0,afp:'ONP',est:'Activo'},
  {id:2,dni:'22222222',ape:'AFP',nom:'DOS',cargo:'X',sue:9000,asig:0,afp:'Habitat',est:'Activo'}
];
[1,2].forEach(id=>{for(let d=1;d<=30;d++)DB.tareaje.push({personalId:id,fecha:'2026-06-'+String(d).padStart(2,'0'),tipo:'TD'});});
DB.planillaMes=[
  {id:9,personalId:1,mes:6,anio:2026,adelanto:300,cts:150,sindicato:20,rimac:80,otrosDesc:45,retJudicial:200,quintaCat:1353.35,masVida:30,fondoMina:25,vacDesc:10},
  {id:10,personalId:2,mes:6,anio:2026,adelanto:100}
];

const c1=_calcPlanRow(DB.personal[0],DB.planillaMes[0]);
const c2=_calcPlanRow(DB.personal[1],DB.planillaMes[1]);

console.log('\n== Las dos mitades suman el total de siempre ==');
es('ONP: pensión + otros = total',+(c1.totalPensiones+c1.totalOtrasDed).toFixed(2),c1.totalDeduccion);
es('AFP: pensión + otros = total',+(c2.totalPensiones+c2.totalOtrasDed).toFixed(2),c2.totalDeduccion);
es('la pensión del de ONP es su SNP',c1.totalPensiones,c1.snp);
es('la del de AFP son sus tres aportes',c2.totalPensiones,+(c2.obligAfp+c2.primaAfp+c2.sobreAfp).toFixed(2));
const otrosManual=300+150+20+80+45+200+1353.35+30+25+10;
es('otros = la suma de los diez descuentos',c1.totalOtrasDed,otrosManual);
es('el de AFP solo tiene su adelanto',c2.totalOtrasDed,100);
es('el neto no cambió',c1.neto,+(c1.subtotal2+c1.movilidad-c1.totalDeduccion).toFixed(2));

console.log('\n== Tres cabeceras donde antes había una ==');
es('existe DEDUCCIÓN PENSIÓN',PL_GRUPOS.dedApo.l,'DEDUCCIÓN PENSIÓN');
es('existe DEDUCCIÓN OTROS',PL_GRUPOS.dedOtr.l,'DEDUCCIÓN OTROS');
es('y el total quedó aparte',PL_GRUPOS.ded.l,'TOTAL DEDUCCIONES');
es('cada una con su color',new Set([PL_GRUPOS.dedApo.bg,PL_GRUPOS.dedOtr.bg,PL_GRUPOS.ded.bg]).size,3);

console.log('\n== Cada columna en su bloque ==');
const g=k=>(PL_COLS.find(c=>c.k===k)||{}).g;
['snp','obligAfp','primaAfp','sobreAfp','totPens','tipo','cuspp'].forEach(k=>es('  '+k+' → pensión',g(k),'dedApo'));
['ley29741','masVida','adelantos','vacDesc','cts','sindicato','rimac','otrosDesc','retJud','quinta','totOtrDed'].forEach(k=>es('  '+k+' → otros',g(k),'dedOtr'));
es('  totDed → total',g('totDed'),'ded');
es('ninguna quedó en el grupo viejo',PL_COLS.filter(c=>c.g==='ded'&&c.k!=='totDed').length,0);

console.log('\n== La columna nueva de subtotal ==');
const colOtr=PL_COLS.find(c=>c.k==='totOtrDed');
es('se llama Tot.Otros',colOtr.l,'Tot.Otros');
es('va justo antes del TOTAL DED.',PL_COLS.indexOf(colOtr)+1,PL_COLS.findIndex(c=>c.k==='totDed'));
es('pinta el subtotal',/1\.213,35|2\.213,35|S\//.test(colOtr.c(c1)),true);
es('y muestra el valor correcto',colOtr.c(c1).includes(otrosManual.toLocaleString('es-PE',{minimumFractionDigits:2})),true);

console.log('\n== Totales al pie ==');
_setVista('desc');
genPlanilla();
const pie=nodos.tfPlanilla.innerHTML;
const suma=(a,b)=>+(a+b).toFixed(2);
const fmt=n=>'S/ '+Number(n).toLocaleString('es-PE',{minimumFractionDigits:2});
es('totaliza la pensión de los dos',pie.includes(fmt(suma(c1.totalPensiones,c2.totalPensiones))),true);
es('totaliza los otros descuentos',pie.includes(fmt(suma(c1.totalOtrasDed,c2.totalOtrasDed))),true);
es('y el total general sigue estando',pie.includes(fmt(suma(c1.totalDeduccion,c2.totalDeduccion))),true);

console.log('\n== La cabecera de la tabla ==');
const cab=nodos.thPlanilla.innerHTML;
es('se ve DEDUCCIÓN PENSIÓN',cab.includes('DEDUCCIÓN PENSIÓN'),true);
es('se ve DEDUCCIÓN OTROS',cab.includes('DEDUCCIÓN OTROS'),true);
es('se ve TOTAL DEDUCCIONES',cab.includes('TOTAL DEDUCCIONES'),true);
es('ya no dice el rótulo viejo',/>DEDUCCIONES</.test(cab),false);

console.log('\n== Las otras vistas siguen enteras ==');
const todas=PL_COLS.map(c=>c.k);
let rotas=0;
PL_VISTAS.forEach(v=>{
  if(!v.cols)return;
  const faltan=v.cols.filter(k=>!todas.includes(k));
  if(faltan.length){rotas++;console.log('     '+v.k+' pide columnas inexistentes: '+faltan.join(', '));}
});
es('ninguna vista quedó apuntando a una columna que no existe',rotas,0);
es('la vista Descuentos incluye el subtotal nuevo',PL_VISTAS.find(v=>v.k==='desc').cols.includes('totOtrDed'),true);
['resumen','dias','ingresos','gratif','aportes','todo'].forEach(k=>{
  _setVista(k);genPlanilla();
  es('  vista '+k+' se dibuja',nodos.thPlanilla.innerHTML.length>0,true);
});

console.log('\n'+(mal?'X '+mal+' fallo(s)':'OK todo bien')+'  ·  '+ok+'/'+(ok+mal));
process.exit(mal?1:0);
