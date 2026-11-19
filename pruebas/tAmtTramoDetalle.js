// Avance MT · doble clic en un tramo: qué equipos trabajaron y cuántos viajes.
const fs=require('fs'),path=require('path'),vm=require('vm');
const R=path.join(__dirname,'..')+'/';
let ok=0,mal=0;
const es=(l,g,e)=>{const b=JSON.stringify(g)===JSON.stringify(e);b?ok++:mal++;
  console.log((b?'  OK  ':'  MAL ')+l.padEnd(58)+'= '+JSON.stringify(g)+(b?'':'  (esperado '+JSON.stringify(e)+')'));};
const SRC=fs.readFileSync(R+'js/avanceMT.js','utf8');
const nodos={};
const document={getElementById:id=>nodos[id]||null,addEventListener(){},removeEventListener(){},querySelectorAll:()=>[],
  createElement:()=>({style:{},remove(){delete nodos.amtTramoOv;}}),
  body:{appendChild:n=>{nodos[n.id]=n;}}};
const ctx={console,Date,Math,JSON,Set,Object,Array,String,Number,parseFloat,document,
  localStorage:{getItem:()=>null,setItem(){}},today:()=>'2026-11-19',
  DB:{tramos:[{id:2,codigo:'TMO-002',inicio:'C. Huantajalla',fin:'R3 - Dique Auxiliar'}],
    equipos:[{id:10,codigo:'VOL ECOP-001',nombre:'Volquete Volvo'},{id:11,codigo:'VOL ECOP-002',nombre:'Volquete Volvo'},
             {id:20,codigo:'EXC ECOP-002',nombre:'Excavadora 336'}],
    partes:[
      {id:1,eqId:10,fecha:'2026-11-01',viajes:[{tramoId:2,cant:10,material:'Relleno'},{tramoId:9,cant:5,material:'Relleno'}]},
      {id:2,eqId:10,fecha:'2026-11-02',viajes:[{tramoId:2,cant:6,material:'Sin material'}]},
      {id:3,eqId:11,fecha:'2026-11-02',viajes:[{tramoId:2,cant:4,material:'Roca'}]},
      {id:4,eqId:20,fecha:'2026-11-02',tramoId:2,hrIni:100,hrFin:108,viajes:[]},
      {id:5,eqId:11,fecha:'2026-09-01',viajes:[{tramoId:2,cant:99,material:'Roca'}]}]}};
vm.createContext(ctx);vm.runInContext(SRC,ctx);
const ev=s=>vm.runInContext(s,ctx);
ev('_amtFechaD="2026-10-31";_amtFechaH="2026-11-18";_amtCapM3=12');

const D=ev('_amtTramoDatos(2)');
es('dos volquetes, ordenados por viajes',D.vol.map(r=>r.eqId),[10,11]);
es('VOL-001: 16 viajes (no cuenta los del otro tramo)',D.vol[0].viajes,16);
es('  m³: el viaje sin material no suma volumen',D.vol[0].m3,120);
es('  dos días',D.vol[0].dias.size,2);
es('VOL-002: 4 viajes, fuera el de septiembre',D.vol[1].viajes,4);
es('excavadora con el tramo en el parte va como apoyo',D.apoyo.map(r=>[r.eqId,r.horas]),[[20,8]]);
ev('_amtMatFiltro=new Set(["Roca"])');
es('respeta el filtro de material',ev('_amtTramoDatos(2)').vol.map(r=>[r.eqId,r.viajes]),[[11,4]]);
ev('_amtMatFiltro=new Set()');

ev('_amtTramoDetalle(2)');
const H=(nodos.amtTramoOv||{}).innerHTML||'';
es('abre la ventana',!!nodos.amtTramoOv,true);
es('  con el tramo y los equipos',H.includes('TMO-002')&&H.includes('VOL ECOP-001')&&H.includes('EXC ECOP-002'),true);
es('  sin undefined ni NaN',/undefined|NaN/.test(H),false);
es('  trae el gráfico de viajes por día',H.includes('Viajes por día'),true);
es('  trabajó 2 de 19 días',/Trabajó <b[^>]*>2<\/b> de 19 días/.test(H),true);
es('  y el botón de Excel',H.includes('_amtTramoExcel('),true);

console.log('\n== Excel del tramo ==');
const hojas={};let archivo='';
ctx.XLSX={utils:{book_new:()=>({}),aoa_to_sheet:a=>({__aoa:a,'!ref':'A1:A1'}),book_append_sheet:(wb,ws,n)=>{hojas[n]=ws.__aoa;},
  encode_cell:()=>'A1',decode_range:()=>({e:{r:0}})},writeFile:(wb,n)=>{archivo=n;}};
ctx.toast=()=>{};
ev('_amtTramoExcel(2)');
es('nombre del archivo',archivo,'Tramo_TMO-002_2026-10-31_2026-11-18.xlsx');
es('tres hojas',Object.keys(hojas),['Resumen','Por día','Detalle']);
es('Resumen: VOL-001 con 16 viajes',hojas.Resumen[4].slice(0,3),['VOL ECOP-001','Volquete Volvo',16]);
es('  incluye la excavadora de apoyo',JSON.stringify(hojas.Resumen).includes('EXC ECOP-002'),true);
es('Por día: los 19 días + total',hojas['Por día'].length-4,20);
const d0211=hojas['Por día'].find(f=>f[0]==='02/11/2026');
es('  02/11: VOL-001 6 · VOL-002 4 · total 10',d0211.slice(1,4),[6,4,10]);
es('  un día sin trabajo queda en cero',hojas['Por día'].find(f=>f[0]==='05/11/2026')[3],0);
es('Detalle: 3 registros, ordenados por fecha',hojas.Detalle.slice(4).map(f=>f[0]+' '+f[2]),
  ['01/11/2026 VOL ECOP-001','02/11/2026 VOL ECOP-001','02/11/2026 VOL ECOP-002']);
ev('_amtTramoCerrar()');
es('se cierra',!!nodos.amtTramoOv,false);
es('la fila abre con doble clic',/ondblclick="_amtTramoDetalle\(/.test(SRC),true);

console.log(`\n${mal?'✗ '+mal+' FALLAS':'OK todo bien'}  ·  ${ok}/${ok+mal}`);
process.exitCode=mal?1:0;
