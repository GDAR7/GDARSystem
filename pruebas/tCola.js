// ══ LO QUE NO SE PUDO GUARDAR NO SE PIERDE ══════════════════════════════════
// En faena la conexión se cae. Antes, cuando eso pasaba al guardar, el registro
// se perdía: vivía solo en la copia en memoria y desaparecía al recargar.
// Alguien tarea una guardia entera, se corta la red, y al día siguiente no está.
//
// Lo que esta suite protege:
//   · Que un fallo de RED se guarde, y un rechazo del SERVIDOR no. Reintentar
//     un rechazo solo repetiría el mismo rechazo, para siempre.
//   · Que reenviar dos veces no cree dos filas.
//   · Que el reenvío de tareaje no duplique lo que el servidor ya tiene.
//   · Que al recargar, lo pendiente vuelva a verse en pantalla. Si no, la
//     persona lo escribiría otra vez y ahí sí saldrían dos filas.
//   · Que borrar sin red también espere, y que un borrado no deje resucitar
//     lo que todavía no había salido.
//
// IndexedDB no existe en Node, así que se simula. Lo que se prueba es la
// lógica de la cola, que es donde están las decisiones.

const fs=require('fs');
const R=require('path').join(__dirname,'..')+'/';

let ok=0,mal=0;
const es=(l,g,e)=>{const b=String(g)===String(e);b?ok++:mal++;
  console.log((b?'  OK  ':'  MAL ')+l.padEnd(58)+'= '+g+(b?'':'  (esperado '+e+')'));};

const SRC=fs.readFileSync(R+'js/cola.js','utf8');

// ── IndexedDB de mentira ───────────────────────────────────────────────────
// Lo justo para que cola.js funcione: open, una transacción y un almacén con
// put / getAll / delete, todos por clave.
function fakeIDB(inicial){
  const datos=new Map(Object.entries(inicial||{}));
  const pedir=valor=>{const r={result:valor};setTimeout(()=>r.onsuccess&&r.onsuccess(),0);return r;};
  const store={
    put(o){datos.set(o.clave,o);return pedir();},
    getAll(){return{result:[...datos.values()]};},
    delete(k){datos.delete(k);return pedir();}
  };
  const bd={
    objectStoreNames:{contains:()=>true},
    createObjectStore:()=>store,
    transaction(){
      const tx={objectStore:()=>store};
      setTimeout(()=>tx.oncomplete&&tx.oncomplete(),0);
      return tx;
    }
  };
  return{
    datos,
    idb:{open(){const p={result:bd};setTimeout(()=>p.onsuccess&&p.onsuccess(),0);return p;}}
  };
}

// Monta cola.js con un entorno controlado
function montar(op){
  op=op||{};
  const{datos,idb}=fakeIDB(op.inicial);
  const enviados=[];
  const borrados=[];
  const avisos=[];
  const supa={
    from:t=>({
      select:()=>({eq(){return this;},limit:async()=>({data:(op.yaExiste&&op.yaExiste[t])||[],error:null})}),
      upsert:async r=>{
        if(op.sinRed)throw new TypeError('Failed to fetch');
        enviados.push({tabla:t,registro:r});
        return{error:op.rechaza?{message:'rechazado'}:null};
      },
      delete:()=>({eq:async(col,v)=>{
        if(op.sinRed)throw new TypeError('Failed to fetch');
        borrados.push({tabla:t,[col]:v,id:v});
        return{error:op.rechaza?{message:'rechazado'}:null};
      }})
    })
  };
  // El doble de supaGuardarRequerimiento devuelve lo mismo que el de verdad:
  // null si salió, un Error si se cayó la red, un objeto plano {message} si el
  // servidor lo rechazó. Que el original ADEMÁS reencole en el caso de red es
  // cosa suya, y lo comprueba la aserción de texto sobre config.js.
  const reqs=[];
  const req={falla:null};
  const ctx={
    indexedDB:idb, supa, DB:op.DB||{},
    supaGuardarRequerimiento:async r=>{
      if(req.falla)return req.falla;
      reqs.push(r);return null;
    },
    SUPA_TABLES:op.tablas||{tareaje:'tareaje',asistencia:'asistencia',
      combustible:'combustible',requerimientos:'requerimientos'},
    toSnake:o=>o,
    toast:m=>avisos.push(String(m)),
    document:undefined, window:undefined,
    console:{warn(){},info(){}}
  };
  const api=new Function('indexedDB','supa','DB','supaGuardarRequerimiento',
    'SUPA_TABLES','toSnake','toast','document','window','console',
    SRC+';return{colaGuardar,colaListar,colaPendientes,colaVaciar,colaAplicar,colaPendiente,colaMarca};')(
    ctx.indexedDB,ctx.supa,ctx.DB,ctx.supaGuardarRequerimiento,
    ctx.SUPA_TABLES,ctx.toSnake,ctx.toast,
    ctx.document,ctx.window,ctx.console);
  return Object.assign(api,{datos,enviados,borrados,avisos,reqs,req,DB:ctx.DB});
}

(async()=>{

console.log('\n== Un fallo de red se guarda ==');
{
  const c=montar();
  await c.colaGuardar('tareaje',{id:1,personalId:7,fecha:'2026-09-10',tipo:'TD'});
  es('queda pendiente',await c.colaPendientes(),1);
  es('  con su tabla y su id',[...c.datos.keys()][0],'tareaje|1');
}

console.log('\n== Corregir la misma celda no la duplica ==');
// Alguien se equivoca tres veces estando sin red: se envía una sola, la última.
{
  const c=montar();
  for(const t of ['TD','TN','DL'])
    await c.colaGuardar('tareaje',{id:1,personalId:7,fecha:'2026-09-10',tipo:t});
  es('sigue habiendo uno solo',await c.colaPendientes(),1);
  es('  con el último valor',[...c.datos.values()][0].record.tipo,'DL');
}

console.log('\n== Reenviar dos veces no crea dos filas ==');
// El id lo genera la aplicación y el upsert resuelve el conflicto contra la
// clave primaria: mandar lo mismo dos veces escribe la misma fila.
{
  const c=montar({inicial:{'combustible|9':{clave:'combustible|9',dbKey:'combustible',
    record:{id:9,gal:40},cuando:'2026-09-10T10:00:00Z'}}});
  const a=await c.colaVaciar();
  es('se envía',a.enviados,1);
  es('  y la cola queda vacía',a.pendientes,0);
  const b=await c.colaVaciar();
  es('un segundo intento no manda nada',b.enviados,0);
  es('  porque ya no hay qué mandar',c.enviados.length,1);
}

console.log('\n== Un rechazo del servidor NO se reintenta a ciegas ==');
// Si el servidor respondió y dijo que no, guardarlo para más tarde repetiría
// el mismo rechazo cada vez. Se queda en la cola pero no desaparece el error.
{
  const c=montar({rechaza:true,inicial:{'combustible|9':{clave:'combustible|9',
    dbKey:'combustible',record:{id:9},cuando:'z'}}});
  const a=await c.colaVaciar();
  es('no se da por enviado',a.enviados,0);
  es('  y sigue pendiente',a.pendientes,1);
}

console.log('\n== Sin red, se corta y se reintenta después ==');
{
  const c=montar({sinRed:true,inicial:{
    'combustible|1':{clave:'combustible|1',dbKey:'combustible',record:{id:1},cuando:'a'},
    'combustible|2':{clave:'combustible|2',dbKey:'combustible',record:{id:2},cuando:'b'}}});
  const a=await c.colaVaciar();
  es('no se envía nada',a.enviados,0);
  es('  y no se pierde ninguno',a.pendientes,2);
}

console.log('\n== El tareo no duplica lo que el servidor ya tiene ==');
// Dos personas tareando la misma celda desde equipos distintos generan ids
// distintos. Antes de insertar se pregunta si ya hay fila para esa persona y
// ese día, y si la hay se actualiza ESA. Es lo que hará el índice único de
// supabase/migrations/20260909235900, que todavía no se ha aplicado.
{
  const c=montar({yaExiste:{tareaje:[{id:555}]},inicial:{
    'tareaje|999':{clave:'tareaje|999',dbKey:'tareaje',
      record:{id:999,personalId:7,fecha:'2026-09-10',tipo:'TN'},cuando:'a'}}});
  await c.colaVaciar();
  es('se manda con el id que ya existía',c.enviados[0].registro.id,555);
  es('  y no con el suyo',c.enviados[0].registro.id!==999,true);
  es('  conservando lo que se tareó',c.enviados[0].registro.tipo,'TN');
}

console.log('\n== Si el servidor no tiene nada, se manda tal cual ==');
{
  const c=montar({yaExiste:{tareaje:[]},inicial:{
    'tareaje|999':{clave:'tareaje|999',dbKey:'tareaje',
      record:{id:999,personalId:7,fecha:'2026-09-10',tipo:'TN'},cuando:'a'}}});
  await c.colaVaciar();
  es('con su propio id',c.enviados[0].registro.id,999);
}

console.log('\n== Esa comprobación solo aplica donde hace falta ==');
// El combustible no tiene una identidad natural persona+día: pedirle al
// servidor una fila equivalente antes de cada envío sería una consulta de más
// por registro, y no evitaría nada.
{
  const c=montar({yaExiste:{combustible:[{id:777}]},inicial:{
    'combustible|9':{clave:'combustible|9',dbKey:'combustible',record:{id:9},cuando:'a'}}});
  await c.colaVaciar();
  es('el combustible va con su id',c.enviados[0].registro.id,9);
}
es('las tablas con identidad propia están declaradas',
   /COLA_UNICAS=\{tareaje:/.test(SRC),true);
es('  y son las mismas que el índice único de la migración',
   fs.readFileSync(R+'supabase/migrations/20260909235900_unicidad_tareaje_asistencia.sql','utf8')
     .includes('ux_asistencia_persona_fecha'),true);

console.log('\n== Al recargar, lo pendiente sigue en pantalla ==');
// Este es el agujero que quedaba: la cola guardaba el trabajo, pero al recargar
// DB se rellena desde Supabase —que todavía no tiene esos registros— y el tareo
// hecho sin red desaparecía de la grilla. La persona lo escribiría otra vez y
// ahí sí saldrían dos filas.
{
  const c=montar({DB:{tareaje:[]},inicial:{
    'tareaje|999':{clave:'tareaje|999',dbKey:'tareaje',
      record:{id:999,personalId:7,fecha:'2026-09-10',tipo:'TN'},cuando:'a'}}});
  const n=await c.colaAplicar();
  es('vuelve a la copia en memoria',n,1);
  es('  y se ve en la grilla',c.DB.tareaje.length,1);
  es('  con lo que se tareó',c.DB.tareaje[0].tipo,'TN');
  es('  marcado como sin enviar',c.colaPendiente('tareaje',999),true);
  es('  y solo ese',c.colaPendiente('tareaje',998),false);
}

console.log('\n== Lo pendiente pisa lo que vino del servidor ==');
// Si alguien corrigió la celda sin red, lo suyo es más nuevo que la fila que
// bajó de Supabase. Se aplica DESPUÉS de cargar precisamente por esto.
{
  const c=montar({DB:{tareaje:[{id:999,personalId:7,fecha:'2026-09-10',tipo:'TD'}]},
    inicial:{'tareaje|999':{clave:'tareaje|999',dbKey:'tareaje',
      record:{id:999,personalId:7,fecha:'2026-09-10',tipo:'DL'},cuando:'a'}}});
  await c.colaAplicar();
  es('no se agrega una fila más',c.DB.tareaje.length,1);
  es('  gana lo que no se pudo enviar',c.DB.tareaje[0].tipo,'DL');
}

console.log('\n== Aplicar dos veces no duplica ==');
// loadSheetsData corre en cada recarga y también al cambiar de período.
{
  const c=montar({DB:{tareaje:[]},inicial:{
    'tareaje|999':{clave:'tareaje|999',dbKey:'tareaje',record:{id:999,tipo:'TN'},cuando:'a'}}});
  await c.colaAplicar();
  await c.colaAplicar();
  es('sigue habiendo una sola fila',c.DB.tareaje.length,1);
}

console.log('\n== La marca no viaja a Supabase ==');
// Se pregunta por (tabla, id) en vez de marcar el propio registro: un campo de
// más sería una columna que no existe, y el upsert entero fallaría.
{
  const c=montar({DB:{tareaje:[]},inicial:{
    'tareaje|999':{clave:'tareaje|999',dbKey:'tareaje',
      record:{id:999,personalId:7,fecha:'2026-09-10',tipo:'TN'},cuando:'a'}}});
  await c.colaAplicar();
  es('el registro no gana campos',
     Object.keys(c.DB.tareaje[0]).sort().join(','),'fecha,id,personalId,tipo');
  await c.colaVaciar();
  es('  ni se manda ninguno de más',
     Object.keys(c.enviados[0].registro).sort().join(','),'fecha,id,personalId,tipo');
}

console.log('\n== Cuando por fin sale, deja de estar marcado ==');
{
  const c=montar({DB:{tareaje:[]},inicial:{
    'tareaje|999':{clave:'tareaje|999',dbKey:'tareaje',record:{id:999,tipo:'TN'},cuando:'a'}}});
  await c.colaAplicar();
  es('antes de enviar está marcado',c.colaPendiente('tareaje',999),true);
  await c.colaVaciar();
  es('  después ya no',c.colaPendiente('tareaje',999),false);
  es('  pero el dato sigue en pantalla',c.DB.tareaje.length,1);
}

console.log('\n== Y la marca no sobrevive a lo que ya no está en la cola ==');
// _colaPendientes se rehace en cada pasada. Si no, una celda podría quedar
// punteada para siempre.
{
  const c=montar({DB:{tareaje:[]},inicial:{
    'tareaje|999':{clave:'tareaje|999',dbKey:'tareaje',record:{id:999,tipo:'TN'},cuando:'a'}}});
  await c.colaAplicar();
  c.datos.delete('tareaje|999');
  await c.colaAplicar();
  es('deja de estar marcado',c.colaPendiente('tareaje',999),false);
}

console.log('\n== Una tabla que este cliente no tiene no rompe nada ==');
// Con el plan por módulos, DB solo trae las tablas contratadas. Un pendiente
// de un módulo que ya no está no debe reventar la carga.
{
  const c=montar({DB:{tareaje:[]},inicial:{
    'combustible|9':{clave:'combustible|9',dbKey:'combustible',record:{id:9},cuando:'a'}}});
  const n=await c.colaAplicar();
  es('no se aplica',n,0);
  es('  y no se marca',c.colaPendiente('combustible',9),false);
}

console.log('\n== El enganche al cargar los datos ==');
{
  const cfgA=fs.readFileSync(R+'js/config.js','utf8');
  const carga=cfgA.slice(cfgA.indexOf('async function loadSheetsData'));
  const fin=carga.indexOf('renderPage(AP)');
  es('se aplica lo pendiente al terminar de cargar',
     /colaAplicar\(\)/.test(carga.slice(0,fin)),true);
  es('  después de traer los datos, no antes',
     carga.indexOf('colaAplicar')>carga.indexOf('await Promise.all'),true);
  es('  y se avisa cuánto falta enviar',/sin enviar/.test(carga.slice(0,fin)),true);
  es('  con la cuenta que devuelve la cola',
     /n=await colaAplicar\(\)[\s\S]{0,160}if\(n\)toast/.test(carga),true);
}

console.log('\n== Y se ve cuál es cuál en el tareo ==');
{
  const tar=fs.readFileSync(R+'js/tareaje.js','utf8');
  es('la celda pendiente se distingue',/colaPendiente\('tareaje'/.test(tar),true);
  es('  y dice por qué',/Sin enviar/.test(tar),true);
  es('  con la apariencia común, no una copia',/COLA_MARCA_CSS/.test(tar),true);
}

console.log('\n== La marca es la misma en todos los módulos ==');
// Si cada módulo escribiera la suya, en un año habría cinco marcas distintas
// para lo mismo. colaMarca() devuelve los atributos ya armados.
{
  const c=montar({DB:{tareaje:[]},inicial:{
    'tareaje|999':{clave:'tareaje|999',dbKey:'tareaje',record:{id:999,tipo:'TN'},cuando:'a'}}});
  await c.colaAplicar();
  const m=c.colaMarca('tareaje',999);
  es('la fila pendiente lleva atributos',/style=/.test(m)&&/title=/.test(m),true);
  es('  y explica qué pasa',/Sin enviar/.test(m),true);
  es('la que no está pendiente no lleva nada',c.colaMarca('tareaje',998),'');
  es('  ni la de otra tabla con el mismo id',c.colaMarca('combustible',999),'');
}

console.log('\n== Lo capturado en faena se ve pendiente en su módulo ==');
// La cola ya cubría el GUARDADO de todos estos, porque syncSheet pasa por
// supaUpsert. Lo que faltaba era que se notara en pantalla.
for(const[archivo,clave]of[['combustible.js','combustible'],['almacen.js','almacen'],
                           ['partesDiarios.js','partes']]){
  const src=fs.readFileSync(R+'js/'+archivo,'utf8');
  es(archivo+' marca sus filas',src.includes("colaMarca('"+clave+"'"),true);
}
// El atributo style de colaMarca se perdería sin avisar si el <tr> ya trae uno.
{
  let choques=0;
  for(const f of fs.readdirSync(R+'js').filter(n=>n.endsWith('.js'))){
    const src=fs.readFileSync(R+'js/'+f,'utf8');
    for(const tag of src.match(/<tr[^>]*colaMarca[^>]*>/g)||[])
      if(/style=/.test(tag))choques++;
  }
  es('ningún <tr> marcado trae ya su propio style',choques,0);
}
// cola.js es núcleo: colaMarca existe aunque el cliente no contrate el módulo.
{
  const arm=fs.readFileSync(R+'herramientas/armar.js','utf8');
  es('y colaMarca siempre está disponible',/'cola\.js'/.test(arm),true);
}

console.log('\n== Borrar sin red también espera ==');
// del() quita el registro de la pantalla y dice "Eliminado" sin esperar a
// supaDelete. Sin encolar el borrado, el registro reaparecía al recargar: la
// persona creía haberlo borrado y no.
{
  const c=montar({DB:{combustible:[{id:9,gal:40}]},inicial:{}});
  await c.colaGuardar('combustible',{id:9},{borrar:true});
  es('el borrado queda pendiente',await c.colaPendientes(),1);
  await c.colaAplicar();
  es('  y no reaparece al recargar',c.DB.combustible.length,0);
  await c.colaVaciar();
  es('  y al volver la red se borra de verdad',c.borrados.length,1);
  es('    ese y no otro',c.borrados[0].id,9);
  es('  sin haberlo escrito nunca',c.enviados.length,0);
}

console.log('\n== Borrar algo que aún no había salido no lo resucita ==');
// Comparten la clave tabla|id a propósito: el borrado reemplaza al pendiente
// de escritura. Si no, la cola crearía en el servidor un registro que la
// persona ya borró.
{
  const c=montar({DB:{combustible:[]},inicial:{}});
  await c.colaGuardar('combustible',{id:9,gal:40});
  await c.colaGuardar('combustible',{id:9},{borrar:true});
  es('queda un solo pendiente',await c.colaPendientes(),1);
  await c.colaVaciar();
  es('  y es el borrado',c.borrados.length,1);
  es('  nunca se escribe',c.enviados.length,0);
}

console.log('\n== Un borrado normal sigue siendo un borrado normal ==');
// Solo lo encolado con {borrar:true} borra. Un pendiente corriente escribe.
{
  const c=montar({DB:{combustible:[]},inicial:{
    'combustible|9':{clave:'combustible|9',dbKey:'combustible',record:{id:9,gal:40},cuando:'a'}}});
  await c.colaVaciar();
  es('se escribe',c.enviados.length,1);
  es('  y no se borra nada',c.borrados.length,0);
}

console.log('\n== Un requerimiento no cabe en un upsert ==');
// Son tres tablas y la de enlace necesita el id que devuelve la primera, así
// que este camino no pasa por supaUpsert. Hasta ahora un corte de red lo
// perdía sin un solo aviso: console.warn y nada más.
{
  const c=montar({DB:{requerimientos:[]},inicial:{}});
  await c.colaGuardar('requerimientos',{id:5,num:'RQ-001',items:[{cod:'A',desc:'Cemento'}]},
                      {requerimiento:true});
  await c.colaAplicar();
  es('el requerimiento no se pierde',c.DB.requerimientos.length,1);
  es('  con sus ítems',c.DB.requerimientos[0].items.length,1);
  await c.colaVaciar();
  es('  y al volver la red se rehace la secuencia',c.reqs.length,1);
  es('    entera, no solo la cabecera',(c.reqs[0].items||[]).length,1);
  es('  sin pasar por el upsert normal',c.enviados.length,0);
  es('  y sale de la cola',await c.colaPendientes(),0);
}

console.log('\n== Si la red sigue caída, el requerimiento se queda ==');
// Un Error lo lanzó fetch: no hubo respuesta, se reintenta.
{
  const c=montar({DB:{requerimientos:[]},inicial:{
    'requerimientos|5':{clave:'requerimientos|5',dbKey:'requerimientos',
      requerimiento:true,record:{id:5,num:'RQ-001'},cuando:'a'}}});
  c.req.falla=new TypeError('Failed to fetch');
  const a=await c.colaVaciar();
  es('no se da por enviado',a.enviados,0);
  es('  y sigue pendiente',a.pendientes,1);
}

console.log('\n== Si el servidor lo rechaza, no se reintenta a ciegas ==');
// Un objeto plano {message} vino del servidor: reintentarlo repetiría el mismo
// rechazo para siempre. Es la misma regla que en supaUpsert.
{
  const c=montar({DB:{requerimientos:[]},inicial:{
    'requerimientos|5':{clave:'requerimientos|5',dbKey:'requerimientos',
      requerimiento:true,record:{id:5,num:'RQ-001'},cuando:'a'}}});
  c.req.falla={message:'columna inexistente'};
  const a=await c.colaVaciar();
  es('no se da por enviado',a.enviados,0);
  es('  y se queda para revisarlo',a.pendientes,1);
  es('  pero no se confunde con un corte',c.reqs.length,0);
}

console.log('\n== Un corte de red detiene la pasada ==');
// Si la red se cayó, seguir intentando los demás es tiempo perdido y ruido en
// la consola. Se corta y se reintenta entero más tarde.
{
  const c=montar({DB:{requerimientos:[],combustible:[]},inicial:{
    'requerimientos|5':{clave:'requerimientos|5',dbKey:'requerimientos',
      requerimiento:true,record:{id:5},cuando:'a'},
    'combustible|9':{clave:'combustible|9',dbKey:'combustible',record:{id:9},cuando:'b'}}});
  c.req.falla=new TypeError('Failed to fetch');
  await c.colaVaciar();
  es('no se intenta lo que venía detrás',c.enviados.length,0);
  es('  y los dos siguen pendientes',await c.colaPendientes(),2);
}

console.log('\n== La rama del requerimiento no depende de SUPA_TABLES ==');
// No se dirige a una sola tabla, así que pedirle una lo descartaría antes de
// llegar a su rama, y se perdería de la cola sin haberse enviado.
{
  const c=montar({tablas:{combustible:'combustible'},DB:{requerimientos:[]},inicial:{
    'requerimientos|5':{clave:'requerimientos|5',dbKey:'requerimientos',
      requerimiento:true,record:{id:5,num:'RQ-001'},cuando:'a'}}});
  await c.colaVaciar();
  es('se envía igual',c.reqs.length,1);
  es('  y no se descarta en silencio',await c.colaPendientes(),0);
}

console.log('\n== El enganche en supaGuardarRequerimiento ==');
{
  const cfgC=fs.readFileSync(R+'js/config.js','utf8');
  const bq=cfgC.slice(cfgC.indexOf('async function supaGuardarRequerimiento'),
                      cfgC.indexOf('async function loadSheetsData'));
  es('un fallo de red lo encola entero',/requerimiento:true/.test(bq),true);
  es('  y por fin se avisa',/el requerimiento se enviará al volver la red/.test(bq),true);
  es('antes se perdía en silencio: ya no',/console\.warn\('\[Req\]',e\);\}\n\}/.test(cfgC),false);
  es('un rechazo del servidor se devuelve, no se encola',/return re;/.test(bq),true);
}

console.log('\n== El enganche en supaDelete ==');
{
  const cfgB=fs.readFileSync(R+'js/config.js','utf8');
  const bloqueDel=cfgB.slice(cfgB.indexOf('async function supaDelete'),
                             cfgB.indexOf('function syncSheet'));
  es('un fallo de red encola el borrado',/borrar:true/.test(bloqueDel),true);
  es('  y se dice que se hará después',/se eliminará al volver la red/.test(bloqueDel),true);
  es('un rechazo del servidor NO se encola',
     bloqueDel.indexOf('colaGuardar')>bloqueDel.indexOf('Error al eliminar: '),true);
}

console.log('\n== El enganche en supaUpsert ==');
const cfg=fs.readFileSync(R+'js/config.js','utf8');
const bloque=cfg.slice(cfg.indexOf('async function supaUpsert'),cfg.indexOf('async function supaDelete'));
es('un fallo de red va a la cola',/colaGuardar\(dbKey,record\)/.test(bloque),true);
es('  y se avisa que se enviará después',/se enviará al volver la red/.test(bloque),true);
es('un rechazo del servidor NO va a la cola',
   bloque.indexOf('colaGuardar')>bloque.indexOf('Error al guardar'),true);
es('sin id no se encola',/record\.id!==undefined/.test(bloque),true);

console.log('\n== Se reintenta solo ==');
es('cuando vuelve la red',/addEventListener\('online'/.test(SRC),true);
es('  y al abrir la aplicación',/addEventListener\('load'/.test(SRC),true);
es('nunca dos envíos a la vez',/_colaEnviando/.test(SRC),true);

console.log('\n== Y se ve en pantalla ==');
// Nadie debe descubrir que tiene trabajo sin enviar al día siguiente.
es('hay un aviso con la cuenta',/sin enviar/.test(SRC),true);
es('  y se puede reintentar a mano',/Reenviar ahora/.test(SRC),true);
es('  sin tocar index.html',/createElement\('button'\)/.test(SRC),true);

console.log('\n== Está cargado siempre, no según el plan ==');
const html=fs.readFileSync(R+'index.html','utf8');
es('cola.js va en el núcleo',/<script src="js\/cola\.js/.test(html),true);
es('  antes que el cargador',html.indexOf('js/cola.js')<html.indexOf('js/cargador.js'),true);
es('  y después de config.js, que le da supa',
   html.indexOf('js/cola.js')>html.indexOf('js/config.js'),true);
const arm=fs.readFileSync(R+'herramientas/armar.js','utf8');
es('armar.js lo trata como núcleo',/'cola\.js'/.test(arm),true);

console.log('\n'+(mal?'X '+mal+' fallo(s)':'OK todo bien')+'  ·  '+ok+'/'+(ok+mal));
process.exit(mal?1:0);

})();
