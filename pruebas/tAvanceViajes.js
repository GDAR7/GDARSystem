// Control de Equipos · 🚛 Avance de Viajes: corte de viajes de volquetes a media
// jornada (cargado a mano, antes del parte) y las restricciones del turno con
// su ubicación en la imagen aérea del Parte de Turno. Lo que importa: que los
// totales, el promedio y la proyección salgan bien, que se guarde una fila por
// corte, que el PDF lleve el plano con los números de las restricciones y que,
// cuando ya existe el parte del día, se muestre al lado para comparar.
const fs=require('fs'),vm=require('vm');
const R='c:/Users/LENOVO/OneDrive/Documents/GitHub/GDARSystem/';
let ok=0,mal=0;
const es=(l,g,e)=>{const b=String(g)===String(e);b?ok++:mal++;
  console.log((b?'  OK  ':'  MAL ')+l.padEnd(62)+'= '+g+(b?'':'  (esperado '+e+')'));};

const DB={
  equipos:[
    {id:20,codigo:'VOL ECOP-002',sub:'Volquete',est:'Operativo'},
    {id:21,codigo:'VOL ECOP-001',sub:'Volquete',est:'Desmovilizado'},
    {id:54,codigo:'VOL ECOP-004',sub:'Volquete',est:'Operativo'},
    {id:73,codigo:'VOL ECOP-005',sub:'Volquete',est:'Operativo'},
    {id:5,codigo:'EXC-01',sub:'Excavadora',est:'Operativo'}
  ],
  partes:[
    {id:1,fecha:'2026-11-10',eqId:20,op:'PEREZ, JUAN',turno:'DIA',viajes:[{cant:20,origen:'C. Huantajalla',destino:'R3 - Dique Auxiliar',material:'MATERIAL COMUN'}]},
    {id:2,fecha:'2026-11-11',eqId:20,op:'PEREZ, JUAN',turno:'DIA',viajes:[{cant:18,origen:'C. Huantajalla',destino:'R3 - Dique Auxiliar',material:'MATERIAL COMUN'}]},
    {id:3,fecha:'2026-11-11',eqId:54,op:'LOPEZ, ANA',turno:'NOCHE',viajes:[{cant:9,origen:'Mesa de plata',destino:'R3 - Dique intermedio',material:'TIPO 2'}]},
    // El parte final del día del corte: para comparar
    {id:4,fecha:'2026-11-12',eqId:20,op:'PEREZ, JUAN',turno:'DIA',viajes:[{cant:21,origen:'C. Huantajalla',destino:'R3 - Dique Auxiliar'}]},
    {id:5,fecha:'2026-11-12',eqId:54,op:'LOPEZ, ANA',turno:'DIA',nViajes:15,viajes:[]}
  ],
  tramos:[
    {id:1,codigo:'TMO-002',inicio:'C. Huantajalla',fin:'R3 - Dique Auxiliar',puntos:[{x:10,y:10},{x:20,y:20},{x:30,y:30}]},
    {id:2,codigo:'TMO-060',inicio:'C. Huantajalla',fin:'C. Huantajalla',puntos:[]},
    {id:3,codigo:'TMO-078',inicio:'Mesa de plata',fin:'Lavadero (Tres torres)',puntos:[]},
    {id:4,codigo:'TMO-090',inicio:'Lavadero (Tres torres)',fin:'Mesa de plata',puntos:[{x:50,y:50},{x:60,y:60}]}
  ],
  frentesTrabajo:[{nombre:'R3 - Dique intermedio',puntos:[{x:40,y:40},{x:60,y:40},{x:60,y:60},{x:40,y:60}]}]
};
const nodos={};
const Nodo=id=>({id,innerHTML:'',textContent:'',value:'',style:{},firstElementChild:null,
  appendChild(){},remove(){},addEventListener(){},querySelector(){return null;},querySelectorAll(){return [];},scrollIntoView(){}});
const nodo=id=>nodos[id]||(nodos[id]=Nodo(id));
['page-avanceViajes','avjForm','avjKpis','avjVol','avjRes','avjHist','avjAviso'].forEach(nodo);
let filas=[],faltaTabla=false,avisos=[];
const supa={from:t=>({
  select:()=>({order:()=>({limit:async()=>faltaTabla?{data:null,error:{code:'PGRST205',message:'avance_viajes'}}:{data:filas.slice(),error:null}})}),
  upsert:async f=>{filas=filas.filter(x=>x.id!==f.id);filas.push(JSON.parse(JSON.stringify(f)));return{error:null};},
  delete:()=>({eq:async(k,v)=>{filas=filas.filter(x=>x.id!==v);return{error:null};}})
}),storage:{from:()=>({upload:async()=>({error:null}),getPublicUrl:p=>({data:{publicUrl:'https://x/'+p}})})}};
const mem={};
const ctx=vm.createContext({DB,console,Date,Math,Number,String,Object,Array,JSON,Set,Map,isFinite,parseInt,parseFloat,Promise,setTimeout,clearTimeout,URL:{createObjectURL:()=>'blob:x',revokeObjectURL(){}},
  document:{getElementById:id=>nodos[id]||null,createElement:()=>Nodo('tmp'),body:{appendChild(){}},head:{appendChild(){}},querySelector:()=>null,querySelectorAll:()=>[]},
  window:{innerWidth:1400},localStorage:{getItem:k=>k in mem?mem[k]:null,setItem:(k,v)=>{mem[k]=String(v);}},
  toast:(m,e)=>avisos.push(m),confirm:()=>true,today:()=>'2026-11-12',supa,
  CU:{nombre:'Abel Rodríguez A.',codigo:'EIBEL25'},EMPRESA:{logo:'img/logo.png'}});
vm.runInContext(fs.readFileSync(R+'js/parteTurno.js','utf8'),ctx,{filename:'parteTurno.js'});
vm.runInContext(fs.readFileSync(R+'js/avanceViajes.js','utf8'),ctx,{filename:'avanceViajes.js'});
const ev=x=>vm.runInContext(x,ctx);
const espera=()=>new Promise(r=>setTimeout(r,5));

(async()=>{
console.log('\n== Corte nuevo ==');
ev("_avj=_avjNuevo('2026-11-12','Día')");
const vol=ev('_avj.volquetes');
es('solo volquetes no desmovilizados',vol.map(v=>v.codigo).join(','),'VOL ECOP-002,VOL ECOP-004,VOL ECOP-005');
es('operador del último parte',vol[0].operador,'PEREZ, JUAN');
es('las rutas del último parte salen como columnas',ev("_avj.cols.map(c=>c.origen+' → '+c.destino).join(' | ')"),'C. Huantajalla → R3 - Dique Auxiliar');
es('corte por defecto del turno día',ev('_avj.horaCorte'),'12:00');
ev("_avjSet('turno','Noche')");
es('al pasar a noche el corte va a las 00:00',ev('_avj.horaCorte'),'00:00');
ev("_avjSet('turno','Día')");

console.log('\n== Cálculos al corte de las 12:00 ==');
ev("_avjVol(0,'viajes','10');_avjVol(1,'viajes','6');_avjVol(2,'noOpera',true);_avjVol(2,'motivo','Mantenimiento')");
let c=ev('_avjCalc(_avj)');
es('viajes al corte',c.viajes,16);
es('volquetes operando',c.opera+' / '+c.total,'2 / 3');
es('promedio por volquete',c.promedio,8);
es('5 h de turno transcurridas (07:00 → 12:00)',c.transc,5);
es('proyección al cierre: 16 × 12 / 5',c.proy,38);
ev("_avjSet('meta','20')");
c=ev('_avjCalc(_avj)');
es('meta del turno: 20 × 2 operando',c.metaTurno,40);
es('  al corte se esperaban 40 × 5 / 12',c.metaAlCorte,17);
es('las tarjetas tienen bordes (clase kpi)',(nodos.avjKpis.innerHTML.match(/class="kpi"/g)||[]).length,5);

console.log('\n== Restricciones ==');
ev("_avjResAgregar()");
ev("_avjRes(0,'motivo','Pase cerrado / tránsito restringido');_avjRes(0,'ini','09:30');_avjRes(0,'fin','11:00');_avjRes(0,'descripcion','Pase cerrado por voladura en tajo')");
ev("_avj.restricciones[0].ubicacion={x:50,y:50}");
ev("_avjResAgregar();_avjRes(1,'motivo','Lluvia / clima');_avjRes(1,'ini','23:30');_avjRes(1,'fin','00:30');_avjResTodos(1,false);_avjResEq(1,54,true)");
c=ev('_avjCalc(_avj)');
es('horas con restricción (1,5 h + 1 h pasando medianoche)',c.horasPerdidas,2.5);
const copia=ev('_avjCopia()');
es('el punto cae en su frente dibujado',copia.restricciones[0].frente,'R3 - Dique intermedio');
es('volquetes afectados elegidos',JSON.stringify(copia.restricciones[1].eqIds),'[54]');
es('un volquete que no opera no suma viajes',copia.volquetes[2].viajes+' · '+copia.volquetes[2].motivo,'0 · Mantenimiento');

console.log('\n== Varias rutas (otros frentes) ==');
ev("_avjColAgregar();_avjColSet(1,'origen','Mesa de Plata');_avjColSet(1,'destino','Lav. 3 Torres');_avjColSet(1,'material','TIPO - 02')");
ev("_avjCel(0,1,'4');_avjCel(1,1,'3')");
c=ev('_avjCalc(_avj)');
es('los viajes de la otra ruta suman al total (10+4 + 6+3)',c.viajes,23);
es('promedio sobre los volquetes con viajes (23 / 2)',c.promedio,11.5);
es('volquetes operativos',c.conViajes+' de '+c.total,'2 de 3');
let cp=ev('_avjCopia()');
es('cada volquete guarda sus rutas',cp.volquetes[0].rutas.map(x=>x.origen+':'+x.viajes).join(', '),'C. Huantajalla:10, Mesa de Plata:4');
es('  y su total',cp.volquetes[0].viajes,14);
let Hm=ev('_avjDocHtml')(cp);
es('el PDF trae una columna por ruta',/TIPO - 02/.test(Hm)&&/Mesa de Plata<br>→ Lav\. 3 Torres/.test(Hm),true);
es('  con el total de cada ruta y el general',/TOTAL VIAJES<\/td>[\s\S]*?>16<\/td>[\s\S]*?>7<\/td>[\s\S]*?>23<\/td>/.test(Hm),true);
ev('_avjPintarVol()');
es('pantalla: fila de totales por ruta',/TOTAL VIAJES/.test(nodos.avjVol.innerHTML)&&/id="avjCT1"[^>]*>7</.test(nodos.avjVol.innerHTML),true);
ev("_avjCel(0,1,'');_avjCel(1,1,'')");
ev("_avjColQuitar(1)");
es('quitar la ruta deja una sola columna',ev('_avj.cols.length')+' · '+ev('_avjCalc(_avj).viajes'),'1 · 16');
console.log('\n== Plano de rutas con viajes ==');
const conRutas={fecha:'2026-11-12',turno:'Día',horaCorte:'12:00',restricciones:[],volquetes:[
  {eqId:20,codigo:'VOL ECOP-002',viajes:12,rutas:[{origen:'C. Huantajalla',destino:'R3 - Dique Auxiliar',material:'COMUN',viajes:8,o:0},{origen:'MESA DE PLATA',destino:'Lavadero (Tres torres)',material:'TIPO 2',viajes:4,o:1}]},
  {eqId:54,codigo:'VOL ECOP-004',viajes:3,rutas:[{origen:'C. Huantajalla',destino:'C. Huantajalla',material:'COMUN',viajes:3,o:2}]}]};
const act=ev('_avjRutasActivas')(conRutas);
es('una entrada por ruta con viajes',act.map(a=>a.n+':'+(a.tramo&&a.tramo.codigo)).join(', '),'1:TMO-002, 2:TMO-078, 3:TMO-060');
es('el tramo dibujado se usa tal cual',act[0].pts.length+' · '+act[0].vuelta,'3 · false');
es('sin trazo propio usa el de vuelta (mayúsculas no importan)',act[1].vuelta+' · '+act[1].pts[0].x,'true · 60');
es('sin trazo en ningún sentido queda en la leyenda',act[2].pts,null);
const hoja=ev('_avjHojaRutas')(conRutas);
es('hoja propia con la imagen aérea',/PLANO DE RUTAS CON VIAJES/.test(hoja)&&/R3_2026_IMAGEN\.png/.test(hoja),true);
es('  solo dibuja las rutas con trazo (2 líneas)',(hoja.match(/<polyline/g)||[]).length,4);
es('  y avisa la que no tiene trazo',/sin trazo en el plano/.test(hoja),true);
es('en el PDF el plano va en su hoja',/en la hoja siguiente/.test(ev('_avjDocHtml')(conRutas,{sinPanel:true})),true);
const tr1=[{x:0,y:0},{x:100,y:0},{x:200,y:0}], tr2=[{x:50,y:2},{x:150,y:1},{x:150,y:90}], tr3=[{x:0,y:200},{x:100,y:200}];
es('detecta rutas que comparten camino',ev('_avjSeTocan')(tr1,tr2,7)+' · '+ev('_avjSeTocan')(tr1,tr3,7),'true · false');
es('la paralela se corre hacia un costado',JSON.stringify(ev('_avjParalela')(tr1,5.5).map(p=>p.y)),'[5.5,5.5,5.5]');
es('el número va al inicio de cada ruta',/left:71\.2px;top:43\.2px;[^"]*">1</.test(hoja),true);
es('sin viajes no hay hoja de rutas',ev('_avjHojaRutas')({volquetes:[],restricciones:[]}),'');
const viejo={volquetes:[{eqId:20,codigo:'VOL ECOP-002',viajes:9,origen:'A',destino:'B',material:'M'},{eqId:54,codigo:'VOL ECOP-004',viajes:0,origen:'',destino:'',material:''}]};
es('un corte guardado con el formato anterior se sigue leyendo',ev('_avjCalc')(viejo).viajes+' · '+ev('_avjMatriz')(viejo).cols.length,'9 · 1');

console.log('\n== Guardar ==');
ev("_avjGuardar()");await espera();await espera();
es('se guarda una fila en avance_viajes',filas.length,1);
const f=filas[0];
es('  con fecha, turno y hora del corte',f.fecha+' '+f.turno+' '+f.hora_corte,'2026-11-12 Día 12:00');
es('  y quién lo registró',f.autor,'Abel Rodríguez A.');
es('queda en el historial',/Cortes guardados/.test(nodos.avjHist.innerHTML)&&/>16</.test(nodos.avjHist.innerHTML),true);
es('el formulario queda listo para otro corte',ev('_avj.id')+' · '+ev('_avj.restricciones.length'),'null · 0');

console.log('\n== Documento ==');
const r=ev(`_avjBuscar(${f.id})`);
const H=ev('_avjDocHtml')(r);
es('título y corte',/AVANCE DE VIAJES/.test(H)&&/corte a las <b>12:00<\/b>/.test(H),true);
es('total de viajes',/TOTAL VIAJES<\/td>[\s\S]*?>16<\/td>/.test(H),true);
es('el que no opera sale marcado',/No opera<\/b> · Mantenimiento/.test(H),true);
es('tabla cruzada: material y ruta en el encabezado',/C\. Huantajalla<br>→ R3 - Dique Auxiliar/.test(H),true);
es('restricciones numeradas',/Restricciones · 2/.test(H),true);
es('plano con el título de restricciones',/Ubicación de las restricciones/.test(H)&&!/Ubicación de los trabajos/.test(H),true);
es('  y la marca número 1 en el plano',/>1<\/div>/.test(H),true);
es('comparación con el parte final (21 + 15 = 36)',/Parte final/.test(H)&&/>36<\/td>/.test(H),true);
es('aclara que es un avance preliminar',/no reemplaza el parte del turno/.test(H),true);
es('nombre del archivo',ev('_avjNombreArchivo')(r),'Avance de Viajes 2026-11-12 Día 12h00 - Abel Rodríguez A..pdf');

console.log('\n== Editar, reemplazar y eliminar ==');
ev(`_avjEditar(${f.id})`);
es('al editar se recupera el corte',ev('_avj.id')+' · '+ev('_avjCalc(_avj).viajes'),f.id+' · 16');
ev("_avjVol(0,'viajes','12')");
ev("_avjGuardar()");await espera();await espera();
es('editar no duplica la fila',filas.length,1);
es('  y guarda el cambio',filas[0].volquetes[0].viajes,12);
ev("_avjVol(0,'viajes','3')");
ev("_avjGuardar()");await espera();await espera();
es('otro corte a la misma hora reemplaza al anterior',filas.length+' · '+filas[0].volquetes[0].viajes,'1 · 3');
ev(`_avjEliminar(${filas[0].id})`);await espera();
es('eliminar',filas.length,0);

console.log('\n== Sin el SQL ==');
faltaTabla=true;avisos=[];
ev('_avjListo=null');ev('rAvanceViajes()');await espera();await espera();
es('avisa en pantalla que falta sql/avance_viajes.sql',/sql\/avance_viajes\.sql/.test(nodos.avjAviso.innerHTML),true);
ev("_avjVol(0,'viajes','5')");ev("_avjGuardar()");await espera();await espera();
es('no guarda y lo dice',filas.length===0&&avisos.some(a=>/sql\/avance_viajes\.sql/.test(a)),true);

console.log('\n== Conexión ==');
const I=fs.readFileSync(R+'index.html','utf8'),U=fs.readFileSync(R+'js/utils.js','utf8'),C=fs.readFileSync(R+'js/config.js','utf8');
es('página y script en index.html',/id="page-avanceViajes"/.test(I)&&/js\/avanceViajes\.js\?v=\d+/.test(I),true);
es('después de parteTurno.js (usa su mapa)',I.indexOf('js/parteTurno.js')<I.indexOf('js/avanceViajes.js'),true);
es('ruta en utils.js',/avanceViajes:rAvanceViajes/.test(U),true);
es('en el menú de Control de Equipos',/key:'reporteEquipos'[^}]*\},\{key:'avanceViajes',label:'Avance de Viajes'/.test(C),true);

console.log('\n'+(mal?'✗ '+mal+' FALLAS':'OK todo bien')+'  ·  '+ok+'/'+(ok+mal));
process.exit(mal?1:0);
})().catch(e=>{console.error(e);process.exit(1);});
