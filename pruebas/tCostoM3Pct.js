// Cost Control · Costo por m³ Movido, guardado POR MES:
//   · porcentajes (Reembolsables, Gastos Generales, Utilidad) de cada mes;
//   · importes de HM y HH corregibles a mano, solo para su mes;
//   · foto del mes (Sub Total, total, costo por m³) al guardar;
//   · nada se guarda solo: ✏ Editar → cambios en borrador → 💾 Guardar.
const fs=require('fs'),vm=require('vm');
const R='c:/Users/LENOVO/OneDrive/Documents/GitHub/GDARSystem/';
let ok=0,mal=0;
const es=(l,g,e)=>{const b=String(g)===String(e);b?ok++:mal++;
  console.log((b?'  OK  ':'  MAL ')+l.padEnd(62)+'= '+g+(b?'':'  (esperado '+e+')'));};

// Hoy simulado: 25/10/2026 → período visible = Noviembre 2026 (21/10 al 20/11)
const HOY=new Date(2026,9,25,12);
class F extends Date{constructor(...a){super(...(a.length?a:[HOY.getTime()]));}static now(){return HOY.getTime();}}
// Un equipo por HM: 10 h efectivas cada mes a S/ 100 = S/ 1000 de HM; sin HH
const DB={equipos:[{id:1,codigo:'EXC ECOP-001'}],partes:[
  {id:1,eqId:1,fecha:'2026-09-01',ef:10,viajes:[{cant:'10',material:'Relleno',destino:'R3'}]},   // Septiembre
  {id:2,eqId:1,fecha:'2026-10-01',ef:10,viajes:[{cant:'10',material:'Relleno',destino:'R3'}]},   // Octubre
  {id:3,eqId:1,fecha:'2026-10-25',ef:10,viajes:[{cant:'10',material:'Relleno',destino:'R3'}]}    // Noviembre
],tareaje:[]};
const mem={},guardados=[],avisos=[];let falla=null,lecturas=0,confirma=true;
const nodo={innerHTML:''};
const ctx=vm.createContext({DB,console:{warn(){},log(){}},Math,Number,String,Object,Array,JSON,Set,Map,isFinite,parseFloat,Promise,setTimeout,
  Date:F,document:{getElementById:id=>id==='page-costoM3'?nodo:null},
  localStorage:{getItem:k=>k in mem?mem[k]:null,setItem:(k,v)=>{mem[k]=String(v);}},
  toast:(m,e)=>avisos.push((e?'✗ ':'')+m),confirm:()=>confirma,CU:{nombre:'Abel Rodríguez A.'},
  _ccMatchEq:()=>({un:'HM',seca:100,full:100}),
  hhVentaPeriodo:()=>({filas:[],sinTarifa:[]}),hhPesoMarca:()=>0,
  supa:{from:t=>({
    select:async()=>{lecturas++;return falla?{data:null,error:{message:falla}}:
      {data:[{periodo:'2026-09',reemb:10,gg:10,util:10,hm_manual:null,hh_manual:null,subtotal:1000,total:1300,m3:120,costo_m3:10.8333,
        actualizado_en:'2026-09-25T15:00:00Z',actualizado_por:'Abel Rodríguez A.'}],error:null};},
    upsert:async f=>{guardados.push({t,f});return falla?{error:{message:falla}}:{error:null};}})}});
vm.runInContext(fs.readFileSync(R+'js/costoM3.js','utf8').replace(/^const /gm,'var ').replace(/^let /gm,'var '),ctx,{filename:'costoM3.js'});
const ev=x=>vm.runInContext(x,ctx);
const espera=()=>new Promise(r=>setImmediate(r));
const H=()=>nodo.innerHTML;
const ir=o=>ev('_cm3Borr=null;_cm3Offset='+o+';rCostoM3()');

(async()=>{
console.log('\n== De dónde salen los porcentajes de cada mes ==');
es('clave del período: el mes de cierre',ev('_cm3Clave(_cm3Periodo())'),'2026-11');
ev('rCostoM3()');await espera();await espera();
es('al abrir, se lee lo guardado una vez',lecturas,1);
ir(-2);
es('Septiembre tiene los suyos (10 · 10 · 10)',ev('[_cm3PctDe(_cm3Periodo()).reemb,_cm3PctDe(_cm3Periodo()).origen].join()'),'10,guardado');
es('Agosto (antes de todo lo guardado): por defecto',(ir(-3),ev('_cm3PctDe(_cm3Periodo()).origen')),'defecto');
es('Octubre (sin guardar) parte de los de Septiembre',(ir(-1),ev('_cm3PctDe(_cm3Periodo()).origen+" "+_cm3PctDe(_cm3Periodo()).de')),'heredado 2026-09');

console.log('\n== Un mes guardado se ve bloqueado ==');
ir(-2);
es('chip: guardado',/✓ Septiembre 2026 guardado/.test(H()),true);
es('botón ✏ Editar',/onclick="_cm3Editar\(\)"/.test(H()),true);
es('sin campos para escribir porcentajes',/_cm3BorrSet\('reemb'/.test(H()),false);
es('ni para HM / HH',/_cm3BorrSet\('hm'/.test(H()),false);
es('muestra lo guardado: Sub Total y costo por m³',/💾 Guardado el [\s\S]*Sub Total <b[^>]*>S\/ 1,000\.00[\s\S]*Costo por m³ <b[^>]*>S\/ 10\.83/.test(H()),true);

console.log('\n== Un mes nunca guardado abre en edición ==');
ir(-1);
es('Octubre: en edición',ev('_cm3Editando(_cm3Periodo())'),true);
es('  chip: editando, sin guardar',/✏ Editando Octubre 2026 · sin guardar/.test(H()),true);
es('  botón 💾 Guardar, sin Cancelar (no hay nada guardado que conservar)',/_cm3Guardar\(\)/.test(H())&&!/_cm3Cancelar\(\)/.test(H()),true);

console.log('\n== Editar no guarda; Guardar sí ==');
ir(-2);ev('_cm3Editar()');
const n0=guardados.length;
ev('_cm3BorrSet("util","12.5")');
es('cambiar un porcentaje NO guarda',guardados.length-n0,0);
es('  pero recalcula al instante (vista previa): 1000 × 1.325',ev('_cm3Datos().total'),1325);
es('  y aparecen Guardar y Cancelar',/_cm3Guardar\(\)/.test(H())&&/_cm3Cancelar\(\)/.test(H()),true);
ev('_cm3Cancelar()');
es('Cancelar descarta: vuelve a lo guardado',ev('_cm3Datos().total'),1300);
es('  y sin guardar nada',guardados.length-n0,0);

console.log('\n== Corregir HM a mano ==');
ev('_cm3Editar();_cm3BorrSet("hm","1012.40")');
es('HM corregido en el borrador',ev('_cm3Datos().hm'),1012.4);
es('  el calculado se conserva para comparar',ev('_cm3Datos().hmCalc'),1000);
es('  y se ve la diferencia',/calculado S\/ 1,000\.00 · diferencia \+S\/ 12\.40/.test(H()),true);
es('Sub Total = HM corregido + HH',ev('_cm3Datos().base'),1012.4);
ev('_cm3BorrSet("util","12.5")');
await ev('_cm3Guardar()');
const g=guardados[guardados.length-1];
es('💾 Guardar graba UNA vez en costo_m3_pct',guardados.length-n0+' · '+g.t,'1 · costo_m3_pct');
es('  con porcentajes e importe corregido',JSON.stringify({p:g.f.periodo,r:g.f.reemb,u:g.f.util,hmM:g.f.hm_manual,hhM:g.f.hh_manual}),'{"p":"2026-09","r":10,"u":12.5,"hmM":1012.4,"hhM":null}');
es('  y la foto: Sub Total, total, m³, costo por m³',[g.f.subtotal,g.f.total,g.f.m3,g.f.costo_m3].join(' · '),'1012.4 · 1341.43 · 120 · 11.1786');
es('  y quién',g.f.actualizado_por,'Abel Rodríguez A.');
es('queda bloqueado otra vez',ev('_cm3Editando(_cm3Periodo())'),false);
es('  avisa',avisos[avisos.length-1],'✓ Septiembre 2026 guardado');
es('  la fila muestra EDITADO',/Horas Máquina \(HM\) <span[^>]*>EDITADO/.test(H()),true);
es('el ajuste de HM NO pasa a otros meses',(ir(-1),ev('_cm3Datos().hm')),1000);
es('  pero los porcentajes sí se heredan (12.5 de Septiembre)',ev('_cm3PctDe(_cm3Periodo()).util'),12.5);

console.log('\n== Volver al calculado ==');
ir(-2);ev('_cm3Editar();_cm3BorrSet("hm","")');
es('vacío = importe calculado',ev('_cm3Datos().hm+" · "+_cm3Datos().hmManual'),'1000 · false');
ev('_cm3BorrSet("hm","1000")');
es('escribir el mismo calculado no cuenta como corrección',ev('_cm3AjusteDe(_cm3Periodo()).hm'),null);
ev('_cm3Cancelar()');

console.log('\n== Por defecto, solo en el borrador ==');
ev('_cm3Editar();_cm3Restaurar()');
es('pone 15 · 12 · 9.35',ev('[_cm3Borr.reemb,_cm3Borr.gg,_cm3Borr.util].join(" · ")'),'15 · 12 · 9.35');
es('  sin guardar hasta presionar Guardar',guardados.length,1);
ev('_cm3Cancelar()');

console.log('\n== Cambiar de mes con cambios sin guardar ==');
ev('_cm3Editar();_cm3BorrSet("gg","20")');
confirma=false;ev('_cm3Nav(-1)');
es('si dice que no, se queda en el mes con su borrador',ev('_cm3Clave(_cm3Periodo())+" · "+_cm3Borr.gg'),'2026-09 · 20');
confirma=true;ev('_cm3Nav(1)');
es('si dice que sí, se descarta y cambia de mes',ev('_cm3Clave(_cm3Periodo())')+' · '+ev('_cm3PctMes["2026-09"].gg'),'2026-10 · 10');

console.log('\n== Si falla el guardado ==');
ir(-2);ev('_cm3Editar();_cm3BorrSet("reemb","11")');
falla='Failed to fetch';
await ev('_cm3Guardar()');
es('el borrador sigue abierto, con lo escrito',ev('_cm3Editando(_cm3Periodo())+" · "+_cm3Borr.reemb'),'true · 11');
es('lo guardado no cambia',ev('_cm3PctMes["2026-09"].reemb'),10);
es('  y avisa',/^✗ No se guardó Septiembre 2026/.test(avisos[avisos.length-1]),true);
falla=null;ev('_cm3Cancelar()');

console.log('\n== La Tendencia usa lo de cada mes ==');
ir(0);
const T=ev('_cm3Tendencia(3)');
es('Sept 1341.43 (guardado) · Oct y Nov heredan 32.5%',T.map(t=>Math.round(t.total*100)/100).join(' · '),'1341.43 · 1325 · 1325');
es('la vuelta deja el mes visible donde estaba',ev('_cm3Offset'),0);

console.log('\n== Los partes cambiaron después de guardar ==');
ir(-2);
ev('DB.partes[0].ef=12');ev('_cm3PctMes["2026-09"].hmManual=null');ev('rCostoM3()');
es('lo avisa con el Sub Total actual',/Los partes cambiaron desde que se guardó \(Sub Total actual S\/ 1,200\.00\)/.test(H()),true);
ev('DB.partes[0].ef=10');

console.log('\n== SQL ==');
const SQL=fs.readFileSync(R+'sql/costo_m3_pct.sql','utf8');
es('un registro por mes (AAAA-MM)',/periodo\s+text primary key check \(periodo ~ '\^\\d\{4\}-\\d\{2\}\$'\)/.test(SQL),true);
es('columnas nuevas sin romper si ya existía la tabla',['hm_manual','hh_manual','hm','hh','subtotal','total','m3','costo_m3'].every(c=>new RegExp('add column if not exists '+c+'\\s').test(SQL)),true);
es('misma seguridad que las demás tablas',/create policy gdar_autenticado on public\.costo_m3_pct/.test(SQL),true);
es('ya no se guarda nada en el navegador',Object.keys(mem).some(k=>/_cm3(Reemb|Gg|Util)/.test(k)),false);

console.log('\n'+(mal?'✗ '+mal+' FALLAS':'OK todo bien')+'  ·  '+ok+'/'+(ok+mal));
process.exit(mal?1:0);
})();
