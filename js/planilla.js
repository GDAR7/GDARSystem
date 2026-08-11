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

  {k:'acc',g:'acc',l:'✏️',c:(c,p)=>`<td style="padding:2px 4px;text-align:center"><button class="btn btn-sm" style="font-size:.62rem;padding:2px 6px;background:rgba(59,130,246,.15);border:1px solid #3b82f660;color:#3b82f6" onclick="openPlanillaDet(${p.id})">✏️</button></td>`}
];

// ── Vistas: subconjuntos de columnas para no ver las 75 de golpe ──
const _PL_IDENT=['n','dni','nom','cargo'];
const PL_VISTAS=[
  {k:'resumen', l:'📋 Resumen',        cols:[..._PL_IDENT,'afp','diasTotal','sub2','totDed','neto','cuenta','banco']},
  {k:'dias',    l:'📅 Días y Horas',   cols:[..._PL_IDENT,'mes','diasSub','otrosDias','faltas','diasTotal','diasDL','he25','he35','he100']},
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
function genPlanilla(){
  _plGenMes =+document.getElementById('plMes').value;
  _plGenAnio= document.getElementById('plAnio').value;
  const proyFiltro=document.getElementById('plProy')?.value||'';

  // Poblar selector de proyecto
  const ps=document.getElementById('plProy');
  if(ps){const cur=ps.value;ps.innerHTML='<option value="">— Todos —</option>'+(DB.proyectos||[]).map(p=>`<option value="${p.codigo}">[${p.codigo}] ${p.nombre}</option>`).join('');ps.value=cur;}

  const act=DB.personal.filter(p=>p.est==='Activo'&&(!proyFiltro||p.proy===proyFiltro));
  if(!act.length){toast('No hay trabajadores activos',true);return;}

  const th=`padding:4px 5px;font-size:.58rem;white-space:nowrap;text-align:center;border:1px solid rgba(255,255,255,.08);font-weight:700`;
  const cols=_plColsVisibles();
  const tot={sub2:0,ded:0,neto:0,ess:0,aport:0};

  const rows=act.map((p,idx)=>{
    const det=DB.planillaMes.find(d=>d.personalId===p.id&&+d.mes===_plGenMes&&String(d.anio)===String(_plGenAnio));
    const c=_calcPlanRow(p,det);
    tot.neto+=c.neto;tot.sub2+=c.subtotal2;tot.ded+=c.totalDeduccion;tot.ess+=c.essalud;tot.aport+=c.totalAportaciones;
    const afpBg=c.afpType==='SNP'?'#065f46':c.afpType==='Integra'?'#1e40af':c.afpType==='Profuturo'?'#7c3aed':'#b45309';
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

  document.getElementById('tbPlanillaBody').innerHTML=rows;

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

  document.getElementById('planillaResumen').textContent=`${act.length} trabajadores · Neto total: ${Sf(tot.neto)}`;
  document.getElementById('planillaCard').style.display='block';
  _plRenderTabs();
  _plFijarCols();
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
