// ══ MARCAR QUÉ MÓDULO SIRVE CADA ARCHIVO ════════════════════════════════════
//
//   node herramientas/armar.js              marca los scripts de index.html
//   node herramientas/armar.js --verificar   dice si alguno quedó mal, sin tocar nada
//
// ── Qué hace y por qué ────────────────────────────────────────────────────
// Un cliente que compró Almacén y Equipos descargaba igual los 57 scripts,
// incluidos los 28 KB del Last Planner que nunca va a abrir. Son 297 a 438 KB
// comprimidos de más, según el plan.
//
// Las etiquetas se quedan en index.html, en su orden, pero las de los módulos
// pasan a `type="text/gdar"` con `data-src`. El navegador ignora un tipo que no
// conoce, así que no las descarga; las inyecta js/cargador.js según lo que la
// empresa haya contratado.
//
// Se hace así, y no sacándolas del archivo, por dos motivos:
//
//   · index.html sigue siendo la única lista y sigue mandando el ORDEN. Varios
//     módulos dependen de que otro se haya cargado antes.
//   · Quien agregue un módulo lo sigue haciendo igual que siempre: una etiqueta
//     más en index.html. Esta herramienta le pone la marca.
//
// El núcleo se queda como está: son los que hacen falta siempre, y dos de ellos
// —datos.js y venta.js— escuchan DOMContentLoaded. Un script inyectado se
// ejecuta después de ese evento, así que su escucha nunca correría.

const fs=require('fs');
const path=require('path');

const RAIZ=path.join(__dirname,'..');
const HTML=path.join(RAIZ,'index.html');
const VERIFICAR=process.argv.includes('--verificar');

const _E=String.fromCharCode(27);
const C={verde:_E+'[32m',rojo:_E+'[31m',ambar:_E+'[33m',gris:_E+'[90m',neg:_E+'[1m',fin:_E+'[0m'};

// Los que se cargan siempre, pase lo que pase.
const NUCLEO=new Set(['empresa.js','registro.js','config.js','utils.js',
  'datos.js','venta.js','cargador.js','cola.js']);

const reg=fs.readFileSync(path.join(RAIZ,'js','registro.js'),'utf8');
const MODULOS=new Function(reg+';return GDAR_MODULOS;')();

const archivos=fs.readdirSync(path.join(RAIZ,'js')).filter(f=>f.endsWith('.js'));
const fuentes={};
archivos.forEach(f=>{fuentes[f]=fs.readFileSync(path.join(RAIZ,'js',f),'utf8');});

// Qué archivo declara la función que dibuja cada módulo.
function archivoDe(nombre){
  for(const f of archivos)
    if(new RegExp('^(?:async\\s+)?function\\s+'+nombre+'\\s*\\(','m').test(fuentes[f]))
      return f;
  return null;
}

// archivo → módulos que dibuja. Un archivo sin módulos es un ayudante: se carga
// siempre, porque no hay forma de saber quién lo necesita sin seguir las
// llamadas, y quedarse corto deja una pantalla a medias.
const sirve={};
for(const [clave,m] of Object.entries(MODULOS)){
  if(m.grupo)continue;
  let n=typeof m.dibuja==='string'?m.dibuja:null;
  if(!n&&typeof m.dibuja==='function'){
    const mm=String(m.dibuja).match(/([A-Za-z_$][\w$]*)\s*\(/);
    n=mm?mm[1]:null;
  }
  const f=n?archivoDe(n):null;
  if(f)(sirve[f]=sirve[f]||[]).push(clave);
}

// Una etiqueta de script local, ya sea normal o ya marcada.
const PATRON=/<script (?:src|type="text\/gdar" data-src)="js\/([^"?]+)(\?v=[A-Za-z0-9]+)?"(?: data-mods="[^"]*")?><\/script>/g;

const html=fs.readFileSync(HTML,'utf8');
const cambios=[];
for(const m of html.matchAll(PATRON)){
  const [texto,archivo,sello='']=m;
  const mods=(sirve[archivo]||[]).slice().sort();
  const esNucleo=NUCLEO.has(archivo);
  // Un ayudante (sin módulos propios) se queda cargando siempre.
  const diferible=!esNucleo&&mods.length>0;
  const nuevo=diferible
    ? '<script type="text/gdar" data-src="js/'+archivo+sello+'" data-mods="'+mods.join(' ')+'"></script>'
    : '<script src="js/'+archivo+sello+'"></script>';
  if(texto!==nuevo)cambios.push({archivo,texto,nuevo,diferible,mods});
}

const total=[...html.matchAll(PATRON)].length;
const diferidos=[...html.matchAll(PATRON)].filter(m=>{
  const a=m[1];return !NUCLEO.has(a)&&(sirve[a]||[]).length>0;}).length;

if(VERIFICAR){
  console.log('\n'+C.neg+'Marcas de carga'+C.fin+C.gris+'  '+total+' scripts, '
    +diferidos+' diferibles'+C.fin+'\n');
  if(!cambios.length){console.log('  '+C.verde+'todas al día'+C.fin+'\n');process.exit(0);}
  console.log('  '+C.rojo+cambios.length+' etiqueta(s) mal marcadas'+C.fin+'\n');
  cambios.slice(0,10).forEach(c=>console.log('    '+c.archivo.padEnd(26)
    +(c.diferible?C.ambar+'debería diferirse ('+c.mods.length+' módulos)':C.ambar+'debería cargarse siempre')+C.fin));
  console.log('\n  Se arregla con: '+C.neg+'npm run armar'+C.fin+'\n');
  process.exit(1);
}

if(!cambios.length){
  console.log('\n  '+C.verde+'Ya estaban todas al día'+C.fin
    +C.gris+'  ('+total+' scripts, '+diferidos+' diferibles)'+C.fin+'\n');
  process.exit(0);
}

let salida=html;
cambios.forEach(c=>{salida=salida.split(c.texto).join(c.nuevo);});
fs.writeFileSync(HTML,salida);

console.log('\n'+C.neg+'Marcadas'+C.fin+C.gris+'  '+cambios.length+' de '+total+C.fin+'\n');
cambios.slice(0,12).forEach(c=>console.log('  '+c.archivo.padEnd(26)
  +(c.diferible?C.verde+'diferido'+C.fin+C.gris+'  '+c.mods.join(', ').slice(0,54)
              :C.gris+'siempre')+C.fin));
if(cambios.length>12)console.log('  '+C.gris+'… y '+(cambios.length-12)+' más'+C.fin);
console.log('');
