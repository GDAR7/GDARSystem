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
  const avisos=[];
  const supa={
    from:t=>({
      select:()=>({eq(){return this;},limit:async()=>({data:(op.yaExiste&&op.yaExiste[t])||[],error:null})}),
      upsert:async r=>{
        if(op.sinRed)throw new TypeError('Failed to fetch');
        enviados.push({tabla:t,registro:r});
        return{error:op.rechaza?{message:'rechazado'}:null};
      }
    })
  };
  const ctx={
    indexedDB:idb, supa,
    SUPA_TABLES:{tareaje:'tareaje',asistencia:'asistencia',combustible:'combustible'},
    toSnake:o=>o,
    toast:m=>avisos.push(String(m)),
    document:undefined, window:undefined,
    console:{warn(){},info(){}}
  };
  const api=new Function('indexedDB','supa','SUPA_TABLES','toSnake','toast',
    'document','window','console',
    SRC+';return{colaGuardar,colaListar,colaPendientes,colaVaciar};')(
    ctx.indexedDB,ctx.supa,ctx.SUPA_TABLES,ctx.toSnake,ctx.toast,
    ctx.document,ctx.window,ctx.console);
  return Object.assign(api,{datos,enviados,avisos});
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
