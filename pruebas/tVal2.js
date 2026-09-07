const fs=require('fs');
const R='c:/Users/LENOVO/OneDrive/Documents/GitHub/GDARSystem/';
const campos={};
const mk=id=>campos[id]={id,value:'',style:{},innerHTML:''};
['rpValoriza','rpCondicion'].forEach(mk);
global.document={getElementById:id=>campos[id]||null};

// Solo el bloque de funciones de valoriza, sin arrastrar toda la pantalla
const pd=fs.readFileSync(R+'js/partesDiarios.js','utf8');
const ini=pd.indexOf('// A qui');
const fin=pd.indexOf('function calcHoras');
eval(pd.slice(ini,fin)
  +'\n;global._pdValoriza=_pdValoriza;global._pdValorizaOk=_pdValorizaOk;'
  +'global._pdResetValoriza=_pdResetValoriza;global._PD_VALORIZA=_PD_VALORIZA;');

// La regla del EDP de proveedores
const ep=fs.readFileSync(R+'js/edpProveedores.js','utf8');
const i2=ep.indexOf('function edpValeProveedor');
eval(ep.slice(i2,ep.indexOf('}',ep.indexOf('return v===')) + 1)
  +'\n;global.edpValeProveedor=edpValeProveedor;');

let ok=0,mal=0;
const es=(l,g,e)=>{const b=String(g)===String(e);b?ok++:mal++;
  console.log((b?'  OK  ':'  MAL ')+l.padEnd(54)+'= '+g+(b?'':'  (esperado '+e+')'));};

console.log('\n== Arriba y a la derecha, solo ==');
const html=fs.readFileSync(R+'index.html','utf8');
const tab1=html.indexOf('id="tabContent1"');
const val=html.indexOf('id="rpValoriza"');
const eqp=html.indexOf('Datos del Equipo');
const cond=html.indexOf('id="rpCondicion"');
es('está dentro del primer tab',val>tab1,true);
es('antes de Datos del Equipo',val<eqp,true);
es('  y bastante antes de Condición',val<cond,true);
es('alineado a la derecha',/justify-content:flex-end[\s\S]{0,220}id="rpValoriza"/.test(html),true);
es('él solo en su fila',(html.slice(tab1,eqp).match(/class="fg"/g)||[]).length,1);
es('ya no está en Turno y Guardia',html.slice(cond,cond+400).includes('rpValoriza'),false);
es('sigue teniendo las tres opciones',
   [...((html.match(/<select id="rpValoriza"[^>]*>([\s\S]*?)<\/select>/)||[])[1]||'').matchAll(/<option>([^<]+)</g)].map(m=>m[1]).join(','),
   'Ambos,Cliente,Proveedor');

console.log('\n== Siempre vuelve a "Ambos" ==');
campos.rpValoriza.value='Proveedor';
_pdResetValoriza();
es('el reinicio lo deja en Ambos',campos.rpValoriza.value,'Ambos');
campos.rpValoriza.value='Cliente';
_pdResetValoriza();
es('desde cualquier valor',campos.rpValoriza.value,'Ambos');
es('se reinicia al abrir un parte nuevo',/_editingParteId = null;[\s\S]{0,200}_pdResetValoriza\(\)/.test(pd),true);
es('y al terminar de grabar',/closeM\('mReporte'\);\s*\r?\n\s*_pdResetValoriza\(\)/.test(pd),true);
es('  pero NO al abrir uno para editar',
   /rpVal\.value=_pdValorizaOk\(p\.valoriza\)\?p\.valoriza:'Ambos'/.test(pd),true);

console.log('\n== Qué entra en la valorización del proveedor ==');
es('"Proveedor" entra',edpValeProveedor({valoriza:'Proveedor'}),true);
es('"Ambos" entra',edpValeProveedor({valoriza:'Ambos'}),true);
es('"Cliente" NO entra',edpValeProveedor({valoriza:'Cliente'}),false);
es('un parte sin marca entra (historicos)',edpValeProveedor({}),true);
es('  y el vacío también',edpValeProveedor({valoriza:''}),true);
es('un valor no reconocido no entra',edpValeProveedor({valoriza:'basura'}),false);

console.log('\n== El filtro está puesto donde se leen los partes ==');
const ep2=fs.readFileSync(R+'js/edpProveedores.js','utf8');
es('_edpHoras filtra',/DB\.partes\|\|\[\]\)\.filter\([\s\S]{0,140}edpValeProveedor\(p\)/.test(ep2),true);
// Hay dos lecturas de DB.partes: la que alimenta el cálculo (filtrada) y la
// del contador de excluidos, que a propósito los mira todos.
es('dos lecturas de partes, ni una más',(ep2.match(/DB\.partes/g)||[]).length,2);
es('  la otra es la que cuenta los excluidos',
   /function edpFueraProveedor[\s\S]{0,200}DB\.partes/.test(ep2),true);

console.log('\n== Cuentas con y sin filtro ==');
const partes=[
  {eqId:1,fecha:'2026-07-01',ef:10,valoriza:'Ambos'},
  {eqId:1,fecha:'2026-07-02',ef:8, valoriza:'Proveedor'},
  {eqId:1,fecha:'2026-07-03',ef:9, valoriza:'Cliente'},
  {eqId:1,fecha:'2026-07-04',ef:7}                        // antiguo, sin marca
];
const paraProv=partes.filter(edpValeProveedor);
es('de 4 partes, entran 3',paraProv.length,3);
es('  solo queda fuera el del cliente',partes.length-paraProv.length,1);
es('horas del proveedor: 10+8+7',paraProv.reduce((s,p)=>s+p.ef,0),25);
es('  contra 34 si no se filtrara',partes.reduce((s,p)=>s+p.ef,0),34);

console.log('\n'+(mal?'X '+mal+' fallo(s)':'OK todo bien')+'  ·  '+ok+'/'+(ok+mal));
process.exit(mal?1:0);
