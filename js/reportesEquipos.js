// ══ DASHBOARD DE EQUIPOS + REPORTE DE EQUIPOS ══
// (separado de auxmec.js — usa helpers globales de utils.js/config.js)

// ══ DASHBOARD EQUIPOS ══
function rDashEquipos(){
  const el=document.getElementById('page-dashEquipos');
  if(!el)return;
  const S={tab:'Línea Amarilla',periodo:'mes',guardia:''};
  window._deTab=t=>{S.tab=t;_deRender();};
  window._dePeriod=v=>{S.periodo=v;_deRender();};
  window._deGuardia=v=>{S.guardia=v;_deRender();};

  function _inPeriodo(fecha){
    if(!fecha)return false;
    const d=new Date(fecha+'T12:00:00'),hoy=new Date();
    if(S.periodo==='mes')return d.getFullYear()===hoy.getFullYear()&&d.getMonth()===hoy.getMonth();
    if(S.periodo==='mesAnt'){const p=new Date(hoy.getFullYear(),hoy.getMonth()-1,1);return d.getFullYear()===p.getFullYear()&&d.getMonth()===p.getMonth();}
    if(S.periodo==='semana'){return(hoy-d)/86400000>=0&&(hoy-d)/86400000<7;}
    return true;
  }

  function _deRender(){
    const tipo=S.tab;
    const color=tipo==='Línea Amarilla'?'#f59e0b':'#06b6d4';

    const partes=DB.partes.filter(p=>{
      const eq=DB.equipos.find(e=>e.id===p.eqId);
      if(!eq||eq.tipo!==tipo)return false;
      if(S.guardia&&p.guardia!==S.guardia)return false;
      return _inPeriodo(p.fecha);
    });

    // Agrupar: subtipo → equipo
    const bySubEq={};
    partes.forEach(p=>{
      const eq=DB.equipos.find(e=>e.id===p.eqId);if(!eq)return;
      const sub=eq.sub||'Sin clasificar';
      if(!bySubEq[sub])bySubEq[sub]={};
      if(!bySubEq[sub][eq.id])bySubEq[sub][eq.id]={eqId:eq.id,nombre:eq.nombre,codigo:eq.codigo,ef:0,im:0};
      bySubEq[sub][eq.id].ef+=+p.ef||0;
      bySubEq[sub][eq.id].im+=+p.im||0;
    });

    const subtypes=Object.keys(bySubEq).sort();
    const totEf=partes.reduce((s,p)=>s+(+p.ef||0),0);
    const totIm=partes.reduce((s,p)=>s+(+p.im||0),0);
    const disp=(totEf+totIm)>0?((totEf/(totEf+totIm))*100).toFixed(1):'—';

    let html=`
      <div class="ph">
        <div class="ph-title" style="color:${color}">📊 Dashboard – Control de Equipos</div>
        <div class="ph-sub">Horas efectivas e inoperativas por equipo</div>
      </div>
      <div class="card" style="margin-bottom:1rem">
        <div class="card-head" style="gap:.7rem;flex-wrap:nowrap">
          <div style="display:flex;gap:.4rem">
            <button class="btn ${S.tab==='Línea Amarilla'?'btn-a':'btn-out'}" style="${S.tab==='Línea Amarilla'?'--ba:#f59e0b':''}" onclick="_deTab('Línea Amarilla')">🟡 Línea Amarilla</button>
            <button class="btn ${S.tab==='Línea Blanca'?'btn-a':'btn-out'}" style="${S.tab==='Línea Blanca'?'--ba:#06b6d4':''}" onclick="_deTab('Línea Blanca')">⚪ Línea Blanca</button>
          </div>
          <div style="display:flex;gap:.5rem">
            <select onchange="_dePeriod(this.value)" style="max-width:150px">
              <option value="mes" ${S.periodo==='mes'?'selected':''}>Mes actual</option>
              <option value="mesAnt" ${S.periodo==='mesAnt'?'selected':''}>Mes anterior</option>
              <option value="semana" ${S.periodo==='semana'?'selected':''}>Última semana</option>
              <option value="todo" ${S.periodo==='todo'?'selected':''}>Todo</option>
            </select>
            <select onchange="_deGuardia(this.value)" style="max-width:130px">
              <option value="">Todas guardias</option>
              <option value="A" ${S.guardia==='A'?'selected':''}>Guardia A</option>
              <option value="B" ${S.guardia==='B'?'selected':''}>Guardia B</option>
            </select>
          </div>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:.8rem;margin-bottom:1rem">
        ${[
          {l:'PARTES',v:partes.length,c:color,u:''},
          {l:'HS EFECTIVAS',v:totEf.toFixed(1),c:color,u:'h'},
          {l:'HS INOPERATIVAS',v:totIm.toFixed(1),c:'#ef4444',u:'h'},
          {l:'DISPONIBILIDAD',v:disp,c:'#10b981',u:'%'}
        ].map(k=>`<div class="card" style="text-align:center;padding:.9rem">
          <div style="font-size:.6rem;letter-spacing:.1em;color:var(--muted2);margin-bottom:.4rem">${k.l}</div>
          <div style="font-size:1.7rem;font-weight:800;color:${k.c};line-height:1">${k.v}<span style="font-size:.9rem">${k.u}</span></div>
        </div>`).join('')}
      </div>`;

    if(!subtypes.length){
      html+=`<div class="card"><div class="mb" style="text-align:center;color:var(--muted2);padding:2.5rem 1rem;font-size:.9rem">Sin datos para el período seleccionado</div></div>`;
    } else {
      subtypes.forEach(sub=>{
        const items=Object.values(bySubEq[sub]).sort((a,b)=>b.ef-a.ef);
        const maxVal=Math.max(...items.map(i=>i.ef+i.im),1);
        const stEf=items.reduce((s,i)=>s+i.ef,0);
        const stIm=items.reduce((s,i)=>s+i.im,0);
        html+=`<div class="card" style="margin-bottom:1rem">
          <div class="card-head">
            <div class="card-title" style="color:${color}">${sub} <span style="font-weight:400;color:var(--muted2);font-size:.75rem">(${items.length} equipo${items.length!==1?'s':''})</span></div>
            <div style="display:flex;gap:1.2rem;font-size:.75rem">
              <span style="color:${color}">Ef total: <strong>${stEf.toFixed(1)}h</strong></span>
              <span style="color:#ef4444">Inop total: <strong>${stIm.toFixed(1)}h</strong></span>
            </div>
          </div>
          <div class="mb">${_deChart(items,maxVal,color,S.periodo)}</div>
        </div>`;
      });
    }

    el.innerHTML=html;
  }

  _deRender();
}

function _deChart(items,maxVal,color,periodo){
  const H=170;
  const bars=items.map(item=>{
    const efH=maxVal>0?Math.max(item.ef>0?4:0,Math.round((item.ef/maxVal)*H)):0;
    const imH=maxVal>0?Math.max(item.im>0?4:0,Math.round((item.im/maxVal)*H)):0;
    const lbl=item.codigo||(item.nombre.split(' ').slice(0,2).join(' '));
    const safeColor=color.replace(/'/g,"\\'");
    return `<div style="flex:1;min-width:58px;max-width:96px;cursor:pointer;user-select:none" title="Doble clic para ver detalle diario de ${lbl}" ondblclick="openDrillDown('${item.eqId}','${lbl}','${safeColor}','${periodo||'mes'}')">
      <div style="height:${H}px;display:flex;align-items:flex-end;justify-content:center;gap:3px;border-bottom:1px solid #1e2740">
        <div style="width:22px;height:${efH}px;background:${color};border-radius:3px 3px 0 0;position:relative" title="Ef: ${item.ef.toFixed(1)}h">
          <span style="position:absolute;bottom:100%;left:50%;transform:translateX(-50%);font-size:.52rem;color:${color};white-space:nowrap;padding-bottom:2px">${item.ef>0?item.ef.toFixed(1):''}</span>
        </div>
        <div style="width:22px;height:${imH}px;background:#ef4444;border-radius:3px 3px 0 0;position:relative" title="Inop: ${item.im.toFixed(1)}h">
          <span style="position:absolute;bottom:100%;left:50%;transform:translateX(-50%);font-size:.52rem;color:#ef4444;white-space:nowrap;padding-bottom:2px">${item.im>0?item.im.toFixed(1):''}</span>
        </div>
      </div>
      <div style="font-size:.58rem;color:var(--muted2);text-align:center;padding:5px 2px;line-height:1.2">${lbl}</div>
    </div>`;
  }).join('');

  return `<div style="display:flex;gap:6px;overflow-x:auto;padding:1.4rem .5rem .2rem;min-height:${H+60}px">${bars}</div>
    <div style="display:flex;gap:1.2rem;margin-top:.6rem">
      <span style="font-size:.7rem;color:var(--muted2);display:flex;align-items:center;gap:.35rem"><span style="display:inline-block;width:11px;height:11px;background:${color};border-radius:2px"></span>Hs Efectivas</span>
      <span style="font-size:.7rem;color:var(--muted2);display:flex;align-items:center;gap:.35rem"><span style="display:inline-block;width:11px;height:11px;background:#ef4444;border-radius:2px"></span>Hs Inoperativas</span>
    </div>`;
}

// ══ DRILL-DOWN HORAS DIARIAS ══
function openDrillDown(eqId, codigo, color, periodo){
  const hoy=new Date();
  let year=hoy.getFullYear(), month=hoy.getMonth();
  if(periodo==='mesAnt'){const p=new Date(hoy.getFullYear(),hoy.getMonth()-1,1);year=p.getFullYear();month=p.getMonth();}

  // Poblar selector de años con los años presentes en partes + año actual
  const years=[...new Set(DB.partes.map(p=>p.fecha?p.fecha.substring(0,4):null).filter(Boolean).map(Number))];
  if(!years.includes(year))years.push(year);
  years.sort((a,b)=>b-a);
  const yrSel=document.getElementById('ddYear');
  yrSel.innerHTML=years.map(y=>`<option value="${y}" ${y===year?'selected':''}>${y}</option>`).join('');

  document.getElementById('ddEqId').value=eqId;
  document.getElementById('ddColor').value=color;
  document.getElementById('ddCodigo').textContent=codigo;
  document.getElementById('ddMonth').value=month;
  _renderDrillDown();
  const el=document.getElementById('mDrillDown');
  if(el){el.style.display='flex';}
}

// ══ REPORTE DE EQUIPOS ══
let _reqCache=[];

function _reqOnTipoChange(){
  const tipo=(document.getElementById('reqFiltTipo')||{}).value||'';
  const codSel=document.getElementById('reqFiltCod');
  if(codSel){
    const eqsFilt=(DB.equipos||[]).filter(e=>!tipo||e.tipo===tipo);
    codSel.innerHTML='<option value="">— Todos —</option>'+
      eqsFilt.sort((a,b)=>a.codigo.localeCompare(b.codigo))
        .map(e=>`<option value="${e.id}">${e.codigo}${e.placa?' ['+e.placa+']':''}</option>`).join('');
  }
  rReporteEquipos();
}

// Tabs del Reporte de Equipos: 1 = Partes Diarios · 2 = Utilización de Equipos
let _reqTabSel=1;
function _reqTabSwitch(t){
  _reqTabSel=t;
  const p=document.getElementById('reqTabPartes'),u=document.getElementById('reqUtil');
  if(p)p.style.display=t===1?'':'none';
  if(u)u.style.display=t===2?'':'none';
  [[1,'reqTabBtn1'],[2,'reqTabBtn2']].forEach(([n,id])=>{
    const b=document.getElementById(id);if(!b)return;
    const sel=t===n;
    b.style.borderColor=sel?'var(--ceq)':'var(--border)';
    b.style.background=sel?'rgba(249,115,22,.15)':'var(--panel2)';
    b.style.color=sel?'var(--ceq)':'var(--muted2)';
    b.style.fontWeight=sel?'800':'500';
  });
}
function rReporteEquipos(){
  const TIPOS_EQ=['Línea Amarilla','Línea Blanca','Vehículo Menor','Equipos Menores'];
  const fTipo=(document.getElementById('reqFiltTipo')||{}).value||'';
  const fCodId=(document.getElementById('reqFiltCod')||{}).value||'';
  const eqs=(DB.equipos||[]).filter(e=>TIPOS_EQ.includes(e.tipo)&&(!fTipo||e.tipo===fTipo));
  const fEq=fCodId?+fCodId||0:0;
  const fDesde=(document.getElementById('reqFiltDesde')||{}).value||'';
  const fHasta=(document.getElementById('reqFiltHasta')||{}).value||'';
  const hMinDia=+(document.getElementById('reqHmin')||{}).value||0;
  const hMinMes=+(document.getElementById('reqHminMes')||{}).value||0;
  const _esVMFilt=fTipo==='Vehículo Menor';
  // Encabezados dinámicos según tipo filtrado
  const _hdrIni=document.getElementById('thColIni'),_hdrFin=document.getElementById('thColFin'),_hdrTrab=document.getElementById('thColTrab');
  if(_hdrIni)_hdrIni.textContent=_esVMFilt?'Km Inicial':'Hr Inicial';
  if(_hdrFin)_hdrFin.textContent=_esVMFilt?'Km Final':'Hr Final';
  if(_hdrTrab)_hdrTrab.textContent=_esVMFilt?'Km Recorridos':'Hs Trabajadas';

  let partes=[...(DB.partes||[])];
  if(fEq)partes=partes.filter(p=>p.eqId===fEq);
  else partes=partes.filter(p=>eqs.some(e=>e.id===p.eqId));
  if(fDesde)partes=partes.filter(p=>p.fecha>=fDesde);
  if(fHasta)partes=partes.filter(p=>p.fecha<=fHasta);
  partes=[...partes].sort((a,b)=>a.fecha.localeCompare(b.fecha));
  _reqCache=partes;

  // KPIs
  const totEf=partes.reduce((s,p)=>s+Math.max(0,+p.ef||0),0);
  const totIm=partes.reduce((s,p)=>s+(+p.im||0),0);
  const diasHmin=partes.filter(p=>hMinDia>0?(+p.ef||0)>=hMinDia:false).length;
  const stanby=hMinMes>0?Math.max(0,parseFloat((hMinMes-totEf).toFixed(2))):0;

  // ── UTILIZACIÓN DE EQUIPO: hs efectivas ÷ hs disponibles (días del período × jornada) ──
  const jornada=hMinDia>0?hMinDia:10;
  let diasPer=0;
  if(partes.length){
    const d1=fDesde||partes[0].fecha,d2=fHasta||partes[partes.length-1].fecha;
    diasPer=Math.max(1,Math.round((new Date(d2+'T12:00')-new Date(d1+'T12:00'))/864e5)+1);
  }
  const hsDisp=diasPer*jornada;
  const utilByEq={};
  partes.forEach(p=>{
    if(!utilByEq[p.eqId])utilByEq[p.eqId]={ef:0,im:0,dias:new Set()};
    utilByEq[p.eqId].ef+=Math.max(0,+p.ef||0);utilByEq[p.eqId].im+=(+p.im||0);utilByEq[p.eqId].dias.add(p.fecha);
  });
  const utilRows=Object.entries(utilByEq).map(([id,d])=>{
    const eq=DB.equipos.find(e=>e.id==id);
    return{eq,ef:d.ef,im:d.im,dias:d.dias.size,util:hsDisp>0?d.ef/hsDisp*100:0};
  }).sort((a,b)=>b.util-a.util);
  const utilGlob=utilRows.length&&hsDisp>0?totEf/(utilRows.length*hsDisp)*100:0;
  const _uCol=u=>u>=70?'#10b981':u>=40?'#f59e0b':'#ef4444';

  const kpiEl=document.getElementById('reqKpis');
  if(kpiEl)kpiEl.innerHTML=[
    {l:'Total Partes',v:partes.length,c:'var(--ceq)',ic:'📋'},
    {l:'Hs Efectivas',v:parseFloat(totEf.toFixed(2))+'h',c:'#10b981',ic:'⚙️'},
    {l:'Hs Inoperativas',v:parseFloat(totIm.toFixed(2))+'h',c:'#ef4444',ic:'🛑'},
    {l:'Utilización',v:partes.length?utilGlob.toFixed(0)+'%':'—',c:partes.length?_uCol(utilGlob):'var(--muted2)',ic:'📈'},
    {l:'Días Hmin Cumpl.',v:diasHmin,c:'#f59e0b',ic:'✅'},
    {l:'Hs Stanby a Pagar',v:stanby+'h',c:'#8b5cf6',ic:'⏸️'}
  ].map(k=>`<div class="kpi" style="--kc:${k.c}"><div class="kpi-lbl">${k.ic} ${k.l}</div><div class="kpi-val">${k.v}</div></div>`).join('');

  // Tabla de utilización por equipo
  const utilEl=document.getElementById('reqUtil');
  if(utilEl){
    utilEl.innerHTML=!utilRows.length?'<div class="card"><div class="card-body" style="text-align:center;color:var(--muted2);padding:2rem;font-size:.85rem">Sin datos de utilización para los filtros seleccionados.</div></div>':`<div class="card">
      <div class="card-head"><span class="card-title">📈 Utilización de Equipos</span>
        <span style="font-size:.63rem;color:var(--muted2)">Hs efectivas ÷ Hs disponibles · ${diasPer} día${diasPer===1?'':'s'} × ${jornada}h jornada = ${fmtN(hsDisp)}h por equipo</span>
      </div>
      <div class="card-body" style="padding:0"><div class="tbl-wrap"><table style="font-size:.72rem">
        <thead><tr style="font-size:.62rem;text-transform:uppercase;letter-spacing:.06em">
          <th>Código</th><th>Equipo</th><th>Tipo</th><th class="tr">Días c/Parte</th><th class="tr">Hs Efectivas</th><th class="tr">Hs Inop.</th><th style="min-width:190px">Utilización</th>
        </tr></thead>
        <tbody>
        ${utilRows.map(r=>{
          const c=_uCol(r.util);
          const pct=Math.min(100,Math.round(r.util));
          return`<tr>
            <td class="mono" style="color:var(--ceq);font-weight:700">${r.eq?r.eq.codigo:'—'}</td>
            <td>${r.eq?(r.eq.nombre||'').split(' ').slice(0,4).join(' '):'—'}</td>
            <td><span class="badge b-cyan" style="font-size:.6rem">${r.eq?(r.eq.sub||r.eq.tipo||'—'):'—'}</span></td>
            <td class="tr mono">${r.dias}</td>
            <td class="tr mono" style="color:#10b981;font-weight:700">${parseFloat(r.ef.toFixed(2))}h</td>
            <td class="tr mono" style="color:${r.im>0?'#ef4444':'var(--muted2)'}">${r.im>0?parseFloat(r.im.toFixed(2))+'h':'—'}</td>
            <td><div style="display:flex;align-items:center;gap:.5rem">
              <div style="flex:1;background:var(--border);border-radius:4px;height:8px;overflow:hidden">
                <div style="height:100%;width:${pct}%;background:${c};border-radius:4px"></div>
              </div>
              <span class="mono" style="color:${c};font-weight:800;min-width:48px;text-align:right">${r.util.toFixed(1)}%</span>
            </div></td>
          </tr>`;
        }).join('')}
        </tbody>
      </table></div></div>
    </div>`;
  }

  // Tabla
  const tb=document.getElementById('tbReporteEquipos');
  if(tb){
    if(!partes.length){
      tb.innerHTML='<tr><td colspan="11" style="text-align:center;padding:1.2rem;color:var(--muted2)">Sin partes para los filtros seleccionados.</td></tr>';
    }else{
      tb.innerHTML=partes.map(p=>{
        const eq=DB.equipos.find(e=>e.id===p.eqId);
        const ef=+p.ef||0;
        const esVM=eq?.tipo==='Vehículo Menor';
        const kmIni=+p.kmIni||0,kmFin=+p.kmFin||0,kmRec=kmFin>kmIni?kmFin-kmIni:0;
        const cumple=hMinDia>0?(esVM?kmRec>=hMinDia:ef>=hMinDia):null;
        const hminCell=cumple===null?'—':cumple?'<span style="color:#10b981;font-weight:700">SI</span>':'<span style="color:#ef4444;font-weight:600">NO</span>';
        const colIni=esVM?(kmIni>0?fmtN(kmIni)+' km':'—'):(+p.hrIni||+p.hrIni===0?parseFloat((+p.hrIni).toFixed(1)):'—');
        const colFin=esVM?(kmFin>0?fmtN(kmFin)+' km':'—'):(+p.hrFin||+p.hrFin===0?parseFloat((+p.hrFin).toFixed(1)):'—');
        const colTrab=esVM?(kmRec>0?fmtN(kmRec)+' km':'—'):(ef>0?parseFloat(ef.toFixed(2))+'h':'—');
        const colTrabColor=esVM?(kmRec>0?'#10b981':'var(--muted2)'):(ef>0?'#10b981':'var(--muted2)');
        return`<tr>
          <td class="mono">${p.fecha}</td>
          <td><span class="badge b-blue" style="font-size:.62rem">${p.turno||'—'}</span></td>
          <td>${eq?`<span class="badge b-cyan" style="font-size:.62rem">${eq.tipo||eq.sub||''}</span>`:''}</td>
          <td class="mono" style="color:var(--ceq);font-weight:700">${eq?eq.codigo:'—'}</td>
          <td class="mono">${colIni}</td>
          <td class="mono">${colFin}</td>
          <td class="mono" style="font-weight:700;color:${colTrabColor}">${colTrab}</td>
          <td style="text-align:center">${hminCell}</td>
          <td style="max-width:130px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${p.areaT||''}">${p.areaT||'—'}</td>
          <td style="max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${p.act||''}">${p.act||'—'}</td>
          <td style="max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${p.observaciones||''}">${p.observaciones||'—'}</td>
        </tr>`;
      }).join('');
    }
  }

  // Totales en tfoot
  const totKmRec=_esVMFilt?partes.reduce((s,p)=>{const ki=+p.kmIni||0,kf=+p.kmFin||0;return s+(kf>ki?kf-ki:0);},0):0;
  const tf=document.getElementById('tfReporteEquipos');
  if(tf&&partes.length){
    tf.innerHTML=`
      <tr style="background:rgba(30,58,95,.25);font-weight:700;border-top:2px solid var(--ceq)">
        <td colspan="6" style="text-align:right;padding:.4rem .6rem;font-size:.7rem;text-transform:uppercase;letter-spacing:.05em;color:var(--muted2)">${_esVMFilt?'Km Recorridos Total':'Hs Efectivas Total'}</td>
        <td class="mono" style="color:#10b981;font-weight:800">${_esVMFilt?fmtN(totKmRec)+' km':parseFloat(totEf.toFixed(2))+'h'}</td>
        <td colspan="4"></td>
      </tr>
      ${hMinMes>0&&!_esVMFilt?`<tr style="background:rgba(30,58,95,.15)">
        <td colspan="6" style="text-align:right;padding:.3rem .6rem;font-size:.7rem;text-transform:uppercase;letter-spacing:.05em;color:var(--muted2)">Hs Stanby a Pagar</td>
        <td class="mono" style="color:#8b5cf6;font-weight:700">${stanby}h</td>
        <td colspan="4"></td>
      </tr>
      <tr style="background:rgba(30,58,95,.1)">
        <td colspan="6" style="text-align:right;padding:.3rem .6rem;font-size:.7rem;text-transform:uppercase;letter-spacing:.05em;color:var(--muted2)">Total = Hmin Mes</td>
        <td class="mono" style="color:var(--ceq);font-weight:800">${hMinMes}h</td>
        <td colspan="4"></td>
      </tr>`:''}`;
  }else if(tf){
    tf.innerHTML='';
  }
  if(typeof _notifActualizarBotones==='function')_notifActualizarBotones();
}

function exportReporteEquiposXLSX(){
  if(!_reqCache||!_reqCache.length){toast('Sin datos para exportar',true);return;}
  const hMinDia=+(document.getElementById('reqHmin')||{}).value||0;
  const hMinMes=+(document.getElementById('reqHminMes')||{}).value||0;
  const fEq=+(document.getElementById('reqFiltEq')||{}).value||0;
  const fDesde=(document.getElementById('reqFiltDesde')||{}).value||'';
  const fHasta=(document.getElementById('reqFiltHasta')||{}).value||'';
  const eqNom=fEq?(DB.equipos.find(e=>e.id===fEq)||{}).codigo||'':' (Todos)';
  const periodo=(fDesde||'—')+' al '+(fHasta||'—');

  const S=(v,bold,bg,color,align,border)=>({v,t:'s',s:{
    font:{bold:!!bold,color:{rgb:color||'111111'},sz:9},
    fill:bg?{fgColor:{rgb:bg}}:{},
    alignment:{horizontal:align||'left',vertical:'center',wrapText:true},
    border:border?{top:{style:'thin',color:{rgb:'94a3b8'}},bottom:{style:'thin',color:{rgb:'94a3b8'}},left:{style:'thin',color:{rgb:'94a3b8'}},right:{style:'thin',color:{rgb:'94a3b8'}}}:{}
  }});
  const N=(v,bold,bg,color,align)=>({v:isNaN(v)?0:v,t:'n',s:{
    font:{bold:!!bold,color:{rgb:color||'111111'},sz:9,name:'Consolas'},
    fill:bg?{fgColor:{rgb:bg}}:{},
    alignment:{horizontal:align||'right',vertical:'center'},
    border:{top:{style:'thin',color:{rgb:'94a3b8'}},bottom:{style:'thin',color:{rgb:'94a3b8'}},left:{style:'thin',color:{rgb:'94a3b8'}},right:{style:'thin',color:{rgb:'94a3b8'}}}
  }});

  const HBOR={top:{style:'thin',color:{rgb:'94a3b8'}},bottom:{style:'thin',color:{rgb:'94a3b8'}},left:{style:'thin',color:{rgb:'94a3b8'}},right:{style:'thin',color:{rgb:'94a3b8'}}};
  const HDR='1E3A5F',HDRT='FFFFFF',SUBBG='EFF6FF',TOTBG='DBEAFE';

  const wsData=[];
  // Header info rows
  wsData.push([S('REPORTE DE EQUIPOS – VALORIZACIÓN',true,HDR,HDRT,'center'),...Array(10).fill(S('',false,HDR,HDRT))]);
  wsData.push([S(`Equipo: ${eqNom}`,true),...Array(10).fill(S(''))]);
  wsData.push([S(`Período: ${periodo}`),...Array(10).fill(S(''))]);
  wsData.push([S(`Hs Mínimas/día: ${hMinDia}h   |   Hmin Mes: ${hMinMes}h`),...Array(10).fill(S(''))]);
  wsData.push(Array(11).fill(S('')));

  // Column headers
  const cols=['FECHA','TURNO','TIPO DE EQUIPO','CÓDIGO','HR INICIAL','HR FINAL','HS TRABAJADAS','HS MÍNIMAS','ÁREA DE TRABAJO','DESCRIPCIÓN DEL TRABAJO','OBSERVACIONES'];
  wsData.push(cols.map(c=>({v:c,t:'s',s:{font:{bold:true,color:{rgb:HDRT},sz:8},fill:{fgColor:{rgb:HDR}},alignment:{horizontal:'center',vertical:'center'},border:HBOR}})));

  let totEf=0;
  _reqCache.forEach(p=>{
    const eq=DB.equipos.find(e=>e.id===p.eqId);
    const ef=+p.ef||0;
    totEf+=ef;
    const cumple=hMinDia>0?ef>=hMinDia:null;
    wsData.push([
      S(p.fecha,false,SUBBG,'334155','center',true),
      S(p.turno||'',false,'','334155','center',true),
      S(eq?eq.tipo||eq.sub||'':'',false,'','334155','center',true),
      S(eq?eq.codigo:'',true,'','1e6196','center',true),
      N(+p.hrIni||0,false,SUBBG,'334155','right'),
      N(+p.hrFin||0,false,SUBBG,'334155','right'),
      ({v:parseFloat(ef.toFixed(2)),t:'n',s:{font:{bold:true,color:{rgb:ef>0?'0f6b3d':'ef4444'},sz:9,name:'Consolas'},fill:{fgColor:{rgb:'f0fdf4'}},alignment:{horizontal:'right',vertical:'center'},border:HBOR}}),
      S(cumple===null?'—':cumple?'SI':'NO',true,'',cumple===null?'64748b':cumple?'0f6b3d':'dc2626','center',true),
      S(p.areaT||'—',false,'','334155','left',true),
      S(p.act||'—',false,'','334155','left',true),
      S(p.observaciones||'—',false,'','334155','left',true),
    ]);
  });

  // Footer totals
  wsData.push(Array(11).fill(S('')));
  const stanby=hMinMes>0?parseFloat(Math.max(0,hMinMes-totEf).toFixed(2)):0;
  wsData.push([S('Hs Efectivas Total',true,TOTBG,'1e3a5f','right',true),...Array(5).fill(S('',false,TOTBG)),
    ({v:parseFloat(totEf.toFixed(2)),t:'n',s:{font:{bold:true,color:{rgb:'0f6b3d'},sz:10,name:'Consolas'},fill:{fgColor:{rgb:TOTBG}},alignment:{horizontal:'right'},border:HBOR}}),
    ...Array(4).fill(S('',false,TOTBG))]);
  if(hMinMes>0){
    wsData.push([S('Hs Stanby a Pagar',true,TOTBG,'5b21b6','right',true),...Array(5).fill(S('',false,TOTBG)),
      ({v:stanby,t:'n',s:{font:{bold:true,color:{rgb:'5b21b6'},sz:10,name:'Consolas'},fill:{fgColor:{rgb:TOTBG}},alignment:{horizontal:'right'},border:HBOR}}),
      ...Array(4).fill(S('',false,TOTBG))]);
    wsData.push([S('Total = Hmin Mes',true,HDR,HDRT,'right',true),...Array(5).fill(S('',false,HDR,HDRT)),
      ({v:hMinMes,t:'n',s:{font:{bold:true,color:{rgb:HDRT},sz:10,name:'Consolas'},fill:{fgColor:{rgb:HDR}},alignment:{horizontal:'right'},border:HBOR}}),
      ...Array(4).fill(S('',false,HDR,HDRT))]);
  }

  const ws=XLSX.utils.aoa_to_sheet(wsData);
  ws['!cols']=[{wch:12},{wch:9},{wch:18},{wch:12},{wch:11},{wch:11},{wch:14},{wch:11},{wch:18},{wch:32},{wch:22}];
  ws['!merges']=[
    {s:{r:0,c:0},e:{r:0,c:10}},
    {s:{r:1,c:0},e:{r:1,c:10}},
    {s:{r:2,c:0},e:{r:2,c:10}},
    {s:{r:3,c:0},e:{r:3,c:10}},
  ];
  ws['!rows']=[{hpt:18},{hpt:14},{hpt:14},{hpt:14},{hpt:6},{hpt:20}];

  const wb=XLSX.utils.book_new();
  const sheetName=('Reporte_'+(eqNom||'Equipos')).substring(0,31);
  XLSX.utils.book_append_sheet(wb,ws,sheetName);
  const fname=`Reporte_Equipos_${(eqNom||'todos').replace(/[^a-zA-Z0-9]/g,'_')}_${fDesde||'inicio'}_${fHasta||'fin'}.xlsx`;
  XLSX.writeFile(wb,fname);
  toast('Excel generado: '+fname);
}

function _renderDrillDown(){
  const eqId=document.getElementById('ddEqId').value;
  const color=document.getElementById('ddColor').value||'var(--ceq)';
  const year=+document.getElementById('ddYear').value;
  const month=+document.getElementById('ddMonth').value;
  const codigo=document.getElementById('ddCodigo').textContent;
  const MESES=['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  document.getElementById('ddTitle').textContent=`${codigo} — ${MESES[month]} ${year}`;

  const partes=DB.partes.filter(p=>{
    if(String(p.eqId)!==String(eqId))return false;
    const d=new Date((p.fecha||'')+'T12:00:00');
    return d.getFullYear()===year&&d.getMonth()===month;
  });

  const daysInMonth=new Date(year,month+1,0).getDate();
  const byDay={};
  for(let d=1;d<=daysInMonth;d++)byDay[d]={ef:0,im:0,partes:0};
  partes.forEach(p=>{
    const d=new Date((p.fecha||'')+'T12:00:00').getDate();
    if(byDay[d]){byDay[d].ef+=+p.ef||0;byDay[d].im+=+p.im||0;byDay[d].partes++;}
  });

  const maxVal=Math.max(...Object.values(byDay).map(v=>v.ef+v.im),1);
  const H=150;
  const bars=Object.entries(byDay).map(([day,v])=>{
    const efH=v.ef>0?Math.max(4,Math.round((v.ef/maxVal)*H)):0;
    const imH=v.im>0?Math.max(4,Math.round((v.im/maxVal)*H)):0;
    const hasData=v.ef>0||v.im>0;
    return `<div style="flex:1;min-width:26px;max-width:46px" title="${hasData?`Día ${day}: Ef ${v.ef.toFixed(1)}h · Inop ${v.im.toFixed(1)}h`:`Día ${day}: sin parte`}">
      <div style="height:${H}px;display:flex;align-items:flex-end;justify-content:center;gap:2px;border-bottom:1px solid #1e2740">
        ${efH>0?`<div style="width:10px;height:${efH}px;background:${color};border-radius:2px 2px 0 0;position:relative">
          <span style="position:absolute;bottom:100%;left:50%;transform:translateX(-50%);font-size:.42rem;color:${color};white-space:nowrap;padding-bottom:1px">${v.ef.toFixed(1)}</span>
        </div>`:'<div style="width:10px"></div>'}
        ${imH>0?`<div style="width:10px;height:${imH}px;background:#ef4444;border-radius:2px 2px 0 0;position:relative">
          <span style="position:absolute;bottom:100%;left:50%;transform:translateX(-50%);font-size:.42rem;color:#ef4444;white-space:nowrap;padding-bottom:1px">${v.im.toFixed(1)}</span>
        </div>`:''}
      </div>
      <div style="font-size:.55rem;text-align:center;padding:3px 1px;color:${hasData?'var(--text)':'var(--muted2)'};font-weight:${hasData?'700':'400'}">${day}</div>
    </div>`;
  }).join('');

  const totEf=partes.reduce((s,p)=>s+(+p.ef||0),0);
  const totIm=partes.reduce((s,p)=>s+(+p.im||0),0);
  const kpis=[
    {l:'Hs Efectivas',v:totEf.toFixed(1)+'h',c:color},
    {l:'Hs Inoperativas',v:totIm.toFixed(1)+'h',c:'#ef4444'},
    {l:'Partes registrados',v:partes.length,c:'var(--muted)'},
    {l:'Días trabajados',v:Object.values(byDay).filter(v=>v.ef>0).length,c:'#10b981'}
  ];
  document.getElementById('ddChart').innerHTML=`
    <div style="display:flex;gap:.5rem;margin-bottom:1rem;flex-wrap:wrap">
      ${kpis.map(k=>`<div style="background:var(--panel2);border:1px solid var(--border);border-radius:6px;padding:.3rem .8rem;font-size:.75rem">
        ${k.l}: <strong style="color:${k.c}">${k.v}</strong>
      </div>`).join('')}
    </div>
    <div style="display:flex;gap:3px;overflow-x:auto;padding:1.8rem .3rem .3rem;min-height:${H+50}px">${bars||'<div style="color:var(--muted2);padding:2rem">Sin datos para este mes</div>'}</div>
    <div style="display:flex;gap:1.2rem;margin-top:.7rem">
      <span style="font-size:.7rem;color:var(--muted2);display:flex;align-items:center;gap:.35rem"><span style="display:inline-block;width:11px;height:11px;background:${color};border-radius:2px"></span>Hs Efectivas</span>
      <span style="font-size:.7rem;color:var(--muted2);display:flex;align-items:center;gap:.35rem"><span style="display:inline-block;width:11px;height:11px;background:#ef4444;border-radius:2px"></span>Hs Inoperativas</span>
    </div>`;
}

// ══ FLOTA DE EQUIPOS ══
function rFlotaEquipos(){
  const fTipo=document.getElementById('flotaFiltTipo')?.value||'';
  const eqs=fTipo?DB.equipos.filter(e=>e.tipo===fTipo):DB.equipos;
  // KPIs
  const total=eqs.length;
  const operativos=eqs.filter(e=>e.est==='Operativo'||e.est==='operativo').length;
  const inMant=eqs.filter(e=>e.est==='En Mantenimiento'||e.est==='Mantenimiento').length;
  const inop=eqs.filter(e=>e.est==='Inoperativo'||e.est==='inoperativo').length;
  const desmovilizados=eqs.filter(e=>e.est==='Desmovilizado').length;
  const kpiEl=document.getElementById('flotaKpis');
  if(kpiEl)kpiEl.innerHTML=[
    {l:'Total Equipos',v:total,c:'var(--ceq)'},
    {l:'Operativos',v:operativos,c:'#10b981'},
    {l:'En Mantenimiento',v:inMant,c:'#f59e0b'},
    {l:'Inoperativos',v:inop,c:'#ef4444'},
    {l:'Desmovilizados',v:desmovilizados,c:'#8b5cf6'},
  ].map(k=>`<div class="kpi" style="--kc:${k.c}"><div class="kpi-lbl">${k.l}</div><div class="kpi-val">${k.v}</div></div>`).join('');
  // Días para próximo mantenimiento
  const hoy=new Date();hoy.setHours(0,0,0,0);
  function diasParaMant(proxMant){
    if(!proxMant)return null;
    const d=new Date(proxMant+'T00:00:00');
    return Math.round((d-hoy)/(1000*60*60*24));
  }
  function diasBadge(dias){
    if(dias===null)return '<span style="color:var(--muted)">—</span>';
    if(dias<0)return `<span style="background:rgba(239,68,68,.2);color:#ef4444;border:1px solid #ef444440;border-radius:4px;padding:1px 7px;font-size:.7rem;font-weight:700">Vencido ${Math.abs(dias)}d</span>`;
    if(dias<=10)return `<span style="background:rgba(239,68,68,.15);color:#ef4444;border:1px solid #ef444440;border-radius:4px;padding:1px 7px;font-size:.7rem;font-weight:700">${dias} días</span>`;
    if(dias<=30)return `<span style="background:rgba(245,158,11,.15);color:#f59e0b;border:1px solid #f59e0b40;border-radius:4px;padding:1px 7px;font-size:.7rem;font-weight:700">${dias} días</span>`;
    return `<span style="background:rgba(16,185,129,.12);color:#10b981;border:1px solid #10b98140;border-radius:4px;padding:1px 7px;font-size:.7rem;font-weight:700">${dias} días</span>`;
  }
  // Tabla
  const sortedEqs=[...eqs].sort((a,b)=>(a.tipo||'').localeCompare(b.tipo||'')||(a.codigo||'').localeCompare(b.codigo||''));
  document.getElementById('tbFlota').innerHTML=sortedEqs.map(e=>{
    const dias=diasParaMant(e.proxMant);
    const lineaBadge=e.tipo?`<span class="badge" style="background:rgba(6,182,212,.15);color:var(--ceq);border:1px solid #06b6d440;font-size:.65rem">${e.tipo}</span>`:'';
    const subBadge=e.sub?`<span class="badge b-cyan" style="font-size:.62rem">${e.sub}</span>`:'';
    return`<tr>
      <td class="mono" style="color:var(--ceq);font-weight:600">${e.codigo}</td>
      <td><strong>${e.nombre}</strong></td>
      <td style="display:flex;gap:.3rem;flex-wrap:wrap;align-items:center">${lineaBadge}${subBadge}</td>
      <td class="mono">${e.placa||'<span style="color:var(--muted)">—</span>'}</td>
      <td>${bge(e.est)}</td>
      <td class="mono">${fmtN(e.hr)} ${e.tipo==='Línea Blanca'||e.tipo==='Vehículo Menor'?'km':'h'}</td>
      <td class="mono">${e.ultMant||'<span style="color:var(--muted)">—</span>'}</td>
      <td class="mono">${e.proxMant||'<span style="color:var(--muted)">—</span>'}</td>
      <td>${diasBadge(dias)}</td>
    </tr>`;
  }).join('');
}
