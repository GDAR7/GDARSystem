// Parte de Turno · números del plano sin encimarse.
// A: los que se tocan se abren en abanico con línea guía al punto real.
// B: si se juntan en una zona chica, «Detalle de la zona» ampliado + recuadro.
const fs=require('fs'),vm=require('vm');
const R='c:/Users/LENOVO/OneDrive/Documents/GitHub/GDARSystem/';
let ok=0,mal=0;
const es=(l,g,e)=>{const b=String(g)===String(e);b?ok++:mal++;
  console.log((b?'  OK  ':'  MAL ')+l.padEnd(62)+'= '+g+(b?'':'  (esperado '+e+')'));};

const ctx=vm.createContext({console,Math,Number,String,Object,Array,JSON,Set,isFinite,parseFloat,Date,EMPRESA:{logo:'img/logo.png'}});
const SRC=fs.readFileSync(R+'js/parteTurno.js','utf8');
vm.runInContext("var _PT_MAPA_IMG='09.-ERP/Imagenes/R3_2026_IMAGEN.png';\n"
  +SRC.slice(SRC.indexOf('// ── Números del plano sin encimarse'),SRC.indexOf('\n}',SRC.indexOf('function _ptDocHtml('))+2)
    .replace(/^const /gm,'var ').replace(/^let /gm,'var ')
  +'\n'+SRC.slice(SRC.indexOf('const _ptEsc='),SRC.indexOf('\n',SRC.indexOf('const _ptEsc='))).replace(/^const /,'var ')
  +'\n'+SRC.slice(SRC.indexOf("const _PT_DIAS="),SRC.indexOf('// Nombre del archivo')).replace(/^const /gm,'var '),ctx,{filename:'parteTurno.js'});
const ev=x=>vm.runInContext(x,ctx);

// La proporción del plano es la de la imagen real
const png=fs.readFileSync(R+'09.-ERP/Imagenes/R3_2026_IMAGEN.png');
es('la proporción coincide con la imagen del plano',ev('_PT_MAPA_PROP').toFixed(4),(png.readUInt32BE(20)/png.readUInt32BE(16)).toFixed(4));

// Como en la captura: el 5 solo arriba; 4, 6, 7, 8 y 9 juntos en el dique
const act=(n,x,y)=>({frente:'R3',descripcion:'Act '+n,ubicacion:x==null?null:{x,y}});
const acts=[act(1),act(2),act(3,72.8,74.6),act(4,77.9,70.9),act(5,57.1,11.1),act(6,74.6,58),act(7,77.3,64.8),act(8,77.8,67),act(9,72.5,75.7)];
ctx.__acts=acts;
const html=ev("_ptDocHtml({fecha:'2026-10-26',turno:'Día',actividades:__acts})");

// Leer de vuelta las posiciones de los números en cada cuadro (en % del cuadro)
const cuadros=html.split(/Detalle de la zona/);
const numeros=(h,W,H)=>[...h.matchAll(/left:([\d.]+)%;top:([\d.]+)%;transform:translate\(-50%,-50%\);width:22px[^>]*>(\d+)</g)]
  .map(m=>({n:+m[3],x:+m[1]/100*W,y:+m[2]/100*H}));
const W=ev('_PT_MAPA_W'),H=W*ev('_PT_MAPA_PROP');
const gen=numeros(cuadros[0],W,H);
const minDist=L=>{let m=1e9;for(let i=0;i<L.length;i++)for(let j=i+1;j<L.length;j++)m=Math.min(m,Math.hypot(L[i].x-L[j].x,L[i].y-L[j].y));return m;};

console.log('\n== A · plano general ==');
es('están los 7 números ubicados',gen.map(o=>o.n).sort((a,b)=>a-b).join(),'3,4,5,6,7,8,9');
es('ninguno tapa a otro (≥ 22 px entre centros)',minDist(gen)>=22,true);
es('  todos dentro del plano',gen.every(o=>o.x>=11&&o.x<=W-11&&o.y>=11&&o.y<=H-11),true);
const cinco=gen.find(o=>o.n===5);
es('el 5, que está solo, queda en su lugar',Math.abs(cinco.x-57.1/100*W)<0.5&&Math.abs(cinco.y-11.1/100*H)<0.5,true);
const guias=(cuadros[0].match(/transform-origin:0 50%/g)||[]).length;
es('los que se movieron tienen línea guía',guias>=4,true);
es('  y un puntito en el lugar exacto',(cuadros[0].match(/width:8px;height:8px/g)||[]).length,guias);

console.log('\n== B · detalle de la zona ==');
es('aparece el detalle',cuadros.length,2);
es('  el plano general marca el recuadro rojo',/border:2px solid #dc2626;box-sizing:border-box/.test(cuadros[0]),true);
const z=ev("_ptDetalleZona(__acts.filter(a=>a.ubicacion).map(a=>({x:a.ubicacion.x/100*_PT_MAPA_W,y:a.ubicacion.y/100*_PT_MAPA_W*_PT_MAPA_PROP})),_PT_MAPA_W,_PT_MAPA_W*_PT_MAPA_PROP,_PT_NUM_D)");
es('  aumento de al menos 1,8×',z.z>=1.8,true);
const det=numeros(cuadros[1],z.FW,z.FH);
es('  muestra los del dique y no el 5',det.map(o=>o.n).sort((a,b)=>a-b).join(),'3,4,6,7,8,9');
es('  sin encimarse',minDist(det)>=22,true);
es('  dice cuánto se amplió',/ampliado \d+,\d×/.test(cuadros[1]),true);
es('  la imagen se recorta sin achicarse',/max-width:none/.test(cuadros[1]),true);

console.log('\n== Sin puntos juntos ==');
ctx.__a2=[act(1,10,10),act(2,50,50),act(3,90,85)];
const h2=ev("_ptDocHtml({fecha:'2026-10-26',turno:'Noche',actividades:__a2})");
es('no hay detalle ni recuadro',/Detalle de la zona|#dc2626/.test(h2),false);
es('  ni líneas guía: cada número en su punto',/transform-origin:0 50%/.test(h2),false);
const n2=numeros(h2,W,H);
es('  en el lugar exacto',n2.every((o,i)=>Math.abs(o.x-[10,50,90][i]/100*W)<0.5),true);

console.log('\n== Casos borde ==');
ctx.__a3=[act(1,50,50),act(2,50,50)];
const n3=numeros(ev("_ptDocHtml({fecha:'2026-10-26',turno:'Día',actividades:__a3})").split(/Detalle de la zona/)[0],W,H);
es('dos en el mismo punto exacto se separan',minDist(n3)>=22,true);
ctx.__a4=[act(1,0.5,0.5),act(2,1,1),act(3,1.5,0.8)];
const n4=numeros(ev("_ptDocHtml({fecha:'2026-10-26',turno:'Día',actividades:__a4})").split(/Detalle de la zona/)[0],W,H);
es('en la esquina del plano no se salen',n4.every(o=>o.x>=11&&o.y>=11)&&minDist(n4)>=22,true);
ctx.__a5=[act(1)];
es('sin ubicaciones no hay plano',/Ubicación de los trabajos/.test(ev("_ptDocHtml({fecha:'2026-10-26',turno:'Día',actividades:__a5})")),false);
// Muchos puntos en el mismo sitio
ctx.__a6=Array.from({length:12},(_,i)=>act(i+1,60+(i%3)*0.2,40+(i%4)*0.2));
const n6=numeros(ev("_ptDocHtml({fecha:'2026-10-26',turno:'Día',actividades:__a6})").split(/Detalle de la zona/)[0],W,H);
es('12 en el mismo sitio: los 12, sin encimarse',n6.length+' · '+(minDist(n6)>=22),'12 · true');

console.log('\n'+(mal?'✗ '+mal+' FALLAS':'OK todo bien')+'  ·  '+ok+'/'+(ok+mal));
process.exit(mal?1:0);
