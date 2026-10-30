// Asistencia del día · botón aparte para escanear en iPhone / iPad.
// Motor propio (ZXing WebAssembly, ponyfill: no toca window.BarcodeDetector),
// plan B con foto, y el escáner de Android sin cambios.
const fs=require('fs'),vm=require('vm');
const R='c:/Users/LENOVO/OneDrive/Documents/GitHub/GDARSystem/';
let ok=0,mal=0;
const es=(l,g,e)=>{const b=String(g)===String(e);b?ok++:mal++;
  console.log((b?'  OK  ':'  MAL ')+l.padEnd(62)+'= '+g+(b?'':'  (esperado '+e+')'));};

const SRC=fs.readFileSync(R+'js/personal.js','utf8');
const IX=fs.readFileSync(R+'index.html','utf8');
const BLOQUE=SRC.slice(SRC.indexOf('// ══ ESCÁNER PARA iPHONE'),SRC.indexOf('function _hablar('));

function entorno(ua,{tactil=0,busca='',camara='ok',lee=[]}={}){
  const nodos={};
  const nodo=id=>nodos[id]||(nodos[id]={id,innerHTML:'',textContent:'',className:'',style:{},
    classList:{_s:new Set(['open']),add(c){this._s.add(c);},remove(c){this._s.delete(c);},contains(c){return this._s.has(c);}},
    setAttribute(){},readyState:4,videoWidth:1920,videoHeight:1080,play:async()=>{}});
  const hechos=[], scripts=[];
  let lecturas=[...lee];
  const detector={detect:async()=>{const r=lecturas.shift();return r?[{rawValue:r,format:'qr_code'}]:[];}};
  const pista={stop(){hechos.push('stop');},getCapabilities:()=>({focusMode:['continuous','manual']}),applyConstraints:async c=>hechos.push('foco '+c.advanced[0].focusMode)};
  const timers=[];
  const ctx=vm.createContext({console:{log(){},warn(){}},Math,String,Number,Promise,Error,Array,JSON,
    navigator:{userAgent:ua,maxTouchPoints:tactil,mediaDevices:{getUserMedia:async c=>{hechos.push('cam '+c.video.width.ideal+'x'+c.video.height.ideal);
      if(camara!=='ok'){const e=new Error('x');e.name=camara;throw e;}return{getTracks:()=>[pista],getVideoTracks:()=>[pista]};}}},
    location:{search:busca},
    window:{},
    document:{getElementById:nodo,head:{appendChild:s=>{scripts.push(s.src);ctx.window.BarcodeDetectionAPI={BarcodeDetector:function(o){hechos.push('formatos '+o.formats.length);return detector;}};s.onload();}},
      createElement:t=>t==='canvas'?{getContext:()=>({drawImage(){}}),width:0,height:0}:{}},
    setTimeout:(f,ms)=>{timers.push(f);return timers.length;},
    createImageBitmap:async()=>({width:4000,height:3000}),
    setScannerStatus:(m,t)=>hechos.push('estado '+t+': '+m),
    _scanOverlayHTML:()=>'<div class="ov"></div>',_scanSuccess:()=>hechos.push('pitido'),
    procesarQR:t=>hechos.push('registro '+t)});
  vm.runInContext('var _videoStream=null,_scannerCooldown=false,_scanWorker=null,_scanTipoSel="TD";\n'
    +BLOQUE.replace(/^const /gm,'var ').replace(/^let /gm,'var '),ctx,{filename:'personal.js'});
  ctx.window.BarcodeDetectionAPI=undefined;
  return{ctx,nodo,hechos,scripts,timers,ev:x=>vm.runInContext(x,ctx),
    correr:async(n=1)=>{for(let i=0;i<n;i++){const f=timers.shift();if(f)await f();await new Promise(r=>setImmediate(r));}}};
}
const IPHONE='Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1';
const IPAD='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15';
const ANDROID='Mozilla/5.0 (Linux; Android 14; SM-A546E) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36';
const PC='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';

(async()=>{
console.log('\n== El botón 🍎 solo en iPhone / iPad ==');
const vis=(ua,o)=>{const E=entorno(ua,o);E.ev('_sciMostrarBoton()');return E.nodo('btnScanIos').style.display;};
es('iPhone: se ve',vis(IPHONE),'');
es('iPad (se presenta como Mac, con pantalla táctil): se ve',vis(IPAD,{tactil:5}),'');
es('Mac de escritorio (sin táctil): no',vis(IPAD,{tactil:0}),'none');
es('Android: no',vis(ANDROID),'none');
es('PC: no',vis(PC),'none');
es('PC con ?scanios (para probarlo): se ve',vis(PC,{busca:'?scanios'}),'');
es('el botón está junto al de siempre, oculto por defecto',/onclick="openScanner\(\)">📷 Escanear QR<\/button>\s*<button id="btnScanIos"[^>]*display:none[^>]*onclick="openScannerIos\(\)"[^>]*>🍎 Escanear \(iPhone\)/.test(IX),true);
es('la pantalla de asistencia decide si mostrarlo',/async function rAsistencia\(\)\{\s*_sciMostrarBoton\(\);/.test(SRC),true);

console.log('\n== Escanear en vivo ==');
let E=entorno(IPHONE,{lee:[null,null,'ECO-PERSONAL-123']});
E.ev('openScannerIos()');
es('abre la ventana en modo iPhone',E.ev('_scanIos'),true);
await E.correr();                                   // _sciIniciar
es('descarga el lector, versión fija y ponyfill',E.scripts.join(),'https://cdn.jsdelivr.net/npm/barcode-detector@3.0.8/dist/iife/ponyfill.js');
es('  con QR, Aztec (fotochecks) y códigos de barras',E.hechos.includes('formatos 12'),true);
es('  Aztec está en la lista',/_SCI_FMTS=\[[^\]]*'aztec'/.test(SRC),true);
es('pide la cámara en alta resolución',E.hechos.includes('cam 1920x1080'),true);
es('  y enfoque continuo',E.hechos.includes('foco continuous'),true);
es('ofrece «Tomar foto del código»',/📸 Tomar foto del código<input type="file" accept="image\/\*" capture="environment" onchange="_sciFoto\(this\)"/.test(E.nodo('qr-reader').innerHTML),true);
await E.correr(3);
es('al detectar: pitido y el registro de siempre',E.hechos.filter(h=>/pitido|registro/.test(h)).join(' · '),'pitido · registro ECO-PERSONAL-123');
es('  no registra dos veces el mismo escaneo',E.ev('_scannerCooldown'),true);
es('diagnóstico visible (motor, resolución, foco)',/motor iPhone \(ZXing\) · 1920×1080 · foco continuo/.test(E.nodo('sciDiag').textContent),true);
E.ev('_videoStream=null');const antes=E.timers.length;await E.correr();
es('al cerrar la cámara deja de leer',E.timers.length,Math.max(0,antes-1));

console.log('\n== Si algo falla ==');
E=entorno(IPHONE,{camara:'NotAllowedError'});
E.ev('openScannerIos()');await E.correr();
es('sin permiso de cámara: explica cómo darlo y deja la foto',E.hechos.some(h=>/Ajustes › Safari/.test(h)&&/Tomar foto del código/.test(h))&&/_sciFoto/.test(E.nodo('qr-reader').innerHTML),true);
E=entorno(IPHONE);
E.ctx.document.head.appendChild=s=>s.onerror();
E.ev('openScannerIos()');await E.correr();
es('sin señal para descargar el lector: lo dice',E.hechos.some(h=>/No se pudo descargar el lector/.test(h)),true);

console.log('\n== Plan B: foto ==');
E=entorno(IPHONE,{lee:[null,'78462600']});
await E.ev("_sciFoto({files:[{name:'f.jpg'}],value:'x'})");
es('lee la foto (entera y luego el centro ampliado)',E.hechos.filter(h=>/registro/.test(h)).join(),'registro 78462600');
E=entorno(IPHONE,{lee:[]});
await E.ev("_sciFoto({files:[{name:'f.jpg'}],value:'x'})");
es('si no hay código en la foto, da indicaciones',E.hechos.some(h=>/No se encontró un código en la foto/.test(h)),true);

console.log('\n== Android no cambia ==');
es('el botón de siempre apaga el modo iPhone',/function openScanner\(\)\{\s*_scanIos=false;/.test(SRC),true);
es('  y sigue usando su motor (iniciarScanner)',/setTimeout\(iniciarScanner,300\);\s*\}\s*function _detenerCamara/.test(SRC),true);
es('tras cada escaneo se reinicia el motor que estaba en uso',/setTimeout\(_scanIos\?_sciIniciar:iniciarScanner,300\)/.test(SRC),true);
const ini=SRC.slice(SRC.indexOf('async function iniciarScanner(){'),SRC.indexOf('// ══ ESCÁNER PARA iPHONE'));
es('el motor de Android no se tocó (BarcodeDetector + html5-qrcode)',/'BarcodeDetector' in window/.test(ini)&&/new Html5Qrcode\('qr-reader'/.test(ini)&&!/_sci/.test(ini),true);
es('el ponyfill no reemplaza window.BarcodeDetector',/window\.BarcodeDetector\s*=/.test(BLOQUE),false);
es('versión del script subió',+((IX.match(/js\/personal\.js\?v=(\d+)"/)||[])[1])>=26,true);

console.log('\n'+(mal?'✗ '+mal+' FALLAS':'OK todo bien')+'  ·  '+ok+'/'+(ok+mal));
process.exit(mal?1:0);
})();
