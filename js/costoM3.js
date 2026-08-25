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

const _CM3_PCT_DEF={reemb:15,gg:12,util:9.35};
const _cm3Ls=(k,def)=>{const v=localStorage.getItem('_cm3'+k);return v===null?def:(+v||0);};
let _cm3Offset=0;
let _cm3Cap  =+localStorage.getItem('_amtCapM3')||12;      // comparte capacidad con Avance MT
let _cm3Reemb=_cm3Ls('Reemb',_CM3_PCT_DEF.reemb);
let _cm3Gg   =_cm3Ls('Gg',   _CM3_PCT_DEF.gg);
let _cm3Util =_cm3Ls('Util', _CM3_PCT_DEF.util);
let _cm3Modo =localStorage.getItem('_cm3Modo')||'seca';    // tarifa seca | full

const _cm3N=(v,d)=>Number(v||0).toLocaleString('es-PE',{minimumFractionDigits:d==null?2:d,maximumFractionDigits:d==null?2:d});
const _cm3S=v=>'S/ '+_cm3N(v);
const _cm3Esc=s=>String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
// Material válido = no vacío y distinto de "SIN MATERIAL": ese viaje es un
// traslado, cuenta como viaje pero no mueve volumen. Mismo criterio que Avance MT.
const _cm3MatOk=m=>{const s=String(m||'').trim();return !!s&&!/^sin\s*material/i.test(s);};

function _cm3Set(k,v){
  if(k==='cap'){_cm3Cap=Math.max(1,+v||12);localStorage.setItem('_amtCapM3',_cm3Cap);if(typeof _amtCapM3!=='undefined')_amtCapM3=_cm3Cap;}
  else if(k==='reemb'){_cm3Reemb=Math.max(0,+v||0);localStorage.setItem('_cm3Reemb',_cm3Reemb);}
  else if(k==='gg'){_cm3Gg=Math.max(0,+v||0);localStorage.setItem('_cm3Gg',_cm3Gg);}
  else if(k==='util'){_cm3Util=Math.max(0,+v||0);localStorage.setItem('_cm3Util',_cm3Util);}
  rCostoM3();
}
function _cm3SetModo(m){_cm3Modo=m;localStorage.setItem('_cm3Modo',m);rCostoM3();}
function _cm3Restaurar(){
  _cm3Reemb=_CM3_PCT_DEF.reemb;_cm3Gg=_CM3_PCT_DEF.gg;_cm3Util=_CM3_PCT_DEF.util;
  localStorage.setItem('_cm3Reemb',_cm3Reemb);localStorage.setItem('_cm3Gg',_cm3Gg);localStorage.setItem('_cm3Util',_cm3Util);
  rCostoM3();
}
function _cm3Nav(d){_cm3Offset+=d;rCostoM3();}

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
function _cm3Personal(per){
  const personal=(DB.personal||[]).filter(p=>(p.est||'').toLowerCase()==='activo'||(p.est||'')==='');
  const tj=(DB.tareaje||[]).filter(t=>t.fecha>=per.desde&&t.fecha<=per.hasta&&['TD','TN','A5'].includes(t.tipo||''));
  const map={},sinTarifa=new Set();
  tj.forEach(t=>{
    const p=personal.find(x=>+x.id===+t.personalId);if(!p)return;
    const tar=_ccMatchHH(p.cargo);
    if(!tar){sinTarifa.add(p.cargo||'(sin cargo)');return;}
    if(!map[p.id])map[p.id]={persona:p,dias:0,tarifa:tar};
    map[p.id].dias++;
  });
  const filas=Object.values(map).map(r=>{
    const costoDia=per.dias>0?r.tarifa.mes/per.dias:0;
    return{...r,costoDia,venta:costoDia*r.dias};
  }).sort((a,b)=>b.venta-a.venta);
  return{filas,sinTarifa:[...sinTarifa]};
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

// ── Consolidado ────────────────────────────────────────────────────────────
function _cm3Datos(){
  const per=_cm3Periodo();
  const KEY=_cm3Modo==='full'?'full':'seca';
  const eqRows=_cm3Equipos(per,KEY);
  const{filas:hhRows,sinTarifa}=_cm3Personal(per);
  const vol=_cm3Volumen(per);

  const hm=eqRows.reduce((s,r)=>s+r.venta,0);
  const hh=hhRows.reduce((s,r)=>s+r.venta,0);
  const base=hm+hh;
  const reemb=base*_cm3Reemb/100;
  const gg=base*_cm3Gg/100;
  const util=base*_cm3Util/100;
  const total=base+reemb+gg+util;
  const costoM3=vol.m3>0?total/vol.m3:0;
  const costoViaje=vol.viajes>0?total/vol.viajes:0;

  return{per,KEY,eqRows,hhRows,sinTarifa,vol,hm,hh,base,reemb,gg,util,total,costoM3,costoViaje};
}

// ── Pantalla ───────────────────────────────────────────────────────────────
function rCostoM3(){
  const pg=document.getElementById('page-costoM3');if(!pg)return;
  const D=_cm3Datos();
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
  const pctFila=(lbl,campo,valPct,val,color)=>`<tr>
    <td style="${TD};color:${color}">${lbl}</td>
    <td style="${TD};color:var(--muted2);font-size:.72rem">
      <input type="number" step="0.01" min="0" value="${valPct}" onchange="_cm3Set('${campo}',this.value)" style="${inp}"> %
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
      <button onclick="_cm3Restaurar()" style="margin-left:auto;font-size:.7rem;padding:.24rem .7rem;border-radius:6px;border:1px solid var(--border);background:transparent;color:var(--muted2);cursor:pointer" title="Volver a 15 % · 12 % · 9.35 %">↺ Porcentajes por defecto</button>
    </div>

    <div class="kpi-row">${kpis.map(k=>`<div class="kpi" style="--kc:${k.c}"><div class="kpi-lbl">${k.l}</div><div class="kpi-val" style="font-size:${String(k.v).length>12?'1.15rem':'1.6rem'}">${k.v}</div></div>`).join('')}</div>

    ${avisos.length?`<div style="margin-bottom:.9rem;padding:.5rem .7rem;background:rgba(245,158,11,.08);border:1px solid rgba(245,158,11,.35);border-radius:8px;font-size:.74rem;color:#fbbf24;line-height:1.7">
      ${avisos.map(a=>'⚠ '+a).join('<br>')}
    </div>`:''}

    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(430px,1fr));gap:1rem">
      <div class="card">
        <div class="card-head"><span class="card-title">🧮 Composición del costo</span></div>
        <div class="card-body" style="padding:0"><table style="width:100%;border-collapse:collapse">
          <thead><tr><th style="${TH};text-align:left">Concepto</th><th style="${TH};text-align:left">Detalle</th><th style="${TH};text-align:right">Importe</th></tr></thead>
          <tbody>
            ${linea('Horas Máquina (HM)',`${D.eqRows.length} equipo(s) · tarifa ${D.KEY==='full'?'full':'seca'}`,D.hm,'#f59e0b')}
            ${linea('Horas Hombre (HH)',`${D.hhRows.length} persona(s) · ${per.dias} días`,D.hh,'#8b5cf6')}
            ${linea('Sub Total (HM + HH)','base de los porcentajes',D.base,'var(--text)',true)}
            ${pctFila('Reembolsables','reemb',_cm3Reemb,D.reemb,'#06b6d4')}
            ${pctFila('Gastos Generales','gg',_cm3Gg,D.gg,'#ef4444')}
            ${pctFila('Utilidad','util',_cm3Util,D.util,'#10b981')}
            <tr style="background:rgba(5,150,105,.10)">
              <td style="${TD};font-weight:900;color:${AC}">TOTAL DEL PERÍODO</td>
              <td style="${TD};color:var(--muted2);font-size:.72rem">${_cm3N(_cm3Reemb+_cm3Gg+_cm3Util,2)} % sobre la base</td>
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
      </div>

      <div class="card">
        <div class="card-head"><span class="card-title">📦 Distribución por área receptora</span></div>
        <div class="card-body">${barras||'<div style="text-align:center;padding:2rem;color:var(--muted2);font-size:.8rem">Sin viajes registrados en el período</div>'}</div>
      </div>
    </div>`;
}
