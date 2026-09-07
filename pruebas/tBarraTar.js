// La barra de controles del Tareaje: once controles sueltos pasaron a seis,
// con tres menús. Lo que se comprueba sobre todo es que NADA se perdiera por
// el camino y que las funciones de siempre se sigan llamando igual.
const fs=require('fs');
const R='c:/Users/LENOVO/OneDrive/Documents/GitHub/GDARSystem/';
let ok=0,mal=0;
const es=(l,g,e)=>{const b=String(g)===String(e);b?ok++:mal++;
  console.log((b?'  OK  ':'  MAL ')+l.padEnd(58)+'= '+g+(b?'':'  (esperado '+e+')'));};

const html=fs.readFileSync(R+'index.html','utf8');
const menus=fs.readFileSync(R+'js/tareajeMenus.js','utf8');
const tar=fs.readFileSync(R+'js/tareaje.js','utf8');
const css=fs.readFileSync(R+'css/styles.css','utf8');
const barra=html.slice(html.indexOf('<div class="card-head tar-barra">'),
                       html.indexOf('<div class="card-body"',html.indexOf('tar-barra')));

console.log('\n== La barra quedó en una línea ==');
es('existe la barra nueva',/class="card-head tar-barra"/.test(html),true);
es('  con su lado izquierdo',/tar-barra-izq/.test(barra),true);
es('  y su lado derecho',/tar-barra-der/.test(barra),true);
es('el título redundante ya no está',/Grilla de Tareaje/.test(html),false);
es('el rótulo "O RANGO" tampoco',/o rango/i.test(barra),false);
const botones=(barra.match(/<button/g)||[]).length;
const campos=(barra.match(/<select|<input/g)||[]).length;
es('quedan 4 botones',botones,4);
es('  y 3 campos',campos,3);

console.log('\n== Los IDs que otros archivos usan siguen ahí ==');
['tareProy','tareBuscar','tareMes','tareRangoBar','tarROBadge'].forEach(id=>
  es('  '+id,new RegExp('id="'+id+'"').test(barra),true));
es('tareRangoBar queda oculto, no borrado',/id="tareRangoBar" style="display:none"/.test(barra),true);

console.log('\n== Ningún control se perdió ==');
const enMenus=menus+barra;
[['Encabezado fijo','_tarToggleFijar'],['Multi-selección','toggleTareMult'],
 ['Hover','toggleTareHover'],['Columnas','_tarSetCol'],
 ['PDF','printTareaje'],['Excel','exportTareaje'],
 ['Duplicados','tarDuplicados'],['Período 21→20','_tarPer2120'],
 ['Rango','_tarSetRango']].forEach(([que,fn])=>
  es('  '+que.padEnd(16)+'→ '+fn,enMenus.includes(fn),true));

console.log('\n== Las funciones de siempre no se renombraron ==');
['function _tarToggleFijar','function toggleTareMult','function toggleTareHover',
 'function printTareaje','function exportTareaje','function _tarPer2120',
 'function _tarSetRango','function _tarColsPanel'].forEach(f=>
  es('  '+f.replace('function ',''),tar.includes(f),true));

console.log('\n== Los botones viejos se fueron sin dejar roto nada ==');
['tarBtnCols','tarBtnFijar','tarMultBtn','tarHoverBtn'].forEach(id=>{
  es('  '+id+' ya no está en el HTML',new RegExp('id="'+id+'"').test(html),false);
  // El código los sigue buscando: debe hacerlo protegido
  const i=tar.indexOf("getElementById('"+id+"')");
  if(i>-1){
    const trozo=tar.slice(i,i+150).replace(/\r/g,'');
    es('    y el código lo consulta protegido',/if\s*\(\s*\w+\s*\)/.test(trozo),true);
  }
});

console.log('\n== Los menús ==');
es('Vista existe',/function tarMenuVista/.test(menus),true);
es('Exportar existe',/function tarMenuExportar/.test(menus),true);
es('Período existe',/function tarMenuPeriodo/.test(menus),true);
es('se cierran con Escape',/e\.key==='Escape'/.test(menus),true);
es('  y al hacer clic fuera',/_tmnEl\.contains\(e\.target\)/.test(menus),true);
es('el segundo clic en el mismo botón cierra',/yaEstaba/.test(menus),true);
es('tareaje.js no declara nada con prefijo _tmn',
  /(?:function|const|let|var)s+_tmn/.test(tar),false);
es('  solo lo llama, comprobando antes que exista',
  tar.includes("typeof _tmnPintarBotonPeriodo==='function'"),true);

console.log('\n== El estado sigue guardándose donde estaba ==');
es('Vista usa _tarSetCol, que ya escribe en localStorage',
  /_tarSetCol\(c\.k,on\)/.test(menus),true);
es('  y _tarToggleFijar, que guarda _tarFijar',
  /localStorage\.setItem\('_tarFijar'/.test(tar),true);
es('los menús no escriben claves nuevas',/localStorage.setItem/.test(menus),false);

console.log('\n== El botón de Período dice qué está activo ==');
es('se repinta en cada render',/_tmnPintarBotonPeriodo/.test(tar),true);
es('  y muestra los días cuando hay rango',/días ▾/.test(menus),true);
es('  atenuando el mes',/mes\.style\.opacity/.test(menus),true);

console.log('\n== Sticky ==');
es('la barra se queda arriba',/\.tar-barra\{[\s\S]*?position:sticky/.test(css),true);
es('  y la fila de fechas también',/#tbTareaje thead th\{position:sticky/.test(css),true);

console.log('\n== El script se carga después de tareaje.js ==');
const orden=[...html.matchAll(/<script src="js\/([^"?]+)/g)].map(m=>m[1]);
es('tareajeMenus.js está',orden.includes('tareajeMenus.js'),true);
es('  y va detrás de tareaje.js',
  orden.indexOf('tareajeMenus.js')>orden.indexOf('tareaje.js'),true);

console.log('\n'+(mal?'X '+mal+' fallo(s)':'OK todo bien')+'  ·  '+ok+'/'+(ok+mal));
process.exit(mal?1:0);
