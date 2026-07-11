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

// ── TAB 3: VOLUMEN SEMANAL (cuadro tipo Excel: destinos × 7 días) ─────────────
let _amtSemIni=null; // fecha del día 1 de la semana (puede ser cualquier día)
let _amtSemModo='m3'; // 'm3' = tab Volumen Semanal · 'viajes' = tab Viajes Semanal (por turno ☀/🌙)

function _amtSemDefault(){
  // Por defecto: lunes de la semana actual
  const h=new Date(today()+'T12:00:00');
  const dow=h.getDay(); // 0=Dom
  const lunes=new Date(h);
  lunes.setDate(h.getDate()-((dow+6)%7));
  return lunes.toISOString().slice(0,10);
}
function _amtSemNav(dias){
  const d=new Date((_amtSemIni||_amtSemDefault())+'T12:00:00');
  d.setDate(d.getDate()+dias);
  _amtSemIni=d.toISOString().slice(0,10);
  _amtRender();
}

function _amtRenderSemanal(body,modo){
  _amtSemModo=modo||'m3';
  if(!_amtSemIni)_amtSemIni=_amtSemDefault();
  const pad=n=>String(n).padStart(2,'0');
  const DN=['DOM','LUN','MAR','MIÉ','JUE','VIE','SÁB'];
  const hoy=today();

  // Las 7 fechas de la semana elegida
  const fechas=[];
  const d0=new Date(_amtSemIni+'T12:00:00');
  for(let i=0;i<7;i++){
    const d=new Date(d0);d.setDate(d0.getDate()+i);
    fechas.push({
      iso:`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`,
      lbl:DN[d.getDay()],
      dm:`${pad(d.getDate())}/${pad(d.getMonth()+1)}`
    });
  }
  const fIni=fechas[0].iso, fFin=fechas[6].iso;
  const fmtRango=`${fechas[0].dm} → ${fechas[6].dm}`;

  // Agrupar viajes: destino × fecha → m³ + viajes por turno (☀ día / 🌙 noche)
  const grid={}; // grid[destino][iso]={m3,viajes,vd,vn}
  (DB.partes||[]).forEach(function(p){
    if(!p.fecha||p.fecha<fIni||p.fecha>fFin)return;
    const esNoche=/noche/i.test(p.turno||'');
    (p.viajes||[]).forEach(function(v){
      if(!v.destino)return;
      if(_amtMatFiltro.size&&!_amtMatFiltro.has(v.material))return;
      if(!grid[v.destino])grid[v.destino]={};
      if(!grid[v.destino][p.fecha])grid[v.destino][p.fecha]={m3:0,viajes:0,vd:0,vn:0};
      const _cant=parseFloat(v.cant)||0;
      const c=grid[v.destino][p.fecha];
      c.m3+=_cant*_amtCapM3;
      c.viajes+=_cant;
      if(esNoche)c.vn+=_cant;else c.vd+=_cant;
    });
  });

  const destinos=Object.keys(grid).sort(function(a,b){
    const tA=Object.values(grid[a]).reduce((s,c)=>s+c.m3,0);
    const tB=Object.values(grid[b]).reduce((s,c)=>s+c.m3,0);
    return tB-tA;
  });
  const colores=['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#f97316','#ec4899','#84cc16','#a78bfa'];
  const fmtM3=v=>v.toLocaleString('es-PE',{maximumFractionDigits:1});

  // Totales por día y total general (con desglose de viajes por turno)
  const totDia={};let totalM3=0,totalViajes=0,totalVd=0,totalVn=0;
  fechas.forEach(f=>{totDia[f.iso]={m3:0,viajes:0,vd:0,vn:0};});
  destinos.forEach(dst=>{
    fechas.forEach(f=>{
      const c=grid[dst][f.iso];
      if(c){
        const t=totDia[f.iso];
        t.m3+=c.m3;t.viajes+=c.viajes;t.vd+=c.vd;t.vn+=c.vn;
        totalM3+=c.m3;totalViajes+=c.viajes;totalVd+=c.vd;totalVn+=c.vn;
      }
    });
  });
  const modoViajes=_amtSemModo==='viajes';

  const inpS='font-size:.72rem;padding:.2rem .4rem;border-radius:5px;border:1px solid var(--border);background:var(--panel2);color:var(--text);flex-shrink:0';
  const barSem=`<div style="display:flex;align-items:center;gap:.5rem;flex-wrap:wrap;margin-bottom:.8rem;padding:.4rem .7rem;background:var(--panel2);border:1px solid var(--border);border-radius:8px">
    <span style="font-size:.62rem;color:var(--muted2);font-weight:700;text-transform:uppercase;letter-spacing:.08em;white-space:nowrap">Semana (7 días desde)</span>
    <button onclick="_amtSemNav(-7)" style="background:none;border:1px solid var(--border);border-radius:5px;color:var(--text);cursor:pointer;font-size:.85rem;padding:.12rem .5rem" title="Semana anterior">‹</button>
    <input type="date" value="${_amtSemIni}" onchange="_amtSemIni=this.value;_amtRender()" style="${inpS};width:135px">
    <button onclick="_amtSemNav(7)" style="background:none;border:1px solid var(--border);border-radius:5px;color:var(--text);cursor:pointer;font-size:.85rem;padding:.12rem .5rem" title="Semana siguiente">›</button>
    <span style="font-size:.72rem;color:var(--ctl);font-weight:700;font-family:monospace">${fmtRango}</span>
    <button onclick="_amtSemIni=_amtSemDefault();_amtRender()" style="font-size:.62rem;padding:.2rem .5rem;border-radius:5px;border:1px solid var(--border);background:transparent;color:var(--muted2);cursor:pointer">Semana actual (Lun)</button>
    <div style="width:1px;height:18px;background:var(--border)"></div>
    <span style="font-size:.62rem;color:var(--muted2);font-weight:700;text-transform:uppercase;letter-spacing:.08em;white-space:nowrap">Material</span>
    <button id="amtMatBtn" onclick="_amtOpenMatFilter(event)" style="font-size:.72rem;padding:.2rem .55rem;border-radius:5px;border:1px solid ${_amtMatFiltro.size?'#06b6d4':'var(--border)'};background:var(--panel2);color:${_amtMatFiltro.size?'#06b6d4':'var(--text)'};cursor:pointer;min-width:140px;text-align:left;display:flex;align-items:center;gap:.4rem">
      <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${_amtMatFiltro.size===0?'Todos':_amtMatFiltro.size===1?[..._amtMatFiltro][0]:_amtMatFiltro.size+' materiales'}</span>
      <span style="font-size:.6rem;color:var(--muted2)">▾</span>
      ${_amtMatFiltro.size?'<span onclick="event.stopPropagation();_amtMatFiltro.clear();_amtRender()" style="font-size:.65rem;color:#ef4444" title="Limpiar">✕</span>':''}
    </button>
    <div style="width:1px;height:18px;background:var(--border)"></div>
    <span style="font-size:.62rem;color:var(--muted2);font-weight:700;text-transform:uppercase;letter-spacing:.08em;white-space:nowrap">Cap. m³/viaje</span>
    <input type="number" min="1" step="0.5" value="${_amtCapM3}" onchange="_amtSetCap(this.value)" style="${inpS};width:58px" title="Capacidad de carga por viaje en m³">
  </div>`;

  const TH='padding:.45rem .5rem;font-size:.62rem;text-transform:uppercase;letter-spacing:.06em;color:var(--muted2);white-space:nowrap';
  const TD='padding:.4rem .55rem;border:1px solid var(--border);font-size:.74rem;vertical-align:middle';

  const filas=destinos.map(function(dst,i){
    const col=colores[i%colores.length];
    let totFila=0,totV=0,totVd=0,totVn=0;
    const celdas=fechas.map(function(f){
      const c=grid[dst][f.iso];
      const esHoy=f.iso===hoy;
      if(!c||!c.viajes)return`<td style="${TD};text-align:right;color:var(--muted);${esHoy?'background:rgba(245,158,11,.05);':''}">—</td>`;
      totFila+=c.m3;totV+=c.viajes;totVd+=c.vd;totVn+=c.vn;
      const bg=esHoy?'rgba(245,158,11,.08)':modoViajes?'rgba(59,130,246,.06)':'rgba(6,182,212,.05)';
      const ttl=`${c.viajes} viaje(s) (☀ ${c.vd} · 🌙 ${c.vn}) · ${fmtM3(c.m3)} m³`;
      if(modoViajes){
        return`<td style="${TD};text-align:center;font-family:monospace;background:${bg};line-height:1.5" title="${ttl}">
          ${c.vd?`<span style="color:#f59e0b;font-weight:700">☀ ${c.vd.toLocaleString()}</span>`:''}
          ${c.vd&&c.vn?'<br>':''}
          ${c.vn?`<span style="color:#60a5fa;font-weight:700">🌙 ${c.vn.toLocaleString()}</span>`:''}
        </td>`;
      }
      return`<td style="${TD};text-align:right;font-family:monospace;font-weight:700;color:var(--ctl);background:${bg}" title="${ttl}">${fmtM3(c.m3)}</td>`;
    }).join('');
    const totCell=modoViajes
      ?`<td style="${TD};text-align:right;font-family:monospace;font-weight:900;color:#3b82f6;background:rgba(59,130,246,.08)">${totV.toLocaleString()} v<div style="font-size:.58rem;font-weight:400"><span style="color:#f59e0b">☀ ${totVd.toLocaleString()}</span> · <span style="color:#60a5fa">🌙 ${totVn.toLocaleString()}</span></div></td>`
      :`<td style="${TD};text-align:right;font-family:monospace;font-weight:900;color:#f59e0b;background:rgba(245,158,11,.07)">${fmtM3(totFila)}<div style="font-size:.58rem;color:var(--muted2);font-weight:400">${totV.toLocaleString()} viajes</div></td>`;
    return`<tr>
      <td style="${TD};font-weight:700;color:${col};white-space:nowrap"><span style="display:inline-block;width:9px;height:9px;border-radius:2px;background:${col};margin-right:.4rem"></span>${dst}</td>
      ${celdas}
      ${totCell}
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

  const kpisSem=modoViajes
    ?_amtKpi('Viajes de la Semana','<b style="font-size:1.3rem">'+totalViajes.toLocaleString()+'</b>','#3b82f6')
      +_amtKpi('Viajes Turno Día ☀','<b style="font-size:1.3rem">'+totalVd.toLocaleString()+'</b>','#f59e0b')
      +_amtKpi('Viajes Turno Noche 🌙','<b style="font-size:1.3rem">'+totalVn.toLocaleString()+'</b>','#3b82f6')
      +_amtKpi('Promedio viajes/día','<b style="font-size:1.3rem">'+(totalViajes?(totalViajes/7).toFixed(1):'—')+'</b>','#8b5cf6')
    :_amtKpi('m³ de la Semana','<b style="font-size:1.3rem">'+fmtM3(totalM3)+'</b>','var(--ctl)')
      +_amtKpi('Viajes de la Semana','<b style="font-size:1.3rem">'+totalViajes.toLocaleString()+'</b>','#3b82f6')
      +_amtKpi('Destinos Activos','<b style="font-size:1.3rem">'+destinos.length+'</b>','#8b5cf6')
      +_amtKpi('Promedio m³/día','<b style="font-size:1.3rem">'+(totalM3?fmtM3(totalM3/7):'—')+'</b>','#f59e0b');
  body.innerHTML=barSem+`
  <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:.6rem;margin-bottom:.9rem">
    ${kpisSem}
  </div>
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
          <th style="${TH};text-align:right;min-width:95px;color:#f59e0b;background:rgba(245,158,11,.08)">Total Semana</th>
        </tr>
      </thead>
      <tbody>
        ${filas||`<tr><td colspan="9" style="text-align:center;padding:2.5rem;color:var(--muted2);font-size:.85rem">Sin viajes registrados en esta semana (${fmtRango})</td></tr>`}
      </tbody>
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
    :'Valores en m³ = viajes × '+_amtCapM3+' m³/viaje (configurable arriba)'} · La semana inicia en la fecha elegida y abarca 7 días · Columna resaltada = hoy</div>`;
}
