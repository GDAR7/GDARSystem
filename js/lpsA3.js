// ══════════════════════════════════════════════════════════════════════════
//  LPS · PLAN DE TRABAJO SEMANAL A3 — CONTROL DE CAPAS  (pestaña 7 del LPS)
//  Etapa 1: estado físico por frente (perfil de capas) + avance y ritmo.
//  Todo sale del módulo Recrecimiento:
//    DB.capas        → dique, nombre, cota, volM3, pctAvance
//    DB.capasAvance  → aportes parciales por fecha (el % de una capa es la
//                      SUMA de sus aportes, con tope 100 — igual que Recrecimiento)
//  Una capa sin historial usa su % registrado (sin fecha: cuenta desde antes).
//  Ritmo requerido = saldo ÷ semanas que faltan hasta la fecha fin del
//  proyecto (DB.lpsConfig · proyectoFin).
//  Etapa 2 (pendiente): compromiso semanal por capa y PPC.
// ══════════════════════════════════════════════════════════════════════════

const _A3_FRENTES=[
  {k:'DP',n:'Dique Principal'},
  {k:'DA',n:'Dique Auxiliar'},
  {k:'CA',n:'Contrafuerte DA',sub:true},
  {k:'DI',n:'Dique Intermedio'}
];
const _A3_PROYECTO='R3 Cota 4416 — Recrecimiento Dique Relavera R3 · Buenaventura · UM Uchuchacua';
const _A3_COL={hecha:'#16a34a',avance:'#86efac',falta:'#d6d3d1',real:'#ea580c',req:'#16a34a',total:'#64748b'};

function _a3H(s){return String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function _a3N(v,d=0){return(+v||0).toLocaleString('en-US',{minimumFractionDigits:d,maximumFractionDigits:d});}
function _a3Dia(iso){if(!iso)return'—';const[y,m,d]=iso.split('-');return`${d}/${m}/${y}`;}
function _a3DifDias(a,b){return Math.round((new Date(b+'T12:00:00')-new Date(a+'T12:00:00'))/864e5);}

// Historial indexado por capa (se arma una vez por render)
function _a3Hist(){
  const m={};
  (DB.capasAvance||[]).forEach(e=>{(m[+e.capaId]=m[+e.capaId]||[]).push(e);});
  return m;
}
// % de la capa a una fecha: suma de aportes hasta esa fecha, tope 100
function _a3PctCapa(c,hasta,hist){
  const h=hist[+c.id];
  if(!h||!h.length)return Math.min(100,Math.max(0,+c.pctAvance||0));
  let s=0;h.forEach(e=>{if(e.fecha<=hasta)s+=+e.pct||0;});
  return Math.min(100,Math.max(0,s));
}
function _a3VolA(caps,hasta,hist){
  return caps.reduce((s,c)=>s+(+c.volM3||0)*_a3PctCapa(c,hasta,hist)/100,0);
}
function _a3NumSem(iso){
  if(!_lpsProyInicio)return'';
  const s0=_lpsWeekStart(_lpsProyInicio);
  return Math.floor(_a3DifDias(s0,iso)/7)+1;
}

function _a3Datos(semIni){
  const hist=_a3Hist();
  const fin=_lpsAddDays(semIni,6), antes=_lpsAddDays(semIni,-1);
  const meta=_lpsProyFin||'';
  const semRest=meta?Math.max(0,Math.ceil(_a3DifDias(fin,meta)/7)):null;
  const req=(saldo)=>saldo<=0?0:semRest==null?null:semRest===0?saldo:saldo/semRest;
  const todas=DB.capas||[];

  const frentes=_A3_FRENTES.map(f=>{
    const caps=todas.filter(c=>c.dique===f.k)
      .sort((a,b)=>(+a.cota||0)-(+b.cota||0)||String(a.nombre).localeCompare(String(b.nombre),'es',{numeric:true}));
    const capas=caps.map(c=>{
      const pct=_a3PctCapa(c,fin,hist), pctAnt=_a3PctCapa(c,antes,hist);
      return{id:c.id,nombre:c.nombre,cota:+c.cota||null,vol:+c.volM3||0,pct,pctAnt,
        semM3:(+c.volM3||0)*(pct-pctAnt)/100};
    });
    const vol=capas.reduce((s,c)=>s+c.vol,0);
    const acum=capas.reduce((s,c)=>s+c.vol*c.pct/100,0);
    const sem=capas.reduce((s,c)=>s+c.semM3,0);
    const saldo=Math.max(0,vol-acum);
    const pct=vol?acum/vol*100:0;
    const rq=req(saldo);
    let est;
    if(!capas.length)est={t:'Sin capas',c:'#64748b'};
    else if(saldo<=0.5)est={t:'✓ Terminado',c:'#16a34a'};
    else if(sem<=0.5)est={t:'✕ Sin avance',c:'#dc2626'};
    else if(pct>=85)est={t:'✓ En cierre',c:'#16a34a'};
    else if(rq!=null&&sem>=rq)est={t:'✓ En ritmo',c:'#16a34a'};
    else est={t:'! Bajo ritmo',c:'#d97706'};
    return{...f,capas,vol,acum,sem,saldo,pct,req:rq,est,
      construidas:capas.filter(c=>c.pct>=100).length,
      enAvance:capas.filter(c=>c.pct>0&&c.pct<100).length};
  });

  const vol=frentes.reduce((s,f)=>s+f.vol,0);
  const acum=frentes.reduce((s,f)=>s+f.acum,0);
  const sem=frentes.reduce((s,f)=>s+f.sem,0);
  const saldo=Math.max(0,vol-acum);
  const requerido=req(saldo);

  // Corte topográfico: último registro de avance hasta el fin de la semana
  let corte='';
  (DB.capasAvance||[]).forEach(e=>{if(e.fecha<=fin&&e.fecha>corte)corte=e.fecha;});

  // Curva acumulada real (semana a semana) y requerida (de hoy a la meta)
  const fechas=(DB.capasAvance||[]).map(e=>e.fecha).filter(Boolean).sort();
  const ini0=[_lpsProyInicio,fechas[0]].filter(Boolean).sort()[0]||semIni;
  const s0=_lpsWeekStart(ini0);
  const finCurva=meta&&meta>fin?meta:fin;
  const nSem=Math.max(1,Math.ceil((_a3DifDias(s0,finCurva)+1)/7));
  const caps=todas.filter(c=>_A3_FRENTES.some(f=>f.k===c.dique));
  const real=[];
  for(let i=0;i<nSem;i++){
    const fs=_lpsAddDays(s0,i*7+6);
    if(fs>fin)break;
    real.push({fecha:fs,v:_a3VolA(caps,fs,hist)});
  }
  return{semIni,fin,meta,semRest,frentes,vol,acum,sem,saldo,requerido,corte,
    pct:vol?acum/vol*100:0,
    brecha:requerido!=null&&sem>0?requerido/sem:null,
    curva:{s0,nSem,real,finCurva},num:_a3NumSem(semIni)};
}

// ── Perfil de capas de un frente (SVG) ────────────────────────────────────
function _a3Perfil(f){
  const W=300,H=200,x0=78,x1=W-6,yb=H-14,yt=16;
  const n=f.capas.length;
  if(!n)return`<svg viewBox="0 0 ${W} ${H}" class="a3-svg"><text x="${W/2}" y="${H/2}" text-anchor="middle" class="a3-t-mut">Sin capas registradas</text></svg>`;
  const anchoB=x1-x0, anchoT=anchoB*0.42, cx=(x0+x1)/2;
  const xL=y=>{const t=(yb-y)/(yb-yt);return cx-(anchoB/2-(anchoB-anchoT)/2*t);};
  const xR=y=>2*cx-xL(y);
  const bh=(yb-yt)/n;
  const sep=n>40?0.35:0.8;
  let out='';
  f.capas.forEach((c,i)=>{
    const y0=yb-i*bh, y1=y0-bh;
    const col=c.pct>=100?_A3_COL.hecha:c.pct>0?_A3_COL.avance:_A3_COL.falta;
    out+=`<polygon points="${xL(y0).toFixed(1)},${y0.toFixed(1)} ${xR(y0).toFixed(1)},${y0.toFixed(1)} ${xR(y1).toFixed(1)},${y1.toFixed(1)} ${xL(y1).toFixed(1)},${y1.toFixed(1)}" fill="${col}" stroke="#fff" stroke-width="${sep}"><title>${_a3H(c.nombre)} · cota ${c.cota||'—'} · ${_a3N(c.vol,1)} m³ · ${_a3N(c.pct,1)} %</title></polygon>`;
  });
  out+=`<polygon points="${xL(yb)},${yb} ${xR(yb)},${yb} ${xR(yt)},${yt} ${xL(yt)},${yt}" fill="none" stroke="#57534e" stroke-width="1"/>`;
  // Rótulos: capa base, capa tope y la más alta con avance
  const marcas=[{i:0},{i:n-1}];
  let ult=-1;f.capas.forEach((c,i)=>{if(c.pct>0)ult=i;});
  if(ult>0&&ult<n-1)marcas.push({i:ult,fuerte:true});
  const ys=[];
  marcas.forEach(m=>{
    const c=f.capas[m.i];
    let y=yb-m.i*bh-bh/2;
    // evitar que los rótulos se encimen
    ys.forEach(o=>{if(Math.abs(o-y)<20)y=o+(y<o?-20:20);});
    y=Math.max(yt+4,Math.min(yb-4,y));ys.push(y);
    const yc=yb-m.i*bh-bh/2;
    out+=`<line x1="44" y1="${y}" x2="${xL(yc).toFixed(1)}" y2="${yc.toFixed(1)}" stroke="#57534e" stroke-width=".6"/>
      <text x="2" y="${y-1}" class="a3-t-cap${m.fuerte?' a3-t-fuerte':''}">${_a3H(c.nombre)}</text>
      <text x="2" y="${y+8}" class="a3-t-mut">${c.cota?_a3N(c.cota,2):''}</text>`;
  });
  return`<svg viewBox="0 0 ${W} ${H}" class="a3-svg" role="img" aria-label="Perfil de capas ${_a3H(f.n)}">${out}</svg>`;
}

// ── Curva acumulada: real y requerida ─────────────────────────────────────
function _a3Curva(d){
  const W=640,H=210,ml=46,mr=14,mt=24,mb=26;
  const {s0,nSem,real}=d.curva;
  const ymax=Math.max(d.vol,1)*1.05;
  const X=i=>ml+(W-ml-mr)*(nSem<=1?0:i/(nSem-1));
  const Y=v=>mt+(H-mt-mb)*(1-v/ymax);
  const iDe=fecha=>Math.min(nSem-1,Math.max(0,Math.floor(_a3DifDias(s0,fecha)/7)));
  let g='';
  for(let k=0;k<=4;k++){
    const v=ymax/4*k, y=Y(v);
    g+=`<line x1="${ml}" y1="${y}" x2="${W-mr}" y2="${y}" stroke="#e7e5e4" stroke-width=".7"/>
      <text x="${ml-4}" y="${y+3}" text-anchor="end" class="a3-t-eje">${v>=1000?_a3N(v/1000)+'k':_a3N(v)}</text>`;
  }
  const paso=Math.max(1,Math.ceil(nSem/10));
  for(let i=0;i<nSem;i+=paso){
    const n=_a3NumSem(_lpsAddDays(s0,i*7));
    g+=`<text x="${X(i)}" y="${H-mb+13}" text-anchor="middle" class="a3-t-eje">${n?'S-'+n:_lpsFmt(_lpsAddDays(s0,i*7))}</text>`;
  }
  // volumen total
  g+=`<line x1="${ml}" y1="${Y(d.vol)}" x2="${W-mr}" y2="${Y(d.vol)}" stroke="${_A3_COL.total}" stroke-width="1" stroke-dasharray="2 3"/>
    <text x="${ml+4}" y="${Y(d.vol)-5}" class="a3-t-lbl">Volumen total ${_a3N(d.vol)} m³</text>`;
  if(real.length){
    const pts=real.map((p,i)=>`${X(i).toFixed(1)},${Y(p.v).toFixed(1)}`).join(' ');
    const ul=real.length-1, xu=X(ul), yu=Y(real[ul].v);
    g+=`<polygon points="${X(0)},${Y(0)} ${pts} ${xu.toFixed(1)},${Y(0)}" fill="${_A3_COL.real}" fill-opacity=".08"/>
      <polyline points="${pts}" fill="none" stroke="${_A3_COL.real}" stroke-width="2"/>
      <line x1="${xu}" y1="${mt}" x2="${xu}" y2="${H-mb}" stroke="#a8a29e" stroke-width=".7" stroke-dasharray="3 3"/>
      <text x="${xu+3}" y="${Y(d.vol)+12}" class="a3-t-eje">corte ${_lpsFmt(d.fin)}</text>
      <circle cx="${xu}" cy="${yu}" r="3.2" fill="${_A3_COL.real}"/>
      <text x="${xu+6}" y="${yu-8}" class="a3-t-lbl" style="fill:${_A3_COL.real}">Real ${_a3N(real[ul].v)} m³ · ${_a3N(d.pct,1)} %</text>`;
    if(d.meta&&d.meta>d.fin&&d.saldo>0){
      const xm=X(iDe(d.meta));
      g+=`<line x1="${xu}" y1="${yu}" x2="${xm}" y2="${Y(d.vol)}" stroke="${_A3_COL.req}" stroke-width="1.6" stroke-dasharray="5 4"/>
        <circle cx="${xm}" cy="${Y(d.vol)}" r="3" fill="${_A3_COL.req}"/>
        <text x="${xm-8}" y="${Y(d.vol)-5}" text-anchor="end" class="a3-t-lbl" style="fill:${_A3_COL.req}">Requerido · meta ${_lpsFmt(d.meta)}</text>`;
    }
  }
  return`<svg viewBox="0 0 ${W} ${H}" class="a3-svg" role="img" aria-label="Volumen acumulado real y requerido">
    <text x="${ml}" y="9" class="a3-t-eje">Volumen acumulado (m³)</text>${g}</svg>`;
}

// ── Firmas (nombres guardados en este navegador) ──────────────────────────
const _A3_FIRMAS=[
  {k:'elab',t:'Elaborado por'},{k:'rev',t:'Revisado por'},
  {k:'apr',t:'Aprobado por'},{k:'rec',t:'Recibido — Supervisión'}
];
function _a3FirmasLeer(){try{return JSON.parse(localStorage.getItem('a3Firmas')||'{}')||{};}catch(e){return{};}}
function _a3FirmaSet(k,campo,v){
  const f=_a3FirmasLeer();f[k]=f[k]||{};f[k][campo]=String(v||'').trim();
  try{localStorage.setItem('a3Firmas',JSON.stringify(f));}catch(e){}
}

// ── Hoja A3 (la misma en pantalla y en el PDF) ────────────────────────────
function _a3Css(){return`
.a3p{--tx:#1c1917;--mut:#78716c;--ln:#d6d3d1;--bg:#fff;--bg2:#fafaf9;
  background:var(--bg);color:var(--tx);font-family:Arial,Helvetica,sans-serif;font-size:11px;
  padding:14px;min-width:1120px;border:1px solid var(--ln);-webkit-print-color-adjust:exact;print-color-adjust:exact}
.a3p *{box-sizing:border-box}
.a3-hdr{display:grid;grid-template-columns:110px 1fr repeat(4,auto);border:1px solid #57534e;margin-bottom:10px}
.a3-hdr>div{padding:8px 12px;border-left:1px solid var(--ln)}
.a3-hdr>div:first-child{border-left:none;display:flex;align-items:center;font-weight:800;letter-spacing:.06em;font-size:13px}
.a3-tit{font-size:17px;font-weight:900;letter-spacing:.01em}
.a3-sub{font-size:10px;color:var(--mut);margin-top:3px}
.a3-hk{font-size:8.5px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--mut)}
.a3-hv{font-size:15px;font-weight:800;margin-top:2px;font-variant-numeric:tabular-nums}
.a3-hs{font-size:9.5px;color:var(--mut)}
.a3-grid{display:grid;grid-template-columns:1.25fr 1fr;gap:10px}
.a3-box{border:1px solid #a8a29e}
.a3-bh{display:flex;align-items:center;gap:8px;padding:6px 10px;border-bottom:1px solid var(--ln);background:var(--bg2)}
.a3-bn{background:#1c1917;color:#fff;font-size:9px;font-weight:700;padding:1px 6px;border-radius:2px}
.a3-bt{font-weight:800;font-size:11.5px;letter-spacing:.02em;text-transform:uppercase}
.a3-bf{margin-left:auto;font-size:9px;color:var(--mut)}
.a3-perfiles{display:grid;grid-template-columns:repeat(2,1fr);gap:10px 18px;padding:8px 12px}
.a3-pn{font-weight:800;font-size:11px}
.a3-pd{font-size:9px;color:var(--mut);margin-bottom:2px}
.a3-svg{width:100%;height:auto;display:block}
.a3-t-cap{font-size:9px;font-weight:700;fill:#1c1917}
.a3-t-fuerte{fill:#15803d}
.a3-t-mut{font-size:7.5px;fill:#78716c}
.a3-t-eje{font-size:8px;fill:#78716c}
.a3-t-lbl{font-size:8.5px;font-weight:700;fill:#1c1917}
.a3-ley{display:flex;gap:14px;flex-wrap:wrap;align-items:center;padding:6px 10px;border-top:1px solid var(--ln);font-size:9px;color:var(--mut)}
.a3-ley i{display:inline-block;width:12px;height:8px;margin-right:4px;vertical-align:middle}
.a3-kpis{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;padding:8px 10px}
.a3-kpi{border:1.5px solid;padding:6px 9px}
.a3-kpi .k{font-size:8.5px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--mut)}
.a3-kpi .v{font-size:21px;font-weight:900;font-variant-numeric:tabular-nums;line-height:1.15}
.a3-kpi .s{font-size:9px;color:var(--mut)}
.a3-tb{width:100%;border-collapse:collapse;font-variant-numeric:tabular-nums}
.a3-tb th{font-size:8.5px;text-transform:uppercase;letter-spacing:.05em;color:var(--mut);text-align:right;padding:4px 8px;border-bottom:1px solid #57534e}
.a3-tb th:first-child,.a3-tb td:first-child{text-align:left}
.a3-tb td{padding:4px 8px;border-bottom:1px solid var(--ln);text-align:right;font-size:10.5px}
.a3-tb tr.sub td:first-child{padding-left:18px;color:var(--mut)}
.a3-tb tr.tot td{font-weight:800;background:var(--bg2);border-bottom:1px solid #57534e}
.a3-est{display:inline-block;border:1px solid;padding:1px 6px;font-size:9px;font-weight:700;border-radius:2px;white-space:nowrap}
.a3-lec{padding:4px 10px 8px;font-size:9.5px;color:var(--mut)}
.a3-et2{margin-top:10px;border:1px dashed #a8a29e;padding:10px 12px;font-size:10px;color:var(--mut)}
.a3-firmas{display:grid;grid-template-columns:repeat(4,1fr);border:1px solid #a8a29e;margin-top:10px}
.a3-firmas>div{padding:8px 12px;border-left:1px solid var(--ln);min-height:78px}
.a3-firmas>div:first-child{border-left:none}
.a3-fn{font-weight:700;font-size:11px;margin-top:16px;min-height:14px}
.a3-fc{font-size:9.5px;color:var(--mut);margin-top:3px;min-height:12px}
.a3-firmas input{width:100%;border:none;border-bottom:1px dashed var(--ln);background:transparent;color:var(--tx);font:inherit;padding:1px 0}
.a3-firmas input:focus{outline:2px solid #16a34a;outline-offset:1px}
`;}

function _a3Hoja(d,imprimir){
  const f=d.frentes, F=_a3FirmasLeer();
  const hdr=`<div class="a3-hdr">
    <div>${_a3H((typeof EMPRESA!=='undefined'&&EMPRESA.nombre)||'')}</div>
    <div><div class="a3-tit">PLAN DE TRABAJO SEMANAL — CONTROL DE CAPAS</div>
      <div class="a3-sub"><b>Proyecto:</b> ${_a3H(_A3_PROYECTO)}</div>
      <div class="a3-sub"><b>Base:</b> capas y volúmenes del módulo Recrecimiento · avance del historial de capas</div></div>
    <div><div class="a3-hk">Semana</div><div class="a3-hv">${d.num?'S-'+d.num:'—'}</div><div class="a3-hs">${_a3Dia(d.semIni)} — ${_a3Dia(d.fin)}</div></div>
    <div><div class="a3-hk">Corte topográfico</div><div class="a3-hv">${_a3Dia(d.corte)}</div><div class="a3-hs">último avance registrado</div></div>
    <div><div class="a3-hk">Avance físico acum.</div><div class="a3-hv">${_a3N(d.pct,1)} %</div><div class="a3-hs">${_a3N(d.acum)} / ${_a3N(d.vol)} m³</div></div>
    <div><div class="a3-hk">Fecha meta</div><div class="a3-hv">${_a3Dia(d.meta)}</div><div class="a3-hs">${d.semRest==null?'definir en Cronograma':d.semRest+' semana'+(d.semRest===1?'':'s')+' restantes'}</div></div>
  </div>`;

  const perf=f.filter(x=>x.capas.length||!x.sub).map(x=>`<div>
      <div class="a3-pn">${_a3H(x.n)}</div>
      <div class="a3-pd">${x.capas.length} capas · ${x.construidas} construidas · ${x.enAvance} en avance · ${_a3N(x.pct,1)} % vol.</div>
      ${_a3Perfil(x)}</div>`).join('');
  const b1=`<div class="a3-box">
    <div class="a3-bh"><span class="a3-bn">01</span><span class="a3-bt">Estado físico por frente — perfil de capas</span><span class="a3-bf">Generado desde las capas de Recrecimiento</span></div>
    <div class="a3-perfiles">${perf}</div>
    <div class="a3-ley"><span><i style="background:${_A3_COL.hecha}"></i>Construida (100 %)</span><span><i style="background:${_A3_COL.avance}"></i>En avance</span><span><i style="background:${_A3_COL.falta}"></i>Por construir</span>
      <span style="margin-left:auto">Cotas en m.s.n.m. · volúmenes en m³ · al ${_a3Dia(d.fin)}</span></div>
  </div>`;

  const kpi=(t,v,s,c)=>`<div class="a3-kpi" style="border-color:${c}"><div class="k">${t}</div><div class="v" style="color:${c}">${v}</div><div class="s">${s}</div></div>`;
  const cBre=d.brecha==null?'#dc2626':d.brecha<=1?'#16a34a':d.brecha<=1.5?'#d97706':'#dc2626';
  const kpis=`<div class="a3-kpis">
    ${kpi('Ritmo logrado',_a3N(d.sem),'m³ en la semana',d.sem>0?'#16a34a':'#dc2626')}
    ${kpi('Ritmo requerido',d.requerido==null?'—':_a3N(d.requerido),d.requerido==null?'falta fecha meta':'m³ / semana a '+_lpsFmt(d.meta),'#2563eb')}
    ${kpi('Brecha',d.brecha==null?(d.requerido===0?'—':'Sin avance'):_a3N(d.brecha,1)+'×',d.brecha==null?'no hubo avance esta semana':d.brecha<=1?'el ritmo alcanza':'factor de aceleración',cBre)}
  </div>`;
  const filas=f.map(x=>`<tr class="${x.sub?'sub':''}"><td>${x.sub?'— ':''}${_a3H(x.n)}</td><td>${_a3N(x.vol,2)}</td><td>${_a3N(x.acum,2)}</td><td>${_a3N(x.sem,2)}</td><td>${_a3N(x.saldo,2)}</td><td>${x.req==null?'—':_a3N(x.req,0)}</td><td>${_a3N(x.pct,1)} %</td>
    <td><span class="a3-est" style="color:${x.est.c};border-color:${x.est.c}">${x.est.t}</span></td></tr>`).join('');
  const tabla=`<table class="a3-tb"><thead><tr><th>Frente</th><th>Vol. total</th><th>Acumulado</th><th>Avance sem.</th><th>Saldo</th><th>Req./sem</th><th>% ejec.</th><th>Estado</th></tr></thead>
    <tbody>${filas}<tr class="tot"><td>TOTAL</td><td>${_a3N(d.vol,2)}</td><td>${_a3N(d.acum,2)}</td><td>${_a3N(d.sem,2)}</td><td>${_a3N(d.saldo,2)}</td><td>${d.requerido==null?'—':_a3N(d.requerido,0)}</td><td>${_a3N(d.pct,1)} %</td><td></td></tr></tbody></table>`;
  const lectura=d.saldo<=0?'Todas las capas registradas están construidas.'
    :d.requerido==null?'Defina la fecha fin del proyecto en la pestaña Cronograma para calcular el ritmo requerido.'
    :d.sem<=0?`Esta semana no hubo avance registrado; para llegar a la meta hacen falta ${_a3N(d.requerido)} m³ por semana.`
    :d.brecha<=1?`El ritmo de esta semana (${_a3N(d.sem)} m³) alcanza para cerrar el saldo a la fecha meta.`
    :`Para llegar a la meta hay que producir ${_a3N(d.brecha,1)} veces lo logrado esta semana (${_a3N(d.requerido)} m³/sem frente a ${_a3N(d.sem)}).`;
  const b2=`<div class="a3-box">
    <div class="a3-bh"><span class="a3-bn">02</span><span class="a3-bt">Avance y ritmo de producción</span><span class="a3-bf">Fuente: historial de capas</span></div>
    ${kpis}<div style="padding:0 10px">${tabla}</div>
    <div style="padding:8px 10px 0">${_a3Curva(d)}</div>
    <div class="a3-lec"><b>Lectura:</b> ${lectura}</div>
  </div>`;

  const et2=`<div class="a3-et2"><b>03 Compromiso semanal por capa</b> y <b>04 Confiabilidad de la planificación (PPC)</b> — se agregan en la etapa 2.</div>`;

  const firmas=`<div class="a3-firmas">${_A3_FIRMAS.map(x=>{
    const v=F[x.k]||{};
    return`<div><div class="a3-hk">${x.t}</div>${imprimir
      ?`<div class="a3-fn">${_a3H(v.n||'')}</div><div class="a3-fc">${_a3H(v.c||'')}</div>`
      :`<div class="a3-fn"><input value="${_a3H(v.n||'')}" placeholder="Nombre" aria-label="${x.t}: nombre" onchange="_a3FirmaSet('${x.k}','n',this.value)"></div>
        <div class="a3-fc"><input value="${_a3H(v.c||'')}" placeholder="Cargo" aria-label="${x.t}: cargo" onchange="_a3FirmaSet('${x.k}','c',this.value)"></div>`}</div>`;
  }).join('')}</div>`;

  return`<div class="a3p">${hdr}<div class="a3-grid">${b1}${b2}</div>${et2}${firmas}</div>`;
}

// ── Pestaña ───────────────────────────────────────────────────────────────
function _a3Render(c){
  if(!_lpsSemana)_lpsSemana=_lpsWeekStart();
  const d=_a3Datos(_lpsSemana);
  const btn='background:var(--panel2);border:1px solid var(--border);border-radius:6px;color:var(--text);padding:.3rem .7rem;font-size:.8rem;cursor:pointer';
  const sinCapas=!(DB.capas||[]).length;
  c.innerHTML=`<style>${_a3Css()}</style>
  <div style="display:flex;gap:.5rem;align-items:center;flex-wrap:wrap;margin:.6rem 0">
    <button style="${btn}" onclick="_a3Semana(-7)" aria-label="Semana anterior">◀</button>
    <div style="font-weight:700;font-size:.85rem;min-width:170px;text-align:center">${d.num?'S-'+d.num+' · ':''}${_lpsFmtSem(_lpsSemana)}</div>
    <button style="${btn}" onclick="_a3Semana(7)" aria-label="Semana siguiente">▶</button>
    <button style="${btn}" onclick="_a3Semana(0)">Esta semana</button>
    <span style="font-size:.72rem;color:var(--muted2)">Los nombres de las firmas se guardan en este navegador.</span>
    <button onclick="_a3Imprimir()" style="margin-left:auto;background:rgba(16,185,129,.12);border:1px solid #10b98150;border-radius:6px;color:#10b981;padding:.3rem .8rem;font-size:.78rem;cursor:pointer;font-weight:600">🖨 Imprimir A3</button>
  </div>
  ${sinCapas?`<div style="padding:1rem;border:1px solid #f59e0b;border-radius:6px;color:#f59e0b;margin-bottom:.6rem">No hay capas registradas. Cárguelas en el módulo Recrecimiento.</div>`:''}
  <div style="overflow-x:auto">${_a3Hoja(d,false)}</div>`;
}
function _a3Semana(n){
  _lpsSemana=n===0?_lpsWeekStart():_lpsAddDays(_lpsSemana,n);
  try{localStorage.setItem('_lpsSemana',_lpsSemana);}catch(e){}
  _lpsRenderTab();
}
function _a3Excel(){
  if(!window.XLSX){toast('Librería Excel no cargada, intenta en segundos',true);return;}
  const d=_a3Datos(_lpsSemana||_lpsWeekStart());
  const r2=v=>Math.round((+v||0)*100)/100;
  const res=[[`Plan semanal ${d.num?'S-'+d.num+' ':''}${_a3Dia(d.semIni)} – ${_a3Dia(d.fin)} · meta ${_a3Dia(d.meta)}`],[],
    ['Frente','Vol. total m³','Acumulado m³','Avance semana m³','Saldo m³','Requerido m³/sem','% ejec.','Estado'],
    ...d.frentes.map(x=>[x.n,r2(x.vol),r2(x.acum),r2(x.sem),r2(x.saldo),x.req==null?'':r2(x.req),r2(x.pct),x.est.t.replace(/^[✓✕!] /,'')]),
    ['TOTAL',r2(d.vol),r2(d.acum),r2(d.sem),r2(d.saldo),d.requerido==null?'':r2(d.requerido),r2(d.pct),'']];
  const cap=[['Frente','Capa','Cota','Vol. m³','% al corte','Avance semana m³']];
  d.frentes.forEach(x=>x.capas.forEach(c=>cap.push([x.n,c.nombre,c.cota||'',r2(c.vol),r2(c.pct),r2(c.semM3)])));
  const wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(res),'Avance y ritmo');
  XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(cap),'Capas');
  XLSX.writeFile(wb,`Plan_Semanal_A3_${d.semIni}.xlsx`);
  toast('✓ Excel descargado');
}
function _a3Imprimir(){
  const d=_a3Datos(_lpsSemana||_lpsWeekStart());
  const html=`<!DOCTYPE html><html lang="es"><head><meta charset="utf-8">
<title>Plan semanal A3 ${d.num?'S-'+d.num:_lpsFmtSem(d.semIni)}</title>
<style>@page{size:A3 landscape;margin:8mm}html,body{margin:0;background:#fff}
${_a3Css()}.a3p{border:none;padding:0;min-width:0}</style></head>
<body>${_a3Hoja(d,true)}</body></html>`;
  const win=window.open('','_blank');
  if(!win){toast('Active ventanas emergentes para imprimir',true);return;}
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(()=>win.print(),500);
}
