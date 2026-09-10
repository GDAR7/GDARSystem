// ══ EL PERÍODO CONTABLE ═════════════════════════════════════════════════════
// El corte con el que se valoriza todo: partes diarios, combustible, EDP de
// proveedores, tareaje, costo por m³, informe de período. ECOSERMO va del 21
// de un mes al 20 del siguiente.
//
// Estaba escrito como un 21 suelto en trece módulos, cada uno con su función
// para calcular lo mismo. Ahora sale de EMPRESA_CORTE y de los helpers de
// js/utils.js.
//
// Lo que esta suite protege es que el corte de ECOSERMO no se mueva: estas
// fechas deciden qué partes diarios entran en una valorización, así que un día
// de diferencia son horas máquina cobradas en el mes equivocado.

const fs=require('fs');
const R=require('path').join(__dirname,'..')+'/';

let ok=0,mal=0;
const es=(l,g,e)=>{const b=String(g)===String(e);b?ok++:mal++;
  console.log((b?'  OK  ':'  MAL ')+l.padEnd(58)+'= '+g+(b?'':'  (esperado '+e+')'));};

const uts=fs.readFileSync(R+'js/utils.js','utf8');
const bloque=uts.slice(uts.indexOf('// ══ EL PERÍODO CONTABLE'),uts.indexOf('// ══ CLOCK ══'));
const con=corte=>new Function('EMPRESA_CORTE',bloque
  +';return{gdarCorte,gdarPeriodo,gdarPeriodoNav,gdarPeriodoOffset,gdarPeriodoDeMes,gdarFinDe,gdarIso};')(corte);

const H=con(21);

console.log('\n== ECOSERMO cierra el 20 ==');
const emp=fs.readFileSync(R+'js/empresa.js','utf8');
es('empresa.js declara el corte',/const EMPRESA_CORTE=21/.test(emp),true);
es('gdarCorte lo lee',H.gdarCorte(),21);
es('  sin declararlo, 21',con(undefined).gdarCorte(),21);
es('  un corte imposible cae a 21',con(31).gdarCorte(),21);
es('  el 0 también',con(0).gdarCorte(),21);

console.log('\n== El período de una fecha ==');
es('el 21 abre período',H.gdarPeriodo('2026-01-21').desde,'2026-01-21');
es('  y cierra el 20 de febrero',H.gdarPeriodo('2026-01-21').hasta,'2026-02-20');
es('el 20 todavía es del anterior',H.gdarPeriodo('2026-01-20').desde,'2025-12-21');
es('  que cierra ese mismo día',H.gdarPeriodo('2026-01-20').hasta,'2026-01-20');
es('a mitad de mes, el que viene de atrás',H.gdarPeriodo('2026-01-05').desde,'2025-12-21');
es('cruzando el año',H.gdarPeriodo('2026-01-15').desde,'2025-12-21');
es('  y al revés',H.gdarPeriodo('2025-12-25').hasta,'2026-01-20');
es('febrero bisiesto no lo despeina',H.gdarPeriodo('2024-02-25').hasta,'2024-03-20');

console.log('\n== Saltar de un período a otro ==');
es('el siguiente',H.gdarPeriodoNav('2026-01-21',1).desde,'2026-02-21');
es('el anterior',H.gdarPeriodoNav('2026-01-21',-1).desde,'2025-12-21');
es('doce atrás, mismo mes del año pasado',H.gdarPeriodoNav('2026-01-21',-12).desde,'2025-01-21');
es('  y su cierre',H.gdarPeriodoNav('2026-01-21',-12).hasta,'2025-02-20');
es('trece adelante cruza el año',H.gdarPeriodoNav('2026-01-21',13).desde,'2027-02-21');

console.log('\n== Los períodos duran 28, 30 o 31 días ==');
// Los usa el prorrateo de las partidas por mes. Un día de más o de menos
// cambia la incidencia mensual de cada equipo.
const dias=(desde)=>{const p=H.gdarPeriodo(desde);
  return Math.round((new Date(p.hasta+'T12:00:00')-new Date(p.desde+'T12:00:00'))/864e5)+1;};
es('21 ene → 20 feb, 31 días',dias('2026-01-21'),31);
es('21 feb → 20 mar, 28 días',dias('2026-02-21'),28);
es('  en bisiesto, 29',dias('2024-02-21'),29);
es('21 mar → 20 abr, 31 días',dias('2026-03-21'),31);
es('21 abr → 20 may, 30 días',dias('2026-04-21'),30);

console.log('\n== Los doce períodos de un año ==');
const P=Array.from({length:12},(_,m)=>H.gdarPeriodoDeMes(2026,m));
es('el primero abre en diciembre anterior',P[0].desde,'2025-12-21');
es('  y cierra el 20 de enero',P[0].hasta,'2026-01-20');
es('el último cierra el 20 de diciembre',P[11].hasta,'2026-12-20');
es('  y son doce sin huecos',
   P.every((p,i)=>i===0||p.desde>P[i-1].desde),true);

console.log('\n== Un cliente que cierra a fin de mes ==');
// Es el caso que hace que esto valga la pena: corte 1 y el período pasa a ser
// el mes calendario, sin tocar una línea de los trece módulos.
const M=con(1);
es('enero va del 1 al 31',M.gdarPeriodo('2026-01-15').desde+'..'+M.gdarPeriodo('2026-01-15').hasta,
   '2026-01-01..2026-01-31');
es('febrero termina el 28',M.gdarPeriodo('2026-02-10').hasta,'2026-02-28');
es('  y en bisiesto el 29',M.gdarPeriodo('2024-02-10').hasta,'2024-02-29');
es('abril termina el 30',M.gdarPeriodo('2026-04-10').hasta,'2026-04-30');
es('diciembre no se sale del año',M.gdarPeriodo('2026-12-31').hasta,'2026-12-31');
// El consolidado anual lista los períodos por el mes en que CIERRAN. Con
// corte 1 el que cierra en enero es enero; la primera versión restaba un mes
// siempre y etiquetaba diciembre como "Enero", con el año entero corrido.
es('el que cierra en enero es enero',
   M.gdarPeriodoDeMes(2026,0).desde+'..'+M.gdarPeriodoDeMes(2026,0).hasta,
   '2026-01-01..2026-01-31');
es('  y el de febrero, febrero',
   M.gdarPeriodoDeMes(2026,1).desde+'..'+M.gdarPeriodoDeMes(2026,1).hasta,
   '2026-02-01..2026-02-28');
es('  el de diciembre no se va al año anterior',
   M.gdarPeriodoDeMes(2026,11).desde,'2026-12-01');

console.log('\n== Y uno que cierra el 15 ==');
const Q=con(16);
es('el 15 aún es del período viejo',Q.gdarPeriodo('2026-01-15').hasta,'2026-01-15');
es('el 16 abre el nuevo',Q.gdarPeriodo('2026-01-16').desde,'2026-01-16');
es('  que cierra el 15 de febrero',Q.gdarPeriodo('2026-01-16').hasta,'2026-02-15');

console.log('\n== Ya nadie calcula el corte por su cuenta ==');
// Es lo que impide que vuelva a haber trece copias. Un 21 suelto en una
// fórmula de fechas es exactamente lo que se acaba de quitar.
const MODULOS=['auxmec','corteEquipos','costcontrol','costoM3','insumosAux',
  'reportesEquipos','informePeriodo','combustible','tareaje','hhVenta',
  'costcontrolAnual','panelHoras'];
const reincidentes=[];
for(const m of MODULOS){
  const s=fs.readFileSync(R+'js/'+m+'.js','utf8');
  // new Date(algo, algo, 21) o getDate()>=21: la firma de la formula vieja
  if(/getDate\(\)\s*>=\s*21/.test(s)||/new Date\([^)]*,\s*21\s*\)/.test(s))
    reincidentes.push(m);
}
es('ninguno de los doce lo recalcula',reincidentes.join(', ')||'—','—');
const delegan=MODULOS.filter(m=>/gdarPeriodo/.test(fs.readFileSync(R+'js/'+m+'.js','utf8')));
es('y los doce piden el período al helper',delegan.length,12);

console.log('\n== El helper vive en un solo sitio ==');
es('utils.js lo define',/function gdarPeriodo\(/.test(uts),true);
es('  con la navegación',/function gdarPeriodoNav\(/.test(uts),true);
es('  el desplazamiento por offset',/function gdarPeriodoOffset\(/.test(uts),true);
es('  los doce del año',/function gdarPeriodoDeMes\(/.test(uts),true);
es('  y el cierre del período',/function gdarFinDe\(/.test(uts),true);
es('el arreglo de meses ya no se repite',/const GDAR_MESES=/.test(uts),true);

console.log('\n'+(mal?'X '+mal+' fallo(s)':'OK todo bien')+'  ·  '+ok+'/'+(ok+mal));
process.exit(mal?1:0);
