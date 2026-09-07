// El modo 'mixto' es lo que permite migrar de a pocos sin cortarle el acceso a
// nadie: prueba Supabase Auth y, si la credencial no existe alli todavia, cae
// a la lista local. Este test comprueba las cuatro combinaciones que importan.
const fs=require('fs');
const R='c:/Users/LENOVO/OneDrive/Documents/GitHub/GDARSystem/';
let ok=0,mal=0;
const es=(l,g,e)=>{const b=String(g)===String(e);b?ok++:mal++;
  console.log((b?'  OK  ':'  MAL ')+l.padEnd(58)+'= '+g+(b?'':'  (esperado '+e+')'));};

const nodos={};
['loginCodigo','loginClave','loginErr','loginScreen','appShell'].forEach(id=>
  nodos[id]={id,value:'',style:{},disabled:false});
const boton={disabled:false,style:{}};
const doc={getElementById:id=>nodos[id]||null,
  querySelector:s=>s.includes('login-btn')?boton:null,
  querySelectorAll:()=>[],addEventListener:()=>{}};
global.document=doc;
global.window={location:{href:'https://ecosermo.gdarei.com/'}};

let lanzado=0, signIn=null, signOuts=0, respuesta=null;
const launchApp=()=>{lanzado++;};
const supaOk={auth:{
  signInWithPassword:async c=>{signIn=c;return respuesta;},
  signOut:async()=>{signOuts++;return{};}}};
const supaCaido={auth:{
  signInWithPassword:async()=>{throw new Error('sin red');},
  signOut:async()=>{}}};

// Solo las piezas del login; utils.js entero arrastra medio sistema
const utils=fs.readFileSync(R+'js/utils.js','utf8').replace(/^\uFEFF/,'');
const trozo=utils.slice(utils.indexOf('// Modo de acceso'),utils.indexOf('// ══ LAUNCH ══'));
const fn=new Function('supa','AUTH_MODO','USERS','launchApp','document','console',
  'let CU=null;'+trozo+';return{doLogin,doLogout,_authEmail,verCU:()=>CU};');

const empSrc=fs.readFileSync(R+'js/empresa.js','utf8').replace(/\(\(\)=>\{const el=[\s\S]*$/,'');
const USERS=new Function('document',empSrc+';return EMPRESA_USERS;')(doc)(
  {administracion:1,remuneraciones:1,general:1,seguridad:1,otros:1});
const armar=(modo,supa)=>fn(supa||supaOk,modo,USERS,launchApp,doc,console);

const migrado ={data:{user:{user_metadata:{nombre:'Abel',cargo:'PCO',areas:['general']}}},error:null};
const rechazo ={data:null,error:{message:'Invalid login credentials'}};
const reset=()=>{lanzado=0;signIn=null;signOuts=0;nodos.loginErr.style.display='';nodos.loginClave.value='';};

(async()=>{
  const mixto=armar('mixto');
  const viejo=USERS[2];                       // aun no migrado
  const credVieja=viejo.codigo+viejo.dni;

  console.log('\n== Quien ya migro entra por Auth ==');
  reset(); respuesta=migrado;
  nodos.loginCodigo.value='EIBEL25';nodos.loginClave.value='EIBEL25-4PRU5Y';
  await mixto.doLogin();
  es('entra',lanzado,1);
  es('  se autentico contra el servidor',signIn.password,'EIBEL25-4PRU5Y');
  es('  con el email derivado',signIn.email,'eibel25@gdarei.com');
  es('  y CU sale del token',mixto.verCU().nombre,'Abel');

  console.log('\n== Quien no migro sigue entrando como siempre ==');
  reset(); respuesta=rechazo;
  nodos.loginCodigo.value=credVieja;nodos.loginClave.value='';
  await mixto.doLogin();
  es('entra por la lista local',lanzado,1);
  es('  sin ver ningun error',nodos.loginErr.style.display,'none');
  es('  y CU sale del archivo',mixto.verCU().codigo,viejo.codigo);
  es('  sin molestar a Auth: no hay clave que probar',signIn,'null');

  console.log('\n== Una credencial inventada no entra por ningun lado ==');
  reset(); respuesta=rechazo;
  nodos.loginCodigo.value='NOEXISTE';nodos.loginClave.value='INVENTADA-999999';
  await mixto.doLogin();
  es('no entra',lanzado,0);
  es('  y ahi si avisa',nodos.loginErr.style.display,'block');

  console.log('\n== Si Supabase se cae, en mixto nadie queda parado ==');
  reset();
  const mixtoRoto=armar('mixto',supaCaido);
  nodos.loginCodigo.value=credVieja;nodos.loginClave.value='';
  await mixtoRoto.doLogin();
  es('el esquema viejo responde',lanzado,1);
  es('  sin mostrar error',nodos.loginErr.style.display,'none');
  es('  y el boton queda usable',boton.disabled,false);

  console.log('\n== En modo supabase ya no hay red: es el estado final ==');
  reset(); respuesta=rechazo;
  const soloAuth=armar('supabase');
  nodos.loginCodigo.value=credVieja;nodos.loginClave.value='';
  await soloAuth.doLogin();
  es('la credencial vieja ya no sirve',lanzado,0);
  es('  y avisa',nodos.loginErr.style.display,'block');
  reset();
  const soloAuthRoto=armar('supabase',supaCaido);
  nodos.loginCodigo.value=credVieja;nodos.loginClave.value='';
  await soloAuthRoto.doLogin();
  es('con Supabase caido tampoco entra por la lista',lanzado,0);
  es('  pero avisa en vez de colgarse',nodos.loginErr.style.display,'block');

  console.log('\n== En modo local, Supabase ni se toca ==');
  reset();
  const local=armar('local');
  nodos.loginCodigo.value=credVieja;nodos.loginClave.value='';
  await local.doLogin();
  es('entra',lanzado,1);
  es('  sin llamar al servidor',signIn,'null');

  console.log('\n== Alta mal hecha: existe en Auth pero sin permisos ==');
  reset();
  respuesta={data:{user:{user_metadata:{nombre:'X'}}},error:null};   // sin areas
  nodos.loginCodigo.value='NOEXISTE';nodos.loginClave.value='ALGUIEN-123456';
  await mixto.doLogin();
  es('no entra, ni siquiera por la lista local',lanzado,0);
  es('  se le cierra la sesion abierta',signOuts,1);
  es('  y avisa',nodos.loginErr.style.display,'block');

  console.log('\n== La migracion de a uno ==');
  const mig=fs.readFileSync(R+'herramientas/migrarAuth.js','utf8');
  es('migrarAuth acepta --solo',mig.includes('--solo'),true);
  es('  y anexa en vez de pisar el listado',mig.includes('appendFileSync'),true);
  es('empresa.js explica el modo mixto',
    /mixto[\s\S]{0,80}transici/i.test(fs.readFileSync(R+'js/empresa.js','utf8')),true);
  es('  con un modo valido',
    /const AUTH_MODO='(local|mixto|supabase)'/.test(fs.readFileSync(R+'js/empresa.js','utf8')),true);

  console.log('\n'+(mal?'X '+mal+' fallo(s)':'OK todo bien')+'  ·  '+ok+'/'+(ok+mal));
  process.exit(mal?1:0);
})();
