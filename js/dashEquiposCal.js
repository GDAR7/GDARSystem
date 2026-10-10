// ══════════════════════════════════════════════════════════════════════════
//  DASHBOARD DE EQUIPOS · PESTAÑA CALENDARIO
//
//  El corte 21→20 día por día, con los mismos filtros del Dashboard
//  (Tipo → Subtipo → Código). Cada tipo se mide con lo que le corresponde:
//    · Línea Amarilla y Línea Blanca → horas efectivas
//    · Vehículo Menor                → kilómetros recorridos
//    · Equipos Menores               → operatividad diaria: de los equipos que
//                                      tuvieron parte ese día, cuántos estaban
//                                      operativos (el stand-by cuenta como
//                                      operativo: el equipo estaba sano)
//  Con «Todos» se muestran Línea Amarilla + Línea Blanca, que son las dos que
//  se miden en horas: mezclar horas, km y % no tendría sentido.
//
//  Cada celda lleva una barrita repartida por el nivel siguiente del filtro:
//  sin tipo → por línea; con tipo → por subtipo; con subtipo → por equipo;
//  con equipo → por turno (o por condición, en equipos menores).
//
//  Prefijo _dqc. rDashEquipos (reportesEquipos.js) lo llama con los partes ya
//  filtrados, así que filtros y período son los mismos de la otra pestaña.
// ══════════════════════════════════════════════════════════════════════════

let _dqcSel=null;                                   // día elegido (ISO) o null
const _DQC_DN=['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'];
const _DQC_MES=['ene','feb','mar','abr','may','jun','jul','ago','set','oct','nov','dic'];
const _DQC_PAL=['#06b6d4','#f59e0b','#8b5cf6','#10b981','#ef4444','#ec4899','#84cc16','#f97316','#3b82f6','#14b8a6','#a78bfa','#eab308'];
const _DQC_RGB={'Línea Amarilla':'245,158,11','Línea Blanca':'6,182,212','Vehículo Menor':'129,140,248'};

const _dqcEsc=s=>String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const _dqcIso=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const _dqcF1=v=>Number(v||0).toLocaleString('es-PE',{minimumFractionDigits:1,maximumFractionDigits:1});
const _dqcF0=v=>Number(v||0).toLocaleString('es-PE',{maximumFractionDigits:0});

// Qué se mide según el tipo elegido
function _dqcModo(tipo){
  if(tipo==='Vehículo Menor')return'km';
  if(tipo==='Equipos Menores')return'oper';
  return'horas';
}
// Kilómetros de un parte: el recorrido registrado; si falta, fin − inicio
function _dqcKm(p){
  const r=+p.kmRec;
  if(r>0)return r;
  const d=(+p.kmFin||0)-(+p.kmIni||0);
  return d>0?d:0;
}
// Un parte inoperativo (incluye el mixto «OPERATIVO/INOPERATIVO»: hubo falla)
function _dqcInop(p){return /INOPERATIVO/i.test(String(p.condicion||''));}
function _dqcSelDia(f){_dqcSel=(_dqcSel===f)?null:f;rDashEquipos();}

// Valor a mostrar en los chips de filtro, según el tipo
function _dqcChipVal(tipo,nodo){
  const m=_dqcModo(tipo);
  if(m==='km')return _dqcF0(nodo.km||0)+' km';
  if(m==='oper'){
    const v=Object.values(nodo.od||{});
    return v.length?Math.round(v.filter(x=>!x).length/v.length*100)+'% oper.':'—';
  }
  return _dqcF1(nodo.ef||0)+' h';
}

// ── El cálculo ──────────────────────────────────────────────────────────────
// ctx: {partes, per, tipo, sub, eqId, eqById}
function _dqcDatos(ctx){
  const modo=_dqcModo(ctx.tipo);
  let partes=ctx.partes;
  if(!ctx.tipo)partes=partes.filter(p=>{
    const e=ctx.eqById(p.eqId);
    return e&&(e.tipo==='Línea Amarilla'||e.tipo==='Línea Blanca');
  });
  // El nivel siguiente al filtro: así se reparte cada día
  const grupo=p=>{
    const e=ctx.eqById(p.eqId)||{};
    if(ctx.eqId){
      if(modo==='oper')return _dqcInop(p)?'Inoperativo':'Operativo';
      return /noche/i.test(p.turno||'')?'🌙 Noche':'☀ Día';
    }
    if(ctx.sub)return e.codigo||('#'+p.eqId);
    if(ctx.tipo)return String(e.sub||'Otros').toUpperCase();
    return e.tipo||'Otros';
  };

  const dias=[];
  for(const d=new Date(ctx.per.ini.getTime());d<=ctx.per.fin;d.setDate(d.getDate()+1))dias.push(_dqcIso(d));
  const map={};
  dias.forEach(f=>{map[f]={v:0,g:{},eqs:{}};});
  partes.forEach(p=>{
    const m=map[p.fecha];if(!m)return;
    const g=grupo(p);
    if(modo==='oper'){
      // Por equipo y día: basta un parte inoperativo para que el día cuente así
      const inop=_dqcInop(p);
      m.eqs[p.eqId]=!!(m.eqs[p.eqId]||inop);
      m.g[g]=m.g[g]||{};
      m.g[g][p.eqId]=!!(m.g[g][p.eqId]||inop);
    }else{
      const v=modo==='km'?_dqcKm(p):Math.max(0,+p.ef||0);
      m.v+=v;m.g[g]=(m.g[g]||0)+v;
    }
  });
  // Operatividad del día: operativos ÷ equipos con parte
  if(modo==='oper')dias.forEach(f=>{
    const m=map[f], v=Object.values(m.eqs);
    m.n=v.length;m.op=v.filter(x=>!x).length;
    m.v=m.n?m.op/m.n*100:0;
  });

  // Totales de los grupos en todo el corte (orden y color estables)
  const tg={};
  dias.forEach(f=>Object.entries(map[f].g).forEach(([g,x])=>{
    if(modo==='oper'){
      const v=Object.values(x);
      const o=(tg[g]=tg[g]||{n:0,op:0});o.n+=v.length;o.op+=v.filter(z=>!z).length;
    }else tg[g]=(tg[g]||0)+x;
  }));
  const orden=Object.keys(tg).sort((a,b)=>modo==='oper'?(tg[b].n-tg[a].n):(tg[b]-tg[a]));
  const color={};
  orden.forEach((g,i)=>{
    color[g]=g==='Inoperativo'?'#ef4444':g==='Operativo'?'#10b981'
      :g==='☀ Día'?'#f59e0b':g==='🌙 Noche'?'#6366f1':_DQC_PAL[i%_DQC_PAL.length];
  });

  return{modo,dias,map,tg,orden,color,eqsConParte:new Set(partes.map(p=>p.eqId)).size};
}

// ── La pestaña ──────────────────────────────────────────────────────────────
function _dqcHtml(ctx){
  const D=_dqcDatos(ctx), M=D.modo;
  const und=M==='km'?' km':M==='oper'?'%':' h';
  const fmtV=v=>M==='km'?_dqcF0(v)+' km':M==='oper'?Math.round(v)+'%':_dqcF1(v)+' h';
  const conDato=D.dias.filter(f=>M==='oper'?D.map[f].n>0:D.map[f].v>0);
  if(_dqcSel&&!D.map[_dqcSel])_dqcSel=null;

  // KPIs
  let kpis;
  if(M==='oper'){
    const n=conDato.reduce((s,f)=>s+D.map[f].n,0), op=conDato.reduce((s,f)=>s+D.map[f].op,0);
    const peor=conDato.reduce((a,f)=>(!a||D.map[f].v<D.map[a].v)?f:a,null);
    kpis=[
      {l:'Operatividad del corte',v:n?Math.round(op/n*100)+'%':'—',c:'#10b981'},
      {l:'Días con parte',v:conDato.length,c:'#06b6d4'},
      {l:'Equipos con parte',v:D.eqsConParte,c:'#8b5cf6'},
      {l:'Equipo-días inoperativos',v:n-op,c:'#ef4444'},
      {l:'Peor día',v:peor?peor.slice(8)+'/'+peor.slice(5,7)+' · '+Math.round(D.map[peor].v)+'%':'—',c:'#f59e0b'}
    ];
  }else{
    const total=conDato.reduce((s,f)=>s+D.map[f].v,0);
    const pico=conDato.reduce((a,f)=>(!a||D.map[f].v>D.map[a].v)?f:a,null);
    kpis=[
      {l:M==='km'?'Km recorridos':'Hs efectivas',v:fmtV(total),c:M==='km'?'#818cf8':'#06b6d4'},
      {l:'Días con parte',v:conDato.length,c:'#06b6d4'},
      {l:'Promedio por día',v:conDato.length?fmtV(total/conDato.length):'—',c:'#10b981'},
      {l:'Día pico',v:pico?pico.slice(8)+'/'+pico.slice(5,7)+' · '+fmtV(D.map[pico].v):'—',c:'#f59e0b'},
      {l:'Equipos con parte',v:D.eqsConParte,c:'#8b5cf6'}
    ];
  }
  const kpiHtml=`<div class="kpi-row">${kpis.map(k=>`<div class="kpi" style="--kc:${k.c}"><div class="kpi-lbl">${k.l}</div><div class="kpi-val" style="font-size:${String(k.v).length>10?'1.1rem':'1.6rem'}">${k.v}</div></div>`).join('')}</div>`;

  // Celdas
  const max=Math.max(1,...D.dias.map(f=>D.map[f].v));
  const rgb=_DQC_RGB[ctx.tipo]||'6,182,212';
  const semaforo=v=>v>=90?'16,185,129':v>=75?'245,158,11':'239,68,68';
  const lead=(ctx.per.ini.getDay()+6)%7;
  let celdas='';
  for(let i=0;i<lead;i++)celdas+='<div></div>';
  D.dias.forEach(f=>{
    const m=D.map[f], tiene=M==='oper'?m.n>0:m.v>0;
    const d=new Date(f+'T12:00:00');
    const bg=!tiene?'var(--panel2)'
      :M==='oper'?`rgba(${semaforo(m.v)},.26)`
      :`rgba(${rgb},${(0.10+0.42*m.v/max).toFixed(3)})`;
    const sel=_dqcSel===f;
    let barras='';
    if(tiene){
      if(M==='oper'){
        barras=`<i style="flex:${m.op};background:#10b981"></i><i style="flex:${m.n-m.op};background:#ef4444"></i>`;
      }else{
        barras=Object.entries(m.g).sort((a,b)=>b[1]-a[1])
          .map(([g,v])=>`<i style="flex:${v.toFixed(2)};background:${D.color[g]}"></i>`).join('');
      }
    }
    const valor=!tiene?'<span style="color:var(--muted);font-weight:400">—</span>'
      :M==='oper'?`${Math.round(m.v)}% <span style="font-size:.62rem;color:var(--muted2);font-weight:600">${m.op}/${m.n}</span>`
      :fmtV(m.v).replace(und,'');
    celdas+=`<div onclick="_dqcSelDia('${f}')" title="${f}" style="cursor:pointer;min-width:0;min-height:74px;display:flex;flex-direction:column;gap:.3rem;padding:.4rem .5rem;border-radius:8px;background:${bg};border:${sel?'2px solid var(--text)':'1px solid var(--border)'}">
      <div style="display:flex;justify-content:space-between;align-items:baseline">
        <b style="font-family:monospace;font-size:.72rem;color:var(--muted2)">${String(d.getDate()).padStart(2,'0')}</b>
        <span style="font-size:.55rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--muted)">${_DQC_MES[d.getMonth()]}</span>
      </div>
      <div style="font-family:monospace;font-weight:800;font-size:.95rem">${valor}</div>
      ${tiene?`<div style="display:flex;gap:2px;height:5px;margin-top:auto;border-radius:3px;overflow:hidden">${barras}</div>`:''}
    </div>`;
  });

  // Detalle: el día elegido o el acumulado del corte
  const dia=_dqcSel;
  const pares=dia
    ?Object.entries(D.map[dia].g).map(([g,x])=>M==='oper'
      ?[g,{n:Object.keys(x).length,op:Object.values(x).filter(z=>!z).length}]:[g,x])
    :D.orden.map(g=>[g,D.tg[g]]);
  let filas,tot;
  if(M==='oper'){
    pares.sort((a,b)=>b[1].n-a[1].n);
    const n=pares.reduce((s,p)=>s+p[1].n,0), op=pares.reduce((s,p)=>s+p[1].op,0);
    tot=n?Math.round(op/n*100)+'% operativo':'—';
    filas=pares.map(([g,x])=>{
      const pct=x.n?x.op/x.n*100:0;
      return`<tr><td style="padding:.4rem .5rem"><span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:${D.color[g]||'#64748b'};margin-right:.4rem"></span>${_dqcEsc(g)}</td>
        <td style="padding:.4rem .5rem;width:34%"><div style="height:6px;border-radius:3px;background:var(--panel2);overflow:hidden;display:flex"><i style="flex:${x.op};background:#10b981"></i><i style="flex:${x.n-x.op};background:#ef4444"></i></div></td>
        <td style="padding:.4rem .5rem;text-align:right;font-family:monospace">${x.op} / ${x.n}</td>
        <td style="padding:.4rem .5rem;text-align:right;font-family:monospace;font-weight:700;color:rgb(${semaforo(pct)})">${Math.round(pct)}%</td></tr>`;
    }).join('');
  }else{
    pares.sort((a,b)=>b[1]-a[1]);
    const total=pares.reduce((s,p)=>s+p[1],0), mx=Math.max(1,...pares.map(p=>p[1]));
    tot=fmtV(total);
    filas=pares.map(([g,v])=>`<tr><td style="padding:.4rem .5rem"><span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:${D.color[g]};margin-right:.4rem"></span>${_dqcEsc(g)}</td>
      <td style="padding:.4rem .5rem;width:34%"><div style="height:6px;border-radius:3px;background:var(--panel2);overflow:hidden"><i style="display:block;height:100%;width:${(100*v/mx).toFixed(1)}%;background:${D.color[g]}"></i></div></td>
      <td style="padding:.4rem .5rem;text-align:right;font-family:monospace">${fmtV(v)}</td>
      <td style="padding:.4rem .5rem;text-align:right;font-family:monospace;color:var(--muted2)">${total?(100*v/total).toFixed(1):'0.0'}%</td></tr>`).join('');
  }
  const tituloDet=dia?(()=>{const d=new Date(dia+'T12:00:00');
    return ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'][d.getDay()]+' '+d.getDate()+' de '+_DQC_MES[d.getMonth()];})()
    :'Acumulado del corte';

  const queMide=M==='km'?'Kilómetros recorridos':M==='oper'?'Operatividad diaria':'Horas efectivas';
  const alcance=!ctx.tipo?'Línea Amarilla + Línea Blanca':'';
  const leyenda=M==='oper'
    ?`<span style="display:inline-flex;gap:.6rem;align-items:center;font-size:.64rem;color:var(--muted2)"><span>■ <span style="color:#10b981">≥90%</span></span><span>■ <span style="color:#f59e0b">75–89%</span></span><span>■ <span style="color:#ef4444">&lt;75%</span></span></span>`
    :`<span style="display:inline-flex;gap:.25rem;align-items:center;font-size:.64rem;color:var(--muted2)">menos ${[1,2,3,4,5].map(i=>`<i style="display:block;width:14px;height:10px;border-radius:2px;background:rgba(${rgb},${(0.12+i*0.1).toFixed(2)})"></i>`).join('')} más</span>`;

  // KPIs aparte: el Dashboard los pone arriba de los filtros, como en Resumen
  return{kpis:kpiHtml,cuerpo:`
    <div class="card" style="margin-bottom:1rem">
      <div class="card-head" style="flex-wrap:wrap;gap:.5rem">
        <span class="card-title">📅 ${queMide} — <span style="color:#06b6d4">${_dqcEsc(ctx.titulo)}</span>${alcance?` <span style="font-size:.68rem;color:var(--muted2)">(${alcance})</span>`:''}</span>
        ${leyenda}
      </div>
      <div class="card-body">
        <div style="display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:6px;margin-bottom:6px">${_DQC_DN.map(d=>`<span style="text-align:center;font-size:.6rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--muted)">${d}</span>`).join('')}</div>
        <div style="display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:6px">${celdas}</div>
      </div>
    </div>
    <div class="card">
      <div class="card-head"><span class="card-title">${tituloDet}</span><span style="font-family:monospace;font-weight:800;color:#06b6d4">${tot}</span></div>
      <div class="card-body" style="padding:0">
        <table style="width:100%;border-collapse:collapse;font-size:.78rem">
          <tbody>${filas||`<tr><td style="padding:1.2rem;text-align:center;color:var(--muted2)">Sin partes ${dia?'ese día':'en el corte'} con este filtro</td></tr>`}</tbody>
        </table>
        ${dia?'':'<div style="padding:.5rem .8rem;font-size:.68rem;color:var(--muted2)">Toque un día del calendario para ver su desglose.</div>'}
      </div>
    </div>`};
}
