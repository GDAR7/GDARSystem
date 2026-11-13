// ══════════════════════════════════════════════════════════════════════════
//  CONTROL DE EQUIPOS · AVANCE DE VIAJES
//
//  Corte de viajes de volquetes a media jornada: cuántos viajes van hasta la
//  hora del corte (antes de que exista el parte físico) y qué restricciones
//  están frenando el ritmo (pase cerrado, voladura, clima…), cada una ubicada
//  en la misma imagen aérea del Parte de Turno. Sale en PDF con el mismo
//  formato.
//
//  Los viajes se cargan a mano: al mediodía todavía no hay partes. Si después
//  llega el parte del día, se muestra al lado para comparar el corte con el
//  cierre real.
//
//  Datos: avance_viajes (sql/avance_viajes.sql), leída aquí mismo al abrir.
//  Del Parte de Turno (js/parteTurno.js) se reutilizan, sin tocarlos: la imagen
//  y sus frentes, el plano con números del PDF y las librerías del PDF.
//
//  Prefijo _avj.
// ══════════════════════════════════════════════════════════════════════════

const _AVJ_TABLA='avance_viajes';
const _AVJ_MOTIVOS=['Pase cerrado / tránsito restringido','Voladura','Lluvia / clima',
  'Frente sin liberar (topografía / QA)','Equipo de carguío inoperativo','Volquete en mantenimiento',
  'Espera de carguío / cola','Vía en mal estado','Falta de operador','Otro'];
const _AVJ_NO_OPERA=['Mantenimiento','Sin operador','Stand by','Inoperativo','Otro'];
// Horario de cada turno (12 h). La proyección lleva el ritmo del corte al cierre.
const _AVJ_TURNOS={'Día':{ini:7,corte:'12:00'},'Noche':{ini:19,corte:'00:00'}};
const _AVJ_HORAS_TURNO=12;
const _AVJ_FOTOS_MAX=12;
const _AVJ_AZ='#1e3a5f', _AVJ_AC='#b45309';
const _AVJ_ZOOMS=[100,175,250,350];

let _avj=null;                 // el corte que se está llenando
let _avjListo=null,_avjFalta=false;
let _avjDoc=null;              // el corte abierto en el visor
let _avjMapI=null,_avjMapPt=null,_avjMapZ=0;

// Qué tarjetas y columnas salen en el PDF. Se recuerda en este equipo.
const _AVJ_VIS_KEY='gdar_avj_pdf';
let _avjVisO=null;
function _avjVisTodo(){
  if(!_avjVisO){try{_avjVisO=JSON.parse(localStorage.getItem(_AVJ_VIS_KEY)||'{}')||{};}catch(e){_avjVisO={};}}
  return _avjVisO;
}
// Por defecto no salen la proyección, la meta ni el operador; el resto sí.
const _AVJ_VIS_DEF={proy:false,meta:false,operador:false};
const _avjVe=k=>{const o=_avjVisTodo();return k in o?!!o[k]:_AVJ_VIS_DEF[k]!==false;};
function _avjSetVis(k,on){
  _avjVisTodo()[k]=!!on;
  try{localStorage.setItem(_AVJ_VIS_KEY,JSON.stringify(_avjVisO));}catch(e){}
  _avjPintarKpis();_avjPintarVol();
}
const _avjChk=k=>`<label class="avj-pdf${_avjVe(k)?'':' off'}" title="Mostrar en el PDF"><input type="checkbox"${_avjVe(k)?' checked':''} onchange="_avjSetVis('${k}',this.checked)">PDF</label>`;

const _avjEsc=s=>String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const _avjN=v=>{const n=parseFloat(v);return isFinite(n)?n:0;};
const _avjHoyISO=()=>typeof today==='function'?today():new Date().toISOString().slice(0,10);
const _avjQuien=()=>(typeof CU!=='undefined'&&CU&&(CU.nombre||CU.codigo))||'';
function _avjFechaLarga(f){return typeof _ptFechaLarga==='function'?_ptFechaLarga(f):String(f||'');}
function _avjDMY(f){const p=String(f||'').split('-');return p.length===3?`${p[2]}/${p[1]}/${p[0]}`:String(f||'');}

// ── Datos de apoyo ─────────────────────────────────────────────────────────
// Volquetes del Máster que no estén desmovilizados
function _avjVolquetesMaster(){
  return (DB.equipos||[]).filter(e=>/volquete/i.test(String(e.sub||''))&&String(e.est||'')!=='Desmovilizado')
    .sort((a,b)=>String(a.codigo||'').localeCompare(String(b.codigo||''),'es',{numeric:true}));
}
// El último operador que manejó el equipo, según los partes
function _avjUltimoOperador(eqId){
  let u=null;
  (DB.partes||[]).forEach(p=>{if(+p.eqId===+eqId&&p.op&&(!u||String(p.fecha)>String(u.fecha)))u=p;});
  return u?String(u.op).trim():'';
}
// Orígenes, destinos y materiales usados en los partes, los más frecuentes primero
function _avjSugerencias(){
  const c={o:{},d:{},m:{}};
  (DB.partes||[]).forEach(p=>(p.viajes||[]).forEach(v=>{
    const n=_avjN(v.cant)||1;
    if(v.origen)c.o[v.origen]=(c.o[v.origen]||0)+n;
    if(v.destino)c.d[v.destino]=(c.d[v.destino]||0)+n;
    if(v.material)c.m[v.material]=(c.m[v.material]||0)+n;
  }));
  const top=o=>Object.keys(o).sort((a,b)=>o[b]-o[a]).slice(0,40);
  return{origenes:top(c.o),destinos:top(c.d),materiales:top(c.m)};
}
// La ruta que más usó el volquete en sus últimos partes: se ofrece de entrada
function _avjRutaHabitual(eqId){
  const ps=(DB.partes||[]).filter(p=>+p.eqId===+eqId&&(p.viajes||[]).length)
    .sort((a,b)=>String(b.fecha).localeCompare(String(a.fecha))).slice(0,5);
  const c={};
  ps.forEach(p=>p.viajes.forEach(v=>{const k=[v.origen||'',v.destino||'',v.material||''].join('|');c[k]=(c[k]||0)+_avjN(v.cant);}));
  const k=Object.keys(c).sort((a,b)=>c[b]-c[a])[0];
  if(!k)return{origen:'',destino:'',material:''};
  const [origen,destino,material]=k.split('|');
  return{origen,destino,material};
}
// Viajes del parte final de ese día y turno, por volquete (para comparar)
function _avjParteFinal(fecha,turno){
  const t=turno==='Noche'?'NOCHE':'DIA';
  const m={};
  (DB.partes||[]).forEach(p=>{
    if(String(p.fecha||'').slice(0,10)!==fecha||String(p.turno||'').toUpperCase()!==t)return;
    const v=(p.viajes||[]).length?p.viajes.reduce((s,x)=>s+_avjN(x.cant),0):_avjN(p.nViajes);
    m[p.eqId]=(m[p.eqId]||0)+v;
  });
  return m;
}

// ── Cálculos del corte ─────────────────────────────────────────────────────
const _avjMin=h=>{const m=/^(\d{1,2}):(\d{2})/.exec(String(h||''));return m?(+m[1])*60+(+m[2]):null;};
// Horas entre dos horas del día (pasa la medianoche si hace falta)
function _avjHorasEntre(ini,fin){
  const a=_avjMin(ini),b=_avjMin(fin);
  if(a==null||b==null)return 0;
  let d=b-a;if(d<0)d+=1440;
  return Math.round(d/6)/10;
}
function _avjCalc(r){
  const vol=r.volquetes||[];
  const opera=vol.filter(v=>!v.noOpera);
  const viajes=opera.reduce((s,v)=>s+_avjN(v.viajes),0);
  const conViajes=opera.filter(v=>_avjN(v.viajes)>0).length;
  const T=_AVJ_TURNOS[r.turno]||_AVJ_TURNOS['Día'];
  const cm=_avjMin(r.horaCorte);
  let transc=null;
  if(cm!=null){let d=cm-T.ini*60;if(d<0)d+=1440;transc=Math.round(d/6)/10;}
  const valida=transc!=null&&transc>0&&transc<=_AVJ_HORAS_TURNO;
  const proy=valida?Math.round(viajes*_AVJ_HORAS_TURNO/transc):null;
  const meta=_avjN(r.meta);
  const metaTurno=meta>0?meta*opera.length:0;
  const metaAlCorte=metaTurno&&valida?Math.round(metaTurno*transc/_AVJ_HORAS_TURNO):0;
  const horasPerdidas=(r.restricciones||[]).reduce((s,x)=>s+_avjHorasEntre(x.ini,x.fin),0);
  return{viajes,opera:opera.length,total:vol.length,conViajes,
    promedio:opera.length?viajes/opera.length:0,transc:valida?transc:null,proy,
    meta,metaTurno,metaAlCorte,pctCorte:metaAlCorte?viajes/metaAlCorte*100:null,
    horasPerdidas:Math.round(horasPerdidas*10)/10};
}
// Viajes por ruta (origen → destino · material)
function _avjPorRuta(r){
  const m={};
  (r.volquetes||[]).forEach(v=>{
    if(v.noOpera||!_avjN(v.viajes))return;
    const k=[v.origen||'—',v.destino||'—',v.material||''].join('|');
    (m[k]=m[k]||{origen:v.origen||'—',destino:v.destino||'—',material:v.material||'',viajes:0,vol:0}).viajes+=_avjN(v.viajes);
    m[k].vol++;
  });
  return Object.values(m).sort((a,b)=>b.viajes-a.viajes);
}

// ── Carga de la tabla ──────────────────────────────────────────────────────
function _avjDeFila(f){
  return{id:f.id,fecha:String(f.fecha||'').slice(0,10),turno:f.turno,horaCorte:f.hora_corte,meta:+f.meta||0,
    volquetes:f.volquetes||[],restricciones:f.restricciones||[],observaciones:f.observaciones||'',
    autor:f.autor||'',creadoEn:f.creado_en,actualizadoEn:f.actualizado_en};
}
function _avjCargar(forzar){
  if(_avjListo&&!forzar)return _avjListo;
  _avjListo=(async()=>{
    try{
      const{data,error}=await supa.from(_AVJ_TABLA).select('*').order('fecha',{ascending:false}).limit(400);
      if(error)throw error;
      DB.avanceViajes=(data||[]).map(_avjDeFila);
      _avjFalta=false;
    }catch(e){
      _avjFalta=true;
      DB.avanceViajes=DB.avanceViajes||[];
      console.warn('[Avance de viajes] no se pudo leer '+_AVJ_TABLA+':',(e&&e.message)||e);
    }
  })();
  return _avjListo;
}

// ── Un corte nuevo ─────────────────────────────────────────────────────────
function _avjNuevo(fecha,turno){
  const h=new Date().getHours();
  turno=turno||((h>=7&&h<19)?'Día':'Noche');
  let meta=0;try{meta=+localStorage.getItem('gdar_avj_meta')||0;}catch(e){}
  return{id:null,fecha:fecha||_avjHoyISO(),turno,horaCorte:_AVJ_TURNOS[turno].corte,meta,
    volquetes:_avjVolquetesMaster().map(e=>({eqId:+e.id,codigo:e.codigo,operador:_avjUltimoOperador(e.id),
      viajes:'',..._avjRutaHabitual(e.id),noOpera:false,motivo:''})),
    restricciones:[],observaciones:''};
}

// ── Página ─────────────────────────────────────────────────────────────────
function rAvanceViajes(){
  const pg=document.getElementById('page-avanceViajes');if(!pg)return;
  if(!_avj)_avj=_avjNuevo();
  pg.innerHTML=`
    <div class="ph"><div class="ph-title" style="color:#f59e0b">🚛 Avance de Viajes</div>
      <div class="ph-sub">Viajes de volquetes al corte de media jornada y las restricciones que frenan el ritmo · antes del parte físico</div></div>
    ${_avjEstilos()}
    <div id="avjAviso"></div>
    <div id="avjForm"></div>
    <div id="avjHist"></div>`;
  _avjPintar();
  _avjCargar().then(()=>{_avjPintarAviso();_avjPintarHist();});
}
function _avjPintarAviso(){
  const el=document.getElementById('avjAviso');if(!el)return;
  el.innerHTML=_avjFalta?`<div style="margin-bottom:.8rem;padding:.6rem .8rem;border:1px solid #ef444470;background:rgba(239,68,68,.1);border-radius:8px;font-size:.78rem;color:#f87171">
    ⚠ Falta ejecutar <b>sql/avance_viajes.sql</b> en Supabase: se puede llenar el corte y ver el PDF, pero no se guardará.</div>`:'';
}

// Si el corte se armó antes de que llegaran los equipos (o se agregó un
// volquete al Máster después), completa la lista sin tocar lo ya escrito.
function _avjCompletarVol(){
  if(!_avj)return;
  _avjVolquetesMaster().forEach(e=>{
    if(_avj.volquetes.some(v=>+v.eqId===+e.id))return;
    _avj.volquetes.push({eqId:+e.id,codigo:e.codigo,operador:_avjUltimoOperador(e.id),
      viajes:'',..._avjRutaHabitual(e.id),noOpera:false,motivo:''});
  });
  _avj.volquetes.sort((a,b)=>String(a.codigo||'').localeCompare(String(b.codigo||''),'es',{numeric:true}));
}
function _avjPintar(){
  const el=document.getElementById('avjForm');if(!el||!_avj)return;
  _avjCompletarVol();
  const s=_avjSugerencias();
  const dl=(id,l)=>`<datalist id="${id}">${l.map(x=>`<option value="${_avjEsc(x)}">`).join('')}</datalist>`;
  el.innerHTML=`
    ${dl('avjDlO',s.origenes)}${dl('avjDlD',s.destinos)}${dl('avjDlM',s.materiales)}
    <div class="card" style="margin-bottom:.8rem"><div class="avj-cab">
      <label class="avj-f">Fecha<input type="date" value="${_avjEsc(_avj.fecha)}" onchange="_avjSet('fecha',this.value)" style="color-scheme:dark"></label>
      <div class="avj-f">Turno<div class="avj-seg">
        ${['Día','Noche'].map(t=>`<button type="button" class="${_avj.turno===t?'on':''}" onclick="_avjSet('turno','${t}')">${t==='Día'?'☀️':'🌙'} ${t}</button>`).join('')}
      </div></div>
      <label class="avj-f">Hora del corte<input type="time" value="${_avjEsc(_avj.horaCorte)}" onchange="_avjSet('horaCorte',this.value)" style="color-scheme:dark"></label>
      <label class="avj-f" title="Viajes que se esperan de cada volquete en el turno completo. 0 = sin meta">Meta por volquete / turno<input type="number" min="0" step="1" value="${_avj.meta||''}" placeholder="sin meta" oninput="_avjSet('meta',this.value,1)"></label>
      ${_avj.id?`<span class="avj-edit">✏️ Editando el corte guardado · <button type="button" onclick="_avjDescartar()">empezar uno nuevo</button></span>`:''}
    </div></div>
    <div class="kpi-row" id="avjKpis"></div>
    <div class="card" style="margin-bottom:.8rem">
      <div class="card-head"><span class="card-title">🚛 Viajes por volquete al corte</span>
        <span style="font-size:.7rem;color:var(--muted2)">ruta y material se ofrecen de los últimos partes de cada volquete</span></div>
      <div class="card-body" style="padding:0"><div class="tbl-wrap" id="avjVol"></div></div>
    </div>
    <div class="card" style="margin-bottom:.8rem">
      <div class="card-head"><span class="card-title">⛔ Restricciones del turno</span>
        <button type="button" class="btn btn-a" style="--ba:#ef4444" onclick="_avjResAgregar()">＋ Agregar restricción</button></div>
      <div class="card-body"><div id="avjRes"></div></div>
    </div>
    <div class="card" style="margin-bottom:.8rem"><div class="card-body">
      <label class="avj-f">Observaciones<textarea rows="2" maxlength="600" oninput="_avjSet('observaciones',this.value,1)" placeholder="Opcional">${_avjEsc(_avj.observaciones)}</textarea></label>
    </div></div>
    <div style="display:flex;gap:.6rem;justify-content:flex-end;flex-wrap:wrap;margin-bottom:1.2rem">
      <button type="button" class="btn btn-out" onclick="_avjVerDoc(_avjCopia(),1)">👁 Vista previa</button>
      <button type="button" class="btn btn-a" style="--ba:#10b981" id="avjBtnGuardar" onclick="_avjGuardar()">💾 Guardar y ver PDF</button>
    </div>`;
  _avjPintarKpis();_avjPintarVol();_avjPintarRes();
}

function _avjPintarKpis(){
  const el=document.getElementById('avjKpis');if(!el||!_avj)return;
  const c=_avjCalc(_avj);
  const k=(key,l,v,col,sub)=>`<div class="kpi" style="--kc:${col};flex:1;min-width:150px;position:relative${_avjVe(key)?'':';opacity:.45'}">${_avjChk(key)}<div class="kpi-lbl">${l}</div><div class="kpi-val" style="font-size:1.7rem">${v}</div>${sub?`<div class="kpi-sub">${sub}</div>`:''}</div>`;
  el.innerHTML=[
    k('viajes','Viajes al corte',c.viajes,'#f59e0b',`hasta las ${_avjEsc(_avj.horaCorte||'—')}${c.transc!=null?' · '+String(c.transc).replace('.',',')+' h de turno':''}`),
    k('operando','Volquetes operando',`${c.opera} / ${c.total}`,'#3b82f6',`${c.conViajes} con viajes`),
    k('promedio','Promedio por volquete',c.promedio?c.promedio.toFixed(1).replace('.',','):'0','#06b6d4','viajes al corte'),
    k('proy','Proyección al cierre',c.proy!=null?c.proy:'—','#a855f7',c.proy!=null?'al ritmo actual':'hora de corte fuera del turno'),
    c.metaTurno?k('meta','Meta del turno',c.metaTurno,c.pctCorte!=null&&c.pctCorte<85?'#ef4444':'#10b981',
      c.pctCorte!=null?`al corte se esperaban ${c.metaAlCorte} · ${Math.round(c.pctCorte)}%`:''):'',
    c.horasPerdidas?k('horas','Horas con restricción',String(c.horasPerdidas).replace('.',','),'#ef4444',(_avj.restricciones||[]).length+' restricción(es)'):''
  ].join('');
}

function _avjPintarVol(){
  const el=document.getElementById('avjVol');if(!el||!_avj)return;
  const fin=_avjParteFinal(_avj.fecha,_avj.turno);
  const hayFin=Object.keys(fin).length>0;
  const filas=_avj.volquetes.map((v,i)=>{
    const f=fin[v.eqId];
    return`<tr class="${v.noOpera?'avj-off':''}">
      <td class="mono" style="font-weight:800;white-space:nowrap">${_avjEsc(v.codigo)}${(()=>{const e=(DB.equipos||[]).find(x=>+x.id===+v.eqId);const pl=e&&String(e.placa||'').trim();return pl?`<div style="font-size:.66rem;font-weight:600;color:var(--muted2);letter-spacing:.04em;margin-top:.1rem">${_avjEsc(pl)}</div>`:'';})()}</td>
      <td><input class="avj-in" value="${_avjEsc(v.operador)}" oninput="_avjVol(${i},'operador',this.value)" placeholder="Operador" style="min-width:170px"></td>
      <td>${v.noOpera?`<select class="avj-in" onchange="_avjVol(${i},'motivo',this.value)"><option value="">— motivo —</option>${_AVJ_NO_OPERA.map(m=>`<option${m===v.motivo?' selected':''}>${m}</option>`).join('')}</select>`
        :`<input class="avj-in avj-num" type="number" min="0" step="1" inputmode="numeric" value="${_avjEsc(v.viajes)}" oninput="_avjVol(${i},'viajes',this.value)" placeholder="0">`}</td>
      <td><input class="avj-in" list="avjDlO" value="${_avjEsc(v.origen)}" oninput="_avjVol(${i},'origen',this.value)" placeholder="Origen" ${v.noOpera?'disabled':''}></td>
      <td><input class="avj-in" list="avjDlD" value="${_avjEsc(v.destino)}" oninput="_avjVol(${i},'destino',this.value)" placeholder="Destino" ${v.noOpera?'disabled':''}></td>
      <td><input class="avj-in" list="avjDlM" value="${_avjEsc(v.material)}" oninput="_avjVol(${i},'material',this.value)" placeholder="Material" ${v.noOpera?'disabled':''}></td>
      <td style="text-align:center"><input type="checkbox" ${v.noOpera?'checked':''} onchange="_avjVol(${i},'noOpera',this.checked)" title="No opera en este turno" style="width:auto;cursor:pointer"></td>
      ${hayFin?`<td class="mono" style="text-align:right;color:#10b981;font-weight:700">${f!=null?f:'—'}</td>`:''}
    </tr>`;
  }).join('');
  el.innerHTML=`<table><thead><tr><th>Volquete</th><th${_avjVe('operador')?'':' style="opacity:.5"'}><span style="display:inline-flex;align-items:center;gap:.45rem">Operador ${_avjChk('operador')}</span></th><th>Viajes</th><th>Origen</th><th>Destino</th><th>Material</th><th title="Marcar si el volquete no opera en el turno">No opera</th>
    ${hayFin?'<th class="tr" title="Viajes del parte del día, ya registrado">Parte final</th>':''}</tr></thead>
    <tbody>${filas||'<tr><td colspan="8" style="text-align:center;padding:1.5rem;color:var(--muted2)">No hay volquetes activos en el Máster</td></tr>'}</tbody></table>`;
}

function _avjPintarRes(){
  const el=document.getElementById('avjRes');if(!el||!_avj)return;
  const R=_avj.restricciones;
  if(!R.length){el.innerHTML='<div style="font-size:.78rem;color:var(--muted2);padding:.4rem 0">Sin restricciones. Agregue una si algo está frenando los viajes: pase cerrado, voladura, lluvia, frente sin liberar…</div>';return;}
  el.innerHTML=R.map((x,i)=>{
    const fr=x.ubicacion?(typeof _ptFrenteEnPunto==='function'?_ptFrenteEnPunto(x.ubicacion):null):null;
    const h=_avjHorasEntre(x.ini,x.fin);
    const fotos=[...(x.fotos||[]).map((f,k)=>({...f,guardada:1,k})),...(x._nuevas||[]).map((f,k)=>({...f,k}))];
    return`<div class="avj-res">
      <div class="avj-res-head"><b>⛔ Restricción ${i+1}</b>
        <button type="button" class="avj-link" onclick="_avjResQuitar(${i})">Quitar</button></div>
      <div class="avj-grid">
        <label class="avj-f">Motivo<select onchange="_avjRes(${i},'motivo',this.value)">
          ${_AVJ_MOTIVOS.map(m=>`<option${m===x.motivo?' selected':''}>${m}</option>`).join('')}</select></label>
        <label class="avj-f">Desde<input type="time" value="${_avjEsc(x.ini)}" onchange="_avjRes(${i},'ini',this.value)" style="color-scheme:dark"></label>
        <label class="avj-f">Hasta<input type="time" value="${_avjEsc(x.fin)}" onchange="_avjRes(${i},'fin',this.value)" style="color-scheme:dark"></label>
        <div class="avj-f">Duración<div style="font-size:.95rem;font-weight:800;color:${h?'#ef4444':'var(--muted2)'};padding:.45rem 0">${h?String(h).replace('.',',')+' h':'—'}</div></div>
      </div>
      <div class="avj-f">Volquetes afectados
        <div class="avj-chips">
          <label class="avj-chip ${x.todos?'on':''}"><input type="checkbox" ${x.todos?'checked':''} onchange="_avjResTodos(${i},this.checked)">Todos</label>
          ${x.todos?'':_avj.volquetes.map(v=>`<label class="avj-chip ${(x.eqIds||[]).includes(v.eqId)?'on':''}"><input type="checkbox" ${(x.eqIds||[]).includes(v.eqId)?'checked':''} onchange="_avjResEq(${i},${v.eqId},this.checked)">${_avjEsc(v.codigo)}</label>`).join('')}
        </div></div>
      <label class="avj-f">Descripción<textarea rows="2" maxlength="500" oninput="_avjRes(${i},'descripcion',this.value,1)" placeholder="Qué pasó, quién lo indicó, qué se está haciendo">${_avjEsc(x.descripcion)}</textarea></label>
      <div style="display:flex;gap:.6rem;align-items:center;flex-wrap:wrap">
        <button type="button" class="avj-btn-mapa" onclick="_avjMapaAbrir(${i})">📍 ${x.ubicacion?'Cambiar ubicación':'Ubicar en el mapa'}</button>
        <span style="font-size:.74rem;color:${x.ubicacion?'#10b981':'var(--muted2)'}">${x.ubicacion?'📍 '+_avjEsc(fr||'Fuera de los frentes dibujados'):'Sin ubicar · opcional'}</span>
        <label class="avj-btn-foto">📷 Fotos<input type="file" accept="image/*" multiple style="display:none" onchange="_avjFotosAgregar(${i},this)"></label>
        <span style="font-size:.7rem;color:var(--muted2)">${fotos.length?fotos.length+' foto(s)':'opcional'}</span>
      </div>
      ${fotos.length?`<div class="avj-fotos">${fotos.map(f=>`<div class="avj-foto"><div style="position:relative">
          <img src="${_avjEsc(f.url)}" alt=""><span class="avj-foto-h">${_avjEsc(f.hora||'')}</span>
          <button type="button" onclick="_avjFotoQuitar(${i},${f.guardada?1:0},${f.k})" title="Quitar foto">✕</button></div>
          <input type="text" maxlength="80" placeholder="Comentario" value="${_avjEsc(f.nota||'')}" oninput="_avjFotoNota(${i},${f.guardada?1:0},${f.k},this.value)"></div>`).join('')}</div>`:''}
    </div>`;
  }).join('');
}

// ── Edición ────────────────────────────────────────────────────────────────
// soloDato: no se redibuja (para no perder el cursor al escribir)
function _avjSet(campo,v,soloDato){
  if(!_avj)return;
  if(campo==='meta'){_avj.meta=_avjN(v);try{localStorage.setItem('gdar_avj_meta',String(_avj.meta));}catch(e){}_avjPintarKpis();return;}
  if(campo==='turno'&&_avj.turno!==v){
    // Al cambiar de turno, la hora del corte por defecto acompaña si no se tocó
    if(_avj.horaCorte===_AVJ_TURNOS[_avj.turno].corte)_avj.horaCorte=_AVJ_TURNOS[v].corte;
  }
  _avj[campo]=v;
  if(soloDato)return;
  if(campo==='fecha'||campo==='turno')_avjPintar();
  else _avjPintarKpis();
}
function _avjVol(i,campo,v){
  const x=_avj&&_avj.volquetes[i];if(!x)return;
  x[campo]=campo==='noOpera'?!!v:v;
  if(campo==='noOpera'){if(v)x.viajes='';else x.motivo='';_avjPintarVol();_avjPintarRes();}
  if(campo==='viajes'||campo==='noOpera')_avjPintarKpis();
}
function _avjResAgregar(){
  if(!_avj)return;
  const ini=_avj.horaCorte&&_avjMin(_avj.horaCorte)!=null?_avj.horaCorte:'';
  _avj.restricciones.push({motivo:_AVJ_MOTIVOS[0],ini:'',fin:ini,todos:true,eqIds:[],descripcion:'',ubicacion:null,fotos:[],_nuevas:[]});
  _avjPintarRes();_avjPintarKpis();
}
function _avjRes(i,campo,v,soloDato){
  const x=_avj&&_avj.restricciones[i];if(!x)return;
  x[campo]=v;
  if(soloDato)return;
  _avjPintarRes();_avjPintarKpis();
}
function _avjResTodos(i,on){const x=_avj&&_avj.restricciones[i];if(!x)return;x.todos=!!on;if(on)x.eqIds=[];_avjPintarRes();}
function _avjResEq(i,eqId,on){
  const x=_avj&&_avj.restricciones[i];if(!x)return;
  const s=new Set(x.eqIds||[]);on?s.add(+eqId):s.delete(+eqId);x.eqIds=[...s];
  _avjPintarRes();
}
function _avjResQuitar(i){
  const x=_avj&&_avj.restricciones[i];if(!x)return;
  const nf=(x.fotos||[]).length+(x._nuevas||[]).length;
  if((x.descripcion||nf)&&!confirm('¿Quitar la restricción '+(i+1)+(nf?' con sus '+nf+' foto(s)':'')+'?'))return;
  (x._nuevas||[]).forEach(f=>{try{URL.revokeObjectURL(f.url);}catch(e){}});
  _avj.restricciones.splice(i,1);
  _avjPintarRes();_avjPintarKpis();
}
function _avjDescartar(){
  if(!confirm('¿Empezar un corte nuevo? Lo que no se guardó de este se pierde.'))return;
  _avj=_avjNuevo();_avjPintar();
}

// ── Fotos ──────────────────────────────────────────────────────────────────
const _avjFotosTotal=()=>(_avj?_avj.restricciones:[]).reduce((s,x)=>s+(x.fotos||[]).length+(x._nuevas||[]).length,0);
function _avjHoraDe(file){
  const d=new Date(file&&file.lastModified?file.lastModified:Date.now());
  return String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0');
}
function _avjFotosAgregar(i,input){
  const x=_avj&&_avj.restricciones[i];
  const files=[...(input.files||[])];input.value='';
  if(!x||!files.length)return;
  const libres=_AVJ_FOTOS_MAX-_avjFotosTotal();
  if(libres<=0){toast(`Ya hay ${_AVJ_FOTOS_MAX} fotos en este corte: es el máximo`,true);return;}
  const toma=files.slice(0,libres);
  x._nuevas=x._nuevas||[];
  toma.forEach(f=>x._nuevas.push({file:f,url:URL.createObjectURL(f),nombre:f.name,hora:_avjHoraDe(f),nota:'',subida:null}));
  if(toma.length<files.length)toast(`Solo entraron ${toma.length} de ${files.length}: el máximo es ${_AVJ_FOTOS_MAX} fotos por corte`,true);
  _avjPintarRes();
}
function _avjFotoQuitar(i,guardada,k){
  const x=_avj&&_avj.restricciones[i];if(!x)return;
  const l=guardada?x.fotos:x._nuevas;if(!l||!l[k])return;
  if(!guardada){try{URL.revokeObjectURL(l[k].url);}catch(e){}}
  l.splice(k,1);_avjPintarRes();
}
function _avjFotoNota(i,guardada,k,v){
  const x=_avj&&_avj.restricciones[i];if(!x)return;
  const l=guardada?x.fotos:x._nuevas;if(l&&l[k])l[k].nota=String(v||'').slice(0,80);
}
async function _avjSubirFotos(clave){
  const bucket=typeof _PT_BUCKET!=='undefined'?_PT_BUCKET:'AuxMec_Evidencias';
  const fallas=[];
  for(const x of _avj.restricciones){
    for(const f of (x._nuevas||[])){
      if(f.subida)continue;
      try{
        const blob=typeof _otReducir==='function'?await _otReducir(f.file):f.file;
        const ext=blob===f.file?((String(f.nombre).split('.').pop()||'jpg').toLowerCase()):'jpg';
        const path=`avance-viajes/${clave}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
        const{error}=await supa.storage.from(bucket).upload(path,blob,{upsert:false,contentType:blob.type||f.file.type||'image/jpeg'});
        if(error)throw error;
        const{data:{publicUrl}}=supa.storage.from(bucket).getPublicUrl(path);
        f.subida={url:publicUrl,path};
      }catch(e){console.warn('[Avance fotos]',e);fallas.push(f.nombre);}
    }
  }
  return fallas;
}

// ── Mapa (la misma imagen aérea y los mismos frentes del Parte de Turno) ──
function _avjMapaAbrir(i){
  const x=_avj&&_avj.restricciones[i];if(!x)return;
  _avjMapI=i;_avjMapPt=x.ubicacion?{...x.ubicacion}:null;
  let ov=document.getElementById('avjMapa');
  if(!ov){ov=document.createElement('div');ov.id='avjMapa';document.body.appendChild(ov);}
  ov.style.cssText='position:fixed;inset:0;z-index:300;background:rgba(5,8,15,.92);display:flex;flex-direction:column';
  _avjMapaPintar();
}
function _avjMapaPintar(){
  const ov=document.getElementById('avjMapa');if(!ov||_avjMapI==null)return;
  const img=typeof _PT_MAPA_IMG!=='undefined'?_PT_MAPA_IMG:'09.-ERP/Imagenes/R3_2026_IMAGEN.png';
  const frentes=typeof _ptFrentesMapa==='function'?_ptFrentesMapa():[];
  const fr=_avjMapPt&&typeof _ptFrenteEnPunto==='function'?_ptFrenteEnPunto(_avjMapPt):null;
  const z=_AVJ_ZOOMS[_avjMapZ];
  const pol=frentes.map(f=>`<polygon points="${f.puntos.map(p=>(+p.x).toFixed(2)+','+(+p.y).toFixed(2)).join(' ')}" fill="${f.col}" fill-opacity="${f.nombre===fr?.38:.14}" stroke="${f.col}" stroke-width="${f.nombre===fr?3:1.5}" vector-effect="non-scaling-stroke"/>`).join('');
  const rot=frentes.map(f=>{
    const cx=f.puntos.reduce((s,p)=>s+(+p.x),0)/f.puntos.length, cy=f.puntos.reduce((s,p)=>s+(+p.y),0)/f.puntos.length;
    return`<div style="position:absolute;left:${cx}%;top:${cy}%;transform:translate(-50%,-50%);font:700 11px sans-serif;color:${f.col};text-shadow:0 0 3px #000,0 0 3px #000;white-space:nowrap;pointer-events:none">${_avjEsc(f.nombre)}</div>`;
  }).join('');
  const pin=_avjMapPt?`<div style="position:absolute;left:${_avjMapPt.x}%;top:${_avjMapPt.y}%;transform:translate(-50%,-100%);font-size:28px;line-height:1;pointer-events:none;filter:drop-shadow(0 2px 3px #000)">⛔</div>`:'';
  const bt='font-size:.8rem;padding:.55rem .8rem;border-radius:7px;cursor:pointer;font-weight:700;white-space:nowrap';
  ov.innerHTML=`
    <div style="display:flex;align-items:center;gap:.5rem;padding:.6rem .8rem;border-bottom:1px solid #ffffff18;color:#e2e8f0">
      <b style="flex:1;font-size:.9rem">📍 Ubicación · Restricción ${_avjMapI+1}</b>
      <button type="button" onclick="_avjMapaZoom(-1)" style="${bt};background:#ffffff12;border:1px solid #ffffff25;color:#e2e8f0">−</button>
      <span style="font-size:.75rem;min-width:42px;text-align:center">${z}%</span>
      <button type="button" onclick="_avjMapaZoom(1)" style="${bt};background:#ffffff12;border:1px solid #ffffff25;color:#e2e8f0">+</button>
      <button type="button" onclick="_avjMapaCerrar()" style="${bt};background:none;border:none;color:#e2e8f0;font-size:1.1rem">✕</button>
    </div>
    <div id="avjMapaScroll" style="flex:1;overflow:auto;-webkit-overflow-scrolling:touch">
      <div id="avjMapaBox" onclick="_avjMapaToque(event)" style="position:relative;width:${z}%;cursor:crosshair">
        <img src="${img}" alt="Imagen aérea del proyecto" draggable="false" style="display:block;width:100%;user-select:none;pointer-events:none">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" style="position:absolute;inset:0;width:100%;height:100%;pointer-events:none">${pol}</svg>
        ${rot}${pin}
      </div>
    </div>
    <div style="padding:.7rem .8rem;border-top:1px solid #ffffff18;display:flex;flex-direction:column;gap:.55rem;color:#cbd5e1">
      <div style="font-size:.82rem">${_avjMapPt?(fr?`⛔ <b style="color:#10b981">${_avjEsc(fr)}</b>`:'⛔ Fuera de los frentes dibujados'):'Toque en la imagen el lugar de la restricción: el pase, la vía, el frente…'}</div>
      <div style="display:flex;gap:.45rem;flex-wrap:wrap">
        <button type="button" onclick="_avjMapaQuitar()" style="${bt};background:none;border:1px solid #ef444470;color:#f87171">Quitar ubicación</button>
        <button type="button" onclick="_avjMapaCerrar()" style="${bt};background:none;border:1px solid #ffffff30;color:#e2e8f0">Cancelar</button>
        <button type="button" onclick="_avjMapaUsar()" ${_avjMapPt?'':'disabled'} style="${bt};flex:1;border:none;background:${_avjMapPt?'#f59e0b':'#f59e0b55'};color:#111">✓ Usar este punto</button>
      </div>
    </div>`;
}
function _avjMapaToque(ev){
  const box=document.getElementById('avjMapaBox');if(!box)return;
  const r=box.getBoundingClientRect();if(!r.width||!r.height)return;
  _avjMapPt={x:+Math.max(0,Math.min(100,(ev.clientX-r.left)/r.width*100)).toFixed(2),
             y:+Math.max(0,Math.min(100,(ev.clientY-r.top)/r.height*100)).toFixed(2)};
  const sc=document.getElementById('avjMapaScroll');const pos=sc?{l:sc.scrollLeft,t:sc.scrollTop}:null;
  _avjMapaPintar();
  const sc2=document.getElementById('avjMapaScroll');if(sc2&&pos){sc2.scrollLeft=pos.l;sc2.scrollTop=pos.t;}
}
function _avjMapaZoom(d){_avjMapZ=Math.max(0,Math.min(_AVJ_ZOOMS.length-1,_avjMapZ+d));_avjMapaPintar();}
function _avjMapaUsar(){
  const x=_avj&&_avj.restricciones[_avjMapI];
  if(x&&_avjMapPt)x.ubicacion={..._avjMapPt};
  _avjMapaCerrar();_avjPintarRes();
}
function _avjMapaQuitar(){
  const x=_avj&&_avj.restricciones[_avjMapI];if(x)x.ubicacion=null;
  _avjMapaCerrar();_avjPintarRes();
}
function _avjMapaCerrar(){
  const ov=document.getElementById('avjMapa');if(ov){ov.innerHTML='';ov.style.display='none';}
  _avjMapI=null;_avjMapPt=null;
}

// ── Guardar ────────────────────────────────────────────────────────────────
// Lo que se guarda y lo que dibuja el PDF (sin los archivos locales)
function _avjCopia(){
  const r=_avj;
  return{id:r.id,fecha:r.fecha,turno:r.turno,horaCorte:r.horaCorte,meta:_avjN(r.meta),
    volquetes:r.volquetes.map(v=>({eqId:v.eqId,codigo:v.codigo,operador:String(v.operador||'').trim(),
      viajes:v.noOpera?0:_avjN(v.viajes),origen:v.origen||'',destino:v.destino||'',material:v.material||'',
      noOpera:!!v.noOpera,motivo:v.noOpera?(v.motivo||''):''})),
    restricciones:r.restricciones.map(x=>({motivo:x.motivo,ini:x.ini||'',fin:x.fin||'',todos:!!x.todos,
      eqIds:x.todos?[]:(x.eqIds||[]),descripcion:String(x.descripcion||'').trim(),
      frente:x.ubicacion&&typeof _ptFrenteEnPunto==='function'?(_ptFrenteEnPunto(x.ubicacion)||''):'',
      ubicacion:x.ubicacion||null,
      fotos:[...(x.fotos||[]),...(x._nuevas||[]).map(f=>f.subida?{url:f.subida.url,path:f.subida.path,nombre:f.nombre,hora:f.hora,nota:f.nota}
        :{url:f.url,nombre:f.nombre,hora:f.hora,nota:f.nota,local:1})]})),
    observaciones:String(r.observaciones||'').trim(),autor:r.autor||_avjQuien(),creadoEn:r.creadoEn||new Date().toISOString()};
}
async function _avjGuardar(){
  if(!_avj)return;
  if(!_avj.fecha||_avjMin(_avj.horaCorte)==null){toast('Indique la fecha y la hora del corte',true);return;}
  const c=_avjCalc(_avj);
  if(!c.viajes&&!_avj.restricciones.length&&!_avj.volquetes.some(v=>v.noOpera)){
    toast('Cargue los viajes de al menos un volquete, o una restricción',true);return;
  }
  if(_avj.restricciones.some(x=>!x.descripcion&&x.motivo==='Otro')){toast('Describa la restricción marcada como «Otro»',true);return;}
  await _avjCargar();
  if(_avjFalta){toast('Falta ejecutar sql/avance_viajes.sql en Supabase: el corte no se puede guardar todavía',true);return;}
  // Otro corte del mismo día, turno y hora: se reemplaza (con aviso)
  const igual=(DB.avanceViajes||[]).find(r=>r.fecha===_avj.fecha&&r.turno===_avj.turno&&r.horaCorte===_avj.horaCorte&&r.id!==_avj.id);
  if(igual&&!confirm(`Ya hay un corte del ${_avjDMY(_avj.fecha)}, turno ${_avj.turno}, a las ${_avj.horaCorte} (registrado por ${igual.autor||'—'}).\n\n¿Reemplazarlo con este?`))return;
  const id=_avj.id||(igual&&igual.id)||Date.now();
  const btn=document.getElementById('avjBtnGuardar');
  if(btn){btn.disabled=true;btn.textContent='Guardando…';}
  try{
    const fallas=await _avjSubirFotos(String(_avj.fecha)+'_'+id);
    if(fallas.length&&!confirm(`No se pudieron subir ${fallas.length} foto(s): ${fallas.join(', ')}.\n\n¿Guardar el corte sin ellas?`))return;
    const r=_avjCopia();
    r.restricciones.forEach(x=>{x.fotos=x.fotos.filter(f=>!f.local);});
    r.id=id;
    const ahora=new Date().toISOString();
    const fila={id,fecha:r.fecha,turno:r.turno,hora_corte:r.horaCorte,meta:r.meta,volquetes:r.volquetes,
      restricciones:r.restricciones,observaciones:r.observaciones||null,autor:r.autor,
      creado_en:igual&&igual.creadoEn||_avj.creadoEn||ahora,actualizado_en:ahora};
    const{error}=await supa.from(_AVJ_TABLA).upsert(fila);
    if(error){toast('No se pudo guardar el corte: '+error.message,true);return;}
    const rec=_avjDeFila(fila);
    DB.avanceViajes=(DB.avanceViajes||[]).filter(x=>x.id!==id);
    DB.avanceViajes.unshift(rec);
    toast(`✓ Corte guardado · ${c.viajes} viajes al ${r.horaCorte}`);
    _avj=_avjNuevo(r.fecha,r.turno);
    _avjPintar();_avjPintarHist();
    _avjVerDoc(rec);
  }finally{
    const b=document.getElementById('avjBtnGuardar');
    if(b){b.disabled=false;b.textContent='💾 Guardar y ver PDF';}
  }
}

// ── Historial ──────────────────────────────────────────────────────────────
function _avjPintarHist(){
  const el=document.getElementById('avjHist');if(!el)return;
  const L=(DB.avanceViajes||[]).slice().sort((a,b)=>String(b.fecha).localeCompare(String(a.fecha))
    ||String(b.turno).localeCompare(String(a.turno))||String(b.horaCorte).localeCompare(String(a.horaCorte))).slice(0,60);
  const filas=L.map(r=>{
    const c=_avjCalc(r);
    return`<tr>
      <td class="mono">${_avjDMY(r.fecha)}</td><td>${r.turno==='Noche'?'🌙':'☀️'} ${_avjEsc(r.turno)}</td>
      <td class="mono">${_avjEsc(r.horaCorte)}</td>
      <td class="tr mono" style="color:#f59e0b;font-weight:800">${c.viajes}</td>
      <td class="tr mono">${c.opera} / ${c.total}</td>
      <td class="tr mono">${c.proy!=null?c.proy:'—'}</td>
      <td>${(r.restricciones||[]).length?`<span style="color:#ef4444;font-weight:700">⛔ ${(r.restricciones||[]).length}</span> <span style="font-size:.7rem;color:var(--muted2)">${_avjEsc([...new Set(r.restricciones.map(x=>x.motivo))].join(' · ').slice(0,60))}</span>`:'<span style="color:var(--muted2)">—</span>'}</td>
      <td style="font-size:.72rem;color:var(--muted2)">${_avjEsc(r.autor||'—')}</td>
      <td style="white-space:nowrap">
        <button class="btn btn-out btn-sm" onclick="_avjVerDoc(_avjBuscar(${r.id}))" title="Ver y compartir el PDF">📄</button>
        <button class="btn btn-out btn-sm" onclick="_avjEditar(${r.id})" title="Editar" style="color:#f59e0b;border-color:#f59e0b60">✏️</button>
        <button class="btn btn-del btn-sm" onclick="_avjEliminar(${r.id})" title="Eliminar">🗑</button>
      </td></tr>`;
  }).join('');
  el.innerHTML=`<div class="card"><div class="card-head"><span class="card-title">🗂️ Cortes guardados</span>
      <span style="font-size:.7rem;color:var(--muted2)">${(DB.avanceViajes||[]).length} corte(s)</span></div>
    <div class="card-body" style="padding:0"><div class="tbl-wrap"><table>
      <thead><tr><th>Fecha</th><th>Turno</th><th>Corte</th><th class="tr">Viajes</th><th class="tr">Operando</th><th class="tr">Proyección</th><th>Restricciones</th><th>Registró</th><th></th></tr></thead>
      <tbody>${filas||`<tr><td colspan="9" style="text-align:center;padding:1.5rem;color:var(--muted2)">${_avjFalta?'Falta ejecutar sql/avance_viajes.sql':'Todavía no hay cortes guardados'}</td></tr>`}</tbody>
    </table></div></div></div>`;
}
function _avjBuscar(id){return (DB.avanceViajes||[]).find(r=>+r.id===+id)||null;}
function _avjEditar(id){
  const r=_avjBuscar(id);if(!r)return;
  if(_avj&&!_avj.id&&(_avjCalc(_avj).viajes||_avj.restricciones.length)&&!confirm('¿Abrir ese corte para editarlo? Lo que no se guardó del actual se pierde.'))return;
  // Los volquetes del corte, más los del Máster que se hayan sumado después
  const vol=(r.volquetes||[]).map(v=>({...v,viajes:v.noOpera?'':(v.viajes||'')}));
  _avjVolquetesMaster().forEach(e=>{if(!vol.some(v=>+v.eqId===+e.id))vol.push({eqId:+e.id,codigo:e.codigo,operador:'',viajes:'',origen:'',destino:'',material:'',noOpera:false,motivo:''});});
  _avj={id:r.id,fecha:r.fecha,turno:r.turno,horaCorte:r.horaCorte,meta:r.meta,volquetes:vol,
    restricciones:(r.restricciones||[]).map(x=>({...x,eqIds:[...(x.eqIds||[])],fotos:[...(x.fotos||[])],_nuevas:[]})),
    observaciones:r.observaciones||'',autor:r.autor,creadoEn:r.creadoEn};
  _avjPintar();
  const f=document.getElementById('avjForm');if(f&&f.scrollIntoView)f.scrollIntoView({behavior:'smooth',block:'start'});
}
async function _avjEliminar(id){
  const r=_avjBuscar(id);if(!r)return;
  if(!confirm(`¿Eliminar el corte del ${_avjDMY(r.fecha)}, turno ${r.turno}, a las ${r.horaCorte}?\n\nNo se puede deshacer.`))return;
  const{error}=await supa.from(_AVJ_TABLA).delete().eq('id',id);
  if(error){toast('No se pudo eliminar: '+error.message,true);return;}
  DB.avanceViajes=(DB.avanceViajes||[]).filter(x=>+x.id!==+id);
  if(_avj&&+_avj.id===+id){_avj=_avjNuevo();_avjPintar();}
  _avjPintarHist();toast('Corte eliminado');
}

// ── Documento (hoja A4 de 794 px, el formato del Parte de Turno) ───────────
function _avjFotosDe(r){
  const out=[];
  (r.restricciones||[]).forEach((x,i)=>(x.fotos||[]).forEach(f=>{if(f&&f.url)out.push({...f,res:i+1,motivo:x.motivo});}));
  return out.map((f,k)=>({...f,k:k+1}));
}
function _avjPanelFilas(fotos){
  const celda=f=>f?`<td style="width:50%;border:1px solid #d6dbe3;padding:6px;vertical-align:top">
      <div style="height:255px;display:flex;align-items:center;justify-content:center;background:#f1f5f9;border-radius:4px;overflow:hidden">
        <img src="${_avjEsc(f.url)}" alt="" crossorigin="anonymous" style="max-width:100%;max-height:255px;display:block"></div>
      <div style="font-size:11px;margin-top:5px;color:#111"><b style="color:${_AVJ_AC}">Foto ${f.k}</b> · Restricción ${f.res} · ${_avjEsc(f.motivo||'')}${f.hora?` · <span style="color:#64748b">${_avjEsc(f.hora)}</span>`:''}</div>
      ${f.nota?`<div style="font-size:11px;color:#475569;margin-top:2px">${_avjEsc(f.nota)}</div>`:''}</td>`
    :'<td style="width:50%;border:1px solid #d6dbe3"></td>';
  let h='';for(let i=0;i<fotos.length;i+=2)h+=`<tr style="page-break-inside:avoid">${celda(fotos[i])}${celda(fotos[i+1])}</tr>`;
  return`<table style="width:100%;border-collapse:collapse;margin-top:6px;table-layout:fixed">${h}</table>`;
}
const _avjTit=t=>`<div style="margin-top:14px;font-size:11px;font-weight:800;color:${_AVJ_AZ};text-transform:uppercase;letter-spacing:.06em;border-bottom:2px solid ${_AVJ_AZ};padding-bottom:3px">${t}</div>`;
function _avjPanelHojas(r){
  const fotos=_avjFotosDe(r);if(!fotos.length)return[];
  const hojas=[];for(let i=0;i<fotos.length;i+=6)hojas.push(fotos.slice(i,i+6));
  return hojas.map((l,h)=>`<div style="width:794px;min-height:1123px;box-sizing:border-box;padding:34px 40px;background:#fff;color:#111;font-family:Arial,Helvetica,sans-serif">
    <div style="display:flex;justify-content:space-between;align-items:flex-end;border-bottom:3px solid ${_AVJ_AZ};padding-bottom:8px">
      <div style="font-size:18px;font-weight:900;color:${_AVJ_AZ}">PANEL FOTOGRÁFICO · RESTRICCIONES</div>
      <div style="font-size:11px;color:#334155;text-align:right"><span style="text-transform:capitalize">${_avjEsc(_avjFechaLarga(r.fecha))}</span> · Turno ${_avjEsc(r.turno)} · corte ${_avjEsc(r.horaCorte)}<br>Hoja ${h+1} de ${hojas.length} · ${fotos.length} foto(s)</div>
    </div>${_avjPanelFilas(l)}</div>`);
}
function _avjDocHtml(r,opc){
  const AZ=_AVJ_AZ, AC=_AVJ_AC;
  const logo=(typeof EMPRESA!=='undefined'&&EMPRESA.logo)?EMPRESA.logo:'';
  const c=_avjCalc(r);
  const fin=_avjParteFinal(r.fecha,r.turno);
  const hayFin=Object.keys(fin).length>0;
  const TD='padding:6px 8px;border:1px solid #d6dbe3;font-size:11.5px;vertical-align:top;color:#111';
  const TH=`padding:6px 8px;border:1px solid ${AZ};background:${AZ};color:#fff;font-size:10px;text-transform:uppercase;letter-spacing:.04em;text-align:left`;
  const caja=(l,v,col,sub)=>`<div style="flex:1;border:2px solid ${col};border-radius:8px;padding:7px 9px;min-width:0">
      <div style="font-size:9px;font-weight:800;color:#64748b;text-transform:uppercase;letter-spacing:.06em">${l}</div>
      <div style="font-size:20px;font-weight:900;color:${col};margin-top:1px">${v}</div>
      ${sub?`<div style="font-size:9.5px;color:#475569">${sub}</div>`:''}</div>`;
  const conOp=_avjVe('operador');
  const cajas=[
    _avjVe('viajes')?caja('Viajes al corte',c.viajes,AC,'hasta las '+_avjEsc(r.horaCorte)):'',
    _avjVe('operando')?caja('Volquetes operando',`${c.opera} / ${c.total}`,'#2563eb',`${c.conViajes} con viajes`):'',
    _avjVe('promedio')?caja('Promedio',c.promedio?c.promedio.toFixed(1).replace('.',','):'0','#0891b2','viajes por volquete'):'',
    _avjVe('proy')?caja('Proyección al cierre',c.proy!=null?c.proy:'—','#7c3aed',c.proy!=null?'al ritmo actual':''):'',
    c.metaTurno&&_avjVe('meta')?caja('Meta del turno',c.metaTurno,c.pctCorte!=null&&c.pctCorte<85?'#b91c1c':'#15803d',c.pctCorte!=null?`al corte: ${c.metaAlCorte} · ${Math.round(c.pctCorte)}%`:''):'',
    c.horasPerdidas&&_avjVe('horas')?caja('Horas con restricción',String(c.horasPerdidas).replace('.',','),'#b91c1c',(r.restricciones||[]).length+' restricción(es)'):''
  ].join('');
  const vol=(r.volquetes||[]);
  const filasVol=vol.map((v,i)=>`<tr${v.noOpera?' style="background:#fef2f2"':''}>
    <td style="${TD};text-align:center;color:#64748b">${i+1}</td>
    <td style="${TD};font-weight:800;white-space:nowrap">${_avjEsc(v.codigo)}</td>
    ${conOp?`<td style="${TD}">${_avjEsc(v.operador||'—')}</td>`:''}
    <td style="${TD}">${v.noOpera?`<b style="color:#b91c1c">No opera</b>${v.motivo?' · '+_avjEsc(v.motivo):''}`:_avjEsc((v.origen||'—')+' → '+(v.destino||'—'))}</td>
    <td style="${TD}">${v.noOpera?'':_avjEsc(v.material||'—')}</td>
    <td style="${TD};text-align:right;font-weight:800;color:${AC}">${v.noOpera?'—':_avjN(v.viajes)}</td>
    ${hayFin?`<td style="${TD};text-align:right;color:#15803d;font-weight:700">${fin[v.eqId]!=null?fin[v.eqId]:'—'}</td>`:''}
  </tr>`).join('');
  const totFin=hayFin?vol.reduce((s,v)=>s+(fin[v.eqId]||0),0):0;
  const rutas=_avjPorRuta(r);
  const R=r.restricciones||[];
  const codDe=id=>{const v=vol.find(x=>+x.eqId===+id);return v?v.codigo:String(id);};
  const filasRes=R.map((x,i)=>{
    const h=_avjHorasEntre(x.ini,x.fin);
    return`<tr>
      <td style="${TD};text-align:center;font-weight:800;color:${AC}">${i+1}</td>
      <td style="${TD};font-weight:700">${_avjEsc(x.motivo)}${x.ubicacion?' <span style="color:#10b981">📍</span>':''}${(x.fotos||[]).length?` <span style="color:#64748b;font-weight:400;font-size:10.5px">📷 ${x.fotos.length}</span>`:''}${x.frente?`<div style="font-weight:400;font-size:10.5px;color:#475569">${_avjEsc(x.frente)}</div>`:''}</td>
      <td style="${TD};white-space:nowrap">${x.ini||x.fin?_avjEsc((x.ini||'?')+' – '+(x.fin||'?')):'—'}${h?`<div style="color:#b91c1c;font-weight:700">${String(h).replace('.',',')} h</div>`:''}</td>
      <td style="${TD}">${x.todos?'Todos':_avjEsc((x.eqIds||[]).map(codDe).join(', ')||'—')}</td>
      <td style="${TD};white-space:pre-wrap">${_avjEsc(x.descripcion||'')}</td>
    </tr>`;
  }).join('');
  const conUbic=R.filter(x=>x&&x.ubicacion&&isFinite(+x.ubicacion.x));
  const mapa=conUbic.length&&typeof _ptMapaDocHtml==='function'
    ?_ptMapaDocHtml(R,conUbic,AZ,AC).replace('Ubicación de los trabajos','Ubicación de las restricciones'):'';
  const fotos=_avjFotosDe(r);
  return`<div style="width:794px;box-sizing:border-box;padding:34px 40px;background:#fff;color:#111;font-family:Arial,Helvetica,sans-serif">
    <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;border-bottom:3px solid ${AZ};padding-bottom:10px">
      <div>
        <div style="font-size:24px;font-weight:900;color:${AZ};letter-spacing:.02em">AVANCE DE VIAJES</div>
        <div style="font-size:13px;color:#334155;margin-top:3px"><span style="text-transform:capitalize">${_avjEsc(_avjFechaLarga(r.fecha))}</span> · corte a las <b>${_avjEsc(r.horaCorte)}</b></div>
      </div>
      <div style="display:flex;align-items:center;gap:12px">
        <span style="font-size:13px;font-weight:800;padding:6px 14px;border-radius:20px;background:${r.turno==='Noche'?'#1e293b':'#f59e0b'};color:${r.turno==='Noche'?'#fff':'#111'}">Turno ${_avjEsc(r.turno)}</span>
        ${logo?`<img src="${_avjEsc(logo)}" alt="" style="height:52px;max-width:170px;object-fit:contain">`:''}
      </div>
    </div>
    ${cajas?`<div style="display:flex;gap:8px;margin-top:12px">${cajas}</div>`:''}
    ${_avjTit('Viajes por volquete al corte · '+vol.length+' volquete(s)')}
    <table style="width:100%;border-collapse:collapse;margin-top:6px">
      <tr><th style="${TH};width:24px;text-align:center">N°</th><th style="${TH};width:92px">Volquete</th>${conOp?`<th style="${TH}">Operador</th>`:''}<th style="${TH}">Ruta</th><th style="${TH};width:110px">Material</th>
        <th style="${TH};width:56px;text-align:right">Viajes</th>${hayFin?`<th style="${TH};width:62px;text-align:right">Parte final</th>`:''}</tr>
      ${filasVol||`<tr><td colspan="${(conOp?6:5)+(hayFin?1:0)}" style="${TD};text-align:center;color:#64748b">Sin volquetes</td></tr>`}
      <tr><td colspan="${conOp?5:4}" style="${TD};text-align:right;font-weight:800;background:#f1f5f9">TOTAL AL CORTE</td>
        <td style="${TD};text-align:right;font-weight:900;color:${AC};background:#f1f5f9">${c.viajes}</td>
        ${hayFin?`<td style="${TD};text-align:right;font-weight:900;color:#15803d;background:#f1f5f9">${totFin}</td>`:''}</tr>
    </table>
    ${rutas.length?`${_avjTit('Viajes por ruta')}
    <table style="width:100%;border-collapse:collapse;margin-top:6px">
      <tr><th style="${TH}">Origen</th><th style="${TH}">Destino</th><th style="${TH}">Material</th><th style="${TH};width:70px;text-align:right">Volquetes</th><th style="${TH};width:60px;text-align:right">Viajes</th></tr>
      ${rutas.map(x=>`<tr><td style="${TD}">${_avjEsc(x.origen)}</td><td style="${TD}">${_avjEsc(x.destino)}</td><td style="${TD}">${_avjEsc(x.material||'—')}</td>
        <td style="${TD};text-align:right">${x.vol}</td><td style="${TD};text-align:right;font-weight:800;color:${AC}">${x.viajes}</td></tr>`).join('')}
    </table>`:''}
    ${_avjTit('Restricciones · '+R.length)}
    <table style="width:100%;border-collapse:collapse;margin-top:6px">
      <tr><th style="${TH};width:24px;text-align:center">N°</th><th style="${TH};width:160px">Motivo</th><th style="${TH};width:86px">Horario</th><th style="${TH};width:110px">Volquetes</th><th style="${TH}">Descripción</th></tr>
      ${filasRes||`<tr><td colspan="5" style="${TD};text-align:center;color:#15803d;font-weight:700">Sin restricciones al corte</td></tr>`}
    </table>
    ${mapa}
    ${r.observaciones?`<div style="margin-top:12px;border-left:4px solid #64748b;background:#f8fafc;padding:9px 12px;border-radius:0 6px 6px 0">
      <div style="font-size:10px;font-weight:800;color:#475569;text-transform:uppercase;letter-spacing:.06em">Observaciones</div>
      <div style="font-size:12px;margin-top:3px;white-space:pre-wrap">${_avjEsc(r.observaciones)}</div></div>`:''}
    ${fotos.length?(opc&&opc.sinPanel
      ?`<div style="margin-top:12px;font-size:11.5px;color:#475569">📷 <b>Panel fotográfico:</b> ${fotos.length} foto(s) en las hojas siguientes.</div>`
      :_avjTit('Panel fotográfico · '+fotos.length+' foto(s)')+_avjPanelFilas(fotos)):''}
    <div style="margin-top:18px;display:flex;justify-content:space-between;align-items:flex-end;border-top:1px solid #d6dbe3;padding-top:9px;font-size:11px;color:#475569">
      <span>Registró: <b style="color:#111">${_avjEsc(r.autor||'—')}</b></span>
      <span>Avance preliminar · no reemplaza el parte del turno · ${_avjEsc(new Date(r.actualizadoEn||r.creadoEn||Date.now()).toLocaleString('es-PE'))}</span>
    </div>
  </div>`;
}

// borrador: vista previa de lo que se está llenando, todavía sin guardar
function _avjVerDoc(r,borrador){
  if(!r)return;
  _avjDoc=r;
  let ov=document.getElementById('avjDocView');
  if(!ov){ov=document.createElement('div');ov.id='avjDocView';document.body.appendChild(ov);}
  ov.style.cssText='position:fixed;inset:0;z-index:300;background:rgba(5,8,15,.92);display:flex;flex-direction:column';
  const bt='font-size:.85rem;padding:.6rem 1rem;border-radius:8px;cursor:pointer;font-weight:800;white-space:nowrap';
  ov.innerHTML=`
    <div style="display:flex;gap:.5rem;align-items:center;padding:.6rem .8rem;border-bottom:1px solid #ffffff18;flex-wrap:wrap">
      <b style="flex:1;color:#e2e8f0;font-size:.9rem">📄 Avance de viajes${borrador?' · vista previa (sin guardar)':''}</b>
      <button type="button" id="avjBtnPdf" onclick="_avjCompartirPdf()" style="${bt};border:none;background:#10b981;color:#0b1220">📤 Compartir PDF</button>
      <button type="button" onclick="_avjCerrarDoc()" style="${bt};background:none;border:1px solid #ffffff30;color:#e2e8f0">Cerrar</button>
    </div>
    <div style="flex:1;overflow:auto;-webkit-overflow-scrolling:touch;padding:12px">
      <div id="avjDocWrap" style="max-width:794px;margin:0 auto;box-shadow:0 6px 24px rgba(0,0,0,.5)">${_avjDocHtml(r)}</div>
    </div>`;
  const wrap=document.getElementById('avjDocWrap');
  if(wrap&&typeof window!=='undefined'&&window.innerWidth){
    const disp=Math.min(794,window.innerWidth-24);
    if(disp<794){const h=wrap.firstElementChild;if(h){h.style.transform='scale('+(disp/794)+')';h.style.transformOrigin='top left';}wrap.style.width=disp+'px';}
  }
}
function _avjCerrarDoc(){const ov=document.getElementById('avjDocView');if(ov){ov.innerHTML='';ov.style.display='none';}_avjDoc=null;}
function _avjNombreArchivo(r){
  const quien=String(r.autor||'').replace(/[\\/:*?"<>|]+/g,'').trim().slice(0,40);
  return 'Avance de Viajes '+String(r.fecha||'')+' '+String(r.turno||'')+' '+String(r.horaCorte||'').replace(':','h')+(quien?' - '+quien:'')+'.pdf';
}
// El PDF se arma igual que el del Parte de Turno: la hoja se dibuja fuera de la
// pantalla a 794 px y se pasa a A4; las fotos van en hojas propias.
async function _avjGenerarPdf(r){
  const LH=typeof _PT_LIB_H2C!=='undefined'?_PT_LIB_H2C:'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
  const LP=typeof _PT_LIB_PDF!=='undefined'?_PT_LIB_PDF:'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
  await _ptCargarLib(LH,()=>typeof window.html2canvas==='function');
  await _ptCargarLib(LP,()=>!!(window.jspdf&&window.jspdf.jsPDF));
  const caja=document.createElement('div');
  caja.style.cssText='position:fixed;left:-10000px;top:0;width:794px;background:#fff';
  document.body.appendChild(caja);
  const dibujar=async html=>{
    caja.innerHTML=html;
    await Promise.all([...caja.querySelectorAll('img')].map(im=>im.complete?null:new Promise(ok=>{im.onload=im.onerror=ok;})));
    return window.html2canvas(caja.firstElementChild,{scale:2,useCORS:true,backgroundColor:'#ffffff'});
  };
  try{
    const pdf=new window.jspdf.jsPDF({unit:'mm',format:'a4',orientation:'portrait'});
    const W=210,H=297;
    const cv=await dibujar(_avjDocHtml(r,{sinPanel:true}));
    const alto=cv.height*W/cv.width, img=cv.toDataURL('image/jpeg',0.92);
    let y=0;pdf.addImage(img,'JPEG',0,0,W,alto);
    while(alto-y>H){y+=H;pdf.addPage();pdf.addImage(img,'JPEG',0,-y,W,alto);}
    for(const hoja of _avjPanelHojas(r)){
      const c2=await dibujar(hoja);
      pdf.addPage();pdf.addImage(c2.toDataURL('image/jpeg',0.85),'JPEG',0,0,W,Math.min(H,c2.height*W/c2.width));
    }
    return pdf.output('blob');
  }finally{caja.remove();}
}
async function _avjCompartirPdf(){
  const r=_avjDoc;if(!r)return;
  const btn=document.getElementById('avjBtnPdf');
  if(btn){btn.disabled=true;btn.textContent='Generando PDF…';}
  try{
    const blob=await _avjGenerarPdf(r);
    const nombre=_avjNombreArchivo(r);
    const archivo=new File([blob],nombre,{type:'application/pdf'});
    if(navigator.canShare&&navigator.canShare({files:[archivo]})){
      try{await navigator.share({files:[archivo],title:'Avance de viajes',
        text:`Avance de viajes · ${_avjFechaLarga(r.fecha)} · turno ${r.turno} · corte ${r.horaCorte}`});}
      catch(e){if(e&&e.name!=='AbortError')throw e;}
    }else{
      const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=nombre;
      document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},2000);
      toast('PDF descargado: '+nombre);
    }
  }catch(e){toast('No se pudo generar el PDF: '+((e&&e.message)||e),true);}
  finally{if(btn){btn.disabled=false;btn.textContent='📤 Compartir PDF';}}
}

function _avjEstilos(){
  return`<style>
  .avj-pdf{display:inline-flex;align-items:center;gap:.25rem;font-size:.58rem;font-weight:800;letter-spacing:.06em;color:#10b981;cursor:pointer;user-select:none;text-transform:uppercase}
  .kpi .avj-pdf{position:absolute;top:.45rem;right:.55rem}
  .avj-pdf.off{color:var(--muted2)}
  .avj-pdf input{margin:0;width:13px;height:13px;accent-color:#10b981;cursor:pointer}
  .avj-cab{display:flex;gap:.8rem;flex-wrap:wrap;align-items:flex-end;padding:.7rem .9rem}
  .avj-f{display:flex;flex-direction:column;gap:.3rem;font-size:.62rem;font-weight:700;letter-spacing:.07em;text-transform:uppercase;color:var(--muted2)}
  .avj-f input,.avj-f select,.avj-f textarea{font-size:.84rem;padding:.45rem .55rem;border-radius:7px;border:1px solid var(--border);background:var(--panel2);color:var(--text);box-sizing:border-box;text-transform:none;letter-spacing:0;font-weight:400}
  .avj-f textarea{width:100%;resize:vertical}
  .avj-seg{display:flex;gap:.3rem}
  .avj-seg button{font-size:.82rem;padding:.42rem .8rem;border-radius:7px;border:1px solid var(--border);background:var(--panel2);color:var(--text);cursor:pointer;font-weight:700}
  .avj-seg button.on{background:#f59e0b;border-color:#f59e0b;color:#111}
  .avj-edit{font-size:.74rem;color:#f59e0b;font-weight:700;align-self:center}
  .avj-edit button{background:none;border:0;color:var(--muted2);text-decoration:underline;cursor:pointer;font-size:.74rem}
  .avj-in{font-size:.8rem;padding:.32rem .45rem;border-radius:6px;border:1px solid var(--border);background:var(--panel2);color:var(--text);width:100%;box-sizing:border-box;min-width:110px}
  .avj-num{width:76px;min-width:76px;text-align:right;font-weight:800;color:#f59e0b;font-size:.95rem}
  tr.avj-off td{opacity:.6}
  .avj-res{border:1px solid #ef444455;border-radius:9px;padding:.75rem;background:var(--panel2);display:flex;flex-direction:column;gap:.6rem;margin-bottom:.7rem}
  .avj-res-head{display:flex;justify-content:space-between;align-items:center;color:#f87171;font-size:.8rem}
  .avj-grid{display:grid;grid-template-columns:2fr 1fr 1fr 1fr;gap:.6rem}
  @media(max-width:640px){.avj-grid{grid-template-columns:1fr 1fr}}
  .avj-chips{display:flex;gap:.35rem;flex-wrap:wrap}
  .avj-chip{display:inline-flex;align-items:center;gap:.25rem;border:1px solid var(--border);border-radius:14px;padding:.2rem .6rem;font-size:.72rem;cursor:pointer;color:var(--text);text-transform:none;letter-spacing:0;font-weight:700}
  .avj-chip input{display:none}
  .avj-chip.on{background:rgba(239,68,68,.18);border-color:#ef4444;color:#fca5a5}
  .avj-link{background:none;border:0;color:var(--muted2);font-size:.7rem;font-weight:700;cursor:pointer;text-decoration:underline}
  .avj-link:hover{color:#f87171}
  .avj-btn-mapa{font-size:.78rem;padding:.45rem .8rem;border-radius:7px;border:1px solid #10b98170;background:rgba(16,185,129,.12);color:#10b981;cursor:pointer;font-weight:700}
  .avj-btn-foto{font-size:.78rem;padding:.45rem .8rem;border-radius:7px;border:1px solid #3b82f670;background:rgba(59,130,246,.12);color:#60a5fa;cursor:pointer;font-weight:700}
  .avj-fotos{display:grid;grid-template-columns:repeat(auto-fill,minmax(110px,1fr));gap:.5rem}
  .avj-foto{display:flex;flex-direction:column;gap:.25rem}
  .avj-foto img{width:100%;height:86px;object-fit:cover;border-radius:7px;border:1px solid #ef4444;display:block}
  .avj-foto button{position:absolute;top:3px;right:3px;background:rgba(0,0,0,.72);border:none;color:#f87171;border-radius:4px;width:22px;height:22px;font-size:.7rem;cursor:pointer}
  .avj-foto-h{position:absolute;left:3px;bottom:3px;background:rgba(0,0,0,.65);color:#fff;font-size:.6rem;font-weight:700;padding:1px 4px;border-radius:3px}
  .avj-foto input{font-size:.7rem;padding:.3rem .4rem;border-radius:5px;border:1px solid var(--border);background:var(--panel);color:var(--text)}
  </style>`;
}
