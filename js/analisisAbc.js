// ══ ANÁLISIS DE CONSUMO — Almacén y Logística (Pareto ABC + Vista Semanal) ══
// Clasifica los materiales/EPPs según su consumo (salidas de Kardex), por Cantidad o por Valor S/ (cant × P.U.R.)
let _abcMetric='cant'; // 'cant' | 'valor'
let _abcDesde='', _abcHasta='', _abcFiltProy='', _abcFiltTipo='';
let _abcChart=null;
let _abcTab='pareto'; // 'pareto' | 'semana'

function rAnalisisAbc(){_abcRefresh();}
function _abcMainTab(t){
  _abcTab=t;
  const bp=document.getElementById('abcTabBtn-pareto'),bs=document.getElementById('abcTabBtn-semana');
  if(bp){bp.style.background=t==='pareto'?'var(--alm)':'transparent';bp.style.color=t==='pareto'?'#fff':'var(--muted2)';}
  if(bs){bs.style.background=t==='semana'?'var(--alm)':'transparent';bs.style.color=t==='semana'?'#fff':'var(--muted2)';}
  const eb=document.getElementById('abcBody'),es=document.getElementById('abcSemBody');
  if(eb)eb.style.display=t==='pareto'?'':'none';
  if(es)es.style.display=t==='semana'?'':'none';
  _abcRefresh();
}
function _abcRefresh(){
  if(_abcTab==='pareto')_abcRenderPareto();
  else _abcRenderSemana();
}

function _abcKpi(label,val,color){
  return `<div style="background:var(--panel);border:2px solid ${color}55;border-left:4px solid ${color};border-radius:8px;padding:.6rem .8rem">
    <div style="font-size:.58rem;font-weight:700;text-transform:uppercase;letter-spacing:.09em;color:var(--muted2);margin-bottom:.25rem">${label}</div>
    <div style="font-family:'Barlow Condensed',sans-serif;font-size:1.4rem;font-weight:800;color:${color};line-height:1">${val}</div>
  </div>`;
}

function _abcSetMetric(m){_abcMetric=m;_abcRefresh();}
function _abcSetFecha(tipo,val){if(tipo==='desde')_abcDesde=val;else _abcHasta=val;_abcRefresh();}
function _abcLimpiarFecha(){
  _abcDesde='';_abcHasta='';
  const d=document.getElementById('abcFDesde'),h=document.getElementById('abcFHasta');
  if(d)d.value='';if(h)h.value='';
  _abcRefresh();
}
function _abcEnRango(f){
  if(!_abcDesde&&!_abcHasta)return true;
  if(!f)return false;
  if(_abcDesde&&f<_abcDesde)return false;
  if(_abcHasta&&f>_abcHasta)return false;
  return true;
}

// Agrupa las salidas de Kardex por código de material y las enriquece con el catálogo (tipo, P.U.R.)
function _abcDatos(){
  const salidas=(DB.almacen||[]).filter(r=>r.tipo==='S'&&_abcEnRango(r.fecha)&&(!_abcFiltProy||r.codProy===_abcFiltProy));
  const byCod={};
  salidas.forEach(r=>{
    const cod=r.codigo||'(Sin código)';
    if(!byCod[cod])byCod[cod]={codigo:cod,nombre:r.nombre||'',unidad:r.unidad||'',cant:0,movs:0};
    const g=byCod[cod];
    g.cant+=+r.cant||0;
    g.movs++;
    if(!g.nombre&&r.nombre)g.nombre=r.nombre;
  });
  let rows=Object.values(byCod).map(g=>{
    const cat=(DB.catalogoItems||[]).find(c=>c.cod===g.codigo);
    const pur=cat&&cat.pur?+cat.pur:0;
    return{...g,tipo:cat?cat.tipo:'',pur,valor:+(g.cant*pur).toFixed(2),nombre:g.nombre||(cat?cat.desc:'')};
  });
  if(_abcFiltTipo)rows=rows.filter(r=>r.tipo===_abcFiltTipo);
  return rows;
}

// Ordena de mayor a menor según la métrica activa y asigna clase A/B/C por % acumulado (regla 80/95)
function _abcClasificar(rows){
  const key=_abcMetric==='valor'?'valor':'cant';
  const sorted=[...rows].sort((a,b)=>b[key]-a[key]);
  const total=sorted.reduce((s,r)=>s+r[key],0)||1;
  let acum=0;
  sorted.forEach(r=>{
    acum+=r[key];
    r.pct=r[key]/total*100;
    r.pctAcum=acum/total*100;
    r.clase=r.pctAcum<=80?'A':(r.pctAcum<=95?'B':'C');
  });
  return{sorted,total};
}

const CLASE_COL={A:'#ef4444',B:'#f59e0b',C:'#10b981'};

function _abcRenderPareto(){
  const pg=document.getElementById('abcBody');if(!pg)return;
  const rows=_abcDatos();
  const{sorted,total}=_abcClasificar(rows);
  const A=sorted.filter(r=>r.clase==='A'),B=sorted.filter(r=>r.clase==='B'),C=sorted.filter(r=>r.clase==='C');
  const metric=_abcMetric;
  const fmtN2=v=>Number(v||0).toLocaleString('es-PE',{maximumFractionDigits:2});
  const fmtS=v=>'S/ '+Number(v||0).toLocaleString('es-PE',{minimumFractionDigits:2,maximumFractionDigits:2});
  const fmtMetric=metric==='valor'?fmtS:fmtN2;

  const kpis=`<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:.6rem;margin-bottom:.9rem">
    ${_abcKpi('Ítems Analizados',sorted.length,'#3b82f6')}
    ${_abcKpi('Clase A · Alta rotación',A.length,CLASE_COL.A)}
    ${_abcKpi('Clase B · Media',B.length,CLASE_COL.B)}
    ${_abcKpi('Clase C · Baja rotación',C.length,CLASE_COL.C)}
  </div>`;

  const tipos=['MATERIALES','ADMINISTRATIVO','DISPOSITIVOS','EPPS','EQUIPOS','HERRAMIENTAS','INSUMOS'];
  const proys=(DB.proyectos||[]).slice().sort((a,b)=>(a.nombre||'').localeCompare(b.nombre||''));
  const activo=_abcDesde||_abcHasta;

  const filtroBar=`<div style="display:flex;align-items:center;gap:.5rem;flex-wrap:nowrap;overflow-x:auto;margin-bottom:.7rem;padding:.45rem .7rem;background:var(--panel2);border:1px solid var(--border);border-radius:8px">
    <span style="font-size:.62rem;color:var(--muted2);font-weight:700;text-transform:uppercase;letter-spacing:.08em;white-space:nowrap;flex-shrink:0">Período</span>
    <span style="font-size:.7rem;color:var(--muted2);white-space:nowrap;flex-shrink:0">Desde</span>
    <input type="date" id="abcFDesde" class="date-ic-azul" value="${_abcDesde}" onchange="_abcSetFecha('desde',this.value)" style="width:135px;background:var(--panel);border:1px solid var(--border);border-radius:6px;color:var(--text);padding:.28rem .5rem;font-size:.76rem;color-scheme:dark;flex:none">
    <span style="font-size:.7rem;color:var(--muted2);white-space:nowrap;flex-shrink:0">Hasta</span>
    <input type="date" id="abcFHasta" class="date-ic-azul" value="${_abcHasta}" onchange="_abcSetFecha('hasta',this.value)" style="width:135px;background:var(--panel);border:1px solid var(--border);border-radius:6px;color:var(--text);padding:.28rem .5rem;font-size:.76rem;color-scheme:dark;flex:none">
    ${activo?`<button onclick="_abcLimpiarFecha()" style="flex-shrink:0;white-space:nowrap;font-size:.7rem;padding:.22rem .55rem;border-radius:6px;border:1px solid var(--border);background:transparent;color:var(--muted2);cursor:pointer">✕ Limpiar</button>`:''}
    <span style="font-size:.62rem;color:var(--muted2);font-weight:700;text-transform:uppercase;letter-spacing:.08em;margin-left:.4rem;white-space:nowrap;flex-shrink:0">Proyecto</span>
    <select onchange="_abcFiltProy=this.value;_abcRefresh()" style="width:170px;background:var(--panel2);border:1px solid ${_abcFiltProy?'#10b981':'var(--border)'};border-radius:6px;color:var(--text);padding:.3rem .55rem;font-size:.74rem;cursor:pointer;outline:none;flex:none;text-overflow:ellipsis">
      <option value="">— Todos —</option>
      ${proys.map(p=>`<option value="${p.codigo}" ${p.codigo===_abcFiltProy?'selected':''}>[${p.codigo}] ${p.nombre}</option>`).join('')}
    </select>
    <span style="font-size:.62rem;color:var(--muted2);font-weight:700;text-transform:uppercase;letter-spacing:.08em;white-space:nowrap;flex-shrink:0">Tipo</span>
    <select onchange="_abcFiltTipo=this.value;_abcRefresh()" style="width:130px;background:var(--panel2);border:1px solid ${_abcFiltTipo?'#10b981':'var(--border)'};border-radius:6px;color:var(--text);padding:.3rem .55rem;font-size:.74rem;cursor:pointer;outline:none;flex:none;text-overflow:ellipsis">
      <option value="">— Todos —</option>
      ${tipos.map(t=>`<option value="${t}" ${t===_abcFiltTipo?'selected':''}>${t}</option>`).join('')}
    </select>
    <div style="margin-left:auto;display:flex;gap:.3rem;background:var(--panel);border:1px solid var(--border);border-radius:8px;padding:2px;flex-shrink:0;flex-basis:auto">
      <button onclick="_abcSetMetric('cant')" style="padding:.3rem .75rem;border:none;border-radius:6px;cursor:pointer;font-size:.74rem;font-weight:700;white-space:nowrap;background:${metric==='cant'?'var(--alm)':'transparent'};color:${metric==='cant'?'#fff':'var(--muted2)'}">📦 Cantidad</button>
      <button onclick="_abcSetMetric('valor')" style="padding:.3rem .75rem;border:none;border-radius:6px;cursor:pointer;font-size:.74rem;font-weight:700;white-space:nowrap;background:${metric==='valor'?'var(--alm)':'transparent'};color:${metric==='valor'?'#fff':'var(--muted2)'}">💰 Valor S/</button>
    </div>
    <button onclick="_abcExportXls()" style="flex-shrink:0;background:#166534;border:none;border-radius:6px;color:#fff;padding:.3rem .7rem;font-size:.72rem;font-weight:700;cursor:pointer;white-space:nowrap">📊 Excel</button>
  </div>
  ${activo?`<div style="margin:-.4rem 0 .7rem;font-size:.72rem;color:var(--alm);font-weight:700">Filtrando período: ${_abcDesde||'inicio'} → ${_abcHasta||'hoy'}</div>`:''}`;

  const top=sorted.slice(0,15);
  const chartCard=`<div class="card" style="padding:.8rem 1rem;margin-bottom:.9rem">
    <div style="font-size:.62rem;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--muted2);margin-bottom:.5rem">Curva de Pareto — Top ${top.length} ítems ${metric==='valor'?'por Valor S/':'por Cantidad'}</div>
    ${top.length?'<div style="height:280px"><canvas id="abcChart"></canvas></div>':'<div style="padding:1.2rem;text-align:center;color:var(--muted2);font-size:.75rem">Sin salidas registradas para este filtro</div>'}
  </div>`;

  const THs='background:var(--panel2);color:var(--muted2);font-size:.62rem;font-weight:700;text-transform:uppercase;letter-spacing:.05em;padding:.45rem .55rem;white-space:nowrap;position:sticky;top:0;z-index:2';
  const TDs='padding:.4rem .55rem;border-bottom:1px solid var(--border);font-size:.74rem;white-space:nowrap';
  const badgeClase=c=>`<span class="badge" style="background:${CLASE_COL[c]}25;color:${CLASE_COL[c]};border:1px solid ${CLASE_COL[c]}60;font-weight:800">${c}</span>`;
  const tbody=sorted.map((r,i)=>`<tr>
    <td style="${TDs};color:var(--muted2)">${i+1}</td>
    <td style="${TDs};font-family:monospace;color:var(--alm)">${r.codigo}</td>
    <td style="${TDs};font-weight:600;max-width:260px;overflow:hidden;text-overflow:ellipsis" title="${(r.nombre||'').replace(/"/g,'&quot;')}">${r.nombre||'—'}</td>
    <td style="${TDs};text-align:center"><span class="badge b-orange" style="font-size:.6rem">${r.tipo||'—'}</span></td>
    <td style="${TDs};text-align:center;font-size:.68rem;color:var(--muted2)">${r.unidad||'—'}</td>
    <td style="${TDs};text-align:right;font-family:monospace;font-weight:700">${fmtN2(r.cant)}</td>
    <td style="${TDs};text-align:right;font-family:monospace">${r.pur?fmtS(r.pur):'—'}</td>
    <td style="${TDs};text-align:right;font-family:monospace;font-weight:700;color:#10b981">${r.pur?fmtS(r.valor):'—'}</td>
    <td style="${TDs};text-align:right;font-family:monospace">${r.pct.toFixed(1)}%</td>
    <td style="${TDs};text-align:right;font-family:monospace;font-weight:700">${r.pctAcum.toFixed(1)}%</td>
    <td style="${TDs};text-align:center">${badgeClase(r.clase)}</td>
  </tr>`).join('');

  pg.innerHTML=kpis+filtroBar+chartCard+`
    <div class="card">
      <div class="card-head"><span class="card-title">📈 Detalle de Consumo Clasificado (${sorted.length} ítems)</span></div>
      <div class="card-body"><div style="overflow-x:auto;max-height:60vh;overflow-y:auto;border-radius:8px"><table style="width:100%;border-collapse:collapse;min-width:1000px">
        <thead><tr>
          <th style="${THs}">#</th><th style="${THs}">Código</th><th style="${THs}">Material</th><th style="${THs}">Tipo</th>
          <th style="${THs}">Unidad</th><th style="${THs};text-align:right">Cant. Salida</th>
          <th style="${THs};text-align:right">P.U.R.</th><th style="${THs};text-align:right">Valor S/</th>
          <th style="${THs};text-align:right">% Ítem</th><th style="${THs};text-align:right">% Acum.</th><th style="${THs}">Clase</th>
        </tr></thead>
        <tbody>${tbody||`<tr><td colspan="11" style="text-align:center;padding:2.5rem;color:var(--muted2);font-size:.85rem">Sin salidas de almacén registradas en este período.</td></tr>`}</tbody>
      </table></div></div>
    </div>`;

  if(top.length)_abcRenderChart(top,metric);
}

function _abcRenderChart(top,metric){
  const cv=document.getElementById('abcChart');if(!cv)return;
  if(_abcChart){_abcChart.destroy();_abcChart=null;}
  const labels=top.map(r=>r.codigo);
  const barData=top.map(r=>metric==='valor'?r.valor:r.cant);
  const lineData=top.map(r=>r.pctAcum);
  const barColors=top.map(r=>CLASE_COL[r.clase]);
  _abcChart=new Chart(cv.getContext('2d'),{
    data:{
      labels,
      datasets:[
        {type:'bar',label:metric==='valor'?'Valor S/':'Cantidad',data:barData,backgroundColor:barColors,borderRadius:3,order:2,yAxisID:'y'},
        {type:'line',label:'% Acumulado',data:lineData,borderColor:'#3b82f6',backgroundColor:'#3b82f6',pointRadius:3,pointBackgroundColor:'#3b82f6',tension:.25,order:1,yAxisID:'y1'}
      ]
    },
    options:{
      responsive:true,maintainAspectRatio:false,
      interaction:{mode:'index',intersect:false},
      plugins:{
        legend:{labels:{color:'#94a3b8',font:{size:10}}},
        tooltip:{callbacks:{label:c=>c.dataset.type==='line'?'% Acumulado: '+c.parsed.y.toFixed(1)+'%':c.dataset.label+': '+c.parsed.y.toLocaleString('es-PE')}}
      },
      scales:{
        x:{ticks:{color:'#94a3b8',font:{size:9}},grid:{color:'rgba(255,255,255,.05)'}},
        y:{position:'left',ticks:{color:'#94a3b8',font:{size:9}},grid:{color:'rgba(255,255,255,.05)'}},
        y1:{position:'right',min:0,max:100,ticks:{color:'#3b82f6',font:{size:9},callback:v=>v+'%'},grid:{drawOnChartArea:false}}
      }
    }
  });
}

function _abcExportXls(){
  const rows=_abcDatos();
  const{sorted}=_abcClasificar(rows);
  if(!sorted.length){toast('No hay datos para exportar',true);return;}
  const wsData=[['#','Código','Material','Tipo','Unidad','Cant. Salida','P.U.R.','Valor S/','% Ítem','% Acumulado','Clase']];
  sorted.forEach((r,i)=>wsData.push([i+1,r.codigo,r.nombre||'',r.tipo||'',r.unidad||'',r.cant,r.pur||0,r.valor||0,+r.pct.toFixed(2),+r.pctAcum.toFixed(2),r.clase]));
  const ws=XLSX.utils.aoa_to_sheet(wsData);
  ws['!cols']=[{wch:5},{wch:12},{wch:35},{wch:14},{wch:9},{wch:12},{wch:10},{wch:12},{wch:9},{wch:11},{wch:7}];
  const wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,ws,'Analisis ABC');
  XLSX.writeFile(wb,'analisis_abc_'+(_abcMetric==='valor'?'valor':'cantidad')+'.xlsx');
}

// ── VISTA SEMANAL — salidas de Kardex por semana: consumo por persona y vales emitidos ──
let _abcSemIni=null;
let _abcSemExportData=null;

function _abcSemDefault(){
  const h=new Date(today()+'T12:00:00');
  const lunes=new Date(h);
  lunes.setDate(h.getDate()-((h.getDay()+6)%7));
  return lunes.toISOString().slice(0,10);
}
function _abcSemNav(dias){
  const d=new Date((_abcSemIni||_abcSemDefault())+'T12:00:00');
  d.setDate(d.getDate()+dias);
  _abcSemIni=d.toISOString().slice(0,10);
  _abcRenderSemana();
}
function _abcSemSetIni(v){_abcSemIni=v;_abcRenderSemana();}
function _abcSemInfo(offsetDias){
  if(!_abcSemIni)_abcSemIni=_abcSemDefault();
  const pad=n=>String(n).padStart(2,'0');
  const DN=['DOM','LUN','MAR','MIÉ','JUE','VIE','SÁB'];
  const d0=new Date(_abcSemIni+'T12:00:00');
  if(offsetDias)d0.setDate(d0.getDate()+offsetDias);
  const fechas=[];
  for(let i=0;i<7;i++){
    const d=new Date(d0);d.setDate(d0.getDate()+i);
    fechas.push({iso:`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`,lbl:DN[d.getDay()],dm:`${pad(d.getDate())}/${pad(d.getMonth()+1)}`});
  }
  return{fechas,fIni:fechas[0].iso,fFin:fechas[6].iso,rango:`${fechas[0].dm} → ${fechas[6].dm}`};
}

// Salidas de Kardex dentro de un rango de fechas, respetando los filtros de Proyecto/Tipo del módulo
function _abcSemSalidas(fIni,fFin){
  let rows=(DB.almacen||[]).filter(r=>r.tipo==='S'&&r.fecha&&r.fecha>=fIni&&r.fecha<=fFin&&(!_abcFiltProy||r.codProy===_abcFiltProy));
  if(_abcFiltTipo){
    rows=rows.filter(r=>{
      const cat=(DB.catalogoItems||[]).find(c=>c.cod===r.codigo);
      return cat&&cat.tipo===_abcFiltTipo;
    });
  }
  return rows;
}

function _abcRenderSemana(){
  const pg=document.getElementById('abcSemBody');if(!pg)return;
  const info=_abcSemInfo();
  const{fIni,fFin,fechas,rango}=info;
  const rows=_abcSemSalidas(fIni,fFin);
  const infoPrev=_abcSemInfo(-7);
  const rowsPrev=_abcSemSalidas(infoPrev.fIni,infoPrev.fFin);

  const fmtN2=v=>Number(v||0).toLocaleString('es-PE',{maximumFractionDigits:1});

  const totCant=rows.reduce((s,r)=>s+(+r.cant||0),0);
  const totCantPrev=rowsPrev.reduce((s,r)=>s+(+r.cant||0),0);
  const deltaPct=totCantPrev>0?Math.round((totCant-totCantPrev)/totCantPrev*100):null;
  const deltaBadge=deltaPct===null?'':`<span style="font-size:.62rem;font-weight:700;color:${deltaPct<=0?'#10b981':'#ef4444'};margin-left:.35rem">${deltaPct===0?'= igual':(deltaPct>0?'▲ +':'▼ ')+deltaPct+'%'}</span>`;
  const vales=[...new Set(rows.filter(r=>r.numVale).map(r=>r.numVale+'|'+(r.codProy||'')))];
  const personas=[...new Set(rows.map(r=>r.para||'(Sin asignar)'))];
  const promDiario=totCant/7;

  const kpis=`<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:.6rem;margin-bottom:.9rem">
    ${_abcKpi('Salidas de la Semana',fmtN2(totCant)+deltaBadge,'#3b82f6')}
    ${_abcKpi('Vales Emitidos',vales.length,'#8b5cf6')}
    ${_abcKpi('Personas / Responsables',personas.length,'#f59e0b')}
    ${_abcKpi('Promedio Diario',fmtN2(promDiario),'#10b981')}
  </div>`;

  const proys=(DB.proyectos||[]).slice().sort((a,b)=>(a.nombre||'').localeCompare(b.nombre||''));
  const tipos=['MATERIALES','ADMINISTRATIVO','DISPOSITIVOS','EPPS','EQUIPOS','HERRAMIENTAS','INSUMOS'];

  const weekBar=`<div style="display:flex;align-items:center;gap:.5rem;flex-wrap:nowrap;overflow-x:auto;margin-bottom:.9rem;padding:.45rem .7rem;background:var(--panel2);border:1px solid var(--border);border-radius:8px">
    <span style="font-size:.62rem;color:var(--muted2);font-weight:700;text-transform:uppercase;letter-spacing:.08em;white-space:nowrap;flex-shrink:0">Semana (7 días desde)</span>
    <button onclick="_abcSemNav(-7)" style="flex-shrink:0;background:none;border:1px solid var(--border);border-radius:5px;color:var(--text);cursor:pointer;font-size:.85rem;padding:.12rem .5rem" title="Semana anterior">‹</button>
    <input type="date" class="date-ic-azul" value="${_abcSemIni||_abcSemDefault()}" onchange="_abcSemSetIni(this.value)" style="width:135px;background:var(--panel);border:1px solid var(--border);border-radius:6px;color:var(--text);padding:.28rem .5rem;font-size:.76rem;color-scheme:dark;flex:none">
    <button onclick="_abcSemNav(7)" style="flex-shrink:0;background:none;border:1px solid var(--border);border-radius:5px;color:var(--text);cursor:pointer;font-size:.85rem;padding:.12rem .5rem" title="Semana siguiente">›</button>
    <span style="font-size:.72rem;color:#10b981;font-weight:700;white-space:nowrap;flex-shrink:0">${rango}</span>
    <button onclick="_abcSemIni=_abcSemDefault();_abcRenderSemana()" style="flex-shrink:0;font-size:.62rem;padding:.2rem .5rem;border-radius:5px;border:1px solid var(--border);background:transparent;color:var(--muted2);cursor:pointer;white-space:nowrap">Semana actual (Lun)</button>
    <span style="font-size:.62rem;color:var(--muted2);font-weight:700;text-transform:uppercase;letter-spacing:.08em;margin-left:.4rem;white-space:nowrap;flex-shrink:0">Proyecto</span>
    <select onchange="_abcFiltProy=this.value;_abcRefresh()" style="width:170px;background:var(--panel2);border:1px solid ${_abcFiltProy?'#10b981':'var(--border)'};border-radius:6px;color:var(--text);padding:.3rem .55rem;font-size:.74rem;cursor:pointer;outline:none;flex:none">
      <option value="">— Todos —</option>
      ${proys.map(p=>`<option value="${p.codigo}" ${p.codigo===_abcFiltProy?'selected':''}>[${p.codigo}] ${p.nombre}</option>`).join('')}
    </select>
    <span style="font-size:.62rem;color:var(--muted2);font-weight:700;text-transform:uppercase;letter-spacing:.08em;white-space:nowrap;flex-shrink:0">Tipo</span>
    <select onchange="_abcFiltTipo=this.value;_abcRefresh()" style="width:130px;background:var(--panel2);border:1px solid ${_abcFiltTipo?'#10b981':'var(--border)'};border-radius:6px;color:var(--text);padding:.3rem .55rem;font-size:.74rem;cursor:pointer;outline:none;flex:none">
      <option value="">— Todos —</option>
      ${tipos.map(t=>`<option value="${t}" ${t===_abcFiltTipo?'selected':''}>${t}</option>`).join('')}
    </select>
    <button onclick="_abcSemExportXls()" style="margin-left:auto;flex-shrink:0;background:#166534;border:none;border-radius:6px;color:#fff;padding:.3rem .7rem;font-size:.72rem;font-weight:700;cursor:pointer;white-space:nowrap">📊 Excel</button>
  </div>`;

  // ── Consumo por persona, por día ──
  const porPersona={};
  rows.forEach(r=>{
    const p=r.para||'(Sin asignar)';
    if(!porPersona[p])porPersona[p]=Object.fromEntries(fechas.map(f=>[f.iso,0]));
    porPersona[p][r.fecha]=(porPersona[p][r.fecha]||0)+(+r.cant||0);
  });
  const porPersonaPrevTot={};
  rowsPrev.forEach(r=>{
    const p=r.para||'(Sin asignar)';
    porPersonaPrevTot[p]=(porPersonaPrevTot[p]||0)+(+r.cant||0);
  });
  const personasOrd=Object.entries(porPersona).map(([nom,dias])=>{
    const tot=Object.values(dias).reduce((s,v)=>s+v,0);
    return{nom,dias,tot};
  }).sort((a,b)=>b.tot-a.tot);

  // ── Agrupación por día y Tipo de Material (para el gráfico) ──
  const porTipo={};
  rows.forEach(r=>{
    const cat=(DB.catalogoItems||[]).find(c=>c.cod===r.codigo);
    const t=cat&&cat.tipo?cat.tipo:'(Sin tipo)';
    if(!porTipo[t])porTipo[t]=Object.fromEntries(fechas.map(f=>[f.iso,0]));
    porTipo[t][r.fecha]=(porTipo[t][r.fecha]||0)+(+r.cant||0);
  });
  const tiposOrd=Object.entries(porTipo).map(([nom,dias])=>({nom,dias,tot:Object.values(dias).reduce((s,v)=>s+v,0)})).sort((a,b)=>b.tot-a.tot);

  // ── Agrupación por día y Unidad de Medida (para el gráfico) ──
  const porUnidad={};
  rows.forEach(r=>{
    const u=r.unidad||'(Sin unidad)';
    if(!porUnidad[u])porUnidad[u]=Object.fromEntries(fechas.map(f=>[f.iso,0]));
    porUnidad[u][r.fecha]=(porUnidad[u][r.fecha]||0)+(+r.cant||0);
  });
  const unidadesOrd=Object.entries(porUnidad).map(([nom,dias])=>({nom,dias,tot:Object.values(dias).reduce((s,v)=>s+v,0)})).sort((a,b)=>b.tot-a.tot);

  const coloresPal=['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#ec4899','#84cc16'];
  const _abcSemDatasets=(ordArr,maxN)=>{
    const top=ordArr.slice(0,maxN),resto=ordArr.slice(maxN);
    const ds=top.map((g,i)=>({label:g.nom,data:fechas.map(f=>g.dias[f.iso]||0),backgroundColor:coloresPal[i%coloresPal.length],stack:'s'}));
    if(resto.length)ds.push({label:'Otros ('+resto.length+')',data:fechas.map(f=>resto.reduce((s,g)=>s+(g.dias[f.iso]||0),0)),backgroundColor:'#64748b',stack:'s'});
    return ds;
  };
  const datasetsTipo=_abcSemDatasets(tiposOrd,8);
  const datasetsUnidad=_abcSemDatasets(unidadesOrd,6);

  const chartCard=`<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(380px,1fr));gap:.9rem;margin-bottom:.9rem">
    <div class="card" style="padding:.8rem 1rem">
      <div style="font-size:.62rem;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--muted2);margin-bottom:.5rem">Cantidad por día y Tipo de Material</div>
      ${rows.length?'<div style="height:260px"><canvas id="abcSemChartTipo"></canvas></div>':'<div style="padding:1.2rem;text-align:center;color:var(--muted2);font-size:.75rem">Sin salidas registradas esta semana</div>'}
    </div>
    <div class="card" style="padding:.8rem 1rem">
      <div style="font-size:.62rem;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--muted2);margin-bottom:.5rem">Cantidad por día y Unidad de Medida</div>
      ${rows.length?'<div style="height:260px"><canvas id="abcSemChartUnidad"></canvas></div>':'<div style="padding:1.2rem;text-align:center;color:var(--muted2);font-size:.75rem">Sin salidas registradas esta semana</div>'}
    </div>
  </div>`;

  // ── Tabla consumo por persona ──
  const THs='background:var(--panel2);color:var(--muted2);font-size:.62rem;font-weight:700;text-transform:uppercase;letter-spacing:.05em;padding:.45rem .55rem;white-space:nowrap;position:sticky;top:0;z-index:2';
  const TDs='padding:.4rem .55rem;border-bottom:1px solid var(--border);font-size:.76rem;white-space:nowrap';
  const tbodyPersona=personasOrd.map((p,i)=>{
    const prev=porPersonaPrevTot[p.nom]||0;
    let cmpTxt='—',cmpCol='var(--muted2)';
    if(prev>0){
      const d=Math.round((p.tot-prev)/prev*100);
      cmpTxt=d===0?'= igual':(d>0?'▲ +'+d+'%':'▼ '+d+'%');
      cmpCol=d<=0?'#10b981':'#ef4444';
    }else if(p.tot>0){cmpTxt='nuevo';cmpCol='#3b82f6';}
    return`<tr>
      <td style="${TDs};font-weight:700;${i===0&&p.tot>0?'color:#f59e0b':''}">${i===0&&p.tot>0?'🏆 ':''}${p.nom}</td>
      ${fechas.map(f=>{
        const v=p.dias[f.iso]||0;
        return`<td style="${TDs};text-align:center;${v?'background:rgba(59,130,246,.12);color:#93c5fd;font-weight:700':'color:var(--muted2)'}">${v?fmtN2(v):'—'}</td>`;
      }).join('')}
      <td style="${TDs};text-align:right;font-weight:800;color:var(--alm)">${fmtN2(p.tot)}<div style="font-size:.62rem;font-weight:700;color:${cmpCol}">${cmpTxt}</div></td>
    </tr>`;
  }).join('');

  const tablaPersona=`<div class="card" style="margin-bottom:.9rem">
    <div class="card-head"><span class="card-title">👤 Consumo por Persona / Responsable · ${personasOrd.length}</span></div>
    <div class="card-body"><div style="overflow-x:auto;max-height:50vh;overflow-y:auto;border-radius:8px"><table style="width:100%;border-collapse:collapse;min-width:900px">
      <thead><tr>
        <th style="${THs}">Persona / Equipo</th>
        ${fechas.map(f=>`<th style="${THs};text-align:center">${f.lbl}<br>${f.dm}</th>`).join('')}
        <th style="${THs};text-align:right">Total Semana<br><span style="font-size:.58rem">vs sem. anterior</span></th>
      </tr></thead>
      <tbody>${tbodyPersona||`<tr><td colspan="${fechas.length+2}" style="text-align:center;padding:2rem;color:var(--muted2)">Sin salidas registradas esta semana</td></tr>`}</tbody>
    </table></div></div>
  </div>`;

  // ── Tabla vales de salida de la semana ──
  const porVale={};
  rows.filter(r=>r.numVale).forEach(r=>{
    const key=r.numVale+'|'+(r.codProy||'');
    if(!porVale[key])porVale[key]={numVale:r.numVale,codProy:r.codProy,proyecto:r.proyecto,fecha:r.fecha,para:r.para,items:0,cant:0};
    const g=porVale[key];
    g.items++;g.cant+=+r.cant||0;
    if(r.fecha<g.fecha)g.fecha=r.fecha;
  });
  const valesOrd=Object.values(porVale).sort((a,b)=>(b.fecha||'').localeCompare(a.fecha||''));
  const tbodyVales=valesOrd.map(v=>`<tr>
    <td style="${TDs};font-family:monospace;font-weight:700;color:#ef4444">${v.numVale}</td>
    <td style="${TDs};font-family:monospace">${v.fecha||'—'}</td>
    <td style="${TDs}">${v.proyecto||'—'}</td>
    <td style="${TDs};max-width:220px;overflow:hidden;text-overflow:ellipsis" title="${(v.para||'').replace(/"/g,'&quot;')}">${v.para||'—'}</td>
    <td style="${TDs};text-align:center">${v.items}</td>
    <td style="${TDs};text-align:right;font-weight:700">${fmtN2(v.cant)}</td>
    <td style="${TDs}"><button onclick="_almImprimirVale('${v.numVale}','${v.codProy||''}')" style="background:none;border:1px solid #3b82f650;border-radius:5px;color:#3b82f6;cursor:pointer;font-size:.72rem;padding:.15rem .5rem">🖨 Imprimir</button></td>
  </tr>`).join('');

  const tablaVales=`<div class="card">
    <div class="card-head"><span class="card-title">🧾 Vales de Salida de la Semana · ${valesOrd.length}</span></div>
    <div class="card-body"><div style="overflow-x:auto;max-height:50vh;overflow-y:auto;border-radius:8px"><table style="width:100%;border-collapse:collapse;min-width:800px">
      <thead><tr><th style="${THs}">N° Vale</th><th style="${THs}">Fecha</th><th style="${THs}">Proyecto</th><th style="${THs}">Entregado a</th><th style="${THs};text-align:center">Ítems</th><th style="${THs};text-align:right">Cant. Total</th><th style="${THs}"></th></tr></thead>
      <tbody>${tbodyVales||`<tr><td colspan="7" style="text-align:center;padding:2rem;color:var(--muted2)">Sin vales emitidos esta semana</td></tr>`}</tbody>
    </table></div></div>
  </div>`;

  pg.innerHTML=kpis+weekBar+chartCard+tablaPersona+tablaVales;
  if(rows.length){
    _abcRenderSemChart('abcSemChartTipo','tipo',fechas,datasetsTipo);
    _abcRenderSemChart('abcSemChartUnidad','unidad',fechas,datasetsUnidad);
  }
  _abcSemExportData={fechas,personasOrd,valesOrd,rango};
}

let _abcSemCharts={tipo:null,unidad:null};
function _abcRenderSemChart(canvasId,key,fechas,datasets){
  const cv=document.getElementById(canvasId);if(!cv)return;
  if(_abcSemCharts[key]){_abcSemCharts[key].destroy();_abcSemCharts[key]=null;}
  _abcSemCharts[key]=new Chart(cv.getContext('2d'),{
    type:'bar',
    data:{labels:fechas.map(f=>f.lbl+' '+f.dm),datasets},
    options:{
      responsive:true,maintainAspectRatio:false,
      plugins:{
        legend:{labels:{color:'#94a3b8',font:{size:9},boxWidth:11}},
        tooltip:{callbacks:{label:c=>c.dataset.label+': '+c.parsed.y.toLocaleString('es-PE')}}
      },
      scales:{
        x:{stacked:true,ticks:{color:'#94a3b8',font:{size:9}},grid:{color:'rgba(255,255,255,.05)'}},
        y:{stacked:true,ticks:{color:'#94a3b8',font:{size:9}},grid:{color:'rgba(255,255,255,.05)'}}
      }
    }
  });
}

function _abcSemExportXls(){
  if(!_abcSemExportData||!_abcSemExportData.personasOrd.length){toast('No hay datos para exportar',true);return;}
  const{fechas,personasOrd,valesOrd,rango}=_abcSemExportData;
  const wsData=[['Semana: '+rango],[],['Persona / Equipo',...fechas.map(f=>f.lbl+' '+f.dm),'Total Semana']];
  personasOrd.forEach(p=>wsData.push([p.nom,...fechas.map(f=>p.dias[f.iso]||0),p.tot]));
  wsData.push([]);
  wsData.push(['Vales de Salida']);
  wsData.push(['N° Vale','Fecha','Proyecto','Entregado a','Ítems','Cant. Total']);
  valesOrd.forEach(v=>wsData.push([v.numVale,v.fecha,v.proyecto||'',v.para||'',v.items,v.cant]));
  const ws=XLSX.utils.aoa_to_sheet(wsData);
  const wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,ws,'Vista Semanal');
  XLSX.writeFile(wb,'vista_semanal_almacen_'+rango.replace(/[\/ ]/g,'')+'.xlsx');
}
