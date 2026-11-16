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
let motivos=null;   // null = falta sql/avance_motivos.sql
const supaMot={
  select:()=>({order:async()=>motivos?{data:motivos.slice(),error:null}:{data:null,error:{code:'PGRST205',message:'avance_motivos'}}}),
  upsert:async f=>{if(!motivos)return{error:{message:'avance_motivos'}};motivos=motivos.filter(x=>x.id!==f.id);motivos.push(JSON.parse(JSON.stringify(f)));return{error:null};}
};
const supa={from:t=>t==='avance_motivos'?supaMot:({
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
ev("DB.__ftAntes=DB.frentesTrabajo;DB.frentesTrabajo=[{nombre:'R3 - Dique Auxiliar'},{nombre:'c. huantajalla'},{nombre:'Botadero Sur'}]");
const sg=ev('_avjSugerencias()');
es('origen y destino ofrecen todos los frentes (sin repetir los ya usados)',
  sg.origenes.includes('R3 - Dique Auxiliar')&&sg.origenes.includes('Botadero Sur')&&sg.destinos.includes('Botadero Sur')
  &&sg.origenes.filter(x=>x.toLowerCase()==='c. huantajalla').length===1,true);
es('  primero los más usados, luego los frentes',sg.origenes.indexOf('C. Huantajalla')<sg.origenes.indexOf('Botadero Sur'),true);
ev('DB.frentesTrabajo=DB.__ftAntes');
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
console.log('\n== Tipos de restricción (con código) ==');
es('una restricción nueva trae el primer tipo con su código',ev("(_avjResAgregar(),_avj.restricciones[_avj.restricciones.length-1].codigo)"),'PC');
ev("_avjResMotivo(_avj.restricciones.length-1,'FL')");
es('  al elegir FL toma su descripción',ev("_avj.restricciones[_avj.restricciones.length-1].motivo"),'Frente sin liberar (topografía / QA)');
es('  y la lista muestra «código · descripción»',/value="FL" selected>FL · Frente sin liberar/.test(nodos.avjRes.innerHTML),true);
es('  la cabecera muestra la letra y el código',/Restricción C · <span class="avj-cod">FL</.test(nodos.avjRes.innerHTML),true);
ev("_avj.restricciones.pop()");
es('un corte viejo (sin código) lo recupera por el nombre',ev("_avjCodDe({motivo:'Voladura'})"),'VO');
es('el PDF muestra el código en su columna Cód. y el motivo aparte',(h=>/>Cód\.<\/th>/.test(h)&&/>VO<\/span><\/td>/.test(h)&&/>Voladura</.test(h))(ev('_avjDocHtml')({volquetes:[],restricciones:[{motivo:'Voladura'}]})),true);
// Sin el SQL: se ven los de siempre y no deja agregar
ev('_avjMotAbrir()');await espera();
avisos=[];await ev('_avjMotGuardar()');
es('sin sql/avance_motivos.sql: usa los de siempre y no deja guardar',ev('_avjMotFalta')+' · '+ev('_avjMotivos(false).length')+' · '+avisos.some(a=>/sql\/avance_motivos\.sql/.test(a)),'true · 10 · true');
// Con la tabla: agregar FL nuevo
motivos=ev('_AVJ_MOT_DEF').map(m=>({...m}));
ev('_avjMotListo=null');await ev('_avjCargarMotivos()');
nodos.avjMotCod=Nodo('avjMotCod');nodos.avjMotNom=Nodo('avjMotNom');
nodos.avjMotCod.value='PC';nodos.avjMotNom.value='Repetido';avisos=[];
await ev('_avjMotGuardar()');
es('no acepta un código repetido',avisos.some(a=>/PC ya existe/.test(a))+' · '+motivos.length,'true · 10');
nodos.avjMotCod.value='fx-1';nodos.avjMotNom.value='Falta de agua para riego';
await ev('_avjMotGuardar()');
const nuevo=motivos.find(m=>m.codigo==='FX1');
es('agrega el tipo nuevo con el ítem siguiente',nuevo?nuevo.item+' · '+nuevo.nombre:'—','11 · Falta de agua para riego');
es('  y ya aparece para elegir',ev("_avjMotivos(false).some(m=>m.codigo==='FX1')"),true);
await ev(`_avjMotActivo(${nuevo.id})`);
es('desactivarlo lo saca de la lista sin borrarlo',ev("_avjMotivos(false).some(m=>m.codigo==='FX1')")+' · '+motivos.length,'false · 11');
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
const Hres=H.split('Ubicación de las restricciones')[1].split('Plano de rutas')[0];
es('  y en el plano la marca lleva el código (PC), no número',/>PC<\/div>/.test(Hres)&&!/>1<\/div>/.test(Hres),true);
es('  en forma de píldora para que entre el código',/border-radius:11px;white-space:nowrap/.test(Hres),true);
es('código repetido: lleva también la letra',ev("(()=>{const R=[{codigo:'FL'},{codigo:'FL'},{codigo:'VO'}];return JSON.stringify(_avjEtiquetasRes(R,R));})()"),'["FL·A","FL·B","VO"]');
es('restricciones: columna Cód. con el código (ya no N° con letra)',/>Cód\.<\/th>/.test(H)&&!/>N°<\/th><th[^>]*>Motivo/.test(H)&&/<\/span><\/td>\s*<td[^>]*>[^<]/.test(H),true);
es('plano de rutas: leyenda del círculo numerado (inicio del tramo, carguío)',/data-avj-leyenda[\s\S]*inicio del tramo[\s\S]*carguío/.test(H),/Plano de rutas con viajes/.test(H));
es('  código repetido en la tabla: lleva la letra (FL·A, FL·B)',(h=>/>FL·A<\/span>/.test(h)&&/>FL·B<\/span>/.test(h))(ev('_avjDocHtml')({volquetes:[],restricciones:[{codigo:'FL',motivo:'Falla'},{codigo:'FL',motivo:'Falla'}]})),true);
es('letras después de la Z',ev('_avjLetra(0)')+' '+ev('_avjLetra(25)')+' '+ev('_avjLetra(26)'),'A Z A1');
es('comparación con el parte final (21 + 15 = 36)',/Parte final/.test(H)&&/>36<\/td>/.test(H),true);
es('el pie solo lleva quién registró (sin la nota de avance preliminar)',/Registró:/.test(H)&&!/no reemplaza el parte del turno/.test(H),true);
es('la hoja de rutas no lleva la nota «solo se sombrean…»',/solo se sombrean/.test(ev('_avjHojaRutas')(r)),false);
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

console.log('\n== Detalle (lupa) de rutas cortas ==');
{
  const ev=s=>vm.runInContext(s,ctx);
  // Una ruta larga y una interna corta (25×13 px) que sale del mismo lugar
  ctx.__A=[
    {n:1,col:'#e11d48',origen:'C. Huantajalla',destino:'R3 - Dique Auxiliar',Q:[{x:400,y:50},{x:450,y:150},{x:550,y:300}]},
    {n:2,col:'#2563eb',origen:'C. Huantajalla',destino:'C. Huantajalla',Q:[{x:390,y:55},{x:405,y:60},{x:415,y:68}]}
  ];
  ev('_avjBlanco=null;_avjLupaMov={}');
  let L=ev('_avjLupas(__A,712,432)');
  es('la ruta corta arma una zona de detalle',L.length+' · '+L[0].chicas.map(a=>a.n).join(','),'1 · 2');
  es('  la zona la contiene',L[0].zona.x<390&&L[0].zona.x+L[0].zona.w>415&&L[0].zona.y<55&&L[0].zona.y+L[0].zona.h>68,true);
  es('  se amplía entre 1,8× y 4×',L[0].z>=1.8&&L[0].z<=4,true);
  es('  lleva el nombre del lugar',L[0].nombre,'C. Huantajalla');
  es('sin saber qué es blanco, va debajo del plano',L[0].pos,null);
  // Imagen toda blanca salvo nada: se ubica dentro, sin tapar las rutas
  ev('_avjBlanco={cw:178,ch:108,S:_avjIntegral(178,108,()=>1)}');
  L=ev('_avjLupas(__A,712,432)');
  const p=L[0].pos||{}, O=ev('_avjOcupado(__A,712,432)');
  ctx.__p=p;ctx.__g=L[0];
  es('con espacio blanco, va dentro del plano',!!L[0].pos,true);
  es('  sin tapar ninguna ruta',ev('_avjSuma(_avjOcupado(__A,712,432),__p.x,__p.y,__g.bw,__g.bh).s'),0);
  es('  sin tapar su recuadro rojo',p.x>L[0].zona.x+L[0].zona.w||p.x+L[0].bw<L[0].zona.x||p.y>L[0].zona.y+L[0].zona.h||p.y+L[0].bh<L[0].zona.y,true);
  // Movido a mano: se respeta (y no se sale del plano)
  ev('_avjLupaMov={0:{x:900,y:20}}');
  L=ev('_avjLupas(__A,712,432)');
  es('movido a mano: queda donde lo dejaron, dentro del plano',L[0].pos.x+' · '+L[0].pos.y,(712-L[0].bw)+' · 20');
  ev('_avjLupaMov={}');
  // Imagen sin nada blanco: debajo
  ev('_avjBlanco={cw:178,ch:108,S:_avjIntegral(178,108,()=>0)}');
  es('sin espacio blanco, va debajo',ev('_avjLupas(__A,712,432)')[0].pos,null);
  // Solo rutas largas: no hay detalle
  ctx.__B=[ctx.__A[0]];
  es('sin rutas cortas no hay detalle',ev('_avjLupas(__B,712,432)').length,0);
  // Números: el segundo al lado, no lejos
  const m=ev('_avjMarcas([{a:{n:1,col:"#f00"},p:{x:100,y:100}},{a:{n:2,col:"#00f"},p:{x:100,y:100}},{a:{n:3,col:"#0f0"},p:{x:100,y:100}}],712,432)');
  const xs=[...m.matchAll(/left:([\d.]+)px;top:([\d.]+)px/g)].map(x=>x[1]+','+x[2]);
  es('números juntos: al lado y no en fila hacia lejos',xs.join(' '),'100.0,100.0 124.0,100.0 76.0,100.0');
  // Flecha
  const f=ev('_avjFlechaSvg({x:400,y:40,w:60,h:40},{x:30,y:10,w:264,h:190})');
  es('la flecha une el recuadro con el detalle',/<line/.test(f)&&/<polygon/.test(f),true);
  es('  pegados no lleva flecha',ev('_avjFlechaSvg({x:10,y:10,w:60,h:40},{x:12,y:12,w:60,h:40})'),'');
  // En el plano: recuadro rojo, detalle y flecha; el número 2 ya no se repite afuera
  DB.tramos.push({id:9,codigo:'TMO-060b',inicio:'Cantera X',fin:'Cantera X',puntos:[{x:54.8,y:12.7},{x:56.9,y:13.9},{x:58.3,y:15.7}]});
  DB.tramos.push({id:10,codigo:'TMO-002b',inicio:'Cantera X',fin:'Botadero Y',puntos:[{x:56.2,y:11.6},{x:63.2,y:34.7},{x:77.2,y:69.4}]});
  ctx.__r={fecha:'2026-11-13',turno:'Día',horaCorte:'18:00',volquetes:[{codigo:'V1',rutas:[
    {origen:'Cantera X',destino:'Botadero Y',material:'M',viajes:10},{origen:'Cantera X',destino:'Cantera X',material:'M',viajes:5}]}],restricciones:[]};
  ev('_avjBlanco={cw:178,ch:108,S:_avjIntegral(178,108,()=>1)}');
  let h=ev('_avjPlanoRutasHtml(__r,"#2f5f98")');
  es('plano: recuadro rojo de la zona',/stroke="#dc2626" stroke-width="2"/.test(h),true);
  es('  el detalle dentro, arrastrable',/data-avj-lupa="0"/.test(h)&&/data-zona="/.test(h),true);
  es('  con su flecha',/data-avj-flecha="0"><line/.test(h),true);
  es('  título del detalle, sin el zoom',/Detalle · Cantera X<\/div>/.test(h)+' · '+/\d×/.test(h),'true · false');
  es('  cada número una sola vez en el plano general (los otros, en el detalle)',(h.match(/>2<\/div>/g)||[]).length,1);
  ev('_avjBlanco=null');
  h=ev('_avjPlanoRutasHtml(__r,"#2f5f98")');
  es('sin espacio: el detalle debajo, sin flecha',/data-avj-lupa/.test(h)+' · '+/data-avj-flecha/.test(h)+' · '+/Detalle · Cantera X/.test(h),'false · false · true');
  es('  los de abajo se reparten parejo en el ancho del plano',/data-avj-abajo style="[^"]*justify-content:space-evenly;width:712px/.test(h),true);
  DB.tramos.splice(-2,2);
  // La vista previa: botón para volver a la ubicación automática
  const srcA=fs.readFileSync(R+'js/avanceViajes.js','utf8');
  es('vista previa: ↺ Ubicación automática',/_avjLupaReset\(\)/.test(srcA)&&/function _avjLupaReset\(\)\{_avjLupaMov=\{\};_avjRepintarDoc\(\);\}/.test(srcA),true);
  es('el PDF espera saber qué es blanco antes de dibujar',/await _avjCargarBlanco\(\)/.test(srcA),true);
  es('hoja más alta que A4: se achica sin deformarse',/w2=h2>H\?W\*H\/h2:W/.test(srcA),true);
}

console.log('\n== Avance / Reporte y capa / acopio ==');
{
  const ev=s=>vm.runInContext(s,ctx);
  es('Día 12:00 → Avance',ev('_avjTipoSugerido("Día","12:00")'),'Avance');
  es('Día 19:00 → Reporte (cierre)',ev('_avjTipoSugerido("Día","19:00")'),'Reporte');
  es('Noche 00:00 → Avance',ev('_avjTipoSugerido("Noche","00:00")'),'Avance');
  es('Noche 07:00 → Reporte (cierre)',ev('_avjTipoSugerido("Noche","07:00")'),'Reporte');
  ev('_avj=_avjNuevo("2026-11-15","Día")');
  es('corte nuevo: Avance',ev('_avj.tipo'),'Avance');
  ev('_avjSet("horaCorte","19:00")');
  es('al poner la hora de cierre se sugiere Reporte',ev('_avj.tipo'),'Reporte');
  ev('_avjSet("tipo","Avance");_avjSet("horaCorte","19:30")');
  es('elegido a mano, ya no cambia solo',ev('_avj.tipo'),'Avance');
  // Una ruta con 60 viajes: 20 a capa y 40 a acopio
  ev('_avj.cols=[_avjColNueva({origen:"C. Huantajalla",destino:"R3 - Dique Auxiliar",material:"COM"}),_avjColNueva({origen:"A",destino:"B",material:"RCZ"})]');
  ev('_avj.volquetes=_avj.volquetes.slice(0,2);_avj.volquetes.forEach(v=>{v.noOpera=false;v.c={};});');
  ev('_avj.volquetes[0].c[_avj.cols[0].id]="35";_avj.volquetes[1].c[_avj.cols[0].id]="25";_avj.volquetes[1].c[_avj.cols[1].id]="10"');
  ev('_avjCapa(0,"20")');
  es('a capa 20 de 60 → acopio 40',ev('JSON.stringify(_avjRepartoTot(_avj.cols.map(c=>({capa:c.capa,tot:_avjTotCol(c)}))))'),'{"capa":20,"acopio":40,"sin":10,"hay":true}');
  ev('_avjCapaTodo(1,0)');
  es('«A» = todo a acopio',ev('_avj.cols[1].capa'),'0');
  ev('_avjCapa(0,"99")');
  es('más que el total: se toma el total',ev('_avjCapaDe(_avj.cols[0].capa,60)'),60);
  ev('_avjCapa(0,"20")');
  // Meta: se compara con los viajes a capa (20), no con el total (70)
  ev('_avj.meta=12;_avj.horaCorte="13:00"');
  const cm=ev('_avjCalc(_avj)');
  es('meta del turno: el % se mide con los viajes a capa',cm.aCapa+' · '+cm.metaAlCorte+' · '+Math.round(cm.pctCorte),'20 · 12 · 167');
  ev('_avjPintarKpis()');
  es('  la tarjeta lo dice',/a capa 20 de 12 esperados al corte · 167%/.test(nodos.avjKpis.innerHTML),true);
  const sinRep=ev('_avjCalc({..._avj,cols:_avj.cols.map(c=>({...c,capa:""}))})');
  es('  sin reparto indicado: con el total, como antes',sinRep.aCapa+' · '+Math.round(sinRep.pctCorte),'null · 583');
  es('  guardado: también con los viajes a capa',ev('_avjCalc(_avjCopia()).aCapa'),20);
  ev('_avj.meta=0;_avj.horaCorte="12:00"');
  const Cp=ev('_avjCopia()');
  es('se guarda el reparto por ruta',JSON.stringify(Cp.destinos),'[{"origen":"C. Huantajalla","destino":"R3 - Dique Auxiliar","material":"COM","capa":20},{"origen":"A","destino":"B","material":"RCZ","capa":0}]');
  es('y el tipo',Cp.tipo,'Avance');
  ctx.__cp=Cp;
  const M=ev('_avjMatriz(__cp).cols.map(c=>c.tot+":"+c.capa).join(" ")');
  es('al leerlo, cada ruta trae su reparto',M,'60:20 10:0');
  const D=ev('_avjDocHtml(__cp)');
  es('PDF: filas A CAPA y A ACOPIO bajo el total',/⬆ A CAPA/.test(D)&&/⬇ A ACOPIO/.test(D),true);
  es('  totales: 20 a capa y 50 a acopio',/⬆ A CAPA[\s\S]*?>20<\/td>[\s\S]*?>0<\/td>[\s\S]*?>20<\/td>/.test(D)&&/⬇ A ACOPIO[\s\S]*?>40<\/td>[\s\S]*?>10<\/td>[\s\S]*?>50<\/td>/.test(D),true);
  es('  título AVANCE DE VIAJES',/>AVANCE DE VIAJES</.test(D),true);
  ctx.__cp.tipo='Reporte';
  es('  con Reporte: REPORTE DE VIAJES',/>REPORTE DE VIAJES</.test(ev('_avjDocHtml(__cp)')),true);
  es('  y el archivo se llama Reporte',/^Reporte de Viajes 2026-11-15/.test(ev('_avjNombreArchivo(__cp)')),true);
  ctx.__cp.destinos=[];
  es('sin reparto indicado no salen las filas',/A CAPA/.test(ev('_avjDocHtml(__cp)')),false);
  // Editar un corte guardado: vuelve el reparto y el tipo
  DB.avanceViajes=[{...ev('_avjCopia()'),id:777,tipo:'Reporte'}];
  ev('_avjEditar(777)');
  es('al editar vuelven el tipo y el reparto',ev('_avj.tipo+" · "+_avj.cols.map(c=>c.capa).join(",")'),'Reporte · 20,0');
  // Observación por tramo (debajo de A CAPA / A ACOPIO)
  ev('_avjPintarVol()');
  es('pantalla: fila de observación con un campo por tramo',/⬇ A ACOPIO[\s\S]*📝 OBSERVACIÓN[\s\S]*id="avjOb0"[\s\S]*id="avjOb1"/.test(nodos.avjVol.innerHTML),true);
  ev('_avjObs(1,"10 viajes a Test Fill");_avjCapa(1,"")');
  const Cn=ev('_avjCopia()');ctx.__cn=Cn;
  es('  se guarda con su ruta (aunque no tenga reparto)',JSON.stringify(Cn.destinos),'[{"origen":"C. Huantajalla","destino":"R3 - Dique Auxiliar","material":"COM","capa":20},{"origen":"A","destino":"B","material":"RCZ","obs":"10 viajes a Test Fill"}]');
  es('  y al leerlo cada ruta trae lo suyo',ev('_avjMatriz(__cn).cols.map(c=>c.capa+":"+c.obs).join(" | ")'),'20: | null:10 viajes a Test Fill');
  const Dn=ev('_avjDocHtml(__cn)');
  es('  PDF: fila OBS. después de A ACOPIO, bajo su columna',/⬇ A ACOPIO[\s\S]*>OBS\.<\/td>\s*<td[^>]*><\/td>\s*<td[^>]*>10 viajes a Test Fill<\/td>/.test(Dn),true);
  ctx.__cs={...Cn,destinos:[{origen:'A',destino:'B',material:'RCZ',obs:'Soporte'}]};
  es('  sale aunque no haya reparto',/>Soporte<\/td>/.test(ev('_avjDocHtml(__cs)'))&&!/A CAPA/.test(ev('_avjDocHtml(__cs)')),true);
  ctx.__cs={...Cn,destinos:[]};
  es('  sin observaciones no sale la fila',/>OBS\.</.test(ev('_avjDocHtml(__cs)')),false);
  DB.avanceViajes=[{...Cn,id:778}];
  ev('_avjEditar(778)');
  es('  al editar vuelve en su columna',ev('_avj.cols.map(c=>c.obs).join("|")'),'|10 viajes a Test Fill');
  ev('_avjNotaRecordar("Eliminación")');
  es('  historial: lo escrito y lo guardado, sin repetir',ev('_avjNotasHist().join(" | ")'),'Eliminación | 10 viajes a Test Fill');
  es('  y se ofrece al escribir',/<datalist id="avjDlNota">[\s\S]*Eliminación[\s\S]*10 viajes a Test Fill/.test(ev('_avjNotasDl()')),true);
  // Sin el SQL nuevo: se guarda igual, sin las columnas nuevas
  const filasAntes=filas.length;
  const supaViejo=ctx.supa;
  ctx.supa={...supaViejo,from:t=>t==='avance_motivos'?supaViejo.from(t):({...supaViejo.from(t),
    upsert:async f=>('tipo' in f||'destinos' in f)?{error:{message:"Could not find the 'destinos' column of 'avance_viajes'"}}:supaViejo.from(t).upsert(f)})};
  vm.runInContext('supa=globalThis.supa',ctx);
  avisos.length=0;
  await ev('_avjGuardar()');
  es('sin el SQL nuevo: guarda igual y avisa',filas.length>=filasAntes&&avisos.some(a=>/avance_viajes\.sql/.test(a)),true);
  ctx.supa=supaViejo;vm.runInContext('supa=globalThis.supa',ctx);
}

console.log('\n== Conexión ==');
const I=fs.readFileSync(R+'index.html','utf8'),U=fs.readFileSync(R+'js/utils.js','utf8'),C=fs.readFileSync(R+'js/config.js','utf8');
es('página y script en index.html',/id="page-avanceViajes"/.test(I)&&/js\/avanceViajes\.js\?v=\d+/.test(I),true);
es('después de parteTurno.js (usa su mapa)',I.indexOf('js/parteTurno.js')<I.indexOf('js/avanceViajes.js'),true);
es('ruta en utils.js',/avanceViajes:rAvanceViajes/.test(U),true);
es('en el menú de Control de Equipos',/key:'reporteEquipos'[^}]*\},\{key:'avanceViajes',label:'Avance de Viajes'/.test(C),true);

console.log('\n'+(mal?'✗ '+mal+' FALLAS':'OK todo bien')+'  ·  '+ok+'/'+(ok+mal));
process.exit(mal?1:0);
})().catch(e=>{console.error(e);process.exit(1);});
