const fs=require('fs');
const R='c:/Users/LENOVO/OneDrive/Documents/GitHub/GDARSystem/';
global.localStorage={getItem:()=>null,setItem:()=>{},removeItem:()=>{}};
const nodos={};
const mk=id=>nodos[id]={id,innerHTML:'',style:{},value:'',textContent:'',classList:{contains:()=>false,add(){}}};
['thPlanilla','tbPlanillaBody','tfPlanilla','planillaResumen','planillaCard','plVistas','plFiltros',
 'plCierreBar','plMes','plAnio','plProy','blPanel','blLista','plTablaWrap','mBoletaBody','mBoletaTtl',
 'mBoletaPdf','mBoletaMail','tbPlanilla'].forEach(mk);
nodos.plMes.value='7';nodos.plAnio.value='2026';nodos.plProy.value='';
nodos.tbPlanilla.tHead=null;nodos.tbPlanilla.tBodies=[];nodos.tbPlanilla.tFoot=null;
global.document={getElementById:id=>nodos[id]||null,querySelector:()=>null,querySelectorAll:()=>[]};
global.window={location:{href:'https://gdar7.github.io/GDARSystem/index.html'},open:()=>null};
global.toast=m=>{global._t=m;};global.openM=id=>{global._abierto=id;};global.closeM=()=>{};
global.confirm=()=>true;global.isModuleReadOnly=()=>false;
global.nid=()=>1;let q=0;global.nidSeguro=()=>++q;global.EMPRESA={nombre:'ECOSERMO',ruc:'20571533180',logo:'09.-ERP/Imagenes/ECOSERMO-LOGO.png'};
global.supaUpsert=async()=>null;global.syncSheet=()=>{};
global.DB={personal:[],tareaje:[],planillaMes:[],afpTasas:[],proyectos:[],planillaCierre:[],planillaCerrada:[]};

const src=fs.readFileSync(R+'js/planilla.js','utf8')+'\n'+fs.readFileSync(R+'js/afpTasas.js','utf8')
  +'\n'+fs.readFileSync(R+'js/planillaCierre.js','utf8')+'\n'+fs.readFileSync(R+'js/boletaPago.js','utf8')
  +'\n;global.genPlanilla=genPlanilla;global.PL_VISTAS=PL_VISTAS;global.blFila=blFila;'
  +'global._blDoc=_blDoc;global._blCuerpo=_blCuerpo;global._blConceptos=_blConceptos;'
  +'global._blTabla=_blTabla;global.blRender=blRender;global._blSetBuscar=_blSetBuscar;'
  +'global.blVer=blVer;global.blSetFormato=blSetFormato;global._blCuerpoOficial=_blCuerpoOficial;global._blCssOficial=_blCssOficial;global._BL_EMPRESA=_BL_EMPRESA;global._getFmt=()=>_blFormato;global.blCorreo=blCorreo;global._blVisibles=_blVisibles;'
  +'global._plEsVistaBoletas=_plEsVistaBoletas;global.plSetVista=plSetVista;'
  +'global._calcPlanRow=_calcPlanRow;global.plCerrarMes=plCerrarMes;'
  +'global._setVista=v=>{_plVista=v};_plGenMes=7;_plGenAnio=2026;';
eval(src);

let ok=0,mal=0;
const es=(l,g,e)=>{const b=String(g)===String(e);b?ok++:mal++;
  console.log((b?'  OK  ':'  MAL ')+l.padEnd(56)+'= '+g+(b?'':'  (esperado '+e+')'));};

DB.personal=[
  {id:1,dni:'10199407',ape:'RODRIGUEZ MARTINES',nom:'ANDRES',cargo:'ING. RESIDENTE',cat:'Staff',
   sue:9000,asig:0,movilidad:250,afp:'SNP',cuspp:'',banco:'BCP',cuenta:'191-777',ing:'2024-01-15',
   email:'andres@ecosermo.com',est:'Activo',tipo:'Staff'},
  {id:2,dni:'46108109',ape:'RODRIGUEZ ALCALDE',nom:'ABEL',cargo:'ING. CONTROL',cat:'Staff',
   sue:8000,asig:1,movilidad:0,afp:'INTEGRA',cuspp:'123456ABC',banco:'BBVA',cuenta:'0032',
   email:'',est:'Activo',tipo:'Staff'},
  {id:3,dni:'43616432',ape:'MELENDREZ DAMAZO',nom:'YONDER',cargo:'ALMACENERO',cat:'Obrero',
   sue:3000,asig:0,movilidad:0,afp:'SNP',cuspp:'',banco:'BCP',cuenta:'555',
   email:'yonder@ecosermo.com',est:'Activo',tipo:'Obrero'},
  {id:9,dni:'99999999',ape:'INACTIVO',nom:'NO VA',cargo:'X',sue:1000,est:'Inactivo'}
];
[1,2,3,9].forEach(id=>{for(let d=1;d<=31;d++)DB.tareaje.push({personalId:id,fecha:'2026-07-'+String(d).padStart(2,'0'),tipo:'TD'});});
DB.planillaMes=[{id:5,personalId:1,mes:7,anio:2026,adelanto:300,cts:150,quintaCat:1353.35,he25:4,bAltura:200}];

console.log('\n== El tab existe y no es una vista de columnas ==');
const v=PL_VISTAS.find(x=>x.k==='boletas');
es('está en la barra',!!v,true);
es('se llama Boletas',v.l,'🧾 Boletas');
es('está marcado como boletas',!!v.boletas,true);
_setVista('boletas');
es('la pantalla lo reconoce',_plEsVistaBoletas(),true);
_setVista('resumen');
es('y las otras vistas no',_plEsVistaBoletas(),false);

console.log('\n== Sale del mismo cálculo que la planilla ==');
const f=blFila(1);
const c=_calcPlanRow(DB.personal[0],DB.planillaMes[0]);
es('mismo neto que la planilla',f.c.neto,c.neto);
es('mismos ingresos',f.c.subtotal2,c.subtotal2);
es('mismos descuentos',f.c.totalDeduccion,c.totalDeduccion);
es('mes abierto: no viene de una foto',f.cerrada,false);

console.log('\n== Solo se imprimen los conceptos con importe ==');
const K=_blConceptos(f.c);
es('no lista el jornal diario como importe',K.ing.some(([n])=>/Jornal/.test(n)),false);
es('  paga los días como tarea ordinaria',K.ing.some(([n])=>/Tarea ordinaria/.test(n)),true);
es('las horas extra 25 sí (tiene 4)',K.ing.some(([n])=>/25 %/.test(n)),true);
es('las de 100 no (está en cero)',K.ing.some(([n])=>/100 %/.test(n)),false);
es('la bonificación de altura sí',K.ing.some(([n])=>/altura/i.test(n)),true);
es('el adelanto sí',K.otr.some(([n])=>/Adelantos/.test(n)),true);
es('el sindicato no (cero)',K.otr.some(([n])=>/sindical/i.test(n)),false);
es('SNP: una sola línea de pensión',K.pens.length,1);
es('  y es la de ONP/SNP',K.pens[0][0],'ONP / SNP 13 %');
const K2=_blConceptos(blFila(2).c);
es('AFP: tres líneas',K2.pens.length,3);
es('  aporte, prima y comisión',K2.pens.map(x=>x[0]).join('|').includes('prima'),true);

console.log('\n== El documento se arma completo ==');
const doc=_blDoc([f]);
es('lleva el logo de Ecosermo',/ECOSERMO-LOGO\.png/.test(doc),true);
es('dice Boleta de Pago',/Boleta de Pago/.test(doc),true);
es('con el período',/JULIO 2026/.test(doc),true);
es('trae el nombre',/RODRIGUEZ MARTINES/.test(doc),true);
es('el DNI',/10199407/.test(doc),true);
es('el cargo',/ING\. RESIDENTE/.test(doc),true);
es('la cuenta bancaria',/191-777/.test(doc),true);
es('el neto a pagar',doc.includes(Number(f.c.neto).toLocaleString('es-PE',{minimumFractionDigits:2})),true);
es('firma del empleador',/Empleador/.test(doc),true);
es('firma del trabajador con su DNI',/recibí conforme/.test(doc),true);
es('el encabezado se repite por página (thead)',/<thead><tr><td>/.test(doc),true);
es('las firmas también (tfoot)',/<tfoot><tr><td>/.test(doc),true);
es('el azul de los RQ',doc.includes('#1e3a6e'),true);
es('está bien cerrado',/<\/body><\/html>$/.test(doc),true);
es('no quedó ningún undefined',/undefined/.test(doc),false);
es('ni NaN',/NaN/.test(doc),false);

console.log('\n== La movilidad se explica aparte ==');
es('se avisa que no es afecta',/no es afecta a aportes/.test(doc),true);
es('y aparece en el recuadro del neto',/Movilidad/.test(doc),true);
const doc2=_blDoc([blFila(2)]);
es('sin movilidad no se pone la nota',/no es afecta a aportes/.test(doc2),false);

console.log('\n== Varias boletas, una por página ==');
const todas=_blVisibles();
es('tres activos (el inactivo queda fuera)',todas.length,3);
const docN=_blDoc(todas);
es('tres páginas',(docN.match(/class="doc pagina"/g)||[]).length,3);
es('con salto entre ellas',/page-break-after:always/.test(docN),true);
es('un solo <html>',(docN.match(/<html>/g)||[]).length,1);

console.log('\n== El listado de la pantalla ==');
const t=_blTabla();
es('lista a los tres',(t.match(/blVer\(/g)||[]).length,3);
es('con sus tres botones cada uno',(t.match(/blPdf\(|blCorreo\(|blVer\(/g)||[]).length,9);
es('avisa quién no tiene correo',/1 sin correo cargado/.test(t),true);
es('y lo marca en su fila',/sin correo/.test(t),true);
es('muestra el neto total',/S\//.test(t),true);

console.log('\n== El buscador no rompe nada ==');
blRender();
es('la caja está fuera del listado',/id="blBuscar"/.test(nodos.blPanel.innerHTML),true);
nodos.blPanel.innerHTML='<centinela>';
_blSetBuscar('melendrez');
es('buscar no repinta el panel',nodos.blPanel.innerHTML,'<centinela>');
es('solo deja uno',(_blTabla().match(/blVer\(/g)||[]).length,1);
_blSetBuscar('rodriguez');
es('"rodriguez" trae dos',(_blTabla().match(/blVer\(/g)||[]).length,2);
_blSetBuscar('10199407');
es('por DNI, uno',(_blTabla().match(/blVer\(/g)||[]).length,1);
_blSetBuscar('zzz');
es('sin coincidencias lo dice',/Nadie coincide/.test(_blTabla()),true);
_blSetBuscar('');

console.log('\n== El correo ==');
global._t='';
blCorreo(2);
es('sin correo cargado, avisa',/no tiene correo/.test(global._t||''),true);
let ido='';
global.window.location={href:'https://x/index.html'};
Object.defineProperty(global.window.location,'href',{set(v){ido=v;},get(){return 'https://x/index.html';}});
blCorreo(1);
es('abre el correo del trabajador',/^mailto:andres%40ecosermo\.com/.test(ido),true);
es('con asunto',/subject=/.test(ido),true);
es('que nombra el mes',decodeURIComponent(ido).includes('Julio 2026'),true);
es('y el cuerpo trae el neto',decodeURIComponent(ido).includes('NETO A PAGAR'),true);
es('y el banco',decodeURIComponent(ido).includes('BCP'),true);

console.log('\n== Con la planilla cerrada manda la foto ==');
(async()=>{
  await plCerrarMes();
  es('el mes quedó cerrado',plMesCerrado(7,2026),true);
  const fc=blFila(1);
  es('la boleta viene de la foto',fc.cerrada,true);
  const netoFoto=fc.c.neto;
  // Alguien cambia el sueldo después del cierre
  DB.personal[0].sue=99999;
  const fd=blFila(1);
  es('cambiar el sueldo no altera la boleta',fd.c.neto,netoFoto);
  es('y el documento lo dice',/planilla cerrada/.test(_blDoc([fd])),true);
  DB.personal[0].sue=9000;

  console.log('\n'+(mal?'X '+mal+' fallo(s)':'OK todo bien')+'  ·  '+ok+'/'+(ok+mal));
  process.exit(mal?1:0);
})();
