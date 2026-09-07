const fs=require('fs');
const R='c:/Users/LENOVO/OneDrive/Documents/GitHub/GDARSystem/';
global.localStorage={getItem:()=>null,setItem:()=>{},removeItem:()=>{}};
const nodos={};
const mk=id=>nodos[id]={id,innerHTML:'',style:{},value:'',textContent:'',classList:{contains:()=>false,add(){},remove(){}}};
['mTarDupBody','tareMes','tbPlanillaBody','mTarDup'].forEach(mk);
nodos.tareMes.value='2026-08';
global.document={getElementById:id=>nodos[id]||null,querySelector:()=>null,querySelectorAll:()=>[]};
global.window={location:{href:'https://x/i.html'},open:()=>null};
let toasts=[];global.toast=m=>toasts.push(m);
global.openM=()=>{};global.closeM=()=>{};
let confirmar=true;global.confirm=()=>confirmar;
global.isModuleReadOnly=()=>false;global.nid=()=>1;let q=0;global.nidSeguro=()=>++q;
const borrados=[];global.supaDelete=async(k,id)=>{borrados.push(k+':'+id);return null;};
global.supaUpsert=async()=>null;global.syncSheet=()=>{};
global.DB={personal:[],tareaje:[],planillaMes:[],afpTasas:[],proyectos:[],planillaCierre:[],planillaCerrada:[]};

const src=fs.readFileSync(R+'js/tareaje.js','utf8')+'\n'+fs.readFileSync(R+'js/tareajeDup.js','utf8')
 +'\n'+fs.readFileSync(R+'js/planilla.js','utf8')+'\n'+fs.readFileSync(R+'js/afpTasas.js','utf8')
 +'\n'+fs.readFileSync(R+'js/planillaCierre.js','utf8')
 +'\n;global._tdupBuscar=_tdupBuscar;global._tdupRender=_tdupRender;global.tarDuplicados=tarDuplicados;'
 +'global.tarDupLimpiarIguales=tarDupLimpiarIguales;global.tarDupResolver=tarDupResolver;'
 +'global._tdupSetMes=_tdupSetMes;global._calcPlanRow=_calcPlanRow;global.PL_COLS=PL_COLS;'
 +'_plGenMes=8;_plGenAnio=2026;';
eval(src);

let ok=0,mal=0;
const es=(l,g,e)=>{const b=String(g)===String(e);b?ok++:mal++;
  console.log((b?'  OK  ':'  MAL ')+l.padEnd(60)+'= '+g+(b?'':'  (esperado '+e+')'));};

// ── El caso real: personal 82, agosto 2026 ────────────────────────────────
DB.personal=[{id:82,dni:'70679516',ape:'URBANO MOSQUERA',nom:'JOSIAS EMMANUEL',
  cargo:'OPERARIO',sue:3000,asig:0,movilidad:0,afp:'SNP',est:'Activo'}];
let nid_=9000;
const m=(tipo,dia,id)=>DB.tareaje.push({id:id||++nid_,personalId:82,
  fecha:'2026-08-'+String(dia).padStart(2,'0'),tipo,proy:'EPY-004-26'});
for(let d=1;d<=13;d++)m('TD',d);           // 11..13 TD
m('F',14);
for(let d=15;d<=19;d++)m('TN',d);
m('DL',20,13128);  m('TD',20,13500);       // día 20: DL y TD  → conflicto
m('DL',21,11296);  m('DL',21,11395);       // día 21: DL y DL  → repetido exacto
for(let d=22;d<=26;d++)m('DL',d);
for(let d=27;d<=31;d++)m('TD',d);

console.log('\n== Los encuentra a los dos, y los separa ==');
let D=_tdupBuscar('2026-08');
es('1 repetido exacto',D.iguales.length,1);
es('  es el día 21',D.iguales[0].clave,'82|2026-08-21');
es('  y los dos dicen DL',D.iguales[0].tipos.join(),'DL');
es('1 en conflicto',D.conflictos.length,1);
es('  es el día 20',D.conflictos[0].clave,'82|2026-08-20');
es('  con DL y TD',D.conflictos[0].tipos.sort().join(' '),'DL TD');
es('el más nuevo va primero',D.iguales[0].regs[0].id,11395);

console.log('\n== La planilla ahora avisa de los dos ==');
const c=_calcPlanRow(DB.personal[0],null);
es('avisa de 2 días',c.fechasDobles.length,2);
es('  el 20, con los dos tipos',c.fechasDobles[0],'20 (DL + TD)');
es('  el 21, repetido',c.fechasDobles[1],'21 (DL x2)');

console.log('\n== Los números no se movieron ==');
es('31 fechas marcadas',c.diasMarcados,31);
es('el DL repetido no infla los libres',c.diasDL,7);   // 20..26 = 7 fechas
es('  el conflicto del 20 sí: 31 pagados cuando solo hay 30',c.diasTotal,31);

console.log('\n== Borrar el repetido exacto ==');
(async()=>{
  await tarDupLimpiarIguales();
  es('borró 1 registro',borrados.length,1);
  es('  el más viejo del día 21',borrados[0],'tareaje:11296');
  es('  y dejó el más nuevo',DB.tareaje.filter(r=>r.fecha==='2026-08-21').map(r=>r.id).join(),'11395');
  es('ya no quedan repetidos',_tdupBuscar('2026-08').iguales.length,0);
  es('el conflicto sigue ahí, sin tocar',_tdupBuscar('2026-08').conflictos.length,1);

  console.log('\n== Resolver el conflicto eligiendo TD ==');
  await tarDupResolver('82|2026-08-20',13500);
  es('borró el DL del 20',borrados[1],'tareaje:13128');
  es('  y quedó el TD',DB.tareaje.filter(r=>r.fecha==='2026-08-20').map(r=>r.tipo).join(),'TD');
  es('ya no queda ningún duplicado',
    _tdupBuscar('2026-08').iguales.length+_tdupBuscar('2026-08').conflictos.length,0);

  const c2=_calcPlanRow(DB.personal[0],null);
  console.log('\n== Y la planilla cuadra ==');
  es('sin avisos',c2.fechasDobles.length,0);
  es('31 fechas marcadas',c2.diasMarcados,31);
  es('DÍAS TOTAL 30 (los 31 menos la falta)',c2.diasTotal,30);
  es('  1 falta',c2.diasF,1);
  es('  30 pagados + 1 falta = 31',c2.diasTotal+c2.diasF,31);
  es('el total ya no supera las fechas',c2.diasTotal<=c2.diasMarcados,true);

  console.log('\n== No borra nada sin permiso ==');
  confirmar=false;
  m('DL',22,20001);                        // otro repetido en el 22
  const antes=borrados.length;
  await tarDupLimpiarIguales();
  es('si se cancela, no borra',borrados.length,antes);
  es('  el registro sigue en su sitio',DB.tareaje.some(r=>+r.id===20001),true);
  confirmar=true;

  console.log('\n== El alcance por mes ==');
  DB.tareaje.push({id:30001,personalId:82,fecha:'2026-07-05',tipo:'TD',proy:'EPY-004-26'});
  DB.tareaje.push({id:30002,personalId:82,fecha:'2026-07-05',tipo:'TD',proy:'EPY-004-26'});
  es('en agosto no aparece el de julio',_tdupBuscar('2026-08').iguales.length,1);
  es('sin filtro de mes, salen los dos',_tdupBuscar('').iguales.length,2);

  console.log('\n== El panel se dibuja ==');
  _tdupSetMes(false);                      // todos los meses
  es('pinta algo',nodos.mTarDupBody.innerHTML.length>0,true);
  es('  nombra a la persona',/URBANO MOSQUERA/.test(nodos.mTarDupBody.innerHTML),true);
  es('  con el botón de limpiar',/tarDupLimpiarIguales\(\)/.test(nodos.mTarDupBody.innerHTML),true);
  es('  y sin conflictos pendientes',/En conflicto · 0|En conflicto/.test(nodos.mTarDupBody.innerHTML),true);
  es('la fecha se ve completa',/2026-07-05/.test(nodos.mTarDupBody.innerHTML),true);

  console.log('\n== Sin duplicados lo dice ==');
  DB.tareaje=DB.tareaje.filter(r=>![20001,30002].includes(+r.id));
  _tdupRender();
  es('mensaje en verde',/Sin días duplicados/.test(nodos.mTarDupBody.innerHTML),true);

  console.log('\n'+(mal?'X '+mal+' fallo(s)':'OK todo bien')+'  ·  '+ok+'/'+(ok+mal));
  process.exit(mal?1:0);
})();
