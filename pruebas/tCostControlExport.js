// Exportar Cost Control a Excel y PDF. Se corren los exportadores de verdad
// contra un XLSX y un window.open simulados, y se revisa lo que producen.
// Lo que más importa: que el archivo diga lo mismo que la pantalla —mismos
// filtros, mismo modo de tarifa— y que ninguna fila quede descuadrada.
const fs=require('fs'),vm=require('vm');
const R=require('path').join(__dirname,'..')+'/';
let ok=0,mal=0;
const es=(l,g,e)=>{const b=String(g)===String(e);b?ok++:mal++;
  console.log((b?'  OK  ':'  MAL ')+l.padEnd(58)+'= '+g+(b?'':'  (esperado '+e+')'));};

const DB={
  tarifasEq:[],ventaPersonal:[],
  equipos:[
    {id:1,codigo:'EXC-01',nombre:'Excavadora N° 01',marca:'HYUNDAI',modelo:'R300',
     sub:'EXCAVADORA',tipo:'Línea Amarilla',proveedor:'2MMICON',tarifa:100,
     tarifaUn:'HM',proyecto:'EPY-001-26'},
    {id:2,codigo:'EXC-02',nombre:'Excavadora N° 02',marca:'CAT',modelo:'336',
     sub:'EXCAVADORA',tipo:'Línea Amarilla',proveedor:'Ecosermo',tarifa:120,
     tarifaUn:'HM',proyecto:'EPY-004-26'},
    {id:3,codigo:'TRA-01',nombre:'Tractor Oruga',marca:'CAT',modelo:'D6',
     sub:'TRACTOR',tipo:'Línea Amarilla',proveedor:'PANDAL',tarifa:150,
     tarifaUn:'HM',proyecto:'EPY-004-26'}
  ],
  partes:[{id:1,eqId:1,fecha:'2026-02-01',ef:10},{id:2,eqId:1,fecha:'2026-02-02',ef:6},
          {id:3,eqId:2,fecha:'2026-02-03',ef:8},{id:4,eqId:3,fecha:'2026-02-05',ef:4}],
  combustible:[{eqId:1,fecha:'2026-02-05',gal:50,precio:6,tipoMov:'Salida'}],
  edpProveedores:[{eqId:2,estado:'Emitido',desde:'2026-01-21',hasta:'2026-02-20',
                   subtotal:1000,moneda:'DOLARES',numEdp:'EDP-001'}]
};

// ── Dobles de prueba ────────────────────────────────────────────────────────
let libro=null, ventana=null, avisos=[];
const XLSX={utils:{
    aoa_to_sheet:a=>({aoa:a}),
    book_new:()=>({hojas:[]}),
    book_append_sheet:(wb,ws,n)=>{wb.hojas.push({ws,n});},
    encode_range:r=>`R${r.s.r}C${r.s.c}:R${r.e.r}C${r.e.c}`
  },
  writeFile:(wb,nom)=>{libro={wb,nom};}
};
const ctx=vm.createContext({
  DB,console,Date,Math,Number,String,Object,Array,JSON,isNaN,parseFloat,parseInt,XLSX,
  localStorage:{getItem:()=>null,setItem(){},removeItem(){}},
  document:{getElementById:()=>null,addEventListener(){},querySelectorAll:()=>[]},
  toast:(m,err)=>avisos.push({m,err:!!err}),
  EMPRESA:{nombre:'ECOSERMO',logo:'img/logo.png'},
  window:{location:{href:'https://ecosermo.gdarei.com/index.html'},
    open:()=>{ventana={html:'',cerrada:false,
      document:{write(h){ventana.html+=h;},close(){ventana.cerrada=true;}},
      focus(){},print(){ventana.impreso=true;}};return ventana;}},
  // El código imprime desde un setTimeout (espera a que cargue el logo); aquí
  // se ejecuta al toque para poder comprobar que llegó a llamar a print()
  setTimeout:fn=>{try{fn();}catch(e){}return 0;},
  // El personal de este período: dos personas, para que el panel no salga vacío
  hhVentaPeriodo:()=>({filas:[
    {p:'Abel Rodríguez',cargo:'Operador Excavadora',trab:20,libre:4,dlt:2,tarifa:6091.40,venta:5200.10},
    {p:'Luis Cruz',cargo:'Operario',trab:18,libre:3,dlt:0,tarifa:5237.30,venta:3900.55}
  ]})
});
// El corte contable vive en js/utils.js desde que dejó de estar repetido en
// trece módulos. Se carga en el mismo contexto, igual que hace index.html:
// costcontrolAnual.js llama a gdarPeriodoDeMes() para armar los doce períodos.
const _uts=fs.readFileSync(R+'js/utils.js','utf8');
vm.runInContext('const EMPRESA_CORTE=21;'
  +_uts.slice(_uts.indexOf('// ══ EL PERÍODO CONTABLE'),_uts.indexOf('// ══ CLOCK ══')),
  ctx,{filename:'utils.js (periodo)'});

['js/costcontrol.js','js/costcontrolAnual.js','js/costcontrolExport.js'].forEach(f=>
  vm.runInContext(fs.readFileSync(R+f,'utf8'),ctx,{filename:f}));
vm.runInContext('_aSoles=(v,m)=>(m&&m!=="SOLES")?(+v||0)*3.75:(+v||0);',ctx);
// El período de la prueba: febrero 2026 (21-ene al 20-feb)
vm.runInContext(`_ccPeriodo=()=>({desde:'2026-01-21',hasta:'2026-02-20',label:'Febrero 2026',dias:31});`,ctx);
const ev=x=>vm.runInContext(x,ctx);

const val=c=>c&&typeof c==='object'&&'v' in c?c.v:c;
function excel(tab,modo,proy){
  libro=null;avisos=[];
  ev(`_ccTabActiva="${tab}";_ccTarifaModo="${modo}";_ccProyecto="${proy||''}";_ccaCache=null;_ccaAnio=2026`);
  ev('_ccxExcel()');
  if(!libro)return null;
  const aoa=libro.wb.hojas[0].ws.aoa;
  return{nom:libro.nom,hoja:libro.wb.hojas[0].n,aoa,
    filas:aoa.map(f=>f.map(val)),cols:libro.wb.hojas[0].ws['!cols']};
}
function pdf(tab,modo,proy){
  ventana=null;avisos=[];
  ev(`_ccTabActiva="${tab}";_ccTarifaModo="${modo}";_ccProyecto="${proy||''}";_ccaCache=null;_ccaAnio=2026`);
  ev('_ccxPdf()');
  return ventana;
}

console.log('\n== Excel · Equipos en Tarifa Full ==');
const EF=excel('equipos','full');
es('se generó el archivo',!!EF,true);
es('nombre con período',EF.nom,'Cost_Control_Equipos_2026-02-20.xlsx');
es('hoja "Equipos"',EF.hoja,'Equipos');
es('tres equipos + título + subtítulo + cabecera + totales',EF.filas.length,3+2+1+1);
const HDR=EF.filas[2];
es('la venta va abierta en dos',
  HDR.includes('VENTA EQUIPO')&&HDR.includes('VENTA COMBUSTIBLE'),true);
es('  y también el total de venta',HDR.includes('VENTA TOTAL'),true);
es('lleva las columnas planas para filtrar',
  ['TIPO','CÓDIGO','EQUIPO','SUBTIPO','CONTRATISTA','PROYECTO'].every(h=>HDR.includes(h)),true);
es('trae el margen en soles, que la pantalla no muestra',HDR.includes('MARGEN S/'),true);
es('y de dónde sale el costo',HDR.includes('ORIGEN COSTO'),true);
es('el subtítulo explica el contexto',/Período 21→20.*Tarifa Full/.test(EF.filas[1][0]),true);
es('tiene autofiltro',!!EF.aoa&&!!libro.wb.hojas[0].ws['!autofilter'],true);
es('anchos de columna para cada columna',EF.cols.length,HDR.length);

const iEq=HDR.indexOf('VENTA EQUIPO'),iCb=HDR.indexOf('VENTA COMBUSTIBLE'),
      iTo=HDR.indexOf('VENTA TOTAL'),iMa=HDR.indexOf('MARGEN S/');
const datos=EF.filas.slice(3,-1);
es('cada fila: venta equipo + venta comb. = venta total',
  datos.every(f=>Math.abs(f[iEq]+f[iCb]-f[iTo])<0.005),true);
const tot=EF.filas[EF.filas.length-1];
es('la fila de totales también cuadra',
  Math.abs(tot[iEq]+tot[iCb]-tot[iTo])<0.005,true);
es('  y suma las filas',Math.abs(tot[iTo]-datos.reduce((s,f)=>s+f[iTo],0))<0.005,true);
es('el margen total suma las filas',
  Math.abs(tot[iMa]-datos.reduce((s,f)=>s+f[iMa],0))<0.005,true);
es('el EDP se identifica por su número',
  datos.some(f=>String(f[HDR.indexOf('ORIGEN COSTO')]).includes('EDP-001')),true);
es('  y lo demás queda como estimado',
  datos.filter(f=>f[HDR.indexOf('ORIGEN COSTO')]==='Estimado').length,2);

console.log('\n== Excel · Equipos en Máq. Seca ==');
const ES=excel('equipos','seca');
const HS=ES.filas[2];
es('una columna menos',HS.length,HDR.length-1);
es('  no hay venta de combustible',HS.includes('VENTA COMBUSTIBLE'),false);
es('  la columna se llama solo VENTA',HS.includes('VENTA'),true);
es('todas las filas tienen el mismo ancho',
  ES.filas.every(f=>f.length===HS.length),true);
es('el subtítulo dice Máq. Seca',/Máq\. Seca/.test(ES.filas[1][0]),true);

console.log('\n== El filtro de proyecto viaja al archivo ==');
const EP=excel('equipos','full','EPY-001-26');
es('solo el equipo de ese proyecto',EP.filas.length,1+2+1+1);
es('  y es EXC-01',EP.filas[3][HDR.indexOf('CÓDIGO')],'EXC-01');
es('el nombre del archivo lo dice',/EPY-001-26\.xlsx$/.test(EP.nom),true);
es('  y el subtítulo también',/solo proyecto EPY-001-26/.test(EP.filas[1][0]),true);

console.log('\n== Excel · Personal ==');
const PE=excel('personal','full');
es('hoja "Personal"',PE.hoja,'Personal');
es('dos personas + cabeceras + total',PE.filas.length,2+3+1);
es('columnas',PE.filas[2].join(','),'PERSONA,CARGO,DÍAS,TARIFA MES,COSTO DÍA,VENTA');
es('la venta total suma las personas',
  Math.abs(PE.filas[PE.filas.length-1][5]-(5200.10+3900.55))<0.005,true);
es('los días incluyen libres y DLT (20+4+2)',PE.filas[3][2],26);

console.log('\n== Excel · Resumen ==');
const RE=excel('resumen','full');
es('hoja "Resumen"',RE.hoja,'Resumen');
es('separa equipos de personal',
  RE.filas.slice(3).some(f=>f[0]==='Equipos')&&RE.filas.slice(3).some(f=>f[0]==='Personal'),true);
es('cierra con la venta total',RE.filas[RE.filas.length-1][1],'Venta del período');
const iV=3;
const subEq=RE.filas.find(f=>f[1]==='Subtotal equipos');
const subHH=RE.filas.find(f=>f[1]==='Subtotal personal');
es('la venta total = equipos + personal',
  Math.abs(RE.filas[RE.filas.length-1][iV]-(subEq[iV]+subHH[iV]))<0.005,true);

console.log('\n== Excel · Anual delega en la matriz ==');
const AN=excel('anual','full');
es('hoja "Matriz Anual"',AN.hoja,'Matriz Anual');
es('nombre propio del año',AN.nom,'Cost_Control_Matriz_2026.xlsx');
es('trae los doce meses',
  ['ENERO','JUNIO','DICIEMBRE'].every(m=>AN.filas[2].includes(m)),true);

console.log('\n== PDF · se arma la ventana ==');
const P1=pdf('equipos','full');
es('se abrió la ventana',!!P1,true);
es('  y se cerró el documento',P1.cerrada,true);
es('  y se mandó a imprimir',!!P1.impreso,true);
es('A4 apaisado, que son once columnas',/size:A4 landscape/.test(P1.html),true);
es('lleva el logo de la empresa',/img\/logo\.png/.test(P1.html),true);
es('  con la ruta absoluta del sitio',/ecosermo\.gdarei\.com\/img\/logo\.png/.test(P1.html),true);
es('la cabecera se repite en cada hoja',/thead\{display:table-header-group\}/.test(P1.html),true);
es('las filas no se parten',/tr\{page-break-inside:avoid\}/.test(P1.html),true);
es('dice el contexto del cálculo',/Período 21→20.*Tarifa Full/.test(P1.html),true);
es('trae los KPI',/Margen bruto/.test(P1.html),true);
es('y la columna Venta Comb.',/Venta Comb\./.test(P1.html),true);
es('ninguna celda quedó rota',/undefined|NaN/.test(P1.html),false);
const trs=(P1.html.match(/<tr[ >]/g)||[]).length;
es('las filas abren y cierran parejas',trs,(P1.html.match(/<\/tr>/g)||[]).length);

console.log('\n== PDF · anchos de fila en las dos modalidades ==');
function anchos(html){
  const cuerpo=html.slice(html.indexOf('<tbody>'),html.indexOf('</tbody>'));
  const filas=[...cuerpo.matchAll(/<tr[\s\S]*?<\/tr>/g)].map(m=>m[0]);
  const w=tr=>[...tr.matchAll(/<td([^>]*)>/g)]
    .reduce((s,c)=>s+(+((c[1].match(/colspan="(\d+)"/)||[])[1])||1),0);
  return[...new Set(filas.map(w))];
}
const nTh=h=>((h.match(/<thead>[\s\S]*?<\/thead>/)||[''])[0].match(/<th[ >]/g)||[]).length;
es('Full: once columnas',nTh(P1.html),11);
es('  y todas las filas miden once',anchos(P1.html).join(','),'11');
const P2=pdf('equipos','seca');
es('Seca: diez columnas',nTh(P2.html),10);
es('  y todas las filas miden diez',anchos(P2.html).join(','),'10');

console.log('\n== PDF · las otras pestañas ==');
const P3=pdf('personal','full');
es('Personal va en vertical',/size:A4 portrait/.test(P3.html),true);
es('  con las dos personas',/Abel Rodríguez/.test(P3.html)&&/Luis Cruz/.test(P3.html),true);
es('  y sus filas parejas',anchos(P3.html).join(','),String(nTh(P3.html)));
const P4=pdf('resumen','full');
es('Resumen sale',/COST CONTROL — RESUMEN/.test(P4.html),true);
es('  con el cierre del período',/VENTA TOTAL DEL PERÍODO/.test(P4.html),true);
const P5=pdf('anual','full');
es('Anual va apaisado',/size:A4 landscape/.test(P5.html),true);
es('  con los doce meses',/>DIC</.test(P5.html),true);
es('  y los cinco conceptos',/05\.-Margen/.test(P5.html),true);
es('  sin celdas rotas',/undefined|NaN/.test(P5.html),false);

console.log('\n== Cuando no hay nada que exportar ==');
ev('_ccProyecto="NO-EXISTE";_ccaCache=null');
libro=null;avisos=[];ev('_ccTabActiva="equipos";_ccxExcel()');
es('no se genera archivo vacío',libro,null);
es('  y avisa',avisos.some(a=>a.err&&/No hay datos/.test(a.m)),true);
ventana=null;avisos=[];ev('_ccxPdf()');
es('el PDF tampoco se abre',ventana,null);
es('  y también avisa',avisos.some(a=>a.err),true);
ev('_ccProyecto=""');

console.log('\n== El export no reimplementa el cálculo ==');
const cx=fs.readFileSync(R+'js/costcontrolExport.js','utf8');
es('pide los datos al motor',/_ccCalcEq\(per,KEY\)/.test(cx),true);
es('  y el personal a _ccCalcHH',/_ccCalcHH\(per\)/.test(cx),true);
es('no recalcula el margen',/venta-costoProveedor/.test(cx),false);
es('  ni la venta de combustible',/t\.full\|\|0\)-\(\+t\.seca/.test(cx),false);
es('todo lleva prefijo _ccx o _CCX',
  [...cx.matchAll(/^(?:const|let|function)\s+([A-Za-z_$][\w$]*)/gm)]
    .map(m=>m[1]).every(n=>/^_[Cc][Cc][Xx]/.test(n)),true);

console.log('\n'+(mal?'X '+mal+' fallo(s)':'OK todo bien')+'  ·  '+ok+'/'+(ok+mal));
process.exit(mal?1:0);
