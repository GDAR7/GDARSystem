// Los buscadores no deben perder el foco al escribir.
//
// Las páginas se dibujan reemplazando todo el innerHTML, así que el input del
// buscador se destruye y se vuelve a crear con cada tecla. Sin cuidado, el
// foco se queda en el input viejo y hay que hacer clic de nuevo por cada
// letra: era lo que pasaba en Reembolsables B.S. y en Corte de Equipos.
const fs=require('fs'),vm=require('vm');
const R='c:/Users/LENOVO/OneDrive/Documents/GitHub/GDARSystem/';
let ok=0,mal=0;
const es=(l,g,e)=>{const b=String(g)===String(e);b?ok++:mal++;
  console.log((b?'  OK  ':'  MAL ')+l.padEnd(62)+'= '+g+(b?'':'  (esperado '+e+')'));};

// ── Un navegador de juguete: los nodos se destruyen al redibujar ───────────
let vivos={},activo=null,reloj=0,timers=[];
const crearInput=(id,valor)=>({id,value:valor,selectionStart:valor.length,selectionEnd:valor.length,
  focus(){activo=this;},setSelectionRange(a,b){this.selectionStart=a;this.selectionEnd=b;}});
const ctx=vm.createContext({
  console,Date,Math,Number,String,Object,Array,JSON,Set,
  document:{getElementById:id=>vivos[id]||null,get activeElement(){return activo;},
    querySelectorAll:()=>[],querySelector:()=>null,createElement:()=>({style:{}})},
  setTimeout:(fn,ms)=>{const t={fn,en:reloj+(+ms||0),vivo:true};timers.push(t);return t;},
  clearTimeout:t=>{if(t)t.vivo=false;},
  window:{},localStorage:{getItem:()=>null,setItem(){},removeItem(){}}
});
// Solo el ayudante: no hace falta cargar utils.js entero
const src=fs.readFileSync(R+'js/utils.js','utf8');
const bloque=src.slice(src.indexOf('const _busTimers'),src.indexOf('function toggleCardBody'));
vm.runInContext(bloque,ctx,{filename:'utils.js'});
const avanzar=ms=>{reloj+=ms;timers.filter(t=>t.vivo&&t.en<=reloj).forEach(t=>{t.vivo=false;t.fn();});};

// La página: al dibujar, el input se reemplaza por uno nuevo (otro objeto)
let dibujos=0,q='';
const dibujar=()=>{dibujos++;vivos.buscador=crearInput('buscador',q);};
ctx.rPagina=dibujar;
const teclear=letra=>{
  q+=letra;
  vivos.buscador.value=q;
  vivos.buscador.selectionStart=vivos.buscador.selectionEnd=q.length;
  activo=vivos.buscador;
  vm.runInContext(`buscarFoco('buscador',rPagina)`,ctx);
};

console.log('\n== Escribir una palabra completa ==');
dibujar();activo=vivos.buscador;
'CISTERNA'.split('').forEach(l=>{teclear(l);avanzar(60);});   // 60 ms entre teclas
es('mientras escribe, no redibuja en cada tecla',dibujos,1);
avanzar(300);
es('al detenerse, redibuja una sola vez',dibujos,2);
es('  el texto completo llegó',q,'CISTERNA');
es('  el input nuevo lo tiene',vivos.buscador.value,'CISTERNA');
es('el foco quedó en el buscador',activo&&activo.id,'buscador');
es('  y es el input NUEVO, no el destruido',activo===vivos.buscador,true);
es('  con el cursor al final',activo.selectionStart,8);

console.log('\n== El cursor vuelve a donde estaba, no al final ==');
// La persona mueve el cursor al medio y escribe ahí
vivos.buscador.selectionStart=vivos.buscador.selectionEnd=4;
q='CISTXERNA';vivos.buscador.value=q;
vivos.buscador.selectionStart=vivos.buscador.selectionEnd=5;
vm.runInContext(`buscarFoco('buscador',rPagina)`,ctx);
avanzar(300);
es('el cursor se restaura en la posición 5',activo.selectionStart,5);
es('  no saltó al final',activo.selectionStart===q.length,false);

console.log('\n== Escribir rápido no dispara un dibujo por tecla ==');
dibujos=0;q='';
'RELAVERA R3'.split('').forEach(l=>teclear(l));   // sin pausa entre teclas
es('nada se dibuja mientras escribe',dibujos,0);
avanzar(300);
es('un solo dibujo al final',dibujos,1);
es('  con todo el texto',vivos.buscador.value,'RELAVERA R3');

console.log('\n== Si el input ya no está, no revienta ==');
delete vivos.buscador;
let error=null;
try{vm.runInContext(`buscarFoco('buscador',rPagina)`,ctx);avanzar(300);}catch(e){error=e.message;}
es('sigue sin error',error,'null');

console.log('\n== Los buscadores del sistema lo usan ==');
const ro=fs.readFileSync(R+'js/reembolsables_otros.js','utf8');
const ce=fs.readFileSync(R+'js/corteEquipos.js','utf8');
es('Reembolsables B.S.: el input tiene id',/id="viaBuscar"/.test(ro),true);
es('  y llama al ayudante',/buscarFoco\('viaBuscar',rViaticos\)/.test(ro),true);
es('  ya no redibuja en cada tecla',/oninput="_viaQ=this\.value;rViaticos\(\)"/.test(ro),false);
es('Corte de Equipos: el input tiene id',/id="ceBuscar"/.test(ce),true);
es('  y llama al ayudante',/buscarFoco\('ceBuscar',rCorteEquipos\)/.test(ce),true);
es('  ya no redibuja en cada tecla',/oninput="_ceQ=this\.value;rCorteEquipos\(\)"/.test(ce),false);
es('el ayudante vive en utils.js, no duplicado',
  fs.readdirSync(R+'js').filter(f=>f.endsWith('.js')&&/function buscarFoco/.test(fs.readFileSync(R+'js/'+f,'utf8'))).join(','),'utils.js');
const html=fs.readFileSync(R+'index.html','utf8');
es('utils.js se carga antes que los dos módulos',
  html.indexOf('js/utils.js')<html.indexOf('js/reembolsables_otros.js')
  &&html.indexOf('js/utils.js')<html.indexOf('js/corteEquipos.js'),true);

console.log('\n'+(mal?'X '+mal+' fallo(s)':'OK todo bien')+'  ·  '+ok+'/'+(ok+mal));
process.exit(mal?1:0);
