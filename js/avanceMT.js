// ══ AVANCE MT ══
let _amtTab=1, _amtFechaD=null, _amtFechaH=null, _amtMatFiltro=new Set(), _amtFiltroTramos='todos';
let _amtMatDropEl=null;
let _amtCapM3=+localStorage.getItem('_amtCapM3')||12;
function _amtSetCap(v){_amtCapM3=Math.max(1,+v||12);localStorage.setItem('_amtCapM3',_amtCapM3);_amtRender();}
// Material válido = no vacío y distinto del texto "SIN MATERIAL" (traslado: cuenta el viaje, no el volumen)
function _amtMatOk(m){m=String(m||'').trim();return !!m&&!/^sin\s*material/i.test(m);}

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
  else if(_amtTab===9) _amtRenderDashboard(body);
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
      // Sin material = traslado → no suma volumen
      byTramo[v.tramoId].m3+=_amtMatOk(v.material)?(parseFloat(v.cant)||0)*_amtCapM3:0;
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
        return `<tr ondblclick="_amtTramoDetalle(${JSON.stringify(tr.id).replace(/"/g,'&quot;')})" title="Doble clic: equipos que trabajaron en este tramo" style="border-bottom:1px solid var(--border);cursor:pointer${d?'':';opacity:.45'}">
          <td style="padding:.4rem .6rem;text-align:center;font-size:.9rem" title="${st.label}">${st.dot}</td>
          <td style="padding:.4rem .6rem">
            <div style="font-weight:700;color:var(--text)">${tr.codigo||'—'}${d?` <span onclick="event.stopPropagation();_amtTramoDetalle(${JSON.stringify(tr.id).replace(/"/g,'&quot;')})" title="Ver equipos" style="font-size:.65rem;cursor:pointer;opacity:.7">🔍</span>`:''}</div>
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

// ── Detalle de un tramo: qué equipos trabajaron y cuántos viajes ─────────────
// Mismo período y filtro de material que la tabla. Los volquetes cuentan sus
// viajes; los equipos de Línea Amarilla con el tramo en el parte (sin viajes)
// aparecen aparte con sus partes y horas.
function _amtTramoDatos(tramoId){
  const vol={},apoyo={},porDia={},detalle=[];
  _amtPartesFiltradas().forEach(function(p){
    const vs=(p.viajes||[]).filter(function(v){
      return String(v.tramoId)===String(tramoId)&&(!_amtMatFiltro.size||_amtMatFiltro.has(v.material));
    });
    if(vs.length){
      const k=p.eqId;
      const r=vol[k]||(vol[k]={eqId:k,viajes:0,m3:0,partes:new Set(),dias:new Set(),ult:'',mats:{}});
      const dd=porDia[p.fecha]||(porDia[p.fecha]={viajes:0,m3:0,eqs:{}});
      vs.forEach(function(v){
        const c=parseFloat(v.cant)||0;
        const m3=_amtMatOk(v.material)?c*_amtCapM3:0;
        r.viajes+=c;
        r.m3+=m3;
        const m=String(v.material||'Sin material').trim()||'Sin material';
        r.mats[m]=(r.mats[m]||0)+c;
        dd.viajes+=c;dd.m3+=m3;dd.eqs[k]=(dd.eqs[k]||0)+c;
        detalle.push({fecha:p.fecha,turno:p.turno||'',eqId:k,material:m,viajes:c,m3:m3});
      });
      r.partes.add(p.id);r.dias.add(p.fecha);
      if(p.fecha>r.ult)r.ult=p.fecha;
    }else if(String(p.tramoId||'')===String(tramoId)&&!(p.viajes&&p.viajes.length)){
      const k=p.eqId;
      const r=apoyo[k]||(apoyo[k]={eqId:k,horas:0,partes:new Set(),dias:new Set(),ult:''});
      const h=(+p.ef>0)?+p.ef:Math.max(0,(+p.hrFin||0)-(+p.hrIni||0));
      r.horas+=h;r.partes.add(p.id);r.dias.add(p.fecha);
      if(p.fecha>r.ult)r.ult=p.fecha;
    }
  });
  const ord=function(a,b){return (b.viajes||b.horas||0)-(a.viajes||a.horas||0);};
  detalle.sort(function(a,b){return a.fecha.localeCompare(b.fecha)||String(a.turno).localeCompare(String(b.turno));});
  // Todos los días del período, trabajados o no, para ver los huecos
  const dias=[];
  if(_amtFechaD&&_amtFechaH){
    const pa=function(s){const x=s.split('-').map(Number);return new Date(x[0],x[1]-1,x[2]);};
    for(let d=pa(_amtFechaD),f=pa(_amtFechaH),i=0;d<=f&&i<400;d.setDate(d.getDate()+1),i++){
      dias.push(d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'));
    }
  }
  return{vol:Object.values(vol).sort(ord),apoyo:Object.values(apoyo).sort(ord),porDia,dias,detalle};
}

// Gráfico de barras: viajes por día del período (los días sin viajes quedan vacíos)
function _amtTramoGrafico(D){
  if(!D.dias.length)return'';
  const max=Math.max(1,...D.dias.map(function(f){return (D.porDia[f]||{}).viajes||0;}));
  const trab=D.dias.filter(function(f){return (D.porDia[f]||{}).viajes>0;}).length;
  const prom=trab?D.vol.reduce(function(s,r){return s+r.viajes;},0)/trab:0;
  const barras=D.dias.map(function(f){
    const v=(D.porDia[f]||{}).viajes||0;
    const h=v?Math.max(4,Math.round(v/max*100)):0;
    const lbl=f.slice(8,10)+'/'+f.slice(5,7);
    return '<div title="'+lbl+': '+v+' viaje(s)" style="flex:1;min-width:6px;display:flex;flex-direction:column;justify-content:flex-end;align-items:center;height:100%">'
      +(v?'<div style="font-size:.5rem;color:#93c5fd;margin-bottom:1px">'+v+'</div>':'')
      +'<div style="width:100%;height:'+h+'%;background:'+(v?'#3b82f6':'transparent')+';border-radius:2px 2px 0 0;'+(v?'':'border-bottom:2px solid var(--border)')+'"></div></div>';
  }).join('');
  const ejes=D.dias.map(function(f,i){
    const mostrar=D.dias.length<=20||i%Math.ceil(D.dias.length/15)===0;
    return '<div style="flex:1;min-width:6px;text-align:center;font-size:.5rem;color:var(--muted2);white-space:nowrap;overflow:visible">'+(mostrar?f.slice(8,10)+'/'+f.slice(5,7):'')+'</div>';
  }).join('');
  return '<div style="border:1px solid var(--border);border-radius:8px;padding:.6rem .7rem;margin-bottom:.8rem">'
    +'<div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:.4rem;font-size:.7rem;margin-bottom:.4rem">'
    +'<b style="color:#3b82f6">📊 Viajes por día</b>'
    +'<span style="color:var(--muted2)">Trabajó <b style="color:var(--text)">'+trab+'</b> de '+D.dias.length+' días · promedio '+prom.toFixed(1)+' viajes por día trabajado</span></div>'
    +'<div style="display:flex;align-items:flex-end;gap:2px;height:110px">'+barras+'</div>'
    +'<div style="display:flex;gap:2px;margin-top:3px">'+ejes+'</div></div>';
}

// Excel del tramo: resumen por equipo, matriz fecha × equipo y detalle de viajes
function _amtTramoExcel(tramoId){
  if(typeof XLSX==='undefined'){toast('Librería Excel no disponible',true);return;}
  const tr=(DB.tramos||[]).find(function(t){return String(t.id)===String(tramoId);})||{};
  const D=_amtTramoDatos(tramoId);
  if(!D.vol.length&&!D.apoyo.length){toast('Este tramo no tiene datos en el período',true);return;}
  const cod=function(id){const e=(DB.equipos||[]).find(function(x){return +x.id===+id;})||{};return e.codigo||('#'+id);};
  const nom=function(id){const e=(DB.equipos||[]).find(function(x){return +x.id===+id;})||{};return e.nombre||'';};
  const dmy=function(s){return s?s.slice(8,10)+'/'+s.slice(5,7)+'/'+s.slice(0,4):'';};
  const r1=function(v){return +(+v||0).toFixed(1);};
  const titulo='TRAMO '+(tr.codigo||'')+' · '+(tr.inicio||'')+(tr.fin?' → '+tr.fin:'');
  const sub='Período '+dmy(_amtFechaD)+' al '+dmy(_amtFechaH)+' · '+_amtCapM3+' m³/viaje'
    +(_amtMatFiltro.size?' · material: '+[..._amtMatFiltro].join(', '):'');
  const wb=XLSX.utils.book_new();
  const BOR={top:{style:'thin',color:{rgb:'CBD5E1'}},bottom:{style:'thin',color:{rgb:'CBD5E1'}},left:{style:'thin',color:{rgb:'CBD5E1'}},right:{style:'thin',color:{rgb:'CBD5E1'}}};
  const estilar=function(ws,filaHdr,nCols){
    const a=function(r,c){return XLSX.utils.encode_cell({r:r,c:c});};
    if(ws[a(0,0)])ws[a(0,0)].s={font:{bold:true,sz:12,color:{rgb:'1E3A5F'}}};
    for(let c=0;c<nCols;c++){const cl=ws[a(filaHdr,c)];if(cl)cl.s={font:{bold:true,color:{rgb:'FFFFFF'}},fill:{patternType:'solid',fgColor:{rgb:'1E3A5F'}},alignment:{horizontal:'center'},border:BOR};}
    const rg=XLSX.utils.decode_range(ws['!ref']);
    for(let r=filaHdr+1;r<=rg.e.r;r++)for(let c=0;c<nCols;c++){const cl=ws[a(r,c)];if(cl)cl.s=Object.assign({},cl.s||{},{border:BOR});}
  };

  // 1) Resumen por equipo
  const totV=D.vol.reduce(function(s,r){return s+r.viajes;},0),totM=D.vol.reduce(function(s,r){return s+r.m3;},0);
  const hR=['Equipo','Descripción','Viajes','% Viajes','m³','Días','Partes','Materiales','Último parte'];
  const aR=[[titulo],[sub],[],hR].concat(D.vol.map(function(r){
    return[cod(r.eqId),nom(r.eqId),r.viajes,totV?+(r.viajes/totV*100).toFixed(1):0,r1(r.m3),r.dias.size,r.partes.size,
      Object.entries(r.mats).sort(function(a,b){return b[1]-a[1];}).map(function(m){return m[0]+' ('+m[1]+')';}).join(', '),dmy(r.ult)];
  }));
  aR.push(['TOTAL',D.vol.length+' volquete(s)',totV,100,r1(totM)]);
  if(D.apoyo.length){
    aR.push([],['EQUIPOS DE CARGA / APOYO (sin viajes)'],['Equipo','Descripción','Horas','Días','Partes','Último parte']);
    D.apoyo.forEach(function(r){aR.push([cod(r.eqId),nom(r.eqId),r1(r.horas),r.dias.size,r.partes.size,dmy(r.ult)]);});
  }
  const wsR=XLSX.utils.aoa_to_sheet(aR);
  wsR['!cols']=[{wch:16},{wch:26},{wch:9},{wch:9},{wch:10},{wch:7},{wch:8},{wch:40},{wch:12}];
  estilar(wsR,3,hR.length);
  XLSX.utils.book_append_sheet(wb,wsR,'Resumen');

  // 2) Por día: fecha × equipo (viajes), con los días sin trabajo en cero
  const eqs=D.vol.map(function(r){return r.eqId;});
  const hD=['Fecha'].concat(eqs.map(cod),['Total viajes','m³']);
  const aD=[[titulo],[sub],[],hD].concat(D.dias.map(function(f){
    const d=D.porDia[f]||{viajes:0,m3:0,eqs:{}};
    return[dmy(f)].concat(eqs.map(function(id){return d.eqs[id]||0;}),[d.viajes,r1(d.m3)]);
  }));
  aD.push(['TOTAL'].concat(eqs.map(function(id){return (D.vol.find(function(r){return r.eqId===id;})||{}).viajes||0;}),[totV,r1(totM)]));
  const wsD=XLSX.utils.aoa_to_sheet(aD);
  wsD['!cols']=[{wch:12}].concat(eqs.map(function(){return{wch:13};}),[{wch:12},{wch:10}]);
  estilar(wsD,3,hD.length);
  XLSX.utils.book_append_sheet(wb,wsD,'Por día');

  // 3) Detalle de cada registro de viajes
  const hX=['Fecha','Turno','Equipo','Material','Viajes','m³'];
  const aX=[[titulo],[sub],[],hX].concat(D.detalle.map(function(x){return[dmy(x.fecha),x.turno,cod(x.eqId),x.material,x.viajes,r1(x.m3)];}));
  const wsX=XLSX.utils.aoa_to_sheet(aX);
  wsX['!cols']=[{wch:12},{wch:9},{wch:16},{wch:22},{wch:8},{wch:10}];
  estilar(wsX,3,hX.length);
  XLSX.utils.book_append_sheet(wb,wsX,'Detalle');

  const limpio=String(tr.codigo||'Tramo').replace(/[\\/:*?"<>|]/g,'-');
  XLSX.writeFile(wb,'Tramo_'+limpio+'_'+(_amtFechaD||'')+'_'+(_amtFechaH||'')+'.xlsx');
  toast('✓ Excel del tramo '+(tr.codigo||'')+' descargado');
}
function _amtTramoDetalle(tramoId){
  const tr=(DB.tramos||[]).find(function(t){return String(t.id)===String(tramoId);})||{};
  const D=_amtTramoDatos(tramoId);
  const eqDe=function(id){return (DB.equipos||[]).find(function(e){return +e.id===+id;})||{};};
  const esc=function(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');};
  const dmy=function(s){return s?s.slice(8,10)+'/'+s.slice(5,7)+'/'+s.slice(0,4):'—';};
  const n=function(v,d){return (+v||0).toLocaleString('es-PE',{maximumFractionDigits:d==null?1:d});};
  const TH='padding:.4rem .55rem;font-size:.6rem;text-transform:uppercase;letter-spacing:.06em;color:var(--muted2);background:var(--panel2);text-align:left;white-space:nowrap';
  const TD='padding:.38rem .55rem;border-bottom:1px solid var(--border);font-size:.74rem;white-space:nowrap';
  const totV=D.vol.reduce(function(s,r){return s+r.viajes;},0);
  const totM=D.vol.reduce(function(s,r){return s+r.m3;},0);
  const kpi=function(l,v,c){return '<div style="border:2px solid '+c+';border-radius:9px;padding:.45rem .7rem;background:var(--panel)"><div style="font-size:.56rem;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--muted2)">'+l+'</div><div style="font-size:1.15rem;font-weight:800;color:'+c+'">'+v+'</div></div>';};

  let html='<div style="display:flex;align-items:flex-start;gap:.6rem;margin-bottom:.7rem">'
    +'<div style="flex:1"><div style="font-size:1.05rem;font-weight:800;color:var(--text)">🚚 '+esc(tr.codigo||'Tramo')+'</div>'
    +'<div style="font-size:.7rem;color:var(--muted2)">'+esc((tr.inicio||'')+(tr.fin?' → '+tr.fin:''))+' · '+dmy(_amtFechaD)+' al '+dmy(_amtFechaH)
    +(_amtMatFiltro.size?' · material: '+esc([..._amtMatFiltro].join(', ')):'')+'</div></div>'
    +((D.vol.length||D.apoyo.length)?'<button onclick="_amtTramoExcel('+esc(JSON.stringify(tramoId)).replace(/"/g,'&quot;')+')" class="btn" style="font-size:.75rem;background:#059669;color:#fff">⬇ Excel</button>':'')
    +'<button onclick="_amtTramoCerrar()" class="btn btn-out" style="font-size:.75rem">✕ Cerrar</button></div>';
  html+='<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:.5rem;margin-bottom:.8rem">'
    +kpi('Equipos',D.vol.length+D.apoyo.length,'#8b5cf6')+kpi('Viajes',n(totV,0),'#3b82f6')
    +kpi('m³',n(totM),'#10b981')+kpi('m³ / viaje',totV?(totM/totV).toFixed(1):'—','#f59e0b')+'</div>';
  if(D.vol.length)html+=_amtTramoGrafico(D);

  if(D.vol.length){
    html+='<div style="font-size:.7rem;font-weight:700;color:#3b82f6;margin:.2rem 0 .3rem">Volquetes · viajes en el tramo</div>'
      +'<div style="overflow:auto;max-height:46vh;border:1px solid var(--border);border-radius:8px"><table style="width:100%;border-collapse:collapse">'
      +'<thead><tr><th style="'+TH+'">Equipo</th><th style="'+TH+';text-align:right">Viajes</th><th style="'+TH+';text-align:right">%</th><th style="'+TH+';text-align:right">m³</th><th style="'+TH+';text-align:right">Días</th><th style="'+TH+'">Materiales</th><th style="'+TH+'">Último</th></tr></thead><tbody>'
      +D.vol.map(function(r){
        const e=eqDe(r.eqId);
        const pct=totV?r.viajes/totV*100:0;
        const mats=Object.entries(r.mats).sort(function(a,b){return b[1]-a[1];}).map(function(m){return esc(m[0])+' ('+n(m[1],0)+')';}).join(', ');
        return '<tr><td style="'+TD+'"><b style="color:var(--text)">'+esc(e.codigo||('#'+r.eqId))+'</b> <span style="color:var(--muted2);font-size:.66rem">'+esc(e.nombre||'')+'</span></td>'
          +'<td style="'+TD+';text-align:right;font-weight:800;color:#3b82f6">'+n(r.viajes,0)+'</td>'
          +'<td style="'+TD+';text-align:right;color:var(--muted2)">'+pct.toFixed(1)+'%</td>'
          +'<td style="'+TD+';text-align:right;color:#10b981;font-weight:700">'+n(r.m3)+'</td>'
          +'<td style="'+TD+';text-align:right">'+r.dias.size+'</td>'
          +'<td style="'+TD+';white-space:normal;font-size:.66rem;color:var(--muted2);min-width:160px">'+mats+'</td>'
          +'<td style="'+TD+';font-size:.68rem">'+dmy(r.ult)+'</td></tr>';
      }).join('')
      +'<tr style="background:var(--panel2);font-weight:800"><td style="'+TD+'">TOTAL · '+D.vol.length+' volquete(s)</td><td style="'+TD+';text-align:right;color:#3b82f6">'+n(totV,0)+'</td><td style="'+TD+'"></td><td style="'+TD+';text-align:right;color:#10b981">'+n(totM)+'</td><td colspan="3" style="'+TD+'"></td></tr>'
      +'</tbody></table></div>';
  }
  if(D.apoyo.length){
    html+='<div style="font-size:.7rem;font-weight:700;color:#f59e0b;margin:.8rem 0 .3rem">Equipos de carga / apoyo · parte con este tramo (sin viajes)</div>'
      +'<div style="overflow:auto;max-height:30vh;border:1px solid var(--border);border-radius:8px"><table style="width:100%;border-collapse:collapse">'
      +'<thead><tr><th style="'+TH+'">Equipo</th><th style="'+TH+';text-align:right">Partes</th><th style="'+TH+';text-align:right">Días</th><th style="'+TH+';text-align:right">Horas</th><th style="'+TH+'">Último</th></tr></thead><tbody>'
      +D.apoyo.map(function(r){
        const e=eqDe(r.eqId);
        return '<tr><td style="'+TD+'"><b style="color:var(--text)">'+esc(e.codigo||('#'+r.eqId))+'</b> <span style="color:var(--muted2);font-size:.66rem">'+esc(e.nombre||'')+'</span></td>'
          +'<td style="'+TD+';text-align:right">'+r.partes.size+'</td><td style="'+TD+';text-align:right">'+r.dias.size+'</td>'
          +'<td style="'+TD+';text-align:right;color:#f59e0b;font-weight:700">'+n(r.horas)+'</td><td style="'+TD+';font-size:.68rem">'+dmy(r.ult)+'</td></tr>';
      }).join('')+'</tbody></table></div>';
  }
  if(!D.vol.length&&!D.apoyo.length)
    html+='<div style="text-align:center;padding:1.5rem;color:var(--muted2);font-size:.8rem">Ningún equipo trabajó en este tramo en el período elegido.</div>';

  let ov=document.getElementById('amtTramoOv');
  if(!ov){
    ov=document.createElement('div');ov.id='amtTramoOv';
    ov.onclick=function(e){if(e.target===ov)_amtTramoCerrar();};
    document.body.appendChild(ov);
    document.addEventListener('keydown',_amtTramoEsc);
  }
  ov.style.cssText='position:fixed;inset:0;z-index:9000;background:rgba(0,0,0,.6);display:flex;align-items:center;justify-content:center;padding:16px';
  ov.innerHTML='<div style="background:var(--panel);border:2px solid #3b82f6;border-radius:12px;padding:1rem 1.1rem;width:min(860px,100%);max-height:90vh;overflow:auto;box-shadow:0 12px 40px rgba(0,0,0,.6)">'+html+'</div>';
}
// Esc cierra la ventana: el listener vive solo mientras está abierta
function _amtTramoEsc(e){if(e.key==='Escape')_amtTramoCerrar();}
function _amtTramoCerrar(){
  const ov=document.getElementById('amtTramoOv');if(ov&&ov.remove)ov.remove();
  document.removeEventListener('keydown',_amtTramoEsc);
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
      // Sin material = traslado → cuenta el viaje pero no el volumen
      byDest[dest].m3+=_amtMatOk(v.material)?_cant*_amtCapM3:0;
      byDest[dest].parteIds.add(p.id);
      if(p.fecha>byDest[dest].lastFecha) byDest[dest].lastFecha=p.fecha;
      if(v.material){byDest[dest].materiales[v.material]=(byDest[dest].materiales[v.material]||0)+(_cant*_amtCapM3);}
      if(v.tramoId){
        if(!byDest[dest].tramos[v.tramoId]) byDest[dest].tramos[v.tramoId]={viajes:0,m3:0};
        byDest[dest].tramos[v.tramoId].viajes+=_cant;
        byDest[dest].tramos[v.tramoId].m3+=_amtMatOk(v.material)?_cant*_amtCapM3:0;
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
      const pct=totalM3?+(e[1].m3/totalM3*100).toFixed(2):0;
      const col=colores[i%colores.length];
      return `<div style="margin-bottom:.35rem">
        <div style="display:flex;justify-content:space-between;margin-bottom:2px">
          <span style="font-size:.67rem;font-weight:700;color:${col}">${e[0]}</span>
          <span style="font-size:.63rem;color:var(--muted2)">${e[1].m3.toLocaleString('es-PE',{maximumFractionDigits:1})} m³ &nbsp;|&nbsp; ${e[1].viajes} viajes &nbsp;|&nbsp; ${pct.toFixed(2)}%</span>
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
        const pct=totalM3?+(d.m3/totalM3*100).toFixed(2):0;
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
              <span style="font-size:.65rem;color:${col};min-width:44px;text-align:right">${pct.toFixed(2)}%</span>
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
      // Sin material = traslado de un frente a otro → cuenta el viaje pero NO el volumen
      out.push({fecha:p.fecha,noche,guardia:String(p.guardia||'').trim().toUpperCase(),origen:v.origen||'',destino:v.destino||'',material:v.material||'',cant,m3:_amtMatOk(v.material)?cant*_amtCapM3:0,eqId:p.eqId,op:p.op||p.operador||'',tramoId:v.tramoId||null});
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
    ${opts.guardia?`<div style="width:1px;height:18px;background:var(--border)"></div>
    <span style="font-size:.62rem;color:var(--muted2);font-weight:700;text-transform:uppercase;letter-spacing:.08em;white-space:nowrap">Guardia</span>
    <select onchange="_amtOpGuardia=this.value;_amtRender()" style="${inpS};border-color:${_amtOpGuardia?'#06b6d4':'var(--border)'};cursor:pointer" title="Guardia registrada en el parte diario">
      <option value="">Todas</option>${['A','B','C'].map(g=>`<option value="${g}" ${_amtOpGuardia===g?'selected':''}>Guardia ${g}</option>`).join('')}
    </select>`:''}
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
  `;

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

  const rows=Object.keys(grid).map(function(id){
    const eq=(DB.equipos||[]).find(e=>e.id==id);
    let viajes=0,vd=0,vn=0,m3=0;const dias=new Set();
    Object.entries(grid[id]).forEach(([f,c])=>{viajes+=c.viajes;vd+=c.vd;vn+=c.vn;m3+=c.m3;if(c.viajes)dias.add(f);});
    return{id,eq,viajes,vd,vn,m3,dias:dias.size,prom:dias.size?viajes/dias.size:0};
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
        <span class="mono" style="font-weight:700;color:#06b6d4">${r.eq?r.eq.codigo:'#'+r.id}</span>
        <div style="font-size:.62rem;color:var(--muted2)">${r.eq?((r.eq.marca||'')+' '+(r.eq.sub||'')):''}</div>
      </td>
      ${celdas}
      <td style="${TD};text-align:right;font-family:monospace;font-weight:900;color:#3b82f6;background:rgba(59,130,246,.08)">${r.viajes.toLocaleString()} v<div style="font-size:.58rem;font-weight:400"><span style="color:#f59e0b">☀ ${r.vd.toLocaleString()}</span> · <span style="color:#60a5fa">🌙 ${r.vn.toLocaleString()}</span></div></td>
      <td style="${TD};text-align:right;font-family:monospace;font-weight:700;color:var(--ctl)">${_amtFmt1(r.m3)}</td>
      <td style="${TD};text-align:center;font-family:monospace">${r.dias}</td>
      <td style="${TD};text-align:right;font-family:monospace;font-weight:900;color:${promCol}">${r.prom.toFixed(1)}</td>
    </tr>`;
  }).join('');

  _amtSemExportData={
    name:'viajes_por_equipo_'+fIni+'.xlsx',
    aoa:[
      ['VIAJES POR EQUIPO — '+rango],
      ['Equipo',...fechas.map(f=>f.lbl+' '+f.dm),'Viajes','☀ Día','🌙 Noche','m³','Días trab.','Prom v/día'],
      ...rows.map(r=>[
        r.eq?r.eq.codigo:('#'+r.id),
        ...fechas.map(f=>{const c=grid[r.id][f.iso];return c?c.viajes:'';}),
        r.viajes,r.vd,r.vn,+r.m3.toFixed(1),r.dias,+r.prom.toFixed(1)
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
      </tr></thead>
      <tbody>${filas||`<tr><td colspan="13" style="text-align:center;padding:2.5rem;color:var(--muted2);font-size:.85rem">Sin viajes de volquetes en esta semana (${rango})</td></tr>`}</tbody>
      ${rows.length?`<tfoot><tr style="background:var(--panel2);border-top:2px solid var(--border)">
        <td colspan="2" style="${TD};font-size:.65rem;font-weight:700;color:var(--muted2);text-transform:uppercase">TOTAL</td>
        ${fechas.map(f=>{
          let v=0,d=0,n=0;rows.forEach(r=>{const c=grid[r.id][f.iso];if(c){v+=c.viajes;d+=c.vd;n+=c.vn;}});
          return`<td style="${TD};text-align:center;font-family:monospace;font-weight:900;color:${v?'#3b82f6':'var(--muted)'};line-height:1.5">${v?v.toLocaleString()+' v':'—'}${v?`<div style="font-size:.56rem;font-weight:400"><span style="color:#f59e0b">☀ ${d.toLocaleString()}</span> · <span style="color:#60a5fa">🌙 ${n.toLocaleString()}</span></div>`:''}</td>`;
        }).join('')}
        <td style="${TD};text-align:right;font-family:monospace;font-weight:900;color:#3b82f6;background:rgba(59,130,246,.1)">${totalViajes.toLocaleString()} v</td>
        <td style="${TD};text-align:right;font-family:monospace;font-weight:900;color:var(--ctl)">${_amtFmt1(totalM3)}</td>
        <td colspan="2"></td>
      </tr></tfoot>`:''}
    </table>
    </div>
  </div>
  `;
}

// ── TAB 6: VIAJES POR OPERADOR ────────────────────────────────────────────────
// Filtro de guardia: la que se registró en cada parte diario (A/B/C), no la
// del maestro de personal, porque un operador puede cubrir otra guardia.
let _amtOpGuardia='';
function _amtRenderSemOperadores(body){
  const info=_amtSemInfo();
  const{fechas,fIni,fFin,rango}=info;
  const hoy=today();
  const TH=_AMT_TH,TD=_AMT_TD;
  const vs=_amtSemViajes(fIni,fFin).filter(v=>v.op&&(!_amtOpGuardia||v.guardia===_amtOpGuardia));

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
      ['VIAJES POR OPERADOR — '+rango+(_amtOpGuardia?' — GUARDIA '+_amtOpGuardia:'')],
      ['Operador',...fechas.map(f=>f.lbl+' '+f.dm),'Viajes','☀ Día','🌙 Noche','m³','Días trab.','Prom v/día'],
      ...rows.map(r=>[r.op,...fechas.map(f=>{const c=grid[r.op][f.iso];return c?c.viajes:'';}),r.viajes,r.vd,r.vn,+r.m3.toFixed(1),r.dias,+r.prom.toFixed(1)])
    ]
  };

  body.innerHTML=_amtSemBar({rango,guardia:true})+`
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
      <tbody>${filas||`<tr><td colspan="13" style="text-align:center;padding:2.5rem;color:var(--muted2);font-size:.85rem">Sin viajes con operador registrado en esta semana (${rango})${_amtOpGuardia?' en la guardia '+_amtOpGuardia:''}</td></tr>`}</tbody>
    </table>
    </div>
  </div>
  `;
}

// ── TAB 7: MATRIZ TRAMO → DESTINO (m³ de la semana) ──────────────────────────
function _amtRenderSemMatriz(body){
  const info=_amtSemInfo();
  const{fIni,fFin,rango}=info;
  const TH=_AMT_TH,TD=_AMT_TD;
  const pad=n=>String(n).padStart(2,'0');
  const DN=['DOM','LUN','MAR','MIÉ','JUE','VIE','SÁB'];
  const d0=new Date(fIni+'T12:00:00');
  const fechas=[];
  for(let i=0;i<7;i++){const d=new Date(d0);d.setDate(d0.getDate()+i);const iso=`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;fechas.push({iso,lbl:DN[d.getDay()],dm:`${pad(d.getDate())}/${pad(d.getMonth()+1)}`});}
  const hoy=today();

  const vs=_amtSemViajes(fIni,fFin).filter(v=>v.destino);

  // data[material][destino][fecha]={m3D,m3N,vD,vN} · sin material = traslado (cuenta viajes, no volumen)
  const data={};const destSet=new Set();
  vs.forEach(function(v){
    const mat=_amtMatOk(v.material)?v.material:'(Sin material)';
    if(!data[mat])data[mat]={};
    if(!data[mat][v.destino])data[mat][v.destino]={};
    if(!data[mat][v.destino][v.fecha])data[mat][v.destino][v.fecha]={m3D:0,m3N:0,vD:0,vN:0};
    const c=data[mat][v.destino][v.fecha];
    if(v.noche){c.m3N+=v.m3;c.vN+=v.cant;}else{c.m3D+=v.m3;c.vD+=v.cant;}
    destSet.add(v.destino);
  });

  // Totales por material, por día y generales
  const matTot={};
  Object.entries(data).forEach(([m,dests])=>{
    matTot[m]={m3:0,viajes:0};
    Object.values(dests).forEach(days=>Object.values(days).forEach(c=>{matTot[m].m3+=c.m3D+c.m3N;matTot[m].viajes+=c.vD+c.vN;}));
  });
  const materiales=Object.keys(data).sort((a,b)=>matTot[b].m3-matTot[a].m3||matTot[b].viajes-matTot[a].viajes);
  let maxCelda=0,totalM3=0,totalViajes=0;
  const totDia={};fechas.forEach(f=>{totDia[f.iso]=0;});
  Object.values(data).forEach(dests=>Object.values(dests).forEach(days=>Object.entries(days).forEach(([iso,c])=>{
    const m3=c.m3D+c.m3N;
    if(m3>maxCelda)maxCelda=m3;
    totalM3+=m3;totalViajes+=c.vD+c.vN;
    if(totDia[iso]!==undefined)totDia[iso]+=m3;
  })));

  const nCols=fechas.length+2;
  let filas='';
  materiales.forEach(function(mat,i){
    const col=_AMT_COLORES[i%_AMT_COLORES.length];
    filas+=`<tr><td colspan="${nCols}" style="padding:.42rem .7rem;background:${col}14;border:1px solid var(--border);border-left:4px solid ${col};color:${col};font-size:.72rem;font-weight:800;text-transform:uppercase">${mat} <span style="font-family:monospace;font-weight:700;font-size:.68rem;text-transform:none">· ${_amtFmt1(matTot[mat].m3)} m³ · ${matTot[mat].viajes.toLocaleString()} viajes</span></td></tr>`;
    const dests=Object.keys(data[mat]).sort((a,b)=>{
      const s=d=>Object.values(data[mat][d]).reduce((x,c)=>x+c.m3D+c.m3N,0);
      return s(b)-s(a);
    });
    dests.forEach(function(dest){
      let totM3=0,totV=0;
      const celdas=fechas.map(function(f){
        const c=data[mat][dest][f.iso];
        const esHoy=f.iso===hoy;
        if(!c)return`<td style="${TD};text-align:right;color:var(--muted);${esHoy?'background:rgba(245,158,11,.05)':''}">—</td>`;
        const m3=c.m3D+c.m3N,v=c.vD+c.vN;
        totM3+=m3;totV+=v;
        const ttl=`☀ Día: ${_amtFmt1(c.m3D)} m³ (${c.vD.toLocaleString()} v) · 🌙 Noche: ${_amtFmt1(c.m3N)} m³ (${c.vN.toLocaleString()} v)`;
        if(!m3)return`<td style="${TD};text-align:right;font-family:monospace;color:var(--muted2)" title="Traslado sin material — no suma volumen · ${ttl}">${v.toLocaleString()} v</td>`;
        return`<td style="${TD};text-align:right;font-family:monospace;background:${esHoy?'rgba(245,158,11,.1)':_amtHeat(m3,maxCelda)}" title="${ttl}">
          <div style="font-weight:800">${_amtFmt1(m3)}</div>
          <div style="font-size:.58rem;color:var(--muted2)"><span style="color:#fbbf24">☀</span> ${_amtFmt1(c.m3D)} · <span style="filter:grayscale(1) brightness(1.2)">🌙</span> ${_amtFmt1(c.m3N)}</div>
        </td>`;
      }).join('');
      filas+=`<tr>
        <td style="${TD};padding-left:1.2rem;font-weight:700;color:var(--text);white-space:nowrap">→ ${dest}</td>
        ${celdas}
        <td style="${TD};text-align:right;font-family:monospace;font-weight:900;color:#f59e0b;background:rgba(245,158,11,.07)">${totM3?_amtFmt1(totM3):'—'}<div style="font-size:.58rem;color:var(--muted2);font-weight:400">${totV.toLocaleString()} viajes</div></td>
      </tr>`;
    });
  });

  _amtSemExportData={
    name:'material_destino_diario_'+fIni+'.xlsx',
    aoa:[
      ['MATERIAL → DESTINO · POR DÍA Y TURNO (m³) — '+rango],
      ['Material','Destino',...fechas.flatMap(f=>[f.dm+' ☀',f.dm+' 🌙']),'Total m³','Viajes'],
      ...materiales.flatMap(mat=>Object.keys(data[mat]).map(dest=>{
        let tm=0,tv=0;
        const cols=fechas.flatMap(f=>{const c=data[mat][dest][f.iso];if(!c)return['',''];tm+=c.m3D+c.m3N;tv+=c.vD+c.vN;return[+c.m3D.toFixed(1),+c.m3N.toFixed(1)];});
        return[mat,dest,...cols,+tm.toFixed(1),tv];
      })),
      ['TOTAL','',...fechas.flatMap(()=>['','']),+totalM3.toFixed(1),totalViajes]
    ]
  };

  body.innerHTML=_amtSemBar({rango})+`
  <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:.6rem;margin-bottom:.9rem">
    ${_amtKpi('m³ de la Semana','<b style="font-size:1.3rem">'+_amtFmt1(totalM3)+'</b>','var(--ctl)')}
    ${_amtKpi('Viajes','<b style="font-size:1.3rem">'+totalViajes.toLocaleString()+'</b>','#3b82f6')}
    ${_amtKpi('Tipos de Material','<b style="font-size:1.3rem">'+materiales.length+'</b>','#a78bfa')}
    ${_amtKpi('Destinos Alimentados','<b style="font-size:1.3rem">'+destSet.size+'</b>','#8b5cf6')}
  </div>
  <div class="card" style="padding:0">
    <div class="tbl-wrap">
    <table style="min-width:100%;border-collapse:collapse">
      <thead><tr style="background:var(--panel2)">
        <th style="${TH};text-align:left;min-width:150px">Material / Destino</th>
        ${fechas.map(f=>{const esHoy=f.iso===hoy;return`<th style="${TH};text-align:center;min-width:86px;${esHoy?'color:#f59e0b;background:rgba(245,158,11,.1)':''}">${f.lbl}<div style="font-size:.66rem;font-weight:400;font-family:monospace">${f.dm}</div></th>`;}).join('')}
        <th style="${TH};text-align:right;min-width:95px;color:#f59e0b;background:rgba(245,158,11,.08)">Total</th>
      </tr></thead>
      <tbody>${filas||`<tr><td colspan="${nCols}" style="text-align:center;padding:2.5rem;color:var(--muted2);font-size:.85rem">Sin viajes con destino en esta semana (${rango})</td></tr>`}</tbody>
      ${materiales.length?`<tfoot><tr style="background:var(--panel2);border-top:2px solid var(--border)">
        <td style="${TD};font-size:.65rem;font-weight:700;color:var(--muted2);text-transform:uppercase">TOTAL DÍA (m³)</td>
        ${fechas.map(f=>`<td style="${TD};text-align:right;font-family:monospace;font-weight:900;color:${totDia[f.iso]?'var(--ctl)':'var(--muted)'}">${totDia[f.iso]?_amtFmt1(totDia[f.iso]):'—'}</td>`).join('')}
        <td style="${TD};text-align:right;font-family:monospace;font-weight:900;font-size:.85rem;color:#f59e0b;background:rgba(245,158,11,.1)">${_amtFmt1(totalM3)}</td>
      </tr></tfoot>`:''}
    </table>
    </div>
  </div>
  `;
}

// ── TAB 8: ORIGEN → DESTINO (viajes que salen de cada frente, con material) ──
function _amtRenderSemOrigen(body){
  const info=_amtSemInfo();
  const{fIni,fFin,rango}=info;
  const TH=_AMT_TH,TD=_AMT_TD;
  // Origen: campo del viaje; si falta, se toma el inicio del tramo
  const vs=_amtSemViajes(fIni,fFin).map(v=>({...v,ori:_amtOdOri(v)}));
  _amtOdRutas=[];

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
      // Doble clic: qué días de la semana se hizo esta ruta. Se pasa un índice
      // y no los textos, para que comillas o tildes no rompan el onclick.
      const ix=_amtOdRutas.push({ori,destino:r.destino,material:r.material,col})-1;
      return`<tr ondblclick="_amtOdVer(${ix})" title="Doble clic: ver qué días se hizo esta ruta" style="cursor:pointer"
          onmouseover="this.style.background='var(--hover)'" onmouseout="this.style.background=''">
        <td style="${TD};padding-left:1.6rem;color:var(--muted2);font-size:.7rem;white-space:nowrap">↳</td>
        <td style="${TD};font-weight:700;color:var(--text);white-space:nowrap">→ ${r.destino}</td>
        <td style="${TD};font-size:.7rem;color:#a78bfa;white-space:nowrap">${r.material}</td>
        <td style="${TD};text-align:right;font-family:monospace;font-weight:700;color:#3b82f6">${r.viajes.toLocaleString()}<span style="font-size:.6rem;color:var(--muted2)"> v</span></td>
        <td style="${TD};text-align:center;font-family:monospace;font-size:.68rem"><span style="color:#f59e0b">☀ ${r.vd.toLocaleString()}</span> · <span style="color:#60a5fa">🌙 ${r.vn.toLocaleString()}</span></td>
        <td style="${TD};text-align:right;font-family:monospace;font-weight:700;color:var(--ctl)" ${r.m3?'':'title="Traslado sin material — no suma volumen"'}>${r.m3?_amtFmt1(r.m3):'—'}</td>
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
  ${origenes.length?`<div style="font-size:.68rem;color:var(--muted2);margin:0 0 .4rem .2rem">💡 Doble clic en una ruta para ver qué días de la semana se hizo</div>`:''}
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
  `;
}

// ── Detalle por día de una ruta Origen → Material → Destino ─────────────────
// Se abre con doble clic en la tabla de arriba. Usa la misma semana y el mismo
// filtro de material que la tabla, así que los totales siempre cuadran con la
// fila en la que se hizo clic.
let _amtOdRutas=[];
// Origen del viaje; si no se anotó, el inicio del tramo
function _amtOdOri(v){
  const tr=v.tramoId?(DB.tramos||[]).find(t=>t.id==v.tramoId):null;
  return v.origen||(tr?(tr.inicio||tr.codigo||''):'')||'(sin origen)';
}
// Sol amarillo y luna oscura (el emoji 🌙 sale amarillo: se apaga con filtro)
const _AMT_OD_SOL='#facc15', _AMT_OD_NOCHE='#94a3b8';
const _AMT_OD_LUNA='<span style="filter:grayscale(1) brightness(.6)">🌙</span>';
const _amtOdH=s=>String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

// Los 7 días de la semana con lo que se movió en esa ruta.
// Horas = viajes × ciclo del tramo (min, incluye demoras) ÷ 60. Cada viaje usa
// SU tramo: hay rutas con dos tramos de ciclo distinto y no se promedian.
// dias.tramos lleva el detalle para explicar de dónde salen las horas.
function _amtOdDias(ruta){
  const{fechas,fIni,fFin}=_amtSemInfo();
  const dias={};fechas.forEach(f=>dias[f.iso]={...f,vd:0,vn:0,m3:0,h:0,eqs:{}});
  const tramos={};let sinCiclo=0;
  _amtSemViajes(fIni,fFin).forEach(v=>{
    if(_amtOdOri(v)!==ruta.ori)return;
    if((v.destino||'(sin destino)')!==ruta.destino)return;
    if((v.material||'(sin material)')!==ruta.material)return;
    const d=dias[v.fecha];if(!d)return;
    if(v.noche)d.vn+=v.cant;else d.vd+=v.cant;
    d.m3+=v.m3;
    const tr=v.tramoId?(DB.tramos||[]).find(t=>t.id==v.tramoId):null;
    const cic=tr?+tr.ciclo||0:0;
    if(cic){
      d.h+=v.cant*cic/60;
      const k=tr.codigo||String(tr.id);
      if(!tramos[k])tramos[k]={codigo:k,ciclo:cic,viajes:0};
      tramos[k].viajes+=v.cant;
    }else sinCiclo+=v.cant;
    const eq=(DB.equipos||[]).find(e=>e.id==v.eqId);
    const cod=eq?(eq.codigo||eq.nombre||'?'):'(sin equipo)';
    d.eqs[cod]=(d.eqs[cod]||0)+v.cant;
  });
  const out=fechas.map(f=>dias[f.iso]);
  out.tramos=Object.values(tramos).sort((a,b)=>b.viajes-a.viajes);
  out.sinCiclo=sinCiclo;
  return out;
}
// 25.35 → "25.4 h" · menos de una hora en minutos ("39 min")
const _amtOdHoras=h=>!h?'—':h<1?Math.round(h*60)+' min':_amtFmt1(h)+' h';

function _amtOdVer(ix){
  const ruta=_amtOdRutas[ix];if(!ruta)return;
  const{rango}=_amtSemInfo();
  const dias=_amtOdDias(ruta);
  const col=ruta.col||'#3b82f6';
  const tvd=dias.reduce((s,d)=>s+d.vd,0), tvn=dias.reduce((s,d)=>s+d.vn,0), tv=tvd+tvn;
  const tm=dias.reduce((s,d)=>s+d.m3,0), conV=dias.filter(d=>d.vd+d.vn>0);
  const th=dias.reduce((s,d)=>s+d.h,0), HC='#f472b6';
  const hoy=typeof today==='function'?today():'';
  const TH=_AMT_TH,TD=_AMT_TD;
  const chip=(l,v,c)=>`<div style="flex:1;min-width:110px;border:1px solid ${c};border-radius:8px;padding:.45rem .6rem;background:var(--panel2)">
    <div style="font-size:.6rem;color:var(--muted2);font-weight:700;text-transform:uppercase;letter-spacing:.06em">${l}</div>
    <div style="font-family:monospace;font-weight:900;font-size:1.05rem;color:${c}">${v}</div></div>`;

  const filas=dias.map(d=>{
    const n=d.vd+d.vn, esHoy=d.iso===hoy;
    const eqs=Object.entries(d.eqs).sort((a,b)=>b[1]-a[1])
      .map(([c,k])=>`<span style="display:inline-block;margin:1px 3px 1px 0;padding:0 5px;border:1px solid var(--border);border-radius:4px;font-family:monospace;font-size:.62rem">${_amtOdH(c)} <b style="color:#3b82f6">${k}</b></span>`).join('');
    return`<tr style="${n?'':'opacity:.45;'}${esHoy?'background:rgba(245,158,11,.08)':''}">
      <td style="${TD};font-weight:700;white-space:nowrap">${d.lbl} <span style="font-family:monospace;color:var(--muted2);font-weight:400">${d.dm}</span></td>
      <td style="${TD};text-align:center;font-family:monospace;color:${_AMT_OD_SOL}">${d.vd||'—'}</td>
      <td style="${TD};text-align:center;font-family:monospace;color:${_AMT_OD_NOCHE}">${d.vn||'—'}</td>
      <td style="${TD};text-align:right;font-family:monospace;font-weight:900;color:#3b82f6">${n||'—'}</td>
      <td style="${TD};text-align:right;font-family:monospace;font-weight:700;color:var(--ctl)">${d.m3?_amtFmt1(d.m3):'—'}</td>
      <td style="${TD};text-align:right;font-family:monospace;font-weight:700;color:${HC};white-space:nowrap">${_amtOdHoras(d.h)}</td>
      <td style="${TD}">${eqs||'<span style="color:var(--muted2)">—</span>'}</td>
    </tr>`;
  }).join('');

  _amtOdCerrar();
  const ov=document.createElement('div');
  ov.id='amtOdOverlay';
  ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:9000;display:flex;align-items:center;justify-content:center;padding:16px';
  ov.onclick=e=>{if(e.target===ov)_amtOdCerrar();};
  ov.innerHTML=`<div style="background:var(--panel);border:1px solid ${col};border-radius:12px;width:min(820px,100%);max-height:90vh;overflow:auto;box-shadow:0 20px 50px rgba(0,0,0,.5)">
    <div style="display:flex;align-items:flex-start;gap:.6rem;padding:.8rem 1rem;border-bottom:1px solid var(--border);background:${col}14">
      <div style="flex:1">
        <div style="font-size:.62rem;color:var(--muted2);font-weight:700;text-transform:uppercase;letter-spacing:.07em">Ruta de la semana · ${rango}</div>
        <div style="font-weight:900;font-size:.95rem;color:${col};margin-top:.15rem">📤 ${_amtOdH(ruta.ori)} <span style="color:var(--muted2)">→</span> <span style="color:var(--text)">${_amtOdH(ruta.destino)}</span></div>
        <div style="font-size:.74rem;color:#a78bfa;font-weight:700;margin-top:.1rem">${_amtOdH(ruta.material)}</div>
      </div>
      <button onclick="_amtOdCerrar()" title="Cerrar (Esc)" style="background:transparent;border:1px solid var(--border);color:var(--muted2);border-radius:7px;cursor:pointer;padding:.2rem .55rem;font-size:.8rem">✕</button>
    </div>
    <div style="padding:.8rem 1rem">
      <div style="display:flex;gap:.5rem;flex-wrap:wrap;margin-bottom:.8rem">
        ${chip('Días con viajes',conV.length+' de 7',col)}
        ${chip('Viajes',tv.toLocaleString(),'#3b82f6')}
        ${chip('<span style="color:'+_AMT_OD_SOL+'">☀</span> Día / '+_AMT_OD_LUNA+' Noche','<span style="color:'+_AMT_OD_SOL+'">'+tvd+'</span> <span style="color:var(--muted2)">/</span> <span style="color:'+_AMT_OD_NOCHE+'">'+tvn+'</span>',_AMT_OD_SOL)}
        ${chip('m³',_amtFmt1(tm),'#10b981')}
        ${chip('⏱ Horas de ciclo',_amtOdHoras(th),HC)}
      </div>
      ${dias.tramos.length||dias.sinCiclo?`<div style="font-size:.68rem;color:var(--muted2);margin:-.3rem 0 .55rem;line-height:1.5">⏱ Horas = viajes × ciclo del tramo:
        ${dias.tramos.map(t=>`<b style="color:var(--text)">${_amtOdH(t.codigo)}</b> ${t.ciclo} min × ${t.viajes} v = <b style="color:${HC}">${_amtOdHoras(t.ciclo*t.viajes/60)}</b>`).join(' · ')}
        ${dias.sinCiclo?` · <span style="color:#f59e0b">${dias.sinCiclo} viaje(s) sin ciclo en su tramo: no suman horas</span>`:''}</div>`:''}
      ${conV.length?`<div style="font-size:.72rem;color:var(--muted2);margin-bottom:.5rem">Se hizo el <b style="color:var(--text)">${conV.map(d=>d.lbl+' '+d.dm).join(', ')}</b></div>`:''}
      <div class="tbl-wrap">
      <table style="width:100%;border-collapse:collapse">
        <thead><tr style="background:var(--panel2)">
          <th style="${TH};text-align:left">Día</th>
          <th style="${TH};text-align:center"><span style="color:${_AMT_OD_SOL}">☀</span> Día</th>
          <th style="${TH};text-align:center">${_AMT_OD_LUNA} Noche</th>
          <th style="${TH};text-align:right">Viajes</th>
          <th style="${TH};text-align:right">m³</th>
          <th style="${TH};text-align:right" title="Viajes × ciclo del tramo">⏱ Horas</th>
          <th style="${TH};text-align:left">Equipos (viajes)</th>
        </tr></thead>
        <tbody>${filas}</tbody>
        <tfoot><tr style="background:var(--panel2)">
          <td style="${TD};font-size:.65rem;font-weight:700;color:var(--muted2);text-transform:uppercase">Total</td>
          <td style="${TD};text-align:center;font-family:monospace;font-weight:900;color:${_AMT_OD_SOL}">${tvd}</td>
          <td style="${TD};text-align:center;font-family:monospace;font-weight:900;color:${_AMT_OD_NOCHE}">${tvn}</td>
          <td style="${TD};text-align:right;font-family:monospace;font-weight:900;color:#3b82f6">${tv.toLocaleString()}</td>
          <td style="${TD};text-align:right;font-family:monospace;font-weight:900;color:var(--ctl)">${_amtFmt1(tm)}</td>
          <td style="${TD};text-align:right;font-family:monospace;font-weight:900;color:${HC};white-space:nowrap">${_amtOdHoras(th)}</td>
          <td style="${TD}"></td>
        </tr></tfoot>
      </table>
      </div>
    </div>
  </div>`;
  document.body.appendChild(ov);
  document.addEventListener('keydown',_amtOdTecla);
}
function _amtOdTecla(e){if(e.key==='Escape')_amtOdCerrar();}
function _amtOdCerrar(){
  const o=document.getElementById('amtOdOverlay');if(o)o.remove();
  document.removeEventListener('keydown',_amtOdTecla);
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB 9: PANEL MT — resumen gráfico de la semana y del periodo (mes / trimestre)
// Mismos datos que Volumen Semanal: semana activa, filtro de material, cap. m³/viaje
// y meta semanal (las comparten todas las pestañas semanales).
// ══════════════════════════════════════════════════════════════════════════════
let _amtDashPer='mes';
try{if(localStorage.getItem('_amtDashPer')==='trim')_amtDashPer='trim';}catch(e){}
function _amtDashSetPer(v){_amtDashPer=v==='trim'?'trim':'mes';try{localStorage.setItem('_amtDashPer',_amtDashPer);}catch(e){}_amtRender();}
const _amtIso=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const _amtEsc=s=>String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

// Semanas del periodo, alineadas al día de inicio de la semana activa.
// Cada semana: {ini,fin,lbl,t (m³, o null si aún no empieza),actual}
function _amtDashSemanas(per,hoy){
  const base=new Date(_amtSemIni+'T12:00:00');
  const y=base.getFullYear(),m=base.getMonth();
  const q=per==='trim'?Math.floor(m/3)*3:m;
  const pIni=new Date(y,q,1,12),pFin=new Date(y,q+(per==='trim'?3:1),0,12);
  const s=new Date(base);
  while(s>pIni)s.setDate(s.getDate()-7);            // la semana que contiene el día 1
  const out=[];
  while(s<=pFin&&out.length<20){
    const e=new Date(s);e.setDate(s.getDate()+6);
    const ini=_amtIso(s),fin=_amtIso(e);
    const t=ini>hoy?null:_amtSemViajes(ini,fin).filter(v=>v.destino).reduce((a,v)=>a+v.m3,0);
    out.push({ini,fin,lbl:ini.slice(8,10)+'/'+ini.slice(5,7),t,actual:ini===_amtSemIni});
    s.setDate(s.getDate()+7);
  }
  const nomMes=d=>d.toLocaleString('es-PE',{month:'long'});
  const titulo=per==='trim'?`${nomMes(pIni)} – ${nomMes(pFin)} ${y}`:`${nomMes(pIni)} ${y}`;
  return{sem:out,titulo};
}

// Rejilla horizontal y etiquetas del eje Y, común a las gráficas
function _amtDashGrid(W,R,L,yMax,y){
  let out='';
  for(let g=0;g<=4;g++){
    const v=yMax*g/4,yy=y(v);
    out+=`<line x1="${L}" x2="${W-R}" y1="${yy}" y2="${yy}" style="stroke:var(--border)"/>`;
    out+=`<text x="${L-8}" y="${yy+4}" text-anchor="end" class="amtd-t">${Math.round(v).toLocaleString('es-PE')}</text>`;
  }
  return out;
}

function _amtRenderDashboard(body){
  const info=_amtSemInfo();
  const{fechas,fIni,fFin,rango}=info;
  const hoy=today(),meta=_amtMetaSem||0,fmt=v=>Math.round(v).toLocaleString('es-PE');
  const AC='#2ec4a0',MC='#d4a017';
  const vs=_amtSemViajes(fIni,fFin).filter(v=>v.destino);
  const ip=_amtSemInfo(-7);
  const prevM3=_amtSemViajes(ip.fIni,ip.fFin).filter(v=>v.destino).reduce((a,v)=>a+v.m3,0);

  const daily=fechas.map(f=>vs.filter(v=>v.fecha===f.iso).reduce((a,v)=>a+v.m3,0));
  const total=daily.reduce((a,b)=>a+b,0);
  const viajes=vs.reduce((a,v)=>a+v.cant,0);
  const byD={};vs.forEach(v=>{const d=byD[v.destino]||(byD[v.destino]={n:v.destino,t:0,v:0});d.t+=v.m3;d.v+=v.cant;});
  const dest=Object.values(byD).sort((a,b)=>b.t-a.t||b.v-a.v).map((d,i)=>({...d,c:_AMT_COLORES[i%_AMT_COLORES.length]}));
  const conM3=dest.filter(d=>d.t>0);

  const kpis=`<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:.6rem;margin-bottom:.9rem">
    ${_amtKpi('m³ de la semana','<b style="font-size:1.3rem">'+fmt(total)+' m³</b> '+_amtDelta(total,prevM3),AC)}
    ${_amtKpi('Viajes','<b style="font-size:1.3rem">'+viajes.toLocaleString('es-PE')+'</b>','#3b82f6')}
    ${_amtKpi('m³ por viaje','<b style="font-size:1.3rem">'+(viajes?(total/viajes).toFixed(1)+' m³':'—')+'</b>','#8b5cf6')}
    ${_amtKpi('Destinos activos','<b style="font-size:1.3rem">'+dest.length+'</b>',MC)}
  </div>`;

  // ── Curva S de la semana vs meta lineal ──
  let sSvg;
  {
    const W=560,H=300,L=56,R=16,T=22,B=40;
    const yMax=Math.max(meta,total,1)*1.08;
    const x=i=>L+(W-L-R)*i/6, y=v=>T+(H-T-B)*(1-v/yMax);
    let o=_amtDashGrid(W,R,L,yMax,y);
    fechas.forEach((f,i)=>{o+=`<text x="${x(i)}" y="${H-B+18}" text-anchor="middle" class="amtd-t"${f.iso===hoy?' style="font-weight:700;fill:var(--text)"':''}>${f.lbl} ${f.dm}</text>`;});
    if(meta>0){
      const pl=fechas.map((_,i)=>`${x(i)},${y(meta*(i+1)/7)}`).join(' ');
      o+=`<polyline fill="none" style="stroke:var(--muted2)" stroke-dasharray="6 5" stroke-width="2" points="${pl}"/>`;
    }
    let cum=0;const pts=[];
    fechas.forEach((f,i)=>{if(f.iso>hoy)return;cum+=daily[i];pts.push([x(i),y(cum),cum]);});
    if(pts.length){
      const area=`M${pts[0][0]},${y(0)} `+pts.map(p=>`L${p[0]},${p[1]}`).join(' ')+` L${pts[pts.length-1][0]},${y(0)} Z`;
      o+=`<path d="${area}" fill="${AC}" opacity=".12"/>`;
      o+=`<polyline fill="none" stroke="${AC}" stroke-width="2.5" points="${pts.map(p=>p[0]+','+p[1]).join(' ')}"/>`;
      pts.forEach(p=>{o+=`<circle cx="${p[0]}" cy="${p[1]}" r="3.5" fill="${AC}"><title>${fmt(p[2])} m³ acumulados</title></circle>`;});
      const last=pts[pts.length-1];
      o+=`<text x="${last[0]-8}" y="${last[1]-10}" text-anchor="end" style="fill:var(--text);font-weight:700;font-size:12px">${fmt(last[2])}</text>`;
    }
    o+=`<text x="${W-R}" y="${T-8}" text-anchor="end" class="amtd-t">${meta>0?`Avance: ${Math.round(total/meta*100)}% de la meta · punteada = meta lineal`:'Sin meta: escríbala en «🎯 Meta m³/sem»'}</text>`;
    sSvg=`<svg viewBox="0 0 ${W} ${H}" width="100%">${o}</svg>`;
  }

  // ── Participación por destino (dona) ──
  let dona='<div style="font-size:.78rem;color:var(--muted2);padding:2rem 0;text-align:center">Sin volumen en esta semana</div>';
  if(total>0){
    const Cf=2*Math.PI*90;let off=0,o='';
    conM3.forEach(d=>{
      const len=Cf*d.t/total;
      o+=`<circle cx="120" cy="120" r="90" fill="none" stroke="${d.c}" stroke-width="30" stroke-dasharray="${len} ${Cf-len}" stroke-dashoffset="${-off}" transform="rotate(-90 120 120)"><title>${_amtEsc(d.n)}: ${fmt(d.t)} m³</title></circle>`;
      off+=len;
    });
    o+=`<text x="120" y="118" text-anchor="middle" style="fill:var(--text);font-size:20px;font-weight:700">${fmt(total)}</text>`;
    o+=`<text x="120" y="136" text-anchor="middle" class="amtd-t">m³ semana</text>`;
    dona=`<svg viewBox="0 0 240 240" width="200" style="display:block;margin:0 auto">${o}</svg>
      <div style="display:grid;gap:.35rem;margin-top:.7rem">${conM3.map(d=>`<div style="display:flex;align-items:center;gap:.5rem;font-size:.74rem">
        <span style="width:10px;height:10px;border-radius:2px;background:${d.c};flex:none"></span><span style="flex:1">${_amtEsc(d.n)}</span>
        <span style="font-variant-numeric:tabular-nums;font-family:monospace;color:var(--text)">${fmt(d.t)} · ${(d.t/total*100).toFixed(1)}%</span></div>`).join('')}</div>`;
  }

  // ── Periodo: histograma semanal + curva S acumulada ──
  const P=_amtDashSemanas(_amtDashPer,hoy),S=P.sem,n=S.length;
  let hist,sc;
  {
    const W=560,H=280,L=56,R=16,T=22,B=44;
    const yMax=(Math.max(meta,...S.map(s=>s.t||0))*1.1)||1;
    const y=v=>T+(H-T-B)*(1-v/yMax), bw=(W-L-R)/Math.max(n,1);
    let o=_amtDashGrid(W,R,L,yMax,y);
    S.forEach((s,i)=>{
      const cx=L+bw*i+bw/2,w=bw*.6;
      if(s.t!=null){
        const yy=y(s.t);
        o+=`<rect x="${cx-w/2}" y="${yy}" width="${w}" height="${Math.max(0,y(0)-yy)}" rx="3" fill="${AC}" opacity="${s.actual?1:.55}"><title>${s.lbl} → ${s.fin.slice(8,10)}/${s.fin.slice(5,7)}: ${fmt(s.t)} m³</title></rect>`;
        o+=`<text x="${cx}" y="${yy-6}" text-anchor="middle" style="fill:var(--text);font-size:11px">${fmt(s.t)}</text>`;
      }else o+=`<text x="${cx}" y="${y(0)-6}" text-anchor="middle" class="amtd-t">—</text>`;
      o+=`<text x="${cx}" y="${H-B+16}" text-anchor="middle" class="amtd-t"${s.actual?' style="font-weight:700;fill:var(--text)"':''}>${s.lbl}</text>`;
    });
    if(meta>0){
      const yy=y(meta);
      o+=`<line x1="${L}" x2="${W-R}" y1="${yy}" y2="${yy}" stroke="${MC}" stroke-dasharray="6 5" stroke-width="2"/>`;
      o+=`<text x="${W-R}" y="${yy-6}" text-anchor="end" style="fill:${MC};font-size:11px">meta semanal</text>`;
    }
    hist=`<svg viewBox="0 0 ${W} ${H}" width="100%">${o}</svg>`;

    let cum=0;const real=[];
    S.forEach((s,i)=>{if(s.t!=null){cum+=s.t;real.push({i,v:cum});}});
    const yMax2=(Math.max(meta*n,cum)*1.1)||1;
    const y2=v=>T+(H-T-B)*(1-v/yMax2), x2=i=>L+(W-L-R)*(n>1?i/(n-1):.5);
    let o2=_amtDashGrid(W,R,L,yMax2,y2);
    S.forEach((s,i)=>{o2+=`<text x="${x2(i)}" y="${H-B+16}" text-anchor="middle" class="amtd-t">${s.lbl}</text>`;});
    if(meta>0)o2+=`<polyline fill="none" style="stroke:var(--muted2)" stroke-dasharray="6 5" stroke-width="2" points="${S.map((_,i)=>`${x2(i)},${y2(meta*(i+1))}`).join(' ')}"/>`;
    if(real.length){
      o2+=`<polyline fill="none" stroke="${AC}" stroke-width="2.5" points="${real.map(p=>x2(p.i)+','+y2(p.v)).join(' ')}"/>`;
      real.forEach(p=>{o2+=`<circle cx="${x2(p.i)}" cy="${y2(p.v)}" r="3.5" fill="${AC}"><title>${fmt(p.v)} m³ acumulados</title></circle>`;});
      const last=real[real.length-1];
      o2+=`<text x="${x2(last.i)-8}" y="${y2(last.v)-10}" text-anchor="end" style="fill:var(--text);font-weight:700;font-size:12px">${fmt(last.v)}</text>`;
      if(meta>0)o2+=`<text x="${W-R}" y="${T-8}" text-anchor="end" class="amtd-t">Acumulado: ${Math.round(last.v/(meta*n)*100)}% de la meta del periodo (${fmt(meta*n)} m³)</text>`;
    }
    sc=`<svg viewBox="0 0 ${W} ${H}" width="100%">${o2}</svg>`;
  }

  // ── Ranking de destinos ──
  const mx=Math.max(1,...dest.map(d=>d.t));
  const rank=dest.length?dest.map(d=>`<div style="display:flex;align-items:center;gap:.6rem;font-size:.75rem;min-width:420px">
      <span style="width:10px;height:10px;border-radius:2px;background:${d.c};flex:none"></span>
      <span style="width:200px;flex:none;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${_amtEsc(d.n)}">${_amtEsc(d.n)}</span>
      <div style="height:8px;background:var(--panel2);border-radius:4px;overflow:hidden;flex:1;min-width:60px"><i style="display:block;height:100%;width:${d.t/mx*100}%;background:${d.c}"></i></div>
      <span style="font-family:monospace;font-variant-numeric:tabular-nums;min-width:150px;text-align:right">${fmt(d.t)} m³ · ${d.v.toLocaleString('es-PE')} v</span></div>`).join('')
    :'<div style="font-size:.78rem;color:var(--muted2)">Sin viajes en esta semana</div>';

  const card='background:var(--panel);border:1px solid var(--border);border-radius:10px;padding:1rem;min-width:0';
  const h2='font-size:.8rem;font-weight:700;margin:0 0 .7rem;color:var(--text)';
  const selS='font-size:.72rem;padding:.2rem .4rem;border-radius:5px;border:1px solid var(--border);background:var(--panel2);color:var(--text)';

  _amtSemExportData={name:'panel_mt_'+fIni+'.xlsx',aoa:[
    ['PANEL MT — semana '+rango],
    ['Día',...fechas.map(f=>f.lbl+' '+f.dm),'Total'],
    ['m³',...daily.map(v=>+v.toFixed(1)),+total.toFixed(1)],
    [],['Destino','m³','Viajes','%'],
    ...dest.map(d=>[d.n,+d.t.toFixed(1),d.v,total?+(d.t/total*100).toFixed(1):0]),
    [],['Periodo: '+P.titulo],['Semana desde','Hasta','m³','Meta'],
    ...S.map(s=>[s.ini,s.fin,s.t==null?'':+s.t.toFixed(1),meta||''])
  ]};

  body.innerHTML=`<style>.amtd-t{fill:var(--muted2);font-size:11px}</style>
    ${_amtSemBar({rango,meta:true})}
    ${kpis}
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,340px),1fr));gap:.9rem">
      <div style="${card}"><h2 style="${h2}">Curva S de la semana vs. meta</h2>${sSvg}</div>
      <div style="${card}"><h2 style="${h2}">Participación por destino</h2>${dona}</div>
      <div style="${card};grid-column:1/-1">
        <div style="display:flex;align-items:center;gap:.6rem;flex-wrap:wrap;margin-bottom:.7rem">
          <h2 style="${h2};margin:0">Avance por semana: histograma y curva S del periodo</h2>
          <select onchange="_amtDashSetPer(this.value)" style="${selS}">
            <option value="mes"${_amtDashPer==='mes'?' selected':''}>Mes</option>
            <option value="trim"${_amtDashPer==='trim'?' selected':''}>Trimestre</option>
          </select>
          <span style="font-size:.72rem;color:var(--muted2);text-transform:capitalize">${P.titulo}</span>
          <span style="font-size:.66rem;color:var(--muted2)">· la barra fuerte es la semana elegida arriba</span>
        </div>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,340px),1fr));gap:.9rem">${hist}${sc}</div>
      </div>
      <div style="${card};grid-column:1/-1"><h2 style="${h2}">Ranking de destinos (m³ de la semana)</h2><div style="display:grid;gap:.5rem;overflow-x:auto">${rank}</div></div>
    </div>`;
}
