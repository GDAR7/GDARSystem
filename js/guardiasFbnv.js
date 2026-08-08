// ══════════════════════════════════════════════════════════════════════════
//  GUARDIAS FBNV — distribución del personal directo por guardia
//  Se arma con la asistencia del día (Tareaje): cada cargo ocupa tantas filas
//  como la guardia que más gente tenga en ese puesto, para que las tres
//  columnas queden alineadas fila por fila igual que el formato en Excel.
// ══════════════════════════════════════════════════════════════════════════

const _GD_GUARDIAS=['A','B','C'];
const _GD_EN_OBRA=['TD','TN','DLT','A5'];
const _GD_AUSENTES=['F','DM','P','V','LP','LM','LF'];
// Colores del encabezado de cada guardia (los mismos del formato original)
const _GD_COL={A:{bg:'#FCE4D6',xls:'FCE4D6'},B:{bg:'#E4DFEC',xls:'E4DFEC'},C:{bg:'#D9D9D9',xls:'D9D9D9'}};
// Orden en que aparecen los puestos; lo que no esté listado va al final alfabéticamente
const _GD_ORDEN=['SUPERVISOR DE CAMPO','ING SUPERVISOR DE CAMPO','SUPERVISOR TECNICO','SUP TECNICO',
  'SUPERVISOR DE SEGURIDAD','SUP SEGURIDAD','ADMINISTRADOR','ASISTENTE ADMINISTRATIVO',
  'MECANICO','AYUDANTE MECANICO','OP EXCAVADORA','OP TRACTOR','OP MOTONIVELADORA','OP RODILLO',
  'OP RETROEXCAVADORA','OP CARGADOR FRONTAL','OP VOLQUETE','OP CISTERNA DE COMBUSTIBLE',
  'AYUDANTE COMBUSTIBLE','AYUDANTE DE CISTERNA','OP CISTERNA DE AGUA','COND DE CAMIONETA',
  'COND DE COASTER','OFICIAL DE MOVIMIENTO DE TIERRAS','TOPOGRAFO','PEON'];

let _gdAusentes=true;   // mostrar a quienes tienen falta, DM, permiso, etc.
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

// ── Armado de la matriz ──
function _gdDatos(){
  const fecha=document.getElementById('tarPgFecha')?.value||today();
  const proy=document.getElementById('tarPgProy')?.value||'';
  const tipoDe={};
  (DB.tareaje||[]).filter(r=>r.fecha===fecha&&(!proy||r.proy===proy||!r.proy))
    .forEach(r=>{tipoDe[r.personalId]=r.tipo;});

  const porG={};_GD_GUARDIAS.forEach(g=>porG[g]={});
  const conteo={};_GD_GUARDIAS.forEach(g=>conteo[g]={obra:0,aus:0});
  (DB.personal||[]).forEach(p=>{
    if((p.est||'Activo')!=='Activo')return;
    const g=String(p.guardia||'').trim().toUpperCase();
    if(!_GD_GUARDIAS.includes(g))return;
    const t=tipoDe[p.id];
    if(!t)return;                                  // sin marcación ese día
    const enObra=_GD_EN_OBRA.includes(t);
    const ausente=_GD_AUSENTES.includes(t);
    if(!enObra&&!ausente)return;                   // DL, R y demás no ocupan puesto
    if(ausente&&!_gdAusentes)return;
    if(enObra)conteo[g].obra++;else conteo[g].aus++;
    const cargo=(p.cargo||'SIN CARGO').toUpperCase().trim();
    (porG[g][cargo]=porG[g][cargo]||[]).push({p,tipo:t,enObra});
  });
  _GD_GUARDIAS.forEach(g=>Object.values(porG[g]).forEach(a=>
    a.sort((x,y)=>`${x.p.ape} ${x.p.nom}`.localeCompare(`${y.p.ape} ${y.p.nom}`,'es'))));

  // Puestos: unión de cargos, con tantas filas como la guardia más numerosa
  const cargos=[...new Set(_GD_GUARDIAS.flatMap(g=>Object.keys(porG[g])))]
    .sort((a,b)=>_gdOrdenIdx(a)-_gdOrdenIdx(b)||a.localeCompare(b,'es'));
  const bloques=cargos.map(c=>({cargo:c,n:Math.max(..._GD_GUARDIAS.map(g=>(porG[g][c]||[]).length))}));
  const totalFilas=bloques.reduce((s,b)=>s+b.n,0);
  return{fecha,proy,porG,cargos,bloques,totalFilas,conteo};
}

// ── Render (hoja blanca, igual al formato impreso) ──
function rGuardiasFbnv(){
  const cont=document.getElementById('gdBody');if(!cont)return;
  const d=_gdDatos();
  const proyNom=d.proy?((DB.proyectos||[]).find(p=>p.codigo===d.proy)?.nombre||d.proy):'Todos los proyectos';

  const bloqueHtml=g=>{
    let fila=0;
    const filas=d.bloques.map(b=>{
      const lista=d.porG[g][b.cargo]||[];
      return Array.from({length:b.n},(_,i)=>{
        fila++;
        const it=lista[i];
        const nom=it?`${it.p.ape}, ${it.p.nom}`.toUpperCase():'';
        const rojo=it&&!it.enObra;
        return`<tr>
          <td class="gd-n">${fila}</td>
          ${i===0?`<td class="gd-c" rowspan="${b.n}">${_gdEsc(b.cargo)}</td>`:''}
          <td class="gd-p${rojo?' gd-aus':''}">${_gdEsc(nom)}${rojo?` (${it.tipo})`:''}</td>
        </tr>`;
      }).join('');
    }).join('');
    const c=_GD_COL[g]||{bg:'#eee'};
    return`<div class="gd-blk">
      <table class="gd-t">
        <thead>
          <tr><th colspan="3" class="gd-g" style="background:${c.bg}">GUARDIA ${g}</th></tr>
          <tr><th class="gd-h" style="background:${c.bg};width:52px">N°<br>PERSONAS</th>
              <th class="gd-h" style="background:${c.bg};width:150px">EQUIPO / CARGO</th>
              <th class="gd-h" style="background:${c.bg}">PERSONAL</th></tr>
        </thead>
        <tbody>${filas||'<tr><td colspan="3" class="gd-vacio">Sin personal registrado</td></tr>'}</tbody>
        <tfoot><tr><td colspan="2" class="gd-tot">EN OBRA</td><td class="gd-tot" style="text-align:center">${d.conteo[g].obra}${d.conteo[g].aus?` <span style="color:#c00000;font-weight:400">(+${d.conteo[g].aus} aus.)</span>`:''}</td></tr></tfoot>
      </table>
    </div>`;
  };

  cont.innerHTML=`
    <div style="display:flex;align-items:center;gap:.6rem;flex-wrap:wrap;margin-bottom:.8rem;padding:.45rem .7rem;background:var(--panel2);border:1px solid var(--border);border-radius:8px">
      <span style="font-size:.72rem;color:var(--muted2)">Fecha: <strong style="color:var(--text)">${_gdDMY(d.fecha)}</strong> · ${_gdEsc(proyNom)}</span>
      <label style="display:inline-flex;align-items:center;gap:.3rem;font-size:.73rem;color:var(--muted2);cursor:pointer">
        <input type="checkbox" ${_gdAusentes?'checked':''} onchange="_gdToggleAusentes(this.checked)" style="width:auto;margin:0;cursor:pointer"> Mostrar ausentes (F, DM, P, V…)
      </label>
      <span style="font-size:.68rem;color:var(--muted)">Se usa la fecha y el proyecto de la barra superior</span>
      <button onclick="_gdExcel()" style="margin-left:auto;background:#166534;color:#fff;border:none;border-radius:7px;padding:.32rem .9rem;font-size:.78rem;font-weight:700;cursor:pointer">📊 Exportar Excel</button>
      <button onclick="_gdPrint()" style="background:#1e3a5f;color:#fff;border:none;border-radius:7px;padding:.32rem .9rem;font-size:.78rem;font-weight:700;cursor:pointer">🖨️ PDF</button>
    </div>
    <style>${_GD_CSS}</style>
    <div class="gd-doc">
      <div class="gd-tit">GUARDIAS FBNV</div>
      <div class="gd-sub">PERSONAL DIRECTO · ${_gdDMY(d.fecha)} · ${_gdEsc(proyNom)}</div>
      <div class="gd-grid">${_GD_GUARDIAS.map(bloqueHtml).join('')}</div>
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
  .gd-p{font-size:8.5px;color:#1F4E79;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:230px}
  .gd-p.gd-aus{color:#c00000}
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
  const f2=vacia();_GD_GUARDIAS.forEach((_,i)=>{f2[COLS[i]]='N° PERSONAS';f2[COLS[i]+1]='EQUIPO / CARGO';f2[COLS[i]+2]='PERSONAL';});aoa.push(f2);

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
        row[COLS[gi]+2]=it?`${it.p.ape}, ${it.p.nom}`.toUpperCase()+(it.enObra?'':` (${it.tipo})`):'';
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
  _GD_GUARDIAS.forEach((g,gi)=>{fT[COLS[gi]+1]='EN OBRA';fT[COLS[gi]+2]=d.conteo[g].obra+(d.conteo[g].aus?` (+${d.conteo[g].aus} aus.)`:'');});
  aoa.push(fT);

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
      const aus=/\((F|DM|P|V|LP|LM|LF)\)\s*$/.test(String(cp.v||''));
      cp.s={font:{sz:9,color:{rgb:aus?'C00000':'1F4E79'}},alignment:{vertical:'center'},border:BOR};
    });
  }
  const rT=R0+d.totalFilas;
  _GD_GUARDIAS.forEach((_,gi)=>{
    for(let c=COLS[gi]+1;c<=COLS[gi]+2;c++){
      const cel=ws[addr(rT,c)];
      if(cel)cel.s={fill:{patternType:'solid',fgColor:{rgb:'F1F5F9'}},font:{bold:true,sz:9},alignment:{horizontal:c===COLS[gi]+1?'right':'center'},border:BOR};
    }
  });
  ws['!rows']=[{hpt:20},{hpt:16},{hpt:22},...Array(d.totalFilas+1).fill({hpt:13})];

  const wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,ws,'Guardias FBNV');
  XLSX.writeFile(wb,`Guardias_FBNV_${d.fecha}.xlsx`);
  toast('✓ Excel descargado');
}
