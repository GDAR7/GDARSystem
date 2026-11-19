// Avance MT · pestaña 9 «Panel MT»: KPIs, curva S de la semana, dona por
// destino, histograma y curva S del periodo, ranking. Lo que importa: que las
// cifras cuadren con los partes y que las semanas del periodo salgan bien.
const fs=require('fs'),path=require('path'),vm=require('vm');
const R=path.join(__dirname,'..')+'/';
let ok=0,mal=0;
const es=(l,g,e)=>{const b=JSON.stringify(g)===JSON.stringify(e);b?ok++:mal++;
  console.log((b?'  OK  ':'  MAL ')+l.padEnd(62)+'= '+JSON.stringify(g)+(b?'':'  (esperado '+JSON.stringify(e)+')'));};
const SRC=fs.readFileSync(R+'js/avanceMT.js','utf8');
const HTML=fs.readFileSync(R+'index.html','utf8');
const mem={};
const ctx={console,Date,Math,JSON,
  localStorage:{getItem:k=>mem[k]??null,setItem:(k,v)=>{mem[k]=String(v);}},
  today:()=>'2026-11-12',toast:()=>{},
  document:{getElementById:()=>null,querySelectorAll:()=>[],addEventListener(){},removeEventListener(){}},
  DB:{equipos:[],tramos:[],partes:[
    {fecha:'2026-11-09',turno:'Día',eqId:1,viajes:[{destino:'R3 - Dique Auxiliar',material:'TIPO 2',cant:10},{destino:'C. Huantajalla',material:'TIPO 2',cant:4}]},
    {fecha:'2026-11-10',turno:'Noche',eqId:2,viajes:[{destino:'R3 - Dique Auxiliar',material:'TIPO 2',cant:6}]},
    {fecha:'2026-11-11',turno:'Día',eqId:1,viajes:[{destino:'C. Huantajalla',material:'SIN MATERIAL',cant:3}]},  // traslado: viaje sin m³
    {fecha:'2026-11-03',turno:'Día',eqId:1,viajes:[{destino:'R3 - Dique Auxiliar',material:'TIPO 2',cant:5}]},
    {fecha:'2026-10-27',turno:'Día',eqId:1,viajes:[{destino:'Lavadero <T>',material:'TIPO 2',cant:2}]}
  ]}};
vm.createContext(ctx);
vm.runInContext(SRC+';this.__set=(k,v)=>{eval(k+"=v")};',ctx);
const ev=s=>vm.runInContext(s,ctx);
ctx.__set('_amtSemIni','2026-11-09');ctx.__set('_amtCapM3',12);ctx.__set('_amtMetaSem',500);

console.log('\n== Semanas del periodo ==');
let P=ev("_amtDashSemanas('mes','2026-11-12')");
es('noviembre: semanas desde el lunes 26/10',P.sem.map(s=>s.lbl),['26/10','02/11','09/11','16/11','23/11','30/11']);
es('  m³ por semana (12 m³/viaje)',P.sem.map(s=>s.t),[24,60,240,null,null,null]);
es('  la semana elegida va marcada',P.sem.filter(s=>s.actual).map(s=>s.lbl),['09/11']);
es('  título',P.titulo.toLowerCase(),'noviembre 2026');
P=ev("_amtDashSemanas('trim','2026-11-12')");
es('trimestre oct–dic: primera semana contiene el 01/10',P.sem[0].ini<='2026-10-01'&&P.sem[0].fin>='2026-10-01',true);
es('  última semana contiene el 31/12',P.sem[P.sem.length-1].ini<='2026-12-31'&&P.sem[P.sem.length-1].fin>='2026-12-31',true);

console.log('\n== Render ==');
const body={innerHTML:''};
ev('_amtRenderDashboard')(body);
const H=body.innerHTML;
es('KPI m³ de la semana = 240',/240 m³<\/b>/.test(H),true);
es('KPI viajes = 23 (incluye traslado)',/>23<\/b>/.test(H),true);
es('KPI m³ por viaje',/10\.4 m³/.test(H),true);
es('destinos activos = 2',/Destinos activos[\s\S]*?>2<\/b>/.test(H),true);
es('avance vs meta 500 → 48%',/Avance: 48% de la meta/.test(H),true);
es('dona: Dique Auxiliar 192 · 80.0%',/192 · 80\.0%/.test(H),true);
es('acumulado del periodo 324 de 3,000',/Acumulado: 11% de la meta del periodo \(3,000 m³\)|Acumulado: 11% de la meta del periodo \(3.000 m³\)/.test(H),true);
es('KPIs con borde en los 4 lados',(H.match(/border:2px solid/g)||[]).length>=4,true);
es('exporta a Excel',ctx._amtSemExportData===undefined?ev('_amtSemExportData.name'):ev('_amtSemExportData.name'),'panel_mt_2026-11-09.xlsx');
ctx.__set('_amtSemIni','2026-10-26');
ev('_amtRenderDashboard')(body);
es('nombres escapados (Lavadero <T>)',body.innerHTML.includes('Lavadero &lt;T&gt;')&&!body.innerHTML.includes('Lavadero <T>'),true);
ctx.__set('_amtSemIni','2026-12-07');
ev('_amtRenderDashboard')(body);
es('semana sin viajes: aviso, sin romper',/Sin volumen en esta semana/.test(body.innerHTML),true);

console.log('\n== Conexión ==');
es('pestaña «📈 Panel MT» en index',/_amtTabSwitch\(9\)">📈 Panel MT</.test(HTML),true);
es('es la novena pestaña (el resaltado va por posición)',(HTML.match(/class="lps-tab[^"]*amt-tab"/g)||[]).length,9);
es('_amtRender la dibuja',/_amtTab===9\) _amtRenderDashboard\(body\)/.test(SRC),true);
es('index carga avanceMT.js versión nueva',/avanceMT\.js\?v=(1[89]|[2-9]\d)/.test(HTML),true);

console.log(`\n${mal?'✗ '+mal+' FALLAS':'OK todo bien'}  ·  ${ok}/${ok+mal}`);
process.exitCode=mal?1:0;
