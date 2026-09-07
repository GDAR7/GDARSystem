const fs=require('fs');
const R='c:/Users/LENOVO/OneDrive/Documents/GitHub/GDARSystem/';
global.localStorage={getItem:()=>null,setItem:()=>{},removeItem:()=>{}};
global.document={getElementById:()=>null,querySelector:()=>null};
global.toast=()=>{};global.openM=()=>{};global.closeM=()=>{};
global.DB={personal:[],tareaje:[],planillaMes:[],afpTasas:[],proyectos:[],planillaCierre:[],planillaCerrada:[]};
global.nid=()=>1;global._plGenMes=6;global._plGenAnio=2026;global.nidSeguro=()=>1;global.supaUpsert=async()=>null;global.syncSheet=()=>{};

const src=fs.readFileSync(R+'js/planilla.js','utf8')+'\n'+fs.readFileSync(R+'js/afpTasas.js','utf8')
  +'\n;global._calcPlanRow=_calcPlanRow;global._PL_COLS=PL_COLS;'
  +'global._AFP_SEMILLA=_AFP_SEMILLA;_plGenMes=6;_plGenAnio=2026;';
eval(src);

let ok=0,mal=0;
const es=(l,g,e)=>{const b=String(g)===String(e);b?ok++:mal++;
  console.log((b?'  OK  ':'  MAL ')+l.padEnd(50)+'= '+g+(b?'':'  (esperado '+e+')'));};

// Un trabajador con 30 días trabajados en junio
const P=n=>({id:n,dni:'1'+n,ape:'PRUEBA',nom:'UNO',cargo:'X',sue:9000,asig:0,movilidad:0,est:'Activo'});
DB.tareaje=[];
for(let d=1;d<=30;d++)DB.tareaje.push({personalId:1,fecha:'2026-06-'+String(d).padStart(2,'0'),tipo:'TD'});
[2,3,4].forEach(id=>{for(let d=1;d<=30;d++)DB.tareaje.push({personalId:id,fecha:'2026-06-'+String(d).padStart(2,'0'),tipo:'TD'});});

const calc=afp=>{const p=P(1);p.afp=afp;return _calcPlanRow(p,null);};

console.log('\n== Sin la tabla de tasas cargada ==');
const onp=calc('ONP'),snp=calc('SNP'),integra=calc('Integra');
es('ONP se reconoce como sistema nacional',onp.esOnp,true);
es('y descuenta el 13 %',onp.snp,+(onp.baseLeySociales*0.13).toFixed(2));
es('sin partirlo en tres',onp.obligAfp+onp.primaAfp+onp.sobreAfp,0);
es('ONP y SNP descuentan igual',onp.totalPensiones,snp.totalPensiones);
es('Integra no es ONP',integra.esOnp,false);
es('y sí se parte en tres',integra.obligAfp>0&&integra.primaAfp>0&&integra.sobreAfp>0,true);

console.log('\n== Las columnas de la planilla ==');
const col=k=>_PL_COLS.find(c=>c.k===k);
const pinta=(k,c)=>col(k).c(c,P(1),0,{afpBadge:''});
const vacio=h=>!/S\//.test(String(h));
es('ONP muestra su monto en la columna ONP/SNP',/S\//.test(pinta('snp',onp)),true);
es('y deja vacías las de AFP',vacio(pinta('obligAfp',onp))&&vacio(pinta('primaAfp',onp))&&vacio(pinta('sobreAfp',onp)),true);
es('Integra al revés: vacía la de ONP/SNP',vacio(pinta('snp',integra)),true);
es('y llena las de AFP',/S\//.test(pinta('obligAfp',integra)),true);
es('el rótulo ya no dice solo SNP',col('snp').l,'ONP/SNP 13%');

console.log('\n== Con la tabla de tasas cargada ==');
DB.afpTasas=_AFP_SEMILLA.map((t,i)=>({id:i+1,...t}));
const onp2=calc('ONP'),hab=calc('Habitat');
es('la ONP está en la tabla',DB.afpTasas.some(t=>t.nombre==='ONP'),true);
es('sigue siendo régimen nacional',onp2.esOnp,true);
es('con la tasa de la tabla (13 %)',onp2.snp,+(onp2.baseLeySociales*0.13).toFixed(2));
// Cada aporte se redondea por su cuenta, como en la planilla real: sumar los
// redondeados no da lo mismo que aplicar el 12.84 % de una vez (un céntimo).
const r2=n=>Math.round(n*100)/100, B=hab.baseLeySociales;
es('Habitat: aporte obligatorio 10 %',hab.obligAfp,r2(B*0.10));
es('prima de seguro 1.37 %',hab.primaAfp,r2(B*0.0137));
es('comision de flujo 1.47 %',hab.sobreAfp,r2(B*0.0147));
es('total = la suma de los tres',hab.totalPensiones,r2(hab.obligAfp+hab.primaAfp+hab.sobreAfp));

console.log('\n== Un régimen que no existe no rompe nada ==');
const raro=calc('AFP INVENTADA');
es('no lo toma por ONP',raro.esOnp,false);
es('aplica solo el 10 % obligatorio',raro.obligAfp,+(raro.baseLeySociales*0.10).toFixed(2));

console.log('\n'+(mal?'X '+mal+' fallo(s)':'OK todo bien')+'  ·  '+ok+'/'+(ok+mal));
process.exit(mal?1:0);
