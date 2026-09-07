const fs=require('fs');
const R='c:/Users/LENOVO/OneDrive/Documents/GitHub/GDARSystem/';
global.localStorage={getItem:()=>null,setItem:()=>{}};
global.document={getElementById:()=>null};global.toast=()=>{};
let q=0;global.nidSeguro=()=>++q;global.supaUpsert=async()=>null;global.supaDelete=async()=>null;
global.DB={atencionRecursos:[],ventaPersonal:[
  {cargo:'ING. SUPERVISOR DE MANTTO DE EQUIPOS',tarifaMes:64.96*248},
  {cargo:'MECANICO',tarifaMes:62.90*248},
  {cargo:'AYUDANTE MECANICO',tarifaMes:36.69*248}],
  tarifasEq:[{id:1,desc:'Camioneta 4 Pasajeros',tarifaSeca:0,tarifaFull:41.39*248,unidad:'MES'}],equipos:[]};
global._ccMatchHH=()=>null;global.hhVentaPeriodo=()=>({filas:[],sinTarifa:[],total:0,nDias:30});
eval(fs.readFileSync(R+'js/atencionRecursos.js','utf8')
 +';global.arCalcular=arCalcular;global._AR_DEF=_AR_DEF;');

let ok=0,mal=0;
const es=(l,g,e)=>{const b=String(g)===String(e);b?ok++:mal++;
  console.log((b?'  OK  ':'  MAL ')+l.padEnd(56)+'= '+g+(b?'':'  (esperado '+e+')'));};
const per={desde:'2026-07-21',hasta:'2026-08-20',dias:31};
const armar=()=>{DB.atencionRecursos=_AR_DEF.map((d,i)=>({id:i+1,...d}));
  DB.atencionRecursos.find(r=>r.nombre==='Camioneta Full').participacion=0.5;};

console.log('\n== El caso de la captura: 0.25 h, 2 mecanicos, 1 ayudante ==');
armar();
const C=arCalcular([{horas:0.25,nMec:2,nAyu:1}],per);
const f=n=>C.filas.find(x=>x.nombre===n);
C.filas.forEach(x=>console.log('   '+x.nombre.padEnd(22)+'cant '+x.cantidad.toFixed(2).padStart(6)
  +'  '+String(x.participacion*100).padStart(3)+'%  cuh '+x.cuh.toFixed(2).padStart(8)+'  = S/ '+x.parcial.toFixed(2).padStart(6)));
es('mecanico 31.45',f('Mecánico').parcial,31.45);
es('ayudante 9.17',f('Ayudante mecánico').parcial,9.17);
const suma=+(f('Mecánico').parcial+f('Ayudante mecánico').parcial).toFixed(2);
es('la suma es 40.62',suma,40.62);
es('el C.U.H. del desgaste ES la suma',f('Desg. de H. Manuales').cuh,40.62);
es('  ya no sale 162.49',f('Desg. de H. Manuales').cuh===162.49,false);
es('el parcial es su 5 %',f('Desg. de H. Manuales').parcial,+(40.62*0.05).toFixed(2));
es('  o sea 2.03',f('Desg. de H. Manuales').parcial,2.03);

console.log('\n== La formula del encabezado sigue cuadrando ==');
const d=f('Desg. de H. Manuales');
es('(1)x(2)x(3)x(4)',+(C.horas*d.cantidad*d.participacion*d.cuh).toFixed(2),d.parcial);
es('  la cantidad compensa las horas',d.cantidad,+(1/0.25).toFixed(2));

console.log('\n== Con otras horas el C.U.H. sigue siendo la suma ==');
[[1,1,0],[2.5,2,1],[8,1,1]].forEach(([h,m,a])=>{
  armar();
  const X=arCalcular([{horas:h,nMec:m,nAyu:a}],per);
  const g=n=>X.filas.find(y=>y.nombre===n);
  const s2=+(g('Mecánico').bruto+g('Ayudante mecánico').bruto).toFixed(2);
  const des=g('Desg. de H. Manuales');
  es(h+' h · C.U.H. = suma ('+s2.toFixed(2)+')',des.cuh,s2);
  es('   parcial = 5 % de la suma',des.parcial,+(s2*0.05).toFixed(2));
  es('   y la formula cuadra',+(X.horas*des.cantidad*des.participacion*des.cuh).toFixed(2),des.parcial);
});

console.log('\n== Sin horas no se cae ==');
armar();
const Z=arCalcular([{horas:0,nMec:0,nAyu:0}],per);
const dz=Z.filas.find(x=>x.nombre==='Desg. de H. Manuales');
es('C.U.H. cero',dz.cuh,0);
es('parcial cero',dz.parcial,0);
es('cantidad 1',dz.cantidad,1);

console.log('\n'+(mal?'X '+mal+' fallo(s)':'OK todo bien')+'  ·  '+ok+'/'+(ok+mal));
process.exit(mal?1:0);
