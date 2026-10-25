// ══ COSTO POR m³ MOVIDO (Cost Control) ══════════════════════════════════════
// Junta lo que se le vende al cliente en el período — horas máquina (HM) y
// horas hombre (HH) — le agrega los porcentajes pactados y lo divide entre el
// volumen realmente movido para saber cuánto cuesta el m³:
//
//   BASE          = HM + HH
//   Reembolsables = BASE × 15 %
//   Gastos Grales = BASE × 12 %
//   Utilidad      = BASE × 9.35 %
//   TOTAL         = BASE + los tres    (los tres salen SIEMPRE de la base,
//                                       no se aplican en cascada)
//   COSTO POR m³  = TOTAL ÷ m³ movidos
//
// HM y HH se calculan igual que en Cost Control (reutiliza _ccMatchEq y
// _ccMatchHH) para que los importes cuadren entre los dos módulos.
//
// Los porcentajes son DE CADA MES (cambian de un período a otro) y se guardan
// en Supabase, tabla costo_m3_pct (sql/costo_m3_pct.sql), con la clave del mes
// de cierre del período 21→20 (AAAA-MM). Un mes sin porcentajes propios usa
// los del último mes guardado anterior; si no hay ninguno, los de por defecto.
// Así la Tendencia calcula cada mes con sus propios porcentajes.
//
// En la misma fila del mes:
//   · hm_manual / hh_manual: el importe de HM o HH corregido a mano (a veces,
//     por temas externos, no cuadra por algunos soles). Vale SOLO para su mes:
//     no se hereda. Vacío = se usa el calculado.
//   · hm, hh, subtotal, total, m3, costo_m3: la foto del mes al guardarlo,
//     para tener el costo de cada mes aunque después cambien los partes.
//
// Nada se guarda solo: un mes guardado se ve BLOQUEADO con «✏ Editar». Al
// editar se trabaja sobre un borrador (el costo se recalcula al instante como
// vista previa) y «💾 Guardar» lo graba todo junto; «Cancelar» lo descarta.
// Un mes que nunca se guardó abre directo en edición, esperando Guardar.

const _CM3_PCT_DEF={reemb:15,gg:12,util:9.35};
const _CM3_PCT_TABLA='costo_m3_pct';
let _cm3Offset=0;
let _cm3Cap  =+localStorage.getItem('_amtCapM3')||12;      // comparte capacidad con Avance MT
let _cm3Modo =localStorage.getItem('_cm3Modo')||'seca';    // tarifa seca | full
let _cm3PctMes={};             // 'AAAA-MM' → {reemb,gg,util,hmManual,hhManual,foto}
let _cm3Borr=null;             // borrador del mes en edición: {k,reemb,gg,util,hmManual,hhManual,sucio}
let _cm3PctEstado='';          // '' | 'cargando' | 'ok' | 'error'
let _cm3PctErrT=0;             // si falla, se reintenta como mucho una vez por minuto
let _cm3Guardando=false;

const _CM3_MESES=['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const _cm3Clave=per=>String(per.hasta).slice(0,7);           // mes de cierre del período
const _cm3MesEtq=k=>{const[y,m]=String(k).split('-');return _CM3_MESES[+m-1]+' '+y;};

// Los porcentajes que valen para un período, y de dónde salen. Si ese mes se
// está editando, valen los del borrador (vista previa).
function _cm3PctDe(per){
  const k=_cm3Clave(per);
  const tres=r=>({reemb:r.reemb,gg:r.gg,util:r.util});
  const base=_cm3PctMes[k]?{origen:'guardado',de:k}
    :(()=>{const ant=Object.keys(_cm3PctMes).filter(x=>x<k).sort().pop();return ant?{origen:'heredado',de:ant}:{origen:'defecto',de:null};})();
  if(_cm3Borr&&_cm3Borr.k===k)return{...tres(_cm3Borr),...base,editando:true};
  if(base.origen==='guardado')return{...tres(_cm3PctMes[k]),...base};
  if(base.origen==='heredado')return{...tres(_cm3PctMes[base.de]),...base};
  return{..._CM3_PCT_DEF,...base};
}
// Importes de HM y HH corregidos a mano: solo los del propio mes (null = calculado)
function _cm3AjusteDe(per){
  const k=_cm3Clave(per);
  const r=(_cm3Borr&&_cm3Borr.k===k)?_cm3Borr:(_cm3PctMes[k]||{});
  const n=v=>v===null||v===undefined||v===''||!isFinite(+v)?null:+v;
  return{hm:n(r.hmManual),hh:n(r.hhManual)};
}
const _cm3Editando=per=>!!(_cm3Borr&&_cm3Borr.k===_cm3Clave(per));

// Se piden una vez al abrir el módulo; al llegar, se redibuja
async function _cm3PctCargar(){
  if(_cm3PctEstado==='cargando'||_cm3PctEstado==='ok')return;
  if(_cm3PctEstado==='error'&&Date.now()-_cm3PctErrT<60000)return;
  _cm3PctEstado='cargando';
  try{
    const{data,error}=await supa.from(_CM3_PCT_TABLA).select('*');
    if(error)throw error;
    _cm3PctMes={};
    (data||[]).forEach(r=>{_cm3PctMes[String(r.periodo)]=_cm3FilaAMes(r);});
    _cm3PctEstado='ok';
  }catch(e){console.warn('[Costo m³] porcentajes',e);_cm3PctEstado='error';_cm3PctErrT=Date.now();}
  if(document.getElementById('page-costoM3'))rCostoM3();
}

const _cm3Num=v=>v===null||v===undefined||v===''?null:+v;
function _cm3FilaAMes(r){
  return{reemb:+r.reemb||0,gg:+r.gg||0,util:+r.util||0,
    hmManual:_cm3Num(r.hm_manual),hhManual:_cm3Num(r.hh_manual),
    foto:r.subtotal==null?null:{hm:_cm3Num(r.hm),hh:_cm3Num(r.hh),subtotal:+r.subtotal,total:_cm3Num(r.total),
      m3:_cm3Num(r.m3),costoM3:_cm3Num(r.costo_m3),en:r.actualizado_en||null,por:r.actualizado_por||''}};
}

// ── Editar · borrador · guardar ────────────────────────────────────────────
// Abre el borrador del mes visible con lo que hoy vale para él
function _cm3Editar0(){
  const per=_cm3Periodo(), k=_cm3Clave(per);
  const pct=_cm3PctDe(per), aj=_cm3AjusteDe(per);
  _cm3Borr={k,reemb:pct.reemb,gg:pct.gg,util:pct.util,hmManual:aj.hm,hhManual:aj.hh,sucio:false};
}
function _cm3Editar(){_cm3Editar0();rCostoM3();}
function _cm3Cancelar(){_cm3Borr=null;rCostoM3();}
// Cambia un valor del borrador (no guarda nada todavía)
function _cm3BorrSet(campo,v){
  if(!_cm3Borr)return;
  const per=_cm3Periodo();if(_cm3Borr.k!==_cm3Clave(per))return;
  const txt=String(v==null?'':v).trim();
  if(campo==='hm'||campo==='hh'){
    const D=_cm3Datos();
    const calc=campo==='hm'?D.hmCalc:D.hhCalc;
    let val=txt===''?null:Math.max(0,Math.round((+txt||0)*100)/100);
    if(val!=null&&Math.abs(val-calc)<0.005)val=null;          // igual al calculado: no es corrección
    _cm3Borr[campo==='hm'?'hmManual':'hhManual']=val;
  }else if(['reemb','gg','util'].includes(campo)){
    _cm3Borr[campo]=Math.max(0,Math.round((+txt||0)*100)/100);
  }else return;
  _cm3Borr.sucio=true;
  rCostoM3();
}
function _cm3Restaurar(){
  if(!_cm3Borr)return;
  Object.assign(_cm3Borr,_CM3_PCT_DEF,{sucio:true});
  rCostoM3();
}
// Graba el mes visible: porcentajes, importes corregidos y la foto del costo
async function _cm3Guardar(){
  const per=_cm3Periodo(), k=_cm3Clave(per);
  if(!_cm3Borr||_cm3Borr.k!==k||_cm3Guardando)return;
  const D=_cm3Datos();                        // con el borrador: es la foto que se guarda
  const r2=v=>Math.round((+v||0)*100)/100;
  const quien=(typeof CU!=='undefined'&&CU?String(CU.nombre||CU.codigo||''):'')||null;
  const ahora=new Date().toISOString();
  const b=_cm3Borr;
  const fila={periodo:k,reemb:b.reemb,gg:b.gg,util:b.util,hm_manual:b.hmManual,hh_manual:b.hhManual,
    hm:r2(D.hm),hh:r2(D.hh),subtotal:r2(D.base),total:r2(D.total),m3:r2(D.vol.m3),
    costo_m3:Math.round(D.costoM3*10000)/10000,actualizado_en:ahora,actualizado_por:quien};
  _cm3Guardando=true;rCostoM3();
  try{
    const{error}=await supa.from(_CM3_PCT_TABLA).upsert(fila);
    if(error)throw error;
    _cm3PctMes[k]=_cm3FilaAMes(fila);
    _cm3Borr=null;                                // queda guardado y bloqueado
    toast('✓ '+_cm3MesEtq(k)+' guardado');
  }catch(e){
    toast('No se guardó '+_cm3MesEtq(k)+': '+((e&&e.message)||e),true);   // el borrador sigue abierto
  }finally{_cm3Guardando=false;rCostoM3();}
}

const _cm3N=(v,d)=>Number(v||0).toLocaleString('es-PE',{minimumFractionDigits:d==null?2:d,maximumFractionDigits:d==null?2:d});
const _cm3S=v=>'S/ '+_cm3N(v);
const _cm3Esc=s=>String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
// Material válido = no vacío y distinto de "SIN MATERIAL": ese viaje es un
// traslado, cuenta como viaje pero no mueve volumen. Mismo criterio que Avance MT.
const _cm3MatOk=m=>{const s=String(m||'').trim();return !!s&&!/^sin\s*material/i.test(s);};

function _cm3Set(k,v){
  if(k==='cap'){_cm3Cap=Math.max(1,+v||12);localStorage.setItem('_amtCapM3',_cm3Cap);if(typeof _amtCapM3!=='undefined')_amtCapM3=_cm3Cap;rCostoM3();return;}
  _cm3BorrSet(k,v);
}
function _cm3SetModo(m){_cm3Modo=m;localStorage.setItem('_cm3Modo',m);rCostoM3();}
// Cambiar de mes con cambios sin guardar: se pregunta antes de perderlos
function _cm3Nav(d){
  if(_cm3Borr&&_cm3Borr.sucio&&typeof confirm==='function'&&!confirm('Hay cambios sin guardar en '+_cm3MesEtq(_cm3Borr.k)+'. ¿Descartarlos?'))return;
  _cm3Borr=null;_cm3Offset+=d;rCostoM3();
}

// Período 21→20 con desplazamiento propio
function _cm3Periodo(){
  const hoy=new Date();
  const d=hoy.getDate(),m=hoy.getMonth(),y=hoy.getFullYear();
  let baseY=y,baseM=m;
  if(d<21){baseM=m-1;if(baseM<0){baseM=11;baseY=y-1;}}
  let iniM=baseM+_cm3Offset,iniY=baseY;
  while(iniM>11){iniM-=12;iniY++;}
  while(iniM<0){iniM+=12;iniY--;}
  const ini=new Date(iniY,iniM,21),fin=new Date(iniY,iniM+1,20);
  const f=x=>`${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}-${String(x.getDate()).padStart(2,'0')}`;
  const MESES=['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  return{desde:f(ini),hasta:f(fin),label:`${MESES[fin.getMonth()]} ${fin.getFullYear()}`,
    dias:Math.round((fin-ini)/864e5)+1};
}

// ── HM · venta de equipos del período ──────────────────────────────────────
function _cm3Equipos(per,KEY){
  const partes=(DB.partes||[]).filter(p=>p.fecha>=per.desde&&p.fecha<=per.hasta);
  const map={};
  partes.forEach(p=>{
    const eq=(DB.equipos||[]).find(e=>+e.id===+p.eqId);if(!eq)return;
    if(!map[eq.id])map[eq.id]={eq,horasEf:0,dias:new Set(),tarifa:_ccMatchEq(eq)};
    map[eq.id].horasEf+=Math.max(0,+p.ef||0);
    map[eq.id].dias.add(p.fecha);
  });
  return Object.values(map).map(r=>{
    const t=r.tarifa,dias=r.dias.size;
    const factor=per.dias>0?dias/per.dias:0;
    const un=(t&&t.un)||r.eq.tarifaUn||'HM';
    let venta=0;
    if(t){
      if(un==='HM')venta=r.horasEf*(+t[KEY]||0);
      else if(un==='DIA')venta=dias*(+t[KEY]||0);
      else venta=factor*(+t[KEY]||0);          // MES: incidencia × tarifa
    }
    return{eq:r.eq,horasEf:r.horasEf,dias,un,venta,sinTarifa:!t};
  }).sort((a,b)=>b.venta-a.venta);
}

// ── HH · venta de personal del período ─────────────────────────────────────
// Delega en hhVentaPeriodo (hhVenta.js) para dar exactamente el mismo importe
// que el módulo HH Venta: cuenta TD + TN + A5 + DL + DLT×2.5, no solo los
// trabajados. Contarlos aparte era lo que hacía diferir los dos módulos.
function _cm3Personal(per){
  const R=hhVentaPeriodo(per.desde,per.hasta);
  return{filas:R.filas,sinTarifa:R.sinTarifa};
}

// ── Volumen movido del período, por área receptora ─────────────────────────
function _cm3Volumen(per){
  const partes=(DB.partes||[]).filter(p=>p.fecha>=per.desde&&p.fecha<=per.hasta);
  const byArea={};let m3=0,viajes=0,viajesSinMat=0;
  partes.forEach(p=>{
    (p.viajes||[]).forEach(v=>{
      const cant=parseFloat(v.cant)||0;
      if(!cant)return;
      const ok=_cm3MatOk(v.material);
      const vol=ok?cant*_cm3Cap:0;
      const a=String(v.destino||'').trim()||'(sin área)';
      if(!byArea[a])byArea[a]={area:a,m3:0,viajes:0};
      byArea[a].m3+=vol;byArea[a].viajes+=cant;
      m3+=vol;viajes+=cant;
      if(!ok)viajesSinMat+=cant;
    });
  });
  return{m3,viajes,viajesSinMat,
    areas:Object.values(byArea).sort((a,b)=>b.m3-a.m3)};
}

// Estado del mes visible: guardado, en edición, de dónde salen los porcentajes
function _cm3PctChip(D){
  const p=D.pct, mes=D.per.label;
  let c,t,tit='';
  if(_cm3PctEstado==='cargando'||_cm3PctEstado===''){c='#94a3b8';t='⏳ cargando…';}
  else if(_cm3PctEstado==='error'){c='#ef4444';t='⚠ sin conexión con lo guardado';tit='¿Ya se corrió sql/costo_m3_pct.sql?';}
  else if(p.editando){c='#f59e0b';t='✏ Editando '+mes+' · sin guardar';
    tit=p.origen==='guardado'?'Cambios sobre lo guardado':p.origen==='heredado'?'Porcentajes de partida: los de '+_cm3MesEtq(p.de):'Porcentajes de partida: los de por defecto';}
  else{c='#10b981';t='✓ '+mes+' guardado';tit='Para cambiarlo, presione Editar';}
  return `<span title="${_cm3Esc(tit)}" style="margin-left:auto;font-size:.68rem;font-weight:700;padding:.2rem .55rem;border-radius:999px;border:1px solid ${c};color:${c};white-space:nowrap">${_cm3Esc(t)}</span>`;
}

// Botones del mes: bloqueado → Editar; en edición → Guardar / Cancelar / Por defecto
function _cm3Botones(D){
  const b=(txt,fn,c,lleno,tit)=>`<button onclick="${fn}" ${_cm3Guardando?'disabled':''} title="${_cm3Esc(tit||'')}" style="font-size:.72rem;padding:.26rem .8rem;border-radius:6px;border:1px solid ${c};background:${lleno?c:'transparent'};color:${lleno?'#fff':c};cursor:pointer;font-weight:800">${txt}</button>`;
  if(_cm3PctEstado!=='ok')return '';
  const mes=D.per.label;
  if(!_cm3Editando(D.per))return b('✏ Editar','_cm3Editar()','#3b82f6',false,'Cambiar porcentajes o importes de '+mes);
  const guardado=!!_cm3PctMes[_cm3Clave(D.per)];
  return b(_cm3Guardando?'Guardando…':'💾 Guardar','_cm3Guardar()','#059669',true,'Grabar '+mes+': porcentajes, HM, HH, Sub Total, total y costo por m³')
    +(guardado?b('Cancelar','_cm3Cancelar()','#94a3b8',false,'Descartar los cambios'):'')
    +b('↺ Por defecto','_cm3Restaurar()','#94a3b8',false,'Poner 15 % · 12 % · 9.35 % (se graban al Guardar)');
}
// Lo último que se guardó del mes, y si los partes cambiaron desde entonces
function _cm3FotoHtml(D){
  const r=_cm3PctMes[_cm3Clave(D.per)];
  if(!r||!r.foto)return '';
  const f=r.foto;
  const fecha=f.en?new Date(f.en).toLocaleString('es-PE',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}):'';
  const cambio=!_cm3Editando(D.per)&&Math.abs((+f.subtotal||0)-D.base)>0.01;
  return `<div style="padding:.6rem .8rem;border-top:1px solid var(--border);font-size:.72rem;color:var(--muted2);line-height:1.6">
    💾 Guardado${fecha?' el '+_cm3Esc(fecha):''}${f.por?' por '+_cm3Esc(f.por):''} ·
    Sub Total <b style="color:var(--text);font-family:monospace">${_cm3S(f.subtotal)}</b> ·
    Total <b style="color:var(--text);font-family:monospace">${_cm3S(f.total)}</b> ·
    Costo por m³ <b style="color:#10b981;font-family:monospace">${_cm3S(f.costoM3)}</b>
    ${cambio?`<div style="margin-top:.35rem;color:#f59e0b">⚠ Los partes cambiaron desde que se guardó (Sub Total actual ${_cm3S(D.base)}). Para actualizar lo guardado: ✏ Editar → 💾 Guardar.</div>`:''}
  </div>`;
}

// ── Consolidado ────────────────────────────────────────────────────────────
function _cm3Datos(){
  const per=_cm3Periodo();
  const KEY=_cm3Modo==='full'?'full':'seca';
  const eqRows=_cm3Equipos(per,KEY);
  const{filas:hhRows,sinTarifa}=_cm3Personal(per);
  const vol=_cm3Volumen(per);

  const hmCalc=eqRows.reduce((s,r)=>s+r.venta,0);
  const hhCalc=hhRows.reduce((s,r)=>s+r.venta,0);
  const aj=_cm3AjusteDe(per);                // importes corregidos a mano, si hay
  const hm=aj.hm!=null?aj.hm:hmCalc;
  const hh=aj.hh!=null?aj.hh:hhCalc;
  const base=hm+hh;
  const pct=_cm3PctDe(per);                 // los porcentajes de ESTE mes
  const reemb=base*pct.reemb/100;
  const gg=base*pct.gg/100;
  const util=base*pct.util/100;
  const total=base+reemb+gg+util;
  const costoM3=vol.m3>0?total/vol.m3:0;
  const costoViaje=vol.viajes>0?total/vol.viajes:0;

  return{per,KEY,eqRows,hhRows,sinTarifa,vol,hm,hh,hmCalc,hhCalc,hmManual:aj.hm!=null,hhManual:aj.hh!=null,
    base,pct,reemb,gg,util,total,costoM3,costoViaje};
}

// ── Pantalla ───────────────────────────────────────────────────────────────
function rCostoM3(){
  const pg=document.getElementById('page-costoM3');if(!pg)return;
  _cm3PctCargar();                          // porcentajes por mes, una vez
  {const k=_cm3Clave(_cm3Periodo());
   if(_cm3PctEstado==='ok'&&!_cm3PctMes[k]&&!(_cm3Borr&&_cm3Borr.k===k))_cm3Editar0();}
  const D=_cm3Datos();
  const ED=_cm3Editando(D.per);
  const per=D.per;
  const AC='#059669';

  const kpis=[
    {l:'m³ Movidos',        v:_cm3N(D.vol.m3,0)+' m³',  c:'#3b82f6'},
    {l:'Costo Total Período',v:_cm3S(D.total),          c:'#f59e0b'},
    {l:'Costo por m³',      v:_cm3S(D.costoM3),         c:'#10b981'},
    {l:'Costo por Viaje',   v:_cm3S(D.costoViaje),      c:'#a78bfa'},
  ];

  const inp='background:var(--panel);border:1px solid var(--border);border-radius:6px;color:var(--text);padding:.22rem .4rem;font-size:.76rem;width:66px;text-align:right;font-family:monospace';
  const btnModo=(k,l)=>{const on=_cm3Modo===k;return`<button onclick="_cm3SetModo('${k}')" style="font-size:.7rem;padding:.24rem .7rem;border-radius:6px;border:1px solid ${on?AC:'var(--border)'};background:${on?AC:'transparent'};color:${on?'#fff':'var(--muted2)'};cursor:pointer;font-weight:700">${l}</button>`;};

  // Escalera del cálculo
  const TD='padding:.45rem .7rem;border-bottom:1px solid var(--border);font-size:.82rem';
  const linea=(lbl,det,val,color,fuerte)=>`<tr>
    <td style="${TD};${fuerte?'font-weight:800':''};color:${color||'var(--text)'}">${lbl}</td>
    <td style="${TD};color:var(--muted2);font-size:.72rem">${det||''}</td>
    <td style="${TD};text-align:right;font-family:monospace;font-weight:${fuerte?'900':'700'};color:${color||'var(--text)'}">${_cm3S(val)}</td>
  </tr>`;
  // HM y HH: importe calculado; en edición se puede corregir a mano para este mes
  const btnMini='font-size:.66rem;padding:.12rem .4rem;border-radius:5px;border:1px solid var(--border);background:transparent;color:var(--muted2);cursor:pointer';
  const montoFila=(lbl,campo,det,val,calc,manual,color)=>{
    const importe=ED
      ?`<input type="number" step="0.01" min="0" value="${(Math.round(val*100)/100).toFixed(2)}" onchange="_cm3BorrSet('${campo}',this.value)" style="${inp};width:130px" title="Importe de este mes">`
      :_cm3S(val);
    return `<tr>
      <td style="${TD};color:${color}">${lbl}${manual?' <span style="font-size:.58rem;font-weight:800;padding:.05rem .35rem;border-radius:4px;background:rgba(245,158,11,.15);color:#f59e0b;border:1px solid #f59e0b">EDITADO</span>':''}</td>
      <td style="${TD};color:var(--muted2);font-size:.72rem">${det}${manual?`<br><span style="color:#f59e0b">calculado ${_cm3S(calc)} · diferencia ${(val-calc>=0?'+':'−')+_cm3S(Math.abs(val-calc))}</span>${ED?`
        <button onclick="_cm3BorrSet('${campo}','')" title="Volver al importe calculado" style="${btnMini};margin-left:.3rem">↺ usar calculado</button>`:''}`:''}</td>
      <td style="${TD};text-align:right;font-family:monospace;font-weight:700;color:${color};white-space:nowrap">${importe}</td>
    </tr>`;
  };
  const pctFila=(lbl,campo,valPct,val,color)=>`<tr>
    <td style="${TD};color:${color}">${lbl}</td>
    <td style="${TD};color:var(--muted2);font-size:.72rem">
      ${ED?`<input type="number" step="0.01" min="0" value="${valPct}" onchange="_cm3BorrSet('${campo}',this.value)" style="${inp}">`:`<b style="color:var(--text);font-family:monospace">${_cm3N(valPct,2)}</b>`} %
      <span style="opacity:.7">de ${_cm3S(D.base)}</span>
    </td>
    <td style="${TD};text-align:right;font-family:monospace;font-weight:700;color:${color}">${_cm3S(val)}</td>
  </tr>`;

  // Distribución por área, con el costo que le toca a cada una
  const maxM3=Math.max(...D.vol.areas.map(a=>a.m3),1);
  const COLS=['#3b82f6','#10b981','#f59e0b','#ef4444','#a78bfa','#22d3ee','#f472b6','#84cc16','#fb923c'];
  const barras=D.vol.areas.map((a,i)=>{
    const c=COLS[i%COLS.length];
    const pct=D.vol.m3>0?a.m3/D.vol.m3*100:0;
    return`<div style="margin-bottom:.55rem">
      <div style="display:flex;justify-content:space-between;align-items:baseline;gap:.6rem;font-size:.76rem">
        <span style="color:${c};font-weight:700">${_cm3Esc(a.area)}</span>
        <span style="color:var(--muted2);font-size:.72rem;white-space:nowrap;font-family:monospace">
          ${_cm3N(a.m3,0)} m³ · ${_cm3N(a.viajes,0)} viajes · ${pct.toFixed(0)}%
          <b style="color:${c};margin-left:.5rem">${_cm3S(a.m3*D.costoM3)}</b>
        </span>
      </div>
      <div style="background:var(--border);border-radius:4px;height:8px;overflow:hidden;margin-top:.2rem">
        <div style="width:${Math.max(1,a.m3/maxM3*100)}%;height:100%;background:${c};border-radius:4px"></div>
      </div>
    </div>`;
  }).join('');

  // Avisos de datos incompletos: sin esto el costo por m³ sale bajo sin motivo aparente
  const sinTar=D.eqRows.filter(r=>r.sinTarifa);
  const avisos=[];
  if(sinTar.length)avisos.push(`${sinTar.length} equipo${sinTar.length!==1?'s':''} sin tarifa de venta: ${_cm3Esc(sinTar.slice(0,4).map(r=>r.eq.codigo).join(', '))}${sinTar.length>4?'…':''}`);
  if(D.sinTarifa.length)avisos.push(`${D.sinTarifa.length} cargo${D.sinTarifa.length!==1?'s':''} sin tarifa en HH Venta: ${_cm3Esc(D.sinTarifa.slice(0,4).join(', '))}${D.sinTarifa.length>4?'…':''}`);
  if(D.vol.viajesSinMat)avisos.push(`${_cm3N(D.vol.viajesSinMat,0)} viaje(s) sin material: cuentan como viaje pero no suman m³`);
  if(!D.vol.m3)avisos.push('No hay volumen movido en el período: el costo por m³ no se puede calcular');

  const TH='background:var(--panel2);color:var(--muted2);font-size:.62rem;font-weight:700;text-transform:uppercase;letter-spacing:.06em;padding:.4rem .7rem';

  pg.innerHTML=`
    <div class="ph"><div class="ph-title" style="color:${AC}">🧱 Costo por m³ Movido</div><div class="ph-sub">Horas máquina + horas hombre del período, con reembolsables, gastos generales y utilidad, repartidos entre el volumen transportado</div></div>
    ${_cm3TabBar()}

    <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:.6rem;margin-bottom:1rem">
      <div style="font-size:.78rem;color:var(--muted2)">Período 21→20 · <span class="mono">${per.desde}</span> al <span class="mono">${per.hasta}</span> · ${per.dias} días</div>
      <div style="display:flex;align-items:center;background:var(--panel2);border:1px solid var(--border);border-radius:8px;overflow:hidden">
        <button onclick="_cm3Nav(-1)" style="background:none;border:none;border-right:1px solid var(--border);color:var(--text);cursor:pointer;font-size:1.1rem;padding:.35rem .7rem;line-height:1">‹</button>
        <span style="font-weight:800;font-size:.88rem;min-width:130px;text-align:center;padding:0 .5rem">${per.label}</span>
        <button onclick="_cm3Nav(1)" style="background:none;border:none;border-left:1px solid var(--border);color:var(--text);cursor:pointer;font-size:1.1rem;padding:.35rem .7rem;line-height:1">›</button>
      </div>
    </div>

    <div style="display:flex;align-items:center;gap:.7rem;flex-wrap:wrap;margin-bottom:.9rem;padding:.5rem .7rem;background:var(--panel2);border:1px solid var(--border);border-radius:8px">
      <span style="font-size:.62rem;color:var(--muted2);font-weight:700;text-transform:uppercase;letter-spacing:.08em">Tarifa</span>
      ${btnModo('seca','Seca')}${btnModo('full','Full')}
      <span style="font-size:.62rem;color:var(--muted2);font-weight:700;text-transform:uppercase;letter-spacing:.08em;margin-left:.5rem">Cap. m³/viaje</span>
      <input type="number" step="0.5" min="1" value="${_cm3Cap}" onchange="_cm3Set('cap',this.value)" style="${inp}">
      ${_cm3PctChip(D)}
      ${_cm3Botones(D)}
    </div>

    <div class="kpi-row">${kpis.map(k=>`<div class="kpi" style="--kc:${k.c}"><div class="kpi-lbl">${k.l}</div><div class="kpi-val" style="font-size:${String(k.v).length>12?'1.15rem':'1.6rem'}">${k.v}</div></div>`).join('')}</div>

    ${(_cm3Tab==='resumen'&&avisos.length)?`<div style="margin-bottom:.9rem;padding:.5rem .7rem;background:rgba(245,158,11,.08);border:1px solid rgba(245,158,11,.35);border-radius:8px;font-size:.74rem;color:#fbbf24;line-height:1.7">
      ${avisos.map(a=>'⚠ '+a).join('<br>')}
    </div>`:''}

    ${_cm3Tab!=='resumen'?'':`
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(430px,1fr));gap:1rem">
      <div class="card">
        <div class="card-head"><span class="card-title">🧮 Composición del costo</span></div>
        <div class="card-body" style="padding:0"><table style="width:100%;border-collapse:collapse">
          <thead><tr><th style="${TH};text-align:left">Concepto</th><th style="${TH};text-align:left">Detalle</th><th style="${TH};text-align:right">Importe</th></tr></thead>
          <tbody>
            ${montoFila('Horas Máquina (HM)','hm',`${D.eqRows.length} equipo(s) · tarifa ${D.KEY==='full'?'full':'seca'}`,D.hm,D.hmCalc,D.hmManual,'#f59e0b')}
            ${montoFila('Horas Hombre (HH)','hh',`${D.hhRows.length} persona(s) · ${per.dias} días`,D.hh,D.hhCalc,D.hhManual,'#8b5cf6')}
            ${linea('Sub Total (HM + HH)','base de los porcentajes',D.base,'var(--text)',true)}
            ${pctFila('Reembolsables','reemb',D.pct.reemb,D.reemb,'#06b6d4')}
            ${pctFila('Gastos Generales','gg',D.pct.gg,D.gg,'#ef4444')}
            ${pctFila('Utilidad','util',D.pct.util,D.util,'#10b981')}
            <tr style="background:rgba(5,150,105,.10)">
              <td style="${TD};font-weight:900;color:${AC}">TOTAL DEL PERÍODO</td>
              <td style="${TD};color:var(--muted2);font-size:.72rem">${_cm3N(D.pct.reemb+D.pct.gg+D.pct.util,2)} % sobre la base</td>
              <td style="${TD};text-align:right;font-family:monospace;font-weight:900;color:${AC};font-size:.95rem">${_cm3S(D.total)}</td>
            </tr>
            <tr>
              <td style="${TD};font-weight:800">÷ Volumen movido</td>
              <td style="${TD};color:var(--muted2);font-size:.72rem">${_cm3N(D.vol.viajes,0)} viajes × ${_cm3N(_cm3Cap,1)} m³</td>
              <td style="${TD};text-align:right;font-family:monospace;font-weight:800">${_cm3N(D.vol.m3,0)} m³</td>
            </tr>
            <tr style="background:rgba(16,185,129,.12)">
              <td style="${TD};font-weight:900;color:#10b981;border-bottom:none">COSTO POR m³</td>
              <td style="${TD};border-bottom:none"></td>
              <td style="${TD};text-align:right;font-family:monospace;font-weight:900;color:#10b981;font-size:1.05rem;border-bottom:none">${_cm3S(D.costoM3)}</td>
            </tr>
          </tbody>
        </table></div>
        ${_cm3FotoHtml(D)}
      </div>

      <div class="card">
        <div class="card-head"><span class="card-title">📦 Distribución por área receptora</span></div>
        <div class="card-body">${barras||'<div style="text-align:center;padding:2rem;color:var(--muted2);font-size:.8rem">Sin viajes registrados en el período</div>'}</div>
      </div>
    </div>`}
    ${_cm3Tab==='dia'?_cm3VistaDia():''}
    ${_cm3Tab==='semana'?_cm3VistaSemana():''}
    ${_cm3Tab==='tendencia'?_cm3VistaTendencia():''}`;
}

// ══ SERIES ══════════════════════════════════════════════════════════════════
// Paleta de los gráficos. Validada con el script de la guía contra la superficie
// oscura del ERP (#171d2e): banda de luminosidad, croma, separación para
// daltonismo (ΔE 19.2 protan), visión normal (ΔE 29.0) y contraste ≥ 3:1.
//   · Divergente azul↔rojo con gris neutro al medio: por debajo / por encima
//     del promedio del período. Es lo que responde "qué día salió más caro".
//   · Secuencial de un solo tono (azul, oscuro→claro sobre fondo oscuro) para
//     la matriz semana × área, que codifica magnitud, no identidad.
const _CM3_BAJO='#3987e5';      // por debajo del promedio
const _CM3_ALTO='#e66767';      // por encima del promedio
const _CM3_NEUTRO='#6b85a8';    // sin dato / en el promedio
const _CM3_SEQ=['#184f95','#256abf','#3987e5','#6da7ec','#9ec5f4'];

let _cm3Tab='resumen';                 // resumen | dia | semana | tendencia
let _cm3MatVal=localStorage.getItem('_cm3MatVal')||'m3';   // matriz: m³ o S/
function _cm3SetTab(t){_cm3Tab=t;rCostoM3();}
function _cm3SetMatVal(v){_cm3MatVal=v;localStorage.setItem('_cm3MatVal',v);rCostoM3();}

const _CM3_DIAS=['DOM','LUN','MAR','MIÉ','JUE','VIE','SÁB'];
const _cm3Fechas=per=>{
  const out=[];const d=new Date(per.desde+'T12:00'),f=new Date(per.hasta+'T12:00');
  while(d<=f){out.push(d.toISOString().slice(0,10));d.setDate(d.getDate()+1);}
  return out;
};
const _cm3Dm=iso=>{const[y,m,d]=String(iso).split('-');return d+'/'+m;};

// ── Serie diaria ───────────────────────────────────────────────────────────
// El reparto por día suma exactamente el total del período: las tarifas por
// HM van con las horas del día, las de DÍA con cada día que tuvo parte, y las
// mensuales se prorratean entre los días del período (misma incidencia).
function _cm3Diario(){
  const per=_cm3Periodo();
  const KEY=_cm3Modo==='full'?'full':'seca';
  const fechas=_cm3Fechas(per);
  const dia={};
  fechas.forEach(f=>dia[f]={fecha:f,hm:0,hh:0,m3:0,viajes:0});

  // HM
  const partes=(DB.partes||[]).filter(p=>dia[p.fecha]);
  const eqDias={};
  partes.forEach(p=>{const eq=(DB.equipos||[]).find(e=>+e.id===+p.eqId);if(!eq)return;
    (eqDias[eq.id]=eqDias[eq.id]||new Set()).add(p.fecha);});
  partes.forEach(p=>{
    const eq=(DB.equipos||[]).find(e=>+e.id===+p.eqId);if(!eq)return;
    const t=_ccMatchEq(eq);if(!t)return;
    const un=t.un||eq.tarifaUn||'HM';
    const tar=+t[KEY]||0;
    const nDias=(eqDias[eq.id]||new Set()).size||1;
    let v=0;
    if(un==='HM')v=Math.max(0,+p.ef||0)*tar;
    else if(un==='DIA')v=tar;                       // un día con parte = una unidad
    else v=(tar/per.dias);                          // MES prorrateado por día presente
    // Dos partes el mismo día no deben duplicar la parte fija de DIA/MES
    if(un!=='HM'){
      const mismos=partes.filter(x=>+x.eqId===+eq.id&&x.fecha===p.fecha).length||1;
      v=v/mismos;
    }
    dia[p.fecha].hm+=v;
  });

  // HH · mismo peso por tipo de marca que hhVentaPeriodo, para que la suma de
  // los días dé igual que el total del período (DL cuenta 1, DLT cuenta 2.5)
  const tarPers={};
  hhVentaPeriodo(per.desde,per.hasta).filas.forEach(f=>{tarPers[f.p.id]=f.tarifa;});
  const marca={};
  (DB.tareaje||[]).forEach(t=>{if(dia[t.fecha])marca[t.personalId+'|'+t.fecha]=t.tipo;});
  Object.entries(marca).forEach(([k,tipo])=>{
    const[pid,fecha]=k.split('|');
    const tar=tarPers[pid]||0;if(!tar)return;
    const peso=hhPesoMarca(tipo);
    if(!peso)return;
    dia[fecha].hh+=tar*peso/per.dias;
  });

  // Volumen
  partes.forEach(p=>{
    (p.viajes||[]).forEach(v=>{
      const cant=parseFloat(v.cant)||0;if(!cant)return;
      dia[p.fecha].viajes+=cant;
      if(_cm3MatOk(v.material))dia[p.fecha].m3+=cant*_cm3Cap;
    });
  });

  const pct=_cm3PctDe(per);
  const f=1+(pct.reemb+pct.gg+pct.util)/100;
  // Importes corregidos a mano: los días se escalan en la misma proporción,
  // para que la suma de los días siga dando el total del período
  const aj=_cm3AjusteDe(per);
  const sHm=fechas.reduce((a,fe)=>a+dia[fe].hm,0), sHh=fechas.reduce((a,fe)=>a+dia[fe].hh,0);
  const kHm=aj.hm!=null?(sHm>0?aj.hm/sHm:0):1, kHh=aj.hh!=null?(sHh>0?aj.hh/sHh:0):1;
  if(kHm!==1||kHh!==1)fechas.forEach(fe=>{dia[fe].hm*=kHm;dia[fe].hh*=kHh;});
  const filas=fechas.map(fe=>{
    const d=dia[fe];
    const base=d.hm+d.hh;
    const total=base*f;
    const dow=new Date(fe+'T12:00').getDay();
    return{...d,base,total,costoM3:d.m3>0?total/d.m3:null,
      dow,dowLbl:_CM3_DIAS[dow],finde:dow===0};
  });
  const conDato=filas.filter(r=>r.costoM3!=null);
  const totalTot=filas.reduce((s,r)=>s+r.total,0);
  const m3Tot=filas.reduce((s,r)=>s+r.m3,0);
  // prom        = día típico: promedio simple de los días que sí movieron algo.
  //               Es el punto medio de la escala azul↔rojo del gráfico.
  // promPeriodo = costo del período (ponderado). Sale más alto porque reparte
  //               también el costo de los días sin movimiento.
  const prom=conDato.length?conDato.reduce((a,r)=>a+r.costoM3,0)/conDato.length:0;
  const promPeriodo=m3Tot>0?totalTot/m3Tot:0;
  return{per,filas,conDato,prom,promPeriodo,totalTot,m3Tot,
    max:conDato.length?conDato.reduce((a,b)=>b.costoM3>a.costoM3?b:a):null,
    min:conDato.length?conDato.reduce((a,b)=>b.costoM3<a.costoM3?b:a):null};
}

// ── Matriz semana × área ───────────────────────────────────────────────────
function _cm3Semanal(){
  const D=_cm3Datos();
  const per=D.per;
  const fechas=_cm3Fechas(per);
  const semDe={};
  fechas.forEach((f,i)=>semDe[f]=Math.floor(i/7)+1);
  const nSem=Math.max(...Object.values(semDe));
  const areas={},cel={};
  (DB.partes||[]).forEach(p=>{
    const s=semDe[p.fecha];if(!s)return;
    (p.viajes||[]).forEach(v=>{
      const cant=parseFloat(v.cant)||0;if(!cant)return;
      const m3=_cm3MatOk(v.material)?cant*_cm3Cap:0;
      const a=String(v.destino||'').trim()||'(sin área)';
      areas[a]=(areas[a]||0)+m3;
      const k=s+'|'+a;
      if(!cel[k])cel[k]={m3:0,viajes:0};
      cel[k].m3+=m3;cel[k].viajes+=cant;
    });
  });
  const cols=Object.keys(areas).sort((a,b)=>areas[b]-areas[a]);
  const sems=[];
  for(let s=1;s<=nSem;s++){
    const ds=fechas.filter(f=>semDe[f]===s);
    sems.push({n:s,desde:ds[0],hasta:ds[ds.length-1]});
  }
  return{per,cols,sems,cel,areas,costoM3:D.costoM3,total:D.total,m3:D.vol.m3};
}

// ── Tendencia de los últimos períodos ──────────────────────────────────────
function _cm3Tendencia(n){
  const guardado=_cm3Offset;
  const out=[];
  for(let i=n-1;i>=0;i--){
    _cm3Offset=guardado-i;
    const D=_cm3Datos();
    out.push({label:D.per.label,desde:D.per.desde,hasta:D.per.hasta,
      m3:D.vol.m3,total:D.total,costoM3:D.costoM3,hm:D.hm,hh:D.hh});
  }
  _cm3Offset=guardado;
  return out;
}

// ══ VISTAS ══════════════════════════════════════════════════════════════════
function _cm3TabBar(){
  const b=(t,l)=>{const on=_cm3Tab===t;return`<button onclick="_cm3SetTab('${t}')" style="padding:.4rem 1rem;border:none;border-radius:7px 7px 0 0;cursor:pointer;font-size:.8rem;font-weight:700;background:${on?'#059669':'transparent'};color:${on?'#fff':'var(--muted2)'}">${l}</button>`;};
  return`<div style="display:flex;gap:.2rem;border-bottom:2px solid var(--border);margin-bottom:.9rem;flex-wrap:wrap">
    ${b('resumen','🧮 Resumen')}${b('dia','📅 Costo por Día')}${b('semana','🗓️ Semana × Área')}${b('tendencia','📈 Tendencia')}
  </div>`;
}

// ── Tab: costo por día ─────────────────────────────────────────────────────
function _cm3VistaDia(){
  const T=_cm3Diario();
  if(!T.conDato.length)return`<div class="card"><div class="card-body" style="text-align:center;padding:3rem;color:var(--muted2)">Sin volumen movido en el período: no hay costo por m³ que graficar</div></div>`;
  const maxC=Math.max(...T.conDato.map(r=>r.costoM3));
  const H=190;   // alto del área de barras

  const barras=T.filas.map(r=>{
    const hay=r.costoM3!=null;
    const alto=hay?Math.max(3,Math.round(r.costoM3/maxC*H)):0;
    const sobre=hay&&r.costoM3>T.prom;
    const col=!hay?_CM3_NEUTRO:(sobre?_CM3_ALTO:_CM3_BAJO);
    const esMax=T.max&&r.fecha===T.max.fecha, esMin=T.min&&r.fecha===T.min.fecha;
    const tip=hay
      ?`${r.dowLbl} ${_cm3Dm(r.fecha)} · S/ ${_cm3N(r.costoM3)} por m³\n${_cm3N(r.m3,0)} m³ · ${_cm3N(r.viajes,0)} viajes\nHM ${_cm3S(r.hm)} · HH ${_cm3S(r.hh)}\nTotal del día ${_cm3S(r.total)}`
      :`${r.dowLbl} ${_cm3Dm(r.fecha)} · sin volumen movido${r.total?'\nCosto del día '+_cm3S(r.total)+' (no se reparte)':''}`;
    // Solo se rotulan el día más caro y el más barato: un número en cada barra no se lee
    const rot=(esMax||esMin)
      ?`<div style="position:absolute;bottom:${alto+4}px;left:50%;transform:translateX(-50%);font-size:.58rem;font-weight:800;color:${col};white-space:nowrap;font-family:monospace">${_cm3N(r.costoM3,1)}</div>`:'';
    return`<div title="${_cm3Esc(tip)}" style="flex:1;min-width:0;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;position:relative;height:${H+18}px;cursor:default">
      ${rot}
      <div style="width:calc(100% - 2px);height:${alto}px;background:${hay?col:'transparent'};border:${hay?'none':'1px dashed '+_CM3_NEUTRO+'55'};border-radius:4px 4px 0 0;${esMax||esMin?'outline:2px solid var(--panel);outline-offset:0':''}"></div>
    </div>`;
  }).join('');

  const ejes=T.filas.map(r=>`<div style="flex:1;min-width:0;text-align:center;font-size:.52rem;color:${r.finde?'#e66767':'var(--muted2)'};font-family:monospace;line-height:1.3">${_cm3Dm(r.fecha).slice(0,2)}<br><span style="opacity:.6">${r.dowLbl.slice(0,1)}</span></div>`).join('');
  const yProm=Math.round(T.prom/maxC*H);

  const TD='padding:.35rem .6rem;border-bottom:1px solid var(--border);font-size:.74rem';
  const TH='background:var(--panel2);color:var(--muted2);font-size:.6rem;font-weight:700;text-transform:uppercase;letter-spacing:.06em;padding:.35rem .6rem;position:sticky;top:0';
  const tabla=T.filas.map(r=>{
    const hay=r.costoM3!=null;
    const col=!hay?'var(--muted2)':(r.costoM3>T.prom?_CM3_ALTO:_CM3_BAJO);
    return`<tr>
      <td style="${TD};font-family:monospace">${_cm3Dm(r.fecha)}</td>
      <td style="${TD};color:${r.finde?'#e66767':'var(--muted2)'};font-size:.68rem">${r.dowLbl}</td>
      <td style="${TD};text-align:right;font-family:monospace">${_cm3N(r.m3,0)}</td>
      <td style="${TD};text-align:right;font-family:monospace;color:var(--muted2)">${_cm3N(r.viajes,0)}</td>
      <td style="${TD};text-align:right;font-family:monospace">${_cm3S(r.hm)}</td>
      <td style="${TD};text-align:right;font-family:monospace">${_cm3S(r.hh)}</td>
      <td style="${TD};text-align:right;font-family:monospace;font-weight:700">${_cm3S(r.total)}</td>
      <td style="${TD};text-align:right;font-family:monospace;font-weight:800;color:${col}">${hay?_cm3S(r.costoM3):'—'}</td>
    </tr>`;
  }).join('');

  const tarjeta=(l,r,c)=>`<div style="flex:1;min-width:190px;background:var(--panel2);border:1px solid ${c}55;border-left:3px solid ${c};border-radius:8px;padding:.5rem .7rem">
    <div style="font-size:.6rem;color:var(--muted2);text-transform:uppercase;letter-spacing:.07em;font-weight:700">${l}</div>
    <div style="font-size:1.05rem;font-weight:900;color:${c};font-family:monospace">${r?_cm3S(r.costoM3):'—'}</div>
    <div style="font-size:.68rem;color:var(--muted2)">${r?`${r.dowLbl} ${_cm3Dm(r.fecha)} · ${_cm3N(r.m3,0)} m³`:''}</div>
  </div>`;

  return`
    <div style="display:flex;gap:.6rem;flex-wrap:wrap;margin-bottom:.9rem">
      ${tarjeta('Día más barato',T.min,_CM3_BAJO)}
      ${tarjeta('Día más caro',T.max,_CM3_ALTO)}
      <div style="flex:1;min-width:190px;background:var(--panel2);border:1px solid var(--border);border-left:3px solid ${_CM3_NEUTRO};border-radius:8px;padding:.5rem .7rem">
        <div style="font-size:.6rem;color:var(--muted2);text-transform:uppercase;letter-spacing:.07em;font-weight:700">Día típico</div>
        <div style="font-size:1.05rem;font-weight:900;font-family:monospace">${_cm3S(T.prom)}</div>
        <div style="font-size:.68rem;color:var(--muted2)">${T.conDato.length} de ${T.filas.length} días movieron volumen<br>
          <span title="Reparte también el costo de los días sin movimiento">Costo del período: <b>${_cm3S(T.promPeriodo)}</b></span></div>
      </div>
    </div>

    <div class="card" style="margin-bottom:1rem">
      <div class="card-head" style="flex-wrap:wrap;gap:.5rem">
        <span class="card-title">📅 Costo por m³ de cada día</span>
        <div style="display:flex;gap:.8rem;align-items:center;font-size:.68rem;color:var(--muted2)">
          <span><span style="display:inline-block;width:9px;height:9px;border-radius:2px;background:${_CM3_BAJO};vertical-align:middle;margin-right:.25rem"></span>Bajo el promedio</span>
          <span><span style="display:inline-block;width:9px;height:9px;border-radius:2px;background:${_CM3_ALTO};vertical-align:middle;margin-right:.25rem"></span>Sobre el promedio</span>
          <span><span style="display:inline-block;width:9px;height:9px;border-radius:2px;border:1px dashed ${_CM3_NEUTRO};vertical-align:middle;margin-right:.25rem"></span>Sin volumen</span>
        </div>
      </div>
      <div class="card-body">
        <div style="position:relative;padding-left:52px">
          <div style="position:absolute;left:0;bottom:${18+yProm}px;font-size:.58rem;color:var(--muted2);font-family:monospace;white-space:nowrap">${_cm3N(T.prom,1)} →</div>
          <div style="position:absolute;left:52px;right:0;bottom:${18+yProm}px;border-top:1px dashed var(--muted2);opacity:.45"></div>
          <div style="display:flex;gap:2px;align-items:flex-end">${barras}</div>
          <div style="display:flex;gap:2px;margin-top:.25rem">${ejes}</div>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-head"><span class="card-title">📋 Detalle diario</span></div>
      <div class="card-body" style="padding:0"><div style="max-height:340px;overflow:auto"><table style="width:100%;border-collapse:collapse">
        <thead><tr>
          <th style="${TH};text-align:left">Fecha</th><th style="${TH};text-align:left">Día</th>
          <th style="${TH};text-align:right">m³</th><th style="${TH};text-align:right">Viajes</th>
          <th style="${TH};text-align:right">HM</th><th style="${TH};text-align:right">HH</th>
          <th style="${TH};text-align:right">Total día</th><th style="${TH};text-align:right">S/ por m³</th>
        </tr></thead>
        <tbody>${tabla}</tbody>
      </table></div></div>
    </div>`;
}

// ── Tab: matriz semana × área ──────────────────────────────────────────────
function _cm3VistaSemana(){
  const S=_cm3Semanal();
  if(!S.cols.length)return`<div class="card"><div class="card-body" style="text-align:center;padding:3rem;color:var(--muted2)">Sin viajes registrados en el período</div></div>`;
  const esM3=_cm3MatVal==='m3';
  const valor=c=>esM3?c.m3:c.m3*S.costoM3;
  const fmt=v=>esM3?_cm3N(v,0):_cm3S(v);

  // Escala secuencial de un tono: el paso más oscuro es "casi cero" y se funde
  // con el fondo; el más claro marca el máximo. La cifra va siempre escrita,
  // así que el color acompaña la lectura pero no es la única señal.
  let maxCel=0;
  S.sems.forEach(s=>S.cols.forEach(a=>{const c=S.cel[s.n+'|'+a];if(c)maxCel=Math.max(maxCel,valor(c));}));
  const paso=v=>{
    if(!v)return null;
    const i=Math.min(_CM3_SEQ.length-1,Math.floor(v/maxCel*_CM3_SEQ.length));
    return _CM3_SEQ[Math.max(0,i)];
  };
  const tinta=i=>i>=3?'#0a1330':'#fff';    // los pasos claros piden tinta oscura

  const TD='padding:.4rem .55rem;border-bottom:1px solid var(--border);font-size:.74rem;font-family:monospace;text-align:right';
  const TH='background:var(--panel2);color:var(--muted2);font-size:.6rem;font-weight:700;text-transform:uppercase;letter-spacing:.06em;padding:.4rem .55rem';

  const totCol={},totFila={};
  S.sems.forEach(s=>{totFila[s.n]=0;});
  S.cols.forEach(a=>{totCol[a]=0;});
  S.sems.forEach(s=>S.cols.forEach(a=>{
    const c=S.cel[s.n+'|'+a];if(!c)return;
    const v=valor(c);totFila[s.n]+=v;totCol[a]+=v;
  }));
  const granTotal=Object.values(totFila).reduce((x,y)=>x+y,0);

  const filas=S.sems.map(s=>`<tr>
    <td style="${TD};text-align:left;font-family:inherit;font-weight:700;white-space:nowrap">Semana ${s.n}
      <div style="font-size:.62rem;color:var(--muted2);font-weight:400;font-family:monospace">${_cm3Dm(s.desde)} – ${_cm3Dm(s.hasta)}</div></td>
    ${S.cols.map(a=>{
      const c=S.cel[s.n+'|'+a];
      const v=c?valor(c):0;
      const col=paso(v);
      const idx=col?_CM3_SEQ.indexOf(col):-1;
      const tip=c?`Semana ${s.n} · ${a}\n${_cm3N(c.m3,0)} m³ · ${_cm3N(c.viajes,0)} viajes\n${_cm3S(c.m3*S.costoM3)}`:`Semana ${s.n} · ${a}\nsin movimiento`;
      return`<td title="${_cm3Esc(tip)}" style="${TD};background:${col||'transparent'};color:${col?tinta(idx):'var(--muted)'};font-weight:${col?'700':'400'}">${v?fmt(v):'—'}</td>`;
    }).join('')}
    <td style="${TD};font-weight:800;background:rgba(5,150,105,.10);color:#10b981">${fmt(totFila[s.n])}</td>
  </tr>`).join('');

  return`
    <div style="display:flex;align-items:center;gap:.6rem;flex-wrap:wrap;margin-bottom:.9rem;padding:.5rem .7rem;background:var(--panel2);border:1px solid var(--border);border-radius:8px">
      <span style="font-size:.62rem;color:var(--muted2);font-weight:700;text-transform:uppercase;letter-spacing:.08em">Ver</span>
      ${['m3','costo'].map(k=>{const on=_cm3MatVal===k;return`<button onclick="_cm3SetMatVal('${k}')" style="font-size:.7rem;padding:.24rem .8rem;border-radius:6px;border:1px solid ${on?'#059669':'var(--border)'};background:${on?'#059669':'transparent'};color:${on?'#fff':'var(--muted2)'};cursor:pointer;font-weight:700">${k==='m3'?'m³ movidos':'Costo S/'}</button>`;}).join('')}
      <span style="margin-left:auto;font-size:.7rem;color:var(--muted2)">Intensidad del azul = magnitud · la cifra va siempre escrita</span>
    </div>
    <div class="card">
      <div class="card-head"><span class="card-title">🗓️ ${esM3?'m³ movidos':'Costo'} por semana y área</span></div>
      <div class="card-body" style="padding:0"><div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;min-width:640px">
        <thead><tr>
          <th style="${TH};text-align:left">Semana</th>
          ${S.cols.map(a=>`<th style="${TH};text-align:right">${_cm3Esc(a)}</th>`).join('')}
          <th style="${TH};text-align:right;color:#10b981">Total</th>
        </tr></thead>
        <tbody>${filas}</tbody>
        <tfoot><tr style="background:rgba(5,150,105,.10)">
          <td style="${TD};text-align:left;font-family:inherit;font-weight:900">Total</td>
          ${S.cols.map(a=>`<td style="${TD};font-weight:800">${fmt(totCol[a])}</td>`).join('')}
          <td style="${TD};font-weight:900;color:#10b981">${fmt(granTotal)}</td>
        </tr></tfoot>
      </table></div></div>
    </div>`;
}

// ── Tab: tendencia entre períodos ──────────────────────────────────────────
function _cm3VistaTendencia(){
  const T=_cm3Tendencia(6);
  const conDato=T.filter(p=>p.costoM3>0);
  if(!conDato.length)return`<div class="card"><div class="card-body" style="text-align:center;padding:3rem;color:var(--muted2)">Sin datos en los últimos 6 períodos</div></div>`;
  const maxC=Math.max(...conDato.map(p=>p.costoM3));
  const prom=conDato.reduce((s,p)=>s+p.costoM3,0)/conDato.length;
  const H=170;
  const act=T[T.length-1],ant=T[T.length-2];
  const dif=(ant&&ant.costoM3>0&&act.costoM3>0)?(act.costoM3-ant.costoM3)/ant.costoM3*100:null;

  const barras=T.map((p,i)=>{
    const hay=p.costoM3>0;
    const alto=hay?Math.max(3,Math.round(p.costoM3/maxC*H)):0;
    const col=!hay?_CM3_NEUTRO:(p.costoM3>prom?_CM3_ALTO:_CM3_BAJO);
    const ultimo=i===T.length-1;
    const tip=`${p.label}\n${hay?'S/ '+_cm3N(p.costoM3)+' por m³':'sin volumen'}\n${_cm3N(p.m3,0)} m³ · ${_cm3S(p.total)}`;
    return`<div title="${_cm3Esc(tip)}" style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:${H+22}px;position:relative">
      <div style="position:absolute;bottom:${alto+4}px;font-size:.64rem;font-weight:800;color:${col};font-family:monospace;white-space:nowrap">${hay?_cm3N(p.costoM3,1):'—'}</div>
      <div style="width:76%;height:${alto}px;background:${hay?col:'transparent'};border:${hay?'none':'1px dashed '+_CM3_NEUTRO+'55'};border-radius:4px 4px 0 0;${ultimo?'outline:2px solid var(--panel);box-shadow:0 0 0 2px #05966988':''}"></div>
    </div>`;
  }).join('');
  const ejes=T.map((p,i)=>`<div style="flex:1;text-align:center;font-size:.62rem;color:${i===T.length-1?'#10b981':'var(--muted2)'};font-weight:${i===T.length-1?'800':'400'}">${p.label}</div>`).join('');

  const TD='padding:.4rem .6rem;border-bottom:1px solid var(--border);font-size:.76rem';
  const TH='background:var(--panel2);color:var(--muted2);font-size:.6rem;font-weight:700;text-transform:uppercase;letter-spacing:.06em;padding:.4rem .6rem';

  return`
    ${dif!=null?`<div style="margin-bottom:.9rem;padding:.6rem .8rem;background:${dif<0?'rgba(57,135,229,.10)':'rgba(230,103,103,.10)'};border:1px solid ${dif<0?_CM3_BAJO:_CM3_ALTO}55;border-radius:8px;font-size:.82rem">
      <b style="color:${dif<0?_CM3_BAJO:_CM3_ALTO}">${dif<0?'▼':'▲'} ${Math.abs(dif).toFixed(1)} %</b>
      <span style="color:var(--muted2)"> respecto al período anterior · de ${_cm3S(ant.costoM3)} a ${_cm3S(act.costoM3)} por m³</span>
    </div>`:''}
    <div class="card" style="margin-bottom:1rem">
      <div class="card-head"><span class="card-title">📈 Costo por m³ · últimos 6 períodos</span>
        <span style="font-size:.68rem;color:var(--muted2)">línea punteada = promedio ${_cm3S(prom)}</span></div>
      <div class="card-body">
        <div style="position:relative">
          <div style="position:absolute;left:0;right:0;bottom:${22+Math.round(prom/maxC*H)}px;border-top:1px dashed var(--muted2);opacity:.45"></div>
          <div style="display:flex;gap:10px;align-items:flex-end">${barras}</div>
          <div style="display:flex;gap:10px;margin-top:.35rem">${ejes}</div>
        </div>
      </div>
    </div>
    <div class="card">
      <div class="card-head"><span class="card-title">📋 Detalle por período</span></div>
      <div class="card-body" style="padding:0"><table style="width:100%;border-collapse:collapse">
        <thead><tr><th style="${TH};text-align:left">Período</th><th style="${TH};text-align:right">HM</th>
          <th style="${TH};text-align:right">HH</th><th style="${TH};text-align:right">Total</th>
          <th style="${TH};text-align:right">m³</th><th style="${TH};text-align:right">S/ por m³</th></tr></thead>
        <tbody>${T.map((p,i)=>`<tr${i===T.length-1?' style="background:rgba(5,150,105,.08)"':''}>
          <td style="${TD};font-weight:${i===T.length-1?'800':'400'}">${p.label}</td>
          <td style="${TD};text-align:right;font-family:monospace">${_cm3S(p.hm)}</td>
          <td style="${TD};text-align:right;font-family:monospace">${_cm3S(p.hh)}</td>
          <td style="${TD};text-align:right;font-family:monospace;font-weight:700">${_cm3S(p.total)}</td>
          <td style="${TD};text-align:right;font-family:monospace">${_cm3N(p.m3,0)}</td>
          <td style="${TD};text-align:right;font-family:monospace;font-weight:800;color:${p.costoM3>prom?_CM3_ALTO:_CM3_BAJO}">${p.costoM3>0?_cm3S(p.costoM3):'—'}</td>
        </tr>`).join('')}</tbody>
      </table></div>
    </div>`;
}
