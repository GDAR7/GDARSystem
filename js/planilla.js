// ══ PLANILLA DE SUELDOS ══
const _PL_MESES=['','Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const _PL_AFP_RATES={
  'Integra' :{oblig:0.10,comision:0.0155,prima:0.0174},
  'Profuturo':{oblig:0.10,comision:0.0169,prima:0.0174},
  'Prima'   :{oblig:0.10,comision:0.0138,prima:0.0174}
};

let _plGenMes=null,_plGenAnio=null;
let _plDetPersonalId=null,_plDetMes=null,_plDetAnio=null,_plDetCurTab=0;

// ── Tabs modal datos mensuales ──
function plDetGoTab(n){
  _plDetCurTab=n;
  [0,1,2].forEach(i=>{
    const p=document.getElementById('plDetP'+i),t=document.getElementById('plDetTab'+i);
    if(p)p.style.display=i===n?'grid':'none';
    if(t)t.classList.toggle('eq-tab-act',i===n);
  });
  const prev=document.getElementById('plDetBPrev'),next=document.getElementById('plDetBNext'),save=document.getElementById('plDetBSave');
  if(prev)prev.style.display=n>0?'':'none';
  if(next)next.style.display=n<2?'':'none';
  if(save)save.style.display=n===2?'':'none';
}

// ── Motor de cálculo por trabajador ──
function _calcPlanRow(p,det){
  const pad=n=>String(n).padStart(2,'0');
  const monthStr=`${_plGenAnio}-${pad(_plGenMes)}`;
  const r2=n=>Math.round(n*100)/100;

  // Días desde Tareaje
  const tr=DB.tareaje.filter(r=>r.personalId===p.id&&r.fecha&&r.fecha.startsWith(monthStr));
  const diasTD =tr.filter(r=>r.tipo==='TD').length;
  const diasTN =tr.filter(r=>r.tipo==='TN').length;
  const diasDLT=tr.filter(r=>r.tipo==='DLT').length;
  const diasDL =tr.filter(r=>r.tipo==='DL').length;
  const diasDM =tr.filter(r=>r.tipo==='DM').length;
  const diasLP =tr.filter(r=>r.tipo==='LP').length;
  const diasLM =tr.filter(r=>r.tipo==='LM').length;
  const diasLF =tr.filter(r=>r.tipo==='LF').length;
  const diasF  =tr.filter(r=>r.tipo==='F').length;
  const diasSubTotal=diasTD+diasTN+diasDLT;
  const otrosDias   =diasDM+diasLP+diasLM+diasLF;
  const diasTotal   =diasSubTotal+diasDL;

  // Jornal
  const jornal=p.sue||0;
  const jHora =r2(jornal/8);

  // Horas extras
  const he25 =det?.he25 ||0; const impHE25 =r2(he25 *jHora*1.25);
  const he35 =det?.he35 ||0; const impHE35 =r2(he35 *jHora*1.35);
  const he100=det?.he100||0; const impHE100=r2(he100*jHora*2.0);

  // Ingresos fijos
  const asigFam   =p.asig?113.0:0;
  const movilidad =p.movilidad||0;
  const reintegro =det?.reintegro  ||0;
  const bAltura   =det?.bAltura    ||0;
  const bCv       =det?.bCv        ||0;
  const bNocturnas=det?.bNocturnas ||0;
  const refrigerio=det?.refrigerio ||0;
  const licSindical=det?.licSindical||0;

  // Días y tarea
  const tareaOrdinaria=r2(jornal*diasSubTotal);
  const remunDL       =r2(jornal*diasDL);
  const totalDM       =r2(jornal*diasDM);
  const totalLicPat   =r2(jornal*(diasLP+diasLM+diasLF));

  // Subtotal 2
  const subtotal2=r2(tareaOrdinaria+remunDL+impHE25+impHE35+impHE100+
    asigFam+movilidad+bAltura+bCv+bNocturnas+refrigerio+reintegro+
    totalDM+totalLicPat+licSindical);

  // Gratificaciones y extras
  const vacaciones    =det?.vacaciones    ||0;
  const bono          =det?.bono          ||0;
  const gratificacion =det?.gratificacion ||0;
  const bonif9        =r2(gratificacion*0.09);
  const totalGratif   =r2(gratificacion+bonif9);
  const gratifTrunca  =det?.gratifTrunca  ||0;
  const bonif9Trunca  =r2(gratifTrunca*0.09);
  const totalGratifTrunca=r2(gratifTrunca+bonif9Trunca);
  const heAdicional   =det?.heAdicional   ||0;

  // Bases afectas
  const baseLeySociales=r2(subtotal2+vacaciones+totalGratif+totalGratifTrunca);
  const baseRenta5     =r2(subtotal2+vacaciones+gratificacion+bono);
  const baseSctr       =r2(subtotal2+vacaciones);
  const baseVidaLey    =baseSctr;

  // Pensiones
  const afpType=p.afp||'SNP';
  let snp=0,obligAfp=0,primaAfp=0,sobreAfp=0,totalPensiones=0;
  if(afpType==='SNP'){
    snp=r2(baseLeySociales*0.13);
    totalPensiones=snp;
  }else{
    const rt=_PL_AFP_RATES[afpType]||_PL_AFP_RATES['Integra'];
    obligAfp =r2(baseLeySociales*rt.oblig);
    primaAfp =r2(baseLeySociales*rt.prima);
    sobreAfp =r2(baseLeySociales*rt.comision);
    totalPensiones=r2(obligAfp+primaAfp+sobreAfp);
  }

  // Deducciones adicionales
  const fondoMina  =det?.fondoMina  ||0;
  const masVida    =det?.masVida    ||0;
  const adelanto   =det?.adelanto   ||0;
  const vacDesc    =det?.vacDesc    ||0;
  const cts        =det?.cts        ||0;
  const sindicato  =det?.sindicato  ||0;
  const rimac      =det?.rimac      ||0;
  const otrosDesc  =det?.otrosDesc  ||0;
  const retJudicial=det?.retJudicial||0;
  const quintaCat  =det?.quintaCat  ||0;
  const totalDeduccion=r2(totalPensiones+fondoMina+masVida+adelanto+vacDesc+cts+sindicato+rimac+otrosDesc+retJudicial+quintaCat);

  // Neto
  const neto=r2(subtotal2+vacaciones+bono+totalGratif+totalGratifTrunca+heAdicional-totalDeduccion);

  // Aportes empleador
  const essalud      =r2(baseLeySociales*0.09);
  const aporteAfpEmpl=afpType!=='SNP'?r2(baseLeySociales*0.12):0;
  const sctrPenSup   =det?.sctrPenSup  ||0;
  const sctrPenMina  =det?.sctrPenMina ||0;
  const segVidaEmpl  =det?.segVidaEmpl ||0;
  const segVidaLey   =det?.segVidaLey  ||0;
  const sctrSalud    =det?.sctrSalud   ||0;
  const totalAportaciones=r2(essalud+aporteAfpEmpl+sctrPenSup+sctrPenMina+segVidaEmpl+segVidaLey+sctrSalud);

  return{
    diasTD,diasTN,diasDLT,diasDL,diasDM,diasF,otrosDias,diasSubTotal,diasTotal,
    jornal,jHora,he25,he35,he100,impHE25,impHE35,impHE100,
    asigFam,movilidad,reintegro,bAltura,bCv,bNocturnas,refrigerio,licSindical,
    tareaOrdinaria,remunDL,totalDM,totalLicPat,
    subtotal2,vacaciones,bono,gratificacion,bonif9,totalGratif,
    gratifTrunca,bonif9Trunca,totalGratifTrunca,heAdicional,
    baseLeySociales,baseRenta5,baseSctr,baseVidaLey,
    afpType,snp,obligAfp,primaAfp,sobreAfp,totalPensiones,
    fondoMina,masVida,adelanto,vacDesc,cts,sindicato,rimac,otrosDesc,retJudicial,quintaCat,
    totalDeduccion,neto,
    essalud,aporteAfpEmpl,sctrPenSup,sctrPenMina,segVidaEmpl,segVidaLey,sctrSalud,totalAportaciones,
    banco:p.banco||'',cuenta:p.cuenta||'',cuspp:p.cuspp||''
  };
}

// ── Generador principal ──
function genPlanilla(){
  _plGenMes =+document.getElementById('plMes').value;
  _plGenAnio= document.getElementById('plAnio').value;
  const proyFiltro=document.getElementById('plProy')?.value||'';

  // Poblar selector de proyecto
  const ps=document.getElementById('plProy');
  if(ps){const cur=ps.value;ps.innerHTML='<option value="">— Todos —</option>'+(DB.proyectos||[]).map(p=>`<option value="${p.codigo}">[${p.codigo}] ${p.nombre}</option>`).join('');ps.value=cur;}

  const act=DB.personal.filter(p=>p.est==='Activo'&&(!proyFiltro||p.proy===proyFiltro));
  if(!act.length){toast('No hay trabajadores activos',true);return;}

  const S=n=>(n&&n!==0)?'S/ '+Number(n).toLocaleString('es-PE',{minimumFractionDigits:2,maximumFractionDigits:2}):'';
  const hs=(n,cls='')=>n?`<td class="tr mono ${cls}" style="padding:2px 5px">${S(n)}</td>`:`<td style="padding:2px 5px;opacity:.25;text-align:right">—</td>`;
  const hd=(n,cls='')=>n?`<td class="tc mono ${cls}" style="padding:2px 4px">${n}</td>`:`<td style="padding:2px 4px;opacity:.25;text-align:center">0</td>`;
  const th=`padding:4px 5px;font-size:.58rem;white-space:nowrap;text-align:center;border:1px solid rgba(255,255,255,.08);font-weight:700`;

  let totNeto=0,totSub2=0,totDed=0,totEss=0,totAport=0;

  const rows=act.map((p,idx)=>{
    const det=DB.planillaMes.find(d=>d.personalId===p.id&&+d.mes===_plGenMes&&String(d.anio)===String(_plGenAnio));
    const c=_calcPlanRow(p,det);
    totNeto+=c.neto;totSub2+=c.subtotal2;totDed+=c.totalDeduccion;totEss+=c.essalud;totAport+=c.totalAportaciones;
    const afpBg=c.afpType==='SNP'?'#065f46':c.afpType==='Integra'?'#1e40af':c.afpType==='Profuturo'?'#7c3aed':'#b45309';
    const afpBadge=`<span style="background:${afpBg};color:#fff;font-size:.57rem;font-weight:700;padding:1px 5px;border-radius:3px">${c.afpType}</span>`;
    return`<tr style="border-bottom:1px solid var(--border)">
      <td style="padding:2px 5px;font-size:.68rem;color:var(--muted2);text-align:center">${idx+1}</td>
      <td class="mono" style="padding:2px 5px;font-size:.68rem">${p.dni}</td>
      <td style="padding:2px 6px;min-width:150px"><strong style="font-size:.72rem">${p.ape}, ${p.nom}</strong></td>
      <td style="padding:2px 5px;font-size:.65rem;color:var(--muted2);min-width:90px">${p.cargo||'—'}</td>
      <td class="mono" style="padding:2px 5px;font-size:.62rem">${p.ing||'—'}</td>
      <td style="padding:2px 5px;font-size:.62rem">${p.cat||'—'}</td>
      <td style="padding:2px 5px;text-align:center">${afpBadge}</td>
      <td style="padding:2px 5px;font-size:.62rem;text-align:center">${_PL_MESES[_plGenMes]}</td>

      ${hd(c.he25)}${hd(c.he35)}${hd(c.he100)}

      ${hs(c.jornal)}${hs(c.impHE100)}${hs(c.impHE25)}${hs(c.impHE35)}${hs(c.reintegro)}${hs(c.asigFam)}

      <td class="tc mono" style="padding:2px 4px;font-weight:700;background:rgba(245,158,11,.18);color:#f59e0b">${c.diasSubTotal||0}</td>
      <td class="tc mono" style="padding:2px 4px;background:rgba(245,158,11,.08)">${c.otrosDias||0}</td>
      <td class="tc mono" style="padding:2px 4px;color:#ef4444">${c.diasF||0}</td>
      <td class="tc mono" style="padding:2px 4px;font-weight:700;background:rgba(245,158,11,.18)">${c.diasTotal||0}</td>

      ${hs(c.tareaOrdinaria,'text-acc')}${hd(c.diasDL)}${hs(c.remunDL)}
      ${hs(c.totalDM)}${hs(c.totalLicPat)}${hs(c.licSindical)}
      ${hs(c.movilidad)}${hs(c.bAltura)}${hs(c.bCv)}${hs(c.bNocturnas)}${hs(c.refrigerio)}
      <td class="tr mono" style="padding:2px 5px;font-weight:700;background:rgba(4,78,100,.15);color:var(--mec)">${S(c.subtotal2)}</td>

      ${hs(c.vacaciones)}${hs(c.bono)}${hs(c.gratificacion)}${hs(c.bonif9)}${hs(c.totalGratif)}${hs(c.gratifTrunca)}${hs(c.totalGratifTrunca)}${hs(c.heAdicional)}

      ${hs(c.baseRenta5)}${hs(c.baseSctr)}${hs(c.baseVidaLey)}${hs(c.baseLeySociales)}

      ${c.afpType==='SNP'?hs(c.snp,'text-red'):`<td style="padding:2px 5px;opacity:.2;text-align:right">—</td>`}
      ${c.afpType!=='SNP'?hs(c.obligAfp,'text-red'):`<td style="padding:2px 5px;opacity:.2;text-align:right">—</td>`}
      ${c.afpType!=='SNP'?hs(c.primaAfp,'text-red'):`<td style="padding:2px 5px;opacity:.2;text-align:right">—</td>`}
      ${c.afpType!=='SNP'?hs(c.sobreAfp,'text-red'):`<td style="padding:2px 5px;opacity:.2;text-align:right">—</td>`}
      <td class="tr mono" style="padding:2px 5px;font-weight:700;color:#ef4444">${S(c.totalPensiones)}</td>
      <td style="padding:2px 5px;text-align:center">${afpBadge}</td>
      <td class="mono" style="padding:2px 5px;font-size:.62rem">${c.cuspp||'—'}</td>
      ${hs(c.fondoMina,'text-red')}${hs(c.masVida,'text-red')}${hs(c.adelanto,'text-red')}
      ${hs(c.vacDesc,'text-red')}${hs(c.cts,'text-red')}${hs(c.sindicato,'text-red')}
      ${hs(c.rimac,'text-red')}${hs(c.otrosDesc,'text-red')}${hs(c.retJudicial,'text-red')}${hs(c.quintaCat,'text-red')}
      <td class="tr mono" style="padding:2px 5px;font-weight:700;color:#ef4444;background:rgba(239,68,68,.08)">${S(c.totalDeduccion)}</td>

      <td class="tr mono" style="padding:2px 7px;font-size:.8rem;font-weight:800;color:#10b981;background:rgba(16,185,129,.1);min-width:90px">${S(c.neto)}</td>
      <td class="mono" style="padding:2px 5px;font-size:.65rem;min-width:165px">${c.cuenta||'—'}</td>
      <td style="padding:2px 5px;font-size:.65rem;min-width:130px">${c.banco||'—'}</td>

      ${hs(c.essalud)}${hs(c.aporteAfpEmpl)}${hs(c.sctrPenSup)}${hs(c.sctrPenMina)}${hs(c.segVidaEmpl)}${hs(c.segVidaLey)}${hs(c.sctrSalud)}
      <td class="tr mono" style="padding:2px 5px;font-weight:700;color:var(--mec);background:rgba(4,78,100,.1)">${S(c.totalAportaciones)}</td>

      <td style="padding:2px 4px;text-align:center">
        <button class="btn btn-sm" style="font-size:.62rem;padding:2px 6px;background:rgba(59,130,246,.15);border:1px solid #3b82f660;color:#3b82f6" onclick="openPlanillaDet(${p.id})">✏️</button>
      </td>
    </tr>`;
  }).join('');

  // Headers agrupados
  const grp=(lbl,cols,bg)=>`<th colspan="${cols}" style="${th};background:${bg};font-size:.65rem;letter-spacing:.04em">${lbl}</th>`;
  document.getElementById('thPlanilla').innerHTML=`
  <tr>
    ${grp('DATOS',8,'#1e3a8a')}
    ${grp('HORAS EXTRAS',3,'#1d4ed8')}
    ${grp('REMUNERACIONES',6,'#2563eb')}
    ${grp('DÍAS',4,'rgba(180,83,9,.7)')}
    ${grp('TAREA / DL / DM / LIC.',6,'#374151')}
    ${grp('BONIFICACIONES',5,'#374151')}
    ${grp('SUB TOTAL 2',1,'#044e64')}
    ${grp('GRATIFICACIONES',8,'#374151')}
    ${grp('AFECTOS BASE',4,'#1e3a8a')}
    ${grp('DEDUCCIONES',12,'#1f2937')}
    ${grp('NETO / PAGO',3,'#065f46')}
    ${grp('APORTES EMPLEADOR',8,'#1e3a8a')}
    <th style="${th};background:#111827"></th>
  </tr>
  <tr style="background:#1e293b;color:#94a3b8">
    <th style="${th}">#</th><th style="${th}">DNI</th><th style="${th}">Apellidos y Nombres</th><th style="${th}">Cargo</th><th style="${th}">F.Ingreso</th><th style="${th}">Categoría</th><th style="${th}">AFP/SNP</th><th style="${th}">Mes</th>
    <th style="${th}">HE 25%</th><th style="${th}">HE 35%</th><th style="${th}">HE 100%</th>
    <th style="${th}">Jornal Básico</th><th style="${th}">Imp.HE100%</th><th style="${th}">Imp.HE25%</th><th style="${th}">Imp.HE35%</th><th style="${th}">Reintegro</th><th style="${th}">Asig.Fam.</th>
    <th style="${th};background:rgba(245,158,11,.2);color:#f59e0b">Días SubTot.</th><th style="${th}">Otros Días</th><th style="${th};color:#ef4444">Faltas</th><th style="${th};background:rgba(245,158,11,.2);color:#f59e0b">Días Total</th>
    <th style="${th}">Tarea Ord.</th><th style="${th}">Días Lib.</th><th style="${th}">Remun.DL</th><th style="${th}">Total DM</th><th style="${th}">Lic.Pat/Mat</th><th style="${th}">Lic.Sind.</th>
    <th style="${th}">Movilidad</th><th style="${th}">B.Altura</th><th style="${th}">B.CostoVida</th><th style="${th}">B.Noct.</th><th style="${th}">Refrigerio</th>
    <th style="${th};background:rgba(4,78,100,.3);color:var(--mec)">Sub Total 2</th>
    <th style="${th}">Vacaciones</th><th style="${th}">Bono</th><th style="${th}">Gratif.</th><th style="${th}">Bonif.9%</th><th style="${th}">Tot.Gratif.</th><th style="${th}">Gratif.Trunc.</th><th style="${th}">Tot.G.Trunc.</th><th style="${th}">HE Adic.</th>
    <th style="${th}">Base Renta5ta</th><th style="${th}">Base SCTR</th><th style="${th}">Base V.Ley</th><th style="${th}">Base LeyesSoc.</th>
    <th style="${th};color:#ef4444">SNP 13%</th><th style="${th};color:#ef4444">Oblig.AFP</th><th style="${th};color:#ef4444">Prima AFP</th><th style="${th};color:#ef4444">SobreFlujo</th><th style="${th};color:#ef4444;font-weight:800">Tot.Pensiones</th><th style="${th}">Tipo</th><th style="${th}">CUSPP</th>
    <th style="${th};color:#ef4444">Ley29741</th><th style="${th};color:#ef4444">MásVida</th><th style="${th};color:#ef4444">Adelantos</th><th style="${th};color:#ef4444">Vacac.</th><th style="${th};color:#ef4444">CTS</th><th style="${th};color:#ef4444">Sindicato</th><th style="${th};color:#ef4444">RIMAC</th><th style="${th};color:#ef4444">Otros</th><th style="${th};color:#ef4444">Ret.Judicial</th><th style="${th};color:#ef4444">5ta Cat.</th>
    <th style="${th};color:#ef4444;font-weight:800">TOTAL DED.</th>
    <th style="${th};background:rgba(16,185,129,.2);color:#10b981;font-weight:800">NETO A PAGAR</th><th style="${th}">N° Cuenta</th><th style="${th}">Banco</th>
    <th style="${th}">ESSALUD 9%</th><th style="${th}">Aport.AFP</th><th style="${th}">SCTR Pen.Sup.</th><th style="${th}">SCTR Pen.Mina</th><th style="${th}">Seg.Vida Empl.</th><th style="${th}">S.Vida Obr.</th><th style="${th}">SCTR Salud</th><th style="${th};color:var(--mec);font-weight:800">Tot.Aport.</th>
    <th style="${th}">✏️</th>
  </tr>`;

  document.getElementById('tbPlanillaBody').innerHTML=rows;

  // Totales
  const Sf=n=>'S/ '+Number(n).toLocaleString('es-PE',{minimumFractionDigits:2});
  document.getElementById('tfPlanilla').innerHTML=`<tr style="background:var(--panel2);font-weight:700;border-top:2px solid var(--mec)">
    <td colspan="8" style="padding:5px 8px;font-size:.7rem;color:var(--muted2);letter-spacing:.08em">TOTALES · ${act.length} trabajadores</td>
    <td colspan="23" style="padding:5px"></td>
    <td class="tr mono" style="padding:5px;color:var(--mec)">${Sf(totSub2)}</td>
    <td colspan="12" style="padding:5px"></td>
    <td class="tr mono" style="padding:5px;color:#ef4444">${Sf(totDed)}</td>
    <td class="tr mono" style="padding:5px;color:#10b981;font-size:.85rem">${Sf(totNeto)}</td>
    <td colspan="2" style="padding:5px"></td>
    <td colspan="6" style="padding:5px"></td>
    <td class="tr mono" style="padding:5px;color:var(--muted2)">${Sf(totEss)}</td>
    <td colspan="6" style="padding:5px"></td>
    <td class="tr mono" style="padding:5px;color:var(--mec)">${Sf(totAport)}</td>
    <td></td>
  </tr>`;

  document.getElementById('planillaResumen').textContent=`${act.length} trabajadores · Neto total: ${Sf(totNeto)}`;
  document.getElementById('planillaCard').style.display='block';
}

// ── Modal datos mensuales ──
function openPlanillaDet(personalId){
  _plDetPersonalId=personalId;
  _plDetMes=_plGenMes;
  _plDetAnio=_plGenAnio;
  const p=DB.personal.find(x=>x.id===personalId);if(!p)return;
  const det=DB.planillaMes.find(d=>d.personalId===personalId&&+d.mes===_plGenMes&&String(d.anio)===String(_plGenAnio));
  const info=document.getElementById('mPlDetInfo');
  if(info)info.textContent=`${p.ape}, ${p.nom}  ·  ${p.cargo||''}  ·  ${_PL_MESES[_plGenMes]} ${_plGenAnio}`;
  const sv=(id,v)=>{const el=document.getElementById(id);if(el)el.value=v||0;};
  sv('pdHe25',det?.he25);sv('pdHe35',det?.he35);sv('pdHe100',det?.he100);
  sv('pdReintegro',det?.reintegro);sv('pdBAltura',det?.bAltura);sv('pdBCv',det?.bCv);
  sv('pdBNocturnas',det?.bNocturnas);sv('pdRefrigerio',det?.refrigerio);
  sv('pdLicSindical',det?.licSindical);sv('pdVacaciones',det?.vacaciones);
  sv('pdBono',det?.bono);sv('pdGratificacion',det?.gratificacion);
  sv('pdGratifTrunca',det?.gratifTrunca);sv('pdHeAdicional',det?.heAdicional);
  sv('pdAdelanto',det?.adelanto);sv('pdVacDesc',det?.vacDesc);sv('pdCts',det?.cts);
  sv('pdSindicato',det?.sindicato);sv('pdRimac',det?.rimac);sv('pdOtrosDesc',det?.otrosDesc);
  sv('pdRetJudicial',det?.retJudicial);sv('pdQuintaCat',det?.quintaCat);
  sv('pdMasVida',det?.masVida);sv('pdFondoMina',det?.fondoMina);
  sv('pdSctrPenSup',det?.sctrPenSup);sv('pdSctrPenMina',det?.sctrPenMina);
  sv('pdSegVidaEmpl',det?.segVidaEmpl);sv('pdSegVidaLey',det?.segVidaLey);sv('pdSctrSalud',det?.sctrSalud);
  plDetGoTab(0);
  openM('mPlanillaDet');
}

function gPlanillaDet(){
  const g=id=>{const el=document.getElementById(id);return el?+el.value||0:0;};
  const existing=DB.planillaMes.find(d=>d.personalId===_plDetPersonalId&&+d.mes===_plDetMes&&String(d.anio)===String(_plDetAnio));
  const rec={
    id:existing?existing.id:nid('plm'),
    personalId:_plDetPersonalId,mes:_plDetMes,anio:_plDetAnio,
    he25:g('pdHe25'),he35:g('pdHe35'),he100:g('pdHe100'),
    reintegro:g('pdReintegro'),bAltura:g('pdBAltura'),bCv:g('pdBCv'),
    bNocturnas:g('pdBNocturnas'),refrigerio:g('pdRefrigerio'),licSindical:g('pdLicSindical'),
    vacaciones:g('pdVacaciones'),bono:g('pdBono'),gratificacion:g('pdGratificacion'),
    gratifTrunca:g('pdGratifTrunca'),heAdicional:g('pdHeAdicional'),
    adelanto:g('pdAdelanto'),vacDesc:g('pdVacDesc'),cts:g('pdCts'),
    sindicato:g('pdSindicato'),rimac:g('pdRimac'),otrosDesc:g('pdOtrosDesc'),
    retJudicial:g('pdRetJudicial'),quintaCat:g('pdQuintaCat'),
    masVida:g('pdMasVida'),fondoMina:g('pdFondoMina'),
    sctrPenSup:g('pdSctrPenSup'),sctrPenMina:g('pdSctrPenMina'),
    segVidaEmpl:g('pdSegVidaEmpl'),segVidaLey:g('pdSegVidaLey'),sctrSalud:g('pdSctrSalud')
  };
  if(existing){Object.assign(existing,rec);}else{DB.planillaMes.push(rec);}
  syncSheet('savePlanillaMes',rec);
  closeM('mPlanillaDet');
  genPlanilla();
  toast('Datos mensuales guardados');
}

function printPlanilla(){
  toast('Función PDF de planilla próximamente');
}
