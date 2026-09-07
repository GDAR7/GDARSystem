const fs=require('fs');
const R='c:/Users/LENOVO/OneDrive/Documents/GitHub/GDARSystem/';
let ok=0,mal=0;
const es=(l,g,e)=>{const b=String(g)===String(e);b?ok++:mal++;
  console.log((b?'  OK  ':'  MAL ')+l.padEnd(58)+'= '+g+(b?'':'  (esperado '+e+')'));};

// ── El entorno del navegador ──────────────────────────────────────────────
const nodos={};
const mk=id=>nodos[id]={id,value:'',style:{},textContent:'',innerHTML:'',disabled:false,
  classList:{contains:()=>false,add(){},remove(){}}};
['loginCodigo','loginClave','loginErr','loginScreen','appShell','logoEmpresa','hArea','hDot','hHex',
 'hName','hRole','sideNav'].forEach(mk);
const botonLogin={disabled:false,style:{}};
global.document={getElementById:id=>nodos[id]||null,
  querySelector:s=>s.includes('login-btn')?botonLogin:null,
  querySelectorAll:()=>[],addEventListener:()=>{}};
global.window={location:{href:'https://ecosermo.gdarei.com/'},open:()=>null};
global.localStorage={getItem:()=>null,setItem:()=>{},removeItem:()=>{}};

// Supabase de mentira: registra qué se le pidió y devuelve lo que le indiquemos
let signInPedido=null,signOutVeces=0,respuesta=null;
global.supabase={createClient:()=>({from:()=>({})})};
global.supa={auth:{
  signInWithPassword:async c=>{signInPedido=c;return respuesta;},
  signOut:async()=>{signOutVeces++;return{};}
}};
let lanzado=0;
global.launchApp=()=>{lanzado++;};
global.AREAS={};

const empresaSrc=fs.readFileSync(R+'js/empresa.js','utf8');
const utilsSrc=fs.readFileSync(R+'js/utils.js','utf8').replace(/^\uFEFF/,'');
// Solo las piezas del login: utils.js entero arrastra medio sistema
const trozo=utilsSrc.slice(utilsSrc.indexOf('// Modo de acceso'),
                           utilsSrc.indexOf('// ══ LAUNCH ══'));
let AUTH_MODO='local';
const fn=new Function('supa','AUTH_MODO','USERS','launchApp','document','console',
  trozo+';return{doLogin,doLogout,_authEmail};');

const armar=(modo,users)=>fn(global.supa,modo,users||[],global.launchApp,global.document,console);

// ── Los usuarios reales de empresa.js ─────────────────────────────────────
const empFn=new Function('document',
  empresaSrc.replace(/\(\(\)=>\{const el=[\s\S]*$/,'')+';return{EMPRESA_USERS,AUTH_MODO,EMPRESA};');
const emp=empFn(global.document);
const A={administracion:1,remuneraciones:1,general:1,seguridad:1,otros:1};
const USERS=emp.EMPRESA_USERS(A);

console.log('\n== El interruptor viene en local ==');
es('empresa.js define AUTH_MODO',typeof emp.AUTH_MODO,'string');
es('  con un valor valido',['local','mixto','supabase'].includes(emp.AUTH_MODO),true);

console.log('\n== En modo local se comporta como siempre ==');
let api=armar('local',USERS);
const u0=USERS[0];
nodos.loginCodigo.value=(u0.codigo+u0.dni).toLowerCase();nodos.loginClave.value='';   // en minúsculas, a propósito
api.doLogin();
es('entra con código+DNI',lanzado,1);
es('  no llamó a Supabase',signInPedido,'null');
lanzado=0;nodos.loginErr.style.display='';
nodos.loginCodigo.value='LOQUESEA123';nodos.loginClave.value='';
api.doLogin();
es('rechaza una credencial falsa',lanzado,0);
es('  y muestra el aviso',nodos.loginErr.style.display,'block');

console.log('\n== El email se deriva igual que en migrarAuth.js ==');
const mig=fs.readFileSync(R+'herramientas/migrarAuth.js','utf8');
es('migrarAuth normaliza igual',/replace\(\/\[\^a-z0-9\]\+\/g,'-'\)/.test(mig),true);
es('  y usa el mismo dominio',/@gdarei\.com/.test(mig),true);
es('EIBEL25-K7M2 → email',api._authEmail('EIBEL25-K7M2'),'eibel25-k7m2@gdarei.com');
es('los puntos se normalizan',api._authEmail('CP.BISA_-DQ5E9G'),'cp-bisa-dq5e9g@gdarei.com');
es('los guiones bajos también',api._authEmail('J_A_TA-N5HQMR'),'j-a-ta-n5hqmr@gdarei.com');
es('sin guiones colgando al final',api._authEmail('ABC_'),'abc@gdarei.com');

console.log('\n== En modo supabase autentica contra el servidor ==');
api=armar('supabase',USERS);
lanzado=0;signInPedido=null;nodos.loginErr.style.display='';
respuesta={data:{user:{user_metadata:{nombre:'Abel Rodríguez A.',cargo:'PCO',
  codigo:'EIBEL25',dni:'46108109',areas:['administracion','general']}}},error:null};
nodos.loginCodigo.value='EIBEL25';nodos.loginClave.value='EIBEL25-K7M2P9';
await_(api.doLogin());
function await_(p){return p;}
setTimeout(()=>{},0);

// doLogin es async: se espera antes de comprobar
(async()=>{
  await new Promise(r=>setTimeout(r,10));
  es('pidió el signIn',signInPedido!==null,true);
  es('  con el email derivado',signInPedido.email,'eibel25@gdarei.com');
  es('  y la credencial como contraseña',signInPedido.password,'EIBEL25-K7M2P9');
  es('entró',lanzado,1);

  console.log('\n== Los permisos salen del token, no del archivo ==');
  es('CU sale del token',global.CU&&global.CU.nombre,'Abel Rodríguez A.');
  es('  con su cargo',global.CU.cargo,'PCO');
  es('  y sus áreas',global.CU.areas.join(),'administracion,general');
  es('  la credencial NO viaja en CU',global.CU.password===undefined,true);
  es('el token trae las áreas',respuesta.data.user.user_metadata.areas.length,2);

  console.log('\n== Credencial equivocada ==');
  lanzado=0;nodos.loginErr.style.display='';
  respuesta={data:null,error:{message:'Invalid login credentials'}};
  nodos.loginCodigo.value='NOEXISTE';nodos.loginClave.value='NOEXISTE-999999';
  await api.doLogin();
  es('no entra',lanzado,0);
  es('  y avisa',nodos.loginErr.style.display,'block');
  es('  el botón vuelve a habilitarse',botonLogin.disabled,false);

  console.log('\n== Un usuario sin permisos no pasa ==');
  lanzado=0;signOutVeces=0;nodos.loginErr.style.display='';
  respuesta={data:{user:{user_metadata:{nombre:'X'}}},error:null};  // sin areas
  nodos.loginCodigo.value='NOEXISTE';nodos.loginClave.value='ALGO-123456';
  await api.doLogin();
  es('aunque la contraseña sea válida, no entra',lanzado,0);
  es('  y se cierra la sesión abierta',signOutVeces,1);

  console.log('\n== Si Supabase no responde ==');
  lanzado=0;nodos.loginErr.style.display='';botonLogin.disabled=false;
  const apiRoto=fn({auth:{signInWithPassword:async()=>{throw new Error('red caída');},
    signOut:async()=>{}}},'supabase',USERS,global.launchApp,global.document,console);
  nodos.loginCodigo.value='EIBEL25';nodos.loginClave.value='EIBEL25-K7M2P9';
  await apiRoto.doLogin();
  es('no entra',lanzado,0);
  es('  avisa en vez de quedarse colgado',nodos.loginErr.style.display,'block');
  es('  y el botón queda usable otra vez',botonLogin.disabled,false);

  console.log('\n== Salir cierra la sesión del servidor ==');
  signOutVeces=0;
  api.doLogout();
  es('llama a signOut',signOutVeces,1);
  signOutVeces=0;
  armar('local',USERS).doLogout();
  es('en modo local no lo llama',signOutVeces,0);

  console.log('\n== Campo vacío ==');
  lanzado=0;signInPedido=null;
  nodos.loginCodigo.value='   ';
  await api.doLogin();
  es('no molesta al servidor',signInPedido,'null');
  es('  ni entra',lanzado,0);

  console.log('\n== El SQL se puede deshacer ==');
  const cerrar=fs.readFileSync(R+'sql/rls_cerrar.sql','utf8');
  const revertir=fs.readFileSync(R+'sql/rls_revertir.sql','utf8');
  es('cerrar activa RLS',/enable row level security/.test(cerrar),true);
  es('  solo para authenticated',/for all to authenticated/.test(cerrar),true);
  es('  y borra las políticas viejas abiertas',/drop policy/.test(cerrar),true);
  es('  recorre las tablas, no una lista fija',/from pg_tables/.test(cerrar),true);
  es('revertir existe y desactiva RLS',/disable row level security/.test(revertir),true);
  es('  y avisa del riesgo',/vuelven a quedar accesibles/.test(revertir),true);

  console.log('\n== Nada sensible queda en el repositorio ==');
  const gi=fs.readFileSync(R+'.gitignore','utf8');
  es('.gitignore tapa las credenciales',gi.includes('herramientas/.credenciales.json'),true);
  es('  y el listado de credenciales nuevas',gi.includes('credenciales-nuevas.txt'),true);
  es('migrarAuth no trae ninguna llave',/eyJ|sb_publishable_[A-Za-z0-9]/.test(mig),false);

  console.log('\n'+(mal?'X '+mal+' fallo(s)':'OK todo bien')+'  ·  '+ok+'/'+(ok+mal));
  process.exit(mal?1:0);
})();
