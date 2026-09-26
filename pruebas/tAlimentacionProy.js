// Bienestar Social · Alimentación — Proyección Mensual desde el tareo.
// Se ejecuta el módulo real (js/alimentacionProy.js, prefijo _apy).
//
// Reglas que se comprueban:
//   · Solo comen TD, TN y DLT.
//   · Local (Oyón): día → desayuno+almuerzo · noche → desayuno+cena.
//   · De fuera: desayuno+almuerzo+cena.
//   · El DLT hereda el turno del día anterior de esa misma persona.
//   · El rancho frío no se proyecta: se carga a mano.
const fs=require('fs'),vm=require('vm');
const R='c:/Users/LENOVO/OneDrive/Documents/GitHub/GDARSystem/';
let ok=0,mal=0;
const es=(l,g,e)=>{const b=String(g)===String(e);b?ok++:mal++;
  console.log((b?'  OK  ':'  MAL ')+l.padEnd(62)+'= '+g+(b?'':'  (esperado '+e+')'));};

const tareaje=[];
let tid=1;
const T=(personalId,dia,tipo)=>tareaje.push({id:tid++,personalId,tipo,
  fecha:'2026-09-'+String(dia).padStart(2,'0'),proy:'R3'});

// P1 Oyón: 3 TD, 2 TN, y días sin derecho
[1,2,3].forEach(d=>T(1,d,'TD'));
[4,5].forEach(d=>T(1,d,'TN'));
[6,7].forEach(d=>T(1,d,'DL'));
T(1,8,'F');
// P2 de Lima: 4 TD
[1,2,3,4].forEach(d=>T(2,d,'TD'));
// P3 Oyón con DLT: el 01 TN, el 02 DLT (hereda noche), el 05 TD
T(3,1,'TN');T(3,2,'DLT');T(3,5,'TD');
// P4 solo vacaciones: no come nada
[1,2,3].forEach(d=>T(4,d,'V'));
// Fuera del mes: no debe contar
tareaje.push({id:99,personalId:1,tipo:'TD',fecha:'2026-08-31',proy:'R3'});

const DB={
  personal:[
    {id:1,ape:'Quispe Mamani',nom:'Juan Carlos',dni:'11111111',cargo:'Operario',proc:'Oyón',est:'Activo'},
    {id:2,ape:'Mamani Torres', nom:'Pedro Abel', dni:'22222222',cargo:'Operario',proc:'Lima', est:'Activo'},
    {id:3,ape:'Flores Ríos',   nom:'María',      dni:'33333333',cargo:'Ayudante',proc:' OYON ',est:'Activo'},
    {id:4,ape:'Vega Soto',     nom:'Luis',       dni:'44444444',cargo:'Peón',    proc:'',     est:'Activo'},
    {id:5,ape:'Sin Tareo',     nom:'Ana',        dni:'55555555',cargo:'Peón',    proc:'Lima', est:'Activo'}
  ],
  tareaje,
  alimLocales:[{id:1,nombre:'Oyón'}],
  alimPrecios:[{id:1,periodo:'2026-09',desayuno:8,almuerzo:15,cena:12,rancho:10}],
  alimRancho:[{id:1,periodo:'2026-09',personalId:1,cant:2}],
  alimentacion:[]
};

const nodos={};
const nodo=id=>nodos[id]||(nodos[id]={id,innerHTML:'',textContent:'',value:'',style:{},focus(){}});
let ventana=null,guardados=[],borrados=[],xls=null,avisos=[],respuesta=null;
const XLSX={utils:{aoa_to_sheet:aoa=>({aoa}),book_new:()=>({}),
  book_append_sheet:(wb,ws,n)=>{xls={aoa:ws.aoa,hoja:n};}},
  writeFile:(wb,nom)=>{if(xls)xls.archivo=nom;}};
const ctx=vm.createContext({
  DB,console,Date,Math,Number,String,Object,Array,JSON,Set,Map,URL,XLSX,setTimeout:()=>0,
  rAli(){},buscarFoco(){},toast:(m,e)=>avisos.push({m,e:!!e}),
  prompt:()=>respuesta,confirm:()=>true,
  nidSeguro:(nx,k)=>(DB[k]||[]).reduce((m,r)=>Math.max(m,+r.id||0),0)+1,
  supaUpsert:async(k,rec)=>{guardados.push({k,rec});return null;},
  supaDelete:async(k,id)=>{borrados.push({k,id:+id});},
  localStorage:{getItem:()=>null,setItem(){},removeItem(){}},
  document:{getElementById:nodo,querySelector:()=>null,querySelectorAll:()=>[],
    createElement:()=>({style:{},dataset:{},appendChild(){}})},
  window:{open:()=>{ventana={html:'',document:{write(h){ventana.html+=h;},close(){}},focus(){},print(){}};return ventana;}},
  location:{href:'https://ecosermo.gdarei.com/index.html'},
  EMPRESA:{nombre:'ECOSERMO',logo:'img/logo.png'},CU:{nombre:'Prueba'}
});
vm.runInContext(fs.readFileSync(R+'js/alimentacionProy.js','utf8'),ctx,{filename:'alimentacionProy.js'});
const ev=x=>vm.runInContext(x,ctx);
ev('_apyPer="2026-09"');

console.log('\n== El mes que se proyecta ==');
let D=ev('_apyDatos()');
es('30 días de setiembre',D.F.length,30);
es('lo nombra en español',ev('_apyPerNombre()'),'setiembre 2026');
es('quien no tiene tareo no aparece',D.filas.some(f=>f.p.id===5),false);
es('quien solo tuvo vacaciones tampoco',D.filas.some(f=>f.p.id===4),false);
es('el parte del 31/08 no se cuela',D.filas.find(f=>f.p.id===1).dias,5);

console.log('\n== Quién es local ==');
es('Oyón es local',ev('_apyEsLocal("Oyón")'),true);
es('  sin importar tildes ni espacios',ev('_apyEsLocal(" OYON ")'),true);
es('Lima no es local',ev('_apyEsLocal("Lima")'),false);
es('sin procedencia no es local (cuenta 3 raciones)',ev('_apyEsLocal("")'),false);

console.log('\n== Local en turno día: desayuno y almuerzo ==');
const f=id=>D.filas.find(x=>x.p.id===id);
es('P1 tiene 3 TD y 2 TN',f(1).nTD+' TD · '+f(1).nTN+' TN',
  '3 TD · 2 TN');
es('  5 días con derecho, los DL y la F no cuentan',f(1).dias,5);
es('  desayunos: uno por día con derecho',f(1).des,5);
es('  almuerzos: solo los 3 de turno día',f(1).alm,3);
es('  cenas: solo las 2 de turno noche',f(1).cen,2);
es('  nunca 3 raciones el mismo día',f(1).raciones,10);

console.log('\n== De fuera: las tres ==');
es('P2 con 4 TD',f(2).dias,4);
es('  4 desayunos, 4 almuerzos y 4 cenas',
  f(2).des+'/'+f(2).alm+'/'+f(2).cen,'4/4/4');
es('  aunque su procedencia sea Lima',f(2).local,false);

console.log('\n== El DLT hereda el turno ==');
es('P3: 1 TN, 1 DLT y 1 TD',f(3).nTN+'/'+f(3).nDLT+'/'+f(3).nTD,'1/1/1');
es('  el DLT viene después de un TN: cuenta como noche',f(3).cen,2);
es('  así que solo el TD deja almuerzo',f(3).alm,1);
es('  3 desayunos',f(3).des,3);
es('  y queda marcado como heredado',f(3).inferidos,1);

console.log('\n== El costo ==');
es('P1: 5×8 + 3×15 + 2×12 + 2 ranchos ×10',f(1).costo,5*8+3*15+2*12+2*10);
es('  el rancho frío se carga a mano',f(1).ran,2);
es('P2: 4×8 + 4×15 + 4×12',f(2).costo,4*8+4*15+4*12);
es('P3 no tiene rancho cargado',f(3).ran,0);
es('total del mes',D.total.costo,129+140+63);
es('  desayunos del mes',D.total.des,12);
es('  almuerzos',D.total.alm,8);
es('  cenas',D.total.cen,8);
es('  personas con derecho',D.total.n,3);
es('los subtotales separan local de foráneo',
  D.totLocal.n+' local(es) · '+D.totFuera.n+' de fuera','2 local(es) · 1 de fuera');

console.log('\n== Sin precios cargados ==');
ev('_apyPer="2026-10"');
es('otro mes sin precios se avisa',ev('_apyDatos().sinPrecio'),true);
es('  y sin tareo no hay filas',ev('_apyDatos().filas.length'),0);
ev('_apyPer="2026-09"');
es('el mes con precios no avisa',ev('_apyDatos().sinPrecio'),false);

console.log('\n== Cambiar quién es local cambia el cálculo ==');
DB.alimLocales=[];
D=ev('_apyDatos()');
es('sin procedencias locales, P1 pasa a 3 raciones',f(1).alm,5);
es('  y suma cenas todos los días',f(1).cen,5);
es('  el costo sube',f(1).costo>129,true);
DB.alimLocales=[{id:1,nombre:'Oyón'}];
D=ev('_apyDatos()');
es('al volver a marcar Oyón, vuelve a 2 raciones',f(1).alm,3);

console.log('\n== Guardar precios y rancho ==');
(async()=>{
  respuesta='9.50';
  await ev('_apySetPrecio("des")');
  es('el desayuno se guardó',DB.alimPrecios[0].desayuno,9.5);
  es('  sin pisar los otros precios',DB.alimPrecios[0].almuerzo,15);
  es('  y se mandó a Supabase',guardados.filter(g=>g.k==='alimPrecios').length,1);
  respuesta='abc';
  await ev('_apySetPrecio("alm")');
  es('un valor inválido no se guarda',DB.alimPrecios[0].almuerzo,15);
  es('  y se avisa',avisos.some(a=>a.e&&/inválido/i.test(a.m)),true);

  await ev('_apySetRancho(3,4)');
  es('el rancho de P3 quedó en 4',ev('_apyRanchoDe(3)'),4);
  es('  se guardó en Supabase',guardados.filter(g=>g.k==='alimRancho').length,1);
  await ev('_apySetRancho(3,0)');
  es('ponerlo en 0 borra la fila',ev('_apyRanchoDe(3)'),0);
  es('  y se borró en Supabase',borrados.filter(b=>b.k==='alimRancho').length,1);

  respuesta='Pachangara';
  await ev('_apyLocalAgregar()');
  es('se agregó otra procedencia local',ev('_apyEsLocal("PACHANGARA")'),true);
  respuesta='pachangara';
  await ev('_apyLocalAgregar()');
  es('  no se duplica aunque cambie la caja',ev('DB.alimLocales.length'),2);
  await ev('_apyLocalQuitar(2)');
  es('  y se puede quitar',ev('_apyEsLocal("Pachangara")'),false);

  console.log('\n== La pantalla ==');
  ev('_apyPer="2026-09";_apyTab="proy";_apyPintarTabs()');
  const H=nodo('aliProy').innerHTML;
  es('la barra tiene las dos pestañas',/_apySetTab\('reg'\)/.test(nodo('aliTabBar').innerHTML)
    &&/_apySetTab\('proy'\)/.test(nodo('aliTabBar').innerHTML),true);
  es('  el registro se oculta al ver la proyección',nodo('aliReg').style.display,'none');
  es('cuatro botones de precio',(H.match(/_apySetPrecio\('/g)||[]).length,4);
  es('  incluido el del rancho frío',/_apySetPrecio\('ran'\)/.test(H),true);
  es('el selector de mes',/_apySetPer\(this\.value\)/.test(H),true);
  es('las procedencias locales se listan y se pueden quitar',/_apyLocalQuitar\(1\)/.test(H),true);
  es('  y agregar',/_apyLocalAgregar\(\)/.test(H),true);
  es('el rancho se escribe en la tabla',/_apySetRancho\(1,this\.value\)/.test(H),true);
  es('los dos grupos salen separados',/De fuera \(3 raciones\)/.test(H)&&/Locales \(2 raciones\)/.test(H),true);
  es('el DLT heredado se marca con ~',/1~/.test(H),true);
  es('ninguna celda rota',/undefined|NaN/.test(H),false);

  console.log('\n== Excel y PDF ==');
  xls=null;ev('_apyExportXls()');
  es('la hoja se genera',!!xls,true);
  es('  con el mes en el nombre',xls.archivo,'Proyeccion Alimentacion 2026-09.xlsx');
  es('  15 columnas',xls.aoa[3].length,15);
  es('  una fila por persona con derecho',xls.aoa.length,4+3+1);
  es('  y cierra con el total',xls.aoa[xls.aoa.length-1][0],'TOTAL');
  ventana=null;ev('_apyPrint()');
  es('el PDF se arma',/PROYECCIÓN DE ALIMENTACIÓN/.test(ventana.html),true);
  es('  con el logo',/img\/logo\.png/.test(ventana.html),true);
  es('  explica las reglas al pie',/Solo come quien tiene TD, TN o DLT/.test(ventana.html),true);
  es('  y dice qué procedencias son locales',/Oyón/.test(ventana.html),true);
  es('  filas y celdas parejas',(ventana.html.match(/<tr[ >]/g)||[]).length,(ventana.html.match(/<\/tr>/g)||[]).length);

  console.log('\n== Enganche ==');
  const src=fs.readFileSync(R+'js/alimentacionProy.js','utf8');
  const html=fs.readFileSync(R+'index.html','utf8');
  const per=fs.readFileSync(R+'js/personal.js','utf8');
  const cfg=fs.readFileSync(R+'js/config.js','utf8');
  es('index tiene los contenedores',/id="aliTabBar"/.test(html)&&/id="aliReg"/.test(html)&&/id="aliProy"/.test(html),true);
  es('  y carga el módulo',/js\/alimentacionProy\.js\?v=/.test(html),true);
  es('rAli pinta las pestañas',/_apyPintarTabs==='function'/.test(per),true);
  es('las tres tablas están en config',
    /alimPrecios:'alim_precios'/.test(cfg)&&/alimLocales:'alim_locales'/.test(cfg)&&/alimRancho:'alim_rancho'/.test(cfg),true);
  es('  con sus arreglos en DB',/alimPrecios:\[\],alimLocales:\[\],alimRancho:\[\]/.test(cfg),true);
  es('existe el SQL',fs.existsSync(R+'sql/alimentacion_proyeccion.sql'),true);
  const sql=fs.readFileSync(R+'sql/alimentacion_proyeccion.sql','utf8');
  es('  crea las tres tablas',
    /create table if not exists public\.alim_precios/.test(sql)
    &&/create table if not exists public\.alim_locales/.test(sql)
    &&/create table if not exists public\.alim_rancho/.test(sql),true);
  es('  deja Oyón cargada',/'Oyón'/.test(sql),true);
  es('  y refresca el caché de la API',/notify pgrst/.test(sql),true);
  es('todo lo nuevo lleva prefijo _apy',
    [...src.matchAll(/^(?:const|let|function|async function)\s+([A-Za-z_$][\w$]*)/gm)].map(m=>m[1])
      .every(n=>/^_(apy|APY)/.test(n)),true);

  console.log('\n'+(mal?'X '+mal+' fallo(s)':'OK todo bien')+'  ·  '+ok+'/'+(ok+mal));
  process.exit(mal?1:0);
})();
