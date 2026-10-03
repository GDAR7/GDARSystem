// ══════════════════════════════════════════════════════════════════════════
//  OPERACIONES · PARTE DE TURNO
//
//  Formulario de registro pensado para el campo: se llena desde el celular,
//  al terminar el turno, por gente que solo tiene acceso a este módulo.
//
//  No reemplaza al parte diario de equipos: aquel mide horómetros y horas para
//  valorizar; este deja constancia de QUÉ se hizo, en qué frente, con qué
//  equipos, y de las horas perdidas por clima — el sustento para pedir
//  ampliación de plazo.
//
//  Solo registra: al guardar se limpia y queda listo para el siguiente. No
//  lista lo ya registrado; eso se consulta desde la oficina.
//
//  Los frentes y los equipos salen de los catálogos del sistema, no de listas
//  fijas: lo que se registre aquí habla el mismo idioma que el resto.
//
//  Prefijo _pt.
// ══════════════════════════════════════════════════════════════════════════

const _PT_UNIDADES=['viajes','m³','m²','m lineales','horas','global'];
const _PT_CLIMAS=['Despejado','Nublado','Lluvia ligera','Lluvia fuerte','Granizo','Nevada','Neblina'];
// Los eventos que paralizan el frente: solo estos suman horas perdidas
const _PT_CLIMA_PARA=/lluvia|granizo|nevada|neblina/i;

let _ptNAct=0;                    // cuántas filas de actividad lleva el formulario

const _ptEsc=s=>String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;')
  .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const _ptHoy=()=>{const d=new Date();return new Date(d.getTime()-d.getTimezoneOffset()*6e4).toISOString().slice(0,10);};

// Horas entre dos horas del día; si el fin es menor, cruzó la medianoche
function _ptHorasEntre(ini,fin){
  if(!ini||!fin)return 0;
  const a=String(ini).split(':').map(Number), b=String(fin).split(':').map(Number);
  if(a.length<2||b.length<2||!isFinite(a[0])||!isFinite(b[0]))return 0;
  let m=(b[0]*60+(b[1]||0))-(a[0]*60+(a[1]||0));
  if(m<0)m+=1440;
  return Math.round(m/60*100)/100;
}

// ── Catálogos del sistema ───────────────────────────────────────────────────
function _ptFrentes(){
  const f=(DB.frentesTrabajo||[]).map(x=>String(x.nombre||'').trim()).filter(Boolean);
  return f.length?[...new Set(f)].sort((a,b)=>a.localeCompare(b,'es')):['(sin frentes cargados)'];
}
// Los equipos que se pueden marcar: los operativos, por código
function _ptEquipos(){
  return (DB.equipos||[]).filter(e=>String(e.est||'')!=='Desmovilizado')
    .map(e=>String(e.codigo||'').trim()).filter(Boolean)
    .sort((a,b)=>a.localeCompare(b,'es'));
}

// ── Filas de actividad ──────────────────────────────────────────────────────
function _ptFilaActividad(){
  const i=++_ptNAct;
  const frentes=_ptFrentes(), equipos=_ptEquipos();
  return`<div class="pt-act" data-n="${i}">
    <div class="pt-act-head">
      <span class="pt-act-n">Actividad ${i}</span>
      <button type="button" onclick="_ptQuitarActividad(this)" class="pt-link">Quitar</button>
    </div>
    <label class="pt-f">Frente
      <select class="pt-frente">${frentes.map(f=>`<option>${_ptEsc(f)}</option>`).join('')}</select>
    </label>
    <label class="pt-f">Descripción del trabajo
      <input type="text" class="pt-desc" placeholder="Ej.: limpieza de fundación con excavadora">
    </label>
    <div class="pt-qty">
      <label class="pt-f">Cantidad
        <input type="number" class="pt-cant" min="0" step="0.01" inputmode="decimal" placeholder="0">
      </label>
      <label class="pt-f">Unidad
        <select class="pt-unid">${_PT_UNIDADES.map(u=>`<option>${_ptEsc(u)}</option>`).join('')}</select>
      </label>
    </div>
    <div class="pt-f">Equipos empleados
      <div class="pt-chips">${equipos.map((e,k)=>`
        <input type="checkbox" id="ptEq${i}_${k}" value="${_ptEsc(e)}">
        <label for="ptEq${i}_${k}">${_ptEsc(e)}</label>`).join('')}
        ${equipos.length?'':'<span class="pt-hint">Sin equipos cargados</span>'}
      </div>
    </div>
  </div>`;
}
function _ptAgregarActividad(){
  const c=document.getElementById('ptActs');if(!c)return;
  c.insertAdjacentHTML('beforeend',_ptFilaActividad());
}
function _ptQuitarActividad(btn){
  const c=document.getElementById('ptActs');if(!c)return;
  if(c.children.length<=1){toast('Debe quedar al menos una actividad',true);return;}
  const fila=btn.closest('.pt-act');
  if(fila)fila.remove();
}
function _ptLeerActividades(){
  return [...document.querySelectorAll('#ptActs .pt-act')].map(a=>{
    const v=s=>{const el=a.querySelector(s);return el?el.value:'';};
    const cant=v('.pt-cant');
    return{
      frente:v('.pt-frente'),
      descripcion:String(v('.pt-desc')||'').trim(),
      cantidad:cant===''?null:+cant,
      unidad:v('.pt-unid'),
      equipos:[...a.querySelectorAll('input[type="checkbox"]:checked')].map(c=>c.value)
    };
  }).filter(a=>a.descripcion!=='');
}

// ── Horas perdidas por clima ────────────────────────────────────────────────
function _ptActualizarHoras(){
  const el=document.getElementById('ptHorasHint');if(!el)return;
  const ini=(document.getElementById('ptClimaIni')||{}).value||'';
  const fin=(document.getElementById('ptClimaFin')||{}).value||'';
  const clima=(document.getElementById('ptClima')||{}).value||'';
  const h=_ptHorasEntre(ini,fin);
  if(h&&_PT_CLIMA_PARA.test(clima)){
    el.textContent='Se registrarán '+h+' hora(s) de paralización por '+clima.toLowerCase()+'.';
    el.style.color='#f59e0b';
  }else if(h){
    el.textContent='Son '+h+' hora(s), pero «'+clima+'» no paraliza el frente: no suman horas perdidas.';
    el.style.color='var(--muted2)';
  }else{
    el.textContent='Si hubo lluvia u otro evento que paralizó el frente, marque la hora de inicio y fin: se calculan las horas perdidas para el sustento de ampliación de plazo.';
    el.style.color='var(--muted2)';
  }
}

// ── Guardar ─────────────────────────────────────────────────────────────────
async function _ptGuardar(){
  const v=id=>{const el=document.getElementById(id);return el?String(el.value||'').trim():'';};
  const fecha=v('ptFecha')||_ptHoy();
  const autor=v('ptAutor');
  if(!autor){toast('Escriba quién registra el parte',true);return;}
  const acts=_ptLeerActividades();
  if(!acts.length){toast('Describa al menos una actividad',true);return;}

  const turnoEl=document.querySelector('input[name="ptTurno"]:checked');
  const turno=turnoEl?turnoEl.value:'Día';
  const clima=v('ptClima'), climaIni=v('ptClimaIni'), climaFin=v('ptClimaFin');
  const h=_ptHorasEntre(climaIni,climaFin);
  // Solo paraliza el frente lo que de verdad lo paraliza
  const horasPerdidas=_PT_CLIMA_PARA.test(clima)?h:0;

  const btn=document.getElementById('ptGuardar');
  if(btn){btn.disabled=true;btn.textContent='Guardando…';}

  DB.partesTurno=DB.partesTurno||[];
  const rec={
    id:nidSeguro('ptur','partesTurno'),
    fecha,turno,actividades:acts,
    clima,climaObs:v('ptClimaObs'),climaIni,climaFin,horasPerdidas,
    pendiente:v('ptPendiente'),observaciones:v('ptObs'),
    autor,
    creadoPor:(typeof CU!=='undefined'&&CU?String(CU.nombre||CU.codigo||''):'')||null,
    creadoEn:new Date().toISOString()
  };
  DB.partesTurno.push({...rec});
  const err=await supaUpsert('partesTurno',rec);
  if(btn){btn.disabled=false;btn.textContent='💾 Guardar parte';}
  if(err){DB.partesTurno=DB.partesTurno.filter(x=>+x.id!==+rec.id);return;}

  try{localStorage.setItem('gdar_pt_autor',autor);}catch(e){}
  // Listo para el siguiente: se conservan fecha, turno y quién registra
  _ptLimpiar(false);
  toast('✓ Parte de turno guardado'+(horasPerdidas?' · '+horasPerdidas+' h perdidas':''));
}

// Limpia el formulario. Con todo=true borra también fecha, turno y autor.
function _ptLimpiar(todo){
  const set=(id,val)=>{const el=document.getElementById(id);if(el)el.value=val;};
  _ptNAct=0;
  const c=document.getElementById('ptActs');
  if(c)c.innerHTML=_ptFilaActividad();
  set('ptClima','Despejado');set('ptClimaObs','');set('ptClimaIni','');set('ptClimaFin','');
  set('ptPendiente','');set('ptObs','');
  if(todo){
    set('ptFecha',_ptHoy());set('ptAutor','');
    const d=document.getElementById('ptTurnoDia');if(d)d.checked=true;
  }
  _ptActualizarHoras();
  if(c){const el=c.querySelector('.pt-desc');if(el)el.focus();}
}

// ── Pantalla ────────────────────────────────────────────────────────────────
function rParteTurno(){
  const pg=document.getElementById('page-parteTurno');if(!pg)return;
  let autor='';
  try{autor=localStorage.getItem('gdar_pt_autor')||'';}catch(e){}
  if(!autor&&typeof CU!=='undefined'&&CU)autor=String(CU.nombre||'');
  _ptNAct=0;

  pg.innerHTML=`
    <div class="ph">
      <div class="ph-title" style="color:#f59e0b">Parte de Turno</div>
      <div class="ph-sub">Registro de los trabajos ejecutados en el turno</div>
    </div>
    ${_ptEstilos()}
    <div class="card" style="max-width:720px">
      <div class="card-body pt-stack">
        <div class="pt-grid2">
          <label class="pt-f">Fecha del turno
            <input type="date" id="ptFecha" value="${_ptHoy()}">
          </label>
          <div class="pt-f">Turno
            <div class="pt-seg">
              <input type="radio" name="ptTurno" id="ptTurnoDia" value="Día" checked><label for="ptTurnoDia">Día</label>
              <input type="radio" name="ptTurno" id="ptTurnoNoche" value="Noche"><label for="ptTurnoNoche">Noche</label>
            </div>
          </div>
        </div>

        <hr class="pt-rule">
        <div class="pt-f">Actividades ejecutadas</div>
        <div id="ptActs" class="pt-stack">${_ptFilaActividad()}</div>
        <button type="button" class="btn btn-out" onclick="_ptAgregarActividad()" style="color:#f59e0b;border-color:#f59e0b60">＋ Agregar actividad</button>

        <hr class="pt-rule">
        <div class="pt-f">Clima
          <div class="pt-grid2">
            <select id="ptClima" onchange="_ptActualizarHoras()">${_PT_CLIMAS.map(c=>`<option>${c}</option>`).join('')}</select>
            <input type="text" id="ptClimaObs" placeholder="Detalle (opcional)">
          </div>
        </div>
        <div class="pt-grid2">
          <label class="pt-f">Inicio del evento
            <input type="time" id="ptClimaIni" onchange="_ptActualizarHoras()">
          </label>
          <label class="pt-f">Fin del evento
            <input type="time" id="ptClimaFin" onchange="_ptActualizarHoras()">
          </label>
        </div>
        <div class="pt-hint" id="ptHorasHint"></div>

        <hr class="pt-rule">
        <label class="pt-f">Pendiente para el siguiente turno
          <textarea id="ptPendiente" rows="2" placeholder="Ej.: quedó material inadecuado en Acceso Este para el arranque del turno día"></textarea>
        </label>
        <label class="pt-f">Observaciones
          <textarea id="ptObs" rows="2" placeholder="Ocurrencias, interferencias, paradas de equipo, seguridad…"></textarea>
        </label>
        <label class="pt-f">Registrado por
          <input type="text" id="ptAutor" value="${_ptEsc(autor)}" placeholder="Nombre y cargo">
        </label>

        <div style="display:flex;gap:.5rem;flex-wrap:wrap">
          <button type="button" class="btn btn-a" style="--ba:#f59e0b;flex:1;min-width:180px" id="ptGuardar" onclick="_ptGuardar()">💾 Guardar parte</button>
          <button type="button" class="btn btn-out" onclick="_ptLimpiar(true)">Limpiar</button>
        </div>
        <div class="pt-hint">Se guarda al instante. Para corregir uno ya guardado, avise a oficina.</div>
      </div>
    </div>`;
  _ptActualizarHoras();
}

// Estilos propios: el formulario es de campo, con campos grandes y en una sola
// columna cuando la pantalla es angosta.
function _ptEstilos(){
  return`<style>
  .pt-stack{display:flex;flex-direction:column;gap:.9rem}
  .pt-grid2{display:grid;grid-template-columns:1fr 1fr;gap:.7rem}
  @media(max-width:560px){.pt-grid2{grid-template-columns:1fr}}
  .pt-f{display:flex;flex-direction:column;gap:.3rem;font-size:.62rem;font-weight:700;
    letter-spacing:.07em;text-transform:uppercase;color:var(--muted2)}
  .pt-f input,.pt-f select,.pt-f textarea,#ptClima,#ptClimaObs{
    font-size:.86rem;padding:.55rem .6rem;border-radius:7px;border:1px solid var(--border);
    background:var(--panel2);color:var(--text);width:100%;box-sizing:border-box}
  .pt-rule{height:1px;background:var(--border);border:0;margin:.2rem 0}
  .pt-seg{display:flex;gap:.4rem}
  .pt-seg input{position:absolute;opacity:0;width:1px;height:1px}
  .pt-seg label{flex:1;text-align:center;border:1px solid var(--border);border-radius:7px;
    padding:.55rem .4rem;font-size:.85rem;font-weight:700;cursor:pointer;background:var(--panel2);
    color:var(--text);text-transform:none;letter-spacing:0}
  .pt-seg input:checked+label{background:#f59e0b;border-color:#f59e0b;color:#111}
  .pt-act{border:1px solid var(--border);border-radius:9px;padding:.75rem;background:var(--panel2);
    display:flex;flex-direction:column;gap:.6rem}
  .pt-act-head{display:flex;justify-content:space-between;align-items:center;gap:.5rem}
  .pt-act-n{font-size:.62rem;font-weight:800;letter-spacing:.11em;text-transform:uppercase;color:#f59e0b}
  .pt-link{background:none;border:0;color:var(--muted2);font-size:.68rem;font-weight:700;
    cursor:pointer;text-decoration:underline;padding:.2rem}
  .pt-link:hover{color:#f87171}
  .pt-qty{display:grid;grid-template-columns:1fr 1.1fr;gap:.6rem}
  .pt-chips{display:flex;flex-wrap:wrap;gap:.35rem;max-height:150px;overflow-y:auto;
    padding:.25rem;border:1px solid var(--border);border-radius:7px;background:var(--panel)}
  .pt-chips input{position:absolute;opacity:0;width:1px;height:1px}
  .pt-chips label{border:1px solid var(--border);border-radius:999px;padding:.3rem .7rem;
    font-size:.72rem;cursor:pointer;background:var(--panel2);color:var(--text);
    text-transform:none;letter-spacing:0;font-weight:500;font-family:monospace;white-space:nowrap}
  .pt-chips input:checked+label{background:rgba(245,158,11,.18);border-color:#f59e0b;color:#f59e0b;font-weight:700}
  .pt-hint{font-size:.7rem;color:var(--muted2);line-height:1.45}
  </style>`;
}
