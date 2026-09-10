// ══ CONTAR BIEN LOS DUPLICADOS ANTES DE MIGRAR ══════════════════════════════
// El índice único de supabase/migrations/20260909235900 se niega a aplicarse
// si ya hay filas repetidas de la misma persona y el mismo día. Esta
// herramienta las cuenta antes, y sobre todo separa dos casos que se resuelven
// de forma muy distinta:
//
//   REDUNDANTES  las filas dicen lo mismo: sobra una y da igual cuál.
//   EN CONFLICTO dicen cosas distintas para la misma persona y el mismo día.
//                Eso es lo que se le paga a alguien; no lo decide una máquina.
//
// Confundir los dos casos es el error caro: daría por resuelto sin mirar algo
// que alguien tenía que decidir.

const fs=require('fs');
const R=require('path').join(__dirname,'..')+'/';
const{analizarDuplicados,TABLAS}=require(R+'herramientas/duplicados.js');

let ok=0,mal=0;
const es=(l,g,e)=>{const b=String(g)===String(e);b?ok++:mal++;
  console.log((b?'  OK  ':'  MAL ')+l.padEnd(58)+'= '+g+(b?'':'  (esperado '+e+')'));};

const CAMPOS=['personal_id','fecha'];
const MIRA=['tipo','proy'];
const an=filas=>analizarDuplicados(filas,CAMPOS,MIRA);

console.log('\n== Una base limpia se ve limpia ==');
{
  const a=an([
    {id:1,personal_id:7,fecha:'2026-09-01',tipo:'TD',proy:'R3'},
    {id:2,personal_id:7,fecha:'2026-09-02',tipo:'TN',proy:'R3'},
    {id:3,personal_id:8,fecha:'2026-09-01',tipo:'TD',proy:'R3'}
  ]);
  es('sin grupos repetidos',a.grupos,0);
  es('  y ninguna fila de más',a.sobran,0);
}

console.log('\n== Dos filas que dicen lo mismo: sobra una ==');
// Pasó al guardar dos veces la misma celda desde equipos distintos. No hay
// nada que decidir: cualquiera de las dos sirve.
{
  const a=an([
    {id:1,personal_id:7,fecha:'2026-09-01',tipo:'TD',proy:'R3'},
    {id:2,personal_id:7,fecha:'2026-09-01',tipo:'TD',proy:'R3'}
  ]);
  es('es redundante',a.redundantes.length,1);
  es('  y no un conflicto',a.conflictos.length,0);
  es('  sobra exactamente una fila',a.sobran,1);
  es('  y se identifica la celda',a.redundantes[0].clave,'7|2026-09-01');
}

console.log('\n== Dos filas que dicen cosas distintas: hay que decidir ==');
// Una TD y una DL para la misma persona el mismo día. Elegir mal cambia lo que
// se le paga, así que la herramienta no elige.
{
  const a=an([
    {id:1,personal_id:7,fecha:'2026-09-01',tipo:'TD',proy:'R3'},
    {id:2,personal_id:7,fecha:'2026-09-01',tipo:'DL',proy:'R3'}
  ]);
  es('es un conflicto',a.conflictos.length,1);
  es('  y no se cuenta como redundante',a.redundantes.length,0);
  es('  con las dos filas a la vista',a.conflictos[0].filas.length,2);
}

console.log('\n== Un cambio de proyecto también es un conflicto ==');
// El mismo tipo pero distinto frente: la hora está imputada a otra partida, y
// eso mueve el costo de un centro a otro.
{
  const a=an([
    {id:1,personal_id:7,fecha:'2026-09-01',tipo:'TD',proy:'R3'},
    {id:2,personal_id:7,fecha:'2026-09-01',tipo:'TD',proy:'DP'}
  ]);
  es('no pasa por redundante',a.conflictos.length,1);
}

console.log('\n== Tres filas de la misma celda ==');
{
  const a=an([
    {id:1,personal_id:7,fecha:'2026-09-01',tipo:'TD',proy:'R3'},
    {id:2,personal_id:7,fecha:'2026-09-01',tipo:'TD',proy:'R3'},
    {id:3,personal_id:7,fecha:'2026-09-01',tipo:'TD',proy:'R3'}
  ]);
  es('es un solo grupo',a.grupos,1);
  es('  pero sobran dos filas',a.sobran,2);
}

console.log('\n== El proyecto no forma parte de la identidad ==');
// La identidad es (persona, día). js/tareaje.js busca el registro solo por
// esos dos campos antes de decidir si actualiza o inserta, y el índice único
// hace lo mismo. Si aquí se agrupara también por proyecto, dos filas de la
// misma celda con frentes distintos parecerían dos celdas limpias, y la
// migración fallaría después de que este diagnóstico dijera que todo estaba
// bien.
{
  const a=an([
    {id:1,personal_id:7,fecha:'2026-09-01',tipo:'TD',proy:'R3'},
    {id:2,personal_id:7,fecha:'2026-09-01',tipo:'TD',proy:'DP'}
  ]);
  es('siguen siendo la misma celda',a.grupos,1);
}

console.log('\n== Una identidad incompleta no se compara ==');
// En Postgres null nunca iguala a null, así que el índice único tampoco
// restringe esas filas. Contarlas como duplicados diría que hay que limpiar
// algo que la migración va a aceptar igual.
{
  const a=an([
    {id:1,personal_id:null,fecha:'2026-09-01',tipo:'TD',proy:'R3'},
    {id:2,personal_id:null,fecha:'2026-09-01',tipo:'TD',proy:'R3'},
    {id:3,personal_id:7,fecha:null,tipo:'TD',proy:'R3'},
    {id:4,personal_id:7,fecha:null,tipo:'TD',proy:'R3'}
  ]);
  es('no se cuentan como duplicados',a.grupos,0);
}

console.log('\n== Personas distintas el mismo día, y al revés ==');
{
  const a=an([
    {id:1,personal_id:7,fecha:'2026-09-01',tipo:'TD',proy:'R3'},
    {id:2,personal_id:8,fecha:'2026-09-01',tipo:'TD',proy:'R3'},
    {id:3,personal_id:7,fecha:'2026-09-02',tipo:'TD',proy:'R3'}
  ]);
  es('cada una es su propia celda',a.grupos,0);
}

console.log('\n== El id numérico y el de texto son la misma persona ==');
// PostgREST devuelve enteros, pero un CSV importado puede traerlos como texto.
// Si "7" y 7 se contaran aparte, el diagnóstico daría limpio y la migración
// fallaría igual.
{
  const a=an([
    {id:1,personal_id:7,fecha:'2026-09-01',tipo:'TD',proy:'R3'},
    {id:2,personal_id:'7',fecha:'2026-09-01',tipo:'TD',proy:'R3'}
  ]);
  es('se agrupan juntas',a.grupos,1);
}

console.log('\n== Lo que mira coincide con lo que fija la base ==');
// Si esta herramienta y el índice único usaran identidades distintas, una
// diría que está limpio y el otro se negaría a aplicarse.
{
  const mig=fs.readFileSync(R+'supabase/migrations/20260909235900_unicidad_tareaje_asistencia.sql','utf8');
  es('mira tareaje y asistencia',TABLAS.map(t=>t.tabla).join(','),'tareaje,asistencia');
  es('  con la identidad (personal_id, fecha)',
     TABLAS.every(t=>t.campos.join(',')==='personal_id,fecha'),true);
  es('  la misma que declara la migración',
     /\(personal_id,\s*fecha\)/.test(mig)||/personal_id,\s*fecha/.test(mig),true);
  es('  y la misma que usa la cola offline',
     /COLA_UNICAS=\{tareaje:\['personalId','fecha'\]/.test(
       fs.readFileSync(R+'js/cola.js','utf8')),true);
}

console.log('\n== No borra nada ==');
// Decidir cuál de dos filas de tareo sobrevive no es algo que deba hacer una
// herramienta sola; la propia migración lo dice.
{
  const src=fs.readFileSync(R+'herramientas/duplicados.js','utf8');
  es('no hay ningún delete',/\bdelete\b/i.test(src.replace(/^\s*\/\/.*$/gm,'')),false);
  es('  y se dice dónde se resuelven',/Tareaje → Duplicados/.test(src),true);
  es('exige la service_role',/no parece la service_role/.test(src),true);
  es('  porque la publicable diría "cero" y sería mentira',/ni una fila/.test(src),true);
  es('pagina los resultados',/Range:desde/.test(src),true);
}

console.log('\n'+(mal?'X '+mal+' fallo(s)':'OK todo bien')+'  ·  '+ok+'/'+(ok+mal));
process.exit(mal?1:0);
