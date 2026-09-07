const fs=require('fs');
const R='c:/Users/LENOVO/OneDrive/Documents/GitHub/GDARSystem/';
global.localStorage={getItem:()=>null,setItem:()=>{},removeItem:()=>{}};
const nodos={};
const mk=id=>nodos[id]={id,innerHTML:'',style:{},value:'',textContent:'',
  classList:{contains:()=>false,add(){},remove(){}}};
['tbFPago','fpagoKpis','fpProyFilterMain','fpNum','fpProv','fpRuc','fpObs','fpEdp','fpEdpCobrado',
 'fpTipoCobro','fpEst','fpMoneda','fpMonto','fpIgv','fpTotal','fpReq','fpFecha','fpTipo',
 'fpMonedaOtro','fpMonedaOtroDiv','fpPdfPreview','fpMontoLbl','fpIgvLbl','fpTotalLbl'].forEach(mk);
global.document={getElementById:id=>nodos[id]||null,querySelector:()=>null,querySelectorAll:()=>[]};
global.window={location:{href:'https://ecosermo.gdarei.com/'},open:()=>null};
let toasts=[];global.toast=m=>toasts.push(m);
global.openM=()=>{};global.closeM=()=>{};global.confirm=()=>true;
global.isModuleReadOnly=()=>false;global.nid=()=>1;
const guardados=[];global.syncSheet=(a,d)=>guardados.push(a+':'+d.id+':'+(d.edpCobrado===null?'NULL':d.edpCobrado));
global.supaUpsert=async()=>null;global.supaDelete=async()=>null;
global.fmt=n=>'S/ '+Number(n||0).toFixed(2);
global.bge=v=>'<span class="badge">'+v+'</span>';
global.verTrazReq=()=>{};global.rReq=()=>{};global.rReembolsables=()=>{};
global.refreshSelects=()=>{};global.filtrarFpReq=()=>{};
global._fpEnRango=()=>true;global._fpYaExtraida=()=>false;
global.DB={facturasPago:[],requerimientos:[],proyectos:[],materiales:[],reembolsables:[]};

const src=fs.readFileSync(R+'js/requerimientos.js','utf8')
 +'\n;global.rFPago=rFPago;global.fpSetEdpCobrado=fpSetEdpCobrado;'
 +'global._fpExportXls=_fpExportXls;global.editFPago=editFPago;';
eval(src);

let ok=0,mal=0;
const es=(l,g,e)=>{const b=String(g)===String(e);b?ok++:mal++;
  console.log((b?'  OK  ':'  MAL ')+l.padEnd(58)+'= '+g+(b?'':'  (esperado '+e+')'));};

// ── Las facturas de la captura ────────────────────────────────────────────
const F=(id,num,tot,cobrado)=>({id,num,tipo:'Factura',fecha:'2026-05-22',
  prov:'IMPLEMENTOS PERU S.A.C.',reqId:null,moneda:'Soles (S/)',monto:tot,igv:0,total:tot,
  est:'Recibido',tipoCobro:'Reembolsable',edp:null,edpCobrado:cobrado||null,
  pdfUrl:'x.pdf',obs:''});
DB.facturasPago=[
  F(1,'F035-82609',3784.40,'EDP N° 03'),   // ya cobrada
  F(2,'F035-83347',390.60,null),           // pendiente
  F(3,'F035-88289',6488.01,null)
];

rFPago();
const html=nodos.tbFPago.innerHTML;

console.log('\n== La columna aparece y se puede escribir ==');
es('hay 3 campos de cobro, uno por factura',(html.match(/fpSetEdpCobrado/g)||[]).length,3);
es('la cobrada muestra su EDP',/value="EDP N° 03"/.test(html),true);
es('  y se pinta en verde',/value="EDP N° 03"[^>]*#10b981/s.test(html),true);
es('la pendiente sale vacía',(html.match(/value=""/g)||[]).length,2);
es('  con el guión de marcador',/placeholder="—"/.test(html),true);
es('el campo explica qué es',/ya se cobró al cliente/.test(html),true);

console.log('\n== Marcar una factura como cobrada ==');
fpSetEdpCobrado(2,'EDP N° 05');
es('quedó en el registro',DB.facturasPago[1].edpCobrado,'EDP N° 05');
es('  y se guardó en la base',guardados.pop(),'saveFacturaPago:2:EDP N° 05');
es('  avisa al usuario',toasts.pop(),'✓ Cobrado en EDP N° 05');
es('no tocó a las demás',DB.facturasPago[2].edpCobrado,'null');

console.log('\n== Quitar la marca ==');
fpSetEdpCobrado(2,'   ');
es('la deja sin cobrar',DB.facturasPago[1].edpCobrado,'null');
es('  guarda el vacío como null',guardados.pop(),'saveFacturaPago:2:NULL');
es('  y lo dice',toasts.pop(),'Marca de cobro quitada');

console.log('\n== No guarda de más ==');
const antes=guardados.length;
fpSetEdpCobrado(1,'EDP N° 03');      // el mismo valor que ya tenía
es('escribir lo mismo no genera guardado',guardados.length,antes);
fpSetEdpCobrado(999,'EDP N° 09');    // factura que no existe
es('un id inexistente no rompe nada',guardados.length,antes);

console.log('\n== Los espacios sobrantes se recortan ==');
fpSetEdpCobrado(3,'  EDP N° 07  ');
es('se guarda limpio',DB.facturasPago[2].edpCobrado,'EDP N° 07');

console.log('\n== Una comilla en el texto no rompe la tabla ==');
fpSetEdpCobrado(3,'EDP "especial"');
rFPago();
const h2=nodos.tbFPago.innerHTML;
es('la comilla se escapa',/value="EDP &quot;especial&quot;"/.test(h2),true);
es('  y el input sigue entero',(h2.match(/fpSetEdpCobrado/g)||[]).length,3);

console.log('\n== El modal lee y escribe el campo ==');
DB.facturasPago[0].edpCobrado='EDP N° 03';
editFPago(1);
es('lo carga al abrir el comprobante',nodos.fpEdpCobrado.value,'EDP N° 03');
es('  sin pisar el EDP del gasto',nodos.fpEdp.value,'');

console.log('\n== Las columnas cuadran con el encabezado ==');
const encabezados=fs.readFileSync(R+'index.html','utf8')
  .split('\n').find(l=>l.includes('<th>Tipo Cobro</th>'));
const nTh=(encabezados.match(/<th[ >]/g)||[]).length;   // [ >] evita contar <thead>
const fila1=html.split('<tr>')[1]||'';
const nTd=(fila1.match(/<td/g)||[]).length;
es('el encabezado tiene 13 columnas (12 + la nueva)',nTh,13);
es('  y cada fila también',nTd,13);
es('"EDP cobrado" está en el encabezado',/EDP<br>cobrado/.test(encabezados),true);
es('  justo después de EDP',encabezados.indexOf('EDP<br>cobrado')>encabezados.indexOf('<th>EDP</th>'),true);

console.log('\n== El Excel se lo lleva ==');
let hoja=null;
global.XLSX={utils:{aoa_to_sheet:d=>{hoja=d;return{};},book_new:()=>({}),book_append_sheet:()=>{}},
  writeFile:()=>{}};
_fpExportXls();
es('la cabecera lo incluye',hoja[0][hoja[0].length-1],'EDP cobrado');
es('  con el dato de la factura cobrada',hoja[1][hoja[1].length-1],'EDP N° 03');
es('  y vacío en la que no se cobró',hoja[2][hoja[2].length-1],'');
es('cabecera y filas tienen el mismo ancho',hoja[0].length===hoja[1].length,true);

console.log('\n'+(mal?'X '+mal+' fallo(s)':'OK todo bien')+'  ·  '+ok+'/'+(ok+mal));
process.exit(mal?1:0);
