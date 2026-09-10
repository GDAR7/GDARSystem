// ══ DUPLICADOS DE PERSONA Y DÍA ═════════════════════════════════════════════
// Cuenta y clasifica las filas repetidas de tareaje y asistencia antes de
// aplicar el índice único de supabase/migrations/20260909235900.
//
//   node herramientas/duplicados.js            diagnóstico
//   node herramientas/duplicados.js --csv      además, la lista a un archivo
//
// ── Por qué hace falta ────────────────────────────────────────────────────
// Dos personas tareando la misma celda desde equipos distintos crean dos
// filas: cada navegador busca el registro en SU copia local, y si el otro lo
// grabó después, no lo encuentra y crea otro. Nada en la base lo impide, y por
// eso existe js/tareajeDup.js, un módulo entero para limpiar después.
//
// La migración pone el índice único que lo vuelve imposible, pero se NIEGA a
// correr si ya hay duplicados, a propósito: son datos de tareo, y decidir cuál
// de dos filas sobrevive no es algo que deba hacer una migración sola.
//
// ── Lo que esto NO hace ───────────────────────────────────────────────────
// No borra nada. Distingue dos casos, que se resuelven distinto:
//
//   REDUNDANTES  las filas dicen lo mismo. Sobra una y da igual cuál: se
//                puede resolver sin consultar a nadie.
//   EN CONFLICTO las filas dicen cosas DISTINTAS para la misma persona y el
//                mismo día — una TD y una DL, por ejemplo. Alguien tiene que
//                decidir cuál vale, porque es lo que se le paga a esa persona.
//
// Se resuelven desde la aplicación: módulo Tareaje → Duplicados.

const fs=require('fs');
const path=require('path');
const{exigir}=require('./entorno');

const RAIZ=path.join(__dirname,'..');
const C={v:'\x1b[32m',r:'\x1b[31m',a:'\x1b[33m',g:'\x1b[90m',n:'\x1b[1m',x:'\x1b[0m'};

// Las mismas tablas y la misma identidad que fija el índice único, y que
// comprueba COLA_UNICAS en js/cola.js. Si esto se separa de aquello, la cola
// evitaría duplicados que la base sigue permitiendo, o al revés.
const TABLAS=[
  {tabla:'tareaje',   campos:['personal_id','fecha'], mira:['tipo','proy']},
  {tabla:'asistencia',campos:['personal_id','fecha'], mira:['estado','obs']}
];

// ── La parte que se puede probar sin red ───────────────────────────────────
// Agrupa por la identidad y separa lo redundante de lo que está en conflicto.
function analizarDuplicados(filas,campos,mira){
  const grupos=new Map();
  for(const f of filas){
    // Una fila sin identidad completa no puede compararse con nada: el índice
    // único tampoco la restringe, porque en Postgres null nunca iguala a null.
    if(campos.some(c=>f[c]===null||f[c]===undefined))continue;
    const clave=campos.map(c=>String(f[c])).join('|');
    if(!grupos.has(clave))grupos.set(clave,[]);
    grupos.get(clave).push(f);
  }
  const redundantes=[],conflictos=[];
  for(const[clave,filasG]of grupos){
    if(filasG.length<2)continue;
    const huella=f=>(mira||[]).map(c=>String(f[c]===undefined?'':f[c])).join('');
    const distintas=new Set(filasG.map(huella));
    (distintas.size>1?conflictos:redundantes).push({clave,filas:filasG});
  }
  const sobran=[...redundantes,...conflictos].reduce((n,g)=>n+g.filas.length-1,0);
  return{redundantes,conflictos,sobran,
         grupos:redundantes.length+conflictos.length};
}

// ── Traer las filas ────────────────────────────────────────────────────────
// Se pagina: PostgREST devuelve 1000 por petición, y el tareo de un año son
// muchas más. Sin paginar, el diagnóstico diría "todo limpio" mirando el
// primer millar.
async function traer(url,key,tabla,columnas){
  const filas=[];const paso=1000;
  for(let desde=0;;desde+=paso){
    const r=await fetch(url+'/rest/v1/'+tabla+'?select='+columnas.join(','),{
      headers:{apikey:key,Authorization:'Bearer '+key,
               Range:desde+'-'+(desde+paso-1),'Range-Unit':'items'}
    });
    if(!r.ok)throw new Error(tabla+': HTTP '+r.status+' · '+(await r.text()).slice(0,160));
    const lote=await r.json();
    filas.push(...lote);
    if(lote.length<paso)break;
  }
  return filas;
}

async function principal(){
  const[url,key]=exigir('GDAR_URL','GDAR_SERVICE_KEY');
  const base=url.replace(/\/+$/,'');
  // La publicable no lee nada con RLS cerrado: diría "cero duplicados" y sería
  // mentira. Es el mismo error que dejó el respaldo escribiendo vacíos.
  if(!/^sb_secret_|^ey/.test(key))
    throw new Error('GDAR_SERVICE_KEY no parece la service_role. Con la publicable '
      +'y RLS cerrado no se lee ni una fila, y el diagnóstico saldría en blanco.');

  let total=0,conflictosTotal=0;
  const csv=[];
  for(const{tabla,campos,mira}of TABLAS){
    const cols=['id',...campos,...mira];
    let filas;
    try{ filas=await traer(base,key,tabla,cols); }
    catch(e){ console.log('  '+C.r+'MAL'+C.x+'  '+tabla+': '+e.message); continue; }

    const a=analizarDuplicados(filas,campos,mira);
    total+=a.sobran; conflictosTotal+=a.conflictos.length;

    const cabecera=C.n+tabla+C.x+C.g+'  ·  '+filas.length+' filas'+C.x;
    if(!a.grupos){ console.log('\n'+cabecera+'\n  '+C.v+'OK'+C.x+'   sin duplicados'); continue; }
    console.log('\n'+cabecera);
    console.log('  '+C.a+'··'+C.x+'   '+a.grupos+' celda(s) con más de una fila, '
      +a.sobran+' fila(s) de más');
    console.log('       '+C.g+a.redundantes.length+' redundantes (dicen lo mismo, sobra una)'+C.x);
    console.log('       '+(a.conflictos.length?C.r:C.g)+a.conflictos.length
      +' en conflicto (dicen cosas distintas: hay que decidir)'+C.x);

    a.conflictos.slice(0,10).forEach(g=>{
      console.log('       '+C.r+g.clave+C.x+'  '
        +g.filas.map(f=>'#'+f.id+' '+mira.map(c=>f[c]).join('/')).join('   vs   '));
    });
    if(a.conflictos.length>10)
      console.log('       '+C.g+'… y '+(a.conflictos.length-10)+' más'+C.x);

    [...a.redundantes,...a.conflictos].forEach(g=>g.filas.forEach(f=>{
      csv.push([tabla,g.clave,f.id,...mira.map(c=>f[c]===undefined?'':f[c]),
        a.conflictos.includes(g)?'conflicto':'redundante'].join(','));
    }));
  }

  if(process.argv.includes('--csv')&&csv.length){
    const destino=path.join(RAIZ,'duplicados.csv');
    fs.writeFileSync(destino,'tabla,celda,id,a,b,caso\n'+csv.join('\n'),'utf8');
    console.log('\n  lista completa en '+destino);
  }

  console.log('');
  if(!total){
    console.log(C.v+'  Se puede aplicar la migración del índice único.'+C.x+'\n');
    return 0;
  }
  console.log(C.a+'  '+total+' fila(s) de más. La migración se negará a correr.'+C.x);
  console.log(C.g+'  Resuélvalas en la aplicación: módulo Tareaje → Duplicados.'+C.x);
  if(conflictosTotal)
    console.log(C.r+'  '+conflictosTotal+' de esas celdas dicen cosas distintas: '
      +'eso es lo que se le paga a alguien, no lo decida solo.'+C.x);
  console.log('');
  return 1;
}

if(require.main===module){
  principal()
    .then(c=>process.exit(c))
    .catch(e=>{console.error('\n  '+C.r+e.message+C.x+'\n');process.exit(2);});
}

module.exports={analizarDuplicados,TABLAS};
