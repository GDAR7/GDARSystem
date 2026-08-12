// ══ DASHBOARD DE EQUIPOS + REPORTE DE EQUIPOS ══
// (separado de auxmec.js — usa helpers globales de utils.js/config.js)

// ══ DASHBOARD EQUIPOS (estilo Power BI, como el dashboard de Combustible) ══
// Filtros en cascada por chips: Tipo → Subtipo → Código · período 21→20 navegable
let _deqOffset=0,_deqTipo=null,_deqSub=null,_deqEqId=null,_deqChart=null;
function _deqSelTipo(t){
  if(_deqTipo===t){_deqTipo=null;_deqSub=null;_deqEqId=null;}
  else{_deqTipo=t;_deqSub=null;_deqEqId=null;}
  rDashEquipos();
}
function _deqSelSub(s){
  if(_deqSub===s){_deqSub=null;_deqEqId=null;}
  else{_deqSub=s;_deqEqId=null;}
  rDashEquipos();
}
function _deqSelEq(id){
  _deqEqId=_deqEqId===id?null:id;
  rDashEquipos();
}
function _deqNav(dir){_deqOffset+=dir;rDashEquipos();}
// Período 21→20 (mismo esquema que el dashboard de Combustible)
function _deqPeriodo(){
  const hoy=new Date();
  const d=hoy.getDate(),m=hoy.getMonth(),y=hoy.getFullYear();
  let baseY=y,baseM=m;
  if(d<21){baseM=m-1;if(baseM<0){baseM=11;baseY=y-1;}}
  let iniM=baseM+_deqOffset,iniY=baseY;
  while(iniM>11){iniM-=12;iniY++;}
  while(iniM<0){iniM+=12;iniY--;}
  const ini=new Date(iniY,iniM,21);
  const fin=new Date(iniY,iniM+1,20);
  const fmtD=x=>`${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}-${String(x.getDate()).padStart(2,'0')}`;
  const MESES=['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  return{desde:fmtD(ini),hasta:fmtD(fin),ini,fin,label:`${MESES[fin.getMonth()]} ${fin.getFullYear()}`,dias:Math.round((fin-ini)/86400000)+1};
}

function rDashEquipos(){
  const el=document.getElementById('page-dashEquipos');if(!el)return;
  const per=_deqPeriodo();
  const eqById=id=>(DB.equipos||[]).find(e=>e.id===id);
  const fmt1=v=>Number(v||0).toLocaleString('es-PE',{maximumFractionDigits:1});

  // Partes del período (base para chips)
  const partesAll=(DB.partes||[]).filter(p=>p.fecha>=per.desde&&p.fecha<=per.hasta&&eqById(p.eqId));

  // Chips: tipo → subtipo → equipo (métrica = horas efectivas)
  const tiposMap={};
  partesAll.forEach(p=>{
    const eq=eqById(p.eqId);
    const t=eq.tipo||'Otros',s=(eq.sub||'Otros').toUpperCase();
    const ef=Math.max(0,+p.ef||0);
    if(!tiposMap[t])tiposMap[t]={ef:0,subs:{}};
    tiposMap[t].ef+=ef;
    if(!tiposMap[t].subs[s])tiposMap[t].subs[s]={ef:0,eqs:{}};
    tiposMap[t].subs[s].ef+=ef;
    if(!tiposMap[t].subs[s].eqs[eq.id])tiposMap[t].subs[s].eqs[eq.id]={eq,ef:0};
    tiposMap[t].subs[s].eqs[eq.id].ef+=ef;
  });
  if(_deqTipo&&!tiposMap[_deqTipo]){_deqTipo=null;_deqSub=null;_deqEqId=null;}
  if(_deqSub&&(!_deqTipo||!tiposMap[_deqTipo].subs[_deqSub])){_deqSub=null;_deqEqId=null;}
  if(_deqEqId&&_deqSub&&!tiposMap[_deqTipo].subs[_deqSub].eqs[_deqEqId])_deqEqId=null;

  // Aplicar filtros en cascada
  const partes=partesAll.filter(p=>{
    if(_deqEqId)return p.eqId===_deqEqId;
    const eq=eqById(p.eqId);
    const t=eq.tipo||'Otros',s=(eq.sub||'Otros').toUpperCase();
    if(_deqSub)return t===_deqTipo&&s===_deqSub;
    if(_deqTipo)return t===_deqTipo;
    return true;
  });

  const totEf=partes.reduce((s,p)=>s+Math.max(0,+p.ef||0),0);
  const totIm=partes.reduce((s,p)=>s+Math.max(0,+p.im||0),0);
  const disp=(totEf+totIm)>0?(totEf/(totEf+totIm)*100).toFixed(1)+'%':'—';
  const eqsActivos=new Set(partes.map(p=>p.eqId)).size;

  // Serie diaria: total ef · si hay equipo seleccionado, se divide en ☀ Día / 🌙 Noche
  const labels=[],serieDia=[],serieNoche=[],serieTotal=[];
  const porFecha={};
  partes.forEach(p=>{
    const f=p.fecha,ef=Math.max(0,+p.ef||0);
    if(!porFecha[f])porFecha[f]={dia:0,noche:0};
    if(/noche/i.test(p.turno||''))porFecha[f].noche+=ef;else porFecha[f].dia+=ef;
  });
  const cur=new Date(per.ini.getTime());
  while(cur<=per.fin){
    const f=`${cur.getFullYear()}-${String(cur.getMonth()+1).padStart(2,'0')}-${String(cur.getDate()).padStart(2,'0')}`;
    labels.push(`${String(cur.getDate()).padStart(2,'0')}/${String(cur.getMonth()+1).padStart(2,'0')}`);
    const d=porFecha[f]||{dia:0,noche:0};
    serieDia.push(+d.dia.toFixed(1));serieNoche.push(+d.noche.toFixed(1));serieTotal.push(+(d.dia+d.noche).toFixed(1));
    cur.setDate(cur.getDate()+1);
  }

  // Tabla por equipo
  const eqMap={};
  partes.forEach(p=>{
    if(!eqMap[p.eqId])eqMap[p.eqId]={eqId:p.eqId,n:0,ef:0,im:0,fechas:new Set(),ultima:''};
    const r=eqMap[p.eqId];
    r.n++;r.ef+=Math.max(0,+p.ef||0);r.im+=Math.max(0,+p.im||0);r.fechas.add(p.fecha);
    if(p.fecha>r.ultima)r.ultima=p.fecha;
  });
  const rows=Object.values(eqMap).map(r=>({...r,eq:eqById(r.eqId),
    disp:(r.ef+r.im)>0?r.ef/(r.ef+r.im)*100:null,
    prom:r.fechas.size>0?r.ef/r.fechas.size:0})).sort((a,b)=>b.ef-a.ef);

  const kpis=[
    {l:'Partes del Período',v:partes.length,c:'#06b6d4'},
    {l:'Hs Efectivas',v:fmt1(totEf)+' h',c:'#10b981'},
    {l:'Hs Inoperativas',v:fmt1(totIm)+' h',c:'#ef4444'},
    {l:'Disponibilidad',v:disp,c:'#8b5cf6'},
    {l:'Equipos con Parte',v:eqsActivos,c:'#f59e0b'},
  ];

  // Chips
  const tiposSorted=Object.entries(tiposMap).sort((a,b)=>b[1].ef-a[1].ef);
  const chipTodos=`<button onclick="_deqTipo=null;_deqSub=null;_deqEqId=null;rDashEquipos()" style="display:inline-flex;align-items:center;padding:.35rem .8rem;border-radius:20px;cursor:pointer;font-size:.76rem;font-weight:700;border:1.5px solid ${!_deqTipo?'#06b6d4':'var(--border)'};background:${!_deqTipo?'rgba(6,182,212,.15)':'var(--panel2)'};color:${!_deqTipo?'#06b6d4':'var(--muted2)'}">Todos</button>`;
  const chipTipos=tiposSorted.map(([t,d])=>{
    const act=_deqTipo===t;
    const tEsc=t.replace(/'/g,"\\'");
    return`<button onclick="_deqSelTipo('${tEsc}')" style="display:inline-flex;align-items:center;gap:.4rem;padding:.35rem .8rem;border-radius:20px;cursor:pointer;font-size:.76rem;font-weight:700;border:1.5px solid ${act?'#06b6d4':'var(--border)'};background:${act?'rgba(6,182,212,.18)':'var(--panel2)'};color:${act?'#06b6d4':'var(--text)'};transition:all .15s">
      ${t} <span style="font-family:monospace;font-size:.68rem;font-weight:900;color:${act?'#06b6d4':'var(--muted2)'}">${fmt1(d.ef)} h</span>${act?' ✕':''}
    </button>`;
  }).join('');
  let chipSubs='';
  if(_deqTipo&&tiposMap[_deqTipo]){
    const subsT=Object.entries(tiposMap[_deqTipo].subs).sort((a,b)=>b[1].ef-a[1].ef);
    chipSubs=`<div style="display:flex;gap:.35rem;flex-wrap:wrap;margin-top:.5rem;padding:.55rem .7rem;background:rgba(139,92,246,.05);border:1px dashed rgba(139,92,246,.4);border-radius:9px">
      <span style="font-size:.64rem;color:var(--muted2);text-transform:uppercase;letter-spacing:.07em;font-weight:700;align-self:center">↳ Subtipo:</span>
      ${subsT.map(([s,d])=>{
        const act=_deqSub===s;
        const sEsc=s.replace(/'/g,"\\'");
        return`<button onclick="_deqSelSub('${sEsc}')" style="display:inline-flex;align-items:center;gap:.35rem;padding:.3rem .7rem;border-radius:18px;cursor:pointer;font-size:.73rem;font-weight:700;border:1.5px solid ${act?'#8b5cf6':'var(--border)'};background:${act?'rgba(139,92,246,.2)':'var(--panel2)'};color:${act?'#a78bfa':'var(--text)'};transition:all .15s">
          ${s} <span style="font-family:monospace;font-size:.64rem;font-weight:900;color:${act?'#a78bfa':'var(--muted2)'}">${fmt1(d.ef)} h</span>${act?' ✕':''}
        </button>`;
      }).join('')}
    </div>`;
  }
  let chipEquipos='';
  if(_deqTipo&&_deqSub&&tiposMap[_deqTipo]&&tiposMap[_deqTipo].subs[_deqSub]){
    const eqsT=Object.values(tiposMap[_deqTipo].subs[_deqSub].eqs).sort((a,b)=>b.ef-a.ef);
    chipEquipos=`<div style="display:flex;gap:.35rem;flex-wrap:wrap;margin-top:.5rem;padding:.55rem .7rem;background:rgba(6,182,212,.05);border:1px dashed rgba(6,182,212,.35);border-radius:9px">
      <span style="font-size:.64rem;color:var(--muted2);text-transform:uppercase;letter-spacing:.07em;font-weight:700;align-self:center">↳ ${_deqSub}:</span>
      ${eqsT.map(({eq,ef})=>{
        const act=_deqEqId===eq.id;
        return`<button onclick="_deqSelEq(${eq.id})" style="display:inline-flex;align-items:center;gap:.35rem;padding:.25rem .65rem;border-radius:16px;cursor:pointer;font-size:.7rem;font-weight:700;font-family:monospace;border:1.5px solid ${act?'#06b6d4':'var(--border)'};background:${act?'#06b6d4':'var(--panel2)'};color:${act?'#fff':'var(--text)'};transition:all .15s">
          ${eq.codigo} <span style="font-size:.62rem;font-weight:900;color:${act?'rgba(255,255,255,.75)':'var(--muted2)'}">${fmt1(ef)}h</span>${act?' ✕':''}
        </button>`;
      }).join('')}
    </div>`;
  }

  const selEq=_deqEqId?eqById(_deqEqId):null;
  const tituloSel=selEq?`${selEq.codigo} — ${selEq.nombre||''}`
    :_deqSub?`${_deqTipo} · ${_deqSub}`
    :_deqTipo?_deqTipo:'todos los equipos';

  const TH=`background:var(--panel2);color:var(--muted2);font-size:.68rem;font-weight:700;text-transform:uppercase;letter-spacing:.07em;padding:.5rem .7rem;white-space:nowrap`;
  const TD=`padding:.5rem .7rem;border-bottom:1px solid var(--border);font-size:.81rem;vertical-align:middle`;
  const tbody=rows.map(r=>{
    const cod=r.eq?r.eq.codigo:'(sin equipo)';
    const dispCell=r.disp!=null
      ?`<span style="font-family:monospace;font-weight:700;color:${r.disp>=85?'#10b981':r.disp>=70?'#f59e0b':'#ef4444'}">${r.disp.toFixed(1)}%</span>`
      :'<span style="color:var(--muted2)">—</span>';
    return`<tr style="cursor:pointer" title="Doble clic: detalle diario de ${cod}" ondblclick="openDrillDown('${r.eqId}','${cod}','#06b6d4','mes')" onmouseover="this.style.background='var(--hover)'" onmouseout="this.style.background=''">
      <td style="${TD}"><span class="mono" style="font-size:.74rem;font-weight:700;color:#06b6d4">${cod}</span></td>
      <td style="${TD}"><div style="font-weight:600">${r.eq?(r.eq.nombre||''):'—'}</div><div style="font-size:.68rem;color:var(--muted2)">${r.eq?(r.eq.sub||''):''}</div></td>
      <td style="${TD};text-align:center;font-family:monospace">${r.n}</td>
      <td style="${TD};text-align:right;font-family:monospace;font-weight:900;color:#10b981">${fmt1(r.ef)} h</td>
      <td style="${TD};text-align:right;font-family:monospace;color:${r.im>0?'#ef4444':'var(--muted2)'}">${r.im>0?fmt1(r.im)+' h':'—'}</td>
      <td style="${TD};text-align:right">${dispCell}</td>
      <td style="${TD};text-align:right;font-family:monospace;font-size:.76rem">${fmt1(r.prom)} <span style="font-size:.62rem;color:var(--muted2)">h/día</span></td>
      <td style="${TD};text-align:center;font-family:monospace;font-size:.74rem;color:var(--muted2)">${r.ultima||'—'}</td>
    </tr>`;
  }).join('');

  el.innerHTML=`
    <div class="ph">
      <div class="ph-title" style="color:#06b6d4">📊 Dashboard – Control de Equipos</div>
      <div class="ph-sub">Horas efectivas por tipo, subtipo y equipo · filtros dinámicos</div>
    </div>
    <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:.6rem;margin-bottom:1rem">
      <div style="font-size:.78rem;color:var(--muted2)">Período 21→20 · <span class="mono">${per.desde}</span> al <span class="mono">${per.hasta}</span> · ${per.dias} días</div>
      <div style="display:flex;align-items:center;background:var(--panel2);border:1px solid var(--border);border-radius:8px;overflow:hidden">
        <button onclick="_deqNav(-1)" style="background:none;border:none;border-right:1px solid var(--border);color:var(--text);cursor:pointer;font-size:1.1rem;padding:.35rem .7rem;line-height:1">‹</button>
        <span style="font-weight:800;font-size:.88rem;color:var(--text);min-width:130px;text-align:center;padding:0 .5rem">${per.label}</span>
        <button onclick="_deqNav(1)" style="background:none;border:none;border-left:1px solid var(--border);color:var(--text);cursor:pointer;font-size:1.1rem;padding:.35rem .7rem;line-height:1">›</button>
      </div>
    </div>
    <div class="kpi-row">${kpis.map(k=>`<div class="kpi" style="--kc:${k.c}"><div class="kpi-lbl">${k.l}</div><div class="kpi-val" style="font-size:${String(k.v).length>10?'1.1rem':'1.6rem'}">${k.v}</div></div>`).join('')}</div>
    <div style="margin-bottom:1rem">
      <div style="display:flex;gap:.35rem;flex-wrap:wrap;align-items:center">
        <span style="font-size:.64rem;color:var(--muted2);text-transform:uppercase;letter-spacing:.07em;font-weight:700">Tipo de equipo:</span>
        ${chipTodos}${chipTipos}
      </div>
      ${chipSubs}
      ${chipEquipos}
    </div>
    <div class="card" style="margin-bottom:1rem">
      <div class="card-head"><span class="card-title">⏱️ Horas efectivas por día — <span style="color:#06b6d4">${tituloSel}</span>${selEq?' <span style="font-size:.68rem;color:var(--muted2)">(☀ Día / 🌙 Noche)</span>':''}</span></div>
      <div class="card-body" style="height:260px;position:relative">
        ${partes.length?'<canvas id="deqChart"></canvas>':'<div style="text-align:center;padding:3rem;color:var(--muted2);font-size:.85rem">Sin partes diarios en este período</div>'}
      </div>
    </div>
    <div class="card">
      <div class="card-head"><span class="card-title">Horas por Equipo</span><span style="font-size:.7rem;color:var(--muted2)">Doble clic en una fila para ver el detalle diario del equipo</span></div>
      <div class="card-body"><div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;min-width:850px">
        <thead><tr>
          <th style="${TH}">Código</th><th style="${TH}">Equipo</th>
          <th style="${TH};text-align:center">Partes</th>
          <th style="${TH};text-align:right">Hs Efectivas</th>
          <th style="${TH};text-align:right">Hs Inop.</th>
          <th style="${TH};text-align:right">Disponibilidad</th>
          <th style="${TH};text-align:right">Prom. Diario</th>
          <th style="${TH};text-align:center">Últ. Parte</th>
        </tr></thead>
        <tbody>${tbody||`<tr><td colspan="8" style="text-align:center;padding:2.5rem;color:var(--muted2);font-size:.85rem">Sin partes diarios en este período</td></tr>`}</tbody>
      </table></div></div>
    </div>`;

  // Gráfico diario: barras totales · con equipo seleccionado → dos barras ☀ Día / 🌙 Noche
  if(partes.length&&typeof Chart!=='undefined'){
    if(_deqChart){_deqChart.destroy();_deqChart=null;}
    const ctx=document.getElementById('deqChart');
    if(ctx){
      const datasets=selEq
        ?[
          {label:'☀ Día',data:serieDia,backgroundColor:'rgba(245,158,11,.75)',borderColor:'#f59e0b',borderWidth:1,borderRadius:3},
          {label:'🌙 Noche',data:serieNoche,backgroundColor:'rgba(99,102,241,.75)',borderColor:'#6366f1',borderWidth:1,borderRadius:3}
        ]
        :[{label:'Horas efectivas',data:serieTotal,backgroundColor:'rgba(6,182,212,.55)',borderColor:'#06b6d4',borderWidth:1,borderRadius:3}];
      _deqChart=new Chart(ctx,{
        type:'bar',
        data:{labels,datasets},
        options:{
          responsive:true,maintainAspectRatio:false,
          plugins:{legend:{display:!!selEq,position:'bottom',labels:{color:'#8b93a7',font:{size:10},boxWidth:12}},tooltip:{callbacks:{label:c=>c.dataset.label+': '+c.parsed.y.toFixed(1)+' h'}}},
          scales:{
            x:{ticks:{color:'#8b93a7',font:{size:9},maxRotation:60,minRotation:45},grid:{display:false}},
            y:{ticks:{color:'#8b93a7',font:{size:10},callback:v=>v+' h'},grid:{color:'rgba(139,147,167,.12)'},beginAtZero:true}
          }
        }
      });
    }
  }
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

// Utilización: solo mide los equipos de producción (línea amarilla y blanca).
// Generadores, luminarias, vehículos, etc. distorsionan el % porque no tienen
// una jornada comparable; se incluyen aparte con el checkbox.
const _UTIL_LINEAS=['Línea Amarilla','Línea Blanca'];
let _reqUtilTodos=false;
function _reqUtilToggle(el){_reqUtilTodos=!!el.checked;rReporteEquipos();}

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
  const partesConHoras=partes.filter(p=>(+p.ef||0)>0);
  const promHsTurno=partesConHoras.length?totEf/partesConHoras.length:0;

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
  const utilRowsAll=Object.entries(utilByEq).map(([id,d])=>{
    const eq=DB.equipos.find(e=>e.id==id);
    return{eq,ef:d.ef,im:d.im,dias:d.dias.size,util:hsDisp>0?d.ef/hsDisp*100:0};
  }).sort((a,b)=>b.util-a.util);
  // Si el usuario ya eligió un tipo distinto en el filtro de arriba, se respeta esa
  // elección: sería confuso vaciarle la tabla por el checkbox.
  const _utilSoloLineas=!_reqUtilTodos&&(!fTipo||_UTIL_LINEAS.includes(fTipo));
  const utilRows=_utilSoloLineas?utilRowsAll.filter(r=>_UTIL_LINEAS.includes(r.eq&&r.eq.tipo)):utilRowsAll;
  const _utilOcultos=utilRowsAll.length-utilRows.length;
  const _utilEf=utilRows.reduce((s,r)=>s+r.ef,0);
  const utilGlob=utilRows.length&&hsDisp>0?_utilEf/(utilRows.length*hsDisp)*100:0;
  const _uCol=u=>u>=70?'#10b981':u>=40?'#f59e0b':'#ef4444';

  const kpiEl=document.getElementById('reqKpis');
  if(kpiEl)kpiEl.innerHTML=[
    {l:'Total Partes',v:partes.length,c:'var(--ceq)',ic:'📋'},
    {l:'Hs Efectivas',v:parseFloat(totEf.toFixed(2))+'h',c:'#10b981',ic:'⚙️'},
    {l:'Hs Inoperativas',v:parseFloat(totIm.toFixed(2))+'h',c:'#ef4444',ic:'🛑'},
    {l:'Utilización',v:utilRows.length?utilGlob.toFixed(0)+'%'+`<br><span style="font-size:.55rem;font-weight:600;color:var(--muted2);letter-spacing:.03em">${_utilSoloLineas?'línea amarilla + blanca':'todos los equipos'} · ${utilRows.length} eq.</span>`:'—',c:utilRows.length?_uCol(utilGlob):'var(--muted2)',ic:'📈'},
    {l:'Prom. Hs / Turno',v:partesConHoras.length?`${promHsTurno.toFixed(2)}h<br><span style="font-size:.55rem;font-weight:600;color:var(--muted2);letter-spacing:.03em">${partesConHoras.length} turno${partesConHoras.length===1?'':'s'} trabajado${partesConHoras.length===1?'':'s'}</span>`:'—',c:'#06b6d4',ic:'📊'},
    {l:'Días Hmin Cumpl.',v:diasHmin,c:'#f59e0b',ic:'✅'},
    {l:'Hs Stanby a Pagar',v:stanby+'h',c:'#8b5cf6',ic:'⏸️'}
  ].map(k=>`<div class="kpi" style="--kc:${k.c}"><div class="kpi-lbl">${k.ic} ${k.l}</div><div class="kpi-val">${k.v}</div></div>`).join('');

  // Tabla de utilización por equipo
  const utilEl=document.getElementById('reqUtil');
  if(utilEl){
    const _chk=`<label style="display:inline-flex;align-items:center;gap:.35rem;font-size:.63rem;color:var(--muted2);cursor:pointer;user-select:none">
      <input type="checkbox" ${_reqUtilTodos?'checked':''} onchange="_reqUtilToggle(this)" style="cursor:pointer;accent-color:var(--ceq)">
      Incluir equipos menores y vehículos${!_reqUtilTodos&&_utilOcultos>0?` <span style="color:var(--ceq);font-weight:700">(${_utilOcultos} oculto${_utilOcultos===1?'':'s'})</span>`:''}
    </label>`;
    utilEl.innerHTML=`<div class="card">
      <div class="card-head" style="flex-wrap:wrap;gap:.5rem"><span class="card-title">📈 Utilización de Equipos</span>
        ${_chk}
        <span style="font-size:.63rem;color:var(--muted2)">Hs efectivas ÷ Hs disponibles · ${diasPer} día${diasPer===1?'':'s'} × ${jornada}h jornada = ${fmtN(hsDisp)}h por equipo</span>
      </div>
      ${!utilRows.length?`<div class="card-body" style="text-align:center;color:var(--muted2);padding:2rem;font-size:.85rem">${_utilSoloLineas&&_utilOcultos>0?'No hay equipos de línea amarilla ni blanca con partes en el período.<br><span style="font-size:.72rem">Marque el checkbox para ver los '+_utilOcultos+' equipo(s) restantes.</span>':'Sin datos de utilización para los filtros seleccionados.'}</div>`:`
      <div class="card-body" style="padding:0"><div class="tbl-wrap"><table style="font-size:.72rem">
        <thead><tr style="font-size:.62rem;text-transform:uppercase;letter-spacing:.06em">
          <th>Código</th><th>Equipo</th><th>Línea</th><th>Tipo</th><th class="tr">Días c/Parte</th><th class="tr">Hs Efectivas</th><th class="tr">Hs Inop.</th><th style="min-width:190px">Utilización</th>
        </tr></thead>
        <tbody>
        ${utilRows.map(r=>{
          const c=_uCol(r.util);
          const pct=Math.min(100,Math.round(r.util));
          const _tp=r.eq&&r.eq.tipo||'';
          const _lnC=_tp==='Línea Amarilla'?'#f59e0b':_tp==='Línea Blanca'?'#94a3b8':'#64748b';
          const _lnT=_tp==='Línea Amarilla'?'AMARILLA':_tp==='Línea Blanca'?'BLANCA':(_tp||'—').toUpperCase();
          return`<tr>
            <td class="mono" style="color:var(--ceq);font-weight:700">${r.eq?r.eq.codigo:'—'}</td>
            <td>${r.eq?(r.eq.nombre||'').split(' ').slice(0,4).join(' '):'—'}</td>
            <td><span style="font-size:.58rem;font-weight:800;letter-spacing:.05em;color:${_lnC};border:1px solid ${_lnC};border-radius:4px;padding:.1rem .3rem;white-space:nowrap">${_lnT}</span></td>
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
      </table></div></div>`}
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
  // Km de los vehículos menores: se suman siempre, aunque la vista tenga tipos mezclados
  const totKmRec=partes.reduce((s,p)=>{
    const eq=DB.equipos.find(e=>e.id===p.eqId);
    if(eq?.tipo!=='Vehículo Menor')return s;
    const ki=+p.kmIni||0,kf=+p.kmFin||0;
    return s+(kf>ki?kf-ki:0);
  },0);
  const tf=document.getElementById('tfReporteEquipos');
  if(tf&&partes.length){
    tf.innerHTML=`
      <tr style="background:rgba(30,58,95,.25);font-weight:700;border-top:2px solid var(--ceq)">
        <td colspan="6" style="text-align:right;padding:.4rem .6rem;font-size:.7rem;text-transform:uppercase;letter-spacing:.05em;color:var(--muted2)">${_esVMFilt?'Km Recorridos Total':'Hs Efectivas Total'}</td>
        <td class="mono" style="color:#10b981;font-weight:800">${_esVMFilt?fmtN(totKmRec)+' km':parseFloat(totEf.toFixed(2))+'h'}</td>
        <td colspan="4"></td>
      </tr>
      ${!_esVMFilt&&totKmRec>0?`<tr style="background:rgba(30,58,95,.15)">
        <td colspan="6" style="text-align:right;padding:.3rem .6rem;font-size:.7rem;text-transform:uppercase;letter-spacing:.05em;color:var(--muted2)">Km Recorridos Total <span style="font-size:.62rem;opacity:.8">(vehículos menores)</span></td>
        <td class="mono" style="color:#a78bfa;font-weight:800">${fmtN(totKmRec)} km</td>
        <td colspan="4"></td>
      </tr>`:''}
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
  // Los vehículos menores no llevan horómetro: se miden por kilometraje.
  // Sin esta distinción el Excel restaba km contra horas en cero y salían negativos.
  const fTipoX=(document.getElementById('reqFiltTipo')||{}).value||'';
  const _esVMX=fTipoX==='Vehículo Menor';
  const _mixto=!fTipoX;   // exportación con tipos mezclados

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

  const NC=12;              // total de columnas (se agregó UNID.)
  const R=n=>Array(n).fill(S(''));
  const wsData=[];
  // Header info rows
  wsData.push([S('REPORTE DE EQUIPOS – VALORIZACIÓN',true,HDR,HDRT,'center'),...Array(NC-1).fill(S('',false,HDR,HDRT))]);
  wsData.push([S(`Equipo: ${eqNom}`,true),...R(NC-1)]);
  wsData.push([S(`Período: ${periodo}`),...R(NC-1)]);
  wsData.push([S(`Hs Mínimas/día: ${hMinDia}h   |   Hmin Mes: ${hMinMes}h`),...R(NC-1)]);
  wsData.push(R(NC));

  // Encabezados: cambian según el tipo filtrado (horómetro vs. kilometraje)
  const lblIni=_esVMX?'KM INICIAL':(_mixto?'HR / KM INICIAL':'HR INICIAL');
  const lblFin=_esVMX?'KM FINAL':(_mixto?'HR / KM FINAL':'HR FINAL');
  const lblTrab=_esVMX?'KM RECORRIDOS':(_mixto?'HS TRAB. / KM REC.':'HS TRABAJADAS');
  const cols=['FECHA','TURNO','TIPO DE EQUIPO','CÓDIGO',lblIni,lblFin,lblTrab,'UNID.','MÍNIMO','ÁREA DE TRABAJO','DESCRIPCIÓN DEL TRABAJO','OBSERVACIONES'];
  wsData.push(cols.map(c=>({v:c,t:'s',s:{font:{bold:true,color:{rgb:HDRT},sz:8},fill:{fgColor:{rgb:HDR}},alignment:{horizontal:'center',vertical:'center',wrapText:true},border:HBOR}})));

  let totEf=0,totKm=0,nErr=0;
  _reqCache.forEach(p=>{
    const eq=DB.equipos.find(e=>e.id===p.eqId);
    const esVM=eq?.tipo==='Vehículo Menor';
    let ini,fin,trab,unid,cumple;
    if(esVM){
      // Kilometraje: nunca se resta al revés
      ini=+p.kmIni||0;fin=+p.kmFin||0;
      trab=fin>ini?fin-ini:0;
      unid='km';totKm+=trab;
      cumple=hMinDia>0?trab>=hMinDia:null;
    }else{
      ini=+p.hrIni||0;fin=+p.hrFin||0;
      const ef=+p.ef||0;
      trab=ef>0?ef:0;                       // horómetro inconsistente no resta
      if(ef<0)nErr++;
      unid='h';totEf+=trab;
      cumple=hMinDia>0?trab>=hMinDia:null;
    }
    wsData.push([
      S(p.fecha,false,SUBBG,'334155','center',true),
      S(p.turno||'',false,'','334155','center',true),
      S(eq?eq.tipo||eq.sub||'':'',false,'','334155','center',true),
      S(eq?eq.codigo:'',true,'','1e6196','center',true),
      N(ini,false,SUBBG,'334155','right'),
      N(fin,false,SUBBG,'334155','right'),
      ({v:parseFloat(trab.toFixed(2)),t:'n',s:{font:{bold:true,color:{rgb:trab>0?'0f6b3d':'94a3b8'},sz:9,name:'Consolas'},fill:{fgColor:{rgb:'f0fdf4'}},alignment:{horizontal:'right',vertical:'center'},border:HBOR}}),
      S(unid,false,'','64748b','center',true),
      S(cumple===null?'—':cumple?'SI':'NO',true,'',cumple===null?'64748b':cumple?'0f6b3d':'dc2626','center',true),
      S(p.areaT||'—',false,'','334155','left',true),
      S(p.act||'—',false,'','334155','left',true),
      S(p.observaciones||'—',false,'','334155','left',true),
    ]);
  });

  // Footer totals — una fila por unidad de medida
  wsData.push(R(NC));
  const filaTot=(etiqueta,valor,color)=>[S(etiqueta,true,TOTBG,'1e3a5f','right',true),...Array(5).fill(S('',false,TOTBG)),
    ({v:parseFloat(Number(valor).toFixed(2)),t:'n',s:{font:{bold:true,color:{rgb:color},sz:10,name:'Consolas'},fill:{fgColor:{rgb:TOTBG}},alignment:{horizontal:'right'},border:HBOR}}),
    ...Array(NC-7).fill(S('',false,TOTBG))];
  const stanby=hMinMes>0?parseFloat(Math.max(0,hMinMes-totEf).toFixed(2)):0;
  if(totEf>0||!totKm)wsData.push(filaTot('Hs Efectivas Total',totEf,'0f6b3d'));
  if(totKm>0)wsData.push(filaTot('Km Recorridos Total',totKm,'7c3aed'));
  if(hMinMes>0&&totEf>0){
    wsData.push(filaTot('Hs Stanby a Pagar',stanby,'5b21b6'));
    wsData.push([S('Total = Hmin Mes',true,HDR,HDRT,'right',true),...Array(5).fill(S('',false,HDR,HDRT)),
      ({v:hMinMes,t:'n',s:{font:{bold:true,color:{rgb:HDRT},sz:10,name:'Consolas'},fill:{fgColor:{rgb:HDR}},alignment:{horizontal:'right'},border:HBOR}}),
      ...Array(NC-7).fill(S('',false,HDR,HDRT))]);
  }
  if(nErr){
    wsData.push(R(NC));
    wsData.push([S(`⚠ ${nErr} parte(s) con horómetro final menor al inicial: se excluyeron del total en vez de restar horas.`,true,'','b45309','left'),...R(NC-1)]);
  }

  const ws=XLSX.utils.aoa_to_sheet(wsData);
  ws['!cols']=[{wch:12},{wch:9},{wch:18},{wch:12},{wch:12},{wch:12},{wch:15},{wch:7},{wch:9},{wch:18},{wch:32},{wch:22}];
  ws['!merges']=[
    {s:{r:0,c:0},e:{r:0,c:NC-1}},
    {s:{r:1,c:0},e:{r:1,c:NC-1}},
    {s:{r:2,c:0},e:{r:2,c:NC-1}},
    {s:{r:3,c:0},e:{r:3,c:NC-1}},
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
