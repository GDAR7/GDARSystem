// Tareaje · carga por tramos: al entrar solo los últimos 3 meses; lo antiguo
// llega cuando una pantalla lo necesita o se elige en el selector. Lo que
// importa: que nada se pierda, que no se dupliquen marcas y que los ids
// nuevos no pisen marcas antiguas que no se descargaron.
const fs=require('fs'),path=require('path'),vm=require('vm');
const R=path.join(__dirname,'..')+'/';
let ok=0,mal=0;
const es=(l,g,e)=>{const b=JSON.stringify(g)===JSON.stringify(e);b?ok++:mal++;
  console.log((b?'  OK  ':'  MAL ')+l.padEnd(60)+'= '+JSON.stringify(g)+(b?'':'  (esperado '+JSON.stringify(e)+')'));};
const SRC=fs.readFileSync(R+'js/tareajeCarga.js','utf8');

// ── Base simulada: la tabla tareaje con su API de consultas ──
const TABLA=[
  {id:5,  personal_id:1,fecha:'2026-01-10',tipo:'TD',proy:null},
  {id:6,  personal_id:1,fecha:'2026-01-11',tipo:'TD',proy:'P1'},
  {id:7,  personal_id:1,fecha:'2026-01-12',tipo:'TN',proy:'P1'},
  {id:8,  personal_id:1,fecha:'2026-01-13',tipo:'DL',proy:'P1'},
  {id:9,  personal_id:1,fecha:'2026-01-14',tipo:'TD',proy:'P1'},
  {id:20, personal_id:2,fecha:'2026-07-31',tipo:'F', proy:'P1'},
  {id:21, personal_id:1,fecha:'2026-08-01',tipo:'TD',proy:'P1'},
  {id:22, personal_id:2,fecha:'2026-11-19',tipo:'TD',proy:'P1'},
  {id:23, personal_id:2,fecha:'2026-12-05',tipo:'TN',proy:'P1'},   // programado a futuro
  {id:24, personal_id:3,fecha:null,        tipo:'TD',proy:'P1'},   // sin fecha: no se pierde
  {id:99, personal_id:3,fecha:'2026-02-03',tipo:'S', proy:'P1'}    // antigua pero cargada hace poco: id alto
];
let consultas=[];
function consulta(){
  const f=[];let orden=null,lim=null,rng=null,head=false,cuenta=false;
  const q={
    select(c,o){if(o&&o.count)cuenta=true;if(o&&o.head)head=true;return q;},
    gte(c,v){f.push(r=>r[c]!=null&&r[c]>=v);return q;},
    lt(c,v){f.push(r=>r[c]!=null&&r[c]<v);return q;},
    eq(c,v){f.push(r=>r[c]===v);return q;},
    in(c,a){f.push(r=>a.includes(r[c]));return q;},
    or(s){const[a,b]=s.split(',');const v=a.split('.').slice(2).join('.');
      f.push(r=>(r.fecha!=null&&r.fecha>=v)||r.fecha==null);return q;},
    order(c,o){orden={c,asc:!o||o.ascending!==false};return q;},
    limit(n){lim=n;return q;},
    range(a,b){rng=[a,b];return q;},
    then(res,rej){
      let d=TABLA.filter(r=>f.every(fn=>fn(r)));
      if(orden)d.sort((x,y)=>(orden.asc?1:-1)*((x[orden.c]||0)-(y[orden.c]||0)));
      if(rng)d=d.slice(rng[0],rng[1]+1);
      if(lim)d=d.slice(0,lim);
      consultas.push(f.length);
      const out=cuenta?{count:d.length,error:null,data:head?null:d}:{data:d.map(r=>({...r})),error:null};
      return Promise.resolve(out).then(res,rej);
    }
  };
  return q;
}
const toCamel=o=>{const r={};for(const[k,v]of Object.entries(o))r[k.replace(/_([a-z])/g,(_,c)=>c.toUpperCase())]=v??'';return r;};
const pintados=[];
const ctx={console,Date,Math,JSON,Set,Promise,String,Number,Array,Object,toCamel,
  supa:{from:t=>{if(t!=='tareaje')throw new Error('tabla '+t);return consulta();}},
  today:()=>'2026-11-20',toast:()=>{},AP:'tareaje',renderPage:k=>pintados.push(k),
  document:{getElementById:()=>null},
  DB:{tareaje:[],nx:{tar:1}}};
vm.createContext(ctx);vm.runInContext(SRC,ctx);
const ev=s=>vm.runInContext(s,ctx);
const ids=()=>ctx.DB.tareaje.map(r=>r.id).sort((a,b)=>a-b);

(async()=>{
  console.log('\n== Fechas ==');
  es('3 meses antes del 20/11 → 01/08',ev('tarDesdeMeses(3,"2026-11-20")'),'2026-08-01');
  es('12 meses antes del 15/03 → 01/03 del año anterior',ev('tarDesdeMeses(12,"2026-03-15")'),'2025-03-01');
  es('antes de cargar nada, se considera todo cubierto',ev('tarCubre("2020-01-01")'),true);

  console.log('\n== Carga inicial ==');
  await ev('tarCargaInicial()');
  es('cargado desde el 01/08',ev('_tarCargaDesde'),'2026-08-01');
  es('trae desde agosto + futuro + sin fecha',ids(),[21,22,23,24]);
  es('el id nuevo sigue al MAYOR de la tabla, no de lo cargado',ctx.DB.nx.tar,100);
  es('julio no está cubierto',ev('tarCubre("2026-07-31")'),false);
  es('agosto sí',ev('tarCubre("2026-08-01")'),true);

  console.log('\n== Ir a un mes anterior ==');
  let redibujo=0;ctx.__cb=()=>redibujo++;
  es('tarAsegurar(julio) avisa que falta',ev('tarAsegurar("2026-07-15",__cb)'),false);
  await ev('_tcgCola');
  es('  trae julio',ids(),[20,21,22,23,24]);
  es('  y vuelve a dibujar',redibujo,1);
  es('  ahora cargado desde el 01/07',ev('_tarCargaDesde'),'2026-07-01');
  es('  pedirlo otra vez no consulta la base',(consultas=[],ev('tarAsegurar("2026-07-02")'),consultas.length),0);
  es('período 21→20 de una fecha de julio: desde el 01/06',(ev('tarAsegurarPeriodo("2026-07-25",__cb)'),true),true);
  await ev('_tcgCola');
  es('  cargado desde el 01/06',ev('_tarCargaDesde'),'2026-06-01');

  console.log('\n== A5: días en obra antes de una fecha ==');
  es('persona 1 tiene 4 días en obra en enero (no cargados) + 1 en agosto',
    await ev('tarDiasObraAntes(1,"2026-11-20",4)'),5);
  es('persona 2 solo tiene una falta: 0 días en obra antes del 19/11',
    await ev('tarDiasObraAntes(2,"2026-11-19",4)'),0);

  console.log('\n== Desde el inicio ==');
  pintados.length=0;
  es('tarHistorial avisa que falta',ev('tarHistorial()'),false);
  es('  no lo pide dos veces',(consultas=[],ev('tarHistorial()'),consultas.length),0);
  await ev('_tcgCola');
  es('  ahora está todo, sin duplicados',ids(),[5,6,7,8,9,20,21,22,23,24,99]);
  es('  ordenado por id',ctx.DB.tareaje.map(r=>r.id),[5,6,7,8,9,20,21,22,23,24,99]);
  es('  redibuja la página abierta',pintados,['tareaje']);
  es('  y ya no falta nada',ev('tarHistorial()'),true);
  es('  el contador de ids no retrocede',ctx.DB.nx.tar,100);

  console.log('\n== Refrescar mantiene lo ya cargado ==');
  await ev('tarCargaInicial()');
  es('sigue desde el inicio',ev('_tarCargaDesde'),'');
  es('  con todo',ids().length,11);

  console.log('\n== Conexión ==');
  const CFG=fs.readFileSync(R+'js/config.js','utf8'),HTML=fs.readFileSync(R+'index.html','utf8');
  const TAR=fs.readFileSync(R+'js/tareaje.js','utf8'),PER=fs.readFileSync(R+'js/personal.js','utf8');
  es('config usa la carga por tramos',/tarCargaInicial\(\)/.test(CFG),true);
  es('  y si falla, carga todo como antes',/cargarPaginado\('tareaje'\)/.test(CFG),true);
  es('index carga tareajeCarga.js',/js\/tareajeCarga\.js\?v=\d+/.test(HTML),true);
  es('selector "Cargado" en la barra del tareaje',/id="tareCarga"[^>]*tarCargaSel/.test(HTML),true);
  es('la grilla no se dibuja con el mes a medias',/!tarAsegurar\(FECHAS\[0\],rTareaje\)/.test(TAR),true);
  es('escáner y lote usan tarDiasObraAntes',(PER.match(/await tarDiasObraAntes\(/g)||[]).length,2);
  ['alimentacionProy','costoIndirectoSim','costoM3','hhVenta','histograma','informePeriodo',
   'panelHoras','planilla','valorizacion','tareajeAcum'].forEach(f=>
    es('  '+f+' pide el historial completo',/tarHistorial\(/.test(fs.readFileSync(R+'js/'+f+'.js','utf8')),true));

  console.log('\n== Suspensión ==');
  es('marca S en el tareaje',/S:\s*\{l:'Suspensión'/.test(TAR),true);
  es('  en el roster (como ausencia)',/t:'S',[^}]*g:'aus'/.test(PER),true);

  console.log(`\n${mal?'✗ '+mal+' FALLAS':'OK todo bien'}  ·  ${ok}/${ok+mal}`);
  process.exitCode=mal?1:0;
})().catch(e=>{console.error(e);process.exitCode=1;});
