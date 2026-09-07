// La pagina "Mi Seguridad": cambio de clave desde el menu, visible para todos.
const fs=require('fs');
const R='c:/Users/LENOVO/OneDrive/Documents/GitHub/GDARSystem/';
let ok=0,mal=0;
const es=(l,g,e)=>{const b=String(g)===String(e);b?ok++:mal++;
  console.log((b?'  OK  ':'  MAL ')+l.padEnd(58)+'= '+g+(b?'':'  (esperado '+e+')'));};

const nodos={};
['segActual','segNueva','segRepe','segErr','segOk','segBtn','segInfo','sideNav',
 'loginCodigo','loginClave','loginErr'].forEach(id=>
  nodos[id]={id,value:'',style:{},textContent:'',innerHTML:'',disabled:false});
const doc={getElementById:id=>nodos[id]||null,querySelector:()=>null,
  querySelectorAll:()=>[],addEventListener:()=>{}};
global.document=doc;
global.window={location:{href:'https://ecosermo.gdarei.com/'}};

let signIn=null,claveNueva=null,claveActualValida=null,respUpdate=null,toasts=[];
const supaOk={auth:{
  signInWithPassword:async c=>{signIn=c;
    return c.password===claveActualValida?{data:{user:{}},error:null}
                                        :{data:null,error:{message:'Invalid'}};},
  updateUser:async c=>{claveNueva=c.password;return respUpdate||{error:null};},
  signOut:async()=>({})}};

const utils=fs.readFileSync(R+'js/utils.js','utf8').replace(/^\uFEFF/,'');
const trozo=utils.slice(utils.indexOf('// Modo de acceso'),utils.indexOf('// ══ LAUNCH ══'));
const CU={nombre:'Abel Rodríguez A.',cargo:'PCO',codigo:'EIBEL25',areas:['general']};
const fn=new Function('supa','AUTH_MODO','USERS','launchApp','document','console','toast','CU',
  trozo+';return{guardarClave,rMiSeguridad,_authEmail};');
const api=fn(supaOk,'supabase',[],()=>{},doc,console,t=>toasts.push(t),CU);

const reset=()=>{signIn=null;claveNueva=null;respUpdate=null;toasts=[];
  claveActualValida='LaDeSiempre123';
  ['segActual','segNueva','segRepe'].forEach(i=>nodos[i].value='');
  ['segErr','segOk'].forEach(i=>{nodos[i].style.display='';nodos[i].textContent='';});};

(async()=>{
  console.log('\n== La pagina se prepara al entrar ==');
  reset();
  nodos.segActual.value='basura';nodos.segErr.style.display='block';
  api.rMiSeguridad();
  es('vacia los campos',nodos.segActual.value,'');
  es('  oculta mensajes anteriores',nodos.segErr.style.display,'none');
  es('  y dice quien es usted',/Abel Rodríguez A\./.test(nodos.segInfo.innerHTML),true);
  es('  con su codigo de usuario',/EIBEL25/.test(nodos.segInfo.innerHTML),true);

  console.log('\n== Cambiar la clave ==');
  reset();
  nodos.segActual.value='LaDeSiempre123';
  nodos.segNueva.value='ClaveNueva2026';nodos.segRepe.value='ClaveNueva2026';
  await api.guardarClave();
  es('la manda al servidor',claveNueva,'ClaveNueva2026');
  es('  verificando antes la actual',signIn.password,'LaDeSiempre123');
  es('  contra su propio email',signIn.email,'eibel25@gdarei.com');
  es('  confirma en pantalla',nodos.segOk.style.display,'block');
  es('  y limpia los campos',nodos.segActual.value+nodos.segNueva.value,'');

  console.log('\n== Hay que saber la clave actual ==');
  reset();
  nodos.segNueva.value='ClaveNueva2026';nodos.segRepe.value='ClaveNueva2026';
  await api.guardarClave();
  es('sin la actual no cambia',claveNueva,'null');
  es('  y la pide',/clave actual/.test(nodos.segErr.textContent),true);

  reset();
  nodos.segActual.value='Equivocada999';
  nodos.segNueva.value='ClaveNueva2026';nodos.segRepe.value='ClaveNueva2026';
  await api.guardarClave();
  es('con la actual mal, tampoco',claveNueva,'null');
  es('  y lo dice',nodos.segErr.textContent,'La clave actual no es correcta.');

  console.log('\n== Validaciones de la nueva ==');
  reset(); nodos.segActual.value='LaDeSiempre123';
  nodos.segNueva.value='corta';nodos.segRepe.value='corta';
  await api.guardarClave();
  es('rechaza menos de 8',claveNueva,'null');
  es('  sin molestar al servidor',signIn,'null');

  reset(); nodos.segActual.value='LaDeSiempre123';
  nodos.segNueva.value='ClaveLarga2026';nodos.segRepe.value='Distinta2026';
  await api.guardarClave();
  es('rechaza si no coinciden',claveNueva,'null');

  reset(); nodos.segActual.value='LaDeSiempre123';
  nodos.segNueva.value='LaDeSiempre123';nodos.segRepe.value='LaDeSiempre123';
  await api.guardarClave();
  es('la nueva no puede ser la misma',claveNueva,'null');

  console.log('\n== Si el servidor rechaza ==');
  reset(); nodos.segActual.value='LaDeSiempre123';
  respUpdate={error:{message:'Password is too weak'}};
  nodos.segNueva.value='ClaveNueva2026';nodos.segRepe.value='ClaveNueva2026';
  await api.guardarClave();
  es('lo muestra',/No se pudo cambiar/.test(nodos.segErr.textContent),true);
  es('  no confirma en falso',nodos.segOk.style.display,'none');
  es('  y el boton queda usable',nodos.segBtn.disabled,false);

  console.log('\n== En el menu, al alcance de todos ==');
  const u=fs.readFileSync(R+'js/utils.js','utf8');
  es('el item existe',/nm-miSeguridad/.test(u),true);
  es('  agrupado en Configuracion General',/Configuración General/.test(u),true);
  es('  con su propio desplegable',/na-cfgGeneral/.test(u),true);
  es('  que no sale de AREAS (lo ven todos)',/AREAS.cfgGeneral/.test(u),false);
  es('  y no depende de permisos',/_authModo\(\)!=='local'/.test(u),true);
  es('renderPage la conoce',/miSeguridad:rMiSeguridad/.test(u),true);

  const h=fs.readFileSync(R+'index.html','utf8');
  es('la pagina existe',/id="page-miSeguridad"/.test(h),true);
  es('  con los tres campos',/segActual[\s\S]*segNueva[\s\S]*segRepe/.test(h),true);
  es('  y Enter guarda',/segRepe[\s\S]{0,120}Enter[\s\S]{0,20}guardarClave/.test(h),true);
  es('el boton del encabezado ya no esta',/id="btnClave"/.test(h),false);
  es('el modal viejo tampoco',/id="mClave"/.test(h),false);

  console.log('\n== La pagina no queda dentro de otra ==');
  const NL=String.fromCharCode(10);
  const F=h.split(NL);
  const i=F.findIndex(l=>l.indexOf('id="page-miSeguridad"')>-1);
  let anidada=false;
  for(let k=0;k<i;k++){
    if(F[k].indexOf('<div class="page"')>-1&&F[k].indexOf('page-miSeguridad')<0)anidada=true;
    else if(F[k].indexOf('</div>')===0)anidada=false;
  }
  es('cuelga del nivel raiz',anidada,false);

  console.log('\n'+(mal?'X '+mal+' fallo(s)':'OK todo bien')+'  ·  '+ok+'/'+(ok+mal));
  process.exit(mal?1:0);
})();
