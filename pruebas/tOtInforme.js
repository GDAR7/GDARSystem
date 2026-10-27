// Programación de Equipos · informe técnico de la OT.
// Descripción de varias líneas (Enter o «//»), lugar, conclusiones y fotos solo
// con estado Completado, e informe PDF con el encabezado de Auxilios.
const fs=require('fs'),vm=require('vm');
const R='c:/Users/LENOVO/OneDrive/Documents/GitHub/GDARSystem/';
let ok=0,mal=0;
const es=(l,g,e)=>{const b=String(g)===String(e);b?ok++:mal++;
  console.log((b?'  OK  ':'  MAL ')+l.padEnd(62)+'= '+g+(b?'':'  (esperado '+e+')'));};

const nodos={};
const nodo=id=>nodos[id]||(nodos[id]={id,innerHTML:'',value:'',textContent:'',style:{},selectedIndex:0,focus(){}});
const BASE={columnas:false,guardados:[],subidas:[],borradas:[]};
const supa={
  from:()=>({select:()=>({limit:async()=>BASE.columnas?{data:[],error:null}:{data:null,error:{message:'column mantenimientos.lugar does not exist'}}})}),
  storage:{from:()=>({
    upload:async(path,blob)=>{BASE.subidas.push(path);return{error:null};},
    getPublicUrl:path=>({data:{publicUrl:'https://x.supabase.co/storage/v1/object/public/AuxMec_Evidencias/'+path}}),
    remove:async(p)=>{BASE.borradas.push(...p);return{error:null};}})}
};
let impreso='';
const toasts=[];
const DB={mantenimientos:[
  {id:1,ot:'OT-079-26',eqId:7,tipo:'PM1 – 250 horas',desc:'Cambio de filtro de combustible // Cambio de filtro de aceite',mec:'CARHUACHIN VARGAS, FRANK',fp:'2026-10-20',fe:'2026-10-20',hs:1571,est:'Completado'},
  {id:2,ot:'OT-080-26',eqId:7,tipo:'PM2 – 500 horas',desc:'Revisión <b>general</b>',mec:'NAVARRO',fp:'2026-10-25',fe:null,hs:0,est:'Programado'}
],equipos:[{id:7,codigo:'EXC ECOP-002',nombre:'Excavadora CATERPILLAR',tipo:'Línea Amarilla',sub:'Excavadora',marca:'CATERPILLAR',modelo:'336',placa:'',proyecto:'EPY-004-26'}]};
let _nid=100;
const ctx=vm.createContext({DB,console:{warn(){},log(){}},Math,Number,String,Object,Array,JSON,Set,Map,isFinite,parseFloat,Date,Promise,
  document:{getElementById:nodo,createElement:()=>({getContext:()=>({drawImage(){}})})},
  window:{location:{href:'https://ecosermo.gdarei.com/index.html'},open:()=>({document:{write:h=>{impreso=h;},close(){}}})},
  supa,EMPRESA:{logo:'img/logo.png'},CU:{nombre:'Abel R.'},
  supaUpsert:async(k,f)=>{BASE.guardados.push(JSON.parse(JSON.stringify(f)));return null;},
  toast:(m,e)=>toasts.push((e?'✗ ':'')+m),confirm:()=>true,openM(){},closeM(){},
  fmtN:n=>Number(n).toLocaleString('en-US',{minimumFractionDigits:1,maximumFractionDigits:1}),bge:x=>'['+x+']',
  today:()=>'2026-10-26',nid:()=>++_nid});
const SRC=fs.readFileSync(R+'js/mantenimiento.js','utf8');
const ini=SRC.indexOf('let _mantEditId=null;'),fin=SRC.indexOf('function printProgGantt(){');
vm.runInContext(SRC.slice(ini,fin).replace(/^const /gm,'var ').replace(/^let /gm,'var '),ctx,{filename:'mantenimiento.js'});
const ev=x=>vm.runInContext(x,ctx);
const espera=()=>new Promise(r=>setImmediate(r));

(async()=>{
console.log('\n== Saltos de línea en la descripción ==');
es('«//» baja de renglón',ev("_otLineas('A // B//C').join('|')"),'A|B|C');
es('Enter también',ev("_otLineas('A\\r\\nB\\n\\nC').join('|')"),'A|B|C');
es('una dirección web no se parte',ev("_otLineas('ver https://x.com').length"),1);
es('se escapa el HTML',ev("_otTxtHtml('<b>x</b> // y')"),'&lt;b&gt;x&lt;/b&gt;<br>y');
ev('rProg=function(){}');
const RP=SRC.slice(SRC.indexOf('function rProg(){'),SRC.indexOf('let _mantVerId=null;'));
vm.runInContext(RP.replace(/^function rProg/,'rProg=function'),ctx);
nodo('progFDesde');nodo('progFHasta');ev('rProg()');
es('la tabla muestra la OT con sus dos renglones',/Cambio de filtro de combustible<br>Cambio de filtro de aceite/.test(nodo('tbProg').innerHTML),true);
es('  y no interpreta HTML de la descripción',/Revisión &lt;b&gt;general/.test(nodo('tbProg').innerHTML),true);

console.log('\n== 🖨 solo con Completado ==');
const filas=nodo('tbProg').innerHTML.split('<tr>').slice(1);
es('la completada tiene 🖨',/imprimirMant\(1\)/.test(filas[0]),true);
es('la programada no',/imprimirMant/.test(filas[1]),false);
ev('imprimirMant(2)');
es('  ni se puede forzar',toasts.pop()+' · '+impreso,'✗ El informe se emite cuando la OT está Completada · ');

console.log('\n== La sección del informe en el formulario ==');
nodo('otEs').value='Programado';ev('_otEstToggle()');
es('con Programado no se ve',nodo('otInformeWrap').style.display,'none');
nodo('otEs').value='Completado';ev('_otEstToggle()');
es('al cambiar a Completado aparece',nodo('otInformeWrap').style.display,'');
ev('editMant(1)');
es('editar trae el estado y muestra la sección',nodo('otEs').value+' · '+nodo('otInformeWrap').style.display,'Completado · ');
ev('editMant(2)');
es('una programada la oculta',nodo('otInformeWrap').style.display,'none');

console.log('\n== Guardar antes de correr el SQL ==');
ev('editMant(1)');
Object.assign(nodo('otEq'),{value:'7'});nodo('otTi').value='PM1 – 250 horas';nodo('otN').value='OT-079-26';
nodo('otDe').value='Cambio de filtro\nCambio de aceite';nodo('otMec').value='CARHUACHIN';nodo('otFp').value='2026-10-20';
nodo('otFe').value='2026-10-20';nodo('otHs').value='1571';nodo('otEs').value='Completado';
nodo('otLugar').value='TALLER ECOSERMO R3';nodo('otConcl').value='EQUIPO OPERATIVO';
await ev('gMant()');await espera();
const g1=BASE.guardados.pop();
es('se guarda la OT',g1&&g1.ot,'OT-079-26');
es('  sin las columnas que todavía no existen',['lugar','conclusiones','fotos'].some(k=>k in g1),false);
es('  con la descripción de dos renglones',JSON.stringify(g1.desc),JSON.stringify('Cambio de filtro\nCambio de aceite'));
es('  y avisa que falta el SQL',/necesitan correr sql\/mantenimientos_informe\.sql/.test(toasts.join()),true);
es('  en pantalla quedan los datos',ev('DB.mantenimientos[0].lugar'),'TALLER ECOSERMO R3');
ev('editMant(1)');
await ev("_otSubirFotos({files:[{name:'a.jpg',size:100,type:'image/jpeg'}],value:''})");
es('subir fotos sin el SQL: no sube y lo dice',BASE.subidas.length+' · '+/primero corra sql/.test(toasts.pop()),'0 · true');

console.log('\n== Con el SQL corrido ==');
BASE.columnas=true;ev('_otExtras=null');
await ev('gMant()');await espera();
const g2=BASE.guardados.pop();
es('guarda lugar y conclusiones',g2.lugar+' · '+g2.conclusiones,'TALLER ECOSERMO R3 · EQUIPO OPERATIVO');
ev('editMant(1)');
await ev("_otSubirFotos({files:[{name:'a.jpg',size:100,type:'image/jpeg'},{name:'b.png',size:100,type:'image/png'}],value:''})");
es('sube las fotos a mantenimientos/<id>/',BASE.subidas.length+' · '+BASE.subidas.every(p=>/^mantenimientos\/1\//.test(p)),'2 · true');
const fotos=ev('_otFotos(DB.mantenimientos[0])');
es('  quedan en la OT con quién y cuándo',fotos.length+' · '+fotos[0].por+' · '+fotos[0].fecha,'2 · Abel R. · 2026-10-26');
es('  y se guardan en la base al momento',JSON.parse(BASE.guardados.pop().fotos).length,2);
es('  se ven en el formulario',(nodo('otFotosGal').innerHTML.match(/<img/g)||[]).length,2);
await ev('_otQuitarFoto(0)');
es('quitar una la borra del almacenamiento y de la OT',BASE.borradas.length+' · '+ev('_otFotos(DB.mantenimientos[0]).length'),'1 · 1');
// Editar después: las fotos no se pierden
await ev('gMant()');await espera();
es('guardar de nuevo conserva las fotos',JSON.parse(BASE.guardados.pop().fotos||'[]').length,1);

console.log('\n== OT nueva con fotos ==');
ev('openMant=function(){_mantEditId=null;}');ev('openMant()');
nodo('otN').value='OT-081-26';nodo('otEs').value='Completado';nodo('otDe').value='PM nueva';
const n0=DB.mantenimientos.length;
await ev("_otSubirFotos({files:[{name:'c.jpg',size:100,type:'image/jpeg'}],value:''})");
es('se guarda primero y queda en modo edición',(DB.mantenimientos.length-n0)+' · '+(ev('_mantEditId')!==null),'1 · true');
es('  y la foto se sube a su carpeta',/^mantenimientos\/\d+\//.test(BASE.subidas[BASE.subidas.length-1]),true);
const nueva=ev('DB.mantenimientos[DB.mantenimientos.length-1]');
es('  la OT nueva tiene su foto',ev('_otFotos(DB.mantenimientos[DB.mantenimientos.length-1]).length'),1);
await ev('gMant()');
es('  al presionar Guardar no se duplica',DB.mantenimientos.length-n0,1);

console.log('\n== Anteriores ==');
ev('_otPopulateDescDatalist()');
es('el combo ofrece las descripciones ya usadas',/Cambio de filtro · Cambio de aceite/.test(nodo('otDeAnt').innerHTML),true);
nodo('otDe').value='';const sel=nodo('otDeAnt');sel.value='0';ev('_otUsarAnterior(document.getElementById("otDeAnt"))');
es('al elegir una se copia con sus renglones',JSON.stringify(nodo('otDe').value),JSON.stringify('Cambio de filtro\nCambio de aceite'));
nodo('otDe').value='x';sel.value='';ev('_otUsarAnterior(document.getElementById("otDeAnt"))');
es('elegir «Anteriores…» no cambia nada',nodo('otDe').value,'x');

console.log('\n== El informe PDF ==');
ev('DB.mantenimientos[0].fotos=JSON.stringify([1,2,3,4].map(i=>({url:"https://f/"+i+".jpg"})))');
ev('imprimirMant(1)');
es('encabezado de Auxilios con el título del informe',/INFORME TÉCNICO DE MANTENIMIENTO/.test(impreso)&&/Sistema de Control de Mantenimiento – GDAR/.test(impreso)&&/img\/logo\.png/.test(impreso),true);
es('  N° de OT en el recuadro',/border:2px solid #ef4444[^>]*>OT-079-26</.test(impreso),true);
es('  nada del encabezado del modelo',/PROYECTO R3 ECOSERMO|Página 1 de 1|ECOSERMOYÓN/i.test(impreso),false);
es('datos generales: marca / modelo',/CATERPILLAR \/ 336/.test(impreso),true);
es('  tipo, código y horómetro',/>Excavadora</.test(impreso)&&/EXC ECOP-002/.test(impreso)&&/1,571\.0 h/.test(impreso),true);
es('  fecha de atención y lugar',/20\/10\/2026/.test(impreso)&&/TALLER ECOSERMO R3/.test(impreso),true);
es('trabajo realizado en renglones',/Cambio de filtro<br>Cambio de aceite/.test(impreso),true);
es('fotos: 3 por fila (4 fotos = 2 filas)',(impreso.match(/height:250px/g)||[]).length+' celdas · '+(impreso.match(/<img src="https:\/\/f\//g)||[]).length+' fotos','6 celdas · 4 fotos');
es('conclusiones',/4\. CONCLUSIONES Y RECOMENDACIONES[\s\S]*EQUIPO OPERATIVO/.test(impreso),true);
es('firmas de mecánico y supervisor',/Mecánico: CARHUACHIN/.test(impreso)&&/>Supervisor</.test(impreso),true);

console.log('\n== Ver ==');
ev('verMant(1)');
es('la completada muestra el botón de informe',nodo('mantVerPrint').style.display,'');
es('  con lugar, conclusiones y fotos',/TALLER ECOSERMO R3/.test(nodo('mantVerBody').innerHTML)&&/EQUIPO OPERATIVO/.test(nodo('mantVerBody').innerHTML)&&/<img/.test(nodo('mantVerBody').innerHTML),true);
ev('verMant(2)');
es('la programada no',nodo('mantVerPrint').style.display+' · '+/Conclusiones/.test(nodo('mantVerBody').innerHTML),'none · false');

console.log('\n== Instalación ==');
const IX=fs.readFileSync(R+'index.html','utf8');
es('descripción de varias líneas',/<textarea id="otDe" rows="4"/.test(IX),true);
es('sección del informe oculta al abrir',/<div id="otInformeWrap" style="display:none/.test(IX),true);
es('  lugar, conclusiones y fotos',/id="otLugar"/.test(IX)&&/<textarea id="otConcl"/.test(IX)&&/onchange="_otSubirFotos\(this\)"/.test(IX),true);
es('el estado muestra/oculta la sección',/<select id="otEs" onchange="_otEstToggle\(\)">/.test(IX),true);
es('botón de informe en Ver',/id="mantVerPrint"[^>]*onclick="imprimirMant\(_mantVerId\)"/.test(IX),true);
es('versión del script subió',+((IX.match(/js\/mantenimiento\.js\?v=(\d+)"/)||[])[1])>=20,true);
const SQL=fs.readFileSync(R+'sql/mantenimientos_informe.sql','utf8');
es('el SQL agrega las 3 columnas',['lugar','conclusiones','fotos'].every(c=>new RegExp('add column if not exists '+c+'\\s').test(SQL)),true);

console.log('\n'+(mal?'✗ '+mal+' FALLAS':'OK todo bien')+'  ·  '+ok+'/'+(ok+mal));
process.exit(mal?1:0);
})();
