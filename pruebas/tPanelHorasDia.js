// Panel de Horas Máquina · Reporte Diario de Utilización. Se cargan los
// módulos reales con un Chart.js simulado, para comprobar que las barras del
// día y de la semana llevan los datos correctos y que el documento se arma.
const fs=require('fs'),vm=require('vm');
const R='c:/Users/LENOVO/OneDrive/Documents/GitHub/GDARSystem/';
let ok=0,mal=0;
const es=(l,g,e)=>{const b=String(g)===String(e);b?ok++:mal++;
  console.log((b?'  OK  ':'  MAL ')+l.padEnd(60)+'= '+g+(b?'':'  (esperado '+e+')'));};
const f1=v=>(+v).toFixed(1);

// Semana lunes 14/09/2026 → domingo 20/09/2026 · corte 21/08 al 20/09 (31 días)
const DB={
  equipos:[
    {id:1,codigo:'EXC ECOP-001',sub:'EXCAVADORA',tipo:'Línea Amarilla',est:'Operativo',placa:''},
    {id:2,codigo:'EXC ECOP-002',sub:'EXCAVADORA',tipo:'Línea Amarilla',est:'Operativo'},
    {id:3,codigo:'ROD ECOP-001',sub:'RODILLO',tipo:'Línea Amarilla',est:'En Mantenimiento'},
    {id:4,codigo:'VOL ECOP-001',sub:'VOLQUETE',tipo:'Línea Blanca',est:'Operativo',placa:'CCF-852'},
    {id:5,codigo:'EXC VIEJA',sub:'EXCAVADORA',tipo:'Línea Amarilla',est:'Desmovilizado'},
    {id:6,codigo:'CAM ECOP-001',sub:'CAMIONETA',tipo:'Vehículo Menor',est:'Operativo'}
  ],
  partes:[
    // Jueves 17/09: el día del reporte
    {id:1,eqId:1,fecha:'2026-09-17',ef:9,im:1,turno:'DIA'},
    {id:2,eqId:1,fecha:'2026-09-17',ef:8,im:0,turno:'NOCHE'},
    {id:3,eqId:2,fecha:'2026-09-17',ef:4,im:2,turno:'DIA'},
    {id:4,eqId:4,fecha:'2026-09-17',ef:10,im:0,turno:'DIA'},
    // Otros días de la misma semana
    {id:5,eqId:1,fecha:'2026-09-15',ef:7,im:0,turno:'DIA'},
    {id:6,eqId:3,fecha:'2026-09-16',ef:5,im:1,turno:'DIA'},
    // Fuera de la semana
    {id:7,eqId:1,fecha:'2026-09-10',ef:10,im:0,turno:'DIA'},
    // De un equipo desmovilizado y de un menor: no entran
    {id:8,eqId:5,fecha:'2026-09-17',ef:9,im:0,turno:'DIA'},
    {id:9,eqId:6,fecha:'2026-09-17',ef:6,im:0,turno:'DIA'}
  ],
  tareaje:[],personal:[],tramos:[]
};

const nodos={};
const nodo=id=>nodos[id]||(nodos[id]={id,innerHTML:'',textContent:'',value:'',style:{}});
let charts=[],ventana=null,avisos=[];
// Chart.js simulado: guarda la configuración de cada gráfico
function Chart(ctx,cfg){charts.push(cfg);this.destroy=()=>{};}
const ctx=vm.createContext({
  DB,console,Date,Math,Number,String,Object,Array,JSON,Set,Chart,URL,
  localStorage:{getItem:k=>k==='gdar_ph_hsprog'?'10':null,setItem(){},removeItem(){}},
  document:{getElementById:nodo,
    createElement:()=>({width:0,height:0,getContext:()=>({}),toDataURL:()=>'data:image/png;base64,STUB'})},
  window:{open:()=>{ventana={html:'',document:{write(h){ventana.html+=h;},close(){}}};return ventana;}},
  location:{href:'https://ecosermo.gdarei.com/index.html'},
  EMPRESA:{nombre:'ECOSERMO',logo:'img/logo.png'},
  toast:(m,e)=>avisos.push({m,e:!!e}),today:()=>'2026-09-17',CU:null,
  _amtCapM3:15
});
vm.runInContext(fs.readFileSync(R+'js/panelHoras.js','utf8'),ctx,{filename:'panelHoras.js'});
vm.runInContext(fs.readFileSync(R+'js/panelHorasDia.js','utf8'),ctx,{filename:'panelHorasDia.js'});
const ev=x=>vm.runInContext(x,ctx);
ev('_phSemIni="2026-09-14"');

console.log('\n== El día que se reporta ==');
es('por defecto, el último con partes de la semana',ev('_phdDefault()'),'2026-09-17');
ev('_phdFecha=""');
let D=ev('_phdDatos()');
es('se fija ese día',D.fecha,'2026-09-17');
es('lo nombra',D.diaNombre,'Jueves');
es('la semana es la del panel',D.sem[0]+' → '+D.sem[6],'2026-09-14 → 2026-09-20');
es('el corte que lo contiene',D.cIni+' al '+D.cFin,'2026-08-21 al 2026-09-20');
es('  31 días de corte',D.diasCorte,31);
es('horas por turno del panel',D.HP,10);

console.log('\n== Qué equipos entran ==');
es('los de línea, sin el desmovilizado ni el menor',D.filas.map(f=>f.eq.codigo).join(' · '),
  'EXC ECOP-001 · EXC ECOP-002 · ROD ECOP-001 · VOL ECOP-001');
es('  también los que no reportaron ese día',D.filas.filter(f=>!f.nDia).map(f=>f.eq.codigo).join(','),'ROD ECOP-001');
es('ordenados por línea, subtipo y código',D.filas.map(f=>f.tipo).join(',')
  ,'Línea Amarilla,Línea Amarilla,Línea Amarilla,Línea Blanca');

console.log('\n== Utilización del día ==');
const fil=c=>D.filas.find(f=>f.eq.codigo===c);
es('EXC-001: 2 partes → 20 h programadas',fil('EXC ECOP-001').progDia,20);
es('  17 h efectivas',f1(fil('EXC ECOP-001').efDia),'17.0');
es('  utilización 85%',f1(fil('EXC ECOP-001').utilDia),'85.0');
es('  1 h inoperativa',f1(fil('EXC ECOP-001').imDia),'1.0');
es('EXC-002: 1 parte, 4 h → 40%',f1(fil('EXC ECOP-002').utilDia),'40.0');
es('ROD-001 sin parte: 0% y 0 h programadas',
  f1(fil('ROD ECOP-001').utilDia)+'|'+fil('ROD ECOP-001').progDia,'0.0|0');
es('total del día: 31 h de 40 h prog. → 77.5%',f1(D.total.utilDia),'77.5');
es('  equipos con parte',D.total.conParte+' de '+D.total.n,'3 de 4');
es('  horas inoperativas del día',f1(D.total.imDia),'3.0');

console.log('\n== La semana, para comparar ==');
es('EXC-001 en la semana: 3 partes, 24 h',fil('EXC ECOP-001').nSem+'|'+f1(fil('EXC ECOP-001').efSem),'3|24.0');
es('  el parte del 10/09 no entra',f1(fil('EXC ECOP-001').efSem)!=='34.0',true);
es('  utilización semanal 80%',f1(fil('EXC ECOP-001').utilSem),'80.0');
es('ROD-001 sí trabajó el 16/09',f1(fil('ROD ECOP-001').efSem),'5.0');
es('total semana: 43 h de 60 h prog. → 71.7%',f1(D.total.utilSem),'71.7');

console.log('\n== La meta prorrateada ==');
es('EXC: meta del corte 210 h ÷ 31 días',f1(fil('EXC ECOP-001').metaDia),f1(210/31));
es('  y la semanal, × 7',fil('EXC ECOP-001').metaSem,Math.round(210*7/31));
es('RODILLO: meta 180 h ÷ 31',f1(fil('ROD ECOP-001').metaDia),f1(180/31));

console.log('\n== Los gráficos ==');
charts=[];
const doc=ev('_phdDoc()');
es('dos gráficos: el del día de cada línea',charts.length,2);
const g=i=>({lbl:charts[i].data.labels,meta:charts[i].data.datasets[0].data,
  horas:charts[i].data.datasets[1].data,tit:charts[i].options.plugins.title.text});
es('1º: el día de Línea Amarilla',g(0).tit.includes('JUEVES 17/09/2026')&&g(0).tit.includes('LÍNEA AMARILLA'),true);
es('  con sus tres equipos',g(0).lbl.join(','),'EXC ECOP-001,EXC ECOP-002,ROD ECOP-001');
es('  barras = % de utilización del día',g(0).horas.join(','),'85,40,0');
es('  línea = meta 75% pareja para todos',g(0).meta.join(','),'75,75,75');
es('ya no se grafica la semana',charts.some(c=>c.options.plugins.title.text.includes('LA MISMA SEMANA')),false);
es('2º: el día de Línea Blanca',g(1).tit.includes('LÍNEA BLANCA')&&g(1).tit.includes('JUEVES 17/09/2026'),true);
es('  con el volquete',g(1).lbl.join(','),'VOL ECOP-001');
es('el eje llega a 100%',charts.every(c=>c.options.scales.y.suggestedMax===100),true);
es('las barras usan el semáforo (rojo el de 40%)',charts[0].data.datasets[1].backgroundColor[1],'#b91c1c');
es('  y verde el de 85%',charts[0].data.datasets[1].backgroundColor[0],'#15803d');
es('todos son de barras con la meta como línea',
  charts.every(c=>c.type==='bar'&&c.data.datasets[0].type==='line'),true);

console.log('\n== El documento ==');
es('título del reporte',/REPORTE DIARIO — UTILIZACIÓN DE EQUIPOS/.test(doc),true);
es('fecha y día en la cabecera',/Jueves 17\/09\/2026/.test(doc),true);
es('semana y corte',/Semana 14\/09\/2026 al 20\/09\/2026/.test(doc)&&/Corte 21\/08\/2026 al 20\/09\/2026/.test(doc),true);
es('logo de la empresa',/ecosermo\.gdarei\.com\/img\/logo\.png/.test(doc),true);
es('KPI de utilización del día',/77\.5%/.test(doc),true);
es('KPI de equipos con parte',/3 \/ 4/.test(doc),true);
es('las imágenes de los gráficos',(doc.match(/data:image\/png;base64,STUB/g)||[]).length,2);
es('tabla con subtotal por línea',/Subtotal Línea Amarilla/.test(doc)&&/Subtotal Línea Blanca/.test(doc),true);
es('el equipo sin parte se marca',/SIN PARTE/.test(doc),true);
es('explica las fórmulas',/H\. Prog\. = Nº de partes del día × 10h/.test(doc),true);
es('filas y celdas parejas',(doc.match(/<tr[ >]/g)||[]).length,(doc.match(/<\/tr>/g)||[]).length);
es('ninguna celda rota',/undefined|NaN/.test(doc),false);
es('sale en un solo PDF, sin saltos de página',(doc.match(/class="salto-pdf"/g)||[]).length,0);
es('  sin cabeceras de continuación',/REPORTE DIARIO — LÍNEA BLANCA|REPORTE DIARIO — DETALLE/.test(doc),false);
es('  la semana sigue en el KPI',/Utilización de la semana/.test(doc),true);
es('  y en la tabla',/Utiliz\. sem\. %/.test(doc),true);

console.log('\n== Elegir equipos por código ==');
es('sin selección entran todos',ev('_phdSelCuenta().n+" de "+_phdSelCuenta().total'),'4 de 4');
es('  y no se listan los desmovilizados',ev('_phdEquiposTodos().map(e=>e.codigo).join(",")'),
  'EXC ECOP-001,EXC ECOP-002,ROD ECOP-001,VOL ECOP-001');
ev('_phdSel=new Set([1,4])');
let DS=ev('_phdDatos()');
es('elegir dos deja dos',DS.filas.map(f=>f.eq.codigo).join(','),'EXC ECOP-001,VOL ECOP-001');
es('  el total del día se recalcula',f1(DS.total.utilDia),f1((17+10)/(20+10)*100));
es('  el contador lo dice',ev('_phdSelCuenta().n+" de "+_phdSelCuenta().total'),'2 de 4');
charts=[];const docSel=ev('_phdDoc()');
es('los gráficos solo traen los elegidos',charts[0].data.labels.join(','),'EXC ECOP-001');
es('  y siguen siendo uno por línea',charts.length,2);
es('  y el documento avisa la selección parcial',/selección parcial: 2 de 4 equipos/.test(docSel),true);
ev('_phdSelToggle(1,false)');
es('desmarcar deja uno',ev('_phdDatos().filas.map(f=>f.eq.codigo).join(",")'),'VOL ECOP-001');
ev('_phdSelTodos(true)');
es('Todos quita el filtro',ev('_phdSel.size'),0);
es('  y vuelven los cuatro',ev('_phdDatos().filas.length'),4);
ev('_phdSelToggle(3,false)');
es('desmarcar uno partiendo de todos deja tres',ev('_phdDatos().filas.length'),3);
es('  sin el rodillo',ev('_phdDatos().filas.some(f=>f.eq.codigo==="ROD ECOP-001")'),false);
ev('_phdSelTodos(true)');

console.log('\n== Navegación ==');
ev('_phdNav(-1)');
es('un día atrás',ev('_phdFecha'),'2026-09-16');
es('  sin cambiar la semana',ev('_phSemIni'),'2026-09-14');
ev('_phdFecha="2026-09-14";_phdNav(-1)');
es('salir de la semana la mueve al lunes anterior',ev('_phSemIni'),'2026-09-07');
es('  y el día es el 13/09',ev('_phdFecha'),'2026-09-13');
ev('_phSemIni="2026-09-14";_phdSetFecha("2026-09-15")');
es('elegir una fecha de la semana la respeta',ev('_phdFecha+"|"+_phSemIni'),'2026-09-15|2026-09-14');
ev('_phdSetFecha("2026-10-01")');
es('elegir otra fecha mueve la semana',ev('_phSemIni'),'2026-09-28');

console.log('\n== La pestaña y la impresión ==');
ev('_phSemIni="2026-09-14";_phdFecha="2026-09-17";_phdRender()');
const H=nodo('phTabBody').innerHTML;
es('barra con selector de día',/onchange="_phdSetFecha\(this\.value\)"/.test(H),true);
es('  con la fecha puesta',/value="2026-09-17"/.test(H),true);
es('  y el atajo al último con partes',/Último con partes/.test(H),true);
es('botón Imprimir / PDF',/_phdPrint\(\)/.test(H),true);
es('vista previa en hoja blanca',/background:#fff/.test(H),true);
ventana=null;ev('_phdPrint()');
es('la impresión abre ventana',!!ventana,true);
es('  con el documento dentro',/REPORTE DIARIO/.test(ventana.html),true);
es('  y manda a imprimir',/window\.print\(\)/.test(ventana.html),true);
es('  con el CSS que corta la hoja',/page-break-after:always/.test(ventana.html),true);
es('  y midiendo bloque por bloque',/querySelectorAll\('\.salto-pdf'\)/.test(ventana.html),true);

console.log('\n== Enganche ==');
const ph=fs.readFileSync(R+'js/panelHoras.js','utf8');
const html=fs.readFileSync(R+'index.html','utf8');
const mod=fs.readFileSync(R+'js/panelHorasDia.js','utf8');
es('la pestaña 6 está en la barra',/\[6,'📊 Utilización Diaria'\]/.test(ph),true);
es('  y el panel la dibuja',/_phTab===6&&typeof _phdRender==='function'/.test(ph),true);
es('respeta los permisos por pestaña (CU.panelHorasTabs)',/tabs=tabs\.filter\(t=>ok\.indexOf\(t\[0\]\)>=0\)/.test(ph),true);
es('index: script declarado después de panelHoras.js',
  html.indexOf('<script src="js/panelHorasDia.js')>html.indexOf('<script src="js/panelHoras.js'),true);
es('no reimplementa las horas por turno ni la meta',
  /_phHsProgTurno==='function'/.test(mod)&&/_rmMetaDe==='function'/.test(mod),true);
es('todo lo nuevo lleva prefijo _phd',
  [...mod.matchAll(/^(?:const|let|function)\s+([A-Za-z_$][\w$]*)/gm)].map(m=>m[1])
    .every(n=>/^_(phd|PHD)/.test(n)),true);

console.log('\n'+(mal?'X '+mal+' fallo(s)':'OK todo bien')+'  ·  '+ok+'/'+(ok+mal));
process.exit(mal?1:0);
