// ══════════════════════════════════════════════════════════════════════════
//  CONSUMO DE INSUMOS EN AUXILIOS MECÁNICOS  (módulo de Almacén)
//  Vista de solo lectura del detalle de insumos usados en los auxilios,
//  por período 21→20, por equipo o todos. Replica el formato del
//  "DETALLE DE DESCUENTOS – A. CONSUMO DE INSUMOS" del EDP de proveedores.
// ══════════════════════════════════════════════════════════════════════════

let _iaOffset=0,_iaTodoPer=false,_iaTipo=null,_iaSub=null,_iaEqId=null;
let _iaOrigen='ALMACEN';     // 'ALMACEN' | 'TODOS' | nombre exacto del proveedor
let _iaVista='detalle';      // 'detalle' | 'insumo' | 'equipo'
let _iaBuscar='';

const _IA_MESES=['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
function _iaN2(n){return Number(n||0).toLocaleString('es-PE',{minimumFractionDigits:2,maximumFractionDigits:2});}
function _iaEsc(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function _iaDMY(f){const p=String(f||'').split('-');return p.length===3?`${p[2]}/${p[1]}/${p[0]}`:(f||'');}

// Período 21 → 20 (mismo criterio que Auxilios Mecánicos, con su propio desplazamiento)
function _iaPeriodo(){
  const hoy=new Date(),d=hoy.getDate();
  let baseY=hoy.getFullYear(),baseM=hoy.getMonth();
  if(d<21){baseM--;if(baseM<0){baseM=11;baseY--;}}
  let iniM=baseM+_iaOffset,iniY=baseY;
  while(iniM>11){iniM-=12;iniY++;}
  while(iniM<0){iniM+=12;iniY--;}
  const ini=new Date(iniY,iniM,21),fin=new Date(iniY,iniM+1,20);
  const f=x=>`${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}-${String(x.getDate()).padStart(2,'0')}`;
  return{desde:f(ini),hasta:f(fin),label:`${_IA_MESES[fin.getMonth()]} ${fin.getFullYear()}`,dias:Math.round((fin-ini)/864e5)+1};
}

// Todas las líneas de insumo del período, ya cruzadas con auxilio, equipo y P.U.R. del catálogo
function _iaLineas(){
  const per=_iaPeriodo();
  const eqById=id=>(DB.equipos||[]).find(e=>e.id===id);
  const auxs=(DB.auxiliosMecanicos||[]).filter(a=>a.est!=='Anulado'&&(_iaTodoPer||(a.fecha&&a.fecha>=per.desde&&a.fecha<=per.hasta)));
  const auxById={};auxs.forEach(a=>auxById[a.id]=a);
  const out=[];
  (DB.auxMecInsumos||[]).forEach(i=>{
    const a=auxById[i.auxilioId];if(!a)return;
    const eq=eqById(a.eqId);
    const cat=(DB.catalogoItems||[]).find(c=>String(c.cod).trim()===String(i.cod||'').trim());
    const pur=cat&&cat.pur?+cat.pur:0;
    const cant=+i.cant||0;
    out.push({
      auxId:a.id,auxCod:a.cod||'—',fecha:a.fecha||'',est:a.est||'',
      eqId:a.eqId,eqCod:eq?eq.codigo:'—',eqNom:eq?(eq.nombre||''):'',
      tipo:eq?(eq.tipo||'Otros'):'Otros',sub:eq?String(eq.sub||'Otros').toUpperCase():'OTROS',
      cod:i.cod||'',desc:i.desc||'—',und:i.und||'und',cant,
      origen:i.origen||'',pur,total:+(cant*pur).toFixed(2),
      proy:a.proy||''
    });
  });
  return out.sort((a,b)=>(a.fecha||'').localeCompare(b.fecha||'')||(a.auxCod||'').localeCompare(b.auxCod||''));
}

function _iaEsAlmacen(o){return /ALMAC/i.test(o||'');}
function _iaFiltraOrigen(l){
  if(_iaOrigen==='TODOS')return l;
  if(_iaOrigen==='ALMACEN')return l.filter(r=>_iaEsAlmacen(r.origen));
  return l.filter(r=>String(r.origen||'').trim()===_iaOrigen);
}

function _iaNav(dir){_iaOffset+=dir;_iaTodoPer=false;rInsumosAux();}
function _iaTogglePeriodo(){_iaTodoPer=!_iaTodoPer;rInsumosAux();}
function _iaSelTipo(t){if(_iaTipo===t){_iaTipo=null;_iaSub=null;_iaEqId=null;}else{_iaTipo=t;_iaSub=null;_iaEqId=null;}rInsumosAux();}
function _iaSelSub(s){if(_iaSub===s){_iaSub=null;_iaEqId=null;}else{_iaSub=s;_iaEqId=null;}rInsumosAux();}
function _iaSelEq(id){_iaEqId=_iaEqId===id?null:id;rInsumosAux();}
function _iaSetOrigen(v){_iaOrigen=v;rInsumosAux();}
function _iaSetVista(v){_iaVista=v;rInsumosAux();}
function _iaBuscarInput(v){
  _iaBuscar=v;
  const q=v.toLowerCase().trim();
  document.querySelectorAll('#iaTbody tr').forEach(tr=>{tr.style.display=(!q||(tr.dataset.s||'').includes(q))?'':'none';});
}

// Chip genérico
function _iaChip(txt,n,activo,color,onclick,mono){
  return`<button onclick="${onclick}" style="display:inline-flex;align-items:center;gap:.4rem;padding:.32rem .75rem;border-radius:20px;cursor:pointer;font-size:.74rem;font-weight:700;${mono?'font-family:monospace;':''}border:1.5px solid ${activo?color:'var(--border)'};background:${activo?color+'26':'var(--panel2)'};color:${activo?color:'var(--muted2)'}">${txt}${n!=null?`<span style="font-size:.62rem;opacity:.8">${n}</span>`:''}${activo?'<span style="font-size:.7rem">✕</span>':''}</button>`;
}

function rInsumosAux(){
  const cont=document.getElementById('iaBody');if(!cont)return;
  const per=_iaPeriodo();
  const todas=_iaFiltraOrigen(_iaLineas());

  // Cascada tipo → subtipo → equipo, contada sobre las líneas del período
  const tiposMap={};
  todas.forEach(r=>{
    if(!tiposMap[r.tipo])tiposMap[r.tipo]={n:0,subs:{}};
    tiposMap[r.tipo].n++;
    if(!tiposMap[r.tipo].subs[r.sub])tiposMap[r.tipo].subs[r.sub]={n:0,eqs:{}};
    tiposMap[r.tipo].subs[r.sub].n++;
    if(r.eqId){
      const e=tiposMap[r.tipo].subs[r.sub].eqs;
      if(!e[r.eqId])e[r.eqId]={cod:r.eqCod,n:0};
      e[r.eqId].n++;
    }
  });
  if(_iaTipo&&!tiposMap[_iaTipo]){_iaTipo=null;_iaSub=null;_iaEqId=null;}
  if(_iaSub&&(!_iaTipo||!tiposMap[_iaTipo].subs[_iaSub])){_iaSub=null;_iaEqId=null;}
  if(_iaEqId&&_iaSub&&!tiposMap[_iaTipo].subs[_iaSub].eqs[_iaEqId])_iaEqId=null;

  const lista=todas.filter(r=>{
    if(_iaEqId)return r.eqId===_iaEqId;
    if(!_iaTipo)return true;
    if(_iaSub)return r.tipo===_iaTipo&&r.sub===_iaSub;
    return r.tipo===_iaTipo;
  });

  const totVal=lista.reduce((s,r)=>s+r.total,0);
  const sinPur=lista.filter(r=>!r.pur).length;
  const kpis=[
    {l:'Líneas de Consumo',v:lista.length,c:'#f97316',ic:'📦',sub:_iaTodoPer?'todo el historial':'en el período'},
    {l:'Auxilios Involucrados',v:new Set(lista.map(r=>r.auxId)).size,c:'#8b5cf6',ic:'🚨',sub:new Set(lista.map(r=>r.eqId)).size+' equipos'},
    {l:'Ítems Distintos',v:new Set(lista.map(r=>r.cod||r.desc)).size,c:'#22d3ee',ic:'🔩',sub:'códigos de almacén'},
    {l:'Valorizado',v:'S/ '+_iaN2(totVal),c:'#10b981',ic:'💰',sub:sinPur?`${sinPur} sin P.U.R.`:'según P.U.R. del catálogo'}
  ];

  // Orígenes disponibles
  const origenes=[...new Set(_iaLineas().map(r=>String(r.origen||'').trim()).filter(o=>o&&!_iaEsAlmacen(o)))].sort();

  const tiposSorted=Object.entries(tiposMap).sort((a,b)=>b[1].n-a[1].n);
  const chipsTipo=`<div style="display:flex;align-items:center;gap:.4rem;flex-wrap:wrap;margin-bottom:.5rem">
    <span style="font-size:.6rem;color:var(--muted2);font-weight:700;text-transform:uppercase;letter-spacing:.08em;margin-right:.2rem">Tipo de equipo</span>
    ${_iaChip('Todos',null,!_iaTipo,'#8b5cf6',"_iaTipo=null;_iaSub=null;_iaEqId=null;rInsumosAux()")}
    ${tiposSorted.map(([t,d])=>_iaChip(_iaEsc(t),d.n,_iaTipo===t,'#ec4899',`_iaSelTipo('${_iaEsc(t).replace(/'/g,"\\'")}')`)).join('')}
  </div>`;
  let chipsSub='',chipsEq='';
  if(_iaTipo&&tiposMap[_iaTipo]){
    const subs=Object.entries(tiposMap[_iaTipo].subs).sort((a,b)=>b[1].n-a[1].n);
    chipsSub=`<div style="display:flex;align-items:center;gap:.4rem;flex-wrap:wrap;margin-bottom:.5rem;padding:.45rem .6rem;background:var(--panel2);border:1px solid var(--border);border-radius:10px">
      <span style="font-size:.6rem;color:var(--muted2);font-weight:700;text-transform:uppercase;letter-spacing:.08em">↳ Subtipo</span>
      ${subs.map(([s,d])=>_iaChip(_iaEsc(s),d.n,_iaSub===s,'#a78bfa',`_iaSelSub('${_iaEsc(s).replace(/'/g,"\\'")}')`)).join('')}
    </div>`;
    if(_iaSub&&tiposMap[_iaTipo].subs[_iaSub]){
      const eqs=Object.entries(tiposMap[_iaTipo].subs[_iaSub].eqs).sort((a,b)=>b[1].n-a[1].n);
      chipsEq=`<div style="display:flex;align-items:center;gap:.4rem;flex-wrap:wrap;margin-bottom:.5rem;padding:.45rem .6rem;background:var(--panel2);border:1px solid var(--border);border-radius:10px">
        <span style="font-size:.6rem;color:var(--muted2);font-weight:700;text-transform:uppercase;letter-spacing:.08em">↳ Equipo</span>
        ${eqs.map(([id,d])=>_iaChip(_iaEsc(d.cod),d.n,+_iaEqId===+id,'#ec4899',`_iaSelEq(${id})`,1)).join('')}
      </div>`;
    }
  }

  const TH='background:var(--panel2);color:var(--muted2);font-size:.62rem;font-weight:700;text-transform:uppercase;letter-spacing:.05em;padding:.4rem .5rem;white-space:nowrap';
  const TD='padding:.35rem .5rem;border-bottom:1px solid var(--border);font-size:.75rem';
  let tabla='';

  if(_iaVista==='detalle'){
    tabla=`<table style="width:100%;border-collapse:collapse;min-width:960px">
      <thead><tr>
        <th style="${TH}">#</th><th style="${TH}">Fecha</th><th style="${TH}">N° Auxilio</th>
        <th style="${TH}">Equipo</th><th style="${TH}">Código</th><th style="${TH};text-align:left">Descripción del Insumo</th>
        <th style="${TH}">Unid.</th><th style="${TH};text-align:right">Cant.</th>
        <th style="${TH};text-align:right">P. Unit S/</th><th style="${TH};text-align:right">Total S/</th>
        <th style="${TH}">Origen</th>
      </tr></thead>
      <tbody id="iaTbody">${lista.map((r,n)=>`<tr data-s="${_iaEsc((r.desc+' '+r.cod+' '+r.eqCod+' '+r.auxCod+' '+r.origen).toLowerCase())}" style="border-bottom:1px solid var(--border)">
        <td style="${TD};text-align:center;color:var(--muted2);font-size:.7rem">${n+1}</td>
        <td style="${TD};font-family:monospace;font-size:.72rem;white-space:nowrap">${_iaDMY(r.fecha)}</td>
        <td style="${TD};font-family:monospace;font-size:.7rem;color:#ec4899;white-space:nowrap">${_iaEsc(r.auxCod)}</td>
        <td style="${TD};font-family:monospace;font-size:.72rem;color:#22d3ee;white-space:nowrap" title="${_iaEsc(r.eqNom)}">${_iaEsc(r.eqCod)}</td>
        <td style="${TD};font-family:monospace;font-size:.7rem;color:var(--alm)">${_iaEsc(r.cod)||'—'}</td>
        <td style="${TD}"><strong>${_iaEsc(r.desc)}</strong></td>
        <td style="${TD};text-align:center;font-size:.7rem;color:var(--muted2)">${_iaEsc(r.und)}</td>
        <td style="${TD};text-align:right;font-weight:700">${_iaN2(r.cant)}</td>
        <td style="${TD};text-align:right;color:${r.pur?'var(--muted2)':'#ef4444'}">${r.pur?_iaN2(r.pur):'sin P.U.R.'}</td>
        <td style="${TD};text-align:right;font-weight:800;color:${r.total?'#10b981':'var(--muted)'}">${_iaN2(r.total)}</td>
        <td style="${TD};font-size:.68rem;color:${_iaEsAlmacen(r.origen)?'var(--alm)':'var(--muted2)'}">${_iaEsc(r.origen)||'—'}</td>
      </tr>`).join('')}</tbody>
      <tfoot><tr style="background:rgba(4,78,100,.14);border-top:2px solid var(--border)">
        <td colspan="7" style="${TD};text-align:right;font-weight:800;font-size:.72rem;color:var(--muted2)">TOTALES</td>
        <td style="${TD};text-align:right;font-weight:800">${_iaN2(lista.reduce((s,r)=>s+r.cant,0))}</td>
        <td></td>
        <td style="${TD};text-align:right;font-weight:900;color:#10b981">S/ ${_iaN2(totVal)}</td>
        <td></td>
      </tr></tfoot>
    </table>`;
  }else if(_iaVista==='insumo'){
    const g={};
    lista.forEach(r=>{
      const k=(r.cod||r.desc).toUpperCase();
      if(!g[k])g[k]={cod:r.cod,desc:r.desc,und:r.und,pur:r.pur,cant:0,total:0,veces:0,eqs:new Set(),auxs:new Set(),ult:''};
      const x=g[k];
      x.cant+=r.cant;x.total+=r.total;x.veces++;x.eqs.add(r.eqCod);x.auxs.add(r.auxId);
      if(r.fecha>x.ult)x.ult=r.fecha;
      if(!x.pur&&r.pur)x.pur=r.pur;
    });
    const filas=Object.values(g).sort((a,b)=>b.total-a.total||b.cant-a.cant);
    tabla=`<table style="width:100%;border-collapse:collapse;min-width:860px">
      <thead><tr>
        <th style="${TH}">#</th><th style="${TH}">Código</th><th style="${TH};text-align:left">Descripción del Insumo</th>
        <th style="${TH}">Unid.</th><th style="${TH};text-align:right">Cant. Total</th>
        <th style="${TH};text-align:center">Veces</th><th style="${TH};text-align:center">Equipos</th>
        <th style="${TH};text-align:right">P. Unit S/</th><th style="${TH};text-align:right">Total S/</th>
        <th style="${TH}">Último uso</th>
      </tr></thead>
      <tbody id="iaTbody">${filas.map((r,n)=>`<tr data-s="${_iaEsc((r.desc+' '+r.cod).toLowerCase())}" style="border-bottom:1px solid var(--border)">
        <td style="${TD};text-align:center;color:var(--muted2);font-size:.7rem">${n+1}</td>
        <td style="${TD};font-family:monospace;font-size:.7rem;color:var(--alm)">${_iaEsc(r.cod)||'—'}</td>
        <td style="${TD}"><strong>${_iaEsc(r.desc)}</strong></td>
        <td style="${TD};text-align:center;font-size:.7rem;color:var(--muted2)">${_iaEsc(r.und)}</td>
        <td style="${TD};text-align:right;font-weight:800;color:#f59e0b">${_iaN2(r.cant)}</td>
        <td style="${TD};text-align:center;font-size:.72rem">${r.veces}</td>
        <td style="${TD};text-align:center;font-size:.72rem;color:#22d3ee" title="${_iaEsc([...r.eqs].join(', '))}">${r.eqs.size}</td>
        <td style="${TD};text-align:right;color:${r.pur?'var(--muted2)':'#ef4444'}">${r.pur?_iaN2(r.pur):'—'}</td>
        <td style="${TD};text-align:right;font-weight:800;color:${r.total?'#10b981':'var(--muted)'}">${_iaN2(r.total)}</td>
        <td style="${TD};font-family:monospace;font-size:.7rem;color:var(--muted2)">${_iaDMY(r.ult)}</td>
      </tr>`).join('')}</tbody>
      <tfoot><tr style="background:rgba(4,78,100,.14);border-top:2px solid var(--border)">
        <td colspan="8" style="${TD};text-align:right;font-weight:800;font-size:.72rem;color:var(--muted2)">TOTAL VALORIZADO</td>
        <td style="${TD};text-align:right;font-weight:900;color:#10b981">S/ ${_iaN2(totVal)}</td><td></td>
      </tr></tfoot>
    </table>`;
  }else{
    const g={};
    lista.forEach(r=>{
      if(!g[r.eqId])g[r.eqId]={cod:r.eqCod,nom:r.eqNom,tipo:r.tipo,lineas:0,cant:0,total:0,auxs:new Set(),items:new Set()};
      const x=g[r.eqId];
      x.lineas++;x.cant+=r.cant;x.total+=r.total;x.auxs.add(r.auxId);x.items.add(r.cod||r.desc);
    });
    const filas=Object.entries(g).map(([id,v])=>({id,...v})).sort((a,b)=>b.total-a.total||b.lineas-a.lineas);
    tabla=`<table style="width:100%;border-collapse:collapse;min-width:760px">
      <thead><tr>
        <th style="${TH}">#</th><th style="${TH}">Equipo</th><th style="${TH};text-align:left">Descripción</th>
        <th style="${TH}">Tipo</th><th style="${TH};text-align:center">Auxilios</th>
        <th style="${TH};text-align:center">Ítems</th><th style="${TH};text-align:right">Líneas</th>
        <th style="${TH};text-align:right">Total S/</th><th style="${TH};text-align:right">% del total</th>
      </tr></thead>
      <tbody id="iaTbody">${filas.map((r,n)=>`<tr data-s="${_iaEsc((r.cod+' '+r.nom).toLowerCase())}" style="border-bottom:1px solid var(--border)">
        <td style="${TD};text-align:center;color:var(--muted2);font-size:.7rem">${n+1}</td>
        <td style="${TD};font-family:monospace;font-weight:700;color:#22d3ee">${_iaEsc(r.cod)}</td>
        <td style="${TD};font-size:.72rem;color:var(--muted2)">${_iaEsc(r.nom)||'—'}</td>
        <td style="${TD};font-size:.7rem">${_iaEsc(r.tipo)}</td>
        <td style="${TD};text-align:center;font-size:.72rem;color:#ec4899">${r.auxs.size}</td>
        <td style="${TD};text-align:center;font-size:.72rem">${r.items.size}</td>
        <td style="${TD};text-align:right;font-size:.72rem">${r.lineas}</td>
        <td style="${TD};text-align:right;font-weight:800;color:#10b981">${_iaN2(r.total)}</td>
        <td style="${TD};text-align:right;font-size:.72rem;color:var(--muted2)">${totVal?(r.total/totVal*100).toFixed(1):'0.0'}%</td>
      </tr>`).join('')}</tbody>
      <tfoot><tr style="background:rgba(4,78,100,.14);border-top:2px solid var(--border)">
        <td colspan="7" style="${TD};text-align:right;font-weight:800;font-size:.72rem;color:var(--muted2)">TOTAL VALORIZADO</td>
        <td style="${TD};text-align:right;font-weight:900;color:#10b981">S/ ${_iaN2(totVal)}</td><td></td>
      </tr></tfoot>
    </table>`;
  }

  const btnV=(k,txt)=>`<button onclick="_iaSetVista('${k}')" style="padding:.3rem .8rem;border-radius:7px;cursor:pointer;font-size:.74rem;font-weight:700;border:1.5px solid ${_iaVista===k?'var(--alm)':'var(--border)'};background:${_iaVista===k?'rgba(249,115,22,.16)':'var(--panel2)'};color:${_iaVista===k?'var(--alm)':'var(--muted2)'}">${txt}</button>`;

  cont.innerHTML=`
    <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:.6rem;margin-bottom:.9rem">
      <div style="font-size:.78rem;color:var(--muted2)">${_iaTodoPer?'Mostrando <strong style="color:var(--alm)">todo el historial</strong>':`Período 21→20 · <span class="mono">${per.desde}</span> al <span class="mono">${per.hasta}</span> · ${per.dias} días`}</div>
      <div style="display:flex;align-items:center;gap:.5rem">
        <div style="display:flex;align-items:center;background:var(--panel2);border:1px solid var(--border);border-radius:8px;overflow:hidden;${_iaTodoPer?'opacity:.45':''}">
          <button onclick="_iaNav(-1)" style="background:none;border:none;border-right:1px solid var(--border);color:var(--text);cursor:pointer;font-size:1.1rem;padding:.35rem .7rem;line-height:1">‹</button>
          <span style="font-weight:800;font-size:.88rem;min-width:130px;text-align:center;padding:0 .5rem">${per.label}</span>
          <button onclick="_iaNav(1)" style="background:none;border:none;border-left:1px solid var(--border);color:var(--text);cursor:pointer;font-size:1.1rem;padding:.35rem .7rem;line-height:1">›</button>
        </div>
        <button onclick="_iaTogglePeriodo()" style="padding:.35rem .8rem;border-radius:8px;cursor:pointer;font-size:.74rem;font-weight:700;border:1.5px solid ${_iaTodoPer?'var(--alm)':'var(--border)'};background:${_iaTodoPer?'rgba(249,115,22,.15)':'var(--panel2)'};color:${_iaTodoPer?'var(--alm)':'var(--muted2)'}">${_iaTodoPer?'✕ Ver por período':'📚 Todo el historial'}</button>
      </div>
    </div>
    <div class="kpi-row">${kpis.map(k=>`<div class="kpi" style="--kc:${k.c};flex:1;min-width:150px"><div style="display:flex;justify-content:space-between;align-items:flex-start"><span class="kpi-lbl">${k.l}</span><span style="font-size:1.25rem;line-height:1;opacity:.75">${k.ic}</span></div><div class="kpi-val" style="font-size:1.9rem">${k.v}</div><div class="kpi-sub">${k.sub}</div></div>`).join('')}</div>
    ${chipsTipo}${chipsSub}${chipsEq}
    <div class="card">
      <div class="card-head"><span class="card-title">Consumo de Insumos</span>
        <div class="card-head-right" style="gap:.45rem;flex-wrap:wrap;align-items:center">
          ${btnV('detalle','📄 Detalle')}${btnV('insumo','🔩 Por insumo')}${btnV('equipo','🚜 Por equipo')}
          <span style="width:1px;height:18px;background:var(--border)"></span>
          <select onchange="_iaSetOrigen(this.value)" title="Origen del insumo" style="background:var(--panel2);border:1px solid var(--border);border-radius:6px;padding:.28rem .5rem;color:var(--text);font-size:.75rem;width:auto">
            <option value="ALMACEN"${_iaOrigen==='ALMACEN'?' selected':''}>Solo Almacén ECO</option>
            <option value="TODOS"${_iaOrigen==='TODOS'?' selected':''}>Todos los orígenes</option>
            ${origenes.map(o=>`<option value="${_iaEsc(o)}"${_iaOrigen===o?' selected':''}>${_iaEsc(o)}</option>`).join('')}
          </select>
          <input type="text" value="${_iaEsc(_iaBuscar)}" placeholder="🔍 Buscar insumo, código o equipo..." oninput="_iaBuscarInput(this.value)" style="background:var(--panel2);border:1px solid var(--border);border-radius:6px;padding:.28rem .6rem;color:var(--text);font-size:.78rem;width:215px">
          <button class="btn btn-out btn-sm" onclick="_iaPrint()" style="color:var(--alm);border-color:var(--alm);font-size:.75rem">🖨️ PDF</button>
          <button class="btn btn-out btn-sm" onclick="_iaExcel()" style="color:#10b981;border-color:#10b98160;font-size:.75rem">📥 Excel</button>
        </div>
      </div>
      <div class="card-body" style="overflow-x:auto;padding:0">
        ${lista.length?tabla:'<div style="padding:2.5rem;text-align:center;color:var(--muted)">Sin consumo de insumos registrado con los filtros actuales.<br><span style="font-size:.72rem">Los insumos se cargan al registrar un Auxilio Mecánico en el área de Mantenimiento.</span></div>'}
      </div>
    </div>
    ${sinPur?`<div style="margin-top:.7rem;padding:.5rem .8rem;background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.3);border-radius:8px;font-size:.74rem;color:#fca5a5">⚠️ ${sinPur} línea${sinPur===1?'':'s'} sin Precio Unitario Referencial. El código del insumo no existe en el catálogo de Materiales o no tiene P.U.R. cargado — esas líneas valorizan en S/ 0.00.</div>`:''}`;
  if(_iaBuscar)_iaBuscarInput(_iaBuscar);
}

// ── Etiqueta del filtro activo (para títulos de PDF/Excel) ──
function _iaFiltroTxt(){
  const p=[];
  if(_iaEqId){const e=(DB.equipos||[]).find(x=>x.id===+_iaEqId);p.push(e?e.codigo:'Equipo');}
  else if(_iaSub)p.push(_iaSub);
  else if(_iaTipo)p.push(_iaTipo);
  else p.push('Todos los equipos');
  p.push(_iaOrigen==='ALMACEN'?'Almacén ECO':_iaOrigen==='TODOS'?'Todos los orígenes':_iaOrigen);
  return p.join(' · ');
}
function _iaListaFiltrada(){
  const todas=_iaFiltraOrigen(_iaLineas());
  return todas.filter(r=>{
    if(_iaEqId)return r.eqId===+_iaEqId;
    if(!_iaTipo)return true;
    if(_iaSub)return r.tipo===_iaTipo&&r.sub===_iaSub;
    return r.tipo===_iaTipo;
  });
}

// ── PDF con el formato del detalle de descuentos ──
function _iaPrint(){
  const lista=_iaListaFiltrada();
  if(!lista.length){toast('No hay consumo que imprimir',true);return;}
  const per=_iaPeriodo();
  const HDR='#0070C0';
  const TH=`background:${HDR};color:#fff;padding:4px 6px;font-size:9px;text-transform:uppercase;text-align:center`;
  const TD='border:1px solid #cbd5e1;padding:3px 6px;font-size:10px;color:#111';
  const logo=window.location.href.replace(/[^\/\\]+$/,'')+'09.-ERP/Imagenes/ECOSERMO-LOGO.png';
  const tot=lista.reduce((s,r)=>s+r.total,0);
  const sub=_iaTodoPer?'Todo el historial':`Período: ${_iaDMY(per.desde)} al ${_iaDMY(per.hasta)}`;
  const w=window.open('','_blank','width=1150,height=760');
  w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Consumo de Insumos – Auxilios Mecánicos</title><style>
    @page{size:A4 landscape;margin:1cm}
    *{box-sizing:border-box;margin:0;padding:0;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}
    body{font-family:Arial,Helvetica,sans-serif;color:#111;font-size:10px}
    .hdr{display:flex;align-items:center;gap:14px;border-bottom:2px solid ${HDR};padding-bottom:6px;margin-bottom:10px}
    .hdr img{height:44px;object-fit:contain}
    .hdr .t{flex:1;text-align:center}
    .hdr h1{font-size:16px;color:${HDR};letter-spacing:.04em}
    .hdr p{font-size:10px;color:#475569;margin-top:2px}
    table{width:100%;border-collapse:collapse}
    .sec{font-size:11px;font-weight:800;color:#1e3a5f;margin:10px 0 4px;border-bottom:1px solid #1e3a5f;padding-bottom:2px}
    tfoot td{background:#e2e8f0;font-weight:800}
  </style></head><body>
  <div class="hdr">
    <img src="${logo}" alt="">
    <div class="t"><h1>DETALLE DE CONSUMO DE INSUMOS</h1><p>Auxilios Mecánicos · ${_iaEsc(_iaFiltroTxt())} · ${sub}</p></div>
    <div style="text-align:right;font-size:9px;color:#475569">${lista.length} líneas<br><strong style="font-size:12px;color:#b91c1c">S/ ${_iaN2(tot)}</strong></div>
  </div>
  <div class="sec">A. CONSUMO DE INSUMOS — ALMACÉN ECOSERMO</div>
  <table>
    <thead><tr>
      <th style="${TH}">#</th><th style="${TH}">Fecha</th><th style="${TH}">N° Auxilio</th><th style="${TH}">Equipo</th>
      <th style="${TH}">Código</th><th style="${TH};text-align:left">Descripción del Insumo</th><th style="${TH}">Unid.</th>
      <th style="${TH}">Cant.</th><th style="${TH}">P. Unit S/</th><th style="${TH}">Total S/</th>
    </tr></thead>
    <tbody>${lista.map((r,n)=>`<tr>
      <td style="${TD};text-align:center">${n+1}</td>
      <td style="${TD};text-align:center">${_iaDMY(r.fecha)}</td>
      <td style="${TD};text-align:center;font-family:monospace">${_iaEsc(r.auxCod)}</td>
      <td style="${TD};text-align:center;font-family:monospace">${_iaEsc(r.eqCod)}</td>
      <td style="${TD};text-align:center;font-family:monospace">${_iaEsc(r.cod)||'—'}</td>
      <td style="${TD}">${_iaEsc(r.desc)}</td>
      <td style="${TD};text-align:center">${_iaEsc(r.und)}</td>
      <td style="${TD};text-align:right">${_iaN2(r.cant)}</td>
      <td style="${TD};text-align:right">${_iaN2(r.pur)}${r.pur?'':' <span style="color:#b91c1c;font-size:8px">(sin P.U.R.)</span>'}</td>
      <td style="${TD};text-align:right;font-weight:700;color:#b91c1c">${_iaN2(r.total)}</td>
    </tr>`).join('')}</tbody>
    <tfoot><tr><td colspan="9" style="${TD};text-align:right">SUBTOTAL INSUMOS</td><td style="${TD};text-align:right;color:#b91c1c">S/ ${_iaN2(tot)}</td></tr></tfoot>
  </table>
  <script>window.onload=()=>window.print();<\/script></body></html>`);
  w.document.close();
}

// ── Excel ──
function _iaExcel(){
  const lista=_iaListaFiltrada();
  if(!lista.length){toast('No hay consumo que exportar',true);return;}
  const per=_iaPeriodo();
  const tit=`CONSUMO DE INSUMOS – AUXILIOS MECÁNICOS | ${_iaFiltroTxt()} | ${_iaTodoPer?'Todo el historial':_iaDMY(per.desde)+' al '+_iaDMY(per.hasta)}`;
  const headers=['#','FECHA','N° AUXILIO','EQUIPO','DESCRIPCIÓN DEL EQUIPO','CÓDIGO','DESCRIPCIÓN DEL INSUMO','UNID.','CANT.','P. UNIT S/','TOTAL S/','ORIGEN','PROYECTO'];
  const rows=lista.map((r,n)=>[n+1,r.fecha,r.auxCod,r.eqCod,r.eqNom,r.cod,r.desc,r.und,r.cant,r.pur,r.total,r.origen,r.proy]);
  const tot=lista.reduce((s,r)=>s+r.total,0);
  const ws=XLSX.utils.aoa_to_sheet([[tit],[],headers,...rows,[],['','','','','','','','','','TOTAL S/',tot]]);
  ws['!merges']=[{s:{r:0,c:0},e:{r:0,c:headers.length-1}}];
  ws['!cols']=[{wch:4},{wch:11},{wch:16},{wch:13},{wch:26},{wch:11},{wch:42},{wch:7},{wch:9},{wch:10},{wch:11},{wch:20},{wch:14}];
  const addr=(r,c)=>XLSX.utils.encode_cell({r,c});
  const t=ws[addr(0,0)];
  if(t)t.s={fill:{patternType:'solid',fgColor:{rgb:'0070C0'}},font:{bold:true,color:{rgb:'FFFFFF'},sz:11},alignment:{horizontal:'center',vertical:'center'}};
  headers.forEach((_,c)=>{const cel=ws[addr(2,c)];if(cel)cel.s={fill:{patternType:'solid',fgColor:{rgb:'0070C0'}},font:{bold:true,color:{rgb:'FFFFFF'},sz:9},alignment:{horizontal:'center',vertical:'center',wrapText:true}};});
  const wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,ws,'Consumo Insumos');
  XLSX.writeFile(wb,`ConsumoInsumos_${_iaTodoPer?'historial':per.desde+'_'+per.hasta}.xlsx`);
  toast('✓ Excel descargado');
}
