// La tira de indicadores del Tareaje: seis tarjetas con borde de color pasaron
// a una fila compacta. Lo que más importa es que NO se hayan tocado los KPI de
// los otros diecinueve módulos, que comparten la clase .kpi.
const fs=require('fs');
const R=require('path').join(__dirname,'..')+'/';
let ok=0,mal=0;
const es=(l,g,e)=>{const b=String(g)===String(e);b?ok++:mal++;
  console.log((b?'  OK  ':'  MAL ')+l.padEnd(58)+'= '+g+(b?'':'  (esperado '+e+')'));};

const tar=fs.readFileSync(R+'js/tareaje.js','utf8');
const html=fs.readFileSync(R+'index.html','utf8');
const css=fs.readFileSync(R+'css/styles.css','utf8');

// Se ejecuta el generador real con datos que sí incluyen DLT y A5
const ini=tar.indexOf('  const _hh=monthRecs.filter');
const fin=tar.indexOf(".join('');",ini)+11;
const nodos={tareKpis:{innerHTML:''}};
const pintar=(persF,inact,verInact)=>{
  new Function('monthRecs','proyFiltro','persF','_nInact','_tarVerInact','document',
    tar.slice(ini,fin))(
    [...Array(433).fill({tipo:'TD'}),...Array(192).fill({tipo:'TN'}),
     ...Array(20).fill({tipo:'DLT'}),...Array(3).fill({tipo:'A5'}),{tipo:'F'}],
    '',{length:persF},inact,verInact,{getElementById:id=>nodos[id]});
  return nodos.tareKpis.innerHTML;
};
const h=pintar(151,20,false);
const pares=[...h.matchAll(/kpi-tira-lbl">([^<]+)<[\s\S]*?kpi-tira-val"[^>]*>([^<]+)</g)]
  .map(p=>[p[1],p[2]]);

console.log('\n== El orden y los seis indicadores ==');
es('son seis',pares.length,6);
es('en el orden pedido',pares.map(p=>p[0]).join(' · '),
  'Trabajadores · Día · Noche · Horas hombre · Faltas · Inactivos');
es('dos separadores agrupan',(h.match(/kpi-tira-sep/g)||[]).length,2);
es('  el primero tras Trabajadores',
  h.indexOf('kpi-tira-sep')>h.indexOf('Trabajadores')
  &&h.indexOf('kpi-tira-sep')<h.indexOf('>Día<'),true);

console.log('\n== Los números ==');
es('Trabajadores',pares[0][1],'151');
es('Día',pares[1][1],'433');
es('Noche',pares[2][1],'192');
es('Horas hombre con separador de miles',pares[3][1],'6,480');
es('  (433+192+20+3) × 10',(433+192+20+3)*10,6480);
es('Faltas',pares[4][1],'1');
es('Inactivos',pares[5][1],'20');

console.log('\n== Los colores ==');
es('Faltas en rojo',/color:var\(--seg\)"[^>]*>1</.test(h),true);
es('Inactivos en texto secundario',/color:var\(--muted\)"[^>]*>20</.test(h),true);
es('los demás sin color propio',(h.match(/kpi-tira-val">/g)||[]).length,4);
es('ningún borde de color',/--kc/.test(h),false);
es('ningún emoji',/[\uD800-\uDBFF]/.test(h),false);

console.log('\n== La fórmula no se muestra, se explica ==');
es('va en el title',/title="HH · TD\+TN\+DLT\+A5 × 10 h\/día"/.test(h),true);
es('  y no en pantalla',/>HH · TD/.test(h),false);

console.log('\n== Inactivos: clic simple, no doble ==');
es('usa onclick',/onclick="_tarToggleInact\(\)"/.test(h),true);
es('  y ya no ondblclick',/ondblclick="_tarToggleInact/.test(tar),false);
es('se nota que es pulsable',/kpi-tira-click/.test(h),true);
es('  con subrayado punteado',/\.kpi-tira-click \.kpi-tira-lbl\{text-decoration:underline dotted/.test(css),true);
es('  y cursor de mano',/\.kpi-tira-click\{cursor:pointer/.test(css),true);
es('el title dice qué hace',/Clic para mostrar a los dados de baja/.test(h),true);
const h2=pintar(151,20,true);
es('  y cambia si ya están visibles',/Clic para volver a ocultar/.test(h2),true);
es('la lógica de _tarToggleInact no cambió',/function _tarToggleInact\(\)\{/.test(tar),true);

console.log('\n== Encendido se distingue de apagado ==');
// Es un modo de vista que cambia lo que muestra la grilla: tiene que verse
// activo sin tener que acordarse de si se pulsó.
es('apagado: en color atenuado',/color:var\(--muted\)"[^>]*>20</.test(h),true);
es('  sin la marca de encendido',/kpi-tira-on/.test(h),false);
es('encendido: en blanco',/color:var\(--text\)"[^>]*>20</.test(h2),true);
es('  con la clase que lo marca',/kpi-tira-on/.test(h2),true);
es('  y sigue siendo clicable',/kpi-tira-click/.test(h2),true);
es('CSS: etiqueta blanca',/\.kpi-tira-on \.kpi-tira-lbl\{color:var\(--text\)/.test(css),true);
es('  y número en negrita',/\.kpi-tira-on \.kpi-tira-val\{font-weight:700\}/.test(css),true);
es('ningún otro indicador se enciende',(h2.match(/kpi-tira-on/g)||[]).length,1);

console.log('\n== El contenedor ==');
es('usa la clase nueva',/class="kpi-tira" id="tareKpis"/.test(html),true);
es('  con fondo de superficie',/\.kpi-tira\{[\s\S]*?background:var\(--panel2\)/.test(css),true);
es('  radio 8px',/\.kpi-tira\{[\s\S]*?border-radius:8px/.test(css),true);
es('  padding 12px 16px',/\.kpi-tira\{[\s\S]*?padding:12px 16px/.test(css),true);
es('  gap 22px',/\.kpi-tira\{[\s\S]*?gap:22px/.test(css),true);
es('  sin borde',/\.kpi-tira\{[^}]*border:/.test(css),false);
es('etiqueta 12px atenuada',/\.kpi-tira-lbl\{font-size:12px;color:var\(--muted2\)/.test(css),true);
es('número 20px peso 500',/\.kpi-tira-val\{font-size:20px;font-weight:500/.test(css),true);
es('separador de medio píxel',/\.kpi-tira-sep\{width:\.5px/.test(css),true);

console.log('\n== Los otros 19 módulos no se tocaron ==');
es('.kpi sigue igual',/\.kpi\{background:var\(--panel\);border:2px solid var\(--kc/.test(css),true);
es('.kpi-row sigue igual',/\.kpi-row\{display:grid/.test(css),true);
const kpiRow=(html.match(/class="kpi-row"/g)||[]).length;
es('quedan 19 contenedores kpi-row',kpiRow,19);
es('  y solo uno usa la tira',(html.match(/class="kpi-tira"/g)||[]).length,1);

console.log('\n== El título ==');
es('sin emoji',/ph-title">Tareaje de Personal/.test(html),true);
es('  y sin el magenta',/ph-title" style="color:var\(--mec\)">📋 Tareaje/.test(html),false);
es('el subtítulo se queda',/Control mensual de asistencia y tipos de jornada/.test(html),true);

console.log('\n== Responsive ==');
es('envuelve en vez de scrollear',/\.kpi-tira\{[\s\S]*?flex-wrap:wrap/.test(css),true);
es('  y en pantalla angosta se compacta',/@media\(max-width:640px\)\{[\s\S]*?\.kpi-tira\{/.test(css),true);

console.log('\n== Se usan las variables que ya existían ==');
['--panel2','--text','--muted2','--muted','--border','--seg'].forEach(v=>
  es('  '+v+' está en :root',new RegExp(v+':').test(css.slice(0,400)),true));

console.log('\n'+(mal?'X '+mal+' fallo(s)':'OK todo bien')+'  ·  '+ok+'/'+(ok+mal));
process.exit(mal?1:0);
