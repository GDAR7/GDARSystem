// ══ COMBUSTIBLE ══
function _cbEsc(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}

// ── Período contable: del 21 de un mes al 20 del siguiente ──────────────────
// Es el corte con el que se valorizan equipos y proveedores, así que el kardex
// arranca mostrando el período en curso según la fecha de hoy.
const _cbIso=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
function _cbPeriodoDe(base){
  const d=base?new Date(base+'T12:00:00'):new Date();
  // Del 21 en adelante ya se está en el período que cierra el 20 del mes próximo
  const ini=d.getDate()>=21?new Date(d.getFullYear(),d.getMonth(),21)
                           :new Date(d.getFullYear(),d.getMonth()-1,21);
  return{desde:_cbIso(ini),hasta:_cbIso(new Date(ini.getFullYear(),ini.getMonth()+1,20))};
}
let _cbDesde='',_cbHasta='',_cbPerInit=false;
function _cbPerSet(campo,val){
  if(campo==='desde')_cbDesde=val;else _cbHasta=val;
  rComb();
}
// Salta n períodos completos hacia atrás o adelante
function _cbPerNav(n){
  if(!_cbDesde){const p=_cbPeriodoDe();_cbDesde=p.desde;_cbHasta=p.hasta;}
  const d=new Date(_cbDesde+'T12:00:00');
  const ini=new Date(d.getFullYear(),d.getMonth()+n,21);
  _cbDesde=_cbIso(ini);
  _cbHasta=_cbIso(new Date(ini.getFullYear(),ini.getMonth()+1,20));
  rComb();
}
function _cbPerHoy(){const p=_cbPeriodoDe();_cbDesde=p.desde;_cbHasta=p.hasta;rComb();}
function _cbPerTodo(){_cbDesde='';_cbHasta='';_cbPerInit=true;rComb();}
const _cbDMY=iso=>{if(!iso||!iso.includes('-'))return iso||'';const[y,m,d]=iso.split('-');return`${d}/${m}/${y}`;};
function _cbEnPeriodo(f){return(!_cbDesde||f>=_cbDesde)&&(!_cbHasta||f<=_cbHasta);}

function rComb(){
  // Al entrar por primera vez se posiciona en el período en curso
  if(!_cbPerInit){
    const p=_cbPeriodoDe();_cbDesde=p.desde;_cbHasta=p.hasta;_cbPerInit=true;
  }
  // Poblar filtro por N° Pedido/Atendido preservando selección
  const pfEl=document.getElementById('cbKardexFilter');
  const prevFilt=pfEl?pfEl.value:'';
  if(pfEl){
    const pedSet=new Set();
    DB.combustible.filter(r=>r.tipoMov==='Ingreso'&&r.numAtendido).forEach(r=>pedSet.add(r.numAtendido));
    pfEl.innerHTML='<option value="">— Todos —</option>'
      +[...pedSet].sort().map(v=>`<option value="${v}">${v}</option>`).join('');
    pfEl.value=prevFilt;
  }
  const filtVal=pfEl?pfEl.value:'';

  // Subconjunto filtrado para KPIs: N° de pedido + período
  const listaFilt=(filtVal
    ?DB.combustible.filter(r=>r.tipoMov==='Ingreso'
        ?r.numAtendido===filtVal
        :r.refPedido===filtVal)
    :DB.combustible).filter(r=>_cbEnPeriodo(r.fecha||''));
  const ingFilt=listaFilt.filter(r=>r.tipoMov==='Ingreso');
  const despFilt=listaFilt.filter(r=>r.tipoMov!=='Ingreso');
  const totEntrada=ingFilt.reduce((a,c)=>a+c.gal,0);
  const totSalida=despFilt.reduce((a,c)=>a+c.gal,0);
  const totCost=despFilt.reduce((a,c)=>a+(c.gal*(c.precio||0)),0);
  // Saldo inicial: todo lo movido ANTES del período (nivel del tanque al abrir)
  const _hayPer=!!(_cbDesde||_cbHasta);
  const saldoIni=_hayPer&&_cbDesde
    ?DB.combustible.filter(r=>(r.fecha||'')<_cbDesde)
      .reduce((a,c)=>a+(c.tipoMov==='Ingreso'?c.gal:-c.gal),0)
    :0;
  const saldoFin=saldoIni+totEntrada-totSalida;
  const _kpis=[];
  if(_hayPer)_kpis.push({l:'Saldo Inicial',v:saldoIni.toFixed(1)+' gal',c:'#64748b'});
  _kpis.push(
    {l:_hayPer?'Ingresado del Período':'Total Ingresado',v:totEntrada.toFixed(1)+' gal',c:'#3b82f6'},
    {l:_hayPer?'Despachado del Período':'Total Despachado',v:totSalida.toFixed(1)+' gal',c:'#f97316'},
    {l:filtVal?'Saldo del Pedido':_hayPer?'Saldo Final':'Saldo Actual',v:saldoFin.toFixed(1)+' gal',c:saldoFin<0?'#ef4444':'#10b981'},
    {l:_hayPer?'Costo del Período':'Costo Total',v:fmt(totCost),c:'#ef4444'});
  document.getElementById('combKpis').innerHTML=_kpis
    .map(k=>`<div class="kpi" style="--kc:${k.c}"><div class="kpi-lbl">${k.l}</div><div class="kpi-val" style="font-size:${k.v.toString().length>9?'1.1rem':'1.6rem'}">${k.v}</div></div>`).join('');

  // Barra de período (se inyecta sobre la tarjeta del kardex)
  const _perEl=document.getElementById('cbPeriodoBar');
  if(_perEl){
    // width fijo: la CSS global pone width:100% a todo input y rompía la fila
    const inpS='width:124px;flex:0 0 124px;box-sizing:border-box;background:var(--panel);border:1px solid var(--border);border-radius:5px;color:var(--text);padding:.16rem .35rem;font-size:.7rem;color-scheme:dark';
    const btn='flex:0 0 auto;background:var(--panel);border:1px solid var(--border);border-radius:5px;color:var(--text);padding:.16rem .42rem;font-size:.7rem;line-height:1.2;cursor:pointer;white-space:nowrap';
    _perEl.innerHTML=`
      <span style="font-size:.58rem;letter-spacing:.09em;color:var(--muted2);text-transform:uppercase;white-space:nowrap;flex:0 0 auto">Período</span>
      <button onclick="_cbPerNav(-1)" title="Período anterior" style="${btn}">◀</button>
      <input type="date" class="date-ic-azul" value="${_cbDesde}" onchange="_cbPerSet('desde',this.value)" style="${inpS}">
      <span style="color:var(--muted2);font-size:.7rem;flex:0 0 auto">→</span>
      <input type="date" class="date-ic-azul" value="${_cbHasta}" onchange="_cbPerSet('hasta',this.value)" style="${inpS}">
      <button onclick="_cbPerNav(1)" title="Período siguiente" style="${btn}">▶</button>
      <button onclick="_cbPerHoy()" title="Ir al período en curso (21 al 20)" style="${btn};background:rgba(249,115,22,.14);border-color:rgba(249,115,22,.4);color:#f97316;font-weight:700">Actual</button>
      <button onclick="_cbPerTodo()" title="Quitar el filtro de fechas" style="${btn};${!_hayPer?'border-color:#f97316;color:#f97316;font-weight:700':''}">Todo</button>
      <span style="font-size:.62rem;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0">${_hayPer?`${listaFilt.length} mov.`:`Sin filtro · ${listaFilt.length} mov.`}</span>`;
  }

  // Saldo acumulado GLOBAL (todos los registros en orden cronológico)
  const sorted=[...DB.combustible].sort((a,b)=>a.fecha.localeCompare(b.fecha)||a.id-b.id);
  let saldoAcum=0;
  const saldoMap={};
  sorted.forEach(r=>{
    if(r.tipoMov==='Ingreso') saldoAcum+=r.gal;
    else saldoAcum-=r.gal;
    saldoMap[r.id]=saldoAcum;
  });

  const filtSet=filtVal?new Set(listaFilt.map(r=>r.id)):null;
  document.getElementById('tbComb').innerHTML=sorted
    .filter(r=>(!filtSet||filtSet.has(r.id))&&_cbEnPeriodo(r.fecha||'')).map(r=>{
    const eq=DB.equipos.find(e=>e.id===r.eqId);
    const mu=s=>s?s:`<span style="color:var(--muted)">—</span>`;
    const esIngreso=r.tipoMov==='Ingreso';
    const cerrado=r.estado==='Cerrado';
    const tipoBadge=esIngreso
      ?`<span class="badge b-green" style="font-size:.65rem">⬆ Ingreso</span>`
      :`<span class="badge b-orange" style="font-size:.65rem">⬇ Despacho</span>`;
    const referencia=esIngreso?(r.proveedor||'—'):(eq?`${eq.codigo} – ${eq.nombre.split(' ').slice(0,2).join(' ')}`:(r.op||'—'));
    const entradaCell=esIngreso?`<td class="tr mono" style="color:#10b981;font-weight:700">+${r.gal}</td><td class="tr mono" style="color:var(--muted)">—</td>`
                               :`<td class="tr mono" style="color:var(--muted)">—</td><td class="tr mono" style="color:#ef4444;font-weight:700">-${r.gal}</td>`;
    const saldoColor=(saldoMap[r.id]||0)<0?'#ef4444':'#10b981';
    const costoCell=esIngreso?`<span style="color:var(--muted);font-size:.72rem">—</span>`:fmt((r.gal||0)*(r.precio||0));
    const estBadge=cerrado?`<span class="badge b-green">Cerrado</span>`:`<span class="badge b-orange">Ingresado</span>`;
    const _bloq48=(Date.now()-new Date(r.fecha+'T00:00:00').getTime())>172800000;
    const btns=cerrado
      ?`<button class="btn btn-out btn-sm" onclick="verComb(${r.id})" style="color:#3b82f6;border-color:#3b82f640">👁 Ver</button>`
      :`<button class="btn btn-out btn-sm" onclick="editComb(${r.id})" style="color:#f59e0b;border-color:#f59e0b40">✏️</button>
        ${_bloq48
          ?`<button class="btn btn-del btn-sm" disabled title="Registro bloqueado después de 48 horas" style="opacity:.3;cursor:not-allowed;pointer-events:none">🔒</button>`
          :`<button class="btn btn-del btn-sm" onclick="del('combustible',${r.id})">🗑</button>`}`;
    // Notas: en registros viejos el texto quedó guardado en placaSerie, igual que
    // en el modal de ver. Se recorta en la celda y el texto completo va en el title.
    const _nota=(r.notas||r.placaSerie||'').trim();
    // Con notas de varias líneas se muestra la primera y se avisa cuántas faltan;
    // el texto completo (con sus saltos) va en el tooltip.
    const _nLins=_nota?_nota.split(/\r?\n/).filter(l=>l.trim()):[];
    const _mas=_nLins.length>1?`<span style="color:var(--muted2);font-size:.62rem;font-weight:700"> +${_nLins.length-1}</span>`:'';
    const notaCell=_nota
      ?`<td style="font-size:.72rem;color:#fbbf24;max-width:190px;cursor:help" title="${_cbEsc(_nota)}">
          <span style="display:inline-block;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;vertical-align:bottom">📝 ${_cbEsc(_nLins[0]||_nota)}</span>${_mas}</td>`
      :`<td style="color:var(--muted)">—</td>`;
    const pedRef=esIngreso
      ?[(r.numReserva?`<span style="font-size:.68rem;color:var(--alm)">Res: ${r.numReserva}</span>`:''),
        (r.numAtendido?`<span style="font-size:.68rem;color:#10b981">Atn: ${r.numAtendido}</span>`:'')]
        .filter(Boolean).join('<br>')||`<span style="color:var(--muted)">—</span>`
      :(r.refPedido?`<span style="font-size:.68rem;color:#3b82f6">Ref: ${r.refPedido}</span>`:`<span style="color:var(--muted)">—</span>`);
    return`<tr data-id="${r.id}">
      <td class="mono">${r.fecha}</td>
      <td>${tipoBadge}</td>
      <td style="font-size:.78rem">${referencia}</td>
      <td>${pedRef}</td>
      <td><span class="badge b-orange" style="font-size:.65rem">${r.tipo||'—'}</span></td>
      ${entradaCell}
      <td class="tr mono" style="color:${saldoColor};font-weight:700">${(saldoMap[r.id]||0).toFixed(1)}</td>
      <td class="tr mono" style="font-size:.78rem">${costoCell}</td>
      <td class="mono" style="font-size:.75rem">${mu(r.numFormato)}</td>
      ${notaCell}
      <td>${estBadge}</td>
      <td style="display:flex;gap:.3rem">${btns}</td>
    </tr>`;
  }).join('');
  if(typeof _combTabActiva!=='undefined'&&_combTabActiva==='dash')rCombDash();
}
let _combEditId=null;
let _combMode='despacho';
function _combSetFormMode(mode){
  const ing=mode==='ingreso';
  ['cbProvRow','cbNumResRow','cbNumAtnRow'].forEach(id=>{const el=document.getElementById(id);if(el)el.style.display=ing?'':'none';});
  ['cbRefPedRow','cbEqRow','cbOpRow','cbPrcRow','cbTcRow','cbFmtRow','cbNotRow','cbDespRow'].forEach(id=>{const el=document.getElementById(id);if(el)el.style.display=ing?'none':'';});
}
const _CATS_OP=['Operador LA','Operador LB','Conductor VM'];
const _CATS_COMB=['Operador Combustible','Ayudante Combustible','Despachador Combustible','Ayudante de Cisterna'];

function _cbOpSearch(q){
  const drop=document.getElementById('cbOpDrop');if(!drop)return;
  const txt=(q||'').toLowerCase().trim();
  const lista=(DB.personal||[])
    .filter(p=>((p.est||'').toLowerCase()==='activo'||(p.est||'')==='')&&_CATS_OP.includes(p.cat))
    .filter(p=>{if(!txt)return true;return((p.ape||'')+' '+(p.nom||'')+' '+(p.cargo||'')).toLowerCase().includes(txt);})
    .sort((a,b)=>(a.cat||'').localeCompare(b.cat||'')||(a.ape||'').localeCompare(b.ape||''));
  _renderPersonaDrop(drop,lista,'_cbOpSelect');
}
function _cbOpSelect(nombre){
  const inp=document.getElementById('cbOp');if(inp)inp.value=nombre;
  const drop=document.getElementById('cbOpDrop');if(drop)drop.style.display='none';
}

function _cbDespSearch(q){
  const drop=document.getElementById('cbDespDrop');if(!drop)return;
  const txt=(q||'').toLowerCase().trim();
  const lista=(DB.personal||[])
    .filter(p=>{
      const activo=(p.est||'').toLowerCase()==='activo'||(p.est||'')==='';
      if(!activo)return false;
      // Primero buscar por cat específica; si no, por cargo con keyword combustible
      if(_CATS_COMB.includes(p.cat))return true;
      return(p.cargo||'').toLowerCase().includes('combustible')||(p.cargo||'').toLowerCase().includes('despachador')||(p.cargo||'').toLowerCase().includes('cisterna');
    })
    .filter(p=>{if(!txt)return true;return((p.ape||'')+' '+(p.nom||'')+' '+(p.cargo||'')).toLowerCase().includes(txt);})
    .sort((a,b)=>(a.ape||'').localeCompare(b.ape||''));
  _renderPersonaDrop(drop,lista,'_cbDespSelect');
}
function _cbDespSelect(nombre){
  const inp=document.getElementById('cbDesp');if(inp)inp.value=nombre;
  const drop=document.getElementById('cbDespDrop');if(drop)drop.style.display='none';
}

// ── Buscador de equipos (mismo patrón que Operador / Despachador) ────────────
// El input visible muestra el texto; el id del equipo vive en el hidden #cbEq,
// que es lo que leen saveComb() y editComb().
const _CB_EQ_COL={'Línea Amarilla':'#f59e0b','Línea Blanca':'#94a3b8','Vehículo Menor':'#8b5cf6','Equipos Menores':'#3b82f6'};
function _cbEqTexto(e){return`${e.codigo} – ${(e.nombre||'').split(' ').slice(0,3).join(' ')}`;}
function _cbEqSearch(q){
  const drop=document.getElementById('cbEqDrop');if(!drop)return;
  const txt=String(q||'').toLowerCase().trim();
  const lista=(DB.equipos||[])
    .filter(e=>!txt||`${e.codigo||''} ${e.nombre||''} ${e.placa||''} ${e.tipo||''} ${e.sub||''}`.toLowerCase().includes(txt))
    .sort((a,b)=>(a.codigo||'').localeCompare(b.codigo||''));
  if(!lista.length){
    drop.innerHTML=`<div style="padding:.5rem .8rem;font-size:.75rem;color:var(--muted2);font-style:italic">Ningún equipo coincide con "${_cbEsc(q)}"</div>`;
    drop.style.display='block';return;
  }
  drop.innerHTML=lista.map(e=>{
    const cc=_CB_EQ_COL[e.tipo]||'var(--muted2)';
    // mousedown + preventDefault: la selección ocurre ANTES del blur del input
    // y el foco no se pierde. Con onclick, un clic algo lento dejaba correr
    // primero la validación del blur y esta borraba el campo.
    return`<div onmousedown="event.preventDefault();event.stopPropagation();_cbEqSelect(${e.id})"
      style="padding:.45rem .8rem;cursor:pointer;font-size:.8rem;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center"
      onmouseover="this.style.background='var(--hover)'" onmouseout="this.style.background=''">
      <div>
        <span style="font-weight:700;color:var(--mec)">${_cbEsc(e.codigo||'')}</span>
        <span style="font-size:.75rem;margin-left:.4rem">${_cbEsc((e.nombre||'').split(' ').slice(0,3).join(' '))}</span>
        ${e.placa?`<span style="font-size:.68rem;color:var(--muted2);margin-left:.35rem">[${_cbEsc(e.placa)}]</span>`:''}
      </div>
      <span style="font-size:.63rem;font-weight:700;color:${cc};flex-shrink:0;margin-left:.5rem">${_cbEsc(e.tipo||'')}</span>
    </div>`;
  }).join('');
  drop.style.display='block';
}
let _cbEqSelT=0;   // momento de la última selección, para que el blur no la pise
function _cbEqSelect(id){
  const e=(DB.equipos||[]).find(x=>+x.id===+id);
  if(!e)return;
  _cbEqSelT=Date.now();
  const hid=document.getElementById('cbEq');if(hid)hid.value=e.id;
  const inp=document.getElementById('cbEqBuscar');
  if(inp){inp.value=_cbEqTexto(e);inp.style.borderColor='var(--mec)';}
  const drop=document.getElementById('cbEqDrop');if(drop)drop.style.display='none';
}
// Al salir del campo se comprueba que haya un equipo realmente elegido.
// Nunca se borra lo que el usuario escribió: solo se marca en rojo si no se
// pudo resolver, para que pueda corregirlo sin volver a teclear todo.
function _cbEqBlur(){
  setTimeout(()=>{
    if(Date.now()-_cbEqSelT<500)return;          // se acaba de elegir de la lista
    const inp=document.getElementById('cbEqBuscar'),hid=document.getElementById('cbEq');
    if(!inp||!hid)return;
    const txt=inp.value.trim();
    if(!txt){hid.value='';inp.style.borderColor='';return;}
    const low=txt.toLowerCase();
    // ¿Lo que ya estaba elegido sigue correspondiendo al texto? Basta con que
    // el texto contenga su código: así tolera nombres recortados o retoques.
    const sel=hid.value?(DB.equipos||[]).find(e=>+e.id===+hid.value):null;
    if(sel&&low.includes(String(sel.codigo||'').toLowerCase())){inp.style.borderColor='var(--mec)';return;}
    // Si no, se intenta resolver por código exacto, texto completo o placa
    const eqs=DB.equipos||[];
    const cod=s=>String(s||'').toLowerCase().trim();
    const hallado=eqs.find(e=>cod(e.codigo)===low)
                ||eqs.find(e=>_cbEqTexto(e).toLowerCase()===low)
                ||eqs.find(e=>cod(e.placa)&&cod(e.placa)===low)
                ||eqs.find(e=>cod(e.codigo)&&low.includes(cod(e.codigo)));
    if(hallado){_cbEqSelect(hallado.id);return;}
    hid.value='';
    inp.style.borderColor='#ef4444';
    toast('Elija un equipo de la lista',true);
  },180);
}
// Deja el buscador en blanco (nuevo despacho) o con el equipo ya guardado (edición)
function _cbEqReset(eqId){
  const e=eqId?(DB.equipos||[]).find(x=>+x.id===+eqId):null;
  const hid=document.getElementById('cbEq');if(hid)hid.value=e?e.id:'';
  const inp=document.getElementById('cbEqBuscar');
  if(inp){inp.value=e?_cbEqTexto(e):'';inp.style.borderColor=e?'var(--mec)':'';}
  const drop=document.getElementById('cbEqDrop');if(drop)drop.style.display='none';
}

function _renderPersonaDrop(drop,lista,fnSelect){
  if(!lista.length){drop.style.display='none';return;}
  drop.innerHTML=lista.map(p=>{
    const nombre=`${p.ape||''}, ${p.nom||''}`.trim().replace(/^,\s*/,'');
    const catColor={'Operador LA':'#f59e0b','Operador LB':'#3b82f6','Conductor VM':'#8b5cf6',
      'Operador Combustible':'#f97316','Ayudante Combustible':'#f97316','Despachador Combustible':'#f97316','Ayudante de Cisterna':'#f97316'};
    const cc=catColor[p.cat]||'var(--muted2)';
    return`<div onclick="${fnSelect}('${nombre.replace(/'/g,"\\'")}');event.stopPropagation()"
      style="padding:.45rem .8rem;cursor:pointer;font-size:.8rem;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center"
      onmouseover="this.style.background='var(--hover)'" onmouseout="this.style.background=''">
      <div>
        <span style="font-weight:700">${nombre}</span>
        <span style="font-size:.7rem;color:var(--muted2);margin-left:.5rem">${p.cargo||''}</span>
      </div>
      <span style="font-size:.63rem;font-weight:700;color:${cc};flex-shrink:0;margin-left:.5rem">${p.cat||''}</span>
    </div>`;
  }).join('');
  drop.style.display='block';
}
function _combPopulateRefPed(selVal){
  const sel=document.getElementById('cbRefPed');if(!sel)return;
  const ingresos=DB.combustible.filter(r=>r.tipoMov==='Ingreso'&&r.numAtendido);
  sel.innerHTML='<option value="">— Sin vinculación —</option>'
    +ingresos.map(r=>`<option value="${r.numAtendido}">${r.numAtendido} · ${r.fecha} (${r.gal} gal)</option>`).join('');
  if(selVal)sel.value=selVal;
}
// Cerrar dropdowns al clic fuera
document.addEventListener('click',e=>{
  if(!document.getElementById('cbOpRow')?.contains(e.target)){const d=document.getElementById('cbOpDrop');if(d)d.style.display='none';}
  if(!document.getElementById('cbDespRow')?.contains(e.target)){const d=document.getElementById('cbDespDrop');if(d)d.style.display='none';}
  if(!document.getElementById('cbEqRow')?.contains(e.target)){const d=document.getElementById('cbEqDrop');if(d)d.style.display='none';}
});
function openCombModal(mode){
  _combMode=mode; _combEditId=null;
  const ing=mode==='ingreso';
  const ttl=document.querySelector('#mComb .mttl');
  if(ttl)ttl.textContent=ing?'⬆ Ingreso de Combustible':'⬇ Despacho de Combustible';
  _combSetFormMode(mode);
  document.getElementById('cbF').value=today();
  document.getElementById('cbGal').value='';
  document.getElementById('cbHr').value='';
  document.getElementById('cbKm').value='';
  document.getElementById('cbFmt').value='';
  document.getElementById('cbEst').value='Ingresado';
  if(ing){
    document.getElementById('cbProv').value='';
    document.getElementById('cbNumRes').value='';
    document.getElementById('cbNumAtn').value='';
  }else{
    _combPopulateRefPed('');
    _cbEqReset();
    document.getElementById('cbPrc').value='6.30';
    document.getElementById('cbOp').value='';
    document.getElementById('cbNot').value='';
    document.getElementById('cbDesp').value='';
    ['cbOpDrop','cbDespDrop','cbEqDrop'].forEach(id=>{const d=document.getElementById(id);if(d)d.style.display='none';});
  }
  openM('mComb');
}
function gComb(){
  const gal=+document.getElementById('cbGal').value||0;
  if(!gal){toast('Ingrese la cantidad de galones',true);return;}
  const ing=_combMode==='ingreso';
  const eqId=ing?null:+document.getElementById('cbEq').value;
  if(!ing&&!eqId){toast('Seleccione equipo',true);return;}
  const fields={
    tipoMov:ing?'Ingreso':'Despacho',
    fecha:document.getElementById('cbF').value||today(),
    tipo:document.getElementById('cbTi').value,
    gal,
    hr:+document.getElementById('cbHr').value||0,
    km:+document.getElementById('cbKm').value||0,
    numFormato:document.getElementById('cbFmt').value.trim(),
    estado:document.getElementById('cbEst').value,
    proveedor:ing?document.getElementById('cbProv').value.trim():'',
    numReserva:ing?document.getElementById('cbNumRes').value.trim():'',
    numAtendido:ing?document.getElementById('cbNumAtn').value.trim():'',
    refPedido:ing?'':document.getElementById('cbRefPed').value,
    eqId:ing?null:eqId,
    op:ing?'':document.getElementById('cbOp').value.trim(),
    precio:ing?0:+document.getElementById('cbPrc').value||6.30,
    tipoCosto:ing?'':document.getElementById('cbTc').value,
    notas:ing?'':document.getElementById('cbNot').value.trim(),
    despachador:ing?'':document.getElementById('cbDesp').value.trim()
  };
  if(_combEditId!==null){
    const idx=DB.combustible.findIndex(x=>x.id===_combEditId);
    if(idx>-1){DB.combustible[idx]={...DB.combustible[idx],...fields};syncSheet('saveCombustible',DB.combustible[idx]);}
    _combEditId=null;
    closeM('mComb');rComb();toast(ing?'Ingreso actualizado':'Atención actualizada');
  }else{
    const rec={id:nid('comb'),...fields};
    DB.combustible.push(rec);syncSheet('saveCombustible',rec);
    closeM('mComb');rComb();toast(ing?'Ingreso registrado':'Atención registrada');
  }
}
function editComb(id){
  const r=DB.combustible.find(x=>x.id===id);if(!r)return;
  _combEditId=id;
  _combMode=r.tipoMov==='Ingreso'?'ingreso':'despacho';
  _combSetFormMode(_combMode);
  const ing=_combMode==='ingreso';
  const ttl=document.querySelector('#mComb .mttl');
  if(ttl)ttl.textContent=ing?'✏️ Editar Ingreso':'✏️ Editar Atención';
  document.getElementById('cbF').value=r.fecha||'';
  document.getElementById('cbTi').value=r.tipo||'Petróleo D2';
  document.getElementById('cbGal').value=r.gal||0;
  document.getElementById('cbHr').value=r.hr||0;
  document.getElementById('cbKm').value=r.km||0;
  document.getElementById('cbFmt').value=r.numFormato||'';
  document.getElementById('cbEst').value=r.estado||'Ingresado';
  if(ing){
    document.getElementById('cbProv').value=r.proveedor||'';
    document.getElementById('cbNumRes').value=r.numReserva||'';
    document.getElementById('cbNumAtn').value=r.numAtendido||'';
  }else{
    _combPopulateRefPed(r.refPedido||'');
    _cbEqReset(r.eqId);
    document.getElementById('cbOp').value=r.op||'';
    document.getElementById('cbPrc').value=r.precio||6.30;
    document.getElementById('cbTc').value=r.tipoCosto||'Costo Directo';
    document.getElementById('cbNot').value=r.notas||r.placaSerie||'';
    document.getElementById('cbDesp').value=r.despachador||'';
    ['cbOpDrop','cbDespDrop','cbEqDrop'].forEach(id=>{const d=document.getElementById(id);if(d)d.style.display='none';});
  }
  openM('mComb');
}
function verComb(id){
  const r=DB.combustible.find(x=>x.id===id);if(!r)return;
  const eq=DB.equipos.find(e=>e.id===r.eqId);
  const eqNombre=eq?`${eq.codigo} – ${eq.nombre}`:(r.eqId||'—');
  const mu=s=>s||'—';
  const win=window.open('','_blank');
  if(!win){toast('Active ventanas emergentes para imprimir',true);return;}
  const S='<'+'/';
  const _logoUrlV=window.location.href.replace(/[^\/\\]+$/,'')+'09.-ERP/Imagenes/ECOSERMO-LOGO.png';
  const html=`<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
<title>Despacho de Combustible – ${r.numFormato||r.id}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box;}
  body{font-family:'Arial',sans-serif;background:#fff;color:#0a1330;font-size:11pt;padding:1.5cm;}
  .header{display:flex;align-items:center;justify-content:space-between;border-bottom:3px solid #1e3a5f;padding-bottom:.7rem;margin-bottom:1rem;}
  .logo-area img{height:55px;object-fit:contain;}
  .doc-title{text-align:right;}
  .doc-title h2{font-size:1.2rem;font-weight:900;color:#1e3a5f;text-transform:uppercase;letter-spacing:.06em;}
  .doc-title .fmt{font-size:.85rem;font-family:monospace;color:#333;margin-top:3px;}
  .estado-badge{display:inline-block;background:#10b98122;color:#10b981;border:1px solid #10b981;border-radius:4px;padding:2px 10px;font-size:.75rem;font-weight:700;letter-spacing:.08em;margin-top:4px;}
  .section-title{font-size:.65rem;letter-spacing:.14em;text-transform:uppercase;color:#1e3a5f;font-weight:700;margin:1rem 0 .4rem;border-bottom:1px solid #1e3a5f22;padding-bottom:3px;}
  .grid{display:grid;grid-template-columns:repeat(3,1fr);gap:.5rem .8rem;margin-bottom:.5rem;}
  .grid2{grid-template-columns:repeat(2,1fr);}
  .field label{font-size:.58rem;text-transform:uppercase;letter-spacing:.1em;color:#666;display:block;margin-bottom:2px;}
  .field span{font-size:.88rem;font-weight:600;color:#0a1330;}
  .field span.mono{font-family:monospace;}
  table{width:100%;border-collapse:collapse;font-size:.85rem;margin-top:.4rem;}
  th{background:#1e3a5f;color:#fff;padding:.3rem .6rem;text-align:left;font-size:.65rem;letter-spacing:.08em;text-transform:uppercase;}
  td{padding:.3rem .6rem;border-bottom:1px solid #e5e7eb;}
  tr:last-child td{border-bottom:none;}
  .footer{margin-top:2rem;display:grid;grid-template-columns:1fr 1fr 1fr;gap:1rem;}
  .firma{border-top:1px solid #999;text-align:center;padding-top:.3rem;font-size:.7rem;color:#555;margin-top:2rem;}
  @media print{body{padding:.8cm;}@page{size:A4;margin:1.2cm;}}
</style></head><body>
<div class="header">
  <div class="logo-area"><img src="${_logoUrlV}" alt="Ecosermo"></div>
  <div class="doc-title">
    <h2>Despacho de Combustible</h2>
    <div class="fmt">N° Formato: ${mu(r.numFormato)}</div>
    <span class="estado-badge">CERRADO</span>
  </div>
</div>
<div class="section-title">Información del Despacho</div>
<div class="grid">
  <div class="field"><label>Fecha</label><span class="mono">${mu(r.fecha)}</span></div>
  <div class="field"><label>Equipo</label><span>${eqNombre}</span></div>
  <div class="field"><label>Operador / Conductor</label><span>${mu(r.op)}</span></div>
  <div class="field"><label>Tipo de Combustible</label><span>${mu(r.tipo)}</span></div>
  <div class="field"><label>Galones</label><span class="mono">${r.gal} gal</span></div>
  <div class="field"><label>Horómetro</label><span class="mono">${r.hr||'—'} h</span></div>
  <div class="field"><label>Kilometraje</label><span class="mono">${r.km||'—'} km</span></div>
</div>
<div class="grid">
  <div class="field"><label>Precio S/ / gal</label><span class="mono">S/ ${r.precio||'—'}</span></div>
  <div class="field"><label>Costo Total S/</label><span class="mono" style="color:#dc2626;font-weight:900">S/ ${(r.gal*r.precio).toFixed(2)}</span></div>
  <div class="field"><label>Tipo de Costo</label><span>${mu(r.tipoCosto)}</span></div>
</div>
<div class="section-title">Datos Adicionales</div>
<div class="grid">
  <div class="field"><label>N° Formato</label><span class="mono">${mu(r.numFormato)}</span></div>
  <div class="field"><label>Despachador</label><span>${mu(r.despachador)}</span></div>
  <div class="field" style="grid-column:1/-1"><label>Notas / Observaciones</label><span style="white-space:pre-line">${mu(_cbEsc((r.notas||r.placaSerie||'').trim()))}</span></div>
</div>
<div class="footer">
  <div class="firma">Firma Operador / Conductor</div>
  <div class="firma">Firma Despachador</div>
  <div class="firma">V°B° Jefe de Almacén</div>
</div>
<div style="text-align:center;margin-top:1.5rem;font-size:.65rem;color:#aaa">
  Generado por GDAR – ECOSERMO · Sistema de Gestión Operativa · ${new Date().toLocaleDateString('es-PE',{day:'2-digit',month:'long',year:'numeric'})}
</div>
<script>window.onload=function(){window.print();}<${'/'}script>
${S}body>${S}html>`;
  win.document.write(html);win.document.close();
}

// ── Lo que está a la vista ───────────────────────────────────────────────────
// Se leen las filas realmente visibles del DOM (no se recalculan los filtros):
// así el archivo sale idéntico a la pantalla, incluido lo que ocultó el buscador.
function _combVisibles(){
  const tb=document.getElementById('tbComb');
  if(!tb)return{lista:[],salMap:{},filtro:''};
  const ids=Array.from(tb.rows)
    .filter(tr=>tr.style.display!=='none'&&tr.dataset.id)
    .map(tr=>+tr.dataset.id);
  const porId=new Map((DB.combustible||[]).map(r=>[+r.id,r]));
  const lista=ids.map(id=>porId.get(id)).filter(Boolean);
  // El saldo se calcula sobre TODOS los movimientos: es un acumulado del tanque,
  // no del subconjunto. Se muestra el mismo número que ya se ve en la grilla.
  let sal=0;const salMap={};
  [...(DB.combustible||[])].sort((a,b)=>a.fecha.localeCompare(b.fecha)||a.id-b.id)
    .forEach(r=>{sal+=(r.tipoMov==='Ingreso'?r.gal:-r.gal);salMap[r.id]=sal;});
  const pf=document.getElementById('cbKardexFilter');
  const bus=(document.getElementById('cbBuscar')?.value||'').trim();
  const per=(_cbDesde||_cbHasta)?`Período ${_cbDMY(_cbDesde)} al ${_cbDMY(_cbHasta)}`:'';
  const filtro=[per,pf&&pf.value?'Pedido/Atn N° '+pf.value:'',bus?'Búsqueda: "'+bus+'"':'']
    .filter(Boolean).join(' · ');
  return{lista,salMap,filtro};
}

// ── Exportar a PDF lo que se está viendo ─────────────────────────────────────
function _combExportPDF(){
  const V=_combVisibles();
  const sorted=V.lista;
  if(!sorted.length){toast('No hay registros visibles para exportar',true);return;}
  const salMap=V.salMap;
  const filtVal=V.filtro;

  const totEnt=sorted.filter(r=>r.tipoMov==='Ingreso').reduce((a,c)=>a+c.gal,0);
  const totSal=sorted.filter(r=>r.tipoMov!=='Ingreso').reduce((a,c)=>a+c.gal,0);
  const totCost=sorted.filter(r=>r.tipoMov!=='Ingreso').reduce((a,c)=>a+(c.gal*(c.precio||0)),0);
  const saldo=totEnt-totSal;

  const filas=sorted.map(r=>{
    const eq=DB.equipos.find(e=>e.id===r.eqId);
    const esIng=r.tipoMov==='Ingreso';
    const ref=esIng?(r.proveedor||'—'):(eq?`${eq.codigo} – ${eq.nombre.split(' ').slice(0,2).join(' ')}`:(r.op||'—'));
    const ped=esIng?(r.numAtendido?`Atn: ${r.numAtendido}`:r.numReserva?`Res: ${r.numReserva}`:'—'):(r.refPedido?`Ref: ${r.refPedido}`:'—');
    const saldoR=(salMap[r.id]||0).toFixed(1);
    const costo=esIng?'—':`S/ ${((r.gal||0)*(r.precio||0)).toLocaleString('es-PE',{minimumFractionDigits:2,maximumFractionDigits:2})}`;
    return`<tr>
      <td>${r.fecha}</td>
      <td><span style="background:${esIng?'#10b98122':'#f9731622'};color:${esIng?'#10b981':'#f97316'};padding:2px 7px;border-radius:4px;font-size:.72rem;font-weight:700">${esIng?'⬆ Ingreso':'⬇ Despacho'}</span></td>
      <td>${ref}</td>
      <td style="font-size:.78rem">${ped}</td>
      <td>${r.tipo||'—'}</td>
      <td style="text-align:right;color:${esIng?'#10b981':'#999'};font-weight:${esIng?'700':'400'}">${esIng?'+'+r.gal:'—'}</td>
      <td style="text-align:right;color:${!esIng?'#ef4444':'#999'};font-weight:${!esIng?'700':'400'}">${!esIng?'-'+r.gal:'—'}</td>
      <td style="text-align:right;color:${+saldoR<0?'#ef4444':'#10b981'};font-weight:700">${saldoR}</td>
      <td style="text-align:right">${costo}</td>
      <td style="font-size:.75rem">${r.numFormato||'—'}</td>
      <td style="font-size:.72rem;max-width:220px">${_cbEsc((r.notas||r.placaSerie||'').trim()).replace(/\r?\n/g,'<br>')||'—'}</td>
      <td><span style="background:${r.estado==='Cerrado'?'#10b98122':'#f9731622'};color:${r.estado==='Cerrado'?'#10b981':'#f97316'};padding:1px 6px;border-radius:4px;font-size:.68rem">${r.estado||'—'}</span></td>
    </tr>`;
  }).join('');

  const win=window.open('','_blank');
  if(!win){toast('Active ventanas emergentes para imprimir',true);return;}
  const S='<'+'/';
  const _logoUrl=window.location.href.replace(/[^\/\\]+$/,'')+'09.-ERP/Imagenes/ECOSERMO-LOGO.png';
  const titulo=filtVal?`Kardex de Combustible – ${filtVal}`:'Kardex de Combustible – Todos los registros';
  win.document.write(`<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
<title>${titulo}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box;}
  body{font-family:Arial,sans-serif;background:#fff;color:#0a1330;font-size:9.5pt;padding:1.2cm;}
  .header{display:flex;align-items:center;justify-content:space-between;border-bottom:3px solid #1e3a5f;padding-bottom:.7rem;margin-bottom:.8rem;}
  .header-logo{flex:0 0 auto}.header-logo img{height:52px;object-fit:contain}
  .doc-title{text-align:right;}
  .doc-title h2{font-size:1.15rem;font-weight:900;color:#1e3a5f;text-transform:uppercase;letter-spacing:.06em;}
  .doc-title p{font-size:.7rem;color:#555;margin-top:4px;}
  .kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:.5rem;margin-bottom:.8rem;}
  .kpi{background:#f8f9fa;border:1px solid #e5e7eb;border-radius:6px;padding:.4rem .7rem;text-align:center;}
  .kpi-l{font-size:.6rem;color:#555;text-transform:uppercase;letter-spacing:.08em;}
  .kpi-v{font-size:1rem;font-weight:800;margin-top:2px;}
  table{width:100%;border-collapse:collapse;font-size:.76rem;}
  th{background:#1e3a5f;color:#fff;padding:.28rem .45rem;text-align:left;font-size:.62rem;letter-spacing:.07em;text-transform:uppercase;white-space:nowrap;}
  td{padding:.25rem .45rem;border-bottom:1px solid #f1f1f1;vertical-align:middle;}
  tr:nth-child(even) td{background:#f6f8fb;}
  .footer{margin-top:1.5rem;font-size:.65rem;color:#aaa;text-align:center;border-top:1px solid #e5e7eb;padding-top:.5rem;}
  .totales td{font-weight:800;background:#eef2f8;border-top:2px solid #1e3a5f;}
  @media print{body{padding:.7cm;}@page{size:A4 landscape;margin:.8cm;}}
</style></head><body>
<div class="header">
  <div class="header-logo"><img src="${_logoUrl}" alt="Ecosermo"></div>
  <div class="doc-title">
    <h2>Kardex de Combustible</h2>
    <p>${filtVal?`<strong>${_cbEsc(filtVal)}</strong> · `:''}${sorted.length} movimiento${sorted.length===1?'':'s'} · Emitido: ${new Date().toLocaleDateString('es-PE',{day:'2-digit',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit'})}</p>
  </div>
</div>
${filtVal?`<div style="margin-bottom:.6rem;padding:4px 8px;border-left:3px solid #f97316;background:#fff7ed;font-size:.7rem;color:#9a3412">
  Reporte parcial: solo incluye los movimientos que cumplen el filtro aplicado en pantalla (${_cbEsc(filtVal)}). Los totales corresponden a esos movimientos.
</div>`:''}
<div class="kpis">
  <div class="kpi"><div class="kpi-l">Total Ingresado</div><div class="kpi-v" style="color:#3b82f6">${totEnt.toFixed(1)} gal</div></div>
  <div class="kpi"><div class="kpi-l">Total Despachado</div><div class="kpi-v" style="color:#f97316">${totSal.toFixed(1)} gal</div></div>
  <div class="kpi"><div class="kpi-l">${filtVal?'Neto del filtro':'Saldo'}</div><div class="kpi-v" style="color:${saldo<0?'#ef4444':'#10b981'}">${saldo.toFixed(1)} gal</div></div>
  <div class="kpi"><div class="kpi-l">Costo Total</div><div class="kpi-v" style="color:#ef4444">S/ ${totCost.toLocaleString('es-PE',{minimumFractionDigits:2,maximumFractionDigits:2})}</div></div>
</div>
<table>
  <thead><tr><th>Fecha</th><th>Tipo Mov.</th><th>Referencia</th><th>N° Reserva / Ref.</th><th>Tipo Comb.</th><th style="text-align:right">Entrada (gal)</th><th style="text-align:right">Salida (gal)</th><th style="text-align:right">Saldo (gal)</th><th style="text-align:right">Costo S/</th><th>N° Formato</th><th>Notas</th><th>Estado</th></tr></thead>
  <tbody>${filas}</tbody>
  <tfoot><tr class="totales">
    <td colspan="5">TOTALES</td>
    <td style="text-align:right;color:#10b981">+${totEnt.toFixed(1)}</td>
    <td style="text-align:right;color:#ef4444">-${totSal.toFixed(1)}</td>
    <td style="text-align:right;color:${saldo<0?'#ef4444':'#10b981'}">${saldo.toFixed(1)}</td>
    <td style="text-align:right">S/ ${totCost.toLocaleString('es-PE',{minimumFractionDigits:2,maximumFractionDigits:2})}</td>
    <td colspan="3"></td>
  </tr></tfoot>
</table>
<div class="footer">Generado por GDAR – ECOSERMO · Sistema de Gestión Operativa · ${new Date().toLocaleDateString('es-PE',{weekday:'long',day:'2-digit',month:'long',year:'numeric'})}</div>
<script>window.onload=function(){window.print();}<${'/'}script>
${S}body>${S}html>`);
  win.document.close();
}

// ── Exportar a Excel lo que se está viendo ───────────────────────────────────
function _combExportXLS(){
  if(typeof XLSX==='undefined'){toast('Librería de Excel no disponible',true);return;}
  const V=_combVisibles();
  const lista=V.lista;
  if(!lista.length){toast('No hay registros visibles para exportar',true);return;}

  const BOR={top:{style:'thin',color:{rgb:'D0D7E2'}},bottom:{style:'thin',color:{rgb:'D0D7E2'}},
             left:{style:'thin',color:{rgb:'D0D7E2'}},right:{style:'thin',color:{rgb:'D0D7E2'}}};
  const S=(v,o)=>({v:v===undefined||v===null?'':v,t:typeof v==='number'?'n':'s',s:Object.assign({
    font:{sz:9,color:{rgb:(o&&o.col)||'0F172A'},bold:!!(o&&o.b)},
    fill:{fgColor:{rgb:(o&&o.bg)||'FFFFFF'}},
    alignment:{horizontal:(o&&o.al)||'left',vertical:'center',wrapText:!!(o&&o.wrap)},
    border:BOR},(o&&o.numFmt)?{numFmt:o.numFmt}:{})});

  const HDR=['Fecha','Tipo Mov.','Referencia','N° Reserva / Ref.','Tipo Comb.',
             'Entrada (gal)','Salida (gal)','Saldo (gal)','Costo S/','N° Formato','Notas','Estado'];
  const aoa=[];
  aoa.push([S('KARDEX DE COMBUSTIBLE',{b:1,bg:'1E3A5F',col:'FFFFFF',al:'center'}),...Array(HDR.length-1).fill(S('',{bg:'1E3A5F'}))]);
  aoa.push([S((V.filtro?V.filtro+' · ':'')+lista.length+' movimientos · Emitido '+new Date().toLocaleString('es-PE'),
    {bg:'EEF2F8',col:'475569',al:'center'}),...Array(HDR.length-1).fill(S('',{bg:'EEF2F8'}))]);
  aoa.push(HDR.map(h=>S(h,{b:1,bg:'334155',col:'FFFFFF',al:'center'})));

  let tEnt=0,tSal=0,tCost=0;
  lista.forEach(r=>{
    const eq=(DB.equipos||[]).find(e=>e.id===r.eqId);
    const esIng=r.tipoMov==='Ingreso';
    const ref=esIng?(r.proveedor||''):(eq?`${eq.codigo} – ${eq.nombre}`:(r.op||''));
    const ped=esIng?[r.numReserva?'Res: '+r.numReserva:'',r.numAtendido?'Atn: '+r.numAtendido:''].filter(Boolean).join(' / ')
                   :(r.refPedido?'Ref: '+r.refPedido:'');
    const costo=esIng?null:+((r.gal||0)*(r.precio||0)).toFixed(2);
    if(esIng)tEnt+=r.gal;else{tSal+=r.gal;tCost+=costo||0;}
    aoa.push([
      S(r.fecha,{al:'center'}),
      S(esIng?'Ingreso':'Despacho',{b:1,al:'center',col:esIng?'059669':'EA580C'}),
      S(ref),S(ped,{col:'2563EB'}),S(r.tipo||'',{al:'center'}),
      S(esIng?+r.gal:null,{al:'right',b:1,col:'059669',numFmt:'#,##0.0'}),
      S(esIng?null:+r.gal,{al:'right',b:1,col:'DC2626',numFmt:'#,##0.0'}),
      S(+(V.salMap[r.id]||0).toFixed(1),{al:'right',b:1,numFmt:'#,##0.0'}),
      S(costo,{al:'right',numFmt:'#,##0.00'}),
      S(r.numFormato||'',{al:'center'}),
      S((r.notas||r.placaSerie||'').trim(),{wrap:1,col:'92400E'}),
      S(r.estado||'',{al:'center'})
    ]);
  });
  aoa.push([S('TOTALES',{b:1,bg:'EEF2F8',al:'right'}),...Array(4).fill(S('',{bg:'EEF2F8'})),
    S(+tEnt.toFixed(1),{b:1,bg:'EEF2F8',al:'right',col:'059669',numFmt:'#,##0.0'}),
    S(+tSal.toFixed(1),{b:1,bg:'EEF2F8',al:'right',col:'DC2626',numFmt:'#,##0.0'}),
    S(+(tEnt-tSal).toFixed(1),{b:1,bg:'EEF2F8',al:'right',numFmt:'#,##0.0'}),
    S(+tCost.toFixed(2),{b:1,bg:'EEF2F8',al:'right',numFmt:'#,##0.00'}),
    ...Array(3).fill(S('',{bg:'EEF2F8'}))]);

  const ws=XLSX.utils.aoa_to_sheet(aoa);
  ws['!merges']=[{s:{r:0,c:0},e:{r:0,c:HDR.length-1}},{s:{r:1,c:0},e:{r:1,c:HDR.length-1}}];
  ws['!cols']=[{wch:11},{wch:11},{wch:32},{wch:20},{wch:13},{wch:12},{wch:12},{wch:11},{wch:12},{wch:13},{wch:34},{wch:12}];
  ws['!rows']=[{hpt:22},{hpt:16}];
  ws['!freeze']={xSplit:0,ySplit:3};      // encabezados fijos al desplazar
  const wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,ws,'Kardex');
  XLSX.writeFile(wb,`Kardex_Combustible_${new Date().toISOString().slice(0,10)}.xlsx`);
  toast(`✓ ${lista.length} movimiento${lista.length===1?'':'s'} exportados`);
}


// ══ DASHBOARD COMBUSTIBLE (períodos 21→20) ══
let _combTabActiva='kardex', _combDashOffset=0, _combChart=null;
// Filtros interactivos del dashboard (estilo Power BI): Tipo → Subtipo → Código
let _combDashTipo=null, _combDashSub=null, _combDashEqId=null;
function _combDashSelTipo(t){
  if(_combDashTipo===t){_combDashTipo=null;_combDashSub=null;_combDashEqId=null;}
  else{_combDashTipo=t;_combDashSub=null;_combDashEqId=null;}
  rCombDash();
}
function _combDashSelSub(s){
  if(_combDashSub===s){_combDashSub=null;_combDashEqId=null;}
  else{_combDashSub=s;_combDashEqId=null;}
  rCombDash();
}
function _combDashSelEq(id){
  _combDashEqId=_combDashEqId===id?null:id;
  rCombDash();
}

function _combTab(t){
  _combTabActiva=t;
  const k=document.getElementById('combTab-kardex');
  const d=document.getElementById('combTab-dash');
  if(k)k.style.display=t==='kardex'?'':'none';
  if(d)d.style.display=t==='dash'?'':'none';
  ['kardex','dash'].forEach(x=>{
    const b=document.getElementById('combTabBtn-'+x);
    if(b){b.style.background=x===t?'var(--alm)':'transparent';b.style.color=x===t?'#fff':'var(--muted2)';}
  });
  if(t==='dash')rCombDash();
}

// Período 21→20 propio del dashboard (offset independiente de Cost Control)
function _combPeriodo(){
  const hoy=new Date();
  const d=hoy.getDate(), m=hoy.getMonth(), y=hoy.getFullYear();
  let baseY=y, baseM=m;
  if(d<21){baseM=m-1; if(baseM<0){baseM=11;baseY=y-1;}}
  let iniM=baseM+_combDashOffset, iniY=baseY;
  while(iniM>11){iniM-=12;iniY++;}
  while(iniM<0){iniM+=12;iniY--;}
  const ini=new Date(iniY,iniM,21);
  const fin=new Date(iniY,iniM+1,20);
  const fmtD=x=>`${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}-${String(x.getDate()).padStart(2,'0')}`;
  const MESES=['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  const diasTot=Math.round((fin-ini)/86400000)+1;
  return {desde:fmtD(ini), hasta:fmtD(fin), ini, fin, label:`${MESES[fin.getMonth()]} ${fin.getFullYear()}`, dias:diasTot};
}
function _combDashNav(dir){_combDashOffset+=dir;rCombDash();}

function rCombDash(){
  const pg=document.getElementById('combTab-dash');if(!pg)return;
  const per=_combPeriodo();
  const fmtS=n=>'S/ '+Number(n||0).toLocaleString('es-PE',{minimumFractionDigits:2,maximumFractionDigits:2});

  // Despachos del período (todos — base para los chips de filtro)
  const despAll=(DB.combustible||[]).filter(c=>c.tipoMov!=='Ingreso'&&c.fecha>=per.desde&&c.fecha<=per.hasta);
  const eqById=id=>(DB.equipos||[]).find(e=>e.id===id);

  // — Chips por tipo de equipo → subtipo → equipo —
  const tiposMap={};
  despAll.forEach(c=>{
    const eq=eqById(c.eqId);
    const t=eq?(eq.tipo||'Otros'):'Otros';
    const s=eq?(eq.sub||'Otros'):'Otros';
    if(!tiposMap[t])tiposMap[t]={gal:0,subs:{}};
    tiposMap[t].gal+=(+c.gal||0);
    if(!tiposMap[t].subs[s])tiposMap[t].subs[s]={gal:0,eqs:{}};
    tiposMap[t].subs[s].gal+=(+c.gal||0);
    if(eq){
      if(!tiposMap[t].subs[s].eqs[eq.id])tiposMap[t].subs[s].eqs[eq.id]={eq,gal:0};
      tiposMap[t].subs[s].eqs[eq.id].gal+=(+c.gal||0);
    }
  });
  // Si la selección ya no existe en este período, limpiarla
  if(_combDashTipo&&!tiposMap[_combDashTipo]){_combDashTipo=null;_combDashSub=null;_combDashEqId=null;}
  if(_combDashSub&&(!_combDashTipo||!tiposMap[_combDashTipo].subs[_combDashSub])){_combDashSub=null;_combDashEqId=null;}
  if(_combDashEqId&&_combDashSub&&!tiposMap[_combDashTipo].subs[_combDashSub].eqs[_combDashEqId])_combDashEqId=null;

  // — Aplicar filtros activos (cascada: equipo > subtipo > tipo) —
  const desp=despAll.filter(c=>{
    if(_combDashEqId)return c.eqId===_combDashEqId;
    const eq=eqById(c.eqId);
    const t=eq?(eq.tipo||'Otros'):'Otros';
    const s=eq?(eq.sub||'Otros'):'Otros';
    if(_combDashSub)return t===_combDashTipo&&s===_combDashSub;
    if(_combDashTipo)return t===_combDashTipo;
    return true;
  });
  const totGal=desp.reduce((a,c)=>a+(+c.gal||0),0);
  const totCosto=desp.reduce((a,c)=>a+(+c.gal||0)*(+c.precio||0),0);
  const diasConDesp=new Set(desp.map(c=>c.fecha)).size;

  // Agrupar por equipo
  const eqMap={};
  desp.forEach(c=>{
    const key=c.eqId||0;
    if(!eqMap[key])eqMap[key]={eqId:c.eqId,gal:0,costo:0,n:0,fechas:new Set(),ultima:''};
    eqMap[key].gal+=(+c.gal||0);
    eqMap[key].costo+=(+c.gal||0)*(+c.precio||0);
    eqMap[key].n++;
    eqMap[key].fechas.add(c.fecha);
    if(c.fecha>eqMap[key].ultima)eqMap[key].ultima=c.fecha;
  });

  // Horas efectivas por equipo (partes del período) para ratio de consumo
  const partesP=(DB.partes||[]).filter(p=>p.fecha>=per.desde&&p.fecha<=per.hasta);
  const hrsMap={};
  partesP.forEach(p=>{hrsMap[p.eqId]=(hrsMap[p.eqId]||0)+Math.max(0,+p.ef||0);});

  const rows=Object.values(eqMap).map(r=>{
    const eq=(DB.equipos||[]).find(e=>e.id===r.eqId);
    const hrs=hrsMap[r.eqId]||0;
    return{...r,eq,hrs,ratio:hrs>0?r.gal/hrs:null,galDia:r.fechas.size>0?r.gal/r.fechas.size:0};
  }).sort((a,b)=>b.gal-a.gal);

  // Serie diaria (todas las fechas del período 21→20)
  const labels=[],serie=[];
  const cur=new Date(per.ini.getTime());
  const galPorFecha={};
  desp.forEach(c=>{galPorFecha[c.fecha]=(galPorFecha[c.fecha]||0)+(+c.gal||0);});
  while(cur<=per.fin){
    const f=`${cur.getFullYear()}-${String(cur.getMonth()+1).padStart(2,'0')}-${String(cur.getDate()).padStart(2,'0')}`;
    labels.push(`${String(cur.getDate()).padStart(2,'0')}/${String(cur.getMonth()+1).padStart(2,'0')}`);
    serie.push(+(galPorFecha[f]||0).toFixed(1));
    cur.setDate(cur.getDate()+1);
  }

  const kpis=[
    {l:'Despachado en Período',v:totGal.toFixed(1)+' gal',c:'#f97316'},
    {l:'Costo Total (almacén)',v:fmtS(totCosto),c:'#ef4444'},
    {l:'Equipos Abastecidos',v:rows.length,c:'#06b6d4'},
    {l:'Promedio × Día c/desp.',v:diasConDesp>0?(totGal/diasConDesp).toFixed(1)+' gal':'—',c:'#10b981'},
  ];

  const TH=`background:var(--panel2);color:var(--muted2);font-size:.68rem;font-weight:700;text-transform:uppercase;letter-spacing:.07em;padding:.5rem .7rem;white-space:nowrap`;
  const TD=`padding:.5rem .7rem;border-bottom:1px solid var(--border);font-size:.81rem;vertical-align:middle`;

  const tbody=rows.map(r=>{
    const cod=r.eq?r.eq.codigo:'(sin equipo)';
    const nom=r.eq?`${r.eq.nombre||''}`:'—';
    const sub=r.eq?(r.eq.sub||''):'';
    const ratioCell=r.ratio!==null
      ?`<span style="font-family:monospace;font-weight:700;color:${r.ratio>10?'#ef4444':r.ratio>5?'#f59e0b':'#10b981'}">${r.ratio.toFixed(2)}</span> <span style="font-size:.62rem;color:var(--muted2)">gal/h</span>`
      :'<span style="color:var(--muted2);font-size:.7rem" title="Sin partes diarios en el período">s/horas</span>';
    return`<tr onmouseover="this.style.background='var(--hover)'" onmouseout="this.style.background=''">
      <td style="${TD}"><span class="mono" style="font-size:.74rem;font-weight:700;color:#f97316">${cod}</span></td>
      <td style="${TD}"><div style="font-weight:600">${nom}</div><div style="font-size:.68rem;color:var(--muted2)">${sub}</div></td>
      <td style="${TD};text-align:center;font-family:monospace">${r.n}</td>
      <td style="${TD};text-align:right;font-family:monospace;font-weight:900;color:#f97316">${r.gal.toFixed(1)}</td>
      <td style="${TD};text-align:right;font-family:monospace;color:#ef4444">${fmtS(r.costo)}</td>
      <td style="${TD};text-align:right;font-family:monospace">${r.hrs>0?r.hrs.toFixed(1)+' h':'—'}</td>
      <td style="${TD};text-align:right">${ratioCell}</td>
      <td style="${TD};text-align:right;font-family:monospace;font-size:.76rem">${r.galDia.toFixed(1)} <span style="font-size:.62rem;color:var(--muted2)">gal/día</span></td>
      <td style="${TD};text-align:center;font-family:monospace;font-size:.74rem;color:var(--muted2)">${r.ultima||'—'}</td>
    </tr>`;
  }).join('');

  // — Chips de tipos de equipo (filtro interactivo) —
  const tiposSorted=Object.entries(tiposMap).sort((a,b)=>b[1].gal-a[1].gal);
  const chipTipos=tiposSorted.map(([t,d])=>{
    const act=_combDashTipo===t;
    const tEsc=t.replace(/'/g,"\\'");
    return`<button onclick="_combDashSelTipo('${tEsc}')" style="display:inline-flex;align-items:center;gap:.4rem;padding:.35rem .8rem;border-radius:20px;cursor:pointer;font-size:.76rem;font-weight:700;border:1.5px solid ${act?'#f97316':'var(--border)'};background:${act?'rgba(249,115,22,.18)':'var(--panel2)'};color:${act?'#f97316':'var(--text)'};transition:all .15s">
      ${t} <span style="font-family:monospace;font-size:.68rem;font-weight:900;color:${act?'#f97316':'var(--muted2)'}">${d.gal.toFixed(0)} gal</span>${act?' ✕':''}
    </button>`;
  }).join('');
  const chipTodos=`<button onclick="_combDashTipo=null;_combDashSub=null;_combDashEqId=null;rCombDash()" style="display:inline-flex;align-items:center;padding:.35rem .8rem;border-radius:20px;cursor:pointer;font-size:.76rem;font-weight:700;border:1.5px solid ${!_combDashTipo?'#06b6d4':'var(--border)'};background:${!_combDashTipo?'rgba(6,182,212,.15)':'var(--panel2)'};color:${!_combDashTipo?'#06b6d4':'var(--muted2)'}">Todos</button>`;

  // — Chips de subtipos (aparecen al seleccionar un tipo) —
  let chipSubs='';
  if(_combDashTipo&&tiposMap[_combDashTipo]){
    const subsT=Object.entries(tiposMap[_combDashTipo].subs).sort((a,b)=>b[1].gal-a[1].gal);
    chipSubs=`<div style="display:flex;gap:.35rem;flex-wrap:wrap;margin-top:.5rem;padding:.55rem .7rem;background:rgba(139,92,246,.05);border:1px dashed rgba(139,92,246,.4);border-radius:9px">
      <span style="font-size:.64rem;color:var(--muted2);text-transform:uppercase;letter-spacing:.07em;font-weight:700;align-self:center">↳ Subtipo:</span>
      ${subsT.map(([s,d])=>{
        const act=_combDashSub===s;
        const sEsc=s.replace(/'/g,"\\'");
        return`<button onclick="_combDashSelSub('${sEsc}')" style="display:inline-flex;align-items:center;gap:.35rem;padding:.3rem .7rem;border-radius:18px;cursor:pointer;font-size:.73rem;font-weight:700;border:1.5px solid ${act?'#8b5cf6':'var(--border)'};background:${act?'rgba(139,92,246,.2)':'var(--panel2)'};color:${act?'#a78bfa':'var(--text)'};transition:all .15s">
          ${s.toUpperCase()} <span style="font-family:monospace;font-size:.64rem;font-weight:900;color:${act?'#a78bfa':'var(--muted2)'}">${d.gal.toFixed(0)} gal</span>${act?' ✕':''}
        </button>`;
      }).join('')}
    </div>`;
  }

  // — Chips de códigos de equipo (aparecen al seleccionar un subtipo) —
  let chipEquipos='';
  if(_combDashTipo&&_combDashSub&&tiposMap[_combDashTipo]&&tiposMap[_combDashTipo].subs[_combDashSub]){
    const eqsT=Object.values(tiposMap[_combDashTipo].subs[_combDashSub].eqs).sort((a,b)=>b.gal-a.gal);
    chipEquipos=`<div style="display:flex;gap:.35rem;flex-wrap:wrap;margin-top:.5rem;padding:.55rem .7rem;background:rgba(249,115,22,.05);border:1px dashed rgba(249,115,22,.35);border-radius:9px">
      <span style="font-size:.64rem;color:var(--muted2);text-transform:uppercase;letter-spacing:.07em;font-weight:700;align-self:center">↳ ${_combDashSub}:</span>
      ${eqsT.map(({eq,gal})=>{
        const act=_combDashEqId===eq.id;
        return`<button onclick="_combDashSelEq(${eq.id})" style="display:inline-flex;align-items:center;gap:.35rem;padding:.25rem .65rem;border-radius:16px;cursor:pointer;font-size:.7rem;font-weight:700;font-family:monospace;border:1.5px solid ${act?'#f97316':'var(--border)'};background:${act?'#f97316':'var(--panel2)'};color:${act?'#fff':'var(--text)'};transition:all .15s">
          ${eq.codigo} <span style="font-size:.62rem;font-weight:900;color:${act?'rgba(255,255,255,.75)':'var(--muted2)'}">${gal.toFixed(0)}g</span>${act?' ✕':''}
        </button>`;
      }).join('')}
    </div>`;
  }

  // Título dinámico según selección
  const selEq=_combDashEqId?eqById(_combDashEqId):null;
  const tituloSel=selEq?`${selEq.codigo} — ${selEq.nombre||''}`
    :_combDashSub?`${_combDashTipo} · ${_combDashSub}`
    :_combDashTipo?_combDashTipo:'todos los equipos';

  pg.innerHTML=`
    <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:.6rem;margin-bottom:1rem">
      <div style="font-size:.78rem;color:var(--muted2)">Período 21→20 · <span class="mono">${per.desde}</span> al <span class="mono">${per.hasta}</span> · ${per.dias} días</div>
      <div style="display:flex;align-items:center;background:var(--panel2);border:1px solid var(--border);border-radius:8px;overflow:hidden">
        <button onclick="_combDashNav(-1)" style="background:none;border:none;border-right:1px solid var(--border);color:var(--text);cursor:pointer;font-size:1.1rem;padding:.35rem .7rem;line-height:1">‹</button>
        <span style="font-weight:800;font-size:.88rem;color:var(--text);min-width:130px;text-align:center;padding:0 .5rem">${per.label}</span>
        <button onclick="_combDashNav(1)" style="background:none;border:none;border-left:1px solid var(--border);color:var(--text);cursor:pointer;font-size:1.1rem;padding:.35rem .7rem;line-height:1">›</button>
      </div>
    </div>
    <div class="kpi-row">${kpis.map(k=>`<div class="kpi" style="--kc:${k.c}"><div class="kpi-lbl">${k.l}</div><div class="kpi-val" style="font-size:${String(k.v).length>10?'1.1rem':'1.6rem'}">${k.v}</div></div>`).join('')}</div>
    <div style="margin-bottom:1rem">
      <div style="display:flex;gap:.35rem;flex-wrap:wrap;align-items:center">
        <span style="font-size:.64rem;color:var(--muted2);text-transform:uppercase;letter-spacing:.07em;font-weight:700">Tipo de equipo:</span>
        ${chipTodos}${chipTipos}
      </div>
      ${chipSubs}
      ${chipEquipos}
    </div>
    <div class="card" style="margin-bottom:1rem">
      <div class="card-head"><span class="card-title">⛽ Despacho diario — <span style="color:#f97316">${tituloSel}</span></span></div>
      <div class="card-body" style="height:260px;position:relative">
        ${desp.length?'<canvas id="combDashChart"></canvas>':'<div style="text-align:center;padding:3rem;color:var(--muted2);font-size:.85rem">Sin despachos en este período</div>'}
      </div>
    </div>
    <div class="card">
      <div class="card-head"><span class="card-title">Consumo por Equipo</span><span style="font-size:.7rem;color:var(--muted2)">Ratio = galones ÷ horas efectivas (partes diarios del período)</span></div>
      <div class="card-body"><div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;min-width:850px">
        <thead><tr>
          <th style="${TH}">Código</th><th style="${TH}">Equipo</th>
          <th style="${TH};text-align:center">Despachos</th>
          <th style="${TH};text-align:right">Galones</th>
          <th style="${TH};text-align:right">Costo S/</th>
          <th style="${TH};text-align:right">Horas Ef.</th>
          <th style="${TH};text-align:right">Ratio Consumo</th>
          <th style="${TH};text-align:right">Prom. Diario</th>
          <th style="${TH};text-align:center">Últ. Despacho</th>
        </tr></thead>
        <tbody>${tbody||`<tr><td colspan="9" style="text-align:center;padding:2.5rem;color:var(--muted2);font-size:.85rem">Sin despachos en este período</td></tr>`}</tbody>
      </table></div></div>
    </div>`;

  // Gráfico de barras diario
  if(desp.length&&typeof Chart!=='undefined'){
    if(_combChart){_combChart.destroy();_combChart=null;}
    const ctx=document.getElementById('combDashChart');
    if(ctx){
      _combChart=new Chart(ctx,{
        type:'bar',
        data:{labels,datasets:[{label:'Galones despachados',data:serie,backgroundColor:'rgba(249,115,22,.55)',borderColor:'#f97316',borderWidth:1,borderRadius:3}]},
        options:{
          responsive:true,maintainAspectRatio:false,
          plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>c.parsed.y.toFixed(1)+' gal'}}},
          scales:{
            x:{ticks:{color:'#8b93a7',font:{size:9},maxRotation:60,minRotation:45},grid:{display:false}},
            y:{ticks:{color:'#8b93a7',font:{size:10},callback:v=>v+' gal'},grid:{color:'rgba(139,147,167,.12)'},beginAtZero:true}
          }
        }
      });
    }
  }
}
