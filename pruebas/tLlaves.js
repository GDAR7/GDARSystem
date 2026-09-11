// ══ QUE LA LLAVE ENTRE EN .env Y EN NINGÚN OTRO SITIO ═══════════════════════
// herramientas/llaves.js lee la service_role del portapapeles y la escribe en
// .env. Esta suite comprueba las tres cosas que no pueden fallar:
//
//   · que la llave NUNCA aparezca en un mensaje de pantalla;
//   · que no se acepte la equivocada: la publicable, la anon, o la del otro
//     proyecto —la de dev en el hueco de prod es el error más probable—;
//   · que no se escriba en un .env que se subiría a un repositorio público.
//
// Las llaves de aquí son inventadas, y las que empiezan como una secret se
// arman por partes: escritas enteras, el detector de secretos de verificar.js
// las tomaría por reales camino al repo.

const fs=require('fs');
const R=require('path').join(__dirname,'..')+'/';
const L=require(R+'herramientas/llaves.js');

let ok=0,mal=0;
const es=(l,g,e)=>{const b=String(g)===String(e);b?ok++:mal++;
  console.log((b?'  OK  ':'  MAL ')+l.padEnd(58)+'= '+g+(b?'':'  (esperado '+e+')'));};

const PROD='kotqxhpkjuaxbgwhiode';
const DEV ='wezrieubjcvcrtinppfw';
const URLS={SUPA_URL_PROD:'https://'+PROD+'.supabase.co',SUPA_URL_DEV:'https://'+DEV+'.supabase.co'};

const b64=o=>Buffer.from(JSON.stringify(o)).toString('base64')
  .replace(/=+$/,'').replace(/\+/g,'-').replace(/\//g,'_');
const jwt=carga=>b64({alg:'HS256',typ:'JWT'})+'.'+b64(carga)+'.firmaInventada';

const SECRET='sb_'+'secret_'+'InventadaParaLaSuite01';
const PUBLICA='sb_publishable_InventadaParaLaSuite01';
const SR_DEV =jwt({role:'service_role',ref:DEV});
const SR_PROD=jwt({role:'service_role',ref:PROD});
const ANON   =jwt({role:'anon',ref:DEV});

const GITIGNORE='node_modules/\nrespaldos/\n.env\n';
const EJEMPLO='# plantilla\nGDAR_URL=https://xxxxxxxxxxxx.supabase.co\nGDAR_SERVICE_KEY=\n\nGDAR_SERVICE_KEY_DEV=\n';

const poner=o=>L.colocar(Object.assign({
  cual:'dev',portapapeles:SECRET,envActual:null,ejemplo:EJEMPLO,
  gitignore:GITIGNORE,rastreado:false,urls:URLS,comprobar:async()=>200
},o));

(async()=>{

console.log('\n== La llave buena entra donde debe ==');
{
  const r=await poner({});
  es('se acepta una secret',r.ok,true);
  es('  y va a la variable de desarrollo',/^GDAR_SERVICE_KEY_DEV=sb_secret_/m.test(r.envNuevo),true);
  es('  sin tocar la de producción',/^GDAR_SERVICE_KEY=$/m.test(r.envNuevo),true);
  es('  y parte de la plantilla si no había .env',/^# plantilla/.test(r.envNuevo),true);
  const p=await poner({cual:'prod',portapapeles:SR_PROD});
  es('la service_role antigua de prod va a prod',/^GDAR_SERVICE_KEY=eyJ/m.test(p.envNuevo),true);
  es('  y deja vacía la de dev',/^GDAR_SERVICE_KEY_DEV=$/m.test(p.envNuevo),true);
}

console.log('\n== Ningún mensaje muestra la llave ==');
// Lo que sale en pantalla se comparte, se fotografía y se pega en chats. Se
// comprueba con TODOS los caminos: los que aceptan y los que rechazan.
{
  const casos=[
    {},{cual:'prod',portapapeles:SR_PROD},
    {portapapeles:PUBLICA},{portapapeles:ANON},{portapapeles:SR_PROD},
    {comprobar:async()=>401},{comprobar:async()=>null},{comprobar:async()=>500},
    {gitignore:'node_modules/\n'},{rastreado:true},{cual:'otro'}
  ];
  const secretos=[SECRET,SR_DEV,SR_PROD,ANON];
  let fugas=0;
  for(const c of casos){
    const r=await poner(c);
    for(const m of r.mensajes)
      if(secretos.some(s=>m.includes(s))||/sb_secret_\w{6}/.test(m))fugas++;
  }
  es('en '+casos.length+' caminos, cero fugas',fugas,0);
  const src=fs.readFileSync(R+'herramientas/llaves.js','utf8');
  // Se quitan antes los textos entre comillas: la palabra "portapapeles" en un
  // mensaje no es la variable portapapeles. Sin esto la prueba se quejaba de
  // 'No se pudo leer el portapapeles.', que no muestra nada.
  const sinTextos=src.replace(/'(?:[^'\\\n]|\\.)*'/g,"''");
  const consolas=sinTextos.match(/console\.\w+\([^;]*\)/g)||[];
  es('  y en el código ningún console muestra la variable',
     consolas.filter(c=>/\b(llave|portapapeles)\b/.test(c)).join(' | ')||'—','—');
}

console.log('\n== La equivocada no entra ==');
{
  const pub=await poner({portapapeles:PUBLICA});
  es('la publicable se rechaza',pub.ok,false);
  es('  diciendo por qué',/PUBLICABLE/.test(pub.mensajes[0]),true);
  const anon=await poner({portapapeles:ANON});
  es('la anon antigua se rechaza',anon.ok,false);
  es('  y se nombra el rol',/"anon"/.test(anon.mensajes[0]),true);
  es('vacío se rechaza',(await poner({portapapeles:'  '})).ok,false);
  es('dos líneas copiadas se rechazan',(await poner({portapapeles:SECRET+'\notra'})).ok,false);
  es('un texto cualquiera se rechaza',(await poner({portapapeles:'hola'})).ok,false);
  es('un JWT roto se rechaza',(await poner({portapapeles:'eyJroto.nada.x'})).ok,false);
  es('un salto de línea al final no molesta',(await poner({portapapeles:SECRET+'\r\n'})).ok,true);
}

console.log('\n== La del otro proyecto no entra ==');
// El error más probable: copiar la de dev y ponerla en prod, o al revés. En
// las antiguas el proyecto va escrito dentro; en las nuevas solo lo sabe
// Supabase, así que se le pregunta.
{
  const cruzada=await poner({cual:'prod',portapapeles:SR_DEV});
  es('una antigua de dev en prod se rechaza',cruzada.ok,false);
  es('  diciendo de qué proyecto era',new RegExp(DEV).test(cruzada.mensajes[0]),true);
  const rech=await poner({comprobar:async()=>401});
  es('una secret que Supabase rechaza no se guarda',rech.ok,false);
  es('  ni con 403',(await poner({comprobar:async()=>403})).ok,false);
  let pregunto=null;
  await poner({cual:'prod',comprobar:async(u)=>{pregunto=u;return 200;}});
  es('se le pregunta al proyecto que toca',pregunto,URLS.SUPA_URL_PROD);
  const sinRed=await poner({comprobar:async()=>null});
  es('sin red se guarda, pero avisando',sinRed.ok&&sinRed.mensajes.some(m=>/^Aviso/.test(m)),true);
}

console.log('\n== No se escribe en un .env que se subiría ==');
// El repositorio es público.
{
  es('si .env no está en .gitignore, no',(await poner({gitignore:'node_modules/\n'})).ok,false);
  es('  ni si solo aparece como parte de otra línea',
     (await poner({gitignore:'.env.example\n'})).ok,false);
  const r=await poner({rastreado:true});
  es('si git ya lo sigue, tampoco',r.ok,false);
  es('  y se dice cómo sacarlo',/git rm --cached \.env/.test(r.mensajes[0]),true);
}

console.log('\n== El .env queda como estaba, salvo esa línea ==');
{
  const e='# mío\nGDAR_URL=https://a.supabase.co\nGDAR_SERVICE_KEY=vieja\nGDAR_SERVICE_KEY_DEV=otra\nGDAR_RESPALDOS=D:/r\n';
  const n=L.escribirEnv(e,'GDAR_SERVICE_KEY','nueva');
  es('reemplaza el valor',/^GDAR_SERVICE_KEY=nueva$/m.test(n),true);
  es('  sin tocar la del mismo prefijo',/^GDAR_SERVICE_KEY_DEV=otra$/m.test(n),true);
  es('  ni los comentarios ni lo demás',
     n.includes('# mío')&&n.includes('GDAR_RESPALDOS=D:/r')&&n.includes('GDAR_URL=https://a.supabase.co'),true);
  es('  y no cambia la cantidad de líneas',n.split('\n').length,e.split('\n').length);
  const dup=L.escribirEnv('A=1\nGDAR_SERVICE_KEY=x\nGDAR_SERVICE_KEY=y\n','GDAR_SERVICE_KEY','z');
  es('si estaba dos veces, queda una',(dup.match(/^GDAR_SERVICE_KEY=/gm)||[]).length,1);
  es('una línea comentada no se toca',
     L.escribirEnv('# GDAR_SERVICE_KEY=vieja\n','GDAR_SERVICE_KEY','n').includes('# GDAR_SERVICE_KEY=vieja'),true);
  es('  y si no estaba, se agrega',
     /^GDAR_SERVICE_KEY=n$/m.test(L.escribirEnv('A=1\n','GDAR_SERVICE_KEY','n')),true);
  es('respeta los finales de línea de Windows',
     L.escribirEnv('A=1\r\nGDAR_SERVICE_KEY=\r\n','GDAR_SERVICE_KEY','n'),'A=1\r\nGDAR_SERVICE_KEY=n\r\n');
}

console.log('\n== Enganches ==');
{
  const pkg=JSON.parse(fs.readFileSync(R+'package.json','utf8')).scripts;
  es('npm run llaves existe',pkg.llaves,'node herramientas/llaves.js');
  const src=fs.readFileSync(R+'herramientas/llaves.js','utf8');
  es('borra el portapapeles',/Set-Clipboard -Value ' '/.test(src),true);
  es('  aunque la llave se haya rechazado',/haya salido bien o no/.test(src),true);
  es('las variables son las que leen las herramientas',
     L.DESTINOS.prod.variable+','+L.DESTINOS.dev.variable,'GDAR_SERVICE_KEY,GDAR_SERVICE_KEY_DEV');
}

console.log('\n'+(mal?'X '+mal+' fallo(s)':'OK todo bien')+'  ·  '+ok+'/'+(ok+mal));
process.exit(mal?1:0);

})();
