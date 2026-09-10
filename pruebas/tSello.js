// ══ EL SELLO DE CADA ARCHIVO ════════════════════════════════════════════════
// Cada script de index.html lleva un `?v=` que decide si el navegador se trae
// la versión nueva o se queda con la que tiene en caché.
//
// Antes era un número que había que subir a mano. Olvidarse no rompe nada
// visible: la aplicación sigue funcionando, con el archivo viejo. El fallo
// aparece después, en la máquina de otra persona, y como "a mí me funciona".
// Es el peor tipo de error que existe, y en esta misma rama pasó varias veces.
//
// Ahora el sello es el hash del contenido. Lo que fija esta suite es que nadie
// pueda volver a un número escrito a mano sin que salte.

const fs=require('fs');
const path=require('path');
const crypto=require('crypto');
const{execFileSync}=require('child_process');
const R=require('path').join(__dirname,'..')+'/';

let ok=0,mal=0;
const es=(l,g,e)=>{const b=String(g)===String(e);b?ok++:mal++;
  console.log((b?'  OK  ':'  MAL ')+l.padEnd(58)+'= '+g+(b?'':'  (esperado '+e+')'));};

const html=fs.readFileSync(R+'index.html','utf8');
const sello=rel=>crypto.createHash('sha1')
  .update(fs.readFileSync(R+rel)).digest('hex').slice(0,8);

const refs=[...html.matchAll(/(?:src|href)="((?:js|css)\/[^"?]+)(?:\?v=([A-Za-z0-9]+))?"/g)]
  .map(m=>({rel:m[1],sello:m[2]||null}));

console.log('\n== Todo lo que se carga lleva sello ==');
es('hay referencias que sellar',refs.length>50,true);
es('  incluida la hoja de estilos',refs.some(r=>r.rel.startsWith('css/')),true);
const sinSello=refs.filter(r=>!r.sello);
es('ninguna se quedó sin sello',sinSello.map(r=>r.rel).join(', ')||'—','—');

console.log('\n== El sello es el contenido, no un número a mano ==');
const viejos=refs.filter(r=>r.sello&&r.sello!==sello(r.rel));
es('todos los sellos están al día',
   viejos.map(r=>r.rel).slice(0,3).join(', ')||'—','—');
// Un sello escrito a mano se reconoce: son números cortos y correlativos.
// Un hash de ocho caracteres puede salir todo dígitos por casualidad, así que
// lo que se mira es el largo, no si tiene letras.
const cortos=refs.filter(r=>r.sello&&r.sello.length!==8);
es('todos miden ocho caracteres',cortos.map(r=>r.rel+':'+r.sello).join(', ')||'—','—');

console.log('\n== Dos archivos distintos no comparten sello ==');
const porSello={};
refs.forEach(r=>{(porSello[r.sello]=porSello[r.sello]||[]).push(r.rel);});
const repetidos=Object.entries(porSello).filter(([,v])=>v.length>1);
es('ninguna colisión',repetidos.map(([s,v])=>s+': '+v.join('+')).join(' | ')||'—','—');

console.log('\n== La herramienta detecta un archivo cambiado ==');
// Se toca un archivo de verdad, se comprueba que salta, y se deja como estaba.
// Si esta prueba dejara el repositorio sucio sería peor que no tenerla.
const VICTIMA=R+'js/engrase.js';
const original=fs.readFileSync(VICTIMA);
let salio=null,texto='';
try{
  fs.writeFileSync(VICTIMA,Buffer.concat([original,Buffer.from('\n// sello\n')]));
  try{
    execFileSync(process.execPath,[R+'herramientas/sellar.js','--verificar'],
      {encoding:'utf8',stdio:'pipe'});
    salio=0;
  }catch(e){ salio=e.status; texto=String(e.stdout||''); }
}finally{
  fs.writeFileSync(VICTIMA,original);          // pase lo que pase, se restaura
}
es('sale con código 1',salio,1);
es('  y nombra el archivo',/engrase\.js/.test(texto),true);
es('  y dice cómo arreglarlo',/npm run sellar/.test(texto),true);
es('el archivo quedó como estaba',
   crypto.createHash('sha1').update(fs.readFileSync(VICTIMA)).digest('hex'),
   crypto.createHash('sha1').update(original).digest('hex'));

console.log('\n== Con todo al día no molesta ==');
let limpio=null;
try{ execFileSync(process.execPath,[R+'herramientas/sellar.js','--verificar'],
       {encoding:'utf8',stdio:'pipe'}); limpio=0; }
catch(e){ limpio=e.status; }
es('sale con código 0',limpio,0);

console.log('\n== El verificador lo comprueba también ==');
// Es lo que hace que sirva: nadie corre `sellar --verificar` por su cuenta,
// pero `npm test` sí se corre antes de publicar.
const ver=fs.readFileSync(R+'herramientas/verificar.js','utf8');
es('verificar.js compara los sellos',/cambiaron y su sello no/.test(ver),true);
es('  y apunta al comando que lo arregla',/npm run sellar/.test(ver),true);
es('  y acepta sellos, no solo números',/\?v=\(\[A-Za-z0-9\]\+\)/.test(ver),true);

console.log('\n== Está a mano en package.json ==');
const pkg=JSON.parse(fs.readFileSync(R+'package.json','utf8'));
es('npm run sellar existe',!!pkg.scripts.sellar,true);
es('  y el modo verificar también',!!pkg.scripts['sellar:verificar'],true);

console.log('\n'+(mal?'X '+mal+' fallo(s)':'OK todo bien')+'  ·  '+ok+'/'+(ok+mal));
process.exit(mal?1:0);
