// Almacén · Kardex: «Último stock», multi-filtro de materiales y stock con
// todo el historial (no solo el período elegido arriba).
const fs=require('fs'),vm=require('vm');
const R='c:/Users/LENOVO/OneDrive/Documents/GitHub/GDARSystem/';
let ok=0,mal=0;
const es=(l,g,e)=>{const b=String(g)===String(e);b?ok++:mal++;
  console.log((b?'  OK  ':'  MAL ')+l.padEnd(62)+'= '+g+(b?'':'  (esperado '+e+')'));};

// Historial completo en la base. Hoy (simulado) = 2026-10-15; el período
// «60 días» arranca el 2026-08-16.
const HOY=new Date('2026-10-15T12:00:00');
const BASE=[
  {id:1,fecha:'2026-03-01',codigo:'INS-0069',nombre:'SikaRapid 3PE',unidad:'Galón',tipo:'E',cant:30,codProy:'EPY-004',proyecto:'Relavera R3'},
  {id:2,fecha:'2026-04-10',codigo:'INS-0069',nombre:'SikaRapid 3PE',unidad:'Galón',tipo:'S',cant:5,codProy:'EPY-004',proyecto:'Relavera R3'},
  {id:3,fecha:'2026-05-02',codigo:'EPP-0001',nombre:'Guantes de nitrilo',unidad:'Par',tipo:'E',cant:100,codProy:'EPY-004',proyecto:'Relavera R3'},
  {id:4,fecha:'2026-05-03',codigo:'EPP-0001',nombre:'Guantes de nitrilo',unidad:'Par',tipo:'E',cant:20,codProy:'EPY-002',proyecto:'Otro proyecto'},
  {id:5,fecha:'2026-09-01',codigo:'INS-0069',nombre:'SikaRapid 3PE',unidad:'Galón',tipo:'S',cant:3,codProy:'EPY-004',proyecto:'Relavera R3'},
  {id:6,fecha:'2026-09-20',codigo:'EPP-0001',nombre:'Guantes de nitrilo',unidad:'Par',tipo:'S',cant:40,codProy:'EPY-004',proyecto:'Relavera R3'},
  {id:7,fecha:'2026-10-01',codigo:'MAT-0100',nombre:'Cemento tipo I',unidad:'Bolsa',tipo:'E',cant:10,codProy:'EPY-004',proyecto:'Relavera R3'},
  {id:8,fecha:'2026-10-02',codigo:'MAT-0100',nombre:'Cemento tipo I',unidad:'Bolsa',tipo:'S',cant:10,codProy:'EPY-004',proyecto:'Relavera R3'},
  {id:9,fecha:'2026-10-03',codigo:'INS-0070',nombre:'Sikadur 32',unidad:'Kit',tipo:'S',cant:2,codProy:'EPY-004',proyecto:'Relavera R3'}
];
const snake=r=>({id:r.id,fecha:r.fecha,codigo:r.codigo,nombre:r.nombre,unidad:r.unidad,tipo:r.tipo,cant:r.cant,cod_proy:r.codProy,proyecto:r.proyecto});
// Lo cargado con «60 días»: solo desde el 2026-08-16
const DB={almacen:BASE.filter(r=>r.fecha>='2026-08-16').map(r=>({...r})),proyectos:[],tipoMaterial:[],requerimientos:[]};

const nodos={};
const Nodo=id=>({id,innerHTML:'',textContent:'',value:'',checked:false,disabled:false,style:{},options:[1],
  appendChild(){},remove(){},focus(){},contains:()=>false,getBoundingClientRect:()=>({left:10,bottom:50}),querySelector(){return null;}});
const nodo=id=>nodos[id]||(nodos[id]=Nodo(id));
nodo('almPeriodoSel').value='60';
let pedidas=0,falla=false;
class FechaFija extends Date{constructor(...a){super(...(a.length?a:[HOY.getTime()]));}static now(){return HOY.getTime();}}
const ctx=vm.createContext({
  DB,console,Math,Number,String,Object,Array,JSON,Set,Map,isFinite,parseFloat,Promise,setTimeout,clearTimeout,
  Date:FechaFija,
  document:{getElementById:nodo,createElement:()=>Nodo('pop'),body:{appendChild(){}},addEventListener(){},removeEventListener(){},querySelector:()=>null},
  window:{innerWidth:1400},
  toast(){},fmtN:n=>String(Math.round(+n*100)/100),bge:x=>String(x||''),
  REQ_PREFIXES:{},
  supa:{from:t=>({select:cols=>({order:()=>({range:async(a,b)=>{pedidas++;
    if(falla)return {data:null,error:{message:'Failed to fetch'}};
    return {data:BASE.slice(a,b+1).map(snake),error:null};}})})})},
  toCamel:o=>{const r={};for(const[k,v]of Object.entries(o))r[k.replace(/_([a-z])/g,(_,c)=>c.toUpperCase())]=v??'';return r;}
});
vm.runInContext(fs.readFileSync(R+'js/almacen.js','utf8'),ctx,{filename:'almacen.js'});
const ev=x=>vm.runInContext(x,ctx);
const espera=()=>new Promise(r=>setImmediate(r));

(async()=>{
console.log('\n== El problema: el stock con solo el período cargado ==');
es('sin historial, el Sika suma solo -3 (salida de setiembre)',ev('getStock()["INS-0069"].stock'),-3);
es('el período «60 días» empieza el 2026-08-16',ev('_almDesdePeriodo()'),'2026-08-16');
es('mientras tanto lo avisa',ev('_almAvisoHistorial()').includes('calculando'),true);

console.log('\n== Con el historial completo ==');
ev('rAlm()');await espera();await espera();
es('se pide el historial una vez',pedidas,1);
es('Sika: 30 − 5 − 3 = 22',ev('getStock()["INS-0069"].stock'),22);
es('guantes: 100 + 20 − 40 = 80',ev('getStock()["EPP-0001"].stock'),80);
es('no duplica lo que ya está en el período',ev('_almMovsCompletos().length'),9);
es('ya no hay aviso',ev('_almAvisoHistorial()'),'');
const T=nodo('tbAlm').innerHTML;
es('la columna Stock del Kardex usa el saldo real',/>22<\/td>/.test(T)&&!/>-3<\/td>/.test(T),true);
es('el saldo por movimiento parte del saldo anterior',ev('_almSaldoMap()[6]'),80);
ev('rAlm()');await espera();
es('no lo vuelve a pedir',pedidas,1);

console.log('\n== Lo de esta sesión manda dentro del período ==');
ev('DB.almacen.push({id:10,fecha:"2026-10-15",codigo:"INS-0069",nombre:"SikaRapid 3PE",unidad:"Galón",tipo:"S",cant:2,codProy:"EPY-004",proyecto:"Relavera R3"})');
es('una salida nueva descuenta',ev('getStock()["INS-0069"].stock'),20);
ev('DB.almacen=DB.almacen.filter(r=>r.id!==6)');
es('un movimiento borrado del período deja de contar',ev('getStock()["EPP-0001"].stock'),120);
ev('DB.almacen.push({...'+JSON.stringify(BASE[5])+'});DB.almacen=DB.almacen.filter(r=>r.id!==10)');
es('con «Todo el historial» no hace falta pedir nada',(nodo('almPeriodoSel').value='0',ev('_almDesdePeriodo()')),'');
nodo('almPeriodoSel').value='60';

console.log('\n== 📦 Último stock ==');
ev('_almToggleStock()');
let H=nodo('tbAlm').innerHTML;
es('una fila por material',(H.match(/<tr>/g)||[]).length,4);
es('cabecera propia',/Stock actual/.test(nodo('almThead').innerHTML)&&/Último movimiento/.test(nodo('almThead').innerHTML),true);
es('stock actual del Sika',/SikaRapid 3PE<\/strong>[\s\S]*?>22<\/td>/.test(H),true);
es('con su último movimiento',/2026-09-01<\/span> <span class="badge b-red">/.test(H),true);
es('stock cero en rojo',/Cemento tipo I[\s\S]*?color:#ef4444">0</.test(H),true);
es('el resumen cuenta con stock, en cero y negativos',/2 con stock[\s\S]*1 en cero[\s\S]*1 negativo/.test(nodo('almPagNav').innerHTML),true);
es('el botón queda encendido',nodo('almBtnStock').style.background,'#f59e0b');
es('movimiento y fecha no aplican: se deshabilitan',nodo('almFiltTipo').disabled&&nodo('almFiltFecha').disabled,true);
es('aparece «Ocultar stock cero»',nodo('almOcultarCeroWrap').style.display,'');
ev('_almSetOcultarCero(true)');
es('ocultar stock cero quita el cemento',/Cemento/.test(nodo('tbAlm').innerHTML),false);
ev('_almSetOcultarCero(false)');

console.log('\n== Filtro de proyecto (A1: stock de ese proyecto) ==');
ev('_almFiltProy="EPY-002";rAlm()');
H=nodo('tbAlm').innerHTML;
es('solo lo movido en ese proyecto',(H.match(/<tr>/g)||[]).length,1);
es('guantes del EPY-002: 20',/Guantes de nitrilo<\/strong>[\s\S]*?>20<\/td>/.test(H),true);
es('el resumen dice de qué proyecto es',/del proyecto <strong>EPY-002/.test(nodo('almPagNav').innerHTML),true);
ev('_almFiltProy="EPY-004";rAlm()');
es('guantes del EPY-004: 100 − 40 = 60',ev('_almStockActual()["EPP-0001"].stock'),60);
ev('_almFiltProy="";rAlm()');

console.log('\n== Multi-filtro de materiales ==');
ev('_almMatToggle("INS-0069",true);_almMatToggle("EPP-0001",true)');
H=nodo('tbAlm').innerHTML;
es('solo los materiales elegidos',(H.match(/<tr>/g)||[]).length,2);
es('el botón dice cuántos',nodo('almMatBtn').textContent,'🧾 2 materiales ▾');
es('chips con ✕ para quitar',(nodo('almChips').innerHTML.match(/_almMatQuitar\(/g)||[]).length,2);
ev('_almMatQuitar("EPP-0001")');
es('quitar uno',(nodo('tbAlm').innerHTML.match(/<tr>/g)||[]).length,1);
ev('_almToggleStock()');
es('el multi-filtro también sirve en el Kardex normal',(nodo('tbAlm').innerHTML.match(/<tr>/g)||[]).length,1);
es('  y vuelve la cabecera de movimientos',/RQ \/ VAL/.test(nodo('almThead').innerHTML),true);
es('  con movimiento y fecha habilitados',nodo('almFiltTipo').disabled,false);
ev('_almMatLimpiar()');
es('quitar todos',ev('_almMatSel.size')+' · '+nodo('almChips').style.display,'0 · none');

console.log('\n== Lista del multi-filtro ==');
ev('_almMatAbrir()');
nodo('almMatBuscar').value='sika';
ev('_almMatPintarLista()');
const LI=nodo('almMatLista').innerHTML;
es('busca por nombre, sin importar tildes ni mayúsculas',(LI.match(/class="alm-ms-op"/g)||[]).length,2);
es('muestra el stock real de cada uno',/SikaRapid 3PE<\/span>\s*<span class="alm-ms-s" style="color:#10b981">22 Galón/.test(LI),true);
nodo('almMatBuscar').value='cemento tipo';
ev('_almMatPintarLista()');
es('otra búsqueda',/MAT-0100/.test(nodo('almMatLista').innerHTML)&&!/INS-0069/.test(nodo('almMatLista').innerHTML),true);
es('el texto no se interpreta como código',ev('_almEscH("<b>")'),'&lt;b&gt;');

console.log('\n== Buscador y tipo de material en la vista de stock ==');
ev('_almToggleStock();_almFiltText="sika";rAlm()');
es('el buscador filtra materiales',(nodo('tbAlm').innerHTML.match(/<tr>/g)||[]).length,2);
ev('_almFiltText="";_almFiltMat="EPP";rAlm()');
es('el tipo de material (prefijo) también',(nodo('tbAlm').innerHTML.match(/<tr>/g)||[]).length,1);
ev('_almFiltMat="";_almToggleStock()');

console.log('\n== Si el historial no llega ==');
ev('_almHist=null;_almHistEstado="";_almHistErrT=0');falla=true;
const antes=pedidas;
ev('rAlm()');await espera();await espera();
es('avisa que el stock solo cuenta el período',ev('_almAvisoHistorial()').includes('no se pudo'),true);
ev('rAlm()');await espera();
es('no reintenta en bucle',pedidas-antes,1);
falla=false;

console.log('\n== Excel y conexión ==');
const RQ=fs.readFileSync(R+'js/requerimientos.js','utf8');
es('el Excel del Kardex usa el saldo con todo el historial',/const saldoMap=_almSaldoMap\(\);/.test(RQ),true);
es('  respeta el multi-filtro',/_almMatSel\.has\(r\.codigo\)/.test(RQ),true);
es('  y en «Último stock» exporta esa vista',/_almModoStock\)\{_almExportStockXLS\(\);return;\}/.test(RQ),true);
const IX=fs.readFileSync(R+'index.html','utf8');
es('botones en la barra de filtros',/id="almBtnStock"/.test(IX)&&/id="almMatBtn"/.test(IX)&&/id="almChips"/.test(IX),true);
es('la cabecera de la tabla se puede cambiar',/<thead id="almThead">/.test(IX),true);
es('la Salida Múltiple por proyecto también usa todo el historial',/const movs=_almMovsCompletos\(\)\.filter/.test(fs.readFileSync(R+'js/almacen.js','utf8')),true);
es('ninguna celda rota',/undefined|NaN/.test(nodo('tbAlm').innerHTML),false);

console.log('\n'+(mal?'✗ '+mal+' FALLAS':'OK todo bien')+'  ·  '+ok+'/'+(ok+mal));
process.exit(mal?1:0);
})();
