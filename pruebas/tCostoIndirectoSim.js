// Costo Indirecto · Simular desde el tareo. Se ejecutan hhVentaPeriodo (tal
// como está en hhVenta.js), costoIndirecto.js y costoIndirectoSim.js con un
// tareo armado a mano, y se comprueba la cantidad que sale para cada partida.
const fs=require('fs'),vm=require('vm');
const R='c:/Users/LENOVO/OneDrive/Documents/GitHub/GDARSystem/';
let ok=0,mal=0;
const es=(l,g,e)=>{const b=String(g)===String(e);b?ok++:mal++;
  console.log((b?'  OK  ':'  MAL ')+l.padEnd(62)+'= '+g+(b?'':'  (esperado '+e+')'));};

const P='EPY-004-26';
// ── Presupuesto de prueba ───────────────────────────────────────────────────
const presup=[
  {id:1,proyecto:P,item:'1',desc:'PERSONAL',unidad:'',cantidad:'',precioUnit:'',total:''},
  {id:2,proyecto:P,item:'1.01',desc:'OPERACIÓN',unidad:'',cantidad:'',precioUnit:'',total:''},
  {id:3,proyecto:P,item:'1.01.01',desc:'Ingeniero Residente',unidad:'mes',cantidad:1,precioUnit:20128,total:160426.25,cargos:[]},
  {id:4,proyecto:P,item:'1.01.02',desc:'Ingeniero Supervisor',unidad:'mes',cantidad:3,precioUnit:16885,total:319126.5,cargos:[]},
  {id:5,proyecto:P,item:'1.01.03',desc:'Supervisor técnico',unidad:'mes',cantidad:3,precioUnit:10219.8,total:193154.22,cargos:[]},
  {id:6,proyecto:P,item:'1.02',desc:'AUXILIARES',unidad:'',cantidad:'',precioUnit:'',total:''},
  {id:7,proyecto:P,item:'1.02.01',desc:'Guardian',unidad:'mes',cantidad:2,precioUnit:5661,total:70196.4,cargos:[]},
  {id:8,proyecto:P,item:'1.02.02',desc:'Ayud. Mecánicos',unidad:'mes',cantidad:3,precioUnit:8806,total:163791.6,cargos:[]},
  {id:9,proyecto:P,item:'1.02.03',desc:'Mecánicos',unidad:'mes',cantidad:6,precioUnit:15096,total:561571.2,cargos:[]},
  {id:10,proyecto:P,item:'1.06.01',desc:'Soporte de oficina central, 0.5% del Costo Directo',unidad:'mes',cantidad:'',precioUnit:22522290.9,total:112611.45,cargos:''},
  {id:11,proyecto:P,item:'2',desc:'SERVICIOS',unidad:'',cantidad:'',precioUnit:'',total:''},
  {id:12,proyecto:P,item:'2.01',desc:'Útiles Administrativos y de escritorio',unidad:'mes',cantidad:6.57,precioUnit:1200,total:7884.37,cargos:[]}
];
const personal=[
  {id:1,ape:'Ruiz',nom:'Ana',cargo:'INGENIERO RESIDENTE',proy:P},
  {id:2,ape:'Paz',nom:'Luis',cargo:'INGENIERO SUPERVISOR',proy:P},
  {id:3,ape:'Soto',nom:'Eva',cargo:'INGENIERO SUPERVISOR',proy:P},
  {id:4,ape:'Lima',nom:'Raúl',cargo:'SUPERVISOR TECNICO',proy:P},
  {id:5,ape:'Vega',nom:'Iván',cargo:'VIGILANTE',proy:P},
  {id:6,ape:'Rojas',nom:'Tito',cargo:'AYUDANTE MECANICO',proy:P},
  {id:7,ape:'Quispe',nom:'Juan',cargo:'MECANICO',proy:P},
  {id:8,ape:'Mamani',nom:'José',cargo:'MECANICO SOLDADOR',proy:P},
  {id:9,ape:'Otro',nom:'Proyecto',cargo:'INGENIERO RESIDENTE',proy:'OTRO-01'}
];
// Septiembre = 21/08/2026 al 20/09/2026 (31 días)
const fechas=[];{const d=new Date(2026,7,21);while(d<=new Date(2026,8,20)){fechas.push(d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'));d.setDate(d.getDate()+1);}}
let tid=1;const tareaje=[];
const marcar=(pid,tipo,n,desde,proy)=>{for(let i=0;i<n;i++)tareaje.push({id:tid++,personalId:pid,fecha:fechas[desde+i],tipo,proy:proy===undefined?P:proy});};
marcar(1,'TD',20,0); marcar(1,'DL',4,20); marcar(1,'DLT',1,24);          // 20 + 4 + 2.5 = 26.5
marcar(2,'TD',31,0);                                                   // 31
marcar(3,'TD',15,0); marcar(3,'F',1,15);                               // 15 (la falta no suma)
marcar(3,'TD',5,16,'OTRO-01');                                         // de otro proyecto: no suma
marcar(4,'TN',10,0,''); marcar(4,'V',2,10);                            // 10 sin proyecto en la marca → vale el de la persona
marcar(5,'TD',25,0);                                                   // vigilante: 25
marcar(6,'TD',31,0);                                                   // 31
marcar(7,'TD',20,0); marcar(8,'TD',10,0);                              // mecánicos 20 + 10
marcar(9,'TD',31,0,'OTRO-01');                                         // otra obra
tareaje.push({id:tid++,personalId:2,fecha:'2026-09-21',tipo:'TD',proy:P}); // fuera del período

// ── Sandbox ─────────────────────────────────────────────────────────────────
const nodos={};
const nodo=id=>nodos[id]||(nodos[id]={id,innerHTML:'',textContent:'',value:'',style:{},dataset:{}});
let upserts=[],avisos=[],fallo=null;
const DB={proyectos:[],presupCIndi:presup.map(p=>({...p})),valorCIndi:[],personal,tareaje,nx:{}};
const ctx=vm.createContext({
  DB,console,Date,Math,Number,String,Object,Array,JSON,Map,Set,isFinite,
  localStorage:{getItem:()=>null,setItem(){},removeItem(){}},
  document:{getElementById:nodo,querySelector:()=>nodo('_q'),createElement:()=>({}),body:{appendChild(){}}},
  toast:(m,e)=>avisos.push({m,e:!!e}),confirm:()=>true,openM(){},closeM(){},CU:{nombre:'Prueba'},
  isModuleReadOnly:()=>false,
  supaUpsert:async(k,r)=>{if(fallo)return fallo;upserts.push({k,r:JSON.parse(JSON.stringify(r))});return null;},
  supaDelete:async()=>{},
  nidSeguro:(nx,k)=>(DB[k]||[]).reduce((m,r)=>Math.max(m,+r.id||0),0)+1
});
// De hhVenta.js se toma exactamente la regla y la función, sin su pantalla
const hh=fs.readFileSync(R+'js/hhVenta.js','utf8');
const iReg=hh.indexOf('const _HR_TRAB'), fReg=hh.indexOf('\n',hh.indexOf('const _HR_SUB'));
const iFn=hh.indexOf('function hhVentaPeriodo'), fFn=hh.indexOf('\n}',iFn)+2;
vm.runInContext(hh.slice(iReg,fReg)+'\n'+hh.slice(iFn,fFn),ctx,{filename:'hhVenta.js (regla)'});
vm.runInContext(fs.readFileSync(R+'js/costoIndirecto.js','utf8'),ctx,{filename:'costoIndirecto.js'});
vm.runInContext(fs.readFileSync(R+'js/costoIndirectoSim.js','utf8'),ctx,{filename:'costoIndirectoSim.js'});
const ev=x=>vm.runInContext(x,ctx);
const r2=v=>(Math.round(v*100)/100).toFixed(2);

(async()=>{
console.log('\n== hhVentaPeriodo con proyecto ==');
const sinP=ev('hhVentaPeriodo("2026-08-21","2026-09-20")');
es('sin proyecto funciona igual que antes (incluye la otra obra)',sinP.filas.some(f=>f.p.id===9),true);
es('  31 días en el período',sinP.nDias,31);
const conP=ev(`hhVentaPeriodo("2026-08-21","2026-09-20","${P}")`);
es('con proyecto deja fuera a la persona de otra obra',conP.filas.some(f=>f.p.id===9),false);
const inc=id=>conP.filas.find(f=>f.p.id===id).inc;
es('residente: (20 + 4 DL + 1 DLT × 2.5) ÷ 31',r2(inc(1)),r2(26.5/31));
es('supervisor con falta y días de otra obra: solo 15 ÷ 31',r2(inc(3)),r2(15/31));
es('marca sin proyecto vale la de la persona (10 TN ÷ 31)',r2(inc(4)),r2(10/31));
es('la marca del 21/09 no entra (fuera del período)',r2(inc(2)),'1.00');
es('las vacaciones no suman',conP.filas.find(f=>f.p.id===4).trab,10);

console.log('\n== Sugerir partida por nombre ==');
ev(`_ciProyecto="${P}";_ciPeriodo="2026-09";_ciModo="simular";_cisMapa=null`);
ev('rCostoIndirecto()');
const mapa=()=>ev('[..._cisMapa].map(([k,v])=>k+":"+[...v].sort().join("|")).filter(s=>!s.endsWith(":")).join("  ")');
es('cada cargo en su partida',mapa(),
  '3:INGENIERO RESIDENTE  4:INGENIERO SUPERVISOR  5:SUPERVISOR TECNICO  8:AYUDANTE MECANICO  9:MECANICO|MECANICO SOLDADOR');
es('VIGILANTE no se parece a "Guardian": queda sin partida',ev('[..._cisMapa.values()].some(s=>s.has("VIGILANTE"))'),false);
es('SUPERVISOR TECNICO no cae en "Ingeniero Supervisor"',ev('_cisMapa.get(4).has("SUPERVISOR TECNICO")'),false);
es('AYUDANTE MECANICO va a "Ayud. Mecánicos", no a "Mecánicos"',ev('_cisMapa.get(9).has("AYUDANTE MECANICO")'),false);
es('todas quedan marcadas como sugeridas',ev('_cisSugeridos.size'),6);
es('oficina central y útiles no reciben cargos',ev('_cisMapa.get(10).size+_cisMapa.get(12).size'),0);

console.log('\n== La pantalla de simulación ==');
let H=nodo('ctPanel-ci').innerHTML;
es('dice el período y hasta cuándo hay tareo',/21\/08\/2026 al 20\/09\/2026 \(31 días\)/.test(H)&&/registrado hasta el <strong>20\/09\/2026/.test(H),true);
es('explica la regla',/TD, TN, A5 y DL = 1 · DLT = 2\.5/.test(H),true);
es('residente 0.85',/>0\.85</.test(H),true);
es('supervisores 1.48 (1.00 + 0.48)',/>1\.48</.test(H),true);
es('mecánicos 0.97 (0.65 + 0.32)',/>0\.97</.test(H),true);
es('VIGILANTE aparece en "sin partida"',/Cargos del tareo sin partida[\s\S]*VIGILANTE/.test(H),true);
es('  con selector para asignarlo',/_cisAsignar\(\d+,this\.value\)/.test(H),true);
es('avisa los sugeridos',/6 cargo\(s\) sugerido\(s\)/.test(H),true);
es('filas parejas',(H.match(/<tr[ >]/g)||[]).length,(H.match(/<\/tr>/g)||[]).length);
es('ninguna celda rota',/undefined|NaN/.test(H),false);
es('el nombre con días va en el título de Personas',/Ruiz, Ana: 20 d \+ 4 DL \+ 1 DLT → 0\.85/.test(H),true);

console.log('\n== Asignar a mano ==');
ev('_cisAsignar(_cisNombres.indexOf("VIGILANTE"),7)');
es('VIGILANTE pasa a Guardian',ev('_cisMapa.get(7).has("VIGILANTE")'),true);
es('  y deja de ser sugerido',ev('_cisSugeridos.has("VIGILANTE")'),false);
H=nodo('ctPanel-ci').innerHTML;
es('ya no hay cargos sin partida',/todos los cargos con días están vinculados/.test(H),true);
ev('_cisQuitar(9,_cisNombres.indexOf("MECANICO SOLDADOR"))');
es('quitar un cargo lo saca de la partida',ev('_cisMapa.get(9).has("MECANICO SOLDADOR")'),false);
es('  y vuelve a "sin partida"',/Cargos del tareo sin partida[\s\S]*MECANICO SOLDADOR/.test(nodo('ctPanel-ci').innerHTML),true);
ev('_cisAsignar(_cisNombres.indexOf("MECANICO SOLDADOR"),9)');

console.log('\n== Guardar los vínculos ==');
es('seis partidas con cambios',ev('_cisPendientes().length'),6);
upserts=[];
await ev('_cisGuardarVinculos()');
es('se guardan seis filas',upserts.length,6);
const res=upserts.find(u=>u.r.id===3).r;
es('  con la fila completa (proyecto, ítem, descripción)',[res.proyecto,res.item,res.desc].join(' · '),P+' · 1.01.01 · Ingeniero Residente');
es('  y sus cargos',JSON.stringify(res.cargos),'["INGENIERO RESIDENTE"]');
es('  Mecánicos con los dos',JSON.stringify(upserts.find(u=>u.r.id===9).r.cargos),'["MECANICO","MECANICO SOLDADOR"]');
es('quedan en DB',JSON.stringify(DB.presupCIndi.find(p=>p.id===7).cargos),'["VIGILANTE"]');
es('ya no hay pendientes',ev('_cisPendientes().length'),0);
es('  ni sugeridos',ev('_cisSugeridos.size'),0);

console.log('\n== Lo guardado manda sobre la sugerencia ==');
DB.presupCIndi.find(p=>p.id===9).cargos=['MECANICO'];
DB.presupCIndi.find(p=>p.id===8).cargos=['AYUDANTE MECANICO','MECANICO SOLDADOR'];
ev('_cisMapa=null;rCostoIndirecto()');
es('MECANICO SOLDADOR queda donde se guardó',ev('_cisMapa.get(8).has("MECANICO SOLDADOR")&&!_cisMapa.get(9).has("MECANICO SOLDADOR")'),true);
es('  sin volver a sugerirse',ev('_cisSugeridos.size'),0);
es('cargos guardados como texto de Postgres también se leen',
  ev('_cisCargosGuardados({cargos:\'{"MECANICO","AYUDANTE MECANICO"}\'}).join("|")'),'MECANICO|AYUDANTE MECANICO');
DB.presupCIndi.find(p=>p.id===9).cargos=['MECANICO','MECANICO SOLDADOR'];
DB.presupCIndi.find(p=>p.id===8).cargos=['AYUDANTE MECANICO'];
ev('_cisMapa=null');

console.log('\n== Si falta la columna cargos ==');
fallo={message:"Could not find the 'cargos' column of 'presup_c_indi'"};
ev('_cisMapa=null;rCostoIndirecto();_cisAsignar(_cisNombres.indexOf("VIGILANTE"),""  )');
avisos=[];
await ev('_cisGuardarVinculos()');
fallo=null;
es('dice qué SQL correr',avisos.some(a=>a.e&&/sql\/costo_indirecto_cargos\.sql/.test(a.m)),true);
ev('_cisMapa=null');

console.log('\n== Pasar a la valorización ==');
DB.valorCIndi.push({id:1,partidaId:12,periodo:'2026-09',cantidad:1,total:1200,totalManual:false});
ev('rCostoIndirecto();_cisAplicar()');
es('pasa a modo edición',ev('_ciModo'),'valorizar');
es('residente: 0.85 × 20,128',ev('_ciCambios.get(3).cantidad+" · "+_ciCambios.get(3).total'),'0.85 · 17108.8');
es('supervisores: 1.48',ev('_ciCambios.get(4).cantidad'),1.48);
es('guardian: 0.81 × 5,661',ev('_ciCambios.get(7).cantidad+" · "+_ciCambios.get(7).total'),'0.81 · 4585.41');
es('no es total manual',ev('_ciCambios.get(3).manual'),false);
es('útiles no se tocan (conserva su valorización)',ev('_ciCambios.has(12)'),false);
es('oficina central tampoco',ev('_ciCambios.has(10)'),false);
es('nada se guardó todavía',upserts.length===6&&ev('DB.valorCIndi.length')===1,true);
es('quedan como cambios por guardar',ev('_ciPendientes().length'),6);
es('el total del período ya los refleja',
  r2(ev(`_ciCalcular("${P}","2026-09",_ciCambios).total.actTot`)),
  r2(17108.8+1.48*16885+Math.round(0.32*10219.8*100)/100+4585.41+8806+0.97*15096+1200));

console.log('\n== Una partida vinculada sin días no borra nada ==');
DB.valorCIndi.push({id:2,partidaId:5,periodo:'2026-09',cantidad:2,total:20439.6,totalManual:false});
const sinSup=tareaje.filter(t=>t.personalId===4);
DB.tareaje=tareaje.filter(t=>t.personalId!==4);
ev('_ciModo="simular";_ciCambios.clear();_cisMapa=null;rCostoIndirecto();_cisAplicar()');
es('supervisor técnico sin marcas: no entra en los cambios',ev('_ciCambios.has(5)'),false);
es('  su valorización guardada sigue ahí',ev('DB.valorCIndi.some(v=>v.partidaId===5)'),true);
DB.tareaje=tareaje;

console.log('\n== Enganche ==');
const ci=fs.readFileSync(R+'js/costoIndirecto.js','utf8');
const html=fs.readFileSync(R+'index.html','utf8');
const sql=fs.readFileSync(R+'sql/costo_indirecto_cargos.sql','utf8');
const sim=fs.readFileSync(R+'js/costoIndirectoSim.js','utf8');
es('botón 🧮 en la barra',/onclick="_ciSetModo\('simular'\)"[^>]*>🧮 Simular desde el tareo/.test(ci),true);
es('en modo simular se pinta la simulación',/if\(sim&&D\.filas\.length&&typeof _cisPanelHTML==='function'\)return kpis\+barra\+_cisPanelHTML\(\)/.test(ci),true);
es('hhVentaPeriodo acepta el proyecto',/function hhVentaPeriodo\(desde,hasta,proy\)/.test(hh),true);
es('la simulación usa esa misma función',/hhVentaPeriodo\(desde,hasta,proy\)/.test(sim),true);
es('  y no redefine la regla de días',/'TD','TN','A5'|_HR_PESO_DLT\s*=/.test(sim),false);
es('script después de costoIndirecto.js',
  html.indexOf('<script src="js/costoIndirectoSim.js')>html.indexOf('<script src="js/costoIndirecto.js'),true);
es('SQL: agrega la columna sin tocar datos',/add column if not exists cargos text\[\] not null default '\{\}'/.test(sql),true);
es('todo lo nuevo lleva prefijo _cis',
  [...sim.matchAll(/^(?:const|let|function|async function)\s+([A-Za-z_$][\w$]*)/gm)].map(m=>m[1]).every(n=>/^_(cis|CIS)/.test(n)),true);

console.log('\n'+(mal?'X '+mal+' fallo(s)':'OK todo bien')+'  ·  '+ok+'/'+(ok+mal));
process.exit(mal?1:0);
})().catch(e=>{console.error('X la prueba reventó:',e);process.exit(1);});
