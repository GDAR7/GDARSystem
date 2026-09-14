// Control de Salida EQ: filtro por fecha de salida. Se carga el código real
// en un sandbox y se comprueba que la pantalla, el PDF y el Excel muestren
// exactamente las mismas salidas.
const fs=require('fs'),vm=require('vm');
const R='c:/Users/LENOVO/OneDrive/Documents/GitHub/GDARSystem/';
let ok=0,mal=0;
const es=(l,g,e)=>{const b=String(g)===String(e);b?ok++:mal++;
  console.log((b?'  OK  ':'  MAL ')+l.padEnd(58)+'= '+g+(b?'':'  (esperado '+e+')'));};

const DB={salidaEquipos:[
  {id:1,codigo:'EXC-A',placa:'AAA-111',tipoMantto:'Preventivo',fechaSalida:'2026-08-19',fechaRetorno:'2026-08-20'},
  {id:2,codigo:'EXC-B',placa:'BBB-222',tipoMantto:'Correctivo',fechaSalida:'2026-08-19',fechaRetorno:null},
  {id:3,codigo:'EXC-C',placa:'CCC-333',tipoMantto:'Preventivo',fechaSalida:'2026-08-06',fechaRetorno:'2026-08-08'},
  {id:4,codigo:'EXC-D',placa:'DDD-444',tipoMantto:'Preventivo',fechaSalida:'2026-08-25',fechaRetorno:null}
]};

const nodos={seqBody:{innerHTML:''}};
let ventana=null, libro=null, avisos=[];
const ctx=vm.createContext({
  DB,console,Date,Math,Number,String,Object,Array,JSON,
  localStorage:{getItem:()=>'',setItem(){},removeItem(){}},
  document:{getElementById:id=>nodos[id]||null,querySelector:()=>null},
  window:{location:{href:'https://ecosermo.gdarei.com/index.html'},
    open:()=>{ventana={html:'',document:{write(h){ventana.html+=h;},close(){}}};return ventana;}},
  XLSX:{utils:{aoa_to_sheet:a=>({aoa:a}),book_new:()=>({}),book_append_sheet(){}},
        writeFile:(wb,nom)=>{libro={nom};}},
  EMPRESA:{nombre:'ECOSERMO',logo:'img/logo.png'},
  toast:(m,e)=>avisos.push({m,e:!!e}), today:()=>'2026-09-14'
});
// Se captura la hoja que arma el Excel antes de "escribirla"
vm.runInContext(fs.readFileSync(R+'js/salidaEquipos.js','utf8'),ctx,{filename:'salidaEquipos.js'});
vm.runInContext('XLSX.utils.aoa_to_sheet=a=>{globalThis.__aoa=a;return{aoa:a};}',ctx);
const ev=x=>vm.runInContext(x,ctx);
const codigos=()=>ev('_seqLista().map(r=>r.codigo).sort().join(",")');
const pinta=()=>{ev('rSalidaEquipos()');return nodos.seqBody.innerHTML;};

console.log('\n== Sin fecha: se ve todo, como antes ==');
es('las cuatro salidas',codigos(),'EXC-A,EXC-B,EXC-C,EXC-D');
es('sin texto de rango',ev('_seqRangoTxt()'),'');

console.log('\n== Elegir una sola fecha muestra ese día ==');
ev('_seqSetFiltro("desde","2026-08-19")');
es('el "hasta" se iguala solo',ev('_seqHasta'),'2026-08-19');
es('quedan las dos del 19/08',codigos(),'EXC-A,EXC-B');
es('el rango se lee como un día',ev('_seqRangoTxt()'),'19/08/2026');

console.log('\n== Cambiar el "hasta" abre un rango ==');
ev('_seqSetFiltro("hasta","2026-08-25")');
es('19/08 al 25/08 trae tres',codigos(),'EXC-A,EXC-B,EXC-D');
es('  y el rango lo dice',ev('_seqRangoTxt()'),'19/08/2026 al 25/08/2026');
ev('_seqSetFiltro("desde","2026-08-20")');
es('mover el "desde" dentro del rango no toca el "hasta"',ev('_seqHasta'),'2026-08-25');
es('  20/08 al 25/08 trae solo EXC-D',codigos(),'EXC-D');
ev('_seqSetFiltro("desde","2026-08-30")');
es('un "desde" después del "hasta" arrastra el "hasta"',ev('_seqHasta'),'2026-08-30');
ev('_seqSetFiltro("hasta","2026-08-01")');
es('un "hasta" antes del "desde" arrastra el "desde"',ev('_seqDesde'),'2026-08-01');
es('  ese día no tiene salidas',codigos(),'');

console.log('\n== Se combina con los otros filtros ==');
ev('_seqDesde="2026-08-19";_seqHasta="2026-08-19";_seqSetFiltro("est","fuera")');
es('19/08 + solo fuera de obra = EXC-B',codigos(),'EXC-B');
ev('_seqSetFiltro("est","");_seqSetFiltro("tipo","Preventivo")');
es('19/08 + preventivo = EXC-A',codigos(),'EXC-A');
ev('_seqSetFiltro("tipo","")');

console.log('\n== La pantalla ==');
const H=pinta();
es('tiene los dos selectores de fecha',/id="seqDesde"/.test(H)&&/id="seqHasta"/.test(H),true);
es('  con la fecha elegida puesta',/id="seqDesde" value="2026-08-19"/.test(H),true);
es('  resaltados cuando filtran',/seqDesde[^>]*border-color:var\(--mec\)/.test(H),true);
es('el título dice cuántas hay y de qué fecha',/· 2 salida\(s\) · 19\/08\/2026/.test(H),true);
es('la tabla muestra solo esas dos',(H.match(/_seqEdit\(/g)||[]).length,2);
es('hay botón para quitar la fecha',/_seqLimpiarFechas\(\)/.test(H),true);
es('los KPI siguen sobre el total (sin cambios)',/Total Salidas<\/div><div class="kpi-val">4</.test(H),true);

console.log('\n== El PDF imprime solo lo que se ve ==');
ventana=null;ev('_seqPrint()');
es('se abrió la ventana',!!ventana,true);
es('trae EXC-A y EXC-B',/EXC-A/.test(ventana.html)&&/EXC-B/.test(ventana.html),true);
es('  y no las de otras fechas',/EXC-C|EXC-D/.test(ventana.html),false);
es('la cabecera dice qué fecha se imprimió',/<b>Salidas:<\/b> 19\/08\/2026/.test(ventana.html),true);

console.log('\n== El Excel también ==');
libro=null;ev('_seqExportXls()');
const aoa=ev('globalThis.__aoa');
const datos=aoa.slice(4);
es('dos filas de datos',datos.length,2);
es('  las mismas del PDF',datos.map(f=>f[2]).sort().join(','),'EXC-A,EXC-B');
es('la fila 2 dice la fecha',aoa[1].includes('Salidas: 19/08/2026'),true);
es('el archivo lleva la fecha',libro.nom,'control_salida_equipos_2026-08-19.xlsx');
ev('_seqHasta="2026-08-25"');libro=null;ev('_seqExportXls()');
es('  y con rango, las dos',libro.nom,'control_salida_equipos_2026-08-19_2026-08-25.xlsx');

console.log('\n== Quitar la fecha ==');
nodos.seqBody.innerHTML='';
ev('_seqLimpiarFechas()');
es('vuelven las cuatro',codigos(),'EXC-A,EXC-B,EXC-C,EXC-D');
const H2=nodos.seqBody.innerHTML;
es('se repintó la tabla',(H2.match(/_seqEdit\(/g)||[]).length,4);
es('ya no hay botón ✕ de fecha',/_seqLimpiarFechas\(\)/.test(H2),false);
es('ni aviso de rango en el título',/salida\(s\) ·/.test(H2),false);
libro=null;ev('_seqExportXls()');
es('el Excel vuelve a su nombre de siempre',libro.nom,'control_salida_equipos.xlsx');

console.log('\n== Fecha sin salidas ==');
ev('_seqSetFiltro("desde","2026-01-01")');
const H3=nodos.seqBody.innerHTML;
es('la tabla lo explica',/Sin salidas registradas con estos filtros/.test(H3),true);
avisos=[];ventana=null;ev('_seqPrint()');
es('el PDF no se abre vacío',ventana,null);
es('  y avisa',avisos.some(a=>a.e),true);

console.log('\n'+(mal?'X '+mal+' fallo(s)':'OK todo bien')+'  ·  '+ok+'/'+(ok+mal));
process.exit(mal?1:0);
