// Facturas / Boletas · pestaña Reembolsables / Gastos: filtro por EDP.
// Filtra la tabla, los KPI y el Excel; convive con proveedor, factura y código.
const fs=require('fs'),vm=require('vm');
const R='c:/Users/LENOVO/OneDrive/Documents/GitHub/GDARSystem/';
let ok=0,mal=0;
const es=(l,g,e)=>{const b=String(g)===String(e);b?ok++:mal++;
  console.log((b?'  OK  ':'  MAL ')+l.padEnd(62)+'= '+g+(b?'':'  (esperado '+e+')'));};

const it=(id,edp,prov,serie,corr,cod,imp)=>({id,edp,proveedor:prov,serie,correlativo:corr,codigo:cod,importe:imp,
  fecha:'2026-09-'+String(10+id).padStart(2,'0'),ruc:'20'+id,precioUnit:imp,cantidad:1,desc:'Ítem '+id});
const DB={reembolsables:[
  it(1,'5','SEGURIDAD J&E','F001','10','R14',100),
  it(2,'5','SEGURIDAD J&E','F001','10','R03',50),
  it(3,'4','FERRETERÍA SUR','F002','7','R14',200),
  it(4,'10','FERRETERÍA SUR','F002','8','R14',40),
  it(5,'','GRIFO NORTE','E001','3','R01',30),
  it(6,'6','GRIFO NORTE','E001','4','R01',70)
]};
const nodos={};
const Nodo=id=>({id,innerHTML:'',value:'',style:{}});
const nodo=id=>nodos[id]||(nodos[id]=Nodo(id));
let libro=null;
const ctx=vm.createContext({DB,console,Math,Number,String,Object,Array,JSON,Set,Map,isFinite,parseFloat,Date,
  document:{getElementById:nodo,querySelector:()=>null,querySelectorAll:()=>[]},window:{},toast(){},
  XLSX:{utils:{aoa_to_sheet:a=>({a}),book_new:()=>({}),book_append_sheet(){},encode_cell:()=>'A1',decode_range:()=>({s:{r:0,c:0},e:{r:0,c:0}})},writeFile:(wb,n)=>{libro=n;}}});
// Solo las piezas de la pestaña (requerimientos.js es grande y depende de todo el sistema)
const src=fs.readFileSync(R+'js/requerimientos.js','utf8');
const ini=src.indexOf("let _reembFiltProv="), fin=src.indexOf('\nfunction rReembolsables(){');
const finR=src.indexOf('\n}',src.indexOf('pg.innerHTML=`',fin))+2;
vm.runInContext('function _fpEnRango(){return true;}\n'+src.slice(ini,fin)+src.slice(fin,finR).replace(/^\s*\n/,'')
  .replace('function rReembolsables(){','function rReembolsables(){'),ctx,{filename:'reemb.js'});
const ev=x=>vm.runInContext(x,ctx);
const pg=()=>nodo('fpTab-reemb').innerHTML;
const filas=()=>(pg().match(/onclick="editReembolsable\(/g)||[]).length;

console.log('\n== El selector ==');
ev('rReembolsables()');
es('aparece el filtro EDP',/<select id="reembFiltEdp"/.test(pg()),true);
es('antes que Proveedor',pg().indexOf('reembFiltEdp')<pg().indexOf("_reembSetFilt('prov'"),true);
const ops=[...pg().match(/<select id="reembFiltEdp"[\s\S]*?<\/select>/)[0].matchAll(/<option value="([^"]*)"[^>]*>([^<]*)</g)].map(m=>m[2]);
es('EDP en orden numérico (10 después de 6), «Sin EDP» al final',ops.join(' | '),'— Todos — | EDP 4 | EDP 5 | EDP 6 | EDP 10 | Sin EDP');
es('sin filtro, todo',filas(),6);

console.log('\n== Filtrar por EDP ==');
ev('_reembSetFilt("edp","5")');
es('solo los ítems del EDP 5',filas(),2);
es('los KPI siguen al filtro (100 + 50 sin IGV)',/S\/ 150\.00/.test(pg()),true);
es('el selector queda marcado',/<option value="5" selected>EDP 5/.test(pg()),true);
es('aparece Limpiar',/_reembFiltEdp='';/.test(pg()),true);
ev('_reembSetFilt("edp","__sin")');
es('«Sin EDP» trae los que no tienen',filas()+' · id '+ev('_reembFiltrar(DB.reembolsables).map(r=>r.id).join()'),'1 · id 5');

console.log('\n== Junto con los otros filtros ==');
ev('_reembSetFilt("edp","");_reembSetFilt("cod","R14")');
es('código R14 en todos los EDP',filas(),3);
ev('_reembSetFilt("edp","4")');
es('R14 y EDP 4',filas(),1);
ev('_reembSetFilt("prov","SEGURIDAD J&E")');
es('un proveedor que no tiene ese EDP deja la tabla vacía',filas(),0);
ev('_reembFiltEdp="";_reembFiltProv="";_reembFiltCod="";rReembolsables()');

console.log('\n== Un EDP que ya no existe se suelta solo ==');
ev('_reembFiltEdp="99";rReembolsables()');
es('vuelve a «Todos»',ev('_reembFiltEdp')+' · '+filas(),' · 6');

console.log('\n== Excel ==');
const xs=src.slice(src.indexOf('function _reembExportXls(){'),src.indexOf('\n}',src.indexOf('function _reembExportXls(){'))+2);
es('el Excel usa el mismo filtro',/const rows=_reembFiltrar\(all\);/.test(xs),true);
es('  y su título dice el EDP',/' — EDP: '\+_reembEdpEtq\(_reembFiltEdp\)/.test(xs),true);
es('editar la factura sigue tomando todos sus ítems (no filtra por EDP)',
  !/_reembFiltEdp/.test(src.slice(src.indexOf('function editFacturaReemb'),src.indexOf('function editFacturaReemb')+1200)),true);
es('la versión del script subió',/js\/requerimientos\.js\?v=20"/.test(fs.readFileSync(R+'index.html','utf8')),true);

console.log('\n'+(mal?'✗ '+mal+' FALLAS':'OK todo bien')+'  ·  '+ok+'/'+(ok+mal));
process.exit(mal?1:0);
