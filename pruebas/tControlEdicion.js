// Configuración · Control de edición: el administrador abre y cierra la
// corrección del Kardex de Combustible (más allá de sus 48 h), con cierre
// automático opcional. Se guarda en Supabase y solo él puede cambiarlo.
const fs=require('fs'),vm=require('vm');
const R='c:/Users/LENOVO/OneDrive/Documents/GitHub/GDARSystem/';
let ok=0,mal=0;
const es=(l,g,e)=>{const b=String(g)===String(e);b?ok++:mal++;
  console.log((b?'  OK  ':'  MAL ')+l.padEnd(62)+'= '+g+(b?'':'  (esperado '+e+')'));};

const HORA=3600000;
let AHORA=Date.parse('2026-10-26T10:00:00-05:00');
class Reloj extends Date{
  constructor(...a){if(a.length===0)super(AHORA);else super(...a);}
  static now(){return AHORA;}
}
// Supabase simulado: una fila por módulo; «admin» decide si la base acepta escribir
const BASE={filas:{combustible:{modulo:'combustible',activo:false,desde:null,hasta:null}},admin:true,caida:false,lecturas:0,escrito:null};
const supa={from:()=>({
  select:async()=>{BASE.lecturas++;
    if(BASE.caida)return{data:null,error:{message:'Failed to fetch'}};
    return{data:Object.values(BASE.filas).map(x=>({...x})),error:null};},
  upsert:fila=>({select:async()=>{
    BASE.escrito=fila;
    if(!BASE.admin)return{data:null,error:{message:'new row violates row-level security policy'}};
    BASE.filas[fila.modulo]={...fila};return{data:[{...fila}],error:null};}})
})};
const nodos={};
const nodo=id=>nodos[id]||(nodos[id]={id,innerHTML:'',value:'',checked:false});
let paginaActiva='page-controlEdicion';
const toasts=[];
const DB={combustible:[],equipos:[]};
const ctx=vm.createContext({DB,console:{warn(){},log(){}},Date:Reloj,Math,Number,String,Object,Array,JSON,Set,Map,isFinite,parseFloat,parseInt,Promise,
  document:{getElementById:nodo,querySelector:s=>s==='.page.active'?{id:paginaActiva}:null,querySelectorAll:()=>[],addEventListener(){}},
  window:{},supa,toast:(m,e)=>toasts.push((e?'✗ ':'')+m),confirm:()=>true,
  CU:{codigo:'EIBEL25',nombre:'Abel Rodríguez A.'},closeM(){},del(){},verComb(){},openM(){}});
vm.runInContext(fs.readFileSync(R+'js/controlEdicion.js','utf8').replace(/^const /gm,'var ').replace(/^let /gm,'var '),ctx,{filename:'controlEdicion.js'});
const ev=x=>vm.runInContext(x,ctx);
const pg=()=>nodo('page-controlEdicion').innerHTML;
const espera=()=>new Promise(r=>setImmediate(r));
const fresco=()=>ev('_cedCargaT=0');

(async()=>{
console.log('\n== Solo el administrador ==');
ev("CU={codigo:'J_A_TA',nombre:'Javier'}");
ev('rControlEdicion()');
es('otro usuario ve el aviso, no los controles',/solo para el administrador/.test(pg())&&!/Activar edición/.test(pg()),true);
es('  y ni siquiera consulta la base',BASE.lecturas,0);
await ev("_cedGuardar('combustible',true)");
es('  ni puede guardar desde la consola',toasts.pop()+' · '+BASE.escrito,'✗ Solo el administrador puede cambiar la edición · null');
ev("CU={codigo:'EIBEL25',nombre:'Abel Rodríguez A.'}");

console.log('\n== La pantalla ==');
ev('rControlEdicion()');
es('mientras lee: «Cargando…»',/Cargando…/.test(pg()),true);
await espera();
es('llegó el estado: tarjeta de combustible',/Kardex de Combustible/.test(pg()),true);
es('  cerrada, con botón para activar',/○ CERRADA/.test(pg())&&/🔓 Activar edición/.test(pg()),true);
es('  la tarjeta tiene borde en los 4 lados',/<div class="card" style="border:1px solid #64748b">/.test(pg()),true);
es('  cierre automático marcado por defecto',/id="ceAuto-combustible" type="checkbox" checked/.test(pg()),true);
es('  propone cerrarse mañana 23:59',/id="ceHasta-combustible" type="datetime-local" value="2026-10-27T23:59"/.test(pg()),true);

console.log('\n== Activar ==');
nodo('ceDesde-combustible').value='';nodo('ceAuto-combustible').checked=true;nodo('ceHasta-combustible').value='2026-10-27T23:59';
await ev("_cedGuardar('combustible',true)");
es('sin fecha «desde» no se abre',toasts.pop(),'✗ Indique desde qué fecha de movimiento se abre');
nodo('ceDesde-combustible').value='2026-09-21';nodo('ceHasta-combustible').value='2026-10-25T08:00';
await ev("_cedGuardar('combustible',true)");
es('un cierre en el pasado no se acepta',toasts.pop(),'✗ El cierre automático tiene que ser más adelante que ahora');
nodo('ceHasta-combustible').value='2026-10-27T23:59';
await ev("_cedGuardar('combustible',true)");
es('se abre',toasts.pop(),'🔓 Edición de Kardex de Combustible abierta');
const w=BASE.escrito;
es('  guarda activo, desde, cierre y quién',[w.activo,w.desde,w.hasta,w.actualizado_por].join(' · '),
  'true · 2026-09-21 · '+new Date('2026-10-27T23:59').toISOString()+' · Abel Rodríguez A.');
es('  queda abierta',ev("_cedAbierta('combustible')"),true);
es('  la tarjeta lo muestra con lo que falta',/● ABIERTA/.test(pg())&&/movimientos desde el 21\/09\/2026/.test(pg())&&/quedan 38 h/.test(pg()),true);
es('  y ofrece guardar cambios o desactivar',/💾 Guardar cambios/.test(pg())&&/🔒 Desactivar ahora/.test(pg()),true);
es('  dice el último cambio',/Último cambio: Abel Rodríguez A\./.test(pg()),true);

console.log('\n== Sin cierre automático ==');
nodo('ceAuto-combustible').checked=false;
await ev("_cedGuardar('combustible',true)");toasts.pop();
es('se guarda sin hora de cierre',BASE.escrito.hasta,null);
AHORA+=30*24*HORA;
es('  sigue abierta un mes después',ev("_cedAbierta('combustible')"),true);
AHORA-=30*24*HORA;

console.log('\n== Cierre automático vencido ==');
ev("_cedEstado.combustible.hasta='2026-10-26T12:00:00-05:00'");
AHORA+=3*HORA;
es('pasada la hora se cierra sola',ev("_cedAbierta('combustible')"),false);
ev('rControlEdicion()');
es('  la tarjeta dice que venció',/se cerró sola el 26\/10\/2026 12:00/.test(pg()),true);
AHORA-=3*HORA;

console.log('\n== Desactivar ==');
await ev("_cedGuardar('combustible',false)");
es('se cierra',toasts.pop()+' · '+BASE.escrito.activo,'🔒 Edición de Kardex de Combustible cerrada · false');
es('  conserva la fecha «desde» como referencia',BASE.escrito.desde,'2026-09-21');

console.log('\n== La base rechaza a quien no es administrador ==');
BASE.admin=false;
nodo('ceAuto-combustible').checked=false;
await ev("_cedGuardar('combustible',true)");
es('el error se muestra, no queda abierta',/✗ No se pudo guardar: new row violates/.test(toasts.pop())&&!ev("_cedAbierta('combustible')"),true);
BASE.admin=true;

console.log('\n== Sin la tabla ==');
{
  const c2=vm.createContext({console:{warn(){}},Date,Math,Number,String,Object,Array,JSON,isFinite,Promise,
    document:{getElementById:nodo,querySelector:()=>({id:'page-controlEdicion'})},CU:{codigo:'EIBEL25'},toast(){},
    supa:{from:()=>({select:async()=>({data:null,error:{code:'PGRST205',message:'Could not find the table'}})})}});
  vm.runInContext(fs.readFileSync(R+'js/controlEdicion.js','utf8'),c2);
  vm.runInContext('rControlEdicion()',c2);await espera();
  es('pide correr el SQL y deja reintentar',/sql\/control_edicion\.sql/.test(pg())&&/↻ Reintentar/.test(pg()),true);
  es('  y el combustible queda cerrado (regla de 48 h)',vm.runInContext("_cedAbierta('combustible')",c2),false);
}

console.log('\n== El kardex vuelve a preguntar antes de guardar ==');
// Combustible real con el módulo cargado: un movimiento de hace 10 días
const cb=fs.readFileSync(R+'js/combustible.js','utf8');
vm.runInContext(cb,ctx,{filename:'combustible.js'});
let hechos=[];ctx.rComb=()=>hechos.push('rComb');
paginaActiva='page-combustible';
DB.combustible.push({id:5,fecha:'2026-10-10',creadoEn:'2026-10-10T08:00:00-05:00',tipoMov:'Despacho',gal:10});
DB.combustible.push({id:6,fecha:'2026-10-26',creadoEn:new Date(AHORA-HORA).toISOString(),tipoMov:'Despacho',gal:5});
BASE.filas.combustible={modulo:'combustible',activo:true,desde:'2026-09-21',hasta:null};
await ev('_cedCargar(true)');
es('abierta: el viejo se puede tocar',ev('_cbBloqueado(DB.combustible[0])'),false);
ev("delComb(5)");await espera();await espera();
es('  eliminar consulta la base antes',BASE.lecturas>0&&true,true);
ctx.del=(t,id)=>hechos.push('del '+id);
hechos=[];const antes=BASE.lecturas;
ev("delComb(5)");await espera();await espera();
es('  y si sigue abierta, elimina',hechos.join(),'del 5');
es('  (una lectura nueva)',BASE.lecturas-antes,1);
// Se cerró desde otra computadora mientras el kardex estaba abierto
BASE.filas.combustible.activo=false;hechos=[];
ev("delComb(5)");await espera();await espera();
es('cerrada en la base: no elimina y redibuja',!hechos.some(h=>/^del/.test(h))&&hechos.includes('rComb'),true);
es('  avisa que la cerró administración',toasts.pop(),'✗ La edición del kardex fue cerrada por administración');
// Sin conexión: no se confía en lo que había en memoria
BASE.filas.combustible.activo=true;await ev('_cedCargar(true)');
BASE.caida=true;hechos=[];
ev("delComb(5)");await espera();await espera();
es('sin conexión: no elimina',hechos.join(),'');
es('  y pide reintentar',/No se pudo confirmar que la edición siga abierta/.test(toasts.pop()),true);
BASE.caida=false;
// Lo de menos de 48 h no necesita preguntar
hechos=[];const l2=BASE.lecturas;
ev("delComb(6)");
es('un movimiento reciente se elimina directo, sin consultar',hechos.join()+' · '+(BASE.lecturas-l2),'del 6 · 0');
es('guardar la edición también verifica',/_cbConVentana\(DB\.combustible\[idx\],\(\)=>gComb\(true\)/.test(cb),true);
es('abrir el formulario también',/_cbConVentana\(r,\(\)=>editComb\(id,true\)\)/.test(cb),true);
es('el kardex lee el estado al dibujarse',/if\(typeof _cedCargar==='function'\)_cedCargar\(\);/.test(cb),true);
es('ya no hay fecha fija en el código',/_CB_VENTANA_LIBRE/.test(cb),false);

console.log('\n== Instalación ==');
const IX=fs.readFileSync(R+'index.html','utf8');
es('página en index.html',/<div class="page" id="page-controlEdicion"><\/div>/.test(IX),true);
es('script cargado',/<script src="js\/controlEdicion\.js\?v=\d+"><\/script>/.test(IX),true);
es('ruta en utils.js',/controlEdicion:rControlEdicion/.test(fs.readFileSync(R+'js/utils.js','utf8')),true);
es('módulo dentro de Configuración',/configuracion:\{[^}]*\n\s*modules:\[[^\n]*key:'controlEdicion'/.test(fs.readFileSync(R+'js/config.js','utf8')),true);

console.log('\n== El SQL ==');
const SQL=fs.readFileSync(R+'sql/control_edicion.sql','utf8');
es('crea la tabla',/create table if not exists public\.control_edicion/.test(SQL),true);
es('todos leen',/for select to authenticated using \(true\)/.test(SQL),true);
es('solo EIBEL25 inserta, cambia y borra (insert · update ×2 · delete)',
  (SQL.match(/user_metadata' ->> 'codigo'\) = 'EIBEL25'/g)||[]).length,4);
es('no deja la regla abierta de las otras tablas',/drop policy if exists gdar_autenticado on public\.control_edicion/.test(SQL)&&!/create policy gdar_autenticado/.test(SQL),true);
es('arranca cerrada',/values \('combustible', false\)/.test(SQL),true);
es('refresca la API',/notify pgrst/.test(SQL),true);

console.log('\n'+(mal?'✗ '+mal+' FALLAS':'OK todo bien')+'  ·  '+ok+'/'+(ok+mal));
process.exit(mal?1:0);
})();
