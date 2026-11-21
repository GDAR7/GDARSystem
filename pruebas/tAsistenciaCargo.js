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
es('solo quienes trabajan: TD, TN, A5 o con entrada',D.grupos.flatMap(g=>g.filas.map(f=>f.p.id)).sort(),[1,3,4,7]);
es('  fuera: la falta y el DL (y el inactivo)',D.fuera,{DL:1,F:1});
es('3 presentes (la asistencia de ayer no cuenta)',D.pres,3);
es('cargos, el de más gente primero',D.grupos.map(g=>[g.cargo,g.total,g.pres]),
  [['Operador de Volquete',2,2],['Ing. Residente',1,0],['Vigía',1,1]]);
es('dentro del cargo, por apellido',D.grupos[0].filas.map(f=>f.p.ape),['DIAZ','PEREZ']);
es('TN sin entrada = ausente',D.grupos[1].filas[0].estado,'AUSENTE');
es('texto de no incluidos',ev('_arcFueraTxt(_arcDatos())'),'No incluidos (no programados ese día): DL 1 · F 1');

console.log('\n== Por turno ==');
es('turno por hora: 06:00 día · 19:55 noche',[ev('_arcTurnoDe("06:00","")'),ev('_arcTurnoDe("19:55","")')],['D','N']);
es('  sin hora, por tareo TD/TN',[ev('_arcTurnoDe("","TD")'),ev('_arcTurnoDe("","TN")'),ev('_arcTurnoDe("","DL")')],['D','N','']);
ev('_arcTurno="D"');
let T=ev('_arcDatos()');
es('turno día: los 2 que entraron de día',T.grupos.flatMap(g=>g.filas.map(f=>f.p.id)).sort(),[1,3]);
es('  los 2 de noche cuentan aparte',T.sinTurno,2);
ev('_arcTurno="N"');
es('turno noche: el TN (ausente) y el A5 que entró 19:30',ev('_arcDatos()').grupos.flatMap(g=>g.filas.map(f=>f.p.id)).sort(),[4,7]);
ev('_arcTurno=""');

campos.asiGuardia='A';
es('filtro guardia A',ev('_arcDatos()').total,3);
campos.asiGuardia='';campos.asiTareo='TN';
es('filtro tareo TN',ev('_arcDatos()').grupos.map(g=>g.filas.map(f=>f.p.id)),[[4]]);
campos.asiTareo='__sin__';
es('filtro sin tareo (solo el que marcó entrada)',ev('_arcDatos()').total,1);
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
es('  sin la tabla de resumen',/class="rs"|TOTAL<\/td>/.test(html),false);
es('  un bloque por cargo',(html.match(/class="grp"/g)||[]).length,3);
es('  barra de % en el encabezado del cargo: 100% · 0% · 100%',
  (html.match(/<span style="color:#[0-9a-f]+">\d+%<\/span>/g)||[]).map(s=>s.replace(/<[^>]+>/g,'')),['100%','0%','100%']);
es('  sin columna Estado',/<th>Estado<\/th>/.test(html),false);
es('  el ausente va en rojo',/<tr class="au"><td class="n">1<\/td><td>444/.test(html),true);
es('  avisa los no incluidos',html.includes('No incluidos (no programados ese día): DL 1 · F 1'),true);
es('  ya no hay tarjetas',/class="tj"/.test(html),false);
es('  sin columnas Salida ni Horas',/<th>Salida<\/th>|<th>Horas<\/th>/.test(html),false);
es('  nombres escapados',html.includes('&lt;JUAN&gt;')&&!html.includes('<JUAN>'),true);
es('  sin undefined ni NaN',/undefined|NaN/.test(html),false);
es('  se adapta al celular',/name="viewport"/.test(html)&&/max-width:700px/.test(html),true);
es('  estilos encerrados en .arc (no tocan el sistema)',
  ev('_arcCss()').split('}').filter(r=>r.trim()&&!/^\s*\.arc/.test(r)).length,0);

console.log('\n== PDF por bloques ==');
{
  const g={cargo:'Ayudante',total:70,pres:70,aus:0,
    filas:Array.from({length:70},(_,i)=>({p:{dni:String(i)},nombre:'P'+i,ent:'06:00',sal:'',horas:'',tareo:'',estado:'PRESENTE'}))};
  ctx.__g=g;
  const b2=ev('_arcGrupoHtml(__g,32,64)');
  es('el 2.º bloque dice (cont.)',b2.includes('Ayudante (cont.)'),true);
  es('  numeración sigue: 33 a 64',[/<td class="n">33</.test(b2),/<td class="n">64</.test(b2),/<td class="n">65</.test(b2)],[true,true,false]);
  es('  el 1.º bloque lleva el ancla del cargo',ev('_arcGrupoHtml(__g,0,32)').includes('id="cAyudante"'),true);
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
  es('  con texto de presentes',compartido&&compartido.text,'Asistencia del 20/11/2026 · Presentes 3 de 4');
  compartido=null;
  await ev('_arcEnviar("pdf")');
  es('PDF: se comparte',compartido&&compartido.files[0].type,'application/pdf');
  es('  resumen + 3 cargos + pie = 5 bloques',imagenes,5);
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
es('  fila del cargo',hojas['Resumen por cargo'][3],['Operador de Volquete',2,2,0,100]);
es('  total',hojas['Resumen por cargo'].slice(-1)[0],['TOTAL',4,3,1,75]);
es('  detalle: 4 personas (sin DL ni F)',hojas.Detalle.length-3,4);

const HTML=fs.readFileSync(R+'index.html','utf8');
es('botón en la Asistencia',/onclick="asiReporteCargo\(\)"/.test(HTML),true);
es('script cargado',/js\/asistenciaCargo\.js\?v=\d+/.test(HTML),true);
es('filtro de tareo incluye Suspensión',/<option value="S">S – Suspensión/.test(HTML),true);

console.log(`\n${mal?'✗ '+mal+' FALLAS':'OK todo bien'}  ·  ${ok}/${ok+mal}`);
process.exitCode=mal?1:0;
}
