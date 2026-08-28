// ══ TASAS DE PENSIONES (AFP / ONP) ══════════════════════════════════════════
// Las tasas dejan de estar escritas en el código: se administran acá y la
// planilla las lee de la tabla. Cada régimen guarda tres tasas:
//
//   oblig    · aporte obligatorio al fondo
//   prima    · seguro de invalidez y sobrevivencia (lo fija la SBS)
//   comision · comisión sobre flujo de la administradora
//
// La ONP es un régimen de tasa única: se carga todo en "oblig" (0.13) y las
// otras dos van en cero. La bandera esOnp la distingue, porque en la ONP el
// empleador no aporta el 12 % que sí corresponde en AFP.
//
// Nada se borra sin avisar cuánta gente lo tiene asignado.

let _afpEditId=null;

const _afpEsc=s=>String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const _afpPct=v=>(Number(v||0)*100).toFixed(2)+' %';
const _afpNorm=s=>String(s||'').trim().toUpperCase();
// Tasa con la que la planilla calcula hoy el aporte del empleador: mostrar un
// 12 % fijo mentía cuando la planilla lo tiene en 0.
const _afpTasaEmpl=()=>typeof _PL_APORTE_AFP_EMPL!=='undefined'?_PL_APORTE_AFP_EMPL:0.12;

// Régimen por nombre — la planilla entra por aquí
function afpTasaDe(nombre){
  const n=_afpNorm(nombre);
  if(!n)return null;
  return (DB.afpTasas||[]).find(t=>_afpNorm(t.nombre)===n)||null;
}
// Cuánta gente activa tiene asignado este régimen
function _afpCuantos(nombre){
  const n=_afpNorm(nombre);
  return (DB.personal||[]).filter(p=>_afpNorm(p.afp||'SNP')===n).length;
}
// Los nombres que el personal usa pero que no están en la tabla
function _afpHuerfanos(){
  const conocidos=new Set((DB.afpTasas||[]).map(t=>_afpNorm(t.nombre)));
  const falt={};
  (DB.personal||[]).forEach(p=>{
    const n=_afpNorm(p.afp||'SNP');
    if(!n||conocidos.has(n))return;
    falt[n]=(falt[n]||0)+1;
  });
  return Object.entries(falt).map(([nombre,n])=>({nombre,n})).sort((a,b)=>b.n-a.n);
}

// Semilla con lo que estaba escrito en el código, para arrancar sin tipear
//                         aporte   prima    comisión   total al trabajador
// Todo en mayúsculas, igual que la lista de los formularios y que lo que
// llega por CSV. El nombre no se usa para comparar — para eso está _afpNorm —
// pero verlo escrito igual en todos lados evita dudas.
const _AFP_SEMILLA=[
  {nombre:'ONP',       oblig:0.13,  prima:0,      comision:0,      esOnp:1},  // 13.00 %
  {nombre:'SNP',       oblig:0.13,  prima:0,      comision:0,      esOnp:1},  // 13.00 %
  {nombre:'HABITAT',   oblig:0.10,  prima:0.0137, comision:0.0147, esOnp:0},  // 12.84 %
  {nombre:'INTEGRA',   oblig:0.10,  prima:0.0137, comision:0.0155, esOnp:0},  // 12.92 %
  {nombre:'PRIMA',     oblig:0.10,  prima:0.0137, comision:0.0160, esOnp:0},  // 12.97 %
  {nombre:'PROFUTURO', oblig:0.10,  prima:0.0137, comision:0.0169, esOnp:0}   // 13.06 %
];
// Crea los que faltan y ACTUALIZA los que ya están con otras tasas. Antes solo
// creaba, así que al cambiar las comisiones no había forma de traerlas sin
// editar una por una.
async function _afpSembrar(){
  const faltan=_AFP_SEMILLA.filter(s=>!afpTasaDe(s.nombre));
  const difieren=_AFP_SEMILLA.map(s=>({s,t:afpTasaDe(s.nombre)}))
    .filter(({s,t})=>t&&(
      +t.oblig!==s.oblig||+t.prima!==s.prima||+t.comision!==s.comision||(+t.esOnp?1:0)!==s.esOnp||
      t.nombre!==s.nombre));

  if(!faltan.length&&!difieren.length){toast('La tabla ya está al día');return;}
  const det=[
    faltan.length?`Se crearán: ${faltan.map(f=>f.nombre).join(', ')}`:'',
    difieren.length?'Se actualizarán:\n'+difieren.map(({s,t})=>
      `  · ${s.nombre}: ${((+t.oblig+ +t.prima+ +t.comision)*100).toFixed(2)} % → ${((s.oblig+s.prima+s.comision)*100).toFixed(2)} %`).join('\n'):''
  ].filter(Boolean).join('\n\n');
  if(!confirm('Tasas de la lista base\n\n'+det+'\n\n¿Continuar?'))return;

  let creados=0,actualizados=0;
  for(const s of faltan){
    const rec={id:nidSeguro('afpt','afpTasas'),...s};
    (DB.afpTasas=DB.afpTasas||[]).push(rec);
    const err=await supaUpsert('afpTasas',rec);
    if(err){DB.afpTasas=DB.afpTasas.filter(x=>x.id!==rec.id);continue;}
    creados++;
  }
  for(const{s,t}of difieren){
    const prev={...t};
    t.nombre=s.nombre;t.oblig=s.oblig;t.prima=s.prima;t.comision=s.comision;t.esOnp=s.esOnp;
    const err=await supaUpsert('afpTasas',t);
    if(err){Object.assign(t,prev);continue;}
    actualizados++;
  }
  rAfpTasas();
  toast(`✓ ${creados} creado${creados!==1?'s':''} · ${actualizados} actualizado${actualizados!==1?'s':''}`);
}

// ── Alta / edición ─────────────────────────────────────────────────────────
function _afpNuevo(){_afpEditId=null;_afpForm({});}
function _afpEditar(id){
  const t=(DB.afpTasas||[]).find(x=>+x.id===+id);if(!t)return;
  _afpEditId=+id;_afpForm(t);
}
function _afpForm(t){
  const ov=document.getElementById('afpFormWrap');if(!ov)return;
  const inp='width:100%;box-sizing:border-box;background:var(--panel);border:1px solid var(--border);border-radius:6px;padding:.3rem .5rem;color:var(--text);font-size:.8rem;outline:none';
  const lb='font-size:.58rem;color:var(--muted2);text-transform:uppercase;letter-spacing:.07em;font-weight:700;display:block;margin-bottom:.15rem';
  // Se escriben en PORCENTAJE, que es como vienen de la SBS; se guardan en tasa
  ov.style.display='';
  ov.innerHTML=`
    <div style="background:var(--panel2);border:1px solid var(--adm);border-radius:9px;padding:.8rem">
      <div style="font-size:.8rem;font-weight:800;margin-bottom:.6rem">${_afpEditId?'✏️ Editar régimen':'＋ Nuevo régimen'}</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:.6rem">
        <div><label style="${lb}">Nombre</label><input id="afpNombre" value="${_afpEsc(t.nombre||'')}" placeholder="Ej: Integra" style="${inp}"></div>
        <div><label style="${lb}">Aporte oblig. %</label><input id="afpOblig" type="number" step="0.01" value="${((+t.oblig||0)*100).toFixed(2)}" style="${inp}"></div>
        <div><label style="${lb}">Prima seguro %</label><input id="afpPrima" type="number" step="0.0001" value="${((+t.prima||0)*100).toFixed(4)}" style="${inp}"></div>
        <div><label style="${lb}">Comisión flujo %</label><input id="afpComision" type="number" step="0.0001" value="${((+t.comision||0)*100).toFixed(4)}" style="${inp}"></div>
        <div><label style="${lb}">Régimen</label><select id="afpEsOnp" style="${inp}">
          <option value="0" ${!+t.esOnp?'selected':''}>AFP — privado</option>
          <option value="1" ${+t.esOnp?'selected':''}>ONP / SNP — público</option>
        </select></div>
      </div>
      <div style="font-size:.64rem;color:var(--muted2);margin-top:.5rem;line-height:1.5">
        En la <b>ONP</b> se carga todo en el aporte obligatorio (13 %) y las otras dos van en cero; además el empleador no aporta el 12 % que sí corresponde en AFP.
      </div>
      <div style="display:flex;gap:.4rem;margin-top:.7rem">
        <button onclick="_afpGuardar()" class="btn btn-a" style="--ba:var(--adm);flex:1">💾 Guardar</button>
        <button onclick="_afpCancelar()" class="btn btn-out">Cancelar</button>
      </div>
    </div>`;
}
function _afpCancelar(){_afpEditId=null;const o=document.getElementById('afpFormWrap');if(o){o.style.display='none';o.innerHTML='';}}

async function _afpGuardar(){
  const g=id=>(document.getElementById(id)||{}).value||'';
  const nombre=g('afpNombre').trim();
  if(!nombre){toast('Ingrese el nombre del régimen',true);return;}
  const rep=(DB.afpTasas||[]).find(t=>_afpNorm(t.nombre)===_afpNorm(nombre)&&+t.id!==+(_afpEditId||0));
  if(rep){toast('Ya existe un régimen con ese nombre',true);return;}
  const datos={
    nombre,
    oblig:+(+g('afpOblig')/100).toFixed(6),
    prima:+(+g('afpPrima')/100).toFixed(6),
    comision:+(+g('afpComision')/100).toFixed(6),
    esOnp:g('afpEsOnp')==='1'?1:0
  };
  if(_afpEditId){
    const t=(DB.afpTasas||[]).find(x=>+x.id===+_afpEditId);
    if(!t)return;
    const prev={...t};
    Object.assign(t,datos);
    const err=await supaUpsert('afpTasas',t);
    if(err){Object.assign(t,prev);return;}
    toast('Régimen actualizado');
  }else{
    const rec={id:nidSeguro('afpt','afpTasas'),...datos};
    (DB.afpTasas=DB.afpTasas||[]).push(rec);
    const err=await supaUpsert('afpTasas',rec);
    if(err){DB.afpTasas=DB.afpTasas.filter(x=>x.id!==rec.id);return;}
    toast('Régimen creado');
  }
  _afpCancelar();
  rAfpTasas();
}

// ── Baja, avisando a cuánta gente afecta ──────────────────────────────────
async function _afpBorrar(id){
  const t=(DB.afpTasas||[]).find(x=>+x.id===+id);if(!t)return;
  const n=_afpCuantos(t.nombre);
  const aviso=n>0
    ? `⚠ ${n} trabajador${n!==1?'es tienen':' tiene'} asignado "${t.nombre}".\n\n`+
      `Si lo elimina, a esa gente se le aplicará solo el aporte obligatorio del 10 % `+
      `y la planilla lo marcará como régimen sin tasa hasta que se le asigne otro.\n\n`+
      `¿Eliminar de todas formas?`
    : `¿Eliminar el régimen "${t.nombre}"? No hay nadie asignado a él.`;
  if(!confirm(aviso))return;
  DB.afpTasas=(DB.afpTasas||[]).filter(x=>+x.id!==+id);
  await supaDelete('afpTasas',id);
  rAfpTasas();
  toast('Régimen eliminado');
}

// ── Pantalla ───────────────────────────────────────────────────────────────
function rAfpTasas(){
  const pg=document.getElementById('page-afpTasas');if(!pg)return;
  const lista=[...(DB.afpTasas||[])].sort((a,b)=>(+b.esOnp)-(+a.esOnp)||String(a.nombre||'').localeCompare(String(b.nombre||''),'es'));
  const huerf=_afpHuerfanos();
  const AC='var(--adm)';

  const TD='padding:.45rem .7rem;border-bottom:1px solid var(--border);font-size:.8rem';
  const TH='background:var(--panel2);color:var(--muted2);font-size:.62rem;font-weight:700;text-transform:uppercase;letter-spacing:.06em;padding:.45rem .7rem';

  const filas=lista.map(t=>{
    const n=_afpCuantos(t.nombre);
    const total=(+t.oblig||0)+(+t.prima||0)+(+t.comision||0);
    const onp=+t.esOnp;
    return`<tr>
      <td style="${TD};font-weight:800;color:${onp?'#a78bfa':AC}">${_afpEsc(t.nombre)}
        <span style="font-size:.58rem;font-weight:700;border:1px solid ${onp?'#a78bfa':AC}55;color:${onp?'#a78bfa':AC};border-radius:4px;padding:0 .3rem;margin-left:.3rem">${onp?'ONP':'AFP'}</span></td>
      <td style="${TD};text-align:right;font-family:monospace">${_afpPct(t.oblig)}</td>
      <td style="${TD};text-align:right;font-family:monospace;color:${onp?'var(--muted)':'inherit'}">${_afpPct(t.prima)}</td>
      <td style="${TD};text-align:right;font-family:monospace;color:${onp?'var(--muted)':'inherit'}">${_afpPct(t.comision)}</td>
      <td style="${TD};text-align:right;font-family:monospace;font-weight:900;color:#ef4444">${_afpPct(total)}</td>
      <td style="${TD};text-align:center;font-family:monospace;color:${onp||!_afpTasaEmpl()?'var(--muted)':'#10b981'}">${(onp||!_afpTasaEmpl())?'—':_afpPct(_afpTasaEmpl())}</td>
      <td style="${TD};text-align:center">
        <span style="font-family:monospace;font-weight:800;color:${n?'var(--text)':'var(--muted)'}">${n}</span>
        <span style="font-size:.62rem;color:var(--muted2)"> trab.</span>
      </td>
      <td style="${TD};text-align:right;white-space:nowrap">
        <button onclick="_afpEditar(${t.id})" title="Editar" style="background:none;border:1px solid #f59e0b50;border-radius:5px;color:#f59e0b;cursor:pointer;font-size:.75rem;padding:.15rem .4rem">✏</button>
        <button onclick="_afpBorrar(${t.id})" title="Eliminar" style="background:none;border:1px solid #ef444450;border-radius:5px;color:#ef4444;cursor:pointer;font-size:.75rem;padding:.15rem .4rem;margin-left:.25rem">🗑</button>
      </td>
    </tr>`;
  }).join('');

  pg.innerHTML=`
    <div class="ph"><div class="ph-title" style="color:${AC}">🏦 Tasas de Pensiones</div><div class="ph-sub">AFP y ONP · las tasas que aplica la planilla al calcular el descuento previsional de cada trabajador</div></div>

    ${!lista.length?`<div style="background:rgba(59,130,246,.08);border:1px solid rgba(59,130,246,.35);border-radius:9px;padding:.8rem 1rem;margin-bottom:1rem">
      <div style="font-size:.85rem;font-weight:700;margin-bottom:.3rem">Todavía no hay regímenes cargados</div>
      <div style="font-size:.76rem;color:var(--muted2);margin-bottom:.6rem">Mientras la tabla esté vacía la planilla sigue usando las tasas que trae el código. Cárgalas para poder administrarlas.</div>
      <button onclick="_afpSembrar()" class="btn btn-a" style="--ba:var(--adm)">📥 Cargar ONP e AFP con las tasas actuales</button>
    </div>`:''}

    ${huerf.length?`<div style="background:rgba(245,158,11,.08);border:1px solid rgba(245,158,11,.35);border-radius:9px;padding:.6rem .8rem;margin-bottom:1rem;font-size:.76rem;color:#fbbf24;line-height:1.7">
      ⚠ Hay gente con un régimen que no está en esta tabla:<br>
      ${huerf.map(h=>`<b>${_afpEsc(h.nombre)}</b> — ${h.n} trabajador${h.n!==1?'es':''}`).join(' · ')}<br>
      <span style="color:var(--muted2)">A ellos solo se les aplica el 10 % obligatorio. Créalos aquí o corrige su ficha.</span>
    </div>`:''}

    <div id="afpFormWrap" style="display:none;margin-bottom:1rem"></div>

    <div class="card">
      <div class="card-head">
        <span class="card-title">🏦 Regímenes previsionales</span>
        <div class="card-head-right">
          ${lista.length?`<button onclick="_afpSembrar()" class="btn btn-out btn-sm" title="Crea los que falten y actualiza los que tengan otras tasas">📥 Sincronizar con la lista base</button>`:''}
          <button onclick="_afpNuevo()" class="btn btn-a" style="--ba:${AC}">＋ Nuevo régimen</button>
        </div>
      </div>
      <div class="card-body" style="padding:0"><div class="tbl-wrap"><table style="width:100%;border-collapse:collapse">
        <thead><tr>
          <th style="${TH};text-align:left">Régimen</th>
          <th style="${TH};text-align:right">Aporte oblig.</th>
          <th style="${TH};text-align:right">Prima seguro</th>
          <th style="${TH};text-align:right">Comisión</th>
          <th style="${TH};text-align:right">Total al trabajador</th>
          <th style="${TH};text-align:center">Aporte empleador</th>
          <th style="${TH};text-align:center">Asignados</th>
          <th style="${TH}"></th>
        </tr></thead>
        <tbody>${filas||`<tr><td colspan="8" style="${TD};text-align:center;padding:2.5rem;color:var(--muted2)">Sin regímenes cargados</td></tr>`}</tbody>
      </table></div></div>
    </div>`;
}
