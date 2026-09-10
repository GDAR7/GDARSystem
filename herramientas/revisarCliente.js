// ══ REVISAR LA CONFIGURACIÓN DE UN CLIENTE ══════════════════════════════════
// Todo lo demás que verifica el proyecto comprueba el sistema, que es igual
// para todas las empresas. Esto comprueba el único archivo que cambia de un
// cliente a otro —js/empresa.js— y donde por lo tanto se concentran los
// errores de un alta.
//
// Son fallos que no se notan al abrir la aplicación:
//
//   · Un plan que nombra un módulo inexistente no revienta: deja un área
//     vacía, y quien la tenía asignada ve una pantalla en blanco.
//   · Un día de corte fuera de rango descuadra todos los períodos, y eso sale
//     en lo que se le factura al cliente.
//   · Un marcador de la plantilla sin rellenar llega a producción sin que nada
//     se queje: el cliente ve "NOMBRE DE LA EMPRESA" en su pantalla de acceso.
//   · La llave equivocada en SUPA_KEY_PROD deja RLS sin efecto, porque la
//     service_role salta todas las políticas y viaja al navegador de cualquiera.
//
// ── Por qué recibe el texto y no lo lee ────────────────────────────────────
// Recibe las fuentes como cadenas para poder probarla con clientes inventados
// —uno con el plan roto, otro con códigos repetidos— sin escribir en js/. La
// versión anterior vivía dentro de verificar.js y no había forma de comprobar
// que detectara nada sin romper el archivo del cliente de verdad.

// Corta el archivo por la marca del repintado: todo lo que toca `document` va
// después, así que lo de arriba se puede evaluar sin un navegador. Es el mismo
// corte que hacen migrarAuth.js y varias suites.
function sinNavegador(empresaSrc){
  return empresaSrc.replace(/\(\(\)=>\{const el=[\s\S]*$/,'');
}

const MARCADORES=['NOMBRE DE LA EMPRESA','RAZON SOCIAL COMPLETA',
  'Provincia / Unidad minera','XXXXXXXXXXXX','00000000000'];

// Devuelve una lista de {ok, texto, detalle}. Quien la llama decide cómo
// pintarla; así sirve igual para la consola y para una suite.
function revisarCliente({empresaSrc,registroSrc,existe}){
  const r=[];
  const si =(t,d)=>r.push({ok:true, texto:t,detalle:d||''});
  const no =(t,d)=>r.push({ok:false,texto:t,detalle:d||''});
  existe=existe||(()=>true);

  const sinDom=sinNavegador(empresaSrc);
  let cfg,registro;
  try{
    cfg=new Function('document',sinDom
      +';return{EMPRESA,SUPA_URL_PROD,SUPA_KEY_PROD,SUPA_URL_DEV,SUPA_KEY_DEV,'
      +'EMPRESA_CORTE,EMPRESA_DIAS_MES,EMPRESA_PLAN,EMPRESA_USERS};')
      ({getElementById:()=>null});
  }catch(e){
    no('js/empresa.js no se puede leer',e.message);
    return r;
  }
  try{
    registro=new Function(registroSrc+';return{GDAR_AREAS,GDAR_MODULOS};')();
  }catch(e){
    no('js/registro.js no se puede leer',e.message);
    return r;
  }

  const puestos=MARCADORES.filter(m=>sinDom.includes(m));
  puestos.length
    ? no('quedaron marcadores de la plantilla sin rellenar',puestos.join(', '))
    : si('no quedan marcadores de la plantilla');

  const E=cfg.EMPRESA||{};
  /^\d{11}$/.test(String(E.ruc||''))
    ? si('el RUC tiene 11 dígitos')
    : no('el RUC no tiene 11 dígitos','es "'+E.ruc+'"');

  E.logo&&existe(String(E.logo))
    ? si('el logo existe donde dice')
    : no('el logo no está en la ruta declarada',String(E.logo));

  // Esta llave viaja al navegador de cualquiera. Con la service_role ahí, las
  // políticas RLS dejan de proteger: esa llave las salta todas.
  /^sb_publishable_|^ey/.test(String(cfg.SUPA_KEY_PROD||''))
    ? si('la llave de producción es la publicable')
    : no('la llave de producción NO parece la publicable',
         'viaja al navegador; si es la service_role, RLS deja de proteger');

  const corte=+cfg.EMPRESA_CORTE;
  corte>=1&&corte<=28
    ? si('el día de corte es válido','('+corte+')')
    : no('el día de corte está fuera de rango',
         'es '+cfg.EMPRESA_CORTE+', y gobierna todo lo que se valoriza');

  +cfg.EMPRESA_DIAS_MES>0
    ? si('el divisor de mes-hombre es válido','('+cfg.EMPRESA_DIAS_MES+')')
    : no('el divisor de mes-hombre no es un número positivo',String(cfg.EMPRESA_DIAS_MES));

  const P=cfg.EMPRESA_PLAN||{};
  const areasMal=(P.areas||[]).filter(a=>!registro.GDAR_AREAS[a]);
  const modsMal =(P.modulos||[]).filter(m=>!registro.GDAR_MODULOS[m]);
  areasMal.length||modsMal.length
    ? no('el plan nombra algo que no existe en js/registro.js',
         [...areasMal,...modsMal].join(', '))
    : si('el plan solo nombra áreas y módulos que existen');

  // EMPRESA_USERS recibe AREAS porque empresa.js se carga antes que config.js.
  // Se le pasa el mismo juego de claves que tendrá en el navegador.
  const A={};Object.keys(registro.GDAR_AREAS).forEach(k=>{A[k]={};});
  let usuarios=[];
  try{ usuarios=(cfg.EMPRESA_USERS||(()=>[]))(A)||[]; }
  catch(e){ no('la lista de usuarios no se puede armar',e.message); return r; }

  const codigos=usuarios.map(u=>u.codigo);
  const repes=[...new Set(codigos.filter((c,i)=>codigos.indexOf(c)!==i))];
  repes.length
    ? no('hay códigos de acceso repetidos',repes.join(', ')+' — el segundo nunca entra')
    : si('los '+usuarios.length+' códigos de acceso son únicos');

  const fantasma=[...new Set(usuarios.flatMap(u=>u.areas||[]).filter(a=>!registro.GDAR_AREAS[a]))];
  fantasma.length
    ? no('alguien tiene un área que no existe',fantasma.join(', '))
    : si('todos entran a áreas que existen');

  return r;
}

module.exports={revisarCliente,sinNavegador,MARCADORES};
