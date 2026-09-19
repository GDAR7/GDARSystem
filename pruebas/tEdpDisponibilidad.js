// EDP Proveedores · disponibilidad mecánica y horas a pagar.
// Es el número que decide cuánto se le paga a un proveedor y no tenía ninguna
// prueba. Se ejecuta el cálculo real de js/edpProveedores.js.
//
// Caso tomado del EDP de VOL ECOP-001 (Grupo Delope, 21/08 al 20/09/2026):
// 35 partes de 8.5 h = 297.5 h programadas · 66.2 h inoperativas → 77.7 %.
// El período tiene 31 días: los 35 partes salen porque hay días con dos turnos.
const fs=require('fs'),vm=require('vm');
const R='c:/Users/LENOVO/OneDrive/Documents/GitHub/GDARSystem/';
let ok=0,mal=0;
const es=(l,g,e)=>{const b=String(g)===String(e);b?ok++:mal++;
  console.log((b?'  OK  ':'  MAL ')+l.padEnd(60)+'= '+g+(b?'':'  (esperado '+e+')'));};
const f1=v=>(+v).toFixed(1);

// ── Equipo y partes de prueba ───────────────────────────────────────────────
const EQ={id:7,codigo:'VOL ECOP-001',nombre:'Volquete VOLVO FMX 6X4 R',placa:'BLS-845',
  tipo:'Línea Blanca',sub:'VOLQUETE',calentamientoH:0.20,horasMinimas:150,tarifaUn:'HM',tarifa:80};

const partes=[];
let id=1;
// 31 días del período con turno DÍA, más 4 turnos NOCHE: 35 partes en total
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
es('horas por turno, del mismo ajuste del panel',H.hsTurno,8.5);
es('horas programadas = 35 × 8.5',f1(H.horasProg),'297.5');
es('horas inoperativas',f1(H.horasInop),'66.2');
es('NO usa las horas de calendario (31 × 24 = 744)',H.horasProg===744,false);

console.log('\n== Disponibilidad mecánica ==');
es('(297.5 − 66.2) ÷ 297.5',f1(H.dispMec),'77.7');
es('  ya no da el 91.1% del criterio anterior',f1(H.dispMec)==='91.1',false);
es('el mínimo exigido sigue en 85%',ev('_EDP_DISP_MIN'),85);
es('no llega al mínimo',H.cumpleDisp,false);

console.log('\n== Qué se le paga ==');
es('horas efectivas = 27 partes × (3.2 − 0.20)',f1(H.horasEfectivas),f1(27*3));
es('al no cumplir, no se paga el mínimo',f1(H.horasMinimasAPagar),'0.0');
es('  se pagan solo las horas trabajadas',f1(H.horasAPagar),f1(H.horasEfectivas));
es('  y lo dice el motivo',/Disponibilidad mecánica 77\.7% < 85% exigido/.test(H.motivoSinMinimo),true);

console.log('\n== Un equipo que sí cumple ==');
// Sin inoperatividad: 297.5 h programadas, 0 inoperativas → 100%
DB.partes.forEach(p=>{p.im=0;p.condicion='OPERATIVO (TRABAJADO)';p.ef=3.2;});
const H2=ev(`_edpHoras(DB.equipos[0],'2026-08-21','2026-09-20')`);
es('disponibilidad 100%',f1(H2.dispMec),'100.0');
es('  cumple el mínimo',H2.cumpleDisp,true);
es('  y se le paga el mínimo del contrato (150 h)',f1(H2.horasAPagar),'150.0');
es('  completando lo que faltó',f1(H2.horasMinimasAPagar),f1(150-H2.horasEfectivas));

console.log('\n== En el límite del 85% ==');
// 297.5 h programadas · 44.625 h inoperativas = exactamente 85%
DB.partes.forEach((p,i)=>{p.im=i<5?8.925:0;p.condicion=i<5?'INOPERATIVO (FALLA MECANICA)':'OPERATIVO (TRABAJADO)';});
const H3=ev(`_edpHoras(DB.equipos[0],'2026-08-21','2026-09-20')`);
es('justo 85.0%',f1(H3.dispMec),'85.0');
es('  el mínimo se paga (el umbral incluye el 85%)',H3.cumpleDisp,true);

console.log('\n== Sin partes en el período ==');
const H4=ev(`_edpHoras(DB.equipos[0],'2026-07-21','2026-08-20')`);
es('no hay horas programadas',f1(H4.horasProg),'0.0');
es('  la disponibilidad no se castiga sin datos',f1(H4.dispMec),'100.0');

console.log('\n== El documento lo sustenta ==');
const src=fs.readFileSync(R+'js/edpProveedores.js','utf8');
es('el PDF muestra las horas programadas',/HORAS PROGRAMADAS<\/td>/.test(src),true);
es('  y las inoperativas',/HORAS INOPERATIVAS<\/td>/.test(src),true);
es('en pantalla se explica el no pago',/h inoperativas de \$\{_edpN2\(H\.horasProg\)\} h programadas/.test(src),true);
es('ya no queda la base de 24 h',/diasPeriodo\*24/.test(src),false);

console.log('\n'+(mal?'X '+mal+' fallo(s)':'OK todo bien')+'  ·  '+ok+'/'+(ok+mal));
process.exit(mal?1:0);
