const fs=require('fs');
const R='c:/Users/LENOVO/OneDrive/Documents/GitHub/GDARSystem/';
let LS={};
global.localStorage={getItem:k=>LS[k]==null?null:LS[k],setItem:(k,v)=>LS[k]=String(v),removeItem:k=>delete LS[k]};
global.toast=m=>{global._t=m;};global.openM=()=>{};global.closeM=()=>{};global.confirm=()=>true;
global.document={getElementById:()=>null};
global._PL_MESES=['','Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
global._plGenMes=8;global._plGenAnio=2026;
global.plMesCerrado=()=>false;let q=700;global.nidSeguro=()=>++q;global.supaUpsert=async()=>null;global.genPlanilla=()=>{};
global.DB={personal:[
  {id:1,dni:'76357995',ape:'CARHUACHIN VARGAS',nom:'FRANK MIGUEL',cargo:'MECANICO',sue:2500,asig:0,movilidad:0,banco:'',cuenta:'0011-0014-0260884195',est:'Activo'},
  {id:2,dni:'46465879',ape:'TORRES FALCON',nom:'SAMUEL YHOELIN',cargo:'OP. EXCAVADORA',sue:3000,asig:0,movilidad:0,banco:'',cuenta:'',est:'Activo'}
],planillaMes:[]};

const src=fs.readFileSync(R+'js/importCsv.js','utf8')+'\n'+fs.readFileSync(R+'js/importPlanilla.js','utf8')
  +'\n;global._iplAnalizar=_iplAnalizar;global._iplAsignar=_iplAsignar;global._iplPanelCols=_iplPanelCols;'
  +'global._iplSinMes=_iplSinMes;global._iplMesDelNombre=_iplMesDelNombre;global._iplOlvidarManual=_iplOlvidarManual;'
  +'global._setTexto=(t,n)=>{_iplTexto=t;_iplNombreArch=n;};'
  +'global._setDatos=d=>{_iplDatos=d};global._iplPreview=()=>{};global._getManual=()=>_IPL_MANUAL;';
eval(src);

let ok=0,mal=0;
const es=(l,g,e)=>{const b=String(g)===String(e);b?ok++:mal++;
  console.log((b?'  OK  ':'  MAL ')+l.padEnd(52)+'= '+g+(b?'':'  (esperado '+e+')'));};

// Los encabezados reales del archivo del usuario
const CSV=[
 'N\u00b0;DNI;APELLIDOS Y NOMBRES;CARGO;FECHA DE NACIMIENTO;REMUNERACION JULIO;ASIG FAM JULIO;MOVILIDAD JULIO;COND ALTURA;AJUSTE SALARIAL;HRS EXT 25%;HRS EXT 35%;DSCTO MERCANTIL;REINTEGRO REMUNERACION JUNIO;BANCO;CCI;CUENTA;CORREO ELECTRONICO',
 '1;76357995;CARHUACHIN VARGAS, FRANK MIGUEL;MECANICO;01/01/1990;3.200,00;SI;180,00;250,00;90,00;6;2;45,00;120,00;BCP;002-11814;001108140268884195;a@b.com',
 '2;46465879;TORRES FALCON, SAMUEL YHOELIN;OP. EXCAVADORA;02/02/1991;3.500,00;NO;200,00;300,00;;4;;;;BCP;002-3109;31092705565075;c@d.com'
].join('\r\n');

console.log('\n== El mes pegado al nombre ya no estorba ==');
es('"REMUNERACION JULIO" -> REMUNERACION',_iplSinMes('REMUNERACION JULIO'),'REMUNERACION');
es('"MOVILIDAD JULIO 2026" -> MOVILIDAD',_iplSinMes('MOVILIDAD JULIO 2026'),'MOVILIDAD');
es('"REINTEGRO REMUNERACION JUNIO" se pela igual',_iplSinMes('REINTEGRO REMUNERACION JUNIO'),'REINTEGRO REMUNERACION');
es('"CARGO" no se toca',_iplSinMes('CARGO'),'CARGO');

_setTexto(CSV,'JULIO 2026 - Tareo - PAGO.csv');
let D=_iplAnalizar(CSV);
const tiene=(arr,k)=>arr.some(c=>c.campo===k);
const libre=n=>D.libres.some(c=>c.col===n);

console.log('\n== Ahora reconoce lo que antes ignoraba ==');
es('REMUNERACION JULIO -> sueldo base',tiene(D.ficha,'sue'),true);
es('ASIG FAM JULIO -> asignacion familiar',tiene(D.ficha,'asig'),true);
es('MOVILIDAD JULIO -> movilidad',tiene(D.ficha,'movilidad'),true);
es('COND ALTURA -> bonif. altura',tiene(D.mes,'bAltura'),true);
es('HRS EXT 25% -> H.E. 25',tiene(D.mes,'he25'),true);
es('HRS EXT 35% -> H.E. 35',tiene(D.mes,'he35'),true);
es('CUENTA gana sobre CCI',D.enc[D.map.f_cuenta],'CUENTA');

console.log('\n== Lo que no adivina queda listo para asignar a mano ==');
es('DSCTO MERCANTIL esta en la lista',libre('DSCTO MERCANTIL'),true);
es('AJUSTE SALARIAL tambien',libre('AJUSTE SALARIAL'),true);
es('con un ejemplo de su contenido',(D.libres.find(c=>c.col==='DSCTO MERCANTIL')||{}).muestra,'45,00');
// El correo ya es un campo de la ficha: dejó de estar suelto
es('CORREO ELECTRONICO ahora se reconoce',tiene(D.ficha,'email'),true);
es('  y por eso ya no esta suelto',libre('CORREO ELECTRONICO'),false);

console.log('\n== Asignar a mano, y que se recuerde ==');
_setDatos(D);
_iplAsignar('DSCTO MERCANTIL','m_otrosDesc');
_iplAsignar('AJUSTE SALARIAL','m_reintegro');
D=_iplAnalizar(CSV);
es('DSCTO MERCANTIL -> otros descuentos',tiene(D.mes,'otrosDesc'),true);
es('AJUSTE SALARIAL -> reintegro',tiene(D.mes,'reintegro'),true);
es('ya no aparecen como sueltas',libre('DSCTO MERCANTIL')||libre('AJUSTE SALARIAL'),false);
es('quedan listadas como manuales',D.manual.length,2);
es('y guardadas para el proximo archivo',!!LS._iplManual,true);
const J=D.listas.find(x=>x.p.id===1);
es('el descuento entra con su valor',(J.camM.find(c=>c.campo==='otrosDesc')||{}).nuevo,45);
es('y el reintegro tambien',(J.camM.find(c=>c.campo==='reintegro')||{}).nuevo,90);

console.log('\n== Reasignar y soltar ==');
_setDatos(D);
_iplAsignar('DSCTO MERCANTIL','m_cts');
D=_iplAnalizar(CSV);
es('ahora va a CTS',tiene(D.mes,'cts'),true);
es('y ya no a otros descuentos',tiene(D.mes,'otrosDesc'),false);
_setDatos(D);
_iplAsignar('DSCTO MERCANTIL','');
D=_iplAnalizar(CSV);
es('soltarla la devuelve a las sueltas',libre('DSCTO MERCANTIL'),true);
es('queda una sola asignacion manual',D.manual.length,1);

console.log('\n== Una asignacion manual le gana a la automatica ==');
_setDatos(D);
_iplAsignar('COND ALTURA','m_bono');
D=_iplAnalizar(CSV);
es('COND ALTURA pasa a Bono',tiene(D.mes,'bono'),true);
es('y bonif. altura queda libre',tiene(D.mes,'bAltura'),false);
es('sin que la columna se cuente dos veces',libre('COND ALTURA'),false);
_setDatos(D);_iplAsignar('COND ALTURA','');D=_iplAnalizar(CSV);

console.log('\n== Avisa si el archivo es de otro mes ==');
es('detecta JULIO en el nombre',_iplMesDelNombre('JULIO 2026 - Tareo - PAGO.csv'),7);
es('y el destino es agosto',D.per.mes,8);
es('-> hay que advertir',D.mesArch!==D.per.mes,true);
es('un nombre sin mes no inventa',_iplMesDelNombre('planilla_final.csv'),0);

console.log('\n== El panel se arma sin romperse ==');
const h=_iplPanelCols(D);
es('lista las columnas sueltas',/DSCTO MERCANTIL/.test(h),true);
es('trae el selector de destino',/_iplAsignar/.test(h),true);
es('ofrece los campos de la ficha',/f_sue/.test(h),true);
es('y los del mes',/m_adelanto/.test(h),true);

console.log('\n== Olvidar todo lo asignado ==');
_setDatos(D);
_iplOlvidarManual();
es('la memoria queda vacia',Object.keys(_getManual()).length,0);
D=_iplAnalizar(CSV);
es('AJUSTE SALARIAL vuelve a estar suelta',libre('AJUSTE SALARIAL'),true);
es('pero lo automatico sigue funcionando',tiene(D.ficha,'sue'),true);

console.log('\n'+(mal?'X '+mal+' fallo(s)':'OK todo bien')+'  ·  '+ok+'/'+(ok+mal));
process.exit(mal?1:0);
