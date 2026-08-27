// ══ PLANILLA DE SUELDOS ══
const _PL_MESES=['','Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
// Tasas AFP · oblig = aporte obligatorio · comision = comisión sobre flujo
// prima = seguro de invalidez y sobrevivencia (la fija la SBS, es igual para todas)
// ⚠ Las AFP actualizan sus comisiones periódicamente: revisar al menos una vez al año.
const _PL_AFP_RATES={
  'Integra'  :{oblig:0.10,comision:0.0155,prima:0.0174},
  'Profuturo':{oblig:0.10,comision:0.0169,prima:0.0174},
  'Prima'    :{oblig:0.10,comision:0.0138,prima:0.0174},
  'Habitat'  :{oblig:0.10,comision:0.0137,prima:0.0174}
};

let _plGenMes=null,_plGenAnio=null;
// AFPs encontradas en el personal que no están en _PL_AFP_RATES
const _plAfpDesconocidas=new Set();
let _plDetPersonalId=null,_plDetMes=null,_plDetAnio=null,_plDetCurTab=0;

// ── Tabs modal datos mensuales ──
function plDetGoTab(n){
  _plDetCurTab=n;
  [0,1,2,3].forEach(i=>{
    const p=document.getElementById('plDetP'+i),t=document.getElementById('plDetTab'+i);
    if(p)p.style.display=i===n?'grid':'none';
    if(t)t.classList.toggle('eq-tab-act',i===n);
  });
  const prev=document.getElementById('plDetBPrev'),next=document.getElementById('plDetBNext'),save=document.getElementById('plDetBSave');
  if(prev)prev.style.display=n>0?'':'none';
  if(next)next.style.display=n<3?'':'none';
  if(save)save.style.display=n===3?'':'none';
}

// Tasa diaria de la bonificación por costo de vida (S/ por día).
// Se aplica sobre los días trabajados + los días libres ganados.
const _PL_CV_TASA=2.138;

// ── Motor de cálculo por trabajador ──
function _calcPlanRow(p,det){
  const pad=n=>String(n).padStart(2,'0');
  const monthStr=`${_plGenAnio}-${pad(_plGenMes)}`;
  const r2=n=>Math.round(n*100)/100;

  // Días desde Tareaje
  const tr=DB.tareaje.filter(r=>r.personalId===p.id&&r.fecha&&String(r.fecha).startsWith(monthStr));
  // Se cuentan FECHAS ÚNICAS, no registros: si un día quedó marcado dos veces
  // (pasa al corregir el tareaje a mano) contaba doble y pagaba de más.
  const nDias=t=>new Set(tr.filter(r=>r.tipo===t).map(r=>String(r.fecha).slice(0,10))).size;
  const diasTD =nDias('TD');
  const diasA5 =nDias('A5');     // Anexo 5: se paga como jornada trabajada
  const diasTN =nDias('TN');
  const diasDLT=nDias('DLT');
  const diasDL =nDias('DL');
  const diasDM =nDias('DM');
  const diasLP =nDias('LP');
  const diasLM =nDias('LM');
  const diasLF =nDias('LF');
  const diasF  =nDias('F');
  // El Anexo 5 entra en el subtotal, igual que en Tareaje, HH Venta y Corte de
  // Equipos. Antes quedaba fuera y los días de A5 no se pagaban ni se veían.
  const diasSubTotal=diasTD+diasA5+diasTN+diasDLT;
  const otrosDias   =diasDM+diasLP+diasLM+diasLF;
  const diasTotal   =diasSubTotal+diasDL;

  // Jornal
  const jornal_mes=p.sue||0;
  const jornal = r2(jornal_mes/30);
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
  // Bonif. costo de vida = (días trabajados + días libres ganados) × tasa.
  // Es exactamente diasTotal, que ya suma los dos. Si en el detalle se cargó un
  // importe a mano, ese manda: sirve para los casos de excepción.
  const bCvCalc   =r2(diasTotal*_PL_CV_TASA);
  const bCv       =(det&&+det.bCv)?+det.bCv:bCvCalc;
  const bNocturnas=det?.bNocturnas ||0;
  const refrigerio=det?.refrigerio ||0;
  const licSindical=det?.licSindical||0;

  // Días y tarea
  const tareaOrdinaria=r2(jornal*diasSubTotal);
  const remunDL       =r2(jornal*diasDL);
  const totalDM       =r2(jornal*diasDM);
  const totalLicPat   =r2(jornal*(diasLP+diasLM+diasLF));

  // Subtotal 2 — la MOVILIDAD no entra: es concepto no remunerativo, no afecta
  // a leyes sociales. Se suma recién en el neto (igual que en la planilla oficial).
  const subtotal2=r2(tareaOrdinaria+remunDL+impHE25+impHE35+impHE100+
    asigFam+bAltura+bCv+bNocturnas+refrigerio+reintegro+
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

  // Pensiones — las tasas salen del módulo Tasas de Pensiones (tabla afp_tasas).
  // Si esa tabla está vacía se cae a _PL_AFP_RATES, que es la lista del código:
  // así el cálculo no cambia mientras el usuario no cargue la suya.
  const afpType=p.afp||'SNP';
  const _tasa=(typeof afpTasaDe==='function')?afpTasaDe(afpType):null;
  const _esOnp=_tasa?!!+_tasa.esOnp:(afpType==='SNP'||afpType==='ONP');
  let snp=0,obligAfp=0,primaAfp=0,sobreAfp=0,totalPensiones=0;
  if(_tasa){
    if(_esOnp){
      snp=r2(baseLeySociales*(+_tasa.oblig||0));
      totalPensiones=snp;
    }else{
      obligAfp =r2(baseLeySociales*(+_tasa.oblig||0));
      primaAfp =r2(baseLeySociales*(+_tasa.prima||0));
      sobreAfp =r2(baseLeySociales*(+_tasa.comision||0));
      totalPensiones=r2(obligAfp+primaAfp+sobreAfp);
    }
  }else if(_esOnp){
    snp=r2(baseLeySociales*0.13);
    totalPensiones=snp;
  }else{
    const rt=_PL_AFP_RATES[afpType];
    if(!rt){
      // Régimen sin tasa: no se inventa nada. Se aplica solo el aporte
      // obligatorio (10 %, igual para todas) y se avisa al usuario.
      _plAfpDesconocidas.add(afpType);
      obligAfp=r2(baseLeySociales*0.10);
      totalPensiones=obligAfp;
    }else{
      obligAfp =r2(baseLeySociales*rt.oblig);
      primaAfp =r2(baseLeySociales*rt.prima);
      sobreAfp =r2(baseLeySociales*rt.comision);
      totalPensiones=r2(obligAfp+primaAfp+sobreAfp);
    }
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

  // Neto — aquí sí se suma la movilidad, después de calcular aportes y descuentos
  const neto=r2(subtotal2+vacaciones+bono+totalGratif+totalGratifTrunca+heAdicional+movilidad-totalDeduccion);

  // Aportes empleador
  const essalud      =r2(baseLeySociales*0.09);
  const aporteAfpEmpl=!_esOnp?r2(baseLeySociales*0.12):0;
  const sctrPenSup   =det?.sctrPenSup  ||0;
  const sctrPenMina  =det?.sctrPenMina ||0;
  const segVidaEmpl  =det?.segVidaEmpl ||0;
  const segVidaLey   =det?.segVidaLey  ||0;
  const sctrSalud    =det?.sctrSalud   ||0;
  const totalAportaciones=r2(essalud+aporteAfpEmpl+sctrPenSup+sctrPenMina+segVidaEmpl+segVidaLey+sctrSalud);

  return{
    diasTD,diasA5,diasTN,diasDLT,diasDL,diasDM,diasF,otrosDias,diasSubTotal,diasTotal,
    jornal,jHora,he25,he35,he100,impHE25,impHE35,impHE100,
    asigFam,movilidad,reintegro,bAltura,bCv,bCvCalc,bNocturnas,refrigerio,licSindical,
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
// ── Formato de celdas ──
const _plS =n=>(n&&n!==0)?'S/ '+Number(n).toLocaleString('es-PE',{minimumFractionDigits:2,maximumFractionDigits:2}):'';
const _plHs=(n,cls='')=>n?`<td class="tr mono ${cls}" style="padding:2px 5px">${_plS(n)}</td>`:`<td style="padding:2px 5px;opacity:.25;text-align:right">—</td>`;
const _plHd=n=>n?`<td class="tc mono" style="padding:2px 4px">${n}</td>`:`<td style="padding:2px 4px;opacity:.25;text-align:center">0</td>`;
const _plVacio='<td style="padding:2px 5px;opacity:.2;text-align:right">—</td>';

// ── Grupos del encabezado ──
const PL_GRUPOS={
  datos :{l:'DATOS',              bg:'#1e3a8a'},
  he    :{l:'HORAS EXTRAS',       bg:'#1d4ed8'},
  remun :{l:'REMUNERACIONES',     bg:'#2563eb'},
  dias  :{l:'DÍAS',               bg:'rgba(180,83,9,.7)'},
  tarea :{l:'TAREA / DL / DM / LIC.',bg:'#374151'},
  bonif :{l:'BONIFICACIONES',     bg:'#374151'},
  sub2  :{l:'SUB TOTAL 2',        bg:'#044e64'},
  gratif:{l:'GRATIFICACIONES',    bg:'#374151'},
  bases :{l:'AFECTOS BASE',       bg:'#1e3a8a'},
  ded   :{l:'DEDUCCIONES',        bg:'#1f2937'},
  neto  :{l:'NETO / PAGO',        bg:'#065f46'},
  aport :{l:'APORTES EMPLEADOR',  bg:'#1e3a8a'},
  acc   :{l:'',                   bg:'#111827'}
};

// ── Definición de las 75 columnas ──
// k = clave · g = grupo · l = rótulo · th = estilo extra del encabezado
// c = función que devuelve el <td> · tot = acumulador que se totaliza al pie
const PL_COLS=[
  {k:'n',    g:'datos',l:'#',        fx:1,c:(c,p,i)=>`<td style="padding:2px 5px;font-size:.68rem;color:var(--muted2);text-align:center">${i+1}</td>`},
  {k:'dni',  g:'datos',l:'DNI',      fx:1,c:(c,p)=>`<td class="mono" style="padding:2px 5px;font-size:.68rem">${p.dni||''}</td>`},
  {k:'nom',  g:'datos',l:'Apellidos y Nombres',fx:1,c:(c,p)=>`<td style="padding:2px 6px;min-width:150px"><strong style="font-size:.72rem">${p.ape}, ${p.nom}</strong></td>`},
  {k:'cargo',g:'datos',l:'Cargo',    c:(c,p)=>`<td style="padding:2px 5px;font-size:.65rem;color:var(--muted2);min-width:90px">${p.cargo||'—'}</td>`},
  {k:'ing',  g:'datos',l:'F.Ingreso',c:(c,p)=>`<td class="mono" style="padding:2px 5px;font-size:.62rem">${p.ing||'—'}</td>`},
  {k:'cat',  g:'datos',l:'Categoría',c:(c,p)=>`<td style="padding:2px 5px;font-size:.62rem">${p.cat||'—'}</td>`},
  {k:'afp',  g:'datos',l:'AFP/SNP',  c:(c,p,i,x)=>`<td style="padding:2px 5px;text-align:center">${x.afpBadge}</td>`},
  {k:'mes',  g:'datos',l:'Mes',      c:(c,p,i,x)=>`<td style="padding:2px 5px;font-size:.62rem;text-align:center">${x.mes}</td>`},

  {k:'he25', g:'he',l:'HE 25%', c:c=>_plHd(c.he25)},
  {k:'he35', g:'he',l:'HE 35%', c:c=>_plHd(c.he35)},
  {k:'he100',g:'he',l:'HE 100%',c:c=>_plHd(c.he100)},

  {k:'jornal',   g:'remun',l:'Jornal Básico',c:c=>_plHs(c.jornal)},
  {k:'impHE100', g:'remun',l:'Imp.HE100%',   c:c=>_plHs(c.impHE100)},
  {k:'impHE25',  g:'remun',l:'Imp.HE25%',    c:c=>_plHs(c.impHE25)},
  {k:'impHE35',  g:'remun',l:'Imp.HE35%',    c:c=>_plHs(c.impHE35)},
  {k:'reintegro',g:'remun',l:'Reintegro',    c:c=>_plHs(c.reintegro)},
  {k:'asigFam',  g:'remun',l:'Asig.Fam.',    c:c=>_plHs(c.asigFam)},

  {k:'diasSub',  g:'dias',l:'Días SubTot.',th:'background:rgba(245,158,11,.2);color:#f59e0b',c:c=>`<td class="tc mono" style="padding:2px 4px;font-weight:700;background:rgba(245,158,11,.18);color:#f59e0b">${c.diasSubTotal||0}</td>`},
  {k:'cierre',   g:'dias',l:'Cierre',c:c=>{
    if(!c._cerrada&&!c._sinFoto)return'<td style="padding:2px 4px"></td>';
    if(c._sinFoto)return'<td class="tc" style="padding:2px 4px" title="Entró después del cierre: esta fila no está en la foto guardada"><span style="font-size:.55rem;font-weight:800;color:#ef4444;border:1px solid #ef444455;border-radius:3px;padding:0 3px">FUERA</span></td>';
    if(c._recalcEn)return'<td class="tc" style="padding:2px 4px" title="Recalculada después del cierre: '+String(c._recalcEn)+'"><span style="font-size:.55rem;font-weight:800;color:#f97316;border:1px solid #f9731655;border-radius:3px;padding:0 3px">RECALC.</span></td>';
    return'<td class="tc" style="padding:2px 4px" title="Guardada en el cierre"><span style="font-size:.6rem;color:#fbbf24">🔒</span></td>';
  }},
  {k:'diasA5',   g:'dias',l:'Anexo 5',th:'color:#f97316',c:c=>`<td class="tc mono" style="padding:2px 4px;color:#f97316">${c.diasA5||0}</td>`},
  {k:'otrosDias',g:'dias',l:'Otros Días',c:c=>`<td class="tc mono" style="padding:2px 4px;background:rgba(245,158,11,.08)">${c.otrosDias||0}</td>`},
  {k:'faltas',   g:'dias',l:'Faltas',th:'color:#ef4444',c:c=>`<td class="tc mono" style="padding:2px 4px;color:#ef4444">${c.diasF||0}</td>`},
  {k:'diasTotal',g:'dias',l:'Días Total',th:'background:rgba(245,158,11,.2);color:#f59e0b',c:c=>`<td class="tc mono" style="padding:2px 4px;font-weight:700;background:rgba(245,158,11,.18)">${c.diasTotal||0}</td>`},

  {k:'tareaOrd',g:'tarea',l:'Tarea Ord.', c:c=>_plHs(c.tareaOrdinaria,'text-acc')},
  {k:'diasDL',  g:'tarea',l:'Días Lib.',  c:c=>_plHd(c.diasDL)},
  {k:'remunDL', g:'tarea',l:'Remun.DL',   c:c=>_plHs(c.remunDL)},
  {k:'totalDM', g:'tarea',l:'Total DM',   c:c=>_plHs(c.totalDM)},
  {k:'licPat',  g:'tarea',l:'Lic.Pat/Mat',c:c=>_plHs(c.totalLicPat)},
  {k:'licSind', g:'tarea',l:'Lic.Sind.',  c:c=>_plHs(c.licSindical)},

  {k:'movilidad', g:'bonif',l:'Movilidad',  c:c=>_plHs(c.movilidad)},
  {k:'bAltura',   g:'bonif',l:'B.Altura',   c:c=>_plHs(c.bAltura)},
  {k:'bCv',       g:'bonif',l:'B.CostoVida',c:c=>_plHs(c.bCv)},
  {k:'bNoct',     g:'bonif',l:'B.Noct.',    c:c=>_plHs(c.bNocturnas)},
  {k:'refrigerio',g:'bonif',l:'Refrigerio', c:c=>_plHs(c.refrigerio)},

  {k:'sub2',g:'sub2',l:'Sub Total 2',th:'background:rgba(4,78,100,.3);color:var(--mec)',tot:'sub2',
   c:c=>`<td class="tr mono" style="padding:2px 5px;font-weight:700;background:rgba(4,78,100,.15);color:var(--mec)">${_plS(c.subtotal2)}</td>`},

  {k:'vacaciones', g:'gratif',l:'Vacaciones',   c:c=>_plHs(c.vacaciones)},
  {k:'bono',       g:'gratif',l:'Bono',         c:c=>_plHs(c.bono)},
  {k:'gratif',     g:'gratif',l:'Gratif.',      c:c=>_plHs(c.gratificacion)},
  {k:'bonif9',     g:'gratif',l:'Bonif.9%',     c:c=>_plHs(c.bonif9)},
  {k:'totGratif',  g:'gratif',l:'Tot.Gratif.',  c:c=>_plHs(c.totalGratif)},
  {k:'gratifTr',   g:'gratif',l:'Gratif.Trunc.',c:c=>_plHs(c.gratifTrunca)},
  {k:'totGratifTr',g:'gratif',l:'Tot.G.Trunc.', c:c=>_plHs(c.totalGratifTrunca)},
  {k:'heAdic',     g:'gratif',l:'HE Adic.',     c:c=>_plHs(c.heAdicional)},

  {k:'baseRenta5',  g:'bases',l:'Base Renta5ta', c:c=>_plHs(c.baseRenta5)},
  {k:'baseSctr',    g:'bases',l:'Base SCTR',     c:c=>_plHs(c.baseSctr)},
  {k:'baseVidaLey', g:'bases',l:'Base V.Ley',    c:c=>_plHs(c.baseVidaLey)},
  {k:'baseLeyes',   g:'bases',l:'Base LeyesSoc.',c:c=>_plHs(c.baseLeySociales)},

  {k:'snp',      g:'ded',l:'SNP 13%',   th:'color:#ef4444',c:c=>c.afpType==='SNP'?_plHs(c.snp,'text-red'):_plVacio},
  {k:'obligAfp', g:'ded',l:'Oblig.AFP', th:'color:#ef4444',c:c=>c.afpType!=='SNP'?_plHs(c.obligAfp,'text-red'):_plVacio},
  {k:'primaAfp', g:'ded',l:'Prima AFP', th:'color:#ef4444',c:c=>c.afpType!=='SNP'?_plHs(c.primaAfp,'text-red'):_plVacio},
  {k:'sobreAfp', g:'ded',l:'SobreFlujo',th:'color:#ef4444',c:c=>c.afpType!=='SNP'?_plHs(c.sobreAfp,'text-red'):_plVacio},
  {k:'totPens',  g:'ded',l:'Tot.Pensiones',th:'color:#ef4444;font-weight:800',c:c=>`<td class="tr mono" style="padding:2px 5px;font-weight:700;color:#ef4444">${_plS(c.totalPensiones)}</td>`},
  {k:'tipo',     g:'ded',l:'Tipo',  c:(c,p,i,x)=>`<td style="padding:2px 5px;text-align:center">${x.afpBadge}</td>`},
  {k:'cuspp',    g:'ded',l:'CUSPP', c:c=>`<td class="mono" style="padding:2px 5px;font-size:.62rem">${c.cuspp||'—'}</td>`},
  {k:'ley29741', g:'ded',l:'Ley29741',   th:'color:#ef4444',c:c=>_plHs(c.fondoMina,'text-red')},
  {k:'masVida',  g:'ded',l:'MásVida',    th:'color:#ef4444',c:c=>_plHs(c.masVida,'text-red')},
  {k:'adelantos',g:'ded',l:'Adelantos',  th:'color:#ef4444',c:c=>_plHs(c.adelanto,'text-red')},
  {k:'vacDesc',  g:'ded',l:'Vacac.',     th:'color:#ef4444',c:c=>_plHs(c.vacDesc,'text-red')},
  {k:'cts',      g:'ded',l:'CTS',        th:'color:#ef4444',c:c=>_plHs(c.cts,'text-red')},
  {k:'sindicato',g:'ded',l:'Sindicato',  th:'color:#ef4444',c:c=>_plHs(c.sindicato,'text-red')},
  {k:'rimac',    g:'ded',l:'RIMAC',      th:'color:#ef4444',c:c=>_plHs(c.rimac,'text-red')},
  {k:'otrosDesc',g:'ded',l:'Otros',      th:'color:#ef4444',c:c=>_plHs(c.otrosDesc,'text-red')},
  {k:'retJud',   g:'ded',l:'Ret.Judicial',th:'color:#ef4444',c:c=>_plHs(c.retJudicial,'text-red')},
  {k:'quinta',   g:'ded',l:'5ta Cat.',   th:'color:#ef4444',c:c=>_plHs(c.quintaCat,'text-red')},
  {k:'totDed',   g:'ded',l:'TOTAL DED.', th:'color:#ef4444;font-weight:800',tot:'ded',
   c:c=>`<td class="tr mono" style="padding:2px 5px;font-weight:700;color:#ef4444;background:rgba(239,68,68,.08)">${_plS(c.totalDeduccion)}</td>`},

  {k:'neto',  g:'neto',l:'NETO A PAGAR',th:'background:rgba(16,185,129,.2);color:#10b981;font-weight:800',tot:'neto',
   c:c=>`<td class="tr mono" style="padding:2px 7px;font-size:.8rem;font-weight:800;color:#10b981;background:rgba(16,185,129,.1);min-width:90px">${_plS(c.neto)}</td>`},
  {k:'cuenta',g:'neto',l:'N° Cuenta',c:c=>`<td class="mono" style="padding:2px 5px;font-size:.65rem;min-width:165px">${c.cuenta||'—'}</td>`},
  {k:'banco', g:'neto',l:'Banco',    c:c=>`<td style="padding:2px 5px;font-size:.65rem;min-width:130px">${c.banco||'—'}</td>`},

  {k:'essalud',      g:'aport',l:'ESSALUD 9%',    tot:'ess',c:c=>_plHs(c.essalud)},
  {k:'aporteAfpEmpl',g:'aport',l:'Aport.AFP',     c:c=>_plHs(c.aporteAfpEmpl)},
  {k:'sctrPenSup',   g:'aport',l:'SCTR Pen.Sup.', c:c=>_plHs(c.sctrPenSup)},
  {k:'sctrPenMina',  g:'aport',l:'SCTR Pen.Mina', c:c=>_plHs(c.sctrPenMina)},
  {k:'segVidaEmpl',  g:'aport',l:'Seg.Vida Empl.',c:c=>_plHs(c.segVidaEmpl)},
  {k:'segVidaLey',   g:'aport',l:'S.Vida Obr.',   c:c=>_plHs(c.segVidaLey)},
  {k:'sctrSalud',    g:'aport',l:'SCTR Salud',    c:c=>_plHs(c.sctrSalud)},
  {k:'totAport',     g:'aport',l:'Tot.Aport.',th:'color:var(--mec);font-weight:800',tot:'aport',
   c:c=>`<td class="tr mono" style="padding:2px 5px;font-weight:700;color:var(--mec);background:rgba(4,78,100,.1)">${_plS(c.totalAportaciones)}</td>`},

  {k:'acc',g:'acc',l:'✏️',c:(c,p)=>`<td style="padding:2px 4px;text-align:center;white-space:nowrap"><button class="btn btn-sm" style="font-size:.62rem;padding:2px 6px;background:rgba(59,130,246,.15);border:1px solid #3b82f660;color:#3b82f6" onclick="openPlanillaDet(${p.id})">✏️</button>${c._cerrada?`<button class="btn btn-sm" title="Recalcular solo a este trabajador dentro del mes cerrado" style="font-size:.62rem;padding:2px 6px;margin-left:3px;background:rgba(249,115,22,.15);border:1px solid #f9731660;color:#f97316" onclick="plRecalcularUno(${p.id})">🔄</button>`:''}</td>`}
];

// ── Vistas: subconjuntos de columnas para no ver las 75 de golpe ──
const _PL_IDENT=['n','dni','nom','cargo'];
const PL_VISTAS=[
  {k:'resumen', l:'📋 Resumen',        cols:[..._PL_IDENT,'afp','diasTotal','sub2','totDed','neto','cuenta','banco']},
  {k:'dias',    l:'📅 Días y Horas',   cols:[..._PL_IDENT,'mes','cierre','diasSub','diasA5','otrosDias','faltas','diasTotal','diasDL','he25','he35','he100']},
  {k:'ingresos',l:'💰 Ingresos',       cols:[..._PL_IDENT,'jornal','impHE25','impHE35','impHE100','reintegro','asigFam','tareaOrd','remunDL','totalDM','licPat','licSind','movilidad','bAltura','bCv','bNoct','refrigerio','sub2']},
  {k:'gratif',  l:'🎁 Gratif. y Bases',cols:[..._PL_IDENT,'sub2','vacaciones','bono','gratif','bonif9','totGratif','gratifTr','totGratifTr','heAdic','baseRenta5','baseSctr','baseVidaLey','baseLeyes']},
  {k:'desc',    l:'➖ Descuentos',     cols:[..._PL_IDENT,'afp','cuspp','snp','obligAfp','primaAfp','sobreAfp','totPens','ley29741','masVida','adelantos','vacDesc','cts','sindicato','rimac','otrosDesc','retJud','quinta','totDed','neto']},
  {k:'aportes', l:'🏢 Aportes Empresa',cols:[..._PL_IDENT,'afp','essalud','aporteAfpEmpl','sctrPenSup','sctrPenMina','segVidaEmpl','segVidaLey','sctrSalud','totAport']},
  {k:'todo',    l:'📊 Todo',           cols:null}
];
let _plVista='resumen';

function _plColsVisibles(){
  const v=PL_VISTAS.find(x=>x.k===_plVista)||PL_VISTAS[0];
  if(!v.cols)return PL_COLS;
  const set=new Set([...v.cols,'acc']);
  return PL_COLS.filter(c=>set.has(c.k));
}
function plSetVista(k){
  _plVista=k;
  if(document.getElementById('planillaCard')?.style.display!=='none')genPlanilla();
  else _plRenderTabs();
}
function _plRenderTabs(){
  const el=document.getElementById('plVistas');if(!el)return;
  el.innerHTML=PL_VISTAS.map(v=>{
    const act=v.k===_plVista;
    return`<button onclick="plSetVista('${v.k}')" style="padding:.3rem .8rem;border-radius:7px;cursor:pointer;font-size:.75rem;font-weight:700;white-space:nowrap;border:1.5px solid ${act?'var(--adm)':'var(--border)'};background:${act?'rgba(59,130,246,.16)':'var(--panel2)'};color:${act?'var(--adm)':'var(--muted2)'}">${v.l}</button>`;
  }).join('')+`<span style="font-size:.68rem;color:var(--muted);margin-left:.3rem">${_plColsVisibles().length} de ${PL_COLS.length} columnas</span>`;
}

// Congela #, DNI y Nombre al desplazarse a la derecha
function _plFijarCols(){
  const tb=document.getElementById('tbPlanilla');if(!tb)return;
  const fx=PL_COLS.filter(c=>c.fx).map(c=>c.k);
  const vis=_plColsVisibles();
  const idx=fx.map(k=>vis.findIndex(c=>c.k===k)).filter(i=>i>=0);
  if(!idx.length)return;
  const head=tb.tHead;if(!head||!head.rows.length)return;
  // La fila de detalle es la última del thead; ahí están las celdas 1 a 1
  const filaDet=head.rows[head.rows.length-1];
  let left=0;
  const anchos=idx.map(i=>filaDet.cells[i]?filaDet.cells[i].offsetWidth:0);
  const offs=anchos.map((w,j)=>{const o=left;left+=w;return o;});
  const aplicar=(cells,base)=>idx.forEach((i,j)=>{
    const cel=cells[base+i];if(!cel)return;
    cel.classList.add('pl-fx');
    if(j===idx.length-1)cel.classList.add('pl-fx-end');
    cel.style.left=offs[j]+'px';
  });
  Array.from(head.rows).forEach(r=>aplicar(r.cells,0));
  if(tb.tBodies[0])Array.from(tb.tBodies[0].rows).forEach(r=>aplicar(r.cells,0));
  // El pie tiene una sola celda con colspan sobre las columnas fijas
  const pie=tb.tFoot&&tb.tFoot.rows[0];
  if(pie&&pie.cells[0]){pie.cells[0].classList.add('pl-fx','pl-fx-end');pie.cells[0].style.left='0px';}
}

// ── Generador principal ──
// soloTabla = true → no se vuelve a dibujar la barra de filtros, para que el
// buscador conserve el texto y el cursor mientras se escribe.
function genPlanilla(soloTabla){
  _plGenMes =+document.getElementById('plMes').value;
  _plGenAnio= document.getElementById('plAnio').value;
  const proyFiltro=document.getElementById('plProy')?.value||'';

  // Poblar selector de proyecto
  const ps=document.getElementById('plProy');
  if(ps){const cur=ps.value;ps.innerHTML='<option value="">— Todos —</option>'+(DB.proyectos||[]).map(p=>`<option value="${p.codigo}">[${p.codigo}] ${p.nombre}</option>`).join('');ps.value=cur;}

  const base=DB.personal.filter(p=>p.est==='Activo'&&(!proyFiltro||p.proy===proyFiltro));
  if(!base.length){toast('No hay trabajadores activos',true);return;}
  if(!soloTabla)_plRenderFiltros(base);
  const act=base.filter(_plPasa);
  _plAfpDesconocidas.clear();

  const th=`padding:4px 5px;font-size:.58rem;white-space:nowrap;text-align:center;border:1px solid rgba(255,255,255,.08);font-weight:700`;
  const cols=_plColsVisibles();
  const tot={sub2:0,ded:0,neto:0,ess:0,aport:0};

  // Mes cerrado: manda lo guardado. Si alguien entró al equipo después del
  // cierre no tiene foto, así que a ese sí se le calcula y se marca aparte.
  const _cerrado=typeof plMesCerrado==='function'&&plMesCerrado(_plGenMes,_plGenAnio);
  const rows=act.map((p,idx)=>{
    const det=DB.planillaMes.find(d=>d.personalId===p.id&&+d.mes===_plGenMes&&String(d.anio)===String(_plGenAnio));
    const _foto=_cerrado?plFilaCerrada(p.id,_plGenMes,_plGenAnio):null;
    const c=(_foto&&_foto.datos)?_foto.datos:_calcPlanRow(p,det);
    if(_cerrado){c._cerrada=!!_foto;c._recalcEn=_foto?_foto.recalcEn:null;c._sinFoto=!_foto;}
    tot.neto+=c.neto;tot.sub2+=c.subtotal2;tot.ded+=c.totalDeduccion;tot.ess+=c.essalud;tot.aport+=c.totalAportaciones;
    const afpBg=c.afpType==='SNP'?'#065f46':c.afpType==='Integra'?'#1e40af':c.afpType==='Profuturo'?'#7c3aed':c.afpType==='Habitat'?'#0e7490':c.afpType==='Prima'?'#b45309':'#7f1d1d';
    const ctx={afpBadge:`<span style="background:${afpBg};color:#fff;font-size:.57rem;font-weight:700;padding:1px 5px;border-radius:3px">${c.afpType}</span>`,
               mes:_PL_MESES[_plGenMes]};
    return`<tr style="border-bottom:1px solid var(--border)">${cols.map(col=>col.c(c,p,idx,ctx)).join('')}</tr>`;
  }).join('');

  // Encabezado agrupado: las columnas fijas van sueltas para poder congelarlas
  const nFx=cols.filter(c=>c.fx).length;
  const grupos=[];
  cols.forEach(c=>{
    if(c.fx)return;
    const g=grupos[grupos.length-1];
    if(g&&g.k===c.g)g.n++;else grupos.push({k:c.g,n:1});
  });
  const fxCols=cols.filter(c=>c.fx);
  document.getElementById('thPlanilla').innerHTML=`
  <tr>
    ${fxCols.map(()=>`<th style="${th};background:${PL_GRUPOS.datos.bg}"></th>`).join('')}
    ${grupos.map(g=>`<th colspan="${g.n}" style="${th};background:${PL_GRUPOS[g.k].bg};font-size:.65rem;letter-spacing:.04em">${PL_GRUPOS[g.k].l}</th>`).join('')}
  </tr>
  <tr style="background:#1e293b;color:#94a3b8">
    ${cols.map(c=>`<th style="${th}${c.th?';'+c.th:''}">${c.l}</th>`).join('')}
  </tr>`;

  // Con un filtro que no deja a nadie, la tabla vacía no dice nada: se avisa
  document.getElementById('tbPlanillaBody').innerHTML=rows||
    ('<tr><td colspan="'+cols.length+'" style="text-align:center;padding:2rem;color:var(--muted2);font-size:.8rem">'+
     'Ningún trabajador coincide con el filtro · <span onclick="_plLimpiarFiltros()" style="color:var(--adm);cursor:pointer;text-decoration:underline">limpiar filtros</span></td></tr>');

  // Totales: se emiten en las columnas visibles que tengan acumulador
  const Sf=n=>'S/ '+Number(n).toLocaleString('es-PE',{minimumFractionDigits:2});
  const colTot={sub2:'var(--mec)',ded:'#ef4444',neto:'#10b981',ess:'var(--muted2)',aport:'var(--mec)'};
  let saltados=0;
  const cellsTot=cols.map((c,i)=>{
    if(i<nFx){saltados++;return'';}                       // se cubren con el colspan del rótulo
    if(c.tot)return`<td class="tr mono" style="padding:5px;color:${colTot[c.tot]};${c.tot==='neto'?'font-size:.85rem':''}">${Sf(tot[c.tot])}</td>`;
    return'<td style="padding:5px"></td>';
  }).join('');
  document.getElementById('tfPlanilla').innerHTML=`<tr style="background:var(--panel2);font-weight:700;border-top:2px solid var(--mec)">
    <td colspan="${Math.max(1,nFx)}" style="padding:5px 8px;font-size:.7rem;color:var(--muted2);letter-spacing:.08em;white-space:nowrap">TOTALES · ${act.length} trab.</td>
    ${cellsTot}
  </tr>`;

  if(typeof plRenderCierre==='function')plRenderCierre();
  document.getElementById('planillaResumen').textContent=`${act.length} trabajadores · Neto total: ${Sf(tot.neto)}`;
  document.getElementById('planillaCard').style.display='block';
  _plRenderTabs();
  _plFijarCols();
  if(_plAfpDesconocidas.size){
    const lista=[..._plAfpDesconocidas].join(', ');
    toast('AFP sin tasa configurada: '+lista+' — solo se aplicó el 10% obligatorio',true);
    console.warn('[Planilla] AFP no registradas en _PL_AFP_RATES:',lista);
  }
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
  // Tab D — datos fijos de la ficha, no del mes
  const sf=(id,v)=>{const el=document.getElementById(id);if(el)el.value=(v==null?'':v);};
  sf('pdSue',p.sue||'');
  sf('pdAsig',p.asig?'1':'0');
  sf('pdMovilidad',p.movilidad||0);
  sf('pdAfp',p.afp||'');
  sf('pdCuspp',p.cuspp||'');
  sf('pdBanco',p.banco||'');
  sf('pdCuenta',p.cuenta||'');

  sv('pdReintegro',det?.reintegro);sv('pdBAltura',det?.bAltura);sv('pdBCv',det?.bCv);
  // Se muestra cuánto sale el cálculo, para que se vea qué se está anulando
  const _nCv=document.getElementById('pdBCvNota');
  const _iCv=document.getElementById('pdBCv');
  if(_nCv||_iCv){
    const _f=_calcPlanRow(p,det);
    const _calc=Number(_f.bCvCalc||0);
    const _manual=!!(det&&+det.bCv);
    // Sin importe manual el campo va VACÍO y el monto calculado se ve como
    // marca de agua: un "0" ahí hacía creer que la bonificación no se aplicaba.
    if(_iCv){
      if(!_manual){_iCv.value='';_iCv.placeholder=_calc.toFixed(2);}
      else _iCv.placeholder='automático';
    }
    if(_nCv)_nCv.innerHTML=_manual
      ? 'Anulando el cálculo automático de <b>S/ '+_calc.toFixed(2)+'</b> · vacíe el campo para volver a lo automático'
      : 'Se está pagando <b style="color:#10b981">S/ '+_calc.toFixed(2)+'</b> — '+(_f.diasTotal||0)+' días × '+_PL_CV_TASA+' · escriba aquí solo para anularlo';
  }
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

  // Tab D: lo que cambió en la ficha del trabajador va a DB.personal, no al mes.
  // Solo se guarda si algo cambió de verdad, para no reescribir la ficha en vano.
  const per=DB.personal.find(x=>x.id===_plDetPersonalId);
  const txt=id=>{const el=document.getElementById(id);return el?(el.value||'').trim():null;};
  if(per&&document.getElementById('pdSue')){
    const nuevo={
      sue:+g('pdSue')||0,
      asig:txt('pdAsig')==='1'?1:0,
      movilidad:+g('pdMovilidad')||0,
      afp:txt('pdAfp')||'',
      cuspp:txt('pdCuspp')||'',
      banco:txt('pdBanco')||'',
      cuenta:txt('pdCuenta')||''
    };
    const cambio=Object.keys(nuevo).some(k=>String(per[k]==null?'':per[k])!==String(nuevo[k]));
    if(cambio){
      Object.assign(per,nuevo);
      syncSheet('savePersonal',per);
    }
  }

  closeM('mPlanillaDet');
  genPlanilla();
  toast('Datos mensuales guardados');
}

function printPlanilla(){
  toast('Función PDF de planilla próximamente');
}

// ══ FILTROS DE LA PLANILLA ══════════════════════════════════════════════════
// Chips en cascada Tipo → Cargo, como el dashboard de Combustible, más un
// buscador. Toda la barra se pliega para no comerse la pantalla.
//
// El buscador NO se vuelve a dibujar mientras se escribe: al teclear solo se
// rehace el cuerpo de la tabla (genPlanilla en modo "solo tabla"), así el input
// nunca se destruye y no se pierden ni el texto ni el cursor.
let _plFiltTipo=null, _plFiltCargo=null, _plBuscar='';
let _plFiltOpen=localStorage.getItem('_plFiltOpen')!=='0';

const _plNorm=s=>String(s||'').toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/\s+/g,' ').trim();
const _plTipoDe =p=>(p.tipo ||'Sin tipo').trim()||'Sin tipo';
const _plCargoDe=p=>(p.cargo||'Sin cargo').trim()||'Sin cargo';

function _plFiltToggle(){
  _plFiltOpen=!_plFiltOpen;
  localStorage.setItem('_plFiltOpen',_plFiltOpen?'1':'0');
  genPlanilla();
}
function _plSetTipo(t){
  _plFiltTipo=(_plFiltTipo===t)?null:t;
  _plFiltCargo=null;                       // el cargo depende del tipo
  genPlanilla();
}
function _plSetCargo(c){
  _plFiltCargo=(_plFiltCargo===c)?null:c;
  genPlanilla();
}
function _plLimpiarFiltros(){
  _plFiltTipo=null;_plFiltCargo=null;_plBuscar='';
  genPlanilla();
}
// Al teclear solo se rehace la tabla: la barra (y con ella el input) queda intacta
function _plSetBuscar(v){_plBuscar=v;genPlanilla(true);}

// ¿El trabajador pasa los filtros activos?
function _plPasa(p){
  if(_plFiltTipo &&_plTipoDe(p) !==_plFiltTipo )return false;
  if(_plFiltCargo&&_plCargoDe(p)!==_plFiltCargo)return false;
  if(_plBuscar){
    const q=_plNorm(_plBuscar);
    if(!q)return true;
    const txt=_plNorm(`${p.ape||''} ${p.nom||''} ${p.dni||''} ${_plCargoDe(p)} ${_plTipoDe(p)}`);
    // Todas las palabras tienen que aparecer: "juan peon" encuentra al peón Juan
    return q.split(' ').every(w=>txt.includes(w));
  }
  return true;
}

function _plRenderFiltros(base){
  const cont=document.getElementById('plFiltros');if(!cont)return;
  const AC='var(--adm)';

  // Conteos: los chips de Tipo miran toda la base; los de Cargo, el tipo elegido
  const porTipo={};
  base.forEach(p=>{const t=_plTipoDe(p);porTipo[t]=(porTipo[t]||0)+1;});
  const tipos=Object.keys(porTipo).sort((a,b)=>porTipo[b]-porTipo[a]||a.localeCompare(b,'es'));
  if(_plFiltTipo&&!porTipo[_plFiltTipo]){_plFiltTipo=null;_plFiltCargo=null;}

  const baseCargo=_plFiltTipo?base.filter(p=>_plTipoDe(p)===_plFiltTipo):base;
  const porCargo={};
  baseCargo.forEach(p=>{const c=_plCargoDe(p);porCargo[c]=(porCargo[c]||0)+1;});
  const cargos=Object.keys(porCargo).sort((a,b)=>porCargo[b]-porCargo[a]||a.localeCompare(b,'es'));
  if(_plFiltCargo&&!porCargo[_plFiltCargo])_plFiltCargo=null;

  const nFiltrados=base.filter(_plPasa).length;
  const hayFiltro=!!(_plFiltTipo||_plFiltCargo||_plBuscar);

  const chip=(txt,n,act,fn,col)=>`<button onclick="${fn}" style="display:inline-flex;align-items:center;gap:.3rem;padding:.22rem .6rem;border-radius:16px;cursor:pointer;font-size:.7rem;font-weight:700;white-space:nowrap;border:1.5px solid ${act?col:'var(--border)'};background:${act?col+'26':'var(--panel2)'};color:${act?col:'var(--text)'}">
    ${txt}<span style="font-family:monospace;font-size:.62rem;font-weight:900;color:${act?col:'var(--muted2)'}">${n}</span>${act?' ✕':''}</button>`;

  // Resumen de una línea cuando está plegado
  const resumen=hayFiltro
    ? [_plFiltTipo,_plFiltCargo,_plBuscar?`"${_plBuscar}"`:''].filter(Boolean).join(' · ')
    : 'sin filtros';

  cont.innerHTML=`
    <div style="display:flex;align-items:center;gap:.5rem;flex-wrap:wrap;padding:.35rem .8rem;border-bottom:${_plFiltOpen?'1px solid var(--border)':'none'}">
      <button onclick="_plFiltToggle()" title="${_plFiltOpen?'Plegar los filtros':'Desplegar los filtros'}"
        style="display:inline-flex;align-items:center;gap:.3rem;padding:.2rem .55rem;border-radius:6px;cursor:pointer;font-size:.7rem;font-weight:700;border:1px solid ${hayFiltro?AC:'var(--border)'};background:${hayFiltro?'rgba(59,130,246,.12)':'transparent'};color:${hayFiltro?AC:'var(--muted2)'}">
        <span style="display:inline-block;transform:rotate(${_plFiltOpen?'90':'0'}deg);transition:transform .15s">▸</span>
        🎚️ Filtros${hayFiltro?` <span style="font-family:monospace;font-size:.62rem">${nFiltrados}/${base.length}</span>`:''}
      </button>
      ${!_plFiltOpen?`<span style="font-size:.68rem;color:var(--muted2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${_plEsc(resumen)}</span>`:''}
      <div style="display:flex;align-items:center;gap:.3rem;margin-left:auto;background:var(--panel2);border:1px solid ${_plBuscar?AC:'var(--border)'};border-radius:7px;padding:.12rem .45rem">
        <span style="font-size:.72rem">🔍</span>
        <input id="plBuscar" value="${_plEsc(_plBuscar)}" placeholder="Nombre, DNI o cargo..."
          oninput="_plSetBuscar(this.value)" autocomplete="off"
          style="background:none;border:none;outline:none;color:var(--text);font-size:.72rem;width:190px;padding:.15rem 0">
        ${_plBuscar?`<span onclick="_plSetBuscar('');document.getElementById('plBuscar').focus()" title="Limpiar" style="cursor:pointer;color:#ef4444;font-size:.7rem;font-weight:700">✕</span>`:''}
      </div>
      ${hayFiltro?`<button onclick="_plLimpiarFiltros()" style="font-size:.66rem;padding:.2rem .5rem;border-radius:6px;border:1px solid var(--border);background:transparent;color:var(--muted2);cursor:pointer;white-space:nowrap">✕ Limpiar</button>`:''}
    </div>
    ${_plFiltOpen?`
    <div style="padding:.45rem .8rem;display:flex;flex-direction:column;gap:.35rem">
      <div style="display:flex;gap:.3rem;flex-wrap:wrap;align-items:center">
        <span style="font-size:.6rem;color:var(--muted2);text-transform:uppercase;letter-spacing:.07em;font-weight:700;min-width:44px">Tipo</span>
        ${chip('Todos',base.length,!_plFiltTipo,'_plSetTipo(null)','#06b6d4')}
        ${tipos.map(t=>chip(_plEsc(t),porTipo[t],_plFiltTipo===t,`_plSetTipo('${_plEsc(t).replace(/'/g,"\\'")}')`,'#3b82f6')).join('')}
      </div>
      <div style="display:flex;gap:.3rem;flex-wrap:wrap;align-items:center;padding-top:.3rem;border-top:1px dashed var(--border)">
        <span style="font-size:.6rem;color:var(--muted2);text-transform:uppercase;letter-spacing:.07em;font-weight:700;min-width:44px">Cargo</span>
        ${chip('Todos',baseCargo.length,!_plFiltCargo,'_plSetCargo(null)','#06b6d4')}
        ${cargos.map(c=>chip(_plEsc(c),porCargo[c],_plFiltCargo===c,`_plSetCargo('${_plEsc(c).replace(/'/g,"\\'")}')`,'#a78bfa')).join('')}
      </div>
    </div>`:''}`;
}
const _plEsc=s=>String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
