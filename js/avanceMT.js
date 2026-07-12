// ══ AVANCE MT ══
let _amtTab=1, _amtFechaD=null, _amtFechaH=null, _amtMatFiltro=new Set(), _amtFiltroTramos='todos';
let _amtMatDropEl=null;
let _amtCapM3=+localStorage.getItem('_amtCapM3')||12;
function _amtSetCap(v){_amtCapM3=Math.max(1,+v||12);localStorage.setItem('_amtCapM3',_amtCapM3);_amtRender();}

function rAvanceMT(){
  if(!_amtFechaD){
    const h=today();
    const d=new Date(h);d.setDate(d.getDate()-30);
    _amtFechaH=h;
    _amtFechaD=d.toISOString().slice(0,10);
  }
  _amtRender();
}

function _amtTabSwitch(n){
  _amtTab=n;
  document.querySelectorAll('.amt-tab').forEach((b,i)=>b.classList.toggle('active',i+1===n));
  _amtRender();
}

function _amtRender(){
  const body=document.getElementById('amtBody');if(!body)return;
  if(_amtTab===1) _amtRenderTramos(body);
  else if(_amtTab===3) _amtRenderSemanal(body,'m3');
  else if(_amtTab===4) _amtRenderSemanal(body,'viajes');
  else if(_amtTab===5) _amtRenderSemEquipos(body);
  else if(_amtTab===6) _amtRenderSemOperadores(body);
  else if(_amtTab===7) _amtRenderSemMatriz(body);
  else if(_amtTab===8) _amtRenderSemOrigen(body);
  else _amtRenderAreas(body);
}

function _amtPartesFiltradas(){
  return (DB.partes||[]).filter(function(p){
    if(_amtFechaD && p.fecha < _amtFechaD) return false;
    if(_amtFechaH && p.fecha > _amtFechaH) return false;
    return true;
  });
}

function _amtMateriales(){
  const set=new Set();
  (DB.partes||[]).forEach(function(p){(p.viajes||[]).forEach(function(v){if(v.material)set.add(v.material);});});
  return Array.from(set).sort();
}

function _amtFiltroBar(){
  const mats=_amtMateriales();
  const inpS='font-size:.72rem;padding:.2rem .4rem;border-radius:5px;border:1px solid var(--border);background:var(--panel2);color:var(--text);width:130px;flex-shrink:0';
  return `<div style="display:flex;align-items:center;gap:.5rem;flex-wrap:nowrap;margin-bottom:.8rem;padding:.4rem .7rem;background:var(--panel2);border:1px solid var(--border);border-radius:8px;overflow:hidden">
    <span style="font-size:.62rem;color:var(--muted2);font-weight:700;text-transform:uppercase;letter-spacing:.08em;white-space:nowrap;flex-shrink:0">Período</span>
    <input type="date" value="${_amtFechaD||''}" onchange="_amtFechaD=this.value;_amtRender()" style="${inpS}">
    <span style="color:var(--muted2);font-size:.75rem;flex-shrink:0">→</span>
    <input type="date" value="${_amtFechaH||''}" onchange="_amtFechaH=this.value;_amtRender()" style="${inpS}">
    <div style="width:1px;height:18px;background:var(--border);flex-shrink:0"></div>
    <span style="font-size:.62rem;color:var(--muted2);font-weight:700;text-transform:uppercase;letter-spacing:.08em;white-space:nowrap;flex-shrink:0">Material</span>
    <button id="amtMatBtn" onclick="_amtOpenMatFilter(event)" style="font-size:.72rem;padding:.2rem .55rem;border-radius:5px;border:1px solid ${_amtMatFiltro.size?'#06b6d4':'var(--border)'};background:var(--panel2);color:${_amtMatFiltro.size?'#06b6d4':'var(--text)'};cursor:pointer;min-width:140px;text-align:left;display:flex;align-items:center;gap:.4rem;flex-shrink:0">
      <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${_amtMatFiltro.size===0?'Todos':_amtMatFiltro.size===1?[..._amtMatFiltro][0]:_amtMatFiltro.size+' materiales'}</span>
      <span style="font-size:.6rem;color:var(--muted2)">▾</span>
      ${_amtMatFiltro.size?'<span onclick="event.stopPropagation();_amtMatFiltro.clear();_amtRender()" style="font-size:.65rem;color:#ef4444" title="Limpiar">✕</span>':''}
    </button>
    <div style="width:1px;height:18px;background:var(--border);flex-shrink:0"></div>
    <span style="font-size:.62rem;color:var(--muted2);font-weight:700;text-transform:uppercase;letter-spacing:.08em;white-space:nowrap;flex-shrink:0">Tramos</span>
    <div style="display:flex;gap:.2rem;flex-shrink:0">
      ${[['todos','Todos','var(--muted2)'],['activos','Solo activos','#10b981'],['inactivos','Sin actividad','#6b7280']].map(function(op){
        const sel=_amtFiltroTramos===op[0];
        return '<button onclick="_amtFiltroTramos=\''+op[0]+'\';_amtRender()" style="font-size:.62rem;padding:.2rem .5rem;border-radius:5px;border:1px solid '+(sel?op[2]+'80':'var(--border)')+';background:'+(sel?op[2]+'18':'transparent')+';color:'+(sel?op[2]:'var(--muted2)')+';cursor:pointer;white-space:nowrap;font-weight:'+(sel?'700':'400')+'">'+op[1]+'</button>';
      }).join('')}
    </div>
    <div style="width:1px;height:18px;background:var(--border);flex-shrink:0"></div>
    <span style="font-size:.62rem;color:var(--muted2);font-weight:700;text-transform:uppercase;letter-spacing:.08em;white-space:nowrap;flex-shrink:0">Cap. m³/viaje</span>
    <input type="number" min="1" step="0.5" value="${_amtCapM3}" onchange="_amtSetCap(this.value)" style="font-size:.72rem;padding:.2rem .4rem;border-radius:5px;border:1px solid var(--border);background:var(--panel2);color:var(--text);width:58px;flex-shrink:0" title="Capacidad de carga por viaje en m³">
  </div>`;
}

// ── TAB 1: AVANCE POR TRAMO ──────────────────────────────────────────────────
function _amtRenderTramos(body){
  const partes=_amtPartesFiltradas();
  const hoy=today();

  // Agregar viajes por tramoId
  const byTramo={};
  partes.forEach(function(p){
    (p.viajes||[]).forEach(function(v){
      if(!v.tramoId) return;
      if(_amtMatFiltro.size && !_amtMatFiltro.has(v.material)) return;
      if(!byTramo[v.tramoId]) byTramo[v.tramoId]={viajes:0,m3:0,parteIds:new Set(),lastFecha:''};
      byTramo[v.tramoId].viajes+=(parseFloat(v.cant)||0);
      byTramo[v.tramoId].m3+=(parseFloat(v.cant)||0)*_amtCapM3;
      byTramo[v.tramoId].parteIds.add(p.id);
      if(p.fecha>byTramo[v.tramoId].lastFecha) byTramo[v.tramoId].lastFecha=p.fecha;
    });
    // equipos LA con tramoId a nivel de parte (no volquetes)
    if(p.tramoId && !(p.viajes&&p.viajes.length)){
      if(!byTramo[p.tramoId]) byTramo[p.tramoId]={viajes:0,m3:0,parteIds:new Set(),lastFecha:'',soloEquipo:true};
      byTramo[p.tramoId].parteIds.add(p.id);
      if(p.fecha>byTramo[p.tramoId].lastFecha) byTramo[p.tramoId].lastFecha=p.fecha;
    }
  });

  const tramosAll=(DB.tramos||[]).sort(function(a,b){return (a.codigo||'').localeCompare(b.codigo||'');});
  const tramos=tramosAll.filter(function(tr){
    const activo=!!byTramo[tr.id];
    if(_amtFiltroTramos==='activos') return activo;
    if(_amtFiltroTramos==='inactivos') return !activo;
    return true;
  });
  const totalM3=Object.values(byTramo).reduce(function(s,t){return s+t.m3;},0);
  const totalViajes=Object.values(byTramo).reduce(function(s,t){return s+t.viajes;},0);
  const tramosActivos=Object.keys(byTramo).filter(function(id){return (byTramo[id].viajes||0)>0||(byTramo[id].parteIds&&byTramo[id].parteIds.size>0);}).length;

  function diasSin(fecha){
    if(!fecha) return 999;
    const d=new Date(hoy)-new Date(fecha);
    return Math.floor(d/(1000*60*60*24));
  }
  function estadoDot(d){
    if(d===999) return {dot:'⬜',col:'#6b7280',label:'Sin datos'};
    if(d<=2)   return {dot:'🟢',col:'#10b981',label:'Activo'};
    if(d<=5)   return {dot:'🟡',col:'#f59e0b',label:d+' días sin actividad'};
    return {dot:'🔴',col:'#ef4444',label:d+' días sin actividad'};
  }
  function diasLabel(d){
    if(d===999) return '—';
    if(d===0)  return 'hoy';
    if(d===1)  return 'ayer';
    return 'hace '+d+' días';
  }

  body.innerHTML=_amtFiltroBar()+`
  <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:.6rem;margin-bottom:.9rem">
    ${_amtKpi('m³ Transportado','<b style="font-size:1.3rem">'+totalM3.toLocaleString('es-PE',{maximumFractionDigits:1})+'</b>','var(--ctl)')}
    ${_amtKpi('Total Viajes','<b style="font-size:1.3rem">'+totalViajes.toLocaleString()+'</b>','#3b82f6')}
    ${_amtKpi('Tramos Activos','<b style="font-size:1.3rem">'+tramosActivos+' / '+tramos.length+'</b>','#8b5cf6')}
    ${_amtKpi('m³ / Viaje','<b style="font-size:1.3rem">'+(totalViajes?( totalM3/totalViajes).toFixed(1):'—')+'</b>','#f59e0b')}
  </div>
  <div class="card" style="padding:0">
    <div class="tbl-wrap">
    <table style="min-width:100%;border-collapse:collapse;font-size:.72rem">
      <thead><tr style="background:var(--panel2);color:var(--muted2);font-size:.62rem;text-transform:uppercase;letter-spacing:.07em">
        <th style="padding:.45rem .6rem;text-align:left;white-space:nowrap">Est.</th>
        <th style="padding:.45rem .6rem;text-align:left">Tramo</th>
        <th style="padding:.45rem .6rem;text-align:right">Viajes</th>
        <th style="padding:.45rem .6rem;text-align:right">m³ Real</th>
        <th style="padding:.45rem .6rem;text-align:right">Partes</th>
        <th style="padding:.45rem .6rem;text-align:left;min-width:180px">Actividad</th>
        <th style="padding:.45rem .6rem;text-align:left">Último parte</th>
      </tr></thead>
      <tbody>
      ${tramos.length ? tramos.map(function(tr){
        const d=byTramo[tr.id]||null;
        const dias=d ? diasSin(d.lastFecha) : 999;
        const st=estadoDot(dias);
        const viajes=d?d.viajes:0;
        const m3=d?d.m3:0;
        const nPartes=d?d.parteIds.size:0;
        const maxM3=Math.max(...Object.values(byTramo).map(function(x){return x.m3;}),1);
        const barPct=Math.round(m3/maxM3*100);
        const nombre=(tr.inicio||tr.codigo||'')+(tr.fin?' → '+tr.fin:'');
        return `<tr style="border-bottom:1px solid var(--border)${d?'':';opacity:.45'}">
          <td style="padding:.4rem .6rem;text-align:center;font-size:.9rem" title="${st.label}">${st.dot}</td>
          <td style="padding:.4rem .6rem">
            <div style="font-weight:700;color:var(--text)">${tr.codigo||'—'}</div>
            <div style="font-size:.6rem;color:var(--muted2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:220px">${nombre}</div>
          </td>
          <td style="padding:.4rem .6rem;text-align:right;font-weight:700;color:#3b82f6">${viajes||'—'}</td>
          <td style="padding:.4rem .6rem;text-align:right;font-weight:700;color:var(--ctl)">${m3?m3.toLocaleString('es-PE',{maximumFractionDigits:1})+' m³':'—'}</td>
          <td style="padding:.4rem .6rem;text-align:right;color:var(--muted2)">${nPartes||'—'}</td>
          <td style="padding:.4rem .6rem">
            ${m3?`<div style="background:var(--border);border-radius:4px;height:7px;width:100%;overflow:hidden">
              <div style="height:100%;width:${barPct}%;background:${st.col};border-radius:4px;transition:.4s"></div>
            </div><div style="font-size:.58rem;color:${st.col};margin-top:2px">${barPct}% del máximo</div>`:'<span style="color:var(--muted2);font-size:.65rem">Sin actividad en período</span>'}
          </td>
          <td style="padding:.4rem .6rem;font-size:.65rem;color:${st.col};white-space:nowrap">${diasLabel(dias)}</td>
        </tr>`;
      }).join('') : '<tr><td colspan="7" style="text-align:center;padding:2rem;color:var(--muted2)">'+(tramosAll.length?'Sin tramos con actividad en este período':'Sin tramos registrados')+'</td></tr>'}
      </tbody>
    </table>
    </div>
  </div>`;
}

// ── TAB 2: VOLUMEN POR FRENTE DE TRABAJO ──────────────────────────────────────────────────
function _amtRenderAreas(body){
  const partes=_amtPartesFiltradas();
  const hoy=today();

  const byDest={};
  partes.forEach(function(p){
    (p.viajes||[]).forEach(function(v){
      if(!v.destino) return;
      if(_amtMatFiltro.size && !_amtMatFiltro.has(v.material)) return;
      const dest=v.destino;
      if(!byDest[dest]) byDest[dest]={viajes:0,m3:0,parteIds:new Set(),lastFecha:'',materiales:{},tramos:{}};
      const _cant=parseFloat(v.cant)||0;
      byDest[dest].viajes+=_cant;
      byDest[dest].m3+=_cant*_amtCapM3;
      byDest[dest].parteIds.add(p.id);
      if(p.fecha>byDest[dest].lastFecha) byDest[dest].lastFecha=p.fecha;
      if(v.material){byDest[dest].materiales[v.material]=(byDest[dest].materiales[v.material]||0)+(_cant*_amtCapM3);}
      if(v.tramoId){
        if(!byDest[dest].tramos[v.tramoId]) byDest[dest].tramos[v.tramoId]={viajes:0,m3:0};
        byDest[dest].tramos[v.tramoId].viajes+=_cant;
        byDest[dest].tramos[v.tramoId].m3+=_cant*_amtCapM3;
      }
    });
  });

  const areas=Object.entries(byDest).sort(function(a,b){return b[1].m3-a[1].m3;});
  const totalM3=areas.reduce(function(s,a){return s+a[1].m3;},0);
  const totalViajes=areas.reduce(function(s,a){return s+a[1].viajes;},0);
  const colores=['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#f97316','#ec4899','#84cc16','#a78bfa'];

  function diasSin(fecha){if(!fecha)return 999;return Math.floor((new Date(hoy)-new Date(fecha))/(864e5));}
  function diasLabel(d){if(d===999)return '—';if(d===0)return 'hoy';if(d===1)return 'ayer';return 'hace '+d+' días';}

  function matPrincipal(mats){
    const entries=Object.entries(mats).sort(function(a,b){return b[1]-a[1];});
    if(!entries.length) return '—';
    const total=Object.values(mats).reduce(function(s,v){return s+v;},0);
    return entries.slice(0,2).map(function(e){return e[0]+' ('+(e[1]/total*100).toFixed(0)+'%)';}).join(' · ');
  }

  function tramosDeArea(tramosObj){
    const tramos=Object.entries(tramosObj).sort(function(a,b){return b[1].m3-a[1].m3;});
    if(!tramos.length) return '—';
    return tramos.slice(0,3).map(function(e){
      const tr=(DB.tramos||[]).find(function(t){return t.id==e[0];});
      const cod=tr?tr.codigo:('#'+e[0]);
      return cod+' <span style="color:var(--muted2)">'+e[1].viajes+'v · '+e[1].m3.toFixed(0)+'m³</span>';
    }).join('<br>');
  }

  body.innerHTML=_amtFiltroBar()+`
  <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:.6rem;margin-bottom:.9rem">
    ${_amtKpi('m³ Transportado','<b style="font-size:1.3rem">'+totalM3.toLocaleString('es-PE',{maximumFractionDigits:1})+'</b>','var(--ctl)')}
    ${_amtKpi('Total Viajes','<b style="font-size:1.3rem">'+totalViajes.toLocaleString()+'</b>','#3b82f6')}
    ${_amtKpi('Áreas Receptoras','<b style="font-size:1.3rem">'+areas.length+'</b>','#8b5cf6')}
    ${_amtKpi('m³ / Viaje','<b style="font-size:1.3rem">'+(totalViajes?(totalM3/totalViajes).toFixed(1):'—')+'</b>','#f59e0b')}
  </div>

  <!-- Barras visuales por área -->
  <div style="margin-bottom:.9rem;padding:.7rem .9rem;background:var(--panel2);border:1px solid var(--border);border-radius:8px">
    <div style="font-size:.62rem;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--muted2);margin-bottom:.6rem">Distribución de volumen por área</div>
    ${areas.map(function(e,i){
      const pct=totalM3?Math.round(e[1].m3/totalM3*100):0;
      const col=colores[i%colores.length];
      return `<div style="margin-bottom:.35rem">
        <div style="display:flex;justify-content:space-between;margin-bottom:2px">
          <span style="font-size:.67rem;font-weight:700;color:${col}">${e[0]}</span>
          <span style="font-size:.63rem;color:var(--muted2)">${e[1].m3.toLocaleString('es-PE',{maximumFractionDigits:1})} m³ &nbsp;|&nbsp; ${e[1].viajes} viajes &nbsp;|&nbsp; ${pct}%</span>
        </div>
        <div style="background:var(--border);border-radius:4px;height:8px;overflow:hidden">
          <div style="height:100%;width:${pct}%;background:${col};border-radius:4px;transition:.5s"></div>
        </div>
      </div>`;
    }).join('')}
  </div>

  <!-- Tabla detalle -->
  <div class="card" style="padding:0">
    <div class="tbl-wrap">
    <table style="min-width:100%;border-collapse:collapse;font-size:.72rem">
      <thead><tr style="background:var(--panel2);color:var(--muted2);font-size:.62rem;text-transform:uppercase;letter-spacing:.07em">
        <th style="padding:.45rem .6rem;text-align:left">&nbsp;</th>
        <th style="padding:.45rem .6rem;text-align:left">Área / Destino</th>
        <th style="padding:.45rem .6rem;text-align:right">Viajes</th>
        <th style="padding:.45rem .6rem;text-align:right">m³ Total</th>
        <th style="padding:.45rem .6rem;text-align:right">% del Total</th>
        <th style="padding:.45rem .6rem;text-align:left">Material</th>
        <th style="padding:.45rem .6rem;text-align:left">Tramos que alimentan</th>
        <th style="padding:.45rem .6rem;text-align:left;white-space:nowrap">Último viaje</th>
      </tr></thead>
      <tbody>
      ${areas.length ? areas.map(function(e,i){
        const dest=e[0], d=e[1];
        const col=colores[i%colores.length];
        const pct=totalM3?Math.round(d.m3/totalM3*100):0;
        const dias=diasSin(d.lastFecha);
        const fechaCol=dias<=2?'#10b981':dias<=5?'#f59e0b':'#ef4444';
        return `<tr style="border-bottom:1px solid var(--border)">
          <td style="padding:.4rem .5rem"><span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:${col}"></span></td>
          <td style="padding:.4rem .6rem;font-weight:700;color:${col}">${dest}</td>
          <td style="padding:.4rem .6rem;text-align:right;font-weight:700;color:#3b82f6">${d.viajes.toLocaleString()}</td>
          <td style="padding:.4rem .6rem;text-align:right;font-weight:700;color:var(--ctl)">${d.m3.toLocaleString('es-PE',{maximumFractionDigits:1})} m³</td>
          <td style="padding:.4rem .6rem;text-align:right">
            <div style="display:flex;align-items:center;gap:.3rem;justify-content:flex-end">
              <div style="background:var(--border);border-radius:3px;height:6px;width:60px;overflow:hidden">
                <div style="height:100%;width:${pct}%;background:${col};border-radius:3px"></div>
              </div>
              <span style="font-size:.65rem;color:${col};min-width:28px;text-align:right">${pct}%</span>
            </div>
          </td>
          <td style="padding:.4rem .6rem;font-size:.63rem;color:var(--muted2)">${matPrincipal(d.materiales)}</td>
          <td style="padding:.4rem .6rem;font-size:.63rem;color:var(--text);line-height:1.4">${tramosDeArea(d.tramos)}</td>
          <td style="padding:.4rem .6rem;font-size:.65rem;color:${fechaCol};white-space:nowrap">${diasLabel(dias)}</td>
        </tr>`;
      }).join('') : '<tr><td colspan="8" style="text-align:center;padding:2rem;color:var(--muted2)">Sin datos en el período seleccionado</td></tr>'}
      </tbody>
      ${areas.length ? `<tfoot>
        <tr style="background:var(--panel2);font-weight:700;border-top:2px solid var(--border)">
          <td colspan="2" style="padding:.4rem .6rem;font-size:.65rem;color:var(--muted2);text-transform:uppercase;letter-spacing:.07em">TOTAL</td>
          <td style="padding:.4rem .6rem;text-align:right;color:#3b82f6">${totalViajes.toLocaleString()}</td>
          <td style="padding:.4rem .6rem;text-align:right;color:var(--ctl)">${totalM3.toLocaleString('es-PE',{maximumFractionDigits:1})} m³</td>
          <td colspan="4"></td>
        </tr>
      </tfoot>` : ''}
    </table>
    </div>
  </div>`;
}

// ── Filtro multi-material ─────────────────────────────────────────────────────
function _amtOpenMatFilter(ev){
  if(_amtMatDropEl){_amtMatDropEl.remove();_amtMatDropEl=null;return;}
  const mats=_amtMateriales();
  const div=document.createElement('div');
  div.style.cssText='position:fixed;z-index:99990;background:var(--panel);border:1px solid var(--border);border-radius:10px;padding:.4rem .35rem;box-shadow:0 8px 32px rgba(0,0,0,.55);min-width:220px;max-height:320px;overflow-y:auto;font-family:inherit';
  function mkRow(label,checked,isAll){
    const row=document.createElement('div');
    row.style.cssText='display:flex;flex-direction:row;align-items:center;padding:.28rem .45rem;border-radius:6px;cursor:pointer;gap:0';
    const cb=document.createElement('input');
    cb.type='checkbox';cb.checked=checked;
    cb.style.cssText='flex:0 0 15px;width:15px;height:15px;margin:0;padding:0;cursor:pointer;accent-color:#06b6d4';
    const lbl=document.createElement('span');
    lbl.textContent=label;
    lbl.style.cssText='flex:1;margin-left:9px;font-size:.72rem;font-weight:'+(checked&&!isAll?'700':'500')+';color:'+(checked&&!isAll?'#06b6d4':'var(--text)')+';white-space:nowrap;overflow:hidden;text-overflow:ellipsis';
    row.appendChild(cb);row.appendChild(lbl);
    if(checked&&!isAll)row.style.background='rgba(6,182,212,.12)';
    row.onmouseenter=function(){if(!row.style.background.includes('182'))row.style.background='rgba(255,255,255,.05)';};
    row.onmouseleave=function(){if(!row.style.background.includes('182'))row.style.background='';};
    if(isAll){
      cb.onchange=function(){_amtMatFiltro.clear();_amtRender();};
      row.onclick=function(e){if(e.target!==cb)cb.click();};
    }else{
      cb.onchange=function(){if(this.checked)_amtMatFiltro.add(label);else _amtMatFiltro.delete(label);_amtRender();};
      row.onclick=function(e){if(e.target!==cb)cb.click();};
    }
    return row;
  }
  const header=document.createElement('div');
  header.style.cssText='padding:.1rem .1rem .3rem;border-bottom:1px solid var(--border);margin-bottom:.2rem';
  header.appendChild(mkRow('Todos los materiales',_amtMatFiltro.size===0,true));
  div.appendChild(header);
  mats.forEach(function(m){div.appendChild(mkRow(m,_amtMatFiltro.has(m),false));});
  document.body.appendChild(div);
  _amtMatDropEl=div;
  const btn=document.getElementById('amtMatBtn');
  const r=btn?btn.getBoundingClientRect():{top:100,left:100,bottom:130};
  let top=r.bottom+4,left=r.left;
  if(left+230>window.innerWidth)left=window.innerWidth-235;
  if(top+330>window.innerHeight)top=r.top-335;
  div.style.top=top+'px';div.style.left=left+'px';
  setTimeout(()=>document.addEventListener('click',function h(e){
    if(!div.contains(e.target)&&e.target.id!=='amtMatBtn'&&!e.target.closest('#amtMatBtn')){div.remove();_amtMatDropEl=null;document.removeEventListener('click',h);}
  },{capture:true,once:false}),50);
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function _amtKpi(label, valueHtml, color){
  return `<div style="background:#f5f1e8;border:2px solid ${color};border-radius:8px;padding:.6rem .8rem">
    <div style="font-size:.58rem;font-weight:700;text-transform:uppercase;letter-spacing:.09em;color:#5a6376;margin-bottom:.25rem">${label}</div>
    <div style="color:#0f172a">${valueHtml}</div>
  </div>`;
}

// ══════════════════════════════════════════════════════════════════════════════
// TABS SEMANALES (3-7): Volumen · Viajes ☀/🌙 · Por Equipo · Por Operador · Matriz
// ══════════════════════════════════════════════════════════════════════════════
let _amtSemIni=null;   // fecha del día 1 de la semana (puede ser cualquier día)
let _amtSemModo='m3';
let _amtSemChart=null;
let _amtSemExportData=null;
let _amtMetaSem=+localStorage.getItem('_amtMetaSem')||0;
function _amtSetMeta(v){_amtMetaSem=Math.max(0,+v||0);localStorage.setItem('_amtMetaSem',_amtMetaSem);_amtRender();}

function _amtSemDefault(){
  const h=new Date(today()+'T12:00:00');
  const lunes=new Date(h);
  lunes.setDate(h.getDate()-((h.getDay()+6)%7));
  return lunes.toISOString().slice(0,10);
}
function _amtSemNav(dias){
  const d=new Date((_amtSemIni||_amtSemDefault())+'T12:00:00');
  d.setDate(d.getDate()+dias);
  _amtSemIni=d.toISOString().slice(0,10);
  _amtRender();
}

// Info de la semana activa: 7 fechas desde _amtSemIni
function _amtSemInfo(offsetDias){
  if(!_amtSemIni)_amtSemIni=_amtSemDefault();
  const pad=n=>String(n).padStart(2,'0');
  const DN=['DOM','LUN','MAR','MIÉ','JUE','VIE','SÁB'];
  const d0=new Date(_amtSemIni+'T12:00:00');
  if(offsetDias)d0.setDate(d0.getDate()+offsetDias);
  const fechas=[];
  for(let i=0;i<7;i++){
    const d=new Date(d0);d.setDate(d0.getDate()+i);
    fechas.push({iso:`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`,lbl:DN[d.getDay()],dm:`${pad(d.getDate())}/${pad(d.getMonth()+1)}`});
  }
  return{fechas,fIni:fechas[0].iso,fFin:fechas[6].iso,rango:`${fechas[0].dm} → ${fechas[6].dm}`};
}

// Viajes de la semana aplanados (aplica filtro de material)
function _amtSemViajes(fIni,fFin){
  const out=[];
  (DB.partes||[]).forEach(function(p){
    if(!p.fecha||p.fecha<fIni||p.fecha>fFin)return;
    const noche=/noche/i.test(p.turno||'');
    (p.viajes||[]).forEach(function(v){
      if(_amtMatFiltro.size&&!_amtMatFiltro.has(v.material))return;
      const cant=parseFloat(v.cant)||0;if(!cant)return;
      out.push({fecha:p.fecha,noche,origen:v.origen||'',destino:v.destino||'',material:v.material||'',cant,m3:cant*_amtCapM3,eqId:p.eqId,op:p.op||p.operador||'',tramoId:v.tramoId||null});
    });
  });
  return out;
}

// Barra común de los tabs semanales
function _amtSemBar(opts){
  opts=opts||{};
  const inpS='font-size:.72rem;padding:.2rem .4rem;border-radius:5px;border:1px solid var(--border);background:var(--panel2);color:var(--text);flex-shrink:0';
  return `<div style="display:flex;align-items:center;gap:.5rem;flex-wrap:wrap;margin-bottom:.8rem;padding:.4rem .7rem;background:var(--panel2);border:1px solid var(--border);border-radius:8px">
    <span style="font-size:.62rem;color:var(--muted2);font-weight:700;text-transform:uppercase;letter-spacing:.08em;white-space:nowrap">Semana (7 días desde)</span>
    <button onclick="_amtSemNav(-7)" style="background:none;border:1px solid var(--border);border-radius:5px;color:var(--text);cursor:pointer;font-size:.85rem;padding:.12rem .5rem" title="Semana anterior">‹</button>
    <input type="date" value="${_amtSemIni}" onchange="_amtSemIni=this.value;_amtRender()" style="${inpS};width:135px">
    <button onclick="_amtSemNav(7)" style="background:none;border:1px solid var(--border);border-radius:5px;color:var(--text);cursor:pointer;font-size:.85rem;padding:.12rem .5rem" title="Semana siguiente">›</button>
    <span style="font-size:.72rem;color:var(--ctl);font-weight:700;font-family:monospace">${opts.rango||''}</span>
    <button onclick="_amtSemIni=_amtSemDefault();_amtRender()" style="font-size:.62rem;padding:.2rem .5rem;border-radius:5px;border:1px solid var(--border);background:transparent;color:var(--muted2);cursor:pointer">Semana actual (Lun)</button>
    <div style="width:1px;height:18px;background:var(--border)"></div>
    <span style="font-size:.62rem;color:var(--muted2);font-weight:700;text-transform:uppercase;letter-spacing:.08em;white-space:nowrap">Material</span>
    <button id="amtMatBtn" onclick="_amtOpenMatFilter(event)" style="font-size:.72rem;padding:.2rem .55rem;border-radius:5px;border:1px solid ${_amtMatFiltro.size?'#06b6d4':'var(--border)'};background:var(--panel2);color:${_amtMatFiltro.size?'#06b6d4':'var(--text)'};cursor:pointer;min-width:130px;text-align:left;display:flex;align-items:center;gap:.4rem">
      <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${_amtMatFiltro.size===0?'Todos':_amtMatFiltro.size===1?[..._amtMatFiltro][0]:_amtMatFiltro.size+' materiales'}</span>
      <span style="font-size:.6rem;color:var(--muted2)">▾</span>
      ${_amtMatFiltro.size?'<span onclick="event.stopPropagation();_amtMatFiltro.clear();_amtRender()" style="font-size:.65rem;color:#ef4444" title="Limpiar">✕</span>':''}
    </button>
    ${opts.cap!==false?`<div style="width:1px;height:18px;background:var(--border)"></div>
    <span style="font-size:.62rem;color:var(--muted2);font-weight:700;text-transform:uppercase;letter-spacing:.08em;white-space:nowrap">Cap. m³/viaje</span>
    <input type="number" min="1" step="0.5" value="${_amtCapM3}" onchange="_amtSetCap(this.value)" style="${inpS};width:58px" title="Capacidad de carga por viaje en m³">`:''}
    ${opts.meta?`<div style="width:1px;height:18px;background:var(--border)"></div>
    <span style="font-size:.62rem;color:var(--muted2);font-weight:700;text-transform:uppercase;letter-spacing:.08em;white-space:nowrap">🎯 Meta m³/sem</span>
    <input type="number" min="0" step="100" value="${_amtMetaSem||''}" placeholder="—" onchange="_amtSetMeta(this.value)" style="${inpS};width:80px" title="Meta semanal de m³ (0 = sin meta)">`:''}
    <button onclick="_amtSemExport()" style="margin-left:auto;font-size:.7rem;padding:.25rem .7rem;border-radius:5px;border:none;background:#166534;color:#fff;cursor:pointer;font-weight:700;white-space:nowrap">📊 Excel</button>
  </div>`;
}

// Exporta el cuadro activo a Excel
function _amtSemExport(){
  if(!_amtSemExportData||!_amtSemExportData.aoa){toast('Nada que exportar',true);return;}
  if(typeof XLSX==='undefined'){toast('Librería Excel no disponible',true);return;}
  const ws=XLSX.utils.aoa_to_sheet(_amtSemExportData.aoa);
  const wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,ws,'Semana');
  XLSX.writeFile(wb,_amtSemExportData.name||'reporte_semanal.xlsx');
}

// Chip de variación vs semana anterior: ▲ +12% / ▼ −8%
function _amtDelta(cur,prev){
  if(!prev)return cur>0?'<span style="font-size:.58rem;color:var(--muted2)" title="Sin datos en la semana anterior">nuevo</span>':'';
  const d=(cur-prev)/prev*100;
  if(Math.abs(d)<0.5)return'<span style="font-size:.58rem;color:var(--muted2)">= igual</span>';
  const up=d>0;
  return`<span style="font-size:.58rem;font-weight:700;color:${up?'#10b981':'#ef4444'}" title="Semana anterior: ${prev.toLocaleString('es-PE',{maximumFractionDigits:1})}">${up?'▲':'▼'} ${up?'+':''}${d.toFixed(0)}%</span>`;
}

// Fondo tipo heatmap según intensidad (0..max)
function _amtHeat(v,max){
  if(!v||!max)return'transparent';
  const a=0.07+0.38*Math.min(1,v/max);
  return`rgba(6,182,212,${a.toFixed(2)})`;
}

const _AMT_TH='padding:.45rem .5rem;font-size:.62rem;text-transform:uppercase;letter-spacing:.06em;color:var(--muted2);white-space:nowrap';
const _AMT_TD='padding:.4rem .55rem;border:1px solid var(--border);font-size:.74rem;vertical-align:middle';
const _AMT_COLORES=['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#f97316','#ec4899','#84cc16','#a78bfa'];
const _amtFmt1=v=>v.toLocaleString('es-PE',{maximumFractionDigits:1});

// ── TABS 3 y 4: VOLUMEN / VIAJES SEMANAL por destino ─────────────────────────
function _amtRenderSemanal(body,modo){
  _amtSemModo=modo||'m3';
  const modoViajes=_amtSemModo==='viajes';
  const info=_amtSemInfo();
  const{fechas,fIni,fFin,rango}=info;
  const hoy=today();
  const TH=_AMT_TH,TD=_AMT_TD,fmtM3=_amtFmt1;

  // Semana actual y anterior
  const vs=_amtSemViajes(fIni,fFin).filter(v=>v.destino);
  const infoPrev=_amtSemInfo(-7);
  const vsPrev=_amtSemViajes(infoPrev.fIni,infoPrev.fFin).filter(v=>v.destino);

  // grid[destino][iso]={m3,viajes,vd,vn}
  const grid={};
  vs.forEach(function(v){
    if(!grid[v.destino])grid[v.destino]={};
    if(!grid[v.destino][v.fecha])grid[v.destino][v.fecha]={m3:0,viajes:0,vd:0,vn:0};
    const c=grid[v.destino][v.fecha];
    c.m3+=v.m3;c.viajes+=v.cant;
    if(v.noche)c.vn+=v.cant;else c.vd+=v.cant;
  });
  // semana anterior por destino (para Δ%)
  const prevDest={};let prevTotalM3=0;
  vsPrev.forEach(function(v){prevDest[v.destino]=(prevDest[v.destino]||0)+(modoViajes?v.cant:v.m3);prevTotalM3+=(modoViajes?v.cant:v.m3);});

  const destinos=Object.keys(grid).sort(function(a,b){
    const tA=Object.values(grid[a]).reduce((s,c)=>s+c.m3,0);
    const tB=Object.values(grid[b]).reduce((s,c)=>s+c.m3,0);
    return tB-tA;
  });

  // Totales
  const totDia={};let totalM3=0,totalViajes=0,totalVd=0,totalVn=0,maxCelda=0;
  fechas.forEach(f=>{totDia[f.iso]={m3:0,viajes:0,vd:0,vn:0};});
  destinos.forEach(dst=>fechas.forEach(f=>{
    const c=grid[dst][f.iso];if(!c)return;
    const t=totDia[f.iso];
    t.m3+=c.m3;t.viajes+=c.viajes;t.vd+=c.vd;t.vn+=c.vn;
    totalM3+=c.m3;totalViajes+=c.viajes;totalVd+=c.vd;totalVn+=c.vn;
    if(c.m3>maxCelda)maxCelda=c.m3;
  }));

  // Meta y proyección (solo tab volumen)
  let metaHtml='';
  if(!modoViajes&&_amtMetaSem>0){
    const pct=Math.min(100,totalM3/_amtMetaSem*100);
    let transc=0;
    fechas.forEach(f=>{if(f.iso<=hoy)transc++;});
    const proy=transc>0&&transc<7?totalM3/transc*7:totalM3;
    const proyPct=_amtMetaSem?proy/_amtMetaSem*100:0;
    const col=pct>=100?'#10b981':pct>=70?'#f59e0b':'#ef4444';
    metaHtml=`<div style="margin-bottom:.9rem;padding:.65rem .9rem;background:var(--panel2);border:2px solid ${col}55;border-left:4px solid ${col};border-radius:9px">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:.5rem;margin-bottom:.4rem">
        <span style="font-size:.68rem;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:var(--muted2)">🎯 Meta semanal: <span style="color:var(--text)">${_amtFmt1(_amtMetaSem)} m³</span></span>
        <span style="font-size:.78rem;font-weight:900;color:${col};font-family:monospace">${_amtFmt1(totalM3)} m³ · ${pct.toFixed(1)}%</span>
        ${transc>0&&transc<7?`<span style="font-size:.66rem;color:var(--muted2)">Proyección al cierre: <b style="color:${proyPct>=100?'#10b981':'#f59e0b'};font-family:monospace">${_amtFmt1(proy)} m³ (${proyPct.toFixed(0)}%)</b> · ritmo de ${transc} día(s)</span>`:''}
      </div>
      <div style="background:var(--border);border-radius:5px;height:10px;overflow:hidden"><div style="height:100%;width:${pct}%;background:${col};border-radius:5px;transition:.5s"></div></div>
    </div>`;
  }

  // Filas
  const filas=destinos.map(function(dst,i){
    const col=_AMT_COLORES[i%_AMT_COLORES.length];
    let totFila=0,totV=0,totVd=0,totVn=0;
    const celdas=fechas.map(function(f){
      const c=grid[dst][f.iso];
      const esHoy=f.iso===hoy;
      if(!c||!c.viajes)return`<td style="${TD};text-align:${modoViajes?'center':'right'};color:var(--muted);${esHoy?'background:rgba(245,158,11,.05);':''}">—</td>`;
      totFila+=c.m3;totV+=c.viajes;totVd+=c.vd;totVn+=c.vn;
      const ttl=`${c.viajes} viaje(s) (☀ ${c.vd} · 🌙 ${c.vn}) · ${fmtM3(c.m3)} m³`;
      if(modoViajes){
        const bg=esHoy?'rgba(245,158,11,.08)':'rgba(59,130,246,.06)';
        return`<td style="${TD};text-align:center;font-family:monospace;background:${bg};line-height:1.5" title="${ttl}">
          ${c.vd?`<span style="color:#f59e0b;font-weight:700">☀ ${c.vd.toLocaleString()}</span>`:''}${c.vd&&c.vn?'<br>':''}${c.vn?`<span style="color:#60a5fa;font-weight:700">🌙 ${c.vn.toLocaleString()}</span>`:''}
        </td>`;
      }
      const bg=esHoy?'rgba(245,158,11,.10)':_amtHeat(c.m3,maxCelda);
      return`<td style="${TD};text-align:right;font-family:monospace;font-weight:700;color:var(--text);background:${bg}" title="${ttl}">${fmtM3(c.m3)}</td>`;
    }).join('');
    const curTot=modoViajes?totV:totFila;
    const delta=_amtDelta(curTot,prevDest[dst]||0);
    const totCell=modoViajes
      ?`<td style="${TD};text-align:right;font-family:monospace;font-weight:900;color:#3b82f6;background:rgba(59,130,246,.08)">${totV.toLocaleString()} v ${delta}<div style="font-size:.58rem;font-weight:400"><span style="color:#f59e0b">☀ ${totVd.toLocaleString()}</span> · <span style="color:#60a5fa">🌙 ${totVn.toLocaleString()}</span></div></td>`
      :`<td style="${TD};text-align:right;font-family:monospace;font-weight:900;color:#f59e0b;background:rgba(245,158,11,.07)">${fmtM3(totFila)} ${delta}<div style="font-size:.58rem;color:var(--muted2);font-weight:400">${totV.toLocaleString()} viajes</div></td>`;
    return`<tr>
      <td style="${TD};font-weight:700;color:${col};white-space:nowrap"><span style="display:inline-block;width:9px;height:9px;border-radius:2px;background:${col};margin-right:.4rem"></span>${dst}</td>
      ${celdas}${totCell}
    </tr>`;
  }).join('');

  const footDias=fechas.map(function(f){
    const t=totDia[f.iso];
    if(modoViajes){
      if(!t.viajes)return`<td style="${TD};text-align:center;color:var(--muted)">—</td>`;
      return`<td style="${TD};text-align:center;font-family:monospace;font-weight:900;color:#3b82f6;line-height:1.5">${t.viajes.toLocaleString()} v<div style="font-size:.56rem;font-weight:400"><span style="color:#f59e0b">☀ ${t.vd.toLocaleString()}</span> · <span style="color:#60a5fa">🌙 ${t.vn.toLocaleString()}</span></div></td>`;
    }
    return`<td style="${TD};text-align:right;font-family:monospace;font-weight:900;color:${t.m3?'var(--ctl)':'var(--muted)'}">${t.m3?fmtM3(t.m3):'—'}</td>`;
  }).join('');

  // KPIs
  const kpis=modoViajes
    ?_amtKpi('Viajes de la Semana','<b style="font-size:1.3rem">'+totalViajes.toLocaleString()+'</b> '+_amtDelta(totalViajes,prevTotalM3),'#3b82f6')
      +_amtKpi('Viajes Turno Día ☀','<b style="font-size:1.3rem">'+totalVd.toLocaleString()+'</b>','#f59e0b')
      +_amtKpi('Viajes Turno Noche 🌙','<b style="font-size:1.3rem">'+totalVn.toLocaleString()+'</b>','#3b82f6')
      +_amtKpi('Promedio viajes/día','<b style="font-size:1.3rem">'+(totalViajes?(totalViajes/7).toFixed(1):'—')+'</b>','#8b5cf6')
    :_amtKpi('m³ de la Semana','<b style="font-size:1.3rem">'+fmtM3(totalM3)+'</b> '+_amtDelta(totalM3,prevTotalM3),'var(--ctl)')
      +_amtKpi('Viajes de la Semana','<b style="font-size:1.3rem">'+totalViajes.toLocaleString()+'</b>','#3b82f6')
      +_amtKpi('Destinos Activos','<b style="font-size:1.3rem">'+destinos.length+'</b>','#8b5cf6')
      +_amtKpi('Promedio m³/día','<b style="font-size:1.3rem">'+(totalM3?fmtM3(totalM3/7):'—')+'</b>','#f59e0b');

  // Datos de exportación
  _amtSemExportData={
    name:(modoViajes?'viajes':'volumen')+'_semanal_'+fIni+'.xlsx',
    aoa:[
      [(modoViajes?'VIAJES':'VOLUMEN (m³)')+' SEMANAL — '+rango],
      ['Frente / Destino',...fechas.map(f=>f.lbl+' '+f.dm),'Total','Viajes ☀','Viajes 🌙'],
      ...destinos.map(dst=>{
        let tV=0,tM=0,tD=0,tN=0;
        const vals=fechas.map(f=>{
          const c=grid[dst][f.iso];if(!c)return'';
          tV+=c.viajes;tM+=c.m3;tD+=c.vd;tN+=c.vn;
          return modoViajes?c.viajes:+c.m3.toFixed(1);
        });
        return[dst,...vals,modoViajes?tV:+tM.toFixed(1),tD,tN];
      }),
      ['TOTAL',...fechas.map(f=>modoViajes?totDia[f.iso].viajes:+totDia[f.iso].m3.toFixed(1)),modoViajes?totalViajes:+totalM3.toFixed(1),totalVd,totalVn]
    ]
  };

  body.innerHTML=_amtSemBar({rango,meta:!modoViajes})+`
  <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:.6rem;margin-bottom:.9rem">${kpis}</div>
  ${metaHtml}
  ${!modoViajes&&destinos.length?`<div class="card" style="margin-bottom:.9rem"><div class="card-body" style="height:230px;position:relative;padding:.7rem"><canvas id="amtSemChart"></canvas></div></div>`:''}
  <div class="card" style="padding:0">
    <div class="tbl-wrap">
    <table style="min-width:100%;border-collapse:collapse">
      <thead>
        <tr style="background:var(--panel2)">
          <th style="${TH};text-align:left;min-width:170px">Frente / Destino</th>
          ${fechas.map(f=>{
            const esHoy=f.iso===hoy;
            return`<th style="${TH};text-align:center;min-width:80px;${esHoy?'color:#f59e0b;background:rgba(245,158,11,.1)':''}">${f.lbl}<div style="font-size:.68rem;font-weight:400;font-family:monospace">${f.dm}</div></th>`;
          }).join('')}
          <th style="${TH};text-align:right;min-width:105px;color:#f59e0b;background:rgba(245,158,11,.08)">Total Semana<div style="font-size:.55rem;font-weight:400">vs sem. anterior</div></th>
        </tr>
      </thead>
      <tbody>${filas||`<tr><td colspan="9" style="text-align:center;padding:2.5rem;color:var(--muted2);font-size:.85rem">Sin viajes registrados en esta semana (${rango})</td></tr>`}</tbody>
      ${destinos.length?`<tfoot>
        <tr style="background:var(--panel2);border-top:2px solid var(--border)">
          <td style="${TD};font-size:.65rem;font-weight:700;color:var(--muted2);text-transform:uppercase;letter-spacing:.07em">TOTAL DÍA ${modoViajes?'(viajes)':'(m³)'}</td>
          ${footDias}
          ${modoViajes
            ?`<td style="${TD};text-align:right;font-family:monospace;font-weight:900;font-size:.85rem;color:#3b82f6;background:rgba(59,130,246,.1)">${totalViajes.toLocaleString()} v<div style="font-size:.58rem;font-weight:400"><span style="color:#f59e0b">☀ ${totalVd.toLocaleString()}</span> · <span style="color:#60a5fa">🌙 ${totalVn.toLocaleString()}</span></div></td>`
            :`<td style="${TD};text-align:right;font-family:monospace;font-weight:900;font-size:.85rem;color:#f59e0b;background:rgba(245,158,11,.1)">${fmtM3(totalM3)}</td>`}
        </tr>
      </tfoot>`:''}
    </table>
    </div>
  </div>
  <div style="margin-top:.5rem;font-size:.64rem;color:var(--muted2)">${modoViajes
    ?'Viajes por turno: <span style="color:#f59e0b">☀ Turno Día</span> · <span style="color:#60a5fa">🌙 Turno Noche</span> (según el turno del parte diario)'
    :'Valores en m³ = viajes × '+_amtCapM3+' m³/viaje (configurable arriba) · Fondo más intenso = mayor volumen'} · ▲▼ compara con la semana anterior · Columna resaltada = hoy</div>`;

  // Gráfico apilado por destino (solo tab volumen)
  if(!modoViajes&&destinos.length&&typeof Chart!=='undefined'){
    if(_amtSemChart){_amtSemChart.destroy();_amtSemChart=null;}
    const ctx=document.getElementById('amtSemChart');
    if(ctx){
      _amtSemChart=new Chart(ctx,{
        type:'bar',
        data:{
          labels:fechas.map(f=>f.lbl+' '+f.dm),
          datasets:destinos.map((dst,i)=>({
            label:dst,
            data:fechas.map(f=>+((grid[dst][f.iso]||{m3:0}).m3).toFixed(1)),
            backgroundColor:_AMT_COLORES[i%_AMT_COLORES.length]+'CC',
            borderRadius:2,stack:'s'
          }))
        },
        options:{
          responsive:true,maintainAspectRatio:false,
          plugins:{
            legend:{position:'bottom',labels:{color:'#8b93a7',font:{size:9},boxWidth:10}},
            tooltip:{callbacks:{label:c=>c.dataset.label+': '+c.parsed.y.toLocaleString('es-PE')+' m³'}},
            title:{display:true,text:'m³ por día y destino',color:'#8b93a7',font:{size:11}}
          },
          scales:{
            x:{stacked:true,ticks:{color:'#8b93a7',font:{size:9}},grid:{display:false}},
            y:{stacked:true,ticks:{color:'#8b93a7',font:{size:9}},grid:{color:'rgba(139,147,167,.12)'},beginAtZero:true}
          }
        }
      });
    }
  }
}

// ── TAB 5: VIAJES POR EQUIPO (volquete × día, turnos ☀/🌙 + combustible) ─────
function _amtRenderSemEquipos(body){
  const info=_amtSemInfo();
  const{fechas,fIni,fFin,rango}=info;
  const hoy=today();
  const TH=_AMT_TH,TD=_AMT_TD;
  const vs=_amtSemViajes(fIni,fFin).filter(v=>v.eqId);

  // grid[eqId][iso]={viajes,vd,vn,m3}
  const grid={};
  vs.forEach(function(v){
    if(!grid[v.eqId])grid[v.eqId]={};
    if(!grid[v.eqId][v.fecha])grid[v.eqId][v.fecha]={viajes:0,vd:0,vn:0,m3:0};
    const c=grid[v.eqId][v.fecha];
    c.viajes+=v.cant;c.m3+=v.m3;
    if(v.noche)c.vn+=v.cant;else c.vd+=v.cant;
  });

  // Combustible despachado por equipo en la semana
  const galEq={};
  (DB.combustible||[]).forEach(function(c){
    if(c.tipoMov==='Ingreso'||!c.eqId)return;
    if(!c.fecha||c.fecha<fIni||c.fecha>fFin)return;
    galEq[c.eqId]=(galEq[c.eqId]||0)+(+c.gal||0);
  });

  const rows=Object.keys(grid).map(function(id){
    const eq=(DB.equipos||[]).find(e=>e.id==id);
    let viajes=0,vd=0,vn=0,m3=0;const dias=new Set();
    Object.entries(grid[id]).forEach(([f,c])=>{viajes+=c.viajes;vd+=c.vd;vn+=c.vn;m3+=c.m3;if(c.viajes)dias.add(f);});
    const gal=galEq[id]||0;
    return{id,eq,viajes,vd,vn,m3,dias:dias.size,prom:dias.size?viajes/dias.size:0,gal,galM3:m3>0&&gal>0?gal/m3:null};
  }).sort((a,b)=>b.viajes-a.viajes);

  const totalViajes=rows.reduce((s,r)=>s+r.viajes,0);
  const totalVd=rows.reduce((s,r)=>s+r.vd,0);
  const totalVn=rows.reduce((s,r)=>s+r.vn,0);
  const totalM3=rows.reduce((s,r)=>s+r.m3,0);
  const mejor=rows[0];
  const medalla=i=>i===0?'🥇':i===1?'🥈':i===2?'🥉':(i+1);

  const filas=rows.map(function(r,i){
    const celdas=fechas.map(function(f){
      const c=grid[r.id][f.iso];
      const esHoy=f.iso===hoy;
      if(!c||!c.viajes)return`<td style="${TD};text-align:center;color:var(--muted);${esHoy?'background:rgba(245,158,11,.05);':''}">—</td>`;
      return`<td style="${TD};text-align:center;font-family:monospace;background:${esHoy?'rgba(245,158,11,.08)':'rgba(59,130,246,.06)'};line-height:1.5" title="${c.viajes} viaje(s) · ${_amtFmt1(c.m3)} m³">
        ${c.vd?`<span style="color:#f59e0b;font-weight:700">☀ ${c.vd.toLocaleString()}</span>`:''}${c.vd&&c.vn?'<br>':''}${c.vn?`<span style="color:#60a5fa;font-weight:700">🌙 ${c.vn.toLocaleString()}</span>`:''}
      </td>`;
    }).join('');
    const promCol=r.prom>=10?'#10b981':r.prom>=6?'#f59e0b':'#ef4444';
    return`<tr ${i===rows.length-1&&rows.length>3?'style="background:rgba(239,68,68,.04)"':''}>
      <td style="${TD};text-align:center;font-size:.8rem">${medalla(i)}</td>
      <td style="${TD};white-space:nowrap">
        <span class="mono" style="font-weight:700;color:#06b6d4;cursor:pointer;text-decoration:underline dotted;text-underline-offset:3px" ondblclick="editEquipo(${r.id})" title="Doble click: editar en Master">${r.eq?r.eq.codigo:'#'+r.id}</span>
        <div style="font-size:.62rem;color:var(--muted2)">${r.eq?((r.eq.marca||'')+' '+(r.eq.sub||'')):''}</div>
      </td>
      ${celdas}
      <td style="${TD};text-align:right;font-family:monospace;font-weight:900;color:#3b82f6;background:rgba(59,130,246,.08)">${r.viajes.toLocaleString()} v<div style="font-size:.58rem;font-weight:400"><span style="color:#f59e0b">☀ ${r.vd.toLocaleString()}</span> · <span style="color:#60a5fa">🌙 ${r.vn.toLocaleString()}</span></div></td>
      <td style="${TD};text-align:right;font-family:monospace;font-weight:700;color:var(--ctl)">${_amtFmt1(r.m3)}</td>
      <td style="${TD};text-align:center;font-family:monospace">${r.dias}</td>
      <td style="${TD};text-align:right;font-family:monospace;font-weight:900;color:${promCol}">${r.prom.toFixed(1)}</td>
      <td style="${TD};text-align:right;font-family:monospace;color:#f97316">${r.gal?_amtFmt1(r.gal):'—'}</td>
      <td style="${TD};text-align:right;font-family:monospace;font-weight:700;color:${r.galM3===null?'var(--muted)':r.galM3>0.5?'#ef4444':r.galM3>0.3?'#f59e0b':'#10b981'}">${r.galM3!==null?r.galM3.toFixed(3):'—'}</td>
    </tr>`;
  }).join('');

  _amtSemExportData={
    name:'viajes_por_equipo_'+fIni+'.xlsx',
    aoa:[
      ['VIAJES POR EQUIPO — '+rango],
      ['Equipo',...fechas.map(f=>f.lbl+' '+f.dm),'Viajes','☀ Día','🌙 Noche','m³','Días trab.','Prom v/día','Galones','gal/m³'],
      ...rows.map(r=>[
        r.eq?r.eq.codigo:('#'+r.id),
        ...fechas.map(f=>{const c=grid[r.id][f.iso];return c?c.viajes:'';}),
        r.viajes,r.vd,r.vn,+r.m3.toFixed(1),r.dias,+r.prom.toFixed(1),+r.gal.toFixed(1),r.galM3!==null?+r.galM3.toFixed(3):''
      ])
    ]
  };

  body.innerHTML=_amtSemBar({rango})+`
  <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:.6rem;margin-bottom:.9rem">
    ${_amtKpi('Equipos con Viajes','<b style="font-size:1.3rem">'+rows.length+'</b>','#06b6d4')}
    ${_amtKpi('Viajes de la Semana','<b style="font-size:1.3rem">'+totalViajes.toLocaleString()+'</b> <span style="font-size:.68rem;font-weight:700"><span style="color:#b45309">☀ '+totalVd.toLocaleString()+'</span> · <span style="color:#1d4ed8">🌙 '+totalVn.toLocaleString()+'</span></span>','#3b82f6')}
    ${_amtKpi('Mejor Equipo 🥇',mejor?'<b style="font-size:1.05rem">'+(mejor.eq?mejor.eq.codigo:'#'+mejor.id)+'</b> <span style="font-size:.72rem">'+mejor.viajes.toLocaleString()+' viajes</span>':'—','#10b981')}
    ${_amtKpi('Prom. viajes/equipo-día','<b style="font-size:1.3rem">'+(rows.length?(rows.reduce((s,r)=>s+r.prom,0)/rows.length).toFixed(1):'—')+'</b>','#f59e0b')}
  </div>
  <div class="card" style="padding:0">
    <div class="tbl-wrap">
    <table style="min-width:100%;border-collapse:collapse">
      <thead><tr style="background:var(--panel2)">
        <th style="${TH};text-align:center;min-width:34px">#</th>
        <th style="${TH};text-align:left;min-width:130px">Equipo</th>
        ${fechas.map(f=>{const esHoy=f.iso===hoy;return`<th style="${TH};text-align:center;min-width:72px;${esHoy?'color:#f59e0b;background:rgba(245,158,11,.1)':''}">${f.lbl}<div style="font-size:.68rem;font-weight:400;font-family:monospace">${f.dm}</div></th>`;}).join('')}
        <th style="${TH};text-align:right;min-width:90px;color:#3b82f6;background:rgba(59,130,246,.08)">Total ☀/🌙</th>
        <th style="${TH};text-align:right">m³</th>
        <th style="${TH};text-align:center">Días</th>
        <th style="${TH};text-align:right" title="Promedio de viajes por día trabajado">Prom v/día</th>
        <th style="${TH};text-align:right;color:#f97316">⛽ Gal</th>
        <th style="${TH};text-align:right" title="Galones de combustible por m³ transportado — menor es mejor">gal/m³</th>
      </tr></thead>
      <tbody>${filas||`<tr><td colspan="15" style="text-align:center;padding:2.5rem;color:var(--muted2);font-size:.85rem">Sin viajes de volquetes en esta semana (${rango})</td></tr>`}</tbody>
      ${rows.length?`<tfoot><tr style="background:var(--panel2);border-top:2px solid var(--border)">
        <td colspan="2" style="${TD};font-size:.65rem;font-weight:700;color:var(--muted2);text-transform:uppercase">TOTAL</td>
        ${fechas.map(f=>{
          let v=0,d=0,n=0;rows.forEach(r=>{const c=grid[r.id][f.iso];if(c){v+=c.viajes;d+=c.vd;n+=c.vn;}});
          return`<td style="${TD};text-align:center;font-family:monospace;font-weight:900;color:${v?'#3b82f6':'var(--muted)'};line-height:1.5">${v?v.toLocaleString()+' v':'—'}${v?`<div style="font-size:.56rem;font-weight:400"><span style="color:#f59e0b">☀ ${d.toLocaleString()}</span> · <span style="color:#60a5fa">🌙 ${n.toLocaleString()}</span></div>`:''}</td>`;
        }).join('')}
        <td style="${TD};text-align:right;font-family:monospace;font-weight:900;color:#3b82f6;background:rgba(59,130,246,.1)">${totalViajes.toLocaleString()} v</td>
        <td style="${TD};text-align:right;font-family:monospace;font-weight:900;color:var(--ctl)">${_amtFmt1(totalM3)}</td>
        <td colspan="4"></td>
      </tr></tfoot>`:''}
    </table>
    </div>
  </div>
  <div style="margin-top:.5rem;font-size:.64rem;color:var(--muted2)">🥇🥈🥉 = ranking por viajes de la semana · Prom v/día = viajes ÷ días trabajados (verde ≥10, ámbar ≥6, rojo &lt;6) · gal/m³ = combustible despachado ÷ m³ transportado (menor es mejor) · Doble click en el código abre el Master</div>`;
}

// ── TAB 6: VIAJES POR OPERADOR ────────────────────────────────────────────────
function _amtRenderSemOperadores(body){
  const info=_amtSemInfo();
  const{fechas,fIni,fFin,rango}=info;
  const hoy=today();
  const TH=_AMT_TH,TD=_AMT_TD;
  const vs=_amtSemViajes(fIni,fFin).filter(v=>v.op);

  const grid={};
  vs.forEach(function(v){
    if(!grid[v.op])grid[v.op]={};
    if(!grid[v.op][v.fecha])grid[v.op][v.fecha]={viajes:0,vd:0,vn:0,m3:0};
    const c=grid[v.op][v.fecha];
    c.viajes+=v.cant;c.m3+=v.m3;
    if(v.noche)c.vn+=v.cant;else c.vd+=v.cant;
  });

  const rows=Object.keys(grid).map(function(op){
    let viajes=0,vd=0,vn=0,m3=0;const dias=new Set();
    Object.entries(grid[op]).forEach(([f,c])=>{viajes+=c.viajes;vd+=c.vd;vn+=c.vn;m3+=c.m3;if(c.viajes)dias.add(f);});
    return{op,viajes,vd,vn,m3,dias:dias.size,prom:dias.size?viajes/dias.size:0};
  }).sort((a,b)=>b.viajes-a.viajes);

  const totalViajes=rows.reduce((s,r)=>s+r.viajes,0);
  const totalVd=rows.reduce((s,r)=>s+r.vd,0);
  const totalVn=rows.reduce((s,r)=>s+r.vn,0);
  const mejor=rows[0];
  const medalla=i=>i===0?'🥇':i===1?'🥈':i===2?'🥉':(i+1);

  const filas=rows.map(function(r,i){
    const celdas=fechas.map(function(f){
      const c=grid[r.op][f.iso];
      const esHoy=f.iso===hoy;
      if(!c||!c.viajes)return`<td style="${TD};text-align:center;color:var(--muted);${esHoy?'background:rgba(245,158,11,.05);':''}">—</td>`;
      return`<td style="${TD};text-align:center;font-family:monospace;background:${esHoy?'rgba(245,158,11,.08)':'rgba(139,92,246,.07)'};line-height:1.5" title="${c.viajes} viaje(s) · ${_amtFmt1(c.m3)} m³">
        ${c.vd?`<span style="color:#f59e0b;font-weight:700">☀ ${c.vd.toLocaleString()}</span>`:''}${c.vd&&c.vn?'<br>':''}${c.vn?`<span style="color:#60a5fa;font-weight:700">🌙 ${c.vn.toLocaleString()}</span>`:''}
      </td>`;
    }).join('');
    const promCol=r.prom>=10?'#10b981':r.prom>=6?'#f59e0b':'#ef4444';
    return`<tr>
      <td style="${TD};text-align:center;font-size:.8rem">${medalla(i)}</td>
      <td style="${TD};font-weight:700;white-space:nowrap;color:#a78bfa">${r.op}</td>
      ${celdas}
      <td style="${TD};text-align:right;font-family:monospace;font-weight:900;color:#8b5cf6;background:rgba(139,92,246,.08)">${r.viajes.toLocaleString()} v<div style="font-size:.58rem;font-weight:400"><span style="color:#f59e0b">☀ ${r.vd.toLocaleString()}</span> · <span style="color:#60a5fa">🌙 ${r.vn.toLocaleString()}</span></div></td>
      <td style="${TD};text-align:right;font-family:monospace;color:var(--ctl)">${_amtFmt1(r.m3)}</td>
      <td style="${TD};text-align:center;font-family:monospace">${r.dias}</td>
      <td style="${TD};text-align:right;font-family:monospace;font-weight:900;color:${promCol}">${r.prom.toFixed(1)}</td>
    </tr>`;
  }).join('');

  _amtSemExportData={
    name:'viajes_por_operador_'+fIni+'.xlsx',
    aoa:[
      ['VIAJES POR OPERADOR — '+rango],
      ['Operador',...fechas.map(f=>f.lbl+' '+f.dm),'Viajes','☀ Día','🌙 Noche','m³','Días trab.','Prom v/día'],
      ...rows.map(r=>[r.op,...fechas.map(f=>{const c=grid[r.op][f.iso];return c?c.viajes:'';}),r.viajes,r.vd,r.vn,+r.m3.toFixed(1),r.dias,+r.prom.toFixed(1)])
    ]
  };

  body.innerHTML=_amtSemBar({rango})+`
  <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:.6rem;margin-bottom:.9rem">
    ${_amtKpi('Operadores con Viajes','<b style="font-size:1.3rem">'+rows.length+'</b>','#8b5cf6')}
    ${_amtKpi('Viajes de la Semana','<b style="font-size:1.3rem">'+totalViajes.toLocaleString()+'</b> <span style="font-size:.68rem;font-weight:700"><span style="color:#b45309">☀ '+totalVd.toLocaleString()+'</span> · <span style="color:#1d4ed8">🌙 '+totalVn.toLocaleString()+'</span></span>','#3b82f6')}
    ${_amtKpi('Mejor Operador 🥇',mejor?'<b style="font-size:.92rem">'+mejor.op+'</b> <span style="font-size:.72rem">'+mejor.viajes.toLocaleString()+' viajes</span>':'—','#10b981')}
    ${_amtKpi('Prom. viajes/operador-día','<b style="font-size:1.3rem">'+(rows.length?(rows.reduce((s,r)=>s+r.prom,0)/rows.length).toFixed(1):'—')+'</b>','#f59e0b')}
  </div>
  <div class="card" style="padding:0">
    <div class="tbl-wrap">
    <table style="min-width:100%;border-collapse:collapse">
      <thead><tr style="background:var(--panel2)">
        <th style="${TH};text-align:center;min-width:34px">#</th>
        <th style="${TH};text-align:left;min-width:170px">Operador</th>
        ${fechas.map(f=>{const esHoy=f.iso===hoy;return`<th style="${TH};text-align:center;min-width:72px;${esHoy?'color:#f59e0b;background:rgba(245,158,11,.1)':''}">${f.lbl}<div style="font-size:.68rem;font-weight:400;font-family:monospace">${f.dm}</div></th>`;}).join('')}
        <th style="${TH};text-align:right;min-width:90px;color:#8b5cf6;background:rgba(139,92,246,.08)">Total ☀/🌙</th>
        <th style="${TH};text-align:right">m³</th>
        <th style="${TH};text-align:center">Días</th>
        <th style="${TH};text-align:right" title="Promedio de viajes por día trabajado">Prom v/día</th>
      </tr></thead>
      <tbody>${filas||`<tr><td colspan="13" style="text-align:center;padding:2.5rem;color:var(--muted2);font-size:.85rem">Sin viajes con operador registrado en esta semana (${rango})</td></tr>`}</tbody>
    </table>
    </div>
  </div>
  <div style="margin-top:.5rem;font-size:.64rem;color:var(--muted2)">🥇🥈🥉 = ranking por viajes de la semana · Prom v/día = viajes ÷ días trabajados (verde ≥10, ámbar ≥6, rojo &lt;6)</div>`;
}

// ── TAB 7: MATRIZ TRAMO → DESTINO (m³ de la semana) ──────────────────────────
function _amtRenderSemMatriz(body){
  const info=_amtSemInfo();
  const{fIni,fFin,rango}=info;
  const TH=_AMT_TH,TD=_AMT_TD;
  const vs=_amtSemViajes(fIni,fFin).filter(v=>v.tramoId&&v.destino);

  // matriz[tramoId][destino]={m3,viajes}
  const matriz={};const destSet=new Set();
  vs.forEach(function(v){
    if(!matriz[v.tramoId])matriz[v.tramoId]={};
    if(!matriz[v.tramoId][v.destino])matriz[v.tramoId][v.destino]={m3:0,viajes:0};
    matriz[v.tramoId][v.destino].m3+=v.m3;
    matriz[v.tramoId][v.destino].viajes+=v.cant;
    destSet.add(v.destino);
  });

  // Ordenar destinos por volumen total y tramos por volumen total
  const totDest={};
  destSet.forEach(d=>{totDest[d]=0;});
  Object.values(matriz).forEach(row=>Object.entries(row).forEach(([d,c])=>{totDest[d]+=c.m3;}));
  const destinos=[...destSet].sort((a,b)=>totDest[b]-totDest[a]);
  const tramoIds=Object.keys(matriz).sort((a,b)=>{
    const tA=Object.values(matriz[a]).reduce((s,c)=>s+c.m3,0);
    const tB=Object.values(matriz[b]).reduce((s,c)=>s+c.m3,0);
    return tB-tA;
  });
  let maxCelda=0,totalM3=0,totalViajes=0;
  tramoIds.forEach(t=>destinos.forEach(d=>{
    const c=matriz[t][d];if(!c)return;
    if(c.m3>maxCelda)maxCelda=c.m3;
    totalM3+=c.m3;totalViajes+=c.viajes;
  }));
  const tramoLbl=id=>{const tr=(DB.tramos||[]).find(t=>t.id==id);return tr?(tr.codigo||('#'+id)):('#'+id);};

  const filas=tramoIds.map(function(tid){
    let totFila=0,totV=0;
    const celdas=destinos.map(function(d){
      const c=matriz[tid][d];
      if(!c||!c.m3)return`<td style="${TD};text-align:right;color:var(--muted)">—</td>`;
      totFila+=c.m3;totV+=c.viajes;
      return`<td style="${TD};text-align:right;font-family:monospace;font-weight:700;background:${_amtHeat(c.m3,maxCelda)}" title="${c.viajes} viaje(s)">${_amtFmt1(c.m3)}</td>`;
    }).join('');
    return`<tr>
      <td style="${TD};font-weight:700;color:#06b6d4;white-space:nowrap">${tramoLbl(tid)}</td>
      ${celdas}
      <td style="${TD};text-align:right;font-family:monospace;font-weight:900;color:#f59e0b;background:rgba(245,158,11,.07)">${_amtFmt1(totFila)}<div style="font-size:.58rem;color:var(--muted2);font-weight:400">${totV.toLocaleString()} viajes</div></td>
    </tr>`;
  }).join('');

  _amtSemExportData={
    name:'matriz_tramo_destino_'+fIni+'.xlsx',
    aoa:[
      ['MATRIZ TRAMO → DESTINO (m³) — '+rango],
      ['Tramo',...destinos,'Total'],
      ...tramoIds.map(tid=>{
        let tot=0;
        const vals=destinos.map(d=>{const c=matriz[tid][d];if(!c)return'';tot+=c.m3;return +c.m3.toFixed(1);});
        return[tramoLbl(tid),...vals,+tot.toFixed(1)];
      }),
      ['TOTAL',...destinos.map(d=>+totDest[d].toFixed(1)),+totalM3.toFixed(1)]
    ]
  };

  body.innerHTML=_amtSemBar({rango})+`
  <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:.6rem;margin-bottom:.9rem">
    ${_amtKpi('m³ de la Semana','<b style="font-size:1.3rem">'+_amtFmt1(totalM3)+'</b>','var(--ctl)')}
    ${_amtKpi('Viajes','<b style="font-size:1.3rem">'+totalViajes.toLocaleString()+'</b>','#3b82f6')}
    ${_amtKpi('Tramos Activos','<b style="font-size:1.3rem">'+tramoIds.length+'</b>','#06b6d4')}
    ${_amtKpi('Destinos Alimentados','<b style="font-size:1.3rem">'+destinos.length+'</b>','#8b5cf6')}
  </div>
  <div class="card" style="padding:0">
    <div class="tbl-wrap">
    <table style="min-width:100%;border-collapse:collapse">
      <thead><tr style="background:var(--panel2)">
        <th style="${TH};text-align:left;min-width:110px">Tramo ↓ / Destino →</th>
        ${destinos.map(d=>`<th style="${TH};text-align:right;min-width:95px">${d}</th>`).join('')}
        <th style="${TH};text-align:right;min-width:95px;color:#f59e0b;background:rgba(245,158,11,.08)">Total Tramo</th>
      </tr></thead>
      <tbody>${filas||`<tr><td colspan="${destinos.length+2}" style="text-align:center;padding:2.5rem;color:var(--muted2);font-size:.85rem">Sin viajes con tramo y destino en esta semana (${rango})</td></tr>`}</tbody>
      ${tramoIds.length?`<tfoot><tr style="background:var(--panel2);border-top:2px solid var(--border)">
        <td style="${TD};font-size:.65rem;font-weight:700;color:var(--muted2);text-transform:uppercase">TOTAL DESTINO</td>
        ${destinos.map(d=>`<td style="${TD};text-align:right;font-family:monospace;font-weight:900;color:var(--ctl)">${_amtFmt1(totDest[d])}</td>`).join('')}
        <td style="${TD};text-align:right;font-family:monospace;font-weight:900;font-size:.85rem;color:#f59e0b;background:rgba(245,158,11,.1)">${_amtFmt1(totalM3)}</td>
      </tr></tfoot>`:''}
    </table>
    </div>
  </div>
  <div style="margin-top:.5rem;font-size:.64rem;color:var(--muted2)">Cada celda = m³ que el tramo (fila) aportó al destino (columna) en la semana · Fondo más intenso = mayor volumen · Valores = viajes × ${_amtCapM3} m³/viaje</div>`;
}

// ── TAB 8: ORIGEN → DESTINO (viajes que salen de cada frente, con material) ──
function _amtRenderSemOrigen(body){
  const info=_amtSemInfo();
  const{fIni,fFin,rango}=info;
  const TH=_AMT_TH,TD=_AMT_TD;
  // Origen: campo del viaje; si falta, se toma el inicio del tramo
  const tramoIni=id=>{const tr=(DB.tramos||[]).find(t=>t.id==id);return tr?(tr.inicio||tr.codigo||''):'';};
  const vs=_amtSemViajes(fIni,fFin).map(v=>({...v,ori:v.origen||tramoIni(v.tramoId)||'(sin origen)'}));

  // grupos[origen] = {m3,viajes,vd,vn, rutas:{destino||material:{destino,material,m3,viajes,vd,vn}}}
  const grupos={};
  vs.forEach(function(v){
    if(!grupos[v.ori])grupos[v.ori]={m3:0,viajes:0,vd:0,vn:0,rutas:{}};
    const g=grupos[v.ori];
    g.m3+=v.m3;g.viajes+=v.cant;
    if(v.noche)g.vn+=v.cant;else g.vd+=v.cant;
    const dst=v.destino||'(sin destino)';
    const mat=v.material||'(sin material)';
    const k=dst+'||'+mat;
    if(!g.rutas[k])g.rutas[k]={destino:dst,material:mat,m3:0,viajes:0,vd:0,vn:0};
    const r=g.rutas[k];
    r.m3+=v.m3;r.viajes+=v.cant;
    if(v.noche)r.vn+=v.cant;else r.vd+=v.cant;
  });

  const origenes=Object.keys(grupos).sort((a,b)=>grupos[b].m3-grupos[a].m3);
  const totalM3=origenes.reduce((s,o)=>s+grupos[o].m3,0);
  const totalViajes=origenes.reduce((s,o)=>s+grupos[o].viajes,0);
  const totalRutas=origenes.reduce((s,o)=>s+Object.keys(grupos[o].rutas).length,0);

  const filas=origenes.map(function(ori,i){
    const g=grupos[ori];
    const col=_AMT_COLORES[i%_AMT_COLORES.length];
    const pctG=totalM3?g.m3/totalM3*100:0;
    const rutas=Object.values(g.rutas).sort((a,b)=>b.m3-a.m3);
    const head=`<tr>
      <td colspan="7" style="padding:.5rem .7rem;background:${col}14;border:1px solid var(--border);border-left:4px solid ${col}">
        <div style="display:flex;align-items:center;gap:.8rem;flex-wrap:wrap">
          <span style="font-weight:900;color:${col};font-size:.82rem">📤 ${ori}</span>
          <span style="font-size:.68rem;color:var(--muted2)">${rutas.length} ruta(s)</span>
          <span style="margin-left:auto;font-family:monospace;font-size:.75rem"><b style="color:#3b82f6">${g.viajes.toLocaleString()} viajes</b> <span style="font-size:.64rem">(<span style="color:#f59e0b">☀ ${g.vd.toLocaleString()}</span> · <span style="color:#60a5fa">🌙 ${g.vn.toLocaleString()}</span>)</span> · <b style="color:var(--ctl)">${_amtFmt1(g.m3)} m³</b> · <span style="color:${col};font-weight:700">${pctG.toFixed(0)}% del total</span></span>
        </div>
      </td>
    </tr>`;
    const sub=rutas.map(function(r){
      const pct=g.m3?r.m3/g.m3*100:0;
      return`<tr>
        <td style="${TD};padding-left:1.6rem;color:var(--muted2);font-size:.7rem;white-space:nowrap">↳</td>
        <td style="${TD};font-weight:700;color:var(--text);white-space:nowrap">→ ${r.destino}</td>
        <td style="${TD};font-size:.7rem;color:#a78bfa;white-space:nowrap">${r.material}</td>
        <td style="${TD};text-align:right;font-family:monospace;font-weight:700;color:#3b82f6">${r.viajes.toLocaleString()}<span style="font-size:.6rem;color:var(--muted2)"> v</span></td>
        <td style="${TD};text-align:center;font-family:monospace;font-size:.68rem"><span style="color:#f59e0b">☀ ${r.vd.toLocaleString()}</span> · <span style="color:#60a5fa">🌙 ${r.vn.toLocaleString()}</span></td>
        <td style="${TD};text-align:right;font-family:monospace;font-weight:700;color:var(--ctl)">${_amtFmt1(r.m3)}</td>
        <td style="${TD};min-width:130px">
          <div style="display:flex;align-items:center;gap:.35rem">
            <div style="flex:1;background:var(--border);border-radius:3px;height:6px;overflow:hidden"><div style="height:100%;width:${pct.toFixed(0)}%;background:${col};border-radius:3px"></div></div>
            <span style="font-size:.62rem;color:${col};font-weight:700;min-width:32px;text-align:right">${pct.toFixed(0)}%</span>
          </div>
        </td>
      </tr>`;
    }).join('');
    return head+sub;
  }).join('');

  _amtSemExportData={
    name:'origen_destino_'+fIni+'.xlsx',
    aoa:[
      ['ORIGEN → DESTINO — '+rango],
      ['Origen','Destino','Material','Viajes','☀ Día','🌙 Noche','m³','% del origen'],
      ...origenes.flatMap(ori=>{
        const g=grupos[ori];
        return Object.values(g.rutas).sort((a,b)=>b.m3-a.m3).map(r=>[
          ori,r.destino,r.material,r.viajes,r.vd,r.vn,+r.m3.toFixed(1),g.m3?+(r.m3/g.m3*100).toFixed(0):0
        ]);
      }),
      ['TOTAL','','',totalViajes,'','',+totalM3.toFixed(1),'']
    ]
  };

  body.innerHTML=_amtSemBar({rango})+`
  <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:.6rem;margin-bottom:.9rem">
    ${_amtKpi('Orígenes / Frentes','<b style="font-size:1.3rem">'+origenes.length+'</b>','#f97316')}
    ${_amtKpi('Viajes de la Semana','<b style="font-size:1.3rem">'+totalViajes.toLocaleString()+'</b>','#3b82f6')}
    ${_amtKpi('m³ de la Semana','<b style="font-size:1.3rem">'+_amtFmt1(totalM3)+'</b>','var(--ctl)')}
    ${_amtKpi('Rutas Origen→Destino','<b style="font-size:1.3rem">'+totalRutas+'</b>','#8b5cf6')}
  </div>
  <div class="card" style="padding:0">
    <div class="tbl-wrap">
    <table style="min-width:100%;border-collapse:collapse">
      <thead><tr style="background:var(--panel2)">
        <th style="${TH};min-width:28px"></th>
        <th style="${TH};text-align:left;min-width:150px">Destino</th>
        <th style="${TH};text-align:left;min-width:130px">Material</th>
        <th style="${TH};text-align:right">Viajes</th>
        <th style="${TH};text-align:center">☀ / 🌙</th>
        <th style="${TH};text-align:right">m³</th>
        <th style="${TH};text-align:left">% del origen</th>
      </tr></thead>
      <tbody>${filas||`<tr><td colspan="7" style="text-align:center;padding:2.5rem;color:var(--muted2);font-size:.85rem">Sin viajes registrados en esta semana (${rango})</td></tr>`}</tbody>
      ${origenes.length?`<tfoot><tr style="background:var(--panel2);border-top:2px solid var(--border)">
        <td colspan="3" style="${TD};font-size:.65rem;font-weight:700;color:var(--muted2);text-transform:uppercase;text-align:right">TOTAL GENERAL</td>
        <td style="${TD};text-align:right;font-family:monospace;font-weight:900;color:#3b82f6">${totalViajes.toLocaleString()}</td>
        <td style="${TD}"></td>
        <td style="${TD};text-align:right;font-family:monospace;font-weight:900;color:var(--ctl)">${_amtFmt1(totalM3)}</td>
        <td style="${TD}"></td>
      </tr></tfoot>`:''}
    </table>
    </div>
  </div>
  <div style="margin-top:.5rem;font-size:.64rem;color:var(--muted2)">Agrupado por frente de origen del viaje (si el viaje no tiene origen, se toma el inicio del tramo) · Cada fila = ruta destino + material · % = participación dentro de su origen</div>`;
}
