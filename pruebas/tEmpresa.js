const fs=require('fs');
const R=require('path').join(__dirname,'..')+'/';
let ok=0,mal=0;
const es=(l,g,e)=>{const b=String(g)===String(e);b?ok++:mal++;
  console.log((b?'  OK  ':'  MAL ')+l.padEnd(58)+'= '+g+(b?'':'  (esperado '+e+')'));};

// ── El orden de carga es lo que puede romperlo todo ───────────────────────
const html=fs.readFileSync(R+'index.html','utf8');
const orden=[...html.matchAll(/<script src="js\/([^"?]+)/g)].map(m=>m[1]);
console.log('\n== empresa.js carga antes que config.js ==');
const iEmp=orden.indexOf('empresa.js'),iCfg=orden.indexOf('config.js');
es('empresa.js está en index.html',iEmp>=0,true);
es('  y va antes que config.js',iEmp<iCfg&&iEmp>=0,true);
es('la plantilla NO se carga',orden.includes('empresa.ejemplo.js'),false);

// ── Simular el navegador: mismo orden, mismo ámbito global ────────────────
const nodos={logoEmpresa:{id:'logoEmpresa',src:'09.-ERP/Imagenes/ECOSERMO-LOGO.png',alt:'Logo'}};
global.document={getElementById:id=>nodos[id]||null,querySelector:()=>null,
  querySelectorAll:()=>[],addEventListener:()=>{}};
global.window={location:{href:'https://ecosermo.gdarei.com/'},open:()=>null};
global.localStorage={getItem:()=>null,setItem:()=>{},removeItem:()=>{}};
let creado=null;
global.supabase={createClient:(u,k)=>{creado={u,k};return{from:()=>({})};}};

// El mismo orden que index.html: empresa.js, registro.js y después config.js,
// que construye su AREAS a partir del registro.
const src=fs.readFileSync(R+'js/empresa.js','utf8')+'\n'
 +fs.readFileSync(R+'js/registro.js','utf8')+'\n'
 +fs.readFileSync(R+'js/config.js','utf8')
 +'\n;global.EMPRESA=EMPRESA;global.USERS=USERS;global.AREAS=AREAS;'
 +'global.SUPA_URL=SUPA_URL;global.EMPRESA_USERS=EMPRESA_USERS;';
eval(src);

console.log('\n== Los dos juntos arrancan ==');
es('la empresa se identifica',EMPRESA.nombre,'ECOSERMO');
es('  con su RUC',EMPRESA.ruc,'20571533180');
es('  y su logo',EMPRESA.logo,'09.-ERP/Imagenes/ECOSERMO-LOGO.png');
es('Supabase se creó con la URL de empresa.js',creado.u,SUPA_URL);
es('  y con su llave',creado.k.startsWith('sb_publishable_'),true);

console.log('\n== Los usuarios siguen intactos ==');
es('cantidad',USERS.length,16);
const u=c=>USERS.find(x=>x.codigo===c);
es('el suyo existe',!!u('EIBEL25'),true);
es('  y ve todas las áreas',u('EIBEL25').areas.length,Object.keys(AREAS).length);
es('  Object.keys(A) resolvió de verdad',u('EIBEL25').areas.includes('remuneraciones'),true);
es('Jorge Jala sigue en Remuneraciones',u('JOR_JA').areas.includes('remuneraciones'),true);
es('Antony Cerquin conserva su recorte',!!u('ANT_CER').areaModules,true);
es('Noelia entra a Remuneraciones',u('NOEPAL').areas.includes('remuneraciones'),true);
es('la supervisión externa sigue limitada',u('CP.BISA_').areas.includes('remuneraciones'),false);
es('ningún código repetido',new Set(USERS.map(x=>x.codigo)).size,USERS.length);
es('todos tienen nombre y cargo',USERS.every(x=>x.nombre&&x.cargo),true);

console.log('\n== config.js ya no lleva datos del cliente ==');
const cfg=fs.readFileSync(R+'js/config.js','utf8');
es('no declara SUPA_URL',/const SUPA_URL\s*=/.test(cfg),false);
es('no declara SUPA_KEY',/const SUPA_KEY\s*=/.test(cfg),false);
es('no lleva la lista de usuarios',/codigo:'EIBEL25'/.test(cfg),false);
es('  pero sí la arma',/const USERS=EMPRESA_USERS\(AREAS\)/.test(cfg),true);
es('AREAS se queda (es común a todos)',/const AREAS=/.test(cfg),true);

console.log('\n== El nombre del cliente no está escrito en el código común ==');
// El logo ya salía de EMPRESA.logo, pero el NOMBRE se había quedado a medias:
// estaba escrito en 61 sitios de 23 módulos, sobre todo en cabeceras y pies de
// PDF. Un cliente nuevo habría emitido sus documentos con el nombre de otro.
let conNombre=[],conRuc=[];
fs.readdirSync(R+'js').filter(f=>f.endsWith('.js')&&!f.startsWith('empresa')).forEach(f=>{
  const s=fs.readFileSync(R+'js/'+f,'utf8');
  // Se busca el nombre en CÓDIGO, no en comentarios: uno que cuente la
  // historia del respaldo de partidas es información, no una fuga.
  const enCodigo=s.split(/\r?\n/).filter(l=>!l.trim().startsWith('//')&&l.includes(EMPRESA.nombre));
  if(enCodigo.length)conNombre.push(f+'('+enCodigo.length+')');
  if(s.includes(EMPRESA.ruc))conRuc.push(f);
});
es('ningún módulo lleva el nombre escrito',conNombre.join(' ')||'—','—');
es('  ni el RUC',conRuc.join(' ')||'—','—');
es('  ni la razón social',
   fs.readdirSync(R+'js').filter(f=>f.endsWith('.js')&&!f.startsWith('empresa'))
     .filter(f=>fs.readFileSync(R+'js/'+f,'utf8').includes('EMPRESA COMUNAL')).join(' ')||'—','—');
es('EMPRESA declara la razón social',!!EMPRESA.razon,true);

console.log('\n== La plantilla sirve tal cual para un cliente nuevo ==');
const ejSrc=fs.readFileSync(R+'js/empresa.ejemplo.js','utf8');
es('separa producción de desarrollo',/const SUPA_URL_PROD/.test(ejSrc)&&/const SUPA_URL_DEV/.test(ejSrc),true);
es('  y conmuta por hostname',/_GDAR_DEV/.test(ejSrc),true);
es('trae las convenciones del contrato',/EMPRESA_CORTE/.test(ejSrc)&&/EMPRESA_DIAS_MES/.test(ejSrc),true);
// El respaldo de partidas que queda en el código es el contrato del primer
// cliente. Con la bandera en true, un cliente nuevo valorizaría con precios
// de otra empresa, y el error saldría en un documento firmado.
es('no hereda el contrato del primer cliente',/const EMPRESA_VAL_RESPALDO=false/.test(ejSrc),true);

console.log('\n== El logo de los PDF sale de la config ==');
let conLogo=0,sueltas=0;
fs.readdirSync(R+'js').filter(f=>f.endsWith('.js')).forEach(f=>{
  const s=fs.readFileSync(R+'js/'+f,'utf8');
  if(f!=='empresa.js'&&f!=='empresa.ejemplo.js'){
    sueltas+=s.split('ECOSERMO-LOGO.png').length-1;
  }
  conLogo+=s.split('EMPRESA.logo').length-1;
});
es('29 usos de EMPRESA.logo en los PDF',conLogo>=29,true);
es('ninguna ruta de logo quedó suelta en js/',sueltas,0);
es('el login apunta al id',/id="logoEmpresa"/.test(html),true);
es('  y empresa.js lo repinta',nodos.logoEmpresa.src,EMPRESA.logo);
es('  con el alt de la empresa',nodos.logoEmpresa.alt,'ECOSERMO');

console.log('\n== La plantilla del cliente nuevo sirve ==');
const ej=fs.readFileSync(R+'js/empresa.ejemplo.js','utf8');
es('es JavaScript válido',(()=>{try{new Function(ej);return true;}catch(e){return false;}})(),true);
es('define las tres piezas',/const EMPRESA=/.test(ej)&&/const SUPA_URL/.test(ej)&&/const EMPRESA_USERS=/.test(ej),true);
es('no filtra la llave de ECOSERMO',ej.includes(creado.k),false);
es('  ni su URL',ej.includes(creado.u),false);
es('  ni sus códigos de acceso',/EIBEL25|OMARS|NOEPAL/.test(ej),false);
es('el instructivo existe',fs.existsSync(R+'herramientas/NUEVO-CLIENTE.md'),true);

console.log('\n== El instructivo dice la verdad ==');
// Un alta se hace leyendo ese archivo. Si cita cifras o comandos que ya no
// existen, el cliente sale mal montado y nadie se entera hasta que él lo nota.
{
  const doc=fs.readFileSync(R+'herramientas/NUEVO-CLIENTE.md','utf8');
  const scripts=(html.match(/<script src="js\/|type="text\/gdar" data-src="js\//g)||[]).length;
  const suites=fs.readdirSync(R+'pruebas').filter(f=>/^t.*\.js$/.test(f)).length;
  es('la cuenta de scripts es la real',
     new RegExp('los '+scripts+' scripts').test(doc),true);
  es('  y la de suites también',new RegExp('las '+suites+' suites').test(doc),true);

  const paquete=JSON.parse(fs.readFileSync(R+'package.json','utf8')).scripts||{};
  const citados=[...doc.matchAll(/^npm run ([\w:]+)/gm)].map(m=>m[1]);
  es('todos los `npm run` que cita existen',
     [...new Set(citados)].filter(c=>!paquete[c]).join(' ')||'—','—');
  const herram=[...doc.matchAll(/^node (herramientas\/[\w.]+)/gm)].map(m=>m[1]);
  es('  y las herramientas que nombra también',
     [...new Set(herram)].filter(f=>!fs.existsSync(R+f)).join(' ')||'—','—');

  // Los tres pasos que si se omiten dan un cliente roto de una forma que no
  // salta a la vista: valoriza con precios ajenos, apunta a la base de otro,
  // o sirve para siempre una copia vieja desde el service worker.
  es('avisa de no heredar el presupuesto ajeno',/EMPRESA_VAL_RESPALDO/.test(doc),true);
  es('nombra las claves separadas de prod y dev',/SUPA_URL_PROD/.test(doc),true);
  es('y manda sellar antes de subir',/npm run sellar/.test(doc),true);
}

console.log('\n== La plantilla repinta la pantalla con SU empresa ==');
// index.html trae los textos del primer cliente escritos como valor por
// defecto: "GDAR - ECOSERMO" en el acceso, el título de la pestaña, el adorno
// partido en ECO/SERMO y las firmas del reporte diario. El repintado vive en
// empresa.js, así que la plantilla TIENE que traerlo: sin él un cliente nuevo
// enseñaría el nombre de otra empresa en su propia pantalla de acceso.
const SELECTORES=['.login-brand','.login-site','.fc-brand',
                  '.login-float.lf1','.login-float.lf2','.emp-firma'];

function simularPintado(fuente,nombre){
  const nodos={};
  SELECTORES.forEach(s=>{nodos[s]=[{textContent:'ECOSERMO',dataset:{rol:'Residente'}}];});
  const doc={
    title:'GDAR - ECOSERMO · Sistema Operativo',
    readyState:'complete',
    getElementById:()=>({}),
    querySelectorAll:sel=>nodos[sel]||[],
    addEventListener:()=>{}
  };
  // Un nombre CON espacio a propósito: el adorno parte el nombre en dos y para
  // eso lo compacta. Si esa expresión se escribe mal —pasó— borra las letras
  // en vez de los espacios, y solo se nota con un cliente que no sea el primero.
  new Function('document',fuente.replace(/NOMBRE DE LA EMPRESA/g,nombre))(doc);
  const txt=s=>nodos[s][0].textContent;
  return{titulo:doc.title,txt};
}
{
  const p=simularPintado(ejSrc,'Minera Los Andes');
  es('el título de la pestaña es suyo',/Minera Los Andes/.test(p.titulo),true);
  es('  y no del primer cliente',/ECOSERMO/.test(p.titulo),false);
  es('la pantalla de acceso lo nombra',p.txt('.login-brand'),'GDAR - Minera Los Andes');
  es('  con su sede debajo',/Provincia \/ Unidad minera/.test(p.txt('.login-site')),true);
  es('el pie de los documentos también',p.txt('.fc-brand'),'Minera Los Andes');
  es('el adorno se parte en dos mitades',
     p.txt('.login-float.lf1')+p.txt('.login-float.lf2'),'MineraLosAndes');
  es('  sin comerse letras por el camino',p.txt('.login-float.lf1'),'MineraL');
  es('la firma conserva el rol y cambia la empresa',
     p.txt('.emp-firma'),'Residente – Minera Los Andes');
  let quedan=SELECTORES.filter(s=>/ECOSERMO/.test(p.txt(s)));
  es('no queda ni un texto del primer cliente',quedan.join(' ')||'—','—');
}

// Lo mismo sobre producción. Con el nombre de ECOSERMO el fallo del adorno no
// se ve —no tiene espacios ni eses minúsculas—, así que se le pone otro: es la
// única forma de que un error que solo afecta al SEGUNDO cliente falle hoy.
{
  const prod=fs.readFileSync(R+'js/empresa.js','utf8')
    .replace(/nombre:'ECOSERMO'/,"nombre:'Minera Los Andes'");
  const p=simularPintado(prod,'Minera Los Andes');
  es('producción parte el nombre igual de bien',
     p.txt('.login-float.lf1')+p.txt('.login-float.lf2'),'MineraLosAndes');
  es('  y nombra la pantalla de acceso',p.txt('.login-brand'),'GDAR - Minera Los Andes');
}

// Y que las dos copias no se separen: lo que empresa.js repinta, la plantilla
// también. Añadir un selector solo en producción es cómo se llegó hasta aquí.
{
  const selsDe=s=>[...s.matchAll(/poner\('([^']+)'/g)].map(m=>m[1]).sort().join(' ');
  es('la plantilla pinta lo mismo que producción',
     selsDe(ejSrc),selsDe(fs.readFileSync(R+'js/empresa.js','utf8')));
  es('la plantilla declara la razón social',/razon:/.test(ejSrc),true);
  es('  y dónde opera',/sitio:/.test(ejSrc),true);
  es('  y cómo entra la gente',/const AUTH_MODO=/.test(ejSrc),true);
}

console.log('\n== Un cliente distinto convive sin chocar ==');
// Se evalúa OTRO empresa.js en un ámbito propio, como lo haría su navegador
const otro=`
const EMPRESA={nombre:'OTRA S.A.C.',ruc:'20999999999',logo:'09.-ERP/Imagenes/OTRA.png'};
const SUPA_URL='https://otra.supabase.co';
const SUPA_KEY='sb_publishable_otra';
const EMPRESA_USERS=A=>[{codigo:'X1',dni:'1',nombre:'Uno',cargo:'Admin',areas:Object.keys(A)}];
return {EMPRESA,SUPA_URL,EMPRESA_USERS};`;
const o=new Function(otro)();
es('otra empresa se identifica sola',o.EMPRESA.nombre,'OTRA S.A.C.');
es('  con su propia base',o.SUPA_URL,'https://otra.supabase.co');
es('  distinta de la de ECOSERMO',o.SUPA_URL!==SUPA_URL,true);
es('sus usuarios son los suyos',o.EMPRESA_USERS(AREAS).length,1);
es('  y reciben todas las áreas',o.EMPRESA_USERS(AREAS)[0].areas.length,Object.keys(AREAS).length);

console.log('\n== Si empresa.js faltara, se nota al instante ==');
let error=null;
try{new Function(fs.readFileSync(R+'js/config.js','utf8'))();}catch(e){error=e.constructor.name;}
es('config.js solo no arranca',error,'ReferenceError');

console.log('\n'+(mal?'X '+mal+' fallo(s)':'OK todo bien')+'  ·  '+ok+'/'+(ok+mal));
process.exit(mal?1:0);
