// Operaciones · Parte de Turno.
// Formulario de campo: registra los trabajos del turno y las horas perdidas
// por clima. Solo registra; no lista lo ya guardado.
const fs=require('fs'),vm=require('vm');
const R='c:/Users/LENOVO/OneDrive/Documents/GitHub/GDARSystem/';
let ok=0,mal=0;
const es=(l,g,e)=>{const b=String(g)===String(e);b?ok++:mal++;
  console.log((b?'  OK  ':'  MAL ')+l.padEnd(62)+'= '+g+(b?'':'  (esperado '+e+')'));};

const DB={
  frentesTrabajo:[
    {codigo:'FT-02',nombre:'R3 - Dique Auxiliar'},
    {codigo:'FT-01',nombre:'Acceso Este'},
    {codigo:'FT-03',nombre:'Huantajaya'}
  ],
  equipos:[
    {id:1,codigo:'EXC ECOP-003',est:'Operativo'},
    {id:2,codigo:'VOL ECOP-001',est:'Operativo'},
    {id:3,codigo:'ROD VIEJO',   est:'Desmovilizado'}
  ],
  partesTurno:[]
};

// ── DOM simulado: suficiente para armar el formulario y leerlo ──────────────
const nodos={};
function Nodo(id,tag){
  return{id,tagName:tag||'DIV',innerHTML:'',textContent:'',value:'',checked:false,
    style:{},dataset:{},children:[],disabled:false,
    focus(){},remove(){},closest(){return null;},
    insertAdjacentHTML(pos,html){this.innerHTML+=html;},
    querySelector(){return null;},querySelectorAll(){return [];}};
}
const nodo=id=>nodos[id]||(nodos[id]=Nodo(id));
let guardados=[],avisos=[];
const ctx=vm.createContext({
  DB,console,Date,Math,Number,String,Object,Array,JSON,Set,isFinite,parseFloat,parseInt,
  document:{getElementById:nodo,querySelector:()=>null,querySelectorAll:()=>[],
    createElement:()=>Nodo('tmp'),addEventListener(){},body:{appendChild(){}}},
  window:{location:{href:'https://ecosermo.gdarei.com/index.html'},open:()=>null},
  location:{href:'https://ecosermo.gdarei.com/index.html'},
  localStorage:{getItem:()=>null,setItem(){},removeItem(){}},
  toast:(m,e)=>avisos.push({m,e:!!e}),confirm:()=>true,
  nidSeguro:(nx,k)=>(DB[k]||[]).reduce((m,r)=>Math.max(m,+r.id||0),0)+1,
  supaUpsert:async(k,rec)=>{guardados.push({k,rec});return null;},
  supaDelete:async()=>{},
  CU:{nombre:'Juan Pérez'},EMPRESA:{nombre:'ECOSERMO',logo:'img/logo.png'}
});
vm.runInContext(fs.readFileSync(R+'js/parteTurno.js','utf8'),ctx,{filename:'parteTurno.js'});
const ev=x=>vm.runInContext(x,ctx);

console.log('\n== Horas entre dos horas ==');
es('de 14:00 a 17:30 son 3.5',ev('_ptHorasEntre("14:00","17:30")'),3.5);
es('media hora',ev('_ptHorasEntre("08:00","08:30")'),0.5);
es('cruzando la medianoche: 22:00 a 02:00 son 4',ev('_ptHorasEntre("22:00","02:00")'),4);
es('sin hora de inicio no hay horas',ev('_ptHorasEntre("","10:00")'),0);
es('sin hora de fin tampoco',ev('_ptHorasEntre("10:00","")'),0);
es('una hora inválida no rompe',ev('_ptHorasEntre("abc","10:00")'),0);

console.log('\n== Los catálogos salen del sistema ==');
es('los frentes son los cargados, ordenados',ev('_ptFrentes().join(" · ")'),
  'Acceso Este · Huantajaya · R3 - Dique Auxiliar');
es('los equipos son los operativos',ev('_ptEquipos().join(",")'),'EXC ECOP-003,VOL ECOP-001');
es('  sin los desmovilizados',ev('_ptEquipos().includes("ROD VIEJO")'),false);
DB.frentesTrabajo=[];
es('sin frentes cargados avisa, no deja el combo vacío',ev('_ptFrentes()[0]'),'(sin frentes cargados)');
DB.frentesTrabajo=[{codigo:'FT-01',nombre:'Acceso Este'},{codigo:'FT-02',nombre:'R3 - Dique Auxiliar'}];

console.log('\n== La fila de actividad ==');
const fila=ev('_ptFilaActividad()');
es('trae el frente',/class="pt-frente"/.test(fila),true);
es('  la descripción',/class="pt-desc"/.test(fila),true);
es('  cantidad y unidad',/class="pt-cant"/.test(fila)&&/class="pt-unid"/.test(fila),true);
es('  y los equipos como casillas',/type="checkbox"/.test(fila),true);
es('las unidades incluyen viajes y m³',/>viajes</.test(fila)&&/>m³</.test(fila),true);
es('se numeran',/Actividad 2/.test(ev('_ptFilaActividad()')),true);
es('cada una se puede quitar',/_ptQuitarActividad\(this\)/.test(fila),true);

console.log('\n== Contraer las actividades anteriores ==');
// Una actividad simulada: los campos que lee el resumen y una lista de clases
function actFalsa(vals,nEq){
  const cls=new Set();
  const campos={
    '.pt-frente':{value:vals.frente},'.pt-desc':{value:vals.desc},
    '.pt-cant':{value:vals.cant},'.pt-unid':{value:vals.unid},
    '.pt-act-fr':{textContent:''},'.pt-act-res':{textContent:''},'.pt-act-chev':{textContent:'▾'}
  };
  return{
    classList:{toggle(c,on){on?cls.add(c):cls.delete(c);},contains:c=>cls.has(c)},
    querySelector:s=>campos[s]||null,
    querySelectorAll:()=>Array(nEq||0).fill({}),
    campos
  };
}
const a1=actFalsa({frente:'Acceso Nor Oeste',desc:'Corte y carguío\nde material',cant:'12',unid:'viajes'},2);
ctx.__a=a1;
ev('_ptColapsar(__a,true)');
es('al contraerla, la cabecera dice el frente',a1.campos['.pt-act-fr'].textContent,'Acceso Nor Oeste');
es('  y un resumen en una sola línea',a1.campos['.pt-act-res'].textContent,
  'Corte y carguío de material · 12 viajes · 2 equipos');
es('  con la flecha de cerrada',a1.campos['.pt-act-chev'].textContent,'▸');
ev('_ptColapsar(__a,false)');
es('al abrirla, el resumen desaparece',a1.campos['.pt-act-res'].textContent,'');
es('  pero el frente se queda en el título',a1.campos['.pt-act-fr'].textContent,'Acceso Nor Oeste');
const a2=actFalsa({frente:'Huantajaya',desc:'',cant:'',unid:'viajes'},0);
ctx.__a=a2;
ev('_ptColapsar(__a,true)');
es('si quedó sin descripción, la cabecera lo advierte',a2.campos['.pt-act-res'].textContent,'⚠ sin descripción');
const larga='x'.repeat(90);
ctx.__a=actFalsa({frente:'F',desc:larga,cant:'',unid:''},0);
es('una descripción larga se recorta',ev('_ptResumenAct(__a)').length,61);
const srcC=fs.readFileSync(R+'js/parteTurno.js','utf8');
es('agregar una nueva contrae las anteriores',/forEach\(a=>_ptColapsar\(a,true\)\)/.test(srcC),true);
es('la cabecera se abre y cierra al tocarla',/onclick="_ptToggleActividad\(this\)"/.test(srcC),true);
es('  Quitar no la abre por accidente',/event\.stopPropagation\(\);_ptQuitarActividad/.test(srcC),true);
es('cambiar el frente actualiza el título',/onchange="_ptPintarCabecera\(this\.closest\('\.pt-act'\)\)"/.test(srcC),true);

console.log('\n== Ubicar el trabajo en la imagen aérea ==');
// Como en el proyecto real: C. Huantajalla contiene a C. Huantajalla 1A
const _frPrev=DB.frentesTrabajo;
DB.frentesTrabajo=[
  {nombre:'C. Huantajalla',   puntos:[{x:10,y:10},{x:50,y:10},{x:50,y:50},{x:10,y:50}]},
  {nombre:'C. Huantajalla 1A',puntos:[{x:20,y:20},{x:30,y:20},{x:30,y:30},{x:20,y:30}]},
  // En forma de L: el hueco no es parte del frente
  {nombre:'R3 - Lado este',   puntos:[{x:60,y:10},{x:90,y:10},{x:90,y:20},{x:70,y:20},{x:70,y:50},{x:60,y:50}]},
  {nombre:'Acceso Nor Oeste'},                                  // sin área dibujada
  {nombre:'Cantera',puntos:[{x:1,y:1},{x:2,y:2}]}                // dos puntos: no es área
];
es('solo cuentan los frentes con área dibujada',ev('_ptFrentesMapa().map(f=>f.nombre).join(" · ")'),
  'C. Huantajalla · C. Huantajalla 1A · R3 - Lado este');
const fr=(x,y)=>ev(`_ptFrenteEnPunto({x:${x},y:${y}})`);
es('un toque en el grande elige el grande',fr(40,40),'C. Huantajalla');
es('dentro del chico, gana el chico: es el más preciso',fr(25,25),'C. Huantajalla 1A');
es('en la L, sobre el brazo, es Lado este',fr(65,40),'R3 - Lado este');
es('  en el hueco de la L no',fr(80,40),null);
es('fuera de todo, ninguno',fr(95,95),null);
es('sin punto, ninguno',ev('_ptFrenteEnPunto(null)'),null);
es('el área del cuadrado de 10×10',ev('_ptAreaPoligono([{x:0,y:0},{x:10,y:0},{x:10,y:10},{x:0,y:10}])'),100);

// El toque se convierte a % de la imagen, con cualquier zoom o scroll
nodo('ptMapaBox').getBoundingClientRect=()=>({left:100,top:50,width:800,height:400});
ev('_ptMapAct={dataset:{n:"1"},querySelector:()=>({value:"C. Huantajalla"})}');
ev('_ptMapaToque({clientX:300,clientY:150})');
es('un toque a 1/4 del ancho y 1/4 del alto da 25%, 25%',ev('JSON.stringify(_ptMapPt)'),'{"x":25,"y":25}');
ev('_ptMapaToque({clientX:5000,clientY:-20})');
es('fuera de la imagen se pega al borde',ev('JSON.stringify(_ptMapPt)'),'{"x":100,"y":0}');
es('la ventana muestra el punto y su frente',(()=>{ev('_ptMapPt={x:25,y:25};_ptMapaPintar()');
  return /C\. Huantajalla 1A<\/b> · se elegirá este frente/.test(nodo('ptMapa').innerHTML);})(),true);
es('  con los polígonos dibujados',(nodo('ptMapa').innerHTML.match(/<polygon /g)||[]).length,3);
es('  y la imagen aérea de fondo',/R3_2026_IMAGEN\.png/.test(nodo('ptMapa').innerHTML),true);
es('  con zoom para afinar en el celular',/_ptMapaZoom\(1\)/.test(nodo('ptMapa').innerHTML),true);

// Usar el punto: guarda x,y en la actividad y elige el frente
const campos={'.pt-x':{value:''},'.pt-y':{value:''},
  '.pt-frente':{value:'C. Huantajalla',options:[{value:'C. Huantajalla'},{value:'C. Huantajalla 1A'},{value:'R3 - Lado este'}]},
  '.pt-ubic':{textContent:'',style:{}},'.pt-act-fr':{textContent:''},'.pt-act-res':{textContent:''},
  '.pt-act-chev':{textContent:''},'.pt-desc':{value:''},'.pt-cant':{value:''},'.pt-unid':{value:'viajes'}};
const actU={dataset:{n:'1'},classList:{toggle(){},contains:()=>false},
  querySelector:s=>campos[s]||null,querySelectorAll:()=>[]};
ctx.__act=actU;
ev('_ptMapAct=__act;_ptMapPt={x:25,y:25};_ptMapaUsar()');
es('el punto queda en la actividad',campos['.pt-x'].value+','+campos['.pt-y'].value,'25,25');
es('  y el frente se elige solo',campos['.pt-frente'].value,'C. Huantajalla 1A');
es('  el título lo refleja',campos['.pt-act-fr'].textContent,'C. Huantajalla 1A');
es('  y la fila dice dónde quedó',/📍 C\. Huantajalla 1A · 25\.0%, 25\.0%/.test(campos['.pt-ubic'].textContent),true);
// Fuera de los frentes: se guarda el punto y se respeta lo elegido
ev('_ptMapAct=__act;_ptMapPt={x:95,y:95};_ptMapaUsar()');
es('fuera de todo se guarda igual el punto',campos['.pt-x'].value,'95');
es('  sin cambiar el frente elegido',campos['.pt-frente'].value,'C. Huantajalla 1A');
es('  y lo dice',/Fuera de los frentes dibujados/.test(campos['.pt-ubic'].textContent),true);
// Quitarla
ev('_ptMapAct=__act;_ptMapaQuitar()');
es('quitar la ubicación la deja vacía',campos['.pt-x'].value+'|'+campos['.pt-y'].value,'|');
es('  y vuelve a ser opcional',campos['.pt-ubic'].textContent,'Sin ubicar · opcional');
DB.frentesTrabajo=_frPrev;
es('la fila trae el botón del mapa',/_ptAbrirMapa\(this\)/.test(ev('_ptFilaActividad()')),true);
es('  y es opcional',/Sin ubicar · opcional/.test(ev('_ptFilaActividad()')),true);
es('se guarda dentro de la actividad, sin tocar la tabla',
  /ubicacion:\(x!==''&&y!==''\)\?\{x:\+x,y:\+y\}:null/.test(fs.readFileSync(R+'js/parteTurno.js','utf8')),true);

console.log('\n== Qué paraliza el frente ==');
const para=s=>ev('_PT_CLIMA_PARA.test("'+s+'")');
es('la lluvia fuerte sí',para('Lluvia fuerte'),true);
es('el granizo también',para('Granizo'),true);
es('la nevada y la neblina',para('Nevada')&&para('Neblina'),true);
es('despejado no',para('Despejado'),false);
es('nublado tampoco',para('Nublado'),false);

console.log('\n== La pantalla ==');
ev('rParteTurno()');
const H=nodo('page-parteTurno').innerHTML;
es('se titula Parte de Turno',/Parte de Turno/.test(H),true);
es('tiene fecha y turno',/id="ptFecha"/.test(H)&&/name="ptTurno"/.test(H),true);
es('  arranca en turno día',/id="ptTurnoDia" value="Día" checked/.test(H),true);
es('una actividad desde el inicio',(H.match(/class="pt-act"/g)||[]).length,1);
es('  y el botón para agregar más',/_ptAgregarActividad\(\)/.test(H),true);
es('el bloque de clima con sus horas',/id="ptClima"/.test(H)&&/id="ptClimaIni"/.test(H),true);
es('pendiente para el siguiente turno',/id="ptPendiente"/.test(H),true);
es('observaciones',/id="ptObs"/.test(H),true);
es('quién registra, con el usuario puesto',/id="ptAutor" value="Juan Pérez"/.test(H),true);
es('el botón de guardar',/_ptGuardar\(\)/.test(H),true);
es('NO lista lo ya registrado',/registrados|Partes guardados|Resumen/.test(H),false);
es('los campos se apilan en pantalla angosta',/@media\(max-width:560px\)/.test(H),true);
es('ninguna celda rota',/undefined|NaN/.test(H),false);

console.log('\n== Enganche ==');
const cfg=fs.readFileSync(R+'js/config.js','utf8');
const uti=fs.readFileSync(R+'js/utils.js','utf8');
const html=fs.readFileSync(R+'index.html','utf8');
const src=fs.readFileSync(R+'js/parteTurno.js','utf8');
es('el módulo está en Operaciones',/key:'parteTurno',label:'Parte de Turno'/.test(cfg),true);
es('la tabla está declarada',/partesTurno:'partes_turno'/.test(cfg),true);
es('  con su arreglo en DB',/partesTurno:\[\]/.test(cfg),true);
es('el router lo dibuja',/parteTurno:rParteTurno/.test(uti),true);
es('index tiene su página',/id="page-parteTurno"/.test(html),true);
es('  y carga el módulo',/js\/parteTurno\.js\?v=/.test(html),true);
es('existe el SQL',fs.existsSync(R+'sql/partes_turno.sql'),true);
const sql=fs.readFileSync(R+'sql/partes_turno.sql','utf8');
es('  crea la tabla',/create table if not exists public\.partes_turno/.test(sql),true);
es('  guarda las actividades como JSON',/actividades\s+jsonb/.test(sql),true);
es('  y las horas perdidas',/horas_perdidas/.test(sql),true);
es('  con RLS como las demás',/create policy gdar_autenticado on public\.partes_turno/.test(sql),true);
es('todo lo nuevo lleva prefijo _pt',
  [...src.matchAll(/^(?:const|let|function|async function)\s+([A-Za-z_$][\w$]*)/gm)].map(m=>m[1])
    .every(n=>/^_(pt|PT)/.test(n)||n==='rParteTurno'),true);

console.log('\n== Que funcione en celular ==');
const css=fs.readFileSync(R+'css/styles.css','utf8');
es('hay reglas para pantalla angosta',/@media\(max-width:820px\)/.test(css),true);
es('  el menú flota en vez de comerse el ancho',/nav\{position:fixed/.test(css),true);
es('  el contenido toma toda la pantalla',/\.shell-body\{display:block/.test(css),true);
es('  las tablas anchas se deslizan',/\.tbl-wrap\{overflow-x:auto/.test(css),true);
es('  los formularios de los modales se apilan',/\.fg-grid\{grid-template-columns:1fr!important/.test(css),true);
es('  y los KPI pasan a una sola columna en el teléfono',/@media\(max-width:480px\)/.test(css),true);
es('el menú arranca cerrado en celular',/_navAutoCelular/.test(fs.readFileSync(R+'js/datos.js','utf8')),true);
es('  y se cierra al elegir un módulo',/window\.innerWidth<=820/.test(uti),true);
es('el escritorio no cambia: todo va dentro de media queries',
  css.indexOf('nav{position:fixed')>css.indexOf('@media(max-width:820px)'),true);

console.log('\n== La app instalable ==');
es('existe el manifest',fs.existsSync(R+'manifest.json'),true);
const man=JSON.parse(fs.readFileSync(R+'manifest.json','utf8'));
es('  se instala como app',man.display,'standalone');
es('  con nombre corto',man.short_name,'GDAR');
es('index lo declara',/rel="manifest"/.test(html),true);
es('existe el service worker',fs.existsSync(R+'sw.js'),true);
const sw=fs.readFileSync(R+'sw.js','utf8');
es('  no toca lo que no es de este dominio',/url\.origin !== self\.location\.origin/.test(sw),true);
es('  ni las escrituras',/req\.method !== 'GET'/.test(sw),true);
es('  y para index va primero a la red',/req\.mode === 'navigate'/.test(sw),true);

console.log('\n'+(mal?'X '+mal+' fallo(s)':'OK todo bien')+'  ·  '+ok+'/'+(ok+mal));
process.exit(mal?1:0);
