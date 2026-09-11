// ══ LA MIGRACIÓN BASE, A PARTIR DEL ESQUEMA DE PRODUCCIÓN ═══════════════════
//
//   node herramientas/base.js esquema.sql
//
// Las 76 tablas de producción se crearon a mano antes de versionar el
// esquema, así que ninguna migración las crea. Sin eso no se puede migrar
// nada: el índice único toca tareaje y asistencia, y sobre una base vacía
// —gdar-dev, o la de un cliente nuevo— esas tablas no existen.
//
// Lo que hace falta de producción es SOLO LA ESTRUCTURA: tablas, columnas,
// índices y políticas, sin una sola fila. Quien tenga acceso la saca con
//
//   npx supabase db dump --project-ref <ref> --schema public -f esquema.sql
//
// y esta herramienta la revisa antes de ponerla en supabase/migrations/,
// que va a un repositorio PÚBLICO:
//
//   · que no traiga datos (INSERT, COPY): serían DNI y sueldos;
//   · que no haya nada con forma de llave, que a veces se cuela en el cuerpo
//     de una función;
//   · que cree las tablas que las migraciones existentes tocan: si no, no
//     arregla lo que vino a arreglar.
//
// Que la estructura quede pública no expone nada nuevo: los nombres de tablas
// y columnas ya viajan en el JavaScript de la aplicación, y lo que protege
// los datos son las políticas RLS, no que nadie sepa cómo se llaman.

const fs=require('fs');
const path=require('path');
const{tablasCreadas,tablasHuerfanas}=require('./migrar');

const RAIZ=path.join(__dirname,'..');
const DIR=path.join(RAIZ,'supabase','migrations');
const C={v:'\x1b[32m',r:'\x1b[31m',a:'\x1b[33m',g:'\x1b[90m',n:'\x1b[1m',x:'\x1b[0m'};

// Anterior a todas las migraciones: la base tiene que correr primero.
const VERSION='20260101000000';
const ARCHIVO=VERSION+'_esquema_base.sql';

// ── Revisar el volcado ─────────────────────────────────────────────────────
// Ningún mensaje repite lo que encontró: si fuera una llave, la pantalla la
// mostraría. Se dice la línea, y basta.
function revisarEsquema(sql,{migraciones,tablasApp}){
  const problemas=[],avisos=[];
  const lineas=String(sql||'').split(/\r?\n/);
  const lineaDe=re=>{const i=lineas.findIndex(l=>re.test(l));return i<0?null:i+1;};

  const datos=lineaDe(/^\s*(insert\s+into\b|copy\s+.+\bfrom\s+stdin)/i);
  if(datos)
    problemas.push('Trae DATOS (línea '+datos+'). Esto va a un repositorio público: serían los '
      +'DNI y los sueldos de la gente. Hace falta el volcado de solo estructura, sin --data-only.');

  const llave=lineaDe(/sb_secret_[A-Za-z0-9]{10}|eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/);
  if(llave)
    problemas.push('Hay algo con forma de llave en la línea '+llave+'. Suele venir del cuerpo de una '
      +'función. Hay que sacarlo de ahí, y rotar esa llave: ya pasó por más manos de las debidas.');

  const creadas=new Set(tablasCreadas(sql));
  if(!creadas.size)
    problemas.push('No crea ninguna tabla. ¿Es el volcado del esquema public de producción?');

  // Lo que vino a arreglar: con esta base delante, ninguna migración existente
  // debe tocar una tabla que nadie creó.
  const huerf=tablasHuerfanas([{nombre:ARCHIVO,sql},...(migraciones||[])]);
  if(creadas.size&&huerf.length)
    problemas.push('Aun con esta base faltan tablas: '
      +huerf.map(h=>h.migracion+' usa '+h.tablas.join(', ')).join(' · '));

  const primera=(migraciones||[]).map(m=>m.nombre).sort()[0];
  if(primera&&primera.split('_')[0]<=VERSION)
    problemas.push('Ya hay una migración con versión '+primera.split('_')[0]
      +', anterior o igual a la de la base ('+VERSION+'). La base tiene que ir primero.');

  if(creadas.size){
    const faltan=(tablasApp||[]).filter(t=>!creadas.has(t));
    if(faltan.length)
      avisos.push(faltan.length+' tabla(s) que la aplicación usa no están en el esquema: '
        +faltan.join(', ')+'. Si el volcado es de producción, esos módulos tampoco funcionan allá.');
  }

  const otros=[...String(sql||'').matchAll(/create\s+schema\s+(?:if\s+not\s+exists\s+)?"?([a-z_]+)"?/gi)]
    .map(m=>m[1].toLowerCase()).filter(s=>s!=='public');
  if(otros.length)
    avisos.push('Trae otros esquemas ('+[...new Set(otros)].join(', ')+'). Los administra Supabase; '
      +'conviene sacar el volcado con --schema public.');

  return{ok:!problemas.length,problemas,avisos,creadas:[...creadas]};
}

// La cabecera explica de dónde salió y, sobre todo, el paso que hay que dar en
// producción: ahí estas tablas YA existen, y sin marcar la base como aplicada
// `db push` intentaría crearlas otra vez.
function envolver(sql,{fecha,origen}){
  return[
    '-- ══ ESQUEMA BASE ═════════════════════════════════════════════════════════════',
    '--',
    '-- Solo la estructura de producción —tablas, columnas, índices y políticas—, sin',
    '-- una sola fila. Existía antes de que el esquema se versionara; esta migración',
    '-- es la que permite crear una base igual desde cero: gdar-dev, o la de un',
    '-- cliente nuevo.',
    '--',
    '-- Recibida el '+fecha+(origen?' · '+origen:'')+'. Revisada por herramientas/base.js.',
    '--',
    '-- ⚠ EN PRODUCCIÓN ESTAS TABLAS YA EXISTEN. Antes del primer db push allí:',
    '--',
    '--     npx supabase migration repair --status applied '+VERSION,
    '--',
    '--   Sin eso, db push intentaría crearlas otra vez y fallaría a la primera',
    '--   restricción repetida.',
    '',
    // trim() también quita la marca de orden de bytes (U+FEFF) que deja un
    // archivo guardado con el Bloc de notas.
    String(sql).trim(),
    ''
  ].join('\n');
}

function tablasDeLaApp(){
  const cfg=fs.readFileSync(path.join(RAIZ,'js','config.js'),'utf8');
  const m=cfg.match(/const SUPA_TABLES\s*=\s*\{[\s\S]*?\n\};/);
  if(!m)return[];
  return[...new Set([...m[0].matchAll(/(\w+)\s*:\s*'([^']+)'/g)].map(p=>p[2]))];
}

function principal(){
  const entrada=process.argv[2];
  if(!entrada||entrada.startsWith('--')){
    console.log('\n  Uso: node herramientas/base.js esquema.sql\n'
      +C.g+'  El archivo sale de: npx supabase db dump --project-ref <ref> --schema public -f esquema.sql'+C.x+'\n');
    return 2;
  }
  let sql;
  try{ sql=fs.readFileSync(path.resolve(entrada),'utf8'); }
  catch(e){ console.log('\n  '+C.r+'No se pudo leer '+entrada+C.x+'\n'); return 1; }

  const migraciones=fs.readdirSync(DIR).filter(f=>f.endsWith('.sql')&&f!==ARCHIVO)
    .map(f=>({nombre:f,sql:fs.readFileSync(path.join(DIR,f),'utf8')}));
  const r=revisarEsquema(sql,{migraciones,tablasApp:tablasDeLaApp()});

  console.log('\n'+C.n+'Esquema base'+C.x+C.g+'  ·  '+r.creadas.length+' tablas'+C.x);
  r.problemas.forEach(p=>console.log('  '+C.r+'MAL'+C.x+'  '+p));
  r.avisos.forEach(a=>console.log('  '+C.a+'··'+C.x+'   '+a));
  if(!r.ok){ console.log('\n  '+C.r+'No se instala.'+C.x+'\n'); return 1; }

  const destino=path.join(DIR,ARCHIVO);
  if(fs.existsSync(destino)&&!process.argv.includes('--reemplazar')){
    console.log('\n  '+C.a+'Ya hay una base en '+ARCHIVO+'.'+C.x+' Para cambiarla: --reemplazar\n');
    return 1;
  }
  fs.writeFileSync(destino,envolver(sql,{fecha:new Date().toISOString().slice(0,10),
    origen:path.basename(entrada)}),'utf8');

  console.log('  '+C.v+'OK'+C.x+'   instalada como supabase/migrations/'+ARCHIVO);
  console.log('\n  Siguiente:');
  console.log('   '+C.g+'1.'+C.x+' npm test');
  console.log('   '+C.g+'2.'+C.x+' en gdar-dev, que está vacía:   npm run db:push');
  console.log('   '+C.g+'3.'+C.x+' en producción, ANTES de nada:  npx supabase migration repair --status applied '+VERSION);
  console.log('      '+C.g+'y después:'+C.x+'                    npm run db:push -- --produccion\n');
  return 0;
}

if(require.main===module)process.exit(principal());

module.exports={revisarEsquema,envolver,VERSION,ARCHIVO};
