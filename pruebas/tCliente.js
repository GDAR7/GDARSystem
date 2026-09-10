// ══ QUE UN ALTA MAL HECHA NO LLEGUE A PRODUCCIÓN ════════════════════════════
// js/empresa.js es el único archivo que cambia de un cliente a otro, así que
// es donde se concentran los errores de un alta. Y son errores callados: la
// aplicación abre igual, se ve normal, y el fallo aparece semanas después en
// una pantalla en blanco o en una valorización descuadrada.
//
// Esta suite comprueba que cada uno de esos casos se detecte ANTES de publicar.
// Se prueban clientes inventados —uno con el plan roto, otro con códigos
// repetidos— sin tocar el archivo del cliente de verdad; por eso revisarCliente
// recibe el texto y no lo lee del disco.

const fs=require('fs');
const R=require('path').join(__dirname,'..')+'/';
const{revisarCliente,sinNavegador}=require(R+'herramientas/revisarCliente.js');

let ok=0,mal=0;
const es=(l,g,e)=>{const b=String(g)===String(e);b?ok++:mal++;
  console.log((b?'  OK  ':'  MAL ')+l.padEnd(58)+'= '+g+(b?'':'  (esperado '+e+')'));};

const REGISTRO=fs.readFileSync(R+'js/registro.js','utf8');

// Un cliente correcto, del que cada caso se desvía en UNA sola cosa. Así lo que
// falla señala exactamente qué se rompió.
const BUENO={
  nombre:'Minera Los Andes', ruc:'20123456789',
  razon:'MINERA LOS ANDES S.A.C.', sitio:'Yauli / La Oroya',
  logo:'09.-ERP/Imagenes/ANDES.png',
  key:'sb_publishable_abcdefghijklmnop',
  corte:'21', diasMes:'30',
  plan:"{nombre:'Operación',areas:['administracion'],modulos:['histograma']}",
  users:"A=>[{codigo:'ADMIN01',nombre:'Ana',cargo:'Admin',areas:['administracion']},"
       +"{codigo:'ALMA01',nombre:'Beto',cargo:'Almacén',areas:['almacenLogistica']}]"
};

function fuente(c){
  c=Object.assign({},BUENO,c);
  return`
const EMPRESA={nombre:'${c.nombre}',ruc:'${c.ruc}',razon:'${c.razon}',
  sitio:'${c.sitio}',logo:'${c.logo}'};
const SUPA_URL_PROD='https://andes.supabase.co';
const SUPA_KEY_PROD='${c.key}';
const SUPA_URL_DEV='https://andes-dev.supabase.co';
const SUPA_KEY_DEV='sb_publishable_devdevdevdevdevdev';
const EMPRESA_CORTE=${c.corte};
const EMPRESA_DIAS_MES=${c.diasMes};
const EMPRESA_VAL_RESPALDO=false;
const EMPRESA_PLAN=${c.plan};
const EMPRESA_USERS=${c.users};
(()=>{const el=document.getElementById('logoEmpresa');
  if(el){el.src=EMPRESA.logo;}})();
`;
}

// Devuelve solo los fallos, que es lo que importa comprobar.
const revisar=c=>revisarCliente({
  empresaSrc:fuente(c), registroSrc:REGISTRO, existe:()=>true
}).filter(h=>!h.ok).map(h=>h.texto);

console.log('\n== Un cliente bien montado pasa limpio ==');
{
  const fallos=revisar({});
  es('sin una sola queja',fallos.join(' · ')||'—','—');
  const todo=revisarCliente({empresaSrc:fuente({}),registroSrc:REGISTRO,existe:()=>true});
  es('  y se comprobaron nueve cosas',todo.length,9);
}

console.log('\n== Marcadores de la plantilla sin rellenar ==');
// Llegar a producción con uno significa que el alta se dejó a medias: el
// cliente vería "NOMBRE DE LA EMPRESA" en su propia pantalla de acceso.
{
  es('el nombre sin poner',
     revisar({nombre:'NOMBRE DE LA EMPRESA'}).some(t=>/marcadores/.test(t)),true);
  es('  la razón social sin poner',
     revisar({razon:'RAZON SOCIAL COMPLETA S.A.C.'}).some(t=>/marcadores/.test(t)),true);
  es('  la sede sin poner',
     revisar({sitio:'Provincia / Unidad minera'}).some(t=>/marcadores/.test(t)),true);
  es('  el RUC de relleno',
     revisar({ruc:'00000000000'}).some(t=>/marcadores/.test(t)),true);
  es('  y la URL de ejemplo',
     revisarCliente({empresaSrc:fuente({}).replace('andes.supabase.co','XXXXXXXXXXXX.supabase.co'),
       registroSrc:REGISTRO,existe:()=>true}).filter(h=>!h.ok)
       .some(h=>/marcadores/.test(h.texto)),true);
}

console.log('\n== Datos que no cuadran ==');
{
  es('un RUC corto',revisar({ruc:'2012345'}).some(t=>/RUC/.test(t)),true);
  es('  o con letras',revisar({ruc:'2012345678A'}).some(t=>/RUC/.test(t)),true);
  es('un logo que no está',
     revisarCliente({empresaSrc:fuente({}),registroSrc:REGISTRO,existe:()=>false})
       .filter(h=>!h.ok).some(h=>/logo/.test(h.texto)),true);
}

console.log('\n== La llave que viaja al navegador ==');
// La service_role salta TODAS las políticas RLS. Puesta aquí, cualquiera que
// abra la consola del navegador lee y escribe la base entera.
{
  es('la service_role se rechaza',
     // Se arma por partes: escrita entera, el detector de secretos de
     // verificar.js la tomaría por una llave de verdad camino al repo.
     revisar({key:'sb_'+'secret_'+'unallavefalsa'}).some(t=>/publicable/.test(t)),true);
  es('  y también un campo vacío',
     revisar({key:''}).some(t=>/publicable/.test(t)),true);
  es('la publicable pasa',revisar({key:'sb_publishable_xyz'}).length,0);
  es('  y un JWT antiguo también',revisar({key:'eyJhbGciOiJIUzI1NiJ9.abc'}).length,0);
}

console.log('\n== El día de corte gobierna lo que se factura ==');
// 21 significa "del 21 de un mes al 20 del siguiente". Fuera de 1..28 los
// períodos se descuadran, y eso sale en el documento que firma el cliente.
{
  es('el 0 no existe',revisar({corte:'0'}).some(t=>/corte/.test(t)),true);
  es('  ni el 31, que no todos los meses tienen',
     revisar({corte:'31'}).some(t=>/corte/.test(t)),true);
  es('  ni un texto',revisar({corte:"'veintiuno'"}).some(t=>/corte/.test(t)),true);
  es('el 1 vale (mes calendario)',revisar({corte:'1'}).length,0);
  es('  y el 28 también',revisar({corte:'28'}).length,0);
  es('un divisor de cero se rechaza',
     revisar({diasMes:'0'}).some(t=>/mes-hombre/.test(t)),true);
}

console.log('\n== Un plan que nombra lo que no existe ==');
// No revienta: deja un área vacía. Quien la tuviera asignada ve una pantalla
// en blanco y nadie sabe por qué.
{
  es('un área inventada',
     revisar({plan:"{areas:['contabilidad'],modulos:[]}"}).some(t=>/no existe/.test(t)),true);
  es('  un módulo inventado',
     revisar({plan:"{areas:[],modulos:['facturacionElectronica']}"}).some(t=>/no existe/.test(t)),true);
  es('  y se dice cuál es',
     revisarCliente({empresaSrc:fuente({plan:"{areas:['contabilidad'],modulos:[]}"}),
       registroSrc:REGISTRO,existe:()=>true}).find(h=>!h.ok).detalle,'contabilidad');
  es('null significa "todo" y es válido',
     revisar({plan:'{areas:null,modulos:null}'}).length,0);
}

console.log('\n== Quién entra ==');
{
  es('dos personas con el mismo código',
     revisar({users:"A=>[{codigo:'ADMIN01',areas:[]},{codigo:'ADMIN01',areas:[]}]"})
       .some(t=>/repetidos/.test(t)),true);
  es('  y se avisa que el segundo nunca entra',
     revisarCliente({empresaSrc:fuente({users:"A=>[{codigo:'X',areas:[]},{codigo:'X',areas:[]}]"}),
       registroSrc:REGISTRO,existe:()=>true}).find(h=>!h.ok).detalle.includes('nunca entra'),true);
  es('un área que no existe en el registro',
     revisar({users:"A=>[{codigo:'A1',areas:['tesoreria']}]"}).some(t=>/área que no existe/.test(t)),true);
  es('Object.keys(A) sigue funcionando',
     revisar({users:"A=>[{codigo:'A1',areas:Object.keys(A)}]"}).length,0);
}

console.log('\n== Y si el archivo está roto, se dice ==');
// Un error de sintaxis aquí deja la aplicación entera sin arrancar, así que
// más vale enterarse antes de subirlo que por el aviso de un usuario.
{
  const r=revisarCliente({empresaSrc:'const EMPRESA={',registroSrc:REGISTRO,existe:()=>true});
  es('no se traga el error',r.length,1);
  es('  y dice cuál es el archivo',/empresa\.js/.test(r[0].texto),true);
}

console.log('\n== El corte por la marca del repintado ==');
// Todo lo que toca `document` va después de esa línea. Si el corte fallara,
// evaluar el archivo pediría un navegador y la revisión no podría hacerse.
{
  const cortado=sinNavegador(fs.readFileSync(R+'js/empresa.js','utf8'));
  es('la configuración sobrevive al corte',/EMPRESA_USERS/.test(cortado),true);
  es('  y nada que use document se queda dentro',/document\./.test(cortado),false);
  es('el cliente de verdad pasa su propia revisión',
     revisarCliente({
       empresaSrc :fs.readFileSync(R+'js/empresa.js','utf8'),
       registroSrc:REGISTRO,
       existe     :rel=>fs.existsSync(R+rel)
     }).filter(h=>!h.ok).map(h=>h.texto).join(' · ')||'—','—');
}

console.log('\n== Está enganchado donde se publica ==');
{
  const ver=fs.readFileSync(R+'herramientas/verificar.js','utf8');
  es('verificar.js lo usa',/require\('\.\/revisarCliente'\)/.test(ver),true);
  es('  y pinta cada hallazgo',/h\.ok\?bien/.test(ver),true);
}

console.log('\n'+(mal?'X '+mal+' fallo(s)':'OK todo bien')+'  ·  '+ok+'/'+(ok+mal));
process.exit(mal?1:0);
