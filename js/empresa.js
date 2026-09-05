// ══ CONFIGURACIÓN DE LA EMPRESA ═════════════════════════════════════════════
// ESTE ES EL ÚNICO ARCHIVO QUE CAMBIA ENTRE UN CLIENTE Y OTRO.
//
// El resto del sistema es idéntico para todas las empresas, así que se
// sincroniza con un git pull desde el repositorio base sin tocar nada de aquí.
// Para montar un cliente nuevo: copie js/empresa.ejemplo.js sobre este archivo
// y rellene sus datos.
//
// Se carga ANTES que config.js, porque config.js crea el cliente de Supabase
// con SUPA_URL y SUPA_KEY en cuanto se ejecuta.

// ── Identidad, la que sale en pantalla y en los PDF ────────────────────────
const EMPRESA={
  nombre:'ECOSERMO',
  ruc:'20571533180',
  logo:'09.-ERP/Imagenes/ECOSERMO-LOGO.png'   // relativa a index.html
};

// ── Base de datos propia de esta empresa ──────────────────────────────────
// Cada cliente tiene su propio proyecto de Supabase. Es lo que garantiza que
// los datos de una empresa no sean alcanzables desde la otra: no comparten
// base, así que no hay forma de cruzarlas.
const SUPA_URL = 'https://kotqxhpkjuaxbgwhiode.supabase.co';
const SUPA_KEY = 'sb_publishable_2vedvLuUivaSULcoSGJcpQ_Womkq8ST';

// ── Quién entra y qué ve ──────────────────────────────────────────────────
// Recibe AREAS como parámetro (vive en config.js, que carga después) para que
// un usuario pueda pedir todas las áreas con Object.keys(A).
const EMPRESA_USERS=A=>[
  {codigo:'EIBEL25',dni:'46108109',nombre:'Abel Rodríguez A.',cargo:'PCO',areas:Object.keys(A)},
  {codigo:'ECOADM',dni:'11111111',nombre:'Usuario General',cargo:'General',areas:['administracion','bienestarSocial','almacenLogistica','operaciones','seguridad','mantenimiento','controlProyecto','controlEquipos','otros','general']},
  {codigo:'OMARS',dni:'41614500',nombre:'Omar Silva Santa Cruz',cargo:'Administrador',areas:['general','administracion','almacenLogistica','seguridad','remuneraciones'],areaModules:{almacenLogistica:['kardexEpp'],seguridad:['cursosSeguridad']}},
  {codigo:'NOEPAL',dni:'73890744',nombre:'Noelia Palomino',cargo:'Asist. Administración',areas:['general','administracion','almacenLogistica','seguridad','remuneraciones'],areaModules:{almacenLogistica:['kardexEpp'],seguridad:['cursosSeguridad']}},
  {codigo:'BELCRU',dni:'74983318',nombre:'Bella E. Cruz Olivares ',cargo:'Asistenta Social',areas:['bienestarSocial','administracion','seguridad'],areaModules:{administracion:['tareaje','resumenTareaje','roster']}},
  {codigo:'FLOBEN',dni:'10199407',nombre:'Flor Benites',cargo:'Jefe de Seguridad',areas:['general','almacenLogistica','seguridad']},
  {codigo:'JON_GO',dni:'76334753',nombre:'Jonatan Gonzales',cargo:'Jefe de Contabilidad',areas:['otros']},
  {codigo:'ANDMAR',dni:'10199407',nombre:'Andres Martines',cargo:'Ing. Residente',areas:['general','administracion','seguridad'],areaModules:{seguridad:['cursosSeguridad']}},
  {codigo:'YONMEL',dni:'43616432',nombre:'Yonder Melendrez',cargo:'Supervisor de Almacén',areas:['almacenLogistica']},
  {codigo:'ELIDA',dni:'45596970',nombre:'Elida Solano',cargo:'Jefa de Operaciones',areas:['mantenimiento','controlEquipos','administracion','seguridad'],areaModules:{mantenimiento:['masterEquipos'],controlEquipos:['reporteEquipos','panelHoras'],administracion:['resumenTareaje'],seguridad:['cursosSeguridad']}},
  {codigo:'CA-R-ZE',dni:'18071084',nombre:'Carlos Zelada',cargo:'Jefe de mantenimiento',areas:['general','mantenimiento','controlEquipos'], areaModules:{controlEquipos:['reporteEquipos']}},
  {codigo:'ECOMEC',dni:'55556666',nombre:'Roberto Yauri Poma',cargo:'Jefe de Mantenimiento',areas:['mantenimiento']},
  {codigo:'JAYOJA',dni:'73760497',nombre:'Jaime Aquino J.',cargo:'Asist. de Mantenimiento', areas:['general','mantenimiento','controlEquipos'], areaModules:{controlEquipos:['reporteEquipos']}},
  {codigo:'ANT_CER',dni:'75731570',nombre:'Antony Cerquin Z.',cargo:'Ing. Planeamiento',areas:['general','administracion','controlProyecto','controlEquipos','mantenimiento','seguridad','costControl'],areaModules:{mantenimiento:['masterEquipos'],seguridad:['cursosSeguridad']}},
  {codigo:'J_A_TA',dni:'73441348',nombre:'Javier Tamara C. ',cargo:'Data Enter - 01',areas:['controlEquipos','controlProyecto','administracion','seguridad'],areaModules:{controlProyecto:['pizarra','recrecimiento'],administracion:['asistencia','resumenTareaje'],seguridad:['cursosSeguridad']},pizarraTabs:[3,4,5]},
  {codigo:'SIX_GQUI',dni:'43291740',nombre:'Sixto Quisoccapa G.',cargo:'Lider Control de EQ.',areas:['controlEquipos','administracion','seguridad'],areaModules:{administracion:['asistencia','tareaje'],seguridad:['cursosSeguridad']},readOnlyModules:['tareaje']},
  {codigo:'MARTONY',dni:'72882951',nombre:'Antony Martinez',cargo:'Data Enter - 02',areas:['administracion','controlEquipos','controlProyecto','seguridad'],areaModules:{administracion:['asistencia','resumenTareaje','tareaje'],controlProyecto:['recrecimiento','dailyReport'],seguridad:['cursosSeguridad']}},
  {codigo:'PIE_SA',dni:'72512691',nombre:'Piero Sanchez',cargo:'Control de equipos - 02',areas:['administracion','controlEquipos','seguridad'],areaModules:{administracion:['asistencia','resumenTareaje','tareaje']},readOnlyModules:['tareaje']},
  {codigo:'FRANSU',dni:'76322407',nombre:'Frans Urbano',cargo:'Auxiliar de Seguridad',areas:['seguridad']},
  // La planilla vive en 'remuneraciones', no en 'administracion'. De
  // Remuneraciones ve todo; de Administración, solo el tareaje y sus vistas.
  {codigo:'JOR_JA',dni:'12345678',nombre:'Jorge Jala',cargo:'Jefe de Recursos Humanos',areas:['administracion','remuneraciones'],areaModules:{administracion:['tareaje','resumenTareaje','roster']}},
  // Supervisión externa (BISA): solo consulta. Del Panel de Horas ve los tres
  // primeros tabs (horas por día, utilización y disponibilidad mecánica) y de
  // Control de Proyecto, únicamente Avance MT.
  {codigo:'CP.BISA_',dni:'2026',nombre:'Juan Guerreo',cargo:'Control de Proy. Senior Bisa.',areas:['controlEquipos','controlProyecto'],areaModules:{controlEquipos:['panelHoras'],controlProyecto:['avanceMT']},panelHorasTabs:[1,2,3,4]},
];

// El logo de la pantalla de acceso. El src del HTML queda como respaldo:
// si este archivo no cargara, al menos se ve algo en lugar de un hueco.
(()=>{const el=document.getElementById('logoEmpresa');
  if(el){el.src=EMPRESA.logo;el.alt=EMPRESA.nombre;}})();
