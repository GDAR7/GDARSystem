// LPS · Plan semanal A3 (etapa 1): perfil de capas + avance y ritmo.
// Lo que importa: que el % de cada capa sea la SUMA de sus aportes hasta la
// fecha (tope 100, igual que Recrecimiento), que el avance de la semana sea
// solo lo de esa semana, y que el ritmo requerido sea saldo ÷ semanas a la meta.
const fs=require('fs'),vm=require('vm');
const R='c:/Users/LENOVO/OneDrive/Documents/GitHub/GDARSystem/';
let ok=0,mal=0;
const es=(l,g,e)=>{const b=String(g)===String(e);b?ok++:mal++;
  console.log((b?'  OK  ':'  MAL ')+l.padEnd(64)+'= '+g+(b?'':'  (esperado '+e+')'));};

const DB={
  lpsConfig:[{proyectoInicio:'2026-06-01',proyectoFin:'2026-12-18'}],
  capas:[
    {id:1,dique:'DP',nombre:'C-01',cota:4407.75,volM3:1000,pctAvance:100},
    {id:2,dique:'DP',nombre:'C-02',cota:4408.5,volM3:1000,pctAvance:60},
    {id:3,dique:'DP',nombre:'C-03',cota:4409.25,volM3:1000,pctAvance:0},
    {id:4,dique:'DA',nombre:'CA-01',cota:4380,volM3:2000,pctAvance:0},
    {id:5,dique:'CA',nombre:'CC-01',cota:4386.75,volM3:500,pctAvance:100}, // sin historial
    {id:6,dique:'DI',nombre:'CN-01',cota:4388.25,volM3:4000,pctAvance:0}
  ],
  capasAvance:[
    {capaId:1,fecha:'2026-10-05',pct:70},{capaId:1,fecha:'2026-10-12',pct:40}, // suma 110 → tope 100
    {capaId:2,fecha:'2026-10-27',pct:60},                                       // semana 26/10
    {capaId:4,fecha:'2026-10-28',pct:25},{capaId:4,fecha:'2026-11-03',pct:50}  // 1 en semana, 1 después
  ]
};
const nodos={};
const nodo=id=>nodos[id]||(nodos[id]={id,innerHTML:'',style:{},dataset:{}});
const mem={};
const ctx=vm.createContext({DB,console,Date,Math,Number,String,Object,Array,JSON,isNaN,parseFloat,parseInt,Set,Map,Promise,
  localStorage:{getItem:k=>mem[k]??null,setItem:(k,v)=>{mem[k]=String(v);},removeItem:k=>{delete mem[k];}},
  document:{getElementById:nodo,querySelectorAll:()=>[],addEventListener(){}},
  window:{location:{href:'x'}},toast(){},EMPRESA:{nombre:'ECOSERMO',logo:''},setTimeout:()=>0});
['js/lps.js','js/lpsA3.js'].forEach(f=>vm.runInContext(fs.readFileSync(R+f,'utf8'),ctx,{filename:f}));
const ev=x=>vm.runInContext(x,ctx);
ev(`_lpsDiaInicio=1;_lpsSemana='2026-10-26';_lpsProyInicio='2026-06-01';_lpsProyFin='2026-12-18'`);

console.log('\n== Cálculo de la semana 26/10 – 01/11 ==');
const d=ev(`_a3Datos('2026-10-26')`);
const F=k=>d.frentes.find(f=>f.k===k);
es('semana N° desde el inicio del proyecto (01/06)',d.num,22);
es('fin de semana',d.fin,'2026-11-01');
es('C-01: aportes 70+40 → tope 100 %',F('DP').capas[0].pct,100);
es('C-02: 60 % puesto esta semana',F('DP').capas[1].pct+' / antes '+F('DP').capas[1].pctAnt,'60 / antes 0');
es('DP acumulado = 1000 + 600',F('DP').acum,1600);
es('DP avance de la semana = 600',F('DP').sem,600);
es('DA: solo el aporte de la semana (25 % de 2000)',F('DA').acum+' / '+F('DA').sem,'500 / 500');
es('  el aporte del 03/11 no entra todavía',F('DA').capas[0].pct,25);
es('Contrafuerte sin historial: usa su % registrado',F('CA').acum+' · semana '+F('CA').sem,'500 · semana 0');
es('total volumen',d.vol,9500);
es('total acumulado',d.acum,2600);
es('total avance semana',d.sem,1100);
es('saldo',d.saldo,6900);
es('semanas restantes hasta 18/12',d.semRest,7);
es('ritmo requerido = 6900 ÷ 7',Math.round(d.requerido),986);
es('brecha < 1: el ritmo alcanza',d.brecha.toFixed(2),'0.90');
es('corte topográfico = último registro ≤ fin',d.corte,'2026-10-28');

console.log('\n== Estados por frente ==');
es('Principal: 53 % y avanzó más que su requerido → En ritmo',F('DP').est.t,'✓ En ritmo');
es('Contrafuerte terminado',F('CA').est.t,'✓ Terminado');
es('Intermedio sin avance',F('DI').est.t,'✕ Sin avance');

console.log('\n== Semana siguiente ==');
const d2=ev(`_a3Datos('2026-11-02')`);
es('DA suma el 50 % del 03/11 (1000 m³)',d2.frentes.find(f=>f.k==='DA').sem,1000);
es('el acumulado nunca baja',d2.acum>=d.acum,true);

console.log('\n== Curva ==');
es('curva real llega hasta la semana elegida',d.curva.real[d.curva.real.length-1].fecha,'2026-11-01');
es('  último punto = acumulado',Math.round(d.curva.real[d.curva.real.length-1].v),2600);
es('  es creciente',d.curva.real.every((p,i,a)=>!i||p.v>=a[i-1].v),true);

console.log('\n== Pantalla ==');
ev('_lpsTab=7;_lpsRenderTab()');
const H=nodo('lpsBody').innerHTML;
es('se dibuja dentro del LPS',/PLAN DE TRABAJO SEMANAL — CONTROL DE CAPAS/.test(H),true);
es('un perfil por frente con capas',(H.match(/aria-label="Perfil de capas/g)||[]).length,4);
es('capa con tooltip de su %',/C-02 · cota 4408.5 · 1,000.0 m³ · 60.0 %/.test(H),true);
es('tabla con fila TOTAL',/<td>TOTAL<\/td><td>9,500.00<\/td><td>2,600.00<\/td><td>1,100.00<\/td>/.test(H),true);
es('KPI con borde en los 4 lados',/class="a3-kpi" style="border-color:/.test(H)&&/\.a3-kpi\{border:1\.5px solid/.test(H),true);
es('curva con real y requerido',/Real 2,600 m³/.test(H)&&/Requerido · meta 18\/12/.test(H),true);
es('etapa 2 anunciada',/se agregan en la etapa 2/.test(H),true);
ev(`_a3FirmaSet('elab','n','Abel Rodríguez')`);
ev('_lpsRenderTab()');
es('firma guardada aparece',/value="Abel Rodríguez"/.test(nodo('lpsBody').innerHTML),true);
ev('_a3Semana(7)');
es('◀ ▶ cambia de semana',ev('_lpsSemana'),'2026-11-02');

console.log('\n== Sin fecha meta ==');
ev(`_lpsProyFin=''`);
const d3=ev(`_a3Datos('2026-10-26')`);
es('no inventa el ritmo requerido',d3.requerido,null);
es('lo explica',/Defina la fecha fin del proyecto/.test(ev(`_a3Hoja(_a3Datos('2026-10-26'),true)`)),true);

console.log('\n'+(mal?'✗ '+mal+' FALLAS':'OK todo bien')+'  ·  '+ok+'/'+(ok+mal));
process.exit(mal?1:0);
