// ══ CLAVE NUEVA PARA UNA PERSONA ═══════════════════════════════════════════
// Para quien olvidó su clave. Le genera una nueva en Supabase Auth y la anota
// al final de herramientas/credenciales-nuevas.txt (sin borrar lo que hay).
//
//   node herramientas/nuevaClave.js --solo ANDMAR --simular   qué haría
//   node herramientas/nuevaClave.js --solo ANDMAR             lo hace
//
// Solo cambia la contraseña de ESA persona. No toca sus permisos, su email
// ni a nadie más. La clave anterior deja de funcionar en ese momento.
//
// El acceso queda:   Código: ANDMAR      Clave: la que imprime este script

const fs=require('fs');
const path=require('path');
const crypto=require('crypto');

const CRED=path.join(__dirname,'.credenciales.json');
const SALIDA=path.join(__dirname,'credenciales-nuevas.txt');
const NL='\n';
const _E=String.fromCharCode(27);
const C={verde:_E+'[32m',ambar:_E+'[33m',gris:_E+'[90m',rojo:_E+'[31m',fin:_E+'[0m'};

const SIMULAR=process.argv.includes('--simular');
const iSolo=process.argv.indexOf('--solo');
const SOLO=iSolo>-1?String(process.argv[iSolo+1]||'').trim().toUpperCase():'';

// El mismo formato de las credenciales ya repartidas: CODIGO-XXXXXX
const ALFABETO='ABCDEFGHJKMNPQRSTUVWXYZ23456789';   // sin O 0 I 1 L
const sufijo=n=>Array.from({length:n},()=>ALFABETO[crypto.randomInt(ALFABETO.length)]).join('');

function credenciales(){
  let url=process.env.GDAR_URL,key=process.env.GDAR_SERVICE_KEY;
  if((!url||!key)&&fs.existsSync(CRED)){
    const c=JSON.parse(fs.readFileSync(CRED,'utf8'));
    url=url||c.url||c.maestra_url; key=key||c.service_key||c.maestra_service_key;
  }
  if(!url||!key){
    console.error(NL+'Faltan las credenciales del proyecto (herramientas/.credenciales.json).'+NL);
    process.exit(1);
  }
  return{url:url.replace(/\/+$/,''),key};
}

async function buscar(url,key,codigo){
  const r=await fetch(url+'/auth/v1/admin/users?per_page=200',{
    headers:{apikey:key,Authorization:'Bearer '+key}});
  if(!r.ok)throw new Error('HTTP '+r.status+' al listar usuarios');
  const j=await r.json();
  return ((j&&j.users)||[]).filter(u=>
    String((u.user_metadata||{}).codigo||'').toUpperCase()===codigo);
}

(async()=>{
  if(!SOLO){
    console.error(NL+'Indique a quién:  node herramientas/nuevaClave.js --solo CODIGO [--simular]'+NL);
    process.exit(1);
  }
  const{url,key}=credenciales();
  const hallados=await buscar(url,key,SOLO);
  if(hallados.length!==1){
    console.error(NL+C.rojo+(hallados.length?'Hay '+hallados.length+' usuarios con el código '
      :'No hay ningún usuario en Auth con el código ')+SOLO+C.fin+'. No se cambió nada.'+NL);
    process.exit(1);
  }
  const u=hallados[0], m=u.user_metadata||{};
  const clave=SOLO+'-'+sufijo(6);

  console.log(NL+'  Persona : '+(m.nombre||'?')+'  '+C.gris+'('+(m.cargo||'')+')'+C.fin);
  console.log('  Email   : '+u.email);
  if(u.banned_until&&new Date(u.banned_until)>new Date())
    console.log('  '+C.ambar+'Ojo: este usuario está bloqueado; la clave nueva no le servirá hasta desbloquearlo.'+C.fin);

  if(SIMULAR){
    console.log(NL+'  '+C.ambar+'(SIMULACIÓN)'+C.fin+' Se le pondría una clave nueva con la forma '+SOLO+'-XXXXXX.');
    console.log('  Sin --simular se aplica y se anota en herramientas/credenciales-nuevas.txt'+NL);
    return;
  }

  // Solo se envía la contraseña: permisos, email e id quedan como están.
  const r=await fetch(url+'/auth/v1/admin/users/'+u.id,{
    method:'PUT',
    headers:{apikey:key,Authorization:'Bearer '+key,'Content-Type':'application/json'},
    body:JSON.stringify({password:clave})});
  if(!r.ok)throw new Error('HTTP '+r.status+' · '+(await r.text()).slice(0,160));

  const fila=String(m.nombre||SOLO).padEnd(30)+String(m.cargo||'').padEnd(30)+clave
    +'   (clave nueva '+new Date().toLocaleDateString('es-PE')+')';
  fs.appendFileSync(SALIDA,(fs.existsSync(SALIDA)?NL:'')+fila);

  console.log(NL+'  '+C.verde+'Listo.'+C.fin+' Acceso de '+(m.nombre||SOLO)+':');
  console.log(NL+'     Código : '+SOLO);
  console.log('     Clave  : '+clave+NL);
  console.log('  Anotada en herramientas/credenciales-nuevas.txt. Entréguela por un canal privado.'+NL);
})().catch(e=>{console.error(NL+'Falló: '+e.message+NL);process.exit(1);});
