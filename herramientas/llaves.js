// ══ PONER UNA LLAVE EN .env SIN QUE PASE POR NINGÚN OTRO SITIO ══════════════
//
//   1. En el panel de Supabase del proyecto: Settings → API Keys.
//      Copie la *secret* (sb_secret_…) o, en "Legacy API keys", la
//      service_role. NO la publishable / anon.
//   2. npm run llaves -- dev      (la de gdar-dev)
//      npm run llaves -- prod     (la de producción)
//
// Lee el portapapeles, comprueba que sea la llave correcta DEL PROYECTO
// correcto, la escribe en .env y borra el portapapeles.
//
// ── Por qué así y no pegándola a mano ──────────────────────────────────────
// Esta llave salta todas las políticas RLS: con ella se leen los DNI, los
// sueldos y las cuentas bancarias de toda la gente. Cada sitio por el que
// pasa es un sitio del que se puede filtrar:
//
//   · pegada en un chat queda en el historial de la conversación;
//   · escrita como argumento de un comando queda en el historial de
//     PowerShell (PSReadLine lo guarda en disco);
//   · y la equivocación más probable no es filtrarla sino ponerla mal: la de
//     desarrollo en el hueco de producción, o la publicable, que con RLS
//     cerrado no lee ni una fila. Es exactamente lo que dejó el respaldo
//     escribiendo archivos vacíos durante meses sin que nadie se enterara.
//
// Esto nunca imprime la llave, ni la escribe en otro sitio que no sea .env.

const fs=require('fs');
const path=require('path');
const{execFileSync}=require('child_process');

const RAIZ=path.join(__dirname,'..');
const C={v:'\x1b[32m',r:'\x1b[31m',a:'\x1b[33m',g:'\x1b[90m',n:'\x1b[1m',x:'\x1b[0m'};

// La variable del .env y la URL de js/empresa.js van juntas: elegir una
// elige la otra, así que no se puede cruzar la llave de un proyecto con la
// dirección del otro.
const DESTINOS={
  prod:{variable:'GDAR_SERVICE_KEY',    url:'SUPA_URL_PROD',nombre:'PRODUCCIÓN'},
  dev :{variable:'GDAR_SERVICE_KEY_DEV',url:'SUPA_URL_DEV', nombre:'DESARROLLO'}
};

function refDe(url){
  const m=String(url||'').match(/^https:\/\/([a-z0-9]{20})\.supabase\.co/);
  return m?m[1]:null;
}

// Las llaves antiguas son JWT: el rol y el proyecto van escritos dentro, así
// que se puede comprobar sin preguntarle a nadie.
function cargaJWT(k){
  try{
    const b=k.split('.')[1].replace(/-/g,'+').replace(/_/g,'/');
    return JSON.parse(Buffer.from(b,'base64').toString('utf8'));
  }catch(e){ return null; }
}

// ── ¿Es la llave que hace falta? ───────────────────────────────────────────
// Ningún motivo de rechazo repite la llave: se ven en pantalla, y la pantalla
// se comparte, se fotografía y se pega en chats.
function validarLlave(llave,ref){
  const k=String(llave||'').trim();
  if(!k)
    return{ok:false,motivo:'El portapapeles está vacío. Copie la llave en el panel de Supabase y vuelva a correr esto.'};
  if(/\s/.test(k))
    return{ok:false,motivo:'Lo copiado tiene espacios o saltos de línea: no es una llave sola. Copie solo la llave.'};
  if(k.startsWith('sb_publishable_'))
    return{ok:false,motivo:'Esa es la PUBLICABLE, la que va en el navegador. Con RLS cerrado no lee ni una fila. '
      +'Hace falta la secret (sb_secret_…) o la service_role.'};
  if(k.startsWith('sb_secret_'))
    return{ok:true,llave:k,tipo:'secret'};
  if(/^eyJ/.test(k)){
    const p=cargaJWT(k);
    if(!p)
      return{ok:false,motivo:'Parece una llave antigua (JWT) pero no se puede leer. ¿Se copió entera?'};
    if(p.role!=='service_role')
      return{ok:false,motivo:'Esa llave es de rol "'+p.role+'", no service_role. '
        +(p.role==='anon'?'La anon es la publicable: con RLS cerrado no lee nada.':'')};
    if(ref&&p.ref&&p.ref!==ref)
      return{ok:false,motivo:'Esa llave es del proyecto '+p.ref+', no de '+ref+'. '
        +'¿Se copió la del otro proyecto?'};
    return{ok:true,llave:k,tipo:'service_role'};
  }
  return{ok:false,motivo:'Lo copiado no parece una llave de Supabase.'};
}

// ── Escribirla en el texto del .env ────────────────────────────────────────
// Reemplaza la línea de ESA variable y deja todo lo demás como estaba. Ojo con
// el prefijo: GDAR_SERVICE_KEY no debe tocar GDAR_SERVICE_KEY_DEV. Si la
// variable aparece dos veces se deja una sola, porque no está claro cuál
// ganaría al leer el archivo y eso es justo el tipo de duda que no se quiere
// tener con esta llave.
function escribirEnv(texto,variable,valor){
  const fin=/\r\n/.test(texto)?'\r\n':'\n';
  const esEsta=l=>new RegExp('^\\s*'+variable+'\\s*=').test(l);
  const lineas=texto===''?[]:texto.split(/\r?\n/);
  const salida=[];
  let puesta=false;
  for(const l of lineas){
    if(esEsta(l)){
      if(!puesta){ salida.push(variable+'='+valor); puesta=true; }
      continue;
    }
    salida.push(l);
  }
  if(!puesta){
    while(salida.length&&salida[salida.length-1]==='')salida.pop();
    salida.push(variable+'='+valor,'');
  }
  return salida.join(fin);
}

// ── La decisión entera, sin tocar disco, red ni portapapeles ───────────────
// Recibe todo de fuera para poder probarla con llaves inventadas.
async function colocar(o){
  const d=DESTINOS[o.cual];
  if(!d)
    return{ok:false,mensajes:['Diga para cuál: npm run llaves -- dev   o   npm run llaves -- prod']};

  // Antes de escribir un secreto en un archivo, que ese archivo no se suba.
  // El repositorio es público.
  const ignorado=String(o.gitignore||'').split(/\r?\n/).some(l=>l.trim()==='.env');
  if(!ignorado)
    return{ok:false,mensajes:['.env no está en .gitignore y este repositorio es público. '
      +'No se escribe una llave en un archivo que se subiría.']};
  if(o.rastreado)
    return{ok:false,mensajes:['git ya está siguiendo .env: aunque esté en .gitignore, se subiría igual. '
      +'Sáquelo con  git rm --cached .env  antes de poner ninguna llave.']};

  const url=(o.urls||{})[d.url];
  const ref=refDe(url);
  if(!ref)
    return{ok:false,mensajes:['No se encontró '+d.url+' en js/empresa.js.']};

  const v=validarLlave(o.portapapeles,ref);
  if(!v.ok)return{ok:false,mensajes:[v.motivo]};

  // La prueba de verdad: que Supabase acepte ESA llave para ESE proyecto. Las
  // llaves nuevas (sb_secret_) no llevan el proyecto escrito dentro, así que
  // esta es la única forma de saber que no es la del otro.
  const mensajes=[];
  const estado=await o.comprobar(url,v.llave);
  if(estado===401||estado===403)
    return{ok:false,mensajes:['Supabase rechazó esa llave para '+ref+' ('+d.nombre+'). '
      +'Es de otro proyecto, o ya no es válida.']};
  if(estado===null)
    mensajes.push('Aviso: no se pudo comprobar con Supabase (¿sin red?). Se guarda igual; '
      +'el respaldo dirá si funciona.');
  else if(estado<200||estado>=300)
    mensajes.push('Aviso: Supabase respondió '+estado+' a la comprobación. Se guarda igual.');

  const base=o.envActual!=null?o.envActual:(o.ejemplo||'');
  mensajes.push('Guardada en .env como '+d.variable+'  ·  '+d.nombre+'  ·  '
    +(v.tipo==='secret'?'secret key':'service_role (antigua)')+', '+v.llave.length+' caracteres.');
  return{ok:true,envNuevo:escribirEnv(base,d.variable,v.llave),mensajes};
}

// ── Lo que toca el mundo ───────────────────────────────────────────────────
function leerPortapapeles(){
  if(process.platform==='win32')
    return execFileSync('powershell.exe',
      ['-NoProfile','-NonInteractive','-Command','Get-Clipboard -Raw'],{encoding:'utf8'});
  if(process.platform==='darwin')return execFileSync('pbpaste',{encoding:'utf8'});
  return execFileSync('xclip',['-selection','clipboard','-o'],{encoding:'utf8'});
}

// Se sobrescribe con un espacio: dejar la llave en el portapapeles es dejarla
// a un Ctrl+V de cualquier chat.
function borrarPortapapeles(){
  try{
    if(process.platform==='win32')
      execFileSync('powershell.exe',['-NoProfile','-NonInteractive','-Command',"Set-Clipboard -Value ' '"]);
    else if(process.platform==='darwin')
      execFileSync('pbcopy',{input:' '});
    else execFileSync('xclip',['-selection','clipboard'],{input:' '});
    return true;
  }catch(e){ return false; }
}

// Solo la cabecera apikey: es como las toma la pasarela de Supabase, tanto las
// secret nuevas como la service_role antigua.
async function comprobar(url,llave){
  try{
    const r=await fetch(url.replace(/\/+$/,'')+'/rest/v1/',{headers:{apikey:llave}});
    return r.status;
  }catch(e){ return null; }
}

async function principal(){
  // Primero el argumento: no hay por qué leer el portapapeles de nadie si de
  // todas formas se va a negar.
  if(!DESTINOS[process.argv[2]]){
    console.log('\n  '+C.r+'Diga para cuál:'+C.x+'  npm run llaves -- dev   o   npm run llaves -- prod\n');
    return 2;
  }
  const leer=p=>{try{return fs.readFileSync(path.join(RAIZ,p),'utf8');}catch(e){return null;}};
  const emp=leer('js/empresa.js')||'';
  const urls={};
  for(const n of['SUPA_URL_PROD','SUPA_URL_DEV']){
    const m=emp.match(new RegExp('const\\s+'+n+"\\s*=\\s*'([^']+)'"));
    urls[n]=m?m[1]:null;
  }
  let rastreado=false;
  try{
    execFileSync('git',['ls-files','--error-unmatch','.env'],{cwd:RAIZ,stdio:'ignore'});
    rastreado=true;
  }catch(e){}

  let portapapeles='';
  try{ portapapeles=leerPortapapeles(); }
  catch(e){
    console.log('\n  '+C.r+'No se pudo leer el portapapeles.'+C.x+'\n');
    return 1;
  }

  const r=await colocar({cual:process.argv[2],portapapeles,
    envActual:leer('.env'),ejemplo:leer('.env.example'),
    gitignore:leer('.gitignore'),rastreado,urls,comprobar});

  console.log('');
  r.mensajes.forEach(m=>console.log('  '+(r.ok?(/^Aviso/.test(m)?C.a:C.v):C.r)+m+C.x));
  if(r.ok)fs.writeFileSync(path.join(RAIZ,'.env'),r.envNuevo,'utf8');

  // Se borra siempre que lo copiado pareciera una llave, haya salido bien o no:
  // una secret rechazada por ser del otro proyecto sigue siendo una secret.
  if(/^\s*(sb_secret_|eyJ)/.test(portapapeles))
    console.log('  '+C.g+(borrarPortapapeles()?'Portapapeles borrado.'
      :'No se pudo borrar el portapapeles: copie cualquier otra cosa encima.')+C.x);
  console.log('');
  return r.ok?0:1;
}

if(require.main===module)principal().then(c=>process.exit(c));

module.exports={colocar,validarLlave,escribirEnv,refDe,cargaJWT,DESTINOS};
