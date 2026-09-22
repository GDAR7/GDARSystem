// Panel de Horas Máquina · Reporte Mensual de Utilización (la semana elegida
// contra el corte 21→20 que la contiene). Se cargan los módulos reales con un
// Chart.js y un XLSX simulados.
//
// Escenario: corte 21/08 al 20/09/2026 (31 días) · semana 14 al 20/09.
const fs=require('fs'),vm=require('vm');
const R='c:/Users/LENOVO/OneDrive/Documents/GitHub/GDARSystem/';
let ok=0,mal=0;
const es=(l,g,e)=>{const b=String(g)===String(e);b?ok++:mal++;
  console.log((b?'  OK  ':'  MAL ')+l.padEnd(60)+'= '+g+(b?'':'  (esperado '+e+')'));};
const f1=v=>(+v).toFixed(1);

const partes=[];
let pid=1;
const P=(eqId,fecha,ef,im)=>partes.push({id:pid++,eqId,fecha,ef,im,turno:'DIA'});
// EXC-001 · en la semana: 3 partes, 24 h efectivas, 1 h inoperativa
P(1,'2026-09-15',8,0);P(1,'2026-09-17',9,1);P(1,'2026-09-19',7,0);
// EXC-001 · resto del corte: 5 partes, 25 h efectivas, 5 h inoperativas
['2026-08-25','2026-08-28','2026-09-02','2026-09-08','2026-09-11']
  .forEach(f=>P(1,f,5,1));
// EXC-001 · fuera del corte: no debe contar
P(1,'2026-08-19',10,0);
// VOL-001 · solo en el corte, nada en la semana: 4 partes, 20 h
['2026-08-24','2026-08-31','2026-09-03','2026-09-09'].forEach(f=>P(4,f,5,0));
// ROD-001 · sin ningún parte
// Desmovilizado y vehículo menor: fuera del reporte
P(5,'2026-09-17',9,0);P(6,'2026-09-17',6,0);

const DB={
  equipos:[
    {id:1,codigo:'EXC ECOP-001',sub:'EXCAVADORA',tipo:'Línea Amarilla',est:'Operativo'},
    {id:3,codigo:'ROD ECOP-001',sub:'RODILLO',tipo:'Línea Amarilla',est:'Operativo'},
    {id:4,codigo:'VOL ECOP-001',sub:'VOLQUETE',tipo:'Línea Blanca',est:'Operativo'},
    {id:5,codigo:'EXC VIEJA',sub:'EXCAVADORA',tipo:'Línea Amarilla',est:'Desmovilizado'},
    {id:6,codigo:'CAM ECOP-001',sub:'CAMIONETA',tipo:'Vehículo Menor',est:'Operativo'}
  ],
  partes,comentariosDia:[],tareaje:[],personal:[],tramos:[]
};

const nodos={};
const nodo=id=>nodos[id]||(nodos[id]={id,innerHTML:'',textContent:'',value:'',style:{},focus(){}});
let charts=[],ventana=null,avisos=[],guardados=[],borrados=[],modales=[],xls=null;
function Chart(ctx,cfg){charts.push(cfg);this.destroy=()=>{};}
const XLSX={utils:{
  aoa_to_sheet:aoa=>({aoa}),
  book_new:()=>({hojas:[]}),
  book_append_sheet:(wb,ws,nom)=>{xls={aoa:ws.aoa,hoja:nom};}},
  writeFile:(wb,nombre)=>{if(xls)xls.archivo=nombre;}};
const ctx=vm.createContext({
  DB,console,Date,Math,Number,String,Object,Array,JSON,Set,Chart,URL,XLSX,setTimeout:()=>0,
  openM:id=>modales.push('abrir:'+id),closeM:id=>modales.push('cerrar:'+id),
  confirm:()=>true,
  nidSeguro:(nx,k)=>(DB[k]||[]).reduce((m,r)=>Math.max(m,+r.id||0),0)+1,
  supaUpsert:async(k,rec)=>{guardados.push({k,rec});return null;},
  supaDelete:async(k,id)=>{borrados.push({k,id:+id});},
  localStorage:{getItem:k=>k==='gdar_ph_hsprog'?'10':null,setItem(){},removeItem(){}},
  document:{getElementById:nodo,
    createElement:()=>({width:0,height:0,getContext:()=>({}),toDataURL:()=>'data:image/png;base64,STUB'})},
  window:{open:()=>{ventana={html:'',document:{write(h){ventana.html+=h;},close(){}}};return ventana;}},
  location:{href:'https://ecosermo.gdarei.com/index.html'},
  EMPRESA:{nombre:'ECOSERMO',logo:'img/logo.png'},
  toast:(m,e)=>avisos.push({m,e:!!e}),today:()=>'2026-09-20',CU:{nombre:'Prueba'},
  _amtCapM3:15
});
['panelHoras.js','panelHorasDia.js','panelHorasMes.js'].forEach(f=>
  vm.runInContext(fs.readFileSync(R+'js/'+f,'utf8'),ctx,{filename:f}));
const ev=x=>vm.runInContext(x,ctx);
ev('_phSemIni="2026-09-14"');

console.log('\n== Las dos ventanas que se comparan ==');
let D=ev('_phmDatos()');
es('la semana elegida',D.fIni+' → '+D.fFin,'2026-09-14 → 2026-09-20');
es('el corte que la contiene',D.cIni+' al '+D.cFin,'2026-08-21 al 2026-09-20');
es('  de 31 días',D.diasCorte,31);
es('el corte se acumula hasta el fin de la semana',D.aFin,'2026-09-20');
es('  y lleva 31 días transcurridos',D.diasTrans,31);
es('horas por turno del panel',D.HP,10);

console.log('\n== Qué equipos entran ==');
es('los de línea, sin desmovilizados ni menores',D.filas.map(f=>f.eq.codigo).join(' · '),
  'EXC ECOP-001 · ROD ECOP-001 · VOL ECOP-001');
es('  el que no reportó nada igual aparece',D.filas.some(f=>f.eq.codigo==='ROD ECOP-001'),true);

console.log('\n== La semana ==');
const fil=c=>D.filas.find(f=>f.eq.codigo===c);
const EXC=()=>fil('EXC ECOP-001');
es('EXC-001: 3 partes → 30 h programadas',EXC().progSem,30);
es('  24 h efectivas',f1(EXC().efSem),'24.0');
es('  utilización 80%',f1(EXC().utilSem),'80.0');
es('  disponibilidad (30−1)÷30',f1(EXC().dmSem),f1(29/30*100));

console.log('\n== El corte acumulado ==');
es('EXC-001: 8 partes → 80 h programadas',EXC().progCor,80);
es('  49 h efectivas',f1(EXC().efCor),'49.0');
es('  el parte del 19/08 quedó fuera del corte',EXC().efCor!==59,true);
es('  utilización 61.3%',f1(EXC().utilCor),'61.3');
es('  disponibilidad (80−6)÷80',f1(EXC().dmCor),f1(74/80*100));
es('  meta de una excavadora: 210 h',EXC().meta,210);
es('  avance 49 ÷ 210',f1(EXC().avance),f1(49/210*100));

console.log('\n== La comparación ==');
es('EXC-001: la semana va mejor que el mes',f1(EXC().dif),f1(80-49/80*100));
es('  y es positiva',EXC().dif>0,true);
es('VOL-001 no trabajó esta semana',fil('VOL ECOP-001').nSem,0);
es('  pero sí en el corte',fil('VOL ECOP-001').nCor,4);
es('  con 50% de utilización',f1(fil('VOL ECOP-001').utilCor),'50.0');
es('ROD-001 no tiene nada en ninguna ventana',
  fil('ROD ECOP-001').nSem+'|'+fil('ROD ECOP-001').nCor,'0|0');
es('  y no ensucia el promedio con 0 h programadas',fil('ROD ECOP-001').progCor,0);

console.log('\n== Totales ==');
const T=D.total;
es('semana: 24 h de 30 h prog.',f1(T.efSem)+' de '+f1(T.progSem),'24.0 de 30.0');
es('  utilización 80%',f1(T.utilSem),'80.0');
es('corte: 69 h de 120 h prog.',f1(T.efCor)+' de '+f1(T.progCor),'69.0 de 120.0');
es('  utilización 57.5%',f1(T.utilCor),'57.5');
es('la brecha, en puntos',f1(T.dif),f1(80-57.5));
es('solo se comparan los que tienen ambas ventanas',T.comparables,1);
es('  ese mejoró',T.mejoran,1);
es('  ninguno empeoró',T.empeoran,0);
es('meta sumada: 210 + 180 + 210',T.meta,600);
es('  avance 69 ÷ 600',f1(T.avance),f1(69/600*100));

console.log('\n== Los gráficos ==');
charts=[];
const doc=ev('_phmDoc()');
es('uno por línea',charts.length,2);
const g=i=>charts[i];
es('1º Línea Amarilla, con sus dos equipos',g(0).data.labels.join(','),'EXC ECOP-001,ROD ECOP-001');
es('  barra de color = la semana',g(0).data.datasets[1].label,'Semana');
es('  con el % de la semana',g(0).data.datasets[1].data.join(','),'80,0');
es('  al costado, el corte en gris',g(0).data.datasets[2].label,'Corte');
es('  con el % acumulado',g(0).data.datasets[2].data.join(','),'61.3,0');
es('  el gris no se confunde con el semáforo',g(0).data.datasets[2].backgroundColor,'#94a3b8');
es('  verde el 80% de la semana',g(0).data.datasets[1].backgroundColor[0],'#15803d');
es('  y la meta como línea al 75%',g(0).data.datasets[0].data.join(','),'75,75');
es('el título dice qué contra qué',g(0).options.plugins.title.text.includes('SEMANA 14/09–20/09')
  &&g(0).options.plugins.title.text.includes('CORTE AL 20/09'),true);
es('2º Línea Blanca',g(1).data.labels.join(','),'VOL ECOP-001');
es('el eje llega a 100%',charts.every(c=>c.options.scales.y.suggestedMax===100),true);

console.log('\n== El documento ==');
es('se titula Reporte Mensual',/REPORTE MENSUAL — UTILIZACIÓN DE EQUIPOS/.test(doc),true);
es('  no se confunde con el diario',/REPORTE DIARIO/.test(doc),false);
es('cabecera con el corte',/Corte 21\/08\/2026 al 20\/09\/2026/.test(doc),true);
es('  y con la semana',/Semana 14\/09\/2026 al 20\/09\/2026/.test(doc),true);
es('  dice hasta dónde acumula',/Acumulado al 20\/09\/2026 · 31 de 31 días/.test(doc),true);
es('logo de la empresa',/ecosermo\.gdarei\.com\/img\/logo\.png/.test(doc),true);
es('KPI de la semana',/Utilización de la semana/.test(doc)&&/80\.0%/.test(doc),true);
es('KPI del corte',/Utilización del corte/.test(doc)&&/57\.5%/.test(doc),true);
es('KPI de la brecha, con la flecha',/▲ \+22\.5 pp/.test(doc),true);
es('KPI de equipos que mejoran',/1 de 1/.test(doc),true);
es('KPI de avance vs meta',/Avance vs meta del corte/.test(doc),true);
es('encabezado de dos niveles',/colspan="4"/.test(doc),true);
es('  la columna de la diferencia',/Δ Utiliz\./.test(doc),true);
es('el equipo sin partes de la semana se marca',/SIN PARTE/.test(doc),true);
es('explica las fórmulas',/H\. Prog\. = Nº de partes × 10h/.test(doc),true);
es('  y que el corte no es el mes cerrado',/no al mes cerrado/.test(doc),true);
es('filas y celdas parejas',(doc.match(/<tr[ >]/g)||[]).length,(doc.match(/<\/tr>/g)||[]).length);
es('ninguna celda rota',/undefined|NaN/.test(doc),false);
es('las imágenes de los gráficos',(doc.match(/data:image\/png;base64,STUB/g)||[]).length,2);
es('sale en un solo PDF',(doc.match(/class="salto-pdf"/g)||[]).length,0);

console.log('\n== Elegir equipos por código ==');
es('sin selección entran todos',ev('_phmSelCuenta().n+" de "+_phmSelCuenta().total'),'3 de 3');
ev('_phmSel=new Set([1])');
es('elegir uno deja uno',ev('_phmDatos().filas.map(f=>f.eq.codigo).join(",")'),'EXC ECOP-001');
es('  y el total se recalcula',f1(ev('_phmDatos().total.utilCor')),'61.3');
es('  es una selección aparte de la del reporte diario',ev('_phmSel!==_phdSel'),true);
ev('_phmSelTodos(true)');
es('Todos quita el filtro',ev('_phmSel.size'),0);

console.log('\n== Excel ==');
xls=null;ev('_phmExportXls()');
es('se generó la hoja',!!xls,true);
es('  con nombre que dice el período',xls.archivo,'Reporte Mensual Utilizacion 2026-08-21 al 2026-09-20.xlsx');
es('  14 columnas de encabezado',xls.aoa[3].length,14);
es('  la primera fila de datos es el equipo',xls.aoa[4][0],'EXC ECOP-001');
es('  con la utilización de la semana',xls.aoa[4][5],80);
es('  y la del corte',xls.aoa[4][9],61.3);
es('  los números salen como número, no como texto',typeof xls.aoa[4][5],'number');
es('  y cierra con el total',xls.aoa[xls.aoa.length-1][0],'TOTAL');

console.log('\n== Observaciones del corte ==');
es('sin observaciones el documento no cambia',/Observaciones/.test(ev('_phmDoc()')),false);
nodo('phmComTxt').value='Parada programada de mantenimiento del 05 al 08';
nodo('phmComEq').value='1';
(async()=>{
  await ev('_phmComGuardar()');
  es('queda una observación',ev('_phmComs().length'),1);
  const c1=DB.comentariosDia[0];
  es('  marcada como del mes',c1.ambito,'mes');
  es('  atada al cierre del corte',c1.fecha,'2026-09-20');
  es('  y al equipo elegido',c1.eqId,1);
  es('  se mandó a Supabase',guardados.filter(g=>g.k==='comentariosDia').length,1);

  // Una del reporte diario, el mismo día de cierre: no debe cruzarse
  DB.comentariosDia.push({id:50,ambito:'dia',fecha:'2026-09-20',eqId:1,texto:'Esto es del reporte diario'});
  es('lo del reporte diario no entra aquí',ev('_phmComs().length'),1);
  ev('_phdFecha="2026-09-20"');
  es('  y lo del mes no entra en el diario',ev('_phdComs().length'),1);
  es('  cada uno muestra el suyo',ev('_phdComs()[0].texto'),'Esto es del reporte diario');

  const docC=ev('_phmDoc()');
  es('el PDF trae la sección al pie',/Observaciones/.test(docC),true);
  es('  con el equipo y el texto',/EXC ECOP-001<\/td>/.test(docC)&&/Parada programada/.test(docC),true);
  es('  y no el comentario del diario',/Esto es del reporte diario/.test(docC),false);
  es('  va después de la tabla',docC.indexOf('Observaciones')>docC.indexOf('Semana vs corte por equipo'),true);

  xls=null;ev('_phmExportXls()');
  es('el Excel también las lleva',xls.aoa.some(f=>f[0]==='OBSERVACIONES'),true);

  await ev('_phmComBorrar(1)');
  es('quitarla la saca del reporte',ev('_phmComs().length'),0);
  es('  y de Supabase',borrados.filter(b=>b.k==='comentariosDia').length,1);

  console.log('\n== La pestaña y la impresión ==');
  ev('_phmRender()');
  const H=nodo('phTabBody').innerHTML;
  es('barra con el selector de semana',/onchange="_phSemIni=this\.value;rPanelHoras\(\)"/.test(H),true);
  es('  el selector de equipos',/_phmMenuEquipos\(event\)/.test(H),true);
  es('  los comentarios',/_phmComAbrir\(\)/.test(H),true);
  es('  el botón de Excel',/_phmExportXls\(\)/.test(H),true);
  es('  y el de Imprimir',/_phmPrint\(\)/.test(H),true);
  es('dice el corte que está mostrando',/Corte 21\/08\/2026 al 20\/09\/2026/.test(H),true);
  ventana=null;ev('_phmPrint()');
  es('la impresión abre ventana',!!ventana,true);
  es('  con el documento dentro',/REPORTE MENSUAL/.test(ventana.html),true);
  es('  y manda a imprimir',/window\.print\(\)/.test(ventana.html),true);

  console.log('\n== Otra semana, otro acumulado ==');
  ev('_phSemIni="2026-09-07"');
  const D2=ev('_phmDatos()');
  es('el corte sigue siendo el mismo',D2.cIni+' al '+D2.cFin,'2026-08-21 al 2026-09-20');
  es('  pero acumula solo hasta el 13/09',D2.aFin,'2026-09-13');
  es('  así que el corte trae menos horas',D2.total.efCor<69,true);
  es('la semana del 07 al 13 tiene 2 partes de EXC',
    D2.filas.find(f=>f.eq.codigo==='EXC ECOP-001').nSem,2);
  ev('_phSemIni="2026-09-14"');

  console.log('\n== Enganche ==');
  const ph=fs.readFileSync(R+'js/panelHoras.js','utf8');
  const html=fs.readFileSync(R+'index.html','utf8');
  const mod=fs.readFileSync(R+'js/panelHorasMes.js','utf8');
  es('la pestaña 7 está en la barra',/\[7,'📈 Reporte Mensual'\]/.test(ph),true);
  es('  y el panel la dibuja',/_phTab===7&&typeof _phmRender==='function'/.test(ph),true);
  es('index: el script se carga después de panelHoras.js',
    html.indexOf('<script src="js/panelHorasMes.js')>html.indexOf('<script src="js/panelHoras.js'),true);
  es('  y después del diario, del que usa dos ayudas',
    html.indexOf('<script src="js/panelHorasMes.js')>html.indexOf('<script src="js/panelHorasDia.js'),true);
  es('  el modal de observaciones existe',/id="mPhmCom"/.test(html),true);
  es('no reimplementa el período, las horas ni la meta',
    /_rmPeriodo\(\)/.test(mod)&&/_phHsProgTurno==='function'/.test(mod)&&/_rmMetaDe==='function'/.test(mod),true);
  es('todo lo nuevo lleva prefijo _phm',
    [...mod.matchAll(/^(?:const|let|function|async function)\s+([A-Za-z_$][\w$]*)/gm)].map(m=>m[1])
      .every(n=>/^_(phm|PHM)/.test(n)),true);
  const sql=fs.readFileSync(R+'sql/comentarios_dia.sql','utf8');
  es('el SQL agrega el ámbito',/add column if not exists ambito/.test(sql),true);
  es('  y lo ya escrito queda como del día',/default 'dia'/.test(sql),true);

  console.log('\n'+(mal?'X '+mal+' fallo(s)':'OK todo bien')+'  ·  '+ok+'/'+(ok+mal));
  process.exit(mal?1:0);
})();
