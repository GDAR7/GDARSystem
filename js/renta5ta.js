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

// Formas de repartir el impuesto anual proyectado entre los meses
//  · art40     → divisor oficial del mes (lo que exige la SUNAT)
//  · prorrateo → impuesto ÷ 12, la misma cuota todo el año (trabajador continuo)
//  · saldo     → lo que falta ÷ meses que quedan, para nivelar a mitad de año
const R5_MODOS={
  art40:{lbl:'Art. 40 (legal)',ic:'⚖️',desc:'Divisor oficial del mes (12·9·8·5·4·regularización) descontando las retenciones de los meses de corte.'},
  prorrateo:{lbl:'Prorrateo 12 meses',ic:'📅',desc:'Impuesto anual ÷ 12: la misma cuota todos los meses. Para quien trabaja el año completo de forma continua.'},
  saldo:{lbl:'Saldo uniforme',ic:'🧮',desc:'(Impuesto anual − retenciones ya efectuadas) ÷ meses que faltan, incluido el que se calcula.'}
};

let _r5Mes=new Date().getMonth()+1, _r5Anio=String(new Date().getFullYear());
let _r5SoloAfectos=true, _r5DetId=null;
let _r5Buscar='';
let _r5Modo=(()=>{try{return localStorage.getItem('r5Modo')||'art40';}catch(e){return 'art40';}})();
if(!R5_MODOS[_r5Modo])_r5Modo='art40';

const _r5N=(n,d=2)=>Number(n||0).toLocaleString('es-PE',{minimumFractionDigits:d,maximumFractionDigits:d});
const _r5S=n=>'S/ '+_r5N(n);
const _r5r2=n=>Math.round(n*100)/100;
const _r5Esc=s=>String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
function _r5RO(){return isModuleReadOnly('renta5ta');}

// ── Buscador ───────────────────────────────────────────────────────────────
// Cada palabra escrita tiene que aparecer en algún lado del trabajador, sin
// importar el orden ni las tildes: "rossy alcoser" y "alcoser rossy" encuentran
// a la misma persona, y "volquete" lista a todos los de ese cargo.
const _r5NormB=s=>String(s==null?'':s).toLowerCase().normalize('NFD')
  .replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim();
function _r5Coincide(p,busq){
  const q=_r5NormB(busq===undefined?_r5Buscar:busq);
  if(!q)return true;
  const heno=_r5NormB([p.ape,p.nom,p.dni,p.cargo,p.cat,p.proy].filter(Boolean).join(' '));
  return q.split(' ').every(w=>heno.includes(w));
}
// Solo se redibuja la tabla. Si se volviera a pintar toda la pantalla el input
// se recrearía en cada tecla y el cursor saltaría fuera: por eso el buscador
// vive aparte del bloque que cambia.
function _r5SetBuscar(v){
  _r5Buscar=v;
  const t=document.getElementById('r5Tabla');
  if(t)t.innerHTML=_r5Tabla();
}
function _r5LimpiarBuscar(){
  _r5Buscar='';
  const i=document.getElementById('r5Buscar');
  if(i){i.value='';i.focus();}
  _r5SetBuscar('');
}

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
// En el procedimiento legal solo cuentan los meses de corte; al prorratear o
// nivelar interesa todo lo efectivamente retenido antes del mes que se calcula.
function _r5RetAcum(personalId,anio,mes,modo){
  const corte=(modo||_r5Modo)==='art40'?(R5_CORTE[mes]||0):mes-1;
  if(corte<=0)return 0;
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
function _r5Calc(p,mes,anio,otrosIng,retenidoPrevio,modo){
  const md=R5_MODOS[modo||_r5Modo]?(modo||_r5Modo):'art40';
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
  const retPrevias=_r5r2(_r5RetAcum(p.id,anio,mes,md)+(+retenidoPrevio||0));
  let divisor,saldo,retencion;
  if(md==='prorrateo'){
    // Cuota pareja: el impuesto del año se parte en 12 y no se ajusta por lo ya
    // retenido — la diferencia se ve en la regularización anual.
    divisor=12;
    saldo=imp.total;
    retencion=_r5r2(imp.total/12);
  }else if(md==='saldo'){
    divisor=Math.max(1,12-mes+1);
    saldo=Math.max(0,_r5r2(imp.total-retPrevias));
    retencion=_r5r2(saldo/divisor);
  }else{
    divisor=R5_DIVISOR[mes]||12;
    saldo=Math.max(0,_r5r2(imp.total-retPrevias));
    retencion=_r5r2(saldo/divisor);
  }
  return{uit,remMes,asig,base,mesesRest,proyeccion,percibido,gratif,otros,rentaBruta,
    deduccion,rentaNeta,impAnual:imp.total,tramos:imp.detalle,modo:md,
    retPrevias,divisor,saldo,retencion,afecto:imp.total>0};
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
  else if(campo==='modo'){_r5Modo=R5_MODOS[v]?v:'art40';try{localStorage.setItem('r5Modo',_r5Modo);}catch(e){}}
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

// Las tres últimas filas del detalle cambian con el modo: el reparto legal
// descuenta lo ya retenido, el prorrateo parte el impuesto en 12 sin tocarlo y
// el saldo uniforme reparte lo que falta entre los meses que quedan.
function _r5FilasCierre(c,fila){
  if(c.modo==='prorrateo'){
    return (c.retPrevias?fila('Ya retenido en el año (informativo — no altera la cuota)',c.retPrevias):'')
      +fila('Prorrateo del año: ÷ 12 cuotas iguales',c.retencion,false,1);
  }
  if(c.modo==='saldo'){
    return (c.retPrevias?fila('Retenciones ya efectuadas en el año',c.retPrevias,true):'')
      +fila('Saldo por retener',c.saldo)
      +fila(`Dividido entre ${c.divisor} ${c.divisor===1?'mes (último)':'meses que faltan'}`,c.retencion,false,1);
  }
  return (c.retPrevias?fila('Retenciones ya efectuadas en el año',c.retPrevias,true):'')
    +fila('Saldo por retener',c.saldo)
    +fila(`Dividido entre ${c.divisor} ${c.divisor===1?'(diciembre: regularización)':'cuotas'}`,c.retencion,false,1);
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
  document.getElementById('r5DetSub').textContent=`${R5_MESES[_r5Mes]} ${_r5Anio} · UIT S/ ${_r5N(c.uit)} · ${R5_MODOS[c.modo].lbl}${p.cargo?' · '+p.cargo:''}`;
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
        ${_r5FilasCierre(c,fila)}
      </tbody>
    </table>
    <div style="margin-top:.8rem;padding:.6rem .8rem;background:rgba(59,130,246,.08);border:1px solid rgba(59,130,246,.25);border-radius:8px;font-size:.72rem;color:var(--muted2)">
      <strong style="color:#60a5fa">Retención de ${R5_MESES[_r5Mes]}: ${_r5S(c.retencion)}</strong><br>
      ${R5_MODOS[c.modo].ic} ${R5_MODOS[c.modo].lbl} — ${R5_MODOS[c.modo].desc}
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
      <span style="width:1px;height:18px;background:var(--border)"></span>
      <span style="font-size:.62rem;color:var(--muted2);font-weight:700;text-transform:uppercase;letter-spacing:.07em" title="${R5_MODOS[_r5Modo].desc}">Reparto</span>
      <select onchange="_r5Set('modo',this.value)" title="${R5_MODOS[_r5Modo].desc}" style="${inpS}">${Object.keys(R5_MODOS).map(k=>`<option value="${k}"${k===_r5Modo?' selected':''}>${R5_MODOS[k].ic} ${R5_MODOS[k].lbl}</option>`).join('')}</select>
      ${RO?'':`<button onclick="_r5AbrirRet()" style="background:rgba(59,130,246,.15);border:1px solid #3b82f660;color:#60a5fa;border-radius:6px;padding:.28rem .7rem;font-size:.74rem;font-weight:700;cursor:pointer" title="Cargar las retenciones que ya se hicieron en los meses anteriores del año">🧾 Retenciones efectuadas</button>`}
      <label style="display:inline-flex;align-items:center;gap:.3rem;font-size:.73rem;color:var(--muted2);cursor:pointer;margin-left:.3rem">
        <input type="checkbox" ${_r5SoloAfectos?'checked':''} onchange="_r5Set('afectos',this.checked)" style="width:auto;margin:0;cursor:pointer"> Solo afectos
      </label>
      <span style="width:1px;height:18px;background:var(--border)"></span>
      <span style="position:relative;display:inline-flex;align-items:center">
        <span style="position:absolute;left:.45rem;font-size:.78rem;opacity:.6;pointer-events:none">🔍</span>
        <input id="r5Buscar" type="search" value="${_r5Esc(_r5Buscar)}" placeholder="Buscar nombre, DNI o cargo…"
          oninput="_r5SetBuscar(this.value)" onsearch="_r5SetBuscar(this.value)" autocomplete="off"
          style="${inpS};padding-left:1.7rem;width:230px">
        ${''}
      </span>
      <button onclick="_r5LimpiarBuscar()" title="Limpiar la búsqueda" style="background:none;border:1px solid var(--border);border-radius:6px;color:var(--muted2);cursor:pointer;font-size:.72rem;padding:.24rem .5rem">✕</button>
      ${RO?'':`<button onclick="_r5Calcular()" style="margin-left:auto;background:#7c3aed;color:#fff;border:none;border-radius:7px;padding:.32rem .9rem;font-size:.78rem;font-weight:700;cursor:pointer">⚙️ Calcular mes</button>
      <button onclick="_r5AplicarPlanilla()" style="background:#166534;color:#fff;border:none;border-radius:7px;padding:.32rem .9rem;font-size:.78rem;font-weight:700;cursor:pointer" title="Escribe la retención en el campo 5ta Categoría de la planilla">📥 Aplicar a Planilla</button>`}
      <button onclick="_r5Excel()" style="background:var(--panel);border:1px solid var(--border);border-radius:7px;padding:.32rem .8rem;font-size:.76rem;color:#10b981;font-weight:700;cursor:pointer">📊 Excel</button>
    </div>

    ${!uit?`<div style="padding:1rem;background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.3);border-radius:8px;font-size:.8rem;color:#fca5a5;margin-bottom:.8rem">⚠️ Falta configurar la <strong>UIT del año ${_r5Anio}</strong>. Sin ese valor no se puede calcular la deducción de 7 UIT ni los tramos.</div>`:''}

    <div id="r5Tabla">${_r5Tabla()}</div>

    <div style="margin-top:.7rem;padding:.6rem .8rem;background:var(--panel2);border:1px solid var(--border);border-radius:8px;font-size:.72rem;color:var(--muted2);line-height:1.6">
      <strong style="color:var(--text)">Cómo se calcula</strong> — Proyección = remuneración × meses que faltan + lo ya percibido + 2 gratificaciones con su bonificación del ${(R5_BONIF_GRATIF*100).toFixed(0)}%.
      A eso se le restan ${R5_DEDUC_UIT} UIT y se aplica la escala progresiva (8% · 14% · 17% · 20% · 30%).
      El impuesto anual menos lo ya retenido se divide entre las cuotas que faltan según el mes (art. 40 del Reglamento).<br>
      <strong style="color:#60a5fa">Reparto activo: ${R5_MODOS[_r5Modo].ic} ${R5_MODOS[_r5Modo].lbl}</strong> — ${R5_MODOS[_r5Modo].desc}
      Las retenciones ya hechas se cargan con <strong>🧾 Retenciones efectuadas</strong> (se pueden traer de la planilla) y se descuentan del impuesto proyectado.<br>
      <strong style="color:#f59e0b">Queda fuera del cálculo automático:</strong> trabajadores con más de un empleador (requiere declaración jurada) y la deducción adicional de 3 UIT por gastos, que se aplica en la regularización anual.
    </div>`;
}


// ── La tabla, aparte ───────────────────────────────────────────────────────
// Vive en su propia función porque es lo único que el buscador vuelve a pintar.
// Rehace el cálculo en vez de recibirlo hecho: es barato y así nunca queda
// desfasado respecto de lo que muestran los KPI de arriba.
function _r5Tabla(){
  const uit=_r5Uit();
  const RO=_r5RO();
  const TH='background:var(--panel2);color:var(--muted2);font-size:.62rem;font-weight:700;text-transform:uppercase;letter-spacing:.05em;padding:5px 6px;white-space:nowrap';
  const TD='padding:3px 6px;border-bottom:1px solid var(--border);font-size:.75rem';

  const filas=_r5Personal().map(p=>{
    const reg=_r5Reg(p.id,_r5Mes,_r5Anio);
    return{p,c:_r5Calc(p,_r5Mes,_r5Anio,reg?reg.otrosIng:0,reg?reg.retenidoPrevio:0),reg};
  });
  const porAfecto=_r5SoloAfectos?filas.filter(f=>f.c.afecto):filas;
  const vis=porAfecto.filter(f=>_r5Coincide(f.p));
  // Los totales del pie son de lo que se ve: con un filtro puesto sirven de
  // subtotal, y el rótulo aclara que no son los del mes completo.
  const afectos=vis.filter(f=>f.c.afecto);
  const totRet=afectos.reduce((s,f)=>s+f.c.retencion,0);
  const totImp=afectos.reduce((s,f)=>s+f.c.impAnual,0);
  const filtrando=!!_r5NormB(_r5Buscar);

  const vacio=filtrando
    ? 'Ningún trabajador coincide con <strong>'+_r5Esc(_r5Buscar)+'</strong>.'+(_r5SoloAfectos?' · puede estar entre los no afectos: destilde «Solo afectos».':'')
    : (_r5SoloAfectos?'Ningún trabajador supera las 7 UIT proyectadas — nadie está afecto este mes.':'Sin trabajadores activos.')
  ;

  return `
    <div class="card">
      <div class="card-head"><span class="card-title">Cálculo de Retención — ${R5_MESES[_r5Mes]} ${_r5Anio}</span>
        <span style="font-size:.7rem;color:var(--muted2)">${_r5BuscarNota()}${R5_MODOS[_r5Modo].ic} ${R5_MODOS[_r5Modo].lbl} · divisor: ${_r5DivisorTxt()}</span>
      </div>
      <div class="card-body" style="overflow-x:auto;padding:0">
        ${!vis.length?`<div style="padding:2.5rem;text-align:center;color:var(--muted)">${vacio}</div>`
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
            <td colspan="7" style="${TD};text-align:right;font-weight:800;font-size:.72rem;color:var(--muted2)">TOTALES · ${afectos.length} afecto${afectos.length===1?'':'s'}${filtrando?' · solo lo filtrado':''}</td>
            <td style="${TD};text-align:right;font-family:monospace;font-weight:800;color:#8b5cf6">${_r5N(totImp)}</td>
            <td colspan="2"></td>
            <td style="${TD};text-align:right;font-family:monospace;font-weight:900;color:#ef4444">${_r5N(totRet)}</td>
            <td></td>
          </tr></tfoot>
        </table>`}
      </div>
    </div>
`;
}

// Cómo queda repartido el impuesto con el modo activo, para el encabezado.
function _r5DivisorTxt(){
  if(_r5Modo==='prorrateo')return '12 cuotas iguales';
  if(_r5Modo==='saldo'){const n=12-_r5Mes+1;return n===1?'último mes':n+' meses que faltan';}
  return R5_DIVISOR[_r5Mes]===1?'regularización':R5_DIVISOR[_r5Mes]+' cuotas';
}

// Cuántos quedaron a la vista. Se pinta aparte del input para que escribir no
// vuelva a crear la caja de texto y el cursor no se escape.
function _r5BuscarNota(){
  if(!_r5NormB(_r5Buscar))return '';
  const filas=_r5Personal().map(p=>{
    const reg=_r5Reg(p.id,_r5Mes,_r5Anio);
    return{p,c:_r5Calc(p,_r5Mes,_r5Anio,reg?reg.otrosIng:0,reg?reg.retenidoPrevio:0)};
  });
  const base=_r5SoloAfectos?filas.filter(f=>f.c.afecto):filas;
  const n=base.filter(f=>_r5Coincide(f.p)).length;
  return `<b style="color:#22d3ee">${n}</b> de ${base.length} · `;
}

// ══════════════════════════════════════════════════════════════════════════
//  RETENCIONES YA EFECTUADAS
//  Grilla mes × trabajador con lo que realmente se le retuvo en los meses
//  anteriores del ejercicio. Se guarda en el campo "retencion" del registro de
//  cada mes — que es justo lo que _r5RetAcum suma para restarlo del impuesto
//  proyectado. Sirve para arrancar el sistema a mitad de año sin recalcular
//  enero-julio y para corregir lo que se retuvo de más o de menos.
// ══════════════════════════════════════════════════════════════════════════
let _r5RetBuf={};        // {"personalId|mes": monto} — lo tecleado aún sin guardar
let _r5RetBuscar='';

function _r5RetMeses(){return Array.from({length:Math.max(0,_r5Mes-1)},(_,i)=>i+1);}
// Lo tecleado manda sobre lo guardado; si no se tocó, lo que hay en la base.
function _r5RetVal(pid,mes){
  const k=pid+'|'+mes;
  if(_r5RetBuf[k]!==undefined)return +_r5RetBuf[k]||0;
  const r=_r5Reg(pid,mes,_r5Anio);
  return r?+r.retencion||0:0;
}
function _r5RetFila(pid){return _r5RetMeses().reduce((s,m)=>s+_r5RetVal(pid,m),0);}
function _r5RetPersonal(){return _r5Personal().filter(p=>_r5Coincide(p,_r5RetBuscar));}

function _r5AbrirRet(){
  if(_r5RO()){toast('Módulo en solo lectura',true);return;}
  _r5RetBuf={};_r5RetBuscar='';_r5RetImp=null;
  document.getElementById('r5RetSub').textContent=_r5Mes===1
    ? 'Enero '+_r5Anio+' no tiene meses anteriores del mismo ejercicio'
    : _r5Anio+' · Enero a '+R5_MESES[_r5Mes-1]+' — lo cargado aquí se descuenta del impuesto proyectado de '+R5_MESES[_r5Mes];
  const el=document.getElementById('r5RetBody');
  if(el)el.innerHTML=_r5RetHtml();
  openM('mRenta5Ret');
}
// Solo la grilla se vuelve a pintar al buscar: si se repintara todo, el input
// se recrearía en cada tecla y el cursor se escaparía.
function _r5RetRender(){const g=document.getElementById('r5RetGrid');if(g)g.innerHTML=_r5RetGrid();}
function _r5RetSetBuscar(v){_r5RetBuscar=v;_r5RetRender();}

function _r5RetIn(pid,mes,v){
  _r5RetBuf[pid+'|'+mes]=+v||0;
  const t=document.getElementById('r5rTot_'+pid);
  if(t)t.textContent=_r5N(_r5RetFila(pid));
  _r5RetPie();
}
// Totales del pie: se recalculan sobre lo visible, igual que la grilla.
function _r5RetPie(){
  const vis=_r5RetPersonal();
  let g=0;
  _r5RetMeses().forEach(m=>{
    const t=vis.reduce((s,p)=>s+_r5RetVal(p.id,m),0);g+=t;
    const c=document.getElementById('r5rTotM_'+m);if(c)c.textContent=_r5N(t);
  });
  const tg=document.getElementById('r5rTotG');if(tg)tg.textContent=_r5N(g);
}

// Las retenciones normalmente ya están escritas en la planilla de cada mes:
// traerlas de ahí evita volver a digitarlas. Solo rellena — guardar es aparte.
function _r5RetPlanilla(){
  const meses=_r5RetMeses();
  if(!meses.length){toast('Enero no tiene meses anteriores',true);return;}
  let n=0;
  _r5Personal().forEach(p=>{
    meses.forEach(m=>{
      const d=(DB.planillaMes||[]).find(x=>+x.personalId===+p.id&&+x.mes===+m&&String(x.anio)===String(_r5Anio));
      const v=d?_r5r2(+d.quintaCat||0):0;
      if(v>0&&Math.abs(v-_r5RetVal(p.id,m))>0.004){_r5RetBuf[p.id+'|'+m]=v;n++;}
    });
  });
  _r5RetRender();
  toast(n?n+' retención(es) traídas de la planilla — revisa y guarda':'La planilla no tiene 5ta categoría cargada en esos meses',!n);
}
function _r5RetLimpiar(){
  if(!confirm('Se pondrán en 0 todas las casillas visibles.\n\nNada se borra hasta que guardes.'))return;
  _r5RetPersonal().forEach(p=>_r5RetMeses().forEach(m=>{_r5RetBuf[p.id+'|'+m]=0;}));
  _r5RetRender();
}

function _r5GuardarRet(){
  if(_r5RO()){toast('Módulo en solo lectura',true);return;}
  const meses=_r5RetMeses();
  let n=0;
  Object.keys(_r5RetBuf).forEach(k=>{
    const pid=+k.split('|')[0],mes=+k.split('|')[1];
    if(meses.indexOf(mes)<0)return;
    const v=_r5r2(+_r5RetBuf[k]||0);
    const reg=_r5Reg(pid,mes,_r5Anio);
    const actual=reg?+reg.retencion||0:0;
    if(Math.abs(v-actual)<0.005)return;
    if(reg){reg.retencion=v;syncSheet('saveRenta5ta',reg);}
    else{
      // Mes que nunca se calculó aquí: se registra solo lo retenido, que es lo
      // único que el procedimiento necesita saber de los meses ya pasados.
      const p=(DB.personal||[]).find(x=>+x.id===+pid);
      const base=p?(+p.sue||0)+(p.asig?113:0):0;
      const nuevo={id:nid('r5'),personalId:pid,anio:String(_r5Anio),mes,remMes:base,
        otrosIng:0,impAnual:0,retAcum:0,divisor:R5_DIVISOR[mes]||12,retencion:v,retenidoPrevio:0};
      DB.renta5ta.push(nuevo);syncSheet('saveRenta5ta',nuevo);
    }
    n++;
  });
  if(!n){toast('No hay cambios que guardar',true);return;}
  _r5RetBuf={};
  toast('✓ '+n+' retención(es) registradas — el descuento ya está aplicado');
  closeM('mRenta5Ret');
  rRenta5ta();
}

function _r5RetHtml(){
  const inpS='background:var(--panel2);border:1px solid var(--border);border-radius:6px;padding:.28rem .55rem;color:var(--text);font-size:.8rem';
  if(!_r5RetMeses().length)return '<div style="padding:2rem;text-align:center;color:var(--muted)">En <strong>enero</strong> no hay meses anteriores del mismo ejercicio.<br>Si el trabajador viene de otro empleador o de otro sistema, carga el monto con el botón ✏️ de su fila.</div>';
  return `
    <div style="display:flex;align-items:center;gap:.5rem;flex-wrap:wrap;margin-bottom:.7rem">
      <span style="position:relative;display:inline-flex;align-items:center">
        <span style="position:absolute;left:.45rem;font-size:.78rem;opacity:.6;pointer-events:none">🔍</span>
        <input type="search" value="${_r5Esc(_r5RetBuscar)}" placeholder="Buscar nombre, DNI o cargo…"
          oninput="_r5RetSetBuscar(this.value)" onsearch="_r5RetSetBuscar(this.value)" autocomplete="off"
          style="${inpS};padding-left:1.7rem;width:250px">
      </span>
      <button onclick="_r5RetPlanilla()" style="background:rgba(22,101,52,.2);border:1px solid #16653480;color:#4ade80;border-radius:6px;padding:.28rem .7rem;font-size:.74rem;font-weight:700;cursor:pointer" title="Copia el campo 5ta Categoría de la planilla de cada mes">↙️ Traer de la planilla</button>
      <button onclick="_r5RetImportar()" style="background:rgba(139,92,246,.18);border:1px solid #8b5cf680;color:#a78bfa;border-radius:6px;padding:.28rem .7rem;font-size:.74rem;font-weight:700;cursor:pointer" title="Sube un Excel con las retenciones ya efectuadas; empareja por DNI">📥 Importar Excel</button>
      <button onclick="_r5RetPlantilla()" style="background:none;border:1px solid var(--border);color:#10b981;border-radius:6px;padding:.28rem .7rem;font-size:.74rem;font-weight:700;cursor:pointer" title="Descarga el cuadro en Excel para llenarlo y volver a subirlo">⬇️ Plantilla</button>
      <button onclick="_r5RetLimpiar()" style="background:none;border:1px solid var(--border);color:var(--muted2);border-radius:6px;padding:.28rem .7rem;font-size:.74rem;cursor:pointer">Poner en 0</button>
    </div>
    ${_r5RetImpHtml()}
    <div id="r5RetGrid">${_r5RetGrid()}</div>
    <div style="margin-top:.7rem;padding:.55rem .8rem;background:rgba(59,130,246,.08);border:1px solid rgba(59,130,246,.25);border-radius:8px;font-size:.71rem;color:var(--muted2);line-height:1.55">
      <span style="color:#f59e0b">Ojo:</span> si además cargaste un importe en «retenciones previas» con el botón ✏️, ese monto se suma a este cuadro — no lo repitas.
    </div>`;
}

function _r5RetGrid(){
  const meses=_r5RetMeses();
  const pers=_r5RetPersonal();
  const TH='background:var(--panel2);color:var(--muted2);font-size:.6rem;font-weight:700;text-transform:uppercase;letter-spacing:.05em;padding:5px 6px;white-space:nowrap';
  const TD='padding:2px 5px;border-bottom:1px solid var(--border);font-size:.74rem';
  const inp='background:var(--panel);border:1px solid var(--border);border-radius:5px;padding:.2rem .35rem;color:var(--text);font-size:.72rem;font-family:monospace;text-align:right;width:82px';
  if(!pers.length)return '<div style="padding:2rem;text-align:center;color:var(--muted)">Ningún trabajador coincide con <strong>'+_r5Esc(_r5RetBuscar)+'</strong>.</div>';
  const totM=m=>pers.reduce((s,p)=>s+_r5RetVal(p.id,m),0);
  const totG=pers.reduce((s,p)=>s+_r5RetFila(p.id),0);
  return `<div style="overflow:auto;max-height:52vh;border:1px solid var(--border);border-radius:8px">
    <table style="border-collapse:collapse;min-width:100%">
      <thead><tr>
        <th style="${TH};text-align:left;position:sticky;left:0;z-index:2">Trabajador</th>
        ${meses.map(m=>`<th style="${TH};text-align:right">${R5_MESES[m].slice(0,3)}</th>`).join('')}
        <th style="${TH};text-align:right;color:#f59e0b">Total ${_r5Anio}</th>
      </tr></thead>
      <tbody>${pers.map(p=>{
        const prev=_r5RegPrevio(p.id,_r5Anio);
        return `<tr style="border-bottom:1px solid var(--border)">
          <td style="${TD};white-space:nowrap;position:sticky;left:0;background:var(--panel);z-index:1">
            <strong>${_r5Esc(p.ape)}, ${_r5Esc(p.nom)}</strong>
            <div style="font-size:.62rem;color:var(--muted2)">${p.dni||'—'}${prev?' · previo cargado: '+_r5S(prev):''}</div>
          </td>
          ${meses.map(m=>`<td style="${TD};text-align:right"><input type="number" step="0.01" min="0" value="${_r5RetVal(p.id,m)||''}" placeholder="0.00" oninput="_r5RetIn(${p.id},${m},this.value)" style="${inp}"></td>`).join('')}
          <td style="${TD};text-align:right;font-family:monospace;font-weight:800;color:#f59e0b" id="r5rTot_${p.id}">${_r5N(_r5RetFila(p.id))}</td>
        </tr>`;}).join('')}</tbody>
      <tfoot><tr style="background:rgba(4,78,100,.14);border-top:2px solid var(--border)">
        <td style="${TD};text-align:right;font-weight:800;font-size:.7rem;color:var(--muted2);position:sticky;left:0;background:var(--panel2)">TOTALES · ${pers.length}</td>
        ${meses.map(m=>`<td style="${TD};text-align:right;font-family:monospace;font-weight:700;font-size:.7rem" id="r5rTotM_${m}">${_r5N(totM(m))}</td>`).join('')}
        <td style="${TD};text-align:right;font-family:monospace;font-weight:900;color:#f59e0b" id="r5rTotG">${_r5N(totG)}</td>
      </tr></tfoot>
    </table>
  </div>`;
}

// ── Importar las retenciones desde un Excel ────────────────────────────────
// El archivo puede venir de la contabilidad anterior o de otro sistema. Se
// empareja por DNI (a 8 dígitos, porque Excel se come el cero de la izquierda)
// y, si la fila no trae DNI, por nombre. Nunca crea trabajadores: lo que no
// empareja se lista en pantalla para revisarlo.
let _r5RetImp=null;   // resultado de la última importación, para mostrarlo

const _r5DniN=v=>{const d=String(v==null?'':v).replace(/\D/g,'');return d&&d.length<8?d.padStart(8,'0'):d;};
// Nombre en palabras ordenadas: "PEREZ LOPEZ, JUAN" y "JUAN PEREZ LOPEZ" son
// la misma persona sin depender del orden ni de la coma.
const _r5ClaveNom=s=>_r5NormB(s).split(' ').filter(Boolean).sort().join(' ');
// Número tolerante: acepta 1,234.56 · 1.234,56 · S/ 1 234,56
function _r5NumX(v){
  if(typeof v==='number')return isFinite(v)?v:0;
  let t=String(v==null?'':v).replace(/[^\d,.-]/g,'').trim();
  if(!t)return 0;
  const c=t.lastIndexOf(','),p=t.lastIndexOf('.');
  if(c>-1&&p>-1)t=c>p?t.replace(/\./g,'').replace(',','.'):t.replace(/,/g,'');
  else if(c>-1)t=(t.length-c-1)<=2?t.replace(',','.'):t.replace(/,/g,'');
  else if((t.match(/\./g)||[]).length>1)t=t.replace(/\.(?=.*\.)/g,'');
  const n=parseFloat(t);
  return isFinite(n)?n:0;
}
// Qué mes es una columna: acepta ENERO, ENE, 01, 1, "ENE-26", "RET ENERO"…
function _r5MesDeCol(txt){
  const t=_r5NormB(txt);
  if(!t)return 0;
  for(let m=1;m<=12;m++){
    const nom=_r5NormB(R5_MESES[m]);
    if(t===nom||t===nom.slice(0,3)||new RegExp('(^| )'+nom+'( |$|[-/ ])').test(t)||new RegExp('(^| )'+nom.slice(0,3)+'( |$|[-/])').test(t))return m;
    if(t===String(m)||t===String(m).padStart(2,'0'))return m;
  }
  return 0;
}
const _r5EsColDni=t=>{const n=_r5NormB(t);return n==='dni'||n==='doc'||/^(nro|n|numero|num)? ?(de )?(documento|dni)/.test(n)||/^dni ?(ce|c e)?$/.test(n)||n==='documento'||n==='documento de identidad';};
const _r5EsColNom=t=>{const n=_r5NormB(t);return /^(trabajador|apellidos|nombres|apellidos y nombres|nombre|nombre completo|personal|colaborador)/.test(n);};
const _r5EsColTot=t=>{const n=_r5NormB(t);return /^(total|acumulado|monto|importe)/.test(n)||/reten/.test(n);};

function _r5RetImportar(){
  if(_r5RO()){toast('Módulo en solo lectura',true);return;}
  let inp=document.getElementById('_r5RetFile');
  if(!inp){
    inp=document.createElement('input');
    inp.id='_r5RetFile';inp.type='file';inp.accept='.xlsx,.xls,.csv';inp.style.display='none';
    inp.addEventListener('change',_r5RetOnFile);
    document.body.appendChild(inp);
  }
  inp.value='';inp.click();
}

function _r5RetOnFile(ev){
  const file=ev.target.files&&ev.target.files[0];if(!file)return;
  const rd=new FileReader();
  rd.onload=e=>{
    try{_r5RetProcesar(new Uint8Array(e.target.result),file.name);}
    catch(err){console.warn('[Renta5ta import]',err);toast('No se pudo leer el archivo: '+err.message,true);}
  };
  rd.readAsArrayBuffer(file);
}

function _r5RetProcesar(buf,nombreArch){
  const wb=XLSX.read(buf,{type:'array'});
  const ws=wb.Sheets[wb.SheetNames[0]];
  if(!ws){toast('El archivo no tiene hojas',true);return;}
  const filas=XLSX.utils.sheet_to_json(ws,{header:1,raw:true,defval:''});
  if(!filas.length){toast('La hoja está vacía',true);return;}

  // ── Encabezado: la fila que más columnas reconocidas tenga ──
  let hdr=-1,cols=null,mejor=0;
  for(let i=0;i<Math.min(20,filas.length);i++){
    const f=filas[i]||[];
    const c={dni:-1,nom:-1,tot:-1,meses:{}};
    f.forEach((v,j)=>{
      if(c.dni<0&&_r5EsColDni(v)){c.dni=j;return;}
      const m=_r5MesDeCol(v);
      if(m&&c.meses[m]===undefined){c.meses[m]=j;return;}
      if(c.nom<0&&_r5EsColNom(v)){c.nom=j;return;}
      if(c.tot<0&&_r5EsColTot(v))c.tot=j;
    });
    const pts=(c.dni>=0?2:0)+(c.nom>=0?1:0)+Object.keys(c.meses).length+(c.tot>=0?1:0);
    if(pts>mejor&&(c.dni>=0||c.nom>=0)&&(Object.keys(c.meses).length||c.tot>=0)){mejor=pts;hdr=i;cols=c;}
  }
  if(hdr<0){
    toast('No se reconoció el encabezado: necesita una columna DNI y columnas de meses (o un total)',true);
    _r5RetImp={err:'Sin encabezado reconocible. La primera hoja debe tener una fila con DNI y los meses (ENERO, FEBRERO…) o un TOTAL.',arch:nombreArch};
    _r5RetRenderTodo();
    return;
  }

  const meses=_r5RetMeses();
  const porDni=new Map(),porNom=new Map();
  _r5Personal().forEach(p=>{
    const d=_r5DniN(p.dni);if(d)porDni.set(d,p);
    const k=_r5ClaveNom((p.ape||'')+' '+(p.nom||''));
    if(k)porNom.set(k,porNom.has(k)?null:p);   // nombre repetido → no se usa
  });

  const res={arch:nombreArch,ok:0,celdas:0,sinDni:0,noHallados:[],fuera:new Set(),soloTotal:false,filas:0};
  const colMeses=Object.keys(cols.meses).map(Number).sort((a,b)=>a-b);
  const usaTotal=!colMeses.length&&cols.tot>=0;
  res.soloTotal=usaTotal;
  const mesTotal=meses.length?meses[meses.length-1]:0;

  for(let i=hdr+1;i<filas.length;i++){
    const f=filas[i]||[];
    const dni=cols.dni>=0?_r5DniN(f[cols.dni]):'';
    const nomTxt=cols.nom>=0?String(f[cols.nom]||''):'';
    if(!dni&&!_r5NormB(nomTxt))continue;      // fila vacía o de totales
    res.filas++;
    let p=dni?porDni.get(dni):null;
    if(!p&&nomTxt){const k=_r5ClaveNom(nomTxt);p=porNom.get(k)||null;}
    if(!p){
      if(!dni)res.sinDni++;
      if(res.noHallados.length<40)res.noHallados.push((dni||'sin DNI')+(nomTxt?' · '+nomTxt.trim():''));
      continue;
    }
    let tocó=false;
    if(usaTotal){
      const v=_r5r2(_r5NumX(f[cols.tot]));
      if(mesTotal&&v>0){_r5RetBuf[p.id+'|'+mesTotal]=v;res.celdas++;tocó=true;}
    }else{
      colMeses.forEach(m=>{
        const v=_r5r2(_r5NumX(f[cols.meses[m]]));
        if(!v)return;
        if(meses.indexOf(m)<0){res.fuera.add(m);return;}   // mes que no corresponde al período
        _r5RetBuf[p.id+'|'+m]=v;res.celdas++;tocó=true;
      });
    }
    if(tocó)res.ok++;
  }
  res.fuera=[...res.fuera].sort((a,b)=>a-b);
  _r5RetImp=res;
  _r5RetRenderTodo();
  toast(res.celdas
    ?`${res.ok} trabajador(es) · ${res.celdas} monto(s) cargados — revisa y guarda`
    :'No se cargó ningún monto: revisa el detalle',!res.celdas);
}

// Tras importar hay que repintar la barra (para el aviso) y la grilla
function _r5RetRenderTodo(){
  const el=document.getElementById('r5RetBody');
  if(el)el.innerHTML=_r5RetHtml();
}

// Aviso con el resultado de la última importación
function _r5RetImpHtml(){
  const r=_r5RetImp;
  if(!r)return '';
  const cerrar='<button onclick="_r5RetImp=null;_r5RetRenderTodo()" style="background:none;border:none;color:var(--muted2);cursor:pointer;font-size:.8rem;margin-left:auto">✕</button>';
  if(r.err)return `<div style="display:flex;gap:.5rem;align-items:flex-start;margin-bottom:.6rem;padding:.5rem .7rem;background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.3);border-radius:8px;font-size:.72rem;color:#fca5a5">
    <span>⚠️ <strong>${_r5Esc(r.arch)}</strong> — ${_r5Esc(r.err)}</span>${cerrar}</div>`;
  return `<div style="margin-bottom:.6rem;padding:.5rem .7rem;background:rgba(139,92,246,.1);border:1px solid rgba(139,92,246,.3);border-radius:8px;font-size:.72rem;color:var(--muted2);line-height:1.55">
    <div style="display:flex;align-items:center;gap:.4rem">
      <strong style="color:#a78bfa">📥 ${_r5Esc(r.arch)}</strong>
      <span>${r.ok} de ${r.filas} fila(s) emparejadas por DNI · <strong style="color:var(--text)">${r.celdas}</strong> monto(s) cargados</span>${cerrar}
    </div>
    ${r.soloTotal?`<div style="color:#f59e0b">El archivo no traía columnas por mes: el total se cargó en ${R5_MESES[_r5Mes-1]||'—'}.</div>`:''}
    ${r.fuera.length?`<div style="color:#f59e0b">Se ignoraron los meses ${r.fuera.map(m=>R5_MESES[m]).join(', ')}: no son anteriores a ${R5_MESES[_r5Mes]}.</div>`:''}
    ${r.noHallados.length?`<div style="color:#f59e0b">Sin coincidencia (${r.noHallados.length}): <span style="color:var(--muted2)">${_r5Esc(r.noHallados.join(' | '))}</span></div>`:''}
    <div style="color:var(--muted2)">Nada se guardó todavía: revisa las casillas y pulsa <strong>Guardar retenciones</strong>.</div>
  </div>`;
}

// Plantilla para llenar fuera del sistema: mismo cuadro, con DNI por delante
function _r5RetPlantilla(){
  const meses=_r5RetMeses();
  if(!meses.length){toast('Enero no tiene meses anteriores',true);return;}
  const pers=_r5RetPersonal();
  const head=['DNI','APELLIDOS Y NOMBRES','CARGO',...meses.map(m=>R5_MESES[m].toUpperCase())];
  const rows=pers.map(p=>[p.dni||'',`${p.ape}, ${p.nom}`,p.cargo||'',...meses.map(m=>_r5RetVal(p.id,m)||0)]);
  const tit=`RETENCIONES YA EFECTUADAS · ${_r5Anio} · ENERO A ${R5_MESES[_r5Mes-1].toUpperCase()}`;
  const ws=XLSX.utils.aoa_to_sheet([[tit],[],head,...rows]);
  ws['!merges']=[{s:{r:0,c:0},e:{r:0,c:head.length-1}}];
  ws['!cols']=[{wch:12},{wch:34},{wch:22},...meses.map(()=>({wch:12}))];
  const wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,ws,'Retenciones');
  XLSX.writeFile(wb,`Retenciones_${_r5Anio}_hasta_${String(_r5Mes-1).padStart(2,'0')}.xlsx`);
  toast('✓ Plantilla descargada — llénala y vuelve a subirla');
}

// ── Excel ──
function _r5Excel(){
  const pers=_r5Personal();
  const filas=pers.map(p=>{
    const reg=_r5Reg(p.id,_r5Mes,_r5Anio);
    return{p,c:_r5Calc(p,_r5Mes,_r5Anio,reg?reg.otrosIng:0,reg?reg.retenidoPrevio:0)};
  }).filter(f=>(!_r5SoloAfectos||f.c.afecto)&&_r5Coincide(f.p));
  if(!filas.length){toast(_r5NormB(_r5Buscar)?'La búsqueda no deja nada que exportar':'No hay datos que exportar',true);return;}
  // Que el archivo diga que está filtrado, para no confundirlo con la nómina
  const filtro=_r5NormB(_r5Buscar)?' · filtrado: "'+_r5Buscar.trim()+'"':'';
  const tit=`RENTA DE QUINTA CATEGORÍA · ${R5_MESES[_r5Mes]} ${_r5Anio} · UIT S/ ${_r5N(_r5Uit())} · ${R5_MODOS[_r5Modo].lbl}${filtro}`;
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
