// EDP Proveedores · disponibilidad mecánica y horas a pagar.
// Es el número que decide cuánto se le paga a un proveedor. Se ejecuta el
// cálculo real de js/edpProveedores.js.
//
// La base es «Hrs Mín. Venta» del Máster — las horas que el equipo se
// comprometió a dar al CLIENTE en el mes — y NO las horas de calendario ni las
// programadas. Es la misma base que usa Corte de Equipos, para que los dos
// módulos den el mismo porcentaje del mismo equipo.
//
// Caso tomado de VOL ECOP-001 (21/08 al 20/09/2026): 66.2 h inoperativas
// contra 300 h mínimas del cliente → 77.9 %, por debajo del 85 % exigido.
const fs=require('fs'),vm=require('vm');
const R='c:/Users/LENOVO/OneDrive/Documents/GitHub/GDARSystem/';
let ok=0,mal=0;
const es=(l,g,e)=>{const b=String(g)===String(e);b?ok++:mal++;
  console.log((b?'  OK  ':'  MAL ')+l.padEnd(60)+'= '+g+(b?'':'  (esperado '+e+')'));};
const f1=v=>(+v).toFixed(1);

// ── Equipo y partes de prueba ───────────────────────────────────────────────
// hrsMinVenta = mínimo con el CLIENTE (base de la disponibilidad)
// horasMinimas = mínimo con el PROVEEDOR (lo que se le paga si cumple)
const EQ={id:7,codigo:'VOL ECOP-001',nombre:'Volquete VOLVO FMX 6X4 R',placa:'BLS-845',
  tipo:'Línea Blanca',sub:'VOLQUETE',calentamientoH:0.20,horasMinimas:150,hrsMinVenta:300,
  tarifaUn:'HM',tarifa:80};

const partes=[];
let id=1;
const turnos=[];
for(let i=0;i<31;i++){
  const d=new Date(2026,7,21);d.setDate(d.getDate()+i);
  turnos.push({iso:d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'),turno:'DIA'});
}
for(let i=0;i<4;i++)turnos.push({iso:turnos[i].iso,turno:'NOCHE'});
// Los 8 primeros salen inoperativos: 7 de 8.5 h y uno de 6.7 h = 66.2 h
turnos.forEach((t,i)=>{
  const inop=i<8;
  const im=inop?(i<7?8.5:6.7):0;
  partes.push({id:id++,eqId:EQ.id,fecha:t.iso,turno:t.turno,ef:inop?0:3.2,im,
    condicion:inop?'INOPERATIVO (FALLA MECANICA)':'OPERATIVO (TRABAJADO)',
    act:'Traslado de material',observaciones:'',valoriza:'Ambos'});
});

const DB={equipos:[EQ],partes,edpProveedores:[],proyectos:[],tramos:[],personal:[],tareaje:[]};
const ctx=vm.createContext({
  DB,console,Date,Math,Number,String,Object,Array,JSON,Set,Map,isFinite,parseFloat,parseInt,
  localStorage:{getItem:k=>k==='gdar_ph_hsprog'?'8.5':null,setItem(){},removeItem(){}},
  document:{getElementById:()=>null,querySelector:()=>null,querySelectorAll:()=>[],
    createElement:()=>({style:{},dataset:{},appendChild(){}}),addEventListener(){},body:{appendChild(){}}},
  window:{location:{href:'https://ecosermo.gdarei.com/index.html'},open:()=>null,addEventListener(){}},
  location:{href:'https://ecosermo.gdarei.com/index.html'},
  EMPRESA:{nombre:'ECOSERMO',logo:'img/logo.png'},
  toast(){},confirm:()=>true,CU:{nombre:'Prueba'},
  supaUpsert:async()=>null,supaDelete:async()=>{},nidSeguro:()=>1,
  openM(){},closeM(){},fmt:v=>String(v),today:()=>'2026-09-20'
});
vm.runInContext(fs.readFileSync(R+'js/edpProveedores.js','utf8'),ctx,{filename:'edpProveedores.js'});
const ev=x=>vm.runInContext(x,ctx);
const H=ev(`_edpHoras(DB.equipos[0],'2026-08-21','2026-09-20')`);

console.log('\n== La base del cálculo ==');
es('toma los 35 partes del período',H.dias.length,35);
es('  en 31 días de calendario',H.diasPeriodo,31);
es('la base son las Hrs Mín. Venta del Máster',H.baseDisp,300);
es('  no el mínimo del proveedor (150 h)',H.baseDisp===EQ.horasMinimas,false);
es('  ni las horas de calendario (31 × 24 = 744)',H.baseDisp===744,false);
es('  ni las programadas (35 × 8.5 = 297.5)',H.baseDisp===297.5,false);
es('horas inoperativas',f1(H.horasInop),'66.2');
es('la base es medible',H.sinBaseDisp,false);

console.log('\n== Disponibilidad mecánica ==');
es('(300 − 66.2) ÷ 300',f1(H.dispMec),f1((300-66.2)/300*100));
es('  ya no da el 91.1% del criterio de calendario',f1(H.dispMec)==='91.1',false);
es('el mínimo exigido sigue en 85%',ev('_EDP_DISP_MIN'),85);
es('no llega al mínimo',H.cumpleDisp,false);

console.log('\n== Qué se le paga ==');
es('horas efectivas = 27 partes × (3.2 − 0.20)',f1(H.horasEfectivas),f1(27*3));
es('al no cumplir, no se paga el mínimo',f1(H.horasMinimasAPagar),'0.0');
es('  se pagan solo las horas trabajadas',f1(H.horasAPagar),f1(H.horasEfectivas));
es('  y lo dice el motivo',/Disponibilidad mecánica 77\.9% < 85% exigido/.test(H.motivoSinMinimo),true);

console.log('\n== Un equipo que sí cumple ==');
DB.partes.forEach(p=>{p.im=0;p.condicion='OPERATIVO (TRABAJADO)';p.ef=3.2;});
const H2=ev(`_edpHoras(DB.equipos[0],'2026-08-21','2026-09-20')`);
es('sin inoperatividad, disponibilidad 100%',f1(H2.dispMec),'100.0');
es('  cumple el mínimo',H2.cumpleDisp,true);
es('  y se le paga el mínimo del CONTRATO CON EL PROVEEDOR (150 h)',f1(H2.horasAPagar),'150.0');
es('  completando lo que faltó',f1(H2.horasMinimasAPagar),f1(150-H2.horasEfectivas));

console.log('\n== En el límite del 85% ==');
// 300 h de base · 45 h inoperativas = exactamente 85%
DB.partes.forEach((p,i)=>{p.im=i<5?9:0;p.condicion=i<5?'INOPERATIVO (FALLA MECANICA)':'OPERATIVO (TRABAJADO)';});
const H3=ev(`_edpHoras(DB.equipos[0],'2026-08-21','2026-09-20')`);
es('justo 85.0%',f1(H3.dispMec),'85.0');
es('  el mínimo se paga (el umbral incluye el 85%)',H3.cumpleDisp,true);

console.log('\n== Sin Hrs Mín. Venta en el Máster ==');
// Es el agujero que abriría la base: sin ella no hay contra qué medir, y un
// equipo con 200 h de falla no puede salir "100% disponible" y cobrar.
DB.equipos[0].hrsMinVenta=0;
DB.partes.forEach((p,i)=>{p.im=i<8?8.5:0;p.condicion=i<8?'INOPERATIVO (FALLA MECANICA)':'OPERATIVO (TRABAJADO)';});
const H4=ev(`_edpHoras(DB.equipos[0],'2026-08-21','2026-09-20')`);
es('se marca como no evaluable',H4.sinBaseDisp,true);
es('  no se inventa un 100%',f1(H4.dispMec),'0.0');
es('  no se da por cumplida',H4.cumpleDisp,false);
es('  el mínimo no se paga',f1(H4.horasMinimasAPagar),'0.0');
es('  y el motivo dice qué falta',/Falta Hrs Mín\. Venta en el Máster/.test(H4.motivoSinMinimo),true);
DB.equipos[0].hrsMinVenta=300;

console.log('\n== Sin partes en el período ==');
const H5=ev(`_edpHoras(DB.equipos[0],'2026-07-21','2026-08-20')`);
es('no hay horas inoperativas',f1(H5.horasInop),'0.0');
es('  la disponibilidad no se castiga sin datos',f1(H5.dispMec),'100.0');

console.log('\n== El documento lo sustenta ==');
const src=fs.readFileSync(R+'js/edpProveedores.js','utf8');
es('el PDF muestra la base del cálculo',/HORAS MÍNIMAS CLIENTE<\/td>/.test(src),true);
es('  y las horas inoperativas',/HORAS INOPERATIVAS<\/td>/.test(src),true);
es('en pantalla se explica el no pago',/h inoperativas de \$\{_edpN2\(H\.baseDisp\)\} h mínimas del cliente/.test(src),true);
es('ya no queda la base de 24 h',/diasPeriodo\*24/.test(src),false);
es('  ni la de horas programadas',/\(horasProg-horasInop\)\/horasProg/.test(src),false);

console.log('\n== Los dos módulos miden igual ==');
const ce=fs.readFileSync(R+'js/corteEquipos.js','utf8');
es('Corte de Equipos ya no usa el calendario',/per\.dias\*24/.test(ce),false);
es('  usa las horas mínimas del cliente',/const baseDisp=hminMes/.test(ce),true);
es('  y hminMes sale de Hrs Mín. Venta',/const hminMes=\+eq\.hrsMinVenta/.test(ce),true);
es('EDP usa la misma base',/const baseDisp=\+eq\.hrsMinVenta/.test(src),true);
es('los dos exigen el mismo 85%',ev('_EDP_DISP_MIN')===+(ce.match(/_CE_DISP_MIN=(\d+)/)||[])[1],true);

console.log('\n'+(mal?'X '+mal+' fallo(s)':'OK todo bien')+'  ·  '+ok+'/'+(ok+mal));
process.exit(mal?1:0);
