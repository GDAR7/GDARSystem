// Partes diarios · horómetro/km inicial = final del ÚLTIMO parte del mismo
// equipo (no el mayor de la historia). Caso real: CAG ECOP-002 tenía partes
// de setiembre con 6345.5 h / 36766 km y en noviembre va por 3790.3 / 32786.
const fs=require('fs'),path=require('path'),vm=require('vm');
const R=path.join(__dirname,'..')+'/';
let ok=0,mal=0;
const es=(l,g,e)=>{const b=JSON.stringify(g)===JSON.stringify(e);b?ok++:mal++;
  console.log((b?'  OK  ':'  MAL ')+l.padEnd(58)+'= '+JSON.stringify(g)+(b?'':'  (esperado '+JSON.stringify(e)+')'));};
const SRC=fs.readFileSync(R+'js/partesDiarios.js','utf8');
const fn=SRC.slice(SRC.indexOf('function _pdUltimoFin'),SRC.indexOf('function _checkStandby'));
const campos={rpFecha:'2026-11-22'};
const ctx={String,
  document:{getElementById:id=>id in campos?{value:campos[id]}:null},
  parteState:{turno:'DIA'},_editingParteId:null,
  DB:{partes:[
    {id:5035,eqId:72,fecha:'2026-09-30',turno:'DIA',hrFin:6345.5,kmFin:36766},
    {id:8363,eqId:72,fecha:'2026-11-17',turno:'DIA',hrFin:3783.6,kmFin:32722},
    {id:8450,eqId:72,fecha:'2026-11-18',turno:'DIA',hrFin:3790.3,kmFin:32786},
    {id:8524,eqId:72,fecha:'2026-11-19',turno:'DIA',hrFin:0,kmFin:null},      // inoperativo
    {id:8596,eqId:72,fecha:'2026-11-20',turno:'DIA',hrFin:0,kmFin:null},      // inoperativo
    {id:9000,eqId:20,fecha:'2026-11-21',turno:'DIA',hrFin:4173,kmFin:47413.5},// otro equipo
    {id:9001,eqId:47,fecha:'2026-11-21',turno:'DIA',hrFin:861.3},
    {id:9002,eqId:47,fecha:'2026-11-21',turno:'NOCHE',hrFin:867.1}]}};
vm.createContext(ctx);vm.runInContext('var DB=this.DB,parteState=this.parteState,_editingParteId=null;'+fn,ctx);
const ev=s=>vm.runInContext(s,ctx);

es('cisterna: horómetro del último parte, no el mayor',ev('_pdUltimoFin(72,"hrFin")'),3790.3);
es('cisterna: km del último parte, no el mayor',ev('_pdUltimoFin(72,"kmFin")'),32786);
es('los partes inoperativos con 0 no cuentan',ev('_pdUltimoFin(72,"hrFin")')>0,true);
es('no toma valores de otro equipo',ev('_pdUltimoFin(20,"hrFin")'),4173);
es('equipo sin partes: 0',ev('_pdUltimoFin(999,"hrFin")'),0);
console.log('\n== Fecha y turno del parte ==');
es('día del 21: toma el último anterior (20 noche no hay → 18)',(campos.rpFecha='2026-11-21',ev('_pdUltimoFin(72,"hrFin")')),3790.3);
es('noche del 21: toma el día del 21',(ctx.parteState.turno='NOCHE',ev('_pdUltimoFin(47,"hrFin")')),861.3);
es('día del 22: toma la noche del 21',(campos.rpFecha='2026-11-22',ctx.parteState.turno='DIA',ev('_pdUltimoFin(47,"hrFin")')),867.1);
es('parte con fecha del 17: toma el anterior a esa fecha… o el más reciente si no hay',
  (campos.rpFecha='2026-11-17',ev('_pdUltimoFin(72,"hrFin")')),6345.5);
es('editando el parte 8450: no se toma a sí mismo',
  (campos.rpFecha='2026-11-18',ev('_editingParteId=8450'),ev('_pdUltimoFin(72,"hrFin")')),3783.6);
ev('_editingParteId=null');
console.log('\n== Conexión ==');
es('_checkStandby usa _pdUltimoFin para horas y km',(SRC.match(/_pdUltimoFin\(eqId,'(hrFin|kmFin)'\)/g)||[]).length,2);
es('ya no usa Math.max sobre hrFin',/Math\.max\(\.\.\.partesEq/.test(SRC),false);

console.log(`\n${mal?'✗ '+mal+' FALLAS':'OK todo bien'}  ·  ${ok}/${ok+mal}`);
process.exitCode=mal?1:0;
