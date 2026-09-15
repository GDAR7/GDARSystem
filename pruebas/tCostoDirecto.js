// Control de Costos · Costo Directo. Se cargan el SQL generado y los módulos
// reales (costoIndirecto.js aporta los ayudantes compartidos) y se comprueba el
// cálculo contra el EDP N°3: presupuesto por grupo tal como figura, valorización
// sumada desde las filas y los subtotales declarados que no cuadran.
const fs=require('fs'),vm=require('vm');
const R='c:/Users/LENOVO/OneDrive/Documents/GitHub/GDARSystem/';
let ok=0,mal=0;
const es=(l,g,e)=>{const b=String(g)===String(e);b?ok++:mal++;
  console.log((b?'  OK  ':'  MAL ')+l.padEnd(62)+'= '+g+(b?'':'  (esperado '+e+')'));};
const f2=v=>(+v).toFixed(2);

// ── SQL ─────────────────────────────────────────────────────────────────────
const sql=fs.readFileSync(R+'sql/costo_directo.sql','utf8');
function tuplas(tabla){
  const i=sql.indexOf('insert into public.'+tabla);
  const fin=sql.indexOf('on conflict',i);
  return sql.slice(i,fin).split('\n').filter(l=>l.startsWith('  (')).map(l=>
    [...l.matchAll(/'((?:[^']|'')*)'|null|true|false|-?\d+(?:\.\d+)?/g)].map(m=>
      m[1]!==undefined?m[1].replace(/''/g,"'")
      :m[0]==='null'?null:m[0]==='true'?true:m[0]==='false'?false:Number(m[0])));
}
const V=v=>v==null?'':v;     // como llega a DB después de toCamel
const presup=tuplas('presup_c_dir').map(t=>({id:t[0],proyecto:t[1],item:t[2],itemEdp:V(t[3]),desc:t[4],
  unidad:V(t[5]),cantidad:V(t[6]),precioUnit:V(t[7]),total:V(t[8])}));
const valores=tuplas('valor_c_dir').map(t=>({id:t[0],partidaId:t[1],periodo:t[2],cantidad:V(t[3]),
  total:V(t[4]),totalManual:t[5],creadoPor:t[6]}));
const items=presup.map(p=>p.item);
const esHoja=it=>it!=='0'&&!items.some(o=>o.startsWith(it+'.'));
const idDe=it=>presup.find(p=>p.item===it).id;

console.log('\n== El SQL ==');
es('102 filas de presupuesto (81 partidas, 20 grupos y la meta)',presup.length,102);
es('  81 partidas',presup.filter(p=>esHoja(p.item)).length,81);
es('los ítems renumerados no se repiten',new Set(items).size,items.length);
es('  y todos cuelgan de un grupo que existe',
  items.every(it=>it==='0'||!it.includes('.')||items.includes(it.slice(0,it.lastIndexOf('.')))),true);
es('el código del EDP se conserva (2.01.01.01.a tres veces)',presup.filter(p=>p.itemEdp==='2.01.01.01.a').length,3);
es('la meta total es la fila 0',presup.find(p=>p.item==='0').total,22522290.9);
es('las horas de equipo no traen presupuesto propio',presup.find(p=>p.item==='2.01.01.01').total,'');
es('los grupos sí: Excavadoras',presup.find(p=>p.item==='2.01.01').total,5053690.88);
es('lo declarado por el EDP va sobre las filas de grupo',
  valores.filter(v=>v.creadoPor==='EDP N°3 declarado').every(v=>!esHoja(presup.find(p=>p.id===v.partidaId).item)),true);
es('  y las valorizaciones normales solo en partidas',
  valores.filter(v=>v.creadoPor==='Carga inicial EDP N°3').every(v=>esHoja(presup.find(p=>p.id===v.partidaId).item)),true);
es('RLS y política en las dos tablas',(sql.match(/enable row level security/g)||[]).length+'|'+(sql.match(/create policy gdar_autenticado/g)||[]).length,'2|2');
es('ítem único por proyecto',/unique \(proyecto, item\)/.test(sql),true);
es('una valorización por partida y período',/unique \(partida_id, periodo\)/.test(sql),true);
es('guarda item_edp',/item_edp\s+text/.test(sql),true);

// ── Sandbox ─────────────────────────────────────────────────────────────────
const nodos={};
const nodo=id=>nodos[id]||(nodos[id]={id,innerHTML:'',textContent:'',value:'',style:{},dataset:{}});
let upserts=[],borrados=[],avisos=[],confirmar=true;
const DB={proyectos:[],presupCIndi:[],valorCIndi:[],
  presupCDir:presup.map(p=>({...p})),valorCDir:valores.map(v=>({...v})),nx:{}};
const ctx=vm.createContext({
  DB,console,Date,Math,Number,String,Object,Array,JSON,Map,Set,isFinite,
  localStorage:{getItem:()=>null,setItem(){},removeItem(){}},
  document:{getElementById:nodo,querySelector:()=>nodo('_q'),createElement:()=>({}),body:{appendChild(){}}},
  toast:(m,e)=>avisos.push({m,e:!!e}),confirm:()=>confirmar,openM(){},closeM(){},CU:{nombre:'Prueba'},
  isModuleReadOnly:()=>false,
  supaUpsert:async(k,r)=>{upserts.push({k,r:{...r}});return null;},
  supaDelete:async(k,id)=>{borrados.push({k,id});},
  nidSeguro:(nx,k)=>(DB[k]||[]).reduce((m,r)=>Math.max(m,+r.id||0),0)+1
});
vm.runInContext(fs.readFileSync(R+'js/costoIndirecto.js','utf8'),ctx,{filename:'costoIndirecto.js'});
vm.runInContext(fs.readFileSync(R+'js/costoDirecto.js','utf8'),ctx,{filename:'costoDirecto.js'});
const ev=x=>vm.runInContext(x,ctx);
const P='EPY-004-26';
const calc=per=>ev(`_cdCalcular("${P}","${per}",null)`);
const fila=(D,it)=>D.filas.find(f=>f.item===it);
const sumaFilas=per=>valores.filter(v=>v.periodo===per&&v.creadoPor==='Carga inicial EDP N°3').reduce((s,v)=>s+(+v.total||0),0);

(async()=>{
console.log('\n== Agosto: presupuesto tal como figura, valorización sumada ==');
const A=calc('2026-08');
es('la meta es la del EDP, no la suma de capítulos',f2(A.total.presTot),'22522290.90');
es('Agosto = suma de las filas',f2(A.total.actTot),'1819614.62');
es('  el EDP declaró otra cosa',f2(A.total.decAct),'1885342.77');
es('  diferencia (≈ el Rodillo)',f2(A.total.decAct-A.total.actTot),'65728.15');
es('anterior = suma de las filas hasta Julio',f2(A.total.antTot),f2(sumaFilas('2026-07')));
es('acumulado = anterior + Agosto',f2(A.total.acuTot),f2(A.total.antTot+A.total.actTot));
es('saldo = meta − acumulado',f2(A.total.salTot),f2(22522290.90-A.total.acuTot));
es('% de Agosto contra la meta',ev(`_cdTextosTotal(_cdCalcular("${P}","2026-08",null).total).actPct`),'8.08%');

console.log('\n== Grupos ==');
const Ex=fila(A,'2.01.01');
es('Excavadoras usa su propio presupuesto',f2(Ex.presTot),'5053690.88');
es('Excavadoras suma las tres, incluida la EXC ECOP-003',f2(Ex.actTot),'382285.04');
es('  el EDP declaró sin la 003',f2(Ex.decAct),'276527.05');
es('  y se marca con ⚠',ev(`_cdTextos(_cdCalcular("${P}","2026-08",null).filas.find(f=>f.item==="2.01.01")).actTot`).endsWith(' ⚠'),true);
es('  su % es contra su presupuesto',ev(`_cdTextos(_cdCalcular("${P}","2026-08",null).filas.find(f=>f.item==="2.01.01")).actPct`),'8%');
es('Rodillo cuadra: sin ⚠',ev(`_cdTextos(_cdCalcular("${P}","2026-08",null).filas.find(f=>f.item==="2.01.05")).actTot`).includes('⚠'),false);
es('Rodillo Agosto',f2(fila(A,'2.01.05').actTot),'65728.16');
es('Volquetes Agosto',f2(fila(A,'2.01.07').actTot),'314842.73');
es('Mano de obra Agosto',f2(fila(A,'3').actTot),'594610.74');
es('un grupo muestra su presupuesto aunque sus filas sumen otra cosa',f2(fila(A,'1.01.01').presTot),'259574.64');

console.log('\n== Filas ==');
const E1=fila(A,'2.01.01.01');
es('EXC ECOP-001 (HE) Agosto: 290.90 h',f2(E1.actCant),'290.90');
es('  S/ 111,507.79',f2(E1.actTot),'111507.79');
es('  sin presupuesto propio no tiene saldo',E1.salTot,null);
es('  ni lo muestra en negativo',ev(`_cdTextos(_cdCalcular("${P}","2026-08",null).filas.find(f=>f.item==="2.01.01.01")).salTot`),'');
const M3=fila(A,'1.01.01.03');
es('movilización EXC ECOP-003: presupuesto 14,000',f2(M3.presTot),'14000.00');
es('  valorizada 7,000 en Agosto',f2(M3.acuTot),'7000.00');
es('  saldo 7,000',f2(M3.salTot),'7000.00');
es('Herramientas 5%: total a mano',fila(A,'3.01.06').actManual,true);

console.log('\n== Diferencias con el EDP ==');
const DIF=ev(`_cdDiferencias(_cdCalcular("${P}","2026-08",null))`);
es('lista la de Excavadoras',DIF.some(d=>d.nombre.startsWith('2.01.01 ')&&d.col==='actual'),true);
es('lista la del total de Agosto',DIF.some(d=>d.nombre.startsWith('COSTO DIRECTO')&&d.col==='actual'),true);
es('no lista los grupos que cuadran (Volquetes Agosto)',DIF.some(d=>d.nombre.startsWith('2.01.07 ')&&d.col==='actual'),false);

console.log('\n== Otros períodos ==');
const S=calc('2026-09');
es('Septiembre: anterior = hasta Agosto',f2(S.total.antTot),f2(sumaFilas('2026-07')+sumaFilas('2026-08')));
es('  aún sin valorizar',f2(S.total.actTot),'0.00');
es('  sin lo declarado de Agosto como actual',S.total.decAct,null);
es('abre en el último período con datos',ev(`_cdUltimoPeriodo("${P}")`),'2026-08');

console.log('\n== La pantalla ==');
ev(`_cdProyecto="${P}";_cdPeriodo="2026-08";_cdModo="ver";rCostoDirecto()`);
let H=nodo('ctPanel-cd').innerHTML;
const cuerpo=h=>h.slice(h.indexOf('<tbody>'),h.indexOf('</tbody>'));
const anchos=h=>[...cuerpo(h).matchAll(/<tr[\s\S]*?<\/tr>/g)].map(m=>[...m[0].matchAll(/<td([^>]*)>/g)]
  .reduce((s,c)=>s+(+((c[1].match(/colspan="(\d+)"/)||[])[1])||1),0));
const pie=h=>[...(h.match(/<tfoot>[\s\S]*?<\/tfoot>/)||[''])[0].matchAll(/<td([^>]*)>/g)]
  .reduce((s,c)=>s+(+((c[1].match(/colspan="(\d+)"/)||[])[1])||1),0);
es('101 filas (sin la meta)',anchos(H).length,101);
es('  todas de 18 columnas',[...new Set(anchos(H))].join(','),'18');
es('  y el pie también',pie(H),18);
es('KPI de la meta',/S\/ 22,522,290\.90/.test(H),true);
es('KPI de Agosto avisa lo declarado',/⚠ el EDP declaró S\/ 1,885,342\.77/.test(H),true);
es('aviso de subtotales que no cuadran',/subtotal\(es\) del EDP no cuadran con la suma de sus filas/.test(H),true);
es('pie COSTOS DIRECTOS',/COSTOS DIRECTOS/.test(H),true);
es('el código del EDP en el ítem',/title="Código en el EDP: 2\.01\.01\.01\.a"/.test(H),true);
es('ninguna celda rota',/undefined|NaN/.test(H),false);

ev('_cdModo="valorizar";rCostoDirecto()');
H=nodo('ctPanel-cd').innerHTML;
es('Valorizar: una cantidad por partida',(H.match(/id="cd-in-[\d_]+-c"/g)||[]).length,81);
es('  filas siguen de 18',[...new Set(anchos(H))].join(','),'18');
ev('_cdModo="partidas";rCostoDirecto()');
es('Partidas: 19 columnas',[...new Set(anchos(nodo('ctPanel-cd').innerHTML))].join(','),'19');
ev('_cdModo="ver"');

console.log('\n== Valorizar y guardar ==');
ev(`_cdModo="valorizar";_cdCambios.clear();_cdEdit(${idDe('2.01.07.01')},"cant","200")`);
es('200 h × 153.48',ev(`_cdCambios.get(${idDe('2.01.07.01')}).total`),30696);
es('un pendiente',ev('_cdPendientes().length'),1);
es('el total ya lo refleja',f2(ev(`_cdCalcular("${P}","2026-08",_cdCambios).total.actTot`)),f2(1819614.62-27666.30+30696));
es('  y el pie se refresca',nodo('cd-TOT-actTot').textContent.startsWith('1,822,644.32'),true);
upserts=[];
await ev('_cdGuardar()');
es('se guarda en valor_c_dir',upserts.length===1&&upserts[0].k==='valorCDir',true);
es('  sobre su fila existente',upserts[0].r.id,valores.find(v=>v.partidaId===idDe('2.01.07.01')&&v.periodo==='2026-08').id);
es('lo declarado no se toca',ev('DB.valorCDir.filter(v=>v.creadoPor==="EDP N°3 declarado").length'),valores.filter(v=>v.creadoPor==='EDP N°3 declarado').length);
es('vuelve a ver',ev('_cdModo'),'ver');

console.log('\n== Partidas ==');
const llenar=o=>Object.entries(o).forEach(([k,v])=>{nodo(k).value=v;});
avisos=[];upserts=[];ev('_cdPartidaEdit=null');
llenar({cdPItem:'0',cdPEdp:'',cdPDesc:'x',cdPUnd:'',cdPCant:'',cdPPu:'',cdPTot:''});
await ev('_cdGuardarPartida()');
es('el ítem 0 está reservado',avisos.some(a=>a.e&&/reservado/.test(a.m))&&upserts.length===0,true);
avisos=[];llenar({cdPItem:'2.01.07.16'});
await ev('_cdGuardarPartida()');
es('no deja repetir un ítem',avisos.some(a=>a.e&&/ya existe/.test(a.m)),true);
avisos=[];llenar({cdPItem:'2.01.07.17',cdPEdp:'2.01.07.06.a',cdPDesc:'Camión volquete VOL ECOP-009 (HE)',cdPUnd:'hm',cdPCant:'',cdPPu:'153.48',cdPTot:''});
await ev('_cdGuardarPartida()');
es('crea la partida con su código del EDP',upserts.length===1&&upserts[0].r.itemEdp==='2.01.07.06.a',true);
es('  sin presupuesto propio',upserts[0].r.total,null);
avisos=[];borrados=[];
await ev(`_cdBorrarPartida(${idDe('2.01.07')})`);
es('no deja borrar un grupo con partidas',avisos.some(a=>a.e&&/Primero elimine/.test(a.m))&&borrados.length===0,true);

console.log('\n== Pestañas ==');
ev('_ctTab("cd")');
es('la pestaña Costo Directo muestra su panel',nodo('ctPanel-cd').style.display,'');
es('  y oculta el Indirecto',nodo('ctPanel-ci').style.display,'none');
es('  ya no es "pronto"',/Costo Directo <span[^>]*>· pronto/.test(nodo('ctTabs').innerHTML),false);
ev(`_cdModo="valorizar";_cdCambios.clear();_cdEdit(${idDe('3.01.01')},"cant","7")`);
confirmar=false;ev('_ctTab("ci")');
es('con cambios sin guardar no se va si no confirma',ev('_ctTabAct'),'cd');
confirmar=true;ev('_ctTab("ci")');
es('si confirma, descarta y cambia',ev('_ctTabAct+"|"+_cdCambios.size+"|"+_cdModo'),'ci|0|ver');

console.log('\n== Enganche ==');
const cfg=fs.readFileSync(R+'js/config.js','utf8');
const html=fs.readFileSync(R+'index.html','utf8');
const mod=fs.readFileSync(R+'js/costoDirecto.js','utf8');
es('config: las dos tablas',/presupCDir:'presup_c_dir'/.test(cfg)&&/valorCDir:'valor_c_dir'/.test(cfg),true);
es('config: arreglos en DB',/presupCDir:\[\],valorCDir:\[\]/.test(cfg),true);
es('index: panel del Costo Directo',/id="ctPanel-cd"/.test(html),true);
es('index: script después de costoIndirecto.js',
  html.indexOf('<script src="js/costoDirecto.js')>html.indexOf('<script src="js/costoIndirecto.js'),true);
es('reusa los ayudantes del Indirecto, no los copia',/function _ciNum|const _ciM=/.test(mod),false);
es('todo lo nuevo lleva prefijo _cd',
  [...mod.matchAll(/^(?:const|let|function|async function)\s+([A-Za-z_$][\w$]*)/gm)].map(m=>m[1])
    .every(n=>/^_(cd|CD)/.test(n)||n==='rCostoDirecto'),true);

console.log('\n'+(mal?'X '+mal+' fallo(s)':'OK todo bien')+'  ·  '+ok+'/'+(ok+mal));
process.exit(mal?1:0);
})().catch(e=>{console.error('X la prueba reventó:',e);process.exit(1);});
