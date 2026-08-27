// ══ ACTIVIDADES DE TRABAJO EN LA VISTA PLANTA (Recrecimiento) ═══════════════
// Define actividades del WBS sobre el plano de planta de cada dique:
//
//   1 · Panel lateral 🎯 Actividades → se elige una y se hace clic en el plano
//   2 · Queda un marcador con su CÓDIGO (p. ej. LPF)
//   3 · Clic en el marcador → panel de avance, igual que el de las capas
//
// Sigue el mismo patrón que los elementos verticales (piezómetros / kenas): la
// posición es por dique y relativa a la foto de planta. Dos tablas:
//   wbs_mapa   → dónde está la actividad   (id, wbs_id, dique, x, y)
//   wbs_avance → qué se avanzó y cuándo    (id, wbs_id, fecha, cant, guardia, turno, notas)

const _WBS_COL='#f59e0b';
let _wbsSel=null;          // actividad elegida, a la espera del clic en el plano
let _wbsBuscar='';
let _wbsAvEditId=null;

const _wbsEsc=s=>String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const _wbsN=(v,d)=>Number(v||0).toLocaleString('es-PE',{minimumFractionDigits:d==null?2:d,maximumFractionDigits:d==null?2:d});
const _wbsNorm=s=>String(s||'').toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^A-Z0-9]+/g,' ').trim();
const _wbsDe=id=>(DB.lpsWbs||[]).find(w=>+w.id===+id)||null;
const _wbsLbl=w=>w?(w.desc||w.nombre||w.codigo||'Actividad'):'Actividad';
// En el plano solo entra un código corto. Orden: la abreviatura que puso el
// usuario → el número de la partida (02.01.02) → las iniciales de las palabras
// con peso. El texto completo queda en el tooltip y en el panel.
function _wbsAbrev(w){
  if(!w)return'WBS';
  const a=String(w.abrev||'').trim();
  if(a)return a.toUpperCase().slice(0,12);
  const num=String(w.codigo||'').match(/^[\d]+(?:\.[\d]+)*/);
  if(num&&num[0].length>=3)return num[0].replace(/\.$/,'');
  const IGNORA=['DE','DEL','LA','EL','LOS','LAS','EN','CON','Y','A','POR','PARA','ZONA'];
  const pal=_wbsNorm(w.desc||w.codigo||'').split(' ').filter(p=>p.length>2&&!IGNORA.includes(p));
  if(pal.length)return pal.slice(0,3).map(p=>p[0]).join('');
  return'WBS';
}
// Marcadores del dique que se está viendo
const _wbsEnPlano=()=>(DB.wbsMapa||[]).filter(m=>m.dique===_recDique);

// Avance acumulado de una actividad
function _wbsAcum(wbsId){
  const es=(DB.wbsAvance||[]).filter(e=>+e.wbsId===+wbsId);
  const cant=es.reduce((s,e)=>s+(+e.cant||0),0);
  const w=_wbsDe(wbsId);
  const tot=+(w&&w.cantTotal)||0;
  return{entradas:es,cant:+cant.toFixed(4),total:tot,
    pct:tot>0?Math.min(100,+(cant/tot*100).toFixed(2)):0};
}

// ── Panel lateral ──────────────────────────────────────────────────────────
function _wbsSetBuscar(v){_wbsBuscar=v;const l=document.getElementById('wbsPalLista');if(l)l.innerHTML=_wbsPaletaLista();}
function _wbsElegir(id){
  _wbsSel=(+_wbsSel===+id)?null:+id;
  if(_wbsSel){_recColocando='wbs';if(typeof _recCancelarDraw==='function'&&_recDibujando)_recCancelarDraw();}
  else if(_recColocando==='wbs')_recColocando=null;
  rRecrecimiento();
}
function _wbsCancelar(){_wbsSel=null;if(_recColocando==='wbs')_recColocando=null;rRecrecimiento();}

function _wbsPaletaLista(){
  const q=_wbsNorm(_wbsBuscar);
  const puestas=new Set(_wbsEnPlano().map(m=>+m.wbsId));
  let lista=(DB.lpsWbs||[]).slice();
  if(q)lista=lista.filter(w=>_wbsNorm(`${w.codigo} ${_wbsLbl(w)}`).includes(q));
  lista.sort((a,b)=>String(a.codigo||'').localeCompare(String(b.codigo||''),'es'));
  if(!lista.length)return'<div style="color:var(--muted2);font-size:.58rem;text-align:center;padding:.5rem">Sin actividades en el WBS</div>';
  return lista.map(w=>{
    const A=_wbsAcum(w.id);
    const ya=puestas.has(+w.id);
    const sel=+_wbsSel===+w.id;
    return`<div onclick="_wbsElegir(${w.id})" title="${_wbsEsc(_wbsLbl(w))}${ya?' · ya está en el plano':' · elígela y haz clic en el plano'}"
      style="cursor:pointer;padding:.22rem .32rem;border-radius:5px;border:1px solid ${sel?_WBS_COL:(ya?_WBS_COL+'50':'var(--border)')};background:${sel?_WBS_COL+'25':(ya?_WBS_COL+'10':'transparent')}">
      <div style="display:flex;align-items:center;gap:.28rem">
        <span style="font-size:.65rem">${ya?'🎯':'⬚'}</span>
        <span style="font-size:.6rem;font-weight:800;color:${_WBS_COL};font-family:monospace">${_wbsEsc(_wbsAbrev(w))}</span>
        <span style="font-size:.52rem;color:var(--muted2);margin-left:auto;font-family:monospace">${A.total>0?A.pct.toFixed(0)+'%':'—'}</span>
      </div>
      <div style="font-size:.52rem;color:var(--muted2);padding-left:14px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${_wbsEsc(w.codigo||_wbsLbl(w))}</div>
    </div>`;
  }).join('');
}
function _wbsPanelHTML(){
  const n=_wbsEnPlano().length;
  const w=_wbsSel?_wbsDe(_wbsSel):null;
  return`<div style="background:var(--panel);border:1px solid ${_wbsSel?_WBS_COL+'60':'rgba(255,255,255,.06)'};border-radius:7px;padding:.4rem .5rem;margin-bottom:.3rem">
    <div style="font-size:.58rem;color:${_wbsSel?_WBS_COL:'var(--muted2)'};margin-bottom:.3rem;font-weight:${_wbsSel?'700':'400'}">
      ${_wbsSel?'🎯 Clic en el plano para ubicar <b>'+_wbsEsc(_wbsAbrev(w))+'</b>':'🎯 Actividades · '+n+' en este dique'}
    </div>
    <input placeholder="Buscar código o actividad..." value="${_wbsEsc(_wbsBuscar)}" oninput="_wbsSetBuscar(this.value)"
      style="width:100%;box-sizing:border-box;background:var(--panel2);border:1px solid var(--border);border-radius:5px;padding:.22rem .4rem;color:var(--text);font-size:.6rem;outline:none;margin-bottom:.3rem">
    <div id="wbsPalLista" style="display:flex;flex-direction:column;gap:.18rem;max-height:150px;overflow-y:auto">${_wbsPaletaLista()}</div>
    ${_wbsSel?`<button onclick="_wbsCancelar()" style="width:100%;margin-top:.3rem;padding:.2rem;border-radius:5px;border:1px solid var(--border);background:none;color:var(--muted2);cursor:pointer;font-size:.58rem">✕ Cancelar</button>`:''}
  </div>`;
}

// ── Colocar en el plano ────────────────────────────────────────────────────
async function _wbsCrearEnPlano(xPct,yPct){
  if(!_wbsSel)return;
  const wbsId=+_wbsSel;
  // Sin abreviatura el rótulo saldría con la descripción entera: se pide aquí
  const _w=_wbsDe(wbsId);
  if(_w&&!String(_w.abrev||'').trim()){
    const v=prompt('Código corto para rotular en el plano (máx. 12):\n\n'+(_w.codigo||''),_wbsAbrev(_w));
    if(v===null){_wbsSel=null;_recColocando=null;rRecrecimiento();return;}
    _w.abrev=String(v).trim().toUpperCase().slice(0,12);
    if(typeof syncSheet==='function')syncSheet('saveLpsWbs',_w);
  }
  const x=+xPct.toFixed(2),y=+yPct.toFixed(2);
  const ya=(DB.wbsMapa||[]).find(m=>+m.wbsId===wbsId&&m.dique===_recDique);
  if(ya){                                   // ya estaba: se reubica, no se duplica
    const prev={x:ya.x,y:ya.y};
    ya.x=x;ya.y=y;
    const err=await supaUpsert('wbsMapa',ya);
    if(err){ya.x=prev.x;ya.y=prev.y;return;}
  }else{
    const rec={id:nidSeguro('wmap','wbsMapa'),wbsId,dique:_recDique,x,y};
    (DB.wbsMapa=DB.wbsMapa||[]).push(rec);
    const err=await supaUpsert('wbsMapa',rec);
    if(err){DB.wbsMapa=DB.wbsMapa.filter(m=>m.id!==rec.id);return;}
  }
  const w=_wbsDe(wbsId);
  _wbsSel=null;_recColocando=null;
  rRecrecimiento();
  toast('✓ '+((w&&w.codigo)||'Actividad')+' ubicada en el plano');
}

// ── Marcadores sobre el SVG de la planta ───────────────────────────────────
function _wbsRenderSvg(){
  const svg=document.getElementById('recSvg');if(!svg)return;
  svg.querySelectorAll('.wbs-marca').forEach(el=>el.remove());
  if(_recVista!=='planta')return;
  const W=svg.clientWidth,H=svg.clientHeight;if(!W||!H)return;
  const z=_recZoom||1;
  _wbsEnPlano().forEach(m=>{
    const w=_wbsDe(m.wbsId);if(!w)return;
    const A=_wbsAcum(m.wbsId);
    const cx=+m.x*W/100,cy=+m.y*H/100;
    const rad=Math.max(7/z,5);
    const g=document.createElementNS('http://www.w3.org/2000/svg','g');
    g.classList.add('wbs-marca');
    g.setAttribute('pointer-events','auto');
    g.style.cursor='pointer';
    g.addEventListener('click',ev=>{ev.stopPropagation();_wbsAvancePanel(m.wbsId);});

    const rombo=document.createElementNS('http://www.w3.org/2000/svg','polygon');
    rombo.setAttribute('points',`${cx},${cy-rad} ${cx+rad},${cy} ${cx},${cy+rad} ${cx-rad},${cy}`);
    rombo.setAttribute('fill',A.pct>=100?'#10b981':_WBS_COL);
    rombo.setAttribute('fill-opacity','.9');
    rombo.setAttribute('stroke','#fff');
    rombo.setAttribute('stroke-width',(1.5/z).toFixed(2));
    g.appendChild(rombo);

    const txt=document.createElementNS('http://www.w3.org/2000/svg','text');
    txt.setAttribute('x',cx);txt.setAttribute('y',cy-rad-4);
    txt.setAttribute('font-size',Math.max(9/z,7).toFixed(1));
    txt.setAttribute('font-weight','800');
    txt.setAttribute('fill',A.pct>=100?'#10b981':_WBS_COL);
    txt.setAttribute('stroke','#000');txt.setAttribute('stroke-width',(2.5/z).toFixed(2));
    txt.setAttribute('paint-order','stroke');
    txt.setAttribute('text-anchor','middle');txt.setAttribute('font-family','sans-serif');
    txt.setAttribute('pointer-events','none');
    txt.textContent=_wbsAbrev(w)+(A.total>0?' '+A.pct.toFixed(0)+'%':'');
    const tip=document.createElementNS('http://www.w3.org/2000/svg','title');
    tip.textContent=(w.codigo||'')+(w.desc?' · '+w.desc:'');
    g.appendChild(tip);
    g.appendChild(txt);
    svg.appendChild(g);
  });
}

// ── Panel de avance (mismo modelo que el historial de capas) ───────────────
function _wbsAvancePanel(wbsId){
  const old=document.getElementById('wbsAvPanel');if(old)old.remove();
  const w=_wbsDe(wbsId);
  if(!w){toast('La actividad ya no existe en el WBS',true);return;}
  _wbsAvEditId=null;
  const ov=document.createElement('div');
  ov.id='wbsAvPanel';
  ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:9998;display:flex;align-items:center;justify-content:center;padding:1rem';
  ov.onclick=e=>{if(e.target===ov)ov.remove();};
  ov.innerHTML=`<div style="background:var(--panel);border:1px solid var(--border);border-radius:12px;width:min(640px,100%);max-height:88vh;overflow:auto;box-shadow:0 12px 48px rgba(0,0,0,.7)">
    <div style="display:flex;align-items:center;gap:.6rem;padding:.8rem 1rem;border-bottom:1px solid var(--border)">
      <span style="font-size:1.1rem">🎯</span>
      <div style="flex:1;min-width:0">
        <div style="font-size:.9rem;font-weight:800;color:${_WBS_COL};font-family:monospace">${_wbsEsc(_wbsAbrev(w))}
          <button onclick="_wbsCambiarAbrev(${w.id})" title="Cambiar la abreviatura con la que se rotula en el plano" style="background:none;border:1px solid ${_WBS_COL}50;border-radius:5px;color:${_WBS_COL};cursor:pointer;font-size:.6rem;padding:0 .3rem;vertical-align:middle">✏</button></div>
        <div style="font-size:.72rem;color:var(--muted2);overflow:hidden;text-overflow:ellipsis">${_wbsEsc(w.codigo||_wbsLbl(w))}</div>
      </div>
      <button onclick="document.getElementById('wbsAvPanel').remove()" style="background:none;border:none;color:var(--muted2);font-size:1.1rem;cursor:pointer">✕</button>
    </div>
    <div id="wbsAvBody" style="padding:.9rem 1rem"></div>
  </div>`;
  document.body.appendChild(ov);
  _wbsAvRender(wbsId);
}

function _wbsAvRender(wbsId){
  const c=document.getElementById('wbsAvBody');if(!c)return;
  const w=_wbsDe(wbsId);
  const A=_wbsAcum(wbsId);
  const un=w.unidad||'und';
  const inp='width:100%;box-sizing:border-box;background:var(--panel2);border:1px solid var(--border);border-radius:6px;padding:.32rem .5rem;color:var(--text);font-size:.78rem;outline:none';
  const lb='font-size:.58rem;color:var(--muted2);text-transform:uppercase;letter-spacing:.07em;font-weight:700;display:block;margin-bottom:.15rem';
  const ed=_wbsAvEditId?(DB.wbsAvance||[]).find(e=>+e.id===+_wbsAvEditId):null;
  const TD='padding:.3rem .45rem;border-bottom:1px solid var(--border);font-size:.72rem';

  const hist=A.entradas.slice().sort((a,b)=>String(a.fecha).localeCompare(String(b.fecha))).map(e=>`<tr>
    <td style="${TD};font-family:monospace">${_wbsEsc(e.fecha)}</td>
    <td style="${TD};text-align:center;font-size:.64rem;color:var(--muted2)">${_wbsEsc(e.guardia||'—')}/${_wbsEsc(e.turno||'—')}</td>
    <td style="${TD};text-align:right;font-family:monospace;font-weight:700;color:${_WBS_COL}">${_wbsN(e.cant)}</td>
    <td style="${TD};max-width:170px;overflow:hidden;text-overflow:ellipsis;color:var(--muted2);font-size:.66rem" title="${_wbsEsc(e.notas||'')}">${_wbsEsc(e.notas||'—')}</td>
    <td style="${TD};text-align:right;white-space:nowrap">
      <button onclick="_wbsAvEditar(${e.id},${wbsId})" style="background:none;border:1px solid #f59e0b50;border-radius:5px;color:#f59e0b;cursor:pointer;font-size:.7rem;padding:.1rem .35rem">✏</button>
      <button onclick="_wbsAvBorrar(${e.id},${wbsId})" style="background:none;border:1px solid #ef444450;border-radius:5px;color:#ef4444;cursor:pointer;font-size:.7rem;padding:.1rem .35rem;margin-left:.2rem">🗑</button>
    </td>
  </tr>`).join('');

  c.innerHTML=`
    <div style="display:flex;gap:.5rem;flex-wrap:wrap;margin-bottom:.8rem">
      <div style="flex:1;min-width:120px;background:var(--panel2);border:1px solid var(--border);border-left:3px solid ${_WBS_COL};border-radius:8px;padding:.45rem .6rem">
        <div style="font-size:.55rem;color:var(--muted2);text-transform:uppercase;letter-spacing:.07em;font-weight:700">Ejecutado</div>
        <div style="font-size:1rem;font-weight:900;font-family:monospace;color:${_WBS_COL}">${_wbsN(A.cant)} <span style="font-size:.62rem;color:var(--muted2)">${_wbsEsc(un)}</span></div>
      </div>
      <div style="flex:1;min-width:120px;background:var(--panel2);border:1px solid var(--border);border-left:3px solid var(--muted2);border-radius:8px;padding:.45rem .6rem">
        <div style="font-size:.55rem;color:var(--muted2);text-transform:uppercase;letter-spacing:.07em;font-weight:700">Metrado total</div>
        <div style="font-size:1rem;font-weight:900;font-family:monospace">${A.total>0?_wbsN(A.total):'—'} <span style="font-size:.62rem;color:var(--muted2)">${_wbsEsc(un)}</span></div>
      </div>
      <div style="flex:1;min-width:120px;background:var(--panel2);border:1px solid var(--border);border-left:3px solid #10b981;border-radius:8px;padding:.45rem .6rem">
        <div style="font-size:.55rem;color:var(--muted2);text-transform:uppercase;letter-spacing:.07em;font-weight:700">Avance</div>
        <div style="font-size:1rem;font-weight:900;font-family:monospace;color:#10b981">${A.total>0?A.pct.toFixed(2)+' %':'—'}</div>
      </div>
    </div>
    ${A.total<=0?`<div style="font-size:.66rem;color:#fbbf24;background:rgba(245,158,11,.08);border:1px solid rgba(245,158,11,.3);border-radius:7px;padding:.35rem .55rem;margin-bottom:.7rem">⚠ Esta actividad no tiene metrado total en el WBS: se registra la cantidad, pero no se puede calcular el %</div>`:''}

    <div style="background:var(--panel2);border:1px solid var(--border);border-radius:9px;padding:.7rem;margin-bottom:.8rem">
      <div style="font-size:.68rem;font-weight:800;margin-bottom:.5rem">${ed?'✏️ Editando el avance del '+_wbsEsc(ed.fecha):'＋ Registrar avance'}</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(115px,1fr));gap:.5rem">
        <div><label style="${lb}">Fecha</label><input type="date" id="wbsAvFecha" value="${ed?_wbsEsc(ed.fecha):today()}" style="${inp}"></div>
        <div><label style="${lb}">Cantidad (${_wbsEsc(un)})</label><input type="number" step="0.01" id="wbsAvCant" value="${ed?ed.cant:''}" placeholder="0.00" style="${inp}"></div>
        <div><label style="${lb}">Guardia</label><select id="wbsAvGuardia" style="${inp}"><option value="">—</option>${['A','B','C'].map(g=>`<option ${ed&&ed.guardia===g?'selected':''}>${g}</option>`).join('')}</select></div>
        <div><label style="${lb}">Turno</label><select id="wbsAvTurno" style="${inp}"><option value="">—</option>${['DIA','NOCHE'].map(t=>`<option ${ed&&ed.turno===t?'selected':''}>${t}</option>`).join('')}</select></div>
        <div style="grid-column:1/-1"><label style="${lb}">Notas</label><input id="wbsAvNotas" value="${ed?_wbsEsc(ed.notas||''):''}" placeholder="Opcional" style="${inp}"></div>
      </div>
      <div style="display:flex;gap:.4rem;margin-top:.6rem">
        <button onclick="_wbsAvGuardar(${wbsId})" style="flex:1;background:${_WBS_COL};border:none;border-radius:7px;color:#111;padding:.35rem;font-size:.75rem;font-weight:800;cursor:pointer">💾 ${ed?'Actualizar':'Guardar avance'}</button>
        ${ed?`<button onclick="_wbsAvEditId=null;_wbsAvRender(${wbsId})" style="background:transparent;border:1px solid var(--border);border-radius:7px;color:var(--muted2);padding:.35rem .8rem;font-size:.75rem;cursor:pointer">Cancelar</button>`:''}
      </div>
    </div>

    <div style="font-size:.66rem;font-weight:700;color:var(--muted2);text-transform:uppercase;letter-spacing:.06em;margin-bottom:.3rem">Historial · ${A.entradas.length} registro(s)</div>
    <div style="max-height:200px;overflow:auto;border:1px solid var(--border);border-radius:8px">
      <table style="width:100%;border-collapse:collapse"><tbody>${hist||`<tr><td style="${TD};text-align:center;color:var(--muted2);padding:1.2rem">Todavía sin avances registrados</td></tr>`}</tbody></table>
    </div>

    <button onclick="_wbsQuitarDelPlano(${wbsId})" style="width:100%;margin-top:.7rem;background:transparent;border:1px solid #ef444440;border-radius:7px;color:#ef4444;padding:.3rem;font-size:.68rem;cursor:pointer">✕ Quitar del plano (los avances se conservan)</button>`;
}

function _wbsAvEditar(id,wbsId){_wbsAvEditId=id;_wbsAvRender(wbsId);}

// Permite corregir la abreviatura sin salir del plano
function _wbsCambiarAbrev(wbsId){
  const w=_wbsDe(wbsId);if(!w)return;
  const v=prompt('Abreviatura con la que se rotula en el plano (máx. 12):',_wbsAbrev(w));
  if(v===null)return;
  w.abrev=String(v).trim().toUpperCase().slice(0,12);
  if(typeof syncSheet==='function')syncSheet('saveLpsWbs',w);
  _wbsAvRender(wbsId);
  _wbsRenderSvg();
  const l=document.getElementById('wbsPalLista');if(l)l.innerHTML=_wbsPaletaLista();
}

async function _wbsAvGuardar(wbsId){
  const g=id=>(document.getElementById(id)||{}).value||'';
  const fecha=g('wbsAvFecha');
  const cant=+g('wbsAvCant');
  if(!fecha){toast('Elija la fecha',true);return;}
  if(!(cant>0)){toast('La cantidad debe ser mayor a 0',true);return;}
  const datos={wbsId:+wbsId,fecha,cant,guardia:g('wbsAvGuardia')||null,
    turno:g('wbsAvTurno')||null,notas:g('wbsAvNotas').trim()||null};

  if(_wbsAvEditId){
    const e=(DB.wbsAvance||[]).find(x=>+x.id===+_wbsAvEditId);
    if(!e){_wbsAvEditId=null;return;}
    const prev={...e};
    Object.assign(e,datos);
    const err=await supaUpsert('wbsAvance',e);
    if(err){Object.assign(e,prev);return;}
    _wbsAvEditId=null;toast('Avance actualizado');
  }else{
    const rec={id:nidSeguro('wav','wbsAvance'),...datos};
    (DB.wbsAvance=DB.wbsAvance||[]).push(rec);
    const err=await supaUpsert('wbsAvance',rec);
    if(err){DB.wbsAvance=DB.wbsAvance.filter(x=>x.id!==rec.id);return;}
    toast('Avance registrado');
  }
  _wbsSyncPct(wbsId);
  _wbsAvRender(wbsId);
  _wbsRenderSvg();
}

async function _wbsAvBorrar(id,wbsId){
  if(!confirm('¿Eliminar este registro de avance?'))return;
  DB.wbsAvance=(DB.wbsAvance||[]).filter(x=>+x.id!==+id);
  await supaDelete('wbsAvance',id);
  _wbsSyncPct(wbsId);
  _wbsAvRender(wbsId);
  _wbsRenderSvg();
}

// El % de la actividad queda en el propio WBS para que el LPS lo vea
function _wbsSyncPct(wbsId){
  const w=_wbsDe(wbsId);if(!w)return;
  const A=_wbsAcum(wbsId);
  if(A.total<=0)return;
  w.pctAvance=A.pct;
  if(typeof syncSheet==='function')syncSheet('saveLpsWbs',w);
}

async function _wbsQuitarDelPlano(wbsId){
  if(!confirm('¿Quitar la actividad del plano? Los avances registrados se conservan.'))return;
  const m=(DB.wbsMapa||[]).find(x=>+x.wbsId===+wbsId&&x.dique===_recDique);
  if(m){
    DB.wbsMapa=DB.wbsMapa.filter(x=>x.id!==m.id);
    await supaDelete('wbsMapa',m.id);
  }
  const p=document.getElementById('wbsAvPanel');if(p)p.remove();
  rRecrecimiento();
}
