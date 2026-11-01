// Avance MT · Origen → Destino: doble clic en una ruta abre los días de la
// semana en que se hizo (☀/🌙, viajes, m³ y equipos). Lo que importa: que la
// suma por días cuadre con la fila de la tabla en la que se hizo clic.
const fs=require('fs'),vm=require('vm');
const R='c:/Users/LENOVO/OneDrive/Documents/GitHub/GDARSystem/';
let ok=0,mal=0;
const es=(l,g,e)=>{const b=String(g)===String(e);b?ok++:mal++;
  console.log((b?'  OK  ':'  MAL ')+l.padEnd(60)+'= '+g+(b?'':'  (esperado '+e+')'));};
const SRC=fs.readFileSync(R+'js/avanceMT.js','utf8');
const DB={equipos:[{id:1,codigo:'VOL_ECOP-001'},{id:2,codigo:'VOL_ECOP-003'}],
  tramos:[{id:9,inicio:'Lavadero (Tres torres)',ciclo:20},{id:42,codigo:'TMO-042',ciclo:39},
          {id:43,codigo:'TMO-099',ciclo:30},{id:44,codigo:'TMO-SIN'}],
  partes:[
    {fecha:'2026-10-26',turno:'Día',eqId:1,viajes:[{origen:'R3 - Dique Auxiliar',destino:'C. Huantajalla',material:'MATERIAL INADECUADO',cant:5,tramoId:42}]},
    {fecha:'2026-10-26',turno:'Noche',eqId:2,viajes:[{origen:'R3 - Dique Auxiliar',destino:'C. Huantajalla',material:'MATERIAL INADECUADO',cant:3,tramoId:43}]},
    {fecha:'2026-10-28',turno:'Día',eqId:2,viajes:[{origen:'R3 - Dique Auxiliar',destino:'C. Huantajalla',material:'MATERIAL INADECUADO',cant:4,tramoId:44},
                                                  {origen:'R3 - Dique Auxiliar',destino:'C. Huantajalla',material:'BLANKET',cant:2}]},
    {fecha:'2026-10-29',turno:'Día',eqId:1,viajes:[{tramoId:9,destino:'R3 - Dique intermedio',material:'MATERIAL TIPO 2',cant:6}]},
    {fecha:'2026-11-03',turno:'Día',eqId:1,viajes:[{origen:'R3 - Dique Auxiliar',destino:'C. Huantajalla',material:'MATERIAL INADECUADO',cant:9}]}
  ]};
const nodos={},esc=[];let overlay=null;
const ctx=vm.createContext({DB,console,Date,Math,String,Number,Object,Array,JSON,Set,parseFloat,
  localStorage:{getItem:()=>null,setItem(){}},today:()=>'2026-10-28',
  document:{getElementById:id=>id==='amtOdOverlay'?overlay:(nodos[id]||(nodos[id]={innerHTML:''})),
    createElement:()=>({style:{},remove(){overlay=null;}}),body:{appendChild:o=>{overlay=o;}},
    addEventListener:(t,f)=>esc.push(f),removeEventListener:(t,f)=>{const i=esc.indexOf(f);if(i>=0)esc.splice(i,1);}}});
vm.runInContext(SRC.replace(/^const /gm,'var ').replace(/^let /gm,'var '),ctx,{filename:'avanceMT.js'});
const ev=x=>vm.runInContext(x,ctx);
ev(`_amtSemIni='2026-10-26';_amtMatFiltro=new Set();_amtCapM3=12;_amtMatOk=m=>!!m;_amtKpi=()=>'';_amtSemBar=()=>'';`);

console.log('\n== La tabla Origen → Destino ==');
nodos.b={innerHTML:''};ctx.cuerpo=nodos.b;ev('_amtRenderSemOrigen(cuerpo)');
const H=nodos.b.innerHTML;
es('cada ruta se abre con doble clic',(H.match(/ondblclick="_amtOdVer\(\d+\)"/g)||[]).length,3);
es('se avisa cómo usarlo',/Doble clic en una ruta/.test(H),true);
es('el origen sale del tramo si no se anotó',H.includes('Lavadero (Tres torres)'),true);

console.log('\n== R3 - Dique Auxiliar → C. Huantajalla · MATERIAL INADECUADO ==');
const ix=ev(`_amtOdRutas.findIndex(r=>r.material==='MATERIAL INADECUADO')`);
const D=ev(`_amtOdDias(_amtOdRutas[${ix}])`);
es('siempre los 7 días de la semana',D.length,7);
es('días con viajes',D.filter(d=>d.vd+d.vn).map(d=>d.lbl+' '+d.dm).join(', '),'LUN 26/10, MIÉ 28/10');
es('lunes: ☀ 5 · 🌙 3',D[0].vd+'/'+D[0].vn,'5/3');
es('miércoles: 4 (el BLANKET no se mezcla)',D[2].vd,4);
es('m³ del lunes (8 × 12)',D[0].m3,96);
es('equipos del lunes',JSON.stringify(D[0].eqs),'{"VOL_ECOP-001":5,"VOL_ECOP-003":3}');
es('no entra el viaje de la semana siguiente',D.reduce((s,d)=>s+d.vd+d.vn,0),12);
es('cuadra con la fila de la tabla (12 v)',/>12<span style="font-size:.6rem;color:var\(--muted2\)"> v</.test(H),true);

console.log('\n== Horas por ciclo del tramo ==');
es('lunes: 5×39 + 3×30 min = 4.75 h (cada viaje con SU tramo)',D[0].h,4.75);
es('el tramo sin ciclo no suma horas',D[2].h,0);
es('  y se cuenta aparte para avisarlo',D.sinCiclo,4);
es('detalle por tramo',D.tramos.map(t=>t.codigo+' '+t.ciclo+'×'+t.viajes).join(', '),'TMO-042 39×5, TMO-099 30×3');
es('menos de 1 h se muestra en minutos',ev('_amtOdHoras(0.65)'),'39 min');

console.log('\n== La ventana ==');
ev(`_amtOdVer(${ix})`);
es('se abre',!!overlay,true);
es('columna y KPI de horas',/⏱ Horas<\/th>/.test(overlay.innerHTML)&&/⏱ Horas de ciclo/.test(overlay.innerHTML),true);
es('explica de dónde salen las horas',/TMO-042<\/b> 39 min × 5 v/.test(overlay.innerHTML),true);
es('avisa los viajes sin ciclo',/4 viaje\(s\) sin ciclo/.test(overlay.innerHTML),true);
es('dice la ruta',/R3 - Dique Auxiliar[\s\S]*C\. Huantajalla[\s\S]*MATERIAL INADECUADO/.test(overlay.innerHTML),true);
es('resume en qué días se hizo',/Se hizo el <b[^>]*>LUN 26\/10, MIÉ 28\/10/.test(overlay.innerHTML),true);
es('días con viajes 2 de 7',/2 de 7/.test(overlay.innerHTML),true);
es('Esc la cierra',(esc[0]({key:'Escape'}),overlay),null);
es('  y suelta el teclado',esc.length,0);
ev(`_amtOdVer(${ix})`);overlay.onclick({target:overlay});
es('clic fuera la cierra',overlay,null);
es('textos raros no rompen el HTML',ev(`_amtOdH('<b>"x"')`),'&lt;b&gt;&quot;x&quot;');

console.log('\n'+(mal?'✗ '+mal+' FALLAS':'OK todo bien')+'  ·  '+ok+'/'+(ok+mal));
process.exit(mal?1:0);
