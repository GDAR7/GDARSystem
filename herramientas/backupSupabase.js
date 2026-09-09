// ══ RESPALDO COMPLETO DE SUPABASE ═══════════════════════════════════════════
// Baja todas las tablas a archivos JSON, una por tabla, en una carpeta con la
// fecha del día. No modifica nada en la base: solo lee.
//
//   node herramientas/backupSupabase.js          respalda PRODUCCIÓN
//   node herramientas/backupSupabase.js --dev    respalda la base de desarrollo
//
// ── Por qué ya no usa la llave pública ────────────────────────────────────
// Antes leía con la misma llave que el navegador, con el argumento de que "lo
// que el respaldo puede leer es lo que ve la aplicación". Eso dejó de ser
// cierto el día que se cerró RLS: sin sesión iniciada, esa llave no lee NI UNA
// FILA, y el respaldo escribía setenta y cinco archivos con listas vacías e
// informaba que todo había salido bien. Un respaldo que miente es peor que no
// tener respaldo, porque nadie va a revisarlo hasta que haga falta.
//
// Ahora lee con la service_role, que salta las políticas RLS. Esa llave da
// acceso total: si se filtra, se filtra todo. Por eso NO vive en el
// repositorio, que además es público.
//
//   herramientas/.credenciales.json   (está en .gitignore)
//   { "prod_service_key": "...", "dev_service_key": "..." }
//
// O en el entorno: GDAR_SERVICE_KEY / GDAR_SERVICE_KEY_DEV.
//
// ── Qué comprueba antes de decir que salió bien ───────────────────────────
//  1. Que la llave sea de verdad una service_role. Con la publicable se niega
//     a empezar, en vez de bajar el vacío que la trajo hasta aquí.
//  2. Que no hayan vuelto TODAS las tablas vacías. Es la firma exacta de un
//     problema de permisos, no de una base sin datos.
//  3. Que ninguna tabla que tenía filas en el respaldo anterior venga hoy en
//     cero. Es lo que detecta un borrado accidental o un permiso que cambió.
//
// La descarga es paginada de 1000 en 1000 porque Supabase corta cualquier
// consulta en esa cifra. Sin paginar, una tabla como tareaje (13 mil filas)
// se respaldaría incompleta sin avisar.

const fs=require('fs');
const path=require('path');

const RAIZ=path.join(__dirname,'..');
const DEV=process.argv.includes('--dev');
const ENTORNO=DEV?'DESARROLLO':'PRODUCCIÓN';

// ── De dónde sale cada cosa ────────────────────────────────────────────────
// La URL vive en js/empresa.js, que es lo que cambia entre clientes.
// La lista de tablas vive en js/config.js, que es igual para todos.
const EMP=fs.readFileSync(path.join(RAIZ,'js','empresa.js'),'utf8');
const CFG=fs.readFileSync(path.join(RAIZ,'js','config.js'),'utf8');

const SUPA_URL=(()=>{
  const n='SUPA_URL'+(DEV?'_DEV':'_PROD');
  const m=EMP.match(new RegExp('const\\s+'+n+"\\s*=\\s*'([^']+)'"));
  if(!m)throw new Error('No se encontró '+n+' en js/empresa.js');
  return m[1].replace(/\/+$/,'');
})();

const TABLAS=(()=>{
  const m=CFG.match(/const SUPA_TABLES\s*=\s*\{[\s\S]*?\n\};/);
  if(!m)throw new Error('No se encontró SUPA_TABLES en js/config.js');
  const pares=[...m[0].matchAll(/(\w+)\s*:\s*'([^']+)'/g)];
  return [...new Set(pares.map(p=>p[2]))];
})();

// ── La llave, y la comprobación de que es la correcta ──────────────────────
const CRED=path.join(__dirname,'.credenciales.json');

function servicio(){
  const varEnt=DEV?'GDAR_SERVICE_KEY_DEV':'GDAR_SERVICE_KEY';
  const campo =DEV?'dev_service_key':'prod_service_key';
  let key=process.env[varEnt];
  if(!key&&fs.existsSync(CRED)){
    try{key=JSON.parse(fs.readFileSync(CRED,'utf8'))[campo];}
    catch(e){console.error('herramientas/.credenciales.json no es JSON válido: '+e.message);process.exit(1);}
  }
  if(!key){
    console.error(
      '\nNo encuentro la service_role key de '+ENTORNO+'.\n\n'+
      'Agréguela a herramientas/.credenciales.json:\n\n'+
      '  {\n'+
      '    "'+campo+'": "la service_role key"\n'+
      '  }\n\n'+
      'La saca de Supabase → Settings → API → service_role.\n'+
      'Ese archivo está en .gitignore: el repositorio es público y esa llave\n'+
      'da acceso total a los datos. También sirve la variable '+varEnt+'.\n');
    process.exit(1);
  }
  return key;
}

// El error que dejó el respaldo roto sin que nadie se enterara fue exactamente
// este: usar la llave pública. Se comprueba antes de bajar nada.
function comprobarLlave(key){
  if(key.startsWith('sb_publishable_')){
    console.error('\nEsa es la llave PUBLICABLE, no la service_role.\n'+
      'Con RLS cerrado no lee ninguna fila y el respaldo saldría vacío.\n'+
      'Busque la que dice service_role en Supabase → Settings → API.\n');
    process.exit(1);
  }
  if(key.startsWith('eyJ')){
    try{
      const carga=JSON.parse(Buffer.from(key.split('.')[1],'base64').toString());
      if(carga.role&&carga.role!=='service_role'){
        console.error('\nEsa llave es de rol "'+carga.role+'", no service_role.\n'+
          'Con RLS cerrado no lee ninguna fila y el respaldo saldría vacío.\n');
        process.exit(1);
      }
    }catch(e){/* si no se puede leer, que lo diga la primera petición */}
  }
}

const PAGINA=1000;

async function bajarTabla(tabla,key){
  let todo=[],desde=0;
  while(true){
    const url=SUPA_URL+'/rest/v1/'+tabla+'?select=*&order=id.asc';
    const r=await fetch(url,{headers:{
      apikey:key,
      Authorization:'Bearer '+key,
      Range:desde+'-'+(desde+PAGINA-1)
    }});
    if(!r.ok)throw new Error('HTTP '+r.status+' · '+(await r.text()).slice(0,160));
    const filas=await r.json();
    if(!Array.isArray(filas))throw new Error('respuesta inesperada');
    todo=todo.concat(filas);
    if(filas.length<PAGINA)break;      // la última página vino corta: ya está todo
    desde+=PAGINA;
  }
  return todo;
}

// ── El respaldo anterior, para comparar ────────────────────────────────────
// Solo se compara contra uno del MISMO origen: si no, respaldar desarrollo
// después de producción daría una caída falsa en todas las tablas.
//
// Y solo contra uno que HAYA TRAÍDO DATOS. El primer intento de esta función
// se comparaba contra el respaldo más reciente sin mirar si servía, y eligió
// uno donde las 75 tablas habían fallado: comparar contra el vacío no detecta
// ningún vaciado. Se salta los que no trajeron ni una fila.
function respaldoAnterior(){
  const base=path.join(RAIZ,'respaldos');
  if(!fs.existsSync(base))return null;
  const previos=fs.readdirSync(base)
    .filter(d=>d.startsWith('supabase_'))
    .map(d=>path.join(base,d))
    .filter(d=>fs.existsSync(path.join(d,'_resumen.json')))
    .sort()
    .reverse();
  for(const dir of previos){
    try{
      const r=JSON.parse(fs.readFileSync(path.join(dir,'_resumen.json'),'utf8'));
      if(r.origen===SUPA_URL&&Array.isArray(r.detalle)&&r.filasTotales>0
         &&r.valido!==false){
        const porTabla={};
        r.detalle.forEach(d=>{if(typeof d.filas==='number')porTabla[d.tabla]=d.filas;});
        return{dir:path.basename(dir),fecha:r.fecha,porTabla};
      }
    }catch(e){/* resumen ilegible: se busca el siguiente */}
  }
  return null;
}

(async()=>{
  const key=servicio();
  comprobarLlave(key);

  const anterior=respaldoAnterior();
  const hoy=new Date();
  const sello=hoy.getFullYear()+'-'+String(hoy.getMonth()+1).padStart(2,'0')+'-'
    +String(hoy.getDate()).padStart(2,'0')+'_'
    +String(hoy.getHours()).padStart(2,'0')+String(hoy.getMinutes()).padStart(2,'0');
  const dir=path.join(RAIZ,'respaldos','supabase_'+sello);
  fs.mkdirSync(dir,{recursive:true});

  console.log('\nRespaldo de '+ENTORNO+' · '+TABLAS.length+' tablas');
  console.log('  '+SUPA_URL);
  console.log('  → respaldos/supabase_'+sello);
  console.log(anterior?'  comparando contra '+anterior.dir+'\n'
                      :'  no hay respaldo anterior de este origen\n');

  const resumen=[];
  let totalFilas=0,conError=0;
  const vaciadas=[];      // tenían filas antes y hoy vinieron en cero
  const cayeron=[];       // perdieron más de un tercio

  for(const t of TABLAS){
    process.stdout.write('  '+t.padEnd(24));
    try{
      const filas=await bajarTabla(t,key);
      fs.writeFileSync(path.join(dir,t+'.json'),JSON.stringify(filas,null,1));
      totalFilas+=filas.length;
      resumen.push({tabla:t,filas:filas.length});

      const antes=anterior&&anterior.porTabla[t];
      let nota='';
      if(typeof antes==='number'&&antes>0){
        if(filas.length===0){vaciadas.push({tabla:t,antes});nota='  ⚠ antes tenía '+antes;}
        else if(filas.length<antes*0.67){cayeron.push({tabla:t,antes,ahora:filas.length});
          nota='  ⚠ antes '+antes;}
      }
      console.log(String(filas.length).padStart(7)+' filas'+nota);
    }catch(e){
      conError++;
      resumen.push({tabla:t,filas:null,error:e.message});
      console.log('  ERROR · '+e.message);
    }
  }

  // ── Veredicto ────────────────────────────────────────────────────────────
  // Se decide ANTES de escribir el resumen, porque el resumen tiene que dejar
  // constancia de si este respaldo sirve. Si no lo hiciera, un respaldo malo
  // pasaría a ser la línea base de comparación de mañana y la alarma dejaría
  // de sonar en la segunda corrida: el vaciado se detectaría una sola vez y
  // después quedaría aceptado en silencio.
  const leidas=TABLAS.length-conError;
  const malo = (leidas>0&&totalFilas===0) || vaciadas.length>0 || conError>0;

  fs.writeFileSync(path.join(dir,'_resumen.json'),JSON.stringify({
    fecha:hoy.toISOString(),
    entorno:ENTORNO,
    origen:SUPA_URL,
    valido:!malo,
    tablas:TABLAS.length,
    filasTotales:totalFilas,
    conError,
    comparadoCon:anterior?anterior.dir:null,
    vaciadas,
    cayeron,
    detalle:resumen
  },null,2));

  console.log('\n'+totalFilas.toLocaleString('es-PE')+' filas en '+leidas+' tablas');
  console.log('  '+dir);

  if(leidas>0&&totalFilas===0){
    console.error('\n✗ RESPALDO INVÁLIDO: todas las tablas vinieron vacías.');
    console.error('  Eso no es una base sin datos, es un problema de permisos.');
    console.error('  Compruebe que la llave sea la service_role de este proyecto.');
  }

  if(vaciadas.length){
    console.error('\n✗ '+vaciadas.length+' tabla(s) tenían filas y hoy vinieron en cero:');
    vaciadas.forEach(v=>console.error('    '+v.tabla+'  (antes '+v.antes+')'));
    console.error('  Revise antes de confiar en este respaldo.');
  }

  if(cayeron.length){
    console.log('\n⚠ '+cayeron.length+' tabla(s) perdieron más de un tercio de sus filas:');
    cayeron.forEach(c=>console.log('    '+c.tabla+'  '+c.antes+' → '+c.ahora));
    console.log('  Puede ser normal si se depuró algo; conviene mirarlo.');
  }

  if(conError){
    console.error('\n✗ '+conError+' tabla(s) con error. Vea _resumen.json.');
  }

  if(!malo)console.log('\n✓ Respaldo completo y verificado.');
  process.exit(malo?1:0);
})().catch(e=>{console.error('\nFalló el respaldo: '+e.message);process.exit(1);});
