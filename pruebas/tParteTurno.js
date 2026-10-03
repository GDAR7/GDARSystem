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
