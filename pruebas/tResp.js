// ══ EL RESPALDO ═════════════════════════════════════════════════════════════
// El respaldo estuvo roto meses sin que nadie se enterara: leía SUPA_URL de un
// archivo del que ya se había movido, y usaba la llave pública, que con RLS
// cerrado no lee ni una fila. Habría escrito 75 archivos con listas vacías
// informando que todo salió bien.
//
// Esta suite fija las comprobaciones que se le agregaron para que eso no pueda
// repetirse en silencio. Dos de ellas se escribieron porque el propio
// verificador falló al probarlo a mano: comparaba contra un respaldo que
// tampoco servía, y un respaldo malo pasaba a ser la línea base del siguiente.
//
// Cómo funciona: se lanza la herramienta de verdad como proceso aparte, con un
// `fetch` simulado inyectado con -r y el destino apuntando al directorio
// temporal. No toca ninguna base ni los respaldos reales.

const fs=require('fs');
const os=require('os');
const path=require('path');
const{execFileSync}=require('child_process');
const R=require('path').join(__dirname,'..')+'/';

let ok=0,mal=0;
const es=(l,g,e)=>{const b=String(g)===String(e);b?ok++:mal++;
  console.log((b?'  OK  ':'  MAL ')+l.padEnd(58)+'= '+g+(b?'':'  (esperado '+e+')'));};

const HERR=R+'herramientas/backupSupabase.js';
const TMP=fs.mkdtempSync(path.join(os.tmpdir(),'gdar_resp_'));
const SERVICIO='eyJhbGciOiJIUzI1NiJ9.'
  +Buffer.from(JSON.stringify({role:'service_role'})).toString('base64url')+'.x';

// ── El fetch simulado ──────────────────────────────────────────────────────
// Respeta el header Range igual que PostgREST. Sin eso, una tabla de más de
// 1000 filas devolvería siempre la misma página y la herramienta no pararía
// nunca — que fue justo lo que pasó al escribir esta suite.
function preload(tablas,extra){
  const f=path.join(TMP,'fetch_'+Math.random().toString(36).slice(2)+'.js');
  fs.writeFileSync(f,
    'const TOTAL='+JSON.stringify(tablas)+';\n'+
    'global.fetch=async(url,opts)=>{\n'+
    '  const t=String(url).match(/rest\\/v1\\/([a-z_]+)/)[1];\n'+
    '  if(TOTAL[t]==="error")return{ok:false,status:500,text:async()=>"falla simulada"};\n'+
    '  const n=TOTAL[t]!==undefined?TOTAL[t]:0;\n'+
    '  const [d,h]=String(opts.headers.Range).split("-").map(Number);\n'+
    '  const filas=[];for(let i=d;i<=h&&i<n;i++)filas.push({id:i+1});\n'+
    '  return {ok:true,json:async()=>filas,text:async()=>""};\n'+
    '};\n'+(extra||''));
  return f;
}

// Cada corrida escribe en una carpeta con sello de minuto, así que para
// encadenar respaldos hay que mover el reloj: si no, la segunda pisaría a la
// primera y no habría contra qué comparar.
const relojMas=h=>'const _R=Date;global.Date=class extends _R{'
  +'constructor(...a){if(a.length)return new _R(...a);super(_R.now()+'+h+'*3600000);}'
  +'static now(){return _R.now()+'+h+'*3600000;}};';

// Lanza la herramienta y devuelve {salida, codigo}. No lanza excepción: el
// código de salida es parte de lo que se está probando.
function correr({tablas,destino,horas,key,dev,sinLlave}={}){
  const env={...process.env,GDAR_RESPALDOS:destino||TMP};
  delete env.GDAR_SERVICE_KEY; delete env.GDAR_SERVICE_KEY_DEV;
  if(!sinLlave)env[dev?'GDAR_SERVICE_KEY_DEV':'GDAR_SERVICE_KEY']=key||SERVICIO;
  const args=[];
  if(tablas)args.push('-r',preload(tablas,horas?relojMas(horas):''));
  args.push(HERR);
  if(dev)args.push('--dev');
  try{
    const salida=execFileSync(process.execPath,args,{encoding:'utf8',stdio:'pipe',env,timeout:60000});
    return{salida,codigo:0};
  }catch(e){
    return{salida:String(e.stdout||'')+String(e.stderr||''),codigo:e.status===undefined?-1:e.status};
  }
}

const resumen=dir=>JSON.parse(fs.readFileSync(path.join(dir,'_resumen.json'),'utf8'));
const ultimo=d=>fs.readdirSync(d).filter(x=>x.startsWith('supabase_')).sort().pop();

(()=>{

console.log('\n== Se niega a empezar con la llave equivocada ==');
// Es el error exacto que dejó el respaldo roto. Tiene que morir antes de bajar
// nada, no después de escribir 75 archivos vacíos.
const pub=correr({key:'sb_publishable_xveXhZxiouPGxKuGJ1SgJQ_efhokWUP'});
es('la publicable no pasa',pub.codigo,1);
es('  y dice cuál es el problema',/PUBLICABLE/.test(pub.salida),true);
es('  y adónde ir por la buena',/service_role/.test(pub.salida),true);

const anon='eyJhbGciOiJIUzI1NiJ9.'
  +Buffer.from(JSON.stringify({role:'anon'})).toString('base64url')+'.x';
const ja=correr({key:anon});
es('un JWT de rol anon tampoco',ja.codigo,1);
es('  y nombra el rol que trae',/rol "anon"/.test(ja.salida),true);

console.log('\n== Sin credenciales explica, no revienta ==');
const sin=correr({sinLlave:true});
es('sale con error',sin.codigo,1);
es('  dice qué archivo crear',/\.credenciales\.json/.test(sin.salida),true);
es('  y no escupe un stack trace',/at Object\.<anonymous>/.test(sin.salida),false);

console.log('\n== Un respaldo bueno ==');
const d1=fs.mkdtempSync(path.join(TMP,'caso1_'));
const bueno=correr({destino:d1,tablas:{personal:500,tareaje:13000,equipos:40}});
es('sale con código 0',bueno.codigo,0);
es('  y lo dice',/Respaldo completo y verificado/.test(bueno.salida),true);
const r1=resumen(path.join(d1,ultimo(d1)));
es('queda marcado como válido',r1.valido,true);
es('  con el total de filas',r1.filasTotales,13540);
es('  y el origen, para no comparar peras con manzanas',
   /kotqxhpkjuaxbgwhiode/.test(r1.origen),true);

console.log('\n== La paginación trae la tabla completa ==');
// tareaje pasa de 1000 filas: sin paginar se respaldaría cortada sin avisar.
const filasTareaje=JSON.parse(fs.readFileSync(path.join(d1,ultimo(d1),'tareaje.json'),'utf8'));
es('13000 filas, no las primeras 1000',filasTareaje.length,13000);
es('  sin repetir ids',new Set(filasTareaje.map(f=>f.id)).size,13000);

console.log('\n== Una tabla que se vació respecto a ayer ==');
const d2=fs.mkdtempSync(path.join(TMP,'caso2_'));
correr({destino:d2,tablas:{personal:500,tareaje:13000,equipos:40}});
const vac=correr({destino:d2,tablas:{personal:0,tareaje:13000,equipos:40},horas:1});
es('no lo da por bueno',vac.codigo,1);
es('  nombra la tabla',/personal/.test(vac.salida),true);
es('  y cuántas filas tenía',/antes 500|antes tenía 500/.test(vac.salida),true);

console.log('\n== Una caída fuerte avisa, pero no invalida ==');
const d3=fs.mkdtempSync(path.join(TMP,'caso3_'));
correr({destino:d3,tablas:{personal:500,tareaje:13000,equipos:40}});
const cae=correr({destino:d3,tablas:{personal:500,tareaje:4000,equipos:40},horas:1});
es('sigue siendo válido',cae.codigo,0);
es('  pero lo menciona',/perdieron más de un tercio/.test(cae.salida),true);
es('  con el antes y el después',/13000 → 4000/.test(cae.salida),true);

console.log('\n== Todas las tablas vacías es un problema de permisos ==');
// Es la firma exacta del bug original: la llave lee, pero no ve nada.
const d4=fs.mkdtempSync(path.join(TMP,'caso4_'));
const cero=correr({destino:d4,tablas:{}});
es('no lo da por bueno',cero.codigo,1);
es('  y no lo llama base sin datos',/problema de permisos/.test(cero.salida),true);
es('  queda marcado como inválido',resumen(path.join(d4,ultimo(d4))).valido,false);

console.log('\n== Un respaldo malo no sirve de línea base ==');
// Si sirviera, la alarma sonaría una sola vez y el vaciado quedaría aceptado
// en silencio a partir de la corrida siguiente.
const d5=fs.mkdtempSync(path.join(TMP,'caso5_'));
correr({destino:d5,tablas:{personal:500,tareaje:13000,equipos:40}});           // bueno
const v1=correr({destino:d5,tablas:{personal:0,tareaje:13000,equipos:40},horas:1});
const v2=correr({destino:d5,tablas:{personal:0,tareaje:13000,equipos:40},horas:2});
es('la primera vez avisa',v1.codigo,1);
es('la segunda TAMBIÉN avisa',v2.codigo,1);
es('  porque compara contra el último bueno',/antes 500|antes tenía 500/.test(v2.salida),true);

console.log('\n== Y uno vacío tampoco ==');
// Fue el primer fallo del verificador: eligió como referencia un respaldo
// donde las 75 tablas habían fallado. Comparar contra el vacío no detecta nada.
const d6=fs.mkdtempSync(path.join(TMP,'caso6_'));
correr({destino:d6,tablas:{personal:500,tareaje:13000,equipos:40}});           // bueno
correr({destino:d6,tablas:{},horas:1});                                        // vacío
const v3=correr({destino:d6,tablas:{personal:0,tareaje:13000,equipos:40},horas:2});
es('salta el vacío y usa el bueno',/antes 500|antes tenía 500/.test(v3.salida),true);
es('  así que detecta el vaciado',v3.codigo,1);

console.log('\n== No mezcla desarrollo con producción ==');
// Respaldar dev después de prod daría una caída falsa en todas las tablas.
const d7=fs.mkdtempSync(path.join(TMP,'caso7_'));
correr({destino:d7,tablas:{personal:500,tareaje:13000,equipos:40}});           // producción
const devR=correr({destino:d7,tablas:{personal:0,tareaje:0,equipos:0},horas:1,dev:true});
es('no encuentra contra qué comparar',/no hay respaldo anterior/.test(devR.salida),true);
es('  y no acusa un vaciado que no hubo',/tenían filas y hoy vinieron en cero/.test(devR.salida),false);
es('  aunque sí avisa que vino todo vacío',/problema de permisos/.test(devR.salida),true);
es('  y guarda el origen de desarrollo',
   /wezrieubjcvcrtinppfw/.test(resumen(path.join(d7,ultimo(d7))).origen),true);

console.log('\n== Una tabla que falla no se confunde con una vacía ==');
const d8=fs.mkdtempSync(path.join(TMP,'caso8_'));
const err=correr({destino:d8,tablas:{personal:500,tareaje:'error',equipos:40}});
es('no lo da por bueno',err.codigo,1);
const r8=resumen(path.join(d8,ultimo(d8)));
es('  la cuenta como error',r8.conError,1);
es('  con filas en null, no en cero',r8.detalle.find(d=>d.tabla==='tareaje').filas,null);
es('  y no escribe un JSON a medias',
   fs.existsSync(path.join(d8,ultimo(d8),'tareaje.json')),false);

console.log('\n== Lee la configuración de donde vive hoy ==');
// El bug número uno: leía SUPA_URL de js/config.js después de que se mudara a
// js/empresa.js. Si alguien la vuelve a mover, que falle aquí y no en producción.
const herr=fs.readFileSync(HERR,'utf8');
const emp=fs.readFileSync(R+'js/empresa.js','utf8');
const cfg=fs.readFileSync(R+'js/config.js','utf8');
// No se comprueba grepeando el código, que se puede reescribir de mil formas,
// sino que el respaldo haya salido con la URL que empresa.js declara hoy.
const urlProd=(emp.match(/const SUPA_URL_PROD\s*=\s*'([^']+)'/)||[])[1];
const urlDev =(emp.match(/const SUPA_URL_DEV\s*=\s*'([^']+)'/) ||[])[1];
es('empresa.js declara la URL de producción',!!urlProd,true);
es('  y la de desarrollo',!!urlDev,true);
es('  y son distintas',urlProd!==urlDev,true);
es('el respaldo salió con la de producción',r1.origen,urlProd.replace(/\/+$/,''));
es('  y el de --dev con la de desarrollo',
   resumen(path.join(d7,ultimo(d7))).origen,urlDev.replace(/\/+$/,''));
es('config.js ya no declara la URL',/const SUPA_URL\s*=/.test(cfg),false);
es('las tablas sí salen de config.js',/SUPA_TABLES/.test(herr)&&/SUPA_TABLES/.test(cfg),true);
es('no queda ninguna llave dentro',/eyJ[A-Za-z0-9]{20}|sb_publishable_[A-Za-z0-9]{10}/.test(herr),false);

fs.rmSync(TMP,{recursive:true,force:true});

console.log('\n'+(mal?'X '+mal+' fallo(s)':'OK todo bien')+'  ·  '+ok+'/'+(ok+mal));
process.exit(mal?1:0);
})();
