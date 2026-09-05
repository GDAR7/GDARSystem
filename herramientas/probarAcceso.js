// ══ ¿LOS DATOS ESTÁN EXPUESTOS? ═════════════════════════════════════════════
// Intenta leer las tablas sensibles con la MISMA llave pública que va dentro
// del JavaScript de la aplicación, y sin iniciar sesión. Es exactamente lo que
// podría hacer cualquiera que abra el sistema y copie esa llave.
//
//   node herramientas/probarAcceso.js
//
// Qué esperar:
//   Antes de cerrar RLS  → devuelve datos reales. Eso es el problema.
//   Después              → devuelve listas vacías. Eso es el arreglo.
//
// La llave pública se lee de js/empresa.js: es la misma que sirve el sitio, así
// que la prueba refleja la realidad y no una suposición.
//
// No modifica nada: solo lee.

const fs=require('fs');
const path=require('path');

const RAIZ=path.join(__dirname,'..');
const _E=String.fromCharCode(27);
const C={verde:_E+'[32m',rojo:_E+'[31m',gris:_E+'[90m',neg:_E+'[1m',fin:_E+'[0m'};

function config(){
  const src=fs.readFileSync(path.join(RAIZ,'js','empresa.js'),'utf8');
  const url=src.match(/const SUPA_URL\s*=\s*'([^']+)'/);
  const key=src.match(/const SUPA_KEY\s*=\s*'([^']+)'/);
  const modo=src.match(/const AUTH_MODO\s*=\s*'([^']+)'/);
  if(!url||!key)throw new Error('No encontré SUPA_URL / SUPA_KEY en js/empresa.js');
  return{url:url[1].replace(/\/+$/,''),key:key[1],modo:modo?modo[1]:'(sin definir)'};
}

// Las que más duelen si se filtran, con las columnas que lo dejan claro.
const TABLAS=[
  ['personal',        'dni,nom,ape,sue,banco,cuenta', 'DNI, sueldo y cuenta bancaria'],
  ['planilla_mes',    '*',                            'sueldos del mes'],
  ['planilla_cerrada','*',                            'planillas cerradas'],
  ['renta5ta',        '*',                            'renta de 5ta'],
  ['social',          '*',                            'datos familiares'],
  ['facturas_pago',   '*',                            'facturas y montos']
];

(async()=>{
  const{url,key,modo}=config();
  console.log('\n'+C.neg+'Prueba de acceso público'+C.fin);
  console.log(C.gris+'  Con la llave pública, sin iniciar sesión.'+C.fin);
  console.log(C.gris+'  AUTH_MODO en js/empresa.js: '+modo+C.fin+'\n');

  let expuestas=0, cerradas=0, errores=0;
  for(const[tabla,cols,que]of TABLAS){
    process.stdout.write('  '+tabla.padEnd(20));
    try{
      const r=await fetch(url+'/rest/v1/'+tabla+'?select='+cols+'&limit=3',
        {headers:{apikey:key,Authorization:'Bearer '+key}});
      const txt=await r.text();
      if(!r.ok){
        // 401/403 con RLS activo es justamente lo que se busca
        cerradas++;
        console.log(C.verde+'cerrada'+C.fin+C.gris+'   HTTP '+r.status+C.fin);
        continue;
      }
      const filas=JSON.parse(txt);
      if(Array.isArray(filas)&&filas.length===0){
        cerradas++;
        console.log(C.verde+'cerrada'+C.fin+C.gris+'   devuelve lista vacía'+C.fin);
      }else{
        expuestas++;
        console.log(C.rojo+'EXPUESTA'+C.fin+'  '+filas.length+'+ filas · '+que);
      }
    }catch(e){
      errores++;
      console.log(C.gris+'sin respuesta ('+(e.cause&&e.cause.code||e.message).slice(0,40)+')'+C.fin);
    }
  }

  console.log('');
  if(expuestas){
    console.log(C.rojo+'  '+expuestas+' tabla(s) legibles por cualquiera.'+C.fin);
    console.log('  Cualquier persona con la llave del JavaScript puede leer esos datos,');
    console.log('  y también modificarlos o borrarlos.');
    console.log(C.gris+'  El arreglo: migrar a Auth y correr sql/rls_cerrar.sql'+C.fin+'\n');
    process.exit(1);
  }
  if(errores&&!cerradas){
    console.log(C.gris+'  No hubo respuesta: revise la conexión antes de sacar conclusiones.'+C.fin+'\n');
    process.exit(2);
  }
  console.log(C.verde+'  Ninguna tabla responde a la llave pública sin sesión.'+C.fin);
  console.log(C.gris+'  Compruebe ahora que la aplicación SÍ funciona entrando con su credencial:'+C.fin);
  console.log(C.gris+'  si el sistema tampoco puede leer, algo quedó mal y toca'+C.fin);
  console.log(C.gris+'  sql/rls_revertir.sql + AUTH_MODO=\'local\'.'+C.fin+'\n');
})().catch(e=>{console.error('\nFalló: '+e.message+'\n');process.exit(1);});
