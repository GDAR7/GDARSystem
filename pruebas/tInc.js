const fs=require('fs');
const R='c:/Users/LENOVO/OneDrive/Documents/GitHub/GDARSystem/';
global.localStorage={getItem:()=>null,setItem:()=>{}};
const nodos={arPanel:{id:'arPanel',innerHTML:'',style:{}}};
global.document={getElementById:id=>nodos[id]||null};
global.toast=()=>{};
let q=0;global.nidSeguro=()=>++q;global.supaUpsert=async()=>null;global.supaDelete=async()=>null;
global.DB={atencionRecursos:[],ventaPersonal:[],tarifasEq:[],equipos:[]};
global._ccMatchHH=()=>null;
global.hhVentaPeriodo=()=>({filas:[],sinTarifa:[],total:0,nDias:30});
global._edpDesde='2026-07-21';global._edpHasta='2026-08-20';

const src=fs.readFileSync(R+'js/atencionRecursos.js','utf8')
 +'\n;global.arCuh=arCuh;global.arCalcular=arCalcular;global.arIncidenciaDe=arIncidenciaDe;'
 +'global._arGuardarCampo=_arGuardarCampo;global._arRender=_arRender;global._AR_DEF=_AR_DEF;'
 +'global._arListaCalc=_arListaCalc;global._arHorasDia=_arHorasDia;';
eval(src);

let ok=0,mal=0;
const es=(l,g,e)=>{const b=String(g)===String(e);b?ok++:mal++;
  console.log((b?'  OK  ':'  MAL ')+l.padEnd(56)+'= '+g+(b?'':'  (esperado '+e+')'));};

DB.ventaPersonal=[
  {cargo:'ING. SUPERVISOR DE MANTTO DE EQUIPOS',tarifaMes:15590},
  {cargo:'MECANICO',tarifaMes:14608.20},
  {cargo:'AYUDANTE MECANICO',tarifaMes:8385.60}
];
DB.tarifasEq=[{id:1,desc:'Camioneta 4 Pasajeros',tarifaSeca:8769,tarifaFull:9934.50,unidad:'MES'}];
const per={desde:'2026-07-21',hasta:'2026-08-20',dias:31};
const horasPer=31*8;   // 248 h

console.log('\n== Sin tocar nada, la incidencia es la automática ==');
const I0=arIncidenciaDe({},per,1);
es('vale 1',I0.inc,1);
es('y no es manual',I0.manual,false);
const cargo={cargo:'MECANICO'};
const c0=arCuh(cargo,per);
es('el C.U.H. sale de tarifa ÷ horas',+c0.cuh.toFixed(4),+(14608.20*1/horasPer).toFixed(4));
es('  y se marca como automática',c0.incManual,false);

console.log('\n== Fijar la incidencia a mano ==');
const c1=arCuh({cargo:'MECANICO',incidencia:0.5},per);
es('la mitad de la tarifa',+c1.cuh.toFixed(4),+(14608.20*0.5/horasPer).toFixed(4));
es('se marca como fijada',c1.incManual,true);
es('  y el detalle lo dice',/\(fijada\)/.test(c1.detalle),true);
const c2=arCuh({cargo:'MECANICO',incidencia:2},per);
es('también se puede subir de 1',+c2.cuh.toFixed(4),+(14608.20*2/horasPer).toFixed(4));
es('el doble que sin fijar',+(c2.cuh/c0.cuh).toFixed(4),2);

console.log('\n== Cero o vacío = automática ==');
[0,'',null,undefined,-3].forEach(v=>{
  const c=arCuh({cargo:'MECANICO',incidencia:v},per);
  es('  incidencia '+JSON.stringify(v),+c.cuh.toFixed(4),+c0.cuh.toFixed(4));
});

console.log('\n== También aplica a las tarifas de equipo ==');
const t0=arCuh({tarifaDesc:'Camioneta 4 Pasajeros',tarifaCol:'full'},per);
es('sin fijar: tarifa ÷ horas',+t0.cuh.toFixed(4),+(9934.50/horasPer).toFixed(4));
const t1=arCuh({tarifaDesc:'Camioneta 4 Pasajeros',tarifaCol:'full',incidencia:0.25},per);
es('fijada al 25 %',+t1.cuh.toFixed(4),+(9934.50*0.25/horasPer).toFixed(4));
es('el detalle muestra el factor',/× inc 0\.2500/.test(t1.detalle),true);
es('sin fijar no ensucia el detalle',/× inc/.test(t0.detalle),false);

console.log('\n== Al valor fijo no le afecta ==');
const f1=arCuh({usaManual:1,cuhManual:23.90,incidencia:0.5},per);
es('sigue siendo 23.90',f1.cuh,23.9);

console.log('\n== El total del cuadro cambia con la incidencia ==');
DB.atencionRecursos=_AR_DEF.map((d,i)=>({id:i+1,...d}));
const atn=[{horas:2.5,nMec:2,nAyu:1}];
const A=arCalcular(atn,per);
const mec=DB.atencionRecursos.find(r=>r.nombre==='Mecánico');
mec.incidencia=0.5;
const B=arCalcular(atn,per);
const fA=A.filas.find(f=>f.nombre==='Mecánico'), fB=B.filas.find(f=>f.nombre==='Mecánico');
es('el mecánico baja a la mitad',+(fB.cuh/fA.cuh).toFixed(4),0.5);
es('  y su parcial también',+(fB.parcial/fA.parcial).toFixed(4),0.5);
// El desgaste sale de la mano de obra, así que sigue al mecánico. Los demás no.
const _indep=x=>x.nombre!=='Mecánico'&&x.nombre!=='Desg. de H. Manuales';
es('los independientes no se mueven',
   A.filas.filter(_indep).map(f=>f.cuh).join(','),
   B.filas.filter(_indep).map(f=>f.cuh).join(','));
const dA=A.filas.find(f=>f.nombre==='Desg. de H. Manuales');
const dB=B.filas.find(f=>f.nombre==='Desg. de H. Manuales');
es('el desgaste sí baja con el mecánico',dB.parcial<dA.parcial,true);
// Los dos totales vienen redondeados a 2 decimales, así que su resta puede
// diferir un céntimo de la suma exacta de las diferencias.
es('el total baja lo del mecánico más lo del desgaste',
   Math.abs((A.total-B.total)-((fA.bruto-fB.bruto)+(dA.bruto-dB.bruto)))<0.02,true);
mec.incidencia=0;

console.log('\n== Se guarda bien ==');
(async()=>{
  const r=DB.atencionRecursos[0];
  await _arGuardarCampo(r.id,'incidencia','0.35');
  es('queda como número',r.incidencia,0.35);
  await _arGuardarCampo(r.id,'incidencia','');
  es('vaciarla la vuelve automática',r.incidencia,0);
  await _arGuardarCampo(r.id,'incidencia','-5');
  es('un negativo no se acepta',r.incidencia,0);

  console.log('\n== La columna está en el panel ==');
  _arRender();
  const h=nodos.arPanel.innerHTML;
  es('hay cabecera Incidencia',/>Incidencia</.test(h),true);
  es('los 5 recursos traen campo',(h.match(/'incidencia'/g)||[]).length,5);
es('  ninguno queda ya en valor fijo',_arListaCalc().filter(r=>+r.usaManual).length,0);
  es('la automática va de marca de agua',/placeholder="[\d.]+"/.test(h),true);
  es('se distingue fijada de automática',/automática/.test(h),true);
  DB.atencionRecursos[1].incidencia=0.5;
  _arRender();
  es('  y la fijada se marca',/fijada/.test(nodos.arPanel.innerHTML),true);
  es('sin recursos de valor fijo, nadie dice "no aplica"',/no aplica/.test(nodos.arPanel.innerHTML),false);

  console.log('\n'+(mal?'X '+mal+' fallo(s)':'OK todo bien')+'  ·  '+ok+'/'+(ok+mal));
  process.exit(mal?1:0);
})();
