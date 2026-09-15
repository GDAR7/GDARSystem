// ══════════════════════════════════════════════════════════════════════════
//  CONTROL DE COSTOS — PESTAÑAS · COSTO INDIRECTO
//
//  Control de Costos se ordena en pestañas: Costo Indirecto (este archivo),
//  Costo Directo, Reembolsables y Utilidad (su contenido se definirá después)
//  y el Registro de egresos que ya existía, que sigue pintando rCostos en
//  js/datos.js sin ningún cambio.
//
//  Costo Indirecto reproduce el formato del EDP de valorización:
//    PRESUPUESTO          la meta, fija, se ingresa una vez       presup_c_indi
//    ACUMULADO ANTERIOR   suma de TODOS los períodos previos      valor_c_indi
//    VALORIZACIÓN ACTUAL  el período elegido en el selector       valor_c_indi
//    ACUMULADO ACTUAL     anterior + actual                       (calculado)
//    SALDO A VALORIZAR    presupuesto − acumulado actual          (calculado)
//
//  Los capítulos (1, 2, 3) y grupos (1.01…) no guardan montos: se suman de
//  sus partidas, así un subtotal nunca queda desfasado de su detalle.
//  Períodos 21→20 nombrados por su mes de cierre, como el resto del sistema.
//
//  Prefijos: _ct (pestañas) y _ci (costo indirecto).
// ══════════════════════════════════════════════════════════════════════════

// ── Pestañas de Control de Costos ───────────────────────────────────────────
const _CT_TABS=[
  {k:'ci',       l:'Costo Indirecto',     ico:'🏢'},
  {k:'cd',       l:'Costo Directo',       ico:'🏗️', pronto:true},
  {k:'reemb',    l:'Reembolsables',       ico:'🧾', pronto:true},
  {k:'util',     l:'Utilidad',            ico:'📈', pronto:true},
  {k:'registro', l:'Registro de egresos', ico:'📒'}
];
let _ctTabAct=(()=>{try{return localStorage.getItem('ctTab')||'ci';}catch(e){return'ci';}})();

function _ctRender(){
  if(!_CT_TABS.some(t=>t.k===_ctTabAct))_ctTabAct='ci';
  const bar=document.getElementById('ctTabs');
  if(bar)bar.innerHTML=_CT_TABS.map(t=>{
    const on=t.k===_ctTabAct;
    return`<button id="ctTab-${t.k}" onclick="_ctTab('${t.k}')" style="padding:.4rem .95rem;border:none;border-radius:7px 7px 0 0;cursor:pointer;font-size:.8rem;font-weight:700;background:${on?'var(--otr)':'transparent'};color:${on?'#0b0f1a':'var(--muted2)'}">${t.ico} ${t.l}${t.pronto?' <span style="font-size:.58rem;font-weight:700;opacity:.7">· pronto</span>':''}</button>`;
  }).join('');
  const t=_CT_TABS.find(x=>x.k===_ctTabAct);
  const ver=(id,on)=>{const el=document.getElementById(id);if(el)el.style.display=on?'':'none';};
  ver('ctPanel-ci',t.k==='ci');
  ver('ctPanel-registro',t.k==='registro');
  ver('ctPanel-pronto',!!t.pronto);
  if(t.k==='ci')rCostoIndirecto();
  if(t.pronto){
    const el=document.getElementById('ctPanel-pronto');
    if(el)el.innerHTML=`<div class="card"><div class="card-body" style="text-align:center;padding:2.5rem 1rem;color:var(--muted2)">
      <div style="font-size:1.6rem">${t.ico}</div>
      <div style="font-weight:800;color:var(--text);margin:.4rem 0">${t.l}</div>
      <div style="font-size:.8rem">Pestaña reservada: su contenido se definirá más adelante.</div>
    </div></div>`;
  }
}
function _ctTab(k){
  if(_ciHayCambios()&&!confirm('Hay valorizaciones sin guardar. ¿Descartarlas?'))return;
  if(k!=='ci'){_ciCambios.clear();_ciModo='ver';}
  _ctTabAct=k;
  try{localStorage.setItem('ctTab',k);}catch(e){}
  _ctRender();
}

// ══ COSTO INDIRECTO ═══════════════════════════════════════════════════════
const _CI_MESES=['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto',
                 'Septiembre','Octubre','Noviembre','Diciembre'];
// Período del EDP N°1 de cada proyecto, para numerar los EDP. El R3 empezó con
// un primer período mayo–junio que cerró el 20 de junio.
const _CI_INICIO={'EPY-004-26':'2026-06'};

let _ciProyecto='';          // '' = el primero que tenga partidas
let _ciPeriodo='';           // 'YYYY-MM' de cierre; '' = el último valorizado
let _ciModo='ver';           // 'ver' | 'valorizar' | 'partidas'
let _ciCambios=new Map();    // partidaId → {cantidad, total, manual} aún sin guardar
let _ciPartidaEdit=null;

// ── Ayudantes ───────────────────────────────────────────────────────────────
function _ciNum(v){
  if(v===''||v==null)return null;
  const n=+v;
  return isFinite(n)?n:null;
}
const _ciM=v=>(v==null||Math.abs(v)<0.005)?'–'
  :Number(v).toLocaleString('es-PE',{minimumFractionDigits:2,maximumFractionDigits:2});
const _ciEsc=s=>String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;')
  .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const _ciKey=item=>String(item).replace(/\./g,'_');
// 1 < 1.01 < 1.01.01 < 1.02 < 2 — numérico por tramo, no alfabético
function _ciCmpItem(a,b){
  const x=String(a).split('.').map(Number), y=String(b).split('.').map(Number);
  for(let i=0;i<Math.max(x.length,y.length);i++){
    const d=(x[i]??-1)-(y[i]??-1);
    if(d)return d;
  }
  return 0;
}

// ── Períodos 21→20 ──────────────────────────────────────────────────────────
function _ciPerLabel(p){const[y,m]=String(p).split('-').map(Number);return _CI_MESES[m-1]+' '+y;}
function _ciPerMes(p){const[,m]=String(p).split('-').map(Number);return _CI_MESES[m-1];}
function _ciPerMover(p,d){
  const[y,m]=String(p).split('-').map(Number);
  const x=new Date(y,m-1+d,1);
  return x.getFullYear()+'-'+String(x.getMonth()+1).padStart(2,'0');
}
function _ciPerRango(p){
  const[y,m]=String(p).split('-').map(Number);
  const f=d=>String(d.getDate()).padStart(2,'0')+'/'+String(d.getMonth()+1).padStart(2,'0')+'/'+d.getFullYear();
  return f(new Date(y,m-2,21))+' al '+f(new Date(y,m-1,20));
}
// Período en curso: desde el 21 ya corre el del mes siguiente
function _ciPerHoy(){
  const h=new Date();
  let y=h.getFullYear(), m=h.getMonth()+1;
  if(h.getDate()>=21){m++;if(m>12){m=1;y++;}}
  return y+'-'+String(m).padStart(2,'0');
}
function _ciNumEdp(proy,per){
  const ini=_CI_INICIO[proy];
  if(!ini)return null;                       // sin inicio conocido no se numera
  const[y0,m0]=ini.split('-').map(Number),[y,m]=String(per).split('-').map(Number);
  const n=(y-y0)*12+(m-m0)+1;
  return n>=1?n:null;
}

// ── Datos ───────────────────────────────────────────────────────────────────
function _ciPartidas(proy){
  return (DB.presupCIndi||[]).filter(p=>String(p.proyecto||'')===proy)
    .sort((a,b)=>_ciCmpItem(a.item,b.item));
}
function _ciProyectos(){
  const s=new Set((DB.presupCIndi||[]).map(p=>String(p.proyecto||'')).filter(Boolean));
  (DB.proyectos||[]).forEach(p=>{if(p&&p.codigo)s.add(String(p.codigo));});
  return[...s].sort();
}
function _ciProyectoDefecto(){
  const con=[...new Set((DB.presupCIndi||[]).map(p=>String(p.proyecto||'')).filter(Boolean))].sort();
  return con[0]||_ciProyectos()[0]||'';
}
function _ciUltimoPeriodo(proy){
  const ids=new Set(_ciPartidas(proy).map(p=>+p.id));
  const per=(DB.valorCIndi||[]).filter(v=>ids.has(+v.partidaId)).map(v=>String(v.periodo)).sort();
  return per[per.length-1]||'';
}
function _ciValorDe(pid,periodo){
  return (DB.valorCIndi||[]).find(v=>+v.partidaId===+pid&&String(v.periodo)===periodo)||null;
}

// ── Cálculo ─────────────────────────────────────────────────────────────────
// cambios: valorizaciones que se están escribiendo y aún no se guardan. Se
// usan en lugar de lo guardado para que los subtotales se vean al instante.
function _ciCalcular(proy,periodo,cambios){
  const partidas=_ciPartidas(proy);
  const items=partidas.map(p=>String(p.item));
  const esHoja=it=>!items.some(o=>o.startsWith(it+'.'));
  const ids=new Set(partidas.map(p=>+p.id));
  const porPartida=new Map();
  (DB.valorCIndi||[]).forEach(v=>{
    const pid=+v.partidaId;
    if(!ids.has(pid))return;
    if(!porPartida.has(pid))porPartida.set(pid,[]);
    porPartida.get(pid).push(v);
  });

  const filas=partidas.map(p=>{
    const item=String(p.item), hoja=esHoja(item);
    const f={id:+p.id,item,desc:p.desc||'',unidad:p.unidad||'',nivel:item.split('.').length,hoja,
      presCant:_ciNum(p.cantidad),pu:_ciNum(p.precioUnit),presTot:0,
      antCant:null,antTot:0,actCant:null,actTot:0,actManual:false,
      acuCant:null,acuTot:0,salCant:null,salTot:0};
    if(!hoja)return f;
    f.presTot=_ciNum(p.total)||0;
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
    f.salTot=f.presTot-f.acuTot;
    // Lo que falta, expresado en la unidad del precio (meses-persona, und…)
    f.salCant=f.pu>0?f.salTot/f.pu:null;
    return f;
  });

  const hojas=filas.filter(f=>f.hoja);
  const CAMPOS=['presTot','antTot','actTot','acuTot','salTot'];
  filas.forEach(f=>{
    if(f.hoja)return;
    hojas.filter(h=>h.item.startsWith(f.item+'.')).forEach(h=>CAMPOS.forEach(c=>{f[c]+=h[c];}));
  });
  const total={presTot:0,antTot:0,actTot:0,acuTot:0,salTot:0};
  hojas.forEach(h=>CAMPOS.forEach(c=>{total[c]+=h[c];}));
  return{filas,total};
}

// Textos de una fila: los usa el pintado inicial y el refresco en vivo
function _ciTextos(f){
  const pct=v=>(f.presTot>0.005&&Math.abs(v)>=0.005)?Math.round(v/f.presTot*100)+'%':'';
  const c=v=>f.hoja?_ciM(v):'';
  return{
    antCant:c(f.antCant),antTot:_ciM(f.antTot),antPct:pct(f.antTot),
    actCant:c(f.actCant),
    actTot:(f.hoja&&f.actManual&&Math.abs(f.actTot)>=0.005?'✎ ':'')+_ciM(f.actTot),
    actPct:pct(f.actTot),
    acuCant:c(f.acuCant),acuTot:_ciM(f.acuTot),acuPct:pct(f.acuTot),
    salCant:c(f.salCant),salTot:_ciM(f.salTot),salPct:pct(f.salTot)
  };
}
function _ciTextosTotal(t){
  const pct=v=>(t.presTot>0.005&&Math.abs(v)>=0.005)?(v/t.presTot*100).toFixed(2)+'%':'';
  return{presTot:_ciM(t.presTot),antTot:_ciM(t.antTot),antPct:pct(t.antTot),
    actTot:_ciM(t.actTot),actPct:pct(t.actTot),acuTot:_ciM(t.acuTot),acuPct:pct(t.acuTot),
    salTot:_ciM(t.salTot),salPct:pct(t.salTot)};
}
function _ciKpis(D,lab){
  const t=D.total;
  const p=v=>t.presTot>0.005?(v/t.presTot*100).toFixed(2)+'% de la meta':'';
  return[
    {id:'pres',l:'Presupuesto meta',   v:'S/ '+_ciM(t.presTot),s:D.filas.filter(f=>f.hoja).length+' partidas',c:'#3b82f6'},
    {id:'act', l:'Valorización '+lab,  v:'S/ '+_ciM(t.actTot), s:p(t.actTot),c:'#a78bfa'},
    {id:'acu', l:'Acumulado a '+lab,   v:'S/ '+_ciM(t.acuTot), s:p(t.acuTot),c:'#10b981'},
    {id:'sal', l:'Saldo a valorizar',  v:'S/ '+_ciM(t.salTot), s:p(t.salTot),c:'#f59e0b'}
  ];
}

// ── Edición de la valorización ──────────────────────────────────────────────
// Se escribe la cantidad y el total sale de cantidad × P.Unit. Si el usuario
// escribe otro total, queda como manual (✎). Si borra el total, vuelve al cálculo.
function _ciAplicar(prev,campo,valor,pu){
  const r={cantidad:prev.cantidad,total:prev.total,manual:!!prev.manual};
  const calc=()=>(r.cantidad!=null&&pu!=null)?Math.round(r.cantidad*pu*100)/100:null;
  if(campo==='cant'){
    r.cantidad=_ciNum(valor);
    if(!r.manual)r.total=calc();
  }else{
    const t=_ciNum(valor);
    if(t==null){r.manual=false;r.total=calc();}
    else{
      r.total=t;
      const c=calc();
      r.manual=c==null||Math.abs(c-t)>0.005;
    }
  }
  return r;
}
function _ciBase(pid){
  if(_ciCambios.has(+pid))return _ciCambios.get(+pid);
  const v=_ciValorDe(pid,_ciPeriodo);
  return{cantidad:v?_ciNum(v.cantidad):null,total:v?_ciNum(v.total):null,manual:v?!!v.totalManual:false};
}
function _ciEdit(pid,campo,valor){
  const p=(DB.presupCIndi||[]).find(x=>+x.id===+pid);if(!p)return;
  const r=_ciAplicar(_ciBase(pid),campo,valor,_ciNum(p.precioUnit));
  _ciCambios.set(+pid,r);
  const k=_ciKey(p.item);
  if(campo==='cant'){
    const t=document.getElementById('ci-in-'+k+'-t');
    if(t&&document.activeElement!==t)t.value=r.total==null?'':r.total;
  }
  const mk=document.getElementById('ci-mk-'+k);
  if(mk)mk.style.visibility=r.manual?'visible':'hidden';
  _ciRefrescar();
}
// Al salir del total, se muestra el valor que realmente quedó (el calculado si se borró)
function _ciBlurTot(pid){
  const p=(DB.presupCIndi||[]).find(x=>+x.id===+pid);
  const r=_ciCambios.get(+pid);
  if(!p||!r)return;
  const t=document.getElementById('ci-in-'+_ciKey(p.item)+'-t');
  if(t)t.value=r.total==null?'':r.total;
}
// Solo cuenta lo que de verdad cambió respecto a lo guardado
function _ciPendientes(){
  const out=[];
  const igual=(a,b)=>(a==null&&b==null)||(a!=null&&b!=null&&Math.abs(a-b)<0.00001);
  _ciCambios.forEach((c,pid)=>{
    const v=_ciValorDe(pid,_ciPeriodo);
    const vacio=(c.cantidad==null||c.cantidad===0)&&(c.total==null||c.total===0);
    if(!v&&vacio)return;
    if(v&&igual(c.cantidad,_ciNum(v.cantidad))&&igual(c.total,_ciNum(v.total))&&!!c.manual===!!v.totalManual)return;
    out.push({pid,c,v});
  });
  return out;
}
function _ciHayCambios(){return _ciModo==='valorizar'&&_ciPendientes().length>0;}

// Actualiza los números sin volver a pintar la tabla: así no se pierde el
// cursor del campo que se está escribiendo.
function _ciRefrescar(){
  const D=_ciCalcular(_ciProyecto,_ciPeriodo,_ciCambios);
  const set=(id,txt,color)=>{
    const el=document.getElementById(id);if(!el)return;
    el.textContent=txt;
    if(color!==undefined)el.style.color=color;
  };
  D.filas.forEach(f=>{
    const k=_ciKey(f.item);
    Object.entries(_ciTextos(f)).forEach(([campo,txt])=>
      set('ci-'+k+'-'+campo,txt,campo==='salTot'?(f.salTot<-0.005?'#ef4444':''):undefined));
  });
  Object.entries(_ciTextosTotal(D.total)).forEach(([campo,txt])=>set('ci-TOT-'+campo,txt));
  _ciKpis(D,_ciPerMes(_ciPeriodo)).forEach(k=>{set('ci-KPI-'+k.id,k.v);set('ci-KPIs-'+k.id,k.s);});
  const n=_ciPendientes().length;
  const b=document.getElementById('ci-guardar');
  if(b){b.textContent='💾 Guardar'+(n?' ('+n+')':'');b.disabled=!n;}
}

async function _ciGuardar(){
  const pend=_ciPendientes();
  if(!pend.length){toast('No hay cambios que guardar');return;}
  DB.valorCIndi=DB.valorCIndi||[];
  let hechos=0,fallo=false;
  for(const{pid,c,v}of pend){
    const vacio=(c.cantidad==null||c.cantidad===0)&&(c.total==null||c.total===0);
    if(vacio){
      // Borrar la cantidad y el total de una partida elimina su valorización
      await supaDelete('valorCIndi',v.id);
      DB.valorCIndi=DB.valorCIndi.filter(x=>+x.id!==+v.id);
      _ciCambios.delete(+pid);hechos++;
      continue;
    }
    const rec={id:v?+v.id:nidSeguro('civ','valorCIndi'),partidaId:+pid,periodo:_ciPeriodo,
      cantidad:c.cantidad,total:c.total,totalManual:!!c.manual,creadoPor:CU?CU.nombre:''};
    // El id nuevo se reserva en DB antes de esperar a Supabase: si no, la
    // siguiente partida del lote calcularía el mismo id.
    if(!v)DB.valorCIndi.push({...rec});
    const err=await supaUpsert('valorCIndi',rec);
    if(err){
      if(!v)DB.valorCIndi=DB.valorCIndi.filter(x=>+x.id!==+rec.id);
      fallo=true;break;
    }
    if(v)Object.assign(v,rec);
    _ciCambios.delete(+pid);hechos++;
  }
  if(!fallo){_ciCambios.clear();_ciModo='ver';}
  rCostoIndirecto();
  if(hechos)toast('✓ '+hechos+' partida(s) de '+_ciPerLabel(_ciPeriodo)+' guardadas');
}

// ── Modos, período y proyecto ───────────────────────────────────────────────
function _ciDescartarOk(){
  return !_ciHayCambios()||confirm('Hay valorizaciones sin guardar. ¿Descartarlas?');
}
function _ciSetModo(m){
  if(m!=='valorizar'&&!_ciDescartarOk())return;
  if(m!=='valorizar')_ciCambios.clear();
  _ciModo=m;
  rCostoIndirecto();
}
function _ciNav(d){
  if(!_ciDescartarOk())return;
  _ciCambios.clear();
  _ciPeriodo=_ciPerMover(_ciPeriodo,d);
  rCostoIndirecto();
}
function _ciSetProyecto(v){
  if(!_ciDescartarOk())return;
  _ciCambios.clear();
  _ciProyecto=v;_ciPeriodo='';
  rCostoIndirecto();
}

// ── Pintado ─────────────────────────────────────────────────────────────────
function rCostoIndirecto(){
  const el=document.getElementById('ctPanel-ci');
  if(el)el.innerHTML=_ciPanelHTML();
}

function _ciPanelHTML(){
  const ro=typeof isModuleReadOnly==='function'&&isModuleReadOnly('costos');
  if(ro)_ciModo='ver';
  const proyectos=_ciProyectos();
  if(!_ciProyecto||!proyectos.includes(_ciProyecto))_ciProyecto=_ciProyectoDefecto();
  if(!_ciPeriodo)_ciPeriodo=_ciUltimoPeriodo(_ciProyecto)||_ciPerHoy();
  const D=_ciCalcular(_ciProyecto,_ciPeriodo,_ciCambios);
  const mes=_ciPerMes(_ciPeriodo), lab=_ciPerLabel(_ciPeriodo);
  const nEdp=_ciNumEdp(_ciProyecto,_ciPeriodo);
  const val=_ciModo==='valorizar'&&!ro, par=_ciModo==='partidas'&&!ro, sim=_ciModo==='simular'&&!ro;
  const nPend=_ciPendientes().length;

  const inpS='background:var(--panel2);border:1px solid var(--border);border-radius:7px;padding:.3rem .55rem;color:var(--text);font-size:.76rem';
  const selProy=proyectos.length>1
    ?`<select onchange="_ciSetProyecto(this.value)" style="${inpS};max-width:200px">${proyectos.map(p=>`<option value="${_ciEsc(p)}"${p===_ciProyecto?' selected':''}>${_ciEsc(p)}</option>`).join('')}</select>`
    :(_ciProyecto?`<span style="font-size:.74rem;font-weight:700;color:#a78bfa;border:1px solid #a78bfa55;border-radius:6px;padding:.25rem .55rem">${_ciEsc(_ciProyecto)}</span>`:'');

  const botones=ro?`<span style="font-size:.72rem;color:var(--muted2)">Solo lectura</span>`
    :val?`<button id="ci-guardar" class="btn btn-a" style="--ba:var(--otr)" onclick="_ciGuardar()"${nPend?'':' disabled'}>💾 Guardar${nPend?' ('+nPend+')':''}</button>
          <button class="btn btn-out btn-sm" onclick="_ciSetModo('ver')">Cancelar</button>`
    :sim?`<button class="btn btn-out btn-sm" onclick="_ciSetModo('ver')">← Volver a la tabla</button>`
    :`<button class="btn btn-out btn-sm" onclick="_ciSetModo('simular')"${D.filas.length?'':' disabled'} title="Calcular la cantidad del personal con el tareo de ${lab}">🧮 Simular desde el tareo</button>
      <button class="btn btn-out btn-sm" onclick="_ciSetModo('valorizar')"${D.filas.length?'':' disabled'} title="Ingresar las cantidades de ${lab}">✏ Valorizar ${mes}</button>
      <button class="btn btn-out btn-sm" onclick="_ciSetModo('${par?'ver':'partidas'}')" style="${par?'border-color:var(--otr);color:var(--otr)':''}" title="Agregar, editar o eliminar partidas del presupuesto">⚙ Partidas</button>
      ${par?`<button class="btn btn-a" style="--ba:var(--otr)" onclick="_ciModalPartida()">＋ Partida</button>`:''}`;

  const barra=`<div style="display:flex;align-items:center;gap:.5rem;flex-wrap:wrap;margin-bottom:.8rem">
    ${selProy}
    <div style="display:flex;align-items:center;background:var(--panel2);border:1px solid var(--border);border-radius:8px;overflow:hidden">
      <button onclick="_ciNav(-1)" title="Período anterior" style="background:none;border:none;border-right:1px solid var(--border);color:var(--text);cursor:pointer;font-size:1.1rem;padding:.3rem .7rem;line-height:1">‹</button>
      <span style="font-weight:800;font-size:.88rem;color:var(--text);min-width:130px;text-align:center;padding:0 .5rem">${lab}</span>
      <button onclick="_ciNav(1)" title="Período siguiente" style="background:none;border:none;border-left:1px solid var(--border);color:var(--text);cursor:pointer;font-size:1.1rem;padding:.3rem .7rem;line-height:1">›</button>
    </div>
    <span style="font-size:.72rem;color:var(--muted2)">${nEdp?'EDP N° '+nEdp+' · ':''}${_ciPerRango(_ciPeriodo)}</span>
    <div style="margin-left:auto;display:flex;gap:.4rem;align-items:center">${botones}</div>
  </div>`;

  const aviso=val?`<div style="margin:-.3rem 0 .8rem;padding:.4rem .8rem;border-left:3px solid var(--otr);background:rgba(167,139,250,.08);border-radius:0 6px 6px 0;font-size:.72rem;color:#c4b5fd">
      <strong>Valorizando ${lab}.</strong> Escriba la cantidad y el total se calcula con el P. Unit.
      Si corrige el total a mano queda marcado con ✎; bórrelo para volver al cálculo.
      Borrar cantidad y total elimina la valorización de esa partida.</div>`:'';

  const K=_ciKpis(D,mes);
  const kpis=`<div class="kpi-row">${K.map(k=>`<div class="kpi" style="--kc:${k.c}">
      <div class="kpi-lbl">${k.l}</div>
      <div class="kpi-val" id="ci-KPI-${k.id}" style="font-size:1.25rem">${k.v}</div>
      <div id="ci-KPIs-${k.id}" style="font-size:.66rem;color:var(--muted2);margin-top:.15rem">${k.s}</div>
    </div>`).join('')}</div>`;

  // Simular desde el tareo: su pantalla vive en js/costoIndirectoSim.js
  if(sim&&D.filas.length&&typeof _cisPanelHTML==='function')return kpis+barra+_cisPanelHTML();

  if(!D.filas.length){
    return kpis+barra+`<div class="card"><div class="card-body" style="text-align:center;padding:2.5rem 1rem;color:var(--muted2);font-size:.84rem">
      No hay partidas de costo indirecto${_ciProyecto?' para '+_ciEsc(_ciProyecto):''}.<br>
      <span style="font-size:.74rem">Corra <code>sql/costo_indirecto.sql</code> en Supabase para cargar el EDP N°3, o agregue partidas con ⚙ Partidas.</span>
    </div></div>`;
  }

  // ── Tabla ──
  const TH='background:var(--panel2);color:var(--muted2);font-size:.6rem;font-weight:700;text-transform:uppercase;letter-spacing:.05em;padding:.35rem .45rem;white-space:nowrap;border-bottom:1px solid var(--border)';
  const TD='padding:.3rem .45rem;border-bottom:1px solid var(--border);font-size:.72rem;white-space:nowrap';
  const W0=64;                                        // ancho fijo de ÍTEM, para fijar DESCRIPCIÓN a su lado
  const STK=(izq,bg)=>`position:sticky;left:${izq}px;z-index:2;background:${bg}`;
  const BLOQ=[
    {l:'Presupuesto',c:'#60a5fa'},{l:'Acumulado anterior',c:'#94a3b8'},
    {l:'Valorización '+lab,c:'#c4b5fd'},{l:'Acumulado actual',c:'#34d399'},{l:'Saldo a valorizar',c:'#fbbf24'}
  ];
  const inpN='width:78px;background:var(--panel2);border:1px solid rgba(167,139,250,.45);border-radius:5px;color:var(--text);padding:.12rem .3rem;font-family:monospace;font-size:.72rem;text-align:right';

  let body='';
  D.filas.forEach(f=>{
    const k=_ciKey(f.item), T=_ciTextos(f);
    const cap=!f.hoja&&f.nivel===1, grp=!f.hoja&&f.nivel>1;
    const bg=cap?'#16233b':grp?'#131c2e':'var(--panel)';
    const peso=cap?'800':grp?'700':'400';
    const col=cap?'#bfdbfe':'var(--text)';
    const n=(campo,extra)=>`<td id="ci-${k}-${campo}" style="${TD};text-align:right;font-family:monospace;font-weight:${f.hoja?'500':'700'}${extra||''}">${T[campo]}</td>`;
    const pc=campo=>`<td id="ci-${k}-${campo}" style="${TD};text-align:right;color:var(--muted2);font-size:.66rem">${T[campo]}</td>`;

    let actual;
    if(val&&f.hoja){
      const b=_ciBase(f.id);
      actual=`<td style="${TD};text-align:right"><input id="ci-in-${k}-c" type="number" step="0.01" value="${b.cantidad==null?'':b.cantidad}" oninput="_ciEdit(${f.id},'cant',this.value)" style="${inpN};width:62px"></td>
        <td style="${TD};text-align:right"><span style="display:inline-flex;align-items:center;gap:3px">
          <span id="ci-mk-${k}" title="Total ingresado a mano: no es cantidad × P. Unit. Bórrelo para volver al cálculo." style="color:#fbbf24;visibility:${b.manual?'visible':'hidden'}">✎</span>
          <input id="ci-in-${k}-t" type="number" step="0.01" value="${b.total==null?'':b.total}" oninput="_ciEdit(${f.id},'tot',this.value)" onblur="_ciBlurTot(${f.id})" style="${inpN};width:96px">
        </span></td>
        ${pc('actPct')}`;
    }else{
      actual=`${n('actCant')}${n('actTot',';color:#c4b5fd')}${pc('actPct')}`;
    }

    body+=`<tr style="background:${bg}">
      <td style="${TD};${STK(0,bg)};width:${W0}px;min-width:${W0}px;max-width:${W0}px;font-family:monospace;font-weight:${peso};color:${cap?'#93c5fd':'var(--muted2)'}">${_ciEsc(f.item)}</td>
      <td style="${TD};${STK(W0,bg)};font-weight:${peso};color:${col};padding-left:${.45+(f.nivel-1)*.7}rem;max-width:330px;overflow:hidden;text-overflow:ellipsis" title="${_ciEsc(f.desc)}">${_ciEsc(f.desc)}</td>
      <td style="${TD};color:var(--muted2);text-align:center">${f.hoja?_ciEsc(f.unidad):''}</td>
      <td style="${TD};text-align:right;font-family:monospace">${f.hoja?_ciM(f.presCant):''}</td>
      <td style="${TD};text-align:right;font-family:monospace">${f.hoja?_ciM(f.pu):''}</td>
      <td style="${TD};text-align:right;font-family:monospace;font-weight:700;color:#93c5fd">${_ciM(f.presTot)}</td>
      ${n('antCant')}${n('antTot')}${pc('antPct')}
      ${actual}
      ${n('acuCant')}${n('acuTot',';color:#6ee7b7')}${pc('acuPct')}
      ${n('salCant')}${n('salTot',f.salTot<-0.005?';color:#ef4444':'')}${pc('salPct')}
      ${par?`<td style="${TD};text-align:center">
        <button onclick="_ciModalPartida(${f.id})" title="Editar" style="background:none;border:1px solid #f59e0b50;border-radius:5px;color:#f59e0b;cursor:pointer;font-size:.68rem;padding:.1rem .35rem">✏</button>
        <button onclick="_ciBorrarPartida(${f.id})" title="Eliminar" style="background:none;border:1px solid #ef444450;border-radius:5px;color:#ef4444;cursor:pointer;font-size:.68rem;padding:.1rem .35rem;margin-left:.15rem">🗑</button>
      </td>`:''}
    </tr>`;
  });

  const TT=_ciTextosTotal(D.total);
  const tf=(campo,extra)=>`<td id="ci-TOT-${campo}" style="${TD};text-align:right;font-family:monospace;font-weight:900${extra||''}">${TT[campo]}</td>`;
  const tfp=campo=>`<td id="ci-TOT-${campo}" style="${TD};text-align:right;font-weight:800;font-size:.68rem">${TT[campo]}</td>`;
  const bgT='#1b2a44';

  return kpis+barra+aviso+`<div style="overflow-x:auto;border:1px solid var(--border);border-radius:10px">
    <table style="width:100%;border-collapse:collapse;min-width:1480px">
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
        <td colspan="2" style="${TD};${STK(0,bgT)};font-weight:900;color:var(--text)">COSTOS INDIRECTOS</td>
        <td style="${TD}"></td><td style="${TD}"></td><td style="${TD}"></td>
        ${tf('presTot',';color:#93c5fd')}
        <td style="${TD}"></td>${tf('antTot')}${tfp('antPct')}
        <td style="${TD}"></td>${tf('actTot',';color:#c4b5fd')}${tfp('actPct')}
        <td style="${TD}"></td>${tf('acuTot',';color:#6ee7b7')}${tfp('acuPct')}
        <td style="${TD}"></td>${tf('salTot')}${tfp('salPct')}
        ${par?`<td style="${TD}"></td>`:''}
      </tr></tfoot>
    </table>
  </div>
  <div style="font-size:.66rem;color:var(--muted2);margin-top:.45rem;line-height:1.5">
    Capítulos y grupos se suman de sus partidas · el acumulado anterior es la suma de todos los períodos antes de ${lab} ·
    la cantidad del saldo está en la unidad del P. Unit (lo que falta ÷ precio) · ✎ total ingresado a mano
  </div>`;
}

// ── Partidas del presupuesto ────────────────────────────────────────────────
// El modal se crea una sola vez y se cuelga del body: dentro de una página
// oculta no se vería (ya pasó con otros modales).
function _ciAsegurarModal(){
  if(document.getElementById('mCiPartida'))return;
  const d=document.createElement('div');
  d.className='mo';d.id='mCiPartida';
  d.innerHTML=`<div class="modal" style="max-width:660px">
    <div class="mh"><span class="mttl">Partida</span><button class="mx" onclick="closeM('mCiPartida')">✕</button></div>
    <div class="mb">
      <div class="fg-grid">
        <div class="fg"><label>Ítem</label><input id="ciPItem" placeholder="1.01.04"></div>
        <div class="fg"><label>Unidad</label><input id="ciPUnd" placeholder="mes"></div>
        <div class="fg" style="grid-column:1/-1"><label>Descripción</label><input id="ciPDesc" placeholder="Ingeniero de Costos"></div>
        <div class="fg"><label>Cantidad</label><input id="ciPCant" type="number" step="0.01" oninput="_ciPTotAuto()"></div>
        <div class="fg"><label>Precio unitario S/</label><input id="ciPPu" type="number" step="0.01" oninput="_ciPTotAuto()"></div>
        <div class="fg"><label>Total presupuesto S/</label><input id="ciPTot" type="number" step="0.01" oninput="this.dataset.manual=this.value?'1':''"></div>
      </div>
      <div style="font-size:.7rem;color:var(--muted2);margin-top:.6rem;line-height:1.45">
        El total se propone como cantidad × precio. Si el presupuesto incluye la duración, escriba el total real
        (1 residente a 20,128.00 figura con 160,426.25).<br>
        Para un capítulo o grupo (1, 1.01…) deje cantidad, precio y total vacíos: su monto se suma de sus partidas.
      </div>
    </div>
    <div class="mf">
      <button class="btn btn-out" onclick="closeM('mCiPartida')">Cancelar</button>
      <button class="btn btn-a" style="--ba:var(--otr)" onclick="_ciGuardarPartida()">💾 Guardar</button>
    </div>
  </div>`;
  document.body.appendChild(d);
}
function _ciPTotAuto(){
  const tot=document.getElementById('ciPTot');
  if(!tot||tot.dataset.manual==='1')return;
  const c=_ciNum(document.getElementById('ciPCant')?.value), p=_ciNum(document.getElementById('ciPPu')?.value);
  tot.value=(c!=null&&p!=null)?Math.round(c*p*100)/100:'';
}
function _ciModalPartida(id){
  _ciAsegurarModal();
  const p=id!=null?(DB.presupCIndi||[]).find(x=>+x.id===+id):null;
  _ciPartidaEdit=p?+p.id:null;
  const set=(i,v)=>{const el=document.getElementById(i);if(el)el.value=v==null?'':v;};
  set('ciPItem',p?p.item:'');set('ciPDesc',p?p.desc:'');set('ciPUnd',p?p.unidad:'');
  set('ciPCant',p?_ciNum(p.cantidad):'');set('ciPPu',p?_ciNum(p.precioUnit):'');set('ciPTot',p?_ciNum(p.total):'');
  const tot=document.getElementById('ciPTot');
  if(tot)tot.dataset.manual=(p&&_ciNum(p.total)!=null)?'1':'';
  const t=document.querySelector('#mCiPartida .mttl');
  if(t)t.textContent=p?'✏ Partida '+p.item:'＋ Nueva partida · '+_ciProyecto;
  openM('mCiPartida');
}
async function _ciGuardarPartida(){
  const v=i=>(document.getElementById(i)?.value||'').trim();
  const item=v('ciPItem'), desc=v('ciPDesc');
  if(!/^\d+(\.\d+)*$/.test(item)){toast('El ítem debe ser como 1, 1.01 o 1.01.04',true);return;}
  if(!desc){toast('Escriba la descripción',true);return;}
  if(!_ciProyecto){toast('No hay proyecto elegido',true);return;}
  const rep=(DB.presupCIndi||[]).find(x=>String(x.proyecto)===_ciProyecto&&String(x.item)===item&&+x.id!==+_ciPartidaEdit);
  if(rep){toast('El ítem '+item+' ya existe en '+_ciProyecto,true);return;}
  DB.presupCIndi=DB.presupCIndi||[];
  const nuevo=_ciPartidaEdit==null;
  const rec={id:nuevo?nidSeguro('cip','presupCIndi'):_ciPartidaEdit,proyecto:_ciProyecto,item,desc,
    unidad:v('ciPUnd')||null,cantidad:_ciNum(v('ciPCant')),precioUnit:_ciNum(v('ciPPu')),total:_ciNum(v('ciPTot'))};
  if(nuevo)DB.presupCIndi.push({...rec});
  const err=await supaUpsert('presupCIndi',rec);
  if(err){if(nuevo)DB.presupCIndi=DB.presupCIndi.filter(x=>+x.id!==+rec.id);return;}
  if(!nuevo){const i=DB.presupCIndi.findIndex(x=>+x.id===+rec.id);if(i>-1)DB.presupCIndi[i]={...DB.presupCIndi[i],...rec};}
  closeM('mCiPartida');_ciPartidaEdit=null;
  rCostoIndirecto();
  toast('✓ Partida '+item+' guardada');
}
async function _ciBorrarPartida(id){
  const p=(DB.presupCIndi||[]).find(x=>+x.id===+id);if(!p)return;
  const hijos=_ciPartidas(String(p.proyecto)).filter(x=>String(x.item).startsWith(p.item+'.'));
  if(hijos.length){toast('Primero elimine las '+hijos.length+' partida(s) de '+p.item,true);return;}
  const nv=(DB.valorCIndi||[]).filter(x=>+x.partidaId===+p.id).length;
  if(!confirm('¿Eliminar la partida '+p.item+' – '+(p.desc||'')+'?'
    +(nv?'\n\nTambién se borrarán sus '+nv+' valorización(es) guardadas.':'')))return;
  await supaDelete('presupCIndi',p.id);
  DB.presupCIndi=DB.presupCIndi.filter(x=>+x.id!==+p.id);
  DB.valorCIndi=(DB.valorCIndi||[]).filter(x=>+x.partidaId!==+p.id);
  _ciCambios.delete(+p.id);
  rCostoIndirecto();
  toast('Partida '+p.item+' eliminada');
}
