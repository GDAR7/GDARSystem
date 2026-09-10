// ══ REGISTRO DE MÓDULOS ═════════════════════════════════════════════════════
// Qué módulos existen, qué área los ofrece y qué función los dibuja.
//
// Se carga ANTES que config.js, que arma su AREAS a partir de aquí.
//
// ── Por qué existe ────────────────────────────────────────────────────────
// Un módulo se declaraba en tres sitios: el objeto AREAS de config.js, la
// tabla de despacho de renderPage en utils.js, y su <div id="page-…"> en
// index.html. Nada garantizaba que los tres coincidieran, y agregar un módulo
// era acordarse de tres ediciones en tres archivos.
//
// Sobre todo: mientras "módulo" fuera texto repartido por ahí, no había forma
// de venderlos por separado. Un cliente que compra Almacén y Equipos pero no
// Control de Proyecto necesita que el módulo sea una cosa que se pueda
// nombrar, apagar y cobrar. Eso es lo que hay aquí.
//
// ── Cómo está partido ─────────────────────────────────────────────────────
// GDAR_AREAS dice QUÉ OFRECE cada área y EN QUÉ ORDEN.
// GDAR_MODULOS dice QUÉ ES cada módulo.
//
// Van separados porque un módulo puede vivir en dos áreas —insumosAux lo
// ofrecen Almacén y Mantenimiento— y en cada una ocupa un lugar distinto del
// menú. Con una sola lista habría que duplicar el módulo, y entonces
// volveríamos a tener dos sitios donde cambiar su nombre.
//
// ── Campos de un módulo ───────────────────────────────────────────────────
//   label, icon   lo que se ve en el menú
//   dibuja        el nombre de la función que lo pinta, o la función misma
//                 cuando hace falta un argumento (rLinea, las pestañas). Se
//                 guarda el NOMBRE y no la referencia porque este archivo se
//                 carga antes que los módulos: la función todavía no existe.
//                 renderPage la resuelve en el momento de usarla.
//   grupo         para las cabeceras que despliegan otros módulos
//   sistema       está siempre y no se vende: el panel y Mi Seguridad
//
// ── Generado, no escrito a mano ───────────────────────────────────────────
// Salió de lo que ya declaraban config.js y utils.js, y se comprobó que el
// AREAS reconstruido es idéntico al de antes. Setenta módulos copiados a mano
// son setenta ocasiones de equivocarse en un acento.

const GDAR_AREAS={
  administracion:{label:'Administración',icon:'🏢',color:'#3b82f6',prefix:'ECOADM',
    modulos:['personal','asistencia','tareaje','resumenTareaje','roster']},
  remuneraciones:{label:'Remuneraciones',icon:'💵',color:'#ca8a04',prefix:'ECOREM',
    modulos:['planilla','renta5ta','afpTasas']},
  bienestarSocial:{label:'Bienestar Social',icon:'🤝',color:'#ec4899',prefix:'ECOBSW',
    modulos:['asistentaSocial','residencia','alimentacion','hospedaje','lavanderia','viaticos']},
  almacenLogistica:{label:'Almacén y Logística',icon:'📦',color:'#f97316',prefix:'ECOALM',
    modulos:['proyectos','almacen','combustible','requerimientos','materiales','facturasPago','kardexEpp','insumosAux','analisisAbc']},
  operaciones:{label:'Operaciones',icon:'⚙️',color:'#f59e0b',prefix:'ECOOPE',
    modulos:['supervision','liberacion']},
  seguridad:{label:'Seguridad',icon:'🛡️',color:'#ef4444',prefix:'ECOSEG',
    modulos:['seguridad','cursosSeguridad','medioAmbiente']},
  mantenimiento:{label:'Mantenimiento Mecánico',icon:'🔧',color:'#8b5cf6',prefix:'ECOMEC',
    modulos:['masterEquipos','programacionEquipos','auxiliosMecanicos','engraseEquipos','salidaEquipos','insumosAux']},
  controlProyecto:{label:'Control de Proyecto',icon:'📊',color:'#10b981',prefix:'ECOCTL',
    modulos:['planner','lps','pizarra','avanceMT','dailyReport','recrecimiento','informePeriodo']},
  general:{label:'General',icon:'📋',color:'#14b8a6',prefix:'ECOGEN',
    modulos:['seguimiento','histograma']},
  controlEquipos:{label:'Control de Equipos',icon:'🚜',color:'#06b6d4',prefix:'ECOCEQ',
    modulos:['dashEquipos','flotaEquipos','lineaAmarilla','lineaBlanca','vehiculosMenores','equiposMenores','panelHoras','reporteMensual','reporteEquipos','dataIngresos']},
  otros:{label:'Ventas General',icon:'📁',color:'#a78bfa',prefix:'ECOOTRO',
    modulos:['valorizaciones','hes','facturacion']},
  costControl:{label:'Cost Control',icon:'📈',color:'#059669',prefix:'ECOCC',
    modulos:['costControl','tarifas','venta','costos','proveedores','resultadoOperativo','hhVenta','corteEquipos','costoM3']},
  configuracion:{label:'Configuración',icon:'⚙️',color:'#6366f1',prefix:'ECOCFG',
    modulos:['notificaciones']},
};

const GDAR_MODULOS={
  personal:{label:'Personal / RR.HH.',icon:'👷',dibuja:'rPersonal'},
  asistencia:{label:'Asistencia del día',icon:'✅',dibuja:'rAsistencia'},
  tareaje:{label:'Tareaje Mensual',icon:'📋',dibuja:'rTareaje'},
  resumenTareaje:{label:'Resumen Diario Tareaje',icon:'📊',dibuja:'rTareResumenPg'},
  roster:{label:'Roster de Guardias',icon:'🗓️',dibuja:()=>_rosterTab(_rosterTabAct)},
  planilla:{label:'Planilla de Sueldos',icon:'💵',dibuja:'_plRenderTabs'},
  renta5ta:{label:'Renta 5ta Categoría',icon:'📑',dibuja:'rRenta5ta'},
  afpTasas:{label:'Tasas de Pensiones',icon:'🏦',dibuja:'rAfpTasas'},
  asistentaSocial:{label:'Asistenta Social',icon:'💼',dibuja:'rSocial'},
  residencia:{label:'Residencia',icon:'🏠',dibuja:'rResidencia'},
  alimentacion:{label:'Alimentación',icon:'🍽️',dibuja:'rAli'},
  hospedaje:{label:'Hospedaje',icon:'🛏️',dibuja:'rHosp'},
  lavanderia:{label:'Lavandería',icon:'👕',dibuja:'rLav'},
  viaticos:{label:'Reembolsables B.S.',icon:'🧾',dibuja:'rViaticos'},
  proyectos:{label:'Proyectos',icon:'🏗️',dibuja:'rProyectos'},
  almacen:{label:'Kardex / Almacén',icon:'📋',dibuja:'rAlm'},
  combustible:{label:'Combustible',icon:'⛽',dibuja:'rComb'},
  requerimientos:{label:'Requerimientos',icon:'📝',dibuja:'rReq'},
  materiales:{label:'Materiales',icon:'🏗️',dibuja:'rMateriales'},
  facturasPago:{label:'Facturas / Boletas',icon:'🧾',dibuja:'rFPago'},
  kardexEpp:{label:'Cardex EPP',icon:'🦺',dibuja:'rKardexEpp'},
  insumosAux:{label:'Insumos Aux. Mecánicos',icon:'🛠️',dibuja:'rInsumosAux'},
  analisisAbc:{label:'Análisis de Consumo',icon:'📈',dibuja:'rAnalisisAbc'},
  supervision:{label:'Supervisión',icon:'🔍',dibuja:'rSuper'},
  liberacion:{label:'Liberación de Restricciones',icon:'🚦',dibuja:'rLiberacion'},
  seguridad:{label:'Seguridad',icon:'⛑️',dibuja:'rSeg'},
  cursosSeguridad:{label:'Cursos / Capacitaciones',icon:'🎓',dibuja:'rCursosSeguridad'},
  medioAmbiente:{label:'Medio Ambiente',icon:'🌿',dibuja:'rAmb'},
  masterEquipos:{label:'Máster de Equipos',icon:'🗂️',dibuja:'rMaster'},
  programacionEquipos:{label:'Programación',icon:'📅',dibuja:'rProg'},
  auxiliosMecanicos:{label:'Auxilios Mecánicos',icon:'🚨',dibuja:'rAuxMec'},
  engraseEquipos:{label:'Engrase Mensual',icon:'🛢️',dibuja:'rEngrase'},
  salidaEquipos:{label:'Control de Salida EQ',icon:'🚚',dibuja:'rSalidaEquipos'},
  planner:{label:'Planner',icon:'📈',dibuja:'rPlanner'},
  lps:{label:'Planning & Monitoring',icon:'🗂️',dibuja:'rLps'},
  pizarra:{label:'Mapa de Proyecto - R3',icon:'🗺️',dibuja:'rPizarra'},
  avanceMT:{label:'Avance MT',icon:'📦',dibuja:'rAvanceMT'},
  dailyReport:{label:'Daily Report',icon:'📋',dibuja:'rDailyReport'},
  recrecimiento:{label:'Recrecimiento R3',icon:'🏔️',dibuja:'rRecrecimiento'},
  informePeriodo:{label:'Informe de Período',icon:'📑',dibuja:'rInformePeriodo'},
  seguimiento:{label:'Seguimiento General',icon:'📌',dibuja:'rSeguimiento'},
  histograma:{label:'Histograma Recursos',icon:'📊',dibuja:'rHistograma'},
  dashEquipos:{label:'Dashboard',icon:'📊',dibuja:'rDashEquipos'},
  flotaEquipos:{label:'Flota de Equipos',icon:'🗂️',dibuja:'rFlotaEquipos'},
  lineaAmarilla:{label:'Línea Amarilla',icon:'🟡',dibuja:()=>rLinea('Línea Amarilla')},
  lineaBlanca:{label:'Línea Blanca',icon:'⚪',dibuja:()=>rLinea('Línea Blanca')},
  vehiculosMenores:{label:'Vehículos Menores',icon:'🚗',dibuja:()=>rLinea('Vehículo Menor')},
  equiposMenores:{label:'Menores',icon:'🔩',dibuja:()=>rLinea('Equipos Menores')},
  panelHoras:{label:'Panel Horas Máq.',icon:'⏱️',dibuja:'rPanelHoras'},
  reporteMensual:{label:'Mensual al Corte',icon:'📈',dibuja:'rReporteMensual'},
  reporteEquipos:{label:'Reporte de Equipos',icon:'📄',dibuja:'rReporteEquipos'},
  dataIngresos:{label:'Data de Ingresos',icon:'🗄️',grupo:['frentesTrabajo','tipoMaterial','tramos']},
  frentesTrabajo:{label:'Frentes de Trabajo',icon:'📍',dibuja:'rFrentes'},
  tipoMaterial:{label:'Tipo de Material',icon:'🪨',dibuja:'rTipoMaterial'},
  tramos:{label:'Tramos',icon:'🗺️',dibuja:'rTramos'},
  valorizaciones:{label:'Valorizaciones / EDP',icon:'📋',dibuja:'rValorizaciones'},
  hes:{label:'HES',icon:'📑',dibuja:'rHes'},
  facturacion:{label:'Facturación',icon:'🧾',dibuja:'rFact'},
  costControl:{label:'Cost Control',icon:'📊',dibuja:'rCostControl'},
  tarifas:{label:'Tarifas',icon:'🏷️',dibuja:'rTarifas'},
  venta:{label:'Venta',icon:'💼',dibuja:'rVenta'},
  costos:{label:'Costos',icon:'💰',dibuja:'rCostos'},
  proveedores:{label:'Proveedores',icon:'🧾',dibuja:()=>_edpTab(_edpTabAct)},
  resultadoOperativo:{label:'Resultado Operativo',icon:'⚖️',dibuja:'rResultadoOperativo'},
  hhVenta:{label:'HH Venta',icon:'👷',dibuja:'rHhVenta'},
  corteEquipos:{label:'Corte Equipos',icon:'✂️',dibuja:'rCorteEquipos'},
  costoM3:{label:'Costo por m³',icon:'🧱',dibuja:'rCostoM3'},
  notificaciones:{label:'Notificaciones',icon:'🔔',dibuja:'rNotificaciones'},
  dashboard:{label:'Panel General',icon:'📊',dibuja:'rDash',sistema:true},
  miSeguridad:{label:'Mi Seguridad',icon:'🔐',dibuja:'rMiSeguridad',sistema:true},
};

// ── Lo que ve un módulo del catálogo ───────────────────────────────────────
function gdarModulo(clave){ return GDAR_MODULOS[clave]||null; }

// La función que dibuja un módulo. Puede venir como nombre o como función:
// el nombre se resuelve ahora, no al declararlo, porque cuando este archivo
// se carga los módulos todavía no existen.
function gdarDibujo(clave){
  const m=GDAR_MODULOS[clave];
  if(!m||!m.dibuja)return null;
  if(typeof m.dibuja==='function')return m.dibuja;
  const f=globalThis[m.dibuja];
  return typeof f==='function'?f:null;
}

// ── QUÉ CONTRATÓ ESTA EMPRESA ──────────────────────────────────────────────
// El plan vive en js/empresa.js, que se carga antes que este archivo y es lo
// único que cambia entre un cliente y otro.
//
// Esto decide qué se OFRECE, no a qué se puede llegar. Lo que de verdad
// protege los datos son las políticas RLS y qué tablas existen en la base de
// cada cliente: el JavaScript viaja al navegador y cualquiera puede leerlo.
// Apagar un módulo aquí lo saca del menú; no es una cerradura.
function gdarPlan(){
  return typeof EMPRESA_PLAN!=='undefined'&&EMPRESA_PLAN?EMPRESA_PLAN:null;
}

// Las claves contratadas. Un plan sin nada declarado es "todo": es lo que
// tiene el cliente de siempre, y hace que el archivo de un cliente que ya
// existía siga funcionando igual sin tocarlo.
//
//   areas    todo lo que ofrecen esas áreas.  null = todas.
//   modulos  módulos sueltos, del área que sean.  null = ninguno aparte.
//
// Se suman: `areas:['almacenLogistica'], modulos:['tareaje']` da el almacén
// completo más el tareaje. Para vender módulos sueltos y ningún área entera,
// `areas:[]` con la lista en `modulos`.
function gdarContratados(){
  const todas=new Set();
  for(const k of Object.keys(GDAR_MODULOS))
    if(GDAR_MODULOS[k].sistema)todas.add(k);      // el panel y Mi Seguridad, siempre

  const plan=gdarPlan();
  const areas=plan&&plan.areas!==undefined&&plan.areas!==null?plan.areas:null;
  const sueltos=plan&&Array.isArray(plan.modulos)?plan.modulos:[];

  const deArea=clave=>{
    const a=GDAR_AREAS[clave];
    if(!a)return;
    for(const k of a.modulos){
      todas.add(k);
      for(const h of (GDAR_MODULOS[k]||{}).grupo||[])todas.add(h);
    }
  };
  if(areas===null)Object.keys(GDAR_AREAS).forEach(deArea);
  else areas.forEach(deArea);

  for(const k of sueltos){
    todas.add(k);
    for(const h of (GDAR_MODULOS[k]||{}).grupo||[])todas.add(h);
  }
  return todas;
}

let _gdarContratados=null;
function gdarContratado(clave){
  if(!_gdarContratados)_gdarContratados=gdarContratados();
  return _gdarContratados.has(clave);
}

// Qué áreas entran en el menú. NO es "las que tienen algún módulo contratado":
// insumosAux lo ofrecen Almacén y Mantenimiento, así que comprar Almacén hacía
// aparecer Mantenimiento entera con un solo item dentro. Un área entra si se
// contrató, o si contiene alguno de los módulos sueltos que sí se compraron.
function gdarAreasContratadas(){
  const plan=gdarPlan();
  const areas=plan&&plan.areas!==undefined&&plan.areas!==null?plan.areas:null;
  if(areas===null)return new Set(Object.keys(GDAR_AREAS));
  const set=new Set(areas.filter(k=>GDAR_AREAS[k]));
  const sueltos=plan&&Array.isArray(plan.modulos)?plan.modulos:[];
  for(const [clave,a] of Object.entries(GDAR_AREAS))
    if(sueltos.some(m=>a.modulos.includes(m)||
        a.modulos.some(k=>((GDAR_MODULOS[k]||{}).grupo||[]).includes(m))))
      set.add(clave);
  return set;
}

// ── AREAS, con la forma de siempre ─────────────────────────────────────────
// config.js la usa tal cual, y empresa.js reparte permisos con sus claves, así
// que la estructura no cambia. Lo que cambia es de dónde sale — y que un
// módulo no contratado no llega a aparecer.
function gdarConstruirAreas(){
  const areas={};
  const contratadas=gdarAreasContratadas();
  for(const [clave,a] of Object.entries(GDAR_AREAS)){
    if(!contratadas.has(clave))continue;
    const modules=[];
    for(const k of a.modulos){
      const m=GDAR_MODULOS[k]||{label:k,icon:'•'};
      if(m.grupo){
        // Una cabecera de grupo sin hijos contratados no pinta nada.
        const children=m.grupo.filter(gdarContratado).map(h=>{
          const hijo=GDAR_MODULOS[h]||{label:h,icon:'•'};
          return{key:h,label:hijo.label,icon:hijo.icon};
        });
        if(!children.length)continue;
        modules.push({key:k,label:m.label,icon:m.icon,isSubgroup:true,children});
        continue;
      }
      if(!gdarContratado(k))continue;
      modules.push({key:k,label:m.label,icon:m.icon});
    }
    // No hace falta descartar las áreas que quedaron sin módulos: contratar un
    // área contrata todo lo que ofrece, y un módulo suelto siempre arrastra la
    // suya, así que un área contratada nunca queda vacía. La guarda que había
    // aquí era inalcanzable — que un área del registro no ofrezca nada lo
    // comprueba pruebas/tRegistro.js, donde sí se puede detectar.
    areas[clave]={label:a.label,icon:a.icon,color:a.color,prefix:a.prefix,modules};
  }
  return areas;
}

// Las áreas de una persona que además existen para esta empresa.
//
// Hace falta porque los permisos de cada usuario se escribieron pensando en el
// catálogo completo: si alguien tiene 'controlProyecto' y la empresa no lo
// contrató, buildSidebar haría AREAS[ak].modules sobre undefined y launchApp
// leería a1.label — las dos revientan y la aplicación se queda en blanco.
function gdarAreasDeUsuario(areas){
  // Se usa el AREAS ya construido por config.js en vez de rehacerlo por cada
  // área que se comprueba.
  const disponibles=typeof AREAS!=='undefined'&&AREAS?AREAS:gdarConstruirAreas();
  return (areas||[]).filter(k=>!!disponibles[k]);
}
