// Mantenimiento · Disponibilidad y KPIs de Flota (Fase 1).
// Se cargan los módulos reales: Corte de Equipos (de donde sale la
// disponibilidad) y flotaKpi. Corte 21/08 al 20/09/2026, 8.5 h por turno.
const fs=require('fs'),vm=require('vm');
const R='c:/Users/LENOVO/OneDrive/Documents/GitHub/GDARSystem/';
let ok=0,mal=0;
const es=(l,g,e)=>{const b=String(g)===String(e);b?ok++:mal++;
  console.log((b?'  OK  ':'  MAL ')+l.padEnd(62)+'= '+g+(b?'':'  (esperado '+e+')'));};
const f1=v=>v==null?'null':(+v).toFixed(1);

const P=[];let pid=1;
const parte=(eqId,fecha,ef,im,cond)=>P.push({id:pid++,eqId,fecha,ef,im,turno:'DIA',hrIni:0,hrFin:0,
  condicion:cond||(im?'INOPERATIVO (FALLA MECANICA)':'OPERATIVO (TRABAJADO)'),act:'',observaciones:''});
// EXC: 10 turnos · 6 h efectivas c/u · 2 turnos con 4 h inoperativas
for(let i=0;i<10;i++)parte(1,'2026-08-'+String(22+i).padStart(2,'0'),6,i<2?4:0);
// VOL: 4 turnos · 8 h · uno en stand-by (0 h trabajadas)
parte(2,'2026-09-01',8,0);parte(2,'2026-09-02',8,0);parte(2,'2026-09-03',8,0);
parte(2,'2026-09-04',0,0,'OPERATIVO (STANDBY)');

const DB={
  equipos:[
    {id:1,codigo:'EXC ECOP-003',tipo:'Línea Amarilla',sub:'Excavadora',est:'Operativo',proyecto:'EPY-004-26',hrsMinVenta:200},
    {id:2,codigo:'VOL ECOP-001',tipo:'Línea Blanca',sub:'Volquete',est:'Operativo',proyecto:'EPY-004-26',hrsMinVenta:0},
    {id:3,codigo:'CAM ECOP-001',tipo:'Vehículo Menor',sub:'Camioneta',est:'Operativo',proyecto:'EPY-004-26',hrsMinVenta:100},
    {id:4,codigo:'EXC OTRO',tipo:'Línea Amarilla',sub:'Excavadora',est:'Operativo',proyecto:'EPY-001-26',hrsMinVenta:200},
    {id:5,codigo:'MOT VIEJA',tipo:'Línea Amarilla',sub:'Motoniveladora',est:'Desmovilizado',proyecto:'EPY-004-26',hrsMinVenta:180}
  ],
  partes:P,
  auxiliosMecanicos:[
    {id:1,eqId:1,fecha:'2026-08-22',tipo:'Neumático',tipoInt:'Correctiva no planificada',tiempoParada:2,est:'Atendido',cod:'AUX-1'},
    {id:2,eqId:1,fecha:'2026-08-25',tipo:'Neumático',tipoInt:'Correctiva no planificada',tiempoParada:1,est:'Atendido',cod:'AUX-2'},
    {id:3,eqId:1,fecha:'2026-08-27',tipo:'Eléctrico',tipoInt:'Correctiva no planificada',tiempoParada:null,est:'Atendido',cod:'AUX-3'},
    {id:4,eqId:1,fecha:'2026-08-28',tipo:'Hidráulico',tipoInt:'Preventiva en campo',tiempoParada:1,est:'Atendido',cod:'AUX-4'},
    {id:5,eqId:2,fecha:'2026-09-02',tipo:'Otros',tipoInt:'Asistencia operativa',tiempoParada:0.5,est:'Atendido',cod:'AUX-5'},
    {id:6,eqId:1,fecha:'2026-08-29',tipo:'Neumático',tipoInt:'Correctiva no planificada',tiempoParada:3,est:'Anulado',cod:'AUX-6'},
    {id:7,eqId:2,fecha:'2026-09-05',tipo:'Eléctrico',tipoInt:'Correctiva no planificada',tiempoParada:1,est:'En proceso',cod:'AUX-7'}
  ],
  auxMecInsumos:[
    {id:1,auxilioId:1,cod:'INS-1',cant:2},   // 2 × S/ 50
    {id:2,auxilioId:2,cod:'INS-2',cant:1},   // sin precio en el catálogo
    {id:3,auxilioId:6,cod:'INS-1',cant:9}    // de un auxilio anulado: no cuenta
  ],
  catalogoItems:[{cod:'INS-1',pur:50},{cod:'INS-2',pur:0}],
  proyectos:[{codigo:'EPY-004-26',nombre:'RELAVERA R3'},{codigo:'EPY-001-26',nombre:'VÍAS'}]
};

// Reloj fijo en el corte de setiembre 2026
let AHORA=Date.parse('2026-09-15T12:00:00-05:00');
class Reloj extends Date{constructor(...a){if(a.length===0)super(AHORA);else super(...a);}static now(){return AHORA;}}
const nodos={};const nodo=id=>nodos[id]||(nodos[id]={innerHTML:'',value:'',style:{},getContext:()=>({})});
let charts=[];
function Chart(c,cfg){charts.push(cfg);this.destroy=()=>{};}
const ctx=vm.createContext({DB,console,Date:Reloj,Math,Number,String,Object,Array,JSON,Set,isFinite,Chart,
  document:{getElementById:nodo,querySelector:()=>null,querySelectorAll:()=>[],addEventListener(){},
    createElement:()=>({style:{},getContext:()=>({})})},
  localStorage:{getItem:()=>null,setItem(){}},window:{open:()=>null},toast(){},prompt:()=>null});
vm.runInContext(fs.readFileSync(R+'js/corteEquipos.js','utf8'),ctx,{filename:'corteEquipos.js'});
vm.runInContext(fs.readFileSync(R+'js/flotaKpi.js','utf8'),ctx,{filename:'flotaKpi.js'});
vm.runInContext('_phHsProgTurno=()=>8.5',ctx);
const ev=x=>vm.runInContext(x,ctx);
const D=ev('_fkDatos()');
const fila=c=>D.filas.find(r=>r.eq.codigo===c);
const E=fila('EXC ECOP-003'), V=fila('VOL ECOP-001');

console.log('\n== El corte y quiénes entran ==');
es('corte setiembre: 21/08 al 20/09',D.per.desde+' al '+D.per.hasta,'2026-08-21 al 2026-09-20');
es('solo Línea Amarilla y Blanca del proyecto 04',D.filas.map(r=>r.eq.codigo).join(','),'EXC ECOP-003,VOL ECOP-001');
es('  no entra la camioneta (vehículo menor)',!!fila('CAM ECOP-001'),false);
es('  ni la excavadora de otro proyecto',!!fila('EXC OTRO'),false);
es('  ni el desmovilizado sin partes en el corte',!!fila('MOT VIEJA'),false);

console.log('\n== Horas de la excavadora ==');
es('10 turnos × 8.5 h = 85 h programadas',f1(E.hProg),'85.0');
es('60 h operativas',f1(E.hOper),'60.0');
es('8 h inoperativas',f1(E.im),'8.0');

console.log('\n== Disponibilidad: la de Corte de Equipos ==');
es('(200 − 8) ÷ 200 = 96%',f1(E.dm),'96.0');
ctx.__e=DB.equipos[0];ctx.__p=D.per;
es('  idéntica a Corte de Equipos',f1(E.dm),f1(ev('_ceDatos(__e,__p)').dispMec));
es('el volquete no tiene Hrs Mín. Venta: sin base',V.sinBase+'|'+V.dm,'true|null');

console.log('\n== Utilización y uso productivo ==');
es('Utilización = 60 ÷ (85 − 8)',f1(E.util),f1(60/77*100));
es('Uso productivo = 60 ÷ 85',f1(E.uso),f1(60/85*100));

console.log('\n== Stand-by ==');
es('el turno en stand-by del volquete: 8.5 h',f1(V.standby),'8.5');
es('la excavadora no tiene',f1(E.standby),'0.0');

console.log('\n== Fallas, MTBF y MTTR ==');
es('fallas: solo las correctivas no planificadas, sin anuladas',E.nFallas,3);
es('  la preventiva no es falla',E.nAux,4);
es('MTBF = 60 h ÷ 3 fallas',f1(E.mtbf),'20.0');
es('MTTR = (2 + 1) ÷ 2 fallas con tiempo',f1(E.mttr),'1.5');
es('  la falla sin tiempo no baja el MTTR a la fuerza',E.nConT,2);

console.log('\n== Costo de repuestos ==');
es('2 × S/ 50 del auxilio 1',E.costo,100);
es('  el insumo sin precio se avisa',E.sinPrecio,1);
es('  el anulado no suma',E.costo<550,true);

console.log('\n== Totales de la flota ==');
const T=D.total;
es('disponibilidad ponderada: solo cuentan los con base',f1(T.dm),'96.0');
es('  y lo dice',T.conBase+' de '+T.n,'1 de 2');
es('H. programadas: (10 + 4) × 8.5',f1(T.hProg),'119.0');
es('fallas de la flota: 3 + 1 del volquete',T.nFallas,4);

console.log('\n== Pareto por sistema ==');
es('sin la asistencia operativa ni el anulado',D.pareto.map(p=>p.sistema+' '+p.eventos).join(' | '),
  'Neumático 2 | Eléctrico 2 | Hidráulico 1');
es('el acumulado cierra en 100%',f1(D.pareto[D.pareto.length-1].pctAcum),'100.0');

console.log('\n== Alertas ==');
es('el auxilio en proceso es una alerta',D.alertas.some(a=>a.tipo==='abierto'&&a.aux.cod==='AUX-7'),true);
es('uso productivo bajo la meta de 85%',D.alertas.some(a=>a.tipo==='uso'&&a.eq.codigo==='EXC ECOP-003'),true);
es('la disponibilidad de 96% no alerta (meta 90%)',D.alertas.some(a=>a.tipo==='dm'),false);

console.log('\n== Filtro por tipo y por proyecto ==');
ev('_fkSetTipo("Línea Blanca")');
es('solo Línea Blanca',ev('_fkDatos().filas.map(r=>r.eq.codigo).join(",")'),'VOL ECOP-001');
ev('_fkSetTipo("Línea Blanca")');
es('tocarla de nuevo vuelve a las dos líneas',ev('_fkDatos().filas.length'),2);
ev('_fkSetProy("EPY-001-26")');
es('otro proyecto, otros equipos',ev('_fkDatos().filas.map(r=>r.eq.codigo).join(",")'),'EXC OTRO');
ev('_fkSetProy("EPY-004-26")');

console.log('\n== La pantalla ==');
charts=[];ev('rFlotaKpi()');
const H=nodo('page-flotaKpi').innerHTML;
es('se dibuja',H.length>1000,true);
es('arranca en el proyecto 04',/value="EPY-004-26" selected/.test(H),true);
es('chips solo de Línea Amarilla y Blanca',/>Línea Amarilla </.test(H)&&/>Línea Blanca </.test(H)&&!/Vehículo Menor <span/.test(H),true);
es('seis KPIs',(H.match(/class="kpi"/g)||[]).length,6);
es('el gráfico de Pareto con su % acumulado',charts.length===1&&charts[0].data.datasets[1].label,'% acumulado');
es('ninguna celda rota',/undefined|NaN/.test(H),false);

console.log('\n== Enganche ==');
const cfg=fs.readFileSync(R+'js/config.js','utf8'),uti=fs.readFileSync(R+'js/utils.js','utf8'),html=fs.readFileSync(R+'index.html','utf8');
es('el módulo está en Mantenimiento',/key:'flotaKpi',label:'Disponibilidad y KPIs'/.test(cfg),true);
es('el router lo dibuja',/flotaKpi:rFlotaKpi/.test(uti),true);
es('index tiene su página y su script',/id="page-flotaKpi"/.test(html)&&/js\/flotaKpi\.js\?v=/.test(html),true);
es('no crea tablas: no hay SQL nuevo',fs.existsSync(R+'sql/flota_kpi.sql'),false);

console.log('\n'+(mal?'X '+mal+' fallo(s)':'OK todo bien')+'  ·  '+ok+'/'+(ok+mal));
process.exit(mal?1:0);
