// ══ CONTROL DE SALIDA DE EQUIPOS A MANTENIMIENTO ══
// Registra la salida de un equipo a mantenimiento y su retorno a obra.
// Días fuera de obra = fecha retorno − fecha salida (se calcula solo).

const _SEQ_BUCKET='Equip_eco26';      // se reusa el bucket público de equipos (carpeta salidas/)
let _seqEditId=null, _seqImgUrl='', _seqImgPath='';
let _seqFiltEst='', _seqFiltTipo='', _seqBuscar='';
// Datos de cabecera del documento impreso (se recuerdan en el navegador)
let _seqSolicita=localStorage.getItem('_seqSolicita')||'';
let _seqDirigido=localStorage.getItem('_seqDirigido')||'';

const _seqN1=v=>Number(v||0).toLocaleString('es-PE',{maximumFractionDigits:1});
const _seqDMY=iso=>{if(!iso||!iso.includes('-'))return iso||'—';const[y,m,d]=iso.split('-');return`${d}/${m}/${y}`;};
// Días fuera de obra (null mientras no haya retornado)
function _seqDias(r){
  if(!r.fechaSalida||!r.fechaRetorno)return null;
  return Math.max(0,Math.round((new Date(r.fechaRetorno+'T12:00')-new Date(r.fechaSalida+'T12:00'))/864e5));
}
function _seqEstado(r){return r.fechaRetorno?'Retornado':'Fuera de obra';}

function _seqSetCab(campo,val){
  if(campo==='solicita'){_seqSolicita=val;localStorage.setItem('_seqSolicita',val);}
  else{_seqDirigido=val;localStorage.setItem('_seqDirigido',val);}
}
function _seqSetFiltro(campo,val){
  if(campo==='est')_seqFiltEst=val;
  else if(campo==='tipo')_seqFiltTipo=val;
  else _seqBuscar=val;
  rSalidaEquipos();
}

function _seqLista(){
  let l=[...(DB.salidaEquipos||[])];
  if(_seqFiltEst==='fuera')l=l.filter(r=>!r.fechaRetorno);
  else if(_seqFiltEst==='ret')l=l.filter(r=>r.fechaRetorno);
  if(_seqFiltTipo)l=l.filter(r=>(r.tipoMantto||'')===_seqFiltTipo);
  const q=(_seqBuscar||'').toLowerCase().trim();
  if(q)l=l.filter(r=>[r.placa,r.codigo,r.tipoEquipo,r.motivo,r.operador,r.obs].join(' ').toLowerCase().includes(q));
  return l.sort((a,b)=>(b.fechaSalida||'').localeCompare(a.fechaSalida||'')||b.id-a.id);
}

function rSalidaEquipos(){
  const pg=document.getElementById('seqBody');if(!pg)return;
  const todos=DB.salidaEquipos||[];
  const rows=_seqLista();
  const fuera=todos.filter(r=>!r.fechaRetorno);
  const retornados=todos.filter(r=>r.fechaRetorno);
  const diasProm=retornados.length?retornados.reduce((s,r)=>s+(_seqDias(r)||0),0)/retornados.length:0;

  const kpis=[
    {l:'Total Salidas',v:todos.length,c:'#8b5cf6'},
    {l:'Fuera de Obra',v:fuera.length,c:fuera.length?'#ef4444':'#10b981'},
    {l:'Retornados',v:retornados.length,c:'#10b981'},
    {l:'Prom. Días Fuera',v:retornados.length?_seqN1(diasProm)+' d':'—',c:'#f59e0b'},
  ];

  const TH='background:var(--panel2);color:var(--muted2);font-size:.62rem;font-weight:700;text-transform:uppercase;letter-spacing:.05em;padding:.45rem .5rem;white-space:nowrap;position:sticky;top:0;z-index:2';
  const TD='padding:.4rem .5rem;border-bottom:1px solid var(--border);font-size:.74rem;white-space:nowrap';
  const inpS='background:var(--panel2);border:1px solid var(--border);border-radius:6px;padding:.3rem .55rem;color:var(--text);font-size:.76rem';

  const tbody=rows.map((r,i)=>{
    const d=_seqDias(r);
    const enObra=!r.fechaRetorno;
    return`<tr style="${enObra?'background:rgba(239,68,68,.05)':''}">
      <td style="${TD};color:var(--muted2)">${i+1}</td>
      <td style="${TD};font-family:monospace;font-weight:700">${r.placa||'—'}</td>
      <td style="${TD};font-family:monospace;color:var(--mec);font-weight:700">${r.codigo||'—'}</td>
      <td style="${TD}">${r.tipoEquipo||'—'}</td>
      <td style="${TD}"><span class="badge" style="font-size:.62rem;background:${r.tipoMantto==='Correctivo'?'rgba(239,68,68,.15);color:#ef4444;border:1px solid #ef444450':'rgba(16,185,129,.15);color:#10b981;border:1px solid #10b98150'}">${r.tipoMantto||'—'}</span></td>
      <td style="${TD};max-width:180px;overflow:hidden;text-overflow:ellipsis" title="${(r.motivo||'').replace(/"/g,'&quot;')}">${r.motivo||'—'}</td>
      <td style="${TD};font-family:monospace">${_seqDMY(r.fechaSalida)}${r.horaSalida?`<div style="font-size:.62rem;color:var(--muted2)">${r.horaSalida}</div>`:''}</td>
      <td style="${TD};text-align:right;font-family:monospace">${r.horomSalida!=null&&r.horomSalida!==''?_seqN1(r.horomSalida):'—'}</td>
      <td style="${TD};text-align:right;font-family:monospace">${r.kmSalida!=null&&r.kmSalida!==''?_seqN1(r.kmSalida):'—'}</td>
      <td style="${TD};text-align:right;font-family:monospace">${r.combSalida!=null&&r.combSalida!==''?_seqN1(r.combSalida):'—'}</td>
      <td style="${TD};font-family:monospace">${r.fechaRetorno?_seqDMY(r.fechaRetorno):'<span style="color:#ef4444;font-weight:700">— pendiente —</span>'}</td>
      <td style="${TD};text-align:center;font-weight:800;color:${d==null?'var(--muted2)':d>7?'#ef4444':d>3?'#f59e0b':'#10b981'}">${d==null?'—':d}</td>
      <td style="${TD};max-width:150px;overflow:hidden;text-overflow:ellipsis">${r.operador||'—'}</td>
      <td style="${TD};text-align:center">${r.imgUrl?`<img src="${r.imgUrl}" onclick="window.open('${r.imgUrl}','_blank')" style="width:34px;height:26px;object-fit:cover;border-radius:4px;border:1px solid var(--border);cursor:pointer">`:'<span style="color:var(--muted)">—</span>'}</td>
      <td style="${TD};white-space:nowrap">
        ${enObra?`<button onclick="_seqRetorno(${r.id})" title="Registrar retorno a obra" style="background:rgba(16,185,129,.12);border:1px solid #10b98150;border-radius:5px;color:#10b981;cursor:pointer;font-size:.72rem;padding:.15rem .45rem;font-weight:700">↩ Retorno</button>`:''}
        <button onclick="_seqEdit(${r.id})" title="Editar" style="background:none;border:1px solid #f59e0b50;border-radius:5px;color:#f59e0b;cursor:pointer;font-size:.72rem;padding:.15rem .4rem;margin-left:.2rem">✏</button>
        <button onclick="_seqDel(${r.id})" title="Eliminar" style="background:none;border:1px solid #ef444450;border-radius:5px;color:#ef4444;cursor:pointer;font-size:.72rem;padding:.15rem .4rem;margin-left:.2rem">🗑</button>
      </td>
    </tr>`;
  }).join('');

  pg.innerHTML=`
    <div class="kpi-row">${kpis.map(k=>`<div class="kpi" style="--kc:${k.c}"><div class="kpi-lbl">${k.l}</div><div class="kpi-val">${k.v}</div></div>`).join('')}</div>
    <div class="card" style="margin-bottom:.9rem">
      <div class="card-head"><span class="card-title">📄 Datos de la cabecera del documento</span></div>
      <div class="card-body"><div class="fg-grid">
        <div class="fg"><label>Solicita</label><input id="seq_solicita" value="${(_seqSolicita||'').replace(/"/g,'&quot;')}" placeholder="Abelo – Project Controls" oninput="_seqSetCab('solicita',this.value)" style="${inpS}"></div>
        <div class="fg"><label>Dirigido a</label><input id="seq_dirigido" value="${(_seqDirigido||'').replace(/"/g,'&quot;')}" placeholder="Ing. Iván" oninput="_seqSetCab('dirigido',this.value)" style="${inpS}"></div>
      </div></div>
    </div>
    <div class="card">
      <div class="card-head" style="flex-wrap:wrap;gap:.5rem">
        <span class="card-title">🚚 Control de Salida de Equipos a Mantenimiento</span>
        <div style="display:flex;align-items:center;gap:.4rem;flex-wrap:wrap">
          <select onchange="_seqSetFiltro('est',this.value)" style="${inpS}">
            <option value="">— Todos —</option>
            <option value="fuera" ${_seqFiltEst==='fuera'?'selected':''}>Solo fuera de obra</option>
            <option value="ret" ${_seqFiltEst==='ret'?'selected':''}>Solo retornados</option>
          </select>
          <select onchange="_seqSetFiltro('tipo',this.value)" style="${inpS}">
            <option value="">— Todo mantto. —</option>
            <option value="Preventivo" ${_seqFiltTipo==='Preventivo'?'selected':''}>Preventivo</option>
            <option value="Correctivo" ${_seqFiltTipo==='Correctivo'?'selected':''}>Correctivo</option>
          </select>
          <div class="search-wrap"><span>🔍</span><input class="search-input" placeholder="Buscar..." value="${_seqBuscar}" oninput="_seqSetFiltro('q',this.value)"></div>
          <button onclick="_seqPrint()" style="background:rgba(239,68,68,.12);border:1px solid #ef444460;border-radius:6px;color:#ef4444;padding:.3rem .7rem;font-size:.74rem;font-weight:700;cursor:pointer">🖨 PDF</button>
          <button onclick="_seqExportXls()" style="background:#166534;border:none;border-radius:6px;color:#fff;padding:.3rem .7rem;font-size:.74rem;font-weight:700;cursor:pointer">📊 Excel</button>
          <button class="btn btn-a" style="--ba:var(--mec)" onclick="_seqNuevo()">＋ Registrar Salida</button>
        </div>
      </div>
      <div class="card-body"><div style="overflow-x:auto;max-height:64vh;overflow-y:auto;border-radius:8px"><table style="width:100%;border-collapse:collapse;min-width:1450px">
        <thead><tr>
          <th style="${TH}">Ítem</th><th style="${TH}">Placa</th><th style="${TH}">Cód. Interno</th><th style="${TH}">Tipo de Equipo</th>
          <th style="${TH}">Tipo Mantto.</th><th style="${TH}">Motivo / Frecuencia</th><th style="${TH}">Fecha / Hora Salida</th>
          <th style="${TH};text-align:right">Horóm. Salida</th><th style="${TH};text-align:right">Km Salida</th><th style="${TH};text-align:right">Comb. Salida</th>
          <th style="${TH}">Fecha Retorno</th><th style="${TH};text-align:center">Días Fuera</th>
          <th style="${TH}">Operador Resp.</th><th style="${TH};text-align:center">Img.</th><th style="${TH}"></th>
        </tr></thead>
        <tbody>${tbody||`<tr><td colspan="15" style="text-align:center;padding:2.5rem;color:var(--muted2);font-size:.85rem">Sin salidas registradas${(_seqFiltEst||_seqFiltTipo||_seqBuscar)?' con estos filtros':''}.</td></tr>`}</tbody>
      </table></div></div>
    </div>`;
}

// ── Alta / edición ──
function _seqNuevo(){
  _seqEditId=null;_seqImgUrl='';_seqImgPath='';
  _seqFill({fechaSalida:today(),tipoMantto:'Preventivo'});
  document.querySelector('#mSalidaEq .mttl').textContent='🚚 Registrar Salida de Equipo';
  openM('mSalidaEq');
}
function _seqEdit(id){
  const r=(DB.salidaEquipos||[]).find(x=>+x.id===+id);if(!r)return;
  _seqEditId=+id;_seqImgUrl=r.imgUrl||'';_seqImgPath=r.imgPath||'';
  _seqFill(r);
  document.querySelector('#mSalidaEq .mttl').textContent='✏️ Editar Salida — '+(r.codigo||'');
  openM('mSalidaEq');
}
// Atajo: abre el registro en modo retorno, con la fecha de hoy precargada
function _seqRetorno(id){
  _seqEdit(id);
  const f=document.getElementById('seqFechaRet');
  if(f&&!f.value)f.value=today();
  setTimeout(()=>{const el=document.getElementById('seqHoromRet');if(el)el.focus();},150);
}
function _seqFill(r){
  const eqSel=document.getElementById('seqEq');
  if(eqSel){
    eqSel.innerHTML='<option value="">— Seleccionar del Máster —</option>'+
      (DB.equipos||[]).slice().sort((a,b)=>(a.codigo||'').localeCompare(b.codigo||''))
        .map(e=>`<option value="${e.id}">${e.codigo}${e.placa?' · '+e.placa:''} — ${(e.nombre||'').split(' ').slice(0,3).join(' ')}</option>`).join('');
    eqSel.value=r.eqId||'';
  }
  const set=(id,v)=>{const el=document.getElementById(id);if(el)el.value=v!=null?v:'';};
  set('seqPlaca',r.placa);set('seqCodigo',r.codigo);set('seqTipoEq',r.tipoEquipo);
  set('seqTipoMantto',r.tipoMantto||'Preventivo');set('seqMotivo',r.motivo);
  set('seqFechaSal',r.fechaSalida);set('seqHoraSal',r.horaSalida);
  set('seqHoromSal',r.horomSalida);set('seqKmSal',r.kmSalida);set('seqCombSal',r.combSalida);
  set('seqFechaRet',r.fechaRetorno);set('seqHoromRet',r.horomRetorno);set('seqKmRet',r.kmRetorno);set('seqCombRet',r.combRetorno);
  set('seqOperador',r.operador);set('seqObs',r.obs);
  _seqImgRender();
}
// Al elegir un equipo del Máster se autocompletan placa, código y tipo
function _seqEqPick(){
  const id=+document.getElementById('seqEq').value||0;
  const e=(DB.equipos||[]).find(x=>x.id===id);if(!e)return;
  const set=(i,v)=>{const el=document.getElementById(i);if(el)el.value=v||'';};
  set('seqPlaca',e.placa);set('seqCodigo',e.codigo);set('seqTipoEq',e.sub||e.tipo);
  if(e.hr&&!document.getElementById('seqHoromSal').value)set('seqHoromSal',e.hr);
  if(e.km&&!document.getElementById('seqKmSal').value)set('seqKmSal',e.km);
}
function _seqImgRender(){
  const prev=document.getElementById('seqImgPrev'),del=document.getElementById('seqImgDel');
  if(prev)prev.innerHTML=_seqImgUrl?`<img src="${_seqImgUrl}" style="max-width:100%;max-height:100%;object-fit:contain">`:'—';
  if(del)del.style.display=_seqImgUrl?'':'none';
}
async function _seqUploadImg(input){
  const file=input.files[0];if(!file)return;
  toast('Subiendo imagen...');
  const ext=(file.name.split('.').pop()||'jpg').toLowerCase();
  const path=`salidas/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
  const{error}=await supa.storage.from(_SEQ_BUCKET).upload(path,file,{upsert:false});
  if(error){toast('Error al subir: '+error.message,true);input.value='';return;}
  const{data:{publicUrl}}=supa.storage.from(_SEQ_BUCKET).getPublicUrl(path);
  _seqImgUrl=publicUrl;_seqImgPath=path;
  _seqImgRender();input.value='';
  toast('✓ Imagen cargada');
}
function _seqDelImg(){_seqImgUrl='';_seqImgPath='';_seqImgRender();}

async function _seqSave(){
  const v=id=>(document.getElementById(id)?.value||'').trim();
  const n=id=>{const x=document.getElementById(id)?.value;return x===''||x==null?null:+x;};
  const codigo=v('seqCodigo');
  const fechaSalida=v('seqFechaSal');
  if(!codigo){toast('Selecciona el equipo o escribe su código',true);return;}
  if(!fechaSalida){toast('Ingresa la fecha de salida',true);return;}
  const fechaRetorno=v('seqFechaRet')||null;
  if(fechaRetorno&&fechaRetorno<fechaSalida){toast('La fecha de retorno no puede ser anterior a la de salida',true);return;}

  const rec={
    id:_seqEditId!=null?_seqEditId:nid('sleq'),
    eqId:+document.getElementById('seqEq').value||null,
    placa:v('seqPlaca')||null,codigo,tipoEquipo:v('seqTipoEq')||null,
    tipoMantto:v('seqTipoMantto')||null,motivo:v('seqMotivo')||null,
    fechaSalida,horaSalida:v('seqHoraSal')||null,
    horomSalida:n('seqHoromSal'),kmSalida:n('seqKmSal'),combSalida:n('seqCombSal'),
    fechaRetorno,horomRetorno:n('seqHoromRet'),kmRetorno:n('seqKmRet'),combRetorno:n('seqCombRet'),
    operador:v('seqOperador')||null,obs:v('seqObs')||null,
    imgUrl:_seqImgUrl||null,imgPath:_seqImgPath||null,
    proyecto:(DB.equipos||[]).find(e=>e.id===(+document.getElementById('seqEq').value||0))?.proyecto||null,
    creadoPor:CU?CU.nombre:''
  };
  if(await supaUpsert('salidaEquipos',rec))return;
  const i=(DB.salidaEquipos||[]).findIndex(x=>+x.id===+rec.id);
  if(i>-1)DB.salidaEquipos[i]={...DB.salidaEquipos[i],...rec};
  else(DB.salidaEquipos=DB.salidaEquipos||[]).push(rec);
  closeM('mSalidaEq');
  _seqEditId=null;
  rSalidaEquipos();
  toast(fechaRetorno?'✓ Retorno registrado':'✓ Salida registrada');
}
async function _seqDel(id){
  const r=(DB.salidaEquipos||[]).find(x=>+x.id===+id);if(!r)return;
  if(!confirm(`¿Eliminar la salida de ${r.codigo||''} del ${_seqDMY(r.fechaSalida)}?`))return;
  if(r.imgPath)await supa.storage.from(_SEQ_BUCKET).remove([r.imgPath]);
  await supaDelete('salidaEquipos',id);
  DB.salidaEquipos=(DB.salidaEquipos||[]).filter(x=>+x.id!==+id);
  rSalidaEquipos();
  toast('Salida eliminada');
}

// ── Documento imprimible (A4 horizontal, mismo formato del control en Excel) ──
function _seqDocHtml(){
  const rows=_seqLista();
  const AZ='#1F4E79',HDR='#2F5496';
  const _logoUrl=window.location.href.replace(/[^\/\\]+$/,'')+'09.-ERP/Imagenes/ECOSERMO-LOGO.png';
  const TH=`background:${HDR};color:#fff;padding:4px 3px;font-size:7.5px;font-weight:700;text-transform:uppercase;text-align:center;border:1px solid #fff`;
  const TD='border:1px solid #b7c3d4;padding:3px 4px;font-size:8px;color:#111;text-align:center';
  const proy=(rows.find(r=>r.proyecto)||{}).proyecto||'';
  return`<div style="font-family:Arial,sans-serif;color:#111">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:2px">
      <img src="${_logoUrl}" style="height:34px;object-fit:contain">
      <div>
        <div style="font-size:12px;font-weight:900;color:${AZ}">ECOSERMO</div>
        <div style="font-size:11px;font-weight:800;color:#111">CONTROL DE SALIDA DE EQUIPOS A MANTENIMIENTO</div>
        <div style="font-size:8px;font-style:italic;color:#333">Proyecto: Recrecimiento Dique Relavera R3 – Cota 4416 | U.M. Uchuchacua – Cía. de Minas Buenaventura S.A.A.${proy?' | '+proy:''}</div>
      </div>
    </div>
    <table style="width:100%;border-collapse:collapse;margin:6px 0 4px">
      <tr>
        <td style="font-size:8px;padding:2px 4px;border:1px solid #b7c3d4"><b>Solicita:</b> ${_seqSolicita||'—'}</td>
        <td style="font-size:8px;padding:2px 4px;border:1px solid #b7c3d4"><b>Dirigido a:</b> ${_seqDirigido||'—'}</td>
        <td style="font-size:8px;padding:2px 4px;border:1px solid #b7c3d4"><b>Fecha de emisión:</b> ${new Date().toLocaleDateString('es-PE')}</td>
      </tr>
    </table>
    <table style="width:100%;border-collapse:collapse">
      <thead><tr>
        <th style="${TH}">Ítem</th><th style="${TH}">Placa</th><th style="${TH}">Código Interno</th><th style="${TH}">Tipo de Equipo</th>
        <th style="${TH}">Tipo de Mantto.</th><th style="${TH}">Motivo / Frecuencia</th><th style="${TH}">Fecha Salida</th><th style="${TH}">Hora Salida</th>
        <th style="${TH}">Horómetro Salida (h)</th><th style="${TH}">Kilometraje Salida (km)</th><th style="${TH}">Cant. Comb. de Salida (GLN)</th>
        <th style="${TH}">Horómetro Retorno (h)</th><th style="${TH}">Kilometraje Retorno (km)</th><th style="${TH}">Cant. Comb. de Llegada (GLN)</th>
        <th style="${TH}">Fecha Retorno</th><th style="${TH}">Días Fuera de Obra</th><th style="${TH}">Operador Responsable</th>
        <th style="${TH}">Observaciones</th><th style="${TH}">Imagen Referencial</th>
      </tr></thead>
      <tbody>${rows.length?rows.map((r,i)=>{
        const d=_seqDias(r);
        const nn=x=>x==null||x===''?'':_seqN1(x);
        return`<tr>
          <td style="${TD}">${i+1}</td><td style="${TD}">${r.placa||''}</td><td style="${TD}">${r.codigo||''}</td><td style="${TD}">${r.tipoEquipo||''}</td>
          <td style="${TD}">${r.tipoMantto||''}</td><td style="${TD};text-align:left">${r.motivo||''}</td>
          <td style="${TD}">${_seqDMY(r.fechaSalida)}</td><td style="${TD}">${r.horaSalida||''}</td>
          <td style="${TD}">${nn(r.horomSalida)}</td><td style="${TD}">${nn(r.kmSalida)}</td><td style="${TD}">${nn(r.combSalida)}</td>
          <td style="${TD}">${nn(r.horomRetorno)}</td><td style="${TD}">${nn(r.kmRetorno)}</td><td style="${TD}">${nn(r.combRetorno)}</td>
          <td style="${TD}">${r.fechaRetorno?_seqDMY(r.fechaRetorno):''}</td>
          <td style="${TD};background:#eef2f7;font-weight:700">${d==null?'':d}</td>
          <td style="${TD};text-align:left">${r.operador||''}</td>
          <td style="${TD};text-align:left">${r.obs||''}</td>
          <td style="${TD}">${r.imgUrl?`<img src="${r.imgUrl}" style="width:52px;height:38px;object-fit:cover">`:''}</td>
        </tr>`;
      }).join(''):`<tr><td colspan="19" style="${TD};padding:14px;color:#888">Sin registros</td></tr>`}</tbody>
    </table>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:2rem;margin-top:26px">
      <div style="text-align:center"><div style="height:52px"></div><div style="border-top:1.2px solid #333;margin:0 20px 4px"></div><div style="font-size:8.5px;text-transform:uppercase;font-weight:700;color:${AZ}">Solicitante</div></div>
      <div style="text-align:center"><div style="height:52px"></div><div style="border-top:1.2px solid #333;margin:0 20px 4px"></div><div style="font-size:8.5px;text-transform:uppercase;font-weight:700;color:${AZ}">Jefe de Mantenimiento</div></div>
    </div>
  </div>`;
}
function _seqPrint(){
  if(!_seqLista().length){toast('No hay registros para imprimir',true);return;}
  const html=`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Control de Salida de Equipos</title>
  <style>@page{size:A4 landscape;margin:.8cm}*{box-sizing:border-box;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}
  body{font-family:Arial,sans-serif;margin:0}table{border-collapse:collapse}tr{page-break-inside:avoid}</style></head>
  <body>${_seqDocHtml()}<script>window.onload=()=>{window.print();}<\/script></body></html>`;
  const w=window.open('','_blank');
  if(!w){toast('Active ventanas emergentes para imprimir',true);return;}
  w.document.write(html);w.document.close();
}
function _seqExportXls(){
  const rows=_seqLista();
  if(!rows.length){toast('No hay datos para exportar',true);return;}
  const aoa=[
    ['CONTROL DE SALIDA DE EQUIPOS A MANTENIMIENTO'],
    ['Solicita: '+(_seqSolicita||''),'Dirigido a: '+(_seqDirigido||''),'Emitido: '+new Date().toLocaleDateString('es-PE')],
    [],
    ['Ítem','Placa','Código Interno','Tipo de Equipo','Tipo de Mantto.','Motivo / Frecuencia','Fecha Salida','Hora Salida',
     'Horómetro Salida (h)','Kilometraje Salida (km)','Cant. Comb. Salida (GLN)','Horómetro Retorno (h)','Kilometraje Retorno (km)',
     'Cant. Comb. Llegada (GLN)','Fecha Retorno','Días Fuera de Obra','Operador Responsable','Observaciones'],
    ...rows.map((r,i)=>[i+1,r.placa||'',r.codigo||'',r.tipoEquipo||'',r.tipoMantto||'',r.motivo||'',r.fechaSalida||'',r.horaSalida||'',
      r.horomSalida??'',r.kmSalida??'',r.combSalida??'',r.horomRetorno??'',r.kmRetorno??'',r.combRetorno??'',
      r.fechaRetorno||'',_seqDias(r)??'',r.operador||'',r.obs||''])
  ];
  const ws=XLSX.utils.aoa_to_sheet(aoa);
  ws['!cols']=[{wch:6},{wch:12},{wch:14},{wch:16},{wch:14},{wch:28},{wch:12},{wch:11},{wch:14},{wch:15},{wch:15},{wch:14},{wch:15},{wch:15},{wch:12},{wch:12},{wch:22},{wch:30}];
  const wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,ws,'Salida de Equipos');
  XLSX.writeFile(wb,'control_salida_equipos.xlsx');
}
