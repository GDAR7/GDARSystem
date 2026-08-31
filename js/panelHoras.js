// ══ PANEL DE HORAS MÁQUINA + RESUMEN SEMANAL + REPORTE MENSUAL AL CORTE ══
// (separado de auxmec.js — usa helpers globales de utils.js/config.js)

// ══ PANEL HORAS ══
const HM_COLS=['Excavadora','Cargador Frontal','Motoniveladora','Retroexcavadora','Tractor Oruga','Rodillo'];
const HM_COLORS={'Excavadora':'#ef4444','Cargador Frontal':'#f97316','Motoniveladora':'#f59e0b','Retroexcavadora':'#10b981','Tractor Oruga':'#3b82f6','Rodillo':'#8b5cf6','Volquete':'#06b6d4'};
// ══ PANEL DE HORAS MÁQUINA (reporte semanal por equipo, estilo Avance MT) ══
let _phSemIni=null,_phChart=null,_phExport=null,_phTipoFiltro='';
function _phSemDefault(){
  const h=new Date(today()+'T12:00:00');
  const lunes=new Date(h);
  lunes.setDate(h.getDate()-((h.getDay()+6)%7));
  return lunes.toISOString().slice(0,10);
}
function _phNav(dias){
  const d=new Date((_phSemIni||_phSemDefault())+'T12:00:00');
  d.setDate(d.getDate()+dias);
  _phSemIni=d.toISOString().slice(0,10);
  rPanelHoras();
}
function _phSemExport(){
  if(!_phExport||!_phExport.aoa){toast('Nada que exportar',true);return;}
  if(typeof XLSX==='undefined'){toast('Librería Excel no disponible',true);return;}
  const ws=XLSX.utils.aoa_to_sheet(_phExport.aoa);
  const wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,ws,'Horas');
  XLSX.writeFile(wb,_phExport.name);
}

let _phTab=1;
// Un usuario puede tener limitados los tabs de este panel (CU.panelHorasTabs).
// Sin la lista ve todos, que es como funcionó siempre.
function _phTabsOk(){
  const a=CU&&CU.panelHorasTabs;
  return (Array.isArray(a)&&a.length)?a.map(Number):null;
}
function _phTabSwitch(t){
  const ok=_phTabsOk();
  if(ok&&ok.indexOf(t)<0)return;
  _phTab=t;rPanelHoras();
}
function rPanelHoras(){
  const root=document.getElementById('phBody');if(!root)return;
  if(!_phSemIni)_phSemIni=_phSemDefault();
  let tabs=[[1,'📅 Horas por Día'],[2,'🎯 Utilización Semanal'],[3,'🔧 Disponibilidad Mecánica'],[4,'🛵 Disponibilidad Menores'],[5,'📄 Resumen Semanal']];
  const ok=_phTabsOk();
  if(ok){
    tabs=tabs.filter(t=>ok.indexOf(t[0])>=0);
    // Si el tab en curso no está permitido se cae al primero que sí lo esté
    if(tabs.length&&ok.indexOf(_phTab)<0)_phTab=tabs[0][0];
  }
  root.innerHTML=`<div style="display:flex;gap:.35rem;margin-bottom:.8rem;flex-wrap:wrap">${tabs.map(([n,lbl])=>{const sel=_phTab===n;return`<button onclick="_phTabSwitch(${n})" style="font-size:.72rem;padding:.35rem .9rem;border-radius:7px;border:1px solid ${sel?'var(--ceq)':'var(--border)'};background:${sel?'rgba(249,115,22,.15)':'var(--panel2)'};color:${sel?'var(--ceq)':'var(--muted2)'};cursor:pointer;font-weight:${sel?'800':'500'}">${lbl}</button>`;}).join('')}</div><div id="phTabBody"></div>`;
  if(_phTab===2){_phRenderUtil('util');return;}
  if(_phTab===3){_phRenderUtil('dm');return;}
  if(_phTab===4){_phRenderMenores();return;}
  if(_phTab===5){_phRenderResumen();return;}
  _phRenderHoras();
}
function _phRenderHoras(){
  const el=document.getElementById('phTabBody');if(!el)return;
  const pad=n=>String(n).padStart(2,'0');
  const DN=['DOM','LUN','MAR','MIÉ','JUE','VIE','SÁB'];
  const hoy=today();
  const fmtH=v=>v.toLocaleString('es-PE',{maximumFractionDigits:1});

  // 7 fechas de la semana elegida (+ semana anterior para comparativo)
  const mkFechas=ini=>{
    const d0=new Date(ini+'T12:00:00');const out=[];
    for(let i=0;i<7;i++){const d=new Date(d0);d.setDate(d0.getDate()+i);out.push({iso:`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`,lbl:DN[d.getDay()],dm:`${pad(d.getDate())}/${pad(d.getMonth()+1)}`});}
    return out;
  };
  const fechas=mkFechas(_phSemIni);
  const fIni=fechas[0].iso,fFin=fechas[6].iso;
  const rango=`${fechas[0].dm} → ${fechas[6].dm}`;
  const dPrev=new Date(_phSemIni+'T12:00:00');dPrev.setDate(dPrev.getDate()-7);
  const fechasPrev=mkFechas(dPrev.toISOString().slice(0,10));
  const pIni=fechasPrev[0].iso,pFin=fechasPrev[6].iso;

  // Partes de la semana: grid[eqId][iso]={ef,im,efD,efN}
  const grid={};const prevEf={};
  (DB.partes||[]).forEach(function(p){
    if(!p.fecha||!p.eqId)return;
    const eq=(DB.equipos||[]).find(e=>e.id===p.eqId);
    if(_phTipoFiltro&&(!eq||eq.tipo!==_phTipoFiltro))return;
    const ef=Math.max(0,+p.ef||0),im=Math.max(0,+p.im||0);
    if(p.fecha>=pIni&&p.fecha<=pFin){prevEf[p.eqId]=(prevEf[p.eqId]||0)+ef;}
    if(p.fecha<fIni||p.fecha>fFin)return;
    if(!grid[p.eqId])grid[p.eqId]={};
    if(!grid[p.eqId][p.fecha])grid[p.eqId][p.fecha]={ef:0,im:0,efD:0,efN:0};
    const c=grid[p.eqId][p.fecha];
    c.ef+=ef;c.im+=im;
    if(/noche/i.test(p.turno||''))c.efN+=ef;else c.efD+=ef;
  });

  // Filas por equipo con totales
  const rows=Object.keys(grid).map(function(id){
    const eq=(DB.equipos||[]).find(e=>e.id==id);
    let ef=0,im=0,efD=0,efN=0;const dias=new Set();
    Object.entries(grid[id]).forEach(([f,c])=>{ef+=c.ef;im+=c.im;efD+=c.efD;efN+=c.efN;if(c.ef||c.im)dias.add(f);});
    return{id,eq,tipo:eq?(eq.tipo||'Otros'):'Otros',ef,im,efD,efN,dias:dias.size,prom:dias.size?ef/dias.size:0,prev:prevEf[id]||0};
  }).sort((a,b)=>b.ef-a.ef);

  // Agrupar por tipo de línea
  const grupos={};
  rows.forEach(r=>{if(!grupos[r.tipo])grupos[r.tipo]=[];grupos[r.tipo].push(r);});
  const tiposOrden=Object.keys(grupos).sort((a,b)=>grupos[b].reduce((s,r)=>s+r.ef,0)-grupos[a].reduce((s,r)=>s+r.ef,0));

  // Totales generales y por día
  const totDia={};let totalEf=0,totalIm=0,maxCelda=0;
  fechas.forEach(f=>{totDia[f.iso]={ef:0,im:0};});
  rows.forEach(r=>fechas.forEach(f=>{
    const c=grid[r.id][f.iso];if(!c)return;
    totDia[f.iso].ef+=c.ef;totDia[f.iso].im+=c.im;
    totalEf+=c.ef;totalIm+=c.im;
    if(c.ef>maxCelda)maxCelda=c.ef;
  }));
  const totalPrev=rows.reduce((s,r)=>s+r.prev,0);

  const TH='padding:.45rem .5rem;font-size:.62rem;text-transform:uppercase;letter-spacing:.06em;color:var(--muted2);white-space:nowrap';
  const TD='padding:.4rem .55rem;border:1px solid var(--border);font-size:.74rem;vertical-align:middle';
  // Heatmap: fondo plomo semioscuro con degradado azul según intensidad
  const heatBase='rgba(148,163,184,.08)'; // plomo para celdas sin datos
  const heat=v=>{if(!v||!maxCelda)return heatBase;const a=0.12+0.45*Math.min(1,v/maxCelda);return`rgba(59,130,246,${a.toFixed(2)})`;};
  const delta=(cur,prev)=>typeof _amtDelta==='function'?_amtDelta(cur,prev):'';

  // Barra superior
  const inpS='font-size:.72rem;padding:.2rem .4rem;border-radius:5px;border:1px solid var(--border);background:var(--panel2);color:var(--text);flex-shrink:0';
  const tiposEq=['','Línea Amarilla','Línea Blanca','Vehículo Menor','Equipos Menores'];
  const bar=`<div style="display:flex;align-items:center;gap:.5rem;flex-wrap:wrap;margin-bottom:.8rem;padding:.4rem .7rem;background:var(--panel2);border:1px solid var(--border);border-radius:8px">
    <span style="font-size:.62rem;color:var(--muted2);font-weight:700;text-transform:uppercase;letter-spacing:.08em;white-space:nowrap">Semana (7 días desde)</span>
    <button onclick="_phNav(-7)" style="background:none;border:1px solid var(--border);border-radius:5px;color:var(--text);cursor:pointer;font-size:.85rem;padding:.12rem .5rem" title="Semana anterior">‹</button>
    <input type="date" value="${_phSemIni}" onchange="_phSemIni=this.value;rPanelHoras()" style="${inpS};width:135px">
    <button onclick="_phNav(7)" style="background:none;border:1px solid var(--border);border-radius:5px;color:var(--text);cursor:pointer;font-size:.85rem;padding:.12rem .5rem" title="Semana siguiente">›</button>
    <span style="font-size:.72rem;color:var(--ceq);font-weight:700;font-family:monospace">${rango}</span>
    <button onclick="_phSemIni=_phSemDefault();rPanelHoras()" style="font-size:.62rem;padding:.2rem .5rem;border-radius:5px;border:1px solid var(--border);background:transparent;color:var(--muted2);cursor:pointer">Semana actual (Lun)</button>
    <div style="width:1px;height:18px;background:var(--border)"></div>
    <span style="font-size:.62rem;color:var(--muted2);font-weight:700;text-transform:uppercase;letter-spacing:.08em;white-space:nowrap">Línea</span>
    <div style="display:flex;gap:.2rem;flex-wrap:wrap">
      ${tiposEq.map(t=>{
        const sel=_phTipoFiltro===t;
        const lbl=t||'Todas';
        return`<button onclick="_phTipoFiltro='${t}';rPanelHoras()" style="font-size:.62rem;padding:.2rem .5rem;border-radius:5px;border:1px solid ${sel?'var(--ceq)':'var(--border)'};background:${sel?'rgba(249,115,22,.15)':'transparent'};color:${sel?'var(--ceq)':'var(--muted2)'};cursor:pointer;white-space:nowrap;font-weight:${sel?'700':'400'}">${lbl}</button>`;
      }).join('')}
    </div>
    <button onclick="_phSemExport()" style="margin-left:auto;font-size:.7rem;padding:.25rem .7rem;border-radius:5px;border:none;background:#166534;color:#fff;cursor:pointer;font-weight:700;white-space:nowrap">📊 Excel</button>
  </div>`;

  // Filas de la tabla (agrupadas por línea con subtotal)
  let body='';
  tiposOrden.forEach(function(tipo){
    const items=grupos[tipo];
    const subEf=items.reduce((s,r)=>s+r.ef,0);
    const subIm=items.reduce((s,r)=>s+r.im,0);
    body+=`<tr><td colspan="${fechas.length+5}" style="padding:.45rem .7rem;background:rgba(249,115,22,.07);border:1px solid var(--border);color:var(--ceq);font-size:.71rem;font-weight:700;text-transform:uppercase;letter-spacing:.06em">${tipo} · ${items.length} equipo(s) · <span style="font-family:monospace">${fmtH(subEf)}h ef.</span>${subIm?` · <span style="font-family:monospace;color:#ef4444">${fmtH(subIm)}h inop.</span>`:''}</td></tr>`;
    items.forEach(function(r){
      const celdas=fechas.map(function(f){
        const c=grid[r.id][f.iso];
        const esHoy=f.iso===hoy;
        if(!c||(!c.ef&&!c.im))return`<td style="${TD};text-align:right;color:var(--muted);background:${esHoy?'rgba(245,158,11,.05)':heatBase}">—</td>`;
        const ttl=`☀ ${fmtH(c.efD)}h · 🌙 ${fmtH(c.efN)}h${c.im?` · 🛑 Inoper: ${fmtH(c.im)}h`:''}`;
        return`<td style="${TD};text-align:right;font-family:monospace;font-weight:700;color:var(--text);background:${esHoy?'rgba(245,158,11,.10)':heat(c.ef)}" title="${ttl}">${fmtH(c.ef)}${c.im?`<span style="color:#ef4444;font-size:.6rem"> +${fmtH(c.im)}i</span>`:''}</td>`;
      }).join('');
      const promCol=r.prom>=8?'#10b981':r.prom>=5?'#f59e0b':'#ef4444';
      body+=`<tr>
        <td style="${TD};white-space:nowrap">
          <span class="mono" style="font-weight:700;color:#06b6d4">${r.eq?r.eq.codigo:'#'+r.id}</span>
          <div style="font-size:.62rem;color:var(--muted2)">${r.eq?((r.eq.sub||'')+' '+(r.eq.marca||'')):''}</div>
        </td>
        ${celdas}
        <td style="${TD};text-align:right;font-family:monospace;font-weight:900;color:var(--ceq);background:rgba(249,115,22,.07)">${fmtH(r.ef)}h ${delta(r.ef,r.prev)}<div style="font-size:.58rem;color:var(--muted2);font-weight:400"><span style="color:#fbbf24">☀</span> ${fmtH(r.efD)} · <span style="color:#94a3b8;filter:grayscale(1) brightness(1.15)">🌙</span> ${fmtH(r.efN)}</div></td>
        <td style="${TD};text-align:right;font-family:monospace;color:${r.im?'#ef4444':'var(--muted)'}">${r.im?fmtH(r.im)+'h':'—'}</td>
        <td style="${TD};text-align:center;font-family:monospace">${r.dias}</td>
        <td style="${TD};text-align:right;font-family:monospace;font-weight:900;color:${promCol}">${r.prom.toFixed(1)}</td>
      </tr>`;
    });
  });

  // Datos de exportación
  _phExport={
    name:'horas_maquina_'+fIni+'.xlsx',
    aoa:[
      ['HORAS MÁQUINA POR EQUIPO — '+rango+(_phTipoFiltro?' — '+_phTipoFiltro:'')],
      ['Equipo','Línea',...fechas.map(f=>f.lbl+' '+f.dm),'Hs Efectivas','☀ Día','🌙 Noche','Hs Inoper.','Días trab.','Prom h/día'],
      ...rows.map(r=>[
        r.eq?r.eq.codigo:('#'+r.id),r.tipo,
        ...fechas.map(f=>{const c=grid[r.id][f.iso];return c&&c.ef?+c.ef.toFixed(1):'';}),
        +r.ef.toFixed(1),+r.efD.toFixed(1),+r.efN.toFixed(1),+r.im.toFixed(1),r.dias,+r.prom.toFixed(1)
      ]),
      ['TOTAL','',...fechas.map(f=>+totDia[f.iso].ef.toFixed(1)),+totalEf.toFixed(1),'','',+totalIm.toFixed(1),'','']
    ]
  };

  el.innerHTML=bar+`
  <div class="kpi-row">
    <div class="kpi" style="--kc:var(--ceq)"><div class="kpi-lbl">Hs Efectivas de la Semana</div><div class="kpi-val" style="font-size:1.5rem">${fmtH(totalEf)}h ${delta(totalEf,totalPrev)}</div></div>
    <div class="kpi" style="--kc:#ef4444"><div class="kpi-lbl">Hs Inoperativas</div><div class="kpi-val" style="font-size:1.5rem">${fmtH(totalIm)}h</div></div>
    <div class="kpi" style="--kc:#06b6d4"><div class="kpi-lbl">Equipos con Partes</div><div class="kpi-val" style="font-size:1.5rem">${rows.length}</div></div>
    <div class="kpi" style="--kc:#10b981"><div class="kpi-lbl">Prom. hs/equipo-día</div><div class="kpi-val" style="font-size:1.5rem">${rows.length?(rows.reduce((s,r)=>s+r.prom,0)/rows.length).toFixed(1):'—'}h</div></div>
  </div>
  ${rows.length?`<div class="card" style="margin-bottom:.9rem"><div class="card-body" style="height:230px;position:relative;padding:.7rem"><canvas id="phChart"></canvas></div></div>`:''}
  <div class="card" style="padding:0">
    <div class="tbl-wrap">
    <table style="min-width:100%;border-collapse:collapse">
      <thead><tr style="background:var(--panel2)">
        <th style="${TH};text-align:left;min-width:130px">Equipo</th>
        ${fechas.map(f=>{const esHoy=f.iso===hoy;return`<th style="${TH};text-align:center;min-width:74px;${esHoy?'color:#f59e0b;background:rgba(245,158,11,.1)':''}">${f.lbl}<div style="font-size:.68rem;font-weight:400;font-family:monospace">${f.dm}</div></th>`;}).join('')}
        <th style="${TH};text-align:right;min-width:100px;color:var(--ceq);background:rgba(249,115,22,.08)">Total Semana<div style="font-size:.55rem;font-weight:400">vs sem. anterior</div></th>
        <th style="${TH};text-align:right" title="Horas inoperativas de la semana">🛑 Inoper.</th>
        <th style="${TH};text-align:center">Días</th>
        <th style="${TH};text-align:right" title="Horas efectivas por día trabajado">Prom h/día</th>
      </tr></thead>
      <tbody>${body||`<tr><td colspan="${fechas.length+5}" style="text-align:center;padding:2.5rem;color:var(--muted2);font-size:.85rem">Sin partes diarios en esta semana (${rango})</td></tr>`}</tbody>
      ${rows.length?`<tfoot><tr style="background:var(--panel2);border-top:2px solid var(--border)">
        <td style="${TD};font-size:.65rem;font-weight:700;color:var(--muted2);text-transform:uppercase">TOTAL DÍA (hs ef.)</td>
        ${fechas.map(f=>{const t=totDia[f.iso];return`<td style="${TD};text-align:right;font-family:monospace;font-weight:900;color:${t.ef?'var(--ceq)':'var(--muted)'}">${t.ef?fmtH(t.ef):'—'}</td>`;}).join('')}
        <td style="${TD};text-align:right;font-family:monospace;font-weight:900;font-size:.85rem;color:var(--ceq);background:rgba(249,115,22,.1)">${fmtH(totalEf)}h</td>
        <td style="${TD};text-align:right;font-family:monospace;font-weight:900;color:#ef4444">${totalIm?fmtH(totalIm)+'h':'—'}</td>
        <td colspan="2"></td>
      </tr></tfoot>`:''}
    </table>
    </div>
  </div>
  <div style="margin-top:.5rem;font-size:.64rem;color:var(--muted2)">Celdas = horas efectivas del día (tooltip: desglose ☀/🌙 e inoperativas) · "+Xi" = horas inoperativas · Prom h/día = hs efectivas ÷ días trabajados (verde ≥8, ámbar ≥5, rojo &lt;5) · ▲▼ compara con la semana anterior</div>`;

  // Gráfico: horas efectivas por día apiladas por línea
  if(rows.length&&typeof Chart!=='undefined'){
    if(_phChart){_phChart.destroy();_phChart=null;}
    const ctx=document.getElementById('phChart');
    if(ctx){
      const colTipo={'Línea Amarilla':'#f59e0b','Línea Blanca':'#06b6d4','Vehículo Menor':'#8b5cf6','Equipos Menores':'#84cc16','Otros':'#6b7280'};
      _phChart=new Chart(ctx,{
        type:'bar',
        data:{
          labels:fechas.map(f=>f.lbl+' '+f.dm),
          datasets:tiposOrden.map(tipo=>({
            label:tipo,
            data:fechas.map(f=>{
              let s=0;grupos[tipo].forEach(r=>{const c=grid[r.id][f.iso];if(c)s+=c.ef;});
              return +s.toFixed(1);
            }),
            backgroundColor:(colTipo[tipo]||'#6b7280')+'CC',
            borderRadius:2,stack:'s'
          }))
        },
        options:{
          responsive:true,maintainAspectRatio:false,
          plugins:{
            legend:{position:'bottom',labels:{color:'#8b93a7',font:{size:9},boxWidth:10}},
            tooltip:{callbacks:{label:c=>c.dataset.label+': '+c.parsed.y.toLocaleString('es-PE')+' h'}},
            title:{display:true,text:'Horas efectivas por día y línea',color:'#8b93a7',font:{size:11}}
          },
          scales:{
            x:{stacked:true,ticks:{color:'#8b93a7',font:{size:9}},grid:{display:false}},
            y:{stacked:true,ticks:{color:'#8b93a7',font:{size:9},callback:v=>v+' h'},grid:{color:'rgba(139,147,167,.12)'},beginAtZero:true}
          }
        }
      });
    }
  }
}

// ── TABS 2 y 3: UTILIZACIÓN (H. Efect ÷ H. Prog) y DISPONIBILIDAD MECÁNICA ((H. Prog − Improd) ÷ H. Prog) · semana + acumulado al corte 21→20 ──
function _phHsProgTurno(){return +(localStorage.getItem('gdar_ph_hsprog')||10);}
function _phSetHsProg(){
  const v=prompt('Horas programadas por parte/turno:',_phHsProgTurno());
  if(v===null)return;
  const n=+String(v).replace(',','.');
  if(!(n>0)){toast('Valor inválido',true);return;}
  localStorage.setItem('gdar_ph_hsprog',n);
  rPanelHoras();
  if(typeof rReporteMensual==='function'&&AP==='reporteMensual')rReporteMensual();
}
function _phRenderUtil(modo){
  const esDM=modo==='dm';
  const el=document.getElementById('phTabBody');if(!el)return;
  const pad=n=>String(n).padStart(2,'0');
  const fmtH=v=>v.toLocaleString('es-PE',{maximumFractionDigits:1});
  const HP=_phHsProgTurno();

  // Semana seleccionada (comparte estado con el tab 1)
  const d0=new Date(_phSemIni+'T12:00:00');
  const fechas=[];
  for(let i=0;i<7;i++){const d=new Date(d0);d.setDate(d0.getDate()+i);fechas.push(`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`);}
  const fIni=fechas[0],fFin=fechas[6];
  const dmy=s=>s.slice(8,10)+'/'+s.slice(5,7);
  const rango=`${dmy(fIni)} – ${dmy(fFin)}`;
  // Nº de semana ISO (según el jueves de la semana del fin)
  const dISO=new Date(fFin+'T12:00:00');
  const jue=new Date(dISO);jue.setDate(dISO.getDate()+(4-(dISO.getDay()||7)));
  const nSem=Math.ceil((((jue-new Date(jue.getFullYear(),0,1))/864e5)+1)/7);
  const semLbl=`${jue.getFullYear()}-S${pad(nSem)} (${rango})`;

  // Corte 21→20 que contiene el fin de la semana
  const dF=new Date(fFin+'T12:00:00');
  const cIniD=dF.getDate()>=21?new Date(dF.getFullYear(),dF.getMonth(),21):new Date(dF.getFullYear(),dF.getMonth()-1,21);
  const cFinD=new Date(cIniD.getFullYear(),cIniD.getMonth()+1,20);
  const isoD=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  const cIni=isoD(cIniD),cFin=isoD(cFinD);
  const corteLbl=`${dmy(cIni)}/${String(cIniD.getFullYear()).slice(2)} al ${dmy(cFin)}/${String(cFinD.getFullYear()).slice(2)}`;
  const aFin=fFin<cFin?fFin:cFin; // acumulado: del 21 hasta el fin de la semana elegida

  // Solo Línea Amarilla y Línea Blanca (menores tienen su propio tab por días)
  const filLinea=(_phTipoFiltro==='Línea Amarilla'||_phTipoFiltro==='Línea Blanca')?_phTipoFiltro:'';
  // Acumular partes por equipo
  const acc={};
  (DB.partes||[]).forEach(function(p){
    if(!p.fecha||!p.eqId)return;
    const eq=(DB.equipos||[]).find(e=>e.id===p.eqId);
    const tipoEq=eq?(eq.tipo||'Otros'):'Otros';
    if(tipoEq!=='Línea Amarilla'&&tipoEq!=='Línea Blanca')return;
    if(filLinea&&tipoEq!==filLinea)return;
    const enSem=p.fecha>=fIni&&p.fecha<=fFin;
    const enAc=p.fecha>=cIni&&p.fecha<=aFin;
    if(!enSem&&!enAc)return;
    if(!acc[p.eqId])acc[p.eqId]={eq,tipo:eq?(eq.tipo||'Otros'):'Otros',semN:0,semEf:0,semIm:0,semDias:new Set(),acN:0,acEf:0,acIm:0};
    const a=acc[p.eqId];
    const ef=Math.max(0,+p.ef||0),im=Math.max(0,+p.im||0);
    if(enSem){a.semN++;a.semEf+=ef;a.semIm+=im;a.semDias.add(p.fecha);}
    if(enAc){a.acN++;a.acEf+=ef;a.acIm+=im;}
  });

  const rows=Object.entries(acc).map(([id,a])=>({id,...a,dias:a.semDias.size,semProg:a.semN*HP,acProg:a.acN*HP}))
    .sort((x,y)=>y.semEf-x.semEf);
  const grupos={};
  rows.forEach(r=>{if(!grupos[r.tipo])grupos[r.tipo]=[];grupos[r.tipo].push(r);});
  const tiposOrden=Object.keys(grupos).sort((a,b)=>grupos[b].reduce((s,r)=>s+r.semEf,0)-grupos[a].reduce((s,r)=>s+r.semEf,0));

  // Semáforo del tab. La utilización se da por buena desde 75 %; la
  // disponibilidad mecánica sigue exigiendo 80 %, que es otro indicador.
  const utilCol=u=>(esDM?u>=80:u>=75)?'#10b981':u>=60?'#f59e0b':'#ef4444';
  // % del tab: Utilización = H.Efect ÷ H.Prog · Disp. Mec. = (H.Prog − Improd) ÷ H.Prog
  const calcPct=(ef,im,prog)=>esDM?(prog-im)/prog*100:ef/prog*100;
  const utilCell=(ef,im,prog,TD)=>{
    if(!prog)return`<td style="${TD};text-align:right;color:var(--muted)">—</td>`;
    const u=calcPct(ef,im,prog);
    return`<td style="${TD};text-align:right;font-family:monospace;font-weight:900;color:${utilCol(u)}">${u.toFixed(1)}%</td>`;
  };

  const TH='padding:.45rem .55rem;font-size:.62rem;text-transform:uppercase;letter-spacing:.06em;color:var(--muted2);white-space:nowrap;border:1px solid var(--border)';
  const TD='padding:.42rem .6rem;border:1px solid var(--border);font-size:.75rem;vertical-align:middle';

  // Barra superior (semana comparte estado/nav con el tab 1)
  const inpS='font-size:.72rem;padding:.2rem .4rem;border-radius:5px;border:1px solid var(--border);background:var(--panel2);color:var(--text);flex-shrink:0';
  const tiposEq=['','Línea Amarilla','Línea Blanca'];
  const bar=`<div style="display:flex;align-items:center;gap:.5rem;flex-wrap:wrap;margin-bottom:.8rem;padding:.4rem .7rem;background:var(--panel2);border:1px solid var(--border);border-radius:8px">
    <span style="font-size:.62rem;color:var(--muted2);font-weight:700;text-transform:uppercase;letter-spacing:.08em">Corte</span>
    <span style="font-size:.7rem;font-family:monospace;font-weight:700;color:#a78bfa;background:rgba(139,92,246,.12);border:1px solid rgba(139,92,246,.35);border-radius:6px;padding:.18rem .55rem;white-space:nowrap">${corteLbl}</span>
    <div style="width:1px;height:18px;background:var(--border)"></div>
    <span style="font-size:.62rem;color:var(--muted2);font-weight:700;text-transform:uppercase;letter-spacing:.08em">Semana</span>
    <button onclick="_phNav(-7)" style="background:none;border:1px solid var(--border);border-radius:5px;color:var(--text);cursor:pointer;font-size:.85rem;padding:.12rem .5rem" title="Semana anterior">‹</button>
    <input type="date" value="${_phSemIni}" onchange="_phSemIni=this.value;rPanelHoras()" style="${inpS};width:135px">
    <button onclick="_phNav(7)" style="background:none;border:1px solid var(--border);border-radius:5px;color:var(--text);cursor:pointer;font-size:.85rem;padding:.12rem .5rem" title="Semana siguiente">›</button>
    <span style="font-size:.72rem;color:var(--ceq);font-weight:700;font-family:monospace;white-space:nowrap">${semLbl}</span>
    <div style="width:1px;height:18px;background:var(--border)"></div>
    <span style="font-size:.62rem;color:var(--muted2);font-weight:700;text-transform:uppercase;letter-spacing:.08em">Línea</span>
    <div style="display:flex;gap:.2rem;flex-wrap:wrap">
      ${tiposEq.map(t=>{
        const sel=filLinea===t;
        return`<button onclick="_phTipoFiltro='${t}';rPanelHoras()" style="font-size:.62rem;padding:.2rem .5rem;border-radius:5px;border:1px solid ${sel?'var(--ceq)':'var(--border)'};background:${sel?'rgba(249,115,22,.15)':'transparent'};color:${sel?'var(--ceq)':'var(--muted2)'};cursor:pointer;white-space:nowrap;font-weight:${sel?'700':'400'}">${t||'Todas'}</button>`;
      }).join('')}
    </div>
    <button onclick="_phSetHsProg()" style="font-size:.62rem;padding:.2rem .5rem;border-radius:5px;border:1px solid var(--border);background:transparent;color:var(--muted2);cursor:pointer;white-space:nowrap" title="Horas programadas por parte/turno">⚙ ${HP}h/turno</button>
    <button onclick="_phSemExport()" style="margin-left:auto;font-size:.7rem;padding:.25rem .7rem;border-radius:5px;border:none;background:#166534;color:#fff;cursor:pointer;font-weight:700;white-space:nowrap">📊 Excel</button>
  </div>`;

  // Filas agrupadas por línea
  let body='';
  tiposOrden.forEach(function(tipo){
    const items=grupos[tipo];
    body+=`<tr><td colspan="8" style="padding:.45rem .7rem;background:rgba(249,115,22,.07);border:1px solid var(--border);color:var(--ceq);font-size:.71rem;font-weight:800;text-transform:uppercase;letter-spacing:.06em">▶ ${tipo} · ${items.length} equipo(s)</td></tr>`;
    items.forEach(function(r){
      body+=`<tr>
        <td style="${TD};white-space:nowrap">
          <span class="mono" style="font-weight:700;color:#06b6d4">${r.eq?r.eq.codigo:'#'+r.id}</span>
          <div style="font-size:.62rem;color:var(--muted2)">${r.eq?((r.eq.sub||'')+' '+(r.eq.marca||'')):''}</div>
        </td>
        <td style="${TD};text-align:center;font-family:monospace">${r.dias||'—'}</td>
        <td style="${TD};text-align:right;font-family:monospace;color:var(--muted2)">${r.semProg?fmtH(r.semProg):'—'}</td>
        <td style="${TD};text-align:right;font-family:monospace;font-weight:700;color:${esDM?(r.semIm?'#ef4444':'var(--muted)'):'var(--text)'}">${r.semN?fmtH(esDM?r.semIm:r.semEf):'—'}</td>
        ${utilCell(r.semEf,r.semIm,r.semProg,TD)}
        <td style="${TD};text-align:right;font-family:monospace;color:var(--muted2);background:rgba(148,163,184,.05)">${r.acProg?fmtH(r.acProg):'—'}</td>
        <td style="${TD};text-align:right;font-family:monospace;font-weight:700;color:${esDM?(r.acIm?'#ef4444':'var(--muted)'):'var(--text)'};background:rgba(148,163,184,.05)">${r.acN?fmtH(esDM?r.acIm:r.acEf):'—'}</td>
        ${utilCell(r.acEf,r.acIm,r.acProg,TD+';background:rgba(148,163,184,.05)')}
      </tr>`;
    });
  });

  // Totales
  const tSemProg=rows.reduce((s,r)=>s+r.semProg,0),tSemEf=rows.reduce((s,r)=>s+r.semEf,0),tSemIm=rows.reduce((s,r)=>s+r.semIm,0);
  const tAcProg=rows.reduce((s,r)=>s+r.acProg,0),tAcEf=rows.reduce((s,r)=>s+r.acEf,0),tAcIm=rows.reduce((s,r)=>s+r.acIm,0);
  const uSem=tSemProg?calcPct(tSemEf,tSemIm,tSemProg):0,uAc=tAcProg?calcPct(tAcEf,tAcIm,tAcProg):0;
  const mLbl=esDM?'Disp. Mec.':'Utiliz.';

  // Exportación
  _phExport={
    name:(esDM?'disponibilidad_mecanica_':'utilizacion_equipos_')+fIni+'.xlsx',
    aoa:[
      [(esDM?'DISPONIBILIDAD MECÁNICA':'UTILIZACIÓN DE EQUIPOS')+' — Semana '+semLbl+' — Corte '+corteLbl+(_phTipoFiltro?' — '+_phTipoFiltro:'')],
      ['Equipo','Línea','Días trab.','Sem H.Prog.',esDM?'Sem H.Inoper.':'Sem H.Efect.','Sem '+mLbl+'%','Acum H.Prog.',esDM?'Acum H.Inoper.':'Acum H.Efect.','Acum '+mLbl+'%'],
      ...rows.map(r=>[
        r.eq?r.eq.codigo:('#'+r.id),r.tipo,r.dias,
        +r.semProg.toFixed(1),+(esDM?r.semIm:r.semEf).toFixed(1),r.semProg?+calcPct(r.semEf,r.semIm,r.semProg).toFixed(1):'',
        +r.acProg.toFixed(1),+(esDM?r.acIm:r.acEf).toFixed(1),r.acProg?+calcPct(r.acEf,r.acIm,r.acProg).toFixed(1):''
      ]),
      ['TOTAL','','',+tSemProg.toFixed(1),+(esDM?tSemIm:tSemEf).toFixed(1),+uSem.toFixed(1),+tAcProg.toFixed(1),+(esDM?tAcIm:tAcEf).toFixed(1),+uAc.toFixed(1)]
    ]
  };

  el.innerHTML=bar+`
  <div class="kpi-row">
    <div class="kpi" style="--kc:${utilCol(uSem)}"><div class="kpi-lbl">${esDM?'Disp. Mecánica':'Utilización'} de la Semana</div><div class="kpi-val" style="font-size:1.5rem;color:${utilCol(uSem)}">${tSemProg?uSem.toFixed(1)+'%':'—'}</div></div>
    <div class="kpi" style="--kc:${utilCol(uAc)}"><div class="kpi-lbl">${esDM?'Disp. Mecánica':'Utilización'} Acum. al Corte</div><div class="kpi-val" style="font-size:1.5rem;color:${utilCol(uAc)}">${tAcProg?uAc.toFixed(1)+'%':'—'}</div></div>
    ${esDM
      ?`<div class="kpi" style="--kc:#ef4444"><div class="kpi-lbl">Hs Inoperativas Semana</div><div class="kpi-val" style="font-size:1.5rem">${fmtH(tSemIm)}h <span style="font-size:.75rem;color:var(--muted2)">/ ${fmtH(tSemProg)}h prog.</span></div></div>`
      :`<div class="kpi" style="--kc:var(--ceq)"><div class="kpi-lbl">Hs Efectivas Semana</div><div class="kpi-val" style="font-size:1.5rem">${fmtH(tSemEf)}h <span style="font-size:.75rem;color:var(--muted2)">/ ${fmtH(tSemProg)}h prog.</span></div></div>`}
    <div class="kpi" style="--kc:#06b6d4"><div class="kpi-lbl">Equipos con Partes</div><div class="kpi-val" style="font-size:1.5rem">${rows.length}</div></div>
  </div>
  <div class="card" style="padding:0">
    <div class="tbl-wrap">
    <table style="min-width:100%;border-collapse:collapse">
      <thead>
        <tr style="background:var(--panel2)">
          <th style="${TH};text-align:left;min-width:140px" rowspan="2">Tipo / Equipo</th>
          <th style="${TH};text-align:center" rowspan="2" title="Días con parte diario en la semana">Días T</th>
          <th style="${TH};text-align:center;background:rgba(59,130,246,.10);color:#60a5fa" colspan="3">Semana (${rango})</th>
          <th style="${TH};text-align:center;background:rgba(148,163,184,.08)" colspan="3">Acum. al Corte</th>
        </tr>
        <tr style="background:var(--panel2)">
          <th style="${TH};text-align:right;background:rgba(59,130,246,.06)">H. Prog.</th>
          <th style="${TH};text-align:right;background:rgba(59,130,246,.06)">${esDM?'H. Inoper.':'H. Efect.'}</th>
          <th style="${TH};text-align:right;background:rgba(59,130,246,.06)">${mLbl} %</th>
          <th style="${TH};text-align:right;background:rgba(148,163,184,.05)">H. Prog.</th>
          <th style="${TH};text-align:right;background:rgba(148,163,184,.05)">${esDM?'H. Inoper.':'H. Efect.'}</th>
          <th style="${TH};text-align:right;background:rgba(148,163,184,.05)">${mLbl} %</th>
        </tr>
      </thead>
      <tbody>${body||`<tr><td colspan="8" style="text-align:center;padding:2.5rem;color:var(--muted2);font-size:.85rem">Sin partes diarios en esta semana (${rango}) ni en el corte (${corteLbl})</td></tr>`}</tbody>
      ${rows.length?`<tfoot><tr style="background:var(--panel2);border-top:2px solid var(--border)">
        <td style="${TD};font-size:.65rem;font-weight:700;color:var(--muted2);text-transform:uppercase">TOTAL GENERAL</td>
        <td style="${TD}"></td>
        <td style="${TD};text-align:right;font-family:monospace;font-weight:900;color:var(--muted2)">${fmtH(tSemProg)}</td>
        <td style="${TD};text-align:right;font-family:monospace;font-weight:900;color:${esDM?'#ef4444':'var(--ceq)'}">${fmtH(esDM?tSemIm:tSemEf)}</td>
        ${utilCell(tSemEf,tSemIm,tSemProg,TD)}
        <td style="${TD};text-align:right;font-family:monospace;font-weight:900;color:var(--muted2)">${fmtH(tAcProg)}</td>
        <td style="${TD};text-align:right;font-family:monospace;font-weight:900;color:${esDM?'#ef4444':'var(--ceq)'}">${fmtH(esDM?tAcIm:tAcEf)}</td>
        ${utilCell(tAcEf,tAcIm,tAcProg,TD)}
      </tr></tfoot>`:''}
    </table>
    </div>
  </div>
  <div style="margin-top:.5rem;font-size:.64rem;color:var(--muted2);display:flex;gap:1rem;flex-wrap:wrap;align-items:center">
    <span><span style="color:#10b981">●</span> ≥${esDM?'80':'75'}% — Bueno</span>
    <span><span style="color:#f59e0b">●</span> 60–${esDM?'79':'74'}% — Alerta</span>
    <span><span style="color:#ef4444">●</span> &lt;60% — Crítico</span>
  </div>`;
}

// ── TAB 4: DISPONIBILIDAD MENORES (Vehículos y Equipos Menores · por días del corte) ──
// Disp. = (días operativos − días inoperativos) ÷ días del período (semana=7 · corte=30/31)
function _phRenderMenores(){
  const el=document.getElementById('phTabBody');if(!el)return;
  const pad=n=>String(n).padStart(2,'0');

  // Semana seleccionada (comparte estado con los demás tabs)
  const d0=new Date(_phSemIni+'T12:00:00');
  const fechas=[];
  for(let i=0;i<7;i++){const d=new Date(d0);d.setDate(d0.getDate()+i);fechas.push(`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`);}
  const fIni=fechas[0],fFin=fechas[6];
  const dmy=s=>s.slice(8,10)+'/'+s.slice(5,7);
  const rango=`${dmy(fIni)} – ${dmy(fFin)}`;
  const dISO=new Date(fFin+'T12:00:00');
  const jue=new Date(dISO);jue.setDate(dISO.getDate()+(4-(dISO.getDay()||7)));
  const nSem=Math.ceil((((jue-new Date(jue.getFullYear(),0,1))/864e5)+1)/7);
  const semLbl=`${jue.getFullYear()}-S${pad(nSem)} (${rango})`;

  // Corte 21→20 que contiene el fin de la semana
  const dF=new Date(fFin+'T12:00:00');
  const cIniD=dF.getDate()>=21?new Date(dF.getFullYear(),dF.getMonth(),21):new Date(dF.getFullYear(),dF.getMonth()-1,21);
  const cFinD=new Date(cIniD.getFullYear(),cIniD.getMonth()+1,20);
  const isoD=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  const cIni=isoD(cIniD),cFin=isoD(cFinD);
  const corteLbl=`${dmy(cIni)}/${String(cIniD.getFullYear()).slice(2)} al ${dmy(cFin)}/${String(cFinD.getFullYear()).slice(2)}`;
  const diasCorte=Math.round((cFinD-cIniD)/864e5)+1; // 30 o 31 días

  // Solo Vehículos Menores y Equipos Menores
  const TIPOS_MEN=['Vehículo Menor','Equipos Menores'];
  const filMen=TIPOS_MEN.includes(_phTipoFiltro)?_phTipoFiltro:'';

  // Clasificar cada parte por su condición: inoperativo puro resta, el resto (trabajado/standby/mixto) es operativo
  const esInop=p=>String(p.condicion||'').toUpperCase().startsWith('INOPERATIVO');

  // acc[eqId] = {eq,tipo, sem:{fecha:{op,inop}}, cor:{fecha:{op,inop}}}
  const acc={};
  (DB.partes||[]).forEach(function(p){
    if(!p.fecha||!p.eqId)return;
    const eq=(DB.equipos||[]).find(e=>e.id===p.eqId);
    const tipoEq=eq?(eq.tipo||''):'';
    if(!TIPOS_MEN.includes(tipoEq))return;
    if(filMen&&tipoEq!==filMen)return;
    const enSem=p.fecha>=fIni&&p.fecha<=fFin;
    const enCor=p.fecha>=cIni&&p.fecha<=cFin;
    if(!enSem&&!enCor)return;
    if(!acc[p.eqId])acc[p.eqId]={eq,tipo:tipoEq,sem:{},cor:{}};
    const a=acc[p.eqId];
    const marca=obj=>{
      if(!obj[p.fecha])obj[p.fecha]={op:false,inop:false};
      if(esInop(p))obj[p.fecha].inop=true;else obj[p.fecha].op=true;
    };
    if(enSem)marca(a.sem);
    if(enCor)marca(a.cor);
  });

  // Un día cuenta como operativo si tuvo al menos un parte operativo; inoperativo solo si todos sus partes fueron inoperativos
  const cuenta=obj=>{
    let op=0,inop=0;
    Object.values(obj).forEach(d=>{if(d.op)op++;else if(d.inop)inop++;});
    return{op,inop};
  };
  const rows=Object.entries(acc).map(([id,a])=>{
    const s=cuenta(a.sem),c=cuenta(a.cor);
    return{id,eq:a.eq,tipo:a.tipo,semOp:s.op,semInop:s.inop,corOp:c.op,corInop:c.inop};
  }).sort((x,y)=>y.corOp-x.corOp);

  const grupos={};
  rows.forEach(r=>{if(!grupos[r.tipo])grupos[r.tipo]=[];grupos[r.tipo].push(r);});
  const tiposOrden=Object.keys(grupos).sort();

  const utilCol=u=>u>=80?'#10b981':u>=60?'#f59e0b':'#ef4444';
  const dispPct=(op,inop,dias)=>Math.max(0,(op-inop)/dias*100);
  const dispCell=(op,inop,dias,TD)=>{
    if(!op&&!inop)return`<td style="${TD};text-align:right;color:var(--muted)">—</td>`;
    const u=dispPct(op,inop,dias);
    return`<td style="${TD};text-align:right;font-family:monospace;font-weight:900;color:${utilCol(u)}">${u.toFixed(1)}%</td>`;
  };

  const TH='padding:.45rem .55rem;font-size:.62rem;text-transform:uppercase;letter-spacing:.06em;color:var(--muted2);white-space:nowrap;border:1px solid var(--border)';
  const TD='padding:.42rem .6rem;border:1px solid var(--border);font-size:.75rem;vertical-align:middle';

  // Barra superior
  const inpS='font-size:.72rem;padding:.2rem .4rem;border-radius:5px;border:1px solid var(--border);background:var(--panel2);color:var(--text);flex-shrink:0';
  const tiposEq=['',...TIPOS_MEN];
  const bar=`<div style="display:flex;align-items:center;gap:.5rem;flex-wrap:wrap;margin-bottom:.8rem;padding:.4rem .7rem;background:var(--panel2);border:1px solid var(--border);border-radius:8px">
    <span style="font-size:.62rem;color:var(--muted2);font-weight:700;text-transform:uppercase;letter-spacing:.08em">Corte</span>
    <span style="font-size:.7rem;font-family:monospace;font-weight:700;color:#a78bfa;background:rgba(139,92,246,.12);border:1px solid rgba(139,92,246,.35);border-radius:6px;padding:.18rem .55rem;white-space:nowrap">${corteLbl} · ${diasCorte} días</span>
    <div style="width:1px;height:18px;background:var(--border)"></div>
    <span style="font-size:.62rem;color:var(--muted2);font-weight:700;text-transform:uppercase;letter-spacing:.08em">Semana</span>
    <button onclick="_phNav(-7)" style="background:none;border:1px solid var(--border);border-radius:5px;color:var(--text);cursor:pointer;font-size:.85rem;padding:.12rem .5rem" title="Semana anterior">‹</button>
    <input type="date" value="${_phSemIni}" onchange="_phSemIni=this.value;rPanelHoras()" style="${inpS};width:135px">
    <button onclick="_phNav(7)" style="background:none;border:1px solid var(--border);border-radius:5px;color:var(--text);cursor:pointer;font-size:.85rem;padding:.12rem .5rem" title="Semana siguiente">›</button>
    <span style="font-size:.72rem;color:var(--ceq);font-weight:700;font-family:monospace;white-space:nowrap">${semLbl}</span>
    <div style="width:1px;height:18px;background:var(--border)"></div>
    <span style="font-size:.62rem;color:var(--muted2);font-weight:700;text-transform:uppercase;letter-spacing:.08em">Tipo</span>
    <div style="display:flex;gap:.2rem;flex-wrap:wrap">
      ${tiposEq.map(t=>{
        const sel=filMen===t;
        return`<button onclick="_phTipoFiltro='${t}';rPanelHoras()" style="font-size:.62rem;padding:.2rem .5rem;border-radius:5px;border:1px solid ${sel?'var(--ceq)':'var(--border)'};background:${sel?'rgba(249,115,22,.15)':'transparent'};color:${sel?'var(--ceq)':'var(--muted2)'};cursor:pointer;white-space:nowrap;font-weight:${sel?'700':'400'}">${t||'Todos'}</button>`;
      }).join('')}
    </div>
    <button onclick="_phSemExport()" style="margin-left:auto;font-size:.7rem;padding:.25rem .7rem;border-radius:5px;border:none;background:#166534;color:#fff;cursor:pointer;font-weight:700;white-space:nowrap">📊 Excel</button>
  </div>`;

  // Filas agrupadas por tipo
  let body='';
  tiposOrden.forEach(function(tipo){
    const items=grupos[tipo];
    body+=`<tr><td colspan="8" style="padding:.45rem .7rem;background:rgba(249,115,22,.07);border:1px solid var(--border);color:var(--ceq);font-size:.71rem;font-weight:800;text-transform:uppercase;letter-spacing:.06em">▶ ${tipo} · ${items.length} equipo(s)</td></tr>`;
    items.forEach(function(r){
      body+=`<tr>
        <td style="${TD};white-space:nowrap">
          <span class="mono" style="font-weight:700;color:#06b6d4">${r.eq?r.eq.codigo:'#'+r.id}</span>
          <div style="font-size:.62rem;color:var(--muted2)">${r.eq?((r.eq.sub||'')+' '+(r.eq.marca||'')):''}</div>
        </td>
        <td style="${TD};text-align:right;font-family:monospace;font-weight:700;color:#10b981">${r.semOp||'—'}</td>
        <td style="${TD};text-align:right;font-family:monospace;font-weight:700;color:${r.semInop?'#ef4444':'var(--muted)'}">${r.semInop||'—'}</td>
        ${dispCell(r.semOp,r.semInop,7,TD)}
        <td style="${TD};text-align:right;font-family:monospace;font-weight:700;color:#10b981;background:rgba(148,163,184,.05)">${r.corOp||'—'}</td>
        <td style="${TD};text-align:right;font-family:monospace;font-weight:700;color:${r.corInop?'#ef4444':'var(--muted)'};background:rgba(148,163,184,.05)">${r.corInop||'—'}</td>
        <td style="${TD};text-align:center;font-family:monospace;color:var(--muted2);background:rgba(148,163,184,.05)">${diasCorte}</td>
        ${dispCell(r.corOp,r.corInop,diasCorte,TD+';background:rgba(148,163,184,.05)')}
      </tr>`;
    });
  });

  // Totales
  const tSemOp=rows.reduce((s,r)=>s+r.semOp,0),tSemInop=rows.reduce((s,r)=>s+r.semInop,0);
  const tCorOp=rows.reduce((s,r)=>s+r.corOp,0),tCorInop=rows.reduce((s,r)=>s+r.corInop,0);
  const n=rows.length;
  const uSem=n?dispPct(tSemOp,tSemInop,n*7):0;
  const uCor=n?dispPct(tCorOp,tCorInop,n*diasCorte):0;

  // Exportación
  _phExport={
    name:'disponibilidad_menores_'+fIni+'.xlsx',
    aoa:[
      ['DISPONIBILIDAD VEHÍCULOS Y EQUIPOS MENORES — Semana '+semLbl+' — Corte '+corteLbl+' ('+diasCorte+' días)'+(filMen?' — '+filMen:'')],
      ['Equipo','Tipo','Sem D.Oper.','Sem D.Inop.','Sem Disp.%','Corte D.Oper.','Corte D.Inop.','Días Corte','Corte Disp.%'],
      ...rows.map(r=>[
        r.eq?r.eq.codigo:('#'+r.id),r.tipo,
        r.semOp,r.semInop,+dispPct(r.semOp,r.semInop,7).toFixed(1),
        r.corOp,r.corInop,diasCorte,+dispPct(r.corOp,r.corInop,diasCorte).toFixed(1)
      ]),
      ['TOTAL','',tSemOp,tSemInop,+uSem.toFixed(1),tCorOp,tCorInop,'',+uCor.toFixed(1)]
    ]
  };

  el.innerHTML=bar+`
  <div class="kpi-row">
    <div class="kpi" style="--kc:${utilCol(uSem)}"><div class="kpi-lbl">Disponibilidad de la Semana</div><div class="kpi-val" style="font-size:1.5rem;color:${utilCol(uSem)}">${n?uSem.toFixed(1)+'%':'—'}</div></div>
    <div class="kpi" style="--kc:${utilCol(uCor)}"><div class="kpi-lbl">Disponibilidad del Corte</div><div class="kpi-val" style="font-size:1.5rem;color:${utilCol(uCor)}">${n?uCor.toFixed(1)+'%':'—'}</div></div>
    <div class="kpi" style="--kc:#ef4444"><div class="kpi-lbl">Días Inoperativos (Corte)</div><div class="kpi-val" style="font-size:1.5rem">${tCorInop}</div></div>
    <div class="kpi" style="--kc:#06b6d4"><div class="kpi-lbl">Equipos con Partes</div><div class="kpi-val" style="font-size:1.5rem">${n}</div></div>
  </div>
  <div class="card" style="padding:0">
    <div class="tbl-wrap">
    <table style="min-width:100%;border-collapse:collapse">
      <thead>
        <tr style="background:var(--panel2)">
          <th style="${TH};text-align:left;min-width:140px" rowspan="2">Tipo / Equipo</th>
          <th style="${TH};text-align:center;background:rgba(59,130,246,.10);color:#60a5fa" colspan="3">Semana (${rango}) · 7 días</th>
          <th style="${TH};text-align:center;background:rgba(148,163,184,.08)" colspan="4">Corte (${corteLbl})</th>
        </tr>
        <tr style="background:var(--panel2)">
          <th style="${TH};text-align:right;background:rgba(59,130,246,.06)" title="Días con parte operativo (trabajado, standby o mixto)">D. Oper.</th>
          <th style="${TH};text-align:right;background:rgba(59,130,246,.06)" title="Días con parte inoperativo (falla mecánica)">D. Inop.</th>
          <th style="${TH};text-align:right;background:rgba(59,130,246,.06)">Disp. %</th>
          <th style="${TH};text-align:right;background:rgba(148,163,184,.05)">D. Oper.</th>
          <th style="${TH};text-align:right;background:rgba(148,163,184,.05)">D. Inop.</th>
          <th style="${TH};text-align:center;background:rgba(148,163,184,.05)">Días Corte</th>
          <th style="${TH};text-align:right;background:rgba(148,163,184,.05)">Disp. %</th>
        </tr>
      </thead>
      <tbody>${body||`<tr><td colspan="8" style="text-align:center;padding:2.5rem;color:var(--muted2);font-size:.85rem">Sin partes de Vehículos/Equipos Menores en esta semana (${rango}) ni en el corte (${corteLbl})</td></tr>`}</tbody>
      ${n?`<tfoot><tr style="background:var(--panel2);border-top:2px solid var(--border)">
        <td style="${TD};font-size:.65rem;font-weight:700;color:var(--muted2);text-transform:uppercase">TOTAL GENERAL</td>
        <td style="${TD};text-align:right;font-family:monospace;font-weight:900;color:#10b981">${tSemOp}</td>
        <td style="${TD};text-align:right;font-family:monospace;font-weight:900;color:${tSemInop?'#ef4444':'var(--muted)'}">${tSemInop||'—'}</td>
        <td style="${TD};text-align:right;font-family:monospace;font-weight:900;color:${utilCol(uSem)}">${uSem.toFixed(1)}%</td>
        <td style="${TD};text-align:right;font-family:monospace;font-weight:900;color:#10b981">${tCorOp}</td>
        <td style="${TD};text-align:right;font-family:monospace;font-weight:900;color:${tCorInop?'#ef4444':'var(--muted)'}">${tCorInop||'—'}</td>
        <td style="${TD};text-align:center;font-family:monospace;color:var(--muted2)">${diasCorte}</td>
        <td style="${TD};text-align:right;font-family:monospace;font-weight:900;color:${utilCol(uCor)}">${uCor.toFixed(1)}%</td>
      </tr></tfoot>`:''}
    </table>
    </div>
  </div>
  <div style="margin-top:.5rem;font-size:.64rem;color:var(--muted2);display:flex;gap:1rem;flex-wrap:wrap;align-items:center">
    <span><span style="color:#10b981">●</span> ≥80% — Bueno</span>
    <span><span style="color:#f59e0b">●</span> 60–79% — Alerta</span>
    <span><span style="color:#ef4444">●</span> &lt;60% — Crítico</span>
    <span style="margin-left:auto">ⓘ Disp. = (D. Oper. − D. Inop.) ÷ días del período (semana = 7 · corte = ${diasCorte}) · D. Oper. = días con parte operativo/standby · D. Inop. = días donde todos los partes fueron INOPERATIVO (falla mecánica) · Total = promedio sobre ${n} equipo(s)</span>
  </div>`;
}

// ── TAB 5: RESUMEN SEMANAL (documento imprimible: utilización, disp. mecánica, transporte, actividades y personal) ──
function _phResumenDoc(){
  const pad=n=>String(n).padStart(2,'0');
  const fmt1=v=>(+v||0).toLocaleString('es-PE',{maximumFractionDigits:1});
  const HP=_phHsProgTurno();

  // Semana + corte (misma lógica de los demás tabs)
  const d0=new Date(_phSemIni+'T12:00:00');
  const fechas=[];const DN=['DOM','LUN','MAR','MIÉ','JUE','VIE','SÁB'];
  for(let i=0;i<7;i++){const d=new Date(d0);d.setDate(d0.getDate()+i);fechas.push({iso:`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`,lbl:DN[d.getDay()],dm:`${pad(d.getDate())}/${pad(d.getMonth()+1)}`});}
  const fIni=fechas[0].iso,fFin=fechas[6].iso;
  const dmy=s=>s.slice(8,10)+'/'+s.slice(5,7)+'/'+s.slice(0,4);
  const dISO=new Date(fFin+'T12:00:00');
  const jue=new Date(dISO);jue.setDate(dISO.getDate()+(4-(dISO.getDay()||7)));
  const nSem=Math.ceil((((jue-new Date(jue.getFullYear(),0,1))/864e5)+1)/7);
  const dF=new Date(fFin+'T12:00:00');
  const cIniD=dF.getDate()>=21?new Date(dF.getFullYear(),dF.getMonth(),21):new Date(dF.getFullYear(),dF.getMonth()-1,21);
  const cFinD=new Date(cIniD.getFullYear(),cIniD.getMonth()+1,20);
  const isoD=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  const cIni=isoD(cIniD),cFin=isoD(cFinD);
  const semTit=`Semana ${jue.getFullYear()}-S${pad(nSem)} · ${dmy(fIni)} al ${dmy(fFin)}`;
  const corteTit=`Corte ${dmy(cIni)} al ${dmy(cFin)}`;

  const cap=typeof _amtCapM3!=='undefined'?(+_amtCapM3||15):15;
  const esInop=p=>String(p.condicion||'').toUpperCase().startsWith('INOPERATIVO');

  // ── Recolectar datos de la semana ──
  const eqLineas={};   // líneas amarilla/blanca: horas
  const menores={};    // menores: días op/inop
  const actividades=[];// {fecha,eqCod,frente,act}
  let viajesD=0,viajesN=0,m3Tot=0;
  const rutas={};
  (DB.partes||[]).forEach(function(p){
    if(!p.fecha||p.fecha<fIni||p.fecha>fFin||!p.eqId)return;
    const eq=(DB.equipos||[]).find(e=>e.id===p.eqId);
    const tipo=eq?(eq.tipo||'Otros'):'Otros';
    const ef=Math.max(0,+p.ef||0),im=Math.max(0,+p.im||0);
    if(tipo==='Línea Amarilla'||tipo==='Línea Blanca'){
      if(!eqLineas[p.eqId])eqLineas[p.eqId]={eq,tipo,n:0,ef:0,im:0,dias:new Set()};
      const r=eqLineas[p.eqId];r.n++;r.ef+=ef;r.im+=im;r.dias.add(p.fecha);
    }else if(tipo==='Vehículo Menor'||tipo==='Equipos Menores'){
      if(!menores[p.eqId])menores[p.eqId]={eq,tipo,days:{}};
      const d=menores[p.eqId].days;
      if(!d[p.fecha])d[p.fecha]={op:false,inop:false};
      if(esInop(p))d[p.fecha].inop=true;else d[p.fecha].op=true;
    }
    const noche=/noche/i.test(p.turno||'');
    (p.viajes||[]).forEach(function(v){
      const c=+v.cant||0;if(!c)return;
      // viajes sin material (campo vacío o el texto "SIN MATERIAL") = cambio de frente: no se consideran en este reporte
      const mat=String(v.material||'').trim();
      if(!mat||/^sin\s*material/i.test(mat))return;
      if(noche)viajesN+=c;else viajesD+=c;
      const m3=c*cap;m3Tot+=m3;
      // Origen del viaje: campo del viaje · si falta, el inicio del tramo
      let ori=String(v.origen||'').trim();
      if(!ori&&v.tramoId){const tr=(DB.tramos||[]).find(t=>t.id==v.tramoId);ori=tr?(tr.inicio||''):'';}
      ori=ori||'(sin origen)';
      const k=ori+'||'+(v.destino||'(sin destino)')+'||'+v.material;
      if(!rutas[k])rutas[k]={origen:ori,destino:v.destino||'(sin destino)',material:v.material,viajes:0,m3:0};
      rutas[k].viajes+=c;rutas[k].m3+=m3;
    });
  });
  const viajesTot=viajesD+viajesN;

  // Líneas: filas + totales (orden: línea → subtipo → código)
  const _subOf=r=>String((r.eq&&r.eq.sub)||'').toUpperCase();
  const _codOf=r=>String((r.eq&&r.eq.codigo)||'');
  const _ordEq=(a,b)=>a.tipo!==b.tipo?a.tipo.localeCompare(b.tipo):(_subOf(a)!==_subOf(b)?_subOf(a).localeCompare(_subOf(b)):_codOf(a).localeCompare(_codOf(b)));
  const filasEq=Object.entries(eqLineas).map(([id,r])=>({id,...r,dias:r.dias.size,prog:r.n*HP})).sort(_ordEq);
  const tProg=filasEq.reduce((s,r)=>s+r.prog,0),tEf=filasEq.reduce((s,r)=>s+r.ef,0),tIm=filasEq.reduce((s,r)=>s+r.im,0);
  const uSem=tProg?tEf/tProg*100:0;
  const dmSem=tProg?(tProg-tIm)/tProg*100:0;

  // Menores: filas + total
  const filasMen=Object.entries(menores).map(([id,a])=>{
    let op=0,inop=0;Object.values(a.days).forEach(d=>{if(d.op)op++;else if(d.inop)inop++;});
    return{id,eq:a.eq,tipo:a.tipo,op,inop,disp:Math.max(0,(op-inop)/7*100)};
  }).sort(_ordEq);
  const nMen=filasMen.length;
  const dispMen=nMen?Math.max(0,(filasMen.reduce((s,r)=>s+r.op,0)-filasMen.reduce((s,r)=>s+r.inop,0))/(nMen*7)*100):0;

  // Personal de la semana (tareaje: TD/TN/DLT trabajado · A5 ingreso nuevo)
  const TIPOS_ASIS=['TD','TN','DLT','A5'];
  const tarSem=(DB.tareaje||[]).filter(r=>r.fecha>=fIni&&r.fecha<=fFin&&TIPOS_ASIS.includes(r.tipo));
  const perDia={};fechas.forEach(f=>perDia[f.iso]=new Set());
  tarSem.forEach(r=>{if(perDia[r.fecha])perDia[r.fecha].add(r.personalId);});
  const personasSem=new Set(tarSem.map(r=>r.personalId)).size;
  const a5Map={};
  tarSem.filter(r=>r.tipo==='A5').forEach(r=>{if(!a5Map[r.personalId]||r.fecha<a5Map[r.personalId])a5Map[r.personalId]=r.fecha;});
  const ingresos=Object.entries(a5Map).map(([pid,fecha])=>{
    const per=(DB.personal||[]).find(x=>x.id==pid);
    return{nombre:per?`${per.ape}, ${per.nom}`:('#'+pid),cargo:per?(per.cargo||'—'):'—',guardia:per?(per.guardia||'—'):'—',fecha};
  }).sort((a,b)=>a.fecha<b.fecha?-1:1);
  // Ingresos A5 agrupados por cargo (sin nombres)
  const porCargo={};
  ingresos.forEach(i=>{porCargo[i.cargo]=(porCargo[i.cargo]||0)+1;});
  const cargosArr=Object.entries(porCargo).sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]));
  // Conteo por tipo de tareaje y día (todos los tipos: TD, TN, DL, DM, etc.)
  const tiposDia={};
  (DB.tareaje||[]).forEach(r=>{
    if(!r.fecha||r.fecha<fIni||r.fecha>fFin||!r.tipo)return;
    if(!tiposDia[r.tipo])tiposDia[r.tipo]={};
    tiposDia[r.tipo][r.fecha]=(tiposDia[r.tipo][r.fecha]||0)+1;
  });

  // ── Gráficos del documento (se convierten a imagen PNG para que salgan en el PDF) ──
  // RETRO va antes que EXCAVADORA (RETROEXCAVADORA contiene "EXCAVADORA") · subtipos no mapeados reciben color propio de la paleta
  const SUBCOL_DOC={'RETRO':'#f59e0b','EXCAVADORA':'#ef4444','CARGADOR':'#a855f7','MOTONIVELADORA':'#10b981','TRACTOR':'#06b6d4','RODILLO':'#84cc16','VOLQUETE':'#3b82f6','CISTERNA':'#0ea5e9'};
  const _palDoc=['#ec4899','#eab308','#14b8a6','#f97316','#6366f1','#a3e635','#e11d48','#0284c7'];
  const _asigDoc={};let _piDoc=0;
  const subColDoc=s=>{s=(s||'').toUpperCase();for(const k in SUBCOL_DOC)if(s.includes(k))return SUBCOL_DOC[k];if(!_asigDoc[s])_asigDoc[s]=_palDoc[_piDoc++%_palDoc.length];return _asigDoc[s];};
  const diasCorteN=Math.round((cFinD-cIniD)/864e5)+1;
  // Meta semanal prorrateada POR EQUIPO: meta del corte (Hrs Mín. Venta · Exc/Vol 210h · resto 180h) × 7 ÷ días del corte
  const metaSemDe=eq=>Math.round((typeof _rmMetaDe==='function'?_rmMetaDe(eq):180)*7/diasCorteN);
  // Plugin: etiquetas de valor sobre cada barra
  const vlBarras={id:'vlBarras',afterDatasetsDraw(chart){
    const ctx=chart.ctx;const di=chart.data.datasets.length-1;
    const meta=chart.getDatasetMeta(di);if(!meta)return;
    ctx.save();ctx.fillStyle='#1e3a5f';ctx.font='bold 10px Arial';ctx.textAlign='center';
    meta.data.forEach((bar,i)=>{const v=chart.data.datasets[di].data[i];if(v!=null)ctx.fillText((+v).toLocaleString('es-PE'),bar.x,bar.y-4);});
    // Valor de la meta sobre la línea punteada: al inicio y en cada quiebre
    const dsL=chart.data.datasets[0];
    if(dsL&&dsL.type==='line'){
      const dmL=chart.getDatasetMeta(0);
      if(dmL){
        ctx.fillStyle='#dc2626';ctx.font='bold 9px Arial';
        dmL.data.forEach((pt,i)=>{
          const v=dsL.data[i];if(v==null)return;
          if(i===0||v!==dsL.data[i-1])ctx.fillText((+v).toLocaleString('es-PE')+'h',pt.x,pt.y-6);
        });
      }
    }
    ctx.restore();
  }};
  const chartImg=(items,titulo)=>{
    if(typeof Chart==='undefined'||!items.length)return'';
    const cv=document.createElement('canvas');cv.width=980;cv.height=430;
    const ch=new Chart(cv.getContext('2d'),{
      type:'bar',
      data:{
        labels:items.map(r=>r.eq?r.eq.codigo:'#'+r.id),
        datasets:[
          {type:'line',label:'Meta',data:items.map(r=>metaSemDe(r.eq)),borderColor:'#dc2626',borderDash:[6,4],borderWidth:2,pointRadius:0,stepped:'middle'},
          {label:'Horas',data:items.map(r=>+r.ef.toFixed(1)),backgroundColor:items.map(r=>subColDoc(r.eq?r.eq.sub:'')),borderRadius:3}
        ]
      },
      options:{responsive:false,animation:false,devicePixelRatio:2,
        layout:{padding:{top:14}},
        plugins:{legend:{display:false},title:{display:true,text:titulo,color:'#1e3a5f',font:{size:13,weight:'bold'}}},
        scales:{
          x:{ticks:{color:'#333',font:{size:9,weight:'bold'}},grid:{display:false}},
          y:{beginAtZero:true,ticks:{color:'#333',font:{size:9},callback:v=>v+' h'},grid:{color:'#ddd'}}
        }},
      plugins:[vlBarras]
    });
    const url=cv.toDataURL('image/png');
    ch.destroy();
    return url;
  };
  const ordCod=(a,b)=>String(a.eq?a.eq.codigo:'').localeCompare(String(b.eq?b.eq.codigo:''));
  const chLA=filasEq.filter(r=>r.tipo==='Línea Amarilla').slice().sort(ordCod);
  const chVol=filasEq.filter(r=>String((r.eq&&r.eq.sub)||'').toUpperCase().includes('VOLQUETE')).slice().sort(ordCod);
  const imgLA=chartImg(chLA,'HORAS EFECTIVAS LÍNEA AMARILLA — SEMANA');
  const imgVol=chartImg(chVol,'HORAS EFECTIVAS VOLQUETES — SEMANA');
  const chartsHtml=(imgLA||imgVol)?`<div style="display:flex;flex-direction:column;gap:8px;margin-top:10px">
    ${imgLA?`<div style="border:1px solid #ccc;border-radius:6px;padding:4px;background:#fff;page-break-inside:avoid"><img src="${imgLA}" style="width:100%;display:block"></div>`:''}
    ${imgVol?`<div style="border:1px solid #ccc;border-radius:6px;padding:4px;background:#fff;page-break-inside:avoid"><img src="${imgVol}" style="width:100%;display:block"></div>`:''}
  </div>
  <div style="font-size:8.5px;color:#666;margin-top:2px">Barras = horas efectivas de la semana por equipo (color según subtipo) · <span style="color:#dc2626">▬ ▬</span> meta semanal prorrateada por equipo = meta del corte (Exc/Vol ${typeof _rmMetaEV==='function'?_rmMetaEV():210}h · resto ${typeof _rmMeta==='function'?_rmMeta():180}h · o su Hrs Mín. Venta) × 7 ÷ ${diasCorteN} días</div>`:'';

  // Gráfico de personal por día (con etiquetas)
  const imgPersonal=(()=>{
    if(typeof Chart==='undefined')return'';
    const vals=fechas.map(f=>perDia[f.iso].size);
    if(!vals.some(v=>v))return'';
    const cv=document.createElement('canvas');cv.width=760;cv.height=300;
    const ch=new Chart(cv.getContext('2d'),{
      type:'bar',
      data:{labels:fechas.map(f=>f.lbl+' '+f.dm),datasets:[{label:'Personas',data:vals,backgroundColor:'#6d28d9CC',borderRadius:3}]},
      options:{responsive:false,animation:false,devicePixelRatio:2,layout:{padding:{top:14}},
        plugins:{legend:{display:false},title:{display:true,text:'PERSONAL POR DÍA — SEMANA',color:'#1e3a5f',font:{size:12,weight:'bold'}}},
        scales:{
          x:{ticks:{color:'#333',font:{size:9,weight:'bold'}},grid:{display:false}},
          y:{beginAtZero:true,ticks:{color:'#333',font:{size:9}},grid:{color:'#ddd'}}
        }},
      plugins:[vlBarras]
    });
    const url=cv.toDataURL('image/png');
    ch.destroy();
    return url;
  })();

  // Gráfico apilado: tipos de tareaje por día (TD, TN, DL, DM, etc.) con etiquetas por segmento
  const imgTipos=(()=>{
    if(typeof Chart==='undefined')return'';
    const ORD=['TD','TN','DLT','A5','DL','P','F','DM','LP','LM','LF','V','R'];
    const tipos=ORD.filter(t=>tiposDia[t]).concat(Object.keys(tiposDia).filter(t=>!ORD.includes(t)).sort());
    if(!tipos.length)return'';
    const TT=typeof _TARE_T!=='undefined'?_TARE_T:{};
    const vlStack={id:'vlStack',afterDatasetsDraw(chart){
      const ctx=chart.ctx;ctx.save();ctx.font='bold 9px Arial';ctx.textAlign='center';
      chart.data.datasets.forEach((ds,di)=>{
        const meta=chart.getDatasetMeta(di);
        meta.data.forEach((bar,i)=>{
          const v=ds.data[i];if(!v)return;
          if(Math.abs(bar.base-bar.y)>=11){ctx.fillStyle=ds._tx||'#fff';ctx.fillText(v,bar.x,(bar.y+bar.base)/2+3);}
        });
      });
      ctx.restore();
    }};
    const cv=document.createElement('canvas');cv.width=760;cv.height=340;
    const ch=new Chart(cv.getContext('2d'),{
      type:'bar',
      data:{
        labels:fechas.map(f=>f.lbl+' '+f.dm),
        datasets:tipos.map(t=>({
          label:t+(TT[t]?' · '+TT[t].l:''),
          _tx:(TT[t]||{}).tx||'#fff',
          data:fechas.map(f=>tiposDia[t][f.iso]||0),
          backgroundColor:(TT[t]||{}).bg||'#6b7280',
          stack:'s',borderRadius:1
        }))
      },
      options:{responsive:false,animation:false,devicePixelRatio:2,
        plugins:{
          legend:{display:true,position:'bottom',labels:{color:'#333',font:{size:8.5},boxWidth:10}},
          title:{display:true,text:'TAREAJE POR DÍA Y TIPO — SEMANA',color:'#1e3a5f',font:{size:12,weight:'bold'}}
        },
        scales:{
          x:{stacked:true,ticks:{color:'#333',font:{size:9,weight:'bold'}},grid:{display:false}},
          y:{stacked:true,beginAtZero:true,ticks:{color:'#333',font:{size:9}},grid:{color:'#ddd'}}
        }},
      plugins:[vlStack]
    });
    const url=cv.toDataURL('image/png');
    ch.destroy();
    return url;
  })();

  const logoUrl=new URL('09.-ERP/Imagenes/ECOSERMO-LOGO.png',location.href).href;

  // ── Documento (estilos para papel blanco) ──
  const AZ='#1e3a5f';
  const semCol=u=>u>=80?'#15803d':u>=60?'#b45309':'#b91c1c';        // disponibilidad
  const utlCol=u=>u>=75?'#15803d':u>=60?'#b45309':'#b91c1c';        // utilización
  const sec=t=>`<div style="font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:.05em;color:${AZ};border-bottom:2px solid ${AZ};padding-bottom:3px;margin:16px 0 6px">${t}</div>`;
  const TH=`padding:4px 7px;font-size:9.5px;background:${AZ};color:#fff;text-transform:uppercase;letter-spacing:.03em;border:1px solid ${AZ}`;
  const TD='padding:3px 7px;font-size:10.5px;border:1px solid #bbb;color:#111';
  const TBL='width:100%;border-collapse:collapse;page-break-inside:auto';
  const kpi=(lbl,val,col)=>`<div style="min-width:0;border:2px solid ${col};border-radius:8px;padding:6px 8px"><div style="font-size:8px;text-transform:uppercase;letter-spacing:.05em;color:#555;font-weight:700">${lbl}</div><div style="font-size:15px;font-weight:900;color:${col};white-space:nowrap">${val}</div></div>`;
  const pct=u=>`<span style="font-weight:900;color:${semCol(u)}">${u.toFixed(1)}%</span>`;
  const pctU=u=>`<span style="font-weight:900;color:${utlCol(u)}">${u.toFixed(1)}%</span>`;

  const grupoRows=(items,mapFila,cols)=>{
    let out='';let last='';
    items.forEach(r=>{
      if(r.tipo!==last){last=r.tipo;out+=`<tr><td colspan="${cols}" style="${TD};background:#e8edf3;font-weight:800;color:${AZ};text-transform:uppercase;font-size:9.5px">${r.tipo}</td></tr>`;}
      out+=mapFila(r);
    });
    return out;
  };

  const rutasArr=Object.values(rutas).sort((a,b)=>b.m3-a.m3||b.viajes-a.viajes);

  // Gráfico de transporte (m³ por destino, barras horizontales) para colocar al costado del cuadro
  const imgTrans=(()=>{
    if(typeof Chart==='undefined'||!rutasArr.length)return'';
    const agg={};rutasArr.forEach(r=>{agg[r.destino]=(agg[r.destino]||0)+r.m3;});
    const ds=Object.entries(agg).filter(([,v])=>v>0).sort((a,b)=>b[1]-a[1]);
    if(!ds.length)return'';
    const cv=document.createElement('canvas');cv.width=560;cv.height=Math.max(240,60+ds.length*34);
    const vlHoriz={id:'vlHoriz',afterDatasetsDraw(chart){
      const ctx=chart.ctx;const meta=chart.getDatasetMeta(0);if(!meta)return;
      ctx.save();ctx.fillStyle='#1e3a5f';ctx.font='bold 10px Arial';ctx.textAlign='left';
      meta.data.forEach((bar,i)=>{const v=chart.data.datasets[0].data[i];if(v!=null)ctx.fillText((+v).toLocaleString('es-PE'),bar.x+4,bar.y+3.5);});
      ctx.restore();
    }};
    const ch=new Chart(cv.getContext('2d'),{
      type:'bar',
      data:{labels:ds.map(d=>d[0]),datasets:[{label:'m³',data:ds.map(d=>+d[1].toFixed(1)),backgroundColor:'#0e7490CC',borderRadius:3}]},
      options:{indexAxis:'y',responsive:false,animation:false,devicePixelRatio:2,
        layout:{padding:{right:44}},
        plugins:{legend:{display:false},title:{display:true,text:'m³ POR DESTINO — SEMANA',color:'#1e3a5f',font:{size:12,weight:'bold'}}},
        scales:{
          x:{beginAtZero:true,ticks:{color:'#333',font:{size:9},callback:v=>v.toLocaleString('es-PE')},grid:{color:'#ddd'}},
          y:{ticks:{color:'#333',font:{size:9,weight:'bold'}},grid:{display:false}}
        }},
      plugins:[vlHoriz]
    });
    const url=cv.toDataURL('image/png');
    ch.destroy();
    return url;
  })();
  const hoyD=new Date();

  return`
  <div style="font-family:Arial,Helvetica,sans-serif;color:#111">
    <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;border-bottom:3px solid ${AZ};padding-bottom:6px">
      <div style="flex:1;font-size:10px;color:#333">
        <div style="font-weight:800;color:${AZ}">${semTit}</div>
        <div>${corteTit}</div>
      </div>
      <div style="flex:2;text-align:center">
        <div style="font-size:19px;font-weight:900;color:${AZ};letter-spacing:.03em">REPORTE SEMANAL</div>
        <div style="font-size:11px;font-weight:800;color:#2563eb;margin-top:2px">RELAVERA R3 COTA 4416: RECRECIMIENTO DEL DIQUE ETAPA 2 FASE 4</div>
      </div>
      <div style="flex:1;text-align:right"><img src="${logoUrl}" alt="ECOSERMO" style="height:46px;max-width:175px;object-fit:contain"></div>
    </div>

    <div style="display:grid;grid-auto-flow:column;grid-auto-columns:1fr;gap:6px;margin-top:10px">
      ${kpi('Utilización Semana',tProg?uSem.toFixed(1)+'%':'—',utlCol(uSem))}
      ${kpi('Disp. Mecánica',tProg?dmSem.toFixed(1)+'%':'—',semCol(dmSem))}
      ${kpi('Hs Efectivas',fmt1(tEf)+'h',AZ)}
      ${kpi('Viajes',viajesTot.toLocaleString(),'#0e7490')}
      ${kpi('Material Transportado',fmt1(m3Tot)+' m³','#0e7490')}
      ${kpi('Personal en Semana',personasSem,'#6d28d9')}
      ${kpi('Ingresos (Anexo 5)',ingresos.length,'#c2410c')}
    </div>

    ${chartsHtml}

    <div style="display:flex;gap:10px;align-items:flex-start">
      <div style="flex:1.45;min-width:0">
        ${sec('1 · Utilización y Disponibilidad Mecánica — Línea Amarilla y Línea Blanca')}
        <table style="${TBL}">
          <tr><th style="${TH};text-align:left">Equipo</th><th style="${TH}">Días</th><th style="${TH}">H. Prog.</th><th style="${TH}">H. Efect.</th><th style="${TH}">Utiliz. %</th><th style="${TH}">H. Inoper.</th><th style="${TH}">Disp. Mec. %</th></tr>
          ${filasEq.length?grupoRows(filasEq,r=>`<tr>
            <td style="${TD};white-space:nowrap"><b>${r.eq?r.eq.codigo:'#'+r.id}</b>${r.eq&&r.eq.placa?` <span style="color:#666;font-size:9px">· ${r.eq.placa}</span>`:''}</td>
            <td style="${TD};text-align:center">${r.dias}</td>
            <td style="${TD};text-align:right">${fmt1(r.prog)}</td>
            <td style="${TD};text-align:right;font-weight:700">${fmt1(r.ef)}</td>
            <td style="${TD};text-align:right">${pctU(r.prog?r.ef/r.prog*100:0)}</td>
            <td style="${TD};text-align:right;color:${r.im?'#b91c1c':'#999'}">${r.im?fmt1(r.im):'—'}</td>
            <td style="${TD};text-align:right">${pct(r.prog?(r.prog-r.im)/r.prog*100:0)}</td>
          </tr>`,7):`<tr><td colspan="7" style="${TD};text-align:center;color:#777">Sin partes diarios de líneas en la semana</td></tr>`}
          ${filasEq.length?`<tr style="background:#e8edf3;font-weight:900">
            <td style="${TD}">TOTAL</td><td style="${TD}"></td>
            <td style="${TD};text-align:right">${fmt1(tProg)}</td>
            <td style="${TD};text-align:right">${fmt1(tEf)}</td>
            <td style="${TD};text-align:right">${pctU(uSem)}</td>
            <td style="${TD};text-align:right;color:${tIm?'#b91c1c':'#999'}">${tIm?fmt1(tIm):'—'}</td>
            <td style="${TD};text-align:right">${pct(dmSem)}</td>
          </tr>`:''}
        </table>
        <div style="font-size:8.5px;color:#666;margin-top:2px">H. Prog. = Nº de partes × ${HP}h · Utiliz. = H. Efect. ÷ H. Prog. · Disp. Mec. = (H. Prog. − H. Inoper.) ÷ H. Prog. · Utiliz.: <span style="color:#15803d">■</span> ≥75% · <span style="color:#b45309">■</span> 60–74% · <span style="color:#b91c1c">■</span> &lt;60% · Disp. Mec.: <span style="color:#15803d">■</span> ≥80% · <span style="color:#b45309">■</span> 60–79% · <span style="color:#b91c1c">■</span> &lt;60%</div>
      </div>
      <div style="flex:1;min-width:0">
        ${sec('2 · Disponibilidad Vehículos y Equipos Menores (por días de la semana)')}
        <table style="${TBL}">
          <tr><th style="${TH};text-align:left">Equipo</th><th style="${TH}">Días Operativos</th><th style="${TH}">Días Inoperativos</th><th style="${TH}">Incidencia S.</th></tr>
          ${filasMen.length?grupoRows(filasMen,r=>`<tr>
            <td style="${TD};white-space:nowrap"><b>${r.eq?r.eq.codigo:'#'+r.id}</b>${r.eq&&r.eq.placa?` <span style="color:#666;font-size:9px">· ${r.eq.placa}</span>`:''}</td>
            <td style="${TD};text-align:center;font-weight:700">${r.op||'—'}</td>
            <td style="${TD};text-align:center;color:${r.inop?'#b91c1c':'#999'}">${r.inop||'—'}</td>
            <td style="${TD};text-align:right">${pct(r.disp)}</td>
          </tr>`,4):`<tr><td colspan="4" style="${TD};text-align:center;color:#777">Sin partes de menores en la semana</td></tr>`}
        </table>
      </div>
    </div>

    <div class="salto-pdf"></div>

    ${sec('3 · Transporte de Material')}
    <div style="display:flex;gap:8px;align-items:flex-start;page-break-inside:avoid">
      <div style="flex:1.25;min-width:0">
        <table style="${TBL}">
          <tr><th style="${TH};text-align:left">Origen</th><th style="${TH};text-align:left">Destino</th><th style="${TH};text-align:left">Material</th><th style="${TH}">Viajes</th><th style="${TH}">m³</th></tr>
          ${rutasArr.length?rutasArr.map(r=>`<tr>
            <td style="${TD};color:${r.origen==='(sin origen)'?'#999':'#111'}">${r.origen}</td>
            <td style="${TD}">${r.destino}</td>
            <td style="${TD}">${r.material}</td>
            <td style="${TD};text-align:right;font-weight:700">${r.viajes.toLocaleString()}</td>
            <td style="${TD};text-align:right;font-weight:700">${r.m3?fmt1(r.m3):'—'}</td>
          </tr>`).join(''):`<tr><td colspan="5" style="${TD};text-align:center;color:#777">Sin viajes con material registrados en la semana</td></tr>`}
          ${rutasArr.length?`<tr style="background:#e8edf3;font-weight:900"><td style="${TD}" colspan="3">TOTAL DE VIAJES -> ☀ ${viajesD.toLocaleString()} día / 🌙 ${viajesN.toLocaleString()} noche</td><td style="${TD};text-align:right">${viajesTot.toLocaleString()}</td><td style="${TD};text-align:right">${fmt1(m3Tot)}</td></tr>`:''}
        </table>
        <div style="font-size:8.5px;color:#666;margin-top:2px">m³ = viajes × ${cap} m³ por tolva </div>
      </div>
      ${imgTrans?`<div style="flex:1;min-width:0;border:1px solid #ccc;border-radius:6px;padding:4px;background:#fff"><img src="${imgTrans}" style="width:100%;display:block"></div>`:''}
    </div>

    ${sec('4 · Personal de la Semana')}
    <div style="display:flex;gap:8px;align-items:flex-start;page-break-inside:avoid">
      <div style="flex:1.6;min-width:0;display:flex;flex-direction:column;gap:8px">
        ${imgPersonal?`<div style="border:1px solid #ccc;border-radius:6px;padding:4px;background:#fff;page-break-inside:avoid"><img src="${imgPersonal}" style="width:100%;display:block"></div>`:''}
        ${imgTipos?`<div style="border:1px solid #ccc;border-radius:6px;padding:4px;background:#fff;page-break-inside:avoid"><img src="${imgTipos}" style="width:100%;display:block"></div>`:''}
      </div>
      <div style="flex:1;min-width:0">
        <div style="border:2px solid #6d28d9;border-radius:8px;padding:6px 12px;margin-bottom:8px"><div style="font-size:8px;text-transform:uppercase;letter-spacing:.05em;color:#555;font-weight:700">Personas distintas en la semana</div><div style="font-size:19px;font-weight:900;color:#6d28d9">${personasSem}</div></div>
        <table style="${TBL}">
          <tr><th style="${TH};text-align:left">Ingresos Anexo 5 — por Cargo</th><th style="${TH}">Cant.</th></tr>
          ${cargosArr.length?cargosArr.map(([c,n])=>`<tr>
            <td style="${TD}">${c}</td>
            <td style="${TD};text-align:center;font-weight:900;color:#c2410c">${n}</td>
          </tr>`).join(''):`<tr><td colspan="2" style="${TD};text-align:center;color:#777">Sin registros A5 — no hubo ingresos nuevos</td></tr>`}
          ${cargosArr.length?`<tr style="background:#e8edf3;font-weight:900"><td style="${TD}">TOTAL INGRESOS</td><td style="${TD};text-align:center;color:#c2410c">${ingresos.length}</td></tr>`:''}
        </table>
      </div>
    </div>
    <div style="font-size:8.5px;color:#666;margin-top:2px">Personas por día según tareaje (TD, TN, DLT y A5) · Ingresos = personas con registro A5 en la semana, agrupadas por cargo</div>

    <div style="margin-top:14px;border-top:1px solid #bbb;padding-top:4px;font-size:8.5px;color:#777;display:flex;justify-content:space-between">
      <span>GDAR</span>
      <span>${semTit}</span>
    </div>
  </div>`;
}

function _phPrintResumen(){
  const win=window.open('','_blank');
  if(!win){toast('Active ventanas emergentes para imprimir',true);return;}
  // Se dibuja al MISMO ancho de la vista previa (1010px) y se escala (zoom) para caber en 210mm:
  // el formato del PDF queda idéntico a lo que se ve en pantalla · .salto-pdf parte el reporte en 2 páginas
  win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Reporte Semanal Horas Máquina</title>
  <style>body{margin:0;background:#fff}*{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}img{max-width:100%}#doc{width:1010px;padding:20px;box-sizing:content-box;zoom:0.7559}.salto-pdf{page-break-after:always;break-after:page;height:0}</style>
  </head><body><div id="doc">${_phResumenDoc()}</div>
  <script>
  window.onload=function(){
    var d=document.getElementById('doc');
    var mk=d.querySelector('.salto-pdf');
    var hpx;
    if(mk){
      var r=d.getBoundingClientRect(),m=mk.getBoundingClientRect();
      var h1=m.bottom-r.top;          // página 1: hasta el salto
      var h2=r.bottom-m.bottom+60;    // página 2: lo que sigue (+ margen)
      hpx=Math.max(h1,h2)+8;
    }else{hpx=d.getBoundingClientRect().height+4;}
    var hmm=Math.ceil(hpx/96*25.4);
    var st=document.createElement('style');
    st.textContent='@page{size:210mm '+hmm+'mm;margin:0}';
    document.head.appendChild(st);
    window.print();
  };
  <${'/'}script></body></html>`);
  win.document.close();
}

function _phRenderResumen(){
  const el=document.getElementById('phTabBody');if(!el)return;
  const inpS='font-size:.72rem;padding:.2rem .4rem;border-radius:5px;border:1px solid var(--border);background:var(--panel2);color:var(--text);flex-shrink:0';
  const bar=`<div style="display:flex;align-items:center;gap:.5rem;flex-wrap:wrap;margin-bottom:.8rem;padding:.4rem .7rem;background:var(--panel2);border:1px solid var(--border);border-radius:8px">
    <span style="font-size:.62rem;color:var(--muted2);font-weight:700;text-transform:uppercase;letter-spacing:.08em">Semana</span>
    <button onclick="_phNav(-7)" style="background:none;border:1px solid var(--border);border-radius:5px;color:var(--text);cursor:pointer;font-size:.85rem;padding:.12rem .5rem" title="Semana anterior">‹</button>
    <input type="date" value="${_phSemIni}" onchange="_phSemIni=this.value;rPanelHoras()" style="${inpS};width:135px">
    <button onclick="_phNav(7)" style="background:none;border:1px solid var(--border);border-radius:5px;color:var(--text);cursor:pointer;font-size:.85rem;padding:.12rem .5rem" title="Semana siguiente">›</button>
    <button onclick="_phSemIni=_phSemDefault();rPanelHoras()" style="font-size:.62rem;padding:.2rem .5rem;border-radius:5px;border:1px solid var(--border);background:transparent;color:var(--muted2);cursor:pointer">Semana actual (Lun)</button>
    <span style="font-size:.62rem;color:var(--muted2)">Vista previa del documento — imprime tal como se ve</span>
    <button onclick="_phPrintResumen()" style="margin-left:auto;font-size:.72rem;padding:.3rem .9rem;border-radius:6px;border:none;background:#b91c1c;color:#fff;cursor:pointer;font-weight:800;white-space:nowrap">🖨 Imprimir / PDF</button>
  </div>`;
  el.innerHTML=bar+`<div style="background:#fff;border-radius:8px;padding:1.1rem 1.4rem;max-width:1050px;box-shadow:0 4px 18px rgba(0,0,0,.45)">${_phResumenDoc()}</div>`;
}

// ══ REPORTE MENSUAL AL CORTE (horas programadas vs ejecutadas · meta mínima · disp. mecánica) ══
let _rmCorteOff=0,_rmSub='',_rmChartLA=null,_rmChartLB=null,_rmExport=null;
function _rmMeta(){return +(localStorage.getItem('gdar_rm_metacorte')||180);}
function _rmMetaEV(){return +(localStorage.getItem('gdar_rm_meta_ev')||210);}
// Meta mensual por equipo: 1º Hrs Mín. Venta del Master · 2º Excavadoras y Volquetes 210h · 3º resto 180h (🎯 configurables)
function _rmMetaDe(eq){
  if(eq&&+eq.hrsMinVenta>0)return +eq.hrsMinVenta;
  const s=String((eq&&eq.sub)||'').toUpperCase();
  const esEV=s.includes('VOLQUETE')||(s.includes('EXCAVADORA')&&!s.includes('RETRO'));
  return esEV?_rmMetaEV():_rmMeta();
}
function _rmSetMeta(){
  const v=prompt('Meta mínima al corte — equipos en general:',_rmMeta());
  if(v===null)return;
  const n=+String(v).replace(',','.');
  if(!(n>0)){toast('Valor inválido',true);return;}
  const v2=prompt('Meta mínima al corte — EXCAVADORAS y VOLQUETES:',_rmMetaEV());
  if(v2===null)return;
  const n2=+String(v2).replace(',','.');
  if(!(n2>0)){toast('Valor inválido',true);return;}
  localStorage.setItem('gdar_rm_metacorte',n);
  localStorage.setItem('gdar_rm_meta_ev',n2);
  rReporteMensual();
}
function _rmNav(d){
  // Navega de semana en semana (mismo estado que Panel de Horas / Resumen Semanal)
  const dd=new Date((_phSemIni||_phSemDefault())+'T12:00:00');
  dd.setDate(dd.getDate()+d*7);
  _phSemIni=dd.toISOString().slice(0,10);
  rReporteMensual();
}
function _rmExportXls(){
  if(!_rmExport||!_rmExport.aoa){toast('Nada que exportar',true);return;}
  if(typeof XLSX==='undefined'){toast('Librería Excel no disponible',true);return;}
  const ws=XLSX.utils.aoa_to_sheet(_rmExport.aoa);
  const wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,ws,'Mensual');
  XLSX.writeFile(wb,_rmExport.name);
}
let _rmSubs=[],_rmHdr=null;
function _rmDatos(){
  const pad=n=>String(n).padStart(2,'0');
  const HP=_phHsProgTurno(),META=_rmMeta();

  // Semana elegida (estado compartido con Panel de Horas / Resumen Semanal)
  if(!_phSemIni)_phSemIni=_phSemDefault();
  const d0=new Date(_phSemIni+'T12:00:00');
  const fechasSem=[];
  for(let i=0;i<7;i++){const d=new Date(d0);d.setDate(d0.getDate()+i);fechasSem.push(`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`);}
  const fIni=fechasSem[0],fFin=fechasSem[6];

  // Corte 21→20 que contiene el fin de la semana elegida
  const dF=new Date(fFin+'T12:00:00');
  const cIniD=dF.getDate()>=21?new Date(dF.getFullYear(),dF.getMonth(),21):new Date(dF.getFullYear(),dF.getMonth()-1,21);
  const cFinD=new Date(cIniD.getFullYear(),cIniD.getMonth()+1,20);
  const isoD=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  const cIni=isoD(cIniD),cFin=isoD(cFinD);
  const diasCorte=Math.round((cFinD-cIniD)/864e5)+1;
  // Avance dinámico: se acumula desde el 21 hasta el FIN DE LA SEMANA elegida (las metas siguen siendo mensuales)
  const aFin=fFin<cFin?fFin:cFin;
  // Ambas fechas a las 12:00 para que la resta dé días exactos (cIniD está a las 00:00)
  const diasTrans=Math.min(diasCorte,Math.max(1,Math.round((new Date(aFin+'T12:00:00')-new Date(cIni+'T12:00:00'))/864e5)+1));

  // Acumular partes del corte hasta la semana elegida (solo Línea Amarilla y Línea Blanca)
  const acc={};
  (DB.partes||[]).forEach(function(p){
    if(!p.fecha||p.fecha<cIni||p.fecha>aFin||!p.eqId)return;
    const eq=(DB.equipos||[]).find(e=>e.id===p.eqId);
    const tipo=eq?(eq.tipo||''):'';
    if(tipo!=='Línea Amarilla'&&tipo!=='Línea Blanca')return;
    if(!acc[p.eqId])acc[p.eqId]={eq,tipo,sub:(eq.sub||'OTROS').toUpperCase(),n:0,ef:0,im:0,dias:new Set()};
    const a=acc[p.eqId];
    a.n++;a.ef+=Math.max(0,+p.ef||0);a.im+=Math.max(0,+p.im||0);a.dias.add(p.fecha);
  });
  const todos=Object.entries(acc).map(([id,a])=>{
    const prog=a.n*HP;
    const imProj=a.im/diasTrans*diasCorte;
    const progBase=diasCorte*HP;
    // Meta por equipo: Hrs Mín. Venta del Master · Excavadoras/Volquetes 210h · resto 180h (🎯 configurables)
    const metaEq=_rmMetaDe(a.eq);
    return{id,eq:a.eq,tipo:a.tipo,sub:a.sub,dias:a.dias.size,ef:a.ef,im:a.im,prog,meta:metaEq,
      avance:metaEq?a.ef/metaEq*100:0,
      util:prog?a.ef/prog*100:0,
      dm:prog?(prog-a.im)/prog*100:0,
      dmProj:Math.max(0,Math.min(100,(progBase-imProj)/progBase*100))};
  });
  _rmSubs=[...new Set(todos.map(r=>r.sub))].sort();
  _rmHdr={cIni,cFin,fIni,fFin,aFin};
  return{HP,META,cIni,cFin,fIni,fFin,aFin,diasCorte,diasTrans,todos};
}

// Documento en hoja blanca (mismo formato que el Resumen Semanal)
function _rmDoc(){
  const{HP,META,cIni,cFin,fIni,fFin,aFin,diasCorte,diasTrans,todos}=_rmDatos();
  const pad=n=>String(n).padStart(2,'0');
  const fmt1=v=>(+v||0).toLocaleString('es-PE',{maximumFractionDigits:1});
  const dmy=s=>s.slice(8,10)+'/'+s.slice(5,7)+'/'+s.slice(0,4);
  const rows=(_rmSub?todos.filter(r=>r.sub===_rmSub):todos)
    .sort((a,b)=>a.sub===b.sub?String(a.eq?a.eq.codigo:'').localeCompare(String(b.eq?b.eq.codigo:'')):a.sub.localeCompare(b.sub));

  // RETRO va antes que EXCAVADORA (RETROEXCAVADORA contiene "EXCAVADORA") · subtipos no mapeados reciben color propio de la paleta
  const SUBCOL={'RETRO':'#f59e0b','EXCAVADORA':'#ef4444','CARGADOR':'#a855f7','MOTONIVELADORA':'#10b981','TRACTOR':'#06b6d4','RODILLO':'#84cc16','VOLQUETE':'#3b82f6','CISTERNA':'#0ea5e9'};
  const _palRm=['#ec4899','#eab308','#14b8a6','#f97316','#6366f1','#a3e635','#e11d48','#0284c7'];
  const _asigRm={};let _piRm=0;
  const subCol=s=>{s=(s||'').toUpperCase();for(const k in SUBCOL)if(s.includes(k))return SUBCOL[k];if(!_asigRm[s])_asigRm[s]=_palRm[_piRm++%_palRm.length];return _asigRm[s];};

  const AZ='#1e3a5f';
  const icoAvance=u=>u>=100?['✓','#15803d']:u>=60?['❗','#b45309']:['✗','#b91c1c'];
  const icoUtil=u=>u>=75?['✓','#15803d']:u>=60?['❗','#b45309']:['✗','#b91c1c'];
  const icoDM=u=>u>=85?['✓','#15803d']:u>=75?['❗','#b45309']:['✗','#b91c1c'];

  const TH=`padding:4px 7px;font-size:9.5px;background:${AZ};color:#fff;text-transform:uppercase;letter-spacing:.03em;border:1px solid ${AZ}`;
  const TD='padding:3px 7px;font-size:10.5px;border:1px solid #bbb;color:#111';
  const TBL='width:100%;border-collapse:collapse;page-break-inside:auto';
  const kpi=(lbl,val,col)=>`<div style="min-width:0;border:2px solid ${col};border-radius:8px;padding:6px 8px"><div style="font-size:8px;text-transform:uppercase;letter-spacing:.05em;color:#555;font-weight:700">${lbl}</div><div style="font-size:15px;font-weight:900;color:${col};white-space:nowrap">${val}</div></div>`;
  const celda=(u,ic)=>{const[i,c]=ic(u);return`<td style="${TD};text-align:right;font-weight:900;color:${c}">${u.toFixed(2)}% ${i}</td>`;};

  // Promedios y GAP por grupo (meta promedio del grupo vs real)
  const grupoStats=filtro=>{
    const g=todos.filter(filtro);
    if(!g.length)return null;
    const prom=g.reduce((s,r)=>s+r.ef,0)/g.length;
    const metaProm=g.reduce((s,r)=>s+r.meta,0)/g.length;
    return{n:g.length,prom,metaProm,gap:prom-metaProm};
  };
  const stLA=grupoStats(r=>r.tipo==='Línea Amarilla');
  const stVol=grupoStats(r=>r.sub.includes('VOLQUETE'));
  const gapTxt=st=>st?`${fmt1(st.prom)}h <span style="font-size:10px;font-weight:800;color:${st.gap>=0?'#15803d':'#b91c1c'}">GAP ${st.gap>=0?'+':''}${fmt1(st.gap)}</span>`:'—';

  // Gráficos PNG (barras con etiquetas + línea punteada de meta)
  const vlBarras={id:'vlBarras',afterDatasetsDraw(chart){
    const ctx=chart.ctx;const di=chart.data.datasets.length-1;
    const meta=chart.getDatasetMeta(di);if(!meta)return;
    ctx.save();ctx.fillStyle='#1e3a5f';ctx.font='bold 10px Arial';ctx.textAlign='center';
    meta.data.forEach((bar,i)=>{const v=chart.data.datasets[di].data[i];if(v!=null)ctx.fillText((+v).toLocaleString('es-PE'),bar.x,bar.y-4);});
    // Valor de la meta sobre la línea punteada: al inicio y en cada quiebre
    const dsL=chart.data.datasets[0];
    if(dsL&&dsL.type==='line'){
      const dmL=chart.getDatasetMeta(0);
      if(dmL){
        ctx.fillStyle='#dc2626';ctx.font='bold 9px Arial';
        dmL.data.forEach((pt,i)=>{
          const v=dsL.data[i];if(v==null)return;
          if(i===0||v!==dsL.data[i-1])ctx.fillText((+v).toLocaleString('es-PE')+'h',pt.x,pt.y-6);
        });
      }
    }
    ctx.restore();
  }};
  const chartImg=(items,titulo)=>{
    if(typeof Chart==='undefined'||!items.length)return'';
    const cv=document.createElement('canvas');cv.width=980;cv.height=430;
    const ch=new Chart(cv.getContext('2d'),{
      type:'bar',
      data:{
        labels:items.map(r=>r.eq?r.eq.codigo:'#'+r.id),
        datasets:[
          {type:'line',label:'Meta',data:items.map(r=>r.meta),borderColor:'#dc2626',borderDash:[6,4],borderWidth:2,pointRadius:0,stepped:'middle'},
          {label:'Horas',data:items.map(r=>+r.ef.toFixed(1)),backgroundColor:items.map(r=>subCol(r.sub)),borderRadius:3}
        ]
      },
      options:{responsive:false,animation:false,devicePixelRatio:2,layout:{padding:{top:14}},
        plugins:{legend:{display:false},title:{display:true,text:titulo,color:'#1e3a5f',font:{size:13,weight:'bold'}}},
        scales:{
          x:{ticks:{color:'#333',font:{size:9,weight:'bold'}},grid:{display:false}},
          y:{beginAtZero:true,ticks:{color:'#333',font:{size:9},callback:v=>v+' h'},grid:{color:'#ddd'}}
        }},
      plugins:[vlBarras]
    });
    const url=cv.toDataURL('image/png');
    ch.destroy();
    return url;
  };
  const ordCod=(a,b)=>String(a.eq?a.eq.codigo:'').localeCompare(String(b.eq?b.eq.codigo:''));
  const imgLA=chartImg(todos.filter(r=>r.tipo==='Línea Amarilla').slice().sort(ordCod),`HORAS ACUMULADAS LÍNEA AMARILLA (${dmy(cIni)} – ${dmy(aFin)})`);
  const imgVol=chartImg(todos.filter(r=>r.sub.includes('VOLQUETE')).slice().sort(ordCod),`HORAS ACUMULADAS VOLQUETES (${dmy(cIni)} – ${dmy(aFin)})`);

  // Filas de la tabla agrupadas por subtipo
  let body='';let lastSub='';
  rows.forEach(function(r){
    if(r.sub!==lastSub){
      lastSub=r.sub;
      const col=subCol(r.sub);
      body+=`<tr><td colspan="8" style="${TD};background:#e8edf3;border-left:4px solid ${col};font-weight:800;color:${AZ};text-transform:uppercase;font-size:9.5px">${r.sub}</td></tr>`;
    }
    body+=`<tr>
      <td style="${TD};white-space:nowrap;padding-left:14px"><b>${r.eq?r.eq.codigo:'#'+r.id}</b>${r.eq&&r.eq.placa?` <span style="color:#666;font-size:9px">· ${r.eq.placa}</span>`:''}</td>
      <td style="${TD};text-align:center">${r.dias}</td>
      <td style="${TD};text-align:right;font-weight:700">${fmt1(r.ef)}</td>
      ${(()=>{const[i,c]=icoAvance(r.avance);return`<td style="${TD};text-align:right;font-weight:900;color:${c}">${r.avance.toFixed(2)}% ${i}<div style="font-weight:400;color:#666;font-size:8px">meta ${fmt1(r.meta)}h</div></td>`;})()}
      ${celda(r.util,icoUtil)}
      <td style="${TD};text-align:right;color:${r.im?'#b91c1c':'#999'}">${r.im?fmt1(r.im):'—'}</td>
      ${celda(r.dm,icoDM)}
      ${celda(r.dmProj,icoDM)}
    </tr>`;
  });

  // Exportación Excel
  _rmExport={
    name:'mensual_corte_'+cIni+'.xlsx',
    aoa:[
      ['REPORTE SEMANAL — AVANCE DEL MES — Corte '+dmy(cIni)+' al '+dmy(cFin)+' — Avance al '+dmy(aFin)+' — Meta mín. '+META+'h'+(_rmSub?' — '+_rmSub:'')],
      ['Subtipo','Equipo','Placa','Días T','Horas trabajadas','Meta Hrs Mín. Venta','% Avance hrs mín-prog.','% Utilización','Hs Inoper.','% Disp. Mec. al corte','% Disp. Mec. proyec. mes'],
      ...rows.map(r=>[
        r.sub,r.eq?r.eq.codigo:('#'+r.id),r.eq?(r.eq.placa||''):'',
        r.dias,+r.ef.toFixed(1),+r.meta.toFixed(1),+r.avance.toFixed(2),+r.util.toFixed(2),+r.im.toFixed(1),+r.dm.toFixed(2),+r.dmProj.toFixed(2)
      ])
    ]
  };

  const hoyD=new Date();
  const logoUrl=new URL('09.-ERP/Imagenes/ECOSERMO-LOGO.png',location.href).href;

  return`
  <div style="font-family:Arial,Helvetica,sans-serif;color:#111">
    <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;border-bottom:3px solid ${AZ};padding-bottom:6px">
      <div style="flex:1;font-size:10px;color:#333">
        <div style="font-weight:800;color:${AZ}">Corte ${dmy(cIni)} al ${dmy(cFin)}</div>
        <div>Avance a la semana: ${dmy(fIni)} – ${dmy(fFin)}</div>
        <div>${diasTrans} de ${diasCorte} días del corte</div>
      </div>
      <div style="flex:2;text-align:center">
        <div style="font-size:19px;font-weight:900;color:${AZ};letter-spacing:.03em">REPORTE SEMANAL — AVANCE DEL MES</div>
        <div style="font-size:11px;font-weight:800;color:#2563eb;margin-top:2px">RELAVERA R3 COTA 4416: RECRECIMIENTO DEL DIQUE ETAPA 2 FASE 4</div>
      </div>
      <div style="flex:1;text-align:right"><img src="${logoUrl}" alt="ECOSERMO" style="height:46px;max-width:175px;object-fit:contain"></div>
    </div>

    <div style="display:grid;grid-auto-flow:column;grid-auto-columns:1fr;gap:6px;margin-top:10px">
      ${kpi('Días del Corte',diasCorte+' <span style="font-size:9px;color:#555">· '+diasTrans+' transc.</span>','#6d28d9')}
      ${kpi('Meta Mín. Horas',META+'h <span style="font-size:9px;color:#555">· Exc/Vol '+_rmMetaEV()+'h</span>','#dc2626')}
      ${kpi('Prom. Real L. Amarilla'+(stLA?' ('+stLA.n+' eq.)':''),gapTxt(stLA),'#b45309')}
      ${kpi('Prom. Real Volquetes'+(stVol?' ('+stVol.n+' eq.)':''),gapTxt(stVol),'#2563eb')}
    </div>

    ${(imgLA||imgVol)?`<div style="display:flex;flex-direction:column;gap:8px;margin-top:10px">
      ${imgLA?`<div style="border:1px solid #ccc;border-radius:6px;padding:4px;background:#fff;page-break-inside:avoid"><img src="${imgLA}" style="width:100%;display:block"></div>`:''}
      ${imgVol?`<div style="border:1px solid #ccc;border-radius:6px;padding:4px;background:#fff;page-break-inside:avoid"><img src="${imgVol}" style="width:100%;display:block"></div>`:''}
    </div>
    <div style="font-size:8.5px;color:#666;margin-top:2px">Barras = horas acumuladas del corte por equipo (color según subtipo) · <span style="color:#dc2626">▬ ▬</span> meta mínima por equipo</div>`:''}

    <div style="font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:.05em;color:${AZ};border-bottom:2px solid ${AZ};padding-bottom:3px;margin:16px 0 6px">Horas Programadas vs Ejecutadas y Disponibilidad Mecánica${_rmSub?' — '+_rmSub:''}</div>
    <table style="${TBL}">
      <tr>
        <th style="${TH};text-align:left">Tipo de Equipo</th>
        <th style="${TH}">Días T</th>
        <th style="${TH}">Horas Trabajadas</th>
        <th style="${TH}">% Avance hrs mín-prog.</th>
        <th style="${TH}">% Utilización</th>
        <th style="${TH}">Hs Inoper.</th>
        <th style="${TH}">% Disp. Mec. al corte</th>
        <th style="${TH}">% Disp. Mec. proyec. mes</th>
      </tr>
      ${body||`<tr><td colspan="8" style="${TD};text-align:center;color:#777">Sin partes diarios en el corte ${dmy(cIni)} al ${dmy(cFin)}</td></tr>`}
    </table>
    <div style="font-size:8.5px;margin-top:2px;display:flex;gap:10px;flex-wrap:wrap">
      <span style="color:#111">Avance: <span style="color:#15803d">✓ ≥100%</span> · <span style="color:#b45309">❗ 60–99%</span> · <span style="color:#b91c1c">✗ &lt;60%</span></span>
      <span style="color:#111">Utilización: <span style="color:#15803d">✓ ≥75%</span> · <span style="color:#b45309">❗ 60–74%</span> · <span style="color:#b91c1c">✗ &lt;60%</span></span>
      <span style="color:#111">Disp. Mec.: <span style="color:#15803d">✓ ≥85%</span> · <span style="color:#b45309">❗ 75–84%</span> · <span style="color:#b91c1c">✗ &lt;75%</span></span>
    </div>

    <div style="margin-top:14px;border-top:1px solid #bbb;padding-top:4px;font-size:8.5px;color:#777;display:flex;justify-content:space-between">
      <span>GDAR</span>
      <span>Corte ${dmy(cIni)} al ${dmy(cFin)}</span>
    </div>
  </div>`;
}

function _rmPrint(){
  const win=window.open('','_blank');
  if(!win){toast('Active ventanas emergentes para imprimir',true);return;}
  // Se dibuja al MISMO ancho de la vista previa (1010px) y se escala (zoom) para caber en 210mm:
  // el formato del PDF queda idéntico a lo que se ve en pantalla · alto ajustado al contenido
  win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Reporte Mensual Horas Máquina</title>
  <style>body{margin:0;background:#fff}*{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}img{max-width:100%}#doc{width:1010px;padding:20px;box-sizing:content-box;zoom:0.7559}</style>
  </head><body><div id="doc">${_rmDoc()}</div>
  <script>
  window.onload=function(){
    var d=document.getElementById('doc');
    var hmm=Math.ceil((d.getBoundingClientRect().height+4)/96*25.4);
    var st=document.createElement('style');
    st.textContent='@page{size:210mm '+hmm+'mm;margin:0}';
    document.head.appendChild(st);
    window.print();
  };
  <${'/'}script></body></html>`);
  win.document.close();
}

function rReporteMensual(){
  const el=document.getElementById('rmBody');if(!el)return;
  const html=_rmDoc(); // genera el documento y actualiza _rmSubs, _rmHdr y _rmExport
  const HP=_phHsProgTurno(),META=_rmMeta();
  const dmy=s=>s.slice(8,10)+'/'+s.slice(5,7)+'/'+s.slice(0,4);
  const inpS='font-size:.72rem;padding:.2rem .4rem;border-radius:5px;border:1px solid var(--border);background:var(--panel2);color:var(--text)';
  const bar=`<div style="display:flex;align-items:center;gap:.5rem;flex-wrap:wrap;margin-bottom:.8rem;padding:.4rem .7rem;background:var(--panel2);border:1px solid var(--border);border-radius:8px">
    <span style="font-size:.62rem;color:var(--muted2);font-weight:700;text-transform:uppercase;letter-spacing:.08em">Semana</span>
    <button onclick="_rmNav(-1)" style="background:none;border:1px solid var(--border);border-radius:5px;color:var(--text);cursor:pointer;font-size:.85rem;padding:.12rem .5rem" title="Semana anterior">‹</button>
    <input type="date" value="${_phSemIni}" onchange="_phSemIni=this.value;rReporteMensual()" style="${inpS};width:135px">
    <button onclick="_rmNav(1)" style="background:none;border:1px solid var(--border);border-radius:5px;color:var(--text);cursor:pointer;font-size:.85rem;padding:.12rem .5rem" title="Semana siguiente">›</button>
    <span style="font-size:.72rem;color:var(--ceq);font-weight:700;font-family:monospace;white-space:nowrap">${dmy(_rmHdr.fIni)} – ${dmy(_rmHdr.fFin)}</span>
    <button onclick="_phSemIni=_phSemDefault();rReporteMensual()" style="font-size:.62rem;padding:.2rem .5rem;border-radius:5px;border:1px solid var(--border);background:transparent;color:var(--muted2);cursor:pointer">Semana actual (Lun)</button>
    <div style="width:1px;height:18px;background:var(--border)"></div>
    <span style="font-size:.62rem;color:var(--muted2);font-weight:700;text-transform:uppercase;letter-spacing:.08em">Corte</span>
    <span style="font-size:.72rem;font-family:monospace;font-weight:700;color:#a78bfa;background:rgba(139,92,246,.12);border:1px solid rgba(139,92,246,.35);border-radius:6px;padding:.18rem .55rem;white-space:nowrap" title="Corte 21→20 que contiene la semana elegida · las horas se acumulan del 21 hasta el fin de la semana">${dmy(_rmHdr.cIni)} al ${dmy(_rmHdr.cFin)} · avance al ${dmy(_rmHdr.aFin)}</span>
    <div style="width:1px;height:18px;background:var(--border)"></div>
    <span style="font-size:.62rem;color:var(--muted2);font-weight:700;text-transform:uppercase;letter-spacing:.08em">Subtipo</span>
    <select onchange="_rmSub=this.value;rReporteMensual()" style="${inpS};max-width:200px">
      <option value="">— Todas —</option>
      ${_rmSubs.map(s=>`<option value="${s}"${_rmSub===s?' selected':''}>${s}</option>`).join('')}
    </select>
    <button onclick="_rmSetMeta()" style="font-size:.62rem;padding:.2rem .5rem;border-radius:5px;border:1px solid var(--border);background:transparent;color:var(--muted2);cursor:pointer;white-space:nowrap" title="Meta mínima de horas al corte: general y Excavadoras/Volquetes">🎯 Meta ${META}h · E/V ${_rmMetaEV()}h</button>
    <button onclick="_phSetHsProg()" style="font-size:.62rem;padding:.2rem .5rem;border-radius:5px;border:1px solid var(--border);background:transparent;color:var(--muted2);cursor:pointer;white-space:nowrap" title="Horas programadas por parte/turno">⚙ ${HP}h/turno</button>
    <button onclick="_rmPrint()" style="margin-left:auto;font-size:.72rem;padding:.3rem .9rem;border-radius:6px;border:none;background:#b91c1c;color:#fff;cursor:pointer;font-weight:800;white-space:nowrap">🖨 Imprimir / PDF</button>
    <button onclick="_rmExportXls()" style="font-size:.7rem;padding:.25rem .7rem;border-radius:5px;border:none;background:#166534;color:#fff;cursor:pointer;font-weight:700;white-space:nowrap">📊 Excel</button>
  </div>`;
  el.innerHTML=bar+`<div style="background:#fff;border-radius:8px;padding:1.1rem 1.4rem;max-width:1050px;box-shadow:0 4px 18px rgba(0,0,0,.45)">${html}</div>`;
}
