const fs=require('fs');
const R='c:/Users/LENOVO/OneDrive/Documents/GitHub/GDARSystem/';
let LS={};
global.localStorage={getItem:k=>LS[k]==null?null:LS[k],setItem:(k,v)=>LS[k]=String(v),removeItem:k=>delete LS[k]};
const campos={};
const mk=id=>campos[id]={id,value:'',style:{},innerHTML:''};
['wDni','wNom','wApe','wCargo','wCat','wProy','wProc','wTipo','wGuardia','wIng','wSue','wAsig',
 'wEst','wNotas','wAfp','wCuspp','wBanco','wCuenta','wMovilidad','wCodigoQr','wEmail'].forEach(mk);
global.document={getElementById:id=>campos[id]||null,querySelector:()=>({textContent:''}),querySelectorAll:()=>[],
  createElement:()=>({click(){},style:{}}),body:{appendChild(){},removeChild(){}}};
global.toast=m=>{global._t=m;};global.openM=()=>{};global.closeM=()=>{};global.confirm=()=>true;
global.URL={createObjectURL:()=>'blob:x',revokeObjectURL(){}};
global.Blob=function(a){this.a=a;};
global._PL_MESES=['','Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
global._plGenMes=7;global._plGenAnio=2026;global.plMesCerrado=()=>false;
let q=0;global.nid=()=>++q;global.nidSeguro=()=>++q;
global.supaUpsert=async()=>null;global.syncSheet=(a,d)=>{global._guardado=d;};
global.rPersonal=()=>{};global.genPlanilla=()=>{};global.rTareaje=()=>{};
global.isModuleReadOnly=()=>false;global._poblarProyPersonal=()=>{};global.perGoTab=()=>{};
global.DB={personal:[],tareaje:[],planillaMes:[],proyectos:[]};

// _editPersonalId lo declara requerimientos.js; aquí basta con que exista
const src='let _editPersonalId=null;\n'+fs.readFileSync(R+'js/personal.js','utf8')+'\n'
  +fs.readFileSync(R+'js/importCsv.js','utf8')+'\n'
  +fs.readFileSync(R+'js/importPlanilla.js','utf8')
  +'\n;global.gPersonal=gPersonal;global._perEmailValido=_perEmailValido;global._perEmail=_perEmail;'
  +'global._iplAnalizar=_iplAnalizar;global._iplConfirmar=_iplConfirmar;global._iplPlantilla=_iplPlantilla;'
  +'global._IPL_FICHA=_IPL_FICHA;global._setTexto=(t,n)=>{_iplTexto=t;_iplNombreArch=n;};'
  +'global._setDatos=d=>{_iplDatos=d};global._iplPreview=()=>{};'
  // Las pantallas reales pisan los stubs: aquí solo interesa lo que se guarda
  +'rPersonal=function(){};_refrescarTareajeSiActivo=function(){};';
eval(src);

let ok=0,mal=0;
const es=(l,g,e)=>{const b=String(g)===String(e);b?ok++:mal++;
  console.log((b?'  OK  ':'  MAL ')+l.padEnd(52)+'= '+g+(b?'':'  (esperado '+e+')'));};

console.log('\n== El campo está en el formulario ==');
const html=fs.readFileSync(R+'index.html','utf8');
es('existe el input',/id="wEmail"/.test(html),true);
es('es de tipo correo',/id="wEmail" type="email"/.test(html),true);
es('está en la pestaña de Datos',html.indexOf('id="wEmail"')<html.indexOf('id="perP1"'),true);

console.log('\n== Se guarda en la ficha ==');
campos.wDni.value='40123456';campos.wNom.value='JUAN';campos.wApe.value='PEREZ';
campos.wEmail.value='  juan.perez@ecosermo.com  ';
campos.wSue.value='2500';campos.wAsig.value='0';campos.wMovilidad.value='0';campos.wEst.value='Activo';
gPersonal();
es('quedó guardado',(DB.personal[0]||{}).email,'juan.perez@ecosermo.com');
es('sin los espacios de los lados',/^\S|\S$/.test(DB.personal[0].email),true);
es('viajó a Supabase',(global._guardado||{}).email,'juan.perez@ecosermo.com');

console.log('\n== Correos que no valen se rechazan ==');
[['juan@','no'],['juan.perez','no'],['@ecosermo.com','no'],['juan perez@x.com','no'],
 ['juan@ecosermo','no'],['a@b.pe','sí'],['nombre.apellido+x@sub.dominio.com','sí'],['','sí']]
  .forEach(([v,e])=>es('  "'+(v||'(vacío)')+'"',_perEmailValido(v)?'sí':'no',e));

const antes=DB.personal.length;
campos.wDni.value='41111111';campos.wNom.value='ANA';campos.wApe.value='LOPEZ';
campos.wEmail.value='ana@sin-dominio';
gPersonal();
es('no se creó el trabajador con correo malo',DB.personal.length,antes);
es('y se avisó por qué',/correo no parece válido/.test(global._t||''),true);

console.log('\n== El correo es opcional ==');
campos.wEmail.value='';
gPersonal();
es('sin correo sí se crea',DB.personal.length,antes+1);
es('y queda vacío, no undefined',DB.personal[antes].email,'');

console.log('\n== Se puede importar desde el CSV ==');
es('está entre las columnas de ficha',_IPL_FICHA.some(c=>c.campo==='email'),true);
DB.personal=[{id:1,dni:'40123456',ape:'PEREZ',nom:'JUAN',cargo:'X',email:'',est:'Activo'}];
const CSV=['DNI;CORREO ELECTRONICO','40123456;jperez@ecosermo.com'].join('\r\n');
_setTexto(CSV,'correos.csv');
const D=_iplAnalizar(CSV);
es('reconoce la columna',D.ficha.some(c=>c.campo==='email'),true);
es('ya no queda como ignorada',D.sinUsar.includes('CORREO ELECTRONICO'),false);
es('propone el cambio',(D.listas[0].camF[0]||{}).nuevo,'jperez@ecosermo.com');
(async()=>{
  _setDatos(D);
  await _iplConfirmar();
  es('y lo guarda en la ficha',DB.personal[0].email,'jperez@ecosermo.com');

  console.log('\n== La plantilla lo incluye ==');
  let csvGen='';
  global.Blob=function(a){csvGen=a[0];};
  DB.personal=[{id:1,dni:'40123456',ape:'PEREZ',nom:'JUAN',cargo:'X',email:'jperez@ecosermo.com',
    sue:2500,asig:1,movilidad:0,afp:'PROFUTURO',cuspp:'X1',banco:'BCP',cuenta:'191',est:'Activo'}];
  _iplPlantilla();
  const lin=csvGen.split('\r\n');
  const cab=lin[0].split(';').map(x=>x.replace(/"/g,''));
  const fil=lin[1].split(';').map(x=>x.replace(/"/g,''));
  es('la cabecera lo lista',cab.includes('Correo electrónico'),true);
  es('en la misma posición que el valor',fil[cab.indexOf('Correo electrónico')],'jperez@ecosermo.com');
  es('las columnas y los valores cuadran',cab.length,fil.length);

  console.log('\n'+(mal?'X '+mal+' fallo(s)':'OK todo bien')+'  ·  '+ok+'/'+(ok+mal));
  process.exit(mal?1:0);
})();
