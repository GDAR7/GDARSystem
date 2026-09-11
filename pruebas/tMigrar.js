// ══ QUE `db push` NO HAGA DAÑO CON UN SOLO COMANDO ══════════════════════════
// `supabase db push` aplica sobre el proyecto enlazado en supabase/.temp, sea
// cual sea, y no pregunta. herramientas/migrar.js se pone delante y se niega
// en tres casos:
//
//   · el proyecto enlazado no es ni el de producción ni el de desarrollo;
//   · es producción y nadie lo pidió explícitamente — y si lo pidieron, se
//     respalda antes;
//   · alguna migración toca una tabla que ninguna migración anterior creó.
//
// El tercero es el que hoy está pasando de verdad, y la suite lo comprueba
// contra las migraciones reales del repositorio, no contra un ejemplo.

const fs=require('fs');
const R=require('path').join(__dirname,'..')+'/';
const M=require(R+'herramientas/migrar.js');

let ok=0,mal=0;
const es=(l,g,e)=>{const b=String(g)===String(e);b?ok++:mal++;
  console.log((b?'  OK  ':'  MAL ')+l.padEnd(58)+'= '+g+(b?'':'  (esperado '+e+')'));};

const PROD='kotqxhpkjuaxbgwhiode';
const DEV ='wezrieubjcvcrtinppfw';

// Una migración base mínima: crea las dos tablas que el índice único toca.
const BASE={nombre:'20260101000000_base.sql',sql:
  'create table public.tareaje (id bigint primary key, personal_id bigint, fecha date);\n'
 +'create table if not exists asistencia (id bigint primary key, personal_id bigint, fecha date);'};
const INDICE={nombre:'20260909235900_unicidad.sql',sql:
  'create unique index ux_tareaje_persona_fecha on public.tareaje (personal_id, fecha);\n'
 +'create unique index ux_asistencia_persona_fecha on asistencia (personal_id, fecha);'};

const dec=o=>M.decidir(Object.assign({enlazado:DEV,prod:PROD,dev:DEV,
  migraciones:[BASE,INDICE],flags:[]},o));

console.log('\n== Hoy el repositorio NO se puede migrar, y se sabe por qué ==');
// Las tablas de producción se crearon a mano antes de versionar el esquema. El
// índice único las toca, pero ninguna migración las crea: sobre una base nueva
// fallaría a medias.
{
  const dir=R+'supabase/migrations/';
  const reales=fs.readdirSync(dir).filter(f=>f.endsWith('.sql'))
    .map(f=>({nombre:f,sql:fs.readFileSync(dir+f,'utf8')}));
  const h=M.tablasHuerfanas(reales);
  const todas=h.flatMap(x=>x.tablas);
  es('se detectan tablas sin migración que las cree',h.length>0,true);
  es('  entre ellas tareaje',todas.includes('tareaje'),true);
  es('  y asistencia',todas.includes('asistencia'),true);
  es('val_presupuesto NO, porque su migración la crea',todas.includes('val_presupuesto'),false);
  const d=M.decidir({enlazado:DEV,prod:PROD,dev:DEV,migraciones:reales,flags:[]});
  es('así que se niega a migrar',d.ok,false);
  es('  y manda generar la base',/db:pull/.test(d.arreglo),true);
}

console.log('\n== "Alguna migración con create table" no alcanza ==');
// val_presupuesto ya trae un create table. Una comprobación ingenua daría por
// buena la base, y la migración del índice fallaría igual.
{
  const soloVal={nombre:'20261001000000_val.sql',sql:'create table public.val_presupuesto (id bigint);'};
  const d=dec({migraciones:[INDICE,soloVal]});
  es('se niega igual',d.ok,false);
  es('  porque el índice sigue sin sus tablas',
     d.huerfanas.flatMap(h=>h.tablas).sort().join(','),'asistencia,tareaje');
}

console.log('\n== Con la base, desarrollo se migra sin más ==');
{
  const d=dec({});
  es('se permite',d.ok,true);
  es('  en desarrollo',d.destino,'desarrollo');
  es('  sin respaldo, que dev no lo necesita',d.respaldar,false);
}

console.log('\n== El orden de las migraciones importa ==');
// La base tiene que ir ANTES. Una tabla creada por una migración posterior no
// existe todavía cuando corre la que la usa.
{
  const tarde={nombre:'20270101000000_base_tarde.sql',sql:BASE.sql};
  es('una base con fecha posterior no cuenta',dec({migraciones:[INDICE,tarde]}).ok,false);
  es('  aunque se le pase en otro orden',dec({migraciones:[tarde,INDICE]}).ok,false);
}

console.log('\n== Un proyecto que el repositorio no reconoce ==');
// El enlace queda guardado de la última vez. Nadie se acuerda de a cuál
// apuntaba.
{
  const d=dec({enlazado:'nkdzvfsaamplpjhmljbl'});
  es('se niega',d.ok,false);
  es('  y lo dice',d.destino,'desconocido');
  es('  y propone enlazar desarrollo',new RegExp(DEV).test(d.arreglo),true);
  es('sin nada enlazado también se niega',dec({enlazado:null}).ok,false);
}

console.log('\n== Producción hay que pedirla, y se respalda antes ==');
{
  es('sin pedirla, no',dec({enlazado:PROD}).ok,false);
  const d=dec({enlazado:PROD,flags:['--produccion']});
  es('pidiéndola, sí',d.ok,true);
  es('  y respaldando antes',d.respaldar,true);
  es('en seco no hace falta respaldo',
     dec({enlazado:PROD,flags:['--produccion','--dry-run']}).respaldar,false);
  es('  y la primera vez de una base vacía se puede saltar',
     dec({enlazado:PROD,flags:['--produccion','--sin-respaldo']}).respaldar,false);
  es('--produccion no hace nada sobre desarrollo',
     dec({flags:['--produccion']}).respaldar,false);
}

console.log('\n== Lo que cuenta como crear y como usar ==');
{
  es('create table',M.tablasCreadas('create table public.a (id int);').join(),'a');
  es('  con if not exists',M.tablasCreadas('create table if not exists b (id int);').join(),'b');
  es('  entre comillas',M.tablasCreadas('create table "c" (id int);').join(),'c');
  es('un índice usa su tabla',M.tablasUsadas('create unique index ux on public.t (x);').join(),'t');
  es('  y un alter table también',M.tablasUsadas('alter table t enable row level security;').join(),'t');
  es('  y una política',M.tablasUsadas('create policy "lee" on t for select using (true);').join(),'t');
  es('  y un select dentro de un do',
     M.tablasUsadas('do $$ begin select count(*) from tareaje; end $$;').join(),'tareaje');
  // Lo que NO es una tabla del esquema público.
  es('auth.users no es de este esquema',M.tablasUsadas('select 1 from auth.users;').length,0);
  es('  ni una función',M.tablasUsadas('select * from unnest(array[1]);').length,0);
  es('  ni lo que está en un comentario',M.tablasUsadas('-- from fantasma\nselect 1;').length,0);
  es('  ni en un comentario de bloque',M.tablasUsadas('/* alter table fantasma */ select 1;').length,0);
}

console.log('\n== El ref sale de la URL ==');
{
  es('se lee el subdominio',M.refDe('https://'+PROD+'.supabase.co'),PROD);
  es('  con barra final también',M.refDe('https://'+DEV+'.supabase.co/'),DEV);
  es('una URL de relleno no da ref',M.refDe('https://xxxxxxxxxxxx.supabase.co'),'null');
}

console.log('\n== npm run db:push pasa por el seguro ==');
// Si el comando que dice el instructivo siguiera llamando a supabase directo,
// el seguro existiría y nadie lo usaría.
{
  const pkg=JSON.parse(fs.readFileSync(R+'package.json','utf8')).scripts;
  es('db:push llama a migrar.js',pkg['db:push'],'node herramientas/migrar.js');
  const src=fs.readFileSync(R+'herramientas/migrar.js','utf8');
  es('el respaldo que corre es el de siempre',/backupSupabase\.js/.test(src),true);
  es('  y si falla no se migra',/El respaldo no salió bien, así que no se migra/.test(src),true);
}

console.log('\n'+(mal?'X '+mal+' fallo(s)':'OK todo bien')+'  ·  '+ok+'/'+(ok+mal));
process.exit(mal?1:0);
