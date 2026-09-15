// ══════════════════════════════════════════════════════════════════════════
//  CONTROL DE COSTOS — COSTO DIRECTO
//
//  Mismo formato del EDP que el Costo Indirecto (js/costoIndirecto.js), con
//  las mismas reglas de período 21→20, acumulado anterior (suma de TODOS los
//  períodos previos) y valorización con total editable. Diferencias:
//
//  · PRESUPUESTO: cada grupo guarda el suyo, tal como figura en el EDP
//    (Excavadoras S/5,053,690.88). No se suma desde las filas porque en el
//    EDP no cuadra entre niveles. Un grupo sin presupuesto propio usa la
//    suma de sus filas. La meta total es la fila con ítem '0'.
//  · VALORIZACIÓN: grupos y total SÍ se suman desde sus filas.
//  · Lo que el EDP declaró para cada grupo se guarda en valor_c_dir sobre la
//    fila del grupo, solo como referencia: si no cuadra con la suma de sus
//    filas, se marca con ⚠. El cálculo nunca lo usa.
//  · Los códigos se renumeraron para formar árbol; el original está en item_edp.
//
//  Reusa los ayudantes puros de costoIndirecto.js (_ciNum, _ciM, _ciEsc,
//  _ciKey, _ciCmpItem, _ciAplicar y los de período). Prefijo _cd.
// ══════════════════════════════════════════════════════════════════════════

const _CD_META='0';           // ítem reservado para la meta total del presupuesto

let _cdProyecto='';
let _cdPeriodo='';
let _cdModo='ver';            // 'ver' | 'valorizar' | 'partidas'
let _cdCambios=new Map();     // partidaId → {cantidad, total, manual} aún sin guardar
let _cdPartidaEdit=null;

// ── Datos ───────────────────────────────────────────────────────────────────
function _cdTodas(proy){
  return (DB.presupCDir||[]).filter(p=>String(p.proyecto||'')===proy);
}
function _cdPartidas(proy){
  return _cdTodas(proy).filter(p=>String(p.item)!==_CD_META).sort((a,b)=>_ciCmpItem(a.item,b.item));
}
function _cdMeta(proy){
  return _cdTodas(proy).find(p=>String(p.item)===_CD_META)||null;
}
function _cdProyectos(){
  const s=new Set((DB.presupCDir||[]).map(p=>String(p.proyecto||'')).filter(Boolean));
  (DB.proyectos||[]).forEach(p=>{if(p&&p.codigo)s.add(String(p.codigo));});
  return[...s].sort();
}
function _cdProyectoDefecto(){
  const con=[...new Set((DB.presupCDir||[]).map(p=>String(p.proyecto||'')).filter(Boolean))].sort();
  return con[0]||_cdProyectos()[0]||'';
}
function _cdUltimoPeriodo(proy){
  const ids=new Set(_cdTodas(proy).map(p=>+p.id));
  const per=(DB.valorCDir||[]).filter(v=>ids.has(+v.partidaId)).map(v=>String(v.periodo)).sort();
  return per[per.length-1]||'';
}
function _cdValorDe(pid,periodo){
  return (DB.valorCDir||[]).find(v=>+v.partidaId===+pid&&String(v.periodo)===periodo)||null;
}
// Lo que el EDP declaró para un grupo: el del período (antes=false) o la suma
// de los períodos previos (antes=true). null si no hay nada declarado.
function _cdDeclarado(pid,periodo,antes){
  let s=0,hay=false;
  (DB.valorCDir||[]).forEach(v=>{
    if(+v.partidaId!==+pid)return;
    const per=String(v.periodo||'');
    if(antes?per<periodo:per===periodo){
      const t=_ciNum(v.total);
      if(t!=null){s+=t;hay=true;}
    }
  });
  return hay?s:null;
}
const _cdDif=(dec,val)=>dec!=null&&Math.abs(dec-(val||0))>0.01;

// ── Cálculo ─────────────────────────────────────────────────────────────────
function _cdCalcular(proy,periodo,cambios){
  const partidas=_cdPartidas(proy);
  const items=partidas.map(p=>String(p.item));
  const esHoja=it=>!items.some(o=>o.startsWith(it+'.'));
  const ids=new Set(partidas.map(p=>+p.id));
  const porPartida=new Map();
  (DB.valorCDir||[]).forEach(v=>{
    const pid=+v.partidaId;
    if(!ids.has(pid))return;
    if(!porPartida.has(pid))porPartida.set(pid,[]);
    porPartida.get(pid).push(v);
  });

  const filas=partidas.map(p=>{
    const item=String(p.item), hoja=esHoja(item);
    const f={id:+p.id,item,edp:p.itemEdp||'',desc:p.desc||'',unidad:p.unidad||'',
      nivel:item.split('.').length,hoja,
      presCant:_ciNum(p.cantidad),pu:_ciNum(p.precioUnit),presPropio:_ciNum(p.total),presTot:0,
      antCant:null,antTot:0,actCant:null,actTot:0,actManual:false,
      acuCant:null,acuTot:0,salCant:null,salTot:null,decAnt:null,decAct:null};
    if(!hoja){
      f.decAnt=_cdDeclarado(p.id,periodo,true);
      f.decAct=_cdDeclarado(p.id,periodo,false);
      return f;
    }
    f.presTot=f.presPropio||0;
    const enEdicion=!!(cambios&&cambios.has(+p.id));
    let aC=0,aT=0,aHay=false;
    (porPartida.get(+p.id)||[]).forEach(v=>{
      const per=String(v.periodo||'');
      if(per<periodo){aC+=_ciNum(v.cantidad)||0;aT+=_ciNum(v.total)||0;aHay=true;}
      else if(per===periodo&&!enEdicion){
        f.actCant=_ciNum(v.cantidad);f.actTot=_ciNum(v.total)||0;f.actManual=!!v.totalManual;
      }
    });
    if(enEdicion){
      const c=cambios.get(+p.id);
      f.actCant=c.cantidad;f.actTot=c.total||0;f.actManual=!!c.manual;
    }
    f.antCant=aHay?aC:null;
    f.antTot=aT;
    f.acuCant=(f.antCant==null&&f.actCant==null)?null:(f.antCant||0)+(f.actCant||0);
    f.acuTot=f.antTot+f.actTot;
    // Una fila sin presupuesto propio (las horas de cada equipo: su meta está
    // en el grupo) no tiene saldo: mostrar "−acumulado" confundiría.
    if(f.presPropio!=null){
      f.salTot=f.presPropio-f.acuTot;
      f.salCant=f.pu>0?f.salTot/f.pu:null;
    }
    return f;
  });

  const hojas=filas.filter(f=>f.hoja);
  filas.forEach(f=>{
    if(f.hoja)return;
    let sumPres=0;
    hojas.filter(h=>h.item.startsWith(f.item+'.')).forEach(h=>{
      f.antTot+=h.antTot;f.actTot+=h.actTot;f.acuTot+=h.acuTot;sumPres+=h.presPropio||0;
    });
    f.presTot=f.presPropio!=null?f.presPropio:sumPres;
    f.salTot=f.presTot-f.acuTot;
  });

  const total={presTot:0,antTot:0,actTot:0,acuTot:0,salTot:0,decAnt:null,decAct:null};
  hojas.forEach(h=>{total.antTot+=h.antTot;total.actTot+=h.actTot;total.acuTot+=h.acuTot;});
  const meta=_cdMeta(proy);
  total.presTot=(meta&&_ciNum(meta.total)!=null)?_ciNum(meta.total)
    :filas.filter(f=>f.nivel===1).reduce((s,f)=>s+f.presTot,0);
  total.salTot=total.presTot-total.acuTot;
  if(meta){
    total.decAnt=_cdDeclarado(meta.id,periodo,true);
    total.decAct=_cdDeclarado(meta.id,periodo,false);
  }
  return{filas,total};
}

// ── Textos (pintado inicial y refresco en vivo) ─────────────────────────────
function _cdTextos(f){
  const base=f.hoja?f.presPropio:f.presTot;
  const pct=v=>(v!=null&&base!=null&&base>0.005&&Math.abs(v)>=0.005)?Math.round(v/base*100)+'%':'';
  const c=v=>f.hoja?_ciM(v):'';
  const av=(dec,val)=>_cdDif(dec,val)?' ⚠':'';
  return{
    antCant:c(f.antCant),antTot:_ciM(f.antTot)+av(f.decAnt,f.antTot),antPct:pct(f.antTot),
    actCant:c(f.actCant),
    actTot:(f.hoja&&f.actManual&&Math.abs(f.actTot)>=0.005?'✎ ':'')+_ciM(f.actTot)+av(f.decAct,f.actTot),
    actPct:pct(f.actTot),
    acuCant:c(f.acuCant),acuTot:_ciM(f.acuTot),acuPct:pct(f.acuTot),
    salCant:c(f.salCant),salTot:f.salTot==null?'':_ciM(f.salTot),salPct:f.salTot==null?'':pct(f.salTot)
  };
}
function _cdTextosTotal(t){
  const pct=v=>(t.presTot>0.005&&Math.abs(v)>=0.005)?(v/t.presTot*100).toFixed(2)+'%':'';
  const av=(dec,val)=>_cdDif(dec,val)?' ⚠':'';
  return{presTot:_ciM(t.presTot),antTot:_ciM(t.antTot)+av(t.decAnt,t.antTot),antPct:pct(t.antTot),
    actTot:_ciM(t.actTot)+av(t.decAct,t.actTot),actPct:pct(t.actTot),
    acuTot:_ciM(t.acuTot),acuPct:pct(t.acuTot),salTot:_ciM(t.salTot),salPct:pct(t.salTot)};
}
function _cdKpis(D,lab){
  const t=D.total;
  const p=v=>t.presTot>0.005?(v/t.presTot*100).toFixed(2)+'% de la meta':'';
  return[
    {id:'pres',l:'Presupuesto meta',v:'S/ '+_ciM(t.presTot),s:D.filas.filter(f=>f.hoja).length+' partidas',c:'#3b82f6'},
    {id:'act', l:'Valorización '+lab,v:'S/ '+_ciM(t.actTot),
      s:_cdDif(t.decAct,t.actTot)?'⚠ el EDP declaró S/ '+_ciM(t.decAct):p(t.actTot),c:'#a78bfa'},
    {id:'acu', l:'Acumulado a '+lab,v:'S/ '+_ciM(t.acuTot),s:p(t.acuTot),c:'#10b981'},
    {id:'sal', l:'Saldo a valorizar',v:'S/ '+_ciM(t.salTot),s:p(t.salTot),c:'#f59e0b'}
  ];
}
// Los subtotales que el EDP declaró distinto de la suma de sus filas
function _cdDiferencias(D){
  const L=[];
  const chk=(nombre,col,dec,val)=>{if(_cdDif(dec,val))L.push({nombre,col,dec,val,dif:dec-val});};
  D.filas.filter(f=>!f.hoja).forEach(f=>{
    chk(f.item+' '+f.desc,'anterior',f.decAnt,f.antTot);
    chk(f.item+' '+f.desc,'actual',f.decAct,f.actTot);
  });
  chk('COSTO DIRECTO (total)','anterior',D.total.decAnt,D.total.antTot);
  chk('COSTO DIRECTO (total)','actual',D.total.decAct,D.total.actTot);
  return L;
}

// ── Edición de la valorización ──────────────────────────────────────────────
function _cdBase(pid){
  if(_cdCambios.has(+pid))return _cdCambios.get(+pid);
  const v=_cdValorDe(pid,_cdPeriodo);
  return{cantidad:v?_ciNum(v.cantidad):null,total:v?_ciNum(v.total):null,manual:v?!!v.totalManual:false};
}
function _cdEdit(pid,campo,valor){
  const p=(DB.presupCDir||[]).find(x=>+x.id===+pid);if(!p)return;
  const r=_ciAplicar(_cdBase(pid),campo,valor,_ciNum(p.precioUnit));
  _cdCambios.set(+pid,r);
  const k=_ciKey(p.item);
  if(campo==='cant'){
    const t=document.getElementById('cd-in-'+k+'-t');
    if(t&&document.activeElement!==t)t.value=r.total==null?'':r.total;
  }
  const mk=document.getElementById('cd-mk-'+k);
  if(mk)mk.style.visibility=r.manual?'visible':'hidden';
  _cdRefrescar();
}
function _cdBlurTot(pid){
  const p=(DB.presupCDir||[]).find(x=>+x.id===+pid);
  const r=_cdCambios.get(+pid);
  if(!p||!r)return;
  const t=document.getElementById('cd-in-'+_ciKey(p.item)+'-t');
  if(t)t.value=r.total==null?'':r.total;
}
function _cdPendientes(){
  const out=[];
  const igual=(a,b)=>(a==null&&b==null)||(a!=null&&b!=null&&Math.abs(a-b)<0.00001);
  _cdCambios.forEach((c,pid)=>{
    const v=_cdValorDe(pid,_cdPeriodo);
    const vacio=(c.cantidad==null||c.cantidad===0)&&(c.total==null||c.total===0);
    if(!v&&vacio)return;
    if(v&&igual(c.cantidad,_ciNum(v.cantidad))&&igual(c.total,_ciNum(v.total))&&!!c.manual===!!v.totalManual)return;
    out.push({pid,c,v});
  });
  return out;
}
function _cdHayCambios(){return _cdModo==='valorizar'&&_cdPendientes().length>0;}

function _cdRefrescar(){
  const D=_cdCalcular(_cdProyecto,_cdPeriodo,_cdCambios);
  const set=(id,txt,color)=>{
    const el=document.getElementById(id);if(!el)return;
    el.textContent=txt;
    if(color!==undefined)el.style.color=color;
  };
  D.filas.forEach(f=>{
    const k=_ciKey(f.item);
    Object.entries(_cdTextos(f)).forEach(([campo,txt])=>
      set('cd-'+k+'-'+campo,txt,campo==='salTot'?(f.salTot!=null&&f.salTot<-0.005?'#ef4444':''):undefined));
  });
  Object.entries(_cdTextosTotal(D.total)).forEach(([campo,txt])=>set('cd-TOT-'+campo,txt));
  _cdKpis(D,_ciPerMes(_cdPeriodo)).forEach(k=>{set('cd-KPI-'+k.id,k.v);set('cd-KPIs-'+k.id,k.s);});
  const n=_cdPendientes().length;
  const b=document.getElementById('cd-guardar');
  if(b){b.textContent='💾 Guardar'+(n?' ('+n+')':'');b.disabled=!n;}
}

async function _cdGuardar(){
  const pend=_cdPendientes();
  if(!pend.length){toast('No hay cambios que guardar');return;}
  DB.valorCDir=DB.valorCDir||[];
  let hechos=0,fallo=false;
  for(const{pid,c,v}of pend){
    const vacio=(c.cantidad==null||c.cantidad===0)&&(c.total==null||c.total===0);
    if(vacio){
      await supaDelete('valorCDir',v.id);
      DB.valorCDir=DB.valorCDir.filter(x=>+x.id!==+v.id);
      _cdCambios.delete(+pid);hechos++;
      continue;
    }
    const rec={id:v?+v.id:nidSeguro('cdv','valorCDir'),partidaId:+pid,periodo:_cdPeriodo,
      cantidad:c.cantidad,total:c.total,totalManual:!!c.manual,creadoPor:CU?CU.nombre:''};
    if(!v)DB.valorCDir.push({...rec});
    const err=await supaUpsert('valorCDir',rec);
    if(err){
      if(!v)DB.valorCDir=DB.valorCDir.filter(x=>+x.id!==+rec.id);
      fallo=true;break;
    }
    if(v)Object.assign(v,rec);
    _cdCambios.delete(+pid);hechos++;
  }
  if(!fallo){_cdCambios.clear();_cdModo='ver';}
  rCostoDirecto();
  if(hechos)toast('✓ '+hechos+' partida(s) de '+_ciPerLabel(_cdPeriodo)+' guardadas');
}

// ── Modos, período y proyecto ───────────────────────────────────────────────
function _cdDescartarOk(){
  return !_cdHayCambios()||confirm('Hay valorizaciones sin guardar. ¿Descartarlas?');
}
function _cdSetModo(m){
  if(m!=='valorizar'&&!_cdDescartarOk())return;
  if(m!=='valorizar')_cdCambios.clear();
  _cdModo=m;
  rCostoDirecto();
}
function _cdNav(d){
  if(!_cdDescartarOk())return;
  _cdCambios.clear();
  _cdPeriodo=_ciPerMover(_cdPeriodo,d);
  rCostoDirecto();
}
function _cdSetProyecto(v){
  if(!_cdDescartarOk())return;
  _cdCambios.clear();
  _cdProyecto=v;_cdPeriodo='';
  rCostoDirecto();
}

// ── Pintado ─────────────────────────────────────────────────────────────────
function rCostoDirecto(){
  const el=document.getElementById('ctPanel-cd');
  if(el)el.innerHTML=_cdPanelHTML();
}

function _cdPanelHTML(){
  const ro=typeof isModuleReadOnly==='function'&&isModuleReadOnly('costos');
  if(ro)_cdModo='ver';
  const proyectos=_cdProyectos();
  if(!_cdProyecto||!proyectos.includes(_cdProyecto))_cdProyecto=_cdProyectoDefecto();
  if(!_cdPeriodo)_cdPeriodo=_cdUltimoPeriodo(_cdProyecto)||_ciPerHoy();
  const D=_cdCalcular(_cdProyecto,_cdPeriodo,_cdCambios);
  const mes=_ciPerMes(_cdPeriodo), lab=_ciPerLabel(_cdPeriodo);
  const nEdp=_ciNumEdp(_cdProyecto,_cdPeriodo);
  const val=_cdModo==='valorizar'&&!ro, par=_cdModo==='partidas'&&!ro;
  const nPend=_cdPendientes().length;

  const inpS='background:var(--panel2);border:1px solid var(--border);border-radius:7px;padding:.3rem .55rem;color:var(--text);font-size:.76rem';
  const selProy=proyectos.length>1
    ?`<select onchange="_cdSetProyecto(this.value)" style="${inpS};max-width:200px">${proyectos.map(p=>`<option value="${_ciEsc(p)}"${p===_cdProyecto?' selected':''}>${_ciEsc(p)}</option>`).join('')}</select>`
    :(_cdProyecto?`<span style="font-size:.74rem;font-weight:700;color:#a78bfa;border:1px solid #a78bfa55;border-radius:6px;padding:.25rem .55rem">${_ciEsc(_cdProyecto)}</span>`:'');

  const botones=ro?`<span style="font-size:.72rem;color:var(--muted2)">Solo lectura</span>`
    :val?`<button id="cd-guardar" class="btn btn-a" style="--ba:var(--otr)" onclick="_cdGuardar()"${nPend?'':' disabled'}>💾 Guardar${nPend?' ('+nPend+')':''}</button>
          <button class="btn btn-out btn-sm" onclick="_cdSetModo('ver')">Cancelar</button>`
    :`<button class="btn btn-out btn-sm" onclick="_cdSetModo('valorizar')"${D.filas.length?'':' disabled'} title="Ingresar las cantidades de ${lab}">✏ Valorizar ${mes}</button>
      <button class="btn btn-out btn-sm" onclick="_cdSetModo('${par?'ver':'partidas'}')" style="${par?'border-color:var(--otr);color:var(--otr)':''}" title="Agregar, editar o eliminar partidas del presupuesto">⚙ Partidas</button>
      ${par?`<button class="btn btn-a" style="--ba:var(--otr)" onclick="_cdModalPartida()">＋ Partida</button>`:''}`;

  const barra=`<div style="display:flex;align-items:center;gap:.5rem;flex-wrap:wrap;margin-bottom:.8rem">
    ${selProy}
    <div style="display:flex;align-items:center;background:var(--panel2);border:1px solid var(--border);border-radius:8px;overflow:hidden">
      <button onclick="_cdNav(-1)" title="Período anterior" style="background:none;border:none;border-right:1px solid var(--border);color:var(--text);cursor:pointer;font-size:1.1rem;padding:.3rem .7rem;line-height:1">‹</button>
      <span style="font-weight:800;font-size:.88rem;color:var(--text);min-width:130px;text-align:center;padding:0 .5rem">${lab}</span>
      <button onclick="_cdNav(1)" title="Período siguiente" style="background:none;border:none;border-left:1px solid var(--border);color:var(--text);cursor:pointer;font-size:1.1rem;padding:.3rem .7rem;line-height:1">›</button>
    </div>
    <span style="font-size:.72rem;color:var(--muted2)">${nEdp?'EDP N° '+nEdp+' · ':''}${_ciPerRango(_cdPeriodo)}</span>
    <div style="margin-left:auto;display:flex;gap:.4rem;align-items:center">${botones}</div>
  </div>`;

  const aviso=val?`<div style="margin:-.3rem 0 .8rem;padding:.4rem .8rem;border-left:3px solid var(--otr);background:rgba(167,139,250,.08);border-radius:0 6px 6px 0;font-size:.72rem;color:#c4b5fd">
      <strong>Valorizando ${lab}.</strong> Escriba la cantidad (horas, viajes, meses) y el total se calcula con el P. Unit.
      Si corrige el total a mano queda marcado con ✎; bórrelo para volver al cálculo.
      Borrar cantidad y total elimina la valorización de esa partida.</div>`:'';

  const K=_cdKpis(D,mes);
  const kpis=`<div class="kpi-row">${K.map(k=>`<div class="kpi" style="--kc:${k.c}">
      <div class="kpi-lbl">${k.l}</div>
      <div class="kpi-val" id="cd-KPI-${k.id}" style="font-size:1.25rem">${k.v}</div>
      <div id="cd-KPIs-${k.id}" style="font-size:.66rem;color:var(--muted2);margin-top:.15rem">${k.s}</div>
    </div>`).join('')}</div>`;

  if(!D.filas.length){
    return kpis+barra+`<div class="card"><div class="card-body" style="text-align:center;padding:2.5rem 1rem;color:var(--muted2);font-size:.84rem">
      No hay partidas de costo directo${_cdProyecto?' para '+_ciEsc(_cdProyecto):''}.<br>
      <span style="font-size:.74rem">Corra <code>sql/costo_directo.sql</code> en Supabase para cargar el EDP N°3, o agregue partidas con ⚙ Partidas.</span>
    </div></div>`;
  }

  // Subtotales declarados por el EDP que no cuadran con sus filas
  const DIF=_cdDiferencias(D);
  const avisoEdp=DIF.length&&!val?`<div style="margin:0 0 .8rem;padding:.5rem .8rem;border-left:3px solid #f59e0b;background:rgba(245,158,11,.08);border-radius:0 6px 6px 0;font-size:.72rem;color:#fbbf24;line-height:1.5">
      <strong>⚠ ${DIF.length} subtotal(es) del EDP no cuadran con la suma de sus filas.</strong>
      El sistema usa la suma de las filas; lo declarado queda como referencia.
      <div style="margin-top:.3rem;color:var(--muted2);font-family:monospace;font-size:.68rem">
        ${DIF.slice(0,8).map(x=>`${_ciEsc(x.nombre)} · ${x.col}: EDP ${_ciM(x.dec)} · filas ${_ciM(x.val)} · diferencia ${x.dif>0?'+':''}${_ciM(x.dif)}`).join('<br>')}
        ${DIF.length>8?'<br>… y '+(DIF.length-8)+' más':''}
      </div></div>`:'';

  // ── Tabla ──
  const TH='background:var(--panel2);color:var(--muted2);font-size:.6rem;font-weight:700;text-transform:uppercase;letter-spacing:.05em;padding:.35rem .45rem;white-space:nowrap;border-bottom:1px solid var(--border)';
  const TD='padding:.3rem .45rem;border-bottom:1px solid var(--border);font-size:.72rem;white-space:nowrap';
  const W0=78;
  const STK=(izq,bg)=>`position:sticky;left:${izq}px;z-index:2;background:${bg}`;
  const BLOQ=[
    {l:'Presupuesto',c:'#60a5fa'},{l:'Acumulado anterior',c:'#94a3b8'},
    {l:'Valorización '+lab,c:'#c4b5fd'},{l:'Acumulado actual',c:'#34d399'},{l:'Saldo a valorizar',c:'#fbbf24'}
  ];
  const inpN='width:78px;background:var(--panel2);border:1px solid rgba(167,139,250,.45);border-radius:5px;color:var(--text);padding:.12rem .3rem;font-family:monospace;font-size:.72rem;text-align:right';

  let body='';
  D.filas.forEach(f=>{
    const k=_ciKey(f.item), T=_cdTextos(f);
    const cap=!f.hoja&&f.nivel===1, grp=!f.hoja&&f.nivel>1;
    const bg=cap?'#16233b':grp?'#131c2e':'var(--panel)';
    const peso=cap?'800':grp?'700':'400';
    const col=cap?'#bfdbfe':'var(--text)';
    const n=(campo,extra,tit)=>`<td id="cd-${k}-${campo}"${tit?` title="${_ciEsc(tit)}"`:''} style="${TD};text-align:right;font-family:monospace;font-weight:${f.hoja?'500':'700'}${extra||''}">${T[campo]}</td>`;
    const pc=campo=>`<td id="cd-${k}-${campo}" style="${TD};text-align:right;color:var(--muted2);font-size:.66rem">${T[campo]}</td>`;
    const titAnt=f.decAnt!=null?'El EDP declaró S/ '+_ciM(f.decAnt):'';
    const titAct=f.decAct!=null?'El EDP declaró S/ '+_ciM(f.decAct):'';
    const colAv=(dec,v)=>_cdDif(dec,v)?';color:#fbbf24':'';

    let actual;
    if(val&&f.hoja){
      const b=_cdBase(f.id);
      actual=`<td style="${TD};text-align:right"><input id="cd-in-${k}-c" type="number" step="0.01" value="${b.cantidad==null?'':b.cantidad}" oninput="_cdEdit(${f.id},'cant',this.value)" style="${inpN};width:70px"></td>
        <td style="${TD};text-align:right"><span style="display:inline-flex;align-items:center;gap:3px">
          <span id="cd-mk-${k}" title="Total ingresado a mano: no es cantidad × P. Unit. Bórrelo para volver al cálculo." style="color:#fbbf24;visibility:${b.manual?'visible':'hidden'}">✎</span>
          <input id="cd-in-${k}-t" type="number" step="0.01" value="${b.total==null?'':b.total}" oninput="_cdEdit(${f.id},'tot',this.value)" onblur="_cdBlurTot(${f.id})" style="${inpN};width:100px">
        </span></td>
        ${pc('actPct')}`;
    }else{
      actual=`${n('actCant')}${n('actTot',f.hoja?';color:#c4b5fd':colAv(f.decAct,f.actTot)||';color:#c4b5fd',titAct)}${pc('actPct')}`;
    }

    body+=`<tr style="background:${bg}">
      <td style="${TD};${STK(0,bg)};width:${W0}px;min-width:${W0}px;max-width:${W0}px;font-family:monospace;font-weight:${peso};color:${cap?'#93c5fd':'var(--muted2)'}"${f.edp?` title="Código en el EDP: ${_ciEsc(f.edp)}"`:''}>${_ciEsc(f.item)}</td>
      <td style="${TD};${STK(W0,bg)};font-weight:${peso};color:${col};padding-left:${.45+(f.nivel-1)*.6}rem;max-width:340px;overflow:hidden;text-overflow:ellipsis" title="${_ciEsc(f.desc)}${f.edp?' · EDP '+_ciEsc(f.edp):''}">${_ciEsc(f.desc)}</td>
      <td style="${TD};color:var(--muted2);text-align:center">${f.hoja?_ciEsc(f.unidad):''}</td>
      <td style="${TD};text-align:right;font-family:monospace">${f.hoja?_ciM(f.presCant):''}</td>
      <td style="${TD};text-align:right;font-family:monospace">${f.hoja?_ciM(f.pu):''}</td>
      <td style="${TD};text-align:right;font-family:monospace;font-weight:700;color:#93c5fd">${f.hoja&&f.presPropio==null?'':_ciM(f.presTot)}</td>
      ${n('antCant')}${n('antTot',colAv(f.decAnt,f.antTot),titAnt)}${pc('antPct')}
      ${actual}
      ${n('acuCant')}${n('acuTot',';color:#6ee7b7')}${pc('acuPct')}
      ${n('salCant')}${n('salTot',f.salTot!=null&&f.salTot<-0.005?';color:#ef4444':'')}${pc('salPct')}
      ${par?`<td style="${TD};text-align:center">
        <button onclick="_cdModalPartida(${f.id})" title="Editar" style="background:none;border:1px solid #f59e0b50;border-radius:5px;color:#f59e0b;cursor:pointer;font-size:.68rem;padding:.1rem .35rem">✏</button>
        <button onclick="_cdBorrarPartida(${f.id})" title="Eliminar" style="background:none;border:1px solid #ef444450;border-radius:5px;color:#ef4444;cursor:pointer;font-size:.68rem;padding:.1rem .35rem;margin-left:.15rem">🗑</button>
      </td>`:''}
    </tr>`;
  });

  const TT=_cdTextosTotal(D.total);
  const tf=(campo,extra,tit)=>`<td id="cd-TOT-${campo}"${tit?` title="${_ciEsc(tit)}"`:''} style="${TD};text-align:right;font-family:monospace;font-weight:900${extra||''}">${TT[campo]}</td>`;
  const tfp=campo=>`<td id="cd-TOT-${campo}" style="${TD};text-align:right;font-weight:800;font-size:.68rem">${TT[campo]}</td>`;
  const bgT='#1b2a44';

  return kpis+barra+aviso+avisoEdp+`<div style="overflow-x:auto;border:1px solid var(--border);border-radius:10px">
    <table style="width:100%;border-collapse:collapse;min-width:1500px">
      <thead>
        <tr>
          <th rowspan="2" style="${TH};${STK(0,'var(--panel2)')};text-align:left;width:${W0}px;min-width:${W0}px">Ítem</th>
          <th rowspan="2" style="${TH};${STK(W0,'var(--panel2)')};text-align:left">Descripción</th>
          <th rowspan="2" style="${TH}">Und</th>
          ${BLOQ.map(b=>`<th colspan="3" style="${TH};text-align:center;color:${b.c};border-left:1px solid var(--border)">${b.l}</th>`).join('')}
          ${par?`<th rowspan="2" style="${TH}"></th>`:''}
        </tr>
        <tr>
          <th style="${TH};text-align:right;border-left:1px solid var(--border)">Cant</th><th style="${TH};text-align:right">P. Unit</th><th style="${TH};text-align:right">Total S/</th>
          ${[0,1,2,3].map(()=>`<th style="${TH};text-align:right;border-left:1px solid var(--border)">Cant</th><th style="${TH};text-align:right">Total S/</th><th style="${TH};text-align:right">%</th>`).join('')}
        </tr>
      </thead>
      <tbody>${body}</tbody>
      <tfoot><tr style="background:${bgT}">
        <td colspan="2" style="${TD};${STK(0,bgT)};font-weight:900;color:var(--text)">COSTOS DIRECTOS</td>
        <td style="${TD}"></td><td style="${TD}"></td><td style="${TD}"></td>
        ${tf('presTot',';color:#93c5fd')}
        <td style="${TD}"></td>${tf('antTot','',D.total.decAnt!=null?'El EDP declaró S/ '+_ciM(D.total.decAnt):'')}${tfp('antPct')}
        <td style="${TD}"></td>${tf('actTot',';color:#c4b5fd',D.total.decAct!=null?'El EDP declaró S/ '+_ciM(D.total.decAct):'')}${tfp('actPct')}
        <td style="${TD}"></td>${tf('acuTot',';color:#6ee7b7')}${tfp('acuPct')}
        <td style="${TD}"></td>${tf('salTot')}${tfp('salPct')}
        ${par?`<td style="${TD}"></td>`:''}
      </tr></tfoot>
    </table>
  </div>
  <div style="font-size:.66rem;color:var(--muted2);margin-top:.45rem;line-height:1.5">
    Cada grupo usa su propio presupuesto del EDP · la valorización de grupos y total es la suma de sus filas ·
    el acumulado anterior es la suma de todos los períodos antes de ${lab} · las filas de horas de equipo no tienen presupuesto propio
    (su meta está en el grupo) · ✎ total a mano · ⚠ el EDP declaró otro subtotal (pase el cursor para verlo) ·
    pase el cursor por el ítem para ver el código del EDP
  </div>`;
}

// ── Partidas del presupuesto ────────────────────────────────────────────────
function _cdAsegurarModal(){
  if(document.getElementById('mCdPartida'))return;
  const d=document.createElement('div');
  d.className='mo';d.id='mCdPartida';
  d.innerHTML=`<div class="modal" style="max-width:660px">
    <div class="mh"><span class="mttl">Partida</span><button class="mx" onclick="closeM('mCdPartida')">✕</button></div>
    <div class="mb">
      <div class="fg-grid">
        <div class="fg"><label>Ítem</label><input id="cdPItem" placeholder="2.01.07.17"></div>
        <div class="fg"><label>Código en el EDP</label><input id="cdPEdp" placeholder="2.01.07.06.a"></div>
        <div class="fg"><label>Unidad</label><input id="cdPUnd" placeholder="hm"></div>
        <div class="fg" style="grid-column:1/-1"><label>Descripción</label><input id="cdPDesc" placeholder="Camión volquete 15 m3 VOL ECOP-009 (HE)"></div>
        <div class="fg"><label>Cantidad</label><input id="cdPCant" type="number" step="0.01" oninput="_cdPTotAuto()"></div>
        <div class="fg"><label>Precio unitario S/</label><input id="cdPPu" type="number" step="0.01" oninput="_cdPTotAuto()"></div>
        <div class="fg"><label>Presupuesto S/</label><input id="cdPTot" type="number" step="0.01" oninput="this.dataset.manual=this.value?'1':''"></div>
      </div>
      <div style="font-size:.7rem;color:var(--muted2);margin-top:.6rem;line-height:1.45">
        En un grupo (2.01.07…) escriba su presupuesto propio: se usa tal cual, no se suma desde sus filas.
        En las filas de horas de un equipo deje el presupuesto vacío: su meta está en el grupo.
      </div>
    </div>
    <div class="mf">
      <button class="btn btn-out" onclick="closeM('mCdPartida')">Cancelar</button>
      <button class="btn btn-a" style="--ba:var(--otr)" onclick="_cdGuardarPartida()">💾 Guardar</button>
    </div>
  </div>`;
  document.body.appendChild(d);
}
function _cdPTotAuto(){
  const tot=document.getElementById('cdPTot');
  if(!tot||tot.dataset.manual==='1')return;
  const c=_ciNum(document.getElementById('cdPCant')?.value), p=_ciNum(document.getElementById('cdPPu')?.value);
  tot.value=(c!=null&&p!=null)?Math.round(c*p*100)/100:'';
}
function _cdModalPartida(id){
  _cdAsegurarModal();
  const p=id!=null?(DB.presupCDir||[]).find(x=>+x.id===+id):null;
  _cdPartidaEdit=p?+p.id:null;
  const set=(i,v)=>{const el=document.getElementById(i);if(el)el.value=v==null?'':v;};
  set('cdPItem',p?p.item:'');set('cdPEdp',p?p.itemEdp:'');set('cdPDesc',p?p.desc:'');set('cdPUnd',p?p.unidad:'');
  set('cdPCant',p?_ciNum(p.cantidad):'');set('cdPPu',p?_ciNum(p.precioUnit):'');set('cdPTot',p?_ciNum(p.total):'');
  const tot=document.getElementById('cdPTot');
  if(tot)tot.dataset.manual=(p&&_ciNum(p.total)!=null)?'1':'';
  const t=document.querySelector('#mCdPartida .mttl');
  if(t)t.textContent=p?'✏ Partida '+p.item:'＋ Nueva partida · '+_cdProyecto;
  openM('mCdPartida');
}
async function _cdGuardarPartida(){
  const v=i=>(document.getElementById(i)?.value||'').trim();
  const item=v('cdPItem'), desc=v('cdPDesc');
  if(!/^\d+(\.\d+)*$/.test(item)){toast('El ítem debe ser como 1, 2.01 o 2.01.07.17',true);return;}
  if(item===_CD_META){toast('El ítem 0 está reservado para la meta total',true);return;}
  if(!desc){toast('Escriba la descripción',true);return;}
  if(!_cdProyecto){toast('No hay proyecto elegido',true);return;}
  const rep=(DB.presupCDir||[]).find(x=>String(x.proyecto)===_cdProyecto&&String(x.item)===item&&+x.id!==+_cdPartidaEdit);
  if(rep){toast('El ítem '+item+' ya existe en '+_cdProyecto,true);return;}
  DB.presupCDir=DB.presupCDir||[];
  const nuevo=_cdPartidaEdit==null;
  const rec={id:nuevo?nidSeguro('cdp','presupCDir'):_cdPartidaEdit,proyecto:_cdProyecto,item,itemEdp:v('cdPEdp')||null,desc,
    unidad:v('cdPUnd')||null,cantidad:_ciNum(v('cdPCant')),precioUnit:_ciNum(v('cdPPu')),total:_ciNum(v('cdPTot'))};
  if(nuevo)DB.presupCDir.push({...rec});
  const err=await supaUpsert('presupCDir',rec);
  if(err){if(nuevo)DB.presupCDir=DB.presupCDir.filter(x=>+x.id!==+rec.id);return;}
  if(!nuevo){const i=DB.presupCDir.findIndex(x=>+x.id===+rec.id);if(i>-1)DB.presupCDir[i]={...DB.presupCDir[i],...rec};}
  closeM('mCdPartida');_cdPartidaEdit=null;
  rCostoDirecto();
  toast('✓ Partida '+item+' guardada');
}
async function _cdBorrarPartida(id){
  const p=(DB.presupCDir||[]).find(x=>+x.id===+id);if(!p)return;
  const hijos=_cdPartidas(String(p.proyecto)).filter(x=>String(x.item).startsWith(p.item+'.'));
  if(hijos.length){toast('Primero elimine las '+hijos.length+' partida(s) de '+p.item,true);return;}
  const nv=(DB.valorCDir||[]).filter(x=>+x.partidaId===+p.id).length;
  if(!confirm('¿Eliminar la partida '+p.item+' – '+(p.desc||'')+'?'
    +(nv?'\n\nTambién se borrarán sus '+nv+' valorización(es) guardadas.':'')))return;
  await supaDelete('presupCDir',p.id);
  DB.presupCDir=DB.presupCDir.filter(x=>+x.id!==+p.id);
  DB.valorCDir=(DB.valorCDir||[]).filter(x=>+x.partidaId!==+p.id);
  _cdCambios.delete(+p.id);
  rCostoDirecto();
  toast('Partida '+p.item+' eliminada');
}
