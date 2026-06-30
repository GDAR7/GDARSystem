// ══ AVANCE MT ══
let _amtTab=1, _amtFechaD=null, _amtFechaH=null, _amtMaterial='', _amtFiltroTramos='todos';

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
    <select onchange="_amtMaterial=this.value;_amtRender()" style="font-size:.72rem;padding:.2rem .4rem;border-radius:5px;border:1px solid var(--border);background:var(--panel2);color:var(--text);min-width:140px;max-width:260px">
      <option value="">Todos</option>
      ${mats.map(function(m){return '<option value="'+m+'"'+(_amtMaterial===m?' selected':'')+'>'+m+'</option>';}).join('')}
    </select>
    <div style="width:1px;height:18px;background:var(--border);flex-shrink:0"></div>
    <span style="font-size:.62rem;color:var(--muted2);font-weight:700;text-transform:uppercase;letter-spacing:.08em;white-space:nowrap;flex-shrink:0">Tramos</span>
    <div style="display:flex;gap:.2rem;flex-shrink:0">
      ${[['todos','Todos','var(--muted2)'],['activos','Solo activos','#10b981'],['inactivos','Sin actividad','#6b7280']].map(function(op){
        const sel=_amtFiltroTramos===op[0];
        return '<button onclick="_amtFiltroTramos=\''+op[0]+'\';_amtRender()" style="font-size:.62rem;padding:.2rem .5rem;border-radius:5px;border:1px solid '+(sel?op[2]+'80':'var(--border)')+';background:'+(sel?op[2]+'18':'transparent')+';color:'+(sel?op[2]:'var(--muted2)')+';cursor:pointer;white-space:nowrap;font-weight:'+(sel?'700':'400')+'">'+op[1]+'</button>';
      }).join('')}
    </div>
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
      if(_amtMaterial && v.material!==_amtMaterial) return;
      if(!byTramo[v.tramoId]) byTramo[v.tramoId]={viajes:0,m3:0,parteIds:new Set(),lastFecha:''};
      byTramo[v.tramoId].viajes++;
      byTramo[v.tramoId].m3+=parseFloat(v.cant)||0;
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
      if(_amtMaterial && v.material!==_amtMaterial) return;
      const dest=v.destino;
      if(!byDest[dest]) byDest[dest]={viajes:0,m3:0,parteIds:new Set(),lastFecha:'',materiales:{},tramos:{}};
      byDest[dest].viajes++;
      byDest[dest].m3+=parseFloat(v.cant)||0;
      byDest[dest].parteIds.add(p.id);
      if(p.fecha>byDest[dest].lastFecha) byDest[dest].lastFecha=p.fecha;
      if(v.material){byDest[dest].materiales[v.material]=(byDest[dest].materiales[v.material]||0)+(parseFloat(v.cant)||0);}
      if(v.tramoId){
        if(!byDest[dest].tramos[v.tramoId]) byDest[dest].tramos[v.tramoId]={viajes:0,m3:0};
        byDest[dest].tramos[v.tramoId].viajes++;
        byDest[dest].tramos[v.tramoId].m3+=(parseFloat(v.cant)||0);
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

// ── Helpers ──────────────────────────────────────────────────────────────────
function _amtKpi(label, valueHtml, color){
  return `<div style="background:var(--panel2);border:1px solid var(--border);border-radius:8px;padding:.6rem .8rem;border-left:3px solid ${color}">
    <div style="font-size:.58rem;font-weight:700;text-transform:uppercase;letter-spacing:.09em;color:var(--muted2);margin-bottom:.25rem">${label}</div>
    <div style="color:${color}">${valueHtml}</div>
  </div>`;
}
