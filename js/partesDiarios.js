// ══ PARTES DIARIOS — CONTROL DE EQUIPOS POR LÍNEA ══
// (separado de auxmec.js — formularios de parte diario LA/LB/VM/EM)

// ══ CONTROL EQUIPOS POR LÍNEA ══
const lineaMap={'Línea Amarilla':'lineaAmarilla','Línea Blanca':'lineaBlanca','Vehículo Menor':'vehiculosMenores','Equipos Menores':'equiposMenores'};
let currentReporteTipo='Línea Amarilla';
let _editingParteId=null;

// ── ESTADO FORMULARIO PARTE ──
let parteState = { turno:'DIA', guardia:'A', viajeCount:0, tipo:'' };
let _laSort = {col:'fecha', dir:'desc'};
function _laSortBy(col){
  _laSort.dir = _laSort.col===col ? (_laSort.dir==='asc'?'desc':'asc') : 'desc';
  _laSort.col = col;
  rLinea('Línea Amarilla');
}
let _lbSort = {col:'fecha', dir:'desc'};
function _lbSortBy(col){
  _lbSort.dir = _lbSort.col===col ? (_lbSort.dir==='asc'?'desc':'asc') : 'desc';
  _lbSort.col = col;
  rLinea('Línea Blanca');
}

function switchTab(n){
  document.getElementById('tabContent1').style.display = n===1?'block':'none';
  document.getElementById('tabContent2').style.display = n===2?'block':'none';
  document.getElementById('tab1').classList.toggle('active', n===1);
  document.getElementById('tab2').classList.toggle('active', n===2);
}

function setToggle(grupo, val){
  parteState[grupo] = val;
  if(grupo==='turno'){
    ['DIA','NOCHE'].forEach(v => document.getElementById('t'+v).classList.toggle('active', v===val));
  } else {
    ['A','B','C'].forEach(v => document.getElementById('g'+v).classList.toggle('active', v===val));
  }
}

// Al elegir operador, selecciona automáticamente su guardia según el registro de personal
function _rpAutoGuardia(){
  const val=document.getElementById('rpOperador')?.value||'';
  if(!val)return;
  const p=(DB.personal||[]).find(x=>`${x.ape}, ${x.nom}`===val);
  if(p&&['A','B','C'].includes(p.guardia)){
    setToggle('guardia',p.guardia);
    toast(`Guardia ${p.guardia} — según registro de ${p.ape}`);
  }
}

function filtrarEquipos(){
  const sub = document.getElementById('rpTipo').value;
  parteState.tipo = sub;
  const sel = document.getElementById('rpCodigo');
  const linea = currentReporteTipo;
  const eq = DB.equipos.filter(e=>e.tipo===linea&&(!sub||e.sub===sub)&&!(linea==='Vehículo Menor'&&(e.sub||'').toLowerCase().includes('luminaria')));
  sel.innerHTML = '<option value="">— Seleccionar —</option>' +
    eq.map(e=>`<option value="${e.id}">${e.codigo}${e.placa?' – '+e.placa:''}</option>`).join('');
  const tabV = document.getElementById('tab2');
  if(tabV) tabV.style.display = (currentReporteTipo==='Línea Blanca' || sub.toUpperCase()==='VOLQUETE') ? 'block' : 'none';
  // Filtrar operadores por cargo según subtipo (LA, LB, VM)
  const _catFiltro={'Línea Amarilla':'Operador LA','Línea Blanca':'Operador LB'};
  const opEl=document.getElementById('rpOperador');
  if(opEl){
    let ops;
    const isAct=p=>(p.est||'').toLowerCase()==='activo';
    const _cg=p=>(p.cargo||'').toLowerCase();
    // Coincidencia flexible subtipo↔cargo: "Tractor Oruga" ↔ "OP. TRACTOR", "Retroexcavadora" ↔ "OP. RETRO"
    const _opMatchSub=(p,s)=>{
      s=(s||'').toLowerCase();
      if(!s)return true;
      const cargo=_cg(p);
      if(cargo.includes(s))return true;
      const stok=s.split(/[^a-zñáéíóú0-9]+/).filter(w=>w.length>=4);
      const ctok=cargo.split(/[^a-zñáéíóú0-9]+/).filter(w=>w.length>=4&&w!=='operador');
      return stok.some(st=>ctok.some(ct=>st.startsWith(ct)||ct.startsWith(st)));
    };
    if(linea==='Vehículo Menor'){
      const s=(sub||'').toLowerCase();
      if(s.includes('cisterna')||s.includes('d2l')){
        // Cisterna D2L → solo operadores de cisterna de combustible
        ops=DB.personal.filter(p=>isAct(p)&&_cg(p).includes('cisterna')&&(_cg(p).includes('comb')||_cg(p).includes('d2l')));
        if(!ops.length)ops=DB.personal.filter(p=>isAct(p)&&(_cg(p).includes('cisterna')||(p.cat||'')==='Operador Combustible'));
      }else{
        ops=sub ? DB.personal.filter(p=>isAct(p)&&_opMatchSub(p,sub)) : [];
      }
      if(!ops.length) ops=DB.personal.filter(p=>isAct(p));
    }else if(linea==='Línea Amarilla'||linea==='Línea Blanca'){
      const cat=_catFiltro[linea];
      ops=DB.personal.filter(p=>isAct(p)&&p.cat===cat&&(!sub||_opMatchSub(p,sub)));
      if(!ops.length) ops=DB.personal.filter(p=>isAct(p)&&p.cat===cat);
    }
    if(ops) opEl.innerHTML='<option value="">— Seleccionar —</option>'+ops.map(p=>`<option>${p.ape}, ${p.nom}</option>`).join('');
  }
  _setViajesMode(sub);
  // Tramo de trabajo: mostrar para LA no-volquete (moto, rodillo, tractor, etc.)
  const isVolq=sub.toUpperCase()==='VOLQUETE';
  const isLA=linea==='Línea Amarilla';
  const tramoRow=document.getElementById('rpParteTramoRow');
  if(tramoRow){
    tramoRow.style.display=(isLA&&!isVolq)?'':'none';
    if(isLA&&!isVolq){
      const trSel=document.getElementById('rpParteTramoId');
      if(trSel){
        const cur=trSel.value;
        trSel.innerHTML='<option value="">— Sin tramo —</option>'+
          (DB.tramos||[]).sort((a,b)=>(a.codigo||'').localeCompare(b.codigo||''))
            .map(t=>`<option value="${t.id}">${t.codigo}${t.inicio?` (${t.inicio}${t.fin?' → '+t.fin:''})`:''}</option>`).join('');
        if(cur)trSel.value=cur;
      }
    }
  }
  // (cistSection uses dynamic rows — no static select to fill)
}

function autoFillEquipo(){
  const id = +document.getElementById('rpCodigo').value;
  const eq = DB.equipos.find(e=>e.id===id);
  if(eq && eq.hr) document.getElementById('rpHrIni').value = eq.hr;
  _checkStandby();
}

function _checkStandby(){
  const cond=document.getElementById('rpCondicion')?.value||'';
  const eqId=+document.getElementById('rpCodigo').value;
  if(!eqId){calcHoras();return;}

  // Obtener último hrFin y kmFin registrados para este equipo
  const partesEq=DB.partes.filter(p=>p.eqId===eqId&&+p.hrFin>0);
  let lastHr=partesEq.length?Math.max(...partesEq.map(p=>+p.hrFin||0)):0;
  if(!lastHr){const eq=DB.equipos.find(e=>e.id===eqId);lastHr=+eq?.hr||0;}

  const _esKm=['Línea Blanca','Vehículo Menor'].includes(currentReporteTipo);
  const partesKm=_esKm?DB.partes.filter(p=>p.eqId===eqId&&+p.kmFin>0):[];
  let lastKm=partesKm.length?Math.max(...partesKm.map(p=>+p.kmFin||0)):0;

  if(cond==='OPERATIVO (TRABAJADO)'){
    if(lastHr>0) document.getElementById('rpHrIni').value=lastHr;
    document.getElementById('rpHrFin').value='';
    document.getElementById('rpHrsTrab').value=0;
    document.getElementById('rpHrsInop').value='';
    if(_esKm){
      const ini=document.getElementById('rpKmIni');if(ini&&lastKm>0)ini.value=lastKm;
      const fin=document.getElementById('rpKmFin');if(fin)fin.value='';
      const rec=document.getElementById('rpKmRec');if(rec)rec.value=0;
    }
  }else if(cond==='OPERATIVO (STANDBY)'){
    // hrIni = hrFin = último valor (no hay movimiento)
    if(lastHr>0){
      document.getElementById('rpHrIni').value=lastHr;
      document.getElementById('rpHrFin').value=lastHr;
    }
    if(_esKm){
      const ini=document.getElementById('rpKmIni');
      const fin=document.getElementById('rpKmFin');
      if(ini&&lastKm>0) ini.value=lastKm;
      if(fin&&lastKm>0){fin.value=lastKm;calcKm();}
    }
  }
  calcHoras();
}

let _rpFrenteSelected=[];

function _rpFrenteGetTodos(){
  const fromDB=(DB.frentesTrabajo||[]).map(f=>f.nombre||f.nom||'').filter(Boolean);
  const fromPartes=[];
  (DB.partes||[]).forEach(p=>{if(p.frenteT){p.frenteT.split(', ').forEach(v=>{const t=v.trim();if(t)fromPartes.push(t);});}});
  return [...new Set([...fromDB,...fromPartes])].sort();
}

function filtrarFrentes(){
  if((document.getElementById('rpFrenteDropdown')||{}).style.display!=='none')_rpFrenteRenderList('');
}

function _rpFrenteToggle(){
  const dd=document.getElementById('rpFrenteDropdown');if(!dd)return;
  if(dd.style.display==='none'){
    const b=document.getElementById('rpFrenteBuscar');if(b)b.value='';
    _rpFrenteRenderList('');dd.style.display='block';
  }else{dd.style.display='none';}
}

function _rpFrenteRenderList(q){
  const list=document.getElementById('rpFrenteList');if(!list)return;
  const todos=_rpFrenteGetTodos();
  const fil=q?todos.filter(f=>f.toLowerCase().includes(q.toLowerCase())):todos;
  list.innerHTML=fil.map(f=>{
    const esc=f.replace(/\\/g,'\\\\').replace(/'/g,"\\'").replace(/"/g,'&quot;');
    const chk=_rpFrenteSelected.includes(f);
    return `<label style="display:flex;align-items:center;gap:.65rem;padding:.5rem .75rem;cursor:pointer;font-size:.85rem"><input type="checkbox"${chk?' checked':''} onchange="_rpFrenteCheck('${esc}',this)" style="width:15px;height:15px;accent-color:#0ea5e9;cursor:inherit">${f}</label>`;
  }).join('');
  const sa=document.getElementById('rpFrenteSelAll');
  if(sa)sa.checked=fil.length>0&&fil.every(f=>_rpFrenteSelected.includes(f));
}

function _rpFrenteFiltrar(){_rpFrenteRenderList(document.getElementById('rpFrenteBuscar')?.value||'');}

function _rpFrenteCheck(val,cb){
  if(cb.checked){if(!_rpFrenteSelected.includes(val))_rpFrenteSelected.push(val);}
  else{_rpFrenteSelected=_rpFrenteSelected.filter(v=>v!==val);}
  _rpFrenteUpdate();
  _rpFrenteRenderList(document.getElementById('rpFrenteBuscar')?.value||'');
}

function _rpFrenteSelAll(cb){
  const q=document.getElementById('rpFrenteBuscar')?.value||'';
  const todos=_rpFrenteGetTodos();
  const fil=q?todos.filter(f=>f.toLowerCase().includes(q.toLowerCase())):todos;
  if(cb.checked){fil.forEach(f=>{if(!_rpFrenteSelected.includes(f))_rpFrenteSelected.push(f);});}
  else{fil.forEach(f=>{_rpFrenteSelected=_rpFrenteSelected.filter(v=>v!==f);});}
  _rpFrenteUpdate();_rpFrenteRenderList(q);
}

function _rpFrenteUpdate(){
  const lbl=document.getElementById('rpFrenteLabel'),inp=document.getElementById('rpFrente');
  if(lbl){lbl.textContent=_rpFrenteSelected.length?_rpFrenteSelected.join(' · '):'— Seleccionar frente —';lbl.style.color=_rpFrenteSelected.length?'var(--text)':'var(--muted2)';}
  if(inp)inp.value=_rpFrenteSelected.join(', ');
}

function _rpFrenteNuevo(){
  const b=document.getElementById('rpFrenteBuscar');
  const nom=(b?b.value:'').trim();
  _resetFrenteModal();
  if(nom){const ftNom=document.getElementById('ftNom');if(ftNom)ftNom.value=nom;}
  openM('mFrente');
}

function calcHoras(){
  const ini = +document.getElementById('rpHrIni').value||0;
  const fin = +document.getElementById('rpHrFin').value||0;
  const diff = fin > ini ? parseFloat((fin-ini).toFixed(2)) : 0;
  document.getElementById('rpHrsTrab').value = diff.toFixed(2);
  const cond = document.getElementById('rpCondicion')?.value||'';
  if(cond==='OPERATIVO/INOPERATIVO'){
    const inop = parseFloat(Math.max(0,10-diff).toFixed(2));
    document.getElementById('rpHrsInop').value = inop.toFixed(2);
  }
}

function calcKm(){
  const ini = +document.getElementById('rpKmIni').value||0;
  const fin = +document.getElementById('rpKmFin').value||0;
  const diff = fin > ini ? fin-ini : 0;
  document.getElementById('rpKmRec').value = diff.toFixed(2);
}

let viajeCount = 0;
let cistRiegoCount = 0;

function _recalcCistTotal(){
  let tot=0;
  for(let i=1;i<=cistRiegoCount;i++){
    const el=document.getElementById('crTanques'+i);
    if(el)tot+=+el.value||0;
  }
  const lbl=document.getElementById('cistTotalTanques');
  if(lbl)lbl.textContent=tot||0;
}

function addCistRiego(tanques,tramoId){
  cistRiegoCount++;
  const ci=cistRiegoCount;
  const c=document.getElementById('cistRiegosContainer');if(!c)return;
  const div=document.createElement('div');
  div.className='viaje-block';
  div.id='cistRiego-'+ci;
  const _trOpts=(DB.tramos||[]).sort((a,b)=>(a.codigo||'').localeCompare(b.codigo||''))
    .map(t=>`<option value="${t.id}">${t.codigo}${t.inicio?` (${t.inicio}${t.fin?' → '+t.fin:''})`:''}</option>`).join('');
  div.innerHTML=`<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:.4rem">
    <span style="font-size:.63rem;font-weight:700;color:#06b6d4;letter-spacing:.07em">TRAMO #${ci}</span>
    <button onclick="document.getElementById('cistRiego-${ci}').remove();_recalcCistTotal()" style="background:none;border:none;color:var(--danger);cursor:pointer;font-size:.75rem;padding:0 .2rem" title="Quitar">✕</button>
  </div>
  <div class="fg-grid" style="grid-template-columns:1fr 2fr">
    <div class="fg"><label>N° Tanques</label>
      <input id="crTanques${ci}" type="number" min="0" placeholder="0" value="${tanques||''}" oninput="_recalcCistTotal()" style="text-align:center">
    </div>
    <div class="fg"><label>Tramo Regado 🗺️</label>
      <select id="crTramo${ci}">
        <option value="">— Sin tramo —</option>${_trOpts}
      </select>
    </div>
  </div>`;
  c.appendChild(div);
  if(tramoId){const sel=document.getElementById('crTramo'+ci);if(sel)sel.value=tramoId;}
  _recalcCistTotal();
}

function _cistRiegosClear(){
  cistRiegoCount=0;
  const c=document.getElementById('cistRiegosContainer');if(c)c.innerHTML='';
  _recalcCistTotal();
}

function _cistRiegosGet(){
  const list=[];
  for(let i=1;i<=cistRiegoCount;i++){
    const tanques=+document.getElementById('crTanques'+i)?.value||0;
    const tramoId=+document.getElementById('crTramo'+i)?.value||0;
    if(tanques>0||tramoId)list.push({tanques,tramoId:tramoId||null});
  }
  return list;
}

function _recalcViajes(){
  let totalViajes=0, totalMins=0;
  for(let i=1;i<=viajeCount;i++){
    if(!document.getElementById('viaje-'+i))continue;   // viaje eliminado
    const cant=+document.getElementById('vCant'+i)?.value||0;
    const mat=(document.getElementById('vMat'+i)?.value||'').trim().toUpperCase();
    const sinMat=!mat||mat==='SIN MATERIAL';
    const tramoId=+document.getElementById('vTramo'+i)?.value||0;
    const tramo=(DB.tramos||[]).find(t=>t.id===tramoId);
    if(!sinMat)totalViajes+=cant;
    totalMins+=cant*(tramo?(+tramo.ciclo||0):0);
  }
  const rpNV=document.getElementById('rpNViajes');
  if(rpNV)rpNV.value=totalViajes||0;
  const rpTT=document.getElementById('rpTiempoTrans');
  if(rpTT){
    if(totalMins>0){const h=Math.floor(totalMins/60),m=Math.round(totalMins%60);rpTT.value=String(h).padStart(2,'0')+':'+String(m).padStart(2,'0');}
    else rpTT.value='';
  }
}

function _setViajesMode(sub){
  const isCist=(sub||'').toLowerCase().includes('cistern');
  const cistS=document.getElementById('cistSection');
  const volqS=document.getElementById('volqSection');
  const hdr=document.getElementById('viajesTabHeader');
  if(cistS)cistS.style.display=isCist?'':'none';
  if(volqS)volqS.style.display=isCist?'none':'';
  if(hdr)hdr.textContent=isCist?'▸ Registro de Agua (Cisterna)':'▸ Registro de Viajes (Volquete)';
  if(isCist){_cistRiegosClear();addCistRiego();}
}

function _vTramoChange(i){
  const sel=document.getElementById('vTramo'+i);if(!sel)return;
  const tramo=(DB.tramos||[]).find(t=>t.id===+sel.value);
  const org=document.getElementById('vOrigen'+i);
  const dst=document.getElementById('vDestino'+i);
  if(org)org.value=tramo?(tramo.inicio||''):'';
  if(dst)dst.value=tramo?(tramo.fin||''):'';
  _recalcViajes();
}

function addViaje(){
  viajeCount++;
  const nombres=['PRIMER','SEGUNDO','TERCER','CUARTO','QUINTO'];
  const n=Math.min(viajeCount,5);
  const c=document.getElementById('viajesContainer');
  const div=document.createElement('div');
  div.className='viaje-block';
  div.id='viaje-'+viajeCount;
  const _trOpts=(DB.tramos||[]).map(t=>`<option value="${t.id}">${t.codigo} (${t.inicio||''} → ${t.fin||''})${t.anotacion?` · ${t.anotacion}`:''}</option>`).join('');
  const _matOpts=DB.tipoMaterial.map(m=>`<option value="${m.nombre}">`).join('');
  const vi=viajeCount;
  div.innerHTML=`<div style="display:flex;align-items:center;justify-content:space-between">
      <div class="viaje-title">${nombres[n-1]} TRANSPORTE</div>
      <button onclick="removeViaje(${vi})" style="background:none;border:none;color:var(--danger);cursor:pointer;font-size:.75rem;padding:0 .2rem" title="Quitar viaje">✕</button>
    </div>
    <div class="fg-grid" style="grid-template-columns:1fr">
      <div class="fg"><label>Tramo</label>
        <select id="vTramo${vi}" onchange="_vTramoChange(${vi})">
          <option value="">— Seleccionar tramo —</option>${_trOpts}
        </select>
      </div>
    </div>
    <div class="fg-grid" style="grid-template-columns:1fr 1fr 1fr 1fr">
      <div class="fg"><label>Origen</label>
        <input id="vOrigen${vi}" placeholder="Autocompletado" readonly style="opacity:.7;cursor:default">
      </div>
      <div class="fg"><label>Destino</label>
        <input id="vDestino${vi}" placeholder="Autocompletado" readonly style="opacity:.7;cursor:default">
      </div>
      <div class="fg"><label>Cantidad</label><input id="vCant${vi}" type="number" placeholder="0" oninput="_recalcViajes()"></div>
      <div class="fg"><label>Material</label>
        <input id="vMat${vi}" list="matData${vi}" placeholder="Tipo de material" oninput="_recalcViajes()">
        <datalist id="matData${vi}">${_matOpts}</datalist>
      </div>
    </div>`;
  c.appendChild(div);
}

// Quita un viaje y renumera los títulos de los que quedan (PRIMER, SEGUNDO, ...)
function removeViaje(vi){
  const div=document.getElementById('viaje-'+vi);
  if(div)div.remove();
  _renumerarViajes();
  _recalcViajes();
}
function _renumerarViajes(){
  const nombres=['PRIMER','SEGUNDO','TERCER','CUARTO','QUINTO'];
  const c=document.getElementById('viajesContainer');if(!c)return;
  [...c.querySelectorAll('.viaje-block')].forEach((d,i)=>{
    const t=d.querySelector('.viaje-title');
    if(t)t.textContent=`${nombres[Math.min(i,4)]} TRANSPORTE`;
  });
}

function openReporte(tipo){
  currentReporteTipo = tipo;
  _editingParteId = null;
  document.getElementById('mRepTtl').textContent = '📋 Parte Diario – '+tipo;
  parteState.tipo = tipo;
  viajeCount = 0;
  document.getElementById('viajesContainer').innerHTML = '';
  // Equipos de esta línea (excluye luminarias de Vehículo Menor)
  const _isLumRP=e=>(e.sub||'').toLowerCase().includes('luminaria');
  const eqsLinea = DB.equipos.filter(e=>e.tipo===tipo&&!(tipo==='Vehículo Menor'&&_isLumRP(e)));
  // Poblar rpTipo con subtipos únicos de esta línea (e.sub)
  const tipoSel = document.getElementById('rpTipo');
  const subs = [...new Set(eqsLinea.map(e=>e.sub).filter(Boolean))].sort();
  tipoSel.innerHTML = '<option value="">— Seleccionar —</option>' + subs.map(s=>`<option>${s}</option>`).join('');
  // Poblar equipos (todos de esta línea inicialmente)
  const selEq = document.getElementById('rpCodigo');
  selEq.innerHTML = '<option value="">— Seleccionar —</option>' + eqsLinea.map(e=>`<option value="${e.id}">${e.codigo}${e.placa?' – '+e.placa:''}</option>`).join('');
  // Poblar áreas
  const areas = [...new Set(DB.partes.map(p=>p.areaT).filter(Boolean))];
  if(areas.length === 0) areas.push('R3','NINGUNO');
  document.getElementById('rpArea').innerHTML = '<option value="">— Seleccionar —</option>' + areas.map(a=>`<option>${a}</option>`).join('');
  // Operadores filtrados por categoría según línea
  const _catOp={'Línea Amarilla':'Operador LA','Línea Blanca':'Operador LB'};
  const _catFiltro=_catOp[tipo];
  const _opList=DB.personal.filter(p=>(p.est||'').toLowerCase()==='activo'&&(!_catFiltro||p.cat===_catFiltro));
  document.getElementById('rpOperador').innerHTML='<option value="">— Seleccionar —</option>'+_opList.map(p=>`<option>${p.ape}, ${p.nom}</option>`).join('');
  // Ocultar Operador en Equipos Menores (luminarias y similares sin operador asignado)
  const _opRow=document.getElementById('rpOperadorRow');
  if(_opRow)_opRow.style.display=tipo==='Equipos Menores'?'none':'';
  // Horómetros: ocultar en Vehículo Menor
  const hrSec=document.getElementById('rpHrSection');
  const hrTit=document.getElementById('rpHorTitle');
  const _isVM=tipo==='Vehículo Menor';
  if(hrSec) hrSec.style.display=_isVM?'none':'contents';
  if(hrTit) hrTit.style.display=_isVM?'none':'';
  // Km solo visible en Línea Blanca y Vehículos Menores
  const kmSec=document.getElementById('rpKmSection');
  if(kmSec) kmSec.style.display=(['Línea Blanca','Vehículo Menor'].includes(tipo))?'contents':'none';
  // Tab viajes
  const tabV = document.getElementById('tab2');
  if(tabV) tabV.style.display = tipo==='Línea Blanca'||tipo==='VOLQUETE' ? 'block' : 'none';
  const btnG=document.getElementById('btnGuardarRP');
  if(btnG) btnG.style.display='';
  setToggle('turno','DIA');
  setToggle('guardia','A');
  // Limpiar todos los campos del formulario
  document.getElementById('rpFecha').value=new Date().toISOString().split('T')[0];
  document.getElementById('rpTipo').value='';
  document.getElementById('rpCodigo').value='';
  document.getElementById('rpHrIni').value='';
  document.getElementById('rpHrFin').value='';
  document.getElementById('rpHrsTrab').value=0;
  document.getElementById('rpHrsInop').value='';
  document.getElementById('rpDescuentos').value='';
  document.getElementById('rpDescripcion').value='';
  const _ki=document.getElementById('rpKmIni'),_kf=document.getElementById('rpKmFin'),_kr=document.getElementById('rpKmRec');
  if(_ki)_ki.value='';if(_kf)_kf.value='';if(_kr)_kr.value=0;
  _rpFrenteSelected=[];_rpFrenteUpdate();
  const _rpfd=document.getElementById('rpFrenteDropdown');if(_rpfd)_rpfd.style.display='none';
  _setViajesMode('');
  const _rpNT=document.getElementById('rpNTanques');if(_rpNT)_rpNT.value='';
  const _rpNV=document.getElementById('rpNViajes');if(_rpNV)_rpNV.value='';
  const _rpTT=document.getElementById('rpTiempoTrans');if(_rpTT)_rpTT.value='';
  document.getElementById('rpConclusion').value='';
  switchTab(1);
  openM('mReporte');
}
async function delParte(id){
  const p=DB.partes.find(x=>x.id===id);
  if(!p){toast('Parte no encontrado',true);return;}
  // Validación 48 horas
  const created=p.createdAt?new Date(p.createdAt):null;
  if(!created||isNaN(created.getTime())){toast('No se puede eliminar: fecha de registro desconocida',true);return;}
  const diffHs=(Date.now()-created.getTime())/3600000;
  if(diffHs>48){toast(`⛔ Eliminación bloqueada: el parte fue registrado hace ${Math.round(diffHs)} horas (límite 48 h)`,true);return;}
  const eq=DB.equipos.find(x=>x.id===p.eqId);
  const label=`${p.fecha} – ${eq?eq.codigo:'equipo #'+p.eqId}`;
  if(!confirm(`¿Eliminar el parte del ${label}?\n\nEsta acción no se puede deshacer.`))return;
  toast('Eliminando...');
  await supaDelete('partes',id);
  DB.partes=DB.partes.filter(x=>x.id!==id);
  rLinea(currentReporteTipo);
  toast('✓ Parte eliminado');
}

function editParte(id){
  const p=DB.partes.find(x=>x.id===id);
  if(!p){toast('Parte no encontrado',true);return;}
  const eq=DB.equipos.find(x=>x.id===p.eqId);
  if(!eq){toast('Equipo no encontrado',true);return;}
  openReporte(eq.tipo);
  _editingParteId=id;
  document.getElementById('mRepTtl').textContent='📋 Editar Parte – '+eq.tipo;
  // Tipo/subtipo y equipo
  const rpTipo=document.getElementById('rpTipo');
  if(rpTipo){rpTipo.value=eq.sub||'';filtrarEquipos();}
  const rpCodigo=document.getElementById('rpCodigo');
  if(rpCodigo){rpCodigo.value=eq.id;autoFillEquipo();}
  // Campos básicos
  document.getElementById('rpFecha').value=p.fecha;
  document.getElementById('rpOperador').value=p.op||'';
  setToggle('turno',p.turno||'DIA');
  setToggle('guardia',p.guardia||'A');
  const rpCond=document.getElementById('rpCondicion');
  if(rpCond)rpCond.value=p.condicion||'OPERATIVO';
  document.getElementById('rpHrIni').value=p.hrIni||0;
  document.getElementById('rpHrFin').value=p.hrFin||0;
  calcHoras();
  const rpKmIni=document.getElementById('rpKmIni');
  const rpKmFin=document.getElementById('rpKmFin');
  if(rpKmIni)rpKmIni.value=p.kmIni||0;
  if(rpKmFin){rpKmFin.value=p.kmFin||0;calcKm();}
  document.getElementById('rpDescuentos').value=p.descuentos||0;
  document.getElementById('rpHrsInop').value=p.im||0;
  const rpArea=document.getElementById('rpArea');
  if(rpArea)rpArea.value=p.areaT||'';
  _rpFrenteSelected=(p.frenteT||'').split(', ').map(s=>s.trim()).filter(Boolean);_rpFrenteUpdate();
  document.getElementById('rpDescripcion').value=p.act||'';
  document.getElementById('rpObservaciones').value=p.observaciones||'';
  const rpConc=document.getElementById('rpConclusion');
  if(rpConc)rpConc.value=p.conclusion||'';
  const rpNV=document.getElementById('rpNViajes');
  if(rpNV)rpNV.value=p.nViajes||0;
  const rpTT=document.getElementById('rpTiempoTrans');
  if(rpTT)rpTT.value=p.tiempoTrans||'';
  // Tramo parte (no-volquete LA)
  const rpPTr=document.getElementById('rpParteTramoId');
  if(rpPTr&&p.tramoId){rpPTr.value=p.tramoId;}
  // Cisterna riegos
  if(p.cistRiegos&&p.cistRiegos.length){
    _cistRiegosClear();
    p.cistRiegos.forEach(function(r){addCistRiego(r.tanques,r.tramoId);});
  }else if(p.nTanques){
    _cistRiegosClear();
    addCistRiego(p.nTanques,p.tramoId||null);
  }
  // Viajes
  if(p.viajes&&p.viajes.length){
    p.viajes.forEach(v=>{
      addViaje();
      const tSel=document.getElementById('vTramo'+viajeCount);
      if(tSel&&v.tramoId){tSel.value=v.tramoId;_vTramoChange(viajeCount);}
      document.getElementById('vOrigen'+viajeCount).value=v.origen||'';
      document.getElementById('vDestino'+viajeCount).value=v.destino||'';
      document.getElementById('vCant'+viajeCount).value=v.cant||0;
      document.getElementById('vMat'+viajeCount).value=v.material||'';
    });
    _recalcViajes();
  }
}

//REPORTE DE TRABAJO
async function gReporte(){
  const eqId  = +document.getElementById('rpCodigo').value;
  const fecha = document.getElementById('rpFecha').value;
  if(!eqId||!fecha){ toast('Seleccione equipo y fecha',true); return; }

  const eq = DB.equipos.find(e=>e.id===eqId);

  // VIAJES
  const viajes=[];
  for(let i=1;i<=viajeCount;i++){
    if(!document.getElementById('viaje-'+i))continue;   // viaje eliminado por el usuario
    const v={
      tramoId: +document.getElementById('vTramo'+i)?.value||0,
      origen:  document.getElementById('vOrigen'+i)?.value||'',
      destino: document.getElementById('vDestino'+i)?.value||'',
      cant:   +document.getElementById('vCant'+i)?.value||0,
      material:document.getElementById('vMat'+i)?.value||''
    };
    if(!v.tramoId&&!v.cant&&!v.material.trim())continue; // bloque en blanco: no se guarda
    viajes.push(v);
  }

  const parte = {
    tipoEquipo:    document.getElementById('rpTipo').value,
    codigoEquipo:  eq ? eq.codigo+' – '+eq.nombre : '',
    operador:      currentReporteTipo==='Equipos Menores'?'':document.getElementById('rpOperador').value,
    fecha,
    turno:         parteState.turno,
    guardia:       parteState.guardia,
    condicion:     document.getElementById('rpCondicion').value,
    hrIni:        +document.getElementById('rpHrIni').value||0,
    hrFin:        +document.getElementById('rpHrFin').value||0,
    kmIni:        +document.getElementById('rpKmIni').value||0,
    kmFin:        +document.getElementById('rpKmFin').value||0,
    descuentos:   +document.getElementById('rpDescuentos').value||0,
    hrsInop:      +document.getElementById('rpHrsInop').value||0,
    areaT:         document.getElementById('rpArea').value,
    frenteT:       document.getElementById('rpFrente').value,
    actividades:   document.getElementById('rpDescripcion').value,
    observaciones: document.getElementById('rpObservaciones').value,
    nViajes:      +document.getElementById('rpNViajes').value||0,
    tiempoTrans:   document.getElementById('rpTiempoTrans').value,
    cistRiegos:   _cistRiegosGet(),
    nTanques:     _cistRiegosGet().reduce(function(s,r){return s+r.tanques;},0),
    tramoId:      +document.getElementById('rpParteTramoId')?.value||(_cistRiegosGet()[0]?.tramoId||0),
    conclusion:    document.getElementById('rpConclusion').value,
    colaborador:   CU.nombre,
    viajes
  };

  toast('Guardando en data...');

  const parteDB = {
    fecha:        parte.fecha,
    eq_id:        eqId,
    op:           parte.operador,
    ef:           parseFloat((parte.hrFin - parte.hrIni).toFixed(2)),
    im:           parte.hrsInop,
    comb:         0,
    act:          parte.actividades,
    tipo_equipo:  parte.tipoEquipo,
    turno:        parte.turno,
    guardia:      parte.guardia,
    condicion:    parte.condicion,
    hr_ini:       parte.hrIni,
    hr_fin:       parte.hrFin,
    km_ini:       parte.kmIni||null,
    km_fin:       parte.kmFin||null,
    km_rec:       parte.kmFin>parte.kmIni?parte.kmFin-parte.kmIni:null,
    descuentos:   parte.descuentos||null,
    area_t:       parte.areaT||null,
    frente_t:     parte.frenteT||null,
    observaciones:parte.observaciones||null,
    n_viajes:     parte.nViajes||null,
    tiempo_trans: parte.tiempoTrans||null,
    n_tanques:    parte.nTanques||null,
    cist_riegos:  parte.cistRiegos&&parte.cistRiegos.length?parte.cistRiegos:null,
    tramo_id:     parte.tramoId||null,
    conclusion:   parte.conclusion||null,
    colaborador:  parte.colaborador||null,
    viajes:       viajes.length?viajes:null,
    created_at:   new Date().toISOString()
  };
  let parteId;
  const _wasEdit=!!_editingParteId;
  if(_editingParteId){
    // ACTUALIZAR parte existente
    const {error:updErr}=await supa.from('partes').update(parteDB).eq('id',_editingParteId);
    if(updErr){alert('Error Supabase:\n'+updErr.message);toast('Error: '+updErr.message,true);return;}
    parteId=_editingParteId;
    const idx=DB.partes.findIndex(x=>x.id===parteId);
    if(idx>=0)DB.partes[idx]={...DB.partes[idx],...parte,id:parteId,ef:parseFloat((parte.hrFin-parte.hrIni).toFixed(2)),im:parte.hrsInop,comb:0,act:parte.actividades,eqId};
    _editingParteId=null;
  } else {
    // INSERTAR parte nuevo
    console.log('[Partes] Enviando a Supabase:', parteDB);
    const {data:parteRet,error:parteErr}=await supa.from('partes').insert(parteDB).select('id').single();
    console.log('[Partes] Respuesta:', parteRet, parteErr);
    if(parteErr){alert('Error Supabase:\n'+parteErr.message+'\n\nCódigo: '+parteErr.code);toast('Error: '+parteErr.message,true);return;}
    parteId=parteRet.id;
    // Actualizar horómetro local
    if(eq && parte.hrFin > eq.hr) eq.hr = parte.hrFin;
    DB.partes.push({...parte,id:parteId,ef:parseFloat((parte.hrFin-parte.hrIni).toFixed(2)),im:parte.hrsInop,comb:0,act:parte.actividades,eqId});
  }

  closeM('mReporte');
  viajeCount = 0;
  document.getElementById('viajesContainer').innerHTML='';

  const pg = lineaMap[currentReporteTipo];
  if(pg) renderPage(pg); else renderPage(AP);

  toast('✓ Parte #'+parteId+' '+(_wasEdit?'actualizado':'guardado'));
}
function rLinea(tipo){
  const _isLum=e=>(e.sub||'').toLowerCase().includes('luminaria');
  let eqs;
  if(tipo==='Vehículo Menor')       eqs=DB.equipos.filter(e=>e.tipo===tipo&&!_isLum(e));
  else if(tipo==='Equipos Menores') eqs=DB.equipos.filter(e=>e.tipo===tipo||(e.tipo==='Vehículo Menor'&&_isLum(e)));
  else                              eqs=DB.equipos.filter(e=>e.tipo===tipo);
  const partes=DB.partes.filter(p=>eqs.some(e=>e.id===p.eqId));
  // map to right tbodies
  const tbMap={'Línea Amarilla':'tbLA','Línea Blanca':'tbLB','Vehículo Menor':'tbVM','Equipos Menores':'tbEC'};
  const tbPMap={'Línea Amarilla':'tbPartesLA','Línea Blanca':'tbPartesLB','Vehículo Menor':'tbSalidasVM'};
  const tb=document.getElementById(tbMap[tipo]);
  if(!tb)return;
  if(tipo==='Línea Amarilla'){
    tb.innerHTML=eqs.map(e=>`<tr><td class="mono" style="color:var(--ceq)">${e.codigo}</td><td><strong>${e.nombre}</strong></td><td><span class="badge b-cyan">${e.sub||'—'}</span></td><td>${bge(e.est)}</td><td class="mono">${fmtN(e.hr)} h</td><td class="mono">${e.ultMant||'—'}</td><td class="mono">${e.proxMant||'—'}</td></tr>`).join('');
    // Filtros
    const _fTipo=document.getElementById('laFiltTipo');
    const _fDesde=document.getElementById('laFiltDesde');
    const _fHasta=document.getElementById('laFiltHasta');
    // Poblar combobox de tipos
    if(_fTipo){
      const curT=_fTipo.value;
      const subs=[...new Set(eqs.map(e=>e.sub).filter(Boolean))].sort();
      _fTipo.innerHTML='<option value="">— Todos los tipos —</option>'+subs.map(s=>`<option${s===curT?' selected':''}>${s}</option>`).join('');
    }
    const fTipo=_fTipo?_fTipo.value:'';
    const fDesde=_fDesde?_fDesde.value:'';
    const fHasta=_fHasta?_fHasta.value:'';
    // Aplicar filtros
    let partesF=partes;
    if(fTipo)partesF=partesF.filter(p=>{const eq=DB.equipos.find(e=>e.id===p.eqId);return eq&&eq.sub===fTipo;});
    if(fDesde)partesF=partesF.filter(p=>p.fecha>=fDesde);
    if(fHasta)partesF=partesF.filter(p=>p.fecha<=fHasta);
    // KPIs
    const _efFuLA=p=>(+p.ef||0);
    const _totEf=partesF.reduce((s,p)=>s+_efFuLA(p),0);
    const _totIm=partesF.reduce((s,p)=>s+(+p.im||0),0);
    const _byTipo={};
    partesF.forEach(p=>{const eq=DB.equipos.find(e=>e.id===p.eqId);const k=eq?eq.sub||eq.nombre.split(' ')[0]:'Otros';if(!_byTipo[k])_byTipo[k]=0;_byTipo[k]+=_efFuLA(p);});
    const kpiEl=document.getElementById('laKpis');
    if(kpiEl)kpiEl.innerHTML=[
      {l:'Total Registros',v:partesF.length,c:'var(--ceq)',ic:'📋'},
      {l:'Hs Efectivas',v:parseFloat(_totEf.toFixed(2))+'h',c:'#10b981',ic:'⚙️'},
      {l:'Hs Inoperativas',v:parseFloat(_totIm.toFixed(2))+'h',c:'#ef4444',ic:'🛑'},
      ...Object.entries(_byTipo).sort((a,b)=>b[1]-a[1]).slice(0,4).map(([k,v])=>({l:k,v:parseFloat(v.toFixed(2))+'h',c:'#f59e0b',ic:'🏗️'}))
    ].map(k=>`<div style="background:var(--panel2);border:1px solid var(--border);border-bottom:3px solid ${k.c};border-radius:8px;padding:.55rem .9rem;min-width:130px;flex:1">
      <div style="font-size:.6rem;text-transform:uppercase;letter-spacing:.08em;color:var(--muted2);margin-bottom:.25rem">${k.ic} ${k.l}</div>
      <div style="font-size:1.35rem;font-weight:800;color:${k.c};line-height:1">${k.v}</div>
    </div>`).join('');
    // Ordenar
    partesF=[...partesF].sort((a,b)=>{
      const v=_laSort.col==='ef'?(+a.ef||0)-(+b.ef||0):a.fecha.localeCompare(b.fecha);
      return _laSort.dir==='asc'?v:-v;
    });
    const _fIco=document.getElementById('thLAFechaIco'),_eIco=document.getElementById('thLAEfIco');
    if(_fIco)_fIco.textContent=_laSort.col==='fecha'?(_laSort.dir==='asc'?'▲':'▼'):'⇅';
    if(_eIco)_eIco.textContent=_laSort.col==='ef'?(_laSort.dir==='asc'?'▲':'▼'):'⇅';
    // Tabla
    const tbP=document.getElementById('tbPartesLA');
    if(tbP)tbP.innerHTML=partesF.map(p=>{
      const eq=DB.equipos.find(x=>x.id===p.eqId);
      const _can48=p.createdAt&&((Date.now()-new Date(p.createdAt).getTime())/3600000)<48;
      return`<tr><td class="mono">${p.fecha}</td><td>${eq?`<span class="badge b-cyan" style="font-size:.65rem;margin-right:.3rem">${eq.sub||''}</span>${eq.codigo}`:''}</td><td>${p.op}</td><td class="mono" style="color:${(+p.ef)<0?'#ef4444':'#f59e0b'};font-weight:600">${parseFloat((+p.ef).toFixed(2))}h</td><td class="mono">${parseFloat((+p.im).toFixed(2))}h</td><td class="mono" style="display:none">${p.comb} gal</td><td>${p.act}</td>
      <td style="display:flex;gap:4px">
        <button class="btn btn-out btn-sm" onclick="editParte(${p.id})" style="color:#f59e0b;border-color:#f59e0b60" title="Editar">✏️</button>
        ${_can48?`<button class="btn btn-out btn-sm" onclick="delParte(${p.id})" style="color:#ef4444;border-color:#ef444460" title="Eliminar (disponible 48h)">🗑️</button>`:`<button class="btn btn-out btn-sm" disabled style="color:#3d5070;border-color:#2a3a5a;cursor:not-allowed" title="Eliminación bloqueada (+48h)">🔒</button>`}
      </td></tr>`;
    }).join('');
  }else if(tipo==='Línea Blanca'){
    tb.innerHTML=eqs.map(e=>`<tr><td class="mono" style="color:var(--ceq)">${e.codigo}</td><td><strong>${e.nombre}</strong></td><td class="mono">${e.placa||'—'}</td><td>${e.modelo||'—'}</td><td>${bge(e.est)}</td><td class="mono">${fmtN(e.hr)} km</td><td class="mono">${e.proxMant||'—'}</td></tr>`).join('');
    // Filtros LB
    const _fEq=document.getElementById('lbFiltEq');
    const _fDesde=document.getElementById('lbFiltDesde');
    const _fHasta=document.getElementById('lbFiltHasta');
    if(_fEq){
      const curE=_fEq.value;
      _fEq.innerHTML='<option value="">— Todos los equipos —</option>'+eqs.map(e=>`<option value="${e.id}"${e.id==curE?' selected':''}>${e.codigo} – ${e.nombre.split(' ').slice(0,3).join(' ')}</option>`).join('');
    }
    const fEq=_fEq?+_fEq.value||0:0;
    const fDesde=_fDesde?_fDesde.value:'';
    const fHasta=_fHasta?_fHasta.value:'';
    let partesLB=[...partes];
    if(fEq)partesLB=partesLB.filter(p=>p.eqId===fEq);
    if(fDesde)partesLB=partesLB.filter(p=>p.fecha>=fDesde);
    if(fHasta)partesLB=partesLB.filter(p=>p.fecha<=fHasta);
    // Helper: viajes con material (excluye transporte sin material)
    const _vMat=p=>{
      if(p.viajes&&p.viajes.length)
        return p.viajes.filter(v=>v.material&&v.material.trim()&&v.material.trim().toUpperCase()!=='SIN MATERIAL').reduce((s,v)=>s+(+v.cant||0),0);
      return +p.nViajes||0;
    };
    // KPIs LB
    const _totViajes=partesLB.reduce((s,p)=>s+_vMat(p),0);
    const _totKm=partesLB.reduce((s,p)=>s+(+p.kmRec||0),0);
    const _totM3=_totViajes*12.5;
    const _byEq={};
    partesLB.forEach(p=>{const eq=DB.equipos.find(e=>e.id===p.eqId);const k=eq?eq.codigo:'Otros';if(!_byEq[k])_byEq[k]=0;_byEq[k]+=_vMat(p);});
    const kpiLB=document.getElementById('lbKpis');
    if(kpiLB)kpiLB.innerHTML=[
      {l:'Total Registros',v:partesLB.length,c:'var(--ceq)',ic:'📋'},
      {l:'Total Viajes',v:_totViajes,c:'#10b981',ic:'🚛'},
      {l:'m³ Transportados',v:parseFloat(_totM3.toFixed(1)),c:'#f59e0b',ic:'🪨'},
      {l:'Km Recorridos',v:parseFloat(_totKm.toFixed(1))+'km',c:'#8b5cf6',ic:'🛣️'},
      ...Object.entries(_byEq).sort((a,b)=>b[1]-a[1]).slice(0,3).map(([k,v])=>({l:k,v:v+' viajes',c:'#06b6d4',ic:'🚚'}))
    ].map(k=>`<div style="background:var(--panel2);border:1px solid var(--border);border-bottom:3px solid ${k.c};border-radius:8px;padding:.55rem .9rem;min-width:130px;flex:1">
      <div style="font-size:.6rem;text-transform:uppercase;letter-spacing:.08em;color:var(--muted2);margin-bottom:.25rem">${k.ic} ${k.l}</div>
      <div style="font-size:1.35rem;font-weight:800;color:${k.c};line-height:1">${k.v}</div>
    </div>`).join('');
    // Ordenar LB
    partesLB=[...partesLB].sort((a,b)=>{
      const v=_lbSort.col==='viajes'?_vMat(a)-_vMat(b):a.fecha.localeCompare(b.fecha);
      return _lbSort.dir==='asc'?v:-v;
    });
    const _fIcoLB=document.getElementById('thLBFechaIco'),_vIcoLB=document.getElementById('thLBViajesIco');
    if(_fIcoLB)_fIcoLB.textContent=_lbSort.col==='fecha'?(_lbSort.dir==='asc'?'▲':'▼'):'⇅';
    if(_vIcoLB)_vIcoLB.textContent=_lbSort.col==='viajes'?(_lbSort.dir==='asc'?'▲':'▼'):'⇅';
    // Tabla LB
    const tbP=document.getElementById('tbPartesLB');
    if(tbP)tbP.innerHTML=partesLB.map(p=>{
      const eq=DB.equipos.find(x=>x.id===p.eqId);
      const vMat=_vMat(p);const m3=vMat*12.5;
      const _can48=p.createdAt&&((Date.now()-new Date(p.createdAt).getTime())/3600000)<48;
      return`<tr>
        <td class="mono">${p.fecha}</td>
        <td>${eq?`<span class="badge b-cyan" style="font-size:.65rem;margin-right:.3rem">${eq.placa||eq.codigo}</span>${eq.codigo}`:''}</td>
        <td>${p.op}</td>
        <td class="mono text-acc">${vMat}${vMat<(+p.nViajes||0)?`<span style="color:#64748b;font-size:.6rem"> /${+p.nViajes||0}</span>`:''}</td>
        <td class="mono">${m3>0?m3+'m³':'—'}</td>
        <td class="mono">${+p.kmRec>0?parseFloat((+p.kmRec).toFixed(1))+'km':'—'}</td>
        <td class="mono" style="color:${(+p.ef)<0?'#ef4444':+p.ef>0?'#10b981':'#64748b'};font-weight:600">${+p.ef!==0?parseFloat((+p.ef).toFixed(2))+'h':'—'}</td>
        <td class="mono">${+p.im>0?parseFloat((+p.im).toFixed(2))+'h':'—'}</td>
        <td class="mono" style="display:none">${p.comb} gal</td>
        <td>${p.act||'—'}</td>
        <td style="display:flex;gap:4px">
          <button class="btn btn-out btn-sm" onclick="editParte(${p.id})" style="color:#f59e0b;border-color:#f59e0b60" title="Editar">✏️</button>
          ${_can48?`<button class="btn btn-out btn-sm" onclick="delParte(${p.id})" style="color:#ef4444;border-color:#ef444460" title="Eliminar (disponible 48h)">🗑️</button>`:`<button class="btn btn-out btn-sm" disabled style="color:#3d5070;border-color:#2a3a5a;cursor:not-allowed" title="Eliminación bloqueada (+48h)">🔒</button>`}
        </td>
      </tr>`;
    }).join('');
  }else if(tipo==='Vehículo Menor'){
    tb.innerHTML=eqs.map(e=>`<tr><td class="mono" style="color:var(--ceq)">${e.codigo}</td><td><strong>${e.nombre}</strong></td><td class="mono">${e.placa||'—'}</td><td><span class="badge b-cyan">${e.sub||'—'}</span></td><td>${bge(e.est)}</td><td class="mono">${fmtN(e.hr)} km</td><td class="mono">—</td></tr>`).join('');
    // Filtros VM
    const _fVMEq=document.getElementById('vmFiltEq');
    const _fVMDesde=document.getElementById('vmFiltDesde');
    const _fVMHasta=document.getElementById('vmFiltHasta');
    if(_fVMEq){
      const curE=_fVMEq.value;
      _fVMEq.innerHTML='<option value="">— Todos los vehículos —</option>'+eqs.map(e=>`<option value="${e.id}"${e.id==curE?' selected':''}>${e.placa?e.placa+' – ':''}${e.codigo} ${(e.nombre||'').split(' ').slice(0,3).join(' ')}</option>`).join('');
    }
    const fVMEq=_fVMEq?+_fVMEq.value||0:0;
    const fVMDesde=_fVMDesde?_fVMDesde.value:'';
    const fVMHasta=_fVMHasta?_fVMHasta.value:'';
    let partesVM=[...partes];
    if(fVMEq)partesVM=partesVM.filter(p=>p.eqId===fVMEq);
    if(fVMDesde)partesVM=partesVM.filter(p=>p.fecha>=fVMDesde);
    if(fVMHasta)partesVM=partesVM.filter(p=>p.fecha<=fVMHasta);
    partesVM=[...partesVM].sort((a,b)=>b.fecha.localeCompare(a.fecha));
    // KPIs VM
    const _totKmVM=partesVM.reduce((s,p)=>{const ki=+p.kmIni||0,kf=+p.kmFin||0;return s+(kf>ki?kf-ki:0);},0);
    const _totCombVM=partesVM.reduce((s,p)=>s+(+p.comb||0),0);
    const _byVeh={};
    partesVM.forEach(p=>{const eq=DB.equipos.find(e=>e.id===p.eqId);const k=eq?(eq.placa||eq.codigo):'Otros';const ki=+p.kmIni||0,kf=+p.kmFin||0;if(!_byVeh[k])_byVeh[k]=0;_byVeh[k]+=(kf>ki?kf-ki:0);});
    const kpiVM=document.getElementById('vmKpis');
    if(kpiVM)kpiVM.innerHTML=[
      {l:'Total Registros',v:partesVM.length,c:'var(--ceq)',ic:'📋'},
      {l:'Km Recorridos',v:parseFloat(_totKmVM.toFixed(1))+' km',c:'#10b981',ic:'🛣️'},
      {l:'Combustible',v:parseFloat(_totCombVM.toFixed(1))+' gal',c:'#f59e0b',ic:'⛽'},
      ...Object.entries(_byVeh).sort((a,b)=>b[1]-a[1]).slice(0,3).map(([k,v])=>({l:k,v:parseFloat(v.toFixed(1))+' km',c:'#8b5cf6',ic:'🚐'}))
    ].map(k=>`<div style="background:var(--panel2);border:1px solid var(--border);border-bottom:3px solid ${k.c};border-radius:8px;padding:.55rem .9rem;min-width:130px;flex:1">
      <div style="font-size:.6rem;text-transform:uppercase;letter-spacing:.08em;color:var(--muted2);margin-bottom:.25rem">${k.ic} ${k.l}</div>
      <div style="font-size:1.35rem;font-weight:800;color:${k.c};line-height:1">${k.v}</div>
    </div>`).join('');
    const tbS=document.getElementById('tbSalidasVM');
    if(tbS){
      if(!partesVM.length){
        tbS.innerHTML='<tr><td colspan="9" class="text-muted" style="text-align:center;padding:1rem">Sin registros. Use ＋ Reporte Diario para agregar.</td></tr>';
      }else{
        const _can48=p=>p.createdAt&&((Date.now()-new Date(p.createdAt).getTime())/3600000)<48;
        tbS.innerHTML=partesVM.map(p=>{
          const eq=DB.equipos.find(x=>x.id===p.eqId);
          const kmIni=+p.kmIni||0,kmFin=+p.kmFin||0;
          const kmTot=kmFin>kmIni?kmFin-kmIni:0;
          return`<tr>
            <td class="mono">${p.fecha}</td>
            <td>${eq?`<span class="badge b-cyan" style="font-size:.62rem;margin-right:.3rem">${eq.placa||eq.codigo}</span>${eq.codigo} ${(eq.nombre||'').split(' ').slice(0,3).join(' ')}`:''}</td>
            <td>${p.op||'—'}</td>
            <td>${p.act||'—'}</td>
            <td class="mono">${kmIni>0?fmtN(kmIni)+' km':'—'}</td>
            <td class="mono">${kmFin>0?fmtN(kmFin)+' km':'—'}</td>
            <td class="mono" style="color:${kmTot>0?'#10b981':'var(--muted)'};font-weight:${kmTot>0?'700':'400'}">${kmTot>0?fmtN(kmTot)+' km':'—'}</td>
            <td class="mono">${+p.comb>0?p.comb+' gal':'—'}</td>
            <td style="display:flex;gap:4px">
              <button class="btn btn-out btn-sm" onclick="editParte(${p.id})" style="color:#f59e0b;border-color:#f59e0b60" title="Editar">✏️</button>
              ${_can48(p)?`<button class="btn btn-out btn-sm" onclick="delParte(${p.id})" style="color:#ef4444;border-color:#ef444460" title="Eliminar">🗑️</button>`:`<button class="btn btn-out btn-sm" disabled style="color:#3d5070;border-color:#2a3a5a;cursor:not-allowed" title="Bloqueado +48h">🔒</button>`}
            </td>
          </tr>`;
        }).join('');
      }
    }
  }else if(tipo==='Equipos Menores'){
    tb.innerHTML=eqs.map(e=>`<tr><td class="mono" style="color:var(--ceq)">${e.codigo}</td><td><strong>${e.nombre}</strong></td><td><span class="badge b-cyan">${e.sub||'—'}</span></td><td>${e.marca}</td><td>${e.modelo}</td><td>${bge(e.est)}</td><td class="mono">${fmtN(e.hr)} h</td></tr>`).join('');
    const _fTipoEM=document.getElementById('emFiltTipo');
    const _fDesdeEM=document.getElementById('emFiltDesde');
    const _fHastaEM=document.getElementById('emFiltHasta');
    if(_fTipoEM){
      const curT=_fTipoEM.value;
      const subs=[...new Set(eqs.map(e=>e.sub).filter(Boolean))].sort();
      _fTipoEM.innerHTML='<option value="">— Todos los tipos —</option>'+subs.map(s=>`<option${s===curT?' selected':''}>${s}</option>`).join('');
    }
    const fTipoEM=_fTipoEM?_fTipoEM.value:'';
    const fDesdeEM=_fDesdeEM?_fDesdeEM.value:'';
    const fHastaEM=_fHastaEM?_fHastaEM.value:'';
    let partesEM=[...partes];
    if(fTipoEM)partesEM=partesEM.filter(p=>{const eq=DB.equipos.find(e=>e.id===p.eqId);return eq&&eq.sub===fTipoEM;});
    if(fDesdeEM)partesEM=partesEM.filter(p=>p.fecha>=fDesdeEM);
    if(fHastaEM)partesEM=partesEM.filter(p=>p.fecha<=fHastaEM);
    partesEM=[...partesEM].sort((a,b)=>b.fecha.localeCompare(a.fecha));
    const _totEfEM=partesEM.reduce((s,p)=>s+(+p.ef||0),0);
    const _totImEM=partesEM.reduce((s,p)=>s+(+p.im||0),0);
    const _byTipoEM={};
    partesEM.forEach(p=>{const eq=DB.equipos.find(e=>e.id===p.eqId);const k=eq?eq.sub||eq.nombre.split(' ')[0]:'Otros';if(!_byTipoEM[k])_byTipoEM[k]=0;_byTipoEM[k]+=(+p.ef||0);});
    const kpiEM=document.getElementById('emKpis');
    if(kpiEM)kpiEM.innerHTML=[
      {l:'Total Registros',v:partesEM.length,c:'var(--ceq)',ic:'📋'},
      {l:'Hs Efectivas',v:parseFloat(_totEfEM.toFixed(2))+'h',c:'#10b981',ic:'⚙️'},
      {l:'Hs Inoperativas',v:parseFloat(_totImEM.toFixed(2))+'h',c:'#ef4444',ic:'🛑'},
      ...Object.entries(_byTipoEM).sort((a,b)=>b[1]-a[1]).slice(0,4).map(([k,v])=>({l:k,v:parseFloat(v.toFixed(2))+'h',c:'#f59e0b',ic:'🔧'}))
    ].map(k=>`<div style="background:var(--panel2);border:1px solid var(--border);border-bottom:3px solid ${k.c};border-radius:8px;padding:.55rem .9rem;min-width:130px;flex:1">
      <div style="font-size:.6rem;text-transform:uppercase;letter-spacing:.08em;color:var(--muted2);margin-bottom:.25rem">${k.ic} ${k.l}</div>
      <div style="font-size:1.35rem;font-weight:800;color:${k.c};line-height:1">${k.v}</div>
    </div>`).join('');
    const tbPartesEM=document.getElementById('tbPartesEM');
    if(tbPartesEM){
      if(!partesEM.length){
        tbPartesEM.innerHTML='<tr><td colspan="7" class="text-muted" style="text-align:center;padding:1rem">Sin registros. Use ＋ Reporte Diario para agregar.</td></tr>';
      }else{
        const _can48=p=>p.createdAt&&((Date.now()-new Date(p.createdAt).getTime())/3600000)<48;
        tbPartesEM.innerHTML=partesEM.map(p=>{
          const eq=DB.equipos.find(x=>x.id===p.eqId);
          return`<tr>
            <td class="mono">${p.fecha}</td>
            <td>${eq?`<span class="badge b-cyan" style="font-size:.65rem;margin-right:.3rem">${eq.sub||''}</span>${eq.codigo}`:''}</td>
            <td>${p.op||'—'}</td>
            <td class="mono" style="color:${(+p.ef)<0?'#ef4444':'#f59e0b'};font-weight:600">${parseFloat((+p.ef).toFixed(2))}h</td>
            <td class="mono">${parseFloat((+p.im).toFixed(2))}h</td>
            <td>${p.act||'—'}</td>
            <td style="display:flex;gap:4px">
              <button class="btn btn-out btn-sm" onclick="editParte(${p.id})" style="color:#f59e0b;border-color:#f59e0b60" title="Editar">✏️</button>
              ${_can48(p)?`<button class="btn btn-out btn-sm" onclick="delParte(${p.id})" style="color:#ef4444;border-color:#ef444460" title="Eliminar">🗑️</button>`:`<button class="btn btn-out btn-sm" disabled style="color:#3d5070;border-color:#2a3a5a;cursor:not-allowed" title="Bloqueado +48h">🔒</button>`}
            </td>
          </tr>`;
        }).join('');
      }
    }
  }
}
