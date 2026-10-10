// Dashboard de Equipos · pestaña Calendario.
// Cada tipo con su métrica: Línea Amarilla/Blanca en horas, Vehículo Menor en
// km, Equipos Menores en operatividad diaria. «Todos» = LA + LB en horas.
const fs=require('fs'),vm=require('vm');
const R='c:/Users/LENOVO/OneDrive/Documents/GitHub/GDARSystem/';
let ok=0,mal=0;
const es=(l,g,e)=>{const b=String(g)===String(e);b?ok++:mal++;
  console.log((b?'  OK  ':'  MAL ')+l.padEnd(62)+'= '+g+(b?'':'  (esperado '+e+')'));};

// Reloj fijo: el corte en curso es 21/09 → 20/10/2026
const AHORA=new Date(2026,9,9,12).getTime();
class Reloj extends Date{constructor(...a){if(a.length===0)super(AHORA);else super(...a);}static now(){return AHORA;}}

const E=(id,codigo,tipo,sub)=>({id,codigo,tipo,sub,est:'Operativo'});
const DB={equipos:[
  E(1,'EXC ECOP-002','Línea Amarilla','Excavadora'),
  E(2,'EXC ECOP-010','Línea Amarilla','Excavadora'),
  E(3,'TRA ECOP-001','Línea Amarilla','Tractor Oruga'),
  E(4,'VOL ECOP-001','Línea Blanca','Volquete'),
  E(5,'CAM ECOP-001','Vehículo Menor','Camioneta'),
  E(6,'GEN ECOP-001','Equipos Menores','Generador'),
  E(7,'LUM ECOP-001','Equipos Menores','Luminaria')
],partes:[]};
let pid=1;
const P=(eqId,fecha,o)=>DB.partes.push({id:pid++,eqId,fecha,turno:'DIA',ef:0,im:0,condicion:'OPERATIVO (TRABAJADO)',...o});
// 22/09: tres partes de Línea Amarilla y uno de Línea Blanca
P(1,'2026-09-22',{ef:8});P(2,'2026-09-22',{ef:6});P(3,'2026-09-22',{ef:5});
P(4,'2026-09-22',{ef:10});P(4,'2026-09-22',{ef:7,turno:'NOCHE'});
// 23/09: solo la excavadora 002
P(1,'2026-09-23',{ef:9});
// Camioneta: km por recorrido registrado y, si falta, por inicio y fin
P(5,'2026-09-22',{kmRec:120});P(5,'2026-09-23',{kmIni:1000,kmFin:1085});
// Equipos menores: el 22 los dos operativos (uno en stand-by), el 23 uno inoperativo
P(6,'2026-09-22',{condicion:'OPERATIVO (TRABAJADO)'});P(7,'2026-09-22',{condicion:'OPERATIVO (STANDBY)'});
P(6,'2026-09-23',{condicion:'OPERATIVO (TRABAJADO)'});P(7,'2026-09-23',{condicion:'INOPERATIVO (FALLA MECANICA)'});
// Fuera del corte: no cuenta
P(1,'2026-09-15',{ef:50});

const nodos={};const nodo=id=>nodos[id]||(nodos[id]={innerHTML:'',style:{}});
const ctx=vm.createContext({DB,console,Date:Reloj,Math,Number,String,Object,Array,JSON,Set,isFinite,
  document:{getElementById:nodo,querySelector:()=>null,querySelectorAll:()=>[],addEventListener(){}},
  window:{},localStorage:{getItem:()=>null}});
vm.runInContext(fs.readFileSync(R+'js/reportesEquipos.js','utf8'),ctx,{filename:'reportesEquipos.js'});
vm.runInContext(fs.readFileSync(R+'js/dashEquiposCal.js','utf8'),ctx,{filename:'dashEquiposCal.js'});
const ev=x=>vm.runInContext(x,ctx);
const datos=(tipo,sub,eqId)=>{ctx.__c={tipo,sub,eqId};return ev(`(()=>{const per=_deqPeriodo();
  const eqById=id=>DB.equipos.find(e=>e.id===id);
  const partes=DB.partes.filter(p=>p.fecha>=per.desde&&p.fecha<=per.hasta).filter(p=>{
    const e=eqById(p.eqId);if(__c.eqId)return p.eqId===__c.eqId;
    if(__c.sub)return e.tipo===__c.tipo&&String(e.sub).toUpperCase()===__c.sub;
    if(__c.tipo)return e.tipo===__c.tipo;return true;});
  return _dqcDatos({partes,per,tipo:__c.tipo,sub:__c.sub,eqId:__c.eqId,eqById});})()`);};

console.log('\n== Qué se mide en cada tipo ==');
es('Línea Amarilla en horas',ev("_dqcModo('Línea Amarilla')"),'horas');
es('Línea Blanca en horas',ev("_dqcModo('Línea Blanca')"),'horas');
es('Vehículo Menor en km',ev("_dqcModo('Vehículo Menor')"),'km');
es('Equipos Menores en operatividad',ev("_dqcModo('Equipos Menores')"),'oper');
es('Todos en horas',ev('_dqcModo(null)'),'horas');

console.log('\n== Todos = Línea Amarilla + Línea Blanca ==');
let D=datos(null,null,null);
es('el 22/09 suma 8+6+5 de LA y 10+7 de LB',D.map['2026-09-22'].v,36);
es('  repartido por línea',JSON.stringify(D.map['2026-09-22'].g),JSON.stringify({'Línea Amarilla':19,'Línea Blanca':17}));
es('  sin km ni equipos menores mezclados',Object.keys(D.tg).sort().join(','),'Línea Amarilla,Línea Blanca');
es('el 15/09 queda fuera del corte',D.map['2026-09-15'],undefined);
es('el corte tiene 30 días',D.dias.length,30);

console.log('\n== Tercer nivel: el código de equipo ==');
D=datos('Línea Amarilla',null,null);
es('con tipo, la barra va por subtipo',Object.keys(D.map['2026-09-22'].g).sort().join(','),'EXCAVADORA,TRACTOR ORUGA');
D=datos('Línea Amarilla','EXCAVADORA',null);
es('con subtipo, por equipo',Object.keys(D.map['2026-09-22'].g).sort().join(','),'EXC ECOP-002,EXC ECOP-010');
D=datos('Línea Blanca','VOLQUETE',4);
es('con equipo, por turno',JSON.stringify(D.map['2026-09-22'].g),JSON.stringify({'☀ Día':10,'🌙 Noche':7}));

console.log('\n== Vehículo Menor por recorrido ==');
D=datos('Vehículo Menor',null,null);
es('usa el km recorrido registrado',D.map['2026-09-22'].v,120);
es('  y si falta, fin − inicio',D.map['2026-09-23'].v,85);
es('un km negativo no resta',ev('_dqcKm({kmIni:500,kmFin:400})'),0);

console.log('\n== Equipos Menores por operatividad diaria ==');
D=datos('Equipos Menores',null,null);
es('el 22/09: 2 de 2 operativos (el stand-by cuenta)',D.map['2026-09-22'].op+'/'+D.map['2026-09-22'].n,'2/2');
es('  = 100%',D.map['2026-09-22'].v,100);
es('el 23/09: 1 de 2',D.map['2026-09-23'].op+'/'+D.map['2026-09-23'].n,'1/2');
es('  = 50%',D.map['2026-09-23'].v,50);
es('el mixto OPERATIVO/INOPERATIVO cuenta como falla',ev("_dqcInop({condicion:'OPERATIVO/INOPERATIVO'})"),true);
es('un equipo con un turno inoperativo cuenta inoperativo el día',(()=>{
  DB.partes.push({id:999,eqId:6,fecha:'2026-09-24',turno:'NOCHE',condicion:'INOPERATIVO (FALLA MECANICA)'});
  DB.partes.push({id:998,eqId:6,fecha:'2026-09-24',turno:'DIA',condicion:'OPERATIVO (TRABAJADO)'});
  const r=datos('Equipos Menores',null,null).map['2026-09-24'];
  DB.partes=DB.partes.filter(p=>p.id<998);return r.op+'/'+r.n;})(),'0/1');

console.log('\n== Por qué un día salió sin horas ==');
es('inoperativo → ino',ev("_dqcCond({condicion:'INOPERATIVO (FALLA MECANICA)'})"),'ino');
es('el mixto también es ino',ev("_dqcCond({condicion:'OPERATIVO/INOPERATIVO'})"),'ino');
es('preventivo → pm',ev("_dqcCond({condicion:'PM1, PM2, PM3, PM4'})"),'pm');
es('stand-by → stb',ev("_dqcCond({condicion:'OPERATIVO (STANDBY)'})"),'stb');
es('trabajado → nada',ev("_dqcCond({condicion:'OPERATIVO (TRABAJADO)'})"),'');
es('si hay de los tres, gana inoperativo',ev("_dqcEtiqueta({ino:1,pm:1,stb:1}).txt"),'INO');
es('  luego preventivo',ev("_dqcEtiqueta({pm:1,stb:2}).txt"),'PM');
es('sin condición especial, sin etiqueta',ev('_dqcEtiqueta({np:2})'),null);
// La excavadora 010: un día inoperativo sin horas y otro en stand-by
P(2,'2026-09-25',{ef:0,condicion:'INOPERATIVO (FALLA MECANICA)'});
P(2,'2026-09-26',{ef:0,condicion:'OPERATIVO (STANDBY)'});
P(2,'2026-09-27',{ef:4,condicion:'INOPERATIVO (FALLA MECANICA)'});
ev("_deqVista='calendario';_deqTipo='Línea Amarilla';_deqSub='EXCAVADORA';_deqEqId=2;_dqcSel=null;rDashEquipos()");
let HC=nodos['page-dashEquipos'].innerHTML;
const celda=f=>{const m=HC.match(new RegExp('title="'+f+'[^"]*"[\\s\\S]*?font-size:\\.95rem">([\\s\\S]*?)</div>'));return m?m[1].replace(/<[^>]+>/g,'').trim():null;};
es('día sin horas e inoperativo dice INO',celda('2026-09-25'),'INO');
es('  en rojo',/color:#ef4444;">INO</.test(HC),true);
es('día sin horas en stand-by dice STB',celda('2026-09-26'),'STB');
es('día con horas pero falla: «4.0 h // INO»',celda('2026-09-27'),'4.0 h // INO');
es('día con horas sin falla, solo el número',celda('2026-09-22'),'6.0');
es('día sin parte sigue con guion',celda('2026-09-30'),'—');
es('el cuadro de ayuda dice la condición',/title="2026-09-25 · 1 parte\(s\) · 1 inoperativo"/.test(HC),true);
es('la leyenda explica las siglas',/INO<\/b> inoperativo/.test(HC)&&/STB<\/b> stand-by/.test(HC),true);
DB.partes=DB.partes.filter(p=>!['2026-09-25','2026-09-26','2026-09-27'].includes(p.fecha));
ev('_deqEqId=null;_deqSub=null');

console.log('\n== La pestaña dentro del Dashboard ==');
ev("_deqVista='calendario';_deqTipo=null;rDashEquipos()");
let H=nodos['page-dashEquipos'].innerHTML;
es('hay dos pestañas',/📊 Resumen/.test(H)&&/📅 Calendario/.test(H),true);
es('el calendario se dibuja',/Horas efectivas — /.test(H),true);
es('  aclara que son LA + LB',/Línea Amarilla \+ Línea Blanca/.test(H),true);
es('  con encabezado Lun…Dom',/>Lun</.test(H)&&/>Dom</.test(H),true);
es('los chips muestran la métrica de cada tipo',/>205 km</.test(H)&&/% oper\./.test(H),true);
es('  y horas para las líneas',/Línea Amarilla <span[^>]*>28\.0 h</.test(H),true);
es('ninguna celda rota',/NaN|undefined/.test(H),false);
ev("_deqTipo='Equipos Menores';rDashEquipos()");
H=nodos['page-dashEquipos'].innerHTML;
es('Equipos Menores muestra operatividad',/Operatividad diaria/.test(H)&&/Operatividad del corte/.test(H),true);
ev("_dqcSelDia('2026-09-23')");
es('tocar un día muestra su desglose',/Miércoles 23 de set/.test(nodos['page-dashEquipos'].innerHTML),true);
ev("_dqcSelDia('2026-09-23')");
es('  tocarlo de nuevo vuelve al acumulado',/Acumulado del corte/.test(nodos['page-dashEquipos'].innerHTML),true);
ev("_deqSetVista('resumen')");
H=nodos['page-dashEquipos'].innerHTML;
es('Resumen sigue como antes',/deqChart/.test(H)&&/Horas por Equipo/.test(H),true);
es('  y sus chips vuelven a horas',/% oper\./.test(H),false);

console.log('\n== Enganche ==');
const html=fs.readFileSync(R+'index.html','utf8');
es('index carga el calendario después del Dashboard',
  html.indexOf('js/dashEquiposCal.js')>html.indexOf('js/reportesEquipos.js'),true);

console.log('\n'+(mal?'X '+mal+' fallo(s)':'OK todo bien')+'  ·  '+ok+'/'+(ok+mal));
process.exit(mal?1:0);
