// ══════════════════════════════════════════════════════════════════════════
//  PRESUPUESTO CONTRACTUAL — Valorización al cliente (formato VALEC)
//  Partidas tomadas del contrato "RELAVERA R3 COTA 4416 · ETAPA 2 FASE 4".
//
//  Cada partida declara de dónde sale su CANTIDAD valorizada:
//    manual   → la escribe el usuario en la valorización (hitos, stand by)
//    eqHE     → horas efectivas del equipo en el período (Partes Diarios)
//    eqMes    → incidencia mensual del equipo: días en obra ÷ días del período
//    cargo    → mes-hombre del cargo en el Tareaje: días-hombre ÷ 30
//    pctMOD   → % sobre la mano de obra directa ya valorizada
//    pctCD    → % sobre el costo directo ya valorizado
//
//  Los grupos (tipo 'g') llevan el monto contractual contra el que se calcula
//  el % de avance; las partidas hoja (tipo 'p') llevan el precio unitario.
// ══════════════════════════════════════════════════════════════════════════

// Mes-hombre = días-hombre trabajados ÷ este divisor. Convención del contrato.
const VAL_DIAS_MES=30;

const VAL_PRESUP=[
// ─── COSTO DIRECTO ────────────────────────────────────────────────────────
{t:'s',item:'',   desc:'COSTO DIRECTO',                          pres:22522290.90,sec:'CD'},
{t:'g',item:'1.0',desc:'PRELIMINARES',                           pres:209619.32,niv:1},
{t:'g',item:'1.01',desc:'Movilización y desmovilización de equipos',pres:132168.72,niv:2},
{t:'p',item:'1.0.01.01',desc:'Movilización de Excavadora, EXC ECOP-001',und:'vje',cant:1,pu:7000,pres:14000,src:{t:'manual'}},
{t:'p',item:'1.0.01.02',desc:'Movilización de Excavadora, EXC ECOP-002',und:'vje',cant:1,pu:7000,pres:14000,src:{t:'manual'}},
{t:'p',item:'1.0.01.03',desc:'Movilización de Tractor oruga, TOR ECOP-001',und:'vje',cant:1,pu:7000,pres:14000,src:{t:'manual'}},
{t:'p',item:'1.0.01.04',desc:'Movilización de Retroexcavadora, RET ECO-001',und:'vje',cant:1,pu:7000,pres:14000,src:{t:'manual'}},
{t:'p',item:'1.0.01.05',desc:'Movilización de Motoniveladora, MOT ECOP-001',und:'vje',cant:1,pu:7000,pres:14000,src:{t:'manual'}},
{t:'p',item:'1.0.01.06',desc:'Movilización de Rodillo 19 Ton, ROD ECOP-001',und:'vje',cant:1,pu:7000,pres:14000,src:{t:'manual'}},
{t:'p',item:'1.0.01.07',desc:'Movilización de Cargador frontal 966, CFO-001',und:'vje',cant:1,pu:7000,pres:7000,src:{t:'manual'}},
{t:'p',item:'1.0.01.08',desc:'Movilización de Camión volquete 15 m3, VOL ECOP-001',und:'vje',cant:1,pu:1500,pres:1500,src:{t:'manual'}},
{t:'p',item:'1.0.01.09',desc:'Movilización de Camión volquete 15 m3, VOL ECOP-002',und:'vje',cant:1,pu:1500,pres:1500,src:{t:'manual'}},
{t:'p',item:'1.0.01.10',desc:'Movilización de Camión volquete 15 m3, VOL ECOP-003',und:'vje',cant:1,pu:1500,pres:1500,src:{t:'manual'}},
{t:'g',item:'1.02',desc:'Movilización de Oficinas y Almacenes',pres:10000,niv:2},
{t:'p',item:'1.02.01',desc:'Movilización de oficinas',und:'vje',cant:2,pu:2500,pres:5000,src:{t:'manual'}},

{t:'g',item:'2.0',desc:'OPERACIÓN EQUIPOS',pres:16684984.73,niv:1},
{t:'g',item:'2.01',desc:'Equipos de línea amarilla y blanca',pres:15677087.33,niv:2},

{t:'g',item:'',desc:'Excavadoras',pres:5053690.88,niv:3},
{t:'p',item:'2.0.1.1.b',desc:'Excavadora EXC ECOP-001 (HE)',und:'hm',pu:383.32,src:{t:'eqHE',eq:'EXC ECOP-001'}},
{t:'p',item:'2.0.1.1.c',desc:'Excavadora EXC ECOP-001 (SB)',und:'hm',pu:253.45,src:{t:'manual',sb:1}},
{t:'p',item:'2.01.2.a',desc:'Excavadora EXC ECOP-002 (HE)',und:'hm',pu:383.32,src:{t:'eqHE',eq:'EXC ECOP-002'}},
{t:'p',item:'2.01.2.b',desc:'Excavadora EXC ECOP-002 (SB)',und:'hm',pu:253.45,src:{t:'manual',sb:1}},

{t:'g',item:'',desc:'Tractores',pres:3142379.89,niv:3},
{t:'p',item:'2.01.5.1 a',desc:'Tractor Oruga D6 TOR ECOP-001 (HE)',und:'hm',pu:363.47,src:{t:'eqHE',eq:'TOR ECOP-001'}},
{t:'p',item:'2.01.5.1 b',desc:'Tractor Oruga D6 TOR ECOP-001 (SB)',und:'hm',pu:237.50,src:{t:'manual',sb:1}},

{t:'g',item:'',desc:'Retroexcavadoras',pres:796799.64,niv:3},
{t:'p',item:'2.01.6 a',desc:'Retroexcavadora RET ECO-001 (HE)',und:'hm',pu:155.96,src:{t:'eqHE',eq:'RET ECO-001'}},
{t:'p',item:'2.01.6 b',desc:'Retroexcavadora RET ECO-001 (SB)',und:'hm',pu:105.45,src:{t:'manual',sb:1}},

{t:'g',item:'',desc:'Motoniveladoras',pres:876216.28,niv:3},
{t:'p',item:'2.01.7 a',desc:'Motoniveladora 140H - MOT ECOP-001 (HE)',und:'hm',pu:299.92,src:{t:'eqHE',eq:'MOT ECOP-001'}},
{t:'p',item:'2.01.7 b',desc:'Motoniveladora 140H - MOT ECOP-001 (SB)',und:'hm',pu:222.00,src:{t:'manual',sb:1}},

{t:'g',item:'',desc:'Rodillo',pres:1161264.22,niv:3},
{t:'p',item:'2.01.10 a',desc:'Rodillo 19 Ton - ROD ECOP-001 (HE)',und:'hm',pu:227.32,src:{t:'eqHE',eq:'ROD ECOP-001'}},
{t:'p',item:'2.01.10 b',desc:'Rodillo 19 Ton - ROD ECOP-001 (SB)',und:'hm',pu:171.00,src:{t:'manual',sb:1}},

{t:'g',item:'',desc:'Cargador frontal',pres:509836.50,niv:3},
{t:'p',item:'2.01.30.a',desc:'Cargador frontal 966 - CFO-001 (HE)',und:'hm',pu:318.25,src:{t:'eqHE',eq:'CFO-001'}},
{t:'p',item:'2.01.30 b',desc:'Cargador frontal 966 - CFO-001 (SB)',und:'hm',pu:258.40,src:{t:'manual',sb:1}},

{t:'g',item:'',desc:'Camión volquetes',pres:4136899.92,niv:3},
{t:'p',item:'2.01.14.a',desc:'Camión volquete 15 m3 - VOL ECOP-001 (HE) · CCF-852',und:'hm',pu:153.48,src:{t:'eqHE',eq:'VOL ECOP-001'}},
{t:'p',item:'2.01.14.b',desc:'Camión volquete 15 m3 - VOL ECOP-001 (SB) · CCF-852',und:'hm',pu:107.30,src:{t:'manual',sb:1}},
{t:'p',item:'2.01.16.a',desc:'Camión volquete 15 m3 - VOL ECOP-002 (HE) · BLS-845',und:'hm',pu:153.48,src:{t:'eqHE',eq:'VOL ECOP-002'}},
{t:'p',item:'2.01.16.b',desc:'Camión volquete 15 m3 - VOL ECOP-002 (SB) · BLS-845',und:'hm',pu:107.30,src:{t:'manual',sb:1}},
{t:'p',item:'2.01.22.a',desc:'Camión volquete 15 m3 - VOL ECOP-003 (HE) · BZN-912',und:'hm',pu:153.48,src:{t:'eqHE',eq:'VOL ECOP-003'}},
{t:'p',item:'2.01.22.b',desc:'Camión volquete 15 m3 - VOL ECOP-003 (SB) · BZN-912',und:'hm',pu:107.30,src:{t:'manual',sb:1}},

{t:'g',item:'2.02',desc:'Equipos de soporte',pres:1007897.40,niv:2},
{t:'p',item:'2.02.1',desc:'Cisterna de agua 5000 gln',und:'mes',cant:2,pu:28773.20,pres:293486.64,src:{t:'eqMes',match:'CISTERNA DE AGUA'}},
{t:'p',item:'2.02.2',desc:'Cisterna de comb 1000 gln',und:'mes',cant:2,pu:14773.20,pres:88639.20,src:{t:'eqMes',match:'CISTERNA DE COMBUSTIBLE'}},
{t:'p',item:'2.02.3',desc:'Couster',und:'mes',cant:8,pu:18022.20,pres:446950.56,src:{t:'eqMes',match:'COASTER'}},
{t:'p',item:'2.02.4',desc:'Camioneta 4x4',und:'mes',cant:8,pu:9934.50,pres:178821.00,src:{t:'eqMes',match:'CAMIONETA'}},

{t:'g',item:'3.0',desc:'OPERACIÓN MANO DE OBRA',pres:5567731.54,niv:1},
{t:'g',item:'3.01',desc:'MANO DE OBRA DIRECTA',pres:2573763.57,niv:2,mod:1},
{t:'p',item:'3.01.01',desc:'Operario Movimiento Tierras',und:'mes',cant:8,pu:5226.80,pres:251390.40,mod:1,src:{t:'cargo',cargo:'OPERARIO DE MOVIMIENTO DE TIERRAS'}},
{t:'p',item:'3.01.02',desc:'Oficial Movimiento Tierras',und:'mes',cant:5,pu:5226.80,pres:149433.00,mod:1,src:{t:'cargo',cargo:'OFICIAL DE MOVIMIENTO DE TIERRAS'}},
{t:'p',item:'3.01.03',desc:'Operario Obras Civiles',und:'mes',cant:3,pu:4970.60,pres:94271.40,mod:1,src:{t:'cargo',cargo:'OPERARIO OBRAS CIVILES'}},
{t:'p',item:'3.01.04',desc:'Vigía',und:'mes',cant:13,pu:4970.60,pres:368542.20,mod:1,src:{t:'cargo',cargo:'VIGIA'}},
{t:'p',item:'3.01.05',desc:'Peón',und:'mes',cant:56,pu:4714.40,pres:1587566.40,mod:1,src:{t:'cargo',cargo:'PEON'}},
{t:'p',item:'3.01.06',desc:'Herramientas manuales 5% (MOD)',und:'%MO',cant:0.05,pu:0,pres:122560.17,src:{t:'pctMOD',pct:5}},

{t:'g',item:'3.02',desc:'MANO DE OBRA CALIFICADA',pres:741358.69,niv:2},
{t:'g',item:'3.02.01',desc:'OPERADORES EQUIPOS LIVIANOS',pres:741358.69,niv:3},
{t:'p',item:'3.02.01.01',desc:'Operador de camioneta',und:'mes',cant:12,pu:4782.90,pres:57394.80,src:{t:'cargo',cargo:'COND. DE CAMIONETA'}},
{t:'p',item:'3.02.01.02',desc:'Operador de coaster',und:'mes',cant:12,pu:5124.30,pres:61491.60,src:{t:'cargo',cargo:'COND. DE COASTER'}},
{t:'p',item:'3.02.01.03',desc:'Operador de Cisterna de combustible',und:'mes',cant:4,pu:5226.80,pres:20907.20,src:{t:'cargo',cargo:'OP. CISTERNA DE COMBUSTIBLE'}},
{t:'p',item:'3.02.01.04',desc:'Operador de Cisterna de agua 5000 gln',und:'mes',cant:4,pu:5226.80,pres:20907.20,src:{t:'cargo',cargo:'OP. CISTERNA DE AGUA'}},

{t:'g',item:'3.03',desc:'TRANSPORTE DE AGREGADOS Y OTROS MATERIALES',pres:2252609.28,niv:2},
{t:'g',item:'3.03.01',desc:'OPERADORES DE LÍNEA AMARILLA Y LÍNEA BLANCA',pres:2252609.28,niv:3},
{t:'p',item:'3.03.01.01',desc:'Op Volquete',und:'mes',cant:27,pu:5237.30,pres:848442.60,src:{t:'cargo',cargo:'OP. VOLQUETE'}},
{t:'p',item:'3.03.01.02',desc:'Op Excavadora 336',und:'mes',cant:12,pu:6091.40,pres:445890.48,src:{t:'cargo',cargo:'OP. EXCAVADORA'}},
{t:'p',item:'3.03.01.03',desc:'Op Cargador F 966',und:'mes',cant:3,pu:6091.40,pres:54822.60,src:{t:'cargo',cargo:'OP. CARGADOR FRONTAL'}},
{t:'p',item:'3.03.01.04',desc:'Op Tractor D6T',und:'mes',cant:8,pu:6091.40,pres:292387.20,src:{t:'cargo',cargo:'OP. TRACTOR'}},
{t:'p',item:'3.03.01.05',desc:'Op Motoniveladora',und:'mes',cant:3,pu:6091.40,pres:109645.20,src:{t:'cargo',cargo:'OP. MOTONIVELADORA'}},
{t:'p',item:'3.03.01.06',desc:'Op Rodillo 19 TN',und:'mes',cant:5,pu:5749.70,pres:172491.00,src:{t:'cargo',cargo:'OP. RODILLO'}},
{t:'p',item:'3.03.01.07',desc:'Op Retroexcavadora',und:'mes',cant:5,pu:5749.70,pres:172491.00,src:{t:'cargo',cargo:'OP. RETROEXCAVADORA'}},
{t:'p',item:'3.03.01.08',desc:'OP Múltiple Línea B (Exc, Retro, Tractor, Moto, Rodillo)',und:'mes',cant:2,pu:6518.30,pres:78219.60,src:{t:'manual'}},
{t:'p',item:'3.03.01.09',desc:'OP Múltiple Blanca (Volquete, Cisterna)',und:'mes',cant:2,pu:6518.30,pres:78219.60,src:{t:'manual'}},

// ─── COSTO INDIRECTO ──────────────────────────────────────────────────────
{t:'s',item:'',desc:'COSTO INDIRECTO',pres:3649154.58,sec:'CI'},
{t:'g',item:'1',desc:'PERSONAL GERENCIA, STAFF, SUPERVISORES, AUXILIARES',pres:3138868.69,niv:1},
{t:'g',item:'1.01',desc:'OPERACIÓN',pres:672706.97,niv:2},
{t:'p',item:'1.01.01',desc:'Ingeniero Residente',und:'mes',cant:1,pu:20128.00,pres:160426.25,src:{t:'cargo',cargo:'ING. RESIDENTE'}},
{t:'p',item:'1.01.02',desc:'Ingeniero Supervisor',und:'mes',cant:3,pu:16885.00,pres:319126.50,src:{t:'cargo',cargo:'ING. SUPERVISOR DE CAMPO'}},
{t:'p',item:'1.01.03',desc:'Supervisor técnico',und:'mes',cant:3,pu:10219.80,pres:193154.22,src:{t:'cargo',cargo:'SUP. TECNICO'}},

{t:'g',item:'1.02',desc:'SEGURIDAD Y MEDIO AMBIENTE',pres:410337.97,niv:2},
{t:'p',item:'1.02.01',desc:'Ingeniero Responsable Seguridad y Medio ambiente',und:'mes',cant:1,pu:17612.00,pres:133328.17,src:{t:'cargo',cargo:'ING. RESP. SEGURIDAD'}},
{t:'p',item:'1.02.02',desc:'Ingeniero de Seguridad y Medio ambiente',und:'mes',cant:3,pu:14893.00,pres:277009.80,src:{t:'cargo',cargo:'INGENIERO DE SEGURIDAD, SALUD Y MEDIO AMBIENTE'}},

{t:'g',item:'1.03',desc:'OFICINA TÉCNICA / TOPOGRAFÍA / CONTROL PROYECTO',pres:625298.42,niv:2},
{t:'p',item:'1.03.01',desc:'Ingeniero de Control de Proyectos',und:'mes',cant:1,pu:13838.00,pres:104757.85,src:{t:'cargo',cargo:'ING. CONTROL DE PROYECTO'}},
{t:'p',item:'1.03.02',desc:'Ingeniero de Control de Planeamiento',und:'mes',cant:1,pu:13838.00,pres:85795.60,src:{t:'cargo',cargo:'ING. CONTROL DE PLANEAMIENTO'}},
{t:'p',item:'1.03.03',desc:'Administrador de Obra',und:'mes',cant:1,pu:17612.00,pres:140372.97,src:{t:'cargo',cargo:'ADMINISTRADOR'}},
{t:'p',item:'1.03.04',desc:'Asistente Administrativo',und:'mes',cant:1,pu:11322.00,pres:67932.00,src:{t:'cargo',cargo:'ASISTENTE ADMINISTRATIVO'}},
{t:'p',item:'1.03.05',desc:'Asistenta Social',und:'mes',cant:2,pu:9435.00,pres:113220.00,src:{t:'cargo',cargo:'ASISTENTA SOCIAL'}},
{t:'p',item:'1.03.06',desc:'Data Enter',und:'mes',cant:2,pu:9435.00,pres:113220.00,src:{t:'cargo',cargo:'DATA ENTER'}},

{t:'g',item:'1.04',desc:'AUXILIARES',pres:398097.66,niv:2},
{t:'p',item:'1.04.01',desc:'Almacenero',und:'mes',cant:2,pu:7548.00,pres:93595.20,src:{t:'cargo',cargo:'ALMACENERO'}},
{t:'p',item:'1.04.02',desc:'Guardián',und:'mes',cant:2,pu:5661.00,pres:70196.40,src:{t:'cargo',cargo:'GUARDIAN'}},
{t:'p',item:'1.04.03',desc:'Controlador de Equipos',und:'mes',cant:3,pu:8823.10,pres:164109.66,src:{t:'cargo',cargo:'CONTROLADOR DE EQUIPOS'}},
{t:'p',item:'1.04.04',desc:'Personal Limpieza',und:'mes',cant:2,pu:5661.00,pres:70196.40,src:{t:'cargo',cargo:'PERSONAL LIMPIEZA'}},

{t:'g',item:'1.05',desc:'MANTENIMIENTO',pres:919816.22,niv:2},
{t:'p',item:'1.05.01',desc:'Ing. Supervisor de mantenimiento de equipos',und:'mes',cant:1,pu:15590.00,pres:124257.02,src:{t:'cargo',cargo:'ING. SUPERVISOR DE MANTENIMIENTO'}},
{t:'p',item:'1.05.02',desc:'Asistente de Mant. Mecánico',und:'mes',cant:1,pu:11322.00,pres:70196.40,src:{t:'cargo',cargo:'ASIST. DE EQUIPOS'}},
{t:'p',item:'1.05.03',desc:'Mecánicos',und:'mes',cant:6,pu:15096.00,pres:561571.20,src:{t:'cargo',cargo:'MECANICO'}},
{t:'p',item:'1.05.04',desc:'Ayud. Mecánicos',und:'mes',cant:3,pu:8806.00,pres:163791.60,src:{t:'cargo',cargo:'AYUDANTE MECANICO'}},

{t:'g',item:'1.06',desc:'SOPORTE OFICINA CENTRAL',pres:112611.45,niv:2},
{t:'p',item:'1.06.01',desc:'Soporte de oficina central, 0.5% del Costo Directo',und:'%CD',cant:0.005,pu:0,pres:112611.45,src:{t:'pctCD',pct:0.5}},

{t:'g',item:'2',desc:'SERVICIOS Y LABORATORIOS',pres:118357.47,niv:1},
{t:'p',item:'2.01',desc:'Útiles Administrativos y de escritorio',und:'mes',cant:6.57,pu:1200.00,pres:7884.36,src:{t:'manual'}},
{t:'p',item:'2.02',desc:"Laptop's, tipo I",und:'mes',cant:6.57,pu:450.00,pres:2956.64,src:{t:'manual'}},
{t:'p',item:'2.03',desc:"Laptop's, tipo II",und:'mes',cant:6.57,pu:300.00,pres:1971.09,src:{t:'manual'}},
{t:'p',item:'2.04',desc:'Impresora',und:'mes',cant:6.57,pu:320.00,pres:2102.50,src:{t:'manual'}},
{t:'p',item:'2.05',desc:'Insumos Limpieza (Oficinas)',und:'mes',cant:6.57,pu:250.00,pres:1642.58,src:{t:'manual'}},
{t:'p',item:'2.06',desc:'Agua Consumo Obra',und:'mes',cant:6.57,pu:1479.00,pres:9717.48,src:{t:'manual'}},
{t:'p',item:'2.07',desc:'Generador 35Kv',und:'mes',cant:6.57,pu:7825.00,pres:51412.61,src:{t:'manual'}},
{t:'p',item:'2.08',desc:'Contenedor 20"',und:'mes',cant:6.57,pu:1500.00,pres:9855.45,src:{t:'manual'}},
{t:'p',item:'2.09',desc:'Implementación de energía en contenedor — Reembolsable',und:'mes',cant:0,pu:2000.00,pres:0,src:{t:'manual'}},

{t:'g',item:'3',desc:'EQUIPOS Y MATERIALES INDIRECTOS',pres:391928.42,niv:1},
{t:'p',item:'3.01',desc:'Detector de tormentas',und:'Und',cant:6.57,pu:685.00,pres:4500.66,src:{t:'manual'}},
{t:'p',item:'3.02',desc:'Martillo hidráulico',und:'Und',cant:2,pu:20350.00,pres:40700.00,src:{t:'manual'}},
{t:'p',item:'3.03',desc:'Motobombas',und:'Und',cant:3,pu:0,pres:0,src:{t:'manual'}},
{t:'p',item:'3.04',desc:'Luminarias (eq + combustible)',und:'Und',cant:5.83,pu:4000.00,pres:186400.00,src:{t:'eqMes',match:'LUMINARIA'}},
{t:'p',item:'3.05',desc:'Vibroapisonadores',und:'Und',cant:5.53,pu:2690.00,pres:29769.34,src:{t:'eqMes',match:'VIBROAPISONADOR'}},
{t:'p',item:'3.06',desc:'Zaranda',und:'Und',cant:3,pu:5000.00,pres:15000.00,src:{t:'manual'}},
{t:'p',item:'3.07',desc:'Trompo de concreto',und:'Und',cant:3,pu:2350.00,pres:7050.00,src:{t:'manual'}},
{t:'p',item:'3.08',desc:'Radio para personal y equipo',und:'Und',cant:6,pu:206.25,pres:61875.00,src:{t:'manual'}},
{t:'p',item:'3.09',desc:'Módulo de radio para cargar baterías y radios',und:'Und',cant:6.57,pu:331.32,pres:4353.75,src:{t:'manual'}},
{t:'p',item:'3.10',desc:'Vibrador de concreto',und:'Und',cant:3,pu:580.00,pres:1740.00,src:{t:'manual'}},
{t:'p',item:'3.11',desc:'Estufa eléctrica de 11 celdas',und:'Und',cant:6.57,pu:300.00,pres:5913.28,src:{t:'manual'}},
{t:'p',item:'3.12',desc:'Alcoholímetro',und:'Und',cant:6.57,pu:250.00,pres:1642.58,src:{t:'manual'}},
{t:'p',item:'3.13',desc:'Engrasadora neumática',und:'Und',cant:6.57,pu:350.00,pres:2299.61,src:{t:'manual'}},
{t:'p',item:'3.14',desc:'Compresora de aire',und:'Und',cant:6,pu:1550.00,pres:9300.00,src:{t:'manual'}},
{t:'p',item:'3.15',desc:'Plancha compactadora',und:'Und',cant:4.55,pu:2350.00,pres:21384.20,src:{t:'manual'}}
];
