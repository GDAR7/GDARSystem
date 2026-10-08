// --sincronizar y --bloquear, contra un Supabase simulado en local.
const http=require('http');
const{execFile}=require('child_process');
const{promisify}=require('util');
const pExec=promisify(execFile);
const fs=require('fs');
const R='c:/Users/LENOVO/OneDrive/Documents/GitHub/GDARSystem/';

let ok=0,mal=0;
const es=(l,g,e)=>{const b=String(g)===String(e);b?ok++:mal++;
  console.log((b?'  OK  ':'  MAL ')+l.padEnd(58)+'= '+g+(b?'':'  (esperado '+e+')'));};

// Los usuarios reales de empresa.js, para que el test refleje el sistema
const empSrc=fs.readFileSync(R+'js/empresa.js','utf8').replace(/\(\(\)=>\{const el=[\s\S]*$/,'');
const cfg=fs.readFileSync(R+'js/config.js','utf8');
const A={};[...cfg.match(/const AREAS=\{[\s\S]*?\n\};/)[0].matchAll(/^  (\w+):\{/gm)]
  .forEach(m=>A[m[1]]=true);
const USERS=new Function('document',empSrc+';return EMPRESA_USERS;')
  ({getElementById:()=>null})(A);

const meta=u=>{
  const m={dni:u.dni,nombre:u.nombre,cargo:u.cargo,codigo:u.codigo,areas:u.areas,
    email_verified:true};   // lo agrega Supabase por su cuenta
  ['areaModules','readOnlyModules','excludeModules','modules','pizarraTabs','panelHorasTabs','admin']
    .forEach(k=>{if(u[k]!==undefined)m[k]=u[k];});
  return m;
};

let enAuth=[], puts=[];
const reset=()=>{
  puts=[];
  enAuth=USERS.map((u,i)=>({id:'id-'+i,email:u.codigo.toLowerCase()+'@gdarei.com',
    user_metadata:meta(u),banned_until:null}));
};

const srv=http.createServer((req,res)=>{
  let body='';req.on('data',c=>body+=c);
  req.on('end',()=>{
    res.setHeader('Content-Type','application/json');
    if(req.method==='GET')return res.end(JSON.stringify({users:enAuth}));
    if(req.method==='PUT'){
      const id=req.url.split('/').pop();
      const u=enAuth.find(x=>x.id===id);
      const b=JSON.parse(body);
      puts.push({id,body:b});
      if(u){
        // Como Supabase de verdad: COMBINA las claves. Lo que no se envía se
        // conserva; lo que se envía en null queda en null. Antes este simulador
        // reemplazaba todo, y por eso nunca vio que quitar un permiso del
        // archivo no llegaba a la cuenta.
        if(b.user_metadata)u.user_metadata={...u.user_metadata,...b.user_metadata};
        if(b.ban_duration!==undefined)
          u.banned_until=b.ban_duration==='none'?null:'2126-01-01T00:00:00Z';
      }
      return res.end(JSON.stringify(u||{}));
    }
    res.statusCode=405;res.end('{}');
  });
});

srv.listen(0,'127.0.0.1',async()=>{
  const URL='http://127.0.0.1:'+srv.address().port;
  const ENV={GDAR_URL:URL,GDAR_SERVICE_KEY:'clave_de_mentira'};
  const limpio=s=>s.replace(/\x1b\[[0-9;]*m/g,'');
  const corre=async args=>{
    try{const{stdout}=await pExec(process.execPath,
      [R+'herramientas/migrarAuth.js',...args],{env:{...process.env,...ENV},encoding:'utf8'});
      return limpio(stdout);
    }catch(e){return limpio(String(e.stdout||'')+String(e.stderr||''));}
  };

  console.log('\n== Sin cambios, no hace nada ==');
  reset();
  let o=await corre(['--sincronizar','--simular']);
  es('dice que esta todo al dia',/Todo al dia/.test(o),true);
  es('  y cuenta los 20',/los 20 coinciden/.test(o),true);
  es('los campos de Supabase no cuentan como cambio',/email_verified/.test(o),false);

  console.log('\n== Detecta un permiso agregado ==');
  reset();
  // Alguien tiene en Auth menos areas de las que dice empresa.js
  const i=enAuth.findIndex(u=>u.user_metadata.codigo==='NOEPAL');
  const originales=[...enAuth[i].user_metadata.areas];
  enAuth[i].user_metadata.areas=originales.slice(0,1);
  o=await corre(['--sincronizar','--simular']);
  es('nombra a la persona',/Noelia Palomino/.test(o),true);
  es('  y muestra las altas',/areas: \+/.test(o),true);
  es('  sin aplicar nada todavia',puts.length,0);

  console.log('\n== Y las aplica ==');
  o=await corre(['--sincronizar']);
  es('escribe en el servidor',puts.length,1);
  es('  solo user_metadata',Object.keys(puts[0].body).join(),'user_metadata');
  es('  ni contrasena ni email',/password|email"/.test(JSON.stringify(puts[0].body)),false);
  es('  deja las areas correctas',enAuth[i].user_metadata.areas.length,originales.length);
  es('  conserva lo que puso Supabase',enAuth[i].user_metadata.email_verified,true);
  es('avisa de cuando aplica',/proxima vez que inicie sesion/.test(o),true);

  console.log('\n== Un cargo cambiado ==');
  reset();
  const j=enAuth.findIndex(u=>u.user_metadata.codigo==='JAYOJA');
  enAuth[j].user_metadata.cargo='Cargo Viejo';
  o=await corre(['--sincronizar','--simular']);
  es('lo muestra como antes y despues',/cargo: "Cargo Viejo" ->/.test(o),true);

  console.log('\n== Quitar una restricción del archivo llega a la cuenta ==');
  // El caso de Sixto: tenía el tareo de solo lectura y se le quitó en el archivo
  reset();
  const k=enAuth.findIndex(u=>u.user_metadata.codigo==='SIX_GQUI');
  enAuth[k].user_metadata.readOnlyModules=['tareaje'];
  o=await corre(['--sincronizar','--simular']);
  es('la detecta como baja',/readOnlyModules: -tareaje/.test(o),true);
  o=await corre(['--sincronizar']);
  es('  y al aplicar la vacía en la cuenta',enAuth[k].user_metadata.readOnlyModules,null);
  es('  enviándola en null, no omitiéndola',
    JSON.stringify(puts[puts.length-1].body.user_metadata).includes('"readOnlyModules":null'),true);
  o=await corre(['--sincronizar','--simular']);
  es('  después queda todo al día',/Todo al dia/.test(o),true);

  console.log('\n== --solo sincroniza a una sola persona ==');
  reset();
  const a1=enAuth.findIndex(u=>u.user_metadata.codigo==='JAYOJA');
  const a2=enAuth.findIndex(u=>u.user_metadata.codigo==='NOEPAL');
  enAuth[a1].user_metadata.cargo='Viejo 1';
  enAuth[a2].user_metadata.cargo='Viejo 2';
  o=await corre(['--sincronizar','--solo','JAYOJA']);
  es('solo actualiza a esa persona',puts.length,1);
  es('  la otra queda como estaba',enAuth[a2].user_metadata.cargo,'Viejo 2');
  es('  y no confunde a las demás con cuentas sueltas',/ya no en js\/empresa\.js/.test(o),false);
  o=await corre(['--sincronizar','--solo','NO_EXISTE']);
  es('un código que no existe se avisa',/No hay ningún usuario con el código "NO_EXISTE"/.test(o),true);

  console.log('\n== Quien esta en Auth y ya no en el archivo ==');
  reset();
  enAuth.push({id:'id-fuera',email:'exempleado@gdarei.com',banned_until:null,
    user_metadata:{codigo:'EXEMP',nombre:'Ex Empleado',areas:['general']}});
  o=await corre(['--sincronizar','--simular']);
  es('lo detecta',/Ex Empleado/.test(o),true);
  es('  advierte que puede entrar',/SIGUE PUDIENDO ENTRAR/.test(o),true);
  es('  y dice como cortarle',/--bloquear EXEMP/.test(o),true);

  console.log('\n== Bloquear ==');
  o=await corre(['--bloquear','EXEMP']);
  es('lo bloquea',/Bloqueado/.test(o),true);
  es('  usando ban, no borrado',puts[0].body.ban_duration,'876000h');
  es('  el usuario sigue existiendo',enAuth.some(u=>u.id==='id-fuera'),true);
  es('  y explica como revertir',/--desbloquear EXEMP/.test(o),true);

  o=await corre(['--sincronizar','--simular']);
  es('ya no lo marca como riesgo',/SIGUE PUDIENDO ENTRAR/.test(o),false);
  es('  lo muestra como bloqueado',/ya bloqueado/.test(o),true);

  console.log('\n== Desbloquear ==');
  puts=[];
  o=await corre(['--desbloquear','EXEMP']);
  es('lo devuelve',/Desbloqueado/.test(o),true);
  es('  levantando el ban',puts[0].body.ban_duration,'none');
  es('  conserva su clave',/clave de siempre/.test(o),true);

  console.log('\n== Errores previstos ==');
  reset();
  o=await corre(['--bloquear','NOEXISTE']);
  es('codigo inexistente avisa',/No hay ningun usuario/.test(o),true);
  o=await corre(['--bloquear','--simular']);
  es('sin codigo lo pide',/Falta el codigo/.test(o),true);
  es('  y no toma la bandera por codigo',/--simular/.test(o.split('Ej:')[0]),false);
  es('nada se escribio en el servidor',puts.length,0);

  console.log('\n== La ayuda los menciona ==');
  const src=fs.readFileSync(R+'herramientas/migrarAuth.js','utf8');
  es('--sincronizar documentado',/--sincronizar      lleva a Auth/.test(src),true);
  es('--bloquear documentado',/--bloquear COD/.test(src),true);
  es('explica por que hace falta',/Editar js\/empresa\.js NO cambia/.test(src),true);

  srv.close();
  console.log('\n'+(mal?'X '+mal+' fallo(s)':'OK todo bien')+'  ·  '+ok+'/'+(ok+mal));
  process.exit(mal?1:0);
});
