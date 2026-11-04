// RR.HH. · Roster de Guardias · pestaña 👷 Por turno.
// El personal programado de un día separado en turno día (TD, DLT, A5), turno
// noche (TN), días libres (DL), descanso médico (DM) y otros (F, P, V…), con la
// guardia de cada uno al costado. Tiene que cuadrar con el cuadro de Guardias
// FBNV del mismo día.
const fs=require('fs'),vm=require('vm');
const R='c:/Users/LENOVO/OneDrive/Documents/GitHub/GDARSystem/';
let ok=0,mal=0;
const es=(l,g,e)=>{const b=String(g)===String(e);b?ok++:mal++;
  console.log((b?'  OK  ':'  MAL ')+l.padEnd(62)+'= '+g+(b?'':'  (esperado '+e+')'));};

// Ciclo 14 + 7. A en día y B en noche desde el 01/10 (trabajan del 01 al 14 y
// descansan del 15 al 21); C de día desde el 08/10. El 14/10 los tres trabajan,
// con cambios a mano en A y B; el 18/10 A y B están de día libre.
const personal=[];
let id=1;
const alta=(n,guardia,cargo,extra)=>{for(let i=0;i<n;i++)personal.push({id:id++,ape:'P'+String(id).padStart(3,'0'),nom:'X',est:'Activo',guardia,cargo,...(extra||{})});};
alta(3,'A','OP. EXCAVADORA');      // 1-3
alta(2,'B','OP. VOLQUETE');        // 4-5
alta(2,'C','ING. RESIDENTE',{dni:'04067511'});  // 6-7
alta(1,'A','PEON',{est:'Cesado'}); // 8: no cuenta
alta(1,null,'PEON');               // 9: sin guardia, sin ciclo
const DB={personal,proyectos:[],
  rosterConfig:[{id:1,guardia:'A',fechaInicio:'2026-10-01',turno:'DIA',activo:true},
                {id:2,guardia:'B',fechaInicio:'2026-10-01',turno:'NOCHE',activo:true},
                {id:3,guardia:'C',fechaInicio:'2026-10-08',turno:'DIA',activo:true}],
  personalRosterCfg:[],
  rosterOvr:[
    {id:1,personalId:1,fecha:'2026-10-14',tipo:'A5'},
    {id:2,personalId:2,fecha:'2026-10-14',tipo:'DM'},
    {id:3,personalId:3,fecha:'2026-10-14T00:00:00+00:00',tipo:'F'},
    {id:4,personalId:4,fecha:'2026-10-14',tipo:'P'}
  ]};

const nodos={};
const Nodo=id=>({id,innerHTML:'',textContent:'',value:'',style:{},
  appendChild(){},remove(){},addEventListener(){},querySelector(){return null;},querySelectorAll(){return [];}});
const nodo=id=>nodos[id]||(nodos[id]=Nodo(id));
let mem={},hoja=null,archivo=null;
const ctx=vm.createContext({
  DB,console,Date,Math,Number,String,Object,Array,JSON,Set,Map,isFinite,parseInt,parseFloat,Promise,setTimeout,clearTimeout,
  document:{getElementById:nodo,createElement:()=>Nodo('tmp'),addEventListener(){},querySelector:()=>null,querySelectorAll:()=>[],body:{appendChild(){}}},
  window:{location:{href:'https://ecosermo.gdarei.com/index.html'},open:()=>null},
  localStorage:{getItem:k=>k in mem?mem[k]:null,setItem:(k,v)=>{mem[k]=String(v);},removeItem:k=>{delete mem[k];}},
  toast:()=>{},today:()=>'2026-10-14',
  supa:{from(){return {select:async()=>({data:[]}),upsert:async()=>({})};}},
  EMPRESA:{nombre:'ECOSERMO'},nid:()=>1,syncSheet(){},supaUpsert:async()=>null,supaDelete:async()=>{},confirm:()=>true,
  XLSX:{utils:{aoa_to_sheet:aoa=>({__aoa:aoa}),book_new:()=>({}),book_append_sheet:(wb,ws)=>{hoja=ws;}},writeFile:(wb,n)=>{archivo=n;}}
});
for(const f of ['personal.js','guardiasFbnv.js','rosterTurnos.js'])
  vm.runInContext(fs.readFileSync(R+'js/'+f,'utf8'),ctx,{filename:f});
const ev=x=>vm.runInContext(x,ctx);
ev('_rosterNormOvr()');
const n=d=>Object.fromEntries(Object.entries(d.sec).map(([k,v])=>[k,v.length]));

console.log('\n== La pestaña ==');
ev("_rosterTab('turno')");
const H=()=>nodos.rtnBody.innerHTML;
es('se muestra y oculta las otras',nodos.rtnBody.style.display+'|'+nodos.gdRosBody.style.display+'|'+nodos.rosterBody.style.display,'|none|none');
es('título del cuadro',/PERSONAL POR TURNO/.test(H()),true);
es('cinco secciones',['TURNO DÍA','TURNO NOCHE','DÍAS LIBRES','DESCANSO MÉDICO','OTROS'].every(s=>H().includes(s)),true);
es('columna GUARDIA al costado',(H().match(/>GUARDIA<\/th>/g)||[]).length,5);

console.log('\n== 14/10: A de día, B de noche, C de día ==');
let d=ev('_rtnDatos()');
const c=n(d);
es('turno día: el A5 de A + los 2 de C',c.dia,3);
es('  el A5 va con el día',d.sec.dia.some(x=>x.tipo==='A5'),true);
es('turno noche: 1 de B (el otro tiene permiso)',c.noche,1);
es('descanso médico',c.dm+' · guardia '+d.sec.dm[0].guardia,'1 · guardia A');
es('otros: la falta y el permiso',d.sec.otros.map(x=>x.tipo).sort().join(','),'F,P');
es('  cada uno con su guardia',d.sec.otros.map(x=>x.guardia).sort().join(','),'A,B');
es('no entran cesados ni sin guardia',d.total,7);

console.log('\n== Cuadra con Guardias FBNV del mismo día ==');
ev("_gdModo='roster'");
const g=ev('_gdDatos()');
const t={obra:0,libre:0,aus:0,td:0,tn:0};['A','B','C'].forEach(x=>Object.keys(t).forEach(k=>t[k]+=g.conteo[x][k]));
es('día = TD del cuadro',c.dia,t.td);
es('noche = TN del cuadro',c.noche,t.tn);
es('descanso médico + otros = ausentes del cuadro',c.dm+c.otros,t.aus);

console.log('\n== 18/10: A y B descansan ==');
ev("_rtnIr('2026-10-18')");
d=ev('_rtnDatos()');
es('días libres: los 5 de A y B',n(d).libre,5);
es('  con su guardia',ev('_rtnPorGuardia')(d.sec.libre).map(x=>x.g+' '+x.n).join(' · '),'A 3 · B 2');
es('turno día: los 2 de C',n(d).dia,2);
ev('_rtnSaltar(-4)');
es('◀ ▶ mueven la fecha',ev('_rtnFecha'),'2026-10-14');

console.log('\n== DNI y Excel ==');
ev('_gdToggleDni(true);rRosterTurnos()');
es('con DNI aparece la columna',/>DNI<\/th>/.test(H())&&H().includes('04067511'),true);
ev('_rtnExcel()');
const A=hoja.__aoa;
es('archivo con la fecha',archivo,'Personal por turno 2026-10-14.xlsx');
es('encabezado con GUARDIA y DNI',A.find(f=>f[0]==='ITEM').join('|'),'ITEM|CARGO|APELLIDOS Y NOMBRES|DNI|GUARDIA|TURNO');
es('las cinco secciones en la hoja',A.filter(f=>/^(TURNO DÍA|TURNO NOCHE|DÍAS LIBRES|DESCANSO MÉDICO|OTROS) · /.test(f[0]||'')).length,5);
ev('_gdToggleDni(false)');

console.log('\n'+(mal?'✗ '+mal+' FALLAS':'OK todo bien')+'  ·  '+ok+'/'+(ok+mal));
process.exit(mal?1:0);
