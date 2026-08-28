// ══ RECURSOS DE ATENCIÓN MECÁNICA ═══════════════════════════════════════════
// El descuento por atención mecánica ya no es "horas × una tarifa": se calcula
// en dos pasos, como en el formato del cliente.
//
//   Paso 1 · cuántas horas se atendió y quién atendió  →  Total (1)
//   Paso 2 · qué recursos se emplearon y cuánto cuesta cada hora suya
//
//        Parcial (5) = (1) × Cantidad (2) × Participación (3) × C.U.H. (4)
//
// El C.U.H. se calcula con la incidencia y las horas del período, igual que la
// venta de HH:
//
//        C.U.H. = tarifa mes de venta × incidencia ÷ horas del período
//        horas del período = días del período × horas por día
//
// Para los equipos (p. ej. la camioneta) sale de la tarifa del Máster: si es por
// hora se usa tal cual, si es mensual se prorratea igual que arriba. Y siempre
// se puede fijar un C.U.H. a mano cuando el recurso no tiene tarifa (el desgaste
// de herramientas manuales, por ejemplo).

let _arHorasDia=+localStorage.getItem('_arHorasDia')||8;
let _arEditId=null;

const _arEsc=s=>String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const _arN=(v,d)=>Number(v||0).toLocaleString('es-PE',{minimumFractionDigits:d==null?2:d,maximumFractionDigits:d==null?2:d});
const _arNorm=s=>String(s||'').toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^A-Z0-9]+/g,' ').trim();

// Lista por defecto, con la estructura del formato del cliente
const _AR_DEF=[
  {nombre:'Jefe de Equipos',      cargo:'JEFE DE EQUIPOS',     eqCodigo:'', cantidad:1, participacion:0.10, cuhManual:0, usaManual:0, orden:10},
  {nombre:'Mecánico',             cargo:'MECANICO',            eqCodigo:'', cantidad:1, participacion:1,    cuhManual:0, usaManual:0, orden:20, fuenteCant:'mec'},
  {nombre:'Ayudante mecánico',    cargo:'AYUDANTE MECANICO',   eqCodigo:'', cantidad:1, participacion:1,    cuhManual:0, usaManual:0, orden:30, fuenteCant:'ayudante'},
  {nombre:'Camioneta Full',       cargo:'',                    eqCodigo:'', cantidad:1, participacion:1,    cuhManual:0, usaManual:0, orden:40},
  {nombre:'Desg. de H. Manuales', cargo:'',                    eqCodigo:'', cantidad:1, participacion:0.05, cuhManual:23.90, usaManual:1, orden:50}
];

const _arLista=()=>[...(DB.atencionRecursos||[])].sort((a,b)=>(+a.orden||0)-(+b.orden||0));

// ── C.U.H. de un recurso ───────────────────────────────────────────────────
// Devuelve el valor y de dónde salió, para poder mostrarlo en pantalla.
function arCuh(r,per){
  if(+r.usaManual)return{cuh:+r.cuhManual||0,fuente:'fijo'};
  const dias=Math.max(1,+(per&&per.dias)||30);
  const horasPer=dias*Math.max(1,_arHorasDia);

  // Personal: tarifa de venta del cargo (HH Venta) × incidencia ÷ horas
  if(r.cargo){
    const inc=_arIncidencia(r.cargo,per);
    const tar=_arTarifaCargo(r.cargo);
    if(!tar)return{cuh:0,fuente:'sin tarifa',detalle:'el cargo no está en HH Venta'};
    return{cuh:+(tar*inc/horasPer).toFixed(4),fuente:'HH Venta',
      detalle:`${_arN(tar)} × inc ${inc.toFixed(4)} ÷ ${horasPer} h`};
  }
  // Equipo: tarifa de venta del Máster
  if(r.eqCodigo){
    const eq=(DB.equipos||[]).find(e=>_arNorm(e.codigo)===_arNorm(r.eqCodigo));
    if(!eq)return{cuh:0,fuente:'sin equipo',detalle:'no existe ese código'};
    const t=typeof _ccMatchEq==='function'?_ccMatchEq(eq):null;
    const tarifa=t?(+t.seca||+t.full||0):(+eq.tarifa||0);
    const un=(t&&t.un)||eq.tarifaUn||'HM';
    if(!tarifa)return{cuh:0,fuente:'sin tarifa',detalle:'el equipo no tiene tarifa de venta'};
    if(un==='HM')return{cuh:+tarifa.toFixed(4),fuente:'Tarifas Eq.',detalle:'tarifa por hora'};
    return{cuh:+(tarifa/horasPer).toFixed(4),fuente:'Tarifas Eq.',detalle:`${_arN(tarifa)} ÷ ${horasPer} h`};
  }
  return{cuh:0,fuente:'sin origen',detalle:'sin cargo ni equipo · fije un C.U.H.'};
}

// Tarifa mes de venta del cargo, de HH Venta
function _arTarifaCargo(cargo){
  const n=_arNorm(cargo);
  const v=(DB.ventaPersonal||[]).find(t=>_arNorm(t.cargo)===n);
  if(v&&+v.tarifaMes>0)return +v.tarifaMes;
  if(typeof _ccMatchHH==='function'){const m=_ccMatchHH(cargo);if(m&&+m.mes>0)return +m.mes;}
  return 0;
}
// Incidencia media del cargo en el período — misma regla que HH Venta
function _arIncidencia(cargo,per){
  if(!per||!per.desde||!per.hasta)return 1;
  if(typeof hhVentaPeriodo!=='function')return 1;
  const n=_arNorm(cargo);
  const filas=hhVentaPeriodo(per.desde,per.hasta).filas.filter(f=>_arNorm(f.cargo)===n);
  if(!filas.length)return 1;                       // nadie de ese cargo: no se castiga
  return +(filas.reduce((s,f)=>s+f.inc,0)/filas.length).toFixed(4);
}

// ── Cálculo del cuadro ─────────────────────────────────────────────────────
// Recibe la LISTA de atenciones — cada una con sus horas y cuántos la
// atendieron — o, por compatibilidad, un número con las horas totales.
// Con "cantidad automática" el recurso toma los que realmente atendieron cada
// vez: una atención con un mecánico y otra con dos no cuestan lo mismo.
function arCalcular(atenciones,per){
  const lista=Array.isArray(atenciones)
    ? atenciones.map(a=>({horas:+a.horas||0,nMec:+a.nMec||0,nAyu:+a.nAyu||0}))
    : [{horas:+atenciones||0,nMec:0,nAyu:0}];
  const H=lista.reduce((s,a)=>s+a.horas,0);

  const filas=_arLista().map(r=>{
    const c=arCuh(r,per);
    const part=+r.participacion||0;
    // fuenteCant: de dónde sale la cantidad. '' = la escrita a mano;
    // 'mec' = los mecánicos del auxilio; 'ayudante' = los ayudantes.
    const fte=String(r.fuenteCant||(+r.autoCant?'mec':''));
    const auto=fte==='mec'||fte==='ayudante';
    const fija=+r.cantidad||0;
    const nDe=a=>fte==='mec'?a.nMec:fte==='ayudante'?a.nAyu:fija;
    // Σ (horas de cada atención × cuántos hubo en ella)
    const hxc=lista.reduce((s,a)=>s+a.horas*nDe(a),0);
    const bruto=hxc*part*c.cuh;
    // Cantidad equivalente: hace que (1)×(2)×(3)×(4) del cuadro impreso
    // reproduzca exactamente el parcial, aunque cada atención tuviera otra.
    const cantEq=H>0?+(hxc/H).toFixed(2):fija;
    const rango=auto?[...new Set(lista.filter(a=>a.horas>0).map(nDe))].sort():[];
    return{r,nombre:r.nombre,cantidad:cantEq,cantFija:fija,auto,fuente_cant:fte,rango,
      participacion:part,cuh:c.cuh,fuente:c.fuente,detalle:c.detalle,
      bruto,parcial:+bruto.toFixed(2)};
  });
  // El total suma los parciales SIN redondear y recién ahí redondea, igual que
  // la hoja del cliente. Sumar los ya redondeados daba un céntimo de más.
  return{horas:H,filas,atenciones:lista,total:+filas.reduce((s,f)=>s+f.bruto,0).toFixed(2)};
}

// ── Alta de la lista por defecto ───────────────────────────────────────────
async function _arSembrar(){
  const faltan=_AR_DEF.filter(d=>!(DB.atencionRecursos||[]).some(r=>_arNorm(r.nombre)===_arNorm(d.nombre)));
  if(!faltan.length){toast('Ya están cargados');return;}
  for(const d of faltan){
    const rec={id:nidSeguro('arec','atencionRecursos'),...d};
    (DB.atencionRecursos=DB.atencionRecursos||[]).push(rec);
    const err=await supaUpsert('atencionRecursos',rec);
    if(err){DB.atencionRecursos=DB.atencionRecursos.filter(x=>x.id!==rec.id);}
  }
  _arRender();
  toast(`✓ ${faltan.length} recurso(s) cargado(s)`);
}

function _arSetHorasDia(v){
  _arHorasDia=Math.max(1,+v||8);
  localStorage.setItem('_arHorasDia',_arHorasDia);
  _arRender();
}

async function _arGuardarCampo(id,campo,valor){
  const r=(DB.atencionRecursos||[]).find(x=>+x.id===+id);if(!r)return;
  const prev=r[campo];
  if(campo==='participacion')r[campo]=+(+valor/100).toFixed(6);
  else if(campo==='cantidad'||campo==='cuhManual'||campo==='orden')r[campo]=+valor||0;
  else if(campo==='usaManual')r[campo]=valor?1:0;
  else if(campo==='fuenteCant')r[campo]=String(valor||'');
  else r[campo]=String(valor||'').trim();
  const err=await supaUpsert('atencionRecursos',r);
  if(err){r[campo]=prev;return;}
  _arRender();
}
async function _arNuevo(){
  const nombre=prompt('Nombre del recurso:','');
  if(!nombre||!nombre.trim())return;
  const max=Math.max(0,..._arLista().map(r=>+r.orden||0));
  const rec={id:nidSeguro('arec','atencionRecursos'),nombre:nombre.trim(),cargo:'',eqCodigo:'',
    cantidad:1,participacion:1,cuhManual:0,usaManual:1,fuenteCant:'',orden:max+10};
  (DB.atencionRecursos=DB.atencionRecursos||[]).push(rec);
  const err=await supaUpsert('atencionRecursos',rec);
  if(err){DB.atencionRecursos=DB.atencionRecursos.filter(x=>x.id!==rec.id);return;}
  _arRender();
}
async function _arBorrar(id){
  const r=(DB.atencionRecursos||[]).find(x=>+x.id===+id);if(!r)return;
  if(!confirm(`¿Quitar "${r.nombre}" del cuadro de recursos?`))return;
  DB.atencionRecursos=(DB.atencionRecursos||[]).filter(x=>+x.id!==+id);
  await supaDelete('atencionRecursos',id);
  _arRender();
}

// ── Panel de configuración, dentro de EDP Proveedores ──────────────────────
function _arRender(){
  const c=document.getElementById('arPanel');if(!c)return;
  const per=(typeof _edpDesde!=='undefined'&&_edpDesde&&_edpHasta)
    ? {desde:_edpDesde,hasta:_edpHasta,dias:Math.max(1,Math.round((new Date(_edpHasta+'T12:00')-new Date(_edpDesde+'T12:00'))/864e5)+1)}
    : null;
  const lista=_arLista();
  const inp='background:var(--panel);border:1px solid var(--border);border-radius:5px;color:var(--text);padding:.15rem .3rem;font-size:.7rem;width:64px;text-align:right;font-family:monospace';
  const TD='padding:.3rem .45rem;border-bottom:1px solid var(--border);font-size:.72rem';
  const TH='background:var(--panel2);color:var(--muted2);font-size:.58rem;font-weight:700;text-transform:uppercase;letter-spacing:.05em;padding:.3rem .45rem';

  const filas=lista.map(r=>{
    const cu=arCuh(r,per);
    const malo=!cu.cuh&&!+r.usaManual;
    return`<tr>
      <td style="${TD};font-weight:700">${_arEsc(r.nombre)}
        <div style="font-size:.58rem;color:var(--muted2);font-weight:400">${_arEsc(r.cargo||r.eqCodigo||(+r.usaManual?'valor fijo':'sin origen'))}</div></td>
      <td style="${TD};text-align:right">
        ${(()=>{const fte=String(r.fuenteCant||'');const auto=fte==='mec'||fte==='ayudante';
          return auto
            ?`<span style="font-family:monospace;font-weight:700;color:#10b981" title="Sale de los auxilios mecánicos: no se digita">del auxilio</span>`
            :`<input type="number" step="0.5" min="0" value="${+r.cantidad||0}" onchange="_arGuardarCampo(${r.id},'cantidad',this.value)" style="${inp}">`;})()}
        <div style="font-size:.55rem;margin-top:2px">
          <select onchange="_arGuardarCampo(${r.id},'fuenteCant',this.value)" style="background:var(--panel);border:1px solid var(--border);border-radius:4px;color:var(--muted2);font-size:.55rem;padding:0 .2rem;width:auto">
            <option value=""          ${!r.fuenteCant?'selected':''}>a mano</option>
            <option value="mec"       ${r.fuenteCant==='mec'?'selected':''}>mecánicos</option>
            <option value="ayudante"  ${r.fuenteCant==='ayudante'?'selected':''}>ayudantes</option>
          </select>
        </div>
      </td>
      <td style="${TD};text-align:right"><input type="number" step="1" min="0" value="${((+r.participacion||0)*100).toFixed(0)}" onchange="_arGuardarCampo(${r.id},'participacion',this.value)" style="${inp}"> %</td>
      <td style="${TD};text-align:right">
        ${+r.usaManual
          ?`<input type="number" step="0.01" min="0" value="${+r.cuhManual||0}" onchange="_arGuardarCampo(${r.id},'cuhManual',this.value)" style="${inp}">`
          :`<span style="font-family:monospace;font-weight:700;color:${malo?'#ef4444':'inherit'}">${_arN(cu.cuh)}</span>`}
        <div style="font-size:.55rem;color:${malo?'#ef4444':'var(--muted2)'}">${_arEsc(cu.detalle||cu.fuente)}</div>
      </td>
      <td style="${TD};text-align:center">
        <input type="checkbox" ${+r.usaManual?'checked':''} onchange="_arGuardarCampo(${r.id},'usaManual',this.checked)" title="Fijar el C.U.H. a mano" style="width:auto">
      </td>
      <td style="${TD};text-align:right">
        <button onclick="_arBorrar(${r.id})" style="background:none;border:1px solid #ef444450;border-radius:5px;color:#ef4444;cursor:pointer;font-size:.7rem;padding:.1rem .35rem">🗑</button>
      </td>
    </tr>`;
  }).join('');

  c.innerHTML=`
    <div style="display:flex;align-items:center;gap:.5rem;flex-wrap:wrap;margin-bottom:.5rem">
      <span style="font-size:.62rem;color:var(--muted2);text-transform:uppercase;letter-spacing:.07em;font-weight:700">Horas por día</span>
      <input type="number" min="1" max="24" value="${_arHorasDia}" onchange="_arSetHorasDia(this.value)" style="${inp}">
      <span style="font-size:.66rem;color:var(--muted2)">${per?`· período de ${per.dias} días = <b>${per.dias*_arHorasDia} h</b> para prorratear`:'· elija un período'}</span>
      <button onclick="_arNuevo()" class="btn btn-out btn-sm" style="margin-left:auto">＋ Recurso</button>
      ${lista.length?'':'<button onclick="_arSembrar()" class="btn btn-a btn-sm" style="--ba:var(--adm)">📥 Cargar lista base</button>'}
    </div>
    <div style="border:1px solid var(--border);border-radius:8px;overflow:hidden">
      <table style="width:100%;border-collapse:collapse">
        <thead><tr>
          <th style="${TH};text-align:left">Tipo de recurso</th>
          <th style="${TH};text-align:right">Cant. (2)</th>
          <th style="${TH};text-align:right">Particip. (3)</th>
          <th style="${TH};text-align:right">C.U.H. (4)</th>
          <th style="${TH};text-align:center">Fijo</th>
          <th style="${TH}"></th>
        </tr></thead>
        <tbody>${filas||`<tr><td colspan="6" style="${TD};text-align:center;padding:1.5rem;color:var(--muted2)">Sin recursos · cargue la lista base</td></tr>`}</tbody>
      </table>
    </div>`;
}
