// ══════════════════════════════════════════════════════════════════════════
//  OPERACIONES · SUPERVISIÓN — PARTES DE TURNO DEL DÍA
//
//  La oficina revisa aquí lo que la gente de campo registró en «Parte de
//  Turno»: un día a la vez, con sus totales arriba y una tarjeta por parte.
//
//  Los partes NO se cargan al iniciar el sistema: se piden a Supabase solo los
//  del día elegido, al abrir la pantalla o al cambiar de fecha.
//
//  El documento y el PDF son los mismos del formulario (js/parteTurno.js):
//  _ptVerDoc(r), _ptCompartirPdf(r), _ptEsc, _ptFechaLarga, _ptHoy.
//
//  Reemplaza a la antigua tabla «Reportes de Supervisión», que nunca tuvo datos.
//
//  Prefijo _st.
// ══════════════════════════════════════════════════════════════════════════

let _stFecha='';          // día que se está viendo (AAAA-MM-DD)
let _stPartes=[];         // partes de ese día, ya en camelCase
let _stBusca='';
let _stEstado='';         // '' | 'cargando' | 'error'
let _stPedido=0;          // para descartar respuestas viejas si se cambia rápido de día

// Ordena: turno Día antes que Noche; dentro del turno, por hora de registro
function _stOrden(a,b){
  const t=x=>x.turno==='Noche'?1:0;
  return t(a)-t(b)||String(a.creadoEn||'').localeCompare(String(b.creadoEn||''))||(+a.id-+b.id);
}

// Suma o resta días a una fecha AAAA-MM-DD, sin que influya la zona horaria
function _stSumarDias(iso,n){
  const [y,m,d]=String(iso).split('-').map(Number);
  const dt=new Date(Date.UTC(y,m-1,d+n));
  return dt.toISOString().slice(0,10);
}

// Hora local de registro (HH:MM)
function _stHora(iso){
  if(!iso)return '';
  const d=new Date(iso);if(isNaN(d))return '';
  return String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0');
}

// Lo que coincide con el buscador: autor, frente o descripción
function _stCoincide(p,q){
  if(!q)return true;
  const n=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  const t=n(q);
  if(n(p.autor).includes(t)||n(p.turno).includes(t))return true;
  return (p.actividades||[]).some(a=>n(a.frente).includes(t)||n(a.descripcion).includes(t));
}

// Totales del día (sobre lo que se ve)
function _stTotales(lista){
  const frentes=new Set();
  let acts=0,horas=0;
  lista.forEach(p=>{
    const a=Array.isArray(p.actividades)?p.actividades:[];
    acts+=a.length;
    a.forEach(x=>{const f=String(x&&x.frente||'').trim();if(f)frentes.add(f);});
    horas+=+p.horasPerdidas||0;
  });
  return {partes:lista.length,acts,frentes:frentes.size,horas:Math.round(horas*100)/100};
}

async function _stCargar(){
  const pedido=++_stPedido;
  _stEstado='cargando';_stPintar();
  try{
    const {data,error}=await supa.from(SUPA_TABLES.partesTurno).select('*').eq('fecha',_stFecha);
    if(pedido!==_stPedido)return;
    if(error){_stEstado='error';_stPartes=[];_stPintar(error.message);return;}
    _stPartes=(data||[]).map(r=>{
      const c=toCamel(r);
      // toCamel deja '' en lo vacío; las actividades y las horas se respetan
      c.actividades=Array.isArray(r.actividades)?r.actividades:[];
      c.horasPerdidas=+r.horas_perdidas||0;
      return c;
    }).sort(_stOrden);
    _stEstado='';_stPintar();
  }catch(e){
    if(pedido!==_stPedido)return;
    _stEstado='error';_stPartes=[];_stPintar((e&&e.message)||String(e));
  }
}

function _stIrA(fecha){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(String(fecha||'')))return;
  _stFecha=fecha;
  const inp=document.getElementById('stFecha');if(inp&&inp.value!==fecha)inp.value=fecha;
  _stCargar();
}
function _stMover(n){_stIrA(_stSumarDias(_stFecha||_ptHoy(),n));}
function _stBuscar(v){_stBusca=String(v||'');_stPintar();}

function _stVer(id){const p=_stPartes.find(x=>+x.id===+id);if(p)_ptVerDoc(p);}
function _stCompartir(id,btn){
  const p=_stPartes.find(x=>+x.id===+id);if(!p)return;
  if(btn){btn.disabled=true;btn.textContent='Generando…';}
  Promise.resolve(_ptCompartirPdf(p)).finally(()=>{if(btn){btn.disabled=false;btn.textContent='📤 PDF';}});
}

function _stKpi(etq,valor,color,sub){
  return `<div class="st-kpi" style="border:1px solid ${color};border-top:3px solid ${color}">
    <div class="st-kpi-l">${etq}</div>
    <div class="st-kpi-v" style="color:${color}">${valor}</div>
    ${sub?`<div class="st-kpi-s">${sub}</div>`:''}
  </div>`;
}

function _stTarjeta(p){
  const noche=p.turno==='Noche';
  const acts=Array.isArray(p.actividades)?p.actividades:[];
  const paraliza=+p.horasPerdidas>0;
  const color=noche?'#818cf8':'#f59e0b';
  const filas=acts.map((a,i)=>`<div class="st-act">
      <span class="st-act-n">${i+1}</span>
      <div class="st-act-c">
        <div class="st-act-fr">${_ptEsc(a&&a.frente||'—')}${a&&a.ubicacion?' <span title="Ubicado en el plano" style="color:#10b981">📍</span>':''}</div>
        <div class="st-act-d">${_ptEsc(a&&a.descripcion||'')}</div>
      </div>
      <span class="st-act-q">${a&&a.cantidad!=null&&a.cantidad!==''?_ptEsc(a.cantidad)+' '+_ptEsc(a.unidad||''):'—'}</span>
    </div>`).join('');
  return `<div class="st-card" style="border:1px solid ${color}">
    <div class="st-card-h">
      <span class="st-turno" style="background:${color};color:${noche?'#fff':'#111'}">${noche?'🌙':'☀'} Turno ${_ptEsc(p.turno||'')}</span>
      <div class="st-quien">
        <b>${_ptEsc(p.autor||'—')}</b>
        <span>${_stHora(p.creadoEn)?'registrado '+_stHora(p.creadoEn)+' · ':''}${acts.length} actividad${acts.length===1?'':'es'}</span>
      </div>
      <div class="st-btns">
        <button type="button" class="st-b st-b-v" onclick="_stVer(${+p.id})">📄 Ver</button>
        <button type="button" class="st-b st-b-c" onclick="_stCompartir(${+p.id},this)">📤 PDF</button>
      </div>
    </div>
    <div class="st-clima${paraliza?' st-clima-x':''}">Clima: <b>${_ptEsc(p.clima||'—')}</b>${p.climaObs?' · '+_ptEsc(p.climaObs):''}${paraliza?` · paralización <b>${_ptEsc(p.horasPerdidas)} h</b>${p.climaIni?' ('+_ptEsc(p.climaIni)+' a '+_ptEsc(p.climaFin)+')':''}`:''}</div>
    <div class="st-acts">${filas||'<div class="st-vacio-m">Sin actividades</div>'}</div>
    ${p.pendiente?`<div class="st-nota" style="border-left-color:#f59e0b"><span>Pendiente para el siguiente turno</span>${_ptEsc(p.pendiente)}</div>`:''}
    ${p.observaciones?`<div class="st-nota" style="border-left-color:#64748b"><span>Observaciones</span>${_ptEsc(p.observaciones)}</div>`:''}
  </div>`;
}

function _stPintar(msgError){
  const el=document.getElementById('stCuerpo');if(!el)return;
  if(_stEstado==='cargando'){el.innerHTML='<div class="st-vacio">Cargando partes…</div>';return;}
  if(_stEstado==='error'){
    el.innerHTML=`<div class="st-vacio" style="color:#f87171">No se pudieron cargar los partes: ${_ptEsc(msgError||'sin conexión')}.<br>
      <button type="button" class="st-b st-b-v" style="margin-top:.6rem" onclick="_stCargar()">Reintentar</button></div>`;
    return;
  }
  const lista=_stPartes.filter(p=>_stCoincide(p,_stBusca));
  const t=_stTotales(lista);
  const dia=_stPartes.filter(p=>p.turno!=='Noche').length, noche=_stPartes.length-dia;
  const kpis=`<div class="st-kpis">
    ${_stKpi('Partes recibidos',t.partes,'#3b82f6',_stPartes.length?`☀ ${dia} día · 🌙 ${noche} noche`:'')}
    ${_stKpi('Actividades',t.acts,'#10b981')}
    ${_stKpi('Frentes trabajados',t.frentes,'#f59e0b')}
    ${_stKpi('Horas perdidas',t.horas+' h',t.horas>0?'#ef4444':'#64748b','por clima')}
  </div>`;
  let cuerpo;
  if(!_stPartes.length)cuerpo=`<div class="st-vacio">No hay partes de turno registrados el ${_ptEsc(_ptFechaLarga(_stFecha))}.</div>`;
  else if(!lista.length)cuerpo=`<div class="st-vacio">Ningún parte coincide con «${_ptEsc(_stBusca)}».</div>`;
  else cuerpo=`<div class="st-lista">${lista.map(_stTarjeta).join('')}</div>`;
  el.innerHTML=kpis+cuerpo;
}

function rSupTurnos(){
  const pg=document.getElementById('page-supervision');if(!pg)return;
  if(!_stFecha)_stFecha=_ptHoy();
  pg.innerHTML=`${_stEstilos()}
  <div class="ph"><div class="ph-title" style="color:var(--ope)">Supervisión</div>
    <div class="ph-sub">Partes de turno registrados en campo, día por día</div></div>
  <div class="card">
    <div class="card-head" style="flex-wrap:wrap;gap:.6rem">
      <span class="card-title">Partes de Turno del día</span>
      <div class="card-head-right" style="flex-wrap:wrap;gap:.5rem">
        <div class="st-dia">
          <button type="button" class="st-flecha" onclick="_stMover(-1)" title="Día anterior">◀</button>
          <input type="date" id="stFecha" value="${_ptEsc(_stFecha)}" onchange="_stIrA(this.value)">
          <button type="button" class="st-flecha" onclick="_stMover(1)" title="Día siguiente">▶</button>
          <button type="button" class="st-hoy" onclick="_stIrA(_ptHoy())">Hoy</button>
        </div>
        <div class="search-wrap"><span>🔍</span><input class="search-input" placeholder="Frente, autor o trabajo…" value="${_ptEsc(_stBusca)}" oninput="_stBuscar(this.value)"></div>
      </div>
    </div>
    <div class="card-body" id="stCuerpo"></div>
  </div>`;
  _stCargar();
}

function _stEstilos(){
  return`<style>
  .st-dia{display:flex;align-items:center;gap:.3rem}
  .st-dia input{font-size:.82rem;padding:.4rem .5rem;border-radius:7px;border:1px solid var(--border);background:var(--panel2);color:var(--text)}
  .st-flecha,.st-hoy{font-size:.78rem;padding:.42rem .65rem;border-radius:7px;border:1px solid var(--border);background:var(--panel2);color:var(--text);cursor:pointer;font-weight:700}
  .st-flecha:hover,.st-hoy:hover{border-color:var(--ope)}
  .st-kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:.7rem;margin-bottom:1rem}
  .st-kpi{border-radius:9px;padding:.7rem .85rem;background:var(--panel2)}
  .st-kpi-l{font-size:.6rem;font-weight:800;letter-spacing:.09em;text-transform:uppercase;color:var(--muted2)}
  .st-kpi-v{font-size:1.6rem;font-weight:900;margin-top:.15rem;font-variant-numeric:tabular-nums}
  .st-kpi-s{font-size:.68rem;color:var(--muted2);margin-top:.1rem}
  .st-lista{display:grid;grid-template-columns:repeat(auto-fill,minmax(420px,1fr));gap:.9rem}
  @media(max-width:560px){.st-lista{grid-template-columns:1fr}}
  .st-card{border-radius:10px;background:var(--panel2);padding:.85rem;display:flex;flex-direction:column;gap:.6rem;min-width:0}
  .st-card-h{display:flex;align-items:center;gap:.6rem;flex-wrap:wrap}
  .st-turno{font-size:.72rem;font-weight:800;padding:.3rem .65rem;border-radius:999px;white-space:nowrap}
  .st-quien{flex:1;min-width:140px;display:flex;flex-direction:column;line-height:1.3}
  .st-quien b{font-size:.86rem;color:var(--text)}
  .st-quien span{font-size:.7rem;color:var(--muted2)}
  .st-btns{display:flex;gap:.35rem}
  .st-b{font-size:.74rem;padding:.42rem .7rem;border-radius:7px;cursor:pointer;font-weight:800;white-space:nowrap}
  .st-b-v{border:1px solid var(--border);background:var(--panel);color:var(--text)}
  .st-b-c{border:none;background:#10b981;color:#0b1220}
  .st-b:disabled{opacity:.6;cursor:wait}
  .st-clima{font-size:.74rem;color:var(--muted2)}
  .st-clima b{color:var(--text)}
  .st-clima-x,.st-clima-x b{color:#f87171}
  .st-acts{display:flex;flex-direction:column;border:1px solid var(--border);border-radius:8px;overflow:hidden}
  .st-act{display:flex;gap:.6rem;align-items:flex-start;padding:.5rem .65rem;border-top:1px solid var(--border);background:var(--panel)}
  .st-act:first-child{border-top:0}
  .st-act-n{font-size:.72rem;font-weight:900;color:#f59e0b;min-width:1.1rem;text-align:center;padding-top:.05rem}
  .st-act-c{flex:1;min-width:0}
  .st-act-fr{font-size:.8rem;font-weight:800;color:var(--text)}
  .st-act-d{font-size:.76rem;color:var(--muted2);white-space:pre-wrap;word-break:break-word;margin-top:.1rem}
  .st-act-q{font-size:.78rem;font-weight:800;color:var(--text);white-space:nowrap;font-variant-numeric:tabular-nums}
  .st-nota{font-size:.76rem;color:var(--text);white-space:pre-wrap;border-left:3px solid;padding:.35rem .6rem;background:var(--panel);border-radius:0 6px 6px 0}
  .st-nota span{display:block;font-size:.58rem;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--muted2);margin-bottom:.15rem}
  .st-vacio{padding:1.6rem 1rem;text-align:center;font-size:.85rem;color:var(--muted2)}
  .st-vacio-m{padding:.6rem;font-size:.76rem;color:var(--muted2);text-align:center}
  </style>`;
}
