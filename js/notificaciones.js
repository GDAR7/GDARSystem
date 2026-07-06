// ══ MÓDULO NOTIFICACIONES ══
const _NOTIF_CFG_KEY = 'ecosermo_notif_cfg';
const _NOTIF_LOG_KEY = 'ecosermo_notif_log';
const _NOTIF_DIA_KEY = 'ecosermo_dia_';

function _notifEstadoHoy(){
  const hoy=new Date().toISOString().slice(0,10);
  try{return{equipos:false,asistencia:false,...JSON.parse(localStorage.getItem(_NOTIF_DIA_KEY+hoy)||'{}')};}
  catch(e){return{equipos:false,asistencia:false};}
}
function _notifGuardarEstadoHoy(est){
  localStorage.setItem(_NOTIF_DIA_KEY+new Date().toISOString().slice(0,10),JSON.stringify(est));
}

function _notifMarcarCompleto(tipo){
  const est=_notifEstadoHoy();
  est[tipo]=!est[tipo];
  _notifGuardarEstadoHoy(est);
  _notifActualizarBotones();
  const labels={equipos:'Reporte de Equipos',asistencia:'Asistencia'};
  if(est.equipos&&est.asistencia){
    toast('✓ Ambos completados — enviando reporte por correo...');
    _notifEnviarDiarioCompleto();
  } else if(est[tipo]){
    const falta=Object.entries(est).filter(([k,v])=>!v).map(([k])=>labels[k]).join(' y ');
    toast(`✓ ${labels[tipo]} marcado — falta: ${falta}`);
  } else {
    toast(`${labels[tipo]} desmarcado`);
  }
}

function _notifActualizarBotones(){
  const est=_notifEstadoHoy();
  const btnEq=document.getElementById('btnRptCompleto');
  const btnAsi=document.getElementById('btnAsiCompleta');
  if(btnEq){
    btnEq.textContent=est.equipos?'✅ Reporte completado':'📋 Reporte completado';
    btnEq.style.cssText=`background:${est.equipos?'rgba(16,185,129,.2)':'rgba(99,102,241,.12)'};border:1px solid ${est.equipos?'rgba(16,185,129,.5)':'rgba(99,102,241,.4)'};color:${est.equipos?'#10b981':'#a5b4fc'};border-radius:7px;padding:.35rem .85rem;font-size:.78rem;font-weight:700;cursor:pointer;margin-right:.3rem`;
  }
  if(btnAsi){
    btnAsi.textContent=est.asistencia?'✅ Asistencia completada':'📋 Asistencia completada del día';
    btnAsi.style.cssText=`background:${est.asistencia?'rgba(16,185,129,.2)':'rgba(99,102,241,.12)'};border:1px solid ${est.asistencia?'rgba(16,185,129,.5)':'rgba(99,102,241,.4)'};color:${est.asistencia?'#10b981':'#a5b4fc'};border-radius:7px;padding:.35rem .85rem;font-size:.78rem;font-weight:700;cursor:pointer`;
  }
}

async function _notifEnviarDiarioCompleto(){
  const hoy=new Date().toISOString().slice(0,10);
  const fechaFmt=new Date(hoy+'T12:00:00').toLocaleDateString('es-PE',{weekday:'long',day:'2-digit',month:'long',year:'numeric'});
  const partes=(DB.partes||[]).filter(p=>p.fecha===hoy);
  const equipos=DB.equipos||[];
  const _fu=p=>{const eq=equipos.find(e=>e.id===p.eqId);const fu=(eq&&eq.factorUso>0)?eq.factorUso:1;return(+p.ef||0)*fu;};
  const totalEf=partes.reduce((s,p)=>s+_fu(p),0).toFixed(1);
  const totalEq=[...new Set(partes.map(p=>p.eqId))].length;
  const asist=(DB.asistencia||[]).filter(a=>a.fecha===hoy);
  const presentes=asist.filter(a=>['TD','TN','DLT'].includes(a.tareo)).length;
  const detEq=partes.length?'\nDetalle equipos:\n'+partes.map(p=>{const eq=equipos.find(e=>e.id===p.eqId);return`  • ${eq?.cod||'—'} ${eq?.marca||''}: ${(+p.ef||0).toFixed(1)}h (${eq?.tipo||'—'})`;}).join('\n'):'  Sin partes registrados.';
  const asunto=`✅ Reporte Diario Completado — ${fechaFmt}`;
  const cuerpo=`REPORTE DIARIO COMPLETADO — ECOSERMO ERP
Fecha: ${fechaFmt}
Reportado por: ${CU?.nombre||'—'}

━━━ CONTROL DE EQUIPOS ━━━
Partes registrados: ${partes.length}
Equipos activos: ${totalEq}
Horas efectivas totales: ${totalEf} h
${detEq}

━━━ ASISTENCIA ━━━
Personal registrado: ${asist.length}
Con tareo activo (TD/TN): ${presentes}

--
Sistema GDAR-ECOSERMO
Generado automáticamente al completar el reporte diario.`;
  const ok=await _notifSend(asunto,cuerpo);
  if(ok)toast('📧 Reporte diario enviado correctamente');
  else toast('✗ Error al enviar el reporte',true);
}

function _notifGetCfg(){
  try{return JSON.parse(localStorage.getItem(_NOTIF_CFG_KEY)||'{}');}catch(e){return{};}
}
function _notifSaveCfg(cfg){localStorage.setItem(_NOTIF_CFG_KEY,JSON.stringify(cfg));}
function _notifGetLog(){
  try{return JSON.parse(localStorage.getItem(_NOTIF_LOG_KEY)||'[]');}catch(e){return[];}
}
function _notifAddLog(entry){
  const log=_notifGetLog();
  log.unshift({...entry,ts:new Date().toISOString()});
  if(log.length>50)log.length=50;
  localStorage.setItem(_NOTIF_LOG_KEY,JSON.stringify(log));
}

function rNotificaciones(){
  const cfg=_notifGetCfg();
  const activo=cfg.activo!==false;
  const email=cfg.email||(CU?.codigo==='EIBEL25'?'gdar.ahra.25@gmail.com':'');
  const emailCC=cfg.emailCC||'';
  const serviceId=cfg.serviceId||'';
  const templateId=cfg.templateId||'';
  const publicKey=cfg.publicKey||'';
  const trgParte=cfg.trgParte!==false;
  const trgDiario=cfg.trgDiario||false;
  const connected=!!(serviceId&&templateId&&publicKey);

  const p=document.getElementById('page-notificaciones');
  if(!p)return;
  p.innerHTML=`
  <div class="ph"><div class="ph-title" style="color:#6366f1">🔔 Notificaciones</div><div class="ph-sub">Envío automático de reportes por correo electrónico · Solo visible para administrador</div></div>
  <div style="max-width:680px;margin:0 auto;display:flex;flex-direction:column;gap:1.2rem;padding:0 1rem 2rem">

    <div class="card">
      <div class="card-hdr" style="border-bottom:1px solid var(--border);padding-bottom:.7rem;margin-bottom:.85rem"><span style="font-weight:700;font-size:.85rem">Estado del servicio</span></div>
      <div style="display:flex;align-items:center;gap:.9rem;padding:.5rem .75rem;background:var(--panel2);border:1px solid var(--border);border-radius:8px">
        <div onclick="_notifToggleActivo()" style="width:42px;height:22px;border-radius:11px;background:${activo?'#06b6d4':'var(--border)'};cursor:pointer;position:relative;flex-shrink:0">
          <div style="position:absolute;top:3px;${activo?'right:3px':'left:3px'};width:16px;height:16px;border-radius:50%;background:white;transition:all .2s"></div>
        </div>
        <span style="font-size:.82rem;font-weight:600">${activo?'Notificaciones activadas':'Notificaciones desactivadas'}</span>
        <span style="margin-left:auto;font-size:.7rem;padding:2px 10px;border-radius:12px;${connected?'background:rgba(16,185,129,.12);color:#10b981;border:1px solid rgba(16,185,129,.3)':'background:rgba(245,158,11,.1);color:#f59e0b;border:1px solid rgba(245,158,11,.3)'}">${connected?'● Configurado':'○ Sin configurar'}</span>
      </div>
    </div>

    <div class="card">
      <div class="card-hdr" style="border-bottom:1px solid var(--border);padding-bottom:.7rem;margin-bottom:.85rem"><span style="font-weight:700;font-size:.85rem">Destino de envío</span></div>
      <div style="display:flex;flex-direction:column;gap:.6rem">
        <div style="display:flex;align-items:center;gap:.75rem">
          <label style="font-size:.75rem;color:var(--muted2);min-width:145px">Correo principal</label>
          <input id="ntfEmail" value="${email}" type="email" placeholder="tu@correo.com" style="flex:1;background:var(--panel2);border:1px solid var(--border);border-radius:6px;padding:.35rem .65rem;font-size:.78rem;color:var(--text);font-family:inherit">
        </div>
        <div style="display:flex;align-items:center;gap:.75rem">
          <label style="font-size:.75rem;color:var(--muted2);min-width:145px">Correo copia (CC)</label>
          <input id="ntfEmailCC" value="${emailCC}" type="email" placeholder="Opcional" style="flex:1;background:var(--panel2);border:1px solid var(--border);border-radius:6px;padding:.35rem .65rem;font-size:.78rem;color:var(--text);font-family:inherit">
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-hdr" style="border-bottom:1px solid var(--border);padding-bottom:.7rem;margin-bottom:.85rem;display:flex;align-items:center;gap:.5rem">
        <span style="font-weight:700;font-size:.85rem">Credenciales EmailJS</span>
        <span style="font-size:.65rem;color:var(--muted2);margin-left:auto">emailjs.com → Account → API Keys</span>
      </div>
      <div style="display:flex;flex-direction:column;gap:.6rem">
        <div style="display:flex;align-items:center;gap:.75rem">
          <label style="font-size:.75rem;color:var(--muted2);min-width:145px">Service ID</label>
          <input id="ntfServiceId" value="${serviceId}" placeholder="service_xxxxxxx" style="flex:1;background:var(--panel2);border:1px solid var(--border);border-radius:6px;padding:.35rem .65rem;font-size:.78rem;color:var(--text);font-family:'Roboto Mono',monospace">
        </div>
        <div style="display:flex;align-items:center;gap:.75rem">
          <label style="font-size:.75rem;color:var(--muted2);min-width:145px">Template ID</label>
          <input id="ntfTemplateId" value="${templateId}" placeholder="template_xxxxxxx" style="flex:1;background:var(--panel2);border:1px solid var(--border);border-radius:6px;padding:.35rem .65rem;font-size:.78rem;color:var(--text);font-family:'Roboto Mono',monospace">
        </div>
        <div style="display:flex;align-items:center;gap:.75rem">
          <label style="font-size:.75rem;color:var(--muted2);min-width:145px">Public Key</label>
          <input id="ntfPublicKey" value="${publicKey}" placeholder="xxxxxxxxxxxxxxxxxxxx" style="flex:1;background:var(--panel2);border:1px solid var(--border);border-radius:6px;padding:.35rem .65rem;font-size:.78rem;color:var(--text);font-family:'Roboto Mono',monospace">
        </div>
      </div>
      <div style="margin-top:.85rem;padding:.65rem .8rem;background:rgba(99,102,241,.07);border:1px solid rgba(99,102,241,.2);border-radius:7px;font-size:.7rem;color:var(--muted2);line-height:1.65">
        💡 <strong style="color:var(--text)">Guía rápida:</strong> Crear cuenta en <strong>emailjs.com</strong> → Add New Service (Gmail, Outlook, etc.) → Create Template → copiar los 3 datos aquí.<br>
        El template debe usar las variables: <code style="background:var(--panel2);padding:1px 5px;border-radius:3px">&#123;&#123;to_email&#125;&#125;</code> <code style="background:var(--panel2);padding:1px 5px;border-radius:3px">&#123;&#123;subject&#125;&#125;</code> <code style="background:var(--panel2);padding:1px 5px;border-radius:3px">&#123;&#123;message&#125;&#125;</code>
      </div>
    </div>

    <div class="card">
      <div class="card-hdr" style="border-bottom:1px solid var(--border);padding-bottom:.7rem;margin-bottom:.85rem"><span style="font-weight:700;font-size:.85rem">¿Cuándo enviar?</span></div>
      <div style="display:flex;flex-direction:column;gap:.45rem">
        <label style="display:flex;align-items:center;gap:.75rem;padding:.45rem .65rem;background:var(--panel2);border:1px solid var(--border);border-radius:7px;cursor:pointer">
          <input type="checkbox" id="ntfTrgParte" ${trgParte?'checked':''} style="width:15px;height:15px;accent-color:#06b6d4;flex-shrink:0">
          <div>
            <div style="font-size:.78rem;font-weight:600">Al guardar parte de equipo (LA / LB)</div>
            <div style="font-size:.65rem;color:var(--muted2)">Envía un correo cada vez que se registre o actualice un parte</div>
          </div>
        </label>
        <label style="display:flex;align-items:center;gap:.75rem;padding:.45rem .65rem;background:var(--panel2);border:1px solid var(--border);border-radius:7px;cursor:pointer">
          <input type="checkbox" id="ntfTrgDiario" ${trgDiario?'checked':''} style="width:15px;height:15px;accent-color:#06b6d4;flex-shrink:0">
          <div>
            <div style="font-size:.78rem;font-weight:600">Resumen diario (manual)</div>
            <div style="font-size:.65rem;color:var(--muted2)">Enviado manualmente con el botón "Enviar Reporte Ahora"</div>
          </div>
        </label>
      </div>
    </div>

    <div style="display:flex;gap:.6rem;justify-content:flex-end;flex-wrap:wrap">
      <button onclick="_notifEnviarAhora()" style="background:rgba(16,185,129,.12);border:1px solid rgba(16,185,129,.4);color:#10b981;border-radius:8px;padding:.4rem 1rem;font-size:.78rem;font-weight:700;cursor:pointer">📊 Enviar Reporte Ahora</button>
      <button onclick="_notifTest()" style="background:rgba(99,102,241,.1);border:1px solid rgba(99,102,241,.3);color:#a5b4fc;border-radius:8px;padding:.4rem 1rem;font-size:.78rem;font-weight:700;cursor:pointer">✉ Enviar Prueba</button>
      <button onclick="_notifSave()" style="background:#6366f1;border:none;color:white;border-radius:8px;padding:.4rem 1.2rem;font-size:.78rem;font-weight:700;cursor:pointer">Guardar</button>
    </div>

    <div class="card">
      <div class="card-hdr" style="border-bottom:1px solid var(--border);padding-bottom:.6rem;margin-bottom:.75rem;display:flex;align-items:center">
        <span style="font-weight:700;font-size:.85rem">Historial de envíos</span>
        <button onclick="_notifClearLog()" style="margin-left:auto;background:transparent;border:1px solid var(--border);color:var(--muted2);border-radius:5px;padding:2px 8px;font-size:.65rem;cursor:pointer">Limpiar</button>
      </div>
      <div id="ntfLog" style="display:flex;flex-direction:column;gap:.35rem;max-height:200px;overflow-y:auto"></div>
    </div>
  </div>`;
  _notifRenderLog();
}

function _notifToggleActivo(){
  const cfg=_notifGetCfg();
  cfg.activo=!(cfg.activo!==false);
  _notifSaveCfg(cfg);
  rNotificaciones();
}

function _notifSave(){
  const cfg=_notifGetCfg();
  cfg.email=document.getElementById('ntfEmail')?.value.trim()||'';
  cfg.emailCC=document.getElementById('ntfEmailCC')?.value.trim()||'';
  cfg.serviceId=document.getElementById('ntfServiceId')?.value.trim()||'';
  cfg.templateId=document.getElementById('ntfTemplateId')?.value.trim()||'';
  cfg.publicKey=document.getElementById('ntfPublicKey')?.value.trim()||'';
  cfg.trgParte=document.getElementById('ntfTrgParte')?.checked||false;
  cfg.trgDiario=document.getElementById('ntfTrgDiario')?.checked||false;
  _notifSaveCfg(cfg);
  toast('✓ Configuración guardada');
  rNotificaciones();
}

function _notifClearLog(){
  localStorage.removeItem(_NOTIF_LOG_KEY);
  _notifRenderLog();
}

function _notifRenderLog(){
  const el=document.getElementById('ntfLog');
  if(!el)return;
  const log=_notifGetLog();
  if(!log.length){el.innerHTML='<div style="font-size:.72rem;color:var(--muted2);padding:.3rem 0">Sin envíos registrados aún.</div>';return;}
  el.innerHTML=log.map(e=>{
    const hora=new Date(e.ts).toLocaleString('es-PE',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'});
    return`<div style="display:flex;align-items:center;gap:.6rem;padding:.35rem .6rem;background:var(--panel2);border-radius:6px;border-left:3px solid ${e.ok?'#10b981':'#ef4444'}">
      <span style="font-size:.75rem">${e.ok?'✓':'✗'}</span>
      <div style="flex:1;font-size:.72rem;color:var(--text)">${e.asunto||'Envío'}</div>
      <div style="font-size:.62rem;color:var(--muted2)">${hora}</div>
    </div>`;
  }).join('');
}

async function _notifSend(asunto,cuerpo){
  const cfg=_notifGetCfg();
  if(!cfg.serviceId||!cfg.templateId||!cfg.publicKey){
    toast('⚠ Configura las credenciales de EmailJS primero',true);return false;
  }
  if(!cfg.email){toast('⚠ Falta el correo de destino',true);return false;}
  if(typeof emailjs==='undefined'){
    toast('⚠ EmailJS no cargado. Verifica conexión a internet.',true);return false;
  }
  try{
    await emailjs.send(cfg.serviceId,cfg.templateId,{
      to_email:cfg.email,
      cc_email:cfg.emailCC||'',
      subject:asunto,
      message:cuerpo
    },{publicKey:cfg.publicKey});
    _notifAddLog({ok:true,asunto});
    _notifRenderLog();
    return true;
  }catch(err){
    console.error('[Notif]',err);
    _notifAddLog({ok:false,asunto,err:err?.text||String(err)});
    _notifRenderLog();
    return false;
  }
}

async function _notifTest(){
  _notifSave();
  const ok=await _notifSend(
    '✓ Prueba — ECOSERMO ERP',
    `Esta es una prueba del sistema de notificaciones ECOSERMO ERP.\n\nFecha: ${new Date().toLocaleString('es-PE')}\nUsuario: ${CU?.nombre||'—'}\n\nSi recibes este correo, las notificaciones están correctamente configuradas.`
  );
  if(ok)toast('✓ Correo de prueba enviado');
  else toast('✗ Error al enviar — revisa las credenciales',true);
}

async function _notifEnviarAhora(){
  const hoy=new Date().toISOString().slice(0,10);
  const partes=(DB.partes||[]).filter(p=>p.fecha===hoy);
  if(!partes.length){toast('No hay partes registrados para hoy ('+hoy+')',true);return;}

  const equipos=DB.equipos||[];
  const _fu=p=>{const eq=equipos.find(e=>e.id===p.eqId);const fu=(eq&&eq.factorUso>0)?eq.factorUso:1;return(+p.ef||0)*fu;};
  const totalEf=partes.reduce((s,p)=>s+_fu(p),0).toFixed(1);
  const totalEq=[...new Set(partes.map(p=>p.eqId))].length;
  const conInop=partes.filter(p=>(+p.im||0)>0).length;

  const fechaFmt=new Date(hoy+'T12:00:00').toLocaleDateString('es-PE',{day:'2-digit',month:'long',year:'numeric'});
  const asunto=`📊 Reporte de Equipos — ${fechaFmt}`;

  const detalle=partes.map(p=>{
    const eq=equipos.find(e=>e.id===p.eqId);
    return`  • ${eq?.cod||'—'} ${eq?.marca||''}: ${(+p.ef||0).toFixed(1)}h ef. (${eq?.tipo||'—'})`;
  }).join('\n');

  const cuerpo=`REPORTE DE EQUIPOS — ECOSERMO ERP
Fecha: ${fechaFmt}
Generado por: ${CU?.nombre||'—'}

RESUMEN
-------
Equipos con parte: ${totalEq}
Horas efectivas totales: ${totalEf} h
Con horas inoperativas: ${conInop}

DETALLE POR EQUIPO
------------------
${detalle}

--
Sistema GDAR-ECOSERMO | Control de Equipos
Este mensaje fue generado automáticamente.`;

  const ok=await _notifSend(asunto,cuerpo);
  if(ok)toast('✓ Reporte enviado por correo');
  else toast('✗ Error al enviar',true);
}

// Llamado desde auxmec.js al guardar un parte
async function _notifTrigger(evento,datos={}){
  const cfg=_notifGetCfg();
  if(cfg.activo===false)return;
  if(evento==='parte_guardado'&&!cfg.trgParte)return;

  const eq=(DB.equipos||[]).find(e=>e.id===datos.eqId);
  const fecha=datos.fecha||new Date().toISOString().slice(0,10);
  const fechaFmt=new Date(fecha+'T12:00:00').toLocaleDateString('es-PE',{day:'2-digit',month:'long',year:'numeric'});

  const asunto=`Parte guardado — ${eq?.cod||'Equipo'} · ${fechaFmt}`;
  const cuerpo=`Se registró un parte de equipo en ECOSERMO ERP.

Equipo: ${eq?.cod||'—'} ${eq?.marca||''} ${eq?.modelo||''}
Tipo: ${eq?.tipo||'—'}
Fecha: ${fechaFmt}
Parte ID: #${datos.parteId||'—'}
Horas efectivas: ${datos.ef||'—'} h

--
Sistema GDAR-ECOSERMO | Control de Equipos`;

  await _notifSend(asunto,cuerpo);
}
