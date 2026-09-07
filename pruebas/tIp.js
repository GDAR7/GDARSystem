const fs=require('fs');
const R='c:/Users/LENOVO/OneDrive/Documents/GitHub/GDARSystem/';

global.toast=(m,e)=>{global._ultimoToast=m;};
global.openM=()=>{};global.closeM=()=>{};
global.confirm=()=>true;
global.document={getElementById:()=>null,createElement:()=>({click:()=>{},style:{}}),body:{appendChild:()=>{},removeChild:()=>{}}};
global.DB={personal:[],planillaMes:[],proyectos:[],viaticos:[]};
global._plGenMes=6;global._plGenAnio=2026;
global._PL_MESES={1:'Enero',2:'Febrero',3:'Marzo',4:'Abril',5:'Mayo',6:'Junio',7:'Julio',8:'Agosto',9:'Septiembre',10:'Octubre',11:'Noviembre',12:'Diciembre'};
global.plMesCerrado=()=>false;
let _seq=9000;
global.nidSeguro=()=>++_seq;
global.supaUpsert=async()=>null;
global.genPlanilla=()=>{};

// Los dos archivos van en UN solo eval: importPlanilla usa el parser del otro.
const src=fs.readFileSync(R+'js/importCsv.js','utf8')+'\n'
         +fs.readFileSync(R+'js/importPlanilla.js','utf8')
  +'\n;global._iplAnalizar=_iplAnalizar;global._iplConfirmar=_iplConfirmar;'
  +'global._iplEmparejar=_iplEmparejar;global._iplBool=_iplBool;global._iplClaveNom=_iplClaveNom;'
  +'global._IPL_FICHA=_IPL_FICHA;global._IPL_MES=_IPL_MES;'
  +'global._setDatos=d=>{_iplDatos=d};global._getDatos=()=>_iplDatos;';
eval(src);

let ok=0,mal=0;
const es=(lbl,got,esp)=>{const b=String(got)===String(esp);b?ok++:mal++;
  console.log((b?'  OK  ':'  MAL ')+lbl.padEnd(52)+'= '+got+(b?'':'   (esperado '+esp+')'));};

// ── Personal ya cargado en el sistema ─────────────────────────────────────
DB.personal=[
  {id:1,dni:'40123456',ape:'QUISPE MAMANI',nom:'JUAN CARLOS',cargo:'MECANICO',   sue:2500,asig:0,movilidad:0,afp:'',     cuspp:'',banco:'',cuenta:'',est:'Activo'},
  {id:2,dni:'41234567',ape:'ROJAS LOPEZ',  nom:'MARIA ELENA', cargo:'ADMINISTRADORA',sue:3000,asig:1,movilidad:150,afp:'Integra',cuspp:'123456MERLO1',banco:'BCP',cuenta:'191-555',est:'Activo'},
  {id:3,dni:'42345678',ape:'HUAMAN SILVA', nom:'PEDRO',      cargo:'OPERADOR',   sue:2800,asig:0,movilidad:0,afp:'',     cuspp:'',banco:'',cuenta:'',est:'Activo'},
  {id:4,dni:'43456789',ape:'TORRES DIAZ',  nom:'ANA',        cargo:'AYUDANTE',   sue:2200,asig:0,movilidad:0,afp:'',     cuspp:'',banco:'',cuenta:'',est:'Activo'}
];
DB.planillaMes=[{id:500,personalId:2,mes:6,anio:2026,adelanto:200,bono:0}];

// ── El archivo: título arriba, punto y coma, formato peruano ──────────────
const CSV=[
 'PLANILLA JUNIO 2026 - ECOSERMO',
 '',
 'DNI;APELLIDOS Y NOMBRES;SUELDO BASE;ASIGNACION FAMILIAR;MOVILIDAD;AFP;CUSPP;BANCO;CUENTA;HE 25;BONO;ADELANTO;OTROS DESCUENTOS;AREA',
 '40123456;QUISPE MAMANI, JUAN CARLOS;2.750,00;SI;120,00;Prima;987654JCQUI2;BCP;191-777;4;500,00;300,00;;MANTENIMIENTO',
 '41234567;ROJAS LOPEZ, MARIA ELENA;3.000,00;SI;150,00;Integra;123456MERLO1;BCP;191-555;;;200,00;;ADMINISTRACION',
 ';PEDRO HUAMAN SILVA;2.900,00;NO;;Habitat;;;;8;;;50,00;OPERACIONES',
 '99999999;FANTASMA INEXISTENTE;1.000,00;NO;;;;;;;;;;OBRA',
 '40123456;QUISPE MAMANI, JUAN CARLOS;9.999,00;SI;;;;;;;;;;MANTENIMIENTO',
 ';;;;;;;;;;;;;',
 '43456789;TORRES DIAZ, ANA;2.200,00;NO;;;;;;;;;120,50;OBRA'
].join('\r\n');

const D=_iplAnalizar(CSV);
_setDatos(D);

console.log('\n== Lee el archivo aunque el encabezado no sea la primera línea ==');
es('sin error de lectura',D.error||'ninguno','ninguno');
es('encuentra el encabezado en la línea 3',D.iEnc+1,3);
es('separador punto y coma',D.delim,';');
es('reconoce 7 columnas de ficha',D.ficha.length,7);
es('reconoce 4 conceptos del mes',D.mes.length,4);
es('deja AREA fuera y lo dice',D.sinUsar.join(','),'AREA');

console.log('\n== Empareja a cada quien como se pueda ==');
const porId=n=>D.listas.find(x=>x.p.id===n);
es('Juan por DNI',            (porId(1)||{}).como,'DNI');
es('Pedro por nombre (sin DNI)',(porId(3)||{}).como,'nombre');
es('Ana también entra',        (porId(4)||{}).como,'DNI');
es('cuatro filas útiles',D.listas.length,3);
const mot=t=>D.problemas.filter(p=>String(p.motivo).includes(t)).length;
es('el fantasma no se importa',mot('no se encontró'),1);
es('el repetido se avisa',     mot('repetido'),1);
es('María ya tenía todo igual',D.problemas.filter(p=>p.igual).length,1);
es('las filas vacías se cuentan aparte',D.vacias,1);

console.log('\n== Solo propone lo que de verdad cambia ==');
const J=porId(1);
const cf=k=>(J.camF.find(c=>c.campo===k)||{});
es('el sueldo sube de 2500 a 2750',cf('sue').viejo+' → '+cf('sue').nuevo,'2500 → 2750');
es('el 2.750,00 se lee bien',cf('sue').nuevo,2750);
es('la asignación familiar pasa a sí',cf('asig').nuevo,1);
es('toma el AFP',cf('afp').nuevo,'Prima');
es('el cargo no venía: no se toca',cf('cargo').nuevo===undefined,true);
const cm=k=>(J.camM.find(c=>c.campo===k)||{});
es('HE 25 = 4',cm('he25').nuevo,4);
es('bono 500',cm('bono').nuevo,500);
es('adelanto 300',cm('adelanto').nuevo,300);
es('la columna vacía no propone nada',J.camM.length,3);

const A=porId(4);
es('Ana solo cambia un descuento',A.camF.length+'/'+A.camM.length,'0/1');
es('otros descuentos 120.50',(A.camM[0]||{}).nuevo,120.5);

const P3=porId(3);
es('Pedro ya estaba en NO: no propone cambio',P3.camF.some(c=>c.campo==='asig'),false);

console.log('\n== Sí/No tolerante ==');
[['SI',1],['Si',1],['X',1],['no',0],['NO',0],['',0],['113.00',1],['0',0],['1',1]].forEach(([v,e])=>
  es('"'+v+'"',_iplBool(v),e));

console.log('\n== El nombre no depende del orden ni de la coma ==');
es('"QUISPE MAMANI, JUAN CARLOS" = "JUAN CARLOS QUISPE MAMANI"',
   _iplClaveNom('QUISPE MAMANI, JUAN CARLOS')===_iplClaveNom('Juan Carlos Quispe Mamani'),true);

console.log('\n== Al confirmar, cada dato va a su sitio ==');
(async()=>{
  await _iplConfirmar();
  const p1=DB.personal.find(p=>p.id===1);
  es('el sueldo quedó guardado',p1.sue,2750);
  es('y la asignación familiar',p1.asig,1);
  es('y el CUSPP',p1.cuspp,'987654JCQUI2');
  es('a Ana no se le tocó el sueldo',DB.personal.find(p=>p.id===4).sue,2200);
  const m1=DB.planillaMes.find(d=>d.personalId===1&&d.mes===6);
  es('se creó el mes de Juan',!!m1,true);
  es('con su bono',m1.bono,500);
  es('y su adelanto',m1.adelanto,300);
  es('el mes de María no se duplicó',DB.planillaMes.filter(d=>d.personalId===2&&d.mes===6).length,1);
  const m4=DB.planillaMes.find(d=>d.personalId===4&&d.mes===6);
  es('Ana: otros descuentos',m4.otrosDesc,120.5);
  es('y no le inventó un adelanto',m4.adelanto===undefined,true);

  // ── Solo el mes, sin tocar la ficha ─────────────────────────────────────
  console.log('\n== Con "solo el mes" la ficha no se toca ==');
  DB.personal=[{id:1,dni:'40123456',ape:'QUISPE MAMANI',nom:'JUAN CARLOS',cargo:'MECANICO',sue:2500,asig:0,movilidad:0,afp:'',cuspp:'',banco:'',cuenta:'',est:'Activo'}];
  DB.planillaMes=[];
  const D2=_iplAnalizar(CSV);_setDatos(D2);
  document.getElementById=id=>id==='iplSoloMes'?{checked:true}:null;
  await _iplConfirmar();
  es('el sueldo sigue en 2500',DB.personal[0].sue,2500);
  es('pero el bono del mes sí entró',(DB.planillaMes[0]||{}).bono,500);
  document.getElementById=()=>null;

  // ── Mes cerrado ─────────────────────────────────────────────────────────
  console.log('\n== Un mes cerrado no se deja importar ==');
  DB.planillaMes=[];
  plMesCerrado=()=>true;
  _setDatos(_iplAnalizar(CSV));
  await _iplConfirmar();
  es('no escribió nada',DB.planillaMes.length,0);
  es('y lo avisó',/cerrada/.test(global._ultimoToast||''),true);
  plMesCerrado=()=>false;

  // ── Archivos que no sirven ──────────────────────────────────────────────
  console.log('\n== Archivos que no sirven se rechazan con motivo ==');
  es('vacío',/vacío/.test(_iplAnalizar('').error||''),true);
  es('sin columnas conocidas',/No se reconoció/.test(_iplAnalizar('A;B;C\r\n1;2;3').error||''),true);
  // Ese error ya no existe: en vez de cortar, abre el panel para asignar las
  // columnas a mano. Se comprueba el comportamiento nuevo.
  const _sd=_iplAnalizar('DNI;AREA\r\n40123456;OBRA');
  es('identifica pero no trae datos: no corta',_sd.error||'ninguno','ninguno');
  es('  y lo marca para pedir el mapeo a mano',!!_sd.sinDatos,true);
  es('trae datos pero no identifica',/identifica/.test(_iplAnalizar('SUELDO BASE;AREA\r\n2500;OBRA').error||''),true);

  console.log('\n'+(mal?'✗ '+mal+' fallo(s)':'✓ todo bien')+'  ·  '+ok+'/'+(ok+mal));
  process.exit(mal?1:0);
})();
