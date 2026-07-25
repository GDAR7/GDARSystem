// ══ ANÁLISIS ABC / PARETO — Almacén y Logística ══
// Clasifica los materiales/EPPs según su consumo (salidas de Kardex), por Cantidad o por Valor S/ (cant × P.U.R.)
let _abcMetric='cant'; // 'cant' | 'valor'
let _abcDesde='', _abcHasta='', _abcFiltProy='', _abcFiltTipo='';
let _abcChart=null;

function _abcKpi(label,val,color){
  return `<div style="background:var(--panel);border:2px solid ${color}55;border-left:4px solid ${color};border-radius:8px;padding:.6rem .8rem">
    <div style="font-size:.58rem;font-weight:700;text-transform:uppercase;letter-spacing:.09em;color:var(--muted2);margin-bottom:.25rem">${label}</div>
    <div style="font-family:'Barlow Condensed',sans-serif;font-size:1.4rem;font-weight:800;color:${color};line-height:1">${val}</div>
  </div>`;
}

function _abcSetMetric(m){_abcMetric=m;rAnalisisAbc();}
function _abcSetFecha(tipo,val){if(tipo==='desde')_abcDesde=val;else _abcHasta=val;rAnalisisAbc();}
function _abcLimpiarFecha(){
  _abcDesde='';_abcHasta='';
  const d=document.getElementById('abcFDesde'),h=document.getElementById('abcFHasta');
  if(d)d.value='';if(h)h.value='';
  rAnalisisAbc();
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

function rAnalisisAbc(){
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
    <select onchange="_abcFiltProy=this.value;rAnalisisAbc()" style="width:170px;background:var(--panel2);border:1px solid ${_abcFiltProy?'#10b981':'var(--border)'};border-radius:6px;color:var(--text);padding:.3rem .55rem;font-size:.74rem;cursor:pointer;outline:none;flex:none;text-overflow:ellipsis">
      <option value="">— Todos —</option>
      ${proys.map(p=>`<option value="${p.codigo}" ${p.codigo===_abcFiltProy?'selected':''}>[${p.codigo}] ${p.nombre}</option>`).join('')}
    </select>
    <span style="font-size:.62rem;color:var(--muted2);font-weight:700;text-transform:uppercase;letter-spacing:.08em;white-space:nowrap;flex-shrink:0">Tipo</span>
    <select onchange="_abcFiltTipo=this.value;rAnalisisAbc()" style="width:130px;background:var(--panel2);border:1px solid ${_abcFiltTipo?'#10b981':'var(--border)'};border-radius:6px;color:var(--text);padding:.3rem .55rem;font-size:.74rem;cursor:pointer;outline:none;flex:none;text-overflow:ellipsis">
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
