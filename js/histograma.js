// ══ HISTOGRAMA DE RECURSOS (Plan semanal por recurso · Fase 1: grilla + importador) ══
const _HG_GRUPOS=['Equipos','Equipos Menores','Vehículos','Operadores','Personal Obrero','Staff','Conductores'];
const _HG_COLOR={'Equipos':'#f59e0b','Equipos Menores':'#84cc16','Vehículos':'#8b5cf6','Operadores':'#06b6d4','Personal Obrero':'#10b981','Staff':'#3b82f6','Conductores':'#ec4899'};
let _hgColsExtra=new Set();

// Columnas = unión de todas las fechas presentes en los datos + las agregadas en la sesión
function _hgCols(){
  const s=new Set([..._hgColsExtra]);
  (DB.histogramaPlan||[]).forEach(r=>Object.keys(r.valores||{}).forEach(k=>s.add(k)));
  return[...s].sort();
}
function _hgLblCol(iso){
  const M=['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Set','Oct','Nov','Dic'];
  const p=iso.split('-');
  return(+p[2])+'-'+(M[+p[1]-1]||p[1]);
}

let _hgTab=1;
function _hgTabSw(t){_hgTab=t;rHistograma();}
function rHistograma(){
  const root=document.getElementById('hgBody');if(!root)return;
  // Preservar la posición del scroll de la grilla entre re-renderizados (al editar celdas)
  const prevScroll=document.getElementById('hgScroll');
  const sT=prevScroll?prevScroll.scrollTop:0,sL=prevScroll?prevScroll.scrollLeft:0;
  const tabs=[[1,'📝 Plan'],[2,'🆚 Plan vs Real']];
  root.innerHTML=`<div style="display:flex;gap:.35rem;margin-bottom:.8rem;flex-wrap:wrap">${tabs.map(([n,lbl])=>{const sel=_hgTab===n;return`<button onclick="_hgTabSw(${n})" style="font-size:.72rem;padding:.35rem .9rem;border-radius:7px;border:1px solid ${sel?'var(--ctl)':'var(--border)'};background:${sel?'rgba(16,185,129,.15)':'var(--panel2)'};color:${sel?'var(--ctl)':'var(--muted2)'};cursor:pointer;font-weight:${sel?'800':'500'}">${lbl}</button>`;}).join('')}</div><div id="hgTabBody"></div>`;
  if(_hgTab===2){_hgRenderVs();}
  else{_hgRenderPlan();}
  const nowScroll=document.getElementById('hgScroll');
  if(nowScroll){nowScroll.scrollTop=sT;nowScroll.scrollLeft=sL;}
}
function _hgRenderPlan(){
  const el=document.getElementById('hgTabBody');if(!el)return;
  const cols=_hgCols();
  const rows=(DB.histogramaPlan||[]).slice().sort((a,b)=>{
    const ga=_HG_GRUPOS.indexOf(a.grupo),gb=_HG_GRUPOS.indexOf(b.grupo);
    return(ga<0?99:ga)-(gb<0?99:gb)||(+a.orden||0)-(+b.orden||0)||String(a.recurso).localeCompare(String(b.recurso));
  });
  const hoy=today();
  let colAct='';cols.forEach(c=>{if(c<=hoy)colAct=c;});
  const TH='padding:.4rem .4rem;font-size:.58rem;text-transform:uppercase;color:var(--muted2);white-space:nowrap;border:1px solid var(--border);text-align:center';
  const TD='padding:.1rem .18rem;border:1px solid var(--border);font-size:.72rem;vertical-align:middle';
  const inpS='font-size:.72rem;padding:.2rem .4rem;border-radius:5px;border:1px solid var(--border);background:var(--panel2);color:var(--text)';

  // Barra superior
  const bar=`<div style="display:flex;align-items:center;gap:.5rem;flex-wrap:wrap;margin-bottom:.8rem;padding:.45rem .7rem;background:var(--panel2);border:1px solid var(--border);border-radius:8px">
    <button onclick="openM('mHgImport')" style="font-size:.72rem;padding:.3rem .8rem;border-radius:6px;border:none;background:#0e7490;color:#fff;cursor:pointer;font-weight:700">📋 Importar desde Excel</button>
    <div style="width:1px;height:18px;background:var(--border)"></div>
    <span style="font-size:.62rem;color:var(--muted2);font-weight:700;text-transform:uppercase;letter-spacing:.06em">＋ Recurso</span>
    <select id="hgNewGrupo" style="${inpS}">${_HG_GRUPOS.map(g=>`<option>${g}</option>`).join('')}</select>
    <input id="hgNewRec" placeholder="Nombre del recurso..." style="${inpS};width:190px" onkeydown="if(event.key==='Enter')_hgAddRec()">
    <button onclick="_hgAddRec()" style="font-size:.72rem;padding:.28rem .6rem;border-radius:5px;border:1px solid #10b98150;background:rgba(16,185,129,.12);color:#10b981;cursor:pointer;font-weight:700">＋</button>
    <div style="width:1px;height:18px;background:var(--border)"></div>
    <span style="font-size:.62rem;color:var(--muted2);font-weight:700;text-transform:uppercase;letter-spacing:.06em">＋ Semana</span>
    <input id="hgNewCol" type="date" style="${inpS};width:135px">
    <button onclick="_hgAddCol()" style="font-size:.72rem;padding:.28rem .6rem;border-radius:5px;border:1px solid var(--border);background:transparent;color:var(--muted2);cursor:pointer">＋</button>
    <button onclick="_hgPrint()" style="margin-left:auto;font-size:.7rem;padding:.25rem .7rem;border-radius:5px;border:1px solid #ef444460;background:transparent;color:#ef4444;cursor:pointer;font-weight:700;white-space:nowrap">🖨 PDF</button>
    <button onclick="_hgExport()" style="font-size:.7rem;padding:.25rem .7rem;border-radius:5px;border:none;background:#166534;color:#fff;cursor:pointer;font-weight:700;white-space:nowrap">📊 Excel</button>
  </div>`;

  if(!rows.length){
    el.innerHTML=bar+`<div class="card"><div class="card-body" style="text-align:center;padding:3rem;color:var(--muted2)">
      <div style="font-size:2rem;margin-bottom:.5rem">📊</div>
      <div style="font-size:.9rem;font-weight:700;margin-bottom:.35rem">Aún no hay recursos en el histograma</div>
      <div style="font-size:.75rem">Usa <b style="color:#0e7490">📋 Importar desde Excel</b> (copia el bloque de tu histograma y pégalo) o agrega recursos manualmente arriba.</div>
      <div style="font-size:.68rem;margin-top:.8rem;color:var(--muted)">Requiere la tabla <span class="mono">histograma_plan</span> en Supabase (ver SQL en la documentación del cambio)</div>
    </div></div>`;
    return;
  }

  const grupos=[...new Set(rows.map(r=>r.grupo))];
  let body='';
  grupos.forEach(function(g){
    const items=rows.filter(r=>r.grupo===g);
    const col=_HG_COLOR[g]||'#6b7280';
    body+=`<tr><td colspan="${cols.length+2}" style="padding:.4rem .7rem;background:${col}14;border:1px solid var(--border);border-left:4px solid ${col};color:${col};font-weight:800;font-size:.72rem;text-transform:uppercase">${g} · ${items.length} recurso(s)</td></tr>`;
    items.forEach(function(r){
      const pico=cols.reduce((m,c)=>Math.max(m,+((r.valores||{})[c])||0),0);
      body+=`<tr>
        <td style="${TD};white-space:nowrap;padding:.12rem .5rem;min-width:210px">
          <span style="font-weight:600;cursor:pointer" ondblclick="_hgRenName(${r.id})" title="Doble click: renombrar">${r.recurso}</span>
          <button onclick="_hgDelRec(${r.id})" style="background:none;border:none;color:#ef444455;cursor:pointer;font-size:.65rem;float:right" title="Eliminar recurso">🗑</button>
        </td>
        ${cols.map(c=>{
          const v=(r.valores||{})[c];
          return`<td style="${TD};${c===colAct?'background:rgba(245,158,11,.08);':''}"><input value="${v!=null?v:''}" onchange="_hgSetVal(${r.id},'${c}',this.value)" style="width:42px;background:transparent;border:none;color:var(--text);font-family:monospace;font-size:.72rem;text-align:right;outline:none"></td>`;
        }).join('')}
        <td style="${TD};text-align:right;font-family:monospace;font-weight:800;color:${col}">${pico||'—'}</td>
      </tr>`;
    });
    body+=`<tr style="background:var(--panel2)">
      <td style="${TD};font-size:.6rem;font-weight:800;color:${col};text-transform:uppercase;padding:.15rem .5rem">Total ${g}</td>
      ${cols.map(c=>{const s=items.reduce((x,r)=>x+(+((r.valores||{})[c])||0),0);return`<td style="${TD};text-align:right;font-family:monospace;font-weight:800;color:${s?col:'var(--muted)'};${c===colAct?'background:rgba(245,158,11,.1);':''}">${s||'—'}</td>`;}).join('')}
      <td style="${TD}"></td>
    </tr>`;
  });

  el.innerHTML=bar+`
  <div class="kpi-row">
    <div class="kpi" style="--kc:#0e7490"><div class="kpi-lbl">Recursos</div><div class="kpi-val" style="font-size:1.5rem">${rows.length}</div></div>
    <div class="kpi" style="--kc:#8b5cf6"><div class="kpi-lbl">Semanas Planificadas</div><div class="kpi-val" style="font-size:1.5rem">${cols.length}</div></div>
    <div class="kpi" style="--kc:#f59e0b"><div class="kpi-lbl">Semana Vigente</div><div class="kpi-val" style="font-size:1.5rem">${colAct?_hgLblCol(colAct):'—'}</div></div>
    <div class="kpi" style="--kc:#10b981"><div class="kpi-lbl">Plan Total Semana Vigente</div><div class="kpi-val" style="font-size:1.5rem">${colAct?rows.reduce((s,r)=>s+(+((r.valores||{})[colAct])||0),0):'—'}</div></div>
  </div>
  <div class="card" style="padding:0">
    <div class="tbl-wrap" id="hgScroll" style="max-height:70vh;overflow:auto">
    <table style="min-width:100%;border-collapse:collapse">
      <thead style="position:sticky;top:0;z-index:2"><tr style="background:var(--panel2)">
        <th style="${TH};text-align:left;min-width:210px">Recurso</th>
        ${cols.map(c=>`<th style="${TH};${c===colAct?'color:#f59e0b;background:rgba(245,158,11,.12);':''}" title="${c}">${_hgLblCol(c)}<div><button onclick="_hgDelCol('${c}')" title="Eliminar esta columna (borra sus valores)" style="background:none;border:none;color:#ef444466;cursor:pointer;font-size:.6rem;padding:0;line-height:1">✕</button></div></th>`).join('')}
        <th style="${TH}" title="Valor máximo planificado">Pico</th>
      </tr></thead>
      <tbody>${body}</tbody>
      <tfoot><tr style="background:var(--panel2);border-top:2px solid var(--border)">
        <td style="${TD};font-size:.62rem;font-weight:800;color:var(--text);text-transform:uppercase;padding:.15rem .5rem">TOTAL GENERAL</td>
        ${cols.map(c=>{const s=rows.reduce((x,r)=>x+(+((r.valores||{})[c])||0),0);return`<td style="${TD};text-align:right;font-family:monospace;font-weight:900;color:${s?'var(--ctl)':'var(--muted)'}">${s||'—'}</td>`;}).join('')}
        <td style="${TD}"></td>
      </tr></tfoot>
    </table>
    </div>
  </div>
  <div style="margin-top:.5rem;font-size:.64rem;color:var(--muted2)">Celdas editables (clic y escribe, se guarda al salir de la celda) · Doble click en el nombre para renombrar · Columna ámbar = semana vigente · Pico = máximo planificado del recurso</div>`;
}

function _hgSetVal(id,iso,val){
  const r=(DB.histogramaPlan||[]).find(x=>x.id===id);if(!r)return;
  r.valores=r.valores||{};
  const t=String(val).trim();
  if(t===''||t==='-'){delete r.valores[iso];}
  else{
    const n=+t.replace(',','.');
    if(isNaN(n)||n<0){toast('Valor inválido',true);rHistograma();return;}
    r.valores[iso]=n;
  }
  supaUpsert('histogramaPlan',r);
  rHistograma();
}
function _hgDelCol(iso){
  const conDatos=(DB.histogramaPlan||[]).filter(r=>r.valores&&r.valores[iso]!=null);
  const msg=conDatos.length
    ?`La columna ${_hgLblCol(iso)} (${iso}) tiene ${conDatos.length} valor(es) guardados.\n\n¿Eliminar la columna y BORRAR esos valores de forma permanente?`
    :`¿Quitar la columna ${_hgLblCol(iso)} (${iso})?`;
  if(!confirm(msg))return;
  conDatos.forEach(r=>{delete r.valores[iso];supaUpsert('histogramaPlan',r);});
  _hgColsExtra.delete(iso);
  rHistograma();
  toast('Columna '+_hgLblCol(iso)+' eliminada');
}
function _hgAddCol(){
  const el=document.getElementById('hgNewCol');
  if(!el||!el.value){toast('Elige una fecha para la nueva semana',true);return;}
  _hgColsExtra.add(el.value);
  rHistograma();
  toast('Columna '+_hgLblCol(el.value)+' agregada — se fija al guardar algún valor en ella');
}
function _hgAddRec(){
  const grupo=document.getElementById('hgNewGrupo').value;
  const nom=(document.getElementById('hgNewRec').value||'').trim();
  if(!nom){toast('Escribe el nombre del recurso',true);return;}
  const rec={id:nid('hpl'),grupo,recurso:nom,orden:(DB.histogramaPlan||[]).filter(r=>r.grupo===grupo).length+1,vinculo:'',valores:{}};
  (DB.histogramaPlan=DB.histogramaPlan||[]).push(rec);
  supaUpsert('histogramaPlan',rec);
  rHistograma();
  toast('Recurso agregado a '+grupo);
}
function _hgDelRec(id){
  const r=(DB.histogramaPlan||[]).find(x=>x.id===id);if(!r)return;
  if(!confirm('¿Eliminar "'+r.recurso+'" del histograma?'))return;
  DB.histogramaPlan=DB.histogramaPlan.filter(x=>x.id!==id);
  supaDelete('histogramaPlan',id);
  rHistograma();
}
function _hgRenName(id){
  const r=(DB.histogramaPlan||[]).find(x=>x.id===id);if(!r)return;
  const n=prompt('Nombre del recurso:',r.recurso);
  if(n===null||!n.trim())return;
  r.recurso=n.trim();
  supaUpsert('histogramaPlan',r);
  rHistograma();
}

// ── IMPORTADOR: pegar el bloque copiado desde Excel (incluyendo la fila de fechas) ──
function _hgImport(){
  const grupo=document.getElementById('hgImpGrupo').value;
  const anio=+document.getElementById('hgImpAnio').value||2026;
  const txt=document.getElementById('hgImpTxt').value;
  if(!txt.trim()){toast('Pega los datos primero',true);return;}
  const MESES={ene:1,feb:2,mar:3,abr:4,may:5,jun:6,jul:7,ago:8,set:9,sep:9,oct:10,nov:11,dic:12};
  const parseFecha=t=>{
    t=String(t||'').trim().toLowerCase();
    if(!t)return null;
    let m=t.match(/^(\d{1,2})[\-\/\s]([a-záéíóú]+)/);
    if(m&&MESES[m[2].slice(0,3)])return `${anio}-${String(MESES[m[2].slice(0,3)]).padStart(2,'0')}-${String(+m[1]).padStart(2,'0')}`;
    m=t.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if(m)return t;
    m=t.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?$/);
    if(m)return `${m[3]?(m[3].length===2?'20'+m[3]:m[3]):anio}-${String(+m[2]).padStart(2,'0')}-${String(+m[1]).padStart(2,'0')}`;
    return null;
  };
  const lines=txt.replace(/\r/g,'').split('\n').filter(l=>l.trim());
  let fechas=null,importados=0,celdas=0;
  for(const line of lines){
    const cells=line.split('\t');
    if(!fechas){
      const fp=cells.map(parseFecha);
      if(fp.filter(Boolean).length>=3){fechas=fp;continue;}
      continue; // aún no llega la cabecera de fechas
    }
    const nombre=(cells[0]||'').trim();
    if(!nombre||/^(recursos?|programa|total)/i.test(nombre))continue;
    const valores={};
    cells.forEach((c,i)=>{
      if(!fechas[i])return;
      const v=String(c).replace(/,/g,'').trim();
      if(v===''||v==='-'||v==='—')return;
      const n=+v;
      if(!isNaN(n)){valores[fechas[i]]=n;celdas++;}
    });
    // Reimportar el mismo recurso del mismo grupo ACTUALIZA en lugar de duplicar
    let rec=(DB.histogramaPlan||[]).find(r=>r.grupo===grupo&&String(r.recurso).toLowerCase()===nombre.toLowerCase());
    if(rec){rec.valores={...(rec.valores||{}),...valores};}
    else{
      rec={id:nid('hpl'),grupo,recurso:nombre,orden:(DB.histogramaPlan||[]).filter(r=>r.grupo===grupo).length+1,vinculo:'',valores};
      (DB.histogramaPlan=DB.histogramaPlan||[]).push(rec);
    }
    supaUpsert('histogramaPlan',rec);
    importados++;
  }
  if(!fechas){toast('No encontré la fila de fechas (1-Jun, 4-Jun...). Copia el bloque INCLUYENDO esa fila.',true);return;}
  if(!importados){toast('No se detectaron filas de recursos debajo de la cabecera',true);return;}
  document.getElementById('hgImpTxt').value='';
  closeM('mHgImport');
  toast(`✓ Importado a ${grupo}: ${importados} recurso(s) · ${celdas} celda(s)`);
  rHistograma();
}

function _hgExport(){
  if(typeof XLSX==='undefined'){toast('Librería Excel no disponible',true);return;}
  const cols=_hgCols();
  const rows=(DB.histogramaPlan||[]).slice().sort((a,b)=>{
    const ga=_HG_GRUPOS.indexOf(a.grupo),gb=_HG_GRUPOS.indexOf(b.grupo);
    return(ga<0?99:ga)-(gb<0?99:gb)||(+a.orden||0)-(+b.orden||0);
  });
  const aoa=[
    ['HISTOGRAMA DE RECURSOS — PLAN'],
    ['Grupo','Recurso',...cols.map(_hgLblCol)],
    ...rows.map(r=>[r.grupo,r.recurso,...cols.map(c=>{const v=(r.valores||{})[c];return v!=null?v:'';})]),
    ['','TOTAL GENERAL',...cols.map(c=>rows.reduce((s,r)=>s+(+((r.valores||{})[c])||0),0))]
  ];
  const ws=XLSX.utils.aoa_to_sheet(aoa);
  const wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,ws,'Histograma');
  XLSX.writeFile(wb,'histograma_recursos.xlsx');
}

// ══════════ FASE 2: PLAN VS REAL ══════════
// Vínculo por fila: 'eq:TEXTO' (equipos por subtipo con partes en la semana) · 'cargo:TEXTO' (personal por cargo con tareaje trabajado)
// Semana de una columna = del día de la columna a +6 días · Varios términos con | (PEON|VIGIA)
let _hgVsChart=null;

function _hgRowsOrdenadas(){
  return(DB.histogramaPlan||[]).slice().sort((a,b)=>{
    const ga=_HG_GRUPOS.indexOf(a.grupo),gb=_HG_GRUPOS.indexOf(b.grupo);
    return(ga<0?99:ga)-(gb<0?99:gb)||(+a.orden||0)-(+b.orden||0)||String(a.recurso).localeCompare(String(b.recurso));
  });
}

// Precalcula, por columna-semana pasada: equipos con partes (id→subtipo) y personal con tareaje trabajado (id→cargo)
function _hgRealData(cols){
  const pad=n=>String(n).padStart(2,'0');
  const hoy=today();
  const colsPast=cols.filter(c=>c<=hoy);
  const finDe={};
  colsPast.forEach(c=>{const d=new Date(c+'T12:00:00');d.setDate(d.getDate()+6);finDe[c]=`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;});
  const colDe=f=>{let sel=null;for(const c of colsPast){if(c<=f&&f<=finDe[c])sel=c;}return sel;};
  const eqW={},pgW={};
  colsPast.forEach(c=>{eqW[c]={};pgW[c]={};});
  const eqById={};(DB.equipos||[]).forEach(e=>{eqById[e.id]=e;});
  (DB.partes||[]).forEach(p=>{
    if(!p.fecha||!p.eqId)return;
    const c=colDe(p.fecha);if(!c)return;
    const eq=eqById[p.eqId];if(!eq)return;
    eqW[c][p.eqId]=String(eq.sub||eq.nombre||'').toUpperCase();
  });
  const perById={};(DB.personal||[]).forEach(x=>{perById[x.id]=x;});
  const TRAB={TD:1,TN:1,DLT:1,A5:1};
  (DB.tareaje||[]).forEach(r=>{
    if(!r.fecha||!TRAB[r.tipo])return;
    const c=colDe(r.fecha);if(!c)return;
    const per=perById[r.personalId];if(!per)return;
    pgW[c][r.personalId]=String(per.cargo||'').toUpperCase();
  });
  return{eqW,pgW,colsPast:new Set(colsPast)};
}
function _hgReal(row,col,RD){
  if(!row.vinculo||!RD.colsPast.has(col))return null;
  const i=String(row.vinculo).indexOf(':');if(i<1)return null;
  const tipo=row.vinculo.slice(0,i);
  const terms=row.vinculo.slice(i+1).toUpperCase().split('|').map(t=>t.trim()).filter(Boolean);
  if(!terms.length)return null;
  const src=tipo==='eq'?RD.eqW[col]:tipo==='cargo'?RD.pgW[col]:null;
  if(!src)return null;
  let n=0;
  Object.values(src).forEach(s=>{if(terms.some(t=>s.includes(t)))n++;});
  return n;
}
function _hgVincLbl(v){
  if(!v)return'';
  const i=String(v).indexOf(':');
  return(v.slice(0,i)==='eq'?'⚙ ':'👷 ')+v.slice(i+1);
}

function _hgRenderVs(){
  const el=document.getElementById('hgTabBody');if(!el)return;
  const cols=_hgCols();
  const rows=_hgRowsOrdenadas();
  if(!rows.length||!cols.length){
    el.innerHTML=`<div class="card"><div class="card-body" style="text-align:center;padding:3rem;color:var(--muted2);font-size:.85rem">Primero carga el Plan en el tab <b>📝 Plan</b> (importa desde Excel)</div></div>`;
    return;
  }
  const RD=_hgRealData(cols);
  const hoy=today();
  let colAct='';cols.forEach(c=>{if(c<=hoy)colAct=c;});
  const TH='padding:.4rem .4rem;font-size:.58rem;text-transform:uppercase;color:var(--muted2);white-space:nowrap;border:1px solid var(--border);text-align:center';
  const TD='padding:.14rem .25rem;border:1px solid var(--border);font-size:.7rem;vertical-align:middle';

  // KPIs de la semana vigente (solo filas vinculadas)
  let planAct=0,realAct=0,vinculadas=0;
  rows.forEach(r=>{
    if(!r.vinculo)return;
    vinculadas++;
    if(colAct){planAct+=+((r.valores||{})[colAct])||0;realAct+=_hgReal(r,colAct,RD)||0;}
  });
  const cump=planAct?realAct/planAct*100:0;
  const cumpCol=cump>=100?'#10b981':cump>=80?'#f59e0b':'#ef4444';

  const bar=`<div style="display:flex;align-items:center;gap:.5rem;flex-wrap:wrap;margin-bottom:.8rem;padding:.45rem .7rem;background:var(--panel2);border:1px solid var(--border);border-radius:8px">
    <button onclick="_hgAutoVinc()" style="font-size:.72rem;padding:.3rem .8rem;border-radius:6px;border:none;background:#7c3aed;color:#fff;cursor:pointer;font-weight:700" title="Intenta vincular automáticamente cada recurso con un subtipo de equipo o cargo de personal">✨ Auto-vincular</button>
    <span style="font-size:.66rem;color:var(--muted2)">${vinculadas} de ${rows.length} recursos vinculados · usa 🔗 en cada fila para ajustar</span>
    <span style="margin-left:auto;font-size:.64rem;color:var(--muted2)"><span style="color:#10b981">■</span> Real ≥ Plan · <span style="color:#f59e0b">■</span> ≥80% · <span style="color:#ef4444">■</span> &lt;80%</span>
    <button onclick="_hgPrint()" style="font-size:.7rem;padding:.25rem .7rem;border-radius:5px;border:1px solid #ef444460;background:transparent;color:#ef4444;cursor:pointer;font-weight:700;white-space:nowrap">🖨 PDF</button>
    <button onclick="_hgExportVs()" style="font-size:.7rem;padding:.25rem .7rem;border-radius:5px;border:none;background:#166534;color:#fff;cursor:pointer;font-weight:700;white-space:nowrap">📊 Excel</button>
  </div>`;

  const grupos=[...new Set(rows.map(r=>r.grupo))];
  let body='';
  grupos.forEach(function(g){
    const items=rows.filter(r=>r.grupo===g);
    const col=_HG_COLOR[g]||'#6b7280';
    body+=`<tr><td colspan="${cols.length+1}" style="padding:.4rem .7rem;background:${col}14;border:1px solid var(--border);border-left:4px solid ${col};color:${col};font-weight:800;font-size:.72rem;text-transform:uppercase">${g}</td></tr>`;
    items.forEach(function(r){
      const celdas=cols.map(function(c){
        const p=(r.valores||{})[c];
        const rl=_hgReal(r,c,RD);
        const esAct=c===colAct?'outline:1px solid rgba(245,158,11,.5);outline-offset:-1px;':'';
        if(rl==null)return`<td style="${TD};text-align:center;font-family:monospace;color:var(--muted2);${esAct}">${p!=null?p:'—'}</td>`;
        const pp=+p||0;
        const cc=rl>=pp?'#10b981':rl>=pp*0.8?'#f59e0b':'#ef4444';
        const bg=rl>=pp?'rgba(16,185,129,.10)':rl>=pp*0.8?'rgba(245,158,11,.10)':'rgba(239,68,68,.12)';
        return`<td style="${TD};text-align:center;background:${bg};${esAct}" title="Plan ${pp} · Real ${rl}"><span style="font-family:monospace;font-weight:900;color:${cc}">${rl}</span><span style="font-size:.58rem;color:var(--muted2);font-family:monospace">/${pp}</span></td>`;
      }).join('');
      body+=`<tr>
        <td style="${TD};white-space:nowrap;padding:.12rem .5rem;min-width:230px">
          <span style="font-weight:600">${r.recurso}</span>
          <button onclick="_hgVincOpen(${r.id},this)" style="background:none;border:1px solid ${r.vinculo?'#10b98140':'#f59e0b50'};border-radius:4px;color:${r.vinculo?'#10b981':'#f59e0b'};cursor:pointer;font-size:.58rem;padding:.05rem .3rem;margin-left:.3rem" title="${r.vinculo?'Vínculo: '+_hgVincLbl(r.vinculo):'Sin vínculo — clic para configurar'}">${r.vinculo?_hgVincLbl(r.vinculo):'🔗 vincular'}</button>
        </td>
        ${celdas}
      </tr>`;
    });
  });

  el.innerHTML=bar+`
  <div class="kpi-row">
    <div class="kpi" style="--kc:#8b5cf6"><div class="kpi-lbl">Semana Vigente</div><div class="kpi-val" style="font-size:1.5rem">${colAct?_hgLblCol(colAct):'—'}</div></div>
    <div class="kpi" style="--kc:#3b82f6"><div class="kpi-lbl">Plan (recursos vinculados)</div><div class="kpi-val" style="font-size:1.5rem">${planAct}</div></div>
    <div class="kpi" style="--kc:#10b981"><div class="kpi-lbl">Real de la Semana</div><div class="kpi-val" style="font-size:1.5rem">${realAct}</div></div>
    <div class="kpi" style="--kc:${cumpCol}"><div class="kpi-lbl">Cumplimiento</div><div class="kpi-val" style="font-size:1.5rem;color:${cumpCol}">${planAct?cump.toFixed(0)+'%':'—'}${planAct&&realAct<planAct?` <span style="font-size:.75rem;color:#ef4444">faltan ${planAct-realAct}</span>`:''}</div></div>
  </div>
  <div class="card" style="margin-bottom:.9rem"><div class="card-body" style="height:230px;position:relative;padding:.7rem"><canvas id="hgVsChart"></canvas></div></div>
  <div class="card" style="padding:0">
    <div class="tbl-wrap" id="hgScroll" style="max-height:65vh;overflow:auto">
    <table style="min-width:100%;border-collapse:collapse">
      <thead style="position:sticky;top:0;z-index:2"><tr style="background:var(--panel2)">
        <th style="${TH};text-align:left;min-width:230px">Recurso · Vínculo</th>
        ${cols.map(c=>`<th style="${TH};${c===colAct?'color:#f59e0b;background:rgba(245,158,11,.12);':''}" title="${c}">${_hgLblCol(c)}</th>`).join('')}
      </tr></thead>
      <tbody>${body}</tbody>
    </table>
    </div>
  </div>
  <div style="margin-top:.5rem;font-size:.64rem;color:var(--muted2)">Celda = <b>Real</b>/Plan · Real: ⚙ equipos con partes diarios en la semana (por subtipo) · 👷 personas con tareaje trabajado (TD/TN/DLT/A5) en la semana (por cargo) · Semana = fecha de la columna + 6 días · Semanas futuras muestran solo el plan</div>`;

  // Gráfico Plan vs Real por semana (totales de filas vinculadas)
  if(typeof Chart!=='undefined'){
    if(_hgVsChart){_hgVsChart.destroy();_hgVsChart=null;}
    const ctx=document.getElementById('hgVsChart');
    if(ctx){
      const vinc=rows.filter(r=>r.vinculo);
      const planTot=cols.map(c=>vinc.reduce((s,r)=>s+(+((r.valores||{})[c])||0),0));
      const realTot=cols.map(c=>{if(!RD.colsPast.has(c))return null;return vinc.reduce((s,r)=>s+(_hgReal(r,c,RD)||0),0);});
      _hgVsChart=new Chart(ctx,{
        type:'bar',
        data:{
          labels:cols.map(_hgLblCol),
          datasets:[
            {label:'Plan',data:planTot,backgroundColor:'rgba(59,130,246,.45)',borderRadius:2},
            {label:'Real',data:realTot,backgroundColor:'rgba(16,185,129,.85)',borderRadius:2}
          ]
        },
        options:{
          responsive:true,maintainAspectRatio:false,
          plugins:{
            legend:{position:'bottom',labels:{color:'#8b93a7',font:{size:9},boxWidth:10}},
            title:{display:true,text:'Recursos vinculados: Plan vs Real por semana',color:'#8b93a7',font:{size:11}}
          },
          scales:{
            x:{ticks:{color:'#8b93a7',font:{size:8}},grid:{display:false}},
            y:{beginAtZero:true,ticks:{color:'#8b93a7',font:{size:9}},grid:{color:'rgba(139,147,167,.12)'}}
          }
        }
      });
    }
  }
}

// ── Popup para configurar el vínculo de una fila ──
let _hgVincCb=null;
function _hgVincClose(){
  if(_hgVincCb){document.removeEventListener('click',_hgVincCb);_hgVincCb=null;}
  const pk=document.getElementById('hgVincPop');if(pk)pk.style.display='none';
}
function _hgVincOpen(id,btn){
  _hgVincClose();
  let pk=document.getElementById('hgVincPop');
  if(!pk){pk=document.createElement('div');pk.id='hgVincPop';document.body.appendChild(pk);}
  const r=(DB.histogramaPlan||[]).find(x=>x.id===id);if(!r)return;
  const cur=r.vinculo||'';const i=cur.indexOf(':');
  const curTipo=i>0?cur.slice(0,i):(['Operadores','Personal Obrero','Staff','Conductores'].includes(r.grupo)?'cargo':'eq');
  const curTxt=i>0?cur.slice(i+1):'';
  const subs=[...new Set((DB.equipos||[]).map(e=>String(e.sub||'').toUpperCase()).filter(Boolean))].sort();
  const cargos=[...new Set((DB.personal||[]).map(p=>String(p.cargo||'').toUpperCase()).filter(Boolean))].sort();
  const inpS='width:100%;background:var(--panel);border:1px solid var(--border);border-radius:5px;padding:.3rem .45rem;color:var(--text);font-size:.72rem';
  pk.innerHTML=`
    <div style="font-size:.66rem;font-weight:700;margin-bottom:.4rem;color:var(--text)">🔗 Vincular "<span style="color:var(--ctl)">${r.recurso}</span>" al Real</div>
    <select id="hgVTipo" style="${inpS};margin-bottom:.35rem">
      <option value="eq"${curTipo==='eq'?' selected':''}>⚙ Equipos por subtipo (partes de la semana)</option>
      <option value="cargo"${curTipo==='cargo'?' selected':''}>👷 Personal por cargo (tareaje de la semana)</option>
    </select>
    <input id="hgVTxt" list="dlHgVinc" value="${curTxt.replace(/"/g,'&quot;')}" placeholder="Texto a buscar · varios con | (PEON|VIGIA)" style="${inpS};margin-bottom:.45rem;font-family:monospace" onkeydown="if(event.key==='Enter')_hgVincSave(${id})">
    <datalist id="dlHgVinc">${[...subs,...cargos].map(s=>`<option value="${s}">`).join('')}</datalist>
    <div style="display:flex;gap:.3rem">
      <button onclick="_hgVincSave(${id})" style="flex:1;background:rgba(16,185,129,.15);border:1px solid #10b98150;border-radius:5px;color:#10b981;cursor:pointer;font-size:.68rem;padding:.3rem;font-weight:700">💾 Guardar</button>
      ${r.vinculo?`<button onclick="_hgVincQuitar(${id})" style="background:rgba(239,68,68,.12);border:1px solid #ef444450;border-radius:5px;color:#ef4444;cursor:pointer;font-size:.68rem;padding:.3rem .5rem">Quitar</button>`:''}
      <button onclick="_hgVincClose()" style="background:none;border:1px solid var(--border);border-radius:5px;color:var(--muted2);cursor:pointer;font-size:.68rem;padding:.3rem .5rem">✕</button>
    </div>`;
  const rc=btn.getBoundingClientRect();
  const w=340;
  const left=Math.max(4,Math.min(rc.left,window.innerWidth-w-10));
  const top=(window.innerHeight-rc.bottom-6>=190)?rc.bottom+4:Math.max(4,rc.top-190);
  pk.style.cssText=`display:block;position:fixed;left:${left}px;top:${top}px;z-index:9999;background:var(--panel2);border:1px solid var(--border);border-radius:8px;padding:.6rem;box-shadow:0 8px 24px rgba(0,0,0,.65);width:${w}px`;
  _hgVincCb=e=>{if(!pk.contains(e.target))_hgVincClose();};
  setTimeout(()=>document.addEventListener('click',_hgVincCb),10);
}
function _hgVincSave(id){
  const r=(DB.histogramaPlan||[]).find(x=>x.id===id);if(!r)return;
  const tipo=document.getElementById('hgVTipo').value;
  const txt=(document.getElementById('hgVTxt').value||'').trim().toUpperCase();
  if(!txt){toast('Escribe el texto del vínculo',true);return;}
  r.vinculo=tipo+':'+txt;
  supaUpsert('histogramaPlan',r);
  _hgVincClose();
  rHistograma();
  toast('Vínculo guardado: '+_hgVincLbl(r.vinculo));
}
function _hgVincQuitar(id){
  const r=(DB.histogramaPlan||[]).find(x=>x.id===id);if(!r)return;
  r.vinculo='';
  supaUpsert('histogramaPlan',r);
  _hgVincClose();
  rHistograma();
}

// ── Auto-vincular: busca el primer token del recurso dentro de los subtipos/cargos existentes ──
function _hgAutoVinc(){
  const subs=[...new Set((DB.equipos||[]).map(e=>String(e.sub||'').toUpperCase()).filter(Boolean))];
  const cargos=[...new Set((DB.personal||[]).map(p=>String(p.cargo||'').toUpperCase()).filter(Boolean))];
  let n=0;
  (DB.histogramaPlan||[]).forEach(r=>{
    if(r.vinculo)return;
    const esPersona=['Operadores','Personal Obrero','Staff','Conductores'].includes(r.grupo);
    const base=String(r.recurso).toUpperCase().replace(/^OP\.?\s+|^CON\.?\s+/,'');
    const univ=esPersona?cargos:subs;
    const toks=base.split(/[^A-ZÁÉÍÓÚÑ0-9]+/).filter(t=>t.length>=4);
    let term=null;
    for(const t of toks){if(univ.some(u=>u.includes(t))){term=t;break;}}
    if(!term)return;
    r.vinculo=(esPersona?'cargo':'eq')+':'+term;
    supaUpsert('histogramaPlan',r);
    n++;
  });
  toast(n?('✨ '+n+' recurso(s) vinculados automáticamente — revisa y ajusta con 🔗'):'No se encontraron coincidencias automáticas — vincula manualmente con 🔗',!n);
  rHistograma();
}

// ── IMPRESIÓN PDF (A4 horizontal · imprime el tab activo: Plan o Plan vs Real) ──
function _hgPrint(){
  const cols=_hgCols();
  const rows=_hgRowsOrdenadas();
  if(!rows.length||!cols.length){toast('No hay datos para imprimir',true);return;}
  const esVs=_hgTab===2;
  const RD=esVs?_hgRealData(cols):null;
  const hoy=today();
  let colAct='';cols.forEach(c=>{if(c<=hoy)colAct=c;});
  const _logoUrl=window.location.href.replace(/[^\/\\]+$/,'')+'09.-ERP/Imagenes/ECOSERMO-LOGO.png';
  const AZ='#1e3a5f';
  const grupos=[...new Set(rows.map(r=>r.grupo))];

  const thd=`<tr><th style="background:${AZ};color:#fff;text-align:left;min-width:130px;padding:2px 5px">Recurso${esVs?' · Vínculo':''}</th>${cols.map(c=>`<th style="background:${c===colAct?'#b45309':AZ};color:#fff;padding:2px 1px;font-size:6.5px;min-width:22px">${_hgLblCol(c)}</th>`).join('')}${esVs?'':`<th style="background:${AZ};color:#fff;font-size:6.5px">Pico</th>`}</tr>`;

  let body='';
  grupos.forEach(function(g){
    const items=rows.filter(r=>r.grupo===g);
    const col=_HG_COLOR[g]||'#6b7280';
    body+=`<tr><td colspan="${cols.length+(esVs?1:2)}" style="background:${col}22;border-left:3px solid ${col};font-weight:800;font-size:7.5px;text-transform:uppercase;color:#333;padding:2px 5px">${g}</td></tr>`;
    items.forEach(function(r){
      const celdas=cols.map(function(c){
        const p=(r.valores||{})[c];
        if(!esVs)return`<td style="text-align:center;font-family:monospace">${p!=null?p:''}</td>`;
        const rl=_hgReal(r,c,RD);
        if(rl==null)return`<td style="text-align:center;font-family:monospace;color:#94a3b8">${p!=null?p:''}</td>`;
        const pp=+p||0;
        const cc=rl>=pp?'#15803d':rl>=pp*0.8?'#b45309':'#b91c1c';
        const bg=rl>=pp?'#dcfce7':rl>=pp*0.8?'#fef3c7':'#fee2e2';
        return`<td style="text-align:center;font-family:monospace;background:${bg}"><b style="color:${cc}">${rl}</b><span style="color:#64748b;font-size:5.5px">/${pp}</span></td>`;
      }).join('');
      const pico=cols.reduce((m,c)=>Math.max(m,+((r.valores||{})[c])||0),0);
      body+=`<tr><td style="font-weight:700;padding:1px 5px;white-space:nowrap">${r.recurso}${esVs&&r.vinculo?` <span style="color:#64748b;font-weight:400;font-size:6px">(${_hgVincLbl(r.vinculo)})</span>`:''}</td>${celdas}${esVs?'':`<td style="text-align:center;font-family:monospace;font-weight:800">${pico||''}</td>`}</tr>`;
    });
    if(!esVs){
      body+=`<tr style="background:#e8edf3"><td style="font-weight:800;font-size:6.5px;text-transform:uppercase;padding:1px 5px;color:${col}">Total ${g}</td>${cols.map(c=>{const s=items.reduce((x,r)=>x+(+((r.valores||{})[c])||0),0);return`<td style="text-align:center;font-family:monospace;font-weight:800">${s||''}</td>`;}).join('')}<td></td></tr>`;
    }
  });
  const totGen=esVs?'':`<tr style="background:#dbeafe"><td style="font-weight:900;font-size:7px;padding:2px 5px">TOTAL GENERAL</td>${cols.map(c=>{const s=rows.reduce((x,r)=>x+(+((r.valores||{})[c])||0),0);return`<td style="text-align:center;font-family:monospace;font-weight:900">${s||''}</td>`;}).join('')}<td></td></tr>`;

  const html=`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Histograma de Recursos${esVs?' — Plan vs Real':''}</title>
<style>@page{size:A4 landscape;margin:.7cm}*{box-sizing:border-box;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}
body{font-family:Arial,sans-serif;font-size:8px;color:#111;margin:0}
table{width:100%;border-collapse:collapse}th{font-size:6.5px}
td{border:1px solid #cbd5e1;padding:1px 2px;font-size:7px;vertical-align:middle}
tr{page-break-inside:avoid}</style></head><body>
<div style="display:flex;align-items:center;justify-content:space-between;border-bottom:2px solid ${AZ};padding-bottom:4px;margin-bottom:6px">
  <img src="${_logoUrl}" style="height:36px;object-fit:contain">
  <div style="text-align:center"><div style="font-size:13px;font-weight:900;color:${AZ}">HISTOGRAMA DE RECURSOS${esVs?' — PLAN VS REAL':' — PLAN'}</div><div style="font-size:8px;color:#2563eb;font-weight:700">RELAVERA R3 COTA 4416: RECRECIMIENTO DEL DIQUE ETAPA 2 FASE 4</div></div>
  <div style="text-align:right;font-size:7.5px;color:#64748b">${new Date().toLocaleDateString('es-PE')}<br>${rows.length} recursos · ${cols.length} semanas${colAct?'<br>Semana vigente: <b style="color:#b45309">'+_hgLblCol(colAct)+'</b>':''}</div>
</div>
${esVs?`<div style="font-size:7px;color:#475569;margin-bottom:4px">Celda = <b>Real</b>/Plan · <span style="background:#dcfce7;padding:0 4px">Real ≥ Plan</span> · <span style="background:#fef3c7;padding:0 4px">≥80%</span> · <span style="background:#fee2e2;padding:0 4px">&lt;80%</span> · Real: ⚙ equipos con partes de la semana · 👷 personal con tareaje trabajado</div>`:''}
<table><thead>${thd}</thead><tbody>${body}${totGen}</tbody></table>
</body></html>`;
  const win=window.open('','_blank');
  if(!win){toast('Active ventanas emergentes para imprimir',true);return;}
  win.document.write(html);win.document.close();win.focus();
  setTimeout(()=>win.print(),400);
}

function _hgExportVs(){
  if(typeof XLSX==='undefined'){toast('Librería Excel no disponible',true);return;}
  const cols=_hgCols();
  const rows=_hgRowsOrdenadas();
  const RD=_hgRealData(cols);
  const aoa=[
    ['HISTOGRAMA — PLAN VS REAL'],
    ['Grupo','Recurso','Vínculo',...cols.flatMap(c=>[_hgLblCol(c)+' Plan',_hgLblCol(c)+' Real'])],
    ...rows.map(r=>[r.grupo,r.recurso,r.vinculo||'',...cols.flatMap(c=>{
      const p=(r.valores||{})[c];
      const rl=_hgReal(r,c,RD);
      return[p!=null?p:'',rl!=null?rl:''];
    })])
  ];
  const ws=XLSX.utils.aoa_to_sheet(aoa);
  const wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,ws,'Plan vs Real');
  XLSX.writeFile(wb,'histograma_plan_vs_real.xlsx');
}
