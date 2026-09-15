// ══════════════════════════════════════════════════════════════════════════
//  COSTO INDIRECTO — SIMULAR DESDE EL TAREO
//
//  La CANT de una partida de personal es la suma de meses-persona de quienes
//  tienen los cargos vinculados a ella:
//      días que cuentan en el tareo del período ÷ días del período
//  con la MISMA regla de HH Venta (hhVentaPeriodo): TD, TN, A5 y DL cuentan 1
//  y DLT cuenta 2.5. Si esa regla cambia allá, cambia aquí.
//
//  · Solo lo registrado a la fecha: el período sin cerrar no se proyecta.
//  · Solo partidas con cargos vinculados: servicios y equipos no se tocan.
//  · Nada se guarda solo: "Pasar a la valorización" llena el modo edición y el
//    usuario revisa y pulsa Guardar.
//  · Qué cargo va en qué partida se guarda en presup_c_indi.cargos. Lo que no
//    está guardado se sugiere comparando nombres y se marca como sugerido.
//
//  Prefijo _cis.
// ══════════════════════════════════════════════════════════════════════════

let _cisMapa=null;           // Map partidaId → Set(cargos) en edición
let _cisClave='';            // proyecto|período con que se armó el mapa
let _cisSugeridos=new Set(); // cargos cuya asignación es sugerencia sin guardar
let _cisNombres=[];          // índice → cargo, para los botones de la pantalla

// ── Comparar nombres de cargo y partida ─────────────────────────────────────
const _CIS_VACIAS=new Set(['de','del','la','las','el','los','y','e','en','para','por','con','a']);
function _cisTokens(s){
  return String(s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'')
    .replace(/[^a-z0-9]+/g,' ').trim().split(' ')
    .filter(t=>t&&!_CIS_VACIAS.has(t))
    .map(t=>t.length>4&&t.endsWith('es')?t.slice(0,-2):t.length>3&&t.endsWith('s')?t.slice(0,-1):t);
}
// Iguales, abreviatura (ing → ingeniero, ayud → ayudante) o misma raíz
// larga (asistenta / asistente)
function _cisIgual(a,b){
  if(a===b)return true;
  const[c,l]=a.length<=b.length?[a,b]:[b,a];
  if(c.length>=3&&l.startsWith(c))return true;
  let k=0;while(k<c.length&&c[k]===l[k])k++;
  return k>=6;
}
// Cuánto del nombre de la partida está en el cargo y viceversa
function _cisPuntaje(partida,cargo){
  const P=_cisTokens(partida), C=_cisTokens(cargo);
  if(!P.length||!C.length)return{s:0,ok:false};
  const cp=P.filter(p=>C.some(c=>_cisIgual(p,c))).length/P.length;
  const cc=C.filter(c=>P.some(p=>_cisIgual(p,c))).length/C.length;
  return{s:cp+cc,ok:cp>=0.75&&cc>=0.5&&cp+cc>=1.5};
}

// ── Tareo del período ───────────────────────────────────────────────────────
function _cisRango(periodo){
  const[y,m]=String(periodo).split('-').map(Number);
  const f=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
  return{desde:f(new Date(y,m-2,21)),hasta:f(new Date(y,m-1,20))};
}
function _cisTareo(proy,periodo){
  if(typeof hhVentaPeriodo!=='function')return null;
  const{desde,hasta}=_cisRango(periodo);
  const H=hhVentaPeriodo(desde,hasta,proy);
  const cargos=new Map();
  H.filas.forEach(r=>{
    if(!(r.inc>0))return;
    const k=String(r.cargo||'SIN CARGO').trim();
    if(!cargos.has(k))cargos.set(k,{cargo:k,personas:[],inc:0});
    const c=cargos.get(k), p=r.p||{};
    c.personas.push({nombre:[p.ape,p.nom].filter(Boolean).join(', ')||('#'+p.id),
      trab:r.trab,libre:r.libre,dlt:r.dlt,inc:r.inc});
    c.inc+=r.inc;
  });
  // Última fecha con marca de este proyecto dentro del período
  const proyDe=new Map((DB.personal||[]).map(p=>[+p.id,p.proy]));
  let ultima='';
  (DB.tareaje||[]).forEach(r=>{
    const f=String(r.fecha||'');
    if(f<desde||f>hasta)return;
    if(proy&&!(r.proy===proy||(!r.proy&&proyDe.get(+r.personalId)===proy)))return;
    if(f>ultima)ultima=f;
  });
  return{desde,hasta,nDias:H.nDias,cargos,ultima};
}

// ── Vínculos cargo → partida ────────────────────────────────────────────────
function _cisCargosGuardados(p){
  const v=p&&p.cargos;
  if(Array.isArray(v))return v.filter(Boolean).map(String);
  if(typeof v==='string'&&v.trim()){
    try{const a=JSON.parse(v);if(Array.isArray(a))return a.filter(Boolean).map(String);}catch(e){}
    return v.replace(/^\{|\}$/g,'').split(',').map(s=>s.replace(/^"|"$/g,'').trim()).filter(Boolean);
  }
  return[];
}
// Arma el mapa: primero lo guardado; los cargos del tareo que no están en
// ninguna partida se sugieren en la que mejor coincide por nombre.
function _cisIniciar(T){
  const hojas=_ciCalcular(_ciProyecto,_ciPeriodo,null).filas.filter(f=>f.hoja);
  const mapa=new Map(), asignados=new Set();
  hojas.forEach(h=>{
    const p=(DB.presupCIndi||[]).find(x=>+x.id===h.id);
    const cs=_cisCargosGuardados(p);
    mapa.set(h.id,new Set(cs));
    cs.forEach(c=>asignados.add(c));
  });
  _cisSugeridos=new Set();
  T.cargos.forEach((v,cargo)=>{
    if(asignados.has(cargo))return;
    let mejor=null;
    hojas.forEach(h=>{
      const r=_cisPuntaje(h.desc,cargo);
      if(r.ok&&(!mejor||r.s>mejor.s))mejor={id:h.id,s:r.s};
    });
    if(mejor){mapa.get(mejor.id).add(cargo);_cisSugeridos.add(cargo);}
  });
  _cisMapa=mapa;
}
function _cisPendientes(){
  if(!_cisMapa)return[];
  const out=[];
  _cisMapa.forEach((set,pid)=>{
    const p=(DB.presupCIndi||[]).find(x=>+x.id===+pid);if(!p)return;
    const a=[...set].sort(), b=_cisCargosGuardados(p).sort();
    if(a.join('')!==b.join(''))out.push({p,cargos:a});
  });
  return out;
}
function _cisAsignar(i,pid){
  const cargo=_cisNombres[+i];if(cargo==null||!_cisMapa)return;
  _cisMapa.forEach(set=>set.delete(cargo));
  if(pid!==''&&pid!=null&&_cisMapa.has(+pid))_cisMapa.get(+pid).add(cargo);
  _cisSugeridos.delete(cargo);
  rCostoIndirecto();
}
function _cisQuitar(pid,i){
  const cargo=_cisNombres[+i];if(cargo==null||!_cisMapa||!_cisMapa.has(+pid))return;
  _cisMapa.get(+pid).delete(cargo);
  _cisSugeridos.delete(cargo);
  rCostoIndirecto();
}
async function _cisGuardarVinculos(){
  const pend=_cisPendientes();
  if(!pend.length){toast('No hay vínculos nuevos que guardar');return;}
  let n=0;
  for(const{p,cargos}of pend){
    // Upsert con la fila completa: en Postgres un insert parcial fallaría por
    // las columnas obligatorias aunque la fila ya exista.
    const rec={id:+p.id,proyecto:p.proyecto,item:p.item,desc:p.desc,unidad:p.unidad||null,
      cantidad:_ciNum(p.cantidad),precioUnit:_ciNum(p.precioUnit),total:_ciNum(p.total),cargos};
    const err=await supaUpsert('presupCIndi',rec);
    if(err){
      if(/cargos/i.test(String(err.message||err)))
        toast('Falta la columna de cargos: corra sql/costo_indirecto_cargos.sql en Supabase',true);
      rCostoIndirecto();
      return;
    }
    p.cargos=cargos;
    cargos.forEach(c=>_cisSugeridos.delete(c));
    n++;
  }
  rCostoIndirecto();
  toast('✓ Vínculos guardados en '+n+' partida(s)');
}

// ── Pasar la simulación a la valorización ───────────────────────────────────
function _cisAplicar(){
  const T=_cisTareo(_ciProyecto,_ciPeriodo);
  if(!T||!_cisMapa)return;
  _ciCambios.clear();
  let n=0;const sinDias=[];
  _cisMapa.forEach((set,pid)=>{
    if(!set.size)return;
    const p=(DB.presupCIndi||[]).find(x=>+x.id===+pid);if(!p)return;
    let inc=0;set.forEach(c=>{const t=T.cargos.get(c);if(t)inc+=t.inc;});
    const cant=Math.round(inc*100)/100;
    // Una partida vinculada sin días no se pone en cero: eso borraría una
    // valorización ya guardada. Se deja como está y se avisa.
    if(!(cant>0)){sinDias.push(p.item);return;}
    _ciCambios.set(+pid,_ciAplicar({cantidad:null,total:null,manual:false},'cant',cant,_ciNum(p.precioUnit)));
    n++;
  });
  if(!n){toast('El tareo no tiene días que sumen para las partidas vinculadas',true);return;}
  _ciModo='valorizar';
  rCostoIndirecto();
  toast('✓ '+n+' partida(s) simuladas desde el tareo'+(sinDias.length?' · '+sinDias.length+' sin días':'')+' — revise y guarde');
}

// ── Pantalla ────────────────────────────────────────────────────────────────
function _cisPanelHTML(){
  const lab=_ciPerLabel(_ciPeriodo), mes=_ciPerMes(_ciPeriodo);
  const T=_cisTareo(_ciProyecto,_ciPeriodo);
  if(!T)return`<div class="card"><div class="card-body" style="padding:2rem;text-align:center;color:var(--muted2)">
    No se puede leer el tareo: el cálculo de HH Venta no está cargado.</div></div>`;
  const clave=_ciProyecto+'|'+_ciPeriodo;
  if(!_cisMapa||_cisClave!==clave){_cisIniciar(T);_cisClave=clave;}

  const D=_ciCalcular(_ciProyecto,_ciPeriodo,null);
  const hojas=D.filas.filter(f=>f.hoja);
  _cisNombres=[];
  const idx=c=>{let i=_cisNombres.indexOf(c);if(i<0){_cisNombres.push(c);i=_cisNombres.length-1;}return i;};
  const detalle=pers=>pers.map(p=>p.nombre+': '+p.trab+' d'+(p.libre?' + '+p.libre+' DL':'')
    +(p.dlt?' + '+p.dlt+' DLT':'')+' → '+p.inc.toFixed(2)).join('\n');

  const filas=hojas.map(h=>{
    const cs=[...(_cisMapa.get(h.id)||[])].sort((a,b)=>a.localeCompare(b));
    let inc=0;const pers=[];
    cs.forEach(c=>{const t=T.cargos.get(c);if(t){inc+=t.inc;pers.push(...t.personas);}});
    const cant=Math.round(inc*100)/100;
    return{h,cs,cant,pers,total:h.pu!=null?Math.round(cant*h.pu*100)/100:null};
  }).filter(x=>x.cs.length);
  const asignados=new Set(filas.flatMap(x=>x.cs));
  const sueltos=[...T.cargos.values()].filter(c=>!asignados.has(c.cargo)).sort((a,b)=>b.inc-a.inc);
  const nPend=_cisPendientes().length;
  const nSug=[..._cisSugeridos].filter(c=>asignados.has(c)).length;

  const TH='background:var(--panel2);color:var(--muted2);font-size:.6rem;font-weight:700;text-transform:uppercase;letter-spacing:.05em;padding:.4rem .5rem;white-space:nowrap;border-bottom:1px solid var(--border)';
  const TD='padding:.35rem .5rem;border-bottom:1px solid var(--border);font-size:.74rem;vertical-align:middle';
  const inpS='background:var(--panel2);border:1px solid var(--border);border-radius:6px;padding:.22rem .45rem;color:var(--text);font-size:.72rem;max-width:280px';

  const chip=(pid,c)=>{
    const sug=_cisSugeridos.has(c);
    return`<span title="${sug?'Sugerido por nombre: guárdelo o quítelo':'Vinculado'}" style="display:inline-flex;align-items:center;gap:3px;margin:1px 4px 1px 0;padding:1px 7px;border-radius:10px;font-size:.64rem;font-weight:700;border:1px ${sug?'dashed #fbbf24':'solid #a78bfa'};color:${sug?'#fbbf24':'#c4b5fd'};background:${sug?'rgba(251,191,36,.08)':'rgba(167,139,250,.1)'}">${_ciEsc(c)}<button onclick="_cisQuitar(${pid},${idx(c)})" title="Quitar este cargo de la partida" style="background:none;border:none;color:inherit;cursor:pointer;font-size:.6rem;padding:0 0 0 2px">✕</button></span>`;
  };

  let totSim=0,totVal=0;
  const cuerpo=filas.map(x=>{
    totSim+=x.total||0;totVal+=x.h.actTot||0;
    const dif=x.h.actCant!=null?x.cant-x.h.actCant:null;
    return`<tr>
      <td style="${TD};font-family:monospace;color:var(--muted2)">${_ciEsc(x.h.item)}</td>
      <td style="${TD};font-weight:600">${_ciEsc(x.h.desc)}</td>
      <td style="${TD};white-space:normal;max-width:320px">${x.cs.map(c=>chip(x.h.id,c)).join('')}</td>
      <td style="${TD};text-align:center" title="${_ciEsc(detalle(x.pers))}">${x.pers.length||'–'}</td>
      <td style="${TD};text-align:right;font-family:monospace;font-weight:800;color:#c4b5fd">${_ciM(x.cant)}</td>
      <td style="${TD};text-align:right;font-family:monospace">${_ciM(x.h.pu)}</td>
      <td style="${TD};text-align:right;font-family:monospace;font-weight:700;color:#c4b5fd">${_ciM(x.total)}</td>
      <td style="${TD};text-align:right;font-family:monospace;color:var(--muted2)">${_ciM(x.h.actCant)}</td>
      <td style="${TD};text-align:right;font-family:monospace;color:${dif==null||Math.abs(dif)<0.005?'var(--muted2)':dif>0?'#fbbf24':'#60a5fa'}">${dif==null?'':(dif>0?'+':'')+dif.toFixed(2)}</td>
    </tr>`;
  }).join('');

  const opts=hojas.map(h=>`<option value="${h.id}">${_ciEsc(h.item)} · ${_ciEsc(h.desc)}</option>`).join('');
  const cuerpoSueltos=sueltos.map(c=>`<tr>
      <td style="${TD};font-weight:600">${_ciEsc(c.cargo)}</td>
      <td style="${TD};text-align:center" title="${_ciEsc(detalle(c.personas))}">${c.personas.length}</td>
      <td style="${TD};text-align:right;font-family:monospace;font-weight:700">${_ciM(Math.round(c.inc*100)/100)}</td>
      <td style="${TD}"><select onchange="_cisAsignar(${idx(c.cargo)},this.value)" style="${inpS}"><option value="">— Asignar a partida —</option>${opts}</select></td>
    </tr>`).join('');

  return`
  <div style="margin:-.2rem 0 .8rem;padding:.5rem .8rem;border-left:3px solid var(--otr);background:rgba(167,139,250,.08);border-radius:0 6px 6px 0;font-size:.72rem;color:#c4b5fd;line-height:1.55">
    <strong>Simulación de ${lab} desde el tareo de ${_ciEsc(_ciProyecto)}</strong> ·
    ${_cisFechaDMY(T.desde)} al ${_cisFechaDMY(T.hasta)} (${T.nDias} días) ·
    ${T.ultima?'tareo registrado hasta el <strong>'+_cisFechaDMY(T.ultima)+'</strong>':'<strong>sin marcas en el período</strong>'}<br>
    CANT = días que cuentan ÷ ${T.nDias}, con la regla de HH Venta: TD, TN, A5 y DL = 1 · DLT = 2.5.
    Es lo registrado a la fecha: no se proyecta el período. Servicios y equipos no se simulan.
  </div>
  <div style="display:flex;gap:.45rem;flex-wrap:wrap;align-items:center;margin-bottom:.7rem">
    <button id="cis-guardar" class="btn btn-out btn-sm" onclick="_cisGuardarVinculos()"${nPend?'':' disabled'} title="Guarda qué cargo va en cada partida para los próximos meses">💾 Guardar vínculos${nPend?' ('+nPend+')':''}</button>
    <button class="btn btn-a" style="--ba:var(--otr)" onclick="_cisAplicar()"${filas.some(x=>x.cant>0)?'':' disabled'} title="Llena la valorización de ${lab} para revisarla y guardarla">✏ Pasar a Valorización ${mes}</button>
    ${nSug?`<span style="font-size:.68rem;color:#fbbf24">${nSug} cargo(s) sugerido(s) por nombre: revíselos</span>`:''}
  </div>
  <div class="card" style="margin-bottom:.8rem"><div class="card-body" style="padding:0">
    <div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;min-width:1000px">
      <thead><tr>
        <th style="${TH};text-align:left">Ítem</th><th style="${TH};text-align:left">Partida</th>
        <th style="${TH};text-align:left">Cargos vinculados</th><th style="${TH}">Personas</th>
        <th style="${TH};text-align:right;color:#c4b5fd">Cant. tareo</th><th style="${TH};text-align:right">P. Unit</th>
        <th style="${TH};text-align:right;color:#c4b5fd">Total simulado</th>
        <th style="${TH};text-align:right">Valorizado ${mes}</th><th style="${TH};text-align:right">Diferencia</th>
      </tr></thead>
      <tbody>${cuerpo||`<tr><td colspan="9" style="${TD};text-align:center;padding:1.6rem;color:var(--muted2)">Ninguna partida tiene cargos vinculados todavía. Asígnelos abajo.</td></tr>`}</tbody>
      ${filas.length?`<tfoot><tr style="background:#1b2a44">
        <td colspan="6" style="${TD};text-align:right;font-weight:800">TOTAL PERSONAL SIMULADO</td>
        <td style="${TD};text-align:right;font-family:monospace;font-weight:900;color:#c4b5fd">${_ciM(totSim)}</td>
        <td style="${TD};text-align:right;font-family:monospace;color:var(--muted2)">${_ciM(totVal)}</td>
        <td style="${TD}"></td>
      </tr></tfoot>`:''}
    </table></div>
  </div></div>
  <div class="card"><div class="card-head"><span class="card-title">Cargos del tareo sin partida</span>
    <span style="font-size:.7rem;color:var(--muted2)">${sueltos.length?sueltos.length+' cargo(s) no entran en la simulación':'todos los cargos con días están vinculados'}</span></div>
    ${sueltos.length?`<div class="card-body" style="padding:0"><div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse">
      <thead><tr><th style="${TH};text-align:left">Cargo</th><th style="${TH}">Personas</th><th style="${TH};text-align:right">Cant. tareo</th><th style="${TH};text-align:left">Partida</th></tr></thead>
      <tbody>${cuerpoSueltos}</tbody>
    </table></div></div>`:''}
  </div>
  <div style="font-size:.66rem;color:var(--muted2);margin-top:.45rem">
    Pase el cursor sobre "Personas" para ver los días de cada una · la diferencia compara con lo ya valorizado en ${lab} ·
    los vínculos sin guardar también se usan al pasar a la valorización
  </div>`;
}
function _cisFechaDMY(iso){const[y,m,d]=String(iso).split('-');return d+'/'+m+'/'+y;}
