// Control de Costos · Costo Indirecto. Se cargan el SQL generado y el módulo
// real, y se exige que el sistema reproduzca los números del EDP N°3 (Agosto).
// Si alguien toca el cálculo o la carga inicial y deja de cuadrar con el PDF,
// esta prueba lo dice.
const fs=require('fs'),vm=require('vm');
const R='c:/Users/LENOVO/OneDrive/Documents/GitHub/GDARSystem/';
let ok=0,mal=0;
const es=(l,g,e)=>{const b=String(g)===String(e);b?ok++:mal++;
  console.log((b?'  OK  ':'  MAL ')+l.padEnd(60)+'= '+g+(b?'':'  (esperado '+e+')'));};
const f2=v=>(+v).toFixed(2);

// ── El SQL: se leen las filas tal como irán a Supabase ──────────────────────
const sql=fs.readFileSync(R+'sql/costo_indirecto.sql','utf8');
function tuplas(tabla){
  const i=sql.indexOf('insert into public.'+tabla);
  const fin=sql.indexOf('on conflict',i);
  return sql.slice(i,fin).split('\n').filter(l=>l.startsWith('  (')).map(l=>
    [...l.matchAll(/'((?:[^']|'')*)'|null|true|false|-?\d+(?:\.\d+)?/g)].map(m=>
      m[1]!==undefined?m[1].replace(/''/g,"'")
      :m[0]==='null'?null:m[0]==='true'?true:m[0]==='false'?false:Number(m[0])));
}
// Como llegan a DB después de toCamel: null se vuelve ''
const V=v=>v==null?'':v;
const presup=tuplas('presup_c_indi').map(t=>({id:t[0],proyecto:t[1],item:t[2],desc:t[3],
  unidad:V(t[4]),cantidad:V(t[5]),precioUnit:V(t[6]),total:V(t[7])}));
const valores=tuplas('valor_c_indi').map(t=>({id:t[0],partidaId:t[1],periodo:t[2],
  cantidad:V(t[3]),total:V(t[4]),totalManual:t[5],creadoPor:t[6]}));

console.log('\n== El SQL ==');
es('53 filas de presupuesto (44 partidas + capítulos y grupos)',presup.length,53);
es('80 valorizaciones (39 hasta Julio + 41 de Agosto)',valores.length,80);
es('  39 en 2026-07',valores.filter(v=>v.periodo==='2026-07').length,39);
es('  41 en 2026-08',valores.filter(v=>v.periodo==='2026-08').length,41);
es('crea las dos tablas',/create table if not exists public\.presup_c_indi/.test(sql)
  &&/create table if not exists public\.valor_c_indi/.test(sql),true);
es('una sola valorización por partida y período',/unique \(partida_id, periodo\)/.test(sql),true);
es('un ítem no se repite en el proyecto',/unique \(proyecto, item\)/.test(sql),true);
es('borrar una partida borra sus valorizaciones',/on delete cascade/.test(sql),true);
es('RLS activado en las dos',(sql.match(/enable row level security/g)||[]).length,2);
es('  con la política de siempre',(sql.match(/create policy gdar_autenticado/g)||[]).length,2);
es('  solo para quien inició sesión',(sql.match(/for all to authenticated using \(true\) with check \(true\)/g)||[]).length,2);
es('se puede correr dos veces sin duplicar',(sql.match(/on conflict \(id\) do nothing/g)||[]).length,2);
es('los ids de valorización apuntan a partidas que existen',
  valores.every(v=>presup.some(p=>p.id===v.partidaId)),true);
es('los capítulos y grupos no traen montos',
  presup.filter(p=>['1','1.01','2','3'].includes(p.item)).every(p=>p.total===''),true);

// ── El módulo en un sandbox ─────────────────────────────────────────────────
const nodos={};
const nodo=id=>nodos[id]||(nodos[id]={id,innerHTML:'',textContent:'',value:'',style:{},dataset:{}});
let upserts=[],borrados=[],avisos=[],confirmar=true,falloUpsert=null,soloLectura=false;
const DB={proyectos:[],presupCIndi:presup.map(p=>({...p})),valorCIndi:valores.map(v=>({...v})),nx:{}};
const ctx=vm.createContext({
  DB,console,Date,Math,Number,String,Object,Array,JSON,Map,Set,isFinite,
  localStorage:{getItem:()=>null,setItem(){},removeItem(){}},
  document:{getElementById:nodo,querySelector:()=>nodo('_q'),createElement:()=>({}),body:{appendChild(){}}},
  toast:(m,e)=>avisos.push({m,e:!!e}), confirm:()=>confirmar,
  openM(){},closeM(){},CU:{nombre:'Prueba'},
  isModuleReadOnly:()=>soloLectura,
  supaUpsert:async(k,r)=>{if(falloUpsert&&falloUpsert(r))return{message:'falla simulada'};upserts.push({k,r:{...r}});return null;},
  supaDelete:async(k,id)=>{borrados.push({k,id});},
  nidSeguro:(nxKey,dbKey)=>(DB[dbKey]||[]).reduce((m,r)=>Math.max(m,+r.id||0),0)+1
});
vm.runInContext(fs.readFileSync(R+'js/costoIndirecto.js','utf8'),ctx,{filename:'costoIndirecto.js'});
const ev=x=>vm.runInContext(x,ctx);
const P='EPY-004-26';
const calc=per=>ev(`_ciCalcular("${P}","${per}",null)`);
const fila=(D,item)=>D.filas.find(f=>f.item===item);
const pid=item=>presup.find(p=>p.item===item).id;

(async()=>{
console.log('\n== Agosto: los totales del EDP N°3 ==');
const A=calc('2026-08');
es('presupuesto meta',f2(A.total.presTot),'3649154.58');
es('acumulado anterior (Junio + Julio)',f2(A.total.antTot),'527547.21');
es('valorización actual (Agosto)',f2(A.total.actTot),'509578.80');
es('acumulado actual = anterior + actual',f2(A.total.acuTot),'1037126.01');
es('saldo a valorizar = meta − acumulado',f2(A.total.salTot),'2612028.57');
es('% de avance de Agosto, como el EDP',ev(`_ciTextosTotal(_ciCalcular("${P}","2026-08",null).total).actPct`),'13.96%');

console.log('\n== Los subtotales se suman solos ==');
es('cap. 1 presupuesto',f2(fila(A,'1').presTot),'3138868.69');
es('cap. 1 anterior',f2(fila(A,'1').antTot),'463800.71');
es('cap. 1 Agosto',f2(fila(A,'1').actTot),'414013.69');
es('grupo 1.01 anterior',f2(fila(A,'1.01').antTot),'106476.31');
es('grupo 1.03 anterior',f2(fila(A,'1.03').antTot),'149412.66');
es('grupo 1.05 Agosto',f2(fila(A,'1.05').actTot),'130782.42');
es('cap. 2 Agosto',f2(fila(A,'2').actTot),'21014.00');
es('cap. 3 Agosto',f2(fila(A,'3').actTot),'74551.11');
es('la fila final NO es la del Excel (1,722,792.89)',f2(A.total.antTot)!=='1722792.89',true);

console.log('\n== Una partida: 1.01.01 Ingeniero Residente ==');
const Rs=fila(A,'1.01.01');
es('anterior cant',f2(Rs.antCant),'1.67');
es('anterior total',f2(Rs.antTot),'33546.67');
es('Agosto cant',f2(Rs.actCant),'1.00');
es('Agosto total',f2(Rs.actTot),'20128.00');
es('acumulado cant',f2(Rs.acuCant),'2.67');
es('acumulado total',f2(Rs.acuTot),'53674.67');
es('saldo total',f2(Rs.salTot),'106751.58');
es('saldo en meses-persona (saldo ÷ P.Unit)',f2(Rs.salCant),'5.30');
const TR=ev(`_ciTextos(_ciCalcular("${P}","2026-08",null).filas.find(f=>f.item==="1.01.01"))`);
es('% anterior · actual · acumulado · saldo',[TR.antPct,TR.actPct,TR.acuPct,TR.salPct].join(' · '),'21% · 13% · 33% · 67%');
es('no está marcado como manual (1.00 × 20,128.00 cuadra)',Rs.actManual,false);
es('1.01.03 sí: 2.66 × 10,219.80 no da 27,197.02',fila(A,'1.01.03').actManual,true);
es('  y se ve con ✎',ev(`_ciTextos(_ciCalcular("${P}","2026-08",null).filas.find(f=>f.item==="1.01.03")).actTot`).startsWith('✎ '),true);
es('1.05.01 sin anterior muestra guion',ev(`_ciTextos(_ciCalcular("${P}","2026-08",null).filas.find(f=>f.item==="1.05.01")).antCant`),'–');

console.log('\n== Estructura ==');
es('orden natural de ítems',A.filas.slice(0,4).map(f=>f.item).join(' '),'1 1.01 1.01.01 1.01.02');
es('  1.03.06 va antes que 1.04',A.filas.findIndex(f=>f.item==='1.03.06')<A.filas.findIndex(f=>f.item==='1.04'),true);
es('  la última es 3.15',A.filas[A.filas.length-1].item,'3.15');
es('1.04 es grupo',fila(A,'1.04').hoja,false);
es('2.01 es partida directa del capítulo 2',fila(A,'2.01').hoja,true);
es('2.09 y 3.03 son partidas sin presupuesto',fila(A,'2.09').presTot+fila(A,'3.03').presTot,0);
es('44 partidas',A.filas.filter(f=>f.hoja).length,44);

console.log('\n== El selector de período lo mueve todo ==');
const J=calc('2026-07');
es('Julio: sin anterior',f2(J.total.antTot),'0.00');
es('Julio: actual = lo cargado hasta Julio',f2(J.total.actTot),'527547.21');
const S=calc('2026-09');
es('Septiembre: anterior = Junio + Julio + Agosto',f2(S.total.antTot),'1037126.01');
es('Septiembre: aún sin valorizar',f2(S.total.actTot),'0.00');
es('Junio: todo en cero salvo la meta',f2(calc('2026-06').total.acuTot),'0.00');
es('rango de Agosto',ev('_ciPerRango("2026-08")'),'21/07/2026 al 20/08/2026');
es('Agosto es el EDP N°3',ev(`_ciNumEdp("${P}","2026-08")`),3);
es('Junio es el EDP N°1',ev(`_ciNumEdp("${P}","2026-06")`),1);
es('antes del inicio no se numera',ev(`_ciNumEdp("${P}","2026-05")`),null);
es('otro proyecto sin inicio no se numera',ev('_ciNumEdp("OTRO","2026-08")'),null);
es('diciembre → enero',ev('_ciPerMover("2026-12",1)'),'2027-01');
es('enero → diciembre',ev('_ciPerMover("2026-01",-1)'),'2025-12');
es('abre en el último período valorizado',ev(`_ciUltimoPeriodo("${P}")`),'2026-08');

console.log('\n== Cantidad → total, con total editable ==');
const ap=(prev,campo,v,pu)=>ev(`_ciAplicar(${JSON.stringify(prev)},"${campo}","${v}",${pu})`);
let r=ap({cantidad:null,total:null,manual:false},'cant','1',20128);
es('1 × 20,128 = 20,128',r.total,20128);
es('  no es manual',r.manual,false);
r=ap(r,'tot','20000',20128);
es('escribir otro total lo marca manual',r.manual,true);
r=ap(r,'cant','2',20128);
es('  y cambiar la cantidad ya no lo pisa',r.total,20000);
r=ap(r,'tot','',20128);
es('borrar el total vuelve al cálculo',r.total,40256);
es('  y deja de ser manual',r.manual,false);
es('escribir justo cant × P.U. no es manual',ap({cantidad:2,total:null,manual:false},'tot','40256',20128).manual,false);
es('sin P.Unit no se inventa un total',ap({cantidad:null,total:null,manual:false},'cant','3',null).total,null);

console.log('\n== Editar Agosto: vista previa y pendientes ==');
ev(`_ciProyecto="${P}";_ciPeriodo="2026-08";_ciModo="valorizar";_ciCambios.clear()`);
ev(`_ciEdit(${pid('1.01.01')},"cant","2")`);
es('un cambio pendiente',ev('_ciPendientes().length'),1);
es('los totales ya lo reflejan (+20,128)',f2(ev(`_ciCalcular("${P}","2026-08",_ciCambios).total.actTot`)),'529706.80');
es('  el refresco actualiza el pie de la tabla',nodo('ci-TOT-actTot').textContent,'529,706.80');
es('  y el botón cuenta el cambio',nodo('ci-guardar').textContent,'💾 Guardar (1)');
ev(`_ciEdit(${pid('1.01.01')},"cant","1")`);
es('volver al valor guardado ya no es pendiente',ev('_ciPendientes().length'),0);
ev(`_ciEdit(${pid('3.02')},"cant","")`);
es('tocar una partida vacía sin escribir nada no cuenta',ev('_ciPendientes().length'),0);

console.log('\n== Guardar ==');
ev('_ciCambios.clear()');
ev(`_ciEdit(${pid('1.01.01')},"cant","2")`);   // actualiza una existente
ev(`_ciEdit(${pid('3.02')},"cant","1")`);      // nueva
ev(`_ciEdit(${pid('2.09')},"cant","1")`);      // nueva, en el mismo lote
ev(`_ciEdit(${pid('3.06')},"cant","")`);       // borrar la de Zaranda
es('cuatro pendientes',ev('_ciPendientes().length'),4);
upserts=[];borrados=[];
await ev('_ciGuardar()');
es('tres guardados en Supabase',upserts.length,3);
es('  todos en valor_c_indi',upserts.every(u=>u.k==='valorCIndi'),true);
const resid=upserts.find(u=>u.r.partidaId===pid('1.01.01'));
es('la existente conserva su id',resid.r.id,valores.find(v=>v.partidaId===pid('1.01.01')&&v.periodo==='2026-08').id);
es('  con el nuevo total',resid.r.total,40256);
const nuevos=upserts.filter(u=>u.r.partidaId!==pid('1.01.01')).map(u=>u.r.id).sort((a,b)=>a-b);
es('las nuevas del mismo lote reciben ids distintos',nuevos.join(','),'81,82');
es('  del período elegido',upserts.every(u=>u.r.periodo==='2026-08'),true);
es('  con quién la cargó',upserts.every(u=>u.r.creadoPor==='Prueba'),true);
es('la de Zaranda se borró',borrados.length===1&&borrados[0].id===valores.find(v=>v.partidaId===pid('3.06')&&v.periodo==='2026-08').id,true);
es('DB queda con 81 valorizaciones (80 − 1 + 2)',ev('DB.valorCIndi.length'),81);
es('sin pendientes',ev('_ciPendientes().length'),0);
es('vuelve al modo ver',ev('_ciModo'),'ver');

console.log('\n== Si Supabase falla, no se pierde nada ==');
ev(`_ciModo="valorizar";_ciCambios.clear();_ciEdit(${pid('3.02')},"cant","5");_ciEdit(${pid('1.03.05')},"cant","3")`);
const antes=ev('DB.valorCIndi.length');
falloUpsert=rec=>rec.partidaId===pid('1.03.05');
upserts=[];
await ev('_ciGuardar()');
falloUpsert=null;
es('lo que sí se guardó queda guardado',upserts.length,1);
es('no queda una fila fantasma en DB',ev('DB.valorCIndi.length'),antes);
es('el cambio que falló sigue pendiente',ev('_ciPendientes().length'),1);
es('  y la pantalla sigue en edición',ev('_ciModo'),'valorizar');
ev('_ciCambios.clear();_ciModo="ver"');

console.log('\n== La pantalla ==');
// Se vuelve a los datos del SQL para que los textos coincidan con el EDP
DB.valorCIndi=valores.map(v=>({...v}));
ev(`_ciPeriodo="2026-08";_ciModo="ver";_ciCambios.clear();rCostoIndirecto()`);
let H=nodo('ctPanel-ci').innerHTML;
const cuerpo=h=>h.slice(h.indexOf('<tbody>'),h.indexOf('</tbody>'));
const anchos=h=>[...cuerpo(h).matchAll(/<tr[\s\S]*?<\/tr>/g)].map(m=>[...m[0].matchAll(/<td([^>]*)>/g)]
  .reduce((s,c)=>s+(+((c[1].match(/colspan="(\d+)"/)||[])[1])||1),0));
const pie=h=>[...(h.match(/<tfoot>[\s\S]*?<\/tfoot>/)||[''])[0].matchAll(/<td([^>]*)>/g)]
  .reduce((s,c)=>s+(+((c[1].match(/colspan="(\d+)"/)||[])[1])||1),0);
es('53 filas',anchos(H).length,53);
es('  todas de 18 columnas',[...new Set(anchos(H))].join(','),'18');
es('  y el pie también',pie(H),18);
es('encabezado de Agosto',/Valorización Agosto 2026/.test(H),true);
es('EDP N° 3 con su rango',/EDP N° 3 · 21\/07\/2026 al 20\/08\/2026/.test(H),true);
es('KPI de la meta',/S\/ 3,649,154\.58/.test(H),true);
es('KPI de Agosto con su %',/13\.96% de la meta/.test(H),true);
es('pie COSTOS INDIRECTOS',/COSTOS INDIRECTOS/.test(H),true);
es('ninguna celda rota',/undefined|NaN/.test(H),false);
es('se escapan las comillas de "Contenedor 20""',/Contenedor 20&quot;/.test(H),true);

ev('_ciModo="valorizar";rCostoIndirecto()');
H=nodo('ctPanel-ci').innerHTML;
es('Valorizar: una cantidad por partida',(H.match(/id="ci-in-[\d_]+-c"/g)||[]).length,44);
es('  y un total por partida',(H.match(/id="ci-in-[\d_]+-t"/g)||[]).length,44);
es('  las filas siguen de 18',[...new Set(anchos(H))].join(','),'18');
es('  aparece Guardar',/id="ci-guardar"/.test(H),true);
es('  y el aviso de cómo se valoriza',/Valorizando Agosto 2026/.test(H),true);

ev('_ciModo="partidas";rCostoIndirecto()');
H=nodo('ctPanel-ci').innerHTML;
es('Partidas: una columna más de acciones',[...new Set(anchos(H))].join(','),'19');
es('  el pie también crece',pie(H),19);
es('  y aparece ＋ Partida',/_ciModalPartida\(\)/.test(H),true);

soloLectura=true;ev('_ciModo="valorizar";rCostoIndirecto()');
H=nodo('ctPanel-ci').innerHTML;
es('solo lectura: no se puede valorizar',/_ciSetModo\('valorizar'\)/.test(H)||/id="ci-in-/.test(H),false);
es('  y lo dice',/Solo lectura/.test(H),true);
soloLectura=false;ev('_ciModo="ver"');

console.log('\n== Partidas del presupuesto ==');
const llenar=(o)=>Object.entries(o).forEach(([k,v])=>{nodo(k).value=v;});
avisos=[];upserts=[];
ev('_ciPartidaEdit=null');
llenar({ciPItem:'1.01.01',ciPDesc:'Otro residente',ciPUnd:'mes',ciPCant:'1',ciPPu:'100',ciPTot:'100'});
await ev('_ciGuardarPartida()');
es('no deja repetir un ítem',avisos.some(a=>a.e&&/ya existe/.test(a.m))&&upserts.length===0,true);
avisos=[];llenar({ciPItem:'uno'});
await ev('_ciGuardarPartida()');
es('exige formato de ítem',avisos.some(a=>a.e&&/debe ser como/.test(a.m)),true);
avisos=[];llenar({ciPItem:'1.01.04',ciPDesc:'Ingeniero de Costos',ciPUnd:'mes',ciPCant:'1',ciPPu:'15000',ciPTot:'95000'});
await ev('_ciGuardarPartida()');
es('crea la partida nueva',upserts.length,1);
es('  con id 54',upserts[0].r.id,54);
es('  en el proyecto elegido',upserts[0].r.proyecto,P);
es('  guarda el total del presupuesto tal cual',upserts[0].r.total,95000);
es('  y el grupo 1.01 la suma',f2(ev(`_ciCalcular("${P}","2026-08",null)`).filas.find(f=>f.item==='1.01').presTot),f2(672706.97+95000));

avisos=[];borrados=[];
await ev(`_ciBorrarPartida(${pid('1.01')})`);
es('no deja borrar un grupo con partidas',avisos.some(a=>a.e&&/Primero elimine/.test(a.m))&&borrados.length===0,true);
confirmar=true;
await ev(`_ciBorrarPartida(${pid('1.03.05')})`);
es('borra una partida',borrados.length,1);
es('  y se lleva sus valorizaciones',ev(`DB.valorCIndi.filter(v=>v.partidaId===${pid('1.03.05')}).length`),0);
confirmar=false;borrados=[];
await ev(`_ciBorrarPartida(${pid('1.03.06')})`);
es('si no confirma, no borra',borrados.length,0);
confirmar=true;

console.log('\n== Pestañas de Control de Costos ==');
ev('_ctTabAct="ci";_ctRender()');
es('cinco pestañas',(nodo('ctTabs').innerHTML.match(/<button/g)||[]).length,5);
es('Costo Indirecto visible',nodo('ctPanel-ci').style.display,'');
es('  el registro oculto',nodo('ctPanel-registro').style.display,'none');
ev('_ctTab("registro")');
es('Registro de egresos visible',nodo('ctPanel-registro').style.display,'');
es('  Costo Indirecto oculto',nodo('ctPanel-ci').style.display,'none');
ev('_ctTab("reemb")');
es('Reembolsables queda reservado',/Pestaña reservada/.test(nodo('ctPanel-pronto').innerHTML),true);
ev(`_ctTab("ci");_ciModo="valorizar";_ciCambios.clear();_ciEdit(${pid('2.01')},"cant","9")`);
confirmar=false;ev('_ctTab("registro")');
es('con cambios sin guardar, no cambia de pestaña si no confirma',ev('_ctTabAct'),'ci');
es('  y no pierde el cambio',ev('_ciPendientes().length'),1);
confirmar=true;ev('_ctTab("registro")');
es('si confirma, descarta y cambia',ev('_ctTabAct+"|"+_ciCambios.size'),'registro|0');

console.log('\n== Enganche ==');
const cfg=fs.readFileSync(R+'js/config.js','utf8');
const dat=fs.readFileSync(R+'js/datos.js','utf8');
const html=fs.readFileSync(R+'index.html','utf8');
const mod=fs.readFileSync(R+'js/costoIndirecto.js','utf8');
es('config: tabla de presupuesto',/presupCIndi:'presup_c_indi'/.test(cfg),true);
es('config: tabla de valorizaciones',/valorCIndi:'valor_c_indi'/.test(cfg),true);
es('config: arreglos iniciales en DB',/presupCIndi:\[\],valorCIndi:\[\]/.test(cfg),true);
es('datos.js pinta las pestañas',/function rCostos\(\)\{[\s\S]{0,200}_ctRender\(\)/.test(dat),true);
// Se compara la etiqueta <script>: el nombre del archivo también aparece en un
// comentario de la página, más arriba.
es('index: script después de datos.js',
  html.indexOf('<script src="js/costoIndirecto.js')>html.indexOf('<script src="js/datos.js'),true);
const pag=html.slice(html.indexOf('id="page-costos"'),html.indexOf('<div class="page"',html.indexOf('id="page-costos"')+10));
es('index: pestañas y paneles',['ctTabs','ctPanel-ci','ctPanel-pronto','ctPanel-registro'].every(i=>pag.includes('id="'+i+'"')),true);
es('index: el registro de siempre sigue adentro',
  pag.indexOf('ctPanel-registro')<pag.indexOf('costosKpis')&&pag.indexOf('tbCostos')<pag.indexOf('/ctPanel-registro'),true);
es('todo lo nuevo lleva prefijo _ct / _ci',
  [...mod.matchAll(/^(?:const|let|function|async function)\s+([A-Za-z_$][\w$]*)/gm)].map(m=>m[1])
    .every(n=>/^_(ct|CT|ci|CI)/.test(n)||n==='rCostoIndirecto'),true);

console.log('\n'+(mal?'X '+mal+' fallo(s)':'OK todo bien')+'  ·  '+ok+'/'+(ok+mal));
process.exit(mal?1:0);
})().catch(e=>{console.error('X la prueba reventó:',e);process.exit(1);});
