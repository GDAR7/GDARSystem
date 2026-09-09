// ══ VARIABLES DE ENTORNO ════════════════════════════════════════════════════
// Carga el archivo .env de la raíz del repositorio en process.env, para que
// las herramientas lean sus credenciales de un solo sitio y con la convención
// que todo el mundo espera.
//
//   require('./entorno');            // al principio de cada herramienta
//
// Antes cada herramienta traía su propia función para leer un
// herramientas/.credenciales.json, y eran cinco copias de lo mismo con
// mensajes de error distintos. El nombre .env además es el que reconocen las
// otras piezas: .gitignore ya lo tapa, auditarSecretos.js ya lo revisa, y
// GitHub Actions inyecta secretos por esta misma vía.
//
// ── Lo que ya está en el entorno gana ─────────────────────────────────────
// Una variable que ya existe NO se pisa. Así, en GitHub Actions los secretos
// del workflow mandan sobre cualquier .env que pudiera aparecer, y en local
// se puede probar una credencial suelta sin editar el archivo:
//
//   GDAR_SERVICE_KEY=otra node herramientas/backupSupabase.js
//
// ⚠ .env NUNCA se sube. Está en .gitignore y el repositorio es público: una
//   service_role filtrada salta todas las políticas RLS. La plantilla sin
//   valores es .env.example, y esa sí se versiona.

const fs=require('fs');
const path=require('path');

const RAIZ=path.join(__dirname,'..');

// Se miran los dos sitios: la raíz es donde va, y herramientas/.env se acepta
// porque .gitignore y auditarSecretos.js ya lo contemplaban.
//
// GDAR_ENV_FILE apunta a otro archivo, o a ninguno. Sirve para probar una
// configuración distinta sin tocar la de siempre, y es lo que usa pruebas/
// para no depender de si la máquina tiene un .env o no: una suite que pasa o
// falla según lo que haya en el disco de quien la corre no prueba nada.
const CANDIDATOS=process.env.GDAR_ENV_FILE
  ? [process.env.GDAR_ENV_FILE]
  : [path.join(RAIZ,'.env'),path.join(__dirname,'.env')];

// Formato de siempre: CLAVE=valor, una por línea. Admite comillas alrededor
// del valor, comentarios con # y un `export` delante que se ignora.
function parsear(texto){
  const out={};
  for(let linea of texto.split(/\r?\n/)){
    linea=linea.trim();
    if(!linea||linea.startsWith('#'))continue;
    if(linea.startsWith('export '))linea=linea.slice(7).trim();
    const i=linea.indexOf('=');
    if(i<1)continue;
    const clave=linea.slice(0,i).trim();
    let valor=linea.slice(i+1).trim();
    const c=valor[0];
    if((c==='"'||c==="'")&&valor[valor.length-1]===c)valor=valor.slice(1,-1);
    out[clave]=valor;
  }
  return out;
}

let cargados=[];
for(const archivo of CANDIDATOS){
  if(!fs.existsSync(archivo))continue;
  try{
    const vars=parsear(fs.readFileSync(archivo,'utf8'));
    for(const[k,v]of Object.entries(vars))
      if(process.env[k]===undefined)process.env[k]=v;   // el entorno manda
    cargados.push(path.relative(RAIZ,archivo).replace(/\\/g,'/'));
  }catch(e){
    console.warn('No se pudo leer '+archivo+': '+e.message);
  }
}

// Mensaje único para cuando falta una credencial. Antes cada herramienta
// escribía el suyo y decían cosas distintas del mismo problema.
function exigir(...nombres){
  const faltan=nombres.filter(n=>!process.env[n]);
  if(!faltan.length)return nombres.map(n=>process.env[n]);
  console.error(
    '\nFaltan variables de entorno:\n'+
    faltan.map(n=>'  - '+n).join('\n')+'\n\n'+
    'Copie .env.example a .env en la raíz del repositorio y rellene lo que\n'+
    'necesite. Las llaves salen de Supabase → Settings → API.\n\n'+
    '.env está en .gitignore y nunca debe subirse: el repositorio es público\n'+
    'y una service_role filtrada da acceso a todos los datos.\n'+
    (fs.existsSync(path.join(__dirname,'.credenciales.json'))
      ? '\nAviso: existe herramientas/.credenciales.json, que es el formato\n'+
        'anterior y ya no se lee. Pase sus valores a .env y bórrelo.\n' : '')
  );
  process.exit(1);
}

module.exports={exigir,cargados};
