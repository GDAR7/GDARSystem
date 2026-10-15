// RR.HH. · Roster de Guardias · pestaña 🚐 Transporte.
// Verifica si la flota de cada turno alcanza para la gente que el Roster
// programa: día = TD + DLT + A5, noche = TN. Obreros primero en coaster,
// staff primero en camioneta. No guarda nada en Supabase.
const fs=require('fs'),vm=require('vm');
const R='c:/Users/LENOVO/OneDrive/Documents/GitHub/GDARSystem/';
let ok=0,mal=0;
const es=(l,g,e)=>{const b=String(g)===String(e);b?ok++:mal++;
  console.log((b?'  OK  ':'  MAL ')+l.padEnd(62)+'= '+g+(b?'':'  (esperado '+e+')'));};

// Guardia A en turno día fijo desde el 2026-10-01, guardia B en noche fijo.
// Ciclo 14 trabajando + 7 descansando: del 15 al 21/10 descansan las dos.
const personal=[];
let id=1;
const alta=(n,guardia,tipo,extra)=>{for(let i=0;i<n;i++)personal.push({id:id++,ape:'P'+id,nom:'X',est:'Activo',guardia,tipo,...(extra||{})});};
alta(40,'A','Obrero'); alta(8,'A','Staff');
alta(10,'B','Obrero'); alta(3,'B','Staff');
alta(5,'A','Obrero',{est:'Cesado'});          // no cuentan
alta(4,null,'Obrero');                        // sin guardia: no cuentan
const DB={personal,
  rosterConfig:[{id:1,guardia:'A',fechaInicio:'2026-10-01',turno:'DIA',activo:true},
                {id:2,guardia:'B',fechaInicio:'2026-10-01',turno:'NOCHE',activo:true}],
  personalRosterCfg:[],
  rosterOvr:[
    {id:1,personalId:1,fecha:'2026-10-14',tipo:'DLT'},     // sigue en día
    {id:2,personalId:2,fecha:'2026-10-14',tipo:'A5'},      // sigue en día
    {id:3,personalId:3,fecha:'2026-10-14',tipo:'TN'},      // pasa a noche
    {id:4,personalId:4,fecha:'2026-10-14T00:00:00+00:00',tipo:'F'}  // falta: no sube
  ]};

const nodos={};
const Nodo=id=>({id,innerHTML:'',textContent:'',value:'',style:{},
  appendChild(){},remove(){},addEventListener(){},querySelector(){return null;},querySelectorAll(){return [];}});
const nodo=id=>nodos[id]||(nodos[id]=Nodo(id));
let mem={},ventana=null,supaUsado=false;
const ctx=vm.createContext({
  DB,console,Date,Math,Number,String,Object,Array,JSON,Set,Map,isFinite,parseInt,parseFloat,Promise,setTimeout,clearTimeout,
  document:{getElementById:nodo,createElement:()=>Nodo('tmp'),addEventListener(){},querySelector:()=>null,querySelectorAll:()=>[],body:{appendChild(){}}},
  window:{location:{href:'https://ecosermo.gdarei.com/index.html'},open:()=>(ventana={html:'',document:{write(h){ventana.html+=h;},close(){}},focus(){},print(){}}),innerWidth:1400,innerHeight:900},
  localStorage:{getItem:k=>k in mem?mem[k]:null,setItem:(k,v)=>{mem[k]=String(v);},removeItem:k=>{delete mem[k];}},
  toast:()=>{},today:()=>'2026-10-14',
  supa:{from(){supaUsado=true;return {select:async()=>({data:[]}),upsert:async()=>({})};}},
  EMPRESA:{nombre:'ECOSERMO',logo:'img/logo.png'},
  nid:()=>1,syncSheet(){},supaUpsert:async()=>null,supaDelete:async()=>{},confirm:()=>true
});
ctx.window.open=ctx.window.open;
vm.runInContext(fs.readFileSync(R+'js/personal.js','utf8'),ctx,{filename:'personal.js'});
vm.runInContext(fs.readFileSync(R+'js/rosterTransporte.js','utf8'),ctx,{filename:'rosterTransporte.js'});
const ev=x=>vm.runInContext(x,ctx);
ev('_rosterNormOvr()');

console.log('\n== Plazas de la flota ==');
es('coaster de 24 con conductor aparte: 24 pax',ev('_rtPlazas({coN:2,coAsientos:24,coConductor:false,caN:0,caAsientos:5}).coCap'),48);
es('camioneta de 5 con conductor: 4 pax',ev('_rtPlazas({coN:0,caN:3,caAsientos:5,caConductor:true}).caCap'),12);
es('reserva del 10% se descuenta por unidad',ev('_rtPlazas({coN:1,coAsientos:24,coConductor:false,caN:0,reserva:10}).coUtil'),21);
es('la reserva no pasa del 30%',ev('_rtPlazas({coN:1,coAsientos:10,caN:0,reserva:90}).coUtil'),7);

console.log('\n== Reparto obreros / staff ==');
let a=ev('_rtAsignar(40,8,_rtPlazas({coN:2,coAsientos:24,coConductor:false,caN:2,caAsientos:5,caConductor:true}))');
es('obreros en coaster, staff en camioneta',a.obrCo+'/'+a.stfCa+' · '+a.stfCo+'/'+a.obrCa,'40/8 · 0/0');
es('  alcanza y sobran',a.falta+' faltan · holgura '+a.holgura,'0 faltan · holgura 8');
es('  unidades en uso',a.coUsadas+' coaster · '+a.caUsadas+' camionetas',"2 coaster · 2 camionetas");
a=ev('_rtAsignar(40,12,_rtPlazas({coN:2,coAsientos:24,coConductor:false,caN:2,caAsientos:5,caConductor:true}))');
es('staff que no entra en camioneta pasa a la coaster',a.stfCa+' en camioneta · '+a.stfCo+' en coaster',"8 en camioneta · 4 en coaster");
es('  sin déficit',a.falta,0);
a=ev('_rtAsignar(55,2,_rtPlazas({coN:2,coAsientos:24,coConductor:false,caN:2,caAsientos:5,caConductor:true}))');
es('obreros que no entran en coaster pasan a camioneta',a.obrCo+' coaster · '+a.obrCa+' camioneta',"48 coaster · 6 camioneta");
es('  y lo que no entra es déficit',a.falta,1);
es('sin flota todo es déficit',ev('_rtAsignar(5,1,_rtPlazas({coN:0,caN:0})).falta'),6);
es('sin personas no hay división por cero',ev('_rtAsignar(0,0,_rtPlazas({coN:0,caN:0})).ocup'),0);

console.log('\n== Personas por día, desde el Roster ==');
let g=ev('_rtPersonasDia("2026-10-13")');
es('día normal: guardia A en día',g.dia.obr+' ob · '+g.dia.stf+' st','40 ob · 8 st');
es('  guardia B en noche',g.noche.obr+' ob · '+g.noche.stf+' st','10 ob · 3 st');
es('no cuentan cesados ni personal sin guardia',g.dia.obr+g.noche.obr+g.dia.stf+g.noche.stf,61);
g=ev('_rtPersonasDia("2026-10-14")');
es('DLT y A5 cuentan en turno día; TN cambiado pasa a noche; F no sube',g.dia.obr+' día · '+g.noche.obr+' noche','38 día · 11 noche');
es('el día cambiado se lee aunque la fecha venga con hora',ev('_rtTipoDe(DB.personal[3],"2026-10-14")'),'F');
g=ev('_rtPersonasDia("2026-10-16")');
es('en el descanso del ciclo no sube nadie',g.dia.obr+g.noche.obr,0);
ev('DB.personalRosterCfg.push({id:9,personalId:5,turno:"NOCHE"})');
g=ev('_rtPersonasDia("2026-10-13")');
es('el turno individual se respeta (uno de A pasa a noche)',g.dia.obr+' día · '+g.noche.obr+' noche','39 día · 11 noche');
ev('DB.personalRosterCfg.length=0');

console.log('\n== La pestaña ==');
ev('_rosterInicioVista="2026-10-12"');
ev('rRosterTransporte()');
const H=nodo('rtBody').innerHTML;
const K=nodo('rtCalculo').innerHTML;
es('flota de turno día y de turno noche por separado',/☀ Turno Día/.test(H)&&/🌙 Turno Noche/.test(H)&&/_rtSet\('NOCHE','coN'/.test(H),true);
es('coaster y camioneta en cada turno',(H.match(/<b style="color:#14b8a6">Coaster<\/b>/g)||[]).length+' · '+(H.match(/>Camioneta<\/b>/g)||[]).length,'2 · 2');
es('botón Exportar PDF',/_rtPdf\(\)/.test(H),true);
es('sigue el período del Cronograma (35 días)',(K.match(/onclick="_rtElegir\(/g)||[]).length,35);
es('6 KPI con borde de su color en los 4 lados',(K.match(/class="rt-kpi" style="border:1px solid #[0-9a-f]{6};border-top:3px solid #[0-9a-f]{6}"/g)||[]).length,6);
es('el día elegido arranca en hoy',/class="rt-sel rt-hoy "/.test(K),true);
es('mapa de asientos de ese día, día y noche',/Asientos del día elegido/.test(K)&&/rt-mapa-t/.test(K),true);
es('ninguna celda rota',/undefined|NaN/.test(H+K),false);

console.log('\n== Con la flota por defecto (3+3 día, 1+1 noche) ==');
const C=ev('_rtCalcular(_rtDias())');
es('capacidad día: 3×24 + 3×4',C.PD.total,84);
es('capacidad noche: 1×24 + 1×4',C.PN.total,28);
es('pico de día',C.dia.pico,48);
es('noche: el 14/10 suben 11 obreros + 3 staff',C.filas.find(f=>f.fecha==='2026-10-14').noche.pers,14);

console.log('\n== Cambiar la flota ==');
ev('_rtSet("NOCHE","coN","0")');
const C2=ev('_rtCalcular(_rtDias())');
es('sin coaster de noche, la noche no alcanza',C2.noche.fallan>0,true);
es('  el chip lo dice',/Faltan \d+/.test(nodo('rtCalculo').innerHTML),true);
es('  y propone unidades adicionales',/harían falta/.test(nodo('rtCalculo').innerHTML)||C2.filas.every(f=>f.fecha!==ev('_rtSel')||!f.noche.falta),true);
es('el total del panel se actualiza sin redibujar los campos',nodo('rtTotNOCHE').textContent,'4 plazas');
es('un valor negativo o basura queda en 0',(ev('_rtSet("DIA","caN","-3")'),ev('_rtFlota.DIA.caN')),0);
es('se recuerda en el navegador',JSON.parse(mem.gdar_rt_flota).NOCHE.coN,0);
ev('_rtFlota={DIA:{..._RT_DEF.DIA},NOCHE:{..._RT_DEF.NOCHE}};_rtLeerFlota()');
es('  y vuelve al abrir',ev('_rtFlota.NOCHE.coN+" · "+_rtFlota.DIA.caN'),'0 · 0');
mem.gdar_rt_flota='{basura';
ev('_rtFlota={DIA:{..._RT_DEF.DIA},NOCHE:{..._RT_DEF.NOCHE}};_rtLeerFlota()');
es('  lo guardado dañado no rompe: valores por defecto',ev('_rtFlota.NOCHE.coN'),1);
es('NO usa Supabase',supaUsado,false);

console.log('\n== Navegar y elegir día ==');
ev('_rtElegir("2026-10-20")');
es('tocar un día lo muestra en el mapa',/20\/10 · MA/.test(nodo('rtCalculo').innerHTML),true);
ev('_rtNavegar(7)');
es('la semana siguiente mueve también el Cronograma',ev('_rosterInicioVista'),'2026-10-19');
ev('_rtNavegar(-7)');
es('y vuelve',ev('_rosterInicioVista'),'2026-10-12');

console.log('\n== PDF ==');
ev('_rtElegir("2026-10-14");_rtPdf()');
const P=ventana&&ventana.html||'';
es('abre la hoja para imprimir o guardar como PDF',/CAPACIDAD DE TRANSPORTE DE PERSONAL/.test(P),true);
es('  A4 horizontal',/size:A4 landscape/.test(P),true);
es('  la flota de cada turno',/TURNO DÍA · TD \+ DLT \+ A5/.test(P)&&/TURNO NOCHE · TN/.test(P),true);
es('  una fila por día',(P.match(/<tr style="background:/g)||[]).length,35);
es('  la distribución del día elegido',/Distribución del 14\/10/.test(P)&&/Coaster 01: <b>/.test(P),true);
es('  sin celdas rotas',/undefined|NaN/.test(P),false);

console.log('\n== Conexión con el Roster ==');
const IX=fs.readFileSync(R+'index.html','utf8');
const posFb=IX.indexOf('rosterTabBtn-fbnv'), posTr=IX.indexOf('rosterTabBtn-trans');
es('la pestaña va al lado de Guardias FBNV',posTr>posFb&&posTr-posFb<600,true);
es('el script carga después de personal.js',IX.indexOf('<script src="js/rosterTransporte.js')>IX.indexOf('<script src="js/personal.js'),true);
ev('_rosterTab("trans")');
es('_rosterTab muestra Transporte y oculta lo demás',nodo('rtBody').style.display+'|'+nodo('rosterBody').style.display+'|'+nodo('gdRosBody').style.display,'|none|none');
es('  y marca su botón',nodo('rosterTabBtn-trans').style.color,'#fff');
es('una pestaña desconocida vuelve al Cronograma',(ev('_rosterTab("zzz")'),ev('_rosterTabAct')),'grid');
es('no existe SQL de transporte (no se guarda en Supabase)',fs.existsSync(R+'sql/transporte_flota.sql'),false);

console.log('\n'+(mal?'✗ '+mal+' FALLAS':'OK todo bien')+'  ·  '+ok+'/'+(ok+mal));
process.exit(mal?1:0);
