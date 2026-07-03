// ══ DAILY REPORT ══
function rDailyReport(){
  const elD=document.getElementById('drFecha');
  if(elD&&!elD.value)elD.value=today();
  const fecha=elD?elD.value:today();

  // Proyectos (solo DB.proyectos, no frentes)
  const drProyEl=document.getElementById('drProy');
  if(drProyEl){
    const curP=drProyEl.value;
    drProyEl.innerHTML='<option value="">— Todos los proyectos —</option>'+
      (DB.proyectos||[]).map(p=>`<option value="${p.codigo}"${p.codigo===curP?' selected':''}>[${p.codigo}] ${p.nombre}</option>`).join('');
    if(curP)drProyEl.value=curP;
  }
  const proy=drProyEl?drProyEl.value:'';

  // Inicio fijo (proyecto) – se lee del campo pero siempre tiene valor por defecto
  const iniEl=document.getElementById('drInicio');
  if(iniEl&&!iniEl.value)iniEl.value='2026-06-01';
  const inicio=iniEl?iniEl.value:'2026-06-01';

  // Fecha de corte (acumulado equipos + personal) – default día 20 del mes actual
  const corteEl=document.getElementById('drCorte');
  if(corteEl&&!corteEl.value){
    const _n=new Date();
    corteEl.value=`${_n.getFullYear()}-${String(_n.getMonth()+1).padStart(2,'0')}-20`;
  }
  const corte=corteEl?corteEl.value:fecha;

  // Días ejecutados (desde inicio hasta la fecha del reporte diario)
  let diasEjec=1;
  if(inicio&&fecha>=inicio){const d1=new Date(inicio+'T12:00:00'),d2=new Date(fecha+'T12:00:00');diasEjec=Math.max(1,Math.round((d2-d1)/86400000)+1);}
  // Días en período de corte
  let diasCorte=1;
  if(inicio&&corte>=inicio){const d1=new Date(inicio+'T12:00:00'),d2=new Date(corte+'T12:00:00');diasCorte=Math.max(1,Math.round((d2-d1)/86400000)+1);}
  const corteFmt=corte?new Date(corte+'T12:00:00').toLocaleDateString('es-PE',{day:'2-digit',month:'2-digit',year:'numeric'}):'';

  // Header
  const fechaDisp=new Date(fecha+'T12:00:00').toLocaleDateString('es-PE',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
  const hEl=document.getElementById('drHeader');
  const proyNomDR=proy?(DB.proyectos||[]).find(p=>p.codigo===proy)?.nombre||proy:'REPORTE GENERAL';
  if(hEl)hEl.innerHTML=`
    <div style="background:linear-gradient(135deg,#052e16,#064e3b);border:1px solid #10b98125;border-radius:10px;padding:.9rem 1.3rem;display:flex;justify-content:space-between;align-items:center;gap:1rem">
      <div style="flex:1">
        <div style="font-size:.58rem;letter-spacing:.18em;color:#10b981;text-transform:uppercase;margin-bottom:.2rem">DAILY REPORT – D.R.</div>
        <div style="font-size:1rem;font-weight:800;color:#fff;line-height:1.3">${proyNomDR}</div>
        <div style="font-size:.75rem;color:#94a3b8;margin-top:.3rem;text-transform:capitalize">${fechaDisp}</div>
      </div>
      <div style="display:flex;gap:1.2rem;align-items:center;flex-shrink:0">
        <div style="text-align:center">
          <div style="font-size:.52rem;color:#94a3b8;text-transform:uppercase;letter-spacing:.08em">Días Ejecutados</div>
          <div style="font-size:2.8rem;font-weight:900;color:#10b981;line-height:1">${diasEjec}</div>
          <div style="font-size:.55rem;color:#475569">desde ${new Date(inicio+'T12:00:00').toLocaleDateString('es-PE',{day:'2-digit',month:'2-digit'})}</div>
        </div>
        <div style="width:1px;height:48px;background:#10b98130"></div>
        <div style="text-align:center">
          <div style="font-size:.52rem;color:#f59e0b;text-transform:uppercase;letter-spacing:.08em">Período de Corte</div>
          <div style="font-size:2.8rem;font-weight:900;color:#f59e0b;line-height:1">${diasCorte}</div>
          <div style="font-size:.55rem;color:#475569">hasta ${corteFmt}</div>
        </div>
      </div>
    </div>`;

  // Tareaje del día
  let tarDia=(DB.tareaje||[]).filter(r=>r.fecha===fecha);
  if(proy)tarDia=tarDia.filter(r=>!r.proy||r.proy===proy);

  // Mapa directo: p.cat → grupo de tabla
  const _catMap={
    'Operador LA':'opLA','Operador LB':'opLA',
    'Conductor VM':'condEM',
    'Personal Piso':'MOD',
    'SSOMA':'MOI','PCO':'MOI','Administrativo':'MOI','Operaciones':'MOI'
  };
  // Fallback por cargo cuando p.cat no coincide con ningún valor conocido
  const _catFallback=cargo=>{
    const c=(cargo||'').toUpperCase();
    if(/\bOP\.?\s*(VOLQUETE|RODILLO|RETROEX|MOTONIL|EXCAVAD|CARGAD|TRACTOR|BULLDOZER|COMPACTAD)/i.test(c))return'opLA';
    if(/(CISTERNA|COASTER|CAMIONETA|CONDUCTOR|COND\.)/i.test(c))return'condEM';
    if(/(^OPERARIO|PEÓN|^PEON|OFICIAL\s+DE\s+MOV|SUP\.?\s*TEC)/i.test(c))return'MOD';
    return null;
  };
  // Orden canónico de tipos
  const _TIPO_ORDER=['DL','TD','TN','DLT','A5','P','F','DM','LP','LM','LF','V','R'];

  const groups={MOI:{},MOD:{},opLA:{},condEM:{}};
  tarDia.forEach(r=>{
    const pers=(DB.personal||[]).find(p=>p.id===r.personalId);if(!pers)return;
    const cat=_catMap[pers.cat]||_catFallback(pers.cargo);
    if(!cat)return;
    if(!groups[cat][pers.cargo])groups[cat][pers.cargo]={};
    const t=r.tipo;if(t){groups[cat][pers.cargo][t]=(groups[cat][pers.cargo][t]||0)+1;}
  });

  // Cols dinámicos: solo los tipos que realmente ocurrieron en cada grupo
  const _dynCols=data=>{
    const present=new Set();
    Object.values(data).forEach(v=>Object.keys(v).forEach(k=>{if(v[k]>0)present.add(k);}));
    return _TIPO_ORDER.filter(t=>present.has(t));
  };

  // Tabla de personal
  const _persTable=(title,data,color)=>{
    const cols=_dynCols(data);
    const rows=Object.entries(data).filter(([,v])=>Object.values(v).some(n=>n>0));
    const tot={};cols.forEach(c=>tot[c]=0);
    rows.forEach(([,v])=>cols.forEach(c=>tot[c]+=(v[c]||0)));
    const grand=cols.reduce((s,c)=>s+tot[c],0);
    return`<div style="background:var(--panel2);border:1px solid var(--border);border-radius:8px;overflow:hidden">
      <div style="background:${color}18;border-bottom:1px solid ${color}28;padding:.33rem .65rem">
        <div style="font-size:.59rem;font-weight:700;color:${color};text-transform:uppercase;letter-spacing:.09em">${title}</div>
      </div>
      <table style="width:100%;border-collapse:collapse;font-size:.63rem">
        <thead><tr style="background:${color}10">
          <th style="padding:.25rem .5rem;text-align:left;color:var(--muted2);font-size:.56rem">CARGO</th>
          ${cols.map(c=>`<th style="padding:.25rem .35rem;text-align:center;color:${color};font-size:.58rem">${c}</th>`).join('')}
          <th style="padding:.25rem .35rem;text-align:center;color:#f59e0b;font-size:.58rem">Tot.</th>
        </tr></thead>
        <tbody>${rows.length?rows.map(([cargo,v])=>{const t=cols.reduce((s,c)=>s+(v[c]||0),0);return`<tr style="border-bottom:1px solid var(--border)20">
          <td style="padding:.23rem .5rem;color:var(--text)">${cargo}</td>
          ${cols.map(c=>`<td style="padding:.23rem .35rem;text-align:center;color:${(v[c]||0)?'var(--text)':'#334155'}">${v[c]||''}</td>`).join('')}
          <td style="padding:.23rem .35rem;text-align:center;font-weight:700;color:#f59e0b">${t}</td>
        </tr>`;}).join(''):`<tr><td colspan="${cols.length+2}" style="padding:.5rem;text-align:center;color:var(--muted2);font-size:.6rem">Sin registros</td></tr>`}</tbody>
        ${rows.length?`<tfoot><tr style="background:${color}10;font-weight:700">
          <td style="padding:.25rem .5rem;color:${color};font-size:.59rem">Total</td>
          ${cols.map(c=>`<td style="padding:.25rem .35rem;text-align:center;color:${color};font-size:.59rem">${tot[c]||''}</td>`).join('')}
          <td style="padding:.25rem .35rem;text-align:center;color:#f59e0b;font-size:.59rem">${grand}</td>
        </tr></tfoot>`:''}
      </table>
    </div>`;
  };
  const _el=n=>document.getElementById(n);
  if(_el('drTableMOI'))_el('drTableMOI').innerHTML=_persTable('Personal M.O. Indirecta',groups.MOI,'#645fef');
  if(_el('drTableMOD'))_el('drTableMOD').innerHTML=_persTable('Personal M.O. Directa',groups.MOD,'#dc5049cb');
  if(_el('drTableOpLA'))_el('drTableOpLA').innerHTML=_persTable('Operadores L. Amarilla y Volquetes',groups.opLA,'#f59e0b');
  if(_el('drTableCondEM'))_el('drTableCondEM').innerHTML=_persTable('Conductores Equip. Menores',groups.condEM,'#06b6d4');

  // PT Summary — calculado desde groups para coincidir con las tablas
  const ptCount={};
  Object.values(groups).forEach(grp=>Object.values(grp).forEach(tipos=>Object.entries(tipos).forEach(([t,n])=>{ptCount[t]=(ptCount[t]||0)+n;})));
  const ptTotal=Object.values(ptCount).reduce((s,v)=>s+v,0);
  const _TIPO_LBL={DL:'P.T. Libre',TD:'P.T. Día',TN:'P.T. Noche',A5:'Anexo 5',P:'Permiso',F:'Falta',DM:'Descanso M.',DLT:'DL c/Trabajo',LP:'Lic. Paternidad',LM:'Lic. Maternidad',LF:'Lic. Fallecim.',V:'Vacaciones',R:'Retiro'};
  const _TIPO_COL={DL:'#ef4444',TD:'#f59e0b',TN:'#8b5cf6',A5:'#06b6d4',P:'#10b981',F:'#dc2626',DM:'#64748b',DLT:'#0ea5e9',LP:'#ec4899',LM:'#ec4899',LF:'#475569',V:'#14b8a6',R:'#f97316'};
  const ptItems=_TIPO_ORDER.filter(t=>ptCount[t]>0).map(t=>({l:_TIPO_LBL[t]||t,v:ptCount[t],c:_TIPO_COL[t]||'#94a3b8'}));
  if(_el('drSummary'))_el('drSummary').innerHTML=`<div style="display:flex;gap:.5rem;flex-wrap:wrap">
    ${[...ptItems,{l:'Total',v:ptTotal,c:'#10b981'}]
    .map(k=>`<div style="background:var(--panel2);border:1px solid var(--border);border-bottom:3px solid ${k.c};border-radius:8px;padding:.45rem .9rem;min-width:85px;flex:1;text-align:center">
      <div style="font-size:.58rem;text-transform:uppercase;letter-spacing:.07em;color:var(--muted2)">${k.l}</div>
      <div style="font-size:2rem;font-weight:900;color:${k.c};line-height:1.1">${k.v}</div>
    </div>`).join('')}
  </div>`;

  // Equipos del día (Línea Amarilla + Línea Blanca filtrados por proyecto del equipo)
  const eqsLA=(DB.equipos||[]).filter(e=>(e.tipo==='Línea Amarilla'||e.tipo==='Línea Blanca')&&(!proy||!e.proyecto||e.proyecto===proy));
  let partesLA=(DB.partes||[]).filter(p=>p.fecha===fecha&&eqsLA.some(e=>e.id===p.eqId));
  // Helper: horas efectivas con factor de uso del equipo
  const _efFU=p=>{const eq=(DB.equipos||[]).find(e=>e.id===p.eqId);const fu=(eq&&eq.factorUso>0)?eq.factorUso:1;return(+p.ef||0)*fu;};

  if(_el('tbDREquipos')){
    _el('tbDREquipos').innerHTML=!partesLA.length
      ?'<tr><td colspan="9" style="text-align:center;padding:1rem;color:var(--muted2);font-size:.7rem">Sin partes de equipo registrados para esta fecha.</td></tr>'
      :partesLA.map(p=>{
        const eq=(DB.equipos||[]).find(e=>e.id===p.eqId);
        const ef=+p.ef||0;
        const cC=(p.condicion||'').toUpperCase().includes('INOP')?'#ef4444':(p.condicion||'').toUpperCase().includes('STBY')||p.condicion==='STBY'?'#f59e0b':'#10b981';
        return`<tr>
          <td class="mono" style="color:var(--ceq);font-weight:700">${eq?eq.codigo:'—'}</td>
          <td style="color:${cC};font-size:.62rem;font-weight:700">${(p.condicion||'OP').substring(0,4).toUpperCase()}</td>
          <td class="mono" style="font-weight:700;color:#10b981">${ef>0?parseFloat(ef.toFixed(3))+'h':'—'}</td>
          <td><span class="badge b-blue" style="font-size:.58rem">${p.turno||'—'}</span></td>
          <td style="max-width:110px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${p.areaT||''}">${p.areaT||'—'}</td>
          <td style="max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${p.frenteT||''}">${p.frenteT||'—'}</td>
          <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${p.act||''}">${p.act||'—'}</td>
          <td class="mono" style="color:var(--muted2);font-size:.65rem">${+p.hrIni>0?parseFloat((+p.hrIni).toFixed(1)):'—'}</td>
          <td class="mono" style="color:var(--muted2);font-size:.65rem">${+p.hrFin>0?parseFloat((+p.hrFin).toFixed(1)):'—'}</td>
        </tr>`;
      }).join('');
  }

  // Helper: barra horizontal
  const _barH=(cid,items,color)=>{
    const cel=_el(cid);if(!cel)return;
    if(!items.length){cel.innerHTML='<div style="color:var(--muted2);font-size:.7rem;padding:.4rem">Sin datos</div>';return;}
    const maxV=Math.max(...items.map(i=>i.v),0.1);const H=90;
    cel.innerHTML=`<div style="display:flex;gap:3px;align-items:flex-end;overflow-x:auto;padding-top:18px;min-height:${H+30}px">
      ${items.map(i=>{const bH=Math.max(4,Math.round((i.v/maxV)*H));return`<div style="flex:1;min-width:30px;max-width:65px;text-align:center">
        <div style="font-size:.5rem;color:${color};margin-bottom:2px">${i.v.toFixed(1)}</div>
        <div style="height:${bH}px;background:${color};border-radius:3px 3px 0 0;margin:0 auto;max-width:36px"></div>
        <div style="font-size:.49rem;color:var(--muted2);margin-top:3px;word-break:break-all;line-height:1.2">${i.l}</div>
      </div>`;}).join('')}
    </div>`;
  };

  // Chart 1: Horas por turno
  const byTurno={};
  partesLA.forEach(p=>{const t=p.turno||'DIA';if(!byTurno[t])byTurno[t]=0;byTurno[t]+=_efFU(p);});
  const totHs=Object.values(byTurno).reduce((s,v)=>s+v,0);
  if(_el('drChartTurnoBody')){
    if(!Object.keys(byTurno).length){_el('drChartTurnoBody').innerHTML='<div style="color:var(--muted2);font-size:.7rem">Sin datos</div>';}
    else{_el('drChartTurnoBody').innerHTML=`
      <div style="text-align:center;margin-bottom:.6rem">
        <div style="font-size:2.2rem;font-weight:900;color:#10b981;line-height:1">${totHs.toFixed(1)}</div>
        <div style="font-size:.58rem;color:var(--muted2)">${Object.entries(byTurno).map(([t,v])=>`${v.toFixed(1)}h ${t}`).join(' · ')}</div>
      </div>
      <div style="display:flex;gap:.4rem;flex-wrap:wrap">
        ${Object.entries(byTurno).map(([t,v])=>`<div style="flex:1;background:#10b98115;border:1px solid #10b98128;border-radius:6px;padding:.35rem .6rem;text-align:center">
          <div style="font-size:.58rem;color:var(--muted2)">${t}</div>
          <div style="font-size:1rem;font-weight:800;color:#10b981">${v.toFixed(1)}h</div>
          <div style="font-size:.54rem;color:#64748b">${totHs>0?Math.round(v/totHs*100):0}%</div>
        </div>`).join('')}
      </div>`;}
  }

  // Chart 2: Horas por código del día
  const byCod={};
  partesLA.forEach(p=>{const eq=(DB.equipos||[]).find(e=>e.id===p.eqId);const k=eq?eq.codigo:'?';if(!byCod[k])byCod[k]=0;byCod[k]+=_efFU(p);});
  _barH('drChartCodigoBody',Object.entries(byCod).map(([l,v])=>({l,v})),'#06b6d4');

  // Chart 3: Promedio horas por tipo de equipo
  const byTipo={},byTipoCnt={};
  partesLA.forEach(p=>{const eq=(DB.equipos||[]).find(e=>e.id===p.eqId);const k=eq?eq.sub||eq.tipo||'?':'?';if(!byTipo[k]){byTipo[k]=0;byTipoCnt[k]=0;}byTipo[k]+=_efFU(p);byTipoCnt[k]++;});
  _barH('drChartTipoBody',Object.entries(byTipo).map(([l,v])=>({l,v:byTipoCnt[l]>0?parseFloat((v/byTipoCnt[l]).toFixed(2)):0})),'#f59e0b');

  // Chart 4: Horas acumuladas (inicio → corte)
  const partesAcum=(DB.partes||[]).filter(p=>{
    const eq=(DB.equipos||[]).find(e=>e.id===p.eqId);
    if(!eq||eq.tipo!=='Línea Amarilla'&&eq.tipo!=='Línea Blanca')return false;
    if(proy&&eq.proyecto&&eq.proyecto!==proy)return false;
    if(inicio&&p.fecha<inicio)return false;
    return p.fecha<=(corte||fecha);
  });
  const byAcum={};
  partesAcum.forEach(p=>{const eq=(DB.equipos||[]).find(e=>e.id===p.eqId);const k=eq?eq.codigo:'?';if(!byAcum[k])byAcum[k]=0;byAcum[k]+=_efFU(p);});
  _barH('drChartAcumBody',Object.entries(byAcum).sort((a,b)=>b[1]-a[1]).slice(0,10).map(([l,v])=>({l,v:parseFloat(v.toFixed(2))})),'#8b5cf6');

  // Vehículos Menores
  const eqsVM=(DB.equipos||[]).filter(e=>e.tipo==='Vehículo Menor');
  const partesVM=(DB.partes||[]).filter(p=>p.fecha===fecha&&eqsVM.some(e=>e.id===p.eqId));
  if(_el('tbDRVehMen')){
    const srcVM=partesVM.length?partesVM:eqsVM.slice(0,6);
    _el('tbDRVehMen').innerHTML=!srcVM.length
      ?'<tr><td colspan="4" style="text-align:center;color:var(--muted2);padding:.5rem;font-size:.63rem">Sin registros</td></tr>'
      :srcVM.map(item=>{const eq=partesVM.length?(DB.equipos||[]).find(e=>e.id===item.eqId):item;
        return`<tr style="border-bottom:1px solid var(--border)20">
          <td style="padding:.25rem .5rem;font-size:.64rem">${eq?eq.sub||eq.nombre.split(' ')[0]:'—'}</td>
          <td style="padding:.25rem .5rem;font-size:.63rem;font-family:monospace;color:var(--ceq)">${eq?(eq.placa||eq.codigo):'—'}</td>
          <td style="padding:.25rem .5rem">${bge(partesVM.length?(item.condicion||eq?.est||'—'):(eq?.est||'—'))}</td>
          <td style="padding:.25rem .5rem;font-size:.63rem">${partesVM.length?(item.turno||'—'):'—'}</td>
        </tr>`;}).join('');
  }

  // Equipos Menores
  const eqsEM=(DB.equipos||[]).filter(e=>e.tipo==='Equipos Menores');
  const partesEM=(DB.partes||[]).filter(p=>p.fecha===fecha&&eqsEM.some(e=>e.id===p.eqId));
  if(_el('tbDREqMen')){
    const srcEM=partesEM.length?partesEM:eqsEM.slice(0,6);
    _el('tbDREqMen').innerHTML=!srcEM.length
      ?'<tr><td colspan="3" style="text-align:center;color:var(--muted2);padding:.5rem;font-size:.63rem">Sin registros</td></tr>'
      :srcEM.map(item=>{const eq=partesEM.length?(DB.equipos||[]).find(e=>e.id===item.eqId):item;
        return`<tr style="border-bottom:1px solid var(--border)20">
          <td style="padding:.25rem .5rem;font-size:.64rem">${eq?eq.sub||eq.nombre.split(' ')[0]:'—'}</td>
          <td style="padding:.25rem .5rem;font-size:.63rem;font-family:monospace;color:var(--ceq)">${eq?eq.codigo:'—'}</td>
          <td style="padding:.25rem .5rem">${bge(partesEM.length?(item.condicion||eq?.est||'—'):(eq?.est||'—'))}</td>
        </tr>`;}).join('');
  }

  // Gráfico Equipos Menores
  if(_el('drChartEqMenBody')){
    const bySubEM={};
    const srcGEM=partesEM.length?partesEM:eqsEM;
    srcGEM.forEach(item=>{const eq=partesEM.length?(DB.equipos||[]).find(e=>e.id===item.eqId):item;const k=eq?eq.sub||eq.nombre.split(' ')[0]:'Otros';if(!bySubEM[k])bySubEM[k]=0;bySubEM[k]++;});
    const maxEM=Math.max(...Object.values(bySubEM),1);
    _el('drChartEqMenBody').innerHTML=!Object.keys(bySubEM).length
      ?'<div style="color:var(--muted2);font-size:.7rem">Sin datos</div>'
      :`<div style="display:flex;flex-direction:column;gap:.38rem">
        ${Object.entries(bySubEM).map(([k,v])=>`<div>
          <div style="display:flex;justify-content:space-between;font-size:.6rem;margin-bottom:2px">
            <span style="color:var(--muted2)">${k}</span><span style="color:#06b6d4;font-weight:700">${v}</span>
          </div>
          <div style="height:7px;background:#06b6d415;border-radius:4px;overflow:hidden">
            <div style="height:100%;width:${Math.round(v/maxEM*100)}%;background:#06b6d4;border-radius:4px"></div>
          </div>
        </div>`).join('')}
      </div>`;
  }

  // Observaciones
  if(_el('drObsBody')){
    const obsItems=[...partesLA,...partesVM,...partesEM].filter(p=>p.observaciones&&p.observaciones.trim());
    _el('drObsBody').innerHTML=obsItems.length
      ?obsItems.map(p=>{const eq=(DB.equipos||[]).find(e=>e.id===p.eqId);return`<div style="display:flex;gap:.6rem;padding:.28rem 0;border-bottom:1px solid var(--border)20;font-size:.71rem"><span class="mono" style="color:var(--ceq);font-weight:700;min-width:65px;flex-shrink:0">${eq?eq.codigo:''}</span><span>${p.observaciones}</span></div>`;}).join('')
      :'<div style="color:var(--muted2);font-size:.72rem">Sin observaciones registradas para esta fecha.</div>';
  }

  // ── MATCH EQUIPOS / OPERADORES EN OBRA ──
  const matchEl=_el('drMatchBody');
  if(matchEl){
    const eqsActivos=(DB.equipos||[]).filter(e=>e.est==='Operativo'&&(!proy||!e.proyecto||e.proyecto===proy));
    const opsHoyIds=new Set(tarDia.filter(r=>['TD','TN','A5','DLT'].includes(r.tipo)).map(r=>r.personalId));
    const opsHoy=(DB.personal||[]).filter(p=>opsHoyIds.has(p.id));
    const eqBySub={};
    eqsActivos.forEach(e=>{
      const k=(e.sub||'').trim()||(e.nombre||'').split(' ').slice(0,2).join(' ')||'—';
      eqBySub[k]=(eqBySub[k]||0)+1;
    });
    const _eqIco=sub=>{
      const s=(sub||'').toLowerCase();
      if(s.includes('volquete'))return{i:'🚛',c:'#f59e0b'};
      if(s.includes('retroex'))return{i:'⛏️',c:'#8b5cf6'};
      if(s.includes('excavad'))return{i:'🏗️',c:'#ef4444'};
      if(s.includes('motonil'))return{i:'🚧',c:'#06b6d4'};
      if(s.includes('rodillo'))return{i:'🛞',c:'#84cc16'};
      if(s.includes('cargad'))return{i:'🚜',c:'#10b981'};
      if(s.includes('bulldoz')||s.includes('tractor'))return{i:'🚜',c:'#f97316'};
      if(s.includes('combustib'))return{i:'⛽',c:'#dc2626'};
      if(s.includes('cistern')||s.includes('agua'))return{i:'🚰',c:'#3b82f6'};
      if(s.includes('compact'))return{i:'🛞',c:'#6b7280'};
      if(s.includes('coaster'))return{i:'🚌',c:'#a78bfa'};
      if(s.includes('camionet'))return{i:'🚙',c:'#fb923c'};
      if(s.includes('camion'))return{i:'🚚',c:'#64748b'};
      return{i:'🔧',c:'#94a3b8'};
    };
    const matchRows=Object.entries(eqBySub).map(([sub,eqCnt])=>{
      const opCnt=opsHoy.filter(p=>(p.cargo||'').toLowerCase().includes(sub.toLowerCase())).length;
      return{sub,eqCnt,opCnt,diff:opCnt-eqCnt};
    }).sort((a,b)=>a.sub.localeCompare(b.sub));
    const _icoRow=(ico,n,col)=>{
      const s=Math.min(n,7);
      const extra=n>7?`<span style="font-size:.58rem;color:${col};font-weight:700">+${n-7}</span>`:'';
      return Array(s).fill(`<span style="font-size:1rem">${ico}</span>`).join('')+extra+
        `<span style="font-size:.95rem;font-weight:800;color:${col};margin-left:4px">${n}</span>`;
    };
    matchEl.innerHTML=!matchRows.length
      ?'<div style="color:var(--muted2);font-size:.75rem">Sin equipos activos en el maestro.</div>'
      :`<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:.5rem">
        ${matchRows.map(({sub,eqCnt,opCnt,diff})=>{
          const{i,c}=_eqIco(sub);
          const st=diff===0
            ?{lbl:'✅ Completo',bd:'#10b981',bg:'rgba(16,185,129,.07)'}
            :diff<0
            ?{lbl:`🔴 Falta ${Math.abs(diff)} op.`,bd:'#ef4444',bg:'rgba(239,68,68,.07)'}
            :{lbl:`🟡 Sobran ${diff} op.`,bd:'#f59e0b',bg:'rgba(245,158,11,.07)'};
          return`<div style="border:2px solid ${st.bd};border-radius:10px;padding:.6rem .75rem;background:${st.bg}">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.45rem">
              <span style="font-size:.7rem;font-weight:700;color:var(--text)">${i} ${sub.toUpperCase()}</span>
              <span style="font-size:.55rem;font-weight:700;color:${st.bd};white-space:nowrap">${st.lbl}</span>
            </div>
            <div style="display:grid;grid-template-columns:1fr auto 1fr;gap:.3rem;align-items:center">
              <div style="text-align:center;padding:.3rem .4rem;background:${c}18;border-radius:6px">
                <div style="font-size:.5rem;color:${c};font-weight:600;text-transform:uppercase;margin-bottom:2px">Equipos</div>
                <div>${_icoRow(i,eqCnt,c)}</div>
              </div>
              <div style="font-size:.65rem;color:var(--muted2);text-align:center;font-weight:600">vs</div>
              <div style="text-align:center;padding:.3rem .4rem;background:#f59e0b18;border-radius:6px">
                <div style="font-size:.5rem;color:#d97706;font-weight:600;text-transform:uppercase;margin-bottom:2px">Operadores</div>
                <div>${opCnt?_icoRow('👷',opCnt,'#f59e0b'):'<span style="font-size:.6rem;color:#ef4444">Sin op.</span>'}</div>
              </div>
            </div>
          </div>`;
        }).join('')}
      </div>`;
  }
}

function printDailyReport(){
  const _fix=h=>(h||'')
    .replace(/var\(--border\)/g,'#94a3b8').replace(/var\(--muted2\)/g,'#475569')
    .replace(/var\(--panel2\)/g,'#f1f5f9').replace(/var\(--text\)/g,'#111')
    .replace(/var\(--ceq\)/g,'#0891b2').replace(/var\(--muted\)/g,'#64748b')
    .replace(/var\(--border\)20/g,'rgba(148,163,184,.13)').replace(/var\(--border\)28/g,'rgba(148,163,184,.17)')
    .replace(/ondblclick="[^"]*"/g,'').replace(/onclick="[^"]*"/g,'');
  const g=id=>{const e=document.getElementById(id);return e?_fix(e.innerHTML):'';};
  const fecha=(document.getElementById('drFecha')||{}).value||today();
  const proy=(document.getElementById('drProy')||{}).value||'';

  const body=`
    ${_fix(document.getElementById('drHeader')?.outerHTML||'')}
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:.5rem;margin:.6rem 0">
      ${g('drTableMOI')}${g('drTableMOD')}${g('drTableOpLA')}${g('drTableCondEM')}
    </div>
    ${_fix(document.getElementById('drSummary')?.innerHTML||'')}
    <div style="border:1px solid #94a3b8;border-radius:7px;overflow:hidden;margin:.6rem 0">
      <div style="background:#1e3a5f;color:#fff;padding:.35rem .7rem;font-size:.68rem;font-weight:700">Horas Trabajadas por Código de Equipo y Turno del Día</div>
      <table style="width:100%;border-collapse:collapse;font-size:.65rem">
        <thead><tr style="background:#dce7f3;font-size:.58rem;text-transform:uppercase">
          <th style="padding:.28rem .45rem;text-align:left">Código</th><th style="padding:.28rem .35rem">Cond.</th><th style="padding:.28rem .35rem">Horas</th><th style="padding:.28rem .35rem">Turno</th>
          <th style="padding:.28rem .35rem">Área de Trabajo</th><th style="padding:.28rem .35rem">Frente de Trabajo</th><th style="padding:.28rem .35rem">Descripción de Actividades</th>
          <th style="padding:.28rem .35rem">Hr Ini</th><th style="padding:.28rem .35rem">Hr Fin</th>
        </tr></thead>
        <tbody>${_fix(document.getElementById('tbDREquipos')?.innerHTML||'')}</tbody>
      </table>
    </div>
    <div style="display:grid;grid-template-columns:1fr 2fr;gap:.5rem;margin:.6rem 0">
      <div style="border:1px solid #94a3b8;border-radius:7px;padding:.55rem"><div style="font-size:.63rem;font-weight:700;margin-bottom:.4rem;color:#334155">Horas por Turno</div>${g('drChartTurnoBody')}</div>
      <div style="border:1px solid #94a3b8;border-radius:7px;padding:.55rem"><div style="font-size:.63rem;font-weight:700;margin-bottom:.4rem;color:#334155">Horas por Código de Equipo – Día</div>${g('drChartCodigoBody')}</div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:.5rem;margin:.6rem 0">
      <div style="border:1px solid #94a3b8;border-radius:7px;padding:.55rem"><div style="font-size:.63rem;font-weight:700;margin-bottom:.4rem;color:#334155">Hs Promedio por Tipo de Equipo</div>${g('drChartTipoBody')}</div>
      <div style="border:1px solid #94a3b8;border-radius:7px;padding:.55rem"><div style="font-size:.63rem;font-weight:700;margin-bottom:.4rem;color:#334155">Horas Acumuladas por Código (Inicio → Corte)</div>${g('drChartAcumBody')}</div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:.5rem;margin:.6rem 0">
      <div style="border:1px solid #94a3b8;border-radius:7px;overflow:hidden">
        <div style="background:#dce7f3;padding:.28rem .55rem;font-size:.6rem;font-weight:700">Vehículos Menores</div>
        <table style="width:100%;border-collapse:collapse;font-size:.6rem"><thead><tr style="background:#f1f5f9"><th style="padding:.22rem .4rem;text-align:left">Tipo</th><th>Placa</th><th>Cond.</th><th>Turno</th></tr></thead>
        <tbody>${_fix(document.getElementById('tbDRVehMen')?.innerHTML||'')}</tbody></table>
      </div>
      <div style="border:1px solid #94a3b8;border-radius:7px;overflow:hidden">
        <div style="background:#dce7f3;padding:.28rem .55rem;font-size:.6rem;font-weight:700">Equipos Menores</div>
        <table style="width:100%;border-collapse:collapse;font-size:.6rem"><thead><tr style="background:#f1f5f9"><th style="padding:.22rem .4rem;text-align:left">Tipo</th><th>Código</th><th>Cond.</th></tr></thead>
        <tbody>${_fix(document.getElementById('tbDREqMen')?.innerHTML||'')}</tbody></table>
      </div>
      <div style="border:1px solid #94a3b8;border-radius:7px;padding:.55rem"><div style="font-size:.6rem;font-weight:700;margin-bottom:.35rem">Gráfico Equipos Menores</div>${g('drChartEqMenBody')}</div>
    </div>
    <div style="border:1px solid #94a3b8;border-radius:7px;padding:.65rem;margin:.6rem 0">
      <div style="font-size:.63rem;font-weight:700;margin-bottom:.35rem">Comentarios / Observaciones</div>
      ${g('drObsBody')}
    </div>
    <div style="border:1px solid #94a3b8;border-radius:7px;padding:.65rem;margin:.6rem 0">
      <div style="font-size:.63rem;font-weight:700;margin-bottom:.45rem">⚖️ Match Equipos / Operadores en Obra</div>
      <div style="font-size:.6rem;color:#475569">${g('drMatchBody')}</div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:.8rem;margin-top:.9rem">
      ${['C. de Proyectos – ECOSERMO','Residente o Super. – ECOSERMO','Representante Sponsor – BUENAVENTURA']
        .map(l=>`<div style="border:1px solid #94a3b8;border-radius:6px;padding:.9rem;text-align:center">
          <div style="height:38px;border-bottom:1px solid #94a3b8;margin-bottom:.4rem"></div>
          <div style="font-size:.58rem;color:#475569;text-transform:uppercase">${l}</div>
        </div>`).join('')}
    </div>`;

  const w=window.open('','_blank','width=1200,height=900');
  w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8">
    <title>Daily Report – ${fecha}${proy?' – '+proy:''}</title>
    <style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Segoe UI',Arial,sans-serif;background:#fff;color:#111;padding:1cm;font-size:9pt}
    table{border-collapse:collapse;width:100%}th,td{border:1px solid #94a3b8;padding:3px 5px}th{background:#dce7f3;font-weight:700}
    .badge{display:inline-block;padding:1px 5px;border-radius:3px;font-size:.58rem;font-weight:700}
    .b-green{background:#dcfce7;color:#166534}.b-red{background:#fee2e2;color:#991b1b}
    .b-yellow{background:#fef9c3;color:#854d0e}.b-blue{background:#dbeafe;color:#1e40af}
    .b-cyan{background:#cffafe;color:#155e75}.mono{font-family:'Consolas',monospace}
    @media print{body{padding:.5cm}@page{size:A4 landscape;margin:.8cm}}</style>
  </head><body>${body}</body></html>`);
  w.document.close();
  setTimeout(()=>w.print(),900);
}
