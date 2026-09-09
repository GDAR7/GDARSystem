// ══ ¿HAY CREDENCIALES EXPUESTAS? ════════════════════════════════════════════
// Revisa lo que va al repositorio —y también el historial de git, donde una
// llave subida por error sigue viva aunque después se borre el archivo.
//
//   node herramientas/auditarSecretos.js
//
// No modifica nada.
//
// ── Lo que hay que entender antes de leer el resultado ─────────────────────
// Hay dos llaves de Supabase y solo una es un secreto:
//
//   publishable / anon   va dentro del JavaScript y la descarga cualquiera.
//                        NO se puede ocultar: es lo que usa el navegador para
//                        hablar con la base. Lo que protege los datos es RLS.
//   secret / service_role  salta todas las políticas. Esta sí es un secreto y
//                        no debe salir nunca del equipo del administrador.

const fs=require('fs');
const path=require('path');
const{execSync}=require('child_process');

const RAIZ=path.join(__dirname,'..');
const _E=String.fromCharCode(27);
const C={verde:_E+'[32m',rojo:_E+'[31m',ambar:_E+'[33m',gris:_E+'[90m',neg:_E+'[1m',fin:_E+'[0m'};
const NL='\n';
let graves=0;

const tit=t=>console.log(NL+C.neg+t+C.fin);
const ok  =(t,d)=>console.log('  '+C.verde+'OK'+C.fin+'   '+t+(d?C.gris+'  '+d+C.fin:''));
const mal =(t,d)=>{graves++;console.log('  '+C.rojo+'GRAVE'+C.fin+' '+t+(d?NL+'        '+d:''));};
const nota=(t,d)=>console.log('  '+C.ambar+'··'+C.fin+'   '+t+(d?C.gris+'  '+d+C.fin:''));

// Lo que de verdad es un secreto. Se buscan valores, no la palabra suelta:
// mencionar "service_role" en un comentario no es una filtración.
const SECRETOS=[
  [/sb_secret_[A-Za-z0-9]{10,}/,        'llave secreta de Supabase'],
  [/eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/,'JWT (posible service_role antiguo)'],
  [/postgres(?:ql)?:\/\/[^\s"']*:[^\s"'@]+@/,'cadena de conexión con contraseña'],
  [/(?:service_role|SERVICE_KEY|service_key)["']?\s*[:=]\s*["'][A-Za-z0-9._-]{25,}/,
   'service_role con valor asignado']
];

const archivos=execSync('git ls-files',{cwd:RAIZ,encoding:'utf8',maxBuffer:1e8})
  .split(NL).filter(Boolean);

tit('1 · Archivos que hoy están en el repositorio');
const sucios=[];
archivos.forEach(f=>{
  const p=path.join(RAIZ,f);
  let s;try{s=fs.readFileSync(p,'utf8');}catch(e){return;}
  SECRETOS.forEach(([re,que])=>{
    const m=s.match(re);
    if(m)sucios.push({f,que,muestra:m[0].slice(0,18)+'…'});
  });
});
sucios.length
  ? mal(sucios.length+' hallazgo(s)',
        sucios.map(x=>x.f+'  →  '+x.que+'  '+x.muestra).join(NL+'        '))
  : ok('ninguna llave secreta en los '+archivos.length+' archivos versionados');

tit('2 · Historial de git');
// Un archivo borrado sigue en el historial. Si el repo es público, cualquiera
// puede recuperarlo con `git log -p`.
let hist='';
try{
  hist=execSync('git log --all -p --unified=0',
    {cwd:RAIZ,encoding:'utf8',maxBuffer:5e8});
}catch(e){nota('no se pudo leer el historial completo',e.message.slice(0,60));}
if(hist){
  const enHist=[];
  SECRETOS.forEach(([re,que])=>{
    const g=new RegExp(re.source,'g');
    const m=hist.match(g);
    if(m)enHist.push({que,n:new Set(m).size,muestra:m[0].slice(0,18)+'…'});
  });
  enHist.length
    ? mal(enHist.length+' tipo(s) de secreto aparecieron alguna vez',
          enHist.map(x=>x.que+'  ('+x.n+' distinto(s))  '+x.muestra).join(NL+'        ')
          +NL+'        Siguen recuperables con `git log -p` aunque ya no estén.'
          +NL+'        Hay que ROTAR esas llaves: borrarlas del archivo no basta.')
    : ok('ninguna llave secreta aparece en ningún commit');

  // Archivos que en algún momento estuvieron versionados y no deberían
  const nombres=['credenciales.json','credenciales-nuevas.txt','.env'];
  const subidos=nombres.filter(n=>new RegExp('\\+\\+\\+ b/.*'+n.replace('.','\\.')).test(hist));
  subidos.length
    ? mal('archivos de credenciales que llegaron a subirse: '+subidos.join(', '))
    : ok('nunca se subió ningún archivo de credenciales');
}

tit('3 · Los archivos sensibles de hoy');
[['herramientas/.credenciales.json','llave secreta de Supabase'],
 ['herramientas/credenciales-nuevas.txt','claves de los usuarios'],
 ['herramientas/.env','variables de entorno'],
 ['respaldos','DNI, sueldos y cuentas bancarias']].forEach(([f,que])=>{
  const p=path.join(RAIZ,f);
  if(!fs.existsSync(p))return nota(f+' no existe',que);
  let ignorado=false;
  try{execSync('git check-ignore -q "'+f+'"',{cwd:RAIZ});ignorado=true;}catch(e){}
  ignorado?ok(f+' está fuera de git',que)
          :mal(f+' NO está protegido — se subiría en el próximo push',que);
});

tit('4 · La llave pública (esta sí va al navegador)');
let pub=null;
try{
  const e=fs.readFileSync(path.join(RAIZ,'js','empresa.js'),'utf8');
  const m=e.match(/sb_publishable_[A-Za-z0-9_]+/);
  if(m)pub=m[0];
}catch(e){}
if(pub){
  nota('js/empresa.js lleva '+pub.slice(0,22)+'…',
    'es normal e inevitable: sin ella el navegador no puede leer nada');
  console.log('       '+C.gris+'Lo que protege los datos NO es esconderla, sino RLS.'+C.fin);
  console.log('       '+C.gris+'Compruébelo con: node herramientas/probarAcceso.js'+C.fin);
}else nota('no encontré la llave pública en js/empresa.js');

console.log('');
console.log(graves
  ? C.rojo+'  '+graves+' problema(s) grave(s) — hay llaves que rotar'+C.fin+NL
  : C.verde+'  Ningún secreto expuesto'+C.fin
    +C.gris+'  ·  la llave pública está a la vista por diseño'+C.fin+NL);
process.exit(graves?1:0);
