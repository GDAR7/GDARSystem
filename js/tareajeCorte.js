// ══════════════════════════════════════════════════════════════════════════
//  CORTE 21→20 — tab del Resumen Diario de Tareaje
//  Matriz persona × día del corte (del 21 al 20, lleva el nombre del mes en
//  que cierra), con asistencia, faltas, dotación diaria, ficha del trabajador
//  y rankings. La agrupación se elige en la misma pestaña:
//  Guardia · Staff/Obrero · Categoría · Cargo.
//  Usa la fecha (define el corte), el proyecto y la guardia de la cabecera.
//
//  Reglas:
//   · En obra = TD, TN, DLT, A5 · Día libre = DL · Ausencias = F, DM, P, V, LP, LM, LF
//   · Asistencia = días en obra ÷ días programados (en obra + ausencias; el DL no cuenta)
//   · Jornadas venta = misma regla de HH Venta: TD, TN, A5 y DL = 1 · DLT = 2.5
//   · Solo se cuenta hasta hoy: los días futuros ya cargados se ven atenuados.
//   · El tareo no guarda horas, por eso aquí no hay HH ni horas extras.
// ══════════════════════════════════════════════════════════════════════════

const _TC_OBRA=['TD','TN','DLT','A5'];
const _TC_LIBRE=['DL'];
const _TC_AUS=['F','DM','P','V','LP','LM','LF'];
const _TC_VENTA={TD:1,TN:1,A5:1,DL:1,DLT:2.5};
const _TC_MES=['enero','febrero','marzo','abril','mayo','junio','julio','agosto','setiembre','octubre','noviembre','diciembre'];
const _TC_DOW=['D','L','M','M','J','V','S'];
const _TC_PALETA=['#10b981','#3b82f6','#f59e0b','#a855f7','#06b6d4','#ec4899','#84cc16','#f97316'];
const _TC_AGRUP=[
  {k:'guardia',l:'Guardia'},
  {k:'tipo',l:'Staff / Obrero'},
  {k:'cat',l:'Categoría'},
  {k:'cargo',l:'Cargo'}
];

let _tcAgrup='guardia';
let _tcQ='';
let _tcOrden='nombre',_tcDesc=false;
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
  const tot=gente.reduce((s,r)=>{s.obra+=r.obra;s.prog+=r.prog;s.faltas+=r.faltas;s.otras+=r.otras;s.venta+=r.venta;return s;},
    {obra:0,prog:0,faltas:0,otras:0,venta:0});
  const pres=presentes.filter(v=>v!=null);
  const fSit=o.fecha>=C.desde&&o.fecha<=C.hasta?o.fecha:corteHasta;
  return{C,hoy,corteHasta,transc,gente,presentes,tot,
    asis:tot.prog?tot.obra/tot.prog:null,
    dotProm:pres.length?pres.reduce((a,b)=>a+b,0)/pres.length:0,
    fSit,libresDia:gente.filter(r=>r.dia[fSit]==='DL').length,
    obraDia:gente.filter(r=>_TC_OBRA.includes(r.dia[fSit])).length};
}

function _tcOrdenar(lista){
  const k=_tcOrden,s=_tcDesc?-1:1;
  return [...lista].sort((a,b)=>{
    if(k==='nombre')return s*a.nombre.localeCompare(b.nombre,'es');
    const x=a[k]==null?-1:a[k],y=b[k]==null?-1:b[k];
    return s*(x-y)||a.nombre.localeCompare(b.nombre,'es');
  });
}
function _tcSetOrden(k){
  if(_tcOrden===k)_tcDesc=!_tcDesc;else{_tcOrden=k;_tcDesc=k!=='nombre';}
  rTarCorte();
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
// Las celdas usan clases (no estilos en línea): con ~160 personas × 30 días
// el HTML pasa de ~1 MB a una fracción.
function _tcCss(){
  const T=typeof _TARE_T!=='undefined'?_TARE_T:{};
  return `<style>
    .tc-x{display:block;height:22px;line-height:22px;font-size:.6rem;font-weight:700;text-align:center;background:#475569;color:#fff}
    .tc-x.tc-v{background:transparent}.tc-x.tc-s{height:14px;line-height:14px}
    ${Object.entries(T).map(([k,v])=>`.tc-${k}{background:${v.bg};color:${v.tx}}`).join('')}
    .tc-x.tc-DL{opacity:.55}.tc-x.tc-f{opacity:.3}
    .tc-m td.tc-x{display:table-cell;height:22px;min-width:22px;padding:0;border:1px solid var(--panel)}
    .tc-m td.tc-x.tc-v{background:transparent}
    .tc-m thead th{position:sticky;top:0;z-index:2;background:var(--panel)}
    .tc-m tr.tc-r{cursor:pointer;border-bottom:1px solid var(--border)}
    .tc-m tr.tc-sel{background:rgba(59,130,246,.12)}
    .tc-m td.tc-nm{position:sticky;left:0;z-index:1;background:var(--panel);padding:.25rem .6rem;border-right:1px solid var(--border);white-space:nowrap}
    .tc-m tr.tc-sel td.tc-nm{background:var(--panel2);box-shadow:inset 3px 0 0 var(--adm)}
    .tc-m td.tc-nm b{display:block;font-size:.76rem;color:var(--text)}
    .tc-m td.tc-nm i{display:block;font-style:normal;font-size:.64rem;color:var(--muted2)}
    .tc-m td.tc-k{text-align:right;padding:0 .45rem;font-size:.74rem;border-left:1px solid var(--border)}
    .tc-m td.tc-g{color:var(--muted2)}.tc-m td.tc-rj{color:#ef4444;font-weight:800}.tc-m td.tc-mo{color:#8b5cf6}
    .tc-m thead th.tc-n{left:0;z-index:4}
  </style>`;
}
function _tcCelda(t,futuro,chica){
  if(!t)return '<span class="tc-x tc-v"></span>';
  const k=/^[A-Z0-9]+$/.test(t)?t:'';
  return `<span class="tc-x tc-${k}${futuro?' tc-f':''}${chica?' tc-s':''}">${_tcEsc(t)}</span>`;
}
// Celda de la matriz: el propio <td> lleva el color
function _tcTd(t,futuro){
  if(!t)return '<td class="tc-x tc-v"></td>';
  const k=/^[A-Z0-9]+$/.test(t)?t:'';
  return `<td class="tc-x tc-${k}${futuro?' tc-f':''}">${_tcEsc(t)}</td>`;
}
function _tcColores(grupos){
  const fijo={'Guardia A':'#f59e0b','Guardia B':'#a855f7','Guardia C':'#10b981','Sin guardia':'#64748b',Staff:'#3b82f6',Obrero:'#10b981'};
  const m={};grupos.forEach((g,i)=>{m[g]=fijo[g]||_TC_PALETA[i%_TC_PALETA.length];});
  return m;
}

function rTarCorte(){
  const body=document.getElementById('tcBody');if(!body)return;
  if(typeof _tarPgInitFiltros==='function')_tarPgInitFiltros();
  const D=_tcDatos(_tcLeer());
  const {C,gente}=D;
  const grupos=_tcOrdenGrupos([...new Set(gente.map(r=>r.grupo))],_tcAgrup);
  const col=_tcColores(grupos);
  const btn=(on,txt,fn,c)=>`<button onclick="${fn}" style="padding:.28rem .7rem;border-radius:6px;font-size:.74rem;font-weight:700;cursor:pointer;border:1px solid ${c||'var(--adm)'};background:${on?(c||'var(--adm)'):'transparent'};color:${on?'#fff':'var(--text)'}">${txt}</button>`;

  // Cabecera del corte
  let h=_tcCss()+`<div style="display:flex;flex-wrap:wrap;gap:.6rem;align-items:center;margin-bottom:.8rem">
    ${btn(false,'◀','_tcMover(-1)')}
    <div><div style="font-size:1.05rem;font-weight:800;color:var(--text)">📋 ${C.nombre}</div>
      <div style="font-size:.72rem;color:var(--muted2)">${_tcDM(C.desde)}/${C.desde.slice(0,4)} al ${_tcDM(C.hasta)}/${C.hasta.slice(0,4)} · ${C.dias.length} días · ${D.transc.length} transcurridos · ${gente.length} trabajadores en vista</div></div>
    ${btn(false,'▶','_tcMover(1)')}
    <button onclick="exportTarCorteXLSX()" style="margin-left:auto;background:#166534;color:#fff;border:none;border-radius:7px;padding:.38rem 1rem;font-size:.8rem;font-weight:700;cursor:pointer">📊 Exportar Excel</button>
  </div>`;

  // KPIs
  const fs=_tcDM(D.fSit);
  h+=`<div style="display:flex;gap:.5rem;flex-wrap:wrap;margin-bottom:.9rem">
    ${_tcKpi('Asistencia',_tcPct(D.asis),D.tot.obra+' de '+D.tot.prog+' días programados',_tcColAsis(D.asis))}
    ${_tcKpi('Días en obra',D.tot.obra,'TD + TN + DLT + A5','#10b981')}
    ${_tcKpi('Dotación promedio',D.dotProm.toFixed(1),'personas en obra por día','#06b6d4')}
    ${_tcKpi('Faltas del corte',D.tot.faltas,'días con F','#ef4444')}
    ${_tcKpi('Otras ausencias',D.tot.otras,'DM · P · V · licencias','#8b5cf6')}
    ${_tcKpi('Jornadas venta',D.tot.venta.toLocaleString('es-PE',{maximumFractionDigits:1}),'regla HH Venta (DLT = 2.5)','#3b82f6')}
    ${_tcKpi('Situación al '+fs,D.obraDia+' en obra',D.libresDia+' de día libre','#f59e0b')}
  </div>`;

  if(!gente.length){
    body.innerHTML=h+`<div class="card" style="padding:2rem;text-align:center;color:var(--muted2)">No hay tareo registrado en este corte para los filtros elegidos.</div>`;
    return;
  }

  // Dotación por día (apilada por grupo si son pocos)
  const apila=grupos.length<=8;
  const serie=C.dias.map((d,i)=>D.presentes[i]==null?null:
    (apila?grupos.map(g=>gente.filter(r=>r.grupo===g&&_TC_OBRA.includes(r.dia[d])).length):[D.presentes[i]]));
  const max=Math.max(1,...D.presentes.filter(v=>v!=null));
  h+=`<div class="card" style="padding:.8rem 1rem;margin-bottom:.9rem">
    <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:.5rem;margin-bottom:.5rem">
      <div style="font-size:.72rem;font-weight:800;color:var(--muted2);text-transform:uppercase;letter-spacing:.06em">Dotación en obra por día</div>
      ${apila?`<div style="display:flex;gap:.7rem;flex-wrap:wrap;font-size:.68rem;color:var(--muted2)">${grupos.map(g=>`<span><i style="display:inline-block;width:9px;height:9px;border-radius:2px;background:${col[g]};margin-right:3px"></i>${_tcEsc(g)}</span>`).join('')}</div>`:''}
    </div>
    <div style="display:flex;gap:3px;align-items:flex-end;height:80px">
      ${serie.map((s,i)=>{
        const d=C.dias[i];
        if(!s)return `<span style="flex:1;min-width:0;height:100%;border-bottom:1px dashed var(--border)" title="${_tcDM(d)}: aún no transcurre"></span>`;
        const t=s.reduce((a,b)=>a+b,0);
        return `<span style="flex:1;min-width:0;display:flex;flex-direction:column;justify-content:flex-end;gap:1px" title="${_tcDM(d)}: ${t} en obra">${
          s.map((v,gi)=>v?`<i style="display:block;height:${(70*v/max).toFixed(1)}px;background:${apila?col[grupos[gi]]:'#10b981'}"></i>`:'').join('')}</span>`;
      }).join('')}
    </div>
    <div style="display:flex;gap:3px;margin-top:4px">${C.dias.map(d=>`<span style="flex:1;min-width:0;text-align:center;font-size:.55rem;color:${d===D.fSit?'var(--adm)':'var(--muted2)'};font-weight:${d===D.fSit?800:400}">${d.slice(8)}</span>`).join('')}</div>
  </div>`;

  // Controles
  h+=`<div style="display:flex;flex-wrap:wrap;gap:.45rem;align-items:center;margin-bottom:.6rem">
    <span style="font-size:.62rem;color:var(--muted2);text-transform:uppercase;letter-spacing:.07em;font-weight:700">Agrupar por</span>
    ${_TC_AGRUP.map(a=>btn(_tcAgrup===a.k,a.l,`_tcSetAgrup('${a.k}')`)).join('')}
    <input id="tcQ" type="search" value="${_tcEsc(_tcQ)}" oninput="_tcBuscar(this.value)" placeholder="Buscar nombre, cargo o DNI…" style="flex:1 1 180px;min-width:150px;background:var(--panel2);border:1px solid var(--border);border-radius:6px;color:var(--text);padding:.32rem .6rem;font-size:.78rem">
  </div>
  <div style="display:flex;flex-wrap:wrap;gap:.8rem;font-size:.66rem;color:var(--muted2);margin-bottom:.5rem">
    ${['TD','TN','DLT','A5','DL','F','DM','P','V','LP','LM','LF'].map(t=>`<span style="display:inline-flex;align-items:center;gap:4px"><span style="width:20px">${_tcCelda(t,false,true)}</span>${_tcEsc((_TARE_T[t]||{}).l||t)}</span>`).join('')}
    <span>· atenuado = día futuro (no cuenta)</span>
  </div>`;

  // Matriz
  const th=(k,txt,tit)=>`<th onclick="_tcSetOrden('${k}')" title="${tit}" style="cursor:pointer;padding:.35rem .45rem;font-size:.62rem;color:${_tcOrden===k?'var(--adm)':'var(--muted2)'};text-transform:uppercase;white-space:nowrap;border-left:1px solid var(--border);text-align:right">${txt}${_tcOrden===k?(_tcDesc?' ▼':' ▲'):''}</th>`;
  const nCols=C.dias.length+6;
  let t=`<table class="tc-m" style="border-collapse:collapse;width:100%;min-width:${260+C.dias.length*24+300}px;font-variant-numeric:tabular-nums">
    <thead><tr>
      <th class="tc-n" onclick="_tcSetOrden('nombre')" style="text-align:left;padding:.35rem .6rem;font-size:.62rem;color:${_tcOrden==='nombre'?'var(--adm)':'var(--muted2)'};text-transform:uppercase;cursor:pointer;min-width:220px;border-right:1px solid var(--border)">Trabajador${_tcOrden==='nombre'?(_tcDesc?' ▼':' ▲'):''}</th>
      ${C.dias.map(d=>{const w=new Date(d+'T12:00:00Z').getUTCDay();
        return `<th style="padding:.25rem 0;font-size:.6rem;min-width:22px;text-align:center;color:${w===0?'#ef4444':d===D.fSit?'var(--adm)':'var(--muted2)'};font-weight:${d===D.fSit?800:600}">${d.slice(8)}<br><span style="font-size:.5rem;opacity:.8">${_TC_DOW[w]}</span></th>`;}).join('')}
      ${th('obra','Obra','Días en obra (TD, TN, DLT, A5) hasta hoy')}${th('libre','DL','Días libres')}${th('faltas','Faltas','Días con F')}${th('otras','Otras','DM, P, V y licencias')}${th('asis','Asist.','Días en obra ÷ días programados (sin contar DL)')}
    </tr></thead><tbody>`;
  grupos.forEach(g=>{
    const fil=_tcOrdenar(gente.filter(r=>r.grupo===g));
    const o=fil.reduce((s,r)=>s+r.obra,0),p=fil.reduce((s,r)=>s+r.prog,0);
    t+=`<tr><td colspan="${nCols}" style="background:var(--panel2);border-top:1px solid var(--border);border-bottom:1px solid var(--border);padding:.35rem .6rem;font-size:.7rem;font-weight:800;color:${col[g]};text-transform:uppercase;letter-spacing:.05em">
      <span style="position:sticky;left:.6rem">${_tcEsc(g)}</span>
      <span style="float:right;color:var(--muted2);font-weight:600;text-transform:none;letter-spacing:0">${fil.length} pers · ${o} días en obra · asistencia ${_tcPct(p?o/p:null)}</span></td></tr>`;
    fil.forEach(r=>{
      const sel=_tcSel===r.id;
      t+=`<tr onclick="_tcSelec(${r.id})" class="tc-r${sel?' tc-sel':''}">
        <td class="tc-nm"><b>${_tcEsc(r.nombre)}</b>
          <i>${_tcEsc(r.p.cargo||'—')}${_tcAgrup!=='guardia'?' · G'+_tcGuardia(r.p):''}</i></td>
        ${C.dias.map(d=>_tcTd(r.dia[d],d>D.corteHasta)).join('')}
        <td class="tc-k">${r.obra}</td><td class="tc-k tc-g">${r.libre}</td><td class="tc-k${r.faltas?' tc-rj':' tc-g'}">${r.faltas}</td><td class="tc-k${r.otras?' tc-mo':' tc-g'}">${r.otras}</td><td class="tc-k" style="color:${_tcColAsis(r.asis)};font-weight:800">${_tcPct(r.asis)}</td>
      </tr>`;
    });
  });
  t+='</tbody></table>';
  h+=`<div class="card" style="padding:0;overflow-x:auto;max-height:70vh;margin-bottom:.9rem">${t}</div>`;

  h+=_tcFicha(D)+_tcResumen(D,grupos,col);
  body.innerHTML=h;
}

// Ficha del trabajador elegido, o el seguimiento del corte si no hay ninguno
function _tcFicha(D){
  const r=D.gente.find(x=>x.id===_tcSel);
  const caja=c=>`<div class="card" style="padding:.9rem 1rem;margin-bottom:.9rem;border:1px solid var(--adm)">${c}</div>`;
  const kv=(l,v,c)=>`<div style="flex:1 1 110px;background:var(--panel2);border:1px solid ${c||'var(--border)'};border-radius:7px;padding:.45rem .6rem"><div style="font-size:.58rem;color:var(--muted2);text-transform:uppercase;letter-spacing:.07em;font-weight:700">${l}</div><div style="font-size:1rem;font-weight:800;color:${c||'var(--text)'}">${v}</div></div>`;
  if(!r){
    const riesgo=D.gente.filter(x=>x.prog>0&&x.asis<1).sort((a,b)=>a.asis-b.asis||b.faltas-a.faltas).slice(0,6);
    return caja(`<div style="font-size:.85rem;font-weight:800;color:var(--text)">Seguimiento del corte</div>
      <div style="font-size:.7rem;color:var(--muted2);margin-bottom:.6rem">Menor asistencia en la vista actual · revisar antes del cierre de planilla. Toca una fila para ver el detalle diario.</div>
      ${riesgo.length?`<div style="display:flex;flex-wrap:wrap;gap:.45rem">${riesgo.map(x=>`<div onclick="_tcSelec(${x.id})" style="cursor:pointer;flex:1 1 160px;background:var(--panel2);border:1px solid ${_tcColAsis(x.asis)};border-radius:7px;padding:.45rem .6rem">
        <div style="font-size:.72rem;font-weight:700;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${_tcEsc(x.nombre)}</div>
        <div style="font-size:1rem;font-weight:800;color:${_tcColAsis(x.asis)}">${_tcPct(x.asis)}</div>
        <div style="font-size:.64rem;color:var(--muted2)">${x.faltas} faltas · ${x.otras} otras · ${x.obra}/${x.prog} días</div></div>`).join('')}</div>`
        :`<div style="font-size:.78rem;color:#10b981;font-weight:700">✓ Todos con 100% de asistencia en lo que va del corte.</div>`}`);
  }
  const p=r.p;
  const dias=D.C.dias.map(d=>{
    const t=r.dia[d],T=(t&&_TARE_T[t])||null,fut=d>D.corteHasta;
    return `<div style="text-align:center;padding:.2rem .1rem;background:${T?T.bg+'22':'transparent'};border-radius:4px;opacity:${fut?.45:1}">
      <div style="font-size:.55rem;color:var(--muted2)">${d.slice(8)}</div>
      <div style="font-size:.66rem;font-weight:800;margin-top:2px;color:${T?T.tx:'var(--muted2)'};background:${T?T.bg:'transparent'};border-radius:3px">${t||'—'}</div></div>`;
  }).join('');
  return caja(`<div style="display:flex;flex-wrap:wrap;justify-content:space-between;gap:.5rem;align-items:baseline;border-bottom:1px solid var(--border);padding-bottom:.5rem;margin-bottom:.6rem">
      <div><div style="font-size:1rem;font-weight:800;color:var(--text)">${_tcEsc(r.nombre)}</div>
        <div style="font-size:.7rem;color:var(--muted2)">${_tcEsc(p.cargo||'—')} · ${_tcEsc(p.tipo||'Obrero')} · ${_tcEsc(p.cat||'sin categoría')} · Guardia ${_tcGuardia(p)}${p.dni?' · DNI '+_tcEsc(p.dni):''}${(p.est||'Activo')!=='Activo'?' · <span style="color:#ef4444">'+_tcEsc(p.est)+'</span>':''}</div></div>
      <button onclick="_tcSelec(${r.id})" style="background:transparent;border:1px solid var(--border);color:var(--muted2);border-radius:6px;padding:.2rem .6rem;font-size:.72rem;cursor:pointer">✕ Cerrar</button>
    </div>
    <div style="display:flex;flex-wrap:wrap;gap:.45rem;margin-bottom:.7rem">
      ${kv('Asistencia',_tcPct(r.asis),_tcColAsis(r.asis))}
      ${kv('Días en obra',r.obra+' / '+r.prog,'#10b981')}
      ${kv('Turnos noche',r.noches,'#1e3a8a')}
      ${kv('Días libres',r.libre,'#6b7280')}
      ${kv('Faltas',r.faltas,r.faltas?'#ef4444':null)}
      ${kv('Otras ausencias',r.otras,r.otras?'#8b5cf6':null)}
      ${kv('Jornadas venta',r.venta.toLocaleString('es-PE',{maximumFractionDigits:1}),'#3b82f6')}
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(34px,1fr));gap:3px">${dias}</div>`);
}

function _tcResumen(D,grupos,col){
  const caja=(tit,filas,c)=>`<div class="card" style="padding:.8rem 1rem;border:1px solid ${c}">
    <div style="font-size:.7rem;font-weight:800;color:${c};text-transform:uppercase;letter-spacing:.06em;margin-bottom:.4rem">${tit}</div>
    ${filas.length?filas.map(([a,b])=>`<div style="display:flex;justify-content:space-between;gap:.6rem;font-size:.74rem;padding:.22rem 0;border-bottom:1px dotted var(--border)"><span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--text)">${a}</span><span style="color:var(--muted2);white-space:nowrap">${b}</span></div>`).join('')
      :'<div style="font-size:.74rem;color:var(--muted2)">Sin registros.</div>'}</div>`;
  const lbl=(_TC_AGRUP.find(a=>a.k===_tcAgrup)||{}).l||'';
  const porGrupo=grupos.map(g=>{
    const f=D.gente.filter(r=>r.grupo===g),o=f.reduce((s,r)=>s+r.obra,0),p=f.reduce((s,r)=>s+r.prog,0);
    return [`<span style="color:${col[g]};font-weight:700">${_tcEsc(g)}</span>`,`${f.length} pers · ${o} días · ${_tcPct(p?o/p:null)}`];
  });
  const faltas=D.gente.filter(r=>r.faltas).sort((a,b)=>b.faltas-a.faltas||a.nombre.localeCompare(b.nombre,'es')).slice(0,8)
    .map(r=>[_tcEsc(r.nombre),r.faltas+(r.faltas===1?' falta':' faltas')]);
  const motivo={};D.gente.forEach(r=>_TC_AUS.forEach(t=>{if(r.cuenta[t])motivo[t]=(motivo[t]||0)+r.cuenta[t];}));
  const motivos=Object.entries(motivo).sort((a,b)=>b[1]-a[1])
    .map(([t,n])=>[_tcEsc((_TARE_T[t]||{}).l||t)+' ('+t+')',n+' días']);
  return `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:.8rem">
    ${caja('Asistencia por '+lbl.toLowerCase(),porGrupo,'#06b6d4')}
    ${caja('Más faltas en el corte',faltas,'#ef4444')}
    ${caja('Ausencias por motivo',motivos,'#8b5cf6')}
  </div>`;
}

// ── Excel: la matriz del corte tal como se ve (filtros y agrupación) ─────
function exportTarCorteXLSX(){
  if(typeof XLSX==='undefined'){alert('No se pudo cargar la librería de Excel.');return;}
  const o=_tcLeer(),D=_tcDatos(o),{C}=D;
  const grupos=_tcOrdenGrupos([...new Set(D.gente.map(r=>r.grupo))],_tcAgrup);
  const cab=['N°','Trabajador','DNI','Cargo','Categoría','Staff/Obrero','Guardia',...C.dias.map(_tcDM),'Obra','DL','Faltas','Otras','Asist. %','Jorn. venta'];
  const aoa=[[`Tareaje — ${C.nombre} (${_tcDM(C.desde)} al ${_tcDM(C.hasta)}) · ${o.proy||'Todos los proyectos'}${o.guardia?' · Guardia '+o.guardia:''}`],[`Cuenta hasta ${_tcDM(D.corteHasta)} · Asistencia = días en obra ÷ días programados (sin DL)`],cab];
  let n=0;
  grupos.forEach(g=>{
    aoa.push([g]);
    _tcOrdenar(D.gente.filter(r=>r.grupo===g)).forEach(r=>{
      const p=r.p;
      aoa.push([++n,r.nombre,p.dni||'',p.cargo||'',p.cat||'',p.tipo||'',_tcGuardia(p),...C.dias.map(d=>r.dia[d]||''),
        r.obra,r.libre,r.faltas,r.otras,r.asis==null?'':Math.round(r.asis*1000)/10,r.venta]);
    });
  });
  const ws=XLSX.utils.aoa_to_sheet(aoa);
  ws['!cols']=[{wch:4},{wch:32},{wch:10},{wch:28},{wch:16},{wch:10},{wch:7},...C.dias.map(()=>({wch:5})),{wch:6},{wch:5},{wch:6},{wch:6},{wch:8},{wch:9}];
  const wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,ws,'Corte');
  XLSX.writeFile(wb,`Tareaje_${C.nombre.replace(/\s+/g,'_')}_${o.proy||'TODOS'}.xlsx`);
}
