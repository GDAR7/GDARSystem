// Dashboard de Equipos · pestaña Flota (una fila por equipo).
// Mismas reglas del Calendario: LA/LB en horas, Vehículo Menor en km,
// Equipos Menores en operatividad. «Todos» = LA + LB.
const fs=require('fs'),vm=require('vm');
const R='c:/Users/LENOVO/OneDrive/Documents/GitHub/GDARSystem/';
let ok=0,mal=0;
const es=(l,g,e)=>{const b=String(g)===String(e);b?ok++:mal++;
  console.log((b?'  OK  ':'  MAL ')+l.padEnd(62)+'= '+g+(b?'':'  (esperado '+e+')'));};

const AHORA=new Date(2026,9,10,12).getTime();
class Reloj extends Date{constructor(...a){if(a.length===0)super(AHORA);else super(...a);}static now(){return AHORA;}}

const E=(id,codigo,tipo,sub,est)=>({id,codigo,nombre:codigo+' prueba',tipo,sub,est:est||'Operativo'});
const DB={equipos:[
  E(1,'EXC ECOP-010','Línea Amarilla','Excavadora'),
  E(2,'EXC ECOP-002','Línea Amarilla','Excavadora'),
  E(3,'MOT ECOP-002','Línea Amarilla','Motoniveladora'),
  E(4,'VOL ECOP-001','Línea Blanca','Volquete'),
  E(5,'CAM ECOP-001','Vehículo Menor','Camioneta'),
  E(6,'GEN ECOP-001','Equipos Menores','Generador'),
  E(7,'EXC VIEJA','Línea Amarilla','Excavadora','Desmovilizado')
],partes:[]};
let pid=1;
const P=(eqId,fecha,o)=>DB.partes.push({id:pid++,eqId,fecha,turno:'DIA',ef:0,im:0,condicion:'OPERATIVO (TRABAJADO)',...o});
// EXC-002: 2 días; uno sobre la meta de 8.5 h y otro bajo
P(2,'2026-09-22',{ef:10});P(2,'2026-09-23',{ef:6,im:2});
// EXC-010: un día de 9 h
P(1,'2026-09-22',{ef:9});
// MOT: trabaja y falla, luego inoperativa
P(3,'2026-09-22',{ef:1.2,im:7,condicion:'INOPERATIVO (FALLA MECANICA)'});
P(3,'2026-09-23',{ef:0,im:8.5,condicion:'INOPERATIVO (FALLA MECANICA)'});
// Volquete: dos turnos el mismo día
P(4,'2026-09-22',{ef:8});P(4,'2026-09-22',{ef:7,turno:'NOCHE'});
// Camioneta: km
P(5,'2026-09-22',{kmRec:120});P(5,'2026-09-23',{kmRec:80,condicion:'INOPERATIVO (FALLA MECANICA)'});
// Generador: 2 días operativo, 1 inoperativo
P(6,'2026-09-22',{});P(6,'2026-09-23',{condicion:'OPERATIVO (STANDBY)'});P(6,'2026-09-24',{condicion:'INOPERATIVO (FALLA MECANICA)'});

const nodos={};const nodo=id=>nodos[id]||(nodos[id]={innerHTML:'',style:{}});
const ctx=vm.createContext({DB,console,Date:Reloj,Math,Number,String,Object,Array,JSON,Set,isFinite,
  document:{getElementById:nodo},window:{},localStorage:{getItem:()=>null},_phHsProgTurno:()=>8.5,buscarFoco(){}});
['reportesEquipos','dashEquiposCal','dashEquiposFlota'].forEach(f=>
  vm.runInContext(fs.readFileSync(R+'js/'+f+'.js','utf8'),ctx,{filename:f}));
const ev=x=>vm.runInContext(x,ctx);
const datos=(tipo,sub,eqId)=>{ctx.__c={tipo,sub,eqId};return ev(`(()=>{const per=_deqPeriodo();
  const eqById=id=>DB.equipos.find(e=>e.id===id);
  const partes=DB.partes.filter(p=>p.fecha>=per.desde&&p.fecha<=per.hasta);
  return _dqfDatos({partes,per,tipo:__c.tipo,sub:__c.sub,eqId:__c.eqId,eqById});})()`);};
const fila=(D,cod)=>D.filas.find(r=>r.eq.codigo===cod);

console.log('\n== Quién aparece ==');
let D=datos(null,null,null);
es('Todos = Línea Amarilla + Línea Blanca',D.filas.map(r=>r.eq.tipo).every(t=>t==='Línea Amarilla'||t==='Línea Blanca'),true);
es('  los cuatro de esas líneas',D.filas.length,4);
es('el desmovilizado sin partes no aparece',D.filas.some(r=>r.eq.codigo==='EXC VIEJA'),false);
es('ordenados por código, con el número bien',D.filas.map(r=>r.eq.codigo).join(','),
  'EXC ECOP-002,EXC ECOP-010,MOT ECOP-002,VOL ECOP-001');
es('la meta diaria es la del ⚙ del panel',D.meta,8.5);

console.log('\n== Línea Amarilla en horas ==');
let r=fila(D,'EXC ECOP-002');
es('EXC-002 suma 10 + 6',r.total,16);
es('  y 2 h inoperativas',r.im,2);
es('  disponibilidad 16 ÷ 18',r.disp.toFixed(1),(16/18*100).toFixed(1));
es('  promedio 8 h por día con parte',r.prom,8);
es('  cumplió la meta 1 de 2 días',r.cump,50);
r=fila(D,'VOL ECOP-001');
es('dos turnos el mismo día se suman',r.dia['2026-09-22'].v,15);
r=fila(D,'MOT ECOP-002');
es('la motoniveladora: día con horas y falla',r.dia['2026-09-22'].v+' ino:'+r.dia['2026-09-22'].ino,'1.2 ino:1');
es('  día sin horas e inoperativa',r.dia['2026-09-23'].v+' ino:'+r.dia['2026-09-23'].ino,'0 ino:1');
es('  días inoperativos',r.diasInop,2);

console.log('\n== Vehículo Menor en km ==');
D=datos('Vehículo Menor',null,null);
r=fila(D,'CAM ECOP-001');
es('suma los km',r.total,200);
es('  promedio por día',r.prom,100);
es('  y cuenta el día inoperativo',r.diasInop,1);
es('no trae columnas de horas',r.disp===undefined&&r.cump===undefined,true);

console.log('\n== Equipos Menores en operatividad ==');
D=datos('Equipos Menores',null,null);
r=fila(D,'GEN ECOP-001');
es('3 días con parte',r.conParte,3);
es('  2 operativos (el stand-by cuenta)',r.op,2);
es('  1 inoperativo',r.inop,1);
es('  operatividad 67%',Math.round(r.oper),67);

console.log('\n== Filtros, orden y búsqueda ==');
D=datos('Línea Amarilla','EXCAVADORA',null);
es('el subtipo deja solo las excavadoras',D.filas.map(r=>r.eq.codigo).join(','),'EXC ECOP-002,EXC ECOP-010');
D=datos('Línea Amarilla',null,3);
es('el equipo de los chips deja solo ese',D.filas.map(r=>r.eq.codigo).join(','),'MOT ECOP-002');
ev("_dqfOrden='total';_dqfDesc=true");
D=datos(null,null,null);
es('ordenar por horas, de mayor a menor',D.filas[0].eq.codigo,'EXC ECOP-002');
ev("_dqfOrden='codigo';_dqfDesc=false;_dqfQ='volq'");
D=datos(null,null,null);
es('buscar por subtipo',D.filas.map(r=>r.eq.codigo).join(','),'VOL ECOP-001');
ev("_dqfQ=''");

console.log('\n== La pestaña ==');
ev("_deqVista='flota';_deqTipo=null;_deqSub=null;_deqEqId=null;rDashEquipos()");
let H=nodos['page-dashEquipos'].innerHTML;
es('hay tres pestañas',/📊 Resumen/.test(H)&&/📅 Calendario/.test(H)&&/🚜 Flota/.test(H),true);
es('la tabla aclara LA + LB',/Línea Amarilla \+ Línea Blanca/.test(H),true);
es('la columna de cumplimiento usa la meta',/Cumpl\. 8\.5 h/.test(H),true);
es('la franja marca el día con falla',/22\/09: 1\.2 h \/\/ INO/.test(H),true);
es('  y el día inoperativo sin horas',/23\/09: INO/.test(H),true);
es('sin elegir, muestra la atención del corte',/Atención del corte/.test(H),true);
ev('_dqfSelEq(3)');
H=nodos['page-dashEquipos'].innerHTML;
es('tocar una fila abre su detalle',/🚜 MOT ECOP-002/.test(H),true);
es('  con el día de falla «1.2 / INO»',/>1\.2<\/span><br><span style="color:#ef4444;font-weight:900">INO</.test(H),true);
ev('_dqfSelEq(3)');
es('  tocarla de nuevo lo cierra',/Atención del corte/.test(nodos['page-dashEquipos'].innerHTML),true);
ev("_deqTipo='Equipos Menores';rDashEquipos()");
H=nodos['page-dashEquipos'].innerHTML;
es('Equipos Menores muestra operatividad',/Operatividad diaria/.test(H)&&/>Operatividad</.test(H),true);
es('ninguna celda rota',/NaN|undefined/.test(H),false);
ev("_deqSetVista('resumen')");
es('Resumen sigue como antes',/Horas por Equipo/.test(nodos['page-dashEquipos'].innerHTML),true);

console.log('\n== Enganche ==');
const html=fs.readFileSync(R+'index.html','utf8');
es('carga después del Calendario, del que reutiliza reglas',
  html.indexOf('js/dashEquiposFlota.js')>html.indexOf('js/dashEquiposCal.js'),true);

console.log('\n'+(mal?'X '+mal+' fallo(s)':'OK todo bien')+'  ·  '+ok+'/'+(ok+mal));
process.exit(mal?1:0);
