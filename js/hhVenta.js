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

  pg.innerHTML=`
  <div class="ph"><div class="ph-title" style="color:#10b981">👷 HH Venta</div>
    <div class="ph-sub">Tarifa mensual de venta por cargo — alimenta la Venta Personal de Cost Control</div></div>

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
