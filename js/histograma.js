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

function rHistograma(){
  const el=document.getElementById('hgBody');if(!el)return;
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
    <button onclick="_hgExport()" style="margin-left:auto;font-size:.7rem;padding:.25rem .7rem;border-radius:5px;border:none;background:#166534;color:#fff;cursor:pointer;font-weight:700;white-space:nowrap">📊 Excel</button>
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
    <div class="tbl-wrap" style="max-height:70vh;overflow:auto">
    <table style="min-width:100%;border-collapse:collapse">
      <thead style="position:sticky;top:0;z-index:2"><tr style="background:var(--panel2)">
        <th style="${TH};text-align:left;min-width:210px">Recurso</th>
        ${cols.map(c=>`<th style="${TH};${c===colAct?'color:#f59e0b;background:rgba(245,158,11,.12);':''}" title="${c}">${_hgLblCol(c)}</th>`).join('')}
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
