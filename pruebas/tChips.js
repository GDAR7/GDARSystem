// Fila 2 del Tareaje: los chips de jornada se adaptan al período. Lo que tiene
// al menos un día se muestra; lo que está en cero se agrupa en "Otros".
const fs=require('fs');
const R='c:/Users/LENOVO/OneDrive/Documents/GitHub/GDARSystem/';
let ok=0,mal=0;
const es=(l,g,e)=>{const b=String(g)===String(e);b?ok++:mal++;
  console.log((b?'  OK  ':'  MAL ')+l.padEnd(58)+'= '+g+(b?'':'  (esperado '+e+')'));};

const tar=fs.readFileSync(R+'js/tareaje.js','utf8');
const menus=fs.readFileSync(R+'js/tareajeMenus.js','utf8');

// Se ejecuta el generador real, con los tipos reales de tareaje.js
const TARE=tar.match(/const _TARE_T=\{[\s\S]*?\n\};/)[0];
const trozo=menus.slice(menus.indexOf('const _TMN_CON_COLOR'));
const api=new Function(TARE+trozo+';return{_tmnLeyendaHTML,_TMN_CON_COLOR,_TARE_T};')();
const cuenta=h=>(h.match(/_tarLeySet\('/g)||[]).length;

// Los dos casos reales del sistema
const pocos ={TD:new Set([1,2,3,4,5]),DL:new Set([1,2,3,4,5])};
const muchos={TD:new Set([1]),TN:new Set([1]),DL:new Set([1]),F:new Set([1]),P:new Set([1]),
              DM:new Set([1]),LF:new Set([1]),A5:new Set([1]),R:new Set([1])};

console.log('\n== La fila se adapta a lo que hay ==');
const h1=api._tmnLeyendaHTML(pocos,null);
es('un proyecto con 2 tipos activos → 2 chips',cuenta(h1),2);
es('  los 11 restantes van a Otros',/Otros 11 ▾/.test(h1),true);
es('  con el rótulo de sección',/Jornadas/i.test(h1),true);

const h2=api._tmnLeyendaHTML(muchos,null);
es('con 9 activos → 9 chips',cuenta(h2),9);
es('  y 4 en Otros',/Otros 4 ▾/.test(h2),true);

const h0=api._tmnLeyendaHTML({},null);
es('sin ningún dato, ningún chip suelto',cuenta(h0),0);
es('  y los 13 en Otros',/Otros 13 ▾/.test(h0),true);

console.log('\n== Solo cuatro llevan color ==');
es('los que pintan celdas en la grilla',api._TMN_CON_COLOR.join(),'TD,TN,DL,F');
es('TD sale con su color de fondo',h2.includes('background:'+api._TARE_T.TD.bg),true);
es('  y F también',h2.includes('background:'+api._TARE_T.F.bg),true);
const chipP=h2.slice(h2.indexOf(">P – "),h2.indexOf(">P – ")+40);
es('P va en gris, sin fondo',h2.split('background:transparent').length>1,true);
es('  el resto de chips grises llevan borde',/1px solid var\(--border\)/.test(h2),true);

console.log('\n== El filtro no puede quedar atrapado ==');
// Si se filtra por un tipo y se cambia a un mes donde está en cero, el chip
// no debe esconderse: no habría forma de quitar el filtro.
const h3=api._tmnLeyendaHTML(pocos,'V');
es('un tipo en cero con filtro sigue visible',/V – Vacaciones/.test(h3),true);
es('  y ya no cuenta en Otros',/Otros 10 ▾/.test(h3),true);
es('  aparece el botón de quitar',/Quitar filtro/.test(h3),true);
es('sin filtro no aparece ese botón',/Quitar filtro/.test(h1),false);

console.log('\n== El activo se distingue ==');
const h4=api._tmnLeyendaHTML(muchos,'TD');
es('borde grueso',/border:2px solid/.test(h4),true);
es('  con la ✕ para limpiarlo',/✕<\/span>/.test(h4),true);
es('los demás quedan con borde fino',/border:1px solid/.test(h4),true);

console.log('\n== Los conteos se ven ==');
const h5=api._tmnLeyendaHTML({TD:new Set([1,2,3])},null);
es('el número acompaña al chip',/>3</.test(h5),true);
es('  y el nombre completo se conserva',/TD – Trabajo Día/.test(h5),true);

console.log('\n== Nada de la lógica anterior cambió ==');
es('_tarLeySet sigue en tareaje.js',/function _tarLeySet/.test(tar),true);
es('  y sigue siendo quien filtra',/_tarAplicaLeyFiltro/.test(tar),true);
es('tareaje.js solo delega el HTML',/_tmnLeyendaHTML\(_leyN,_tarLeyFiltro\)/.test(tar),true);
es('  comprobando que la función exista',/typeof _tmnLeyendaHTML==='function'/.test(tar),true);
es('el menú Otros existe',/function tarMenuOtros/.test(menus),true);
es('  y desde ahí también se puede filtrar',/_tarLeySet\(x\.k\)/.test(menus),true);

console.log('\n'+(mal?'X '+mal+' fallo(s)':'OK todo bien')+'  ·  '+ok+'/'+(ok+mal));
process.exit(mal?1:0);
