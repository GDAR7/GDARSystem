// ══ CIERRE DE PLANILLA ══════════════════════════════════════════════════════
// La planilla no se guarda: se recalcula cada vez desde la ficha, el tareaje y
// los datos mensuales. Eso está bien mientras el mes está abierto, pero una vez
// pagado hace falta una FOTO de lo que se pagó — si mañana cambia un sueldo o se
// corrige un día del tareaje, el mes ya cerrado saldría distinto.
//
// Al cerrar:
//   · se guarda una fila por trabajador con el cálculo completo (planilla_cerrada)
//   · se marca el mes como cerrado (planilla_cierre)
//   · el TAREAJE de ese mes queda bloqueado: no se puede editar más
//
// En un mes cerrado la planilla muestra lo guardado, no lo recalculado. Si hubo
// un error puntual se puede recalcular a UNA persona: su fila se rehace y queda
// marcada con la fecha y el usuario que la tocó después del cierre.

const _plcMesLbl=m=>(typeof _PL_MESES!=='undefined'?_PL_MESES[+m]:'')||('Mes '+m);
const _plcHoy=()=>new Date().toISOString().slice(0,19).replace('T',' ');
const _plcQuien=()=>(typeof CU!=='undefined'&&CU&&(CU.nombre||CU.codigo))||'—';

// ── Consultas ──────────────────────────────────────────────────────────────
function plCierreDe(mes,anio){
  return (DB.planillaCierre||[]).find(c=>+c.mes===+mes&&String(c.anio)===String(anio))||null;
}
function plMesCerrado(mes,anio){return !!plCierreDe(mes,anio);}

// ¿La fecha cae en un mes con la planilla cerrada? Lo usa el tareaje.
function plTareajeBloqueado(fecha){
  const s=String(fecha||'');
  if(s.length<7)return false;
  return plMesCerrado(+s.slice(5,7),s.slice(0,4));
}
// Aviso único para todos los puntos de edición del tareaje
function plAvisarBloqueo(fecha){
  const s=String(fecha||'');
  toast(`Tareaje bloqueado: la planilla de ${_plcMesLbl(+s.slice(5,7))} ${s.slice(0,4)} ya está cerrada`,true);
  return false;
}

function plFilaCerrada(personalId,mes,anio){
  return (DB.planillaCerrada||[]).find(f=>+f.personalId===+personalId&&+f.mes===+mes&&String(f.anio)===String(anio))||null;
}
function plFilasCerradas(mes,anio){
  return (DB.planillaCerrada||[]).filter(f=>+f.mes===+mes&&String(f.anio)===String(anio));
}

// ── Cerrar el mes ──────────────────────────────────────────────────────────
async function plCerrarMes(){
  const mes=_plGenMes,anio=_plGenAnio;
  if(!mes||!anio){toast('Genere la planilla antes de cerrarla',true);return;}
  if(plMesCerrado(mes,anio)){toast('Ese mes ya está cerrado',true);return;}

  const gente=DB.personal.filter(p=>p.est==='Activo');
  if(!gente.length){toast('No hay trabajadores activos',true);return;}

  if(!confirm(
    `Cerrar la planilla de ${_plcMesLbl(mes)} ${anio}\n\n`+
    `· Se guardará el cálculo de ${gente.length} trabajadores tal como está hoy\n`+
    `· El TAREAJE de ese mes quedará BLOQUEADO y no se podrá editar\n`+
    `· La planilla dejará de recalcularse: mostrará lo guardado\n\n`+
    `Se puede reabrir después si hace falta.\n\n¿Continuar?`))return;

  toast('Cerrando planilla...');
  let neto=0,ok=0,fallos=0,ultErr='';
  for(const p of gente){
    const det=DB.planillaMes.find(d=>d.personalId===p.id&&+d.mes===mes&&String(d.anio)===String(anio));
    const c=_calcPlanRow(p,det);
    neto+=+c.neto||0;
    const rec={
      id:nidSeguro('plc','planillaCerrada'),
      mes:+mes,anio:String(anio),personalId:p.id,
      dni:p.dni||'',nombre:`${p.ape||''}, ${p.nom||''}`.trim(),
      neto:+(+c.neto||0).toFixed(2),
      datos:c,                       // el cálculo completo, tal cual
      recalcEn:null,recalcPor:null
    };
    (DB.planillaCerrada=DB.planillaCerrada||[]).push(rec);
    const err=await supaUpsert('planillaCerrada',rec);
    if(err){DB.planillaCerrada=DB.planillaCerrada.filter(x=>x.id!==rec.id);fallos++;ultErr=err.message||String(err);}
    else ok++;
  }
  if(!ok){toast('No se pudo guardar ninguna fila: '+ultErr,true);return;}

  const cab={
    id:nidSeguro('plcc','planillaCierre'),
    mes:+mes,anio:String(anio),
    fecha:_plcHoy(),usuario:_plcQuien(),
    nTrab:ok,netoTotal:+neto.toFixed(2)
  };
  (DB.planillaCierre=DB.planillaCierre||[]).push(cab);
  const e2=await supaUpsert('planillaCierre',cab);
  if(e2){
    DB.planillaCierre=DB.planillaCierre.filter(x=>x.id!==cab.id);
    toast('Se guardaron las filas pero no se pudo marcar el cierre: '+(e2.message||e2),true);
    return;
  }
  genPlanilla();
  if(typeof rTareaje==='function'&&document.getElementById('tbTareaje'))rTareaje();
  toast(`🔒 Planilla de ${_plcMesLbl(mes)} ${anio} cerrada · ${ok} trabajadores${fallos?' · '+fallos+' con error':''}`,!!fallos);
}

// ── Reabrir ────────────────────────────────────────────────────────────────
async function plReabrirMes(){
  const mes=_plGenMes,anio=_plGenAnio;
  const cab=plCierreDe(mes,anio);
  if(!cab){toast('Ese mes no está cerrado',true);return;}
  if(!confirm(
    `Reabrir la planilla de ${_plcMesLbl(mes)} ${anio}\n\n`+
    `· La planilla volverá a recalcularse en vivo\n`+
    `· El tareaje de ese mes se podrá editar otra vez\n`+
    `· La foto guardada se conserva y se puede consultar\n\n`+
    `Cerrado el ${cab.fecha||'—'} por ${cab.usuario||'—'}.\n\n¿Continuar?`))return;

  DB.planillaCierre=(DB.planillaCierre||[]).filter(x=>x.id!==cab.id);
  const err=await supaDelete('planillaCierre',cab.id);
  genPlanilla();
  if(typeof rTareaje==='function'&&document.getElementById('tbTareaje'))rTareaje();
  toast('🔓 Planilla reabierta · el tareaje vuelve a estar editable');
}

// ── Recalcular a una sola persona dentro del mes cerrado ───────────────────
async function plRecalcularUno(personalId){
  const mes=_plGenMes,anio=_plGenAnio;
  if(!plMesCerrado(mes,anio)){genPlanilla();return;}
  const p=DB.personal.find(x=>+x.id===+personalId);
  if(!p){toast('No se encontró al trabajador',true);return;}
  const fila=plFilaCerrada(personalId,mes,anio);
  if(!fila){toast('Ese trabajador no está en el cierre de este mes',true);return;}

  const det=DB.planillaMes.find(d=>d.personalId===p.id&&+d.mes===mes&&String(d.anio)===String(anio));
  const c=_calcPlanRow(p,det);
  const antes=+fila.neto||0, ahora=+(+c.neto||0).toFixed(2);
  const dif=+(ahora-antes).toFixed(2);

  if(!confirm(
    `Recalcular a ${p.ape||''}, ${p.nom||''} dentro de un mes CERRADO\n\n`+
    `Neto guardado:  S/ ${antes.toFixed(2)}\n`+
    `Neto recalculado: S/ ${ahora.toFixed(2)}\n`+
    `Diferencia: ${dif>=0?'+':''}S/ ${dif.toFixed(2)}\n\n`+
    `La fila quedará marcada como recalculada después del cierre.\n\n¿Continuar?`))return;

  const prev={...fila};
  fila.neto=ahora;fila.datos=c;
  fila.recalcEn=_plcHoy();fila.recalcPor=_plcQuien();
  const err=await supaUpsert('planillaCerrada',fila);
  if(err){Object.assign(fila,prev);return;}

  // El neto total del cierre se ajusta con la diferencia
  const cab=plCierreDe(mes,anio);
  if(cab){
    cab.netoTotal=+((+cab.netoTotal||0)+dif).toFixed(2);
    await supaUpsert('planillaCierre',cab);
  }
  genPlanilla();
  toast(`✓ ${p.ape||''} recalculado · ${dif>=0?'+':''}S/ ${dif.toFixed(2)}`);
}

// ── Barra de estado, arriba de la tabla ────────────────────────────────────
function plRenderCierre(){
  const el=document.getElementById('plCierreBar');if(!el)return;
  const mes=_plGenMes,anio=_plGenAnio;
  if(!mes||!anio){el.innerHTML='';return;}
  const cab=plCierreDe(mes,anio);
  const S=n=>'S/ '+Number(n||0).toLocaleString('es-PE',{minimumFractionDigits:2,maximumFractionDigits:2});

  if(!cab){
    el.innerHTML=`<div style="display:flex;align-items:center;gap:.6rem;flex-wrap:wrap;padding:.45rem .8rem;background:var(--panel2);border-bottom:1px solid var(--border)">
      <span style="font-size:.72rem;color:var(--muted2)">🔓 <b style="color:#10b981">Mes abierto</b> · la planilla se recalcula en vivo desde el tareaje y la ficha de cada trabajador</span>
      <button onclick="plCerrarMes()" style="margin-left:auto;font-size:.72rem;padding:.28rem .9rem;border-radius:7px;border:none;background:#b45309;color:#fff;cursor:pointer;font-weight:800;white-space:nowrap" title="Guarda el cálculo y bloquea el tareaje del mes">🔒 Cerrar planilla del mes</button>
    </div>`;
    return;
  }
  const recalc=plFilasCerradas(mes,anio).filter(f=>f.recalcEn).length;
  el.innerHTML=`<div style="display:flex;align-items:center;gap:.6rem;flex-wrap:wrap;padding:.45rem .8rem;background:rgba(180,83,9,.12);border-bottom:1px solid rgba(180,83,9,.4)">
    <span style="font-size:.75rem;font-weight:800;color:#fbbf24">🔒 PLANILLA CERRADA</span>
    <span style="font-size:.7rem;color:var(--muted2)">${_plcEsc(cab.fecha||'—')} · por ${_plcEsc(cab.usuario||'—')} · ${cab.nTrab||0} trab. · neto ${S(cab.netoTotal)}</span>
    ${recalc?`<span style="font-size:.66rem;color:#f97316;border:1px solid #f9731655;border-radius:5px;padding:0 .4rem" title="Filas modificadas después del cierre">${recalc} recalculada${recalc!==1?'s':''}</span>`:''}
    <span style="font-size:.68rem;color:var(--muted2)">· se muestra lo guardado, no se recalcula · tareaje del mes bloqueado</span>
    <button onclick="plReabrirMes()" style="margin-left:auto;font-size:.72rem;padding:.28rem .9rem;border-radius:7px;border:1px solid #10b98155;background:rgba(16,185,129,.1);color:#10b981;cursor:pointer;font-weight:700;white-space:nowrap">🔓 Reabrir</button>
  </div>`;
}
const _plcEsc=s=>String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
