// ══════════════════════════════════════════════════════════════════════════
//  GUARDIAS FBNV — distribución del personal directo por guardia
//  Se arma con la asistencia del día (Tareaje): cada cargo ocupa tantas filas
//  como la guardia que más gente tenga en ese puesto, para que las tres
//  columnas queden alineadas fila por fila igual que el formato en Excel.
// ══════════════════════════════════════════════════════════════════════════

const _GD_GUARDIAS=['A','B','C'];
const _GD_EN_OBRA=['TD','TN','DLT','A5'];
const _GD_LIBRE=['DL'];
const _GD_AUSENTES=['F','DM','P','V','LP','LM','LF'];
// Color del nombre: azul puro para turno día, azul noche para turno noche,
// plomo oscuro para día libre y rojo para faltas / licencias.
const _GD_TXT_TIPO={TD:'0000FF',DLT:'0000FF',A5:'0000FF',TN:'002060',DL:'595959'};
const _GD_TXT_GRUPO={obra:'0000FF',libre:'595959',aus:'C00000'};
function _gdColor(tipo,grupo){return _GD_TXT_TIPO[tipo]||_GD_TXT_GRUPO[grupo]||'111111';}
// Colores del encabezado de cada guardia (los mismos del formato original)
const _GD_COL={A:{bg:'#FCE4D6',xls:'FCE4D6'},B:{bg:'#E4DFEC',xls:'E4DFEC'},C:{bg:'#D9D9D9',xls:'D9D9D9'}};
// Orden en que aparecen los puestos; lo que no esté listado va al final alfabéticamente.
// Se puede escribir con puntos, comas o tildes: la lista se normaliza igual que el cargo.
const _GD_ORDEN=['ING. RESIDENTE','ING. SUPERVISOR DE CAMPO','SUP. TECNICO',
  'INGENIERO DE SEGURIDAD, SALUD Y MEDIO AMBIENTE','SUP. SEGURIDAD','SUPERVISOR DE SEGURIDAD',
  'ING. RESP. SEGURIDAD','OP. EXCAVADORA','OP. TRACTOR','OP. MOTONIVELADORA','OP. RODILLO',
  'OP. RETROEXCAVADORA','OP. CARGADOR FRONTAL','OP. VOLQUETE','OP. CISTERNA DE COMBUSTIBLE',
  'OP. CISTERNA DE AGUA','AYUDANTE COMBUSTIBLE','AYUDANTE DE CISTERNA','COND. DE CAMIONETA',
  'COND. DE COASTER','OPERARIO DE MOVIMIENTO DE TIERRAS','OFICIAL DE MOVIMIENTO DE TIERRAS','PEON', 'VIGIA'].map(c=>_gdNorm(c));

let _gdAusentes=true;   // mostrar a quienes tienen falta, DM, permiso, etc.
let _gdLibres=true;     // mostrar a quienes están de día libre
let _tarPgTabAct='resumen';

// Tabs de la página de Resumen Diario: Resumen ↔ Guardias FBNV
function _tarPgTab(k){
  _tarPgTabAct=k;
  const esRes=k==='resumen';
  document.getElementById('tarPgPanelResumen').style.display=esRes?'':'none';
  document.getElementById('tarPgPanelGuardias').style.display=esRes?'none':'';
  // Los controles de columnas y los botones de exportar son propios del resumen
  const colW=document.getElementById('tarPgColWrap');if(colW)colW.style.display=esRes?'':'none';
  ['tarPgBtnXls','tarPgBtnPdf'].forEach(id=>{const b=document.getElementById(id);if(b)b.style.display=esRes?'':'none';});
  // La guardia individual no aplica al cuadro de las tres guardias
  const gw=document.getElementById('tarPgGuardia');
  if(gw&&gw.parentElement)gw.parentElement.style.display=esRes?'':'none';
  [['resumen',esRes],['guardias',!esRes]].forEach(([n,act])=>{
    const b=document.getElementById('tarPgTabBtn-'+n);
    if(b){b.style.background=act?'var(--adm)':'transparent';b.style.color=act?'#fff':'var(--muted2)';}
  });
  if(esRes)rTareResumenPg();else rGuardiasFbnv();
}

function _gdEsc(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function _gdNorm(s){return String(s||'').toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^A-Z0-9]+/g,' ').trim();}
function _gdOrdenIdx(cargo){const i=_GD_ORDEN.indexOf(_gdNorm(cargo));return i<0?900:i;}
function _gdDMY(f){const p=String(f||'').split('-');return p.length===3?`${p[2]}/${p[1]}/${p[0]}`:(f||'');}
function _gdToggleAusentes(v){_gdAusentes=v;rGuardiasFbnv();}
function _gdToggleLibres(v){_gdLibres=v;rGuardiasFbnv();}
// Situación de la persona ese día: en obra, día libre o ausencia justificada/falta
function _gdGrupo(t){
  if(_GD_EN_OBRA.includes(t))return'obra';
  if(_GD_LIBRE.includes(t))return'libre';
  if(_GD_AUSENTES.includes(t))return'aus';
  return null;
}

// ── Armado de la matriz ──
function _gdDatos(){
  const fecha=document.getElementById('tarPgFecha')?.value||today();
  const proy=document.getElementById('tarPgProy')?.value||'';
  const tipoDe={};
  (DB.tareaje||[]).filter(r=>r.fecha===fecha&&(!proy||r.proy===proy||!r.proy))
    .forEach(r=>{tipoDe[r.personalId]=r.tipo;});

  const porG={};_GD_GUARDIAS.forEach(g=>porG[g]={});
  const conteo={};_GD_GUARDIAS.forEach(g=>conteo[g]={obra:0,libre:0,aus:0,td:0,tn:0,total:0});
  (DB.personal||[]).forEach(p=>{
    if((p.est||'Activo')!=='Activo')return;
    const g=String(p.guardia||'').trim().toUpperCase();
    if(!_GD_GUARDIAS.includes(g))return;
    const t=tipoDe[p.id];
    if(!t)return;                                  // sin marcación ese día
    const grupo=_gdGrupo(t);
    if(!grupo)return;                              // R y otros estados no ocupan puesto
    if(grupo==='aus'&&!_gdAusentes)return;
    if(grupo==='libre'&&!_gdLibres)return;
    conteo[g][grupo]++;
    conteo[g].total++;
    if(t==='TN')conteo[g].tn++;else if(grupo==='obra')conteo[g].td++;
    const cargo=(p.cargo||'SIN CARGO').toUpperCase().trim();
    (porG[g][cargo]=porG[g][cargo]||[]).push({p,tipo:t,grupo});
  });
  // Primero los que están en obra, luego días libres y al final las ausencias
  const _ord={obra:0,libre:1,aus:2};
  _GD_GUARDIAS.forEach(g=>Object.values(porG[g]).forEach(a=>
    a.sort((x,y)=>_ord[x.grupo]-_ord[y.grupo]||`${x.p.ape} ${x.p.nom}`.localeCompare(`${y.p.ape} ${y.p.nom}`,'es'))));

  // Puestos: unión de cargos, con tantas filas como la guardia más numerosa
  const cargos=[...new Set(_GD_GUARDIAS.flatMap(g=>Object.keys(porG[g])))]
    .sort((a,b)=>_gdOrdenIdx(a)-_gdOrdenIdx(b)||a.localeCompare(b,'es'));
  const bloques=cargos.map(c=>({cargo:c,n:Math.max(..._GD_GUARDIAS.map(g=>(porG[g][c]||[]).length))}));
  const totalFilas=bloques.reduce((s,b)=>s+b.n,0);
  return{fecha,proy,porG,cargos,bloques,totalFilas,conteo};
}

// Desglose del pie de cada guardia: día // noche // libres // ausentes
function _gdResumenTxt(c,plano){
  const p=[[c.td,'TD',_GD_TXT_TIPO.TD],[c.tn,'TN',_GD_TXT_TIPO.TN],
           [c.libre,'DL',_GD_TXT_TIPO.DL],[c.aus,'AUS',_GD_TXT_GRUPO.aus]]
    .filter(([n])=>n>0);
  if(!p.length)return plano?'0':'<span style="color:#94a3b8;font-weight:400">0</span>';
  if(plano)return p.map(([n,l])=>`${n} ${l}`).join(' // ');
  return p.map(([n,l,col])=>`<span style="color:#${col}">${n} ${l}</span>`)
          .join('<span style="color:#94a3b8;font-weight:400"> // </span>');
}

// ── Render (hoja blanca, igual al formato impreso) ──
function rGuardiasFbnv(){
  const cont=document.getElementById('gdBody');if(!cont)return;
  if(typeof _tarPgInitFiltros==='function')_tarPgInitFiltros();
  const d=_gdDatos();
  const proyNom=d.proy?((DB.proyectos||[]).find(p=>p.codigo===d.proy)?.nombre||d.proy):'Todos los proyectos';

  const bloqueHtml=g=>{
    let fila=0;
    const filas=d.bloques.map(b=>{
      const lista=d.porG[g][b.cargo]||[];
      return Array.from({length:b.n},(_,i)=>{
        fila++;
        const it=lista[i];
        // Todos llevan su tipo de jornada al costado: (TD), (TN), (DL), (F), (P)…
        const txt=it?`${it.p.ape}, ${it.p.nom}`.toUpperCase()+` (${it.tipo})`:'';
        const col=it?'#'+_gdColor(it.tipo,it.grupo):'';
        return`<tr>
          <td class="gd-n">${fila}</td>
          ${i===0?`<td class="gd-c" rowspan="${b.n}">${_gdEsc(b.cargo)}</td>`:''}
          <td class="gd-p" style="color:${col}">${_gdEsc(txt)}</td>
        </tr>`;
      }).join('');
    }).join('');
    const c=_GD_COL[g]||{bg:'#eee'};
    return`<div class="gd-blk">
      <table class="gd-t">
        <thead>
          <tr><th colspan="3" class="gd-g" style="background:${c.bg}">GUARDIA ${g}</th></tr>
          <tr><th class="gd-h" style="background:${c.bg};width:52px">ITEM</th>
              <th class="gd-h" style="background:${c.bg};width:150px">CARGO</th>
              <th class="gd-h" style="background:${c.bg}">APELLIDOS Y NOMBRES - Turno </th></tr>
        </thead>
        <tbody>${filas||'<tr><td colspan="3" class="gd-vacio">Sin personal registrado</td></tr>'}</tbody>
        <tfoot><tr><td colspan="2" class="gd-tot">EN OBRA ${d.conteo[g].obra}</td>
          <td class="gd-tot" style="text-align:left">${_gdResumenTxt(d.conteo[g])}</td></tr></tfoot>
      </table>
    </div>`;
  };

  // Totales por guardia + total general (respetan el proyecto filtrado)
  const GC={A:'#f59e0b',B:'#a855f7',C:'#10b981'};
  const tot={obra:0,libre:0,aus:0,td:0,tn:0,total:0};
  _GD_GUARDIAS.forEach(g=>Object.keys(tot).forEach(k=>tot[k]+=d.conteo[g][k]));
  const tarjeta=(lbl,c,col,ic)=>`<div class="kpi" style="--kc:${col};flex:1;min-width:170px">
      <div style="display:flex;justify-content:space-between;align-items:flex-start"><span class="kpi-lbl">${lbl}</span><span style="font-size:1.1rem;line-height:1;opacity:.75">${ic}</span></div>
      <div class="kpi-val" style="font-size:1.8rem">${c.obra}<span style="font-size:.8rem;color:var(--muted2);font-weight:600"> en obra</span></div>
      <div style="display:flex;gap:.3rem;flex-wrap:wrap;margin-top:.25rem">
        ${[[c.td,'TD','#3b82f6'],[c.tn,'TN','#1e3a8a'],[c.libre,'DL','#6b7280'],[c.aus,'AUS','#ef4444']]
          .map(([n,l,cc])=>`<span style="background:${cc}26;color:${cc};border:1px solid ${cc}66;border-radius:4px;padding:0 6px;font-size:.63rem;font-weight:800">${n} ${l}</span>`).join('')}
      </div>
      <div class="kpi-sub" style="margin-top:.25rem">${c.total} personas asignadas</div>
    </div>`;

  cont.innerHTML=`
    <div class="kpi-row">
      ${_GD_GUARDIAS.map(g=>tarjeta('Guardia '+g,d.conteo[g],GC[g],'🛡️')).join('')}
      ${tarjeta('Total General',tot,'#06b6d4','📋')}
    </div>
    <div style="display:flex;align-items:center;gap:.6rem;flex-wrap:wrap;margin-bottom:.8rem;padding:.45rem .7rem;background:var(--panel2);border:1px solid var(--border);border-radius:8px">
      <span style="font-size:.72rem;color:var(--muted2)">Fecha: <strong style="color:var(--text)">${_gdDMY(d.fecha)}</strong> · ${_gdEsc(proyNom)}</span>
      <label style="display:inline-flex;align-items:center;gap:.3rem;font-size:.73rem;color:var(--muted2);cursor:pointer">
        <input type="checkbox" ${_gdLibres?'checked':''} onchange="_gdToggleLibres(this.checked)" style="width:auto;margin:0;cursor:pointer"> Días libres (DL)
      </label>
      <label style="display:inline-flex;align-items:center;gap:.3rem;font-size:.73rem;color:var(--muted2);cursor:pointer">
        <input type="checkbox" ${_gdAusentes?'checked':''} onchange="_gdToggleAusentes(this.checked)" style="width:auto;margin:0;cursor:pointer"> Ausentes (F, DM, P, V…)
      </label>
      <span style="font-size:.68rem;color:var(--muted)">Fecha y proyecto seleccionado</span>
      <button onclick="_gdExcel()" style="margin-left:auto;background:#166534;color:#fff;border:none;border-radius:7px;padding:.32rem .9rem;font-size:.78rem;font-weight:700;cursor:pointer">📊 Exportar Excel</button>
      <button onclick="_gdPrint()" style="background:#1e3a5f;color:#fff;border:none;border-radius:7px;padding:.32rem .9rem;font-size:.78rem;font-weight:700;cursor:pointer">🖨️ PDF</button>
    </div>
    <style>${_GD_CSS}</style>
    <div class="gd-doc">
      <div class="gd-tit">GUARDIAS FBNV</div>
      <div class="gd-sub">PERSONAL DIRECTO · ${_gdDMY(d.fecha)} · ${_gdEsc(proyNom)}</div>
      <div class="gd-grid">${_GD_GUARDIAS.map(bloqueHtml).join('')}</div>
      <table class="gd-res">
        <thead><tr><th>RESUMEN</th>${_GD_GUARDIAS.map(g=>`<th>GUARDIA ${g}</th>`).join('')}<th class="gd-res-tg">TOTAL GENERAL</th></tr></thead>
        <tbody>
          ${[['EN OBRA','obra','#0000FF'],['TURNO DÍA (TD)','td','#0000FF'],['TURNO NOCHE (TN)','tn','#002060'],
             ['DÍAS LIBRES (DL)','libre','#595959'],['AUSENTES (F, DM, P, V…)','aus','#C00000'],['TOTAL ASIGNADO','total','#111']]
            .map(([lbl,k,col])=>`<tr>
              <td class="gd-res-l">${lbl}</td>
              ${_GD_GUARDIAS.map(g=>`<td style="color:${col};font-weight:700">${d.conteo[g][k]}</td>`).join('')}
              <td class="gd-res-tg" style="color:${col}">${tot[k]}</td>
            </tr>`).join('')}
        </tbody>
      </table>
      <div class="gd-ley">
        <strong>Leyenda:</strong>
        <span style="color:#0000FF">TD — Trabajo Día</span>
        <span style="color:#002060">TN — Trabajo Noche</span>
        <span style="color:#595959">DL — Día Libre</span>
        <span style="color:#C00000">F / DM / P / V — Falta, descanso médico, permiso o licencia</span>
      </div>
    </div>`;
}

const _GD_CSS=`
  .gd-doc{background:#fff;color:#111;border-radius:8px;padding:1.1rem 1.2rem;box-shadow:0 4px 18px rgba(0,0,0,.45);font-family:Arial,Helvetica,sans-serif}
  .gd-tit{text-align:center;font-size:15px;font-weight:800;letter-spacing:.08em;color:#1F4E79;margin-bottom:2px}
  .gd-sub{text-align:center;font-size:10px;font-weight:700;color:#475569;margin-bottom:10px;text-transform:uppercase;letter-spacing:.04em}
  .gd-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;align-items:start}
  .gd-blk{overflow-x:auto}
  .gd-t{width:100%;border-collapse:collapse}
  .gd-t th,.gd-t td{border:1px solid #000;padding:1px 4px}
  .gd-g{font-size:10px;font-weight:800;text-align:center;letter-spacing:.06em}
  .gd-h{font-size:8px;font-weight:800;text-align:center;line-height:1.15}
  .gd-n{font-size:8.5px;text-align:center;color:#111;width:52px}
  .gd-c{font-size:8px;text-align:center;font-weight:600;vertical-align:middle;line-height:1.2}
  .gd-p{font-size:8.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:250px}
  .gd-res{margin:12px auto 0;border-collapse:collapse;max-width:640px}
  .gd-res th,.gd-res td{border:1px solid #000;padding:2px 8px;font-size:8.5px;text-align:center}
  .gd-res th{background:#1F4E79;color:#fff;font-weight:800;font-size:8px;letter-spacing:.03em}
  .gd-res .gd-res-l{text-align:left;font-weight:700;background:#f8fafc}
  .gd-res td.gd-res-tg{background:#EAF3FB;font-weight:800}
  .gd-res th.gd-res-tg{background:#0F2D4A}
  .gd-ley{margin-top:9px;font-size:8px;display:flex;gap:12px;flex-wrap:wrap;align-items:center;color:#475569}
  .gd-ley span{font-weight:700}
  .gd-vacio{font-size:9px;text-align:center;color:#94a3b8;font-style:italic;padding:8px}
  .gd-tot{font-size:8.5px;font-weight:800;background:#f1f5f9;text-align:right}
  @media (max-width:1100px){.gd-grid{grid-template-columns:1fr}}`;

// ── PDF ──
function _gdPrint(){
  const cont=document.getElementById('gdBody');if(!cont)return;
  const doc=cont.querySelector('.gd-doc');
  if(!doc){toast('Nada que imprimir',true);return;}
  const w=window.open('','_blank','width=1200,height=780');
  w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Guardias FBNV</title><style>
    @page{size:A4 landscape;margin:.7cm}
    *{box-sizing:border-box;margin:0;padding:0;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}
    body{background:#fff}
    ${_GD_CSS}
    .gd-doc{box-shadow:none;padding:0;border-radius:0}
    .gd-grid{gap:6px}
    .gd-t tr{page-break-inside:avoid}
    @media print{.gd-grid{grid-template-columns:repeat(3,1fr)}}
  </style></head><body>${doc.outerHTML}
  <script>window.onload=()=>window.print();<\/script></body></html>`);
  w.document.close();
}

// ── Excel: tres bloques lado a lado, con celdas combinadas por cargo ──
function _gdExcel(){
  const d=_gdDatos();
  if(!d.totalFilas){toast('No hay personal con asistencia ese día',true);return;}
  const proyNom=d.proy?((DB.proyectos||[]).find(p=>p.codigo===d.proy)?.nombre||d.proy):'Todos los proyectos';
  const COLS=[0,4,8];          // columna inicial de cada bloque (3 y 7 quedan de separación)
  const NC=11;
  const addr=(r,c)=>XLSX.utils.encode_cell({r,c});
  const vacia=()=>Array(NC).fill('');

  const aoa=[];
  const f0=vacia();f0[0]=`GUARDIAS FBNV — PERSONAL DIRECTO · ${_gdDMY(d.fecha)} · ${proyNom}`;aoa.push(f0);
  const f1=vacia();_GD_GUARDIAS.forEach((g,i)=>{f1[COLS[i]]='GUARDIA '+g;});aoa.push(f1);
  const f2=vacia();_GD_GUARDIAS.forEach((_,i)=>{f2[COLS[i]]='ITEM';f2[COLS[i]+1]='CARGO';f2[COLS[i]+2]='APELLIDOS Y NOMBRES - Turno';});aoa.push(f2);

  const merges=[{s:{r:0,c:0},e:{r:0,c:NC-1}},
    ..._GD_GUARDIAS.map((_,i)=>({s:{r:1,c:COLS[i]},e:{r:1,c:COLS[i]+2}}))];

  const R0=3;                  // primera fila de datos
  let fila=0;
  d.bloques.forEach(b=>{
    for(let i=0;i<b.n;i++){
      const row=vacia();
      _GD_GUARDIAS.forEach((g,gi)=>{
        const lista=d.porG[g][b.cargo]||[];
        const it=lista[i];
        row[COLS[gi]]=fila+1;
        if(i===0)row[COLS[gi]+1]=b.cargo;
        row[COLS[gi]+2]=it?`${it.p.ape}, ${it.p.nom}`.toUpperCase()+` (${it.tipo})`:'';
      });
      aoa.push(row);
      fila++;
    }
    // combinar la celda de cargo cuando el puesto ocupa varias filas
    if(b.n>1)_GD_GUARDIAS.forEach((_,gi)=>{
      merges.push({s:{r:R0+fila-b.n,c:COLS[gi]+1},e:{r:R0+fila-1,c:COLS[gi]+1}});
    });
  });

  const fT=vacia();
  _GD_GUARDIAS.forEach((g,gi)=>{
    fT[COLS[gi]+1]='EN OBRA '+d.conteo[g].obra;
    fT[COLS[gi]+2]=_gdResumenTxt(d.conteo[g],true);
  });
  aoa.push(fT);

  // Cuadro de totales por guardia y total general
  const tot={obra:0,libre:0,aus:0,td:0,tn:0,total:0};
  _GD_GUARDIAS.forEach(g=>Object.keys(tot).forEach(k=>tot[k]+=d.conteo[g][k]));
  aoa.push(vacia());
  const rRes=aoa.length;
  const fH=vacia();fH[0]='RESUMEN';_GD_GUARDIAS.forEach((g,i)=>{fH[1+i]='GUARDIA '+g;});fH[4]='TOTAL GENERAL';
  aoa.push(fH);
  [['EN OBRA','obra'],['TURNO DÍA (TD)','td'],['TURNO NOCHE (TN)','tn'],
   ['DÍAS LIBRES (DL)','libre'],['AUSENTES (F, DM, P, V…)','aus'],['TOTAL ASIGNADO','total']]
    .forEach(([lbl,k])=>{
      const f=vacia();f[0]=lbl;
      _GD_GUARDIAS.forEach((g,i)=>{f[1+i]=d.conteo[g][k];});
      f[4]=tot[k];
      aoa.push(f);
    });

  const ws=XLSX.utils.aoa_to_sheet(aoa);
  ws['!merges']=merges;
  ws['!cols']=[{wch:9},{wch:26},{wch:34},{wch:2},{wch:9},{wch:26},{wch:34},{wch:2},{wch:9},{wch:26},{wch:34}];

  const BOR={top:{style:'thin',color:{rgb:'000000'}},bottom:{style:'thin',color:{rgb:'000000'}},left:{style:'thin',color:{rgb:'000000'}},right:{style:'thin',color:{rgb:'000000'}}};
  const stTit={font:{bold:true,sz:12,color:{rgb:'1F4E79'}},alignment:{horizontal:'center',vertical:'center'}};
  const t0=ws[addr(0,0)];if(t0)t0.s=stTit;
  _GD_GUARDIAS.forEach((g,gi)=>{
    const bg=_GD_COL[g].xls;
    for(let c=COLS[gi];c<=COLS[gi]+2;c++){
      const cg=ws[addr(1,c)];
      if(cg)cg.s={fill:{patternType:'solid',fgColor:{rgb:bg}},font:{bold:true,sz:10},alignment:{horizontal:'center',vertical:'center'},border:BOR};
      const ch=ws[addr(2,c)];
      if(ch)ch.s={fill:{patternType:'solid',fgColor:{rgb:bg}},font:{bold:true,sz:8},alignment:{horizontal:'center',vertical:'center',wrapText:true},border:BOR};
    }
  });
  for(let r=R0;r<R0+d.totalFilas;r++){
    _GD_GUARDIAS.forEach((_,gi)=>{
      const cn=ws[addr(r,COLS[gi])];
      if(cn)cn.s={font:{sz:9},alignment:{horizontal:'center',vertical:'center'},border:BOR};
      const cc=ws[addr(r,COLS[gi]+1)];
      if(cc)cc.s={font:{sz:8,bold:true},alignment:{horizontal:'center',vertical:'center',wrapText:true},border:BOR};
      let cp=ws[addr(r,COLS[gi]+2)];
      if(!cp){ws[addr(r,COLS[gi]+2)]=cp={t:'s',v:''};}
      // El color sale del tipo que quedó escrito entre paréntesis al final del nombre
      const m=String(cp.v||'').match(/\(([A-Z0-9]+)\)\s*$/);
      const tipo=m?m[1]:'';
      const grupo=_gdGrupo(tipo)||'obra';
      cp.s={font:{sz:9,color:{rgb:_gdColor(tipo,grupo)}},alignment:{vertical:'center'},border:BOR};
    });
  }
  const rT=R0+d.totalFilas;
  _GD_GUARDIAS.forEach((_,gi)=>{
    for(let c=COLS[gi]+1;c<=COLS[gi]+2;c++){
      const cel=ws[addr(rT,c)];
      if(cel)cel.s={fill:{patternType:'solid',fgColor:{rgb:'F1F5F9'}},font:{bold:true,sz:9},alignment:{horizontal:c===COLS[gi]+1?'right':'center'},border:BOR};
    }
  });
  // Estilo del cuadro de resumen
  for(let c=0;c<5;c++){
    const h=ws[addr(rRes,c)];
    if(h)h.s={fill:{patternType:'solid',fgColor:{rgb:c===4?'0F2D4A':'1F4E79'}},font:{bold:true,sz:8,color:{rgb:'FFFFFF'}},alignment:{horizontal:'center',vertical:'center'},border:BOR};
  }
  const _colRes=['0000FF','0000FF','002060','595959','C00000','111111'];
  for(let i=0;i<6;i++){
    const r=rRes+1+i;
    const cl=ws[addr(r,0)];
    if(cl)cl.s={fill:{patternType:'solid',fgColor:{rgb:'F8FAFC'}},font:{bold:true,sz:8},alignment:{vertical:'center'},border:BOR};
    for(let c=1;c<5;c++){
      const cel=ws[addr(r,c)];
      if(cel)cel.s={fill:c===4?{patternType:'solid',fgColor:{rgb:'EAF3FB'}}:{},font:{bold:true,sz:9,color:{rgb:_colRes[i]}},alignment:{horizontal:'center',vertical:'center'},border:BOR};
    }
  }
  ws['!rows']=[{hpt:20},{hpt:16},{hpt:22},...Array(d.totalFilas+1).fill({hpt:13})];

  const wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,ws,'Guardias FBNV');
  XLSX.writeFile(wb,`Guardias_FBNV_${d.fecha}.xlsx`);
  toast('✓ Excel descargado');
}
