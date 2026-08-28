// ══ BOLETA DE PAGO ══════════════════════════════════════════════════════════
// La boleta individual de cada trabajador, con el mismo formato de documento
// que los RQ de almacén: encabezado con logo que se repite en cada página,
// pie de firmas, y las tablas en azul institucional.
//
// Sale del MISMO cálculo que la planilla — no recalcula nada por su cuenta.
// Con el mes cerrado toma la foto guardada, así la boleta dice exactamente lo
// que se pagó, aunque después alguien corrija un sueldo o un día de tareaje.
//
// Tres salidas: verla en pantalla, imprimirla o guardarla como PDF, y abrir el
// correo del trabajador con el detalle listo.

const _BL_AZUL='#1e3a6e', _BL_AMBAR='#d97706';
const _blEsc=s=>String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const _blS=n=>'S/ '+Number(n||0).toLocaleString('es-PE',{minimumFractionDigits:2,maximumFractionDigits:2});
const _blN=n=>Number(n||0).toLocaleString('es-PE',{minimumFractionDigits:2,maximumFractionDigits:2});
const _blNorm=s=>String(s||'').toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^A-Z0-9]+/g,' ').trim();

let _blBuscar='';

// ── El cálculo de un trabajador, igual que lo ve la planilla ───────────────
// Devuelve también de dónde salió: "cerrada" cuando viene de la foto guardada.
function blFila(personalId,mes,anio){
  const p=(DB.personal||[]).find(x=>+x.id===+personalId);
  if(!p)return null;
  const m=+(mes||_plGenMes), a=anio||_plGenAnio;
  const cerrado=typeof plMesCerrado==='function'&&plMesCerrado(m,a);
  const foto=cerrado&&typeof plFilaCerrada==='function'?plFilaCerrada(personalId,m,a):null;
  const det=(DB.planillaMes||[]).find(d=>d.personalId===p.id&&+d.mes===m&&String(d.anio)===String(a));
  const c=(foto&&foto.datos)?{...foto.datos}:_calcPlanRow(p,det);
  return{p,c,mes:m,anio:a,cerrada:!!foto,recalcEn:foto?foto.recalcEn:null};
}

// ── Los conceptos de la boleta ─────────────────────────────────────────────
// Solo se imprime lo que tiene importe: una boleta con veinte ceros no se lee.
// El sueldo base y los días van siempre, aunque el resto esté vacío.
function _blConceptos(c){
  const ing=[
    ['Jornal básico',                 c.jornal,     1],
    ['Horas extra 25 %',              c.impHE25],
    ['Horas extra 35 %',              c.impHE35],
    ['Horas extra 100 %',             c.impHE100],
    ['Reintegro',                     c.reintegro],
    ['Asignación familiar',           c.asigFam],
    ['Tarea ordinaria',               c.tareaOrdinaria],
    ['Remuneración día libre',        c.remunDL],
    ['Descanso médico',               c.totalDM],
    ['Licencia con goce',             c.totalLicPat],
    ['Licencia sindical',             c.licSindical],
    ['Bonificación por altura',       c.bAltura],
    ['Bonificación costo de vida',    c.bCv],
    ['Bonificación nocturna',         c.bNocturnas],
    ['Refrigerio',                    c.refrigerio],
    ['Vacaciones',                    c.vacaciones],
    ['Bonificación extraordinaria',   c.bono],
    ['Gratificación',                 c.totalGratif],
    ['Gratificación trunca',          c.totalGratifTrunca],
    ['Horas extra adicionales',       c.heAdicional]
  ];
  // La movilidad no entra al subtotal ni paga aportes, pero sí se cobra: va
  // aparte para que en la boleta se vea de dónde sale la diferencia.
  const pens=c.esOnp
    ? [['ONP / SNP 13 %', c.snp]]
    : [['AFP · aporte obligatorio', c.obligAfp],
       ['AFP · prima de seguro',    c.primaAfp],
       ['AFP · comisión',           c.sobreAfp]];
  const otr=[
    ['Fondo minero (Ley 29741)', c.fondoMina],
    ['Más Vida',                 c.masVida],
    ['Adelantos',                c.adelanto],
    ['Descuento vacaciones',     c.vacDesc],
    ['CTS',                      c.cts],
    ['Cuota sindical',           c.sindicato],
    ['RIMAC / EPS',              c.rimac],
    ['Otros descuentos',         c.otrosDesc],
    ['Retención judicial',       c.retJudicial],
    ['Renta de 5.ª categoría',   c.quintaCat]
  ];
  const vivo=l=>l.filter(([,v,fijo])=>fijo||Math.abs(+v||0)>0.004).map(([n,v])=>[n,+v||0]);
  return{ing:vivo(ing),pens:vivo(pens),otr:vivo(otr)};
}

// ── El documento ───────────────────────────────────────────────────────────
// `soloCuerpo` sirve para la vista previa dentro del modal; sin él sale el
// documento completo, listo para imprimir.
function _blCuerpo(f){
  const{p,c}=f;
  const K=_blConceptos(c);
  const mesLbl=(typeof _PL_MESES!=='undefined'?_PL_MESES[f.mes]:f.mes)+' '+f.anio;
  const fila=(n,v,col)=>`<tr><td>${_blEsc(n)}</td><td align=right class=m${col?' style="color:'+col+'"':''}>${_blN(v)}</td></tr>`;
  const suma=l=>l.reduce((s,[,v])=>s+v,0);

  const dato=(l,v)=>`<div><div class=lbl>${_blEsc(l)}</div><div class=val>${_blEsc(v==null||v===''?'—':v)}</div></div>`;

  let h='';
  h+=`<div class=proy><div class=lbl>Período</div><div class=val>${_blEsc(mesLbl)}${f.cerrada?' <span style="font-size:9px;color:'+_BL_AMBAR+'">· planilla cerrada</span>':''}</div></div>`;

  h+='<div class=grid>';
  h+=dato('Trabajador',`${p.ape||''}, ${p.nom||''}`.trim());
  h+=dato('DNI',p.dni);
  h+=dato('Cargo',p.cargo);
  h+=dato('Categoría',p.cat);
  h+=dato('Fecha de ingreso',p.ing);
  h+=dato('Régimen pensionario',c.afpType);
  h+=dato('CUSPP',p.cuspp);
  h+=dato('Banco',p.banco);
  h+=dato('N.º de cuenta',p.cuenta);
  h+='</div>';

  // Días y horas
  h+='<div class=sec>Días y horas del período</div>';
  h+='<table class=ct><thead><tr>'
   +'<th class=c>Días trabajados</th><th class=c>Días libres</th><th class=c>Días totales</th>'
   +'<th class=c>H.E. 25 %</th><th class=c>H.E. 35 %</th><th class=c>H.E. 100 %</th>'
   +'</tr></thead><tbody><tr>'
   +`<td align=center class=m>${c.diasSubTotal||0}</td>`
   +`<td align=center class=m>${c.diasDL||0}</td>`
   +`<td align=center class=m style="font-weight:700">${c.diasTotal||0}</td>`
   +`<td align=center class=m>${_blN(c.he25)}</td>`
   +`<td align=center class=m>${_blN(c.he35)}</td>`
   +`<td align=center class=m>${_blN(c.he100)}</td>`
   +'</tr></tbody></table>';

  // Ingresos y descuentos, uno al lado del otro
  h+='<div class=cols>';

  h+='<div><div class=sec>Ingresos</div><table class=ct><thead><tr><th class=l>Concepto</th><th class=r>Importe S/</th></tr></thead><tbody>';
  h+=K.ing.map(([n,v])=>fila(n,v)).join('');
  h+=`</tbody><tfoot><tr class=tt><td>Total ingresos</td><td align=right class=m>${_blN(c.subtotal2)}</td></tr></tfoot></table>`;
  if(+c.movilidad)h+=`<div class=nota><b>Movilidad ${_blS(c.movilidad)}</b> — se paga íntegra: no es afecta a aportes ni descuentos, y por eso va fuera del total de ingresos.</div>`;
  h+='</div>';

  h+='<div><div class=sec>Descuentos</div><table class=ct><thead><tr><th class=l>Concepto</th><th class=r>Importe S/</th></tr></thead><tbody>';
  h+=`<tr class=sub><td colspan=2>Pensiones · ${_blEsc(c.afpType||'—')}</td></tr>`;
  h+=(K.pens.length?K.pens.map(([n,v])=>fila(n,v,'#b91c1c')).join('')
                  :'<tr><td colspan=2 style="color:#999">Sin aporte en el período</td></tr>');
  h+=`<tr class=st><td>Subtotal pensiones</td><td align=right class=m>${_blN(c.totalPensiones)}</td></tr>`;
  if(K.otr.length){
    h+='<tr class=sub><td colspan=2>Otros descuentos</td></tr>';
    h+=K.otr.map(([n,v])=>fila(n,v,'#b91c1c')).join('');
    h+=`<tr class=st><td>Subtotal otros</td><td align=right class=m>${_blN(c.totalOtrasDed)}</td></tr>`;
  }
  h+=`</tbody><tfoot><tr class=tt><td>Total descuentos</td><td align=right class=m>${_blN(c.totalDeduccion)}</td></tr></tfoot></table></div>`;

  h+='</div>';

  // Neto
  h+='<table class=neto><tr>'
   +`<td>Total ingresos<br><b>${_blN(c.subtotal2)}</b></td>`
   +`<td>Movilidad<br><b>${_blN(c.movilidad)}</b></td>`
   +`<td>Total descuentos<br><b>− ${_blN(c.totalDeduccion)}</b></td>`
   +`<td class=big>Neto a pagar<br><b>${_blS(c.neto)}</b></td>`
   +'</tr></table>';

  // Aportes del empleador — informativos, no se descuentan
  const ap=[['ESSALUD 9 %',c.essalud],['SCTR pensión superficie',c.sctrPenSup],['SCTR pensión mina',c.sctrPenMina],
    ['SCTR salud',c.sctrSalud],['Seguro de vida',c.segVidaEmpl],['Seguro vida ley',c.segVidaLey],['Aporte AFP empleador',c.aporteAfpEmpl]]
    .filter(([,v])=>Math.abs(+v||0)>0.004);
  if(ap.length){
    h+='<div class=sec>Aportes del empleador <span style="font-weight:400;text-transform:none;color:#999">— no se descuentan al trabajador</span></div>';
    h+='<table class=ct><thead><tr><th class=l>Concepto</th><th class=r>Importe S/</th></tr></thead><tbody>';
    h+=ap.map(([n,v])=>fila(n,v)).join('');
    h+=`</tbody><tfoot><tr class=tt><td>Total aportes</td><td align=right class=m>${_blN(c.totalAportaciones)}</td></tr></tfoot></table>`;
  }
  return h;
}

function _blCss(){
  return '*{margin:0;padding:0;box-sizing:border-box}'
  +'@page{margin:15px 0}'
  +'body{font-family:Segoe UI,Arial,sans-serif;font-size:12px;color:#111;padding:0 30px;background:#fff}'
  +'.doc{width:100%;border-collapse:collapse}'
  +'.doc>thead>tr>td,.doc>tbody>tr>td,.doc>tfoot>tr>td{padding:0;border:none;vertical-align:top}'
  +'.ph{padding:8px 0 6px;border-top:3px solid '+_BL_AZUL+';border-bottom:2px solid '+_BL_AZUL+';margin-bottom:12px}'
  +'.ph-inner{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:10px}'
  +'.ph-logo{height:40px;max-width:160px;object-fit:contain}'
  +'.ph-center{text-align:center}'
  +'.ph-title{font-size:13px;font-weight:900;color:'+_BL_AZUL+';letter-spacing:.02em;line-height:1.2}'
  +'.ph-rq{font-family:Courier New,monospace;font-size:11px;font-weight:700;color:'+_BL_AMBAR+';letter-spacing:.08em}'
  +'.ph-right{text-align:right;font-size:7.5px;color:#999;line-height:1.7}'
  +'.pf{padding:6px 0 4px;border-top:2px solid '+_BL_AZUL+'}'
  +'.vb-wrap{display:grid;grid-template-columns:repeat(2,1fr);gap:20px;margin-bottom:5px}'
  +'.vb{text-align:center}.vb-space{height:38px}'
  +'.vb-line{border-top:1.5px solid #333;margin:0 10px 5px}'
  +'.vb-label{font-size:8.5px;text-transform:uppercase;font-weight:700;color:'+_BL_AZUL+';letter-spacing:.06em}'
  +'.vb-sub{font-size:7.5px;color:#aaa;margin-top:2px}'
  +'.proy{background:#eef3ff;border-left:4px solid '+_BL_AZUL+';border-radius:4px;padding:7px 12px;margin-bottom:12px}'
  +'.proy .lbl{font-size:8px;text-transform:uppercase;color:#888;font-weight:700;margin-bottom:2px}'
  +'.proy .val{font-weight:700;font-size:13px;color:'+_BL_AZUL+'}'
  +'.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:14px;background:#f8f9fb;border-radius:6px;padding:12px;border:1px solid #e2e6f0}'
  +'.lbl{font-size:8.5px;text-transform:uppercase;color:#999;margin-bottom:2px;font-weight:700}'
  +'.val{font-weight:600;font-size:11px}'
  +'.cols{display:grid;grid-template-columns:1fr 1fr;gap:14px;align-items:start}'
  +'.ct{width:100%;border-collapse:collapse;margin-bottom:10px}'
  +'.ct th{background:'+_BL_AZUL+';color:#fff;padding:6px 8px;font-size:9px;text-transform:uppercase;font-weight:700}'
  +'.ct th.l{text-align:left}.ct th.c{text-align:center}.ct th.r{text-align:right}'
  +'.ct td{padding:4px 8px;border-bottom:1px solid #eee;font-size:11px}'
  +'.ct tr{page-break-inside:avoid}'
  +'.ct tr.sub td{background:#f1f4fb;font-size:8.5px;text-transform:uppercase;font-weight:700;color:'+_BL_AZUL+';letter-spacing:.05em;padding:3px 8px}'
  +'.ct tr.st td{background:#fafbfe;font-weight:700;font-size:10.5px;color:#555}'
  +'.ct tfoot tr.tt td{background:'+_BL_AZUL+';color:#fff;font-weight:700;font-size:11px;padding:5px 8px}'
  +'.m{font-family:Courier New,monospace}'
  +'.sec{font-size:9.5px;text-transform:uppercase;color:'+_BL_AZUL+';margin:10px 0 6px;font-weight:700;border-left:3px solid '+_BL_AMBAR+';padding-left:7px}'
  +'.nota{font-size:9px;color:#666;background:#fafafa;border-left:3px solid #ccc;padding:6px 8px;border-radius:0 4px 4px 0;margin-bottom:10px}'
  +'.neto{width:100%;border-collapse:collapse;margin:6px 0 12px;table-layout:fixed}'
  +'.neto td{border:1px solid #e2e6f0;padding:8px 10px;font-size:9px;text-transform:uppercase;color:#888;font-weight:700;letter-spacing:.05em;text-align:center}'
  +'.neto td b{display:block;margin-top:3px;font-size:14px;color:#111;font-family:Courier New,monospace;text-transform:none;letter-spacing:0}'
  +'.neto td.big{background:#eef7f1;border-color:#bfe0cd}'
  +'.neto td.big b{font-size:19px;color:#0f7a4a}'
  +'.pagina{page-break-after:always}.pagina:last-child{page-break-after:auto}';
}

// Documento completo, con encabezado y firmas que se repiten por página
function _blDoc(filas){
  const base=window.location.href.replace(/[^\/\\]+$/,'');
  const logo=base+'09.-ERP/Imagenes/ECOSERMO-LOGO.png';
  const uno=f=>{
    const mesLbl=(typeof _PL_MESES!=='undefined'?_PL_MESES[f.mes]:f.mes)+' '+f.anio;
    let h='<table class="doc pagina"><thead><tr><td>';
    h+='<div class=ph><div class=ph-inner>';
    h+='<img src="'+logo+'" class=ph-logo alt="Ecosermo">';
    h+='<div class=ph-center><div class=ph-title>Boleta de Pago</div><div class=ph-rq>'+_blEsc(mesLbl.toUpperCase())+'</div></div>';
    h+='<div class=ph-right>Documento de uso interno<br>Generado por GDAR</div>';
    h+='</div></div></td></tr></thead>';
    h+='<tfoot><tr><td><div class=pf><div class=vb-wrap>';
    h+='<div class=vb><div class=vb-space></div><div class=vb-line></div><div class=vb-label>Empleador</div><div class=vb-sub>Firma y sello</div></div>';
    h+='<div class=vb><div class=vb-space></div><div class=vb-line></div><div class=vb-label>'+_blEsc(`${f.p.ape||''}, ${f.p.nom||''}`.trim())+'</div><div class=vb-sub>DNI '+_blEsc(f.p.dni||'—')+' · recibí conforme</div></div>';
    h+='</div></div></td></tr></tfoot>';
    h+='<tbody><tr><td>'+_blCuerpo(f)+'</td></tr></tbody></table>';
    return h;
  };
  const S='<'+'/';
  const tit=filas.length===1
    ? `Boleta ${filas[0].p.ape||''} ${filas[0].p.nom||''}`.trim()
    : `Boletas ${(typeof _PL_MESES!=='undefined'?_PL_MESES[filas[0].mes]:'')} ${filas[0].anio}`;
  return '<!DOCTYPE html><html><head><meta charset=utf-8><title>'+_blEsc(tit)+S+'title><style>'
    +_blCss()+S+'style>'+S+'head><body>'+filas.map(uno).join('')+S+'body>'+S+'html>';
}

// ── Acciones ───────────────────────────────────────────────────────────────
function _blAbrir(html,aviso){
  const win=window.open('','_blank');
  if(!win){toast(aviso||'Active las ventanas emergentes para poder imprimir',true);return null;}
  win.document.write(html);win.document.close();win.focus();
  return win;
}
function blPdf(personalId){
  const f=blFila(personalId);
  if(!f){toast('No se encontró al trabajador',true);return;}
  const win=_blAbrir(_blDoc([f]));
  if(win)setTimeout(()=>win.print(),400);
}
// Todas las boletas de los que están a la vista, una por página
function blPdfTodas(){
  const filas=_blVisibles();
  if(!filas.length){toast('No hay boletas que imprimir',true);return;}
  if(filas.length>60&&!confirm(`Se van a preparar ${filas.length} boletas en un solo documento.\n\nPuede tardar unos segundos. ¿Continuar?`))return;
  const win=_blAbrir(_blDoc(filas));
  if(win)setTimeout(()=>win.print(),600);
}

// Correo: el navegador no puede adjuntar el PDF por su cuenta, así que se abre
// el correo con el detalle en el cuerpo y el PDF se adjunta a mano.
function blCorreo(personalId){
  const f=blFila(personalId);
  if(!f)return;
  const{p,c}=f;
  if(!p.email){
    toast('Ese trabajador no tiene correo cargado en su ficha',true);
    if(typeof openPersonalEdit==='function'&&confirm(`${p.ape}, ${p.nom} no tiene correo.\n\n¿Abrir su ficha para cargarlo?`))openPersonalEdit(p.id);
    return;
  }
  const mesLbl=(typeof _PL_MESES!=='undefined'?_PL_MESES[f.mes]:f.mes)+' '+f.anio;
  const L=[
    `Estimado(a) ${(p.nom||'').split(' ')[0]||''},`,'',
    `Adjuntamos su boleta de pago correspondiente a ${mesLbl}.`,'',
    'RESUMEN',
    `  Días totales........ ${c.diasTotal||0}`,
    `  Total ingresos...... ${_blS(c.subtotal2)}`,
    +c.movilidad?`  Movilidad........... ${_blS(c.movilidad)}`:'',
    `  Total descuentos.... ${_blS(c.totalDeduccion)}`,
    `  NETO A PAGAR........ ${_blS(c.neto)}`,'',
    p.banco?`Abono en ${p.banco}${p.cuenta?' · cuenta '+p.cuenta:''}.`:'',
    '','Ante cualquier consulta, comuníquese con el área de Recursos Humanos.','',
    'ECOSERMO'
  ].filter(x=>x!=='').join('\n');
  const asunto=`Boleta de pago · ${mesLbl} · ${(p.ape||'')}, ${(p.nom||'')}`.trim();
  const url='mailto:'+encodeURIComponent(p.email)+'?subject='+encodeURIComponent(asunto)+'&body='+encodeURIComponent(L);
  if(url.length>1900)toast('El resumen es largo: si el correo sale cortado, adjunte el PDF y borre el texto',true);
  window.location.href=url;
}

// ── Pantalla ───────────────────────────────────────────────────────────────
function _blVisibles(){
  const proy=(document.getElementById('plProy')||{}).value||'';
  const base=(DB.personal||[]).filter(p=>p.est==='Activo'&&(!proy||p.proy===proy))
    .filter(p=>typeof _plPasa==='function'?_plPasa(p):true);
  const q=_blNorm(_blBuscar);
  const filtrada=!q?base:base.filter(p=>{
    const heno=_blNorm([p.ape,p.nom,p.dni,p.cargo,p.cat,p.email].filter(Boolean).join(' '));
    return q.split(' ').every(w=>heno.includes(w));
  });
  return filtrada.map(p=>blFila(p.id)).filter(Boolean)
    .sort((a,b)=>String(a.p.ape||'').localeCompare(String(b.p.ape||''),'es'));
}

function _blSetBuscar(v){
  _blBuscar=v;
  const t=document.getElementById('blLista');
  if(t)t.innerHTML=_blTabla();
}

function _blTabla(){
  const filas=_blVisibles();
  const TD='padding:.35rem .5rem;border-bottom:1px solid var(--border);font-size:.75rem';
  const TH='background:var(--panel2);color:var(--muted2);font-size:.6rem;font-weight:700;text-transform:uppercase;letter-spacing:.05em;padding:.4rem .5rem;position:sticky;top:0;text-align:left';
  if(!filas.length)return`<div style="padding:2.5rem;text-align:center;color:var(--muted2);font-size:.8rem">${_blBuscar?'Nadie coincide con <b>'+_blEsc(_blBuscar)+'</b>':'No hay trabajadores activos'}</div>`;
  const bt=(fn,ic,tit,col)=>`<button onclick="${fn}" title="${tit}" style="background:${col}18;border:1px solid ${col}55;border-radius:6px;color:${col};cursor:pointer;font-size:.72rem;padding:.15rem .45rem;margin-right:.2rem">${ic}</button>`;
  const cuerpo=filas.map((f,i)=>`<tr>
    <td style="${TD};text-align:center;color:var(--muted2);font-size:.68rem">${i+1}</td>
    <td style="${TD};white-space:nowrap"><b>${_blEsc(f.p.ape)}, ${_blEsc(f.p.nom)}</b>
      <div style="font-size:.62rem;color:var(--muted2)">${_blEsc(f.p.cargo||'')}</div></td>
    <td style="${TD};font-family:monospace;color:#22d3ee;font-size:.7rem">${_blEsc(f.p.dni||'—')}</td>
    <td style="${TD};text-align:center;font-family:monospace">${f.c.diasTotal||0}</td>
    <td style="${TD};text-align:right;font-family:monospace">${_blN(f.c.subtotal2)}</td>
    <td style="${TD};text-align:right;font-family:monospace;color:#ef4444">${_blN(f.c.totalDeduccion)}</td>
    <td style="${TD};text-align:right;font-family:monospace;font-weight:800;color:#10b981">${_blN(f.c.neto)}</td>
    <td style="${TD};font-size:.66rem;color:${f.p.email?'var(--muted2)':'#f59e0b'};max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${_blEsc(f.p.email||'')}">${_blEsc(f.p.email||'sin correo')}</td>
    <td style="${TD};white-space:nowrap;text-align:center">
      ${bt(`blVer(${f.p.id})`,'👁','Ver la boleta','#8b5cf6')}
      ${bt(`blPdf(${f.p.id})`,'📄','Imprimir o guardar como PDF','#3b82f6')}
      ${bt(`blCorreo(${f.p.id})`,'✉️','Enviar por correo','#10b981')}
    </td>
  </tr>`).join('');
  const tot=filas.reduce((s,f)=>s+(+f.c.neto||0),0);
  const sinCorreo=filas.filter(f=>!f.p.email).length;
  return`
    <div style="display:flex;gap:.6rem;flex-wrap:wrap;align-items:center;font-size:.72rem;color:var(--muted2);padding:0 .1rem .5rem">
      <span><b style="color:var(--text)">${filas.length}</b> boleta${filas.length===1?'':'s'}</span>
      <span>· neto <b style="color:#10b981">${_blS(tot)}</b></span>
      ${sinCorreo?`<span style="color:#f59e0b">· ${sinCorreo} sin correo cargado</span>`:''}
    </div>
    <div style="border:1px solid var(--border);border-radius:8px;overflow:auto;max-height:62vh">
      <table style="width:100%;border-collapse:collapse">
        <thead><tr>
          <th style="${TH};text-align:center">#</th><th style="${TH}">Trabajador</th><th style="${TH}">DNI</th>
          <th style="${TH};text-align:center">Días</th><th style="${TH};text-align:right">Ingresos</th>
          <th style="${TH};text-align:right">Descuentos</th><th style="${TH};text-align:right">Neto</th>
          <th style="${TH}">Correo</th><th style="${TH};text-align:center">Boleta</th>
        </tr></thead>
        <tbody>${cuerpo}</tbody>
      </table>
    </div>`;
}

// La pantalla del tab. El buscador vive fuera de #blLista para que escribir no
// vuelva a crear la caja de texto y el cursor no se escape.
function blRender(){
  const cont=document.getElementById('blPanel');if(!cont)return;
  const inp='background:var(--panel);border:1px solid var(--border);border-radius:6px;color:var(--text);padding:.28rem .55rem;font-size:.76rem';
  cont.innerHTML=`
    <div style="display:flex;gap:.5rem;flex-wrap:wrap;align-items:center;padding:.6rem .8rem;border-bottom:1px solid var(--border)">
      <span style="position:relative;display:inline-flex;align-items:center">
        <span style="position:absolute;left:.45rem;font-size:.78rem;opacity:.6;pointer-events:none">🔍</span>
        <input id="blBuscar" type="search" value="${_blEsc(_blBuscar)}" placeholder="Nombre, DNI o cargo…"
          oninput="_blSetBuscar(this.value)" onsearch="_blSetBuscar(this.value)" autocomplete="off"
          style="${inp};padding-left:1.7rem;width:230px">
      </span>
      <button onclick="blPdfTodas()" class="btn btn-out btn-sm" style="margin-left:auto;color:#3b82f6;border-color:#3b82f660">📄 Todas en un PDF</button>
    </div>
    <div id="blLista" style="padding:.6rem .8rem">${_blTabla()}</div>`;
}

// Vista previa dentro de la aplicación, con el mismo aspecto que el impreso
function blVer(personalId){
  const f=blFila(personalId);
  if(!f){toast('No se encontró al trabajador',true);return;}
  const cont=document.getElementById('mBoletaBody');if(!cont)return;
  const ttl=document.getElementById('mBoletaTtl');
  if(ttl)ttl.textContent=`Boleta · ${f.p.ape}, ${f.p.nom} · ${(typeof _PL_MESES!=='undefined'?_PL_MESES[f.mes]:'')} ${f.anio}`;
  const S='<'+'/';
  // El documento se pinta dentro de un iframe aislado: así el CSS claro de la
  // boleta no pelea con el tema oscuro de la aplicación.
  cont.innerHTML=`<iframe id="blFrame" style="width:100%;height:70vh;border:0;background:#fff;border-radius:8px"></iframe>`;
  const fr=document.getElementById('blFrame');
  const doc=fr.contentDocument||fr.contentWindow.document;
  doc.open();doc.write(_blDoc([f]));doc.close();
  const bp=document.getElementById('mBoletaPdf');
  if(bp)bp.onclick=()=>blPdf(personalId);
  const bc=document.getElementById('mBoletaMail');
  if(bc)bc.onclick=()=>blCorreo(personalId);
  openM('mBoleta');
}
