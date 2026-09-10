// ══ EL REGISTRO DE MÓDULOS ══════════════════════════════════════════════════
// Un módulo se declaraba en tres sitios —AREAS en config.js, la tabla de
// despacho de renderPage, y su <div id="page-…"> en index.html— y nada
// comprobaba que los tres coincidieran. Ahora el registro es la única fuente,
// y esta suite es lo que impide que se vuelvan a separar.
//
// Lo importante que fija:
//   · El AREAS que se construye es el que espera el resto del sistema.
//   · Todo módulo del menú tiene página y función que lo dibuje.
//   · Toda página tiene dueño: o la ofrece un área, o está marcada de sistema.
//   · Los nombres de función se resuelven de verdad en el navegador.

const fs=require('fs');
const path=require('path');
const R=require('path').join(__dirname,'..')+'/';

let ok=0,mal=0;
const es=(l,g,e)=>{const b=String(g)===String(e);b?ok++:mal++;
  console.log((b?'  OK  ':'  MAL ')+l.padEnd(58)+'= '+g+(b?'':'  (esperado '+e+')'));};

const reg=fs.readFileSync(R+'js/registro.js','utf8');
const htm=fs.readFileSync(R+'index.html','utf8');
const cfg=fs.readFileSync(R+'js/config.js','utf8');

const AREAS_REG=new Function(reg+';return GDAR_AREAS;')();
const MODULOS  =new Function(reg+';return GDAR_MODULOS;')();
const construir=new Function(reg+';return gdarConstruirAreas;')();
const AREAS=construir();

const paginas=[...new Set([...htm.matchAll(/id="page-([a-zA-Z0-9_-]+)"/g)].map(m=>m[1]))];
const claves=Object.keys(MODULOS);

console.log('\n== El registro se carga antes de quien lo usa ==');
// config.js llama a gdarConstruirAreas() nada más arrancar: si registro.js
// llegara después, la aplicación no pasaría de la pantalla de acceso.
const orden=[...htm.matchAll(/<script src="js\/([^"?]+)/g)].map(m=>m[1]);
const iReg=orden.indexOf('registro.js'), iCfg=orden.indexOf('config.js');
es('registro.js está en index.html',iReg>=0,true);
es('  y va antes que config.js',iReg>=0&&iReg<iCfg,true);
es('config.js construye AREAS desde el registro',
   /const AREAS=gdarConstruirAreas\(\)/.test(cfg),true);
es('  y ya no lo lleva escrito',/const AREAS=\{/.test(cfg),false);

console.log('\n== AREAS conserva la forma que espera el resto ==');
es('13 áreas',Object.keys(AREAS).length,13);
const a1=AREAS.administracion;
es('cada área trae label, icon, color y prefix',
   !!(a1.label&&a1.icon&&a1.color&&a1.prefix),true);
es('  y su lista de módulos',Array.isArray(a1.modules),true);
es('cada módulo trae key, label e icon',
   a1.modules.every(m=>m.key&&m.label&&m.icon),true);
es('el orden del menú se respeta',
   AREAS.administracion.modules.map(m=>m.key).join(','),
   'personal,asistencia,tareaje,resumenTareaje,roster');

console.log('\n== Un módulo es UN objeto, aunque lo ofrezcan dos áreas ==');
// insumosAux lo ofrecen Almacén y Mantenimiento. Con una sola lista habría que
// duplicarlo, y volveríamos a tener dos sitios donde cambiar su nombre.
const enVariasAreas=claves.filter(k=>
  Object.values(AREAS_REG).filter(a=>a.modulos.includes(k)).length>1);
es('insumosAux vive en dos áreas',enVariasAreas.includes('insumosAux'),true);
es('  pero se describe una sola vez',
   Object.keys(MODULOS).filter(k=>k==='insumosAux').length,1);
es('  y las dos muestran lo mismo',
   AREAS.almacenLogistica.modules.find(m=>m.key==='insumosAux').label,
   AREAS.mantenimiento.modules.find(m=>m.key==='insumosAux').label);

console.log('\n== Nada se ofrece sin existir ==');
const ofrecidos=[...new Set(Object.values(AREAS_REG).flatMap(a=>a.modulos))];
const sinCatalogo=ofrecidos.filter(k=>!MODULOS[k]);
es('todo lo que un área ofrece está en el catálogo',sinCatalogo.join(',')||'—','—');
const hijos=[...new Set(claves.flatMap(k=>MODULOS[k].grupo||[]))];
es('los hijos de un subgrupo también',hijos.filter(h=>!MODULOS[h]).join(',')||'—','—');
es('  y hay un subgrupo',hijos.length>0,true);

console.log('\n== Toda página tiene dueño y todo módulo tiene página ==');
// Es lo que antes no comprobaba nadie: agregar un módulo al menú y olvidarse
// del div dejaba un item que al pulsarlo no hacía absolutamente nada.
const conPagina=k=>paginas.includes(k);
const sinPagina=claves.filter(k=>!MODULOS[k].grupo&&!conPagina(k));
es('todo módulo del catálogo tiene su página',sinPagina.join(',')||'—','—');
const huerfanas=paginas.filter(p=>!MODULOS[p]);
es('toda página está en el catálogo',huerfanas.join(',')||'—','—');
const noOfrecidos=claves.filter(k=>
  !MODULOS[k].sistema&&!MODULOS[k].grupo&&!ofrecidos.includes(k)&&!hijos.includes(k));
es('nadie queda fuera del menú por descuido',noOfrecidos.join(',')||'—','—');

console.log('\n== Lo del sistema está siempre, y no se vende ==');
const sistema=claves.filter(k=>MODULOS[k].sistema);
es('son dos',sistema.sort().join(','),'dashboard,miSeguridad');
es('  y ningún área los ofrece',sistema.some(k=>ofrecidos.includes(k)),false);
es('  pero tienen su página',sistema.every(conPagina),true);

console.log('\n== Cada módulo se sabe dibujar ==');
const sinDibujo=claves.filter(k=>!MODULOS[k].grupo&&!MODULOS[k].dibuja);
es('ninguno se quedó sin función',sinDibujo.join(',')||'—','—');
es('el subgrupo no dibuja nada (es una cabecera)',
   claves.filter(k=>MODULOS[k].grupo).every(k=>!MODULOS[k].dibuja),true);

console.log('\n== Los nombres de función existen de verdad ==');
// El registro guarda el NOMBRE, no la referencia, porque se carga antes que
// los módulos. renderPage lo resuelve con globalThis[nombre], y eso solo
// funciona con `function f(){}`: un `const f=…` no cuelga del objeto global.
const fuente=fs.readdirSync(R+'js').filter(f=>f.endsWith('.js'))
  .map(f=>fs.readFileSync(R+'js/'+f,'utf8')).join('\n');
const porNombre=claves.filter(k=>typeof MODULOS[k].dibuja==='string');
const noResuelven=porNombre.filter(k=>{
  const n=MODULOS[k].dibuja;
  return !new RegExp('^(?:async\\s+)?function\\s+'+n+'\\s*\\(','m').test(fuente);
});
es(porNombre.length+' nombres apuntan a una función declarada',
   noResuelven.join(',')||'—','—');
const porFuncion=claves.filter(k=>typeof MODULOS[k].dibuja==='function');
es('  y '+porFuncion.length+' son funciones en línea',porFuncion.length>0,true);

console.log('\n== renderPage ya no lleva su propia tabla ==');
const uts=fs.readFileSync(R+'js/utils.js','utf8');
const cuerpo=uts.slice(uts.indexOf('function renderPage'),uts.indexOf('function _paginaFalloLimpiar'));
es('resuelve contra el registro',/gdarDibujo\(k\)/.test(cuerpo),true);
es('  y no repite el mapa',/personal:rPersonal/.test(cuerpo),false);
es('  si no hay función, no revienta',/if\(!dibujar\)return;/.test(cuerpo),true);
es('  y sigue atrapando el error de la sección',/_paginaFallo\(k,e\)/.test(cuerpo),true);

console.log('\n== Las herramientas leen las áreas de donde viven ==');
// migrarAuth sacaba las áreas con regex del AREAS literal de config.js y dejó
// de funcionar en silencio cuando ese literal desapareció. Que no se repita.
const mig=fs.readFileSync(R+'herramientas/migrarAuth.js','utf8');
es('migrarAuth las lee del registro',/registro\.js/.test(mig),true);
es('  y no del literal de config.js',/const AREAS=\\\{/.test(mig),false);

console.log('\n'+(mal?'X '+mal+' fallo(s)':'OK todo bien')+'  ·  '+ok+'/'+(ok+mal));
process.exit(mal?1:0);
