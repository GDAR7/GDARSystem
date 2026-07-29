// ══ EDP PROVEEDORES — Estado de Pago para proveedores de equipos ══
// Página 1: EDP (horas efectivas × tarifa − descuentos de Auxilios Mecánicos, IGV, detracción)
// Página 2: Consolidado de Horas Trabajadas (Partes Diarios del equipo en el período)
let _edpEqId='', _edpNum='', _edpDesde='', _edpHasta='';
let _edpCliente='', _edpRuc='', _edpDireccion='';
let _edpTarifaOv=null, _edpHminOv=null, _edpTarifaAtencion=0;
let _edpDescManual=[];

function _edpFmtDMY(iso){if(!iso||!iso.includes('-'))return iso||'—';const[y,m,d]=iso.split('-');return`${d}/${m}/${y}`;}
const _edpN2=v=>Number(v||0).toLocaleString('es-PE',{minimumFractionDigits:2,maximumFractionDigits:2});

function _edpSet(campo,val){
  if(campo==='eq')_edpEqId=val;
  else if(campo==='num')_edpNum=val;
  else if(campo==='desde')_edpDesde=val;
  else if(campo==='hasta')_edpHasta=val;
  else if(campo==='cliente')_edpCliente=val;
  else if(campo==='ruc')_edpRuc=val;
  else if(campo==='direccion')_edpDireccion=val;
  else if(campo==='tarifa')_edpTarifaOv=val===''?null:+val;
  else if(campo==='hmin')_edpHminOv=val===''?null:+val;
  else if(campo==='tarifaAtencion')_edpTarifaAtencion=+val||0;
  rEdpProveedores();
}
function _edpAddDescManual(){
  _edpDescManual.push({desc:'',und:'und',cant:0,precio:0});
  rEdpProveedores();
}
function _edpSetDescManual(i,campo,val){
  const r=_edpDescManual[i];if(!r)return;
  r[campo]=(campo==='cant'||campo==='precio')?(+val||0):val;
  rEdpProveedores();
}
function _edpDelDescManual(i){
  _edpDescManual.splice(i,1);
  rEdpProveedores();
}

// Consolidado de horas del período (H. Motor = ef del parte · Calentamiento = campo del Máster · H. Efectiva = Motor − Calentamiento)
function _edpHoras(eq,desde,hasta){
  const calent=+eq.calentamientoH||0;
  const partes=(DB.partes||[]).filter(p=>p.eqId===eq.id&&p.fecha>=desde&&p.fecha<=hasta).sort((a,b)=>a.fecha.localeCompare(b.fecha));
  const dias=partes.map(p=>{
    const motor=+p.ef||0;
    const cal=motor>0?calent:0;
    const efectiva=Math.max(0,+(motor-cal).toFixed(2));
    return{fecha:p.fecha,turno:p.turno||'—',desc:p.act||'—',hrIni:+p.hrIni||0,hrFin:+p.hrFin||0,motor,cal,efectiva,obs:p.observaciones||'Operativo',im:Math.max(0,+p.im||0)};
  });
  const horasMotor=dias.reduce((s,d)=>s+d.motor,0);
  const horasCal=dias.reduce((s,d)=>s+d.cal,0);
  const horasEfectivas=dias.reduce((s,d)=>s+d.efectiva,0);
  const horasInop=dias.reduce((s,d)=>s+d.im,0);
  const diasConParte=dias.filter(d=>d.motor>0).length;
  const diasPeriodo=Math.max(1,Math.round((new Date(hasta+'T12:00')-new Date(desde+'T12:00'))/864e5)+1);
  const horasDisp=diasPeriodo*24;
  const dispMec=horasDisp>0?Math.max(0,Math.min(100,(horasDisp-horasInop)/horasDisp*100)):100;
  const horasMinimas=_edpHminOv!=null?_edpHminOv:(+eq.hrsMinVenta||0);
  const horasMinimasAPagar=Math.max(0,+(horasMinimas-horasEfectivas).toFixed(2));
  const horasAPagar=Math.max(horasMinimas,horasEfectivas);
  return{dias,horasMotor,horasCal,horasEfectivas,horasInop,diasConParte,diasPeriodo,dispMec,horasMinimas,horasMinimasAPagar,horasAPagar};
}

// Descuentos: insumos de Almacén ECO usados en Auxilios Mecánicos del equipo + horas de atención mecánica (T. Parada)
function _edpDescAuto(eq,desde,hasta){
  const auxs=(DB.auxiliosMecanicos||[]).filter(a=>a.eqId===eq.id&&a.fecha>=desde&&a.fecha<=hasta&&a.est!=='Anulado');
  const insumos=[];
  auxs.forEach(a=>{
    (DB.auxMecInsumos||[]).filter(i=>i.auxilioId===a.id&&/ALMAC/i.test(i.origen||'')).forEach(i=>{
      const cat=(DB.catalogoItems||[]).find(c=>c.cod===i.cod);
      const pur=cat&&cat.pur?+cat.pur:0;
      insumos.push({desc:i.desc,und:i.und||'und',cant:+i.cant||0,precio:pur,total:+((+i.cant||0)*pur).toFixed(2),fecha:a.fecha,auxCod:a.cod});
    });
  });
  const horasAtencion=auxs.reduce((s,a)=>s+(+a.tiempoParada||0),0);
  return{insumos,horasAtencion,auxs};
}

function rEdpProveedores(){
  const pg=document.getElementById('edpBody');if(!pg)return;
  const eqs=(DB.equipos||[]).slice().sort((a,b)=>(a.codigo||'').localeCompare(b.codigo||''));
  const eq=_edpEqId?eqs.find(e=>e.id===+_edpEqId):null;

  const inpS='background:var(--panel2);border:1px solid var(--border);border-radius:6px;padding:.32rem .55rem;color:var(--text);font-size:.76rem';
  const filtroBar=`<div class="card" style="margin-bottom:.9rem">
    <div class="card-head"><span class="card-title">🧾 Datos del EDP</span></div>
    <div class="card-body"><div class="fg-grid">
      <div class="fg"><label>Equipo</label><select onchange="_edpSet('eq',this.value)" style="${inpS}">
        <option value="">— Seleccionar —</option>
        ${eqs.map(e=>`<option value="${e.id}" ${e.id===+_edpEqId?'selected':''}>${e.codigo} — ${(e.nombre||'').split(' ').slice(0,4).join(' ')}${e.proveedor?' · '+e.proveedor:''}</option>`).join('')}
      </select></div>
      <div class="fg"><label>N° EDP</label><input value="${_edpNum}" placeholder="05" oninput="_edpSet('num',this.value)" style="${inpS}"></div>
      <div class="fg"><label>Desde</label><input type="date" class="date-ic-azul" value="${_edpDesde}" onchange="_edpSet('desde',this.value)" style="${inpS};color-scheme:dark"></div>
      <div class="fg"><label>Hasta</label><input type="date" class="date-ic-azul" value="${_edpHasta}" onchange="_edpSet('hasta',this.value)" style="${inpS};color-scheme:dark"></div>
      <div class="fg"><label>Cliente</label><input value="${_edpCliente}" placeholder="Nombre del cliente final" oninput="_edpSet('cliente',this.value)" style="${inpS}"></div>
      <div class="fg"><label>RUC Cliente</label><input value="${_edpRuc}" placeholder="20xxxxxxxxx" oninput="_edpSet('ruc',this.value)" style="${inpS}"></div>
      <div class="fg" style="grid-column:1/-1"><label>Dirección</label><input value="${_edpDireccion}" placeholder="Dirección del cliente" oninput="_edpSet('direccion',this.value)" style="${inpS}"></div>
    </div></div>
  </div>`;

  if(!eq||!_edpDesde||!_edpHasta){
    pg.innerHTML=filtroBar+`<div class="card"><div class="card-body" style="text-align:center;padding:2.5rem;color:var(--muted2);font-size:.85rem">Selecciona equipo y período (Desde/Hasta) para generar la vista previa del EDP.</div></div>`;
    return;
  }

  const H=_edpHoras(eq,_edpDesde,_edpHasta);
  const D=_edpDescAuto(eq,_edpDesde,_edpHasta);
  const tarifa=_edpTarifaOv!=null?_edpTarifaOv:(+eq.tarifa||0);
  const tarifaUn=eq.tarifaUn||'HM';
  const cantEquipo=tarifaUn==='HM'?H.horasEfectivas:(tarifaUn==='DIA'?H.diasConParte:1);
  const totEquipo=+(cantEquipo*tarifa).toFixed(2);

  const descRows=[
    ...D.insumos.map(i=>({desc:`Consumo: ${i.desc} (${_edpFmtDMY(i.fecha)} · ${i.auxCod})`,und:i.und,cant:i.cant,precio:i.precio,total:i.total})),
    ...(D.horasAtencion>0?[{desc:'Atención mecánica por parte de Ecosermo',und:'hh',cant:+D.horasAtencion.toFixed(2),precio:_edpTarifaAtencion,total:+(D.horasAtencion*_edpTarifaAtencion).toFixed(2)}]:[]),
    ..._edpDescManual.map(r=>({...r,total:+(r.cant*r.precio).toFixed(2)}))
  ];
  const totDesc=descRows.reduce((s,r)=>s+r.total,0);
  const presupuestoTotal=+(totEquipo-totDesc).toFixed(2);
  const subTotal=presupuestoTotal;
  const igv=+(subTotal*0.18).toFixed(2);
  const total=+(subTotal+igv).toFixed(2);
  const detraccion=+(total*0.10).toFixed(2);
  const aAbonar=+(total-detraccion).toFixed(2);

  const editBar=`<div class="card" style="margin-bottom:.9rem">
    <div class="card-head"><span class="card-title">⚙️ Ajustes antes de imprimir</span></div>
    <div class="card-body"><div class="fg-grid">
      <div class="fg"><label>Tarifa Equipo S/ (${tarifaUn})</label><input type="number" step="0.01" value="${tarifa}" oninput="_edpSet('tarifa',this.value)" style="${inpS}"></div>
      <div class="fg"><label>Horas Mínimas (contrato)</label><input type="number" step="0.01" value="${H.horasMinimas}" oninput="_edpSet('hmin',this.value)" style="${inpS}"></div>
      <div class="fg"><label>Tarifa Atención Mecánica S//hh</label><input type="number" step="0.01" value="${_edpTarifaAtencion}" oninput="_edpSet('tarifaAtencion',this.value)" style="${inpS}"></div>
    </div>
    <div style="margin-top:.6rem">
      <button onclick="_edpAddDescManual()" style="font-size:.72rem;padding:.3rem .7rem;border-radius:6px;border:1px solid var(--border);background:transparent;color:var(--muted2);cursor:pointer">＋ Descuento manual</button>
      ${_edpDescManual.map((r,i)=>`<div style="display:flex;gap:.4rem;align-items:center;margin-top:.4rem">
        <input placeholder="Descripción" value="${r.desc}" oninput="_edpSetDescManual(${i},'desc',this.value)" style="${inpS};flex:1">
        <input placeholder="und" value="${r.und}" oninput="_edpSetDescManual(${i},'und',this.value)" style="${inpS};width:70px">
        <input type="number" placeholder="Cant." value="${r.cant}" oninput="_edpSetDescManual(${i},'cant',this.value)" style="${inpS};width:80px">
        <input type="number" placeholder="Precio" value="${r.precio}" oninput="_edpSetDescManual(${i},'precio',this.value)" style="${inpS};width:90px">
        <button onclick="_edpDelDescManual(${i})" style="background:none;border:none;color:#ef4444;cursor:pointer;font-size:.8rem">✕</button>
      </div>`).join('')}
    </div>
    <div style="margin-top:.7rem"><button onclick="_edpPrint()" style="font-size:.78rem;padding:.4rem .9rem;border-radius:6px;border:none;background:#8b5cf6;color:#fff;cursor:pointer;font-weight:700">🖨 Imprimir / PDF</button></div>
    </div>
  </div>`;

  pg.innerHTML=filtroBar+editBar+`<div style="background:#fff;border-radius:8px;padding:1.2rem;overflow-x:auto">${_edpDocHtml(eq,H,D,{tarifa,tarifaUn,cantEquipo,totEquipo,descRows,totDesc,presupuestoTotal,subTotal,igv,total,detraccion,aAbonar})}</div>`;
}

// HTML compartido entre la vista previa (in-app) y la impresión — página 1 (EDP) + página 2 (Consolidado de Horas)
function _edpDocHtml(eq,H,D,F){
  const _logoUrl=window.location.href.replace(/[^\/\\]+$/,'')+'09.-ERP/Imagenes/ECOSERMO-LOGO.png';
  const AZ='#1e3a5f';
  const infoCell=(l,v)=>`<div><strong style="display:block;color:#64748b;font-size:9px;text-transform:uppercase;letter-spacing:.05em">${l}</strong><span style="font-size:11px;font-weight:600;color:#111">${v||'—'}</span></div>`;
  const TH=`background:${AZ};color:#fff;padding:4px 6px;font-size:9px;text-transform:uppercase;text-align:center`;
  const TD=`border:1px solid #cbd5e1;padding:3px 6px;font-size:10px;color:#111`;

  const filaEq=`<tr><td style="${TD}">1.01</td><td style="${TD};font-weight:700">${eq.codigo} — ${eq.nombre||''}</td><td style="${TD};text-align:center">${F.tarifaUn}</td><td style="${TD};text-align:right">${_edpN2(F.cantEquipo)}</td><td style="${TD};text-align:right">${_edpN2(F.tarifa)}</td><td style="${TD};text-align:right;font-weight:700">S/ ${_edpN2(F.totEquipo)}</td></tr>`;
  const filasDesc=F.descRows.length?F.descRows.map((r,i)=>`<tr><td style="${TD}">2.${String(i+1).padStart(2,'0')}</td><td style="${TD}">${r.desc}</td><td style="${TD};text-align:center">${r.und}</td><td style="${TD};text-align:right">(${_edpN2(r.cant)})</td><td style="${TD};text-align:right">${_edpN2(r.precio)}</td><td style="${TD};text-align:right;color:#b91c1c">S/ (${_edpN2(r.total)})</td></tr>`).join(''):`<tr><td colspan="6" style="${TD};text-align:center;color:#94a3b8">Sin descuentos registrados en Auxilios Mecánicos para este período</td></tr>`;

  const resumen=(l,v,bg)=>`<tr><td style="padding:3px 8px;font-size:10px;color:#334155">${l}</td><td style="padding:3px 8px;text-align:right;font-weight:700;font-size:10px;${bg?'background:'+bg:''}">S/ ${_edpN2(v)}</td></tr>`;

  const pagina1=`<div style="font-family:Arial,sans-serif;color:#111">
    <div style="display:flex;align-items:center;justify-content:space-between;border-bottom:2px solid ${AZ};padding-bottom:8px;margin-bottom:8px">
      <img src="${_logoUrl}" style="height:44px;object-fit:contain">
      <div style="text-align:center;flex:1">
        <div style="font-size:16px;font-weight:900;color:${AZ}">EDP N° ${_edpNum||'—'}</div>
        <div style="font-size:10px;color:#64748b">CONTRATA: ${eq.proveedor||'—'}</div>
      </div>
      <div style="text-align:right;font-size:9px;color:#64748b">${new Date().toLocaleDateString('es-PE')}</div>
    </div>
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:.4rem 1rem;margin-bottom:10px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:8px">
      ${infoCell('Cliente',_edpCliente)}${infoCell('RUC Cliente',_edpRuc)}${infoCell('Proyecto',eq.proyecto)}${infoCell('Estado de Pago N°',_edpNum)}
      ${infoCell('Período',_edpFmtDMY(_edpDesde)+' al '+_edpFmtDMY(_edpHasta))}${infoCell('Proveedor',eq.proveedor)}${infoCell('RUC Proveedor',eq.rucProveedor)}${infoCell('Moneda','SOLES')}
      ${infoCell('Dirección',_edpDireccion)}${infoCell('Horas Mínimas',H.horasMinimas?_edpN2(H.horasMinimas)+' hrs':'—')}
    </div>
    <table style="width:100%;border-collapse:collapse;margin-bottom:10px">
      <thead><tr><th style="${TH}">Ítem</th><th style="${TH};text-align:left">Descripción</th><th style="${TH}">Unid.</th><th style="${TH}">Cant.</th><th style="${TH}">P. Unit S/</th><th style="${TH}">Total S/</th></tr></thead>
      <tbody>
        <tr><td colspan="6" style="${TD};font-weight:800;background:#e2e8f0">1.00 EQUIPO</td></tr>
        ${filaEq}
        <tr><td colspan="6" style="${TD};font-weight:800;background:#e2e8f0">2.00 DESCUENTO</td></tr>
        ${filasDesc}
        <tr><td colspan="5" style="${TD};text-align:right;font-weight:900;background:#dbeafe">PRESUPUESTO TOTAL (S/.)</td><td style="${TD};text-align:right;font-weight:900;background:#dbeafe">S/ ${_edpN2(F.presupuestoTotal)}</td></tr>
      </tbody>
    </table>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem">
      <table style="border:1px solid #cbd5e1"><tbody>
        <tr><td colspan="2" style="${TD};font-weight:800;background:#f1f5f9">${eq.proveedor||'PROVEEDOR'}</td></tr>
        ${resumen('NETO (S/.)',F.subTotal)}${resumen('SUB TOTAL (S/.)',F.subTotal)}${resumen('IGV 18%',F.igv)}${resumen('TOTAL (S/.)',F.total,'#fde047')}
      </tbody></table>
      <table style="border:1px solid #cbd5e1"><tbody>
        <tr><td colspan="2" style="${TD};font-weight:800;background:#f1f5f9">ECOSERMO</td></tr>
        ${resumen('DETRACCIÓN 10%',F.detraccion)}${resumen('A ABONAR',F.aAbonar,'#fde047')}
      </tbody></table>
    </div>
  </div>`;

  const filasHoras=H.dias.map((d,i)=>`<tr>
    <td style="${TD};text-align:center">${i+1}</td><td style="${TD}">${_edpFmtDMY(d.fecha)}</td><td style="${TD};text-align:center">${d.turno}</td>
    <td style="${TD}">${d.desc}</td><td style="${TD};text-align:right">${_edpN2(d.hrIni)}</td><td style="${TD};text-align:right">${_edpN2(d.hrFin)}</td>
    <td style="${TD};text-align:right">${_edpN2(d.motor)}</td><td style="${TD};text-align:right">${_edpN2(d.cal)}</td><td style="${TD};text-align:right;font-weight:700">${_edpN2(d.efectiva)}</td>
    <td style="${TD}">${d.obs}</td>
  </tr>`).join('');

  const pagina2=`<div style="font-family:Arial,sans-serif;color:#111">
    <div style="text-align:center;margin-bottom:6px">
      <div style="font-size:13px;font-weight:900;color:${AZ}">CONSOLIDADO DE HORAS TRABAJADAS</div>
      <div style="font-size:10px;color:#2563eb;font-weight:700">${eq.codigo} — ${eq.nombre||''} · ${eq.proveedor||''}</div>
      <div style="font-size:9px;color:#64748b">Período: ${_edpFmtDMY(_edpDesde)} al ${_edpFmtDMY(_edpHasta)}</div>
    </div>
    <table style="width:100%;border-collapse:collapse;margin-bottom:8px">
      <thead><tr>
        <th style="${TH}">#</th><th style="${TH}">Fecha</th><th style="${TH}">Turno</th><th style="${TH};text-align:left">Descripción</th>
        <th style="${TH}">H. Inicial</th><th style="${TH}">H. Final</th><th style="${TH}">H. Motor</th><th style="${TH}">Calent.</th><th style="${TH}">H. Efectiva</th><th style="${TH};text-align:left">Observaciones</th>
      </tr></thead>
      <tbody>${filasHoras||`<tr><td colspan="10" style="${TD};text-align:center;color:#94a3b8">Sin partes diarios en este período</td></tr>`}</tbody>
      <tfoot><tr style="background:#e2e8f0;font-weight:800"><td colspan="6" style="${TD};text-align:right">TOTALES</td><td style="${TD};text-align:right">${_edpN2(H.horasMotor)}</td><td style="${TD};text-align:right">${_edpN2(H.horasCal)}</td><td style="${TD};text-align:right">${_edpN2(H.horasEfectivas)}</td><td style="${TD}"></td></tr></tfoot>
    </table>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;max-width:520px">
      <table style="border:1px solid #cbd5e1"><tbody>
        <tr><td style="${TD}">DISPONIBILIDAD MECÁNICA</td><td style="${TD};text-align:right;font-weight:700">${H.dispMec.toFixed(1)}%</td></tr>
        <tr><td style="${TD}">HORAS MÍNIMAS</td><td style="${TD};text-align:right;font-weight:700">${_edpN2(H.horasMinimas)} hrs</td></tr>
      </tbody></table>
      <table style="border:1px solid #cbd5e1"><tbody>
        <tr><td style="${TD}">HORAS TRABAJADAS</td><td style="${TD};text-align:right;font-weight:700">${_edpN2(H.horasEfectivas)} hrs</td></tr>
        <tr><td style="${TD}">HORAS MÍNIMAS A PAGAR</td><td style="${TD};text-align:right;font-weight:700">${_edpN2(H.horasMinimasAPagar)} hrs</td></tr>
        <tr><td style="${TD};font-weight:800;background:#fde047">HORAS A PAGAR</td><td style="${TD};text-align:right;font-weight:900;background:#fde047">${_edpN2(H.horasAPagar)} hrs</td></tr>
      </tbody></table>
    </div>
  </div>`;

  return`<div>${pagina1}</div><div style="page-break-before:always;margin-top:14px;border-top:2px dashed #cbd5e1;padding-top:14px">${pagina2}</div>`;
}

function _edpPrint(){
  const eq=(DB.equipos||[]).find(e=>e.id===+_edpEqId);
  if(!eq||!_edpDesde||!_edpHasta){toast('Completa equipo y período primero',true);return;}
  const H=_edpHoras(eq,_edpDesde,_edpHasta);
  const D=_edpDescAuto(eq,_edpDesde,_edpHasta);
  const tarifa=_edpTarifaOv!=null?_edpTarifaOv:(+eq.tarifa||0);
  const tarifaUn=eq.tarifaUn||'HM';
  const cantEquipo=tarifaUn==='HM'?H.horasEfectivas:(tarifaUn==='DIA'?H.diasConParte:1);
  const totEquipo=+(cantEquipo*tarifa).toFixed(2);
  const descRows=[
    ...D.insumos.map(i=>({desc:`Consumo: ${i.desc} (${_edpFmtDMY(i.fecha)} · ${i.auxCod})`,und:i.und,cant:i.cant,precio:i.precio,total:i.total})),
    ...(D.horasAtencion>0?[{desc:'Atención mecánica por parte de Ecosermo',und:'hh',cant:+D.horasAtencion.toFixed(2),precio:_edpTarifaAtencion,total:+(D.horasAtencion*_edpTarifaAtencion).toFixed(2)}]:[]),
    ..._edpDescManual.map(r=>({...r,total:+(r.cant*r.precio).toFixed(2)}))
  ];
  const totDesc=descRows.reduce((s,r)=>s+r.total,0);
  const presupuestoTotal=+(totEquipo-totDesc).toFixed(2);
  const subTotal=presupuestoTotal;
  const igv=+(subTotal*0.18).toFixed(2);
  const total=+(subTotal+igv).toFixed(2);
  const detraccion=+(total*0.10).toFixed(2);
  const aAbonar=+(total-detraccion).toFixed(2);
  const F={tarifa,tarifaUn,cantEquipo,totEquipo,descRows,totDesc,presupuestoTotal,subTotal,igv,total,detraccion,aAbonar};

  const html=`<!DOCTYPE html><html><head><meta charset="utf-8"><title>EDP ${_edpNum||''} - ${eq.codigo}</title>
  <style>@page{size:A4 portrait;margin:1.2cm}*{box-sizing:border-box;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}
  body{font-family:Arial,sans-serif;margin:0}
  table{border-collapse:collapse}
  tr{page-break-inside:avoid}</style></head><body>${_edpDocHtml(eq,H,D,F)}
  <script>window.onload=()=>{window.print();}<\/script></body></html>`;
  const win=window.open('','_blank');
  if(!win){toast('Active ventanas emergentes para imprimir',true);return;}
  win.document.write(html);win.document.close();
}
