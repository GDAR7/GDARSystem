// ══ QUÉ CONTRATÓ CADA EMPRESA ═══════════════════════════════════════════════
// El plan decide qué módulos aparecen. Equivocarse aquí tiene dos formas, y
// las dos son caras: mostrarle a un cliente algo que no pagó, o esconderle
// algo que sí.
//
// Lo que más se comprueba es que un cliente que ya existía y no declara plan
// siga viendo exactamente lo mismo que antes. Ese es el caso de ECOSERMO, y
// una regresión ahí es una llamada un lunes por la mañana.

const fs=require('fs');
const R=require('path').join(__dirname,'..')+'/';

let ok=0,mal=0;
const es=(l,g,e)=>{const b=String(g)===String(e);b?ok++:mal++;
  console.log((b?'  OK  ':'  MAL ')+l.padEnd(58)+'= '+g+(b?'':'  (esperado '+e+')'));};

const reg=fs.readFileSync(R+'js/registro.js','utf8');

// Se evalúa el registro con el plan que se quiera, como haría el navegador de
// ese cliente con su propio js/empresa.js.
const con=plan=>new Function('EMPRESA_PLAN',reg
  +';return {areas:gdarConstruirAreas(),claves:gdarContratados(),'
  +'contratado:gdarContratado,areasDe:gdarAreasDeUsuario};')(plan);

const items=A=>Object.values(A).reduce((n,a)=>n+a.modules.length,0);

console.log('\n== Sin plan, todo sigue igual que siempre ==');
// Es el caso del cliente que ya estaba: su empresa.js no declara nada y no
// debe notar el cambio.
const nada=con(undefined);
const todo=con({nombre:'Integral',areas:null,modulos:null});
es('13 áreas',Object.keys(nada.areas).length,13);
es('  y 66 items de menú',items(nada.areas),66);
es('un plan "todo" da exactamente lo mismo',
   JSON.stringify(nada.areas),JSON.stringify(todo.areas));
es('  y las mismas claves',nada.claves.size,todo.claves.size);

console.log('\n== Se venden áreas enteras ==');
const tres=con({areas:['administracion','almacenLogistica','controlEquipos']});
es('3 áreas contratadas, 3 en el menú',Object.keys(tres.areas).length,3);
es('  en el orden del catálogo',Object.keys(tres.areas).join(','),
   'administracion,almacenLogistica,controlEquipos');
es('el tareaje entra',tres.contratado('tareaje'),true);
es('la planilla no',tres.contratado('planilla'),false);
es('  ni el Last Planner',tres.contratado('lps'),false);

console.log('\n== Comprar un área NO arrastra otra ==');
// insumosAux lo ofrecen Almacén y Mantenimiento. La primera versión hacía
// aparecer Mantenimiento entera con un solo item por comprar Almacén.
const alm=con({areas:['almacenLogistica']});
es('insumosAux entra con Almacén',alm.contratado('insumosAux'),true);
es('  pero Mantenimiento no aparece',!!alm.areas.mantenimiento,false);
es('  y Almacén sí lo muestra',
   alm.areas.almacenLogistica.modules.some(m=>m.key==='insumosAux'),true);

console.log('\n== Se venden módulos sueltos ==');
const suelto=con({areas:['administracion'],modulos:['histograma']});
es('el área del módulo suelto aparece',!!suelto.areas.general,true);
es('  con ese módulo solo',suelto.areas.general.modules.map(m=>m.key).join(','),'histograma');
es('  y no con el resto de su área',suelto.contratado('seguimiento'),false);
es('sin ningún área entera también se puede',
   Object.keys(con({areas:[],modulos:['personal','tareaje']}).areas).join(','),'administracion');

console.log('\n== El subgrupo se recorta con sus hijos ==');
const eq=con({areas:['controlEquipos']});
const sg=eq.areas.controlEquipos.modules.find(m=>m.isSubgroup);
es('con el área entera trae sus 3 hijos',sg&&sg.children.length,3);
const unHijo=con({areas:[],modulos:['tramos']});
const sg2=unHijo.areas.controlEquipos.modules.find(m=>m.isSubgroup);
es('comprando un hijo, el grupo trae solo ese',sg2&&sg2.children.map(c=>c.key).join(','),'tramos');
es('  y no los hermanos',unHijo.contratado('frentesTrabajo'),false);
const sinHijos=con({areas:[],modulos:['panelHoras']});
es('sin hijos contratados, el grupo no se pinta',
   (sinHijos.areas.controlEquipos.modules.some(m=>m.isSubgroup)),false);

console.log('\n== Lo del sistema no se vende: está siempre ==');
for(const plan of [{areas:[],modulos:[]},{areas:['administracion']},undefined]){
  const c=con(plan);
  if(!c.contratado('dashboard')||!c.contratado('miSeguridad')){mal++;
    console.log('  MAL  el panel o Mi Seguridad se perdieron con un plan');}
}
ok++;console.log('  OK   el panel y Mi Seguridad sobreviven a cualquier plan  = true');

console.log('\n== Un área sin nada contratado no existe ==');
const cero=con({areas:[],modulos:[]});
es('ninguna área',Object.keys(cero.areas).length,0);
es('  ni un item',items(cero.areas),0);
es('pero el panel sigue disponible',cero.contratado('dashboard'),true);

console.log('\n== Los permisos de una persona se recortan al plan ==');
// Sin esto, alguien con un area que la empresa no contrato hace que
// buildSidebar lea AREAS[ak].modules sobre undefined y la pantalla se queda
// en blanco sin decir por que.
const parcial=con({areas:['administracion','almacenLogistica']});
es('se le quitan las áreas que no hay',
   parcial.areasDe(['administracion','controlProyecto','almacenLogistica']).join(','),
   'administracion,almacenLogistica');
es('  y si no le queda ninguna, devuelve vacío',
   parcial.areasDe(['controlProyecto','remuneraciones']).length,0);
es('  aguanta undefined',parcial.areasDe(undefined).length,0);
es('con todo contratado no quita nada',
   todo.areasDe(['administracion','controlProyecto']).join(','),
   'administracion,controlProyecto');

console.log('\n== Solo se descargan las tablas de lo contratado ==');
const cfg=fs.readFileSync(R+'js/config.js','utf8');
const TABLAS=Object.keys(new Function(
  cfg.match(/const SUPA_TABLES=\{[\s\S]*?\n\};/)[0]+'return SUPA_TABLES;')());
const conT=plan=>new Function('EMPRESA_PLAN',reg+';return gdarTablas();')(plan);

// Lo que no puede pasar de ninguna manera: que el cliente de siempre deje de
// descargar algo. Con todo contratado tienen que venir las 75.
const todasT=conT({areas:null,modulos:null});
es('con todo contratado vienen todas',todasT.size,TABLAS.length);
es('  y sin plan declarado, igual',conT(undefined).size,TABLAS.length);

const opT=conT({areas:['administracion','almacenLogistica','controlEquipos'],modulos:['histograma']});
es('un plan recortado trae menos',opT.size<TABLAS.length,true);
es('  bastantes menos',opT.size<TABLAS.length*0.7,true);
es('  pero nunca cero',opT.size>0,true);
es('la renta de 5ta no viaja si no se contrató',opT.has('renta5ta'),false);
es('  ni las tasas de pensiones',opT.has('afpTasas'),false);
es('  ni las tablas del Last Planner',opT.has('lpsWbs'),false);
es('el tareaje sí, que lo compró',opT.has('tareaje'),true);

// El cierre de planilla SÍ viaja aunque no se compre Remuneraciones, y está
// bien: tareaje.js llama a plTareajeBloqueado() para no dejar corregir un mes
// ya pagado. Sin esas tablas creería que no hay nada cerrado. Es justo el tipo
// de dependencia que una lista escrita a mano se habría comido.
es('el cierre de planilla acompaña al tareaje',opT.has('planillaCierre'),true);
es('  porque el tareaje pregunta si el mes está pagado',
   /plTareajeBloqueado/.test(fs.readFileSync(R+'js/tareaje.js','utf8')),true);

// La que de verdad importa: ningún módulo contratado puede quedarse sin sus
// datos. Se comprueba módulo por módulo, con un plan que solo tenga ese.
const MOD=new Function(reg+';return GDAR_MODULOS;')();
const sinSusDatos=[];
for(const clave of Object.keys(MOD)){
  const m=MOD[clave];
  if(m.grupo||!m.tablas||!m.tablas.length)continue;
  const t=conT({areas:[],modulos:[clave]});
  const faltan=m.tablas.filter(x=>!t.has(x));
  if(faltan.length)sinSusDatos.push(clave+': '+faltan.join(','));
}
es('cada módulo recibe las tablas que declara',sinSusDatos.join(' | ')||'—','—');

console.log('\n== El núcleo llega pase lo que pase ==');
const nadaT=conT({areas:[],modulos:[]});
es('sin contratar nada, sigue habiendo núcleo',nadaT.size>0,true);
es('  con el personal',nadaT.has('personal'),true);
es('  y los equipos',nadaT.has('equipos'),true);
es('el núcleo está en todos los planes',
   [...nadaT].every(t=>opT.has(t)&&todasT.has(t)),true);

console.log('\n== La carga inicial respeta el plan ==');
es('loadSheetsData filtra por gdarTablas',/_tablasDelPlan=gdarTablas\(\)/.test(cfg),true);
es('  y lo aplica a la lista de tablas',/_tablasDelPlan\.has\(k\)/.test(cfg),true);

console.log('\n== La aplicación no se rompe sin áreas ==');
const uts=fs.readFileSync(R+'js/utils.js','utf8');
es('launchApp recorta las áreas del usuario',/CU\.areas=gdarAreasDeUsuario\(CU\.areas\)/.test(uts),true);
es('  y avisa en vez de quedarse en blanco',/No hay nada que mostrarle/.test(uts),true);
es('renderPage no dibuja lo no contratado',/if\(!gdarContratado\(k\)\)return;/.test(uts),true);

console.log('\n== El cliente de siempre no cambia ==');
const emp=fs.readFileSync(R+'js/empresa.js','utf8');
const plan=new Function(emp.replace(/\(\(\)=>\{const el=[\s\S]*$/,'')
  .replace(/^[\s\S]*?const EMPRESA_PLAN/,'const EMPRESA_PLAN')
  +';return EMPRESA_PLAN;')();
es('ECOSERMO declara su plan',!!plan,true);
es('  sin recortar áreas',plan.areas,null);
es('  ni módulos',plan.modulos,null);
es('  o sea, todo',Object.keys(con(plan).areas).length,13);

console.log('\n== La plantilla del cliente nuevo enseña a recortar ==');
const ej=fs.readFileSync(R+'js/empresa.ejemplo.js','utf8');
es('declara un EMPRESA_PLAN',/const EMPRESA_PLAN=/.test(ej),true);
es('  con un recorte de verdad, no null',/areas:\['administracion'/.test(ej),true);
es('  y avisa que no es una cerradura',/RLS/.test(ej),true);

console.log('\n'+(mal?'X '+mal+' fallo(s)':'OK todo bien')+'  ·  '+ok+'/'+(ok+mal));
process.exit(mal?1:0);
