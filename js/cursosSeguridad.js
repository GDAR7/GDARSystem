// ══════════════════════════════════════════════════════════════════════════
//  CURSOS / CAPACITACIONES DE SEGURIDAD
//  Matriz personal × cursos. Las filas (nombre, DNI, cargo, guardia) se toman
//  de Personal / RR.HH.; las columnas son los cursos que se van agregando.
//  Cada celda guarda un estado y la fecha en que se dictó o se programó.
// ══════════════════════════════════════════════════════════════════════════

const CS_ESTADOS={
  'Aprobado'  :{c:'#10b981',bg:'rgba(16,185,129,.16)',xls:'C6EFCE',xlsTx:'006100',ic:'✔'},
  'Programado':{c:'#3b82f6',bg:'rgba(59,130,246,.16)',xls:'DDEBF7',xlsTx:'1F4E79',ic:'📅'},
  'Pendiente' :{c:'#f59e0b',bg:'rgba(245,158,11,.14)',xls:'FFF2CC',xlsTx:'7F6000',ic:'⏳'},
  'No Pasó'   :{c:'#ef4444',bg:'rgba(239,68,68,.16)',xls:'FFC7CE',xlsTx:'9C0006',ic:'✕'}
};
const CS_ORDEN=['Aprobado','Programado','Pendiente','No Pasó'];

let _csBuscar='',_csGuardia='',_csCargo='',_csProy='',_csCursoFoco='',_csSoloPend=false;
let _csEditCursoId=null,_csPickEl=null;

function _csEsc(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function _csDMY(f){const p=String(f||'').split('-');return p.length===3?`${p[2]}/${p[1]}/${p[0]}`:(f||'');}
function _csRO(){return isModuleReadOnly('cursosSeguridad');}

// ── Datos ──
function _csCursos(){
  return (DB.cursos||[]).filter(c=>c.activo!==0&&c.activo!==false)
    .sort((a,b)=>(+a.orden||0)-(+b.orden||0)||String(a.nombre||'').localeCompare(String(b.nombre||''),'es'));
}
function _csReg(cursoId,personalId){
  return (DB.cursosPersonal||[]).find(r=>+r.cursoId===+cursoId&&+r.personalId===+personalId);
}
function _csPersonal(){
  let l=(DB.personal||[]).filter(p=>(p.est||'Activo')==='Activo');
  if(_csGuardia)l=l.filter(p=>(p.guardia||'')===_csGuardia);
  if(_csCargo)l=l.filter(p=>(p.cargo||'')===_csCargo);
  if(_csProy)l=l.filter(p=>(p.proy||'')===_csProy);
  if(_csSoloPend&&_csCursos().length){
    l=l.filter(p=>_csCursos().some(c=>{const r=_csReg(c.id,p.id);return !r||r.estado==='Pendiente'||r.estado==='No Pasó';}));
  }
  const q=_csBuscar.toLowerCase().trim();
  if(q)l=l.filter(p=>((p.ape||'')+' '+(p.nom||'')+' '+(p.dni||'')+' '+(p.cargo||'')).toLowerCase().includes(q));
  return l.sort((a,b)=>`${a.ape} ${a.nom}`.localeCompare(`${b.ape} ${b.nom}`,'es'));
}

// ── Filtros ──
function _csSet(campo,v){
  if(campo==='guardia')_csGuardia=v;
  else if(campo==='cargo')_csCargo=v;
  else if(campo==='proy')_csProy=v;
  else if(campo==='foco')_csCursoFoco=v;
  else if(campo==='pend')_csSoloPend=v;
  rCursosSeguridad();
}
let _csBuscarTO=null;
function _csBuscarInput(v){
  _csBuscar=v;
  clearTimeout(_csBuscarTO);
  _csBuscarTO=setTimeout(()=>{
    rCursosSeguridad();
    const el=document.getElementById('csBuscar');
    if(el){el.focus();el.setSelectionRange(el.value.length,el.value.length);}
  },260);
}

// ── Selector de estado (popover) ──
function _csPicker(ev,cursoId,personalId){
  if(_csRO())return;
  ev.stopPropagation();
  if(_csPickEl){_csPickEl.remove();_csPickEl=null;}
  const reg=_csReg(cursoId,personalId);
  const curso=(DB.cursos||[]).find(c=>+c.id===+cursoId);
  const per=(DB.personal||[]).find(p=>+p.id===+personalId);
  const div=document.createElement('div');
  div.style.cssText='position:fixed;z-index:99990;background:var(--panel);border:1px solid var(--border);border-radius:10px;padding:.6rem;box-shadow:0 10px 34px rgba(0,0,0,.6);width:265px;font-family:inherit';
  div.innerHTML=`
    <div style="font-size:.62rem;text-transform:uppercase;letter-spacing:.07em;color:var(--seg);font-weight:700;border-bottom:1px solid var(--border);padding-bottom:.35rem;margin-bottom:.45rem">${_csEsc(curso?curso.nombre:'Curso')}</div>
    <div style="font-size:.72rem;color:var(--muted2);margin-bottom:.5rem">${_csEsc(per?`${per.ape}, ${per.nom}`:'')}</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:.3rem;margin-bottom:.5rem">
      ${CS_ORDEN.map(e=>{const s=CS_ESTADOS[e],act=reg&&reg.estado===e;
        return`<button onclick="_csSetEstado(${cursoId},${personalId},'${e}')" style="background:${act?s.c:s.bg};color:${act?'#fff':s.c};border:1.5px solid ${s.c}${act?'':'55'};border-radius:7px;padding:.35rem .2rem;font-size:.7rem;font-weight:700;cursor:pointer">${s.ic} ${e}</button>`;}).join('')}
    </div>
    <label style="font-size:.62rem;color:var(--muted2);text-transform:uppercase;letter-spacing:.06em;font-weight:700">Fecha</label>
    <input type="date" id="csPickFecha" class="date-ic-azul" value="${reg&&reg.fecha?reg.fecha:''}" onchange="_csSetFecha(${cursoId},${personalId},this.value)"
      style="width:100%;background:var(--panel2);border:1px solid var(--border);border-radius:6px;padding:.3rem .5rem;color:var(--text);font-size:.78rem;color-scheme:dark;margin:.2rem 0 .5rem">
    <button onclick="_csBorrar(${cursoId},${personalId})" style="width:100%;background:transparent;border:1px solid var(--border);border-radius:7px;color:var(--muted2);padding:.3rem;font-size:.7rem;cursor:pointer">✕ Quitar registro</button>`;
  document.body.appendChild(div);
  _csPickEl=div;
  const r=ev.currentTarget.getBoundingClientRect();
  let top=r.bottom+4,left=r.left-70;
  if(left+275>window.innerWidth)left=Math.max(8,window.innerWidth-280);
  if(left<8)left=8;
  if(top+250>window.innerHeight)top=Math.max(8,r.top-255);
  div.style.top=top+'px';div.style.left=left+'px';
  setTimeout(()=>document.addEventListener('click',function h(e){
    if(_csPickEl&&!_csPickEl.contains(e.target)){_csPickEl.remove();_csPickEl=null;document.removeEventListener('click',h);}
  }),10);
}
function _csCerrarPicker(){if(_csPickEl){_csPickEl.remove();_csPickEl=null;}}

function _csGuardar(cursoId,personalId,cambios){
  let reg=_csReg(cursoId,personalId);
  if(!reg){
    reg={id:nid('curp'),cursoId:+cursoId,personalId:+personalId,estado:'',fecha:null,obs:''};
    DB.cursosPersonal.push(reg);
  }
  Object.assign(reg,cambios);
  syncSheet('saveCursoPersonal',reg);
  return reg;
}
function _csSetEstado(cursoId,personalId,estado){
  const reg=_csReg(cursoId,personalId);
  // Al aprobar sin fecha, se asume la de hoy
  const cambios={estado};
  if(estado==='Aprobado'&&(!reg||!reg.fecha))cambios.fecha=today();
  _csGuardar(cursoId,personalId,cambios);
  _csCerrarPicker();
  rCursosSeguridad();
}
function _csSetFecha(cursoId,personalId,fecha){
  const reg=_csReg(cursoId,personalId);
  _csGuardar(cursoId,personalId,{fecha:fecha||null,estado:(reg&&reg.estado)||'Programado'});
  rCursosSeguridad();
}
function _csBorrar(cursoId,personalId){
  const reg=_csReg(cursoId,personalId);
  if(reg){
    DB.cursosPersonal=DB.cursosPersonal.filter(r=>r.id!==reg.id);
    supaDelete('cursosPersonal',reg.id);
  }
  _csCerrarPicker();
  rCursosSeguridad();
}

// ── Gestión de cursos (columnas) ──
function _csAbrirCursos(){_csEditCursoId=null;_csRenderCursos();openM('mCursos');}
function _csRenderCursos(){
  const b=document.getElementById('csCursosBody');if(!b)return;
  const todos=(DB.cursos||[]).slice().sort((a,b2)=>(+a.orden||0)-(+b2.orden||0));
  b.innerHTML=todos.length?`<table style="width:100%;border-collapse:collapse">
    <thead><tr style="background:var(--panel2)">
      <th style="padding:5px;font-size:.64rem;width:42px">Orden</th>
      <th style="padding:5px;font-size:.64rem;text-align:left">Curso</th>
      <th style="padding:5px;font-size:.64rem;text-align:left;min-width:110px">Categoría</th>
      <th style="padding:5px;font-size:.64rem;width:56px">Horas</th>
      <th style="padding:5px;font-size:.64rem;width:70px">Vigencia</th>
      <th style="padding:5px;font-size:.64rem;width:64px">Activo</th>
      <th style="padding:5px;font-size:.64rem;width:92px"></th>
    </tr></thead>
    <tbody>${todos.map(c=>`<tr style="border-bottom:1px solid var(--border)">
      <td style="padding:4px;text-align:center;font-size:.72rem;color:var(--muted2)">${+c.orden||0}</td>
      <td style="padding:4px 6px;font-size:.78rem"><strong>${_csEsc(c.nombre)}</strong></td>
      <td style="padding:4px 6px;font-size:.72rem;color:var(--muted2)">${_csEsc(c.categoria)||'—'}</td>
      <td style="padding:4px;text-align:center;font-size:.72rem">${c.horas||'—'}</td>
      <td style="padding:4px;text-align:center;font-size:.72rem">${c.vigenciaMeses?c.vigenciaMeses+' m':'—'}</td>
      <td style="padding:4px;text-align:center">${(c.activo===0||c.activo===false)?'<span style="color:#ef4444;font-size:.7rem">No</span>':'<span style="color:#10b981;font-size:.7rem">Sí</span>'}</td>
      <td style="padding:4px;text-align:center;white-space:nowrap">
        <button class="btn btn-sm" onclick="_csEditCurso(${c.id})" style="background:#1e3a5f;color:#60a5fa;border:1px solid #2563eb;font-size:.66rem">✏️</button>
        <button class="btn btn-del btn-sm" onclick="_csDelCurso(${c.id})" style="font-size:.66rem">🗑</button>
      </td>
    </tr>`).join('')}</tbody></table>`
    :'<div style="padding:1.2rem;text-align:center;color:var(--muted);font-size:.8rem">Aún no hay cursos registrados. Agrega el primero abajo.</div>';
  document.getElementById('csFormTit').textContent=_csEditCursoId?'✏️ Editar curso':'➕ Nuevo curso';
}
function _csEditCurso(id){
  const c=(DB.cursos||[]).find(x=>x.id===id);if(!c)return;
  _csEditCursoId=id;
  document.getElementById('csNom').value=c.nombre||'';
  document.getElementById('csCat').value=c.categoria||'';
  document.getElementById('csHoras').value=c.horas||'';
  document.getElementById('csVig').value=c.vigenciaMeses||'';
  document.getElementById('csOrden').value=+c.orden||0;
  document.getElementById('csActivo').value=(c.activo===0||c.activo===false)?'0':'1';
  _csRenderCursos();
}
function _csGuardarCurso(){
  const nombre=document.getElementById('csNom').value.trim();
  if(!nombre){toast('Ingrese el nombre del curso',true);return;}
  const datos={
    nombre,
    categoria:document.getElementById('csCat').value.trim(),
    horas:+document.getElementById('csHoras').value||0,
    vigenciaMeses:+document.getElementById('csVig').value||0,
    orden:+document.getElementById('csOrden').value||0,
    activo:document.getElementById('csActivo').value==='0'?0:1
  };
  if(_csEditCursoId){
    const c=DB.cursos.find(x=>x.id===_csEditCursoId);
    if(c){Object.assign(c,datos);syncSheet('saveCurso',c);}
    _csEditCursoId=null;
  }else{
    if((DB.cursos||[]).some(c=>String(c.nombre||'').trim().toLowerCase()===nombre.toLowerCase())){toast('Ya existe un curso con ese nombre',true);return;}
    if(!datos.orden)datos.orden=(DB.cursos||[]).reduce((m,c)=>Math.max(m,+c.orden||0),0)+1;
    const nuevo={id:nid('cur'),...datos};
    DB.cursos.push(nuevo);
    syncSheet('saveCurso',nuevo);
  }
  ['csNom','csCat','csHoras','csVig','csOrden'].forEach(id=>document.getElementById(id).value='');
  document.getElementById('csActivo').value='1';
  _csRenderCursos();rCursosSeguridad();
  toast('Curso guardado');
}
function _csDelCurso(id){
  const c=(DB.cursos||[]).find(x=>x.id===id);if(!c)return;
  const n=(DB.cursosPersonal||[]).filter(r=>+r.cursoId===+id).length;
  if(!confirm(`¿Eliminar el curso "${c.nombre}"?${n?`\n\nSe borrarán también ${n} registro(s) de trabajadores.`:''}`))return;
  (DB.cursosPersonal||[]).filter(r=>+r.cursoId===+id).forEach(r=>supaDelete('cursosPersonal',r.id));
  DB.cursosPersonal=(DB.cursosPersonal||[]).filter(r=>+r.cursoId!==+id);
  DB.cursos=DB.cursos.filter(x=>x.id!==id);
  supaDelete('cursos',id);
  if(_csCursoFoco===String(id))_csCursoFoco='';
  _csRenderCursos();rCursosSeguridad();
  toast('Curso eliminado');
}

// ── Render principal ──
function rCursosSeguridad(){
  const cont=document.getElementById('csBody');if(!cont)return;
  const cursosAll=_csCursos();
  const cursos=_csCursoFoco?cursosAll.filter(c=>String(c.id)===_csCursoFoco):cursosAll;
  const pers=_csPersonal();
  const RO=_csRO();

  // KPIs sobre la selección visible
  const cont5={Aprobado:0,Programado:0,Pendiente:0,'No Pasó':0,sin:0};
  pers.forEach(p=>cursos.forEach(c=>{
    const r=_csReg(c.id,p.id);
    if(r&&r.estado&&cont5[r.estado]!=null)cont5[r.estado]++;else cont5.sin++;
  }));
  const totCeldas=pers.length*cursos.length;
  const pct=totCeldas?(cont5.Aprobado/totCeldas*100):0;

  const guardias=[...new Set((DB.personal||[]).map(p=>p.guardia).filter(Boolean))].sort();
  const cargos=[...new Set((DB.personal||[]).map(p=>p.cargo).filter(Boolean))].sort();
  const proys=[...new Set((DB.personal||[]).map(p=>p.proy).filter(Boolean))].sort();
  const selS='background:var(--panel2);border:1px solid var(--border);border-radius:6px;padding:.26rem .5rem;color:var(--text);font-size:.76rem;width:auto;max-width:180px';

  const kpis=[
    {l:'Trabajadores',v:pers.length,c:'var(--seg)',ic:'👷',sub:`${cursos.length} curso${cursos.length===1?'':'s'} en vista`},
    {l:'Aprobados',v:cont5.Aprobado,c:'#10b981',ic:'✔',sub:`${pct.toFixed(1)}% de cobertura`},
    {l:'Programados',v:cont5.Programado,c:'#3b82f6',ic:'📅',sub:'con fecha asignada'},
    {l:'Pendientes',v:cont5.Pendiente+cont5.sin,c:'#f59e0b',ic:'⏳',sub:`${cont5.sin} sin registro`},
    {l:'No Pasó',v:cont5['No Pasó'],c:'#ef4444',ic:'✕',sub:'requieren repetir'}
  ];

  const TH='background:var(--panel2);color:var(--muted2);font-size:.62rem;font-weight:700;text-transform:uppercase;letter-spacing:.05em;padding:5px 6px;white-space:nowrap';
  const TD='padding:3px 6px;border-bottom:1px solid var(--border);font-size:.75rem';

  const tabla=!cursos.length
    ?`<div style="padding:2.5rem;text-align:center;color:var(--muted)">Aún no hay cursos registrados.<br><span style="font-size:.75rem">Usa el botón <strong>🎓 Gestionar Cursos</strong> para crear la primera columna.</span></div>`
    :!pers.length
    ?'<div style="padding:2.5rem;text-align:center;color:var(--muted)">Ningún trabajador coincide con los filtros.</div>'
    :`<table id="csTabla" style="border-collapse:collapse;min-width:100%">
      <thead>
        <tr style="background:var(--panel2)">
          <th rowspan="2" style="${TH};min-width:34px">N°</th>
          <th rowspan="2" style="${TH};text-align:left;min-width:190px">Nombre</th>
          <th rowspan="2" style="${TH};text-align:left;min-width:135px">Cargo</th>
          <th rowspan="2" style="${TH};min-width:82px">DNI</th>
          <th rowspan="2" style="${TH};min-width:64px">Guardia</th>
          ${cursos.map(c=>`<th colspan="2" style="${TH};text-align:center;border-left:2px solid var(--border);color:var(--seg)" title="${_csEsc(c.categoria||'')}">${_csEsc(c.nombre)}</th>`).join('')}
          <th rowspan="2" style="${TH};min-width:70px">Avance</th>
        </tr>
        <tr style="background:var(--panel2)">
          ${cursos.map(()=>`<th style="${TH};text-align:center;min-width:86px;border-left:2px solid var(--border)">Fecha</th><th style="${TH};text-align:center;min-width:104px">Estado</th>`).join('')}
        </tr>
      </thead>
      <tbody>${pers.map((p,i)=>{
        const apro=cursos.filter(c=>{const r=_csReg(c.id,p.id);return r&&r.estado==='Aprobado';}).length;
        const pAv=cursos.length?apro/cursos.length*100:0;
        const gc={A:'#f59e0b',B:'#a855f7',C:'#10b981'}[p.guardia]||'#94a3b8';
        return`<tr style="border-bottom:1px solid var(--border)">
          <td style="${TD};text-align:center;color:var(--muted2);font-size:.7rem">${i+1}</td>
          <td style="${TD};white-space:nowrap"><strong>${_csEsc(p.ape)}, ${_csEsc(p.nom)}</strong></td>
          <td style="${TD};font-size:.71rem;color:var(--muted2);white-space:nowrap">${_csEsc(p.cargo)||'—'}</td>
          <td style="${TD};text-align:center;font-family:monospace;font-size:.72rem;color:#22d3ee">${p.dni||'—'}</td>
          <td style="${TD};text-align:center">${p.guardia?`<span style="background:${gc}26;color:${gc};border:1px solid ${gc}70;border-radius:4px;padding:1px 7px;font-weight:800;font-size:.7rem">${p.guardia}</span>`:'<span style="color:var(--muted)">—</span>'}</td>
          ${cursos.map(c=>{
            const r=_csReg(c.id,p.id);
            const est=r&&r.estado?r.estado:'';
            const s=est?CS_ESTADOS[est]:null;
            const clic=RO?'':`onclick="_csPicker(event,${c.id},${p.id})" style="cursor:pointer;"`;
            return`<td ${clic} style="${TD};text-align:center;font-family:monospace;font-size:.7rem;color:var(--muted2);border-left:2px solid var(--border);${RO?'':'cursor:pointer'}">${r&&r.fecha?_csDMY(r.fecha):'—'}</td>
              <td ${RO?'':`onclick="_csPicker(event,${c.id},${p.id})"`} style="${TD};text-align:center;${RO?'':'cursor:pointer;'}">
                ${s?`<span style="background:${s.bg};color:${s.c};border:1px solid ${s.c}66;border-radius:5px;padding:1px 8px;font-size:.66rem;font-weight:800;white-space:nowrap">${s.ic} ${est}</span>`
                   :'<span style="color:var(--muted);font-size:.7rem">—</span>'}
              </td>`;
          }).join('')}
          <td style="${TD};text-align:center">
            <div style="display:flex;align-items:center;gap:.3rem">
              <div style="flex:1;height:5px;background:var(--panel2);border-radius:3px;overflow:hidden"><div style="width:${pAv}%;height:100%;background:${pAv>=100?'#10b981':pAv>=50?'#f59e0b':'#ef4444'}"></div></div>
              <span style="font-size:.64rem;color:var(--muted2);min-width:30px">${pAv.toFixed(0)}%</span>
            </div>
          </td>
        </tr>`;
      }).join('')}</tbody>
    </table>`;

  cont.innerHTML=`
    <div class="kpi-row">${kpis.map(k=>`<div class="kpi" style="--kc:${k.c};flex:1;min-width:145px"><div style="display:flex;justify-content:space-between;align-items:flex-start"><span class="kpi-lbl">${k.l}</span><span style="font-size:1.2rem;line-height:1;opacity:.75">${k.ic}</span></div><div class="kpi-val" style="font-size:1.9rem">${k.v}</div><div class="kpi-sub">${k.sub}</div></div>`).join('')}</div>

    <div style="display:flex;align-items:center;gap:.45rem;flex-wrap:wrap;margin-bottom:.8rem;padding:.45rem .7rem;background:var(--panel2);border:1px solid var(--border);border-radius:8px">
      <input type="text" id="csBuscar" value="${_csEsc(_csBuscar)}" placeholder="🔍 Buscar nombre, DNI o cargo..." oninput="_csBuscarInput(this.value)" style="background:var(--panel);border:1px solid var(--border);border-radius:6px;padding:.26rem .6rem;color:var(--text);font-size:.78rem;width:215px">
      <span style="width:1px;height:18px;background:var(--border)"></span>
      <select onchange="_csSet('guardia',this.value)" style="${selS}"><option value="">— Guardia —</option>${guardias.map(g=>`<option value="${_csEsc(g)}"${g===_csGuardia?' selected':''}>Guardia ${_csEsc(g)}</option>`).join('')}</select>
      <select onchange="_csSet('cargo',this.value)" style="${selS}"><option value="">— Cargo —</option>${cargos.map(c=>`<option value="${_csEsc(c)}"${c===_csCargo?' selected':''}>${_csEsc(c)}</option>`).join('')}</select>
      <select onchange="_csSet('proy',this.value)" style="${selS}"><option value="">— Proyecto —</option>${proys.map(p=>`<option value="${_csEsc(p)}"${p===_csProy?' selected':''}>${_csEsc(p)}</option>`).join('')}</select>
      <select onchange="_csSet('foco',this.value)" style="${selS}" title="Ver un solo curso"><option value="">— Todos los cursos —</option>${cursosAll.map(c=>`<option value="${c.id}"${String(c.id)===_csCursoFoco?' selected':''}>${_csEsc(c.nombre)}</option>`).join('')}</select>
      <label style="display:inline-flex;align-items:center;gap:.3rem;font-size:.73rem;color:var(--muted2);cursor:pointer">
        <input type="checkbox" ${_csSoloPend?'checked':''} onchange="_csSet('pend',this.checked)" style="width:auto;margin:0;cursor:pointer"> Solo con pendientes
      </label>
      ${(_csGuardia||_csCargo||_csProy||_csCursoFoco||_csSoloPend||_csBuscar)?`<button onclick="_csLimpiar()" style="background:transparent;border:1px solid var(--border);border-radius:6px;color:#ef4444;font-size:.7rem;padding:.22rem .55rem;cursor:pointer">✕ Limpiar filtros</button>`:''}
    </div>

    <div class="card">
      <div class="card-head"><span class="card-title">Matriz de Capacitaciones</span>
        <div class="card-head-right" style="gap:.45rem;flex-wrap:wrap">
          ${RO?'<span style="display:inline-flex;align-items:center;gap:.3rem;background:rgba(239,68,68,.12);border:1px solid rgba(239,68,68,.3);border-radius:5px;padding:2px 8px;font-size:.65rem;font-weight:700;color:#ef4444">👁️ Solo lectura</span>':`<button class="btn btn-out btn-sm" onclick="_csAbrirCursos()" style="color:var(--seg);border-color:var(--seg);font-size:.75rem">🎓 Gestionar Cursos</button>`}
          <button class="btn btn-out btn-sm" onclick="_csPrint()" style="color:#ef4444;border-color:#ef444460;font-size:.75rem">🖨️ PDF</button>
          <button class="btn btn-out btn-sm" onclick="_csExcel()" style="color:#10b981;border-color:#10b98160;font-size:.75rem">📥 Excel</button>
        </div>
      </div>
      <div class="card-body" style="overflow-x:auto;padding:0">${tabla}</div>
    </div>

    <div style="display:flex;flex-wrap:wrap;gap:.35rem;margin-top:.6rem">
      ${CS_ORDEN.map(e=>{const s=CS_ESTADOS[e];return`<span style="background:${s.bg};color:${s.c};border:1px solid ${s.c}66;border-radius:5px;padding:2px 9px;font-size:.66rem;font-weight:700">${s.ic} ${e}</span>`;}).join('')}
      <span style="color:var(--muted);font-size:.68rem;padding:2px 4px">— Sin registro</span>
      ${RO?'':'<span style="color:var(--muted2);font-size:.68rem;padding:2px 8px">· Haz clic en cualquier celda para asignar estado y fecha</span>'}
    </div>`;
}
function _csLimpiar(){_csBuscar='';_csGuardia='';_csCargo='';_csProy='';_csCursoFoco='';_csSoloPend=false;rCursosSeguridad();}

// ── Etiqueta de filtros para exportaciones ──
function _csFiltroTxt(){
  const p=[];
  if(_csGuardia)p.push('Guardia '+_csGuardia);
  if(_csCargo)p.push(_csCargo);
  if(_csProy)p.push('Proyecto '+_csProy);
  if(_csCursoFoco){const c=(DB.cursos||[]).find(x=>String(x.id)===_csCursoFoco);if(c)p.push('Curso: '+c.nombre);}
  if(_csSoloPend)p.push('solo con pendientes');
  return p.length?p.join(' · '):'Todo el personal activo';
}

// ── PDF ──
function _csPrint(){
  const cursosAll=_csCursos();
  const cursos=_csCursoFoco?cursosAll.filter(c=>String(c.id)===_csCursoFoco):cursosAll;
  const pers=_csPersonal();
  if(!cursos.length||!pers.length){toast('No hay datos que imprimir',true);return;}
  const AZ='#1F4E79';
  const logo=window.location.href.replace(/[^\/\\]+$/,'')+'09.-ERP/Imagenes/ECOSERMO-LOGO.png';
  const TH=`background:${AZ};color:#fff;padding:4px 5px;font-size:8px;text-transform:uppercase;text-align:center;border:1px solid #fff;font-weight:700`;
  const TD='border:1px solid #cbd5e1;padding:3px 5px;font-size:8.5px;color:#111';
  const w=window.open('','_blank','width=1200,height=760');
  w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Matriz de Capacitaciones</title><style>
    @page{size:A4 landscape;margin:.8cm}
    *{box-sizing:border-box;margin:0;padding:0;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}
    body{font-family:Arial,Helvetica,sans-serif;color:#111;font-size:9px}
    .hdr{display:flex;align-items:center;gap:14px;border-bottom:3px solid ${AZ};padding-bottom:7px;margin-bottom:10px}
    .hdr img{height:44px;object-fit:contain}
    .hdr .t{flex:1;text-align:center}
    .hdr h1{font-size:15px;color:${AZ};letter-spacing:.04em}
    .hdr p{font-size:9px;color:#475569;margin-top:2px}
    table{width:100%;border-collapse:collapse}
    tr{page-break-inside:avoid}
    .lg{margin-top:8px;font-size:8px;color:#475569;display:flex;gap:10px;flex-wrap:wrap}
    .lg span{padding:1px 7px;border-radius:3px;font-weight:700}
  </style></head><body>
  <div class="hdr"><img src="${logo}" alt="">
    <div class="t"><h1>MATRIZ DE CAPACITACIONES — SEGURIDAD</h1><p>ECOSERMO · ${_csEsc(_csFiltroTxt())} · ${pers.length} trabajadores · ${cursos.length} cursos</p></div>
    <div style="text-align:right;font-size:8px;color:#475569">Emitido<br><strong>${new Date().toLocaleDateString('es-PE')}</strong></div>
  </div>
  <table>
    <thead>
      <tr><th rowspan="2" style="${TH}">N°</th><th rowspan="2" style="${TH};text-align:left">Nombre</th>
        <th rowspan="2" style="${TH};text-align:left">Cargo</th><th rowspan="2" style="${TH}">DNI</th><th rowspan="2" style="${TH}">Guardia</th>
        ${cursos.map(c=>`<th colspan="2" style="${TH}">${_csEsc(c.nombre)}</th>`).join('')}
        <th rowspan="2" style="${TH}">Avance</th></tr>
      <tr>${cursos.map(()=>`<th style="${TH}">Fecha</th><th style="${TH}">Estado</th>`).join('')}</tr>
    </thead>
    <tbody>${pers.map((p,i)=>{
      const apro=cursos.filter(c=>{const r=_csReg(c.id,p.id);return r&&r.estado==='Aprobado';}).length;
      return`<tr>
        <td style="${TD};text-align:center">${i+1}</td>
        <td style="${TD}">${_csEsc(p.ape)}, ${_csEsc(p.nom)}</td>
        <td style="${TD};font-size:8px">${_csEsc(p.cargo)||'—'}</td>
        <td style="${TD};text-align:center;font-family:monospace">${p.dni||'—'}</td>
        <td style="${TD};text-align:center">${_csEsc(p.guardia)||'—'}</td>
        ${cursos.map(c=>{
          const r=_csReg(c.id,p.id);const est=r&&r.estado?r.estado:'';
          const bg=est==='Aprobado'?'#C6EFCE':est==='Programado'?'#DDEBF7':est==='Pendiente'?'#FFF2CC':est==='No Pasó'?'#FFC7CE':'#fff';
          const tx=est==='Aprobado'?'#006100':est==='Programado'?'#1F4E79':est==='Pendiente'?'#7F6000':est==='No Pasó'?'#9C0006':'#94a3b8';
          return`<td style="${TD};text-align:center;font-size:8px">${r&&r.fecha?_csDMY(r.fecha):''}</td>
            <td style="${TD};text-align:center;background:${bg};color:${tx};font-weight:700;font-size:8px">${est||'—'}</td>`;
        }).join('')}
        <td style="${TD};text-align:center;font-weight:700">${apro}/${cursos.length}</td></tr>`;
    }).join('')}</tbody>
  </table>
  <div class="lg"><strong>Leyenda:</strong>
    <span style="background:#C6EFCE;color:#006100">APROBADO</span>
    <span style="background:#DDEBF7;color:#1F4E79">PROGRAMADO</span>
    <span style="background:#FFF2CC;color:#7F6000">PENDIENTE</span>
    <span style="background:#FFC7CE;color:#9C0006">NO PASÓ</span>
  </div>
  <script>window.onload=()=>window.print();<\/script></body></html>`);
  w.document.close();
}

// ── Excel ──
function _csExcel(){
  const cursosAll=_csCursos();
  const cursos=_csCursoFoco?cursosAll.filter(c=>String(c.id)===_csCursoFoco):cursosAll;
  const pers=_csPersonal();
  if(!cursos.length||!pers.length){toast('No hay datos que exportar',true);return;}
  const addr=(r,c)=>XLSX.utils.encode_cell({r,c});
  const NFIX=5;
  const tit=[`MATRIZ DE CAPACITACIONES — SEGURIDAD  |  ${_csFiltroTxt()}  |  Generado: ${new Date().toLocaleString('es-PE')}`];
  // Fila de grupos (cursos) y fila de encabezados
  const filaGrupo=['','','','',''];
  cursos.forEach(c=>{filaGrupo.push(c.nombre,'');});
  filaGrupo.push('');
  const filaHead=['N°','NOMBRE','CARGO','DNI','GUARDIA'];
  cursos.forEach(()=>filaHead.push('FECHA','ESTADO'));
  filaHead.push('AVANCE');
  const filas=pers.map((p,i)=>{
    const row=[i+1,`${p.ape}, ${p.nom}`,p.cargo||'',p.dni||'',p.guardia||''];
    let apro=0;
    cursos.forEach(c=>{
      const r=_csReg(c.id,p.id);
      if(r&&r.estado==='Aprobado')apro++;
      row.push(r&&r.fecha?_csDMY(r.fecha):'',r&&r.estado?r.estado.toUpperCase():'');
    });
    row.push(`${apro}/${cursos.length}`);
    return row;
  });
  const ws=XLSX.utils.aoa_to_sheet([tit,[],filaGrupo,filaHead,...filas]);
  const nCols=NFIX+cursos.length*2+1;
  ws['!merges']=[{s:{r:0,c:0},e:{r:0,c:nCols-1}},
    ...cursos.map((_,i)=>({s:{r:2,c:NFIX+i*2},e:{r:2,c:NFIX+i*2+1}}))];
  ws['!cols']=[{wch:4},{wch:34},{wch:24},{wch:11},{wch:9},
    ...cursos.flatMap(()=>[{wch:11},{wch:14}]),{wch:9}];
  const stTit={fill:{patternType:'solid',fgColor:{rgb:'1F4E79'}},font:{bold:true,color:{rgb:'FFFFFF'},sz:11},alignment:{horizontal:'center',vertical:'center'}};
  const stGrp={fill:{patternType:'solid',fgColor:{rgb:'2E5C8A'}},font:{bold:true,color:{rgb:'FFFFFF'},sz:9},alignment:{horizontal:'center',vertical:'center',wrapText:true}};
  const stHead={fill:{patternType:'solid',fgColor:{rgb:'1F4E79'}},font:{bold:true,color:{rgb:'FFFFFF'},sz:9},alignment:{horizontal:'center',vertical:'center',wrapText:true}};
  const c0=ws[addr(0,0)];if(c0)c0.s=stTit;
  for(let c=0;c<nCols;c++){
    const g=ws[addr(2,c)];if(g)g.s=stGrp;
    const h=ws[addr(3,c)];if(h)h.s=stHead;
  }
  filas.forEach((row,ri)=>{
    const er=4+ri,par=ri%2===0;
    for(let c=0;c<NFIX;c++){
      const cel=ws[addr(er,c)];
      if(cel)cel.s={fill:{patternType:'solid',fgColor:{rgb:par?'EFF6FF':'FFFFFF'}},font:{sz:9},alignment:{horizontal:c===1||c===2?'left':'center',vertical:'center'}};
    }
    cursos.forEach((_,i)=>{
      const cf=NFIX+i*2,ce=cf+1;
      const celF=ws[addr(er,cf)];
      if(celF)celF.s={fill:{patternType:'solid',fgColor:{rgb:par?'EFF6FF':'FFFFFF'}},font:{sz:9},alignment:{horizontal:'center',vertical:'center'}};
      const celE=ws[addr(er,ce)];
      if(celE){
        const est=CS_ORDEN.find(e=>e.toUpperCase()===String(celE.v||'').toUpperCase());
        const s=est?CS_ESTADOS[est]:null;
        celE.s=s?{fill:{patternType:'solid',fgColor:{rgb:s.xls}},font:{bold:true,color:{rgb:s.xlsTx},sz:9},alignment:{horizontal:'center',vertical:'center'}}
               :{fill:{patternType:'solid',fgColor:{rgb:par?'EFF6FF':'FFFFFF'}},font:{sz:9},alignment:{horizontal:'center',vertical:'center'}};
      }
    });
    const celA=ws[addr(er,nCols-1)];
    if(celA)celA.s={fill:{patternType:'solid',fgColor:{rgb:'DBEAFE'}},font:{bold:true,sz:9},alignment:{horizontal:'center',vertical:'center'}};
  });
  const wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,ws,'Capacitaciones');
  XLSX.writeFile(wb,`Matriz_Capacitaciones_${today()}.xlsx`);
  toast('✓ Excel descargado');
}
