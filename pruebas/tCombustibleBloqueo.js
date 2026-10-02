// Kardex de Combustible · ventana de 48 horas.
// Un movimiento se edita y se elimina durante sus primeras 48 horas desde que
// se REGISTRÓ; pasadas, queda congelado (candado) y solo se puede mirar.
const fs=require('fs'),vm=require('vm');
const R='c:/Users/LENOVO/OneDrive/Documents/GitHub/GDARSystem/';
let ok=0,mal=0;
const es=(l,g,e)=>{const b=String(g)===String(e);b?ok++:mal++;
  console.log((b?'  OK  ':'  MAL ')+l.padEnd(62)+'= '+g+(b?'':'  (esperado '+e+')'));};

const HORA=3600000;
const hace=h=>new Date(Date.now()-h*HORA).toISOString();
const iso=d=>d.toISOString().slice(0,10);
const hoy=iso(new Date());
const haceDias=n=>iso(new Date(Date.now()-n*24*HORA));

const DB={combustible:[],equipos:[{id:1,codigo:'EXC ECOP-003',nombre:'Excavadora'}]};
const ctx=vm.createContext({
  DB,console,Date,Math,Number,String,Object,Array,JSON,Set,isFinite,parseFloat,parseInt,
  document:{getElementById:()=>null,querySelector:()=>null,querySelectorAll:()=>[],
    addEventListener(){},createElement:()=>({style:{},dataset:{},appendChild(){}}),
    body:{appendChild(){}}},
  window:{location:{href:'https://ecosermo.gdarei.com/index.html'},open:()=>null},
  location:{href:'https://ecosermo.gdarei.com/index.html'},
  localStorage:{getItem:()=>null,setItem(){},removeItem(){}},
  toast(){},confirm:()=>true,fmt:v=>String(v),today:()=>hoy,
  EMPRESA:{nombre:'ECOSERMO',logo:'img/logo.png'},CU:{nombre:'Prueba'}
});
vm.runInContext(fs.readFileSync(R+'js/combustible.js','utf8'),ctx,{filename:'combustible.js'});
const bloq=r=>{ctx.__r=r;return vm.runInContext('_cbBloqueado(__r)',ctx);};

console.log('\n== El reloj corre desde que se registró ==');
es('recién registrado: se puede corregir',bloq({fecha:hoy,creadoEn:hace(1)}),false);
es('a las 47 horas todavía',bloq({fecha:hoy,creadoEn:hace(47)}),false);
es('a las 49 horas ya no',bloq({fecha:hoy,creadoEn:hace(49)}),true);
es('a los 10 días menos',bloq({fecha:haceDias(10),creadoEn:hace(240)}),true);

console.log('\n== Lo cargado con fecha atrasada ==');
// Es el caso que la regla anterior rompía: se registra hoy un despacho del
// lunes pasado y nacía bloqueado, sin forma de corregir el error.
es('fecha de hace 5 días pero registrado recién: se corrige',
  bloq({fecha:haceDias(5),creadoEn:hace(2)}),false);
es('  y sigue abierto hasta cumplir sus 48 h',
  bloq({fecha:haceDias(5),creadoEn:hace(47.5)}),false);
es('  después se cierra como cualquiera',
  bloq({fecha:haceDias(5),creadoEn:hace(50)}),true);

console.log('\n== Movimientos viejos, sin hora de registro ==');
es('sin creadoEn se usa su fecha',bloq({fecha:haceDias(10)}),true);
es('  uno de hoy sigue abierto',bloq({fecha:hoy}),false);
es('sin fecha ni hora no se bloquea nada',bloq({}),false);
es('una fecha inválida tampoco rompe',bloq({fecha:'no-es-fecha'}),false);

console.log('\n== El motivo que se le muestra al usuario ==');
ctx.__r={fecha:hoy,creadoEn:hace(72)};
const motivo=vm.runInContext('_cbMotivoBloqueo(__r)',ctx);
es('dice cuántas horas pasaron',/pasaron 72 horas/.test(motivo),true);
es('  y cuál es el límite',/el límite para corregir es 48/.test(motivo),true);

console.log('\n== La tabla ==');
const src=fs.readFileSync(R+'js/combustible.js','utf8');
es('el bloqueado muestra Ver, no editar',/\(cerrado\|\|_bloq48\)/.test(src),true);
es('  con el candado deshabilitado',/disabled title="\$\{_cbMotivoBloqueo\(r\)\}"/.test(src),true);
es('el abierto conserva editar y eliminar',
  /onclick="editComb\(\$\{r\.id\}\)"[\s\S]{0,200}onclick="del\('combustible',\$\{r\.id\}\)"/.test(src),true);
es('la ventana son 48 horas',/_CB_HORAS_LIBRE=48/.test(src),true);

console.log('\n== No se confía en la pantalla ==');
es('editar comprueba el bloqueo',/if\(_cbBloqueado\(r\)\)\{toast\(_cbMotivoBloqueo\(r\)/.test(src),true);
es('  y manda a ver en su lugar',/verComb\(id\);return;\}/.test(src),true);
es('guardar vuelve a comprobarlo',/_cbBloqueado\(DB\.combustible\[idx\]\)/.test(src),true);
const dat=fs.readFileSync(R+'js/datos.js','utf8');
es('eliminar también, desde del()',/t==='combustible'&&typeof _cbBloqueado==='function'/.test(dat),true);

console.log('\n== Lo nuevo nace sellado ==');
es('se guarda la hora de registro',/creadoEn:new Date\(\)\.toISOString\(\)/.test(src),true);
es('  solo al crear, no al editar',
  src.indexOf('creadoEn:new Date().toISOString()')>src.indexOf('if(_combEditId!==null)'),true);

console.log('\n== El SQL que lo sostiene ==');
es('existe',fs.existsSync(R+'sql/combustible_creado_en.sql'),true);
const sql=fs.readFileSync(R+'sql/combustible_creado_en.sql','utf8');
es('  agrega la columna',/add column if not exists creado_en/.test(sql),true);
es('  y refresca el caché de la API',/notify pgrst/.test(sql),true);
es('  deja opcional cerrar los viejos',/-- update public\.combustible/.test(sql),true);

console.log('\n'+(mal?'X '+mal+' fallo(s)':'OK todo bien')+'  ·  '+ok+'/'+(ok+mal));
process.exit(mal?1:0);
