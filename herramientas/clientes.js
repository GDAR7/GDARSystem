// ══ REGISTRO DE CLIENTES DE GDAR ════════════════════════════════════════════
// Consulta y edita la tabla `clientes` de la base maestra: a qué empresas se
// les vendió el sistema, dónde vive cada una y en qué estado está.
//
//   node herramientas/clientes.js                    lista todos
//   node herramientas/clientes.js ver ecosermo       ve uno en detalle
//   node herramientas/clientes.js alta               da de alta (interactivo)
//   node herramientas/clientes.js estado <sub> baja  cambia el estado
//
// ── Las credenciales NO viven aquí ─────────────────────────────────────────
// Esta tabla guarda la URL de la base de cada cliente, así que está cerrada con
// RLS y solo se llega con la service_role key. Esa llave da acceso total y
// SALTA las políticas de seguridad: si se filtra, se filtra todo.
//
// El repositorio es público, así que la llave se lee del .env de la raíz, que
// .gitignore excluye:
//
//   GDAR_MAESTRA_URL=https://xxxx.supabase.co
//   GDAR_MAESTRA_KEY=<la service_role key de la base maestra>
//
// La plantilla, sin valores, es .env.example.

const fs=require('fs');
const path=require('path');
const readline=require('readline');

const{exigir}=require('./entorno');

function credenciales(){
  const[url,key]=exigir('GDAR_MAESTRA_URL','GDAR_MAESTRA_KEY');
  return{url:url.replace(/\/+$/,''),key};
}

async function api(ruta,opts){
  const{url,key}=credenciales();
  const r=await fetch(url+'/rest/v1/'+ruta,{
    ...opts,
    headers:{apikey:key,Authorization:'Bearer '+key,
      'Content-Type':'application/json',Prefer:'return=representation',
      ...(opts&&opts.headers||{})}
  });
  const txt=await r.text();
  if(!r.ok)throw new Error('HTTP '+r.status+' · '+txt.slice(0,200));
  return txt?JSON.parse(txt):[];
}

const C={v:'\x1b[32m',r:'\x1b[31m',a:'\x1b[33m',g:'\x1b[90m',n:'\x1b[1m',x:'\x1b[0m'};
const colorEstado=e=>e==='activo'?C.v:e==='suspendido'?C.a:C.r;
const dias=t=>t?Math.floor((Date.now()-new Date(t))/86400000):null;

async function listar(){
  const cl=await api('clientes?select=*&order=id');
  if(!cl.length){console.log('\nNo hay clientes registrados todavía.\n');return;}
  console.log('\n'+C.n+'Clientes de GDAR'+C.x+'  ·  '+cl.length+'\n');
  cl.forEach(c=>{
    const d=dias(c.ultimo_respaldo);
    const resp=d===null?C.r+'sin respaldo'+C.x
      :d>30?C.r+'respaldo hace '+d+' d'+C.x
      :d>7 ?C.a+'respaldo hace '+d+' d'+C.x
      :     C.v+'respaldo hace '+d+' d'+C.x;
    console.log('  '+colorEstado(c.estado)+'●'+C.x+' '+C.n+(c.nombre||'').padEnd(22)+C.x
      +(c.subdominio||'—').padEnd(26)+(c.plan||'—').padEnd(12)+resp);
  });
  const act=cl.filter(c=>c.estado==='activo').length;
  console.log('\n  '+act+' activo(s) de '+cl.length+'\n');
}

async function ver(busca){
  const cl=await api('clientes?select=*&order=id');
  const c=cl.find(x=>(x.subdominio||'').toLowerCase().includes(busca.toLowerCase())
                  ||(x.nombre||'').toLowerCase().includes(busca.toLowerCase()));
  if(!c){console.log('\nNo encontré ningún cliente que coincida con "'+busca+'".\n');process.exit(1);}
  console.log('\n'+C.n+c.nombre+C.x+'   '+colorEstado(c.estado)+c.estado+C.x+'\n');
  const f=(l,v)=>{if(v)console.log('  '+C.g+l.padEnd(16)+C.x+v);};
  f('RUC',c.ruc); f('Subdominio',c.subdominio); f('Repositorio',c.repo);
  f('Base de datos',c.supa_url); f('Proyecto',c.supa_proyecto);
  f('Alta',c.alta); f('Contacto',c.contacto); f('Email',c.email); f('Teléfono',c.telefono);
  f('Plan',c.plan);
  f('Alcance',(!c.areas&&!c.modulos)?'todo el sistema':[(c.areas||[]).length+' area(s)',(c.modulos||[]).length+' modulo(s) suelto(s)'].join(' + '));
  f('Mensualidad',c.mensualidad?((c.moneda||'PEN')+' '+c.mensualidad):null);
  const d=dias(c.ultimo_respaldo);
  f('Último respaldo',c.ultimo_respaldo?c.ultimo_respaldo.slice(0,10)+' ('+d+' días)':'nunca');
  if(c.notas)console.log('\n  '+C.g+'Notas'+C.x+'\n  '+c.notas.split('\n').join('\n  '));
  console.log('');
}

function preguntar(rl,q,def){
  return new Promise(res=>rl.question('  '+q+(def?' ['+def+']':'')+': ',
    a=>res(a.trim()||def||'')));
}

async function alta(){
  const rl=readline.createInterface({input:process.stdin,output:process.stdout});
  console.log('\n'+C.n+'Alta de cliente'+C.x+'  (Enter deja el campo vacío)\n');
  const c={};
  c.nombre=await preguntar(rl,'Nombre de la empresa');
  if(!c.nombre){console.log('\nSin nombre no se puede dar de alta.\n');rl.close();return;}
  c.ruc=await preguntar(rl,'RUC');
  const slug=c.nombre.toLowerCase().replace(/[^a-z0-9]+/g,'').slice(0,20);
  c.subdominio=await preguntar(rl,'Subdominio',slug+'.gdarei.com');
  c.repo=await preguntar(rl,'Repositorio','GDAR7/GDAR-'+slug);
  c.supa_url=await preguntar(rl,'URL de su Supabase');
  const m=(c.supa_url||'').match(/https:\/\/([a-z0-9]+)\.supabase\.co/);
  c.supa_proyecto=m?m[1]:'';
  c.plan=await preguntar(rl,'Plan (Base / Operación / Integral)','Integral');
  // Lo que se anota aquí es el registro comercial. Lo que la aplicación del
  // cliente lee de verdad es EMPRESA_PLAN en su js/empresa.js: los dos se
  // mantienen a mano en sincronía, porque la base de un cliente no alcanza a
  // la maestra, y esa separación es justamente lo que lo protege.
  const rec=await preguntar(rl,'¿Contrató todo el sistema? (s/n)','s');
  if(rec.toLowerCase().startsWith('n')){
    const a=await preguntar(rl,'Áreas contratadas, separadas por coma');
    const m=await preguntar(rl,'Módulos sueltos, separados por coma');
    const lista=s=>s.split(',').map(x=>x.trim()).filter(Boolean);
    if(a)c.areas=lista(a);
    if(m)c.modulos=lista(m);
    console.log('  '+C.a+'Recuerde poner el mismo recorte en EMPRESA_PLAN de su js/empresa.js'+C.x);
  }
  const mens=await preguntar(rl,'Mensualidad en soles');
  if(mens)c.mensualidad=+mens||null;
  c.contacto=await preguntar(rl,'Persona de contacto');
  c.email=await preguntar(rl,'Email');
  c.telefono=await preguntar(rl,'Teléfono');
  c.notas=await preguntar(rl,'Notas');
  rl.close();
  Object.keys(c).forEach(k=>{if(!c[k])delete c[k];});
  const [creado]=await api('clientes',{method:'POST',body:JSON.stringify(c)});
  console.log('\n'+C.v+'✓'+C.x+' '+creado.nombre+' dado de alta (id '+creado.id+')\n');
  console.log('  Siguiente: herramientas/NUEVO-CLIENTE.md tiene los pasos para montarlo.\n');
}

async function estado(sub,nuevo){
  const validos=['activo','suspendido','baja'];
  if(!validos.includes(nuevo)){
    console.log('\nEstado no válido. Use uno de: '+validos.join(', ')+'\n');process.exit(1);}
  const r=await api('clientes?subdominio=eq.'+encodeURIComponent(sub),
    {method:'PATCH',body:JSON.stringify({estado:nuevo})});
  if(!r.length){console.log('\nNo hay ningún cliente con el subdominio "'+sub+'".\n');process.exit(1);}
  console.log('\n'+C.v+'✓'+C.x+' '+r[0].nombre+' → '+colorEstado(nuevo)+nuevo+C.x+'\n');
}

(async()=>{
  const [cmd,a,b]=process.argv.slice(2);
  try{
    if(!cmd||cmd==='listar')      await listar();
    else if(cmd==='ver'&&a)       await ver(a);
    else if(cmd==='alta')         await alta();
    else if(cmd==='estado'&&a&&b) await estado(a,b);
    else{
      console.log('\n  node herramientas/clientes.js                      lista todos');
      console.log('  node herramientas/clientes.js ver <nombre|sub>     detalle de uno');
      console.log('  node herramientas/clientes.js alta                 da de alta');
      console.log('  node herramientas/clientes.js estado <sub> <est>   activo|suspendido|baja\n');
    }
  }catch(e){console.error('\n'+C.r+'Error'+C.x+': '+e.message+'\n');process.exit(1);}
})();
