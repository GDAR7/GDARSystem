// ══════════════════════════════════════════════════════════════════════════
//  PANEL DE HORAS MÁQUINA — REPORTE DIARIO DE UTILIZACIÓN
//
//  Reporte de presentación (hoja blanca + Imprimir/PDF) con el mismo formato
//  del Resumen Semanal, pero de un DÍA: gráfico de barras por equipo del día
//  elegido y, al lado, el de su semana para comparar.
//
//  Reglas, las mismas del panel:
//    H. Programadas = Nº de partes × horas por turno (⚙ del panel)
//    Utilización    = H. Efectivas ÷ H. Programadas
//    Semáforo       ≥75 % verde · 60–74 % ámbar · <60 % rojo
//    Meta del día   = meta del corte por equipo (_rmMetaDe) ÷ días del corte
//
//  Salen TODOS los equipos de la línea, no solo los que reportaron: el que no
//  tiene parte aparece en 0 %, que es lo que interesa ver en una presentación.
//  Los desmovilizados quedan fuera.
//
//  Prefijo _phd. La semana es la del panel (_phSemIni) y las horas por turno
//  salen de _phHsProgTurno(), así que nada se calcula por duplicado.
// ══════════════════════════════════════════════════════════════════════════

let _phdFecha='';

const _phdPad=n=>String(n).padStart(2,'0');
const _phdISO=d=>`${d.getFullYear()}-${_phdPad(d.getMonth()+1)}-${_phdPad(d.getDate())}`;
const _phdDMY=s=>String(s).slice(8,10)+'/'+String(s).slice(5,7)+'/'+String(s).slice(0,4);
const _PHD_DIAS=['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];

// Las 7 fechas de la semana elegida en el panel
function _phdSemana(){
  const d0=new Date((_phSemIni||_phSemDefault())+'T12:00:00');
  const out=[];
  for(let i=0;i<7;i++){const d=new Date(d0);d.setDate(d0.getDate()+i);out.push(_phdISO(d));}
  return out;
}
// Día por defecto: el último de la semana con partes; si no hay, el último día
function _phdDefault(){
  const sem=_phdSemana();
  const conPartes=new Set((DB.partes||[]).filter(p=>p.fecha>=sem[0]&&p.fecha<=sem[6]).map(p=>p.fecha));
  for(let i=6;i>=0;i--)if(conPartes.has(sem[i]))return sem[i];
  return sem[6];
}
// Mueve el día; si sale de la semana, la semana del panel se mueve con él
function _phdNav(d){
  const f=new Date((_phdFecha||_phdDefault())+'T12:00:00');
  f.setDate(f.getDate()+d);
  _phdFecha=_phdISO(f);
  const sem=_phdSemana();
  if(_phdFecha<sem[0]||_phdFecha>sem[6]){
    const ini=new Date(_phdFecha+'T12:00:00');
    ini.setDate(ini.getDate()-((ini.getDay()+6)%7));   // lunes de esa semana
    _phSemIni=_phdISO(ini);
  }
  rPanelHoras();
}
function _phdSetFecha(v){
  if(!v)return;
  _phdFecha=v;
  const sem=_phdSemana();
  if(v<sem[0]||v>sem[6]){
    const ini=new Date(v+'T12:00:00');
    ini.setDate(ini.getDate()-((ini.getDay()+6)%7));
    _phSemIni=_phdISO(ini);
  }
  rPanelHoras();
}

// ── Datos del día y de su semana ────────────────────────────────────────────
function _phdDatos(){
  const HP=typeof _phHsProgTurno==='function'?_phHsProgTurno():10;
  const sem=_phdSemana();
  if(!_phdFecha||_phdFecha<sem[0]||_phdFecha>sem[6])_phdFecha=_phdDefault();
  const fecha=_phdFecha;

  // Corte 21→20 que contiene el día (para prorratear la meta)
  const d=new Date(fecha+'T12:00:00');
  const cIniD=d.getDate()>=21?new Date(d.getFullYear(),d.getMonth(),21):new Date(d.getFullYear(),d.getMonth()-1,21);
  const cFinD=new Date(cIniD.getFullYear(),cIniD.getMonth()+1,20);
  const diasCorte=Math.round((cFinD-cIniD)/864e5)+1;

  const LINEAS=(typeof _PH_LINEAS!=='undefined')?_PH_LINEAS:['Línea Amarilla','Línea Blanca'];
  // Todos los equipos de las dos líneas, menos los desmovilizados
  const eqs=(DB.equipos||[]).filter(e=>LINEAS.indexOf(e.tipo)>=0&&String(e.est||'')!=='Desmovilizado');
  const porId={};
  eqs.forEach(e=>{porId[e.id]={eq:e,tipo:e.tipo,sub:String(e.sub||'').toUpperCase(),
    nDia:0,efDia:0,imDia:0,nSem:0,efSem:0,imSem:0,diasSem:new Set()};});

  (DB.partes||[]).forEach(p=>{
    if(!p.fecha||!p.eqId)return;
    const r=porId[p.eqId];
    if(!r)return;
    const ef=Math.max(0,+p.ef||0), im=Math.max(0,+p.im||0);
    if(p.fecha===fecha){r.nDia++;r.efDia+=ef;r.imDia+=im;}
    if(p.fecha>=sem[0]&&p.fecha<=sem[6]){r.nSem++;r.efSem+=ef;r.imSem+=im;r.diasSem.add(p.fecha);}
  });

  const metaDe=eq=>(typeof _rmMetaDe==='function'?_rmMetaDe(eq):180);
  const filas=Object.values(porId).map(r=>({
    ...r,dias:r.diasSem.size,
    progDia:r.nDia*HP, progSem:r.nSem*HP,
    utilDia:r.nDia?r.efDia/(r.nDia*HP)*100:0,
    utilSem:r.nSem?r.efSem/(r.nSem*HP)*100:0,
    metaDia:+(metaDe(r.eq)/diasCorte).toFixed(1),
    metaSem:Math.round(metaDe(r.eq)*7/diasCorte)
  })).sort((a,b)=>a.tipo!==b.tipo?a.tipo.localeCompare(b.tipo)
    :(a.sub!==b.sub?a.sub.localeCompare(b.sub)
    :String(a.eq.codigo||'').localeCompare(String(b.eq.codigo||''))));

  const tot=f=>({
    progDia:f.reduce((s,r)=>s+r.progDia,0), efDia:f.reduce((s,r)=>s+r.efDia,0), imDia:f.reduce((s,r)=>s+r.imDia,0),
    progSem:f.reduce((s,r)=>s+r.progSem,0), efSem:f.reduce((s,r)=>s+r.efSem,0), imSem:f.reduce((s,r)=>s+r.imSem,0),
    conParte:f.filter(r=>r.nDia>0).length, n:f.length
  });
  const T=tot(filas);
  T.utilDia=T.progDia?T.efDia/T.progDia*100:0;
  T.utilSem=T.progSem?T.efSem/T.progSem*100:0;

  return{HP,fecha,sem,diasCorte,cIni:_phdISO(cIniD),cFin:_phdISO(cFinD),
    lineas:LINEAS,filas,total:T,totalDe:tot,
    diaNombre:_PHD_DIAS[new Date(fecha+'T12:00:00').getDay()]};
}

// ── Documento de presentación ───────────────────────────────────────────────
function _phdDoc(){
  const D=_phdDatos();
  const fmt1=v=>(+v||0).toLocaleString('es-PE',{maximumFractionDigits:1});
  const logoUrl=(typeof EMPRESA!=='undefined')?new URL(EMPRESA.logo,location.href).href:'';
  const AZ='#1e3a5f';
  const utlCol=u=>u>=75?'#15803d':u>=60?'#b45309':'#b91c1c';
  const sec=t=>`<div style="font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:.05em;color:${AZ};border-bottom:2px solid ${AZ};padding-bottom:3px;margin:16px 0 6px">${t}</div>`;
  const TH=`padding:4px 7px;font-size:9.5px;background:${AZ};color:#fff;text-transform:uppercase;letter-spacing:.03em;border:1px solid ${AZ}`;
  const TD='padding:3px 7px;font-size:10.5px;border:1px solid #bbb;color:#111';
  const TBL='width:100%;border-collapse:collapse;page-break-inside:auto';
  const kpi=(lbl,val,col)=>`<div style="min-width:0;border:2px solid ${col};border-radius:8px;padding:6px 8px"><div style="font-size:8px;text-transform:uppercase;letter-spacing:.05em;color:#555;font-weight:700">${lbl}</div><div style="font-size:15px;font-weight:900;color:${col};white-space:nowrap">${val}</div></div>`;
  const pctU=u=>`<span style="font-weight:900;color:${utlCol(u)}">${u.toFixed(1)}%</span>`;

  // Colores por subtipo, igual que el Resumen Semanal
  const SUBCOL={'RETRO':'#f59e0b','EXCAVADORA':'#ef4444','CARGADOR':'#a855f7','MOTONIVELADORA':'#10b981','TRACTOR':'#06b6d4','RODILLO':'#84cc16','VOLQUETE':'#3b82f6','CISTERNA':'#0ea5e9'};
  const pal=['#ec4899','#eab308','#14b8a6','#f97316','#6366f1','#a3e635','#e11d48','#0284c7'];
  const asig={};let pi=0;
  const subCol=s=>{s=(s||'').toUpperCase();for(const k in SUBCOL)if(s.includes(k))return SUBCOL[k];if(!asig[s])asig[s]=pal[pi++%pal.length];return asig[s];};

  // Etiquetas sobre las barras y sobre la línea de meta
  const vlBarras={id:'vlBarrasDia',afterDatasetsDraw(chart){
    const ctx=chart.ctx;const di=chart.data.datasets.length-1;
    const meta=chart.getDatasetMeta(di);if(!meta)return;
    ctx.save();ctx.fillStyle='#1e3a5f';ctx.font='bold 10px Arial';ctx.textAlign='center';
    meta.data.forEach((bar,i)=>{const v=chart.data.datasets[di].data[i];if(v!=null)ctx.fillText((+v).toLocaleString('es-PE'),bar.x,bar.y-4);});
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
  const chartImg=(items,titulo,campoEf,campoMeta)=>{
    if(typeof Chart==='undefined'||!items.length)return'';
    const cv=document.createElement('canvas');cv.width=980;cv.height=430;
    const ch=new Chart(cv.getContext('2d'),{
      type:'bar',
      data:{
        labels:items.map(r=>r.eq?r.eq.codigo:'#'+r.eq),
        datasets:[
          {type:'line',label:'Meta',data:items.map(r=>r[campoMeta]),borderColor:'#dc2626',borderDash:[6,4],borderWidth:2,pointRadius:0,stepped:'middle'},
          {label:'Horas',data:items.map(r=>+r[campoEf].toFixed(1)),backgroundColor:items.map(r=>subCol(r.sub)),borderRadius:3}
        ]
      },
      options:{responsive:false,animation:false,devicePixelRatio:2,
        layout:{padding:{top:14}},
        plugins:{legend:{display:false},title:{display:true,text:titulo,color:AZ,font:{size:13,weight:'bold'}}},
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

  // Un par de gráficos por línea: el día y su semana
  let graficos='';
  D.lineas.forEach(linea=>{
    const items=D.filas.filter(r=>r.tipo===linea);
    if(!items.length)return;
    const gDia=chartImg(items,'UTILIZACIÓN — '+linea.toUpperCase()+' · '+D.diaNombre.toUpperCase()+' '+_phdDMY(D.fecha),'efDia','metaDia');
    const gSem=chartImg(items,'LA MISMA SEMANA — '+linea.toUpperCase()+' · '+_phdDMY(D.sem[0])+' al '+_phdDMY(D.sem[6]),'efSem','metaSem');
    if(!gDia&&!gSem)return;
    graficos+=`<div style="page-break-inside:avoid">
      ${gDia?`<div style="border:1px solid #ccc;border-radius:6px;padding:4px;background:#fff;margin-top:8px"><img src="${gDia}" style="width:100%;display:block"></div>`:''}
      ${gSem?`<div style="border:1px solid #ccc;border-radius:6px;padding:4px;background:#fff;margin-top:6px"><img src="${gSem}" style="width:100%;display:block"></div>`:''}
    </div>`;
  });
  if(graficos)graficos+=`<div style="font-size:8.5px;color:#666;margin-top:3px">Barras = horas efectivas (color según subtipo) · <span style="color:#dc2626">▬ ▬</span> meta: del día = meta del corte ÷ ${D.diasCorte} días · de la semana = meta del corte × 7 ÷ ${D.diasCorte} días</div>`;

  // Tabla del día, agrupada por línea
  let tabla='';
  D.lineas.forEach(linea=>{
    const items=D.filas.filter(r=>r.tipo===linea);
    if(!items.length)return;
    const S=D.totalDe(items);
    const uD=S.progDia?S.efDia/S.progDia*100:0, uS=S.progSem?S.efSem/S.progSem*100:0;
    tabla+=`<tr><td colspan="9" style="${TD};background:#e8edf3;font-weight:900;color:${AZ};text-transform:uppercase">${linea} · ${items.length} equipo(s) · ${S.conParte} con parte</td></tr>`;
    items.forEach(r=>{
      tabla+=`<tr${r.nDia?'':' style="background:#fdf6f6"'}>
        <td style="${TD};white-space:nowrap"><b>${r.eq.codigo||''}</b>${r.eq.placa?` <span style="color:#666;font-size:9px">· ${r.eq.placa}</span>`:''}</td>
        <td style="${TD};font-size:9px;color:#555">${r.sub||''}</td>
        <td style="${TD};text-align:center">${r.nDia||'—'}</td>
        <td style="${TD};text-align:right">${r.progDia?fmt1(r.progDia):'—'}</td>
        <td style="${TD};text-align:right;font-weight:700">${r.nDia?fmt1(r.efDia):'—'}</td>
        <td style="${TD};text-align:right;color:${r.imDia?'#b91c1c':'#999'}">${r.imDia?fmt1(r.imDia):'—'}</td>
        <td style="${TD};text-align:right">${r.nDia?pctU(r.utilDia):'<span style="color:#b91c1c;font-weight:700;font-size:9px">SIN PARTE</span>'}</td>
        <td style="${TD};text-align:right;background:#f6f8fa">${r.nSem?fmt1(r.efSem):'—'}</td>
        <td style="${TD};text-align:right;background:#f6f8fa">${r.nSem?pctU(r.utilSem):'—'}</td>
      </tr>`;
    });
    tabla+=`<tr style="background:#eef2f7;font-weight:800">
      <td style="${TD}" colspan="3">Subtotal ${linea}</td>
      <td style="${TD};text-align:right">${fmt1(S.progDia)}</td>
      <td style="${TD};text-align:right">${fmt1(S.efDia)}</td>
      <td style="${TD};text-align:right;color:${S.imDia?'#b91c1c':'#999'}">${S.imDia?fmt1(S.imDia):'—'}</td>
      <td style="${TD};text-align:right">${pctU(uD)}</td>
      <td style="${TD};text-align:right">${fmt1(S.efSem)}</td>
      <td style="${TD};text-align:right">${pctU(uS)}</td>
    </tr>`;
  });

  const T=D.total;
  return`
  <div style="font-family:Arial,Helvetica,sans-serif;color:#111">
    <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;border-bottom:3px solid ${AZ};padding-bottom:6px">
      <div style="flex:1;font-size:10px;color:#333">
        <div style="font-weight:800;color:${AZ}">${D.diaNombre} ${_phdDMY(D.fecha)}</div>
        <div>Semana ${_phdDMY(D.sem[0])} al ${_phdDMY(D.sem[6])}</div>
        <div>Corte ${_phdDMY(D.cIni)} al ${_phdDMY(D.cFin)}</div>
      </div>
      <div style="flex:2;text-align:center">
        <div style="font-size:19px;font-weight:900;color:${AZ};letter-spacing:.03em">REPORTE DIARIO — UTILIZACIÓN DE EQUIPOS</div>
        <div style="font-size:11px;font-weight:800;color:#2563eb;margin-top:2px">RELAVERA R3 COTA 4416: RECRECIMIENTO DEL DIQUE ETAPA 2 FASE 4</div>
      </div>
      <div style="flex:1;text-align:right">${logoUrl?`<img src="${logoUrl}" alt="ECOSERMO" style="height:46px;max-width:175px;object-fit:contain">`:''}</div>
    </div>

    <div style="display:grid;grid-auto-flow:column;grid-auto-columns:1fr;gap:6px;margin-top:10px">
      ${kpi('Utilización del día',T.progDia?T.utilDia.toFixed(1)+'%':'—',utlCol(T.utilDia))}
      ${kpi('Hs efectivas del día',fmt1(T.efDia)+'h / '+fmt1(T.progDia)+'h prog.',AZ)}
      ${kpi('Hs inoperativas',T.imDia?fmt1(T.imDia)+'h':'—',T.imDia?'#b91c1c':'#555')}
      ${kpi('Equipos con parte',T.conParte+' / '+T.n,'#0e7490')}
      ${kpi('Utilización de la semana',T.progSem?T.utilSem.toFixed(1)+'%':'—',utlCol(T.utilSem))}
    </div>

    ${graficos}

    ${sec('Detalle del día por equipo — '+D.diaNombre+' '+_phdDMY(D.fecha))}
    <table style="${TBL}">
      <tr>
        <th style="${TH};text-align:left">Equipo</th><th style="${TH};text-align:left">Subtipo</th>
        <th style="${TH}">Partes</th><th style="${TH}">H. Prog.</th><th style="${TH}">H. Efect.</th>
        <th style="${TH}">H. Inoper.</th><th style="${TH}">Utiliz. %</th>
        <th style="${TH}">H. Efect. sem.</th><th style="${TH}">Utiliz. sem. %</th>
      </tr>
      ${tabla||`<tr><td colspan="9" style="${TD};text-align:center;color:#777">Sin equipos de línea registrados</td></tr>`}
      ${D.filas.length?`<tr style="background:#dde5ee;font-weight:900">
        <td style="${TD}" colspan="3">TOTAL</td>
        <td style="${TD};text-align:right">${fmt1(T.progDia)}</td>
        <td style="${TD};text-align:right">${fmt1(T.efDia)}</td>
        <td style="${TD};text-align:right;color:${T.imDia?'#b91c1c':'#999'}">${T.imDia?fmt1(T.imDia):'—'}</td>
        <td style="${TD};text-align:right">${pctU(T.utilDia)}</td>
        <td style="${TD};text-align:right">${fmt1(T.efSem)}</td>
        <td style="${TD};text-align:right">${pctU(T.utilSem)}</td>
      </tr>`:''}
    </table>
    <div style="font-size:8.5px;color:#666;margin-top:2px">
      H. Prog. = Nº de partes del día × ${D.HP}h · Utiliz. = H. Efect. ÷ H. Prog. ·
      Utiliz.: <span style="color:#15803d">■</span> ≥75% · <span style="color:#b45309">■</span> 60–74% · <span style="color:#b91c1c">■</span> &lt;60% ·
      las filas en rosado no tienen parte ese día · los equipos desmovilizados no se listan
    </div>
  </div>`;
}

// ── Impresión (mismo motor que el Resumen Semanal) ──────────────────────────
function _phdPrint(){
  const win=window.open('','_blank');
  if(!win){toast('Active ventanas emergentes para imprimir',true);return;}
  win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Reporte Diario Horas Máquina</title>
  <style>body{margin:0;background:#fff}*{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}img{max-width:100%}#doc{width:1010px;padding:20px;box-sizing:content-box;zoom:0.7559}</style>
  </head><body><div id="doc">${_phdDoc()}</div>
  <script>
  window.onload=function(){
    var d=document.getElementById('doc');
    var hpx=d.getBoundingClientRect().height+4;
    var hmm=Math.ceil(hpx/96*25.4);
    var st=document.createElement('style');
    st.textContent='@page{size:210mm '+hmm+'mm;margin:0}';
    document.head.appendChild(st);
    window.print();
  };
  <${'/'}script></body></html>`);
  win.document.close();
}

// ── Pestaña ─────────────────────────────────────────────────────────────────
function _phdRender(){
  const el=document.getElementById('phTabBody');if(!el)return;
  const sem=_phdSemana();
  if(!_phdFecha||_phdFecha<sem[0]||_phdFecha>sem[6])_phdFecha=_phdDefault();
  const inpS='font-size:.72rem;padding:.2rem .4rem;border-radius:5px;border:1px solid var(--border);background:var(--panel2);color:var(--text);flex-shrink:0';
  const dNom=_PHD_DIAS[new Date(_phdFecha+'T12:00:00').getDay()];
  const bar=`<div style="display:flex;align-items:center;gap:.5rem;flex-wrap:wrap;margin-bottom:.8rem;padding:.4rem .7rem;background:var(--panel2);border:1px solid var(--border);border-radius:8px">
    <span style="font-size:.62rem;color:var(--muted2);font-weight:700;text-transform:uppercase;letter-spacing:.08em">Día</span>
    <button onclick="_phdNav(-1)" style="background:none;border:1px solid var(--border);border-radius:5px;color:var(--text);cursor:pointer;font-size:.85rem;padding:.12rem .5rem" title="Día anterior">‹</button>
    <input type="date" value="${_phdFecha}" onchange="_phdSetFecha(this.value)" style="${inpS};width:135px">
    <button onclick="_phdNav(1)" style="background:none;border:1px solid var(--border);border-radius:5px;color:var(--text);cursor:pointer;font-size:.85rem;padding:.12rem .5rem" title="Día siguiente">›</button>
    <span style="font-size:.72rem;color:var(--ceq);font-weight:700;font-family:monospace;white-space:nowrap">${dNom} ${_phdDMY(_phdFecha)}</span>
    <button onclick="_phdFecha='';rPanelHoras()" style="font-size:.62rem;padding:.2rem .5rem;border-radius:5px;border:1px solid var(--border);background:transparent;color:var(--muted2);cursor:pointer" title="Último día con partes de la semana">Último con partes</button>
    <span style="font-size:.62rem;color:var(--muted2)">Semana ${_phdDMY(sem[0])} al ${_phdDMY(sem[6])} · vista previa del documento</span>
    <button onclick="_phdPrint()" style="margin-left:auto;font-size:.72rem;padding:.3rem .9rem;border-radius:6px;border:none;background:#b91c1c;color:#fff;cursor:pointer;font-weight:800;white-space:nowrap">🖨 Imprimir / PDF</button>
  </div>`;
  el.innerHTML=bar+`<div style="background:#fff;border-radius:8px;padding:1.1rem 1.4rem;max-width:1050px;box-shadow:0 4px 18px rgba(0,0,0,.45)">${_phdDoc()}</div>`;
}
