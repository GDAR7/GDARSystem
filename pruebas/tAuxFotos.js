// Auxilios Mecánicos · fotos en un auxilio NUEVO.
// Ya no hay que guardar primero: las fotos quedan «pendientes» y se suben al
// presionar Guardar Auxilio. Cancelar las descarta sin subir nada.
const fs=require('fs'),vm=require('vm');
const R='c:/Users/LENOVO/OneDrive/Documents/GitHub/GDARSystem/';
let ok=0,mal=0;
const es=(l,g,e)=>{const b=String(g)===String(e);b?ok++:mal++;
  console.log((b?'  OK  ':'  MAL ')+l.padEnd(62)+'= '+g+(b?'':'  (esperado '+e+')'));};

const nodos={};
const nodo=id=>nodos[id]||(nodos[id]={id,innerHTML:'',value:'',textContent:'',checked:false,style:{}});
const BASE={subidas:[],guardados:[],falla:'',caeAux:false};
let nUrl=0;const revocadas=[];
const toasts=[];
const DB={auxiliosMecanicos:[],auxMecInsumos:[]};
const ctx=vm.createContext({DB,console:{warn(){},log(){}},Math,Number,String,Object,Array,JSON,Set,Date,Promise,parseFloat,
  document:{getElementById:nodo},
  URL:{createObjectURL:()=>'blob:local/'+(++nUrl),revokeObjectURL:u=>revocadas.push(u)},
  supa:{storage:{from:()=>({
    upload:async(path,blob)=>{if(BASE.falla&&blob.name===BASE.falla)return{error:{message:'Failed to fetch'}};BASE.subidas.push(path);return{error:null};},
    getPublicUrl:p=>({data:{publicUrl:'https://s/'+p}})})}},
  supaUpsert:async(k,r)=>{if(k==='auxiliosMecanicos'&&BASE.caeAux)return{message:'sin conexión'};BASE.guardados.push(JSON.parse(JSON.stringify(r)));return null;},
  supaDelete:async()=>{},syncSheet:(a,r)=>BASE.guardados.push(JSON.parse(JSON.stringify(r))),
  nidSeguro:()=>500+DB.auxiliosMecanicos.length,amGetInsumos:()=>[],amGoTab(){},closeM:()=>toasts.push('[cerrado]'),rAuxMec(){},
  localStorage:{getItem:()=>null,setItem(){}},today:()=>'2026-10-26',
  toast:(m,e)=>toasts.push((e?'✗ ':'')+m)});
const SRC=fs.readFileSync(R+'js/auxmec.js','utf8');
const tramo=(a,b)=>SRC.slice(SRC.indexOf(a),SRC.indexOf(b));
vm.runInContext(('var _amEditId=null;const _AM_BUCKET="AuxMec_Evidencias";\n'
  +tramo('// ── Evidencia fotográfica','// ── Filtro de período')
  +tramo('let _amGuardando=false;','// Bloquea la edición')).replace(/^const /gm,'var ').replace(/^let /gm,'var '),ctx,{filename:'auxmec.js'});
const ev=x=>vm.runInContext(x,ctx);
const arch=n=>({name:n,size:100,type:'image/jpeg'});
const elegir=async(tipo,nombres)=>{ctx.__in={files:nombres.map(arch),value:'x'};await ev(`amUploadFoto(__in,'${tipo}')`);};
const gal=id=>nodo(id).innerHTML;
// Formulario mínimo para crear un auxilio
const llenar=()=>Object.entries({amEq:'7',amHorometro:'1200',amDesc:'No arranca',amCod:'AUX-2026-0099',amFecha:'2026-10-26',
  amTipo:'Mecánico',amTipoInt:'Correctiva',amTraslado:'No',amEst:'Pendiente'}).forEach(([k,v])=>nodo(k).value=v);

(async()=>{
console.log('\n== Auxilio nuevo: la sección de fotos se ve ==');
ev('_amEditId=null;_amPendLimpiar();_renderAmMedia(null,null)');
es('ya no está el aviso de «guarda primero»',nodo('amMediaLock').style.display+' · '+nodo('amMediaContent').style.display,'none · block');
const IX=fs.readFileSync(R+'index.html','utf8');
es('  ni en index.html',/Guarda el auxilio primero/.test(IX),false);
es('  y explica que se suben al guardar',/se suben al presionar <b>Guardar Auxilio<\/b>/.test(IX),true);

console.log('\n== Elegir fotos antes de guardar ==');
await elegir('antes',['a1.jpg','a2.jpg']);
await elegir('despues',['d1.jpg']);
es('no sube nada todavía',BASE.subidas.length,0);
es('  quedan en espera (2 antes, 1 después)',ev('_amPend.antes.length+" · "+_amPend.despues.length'),'2 · 1');
es('  se ven en miniatura marcadas PENDIENTE',(gal('amFotoAntesGallery').match(/PENDIENTE/g)||[]).length+' · '+(gal('amFotoDespuesGallery').match(/PENDIENTE/g)||[]).length,'2 · 1');
es('  y lo avisa',/en espera · se suben al guardar/.test(toasts.pop()),true);
ev("_amQuitarPend('antes',0)");
es('se puede quitar una pendiente',ev('_amPend.antes.map(p=>p.nombre).join()')+' · liberada '+revocadas.length,'a2.jpg · liberada 1');

console.log('\n== Guardar Auxilio ==');
llenar();
await ev('gAuxMec()');
const r=DB.auxiliosMecanicos[0];
es('se crea el auxilio',r&&r.cod,'AUX-2026-0099');
es('  y se suben las fotos a su carpeta',BASE.subidas.length+' · '+BASE.subidas.every(p=>p.startsWith('auxmec/'+r.id+'/')),'2 · true');
es('  cada una en antes / después',BASE.subidas.map(p=>p.split('/')[2]).join(),'antes,despues');
es('  quedan en el registro',ev('_amFotosArr(DB.auxiliosMecanicos[0].fotosAntes).length+" · "+_amFotosArr(DB.auxiliosMecanicos[0].fotosDespues).length'),'1 · 1');
const ult=BASE.guardados[BASE.guardados.length-1];
es('  y se guardan en la base',JSON.parse(ult.fotosAntes).length+JSON.parse(ult.fotosDespues).length,2);
es('  el aviso cuenta las fotos',toasts.filter(t=>/Auxilio registrado/.test(t)).pop(),'Auxilio registrado: AUX-2026-0099 · 2 de 2 foto(s) subida(s)');
es('  no quedan pendientes',ev('_amPend.antes.length+_amPend.despues.length'),0);

console.log('\n== Si una foto falla ==');
ev('_amPendLimpiar()');
await elegir('antes',['ok.jpg','mala.jpg']);
BASE.falla='mala.jpg';BASE.subidas=[];toasts.length=0;
llenar();nodo('amCod').value='AUX-2026-0100';
await ev('gAuxMec()');
es('el auxilio queda guardado igual',DB.auxiliosMecanicos.length,2);
es('  con la foto que sí subió',ev('_amFotosArr(DB.auxiliosMecanicos[1].fotosAntes).map(f=>f.nombre).join()'),'ok.jpg');
es('  y avisa cuál falló',toasts.some(t=>/✗ No se pudo subir: mala\.jpg\. Ábralo con ✏️/.test(t)),true);
BASE.falla='';

console.log('\n== Si el auxilio no se guarda ==');
ev('_amPendLimpiar()');
await elegir('antes',['x.jpg']);
BASE.caeAux=true;BASE.subidas=[];toasts.length=0;
llenar();nodo('amCod').value='AUX-2026-0101';
await ev('gAuxMec()');
es('no sube fotos de un auxilio que no existe',BASE.subidas.length,0);
es('  las fotos siguen pendientes para reintentar',ev('_amPend.antes.length'),1);
es('  el formulario no se cierra',toasts.includes('[cerrado]'),false);
BASE.caeAux=false;

console.log('\n== Un segundo clic mientras guarda ==');
ev('_amGuardando=true');toasts.length=0;
const antes=DB.auxiliosMecanicos.length;
await ev('gAuxMec()');
es('no duplica el auxilio',DB.auxiliosMecanicos.length-antes+' · '+/Espere/.test(toasts.pop()),'0 · true');
ev('_amGuardando=false');

console.log('\n== Cancelar descarta lo pendiente ==');
const OP=SRC.slice(SRC.indexOf('function openAuxMec(){'),SRC.indexOf('let _amGuardando=false;'));
es('abrir un formulario nuevo limpia lo que quedó en espera',/_amPendLimpiar\(\);[^\n]*\n\s*_renderAmMedia\(null,null\);/.test(OP),true);

console.log('\n== Auxilio ya guardado: sube al momento, como antes ==');
ev('_amEditId=DB.auxiliosMecanicos[0].id');BASE.subidas=[];
await elegir('despues',['d2.jpg']);
es('sube de inmediato, sin pendientes',BASE.subidas.length+' · '+ev('_amPend.despues.length'),'1 · 0');
es('  y la suma a las que tenía',ev('_amFotosArr(DB.auxiliosMecanicos[0].fotosDespues).length'),2);
es('  sin marca PENDIENTE',/PENDIENTE/.test(gal('amFotoDespuesGallery')),false);

console.log('\n== Fotos achicadas antes de subir ==');
es('usa el mismo achicado que las OT',/typeof _otReducir==='function'\?await _otReducir\(file\):file/.test(SRC),true);
es('versión del script subió',+((IX.match(/js\/auxmec\.js\?v=(\d+)"/)||[])[1])>=61,true);

console.log('\n'+(mal?'✗ '+mal+' FALLAS':'OK todo bien')+'  ·  '+ok+'/'+(ok+mal));
process.exit(mal?1:0);
})();
