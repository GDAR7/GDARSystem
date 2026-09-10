// ══ EL PRESUPUESTO CONTRACTUAL SALE DEL CÓDIGO ══════════════════════════════
// Las 128 partidas del contrato de ECOSERMO pasan a vivir en una tabla, y el
// arreglo del código queda de respaldo. Lo único que no puede pasar es que las
// cifras cambien: terminan en una valorización que el cliente firma y paga.
//
// Por eso lo que más se comprueba aquí es la equivalencia: leer las partidas
// de la tabla tiene que dar exactamente lo mismo que leerlas del respaldo,
// partida por partida y decimal por decimal.

const fs=require('fs');
const R=require('path').join(__dirname,'..')+'/';

let ok=0,mal=0;
const es=(l,g,e)=>{const b=String(g)===String(e);b?ok++:mal++;
  console.log((b?'  OK  ':'  MAL ')+l.padEnd(58)+'= '+g+(b?'':'  (esperado '+e+')'));};

const src=fs.readFileSync(R+'js/valPresupuesto.js','utf8');
const BASE=new Function(src+';return VAL_PRESUP_BASE;')();
const DIAS=new Function(src+';return VAL_DIAS_MES;')();
// valPresupuesto() mira DB, que en el navegador es global
const conDB=filas=>new Function('DB',src+';return valPresupuesto();')({valPresupuesto:filas});

console.log('\n== El contrato sigue entero ==');
es('128 partidas',BASE.length,128);
es('  98 son hojas con precio',BASE.filter(p=>p.t==='p').length,98);
es('  y todas dicen de dónde sale su cantidad',
   BASE.filter(p=>p.t==='p').every(p=>p.src),true);
es('el costo directo del contrato',BASE.find(p=>p.sec==='CD').pres,22522290.9);
es('el costo indirecto',BASE.find(p=>p.sec==='CI').pres,3649154.58);
es('mes-hombre se divide entre 30',DIAS,30);

console.log('\n== Con la tabla vacía manda el respaldo ==');
// Es el estado de hoy: la migración crea la tabla vacía y no cambia nada.
es('sin DB, el respaldo',conDB(undefined).length,128);
es('con la tabla vacía, el respaldo',conDB([]).length,128);
es('  y es el mismo arreglo, no una copia rara',
   JSON.stringify(conDB([])),JSON.stringify(BASE));

console.log('\n== Con la tabla cargada manda la tabla ==');
// Se simula lo que devuelve Supabase después de toCamel: descripcion pasa a
// desc por el mapeo de config.js, y los números pueden venir como texto.
const comoSupabase=BASE.map((p,i)=>({
  id:i+1,orden:i+1,t:p.t,
  item:p.item===''?null:p.item,
  desc:p.desc,                                  // toCamel renombra descripcion
  und:p.und===undefined?null:p.und,
  cant:p.cant===undefined?null:String(p.cant),  // numeric llega como texto
  pu:p.pu===undefined?null:String(p.pu),
  pres:p.pres===undefined?null:String(p.pres),
  niv:p.niv===undefined?null:p.niv,
  sec:p.sec===undefined?null:p.sec,
  mod:p.mod===undefined?null:p.mod,
  src:p.src===undefined?null:p.src
}));
const deTabla=conDB(comoSupabase);
es('trae las 128',deTabla.length,128);

// La comprobación de fondo: partida por partida, campo por campo.
const distintas=[];
for(let i=0;i<BASE.length;i++){
  const a=BASE[i],b=deTabla[i];
  const claves=[...new Set([...Object.keys(a),...Object.keys(b)])].sort();
  for(const k of claves){
    const va=JSON.stringify(a[k]),vb=JSON.stringify(b[k]);
    if(va!==vb)distintas.push('#'+(i+1)+' '+(a.item||a.desc)+' · '+k+': '+va+' vs '+vb);
  }
}
es('las 128 vuelven idénticas',distintas.slice(0,3).join(' | ')||'—','—');
es('  ni una diferencia',distintas.length,0);

console.log('\n== Los decimales no se redondean ==');
// Un precio unitario que pierda un decimal son miles de soles al mes.
const pu=(item)=>deTabla.find(p=>p.item===item).pu;
es('excavadora a 383.32',pu('2.0.1.1.b'),383.32);
es('volquete a 153.48',pu('2.01.14.a'),153.48);
es('tractor a 363.47',pu('2.01.5.1 a'),363.47);
es('cisterna de agua a 28773.20',deTabla.find(p=>p.item==='2.02.1').pu,28773.2);
es('peón a 4714.40',deTabla.find(p=>p.item==='3.01.05').pu,4714.4);

console.log('\n== El orden del documento se respeta ==');
// Si la base devuelve las filas barajadas, la valorización sale desordenada.
const barajado=comoSupabase.slice().reverse();
const reordenado=conDB(barajado);
es('llegando al revés, salen en orden',
   reordenado.map(p=>p.item).join('|'),BASE.map(p=>p.item).join('|'));
es('  la primera sigue siendo el costo directo',reordenado[0].desc,'COSTO DIRECTO');

console.log('\n== De dónde sale la cantidad de cada partida ==');
const tipos={};
deTabla.filter(p=>p.src).forEach(p=>tipos[p.src.t]=(tipos[p.src.t]||0)+1);
es('45 se escriben a mano',tipos.manual,45);
es('10 salen de horas de equipo',tipos.eqHE,10);
es('6 de incidencia mensual',tipos.eqMes,6);
es('35 de mes-hombre del tareaje',tipos.cargo,35);
es('1 es % sobre mano de obra',tipos.pctMOD,1);
es('1 es % sobre costo directo',tipos.pctCD,1);
es('  y suman las 98 hojas',Object.values(tipos).reduce((a,b)=>a+b,0),98);

console.log('\n== El motor las pide por la función, no por el arreglo ==');
const vz=fs.readFileSync(R+'js/valorizacion.js','utf8');
es('valorizacion.js llama a valPresupuesto()',/valPresupuesto\(\)\.map/.test(vz),true);
es('  y ya no usa el arreglo directo',/VAL_PRESUP\.map/.test(vz),false);

console.log('\n== La tabla está declarada donde toca ==');
const cfg=fs.readFileSync(R+'js/config.js','utf8');
es('en SUPA_TABLES',/valPresupuesto:'val_presupuesto'/.test(cfg),true);
es('  y en DB',/valPresupuesto:\[\]/.test(cfg),true);
const reg=fs.readFileSync(R+'js/registro.js','utf8');
const MOD=new Function(reg+';return GDAR_MODULOS;')();
es('los módulos de valorización la piden',
   ['costControl','venta','tarifas'].every(k=>(MOD[k].tablas||[]).includes('valPresupuesto')),true);

console.log('\n== La migración crea la tabla vacía ==');
// Se aplica a TODOS los clientes: sembrar aquí el contrato de ECOSERMO se lo
// metería a cada empresa nueva.
const mig=fs.readFileSync(R+'supabase/migrations/20261001000000_val_presupuesto.sql','utf8');
es('crea la tabla',/create table if not exists public\.val_presupuesto/.test(mig),true);
es('  con RLS cerrado',/enable row level security/.test(mig),true);
es('  y solo para quien inició sesión',/to authenticated/.test(mig),true);
es('  el orden es único',/unique index.*ux_val_presupuesto_orden/s.test(mig),true);
es('NO siembra el contrato de ECOSERMO',/insert into public\.val_presupuesto/.test(mig),false);

const seed=fs.readFileSync(R+'sql/val_presupuesto_ecosermo.sql','utf8');
es('el contrato va aparte, en sql/',(seed.match(/insert into public\.val_presupuesto/g)||[]).length,128);
es('  y se puede volver a correr',/delete from public\.val_presupuesto/.test(seed),true);

console.log('\n'+(mal?'X '+mal+' fallo(s)':'OK todo bien')+'  ·  '+ok+'/'+(ok+mal));
process.exit(mal?1:0);
