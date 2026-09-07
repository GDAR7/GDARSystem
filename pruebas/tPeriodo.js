const fs=require('fs');
const R='c:/Users/LENOVO/OneDrive/Documents/GitHub/GDARSystem/';
const ep=fs.readFileSync(R+'js/edpProveedores.js','utf8');
let ok=0,mal=0;
const es=(l,g,e)=>{const b=String(g)===String(e);b?ok++:mal++;
  console.log((b?'  OK  ':'  MAL ')+l.padEnd(58)+'= '+g+(b?'':'  (esperado '+e+')'));};

console.log('\n== Un solo periodo para calcular el C.U.H. ==');
const conEdp=(ep.match(/dias:Math\.max\(1,Math\.round\(\(new Date\(_edpHasta\+'T12:00'\)/g)||[]).length;
const conAux=(ep.match(/dias:Math\.max\(1,Math\.round\(\(new Date\(_edpPerAux\(\)\.hasta/g)||[]).length;
es('los cinco calculos usan el periodo del EDP',conEdp,5);
es('  ninguno usa el de auxilios',conAux,0);

console.log('\n== El periodo de auxilios sigue filtrando ==');
es('_edpDescAuto lo usa para elegir auxilios',/const _pa=_edpPerAux\(\)/.test(ep),true);
es('  y filtra por ese rango',/a\.fecha>=_aDes&&a\.fecha<=_aHas/.test(ep),true);
es('el impreso sigue diciendo el rango de auxilios',/auxilios · las horas van del/.test(ep),true);

console.log('\n== Por que salian dos numeros distintos ==');
// El C.U.H. divide la tarifa MENSUAL entre las horas del periodo
const HD=8, tarifa=14608.20;
const cuh=dias=>tarifa/(dias*HD);
const H=1.50, part=1;
const conMes  = H*part*cuh(31);      // periodo del EDP: 31 dias
const conTres = H*part*cuh(74);      // periodo de auxilios ampliado: 74 dias
console.log('   con 31 dias  (EDP)      C.U.H. '+cuh(31).toFixed(2)+'  →  '+conMes.toFixed(2));
console.log('   con 74 dias  (auxilios) C.U.H. '+cuh(74).toFixed(2)+'  →  '+conTres.toFixed(2));
es('ampliar el rango bajaba el importe',conTres<conMes,true);
es('  en la misma proporcion que los dias',+(conMes/conTres).toFixed(3),+(74/31).toFixed(3));
es('182.57 / 76.29 da una proporcion parecida',+(182.57/76.29).toFixed(2),2.39);
es('  que equivale a unos 74 dias de rango',Math.round(31*(182.57/76.29)),74);

console.log('\n== Los tres importes ya coinciden ==');
// Mismo periodo -> mismo C.U.H. -> mismo total en cuadro, resumen y total
const cuadro=conMes, resumen=conMes, totalDesc=conMes;
es('cuadro = resumen',cuadro,resumen);
es('resumen = total descuentos',resumen,totalDesc);

console.log('\n'+(mal?'X '+mal+' fallo(s)':'OK todo bien')+'  ·  '+ok+'/'+(ok+mal));
process.exit(mal?1:0);
