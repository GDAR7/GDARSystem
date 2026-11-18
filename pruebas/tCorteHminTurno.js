// Corte de Equipos · columna HORAS MÍNIMAS: cada fila es un turno y se mide
// contra el mínimo del turno (mínimo del día ÷ 2).
// Volquete 300 h en 30 días → 10 h/día → 5 h/turno.
const fs=require('fs'),path=require('path'),vm=require('vm');
const SRC=fs.readFileSync(path.join(__dirname,'..','js','corteEquipos.js'),'utf8');
let ok=0,mal=0;
const es=(l,g,e)=>{const b=JSON.stringify(g)===JSON.stringify(e);b?ok++:mal++;
  console.log((b?'  OK  ':'  MAL ')+l.padEnd(58)+'= '+JSON.stringify(g)+(b?'':'  (esperado '+JSON.stringify(e)+')'));};
const a=SRC.indexOf('const _ceHminTurno'),b=SRC.indexOf('// Período 21→20');
const ctx={};vm.createContext(ctx);vm.runInContext(SRC.slice(a,b),ctx);
const m=(h,inop)=>vm.runInContext(`_ceMarcaHmin(${h},10,${!!inop})`,ctx);

console.log('\n== Mínimo por turno (10 h/día → 5 h/turno) ==');
es('8.5 h → SUP',m(8.5),'SUP');
es('6.5 h → SUP',m(6.5),'SUP');
es('5.0 h justo el mínimo → SUP',m(5),'SUP');
es('4.2 h sin falla → SI',m(4.2),'SI');
es('3.0 h inoperativo → NO',m(3,true),'NO');
es('sin horas mínimas en el Máster → —',vm.runInContext('_ceMarcaHmin(8,0,false)',ctx),'—');

console.log('\n== Rango de fechas (12/11 → 20/11) ==');
{
  const ctx2={DB:{partes:[
      {id:1,eqId:7,fecha:'2026-11-11',turno:'DIA',hrIni:0,hrFin:8,condicion:'OPERATIVO'},
      {id:2,eqId:7,fecha:'2026-11-12',turno:'DIA',hrIni:8,hrFin:14.5,condicion:'OPERATIVO'},
      {id:3,eqId:7,fecha:'2026-11-12',turno:'NOCHE',hrIni:14.5,hrFin:18.7,condicion:'OPERATIVO'},
      {id:4,eqId:7,fecha:'2026-11-20',turno:'DIA',hrIni:18.7,hrFin:26,condicion:'OPERATIVO'},
      {id:5,eqId:7,fecha:'2026-11-21',turno:'DIA',hrIni:26,hrFin:30,condicion:'OPERATIVO'}]},
    toast:()=>{},rCorteEquipos:()=>{},today:()=>'2026-11-18'};
  vm.createContext(ctx2);
  const a2=0,b2=SRC.indexOf('// ── Equipos con parte en el período');
  vm.runInContext(SRC.slice(a2,b2),ctx2);
  vm.runInContext("_ceRango={desde:'2026-11-12',hasta:'2026-11-20'};",ctx2);
  const per=vm.runInContext('_cePeriodo()',ctx2);
  es('rango: 9 días',per.dias,9);
  es('  mínimo diario sale del período 21/10→20/11 (31 días)',per.diasBase,31);
  es('  etiqueta',per.label,'12/11 → 20/11');
  ctx2.__p=per;
  const D=vm.runInContext("_ceDatos({id:7,hrsMinVenta:310},__p)",ctx2);
  es('  solo partes del 12 al 20 (fuera el 11 y el 21)',D.filas.map(f=>f.fecha),['2026-11-12','2026-11-12','2026-11-20']);
  es('  total horas del rango',+D.totalHoras.toFixed(2),18);
  es('  mín. diario 310/31 = 10 → turno 5',+D.hminDia.toFixed(2),10);
  es('  6.5 → SUP · 4.2 → SI',D.filas.slice(0,2).map(f=>f.hmin),['SUP','SI']);
  es('  Hmin del rango = 10 × 9 días',D.hminMes,90);
  vm.runInContext('_ceSinRango()',ctx2);
  es('✕ Período completo: vuelve al 21→20',vm.runInContext('_cePeriodo().rango',ctx2),undefined);
}

console.log('\n== Excel ==');
es('la fórmula compara contra E5/2',/IF\(G\$\{R\}>=\$E\$5\/2,"SUP"/.test(SRC),true);

console.log(`\n${mal?'✗ '+mal+' FALLAS':'OK todo bien'}  ·  ${ok}/${ok+mal}`);
process.exitCode=mal?1:0;
