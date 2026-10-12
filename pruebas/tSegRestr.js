// Seguimiento General · pestaña «⛔ Restricciones LPS».
// Modelo de la hoja de seguimiento de restricciones del LPS, guardado en la
// tabla «seguimiento» con esRestriccion=true. Filtro de mes = vivas en el mes.
const fs=require('fs'),vm=require('vm');
const R='c:/Users/LENOVO/OneDrive/Documents/GitHub/GDARSystem/';
let ok=0,mal=0;
const es=(l,g,e)=>{const b=String(g)===String(e);b?ok++:mal++;
  console.log((b?'  OK  ':'  MAL ')+l.padEnd(62)+'= '+g+(b?'':'  (esperado '+e+')'));};

const HOY='2026-10-11';
const X=(id,numero,titulo,o)=>Object.assign({id,numero,titulo,esRestriccion:true,est:'Abierta',prioridad:'Media',tipoRestr:'Externa'},o);
const DB={seguimiento:[
  // Tareas normales del Tablero: no deben aparecer en Restricciones
  {id:1,titulo:'Tarea del tablero',responsable:'RODRIGUEZ, ANDRES',est:'Pendiente',fechaProm:'2026-10-20'},
  {id:2,titulo:'Tarea bloqueada',responsable:'MAMANI, JUAN',est:'Bloqueado',restriccion:'Falta de materiales',fechaBloq:'2026-10-05'},
  // Restricciones 18–22 de la hoja
  X(18,18,'Liberación de CAM 003 CLW-850',{actividad:'Todos los frentes',tipoRestr:'Interna',responsable:'Nohelia P. / Jaime A.',fecha:'2026-09-30',fechaProm:'2026-10-09',est:'En gestión',reprog:1}),
  X(19,19,'Cemento para concreto',{actividad:'Vaciado de concreto',responsable:'Yonder M.',fecha:'2026-10-01',fechaProm:'2026-10-09',est:'En gestión',reprog:1,fechaComp:'2026-10-10'}),
  X(20,20,'Agregado para concreto',{responsable:'Yonder M. / Andrés R.',fecha:'2026-10-01',fechaProm:'2026-10-08',prioridad:'Alta',reprog:1}),
  X(21,21,'Agregado para poza de Dique Auxiliar',{responsable:'Yonder M. / Andrés R.',fecha:'2026-10-06',fechaProm:'2026-10-08',prioridad:'Alta',reprog:1}),
  X(22,22,'Flexilonas',{tipoRestr:'Sponsor',responsable:'Iván M. / Elver C.',fecha:'2026-09-11',fechaProm:'2026-10-12',reprog:2,restriccionDet:'Se presentó cotizaciones de flexilonas al sponsor.'}),
  // Levantadas
  X(12,12,'Permiso de voladura',{fecha:'2026-09-02',fechaProm:'2026-09-15',est:'Levantada',fechaComp:'2026-09-14',prioridad:'Alta'}),
  X(13,13,'Geomembrana HDPE',{tipoRestr:'Sponsor',fecha:'2026-08-05',fechaProm:'2026-08-20',est:'Levantada',fechaComp:'2026-08-22'})
]};
const nodos={};const nodo=id=>nodos[id]||(nodos[id]={id,innerHTML:'',style:{},value:'',classList:{toggle(){},add(){},remove(){}},focus(){},setSelectionRange(){}});
const synced=[];let xls=null,hoja=null,confirma=true;
const ctx=vm.createContext({DB,console,Math,Date,String,Object,Array,Set,JSON,Number,
  document:{getElementById:nodo,activeElement:null,querySelectorAll:()=>[],createElement:()=>({innerHTML:'',firstChild:null}),body:{appendChild(){}}},
  today:()=>HOY,toast(){},openM(){},closeM(){},alert(){},confirm:()=>confirma,
  syncSheet:(k,r)=>synced.push(r),supaDelete(){},nid:()=>500,CU:{nombre:'Yo'},AREAS:{},setTimeout:f=>f(),clearTimeout(){},
  XLSX:{utils:{aoa_to_sheet:a=>(hoja=a,{}),book_new:()=>({}),book_append_sheet(){}},writeFile:(w,n)=>{xls=n;}}});
for(const f of ['seguimiento','segRestricciones'])vm.runInContext(fs.readFileSync(R+'js/'+f+'.js','utf8'),ctx,{filename:f});
const ev=x=>vm.runInContext(x,ctx);
const nums=()=>ev('_srDatos().vista.map(r=>r.t.numero).join(",")');
const calc=id=>ev(`(()=>{const D=_srDatos();return D.base.find(r=>r.t.id===${id});})()`);

console.log('\n== Separación de las tareas del Tablero ==');
es('arranca en la pestaña de Restricciones',ev('_segTab'),4);
es('solo las restricciones',ev('_srTodas().length'),7);
es('el Tablero no las ve',ev('_segTareas().map(t=>t.id).join(",")'),'1,2');

console.log('\n== Cálculos al corte (hoy 11/10) ==');
let r=calc(20);
es('la 20: antigüedad desde la detección',r.edad,10);
es('  vencida hace 3 días',r.vencida+' '+r.atraso,'true 3');
r=calc(22);
es('la 22 (compromiso mañana): por vencer',r.porVencer+' '+r.atraso,'true -1');
r=calc(12);
es('levantada: la antigüedad se congela en su fecha real',r.edad,12);
es('  y no cuenta como vencida',r.vencida,false);

console.log('\n== Filtros ==');
es('por defecto, ordenadas por atraso (más atrasada primero)',nums(),'21,20,19,18,22,13,12');
ev("_srSet('mes','2026-10')");
es('octubre: las vivas en el mes (la de agosto y la levantada en set. no)',nums().split(',').sort((a,b)=>a-b).join(','),'18,19,20,21,22');
ev("_srSet('mes','2026-09')");
es('setiembre: incluye la Flexilona detectada el 11/09',nums().split(',').includes('22'),true);
es('  y la levantada el 14/09',nums().split(',').includes('12'),true);
es('  la detectada en octubre no',nums().split(',').includes('20'),false);
es('  el corte de un mes pasado es su último día',ev('_srCorte()'),'2026-09-30');
ev("_srSet('mes','')");
ev("_srSet('tipo','Sponsor')");
es('tipo Sponsor',nums(),'22,13');
ev("_srSet('tipo','Sponsor');_srSet('imp','Alta')");
es('impacto Alto',nums(),'21,20,12');
ev("_srSet('imp','Alta');_srQ='flexilona'");
es('buscar en comentarios y títulos',nums(),'22');
ev("_srQ=''");
ev("_srOrdenar('n')");
es('ordenar por N°',nums(),'22,21,20,19,18,13,12');
ev("_srOrden='atraso';_srDesc=true");

console.log('\n== La pestaña ==');
ev('_segTabSwitch(4)');
let H=nodos.segBody.innerHTML;
es('indicadores',['Abiertas','En gestión','Vencidas','Levantadas','% Liberación','Antigüedad prom.','Impacto alto abierto'].every(k=>H.includes(k)),true);
es('  % liberación 2 de 7',/% Liberación[\s\S]{0,200}29%/.test(H),true);
es('gráficas por tipo y por responsable',/Por tipo de restricción/.test(H)&&/Carga por responsable/.test(H),true);
es('el estado vencido lo dice',/Vencida 3 d/.test(H),true);
es('la que vence mañana lo dice',/Vence en 1 d/.test(H),true);
es('las reprogramaciones se ven',/↻2/.test(H),true);
es('ninguna celda rota',/NaN|undefined/.test(H),false);
ev('_srToggle(22)');H=nodos.segBody.innerHTML;
es('tocar la fila muestra acciones y trazabilidad',/Acciones y comentarios[\s\S]*Se presentó cotizaciones/.test(H)&&/Trazabilidad/.test(H),true);
ev('_srToggle(22);_srToggle(19)');H=nodos.segBody.innerHTML;
es('avisa la inconsistencia (fecha real sin Levantada)',/Inconsistencia/.test(H),true);
ev('_srToggle(19);_srToggle(20)');
es('avisa definir nueva fecha si está vencida',/Compromiso vencido hace 3 días/.test(nodos.segBody.innerHTML),true);

console.log('\n== Guardar ==');
ev('_srEditar(20)');
nodo('srComp').value='2026-10-15';
ev('_srGuardar()');
let t=DB.seguimiento.find(x=>x.id===20);
es('mover el compromiso a después suma una reprogramación',t.reprog,2);
es('  y deja el historial',t.reprogHist.length+' '+t.reprogHist[0].de+'→'+t.reprogHist[0].a,'1 2026-10-08→2026-10-15');
es('  sigue marcada como restricción',t.esRestriccion,true);
ev('_srNueva()');
es('la nueva propone el siguiente N°',nodo('srNum').value,23);
nodo('srTit').value='Flexilonas para lluvias';nodo('srEst').value='Levantada';nodo('srReal').value='';
ev('_srGuardar()');
t=DB.seguimiento.find(x=>x.id===500);
es('levantada sin fecha real toma la de hoy',t.est+' '+t.fechaComp,'Levantada 2026-10-11');
es('  y no aparece en el Tablero',ev('_segTareas().some(x=>x.id===500)'),false);
ev('_srLevantar(21)');
es('«Levantar hoy»',DB.seguimiento.find(x=>x.id===21).est,'Levantada');

console.log('\n== Sustento del levantamiento ==');
const subidos=[],borrados=[];
ctx.supa={storage:{from:b=>({
  upload:async(path,file)=>{subidos.push(b+'/'+path);return{error:null};},
  getPublicUrl:path=>({data:{publicUrl:'https://x/'+path}}),
  remove:async p=>{borrados.push(...p);return{};}})}};
(async()=>{
  ev('_srToggle(12)');
  es('levantada sin archivos lo avisa',/Levantada sin sustento adjunto/.test(nodos.segBody.innerHTML),true);
  const input={files:[{name:'acta.pdf',type:'application/pdf',size:2e5},{name:'foto.jpg',type:'image/jpeg',size:3e5},
    {name:'planilla.xlsx',type:'application/vnd.ms-excel',size:1e4},{name:'enorme.jpg',type:'image/jpeg',size:30*1048576}],value:'x'};
  await ev('_srSubirEvid')(input,12);
  const t12=DB.seguimiento.find(x=>x.id===12);
  const e12=JSON.parse(t12.evidencias);
  es('sube imágenes y PDF (el Excel y el de 30 MB no)',e12.map(f=>f.nombre).join(','),'acta.pdf,foto.jpg');
  es('  en la carpeta de la restricción, en el depósito de Auxilios',subidos.every(p=>p.startsWith('AuxMec_Evidencias/restricciones/12/')),true);
  es('  guarda quién y cuándo',e12[0].por+' '+e12[0].fecha,'Yo 2026-10-11');
  let H=nodos.segBody.innerHTML;
  es('  se ven en el detalle (PDF como ícono, foto en miniatura)',/📄/.test(H)&&/<img src="https:\/\/x\/restricciones\/12\//.test(H),true);
  es('  la tabla muestra cuántos tiene',/📎2/.test(H),true);
  es('  ya no avisa que falta',/Levantada sin sustento adjunto/.test(H),false);
  await ev('_srBorrarEvid')(12,0);
  es('quitar un archivo lo borra del Storage',borrados.length+' '+JSON.parse(t12.evidencias).map(f=>f.nombre).join(','),'1 foto.jpg');
  ev('_srEliminar(12)');
  es('eliminar la restricción borra también sus archivos',borrados.length,2);
  ev('exportSegRestrXLSX()');
  es('el Excel trae la columna de enlaces del sustento',hoja[2][hoja[2].length-1],'Sustento (enlaces)');
  const html=fs.readFileSync(R+'index.html','utf8');
  console.log('\n== SQL del sustento ==');
  const sq=fs.readFileSync(R+'sql/seguimiento_restricciones_sustento.sql','utf8');
  es('agrega «evidencias» a la tabla real',/alter table public\.seguimiento_tareas add column if not exists evidencias text/.test(sq),true);
  fin();
})();

function fin(){
console.log('\n'+(mal?'X '+mal+' fallo(s)':'OK todo bien')+'  ·  '+ok+'/'+(ok+mal));
process.exit(mal?1:0);
}

console.log('\n== Excel ==');
ev('exportSegRestrXLSX()');
es('nombre del archivo',xls,'Restricciones_LPS_todas.xlsx');
es('columnas de la hoja original',hoja[2].slice(0,12).join('|'),'N°|Restricción|Fecha de detección|Actividad afectada|Tipo|Responsable|Fecha compromiso|Estado|Acciones / Comentarios|Fecha real de levantamiento|N° de reprogramaciones|Impacto');
es('  ordenadas por N°',hoja.slice(3).map(f=>f[0]).join(','),'12,13,18,19,20,21,22,23');
es('  con fechas dd/mm/aaaa e impacto Alto/Medio/Bajo',hoja[3][2]+' '+hoja[3][11],'02/09/2026 Alto');

console.log('\n== Enganche ==');
const html=fs.readFileSync(R+'index.html','utf8');
es('la pestaña es la primera',html.indexOf('⛔ Restricciones LPS')<html.indexOf('🗂️ Tablero'),true);
es('carga después de seguimiento.js',html.indexOf('js/segRestricciones.js')>html.indexOf('js/seguimiento.js'),true);
const sql=fs.readFileSync(R+'sql/seguimiento_restricciones.sql','utf8');
const tabla=(fs.readFileSync(R+'js/config.js','utf8').match(/^\s*seguimiento:'([^']+)'/m)||[])[1];
es('el SQL altera la tabla real de Supabase ('+tabla+')',(sql.match(/alter table public\.(\w+)/g)||[]).every(x=>x.endsWith('.'+tabla))&&!!tabla,true);
es('el SQL agrega las columnas que se guardan',['es_restriccion','numero','actividad','tipo_restr','reprog '].every(c=>sql.includes(c)),true);
// El cierre lo hace fin(), cuando termina la parte asíncrona del sustento
