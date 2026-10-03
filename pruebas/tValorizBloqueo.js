// Valorizaciones / EDP · ventana de 48 horas para eliminar.
// Pasadas 48 horas desde que se registró, el botón de eliminar queda en
// candado. Editar sigue permitido: es lo que hace falta para cargar la HES y
// la factura después.
const fs=require('fs'),vm=require('vm');
const R='c:/Users/LENOVO/OneDrive/Documents/GitHub/GDARSystem/';
let ok=0,mal=0;
const es=(l,g,e)=>{const b=String(g)===String(e);b?ok++:mal++;
  console.log((b?'  OK  ':'  MAL ')+l.padEnd(62)+'= '+g+(b?'':'  (esperado '+e+')'));};

const HORA=3600000;
let AHORA=Date.parse('2026-10-02T11:30:00-05:00');
class Reloj extends Date{
  constructor(...a){if(a.length===0)super(AHORA);else super(...a);}
  static now(){return AHORA;}
}
const hace=h=>new Date(AHORA-h*HORA).toISOString();
const iso=t=>new Date(t).toISOString().slice(0,10);
const hoy=()=>iso(AHORA);
const haceDias=n=>iso(AHORA-n*24*HORA);

const DB={ventas:[],proyectos:[]};
const ctx=vm.createContext({
  DB,console,Date:Reloj,Math,Number,String,Object,Array,JSON,Set,isFinite,parseFloat,parseInt,
  document:{getElementById:()=>null,querySelector:()=>null,querySelectorAll:()=>[],
    addEventListener(){},createElement:()=>({style:{},dataset:{},appendChild(){}}),
    body:{appendChild(){}}},
  window:{location:{href:'https://ecosermo.gdarei.com/index.html'},open:()=>null},
  location:{href:'https://ecosermo.gdarei.com/index.html'},
  localStorage:{getItem:()=>null,setItem(){},removeItem(){}},
  toast(){},confirm:()=>true,fmt:v=>String(v),today:()=>hoy(),
  EMPRESA:{nombre:'ECOSERMO',logo:'img/logo.png'},CU:{nombre:'Prueba'},
  supa:{storage:{from:()=>({upload:async()=>({}),getPublicUrl:()=>({data:{publicUrl:''}}),remove(){}})}}
});
vm.runInContext(fs.readFileSync(R+'js/venta.js','utf8'),ctx,{filename:'venta.js'});
const bloq=v=>{ctx.__v=v;return vm.runInContext('_vtBloqueada(__v)',ctx);};

console.log('\n== Las primeras 48 horas ==');
es('recién registrada: se puede eliminar',bloq({fecha:hoy(),creadoEn:hace(1)}),false);
es('a las 47 horas todavía',bloq({fecha:hoy(),creadoEn:hace(47)}),false);
es('a las 49 horas ya no',bloq({fecha:hoy(),creadoEn:hace(49)}),true);
es('la de setiembre, menos',bloq({fecha:'2026-09-30',creadoEn:'2026-09-30T10:00:00-05:00'}),true);

console.log('\n== Cargada con fecha atrasada ==');
// La valorización del 30/09 puede registrarse recién hoy: tiene sus 48 h
es('fecha vieja pero registrada recién: se puede eliminar',
  bloq({fecha:haceDias(30),creadoEn:hace(3)}),false);
es('  y se cierra al cumplir sus 48 h',
  bloq({fecha:haceDias(30),creadoEn:hace(49)}),true);

console.log('\n== Las que ya estaban cargadas ==');
es('sin hora de registro se usa su fecha',bloq({fecha:'2026-08-31'}),true);
es('  una de hoy sigue abierta',bloq({fecha:hoy()}),false);
es('sin fecha ni hora no se bloquea',bloq({}),false);
es('una fecha inválida no rompe',bloq({fecha:'xx'}),false);

console.log('\n== El motivo ==');
ctx.__v={fecha:hoy(),creadoEn:hace(96)};
const motivo=vm.runInContext('_vtMotivoBloqueo(__v)',ctx);
es('dice cuántas horas pasaron',/pasaron 96 horas/.test(motivo),true);
es('  y el límite',/el límite es 48/.test(motivo),true);

console.log('\n== La tabla ==');
const src=fs.readFileSync(R+'js/venta.js','utf8');
es('la bloqueada muestra candado',/_vtBloqueada\(v\)[\s\S]{0,250}🔒/.test(src),true);
es('  deshabilitado y con su motivo',/disabled title="\$\{_vtMotivoBloqueo\(v\)\}"/.test(src),true);
es('la abierta conserva eliminar',/onclick="del\('ventas',\$\{v\.id\}\)"/.test(src),true);
es('editar sigue disponible siempre',/onclick="openValorizEdit\(\$\{v\.id\}\)"/.test(src),true);
es('la ventana son 48 horas',/_VT_HORAS_LIBRE=48/.test(src),true);

console.log('\n== No se confía en la pantalla ==');
const dat=fs.readFileSync(R+'js/datos.js','utf8');
es('del() también lo comprueba',/t==='ventas'&&typeof _vtBloqueada==='function'/.test(dat),true);
es('  igual que el combustible',/t==='combustible'&&typeof _cbBloqueado==='function'/.test(dat),true);

console.log('\n== La hora de registro ==');
es('se sella al crear',/creadoEn:existing\.creadoEn\|\|new Date\(\)\.toISOString\(\)/.test(src),true);
es('  y editar no reabre el plazo',/existing\.creadoEn\|\|/.test(src),true);

console.log('\n== El SQL ==');
es('existe',fs.existsSync(R+'sql/ventas_creado_en.sql'),true);
const sql=fs.readFileSync(R+'sql/ventas_creado_en.sql','utf8');
es('  agrega la columna a ventas',/alter table public\.ventas[\s\S]{0,60}add column if not exists creado_en/.test(sql),true);
es('  y refresca el caché',/notify pgrst/.test(sql),true);

console.log('\n'+(mal?'X '+mal+' fallo(s)':'OK todo bien')+'  ·  '+ok+'/'+(ok+mal));
process.exit(mal?1:0);
