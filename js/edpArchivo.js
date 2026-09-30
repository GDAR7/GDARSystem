// ══════════════════════════════════════════════════════════════════════════
//  PROVEEDORES · ARCHIVO DE EDP
//
//  Todos los EDP emitidos, de todos los equipos, en una sola lista: para
//  buscar uno viejo, ver cuánto se valorizó y volver a sacar su documento.
//
//  El documento se archiva al GUARDAR el EDP (js/edpProveedores.js), tal como
//  quedó en ese momento. Por eso se reabre idéntico aunque después cambien la
//  tarifa del Máster, un parte o una firma: una valorización ya emitida no se
//  recalcula sola.
//
//  Los EDP guardados antes de que existiera el archivado no tienen documento;
//  aparecen marcados y basta volver a guardarlos para que quede archivado.
//
//  Prefijo _eda.
// ══════════════════════════════════════════════════════════════════════════

let _edaProv='',_edaEq='',_edaDesde='',_edaHasta='',_edaQ='',_edaSoloDoc=false;

const _edaEsc=s=>String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;')
  .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const _edaNorm=s=>String(s||'').toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g,'').trim();
const _edaDMY=s=>{const t=String(s||'');return t.includes('-')?t.slice(8,10)+'/'+t.slice(5,7)+'/'+t.slice(0,4):(t||'—');};
const _edaN2=v=>Number(v||0).toLocaleString('es-PE',{minimumFractionDigits:2,maximumFractionDigits:2});
const _edaSim=m=>String(m||'').toUpperCase().startsWith('DOL')?'US$':'S/';

function _edaSet(campo,val){
  if(campo==='prov')_edaProv=val;
  else if(campo==='eq')_edaEq=val;
  else if(campo==='desde')_edaDesde=val;
  else if(campo==='hasta')_edaHasta=val;
  else if(campo==='q')_edaQ=val;
  else if(campo==='soloDoc')_edaSoloDoc=!!val;
  rEdpArchivo();
}
function _edaLimpiar(){
  _edaProv='';_edaEq='';_edaDesde='';_edaHasta='';_edaQ='';_edaSoloDoc=false;
  rEdpArchivo();
}
function _edaDoc(r){return (r&&r.detalle&&r.detalle.docUrl)||'';}
function _edaEqDe(r){return (DB.equipos||[]).find(e=>+e.id===+r.eqId)||null;}

// Se cruza por el período del EDP: entra si se solapa con el rango elegido
function _edaEnRango(r){
  if(!_edaDesde&&!_edaHasta)return true;
  const d=String(r.desde||''),h=String(r.hasta||'');
  if(_edaHasta&&d&&d>_edaHasta)return false;
  if(_edaDesde&&h&&h<_edaDesde)return false;
  return true;
}
function _edaFilas(){
  const q=_edaNorm(_edaQ);
  return (DB.edpProveedores||[]).filter(r=>{
    if(_edaProv&&String(r.proveedor||'')!==_edaProv)return false;
    if(_edaEq&&String(r.eqId)!==String(_edaEq))return false;
    if(_edaSoloDoc&&!_edaDoc(r))return false;
    if(!_edaEnRango(r))return false;
    if(q){
      const eq=_edaEqDe(r);
      const txt=`${r.numEdp||''} ${r.proveedor||''} ${eq?eq.codigo:''} ${eq?eq.nombre||'':''} ${r.estado||''} ${r.creadoPor||''}`;
      if(!_edaNorm(txt).includes(q))return false;
    }
    return true;
  }).sort((a,b)=>String(b.hasta||'').localeCompare(String(a.hasta||''))
    ||String(b.numEdp||'').localeCompare(String(a.numEdp||''),'es',{numeric:true}));
}

function _edaAbrirDoc(id){
  const r=(DB.edpProveedores||[]).find(x=>+x.id===+id);
  const url=_edaDoc(r);
  if(!url){
    toast('Ese EDP no tiene documento archivado: ábralo en Generar EDP y vuelva a guardarlo',true);
    return;
  }
  const w=window.open(url,'_blank');
  if(!w)toast('Active las ventanas emergentes para ver el documento',true);
}

function _edaExportXls(){
  if(typeof XLSX==='undefined'){toast('Librería Excel no disponible',true);return;}
  const filas=_edaFilas();
  if(!filas.length){toast('No hay EDP que exportar con estos filtros',true);return;}
  const aoa=[['ARCHIVO DE EDP DE PROVEEDORES'],[],
    ['N° EDP','Equipo','Proveedor','Desde','Hasta','Moneda','Cant.','Unid.',
     'Monto equipo','Descuentos','Subtotal','IGV','Total','Detracción','A abonar',
     'Estado','Documento','Emitido por','Emitido el']];
  filas.forEach(r=>{
    const eq=_edaEqDe(r);
    aoa.push([r.numEdp||'',eq?eq.codigo:'(equipo eliminado)',r.proveedor||'',
      r.desde||'',r.hasta||'',r.moneda||'SOLES',+r.cantEquipo||0,r.tarifaUn||'',
      +r.montoEquipo||0,+r.montoDesc||0,+r.subtotal||0,+r.igv||0,+r.total||0,
      +r.detraccion||0,+r.aAbonar||0,r.estado||'',_edaDoc(r)?'Archivado':'Sin archivar',
      r.creadoPor||'',String(r.creadoEn||'').slice(0,10)]);
  });
  const T=filas.reduce((a,r)=>{a.eq+=+r.montoEquipo||0;a.de+=+r.montoDesc||0;
    a.to+=+r.total||0;a.ab+=+r.aAbonar||0;return a;},{eq:0,de:0,to:0,ab:0});
  aoa.push(['TOTAL','','','','','','','',+T.eq.toFixed(2),+T.de.toFixed(2),'','',
    +T.to.toFixed(2),'',+T.ab.toFixed(2),'','','','']);
  const ws=XLSX.utils.aoa_to_sheet(aoa);
  ws['!cols']=[{wch:9},{wch:16},{wch:28},{wch:12},{wch:12},{wch:9},{wch:9},{wch:7}]
    .concat(Array(7).fill({wch:13})).concat([{wch:11},{wch:13},{wch:18},{wch:12}]);
  const wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,ws,'Archivo EDP');
  XLSX.writeFile(wb,'Archivo de EDP.xlsx');
}

function rEdpArchivo(){
  const el=document.getElementById('edpArchivoBody');if(!el)return;
  const todos=(DB.edpProveedores||[]);
  const provs=[...new Set(todos.map(r=>String(r.proveedor||'').trim()).filter(Boolean))].sort();
  const eqIds=[...new Set(todos.map(r=>String(r.eqId)))]
    .map(id=>_edaEqDe({eqId:id})).filter(Boolean)
    .sort((a,b)=>String(a.codigo||'').localeCompare(String(b.codigo||'')));
  if(_edaProv&&!provs.includes(_edaProv))_edaProv='';

  const filas=_edaFilas();
  const conDoc=filas.filter(r=>_edaDoc(r)).length;
  const T=filas.reduce((a,r)=>{a.to+=+r.total||0;a.ab+=+r.aAbonar||0;return a;},{to:0,ab:0});

  const inpS='background:var(--panel2);border:1px solid var(--border);border-radius:6px;color:var(--text);padding:.3rem .5rem;font-size:.74rem;outline:none';
  const hayFiltro=_edaProv||_edaEq||_edaDesde||_edaHasta||_edaQ||_edaSoloDoc;

  const kpis=[
    {l:'EDP listados',v:filas.length,c:'#f97316'},
    {l:'Con documento',v:conDoc+' / '+filas.length,c:conDoc===filas.length?'#10b981':'#f59e0b'},
    {l:'Total valorizado',v:'S/ '+_edaN2(T.to),c:'#06b6d4'},
    {l:'A abonar',v:'S/ '+_edaN2(T.ab),c:'#22c55e'}
  ].map(k=>`<div class="kpi" style="--kc:${k.c}"><div class="kpi-lbl">${k.l}</div><div class="kpi-val" style="font-size:${String(k.v).length>9?'1.15rem':'1.7rem'}">${k.v}</div></div>`).join('');

  const TDs='padding:.4rem .55rem;border-bottom:1px solid var(--border);font-size:.74rem;white-space:nowrap';
  const THs='background:var(--panel2);color:var(--muted2);font-size:.6rem;font-weight:700;text-transform:uppercase;letter-spacing:.05em;padding:.4rem .55rem;white-space:nowrap;position:sticky;top:0;z-index:2';

  const tbody=filas.map(r=>{
    const eq=_edaEqDe(r);
    const SIM=_edaSim(r.moneda);
    const url=_edaDoc(r);
    const fDoc=r.detalle&&r.detalle.docFecha?String(r.detalle.docFecha).slice(0,10):'';
    return`<tr>
      <td style="${TDs};font-family:monospace;font-weight:800;color:var(--ceq)">${_edaEsc(r.numEdp||'—')}</td>
      <td style="${TDs};font-weight:700">${eq?_edaEsc(eq.codigo):'<span style="color:var(--muted2)">(equipo eliminado)</span>'}</td>
      <td style="${TDs};max-width:230px;overflow:hidden;text-overflow:ellipsis" title="${_edaEsc(r.proveedor||'')}">${_edaEsc(r.proveedor||'—')}</td>
      <td style="${TDs};font-family:monospace;font-size:.7rem">${_edaDMY(r.desde)} → ${_edaDMY(r.hasta)}</td>
      <td style="${TDs};text-align:right;font-family:monospace">${_edaN2(r.cantEquipo)} ${_edaEsc(r.tarifaUn||'')}</td>
      <td style="${TDs};text-align:right;font-family:monospace">${SIM} ${_edaN2(r.montoEquipo)}</td>
      <td style="${TDs};text-align:right;font-family:monospace;color:${+r.montoDesc?'#f87171':'var(--muted2)'}">${+r.montoDesc?SIM+' '+_edaN2(r.montoDesc):'—'}</td>
      <td style="${TDs};text-align:right;font-family:monospace;font-weight:700">${SIM} ${_edaN2(r.total)}</td>
      <td style="${TDs};text-align:right;font-family:monospace;font-weight:800;color:#22c55e">${SIM} ${_edaN2(r.aAbonar)}</td>
      <td style="${TDs};text-align:center"><span class="badge ${r.estado==='Pagado'?'b-green':'b-orange'}" style="font-size:.62rem">${_edaEsc(r.estado||'Emitido')}</span></td>
      <td style="${TDs};text-align:center">
        ${url?`<button onclick="_edaAbrirDoc(${+r.id})" title="Abrir el documento tal como se emitió${fDoc?' el '+_edaDMY(fDoc):''} · desde ahí, Ctrl+P para guardarlo en PDF" style="background:rgba(139,92,246,.15);border:1px solid #8b5cf6;border-radius:6px;color:#a78bfa;cursor:pointer;font-size:.68rem;font-weight:700;padding:.2rem .5rem">📄 Ver / PDF</button>`
        :`<span style="font-size:.64rem;color:var(--muted2)" title="Se archiva al guardar el EDP: ábralo en Generar EDP y guárdelo otra vez">sin archivar</span>`}
      </td>
      <td style="${TDs};font-size:.66rem;color:var(--muted2)">${_edaEsc(r.creadoPor||'—')}<br>${String(r.creadoEn||'').slice(0,10)}</td>
    </tr>`;
  }).join('');

  el.innerHTML=`
    <div class="card" style="margin-bottom:.8rem"><div style="padding:.5rem .8rem;display:flex;gap:.5rem;align-items:center;flex-wrap:wrap">
      <span style="font-size:.62rem;color:var(--muted2);font-weight:700;text-transform:uppercase;letter-spacing:.08em">Proveedor</span>
      <select onchange="_edaSet('prov',this.value)" style="${inpS};max-width:230px;border-color:${_edaProv?'#10b981':'var(--border)'}">
        <option value="">— Todos —</option>${provs.map(p=>`<option value="${_edaEsc(p)}"${p===_edaProv?' selected':''}>${_edaEsc(p)}</option>`).join('')}
      </select>
      <span style="font-size:.62rem;color:var(--muted2);font-weight:700;text-transform:uppercase;letter-spacing:.08em">Equipo</span>
      <select onchange="_edaSet('eq',this.value)" style="${inpS};max-width:170px;border-color:${_edaEq?'#10b981':'var(--border)'}">
        <option value="">— Todos —</option>${eqIds.map(e=>`<option value="${+e.id}"${String(e.id)===String(_edaEq)?' selected':''}>${_edaEsc(e.codigo)}</option>`).join('')}
      </select>
      <span style="font-size:.62rem;color:var(--muted2);font-weight:700;text-transform:uppercase;letter-spacing:.08em">Período</span>
      <input type="date" value="${_edaDesde}" onchange="_edaSet('desde',this.value)" style="${inpS};width:140px">
      <input type="date" value="${_edaHasta}" onchange="_edaSet('hasta',this.value)" style="${inpS};width:140px">
      <label style="display:flex;align-items:center;gap:.3rem;font-size:.7rem;color:var(--muted2);cursor:pointer">
        <input type="checkbox" ${_edaSoloDoc?'checked':''} onchange="_edaSet('soloDoc',this.checked)"> solo con documento
      </label>
      ${hayFiltro?`<button onclick="_edaLimpiar()" style="background:transparent;border:1px solid var(--border);border-radius:6px;color:var(--muted2);padding:.3rem .55rem;font-size:.7rem;cursor:pointer">✕ Limpiar</button>`:''}
      <div class="search-wrap" style="margin-left:auto"><span>🔍</span><input id="edaBuscar" class="search-input" placeholder="N° EDP, equipo, proveedor..." value="${_edaEsc(_edaQ)}" oninput="_edaSet('q',this.value);buscarFoco('edaBuscar',rEdpArchivo)"></div>
      <button onclick="_edaExportXls()" style="background:#166534;border:none;border-radius:6px;color:#fff;padding:.3rem .7rem;font-size:.72rem;font-weight:700;cursor:pointer;white-space:nowrap">📊 Excel</button>
    </div></div>

    <div class="kpi-row">${kpis}</div>

    <div class="card">
      <div class="card-head"><span class="card-title">📁 Archivo de EDP</span>
        <span style="font-size:.68rem;color:var(--muted2)">el documento se archiva al guardar el EDP y se reabre tal como se emitió</span></div>
      <div class="card-body" style="padding:0"><div class="tbl-wrap" style="max-height:65vh;overflow:auto">
        <table style="min-width:100%;border-collapse:collapse"><thead><tr>
          <th style="${THs}">N° EDP</th><th style="${THs};text-align:left">Equipo</th>
          <th style="${THs};text-align:left">Proveedor</th><th style="${THs};text-align:left">Período</th>
          <th style="${THs};text-align:right">Cant.</th><th style="${THs};text-align:right">Equipo</th>
          <th style="${THs};text-align:right">Descuentos</th><th style="${THs};text-align:right">Total</th>
          <th style="${THs};text-align:right">A abonar</th><th style="${THs}">Estado</th>
          <th style="${THs}">Documento</th><th style="${THs};text-align:left">Emitido</th>
        </tr></thead><tbody>
          ${tbody||`<tr><td colspan="12" style="${TDs};text-align:center;padding:2.5rem;color:var(--muted2)">${todos.length?'Ningún EDP con estos filtros':'Todavía no hay EDP guardados'}</td></tr>`}
        </tbody></table>
      </div></div>
    </div>`;
}
