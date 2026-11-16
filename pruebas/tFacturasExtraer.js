// Facturas / Boletas de Pago: subir una factura NO la marca como «✓ Extraído».
// Solo cuenta lo extraído con el botón 🔍 Extraer de esa misma factura.
const fs=require('fs'),path=require('path'),vm=require('vm');
const src=fs.readFileSync(path.join(__dirname,'..','js','requerimientos.js'),'utf8');
const trozo=(ini,fin)=>{const a=src.indexOf(ini),b=src.indexOf(fin,a);if(a<0||b<0)throw new Error('no se encontró '+ini);return src.slice(a,b);};
const ctx={DB:{}};vm.createContext(ctx);
vm.runInContext(trozo('function _fpNumNorm(','// ── Catálogo de códigos de reembolsable'),ctx);
let ok=0,mal=0;
const es=(t,v,e)=>{const b=JSON.stringify(v)===JSON.stringify(e);b?ok++:mal++;console.log(`  ${b?'OK ':'MAL'} ${t.padEnd(64)}= ${JSON.stringify(v)}${b?'':'  (esperado '+JSON.stringify(e)+')'}`);};
const ya=f=>vm.runInContext('_fpYaExtraida(__f)',Object.assign(ctx,{__f:f}));

console.log('\n== ¿Ya extraída? ==');
const F={id:5,num:'FE02-4359',prov:'MEZA',ruc:'20111111111'};
ctx.DB.reembolsables=[];
es('recién subida, sin ítems: botón Extraer',ya(F),false);
ctx.DB.reembolsables=[{facturaId:9,serie:'FE02',correlativo:'4359',ruc:'20999999999',proveedor:'OTRO SAC'}];
es('mismo N° pero de otro proveedor: NO cuenta',ya(F),false);
ctx.DB.reembolsables=[{facturaId:null,serie:'FE02',correlativo:'4359',ruc:'20999999999',proveedor:'OTRO SAC'}];
es('ítem antiguo sin factura, mismo N°, otro RUC: NO cuenta',ya(F),false);
ctx.DB.reembolsables=[{facturaId:5,serie:'E001',correlativo:'12',ruc:'20999999999',proveedor:'OTRO SAC'}];
es('id reutilizado de una factura borrada (otro N° y proveedor): NO',ya(F),false);
ctx.DB.reembolsables=[{facturaId:5,serie:'FE02',correlativo:'00004359',ruc:'20111111111',proveedor:'MEZA'}];
es('extraída con el botón (mismo id, N° con ceros): ✓ Extraído',ya(F),true);
ctx.DB.reembolsables=[{facturaId:5,serie:'E002',correlativo:'4359',ruc:'20111111111',proveedor:'MEZA'}];
es('  aunque el N° leído del PDF difiera (E002 vs FE02), mismo RUC',ya(F),true);
ctx.DB.reembolsables=[{facturaId:null,serie:'FE02',correlativo:'4359',ruc:'',proveedor:'MEZA'}];
es('ítem antiguo sin factura, mismo N° y proveedor: ✓',ya(F),true);

console.log('\n== Id de una factura nueva ==');
ctx.DB.facturasPago=[{id:1},{id:2}];
ctx.DB.reembolsables=[{facturaId:3}];   // ítems de la factura 3, ya borrada
ctx.DB.nx={fpago:3};
es('no reutiliza el id de una factura borrada con ítems',vm.runInContext('_fpNuevoId()',ctx),4);
es('  y deja el contador adelante',ctx.DB.nx.fpago,5);

console.log('\n== Conexión ==');
es('al guardar una factura nueva se usa el id seguro',/const newFpId=_fpNuevoId\(\);/.test(src),true);
es('guardar no llama a extraerFactura',/function gFPago[\s\S]*?\n\}/.exec(src)[0].includes('extraerFactura'),false);

console.log(`\n${mal?'✗ '+mal+' FALLAS':'OK todo bien'}  ·  ${ok}/${ok+mal}`);
process.exitCode=mal?1:0;
