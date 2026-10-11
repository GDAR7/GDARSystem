// Máster de Equipos · pestaña «🚦 Vencimientos».
// Solo las fechas de vencimiento de SOAT, Póliza, Rev. Técnica, RIC y GPS,
// cada una con su semáforo: rojo vencido · ámbar ≤30 días · verde vigente.
// Agrupada por tipo de equipo; tarjetas por documento que filtran.
const fs=require('fs'),vm=require('vm');
const R='c:/Users/LENOVO/OneDrive/Documents/GitHub/GDARSystem/';
let ok=0,mal=0;
const es=(l,g,e)=>{const b=String(g)===String(e);b?ok++:mal++;
  console.log((b?'  OK  ':'  MAL ')+l.padEnd(62)+'= '+g+(b?'':'  (esperado '+e+')'));};

const HOY='2026-10-11';
const E=(id,codigo,tipo,o)=>Object.assign({id,codigo,nombre:codigo+' prueba',tipo,sub:'x',est:'Operativo',proyecto:'EPY-004-26'},o);
const DB={equipos:[
  E(1,'VOL ECOP-002','Línea Blanca',{placa:'CCF-852',proveedor:'SERTICOM SAC',soatVenc:'2026-10-01',polizaTrecVenc:'2026-10-25',revisionTecnicaVenc:'2027-03-01',ricVenc:'2026-10-11',gpsVenc:'2027-01-01'}),
  E(2,'VOL ECOP-005','Línea Blanca',{proveedor:'SERTICON S.A.C.',soatVenc:'2027-05-01',polizaTrecVenc:'2027-05-01'}),
  E(3,'CAM ECOP-001','Vehículo Menor',{proveedor:'RENTAFER',soatVenc:'2026-11-10'}),
  E(4,'EXC ECOP-001','Línea Amarilla',{proveedor:'RENTAFER',soatVenc:'2020-01-01'}),   // no aplica: Línea Amarilla
  E(5,'GEN ECOP-001','Equipos Menores',{gpsVenc:'2026-09-01'}),          // no aplica: Equipos Menores
  E(8,'CAM ECOP-007','Vehículo Menor',{gpsVenc:'2026-09-01'}),
  E(9,'CAM ECOP-009','Vehículo Menor',{}),
  E(6,'MOT OTRO','Línea Amarilla',{proyecto:'EPY-005-26',soatVenc:'2020-01-01'})
]};
const nodos={};
const nodo=id=>nodos[id]||(nodos[id]={id,innerHTML:'',style:{},value:''});
const src=fs.readFileSync(R+'js/mantenimiento.js','utf8');
let xls=null,hoja=null;
const ctx=vm.createContext({DB,document:{getElementById:nodo},console,String,Object,Array,Set,Math,Number,JSON,Date,
  today:()=>HOY,fmtN:n=>String(n),bge:s=>s,_vencDot:()=>'',_eqPuedeEliminar:()=>false,flt(){},_eqSort:'cod',alert(){},
  XLSX:{utils:{aoa_to_sheet:a=>(hoja=a,{}),book_new:()=>({}),book_append_sheet(){}},writeFile:(w,n)=>{xls=n;}}});
vm.runInContext(src.slice(src.indexOf('let _mqFiltro='),src.indexOf('// ══ GESTIÓN DE SUBTIPOS')),ctx,{filename:'mantenimiento.js'});
// El semáforo real del Máster (_vencDias), para usar el mismo criterio
vm.runInContext(src.slice(src.indexOf('function _vencDias'),src.indexOf('function _vencBadge')),ctx);
vm.runInContext(fs.readFileSync(R+'js/masterResumen.js','utf8'),ctx,{filename:'masterResumen.js'});
const ev=x=>vm.runInContext(x,ctx);
const datos=o=>{ctx.__o=Object.assign({agrup:'tipo',est:'',doc:'',q:''},o);return ev('_mvDatos(_mvBase(),__o)');};
const cods=D=>D.grupos.flatMap(G=>G.eqs.map(e=>e.codigo)).join(',');

console.log('\n== Semáforo (mismo criterio del punto del Listado) ==');
es('fecha pasada → vencido',ev("_mvEstado('2026-10-01')"),'venc');
es('hoy → por vencer',ev("_mvEstado('2026-10-11')"),'prox');
es('a 30 días → por vencer',ev("_mvEstado('2026-11-10')"),'prox');
es('a 31 días → vigente',ev("_mvEstado('2026-11-11')"),'ok');
es('sin fecha',ev("_mvEstado(null)"),'sin');

console.log('\n== Conteos por documento (proyecto 04) ==');
const c=ev('_mvConteos(_mvBase())');
es('SOAT: 1 vencido, 1 por vencer, 1 vigente, 2 sin fecha',[c.soatVenc.venc,c.soatVenc.prox,c.soatVenc.ok,c.soatVenc.sin].join('/'),'1/1/1/2');
es('GPS: la camioneta vencida (el generador no cuenta)',c.gpsVenc.venc,1);
es('solo Línea Blanca y Vehículo Menor',ev('_mvBase().map(e=>e.tipo)').every(t=>t==='Línea Blanca'||t==='Vehículo Menor'),true);
es('  Línea Amarilla y Equipos Menores fuera',ev('_mvBase().some(e=>/EXC|GEN/.test(e.codigo))'),false);
es('el de otro proyecto no cuenta (filtro del Máster)',Object.values(c.soatVenc).reduce((a,b)=>a+b,0),5);

console.log('\n== Agrupado por tipo ==');
let D=datos({});
es('en el orden de las líneas',D.grupos.map(G=>G.nombre).join(' | '),'Línea Blanca | Vehículo Menor');
es('  los equipos ordenados por código',D.grupos[0].eqs.map(e=>e.codigo).join(','),'VOL ECOP-002,VOL ECOP-005');
es('por proveedor',datos({agrup:'proveedor'}).grupos.map(G=>G.nombre).join(' | '),'RENTAFER | SERTICOM SAC | SERTICON S.A.C. | (Sin proveedor)');

console.log('\n== Filtros del semáforo ==');
es('vencidos (cualquier documento)',cods(datos({est:'venc'})),'VOL ECOP-002,CAM ECOP-007');
es('por vencer',cods(datos({est:'prox'})),'VOL ECOP-002,CAM ECOP-001');
es('sin ninguna fecha',cods(datos({est:'sin'})),'CAM ECOP-009');
es('vencidos solo en GPS',cods(datos({est:'venc',doc:'gpsVenc'})),'CAM ECOP-007');
es('sin fecha de SOAT',cods(datos({est:'sin',doc:'soatVenc'})),'CAM ECOP-007,CAM ECOP-009');
es('buscar por placa',cods(datos({q:'ccf'})),'VOL ECOP-002');

console.log('\n== La pestaña ==');
ev("_mrSetVista('venc')");
let H=nodos.mqResumenBody.innerHTML;
es('hay tres pestañas',/📋 Listado/.test(nodos.mqTabs.innerHTML)&&/🗂️ Resumen agrupado/.test(nodos.mqTabs.innerHTML)&&/🚦 Vencimientos/.test(nodos.mqTabs.innerHTML),true);
es('  y se ve el panel, no el listado',nodos.mqPanelLista.style.display+'|'+nodos.mqPanelResumen.style.display,'none|');
es('una tarjeta por documento',['SOAT','Póliza de Seguros','Rev. Técnica','RIC','GPS'].every(d=>H.includes('>'+d+'</span>')),true);
es('la fecha vencida en rojo con sus días',/color:#ef4444;font-weight:700">01\/10\/2026<\/div>[\s\S]{0,120}vencido hace 10 d/.test(H),true);
es('la que vence hoy lo dice',/vence HOY/.test(H),true);
es('la vigente con días que faltan',/01\/03\/2027[\s\S]{0,140}en 141 d/.test(H),true);
es('el grupo avisa cuántos vencidos tiene',/LÍNEA BLANCA|Línea Blanca/.test(H)&&/● 1 vencido/.test(H),true);
es('ninguna celda rota',/NaN|undefined/.test(H),false);
ev("_mvSetDoc('gpsVenc');_mvSetEst('venc')");H=nodos.mqResumenBody.innerHTML;
es('tocar la tarjeta GPS + Vencidos filtra',/CAM ECOP-007/.test(H)&&!/VOL ECOP-002/.test(H),true);
ev("_mvSetDoc('gpsVenc');_mvSetEst('venc')");
es('  tocarlos de nuevo los suelta',/VOL ECOP-002/.test(nodos.mqResumenBody.innerHTML),true);
ev('exportMasterVencXLSX()');
es('exporta el Excel',xls,'Vencimientos_Equipos.xlsx');
es('  con fecha y estado de cada documento',hoja[4].slice(0,1).concat(hoja[4].slice(6,8)).join(' · '),'VOL ECOP-002 · 01/10/2026 · VENCIDO');
ev("_mrSetVista('lista')");
es('volver al listado',nodos.mqPanelLista.style.display+'|'+nodos.mqPanelResumen.style.display,'|none');

console.log('\n'+(mal?'X '+mal+' fallo(s)':'OK todo bien')+'  ·  '+ok+'/'+(ok+mal));
process.exit(mal?1:0);
