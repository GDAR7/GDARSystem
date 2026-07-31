// ══ EDP PROVEEDORES — Estado de Pago para proveedores de equipos ══
// Página 1: EDP (horas efectivas × tarifa − descuentos de Auxilios Mecánicos, IGV, detracción)
// Página 2: Consolidado de Horas Trabajadas (Partes Diarios del equipo en el período)
let _edpEqId='', _edpNum='', _edpDesde='', _edpHasta='';
// Cliente fijo (abreviado): ECOSERMO · RUC 20571533180
let _edpCliente='ECOSERMO', _edpRuc='20571533180', _edpDireccion='';
let _edpTarifaOv=null, _edpHminOv=null, _edpTarifaAtencion=0;
let _edpCantPres=null;   // Cantidad contractual (columna PRESUPUESTO) — opcional
let _edpAcumAnt=0;       // Total valorizado en EDP anteriores (para ACUMULADO ACTUAL)
let _edpFirmaProv='', _edpFirmaEco=''; // Nombres bajo la línea de firma
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
  else if(campo==='cantPres')_edpCantPres=val===''?null:+val;
  else if(campo==='acumAnt')_edpAcumAnt=+val||0;
  else if(campo==='firmaProv')_edpFirmaProv=val;
  else if(campo==='firmaEco')_edpFirmaEco=val;
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
    const condicion=p.condicion||'OPERATIVO';
    const inop=/^INOPERATIVO/i.test(condicion);
    // Valorización por días: cada parte OPERATIVO cuenta 1.00 · INOPERATIVO cuenta 0
    const trabajo=inop?0:1;
    return{fecha:p.fecha,turno:p.turno||'—',desc:p.act||'—',hrIni:+p.hrIni||0,hrFin:+p.hrFin||0,motor,cal,efectiva,condicion,trabajo,obs:inop?condicion:(p.observaciones||'Operativo'),im:Math.max(0,+p.im||0)};
  });
  const horasMotor=dias.reduce((s,d)=>s+d.motor,0);
  const horasCal=dias.reduce((s,d)=>s+d.cal,0);
  const horasEfectivas=dias.reduce((s,d)=>s+d.efectiva,0);
  const horasInop=dias.reduce((s,d)=>s+d.im,0);
  const diasConParte=dias.filter(d=>d.motor>0).length;
  const diasPeriodo=Math.max(1,Math.round((new Date(hasta+'T12:00')-new Date(desde+'T12:00'))/864e5)+1);
  const horasDisp=diasPeriodo*24;
  const dispMec=horasDisp>0?Math.max(0,Math.min(100,(horasDisp-horasInop)/horasDisp*100)):100;
  // Horas mínimas del CONTRATO CON EL PROVEEDOR (campo "Horas Mínimas" del Máster), no las de venta al cliente
  const horasMinimas=_edpHminOv!=null?_edpHminOv:(+eq.horasMinimas||0);
  const horasMinimasAPagar=Math.max(0,+(horasMinimas-horasEfectivas).toFixed(2));
  const horasAPagar=Math.max(horasMinimas,horasEfectivas);
  const diasTrabajados=dias.reduce((s,d)=>s+d.trabajo,0);
  return{dias,horasMotor,horasCal,horasEfectivas,horasInop,diasConParte,diasPeriodo,dispMec,horasMinimas,horasMinimasAPagar,horasAPagar,diasTrabajados};
}

// Descuentos: insumos de Almacén ECO usados en Auxilios Mecánicos del equipo + horas de atención mecánica (T. Parada)
function _edpDescAuto(eq,desde,hasta){
  const auxs=(DB.auxiliosMecanicos||[]).filter(a=>a.eqId===eq.id&&a.fecha>=desde&&a.fecha<=hasta&&a.est!=='Anulado');
  const insumos=[];
  auxs.forEach(a=>{
    (DB.auxMecInsumos||[]).filter(i=>i.auxilioId===a.id&&/ALMAC/i.test(i.origen||'')).forEach(i=>{
      const cat=(DB.catalogoItems||[]).find(c=>c.cod===i.cod);
      const pur=cat&&cat.pur?+cat.pur:0;
      insumos.push({desc:i.desc,cod:i.cod||'',und:i.und||'und',cant:+i.cant||0,precio:pur,total:+((+i.cant||0)*pur).toFixed(2),fecha:a.fecha,auxCod:a.cod});
    });
  });
  // Atención mecánica: monto por auxilio = T. Parada (h) × tarifa S//hh
  const atenciones=auxs.filter(a=>(+a.tiempoParada||0)>0).map(a=>{
    const horas=+a.tiempoParada||0;
    return{auxCod:a.cod,fecha:a.fecha,tipo:a.tipo||'—',desc:a.desc||'—',mec:[a.mec,a.mec2].filter(Boolean).join(' / ')||'—',
      horas,precio:_edpTarifaAtencion,total:+(horas*_edpTarifaAtencion).toFixed(2)};
  });
  const horasAtencion=auxs.reduce((s,a)=>s+(+a.tiempoParada||0),0);
  return{insumos,horasAtencion,auxs,atenciones};
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
  const cantEquipo=tarifaUn==='HM'?H.horasEfectivas:(tarifaUn==='DIA'?H.diasTrabajados:1);
  const totEquipo=+(cantEquipo*tarifa).toFixed(2);
  const _mon=eq.moneda||'SOLES';
  const _sim=_mon==='DOLARES'?'US$':_mon==='EUROS'?'€':'S/';

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
      <div class="fg"><label>Tarifa Equipo ${_sim} (${tarifaUn})</label><input type="number" step="0.01" value="${tarifa}" oninput="_edpSet('tarifa',this.value)" style="${inpS}"></div>
      ${tarifaUn==='HM'?`<div class="fg"><label>Horas Mínimas (contrato)</label><input type="number" step="0.01" value="${H.horasMinimas}" oninput="_edpSet('hmin',this.value)" style="${inpS}"></div>`:''}
      <div class="fg"><label>Tarifa Atención Mecánica ${_sim}/hh</label><input type="number" step="0.01" value="${_edpTarifaAtencion}" oninput="_edpSet('tarifaAtencion',this.value)" style="${inpS}"></div>
      <div class="fg"><label>Cant. Presupuesto (${tarifaUn})</label><input type="number" step="0.01" value="${_edpCantPres!=null?_edpCantPres:''}" placeholder="opcional" title="Cantidad contractual — se usa para el % de avance" oninput="_edpSet('cantPres',this.value)" style="${inpS}"></div>
      <div class="fg"><label>Acumulado Anterior ${_sim}</label><input type="number" step="0.01" value="${_edpAcumAnt}" title="Total valorizado en EDP anteriores" oninput="_edpSet('acumAnt',this.value)" style="${inpS}"></div>
      <div class="fg"><label>Firma — Rep. Proveedor</label><input value="${(_edpFirmaProv||'').replace(/"/g,'&quot;')}" placeholder="Nombre del representante" oninput="_edpSet('firmaProv',this.value)" style="${inpS}"></div>
      <div class="fg"><label>Firma — Rep. ECOSERMO</label><input value="${(_edpFirmaEco||'').replace(/"/g,'&quot;')}" placeholder="Nombre del representante" oninput="_edpSet('firmaEco',this.value)" style="${inpS}"></div>
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
  const HDR='#0070C0'; // encabezados de tabla: RGB(0,112,192) con letras blancas
  const esDia=F.tarifaUn!=='HM'; // DIA/MES: valorización por días — sin horómetros ni calentamiento
  // Moneda del contrato (Máster de Equipos) — por defecto Soles
  const MON=eq.moneda||'SOLES';
  const SIM=MON==='DOLARES'?'US$':MON==='EUROS'?'€':'S/';
  const MONLBL=MON==='DOLARES'?'DÓLARES (US$)':MON==='EUROS'?'EUROS (€)':'SOLES';
  const infoCell=(l,v)=>`<div><strong style="display:block;color:#64748b;font-size:9px;text-transform:uppercase;letter-spacing:.05em">${l}</strong><span style="font-size:11px;font-weight:600;color:#111">${v||'—'}</span></div>`;
  const TH=`background:${HDR};color:#fff;padding:4px 6px;font-size:9px;text-transform:uppercase;text-align:center`;
  const TD=`border:1px solid #cbd5e1;padding:3px 6px;font-size:10px;color:#111`;

  // Encabezados agrupados: PRESUPUESTO (azul) · VALORIZACIÓN ACTUAL (amarillo) · ACUMULADO ACTUAL (azul)
  const THG=`background:${HDR};color:#fff;padding:4px 6px;font-size:9.5px;font-weight:800;text-transform:uppercase;text-align:center;border:1px solid #fff`;
  const THG_AM=`background:#FFFF00;color:#111;padding:4px 6px;font-size:9.5px;font-weight:800;text-transform:uppercase;text-align:center;border:1px solid #666`;
  const THS=`background:${HDR};color:#fff;padding:3px 5px;font-size:8.5px;font-weight:700;text-transform:uppercase;text-align:center;border:1px solid #fff`;
  const THS_AM=`background:#FFFF00;color:#111;padding:3px 5px;font-size:8.5px;font-weight:700;text-transform:uppercase;text-align:center;border:1px solid #666`;
  const AM=`background:#FFFACD`; // celdas de la sección Valorización Actual
  const pctFmt=v=>v==null?'':v.toFixed(1)+'%';

  // Presupuesto contractual (opcional) y avances
  const cantPres=_edpCantPres!=null?_edpCantPres:null;
  const totPres=cantPres!=null?+(cantPres*F.tarifa).toFixed(2):null;
  const pctEq=totPres?F.totEquipo/totPres*100:null;
  const acumCant=cantPres!=null?null:null;
  const acumTotEq=+(_edpAcumAnt+F.totEquipo).toFixed(2);
  const pctAcumEq=totPres?acumTotEq/totPres*100:null;

  const theadP1=`<thead>
    <tr>
      <th style="${THG};width:38px" rowspan="2">Ítem</th>
      <th style="${THG};text-align:left" rowspan="2">Descripción</th>
      <th style="${THG}" colspan="4">Presupuesto</th>
      <th style="${THG_AM}" colspan="3">Valorización Actual</th>
      <th style="${THG}" colspan="3">Acumulado Actual</th>
    </tr>
    <tr>
      <th style="${THS}">Unid.</th><th style="${THS}">Cant.</th><th style="${THS}">P. Unit ${SIM}</th><th style="${THS}">Total ${SIM}</th>
      <th style="${THS_AM}">Cant.</th><th style="${THS_AM}">Total ${SIM}</th><th style="${THS_AM}">% Avance</th>
      <th style="${THS}">Cant.</th><th style="${THS}">Total ${SIM}</th><th style="${THS}">% Avance</th>
    </tr>
  </thead>`;

  const filaEq=`<tr>
    <td style="${TD};text-align:center">1.01</td>
    <td style="${TD};font-weight:700">${eq.codigo} — ${eq.nombre||''}</td>
    <td style="${TD};text-align:center">${F.tarifaUn}</td>
    <td style="${TD};text-align:right">${cantPres!=null?_edpN2(cantPres):''}</td>
    <td style="${TD};text-align:right">${_edpN2(F.tarifa)}</td>
    <td style="${TD};text-align:right">${totPres!=null?_edpN2(totPres):''}</td>
    <td style="${TD};text-align:right;${AM}">${_edpN2(F.cantEquipo)}</td>
    <td style="${TD};text-align:right;font-weight:700;${AM}">${SIM} ${_edpN2(F.totEquipo)}</td>
    <td style="${TD};text-align:right;${AM}">${pctFmt(pctEq)}</td>
    <td style="${TD};text-align:right"></td>
    <td style="${TD};text-align:right;font-weight:700">${SIM} ${_edpN2(acumTotEq)}</td>
    <td style="${TD};text-align:right">${pctFmt(pctAcumEq)}</td>
  </tr>`;

  const filasDesc=F.descRows.length
    ?F.descRows.map((r,i)=>`<tr>
      <td style="${TD};text-align:center">2.${String(i+1).padStart(2,'0')}</td>
      <td style="${TD}">${r.desc}</td>
      <td style="${TD};text-align:center">${r.und}</td>
      <td style="${TD}"></td><td style="${TD};text-align:right">${_edpN2(r.precio)}</td><td style="${TD}"></td>
      <td style="${TD};text-align:right;${AM}">(${_edpN2(r.cant)})</td>
      <td style="${TD};text-align:right;color:#b91c1c;${AM}">${SIM} (${_edpN2(r.total)})</td>
      <td style="${TD};${AM}"></td>
      <td style="${TD}"></td><td style="${TD};text-align:right;color:#b91c1c">${SIM} (${_edpN2(r.total)})</td><td style="${TD}"></td>
    </tr>`).join('')
    :`<tr><td colspan="12" style="${TD};text-align:center;color:#94a3b8">Sin descuentos registrados en Auxilios Mecánicos para este período</td></tr>`;

  const resumen=(l,v,bg)=>`<tr><td style="padding:3px 8px;font-size:10px;color:#334155">${l}</td><td style="padding:3px 8px;text-align:right;font-weight:700;font-size:10px;${bg?'background:'+bg:''}">${SIM} ${_edpN2(v)}</td></tr>`;

  // Esquina superior derecha de cada hoja: logo del proveedor (del Máster) o, si no tiene, su nombre
  const provCorner=eq.logoProveedor
    ?`<img src="${eq.logoProveedor}" style="height:40px;max-width:150px;object-fit:contain">`
    :`<div style="font-size:10px;font-weight:800;color:${AZ};max-width:160px;text-align:right">${eq.proveedor||''}</div>`;
  const headerHoja=(titulo,sub)=>`<div style="display:flex;align-items:center;justify-content:space-between;border-bottom:2px solid ${AZ};padding-bottom:8px;margin-bottom:8px">
    <img src="${_logoUrl}" style="height:44px;object-fit:contain">
    <div style="text-align:center;flex:1">
      <div style="font-size:16px;font-weight:900;color:${AZ}">${titulo}</div>
      <div style="font-size:10px;color:#64748b">${sub}</div>
    </div>
    ${provCorner}
  </div>`;

  const pagina1=`<div style="font-family:Arial,sans-serif;color:#111">
    ${headerHoja(`EDP N° ${_edpNum||'—'}`,`CONTRATA: ${eq.proveedor||'—'}`)}
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:.4rem 1rem;margin-bottom:10px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:8px">
      ${infoCell('Cliente',_edpCliente)}${infoCell('RUC Cliente',_edpRuc)}${infoCell('Proyecto',eq.proyecto)}${infoCell('Estado de Pago N°',_edpNum)}
      ${infoCell('Proveedor',eq.proveedor)}${infoCell('RUC Proveedor',eq.rucProveedor)}${infoCell('Período',_edpFmtDMY(_edpDesde)+' al '+_edpFmtDMY(_edpHasta))}${infoCell('Moneda',MONLBL)}
      ${esDia?'':infoCell('Horas Mínimas',H.horasMinimas?_edpN2(H.horasMinimas)+' hrs':'—')}
    </div>
    <table style="width:100%;border-collapse:collapse;margin-bottom:10px">
      ${theadP1}
      <tbody>
        <tr><td colspan="12" style="${TD};font-weight:800;background:#e2e8f0">1.00 EQUIPO</td></tr>
        ${filaEq}
        <tr><td colspan="12" style="${TD};font-weight:800;background:#e2e8f0">2.00 DESCUENTO</td></tr>
        ${filasDesc}
        <tr>
          <td colspan="6" style="${TD};text-align:right;font-weight:900;background:#dbeafe">PRESUPUESTO TOTAL (${SIM})</td>
          <td style="${TD};${AM}"></td>
          <td style="${TD};text-align:right;font-weight:900;background:#FFFF00">${SIM} ${_edpN2(F.presupuestoTotal)}</td>
          <td style="${TD};${AM}"></td>
          <td style="${TD};background:#dbeafe"></td>
          <td style="${TD};text-align:right;font-weight:900;background:#dbeafe">${SIM} ${_edpN2(+(_edpAcumAnt+F.presupuestoTotal).toFixed(2))}</td>
          <td style="${TD};background:#dbeafe"></td>
        </tr>
      </tbody>
    </table>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem">
      <table style="border:1px solid #cbd5e1"><tbody>
        <tr><td colspan="2" style="${TD};font-weight:800;background:#f1f5f9">${eq.proveedor||'PROVEEDOR'}</td></tr>
        ${resumen(`NETO (${SIM})`,F.subTotal)}${resumen(`SUB TOTAL (${SIM})`,F.subTotal)}${resumen('IGV 18%',F.igv)}${resumen(`TOTAL (${SIM})`,F.total,'#fde047')}
      </tbody></table>
      <table style="border:1px solid #cbd5e1"><tbody>
        <tr><td colspan="2" style="${TD};font-weight:800;background:#f1f5f9">ECOSERMO</td></tr>
        ${resumen('DETRACCIÓN 10%',F.detraccion)}${resumen('A ABONAR',F.aAbonar,'#fde047')}
      </tbody></table>
    </div>
    <!-- Firmas: Representante del Proveedor · Representante de ECOSERMO -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:1.4rem;margin-top:26px;page-break-inside:avoid">
      ${[
        {tit:eq.proveedor||'PROVEEDOR',rol:'REPRESENTANTE DEL PROVEEDOR',nom:_edpFirmaProv},
        {tit:'ECOSERMO',rol:`RESIDENTE DE PROYECTO${eq.proyecto?' ('+eq.proyecto+')':''}`,nom:_edpFirmaEco}
      ].map(f=>`<div style="border:1px solid #cbd5e1;border-radius:4px;padding:6px 10px 8px">
        <div style="font-size:10px;font-weight:800;color:${AZ};border-bottom:1px solid #e2e8f0;padding-bottom:3px;margin-bottom:2px">${f.tit}</div>
        <div style="height:88px"></div>
        <div style="border-top:1.2px solid #333;margin:0 14px 4px"></div>
        <div style="text-align:center;font-size:9.5px;font-weight:700;color:#111;min-height:12px">${f.nom||''}</div>
        <div style="text-align:center;font-size:8px;text-transform:uppercase;letter-spacing:.05em;color:#64748b">${f.rol}</div>
        <div style="text-align:center;font-size:7.5px;color:#94a3b8;margin-top:1px">Firma y sello</div>
      </div>`).join('')}
    </div>
  </div>`;

  let tablaPagina2,resumenPagina2;
  if(esDia){
    // Formato por DÍAS: cada parte diario = 1.00 de trabajo, sin horómetros ni calentamiento
    const marcaModelo=[eq.marca,eq.modelo].filter(Boolean).join(' ')||'—';
    const filasDias=H.dias.map((d,i)=>`<tr>
      <td style="${TD};text-align:center">${i+1}</td><td style="${TD};text-align:center">${_edpFmtDMY(d.fecha)}</td>
      <td style="${TD};text-align:center">${(eq.sub||eq.tipo||'').toUpperCase()}</td><td style="${TD};text-align:center">${marcaModelo.toUpperCase()}</td>
      <td style="${TD};text-align:center">${eq.placa||'—'}</td><td style="${TD};text-align:center">${d.turno}</td>
      <td style="${TD}">${d.desc}</td>
      <td style="${TD};text-align:right;${d.trabajo?'':'color:#b91c1c;font-weight:700'}">${_edpN2(d.trabajo)}</td><td style="${TD};text-align:right;font-weight:700;${d.trabajo?'':'color:#b91c1c'}">${_edpN2(d.trabajo)}</td>
      <td style="${TD};${d.trabajo?'':'color:#b91c1c;font-weight:700'}">${d.obs}</td>
    </tr>`).join('');
    tablaPagina2=`<table style="width:100%;border-collapse:collapse;margin-bottom:8px">
      <thead><tr>
        <th style="${TH}">Ítem</th><th style="${TH}">Fecha</th><th style="${TH}">Equipo</th><th style="${TH}">Marca / Modelo</th>
        <th style="${TH}">Placa</th><th style="${TH}">Turno</th><th style="${TH};text-align:left">Descripción</th>
        <th style="${TH}">Trabajo Día</th><th style="${TH}">Parcial</th><th style="${TH};text-align:left">Observaciones</th>
      </tr></thead>
      <tbody>${filasDias||`<tr><td colspan="10" style="${TD};text-align:center;color:#94a3b8">Sin partes diarios en este período</td></tr>`}</tbody>
      <tfoot><tr style="background:#e2e8f0;font-weight:800"><td colspan="7" style="${TD};text-align:right">TOTALES</td><td style="${TD};text-align:right">${_edpN2(H.diasTrabajados)}</td><td style="${TD};text-align:right">${_edpN2(H.diasTrabajados)}</td><td style="${TD}"></td></tr></tfoot>
    </table>`;
    resumenPagina2=`<div style="max-width:340px">
      <table style="border:1px solid #cbd5e1;width:100%"><tbody>
        <tr><td style="${TD}">DÍAS REPORTADOS</td><td style="${TD};text-align:right;font-weight:700">${H.dias.length}</td></tr>
        <tr><td style="${TD}">DÍAS INOPERATIVOS</td><td style="${TD};text-align:right;font-weight:700;${H.dias.length-H.diasTrabajados?'color:#b91c1c':''}">${H.dias.length-H.diasTrabajados}</td></tr>
        <tr><td style="${TD};font-weight:800;background:#fde047">DÍAS A PAGAR</td><td style="${TD};text-align:right;font-weight:900;background:#fde047">${_edpN2(H.diasTrabajados)} días</td></tr>
      </tbody></table>
    </div>`;
  }else{
    const filasHoras=H.dias.map((d,i)=>`<tr>
      <td style="${TD};text-align:center">${i+1}</td><td style="${TD}">${_edpFmtDMY(d.fecha)}</td><td style="${TD};text-align:center">${d.turno}</td>
      <td style="${TD}">${d.desc}</td><td style="${TD};text-align:right">${_edpN2(d.hrIni)}</td><td style="${TD};text-align:right">${_edpN2(d.hrFin)}</td>
      <td style="${TD};text-align:right">${_edpN2(d.motor)}</td><td style="${TD};text-align:right">${_edpN2(d.cal)}</td><td style="${TD};text-align:right;font-weight:700">${_edpN2(d.efectiva)}</td>
      <td style="${TD}">${d.obs}</td>
    </tr>`).join('');
    tablaPagina2=`<table style="width:100%;border-collapse:collapse;margin-bottom:8px">
      <thead><tr>
        <th style="${TH}">#</th><th style="${TH}">Fecha</th><th style="${TH}">Turno</th><th style="${TH};text-align:left">Descripción</th>
        <th style="${TH}">H. Inicial</th><th style="${TH}">H. Final</th><th style="${TH}">H. Motor</th><th style="${TH}">Calent.</th><th style="${TH}">H. Efectiva</th><th style="${TH};text-align:left">Observaciones</th>
      </tr></thead>
      <tbody>${filasHoras||`<tr><td colspan="10" style="${TD};text-align:center;color:#94a3b8">Sin partes diarios en este período</td></tr>`}</tbody>
      <tfoot><tr style="background:#e2e8f0;font-weight:800"><td colspan="6" style="${TD};text-align:right">TOTALES</td><td style="${TD};text-align:right">${_edpN2(H.horasMotor)}</td><td style="${TD};text-align:right">${_edpN2(H.horasCal)}</td><td style="${TD};text-align:right">${_edpN2(H.horasEfectivas)}</td><td style="${TD}"></td></tr></tfoot>
    </table>`;
    resumenPagina2=`<div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;max-width:520px">
      <table style="border:1px solid #cbd5e1"><tbody>
        <tr><td style="${TD}">DISPONIBILIDAD MECÁNICA</td><td style="${TD};text-align:right;font-weight:700">${H.dispMec.toFixed(1)}%</td></tr>
        <tr><td style="${TD}">HORAS MÍNIMAS</td><td style="${TD};text-align:right;font-weight:700">${_edpN2(H.horasMinimas)} hrs</td></tr>
      </tbody></table>
      <table style="border:1px solid #cbd5e1"><tbody>
        <tr><td style="${TD}">HORAS TRABAJADAS</td><td style="${TD};text-align:right;font-weight:700">${_edpN2(H.horasEfectivas)} hrs</td></tr>
        <tr><td style="${TD}">HORAS MÍNIMAS A PAGAR</td><td style="${TD};text-align:right;font-weight:700">${_edpN2(H.horasMinimasAPagar)} hrs</td></tr>
        <tr><td style="${TD};font-weight:800;background:#fde047">HORAS A PAGAR</td><td style="${TD};text-align:right;font-weight:900;background:#fde047">${_edpN2(H.horasAPagar)} hrs</td></tr>
      </tbody></table>
    </div>`;
  }

  const pagina2=`<div style="font-family:Arial,sans-serif;color:#111">
    ${headerHoja(`CONSOLIDADO DE ${esDia?'DÍAS':'HORAS'} TRABAJADOS`,`${eq.codigo} — ${eq.nombre||''} · Período: ${_edpFmtDMY(_edpDesde)} al ${_edpFmtDMY(_edpHasta)}`)}
    ${tablaPagina2}
    ${resumenPagina2}
  </div>`;

  // ── Página 3: detalle de descuentos (solo si existen) ──
  let pagina3='';
  const hayDesc=(D.insumos&&D.insumos.length)||(D.atenciones&&D.atenciones.length)||_edpDescManual.length;
  if(hayDesc){
    const totIns=D.insumos.reduce((s,i)=>s+i.total,0);
    const totAten=D.atenciones.reduce((s,a)=>s+a.total,0);
    const totManual=_edpDescManual.reduce((s,r)=>s+(+r.cant||0)*(+r.precio||0),0);

    const secIns=D.insumos.length?`
      <div style="font-size:11px;font-weight:800;color:${AZ};margin:10px 0 4px;border-bottom:1px solid ${AZ};padding-bottom:2px">A. CONSUMO DE INSUMOS — ALMACÉN ECOSERMO</div>
      <table style="width:100%;border-collapse:collapse;margin-bottom:6px">
        <thead><tr>
          <th style="${TH}">#</th><th style="${TH}">Fecha</th><th style="${TH}">N° Auxilio</th><th style="${TH}">Código</th>
          <th style="${TH};text-align:left">Descripción del Insumo</th><th style="${TH}">Unid.</th>
          <th style="${TH}">Cant.</th><th style="${TH}">P. Unit ${SIM}</th><th style="${TH}">Total ${SIM}</th>
        </tr></thead>
        <tbody>${D.insumos.map((i,n)=>`<tr>
          <td style="${TD};text-align:center">${n+1}</td>
          <td style="${TD};text-align:center">${_edpFmtDMY(i.fecha)}</td>
          <td style="${TD};text-align:center;font-family:monospace">${i.auxCod||'—'}</td>
          <td style="${TD};text-align:center;font-family:monospace">${i.cod||'—'}</td>
          <td style="${TD}">${i.desc}</td>
          <td style="${TD};text-align:center">${i.und}</td>
          <td style="${TD};text-align:right">${_edpN2(i.cant)}</td>
          <td style="${TD};text-align:right">${_edpN2(i.precio)}${i.precio?'':' <span style="color:#b91c1c;font-size:8px">(sin P.U.R.)</span>'}</td>
          <td style="${TD};text-align:right;font-weight:700;color:#b91c1c">${_edpN2(i.total)}</td>
        </tr>`).join('')}</tbody>
        <tfoot><tr style="background:#e2e8f0;font-weight:800"><td colspan="8" style="${TD};text-align:right">SUBTOTAL INSUMOS</td><td style="${TD};text-align:right;color:#b91c1c">${SIM} ${_edpN2(totIns)}</td></tr></tfoot>
      </table>`:'';

    const secAten=D.atenciones.length?`
      <div style="font-size:11px;font-weight:800;color:${AZ};margin:10px 0 4px;border-bottom:1px solid ${AZ};padding-bottom:2px">B. ATENCIÓN MECÁNICA — ECOSERMO (según tiempo de parada)</div>
      <table style="width:100%;border-collapse:collapse;margin-bottom:6px">
        <thead><tr>
          <th style="${TH}">#</th><th style="${TH}">Fecha</th><th style="${TH}">N° Auxilio</th><th style="${TH}">Tipo Falla</th>
          <th style="${TH};text-align:left">Descripción del Problema</th><th style="${TH};text-align:left">Mecánico(s)</th>
          <th style="${TH}">T. Parada (h)</th><th style="${TH}">Tarifa ${SIM}/hh</th><th style="${TH}">Total ${SIM}</th>
        </tr></thead>
        <tbody>${D.atenciones.map((a,n)=>`<tr>
          <td style="${TD};text-align:center">${n+1}</td>
          <td style="${TD};text-align:center">${_edpFmtDMY(a.fecha)}</td>
          <td style="${TD};text-align:center;font-family:monospace">${a.auxCod||'—'}</td>
          <td style="${TD};text-align:center">${a.tipo}</td>
          <td style="${TD}">${a.desc}</td>
          <td style="${TD};font-size:9px">${a.mec}</td>
          <td style="${TD};text-align:right;font-weight:700">${_edpN2(a.horas)}</td>
          <td style="${TD};text-align:right">${_edpN2(a.precio)}${a.precio?'':' <span style="color:#b91c1c;font-size:8px">(sin tarifa)</span>'}</td>
          <td style="${TD};text-align:right;font-weight:700;color:#b91c1c">${_edpN2(a.total)}</td>
        </tr>`).join('')}</tbody>
        <tfoot><tr style="background:#e2e8f0;font-weight:800"><td colspan="6" style="${TD};text-align:right">TOTALES</td><td style="${TD};text-align:right">${_edpN2(D.horasAtencion)}</td><td style="${TD}"></td><td style="${TD};text-align:right;color:#b91c1c">${SIM} ${_edpN2(totAten)}</td></tr></tfoot>
      </table>`:'';

    const secMan=_edpDescManual.length?`
      <div style="font-size:11px;font-weight:800;color:${AZ};margin:10px 0 4px;border-bottom:1px solid ${AZ};padding-bottom:2px">C. OTROS DESCUENTOS</div>
      <table style="width:100%;border-collapse:collapse;margin-bottom:6px">
        <thead><tr><th style="${TH}">#</th><th style="${TH};text-align:left">Descripción</th><th style="${TH}">Unid.</th><th style="${TH}">Cant.</th><th style="${TH}">P. Unit ${SIM}</th><th style="${TH}">Total ${SIM}</th></tr></thead>
        <tbody>${_edpDescManual.map((r,n)=>`<tr>
          <td style="${TD};text-align:center">${n+1}</td><td style="${TD}">${r.desc||'—'}</td><td style="${TD};text-align:center">${r.und||''}</td>
          <td style="${TD};text-align:right">${_edpN2(r.cant)}</td><td style="${TD};text-align:right">${_edpN2(r.precio)}</td>
          <td style="${TD};text-align:right;font-weight:700;color:#b91c1c">${_edpN2((+r.cant||0)*(+r.precio||0))}</td>
        </tr>`).join('')}</tbody>
        <tfoot><tr style="background:#e2e8f0;font-weight:800"><td colspan="5" style="${TD};text-align:right">SUBTOTAL OTROS</td><td style="${TD};text-align:right;color:#b91c1c">${SIM} ${_edpN2(totManual)}</td></tr></tfoot>
      </table>`:'';

    pagina3=`<div style="font-family:Arial,sans-serif;color:#111">
      ${headerHoja('DETALLE DE DESCUENTOS',`${eq.codigo} — ${eq.nombre||''} · Período: ${_edpFmtDMY(_edpDesde)} al ${_edpFmtDMY(_edpHasta)} · EDP N° ${_edpNum||'—'}`)}
      ${secIns}${secAten}${secMan}
      <table style="width:100%;border-collapse:collapse;margin-top:8px;max-width:420px;margin-left:auto">
        <tbody>
          ${D.insumos.length?`<tr><td style="${TD}">Consumo de insumos (Almacén)</td><td style="${TD};text-align:right;font-weight:700">${SIM} ${_edpN2(totIns)}</td></tr>`:''}
          ${D.atenciones.length?`<tr><td style="${TD}">Atención mecánica</td><td style="${TD};text-align:right;font-weight:700">${SIM} ${_edpN2(totAten)}</td></tr>`:''}
          ${_edpDescManual.length?`<tr><td style="${TD}">Otros descuentos</td><td style="${TD};text-align:right;font-weight:700">${SIM} ${_edpN2(totManual)}</td></tr>`:''}
          <tr><td style="${TD};font-weight:900;background:#fde047">TOTAL DESCUENTOS (${SIM})</td><td style="${TD};text-align:right;font-weight:900;background:#fde047;color:#b91c1c">${SIM} ${_edpN2(F.totDesc)}</td></tr>
        </tbody>
      </table>
    </div>`;
  }

  const sep='page-break-before:always;margin-top:14px;border-top:2px dashed #cbd5e1;padding-top:14px';
  return`<div>${pagina1}</div><div style="${sep}">${pagina2}</div>${pagina3?`<div style="${sep}">${pagina3}</div>`:''}`;
}

function _edpPrint(){
  const eq=(DB.equipos||[]).find(e=>e.id===+_edpEqId);
  if(!eq||!_edpDesde||!_edpHasta){toast('Completa equipo y período primero',true);return;}
  const H=_edpHoras(eq,_edpDesde,_edpHasta);
  const D=_edpDescAuto(eq,_edpDesde,_edpHasta);
  const tarifa=_edpTarifaOv!=null?_edpTarifaOv:(+eq.tarifa||0);
  const tarifaUn=eq.tarifaUn||'HM';
  const cantEquipo=tarifaUn==='HM'?H.horasEfectivas:(tarifaUn==='DIA'?H.diasTrabajados:1);
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
  <style>@page{size:A4 landscape;margin:1cm}*{box-sizing:border-box;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}
  body{font-family:Arial,sans-serif;margin:0}
  table{border-collapse:collapse}
  tr{page-break-inside:avoid}</style></head><body>${_edpDocHtml(eq,H,D,F)}
  <script>window.onload=()=>{window.print();}<\/script></body></html>`;
  const win=window.open('','_blank');
  if(!win){toast('Active ventanas emergentes para imprimir',true);return;}
  win.document.write(html);win.document.close();
}
