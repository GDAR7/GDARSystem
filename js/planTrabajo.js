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
const _PTR_GUARDIAS=['A','B','C'];
const _PTR_MATERIALES=['COM','RCZ','Tipo 1','Tipo 2','Tipo 3','Concreto','Afirmado'];
const _PTR_SECTORES=['Estribo derecho','Estribo izquierdo','Aguas abajo','Aguas arriba','Contrafuerte','Corona','Talud'];
// Nota fija al pie del plan: se escribe una vez y queda para los siguientes
const _PTR_NOTA_DEF='El plan de trabajo está sujeto a cualquier cambio que requiera el Sponsor o nuestra Residencia.';
const _PTR_NOTA_KEY='gdar_ptr_nota';
function _ptrNotaDef(){try{const v=localStorage.getItem(_PTR_NOTA_KEY);if(v!=null)return v;}catch(e){}return _PTR_NOTA_DEF;}
// Tipos de restricción: los mismos del Avance de Viajes (con su código)
function _ptrMotivos(){
  if(typeof _avjMotivos==='function')return _avjMotivos();
  return[{codigo:'FO',nombre:'Falta de operador'},{codigo:'LL',nombre:'Lluvia / clima'},{codigo:'FL',nombre:'Frente sin liberar (topografía / QA)'},{codigo:'OT',nombre:'Otro'}];
}
const _ptrMotNombre=c=>(_ptrMotivos().find(m=>m.codigo===c)||{}).nombre||'';

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
// Sectores y materiales: los de siempre más los ya usados
function _ptrUsados(campo,base){
  const s=new Set(base);
  (DB.planTrabajo||[]).forEach(r=>(r.actividades||[]).forEach(a=>{if(a[campo])s.add(a[campo]);}));
  return [...s];
}
// Equipos de una actividad para mostrar: los códigos del Máster y, si se
// pusieron sin código, los tipos (ej. «Excavadora», «Volquetes»)
function _ptrEquiposTxt(a){
  const cods=(a.equipos&&a.equipos.length?a.equipos:(a.eqIds||[]).map(_ptrCodigo).filter(Boolean));
  const tipos=(a.tipos||[]).map(k=>_ptrIcono(k).n.replace(/ \(.*\)/,''));
  return [...cods,...tipos];
}

// ── Lectura ────────────────────────────────────────────────────────────────
function _ptrDeFila(f){
  return{id:f.id,tipo:f.tipo||'Diario',fecha:String(f.fecha||'').slice(0,10),turno:f.turno||'Día',guardia:f.guardia||'',titulo:f.titulo||'',
    responsable:f.responsable||'',actividades:f.actividades||[],fotos:f.fotos||[],observaciones:f.observaciones||'',
    restricciones:f.restricciones||[],nota:f.nota||'',
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
const _ptrActNueva=x=>({uid:_ptrNuevoUid(),dia:'',frente:'',sector:'',descripcion:'',material:'',meta:'',unidad:'',eqIds:[],tipos:[],personal:'',responsable:'',...(x||{})});
function _ptrNuevo(tipo,fecha){
  tipo=tipo||'Diario';
  let f=fecha||_ptrHoy();
  if(!fecha&&tipo==='Diario')f=_ptrSumar(_ptrHoy(),1);      // se planifica para mañana
  if(tipo==='Semanal')f=_ptrLunes(fecha||_ptrSumar(_ptrHoy(),7-((new Date().getDay()+6)%7)));
  return{id:null,tipo,fecha:f,turno:'Día',guardia:'',titulo:'',responsable:_ptrQuien(),actividades:[_ptrActNueva()],fotos:[],
    restricciones:[],observaciones:'',nota:_ptrNotaDef()};
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
  if(typeof _avjCargarMotivos==='function')Promise.resolve(_avjCargarMotivos()).then(()=>_ptrPintarRes()).catch(()=>{});
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
    ${dl('ptrDlS',_ptrUsados('sector',_PTR_SECTORES))}${dl('ptrDlM',_ptrUsados('material',_PTR_MATERIALES))}
    <div class="card" style="margin-bottom:.8rem"><div class="ptr-cab">
      <div class="ptr-f">Tipo<div class="ptr-seg">
        ${['Diario','Semanal'].map(t=>`<button type="button" class="${_ptr.tipo===t?'on':''}" onclick="_ptrSet('tipo','${t}')">${t==='Diario'?'📅':'🗓️'} ${t}</button>`).join('')}
      </div></div>
      <label class="ptr-f">${sem?'Semana (cualquier día)':'Fecha'}<input type="date" value="${_ptrEsc(_ptr.fecha)}" onchange="_ptrSet('fecha',this.value)" style="color-scheme:dark"></label>
      ${sem?`<div class="ptr-f">&nbsp;<span style="font-size:.8rem;color:#f59e0b;text-transform:none;letter-spacing:0;font-weight:700;padding:.45rem 0">${_ptrEsc(_ptrPeriodo(_ptr))}</span></div>`:''}
      <div class="ptr-f">Turno<div class="ptr-seg">
        ${_PTR_TURNOS.map(t=>`<button type="button" class="${_ptr.turno===t?'on':''}" onclick="_ptrSet('turno','${t}')">${t==='Día'?'☀️ ':t==='Noche'?'🌙 ':''}${t}</button>`).join('')}
      </div></div>
      <div class="ptr-f">Guardia<div class="ptr-seg">
        ${['',..._PTR_GUARDIAS].map(g=>`<button type="button" class="${(_ptr.guardia||'')===g?'on':''}" onclick="_ptrSet('guardia','${g}')">${g||'—'}</button>`).join('')}
      </div></div>
      <label class="ptr-f" style="flex:1;min-width:180px">Título / zona<input type="text" maxlength="80" value="${_ptrEsc(_ptr.titulo)}" placeholder="Opcional · ej. Dique Auxiliar – capa 58" oninput="_ptrSet('titulo',this.value,1)"></label>
      <label class="ptr-f" style="min-width:200px">Responsable del plan<input type="text" list="ptrDlP" maxlength="80" value="${_ptrEsc(_ptr.responsable)}" oninput="_ptrSet('responsable',this.value,1)"></label>
      ${_ptr.id?`<span class="ptr-edit">✏️ Editando un plan guardado · <button type="button" onclick="_ptrDescartar()">empezar uno nuevo</button></span>`:''}
      <button type="button" class="btn btn-a" style="--ba:#22c55e;margin-left:auto;align-self:center" onclick="_ptrPegarAbrir()" title="Pegue el plan escrito como texto (WhatsApp, correo, Word…) y el sistema lo arma">📋 Pegar desde texto</button>
    </div></div>
    <div class="card" style="margin-bottom:.8rem">
      <div class="card-head"><span class="card-title">🛠️ Actividades planificadas</span>
        <button type="button" class="btn btn-a" style="--ba:#3b82f6" onclick="_ptrActAgregar()">＋ Actividad</button></div>
      <div class="card-body"><div id="ptrActs"></div></div>
    </div>
    <div class="card" style="margin-bottom:.8rem">
      <div class="card-head"><span class="card-title">📷 Fotos de las zonas de trabajo</span>
        <span style="display:flex;gap:.5rem;flex-wrap:wrap">
          <button type="button" class="btn btn-out" onclick="_ptrPlanoGeneral()" title="La imagen aérea del proyecto (la misma del Avance de Viajes y el Parte de Turno)">🗺️ Agregar plano general</button>
          <button type="button" class="btn btn-out" onclick="_ptrFotosAnterior()" title="Trae las fotos del último plan guardado, sin subirlas otra vez">↺ Usar las fotos del plan anterior</button>
          <label class="btn btn-a" style="--ba:#10b981;cursor:pointer">＋ Agregar fotos<input type="file" accept="image/*" multiple style="display:none" onchange="_ptrFotosAgregar(this)"></label>
        </span></div>
      <div class="card-body"><div id="ptrFotos"></div></div>
    </div>
    <div class="card" style="margin-bottom:.8rem">
      <div class="card-head"><span class="card-title">⛔ Restricciones</span>
        <button type="button" class="btn btn-a" style="--ba:#ef4444" onclick="_ptrResAgregar()">＋ Restricción</button></div>
      <div class="card-body"><div id="ptrRes"></div></div>
    </div>
    <div class="card" style="margin-bottom:.8rem"><div class="card-body" style="display:flex;flex-direction:column;gap:.7rem">
      <label class="ptr-f">Observaciones<textarea rows="2" maxlength="800" oninput="_ptrSet('observaciones',this.value,1)" placeholder="Opcional · recursos que faltan, coordinaciones, riesgos…">${_ptrEsc(_ptr.observaciones)}</textarea></label>
      <label class="ptr-f">Nota fija al pie del plan <span style="text-transform:none;letter-spacing:0;font-weight:400">· se recuerda para los siguientes planes</span><textarea rows="2" maxlength="400" oninput="_ptrSet('nota',this.value,1)">${_ptrEsc(_ptr.nota)}</textarea></label>
    </div></div>
    <div style="display:flex;gap:.6rem;justify-content:flex-end;flex-wrap:wrap;margin-bottom:1.2rem">
      <button type="button" class="btn btn-out" onclick="_ptrVerDoc(_ptrCopia(),1)">👁 Vista previa</button>
      <button type="button" class="btn btn-a" style="--ba:#10b981" id="ptrBtnGuardar" onclick="_ptrGuardar()">💾 Guardar y ver PDF</button>
    </div>`;
  _ptrPintarActs();_ptrPintarFotos();_ptrPintarRes();
}
// ── Restricciones del plan (mismos tipos y códigos del Avance de Viajes) ───
function _ptrPintarRes(){
  const el=document.getElementById('ptrRes');if(!el||!_ptr)return;
  const M=_ptrMotivos();
  el.innerHTML=(_ptr.restricciones||[]).map((x,i)=>{
    const eqs=(x.eqIds||[]).map(_ptrCodigo).filter(Boolean);
    return`<div class="ptr-res">
      <select class="ptr-in" style="width:auto;min-width:200px" onchange="_ptrRes(${i},'codigo',this.value)">
        ${M.map(m=>`<option value="${_ptrEsc(m.codigo)}"${x.codigo===m.codigo?' selected':''}>${_ptrEsc(m.codigo)} · ${_ptrEsc(m.nombre)}</option>`).join('')}</select>
      <input class="ptr-in" maxlength="200" placeholder="Qué pasa (ej. Tractor #1 en Huantajalla sin operador por salud)" value="${_ptrEsc(x.descripcion)}" oninput="_ptrRes(${i},'descripcion',this.value,1)" style="flex:1;min-width:220px">
      <button type="button" class="ptr-btn-eq" onclick="_ptrEqAbrir(${i},1)">🚜 ${eqs.length?eqs.map(_ptrEsc).join(', '):'Equipo'}</button>
      <button type="button" class="ptr-x" title="Quitar" onclick="_ptrResQuitar(${i})">✕</button>
    </div>`;
  }).join('')||'<div style="text-align:center;color:var(--muted2);font-size:.8rem;padding:.5rem">Sin restricciones</div>';
}
function _ptrResAgregar(){
  if(!_ptr)return;
  (_ptr.restricciones=_ptr.restricciones||[]).push({codigo:(_ptrMotivos()[0]||{}).codigo||'OT',descripcion:'',eqIds:[]});
  _ptrPintarRes();
}
function _ptrRes(i,campo,v,soloDato){
  const x=_ptr&&(_ptr.restricciones||[])[i];if(!x)return;
  x[campo]=v;if(!soloDato)_ptrPintarRes();
}
function _ptrResQuitar(i){if(!_ptr)return;_ptr.restricciones.splice(i,1);_ptrPintarRes();}
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
        <input class="ptr-in" list="ptrDlS" maxlength="60" placeholder="Sector (ej. Estribo derecho)" value="${_ptrEsc(a.sector)}" oninput="_ptrAct(${i},'sector',this.value,1)" style="flex:1;min-width:150px">
        <button type="button" class="ptr-x" title="Duplicar" onclick="_ptrActDuplicar(${i})">⧉</button>
        <button type="button" class="ptr-x" title="Quitar" onclick="_ptrActQuitar(${i})">✕</button>
      </div>
      <textarea class="ptr-in" rows="2" maxlength="600" placeholder="Qué se va a hacer (una línea por tarea)" oninput="_ptrAct(${i},'descripcion',this.value,1)">${_ptrEsc(a.descripcion)}</textarea>
      <div class="ptr-grid">
        <label class="ptr-f">Material<input class="ptr-in" list="ptrDlM" maxlength="30" value="${_ptrEsc(a.material)}" placeholder="COM, RCZ…" oninput="_ptrAct(${i},'material',this.value,1)" style="width:100px"></label>
        <label class="ptr-f">Meta<span style="display:flex;gap:.3rem"><input class="ptr-in" type="number" min="0" step="any" value="${_ptrEsc(a.meta)}" placeholder="cant." oninput="_ptrAct(${i},'meta',this.value,1)" style="width:90px">
          <input class="ptr-in" list="ptrDlU" maxlength="20" value="${_ptrEsc(a.unidad)}" placeholder="unidad" oninput="_ptrAct(${i},'unidad',this.value,1)" style="width:90px"></span></label>
        <label class="ptr-f">Personal (N°)<input class="ptr-in" type="number" min="0" step="1" value="${_ptrEsc(a.personal)}" oninput="_ptrAct(${i},'personal',this.value,1)" style="width:90px"></label>
        <label class="ptr-f" style="flex:1;min-width:170px">Responsable<input class="ptr-in" list="ptrDlP" maxlength="80" value="${_ptrEsc(a.responsable)}" oninput="_ptrAct(${i},'responsable',this.value,1)"></label>
        <div class="ptr-f" style="flex:2;min-width:200px">Equipos
          <div style="display:flex;gap:.3rem;flex-wrap:wrap;align-items:center">
            <button type="button" class="ptr-btn-eq" onclick="_ptrEqAbrir(${i})">🚜 ${eqs.length||(a.tipos||[]).length?'Cambiar ('+(eqs.length+(a.tipos||[]).length)+')':'Elegir'}</button>
            ${eqs.map(c=>`<span class="ptr-chip">${_ptrEsc(c)}</span>`).join('')}
            ${(a.tipos||[]).map(k=>`<span class="ptr-chip" style="border-style:dashed" title="Tipo de equipo, sin código">${_ptrEsc(_ptrIcono(k).n.replace(/ \(.*\)/,''))}</span>`).join('')}
          </div></div>
      </div>
    </div>`;
  }).join('')||'<div style="text-align:center;color:var(--muted2);font-size:.8rem;padding:1rem">Sin actividades: agregue una con «＋ Actividad»</div>';
}
function _ptrSet(campo,v,soloDato){
  if(!_ptr)return;
  _ptr[campo]=v;
  if(campo==='nota'){try{localStorage.setItem(_PTR_NOTA_KEY,String(v||''));}catch(e){}}
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
  _ptr.actividades.splice(i+1,0,{...a,uid:_ptrNuevoUid(),eqIds:[...(a.eqIds||[])],tipos:[...(a.tipos||[])]});
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
let _ptrEqRes=false;          // el selector es para una restricción (no una actividad)
const _ptrEqItem=()=>_ptr&&(_ptrEqRes?(_ptr.restricciones||[]):_ptr.actividades)[_ptrEqI];
// Tipos que se pueden poner sin código (máquinas y personal de la paleta)
const _PTR_TIPOS_EQ=['excavadora','retro','cargador','tractor','motoniveladora','rodillo','volquete','cisterna','combustible','trompo','carmix','plancha','zaranda','personal'];
function _ptrTipo(i,k,on){
  const a=_ptr&&_ptr.actividades[i];if(!a)return;
  a.tipos=(a.tipos||[]).filter(x=>x!==k);if(on)a.tipos.push(k);
}
function _ptrEqAbrir(i,res){
  _ptrEqRes=!!res;
  _ptrEqI=i;
  if(!_ptrEqItem())return;
  let ov=document.getElementById('ptrEqView');
  if(!ov){ov=document.createElement('div');ov.id='ptrEqView';document.body.appendChild(ov);}
  ov.style.cssText='position:fixed;inset:0;z-index:300;background:rgba(5,8,15,.85);display:flex;align-items:center;justify-content:center;padding:12px';
  ov.innerHTML=`<div style="background:var(--panel,#0f172a);border:1px solid var(--border,#334155);border-radius:12px;width:min(560px,100%);max-height:88vh;display:flex;flex-direction:column">
    <div style="display:flex;align-items:center;gap:.5rem;padding:.7rem .9rem;border-bottom:1px solid var(--border,#334155)">
      <b style="flex:1;font-size:.9rem">🚜 Equipos · ${_ptrEqRes?'restricción':'actividad'} ${i+1}</b>
      <button type="button" onclick="_ptrEqCerrar()" class="btn btn-a" style="--ba:#10b981">✓ Listo</button></div>
    ${_ptrEqRes?'':`<div style="padding:.6rem .9rem 0">
      <div style="font-size:.62rem;font-weight:800;letter-spacing:.07em;text-transform:uppercase;color:var(--muted2);margin-bottom:.3rem">Por tipo, sin código (si todavía no se sabe cuál)</div>
      <div style="display:flex;gap:.3rem;flex-wrap:wrap">${_PTR_TIPOS_EQ.map(k=>{const on=(_ptr.actividades[i].tipos||[]).includes(k);
        return`<label class="ptr-eq${on?' on':''}" style="margin:0;padding:.25rem .45rem;font-size:.72rem"><input type="checkbox"${on?' checked':''} onchange="_ptrTipo(${i},'${k}',this.checked);this.parentNode.classList.toggle('on',this.checked)" style="display:none">${_ptrIconoSvg(k,22)}${_ptrEsc(_ptrIcono(k).n.replace(/ \(.*\)/,''))}</label>`;}).join('')}</div></div>`}
    <div style="padding:.6rem .9rem"><input class="ptr-in" placeholder="Buscar código o tipo (volquete, excavadora…)" oninput="_ptrEqLista(this.value)"></div>
    <div id="ptrEqLista" style="overflow:auto;padding:0 .9rem .9rem"></div></div>`;
  _ptrEqLista('');
}
function _ptrEqLista(q){
  const el=document.getElementById('ptrEqLista');const a=_ptrEqItem();if(!el||!a)return;
  const t=String(q||'').toLowerCase().trim();
  const L=_ptrEquipos().filter(e=>!t||(String(e.codigo||'')+' '+String(e.sub||'')).toLowerCase().includes(t));
  let sub=null,h='';
  L.forEach(e=>{
    if(e.sub!==sub){sub=e.sub;h+=`<div style="margin:.6rem 0 .25rem;font-size:.62rem;font-weight:800;letter-spacing:.07em;text-transform:uppercase;color:var(--muted2)">${_ptrEsc(sub||'Sin tipo')}</div>`;}
    const on=(a.eqIds||[]).some(x=>+x===+e.id);
    h+=`<label class="ptr-eq${on?' on':''}"><input type="checkbox"${on?' checked':''} onchange="_ptrEqMarca(${+e.id},this.checked);this.parentNode.classList.toggle('on',this.checked)"> <b>${_ptrEsc(e.codigo)}</b> <span style="color:var(--muted2);font-size:.72rem">${_ptrEsc(e.est||'')}</span></label>`;
  });
  el.innerHTML=h||'<div style="color:var(--muted2);font-size:.8rem;padding:.6rem 0">Sin equipos que coincidan</div>';
}
function _ptrActEq(i,id,on){
  const a=_ptr&&_ptr.actividades[i];if(!a)return;
  a.eqIds=(a.eqIds||[]).filter(x=>+x!==+id);
  if(on)a.eqIds.push(+id);
}
function _ptrEqMarca(id,on){
  const a=_ptrEqItem();if(!a)return;
  a.eqIds=(a.eqIds||[]).filter(x=>+x!==+id);
  if(on)a.eqIds.push(+id);
}
function _ptrEqCerrar(){
  const ov=document.getElementById('ptrEqView');if(ov){ov.innerHTML='';ov.style.display='none';}
  const res=_ptrEqRes;_ptrEqI=null;_ptrEqRes=false;
  if(res)_ptrPintarRes();else _ptrPintarActs();
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
// La imagen aérea del proyecto como una foto más (no se sube: ya está en el sistema)
function _ptrPlanoGeneral(){
  if(!_ptr)return;
  const url=typeof _PT_MAPA_IMG!=='undefined'?_PT_MAPA_IMG:'09.-ERP/Imagenes/R3_2026_IMAGEN.png';
  if(_ptr.fotos.some(f=>f.url===url)){toast('El plano general ya está en este plan');return;}
  if(_ptr.fotos.length>=_PTR_FOTOS_MAX){toast(`Ya hay ${_PTR_FOTOS_MAX} fotos en este plan: es el máximo`,true);return;}
  const prop=typeof _PT_MAPA_PROP!=='undefined'?_PT_MAPA_PROP:1339/2208;
  // Va primero: es la vista de conjunto
  _ptr.fotos.unshift({url,nombre:'Plano general',nota:'Plano general del proyecto',asp:+(1/prop).toFixed(4),marcas:[],general:true});
  _ptrPintarFotos();
  toast('✓ Plano general agregado: toque «✏️ Marcar» para dibujar las zonas');
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

// ── Íconos de equipos y recursos (dibujados aquí, 48×48) ───────────────────
// Se ponen sobre la foto con un toque, en un recuadro con el color de la
// actividad. Ruedas, cabinas y vidrios comparten estilo para que se vean de
// la misma familia.
const _ptrRueda=(x,y,r)=>`<circle cx="${x}" cy="${y}" r="${r||4}" fill="#1f2937"/><circle cx="${x}" cy="${y}" r="${((r||4)*.4).toFixed(1)}" fill="#9ca3af"/>`;
const _ptrCabina=(x,y,w,h)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="1.5" fill="#f59e0b" stroke="#1f2937" stroke-width="1.5"/><rect x="${x+w*.45}" y="${y+2}" width="${w*.45}" height="${h*.38}" rx=".8" fill="#bfdbfe" stroke="#1f2937" stroke-width="1"/>`;
const _PTR_ICONOS=[
  {k:'trompo',n:'Trompo de concreto',s:`<rect x="3" y="30" width="41" height="4" fill="#4b5563"/>${_ptrCabina(33,18,11,13)}
    <g transform="rotate(-14 19 22)"><ellipse cx="19" cy="22" rx="14" ry="8.5" fill="#e5e7eb" stroke="#1f2937" stroke-width="1.5"/><path d="M9 16 L13 28 M15 14.5 L19 29.5 M21 14 L25 29.5 M27 15 L30 28" stroke="#9ca3af" stroke-width="1.6"/></g>
    <path d="M5 25 L1 31" stroke="#1f2937" stroke-width="2" stroke-linecap="round"/>${_ptrRueda(10,36)}${_ptrRueda(20,36)}${_ptrRueda(38,36)}`},
  {k:'carmix',n:'Carmix (mixer autocargable)',s:`<rect x="5" y="26" width="30" height="8" rx="1.5" fill="#f59e0b" stroke="#1f2937" stroke-width="1.5"/>
    <g transform="rotate(16 17 19)"><ellipse cx="17" cy="19" rx="11" ry="7" fill="#e5e7eb" stroke="#1f2937" stroke-width="1.5"/><path d="M10 14 L13 24 M16 12.5 L18 25.5 M22 13 L23 24.5" stroke="#9ca3af" stroke-width="1.5"/></g>
    <path d="M28 14 L28 26 M37 14 L37 26 M27 14 L38 14" stroke="#1f2937" stroke-width="1.8"/><rect x="29" y="18" width="7" height="6" fill="#bfdbfe" stroke="#1f2937" stroke-width="1"/>
    <path d="M35 29 L42 31" stroke="#1f2937" stroke-width="2.2"/><path d="M40 25 L47 25 L47 34 L41 34 Z" fill="#9ca3af" stroke="#1f2937" stroke-width="1.5"/>${_ptrRueda(12,36,5)}${_ptrRueda(30,36,5)}`},
  {k:'plancha',n:'Plancha compactadora (con operador)',s:`<rect x="6" y="39" width="22" height="4" rx="1" fill="#374151"/><rect x="8" y="29" width="17" height="10" rx="2" fill="#f59e0b" stroke="#1f2937" stroke-width="1.5"/>
    <rect x="11" y="31.5" width="8" height="4" rx="1" fill="#1f2937"/><path d="M24 32 L34 22" stroke="#1f2937" stroke-width="2.2" stroke-linecap="round"/>
    <circle cx="38" cy="10" r="3.6" fill="#f2c9a0" stroke="#1f2937" stroke-width="1"/><path d="M33.6 9 A4.4 4.4 0 0 1 42.4 9 Z" fill="#facc15" stroke="#1f2937" stroke-width="1"/>
    <path d="M38 14 L38 28" stroke="#f97316" stroke-width="5" stroke-linecap="round"/><path d="M38 18 L34 22" stroke="#f97316" stroke-width="2.4" stroke-linecap="round"/>
    <path d="M38 27 L35 42 M38 27 L42 42" stroke="#1e3a8a" stroke-width="2.6" stroke-linecap="round"/>`},
  {k:'excavadora',n:'Excavadora',s:`<rect x="3" y="36" width="26" height="7" rx="3.5" fill="#374151"/><rect x="5" y="27" width="22" height="9" rx="1.5" fill="#f59e0b" stroke="#1f2937" stroke-width="1.5"/>${_ptrCabina(16,19,10,9)}
    <path d="M9 28 L21 9 L37 15" fill="none" stroke="#f59e0b" stroke-width="4.5" stroke-linejoin="round"/><path d="M9 28 L21 9 L37 15" fill="none" stroke="#1f2937" stroke-width="1"/>
    <path d="M37 15 L40 29" stroke="#1f2937" stroke-width="2.5"/><path d="M35 29 L45 29 L42 37 L37 35 Z" fill="#9ca3af" stroke="#1f2937" stroke-width="1.5"/>`},
  {k:'volquete',n:'Volquete',s:`<rect x="3" y="31" width="41" height="3" fill="#4b5563"/><path d="M3 17 L31 15 L31 31 L5 31 Z" fill="#f59e0b" stroke="#1f2937" stroke-width="1.5"/>
    <path d="M8 20 L8 28 M15 19.5 L15 28 M22 19 L22 28" stroke="#b45309" stroke-width="1.2"/>${_ptrCabina(33,19,11,12)}${_ptrRueda(9,37)}${_ptrRueda(19,37)}${_ptrRueda(39,37)}`},
  {k:'rodillo',n:'Rodillo compactador',s:`<rect x="3" y="24" width="16" height="16" rx="8" fill="#9ca3af" stroke="#1f2937" stroke-width="1.5"/><path d="M5 32 L17 32" stroke="#4b5563" stroke-width="1.2"/>
    <rect x="18" y="25" width="22" height="9" rx="1.5" fill="#f59e0b" stroke="#1f2937" stroke-width="1.5"/><path d="M25 25 L25 12 M37 25 L37 12 M23 12 L39 12" stroke="#1f2937" stroke-width="1.8"/>${_ptrRueda(36,37,6)}`},
  {k:'cargador',n:'Cargador frontal',s:`<rect x="16" y="23" width="25" height="11" rx="1.5" fill="#f59e0b" stroke="#1f2937" stroke-width="1.5"/>${_ptrCabina(27,11,11,12)}
    <path d="M11 30 L22 27" stroke="#1f2937" stroke-width="2.6"/><path d="M2 25 L12 25 L12 36 L4 36 Z" fill="#9ca3af" stroke="#1f2937" stroke-width="1.5"/>${_ptrRueda(21,37,6)}${_ptrRueda(37,37,6)}`},
  {k:'motoniveladora',n:'Motoniveladora',s:`<path d="M5 26 L34 24" stroke="#f59e0b" stroke-width="5" stroke-linecap="round"/><path d="M5 26 L34 24" stroke="#1f2937" stroke-width="1"/>${_ptrCabina(31,13,11,16)}
    <path d="M13 34 L27 31" stroke="#374151" stroke-width="3" stroke-linecap="round"/><path d="M20 27 L20 32" stroke="#1f2937" stroke-width="1.6"/>${_ptrRueda(7,37,5)}${_ptrRueda(33,38,5)}${_ptrRueda(43,38,5)}`},
  {k:'tractor',n:'Tractor oruga',s:`<rect x="6" y="34" width="32" height="9" rx="4.5" fill="#374151"/><circle cx="11" cy="38.5" r="2" fill="#9ca3af"/><circle cx="33" cy="38.5" r="2" fill="#9ca3af"/>
    <rect x="9" y="25" width="25" height="9" rx="1.5" fill="#f59e0b" stroke="#1f2937" stroke-width="1.5"/>${_ptrCabina(19,14,11,11)}
    <path d="M34 29 L40 30" stroke="#1f2937" stroke-width="2.4"/><path d="M40 20 Q45 30 41 42 L38 42 Q41 31 37 21 Z" fill="#9ca3af" stroke="#1f2937" stroke-width="1.4"/>
    <path d="M9 31 L3 37 L5 40" fill="none" stroke="#1f2937" stroke-width="2"/>`},
  {k:'retro',n:'Retroexcavadora',s:`<rect x="12" y="24" width="22" height="10" rx="1.5" fill="#f59e0b" stroke="#1f2937" stroke-width="1.5"/>${_ptrCabina(18,12,11,12)}
    <path d="M34 28 L42 28" stroke="#1f2937" stroke-width="2.4"/><path d="M40 23 L47 23 L47 33 L41 33 Z" fill="#9ca3af" stroke="#1f2937" stroke-width="1.4"/>
    <path d="M12 26 L5 12 L2 22" fill="none" stroke="#f59e0b" stroke-width="3.5" stroke-linejoin="round"/><path d="M12 26 L5 12 L2 22" fill="none" stroke="#1f2937" stroke-width="1"/>
    <path d="M0 22 L5 22 L4 28 L1 27 Z" fill="#9ca3af" stroke="#1f2937" stroke-width="1.2"/>${_ptrRueda(17,37,5)}${_ptrRueda(33,37,6)}`},
  {k:'zaranda',n:'Zaranda',s:`<path d="M6 14 L40 26 L40 31 L6 19 Z" fill="#9ca3af" stroke="#1f2937" stroke-width="1.4"/>
    <path d="M10 16 L10 20.5 M15 17.8 L15 22.3 M20 19.6 L20 24.1 M25 21.4 L25 25.9 M30 23.2 L30 27.7 M35 25 L35 29.5" stroke="#4b5563" stroke-width="1"/>
    <path d="M10 20 L8 42 M36 30 L38 42 M22 25 L21 42" stroke="#f59e0b" stroke-width="2.6" stroke-linecap="round"/>
    <path d="M40 31 L45 40" stroke="#1f2937" stroke-width="1.5"/><path d="M38 40 L47 40 L46 44 L39 44 Z" fill="#a8a29e" stroke="#1f2937" stroke-width="1"/>
    <path d="M4 10 L12 4" stroke="#1f2937" stroke-width="1.5"/><circle cx="5" cy="9" r="1.6" fill="#a8a29e"/><circle cx="9" cy="6" r="1.4" fill="#a8a29e"/>`},
  {k:'cisterna',n:'Cisterna de agua',s:`<rect x="3" y="31" width="41" height="3" fill="#4b5563"/><rect x="3" y="16" width="29" height="15" rx="7" fill="#60a5fa" stroke="#1f2937" stroke-width="1.5"/>
    <path d="M9 23 Q11 19 13 23 Q11 26 9 23 Z" fill="#fff"/>${_ptrCabina(34,19,10,12)}${_ptrRueda(9,37)}${_ptrRueda(19,37)}${_ptrRueda(39,37)}`},
  {k:'personal',n:'Personal / cuadrilla',s:`<circle cx="24" cy="12" r="5.5" fill="#f2c9a0" stroke="#1f2937" stroke-width="1.2"/><path d="M17.5 10.5 A6.5 6.5 0 0 1 30.5 10.5 L32 11 L16 11 Z" fill="#facc15" stroke="#1f2937" stroke-width="1.2"/>
    <path d="M15 24 Q24 17 33 24 L32 35 L16 35 Z" fill="#f97316" stroke="#1f2937" stroke-width="1.3"/><path d="M18 27 L30 27" stroke="#e5e7eb" stroke-width="2"/>
    <path d="M19 35 L18 45 M29 35 L30 45" stroke="#1e3a8a" stroke-width="4" stroke-linecap="round"/>`},
  {k:'torre',n:'Torre de iluminación',s:`<rect x="13" y="38" width="22" height="4" rx="1" fill="#f59e0b" stroke="#1f2937" stroke-width="1.3"/>${_ptrRueda(17,44,3)}${_ptrRueda(31,44,3)}
    <path d="M24 38 L24 12" stroke="#374151" stroke-width="2.5"/><rect x="14" y="5" width="20" height="8" rx="1.5" fill="#374151"/>
    <circle cx="19" cy="9" r="2.4" fill="#fde047"/><circle cx="29" cy="9" r="2.4" fill="#fde047"/><path d="M14 15 L8 22 M34 15 L40 22" stroke="#fde047" stroke-width="2" stroke-linecap="round"/>`},
  {k:'senal',n:'Señalización / cono',s:`<path d="M24 5 L35 40 L13 40 Z" fill="#f97316" stroke="#1f2937" stroke-width="1.5"/><path d="M19.5 22 L28.5 22 L30 27 L18 27 Z" fill="#fff"/><path d="M16.5 32 L31.5 32 L32.6 35.5 L15.4 35.5 Z" fill="#fff"/><rect x="8" y="40" width="32" height="4" rx="1" fill="#1f2937"/>`}
];
// Imágenes propias de la empresa (09.-ERP/Imagenes/iconos-plan/, PNG con
// fondo transparente): reemplazan al dibujo del mismo equipo. Las marcas ya
// puestas guardan solo la clave (k), así que toman la imagen nueva solas.
// Para sumar otra: copiar el PNG a la carpeta y agregar aquí su línea.
const _PTR_ICO_DIR='09.-ERP/Imagenes/iconos-plan/';
// Cisterna de combustible: solo existe como imagen (el dibujo es de respaldo)
_PTR_ICONOS.splice(_PTR_ICONOS.findIndex(i=>i.k==='cisterna')+1,0,{k:'combustible',n:'Cisterna de combustible',s:`<rect x="3" y="31" width="41" height="3" fill="#4b5563"/><rect x="3" y="16" width="29" height="15" rx="7" fill="#e5e7eb" stroke="#1f2937" stroke-width="1.5"/>
  <rect x="16" y="19" width="14" height="6" fill="#facc15"/><path d="M10 20 L13 23 L10 26 L7 23 Z" fill="#ef4444"/>${_ptrCabina(34,19,10,12)}${_ptrRueda(9,37)}${_ptrRueda(19,37)}${_ptrRueda(39,37)}`});
// Escenas de operación (dos equipos trabajando juntos): solo existen como
// imagen; el dibujo de respaldo es el del equipo que carga
{const s=k=>(_PTR_ICONOS.find(i=>i.k===k)||{}).s||'';
  _PTR_ICONOS.push(
    {k:'exc_volq',n:'Carguío: excavadora + volquete',s:s('excavadora')},
    {k:'carg_volq',n:'Carguío: cargador + volquete',s:s('cargador')},
    {k:'exc_zar',n:'Zarandeo: excavadora + zaranda',s:s('excavadora')},
    {k:'carg_zar',n:'Zarandeo: cargador + zaranda',s:s('cargador')});}
// [clave, archivo, nombre que se muestra]
const _PTR_ICO_IMG={
  volquete:['Volquete.png'], excavadora:['Excavadora_orugas.png'], retro:['Retroexcavadora.png'],
  cargador:['Cargadora_frontal.png'], tractor:['Bulldozer.png'], motoniveladora:['Motoniveladora.png'],
  rodillo:['Rodillo_compactador.png'], zaranda:['Zaranda_movil.png','Zaranda móvil'],
  trompo:['Trompo de concreto.png'], carmix:['Carmix.png','Carmix (mixer autocargable)'],
  plancha:['Plancha compactadora.png','Plancha compactadora'], cisterna:['Cisterna_agua.png'],
  combustible:['Cisterna_combustible.png'], personal:['Personal piso.png','Personal de piso'],
  torre:['T. Luminaria.png','Torre de luminaria'],
  exc_volq:['excavadora_cargando_volquete.png'], carg_volq:['cargador_y_volquete.png'],
  exc_zar:['excavadora_y_zaranda.png'], carg_zar:['cargador_y_zaranda.png']
};
_PTR_ICONOS.forEach(i=>{const x=_PTR_ICO_IMG[i.k];if(!x)return;
  i.img=_PTR_ICO_DIR+encodeURIComponent(x[0]);      // hay nombres con espacios y puntos
  if(x[1])i.n=x[1];});
// Ya no se ofrece (las marcas viejas con ese ícono se siguen viendo)
const _PTR_ICO_OCULTOS=['senal'];
const _ptrIconosPaleta=()=>_PTR_ICONOS.filter(i=>!_PTR_ICO_OCULTOS.includes(i.k));
const _ptrIcono=k=>_PTR_ICONOS.find(i=>i.k===k)||_PTR_ICONOS[0];
// El ícono a px de lado: la imagen de la empresa si hay, si no el dibujo
const _ptrIconoSvg=(k,px)=>{const i=_ptrIcono(k);
  // Los PNG traen margen transparente: se agrandan un poco dentro de su cuadro
  return i.img?`<span style="display:block;width:${px}px;height:${px}px;overflow:hidden"><img src="${_ptrEsc(i.img)}" alt="" draggable="false" style="display:block;width:${Math.round(px*1.16)}px;height:${Math.round(px*1.16)}px;max-width:none;margin:${-Math.round(px*.08)}px 0 0 ${-Math.round(px*.08)}px;object-fit:contain"></span>`
    :`<svg width="${px}" height="${px}" viewBox="0 0 48 48" style="display:block">${i.s}</svg>`;};

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
    }else if(m.tipo==='icono'){
      // Recuadro blanco con el ícono, borde del color de la actividad y su número
      const p=m.pts[0], s=Math.round(tam*2), b=Math.max(14,Math.round(tam*.62));
      nums+=`<div style="position:absolute;left:${n(+p.x)}%;top:${n(+p.y)}%;transform:translate(-50%,-50%);width:${s}px;height:${s}px;border-radius:7px;background:#fff;border:2.5px solid ${a.col};box-shadow:0 1px 5px rgba(0,0,0,.6);box-sizing:border-box;padding:1px;pointer-events:none">${_ptrIconoSvg(m.icono,s-7)}
        <span style="position:absolute;right:-${Math.round(b*.45)}px;top:-${Math.round(b*.45)}px;width:${b}px;height:${b}px;border-radius:50%;background:${a.col};border:1.5px solid #fff;color:#fff;font:900 ${Math.round(b*.6)}px Arial,sans-serif;display:flex;align-items:center;justify-content:center;box-sizing:border-box">${a.n}</span></div>`;
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
  _ptrEd={k,tool:'zona',act:prevAct,icono:(_ptrEd&&_ptrEd.icono)||_PTR_ICONOS[0].k,pend:[],zoom:0,sel:null,hist:[],copia:JSON.parse(JSON.stringify(f.marcas||[]))};
  let ov=document.getElementById('ptrEdView');
  if(!ov){ov=document.createElement('div');ov.id='ptrEdView';document.body.appendChild(ov);}
  ov.style.cssText='position:fixed;inset:0;z-index:300;background:rgba(5,8,15,.94);display:flex;flex-direction:column';
  if(typeof document.addEventListener==='function'){document.removeEventListener('keydown',_ptrEdTecla);document.addEventListener('keydown',_ptrEdTecla);}
  _ptrEdPintar();
}
function _ptrEdTecla(e){
  if(!_ptrEd)return;
  if(e.key==='Escape'){if(_ptrEd.pend.length){_ptrEd.pend=[];_ptrEdPintar();}else if(_ptrEd.sel!=null){_ptrEd.sel=null;_ptrEdPintar();}else _ptrEdCerrar(false);}
  else if((e.key==='Delete'||e.key==='Supr')&&_ptrEdSel())_ptrEdBorrarSel();
  else if(e.key==='Enter'&&_ptrEd.tool==='zona'&&_ptrEd.pend.length>=3)_ptrEdCerrarZona();
  else if((e.ctrlKey||e.metaKey)&&e.key==='z'){e.preventDefault();_ptrEdDeshacer();}
}
function _ptrEdPintar(){
  const ov=document.getElementById('ptrEdView');if(!ov||!_ptrEd||!_ptr)return;
  const f=_ptr.fotos[_ptrEd.k];if(!f)return;
  const selM=_ptrEdSel();
  const actVista=selM?selM.act:_ptrEd.act;
  const ia=_ptr.actividades.findIndex(a=>a.uid===_ptrEd.act), col=_ptrColor(Math.max(0,ia));
  const z=_PTR_ZOOMS[_ptrEd.zoom];
  const bt='font-size:.8rem;padding:.5rem .75rem;border-radius:7px;cursor:pointer;font-weight:700;white-space:nowrap;border:1px solid #ffffff25;background:#ffffff10;color:#e2e8f0';
  const tool=(t,l)=>`<button type="button" onclick="_ptrEdHerr('${t}')" style="${bt};${_ptrEd.tool===t?'background:#f59e0b;border-color:#f59e0b;color:#111':''}">${l}</button>`;
  const ayuda={zona:_ptrEd.pend.length>=3?'Siga tocando para agregar puntos · toque el primer punto o «✓ Cerrar zona» para terminar':'Toque los bordes de la zona, punto por punto (3 o más)',
    flecha:_ptrEd.pend.length?'Ahora toque a dónde apunta la flecha':'Toque dónde empieza la flecha',
    numero:'Toque dónde va el número de la actividad',borrar:'Toque una marca para borrarla',
    icono:`Toque dónde va: <b>${_ptrEsc(_ptrIcono(_ptrEd.icono).n)}</b> (elija otro arriba)`,
    editar:selM?'Arrastre los puntos blancos para cambiar la forma · <b>✥</b> mueve toda la marca · <b>＋</b> agrega un punto · clic derecho (o dedo sostenido) en un punto lo quita · toque otra actividad arriba para cambiarla'
      :'Toque una marca (zona, flecha, número o ícono) para editarla'}[_ptrEd.tool];
  const sc=document.getElementById('ptrEdScroll');const pos=sc?{l:sc.scrollLeft,t:sc.scrollTop}:null;
  ov.innerHTML=`
    <div style="display:flex;align-items:center;gap:.45rem;padding:.55rem .8rem;border-bottom:1px solid #ffffff18;color:#e2e8f0;flex-wrap:wrap">
      <b style="font-size:.9rem;margin-right:.3rem">✏️ Foto ${_ptrEd.k+1}</b>
      ${tool('zona','⬠ Zona')}${tool('flecha','➜ Flecha')}${tool('numero','① Número')}${tool('icono','🧰 Íconos')}${tool('editar','✋ Editar')}${tool('borrar','🧽 Borrar')}
      <button type="button" onclick="_ptrEdDeshacer()" style="${bt}" title="Ctrl+Z">↶ Deshacer</button>
      <span style="flex:1"></span>
      <button type="button" onclick="_ptrEdZoom(-1)" style="${bt}">−</button><span style="font-size:.75rem;min-width:40px;text-align:center">${z}%</span><button type="button" onclick="_ptrEdZoom(1)" style="${bt}">+</button>
    </div>
    ${_ptrEd.tool==='icono'?`<div style="display:flex;gap:.35rem;padding:.45rem .8rem;border-bottom:1px solid #ffffff18;overflow-x:auto;align-items:center">
      <span style="font-size:.7rem;color:#94a3b8;white-space:nowrap">Ícono:</span>
      ${_ptrIconosPaleta().map(i=>`<button type="button" onclick="_ptrEdIcono('${i.k}')" title="${_ptrEsc(i.n)}" style="flex:none;display:flex;flex-direction:column;align-items:center;gap:2px;padding:.3rem .4rem;border-radius:8px;cursor:pointer;background:#fff;border:3px solid ${_ptrEd.icono===i.k?'#f59e0b':'transparent'};width:78px">
        ${_ptrIconoSvg(i.k,38)}<span style="font-size:.58rem;font-weight:700;color:#1f2937;line-height:1.1;text-align:center;white-space:normal">${_ptrEsc(i.n.replace(/ \(.*\)/,''))}</span></button>`).join('')}
    </div>`:''}
    <div style="display:flex;gap:.35rem;padding:.45rem .8rem;border-bottom:1px solid #ffffff18;overflow-x:auto;align-items:center">
      <span style="font-size:.7rem;color:#94a3b8;white-space:nowrap">Actividad:</span>
      ${_ptr.actividades.map((a,i)=>`<button type="button" onclick="_ptrEdAct('${a.uid}')" title="${_ptrEsc(a.descripcion||'')}" style="${bt};display:flex;align-items:center;gap:.35rem;${a.uid===actVista?`border-color:${_ptrColor(i)};background:${_ptrColor(i)}33`:''}"><span style="width:20px;height:20px;border-radius:50%;background:${_ptrColor(i)};color:#fff;font-weight:900;font-size:.7rem;display:inline-flex;align-items:center;justify-content:center">${i+1}</span>${_ptrEsc((a.frente||'Actividad '+(i+1)).slice(0,28))}</button>`).join('')}
    </div>
    <div id="ptrEdScroll" style="flex:1;overflow:auto;-webkit-overflow-scrolling:touch;padding:10px">
      <div id="ptrEdBox" onclick="_ptrEdToque(event)" style="position:relative;width:${z}%;max-width:${z===100?'1100px':'none'};margin:0 auto;aspect-ratio:${(+f.asp||4/3).toFixed(4)};cursor:crosshair">
        <img src="${_ptrEsc(f.url)}" alt="" draggable="false" style="position:absolute;inset:0;width:100%;height:100%;display:block;user-select:none;pointer-events:none">
        <div id="ptrEdCapa" style="position:absolute;inset:0;pointer-events:none">${_ptrMarcasHtml(f,_ptr.actividades,{pend:{pts:_ptrEd.pend,col}})}</div>
        <div id="ptrEdAsas">${_ptrEdAsas(f)}</div>
      </div>
    </div>
    <div style="padding:.6rem .8rem;border-top:1px solid #ffffff18;display:flex;gap:.45rem;flex-wrap:wrap;align-items:center;color:#cbd5e1">
      <span style="font-size:.8rem;flex:1;min-width:200px">${ayuda}</span>
      ${_ptrEd.tool==='zona'&&_ptrEd.pend.length>=3?`<button type="button" onclick="_ptrEdCerrarZona()" style="${bt};background:${col};border-color:${col};color:#fff">✓ Cerrar zona</button>`:''}
      ${_ptrEd.pend.length?`<button type="button" onclick="_ptrEdCancelarTrazo()" style="${bt}">Cancelar trazo</button>`:''}
      ${selM?`<button type="button" onclick="_ptrEdBorrarSel()" style="${bt};border-color:#ef444470;color:#f87171">🗑 Borrar esta marca</button>`:''}
      <button type="button" onclick="_ptrEdCerrar(false)" style="${bt};background:none">Descartar cambios</button>
      <button type="button" onclick="_ptrEdCerrar(true)" style="${bt};border:none;background:#10b981;color:#0b1220">✓ Listo</button>
    </div>`;
  const sc2=document.getElementById('ptrEdScroll');if(sc2&&pos){sc2.scrollLeft=pos.l;sc2.scrollTop=pos.t;}
}
function _ptrEdHerr(t){if(!_ptrEd)return;_ptrEd.tool=t;_ptrEd.pend=[];if(t!=='editar')_ptrEd.sel=null;_ptrEdPintar();}
function _ptrEdAct(uid){
  if(!_ptrEd)return;
  // Con una marca elegida en «Editar», la actividad se le cambia a esa marca
  const m=_ptrEdSel();
  if(m&&m.act!==uid){_ptrEdGuardarHist();m.act=uid;}
  _ptrEd.act=uid;_ptrEdPintar();
}
// ── Editar marcas: elegir, arrastrar puntos, mover, agregar y quitar puntos ─
const _ptrEdFoto=()=>_ptrEd&&_ptr&&_ptr.fotos[_ptrEd.k];
function _ptrEdSel(){
  const f=_ptrEdFoto();
  return f&&_ptrEd.tool==='editar'&&_ptrEd.sel!=null?(f.marcas||[])[_ptrEd.sel]||null:null;
}
function _ptrEdGuardarHist(){
  const f=_ptrEdFoto();if(!f)return;
  _ptrEd.hist.push(JSON.stringify(f.marcas||[]));
  if(_ptrEd.hist.length>80)_ptrEd.hist.shift();
}
const _ptrLim=v=>+Math.max(0,Math.min(100,v)).toFixed(2);
// ¿El punto cae dentro de la zona? (en % con la proporción de la foto)
function _ptrDentro(p,P,asp){
  let d=false;
  for(let i=0,j=P.length-1;i<P.length;j=i++){
    const yi=P[i].y/asp, yj=P[j].y/asp, py=p.y/asp;
    if(((yi>py)!==(yj>py))&&(p.x<(P[j].x-P[i].x)*(py-yi)/((yj-yi)||1e-9)+P[i].x))d=!d;
  }
  return d;
}
// La marca más cercana al toque (o la zona que lo contiene)
function _ptrEdMarcaEn(f,p){
  const asp=+f.asp||4/3, dist=(a,b)=>Math.hypot(a.x-b.x,(a.y-b.y)/asp);
  let mejor=-1,dm=5;
  (f.marcas||[]).forEach((m,i)=>{
    const cands=[...(m.pts||[]),...(m.tipo==='zona'?[_ptrCentro(m.pts)]:[])];
    if(m.tipo==='flecha'&&m.pts.length>1)cands.push({x:(m.pts[0].x+m.pts[1].x)/2,y:(m.pts[0].y+m.pts[1].y)/2});
    cands.forEach(q=>{const d=dist(p,q);if(d<dm){dm=d;mejor=i;}});
  });
  if(mejor<0)(f.marcas||[]).forEach((m,i)=>{if(mejor<0&&m.tipo==='zona'&&(m.pts||[]).length>=3&&_ptrDentro(p,m.pts,asp))mejor=i;});
  return mejor;
}
function _ptrEdAsas(f){
  const m=_ptrEdSel();if(!m)return'';
  const ia=_ptr.actividades.findIndex(a=>a.uid===m.act), col=_ptrColor(Math.max(0,ia));
  const pos=p=>`position:absolute;left:${(+p.x).toFixed(2)}%;top:${(+p.y).toFixed(2)}%;transform:translate(-50%,-50%);touch-action:none;pointer-events:auto;z-index:3`;
  const P=m.pts||[];let h='';
  // ＋ en la mitad de cada lado de la zona: agrega un punto ahí
  if(m.tipo==='zona')P.forEach((p,j)=>{const q=P[(j+1)%P.length];
    h+=`<div onpointerdown="_ptrEdMedioDown(event,${j})" onclick="event.stopPropagation()" title="Agregar un punto aquí" style="${pos({x:(+p.x+ +q.x)/2,y:(+p.y+ +q.y)/2})};width:15px;height:15px;border-radius:50%;background:${col};border:1.5px solid #fff;color:#fff;font:900 11px/12px Arial;text-align:center;cursor:copy;opacity:.85">+</div>`;});
  // ✥ mueve toda la marca
  if(P.length>1){const c=m.tipo==='zona'?_ptrCentro(P):{x:(+P[0].x+ +P[1].x)/2,y:(+P[0].y+ +P[1].y)/2};
    h+=`<div onpointerdown="_ptrEdAsaDown(event,-1)" onclick="event.stopPropagation()" title="Mover toda la marca" style="${pos(c)};width:26px;height:26px;border-radius:50%;background:#0f172acc;border:2px solid #fff;color:#fff;font:900 15px/22px Arial;text-align:center;cursor:move">✥</div>`;}
  // Los puntos
  P.forEach((p,j)=>{h+=`<div onpointerdown="_ptrEdAsaDown(event,${j})" oncontextmenu="_ptrEdAsaMenu(event,${j})" onclick="event.stopPropagation()" title="${P.length>1?'Arrastre para mover este punto · clic derecho lo quita':'Arrastre para mover'}" style="${pos(p)};width:17px;height:17px;border-radius:50%;background:#fff;border:3.5px solid ${col};box-shadow:0 0 0 1.5px #000a;cursor:grab"></div>`;});
  return h;
}
// Repinta solo las marcas y los puntos (sin recargar la foto) mientras se arrastra
function _ptrEdCapa(){
  const f=_ptrEdFoto();if(!f)return;
  const c=document.getElementById('ptrEdCapa'), a=document.getElementById('ptrEdAsas');
  const ia=_ptr.actividades.findIndex(x=>x.uid===_ptrEd.act);
  if(c)c.innerHTML=_ptrMarcasHtml(f,_ptr.actividades,{pend:{pts:_ptrEd.pend,col:_ptrColor(Math.max(0,ia))}});
  if(a)a.innerHTML=_ptrEdAsas(f);
}
function _ptrEdArrastrar(ev,fn){
  if(ev.preventDefault)ev.preventDefault();if(ev.stopPropagation)ev.stopPropagation();
  const box=document.getElementById('ptrEdBox');if(!box)return;
  const r=box.getBoundingClientRect();if(!r.width||!r.height)return;
  const x0=ev.clientX, y0=ev.clientY;
  const mover=e=>{fn((e.clientX-x0)/r.width*100,(e.clientY-y0)/r.height*100);_ptrEdCapa();};
  const soltar=()=>{document.removeEventListener('pointermove',mover);document.removeEventListener('pointerup',soltar);document.removeEventListener('pointercancel',soltar);_ptrEd.arrastro=Date.now();_ptrEdPintar();};
  document.addEventListener('pointermove',mover);document.addEventListener('pointerup',soltar);document.addEventListener('pointercancel',soltar);
}
// j = punto; -1 = toda la marca
function _ptrEdMoverPunto(j,dx,dy,o){
  const m=_ptrEdSel();if(!m)return;
  if(j<0||m.pts.length===1)m.pts=o.map(p=>({x:_ptrLim(+p.x+dx),y:_ptrLim(+p.y+dy)}));
  else m.pts[j]={x:_ptrLim(+o[j].x+dx),y:_ptrLim(+o[j].y+dy)};
}
function _ptrEdAsaDown(ev,j){
  const m=_ptrEdSel();if(!m||(ev.button!=null&&ev.button!==0))return;
  _ptrEdGuardarHist();
  const o=m.pts.map(p=>({...p}));
  _ptrEdArrastrar(ev,(dx,dy)=>_ptrEdMoverPunto(j,dx,dy,o));
}
function _ptrEdAgregarPunto(j){
  const m=_ptrEdSel();if(!m||m.tipo!=='zona')return -1;
  const p=m.pts[j], q=m.pts[(j+1)%m.pts.length];
  m.pts.splice(j+1,0,{x:_ptrLim((+p.x+ +q.x)/2),y:_ptrLim((+p.y+ +q.y)/2)});
  return j+1;
}
function _ptrEdMedioDown(ev,j){
  if(!_ptrEdSel()||(ev.button!=null&&ev.button!==0))return;
  _ptrEdGuardarHist();
  const n=_ptrEdAgregarPunto(j);if(n<0)return;
  const o=_ptrEdSel().pts.map(p=>({...p}));
  _ptrEdCapa();
  _ptrEdArrastrar(ev,(dx,dy)=>_ptrEdMoverPunto(n,dx,dy,o));
}
function _ptrEdQuitarPunto(j){
  const m=_ptrEdSel();if(!m)return false;
  if(m.tipo!=='zona'){toast('Ese punto no se puede quitar: use «🗑 Borrar esta marca»',true);return false;}
  if(m.pts.length<=3){toast('Una zona necesita al menos 3 puntos',true);return false;}
  _ptrEdGuardarHist();m.pts.splice(j,1);return true;
}
function _ptrEdAsaMenu(ev,j){
  if(ev.preventDefault)ev.preventDefault();if(ev.stopPropagation)ev.stopPropagation();
  if(_ptrEdQuitarPunto(j))_ptrEdPintar();
}
function _ptrEdBorrarSel(){
  const f=_ptrEdFoto();if(!f||_ptrEd.sel==null)return;
  _ptrEdGuardarHist();f.marcas.splice(_ptrEd.sel,1);_ptrEd.sel=null;_ptrEdPintar();
}
function _ptrEdIcono(k){if(!_ptrEd)return;_ptrEd.icono=k;_ptrEd.tool='icono';_ptrEdPintar();}
function _ptrEdZoom(d){if(!_ptrEd)return;_ptrEd.zoom=Math.max(0,Math.min(_PTR_ZOOMS.length-1,_ptrEd.zoom+d));_ptrEdPintar();}
function _ptrEdCancelarTrazo(){if(!_ptrEd)return;_ptrEd.pend=[];_ptrEdPintar();}
// Un toque en la foto, ya pasado a % (separado para poder probarlo)
function _ptrEdPunto(p){
  const f=_ptrEd&&_ptr&&_ptr.fotos[_ptrEd.k];if(!f)return;
  f.marcas=f.marcas||[];
  const asp=+f.asp||4/3, dist=(a,b)=>Math.hypot(a.x-b.x,(a.y-b.y)/asp);   // en % del ancho
  const t=_ptrEd.tool;
  _ptrEd.hist=_ptrEd.hist||[];
  if(t==='editar'){
    // Un clic que termina un arrastre no cambia la marca elegida
    if(_ptrEd.arrastro&&Date.now()-_ptrEd.arrastro<350){_ptrEdPintar();return;}
    const i=_ptrEdMarcaEn(f,p);_ptrEd.sel=i<0?null:i;
    if(i>=0)_ptrEd.act=f.marcas[i].act;
  }
  else if(t==='numero'){_ptrEdGuardarHist();f.marcas.push({tipo:'numero',act:_ptrEd.act,pts:[p]});}
  else if(t==='icono'){_ptrEdGuardarHist();f.marcas.push({tipo:'icono',icono:_ptrIcono(_ptrEd.icono).k,act:_ptrEd.act,pts:[p]});}
  else if(t==='flecha'){
    if(!_ptrEd.pend.length)_ptrEd.pend=[p];
    else{_ptrEdGuardarHist();f.marcas.push({tipo:'flecha',act:_ptrEd.act,pts:[_ptrEd.pend[0],p]});_ptrEd.pend=[];}
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
    if(mejor>=0){_ptrEdGuardarHist();f.marcas.splice(mejor,1);}
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
  _ptrEdGuardarHist();
  (f.marcas=f.marcas||[]).push({tipo:'zona',act:_ptrEd.act,pts:_ptrEd.pend.slice()});
  _ptrEd.pend=[];_ptrEdPintar();
}
// Deshacer: el último punto del trazo en curso o el último cambio (agregar,
// borrar, mover puntos, cambiar de actividad)
function _ptrEdDeshacer(){
  const f=_ptrEd&&_ptr&&_ptr.fotos[_ptrEd.k];if(!f)return;
  if(_ptrEd.pend.length)_ptrEd.pend.pop();
  else if((_ptrEd.hist||[]).length){f.marcas=JSON.parse(_ptrEd.hist.pop());if(_ptrEd.sel!=null&&!f.marcas[_ptrEd.sel])_ptrEd.sel=null;}
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
  return{id:r.id,tipo:r.tipo,fecha:sem?_ptrLunes(r.fecha):r.fecha,turno:r.turno,guardia:r.guardia||'',titulo:String(r.titulo||'').trim(),
    responsable:String(r.responsable||'').trim(),
    restricciones:(r.restricciones||[]).filter(x=>String(x.descripcion||'').trim()||(x.eqIds||[]).length).map(x=>({codigo:x.codigo||'OT',
      motivo:_ptrMotNombre(x.codigo)||x.motivo||'',descripcion:String(x.descripcion||'').trim(),
      eqIds:(x.eqIds||[]).map(Number),equipos:(x.eqIds||[]).map(_ptrCodigo).filter(Boolean)})),
    nota:String(r.nota||'').trim(),
    actividades:r.actividades.map(a=>({uid:a.uid,dia:sem&&dias.includes(a.dia)?a.dia:'',frente:String(a.frente||'').trim(),
      sector:String(a.sector||'').trim(),material:String(a.material||'').trim(),tipos:[...(a.tipos||[])],
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
    const fila={id,tipo:r.tipo,fecha:r.fecha,turno:r.turno,guardia:r.guardia||null,titulo:r.titulo||null,responsable:r.responsable||null,
      actividades:r.actividades,fotos:r.fotos,restricciones:r.restricciones,nota:r.nota||null,observaciones:r.observaciones||null,autor:r.autor,
      creado_en:igual&&igual.creadoEn||_ptr.creadoEn||ahora,actualizado_en:ahora};
    const{error}=await supa.from(_PTR_TABLA).upsert(fila);
    if(error){
      // Tabla creada con la primera versión del SQL: faltan las columnas nuevas
      if(/guardia|restricciones|nota/.test(String(error.message||'')))
        toast('Falta ejecutar de nuevo sql/plan_trabajo.sql (agrega guardia, restricciones y nota). No se borra nada.',true);
      else toast('No se pudo guardar el plan: '+error.message,true);
      return;
    }
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
      <td>${_ptrEsc(r.turno)}${r.guardia?' · G-'+_ptrEsc(r.guardia):''}${(r.restricciones||[]).length?` <span style="color:#ef4444;font-weight:700" title="Restricciones">⛔ ${r.restricciones.length}</span>`:''}</td>
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
  return{id:base?null:r.id,tipo:r.tipo,fecha,turno:r.turno,guardia:r.guardia||'',titulo:r.titulo||'',responsable:r.responsable||'',
    restricciones:(r.restricciones||[]).map(x=>({...x,eqIds:[...(x.eqIds||[])]})),
    nota:r.nota!=null&&r.nota!==''?r.nota:_ptrNotaDef(),
    actividades:(r.actividades||[]).map(a=>({..._ptrActNueva(),...a,eqIds:[...(a.eqIds||[])],tipos:[...(a.tipos||[])],
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
    // Íconos de esta actividad en la foto: «🚛 Volquete ×3»
    const cuenta={};(f.marcas||[]).filter(m=>m.tipo==='icono'&&m.act===a.uid).forEach(m=>{cuenta[m.icono]=(cuenta[m.icono]||0)+1;});
    const iconos=Object.keys(cuenta).map(k=>`<span style="display:inline-flex;align-items:center;gap:3px;margin:3px 10px 0 0;font-size:10.5px;color:#334155;white-space:nowrap">${_ptrIconoSvg(k,20)}${_ptrEsc(_ptrIcono(k).n)}${cuenta[k]>1?' <b>×'+cuenta[k]+'</b>':''}</span>`).join('');
    return`<tr><td style="width:28px;padding:4px 6px;border:1px solid #d6dbe3;text-align:center">${_ptrChip(i)}</td>
      <td style="padding:4px 7px;border:1px solid #d6dbe3;font-size:11px;font-weight:700;width:150px">${_ptrEsc(a.frente||'—')}${a.sector?`<div style="font-weight:400;color:#475569">${_ptrEsc(a.sector)}</div>`:''}</td>
      <td style="padding:4px 7px;border:1px solid #d6dbe3;font-size:11px"><div style="white-space:pre-wrap">${_ptrEsc(String(a.descripcion||'').slice(0,220))}</div>${iconos?`<div style="display:flex;flex-wrap:wrap">${iconos}</div>`:''}</td>
      <td style="padding:4px 7px;border:1px solid #d6dbe3;font-size:11px;font-weight:800;text-align:right;white-space:nowrap;width:80px">${_ptrEsc(_ptrMetaTxt(a))}</td></tr>`;}).join('')}</table>`;
}
function _ptrDocHtml(r,opc){
  const AZ=_PTR_AZ, AC=_PTR_AC;
  const logo=(typeof EMPRESA!=='undefined'&&EMPRESA.logo)?EMPRESA.logo:'';
  const acts=r.actividades||[], fotos=r.fotos||[], sem=r.tipo==='Semanal';
  const TD='padding:6px 8px;border:1px solid #d6dbe3;font-size:11.5px;vertical-align:top;color:#111;white-space:normal';
  const TH=`padding:6px 8px;border:1px solid ${AZ};background:${AZ};color:#fff;font-size:10px;text-transform:uppercase;letter-spacing:.04em;text-align:left;white-space:normal`;
  const vacio=v=>v===''||v==null;
  // Columnas que salen solo si alguna actividad las usa
  const C={sector:acts.some(a=>a.sector),material:acts.some(a=>a.material),meta:acts.some(a=>!vacio(a.meta)),
    equipos:acts.some(a=>_ptrEquiposTxt(a).length),personal:acts.some(a=>!vacio(a.personal)),resp:acts.some(a=>a.responsable)};
  const cols=[['N°',34,'center'],C.sector&&['Sector',104],['Actividad',0],C.material&&['Material',76,'center'],C.meta&&['Meta',76,'right'],
    C.equipos&&['Equipos',112],C.personal&&['Pers.',44,'center'],C.resp&&['Responsable',94]].filter(Boolean);
  const nCol=cols.length;
  const fila=(a,i)=>`<tr>
    <td style="${TD};text-align:center">${_ptrChip(i)}</td>
    ${C.sector?`<td style="${TD};font-weight:700">${_ptrEsc(a.sector||'—')}</td>`:''}
    <td style="${TD};white-space:pre-wrap">${_ptrEsc(a.descripcion||'')}</td>
    ${C.material?`<td style="${TD};text-align:center;font-weight:800">${_ptrEsc(a.material||'—')}</td>`:''}
    ${C.meta?`<td style="${TD};text-align:right;font-weight:800;white-space:nowrap">${_ptrEsc(_ptrMetaTxt(a))}</td>`:''}
    ${C.equipos?`<td style="${TD};font-size:10.5px">${_ptrEsc(_ptrEquiposTxt(a).join(', ')||'—')}</td>`:''}
    ${C.personal?`<td style="${TD};text-align:center">${!vacio(a.personal)?_ptrEsc(a.personal):'—'}</td>`:''}
    ${C.resp?`<td style="${TD};font-size:10.5px">${_ptrEsc(a.responsable||'—')}</td>`:''}</tr>`;
  const franja=(t,fondo,col)=>`<tr><td colspan="${nCol}" style="padding:5px 8px;border:1px solid #d6dbe3;background:${fondo};color:${col};font-size:10.5px;font-weight:900;text-transform:uppercase;letter-spacing:.05em">${t}</td></tr>`;
  // Agrupado por frente, en el orden en que se cargaron
  const porFrente=L=>{
    const fr=[];L.forEach(o=>{const k=o.a.frente||'';if(!fr.includes(k))fr.push(k);});
    return fr.map(k=>franja('▸ '+_ptrEsc(k||'Sin frente'),'#e8eef7',AZ)+L.filter(o=>(o.a.frente||'')===k).map(o=>fila(o.a,o.i)).join('')).join('');
  };
  const todos=acts.map((a,i)=>({a,i}));
  let cuerpo='';
  if(sem){
    // Por día (primero lo de toda la semana) y dentro, por frente
    ['',..._ptrSemana(r.fecha).map(d=>d.iso)].forEach(d=>{
      const L=todos.filter(o=>(o.a.dia||'')===d);if(!L.length)return;
      cuerpo+=franja(_ptrEsc(_ptrDiaTxt(r,d)),AZ,'#fff')+porFrente(L);
    });
  }else cuerpo=porFrente(todos);
  const R=r.restricciones||[];
  const personal=acts.reduce((s,a)=>s+_ptrN(a.personal),0);
  const nEq=new Set(acts.flatMap(a=>(a.eqIds||[]).map(Number))).size+acts.reduce((s,a)=>s+(a.tipos||[]).length,0);
  const nFr=new Set(acts.map(a=>a.frente).filter(Boolean)).size;
  const caja=(l,v,col)=>`<div style="flex:1;border:2px solid ${col};border-radius:8px;padding:7px 10px;min-width:0">
      <div style="font-size:9px;font-weight:800;color:#64748b;text-transform:uppercase;letter-spacing:.06em">${l}</div>
      <div style="font-size:19px;font-weight:900;color:${col};margin-top:1px">${v}</div></div>`;
  const conMarcas=fotos.filter(f=>(f.marcas||[]).length).length;
  return`<div style="width:794px;box-sizing:border-box;padding:34px 40px;background:#fff;color:#111;font-family:Arial,Helvetica,sans-serif">
    <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;border-bottom:3px solid ${AZ};padding-bottom:10px">
      <div>
        <div style="font-size:22px;font-weight:900;color:${AZ};letter-spacing:.02em;white-space:nowrap">PLAN DE TRABAJO ${sem?'SEMANAL':'DIARIO'}</div>
        <div style="font-size:13px;color:#334155;margin-top:3px;text-transform:${sem?'none':'capitalize'}">${_ptrEsc(_ptrPeriodo(r))}</div>
        ${r.titulo?`<div style="font-size:12.5px;color:#111;margin-top:3px;font-weight:700">${_ptrEsc(r.titulo)}</div>`:''}
      </div>
      <div style="display:flex;align-items:center;gap:12px">
        <span style="font-size:13px;font-weight:800;padding:6px 14px;border-radius:20px;background:${r.turno==='Noche'?'#1e293b':'#f59e0b'};color:${r.turno==='Noche'?'#fff':'#111'};white-space:nowrap">Turno ${_ptrEsc(r.turno||'')}${r.guardia?' · Guardia '+_ptrEsc(r.guardia):''}</span>
        ${logo?`<img src="${_ptrEsc(logo)}" alt="" style="height:52px;max-width:170px;object-fit:contain">`:''}
      </div>
    </div>
    <div style="display:flex;gap:10px;margin-top:12px">
      ${caja('Frentes',nFr||'—',AZ)}${caja('Actividades',acts.length,'#0f766e')}${caja('Equipos',nEq||'—','#0891b2')}
      ${personal?caja('Personal',personal,'#16a34a'):''}${caja('Restricciones',R.length||'0',R.length?'#dc2626':'#16a34a')}
      ${caja('Responsable',`<span style="font-size:13px">${_ptrEsc(r.responsable||'—')}</span>`,AC)}
    </div>
    ${_ptrTit('Actividades planificadas · '+acts.length)}
    <table style="width:100%;border-collapse:collapse;margin-top:6px;table-layout:fixed">
      <colgroup>${cols.map(c=>c[1]?`<col style="width:${c[1]}px">`:'<col>').join('')}</colgroup>
      <tr>${cols.map(c=>`<th style="${TH}${c[2]?';text-align:'+c[2]:''}">${c[0]}</th>`).join('')}</tr>
      ${cuerpo||`<tr><td colspan="${nCol}" style="${TD};text-align:center;color:#64748b">Sin actividades</td></tr>`}
    </table>
    ${R.length?`${_ptrTit('<span style="color:#dc2626">⛔ Restricciones · '+R.length+'</span>')}
    <table style="width:100%;border-collapse:collapse;margin-top:6px;table-layout:fixed">
      <colgroup><col style="width:52px"><col style="width:170px"><col style="width:120px"><col></colgroup>
      ${R.map(x=>`<tr>
        <td style="${TD};text-align:center"><span style="display:inline-block;padding:2px 6px;border-radius:4px;background:#fee2e2;border:1px solid #fca5a5;color:#b91c1c;font-weight:900;font-size:10.5px">${_ptrEsc(x.codigo||'—')}</span></td>
        <td style="${TD};font-weight:700">${_ptrEsc(x.motivo||_ptrMotNombre(x.codigo)||'—')}</td>
        <td style="${TD};font-size:10.5px">${_ptrEsc((x.equipos&&x.equipos.length?x.equipos:(x.eqIds||[]).map(_ptrCodigo).filter(Boolean)).join(', ')||'—')}</td>
        <td style="${TD}">${_ptrEsc(x.descripcion||'')}</td></tr>`).join('')}
    </table>`:''}
    ${r.observaciones?`<div style="margin-top:12px;border-left:4px solid #64748b;background:#f8fafc;padding:9px 12px;border-radius:0 6px 6px 0">
      <div style="font-size:10px;font-weight:800;color:#475569;text-transform:uppercase;letter-spacing:.06em">Observaciones</div>
      <div style="font-size:12px;margin-top:3px;white-space:pre-wrap">${_ptrEsc(r.observaciones)}</div></div>`:''}
    ${fotos.length?(opc&&opc.sinFotos
      ?`<div style="margin-top:12px;font-size:11.5px;color:#475569">📷 <b>Zonas de trabajo:</b> ${fotos.length} foto(s)${conMarcas?' con las actividades marcadas':''}, en las hojas siguientes.</div>`
      :fotos.map((f,k)=>`${_ptrTit('Zonas de trabajo · Foto '+(k+1)+' de '+fotos.length+(f.nota?' <span style="font-weight:600;text-transform:none;letter-spacing:0;color:#64748b">· '+_ptrEsc(f.nota)+'</span>':''))}
        <div style="margin-top:6px">${_ptrFotoDoc(f,acts,712)}</div>${_ptrLeyenda(f,acts)}`).join('')):''}
    ${r.nota?`<div style="margin-top:12px;padding:8px 12px;border:1px dashed #94a3b8;border-radius:6px;font-size:11px;color:#334155;background:#f8fafc"><b style="color:#111">NOTA:</b> ${_ptrEsc(r.nota)}</div>`:''}
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
  return 'Plan de Trabajo '+(r.tipo==='Semanal'?'Semanal ':'')+String(r.fecha||'')+' '+String(r.turno||'')+(r.guardia?' Guardia '+r.guardia:'')+(quien?' - '+quien:'')+'.pdf';
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

// ── 📋 Pegar desde texto ────────────────────────────────────────────────
// Arma el plan con el texto tal como se escribe en el grupo:
//   PLAN DE TRABAJO TURNO DIA GUARDIA B      → turno y guardia
//   15/11/2026                               → fecha
//   *DIQUE INTERMEDIO                        → frente (línea con *)
//   ESTRIBO DERECHO; PREPARACION DE…         → sector + actividad
//   ESTRIBO IZQUIERDO                        → sector de las líneas que siguen
//   CARGUIO DE MATERIAL COMUN (COM) CON…     → actividad (material y equipos)
//   RESTRICCIONES :                          → lo que sigue son restricciones
//   NOTA: …                                  → nota fija
const _ptrSinTilde=s=>String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'');
const _ptrTitulo=s=>String(s||'').toLowerCase().replace(/(^|[\s(\-–/])([a-záéíóúñü])/g,(m,a,b)=>a+b.toUpperCase());
const _ptrClaveTxt=s=>_ptrSinTilde(s).toLowerCase().replace(/z/g,'s').replace(/[^a-z0-9]+/g,' ').trim();
// El frente escrito («MEZA DE PLÀTA») con el nombre del Máster («Mesa de plata») si se parece
function _ptrFrenteDe(txt){
  const k=_ptrClaveTxt(txt);if(!k)return'';
  const L=_ptrFrentes();
  const f=L.find(n=>_ptrClaveTxt(n)===k)||L.find(n=>_ptrClaveTxt(n).endsWith(k))||L.find(n=>_ptrClaveTxt(n).includes(k));
  return f||_ptrTitulo(txt);
}
const _PTR_SECTOR_RE=/^(ESTRIBO\s+(?:DERECHO|IZQUIERDO)|AGUAS\s+(?:ABAJO|ARRIBA)(?:\s+(?:DEL\s+)?(?:CONTRAFUERTE|DIQUE))?|CONTRAFUERTE|CORONA|TALUD(?:\s+(?:AGUAS\s+)?\w+)?|PLATAFORMA|BERMA)\b\s*[;:,.\-]*\s*/i;
// Equipos que se mencionan → tipos (íconos). La retro va antes que la excavadora.
const _PTR_EQ_PALABRAS=[[/RETRO\s*EXCAVADORA|RETRO\b/,'retro'],[/EXCAVADORA|\bEXC\b\.?/,'excavadora'],[/VOLQUETE/,'volquete'],
  [/CARGADOR(?:\s+FRONTAL)?|\bCF\b/,'cargador'],[/TRACTOR/,'tractor'],[/MOTONIVELADORA|\bMOTO\b/,'motoniveladora'],[/RODILLO/,'rodillo'],
  [/CISTERNA\s+DE\s+COMBUSTIBLE|COMBUSTIBLE|PETROLERO/,'combustible'],[/CISTERNA/,'cisterna'],[/TROMPO|MIXER/,'trompo'],[/CARMIX/,'carmix'],[/PLANCHA/,'plancha'],[/[ZS]ARANDA/,'zaranda'],[/PERSONAL/,'personal']];
function _ptrTiposDe(txt){
  let t=_ptrSinTilde(txt).toUpperCase();const out=[];
  _PTR_EQ_PALABRAS.forEach(([re,k])=>{const g=new RegExp(re.source,'g');if(g.test(t)){out.push(k);t=t.replace(g,' ');}});
  return out;
}
function _ptrMaterialDe(txt){
  const t=_ptrSinTilde(txt).toUpperCase();
  const m=/\((COM|RCZ)\)|\b(RCZ)\b/.exec(t);if(m)return m[1]||m[2];
  const tp=/\bTIPO\s*(\d)\b/.exec(t);if(tp)return'Tipo '+tp[1];
  if(/CONCRETO/.test(t))return'Concreto';
  return'';
}
function _ptrCodigoRes(txt){
  const t=_ptrSinTilde(txt).toUpperCase();
  if(/SIN\s+OP|OPERADOR/.test(t))return'FO';
  if(/LLUVIA|CLIMA|TORMENTA|NEVADA/.test(t))return'LL';
  if(/VOLADURA/.test(t))return'VO';
  if(/LIBERA|TOPOGRAF/.test(t))return'FL';
  if(/PASE|CERRAD|TRANSITO/.test(t))return'PC';
  if(/\bVIA\b|ACCESO/.test(t))return'VE';
  if(/MANT|INOPERATIV|FALLA|AVERIA/.test(t))return/VOLQUETE/.test(t)?'VM':'CI';
  return'OT';
}
function _ptrDesdeTexto(txt){
  const out={turno:'',guardia:'',fecha:'',titulo:'',actividades:[],restricciones:[],nota:''};
  let frente='',sector='',modo='act';
  const lineas=String(txt||'').replace(/\r/g,'').split('\n').map(l=>l.replace(/[‎‏]/g,'').trim()).filter(Boolean);
  lineas.forEach(l0=>{
    const u=_ptrSinTilde(l0).toUpperCase();
    // Cabecera
    if(/^[*\s]*PLAN\s+DE\s+TRABAJO/.test(u)){
      if(/NOCHE/.test(u))out.turno='Noche';else if(/\bDIA\b/.test(u))out.turno='Día';
      const g=/GUARDIA\s*([ABC])\b/.exec(u);if(g)out.guardia=g[1];
      return;
    }
    const f=/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4})$/.exec(l0.replace(/\s+/g,''));
    if(f){const y=f[3].length===2?'20'+f[3]:f[3];out.fecha=`${y}-${f[2].padStart(2,'0')}-${f[1].padStart(2,'0')}`;return;}
    if(/^NOTA\s*[:.\-]/.test(u)){out.nota=l0.replace(/^nota\s*[:.\-]\s*/i,'');modo='act';return;}
    if(/^RESTRICCION(ES)?\s*[:.\-]?\s*$/.test(u)){modo='res';return;}
    if(modo==='res'){
      const d=l0.replace(/^[-•*·]+\s*/,'');
      out.restricciones.push({codigo:_ptrCodigoRes(d),descripcion:d,eqIds:[]});return;
    }
    // Frente: línea que empieza con *
    if(/^\*+/.test(l0)){frente=_ptrFrenteDe(l0.replace(/^\*+\s*/,'').replace(/[*:;.]+$/,''));sector='';return;}
    // Sector al inicio de la línea (solo, o seguido de la actividad)
    let desc=l0.replace(/^[-•·]+\s*/,'');
    const s=_PTR_SECTOR_RE.exec(_ptrSinTilde(desc));
    if(s){
      const sx=_ptrSinTilde(desc).slice(0,s[1].length).toLowerCase().replace(/\s+/g,' ');
      sector=sx.charAt(0).toUpperCase()+sx.slice(1);
      desc=desc.slice(s[0].length).trim();
      if(!desc)return;               // la línea era solo el sector
    }
    out.actividades.push({..._ptrActNueva(),frente,sector,descripcion:desc,material:_ptrMaterialDe(desc),tipos:_ptrTiposDe(desc)});
  });
  return out;
}
function _ptrPegarAbrir(){
  let ov=document.getElementById('ptrPegarView');
  if(!ov){ov=document.createElement('div');ov.id='ptrPegarView';document.body.appendChild(ov);}
  ov.style.cssText='position:fixed;inset:0;z-index:300;background:rgba(5,8,15,.85);display:flex;align-items:center;justify-content:center;padding:12px';
  ov.innerHTML=`<div style="background:var(--panel,#0f172a);border:1px solid var(--border,#334155);border-radius:12px;width:min(720px,100%);max-height:92vh;display:flex;flex-direction:column">
    <div style="display:flex;align-items:center;gap:.5rem;padding:.7rem .9rem;border-bottom:1px solid var(--border,#334155)">
      <b style="flex:1;font-size:.9rem">📋 Pegar el plan desde texto</b>
      <button type="button" onclick="_ptrPegarCerrar()" class="btn btn-out">Cancelar</button></div>
    <div style="padding:.8rem .9rem;display:flex;flex-direction:column;gap:.6rem;overflow:auto">
      <div style="font-size:.74rem;color:var(--muted2);line-height:1.5">Pegue el texto tal cual. Las líneas con <b>*</b> son frentes; «ESTRIBO DERECHO», «AGUAS ABAJO…» son sectores; cada línea es una actividad; después de «RESTRICCIONES:» van las restricciones y «NOTA:» es la nota del pie. Los equipos mencionados (volquetes, excavadora, CF…) se reconocen solos.</div>
      <textarea id="ptrPegarTxt" class="ptr-in" rows="14" placeholder="PLAN DE TRABAJO TURNO DIA GUARDIA B&#10;15/11/2026&#10;*DIQUE INTERMEDIO&#10;ESTRIBO DERECHO; …" oninput="_ptrPegarVista()" style="font-family:var(--mono,monospace);font-size:.78rem"></textarea>
      <div id="ptrPegarVista" style="font-size:.78rem"></div>
      <div style="display:flex;justify-content:flex-end"><button type="button" class="btn btn-a" style="--ba:#22c55e" onclick="_ptrPegarUsar()">✓ Armar el plan</button></div>
    </div></div>`;
  const t=document.getElementById('ptrPegarTxt');if(t&&t.focus)t.focus();
}
function _ptrPegarCerrar(){const ov=document.getElementById('ptrPegarView');if(ov){ov.innerHTML='';ov.style.display='none';}}
function _ptrPegarVista(){
  const t=document.getElementById('ptrPegarTxt'), el=document.getElementById('ptrPegarVista');if(!t||!el)return;
  const p=_ptrDesdeTexto(t.value);
  const fr=[...new Set(p.actividades.map(a=>a.frente||'Sin frente'))];
  el.innerHTML=p.actividades.length||p.restricciones.length?`<div style="color:#22c55e;font-weight:700;margin-bottom:.3rem">Se armará: ${p.turno?'turno '+p.turno+' · ':''}${p.guardia?'guardia '+p.guardia+' · ':''}${p.fecha?_ptrDMY(p.fecha)+' · ':''}${fr.length} frente(s) · ${p.actividades.length} actividad(es) · ${p.restricciones.length} restricción(es)${p.nota?' · nota':''}</div>
    ${fr.map(f=>`<div style="margin-top:.25rem"><b style="color:#f59e0b">▸ ${_ptrEsc(f)}</b>${p.actividades.filter(a=>(a.frente||'Sin frente')===f).map(a=>`<div style="margin-left:1rem;color:var(--muted2)">${a.sector?`<b style="color:var(--text)">${_ptrEsc(a.sector)}:</b> `:''}${_ptrEsc(a.descripcion.slice(0,90))}${a.tipos.length?` <span style="color:#22d3ee">[${a.tipos.map(k=>_ptrIcono(k).n.replace(/ \(.*\)/,'')).join(', ')}]</span>`:''}</div>`).join('')}</div>`).join('')}
    ${p.restricciones.map(x=>`<div style="margin-top:.25rem;color:#f87171">⛔ ${_ptrEsc(x.codigo)} · ${_ptrEsc(x.descripcion)}</div>`).join('')}`
    :'<div style="color:var(--muted2)">Todavía no se reconoce ninguna actividad</div>';
}
function _ptrPegarUsar(txt){
  const t=document.getElementById('ptrPegarTxt');
  const p=_ptrDesdeTexto(txt!=null?txt:t&&t.value);
  if(!p.actividades.length&&!p.restricciones.length){toast('No se reconoció ninguna actividad en el texto',true);return;}
  if(!_ptr)_ptr=_ptrNuevo();
  const hay=_ptr.actividades.some(a=>a.frente||a.descripcion)||(_ptr.restricciones||[]).length;
  if(hay&&!confirm('El plan ya tiene actividades o restricciones.\n\n¿Reemplazarlas con las del texto? (las fotos se quedan)'))return;
  if(p.fecha){_ptr.tipo='Diario';_ptr.fecha=p.fecha;}
  if(p.turno)_ptr.turno=p.turno;
  if(p.guardia)_ptr.guardia=p.guardia;
  if(p.nota){_ptr.nota=p.nota;try{localStorage.setItem(_PTR_NOTA_KEY,p.nota);}catch(e){}}
  const uids=new Set(p.actividades.map(a=>a.uid));
  _ptr.fotos.forEach(f=>{f.marcas=(f.marcas||[]).filter(m=>uids.has(m.act));});
  _ptr.actividades=p.actividades.length?p.actividades:[_ptrActNueva()];
  _ptr.restricciones=p.restricciones;
  _ptrPegarCerrar();_ptrPintar();
  toast(`✓ Plan armado: ${p.actividades.length} actividad(es), ${p.restricciones.length} restricción(es). Revise y marque en las fotos`);
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
  .ptr-res{display:flex;gap:.45rem;align-items:center;flex-wrap:wrap;border:1px solid #ef444455;border-radius:8px;padding:.5rem;background:var(--panel2);margin-bottom:.5rem}
  .ptr-fotos{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:.8rem}
  .ptr-foto{display:flex;flex-direction:column;gap:.35rem}
  .ptr-foto-img{position:relative;border-radius:8px;overflow:hidden;border:1px solid var(--border);cursor:pointer;background:#000}
  .ptr-foto-img img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block}
  .ptr-foto-k{position:absolute;left:6px;top:6px;background:rgba(0,0,0,.65);color:#fff;font-size:.68rem;font-weight:800;padding:.1rem .4rem;border-radius:4px}
  </style>`;
}
