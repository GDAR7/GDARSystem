const fs=require('fs');
const R='c:/Users/LENOVO/OneDrive/Documents/GitHub/GDARSystem/';
global.localStorage={getItem:()=>null,setItem:()=>{}};
const nodos={arPanel:{id:'arPanel',innerHTML:'',style:{}}};
global.document={getElementById:id=>nodos[id]||null};
global.toast=()=>{};let q=0;global.nidSeguro=()=>++q;
global.supaUpsert=async()=>null;global.supaDelete=async()=>null;
global.DB={atencionRecursos:[],ventaPersonal:[],tarifasEq:[],equipos:[]};
global._ccMatchHH=()=>null;
global.hhVentaPeriodo=()=>({filas:[],sinTarifa:[],total:0,nDias:30});
global._edpDesde='2026-07-21';global._edpHasta='2026-08-20';

const src=fs.readFileSync(R+'js/atencionRecursos.js','utf8')
 +'\n;global.arCalcular=arCalcular;global._AR_DEF=_AR_DEF;global._arListaCalc=_arListaCalc;'
 +'global._arEsDerivado=_arEsDerivado;global._arBaseLista=_arBaseLista;'
 +'global._arOrigenVal=_arOrigenVal;global._arOrigenOpts=_arOrigenOpts;global._arRender=_arRender;';
eval(src);

let ok=0,mal=0;
const es=(l,g,e)=>{const b=String(g)===String(e);b?ok++:mal++;
  console.log((b?'  OK  ':'  MAL ')+l.padEnd(58)+'= '+g+(b?'':'  (esperado '+e+')'));};

// Las tarifas que dan los C.U.H. de la captura con 31 días × 8 h = 248 h
DB.ventaPersonal=[
  {cargo:'ING. SUPERVISOR DE MANTTO DE EQUIPOS',tarifaMes:46.64*248},
  {cargo:'MECANICO',tarifaMes:60.87*248},
  {cargo:'AYUDANTE MECANICO',tarifaMes:34.94*248}
];
DB.tarifasEq=[{id:1,desc:'Camioneta 4 Pasajeros',tarifaSeca:0,tarifaFull:40.06*248,unidad:'MES'}];
const per={desde:'2026-07-21',hasta:'2026-08-20',dias:31};

console.log('\n== El desgaste ya no tiene tarifa propia ==');
const des=_AR_DEF.find(r=>r.nombre==='Desg. de H. Manuales');
es('sale de otros recursos',_arEsDerivado(des),true);
es('  de mecánico y ayudante',_arBaseLista(des).join(' + '),'Mecánico + Ayudante mecánico');
es('ya no usa valor fijo',+des.usaManual,0);
es('  ni los 23.90 de antes',+des.cuhManual,0);
es('sigue al 5 %',des.participacion,0.05);

console.log('\n== El caso de la captura: 1 hora, 2 mecánicos, 1 ayudante ==');
const C=arCalcular([{horas:1,nMec:2,nAyu:1}],per);
const f=n=>C.filas.find(x=>x.nombre===n);
C.filas.forEach(x=>console.log('   '+x.nombre.padEnd(22)+'cant '+x.cantidad.toFixed(2)
  +'  part '+(x.participacion*100)+'%  cuh '+x.cuh.toFixed(2).padStart(8)+'  = S/ '+x.parcial.toFixed(2).padStart(7)));
es('mecánico 121.74',f('Mecánico').parcial,121.74);
es('ayudante 34.94',f('Ayudante mecánico').parcial,34.94);
const suma=+(f('Mecánico').parcial+f('Ayudante mecánico').parcial).toFixed(2);
es('la suma de los dos',suma,156.68);
es('el C.U.H. del desgaste ES esa suma',f('Desg. de H. Manuales').cuh,156.68);
es('  y su parcial es el 5 %',f('Desg. de H. Manuales').parcial,+(suma*0.05).toFixed(2));
es('  o sea 7.83',f('Desg. de H. Manuales').parcial,7.83);
es('el detalle lo explica',/Mecánico \+ Ayudante mecánico = /.test(f('Desg. de H. Manuales').detalle),true);

console.log('\n== La fórmula impresa sigue cuadrando ==');
const d=f('Desg. de H. Manuales');
es('(1)x(2)x(3)x(4)',+(C.horas*d.cantidad*d.participacion*d.cuh).toFixed(2),d.parcial);

console.log('\n== Y con más horas también ==');
const C2=arCalcular([{horas:2.5,nMec:2,nAyu:1}],per);
const g=n=>C2.filas.find(x=>x.nombre===n);
const suma2=+(g('Mecánico').parcial+g('Ayudante mecánico').parcial).toFixed(2);
es('la suma sube con las horas',suma2>suma,true);
es('el desgaste sigue siendo su 5 %',g('Desg. de H. Manuales').parcial,+(suma2*0.05).toFixed(2));
es('  y la fórmula cuadra',
   +(C2.horas*g('Desg. de H. Manuales').cantidad*g('Desg. de H. Manuales').participacion*g('Desg. de H. Manuales').cuh).toFixed(2),
   g('Desg. de H. Manuales').parcial);
es('no se multiplica dos veces por las horas',
   +(g('Desg. de H. Manuales').bruto/d.bruto).toFixed(4),
   +(g('Mecánico').bruto+g('Ayudante mecánico').bruto).toFixed(6)/+(f('Mecánico').bruto+f('Ayudante mecánico').bruto).toFixed(6));

console.log('\n== Cambiar el mecánico arrastra el desgaste ==');
DB.atencionRecursos=_AR_DEF.map((r,i)=>({id:i+1,...r}));
const mec=DB.atencionRecursos.find(r=>r.nombre==='Mecánico');
mec.participacion=0.5;
const C3=arCalcular([{horas:1,nMec:2,nAyu:1}],per);
const h=n=>C3.filas.find(x=>x.nombre===n);
es('el mecánico baja a la mitad',h('Mecánico').parcial,+(121.74/2).toFixed(2));
es('la suma baja con él',h('Desg. de H. Manuales').cuh,+(h('Mecánico').parcial+h('Ayudante mecánico').parcial).toFixed(2));
mec.participacion=1;

console.log('\n== El orden del cuadro no cambia ==');
es('el desgaste sigue al final',C.filas[C.filas.length-1].nombre,'Desg. de H. Manuales');
es('y el orden completo',C.filas.map(x=>x.nombre).join(' · '),
   'Jefe de Equipos · Mecánico · Ayudante mecánico · Camioneta Full · Desg. de H. Manuales');

console.log('\n== Un nombre que no existe se avisa, no se cae ==');
DB.atencionRecursos=[{id:9,nombre:'Raro',participacion:1,cantidad:1,baseDe:'No existe',orden:10}];
const C4=arCalcular([{horas:1,nMec:1,nAyu:0}],per);
es('el C.U.H. queda en cero',C4.filas[0].cuh,0);
es('  y lo dice',/no se encontró/.test(C4.filas[0].detalle),true);

console.log('\n== El selector del panel ==');
DB.atencionRecursos=_AR_DEF.map((r,i)=>({id:i+1,...r}));
const rDes=DB.atencionRecursos.find(r=>r.nombre==='Desg. de H. Manuales');
es('reconoce su origen',_arOrigenVal(rDes),'b:Mecánico;Ayudante mecánico');
const opts=_arOrigenOpts(rDes);
es('ofrece el grupo de sumas',/% de la suma de otros/.test(opts),true);
es('  con la pareja de mano de obra',/value="b:Mecánico;Ayudante mecánico"/.test(opts),true);
es('  y viene marcada',/value="b:Mecánico;Ayudante mecánico" selected/.test(opts),true);
es('un recurso no puede sumarse a sí mismo',/value="b:Desg\. de H\. Manuales"/.test(opts),false);

console.log('\n'+(mal?'X '+mal+' fallo(s)':'OK todo bien')+'  ·  '+ok+'/'+(ok+mal));
process.exit(mal?1:0);
