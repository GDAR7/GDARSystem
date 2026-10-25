// Avisos automáticos: SQL (revisión diaria + pg_cron), Edge Function
// (correo-resumen por EmailJS) y la campana 🔔 del GDAR.
const fs=require('fs'),vm=require('vm');
const R='c:/Users/LENOVO/OneDrive/Documents/GitHub/GDARSystem/';
let ok=0,mal=0;
const es=(l,g,e)=>{const b=String(g)===String(e);b?ok++:mal++;
  console.log((b?'  OK  ':'  MAL ')+l.padEnd(62)+'= '+g+(b?'':'  (esperado '+e+')'));};

const SQL=fs.readFileSync(R+'sql/avisos_automaticos.sql','utf8');
const FN=fs.readFileSync(R+'supabase/functions/avisos-diarios/index.ts','utf8');
const IX=fs.readFileSync(R+'index.html','utf8');
const UT=fs.readFileSync(R+'js/utils.js','utf8');

console.log('\n== SQL: qué revisa ==');
es('tabla de avisos, sin duplicar en el mismo día',/create table if not exists public\.avisos/.test(SQL)&&/unique \(fecha, clave\)/.test(SQL),true);
es('los 5 documentos de equipos',['soat_venc','poliza_trec_venc','revision_tecnica_venc','ric_venc','gps_venc'].every(c=>SQL.includes('e.'+c)),true);
es('  con el nombre «Póliza de Seguros»',/'Póliza de Seguros'/.test(SQL),true);
es('  avisa a 30, 15, 7, 3, 2, 1 días y el mismo día',/in \(30, 15, 7, 3, 2, 1, 0\)/.test(SQL),true);
es('  vencido: el día siguiente y luego cada lunes',/d\.venc = p_dia - 1/.test(SQL)&&/isodow from p_dia\) = 1/.test(SQL),true);
es('  sin equipos desmovilizados (estado ni subtipo)',/coalesce\(e\.est, ''\) <> 'Desmovilizado'/.test(SQL)&&/coalesce\(e\.sub, ''\) <> 'Desmovilizado'/.test(SQL),true);
es('parte de turno de ayer, Día y Noche',/values \('Día'\), \('Noche'\)/.test(SQL)&&/p\.fecha = p_dia - 1 and p\.turno = t\.turno/.test(SQL),true);
es('el día se cuenta en hora de Perú',/now\(\) at time zone 'America\/Lima'/.test(SQL),true);
es('cada aviso lleva al módulo que lo resuelve',/'masterEquipos'/.test(SQL)&&/'supervision'/.test(SQL),true);

console.log('\n== SQL: seguridad y horario ==');
es('el sistema solo lee los avisos',/for select to authenticated/.test(SQL)&&!/grant (insert|update|delete)[^;]*avisos to authenticated/.test(SQL),true);
es('los correos no se leen desde el navegador',/revoke all on public\.avisos_correo from anon, authenticated/.test(SQL),true);
es('la revisión no la puede llamar cualquiera',/revoke all on function public\.revisar_avisos\(date\) from public, anon, authenticated/.test(SQL),true);
es('destinatario: arodrigueza@ecosermo.com',/values \('arodrigueza@ecosermo\.com'\)/.test(SQL),true);
es('9:00 a.m. Perú = 14:00 UTC la revisión',/'gdar_revisar_avisos', '0 14 \* \* \*'/.test(SQL),true);
es('9:05 el correo',/'gdar_correo_avisos', '5 14 \* \* \*'/.test(SQL),true);
es('el secreto va cifrado en Vault, no escrito en el archivo',/vault\.create_secret\(replace\(gen_random_uuid/.test(SQL)&&/vault\.decrypted_secrets/.test(SQL),true);
es('ninguna llave secreta en el SQL',/service_role|sb_secret_|eyJhbGci/.test(SQL),false);
es('se puede correr dos veces',/cron\.unschedule/.test(SQL)&&/on conflict \(correo\) do nothing/.test(SQL),true);

console.log('\n== Edge Function: el correo ==');
const fctx=vm.createContext({console,Date,JSON,String,Number,Array,Object,Set,Math});
vm.runInContext(FN.replace(/^const /gm,'var '),fctx,{filename:'index.ts'});
const AV=[
  {id:1,tipo:'equipo_doc',nivel:'proximo',dias:30,titulo:'VOL ECOP-001 · SOAT vence en 30 día(s)',detalle:'Volquete · vence el 24/11/2026'},
  {id:2,tipo:'equipo_doc',nivel:'vencido',dias:-1,titulo:'EXC ECOP-003 · Póliza de Seguros VENCIDO hace 1 día(s)',detalle:'Excavadora · vence el 24/10/2026'},
  {id:3,tipo:'parte_falta',nivel:'falta',dias:null,titulo:'Falta el parte de turno Noche del 24/10/2026',detalle:'Nadie registró…'},
  {id:4,tipo:'equipo_doc',nivel:'urgente',dias:3,titulo:'CAM ECOP-002 · GPS vence en 3 día(s)',detalle:''}
];
const C=fctx.armarCorreo(AV,'2026-10-25');
es('asunto con cantidad y lo urgente',C.subject,'GDAR · 4 avisos del 25/10/2026 · 3 requieren atención');
es('primero lo vencido, luego lo urgente',C.message.indexOf('EXC ECOP-003')<C.message.indexOf('CAM ECOP-002')&&C.message.indexOf('CAM ECOP-002')<C.message.indexOf('VOL ECOP-001'),true);
es('agrupado: documentos y partes',/DOCUMENTOS DE EQUIPOS \(3\)/.test(C.message)&&/PARTES DE TURNO NO RECIBIDOS \(1\)/.test(C.message),true);
es('con el enlace al sistema',/https:\/\/ecosermo\.gdarei\.com/.test(C.message),true);
es('un solo aviso: singular',fctx.armarCorreo([AV[0]],'2026-10-25').subject,'GDAR · 1 aviso del 25/10/2026');
es('cada destinatario recibe solo sus tipos',fctx.avisosPara(AV,{tipos:['parte_falta']}).map(a=>a.id).join(),'3');
es('hoy se calcula en hora de Perú (00:30 UTC del 26 = 25 en Perú)',fctx.hoyLima(Date.parse('2026-10-26T00:30:00Z')),'2026-10-25');
es('sin el secreto responde 401',/req\.headers\.get\('x-gdar-secreto'\) !== secreto\) return responder\(401/.test(FN),true);
es('marca lo enviado para no repetirlo',/enviado_en=is\.null/.test(FN)&&/enviado_en: new Date\(\)\.toISOString\(\)/.test(FN),true);
es('usa la plantilla de Notificaciones (to_email, subject, message)',/template_params: \{ to_email: para, cc_email: '', subject: correo\.subject, message: correo\.message \}/.test(FN),true);
es('las llaves salen de los secretos del servidor',['EMAILJS_SERVICE_ID','EMAILJS_TEMPLATE_ID','EMAILJS_PUBLIC_KEY','EMAILJS_PRIVATE_KEY','SUPABASE_SERVICE_ROLE_KEY','GDAR_AVISOS_SECRETO'].every(k=>FN.includes("Deno.env.get('"+k+"')")),true);
es('  y ninguna llave escrita en el código',/sb_secret_|sb_publishable_|eyJhbGci|['"](service|template)_[a-z0-9]{6,}['"]/.test(FN),false);
es('tiene modo de prueba',/cuerpo\.prueba/.test(FN),true);

console.log('\n== La campana ==');
const cfg=fs.readFileSync(R+'js/config.js','utf8');
const areasSrc=cfg.slice(cfg.indexOf('const AREAS='),cfg.indexOf('\n};',cfg.indexOf('const AREAS='))+3);
const USERS=(()=>{const c={document:{getElementById:()=>null}};vm.createContext(c);
  vm.runInContext(fs.readFileSync(R+'js/empresa.js','utf8')+';this.__U=EMPRESA_USERS;',c);return c.__U;})();
const modUnico=UT.slice(UT.indexOf('function _cuModuloUnico()'),UT.indexOf('\n}',UT.indexOf('function _cuModuloUnico()'))+2);
async function campana(codigo,filas,falla){
  const nodos={},mem={};let consultas=0;
  const nodo=id=>nodos[id]||(nodos[id]={id,style:{},textContent:'',innerHTML:'',title:''});
  const q={select(){return q;},gte(){return q;},order(){return q;},
    then(res){consultas++;return Promise.resolve(falla?{data:null,error:{message:'relation "avisos" does not exist'}}:{data:filas,error:null}).then(res);}};
  const ctx=vm.createContext({console,Date,JSON,String,Number,Array,Object,Set,Math,Promise,setTimeout,
    document:{getElementById:nodo,createElement:()=>({style:{},set textContent(v){}}),head:{appendChild(){}},body:{appendChild(){}},addEventListener(){}},
    localStorage:{getItem:k=>mem[k]??null,setItem:(k,v)=>{mem[k]=v;}},
    supa:{from:()=>q}});
  vm.runInContext(areasSrc.replace('const AREAS','var AREAS')+'\nvar CU=null;\n'+modUnico+'\n'+fs.readFileSync(R+'js/avisos.js','utf8').replace(/^const /gm,'var ').replace(/^let /gm,'var '),ctx);
  ctx.CU=USERS(ctx.AREAS).find(u=>u.codigo===codigo);
  await vm.runInContext('_avCargar()',ctx);
  return {ctx,nodo,consultas,mem};
}
const hoy=new Date(Date.now()-5*3600*1000).toISOString().slice(0,10);
const FILAS=[
  {id:11,fecha:hoy,tipo:'equipo_doc',nivel:'urgente',titulo:'VOL ECOP-001 · SOAT vence en 7 día(s)',modulo:'masterEquipos'},
  {id:12,fecha:hoy,tipo:'parte_falta',nivel:'falta',titulo:'Falta el parte de turno Noche',modulo:'supervision'}
];
(async()=>{
let r=await campana('EIBEL25',FILAS);
es('administrador: ve los dos avisos',r.ctx._avLista.length,2);
es('  la campana aparece',r.nodo('btnAvisos').style.display,'');
es('  con 2 nuevos en rojo',r.nodo('avBadge').textContent+' · '+r.nodo('avBadge').style.display,'2 · ');
vm.runInContext('_avMarcarVisto();_avPintarBoton()',r.ctx);
es('  al abrirla, quedan vistos',r.nodo('avBadge').style.display,'none');
const P=vm.runInContext('_avPanelHtml()',r.ctx);
es('  cada aviso lleva a su módulo',/_avIr\('masterEquipos'\)/.test(P)&&/_avIr\('supervision'\)/.test(P),true);
es('  agrupado bajo «Hoy»',/class="av-dia">Hoy · 2</.test(P),true);
r=await campana('ELIDA',FILAS);
es('Elida (Máster de Equipos, sin Supervisión): solo el de equipos',r.ctx._avLista.map(a=>a.id).join(),'11');
r=await campana('ERV_RO',FILAS);
es('gente de campo: ni consulta (carga liviana)',r.consultas+' · '+r.nodo('btnAvisos').style.display,'0 · none');
r=await campana('EIBEL25',FILAS,true);
es('sin la tabla todavía, la campana no aparece',r.nodo('btnAvisos').style.display,'none');
r=await campana('EIBEL25',[]);
es('sin avisos, tampoco',r.nodo('btnAvisos').style.display,'none');
const esc=vm.runInContext('_avEsc("<b>")',r.ctx);
es('el texto no se interpreta como código',esc,'&lt;b&gt;');

console.log('\n== Inoperatividad de los últimos 7 días ==');
es('ventana: de hace 7 días a ayer',(SQL.match(/p\.fecha between p_dia - 7 and p_dia - 1/g)||[]).length,2);
es('inoperativo: por condición o por horas, pero el STANDBY no cuenta',
  /ilike 'INOPERATIVO%'/.test(SQL)&&/ilike 'OPERATIVO\/INOPERATIVO%'/.test(SQL)&&/coalesce\(p\.im, 0\) > 0 and coalesce\(p\.condicion, ''\) not ilike '%STANDBY%'/.test(SQL),true);
es('un aviso por equipo (clave inop:equipo)',/'inop:' \|\| a\.eq_id/.test(SQL),true);
es('dice si sigue inoperativo o ya opera (según su último parte)',/case when u\.es_inop then 'inoperativo' else 'recuperado' end/.test(SQL),true);
es('el motivo sale del último parte inoperativo con observación',/order by eq_id, fecha desc, id desc/.test(SQL)&&/'Motivo: ' \|\| motivo_inop\(m\.observaciones\)/.test(SQL),true);
es('lleva al Reporte de Equipos',(SQL.match(/'reporteEquipos'/g)||[]).length,2);
es('datos a corregir: standby con horas y partes sin motivo',/en STANDBY con/.test(SQL)&&/sin motivo en Observaciones/.test(SQL),true);
es('el destinatario ya existente recibe los tipos nuevos',/set tipos = tipos \|\| array\['equipo_inop','dato_inop'\]/.test(SQL),true);
// El clasificador: las reglas se leen del propio SQL y se aplican a textos reales
const reglas=[...SQL.slice(SQL.indexOf('function public.motivo_inop'),SQL.indexOf('create or replace function public.revisar_avisos'))
  .matchAll(/when t ~ '([^']+)'\s+then '([^']+)'/g)].map(m=>[new RegExp(m[1].replace(/\\m/g,'\\b')),m[2]]);
const motivo=txt=>{const t=String(txt||'').trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'');
  if(!t||/^[-. ]*$/.test(t))return 'Sin motivo registrado';const r=reglas.find(([re])=>re.test(t));return r?r[1]:'Otros';};
es('el SQL tiene 10 categorías con regla (más «Sin motivo registrado»)',reglas.length,10);
[['Equipo inoperativo (recalentamiento de cables).','Eléctrico'],
 ['Equipo inoperativo por lainas en el varillaje del cucharon y pm3.','Implemento / tren de rodaje'],
 ['-Equipo inoperativo por falla mecánica en la rotación y cambio de neumáticos.','Neumáticos'],
 ['Volquete inoperativo por llanta baja posición 10 desde las 4:20 am.','Neumáticos'],
 ['Equipo Inoperativo (Falla del sistema de aire).','Sistema de aire'],
 ['- Equipo inoperativo por falla en el cinturón de seguridad, 08:20 - 14:20.','Seguridad'],
 ['Equipo inoperativo por reparación de tanque de agua.','Estructura / cabina / tanque'],
 ['Inoperativo por PM 2','Mantenimiento preventivo (PM)'],
 ['fuga de aceite hidráulico en cilindro de levante','Hidráulico'],
 ['Equipo inoperativo ubicado en mesa de plata.','Otros'],
 ['-','Sin motivo registrado'],
 ['','Sin motivo registrado']
].forEach(([t,c])=>es('  «'+t.slice(0,44)+'»',motivo(t),c));

console.log('\n== La campana: un aviso por equipo ==');
{
  const filas=[
    {id:30,fecha:hoy,tipo:'equipo_inop',nivel:'inoperativo',clave:'inop:5',titulo:'EXC ECOP-001 · sigue INOPERATIVO · 70.0 h paradas en 7 días',modulo:'reporteEquipos'},
    {id:20,fecha:'2026-01-01',tipo:'equipo_inop',nivel:'inoperativo',clave:'inop:5',titulo:'EXC ECOP-001 (de un día anterior)',modulo:'reporteEquipos'},
    {id:31,fecha:hoy,tipo:'equipo_inop',nivel:'recuperado',clave:'inop:9',titulo:'VOL ECOP-002 · ya opera · 20.0 h',modulo:'reporteEquipos'},
    {id:32,fecha:hoy,tipo:'dato_inop',nivel:'dato',clave:'dato:7',titulo:'VOL ECOP-010 · revisar partes',modulo:'reporteEquipos'},
    {id:21,fecha:'2026-01-01',tipo:'equipo_doc',nivel:'proximo',clave:'eq:1:soat',titulo:'doc A',modulo:'masterEquipos'},
    {id:22,fecha:'2026-01-02',tipo:'equipo_doc',nivel:'urgente',clave:'eq:1:soat',titulo:'doc B',modulo:'masterEquipos'}
  ];
  const r2=await campana('EIBEL25',filas);
  const ids=r2.ctx._avLista.map(a=>a.id).join();
  es('de cada equipo inoperativo queda solo el aviso más reciente',ids.includes('30')&&!ids.split(',').includes('20'),true);
  es('los documentos sí se ven día por día (cada umbral es un aviso)',ids.includes('21')&&ids.includes('22'),true);
  const P2=vm.runInContext('_avPanelHtml()',r2.ctx);
  es('etiquetas: Inoperativo, Ya opera, Revisar dato',/>Inoperativo</.test(P2)&&/>Ya opera</.test(P2)&&/>Revisar dato</.test(P2),true);
  es('  y llevan al Reporte de Equipos',/_avIr\('reporteEquipos'\)/.test(P2),true);
  const rj=await campana('J_A_TA',filas);
  es('Javier Tamara (Reporte de Equipos, sin Máster) ve los de inoperatividad, no los de documentos',
    rj.ctx._avLista.every(a=>a.modulo==='reporteEquipos')&&rj.ctx._avLista.length===3,true);
  const C2=fctx.armarCorreo(filas.filter(a=>a.fecha===hoy),hoy);
  es('el correo (cuando se active) tiene su sección',/INOPERATIVIDAD · ÚLTIMOS 7 DÍAS \(2\)/.test(C2.message)&&/PARTES DE EQUIPOS A CORREGIR \(1\)/.test(C2.message),true);
  es('  y cuenta el inoperativo como urgente',/· 1 requiere atención/.test(C2.subject),true);
}

console.log('\n== Conexión ==');
es('botón en la cabecera, antes de Actualizar',IX.indexOf('id="btnAvisos"')>0&&IX.indexOf('id="btnAvisos"')<IX.indexOf('id="btnRefresh"'),true);
es('script cargado',/<script src="js\/avisos\.js\?v=\d+"><\/script>/.test(IX),true);
es('se carga al entrar',/if\(typeof _avCargar==='function'\)_avCargar\(\);/.test(UT),true);

console.log('\n'+(mal?'✗ '+mal+' FALLAS':'OK todo bien')+'  ·  '+ok+'/'+(ok+mal));
process.exit(mal?1:0);
})();
