// ══ QUE LA MIGRACIÓN BASE NO SUBA NADA QUE NO DEBA ══════════════════════════
// El esquema de producción va a supabase/migrations/, que está en un
// repositorio PÚBLICO. herramientas/base.js lo revisa antes de instalarlo, y
// esta suite comprueba que atrape lo que no puede pasar:
//
//   · filas de datos: serían DNI y sueldos;
//   · algo con forma de llave dentro del cuerpo de una función;
//   · un volcado que no crea las tablas que las migraciones tocan, y que por
//     tanto no arregla nada.
//
// Los volcados de aquí imitan el formato real de `supabase db dump`: todo
// entre comillas, "public"."tabla", y CREATE TABLE IF NOT EXISTS.

const fs=require('fs');
const R=require('path').join(__dirname,'..')+'/';
const B=require(R+'herramientas/base.js');
const{tablasCreadas}=require(R+'herramientas/migrar.js');

let ok=0,mal=0;
const es=(l,g,e)=>{const b=String(g)===String(e);b?ok++:mal++;
  console.log((b?'  OK  ':'  MAL ')+l.padEnd(58)+'= '+g+(b?'':'  (esperado '+e+')'));};

const DIR=R+'supabase/migrations/';
const REALES=fs.readdirSync(DIR).filter(f=>f.endsWith('.sql')&&f!==B.ARCHIVO)
  .map(f=>({nombre:f,sql:fs.readFileSync(DIR+f,'utf8')}));

const tabla=n=>'CREATE TABLE IF NOT EXISTS "public"."'+n+'" (\n    "id" bigint NOT NULL,\n'
  +'    "personal_id" bigint,\n    "fecha" "date"\n);\n'
  +'ALTER TABLE ONLY "public"."'+n+'"\n    ADD CONSTRAINT "'+n+'_pkey" PRIMARY KEY ("id");\n'
  +'ALTER TABLE "public"."'+n+'" ENABLE ROW LEVEL SECURITY;\n';
const VOLCADO='SET statement_timeout = 0;\n'
  +'COMMENT ON SCHEMA "public" IS \'standard public schema\';\n'
  +tabla('tareaje')+tabla('asistencia')+tabla('personal')
  +'CREATE POLICY "leen" ON "public"."tareaje" FOR SELECT TO "authenticated" USING (true);\n'
  +'CREATE OR REPLACE FUNCTION "public"."quien"() RETURNS "uuid" AS $$ '
  +'select id from "auth"."users" limit 1 $$ LANGUAGE sql;\n';

const rev=(sql,o)=>B.revisarEsquema(sql,Object.assign({migraciones:REALES,
  tablasApp:['tareaje','asistencia','personal']},o));

console.log('\n== El formato real del volcado se entiende ==');
// Antes de esto, el seguro de migraciones solo reconocía public.x sin
// comillas: con un volcado de verdad no habría visto ninguna tabla creada.
{
  const c=tablasCreadas(VOLCADO).sort().join(',');
  es('ve las tres tablas entre comillas',c,'asistencia,personal,tareaje');
  es('  y no toma "auth"."users" por una tabla',/auth/.test(c),false);
}

console.log('\n== Un volcado bueno pasa y arregla lo que tenía que arreglar ==');
{
  const r=rev(VOLCADO);
  es('se acepta',r.ok,true);
  es('  sin problemas',r.problemas.join(' · ')||'—','—');
  es('  y las migraciones reales dejan de tener huérfanas',r.ok,true);
}

console.log('\n== Datos no ==');
// Van a un repositorio público. Una sola fila de personal son un DNI, un
// sueldo y una cuenta bancaria.
{
  const ins=rev(VOLCADO+'INSERT INTO "public"."personal" VALUES (1, 7, \'2026-01-01\');\n');
  es('un INSERT se rechaza',ins.ok,false);
  es('  diciendo la línea',/línea \d+/.test(ins.problemas[0]),true);
  const cp=rev(VOLCADO+'COPY "public"."personal" ("id") FROM stdin;\n1\n\\.\n');
  // Por el motivo correcto. Antes se rechazaba igual, pero porque el seguro
  // tomaba "stdin" por una tabla sin crear: el mensaje habría mandado a buscar
  // una tabla que no existe en vez de decir que el volcado trae datos.
  es('un COPY también, por traer datos',cp.problemas.some(p=>/DATOS/.test(p)),true);
  es('  y no por una tabla "stdin"',cp.problemas.some(p=>/stdin/.test(p)),false);
  es('la palabra insert en un comentario no cuenta',
     rev(VOLCADO+'-- aquí no se inserta nada\n').ok,true);
}

console.log('\n== Nada con forma de llave ==');
// Suele colarse en el cuerpo de una función que llama a otra API. Se arma por
// partes: escrita entera, el detector de verificar.js la tomaría por real.
{
  const falsa='sb_'+'secret_'+'InventadaParaLaSuite01';
  const r=rev(VOLCADO+'-- '+falsa+'\n');
  es('una secret se rechaza',r.ok,false);
  es('  sin repetirla en el mensaje',r.problemas.some(p=>p.includes(falsa)),false);
  const jwt='eyJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIn0.firma';
  es('un JWT también',rev(VOLCADO+"select '"+jwt+"';\n").ok,false);
  es('  y se pide rotarla',/rotar/.test(rev(VOLCADO+'-- '+falsa+'\n').problemas[0]),true);
}

console.log('\n== Tiene que arreglar lo que vino a arreglar ==');
{
  const sinTareaje=rev(tabla('asistencia')+tabla('personal'));
  es('sin tareaje no sirve',sinTareaje.ok,false);
  es('  y dice cuál falta',/tareaje/.test(sinTareaje.problemas.join(' ')),true);
  es('un archivo sin tablas no sirve',rev('SET x = 0;\n').ok,false);
  es('  y no se lo trata como un volcado con huecos',
     rev('SET x = 0;\n').problemas.length,1);
}

console.log('\n== La base va antes que todo ==');
{
  const vieja=[{nombre:'20251231000000_antigua.sql',sql:'select 1;'}].concat(REALES);
  es('una migración anterior a la base lo impide',rev(VOLCADO,{migraciones:vieja}).ok,false);
  es('la versión de la base es anterior a las reales',
     REALES.every(m=>m.nombre.split('_')[0]>B.VERSION),true);
}

console.log('\n== Avisos que no bloquean ==');
{
  const r=rev(VOLCADO,{tablasApp:['tareaje','asistencia','personal','val_presupuesto','lps_lookahead']});
  es('tablas que la app usa y el esquema no',/2 tabla/.test(r.avisos.join(' ')),true);
  es('  sin bloquear',r.ok,true);
  const otros=rev('CREATE SCHEMA IF NOT EXISTS "auth";\n'+VOLCADO);
  es('otros esquemas se avisan',/auth/.test(otros.avisos.join(' ')),true);
  es('  sin bloquear',otros.ok,true);
}

console.log('\n== La cabecera dice qué hacer en producción ==');
// Allá las tablas ya existen: sin marcar la base como aplicada, db push
// intentaría crearlas otra vez.
{
  const e=B.envolver(VOLCADO,{fecha:'2026-09-10',origen:'esquema.sql'});
  es('manda marcarla como aplicada',
     e.includes('migration repair --status applied '+B.VERSION),true);
  es('  con la misma versión que el archivo',B.ARCHIVO.startsWith(B.VERSION+'_'),true);
  es('conserva el volcado entero',e.includes(VOLCADO.trim()),true);
  es('quita la marca de orden de bytes de Windows',
     B.envolver('﻿'+VOLCADO,{fecha:'x'}).includes('﻿'),false);
}

console.log('\n'+(mal?'X '+mal+' fallo(s)':'OK todo bien')+'  ·  '+ok+'/'+(ok+mal));
process.exit(mal?1:0);
