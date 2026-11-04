// ══════════════════════════════════════════════════════════════════════════
//  ROSTER · POR TURNO
//
//  El mismo día programado que el cuadro de Guardias FBNV, pero ordenado por
//  la situación de cada persona en vez de por guardia: quiénes están de turno
//  día, quiénes de noche, quiénes de día libre, quiénes con descanso médico y
//  el resto (falta, permiso, vacaciones, licencias). Cada lista lleva al lado
//  la guardia de la persona.
//
//  La jornada sale de _gdTiposRoster (js/guardiasFbnv.js): el ciclo de la
//  guardia más los días cambiados a mano. Es lo programado, no la asistencia.
//
//  Prefijo _rtn.
// ══════════════════════════════════════════════════════════════════════════

const _RTN_SEC=[
  {k:'dia',  l:'TURNO DÍA',       tipos:['TD','DLT','A5'],          c:'#2563eb',bg:'#DDEBF7',col:'0000FF'},
  {k:'noche',l:'TURNO NOCHE',     tipos:['TN'],                     c:'#1e3a8a',bg:'#D9E1F2',col:'002060'},
  {k:'libre',l:'DÍAS LIBRES',     tipos:['DL'],                     c:'#6b7280',bg:'#EDEDED',col:'595959'},
  {k:'dm',   l:'DESCANSO MÉDICO', tipos:['DM'],                     c:'#ef4444',bg:'#FCE4D6',col:'C00000'},
  {k:'otros',l:'OTROS',           tipos:null,                       c:'#f59e0b',bg:'#FFF2CC',col:'7F6000'}
];
const _RTN_OTROS_TXT='F falta · P permiso · V vacaciones · LP / LM / LF licencias';
const _RTN_GCOL={A:'#f59e0b',B:'#a855f7',C:'#10b981'};
let _rtnFecha='';

function _rtnSecDe(t){
  const s=_RTN_SEC.find(x=>x.tipos&&x.tipos.includes(t));
  return s?s.k:'otros';
}

function _rtnDatos(){
  const fecha=_rtnFecha||today();
  const tipoDe=(typeof _gdTiposRoster==='function')?_gdTiposRoster(fecha):{};
  const sec={};_RTN_SEC.forEach(s=>sec[s.k]=[]);
  (DB.personal||[]).forEach(p=>{
    if((p.est||'Activo')!=='Activo')return;
    const t=tipoDe[p.id];
    if(!t)return;
    const g=String(p.guardia||'').trim().toUpperCase();
    sec[_rtnSecDe(t)].push({p,tipo:t,guardia:g,cargo:(p.cargo||'SIN CARGO').toUpperCase().trim()});
  });
  // Por cargo (el mismo orden que el cuadro de guardias), luego guardia y nombre
  const ord=typeof _gdOrdenIdx==='function'?_gdOrdenIdx:()=>0;
  Object.values(sec).forEach(a=>a.sort((x,y)=>ord(x.cargo)-ord(y.cargo)||x.cargo.localeCompare(y.cargo,'es')
    ||x.guardia.localeCompare(y.guardia)||`${x.p.ape} ${x.p.nom}`.localeCompare(`${y.p.ape} ${y.p.nom}`,'es')));
  const total=Object.values(sec).reduce((s,a)=>s+a.length,0);
  return{fecha,sec,total};
}

const _rtnEsc=s=>typeof _gdEsc==='function'?_gdEsc(s):String(s==null?'':s);
const _rtnDMY=f=>typeof _gdDMY==='function'?_gdDMY(f):f;
const _rtnDni=()=>typeof _gdDni!=='undefined'&&_gdDni;
const _rtnDniDe=p=>String(p&&p.dni!=null?p.dni:'').trim();

// Cuántos de cada guardia hay en una lista: «A 12 · B 30 · C 1»
function _rtnPorGuardia(lista){
  const n={};lista.forEach(it=>{n[it.guardia||'—']=(n[it.guardia||'—']||0)+1;});
  return Object.keys(n).sort().map(g=>({g,n:n[g]}));
}

function _rtnTabla(s,lista){
  const dni=_rtnDni();
  const nc=dni?6:5;
  const filas=lista.map((it,i)=>{
    const gc=_RTN_GCOL[it.guardia]||'#64748b';
    return`<tr>
      <td class="gd-n">${i+1}</td>
      <td class="gd-c" style="text-align:left">${_rtnEsc(it.cargo)}</td>
      <td class="gd-p" style="color:#${s.col}">${_rtnEsc(`${it.p.ape}, ${it.p.nom}`.toUpperCase())}</td>
      ${dni?`<td class="gd-d">${_rtnEsc(_rtnDniDe(it.p))}</td>`:''}
      <td class="gd-tu" style="color:${gc}">${it.guardia?_rtnEsc(it.guardia):'—'}</td>
      <td class="gd-tu" style="color:#${s.col}">${_rtnEsc(it.tipo)}</td>
    </tr>`;
  }).join('');
  const pg=_rtnPorGuardia(lista).map(x=>`<span style="color:${_RTN_GCOL[x.g]||'#475569'}">GUARDIA ${_rtnEsc(x.g)}: ${x.n}</span>`).join(' · ');
  return`<div class="gd-blk">
    <table class="gd-t">
      <thead>
        <tr><th colspan="${nc}" class="gd-g" style="background:${s.bg}">${s.l} · ${lista.length}</th></tr>
        <tr><th class="gd-h" style="background:${s.bg};width:40px">ITEM</th>
            <th class="gd-h" style="background:${s.bg};width:150px">CARGO</th>
            <th class="gd-h" style="background:${s.bg}">APELLIDOS Y NOMBRES</th>
            ${dni?`<th class="gd-h" style="background:${s.bg};width:62px">DNI</th>`:''}
            <th class="gd-h" style="background:${s.bg};width:58px">GUARDIA</th>
            <th class="gd-h" style="background:${s.bg};width:46px">TURNO</th></tr>
      </thead>
      <tbody>${filas||`<tr><td colspan="${nc}" class="gd-vacio">Nadie en esta situación ese día</td></tr>`}</tbody>
      ${lista.length?`<tfoot><tr><td colspan="${nc}" class="gd-tot" style="text-align:left">${pg}</td></tr></tfoot>`:''}
    </table>
  </div>`;
}

function rRosterTurnos(){
  const cont=document.getElementById('rtnBody');if(!cont)return;
  const d=_rtnDatos();
  _rtnFecha=d.fecha;
  const kpis=_RTN_SEC.map(s=>{
    const lista=d.sec[s.k];
    const pg=_rtnPorGuardia(lista).map(x=>{const cc=_RTN_GCOL[x.g]||'#64748b';
      return`<span style="background:${cc}26;color:${cc};border:1px solid ${cc}66;border-radius:4px;padding:0 6px;font-size:.63rem;font-weight:800">${_rtnEsc(x.g)} ${x.n}</span>`;}).join('');
    return`<div class="kpi" style="--kc:${s.c};flex:1;min-width:150px">
      <div class="kpi-lbl">${s.l}</div>
      <div class="kpi-val" style="font-size:1.8rem">${lista.length}</div>
      <div style="display:flex;gap:.3rem;flex-wrap:wrap;margin-top:.25rem">${pg||'<span class="kpi-sub">—</span>'}</div>
    </div>`;
  }).join('');
  const btn='background:var(--panel);border:1px solid var(--border);border-radius:6px;color:var(--text);padding:.18rem .5rem;font-size:.72rem;cursor:pointer';
  const [dia,noche,libre,dm,otros]=_RTN_SEC.map(s=>_rtnTabla(s,d.sec[s.k]));
  cont.innerHTML=`
    <div class="kpi-row">${kpis}</div>
    <div style="display:flex;align-items:center;gap:.6rem;flex-wrap:wrap;margin-bottom:.8rem;padding:.45rem .7rem;background:var(--panel2);border:1px solid var(--border);border-radius:8px">
      <span style="font-size:.72rem;color:var(--muted2)">Fecha:</span>
      <input type="date" id="rtnFecha" value="${d.fecha}" onchange="_rtnIr(this.value)" class="date-ic-azul"
        style="background:var(--panel);border:1px solid var(--border);border-radius:6px;color:var(--text);padding:.22rem .5rem;font-size:.75rem;color-scheme:dark">
      <button onclick="_rtnSaltar(-1)" title="Día anterior" style="${btn}">◀</button>
      <button onclick="_rtnIr(today())" style="background:rgba(245,158,11,.12);border:1px solid rgba(245,158,11,.3);border-radius:6px;color:#f59e0b;padding:.18rem .6rem;font-size:.7rem;font-weight:700;cursor:pointer">Hoy</button>
      <button onclick="_rtnSaltar(1)" title="Día siguiente" style="${btn}">▶</button>
      <label style="display:inline-flex;align-items:center;gap:.3rem;font-size:.73rem;color:var(--muted2);cursor:pointer" title="Agrega la columna DNI (es el mismo ajuste del cuadro de Guardias FBNV)">
        <input type="checkbox" ${_rtnDni()?'checked':''} onchange="_gdToggleDni(this.checked);rRosterTurnos()" style="width:auto;margin:0;cursor:pointer"> DNI
      </label>
      <span style="font-size:.68rem;color:var(--muted)">Programado · no es la asistencia real · ${d.total} personas</span>
      <button onclick="_rtnExcel()" style="margin-left:auto;background:#166534;color:#fff;border:none;border-radius:7px;padding:.32rem .9rem;font-size:.78rem;font-weight:700;cursor:pointer">📊 Exportar Excel</button>
      <button onclick="_rtnPrint()" style="background:#1e3a5f;color:#fff;border:none;border-radius:7px;padding:.32rem .9rem;font-size:.78rem;font-weight:700;cursor:pointer">🖨️ PDF</button>
    </div>
    <style>${typeof _GD_CSS!=='undefined'?_GD_CSS:''}
      .rtn-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;align-items:start}
      .rtn-col{display:flex;flex-direction:column;gap:10px}
      @media (max-width:1100px){.rtn-grid{grid-template-columns:1fr}}</style>
    <div class="gd-doc">
      <div class="gd-tit">PERSONAL POR TURNO</div>
      <div class="gd-sub">PROGRAMACIÓN DEL ROSTER · ${_rtnDMY(d.fecha)}</div>
      <div class="rtn-grid">
        <div class="rtn-col">${dia}</div>
        <div class="rtn-col">${noche}${libre}${dm}${otros}</div>
      </div>
      <div class="gd-ley">
        <strong>Leyenda:</strong>
        <span style="color:#0000FF">TD — Trabajo Día · DLT — Día libre trabajado · A5 — Anexo 5</span>
        <span style="color:#002060">TN — Trabajo Noche</span>
        <span style="color:#595959">DL — Día Libre</span>
        <span style="color:#C00000">DM — Descanso Médico</span>
        <span style="color:#7F6000">Otros — ${_RTN_OTROS_TXT}</span>
      </div>
    </div>`;
}

function _rtnIr(f){_rtnFecha=f||today();rRosterTurnos();}
function _rtnSaltar(n){
  const f=new Date((_rtnFecha||today())+'T12:00:00');
  f.setDate(f.getDate()+n);
  _rtnIr(f.toISOString().slice(0,10));
}

function _rtnPrint(){
  const doc=document.getElementById('rtnBody')?.querySelector('.gd-doc');
  if(!doc){toast('Nada que imprimir',true);return;}
  const w=window.open('','_blank','width=1200,height=780');
  if(!w){toast('Active las ventanas emergentes para imprimir',true);return;}
  w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Personal por turno</title><style>
    @page{size:A4 landscape;margin:.7cm}
    *{box-sizing:border-box;margin:0;padding:0;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}
    body{background:#fff}
    ${typeof _GD_CSS!=='undefined'?_GD_CSS:''}
    .gd-doc{box-shadow:none;padding:0;border-radius:0}
    .rtn-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:6px;align-items:start}
    .rtn-col{display:flex;flex-direction:column;gap:6px}
    .gd-t tr{page-break-inside:avoid}
  </style></head><body>${doc.outerHTML}
  <script>window.onload=()=>window.print();<\/script></body></html>`);
  w.document.close();
}

// Excel: una hoja con las cinco listas una debajo de otra
function _rtnExcel(){
  if(typeof XLSX==='undefined'){toast('Librería Excel no disponible',true);return;}
  const d=_rtnDatos();
  if(!d.total){toast('No hay personal programado ese día',true);return;}
  const dni=_rtnDni();
  const cab=['ITEM','CARGO','APELLIDOS Y NOMBRES',...(dni?['DNI']:[]),'GUARDIA','TURNO'];
  const aoa=[[`PERSONAL POR TURNO — PROGRAMACIÓN DEL ROSTER · ${_rtnDMY(d.fecha)}`],[]];
  const merges=[{s:{r:0,c:0},e:{r:0,c:cab.length-1}}];
  _RTN_SEC.forEach(s=>{
    const lista=d.sec[s.k];
    merges.push({s:{r:aoa.length,c:0},e:{r:aoa.length,c:cab.length-1}});
    aoa.push([`${s.l} · ${lista.length}`]);
    aoa.push(cab);
    if(!lista.length)aoa.push(['','Nadie en esta situación ese día']);
    lista.forEach((it,i)=>aoa.push([i+1,it.cargo,`${it.p.ape}, ${it.p.nom}`.toUpperCase(),
      ...(dni?[_rtnDniDe(it.p)]:[]),it.guardia||'—',it.tipo]));
    if(lista.length)aoa.push(['',_rtnPorGuardia(lista).map(x=>`GUARDIA ${x.g}: ${x.n}`).join(' · ')]);
    aoa.push([]);
  });
  const ws=XLSX.utils.aoa_to_sheet(aoa);
  ws['!merges']=merges;
  ws['!cols']=[{wch:6},{wch:30},{wch:42},...(dni?[{wch:11}]:[]),{wch:9},{wch:8}];
  const wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,ws,'Por turno');
  XLSX.writeFile(wb,`Personal por turno ${d.fecha}.xlsx`);
}
