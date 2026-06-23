// ══ DASHBOARD ══
function rDash(){
  document.getElementById('dashSub').textContent=`Bienvenido, ${CU.nombre} · ${CU.cargo}`;
  const areas=CU.areas;
  const tF=DB.facturas.reduce((a,f)=>a+f.monto,0);
  const tC=DB.costos.reduce((a,c)=>a+c.monto,0);
  const kpis=[
    {l:'Personal Activo',v:DB.personal.filter(p=>p.est==='Activo').length,s:'Trabajadores',c:'#3b82f6',a:['administracion']},
    {l:'Equipos Operativos',v:`${DB.equipos.filter(e=>e.est==='Operativo').length}/${DB.equipos.length}`,s:'Flota activa',c:'#10b981',a:['controlEquipos','mantenimiento']},
    {l:'Facturado Total',v:fmt(tF),s:'Todas las facturas',c:'#a78bfa',a:['otros']},
    {l:'Costos del Mes',v:fmt(tC),s:'Egresos',c:'#ef4444',a:['otros']},
    {l:'Incidentes Abiertos',v:DB.incidentes.filter(i=>i.est!=='Cerrado').length,s:'Sin cerrar',c:'#ef4444',a:['seguridad']},
    {l:'Stock Items',v:Object.keys(getStock()).length,s:'Tipos en almacén',c:'#f97316',a:['almacenLogistica']},
    {l:'Mantenimientos OT',v:DB.mantenimientos.filter(m=>m.est!=='Completado').length,s:'Pendientes/en proceso',c:'#8b5cf6',a:['mantenimiento']},
    {l:'Actividades en Curso',v:DB.planner.filter(p=>p.est==='En Curso').length,s:'Del proyecto',c:'#10b981',a:['controlProyecto']},
  ].filter(k=>k.a.some(a=>areas.includes(a))||areas.length>3);
  document.getElementById('dashKpis').innerHTML=kpis.map(k=>`<div class="kpi" style="--kc:${k.c}"><div class="kpi-lbl">${k.l}</div><div class="kpi-val">${k.v}</div><div class="kpi-sub">${k.s}</div></div>`).join('');

  let cards='';
  if(areas.includes('controlEquipos')||areas.includes('mantenimiento')||areas.length>3){
    cards+=`<div class="card"><div class="card-head"><span class="card-title">🚜 Estado de Flota</span></div><div class="card-body">
      ${DB.equipos.map(e=>`<div class="stat-row" style="margin-bottom:.4rem;padding:.4rem .6rem;background:var(--panel2);border-radius:5px;"><span class="mono" style="color:var(--muted2);font-size:.72rem">${e.codigo}</span><strong style="margin-left:.4rem;font-size:.78rem">${e.nombre.split(' ').slice(0,3).join(' ')}</strong><span style="margin-left:auto">${bge(e.est)}</span></div>`).join('')}
    </div></div>`;
  }
  if(areas.includes('seguridad')||areas.length>3){
    cards+=`<div class="card"><div class="card-head"><span class="card-title">⛑️ Últimos Eventos Seg.</span></div><div class="card-body">
      ${DB.incidentes.slice(-3).reverse().map(i=>`<div class="stat-row" style="margin-bottom:.5rem;padding:.4rem .6rem;background:var(--panel2);border-radius:5px;"><strong style="font-size:.78rem">${i.tipo}</strong> · <span style="font-size:.74rem">${i.area}</span><span style="margin-left:auto">${bge(i.sev)}</span></div>`).join('')}
    </div></div>`;
  }
  if(areas.includes('controlProyecto')||areas.length>3){
    cards+=`<div class="card"><div class="card-head"><span class="card-title">📈 Avance Actividades</span></div><div class="card-body">
      ${DB.planner.map(a=>`<div style="margin-bottom:.7rem"><div class="stat-row" style="margin-bottom:.3rem"><strong style="font-size:.78rem">${a.nom}</strong><span style="margin-left:auto;font-family:'Roboto Mono',monospace;font-size:.72rem;color:var(--ctl)">${a.av}%</span></div><div class="prog-wrap"><div class="prog-bar" style="width:${a.av}%;background:${a.av>=80?'var(--ctl)':a.av>=40?'var(--ope)':'var(--seg)'}"></div></div></div>`).join('')}
    </div></div>`;
  }
  if(areas.includes('almacenLogistica')||areas.length>3){
    const totComb=DB.combustible.reduce((a,c)=>a+c.gal*c.precio,0);
    cards+=`<div class="card"><div class="card-head"><span class="card-title">⛽ Combustible del Mes</span></div><div class="card-body">
      <div class="stat-row" style="margin-bottom:.5rem"><span>Total Galones</span><strong style="margin-left:auto">${DB.combustible.reduce((a,c)=>a+c.gal,0)} gal</strong></div>
      <div class="stat-row"><span>Costo Total</span><strong style="margin-left:auto;color:var(--alm)">${fmt(totComb)}</strong></div>
    </div></div>`;
  }
  // ── Panel usuarios en línea (solo Administrador General) ──
  if(CU.codigo==='ECOADMIN'){
    cards+=`<div class="card"><div class="card-head"><span class="card-title">🟢 Usuarios en Línea</span>
      <button class="btn btn-out btn-sm" onclick="cargarUsuariosOnline()" style="font-size:.63rem;padding:.18rem .5rem">↻ Actualizar</button>
    </div><div class="card-body" id="bodyOnline"><div style="color:var(--muted2);font-size:.78rem">Cargando...</div></div></div>`;
  }
  document.getElementById('dashCards').innerHTML=cards;
  if(CU.codigo==='ECOADMIN')cargarUsuariosOnline();
}

// ══ PERSONAL ══
function rPersonal(){
  document.getElementById('tbPersonal').innerHTML=DB.personal.map(p=>{
    const proy=p.proy?DB.proyectos.find(x=>x.codigo===p.proy):null;
    return`<tr>
    <td class="mono">${p.dni}</td><td><strong>${p.ape}, ${p.nom}</strong></td><td>${p.cargo}</td>
    <td><span class="badge b-blue">${p.cat}</span></td>
    <td>${proy?`<span class="mono" style="font-size:.73rem;color:#a78bfa">${proy.codigo}</span>`:'<span style="color:var(--muted)">—</span>'}</td>
    <td>${p.proc||'<span style="color:var(--muted)">—</span>'}</td>
    <td>${p.tipo?`<span class="badge" style="background:${p.tipo==='Staff'?'rgba(99,102,241,.2)':'rgba(16,185,129,.2)'};color:${p.tipo==='Staff'?'#818cf8':'#34d399'};border:1px solid ${p.tipo==='Staff'?'#818cf860':'#34d39960'}">${p.tipo}</span>`:'<span style="color:var(--muted)">—</span>'}</td>
    <td>${p.guardia?`<span class="badge" style="background:rgba(245,158,11,.15);color:#f59e0b;border:1px solid #f59e0b60">Grd. ${p.guardia}</span>`:'<span style="color:var(--muted)">—</span>'}</td>
    <td class="mono">${p.ing}</td>
    <td>${bge(p.est)}</td>
    <td style="max-width:160px;font-size:.75rem;color:var(--muted2)">${p.notas||'<span style="color:var(--muted)">—</span>'}</td>
    <td style="display:flex;gap:.3rem"><button class="btn btn-sm" style="background:rgba(245,158,11,.15);border:1px solid #f59e0b60;color:#f59e0b" onclick="openPersonalEdit(${p.id})">✏️</button></td>
  </tr>`;}).join('');
}
function _poblarProyPersonal(sel){
  sel.innerHTML='<option value="">— Sin proyecto —</option>'+DB.proyectos.map(p=>`<option value="${p.codigo}">[${p.codigo}] ${p.nombre}</option>`).join('');
}
function perGoTab(n){
  [0,1].forEach(i=>{
    const p=document.getElementById('perP'+i),t=document.getElementById('perTab'+i);
    if(p)p.style.display=i===n?'grid':'none';
    if(t)t.classList.toggle('eq-tab-act',i===n);
  });
  const prev=document.getElementById('perBPrev'),next=document.getElementById('perBNext'),save=document.getElementById('perBSave');
  if(prev)prev.style.display=n>0?'':'none';
  if(next)next.style.display=n<1?'':'none';
  if(save)save.style.display=n===1?'':'none';
}
function _fillCargoList(){
  const dl=document.getElementById('wCargoList');if(!dl)return;
  const cargos=[...new Set(DB.personal.map(p=>p.cargo||'').filter(Boolean))].sort();
  dl.innerHTML=cargos.map(c=>`<option value="${c}">`).join('');
}
function openPersonalNew(){
  _editPersonalId=null;
  _fillCargoList();
  ['wDni','wApe','wNom','wCargo','wSue','wProc','wNotas','wCuspp','wCuenta'].forEach(id=>document.getElementById(id).value='');
  document.getElementById('wCat').value='Operador A';
  document.getElementById('wTipo').value='';
  document.getElementById('wGuardia').value='';
  document.getElementById('wAsig').value='0';
  document.getElementById('wEst').value='Activo';
  document.getElementById('wIng').value=today();
  document.getElementById('wAfp').value='';
  document.getElementById('wBanco').value='';
  document.getElementById('wMovilidad').value='0';
  const ps=document.getElementById('wProy');if(ps){_poblarProyPersonal(ps);ps.value='';}
  document.querySelector('#mPersonal .mttl').textContent='Agregar Trabajador';
  perGoTab(0);
  openM('mPersonal');
}
function openPersonalEdit(id){
  const p=DB.personal.find(x=>x.id===id);if(!p)return;
  _editPersonalId=id;
  _fillCargoList();
  document.getElementById('wDni').value=p.dni||'';
  document.getElementById('wCodigoQr').value=p.codigoQr||'';
  document.getElementById('wApe').value=p.ape||'';
  document.getElementById('wNom').value=p.nom||'';
  document.getElementById('wCargo').value=p.cargo||'';
  document.getElementById('wCat').value=p.cat||'Operador A';
  document.getElementById('wProc').value=p.proc||'';
  document.getElementById('wTipo').value=p.tipo||'';
  document.getElementById('wGuardia').value=p.guardia||'';
  document.getElementById('wIng').value=p.ing||'';
  document.getElementById('wSue').value=p.sue||'';
  document.getElementById('wAsig').value=p.asig!=null?String(p.asig):'0';
  document.getElementById('wEst').value=p.est||'Activo';
  document.getElementById('wNotas').value=p.notas||'';
  document.getElementById('wAfp').value=p.afp||'';
  document.getElementById('wCuspp').value=p.cuspp||'';
  document.getElementById('wBanco').value=p.banco||'';
  document.getElementById('wCuenta').value=p.cuenta||'';
  document.getElementById('wMovilidad').value=p.movilidad||0;
  const ps=document.getElementById('wProy');if(ps){_poblarProyPersonal(ps);ps.value=p.proy||'';}
  document.querySelector('#mPersonal .mttl').textContent='Editar Trabajador';
  perGoTab(0);
  openM('mPersonal');
}
function gPersonal(){
  const dni=document.getElementById('wDni').value.trim(),nom=document.getElementById('wNom').value.trim();
  if(!dni||!nom){toast('Ingrese DNI y nombre',true);return;}
  const rec={dni,ape:document.getElementById('wApe').value,nom,cargo:document.getElementById('wCargo').value,cat:document.getElementById('wCat').value,proy:document.getElementById('wProy').value,proc:document.getElementById('wProc').value,tipo:document.getElementById('wTipo').value,guardia:document.getElementById('wGuardia').value,ing:document.getElementById('wIng').value,sue:+document.getElementById('wSue').value||0,asig:+document.getElementById('wAsig').value,est:document.getElementById('wEst').value,notas:document.getElementById('wNotas').value,afp:document.getElementById('wAfp').value,cuspp:document.getElementById('wCuspp').value,banco:document.getElementById('wBanco').value,cuenta:document.getElementById('wCuenta').value,movilidad:+document.getElementById('wMovilidad').value||0,codigoQr:document.getElementById('wCodigoQr').value.trim()};
  if(_editPersonalId){
    const idx=DB.personal.findIndex(x=>x.id===_editPersonalId);
    if(idx>-1){
      const oldProy=DB.personal[idx].proy;
      if(oldProy&&rec.proy&&oldProy!==rec.proy){
        DB.tareaje.filter(r=>r.personalId===_editPersonalId&&!r.proy).forEach(r=>{r.proy=oldProy;syncSheet('saveTareaje',r);});
      }
      Object.assign(DB.personal[idx],rec);syncSheet('savePersonal',DB.personal[idx]);
    }
    _editPersonalId=null;
    closeM('mPersonal');rPersonal();toast('Trabajador actualizado');
  }else{
    rec.id=nid('personal');
    DB.personal.push(rec);
    syncSheet('savePersonal',DB.personal[DB.personal.length-1]);
    closeM('mPersonal');rPersonal();toast('Trabajador registrado');
  }
}
// ══ ASISTENCIA / TAREAJE ══
let _html5QrScanner=null,_scannerCooldown=false;
let _manualAsiPersonalId=null,_manualAsiFecha=null;
let _scanWorker=null,_scanTipoSel='TD';
let _barcodeDetector=null,_videoStream=null,_detectLoop=null;

async function rAsistencia(){
  const dateEl=document.getElementById('asiDate');
  if(!dateEl.value) dateEl.value=today();
  const fecha=dateEl.value;
  const guardia=document.getElementById('asiGuardia').value;
  const tareoFilt=document.getElementById('asiTareo')?.value||'';
  await loadAsistenciaFecha(fecha);
  let trabajadores=DB.personal.filter(p=>p.est==='Activo'&&(!guardia||p.guardia===guardia));
  if(tareoFilt){
    trabajadores=trabajadores.filter(p=>{
      const tr=DB.tareaje.find(r=>r.personalId===p.id&&r.fecha===fecha);
      if(tareoFilt==='__sin__') return !tr||!tr.tipo;
      return tr&&tr.tipo===tareoFilt;
    });
  }
  const registros=DB.asistencia.filter(a=>a.fecha===fecha);
  const presentes=registros.filter(a=>a.horaEntrada).length;
  const conSalida=registros.filter(a=>a.horaEntrada&&a.horaSalida).length;
  const enTurno=presentes-conSalida;
  const ausentes=trabajadores.length-presentes;
  document.getElementById('asiKpis').innerHTML=[
    {l:'Total Activos',v:trabajadores.length,c:'#3b82f6'},
    {l:'Presentes',v:presentes,c:'#10b981'},
    {l:'Ausentes',v:ausentes<0?0:ausentes,c:'#ef4444'},
    {l:'En Turno (sin salida)',v:enTurno,c:'#f59e0b'}
  ].map(k=>`<div class="kpi" style="--kc:${k.c}"><div class="kpi-lbl">${k.l}</div><div class="kpi-val">${k.v}</div></div>`).join('');
  document.getElementById('tbAsistencia').innerHTML=trabajadores.map(p=>{
    const reg=registros.find(a=>a.personalId===p.id);
    const entrada=reg?.horaEntrada||'';
    const salida=reg?.horaSalida||'';
    const horas=entrada&&salida?calcHoras(entrada,salida):'';
    const tareoRec=DB.tareaje.find(r=>r.personalId===p.id&&r.fecha===fecha);
    const tareoTipo=tareoRec?tareoRec.tipo:'';
    const _tt=tareoTipo&&_TARE_T?_TARE_T[tareoTipo]:null;
    const tareoBadge=_tt
      ?`<span class="badge" style="background:${_tt.bg};color:${_tt.tx};font-size:.65rem">${tareoTipo}</span>`
      :'<span style="color:var(--muted)">—</span>';
    const estadoBadge=!entrada
      ?'<span class="badge" style="background:rgba(239,68,68,.18);color:#ef4444;border:1px solid #ef444435">AUSENTE</span>'
      :!salida
        ?'<span class="badge" style="background:rgba(245,158,11,.18);color:#f59e0b;border:1px solid #f59e0b35">EN TURNO</span>'
        :'<span class="badge" style="background:rgba(16,185,129,.18);color:#10b981;border:1px solid #10b98135">COMPLETO</span>';
    const tipoBadge=p.tipo?`<span class="badge" style="background:${p.tipo==='Staff'?'rgba(99,102,241,.2)':'rgba(16,185,129,.2)'};color:${p.tipo==='Staff'?'#818cf8':'#34d399'};border:1px solid ${p.tipo==='Staff'?'#818cf860':'#34d39960'}">${p.tipo}</span>`:'<span style="color:var(--muted)">—</span>';
    const grdBadge=p.guardia?`<span class="badge" style="background:rgba(245,158,11,.15);color:#f59e0b;border:1px solid #f59e0b50">Grd.${p.guardia}</span>`:'<span style="color:var(--muted)">—</span>';
    return `<tr>
      <td class="mono">${p.dni}</td>
      <td><strong>${p.ape}, ${p.nom}</strong></td>
      <td>${tipoBadge}</td><td>${grdBadge}</td>
      <td class="mono" style="color:#10b981;font-weight:600">${entrada||'<span style="color:var(--muted)">—</span>'}</td>
      <td class="mono">${horas||'<span style="color:var(--muted)">—</span>'}</td>
      <td>${tareoBadge}</td>
      <td>${estadoBadge}</td>
    </tr>`;
  }).join('');
}

function calcHoras(e,s){
  try{const[eh,em]=e.split(':').map(Number),[sh,sm]=s.split(':').map(Number);
  const m=(sh*60+sm)-(eh*60+em);if(m<=0)return '—';return Math.floor(m/60)+'h '+String(m%60).padStart(2,'0')+'m';}catch{return '—';}
}

async function loadAsistenciaFecha(fecha){
  try{
    const{data,error}=await supa.from('asistencia').select('*').eq('fecha',fecha);
    if(!error&&data)DB.asistencia=data.map(toCamel);
  }catch(e){console.warn('[Asistencia]',e);}
}

// ── ESCÁNER QR ──
function openScanner(){
  _scanWorker=null;_scanTipoSel='TD';
  document.getElementById('mScanner').classList.add('open');
  document.getElementById('scanWorkerPanel').style.display='none';
  document.getElementById('qr-reader').style.display='block';
  setScannerStatus('Iniciando cámara...','wait');
  setTimeout(iniciarScanner,300);
}
function _detenerCamara(){
  if(_detectLoop){cancelAnimationFrame(_detectLoop);_detectLoop=null;}
  if(_videoStream){_videoStream.getTracks().forEach(t=>t.stop());_videoStream=null;}
  if(_html5QrScanner){_html5QrScanner.stop().catch(()=>{});_html5QrScanner=null;}
  _barcodeDetector=null;
}
function closeScanner(){
  _detenerCamara();
  document.getElementById('mScanner').classList.remove('open');
}
function setScannerStatus(msg,type){
  const el=document.getElementById('scannerStatus');
  el.textContent=msg;el.className='scanner-status scanner-'+type;
}
function _scanBeep(){
  try{
    const ctx=new(window.AudioContext||window.webkitAudioContext)();
    const o=ctx.createOscillator();const g=ctx.createGain();
    o.connect(g);g.connect(ctx.destination);
    o.frequency.value=1480;o.type='sine';
    g.gain.setValueAtTime(0,ctx.currentTime);
    g.gain.linearRampToValueAtTime(0.4,ctx.currentTime+0.01);
    g.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+0.18);
    o.start(ctx.currentTime);o.stop(ctx.currentTime+0.18);
  }catch(e){}
}
function _scanSuccess(){
  try{navigator.vibrate&&navigator.vibrate([60,30,60]);}catch(e){}
  _scanBeep();
  const ov=document.getElementById('scanOverlay');
  if(ov){ov.classList.add('scan-ok-flash');setTimeout(()=>ov.classList.remove('scan-ok-flash'),400);}
}
function _scanOverlayHTML(){
  return`<div id="scanOverlay" class="scan-overlay">
    <div class="scan-vignette"></div>
    <div class="scan-zone">
      <div class="scan-corner tl"></div><div class="scan-corner tr"></div>
      <div class="scan-corner bl"></div><div class="scan-corner br"></div>
      <div class="scan-line"></div>
    </div>
  </div>`;
}

async function iniciarScanner(){
  // Motor 1: BarcodeDetector nativo (Android Chrome — rápido y preciso)
  if('BarcodeDetector' in window){
    try{
      const supported=await BarcodeDetector.getSupportedFormats().catch(()=>[]);
      const want=['qr_code','data_matrix','aztec','code_128','code_39','ean_13','ean_8','upc_a','upc_e','itf','codabar'];
      const fmts=supported.length?want.filter(f=>supported.includes(f)):want;
      _barcodeDetector=new BarcodeDetector({formats:fmts});
      const stream=await navigator.mediaDevices.getUserMedia({
        video:{facingMode:'environment',width:{ideal:1920},height:{ideal:1080}}
      });
      _videoStream=stream;
      const qrDiv=document.getElementById('qr-reader');
      qrDiv.innerHTML=`<div class="scan-wrap">
        <video id="scanVideo" autoplay playsinline muted style="width:100%;max-height:300px;object-fit:cover;display:block"></video>
        ${_scanOverlayHTML()}
      </div>`;
      const vid=document.getElementById('scanVideo');
      vid.srcObject=stream;
      await new Promise(r=>vid.onloadedmetadata=r);
      vid.play();
      setScannerStatus('📷 Apunte el código al centro del recuadro','wait');
      let _frameSkip=0;
      const loop=async()=>{
        if(!_barcodeDetector)return;
        _frameSkip=(_frameSkip+1)%2; // procesa 1 de cada 2 frames (~30fps efectivos)
        if(!_frameSkip){
          try{
            const res=await _barcodeDetector.detect(vid);
            if(res.length&&!_scannerCooldown){
              _scannerCooldown=true;
              _scanSuccess();
              procesarQR(res[0].rawValue);
            }
          }catch(e){}
        }
        _detectLoop=requestAnimationFrame(loop);
      };
      _detectLoop=requestAnimationFrame(loop);
      return;
    }catch(err){
      console.warn('[Scanner Motor1]',err);
      // cae al Motor 2 si BarcodeDetector falla
    }
  }
  // Motor 2: Html5Qrcode (iOS Safari y otros)
  if(typeof Html5Qrcode==='undefined'){setScannerStatus('Error: escáner no disponible en este navegador','err');return;}
  const _fmts=typeof Html5QrcodeSupportedFormats!=='undefined'
    ?{formatsToSupport:[Html5QrcodeSupportedFormats.QR_CODE,Html5QrcodeSupportedFormats.DATA_MATRIX,Html5QrcodeSupportedFormats.CODE_128,Html5QrcodeSupportedFormats.CODE_39,Html5QrcodeSupportedFormats.EAN_13]}
    :{};
  _html5QrScanner=new Html5Qrcode('qr-reader',_fmts);
  _html5QrScanner.start(
    {facingMode:'environment'},
    {fps:25,qrbox:{width:250,height:250},aspectRatio:1.0,disableFlip:false},
    (decoded)=>{
      if(_scannerCooldown)return;
      _scannerCooldown=true;
      _scanSuccess();
      procesarQR(decoded);
      setTimeout(()=>{_scannerCooldown=false;},2500);
    },
    ()=>{}
  ).then(()=>{
    setScannerStatus('📷 Apunte el código al centro del recuadro','wait');
    // Inyectar overlay encima del video de Html5Qrcode
    const qrDiv=document.getElementById('qr-reader');
    const ov=document.createElement('div');
    ov.innerHTML=_scanOverlayHTML();
    ov.style.cssText='position:absolute;inset:0;pointer-events:none;z-index:20';
    qrDiv.style.position='relative';
    qrDiv.appendChild(ov.firstChild);
  }).catch(err=>setScannerStatus('Error de cámara: '+err,'err'));
}
async function procesarQR(texto){
  let p=null;
  const match=texto.match(/ECO-PERSONAL-(\d+)/);
  if(match){p=DB.personal.find(x=>x.id===parseInt(match[1]));}
  if(!p){p=DB.personal.find(x=>x.dni===texto.trim());}
  if(!p){p=DB.personal.find(x=>x.codigoQr&&x.codigoQr===texto.trim());}
  if(!p){
    setScannerStatus('⚠ No encontrado: '+texto.trim(),'err');
    setTimeout(()=>{_scannerCooldown=false;setScannerStatus('📷 Apunte el código al centro del recuadro','wait');},2000);
    return;
  }
  // Detener cámara
  _detenerCamara();
  document.getElementById('qr-reader').style.display='none';
  _scannerCooldown=false;
  const _h=new Date().getHours();
  const _autoTipo=(_h>=5&&_h<17)?'TD':'TN';
  _scanWorker=p;_scanTipoSel=_autoTipo;
  const fecha=document.getElementById('asiDate')?.value||today();
  await loadAsistenciaFecha(fecha);
  const existente=DB.tareaje.find(r=>r.personalId===p.id&&r.fecha===fecha);
  const proy=p.proy?(DB.proyectos.find(x=>x.codigo===p.proy)||null):null;
  document.getElementById('swNombre').textContent=`${p.ape}, ${p.nom}`;
  document.getElementById('swCargo').textContent=p.cargo||'—';
  document.getElementById('swDni').textContent='DNI '+p.dni;
  document.getElementById('swProy').textContent=proy?`[${proy.codigo}] ${proy.nombre}`:(p.proy||'Sin proyecto');
  document.getElementById('swTipos').innerHTML=['TD','TN'].map(k=>{
    const v=_TARE_T[k];
    return`<button id="swT-${k}" onclick="_swSelTipo('${k}')" style="background:${k===_autoTipo?v.bg:'var(--panel2)'};color:${k===_autoTipo?v.tx:'var(--text)'};border:2px solid ${v.bg};border-radius:5px;padding:5px 14px;font-size:.75rem;font-weight:700;cursor:pointer">${k} – ${v.l}</button>`;
  }).join('');
  const asiRec=DB.asistencia.find(a=>a.personalId===p.id&&a.fecha===fecha);
  const est=document.getElementById('swEstado');
  const btn=document.getElementById('swBtnGuardar');
  btn.disabled=false;
  if(existente){
    const asiInfo=asiRec?.horaEntrada?` | Entrada ya registrada ${asiRec.horaEntrada}`:'';
    est.style.cssText='background:rgba(245,158,11,.15);color:#f59e0b;border-radius:6px;padding:.35rem .65rem;font-size:.72rem';
    est.innerHTML=`⚠ Tareo: <strong>${existente.tipo}</strong> ya registrado${asiInfo}`;
    btn.textContent='🔄 Actualizar Tareo';
  }else{
    const asiInfo=asiRec?.horaEntrada?` | Entrada ${asiRec.horaEntrada}`:'';
    est.style.cssText='background:rgba(16,185,129,.12);color:#10b981;border-radius:6px;padding:.35rem .65rem;font-size:.72rem';
    est.innerHTML=`✅ Sin tareo — ${fecha}${asiInfo}`;
    btn.textContent='💾 Guardar Tareo + Asistencia';
  }
  setScannerStatus(`${p.ape}, ${p.nom} identificado ✓`,'ok');
  document.getElementById('scanWorkerPanel').style.display='block';
}
function _swSelTipo(k){
  _scanTipoSel=k;
  ['TD','TN'].forEach(t=>{
    const b=document.getElementById('swT-'+t);if(!b)return;
    const v=_TARE_T[t];
    b.style.background=t===k?v.bg:'var(--panel2)';
    b.style.color=t===k?v.tx:'var(--text)';
  });
}
async function guardarTareoEscaner(){
  if(!_scanWorker||!_scanTipoSel)return;
  const p=_scanWorker,tipo=_scanTipoSel;
  const fecha=document.getElementById('asiDate')?.value||today();
  // 1. Guardar / actualizar en tariaje
  const existing=DB.tareaje.find(r=>r.personalId===p.id&&r.fecha===fecha);
  if(existing){existing.tipo=tipo;syncSheet('saveTareaje',existing);}
  else{
    const rec={id:nid('tar'),personalId:p.id,fecha,tipo,proy:p.proy||''};
    DB.tareaje.push(rec);syncSheet('saveTareaje',rec);
  }
  // 2. Guardar entrada en asistencia (solo si no tiene registro aún)
  const ahora=new Date().toTimeString().slice(0,5);
  const asiExist=DB.asistencia.find(a=>a.personalId===p.id&&a.fecha===fecha);
  let asiMsg='';
  if(!asiExist){
    const newRec={personalId:p.id,fecha,horaEntrada:ahora,horaSalida:'',guardia:p.guardia||'',estado:'Presente'};
    const{data}=await supa.from('asistencia').insert(toSnake(newRec)).select().single();
    if(data){newRec.id=data.id;DB.asistencia.push(newRec);}
    asiMsg=` | Entrada ${ahora}`;
  }
  const btn=document.getElementById('swBtnGuardar');
  btn.disabled=true;btn.textContent='✓ Guardado';
  const est=document.getElementById('swEstado');
  est.style.cssText='background:rgba(16,185,129,.18);color:#10b981;border-radius:6px;padding:.35rem .65rem;font-size:.72rem;font-weight:700';
  est.innerHTML=`✅ ${tipo} guardado${asiMsg}`;
  if(AP==='tareaje')rTareaje();
  if(AP==='asistencia')rAsistencia();
}
function reiniciarEscaner(){
  _detenerCamara();
  _scanWorker=null;_scanTipoSel='TD';_scannerCooldown=false;
  document.getElementById('scanWorkerPanel').style.display='none';
  const qrDiv=document.getElementById('qr-reader');
  qrDiv.style.display='block';qrDiv.innerHTML='';
  setScannerStatus('Reiniciando cámara...','wait');
  setTimeout(iniciarScanner,300);
}

// ── FOTOCHECK QR ──
function openQRFotocheck(){
  const sel=document.getElementById('fotocheckSelect');
  sel.innerHTML='<option value="">— Seleccionar trabajador —</option>'+
    DB.personal.filter(p=>p.est==='Activo').map(p=>`<option value="${p.id}">${p.ape}, ${p.nom}</option>`).join('');
  document.getElementById('fotocheckDisplay').style.display='none';
  document.getElementById('fc-qr').innerHTML='';
  openM('mFotocheck');
}
function renderFotocheck(){
  const id=parseInt(document.getElementById('fotocheckSelect').value);
  if(!id){document.getElementById('fotocheckDisplay').style.display='none';return;}
  const p=DB.personal.find(x=>x.id===id);if(!p)return;
  document.getElementById('fotocheckDisplay').style.display='block';
  document.getElementById('fc-nombre').textContent=`${p.ape}, ${p.nom}`;
  document.getElementById('fc-cargo').textContent=p.cargo||'';
  document.getElementById('fc-dni').textContent='DNI: '+p.dni;
  document.getElementById('fc-guardia').textContent=(p.guardia?'Guardia '+p.guardia:'')+' '+(p.tipo||'');
  const qrDiv=document.getElementById('fc-qr');
  qrDiv.innerHTML='';
  if(typeof QRCode!=='undefined'){
    new QRCode(qrDiv,{text:'ECO-PERSONAL-'+p.id,width:160,height:160,colorDark:'#0a0a1a',colorLight:'#ffffff'});
  }
}
function imprimirFotocheck(){
  const card=document.getElementById('fotocheckCard').outerHTML;
  const win=window.open('','_blank');
  if(!win){toast('Active ventanas emergentes para imprimir',true);return;}
  const S='<'+'/';
  const css='body{margin:0;display:flex;justify-content:center;align-items:center;min-height:100vh;background:#f0f0f0;font-family:Arial,sans-serif}'
    +'.fotocheck-card{background:#fff;color:#0a0a1a;border-radius:12px;border:2px solid #1e3a6e;padding:1.4rem 1.2rem;text-align:center;width:200px;box-shadow:0 4px 16px #0003}'
    +'.fc-brand{font-size:.55rem;letter-spacing:.2em;color:#1e3a6e;text-transform:uppercase;font-weight:700;margin-bottom:.4rem}'
    +'.fc-nombre{font-weight:900;font-size:.9rem;margin-bottom:.15rem;color:#0a0a1a;line-height:1.2}'
    +'.fc-cargo{font-size:.65rem;color:#444;margin-bottom:.8rem}'
    +'.fc-dni{font-family:monospace;font-size:.72rem;margin-top:.5rem;color:#333}'
    +'.fc-guardia{font-size:.62rem;color:#666;margin-top:.2rem}'
    +'@media print{body{background:#fff}}';
  const html='<!DOCTYPE html><html><head><title>Fotocheck'+S+'title><style>'+css+S+'style>'+S+'head><body>'+card+S+'body>'+S+'html>';
  win.document.write(html);win.document.close();win.focus();
  setTimeout(function(){win.print();},400);
}

// ── REGISTRO MANUAL ──
function registrarManualAsistencia(personalId,fecha){
  _manualAsiPersonalId=personalId;_manualAsiFecha=fecha;
  const p=DB.personal.find(x=>x.id===personalId);
  const reg=DB.asistencia.find(a=>a.personalId===personalId&&a.fecha===fecha);
  document.getElementById('manAsiNombre').textContent=p?`${p.ape}, ${p.nom} — ${fecha}`:'';
  document.getElementById('manAsiEntrada').value=reg?.horaEntrada||'';
  document.getElementById('manAsiSalida').value=reg?.horaSalida||'';
  document.getElementById('manAsiObs').value=reg?.obs||'';
  openM('mManualAsi');
}
async function gManualAsi(){
  const entrada=document.getElementById('manAsiEntrada').value;
  const salida=document.getElementById('manAsiSalida').value;
  const obs=document.getElementById('manAsiObs').value;
  if(!entrada){toast('Ingrese hora de entrada',true);return;}
  const p=DB.personal.find(x=>x.id===_manualAsiPersonalId);
  const existing=DB.asistencia.find(a=>a.personalId===_manualAsiPersonalId&&a.fecha===_manualAsiFecha);
  if(existing){
    Object.assign(existing,{horaEntrada:entrada,horaSalida:salida,obs,registradoPor:CU.nombre});
    await supa.from('asistencia').update(toSnake(existing)).eq('id',existing.id);
  }else{
    const rec={personalId:_manualAsiPersonalId,fecha:_manualAsiFecha,horaEntrada:entrada,horaSalida:salida,guardia:p?.guardia||'',estado:'Presente',obs,registradoPor:CU.nombre};
    const{data}=await supa.from('asistencia').insert(toSnake(rec)).select().single();
    if(data){rec.id=data.id;DB.asistencia.push(rec);}
  }
  closeM('mManualAsi');rAsistencia();toast('Asistencia guardada');
}

// ── EXPORTAR PDF TAREAJE ──
function exportTareajePDF(){
  const fecha=document.getElementById('asiDate').value||today();
  const guardia=document.getElementById('asiGuardia').value;
  const trabajadores=DB.personal.filter(p=>p.est==='Activo'&&(!guardia||p.guardia===guardia));
  const rows=trabajadores.map(p=>{
    const reg=DB.asistencia.find(a=>a.personalId===p.id&&a.fecha===fecha);
    const entrada=reg?.horaEntrada||'—';
    const salida=reg?.horaSalida||'—';
    const horas=reg?.horaEntrada&&reg?.horaSalida?calcHoras(reg.horaEntrada,reg.horaSalida):'—';
    const estado=!reg?.horaEntrada?'AUSENTE':!reg?.horaSalida?'EN TURNO':'COMPLETO';
    const color=estado==='AUSENTE'?'#ef4444':estado==='EN TURNO'?'#f59e0b':'#059669';
    return '<tr><td>'+p.dni+'</td><td>'+p.ape+', '+p.nom+'</td><td>'+(p.tipo||'—')+'</td><td>'+(p.guardia?'Grd.'+p.guardia:'—')+'</td><td style="color:#059669;font-weight:600">'+entrada+'</td><td style="color:#d97706;font-weight:600">'+salida+'</td><td>'+horas+'</td><td style="color:'+color+';font-weight:700">'+estado+'</td><td style="height:28px;border-bottom:1px solid #ccc;min-width:80px"></td></tr>';
  }).join('');
  const presentes=DB.asistencia.filter(a=>a.fecha===fecha&&a.horaEntrada).length;
  const win=window.open('','_blank');
  if(!win){toast('Active ventanas emergentes para exportar PDF',true);return;}
  const S='<'+'/';
  const css='body{font-family:Arial,sans-serif;font-size:11px;padding:20px;color:#000}'
    +'.hdr{text-align:center;margin-bottom:12px;border-bottom:3px solid #1e3a6e;padding-bottom:8px}'
    +'h2{margin:0;font-size:15px;color:#1e3a6e}p{margin:3px 0;font-size:10px;color:#555}'
    +'table{width:100%;border-collapse:collapse}'
    +'th{background:#1e3a6e;color:#fff;padding:6px 4px;text-align:left;font-size:10px}'
    +'td{padding:5px 4px;border-bottom:1px solid #eee;font-size:10px}'
    +'tr:nth-child(even){background:#f9f9f9}'
    +'.footer{margin-top:16px;font-size:9px;color:#888;text-align:right}'
    +'@media print{button{display:none}}';
  let body='<div class="hdr"><h2>ECOSERMO — CONTROL DE ASISTENCIA / TAREAJE</h2>';
  body+='<p>Fecha: <strong>'+fecha+'</strong>'+(guardia?' · Guardia: '+guardia:'')+' · Generado por: '+CU.nombre+' · Presentes: '+presentes+'/'+trabajadores.length+'</p></div>';
  body+='<table><thead><tr><th>DNI</th><th>Apellidos y Nombres</th><th>Tipo</th><th>Guardia</th><th>Entrada</th><th>Salida</th><th>Horas</th><th>Estado</th><th>Firma / V°B°</th></tr></thead>';
  body+='<tbody>'+rows+'</tbody></table>';
  body+='<div class="footer">ECOSERMO · Sistema de Gestion Operativa</div>';
  const html='<!DOCTYPE html><html><head><meta charset=utf-8><title>Tareaje '+fecha+S+'title><style>'+css+S+'style>'+S+'head><body>'+body+S+'body>'+S+'html>';
  win.document.write(html);win.document.close();win.focus();
  setTimeout(function(){win.print();},400);
}


// ══ BIENESTAR ══
function rSocial(){document.getElementById('tbSocial').innerHTML=DB.social.map(r=>`<tr><td class="mono">${r.fecha}</td><td>${r.trab}</td><td><span class="badge b-pink">${r.tipo}</span></td><td>${r.desc}</td><td>${r.deriv}</td><td>${bge(r.est)}</td><td><button class="btn btn-del btn-sm" onclick="del('social',${r.id})">🗑</button></td></tr>`).join('');}
function gSocial(){DB.social.push({id:nid('social'),fecha:document.getElementById('soF').value||today(),trab:document.getElementById('soT').value,tipo:document.getElementById('soTi').value,desc:document.getElementById('soD').value,deriv:document.getElementById('soDr').value,est:document.getElementById('soE').value});syncSheet('saveSocial',DB.social[DB.social.length-1]);closeM('mSocial');rSocial();toast('Atención registrada');}

function rResidencia(){
  const ocu=DB.residencia.filter(r=>r.est==='Ocupado').length,tot=DB.residencia.length;
  document.getElementById('resKpis').innerHTML=[{l:'Total Hab.',v:tot,c:'#3b82f6'},{l:'Ocupadas',v:ocu,c:'#f59e0b'},{l:'Disponibles',v:tot-ocu,c:'#10b981'}].map(k=>`<div class="kpi" style="--kc:${k.c}"><div class="kpi-lbl">${k.l}</div><div class="kpi-val">${k.v}</div></div>`).join('');
  document.getElementById('tbResidencia').innerHTML=DB.residencia.map(r=>`<tr><td class="mono" style="color:var(--bsw);font-weight:700">Hab.${r.hab}</td><td>${r.trab||'<span class="text-muted">—</span>'}</td><td>${r.area||'—'}</td><td class="mono">${r.ing||'—'}</td><td class="mono">${r.sal||'—'}</td><td>${bge(r.est)}</td><td>${r.est==='Ocupado'?`<button class="btn btn-del btn-sm" onclick="libHab(${r.id})">↩ Liberar</button>`:''}</td></tr>`).join('');
}
function gResidencia(){const h=document.getElementById('rH').value.trim();if(!h){toast('Ingrese N° habitación',true);return;}DB.residencia.push({id:nid('res'),hab:h,trab:document.getElementById('rT').value,area:document.getElementById('rA').value,ing:document.getElementById('rI').value||today(),sal:document.getElementById('rS').value,est:'Ocupado'});syncSheet('saveResidencia',DB.residencia[DB.residencia.length-1]);closeM('mResidencia');rResidencia();toast('Habitación asignada');}
function libHab(id){const r=DB.residencia.find(x=>x.id===id);if(r){Object.assign(r,{est:'Disponible',trab:'',area:'',ing:'',sal:''});syncSheet('saveResidencia',r);}rResidencia();toast('Habitación liberada');}

function rAli(){
  const t=DB.alimentacion.length;
  document.getElementById('aliKpis').innerHTML=[{l:'Registros del Mes',v:t,c:'#ec4899'},{l:'Desayunos',v:DB.alimentacion.filter(a=>a.des==='✔ Sí').length,c:'#f59e0b'},{l:'Almuerzos',v:DB.alimentacion.filter(a=>a.alm==='✔ Sí').length,c:'#10b981'}].map(k=>`<div class="kpi" style="--kc:${k.c}"><div class="kpi-lbl">${k.l}</div><div class="kpi-val">${k.v}</div></div>`).join('');
  document.getElementById('tbAli').innerHTML=DB.alimentacion.map(r=>`<tr><td class="mono">${r.fecha}</td><td><span class="badge b-blue">${r.turno}</span></td><td>${r.trab}</td><td>${r.area}</td><td>${r.des==='✔ Sí'?'<span class="badge b-green">✔ Sí</span>':'<span class="badge b-red">✘ No</span>'}</td><td>${r.alm==='✔ Sí'?'<span class="badge b-green">✔ Sí</span>':'<span class="badge b-red">✘ No</span>'}</td><td>${r.cen==='✔ Sí'?'<span class="badge b-green">✔ Sí</span>':'<span class="badge b-red">✘ No</span>'}</td><td>${r.obs||'—'}</td><td><button class="btn btn-del btn-sm" onclick="del('alimentacion',${r.id})">🗑</button></td></tr>`).join('');
}
function gAli(){DB.alimentacion.push({id:nid('ali'),fecha:document.getElementById('alF').value||today(),turno:document.getElementById('alTu').value,trab:document.getElementById('alT').value,area:document.getElementById('alA').value,des:document.getElementById('alD').value,alm:document.getElementById('alAl').value,cen:document.getElementById('alC').value,obs:document.getElementById('alO').value});syncSheet('saveAlimentacion',DB.alimentacion[DB.alimentacion.length-1]);closeM('mAli');rAli();toast('Alimentación registrada');}

function rHosp(){document.getElementById('tbHosp').innerHTML=DB.hospedaje.map(r=>`<tr><td class="mono">${r.fecha}</td><td>${r.trab}</td><td>${r.estab}</td><td class="mono tr">${r.noches} noc.</td><td class="mono tr">${fmt(r.costo)}</td><td>${bge(r.tipoCosto)}</td><td>${bge(r.est)}</td><td><button class="btn btn-del btn-sm" onclick="del('hospedaje',${r.id})">🗑</button></td></tr>`).join('');}
function gHosp(){DB.hospedaje.push({id:nid('hosp'),fecha:document.getElementById('hF').value||today(),trab:document.getElementById('hT').value,estab:document.getElementById('hEs').value,noches:+document.getElementById('hN').value||1,costo:+document.getElementById('hC').value||0,tipoCosto:document.getElementById('hTc').value,est:document.getElementById('hE').value});syncSheet('saveHospedaje',DB.hospedaje[DB.hospedaje.length-1]);closeM('mHosp');rHosp();toast('Hospedaje registrado');}

function rLav(){document.getElementById('tbLav').innerHTML=DB.lavanderia.map(r=>`<tr><td class="mono">${r.fecha}</td><td>${r.trab}</td><td><span class="badge b-blue">${r.prendas}</span></td><td class="mono tr">${r.cant}</td><td class="mono">${r.fEnt}</td><td>${bge(r.est)}</td><td><button class="btn btn-del btn-sm" onclick="del('lavanderia',${r.id})">🗑</button></td></tr>`).join('');}
function gLav(){DB.lavanderia.push({id:nid('lav'),fecha:document.getElementById('lvF').value||today(),trab:document.getElementById('lvT').value,prendas:document.getElementById('lvP').value,cant:+document.getElementById('lvC').value||1,fEnt:document.getElementById('lvFE').value,est:document.getElementById('lvE').value});syncSheet('saveLavanderia',DB.lavanderia[DB.lavanderia.length-1]);closeM('mLav');rLav();toast('Lavandería registrada');}

