// ══ MIGRACIÓN A SUPABASE AUTH ═══════════════════════════════════════════════
// Crea en Supabase Auth un usuario por cada persona de js/empresa.js, con sus
// permisos guardados en user_metadata, y genera credenciales nuevas más largas.
//
//   node herramientas/migrarAuth.js --simular          qué haría, sin tocar nada
//   node herramientas/migrarAuth.js --solo EIBEL25     una sola persona
//   node herramientas/migrarAuth.js --listar           quien esta migrado y quien no
//   node herramientas/migrarAuth.js                    los que falten
//   node herramientas/migrarAuth.js --sincronizar      lleva a Auth los cambios
//                                                      de permisos de empresa.js
//   node herramientas/migrarAuth.js --bloquear COD     corta el acceso a alguien
//   node herramientas/migrarAuth.js --desbloquear COD  se lo devuelve
//
// --simular funciona con todos: muestra que haria, sin tocar nada.
//
// ── Por que hace falta sincronizar ─────────────────────────────────────────
// Los permisos de cada persona viven en su user_metadata de Auth y llegan
// firmados en el token. Editar js/empresa.js NO cambia lo que ve nadie: hay
// que empujar el cambio hasta Auth, y eso es lo que hace --sincronizar.
//
// Correrlo dos veces no duplica a nadie: antes de crear consulta quien ya
// esta en Auth y omite a esos.
//
// Conviene empezar por una sola —la suya— con el modo 'mixto' puesto en
// js/empresa.js: así prueba el circuito completo mientras los otros veinte
// siguen entrando como siempre.
//
// ── Por qué los permisos van en user_metadata ──────────────────────────────
// Hoy los 21 usuarios, con sus códigos y DNI, están dentro de js/empresa.js:
// un archivo que se descarga al navegador de cualquiera. Al moverlos a Auth,
// el archivo deja de contener credenciales y los permisos llegan firmados por
// el servidor dentro del token de sesión.
//
// ── La credencial ──────────────────────────────────────────────────────────
// Se conserva el código como prefijo, para que la persona reconozca el suyo, y
// se le añade un sufijo aleatorio. El resultado sirve a la vez de usuario y de
// contraseña: la persona sigue escribiendo UNA sola cosa en UN solo campo,
// igual que hoy. El alfabeto excluye O/0 e I/1/L para poder dictarlas por
// teléfono sin confusiones.
//
// ── Credenciales ───────────────────────────────────────────────────────────
// Necesita la service_role key del proyecto en herramientas/.credenciales.json
// (que .gitignore excluye):
//
//   { "url": "https://xxxx.supabase.co", "service_key": "<la service_role key>" }

const fs=require('fs');
const path=require('path');

const RAIZ=path.join(__dirname,'..');
const CRED=path.join(__dirname,'.credenciales.json');
const SALIDA=path.join(__dirname,'credenciales-nuevas.txt');
const NL='\n';

const SIMULAR=process.argv.includes('--simular');
// --solo <CODIGO> migra una sola persona: sirve para probar el circuito
// completo con el propio usuario antes de tocar a los demás.
const iSolo=process.argv.indexOf('--solo');
const SOLO=iSolo>-1?String(process.argv[iSolo+1]||'').toUpperCase():null;

// Colores de terminal. Se arman con fromCharCode(27) en vez de escribir el
// byte de escape directamente: suelto en el fuente es invisible al leerlo y
// facil de romper sin darse cuenta al editar el archivo.
const _E=String.fromCharCode(27);
const C={verde:_E+'[32m',ambar:_E+'[33m',gris:_E+'[90m',rojo:_E+'[31m',fin:_E+'[0m'};
const ALFABETO='ABCDEFGHJKMNPQRSTUVWXYZ23456789';   // sin O 0 I 1 L
const sufijo=n=>Array.from({length:n},()=>
  ALFABETO[Math.floor(Math.random()*ALFABETO.length)]).join('');

// El código puede traer puntos y guiones bajos (CP.BISA_, J_A_TA): se
// normaliza para que el email sea válido. doLogin hace exactamente lo mismo en
// _authEmail(); si las dos normalizaciones difirieran, nadie podría entrar.
const aEmail=cred=>cred.toLowerCase().replace(/[^a-z0-9]+/g,'-')
  .replace(/^-+|-+$/g,'')+'@gdarei.com';

function credenciales(){
  let url=process.env.GDAR_URL,key=process.env.GDAR_SERVICE_KEY;
  if((!url||!key)&&fs.existsSync(CRED)){
    const c=JSON.parse(fs.readFileSync(CRED,'utf8'));
    url=url||c.url||c.maestra_url; key=key||c.service_key||c.maestra_service_key;
  }
  if(!url||!key){
    console.error(
      NL+'Faltan las credenciales del proyecto.'+NL+NL+
      'Cree herramientas/.credenciales.json:'+NL+NL+
      '  { "url": "https://XXXX.supabase.co", "service_key": "<la service_role key>" }'+NL+NL+
      'Supabase → Settings → API → service_role.'+NL+
      'Ese archivo está en .gitignore y no debe subirse.'+NL);
    process.exit(1);
  }
  return{url:url.replace(/\/+$/,''),key};
}

// Lee los usuarios de js/empresa.js sin cargar el resto del sistema.
function leerUsuarios(){
  const src=fs.readFileSync(path.join(RAIZ,'js','empresa.js'),'utf8')
    .replace(/\(\(\)=>\{const el=[\s\S]*$/,'');           // quita el ajuste del logo
  const fn=new Function('document',src+';return EMPRESA_USERS;');
  const EU=fn({getElementById:()=>null});
  return EU(leerAreas());
}

function leerAreas(){
  const cfg=fs.readFileSync(path.join(RAIZ,'js','config.js'),'utf8');
  const bloque=cfg.match(/const AREAS=\{[\s\S]*?\n\};/);
  if(!bloque)throw new Error('No encontré AREAS en js/config.js');
  const A={};
  [...bloque[0].matchAll(/^  (\w+):\{/gm)].forEach(m=>{A[m[1]]=true;});
  return A;
}

// Los que ya estan en Auth. El email lleva un sufijo aleatorio, asi que no se
// puede adivinar: hay que preguntarle al servidor y mirar el codigo guardado
// en user_metadata.
async function usuariosExistentes(url,key){
  const r=await fetch(url+'/auth/v1/admin/users?per_page=200',{
    headers:{apikey:key,Authorization:'Bearer '+key}});
  if(!r.ok)throw new Error('HTTP '+r.status+' al listar usuarios');
  const j=await r.json();
  const lista=(j&&j.users)||[];
  const porCodigo=new Map();
  lista.forEach(u=>{
    const c=u.user_metadata&&u.user_metadata.codigo;
    if(c)porCodigo.set(String(c).toUpperCase(),u);
  });
  return{lista,porCodigo};
}

async function crearUsuario(url,key,email,password,metadata){
  const r=await fetch(url+'/auth/v1/admin/users',{
    method:'POST',
    headers:{apikey:key,Authorization:'Bearer '+key,'Content-Type':'application/json'},
    body:JSON.stringify({email,password,email_confirm:true,user_metadata:metadata})
  });
  const txt=await r.text();
  if(!r.ok)throw new Error('HTTP '+r.status+' · '+txt.slice(0,180));
  return JSON.parse(txt);
}

// Supabase agrega campos suyos a user_metadata (email_verified y demas). No
// son permisos nuestros: ni cuentan como diferencia ni deben perderse al
// actualizar, asi que se conservan tal cual.
const SUPABASE_PONE=['email_verified','phone_verified','email','phone','sub',
  'provider','providers'];

// Los campos de un usuario que la aplicacion lee de CU.
function metaDe(u){
  const m={dni:u.dni,nombre:u.nombre,cargo:u.cargo,codigo:u.codigo,areas:u.areas};
  ['areaModules','readOnlyModules','excludeModules','modules','pizarraTabs','panelHorasTabs',
   'admin'].forEach(k=>{if(u[k]!==undefined)m[k]=u[k];});
  return m;
}

// Diferencias en lenguaje llano. Los arrays se muestran como altas y bajas,
// que es como se piensan los permisos; el resto, como "antes -> despues".
function diferencias(viejo,nuevo){
  const d=[];
  const claves=[...new Set([...Object.keys(viejo||{}),...Object.keys(nuevo||{})])]
    .filter(k=>!SUPABASE_PONE.includes(k));
  claves.forEach(k=>{
    const a=(viejo||{})[k], b=(nuevo||{})[k];
    if(JSON.stringify(a)===JSON.stringify(b))return;
    if(Array.isArray(a)||Array.isArray(b)){
      const A=a||[],B=b||[];
      const mas=B.filter(x=>!A.includes(x)), menos=A.filter(x=>!B.includes(x));
      const t=[...mas.map(x=>'+'+x),...menos.map(x=>'-'+x)].join(' ');
      if(t)d.push(k+': '+t);
    }else if(a&&b&&typeof a==='object'&&typeof b==='object'){
      [...new Set([...Object.keys(a),...Object.keys(b)])].forEach(sub=>{
        if(JSON.stringify(a[sub])===JSON.stringify(b[sub]))return;
        const A=a[sub]||[],B=b[sub]||[];
        const mas=(Array.isArray(B)?B:[]).filter(x=>!A.includes(x));
        const menos=(Array.isArray(A)?A:[]).filter(x=>!B.includes(x));
        const t=[...mas.map(x=>'+'+x),...menos.map(x=>'-'+x)].join(' ');
        d.push(k+'.'+sub+': '+(t||JSON.stringify(a[sub])+' -> '+JSON.stringify(b[sub])));
      });
    }else{
      d.push(k+': '+JSON.stringify(a)+' -> '+JSON.stringify(b));
    }
  });
  return d;
}

async function actualizarMeta(url,key,id,meta){
  const r=await fetch(url+'/auth/v1/admin/users/'+id,{
    method:'PUT',
    headers:{apikey:key,Authorization:'Bearer '+key,'Content-Type':'application/json'},
    body:JSON.stringify({user_metadata:meta})});
  if(!r.ok)throw new Error('HTTP '+r.status+' · '+(await r.text()).slice(0,160));
}

// Banear en vez de borrar: si fue un error, se revierte con --desbloquear y la
// persona conserva su clave. Borrar seria irreversible.
async function banear(url,key,id,dur){
  const r=await fetch(url+'/auth/v1/admin/users/'+id,{
    method:'PUT',
    headers:{apikey:key,Authorization:'Bearer '+key,'Content-Type':'application/json'},
    body:JSON.stringify({ban_duration:dur})});
  if(!r.ok)throw new Error('HTTP '+r.status+' · '+(await r.text()).slice(0,160));
}

async function sincronizar(){
  const{url,key}=credenciales();
  const todos=leerUsuarios();
  const{porCodigo,lista}=await usuariosExistentes(url,key);

  const cambios=[],iguales=[];
  todos.forEach(u=>{
    const y=porCodigo.get(String(u.codigo).toUpperCase());
    if(!y)return;                                    // aun no migrado
    // Se parte de lo que Supabase ya tiene y encima van nuestros campos: asi
    // no se pierde email_verified ni nada que gestione el propio servicio.
    const suyos={};
    SUPABASE_PONE.forEach(k=>{if((y.user_metadata||{})[k]!==undefined)suyos[k]=y.user_metadata[k];});
    const nuevo={...suyos,...metaDe(u)};
    const d=diferencias(y.user_metadata||{},nuevo);
    if(d.length)cambios.push({u,y,nuevo,d}); else iguales.push(u);
  });

  const pendientes=todos.filter(u=>!porCodigo.has(String(u.codigo).toUpperCase()));
  const enArchivo=new Set(todos.map(u=>String(u.codigo).toUpperCase()));
  const huerfanos=lista.filter(x=>{
    const c=x.user_metadata&&x.user_metadata.codigo;
    return c&&!enArchivo.has(String(c).toUpperCase());
  });

  console.log(NL+'Sincronizar permisos'+(SIMULAR?'   '+C.ambar+'(SIMULACION)'+C.fin:'')+NL);

  if(!cambios.length)console.log('  '+C.verde+'Todo al dia'+C.fin+': los '+iguales.length+' coinciden con js/empresa.js');
  else{
    cambios.forEach(c=>{
      console.log('  '+C.ambar+c.u.nombre+C.fin);
      c.d.forEach(x=>console.log('      '+x));
    });
    console.log(NL+'  '+cambios.length+' con cambios · '+iguales.length+' sin novedad');
  }

  if(pendientes.length){
    console.log(NL+'  '+C.gris+'Aun no migrados ('+pendientes.length+'): '
      +pendientes.map(u=>u.codigo).join(', ')+C.fin);
    console.log('  '+C.gris+'Para crearlos: node herramientas/migrarAuth.js'+C.fin);
  }

  if(huerfanos.length){
    console.log(NL+'  '+C.rojo+'En Auth pero ya no en js/empresa.js:'+C.fin);
    huerfanos.forEach(x=>{
      const c=x.user_metadata.codigo;
      const ban=x.banned_until&&new Date(x.banned_until)>new Date();
      console.log('    '+(x.user_metadata.nombre||c)+'   '+String(c).padEnd(12)
        +(ban?C.gris+'ya bloqueado'+C.fin
             :C.rojo+'SIGUE PUDIENDO ENTRAR'+C.fin+'   --bloquear '+c));
    });
  }

  if(SIMULAR){
    if(cambios.length)console.log(NL+'  Sin --simular se aplicarian estos '+cambios.length+' cambios.'+NL);
    else console.log('');
    return;
  }
  if(!cambios.length){console.log('');return;}

  console.log('');
  let ok=0;const fallos=[];
  for(const c of cambios){
    process.stdout.write('  '+c.u.nombre.padEnd(26));
    try{await actualizarMeta(url,key,c.y.id,c.nuevo);ok++;console.log(C.verde+'OK'+C.fin);}
    catch(e){fallos.push({c,e:e.message});console.log(C.rojo+'ERROR'+C.fin+'  '+e.message.slice(0,80));}
  }
  console.log(NL+'  '+ok+' actualizado(s)'+(fallos.length?' · '+fallos.length+' con error':''));
  console.log('  '+C.gris+'Cada persona vera el cambio la proxima vez que inicie sesion.'+C.fin+NL);
}

async function cambiarBloqueo(cod,bloquear){
  const{url,key}=credenciales();
  const{porCodigo}=await usuariosExistentes(url,key);
  const y=porCodigo.get(String(cod).toUpperCase());
  if(!y){
    console.error(NL+'No hay ningun usuario en Auth con el codigo "'+cod+'".'+NL);
    process.exit(1);
  }
  const quien=(y.user_metadata&&y.user_metadata.nombre)||cod;
  if(SIMULAR){
    console.log(NL+'  '+(bloquear?'Se bloquearia':'Se desbloquearia')+' a '+quien+' ('+y.email+')'+NL);
    return;
  }
  // 100 anos equivale a indefinido; 'none' lo levanta.
  await banear(url,key,y.id,bloquear?'876000h':'none');
  console.log(NL+'  '+(bloquear?C.rojo+'Bloqueado'+C.fin:C.verde+'Desbloqueado'+C.fin)+': '+quien);
  console.log('  '+C.gris+(bloquear
    ?'Conserva su clave. Para devolverle el acceso: --desbloquear '+cod
    :'Ya puede entrar con su clave de siempre.')+C.fin+NL);
}

(async()=>{
  const todos=leerUsuarios();

  if(process.argv.includes('--sincronizar')){await sincronizar();return;}
  const iB=process.argv.indexOf('--bloquear'), iD=process.argv.indexOf('--desbloquear');
  if(iB>-1||iD>-1){
    const cod=process.argv[(iB>-1?iB:iD)+1];
    // Sin esta guarda, "--bloquear --simular" tomaria "--simular" como codigo
    if(!cod||cod.startsWith('--')){
      console.error(NL+'Falta el codigo de la persona. Ej: --bloquear OMARS'+NL);
      process.exit(1);
    }
    await cambiarBloqueo(cod,iB>-1);
    return;
  }


  if(process.argv.includes('--listar')){
    const{url,key}=credenciales();
    const{porCodigo}=await usuariosExistentes(url,key);
    console.log(NL+'Estado de la migracion'+NL);
    todos.forEach(u=>{
      const y=porCodigo.get(String(u.codigo).toUpperCase());
      console.log('  '+(y?''+C.verde+'migrado '+C.fin+'':''+C.ambar+'pendiente'+C.fin+'')
        +' '+u.nombre.padEnd(26)+(y?''+C.gris+''+y.email+''+C.fin+'':''));
    });
    const n=todos.filter(u=>porCodigo.has(String(u.codigo).toUpperCase())).length;
    console.log(NL+'  '+n+' de '+todos.length+' migrados'+NL);
    return;
  }

  let usuarios=todos;
  if(SOLO){
    usuarios=todos.filter(u=>String(u.codigo).toUpperCase()===SOLO);
    if(!usuarios.length){
      console.error(NL+'No hay ningún usuario con el código "'+SOLO+'".');
      console.error('Códigos disponibles: '+todos.map(u=>u.codigo).join(', ')+NL);
      process.exit(1);
    }
  }

  console.log(NL+usuarios.length+(SOLO?' usuario (--solo '+SOLO+')':' usuarios en js/empresa.js')
    +(SIMULAR?'   \x1b[33m(SIMULACIÓN — no se crea nada)\x1b[0m':'')+NL);

  const plan=usuarios.map(u=>{
    const cred=u.codigo+'-'+sufijo(6);
    // Todo lo que la aplicación lee de CU, menos la credencial misma
    const meta={dni:u.dni,nombre:u.nombre,cargo:u.cargo,codigo:u.codigo,areas:u.areas};
    ['areaModules','readOnlyModules','excludeModules','modules','pizarraTabs','panelHorasTabs']
      .forEach(k=>{if(u[k]!==undefined)meta[k]=u[k];});
    return{u,cred,email:aEmail(cred),meta};
  });

  // Dos personas con el mismo email sería un choque silencioso
  const emails=plan.map(p=>p.email);
  const repetidos=[...new Set(emails.filter((e,i)=>emails.indexOf(e)!==i))];
  if(repetidos.length){
    console.error('Emails repetidos, revise los códigos: '+repetidos.join(', '));
    process.exit(1);
  }

  if(SIMULAR){
    plan.forEach(p=>console.log('  '+p.u.nombre.padEnd(26)
      +p.cred.padEnd(18)+'\x1b[90m'+p.email+'\x1b[0m'));
    console.log(NL+'  Sin --simular se crearía'+(plan.length>1?'n':'')+' '+plan.length
      +' usuario(s) en Supabase Auth.');
    console.log('  Las credenciales quedarían en herramientas/credenciales-nuevas.txt'+NL);
    return;
  }

  const{url,key}=credenciales();

  // Nadie debe quedar con dos usuarios: el segundo tendria otra credencial y
  // la persona no sabria cual de las dos vale.
  const{porCodigo}=await usuariosExistentes(url,key);
  const yaEstaban=plan.filter(p=>porCodigo.has(String(p.u.codigo).toUpperCase()));
  const porCrear =plan.filter(p=>!porCodigo.has(String(p.u.codigo).toUpperCase()));
  if(yaEstaban.length){
    console.log('  '+C.gris+'Ya migrados, se omiten: '
      +yaEstaban.map(p=>p.u.codigo).join(', ')+''+C.fin+''+NL);
  }
  if(!porCrear.length){
    console.log('  No queda nadie por migrar.'+NL);
    return;
  }

  const hechos=[],fallidos=[];
  for(const p of porCrear){
    process.stdout.write('  '+p.u.nombre.padEnd(26));
    try{
      await crearUsuario(url,key,p.email,p.cred,p.meta);
      hechos.push(p);
      console.log('\x1b[32mOK\x1b[0m   '+p.cred);
    }catch(e){
      fallidos.push({p,e:e.message});
      console.log('\x1b[31mERROR\x1b[0m  '+e.message.slice(0,90));
    }
  }

  if(hechos.length){
    const filas=hechos.map(p=>p.u.nombre.padEnd(30)+p.u.cargo.padEnd(30)+p.cred);
    // Con --solo se anexa: si no, cada corrida borraría lo generado antes
    if(SOLO&&fs.existsSync(SALIDA))fs.appendFileSync(SALIDA,NL+filas.join(NL));
    else fs.writeFileSync(SALIDA,[
      'CREDENCIALES DE ACCESO · GDAR',
      'Generadas el '+new Date().toLocaleString('es-PE'),
      '',
      'Cada persona escribe SU credencial completa en el campo de acceso.',
      'Entréguela por un canal privado. Este archivo no se sube al repositorio.',
      '',...filas].join(NL));
  }

  console.log(NL+'  '+hechos.length+' creado(s)'
    +(fallidos.length?' · '+fallidos.length+' con error':''));
  if(hechos.length)console.log('  Credenciales en herramientas/credenciales-nuevas.txt'+NL);
  if(fallidos.length){
    console.log(NL+'  Con error:');
    fallidos.forEach(f=>console.log('    '+f.p.u.nombre+': '+f.e.slice(0,110)));
    console.log('');
  }
})().catch(e=>{console.error(NL+'Falló: '+e.message+NL);process.exit(1);});
