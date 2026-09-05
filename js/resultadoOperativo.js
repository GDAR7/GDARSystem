// ══════════════════════════════════════════════════════════════════════════
//  RESULTADO OPERATIVO (R.O.) — Cost Control
//  Qué costó operar cada equipo en un período: lo que se le paga al proveedor
//  (EDP emitidos) + el combustible que consumió en esas mismas fechas.
//  Ambas cifras salen de módulos distintos y aquí se cruzan por equipo.
// ══════════════════════════════════════════════════════════════════════════

// Serie 1 = proveedor · Serie 2 = combustible. Par validado contra el fondo
// oscuro: banda de luminosidad, croma, separación CVD (ΔE 26.8) y contraste.
const _RO_C_PROV='#d95926';
const _RO_C_COMB='#3987e5';

const _roN=v=>Number(v||0).toLocaleString('es-PE',{minimumFractionDigits:2,maximumFractionDigits:2});
const _roN0=v=>Number(v||0).toLocaleString('es-PE',{maximumFractionDigits:0});
const _roN1=v=>Number(v||0).toLocaleString('es-PE',{minimumFractionDigits:1,maximumFractionDigits:1});
function _roEsc(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function _roDMY(iso){if(!iso||!iso.includes('-'))return iso||'—';const[y,m,d]=iso.split('-');return`${d}/${m}/${y}`;}

let _roDesde='', _roHasta='', _roTipo='', _roBuscar='', _roSoloEdp=false, _roOrden='total';

function _roSet(campo,val){
  if(campo==='periodo'){const[d,h]=String(val||'').split('|');_roDesde=d||'';_roHasta=h||'';}
  else if(campo==='desde')_roDesde=val;
  else if(campo==='hasta')_roHasta=val;
  else if(campo==='tipo')_roTipo=val;
  else if(campo==='buscar')_roBuscar=val;
  else if(campo==='soloEdp')_roSoloEdp=!!val;
  else if(campo==='orden')_roOrden=val;
  rResultadoOperativo(campo==='buscar');
}

// Períodos disponibles: los que ya se usaron al emitir EDPs
function _roPeriodos(){
  const set=new Map();
  (DB.edpProveedores||[]).forEach(r=>{
    if(!r.desde||!r.hasta)return;
    const k=r.desde+'|'+r.hasta;
    const a=set.get(k)||{desde:r.desde,hasta:r.hasta,n:0};
    a.n++;set.set(k,a);
  });
  return [...set.values()].sort((a,b)=>b.hasta.localeCompare(a.hasta));
}

// ── Cruce EDP × Combustible por equipo ──────────────────────────────────────
function _roDatos(){
  const d=_roDesde,h=_roHasta;
  const eqById=new Map((DB.equipos||[]).map(e=>[+e.id,e]));
  const acc=new Map();
  const fila=id=>{
    const eq=eqById.get(+id)||{};
    let a=acc.get(+id);
    if(!a){
      a={eqId:+id,codigo:eq.codigo||'(equipo eliminado)',
        nombre:(eq.nombre||'').split(' ').slice(0,4).join(' '),
        tipo:eq.tipo||'—',proveedor:eq.proveedor||'—',
        prov:0,nEdp:0,cant:0,tarifaUn:'',desc:0,
        gal:0,comb:0,nDesp:0,
        moneda:'SOLES',provOrig:0};   // moneda del contrato + importe sin convertir
      acc.set(+id,a);
    }
    return a;
  };

  // Costo del proveedor: EDP cuyo período cae dentro del rango elegido.
  // Se usa el neto (sin IGV) porque es lo que llega al centro de costos.
  (DB.edpProveedores||[]).forEach(r=>{
    if(r.estado==='Anulado')return;
    if(d&&(r.hasta||'')<d)return;
    if(h&&(r.desde||'')>h)return;
    const a=fila(r.eqId);
    // Se convierte a soles: un EDP en dólares no se puede sumar con uno en soles
    const mon=r.moneda||'SOLES';
    a.prov+=_aSoles(r.subtotal,mon);
    a.provOrig+=+r.subtotal||0;
    if(mon!=='SOLES')a.moneda=mon;
    a.desc+=_aSoles(r.montoDesc,mon);a.nEdp++;
    a.cant+=+r.cantEquipo||0;a.tarifaUn=a.tarifaUn||r.tarifaUn||'';
    if(r.proveedor)a.proveedor=r.proveedor;
  });

  // Combustible: despachos del equipo dentro del rango, valorizados a su precio
  (DB.combustible||[]).forEach(r=>{
    if(r.tipoMov==='Ingreso'||!r.eqId)return;
    const f=r.fecha||'';
    if(d&&f<d)return;
    if(h&&f>h)return;
    const a=fila(r.eqId);
    a.gal+=+r.gal||0;a.comb+=(+r.gal||0)*(+r.precio||0);a.nDesp++;
  });

  const q=_roBuscar.trim().toLowerCase();
  let filas=[...acc.values()].map(a=>({...a,total:+(a.prov+a.comb).toFixed(2)}))
    .filter(a=>a.total>0||a.gal>0)
    .filter(a=>!_roSoloEdp||a.nEdp>0)
    .filter(a=>!_roTipo||a.tipo===_roTipo)
    .filter(a=>!q||`${a.codigo} ${a.nombre} ${a.proveedor} ${a.tipo}`.toLowerCase().includes(q));
  filas.sort((a,b)=>
    _roOrden==='equipo'?a.codigo.localeCompare(b.codigo)
    :_roOrden==='comb'?b.comb-a.comb
    :_roOrden==='prov'?b.prov-a.prov
    :b.total-a.total);
  const tipos=[...new Set([...acc.values()].map(a=>a.tipo))].filter(Boolean).sort();
  return{filas,tipos};
}

// ── Barras apiladas horizontales: proveedor + combustible ───────────────────
function _roBarras(filas){
  if(!filas.length)return`<div style="padding:2rem;text-align:center;color:var(--muted2);font-size:.8rem">Sin costos registrados en este período</div>`;
  const TOPN=14;
  const top=filas.slice(0,TOPN);
  const resto=filas.slice(TOPN);
  const items=top.map(a=>({lbl:a.codigo,prov:a.prov,comb:a.comb,total:a.total,tip:`${a.codigo} — ${a.nombre}\nProveedor: S/ ${_roN(a.prov)}\nCombustible: S/ ${_roN(a.comb)} (${_roN1(a.gal)} gal)\nTotal: S/ ${_roN(a.total)}`}));
  if(resto.length){
    const p=resto.reduce((s,a)=>s+a.prov,0),c=resto.reduce((s,a)=>s+a.comb,0);
    items.push({lbl:`Otros (${resto.length})`,prov:p,comb:c,total:p+c,tip:`${resto.length} equipos restantes`});
  }
  const max=Math.max(...items.map(i=>i.total),0)||1;
  return`<div style="display:flex;flex-direction:column;gap:6px">
    ${items.map(i=>{
      const wP=i.prov/max*100, wC=i.comb/max*100;
      return`<div title="${_roEsc(i.tip)}" style="display:grid;grid-template-columns:118px 1fr 106px;align-items:center;gap:.55rem">
        <span style="font-size:.7rem;font-weight:600;color:var(--text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${_roEsc(i.lbl)}</span>
        <div style="position:relative;height:15px;background:rgba(255,255,255,.045);border-radius:4px;display:flex;gap:2px">
          ${i.prov>0?`<div style="width:${wP}%;background:${_RO_C_PROV};border-radius:4px 0 0 4px"></div>`:''}
          ${i.comb>0?`<div style="width:${wC}%;background:${_RO_C_COMB};border-radius:${i.prov>0?'0 4px 4px 0':'4px'}"></div>`:''}
        </div>
        <span style="font-size:.71rem;font-family:monospace;text-align:right;color:var(--text);font-variant-numeric:tabular-nums">S/ ${_roN0(i.total)}</span>
      </div>`;
    }).join('')}
  </div>`;
}

// Una sola barra con la composición del gasto total del período
function _roComposicion(tProv,tComb){
  const t=tProv+tComb;
  if(t<=0)return'';
  const pP=tProv/t*100,pC=tComb/t*100;
  return`<div style="margin-top:.2rem">
    <div style="display:flex;gap:2px;height:26px;border-radius:5px;overflow:hidden">
      ${tProv>0?`<div style="width:${pP}%;background:${_RO_C_PROV};display:flex;align-items:center;justify-content:center;font-size:.66rem;font-weight:800;color:#fff">${pP>=12?pP.toFixed(1)+'%':''}</div>`:''}
      ${tComb>0?`<div style="width:${pC}%;background:${_RO_C_COMB};display:flex;align-items:center;justify-content:center;font-size:.66rem;font-weight:800;color:#fff">${pC>=12?pC.toFixed(1)+'%':''}</div>`:''}
    </div>
    <div style="display:flex;gap:1.1rem;margin-top:.45rem;flex-wrap:wrap">
      <span style="font-size:.68rem;color:var(--muted2);display:flex;align-items:center;gap:.35rem">
        <span style="width:11px;height:11px;border-radius:2px;background:${_RO_C_PROV};display:inline-block"></span>
        Proveedores <strong style="color:var(--text);font-family:monospace">S/ ${_roN0(tProv)}</strong> · ${pP.toFixed(1)}%</span>
      <span style="font-size:.68rem;color:var(--muted2);display:flex;align-items:center;gap:.35rem">
        <span style="width:11px;height:11px;border-radius:2px;background:${_RO_C_COMB};display:inline-block"></span>
        Combustible <strong style="color:var(--text);font-family:monospace">S/ ${_roN0(tComb)}</strong> · ${pC.toFixed(1)}%</span>
    </div>
  </div>`;
}

// ── Render ──────────────────────────────────────────────────────────────────
function rResultadoOperativo(mantenerFoco){
  const cont=document.getElementById('roBody');if(!cont)return;
  const pers=_roPeriodos();
  // Al entrar por primera vez se toma el período más reciente que se haya usado
  if(!_roDesde&&!_roHasta&&pers.length){_roDesde=pers[0].desde;_roHasta=pers[0].hasta;}
  const D=_roDatos();

  const tProv=D.filas.reduce((s,a)=>s+a.prov,0);
  const tComb=D.filas.reduce((s,a)=>s+a.comb,0);
  const tGal=D.filas.reduce((s,a)=>s+a.gal,0);
  const tTot=tProv+tComb;
  const conEdp=D.filas.filter(a=>a.nEdp>0).length;
  const soloComb=D.filas.filter(a=>a.nEdp===0&&a.comb>0).length;
  const caro=D.filas.slice().sort((a,b)=>b.total-a.total)[0];
  const precioProm=tGal>0?tComb/tGal:0;

  const kpi=(l,v,c,sub)=>`<div class="kpi" style="--kc:${c};border:1px solid ${c};flex:1;min-width:160px">
    <div class="kpi-lbl">${l}</div>
    <div class="kpi-val" style="font-size:${String(v).length>13?'1.15rem':'1.5rem'}">${v}</div>
    <div class="kpi-sub">${sub||''}</div></div>`;

  const selS='background:var(--panel2);border:1px solid var(--border);border-radius:6px;color:var(--text);padding:.3rem .55rem;font-size:.75rem';
  const TH='padding:5px 7px;font-size:.6rem;text-transform:uppercase;letter-spacing:.06em;color:var(--muted2);white-space:nowrap';
  const TD='padding:4px 7px;font-size:.72rem;white-space:nowrap';

  const filas=D.filas.map(a=>{
    const pct=tTot>0?a.total/tTot*100:0;
    const pComb=a.total>0?a.comb/a.total*100:0;
    return`<tr style="border-bottom:1px solid var(--border)">
      <td style="${TD};color:var(--ceq);font-weight:700;font-family:monospace">${_roEsc(a.codigo)}</td>
      <td style="${TD};max-width:180px;overflow:hidden;text-overflow:ellipsis">${_roEsc(a.nombre)}</td>
      <td style="${TD};color:var(--muted2)">${_roEsc(a.tipo)}</td>
      <td style="${TD};max-width:160px;overflow:hidden;text-overflow:ellipsis">${a.nEdp?_roEsc(a.proveedor):'<span style="color:var(--muted)">propio / sin EDP</span>'}</td>
      <td style="${TD};text-align:right;font-family:monospace;color:${a.prov>0?_RO_C_PROV:'var(--muted)'};font-weight:${a.prov>0?'700':'400'}">${a.prov>0?_roN(a.prov):'—'}${
        a.moneda!=='SOLES'&&a.prov>0?`<div style="font-size:.58rem;color:#fbbf24;font-weight:600">${_tcSim(a.moneda)} ${_roN(a.provOrig)} × ${_tcGet(a.moneda)}</div>`:''}</td>
      <td style="${TD};text-align:right;font-family:monospace;color:var(--muted2)">${a.gal>0?_roN1(a.gal):'—'}</td>
      <td style="${TD};text-align:right;font-family:monospace;color:${a.comb>0?_RO_C_COMB:'var(--muted)'};font-weight:${a.comb>0?'700':'400'}">${a.comb>0?_roN(a.comb):'—'}</td>
      <td style="${TD};text-align:right;font-family:monospace;font-weight:800">${_roN(a.total)}</td>
      <td style="${TD};text-align:right;font-family:monospace;color:var(--muted2)">${a.total>0?pComb.toFixed(0)+'%':'—'}</td>
      <td style="${TD};text-align:right;font-family:monospace;color:var(--muted2)">${pct.toFixed(1)}%</td>
    </tr>`;
  }).join('');

  cont.innerHTML=`
  <div class="card" style="margin-bottom:.9rem">
    <div class="card-head"><span class="card-title">🗓️ Período y filtros</span>
      <span style="font-size:.63rem;color:var(--muted2)">${D.filas.length} equipo${D.filas.length===1?'':'s'} · ${conEdp} con EDP${soloComb?` · ${soloComb} solo combustible`:''}</span>
    </div>
    <div class="card-body"><div style="display:flex;gap:.55rem;flex-wrap:wrap;align-items:flex-end">
      ${pers.length?`<div style="display:flex;flex-direction:column;gap:.15rem">
        <label style="font-size:.58rem;text-transform:uppercase;letter-spacing:.06em;color:var(--muted2)">Período de EDP</label>
        <select onchange="_roSet('periodo',this.value)" style="${selS}">
          ${pers.map(p=>`<option value="${p.desde}|${p.hasta}" ${_roDesde===p.desde&&_roHasta===p.hasta?'selected':''}>${_roDMY(p.desde)} → ${_roDMY(p.hasta)} (${p.n} EDP)</option>`).join('')}
          <option value="|" ${!_roDesde&&!_roHasta?'selected':''}>— Todo el histórico —</option>
        </select>
      </div>`:''}
      <div style="display:flex;flex-direction:column;gap:.15rem">
        <label style="font-size:.58rem;text-transform:uppercase;letter-spacing:.06em;color:var(--muted2)">Desde</label>
        <input type="date" class="date-ic-azul" value="${_roDesde}" onchange="_roSet('desde',this.value)" style="${selS};color-scheme:dark">
      </div>
      <div style="display:flex;flex-direction:column;gap:.15rem">
        <label style="font-size:.58rem;text-transform:uppercase;letter-spacing:.06em;color:var(--muted2)">Hasta</label>
        <input type="date" class="date-ic-azul" value="${_roHasta}" onchange="_roSet('hasta',this.value)" style="${selS};color-scheme:dark">
      </div>
      <div style="display:flex;flex-direction:column;gap:.15rem">
        <label style="font-size:.58rem;text-transform:uppercase;letter-spacing:.06em;color:var(--muted2)">Tipo</label>
        <select onchange="_roSet('tipo',this.value)" style="${selS}">
          <option value="">— Todos —</option>
          ${D.tipos.map(t=>`<option value="${_roEsc(t)}" ${_roTipo===t?'selected':''}>${_roEsc(t)}</option>`).join('')}
        </select>
      </div>
      <div style="display:flex;flex-direction:column;gap:.15rem;flex:1;min-width:180px">
        <label style="font-size:.58rem;text-transform:uppercase;letter-spacing:.06em;color:var(--muted2)">Buscar</label>
        <input id="roBuscar" value="${_roEsc(_roBuscar)}" placeholder="Código, equipo o proveedor…" oninput="_roSet('buscar',this.value)" style="${selS};width:100%;box-sizing:border-box">
      </div>
      ${_tcControles(selS)}
      <label style="display:inline-flex;align-items:center;gap:.35rem;font-size:.7rem;color:var(--muted2);cursor:pointer;padding-bottom:.35rem">
        <input type="checkbox" ${_roSoloEdp?'checked':''} onchange="_roSet('soloEdp',this.checked)" style="width:auto;margin:0;cursor:pointer"> Solo equipos alquilados
      </label>
      <button onclick="_roExcel()" style="background:#166534;color:#fff;border:none;border-radius:6px;padding:.3rem .8rem;font-size:.72rem;font-weight:700;cursor:pointer">📊 Excel</button>
      <button onclick="_roPrint()" style="background:#1e3a5f;color:#fff;border:none;border-radius:6px;padding:.3rem .8rem;font-size:.72rem;font-weight:700;cursor:pointer">🖨️ PDF</button>
    </div></div>
  </div>

  <div class="kpi-row" style="margin-bottom:.9rem">
    ${kpi('Costo Operativo',`S/ ${_roN0(tTot)}`,'#f59e0b',`${_roDesde?_roDMY(_roDesde):'inicio'} → ${_roHasta?_roDMY(_roHasta):'hoy'}`)}
    ${kpi('Proveedores',`S/ ${_roN0(tProv)}`,_RO_C_PROV,`${conEdp} equipo${conEdp===1?'':'s'} alquilado${conEdp===1?'':'s'} · sin IGV`)}
    ${kpi('Combustible',`S/ ${_roN0(tComb)}`,_RO_C_COMB,`${_roN1(tGal)} gal · S/ ${_roN(precioProm)}/gal prom.`)}
    ${kpi('Equipo más caro',caro?caro.codigo:'—','#a855f7',caro?`S/ ${_roN0(caro.total)} · ${(caro.total/(tTot||1)*100).toFixed(0)}% del total`:'sin datos')}
    ${kpi('Costo / galón operado',tGal>0?`S/ ${_roN(tTot/tGal)}`:'—','#10b981','costo total ÷ galones')}
  </div>

  <div class="card" style="margin-bottom:.9rem">
    <div class="card-head"><span class="card-title">⚖️ Composición del costo</span>
      <span style="font-size:.63rem;color:var(--muted2)">Alquiler vs. combustible</span>
    </div>
    <div class="card-body">${_roComposicion(tProv,tComb)||'<div style="color:var(--muted2);font-size:.8rem;text-align:center;padding:1rem">Sin costos en el período</div>'}</div>
  </div>

  <div class="card" style="margin-bottom:.9rem">
    <div class="card-head"><span class="card-title">🚜 Costo operativo por equipo</span>
      <div style="display:flex;gap:.9rem;align-items:center">
        <span style="font-size:.66rem;color:var(--muted2);display:flex;align-items:center;gap:.3rem"><span style="width:10px;height:10px;border-radius:2px;background:${_RO_C_PROV};display:inline-block"></span>Proveedor</span>
        <span style="font-size:.66rem;color:var(--muted2);display:flex;align-items:center;gap:.3rem"><span style="width:10px;height:10px;border-radius:2px;background:${_RO_C_COMB};display:inline-block"></span>Combustible</span>
      </div>
    </div>
    <div class="card-body">${_roBarras(D.filas.slice().sort((a,b)=>b.total-a.total))}</div>
  </div>

  <div class="card">
    <div class="card-head"><span class="card-title">📋 Detalle por equipo</span>
      <select onchange="_roSet('orden',this.value)" style="${selS}">
        <option value="total" ${_roOrden==='total'?'selected':''}>Mayor costo total</option>
        <option value="prov" ${_roOrden==='prov'?'selected':''}>Mayor costo de proveedor</option>
        <option value="comb" ${_roOrden==='comb'?'selected':''}>Mayor consumo de combustible</option>
        <option value="equipo" ${_roOrden==='equipo'?'selected':''}>Por código de equipo</option>
      </select>
    </div>
    <div class="card-body" style="padding:0"><div class="tbl-wrap"><table style="width:100%;border-collapse:collapse">
      <thead><tr style="border-bottom:1px solid var(--border)">
        <th style="${TH};text-align:left">Código</th><th style="${TH};text-align:left">Equipo</th>
        <th style="${TH};text-align:left">Tipo</th><th style="${TH};text-align:left">Proveedor</th>
        <th style="${TH};text-align:right">Proveedor S/</th><th style="${TH};text-align:right">Galones</th>
        <th style="${TH};text-align:right">Combustible S/</th><th style="${TH};text-align:right">Costo Total S/</th>
        <th style="${TH};text-align:right">% comb.</th><th style="${TH};text-align:right">% del total</th>
      </tr></thead>
      <tbody>${filas||`<tr><td colspan="10" style="text-align:center;padding:2rem;color:var(--muted2);font-size:.8rem">Sin costos registrados en este período</td></tr>`}</tbody>
      ${D.filas.length?`<tfoot><tr style="border-top:2px solid #f59e0b;background:rgba(245,158,11,.07)">
        <td colspan="4" style="${TD};text-align:right;font-weight:800;color:var(--muted2);text-transform:uppercase;font-size:.62rem;letter-spacing:.05em">Totales</td>
        <td style="${TD};text-align:right;font-family:monospace;font-weight:800;color:${_RO_C_PROV}">${_roN(tProv)}</td>
        <td style="${TD};text-align:right;font-family:monospace;font-weight:800;color:var(--muted2)">${_roN1(tGal)}</td>
        <td style="${TD};text-align:right;font-family:monospace;font-weight:800;color:${_RO_C_COMB}">${_roN(tComb)}</td>
        <td style="${TD};text-align:right;font-family:monospace;font-weight:900">${_roN(tTot)}</td>
        <td style="${TD};text-align:right;font-family:monospace;color:var(--muted2)">${tTot>0?(tComb/tTot*100).toFixed(0)+'%':'—'}</td>
        <td style="${TD};text-align:right;font-family:monospace;color:var(--muted2)">100%</td>
      </tr></tfoot>`:''}
    </table></div></div>
  </div>

  ${(()=>{
    const conv=D.filas.filter(a=>a.moneda!=='SOLES'&&a.prov>0);
    if(!conv.length)return'';
    const enSoles=conv.reduce((s,a)=>s+a.prov,0);
    return`<div style="margin-top:.7rem;padding:.45rem .7rem;border:1px solid #fbbf2455;background:rgba(251,191,36,.08);border-radius:7px;font-size:.68rem;color:#fbbf24">
      <strong>💱 ${conv.length} equipo${conv.length===1?'':'s'} con contrato en moneda extranjera</strong> — convertido${conv.length===1?'':'s'} a soles
      (${conv.map(a=>`${a.codigo}: ${_tcSim(a.moneda)} ${_roN0(a.provOrig)} × ${_tcGet(a.moneda)} = S/ ${_roN0(a.prov)}`).join(' · ')}).
      Total convertido: <strong>S/ ${_roN0(enSoles)}</strong>. La tasa se edita en los filtros.
    </div>`;
  })()}
  <div style="font-size:.62rem;color:var(--muted);margin-top:.7rem;line-height:1.6">
    <strong>Cómo se arma:</strong> el costo de proveedor es el <strong>neto sin IGV</strong> de los EDP emitidos cuyo período se cruza con el rango elegido (los anulados no cuentan).
    Los EDP en dólares o euros se convierten a soles con el tipo de cambio de los filtros; el combustible siempre está en soles.
    El combustible son los despachos del equipo con fecha dentro del rango, valorizados al precio de cada despacho.
    Los equipos sin EDP aparecen igual si consumieron combustible: son los propios.
  </div>`;

  if(mantenerFoco){
    const b=document.getElementById('roBuscar');
    if(b){b.focus();b.setSelectionRange(b.value.length,b.value.length);}
  }
}

// ── Excel ───────────────────────────────────────────────────────────────────
function _roExcel(){
  if(typeof XLSX==='undefined'){toast('Librería de Excel no disponible',true);return;}
  const D=_roDatos();
  if(!D.filas.length){toast('No hay costos para exportar',true);return;}
  const BOR={top:{style:'thin',color:{rgb:'D0D7E2'}},bottom:{style:'thin',color:{rgb:'D0D7E2'}},
             left:{style:'thin',color:{rgb:'D0D7E2'}},right:{style:'thin',color:{rgb:'D0D7E2'}}};
  const S=(v,o)=>({v:v==null?'':v,t:typeof v==='number'?'n':'s',s:Object.assign({
    font:{sz:9,bold:!!(o&&o.b),color:{rgb:(o&&o.col)||'0F172A'}},
    fill:{fgColor:{rgb:(o&&o.bg)||'FFFFFF'}},
    alignment:{horizontal:(o&&o.al)||'left',vertical:'center'},border:BOR},
    (o&&o.numFmt)?{numFmt:o.numFmt}:{})});
  const HDR=['Código','Equipo','Tipo','Proveedor','N° EDP','Moneda','T.C.','Proveedor S/','Galones','Combustible S/','Costo Total S/','% comb.'];
  const aoa=[
    [S('RESULTADO OPERATIVO — PROVEEDOR + COMBUSTIBLE',{b:1,bg:'1E3A5F',col:'FFFFFF',al:'center'}),...Array(HDR.length-1).fill(S('',{bg:'1E3A5F'}))],
    [S(`Período: ${_roDesde?_roDMY(_roDesde):'inicio'} al ${_roHasta?_roDMY(_roHasta):'hoy'}${_roTipo?' · '+_roTipo:''} · ${D.filas.length} equipos`,{bg:'EEF2F8',col:'475569',al:'center'}),...Array(HDR.length-1).fill(S('',{bg:'EEF2F8'}))],
    HDR.map(h=>S(h,{b:1,bg:'334155',col:'FFFFFF',al:'center'}))
  ];
  let p=0,g=0,c=0;
  D.filas.forEach(a=>{
    p+=a.prov;g+=a.gal;c+=a.comb;
    aoa.push([S(a.codigo,{b:1}),S(a.nombre),S(a.tipo),S(a.nEdp?a.proveedor:'Propio / sin EDP'),
      S(a.nEdp,{al:'center'}),
      S(a.moneda==='SOLES'?'S/':_tcSim(a.moneda),{al:'center',col:a.moneda==='SOLES'?'64748B':'B45309',b:a.moneda!=='SOLES'}),
      S(_tcGet(a.moneda),{al:'center',numFmt:'0.000'}),
      S(a.prov,{al:'right',numFmt:'#,##0.00',col:'C2410C'}),
      S(a.gal,{al:'right',numFmt:'#,##0.0'}),S(a.comb,{al:'right',numFmt:'#,##0.00',col:'1D4ED8'}),
      S(a.total,{al:'right',numFmt:'#,##0.00',b:1}),
      S(a.total>0?a.comb/a.total:0,{al:'right',numFmt:'0%'})]);
  });
  aoa.push([S('TOTALES',{b:1,bg:'EEF2F8',al:'right'}),...Array(6).fill(S('',{bg:'EEF2F8'})),
    S(p,{b:1,bg:'EEF2F8',al:'right',numFmt:'#,##0.00',col:'C2410C'}),
    S(g,{b:1,bg:'EEF2F8',al:'right',numFmt:'#,##0.0'}),
    S(c,{b:1,bg:'EEF2F8',al:'right',numFmt:'#,##0.00',col:'1D4ED8'}),
    S(p+c,{b:1,bg:'EEF2F8',al:'right',numFmt:'#,##0.00'}),
    S((p+c)>0?c/(p+c):0,{b:1,bg:'EEF2F8',al:'right',numFmt:'0%'})]);
  const ws=XLSX.utils.aoa_to_sheet(aoa);
  ws['!merges']=[{s:{r:0,c:0},e:{r:0,c:HDR.length-1}},{s:{r:1,c:0},e:{r:1,c:HDR.length-1}}];
  ws['!cols']=[{wch:14},{wch:28},{wch:16},{wch:26},{wch:8},{wch:8},{wch:8},{wch:14},{wch:11},{wch:15},{wch:15},{wch:9}];
  ws['!freeze']={xSplit:0,ySplit:3};
  const wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,ws,'Resultado Operativo');
  XLSX.writeFile(wb,`Resultado_Operativo_${_roHasta||'todos'}.xlsx`);
  toast(`✓ ${D.filas.length} equipos exportados`);
}

// ── PDF: hoja blanca con la misma tabla ─────────────────────────────────────
function _roPrint(){
  const D=_roDatos();
  if(!D.filas.length){toast('No hay costos para imprimir',true);return;}
  const tProv=D.filas.reduce((s,a)=>s+a.prov,0);
  const tComb=D.filas.reduce((s,a)=>s+a.comb,0);
  const tGal=D.filas.reduce((s,a)=>s+a.gal,0);
  const tTot=tProv+tComb;
  const w=window.open('','_blank','width=1200,height=800');
  if(!w){toast('Active las ventanas emergentes',true);return;}
  const TH='background:#1e3a5f;color:#fff;padding:4px 6px;font-size:8px;text-transform:uppercase;letter-spacing:.05em;border:1px solid #fff';
  const TD='border:1px solid #cbd5e1;padding:3px 6px;font-size:9px;color:#111';
  const _logo=window.location.href.replace(/[^\/\\]+$/,'')+EMPRESA.logo;
  const filas=D.filas.map(a=>`<tr>
    <td style="${TD};font-weight:700">${_roEsc(a.codigo)}</td>
    <td style="${TD}">${_roEsc(a.nombre)}</td>
    <td style="${TD}">${_roEsc(a.tipo)}</td>
    <td style="${TD}">${a.nEdp?_roEsc(a.proveedor):'Propio'}</td>
    <td style="${TD};text-align:right;color:#C2410C;font-weight:700">${a.prov>0?_roN(a.prov):'—'}${a.moneda!=='SOLES'&&a.prov>0?`<div style="font-size:7px;color:#B45309;font-weight:600">${_tcSim(a.moneda)} ${_roN(a.provOrig)} × ${_tcGet(a.moneda)}</div>`:''}</td>
    <td style="${TD};text-align:right">${a.gal>0?_roN1(a.gal):'—'}</td>
    <td style="${TD};text-align:right;color:#1D4ED8;font-weight:700">${a.comb>0?_roN(a.comb):'—'}</td>
    <td style="${TD};text-align:right;font-weight:800">${_roN(a.total)}</td>
    <td style="${TD};text-align:right">${a.total>0?(a.comb/a.total*100).toFixed(0)+'%':'—'}</td>
  </tr>`).join('');
  w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Resultado Operativo</title><style>
    *{margin:0;padding:0;box-sizing:border-box;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}
    body{font-family:Arial,sans-serif;background:#fff;color:#111;padding:1cm}
    table{width:100%;border-collapse:collapse}
    tr{page-break-inside:avoid}
    @page{size:A4 landscape;margin:.8cm}
  </style></head><body>
    <div style="display:flex;align-items:center;justify-content:space-between;border-bottom:2px solid #1e3a5f;padding-bottom:8px;margin-bottom:10px">
      <img src="${_logo}" style="height:44px;object-fit:contain">
      <div style="text-align:center;flex:1">
        <div style="font-size:16px;font-weight:900;color:#1e3a5f">RESULTADO OPERATIVO</div>
        <div style="font-size:10px;color:#64748b">Costo de proveedores + combustible · ${_roDesde?_roDMY(_roDesde):'inicio'} al ${_roHasta?_roDMY(_roHasta):'hoy'}${_roTipo?' · '+_roEsc(_roTipo):''}</div>
      </div>
      <div style="width:120px"></div>
    </div>
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:10px">
      ${[['COSTO OPERATIVO',tTot,'#111'],['PROVEEDORES',tProv,'#C2410C'],['COMBUSTIBLE',tComb,'#1D4ED8'],['GALONES',tGal,'#111']].map(([l,v,c],i)=>
        `<div style="border:1px solid #cbd5e1;border-radius:5px;padding:5px 8px;text-align:center">
          <div style="font-size:8px;color:#64748b;text-transform:uppercase;letter-spacing:.06em">${l}</div>
          <div style="font-size:13px;font-weight:800;color:${c}">${i===3?_roN1(v)+' gal':'S/ '+_roN(v)}</div>
        </div>`).join('')}
    </div>
    <table>
      <thead><tr>
        <th style="${TH};text-align:left">Código</th><th style="${TH};text-align:left">Equipo</th>
        <th style="${TH};text-align:left">Tipo</th><th style="${TH};text-align:left">Proveedor</th>
        <th style="${TH}">Proveedor S/</th><th style="${TH}">Galones</th><th style="${TH}">Combustible S/</th>
        <th style="${TH}">Costo Total S/</th><th style="${TH}">% comb.</th>
      </tr></thead>
      <tbody>${filas}</tbody>
      <tfoot><tr style="background:#e2e8f0;font-weight:800">
        <td colspan="4" style="${TD};text-align:right">TOTALES</td>
        <td style="${TD};text-align:right;color:#C2410C">${_roN(tProv)}</td>
        <td style="${TD};text-align:right">${_roN1(tGal)}</td>
        <td style="${TD};text-align:right;color:#1D4ED8">${_roN(tComb)}</td>
        <td style="${TD};text-align:right">${_roN(tTot)}</td>
        <td style="${TD};text-align:right">${tTot>0?(tComb/tTot*100).toFixed(0)+'%':'—'}</td>
      </tr></tfoot>
    </table>
    <div style="margin-top:10px;font-size:8px;color:#64748b;border-left:3px solid #1e3a5f;padding:3px 7px;background:#f8fafc">
      El costo de proveedor es el neto sin IGV de los EDP emitidos en el período (los anulados no se consideran).
      Los contratos en moneda extranjera se expresan en soles al tipo de cambio indicado bajo cada importe${_roDatos().filas.some(a=>a.moneda!=='SOLES')?` (US$ ${_tcGet('DOLARES')} / S/)`:''}.
      El combustible corresponde a los despachos del equipo dentro del rango, valorizados al precio de cada despacho.
    </div>
    <div style="margin-top:14px;font-size:8px;color:#94a3b8;text-align:center">Generado por GDAR – ECOSERMO · ${new Date().toLocaleString('es-PE')}</div>
    <script>window.onload=function(){window.print();}<${'/'}script>
  </body></html>`);
  w.document.close();
}
