// Proveedores · Archivo de EDP.
// El documento se archiva al guardar el EDP y se reabre tal como se emitió.
// Aquí se prueban los filtros de la lista, el Excel y el enganche del
// archivado en js/edpProveedores.js.
const fs=require('fs'),vm=require('vm');
const R='c:/Users/LENOVO/OneDrive/Documents/GitHub/GDARSystem/';
let ok=0,mal=0;
const es=(l,g,e)=>{const b=String(g)===String(e);b?ok++:mal++;
  console.log((b?'  OK  ':'  MAL ')+l.padEnd(60)+'= '+g+(b?'':'  (esperado '+e+')'));};

const E=(id,num,eqId,prov,desde,hasta,total,abonar,doc,estado)=>({
  id,numEdp:num,eqId,proveedor:prov,desde,hasta,moneda:'SOLES',tarifaUn:'HM',
  cantEquipo:150,montoEquipo:total*0.8,montoDesc:total*0.05,subtotal:total*0.85,
  igv:total*0.15,total,detraccion:total*0.1,aAbonar:abonar,
  estado:estado||'Emitido',creadoPor:'Prueba',creadoEn:'2026-09-01T10:00:00Z',
  detalle:doc?{docUrl:'https://x.supabase.co/storage/v1/object/public/Equip_eco26/'+doc,
    docPath:doc,docFecha:'2026-09-01T10:00:00Z'}:{}
});

const DB={
  equipos:[
    {id:1,codigo:'VOL ECOP-001',nombre:'Volquete Volvo',tipo:'Línea Blanca'},
    {id:2,codigo:'EXC ECOP-003',nombre:'Excavadora',tipo:'Línea Amarilla'}
  ],
  edpProveedores:[
    E(1,'01',1,'GRUPO DELOPE','2026-06-21','2026-07-20',7080,6372,'edp/VOL_EDP01_1.html'),
    E(2,'02',1,'GRUPO DELOPE','2026-07-21','2026-08-20',7316,6584.4,'edp/VOL_EDP02_1.html'),
    E(3,'03',1,'GRUPO DELOPE','2026-08-21','2026-09-20',7500,6750,null,'Pagado'),
    E(4,'01',2,'VIA NORTE',   '2026-08-21','2026-09-20',9000,8100,'edp/EXC_EDP01_1.html')
  ]
};

const nodos={};
const nodo=id=>nodos[id]||(nodos[id]={id,innerHTML:'',textContent:'',value:'',style:{},focus(){}});
let abiertas=[],avisos=[],xls=null;
const XLSX={utils:{aoa_to_sheet:aoa=>({aoa}),book_new:()=>({}),
  book_append_sheet:(wb,ws,n)=>{xls={aoa:ws.aoa,hoja:n};}},
  writeFile:(wb,nom)=>{if(xls)xls.archivo=nom;}};
const ctx=vm.createContext({
  DB,console,Date,Math,Number,String,Object,Array,JSON,Set,XLSX,
  document:{getElementById:nodo,querySelector:()=>null,querySelectorAll:()=>[]},
  window:{open:u=>{abiertas.push(u);return{focus(){}};}},
  toast:(m,e)=>avisos.push({m,e:!!e}),buscarFoco(){},CU:{nombre:'Prueba'}
});
vm.runInContext(fs.readFileSync(R+'js/edpArchivo.js','utf8'),ctx,{filename:'edpArchivo.js'});
const ev=x=>vm.runInContext(x,ctx);
const nums=()=>ev('_edaFilas().map(r=>r.numEdp+"/"+r.eqId).join(",")');

console.log('\n== Sin filtros: todos, del más nuevo al más viejo ==');
es('los cuatro EDP',ev('_edaFilas().length'),4);
es('  ordenados por fin de período',nums(),'03/1,01/2,02/1,01/1');

console.log('\n== Filtro por proveedor ==');
ev('_edaProv="VIA NORTE"');
es('solo los suyos',nums(),'01/2');
ev('_edaProv="GRUPO DELOPE"');
es('los del otro proveedor',ev('_edaFilas().length'),3);
ev('_edaProv=""');

console.log('\n== Filtro por equipo ==');
ev('_edaEq="1"');
es('los del volquete',ev('_edaFilas().length'),3);
es('  ninguno de la excavadora',ev('_edaFilas().some(r=>+r.eqId===2)'),false);
ev('_edaEq=""');

console.log('\n== Filtro por período ==');
ev('_edaDesde="2026-08-21";_edaHasta="2026-09-20"');
es('los del corte de setiembre',nums(),'03/1,01/2');
ev('_edaDesde="2026-07-01";_edaHasta=""');
es('desde julio en adelante, los que se solapan',ev('_edaFilas().length'),4);
ev('_edaDesde="";_edaHasta="2026-07-20"');
es('hasta el 20/07 solo el primero',nums(),'01/1');
ev('_edaDesde="";_edaHasta=""');

console.log('\n== Solo con documento ==');
ev('_edaSoloDoc=true');
es('quedan tres',ev('_edaFilas().length'),3);
es('  el que no tiene documento se va',ev('_edaFilas().some(r=>r.numEdp==="03")'),false);
ev('_edaSoloDoc=false');

console.log('\n== Buscador ==');
ev('_edaQ="exc"');
es('encuentra por código de equipo',nums(),'01/2');
ev('_edaQ="delope"');
es('  y por proveedor',ev('_edaFilas().length'),3);
ev('_edaQ="PAGADO"');
es('  y por estado, sin importar mayúsculas',nums(),'03/1');
ev('_edaQ=""');

console.log('\n== Se combinan ==');
ev('_edaProv="GRUPO DELOPE";_edaSoloDoc=true;_edaDesde="2026-07-21"');
es('proveedor + con documento + desde julio',nums(),'02/1');
ev('_edaLimpiar()');
es('Limpiar los suelta todos',ev('_edaFilas().length'),4);
es('  y deja los filtros vacíos',ev('[_edaProv,_edaEq,_edaDesde,_edaHasta,_edaQ,_edaSoloDoc].join("|")'),'|||||false');

console.log('\n== Abrir el documento ==');
abiertas=[];avisos=[];
ev('_edaAbrirDoc(1)');
es('abre el documento archivado',abiertas.length,1);
es('  con su URL',/edp\/VOL_EDP01_1\.html$/.test(abiertas[0]),true);
ev('_edaAbrirDoc(3)');
es('el que no tiene archivo no abre nada',abiertas.length,1);
es('  y explica qué hacer',/vuelva a guardarlo/.test(avisos[avisos.length-1].m),true);

console.log('\n== La pantalla ==');
ev('rEdpArchivo()');
const H=nodo('edpArchivoBody').innerHTML;
es('se listan los cuatro',(H.match(/📄 Ver \/ PDF/g)||[]).length,3);
es('  y el que falta se marca',/sin archivar/.test(H),true);
es('KPI de cuántos tienen documento',/3 \/ 4/.test(H),true);
es('el filtro de proveedor trae los dos',/>GRUPO DELOPE</.test(H)&&/>VIA NORTE</.test(H),true);
es('el de equipo trae los dos códigos',/>VOL ECOP-001</.test(H)&&/>EXC ECOP-003</.test(H),true);
es('hay buscador',/id="edaBuscar"/.test(H),true);
es('  y botón de Excel',/_edaExportXls\(\)/.test(H),true);
es('ninguna celda rota',/undefined|NaN/.test(H),false);

console.log('\n== Excel ==');
xls=null;ev('_edaExportXls()');
es('se generó',!!xls,true);
es('  con 19 columnas',xls.aoa[2].length,19);
es('  una fila por EDP',xls.aoa.length,3+4+1);
es('  dice cuál está archivado',xls.aoa.find(f=>f[1]==='EXC ECOP-003')[16],'Archivado');
es('  y cuál no',xls.aoa.find(f=>f[0]==='03')[16],'Sin archivar');
es('  cierra con el total',xls.aoa[xls.aoa.length-1][0],'TOTAL');

console.log('\n== Enganche ==');
const ep=fs.readFileSync(R+'js/edpProveedores.js','utf8');
const ec=fs.readFileSync(R+'js/edpCostos.js','utf8');
const html=fs.readFileSync(R+'index.html','utf8');
const ea=fs.readFileSync(R+'js/edpArchivo.js','utf8');
es('el documento se arma aparte de la impresión',/function _edpDocumentoHtml\(autoPrint\)/.test(ep),true);
es('  imprimir lo reutiliza',/const doc=_edpDocumentoHtml\(true\)/.test(ep),true);
es('  y el archivado lo pide sin auto-imprimir',/_edpDocumentoHtml\(false\)/.test(ep),true);
es('al guardar se archiva',/const archivo=await _edpArchivarDoc\(/.test(ep),true);
es('  se sube a Storage',/\.upload\(path,blob,\{upsert:false,contentType:'text\/html/.test(ep),true);
es('  y queda en el detalle del EDP',/docUrl:archivo\?archivo\.docUrl/.test(ep),true);
es('  reemplazar un EDP borra su documento anterior',/remove\(\[prev\.detalle\.docPath\]\)/.test(ep),true);
es('si el archivado falla, el EDP igual se guarda',/EDP guardado, pero el documento no se archivó/.test(ep),true);
es('la pestaña existe en index',/id="edpTabBtn-archivo"/.test(html)&&/id="edpArchivoBody"/.test(html),true);
es('  y el router la contempla',/k==='archivo'/.test(ec),true);
es('index carga el módulo',/js\/edpArchivo\.js\?v=/.test(html),true);
es('existe el SQL del permiso de Storage',fs.existsSync(R+'sql/storage_edp_documentos.sql'),true);
const sqlSt=fs.readFileSync(R+'sql/storage_edp_documentos.sql','utf8');
es('  da permiso sobre el bucket que usa el archivado',/bucket_id = 'Equip_eco26'/.test(sqlSt),true);
es('  y el módulo sube a ese mismo bucket',/_EDP_FIRMA_BUCKET='Equip_eco26'/.test(ep),true);
es('  a la carpeta edp/',/`edp\/\$\{safe\(codigo\)\}/.test(ep),true);
es('todo lo nuevo lleva prefijo _eda',
  [...ea.matchAll(/^(?:const|let|function|async function)\s+([A-Za-z_$][\w$]*)/gm)].map(m=>m[1])
    .every(n=>/^_(eda|EDA)/.test(n)||n==='rEdpArchivo'),true);

console.log('\n'+(mal?'X '+mal+' fallo(s)':'OK todo bien')+'  ·  '+ok+'/'+(ok+mal));
process.exit(mal?1:0);
