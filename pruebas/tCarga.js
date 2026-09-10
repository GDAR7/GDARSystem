// ══ SOLO SE DESCARGA LO CONTRATADO ══════════════════════════════════════════
// Un cliente que compró Almacén y Equipos descargaba igual los 57 scripts,
// incluidos los 28 KB del Last Planner que nunca va a abrir. Ahora las
// etiquetas de los módulos van marcadas y js/cargador.js decide cuáles inyecta.
//
// Dos formas de equivocarse, y las dos son caras:
//   · Omitir de más deja una pantalla del menú que no dibuja nada.
//   · Diferir el núcleo rompe la aplicación entera, y en silencio.

const fs=require('fs');
const R=require('path').join(__dirname,'..')+'/';

let ok=0,mal=0;
const es=(l,g,e)=>{const b=String(g)===String(e);b?ok++:mal++;
  console.log((b?'  OK  ':'  MAL ')+l.padEnd(58)+'= '+g+(b?'':'  (esperado '+e+')'));};

const html=fs.readFileSync(R+'index.html','utf8');
const reg=fs.readFileSync(R+'js/registro.js','utf8');
const MODULOS=new Function(reg+';return GDAR_MODULOS;')();

const siempre=[...html.matchAll(/<script src="js\/([^"?]+)/g)].map(m=>m[1]);
const diferidos=[...html.matchAll(/<script type="text\/gdar" data-src="js\/([^"?]+)[^"]*" data-mods="([^"]*)"><\/script>/g)]
  .map(m=>({archivo:m[1],mods:m[2].split(/\s+/).filter(Boolean)}));

console.log('\n== Las etiquetas están marcadas ==');
es('hay módulos diferidos',diferidos.length>25,true);
es('  y un núcleo que carga siempre',siempre.length>4,true);
es('todos los diferidos dicen a qué sirven',
   diferidos.filter(d=>!d.mods.length).map(d=>d.archivo).join(', ')||'—','—');
es('ningún archivo aparece en los dos lados',
   siempre.filter(a=>diferidos.some(d=>d.archivo===a)).join(', ')||'—','—');

console.log('\n== El núcleo NO se difiere ==');
// empresa, registro, config y utils son de los que depende todo. datos.js y
// venta.js escuchan DOMContentLoaded, y un script inyectado se ejecuta después
// de ese evento: su escucha nunca correría.
['empresa.js','registro.js','config.js','utils.js','cargador.js','datos.js','venta.js']
  .forEach(a=>es('  '+a+' carga siempre',siempre.includes(a),true));
const conDomReady=fs.readdirSync(R+'js').filter(f=>f.endsWith('.js'))
  .filter(f=>fs.readFileSync(R+'js/'+f,'utf8').includes('DOMContentLoaded'));
es('nadie con DOMContentLoaded quedó diferido',
   conDomReady.filter(f=>diferidos.some(d=>d.archivo===f)).join(', ')||'—','—');

console.log('\n== El cargador va después de utils.js ==');
// Necesita gdarContratado, que vive en el registro y se usa desde utils.
es('cargador.js está en el índice',html.includes('js/cargador.js'),true);
es('  después de utils.js',
   html.indexOf('js/cargador.js')>html.indexOf('js/utils.js'),true);
es('  y antes del primer diferido',
   html.indexOf('js/cargador.js')<html.indexOf('type="text/gdar"'),true);

console.log('\n== Espera a que el documento esté parseado ==');
// La primera versión buscaba las etiquetas al ejecutarse, arriba del todo,
// cuando todavía no existen en el DOM: encontraba cero y la aplicación
// arrancaba sin una sola pantalla. Se vio al abrirla, no leyendo el código.
const car=fs.readFileSync(R+'js/cargador.js','utf8');
es('escucha DOMContentLoaded',/addEventListener\('DOMContentLoaded'/.test(car),true);
es('  y si ya pasó, arranca igual',/readyState === 'loading'/.test(car),true);
es('inyecta en orden de inserción',/async = false/.test(car),true);
es('un módulo que no llega no cuelga la aplicación',/onerror/.test(car),true);

console.log('\n== Ningún módulo se queda sin quien lo dibuje ==');
// Todo módulo del catálogo tiene que estar servido por algún archivo: o uno
// diferido que lo declara, o uno del núcleo.
const servidos=new Set(diferidos.flatMap(d=>d.mods));
const fuenteNucleo=siempre.map(a=>{
  try{return fs.readFileSync(R+'js/'+a,'utf8');}catch(e){return '';}}).join('\n');
const huerfanos=Object.keys(MODULOS).filter(k=>{
  const m=MODULOS[k];
  if(m.grupo||servidos.has(k))return false;
  const n=typeof m.dibuja==='string'?m.dibuja:
    (typeof m.dibuja==='function'?(String(m.dibuja).match(/([A-Za-z_$][\w$]*)\s*\(/)||[])[1]:null);
  if(!n)return true;
  return !new RegExp('^(?:async\\s+)?function\\s+'+n+'\\s*\\(','m').test(fuenteNucleo);
});
es('ninguno queda huérfano',huerfanos.join(', ')||'—','—');

console.log('\n== El orden entre módulos se respeta ==');
// costcontrolAnual.js usa cosas de costcontrol.js: si se ejecutara antes,
// fallaría. El cargador los inyecta en el orden del índice.
const pos=a=>html.indexOf('js/'+a);
es('costcontrol antes que costcontrolAnual',pos('costcontrol.js')<pos('costcontrolAnual.js'),true);
es('  y que costcontrolExport',pos('costcontrol.js')<pos('costcontrolExport.js'),true);
es('tareaje antes que sus menús',pos('tareaje.js')<pos('tareajeMenus.js'),true);

console.log('\n== Con todo contratado no se omite nada ==');
// Es la propiedad que permite fusionar esto sin riesgo: el cliente de siempre
// descarga exactamente lo mismo que antes.
const decidir=plan=>{
  const f=new Function('EMPRESA_PLAN',reg+';return gdarContratado;')(plan);
  return diferidos.filter(d=>d.mods.some(k=>f(k)));
};
es('el plan Integral los carga todos',decidir({areas:null,modulos:null}).length,diferidos.length);
es('  y sin plan declarado, igual',decidir(undefined).length,diferidos.length);

console.log('\n== Un plan recortado omite de verdad ==');
const op=decidir({areas:['administracion','almacenLogistica','controlEquipos'],modulos:['histograma']});
es('carga menos',op.length<diferidos.length,true);
es('  bastantes menos',op.length<diferidos.length*0.6,true);
const nombres=op.map(d=>d.archivo);
es('no trae el Last Planner',nombres.includes('lps.js'),false);
es('  ni la planilla',nombres.includes('planilla.js'),false);
es('  ni el recrecimiento',nombres.includes('recrecimiento.js'),false);
es('pero sí el almacén',nombres.includes('almacen.js'),true);
es('  y el personal',nombres.includes('personal.js'),true);

console.log('\n== La marca la pone la herramienta, no la mano ==');
const arm=fs.readFileSync(R+'herramientas/armar.js','utf8');
es('armar.js existe y sabe del núcleo',/const NUCLEO=/.test(arm),true);
es('  y deja los ayudantes cargando siempre',/ayudante/.test(arm),true);
const pkg=JSON.parse(fs.readFileSync(R+'package.json','utf8'));
es('npm run armar existe',!!pkg.scripts.armar,true);
es('  y sellar lo corre antes',/armar\.js/.test(pkg.scripts.sellar),true);

console.log('\n== Las herramientas siguen viendo los 58 ==');
// Si verificar.js solo mirara `src`, la comprobación de choques de nombres
// —la que protege el ámbito global compartido— pasaría a revisar 22 de 58 y
// no diría nada. Que un archivo se cargue al final no lo saca de ese ámbito.
const ver=fs.readFileSync(R+'herramientas/verificar.js','utf8');
es('verificar.js cuenta los diferidos',/text\\\/gdar/.test(ver)||/text\/gdar/.test(ver),true);
const sel=fs.readFileSync(R+'herramientas/sellar.js','utf8');
es('sellar.js también los sella',/data-src/.test(sel),true);

console.log('\n== Y el login espera a que estén ==');
const uts=fs.readFileSync(R+'js/utils.js','utf8');
es('doLogin aguarda la carga',/await gdarCargaListo\(\)/.test(uts),true);

console.log('\n'+(mal?'X '+mal+' fallo(s)':'OK todo bien')+'  ·  '+ok+'/'+(ok+mal));
process.exit(mal?1:0);
