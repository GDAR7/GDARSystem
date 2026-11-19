// Matriz Anual · elegir qué conceptos entran al margen.
// Ventas suman, costos restan. Sin elegir nada, el margen es el del motor.
const fs=require('fs'),vm=require('vm'),path=require('path');
const R=path.join(__dirname,'..')+'/';
let ok=0,mal=0;
const es=(l,g,e)=>{const b=String(g)===String(e);b?ok++:mal++;
  console.log((b?'  OK  ':'  MAL ')+l.padEnd(58)+'= '+g+(b?'':'  (esperado '+e+')'));};

const DB={tarifasEq:[],ventaPersonal:[],
  equipos:[{id:1,codigo:'EXC-01',nombre:'Excavadora 01',sub:'EXCAVADORA',tipo:'Línea Amarilla',
            proveedor:'2MMICON',tarifa:100,tarifaUn:'HM',proyecto:'EPY-001-26'}],
  partes:[{id:1,eqId:1,fecha:'2026-02-01',ef:10},{id:2,eqId:1,fecha:'2026-02-02',ef:6}],
  combustible:[{eqId:1,fecha:'2026-02-05',gal:50,precio:6.00,tipoMov:'Salida'}],
  edpProveedores:[]};
const store={};
const ctx=vm.createContext({DB,console,Date,Math,Number,String,Object,Array,JSON,isNaN,parseFloat,parseInt,
  localStorage:{getItem:k=>store[k]??null,setItem:(k,v)=>{store[k]=v;},removeItem:k=>{delete store[k];}},
  document:{getElementById:()=>null,addEventListener(){},querySelectorAll:()=>[]},
  toast(){}, hhVentaPeriodo:()=>({filas:[]})});
vm.runInContext(fs.readFileSync(R+'js/costcontrol.js','utf8'),ctx);
vm.runInContext(fs.readFileSync(R+'js/costcontrolAnual.js','utf8'),ctx);
vm.runInContext('_aSoles=(v,m)=>(+v||0);',ctx);
const ev=x=>vm.runInContext(x,ctx);
const FEB=1;

console.log('\n== Tarifa Full ==');
ev('_ccTarifaModo="full";_ccaCache=null;_ccaAnio=2026');
const D=ev('_ccaCalcular(2026,"full")');
const m=D.grupos[0].equipos[0].meses[FEB];
ctx.__m=m;
const mg=()=>+ev('_ccaMg(__m)').toFixed(2);
es('sin elegir: el margen es el del motor',mg(),+m.margen.toFixed(2));
es('  fórmula completa',ev('_ccaMgTexto()'),'Venta Equipo + Venta Comb. − Alquiler − Combustible');
ev('_ccaMgSel={full:["comb","ventaComb"]}');
es('solo combustibles: Venta Comb. − Combustible',mg(),+(m.ventaComb-m.comb).toFixed(2));
es('  texto',ev('_ccaMgTexto()'),'Venta Comb. − Combustible');
ev('_ccaMgSel={full:["alquiler","ventaEq"]}');
es('Venta Equipo − Alquiler',mg(),+(m.ventaEq-m.alquiler).toFixed(2));
es('la fila de Alquiler no cambia',ev('_ccaVal(__m,"alquiler")'),m.alquiler);
const H=ev('_ccaPanel()');
es('el panel muestra el selector',/id="ccaMargenSel"/.test(H),true);
es('  con la fórmula elegida',H.includes('= Venta Equipo − Alquiler'),true);
es('  y el botón para volver',H.includes('_ccaMgTodos()'),true);
es('  sin undefined ni NaN',/undefined|NaN/.test(H),false);
es('el total del año usa la fórmula elegida',
  +ev('_ccaMg(_ccaCalcular(2026,"full").totAnio)').toFixed(2),
  +(D.totAnio.ventaEq-D.totAnio.alquiler).toFixed(2));
ev('_ccaMgToggle("alquiler")');
es('quitar uno deja solo Venta Equipo',ev('_ccaMgTexto()'),'Venta Equipo');
ev('_ccaMgToggle("ventaEq")');
es('no deja quitar el último',ev('_ccaMgTexto()'),'Venta Equipo');
es('se recuerda en el navegador',JSON.parse(store.ccaMgSel).full.join(),'ventaEq');
ev('_ccaMgTodos()');
es('↺ Margen completo vuelve al motor',mg(),+m.margen.toFixed(2));
es('  y el selector no ofrece volver',ev('_ccaPanel()').includes('_ccaMgTodos()'),false);

console.log('\n== Máq. Seca ==');
ev('_ccTarifaModo="seca";_ccaCache=null');
const S=ev('_ccaCalcular(2026,"seca")').grupos[0].equipos[0].meses[FEB];
ctx.__m=S;
es('por defecto: Venta − Alquiler (el combustible no resta)',mg(),+(S.venta-S.alquiler).toFixed(2));
ev('_ccaMgToggle("comb")');
es('se puede sumar el combustible a los costos',mg(),+(S.venta-S.alquiler-S.comb).toFixed(2));
es('la elección de Full no se mezcla',ev('_ccaMgSel.full'),undefined);

console.log('\n== Margen líquido (equipos propios ECOSERMO) ==');
DB.equipos.push({id:2,codigo:'EXC-02',nombre:'Excavadora 02',sub:'EXCAVADORA',tipo:'Línea Amarilla',
  proveedor:'ECOSERMO',tarifa:100,tarifaUn:'HM',proyecto:'EPY-001-26'});
DB.partes.push({id:3,eqId:2,fecha:'2026-02-03',ef:10});
ev('_ccTarifaModo="full";_ccaMgSel={};_ccaCache=null;_ccaLiquido=false');
const sinL=ev('_ccaFiltrar(_ccaCalcular(2026,"full"))')[0];
const pro0=sinL.equipos.find(a=>a.eq.codigo==='EXC-02'),ter0=sinL.equipos.find(a=>a.eq.codigo==='EXC-01');
es('apagado: el propio paga alquiler',pro0.meses[FEB].alquiler>0,true);
ev('_ccaToggleLiquido()');
const conL=ev('_ccaFiltrar(_ccaCalcular(2026,"full"))')[0];
const pro1=conL.equipos.find(a=>a.eq.codigo==='EXC-02'),ter1=conL.equipos.find(a=>a.eq.codigo==='EXC-01');
es('encendido: alquiler del propio en cero',pro1.meses[FEB].alquiler,0);
es('  su margen sube en lo que era el alquiler',
  +pro1.meses[FEB].margen.toFixed(2),+(pro0.meses[FEB].margen+pro0.meses[FEB].alquiler).toFixed(2));
es('  el total del año también',pro1.tot.alquiler,0);
es('el equipo de un tercero no cambia',ter1.meses[FEB].alquiler,ter0.meses[FEB].alquiler);
es('la familia suma el margen nuevo',
  +conL.meses[FEB].margen.toFixed(2),+(sinL.meses[FEB].margen+pro0.meses[FEB].alquiler).toFixed(2));
es('el motor no se tocó',ev('_ccaCalcular(2026,"full")').grupos[0].equipos.find(a=>a.eq.codigo==='EXC-02').meses[FEB].alquiler,pro0.meses[FEB].alquiler);
const HL=ev('_ccaPanel()');
es('el pie dice MARGEN LÍQUIDO',HL.includes('MARGEN LÍQUIDO'),true);
es('  el equipo lleva su marca',HL.includes('propio · alquiler 0'),true);
es('  sin undefined ni NaN',/undefined|NaN/.test(HL),false);
es('se recuerda en el navegador',store.ccaLiquido,'1');
ev('_ccaToggleLiquido()');
es('apagarlo vuelve a MARGEN TOTAL',ev('_ccaPanel()').includes('MARGEN TOTAL'),true);

console.log(`\n${mal?'✗ '+mal+' FALLAS':'OK todo bien'}  ·  ${ok}/${ok+mal}`);
process.exitCode=mal?1:0;
