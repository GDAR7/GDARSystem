// ══════════════════════════════════════════════════════════════════════════
//  CORTE 21→20 — tab del Resumen Diario de Tareaje
//  Análisis de ausencias del corte (del 21 al 20, lleva el nombre del mes en
//  que cierra): asistencia, dotación diaria, faltas por día y los rankings de
//  quiénes faltan más, permisos, descansos médicos y licencias. La matriz
//  día a día no va aquí: ya está en el módulo Tareaje.
//  La agrupación se elige en la misma pestaña: Guardia · Staff/Obrero · Categoría · Cargo.
//  Usa la fecha (define el corte), el proyecto y la guardia de la cabecera.
//
//  Reglas:
//   · En obra = TD, TN, DLT, A5 · Día libre = DL · Ausencias = F, DM, P, V, LP, LM, LF
//   · Asistencia = días en obra ÷ días programados (en obra + ausencias; el DL no cuenta)
//   · Jornadas venta = misma regla de HH Venta: TD, TN, A5 y DL = 1 · DLT = 2.5
//   · Solo se cuenta hasta hoy: los días futuros ya cargados no entran.
//   · El tareo no guarda horas, por eso aquí no hay HH ni horas extras.
// ══════════════════════════════════════════════════════════════════════════

const _TC_OBRA=['TD','TN','DLT','A5'];
const _TC_LIBRE=['DL'];
const _TC_AUS=['F','DM','P','V','LP','LM','LF'];
const _TC_VENTA={TD:1,TN:1,A5:1,DL:1,DLT:2.5};
const _TC_MES=['enero','febrero','marzo','abril','mayo','junio','julio','agosto','setiembre','octubre','noviembre','diciembre'];
const _TC_PALETA=['#10b981','#3b82f6','#f59e0b','#a855f7','#06b6d4','#ec4899','#84cc16','#f97316'];
const _TC_AGRUP=[
  {k:'guardia',l:'Guardia'},
  {k:'tipo',l:'Staff / Obrero'},
  {k:'cat',l:'Categoría'},
  {k:'cargo',l:'Cargo'}
];

let _tcAgrup='guardia';
let _tcQ='';
let _tcSel=null;          // id del trabajador abierto en la ficha

function _tcEsc(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function _tcIso(d){return d.getUTCFullYear()+'-'+String(d.getUTCMonth()+1).padStart(2,'0')+'-'+String(d.getUTCDate()).padStart(2,'0');}
function _tcPct(n){return (n==null?'—':(100*n).toFixed(0)+'%');}
function _tcColAsis(a){return a==null?'var(--muted2)':a>=.95?'#10b981':a>=.85?'#f59e0b':'#ef4444';}

// Corte que contiene la fecha: del 21 del mes anterior al 20 del mes (o del 21 al 20 siguiente)
function _tcCorte(fecha){
  const [y,m,d]=String(fecha).split('-').map(Number);
  const cierre=d>=21?new Date(Date.UTC(y,m,20)):new Date(Date.UTC(y,m-1,20));
  const ini=new Date(Date.UTC(cierre.getUTCFullYear(),cierre.getUTCMonth()-1,21));
  const dias=[];
  for(let t=new Date(ini);t<=cierre;t.setUTCDate(t.getUTCDate()+1))dias.push(_tcIso(t));
  return{desde:dias[0],hasta:dias[dias.length-1],dias,
    nombre:'Corte '+_TC_MES[cierre.getUTCMonth()]+' '+cierre.getUTCFullYear()};
}

// Mueve la fecha de la cabecera al corte anterior / siguiente
function _tcMover(n){
  const el=document.getElementById('tarPgFecha');if(!el)return;
  const c=_tcCorte(el.value||today());
  const [y,m]=c.hasta.split('-').map(Number);
  el.value=_tcIso(new Date(Date.UTC(y,m-1+n,20)));
  _tcSel=null;rTarCorte();
}

function _tcNombre(p){return [p.ape,p.nom].filter(Boolean).join(', ')||('#'+p.id);}
function _tcGuardia(p){const g=String(p.guardia||'').trim().toUpperCase();return ['A','B','C'].includes(g)?g:'—';}
function _tcGrupoDe(p,agrup){
  if(agrup==='guardia'){const g=_tcGuardia(p);return g==='—'?'Sin guardia':'Guardia '+g;}
  if(agrup==='tipo')return p.tipo==='Staff'?'Staff':'Obrero';
  if(agrup==='cat')return String(p.cat||'').trim()||'Sin categoría';
  return String(p.cargo||'').trim().toUpperCase()||'SIN CARGO';
}
function _tcOrdenGrupos(nombres,agrup){
  const fijo={guardia:['Guardia A','Guardia B','Guardia C','Sin guardia'],tipo:['Staff','Obrero']}[agrup];
  if(fijo)return fijo.filter(g=>nombres.includes(g));
  if(agrup==='cargo'&&typeof _gdOrdenIdx==='function')
    return [...nombres].sort((a,b)=>_gdOrdenIdx(a)-_gdOrdenIdx(b)||a.localeCompare(b,'es'));
  return [...nombres].sort((a,b)=>(a.startsWith('Sin ')?1:0)-(b.startsWith('Sin ')?1:0)||a.localeCompare(b,'es'));
}

// ── Datos ────────────────────────────────────────────────────────────────
//  o: {fecha, proy, guardia, hoy, agrup, q}
function _tcDatos(o){
  const C=_tcCorte(o.fecha);
  const hoy=o.hoy||today();
  const corteHasta=C.hasta<hoy?C.hasta:hoy;           // último día que cuenta
  const transc=C.dias.filter(d=>d<=corteHasta);
  const reg={};                                       // personalId → {fecha: tipo}
  (DB.tareaje||[]).forEach(r=>{
    if(r.fecha<C.desde||r.fecha>C.hasta)return;
    if(o.proy&&r.proy&&r.proy!==o.proy)return;
    (reg[r.personalId]||(reg[r.personalId]={}))[r.fecha]=r.tipo;
  });
  const q=String(o.q||'').trim().toLowerCase();
  const gente=[];
  (DB.personal||[]).forEach(p=>{
    const m=reg[p.id];if(!m)return;
    if(o.guardia&&_tcGuardia(p)!==o.guardia)return;
    if(q&&!([p.ape,p.nom,p.cargo,p.cat,p.dni].join(' ').toLowerCase().includes(q)))return;
    const r={p,id:p.id,nombre:_tcNombre(p),grupo:_tcGrupoDe(p,o.agrup||'guardia'),dia:m,
      obra:0,libre:0,faltas:0,otras:0,noches:0,venta:0,cuenta:{}};
    transc.forEach(d=>{
      const t=m[d];if(!t)return;
      r.cuenta[t]=(r.cuenta[t]||0)+1;
      if(_TC_OBRA.includes(t))r.obra++;
      else if(_TC_LIBRE.includes(t))r.libre++;
      else if(t==='F')r.faltas++;
      else if(_TC_AUS.includes(t))r.otras++;
      if(t==='TN')r.noches++;
      r.venta+=_TC_VENTA[t]||0;
    });
    r.prog=r.obra+r.faltas+r.otras;
    r.asis=r.prog?r.obra/r.prog:null;
    gente.push(r);
  });
  const presentes=C.dias.map(d=>d<=corteHasta?gente.filter(r=>_TC_OBRA.includes(r.dia[d])).length:null);
  const faltasDia=C.dias.map(d=>d<=corteHasta?gente.filter(r=>r.dia[d]==='F').length:null);
  const tot=gente.reduce((s,r)=>{s.obra+=r.obra;s.prog+=r.prog;s.faltas+=r.faltas;s.otras+=r.otras;s.venta+=r.venta;return s;},
    {obra:0,prog:0,faltas:0,otras:0,venta:0});
  const pres=presentes.filter(v=>v!=null);
  const fSit=o.fecha>=C.desde&&o.fecha<=C.hasta?o.fecha:corteHasta;
  return{C,hoy,corteHasta,transc,gente,presentes,faltasDia,tot,
    asis:tot.prog?tot.obra/tot.prog:null,
    dotProm:pres.length?pres.reduce((a,b)=>a+b,0)/pres.length:0,
    fSit,libresDia:gente.filter(r=>r.dia[fSit]==='DL').length,
    obraDia:gente.filter(r=>_TC_OBRA.includes(r.dia[fSit])).length};
}

function _tcSetAgrup(k){_tcAgrup=k;rTarCorte();}
function _tcSelec(id){_tcSel=_tcSel===id?null:id;rTarCorte();}
function _tcBuscar(v){
  _tcQ=v;rTarCorte();
  const el=document.getElementById('tcQ');
  if(el){el.focus();el.setSelectionRange(v.length,v.length);}
}

// ── Pintado ──────────────────────────────────────────────────────────────
function _tcLeer(){
  return{fecha:document.getElementById('tarPgFecha')?.value||today(),
    proy:document.getElementById('tarPgProy')?.value||'',
    guardia:document.getElementById('tarPgGuardia')?.value||'',
    agrup:_tcAgrup,q:_tcQ};
}
function _tcDM(f){const p=f.split('-');return p[2]+'/'+p[1];}

function _tcKpi(lbl,val,sub,col){
  return `<div style="flex:1 1 130px;background:var(--panel2);border:1px solid ${col};border-radius:8px;padding:.55rem .75rem">
    <div style="font-size:.6rem;color:var(--muted2);text-transform:uppercase;letter-spacing:.07em;font-weight:700">${lbl}</div>
    <div style="font-size:1.3rem;font-weight:800;color:${col};font-variant-numeric:tabular-nums;line-height:1.2">${val}</div>
    <div style="font-size:.66rem;color:var(--muted2)">${sub}</div></div>`;
}
function _tcColores(grupos){
  const fijo={'Guardia A':'#f59e0b','Guardia B':'#a855f7','Guardia C':'#10b981','Sin guardia':'#64748b',Staff:'#3b82f6',Obrero:'#10b981'};
  const m={};grupos.forEach((g,i)=>{m[g]=fijo[g]||_TC_PALETA[i%_TC_PALETA.length];});
  return m;
}
// Días del corte (ya transcurridos) en que la persona tuvo alguno de esos códigos
function _tcFechas(r,D,tipos){return D.transc.filter(d=>tipos.includes(r.dia[d]));}

// Barras verticales por día (dotación o faltas); null = día que aún no transcurre
function _tcBarrasDia(D,serie,colDe,etq,alto){
  const tot=serie.map(s=>s==null?null:s.reduce((a,b)=>a+b,0));
  const max=Math.max(1,...tot.filter(v=>v!=null));
  return `<div style="display:flex;gap:3px;align-items:flex-end;height:${alto+16}px">
    ${serie.map((s,i)=>{
      const d=D.C.dias[i];
      if(s==null)return `<span style="flex:1;min-width:0;height:100%;border-bottom:1px dashed var(--border)" title="${_tcDM(d)}: aún no transcurre"></span>`;
      return `<span style="flex:1;min-width:0;display:flex;flex-direction:column;justify-content:flex-end;gap:1px" title="${_tcDM(d)}: ${tot[i]} ${etq}">${
        tot[i]?`<b style="font-size:.55rem;color:var(--muted2);text-align:center;font-weight:700">${tot[i]}</b>`:''}${
        s.map((v,gi)=>v?`<i style="display:block;height:${(alto*v/max).toFixed(1)}px;background:${colDe(gi)}"></i>`:'').join('')}</span>`;
    }).join('')}
  </div>
  <div style="display:flex;gap:3px;margin-top:4px">${D.C.dias.map(d=>`<span style="flex:1;min-width:0;text-align:center;font-size:.55rem;color:${d===D.fSit?'var(--adm)':'var(--muted2)'};font-weight:${d===D.fSit?800:400}">${d.slice(8)}</span>`).join('')}</div>`;
}

// Ranking con barras: quién acumula más días de esos códigos
function _tcRanking(D,tit,tipos,c,vacio){
  const filas=D.gente.map(r=>({r,f:_tcFechas(r,D,tipos)})).filter(x=>x.f.length)
    .sort((a,b)=>b.f.length-a.f.length||a.r.nombre.localeCompare(b.r.nombre,'es'));
  const total=filas.reduce((s,x)=>s+x.f.length,0);
  const max=filas.length?filas[0].f.length:1;
  const varios=tipos.length>1;
  const item=({r,f})=>{
    const cod=varios?[...new Set(f.map(d=>r.dia[d]))].join(' · ')+' · ':'';
    return `<div onclick="_tcSelec(${r.id})" style="cursor:pointer;padding:.28rem 0;border-bottom:1px dotted var(--border)" title="${_tcEsc(f.map(d=>_tcDM(d)+' '+r.dia[d]).join(', '))}">
      <div style="display:flex;justify-content:space-between;gap:.5rem;font-size:.74rem">
        <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--text);font-weight:700">${_tcEsc(r.nombre)}</span>
        <span style="color:${c};font-weight:800;white-space:nowrap">${f.length} ${f.length===1?'día':'días'}</span></div>
      <div style="display:flex;align-items:center;gap:.5rem;margin-top:2px">
        <span style="flex:1;height:6px;background:var(--panel2);border-radius:3px;overflow:hidden"><i style="display:block;height:100%;width:${(100*f.length/max).toFixed(0)}%;background:${c}"></i></span>
        <span style="font-size:.62rem;color:var(--muted2);white-space:nowrap;max-width:60%;overflow:hidden;text-overflow:ellipsis">${_tcEsc(r.p.cargo||'—')} · ${cod}${f.map(_tcDM).join(', ')}</span></div>
    </div>`;
  };
  return `<div class="card" style="padding:.8rem 1rem;border:1px solid ${c}">
    <div style="display:flex;justify-content:space-between;align-items:baseline;gap:.5rem;margin-bottom:.5rem">
      <div style="font-size:.72rem;font-weight:800;color:${c};text-transform:uppercase;letter-spacing:.06em">${tit}</div>
      <div style="font-size:.68rem;color:var(--muted2);white-space:nowrap">${filas.length} pers · ${total} días</div>
    </div>
    ${filas.length?filas.slice(0,10).map(item).join('')+(filas.length>10?`<div style="font-size:.66rem;color:var(--muted2);padding-top:.35rem">+ ${filas.length-10} personas más (ver Excel)</div>`:'')
      :`<div style="font-size:.76rem;color:#10b981;font-weight:700">✓ ${vacio}</div>`}
  </div>`;
}

function rTarCorte(){
  const body=document.getElementById('tcBody');if(!body)return;
  if(typeof _tarPgInitFiltros==='function')_tarPgInitFiltros();
  const D=_tcDatos(_tcLeer());
  const {C,gente}=D;
  const grupos=_tcOrdenGrupos([...new Set(gente.map(r=>r.grupo))],_tcAgrup);
  const col=_tcColores(grupos);
  const btn=(on,txt,fn)=>`<button onclick="${fn}" style="padding:.28rem .7rem;border-radius:6px;font-size:.74rem;font-weight:700;cursor:pointer;border:1px solid var(--adm);background:${on?'var(--adm)':'transparent'};color:${on?'#fff':'var(--text)'}">${txt}</button>`;
  const tituloCaja=(t,extra)=>`<div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:.5rem;margin-bottom:.5rem"><div style="font-size:.72rem;font-weight:800;color:var(--muted2);text-transform:uppercase;letter-spacing:.06em">${t}</div>${extra||''}</div>`;

  // Cabecera del corte
  let h=`<div style="display:flex;flex-wrap:wrap;gap:.6rem;align-items:center;margin-bottom:.8rem">
    ${btn(false,'◀','_tcMover(-1)')}
    <div><div style="font-size:1.05rem;font-weight:800;color:var(--text)">📋 ${C.nombre}</div>
      <div style="font-size:.72rem;color:var(--muted2)">${_tcDM(C.desde)}/${C.desde.slice(0,4)} al ${_tcDM(C.hasta)}/${C.hasta.slice(0,4)} · ${C.dias.length} días · ${D.transc.length} transcurridos · ${gente.length} trabajadores en vista</div></div>
    ${btn(false,'▶','_tcMover(1)')}
    <button onclick="exportTarCorteXLSX()" style="margin-left:auto;background:#166534;color:#fff;border:none;border-radius:7px;padding:.38rem 1rem;font-size:.8rem;font-weight:700;cursor:pointer">📊 Exportar Excel</button>
  </div>`;

  // KPIs
  const cnt=t=>gente.reduce((s,r)=>s+(r.cuenta[t]||0),0);
  const conT=t=>gente.filter(r=>r.cuenta[t]).length;
  h+=`<div style="display:flex;gap:.5rem;flex-wrap:wrap;margin-bottom:.9rem">
    ${_tcKpi('Asistencia',_tcPct(D.asis),D.tot.obra+' de '+D.tot.prog+' días programados',_tcColAsis(D.asis))}
    ${_tcKpi('Dotación promedio',D.dotProm.toFixed(1),'personas en obra por día','#06b6d4')}
    ${_tcKpi('Faltas',D.tot.faltas,conT('F')+' personas','#ef4444')}
    ${_tcKpi('Permisos',cnt('P'),conT('P')+' personas','#f59e0b')}
    ${_tcKpi('Descanso médico',cnt('DM'),conT('DM')+' personas','#8b5cf6')}
    ${_tcKpi('Licencias y vac.',cnt('LP')+cnt('LM')+cnt('LF')+cnt('V'),'LP · LM · LF · V','#3b82f6')}
    ${_tcKpi('Situación al '+_tcDM(D.fSit),D.obraDia+' en obra',D.libresDia+' de día libre','#10b981')}
  </div>`;

  // Controles (la agrupación pinta la dotación y la asistencia por grupo)
  h+=`<div style="display:flex;flex-wrap:wrap;gap:.45rem;align-items:center;margin-bottom:.8rem">
    <span style="font-size:.62rem;color:var(--muted2);text-transform:uppercase;letter-spacing:.07em;font-weight:700">Agrupar por</span>
    ${_TC_AGRUP.map(a=>btn(_tcAgrup===a.k,a.l,`_tcSetAgrup('${a.k}')`)).join('')}
    <input id="tcQ" type="search" value="${_tcEsc(_tcQ)}" oninput="_tcBuscar(this.value)" placeholder="Buscar nombre, cargo o DNI…" style="flex:1 1 180px;min-width:150px;background:var(--panel2);border:1px solid var(--border);border-radius:6px;color:var(--text);padding:.32rem .6rem;font-size:.78rem">
  </div>`;

  if(!gente.length){
    body.innerHTML=h+`<div class="card" style="padding:2rem;text-align:center;color:var(--muted2)">No hay tareo registrado en este corte para los filtros elegidos.</div>`;
    return;
  }

  // Ficha del trabajador (al tocar un nombre) arriba, para no tener que bajar
  h+=_tcFicha(D);

  // Gráficas por día: dotación (apilada por grupo si son pocos) y faltas
  const apila=grupos.length<=8;
  const serieDot=C.dias.map((d,i)=>D.presentes[i]==null?null:
    (apila?grupos.map(g=>gente.filter(r=>r.grupo===g&&_TC_OBRA.includes(r.dia[d])).length):[D.presentes[i]]));
  const leyenda=apila?`<div style="display:flex;gap:.7rem;flex-wrap:wrap;font-size:.68rem;color:var(--muted2)">${grupos.map(g=>`<span><i style="display:inline-block;width:9px;height:9px;border-radius:2px;background:${col[g]};margin-right:3px"></i>${_tcEsc(g)}</span>`).join('')}</div>`:'';
  const pico=D.faltasDia.reduce((m,v,i)=>v!=null&&v>m.v?{v,i}:m,{v:0,i:-1});
  h+=`<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(380px,1fr));gap:.8rem;margin-bottom:.9rem">
    <div class="card" style="padding:.8rem 1rem;border:1px solid #06b6d4">${tituloCaja('Dotación en obra por día',leyenda)}
      ${_tcBarrasDia(D,serieDot,gi=>apila?col[grupos[gi]]:'#10b981','en obra',70)}</div>
    <div class="card" style="padding:.8rem 1rem;border:1px solid #ef4444">${tituloCaja('Faltas por día',
      pico.i>=0?`<div style="font-size:.68rem;color:var(--muted2)">día con más faltas: <b style="color:#ef4444">${_tcDM(C.dias[pico.i])} (${pico.v})</b></div>`:'')}
      ${_tcBarrasDia(D,D.faltasDia.map(v=>v==null?null:[v]),()=>'#ef4444','faltas',70)}</div>
  </div>`;

  // Rankings
  h+=`<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:.8rem;margin-bottom:.9rem">
    ${_tcRanking(D,'Quiénes faltan más',['F'],'#ef4444','Nadie con faltas en lo que va del corte.')}
    ${_tcRanking(D,'Más permisos',['P'],'#f59e0b','Nadie con permisos en lo que va del corte.')}
    ${_tcRanking(D,'Descanso médico',['DM'],'#8b5cf6','Nadie con descanso médico en lo que va del corte.')}
    ${_tcRanking(D,'Licencias y vacaciones',['LP','LM','LF','V'],'#3b82f6','Nadie con licencias ni vacaciones en lo que va del corte.')}
  </div>`;

  h+=_tcResumen(D,grupos,col);
  body.innerHTML=h;
}

// Ficha del trabajador elegido (se abre tocando un nombre de los rankings)
function _tcFicha(D){
  const r=D.gente.find(x=>x.id===_tcSel);if(!r)return '';
  const kv=(l,v,c)=>`<div style="flex:1 1 110px;background:var(--panel2);border:1px solid ${c||'var(--border)'};border-radius:7px;padding:.45rem .6rem"><div style="font-size:.58rem;color:var(--muted2);text-transform:uppercase;letter-spacing:.07em;font-weight:700">${l}</div><div style="font-size:1rem;font-weight:800;color:${c||'var(--text)'}">${v}</div></div>`;
  const p=r.p,c=r.cuenta;
  const dias=D.C.dias.map(d=>{
    const t=r.dia[d],T=(t&&typeof _TARE_T!=='undefined'&&_TARE_T[t])||null,fut=d>D.corteHasta;
    return `<div style="text-align:center;padding:.2rem .1rem;opacity:${fut?.4:1}">
      <div style="font-size:.55rem;color:var(--muted2)">${d.slice(8)}</div>
      <div style="font-size:.66rem;font-weight:800;margin-top:2px;color:${T?T.tx:'var(--muted2)'};background:${T?T.bg:'transparent'};border-radius:3px">${_tcEsc(t||'—')}</div></div>`;
  }).join('');
  const lic=(c.LP||0)+(c.LM||0)+(c.LF||0)+(c.V||0);
  return `<div class="card" style="padding:.9rem 1rem;margin-bottom:.9rem;border:1px solid var(--adm)">
    <div style="display:flex;flex-wrap:wrap;justify-content:space-between;gap:.5rem;align-items:baseline;border-bottom:1px solid var(--border);padding-bottom:.5rem;margin-bottom:.6rem">
      <div><div style="font-size:1rem;font-weight:800;color:var(--text)">${_tcEsc(r.nombre)}</div>
        <div style="font-size:.7rem;color:var(--muted2)">${_tcEsc(p.cargo||'—')} · ${_tcEsc(p.tipo||'Obrero')} · ${_tcEsc(p.cat||'sin categoría')} · Guardia ${_tcGuardia(p)}${p.dni?' · DNI '+_tcEsc(p.dni):''}${(p.est||'Activo')!=='Activo'?' · <span style="color:#ef4444">'+_tcEsc(p.est)+'</span>':''}</div></div>
      <button onclick="_tcSelec(${r.id})" style="background:transparent;border:1px solid var(--border);color:var(--muted2);border-radius:6px;padding:.2rem .6rem;font-size:.72rem;cursor:pointer">✕ Cerrar</button>
    </div>
    <div style="display:flex;flex-wrap:wrap;gap:.45rem;margin-bottom:.7rem">
      ${kv('Asistencia',_tcPct(r.asis),_tcColAsis(r.asis))}
      ${kv('Días en obra',r.obra+' / '+r.prog,'#10b981')}
      ${kv('Faltas',r.faltas,r.faltas?'#ef4444':null)}
      ${kv('Permisos',c.P||0,c.P?'#f59e0b':null)}
      ${kv('Descanso médico',c.DM||0,c.DM?'#8b5cf6':null)}
      ${kv('Licencias / vac.',lic,lic?'#3b82f6':null)}
      ${kv('Días libres',r.libre,'#6b7280')}
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(34px,1fr));gap:3px">${dias}</div>
  </div>`;
}

// Asistencia por grupo y la gente con menor asistencia
function _tcResumen(D,grupos,col){
  const lbl=(_TC_AGRUP.find(a=>a.k===_tcAgrup)||{}).l||'';
  const fila=(a,b,click)=>`<div ${click?`onclick="${click}" `:''}style="${click?'cursor:pointer;':''}display:flex;justify-content:space-between;gap:.6rem;font-size:.74rem;padding:.25rem 0;border-bottom:1px dotted var(--border)"><span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--text)">${a}</span><span style="color:var(--muted2);white-space:nowrap">${b}</span></div>`;
  const porGrupo=grupos.map(g=>{
    const f=D.gente.filter(r=>r.grupo===g),o=f.reduce((s,r)=>s+r.obra,0),p=f.reduce((s,r)=>s+r.prog,0),fa=f.reduce((s,r)=>s+r.faltas,0);
    const a=p?o/p:null;
    return fila(`<span style="color:${col[g]};font-weight:700">${_tcEsc(g)}</span>`,`${f.length} pers · ${fa} faltas · <b style="color:${_tcColAsis(a)}">${_tcPct(a)}</b>`);
  }).join('');
  const riesgo=D.gente.filter(x=>x.prog>0&&x.asis<1).sort((a,b)=>a.asis-b.asis||b.faltas-a.faltas).slice(0,8)
    .map(x=>fila(_tcEsc(x.nombre),`${x.obra}/${x.prog} días · <b style="color:${_tcColAsis(x.asis)}">${_tcPct(x.asis)}</b>`,`_tcSelec(${x.id})`)).join('');
  return `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:.8rem">
    <div class="card" style="padding:.8rem 1rem;border:1px solid #06b6d4">
      <div style="font-size:.72rem;font-weight:800;color:#06b6d4;text-transform:uppercase;letter-spacing:.06em;margin-bottom:.4rem">Asistencia por ${lbl.toLowerCase()}</div>${porGrupo}</div>
    <div class="card" style="padding:.8rem 1rem;border:1px solid #f97316">
      <div style="font-size:.72rem;font-weight:800;color:#f97316;text-transform:uppercase;letter-spacing:.06em;margin-bottom:.4rem">Menor asistencia · revisar antes del cierre</div>
      ${riesgo||'<div style="font-size:.76rem;color:#10b981;font-weight:700">✓ Todos con 100% de asistencia en lo que va del corte.</div>'}</div>
  </div>`;
}

// ── Excel: ausencias por persona en el corte, con sus fechas ─────────────
function exportTarCorteXLSX(){
  if(typeof XLSX==='undefined'){alert('No se pudo cargar la librería de Excel.');return;}
  const o=_tcLeer(),D=_tcDatos(o),{C}=D;
  const cab=['N°','Trabajador','DNI','Cargo','Categoría','Staff/Obrero','Guardia','Días en obra','Días programados','Asist. %',
    'Faltas','Fechas de falta','Permisos','Fechas de permiso','Desc. médico','Fechas DM','Licencias','Vacaciones','Días libres'];
  const aoa=[[`Ausencias — ${C.nombre} (${_tcDM(C.desde)} al ${_tcDM(C.hasta)}) · ${o.proy||'Todos los proyectos'}${o.guardia?' · Guardia '+o.guardia:''}`],
    [`Cuenta hasta ${_tcDM(D.corteHasta)} · Asistencia = días en obra ÷ días programados (sin DL)`],cab];
  const lista=[...D.gente].sort((a,b)=>b.faltas-a.faltas||(b.prog-b.obra)-(a.prog-a.obra)||a.nombre.localeCompare(b.nombre,'es'));
  lista.forEach((r,i)=>{
    const p=r.p,c=r.cuenta,fe=t=>_tcFechas(r,D,t).map(_tcDM).join(', ');
    aoa.push([i+1,r.nombre,p.dni||'',p.cargo||'',p.cat||'',p.tipo||'',_tcGuardia(p),r.obra,r.prog,r.asis==null?'':Math.round(r.asis*1000)/10,
      r.faltas,fe(['F']),c.P||0,fe(['P']),c.DM||0,fe(['DM']),(c.LP||0)+(c.LM||0)+(c.LF||0),c.V||0,r.libre]);
  });
  const ws=XLSX.utils.aoa_to_sheet(aoa);
  ws['!cols']=[{wch:4},{wch:32},{wch:10},{wch:28},{wch:16},{wch:10},{wch:7},{wch:8},{wch:9},{wch:8},{wch:7},{wch:24},{wch:8},{wch:24},{wch:8},{wch:24},{wch:8},{wch:9},{wch:8}];
  const wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,ws,'Ausencias');
  XLSX.writeFile(wb,`Ausencias_${C.nombre.replace(/\s+/g,'_')}_${o.proy||'TODOS'}.xlsx`);
}
