// Operaciones · Supervisión: los partes de turno del día.
// La oficina ve lo registrado en campo, un día a la vez, con sus totales.
const fs=require('fs'),vm=require('vm');
const R='c:/Users/LENOVO/OneDrive/Documents/GitHub/GDARSystem/';
let ok=0,mal=0;
const es=(l,g,e)=>{const b=String(g)===String(e);b?ok++:mal++;
  console.log((b?'  OK  ':'  MAL ')+l.padEnd(62)+'= '+g+(b?'':'  (esperado '+e+')'));};

// Filas como las devuelve Supabase (snake_case), de dos días
const FILAS=[
  {id:3,fecha:'2026-10-13',turno:'Noche',creado_en:'2026-10-14T03:22:28Z',autor:'Abel Rodríguez A.',
   clima:'Lluvia fuerte',clima_obs:null,clima_ini:'20:00',clima_fin:'22:30',horas_perdidas:2.5,
   pendiente:'Terminar <cuneta>',observaciones:null,
   actividades:[{frente:'C. Huantajalla',descripcion:'Preparación de material tipo 2',cantidad:90,unidad:'m³',ubicacion:{x:57,y:15}},
                {frente:'R3 - Dique Auxiliar',descripcion:'Poza provisional',cantidad:12,unidad:'horas',ubicacion:null}]},
  {id:2,fecha:'2026-10-13',turno:'Día',creado_en:'2026-10-13T22:10:00Z',autor:'Ervin Rojas',
   clima:'Despejado',clima_obs:null,clima_ini:null,clima_fin:null,horas_perdidas:0,
   pendiente:null,observaciones:'Sin novedad',
   actividades:[{frente:'R3 - Dique Auxiliar',descripcion:'Compactado de plataforma',cantidad:0.6,unidad:'global'},
                {frente:'Acceso Nor Oeste',descripcion:'Limpieza de fundación',cantidad:null,unidad:'m²'}]},
  {id:1,fecha:'2026-10-12',turno:'Día',creado_en:'2026-10-12T20:00:00Z',autor:'Wilner Vega',
   clima:'Nublado',horas_perdidas:0,actividades:[{frente:'Acceso Este',descripcion:'Desbroce',cantidad:3,unidad:'viajes'}]}
];

const nodos={};
function Nodo(id){
  return{id,innerHTML:'',textContent:'',value:'',style:{},disabled:false,firstElementChild:null,
    appendChild(){},remove(){},querySelector(){return null;},querySelectorAll(){return [];}};
}
const nodo=id=>nodos[id]||(nodos[id]=Nodo(id));
let consultas=[],avisos=[],falla=null,vistos=[],compartidos=[];
const supa={from:t=>({select:()=>({eq:async(c,v)=>{consultas.push({t,c,v});
  if(falla)return {data:null,error:{message:falla}};
  return {data:FILAS.filter(f=>f[c]===v).map(f=>JSON.parse(JSON.stringify(f))),error:null};}})})};
const ctx=vm.createContext({
  DB:{},console,Date,Math,Number,String,Object,Array,JSON,Set,isFinite,Promise,
  document:{getElementById:nodo,createElement:()=>Nodo('tmp'),body:{appendChild(){}},head:{appendChild(){}}},
  window:{innerWidth:1400},navigator:{},
  toast:(m,e)=>avisos.push({m,e:!!e}),
  supa,EMPRESA:{nombre:'ECOSERMO'}
});
// SUPA_TABLES y toCamel del sistema real
const cfg=fs.readFileSync(R+'js/config.js','utf8');
vm.runInContext(cfg.match(/const _RENAME_FROM\s*=[^\n]*/)[0].replace('const ','var ')+'\n'+
  cfg.match(/function toCamel\(obj\)\{[\s\S]*?\n\}/)[0]+'\nvar SUPA_TABLES={partesTurno:"partes_turno"};',ctx);
vm.runInContext(fs.readFileSync(R+'js/parteTurno.js','utf8'),ctx,{filename:'parteTurno.js'});
vm.runInContext(fs.readFileSync(R+'js/supTurnos.js','utf8'),ctx,{filename:'supTurnos.js'});
const ev=x=>vm.runInContext(x,ctx);
// El visor y el PDF son los del formulario: aquí solo se registra qué parte reciben
ctx._ptVerDoc=r=>vistos.push(r);
ctx._ptCompartirPdf=async r=>{compartidos.push(r);};
ctx._ptHoy=()=>'2026-10-13';
const espera=()=>new Promise(r=>setImmediate(r));

(async()=>{
console.log('\n== Fechas ==');
es('día siguiente',ev('_stSumarDias("2026-10-13",1)'),'2026-10-14');
es('fin de mes',ev('_stSumarDias("2026-10-31",1)'),'2026-11-01');
es('día anterior cruzando el año',ev('_stSumarDias("2026-01-01",-1)'),'2025-12-31');

console.log('\n== La pantalla ==');
ev('rSupTurnos()');
const PG=nodo('page-supervision').innerHTML;
es('reemplaza a la tabla vieja de Supervisión',/tbSuper|＋ Nueva/.test(PG),false);
es('título del bloque',/Partes de Turno del día/.test(PG),true);
es('abre en el día de hoy',/id="stFecha" value="2026-10-13"/.test(PG),true);
es('flechas de día anterior y siguiente',/_stMover\(-1\)/.test(PG)&&/_stMover\(1\)/.test(PG),true);
es('botón Hoy y buscador',/_stIrA\(_ptHoy\(\)\)/.test(PG)&&/_stBuscar\(this\.value\)/.test(PG),true);
await espera();
es('consulta a Supabase solo el día elegido',JSON.stringify(consultas[0]),'{"t":"partes_turno","c":"fecha","v":"2026-10-13"}');
es('trae los partes de ese día',ev('_stPartes.length'),2);
es('  Día antes que Noche',ev('_stPartes.map(p=>p.turno).join(",")'),'Día,Noche');
es('  ya en camelCase',ev('_stPartes[1].creadoEn+" · "+_stPartes[1].climaIni'),'2026-10-14T03:22:28Z · 20:00');
es('  las horas perdidas como número',ev('_stPartes[1].horasPerdidas+1'),3.5);

const C=nodo('stCuerpo').innerHTML;
console.log('\n== Totales del día ==');
es('partes recibidos',/Partes recibidos<\/div>\s*<div class="st-kpi-v"[^>]*>2</.test(C),true);
es('  con el detalle por turno',/☀ 1 día · 🌙 1 noche/.test(C),true);
es('actividades',ev('_stTotales(_stPartes).acts'),4);
es('frentes distintos (el repetido cuenta una vez)',ev('_stTotales(_stPartes).frentes'),3);
es('horas perdidas',ev('_stTotales(_stPartes).horas'),2.5);
es('  en rojo cuando hay',/border:1px solid #ef4444/.test(C),true);
es('cada KPI con borde en los 4 lados de su color',(C.match(/class="st-kpi" style="border:1px solid #[0-9a-f]{6};border-top:3px solid #[0-9a-f]{6}"/g)||[]).length,4);

console.log('\n== Una tarjeta por parte ==');
es('dos tarjetas',(C.match(/class="st-card"/g)||[]).length,2);
es('turno, autor y hora de registro',/Turno Noche/.test(C)&&/Abel Rodríguez A\./.test(C)&&/registrado \d\d:\d\d/.test(C),true);
es('las actividades con frente, trabajo y cantidad',/C\. Huantajalla/.test(C)&&/Preparación de material tipo 2/.test(C)&&/90 m³/.test(C),true);
es('sin cantidad muestra —',/Limpieza de fundación[\s\S]*?st-act-q">—</.test(C),true);
es('marca las ubicadas en el plano',(C.match(/📍/g)||[]).length,1);
es('la paralización por clima',/paralización <b>2\.5 h<\/b> \(20:00 a 22:30\)/.test(C),true);
es('pendiente y observaciones',/Pendiente para el siguiente turno/.test(C)&&/Sin novedad/.test(C),true);
es('el texto escrito no se interpreta como código',/<cuneta>/.test(C),false);
es('botones Ver y PDF',/_stVer\(3\)/.test(C)&&/_stCompartir\(3,this\)/.test(C),true);
es('ninguna celda rota',/undefined|NaN|\[object/.test(C),false);

console.log('\n== Ver y compartir ==');
ev('_stVer(2)');
es('Ver abre el documento de ese parte',vistos.length&&vistos[0].autor,'Ervin Rojas');
await ev('_stCompartir(3,null)');
es('PDF genera el de ese parte',compartidos.length&&compartidos[0].autor,'Abel Rodríguez A.');

console.log('\n== Buscador ==');
ev('_stBuscar("huantajalla")');
let C2=nodo('stCuerpo').innerHTML;
es('por frente',(C2.match(/class="st-card"/g)||[]).length,1);
ev('_stBuscar("ervin")');C2=nodo('stCuerpo').innerHTML;
es('por autor',/Ervin Rojas/.test(C2)&&!/Abel/.test(C2),true);
ev('_stBuscar("fundacion")');C2=nodo('stCuerpo').innerHTML;
es('por trabajo, sin importar tildes',/Limpieza de fundación/.test(C2),true);
es('  los totales siguen al filtro',ev('_stTotales(_stPartes.filter(p=>_stCoincide(p,_stBusca))).acts'),2);
ev('_stBuscar("zzz")');
es('sin coincidencias lo dice',/Ningún parte coincide/.test(nodo('stCuerpo').innerHTML),true);
ev('_stBuscar("")');

console.log('\n== Cambiar de día ==');
ev('_stMover(-1)');await espera();
es('el día anterior consulta su fecha',consultas[consultas.length-1].v,'2026-10-12');
es('  y el selector se actualiza',nodo('stFecha').value,'2026-10-12');
es('  con su parte',ev('_stPartes.map(p=>p.autor).join()'),'Wilner Vega');
ev('_stIrA("2026-10-20")');await espera();
es('un día sin partes lo dice',/No hay partes de turno registrados el martes 20 de octubre de 2026/.test(nodo('stCuerpo').innerHTML),true);
es('  y los KPI en cero',ev('_stTotales(_stPartes).partes'),0);
const n=consultas.length;ev('_stIrA("basura")');
es('una fecha inválida no consulta',consultas.length,n);

console.log('\n== Respuestas fuera de orden ==');
// Si se cambia rápido de día, la respuesta vieja no pisa a la nueva
ev('_stIrA("2026-10-12");_stIrA("2026-10-13")');await espera();
es('queda el último día pedido',ev('_stPartes.length+" · "+_stFecha'),'2 · 2026-10-13');

console.log('\n== Sin conexión ==');
falla='TypeError: Failed to fetch';
ev('_stCargar()');await espera();
es('avisa en pantalla',/No se pudieron cargar los partes/.test(nodo('stCuerpo').innerHTML),true);
es('  con botón para reintentar',/_stCargar\(\)/.test(nodo('stCuerpo').innerHTML),true);
falla=null;

console.log('\n== Conexión con el sistema ==');
const UT=fs.readFileSync(R+'js/utils.js','utf8'), IX=fs.readFileSync(R+'index.html','utf8');
es('el menú Supervisión abre esta pantalla',/supervision:rSupTurnos/.test(UT),true);
es('el script se carga después de parteTurno.js',IX.indexOf('js/supTurnos.js')>IX.indexOf('js/parteTurno.js'),true);
es('la página queda vacía para que la arme el módulo',/<div class="page" id="page-supervision"><\/div>/.test(IX),true);
const PT=fs.readFileSync(R+'js/parteTurno.js','utf8');
es('el visor del formulario acepta cualquier parte',/function _ptVerDoc\(rec\)/.test(PT)&&/async function _ptCompartirPdf\(rec\)/.test(PT),true);

console.log('\n'+(mal?'✗ '+mal+' FALLAS':'OK todo bien')+'  ·  '+ok+'/'+(ok+mal));
process.exit(mal?1:0);
})();
