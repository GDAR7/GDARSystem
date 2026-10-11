// Máster de Equipos · pestaña «Resumen agrupado».
// Equipos agrupados por Proveedor (encabezado del grupo y sus equipos debajo),
// Tipo, Subtipo o Proyecto, con Hrs mín., tarifas y contrato. Respeta los
// filtros de arriba del Máster. Se ejecuta la lógica real de js/mantenimiento.js.
const fs=require('fs'),vm=require('vm');
const R='c:/Users/LENOVO/OneDrive/Documents/GitHub/GDARSystem/';
let ok=0,mal=0;
const es=(l,g,e)=>{const b=String(g)===String(e);b?ok++:mal++;
  console.log((b?'  OK  ':'  MAL ')+l.padEnd(62)+'= '+g+(b?'':'  (esperado '+e+')'));};

const E=(id,codigo,o)=>Object.assign({id,codigo,nombre:codigo+' prueba',tipo:'Línea Amarilla',sub:'Excavadora',est:'Operativo',proyecto:'EPY-004-26'},o);
const DB={equipos:[
  E(1,'EXC ECOP-010',{proveedor:'PRUDENCYS GROUP',rucProveedor:'20604936820',contacto:'ELIDA SOLANO',horasMinimas:150,hrsMinVenta:300,tarifa:51.5,tarifaUn:'HM',moneda:'DOLARES',inicioContrato:'2026-05-01',calentamientoH:0.2}),
  E(2,'EXC ECOP-002',{proveedor:' prudencys  group',horasMinimas:200,tarifa:45,tarifaUn:'HM',moneda:'DOLARES'}),
  E(3,'VOL ECOP-001',{tipo:'Línea Blanca',sub:'Volquete',proveedor:'RENTAFER',tarifa:12000,tarifaUn:'MES',moneda:'SOLES',celular:'999111222'}),
  E(4,'CAM ECOP-001',{tipo:'Vehículo Menor',sub:'Camioneta',proveedor:'RENTAFER',tarifa:9000,tarifaUn:'MES',moneda:'SOLES'}),
  E(5,'GEN ECOP-001',{tipo:'Equipos Menores',sub:'Generador',proveedor:''}),
  E(6,'EXC VIEJA',{proveedor:'RENTAFER',est:'Desmovilizado',tarifa:100,tarifaUn:'HM',moneda:'SOLES'}),
  E(7,'MOT OTRO',{sub:'Motoniveladora',proveedor:'FERREYROS',proyecto:'EPY-005-26'})
]};
const nodos={};
const nodo=id=>nodos[id]||(nodos[id]={id,innerHTML:'',style:{},value:''});
const src=fs.readFileSync(R+'js/mantenimiento.js','utf8');
const ini=src.indexOf('let _mqFiltro='),fin=src.indexOf('// ══ GESTIÓN DE SUBTIPOS');
let xls=null,hoja=null;
const ctx=vm.createContext({DB,document:{getElementById:nodo},console,String,Object,Array,Set,Math,Number,JSON,
  fmtN:n=>String(n),bge:s=>'<b>'+s+'</b>',_vencDot:()=>'',_eqPuedeEliminar:()=>false,flt(){},_eqSort:'cod',alert(){},
  XLSX:{utils:{aoa_to_sheet:a=>(hoja=a,{}),book_new:()=>({}),book_append_sheet(){}},writeFile:(w,n)=>{xls=n;}}});
vm.runInContext(src.slice(ini,fin),ctx,{filename:'mantenimiento.js'});
vm.runInContext(fs.readFileSync(R+'js/masterResumen.js','utf8'),ctx,{filename:'masterResumen.js'});
const ev=x=>vm.runInContext(x,ctx);
const datos=(agrup,q)=>{ctx.__a=agrup;ctx.__q=q||'';return ev('_mrDatos(_mqFiltrados(),__a,__q)');};

console.log('\n== Por proveedor (proyecto 04 por defecto) ==');
let D=datos('proveedor');
es('grupos en orden alfabético, sin proveedor al final',D.grupos.map(G=>G.nombre).join(' | '),'PRUDENCYS GROUP | RENTAFER | (Sin proveedor)');
es('  el de otro proyecto no entra (filtro del Máster)',D.total,6);
let G=D.grupos[0];
es('mayúsculas y espacios de más caen en el mismo grupo',G.eqs.length,2);
es('  los equipos van ordenados por código con número',G.eqs.map(e=>e.codigo).join(','),'EXC ECOP-002,EXC ECOP-010');
es('  junta RUC y contacto de cualquiera de sus fichas',G.ruc+' · '+G.ctc,'20604936820 · ELIDA SOLANO');
es('  suma las Hrs mín.',G.hmin,350);
es('  tarifas por moneda y unidad',G.tarifas.map(x=>x.m+' '+x.v+'/'+x.u).join(' · '),'DOLARES 96.5/HM');
G=D.grupos[1];
es('RENTAFER: 3 equipos, 2 activos',G.eqs.length+' / '+G.activos,'3 / 2');
es('  no mezcla soles por hora con soles por mes',G.tarifas.map(x=>x.m+' '+x.v+'/'+x.u).join(' · '),'SOLES 100/HM · SOLES 21000/MES');

console.log('\n== Otras agrupaciones ==');
es('por tipo',datos('tipo').grupos.map(G=>G.nombre+':'+G.eqs.length).join(' | '),'Equipos Menores:1 | Línea Amarilla:3 | Línea Blanca:1 | Vehículo Menor:1');
es('por subtipo',datos('sub').grupos.map(G=>G.nombre).join(' | '),'Camioneta | Excavadora | Generador | Volquete');
ev("_mqProy=''");
es('por proyecto, con todos los proyectos',datos('proyecto').grupos.map(G=>G.nombre+':'+G.eqs.length).join(' | '),'EPY-004-26:6 | EPY-005-26:1');
ev("_mqProy='EPY-004-26'");
es('buscar por RUC',datos('proveedor','2060493').total,1);
es('buscar por proveedor',datos('proveedor','rentafer').total,3);

console.log('\n== La pestaña ==');
ev('rMaster()');
es('arranca en el listado de siempre',nodos.mqPanelLista.style.display+'|'+nodos.mqPanelResumen.style.display,'|none');
es('  con las dos pestañas',/📋 Listado/.test(nodos.mqTabs.innerHTML)&&/🗂️ Resumen agrupado/.test(nodos.mqTabs.innerHTML),true);
ev("_mrSetVista('resumen')");
es('cambiar a Resumen agrupado',nodos.mqPanelLista.style.display+'|'+nodos.mqPanelResumen.style.display,'none|');
let H=nodos.mqResumenBody.innerHTML;
es('el proveedor va como encabezado del grupo',/PRUDENCYS GROUP<\/span>[\s\S]*?2 eq\./.test(H),true);
es('  con RUC y contacto',/RUC 20604936820 · ELIDA SOLANO/.test(H),true);
es('  y sus equipos en las filas de abajo',/PRUDENCYS GROUP[\s\S]*EXC ECOP-002[\s\S]*EXC ECOP-010[\s\S]*RENTAFER/.test(H),true);
es('la tarifa con moneda y unidad',/US\$ 51\.50 \/ h/.test(H),true);
es('  y la mensual',/S\/ 12,000\.00 \/ mes/.test(H),true);
es('las Hrs mín. del proveedor',/>150</.test(H),true);
es('  sin Hrs mín. venta (se quitó)',/mín\. venta|>300</.test(H),false);
es('el contrato y el calentamiento',/01\/05\/2026/.test(H)&&/0\.20 h/.test(H),true);
es('agrupado por proveedor no repite la columna Proveedor',/>Proveedor<\/th>/.test(H),false);
es('ninguna celda rota',/NaN|undefined/.test(H),false);
ev("_mrToggle('PRUDENCYS GROUP')");H=nodos.mqResumenBody.innerHTML;
es('tocar el encabezado contrae el grupo',/EXC ECOP-010/.test(H),false);
ev("_mrTodos(true)");
es('  «Expandir todo» lo vuelve a abrir',/EXC ECOP-010/.test(nodos.mqResumenBody.innerHTML),true);
ev("_mrSetAgrup('tipo')");H=nodos.mqResumenBody.innerHTML;
es('agrupado por tipo sí muestra la columna Proveedor',/>Proveedor<\/th>/.test(H),true);
ev("_mqSet('desmovilizados')");
es('los chips de Estado también filtran el resumen',/EXC VIEJA/.test(nodos.mqResumenBody.innerHTML)&&!/EXC ECOP-010/.test(nodos.mqResumenBody.innerHTML),true);
ev("_mqSet('todos');_mrSetAgrup('proveedor')");
ev('exportMasterResumenXLSX()');
es('exporta el Excel agrupado',xls,'Master_Equipos_por_Proveedor.xlsx');
es('  el grupo es fila de encabezado',String(hoja[3][0]).startsWith('PRUDENCYS GROUP — 2 equipos · RUC 20604936820'),true);
es('  y debajo sus equipos',hoja[4][0]+' · '+hoja[4][13]+' '+hoja[4][14]+'/'+hoja[4][15],'EXC ECOP-002 · DOLARES 45/HM');
ev("_mrSetVista('lista')");
es('volver al listado',nodos.mqPanelLista.style.display,'');

console.log('\n== Enganche ==');
const html=fs.readFileSync(R+'index.html','utf8');
es('el panel del listado y el del resumen existen',/id="mqPanelLista"/.test(html)&&/id="mqResumenBody"/.test(html),true);
es('carga después de mantenimiento.js',html.indexOf('js/masterResumen.js')>html.indexOf('js/mantenimiento.js'),true);

console.log('\n'+(mal?'X '+mal+' fallo(s)':'OK todo bien')+'  ·  '+ok+'/'+(ok+mal));
process.exit(mal?1:0);
