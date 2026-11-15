// ══════════════════════════════════════════════════════════════════════════
//  OPERACIONES · PLAN DE TRABAJO (diario o semanal)
//
//  Lo que se planifica hacer: cada actividad con su frente, la meta (cantidad
//  y unidad), los equipos del Máster, el personal y el responsable. Sobre las
//  fotos aéreas del dron se marca dónde va cada actividad: un número, una zona
//  sombreada o una flecha, del color de la actividad. Sale en PDF con el mismo
//  formato del Parte de Turno: la hoja del plan y una hoja por cada foto.
//
//  Las fotos se pueden volver a usar: «Usar las fotos del plan anterior» trae
//  las del último plan (con o sin sus marcas) sin subirlas otra vez.
//
//  Datos: plan_trabajo (sql/plan_trabajo.sql), leída aquí mismo al abrir. Las
//  fotos van al depósito del Parte de Turno (AuxMec_Evidencias, plan-trabajo/).
//  Del Parte de Turno se reutilizan, sin tocarlos: las librerías del PDF, el
//  repartido en hojas y la fecha larga.
//
//  Prefijo _ptr.
// ══════════════════════════════════════════════════════════════════════════

const _PTR_TABLA='plan_trabajo';
const _PTR_FOTOS_MAX=10;
const _PTR_AZ='#2f5f98', _PTR_AC='#b45309';
const _PTR_COL=['#e11d48','#2563eb','#16a34a','#f59e0b','#9333ea','#0891b2','#db2777','#65a30d','#ea580c','#4f46e5'];
const _PTR_TURNOS=['Día','Noche','Día y Noche'];
const _PTR_UNIDADES=['viajes','m³','m²','m','ml','capas','und','%','h'];
const _PTR_ZOOMS=[100,150,200,300];
const _PTR_DIAS=['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'];

let _ptr=null;                 // el plan que se está llenando
let _ptrListo=null,_ptrFalta=false;
let _ptrDoc=null;              // el plan abierto en el visor
let _ptrEd=null;               // editor de marcas {k,tool,act,pend,zoom,copia}
let _ptrEqI=null;              // actividad del selector de equipos
let _ptrUid=0;

const _ptrEsc=s=>String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const _ptrN=v=>{const n=parseFloat(v);return isFinite(n)?n:0;};
const _ptrHoy=()=>typeof today==='function'?today():new Date().toISOString().slice(0,10);
const _ptrQuien=()=>(typeof CU!=='undefined'&&CU&&(CU.nombre||CU.codigo))||'';
const _ptrColor=i=>_PTR_COL[i%_PTR_COL.length];
const _ptrNuevoUid=()=>'a'+Date.now().toString(36)+(++_ptrUid);
function _ptrDMY(f){const p=String(f||'').split('-');return p.length===3?`${p[2]}/${p[1]}/${p[0]}`:String(f||'');}
function _ptrFechaLarga(f){return typeof _ptFechaLarga==='function'?_ptFechaLarga(f):String(f||'');}
// Fechas sin líos de zona horaria (todo a mediodía local)
function _ptrSumar(iso,d){
  const [y,m,dd]=String(iso).slice(0,10).split('-').map(Number);
  const t=new Date(y,m-1,dd+d,12);
  return t.getFullYear()+'-'+String(t.getMonth()+1).padStart(2,'0')+'-'+String(t.getDate()).padStart(2,'0');
}
function _ptrLunes(iso){
  if(!/^\d{4}-\d{2}-\d{2}/.test(String(iso||'')))return iso;
  const [y,m,d]=String(iso).slice(0,10).split('-').map(Number);
  const dw=new Date(y,m-1,d,12).getDay();          // 0 = domingo
  return _ptrSumar(iso,dw===0?-6:1-dw);
}
const _ptrSemana=iso=>{const l=_ptrLunes(iso);return _PTR_DIAS.map((n,i)=>({iso:_ptrSumar(l,i),n}));};
function _ptrPeriodo(r){
  if(r.tipo==='Semanal'){const s=_ptrSemana(r.fecha);return`Semana del ${_ptrDMY(s[0].iso)} al ${_ptrDMY(s[6].iso)}`;}
  return _ptrFechaLarga(r.fecha);
}
const _ptrDiaTxt=(r,iso)=>{if(!iso)return'Toda la semana';const d=_ptrSemana(r.fecha).find(x=>x.iso===iso);return d?d.n+' '+_ptrDMY(iso).slice(0,5):_ptrDMY(iso);};

// ── Datos del Máster ───────────────────────────────────────────────────────
function _ptrEquipos(){
  return (DB.equipos||[]).filter(e=>!/desmov|baja|vendid/i.test(String(e.est||'')))
    .sort((a,b)=>String(a.sub||'').localeCompare(String(b.sub||''),'es')||String(a.codigo||'').localeCompare(String(b.codigo||''),'es',{numeric:true}));
}
function _ptrPersonas(){
  return [...new Set((DB.personal||[]).filter(p=>!p.est||/activo/i.test(p.est))
    .map(p=>[p.ape,p.nom].filter(Boolean).join(', ')||p.nombre||'').filter(Boolean))].sort((a,b)=>a.localeCompare(b,'es'));
}
function _ptrFrentes(){
  const s=new Set();
  (DB.frentesTrabajo||[]).forEach(f=>{if(f&&f.nombre)s.add(f.nombre);});
  (DB.planTrabajo||[]).forEach(r=>(r.actividades||[]).forEach(a=>{if(a.frente)s.add(a.frente);}));
  return [...s].sort((a,b)=>a.localeCompare(b,'es'));
}
const _ptrCodigo=id=>{const e=(DB.equipos||[]).find(x=>+x.id===+id);return e?e.codigo:'';};

// ── Lectura ────────────────────────────────────────────────────────────────
function _ptrDeFila(f){
  return{id:f.id,tipo:f.tipo||'Diario',fecha:String(f.fecha||'').slice(0,10),turno:f.turno||'Día',titulo:f.titulo||'',
    responsable:f.responsable||'',actividades:f.actividades||[],fotos:f.fotos||[],observaciones:f.observaciones||'',
    autor:f.autor||'',creadoEn:f.creado_en,actualizadoEn:f.actualizado_en};
}
function _ptrCargar(forzar){
  if(_ptrListo&&!forzar)return _ptrListo;
  _ptrListo=(async()=>{
    try{
      const{data,error}=await supa.from(_PTR_TABLA).select('*').order('fecha',{ascending:false}).limit(300);
      if(error)throw error;
      DB.planTrabajo=(data||[]).map(_ptrDeFila);
      _ptrFalta=false;
    }catch(e){
      _ptrFalta=true;
      DB.planTrabajo=DB.planTrabajo||[];
      console.warn('[Plan de trabajo] no se pudo leer '+_PTR_TABLA+':',(e&&e.message)||e);
    }
  })();
  return _ptrListo;
}

// ── Un plan nuevo ──────────────────────────────────────────────────────────
const _ptrActNueva=x=>({uid:_ptrNuevoUid(),dia:'',frente:'',descripcion:'',meta:'',unidad:'',eqIds:[],personal:'',responsable:'',...(x||{})});
function _ptrNuevo(tipo,fecha){
  tipo=tipo||'Diario';
  let f=fecha||_ptrHoy();
  if(!fecha&&tipo==='Diario')f=_ptrSumar(_ptrHoy(),1);      // se planifica para mañana
  if(tipo==='Semanal')f=_ptrLunes(fecha||_ptrSumar(_ptrHoy(),7-((new Date().getDay()+6)%7)));
  return{id:null,tipo,fecha:f,turno:'Día',titulo:'',responsable:_ptrQuien(),actividades:[_ptrActNueva()],fotos:[],observaciones:''};
}

// ── Página ─────────────────────────────────────────────────────────────────
function rPlanTrabajo(){
  const pg=document.getElementById('page-planTrabajo');if(!pg)return;
  if(!_ptr)_ptr=_ptrNuevo();
  pg.innerHTML=`
    <div class="ph"><div class="ph-title" style="color:#f59e0b">📋 Plan de Trabajo</div>
      <div class="ph-sub">Lo planificado para el día o la semana: actividades, metas, equipos y personal, marcados sobre las fotos aéreas</div></div>
    ${_ptrEstilos()}
    <div id="ptrAviso"></div>
    <div id="ptrForm"></div>
    <div id="ptrHist"></div>`;
  _ptrPintar();
  _ptrCargar().then(()=>{_ptrPintarAviso();_ptrPintarHist();});
}
function _ptrPintarAviso(){
  const el=document.getElementById('ptrAviso');if(!el)return;
  el.innerHTML=_ptrFalta?`<div style="margin-bottom:.8rem;padding:.6rem .8rem;border:1px solid #ef444470;background:rgba(239,68,68,.1);border-radius:8px;font-size:.78rem;color:#f87171">
    ⚠ Falta ejecutar <b>sql/plan_trabajo.sql</b> en Supabase: se puede llenar el plan y ver el PDF, pero no se guardará.</div>`:'';
}
function _ptrPintar(){
  const el=document.getElementById('ptrForm');if(!el||!_ptr)return;
  const sem=_ptr.tipo==='Semanal';
  const dl=(id,l)=>`<datalist id="${id}">${l.map(x=>`<option value="${_ptrEsc(x)}">`).join('')}</datalist>`;
  el.innerHTML=`
    ${dl('ptrDlF',_ptrFrentes())}${dl('ptrDlP',_ptrPersonas())}${dl('ptrDlU',_PTR_UNIDADES)}
    <div class="card" style="margin-bottom:.8rem"><div class="ptr-cab">
      <div class="ptr-f">Tipo<div class="ptr-seg">
        ${['Diario','Semanal'].map(t=>`<button type="button" class="${_ptr.tipo===t?'on':''}" onclick="_ptrSet('tipo','${t}')">${t==='Diario'?'📅':'🗓️'} ${t}</button>`).join('')}
      </div></div>
      <label class="ptr-f">${sem?'Semana (cualquier día)':'Fecha'}<input type="date" value="${_ptrEsc(_ptr.fecha)}" onchange="_ptrSet('fecha',this.value)" style="color-scheme:dark"></label>
      ${sem?`<div class="ptr-f">&nbsp;<span style="font-size:.8rem;color:#f59e0b;text-transform:none;letter-spacing:0;font-weight:700;padding:.45rem 0">${_ptrEsc(_ptrPeriodo(_ptr))}</span></div>`:''}
      <div class="ptr-f">Turno<div class="ptr-seg">
        ${_PTR_TURNOS.map(t=>`<button type="button" class="${_ptr.turno===t?'on':''}" onclick="_ptrSet('turno','${t}')">${t==='Día'?'☀️ ':t==='Noche'?'🌙 ':''}${t}</button>`).join('')}
      </div></div>
      <label class="ptr-f" style="flex:1;min-width:180px">Título / zona<input type="text" maxlength="80" value="${_ptrEsc(_ptr.titulo)}" placeholder="Opcional · ej. Dique Auxiliar – capa 58" oninput="_ptrSet('titulo',this.value,1)"></label>
      <label class="ptr-f" style="min-width:200px">Responsable del plan<input type="text" list="ptrDlP" maxlength="80" value="${_ptrEsc(_ptr.responsable)}" oninput="_ptrSet('responsable',this.value,1)"></label>
      ${_ptr.id?`<span class="ptr-edit">✏️ Editando un plan guardado · <button type="button" onclick="_ptrDescartar()">empezar uno nuevo</button></span>`:''}
    </div></div>
    <div class="card" style="margin-bottom:.8rem">
      <div class="card-head"><span class="card-title">🛠️ Actividades planificadas</span>
        <button type="button" class="btn btn-a" style="--ba:#3b82f6" onclick="_ptrActAgregar()">＋ Actividad</button></div>
      <div class="card-body"><div id="ptrActs"></div></div>
    </div>
    <div class="card" style="margin-bottom:.8rem">
      <div class="card-head"><span class="card-title">📷 Fotos de las zonas de trabajo</span>
        <span style="display:flex;gap:.5rem;flex-wrap:wrap">
          <button type="button" class="btn btn-out" onclick="_ptrFotosAnterior()" title="Trae las fotos del último plan guardado, sin subirlas otra vez">↺ Usar las fotos del plan anterior</button>
          <label class="btn btn-a" style="--ba:#10b981;cursor:pointer">＋ Agregar fotos<input type="file" accept="image/*" multiple style="display:none" onchange="_ptrFotosAgregar(this)"></label>
        </span></div>
      <div class="card-body"><div id="ptrFotos"></div></div>
    </div>
    <div class="card" style="margin-bottom:.8rem"><div class="card-body">
      <label class="ptr-f">Observaciones<textarea rows="2" maxlength="800" oninput="_ptrSet('observaciones',this.value,1)" placeholder="Opcional · recursos que faltan, coordinaciones, riesgos…">${_ptrEsc(_ptr.observaciones)}</textarea></label>
    </div></div>
    <div style="display:flex;gap:.6rem;justify-content:flex-end;flex-wrap:wrap;margin-bottom:1.2rem">
      <button type="button" class="btn btn-out" onclick="_ptrVerDoc(_ptrCopia(),1)">👁 Vista previa</button>
      <button type="button" class="btn btn-a" style="--ba:#10b981" id="ptrBtnGuardar" onclick="_ptrGuardar()">💾 Guardar y ver PDF</button>
    </div>`;
  _ptrPintarActs();_ptrPintarFotos();
}
function _ptrPintarActs(){
  const el=document.getElementById('ptrActs');if(!el||!_ptr)return;
  const sem=_ptr.tipo==='Semanal', dias=_ptrSemana(_ptr.fecha);
  el.innerHTML=_ptr.actividades.map((a,i)=>{
    const eqs=(a.eqIds||[]).map(_ptrCodigo).filter(Boolean);
    const diaOk=dias.some(d=>d.iso===a.dia)?a.dia:'';
    return`<div class="ptr-act" style="--c:${_ptrColor(i)}">
      <div class="ptr-act-h">
        <span class="ptr-n">${i+1}</span>
        ${sem?`<select class="ptr-in" style="width:auto;min-width:130px" onchange="_ptrAct(${i},'dia',this.value)">
          <option value="">Toda la semana</option>${dias.map(d=>`<option value="${d.iso}"${diaOk===d.iso?' selected':''}>${d.n} ${_ptrDMY(d.iso).slice(0,5)}</option>`).join('')}</select>`:''}
        <input class="ptr-in" list="ptrDlF" maxlength="80" placeholder="Frente (ej. R3 - Dique Auxiliar)" value="${_ptrEsc(a.frente)}" oninput="_ptrAct(${i},'frente',this.value,1)" style="flex:1;min-width:170px;font-weight:700">
        <button type="button" class="ptr-x" title="Duplicar" onclick="_ptrActDuplicar(${i})">⧉</button>
        <button type="button" class="ptr-x" title="Quitar" onclick="_ptrActQuitar(${i})">✕</button>
      </div>
      <textarea class="ptr-in" rows="2" maxlength="600" placeholder="Qué se va a hacer (una línea por tarea)" oninput="_ptrAct(${i},'descripcion',this.value,1)">${_ptrEsc(a.descripcion)}</textarea>
      <div class="ptr-grid">
        <label class="ptr-f">Meta<span style="display:flex;gap:.3rem"><input class="ptr-in" type="number" min="0" step="any" value="${_ptrEsc(a.meta)}" placeholder="cant." oninput="_ptrAct(${i},'meta',this.value,1)" style="width:90px">
          <input class="ptr-in" list="ptrDlU" maxlength="20" value="${_ptrEsc(a.unidad)}" placeholder="unidad" oninput="_ptrAct(${i},'unidad',this.value,1)" style="width:90px"></span></label>
        <label class="ptr-f">Personal (N°)<input class="ptr-in" type="number" min="0" step="1" value="${_ptrEsc(a.personal)}" oninput="_ptrAct(${i},'personal',this.value,1)" style="width:90px"></label>
        <label class="ptr-f" style="flex:1;min-width:170px">Responsable<input class="ptr-in" list="ptrDlP" maxlength="80" value="${_ptrEsc(a.responsable)}" oninput="_ptrAct(${i},'responsable',this.value,1)"></label>
        <div class="ptr-f" style="flex:2;min-width:200px">Equipos
          <div style="display:flex;gap:.3rem;flex-wrap:wrap;align-items:center">
            <button type="button" class="ptr-btn-eq" onclick="_ptrEqAbrir(${i})">🚜 ${eqs.length?'Cambiar ('+eqs.length+')':'Elegir del Máster'}</button>
            ${eqs.map(c=>`<span class="ptr-chip">${_ptrEsc(c)}</span>`).join('')}
          </div></div>
      </div>
    </div>`;
  }).join('')||'<div style="text-align:center;color:var(--muted2);font-size:.8rem;padding:1rem">Sin actividades: agregue una con «＋ Actividad»</div>';
}
function _ptrSet(campo,v,soloDato){
  if(!_ptr)return;
  _ptr[campo]=v;
  if(campo==='tipo'&&v==='Semanal')_ptr.fecha=_ptrLunes(_ptr.fecha);
  if(campo==='fecha'&&_ptr.tipo==='Semanal')_ptr.fecha=_ptrLunes(v);
  if(!soloDato)_ptrPintar();
}
function _ptrAct(i,campo,v,soloDato){
  const a=_ptr&&_ptr.actividades[i];if(!a)return;
  a[campo]=v;if(!soloDato)_ptrPintarActs();
}
function _ptrActAgregar(){
  if(!_ptr)return;
  const u=_ptr.actividades[_ptr.actividades.length-1];
  _ptr.actividades.push(_ptrActNueva(u&&_ptr.tipo==='Semanal'?{dia:u.dia}:null));
  _ptrPintarActs();
}
function _ptrActDuplicar(i){
  const a=_ptr&&_ptr.actividades[i];if(!a)return;
  _ptr.actividades.splice(i+1,0,{...a,uid:_ptrNuevoUid(),eqIds:[...(a.eqIds||[])]});
  _ptrPintarActs();_ptrPintarFotos();
}
function _ptrActQuitar(i){
  const a=_ptr&&_ptr.actividades[i];if(!a)return;
  const marcas=_ptr.fotos.reduce((s,f)=>s+(f.marcas||[]).filter(m=>m.act===a.uid).length,0);
  if((a.frente||a.descripcion||marcas)&&!confirm(`¿Quitar la actividad ${i+1}${a.frente?' ('+a.frente+')':''}?${marcas?`\n\nTambién se borran sus ${marcas} marca(s) en las fotos.`:''}`))return;
  _ptr.actividades.splice(i,1);
  _ptr.fotos.forEach(f=>{f.marcas=(f.marcas||[]).filter(m=>m.act!==a.uid);});
  _ptrPintarActs();_ptrPintarFotos();
}
function _ptrDescartar(){
  if(!confirm('¿Empezar un plan nuevo? Lo que no se guardó se pierde.'))return;
  _ptr=_ptrNuevo(_ptr&&_ptr.tipo);_ptrPintar();
}

// ── Selector de equipos ────────────────────────────────────────────────────
function _ptrEqAbrir(i){
  if(!_ptr||!_ptr.actividades[i])return;
  _ptrEqI=i;
  let ov=document.getElementById('ptrEqView');
  if(!ov){ov=document.createElement('div');ov.id='ptrEqView';document.body.appendChild(ov);}
  ov.style.cssText='position:fixed;inset:0;z-index:300;background:rgba(5,8,15,.85);display:flex;align-items:center;justify-content:center;padding:12px';
  ov.innerHTML=`<div style="background:var(--panel,#0f172a);border:1px solid var(--border,#334155);border-radius:12px;width:min(560px,100%);max-height:88vh;display:flex;flex-direction:column">
    <div style="display:flex;align-items:center;gap:.5rem;padding:.7rem .9rem;border-bottom:1px solid var(--border,#334155)">
      <b style="flex:1;font-size:.9rem">🚜 Equipos · actividad ${i+1}</b>
      <button type="button" onclick="_ptrEqCerrar()" class="btn btn-a" style="--ba:#10b981">✓ Listo</button></div>
    <div style="padding:.6rem .9rem"><input class="ptr-in" placeholder="Buscar código o tipo (volquete, excavadora…)" oninput="_ptrEqLista(this.value)"></div>
    <div id="ptrEqLista" style="overflow:auto;padding:0 .9rem .9rem"></div></div>`;
  _ptrEqLista('');
}
function _ptrEqLista(q){
  const el=document.getElementById('ptrEqLista');const a=_ptr&&_ptr.actividades[_ptrEqI];if(!el||!a)return;
  const t=String(q||'').toLowerCase().trim();
  const L=_ptrEquipos().filter(e=>!t||(String(e.codigo||'')+' '+String(e.sub||'')).toLowerCase().includes(t));
  let sub=null,h='';
  L.forEach(e=>{
    if(e.sub!==sub){sub=e.sub;h+=`<div style="margin:.6rem 0 .25rem;font-size:.62rem;font-weight:800;letter-spacing:.07em;text-transform:uppercase;color:var(--muted2)">${_ptrEsc(sub||'Sin tipo')}</div>`;}
    const on=(a.eqIds||[]).some(x=>+x===+e.id);
    h+=`<label class="ptr-eq${on?' on':''}"><input type="checkbox"${on?' checked':''} onchange="_ptrActEq(${_ptrEqI},${+e.id},this.checked);this.parentNode.classList.toggle('on',this.checked)"> <b>${_ptrEsc(e.codigo)}</b> <span style="color:var(--muted2);font-size:.72rem">${_ptrEsc(e.est||'')}</span></label>`;
  });
  el.innerHTML=h||'<div style="color:var(--muted2);font-size:.8rem;padding:.6rem 0">Sin equipos que coincidan</div>';
}
function _ptrActEq(i,id,on){
  const a=_ptr&&_ptr.actividades[i];if(!a)return;
  a.eqIds=(a.eqIds||[]).filter(x=>+x!==+id);
  if(on)a.eqIds.push(+id);
}
function _ptrEqCerrar(){
  const ov=document.getElementById('ptrEqView');if(ov){ov.innerHTML='';ov.style.display='none';}
  _ptrEqI=null;_ptrPintarActs();
}

// ── Fotos ──────────────────────────────────────────────────────────────────
function _ptrAspecto(url){
  return new Promise(ok=>{
    if(typeof Image==='undefined')return ok(4/3);
    const im=new Image();
    im.onload=()=>ok(im.naturalWidth&&im.naturalHeight?im.naturalWidth/im.naturalHeight:4/3);
    im.onerror=()=>ok(4/3);
    im.src=url;
  });
}
async function _ptrFotosAgregar(input){
  const files=[...(input.files||[])];input.value='';
  if(!_ptr||!files.length)return;
  const libres=_PTR_FOTOS_MAX-_ptr.fotos.length;
  if(libres<=0){toast(`Ya hay ${_PTR_FOTOS_MAX} fotos en este plan: es el máximo`,true);return;}
  const toma=files.slice(0,libres);
  for(const f of toma){
    const url=URL.createObjectURL(f);
    _ptr.fotos.push({file:f,url,nombre:f.name,nota:'',asp:await _ptrAspecto(url),marcas:[]});
  }
  if(toma.length<files.length)toast(`Solo entraron ${toma.length} de ${files.length}: el máximo es ${_PTR_FOTOS_MAX} fotos`,true);
  _ptrPintarFotos();
}
// Las fotos del último plan guardado (las mismas del dron), sin subirlas otra vez
function _ptrFotosAnterior(){
  if(!_ptr)return;
  const prev=(DB.planTrabajo||[]).filter(r=>(r.fotos||[]).length&&+r.id!==+_ptr.id)
    .sort((a,b)=>String(b.fecha).localeCompare(String(a.fecha))||(+b.id)-(+a.id))[0];
  if(!prev){toast('Todavía no hay un plan guardado con fotos',true);return;}
  const yaEstan=new Set(_ptr.fotos.map(f=>f.url));
  const nuevas=prev.fotos.filter(f=>!yaEstan.has(f.url));
  if(!nuevas.length){toast('Las fotos del plan anterior ya están en este plan');return;}
  const conMarcas=nuevas.some(f=>(f.marcas||[]).length)&&confirm(`Se traen ${nuevas.length} foto(s) del plan del ${_ptrDMY(prev.fecha)}.\n\n¿Traerlas también con sus marcas? (Aceptar = con marcas, Cancelar = limpias)`);
  // Las marcas apuntan a actividades del otro plan: se traen esas actividades si faltan
  if(conMarcas){
    const uids=new Set(_ptr.actividades.map(a=>a.uid));
    const usadas=new Set();nuevas.forEach(f=>(f.marcas||[]).forEach(m=>usadas.add(m.act)));
    (prev.actividades||[]).filter(a=>usadas.has(a.uid)&&!uids.has(a.uid)).forEach(a=>{
      // si hay una sola actividad vacía, se reemplaza
      if(_ptr.actividades.length===1&&!_ptr.actividades[0].frente&&!_ptr.actividades[0].descripcion)_ptr.actividades=[];
      _ptr.actividades.push({..._ptrActNueva(),...a,eqIds:[...(a.eqIds||[])],dia:''});
    });
  }
  nuevas.slice(0,_PTR_FOTOS_MAX-_ptr.fotos.length).forEach(f=>_ptr.fotos.push({url:f.url,path:f.path,nombre:f.nombre,nota:f.nota||'',asp:f.asp||4/3,
    marcas:conMarcas?JSON.parse(JSON.stringify(f.marcas||[])):[]}));
  toast(`✓ ${nuevas.length} foto(s) del plan del ${_ptrDMY(prev.fecha)}`);
  _ptrPintarActs();_ptrPintarFotos();
}
function _ptrFotoQuitar(k){
  const f=_ptr&&_ptr.fotos[k];if(!f)return;
  if((f.marcas||[]).length&&!confirm(`¿Quitar la foto ${k+1} con sus ${f.marcas.length} marca(s)?`))return;
  if(f.file){try{URL.revokeObjectURL(f.url);}catch(e){}}
  _ptr.fotos.splice(k,1);_ptrPintarFotos();
}
function _ptrFotoNota(k,v){const f=_ptr&&_ptr.fotos[k];if(f)f.nota=String(v||'').slice(0,120);}
function _ptrFotoMover(k,d){
  const L=_ptr&&_ptr.fotos;if(!L||!L[k]||!L[k+d])return;
  [L[k],L[k+d]]=[L[k+d],L[k]];_ptrPintarFotos();
}
function _ptrPintarFotos(){
  const el=document.getElementById('ptrFotos');if(!el||!_ptr)return;
  el.innerHTML=_ptr.fotos.length?`<div class="ptr-fotos">${_ptr.fotos.map((f,k)=>`
    <div class="ptr-foto">
      <div class="ptr-foto-img" style="aspect-ratio:${(+f.asp||4/3).toFixed(4)}" onclick="_ptrMarcar(${k})" title="Marcar las zonas de trabajo">
        <img src="${_ptrEsc(f.url)}" alt="">${_ptrMarcasHtml(f,_ptr.actividades,{tam:16})}
        <span class="ptr-foto-k">Foto ${k+1}</span></div>
      <div style="display:flex;gap:.3rem;align-items:center">
        <button type="button" class="btn btn-a btn-sm" style="--ba:#f59e0b;flex:1" onclick="_ptrMarcar(${k})">✏️ Marcar${(f.marcas||[]).length?' ('+f.marcas.length+')':''}</button>
        ${k?`<button type="button" class="ptr-x" title="Antes" onclick="_ptrFotoMover(${k},-1)">◀</button>`:''}
        ${k<_ptr.fotos.length-1?`<button type="button" class="ptr-x" title="Después" onclick="_ptrFotoMover(${k},1)">▶</button>`:''}
        <button type="button" class="ptr-x" title="Quitar" onclick="_ptrFotoQuitar(${k})">✕</button>
      </div>
      <input class="ptr-in" maxlength="120" placeholder="Nota (opcional) · ej. Zona sur, dique auxiliar" value="${_ptrEsc(f.nota)}" oninput="_ptrFotoNota(${k},this.value)">
    </div>`).join('')}</div>`
    :`<div style="text-align:center;color:var(--muted2);font-size:.8rem;padding:1rem">Agregue las fotos aéreas (dron) y marque sobre ellas dónde va cada actividad</div>`;
}

// ── Marcas sobre la foto ───────────────────────────────────────────────────
// Puntos en % de la foto. Se dibujan en un SVG con la misma proporción de la
// foto (100 × 100/asp), así un trazo mide lo mismo a lo ancho y a lo alto.
function _ptrCentro(P){return{x:P.reduce((s,p)=>s+(+p.x),0)/P.length,y:P.reduce((s,p)=>s+(+p.y),0)/P.length};}
function _ptrMarcasHtml(f,acts,opc){
  opc=opc||{};
  const asp=+f.asp||4/3, H=100/asp, tam=opc.tam||24;
  const v=p=>({x:+p.x,y:+p.y*H/100});
  const n=x=>x.toFixed(2);
  const actDe=uid=>{const i=(acts||[]).findIndex(a=>a.uid===uid);return i<0?null:{n:i+1,col:_ptrColor(i)};};
  let svg='',nums='';
  const num=(p,a)=>{nums+=`<div style="position:absolute;left:${n(+p.x)}%;top:${n(+p.y)}%;transform:translate(-50%,-50%);width:${tam}px;height:${tam}px;border-radius:50%;background:${a.col};border:2px solid #fff;color:#fff;font:900 ${Math.round(tam*.52)}px Arial,sans-serif;display:flex;align-items:center;justify-content:center;box-shadow:0 1px 4px rgba(0,0,0,.65);box-sizing:border-box;pointer-events:none">${a.n}</div>`;};
  (f.marcas||[]).forEach(m=>{
    const a=actDe(m.act);if(!a||!(m.pts||[]).length)return;
    const P=m.pts.map(v);
    if(m.tipo==='zona'&&P.length>=3){
      const pts=P.map(p=>n(p.x)+','+n(p.y)).join(' ');
      svg+=`<polygon points="${pts}" fill="${a.col}" fill-opacity=".3" stroke="#fff" stroke-width=".9" stroke-linejoin="round"/><polygon points="${pts}" fill="none" stroke="${a.col}" stroke-width=".5" stroke-linejoin="round"/>`;
      num(_ptrCentro(m.pts),a);
    }else if(m.tipo==='flecha'&&P.length>=2){
      const A=P[0], B=P[1], dx=B.x-A.x, dy=B.y-A.y, L=Math.hypot(dx,dy)||1, ux=dx/L, uy=dy/L;
      const hl=Math.min(3.2,L*.45), bx=B.x-ux*hl, by=B.y-uy*hl;
      const cab=`${n(B.x)},${n(B.y)} ${n(bx-uy*hl*.55)},${n(by+ux*hl*.55)} ${n(bx+uy*hl*.55)},${n(by-ux*hl*.55)}`;
      svg+=`<line x1="${n(A.x)}" y1="${n(A.y)}" x2="${n(bx)}" y2="${n(by)}" stroke="#fff" stroke-width="1.2" stroke-linecap="round"/><line x1="${n(A.x)}" y1="${n(A.y)}" x2="${n(bx)}" y2="${n(by)}" stroke="${a.col}" stroke-width=".7" stroke-linecap="round"/>
        <polygon points="${cab}" fill="${a.col}" stroke="#fff" stroke-width=".3" stroke-linejoin="round"/>`;
      num(m.pts[0],a);
    }else{
      num(m.pts[0],a);
    }
  });
  // Lo que se está dibujando (solo en el editor)
  if(opc.pend&&opc.pend.pts.length){
    const P=opc.pend.pts.map(v), col=opc.pend.col||'#fff';
    if(P.length>1)svg+=`<polyline points="${P.map(p=>n(p.x)+','+n(p.y)).join(' ')}" fill="none" stroke="${col}" stroke-width=".5" stroke-dasharray="1.2 .8"/>`;
    P.forEach((p,i)=>{svg+=`<circle cx="${n(p.x)}" cy="${n(p.y)}" r="${i?.7:1.1}" fill="${col}" stroke="#fff" stroke-width=".3"/>`;});
  }
  const dim=opc.W?`width="${opc.W}" height="${(opc.W/asp).toFixed(1)}"`:'';
  return`<svg ${dim} viewBox="0 0 100 ${n(H)}" preserveAspectRatio="none" style="position:absolute;left:0;top:0;width:100%;height:100%;overflow:hidden;pointer-events:none">${svg}</svg>${nums}`;
}
function _ptrMarcar(k){
  const f=_ptr&&_ptr.fotos[k];if(!f)return;
  if(!_ptr.actividades.length){toast('Primero agregue al menos una actividad: cada marca es de una actividad',true);return;}
  const prevAct=_ptrEd&&_ptr.actividades.some(a=>a.uid===_ptrEd.act)?_ptrEd.act:_ptr.actividades[0].uid;
  _ptrEd={k,tool:'zona',act:prevAct,pend:[],zoom:0,copia:JSON.parse(JSON.stringify(f.marcas||[]))};
  let ov=document.getElementById('ptrEdView');
  if(!ov){ov=document.createElement('div');ov.id='ptrEdView';document.body.appendChild(ov);}
  ov.style.cssText='position:fixed;inset:0;z-index:300;background:rgba(5,8,15,.94);display:flex;flex-direction:column';
  if(typeof document.addEventListener==='function'){document.removeEventListener('keydown',_ptrEdTecla);document.addEventListener('keydown',_ptrEdTecla);}
  _ptrEdPintar();
}
function _ptrEdTecla(e){
  if(!_ptrEd)return;
  if(e.key==='Escape'){if(_ptrEd.pend.length){_ptrEd.pend=[];_ptrEdPintar();}else _ptrEdCerrar(false);}
  else if(e.key==='Enter'&&_ptrEd.tool==='zona'&&_ptrEd.pend.length>=3)_ptrEdCerrarZona();
  else if((e.ctrlKey||e.metaKey)&&e.key==='z'){e.preventDefault();_ptrEdDeshacer();}
}
function _ptrEdPintar(){
  const ov=document.getElementById('ptrEdView');if(!ov||!_ptrEd||!_ptr)return;
  const f=_ptr.fotos[_ptrEd.k];if(!f)return;
  const ia=_ptr.actividades.findIndex(a=>a.uid===_ptrEd.act), col=_ptrColor(Math.max(0,ia));
  const z=_PTR_ZOOMS[_ptrEd.zoom];
  const bt='font-size:.8rem;padding:.5rem .75rem;border-radius:7px;cursor:pointer;font-weight:700;white-space:nowrap;border:1px solid #ffffff25;background:#ffffff10;color:#e2e8f0';
  const tool=(t,l)=>`<button type="button" onclick="_ptrEdHerr('${t}')" style="${bt};${_ptrEd.tool===t?'background:#f59e0b;border-color:#f59e0b;color:#111':''}">${l}</button>`;
  const ayuda={zona:_ptrEd.pend.length>=3?'Siga tocando para agregar puntos · toque el primer punto o «✓ Cerrar zona» para terminar':'Toque los bordes de la zona, punto por punto (3 o más)',
    flecha:_ptrEd.pend.length?'Ahora toque a dónde apunta la flecha':'Toque dónde empieza la flecha',
    numero:'Toque dónde va el número de la actividad',borrar:'Toque una marca para borrarla'}[_ptrEd.tool];
  const sc=document.getElementById('ptrEdScroll');const pos=sc?{l:sc.scrollLeft,t:sc.scrollTop}:null;
  ov.innerHTML=`
    <div style="display:flex;align-items:center;gap:.45rem;padding:.55rem .8rem;border-bottom:1px solid #ffffff18;color:#e2e8f0;flex-wrap:wrap">
      <b style="font-size:.9rem;margin-right:.3rem">✏️ Foto ${_ptrEd.k+1}</b>
      ${tool('zona','⬠ Zona')}${tool('flecha','➜ Flecha')}${tool('numero','① Número')}${tool('borrar','🧽 Borrar')}
      <button type="button" onclick="_ptrEdDeshacer()" style="${bt}" title="Ctrl+Z">↶ Deshacer</button>
      <span style="flex:1"></span>
      <button type="button" onclick="_ptrEdZoom(-1)" style="${bt}">−</button><span style="font-size:.75rem;min-width:40px;text-align:center">${z}%</span><button type="button" onclick="_ptrEdZoom(1)" style="${bt}">+</button>
    </div>
    <div style="display:flex;gap:.35rem;padding:.45rem .8rem;border-bottom:1px solid #ffffff18;overflow-x:auto;align-items:center">
      <span style="font-size:.7rem;color:#94a3b8;white-space:nowrap">Actividad:</span>
      ${_ptr.actividades.map((a,i)=>`<button type="button" onclick="_ptrEdAct('${a.uid}')" title="${_ptrEsc(a.descripcion||'')}" style="${bt};display:flex;align-items:center;gap:.35rem;${a.uid===_ptrEd.act?`border-color:${_ptrColor(i)};background:${_ptrColor(i)}33`:''}"><span style="width:20px;height:20px;border-radius:50%;background:${_ptrColor(i)};color:#fff;font-weight:900;font-size:.7rem;display:inline-flex;align-items:center;justify-content:center">${i+1}</span>${_ptrEsc((a.frente||'Actividad '+(i+1)).slice(0,28))}</button>`).join('')}
    </div>
    <div id="ptrEdScroll" style="flex:1;overflow:auto;-webkit-overflow-scrolling:touch;padding:10px">
      <div id="ptrEdBox" onclick="_ptrEdToque(event)" style="position:relative;width:${z}%;max-width:${z===100?'1100px':'none'};margin:0 auto;aspect-ratio:${(+f.asp||4/3).toFixed(4)};cursor:crosshair">
        <img src="${_ptrEsc(f.url)}" alt="" draggable="false" style="position:absolute;inset:0;width:100%;height:100%;display:block;user-select:none;pointer-events:none">
        ${_ptrMarcasHtml(f,_ptr.actividades,{pend:{pts:_ptrEd.pend,col}})}
      </div>
    </div>
    <div style="padding:.6rem .8rem;border-top:1px solid #ffffff18;display:flex;gap:.45rem;flex-wrap:wrap;align-items:center;color:#cbd5e1">
      <span style="font-size:.8rem;flex:1;min-width:200px">${ayuda}</span>
      ${_ptrEd.tool==='zona'&&_ptrEd.pend.length>=3?`<button type="button" onclick="_ptrEdCerrarZona()" style="${bt};background:${col};border-color:${col};color:#fff">✓ Cerrar zona</button>`:''}
      ${_ptrEd.pend.length?`<button type="button" onclick="_ptrEdCancelarTrazo()" style="${bt}">Cancelar trazo</button>`:''}
      <button type="button" onclick="_ptrEdCerrar(false)" style="${bt};background:none">Descartar cambios</button>
      <button type="button" onclick="_ptrEdCerrar(true)" style="${bt};border:none;background:#10b981;color:#0b1220">✓ Listo</button>
    </div>`;
  const sc2=document.getElementById('ptrEdScroll');if(sc2&&pos){sc2.scrollLeft=pos.l;sc2.scrollTop=pos.t;}
}
function _ptrEdHerr(t){if(!_ptrEd)return;_ptrEd.tool=t;_ptrEd.pend=[];_ptrEdPintar();}
function _ptrEdAct(uid){if(!_ptrEd)return;_ptrEd.act=uid;_ptrEdPintar();}
function _ptrEdZoom(d){if(!_ptrEd)return;_ptrEd.zoom=Math.max(0,Math.min(_PTR_ZOOMS.length-1,_ptrEd.zoom+d));_ptrEdPintar();}
function _ptrEdCancelarTrazo(){if(!_ptrEd)return;_ptrEd.pend=[];_ptrEdPintar();}
// Un toque en la foto, ya pasado a % (separado para poder probarlo)
function _ptrEdPunto(p){
  const f=_ptrEd&&_ptr&&_ptr.fotos[_ptrEd.k];if(!f)return;
  f.marcas=f.marcas||[];
  const asp=+f.asp||4/3, dist=(a,b)=>Math.hypot(a.x-b.x,(a.y-b.y)/asp);   // en % del ancho
  const t=_ptrEd.tool;
  if(t==='numero'){f.marcas.push({tipo:'numero',act:_ptrEd.act,pts:[p]});}
  else if(t==='flecha'){
    if(!_ptrEd.pend.length)_ptrEd.pend=[p];
    else{f.marcas.push({tipo:'flecha',act:_ptrEd.act,pts:[_ptrEd.pend[0],p]});_ptrEd.pend=[];}
  }
  else if(t==='zona'){
    if(_ptrEd.pend.length>=3&&dist(p,_ptrEd.pend[0])<2.5){_ptrEdCerrarZona();return;}
    _ptrEd.pend.push(p);
  }
  else if(t==='borrar'){
    let mejor=-1,dm=5;
    f.marcas.forEach((m,i)=>{
      const cands=[...(m.pts||[]),...(m.tipo==='zona'?[_ptrCentro(m.pts)]:[])];
      cands.forEach(q=>{const d=dist(p,q);if(d<dm){dm=d;mejor=i;}});
    });
    if(mejor>=0)f.marcas.splice(mejor,1);
  }
  _ptrEdPintar();
}
function _ptrEdToque(ev){
  const box=document.getElementById('ptrEdBox');if(!box||!_ptrEd)return;
  const r=box.getBoundingClientRect();if(!r.width||!r.height)return;
  _ptrEdPunto({x:+Math.max(0,Math.min(100,(ev.clientX-r.left)/r.width*100)).toFixed(2),
               y:+Math.max(0,Math.min(100,(ev.clientY-r.top)/r.height*100)).toFixed(2)});
}
function _ptrEdCerrarZona(){
  const f=_ptrEd&&_ptr&&_ptr.fotos[_ptrEd.k];if(!f||_ptrEd.pend.length<3)return;
  (f.marcas=f.marcas||[]).push({tipo:'zona',act:_ptrEd.act,pts:_ptrEd.pend.slice()});
  _ptrEd.pend=[];_ptrEdPintar();
}
function _ptrEdDeshacer(){
  const f=_ptrEd&&_ptr&&_ptr.fotos[_ptrEd.k];if(!f)return;
  if(_ptrEd.pend.length)_ptrEd.pend.pop();else (f.marcas||[]).pop();
  _ptrEdPintar();
}
function _ptrEdCerrar(guardar){
  if(_ptrEd&&_ptr){
    const f=_ptr.fotos[_ptrEd.k];
    if(f&&!guardar)f.marcas=_ptrEd.copia;
    if(f&&guardar&&_ptrEd.tool==='zona'&&_ptrEd.pend.length>=3)f.marcas.push({tipo:'zona',act:_ptrEd.act,pts:_ptrEd.pend.slice()});
  }
  const ov=document.getElementById('ptrEdView');if(ov){ov.innerHTML='';ov.style.display='none';}
  if(typeof document.removeEventListener==='function')document.removeEventListener('keydown',_ptrEdTecla);
  if(_ptrEd)_ptrEd.pend=[];
  _ptrEd=_ptrEd?{..._ptrEd,k:null}:null;
  _ptrPintarFotos();
}

// ── Guardar ────────────────────────────────────────────────────────────────
// Lo que se guarda y lo que dibuja el PDF (sin los archivos locales)
function _ptrCopia(){
  const r=_ptr, sem=r.tipo==='Semanal', dias=_ptrSemana(r.fecha).map(d=>d.iso);
  return{id:r.id,tipo:r.tipo,fecha:sem?_ptrLunes(r.fecha):r.fecha,turno:r.turno,titulo:String(r.titulo||'').trim(),
    responsable:String(r.responsable||'').trim(),
    actividades:r.actividades.map(a=>({uid:a.uid,dia:sem&&dias.includes(a.dia)?a.dia:'',frente:String(a.frente||'').trim(),
      descripcion:String(a.descripcion||'').trim(),meta:a.meta===''||a.meta==null?'':_ptrN(a.meta),unidad:String(a.unidad||'').trim(),
      eqIds:(a.eqIds||[]).map(Number),equipos:(a.eqIds||[]).map(_ptrCodigo).filter(Boolean),
      personal:a.personal===''||a.personal==null?'':_ptrN(a.personal),responsable:String(a.responsable||'').trim()})),
    fotos:r.fotos.map(f=>f.subida?{url:f.subida.url,path:f.subida.path,nombre:f.nombre,nota:f.nota||'',asp:+f.asp||4/3,marcas:f.marcas||[]}
      :f.file?{url:f.url,nombre:f.nombre,nota:f.nota||'',asp:+f.asp||4/3,marcas:f.marcas||[],local:1}
      :{url:f.url,path:f.path,nombre:f.nombre,nota:f.nota||'',asp:+f.asp||4/3,marcas:f.marcas||[]}),
    observaciones:String(r.observaciones||'').trim(),autor:r.autor||_ptrQuien(),creadoEn:r.creadoEn||new Date().toISOString()};
}
async function _ptrSubirFotos(clave){
  const bucket=typeof _PT_BUCKET!=='undefined'?_PT_BUCKET:'AuxMec_Evidencias';
  const fallas=[];
  for(const f of _ptr.fotos){
    if(!f.file||f.subida)continue;
    try{
      const blob=typeof _otReducir==='function'?await _otReducir(f.file):f.file;
      const ext=blob===f.file?((String(f.nombre).split('.').pop()||'jpg').toLowerCase()):'jpg';
      const path=`plan-trabajo/${clave}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
      const{error}=await supa.storage.from(bucket).upload(path,blob,{upsert:false,contentType:blob.type||f.file.type||'image/jpeg'});
      if(error)throw error;
      const{data:{publicUrl}}=supa.storage.from(bucket).getPublicUrl(path);
      f.subida={url:publicUrl,path};
    }catch(e){console.warn('[Plan fotos]',e);fallas.push(f.nombre);}
  }
  return fallas;
}
async function _ptrGuardar(){
  if(!_ptr)return;
  if(!_ptr.fecha){toast('Indique la fecha del plan',true);return;}
  const acts=_ptr.actividades.filter(a=>String(a.frente||'').trim()||String(a.descripcion||'').trim());
  if(!acts.length){toast('Escriba al menos una actividad (frente o descripción)',true);return;}
  await _ptrCargar();
  if(_ptrFalta){toast('Falta ejecutar sql/plan_trabajo.sql en Supabase: el plan no se puede guardar todavía',true);return;}
  const r0=_ptrCopia();
  const igual=(DB.planTrabajo||[]).find(x=>x.tipo===r0.tipo&&x.fecha===r0.fecha&&x.turno===r0.turno&&+x.id!==+_ptr.id);
  if(igual&&!confirm(`Ya hay un plan ${r0.tipo.toLowerCase()} de ${_ptrPeriodo(r0)}, turno ${r0.turno} (registrado por ${igual.autor||'—'}).\n\n¿Reemplazarlo con este?`))return;
  const id=_ptr.id||(igual&&igual.id)||Date.now();
  const btn=document.getElementById('ptrBtnGuardar');
  if(btn){btn.disabled=true;btn.textContent='Guardando…';}
  try{
    const fallas=await _ptrSubirFotos(String(r0.fecha)+'_'+id);
    if(fallas.length&&!confirm(`No se pudieron subir ${fallas.length} foto(s): ${fallas.join(', ')}.\n\n¿Guardar el plan sin ellas?`))return;
    // Las actividades vacías no se guardan
    _ptr.actividades=_ptr.actividades.filter(a=>String(a.frente||'').trim()||String(a.descripcion||'').trim());
    const r=_ptrCopia();
    r.fotos=r.fotos.filter(f=>!f.local);
    r.id=id;
    const ahora=new Date().toISOString();
    const fila={id,tipo:r.tipo,fecha:r.fecha,turno:r.turno,titulo:r.titulo||null,responsable:r.responsable||null,
      actividades:r.actividades,fotos:r.fotos,observaciones:r.observaciones||null,autor:r.autor,
      creado_en:igual&&igual.creadoEn||_ptr.creadoEn||ahora,actualizado_en:ahora};
    const{error}=await supa.from(_PTR_TABLA).upsert(fila);
    if(error){toast('No se pudo guardar el plan: '+error.message,true);return;}
    const rec=_ptrDeFila(fila);
    DB.planTrabajo=(DB.planTrabajo||[]).filter(x=>+x.id!==+id);
    DB.planTrabajo.unshift(rec);
    toast(`✓ Plan guardado · ${r.actividades.length} actividad(es) · ${r.fotos.length} foto(s)`);
    _ptr=_ptrNuevo(r.tipo);
    _ptrPintar();_ptrPintarHist();
    _ptrVerDoc(rec);
  }finally{
    const b=document.getElementById('ptrBtnGuardar');
    if(b){b.disabled=false;b.textContent='💾 Guardar y ver PDF';}
  }
}

// ── Historial ──────────────────────────────────────────────────────────────
function _ptrPintarHist(){
  const el=document.getElementById('ptrHist');if(!el)return;
  const L=(DB.planTrabajo||[]).slice().sort((a,b)=>String(b.fecha).localeCompare(String(a.fecha))||(+b.id)-(+a.id)).slice(0,80);
  const filas=L.map(r=>`<tr>
      <td>${r.tipo==='Semanal'?'🗓️':'📅'} ${_ptrEsc(r.tipo)}</td>
      <td class="mono">${r.tipo==='Semanal'?_ptrDMY(r.fecha)+' – '+_ptrDMY(_ptrSumar(r.fecha,6)):_ptrDMY(r.fecha)}</td>
      <td>${_ptrEsc(r.turno)}</td>
      <td style="max-width:220px;overflow:hidden;text-overflow:ellipsis">${_ptrEsc(r.titulo||[...new Set((r.actividades||[]).map(a=>a.frente).filter(Boolean))].join(' · ')||'—')}</td>
      <td class="tr mono">${(r.actividades||[]).length}</td>
      <td class="tr mono">${(r.fotos||[]).length}</td>
      <td style="font-size:.72rem">${_ptrEsc(r.responsable||'—')}</td>
      <td style="font-size:.72rem;color:var(--muted2)">${_ptrEsc(r.autor||'—')}</td>
      <td style="white-space:nowrap">
        <button class="btn btn-out btn-sm" onclick="_ptrVerDoc(_ptrBuscar(${r.id}))" title="Ver y compartir el PDF">📄</button>
        <button class="btn btn-out btn-sm" onclick="_ptrEditar(${r.id})" title="Editar" style="color:#f59e0b;border-color:#f59e0b60">✏️</button>
        <button class="btn btn-out btn-sm" onclick="_ptrBase(${r.id})" title="Usar como base para un plan nuevo (siguiente día o semana)">⧉</button>
        <button class="btn btn-del btn-sm" onclick="_ptrEliminar(${r.id})" title="Eliminar">🗑</button>
      </td></tr>`).join('');
  el.innerHTML=`<div class="card"><div class="card-head"><span class="card-title">🗂️ Planes guardados</span>
      <span style="font-size:.7rem;color:var(--muted2)">${(DB.planTrabajo||[]).length} plan(es)</span></div>
    <div class="card-body" style="padding:0"><div class="tbl-wrap"><table>
      <thead><tr><th>Tipo</th><th>Fecha / semana</th><th>Turno</th><th>Título / frentes</th><th class="tr">Activ.</th><th class="tr">Fotos</th><th>Responsable</th><th>Registró</th><th></th></tr></thead>
      <tbody>${filas||`<tr><td colspan="9" style="text-align:center;padding:1.5rem;color:var(--muted2)">${_ptrFalta?'Falta ejecutar sql/plan_trabajo.sql':'Todavía no hay planes guardados'}</td></tr>`}</tbody>
    </table></div></div></div>`;
}
function _ptrBuscar(id){return (DB.planTrabajo||[]).find(r=>+r.id===+id)||null;}
const _ptrSinGuardar=()=>_ptr&&!_ptr.id&&(_ptr.actividades.some(a=>a.frente||a.descripcion)||_ptr.fotos.length);
function _ptrDesdeRec(r,base){
  const sem=r.tipo==='Semanal';
  const fecha=base?(sem?_ptrSumar(r.fecha,7):_ptrSumar(r.fecha,1)):r.fecha;
  return{id:base?null:r.id,tipo:r.tipo,fecha,turno:r.turno,titulo:r.titulo||'',responsable:r.responsable||'',
    actividades:(r.actividades||[]).map(a=>({..._ptrActNueva(),...a,eqIds:[...(a.eqIds||[])],
      dia:base&&sem&&a.dia?_ptrSumar(a.dia,7):a.dia||''})),
    fotos:(r.fotos||[]).map(f=>({url:f.url,path:f.path,nombre:f.nombre,nota:f.nota||'',asp:f.asp||4/3,marcas:JSON.parse(JSON.stringify(f.marcas||[]))})),
    observaciones:base?'':r.observaciones||'',autor:base?undefined:r.autor,creadoEn:base?undefined:r.creadoEn};
}
function _ptrEditar(id){
  const r=_ptrBuscar(id);if(!r)return;
  if(_ptrSinGuardar()&&!confirm('¿Abrir ese plan para editarlo? Lo que no se guardó del actual se pierde.'))return;
  _ptr=_ptrDesdeRec(r,false);_ptrPintar();
  const f=document.getElementById('ptrForm');if(f&&f.scrollIntoView)f.scrollIntoView({behavior:'smooth',block:'start'});
}
// Copia el plan para el día (o la semana) siguiente: mismas actividades y fotos
function _ptrBase(id){
  const r=_ptrBuscar(id);if(!r)return;
  if(_ptrSinGuardar()&&!confirm('¿Empezar un plan nuevo a partir de ese? Lo que no se guardó del actual se pierde.'))return;
  _ptr=_ptrDesdeRec(r,true);_ptrPintar();
  toast(`Plan nuevo para ${_ptrPeriodo(_ptr)} a partir del ${_ptrDMY(r.fecha)}: revise y guarde`);
  const f=document.getElementById('ptrForm');if(f&&f.scrollIntoView)f.scrollIntoView({behavior:'smooth',block:'start'});
}
async function _ptrEliminar(id){
  const r=_ptrBuscar(id);if(!r)return;
  if(!confirm(`¿Eliminar el plan ${String(r.tipo).toLowerCase()} de ${_ptrPeriodo(r)}, turno ${r.turno}?\n\nNo se puede deshacer.`))return;
  const{error}=await supa.from(_PTR_TABLA).delete().eq('id',id);
  if(error){toast('No se pudo eliminar: '+error.message,true);return;}
  DB.planTrabajo=(DB.planTrabajo||[]).filter(x=>+x.id!==+id);
  if(_ptr&&+_ptr.id===+id){_ptr=_ptrNuevo();_ptrPintar();}
  _ptrPintarHist();toast('Plan eliminado');
}

// ── Documento (hoja A4 de 794 px, el formato del Parte de Turno) ───────────
const _ptrTit=t=>`<div data-pt-tit style="margin-top:14px;font-size:11px;font-weight:800;color:${_PTR_AZ};text-transform:uppercase;letter-spacing:.06em;border-bottom:2px solid ${_PTR_AZ};padding-bottom:3px">${t}</div>`;
const _ptrChip=(i,tam)=>`<span style="display:inline-block;width:${tam||20}px;height:${tam||20}px;line-height:${tam||20}px;border-radius:50%;background:${_ptrColor(i)};color:#fff;font-weight:900;font-size:11px;text-align:center">${i+1}</span>`;
const _ptrMetaTxt=a=>a.meta!==''&&a.meta!=null?(String(a.meta)+(a.unidad?' '+a.unidad:'')):'—';
// Una foto con sus marcas, a W px de ancho
function _ptrFotoDoc(f,acts,W){
  const asp=+f.asp||4/3, H=Math.round(W/asp);
  return`<div style="position:relative;width:${W}px;height:${H}px;border:1px solid #d6dbe3;border-radius:6px;overflow:hidden;box-sizing:content-box">
    <img src="${_ptrEsc(f.url)}" alt="" crossorigin="anonymous" style="position:absolute;left:0;top:0;width:${W}px;height:${H}px;max-width:none;display:block">
    ${_ptrMarcasHtml(f,acts,{W,tam:Math.max(20,Math.round(W/30))})}</div>`;
}
// Leyenda de una foto: las actividades marcadas en ella
function _ptrLeyenda(f,acts){
  const usadas=[...new Set((f.marcas||[]).map(m=>m.act))].map(u=>acts.findIndex(a=>a.uid===u)).filter(i=>i>=0).sort((a,b)=>a-b);
  if(!usadas.length)return'';
  return`<table style="width:100%;border-collapse:collapse;margin-top:6px">${usadas.map(i=>{const a=acts[i];
    return`<tr><td style="width:28px;padding:4px 6px;border:1px solid #d6dbe3;text-align:center">${_ptrChip(i)}</td>
      <td style="padding:4px 7px;border:1px solid #d6dbe3;font-size:11px;font-weight:700;width:150px">${_ptrEsc(a.frente||'—')}</td>
      <td style="padding:4px 7px;border:1px solid #d6dbe3;font-size:11px;white-space:pre-wrap">${_ptrEsc(String(a.descripcion||'').slice(0,220))}</td>
      <td style="padding:4px 7px;border:1px solid #d6dbe3;font-size:11px;font-weight:800;text-align:right;white-space:nowrap;width:80px">${_ptrEsc(_ptrMetaTxt(a))}</td></tr>`;}).join('')}</table>`;
}
function _ptrDocHtml(r,opc){
  const AZ=_PTR_AZ, AC=_PTR_AC;
  const logo=(typeof EMPRESA!=='undefined'&&EMPRESA.logo)?EMPRESA.logo:'';
  const acts=r.actividades||[], fotos=r.fotos||[], sem=r.tipo==='Semanal';
  const TD='padding:6px 8px;border:1px solid #d6dbe3;font-size:11.5px;vertical-align:top;color:#111;white-space:normal';
  const TH=`padding:6px 8px;border:1px solid ${AZ};background:${AZ};color:#fff;font-size:10px;text-transform:uppercase;letter-spacing:.04em;text-align:left;white-space:normal`;
  const fila=(a,i)=>`<tr>
    <td style="${TD};text-align:center">${_ptrChip(i)}</td>
    <td style="${TD};font-weight:700">${_ptrEsc(a.frente||'—')}</td>
    <td style="${TD};white-space:pre-wrap">${_ptrEsc(a.descripcion||'')}</td>
    <td style="${TD};text-align:right;font-weight:800;white-space:nowrap">${_ptrEsc(_ptrMetaTxt(a))}</td>
    <td style="${TD};font-size:10.5px">${_ptrEsc((a.equipos&&a.equipos.length?a.equipos:(a.eqIds||[]).map(_ptrCodigo).filter(Boolean)).join(', ')||'—')}</td>
    <td style="${TD};text-align:center">${a.personal!==''&&a.personal!=null?_ptrEsc(a.personal):'—'}</td>
    <td style="${TD};font-size:10.5px">${_ptrEsc(a.responsable||'—')}</td></tr>`;
  let cuerpo='';
  if(sem){
    // Agrupado por día: primero lo de toda la semana
    const orden=['',..._ptrSemana(r.fecha).map(d=>d.iso)];
    orden.forEach(d=>{
      const L=acts.map((a,i)=>({a,i})).filter(o=>(o.a.dia||'')===d);if(!L.length)return;
      cuerpo+=`<tr><td colspan="7" style="padding:5px 8px;border:1px solid #d6dbe3;background:#e8eef7;color:${AZ};font-size:10.5px;font-weight:900;text-transform:uppercase;letter-spacing:.05em">${_ptrEsc(_ptrDiaTxt(r,d))}</td></tr>`
        +L.map(o=>fila(o.a,o.i)).join('');
    });
  }else cuerpo=acts.map(fila).join('');
  const personal=acts.reduce((s,a)=>s+_ptrN(a.personal),0);
  const nEq=new Set(acts.flatMap(a=>(a.eqIds||[]).map(Number))).size;
  const caja=(l,v,col)=>`<div style="flex:1;border:2px solid ${col};border-radius:8px;padding:7px 10px;min-width:0">
      <div style="font-size:9px;font-weight:800;color:#64748b;text-transform:uppercase;letter-spacing:.06em">${l}</div>
      <div style="font-size:19px;font-weight:900;color:${col};margin-top:1px">${v}</div></div>`;
  const conMarcas=fotos.filter(f=>(f.marcas||[]).length).length;
  return`<div style="width:794px;box-sizing:border-box;padding:34px 40px;background:#fff;color:#111;font-family:Arial,Helvetica,sans-serif">
    <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;border-bottom:3px solid ${AZ};padding-bottom:10px">
      <div>
        <div style="font-size:24px;font-weight:900;color:${AZ};letter-spacing:.02em">PLAN DE TRABAJO ${sem?'SEMANAL':'DIARIO'}</div>
        <div style="font-size:13px;color:#334155;margin-top:3px;text-transform:${sem?'none':'capitalize'}">${_ptrEsc(_ptrPeriodo(r))}</div>
        ${r.titulo?`<div style="font-size:12.5px;color:#111;margin-top:3px;font-weight:700">${_ptrEsc(r.titulo)}</div>`:''}
      </div>
      <div style="display:flex;align-items:center;gap:12px">
        <span style="font-size:13px;font-weight:800;padding:6px 14px;border-radius:20px;background:${r.turno==='Noche'?'#1e293b':'#f59e0b'};color:${r.turno==='Noche'?'#fff':'#111'};white-space:nowrap">Turno ${_ptrEsc(r.turno||'')}</span>
        ${logo?`<img src="${_ptrEsc(logo)}" alt="" style="height:52px;max-width:170px;object-fit:contain">`:''}
      </div>
    </div>
    <div style="display:flex;gap:10px;margin-top:12px">
      ${caja('Actividades',acts.length,AZ)}${caja('Equipos asignados',nEq||'—','#0891b2')}${caja('Personal',personal||'—','#16a34a')}
      ${caja('Responsable',`<span style="font-size:13px">${_ptrEsc(r.responsable||'—')}</span>`,AC)}
    </div>
    ${_ptrTit('Actividades planificadas · '+acts.length)}
    <table style="width:100%;border-collapse:collapse;margin-top:6px;table-layout:fixed">
      <colgroup><col style="width:34px"><col style="width:118px"><col><col style="width:78px"><col style="width:104px"><col style="width:46px"><col style="width:96px"></colgroup>
      <tr><th style="${TH};text-align:center">N°</th><th style="${TH}">Frente</th><th style="${TH}">Actividad</th><th style="${TH};text-align:right">Meta</th><th style="${TH}">Equipos</th><th style="${TH};text-align:center">Pers.</th><th style="${TH}">Responsable</th></tr>
      ${cuerpo||`<tr><td colspan="7" style="${TD};text-align:center;color:#64748b">Sin actividades</td></tr>`}
    </table>
    ${r.observaciones?`<div style="margin-top:12px;border-left:4px solid #64748b;background:#f8fafc;padding:9px 12px;border-radius:0 6px 6px 0">
      <div style="font-size:10px;font-weight:800;color:#475569;text-transform:uppercase;letter-spacing:.06em">Observaciones</div>
      <div style="font-size:12px;margin-top:3px;white-space:pre-wrap">${_ptrEsc(r.observaciones)}</div></div>`:''}
    ${fotos.length?(opc&&opc.sinFotos
      ?`<div style="margin-top:12px;font-size:11.5px;color:#475569">📷 <b>Zonas de trabajo:</b> ${fotos.length} foto(s)${conMarcas?' con las actividades marcadas':''}, en las hojas siguientes.</div>`
      :fotos.map((f,k)=>`${_ptrTit('Zonas de trabajo · Foto '+(k+1)+' de '+fotos.length+(f.nota?' <span style="font-weight:600;text-transform:none;letter-spacing:0;color:#64748b">· '+_ptrEsc(f.nota)+'</span>':''))}
        <div style="margin-top:6px">${_ptrFotoDoc(f,acts,712)}</div>${_ptrLeyenda(f,acts)}`).join('')):''}
    <div style="margin-top:18px;display:flex;justify-content:space-between;align-items:flex-end;border-top:1px solid #d6dbe3;padding-top:9px;font-size:11px;color:#475569">
      <span>Registró: <b style="color:#111">${_ptrEsc(r.autor||'—')}</b></span>
      <span>Generado ${_ptrEsc(new Date(r.creadoEn||Date.now()).toLocaleString('es-PE'))}</span>
    </div>
  </div>`;
}
// Para el PDF: cada foto en su hoja, grande, con la leyenda de lo marcado
function _ptrHojasFotos(r){
  const fotos=r.fotos||[], acts=r.actividades||[];
  return fotos.map((f,k)=>`<div style="width:794px;min-height:1123px;box-sizing:border-box;padding:34px 40px;background:#fff;color:#111;font-family:Arial,Helvetica,sans-serif">
    <div style="display:flex;justify-content:space-between;align-items:flex-end;border-bottom:3px solid ${_PTR_AZ};padding-bottom:8px">
      <div style="font-size:18px;font-weight:900;color:${_PTR_AZ}">ZONAS DE TRABAJO</div>
      <div style="font-size:11px;color:#334155;text-align:right">Plan ${_ptrEsc(String(r.tipo||'').toLowerCase())} · ${_ptrEsc(_ptrPeriodo(r))} · Turno ${_ptrEsc(r.turno||'')}<br>Foto ${k+1} de ${fotos.length}</div>
    </div>
    ${f.nota?`<div style="margin-top:8px;font-size:12.5px;font-weight:700;color:#111">${_ptrEsc(f.nota)}</div>`:''}
    <div style="margin-top:8px">${_ptrFotoDoc(f,acts,712)}</div>
    ${_ptrLeyenda(f,acts)}
  </div>`);
}

// ── Visor y PDF (los mismos botones del Avance de Viajes) ──────────────────
function _ptrVerDoc(r,borrador){
  if(!r)return;
  _ptrDoc=r;
  let ov=document.getElementById('ptrDocView');
  if(!ov){ov=document.createElement('div');ov.id='ptrDocView';document.body.appendChild(ov);}
  ov.style.cssText='position:fixed;inset:0;z-index:300;background:rgba(5,8,15,.92);display:flex;flex-direction:column';
  const bt='font-size:.85rem;padding:.6rem 1rem;border-radius:8px;cursor:pointer;font-weight:800;white-space:nowrap';
  ov.innerHTML=`
    <div style="display:flex;gap:.5rem;align-items:center;padding:.6rem .8rem;border-bottom:1px solid #ffffff18;flex-wrap:wrap">
      <b style="flex:1;color:#e2e8f0;font-size:.9rem">📋 Plan de trabajo${borrador?' · vista previa (sin guardar)':''}</b>
      <button type="button" id="ptrBtnDesc" onclick="_ptrDescargarPdf()" style="${bt};border:none;background:#3b82f6;color:#fff" title="Guarda el PDF en Descargas">⬇ Descargar PDF</button>
      <button type="button" id="ptrBtnCopiar" onclick="_ptrCopiarImagen()" style="${bt};border:none;background:#f59e0b;color:#111" title="Copia la hoja como imagen: luego Ctrl+V en WhatsApp, correo, Teams…">📋 Copiar imagen</button>
      <button type="button" id="ptrBtnPdf" onclick="_ptrCompartirPdf()" style="${bt};border:none;background:#10b981;color:#0b1220">📤 Compartir</button>
      <button type="button" onclick="_ptrCerrarDoc()" style="${bt};background:none;border:1px solid #ffffff30;color:#e2e8f0">Cerrar</button>
    </div>
    <div style="flex:1;overflow:auto;-webkit-overflow-scrolling:touch;padding:12px">
      <div id="ptrDocWrap" style="max-width:794px;margin:0 auto;box-shadow:0 6px 24px rgba(0,0,0,.5)">${_ptrDocHtml(r)}</div>
    </div>`;
  const wrap=document.getElementById('ptrDocWrap');
  if(wrap&&typeof window!=='undefined'&&window.innerWidth){
    const disp=Math.min(794,window.innerWidth-24);
    if(disp<794){const h=wrap.firstElementChild;if(h){h.style.transform='scale('+(disp/794)+')';h.style.transformOrigin='top left';}wrap.style.width=disp+'px';}
  }
}
function _ptrCerrarDoc(){const ov=document.getElementById('ptrDocView');if(ov){ov.innerHTML='';ov.style.display='none';}_ptrDoc=null;}
function _ptrNombreArchivo(r){
  const quien=String(r.autor||'').replace(/[\\/:*?"<>|]+/g,'').trim().slice(0,40);
  return 'Plan de Trabajo '+(r.tipo==='Semanal'?'Semanal ':'')+String(r.fecha||'')+' '+String(r.turno||'')+(quien?' - '+quien:'')+'.pdf';
}
const _ptrLibH2C=()=>typeof _PT_LIB_H2C!=='undefined'?_PT_LIB_H2C:'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
const _ptrLibPdf=()=>typeof _PT_LIB_PDF!=='undefined'?_PT_LIB_PDF:'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
async function _ptrGenerarPdf(r){
  await _ptCargarLib(_ptrLibH2C(),()=>typeof window.html2canvas==='function');
  await _ptCargarLib(_ptrLibPdf(),()=>!!(window.jspdf&&window.jspdf.jsPDF));
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
    const cv=await dibujar(_ptrDocHtml(r,{sinFotos:true}));
    const raiz=caja.firstElementChild;
    if(typeof cv.getContext==='function'&&raiz&&typeof raiz.getBoundingClientRect==='function'&&typeof _ptPaginas==='function'){
      // Se reparte en hojas cortando entre filas y bloques (como el Parte de Turno)
      _ptPonerPaginas(pdf,cv,_ptPaginas(cv.height*794/cv.width,_ptCortesDoc(raiz),_PT_HOJA_PX),W,H);
    }else{
      const alto=cv.height*W/cv.width, img=cv.toDataURL('image/jpeg',0.92);
      let y=0;pdf.addImage(img,'JPEG',0,0,W,alto);
      while(alto-y>H){y+=H;pdf.addPage();pdf.addImage(img,'JPEG',0,-y,W,alto);}
    }
    for(const hoja of _ptrHojasFotos(r)){
      const c2=await dibujar(hoja);
      const h2=c2.height*W/c2.width, w2=h2>H?W*H/h2:W;
      pdf.addPage();pdf.addImage(c2.toDataURL('image/jpeg',0.88),'JPEG',(W-w2)/2,0,w2,Math.min(H,h2));
    }
    return pdf.output('blob');
  }finally{caja.remove();}
}
function _ptrBajarArchivo(blob,nombre){
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=nombre;
  document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},2000);
}
async function _ptrDescargarPdf(){
  const r=_ptrDoc;if(!r)return;
  const btn=document.getElementById('ptrBtnDesc');
  if(btn){btn.disabled=true;btn.textContent='Generando PDF…';}
  try{
    const nombre=_ptrNombreArchivo(r);
    _ptrBajarArchivo(await _ptrGenerarPdf(r),nombre);
    toast('PDF descargado: '+nombre);
  }catch(e){toast('No se pudo generar el PDF: '+((e&&e.message)||e),true);}
  finally{if(btn){btn.disabled=false;btn.textContent='⬇ Descargar PDF';}}
}
// La hoja del plan como imagen PNG (un PDF no se puede copiar al portapapeles)
async function _ptrImagenHoja(r){
  await _ptCargarLib(_ptrLibH2C(),()=>typeof window.html2canvas==='function');
  const caja=document.createElement('div');
  caja.style.cssText='position:fixed;left:-10000px;top:0;width:794px;background:#fff';
  document.body.appendChild(caja);
  try{
    caja.innerHTML=_ptrDocHtml(r,{sinFotos:true});
    await Promise.all([...caja.querySelectorAll('img')].map(im=>im.complete?null:new Promise(ok=>{im.onload=im.onerror=ok;})));
    const cv=await window.html2canvas(caja.firstElementChild,{scale:2,useCORS:true,backgroundColor:'#ffffff'});
    return await new Promise((ok,mal)=>cv.toBlob(b=>b?ok(b):mal(new Error('no se pudo crear la imagen')),'image/png'));
  }finally{caja.remove();}
}
async function _ptrCopiarImagen(){
  const r=_ptrDoc;if(!r)return;
  const btn=document.getElementById('ptrBtnCopiar');
  if(!(navigator.clipboard&&navigator.clipboard.write&&typeof ClipboardItem!=='undefined')){
    toast('Este navegador no permite copiar imágenes: use ⬇ Descargar PDF',true);return;
  }
  if(btn){btn.disabled=true;btn.textContent='Copiando…';}
  try{
    await navigator.clipboard.write([new ClipboardItem({'image/png':_ptrImagenHoja(r)})]);
    toast('✓ Hoja copiada como imagen: péguela con Ctrl+V en WhatsApp, correo o Teams');
  }catch(e){toast('No se pudo copiar la imagen: '+((e&&e.message)||e)+' · use ⬇ Descargar PDF',true);}
  finally{if(btn){btn.disabled=false;btn.textContent='📋 Copiar imagen';}}
}
async function _ptrCompartirPdf(){
  const r=_ptrDoc;if(!r)return;
  const btn=document.getElementById('ptrBtnPdf');
  if(btn){btn.disabled=true;btn.textContent='Generando PDF…';}
  try{
    const blob=await _ptrGenerarPdf(r);
    const nombre=_ptrNombreArchivo(r);
    const archivo=new File([blob],nombre,{type:'application/pdf'});
    if(navigator.canShare&&navigator.canShare({files:[archivo]})){
      try{await navigator.share({files:[archivo],title:'Plan de trabajo',text:`Plan de trabajo ${String(r.tipo).toLowerCase()} · ${_ptrPeriodo(r)} · turno ${r.turno}`});}
      catch(e){if(e&&e.name!=='AbortError')throw e;}
    }else{
      _ptrBajarArchivo(blob,nombre);
      toast('PDF descargado: '+nombre);
    }
  }catch(e){toast('No se pudo generar el PDF: '+((e&&e.message)||e),true);}
  finally{if(btn){btn.disabled=false;btn.textContent='📤 Compartir';}}
}

function _ptrEstilos(){
  return`<style>
  .ptr-cab{display:flex;gap:.8rem;flex-wrap:wrap;align-items:flex-end;padding:.7rem .9rem}
  .ptr-f{display:flex;flex-direction:column;gap:.3rem;font-size:.62rem;font-weight:700;letter-spacing:.07em;text-transform:uppercase;color:var(--muted2)}
  .ptr-f input,.ptr-f select,.ptr-f textarea{font-size:.84rem;padding:.45rem .55rem;border-radius:7px;border:1px solid var(--border);background:var(--panel2);color:var(--text);box-sizing:border-box;text-transform:none;letter-spacing:0;font-weight:400}
  .ptr-f textarea{width:100%;resize:vertical}
  .ptr-seg{display:flex;gap:.3rem;flex-wrap:wrap}
  .ptr-seg button{font-size:.82rem;padding:.42rem .8rem;border-radius:7px;border:1px solid var(--border);background:var(--panel2);color:var(--text);cursor:pointer;font-weight:700}
  .ptr-seg button.on{background:#f59e0b;border-color:#f59e0b;color:#111}
  .ptr-edit{font-size:.74rem;color:#f59e0b;font-weight:700;align-self:center}
  .ptr-edit button{background:none;border:0;color:var(--muted2);text-decoration:underline;cursor:pointer;font-size:.74rem}
  .ptr-in{font-size:.82rem;padding:.4rem .5rem;border-radius:6px;border:1px solid var(--border);background:var(--panel2);color:var(--text);width:100%;box-sizing:border-box;font-family:inherit}
  textarea.ptr-in{resize:vertical}
  .ptr-act{border:1px solid var(--c);border-radius:9px;padding:.7rem;background:var(--panel2);display:flex;flex-direction:column;gap:.55rem;margin-bottom:.7rem}
  .ptr-act-h{display:flex;gap:.45rem;align-items:center;flex-wrap:wrap}
  .ptr-n{width:26px;height:26px;border-radius:50%;background:var(--c);color:#fff;font-weight:900;font-size:.8rem;display:inline-flex;align-items:center;justify-content:center;flex:none}
  .ptr-grid{display:flex;gap:.7rem;flex-wrap:wrap;align-items:flex-start}
  .ptr-x{background:none;border:1px solid var(--border);color:var(--muted2);border-radius:6px;min-width:28px;height:28px;flex:none;cursor:pointer;font-size:.75rem}
  .ptr-x:hover{color:#f87171;border-color:#ef4444}
  .ptr-btn-eq{font-size:.78rem;padding:.4rem .7rem;border-radius:7px;border:1px solid #0891b270;background:rgba(8,145,178,.12);color:#22d3ee;cursor:pointer;font-weight:700}
  .ptr-chip{display:inline-block;padding:.12rem .45rem;border-radius:5px;border:1px solid #0891b2;background:rgba(8,145,178,.12);color:#67e8f9;font-size:.7rem;font-weight:800;text-transform:none;letter-spacing:0}
  .ptr-eq{display:flex;align-items:center;gap:.4rem;padding:.35rem .5rem;border:1px solid var(--border,#334155);border-radius:7px;margin-bottom:.3rem;cursor:pointer;font-size:.8rem}
  .ptr-eq.on{border-color:#0891b2;background:rgba(8,145,178,.15)}
  .ptr-fotos{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:.8rem}
  .ptr-foto{display:flex;flex-direction:column;gap:.35rem}
  .ptr-foto-img{position:relative;border-radius:8px;overflow:hidden;border:1px solid var(--border);cursor:pointer;background:#000}
  .ptr-foto-img img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block}
  .ptr-foto-k{position:absolute;left:6px;top:6px;background:rgba(0,0,0,.65);color:#fff;font-size:.68rem;font-weight:800;padding:.1rem .4rem;border-radius:4px}
  </style>`;
}
