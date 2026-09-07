// Login de dos campos. El cambio de clave vive en tSeguridad.js.
const fs=require('fs');
const R='c:/Users/LENOVO/OneDrive/Documents/GitHub/GDARSystem/';
let ok=0,mal=0;
const es=(l,g,e)=>{const b=String(g)===String(e);b?ok++:mal++;
  console.log((b?'  OK  ':'  MAL ')+l.padEnd(58)+'= '+g+(b?'':'  (esperado '+e+')'));};

const nodos={};
['loginCodigo','loginClave','loginErr','clvActual','clvNueva','clvRepe','clvErr','clvBtn','btnClave',
 'appShell','loginScreen'].forEach(id=>nodos[id]={id,value:'',style:{},textContent:'',disabled:false});
const boton={disabled:false,style:{}};
const doc={getElementById:id=>nodos[id]||null,
  querySelector:s=>s.includes('login-btn')?boton:null,
  querySelectorAll:()=>[],addEventListener:()=>{}};
global.document=doc;
global.window={location:{href:'https://ecosermo.gdarei.com/'}};

let lanzado=0,signIn=null,signOuts=0,respuesta=null,claveNueva=null,respUpdate=null;
let claveActualValida=null;   // cuando no es null, el mock verifica contra ella
let toasts=[],abiertos=[],cerrados=[];
const launchApp=()=>{lanzado++;};
const supaOk={auth:{
  signInWithPassword:async c=>{signIn=c;
    // La verificacion de la clave actual pasa por aqui tambien
    if(claveActualValida!==null)
      return c.password===claveActualValida?{data:{user:{}},error:null}
                                          :{data:null,error:{message:'Invalid'}};
    return respuesta;},
  signOut:async()=>{signOuts++;return{};},
  updateUser:async c=>{claveNueva=c.password;return respUpdate||{error:null};}}};

const utils=fs.readFileSync(R+'js/utils.js','utf8').replace(/^\uFEFF/,'');
const trozo=utils.slice(utils.indexOf('// Modo de acceso'),utils.indexOf('// ══ LAUNCH ══'));
const fn=new Function('supa','AUTH_MODO','USERS','launchApp','document','console',
  'openM','closeM','toast',
  'let CU=null;'+trozo+
  ';return{doLogin,doLogout,_authEmail,verCU:()=>CU};');

const empSrc=fs.readFileSync(R+'js/empresa.js','utf8').replace(/\(\(\)=>\{const el=[\s\S]*$/,'');
const USERS=new Function('document',empSrc+';return EMPRESA_USERS;')(doc)(
  {administracion:1,remuneraciones:1,general:1,seguridad:1,otros:1});
const armar=(modo,supa)=>fn(supa||supaOk,modo,USERS,launchApp,doc,console,
  id=>abiertos.push(id),id=>cerrados.push(id),(t,e)=>toasts.push(t));

const migrado={data:{user:{user_metadata:{nombre:'Abel',cargo:'PCO',codigo:'EIBEL25',
  areas:['general']}}},error:null};
const rechazo={data:null,error:{message:'Invalid login credentials'}};
const reset=()=>{lanzado=0;signIn=null;signOuts=0;claveNueva=null;respUpdate=null;
  toasts=[];abiertos=[];cerrados=[];claveActualValida=null;
  nodos.loginErr.style.display='';nodos.loginErr.textContent='';
  nodos.clvErr.style.display='';nodos.clvErr.textContent='';
  nodos.loginCodigo.value='';nodos.loginClave.value='';
  nodos.clvActual.value='';nodos.clvNueva.value='';nodos.clvRepe.value='';};

(async()=>{
  const api=armar('supabase');

  console.log('\n== El email ya no depende de la clave ==');
  es('sale solo del codigo',api._authEmail('EIBEL25'),'eibel25@gdarei.com');
  es('  el mismo aunque cambie la clave',api._authEmail('EIBEL25'),api._authEmail('EIBEL25'));
  es('los puntos se normalizan igual',api._authEmail('CP.BISA_'),'cp-bisa@gdarei.com');
  const ef=fs.readFileSync(R+'herramientas/emailsFijos.js','utf8');
  es('emailsFijos normaliza igual',/replace\(\/\[\^a-z0-9\]\+\/g,'-'\)/.test(ef),true);
  es('  y usa el mismo dominio',/@gdarei\.com/.test(ef),true);

  console.log('\n== Entrar con codigo y clave ==');
  reset(); respuesta=migrado;
  nodos.loginCodigo.value='eibel25';        // en minusculas a proposito
  nodos.loginClave.value='EIBEL25-75MTXJ';
  await api.doLogin();
  es('entra',lanzado,1);
  es('  el codigo va al email',signIn.email,'eibel25@gdarei.com');
  es('  y la clave va aparte',signIn.password,'EIBEL25-75MTXJ');
  es('  la clave se borra del campo',nodos.loginClave.value,'');
  es('  CU sale del token',api.verCU().nombre,'Abel');

  console.log('\n== Sin clave no molesta al servidor ==');
  reset(); respuesta=migrado;
  nodos.loginCodigo.value='EIBEL25';
  nodos.loginClave.value='';
  await api.doLogin();
  es('no entra',lanzado,0);
  es('  ni llama a Supabase',signIn,'null');
  es('  y lo dice',nodos.loginErr.textContent,'Escriba su clave.');

  console.log('\n== Clave equivocada ==');
  reset(); respuesta=rechazo;
  nodos.loginCodigo.value='EIBEL25';
  nodos.loginClave.value='loquesea';
  await api.doLogin();
  es('no entra',lanzado,0);
  es('  con un aviso claro',nodos.loginErr.textContent,'Codigo o clave incorrectos.');
  es('  y el boton vuelve',boton.disabled,false);

  console.log('\n== El esquema viejo sigue entrando en modo mixto ==');
  reset(); respuesta=rechazo;
  const mixto=armar('mixto');
  const u=USERS[2];
  nodos.loginCodigo.value=(u.codigo+u.dni);
  nodos.loginClave.value='cualquiera';
  await mixto.doLogin();
  es('entra por la lista local',lanzado,1);
  es('  y CU sale del archivo',mixto.verCU().codigo,u.codigo);

  console.log('\n== La pantalla de acceso ==');
  const h=fs.readFileSync(R+'index.html','utf8');
  es('el codigo ya no es password',/id="loginCodigo" type="text"/.test(h),true);
  es('  y se escribe en mayusculas',/text-transform:uppercase/.test(h),true);
  es('hay campo de clave',/id="loginClave" type="password"/.test(h),true);
  es('  con Enter para entrar',/loginClave[\s\S]{0,400}Enter[\s\S]{0,20}doLogin/.test(h),true);
  es('el navegador puede recordar la clave',/autocomplete="current-password"/.test(h),true);
  es('el cambio de clave vive en su propia pagina',/id="page-miSeguridad"/.test(h),true);
  es('  y ya no hay modal ni boton en el encabezado',
    /id="mClave"|id="btnClave"/.test(h),false);

  console.log('\n== La herramienta de emails ==');
  es('tiene modo simulacion',/--simular/.test(ef),true);
  es('  no toca las contrasenas',/Solo el email\. Contrase/.test(ef),true);
  es('  y avisa si dos codigos chocan',/mismo email/.test(ef),true);

  console.log('\n'+(mal?'X '+mal+' fallo(s)':'OK todo bien')+'  ·  '+ok+'/'+(ok+mal));
  process.exit(mal?1:0);
})();
