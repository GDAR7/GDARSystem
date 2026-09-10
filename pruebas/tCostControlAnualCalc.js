// Matriz anual: los NÚMEROS. Se carga el código real en un sandbox, se le da
// una base de datos armada a mano y se comprueba celda por celda.
// Lo que se busca demostrar es que la matriz no inventa nada: cada cifra sale
// del mismo _ccCalcEq que alimenta la pestaña Equipos.
const fs=require('fs'),vm=require('vm');
const R='c:/Users/LENOVO/OneDrive/Documents/GitHub/GDARSystem/';
let ok=0,mal=0;
const es=(l,g,e)=>{const b=String(g)===String(e);b?ok++:mal++;
  console.log((b?'  OK  ':'  MAL ')+l.padEnd(58)+'= '+g+(b?'':'  (esperado '+e+')'));};

// ── La base de datos de la prueba ───────────────────────────────────────────
// EXC-01 sin EDP → el alquiler se estima con la tarifa del Máster.
// EXC-02 con EDP en dólares → el alquiler es el EDP, convertido a soles.
// TRA-01 de otra familia → sirve para comprobar la agrupación.
const DB={
  tarifasEq:[],                       // vacío → se usa la lista de referencia del código
  ventaPersonal:[],
  equipos:[
    {id:1,codigo:'EXC-01',nombre:'Excavadora N° 01 HYUNDAI',sub:'EXCAVADORA',
     tipo:'Línea Amarilla',proveedor:'2MMICON',tarifa:100,tarifaUn:'HM',proyecto:'EPY-001-26'},
    {id:2,codigo:'EXC-02',nombre:'Excavadora N° 02 336 CAT',sub:'EXCAVADORA',
     tipo:'Línea Amarilla',proveedor:'Ecosermo',tarifa:120,tarifaUn:'HM',proyecto:'EPY-004-26'},
    {id:3,codigo:'TRA-01',nombre:'Tractor Oruga D6',sub:'TRACTOR',
     tipo:'Línea Amarilla',proveedor:'PANDAL',tarifa:150,tarifaUn:'HM',proyecto:'EPY-004-26'}
  ],
  partes:[
    // Febrero = 21-ene al 20-feb
    {id:1,eqId:1,fecha:'2026-02-01',ef:10},
    {id:2,eqId:1,fecha:'2026-02-02',ef:6},
    // Marzo = 21-feb al 20-mar
    {id:3,eqId:2,fecha:'2026-03-01',ef:8},
    {id:4,eqId:3,fecha:'2026-03-05',ef:4},
    // Fuera del año 2026 (período Enero-2025): no debe aparecer
    {id:5,eqId:1,fecha:'2025-01-10',ef:99}
  ],
  combustible:[
    {eqId:1,fecha:'2026-02-05',gal:50,precio:6.00,tipoMov:'Salida'},
    {eqId:2,fecha:'2026-03-03',gal:20,precio:6.50,tipoMov:'Salida'},
    // Un ingreso nunca es costo del equipo
    {eqId:1,fecha:'2026-02-06',gal:500,precio:6.00,tipoMov:'Ingreso'}
  ],
  edpProveedores:[
    {eqId:2,estado:'Emitido',desde:'2026-02-21',hasta:'2026-03-20',
     subtotal:1000,moneda:'DOLARES',numEdp:'EDP-001'}
  ]
};

const ctx=vm.createContext({
  DB,console,Date,Math,Number,String,Object,Array,JSON,isNaN,parseFloat,parseInt,
  localStorage:{getItem:()=>null,setItem(){},removeItem(){}},
  document:{getElementById:()=>null,addEventListener(){},querySelectorAll:()=>[]},
  toast(){}, hhVentaPeriodo:()=>({filas:[]})
});
vm.runInContext(fs.readFileSync(R+'js/costcontrol.js','utf8'),ctx,{filename:'costcontrol.js'});
vm.runInContext(fs.readFileSync(R+'js/costcontrolAnual.js','utf8'),ctx,{filename:'costcontrolAnual.js'});
// El tipo de cambio lo pone el módulo de proveedores; aquí se fija en 3.75
vm.runInContext('_aSoles=(v,m)=>(m&&m!=="SOLES")?(+v||0)*3.75:(+v||0);',ctx);

const ev=x=>vm.runInContext(x,ctx);
const D=ev('_ccaCalcular(2026,"seca")');
const FEB=1, MAR=2;                    // índices de mes (0 = Enero)
const grupo=n=>D.grupos.find(g=>g.nombre===n);
const eq=(g,cod)=>grupo(g).equipos.find(a=>a.eq.codigo===cod);

console.log('\n== Se armó la matriz ==');
es('tres equipos con movimiento',D.nEquipos,3);
es('dos familias',D.grupos.map(g=>g.nombre).join(' · '),'EXCAVADORA · TRACTOR');
es('doce meses',D.periodos.length,12);
es('EXCAVADORA tiene dos equipos',grupo('EXCAVADORA').equipos.length,2);
es('  ordenados por código',grupo('EXCAVADORA').equipos.map(a=>a.eq.codigo).join(','),'EXC-01,EXC-02');

console.log('\n== EXC-01 · febrero · sin EDP (alquiler estimado) ==');
const A=eq('EXCAVADORA','EXC-01').meses[FEB];
es('16 h × S/100 de tarifa del Máster',A.alquiler,1600);
es('combustible: 50 gal × S/6.00',A.comb,300);
es('  el ingreso de 500 gal no cuenta',A.comb!==3300,true);
es('venta: 16 h × S/253.45 (excavadora seca)',A.venta.toFixed(2),'4055.20');
es('margen seca = venta − alquiler',A.margen.toFixed(2),'2455.20');
es('  el combustible NO resta en seca',(A.venta-A.alquiler).toFixed(2),A.margen.toFixed(2));
es('marcado como estimado',A.est,true);

console.log('\n== EXC-02 · marzo · con EDP en dólares ==');
const B=eq('EXCAVADORA','EXC-02').meses[MAR];
es('alquiler = EDP $1000 × 3.75',B.alquiler,3750);
es('  y NO la estimación 8h × S/120',B.alquiler!==960,true);
es('combustible: 20 gal × S/6.50',B.comb,130);
es('venta: 8 h × S/253.45',B.venta.toFixed(2),'2027.60');
es('margen negativo, el EDP supera la venta',B.margen.toFixed(2),'-1722.40');
es('NO marcado como estimado',B.est,false);
es('la moneda del contrato se conserva',eq('EXCAVADORA','EXC-02').moneda,'DOLARES');
es('  y EXC-01 queda en soles',eq('EXCAVADORA','EXC-01').moneda,'SOLES');

console.log('\n== Los meses sin movimiento quedan en cero ==');
es('EXC-01 en enero',eq('EXCAVADORA','EXC-01').meses[0].alquiler,0);
es('  sin marca de estimado',eq('EXCAVADORA','EXC-01').meses[0].hay,false);
es('EXC-02 en febrero',eq('EXCAVADORA','EXC-02').meses[FEB].venta,0);
es('el parte de 2025 no se coló',
  D.periodos.every((p,i)=>eq('EXCAVADORA','EXC-01').meses[i].venta<5000),true);

console.log('\n== Los totales cuadran ==');
const E1=eq('EXCAVADORA','EXC-01');
es('total año = suma de los doce meses',
  E1.tot.venta.toFixed(2),
  E1.meses.reduce((s,m)=>s+m.venta,0).toFixed(2));
['alquiler','comb','venta','margen'].forEach(k=>
  es('  cuadra en '+k,E1.tot[k].toFixed(2),
     E1.meses.reduce((s,m)=>s+m[k],0).toFixed(2)));
es('familia EXCAVADORA marzo = suma de sus equipos',
  grupo('EXCAVADORA').meses[MAR].margen.toFixed(2),
  (eq('EXCAVADORA','EXC-01').meses[MAR].margen+eq('EXCAVADORA','EXC-02').meses[MAR].margen).toFixed(2));
es('TRACTOR va aparte',grupo('TRACTOR').equipos.length,1);
es('  y no se mezcló con EXCAVADORA',
  grupo('EXCAVADORA').meses[MAR].margen!==grupo('TRACTOR').meses[MAR].margen,true);
es('total del año = suma de familias',
  D.totAnio.margen.toFixed(2),
  D.grupos.reduce((s,g)=>s+g.tot.margen,0).toFixed(2));

console.log('\n== Coincide con la pestaña Equipos, mes a mes ==');
// Ésta es la prueba de fondo: se llama al motor directamente, igual que hace
// rCostControl, y se compara contra lo que guardó la matriz.
let difs=0;
D.periodos.forEach((per,i)=>{
  const Rp=ev(`_ccCalcEq(${JSON.stringify(per)},"seca")`);
  Rp.eqRows.forEach(r=>{
    const g=D.grupos.find(G=>G.equipos.some(a=>a.eq.id===r.eq.id));
    const a=g.equipos.find(x=>x.eq.id===r.eq.id);
    const m=a.meses[i];
    if(m.alquiler.toFixed(4)!==r.costoProveedor.toFixed(4))difs++;
    if(m.comb.toFixed(4)!==r.costoComb.toFixed(4))difs++;
    if(m.venta.toFixed(4)!==r.costo.toFixed(4))difs++;
    if(m.margen.toFixed(4)!==r.margen.toFixed(4))difs++;
  });
});
es('ninguna celda difiere del motor',difs,0);

console.log('\n== Tarifa Full sí descuenta el combustible ==');
ev('_ccaCache=null');
const F=ev('_ccaCalcular(2026,"full")');
const A2=F.grupos.find(g=>g.nombre==='EXCAVADORA').equipos.find(a=>a.eq.codigo==='EXC-01').meses[FEB];
es('venta full: 16 h × S/383.32',A2.venta.toFixed(2),'6133.12');
es('margen full = venta − alquiler − combustible',A2.margen.toFixed(2),
  (6133.12-1600-300).toFixed(2));

console.log('\n== El caché ==');
ev('_ccaCache=null');
const C1=ev('_ccaCalcular(2026,"seca")');
const C2=ev('_ccaCalcular(2026,"seca")');
es('la segunda llamada reusa el objeto',C1===C2||C1.clave===C2.clave,true);
es('cambiar de modo cambia la clave',
  ev('_ccaClave(2026,"seca")')!==ev('_ccaClave(2026,"full")'),true);
es('cambiar de año también',
  ev('_ccaClave(2026,"seca")')!==ev('_ccaClave(2025,"seca")'),true);

console.log('\n== Los filtros no alteran las cifras ==');
ev('_ccaTipo="EXCAVADORA"');
const G=ev('_ccaFiltrar(_ccaCalcular(2026,"seca"))');
es('solo queda una familia',G.length,1);
es('  con sus dos equipos',G[0].equipos.length,2);
es('el margen de marzo no cambió',G[0].meses[MAR].margen.toFixed(2),
  grupo('EXCAVADORA').meses[MAR].margen.toFixed(2));
ev('_ccaTipo="";_ccaContratista="PANDAL"');
const G2=ev('_ccaFiltrar(_ccaCalcular(2026,"seca"))');
es('filtrar por contratista deja solo a PANDAL',
  G2.map(g=>g.equipos.map(a=>a.eq.codigo).join()).join(),'TRA-01');
ev('_ccaContratista="";_ccaBuscar="336"');
es('el buscador encuentra por nombre',
  ev('_ccaFiltrar(_ccaCalcular(2026,"seca"))').map(g=>g.equipos.length).join(),'1');
ev('_ccaBuscar=""');

console.log('\n== La venta abierta: equipo + combustible ==');
// Excavadora: Seca 253.45 · Full 383.32 → la diferencia (129.87/h) es el petróleo
ev('_ccaCache=null');
const FU=ev('_ccaCalcular(2026,"full")');
const AF=FU.grupos.find(g=>g.nombre==='EXCAVADORA')
          .equipos.find(a=>a.eq.codigo==='EXC-01').meses[FEB];
es('venta total full: 16 h × S/383.32',AF.venta.toFixed(2),'6133.12');
es('  venta equipo:  16 h × S/253.45',AF.ventaEq.toFixed(2),'4055.20');
es('  venta comb.:   16 h × S/129.87',AF.ventaComb.toFixed(2),'2077.92');
es('las dos partes suman la venta total',
  (AF.ventaEq+AF.ventaComb).toFixed(2),AF.venta.toFixed(2));
es('  y cuadra al céntimo, sin arrastre',AF.ventaEq+AF.ventaComb===AF.venta,true);
es('el margen no cambió al partir la venta',
  AF.margen.toFixed(2),(AF.venta-AF.alquiler-AF.comb).toFixed(2));
ev('_ccaCache=null');
const SE=ev('_ccaCalcular(2026,"seca")');
const AS=SE.grupos.find(g=>g.nombre==='EXCAVADORA')
          .equipos.find(a=>a.eq.codigo==='EXC-01').meses[FEB];
es('en Máq. Seca no hay venta de combustible',AS.ventaComb,0);
es('  y la venta equipo es toda la venta',AS.ventaEq.toFixed(2),AS.venta.toFixed(2));
// Un equipo cuya tarifa Full es igual a la Seca no vende combustible
const R1=ev(`(()=>{const r=_ccCalcEq(${JSON.stringify(D.periodos[FEB])},"full").eqRows
  .find(x=>x.eq.codigo==="EXC-01");return{eq:r.ventaEq,cb:r.ventaComb,to:r.costo};})()`);
es('el motor entrega lo mismo que la matriz',R1.cb.toFixed(2),AF.ventaComb.toFixed(2));

console.log('\n== El filtro de proyecto alcanza a todo el módulo ==');
ev('_ccProyecto="EPY-001-26";_ccaCache=null');
const P1=ev('_ccaCalcular(2026,"seca")');
es('solo queda el equipo de ese proyecto',P1.nEquipos,1);
es('  y es EXC-01',P1.grupos[0].equipos[0].eq.codigo,'EXC-01');
es('  TRACTOR desapareció',P1.grupos.some(g=>g.nombre==='TRACTOR'),false);
const M1=ev(`_ccCalcEq(${JSON.stringify(D.periodos[MAR])},"seca")`);
es('el motor también filtra (marzo sin EXC-02 ni TRA-01)',M1.eqRows.length,0);
ev('_ccProyecto="EPY-004-26";_ccaCache=null');
const P2=ev('_ccaCalcular(2026,"seca")');
es('el otro proyecto trae dos equipos',P2.nEquipos,2);
es('  en dos familias',P2.grupos.map(g=>g.nombre).join(' · '),'EXCAVADORA · TRACTOR');
es('los importes no se alteran al filtrar',
  P2.grupos.find(g=>g.nombre==='EXCAVADORA').equipos[0].meses[MAR].venta.toFixed(2),
  eq('EXCAVADORA','EXC-02').meses[MAR].venta.toFixed(2));
es('el proyecto entra en la clave del caché',
  ev('_ccProyecto="";_ccaClave(2026,"seca")')!==ev('_ccProyecto="EPY-001-26";_ccaClave(2026,"seca")'),true);
ev('_ccProyecto="";_ccaCache=null');
const P0=ev('_ccaCalcular(2026,"seca")');
es('sin filtro vuelven los tres',P0.nEquipos,3);
es('las opciones salen del Máster',
  ev('_ccProyectosDisponibles().join(",")'),'EPY-001-26,EPY-004-26');

console.log('\n== El HTML se arma sin reventar ==');
// El panel es una plantilla larga: si una función interna falla, la pestaña
// saldría en blanco sin decir por qué. Aquí se pinta de verdad.
ev('_ccaAnio=2026;_ccaCache=null');
let H='';
try{H=ev('_ccaPanel()');}catch(e){H='';es('_ccaPanel() lanzó: '+e.message,false,true);}
es('devuelve HTML',H.length>2000,true);
es('están los doce meses en la cabecera',
  ['ENE','FEB','MAR','ABR','MAY','JUN','JUL','AGO','SET','OCT','NOV','DIC']
    .every(m=>H.includes('>'+m+'</th>')),true);
es('la columna de total lleva el año',H.includes('Total 2026'),true);
es('aparecen los cuatro conceptos',
  ['01.-Alquiler','02.-Combustible','03.-Venta','04.-Margen'].every(c=>H.includes(c)),true);
es('aparecen las dos familias',H.includes('EXCAVADORA')&&H.includes('TRACTOR'),true);
es('aparece el contratista',H.includes('2MMICON')&&H.includes('PANDAL'),true);
es('el EDP en dólares se marca',H.includes('>DOLARES<'),true);
es('la insignia de estimado sale',/\d+ estimado/.test(H),true);
es('hay botón de Excel',H.includes('_ccaExcel()'),true);
es('la primera columna queda fija',H.includes('position:sticky;left:0'),true);
es('el pie trae el margen total',H.includes('MARGEN TOTAL'),true);
const filas=(H.match(/<tr[ >]/g)||[]).length, cierres=(H.match(/<\/tr>/g)||[]).length;
es('las filas abren y cierran parejas',filas,cierres);
const tds=(H.match(/<td[ >]/g)||[]).length, tdc=(H.match(/<\/td>/g)||[]).length;
es('las celdas también',tds,tdc);
es('ninguna celda quedó en undefined',/undefined|NaN/.test(H),false);
es('el colspan cubre las 14 columnas',H.includes('colspan="14"'),true);

console.log('\n== Un año sin datos no rompe nada ==');
ev('_ccaAnio=1999;_ccaCache=null');
let H0='';
try{H0=ev('_ccaPanel()');}catch(e){es('1999 lanzó: '+e.message,false,true);}
es('avisa que no hay movimientos',H0.includes('Sin movimientos en 1999'),true);
es('  y aun así pinta la tabla',H0.includes('MARGEN TOTAL'),true);
ev('_ccaAnio=2026;_ccaCache=null');

console.log('\n== La tabla de Equipos: que todas las filas tengan el mismo ancho ==');
// Al partir la venta cambia el número de columnas, y con él todos los colspan.
// Si uno queda mal la tabla se descuadra sin dar ningún error.
function anchos(modo){
  ev(`_ccTarifaModo="${modo}"`);
  const per=JSON.stringify(D.periodos[FEB]);
  const H=ev(`(()=>{const R=_ccCalcEq(${per},"${modo}");
    return _ccPanelEquipos(R.eqRows,"${modo}",${D.periodos[FEB].dias});})()`);
  const thead=(H.match(/<thead>[\s\S]*?<\/thead>/)||[''])[0];
  const nTh=(thead.match(/<th[ >]/g)||[]).length;
  const cuerpo=H.slice(H.indexOf('<tbody>'));
  const filas=[...cuerpo.matchAll(/<tr[\s\S]*?<\/tr>/g)].map(m=>m[0]);
  const anchoDe=tr=>[...tr.matchAll(/<td([^>]*)>/g)]
    .reduce((s,c)=>s+(+((c[1].match(/colspan="(\d+)"/)||[])[1])||1),0);
  return{H,nTh,filas:filas.length,malas:filas.filter(t=>anchoDe(t)!==nTh).length,
         anchos:[...new Set(filas.map(anchoDe))]};
}
const S1=anchos('seca');
es('Máq. Seca: 10 columnas',S1.nTh,10);
es('  todas las filas miden lo mismo',S1.malas,0);
es('  (anchos encontrados)',S1.anchos.join(','),'10');
es('  no hay columna Proyecto',/>Proyecto</.test(S1.H),false);
es('  ni columna Venta Comb.',/Venta Comb\./.test(S1.H),false);
es('  la cabecera dice solo "Venta"',/>Venta<\/th>/.test(S1.H),true);

const F1=anchos('full');
es('Tarifa Full: 11 columnas',F1.nTh,11);
es('  todas las filas miden lo mismo',F1.malas,0);
es('  (anchos encontrados)',F1.anchos.join(','),'11');
es('  aparece Venta Equipo',/>Venta Equipo<\/th>/.test(F1.H),true);
es('  y Venta Comb.',/>Venta Comb\.<\/th>/.test(F1.H),true);
es('  con el pie que explica la suma',/de venta total/.test(F1.H),true);
es('  y sigue sin columna Proyecto',/>Proyecto</.test(F1.H),false);
es('ninguna celda quedó en undefined',/undefined|NaN/.test(F1.H+S1.H),false);

console.log('\n== La matriz Anual en Tarifa Full ==');
ev('_ccTarifaModo="full";_ccaCache=null;_ccaAnio=2026');
const HF=ev('_ccaPanel()');
es('cinco conceptos por equipo',
  ['01.-Alquiler','02.-Combustible','03.-Venta Equipo','04.-Venta Combustible','05.-Margen']
    .every(c=>HF.includes(c)),true);
es('  ya no aparece "03.-Venta" a secas',/03\.-Venta</.test(HF),false);
es('las filas siguen parejas',
  (HF.match(/<tr[ >]/g)||[]).length,(HF.match(/<\/tr>/g)||[]).length);
ev('_ccTarifaModo="seca";_ccaCache=null');
const HS=ev('_ccaPanel()');
es('en Seca vuelven a ser cuatro',/04\.-Margen/.test(HS)&&!/05\.-Margen/.test(HS),true);

console.log('\n'+(mal?'X '+mal+' fallo(s)':'OK todo bien')+'  ·  '+ok+'/'+(ok+mal));
process.exit(mal?1:0);
