// ══════════════════════════════════════════════════════════════════════════
//  RENTA DE QUINTA CATEGORÍA
//  Retención mensual según el procedimiento del art. 40 del Reglamento de la
//  Ley del Impuesto a la Renta: se proyecta la renta anual, se descuentan
//  7 UIT, se aplica la escala progresiva y el impuesto se reparte en el año.
//  El resultado se puede volcar al campo "5ta Categoría" de la Planilla.
// ══════════════════════════════════════════════════════════════════════════

const R5_MESES=['','Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
// Escala progresiva acumulativa — los tramos están fijados por ley en UIT
const R5_TRAMOS=[
  {hasta: 5,tasa:0.08},
  {hasta:20,tasa:0.14},
  {hasta:35,tasa:0.17},
  {hasta:45,tasa:0.20},
  {hasta:Infinity,tasa:0.30}
];
// Divisor del art. 40: de cuántas cuotas se reparte el impuesto según el mes
const R5_DIVISOR={1:12,2:12,3:12,4:9,5:8,6:8,7:8,8:5,9:4,10:4,11:4,12:1};
// Meses cuyas retenciones ya se descuentan del impuesto proyectado
const R5_CORTE={1:0,2:0,3:0,4:3,5:4,6:4,7:4,8:7,9:8,10:8,11:8,12:11};
const R5_DEDUC_UIT=7;          // deducción fija de 7 UIT
const R5_BONIF_GRATIF=0.09;    // bonificación extraordinaria sobre gratificaciones

let _r5Mes=new Date().getMonth()+1, _r5Anio=String(new Date().getFullYear());
let _r5SoloAfectos=true, _r5DetId=null;

const _r5N=(n,d=2)=>Number(n||0).toLocaleString('es-PE',{minimumFractionDigits:d,maximumFractionDigits:d});
const _r5S=n=>'S/ '+_r5N(n);
const _r5r2=n=>Math.round(n*100)/100;
const _r5Esc=s=>String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
function _r5RO(){return isModuleReadOnly('renta5ta');}

// ── UIT del año ──
function _r5Uit(anio){
  const c=(DB.renta5taCfg||[]).find(x=>String(x.anio)===String(anio||_r5Anio));
  return c?+c.uit||0:0;
}
function _r5Cfg(anio){return (DB.renta5taCfg||[]).find(x=>String(x.anio)===String(anio||_r5Anio));}

// ── Escala progresiva ──
function _r5Impuesto(rentaNeta,uit){
  if(rentaNeta<=0||!uit)return{total:0,detalle:[]};
  let resto=rentaNeta,prev=0,total=0;
  const detalle=[];
  for(const t of R5_TRAMOS){
    const techo=t.hasta===Infinity?Infinity:t.hasta*uit;
    const tramo=Math.max(0,Math.min(resto,techo-prev));
    if(tramo>0){
      const imp=tramo*t.tasa;
      total+=imp;
      detalle.push({desde:prev,hasta:techo,tasa:t.tasa,base:tramo,imp});
      resto-=tramo;
    }
    prev=techo;
    if(resto<=0)break;
  }
  return{total:_r5r2(total),detalle};
}

// ── Retenciones ya registradas de meses anteriores del mismo año ──
function _r5RetAcum(personalId,anio,mes){
  const corte=R5_CORTE[mes]||0;
  if(!corte)return 0;
  return (DB.renta5ta||[])
    .filter(r=>+r.personalId===+personalId&&String(r.anio)===String(anio)&&+r.mes<=corte)
    .reduce((s,r)=>s+(+r.retencion||0),0);
}
function _r5RegPrevio(personalId,anio){
  const r=(DB.renta5ta||[]).filter(x=>+x.personalId===+personalId&&String(x.anio)===String(anio))
    .sort((a,b)=>+b.mes-+a.mes)[0];
  return r?+r.retenidoPrevio||0:0;
}

// ── Cálculo de un trabajador ──
function _r5Calc(p,mes,anio,otrosIng,retenidoPrevio){
  const uit=_r5Uit(anio);
  const remMes=+p.sue||0;
  const asig=p.asig?113:0;                       // la asignación familiar es renta de quinta
  const base=remMes+asig;
  const mesesRest=12-mes+1;                      // incluye el mes que se calcula
  const proyeccion=_r5r2(base*mesesRest);
  const percibido=_r5r2(base*(mes-1));           // enero hasta el mes anterior
  const gratif=_r5r2(base*2*(1+R5_BONIF_GRATIF)); // julio y diciembre + bonif. extraordinaria
  const otros=+otrosIng||0;
  const rentaBruta=_r5r2(proyeccion+percibido+gratif+otros);
  const deduccion=_r5r2(R5_DEDUC_UIT*uit);
  const rentaNeta=Math.max(0,_r5r2(rentaBruta-deduccion));
  const imp=_r5Impuesto(rentaNeta,uit);
  const retPrevias=_r5RetAcum(p.id,anio,mes)+(+retenidoPrevio||0);
  const divisor=R5_DIVISOR[mes]||12;
  const saldo=Math.max(0,_r5r2(imp.total-retPrevias));
  const retencion=_r5r2(saldo/divisor);
  return{uit,remMes,asig,base,mesesRest,proyeccion,percibido,gratif,otros,rentaBruta,
    deduccion,rentaNeta,impAnual:imp.total,tramos:imp.detalle,
    retPrevias:_r5r2(retPrevias),divisor,saldo,retencion,afecto:imp.total>0};
}

// ── Personal afecto ──
function _r5Personal(){
  return (DB.personal||[]).filter(p=>(p.est||'Activo')==='Activo')
    .sort((a,b)=>`${a.ape} ${a.nom}`.localeCompare(`${b.ape} ${b.nom}`,'es'));
}
function _r5Reg(personalId,mes,anio){
  return (DB.renta5ta||[]).find(r=>+r.personalId===+personalId&&+r.mes===+mes&&String(r.anio)===String(anio));
}

// ── Acciones ──
function _r5Set(campo,v){
  if(campo==='mes')_r5Mes=+v;
  else if(campo==='anio')_r5Anio=v;
  else if(campo==='afectos')_r5SoloAfectos=v;
  rRenta5ta();
}
function _r5GuardarUit(){
  const v=+document.getElementById('r5Uit').value||0;
  if(!v){toast('Ingrese el valor de la UIT',true);return;}
  let c=_r5Cfg(_r5Anio);
  if(c){c.uit=v;syncSheet('saveRenta5taCfg',c);}
  else{c={id:nid('r5c'),anio:String(_r5Anio),uit:v};DB.renta5taCfg.push(c);syncSheet('saveRenta5taCfg',c);}
  toast('UIT '+_r5Anio+' guardada: S/ '+_r5N(v));
  rRenta5ta();
}
function _r5Calcular(){
  if(!_r5Uit()){toast('Primero configure la UIT del año '+_r5Anio,true);return;}
  const pers=_r5Personal();
  let n=0;
  pers.forEach(p=>{
    const reg=_r5Reg(p.id,_r5Mes,_r5Anio);
    const c=_r5Calc(p,_r5Mes,_r5Anio,reg?reg.otrosIng:0,reg?reg.retenidoPrevio:_r5RegPrevio(p.id,_r5Anio));
    const datos={personalId:p.id,anio:String(_r5Anio),mes:_r5Mes,
      remMes:c.base,mesesRest:c.mesesRest,proyeccion:c.proyeccion,percibido:c.percibido,
      gratif:c.gratif,otrosIng:c.otros,rentaBruta:c.rentaBruta,uit:c.uit,
      rentaNeta:c.rentaNeta,impAnual:c.impAnual,retAcum:c.retPrevias,divisor:c.divisor,
      retencion:c.retencion,retenidoPrevio:reg?(+reg.retenidoPrevio||0):_r5RegPrevio(p.id,_r5Anio)};
    if(reg){Object.assign(reg,datos);syncSheet('saveRenta5ta',reg);}
    else{const nuevo={id:nid('r5'),...datos};DB.renta5ta.push(nuevo);syncSheet('saveRenta5ta',nuevo);}
    if(c.afecto)n++;
  });
  toast(`✓ Calculado: ${n} trabajador${n===1?'':'es'} afecto${n===1?'':'s'} de ${pers.length}`);
  rRenta5ta();
}
function _r5AplicarPlanilla(){
  const regs=(DB.renta5ta||[]).filter(r=>+r.mes===+_r5Mes&&String(r.anio)===String(_r5Anio)&&(+r.retencion||0)>0);
  if(!regs.length){toast('No hay retenciones que aplicar',true);return;}
  if(!confirm(`Se escribirá la retención de ${regs.length} trabajador(es) en el campo "5ta Categoría" de la planilla de ${R5_MESES[_r5Mes]} ${_r5Anio}.\n\n¿Continuar?`))return;
  regs.forEach(r=>{
    let d=(DB.planillaMes||[]).find(x=>+x.personalId===+r.personalId&&+x.mes===+_r5Mes&&String(x.anio)===String(_r5Anio));
    if(d){d.quintaCat=+r.retencion||0;syncSheet('savePlanillaMes',d);}
    else{
      d={id:nid('plm'),personalId:+r.personalId,mes:+_r5Mes,anio:String(_r5Anio),quintaCat:+r.retencion||0};
      DB.planillaMes.push(d);syncSheet('savePlanillaMes',d);
    }
  });
  toast('✓ '+regs.length+' retenciones aplicadas a la planilla');
}
function _r5EditOtros(personalId){
  const p=(DB.personal||[]).find(x=>x.id===personalId);if(!p)return;
  const reg=_r5Reg(personalId,_r5Mes,_r5Anio);
  const otros=prompt(`Otros ingresos afectos del año para ${p.ape}, ${p.nom}\n(utilidades, bonificaciones extraordinarias, etc.)`,reg?(+reg.otrosIng||0):0);
  if(otros===null)return;
  const prev=prompt('Retenciones ya efectuadas antes de usar el sistema (S/)\nDéjalo en 0 si el año se calculó completo aquí.',reg?(+reg.retenidoPrevio||0):0);
  if(prev===null)return;
  const c=_r5Calc(p,_r5Mes,_r5Anio,+otros||0,+prev||0);
  const datos={personalId,anio:String(_r5Anio),mes:_r5Mes,remMes:c.base,mesesRest:c.mesesRest,
    proyeccion:c.proyeccion,percibido:c.percibido,gratif:c.gratif,otrosIng:+otros||0,
    rentaBruta:c.rentaBruta,uit:c.uit,rentaNeta:c.rentaNeta,impAnual:c.impAnual,
    retAcum:c.retPrevias,divisor:c.divisor,retencion:c.retencion,retenidoPrevio:+prev||0};
  if(reg){Object.assign(reg,datos);syncSheet('saveRenta5ta',reg);}
  else{const nuevo={id:nid('r5'),...datos};DB.renta5ta.push(nuevo);syncSheet('saveRenta5ta',nuevo);}
  rRenta5ta();
}

// ── Detalle auditable ──
function _r5Detalle(personalId){
  const p=(DB.personal||[]).find(x=>x.id===personalId);if(!p)return;
  const reg=_r5Reg(personalId,_r5Mes,_r5Anio);
  const c=_r5Calc(p,_r5Mes,_r5Anio,reg?reg.otrosIng:0,reg?reg.retenidoPrevio:0);
  const fila=(l,v,neg,fuerte)=>`<tr${fuerte?' style="background:var(--panel2)"':''}>
    <td style="padding:.3rem .6rem;font-size:.78rem;${fuerte?'font-weight:700':''}">${l}</td>
    <td style="padding:.3rem .6rem;text-align:right;font-family:monospace;font-size:.8rem;${fuerte?'font-weight:800;':''}color:${neg?'#ef4444':'var(--text)'}">${neg?'− ':''}${_r5S(v)}</td></tr>`;
  document.getElementById('r5DetTtl').textContent=`${p.ape}, ${p.nom}`;
  document.getElementById('r5DetSub').textContent=`${R5_MESES[_r5Mes]} ${_r5Anio} · UIT S/ ${_r5N(c.uit)} · ${p.cargo||''}`;
  document.getElementById('r5DetBody').innerHTML=`
    <table style="width:100%;border-collapse:collapse">
      <tbody>
        ${fila(`Remuneración mensual + asignación familiar`,c.base)}
        ${fila(`Proyección: ${_r5S(c.base)} × ${c.mesesRest} meses que faltan`,c.proyeccion)}
        ${fila(`Ya percibido: ${_r5S(c.base)} × ${_r5Mes-1} meses transcurridos`,c.percibido)}
        ${fila(`Gratificaciones (2 × sueldo + ${(R5_BONIF_GRATIF*100).toFixed(0)}% bonif. extraordinaria)`,c.gratif)}
        ${c.otros?fila('Otros ingresos afectos',c.otros):''}
        ${fila('RENTA BRUTA ANUAL PROYECTADA',c.rentaBruta,false,1)}
        ${fila(`Deducción de ${R5_DEDUC_UIT} UIT`,c.deduccion,true)}
        ${fila('RENTA NETA IMPONIBLE',c.rentaNeta,false,1)}
      </tbody>
    </table>
    ${c.tramos.length?`<div style="font-size:.66rem;color:var(--muted2);font-weight:700;text-transform:uppercase;letter-spacing:.06em;margin:.9rem 0 .3rem">Escala progresiva</div>
    <table style="width:100%;border-collapse:collapse">
      <thead><tr style="background:var(--panel2)">
        <th style="padding:.25rem .5rem;font-size:.62rem;text-align:left">Tramo</th>
        <th style="padding:.25rem .5rem;font-size:.62rem;text-align:right">Base</th>
        <th style="padding:.25rem .5rem;font-size:.62rem;text-align:center">Tasa</th>
        <th style="padding:.25rem .5rem;font-size:.62rem;text-align:right">Impuesto</th>
      </tr></thead>
      <tbody>${c.tramos.map(t=>`<tr style="border-bottom:1px solid var(--border)">
        <td style="padding:.25rem .5rem;font-size:.72rem;color:var(--muted2)">${_r5S(t.desde)} — ${t.hasta===Infinity?'a más':_r5S(t.hasta)}</td>
        <td style="padding:.25rem .5rem;text-align:right;font-family:monospace;font-size:.74rem">${_r5N(t.base)}</td>
        <td style="padding:.25rem .5rem;text-align:center;font-weight:700;color:#f59e0b;font-size:.74rem">${(t.tasa*100).toFixed(0)}%</td>
        <td style="padding:.25rem .5rem;text-align:right;font-family:monospace;font-size:.76rem;font-weight:700">${_r5N(t.imp)}</td>
      </tr>`).join('')}</tbody>
    </table>`:'<div style="padding:.8rem;text-align:center;color:#10b981;font-size:.82rem">No supera las 7 UIT — no está afecto a renta de quinta.</div>'}
    <table style="width:100%;border-collapse:collapse;margin-top:.9rem">
      <tbody>
        ${fila('IMPUESTO ANUAL PROYECTADO',c.impAnual,false,1)}
        ${c.retPrevias?fila('Retenciones ya efectuadas en el año',c.retPrevias,true):''}
        ${fila('Saldo por retener',c.saldo)}
        ${fila(`Dividido entre ${c.divisor} ${c.divisor===1?'(diciembre: regularización)':'cuotas'}`,c.retencion,false,1)}
      </tbody>
    </table>
    <div style="margin-top:.8rem;padding:.6rem .8rem;background:rgba(59,130,246,.08);border:1px solid rgba(59,130,246,.25);border-radius:8px;font-size:.72rem;color:var(--muted2)">
      <strong style="color:#60a5fa">Retención de ${R5_MESES[_r5Mes]}: ${_r5S(c.retencion)}</strong><br>
      Procedimiento del art. 40 del Reglamento de la Ley del Impuesto a la Renta.
    </div>`;
  openM('mRenta5Det');
}

// ── Render ──
function rRenta5ta(){
  const cont=document.getElementById('r5Body');if(!cont)return;
  const uit=_r5Uit();
  const pers=_r5Personal();
  const RO=_r5RO();

  const filas=pers.map(p=>{
    const reg=_r5Reg(p.id,_r5Mes,_r5Anio);
    const c=_r5Calc(p,_r5Mes,_r5Anio,reg?reg.otrosIng:0,reg?reg.retenidoPrevio:0);
    return{p,c,reg};
  });
  const vis=_r5SoloAfectos?filas.filter(f=>f.c.afecto):filas;
  const afectos=filas.filter(f=>f.c.afecto);
  const totRet=afectos.reduce((s,f)=>s+f.c.retencion,0);
  const totImp=afectos.reduce((s,f)=>s+f.c.impAnual,0);
  const guardados=(DB.renta5ta||[]).filter(r=>+r.mes===+_r5Mes&&String(r.anio)===String(_r5Anio)).length;

  const anios=[...new Set([...(DB.renta5taCfg||[]).map(c=>String(c.anio)),String(new Date().getFullYear()),String(new Date().getFullYear()-1)])].sort().reverse();
  const inpS='background:var(--panel2);border:1px solid var(--border);border-radius:6px;padding:.28rem .55rem;color:var(--text);font-size:.8rem';
  const TH='background:var(--panel2);color:var(--muted2);font-size:.62rem;font-weight:700;text-transform:uppercase;letter-spacing:.05em;padding:5px 6px;white-space:nowrap';
  const TD='padding:3px 6px;border-bottom:1px solid var(--border);font-size:.75rem';

  const kpis=[
    {l:'UIT '+_r5Anio,v:uit?_r5S(uit):'sin configurar',c:uit?'#ca8a04':'#ef4444',ic:'📐',sub:uit?`7 UIT = ${_r5S(uit*7)}`:'configúrala abajo'},
    {l:'Afectos',v:afectos.length,c:'#f59e0b',ic:'👤',sub:`de ${pers.length} activos`},
    {l:'Retención del Mes',v:_r5S(totRet),c:'#ef4444',ic:'📑',sub:R5_MESES[_r5Mes]+' '+_r5Anio},
    {l:'Impuesto Anual Proy.',v:_r5S(totImp),c:'#8b5cf6',ic:'📊',sub:'total de la nómina'},
    {l:'Registros Guardados',v:guardados,c:'#10b981',ic:'💾',sub:guardados?'del mes en curso':'aún sin calcular'}
  ];

  cont.innerHTML=`
    <div class="kpi-row">${kpis.map(k=>`<div class="kpi" style="--kc:${k.c};flex:1;min-width:150px"><div style="display:flex;justify-content:space-between;align-items:flex-start"><span class="kpi-lbl">${k.l}</span><span style="font-size:1.15rem;line-height:1;opacity:.75">${k.ic}</span></div><div class="kpi-val" style="font-size:1.6rem">${k.v}</div><div class="kpi-sub">${k.sub}</div></div>`).join('')}</div>

    <div style="display:flex;align-items:center;gap:.5rem;flex-wrap:wrap;margin-bottom:.8rem;padding:.5rem .7rem;background:var(--panel2);border:1px solid var(--border);border-radius:8px">
      <span style="font-size:.62rem;color:var(--muted2);font-weight:700;text-transform:uppercase;letter-spacing:.07em">Mes</span>
      <select onchange="_r5Set('mes',this.value)" style="${inpS}">${R5_MESES.slice(1).map((m,i)=>`<option value="${i+1}"${i+1===_r5Mes?' selected':''}>${m}</option>`).join('')}</select>
      <span style="font-size:.62rem;color:var(--muted2);font-weight:700;text-transform:uppercase;letter-spacing:.07em">Año</span>
      <select onchange="_r5Set('anio',this.value)" style="${inpS}">${anios.map(a=>`<option value="${a}"${a===String(_r5Anio)?' selected':''}>${a}</option>`).join('')}</select>
      <span style="width:1px;height:18px;background:var(--border)"></span>
      <span style="font-size:.62rem;color:var(--muted2);font-weight:700;text-transform:uppercase;letter-spacing:.07em">UIT ${_r5Anio}</span>
      <input type="number" id="r5Uit" value="${uit||''}" placeholder="0.00" step="50" style="${inpS};width:110px;text-align:right">
      ${RO?'':`<button onclick="_r5GuardarUit()" style="background:#ca8a04;color:#fff;border:none;border-radius:6px;padding:.28rem .7rem;font-size:.74rem;font-weight:700;cursor:pointer">💾 Guardar UIT</button>`}
      <label style="display:inline-flex;align-items:center;gap:.3rem;font-size:.73rem;color:var(--muted2);cursor:pointer;margin-left:.3rem">
        <input type="checkbox" ${_r5SoloAfectos?'checked':''} onchange="_r5Set('afectos',this.checked)" style="width:auto;margin:0;cursor:pointer"> Solo afectos
      </label>
      ${RO?'':`<button onclick="_r5Calcular()" style="margin-left:auto;background:#7c3aed;color:#fff;border:none;border-radius:7px;padding:.32rem .9rem;font-size:.78rem;font-weight:700;cursor:pointer">⚙️ Calcular mes</button>
      <button onclick="_r5AplicarPlanilla()" style="background:#166534;color:#fff;border:none;border-radius:7px;padding:.32rem .9rem;font-size:.78rem;font-weight:700;cursor:pointer" title="Escribe la retención en el campo 5ta Categoría de la planilla">📥 Aplicar a Planilla</button>`}
      <button onclick="_r5Excel()" style="background:var(--panel);border:1px solid var(--border);border-radius:7px;padding:.32rem .8rem;font-size:.76rem;color:#10b981;font-weight:700;cursor:pointer">📊 Excel</button>
    </div>

    ${!uit?`<div style="padding:1rem;background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.3);border-radius:8px;font-size:.8rem;color:#fca5a5;margin-bottom:.8rem">⚠️ Falta configurar la <strong>UIT del año ${_r5Anio}</strong>. Sin ese valor no se puede calcular la deducción de 7 UIT ni los tramos.</div>`:''}

    <div class="card">
      <div class="card-head"><span class="card-title">Cálculo de Retención — ${R5_MESES[_r5Mes]} ${_r5Anio}</span>
        <span style="font-size:.7rem;color:var(--muted2)">divisor del mes: ${R5_DIVISOR[_r5Mes]===1?'regularización':R5_DIVISOR[_r5Mes]+' cuotas'}</span>
      </div>
      <div class="card-body" style="overflow-x:auto;padding:0">
        ${!vis.length?`<div style="padding:2.5rem;text-align:center;color:var(--muted)">${_r5SoloAfectos?'Ningún trabajador supera las 7 UIT proyectadas — nadie está afecto este mes.':'Sin trabajadores activos.'}</div>`
        :`<table style="border-collapse:collapse;min-width:100%">
          <thead><tr>
            <th style="${TH}">#</th><th style="${TH};text-align:left">Trabajador</th><th style="${TH}">DNI</th>
            <th style="${TH};text-align:right">Rem. Mensual</th><th style="${TH};text-align:right">Proyección Anual</th>
            <th style="${TH};text-align:right">− 7 UIT</th><th style="${TH};text-align:right">Renta Neta</th>
            <th style="${TH};text-align:right">Imp. Anual</th><th style="${TH};text-align:right">Ret. Previas</th>
            <th style="${TH};text-align:center">÷</th><th style="${TH};text-align:right">Retención Mes</th>
            <th style="${TH};text-align:center">Detalle</th>
          </tr></thead>
          <tbody>${vis.map((f,i)=>`<tr style="border-bottom:1px solid var(--border);${f.c.afecto?'':'opacity:.5'}">
            <td style="${TD};text-align:center;color:var(--muted2);font-size:.7rem">${i+1}</td>
            <td style="${TD};white-space:nowrap"><strong>${_r5Esc(f.p.ape)}, ${_r5Esc(f.p.nom)}</strong><div style="font-size:.64rem;color:var(--muted2)">${_r5Esc(f.p.cargo)||''}</div></td>
            <td style="${TD};text-align:center;font-family:monospace;font-size:.72rem;color:#22d3ee">${f.p.dni||'—'}</td>
            <td style="${TD};text-align:right;font-family:monospace">${_r5N(f.c.base)}</td>
            <td style="${TD};text-align:right;font-family:monospace">${_r5N(f.c.rentaBruta)}</td>
            <td style="${TD};text-align:right;font-family:monospace;color:#ef4444">${_r5N(f.c.deduccion)}</td>
            <td style="${TD};text-align:right;font-family:monospace;font-weight:700">${_r5N(f.c.rentaNeta)}</td>
            <td style="${TD};text-align:right;font-family:monospace;color:#8b5cf6;font-weight:700">${_r5N(f.c.impAnual)}</td>
            <td style="${TD};text-align:right;font-family:monospace;color:var(--muted2)">${f.c.retPrevias?_r5N(f.c.retPrevias):'—'}</td>
            <td style="${TD};text-align:center;font-size:.72rem;color:var(--muted2)">${f.c.divisor===1?'reg.':f.c.divisor}</td>
            <td style="${TD};text-align:right;font-family:monospace;font-weight:800;color:${f.c.retencion?'#ef4444':'var(--muted)'};font-size:.82rem">${f.c.retencion?_r5N(f.c.retencion):'—'}</td>
            <td style="${TD};text-align:center;white-space:nowrap">
              <button onclick="_r5Detalle(${f.p.id})" class="btn btn-sm" style="background:rgba(139,92,246,.15);border:1px solid #8b5cf660;color:#a78bfa;font-size:.64rem">🔍</button>
              ${RO?'':`<button onclick="_r5EditOtros(${f.p.id})" class="btn btn-sm" style="background:rgba(59,130,246,.15);border:1px solid #3b82f660;color:#60a5fa;font-size:.64rem" title="Otros ingresos / retenciones previas">✏️</button>`}
            </td>
          </tr>`).join('')}</tbody>
          <tfoot><tr style="background:rgba(4,78,100,.14);border-top:2px solid var(--border)">
            <td colspan="7" style="${TD};text-align:right;font-weight:800;font-size:.72rem;color:var(--muted2)">TOTALES · ${afectos.length} afectos</td>
            <td style="${TD};text-align:right;font-family:monospace;font-weight:800;color:#8b5cf6">${_r5N(totImp)}</td>
            <td colspan="2"></td>
            <td style="${TD};text-align:right;font-family:monospace;font-weight:900;color:#ef4444">${_r5N(totRet)}</td>
            <td></td>
          </tr></tfoot>
        </table>`}
      </div>
    </div>

    <div style="margin-top:.7rem;padding:.6rem .8rem;background:var(--panel2);border:1px solid var(--border);border-radius:8px;font-size:.72rem;color:var(--muted2);line-height:1.6">
      <strong style="color:var(--text)">Cómo se calcula</strong> — Proyección = remuneración × meses que faltan + lo ya percibido + 2 gratificaciones con su bonificación del ${(R5_BONIF_GRATIF*100).toFixed(0)}%.
      A eso se le restan ${R5_DEDUC_UIT} UIT y se aplica la escala progresiva (8% · 14% · 17% · 20% · 30%).
      El impuesto anual menos lo ya retenido se divide entre las cuotas que faltan según el mes (art. 40 del Reglamento).<br>
      <strong style="color:#f59e0b">Queda fuera del cálculo automático:</strong> trabajadores con más de un empleador (requiere declaración jurada) y la deducción adicional de 3 UIT por gastos, que se aplica en la regularización anual.
    </div>`;
}

// ── Excel ──
function _r5Excel(){
  const pers=_r5Personal();
  const filas=pers.map(p=>{
    const reg=_r5Reg(p.id,_r5Mes,_r5Anio);
    return{p,c:_r5Calc(p,_r5Mes,_r5Anio,reg?reg.otrosIng:0,reg?reg.retenidoPrevio:0)};
  }).filter(f=>!_r5SoloAfectos||f.c.afecto);
  if(!filas.length){toast('No hay datos que exportar',true);return;}
  const tit=`RENTA DE QUINTA CATEGORÍA · ${R5_MESES[_r5Mes]} ${_r5Anio} · UIT S/ ${_r5N(_r5Uit())}`;
  const head=['#','DNI','APELLIDOS Y NOMBRES','CARGO','REM. MENSUAL','MESES REST.','PROYECCIÓN','PERCIBIDO','GRATIFICACIONES','OTROS','RENTA BRUTA','DEDUCCIÓN 7 UIT','RENTA NETA','IMPUESTO ANUAL','RET. PREVIAS','DIVISOR','RETENCIÓN DEL MES'];
  const rows=filas.map((f,i)=>[i+1,f.p.dni||'',`${f.p.ape}, ${f.p.nom}`,f.p.cargo||'',
    f.c.base,f.c.mesesRest,f.c.proyeccion,f.c.percibido,f.c.gratif,f.c.otros,f.c.rentaBruta,
    f.c.deduccion,f.c.rentaNeta,f.c.impAnual,f.c.retPrevias,f.c.divisor,f.c.retencion]);
  const tot=['','','TOTALES','','','','','','','','','','',
    filas.reduce((s,f)=>s+f.c.impAnual,0),'','',filas.reduce((s,f)=>s+f.c.retencion,0)];
  const ws=XLSX.utils.aoa_to_sheet([[tit],[],head,...rows,[],tot]);
  ws['!merges']=[{s:{r:0,c:0},e:{r:0,c:head.length-1}}];
  ws['!cols']=[{wch:4},{wch:11},{wch:34},{wch:24},{wch:13},{wch:11},{wch:13},{wch:13},{wch:15},{wch:11},{wch:13},{wch:14},{wch:13},{wch:14},{wch:13},{wch:8},{wch:16}];
  const addr=(r,c)=>XLSX.utils.encode_cell({r,c});
  const t0=ws[addr(0,0)];
  if(t0)t0.s={fill:{patternType:'solid',fgColor:{rgb:'CA8A04'}},font:{bold:true,color:{rgb:'FFFFFF'},sz:11},alignment:{horizontal:'center',vertical:'center'}};
  head.forEach((_,c)=>{const h=ws[addr(2,c)];if(h)h.s={fill:{patternType:'solid',fgColor:{rgb:'1F4E79'}},font:{bold:true,color:{rgb:'FFFFFF'},sz:9},alignment:{horizontal:'center',vertical:'center',wrapText:true}};});
  const wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,ws,'Renta 5ta');
  XLSX.writeFile(wb,`Renta5ta_${_r5Anio}_${String(_r5Mes).padStart(2,'0')}.xlsx`);
  toast('✓ Excel descargado');
}
