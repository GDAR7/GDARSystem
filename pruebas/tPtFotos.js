// Parte de Turno · panel fotográfico.
// Fotos ligadas a cada actividad (máx. 12 por parte), en espera hasta Guardar,
// guardadas dentro de la actividad; panel al final del documento y, en el PDF,
// en hojas propias de 6 fotos.
const fs=require('fs'),vm=require('vm');
const R='c:/Users/LENOVO/OneDrive/Documents/GitHub/GDARSystem/';
let ok=0,mal=0;
const es=(l,g,e)=>{const b=String(g)===String(e);b?ok++:mal++;
  console.log((b?'  OK  ':'  MAL ')+l.padEnd(62)+'= '+g+(b?'':'  (esperado '+e+')'));};

// ── Actividades simuladas: lo justo que el código lee de cada tarjeta ───────
function Actividad(n,frente,desc){
  const campos={'.pt-frente':{value:frente},'.pt-desc':{value:desc},'.pt-cant':{value:''},'.pt-unid':{value:'m²'},
    '.pt-x':{value:''},'.pt-y':{value:''},'.pt-fotos':{innerHTML:''},'.pt-fotos-cuenta':{textContent:''},
    '.pt-act-res':{textContent:''},'.pt-act-fr':{textContent:''},'.pt-act-chev':{textContent:''}};
  const a={dataset:{n:String(n)},classList:{contains:()=>false,toggle(){}},
    querySelector:s=>campos[s]||null,remove(){a.quitada=true;}};
  return a;
}
let ACTS=[];
const nodos={};
const nodo=id=>nodos[id]||(nodos[id]={id,value:'',textContent:'',innerHTML:'',disabled:false,style:{}});
const BASE={subidas:[],insertado:null,falla:'',caeInsert:false};
const toasts=[];let urls=0;const revocadas=[];
const supa={
  from:()=>({select:()=>({order:()=>({limit:async()=>({data:[{id:10}],error:null})})}),
    insert:async fila=>{if(BASE.caeInsert)return{error:{message:'Failed to fetch'}};BASE.insertado=fila;return{error:null};}}),
  storage:{from:()=>({upload:async(p,b)=>{if(BASE.falla&&b.name===BASE.falla)return{error:{message:'red'}};BASE.subidas.push(p);return{error:null};},
    getPublicUrl:p=>({data:{publicUrl:'https://s/'+p}})})}
};
const ctx=vm.createContext({console:{warn(){},log(){}},Math,Number,String,Object,Array,JSON,Set,isFinite,parseFloat,Date,Promise,
  DB:{partesTurno:[],frentesTrabajo:[]},
  document:{getElementById:nodo,
    querySelectorAll:s=>s==='#ptActs .pt-act'?ACTS.filter(a=>!a.quitada):[],
    querySelector:s=>{const m=s.match(/data-n="(\d+)"/);return m?ACTS.find(a=>a.dataset.n===m[1])||null:null;}},
  URL:{createObjectURL:()=>'blob:'+(++urls),revokeObjectURL:u=>revocadas.push(u)},
  supa,SUPA_TABLES:{partesTurno:'partes_turno'},
  toSnake:o=>{const r={};Object.entries(o).forEach(([k,v])=>{r[k==='actividades'?'act':k.replace(/([A-Z])/g,m=>'_'+m.toLowerCase())]=v;});return r;},
  toast:(m,e)=>toasts.push((e?'✗ ':'')+m),confirm:()=>true,localStorage:{setItem(){},getItem:()=>null},
  CU:{nombre:'Supervisor'},EMPRESA:{logo:'img/logo.png'}});
vm.runInContext(fs.readFileSync(R+'js/parteTurno.js','utf8').replace(/^const /gm,'var ').replace(/^let /gm,'var '),ctx,{filename:'parteTurno.js'});
const ev=x=>vm.runInContext(x,ctx);
// Funciones que el guardado llama y aquí no interesan
ev('_ptLimpiar=function(){Object.keys(_ptFotos).forEach(_ptFotosSoltar);_ptFotos={};_ptClave=null;};_ptPintarUltimo=function(){};');
const foto=(n,hh)=>({name:n,size:100,type:'image/jpeg',lastModified:new Date(2026,9,26,hh||10,42).getTime()});
const elegir=(act,nombres)=>{ctx.__in={files:nombres.map((x,i)=>foto(x,8+i)),value:'x',closest:()=>act};ev('_ptFotosAgregar(__in)');};
const formulario=()=>{nodo('ptFecha').value='2026-10-26';nodo('ptAutor').value='Edwin Quispe';nodo('ptClima').value='Despejado';};

(async()=>{
console.log('\n== Cada actividad tiene su botón 📷 ==');
const html=ev('_ptFilaActividad()');
es('botón de fotos con cámara o galería',/class="pt-btn-foto">📷 Fotos<input type="file" accept="image\/\*" multiple onchange="_ptFotosAgregar\(this\)"/.test(html),true);
es('  sin forzar la cámara (deja elegir de la galería)',/capture=/.test(html),false);
es('  dice el máximo',/máx\. 12 por parte/.test(html),true);

console.log('\n== Agregar fotos ==');
ACTS=[Actividad(1,'R3 - Dique intermedio','Compactación capa 13'),Actividad(2,'Acceso Este','Limpieza de cuneta')];
elegir(ACTS[0],['a.jpg','b.jpg']);
es('quedan en espera, sin subir',BASE.subidas.length+' · '+ev('_ptFotosTotal()'),'0 · 2');
es('  se ven en la actividad',(ACTS[0].querySelector('.pt-fotos').innerHTML.match(/<img/g)||[]).length,2);
es('  con la hora de la cámara',/>08:42</.test(ACTS[0].querySelector('.pt-fotos').innerHTML)&&/>09:42</.test(ACTS[0].querySelector('.pt-fotos').innerHTML),true);
es('  y un comentario por foto',(ACTS[0].querySelector('.pt-fotos').innerHTML.match(/placeholder="Comentario \(opcional\)"/g)||[]).length,2);
ev("_ptFotoNota('1',0,'Sector norte')");
es('el comentario se guarda en la foto',ev("_ptFotos['1'][0].nota"),'Sector norte');
es('la cabecera contraída cuenta las fotos',/📷 2/.test(ev('_ptResumenAct(__in.closest())')),true);

console.log('\n== Máximo 12 por parte ==');
elegir(ACTS[1],Array.from({length:11},(_,i)=>'c'+i+'.jpg'));
es('de 11 solo entran 10 (2 + 10 = 12)',ev("_ptFotos['2'].length")+' · total '+ev('_ptFotosTotal()'),'10 · total 12');
es('  y avisa',/Solo entraron 10 de 11/.test(toasts.pop()),true);
elegir(ACTS[0],['x.jpg']);
es('con 12 ya no entra ninguna',ev('_ptFotosTotal()')+' · '+/es el máximo/.test(toasts.pop()),'12 · true');
ev("_ptFotoQuitar('2',9)");ev("_ptFotoQuitar('2',8)");
es('quitar libera lugar',ev('_ptFotosTotal()')+' · liberadas '+revocadas.length,'10 · liberadas 2');

console.log('\n== Quitar una actividad con fotos ==');
ACTS.push(Actividad(3,'Huantajaya','Perfilado'));
elegir(ACTS[2],['h.jpg']);
ctx.__btn={closest:()=>ACTS[2]};
const c0=document=>0;
nodo('ptActs').children=[1,2,3];
ev('_ptQuitarActividad(__btn)');
es('se quita con sus fotos',ACTS[2].quitada+' · '+ev("_ptFotos['3']===undefined")+' · total '+ev('_ptFotosTotal()'),'true · true · total 10');

console.log('\n== Fotos en una actividad sin descripción ==');
ACTS.push(Actividad(4,'Acceso Este',''));
elegir(ACTS[3],['sd.jpg']);
formulario();
await ev('_ptGuardar()');
es('no guarda y lo dice',BASE.insertado+' · '+/La actividad 4 tiene fotos pero no tiene descripción/.test(toasts.pop()),'null · true');
ev("_ptFotosSoltar('4')");ACTS[3].quitada=true;

console.log('\n== Guardar ==');
BASE.falla='c3.jpg';
await ev('_ptGuardar()');
const fila=BASE.insertado;
es('se guarda el parte',fila&&fila.id,11);
es('  las fotos se subieron a la carpeta del parte',BASE.subidas.length+' · '+BASE.subidas.every(p=>/^partes\/2026-10-26_[a-z0-9]+\//.test(p)),'9 · true');
es('  y van dentro de su actividad',fila.actividades.map(a=>(a.fotos||[]).length).join(),'2,7');
const f0=fila.actividades[0].fotos[0];
es('  con url, hora y comentario',[!!f0.url,f0.hora,f0.nota].join(' · '),'true · 08:42 · Sector norte');
es('  sin el archivo ni la vista previa local',!('file' in f0)&&!/blob:/.test(JSON.stringify(fila)),true);
es('  en la misma columna actividades (sin columna nueva)',!('fotos' in fila)&&!('act' in fila),true);
es('  avisa la que falló',toasts.some(t=>/✗ No se pudo subir: c3\.jpg\. El parte se guardó sin esa/.test(t)),true);
es('  y el total de fotos',toasts.some(t=>/✓ Parte de turno guardado · 9 foto\(s\)/.test(t)),true);
BASE.falla='';

console.log('\n== Si el parte no se guarda, no se suben dos veces ==');
ACTS=[Actividad(1,'R3 - Dique intermedio','Relleno')];
elegir(ACTS[0],['r1.jpg','r2.jpg']);
BASE.caeInsert=true;BASE.subidas=[];BASE.insertado=null;
await ev('_ptGuardar()');
es('falla el guardado: las fotos quedan subidas y pendientes',BASE.subidas.length+' · '+ev('_ptFotosTotal()'),'2 · 2');
BASE.caeInsert=false;
await ev('_ptGuardar()');
es('al reintentar no las vuelve a subir',BASE.subidas.length+' · '+BASE.insertado.actividades[0].fotos.length,'2 · 2');

console.log('\n== El documento ==');
const r={fecha:'2026-10-26',turno:'Día',autor:'Edwin',actividades:[
  {frente:'R3 - Dique intermedio',descripcion:'Compactación',fotos:[{url:'https://s/1.jpg',hora:'08:42',nota:'Sector norte'},{url:'https://s/2.jpg',hora:'09:10'}]},
  {frente:'Acceso Este',descripcion:'Cuneta'},
  {frente:'Huantajaya',descripcion:'Perfilado',fotos:Array.from({length:5},(_,i)=>({url:'https://s/h'+i+'.jpg',hora:'11:0'+i}))}]};
ctx.__r=r;
const doc=ev('_ptDocHtml(__r)');
es('panel al final del documento',/Panel fotográfico · 7 foto\(s\)/.test(doc)&&doc.indexOf('Panel fotográfico')>doc.indexOf('Actividades ejecutadas'),true);
es('  numeradas y con su actividad',/Foto 1<\/b> · Act\. 1 · R3 - Dique intermedio/.test(doc)&&/Foto 3<\/b> · Act\. 3 · Huantajaya/.test(doc),true);
es('  con hora y comentario',/08:42/.test(doc)&&/Sector norte/.test(doc),true);
es('  2 por fila (7 fotos = 4 filas)',(doc.match(/<tr style="page-break-inside:avoid">/g)||[]).length,4);
es('la tabla de actividades cuenta las fotos',/📷 2</.test(doc)&&/📷 5</.test(doc),true);
const pdfDoc=ev('_ptDocHtml(__r,{sinPanel:true})');
es('PDF: el parte remite a las hojas siguientes',/7 foto\(s\) en las hojas siguientes/.test(pdfDoc)&&!/Foto 1<\/b>/.test(pdfDoc),true);
const hojas=ev('_ptPanelHojas(__r)');
es('  hojas propias de 6 fotos (7 = 2 hojas)',hojas.length+' · '+hojas.map(h=>(h.match(/<img/g)||[]).length).join('+'),'2 · 6+1');
es('  cada hoja del alto de un A4 con su encabezado',hojas.every(h=>/min-height:1123px/.test(h)&&/PANEL FOTOGRÁFICO/.test(h))&&/Hoja 2 de 2/.test(hojas[1]),true);
const sinFotos=ev("_ptDocHtml({fecha:'2026-10-26',turno:'Día',actividades:[{frente:'X',descripcion:'Y'}]})");
es('sin fotos no hay panel',/Panel fotográfico/i.test(sinFotos)+' · '+ev("_ptPanelHojas({actividades:[{}]}).length"),'false · 0');
ctx.__r2={fecha:'2026-10-26',actividades:[{frente:'<b>',descripcion:'x',fotos:[{url:'"><script>',nota:'<i>n</i>'}]}]};
es('el texto de las fotos no se interpreta como código',/<script>|<i>n<\/i>/.test(ev('_ptDocHtml(__r2)')),false);

console.log('\n== El PDF ==');
const SRC=fs.readFileSync(R+'js/parteTurno.js','utf8');
es('el parte va sin el panel',/dibujar\(_ptDocHtml\(r,\{sinPanel:true\}\)\)/.test(SRC),true);
es('  y cada hoja del panel en su página',/for\(const hoja of _ptPanelHojas\(r\)\)\{[\s\S]{0,80}pdf\.addPage\(\)/.test(SRC),true);
es('  espera a que carguen las fotos',/im\.onload=im\.onerror=ok/.test(SRC),true);

console.log('\n== Supervisión ==');
const ST=fs.readFileSync(R+'js/supTurnos.js','utf8');
es('cuenta las fotos del parte y de cada actividad',/' · 📷 '\+nf/.test(ST)&&/📷 \$\{a\.fotos\.length\}/.test(ST),true);
const IX=fs.readFileSync(R+'index.html','utf8');
es('versiones subidas',+IX.match(/parteTurno\.js\?v=(\d+)/)[1]>=11&&+IX.match(/supTurnos\.js\?v=(\d+)/)[1]>=3,true);

console.log('\n'+(mal?'✗ '+mal+' FALLAS':'OK todo bien')+'  ·  '+ok+'/'+(ok+mal));
process.exit(mal?1:0);
})();
