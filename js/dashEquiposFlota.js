// ══════════════════════════════════════════════════════════════════════════
//  DASHBOARD DE EQUIPOS · PESTAÑA FLOTA (nivel equipo)
//
//  Una fila por equipo con su franja de días del corte, columnas ordenables y
//  un detalle al tocar la fila. Mismos filtros que las otras pestañas y las
//  mismas reglas del Calendario (js/dashEquiposCal.js):
//    · Línea Amarilla y Línea Blanca → horas efectivas, inoperativas,
//      disponibilidad = ef ÷ (ef + inop), promedio por día y cumplimiento de
//      la meta diaria (horas por turno del ⚙ del Panel de Horas)
//    · Vehículo Menor   → kilómetros recorridos
//    · Equipos Menores  → operatividad diaria por equipo
//  Con «Todos» se listan Línea Amarilla + Línea Blanca, en horas.
//
//  Prefijo _dqf. Usa _dqcModo, _dqcKm, _dqcCond y _dqcEtiqueta del Calendario.
// ══════════════════════════════════════════════════════════════════════════

let _dqfSel=null, _dqfOrden='codigo', _dqfDesc=false, _dqfQ='';

function _dqfMeta(){return typeof _phHsProgTurno==='function'?_phHsProgTurno():10;}
function _dqfSelEq(id){_dqfSel=(_dqfSel===id)?null:id;rDashEquipos();}
function _dqfOrdenar(k){
  if(_dqfOrden===k)_dqfDesc=!_dqfDesc;
  else{_dqfOrden=k;_dqfDesc=!['codigo','sub'].includes(k);}
  rDashEquipos();
}

// ── Una fila por equipo ─────────────────────────────────────────────────────
function _dqfDatos(ctx){
  const M=_dqcModo(ctx.tipo), meta=_dqfMeta();
  const dias=[];
  for(const d=new Date(ctx.per.ini.getTime());d<=ctx.per.fin;d.setDate(d.getDate()+1))dias.push(_dqcIso(d));

  // Qué equipos entran: los del filtro, activos o con partes en el corte
  const conPartes=new Set(ctx.partes.map(p=>+p.eqId));
  const desmov=e=>/DESMOVILIZADO/i.test(String(e.est||e.status||''))||/DESMOVILIZADO/i.test(String(e.sub||''));
  const q=String(_dqfQ||'').trim().toLowerCase();
  const equipos=(DB.equipos||[]).filter(e=>{
    if(ctx.eqId)return +e.id===+ctx.eqId;
    if(ctx.tipo){if(e.tipo!==ctx.tipo)return false;}
    else if(e.tipo!=='Línea Amarilla'&&e.tipo!=='Línea Blanca')return false;
    if(ctx.sub&&String(e.sub||'Otros').toUpperCase()!==ctx.sub)return false;
    if(desmov(e)&&!conPartes.has(+e.id))return false;
    if(q&&!(`${e.codigo||''} ${e.nombre||''} ${e.sub||''}`.toLowerCase().includes(q)))return false;
    return true;
  });

  const filas=equipos.map(e=>{
    const mios=ctx.partes.filter(p=>+p.eqId===+e.id);
    const dia={};
    dias.forEach(f=>{dia[f]={v:0,im:0,np:0,ino:0,pm:0,stb:0};});
    mios.forEach(p=>{
      const d=dia[p.fecha];if(!d)return;
      d.np++;
      d.v+=M==='km'?_dqcKm(p):Math.max(0,+p.ef||0);
      d.im+=Math.max(0,+p.im||0);
      const c=_dqcCond(p);if(c)d[c]++;
    });
    const conParte=dias.filter(f=>dia[f].np>0);
    const r={eq:e,dia,np:mios.length,conParte:conParte.length};
    if(M==='oper'){
      r.inop=conParte.filter(f=>dia[f].ino>0).length;
      r.op=r.conParte-r.inop;
      r.oper=r.conParte?r.op/r.conParte*100:null;
    }else{
      r.total=dias.reduce((s,f)=>s+dia[f].v,0);
      r.im=dias.reduce((s,f)=>s+dia[f].im,0);
      r.diasInop=conParte.filter(f=>dia[f].ino>0).length;
      r.prom=r.conParte?r.total/r.conParte:null;
      if(M==='horas'){
        r.disp=(r.total+r.im)>0?r.total/(r.total+r.im)*100:null;
        r.cump=r.conParte?conParte.filter(f=>dia[f].v>=meta).length/r.conParte*100:null;
      }
    }
    return r;
  });

  // Orden
  const llave={codigo:r=>String(r.eq.codigo||''),sub:r=>String(r.eq.sub||''),
    total:r=>r.total||0,im:r=>r.im||0,disp:r=>r.disp==null?-1:r.disp,prom:r=>r.prom==null?-1:r.prom,
    cump:r=>r.cump==null?-1:r.cump,conParte:r=>r.conParte,diasInop:r=>r.diasInop||0,
    op:r=>r.op||0,inop:r=>r.inop||0,oper:r=>r.oper==null?-1:r.oper}[_dqfOrden]||(r=>String(r.eq.codigo||''));
  filas.sort((a,b)=>{
    const x=llave(a),y=llave(b);
    const c=typeof x==='string'?x.localeCompare(y,'es',{numeric:true}):x-y;
    return _dqfDesc?-c:c;
  });
  return{M,meta,dias,filas};
}

// ── La pestaña ──────────────────────────────────────────────────────────────
function _dqfHtml(ctx){
  const D=_dqfDatos(ctx), M=D.M, meta=D.meta;
  if(_dqfSel&&!D.filas.some(r=>+r.eq.id===+_dqfSel))_dqfSel=null;
  // Con un equipo elegido en los chips, su detalle se abre solo
  const selId=ctx.eqId||_dqfSel;
  const f1=_dqcF1, f0=_dqcF0;
  const pctCol=(v,a,b)=>v==null?'var(--muted2)':v>=a?'#10b981':v>=b?'#f59e0b':'#ef4444';
  const badge=(v,a,b)=>v==null?'<span style="color:var(--muted2);font-size:.68rem">s/parte</span>'
    :`<span style="font-family:monospace;font-weight:800;font-size:.72rem;padding:.15rem .4rem;border-radius:4px;color:${pctCol(v,a,b)};background:${pctCol(v,a,b)}22">${Math.round(v)}%</span>`;

  // KPIs
  const F=D.filas, conP=F.filter(r=>r.conParte>0);
  let kpis;
  if(M==='oper'){
    const n=conP.reduce((s,r)=>s+r.conParte,0), op=conP.reduce((s,r)=>s+r.op,0);
    const peor=[...conP].sort((a,b)=>a.oper-b.oper)[0];
    kpis=[
      {l:'Operatividad',v:n?Math.round(op/n*100)+'%':'—',c:'#10b981'},
      {l:'Equipos con parte',v:conP.length+' de '+F.length,c:'#06b6d4'},
      {l:'Equipo-días inoperativos',v:n-op,c:'#ef4444'},
      {l:'Equipos con alguna falla',v:conP.filter(r=>r.inop>0).length,c:'#f59e0b'},
      {l:'Peor equipo',v:peor?peor.eq.codigo+' · '+Math.round(peor.oper)+'%':'—',c:'#8b5cf6'}
    ];
  }else if(M==='km'){
    const tot=F.reduce((s,r)=>s+r.total,0), dc=conP.reduce((s,r)=>s+r.conParte,0);
    const mayor=[...conP].sort((a,b)=>b.total-a.total)[0];
    kpis=[
      {l:'Km recorridos',v:f0(tot)+' km',c:'#818cf8'},
      {l:'Equipos con parte',v:conP.length+' de '+F.length,c:'#06b6d4'},
      {l:'Promedio por día',v:dc?f0(tot/dc)+' km':'—',c:'#10b981'},
      {l:'Días inoperativos',v:F.reduce((s,r)=>s+r.diasInop,0),c:'#ef4444'},
      {l:'Mayor recorrido',v:mayor?mayor.eq.codigo+' · '+f0(mayor.total):'—',c:'#f59e0b'}
    ];
  }else{
    const ef=F.reduce((s,r)=>s+r.total,0), im=F.reduce((s,r)=>s+r.im,0);
    kpis=[
      {l:'Hs efectivas',v:f1(ef)+' h',c:'#06b6d4'},
      {l:'Hs inoperativas',v:f1(im)+' h',c:'#ef4444'},
      {l:'Disponibilidad',v:(ef+im)?(ef/(ef+im)*100).toFixed(1)+'%':'—',c:'#10b981'},
      {l:'Equipos con parte',v:conP.length+' de '+F.length,c:'#8b5cf6'},
      {l:'Bajo '+f1(meta)+' h/día',v:conP.filter(r=>r.prom<meta).length+' equipos',c:'#f59e0b'}
    ];
  }
  const kpiHtml=`<div class="kpi-row">${kpis.map(k=>`<div class="kpi" style="--kc:${k.c}"><div class="kpi-lbl">${k.l}</div><div class="kpi-val" style="font-size:${String(k.v).length>10?'1.1rem':'1.6rem'}">${k.v}</div></div>`).join('')}</div>`;

  // Franja de días: una barrita por día del corte
  const maxV=Math.max(1,...F.flatMap(r=>D.dias.map(f=>r.dia[f].v)));
  const franja=r=>`<span style="display:flex;gap:1px;align-items:flex-end;height:26px;min-width:150px">${D.dias.map(f=>{
    const d=r.dia[f];
    let h,c,txt;
    if(!d.np){h=2;c='var(--border)';txt='sin parte';}
    else if(M==='oper'){h=26;c=d.ino?'#ef4444':'#10b981';txt=d.ino?'inoperativo':'operativo';}
    else if(!d.v){h=d.ino||d.pm?10:5;c=d.ino||d.pm?'#ef4444':d.stb?'#f59e0b':'var(--muted)';
      txt=d.ino?'INO':d.pm?'PM':d.stb?'STB':'0';}
    else{h=Math.max(3,Math.round(26*d.v/maxV));
      c=d.ino?'#ef4444':(M==='horas'&&d.v<meta)?'#f59e0b':'#10b981';
      txt=(M==='km'?f0(d.v)+' km':f1(d.v)+' h')+(d.ino?' // INO':'');}
    return`<i title="${f.slice(8)}/${f.slice(5,7)}: ${txt}" style="display:block;flex:1;min-width:2px;height:${h}px;background:${c};border-radius:1px"></i>`;
  }).join('')}</span>`;

  // Columnas según la métrica
  const COLS=M==='oper'
    ?[['conParte','Días c/parte',r=>r.conParte||'—'],['op','Operativos',r=>r.conParte?r.op:'—'],
      ['inop','Inoperativos',r=>r.inop?`<span style="color:#ef4444;font-weight:700">${r.inop}</span>`:(r.conParte?'0':'—')],
      ['oper','Operatividad',r=>badge(r.oper,90,75)]]
    :M==='km'
    ?[['total','Km',r=>r.conParte?f0(r.total):'—'],['conParte','Días c/parte',r=>r.conParte||'—'],
      ['prom','Prom. km/día',r=>r.prom==null?'—':f0(r.prom)],
      ['diasInop','Días inop.',r=>r.diasInop?`<span style="color:#ef4444;font-weight:700">${r.diasInop}</span>`:(r.conParte?'0':'—')]]
    :[['total','Hs efect.',r=>r.conParte?f1(r.total):'—'],
      ['im','Hs inop.',r=>r.im?`<span style="color:#ef4444">${f1(r.im)}</span>`:(r.conParte?'0.0':'—')],
      ['disp','Disp.',r=>badge(r.disp,90,80)],
      ['prom','Prom. h/día',r=>r.prom==null?'—':`<span style="color:${r.prom<meta?'#ef4444':'inherit'}">${f1(r.prom)}</span>`],
      ['cump','Cumpl. '+f1(meta)+' h',r=>badge(r.cump,85,60)]];
  const TH='background:var(--panel2);color:var(--muted2);font-size:.6rem;font-weight:700;text-transform:uppercase;letter-spacing:.07em;padding:.5rem .6rem;white-space:nowrap;cursor:pointer;user-select:none;position:sticky;top:0;z-index:2';
  const TD='padding:.45rem .6rem;border-bottom:1px solid var(--border);font-size:.78rem;vertical-align:middle';
  const flecha=k=>_dqfOrden===k?`<span style="color:#f59e0b"> ${_dqfDesc?'▼':'▲'}</span>`:'';
  const cab=`<th style="${TH};text-align:left" onclick="_dqfOrdenar('codigo')">Equipo${flecha('codigo')}</th>
    <th style="${TH};text-align:left" onclick="_dqfOrdenar('sub')">Subtipo${flecha('sub')}</th>
    <th style="${TH};text-align:left;cursor:default">${M==='oper'?'Estado':M==='km'?'Km':'Horas'} por día del corte</th>
    ${COLS.map(([k,l])=>`<th style="${TH};text-align:right" onclick="_dqfOrdenar('${k}')">${l}${flecha(k)}</th>`).join('')}`;
  const cuerpoTabla=F.map(r=>{
    const sel=+r.eq.id===+selId;
    return`<tr onclick="_dqfSelEq(${+r.eq.id})" style="cursor:pointer;${sel?'background:var(--panel2);box-shadow:inset 3px 0 0 #f59e0b':''}" onmouseover="this.style.background='var(--panel2)'" onmouseout="this.style.background='${sel?'var(--panel2)':''}'">
      <td style="${TD}"><div style="font-family:monospace;font-weight:800;color:#06b6d4">${_dqcEsc(r.eq.codigo)}</div><div style="font-size:.66rem;color:var(--muted2)">${_dqcEsc(r.eq.nombre||'')}</div></td>
      <td style="${TD};font-size:.64rem;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--muted2);white-space:nowrap">${_dqcEsc(r.eq.sub||'')}</td>
      <td style="${TD}">${franja(r)}</td>
      ${COLS.map(c=>`<td style="${TD};text-align:right;font-family:monospace;white-space:nowrap">${c[2](r)}</td>`).join('')}
    </tr>`;
  }).join('');

  // Detalle: el equipo elegido, o los que piden atención
  let detalle;
  const r=F.find(x=>+x.eq.id===+selId);
  if(r){
    const etq=(d)=>{const e=_dqcEtiqueta(d);return e?`<span style="color:${e.col};font-weight:900">${e.txt}</span>`:'';};
    const celdas=D.dias.map(f=>{
      const d=r.dia[f];
      let val;
      if(!d.np)val='<span style="color:var(--muted)">—</span>';
      else if(M==='oper')val=d.ino?'<span style="color:#ef4444;font-weight:900">INO</span>':'<span style="color:#10b981;font-weight:800">OP</span>';
      else if(!d.v)val=etq(d)||'0';
      else{
        const n=M==='km'?f0(d.v):f1(d.v);
        const col=d.ino?'#ef4444':(M==='horas'&&d.v<meta)?'#f59e0b':'#10b981';
        val=`<span style="color:${col};font-weight:800">${n}</span>${(d.ino||d.pm)?'<br>'+etq(d):''}`;
      }
      return`<div style="background:var(--panel2);border-radius:4px;padding:.3rem .2rem;text-align:center;min-width:0"><b style="display:block;font-family:monospace;font-size:.58rem;color:var(--muted)">${f.slice(8)}</b><span style="font-family:monospace;font-size:.68rem">${val}</span></div>`;
    }).join('');
    const kv=M==='oper'
      ?[['Días con parte',r.conParte+'/'+D.dias.length],['Operativos',r.op],['Inoperativos',r.inop],['Operatividad',r.oper==null?'—':Math.round(r.oper)+'%']]
      :M==='km'
      ?[['Km recorridos',f0(r.total)],['Días con parte',r.conParte+'/'+D.dias.length],['Prom. km/día',r.prom==null?'—':f0(r.prom)],['Días inoperativos',r.diasInop],['Mayor recorrido',f0(Math.max(0,...D.dias.map(f=>r.dia[f].v)))]]
      :[['Hs efectivas',f1(r.total)],['Hs inoperativas',f1(r.im)],['Días con parte',r.conParte+'/'+D.dias.length],
        ['Prom. h/día',r.prom==null?'—':f1(r.prom)],['Días ≥ '+f1(meta)+' h',D.dias.filter(f=>r.dia[f].v>=meta).length],['Mejor día',f1(Math.max(0,...D.dias.map(f=>r.dia[f].v)))]];
    const sello=M==='oper'?(r.oper==null?'':'Operatividad '+Math.round(r.oper)+'%')
      :M==='horas'?(r.disp==null?'':'Disponibilidad '+r.disp.toFixed(1)+'%'):'';
    detalle=`<div class="card"><div class="card-head" style="flex-wrap:wrap;gap:.4rem">
        <span class="card-title">🚜 ${_dqcEsc(r.eq.codigo)} <span style="font-size:.72rem;color:var(--muted2);font-weight:400">· ${_dqcEsc(r.eq.nombre||'')} · ${_dqcEsc(r.eq.sub||'')} · ${_dqcEsc(r.eq.tipo||'')}</span></span>
        ${sello?`<span style="font-family:monospace;font-weight:800;color:#10b981">${sello}</span>`:''}
      </div><div class="card-body" style="display:flex;flex-direction:column;gap:.7rem">
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:.5rem">${kv.map(([l,v])=>`<div style="background:var(--panel2);border-radius:6px;padding:.5rem .6rem"><div style="font-size:.58rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--muted2)">${l}</div><div style="font-family:monospace;font-weight:800;font-size:1rem">${v}</div></div>`).join('')}</div>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(46px,1fr));gap:4px">${celdas}</div>
      </div></div>`;
  }else{
    const atn=M==='oper'?[...conP].sort((a,b)=>a.oper-b.oper)
      :M==='km'?[...conP].sort((a,b)=>b.diasInop-a.diasInop||a.total-b.total)
      :[...conP].sort((a,b)=>a.cump-b.cump);
    const top=atn.slice(0,3);
    const que=M==='oper'?'menor operatividad':M==='km'?'más días inoperativos':'menor cumplimiento de '+f1(meta)+' h/día';
    detalle=`<div class="card"><div class="card-head"><span class="card-title">⚠ Atención del corte <span style="font-size:.7rem;color:var(--muted2);font-weight:400">· equipos con ${que}</span></span></div>
      <div class="card-body"><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:.5rem">${top.map(x=>`
        <div onclick="_dqfSelEq(${+x.eq.id})" style="cursor:pointer;background:var(--panel2);border-radius:6px;padding:.55rem .7rem">
          <div style="font-family:monospace;font-weight:800;color:#06b6d4">${_dqcEsc(x.eq.codigo)}</div>
          <div style="font-family:monospace;font-weight:900;font-size:1.1rem">${M==='oper'?Math.round(x.oper)+'%':M==='km'?x.diasInop+' días inop.':Math.round(x.cump)+'%'}</div>
          <div style="font-size:.66rem;color:var(--muted2)">${M==='km'?f0(x.total)+' km':M==='oper'?x.op+' de '+x.conParte+' días':f1(x.prom)+' h/día'} · ${x.conParte} días con parte</div>
        </div>`).join('')||'<span style="color:var(--muted2)">Sin equipos con parte en el corte</span>'}</div>
        <div style="font-size:.68rem;color:var(--muted2);margin-top:.5rem">Toque una fila para ver el detalle diario del equipo.</div></div></div>`;
  }

  const queMide=M==='km'?'Kilómetros recorridos':M==='oper'?'Operatividad diaria':'Horas efectivas';
  return{kpis:kpiHtml,cuerpo:`
    <div class="card" style="margin-bottom:1rem">
      <div class="card-head" style="flex-wrap:wrap;gap:.5rem">
        <span class="card-title">🚜 Flota — ${queMide}${!ctx.tipo?' <span style="font-size:.68rem;color:var(--muted2)">(Línea Amarilla + Línea Blanca)</span>':''} · ${F.length} equipo(s)</span>
        <div class="search-wrap"><span>🔍</span><input id="dqfBuscar" class="search-input" placeholder="Buscar código o descripción…" value="${_dqcEsc(_dqfQ)}" oninput="_dqfQ=this.value;buscarFoco('dqfBuscar',rDashEquipos)"></div>
      </div>
      <div class="card-body" style="padding:0"><div class="tbl-wrap" style="overflow-x:auto;max-height:60vh">
        <table style="width:100%;border-collapse:collapse;min-width:880px"><thead><tr>${cab}</tr></thead>
        <tbody>${cuerpoTabla||`<tr><td colspan="${3+COLS.length}" style="${TD};text-align:center;padding:2rem;color:var(--muted2)">Sin equipos con este filtro</td></tr>`}</tbody></table>
      </div></div>
    </div>
    ${detalle}`};
}
