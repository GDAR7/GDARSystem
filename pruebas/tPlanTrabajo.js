// Operaciones · 📋 Plan de Trabajo (diario o semanal): actividades con meta,
// equipos del Máster, personal y responsable, y las fotos aéreas con las
// zonas de cada actividad marcadas encima. Lo que importa: que la semana se
// tome de lunes a domingo, que las marcas queden pegadas a su actividad (y se
// borren con ella), que se guarde una fila por plan, que el PDF lleve la tabla
// agrupada por día y una hoja por foto, y que se pueda partir del plan anterior.
const fs=require('fs'),vm=require('vm');
const R='c:/Users/LENOVO/OneDrive/Documents/GitHub/GDARSystem/';
let ok=0,mal=0;
const es=(l,g,e)=>{const b=String(g)===String(e);b?ok++:mal++;
  console.log((b?'  OK  ':'  MAL ')+l.padEnd(62)+'= '+g+(b?'':'  (esperado '+e+')'));};

const DB={
  equipos:[
    {id:20,codigo:'VOL ECOP-002',sub:'Volquete',est:'Operativo'},
    {id:21,codigo:'VOL ECOP-001',sub:'Volquete',est:'Desmovilizado'},
    {id:5,codigo:'EXC-01',sub:'Excavadora',est:'Operativo'}
  ],
  personal:[{ape:'PEREZ',nom:'JUAN',est:'Activo'},{ape:'LOPEZ',nom:'ANA',est:'Cesado'}],
  frentesTrabajo:[{nombre:'R3 - Dique Auxiliar'}]
};
const nodos={};
const Nodo=id=>({id,innerHTML:'',textContent:'',value:'',style:{},firstElementChild:null,
  appendChild(){},remove(){},addEventListener(){},querySelector(){return null;},querySelectorAll(){return [];},scrollIntoView(){}});
const nodo=id=>nodos[id]||(nodos[id]=Nodo(id));
['page-planTrabajo','ptrForm','ptrActs','ptrFotos','ptrHist','ptrAviso'].forEach(nodo);
let filas=[],faltaTabla=false,avisos=[],confirma=true;
const supa={from:t=>({
  select:()=>({order:()=>({limit:async()=>faltaTabla?{data:null,error:{code:'PGRST205',message:t}}:{data:filas.slice(),error:null}})}),
  upsert:async f=>{filas=filas.filter(x=>x.id!==f.id);filas.push(JSON.parse(JSON.stringify(f)));return{error:null,tabla:t};},
  delete:()=>({eq:async(k,v)=>{filas=filas.filter(x=>x.id!==v);return{error:null};}})
}),storage:{from:()=>({upload:async()=>({error:null}),getPublicUrl:p=>({data:{publicUrl:'https://x/'+p}})})}};
let tablaUsada=null;
const supaEsp={...supa,from:t=>{tablaUsada=t;return supa.from(t);}};
const ctx=vm.createContext({DB,console,Date,Math,Number,String,Object,Array,JSON,Set,Map,isFinite,parseInt,parseFloat,Promise,setTimeout,clearTimeout,
  URL:{createObjectURL:()=>'blob:x',revokeObjectURL(){}},
  document:{getElementById:id=>nodos[id]||null,createElement:()=>Nodo('tmp'),body:{appendChild(){}},head:{appendChild(){}},
    addEventListener(){},removeEventListener(){},querySelector:()=>null,querySelectorAll:()=>[]},
  window:{innerWidth:1400},localStorage:(()=>{const m={};return{getItem:k=>k in m?m[k]:null,setItem:(k,v)=>{m[k]=String(v);}};})(),
  toast:(m,e)=>avisos.push(m),confirm:()=>confirma,today:()=>'2026-11-14',supa:supaEsp,
  CU:{nombre:'Abel Rodríguez A.',codigo:'EIBEL25'},EMPRESA:{logo:'img/logo.png'}});
vm.runInContext(fs.readFileSync(R+'js/parteTurno.js','utf8'),ctx,{filename:'parteTurno.js'});
vm.runInContext(fs.readFileSync(R+'js/planTrabajo.js','utf8'),ctx,{filename:'planTrabajo.js'});
const ev=s=>vm.runInContext(s,ctx);

(async()=>{
console.log('\n== Fechas ==');
es('sábado 14/11 → semana del lunes 09/11',ev('_ptrLunes("2026-11-14")'),'2026-11-09');
es('domingo 15/11 → lunes 09/11 (la semana termina en domingo)',ev('_ptrLunes("2026-11-15")'),'2026-11-09');
es('lunes → el mismo lunes',ev('_ptrLunes("2026-11-09")'),'2026-11-09');
es('cruza de mes',ev('_ptrSumar("2026-11-30",1)'),'2026-12-01');
es('semana de 7 días, lun a dom',ev('_ptrSemana("2026-11-12").map(d=>d.n+" "+d.iso.slice(8)).join(",")'),'Lun 09,Mar 10,Mié 11,Jue 12,Vie 13,Sáb 14,Dom 15');
es('periodo semanal',ev('_ptrPeriodo({tipo:"Semanal",fecha:"2026-11-11"})'),'Semana del 09/11/2026 al 15/11/2026');

console.log('\n== Plan nuevo y página ==');
ev('_ptr=null');ev('rPlanTrabajo()');
es('diario: por defecto para mañana',ev('_ptr.tipo+" "+_ptr.fecha'),'Diario 2026-11-15');
es('responsable: quien entra',ev('_ptr.responsable'),'Abel Rodríguez A.');
es('arranca con una actividad vacía',ev('_ptr.actividades.length'),1);
es('pinta el formulario',/＋ Actividad/.test(nodos.ptrForm.innerHTML)&&/Usar las fotos del plan anterior/.test(nodos.ptrForm.innerHTML),true);
ev('_ptrSet("tipo","Semanal")');
es('semanal: la fecha pasa al lunes',ev('_ptr.fecha'),'2026-11-09');
es('  muestra el rango de la semana',/Semana del 09\/11\/2026 al 15\/11\/2026/.test(nodos.ptrForm.innerHTML),true);
es('  cada actividad elige su día',/Toda la semana/.test(nodos.ptrActs.innerHTML)&&/Mié 11\/11/.test(nodos.ptrActs.innerHTML),true);
ev('_ptrSet("fecha","2026-11-19")');
es('  otra fecha de la semana: va a su lunes',ev('_ptr.fecha'),'2026-11-16');
ev('_ptrSet("tipo","Diario");_ptrSet("fecha","2026-11-15")');

console.log('\n== Actividades ==');
ev('_ptrAct(0,"frente","R3 - Dique Auxiliar",1);_ptrAct(0,"descripcion","Descarga de material capa 58",1);_ptrAct(0,"meta","40",1);_ptrAct(0,"unidad","viajes",1);_ptrAct(0,"personal","6",1)');
ev('_ptrActEq(0,20,true);_ptrActEq(0,5,true);_ptrActEq(0,5,false);_ptrActEq(0,5,true)');
es('equipos sin repetir',ev('JSON.stringify(_ptr.actividades[0].eqIds)'),'[20,5]');
ev('_ptrPintarActs()');
es('los equipos se ven como chips',/VOL ECOP-002/.test(nodos.ptrActs.innerHTML)&&/Cambiar \(2\)/.test(nodos.ptrActs.innerHTML),true);
es('el selector no ofrece desmovilizados',ev('_ptrEquipos().map(e=>e.codigo).join(",")'),'EXC-01,VOL ECOP-002');
es('responsables: solo personal activo',ev('_ptrPersonas().join("|")'),'PEREZ, JUAN');
ev('_ptrActAgregar();_ptrAct(1,"frente","C. Huantajalla",1);_ptrAct(1,"descripcion","Carguío",1)');
ev('_ptrActDuplicar(1)');
es('duplicar copia con otro uid',ev('_ptr.actividades.length+" · "+(_ptr.actividades[2].uid!==_ptr.actividades[1].uid)+" · "+_ptr.actividades[2].frente'),'3 · true · C. Huantajalla');

console.log('\n== Marcas sobre la foto ==');
ev('_ptr.fotos.push({url:"blob:f1",nombre:"dron1.jpg",nota:"",asp:4/3,marcas:[],file:{}})');
ev('_ptrMarcar(0)');
es('el editor abre con la herramienta zona y la 1ª actividad',ev('_ptrEd.tool+" · "+(_ptrEd.act===_ptr.actividades[0].uid)'),'zona · true');
ev('_ptrEdPunto({x:10,y:10});_ptrEdPunto({x:30,y:10});_ptrEdPunto({x:30,y:30})');
es('zona: 3 puntos pendientes, todavía sin cerrar',ev('_ptrEd.pend.length+" · "+_ptr.fotos[0].marcas.length'),'3 · 0');
ev('_ptrEdPunto({x:10.5,y:10.5})');
es('tocar cerca del primer punto cierra la zona',ev('_ptr.fotos[0].marcas.length+" · "+_ptr.fotos[0].marcas[0].tipo+" · "+_ptr.fotos[0].marcas[0].pts.length'),'1 · zona · 3');
ev('_ptrEdHerr("flecha");_ptrEdAct(_ptr.actividades[1].uid);_ptrEdPunto({x:50,y:50})');
es('flecha: el primer toque solo marca el inicio',ev('_ptr.fotos[0].marcas.length'),1);
ev('_ptrEdPunto({x:70,y:60})');
es('  el segundo la completa, de la actividad 2',ev('_ptr.fotos[0].marcas[1].tipo+" · "+(_ptr.fotos[0].marcas[1].act===_ptr.actividades[1].uid)'),'flecha · true');
ev('_ptrEdHerr("numero");_ptrEdPunto({x:80,y:20})');
es('número: un toque',ev('_ptr.fotos[0].marcas[2].tipo'),'numero');
// Íconos: trompo, carmix, plancha con operador, línea amarilla, volquetes…
es('paleta de íconos con los de obra y línea amarilla',['trompo','carmix','plancha','excavadora','volquete','rodillo','cargador','motoniveladora','tractor','retro'].every(k=>ev('_PTR_ICONOS').some(i=>i.k===k)),true);
// Las imágenes de la empresa (iconos-plan/) reemplazan al dibujo; existen en la carpeta
const conImg=ev('_PTR_ICONOS.filter(i=>i.img).map(i=>i.img)');
es('íconos con imagen propia: los 15 de la carpeta, y existen',conImg.length+' · '+conImg.every(p=>fs.existsSync(R+decodeURIComponent(p))),'15 · true');
es('  nombres con espacios y puntos van codificados',conImg.some(p=>/T\.%20Luminaria\.png$/.test(p)),true);
es('  el cono ya no se ofrece en la paleta',ev('_ptrIconosPaleta().some(i=>i.k==="senal")')+' · '+ev('_ptrIconosPaleta().length'),'false · 15');
es('  una marca vieja con cono se sigue viendo como cono',ev('_ptrIcono("senal").n'),'Señalización / cono');
es('  cisterna de combustible (nueva) se reconoce en el texto',ev('_ptrTiposDe("ABASTECIMIENTO CON CISTERNA DE COMBUSTIBLE Y CISTERNA DE AGUA").join(",")'),'combustible,cisterna');
es('  el volquete usa su PNG; el cono (sin imagen) sigue dibujado',/<img src="09\.-ERP\/Imagenes\/iconos-plan\/Volquete\.png"/.test(ev('_ptrIconoSvg("volquete",40)'))+' · '+/<svg/.test(ev('_ptrIconoSvg("senal",40)')),'true · true');
ev('_ptrEdIcono("carmix");_ptrEdPunto({x:40,y:40})');
es('ícono: un toque lo pone, con su actividad',ev('const m=_ptr.fotos[0].marcas[3];m.tipo+" · "+m.icono+" · "+(m.act===_ptr.actividades[1].uid)'),'icono · carmix · true');
const Mi=ev('_ptrMarcasHtml(_ptr.fotos[0],_ptr.actividades,{W:712})');
es('  se dibuja en un recuadro del color de la actividad, con su número',/border:2\.5px solid #2563eb[^>]*><span[^>]*><img src="09\.-ERP\/Imagenes\/iconos-plan\/Carmix\.png"/.test(Mi)&&/>2<\/span><\/div>/.test(Mi),true);
ev('_ptrEdHerr("borrar");_ptrEdPunto({x:40.5,y:40.5})');
es('  se borra con 🧽',ev('_ptr.fotos[0].marcas.some(m=>m.tipo==="icono")'),false);
ev('_ptrEdIcono("volquete");_ptrEdPunto({x:44,y:44});_ptrEdPunto({x:46,y:46})');
ctx.__fi={marcas:ev('_ptr.fotos[0].marcas.filter(m=>m.tipo==="icono")')};
es('  la leyenda dice cuántos de cada uno',/Volquete <b>×2<\/b>/.test(ev('_ptrLeyenda(__fi,_ptr.actividades)')),true);
ev('_ptr.fotos[0].marcas=_ptr.fotos[0].marcas.filter(m=>m.tipo!=="icono")');
ev('_ptrEdHerr("borrar");_ptrEdPunto({x:80.5,y:20.5})');
es('borrar: quita la marca tocada',ev('_ptr.fotos[0].marcas.map(m=>m.tipo).join(",")'),'zona,flecha');
ev('_ptrEdHerr("numero");_ptrEdPunto({x:5,y:5});_ptrEdDeshacer()');
es('deshacer quita la última',ev('_ptr.fotos[0].marcas.length'),2);
// ✋ Editar: elegir la zona, mover un punto, agregar y quitar puntos, moverla entera
ev('_ptrEdHerr("editar");_ptrEdPunto({x:22,y:15})');
es('editar: tocar dentro de la zona la elige',ev('_ptrEd.sel+" · "+_ptr.fotos[0].marcas[0].tipo'),'0 · zona');
es('  aparecen los puntos, los ＋ y el ✥',(()=>{const h=ev('_ptrEdAsas(_ptr.fotos[0])');return (h.match(/_ptrEdAsaDown\(event,\d\)/g)||[]).length+' puntos · '+(h.match(/_ptrEdMedioDown/g)||[]).length+' ＋ · '+/_ptrEdAsaDown\(event,-1\)/.test(h);})(),'3 puntos · 3 ＋ · true');
ev('_ptrEdGuardarHist();_ptrEdMoverPunto(1,5,-5,_ptrEdSel().pts.map(p=>({...p})))');
es('  mover un punto',ev('JSON.stringify(_ptr.fotos[0].marcas[0].pts[1])'),'{"x":35,"y":5}');
ev('_ptrEdDeshacer()');
es('  deshacer lo devuelve',ev('JSON.stringify(_ptr.fotos[0].marcas[0].pts[1])'),'{"x":30,"y":10}');
ev('_ptrEdAgregarPunto(0)');
es('  ＋ agrega un punto en la mitad del lado',ev('_ptr.fotos[0].marcas[0].pts.length+" · "+JSON.stringify(_ptr.fotos[0].marcas[0].pts[1])'),'4 · {"x":20,"y":10}');
es('  quitar un punto',ev('_ptrEdQuitarPunto(1)')+' · '+ev('_ptr.fotos[0].marcas[0].pts.length'),'true · 3');
avisos=[];
es('  una zona no queda con menos de 3 puntos',ev('_ptrEdQuitarPunto(0)')+' · '+avisos.some(a=>/al menos 3/.test(a)),'false · true');
ev('_ptrEdMoverPunto(-1,10,10,_ptrEdSel().pts.map(p=>({...p})))');
es('  ✥ mueve toda la zona',ev('_ptr.fotos[0].marcas[0].pts.map(p=>p.x+","+p.y).join(" ")'),'20,20 40,20 40,40');
ev('_ptrEdAct(_ptr.actividades[1].uid)');
es('  tocar otra actividad cambia la de la marca',ev('_ptr.fotos[0].marcas[0].act===_ptr.actividades[1].uid'),true);
ev('_ptrEdDeshacer();_ptrEdMoverPunto(-1,-10,-10,_ptrEdSel().pts.map(p=>({...p})))');
es('  y se puede deshacer',ev('_ptr.fotos[0].marcas[0].act===_ptr.actividades[0].uid'),true);
ev('_ptrEdPunto({x:90,y:90})');
es('  tocar fuera la suelta',ev('_ptrEd.sel'),null);
ev('_ptrEdCerrar(true)');
ev('_ptrMarcar(0);_ptrEdHerr("numero");_ptrEdPunto({x:60,y:80});_ptrEdCerrar(false)');
es('«Descartar cambios» deja las marcas como estaban',ev('_ptr.fotos[0].marcas.length'),2);
const M=ev('_ptrMarcasHtml(_ptr.fotos[0],_ptr.actividades,{W:712})');
es('dibujo: zona sombreada del color de la actividad 1',/<polygon points="[^"]+" fill="#e11d48" fill-opacity="\.3"/.test(M),true);
es('  flecha con punta del color de la actividad 2',/<line[^>]+stroke="#2563eb"/.test(M)&&/<polygon points="[^"]+" fill="#2563eb"/.test(M),true);
es('  número en el centro de la zona',/left:23\.33%;top:16\.67%[^>]*>1<\/div>/.test(M),true);
es('  número al inicio de la flecha',/left:50\.00%;top:50\.00%[^>]*>2<\/div>/.test(M),true);
es('  mismo trazo a lo ancho y a lo alto (viewBox con la proporción)',/viewBox="0 0 100 75\.00"/.test(M)&&/width="712" height="534\.0"/.test(M),true);
ev('_ptrPintarFotos()');
es('la miniatura muestra las marcas y cuántas son',/Marcar \(2\)/.test(nodos.ptrFotos.innerHTML)&&/<polygon/.test(nodos.ptrFotos.innerHTML),true);
// Quitar la actividad 2 borra su flecha
ev('_ptrActQuitar(1)');
es('quitar una actividad borra sus marcas',ev('_ptr.fotos[0].marcas.map(m=>m.tipo).join(",")'),'zona');
es('  las demás se renumeran solas',ev('_ptr.actividades.map((a,i)=>i+1+":"+a.frente).join(" ")'),'1:R3 - Dique Auxiliar 2:C. Huantajalla');

// 🗺️ Plano general: la imagen aérea del proyecto, primera y sin subirla
ev('_ptrPlanoGeneral()');
es('plano general: va primero, con la imagen del proyecto',ev('_ptr.fotos[0].url+" · "+_ptr.fotos[0].asp+" · "+!_ptr.fotos[0].file'),'09.-ERP/Imagenes/R3_2026_IMAGEN.png · 1.649 · true');
ev('_ptrPlanoGeneral()');
es('  no se repite',ev('_ptr.fotos.filter(f=>f.general).length'),1);
ev('_ptr.fotos.shift()');

console.log('\n== Lo que se guarda ==');
const C=ev('_ptrCopia()');
es('equipos: ids y códigos (el PDF no depende del Máster)',JSON.stringify(C.actividades[0].equipos),'["VOL ECOP-002","EXC-01"]');
es('meta y personal como números',C.actividades[0].meta+' · '+C.actividades[0].personal,'40 · 6');
es('la foto sin subir va marcada como local',C.fotos[0].local,1);
ev('_ptrSet("tipo","Semanal",1);_ptr.fecha="2026-11-09";_ptr.actividades[0].dia="2026-11-11";_ptr.actividades[1].dia="2026-12-25"');
const C2=ev('_ptrCopia()');
es('semanal: día dentro de la semana se queda',C2.actividades[0].dia,'2026-11-11');
es('  día fuera de la semana: pasa a «toda la semana»',C2.actividades[1].dia,'');
ev('_ptr.tipo="Diario";_ptr.fecha="2026-11-15";_ptr.actividades.forEach(a=>a.dia="")');

console.log('\n== Guardar ==');
faltaTabla=true;ev('_ptrListo=null');avisos=[];
await ev('_ptrGuardar()');
es('sin la tabla: no guarda y dice qué SQL falta',filas.length===0&&avisos.some(a=>/sql\/plan_trabajo\.sql/.test(a)),true);
faltaTabla=false;ev('_ptrListo=null');avisos=[];
ev('_ptrActAgregar()');      // una vacía: no se guarda
await ev('_ptrGuardar()');
es('guarda una fila en plan_trabajo',filas.length+' · '+tablaUsada,'1 · plan_trabajo');
const F=filas[0];
es('  con sus columnas',[F.tipo,F.fecha,F.turno,F.autor].join(' · '),'Diario · 2026-11-15 · Día · Abel Rodríguez A.');
es('  la actividad vacía no se guarda',F.actividades.length,2);
es('  la foto subida con su url y sus marcas',F.fotos.length+' · '+/^https:\/\/x\/plan-trabajo\//.test(F.fotos[0].url)+' · '+F.fotos[0].marcas.length,'1 · true · 1');
es('  el formulario queda listo para el siguiente',ev('_ptr.id+" · "+_ptr.fotos.length'),'null · 0');
es('  aparece en el historial',/Planes guardados/.test(nodos.ptrHist.innerHTML)&&/2026|15\/11/.test(nodos.ptrHist.innerHTML),true);

console.log('\n== Documento ==');
const rec=ev('DB.planTrabajo[0]');ctx.__rec=rec;
let D=ev('_ptrDocHtml(__rec)');
es('título y fecha',/PLAN DE TRABAJO DIARIO/.test(D)&&/domingo 15 de noviembre de 2026/.test(D),true);
es('tarjetas: frentes, actividades, equipos, personal, restricciones',/>Frentes<\/div>[\s\S]*?>2<\/div>/.test(D)&&/>Equipos<\/div>[\s\S]*?>2<\/div>/.test(D)&&/>Personal<\/div>[\s\S]*?>6<\/div>/.test(D)&&/>Restricciones<\/div>[\s\S]*?>0<\/div>/.test(D),true);
es('agrupado por frente (franja con el nombre)',/▸ R3 - Dique Auxiliar/.test(D)&&/▸ C\. Huantajalla/.test(D),true);
es('tabla con meta y equipos',/40 viajes/.test(D)&&/VOL ECOP-002, EXC-01/.test(D),true);
es('en pantalla: la foto con su leyenda',/Zonas de trabajo · Foto 1 de 1/.test(D)&&/Descarga de material capa 58/.test(D.split('Zonas de trabajo · Foto')[1]),true);
const Ds=ev('_ptrDocHtml(__rec,{sinFotos:true})');
es('en el PDF: la hoja del plan avisa que las fotos siguen',/en las hojas siguientes/.test(Ds)&&!/<img src="https:\/\/x/.test(Ds),true);
es('  una hoja por foto',ev('_ptrHojasFotos(__rec).length'),1);
es('  la hoja de la foto lleva marcas y leyenda',/ZONAS DE TRABAJO/.test(ev('_ptrHojasFotos(__rec)[0]'))&&/<polygon/.test(ev('_ptrHojasFotos(__rec)[0]')),true);
es('los títulos van pegados a lo que sigue (no quedan solos al pie)',/data-pt-tit/.test(D),true);
// Semanal: agrupado por día
ctx.__sem={tipo:'Semanal',fecha:'2026-11-09',turno:'Día y Noche',actividades:[
  {uid:'a',dia:'2026-11-11',frente:'F1',descripcion:'x'},{uid:'b',dia:'',frente:'F2',descripcion:'y'},{uid:'c',dia:'2026-11-09',frente:'F3',descripcion:'z'}],fotos:[]};
D=ev('_ptrDocHtml(__sem)');
es('semanal: título y rango',/PLAN DE TRABAJO SEMANAL/.test(D)&&/Semana del 09\/11\/2026 al 15\/11\/2026/.test(D),true);
const pos=['Toda la semana','Lun 09/11','Mié 11/11'].map(t=>D.indexOf(t));
es('  agrupado por día, en orden (primero toda la semana)',pos.every(p=>p>0)&&pos[0]<pos[1]&&pos[1]<pos[2],true);
es('  la numeración sigue el orden de carga',/▸ F3<\/td><\/tr><tr>\s*<td[^>]*><span[^>]*>3<\/span>/.test(D),true);
es('  columnas vacías no salen (sin meta, equipos, personal ni responsable)',/>Meta<\/th>|>Equipos<\/th>|>Pers\.<\/th>|>Responsable<\/th>|>Sector<\/th>/.test(D),false);

console.log('\n== Guardia, sector, material, restricciones y nota ==');
ctx.__g={...ctx.__sem,tipo:'Diario',fecha:'2026-11-15',turno:'Día',guardia:'B',nota:'Sujeto a cambios del Sponsor.',
  actividades:[{uid:'a',frente:'R3 - Dique intermedio',sector:'Estribo derecho',material:'Concreto',descripcion:'Vaciado',tipos:['retro','excavadora']}],
  restricciones:[{codigo:'FO',descripcion:'Tractor #1 sin operador',eqIds:[5]}]};
D=ev('_ptrDocHtml(__g)');
es('guardia en el turno',/Turno Día · Guardia B/.test(D),true);
es('columnas sector y material',/>Sector<\/th>/.test(D)&&/>Estribo derecho</.test(D)&&/>Material<\/th>/.test(D),true);
es('equipos por tipo, sin código',/Retroexcavadora, Excavadora/.test(D),true);
es('restricciones con su código y equipo',/>FO<\/span>/.test(D)&&/Falta de operador/.test(D)&&/>EXC-01</.test(D)&&/Tractor #1 sin operador/.test(D),true);
es('nota al pie',/NOTA:<\/b> Sujeto a cambios del Sponsor\./.test(D),true);
es('nombre del archivo con guardia',ev('_ptrNombreArchivo(__g)'),'Plan de Trabajo 2026-11-15 Día Guardia B.pdf');
ev('_ptr=_ptrNuevo();_ptrSet("nota","Mi nota fija",1)');
es('la nota fija se recuerda para el siguiente plan',ev('_ptrNuevo().nota'),'Mi nota fija');

console.log('\n== Pegar desde WhatsApp ==');
ctx.__txt=`PLAN DE TRABAJO TURNO DIA GUARDIA B
15/11/2026
*DIQUE INTERMEDIO
ESTRIBO DERECHO; PREPARACION DE CONCRETO Y VACEADO DE CONCRETO EN GRIETAS #95 Y # 96. CON PERSONAL DE PISO Y APOYO DE EQUIPO RETROEXCAVADORA Y EXCAVADORA.
ESTRIBO IZQUIERDO
CONTINUAR LOS TRABAJOS EN CAPA#4 PARA SU LIBERACION RESPECTIVA.
** DIQUE AUXILIAR
SEGUIR CON LOS TRABAJOS EN CAPA 58.
AGUAS ABAJO CONTRAFUERTE SEGUIR CON LOS TRABAJOS CON LA CAPA#12.
* HUANTAJALLA
CARGUIO DE MATERIAL COMUN (COM) CON VOLQUETES Y EXCAVADORA.
SARANDEO DE MATERIAL CON CF.Y ZARANDA.
** MEZA DE PLÀTA
SE TIENE AREA LIBERADA DE MARERIAL TIPO 2 PARA SU CARGUIO.
NOTA: EL PLAN DE TRABAJO QUE SE HACE ESTA A CUALQUIER CAMBIO.
RESTRICCIONES :
TRACTOR #1 EN HUANTAJALLA SIN OP. POR MOTIVO DE SALUD.`;
DB.frentesTrabajo=[{nombre:'R3 - Dique intermedio'},{nombre:'R3 - Dique Auxiliar'},{nombre:'C. Huantajalla'},{nombre:'Mesa de plata'}];
const P=ev('_ptrDesdeTexto(__txt)');
es('cabecera: turno, guardia y fecha',P.turno+' · '+P.guardia+' · '+P.fecha,'Día · B · 2026-11-15');
es('frentes con el nombre del Máster (MEZA DE PLÀTA → Mesa de plata)',[...new Set(P.actividades.map(a=>a.frente))].join(' | '),'R3 - Dique intermedio | R3 - Dique Auxiliar | C. Huantajalla | Mesa de plata');
es('7 actividades (una por línea)',P.actividades.length,7);
es('sector al inicio con «;»',P.actividades[0].sector+' · '+P.actividades[0].descripcion.slice(0,11),'Estribo derecho · PREPARACION');
es('sector en su propia línea vale para la siguiente',P.actividades[1].sector,'Estribo izquierdo');
es('el sector no pasa al otro frente',P.actividades[2].sector,'');
es('sector compuesto',P.actividades[3].sector,'Aguas abajo contrafuerte');
es('equipos reconocidos (retro antes que excavadora)',P.actividades[0].tipos.join(','),'retro,excavadora,personal');
es('CF = cargador frontal, zaranda',P.actividades[5].tipos.join(','),'cargador,zaranda');
es('material: (COM), Tipo 2, concreto',[P.actividades[4].material,P.actividades[6].material,P.actividades[0].material].join(','),'COM,Tipo 2,Concreto');
es('nota (aunque diga «plan de trabajo»)',P.nota,'EL PLAN DE TRABAJO QUE SE HACE ESTA A CUALQUIER CAMBIO.');
es('restricción: falta de operador',P.restricciones.length+' · '+P.restricciones[0].codigo,'1 · FO');
ev('_ptr=_ptrNuevo()');confirma=true;
ev('_ptrPegarUsar(__txt)');
es('«Armar el plan» llena el formulario',ev('_ptr.fecha+" · "+_ptr.turno+" · "+_ptr.guardia+" · "+_ptr.actividades.length+" · "+_ptr.restricciones.length'),'2026-11-15 · Día · B · 7 · 1');
es('nombre del archivo',ev('_ptrNombreArchivo(__sem)'),'Plan de Trabajo Semanal 2026-11-09 Día y Noche.pdf');

console.log('\n== Partir del plan anterior ==');
ev('_ptrBase(__rec.id)');
es('base: el día siguiente, sin id',ev('_ptr.fecha+" · "+_ptr.id'),'2026-11-16 · null');
es('  mismas actividades y fotos con marcas',ev('_ptr.actividades.length+" · "+_ptr.fotos.length+" · "+_ptr.fotos[0].marcas.length'),'2 · 1 · 1');
es('  las marcas siguen apuntando a su actividad',ev('_ptr.fotos[0].marcas[0].act===_ptr.actividades[0].uid'),true);
ctx.__s2={...ctx.__sem,id:9};DB.planTrabajo.push(ctx.__s2);
ev('_ptrBase(9)');
es('base semanal: la semana siguiente y los días corridos 7',ev('_ptr.fecha+" · "+_ptr.actividades[0].dia'),'2026-11-16 · 2026-11-18');
DB.planTrabajo.pop();
// Traer solo las fotos a un plan nuevo
ev('_ptr=_ptrNuevo()');confirma=true;
ev('_ptrFotosAnterior()');
es('fotos del plan anterior: llegan sin volver a subirlas',ev('_ptr.fotos.length+" · "+/^https:/.test(_ptr.fotos[0].url)+" · "+!_ptr.fotos[0].file'),'1 · true · true');
es('  con sus marcas trae también su actividad',ev('_ptr.actividades.length+" · "+_ptr.actividades[0].frente'),'1 · R3 - Dique Auxiliar');
ev('_ptrFotosAnterior()');
es('  no las repite',ev('_ptr.fotos.length'),1);
ev('_ptr=_ptrNuevo()');confirma=false;ev('_ptrFotosAnterior()');
es('  o limpias, sin marcas',ev('_ptr.fotos[0].marcas.length+" · "+_ptr.actividades.length'),'0 · 1');

console.log('\n== Eliminar ==');
confirma=true;await ev('_ptrEliminar(__rec.id)');
es('con confirmación se borra',filas.length+' · '+ev('DB.planTrabajo.length'),'0 · 0');

console.log('\n== Conexión ==');
const I=fs.readFileSync(R+'index.html','utf8'),U=fs.readFileSync(R+'js/utils.js','utf8'),Cf=fs.readFileSync(R+'js/config.js','utf8');
es('página y script en index.html',/id="page-planTrabajo"/.test(I)&&/js\/planTrabajo\.js\?v=\d+/.test(I),true);
es('después de parteTurno.js (usa sus librerías y su paginado)',I.indexOf('js/parteTurno.js')<I.indexOf('js/planTrabajo.js'),true);
es('ruta en utils.js',/planTrabajo:rPlanTrabajo/.test(U),true);
es('en el menú de Operaciones, después del Parte de Turno',/key:'parteTurno'[^}]*\},\{key:'planTrabajo',label:'Plan de Trabajo'/.test(Cf),true);
es('SQL de la tabla',fs.existsSync(R+'sql/plan_trabajo.sql'),true);

console.log('\n'+(mal?'✗ '+mal+' FALLAS':'OK todo bien')+'  ·  '+ok+'/'+(ok+mal));
process.exit(mal?1:0);
})().catch(e=>{console.error(e);process.exit(1);});
