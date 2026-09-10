// ══ SELLAR LOS ARCHIVOS CON SU CONTENIDO ════════════════════════════════════
//
//   node herramientas/sellar.js              pone el sello al día
//   node herramientas/sellar.js --verificar   dice si alguno quedó viejo, sin tocar nada
//
// ── Qué problema resuelve ─────────────────────────────────────────────────
// Cada script de index.html llevaba un `?v=` que había que subir A MANO al
// cambiar el archivo. Es lo único que hace que un navegador con el archivo en
// caché se traiga la versión nueva.
//
// Olvidarse no rompe nada visible: la aplicación sigue funcionando, con el
// archivo viejo. El error aparece más tarde, en la máquina de otra persona, y
// como "a mí me funciona". Es el peor tipo de fallo que existe.
//
// Ahora el sello es el CONTENIDO del archivo. Si cambia, el sello cambia; si
// no, no. No hay nada que recordar y no hay forma de equivocarse.
//
// ── Por qué una herramienta y no un empaquetador ──────────────────────────
// Un empaquetador de verdad exigiría pasar los 57 scripts a módulos ES, y el
// ámbito de módulo no es el global: los 1363 manejadores en línea del HTML
// —onclick, onchange— llaman a 699 funciones globales que dejarían de existir.
// Eso es reescribir la interfaz entera, no cambiar de herramienta.
//
// Esto da el resultado que importa —que nadie se quede con un archivo viejo—
// sin tocar una sola línea de los módulos.

const fs=require('fs');
const path=require('path');
const crypto=require('crypto');

const RAIZ=path.join(__dirname,'..');
const HTML=path.join(RAIZ,'index.html');
const VERIFICAR=process.argv.includes('--verificar');

const _E=String.fromCharCode(27);
const C={verde:_E+'[32m',rojo:_E+'[31m',ambar:_E+'[33m',gris:_E+'[90m',neg:_E+'[1m',fin:_E+'[0m'};

// Ocho caracteres bastan: la probabilidad de que dos versiones de un archivo
// coincidan es despreciable, y una URL larga no aporta nada.
const sello=ruta=>crypto.createHash('sha1')
  .update(fs.readFileSync(ruta)).digest('hex').slice(0,8);

// Los dos sitios donde aparece: los <script src="js/…"> y la hoja de estilos.
const PATRON=/(src|href)="((?:js|css)\/[^"?]+)(?:\?v=([A-Za-z0-9]+))?"/g;

function revisar(){
  const html=fs.readFileSync(HTML,'utf8');
  const casos=[];
  for(const m of html.matchAll(PATRON)){
    const rel=m[2], abs=path.join(RAIZ,rel);
    if(!fs.existsSync(abs)){casos.push({rel,falta:true});continue;}
    const nuevo=sello(abs);
    casos.push({rel,viejo:m[3]||null,nuevo,igual:m[3]===nuevo,texto:m[0],
      reemplazo:m[1]+'="'+rel+'?v='+nuevo+'"'});
  }
  return{html,casos};
}

const{html,casos}=revisar();
const faltan=casos.filter(c=>c.falta);
const viejos=casos.filter(c=>!c.falta&&!c.igual);

if(faltan.length){
  console.error('\n'+C.rojo+'Estos archivos están en index.html pero no existen:'+C.fin);
  faltan.forEach(c=>console.error('  '+c.rel));
  process.exit(1);
}

if(VERIFICAR){
  console.log('\n'+C.neg+'Sellos de índice'+C.fin+C.gris+'  '+casos.length+' archivos'+C.fin+'\n');
  if(!viejos.length){
    console.log('  '+C.verde+'todos al día'+C.fin);
    process.exit(0);
  }
  console.log('  '+C.rojo+viejos.length+' archivo(s) cambiaron y su sello no'+C.fin+'\n');
  viejos.forEach(c=>console.log('    '+c.rel.padEnd(34)
    +C.gris+(c.viejo||'(sin sello)')+C.fin+' → '+C.ambar+c.nuevo+C.fin));
  console.log('\n  Se arregla con: '+C.neg+'npm run sellar'+C.fin+'\n');
  process.exit(1);
}

if(!viejos.length){
  console.log('\n  '+C.verde+'Ya estaban todos al día'+C.fin+C.gris+'  ('+casos.length+' archivos)'+C.fin+'\n');
  process.exit(0);
}

let salida=html;
viejos.forEach(c=>{ salida=salida.split(c.texto).join(c.reemplazo); });
fs.writeFileSync(HTML,salida);

console.log('\n'+C.neg+'Sellados'+C.fin+C.gris+'  '+viejos.length+' de '+casos.length+C.fin+'\n');
viejos.forEach(c=>console.log('  '+c.rel.padEnd(34)
  +C.gris+(c.viejo||'(sin sello)')+C.fin+' → '+C.verde+c.nuevo+C.fin));
console.log('');
