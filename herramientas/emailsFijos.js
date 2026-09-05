// ══ EMAILS ESTABLES ═════════════════════════════════════════════════════════
// Cambia el email de cada usuario de Auth para que dependa SOLO de su código,
// sin el sufijo aleatorio:
//
//   eibel25-75mtxj@gdarei.com   →   eibel25@gdarei.com
//
//   node herramientas/emailsFijos.js --simular    qué haría, sin tocar nada
//   node herramientas/emailsFijos.js              lo hace
//
// ── Para qué ───────────────────────────────────────────────────────────────
// Hoy la credencial hace dos trabajos: es el usuario Y la contraseña. Por eso
// nadie puede cambiar su clave — al cambiarla, el email dejaría de coincidir.
//
// Con el email atado solo al código, que nunca cambia, la contraseña queda
// libre y cada persona puede fijar la suya.
//
// ── Lo que NO cambia ───────────────────────────────────────────────────────
// La contraseña de cada usuario se conserva intacta: la credencial que ya
// repartió sigue funcionando. Tampoco cambian los permisos ni el id interno,
// así que no hay nada que volver a repartir.
//
// Después de esto, el acceso pasa a ser:
//   Código: EIBEL25          Clave: la credencial que ya tiene

const fs=require('fs');
const path=require('path');

const CRED=path.join(__dirname,'.credenciales.json');
const NL='\n';
const _E=String.fromCharCode(27);
const C={verde:_E+'[32m',rojo:_E+'[31m',ambar:_E+'[33m',gris:_E+'[90m',fin:_E+'[0m'};
const SIMULAR=process.argv.includes('--simular');

// La misma normalización que usa _authEmail() en js/utils.js. Si las dos
// difirieran, nadie podría entrar.
const aEmail=codigo=>String(codigo).toLowerCase()
  .replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'')+'@gdarei.com';

function credenciales(){
  let url=process.env.GDAR_URL,key=process.env.GDAR_SERVICE_KEY;
  if((!url||!key)&&fs.existsSync(CRED)){
    const c=JSON.parse(fs.readFileSync(CRED,'utf8'));
    url=url||c.url; key=key||c.service_key;
  }
  if(!url||!key){
    console.error(NL+'Faltan las credenciales en herramientas/.credenciales.json'+NL);
    process.exit(1);
  }
  return{url:url.replace(/\/+$/,''),key};
}

async function api(url,key,ruta,opts){
  const r=await fetch(url+'/auth/v1/admin/'+ruta,{
    ...opts,
    headers:{apikey:key,Authorization:'Bearer '+key,'Content-Type':'application/json'}});
  const txt=await r.text();
  if(!r.ok)throw new Error('HTTP '+r.status+' · '+txt.slice(0,160));
  return txt?JSON.parse(txt):null;
}

(async()=>{
  const{url,key}=credenciales();
  const j=await api(url,key,'users?per_page=200');
  const usuarios=(j&&j.users)||[];
  if(!usuarios.length){
    console.log(NL+'No hay usuarios en Auth. ¿Corrió antes migrarAuth.js?'+NL);
    return;
  }

  const plan=[];
  const sinCodigo=[];
  usuarios.forEach(u=>{
    const cod=u.user_metadata&&u.user_metadata.codigo;
    if(!cod){sinCodigo.push(u.email);return;}
    const nuevo=aEmail(cod);
    if(u.email!==nuevo)plan.push({u,cod,nuevo});
  });

  console.log(NL+usuarios.length+' usuarios en Auth · '+plan.length+' por cambiar'
    +(SIMULAR?'   '+C.ambar+'(SIMULACIÓN — no se toca nada)'+C.fin:'')+NL);

  if(sinCodigo.length){
    console.log(C.ambar+'  Sin código en user_metadata, se omiten:'+C.fin);
    sinCodigo.forEach(e=>console.log('    '+e));
    console.log('');
  }

  // Dos usuarios con el mismo código darían el mismo email y el segundo
  // fallaría. Mejor detectarlo antes de tocar nada.
  const nuevos=plan.map(p=>p.nuevo);
  const choque=[...new Set(nuevos.filter((e,i)=>nuevos.indexOf(e)!==i))];
  if(choque.length){
    console.error(C.rojo+'  Dos usuarios darían el mismo email: '+choque.join(', ')+C.fin);
    console.error('  Revise los códigos repetidos en js/empresa.js antes de seguir.'+NL);
    process.exit(1);
  }

  if(!plan.length){
    console.log(C.verde+'  Todos los emails ya son estables. Nada que hacer.'+C.fin+NL);
    return;
  }

  if(SIMULAR){
    plan.forEach(p=>console.log('  '+p.cod.padEnd(12)
      +C.gris+p.u.email+C.fin+'  →  '+p.nuevo));
    console.log(NL+'  Sin --simular se aplicarían estos '+plan.length+' cambios.');
    console.log('  Las contraseñas NO se tocan: la credencial actual sigue sirviendo.'+NL);
    return;
  }

  let ok=0;const fallos=[];
  for(const p of plan){
    process.stdout.write('  '+p.cod.padEnd(12));
    try{
      // Solo el email. Contraseña, permisos e id quedan como están.
      await api(url,key,'users/'+p.u.id,{method:'PUT',
        body:JSON.stringify({email:p.nuevo,email_confirm:true})});
      ok++;
      console.log(C.verde+'OK'+C.fin+'   '+p.nuevo);
    }catch(e){
      fallos.push({p,e:e.message});
      console.log(C.rojo+'ERROR'+C.fin+'  '+e.message.slice(0,90));
    }
  }

  console.log(NL+'  '+ok+' actualizado(s)'+(fallos.length?' · '+fallos.length+' con error':''));
  if(fallos.length){
    fallos.forEach(f=>console.log('    '+f.p.cod+': '+f.e.slice(0,110)));
  }
  if(ok){
    console.log(NL+'  El acceso pasa a ser:');
    console.log('    Código: '+plan[0].cod+'      Clave: la credencial que ya tiene'+NL);
  }
})().catch(e=>{console.error(NL+'Falló: '+e.message+NL);process.exit(1);});
