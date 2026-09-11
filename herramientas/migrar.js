// ══ MIGRAR CON RED ══════════════════════════════════════════════════════════
// Envuelve `supabase db push` con las comprobaciones que el comando no hace.
//
//   npm run db:push                         al proyecto enlazado, si es dev
//   npm run db:push -- --dry-run            solo muestra qué aplicaría
//   npm run db:push -- --produccion         a producción, respaldando antes
//   npm run db:push -- --produccion --sin-respaldo
//                                           la primera vez de una base vacía,
//                                           que no tiene nada que respaldar
//
// ── Qué impide ─────────────────────────────────────────────────────────────
// `supabase db push` aplica sobre el proyecto que esté enlazado en
// supabase/.temp, sea cual sea, y no pregunta. Tres formas de hacer daño con
// un solo comando:
//
//   1. Migrar un proyecto que este repositorio no reconoce. El enlace queda
//      guardado de la última vez; nadie se acuerda de a cuál apuntaba.
//   2. Migrar producción sin darse cuenta, y sin respaldo. El de ECOSERMO
//      estuvo roto meses: una migración mala no habría tenido vuelta atrás.
//   3. Aplicar migraciones que tocan tablas que ninguna migración creó. Hoy
//      pasa: el índice único toca tareaje y asistencia, y esas tablas se
//      crearon a mano antes de versionar el esquema. Sobre producción
//      funciona por casualidad; sobre una base nueva revienta a medias, y un
//      cliente montado con `db push` recibiría esas migraciones sin ninguna de
//      las tablas que suponen.
//
// El 3 es el que se queda: la regla no es "que haya alguna migración con
// create table" —val_presupuesto ya tiene una— sino que TODA tabla que una
// migración toca la haya creado una migración anterior. Se arregla generando
// la migración base con `npm run db:pull` desde producción.

const fs=require('fs');
const path=require('path');
const{spawnSync}=require('child_process');

const RAIZ=path.join(__dirname,'..');
const C={v:'\x1b[32m',r:'\x1b[31m',a:'\x1b[33m',g:'\x1b[90m',n:'\x1b[1m',x:'\x1b[0m'};

// El ref es el subdominio: https://<ref>.supabase.co
function refDe(url){
  const m=String(url||'').match(/^https:\/\/([a-z0-9]{20})\.supabase\.co/);
  return m?m[1]:null;
}

// ── Qué tablas toca cada migración, y cuáles crea ─────────────────────────
// Se leen con expresiones regulares, no con un parser de SQL. Alcanza porque
// solo importan dos preguntas —qué se crea y qué se usa— y porque el error de
// este lado es el seguro: si algo no se reconoce como creado, se niega a
// migrar y lo dice, en vez de dejar pasar una migración que falla a medias.
const SIN_COMENTARIOS=s=>s.replace(/--[^\n]*/g,'').replace(/\/\*[\s\S]*?\*\//g,'');
// El \b cierra el nombre: sin él, cuando la condición de después falla, el
// motor retrocede una letra y captura "tareaj" en vez de "tareaje". Pasó, y
// fue la ejecución contra las migraciones reales la que lo destapó.
//
// El volcado de `supabase db dump` escribe todo entre comillas —
// "public"."tareaje"—, así que el esquema admite comillas. Y el "no seguido
// de punto" va ANTES de la comilla de cierre: puesto después, en
// "auth"."users" el motor dejaba la comilla sin consumir, el punto ya no
// quedaba justo detrás, y "auth" pasaba por una tabla.
const NOMBRE='(?:"?public"?\\.)?"?([a-z_][a-z0-9_]*)\\b(?!"?\\.)"?';
// Solo tras from/join puede venir una función —unnest(...)— en vez de una
// tabla. En create table y en index ... on, el paréntesis que sigue al nombre
// son las columnas, así que ahí esta condición descartaría la tabla de verdad.
const NO_FUNCION='(?!\\s*\\()';

function tablasCreadas(sql){
  const s=SIN_COMENTARIOS(sql).toLowerCase();
  return[...s.matchAll(new RegExp('create\\s+table\\s+(?:if\\s+not\\s+exists\\s+)?'+NOMBRE,'g'))]
    .map(m=>m[1]);
}

function tablasUsadas(sql){
  const s=SIN_COMENTARIOS(sql).toLowerCase();
  const patrones=[
    'alter\\s+table\\s+(?:if\\s+exists\\s+)?(?:only\\s+)?'+NOMBRE,
    'create\\s+(?:unique\\s+)?index\\s+(?:concurrently\\s+)?(?:if\\s+not\\s+exists\\s+)?\\w*\\s*on\\s+(?:only\\s+)?'+NOMBRE,
    'create\\s+policy\\s+(?:"[^"]*"|\\w+)\\s+on\\s+'+NOMBRE,
    '\\bfrom\\s+(?:only\\s+)?'+NOMBRE+NO_FUNCION,
    '\\bjoin\\s+'+NOMBRE+NO_FUNCION,
    'insert\\s+into\\s+'+NOMBRE,
    '\\bupdate\\s+'+NOMBRE+'\\s+set\\b'
  ];
  const usadas=new Set();
  for(const p of patrones)
    for(const m of s.matchAll(new RegExp(p,'g')))
      if(!NO_SON_TABLAS.has(m[1]))usadas.add(m[1]);
  return[...usadas];
}

// Palabras que pueden venir detrás de un from sin ser una tabla. `COPY x FROM
// stdin` es el caso que lo destapó: el volcado con datos se rechazaba igual,
// pero diciendo "falta la tabla stdin" en vez de "trae datos".
const NO_SON_TABLAS=new Set(['stdin','stdout','only','lateral','select']);

// Recorre las migraciones en orden y devuelve, para cada una, las tablas que
// usa sin que nadie las haya creado antes (o en ella misma).
function tablasHuerfanas(migraciones){
  const creadas=new Set();
  const huerfanas=[];
  for(const m of [...migraciones].sort((a,b)=>a.nombre.localeCompare(b.nombre))){
    tablasCreadas(m.sql).forEach(t=>creadas.add(t));
    const faltan=tablasUsadas(m.sql).filter(t=>!creadas.has(t));
    if(faltan.length)huerfanas.push({migracion:m.nombre,tablas:faltan});
  }
  return huerfanas;
}

// ── La decisión, separada de todo lo que toca disco o red ─────────────────
function decidir({enlazado,prod,dev,migraciones,flags}){
  const f=new Set(flags||[]);
  if(!enlazado)
    return{ok:false,motivo:'No hay ningún proyecto enlazado.',
           arreglo:'npx supabase link --project-ref <ref>'};

  const destino=enlazado===prod?'produccion':enlazado===dev?'desarrollo':'desconocido';
  if(destino==='desconocido')
    return{ok:false,destino,
      motivo:'El proyecto enlazado ('+enlazado+') no es ni SUPA_URL_PROD ni SUPA_URL_DEV '
        +'de js/empresa.js. No se migra una base que este repositorio no reconoce.',
      arreglo:'npx supabase link --project-ref '+(dev||'<ref de desarrollo>')};

  const huerfanas=tablasHuerfanas(migraciones);
  if(huerfanas.length)
    return{ok:false,destino,huerfanas,
      motivo:'Hay migraciones que tocan tablas que ninguna migración anterior crea. '
        +'Falta la migración base: el esquema de las tablas que ya existían nunca se versionó.',
      arreglo:'npm run db:pull   (enlazado a producción, genera la migración base)'};

  if(destino==='produccion'&&!f.has('--produccion'))
    return{ok:false,destino,
      motivo:'El proyecto enlazado es PRODUCCIÓN. Hay que pedirlo explícitamente.',
      arreglo:'npm run db:push -- --produccion'};

  const seco=f.has('--dry-run');
  return{ok:true,destino,seco,
    respaldar:destino==='produccion'&&!seco&&!f.has('--sin-respaldo')};
}

// ── Leer el estado real ────────────────────────────────────────────────────
function estado(){
  const leer=p=>{try{return fs.readFileSync(path.join(RAIZ,p),'utf8');}catch(e){return'';}};
  const emp=leer('js/empresa.js');
  const url=n=>{const m=emp.match(new RegExp('const\\s+'+n+"\\s*=\\s*'([^']+)'"));return m?m[1]:null;};
  const dir=path.join(RAIZ,'supabase','migrations');
  const migraciones=fs.existsSync(dir)
    ?fs.readdirSync(dir).filter(f=>f.endsWith('.sql'))
       .map(f=>({nombre:f,sql:fs.readFileSync(path.join(dir,f),'utf8')}))
    :[];
  return{
    enlazado:leer('supabase/.temp/project-ref').trim()||null,
    prod:refDe(url('SUPA_URL_PROD')),
    dev:refDe(url('SUPA_URL_DEV')),
    migraciones
  };
}

function principal(){
  const flags=process.argv.slice(2);
  const e=estado();
  const d=decidir({...e,flags});
  const nombre={produccion:'PRODUCCIÓN',desarrollo:'DESARROLLO',desconocido:'DESCONOCIDO'};

  console.log('\n'+C.n+'Migrar'+C.x+C.g+'  ·  enlazado: '+(e.enlazado||'ninguno')
    +(d.destino?'  ('+nombre[d.destino]+')':'')+C.x);

  if(!d.ok){
    console.log('\n  '+C.r+'No se migra.'+C.x+' '+d.motivo);
    (d.huerfanas||[]).forEach(h=>
      console.log('       '+C.g+h.migracion+C.x+'  usa '+h.tablas.join(', ')));
    console.log('\n  '+C.g+'Siguiente paso:'+C.x+' '+d.arreglo+'\n');
    return 1;
  }

  if(d.respaldar){
    console.log('\n  Respaldo de producción antes de tocar el esquema…');
    const r=spawnSync(process.execPath,[path.join(__dirname,'backupSupabase.js')],{stdio:'inherit'});
    if(r.status!==0){
      console.log('\n  '+C.r+'El respaldo no salió bien, así que no se migra.'+C.x
        +' Sin respaldo, una migración mala no tiene vuelta atrás.\n');
      return 1;
    }
  }

  const args=['supabase','db','push'].concat(d.seco?['--dry-run']:[]);
  console.log('\n  '+C.g+'npx '+args.join(' ')+C.x+'\n');
  const r=spawnSync('npx',args,{stdio:'inherit',shell:process.platform==='win32'});
  return r.status===null?1:r.status;
}

if(require.main===module)process.exit(principal());

module.exports={decidir,tablasCreadas,tablasUsadas,tablasHuerfanas,refDe};
