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
      {id:6,dni:'666',ape:'BAJA',nom:'X',cargo:'Operador de Volquete',guardia:'A',est:'Inactivo'}],
    asistencia:[{personalId:1,fecha:'2026-11-20',horaEntrada:'06:00',horaSalida:'18:00'},
                {personalId:3,fecha:'2026-11-20',horaEntrada:'05:50'},
                {personalId:4,fecha:'2026-11-19',horaEntrada:'06:00'}],
    tareaje:[{personalId:1,fecha:'2026-11-20',tipo:'TD'},{personalId:2,fecha:'2026-11-20',tipo:'F'}]}};
vm.createContext(ctx);vm.runInContext(SRC,ctx);
const ev=s=>vm.runInContext(s,ctx);

let D=ev('_arcDatos()');
es('5 activos (el inactivo no cuenta)',D.total,5);
es('2 presentes (la asistencia de ayer no cuenta)',D.pres,2);
es('cargos, el de más gente primero',D.grupos.map(g=>[g.cargo,g.total,g.pres]),
  [['Operador de Volquete',3,2],['Ing. Residente',1,0],['Sin cargo',1,0]]);
es('dentro del cargo, por apellido',D.grupos[0].filas.map(f=>f.p.ape),['DIAZ','PEREZ','ROJAS']);
es('estados',D.grupos[0].filas.map(f=>f.estado),['EN TURNO','COMPLETO','AUSENTE']);

campos.asiGuardia='A';
es('filtro guardia A',ev('_arcDatos()').total,3);
campos.asiGuardia='';campos.asiTareo='F';
es('filtro tareo F',ev('_arcDatos()').grupos.map(g=>g.filas.map(f=>f.p.id)),[[2]]);
campos.asiTareo='__sin__';
es('filtro sin tareo',ev('_arcDatos()').total,3);
campos.asiTareo='';

ev('asiReporteCargo()');
es('reporte: título y fecha',html.includes('ASISTENCIA DEL DÍA POR CARGO')&&html.includes('20/11/2026'),true);
es('  tarjeta del cargo con presentes / total',/Operador de Volquete<\/div><div class="tjn"><b[^>]*>2<\/b><span>\/ 3/.test(html),true);
es('  tarjetas con borde de color',(html.match(/class="tj"[^>]*style="border-color:/g)||[]).length,3);
es('  nombres escapados',html.includes('&lt;JUAN&gt;')&&!html.includes('<JUAN>'),true);
es('  sin undefined ni NaN',/undefined|NaN/.test(html),false);

ev('asiReporteCargoXls()');
es('Excel: nombre',archivo,'Asistencia_por_cargo_2026-11-20.xlsx');
es('  hojas',Object.keys(hojas),['Resumen por cargo','Detalle']);
es('  fila del cargo',hojas['Resumen por cargo'][3],['Operador de Volquete',3,2,1,66.7]);
es('  total',hojas['Resumen por cargo'].slice(-1)[0],['TOTAL',5,2,3,40]);
es('  detalle: 5 personas',hojas.Detalle.length-3,5);

const HTML=fs.readFileSync(R+'index.html','utf8');
es('botón en la Asistencia',/onclick="asiReporteCargo\(\)"/.test(HTML),true);
es('script cargado',/js\/asistenciaCargo\.js\?v=\d+/.test(HTML),true);
es('filtro de tareo incluye Suspensión',/<option value="S">S – Suspensión/.test(HTML),true);

console.log(`\n${mal?'✗ '+mal+' FALLAS':'OK todo bien'}  ·  ${ok}/${ok+mal}`);
process.exitCode=mal?1:0;
