// ══ EL SERVICE WORKER ═══════════════════════════════════════════════════════
// Hace que la aplicación abra sin red: en faena la conexión se cae y sin esto
// no se ve ni la pantalla de acceso.
//
// Un service worker mal hecho es de las cosas más difíciles de deshacer: si
// sirve código viejo, el usuario queda atrapado en una versión y no hay forma
// de sacarlo desde el servidor. Lo que esta suite comprueba es justo eso, y
// que nunca guarde datos de la empresa.
//
// Se ejecuta sw.js con un entorno de mentira —caches, fetch, self— y se le
// lanzan peticiones inventadas para ver qué decide con cada una. Es mejor que
// abrirlo en un navegador: aquí sí se puede afirmar que Supabase NO se toca.

const fs=require('fs');
const R=require('path').join(__dirname,'..')+'/';

let ok=0,mal=0;
const es=(l,g,e)=>{const b=String(g)===String(e);b?ok++:mal++;
  console.log((b?'  OK  ':'  MAL ')+l.padEnd(58)+'= '+g+(b?'':'  (esperado '+e+')'));};

const SRC=fs.readFileSync(R+'sw.js','utf8');

// ── El entorno de mentira ──────────────────────────────────────────────────
function montar(opciones){
  opciones=opciones||{};
  const fuente=opciones.fuente||SRC;
  const guardado={};                      // lo que quedó en la caché
  const almacenes=new Set(opciones.almacenes||[]);
  const registro={desregistrado:false};
  const pedidosReales=[];                 // qué llegó a salir a la red
  const oyentes={};

  const respuesta=(cuerpo,extra)=>Object.assign(
    {ok:true,type:'basic',clone(){return this;},_cuerpo:cuerpo},extra||{});

  const caches={
    async open(nombre){
      almacenes.add(nombre);
      return{ async put(k,v){ guardado[String(k&&k.url||k)]=v; },
              async addAll(l){ l.forEach(u=>{guardado[u]=respuesta('cascaron');}); } };
    },
    async keys(){ return[...almacenes]; },
    async delete(n){ return almacenes.delete(n); },
    async match(r){ return guardado[String(r&&r.url||r)]||undefined; }
  };

  const self={
    location:{origin:'https://ecosermo.gdarei.com'},
    addEventListener:(t,f)=>{ (oyentes[t]=oyentes[t]||[]).push(f); },
    registration:{ async unregister(){ registro.desregistrado=true; return true; } },
    clients:{ async matchAll(){ return[]; }, async claim(){ return true; } },
    caches
  };

  const fetchFalso=async req=>{
    pedidosReales.push(String(req&&req.url||req));
    if(opciones.sinRed)throw new Error('sin red');
    return respuesta('de la red');
  };

  new Function('self','caches','fetch','Response','URL','console',fuente)(
    self,caches,fetchFalso,
    {error:()=>({ok:false,_cuerpo:'error'})},
    URL,{log(){},warn(){}});

  return{oyentes,guardado,almacenes,registro,pedidosReales,respuesta,
    // Lanza un fetch y devuelve qué hizo el service worker
    async pedir(url,extra){
      const req=Object.assign({url,method:'GET',mode:'no-cors'},extra||{});
      let respondio=false,valor=null;
      const ev={request:req,respondWith(p){respondio=true;valor=p;},waitUntil(p){return p;}};
      for(const f of (oyentes.fetch||[]))f(ev);
      if(respondio)valor=await valor;
      return{respondio,valor};
    },
    async activar(){
      for(const f of (oyentes.activate||[])){
        let p=null; f({waitUntil(x){p=x;}}); if(p)await p;
      }
    },
    async instalar(){
      for(const f of (oyentes.install||[])){
        let p=null; f({waitUntil(x){p=x;}}); if(p)await p;
      }
    }
  };
}

(async()=>{
const S='https://ecosermo.gdarei.com/';

console.log('\n== Los datos de la empresa NUNCA se guardan ==');
// Es lo más importante de todo. Una respuesta de Supabase guardada podría
// acabar en el navegador de otra persona que use el mismo equipo, y viaja con
// la sesión iniciada.
{
  const w=montar();
  const a=await w.pedir('https://kotqxhpkjuaxbgwhiode.supabase.co/rest/v1/personal?select=*');
  es('una consulta a Supabase se deja pasar',a.respondio,false);
  const b=await w.pedir('https://kotqxhpkjuaxbgwhiode.supabase.co/auth/v1/token');
  es('  y la autenticación también',b.respondio,false);
  es('nada de eso quedó guardado',Object.keys(w.guardado).length,0);
  // Está protegido dos veces: por la regla explícita y porque la lista de lo
  // que sí se guarda no incluye a Supabase. Quitar la regla no cambia el
  // comportamiento —se comprobó con una mutación— así que se comprueba que
  // siga ahí: es la que quedaría si mañana alguien amplía la lista.
  es('la regla explícita sigue en el código',/supabase/.test(SRC),true);
}

console.log('\n== Solo se interviene lo que se lee, no lo que se escribe ==');
{
  const w=montar();
  const a=await w.pedir(S+'js/config.js?v=689aea48',{method:'POST'});
  es('un POST se deja pasar',a.respondio,false);
}

console.log('\n== El índice va SIEMPRE a la red primero ==');
// Es lo que impide quedarse atrapado en una versión vieja: si hay conexión,
// se sirve la última.
{
  const w=montar();
  const a=await w.pedir(S,{mode:'navigate'});
  es('una navegación se atiende',a.respondio,true);
  es('  y salió a la red',w.pedidosReales.length,1);
  es('  guardando la copia para después',!!w.guardado['./index.html'],true);
}

console.log('\n== Con copia guardada Y red, gana la red ==');
// Éste es EL caso que impide quedarse atrapado en una versión vieja, y el que
// la primera versión de esta suite no cubría: con la caché vacía cualquier
// implementación parece correcta. Hay que probarlo con algo ya guardado.
{
  const w=montar();
  w.guardado['./index.html']=w.respuesta('el indice VIEJO');
  const a=await w.pedir(S,{mode:'navigate'});
  es('sale a la red igual',w.pedidosReales.length,1);
  es('  y responde lo de la red, no lo guardado',a.valor&&a.valor._cuerpo,'de la red');
  es('  y actualiza la copia',w.guardado['./index.html']._cuerpo,'de la red');
}

console.log('\n== Sin red, se sirve la copia guardada ==');
{
  const w=montar();
  await w.pedir(S,{mode:'navigate'});          // primero con red, para guardarla
  const sinRed=montar({sinRed:true});
  sinRed.guardado['./index.html']=sinRed.respuesta('el indice de antes');
  const a=await sinRed.pedir(S,{mode:'navigate'});
  es('se responde igual',a.respondio,true);
  es('  con lo que había guardado',a.valor&&a.valor._cuerpo,'el indice de antes');
}

console.log('\n== Lo sellado se sirve de la caché, y es seguro ==');
// Seguro porque el sello ES el contenido: si el archivo cambiara, la URL sería
// otra y no habría nada guardado con ese nombre.
{
  const w=montar();
  const a=await w.pedir(S+'js/config.js?v=689aea48');
  es('la primera vez sale a la red',w.pedidosReales.length,1);
  es('  y se guarda',!!w.guardado[S+'js/config.js?v=689aea48'],true);
  const b=await w.pedir(S+'js/config.js?v=689aea48');
  es('la segunda ya no sale',w.pedidosReales.length,1);
  es('  y responde igual',b.respondio,true);
}

console.log('\n== Lo que no lleva sello no se guarda ==');
// Un archivo sin sello podría cambiar sin que la URL cambie: guardarlo sería
// exactamente el error que este diseño evita.
{
  const w=montar();
  const a=await w.pedir(S+'js/config.js');
  es('sin ?v= se deja pasar',a.respondio,false);
  const b=await w.pedir(S+'algo.json');
  es('  y un dato suelto también',b.respondio,false);
}

console.log('\n== El logo y las librerías sí ==');
{
  const w=montar();
  const a=await w.pedir(S+'09.-ERP/Imagenes/ECOSERMO-LOGO.png');
  es('una imagen propia se guarda',a.respondio,true);
  const b=await w.pedir('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2');
  es('la librería de Supabase, también',b.respondio,true);
  es('  y las tipografías',(await w.pedir('https://fonts.gstatic.com/s/barlow/x.woff2')).respondio,true);
  es('pero no cualquier sitio',(await w.pedir('https://otro-dominio.com/x.js')).respondio,false);
}

console.log('\n== Al activarse, borra las cachés viejas ==');
{
  const w=montar({almacenes:['gdar-viejo1','gdar-viejo2','otra-cosa']});
  await w.activar();
  const quedan=[...w.almacenes];
  es('se van las gdar- anteriores',quedan.filter(n=>n.startsWith('gdar-')).length<=1,true);
  es('  y no toca cachés ajenas',quedan.includes('otra-cosa'),true);
}

console.log('\n== El interruptor de emergencia ==');
// Si algo sale mal: VERSION='desactivado', sellar, publicar. El service worker
// se borra a sí mismo en cada navegador que abra la aplicación.
{
  // No hace falta tocar el archivo: se monta el mismo código con la VERSION
  // cambiada. Una prueba que reescriba sw.js podría dejarlo apagado si algo
  // falla a mitad, y eso es justo lo que no se quiere.
  const apagado=SRC.replace(/const VERSION = '[^']*'/,"const VERSION = 'desactivado'");
  const w=montar({fuente:apagado,almacenes:['gdar-abc12345','gdar-otra']});
  await w.activar();
  es('se desregistra solo',w.registro.desregistrado,true);
  es('  y borra lo que había guardado',[...w.almacenes].filter(n=>n.startsWith('gdar-')).length,0);
  const a=await w.pedir(S+'js/config.js?v=abc12345');
  es('  y deja de intervenir',a.respondio,false);
}

console.log('\n== Está enganchado en la página ==');
const html=fs.readFileSync(R+'index.html','utf8');
es('index.html lo registra',/navigator\.serviceWorker\.register\('sw\.js'\)/.test(html),true);
es('  después de cargar, sin competir',/addEventListener\('load'/.test(html),true);
es('  y si falla, avisa sin romper nada',/no se pudo registrar/.test(html),true);
es('sw.js NO lleva sello en su URL',/serviceWorker\.register\('sw\.js\?/.test(html),false);

console.log('\n== El sello de la caché lo pone la herramienta ==');
const sel=fs.readFileSync(R+'herramientas/sellar.js','utf8');
es('sellar.js escribe la VERSION',/function sellarSW/.test(sel),true);
es('  y respeta el desactivado',/desactivado/.test(sel),true);
es('sw.js tiene un sello puesto',/const VERSION = '[a-f0-9]{8}'/.test(SRC),true);

console.log('\n'+(mal?'X '+mal+' fallo(s)':'OK todo bien')+'  ·  '+ok+'/'+(ok+mal));
process.exit(mal?1:0);

})();
