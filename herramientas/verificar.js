// ══ VERIFICACIÓN ANTES DE PUBLICAR ══════════════════════════════════════════
// Corre de una vez todo lo que conviene comprobar antes de subir a GitHub.
//
//   node herramientas/verificar.js            todo
//   node herramientas/verificar.js --rapido   solo los chequeos estáticos
//
// Termina con código 0 si está todo bien y 1 si algo falla, así que también
// sirve para no publicar a ciegas.
//
// Qué revisa y por qué cada cosa:
//
//  1 · Sintaxis archivo por archivo.
//  2 · Carga conjunta. Los 53 scripts comparten un mismo espacio global; si dos
//      declaran el mismo `const`, el navegador falla al cargar y el módulo
//      entero deja de existir sin ningún aviso. Ya pasó con el prefijo `_ip`.
//  3 · Funciones que se llaman y no existen — incluidos los onclick de
//      index.html, que es lo que detecta un botón muerto.
//  4 · Que cada script de index.html exista, y que lleve su ?v=.
//  5 · Modales dentro de una página. Un modal en un contenedor oculto se abre
//      pero no se ve. Pasó con el de cambio de clave.
//  6 · Que no haya credenciales camino a un repositorio público.
//  7 · Las suites de pruebas/.

const fs=require('fs');
const path=require('path');
const os=require('os');
const{execFileSync}=require('child_process');

const RAIZ=path.join(__dirname,'..');
const RAPIDO=process.argv.includes('--rapido');
const _E=String.fromCharCode(27);
const C={verde:_E+'[32m',rojo:_E+'[31m',ambar:_E+'[33m',gris:_E+'[90m',neg:_E+'[1m',fin:_E+'[0m'};
const NL='\n';

let fallos=0, avisos=0;
const titulo=t=>console.log(NL+C.neg+t+C.fin);
const bien=(t,d)=>console.log('  '+C.verde+'OK'+C.fin+'   '+t+(d?C.gris+'  '+d+C.fin:''));
const mal =(t,d)=>{fallos++;console.log('  '+C.rojo+'MAL'+C.fin+'  '+t+(d?NL+'       '+d:''));};
const nota=(t,d)=>{avisos++;console.log('  '+C.ambar+'··'+C.fin+'   '+t+(d?C.gris+'  '+d+C.fin:''));};

const html=fs.readFileSync(path.join(RAIZ,'index.html'),'utf8');
const scripts=[...html.matchAll(/<script src="js\/([^"?]+)(\?v=(\d+))?/g)]
  .map(m=>({archivo:m[1],version:m[3]}));
const jsDir=path.join(RAIZ,'js');
const todosJs=fs.readdirSync(jsDir).filter(f=>f.endsWith('.js'));

// ── 1 · Sintaxis ───────────────────────────────────────────────────────────
titulo('1 · Sintaxis de cada archivo');
const rotos=[];
todosJs.forEach(f=>{
  try{execFileSync(process.execPath,['--check',path.join(jsDir,f)],{stdio:'pipe'});}
  catch(e){rotos.push(f+': '+String(e.stderr||'').split(NL)[2]);}
});
rotos.length?mal(rotos.length+' archivo(s) con error',rotos.join(NL+'       '))
            :bien('los '+todosJs.length+' archivos de js/ compilan');

// ── 2 · Carga conjunta ─────────────────────────────────────────────────────
titulo('2 · Carga conjunta (choques de nombres)');
let bundle='';const faltantes=[];
scripts.forEach(s=>{
  try{bundle+=fs.readFileSync(path.join(jsDir,s.archivo),'utf8')+NL+';'+NL;}
  catch(e){faltantes.push(s.archivo);}
});
const tmp=path.join(os.tmpdir(),'gdar_bundle_check.js');
fs.writeFileSync(tmp,bundle);
try{
  execFileSync(process.execPath,['--check',tmp],{stdio:'pipe'});
  bien('los '+scripts.length+' scripts conviven','sin declaraciones repetidas');
}catch(e){
  const m=String(e.stderr||'').split(NL).filter(l=>l.trim()).slice(0,4).join(NL+'       ');
  mal('dos scripts se pisan al cargar juntos',m+NL
    +'       El módulo afectado no se ejecuta y sus botones quedan muertos.');
}
try{fs.unlinkSync(tmp);}catch(e){}

// ── 3 · Funciones que se llaman y no existen ───────────────────────────────
// Se miran dos cosas, para no ahogarse en falsos positivos: las funciones
// internas del proyecto (prefijo _xxYyy) y lo que index.html invoca desde sus
// atributos onclick. Lo segundo es lo que detecta un botón muerto.
titulo('3 · Funciones que se llaman y no existen');
const declaradas=new Set();
todosJs.forEach(f=>{
  const s=fs.readFileSync(path.join(jsDir,f),'utf8');
  [...s.matchAll(/function\s+([A-Za-z_$][\w$]*)/g)].forEach(m=>declaradas.add(m[1]));
  [...s.matchAll(/(?:const|let|var)\s+([^;\n]+)/g)].forEach(m=>{
    [...m[1].matchAll(/([A-Za-z_$][\w$]*)\s*=/g)].forEach(x=>declaradas.add(x[1]));
  });
});

const internas=[];
todosJs.forEach(f=>{
  const s=fs.readFileSync(path.join(jsDir,f),'utf8');
  [...s.matchAll(/\b(_[a-z]{2,4}[A-Z][\w$]*)\s*\(/g)].forEach(m=>{
    if(!declaradas.has(m[1])&&!internas.some(x=>x.n===m[1]))internas.push({n:m[1],f});
  });
});
internas.length
  ? mal(internas.length+' función(es) internas sin declarar',
        internas.slice(0,8).map(x=>x.n+'()  usada en js/'+x.f).join(NL+'       '))
  : bien('ninguna función interna se invoca sin estar declarada');

// Lo que aporta el navegador, más las palabras clave: `if(` no es una llamada
// a una función llamada "if".
const DEL_NAVEGADOR=new Set(['event','this','alert','confirm','prompt','print','open',
  'Number','String','parseInt','parseFloat','encodeURIComponent','decodeURIComponent',
  'if','for','while','switch','catch','return','typeof','new','delete','await',
  'function','else','do','case','in','of','void','yield','JSON','Math','Object','Array']);
const handlers=new Map();
[...html.matchAll(/on(?:click|change|input|submit|keydown)="([^"]*)"/g)].forEach(m=>{
  [...m[1].matchAll(/(?:^|[^.\w$])([A-Za-z_$][\w$]*)\s*\(/g)].forEach(x=>{
    if(!DEL_NAVEGADOR.has(x[1])&&!handlers.has(x[1]))handlers.set(x[1],m[1].slice(0,60));
  });
});
const muertos=[...handlers.entries()].filter(([n])=>!declaradas.has(n));
muertos.length
  ? mal(muertos.length+' control(es) de index.html llaman a algo inexistente',
        muertos.slice(0,8).map(([n,c])=>n+'()  en  '+c).join(NL+'       '))
  : bien(handlers.size+' controles de index.html apuntan a funciones existentes');

// ── 4 · Los scripts declarados existen ─────────────────────────────────────
titulo('4 · Los scripts declarados existen');
faltantes.length?mal('index.html carga archivos que no están',faltantes.join(', '))
                :bien('los '+scripts.length+' scripts de index.html están en js/');
const sinVersion=scripts.filter(s=>!s.version);
if(sinVersion.length)nota(sinVersion.length+' script(s) sin ?v=',
  sinVersion.map(s=>s.archivo).join(', ')+' — el navegador podría servir una copia vieja');
const huerfanos=todosJs.filter(f=>!scripts.some(s=>s.archivo===f)&&f!=='empresa.ejemplo.js');
if(huerfanos.length)nota(huerfanos.length+' archivo(s) en js/ que nadie carga',huerfanos.join(', '));

// ── 5 · Modales dentro de una página ───────────────────────────────────────
titulo('5 · Modales en contenedores ocultos');
let dentro=false,pagina='';const anidados=[];
html.split(NL).forEach((l,i)=>{
  const p=l.match(/<div class="page" id="([^"]+)"/);
  if(p){dentro=true;pagina=p[1];}
  else if(l.indexOf('</div>')===0)dentro=false;
  const m=l.match(/<div class="mo" id="([^"]+)"/);
  if(m&&dentro)anidados.push(m[1]+' (en '+pagina+', línea '+(i+1)+')');
});
anidados.length
  ? nota(anidados.length+' modal(es) dentro de una página',anidados.join(NL+'       ')
      +NL+'       Solo se ven si esa página está activa.')
  : bien('todos los modales cuelgan del nivel raíz');

// ── 6 · Credenciales camino al repositorio ─────────────────────────────────
titulo('6 · Nada sensible rumbo a GitHub');
let gitignore='';
try{gitignore=fs.readFileSync(path.join(RAIZ,'.gitignore'),'utf8');}catch(e){}
const debenIgnorarse=['respaldos/','herramientas/.credenciales.json','credenciales-nuevas.txt'];
const sinTapar=debenIgnorarse.filter(x=>!gitignore.includes(x));
sinTapar.length?mal('.gitignore no cubre: '+sinTapar.join(', '))
               :bien('.gitignore cubre respaldos y credenciales');

const conLlave=[];
const revisar=d=>fs.readdirSync(d,{withFileTypes:true}).forEach(e=>{
  const p=path.join(d,e.name);
  const rel=path.relative(RAIZ,p).split(path.sep).join('/');
  if(e.isDirectory()){
    if(['node_modules','.git','respaldos'].includes(e.name))return;
    return revisar(p);
  }
  if(!/\.(js|html|json|md|sql)$/.test(e.name))return;
  if(rel==='herramientas/.credenciales.json')return;
  const s=fs.readFileSync(p,'utf8');
  if(/sb_secret_[A-Za-z0-9]{10}/.test(s))conLlave.push(rel);
});
revisar(RAIZ);
conLlave.length?mal('llave secreta dentro de archivos que van al repo',conLlave.join(', '))
               :bien('ninguna llave secreta en los archivos versionados');

// ── 7 · Las suites ─────────────────────────────────────────────────────────
if(!RAPIDO){
  titulo('7 · Suites de pruebas');
  const dirP=path.join(RAIZ,'pruebas');
  if(!fs.existsSync(dirP))nota('no hay carpeta pruebas/');
  else{
    const suites=fs.readdirSync(dirP).filter(f=>/^t.*\.js$/.test(f)).sort();
    let pasan=0;const fallan=[];
    suites.forEach(f=>{
      try{
        const out=execFileSync(process.execPath,[path.join(dirP,f)],
          {encoding:'utf8',stdio:'pipe',timeout:90000});
        const ult=out.trim().split(NL).pop().replace(/\x1b\[[0-9;]*m/g,'');
        if(/todo bien/.test(ult))pasan++;
        else fallan.push(f.replace('.js','')+'  '+ult.trim().slice(0,80));
      }catch(e){
        const out=String(e.stdout||'').replace(/\x1b\[[0-9;]*m/g,'');
        const linea=out.split(NL).filter(l=>/MAL/.test(l))[0]
          ||String(e.stderr||'').split(NL).find(l=>/Error/.test(l))||'no terminó';
        fallan.push(f.replace('.js','')+'  '+linea.trim().slice(0,80));
      }
    });
    fallan.length
      ? mal(fallan.length+' de '+suites.length+' suites con problemas',fallan.join(NL+'       '))
      : bien('las '+suites.length+' suites pasan');
  }
}

// ── Resumen ────────────────────────────────────────────────────────────────
console.log('');
if(fallos){
  console.log(C.rojo+'  '+fallos+' problema(s) — conviene arreglarlos antes de publicar'+C.fin
    +(avisos?C.gris+'  ·  '+avisos+' aviso(s)'+C.fin:''));
  process.exit(1);
}
console.log(C.verde+'  Todo en orden'+C.fin
  +(avisos?C.ambar+'  ·  '+avisos+' aviso(s) que no bloquean'+C.fin:'')
  +(RAPIDO?C.gris+'  (sin las suites)'+C.fin:''));
