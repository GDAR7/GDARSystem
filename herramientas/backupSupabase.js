// ══ RESPALDO COMPLETO DE SUPABASE ═══════════════════════════════════════════
// Baja las 75 tablas a archivos JSON, una por tabla, en una carpeta con la
// fecha del día. No modifica nada en la base: solo lee.
//
//   node herramientas/backupSupabase.js
//
// Las credenciales salen de js/config.js, así que no hay nada que copiar a
// mano ni que se quede desactualizado. Es la misma llave pública que usa el
// navegador, con las mismas políticas RLS: lo que el respaldo puede leer es
// exactamente lo que ve la aplicación.
//
// La descarga es paginada de 1000 en 1000 porque Supabase corta cualquier
// consulta en esa cifra. Sin paginar, una tabla como tareaje (13 mil filas)
// se respaldaría incompleta sin avisar.

const fs=require('fs');
const path=require('path');

const RAIZ=path.join(__dirname,'..');
const CFG=fs.readFileSync(path.join(RAIZ,'js','config.js'),'utf8');

const leerConst=n=>{
  const m=CFG.match(new RegExp('const\\s+'+n+"\\s*=\\s*'([^']+)'"));
  if(!m)throw new Error('No se encontró '+n+' en js/config.js');
  return m[1];
};
const SUPA_URL=leerConst('SUPA_URL');
const SUPA_KEY=leerConst('SUPA_KEY');

const TABLAS=(()=>{
  const m=CFG.match(/const SUPA_TABLES\s*=\s*\{[\s\S]*?\n\};/);
  if(!m)throw new Error('No se encontró SUPA_TABLES en js/config.js');
  const pares=[...m[0].matchAll(/(\w+)\s*:\s*'([^']+)'/g)];
  return [...new Set(pares.map(p=>p[2]))];
})();

const PAGINA=1000;

async function bajarTabla(tabla){
  let todo=[],desde=0;
  while(true){
    const url=SUPA_URL+'/rest/v1/'+tabla+'?select=*&order=id.asc';
    const r=await fetch(url,{headers:{
      apikey:SUPA_KEY,
      Authorization:'Bearer '+SUPA_KEY,
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

(async()=>{
  const hoy=new Date();
  const sello=hoy.getFullYear()+'-'+String(hoy.getMonth()+1).padStart(2,'0')+'-'
    +String(hoy.getDate()).padStart(2,'0')+'_'
    +String(hoy.getHours()).padStart(2,'0')+String(hoy.getMinutes()).padStart(2,'0');
  const dir=path.join(RAIZ,'respaldos','supabase_'+sello);
  fs.mkdirSync(dir,{recursive:true});

  console.log('Respaldo de '+TABLAS.length+' tablas → respaldos/supabase_'+sello+'\n');

  const resumen=[];
  let totalFilas=0,conError=0;
  for(const t of TABLAS){
    process.stdout.write('  '+t.padEnd(24));
    try{
      const filas=await bajarTabla(t);
      fs.writeFileSync(path.join(dir,t+'.json'),JSON.stringify(filas,null,1));
      totalFilas+=filas.length;
      resumen.push({tabla:t,filas:filas.length});
      console.log(String(filas.length).padStart(7)+' filas');
    }catch(e){
      conError++;
      resumen.push({tabla:t,filas:null,error:e.message});
      console.log('  ERROR · '+e.message);
    }
  }

  fs.writeFileSync(path.join(dir,'_resumen.json'),JSON.stringify({
    fecha:hoy.toISOString(),
    origen:SUPA_URL,
    tablas:TABLAS.length,
    filasTotales:totalFilas,
    conError,
    detalle:resumen
  },null,2));

  console.log('\n'+(conError?'⚠ '+conError+' tabla(s) con error · ':'✓ ')
    +totalFilas.toLocaleString('es-PE')+' filas en '+(TABLAS.length-conError)+' tablas');
  console.log('  '+dir);
  if(conError)console.log('  Revise _resumen.json para ver cuáles fallaron.');
  process.exit(conError?1:0);
})().catch(e=>{console.error('\nFalló el respaldo: '+e.message);process.exit(1);});
