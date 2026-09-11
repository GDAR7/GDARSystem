// ══ LO QUE NO SE PUDO GUARDAR NO SE PIERDE ══════════════════════════════════
//
// En faena la conexión se cae. Hoy, cuando eso pasa al guardar, supaUpsert
// muestra "Error de conexión" y el registro se pierde: vive solo en la copia
// en memoria y desaparece al recargar la página. Alguien tarea una guardia
// entera, se corta la red, y al día siguiente no está.
//
// Esto lo guarda en el navegador —en IndexedDB, que sobrevive al cierre— y lo
// reenvía cuando vuelve la red.
//
// ── Por qué reenviar es seguro ────────────────────────────────────────────
// Cada registro lleva su `id`, que genera la propia aplicación, y supaUpsert
// hace un upsert: el conflicto se resuelve contra la clave primaria. Reenviar
// dos veces el mismo registro escribe la misma fila dos veces, no crea dos.
//
// Y la cola guarda por (tabla, id): si alguien corrige tres veces la misma
// celda estando sin red, se envía una sola vez, con el último valor.
//
// ── Lo que esto NO arregla ────────────────────────────────────────────────
// Dos personas tareando la misma celda desde equipos distintos siguen creando
// dos filas, porque cada navegador genera su propio id. Ese problema ya existe
// hoy —es lo que limpia js/tareajeDup.js— y lo resuelve de raíz el índice único
// de supabase/migrations/20260909235900, que todavía no se ha aplicado.
//
// Mientras tanto, para tareaje y asistencia se hace una comprobación extra al
// reenviar: se busca si el servidor ya tiene una fila para esa persona y ese
// día, y si la hay se actualiza ESA en vez de crear otra. No es tan bueno como
// la restricción en la base, pero deja el camino sin red más seguro que el
// camino con red de hoy.

const COLA_BD='gdar-cola';
const COLA_ALMACEN='pendientes';

// Las tablas donde una misma persona y día no pueden tener dos filas. Es la
// misma identidad que comprueba tareaje.js antes de decidir si actualiza o
// inserta, y la que fija el índice único que falta aplicar.
const COLA_UNICAS={tareaje:['personalId','fecha'],asistencia:['personalId','fecha']};

let _colaBD=null;

function _colaAbrir(){
  if(_colaBD)return _colaBD;
  _colaBD=new Promise((resolve,reject)=>{
    if(typeof indexedDB==='undefined')return reject(new Error('sin IndexedDB'));
    const p=indexedDB.open(COLA_BD,1);
    p.onupgradeneeded=()=>{
      const bd=p.result;
      if(!bd.objectStoreNames.contains(COLA_ALMACEN))
        bd.createObjectStore(COLA_ALMACEN,{keyPath:'clave'});
    };
    p.onsuccess=()=>resolve(p.result);
    p.onerror=()=>reject(p.error);
  });
  return _colaBD;
}

function _colaTx(modo,fn){
  return _colaAbrir().then(bd=>new Promise((resolve,reject)=>{
    const tx=bd.transaction(COLA_ALMACEN,modo);
    const st=tx.objectStore(COLA_ALMACEN);
    let salida;
    try{ salida=fn(st); }catch(e){ return reject(e); }
    tx.oncomplete=()=>resolve(salida&&salida.result!==undefined?salida.result:salida);
    tx.onerror=()=>reject(tx.error);
  }));
}

// ── Meter y sacar ──────────────────────────────────────────────────────────
// La clave es tabla|id: guardar dos veces el mismo registro lo reemplaza, así
// que la cola nunca crece con correcciones sobre la misma celda.
// `op.borrar` marca que lo pendiente no es escribir el registro sino
// eliminarlo. Comparte la clave tabla|id a propósito: si el registro estaba
// esperando salir, el borrado lo reemplaza y nunca llega a crearse.
async function colaGuardar(dbKey,record,op){
  try{
    await _colaTx('readwrite',st=>st.put({
      clave:dbKey+'|'+(record&&record.id),
      dbKey,record,
      borrar:!!(op&&op.borrar),
      requerimiento:!!(op&&op.requerimiento),
      cuando:new Date().toISOString()
    }));
    _colaPintar();
    return true;
  }catch(e){
    console.warn('[cola] no se pudo guardar en el navegador:',e&&e.message);
    return false;
  }
}

async function colaListar(){
  try{ return await _colaTx('readonly',st=>st.getAll())||[]; }
  catch(e){ return []; }
}

async function colaPendientes(){ return (await colaListar()).length; }

async function _colaQuitar(clave){
  try{ await _colaTx('readwrite',st=>st.delete(clave)); }catch(e){}
  // Deja de estar pendiente también para la pantalla: si no, seguiría marcado
  // como sin enviar hasta la próxima recarga.
  if(typeof _colaPendientes!=='undefined')_colaPendientes.delete(clave);
}

// ── Reenviar ───────────────────────────────────────────────────────────────
// Se manda de a uno y se borra de la cola solo si el servidor lo aceptó. Un
// fallo deja el registro dentro para el próximo intento.
let _colaEnviando=false;

async function colaVaciar(){
  if(_colaEnviando)return{enviados:0,pendientes:await colaPendientes()};
  if(typeof supa==='undefined')return{enviados:0,pendientes:0};
  _colaEnviando=true;
  let enviados=0;
  try{
    const lista=(await colaListar()).sort((a,b)=>String(a.cuando).localeCompare(b.cuando));
    for(const item of lista){
      const tabla=SUPA_TABLES[item.dbKey];
      // Un requerimiento no se dirige a una sola tabla, así que no se le pide
      // una: se descartaría antes de llegar a su rama.
      if(!tabla&&!item.requerimiento){ await _colaQuitar(item.clave); continue; }  // tabla que ya no existe
      try{
        let error;
        if(item.requerimiento){
          // Tres tablas y un id que solo da el servidor: no cabe en un upsert.
          // Se rehace la secuencia entera llamando a quien sabe hacerla. Si
          // vuelve a caerse la red, esa función encola otra vez con la misma
          // clave —se reemplaza, no se acumula— y devuelve el fallo, que aquí
          // corta la pasada como cualquier otro corte.
          if(typeof supaGuardarRequerimiento!=='function')continue;
          // Un fallo de red llega como Error (lo lanzó fetch); un rechazo de
          // Supabase llega como objeto plano {message,code,...}. Es lo único
          // que los separa, y separarlos importa: uno se reintenta, el otro no.
          const r=await supaGuardarRequerimiento(item.record);
          if(r instanceof Error)throw r;   // se cayó otra vez la red
          error=r||null;
        }
        else if(item.borrar){
          // Si nunca llegó a existir en el servidor, borrar no encuentra nada.
          // Eso no es un fallo: el resultado buscado —que no esté— ya se dio.
          ({error}=await supa.from(tabla).delete().eq('id',+item.record.id));
        }else{
          const registro=await _colaResolverChoque(item);
          ({error}=await supa.from(tabla).upsert(toSnake(registro)));
        }
        if(error){
          console.warn('[cola] el servidor rechazó',tabla,error.message);
          continue;                       // se queda para el próximo intento
        }
        await _colaQuitar(item.clave);
        enviados++;
      }catch(e){
        break;                            // sigue sin red: se corta y se reintenta luego
      }
    }
  } finally { _colaEnviando=false; }
  _colaPintar();
  const pendientes=await colaPendientes();
  if(enviados&&typeof toast==='function')
    toast('✓ '+enviados+' registro(s) pendientes enviados');
  return{enviados,pendientes};
}

// Para tareaje y asistencia: si el servidor ya tiene una fila de esa persona y
// ese día, se le pone el id de ESA para actualizarla en vez de crear otra.
// Es lo que haría el índice único; mientras no esté aplicado, esto evita el
// duplicado en el caso que más importa, que es el reenvío tras horas sin red.
async function _colaResolverChoque(item){
  const campos=COLA_UNICAS[item.dbKey];
  if(!campos)return item.record;
  const tabla=SUPA_TABLES[item.dbKey];
  try{
    let q=supa.from(tabla).select('id');
    for(const c of campos){
      const col=c.replace(/([A-Z])/g,m=>'_'+m.toLowerCase());
      q=q.eq(col,item.record[c]);
    }
    const{data,error}=await q.limit(1);
    if(error||!data||!data.length)return item.record;
    if(+data[0].id===+item.record.id)return item.record;
    return Object.assign({},item.record,{id:data[0].id});
  }catch(e){ return item.record; }
}

// ── Que lo pendiente se siga viendo ────────────────────────────────────────
// Sin esto la cola guarda el trabajo pero la pantalla lo pierde: al recargar,
// DB se rellena desde Supabase, que todavía no tiene esos registros, y el
// tareo hecho sin red desaparece de la grilla. La persona lo volvería a
// escribir, y ahí sí saldrían dos filas.
//
// Se aplica DESPUÉS de cargar los datos, así que lo pendiente pisa lo que haya
// venido del servidor: es lo más nuevo que existe.
const _colaPendientes=new Set();

// ¿Este registro está esperando salir? Lo usan los módulos de captura para
// marcarlo en pantalla. Se pregunta por (tabla, id) en vez de marcar el propio
// registro: un campo de más viajaría a Supabase en el siguiente upsert y sería
// una columna que no existe.
function colaPendiente(dbKey,id){
  return _colaPendientes.has(dbKey+'|'+id);
}

// La apariencia, en un solo sitio. Si cada módulo escribiera la suya, en un año
// habría cinco marcas distintas para lo mismo.
const COLA_MARCA_CSS='outline:2px dashed #f59e0b;outline-offset:-2px;';
const COLA_MARCA_TIT='Sin enviar · se guardará solo al volver la red';

// Devuelve los atributos para una fila pendiente, o nada. Se pega dentro del
// <tr>: `<tr${colaMarca('combustible',r.id)}>`. Solo sirve donde el <tr> no
// lleve ya su propio style, porque el segundo se ignoraría.
function colaMarca(dbKey,id){
  if(typeof colaPendiente!=='function'||!colaPendiente(dbKey,id))return'';
  return' style="'+COLA_MARCA_CSS+'" title="'+COLA_MARCA_TIT+'"';
}

async function colaAplicar(){
  if(typeof DB==='undefined')return 0;
  const lista=await colaListar();
  _colaPendientes.clear();
  let n=0;
  for(const item of lista){
    const arr=DB[item.dbKey];
    if(!Array.isArray(arr))continue;
    const i=arr.findIndex(r=>+r.id===+item.record.id);
    if(item.borrar){
      // Ya se borró de la pantalla cuando la persona lo pidió; el servidor
      // todavía lo tiene, así que vuelve a bajar en cada carga. Se quita otra
      // vez, o volvería a aparecer un registro que para ella ya no existe.
      if(i>=0)arr.splice(i,1);
    }
    else if(i>=0)arr[i]=Object.assign({},arr[i],item.record);
    else arr.push(item.record);
    _colaPendientes.add(item.clave);
    n++;
  }
  return n;
}

// ── El aviso en pantalla ───────────────────────────────────────────────────
// Nadie debe descubrir que tiene trabajo sin enviar al día siguiente. Se pinta
// desde aquí para no tocar index.html.
let _colaAviso=null;

async function _colaPintar(){
  if(typeof document==='undefined')return;
  const n=await colaPendientes();
  if(!n){ if(_colaAviso)_colaAviso.style.display='none'; return; }
  if(!_colaAviso){
    _colaAviso=document.createElement('button');
    _colaAviso.type='button';
    _colaAviso.title='Reenviar ahora';
    _colaAviso.onclick=()=>colaVaciar();
    _colaAviso.style.cssText='position:fixed;right:1rem;bottom:1rem;z-index:99998;'
      +'background:#b45309;color:#fff;border:none;border-radius:6px;cursor:pointer;'
      +'font:600 12px/1.3 system-ui,sans-serif;padding:.55rem .8rem;'
      +'box-shadow:0 6px 20px #0006';
    const poner=()=>document.body&&document.body.appendChild(_colaAviso);
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',poner);
    else poner();
  }
  _colaAviso.style.display='';
  _colaAviso.textContent='⏳ '+n+' sin enviar · reintentar';
}

// ── Cuándo se intenta ──────────────────────────────────────────────────────
if(typeof window!=='undefined'){
  window.addEventListener('online',()=>colaVaciar());
  window.addEventListener('load',()=>{ _colaPintar(); setTimeout(colaVaciar,2000); });
}
