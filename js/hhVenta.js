// ══════════════════════════════════════════════════════════════════════════
//  HH VENTA — tarifa mensual de venta por CARGO
//  El precio pertenece al cargo, no a la persona: una sola fila por cargo
//  sirve para los 56 peones. Los cargos se leen de Personal / Tareaje.
//  Alimenta el cálculo de "Venta Personal HH" en Cost Control.
// ══════════════════════════════════════════════════════════════════════════

const _hhFmt=v=>'S/ '+Number(v||0).toLocaleString('es-PE',{minimumFractionDigits:2,maximumFractionDigits:2});
function _hhEsc(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
// Se compara sin tildes ni puntuación: "OP. VOLQUETE" = "Op Volquete"
const _hhNorm=s=>String(s||'').toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^A-Z0-9]+/g,' ').trim();

let _hhBuscar='', _hhSoloSin=false, _hhOrden='personas';

function _hhSet(campo,val){
  if(campo==='buscar')_hhBuscar=val;
  else if(campo==='soloSin')_hhSoloSin=!!val;
  else if(campo==='orden')_hhOrden=val;
  rHhVenta(campo==='buscar');
}

// Tarifa guardada para un cargo (comparación normalizada)
function _hhTarifaDe(cargo){
  const c=_hhNorm(cargo);
  return (DB.ventaPersonal||[]).find(t=>_hhNorm(t.cargo)===c)||null;
}

// Cargos que realmente existen en Personal, con cuánta gente tiene cada uno
function _hhCargos(){
  const m=new Map();
  (DB.personal||[]).forEach(p=>{
    const c=(p.cargo||'').trim();
    if(!c)return;
    const k=_hhNorm(c);
    const a=m.get(k)||{cargo:c,n:0,activos:0};
    a.n++;
    if((p.est||'Activo')==='Activo')a.activos++;
    m.set(k,a);
  });
  // Tarifas guardadas cuyo cargo ya no está en Personal: se muestran igual
  (DB.ventaPersonal||[]).forEach(t=>{
    const k=_hhNorm(t.cargo);
    if(!m.has(k))m.set(k,{cargo:t.cargo,n:0,activos:0,huerfano:true});
  });
  const q=_hhNorm(_hhBuscar);
  let arr=[...m.values()].map(a=>{
    const t=_hhTarifaDe(a.cargo);
    return{...a,tarifa:t?+t.tarifaMes||0:0,rec:t};
  });
  if(q)arr=arr.filter(a=>_hhNorm(a.cargo).includes(q));
  if(_hhSoloSin)arr=arr.filter(a=>!a.tarifa);
  arr.sort((a,b)=>
    _hhOrden==='cargo'?a.cargo.localeCompare(b.cargo,'es')
    :_hhOrden==='tarifa'?b.tarifa-a.tarifa
    :b.activos-a.activos||a.cargo.localeCompare(b.cargo,'es'));
  return arr;
}

// ── Guardar la tarifa de un cargo ───────────────────────────────────────────
async function _hhGuardar(cargo,valor){
  const n=+valor;
  if(valor!==''&&(isNaN(n)||n<0)){toast('Tarifa inválida',true);return;}
  let rec=_hhTarifaDe(cargo);
  if(valor===''||n===0){
    // Sin precio el cargo simplemente no se valoriza: se borra el registro
    if(!rec)return;
    DB.ventaPersonal=(DB.ventaPersonal||[]).filter(t=>+t.id!==+rec.id);
    await supaDelete('ventaPersonal',rec.id);
    rHhVenta();toast('Tarifa eliminada: '+cargo);
    return;
  }
  const nuevo=!rec;
  if(rec)rec.tarifaMes=n;
  else{
    rec={id:nidSeguro('vper','ventaPersonal'),cargo:String(cargo).trim(),tarifaMes:n,activo:true};
    (DB.ventaPersonal=DB.ventaPersonal||[]).push(rec);
  }
  const err=await supaUpsert('ventaPersonal',rec);
  if(err){
    if(nuevo)DB.ventaPersonal=DB.ventaPersonal.filter(t=>+t.id!==+rec.id);
    rHhVenta();return;
  }
  rHhVenta();
  toast('✓ '+cargo+' = '+_hhFmt(n)+'/mes');
}

// Precarga desde las tarifas que estaban escritas en el código de Cost Control
async function _hhCargarIniciales(){
  if(typeof _CC_TARIFA_HH==='undefined'){toast('No hay tarifas de referencia',true);return;}
  const cargos=_hhCargos().filter(a=>!a.tarifa);
  if(!cargos.length){toast('Todos los cargos ya tienen tarifa');return;}
  const prop=[];
  cargos.forEach(a=>{
    const c=_hhNorm(a.cargo);
    for(const t of _CC_TARIFA_HH){
      if(t.kw.some(k=>c.includes(_hhNorm(k)))){prop.push({cargo:a.cargo,mes:t.mes});break;}
    }
  });
  if(!prop.length){toast('Ningún cargo coincide con las tarifas de referencia',true);return;}
  const lista=prop.slice(0,12).map(p=>'- '+p.cargo+' = '+_hhFmt(p.mes)).join('\n');
  const extra=prop.length>12?'\n... y '+(prop.length-12)+' mas':'';
  if(!confirm('Se van a precargar '+prop.length+' tarifa(s) de referencia:\n\n'+lista+extra+'\n\nPodras editarlas despues. Continuar?'))return;
  for(const p of prop){
    const rec={id:nidSeguro('vper','ventaPersonal'),cargo:p.cargo,tarifaMes:p.mes,activo:true};
    (DB.ventaPersonal=DB.ventaPersonal||[]).push(rec);
    const e=await supaUpsert('ventaPersonal',rec);
    if(e){DB.ventaPersonal=DB.ventaPersonal.filter(t=>+t.id!==+rec.id);break;}
  }
  rHhVenta();
  toast('✓ '+prop.length+' tarifas precargadas');
}

// ── Render ──────────────────────────────────────────────────────────────────
function rHhVenta(mantenerFoco){
  const pg=document.getElementById('page-hhVenta');if(!pg)return;
  const arr=_hhCargos();
  const conT=arr.filter(a=>a.tarifa>0).length;
  const sinT=arr.filter(a=>!a.tarifa).length;
  const activos=arr.reduce((s,a)=>s+a.activos,0);
  // Costo mensual teórico si todos trabajaran el mes completo
  const mensual=arr.reduce((s,a)=>s+a.tarifa*a.activos,0);
  const _ro=isModuleReadOnly('hhVenta');

  const selS='background:var(--panel2);border:1px solid var(--border);border-radius:6px;color:var(--text);padding:.3rem .55rem;font-size:.75rem';
  const kpi=(l,v,c,sub)=>`<div class="kpi" style="--kc:${c};border:1px solid ${c};flex:1;min-width:160px">
    <div class="kpi-lbl">${l}</div><div class="kpi-val" style="font-size:${String(v).length>12?'1.15rem':'1.5rem'}">${v}</div>
    <div class="kpi-sub">${sub||''}</div></div>`;

  const TH='padding:6px 8px;font-size:.6rem;text-transform:uppercase;letter-spacing:.06em;color:var(--muted2);white-space:nowrap';
  const TD='padding:5px 8px;font-size:.76rem;white-space:nowrap;border-bottom:1px solid var(--border)';

  const filas=arr.map(a=>{
    const sin=!a.tarifa;
    const cargoAttr=String(a.cargo).replace(/\\/g,'\\\\').replace(/'/g,"\\'").replace(/"/g,'&quot;');
    return`<tr>
      <td style="${TD};font-weight:700">${_hhEsc(a.cargo)}
        ${a.huerfano?'<span title="Ya no hay nadie con este cargo en Personal" style="font-size:.55rem;font-weight:800;color:#f59e0b;border:1px solid #f59e0b55;border-radius:3px;padding:0 4px;margin-left:.3rem">SIN PERSONAL</span>':''}</td>
      <td style="${TD};text-align:center;color:${a.activos?'var(--text)':'var(--muted)'}">${a.activos}</td>
      <td style="${TD};text-align:center;color:var(--muted2)">${a.n}</td>
      <td style="${TD};text-align:right;padding:2px 8px">
        <input type="number" step="0.01" min="0" value="${a.tarifa||''}" placeholder="0.00" ${_ro?'disabled':''}
          onchange="_hhGuardar('${cargoAttr}',this.value)"
          style="width:110px;background:${sin?'transparent':'rgba(16,185,129,.1)'};border:1px solid ${sin?'var(--border)':'#10b98166'};border-radius:5px;color:${sin?'var(--muted2)':'#10b981'};padding:.2rem .45rem;font-size:.78rem;text-align:right;font-weight:700;font-family:monospace"></td>
      <td style="${TD};text-align:right;font-family:monospace;color:var(--muted2)">${a.tarifa?_hhFmt(a.tarifa/30):'—'}</td>
      <td style="${TD};text-align:right;font-family:monospace;font-weight:700;color:${a.tarifa&&a.activos?'#10b981':'var(--muted)'}">${a.tarifa&&a.activos?_hhFmt(a.tarifa*a.activos):'—'}</td>
    </tr>`;
  }).join('');

  const _tb=(k,lbl)=>{
    const act=_hhTab===k;
    return `<button onclick="_hhSetTab('${k}')" style="background:${act?'#10b981':'transparent'};color:${act?'#fff':'var(--muted2)'};border:none;border-radius:7px 7px 0 0;padding:.4rem 1rem;font-size:.78rem;font-weight:700;cursor:pointer">${lbl}</button>`;
  };
  const _cab=`
  <div class="ph"><div class="ph-title" style="color:#10b981">👷 HH Venta</div>
    <div class="ph-sub">Tarifa de venta por cargo y venta real según el Tareaje</div></div>
  <div style="display:flex;gap:.35rem;border-bottom:1px solid var(--border);margin-bottom:.9rem">
    ${_tb('tarifas','🏷️ Tarifas por cargo')}${_tb('real','📊 Venta Real')}
  </div>`;
  if(_hhTab==='real'){
    pg.innerHTML=_cab+_hrRender();
    if(mantenerFoco){const b=document.getElementById('hrBuscar');if(b){b.focus();b.setSelectionRange(b.value.length,b.value.length);}}
    return;
  }
  pg.innerHTML=_cab+`

  <div class="kpi-row" style="margin-bottom:.9rem">
    ${kpi('Cargos con tarifa',conT,'#10b981',`de ${arr.length} cargos registrados`)}
    ${kpi('Sin tarifa',sinT,sinT?'#ef4444':'#64748b',sinT?'no se valorizan en Cost Control':'todos configurados')}
    ${kpi('Personal activo',activos,'#38bdf8','en los cargos listados')}
    ${kpi('Venta mensual teórica',_hhFmt(mensual),'#a855f7','si todos trabajaran el mes completo')}
  </div>

  <div class="card">
    <div class="card-head" style="flex-wrap:wrap;gap:.5rem">
      <span class="card-title">🏷️ Tarifas por cargo</span>
      <div style="display:flex;gap:.5rem;align-items:center;flex-wrap:wrap;margin-left:auto">
        <input id="hhBuscar" value="${_hhEsc(_hhBuscar)}" placeholder="🔍 Buscar cargo…" oninput="_hhSet('buscar',this.value)" style="${selS};width:190px">
        <label style="display:inline-flex;align-items:center;gap:.35rem;font-size:.72rem;color:var(--muted2);cursor:pointer">
          <input type="checkbox" ${_hhSoloSin?'checked':''} onchange="_hhSet('soloSin',this.checked)" style="width:auto;margin:0;cursor:pointer"> Solo sin tarifa
        </label>
        <select onchange="_hhSet('orden',this.value)" style="${selS}">
          <option value="personas" ${_hhOrden==='personas'?'selected':''}>Más personal primero</option>
          <option value="cargo" ${_hhOrden==='cargo'?'selected':''}>Por nombre de cargo</option>
          <option value="tarifa" ${_hhOrden==='tarifa'?'selected':''}>Mayor tarifa primero</option>
        </select>
        ${!_ro&&sinT?`<button onclick="_hhCargarIniciales()" style="background:rgba(16,185,129,.12);border:1px solid #10b98155;color:#10b981;border-radius:6px;padding:.3rem .8rem;font-size:.72rem;font-weight:700;cursor:pointer">⬇ Precargar referencia</button>`:''}
        <button onclick="_hhExcel()" style="background:#166534;color:#fff;border:none;border-radius:6px;padding:.3rem .8rem;font-size:.72rem;font-weight:700;cursor:pointer">📊 Excel</button>
      </div>
    </div>
    <div class="card-body" style="padding:0"><div class="tbl-wrap"><table style="width:100%;border-collapse:collapse">
      <thead><tr style="border-bottom:1px solid var(--border)">
        <th style="${TH};text-align:left">Cargo</th>
        <th style="${TH};text-align:center">Activos</th>
        <th style="${TH};text-align:center">Total</th>
        <th style="${TH};text-align:right">Tarifa mensual S/</th>
        <th style="${TH};text-align:right">Por día (÷30)</th>
        <th style="${TH};text-align:right">Venta mes S/</th>
      </tr></thead>
      <tbody>${filas||`<tr><td colspan="6" style="text-align:center;padding:2rem;color:var(--muted2);font-size:.8rem">${_hhBuscar||_hhSoloSin?'Ningún cargo coincide con el filtro':'No hay cargos registrados en Personal'}</td></tr>`}</tbody>
    </table></div></div>
  </div>

  <div style="font-size:.62rem;color:var(--muted);margin-top:.7rem;line-height:1.6">
    Los cargos salen de <strong>Personal / RR.HH.</strong>: aquí solo se les pone precio. La tarifa es <strong>mensual</strong>;
    Cost Control la prorratea por los días trabajados en el Tareaje (tarifa ÷ días del período × días con TD/TN/A5).
    Un cargo sin tarifa <strong>no se valoriza</strong> — sale en rojo arriba para que no se pase por alto.
    Dejar la tarifa vacía o en 0 elimina el registro.
  </div>`;

  if(mantenerFoco){
    const b=document.getElementById('hhBuscar');
    if(b){b.focus();b.setSelectionRange(b.value.length,b.value.length);}
  }
}

// ── Excel ───────────────────────────────────────────────────────────────────
function _hhExcel(){
  if(typeof XLSX==='undefined'){toast('Librería de Excel no disponible',true);return;}
  const arr=_hhCargos();
  if(!arr.length){toast('No hay cargos para exportar',true);return;}
  const BOR={top:{style:'thin',color:{rgb:'D0D7E2'}},bottom:{style:'thin',color:{rgb:'D0D7E2'}},
             left:{style:'thin',color:{rgb:'D0D7E2'}},right:{style:'thin',color:{rgb:'D0D7E2'}}};
  const S=(v,o)=>({v:v==null?'':v,t:typeof v==='number'?'n':'s',s:Object.assign({
    font:{sz:9,bold:!!(o&&o.b),color:{rgb:(o&&o.col)||'0F172A'}},
    fill:{fgColor:{rgb:(o&&o.bg)||'FFFFFF'}},
    alignment:{horizontal:(o&&o.al)||'left',vertical:'center'},border:BOR},
    (o&&o.numFmt)?{numFmt:o.numFmt}:{})});
  const HDR=['Cargo','Activos','Total personal','Tarifa mensual S/','Por día S/','Venta mes S/'];
  const aoa=[
    [S('HH VENTA — TARIFA MENSUAL POR CARGO',{b:1,bg:'065F46',col:'FFFFFF',al:'center'}),...Array(HDR.length-1).fill(S('',{bg:'065F46'}))],
    HDR.map(h=>S(h,{b:1,bg:'334155',col:'FFFFFF',al:'center'}))
  ];
  let tot=0;
  arr.forEach(a=>{
    tot+=a.tarifa*a.activos;
    aoa.push([S(a.cargo,{b:1}),S(a.activos,{al:'center'}),S(a.n,{al:'center'}),
      S(a.tarifa||null,{al:'right',numFmt:'#,##0.00',col:a.tarifa?'059669':'DC2626'}),
      S(a.tarifa?a.tarifa/30:null,{al:'right',numFmt:'#,##0.00'}),
      S(a.tarifa*a.activos||null,{al:'right',numFmt:'#,##0.00',b:1})]);
  });
  aoa.push([S('TOTAL',{b:1,bg:'EEF2F8',al:'right'}),...Array(4).fill(S('',{bg:'EEF2F8'})),
    S(tot,{b:1,bg:'EEF2F8',al:'right',numFmt:'#,##0.00'})]);
  const ws=XLSX.utils.aoa_to_sheet(aoa);
  ws['!merges']=[{s:{r:0,c:0},e:{r:0,c:HDR.length-1}}];
  ws['!cols']=[{wch:38},{wch:9},{wch:14},{wch:18},{wch:13},{wch:16}];
  ws['!freeze']={xSplit:1,ySplit:2};
  const wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,ws,'HH Venta');
  XLSX.writeFile(wb,'HH_Venta_tarifas.xlsx');
  toast('✓ Tarifas exportadas');
}

// ══════════════════════════════════════════════════════════════════════════
//  TAB "VENTA REAL" — lo que realmente se vende según el Tareaje
//  Incidencia = días trabajados ÷ días del período, contando TD + TN + A5 + DLT.
//  El resto (días libres, descansos médicos, faltas, permisos) NO suma: esa
//  fracción por la tarifa mensual del cargo es la venta real.
// ══════════════════════════════════════════════════════════════════════════

let _hhTab='tarifas';
let _hrDesde='', _hrHasta='', _hrBuscar='', _hrProy='', _hrVerDias=false;

const _HR_TRAB=['TD','TN','A5','DLT'];   // días que cuentan como trabajados
const _HR_LIBRE=['DL'];
const _HR_DM=['DM'];
const _HR_SUB=['LP','LM','LF','V'];      // licencias y subsidios

function _hhSetTab(t){_hhTab=t;rHhVenta();}
function _hrSet(campo,val){
  if(campo==='desde')_hrDesde=val;
  else if(campo==='hasta')_hrHasta=val;
  else if(campo==='buscar')_hrBuscar=val;
  else if(campo==='proy')_hrProy=val;
  else if(campo==='verDias')_hrVerDias=!!val;
  rHhVenta(campo==='buscar');
}
// Período contable 21→20 que contiene la fecha dada
function _hrPer2120(base){
  const d=base?new Date(base+'T12:00:00'):new Date();
  const y=d.getFullYear(),m=d.getMonth(),dia=d.getDate();
  const p=n=>String(n).padStart(2,'0');
  const ini=dia>=21?new Date(y,m,21):new Date(y,m-1,21);
  const fin=new Date(ini.getFullYear(),ini.getMonth()+1,20);
  const iso=x=>`${x.getFullYear()}-${p(x.getMonth()+1)}-${p(x.getDate())}`;
  return{desde:iso(ini),hasta:iso(fin)};
}
function _hrHoy(){const q=_hrPer2120();_hrDesde=q.desde;_hrHasta=q.hasta;rHhVenta();}
function _hrNav(n){
  const p=_hrPer2120(_hrDesde||null);
  const d=new Date(p.desde+'T12:00:00');d.setMonth(d.getMonth()+n);
  const pd=x=>String(x).padStart(2,'0');
  const q=_hrPer2120(`${d.getFullYear()}-${pd(d.getMonth()+1)}-21`);
  _hrDesde=q.desde;_hrHasta=q.hasta;rHhVenta();
}
function _hrFechas(){
  if(!_hrDesde||!_hrHasta||_hrDesde>_hrHasta)return[];
  const out=[];let d=new Date(_hrDesde+'T12:00:00');const fin=new Date(_hrHasta+'T12:00:00');
  while(d<=fin){out.push(d.toISOString().slice(0,10));d.setDate(d.getDate()+1);}
  return out.slice(0,120);
}
const _hrDMY=i=>{if(!i||!i.includes('-'))return i||'—';const[a,b,c]=i.split('-');return`${c}/${b}/${a}`;};

// ── Cálculo ─────────────────────────────────────────────────────────────────
function _hrDatos(){
  const F=_hrFechas();
  const nDias=F.length||1;
  const set=new Set(F);
  // Marcas del período, indexadas por persona
  const porPers=new Map();
  (DB.tareaje||[]).forEach(r=>{
    if(!set.has(r.fecha))return;
    if(_hrProy&&r.proy&&r.proy!==_hrProy)return;
    let a=porPers.get(+r.personalId);
    if(!a){a={};porPers.set(+r.personalId,a);}
    a[r.fecha]=r.tipo;
  });
  const q=_hhNorm(_hrBuscar);
  const filas=[];
  (DB.personal||[]).forEach(p=>{
    const marcas=porPers.get(+p.id);
    if(!marcas)return;                       // sin marcación en el período
    const cargo=(p.cargo||'SIN CARGO').trim();
    if(q&&!_hhNorm(`${p.ape} ${p.nom} ${cargo} ${p.dni}`).includes(q))return;
    let trab=0,libre=0,dm=0,sub=0,otros=0;
    Object.values(marcas).forEach(t=>{
      if(_HR_TRAB.includes(t))trab++;
      else if(_HR_LIBRE.includes(t))libre++;
      else if(_HR_DM.includes(t))dm++;
      else if(_HR_SUB.includes(t))sub++;
      else otros++;                          // F, P, R…
    });
    const total=trab;                        // solo TD + TN + A5 + DLT generan venta
    const inc=+(total/nDias).toFixed(4);
    const tar=_hhTarifaDe(cargo);
    const tarifa=tar?+tar.tarifaMes||0:0;
    filas.push({p,cargo,marcas,trab,libre,dm,sub,otros,total,inc,tarifa,
      venta:+(inc*tarifa).toFixed(2),sinTarifa:!tarifa});
  });
  // Agrupado por cargo, respetando el orden del formato impreso
  const grupos=new Map();
  filas.forEach(f=>{
    const k=_hhNorm(f.cargo);
    let g=grupos.get(k);
    if(!g){g={cargo:f.cargo,items:[],inc:0,venta:0,tarifa:f.tarifa};grupos.set(k,g);}
    g.items.push(f);g.inc+=f.inc;g.venta+=f.venta;
  });
  const arr=[...grupos.values()].sort((a,b)=>b.venta-a.venta||a.cargo.localeCompare(b.cargo,'es'));
  arr.forEach(g=>g.items.sort((a,b)=>`${a.p.ape} ${a.p.nom}`.localeCompare(`${b.p.ape} ${b.p.nom}`,'es')));
  return{F,nDias,grupos:arr,filas};
}

// ── Render del tab ──────────────────────────────────────────────────────────
function _hrRender(){
  if(!_hrDesde||!_hrHasta){const q=_hrPer2120();_hrDesde=q.desde;_hrHasta=q.hasta;}
  const D=_hrDatos();
  const totVenta=D.filas.reduce((s,f)=>s+f.venta,0);
  const totInc=D.filas.reduce((s,f)=>s+f.inc,0);
  const sinTar=D.filas.filter(f=>f.sinTarifa).length;
  const totTrab=D.filas.reduce((s,f)=>s+f.trab,0);

  const selS='background:var(--panel2);border:1px solid var(--border);border-radius:6px;color:var(--text);padding:.3rem .55rem;font-size:.75rem';
  const btn='background:var(--panel);border:1px solid var(--border);border-radius:5px;color:var(--text);padding:.22rem .5rem;font-size:.72rem;cursor:pointer;white-space:nowrap';
  const kpi=(l,v,c,sub)=>`<div class="kpi" style="--kc:${c};border:1px solid ${c};flex:1;min-width:160px">
    <div class="kpi-lbl">${l}</div><div class="kpi-val" style="font-size:${String(v).length>12?'1.15rem':'1.5rem'}">${v}</div>
    <div class="kpi-sub">${sub||''}</div></div>`;

  const TH='padding:5px 7px;font-size:.58rem;text-transform:uppercase;letter-spacing:.05em;color:var(--muted2);white-space:nowrap';
  const TD='padding:3px 7px;font-size:.72rem;white-space:nowrap;border-bottom:1px solid var(--border)';
  const MONO='font-family:monospace;font-variant-numeric:tabular-nums';

  // Encabezados de los días (solo si se piden)
  const dayHdrs=_hrVerDias?D.F.map(f=>{
    const dow=new Date(f+'T12:00:00').getDay();
    const DN=['DO','LU','MA','MI','JU','VI','SA'];
    return`<th style="${TH};text-align:center;padding:2px 0;width:20px;min-width:20px;${dow===0?'color:#f59e0b':''}" title="${f}">${+f.slice(8)}<div style="font-size:.5rem;opacity:.7">${DN[dow]}</div></th>`;
  }).join(''):'';

  let item=0;
  const cuerpo=D.grupos.map((g,gi)=>{
    const cab=`<tr style="background:rgba(59,130,246,.14)">
      <td style="${TD};font-weight:800;color:#93c5fd" colspan="${_hrVerDias?4+D.F.length:4}">${String(gi+1).padStart(2,'0')} · ${_hhEsc(g.cargo)}
        ${!g.tarifa?'<span style="font-size:.55rem;font-weight:800;color:#ef4444;border:1px solid #ef444455;border-radius:3px;padding:0 4px;margin-left:.4rem">SIN TARIFA</span>':''}</td>
      <td style="${TD};text-align:center;${MONO};color:#93c5fd">${g.items.reduce((s,f)=>s+f.trab,0)}</td>
      <td style="${TD};text-align:center;${MONO};color:#93c5fd">${g.items.reduce((s,f)=>s+f.libre,0)}</td>
      <td style="${TD};text-align:center;${MONO};color:#93c5fd">${g.items.reduce((s,f)=>s+f.dm,0)||'—'}</td>
      <td style="${TD};text-align:center;${MONO};color:#93c5fd">${g.items.reduce((s,f)=>s+f.sub,0)||'—'}</td>
      <td style="${TD};text-align:center;${MONO};color:#93c5fd">${g.items.reduce((s,f)=>s+f.total,0)}</td>
      <td style="${TD};text-align:right;${MONO};font-weight:800;color:#93c5fd">${g.inc.toFixed(2)}</td>
      <td style="${TD};text-align:right;${MONO};color:var(--muted2)">${g.tarifa?_hhFmt(g.tarifa):'—'}</td>
      <td style="${TD};text-align:right;${MONO};font-weight:800;color:#10b981">${_hhFmt(g.venta)}</td>
    </tr>`;
    const filas=g.items.map(f=>{
      item++;
      const dias=_hrVerDias?D.F.map(fe=>{
        const t=f.marcas[fe]||'';
        const c=t?(_TARE_T[t]||{}):null;
        return`<td style="text-align:center;padding:1px 0;font-size:.52rem;font-weight:700;border-bottom:1px solid var(--border);${c?`background:${c.bg};color:${c.tx}`:'color:var(--muted)'}" title="${fe} ${t}">${t||'·'}</td>`;
      }).join(''):'';
      return`<tr>
        <td style="${TD};text-align:center;color:var(--muted2);${MONO};font-size:.62rem">${item}</td>
        <td style="${TD};font-weight:600;max-width:220px;overflow:hidden;text-overflow:ellipsis">${_hhEsc(f.p.ape+', '+f.p.nom)}</td>
        <td style="${TD};${MONO};font-size:.66rem;color:#22d3ee">${_hhEsc(f.p.dni||'—')}</td>
        <td style="${TD};font-size:.66rem;color:var(--muted2);max-width:170px;overflow:hidden;text-overflow:ellipsis">${_hhEsc(f.cargo)}</td>
        ${dias}
        <td style="${TD};text-align:center;${MONO};color:#10b981;font-weight:700">${f.trab||'—'}</td>
        <td style="${TD};text-align:center;${MONO};color:var(--muted2)">${f.libre||'—'}</td>
        <td style="${TD};text-align:center;${MONO};color:${f.dm?'#a855f7':'var(--muted)'}">${f.dm||'—'}</td>
        <td style="${TD};text-align:center;${MONO};color:${f.sub?'#f59e0b':'var(--muted)'}">${f.sub||'—'}</td>
        <td style="${TD};text-align:center;${MONO};font-weight:700">${f.total}</td>
        <td style="${TD};text-align:right;${MONO};font-weight:800;color:${f.inc>=1?'#10b981':'#f59e0b'}">${f.inc.toFixed(2)}</td>
        <td style="${TD};text-align:right;${MONO};color:var(--muted2)">${f.tarifa?_hhFmt(f.tarifa):'<span style="color:#ef4444">sin tarifa</span>'}</td>
        <td style="${TD};text-align:right;${MONO};font-weight:700;color:${f.venta?'#10b981':'var(--muted)'}">${f.venta?_hhFmt(f.venta):'—'}</td>
      </tr>`;
    }).join('');
    return cab+filas;
  }).join('');

  const nCols=(_hrVerDias?4+D.F.length:4);
  return`
  <div class="card" style="margin-bottom:.9rem">
    <div class="card-head"><span class="card-title">🗓️ Período</span>
      <span style="font-size:.63rem;color:var(--muted2)">${D.nDias} días · ${D.filas.length} trabajadores con marcación · ${D.grupos.length} cargos</span>
    </div>
    <div class="card-body"><div style="display:flex;gap:.5rem;flex-wrap:wrap;align-items:flex-end">
      <div style="display:flex;flex-direction:column;gap:.15rem">
        <label style="font-size:.58rem;text-transform:uppercase;letter-spacing:.06em;color:var(--muted2)">Desde</label>
        <input type="date" class="date-ic-azul" value="${_hrDesde}" onchange="_hrSet('desde',this.value)" style="${selS};width:130px;color-scheme:dark"></div>
      <div style="display:flex;flex-direction:column;gap:.15rem">
        <label style="font-size:.58rem;text-transform:uppercase;letter-spacing:.06em;color:var(--muted2)">Hasta</label>
        <input type="date" class="date-ic-azul" value="${_hrHasta}" onchange="_hrSet('hasta',this.value)" style="${selS};width:130px;color-scheme:dark"></div>
      <div style="display:flex;gap:.25rem;padding-bottom:.1rem">
        <button onclick="_hrNav(-1)" title="Período anterior" style="${btn}">◀</button>
        <button onclick="_hrHoy()" title="Período contable en curso (21 al 20)" style="${btn};background:rgba(16,185,129,.14);border-color:#10b98166;color:#10b981;font-weight:700">21→20</button>
        <button onclick="_hrNav(1)" title="Período siguiente" style="${btn}">▶</button>
      </div>
      <div style="display:flex;flex-direction:column;gap:.15rem">
        <label style="font-size:.58rem;text-transform:uppercase;letter-spacing:.06em;color:var(--muted2)">Proyecto</label>
        <select onchange="_hrSet('proy',this.value)" style="${selS};max-width:230px">
          <option value="">— Todos —</option>
          ${(DB.proyectos||[]).map(p=>`<option value="${_hhEsc(p.codigo)}" ${_hrProy===p.codigo?'selected':''}>[${_hhEsc(p.codigo)}] ${_hhEsc(p.nombre||'')}</option>`).join('')}
        </select></div>
      <div style="display:flex;flex-direction:column;gap:.15rem;flex:1;min-width:180px">
        <label style="font-size:.58rem;text-transform:uppercase;letter-spacing:.06em;color:var(--muted2)">Buscar</label>
        <input id="hrBuscar" value="${_hhEsc(_hrBuscar)}" placeholder="Nombre, DNI o cargo…" oninput="_hrSet('buscar',this.value)" style="${selS};width:100%;box-sizing:border-box"></div>
      <label style="display:inline-flex;align-items:center;gap:.35rem;font-size:.72rem;color:var(--muted2);cursor:pointer;padding-bottom:.35rem">
        <input type="checkbox" ${_hrVerDias?'checked':''} onchange="_hrSet('verDias',this.checked)" style="width:auto;margin:0;cursor:pointer"> Ver días
      </label>
      <button onclick="_hrExcel()" style="background:#166534;color:#fff;border:none;border-radius:6px;padding:.3rem .8rem;font-size:.72rem;font-weight:700;cursor:pointer">📊 Excel</button>
    </div></div>
  </div>

  <div class="kpi-row" style="margin-bottom:.9rem">
    ${kpi('Venta real',_hhFmt(totVenta),'#10b981',`${_hrDMY(_hrDesde)} → ${_hrDMY(_hrHasta)}`)}
    ${kpi('Incidencia total',totInc.toFixed(2),'#38bdf8','suma de meses-hombre')}
    ${kpi('Días trabajados',totTrab,'#f59e0b','TD + TN + A5 + DLT · base del cálculo')}
    ${kpi('Trabajadores',D.filas.length,'#a855f7',`en ${D.grupos.length} cargos`)}
    ${kpi('Sin tarifa',sinTar,sinTar?'#ef4444':'#64748b',sinTar?'no se valorizan':'todos valorizados')}
  </div>

  <div class="card">
    <div class="card-head"><span class="card-title">📋 Venta real por cargo</span>
      <span style="font-size:.62rem;color:var(--muted2)">Incidencia = días trabajados (TD+TN+A5+DLT) ÷ ${D.nDias} días del período</span>
    </div>
    <div class="card-body" style="padding:0"><div class="tbl-wrap" style="max-height:68vh;overflow:auto"><table style="width:100%;border-collapse:collapse">
      <thead><tr style="border-bottom:1px solid var(--border);position:sticky;top:0;background:var(--panel);z-index:2">
        <th style="${TH};text-align:center">#</th>
        <th style="${TH};text-align:left">Apellidos y Nombres</th>
        <th style="${TH};text-align:left">DNI</th>
        <th style="${TH};text-align:left">Cargo</th>
        ${dayHdrs}
        <th style="${TH};text-align:center">Días<br>traj.</th>
        <th style="${TH};text-align:center">Días<br>libres</th>
        <th style="${TH};text-align:center">DM</th>
        <th style="${TH};text-align:center">Sub</th>
        <th style="${TH};text-align:center">Total<br>días</th>
        <th style="${TH};text-align:right">% Inc.</th>
        <th style="${TH};text-align:right">Tarifa mes</th>
        <th style="${TH};text-align:right">Venta S/</th>
      </tr></thead>
      <tbody>${cuerpo||`<tr><td colspan="${nCols+9}" style="text-align:center;padding:2rem;color:var(--muted2);font-size:.8rem">Sin marcaciones de tareaje en este período</td></tr>`}</tbody>
      ${D.filas.length?`<tfoot><tr style="border-top:2px solid #10b981;background:rgba(16,185,129,.1);position:sticky;bottom:0">
        <td style="${TD};font-weight:900;color:#10b981" colspan="${nCols}">TOTAL</td>
        <td style="${TD};text-align:center;${MONO};font-weight:800">${totTrab}</td>
        <td style="${TD};text-align:center;${MONO};font-weight:800">${D.filas.reduce((s,f)=>s+f.libre,0)}</td>
        <td style="${TD};text-align:center;${MONO}">${D.filas.reduce((s,f)=>s+f.dm,0)||'—'}</td>
        <td style="${TD};text-align:center;${MONO}">${D.filas.reduce((s,f)=>s+f.sub,0)||'—'}</td>
        <td style="${TD};text-align:center;${MONO};font-weight:800">${D.filas.reduce((s,f)=>s+f.total,0)}</td>
        <td style="${TD};text-align:right;${MONO};font-weight:900;color:#38bdf8">${totInc.toFixed(2)}</td>
        <td style="${TD}"></td>
        <td style="${TD};text-align:right;${MONO};font-weight:900;color:#10b981;font-size:.8rem">${_hhFmt(totVenta)}</td>
      </tr></tfoot>`:''}
    </table></div></div>
  </div>

  <div style="font-size:.62rem;color:var(--muted);margin-top:.7rem;line-height:1.6">
    <strong>Días trabajados</strong> = TD + TN + A5 + DLT · <strong>Días libres</strong> = DL ·
    <strong>DM</strong> = descanso médico · <strong>Sub</strong> = licencias y vacaciones (LP, LM, LF, V).
    La <strong>incidencia</strong> solo suma los días trabajados: días libres, DM, faltas y permisos <strong>no generan venta</strong>.
    Quien trabaje los ${D.nDias} días del período da 1.00; la mitad, 0.50.
    <strong>Venta = incidencia × tarifa mensual del cargo</strong>, configurada en el tab Tarifas.
  </div>`;
}

// ── Excel del tab Venta Real ────────────────────────────────────────────────
function _hrExcel(){
  if(typeof XLSX==='undefined'){toast('Librería de Excel no disponible',true);return;}
  const D=_hrDatos();
  if(!D.filas.length){toast('No hay marcaciones para exportar',true);return;}
  const BOR={top:{style:'thin',color:{rgb:'D0D7E2'}},bottom:{style:'thin',color:{rgb:'D0D7E2'}},
             left:{style:'thin',color:{rgb:'D0D7E2'}},right:{style:'thin',color:{rgb:'D0D7E2'}}};
  const S=(v,o)=>({v:v==null?'':v,t:typeof v==='number'?'n':'s',s:Object.assign({
    font:{sz:9,bold:!!(o&&o.b),color:{rgb:(o&&o.col)||'0F172A'}},
    fill:{fgColor:{rgb:(o&&o.bg)||'FFFFFF'}},
    alignment:{horizontal:(o&&o.al)||'left',vertical:'center'},border:BOR},
    (o&&o.numFmt)?{numFmt:o.numFmt}:{})});
  const HDR=['#','Apellidos y Nombres','DNI','Cargo','Días traj.','Días libres','DM','Sub','Total días','% Inc.','Tarifa mes S/','Venta S/'];
  const aoa=[
    [S('VENTA REAL DE PERSONAL — SEGÚN TAREAJE',{b:1,bg:'065F46',col:'FFFFFF',al:'center'}),...Array(HDR.length-1).fill(S('',{bg:'065F46'}))],
    [S(`Período: ${_hrDMY(_hrDesde)} al ${_hrDMY(_hrHasta)} · ${D.nDias} días${_hrProy?' · '+_hrProy:''}`,{bg:'EEF2F8',col:'475569',al:'center'}),...Array(HDR.length-1).fill(S('',{bg:'EEF2F8'}))],
    HDR.map(h=>S(h,{b:1,bg:'334155',col:'FFFFFF',al:'center'}))
  ];
  let it=0,tv=0,ti=0;
  D.grupos.forEach((g,gi)=>{
    aoa.push([S(String(gi+1).padStart(2,'0'),{b:1,bg:'DBEAFE'}),S(g.cargo,{b:1,bg:'DBEAFE'}),
      ...Array(7).fill(S('',{bg:'DBEAFE'})),
      S(g.inc,{b:1,bg:'DBEAFE',al:'right',numFmt:'0.00'}),
      S(g.tarifa||null,{b:1,bg:'DBEAFE',al:'right',numFmt:'#,##0.00'}),
      S(g.venta,{b:1,bg:'DBEAFE',al:'right',numFmt:'#,##0.00'})]);
    g.items.forEach(f=>{
      it++;tv+=f.venta;ti+=f.inc;
      aoa.push([S(it,{al:'center'}),S(f.p.ape+', '+f.p.nom),S(f.p.dni||''),S(f.cargo),
        S(f.trab,{al:'center'}),S(f.libre,{al:'center'}),S(f.dm||null,{al:'center'}),S(f.sub||null,{al:'center'}),
        S(f.total,{al:'center',b:1}),S(f.inc,{al:'right',numFmt:'0.00'}),
        S(f.tarifa||null,{al:'right',numFmt:'#,##0.00',col:f.tarifa?'0F172A':'DC2626'}),
        S(f.venta||null,{al:'right',numFmt:'#,##0.00',b:1,col:'059669'})]);
    });
  });
  aoa.push([S('TOTAL',{b:1,bg:'EEF2F8',al:'right'}),...Array(8).fill(S('',{bg:'EEF2F8'})),
    S(ti,{b:1,bg:'EEF2F8',al:'right',numFmt:'0.00'}),S('',{bg:'EEF2F8'}),
    S(tv,{b:1,bg:'EEF2F8',al:'right',numFmt:'#,##0.00',col:'059669'})]);
  const ws=XLSX.utils.aoa_to_sheet(aoa);
  ws['!merges']=[{s:{r:0,c:0},e:{r:0,c:HDR.length-1}},{s:{r:1,c:0},e:{r:1,c:HDR.length-1}}];
  ws['!cols']=[{wch:5},{wch:34},{wch:11},{wch:28},{wch:10},{wch:11},{wch:6},{wch:6},{wch:10},{wch:9},{wch:14},{wch:15}];
  ws['!freeze']={xSplit:4,ySplit:3};
  const wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,ws,'Venta Real');
  XLSX.writeFile(wb,`Venta_Real_${_hrDesde}_al_${_hrHasta}.xlsx`);
  toast('✓ Venta real exportada');
}
