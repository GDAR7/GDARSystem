// Asistencia del día · reporte por cargo: cantidad por cargo arriba y el
// detalle agrupado. Respeta los filtros de la pantalla.
const fs=require('fs'),path=require('path'),vm=require('vm');
const R=path.join(__dirname,'..')+'/';
let ok=0,mal=0;
const es=(l,g,e)=>{const b=JSON.stringify(g)===JSON.stringify(e);b?ok++:mal++;
  console.log((b?'  OK  ':'  MAL ')+l.padEnd(58)+'= '+JSON.stringify(g)+(b?'':'  (esperado '+JSON.stringify(e)+')'));};
const SRC=fs.readFileSync(R+'js/asistenciaCargo.js','utf8');
const campos={asiDate:'2026-11-20',asiGuardia:'',asiTareo:'',asiNomFiltro:''};
let html='',archivo='',hojas={};
const ctx={console,Math,JSON,Date,Map,String,Number,Array,Object,
  document:{getElementById:id=>id in campos?{value:campos[id]}:null},
  today:()=>'2026-11-20',toast:()=>{},calcHoras:()=>'12h 00m',
  _TARE_T:{TD:{bg:'#10b981',tx:'#fff'},F:{bg:'#ef4444',tx:'#fff'}},
  window:{open:()=>({document:{write:h=>{html+=h;},close(){}}})},
  XLSX:{utils:{book_new:()=>({}),aoa_to_sheet:a=>({__a:a}),book_append_sheet:(w,s,n)=>{hojas[n]=s.__a;}},
    writeFile:(w,n)=>{archivo=n;}},
  DB:{personal:[
      {id:1,dni:'111',ape:'PEREZ',nom:'ANA',cargo:'Operador de Volquete',guardia:'A',tipo:'Obrero',est:'Activo'},
      {id:2,dni:'222',ape:'ROJAS',nom:'LUIS',cargo:'Operador de Volquete',guardia:'B',tipo:'Obrero',est:'Activo'},
      {id:3,dni:'333',ape:'DIAZ',nom:'EVA',cargo:'Operador de Volquete',guardia:'A',tipo:'Obrero',est:'Activo'},
      {id:4,dni:'444',ape:'SOTO',nom:'<JUAN>',cargo:'Ing. Residente',guardia:'B',tipo:'Staff',est:'Activo'},
      {id:5,dni:'555',ape:'LUNA',nom:'PIA',cargo:'',guardia:'A',tipo:'Obrero',est:'Activo'},
      {id:6,dni:'666',ape:'BAJA',nom:'X',cargo:'Operador de Volquete',guardia:'A',est:'Inactivo'},
      {id:7,dni:'777',ape:'VEGA',nom:'RAUL',cargo:'Vigía',guardia:'A',tipo:'Obrero',est:'Activo'}],
    asistencia:[{personalId:1,fecha:'2026-11-20',horaEntrada:'06:00',horaSalida:'18:00'},
                {personalId:3,fecha:'2026-11-20',horaEntrada:'05:50'},
                {personalId:4,fecha:'2026-11-19',horaEntrada:'06:00'},
                {personalId:7,fecha:'2026-11-20',horaEntrada:'19:30'}],
    tareaje:[{personalId:1,fecha:'2026-11-20',tipo:'TD'},{personalId:2,fecha:'2026-11-20',tipo:'F'},
             {personalId:4,fecha:'2026-11-20',tipo:'TN'},{personalId:5,fecha:'2026-11-20',tipo:'DL'},
             {personalId:7,fecha:'2026-11-20',tipo:'A5'}]}};
vm.createContext(ctx);vm.runInContext(SRC,ctx);
const ev=s=>vm.runInContext(s,ctx);

let D=ev('_arcDatos()');
es('todos menos el DL y el sin tareo (la falta entra como ausente)',D.grupos.flatMap(g=>g.filas.map(f=>f.p.id)).sort(),[1,2,4,7]);
es('  fuera: el DL y el sin tareo',D.fuera,{DL:1,'sin tareo':1});
es('2 presentes (la asistencia de ayer no cuenta)',D.pres,2);
es('cargos, el de más gente primero',D.grupos.map(g=>[g.cargo,g.total,g.pres]),
  [['Operador de Volquete',2,1],['Ing. Residente',1,0],['Vigía',1,1]]);
es('dentro del cargo, por apellido',D.grupos[0].filas.map(f=>f.p.ape),['PEREZ','ROJAS']);
es('TN sin entrada = ausente',D.grupos[1].filas[0].estado,'AUSENTE');
es('F = ausente',D.grupos[0].filas[1].estado,'AUSENTE');
es('TD y A5 con entrada = presentes',[D.grupos[0].filas[0].estado,D.grupos[2].filas[0].estado],['PRESENTE','PRESENTE']);
es('texto de no incluidos',ev('_arcFueraTxt(_arcDatos())'),'No incluidos: DL 1 · sin tareo 1');

console.log('\n== Por turno ==');
es('turno por hora: 06:00 día · 19:55 noche',[ev('_arcTurnoDe("06:00","")'),ev('_arcTurnoDe("19:55","")')],['D','N']);
es('  sin hora, por tareo TD/TN',[ev('_arcTurnoDe("","TD")'),ev('_arcTurnoDe("","TN")'),ev('_arcTurnoDe("","DL")')],['D','N','']);
ev('_arcTurno="D"');
let T=ev('_arcDatos()');
es('turno día: el que entró de día',T.grupos.flatMap(g=>g.filas.map(f=>f.p.id)).sort(),[1]);
es('  los de noche y la falta sin turno cuentan aparte',T.sinTurno,3);
ev('_arcTurno="N"');
es('turno noche: el TN (ausente) y el A5 que entró 19:30',ev('_arcDatos()').grupos.flatMap(g=>g.filas.map(f=>f.p.id)).sort(),[4,7]);
ev('_arcTurno=""');

campos.asiGuardia='A';
es('filtro guardia A',ev('_arcDatos()').total,2);
campos.asiGuardia='';campos.asiTareo='TN';
es('filtro tareo TN',ev('_arcDatos()').grupos.map(g=>g.filas.map(f=>f.p.id)),[[4]]);
campos.asiTareo='__sin__';
es('filtro sin tareo: nadie (los sin tareo no salen)',ev('_arcDatos()').total,0);
campos.asiTareo='';

// Menú del botón
const nodos=[];
ctx.document.createElement=()=>({style:{},remove(){}});
ctx.document.body={appendChild:n=>nodos.push(n),contains:()=>true};
ev('asiReporteCargo()');
const menu=(nodos[0]||{}).innerHTML||'';
es('el botón abre el menú',!!nodos[0],true);
es('  con imagen, PDF, ver y Excel',['Enviar como imagen','Enviar como PDF','Ver / Imprimir','Excel'].every(t=>menu.includes(t)),true);
es('  opciones con borde de color',(menu.match(/border:2px solid #/g)||[]).length,5);
es('  selector de turno Todo / Día / Noche',["_arcSetTurno('')","_arcSetTurno('D')","_arcSetTurno('N')"].every(t=>menu.includes(t)),true);

ev('_arcVer()');
es('reporte: título y fecha',html.includes('ASISTENCIA DEL DÍA POR CARGO')&&html.includes('20/11/2026'),true);
es('  formato FBNV: un cuadro por guardia A · B · C',(html.match(/class="gtab"/g)||[]).length,3);
es('  encabezados GUARDIA A/B/C',['GUARDIA A','GUARDIA B','GUARDIA C'].every(t=>html.includes(t)),true);
es('  columnas ITEM · CARGO · APELLIDOS Y NOMBRES · TAREO',
  ['ITEM</th>','CARGO</th>','APELLIDOS Y NOMBRES</th>','TAREO</th>'].every(t=>html.includes(t)),true);
es('  el cargo en una celda unida, con presentes/total',/<td class="gcg" rowspan="1">OPERADOR DE VOLQUETE<span class="gcc">1\/1<\/span>/.test(html),true);
es('  presente TD en azul',/<td class="gp" style="color:#0000FF">PEREZ, ANA<\/td><td class="gt" style="color:#0000FF">TD</.test(html),true);
es('  A5 presente en naranja',/color:#ED7D31">VEGA, RAUL/.test(html),true);
es('  la falta en rojo',/color:#C00000">ROJAS, LUIS<\/td><td class="gt" style="color:#C00000">F</.test(html),true);
es('  TN sin entrada (ausente) en rojo',/color:#C00000">SOTO, &lt;JUAN&gt;/.test(html),true);
es('  % por guardia al pie: A 100% · B 0% · C 0%',
  (html.match(/<span style="color:#[0-9a-f]+">\d+%<\/span>/g)||[]).map(s=>s.replace(/<[^>]+>/g,'')),['100%','0%','0%']);
es('  resumen por guardia con % de asistencia',/<td class="grl">% ASISTENCIA<\/td><td>100%<\/td><td>0%<\/td><td>0%<\/td><td><b>50%/.test(html),true);
es('  avisa los no incluidos',html.includes('No incluidos: DL 1 · sin tareo 1'),true);
es('  sin columnas Tipo, Entrada, Salida, Horas ni Estado',/<th[^>]*>(Tipo|Entrada|Salida|Horas|Estado)<\/th>/i.test(html),false);
es('  nombres escapados',html.includes('&lt;JUAN&gt;')&&!html.includes('<JUAN>'),true);
es('  sin undefined ni NaN',/undefined|NaN/.test(html),false);
es('  se adapta al celular (cuadros uno debajo del otro)',/name="viewport"/.test(html)&&/max-width:700px\)\{.*?\.gq\{grid-template-columns:1fr/.test(html),true);
es('  imprime en A4 horizontal',/size:A4 landscape/.test(html),true);
es('  estilos encerrados en .arc (no tocan el sistema)',
  ev('_arcCss()').split('}').filter(r=>r.trim()&&!/^\s*\.arc/.test(r)).length,0);
campos.asiGuardia='B';
es('filtro guardia B: solo el cuadro B',(ev('_arcCuerpoHtml(_arcDatos())').match(/class="gtab"/g)||[]).length,1);
campos.asiGuardia='';

console.log('\n== PDF por tandas de cargos ==');
es('tandas de hasta 40 filas sin partir cargos',
  ev('_arcTandas([{n:30},{n:8},{n:5},{n:45},{n:2}])').map(t=>t.map(b=>b.n)),[[30,8],[5],[45],[2]]);
{
  ctx.__M={GS:['A'],porG:{A:{X:[{nombre:'P',tareo:'TD',estado:'PRESENTE',p:{}}]}},cuenta:{A:{total:1,pres:1}},bloques:[{cargo:'X',n:1}]};
  es('  la numeración sigue entre tandas',/<td class="gn">41</.test(ev('_arcCuadrosHtml(__M,__M.bloques,40)')),true);
}

console.log('\n== Enviar desde el celular ==');
(async()=>{
  let compartido=null,bajado=null;
  const canvas={width:794,height:400,toBlob:cb=>cb({tam:1}),toDataURL:()=>'data:'};
  let paginas=1,imagenes=0;
  ctx.window.html2canvas=async()=>canvas;
  ctx.window.jspdf={jsPDF:function(){return{addImage(){imagenes++;},addPage(){paginas++;},output:()=>({pdf:1})};}};
  ctx.File=function(b,n,o){this.name=n;this.type=o.type;};
  ctx.navigator={canShare:()=>true,share:async d=>{compartido=d;}};
  ctx.URL={createObjectURL:()=>'blob:',revokeObjectURL(){}};
  ctx.setTimeout=()=>{};
  ctx.document.createElement=()=>({style:{},remove(){},querySelector:()=>({})});
  await ev('_arcEnviar("img")');
  es('imagen: se comparte un PNG',compartido&&[compartido.files[0].name,compartido.files[0].type],
    ['Asistencia por cargo 2026-11-20.png','image/png']);
  es('  con texto de presentes',compartido&&compartido.text,'Asistencia del 20/11/2026 · Presentes 2 de 4');
  compartido=null;
  await ev('_arcEnviar("pdf")');
  es('PDF: se comparte',compartido&&compartido.files[0].type,'application/pdf');
  es('  encabezado + 1 tanda + resumen = 3 bloques',imagenes,3);
  ctx.navigator={};
  ctx.document.createElement=()=>({style:{},click(){bajado=true;},remove(){},querySelector:()=>({})});
  await ev('_arcEnviar("pdf")');
  es('sin compartir (PC): se descarga',bajado,true);
  fin();
})();
function fin(){

ev('asiReporteCargoXls()');
es('Excel: nombre',archivo,'Asistencia_por_cargo_2026-11-20.xlsx');
es('  hojas',Object.keys(hojas),['Resumen por cargo','Detalle']);
es('  fila del cargo',hojas['Resumen por cargo'][3],['Operador de Volquete',2,1,1,50]);
es('  total',hojas['Resumen por cargo'].slice(-1)[0],['TOTAL',4,2,2,50]);
es('  detalle: 4 personas (sin DL ni sin tareo)',hojas.Detalle.length-3,4);
es('  detalle sin Tipo ni Entrada',hojas.Detalle[2],['Cargo','N°','DNI','Apellidos y nombres','Guardia','Tareo','Estado']);

const HTML=fs.readFileSync(R+'index.html','utf8');
es('botón en la Asistencia',/onclick="asiReporteCargo\(\)"/.test(HTML),true);
es('script cargado',/js\/asistenciaCargo\.js\?v=\d+/.test(HTML),true);
es('filtro de tareo incluye Suspensión',/<option value="S">S – Suspensión/.test(HTML),true);

console.log(`\n${mal?'✗ '+mal+' FALLAS':'OK todo bien'}  ·  ${ok}/${ok+mal}`);
process.exitCode=mal?1:0;
}
