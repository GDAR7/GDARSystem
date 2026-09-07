const fs=require('fs');
const R='c:/Users/LENOVO/OneDrive/Documents/GitHub/GDARSystem/';
let LS={};
global.localStorage={getItem:k=>LS[k]==null?null:LS[k],setItem:(k,v)=>LS[k]=String(v),removeItem:k=>delete LS[k]};
global.toast=m=>{global._t=m;};global.openM=()=>{};global.closeM=()=>{};global.confirm=()=>true;
global.document={getElementById:()=>null};
global._PL_MESES=['','Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
global._plGenMes=7;global._plGenAnio=2026;
global.plMesCerrado=()=>false;let q=800;global.nidSeguro=()=>++q;global.supaUpsert=async()=>null;global.genPlanilla=()=>{};

// El maestro guarda los DNI completos, con su cero adelante
global.DB={personal:[
  {id:1,dni:'04067511',ape:'CHAMORRO BAZAN',  nom:'JUAN',  cargo:'X',afp:'',cuspp:'',est:'Activo'},
  {id:2,dni:'04068650',ape:'ILDEFONSO CANO',  nom:'LUIS',  cargo:'X',afp:'',cuspp:'',est:'Activo'},
  {id:3,dni:'04221602',ape:'LOYOLA HERRERA',  nom:'ANA',   cargo:'X',afp:'',cuspp:'',est:'Activo'},
  {id:4,dni:'07481975',ape:'CARHUAS CARHUAS', nom:'PEDRO', cargo:'X',afp:'',cuspp:'',est:'Activo'},
  {id:5,dni:'09518617',ape:'PORRAS ESPINOZA', nom:'ROSA',  cargo:'X',afp:'',cuspp:'',est:'Activo'},
  {id:6,dni:'10199407',ape:'RODRIGUEZ MARTINES',nom:'ANDRES',cargo:'X',afp:'SNP',cuspp:'',est:'Activo'},
  {id:7,dni:'15215803',ape:'GIRON ENCARNACION',nom:'JOSE', cargo:'X',afp:'',cuspp:'',est:'Activo'}
],planillaMes:[]};

const src=fs.readFileSync(R+'js/importCsv.js','utf8')+'\n'+fs.readFileSync(R+'js/importPlanilla.js','utf8')
  +'\n;global._iplAnalizar=_iplAnalizar;global._iplConfirmar=_iplConfirmar;global._iplDni8=_iplDni8;'
  +'global._iplPanelCols=_iplPanelCols;global._iplAsignar=_iplAsignar;global._iplPreview=()=>{};'
  +'global._setTexto=(t,n)=>{_iplTexto=t;_iplNombreArch=n;};global._setDatos=d=>{_iplDatos=d};';
eval(src);

let ok=0,mal=0;
const es=(l,g,e)=>{const b=String(g)===String(e);b?ok++:mal++;
  console.log((b?'  OK  ':'  MAL ')+l.padEnd(54)+'= '+g+(b?'':'  (esperado '+e+')'));};

// El archivo tal como sale de Excel: DNI sin el cero, CUSSP con doble S
const CSV=[
 'Nombre de Trabajador;DNI;AFP/SNP;CUSSP',
 'CHAMORRO BAZAN JUAN;4067511;PROFUTURO;563421HCBMT2',
 'ILDEFONSO CANO LUIS;4068650;SNP;',
 'LOYOLA HERRERA ANA;4221602;PROFUTURO;573991ELHOR9',
 'CARHUAS CARHUAS PEDRO;7481975;SNP;',
 'PORRAS ESPINOZA ROSA;9518617;INTEGRA;252021JPERI6',
 'RODRIGUEZ MARTINES ANDRES;10199407;SNP;',
 'GIRON ENCARNACION JOSE;15215803;SNP;'
].join('\r\n');

console.log('\n== El cero que Excel se come ==');
es('4067511 se completa a 8 dígitos',_iplDni8('4067511'),'04067511');
es('un DNI ya completo no cambia',_iplDni8('10199407'),'10199407');
es('un carné más largo no se toca',_iplDni8('001234567890'),'001234567890');
es('acepta puntos y guiones',_iplDni8('4.067.511'),'04067511');

_setTexto(CSV,'AFP y CUSSP.csv');
let D=_iplAnalizar(CSV);

console.log('\n== Ahora reconoce las dos columnas ==');
es('sin error',D.error||'ninguno','ninguno');
es('AFP/SNP se reconoce',D.ficha.some(c=>c.campo==='afp'),true);
es('CUSSP también',D.ficha.some(c=>c.campo==='cuspp'),true);
es('y ya no dice que no hay datos',!!D.sinDatos,false);
es('"Nombre de Trabajador" sirve de identificador',D.map.id_nombre!=null,true);
es('no queda ninguna columna suelta',D.libres.length,0);

console.log('\n== Empareja a los 7, con cero o sin él ==');
es('seis filas con algo que cambiar',D.listas.length,6);
es('todas por DNI',D.listas.every(x=>x.como==='DNI'),true);
es('ninguna quedó sin emparejar',D.problemas.filter(p=>!p.igual).length,0);

console.log('\n== Qué propone cambiar ==');
const f=id=>D.listas.find(x=>x.p.id===id);
const c=(id,k)=>(f(id).camF.find(y=>y.campo===k)||{}).nuevo;
es('CHAMORRO: AFP Profuturo',c(1,'afp'),'PROFUTURO');
es('CHAMORRO: su CUSPP',c(1,'cuspp'),'563421HCBMT2');
es('ILDEFONSO: SNP',c(2,'afp'),'SNP');
es('ILDEFONSO: sin CUSPP, no lo inventa',c(2,'cuspp')===undefined,true);
es('RODRIGUEZ ya tenía SNP: no entra a la lista',!f(6),true);
es('  y se lista como sin cambios',D.problemas.some(p=>p.igual&&/RODRIGUEZ/.test(p.quien)),true);
es('no toca nada del mes',D.listas.every(x=>x.camM.length===0),true);

console.log('\n== Se guarda donde debe ==');
(async()=>{
  _setDatos(D);
  await _iplConfirmar();
  const p=id=>DB.personal.find(x=>x.id===id);
  es('AFP de CHAMORRO',p(1).afp,'PROFUTURO');
  es('CUSPP de CHAMORRO',p(1).cuspp,'563421HCBMT2');
  es('AFP de PORRAS',p(5).afp,'INTEGRA');
  es('CUSPP de PORRAS',p(5).cuspp,'252021JPERI6');
  es('el DNI del maestro no se pisó',p(1).dni,'04067511');
  es('no se creó ningún mes',DB.planillaMes.length,0);

  // ── Un archivo con columnas que nadie adivina ─────────────────────────
  console.log('\n== Sin columnas reconocidas: se puede asignar a mano ==');
  const RARO=['DNI;FONDO PREVISIONAL;COD PREV',
              '4067511;PRIMA;111111AAAAA1',
              '4068650;INTEGRA;222222BBBBB2'].join('\r\n');
  _setTexto(RARO,'raro.csv');
  let D2=_iplAnalizar(RARO);
  es('no corta con un error',D2.error||'ninguno','ninguno');
  es('avisa que no halló datos',!!D2.sinDatos,true);
  es('pero ofrece las dos columnas',D2.libres.length,2);
  es('con un ejemplo de cada una',(D2.libres[0].muestra||'')+'/'+(D2.libres[1].muestra||''),'PRIMA/111111AAAAA1');
  es('no llena la pantalla de avisos inútiles',D2.problemas.length,0);
  es('el panel se puede armar',/FONDO PREVISIONAL/.test(_iplPanelCols(D2)),true);

  _setDatos(D2);
  _iplAsignar('FONDO PREVISIONAL','f_afp');
  _iplAsignar('COD PREV','f_cuspp');
  D2=_iplAnalizar(RARO);
  es('asignadas a mano, ya hay datos',!!D2.sinDatos,false);
  es('y dos personas para actualizar',D2.listas.length,2);
  _setDatos(D2);
  await _iplConfirmar();
  es('se guardó el fondo',p(1).afp,'PRIMA');
  es('y el código',p(1).cuspp,'111111AAAAA1');

  console.log('\n== Sigue rechazando lo que de verdad no sirve ==');
  es('archivo vacío',/vacío/.test(_iplAnalizar('').error||''),true);
  es('nada reconocible',/No se reconoció/.test(_iplAnalizar('A;B\r\n1;2').error||''),true);
  es('sin identificar a nadie',/identifica/.test(_iplAnalizar('SUELDO BASE;AREA\r\n2500;OBRA').error||''),true);

  console.log('\n'+(mal?'X '+mal+' fallo(s)':'OK todo bien')+'  ·  '+ok+'/'+(ok+mal));
  process.exit(mal?1:0);
})();
