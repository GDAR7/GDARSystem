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
  // La cabecera lleva el frente; al contraerse suma un resumen y se abre al
  // tocarla. Así un turno con varias actividades no se vuelve una lista eterna.
  return`<div class="pt-act" data-n="${i}">
    <div class="pt-act-head" onclick="_ptToggleActividad(this)">
      <div style="min-width:0;flex:1">
        <span class="pt-act-n">Actividad ${i} · <span class="pt-act-fr">${_ptEsc(frentes[0]||'')}</span></span>
        <div class="pt-act-res"></div>
      </div>
      <span class="pt-act-chev">▾</span>
      <button type="button" onclick="event.stopPropagation();_ptQuitarActividad(this)" class="pt-link">Quitar</button>
    </div>
    <label class="pt-f">Frente
      <select class="pt-frente" onchange="_ptPintarCabecera(this.closest('.pt-act'))">${frentes.map(f=>`<option>${_ptEsc(f)}</option>`).join('')}</select>
    </label>
    <div class="pt-ubic-row">
      <button type="button" class="pt-btn-mapa" onclick="_ptAbrirMapa(this)">📍 Marcar en el mapa</button>
      <span class="pt-ubic">Sin ubicar · opcional</span>
      <input type="hidden" class="pt-x"><input type="hidden" class="pt-y">
    </div>
    <label class="pt-f">Descripción del trabajo
      <textarea class="pt-desc" rows="3" placeholder="Ej.: limpieza de fundación con excavadora"></textarea>
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
// Resumen de una actividad para su cabecera contraída
function _ptResumenAct(act){
  if(!act)return'';
  const v=s=>{const el=act.querySelector(s);return el?String(el.value||'').trim():'';};
  const desc=v('.pt-desc').replace(/\s+/g,' ');
  const cant=v('.pt-cant'), un=v('.pt-unid');
  const nEq=act.querySelectorAll('input[type="checkbox"]:checked').length;
  const partes=[];
  partes.push(desc?(desc.length>60?desc.slice(0,60)+'…':desc):'⚠ sin descripción');
  if(cant!=='')partes.push(cant+' '+un);
  if(nEq)partes.push(nEq+' equipo'+(nEq===1?'':'s'));
  if(v('.pt-x')!=='')partes.push('📍');
  return partes.join(' · ');
}

// ══ UBICACIÓN EN LA IMAGEN AÉREA ════════════════════════════════════════════
// Se toca en la imagen dónde se hizo el trabajo. Los frentes son los mismos
// polígonos que se dibujan en Mapa de Proyecto → Frentes (campo `puntos`, en %
// de la imagen), así que si el toque cae dentro de uno, ese frente se elige
// solo. Fuera de todos, se guarda el punto y se respeta el frente elegido.
// Es opcional: varios frentes (canteras, Oyón…) no tienen área dibujada.
const _PT_MAPA_IMG='09.-ERP/Imagenes/R3_2026_IMAGEN.png';
const _PT_MAPA_ZOOMS=[100,175,250,350];
const _PT_COLORES=['#f59e0b','#10b981','#3b82f6','#8b5cf6','#ec4899','#06b6d4','#84cc16','#f97316','#14b8a6','#a78bfa'];
let _ptMapAct=null, _ptMapPt=null, _ptMapZ=0;

// Los frentes que tienen área dibujada en la imagen aérea
function _ptFrentesMapa(){
  return (DB.frentesTrabajo||[])
    .filter(f=>Array.isArray(f.puntos)&&f.puntos.length>=3)
    .map(f=>({nombre:String(f.nombre||f.nom||'').trim(),puntos:f.puntos}))
    .filter(f=>f.nombre)
    .sort((a,b)=>a.nombre.localeCompare(b.nombre,'es'))
    .map((f,i)=>({...f,col:_PT_COLORES[i%_PT_COLORES.length]}));
}
// Punto dentro de polígono (trazado de rayo)
function _ptPuntoEnPoligono(p,pts){
  let dentro=false;
  for(let i=0,j=pts.length-1;i<pts.length;j=i++){
    const a=pts[i],b=pts[j];
    if(((a.y>p.y)!==(b.y>p.y))&&(p.x<(b.x-a.x)*(p.y-a.y)/((b.y-a.y)||1e-9)+a.x))dentro=!dentro;
  }
  return dentro;
}
function _ptAreaPoligono(pts){
  let s=0;
  for(let i=0,j=pts.length-1;i<pts.length;j=i++)s+=(pts[j].x+pts[i].x)*(pts[j].y-pts[i].y);
  return Math.abs(s/2);
}
// El frente en el que cae el punto. Si cae en dos (uno dentro de otro, como
// C. Huantajalla y C. Huantajalla 1A), gana el más chico: es el más preciso.
function _ptFrenteEnPunto(p){
  if(!p)return null;
  const hits=_ptFrentesMapa().filter(f=>_ptPuntoEnPoligono(p,f.puntos));
  if(!hits.length)return null;
  hits.sort((a,b)=>_ptAreaPoligono(a.puntos)-_ptAreaPoligono(b.puntos));
  return hits[0].nombre;
}
function _ptUbicTexto(act){
  if(!act)return;
  const el=act.querySelector('.pt-ubic');if(!el)return;
  const x=(act.querySelector('.pt-x')||{}).value, y=(act.querySelector('.pt-y')||{}).value;
  if(x===''||x==null){el.textContent='Sin ubicar · opcional';el.style.color='';return;}
  const fr=_ptFrenteEnPunto({x:+x,y:+y});
  el.textContent='📍 '+(fr||'Fuera de los frentes dibujados')+' · '+(+x).toFixed(1)+'%, '+(+y).toFixed(1)+'%';
  el.style.color='#10b981';
}

function _ptAbrirMapa(btn){
  const act=btn&&btn.closest('.pt-act');if(!act)return;
  _ptMapAct=act;
  const x=(act.querySelector('.pt-x')||{}).value, y=(act.querySelector('.pt-y')||{}).value;
  _ptMapPt=(x!==''&&x!=null)?{x:+x,y:+y}:null;
  let ov=document.getElementById('ptMapa');
  if(!ov){
    ov=document.createElement('div');
    ov.id='ptMapa';
    document.body.appendChild(ov);
  }
  ov.style.cssText='position:fixed;inset:0;z-index:300;background:rgba(5,8,15,.92);display:flex;flex-direction:column;padding:env(safe-area-inset-top,0px) 0 env(safe-area-inset-bottom,0px)';
  _ptMapaPintar();
}
function _ptMapaPintar(){
  const ov=document.getElementById('ptMapa');if(!ov||!_ptMapAct)return;
  const n=_ptMapAct.dataset?_ptMapAct.dataset.n:'';
  const sel=(_ptMapAct.querySelector('.pt-frente')||{}).value||'';
  const frentes=_ptFrentesMapa();
  const z=_PT_MAPA_ZOOMS[_ptMapZ];
  const fr=_ptFrenteEnPunto(_ptMapPt);
  const poligonos=frentes.map(f=>{
    const on=f.nombre===(fr||sel);
    return`<polygon points="${f.puntos.map(p=>(+p.x).toFixed(2)+','+(+p.y).toFixed(2)).join(' ')}"
      fill="${f.col}" fill-opacity="${on?.38:.14}" stroke="${f.col}" stroke-width="${on?3:1.5}"
      vector-effect="non-scaling-stroke"/>`;
  }).join('');
  // Rótulos en HTML: dentro del SVG estirado se deformarían
  const rotulos=frentes.map(f=>{
    const cx=f.puntos.reduce((s,p)=>s+(+p.x),0)/f.puntos.length;
    const cy=f.puntos.reduce((s,p)=>s+(+p.y),0)/f.puntos.length;
    return`<div style="position:absolute;left:${cx}%;top:${cy}%;transform:translate(-50%,-50%);font:700 11px sans-serif;color:${f.col};text-shadow:0 0 3px #000,0 0 3px #000;white-space:nowrap;pointer-events:none">${_ptEsc(f.nombre)}</div>`;
  }).join('');
  const pin=_ptMapPt?`<div style="position:absolute;left:${_ptMapPt.x}%;top:${_ptMapPt.y}%;transform:translate(-50%,-100%);font-size:28px;line-height:1;pointer-events:none;filter:drop-shadow(0 2px 3px #000)">📍</div>`:'';
  const estado=_ptMapPt
    ?(fr?`📍 <b style="color:#10b981">${_ptEsc(fr)}</b> · se elegirá este frente`
        :`📍 Fuera de los frentes dibujados · se queda <b>${_ptEsc(sel)}</b>`)
    :'Toque en la imagen el lugar donde se hizo el trabajo';
  const bt='font-size:.8rem;padding:.55rem .8rem;border-radius:7px;cursor:pointer;font-weight:700;white-space:nowrap';
  ov.innerHTML=`
    <div style="display:flex;align-items:center;gap:.5rem;padding:.6rem .8rem;border-bottom:1px solid #ffffff18;color:#e2e8f0">
      <b style="flex:1;font-size:.9rem">📍 Ubicación · Actividad ${_ptEsc(n)}</b>
      <button type="button" onclick="_ptMapaZoom(-1)" style="${bt};background:#ffffff12;border:1px solid #ffffff25;color:#e2e8f0">−</button>
      <span style="font-size:.75rem;min-width:42px;text-align:center">${z}%</span>
      <button type="button" onclick="_ptMapaZoom(1)" style="${bt};background:#ffffff12;border:1px solid #ffffff25;color:#e2e8f0">+</button>
      <button type="button" onclick="_ptMapaCerrar()" style="${bt};background:none;border:none;color:#e2e8f0;font-size:1.1rem">✕</button>
    </div>
    <div id="ptMapaScroll" style="flex:1;overflow:auto;-webkit-overflow-scrolling:touch;touch-action:pan-x pan-y">
      <div id="ptMapaBox" onclick="_ptMapaToque(event)" style="position:relative;width:${z}%;cursor:crosshair">
        <img src="${_PT_MAPA_IMG}" alt="Imagen aérea del proyecto" draggable="false" style="display:block;width:100%;user-select:none;pointer-events:none">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" style="position:absolute;inset:0;width:100%;height:100%;pointer-events:none">${poligonos}</svg>
        ${rotulos}${pin}
      </div>
    </div>
    <div style="padding:.7rem .8rem;border-top:1px solid #ffffff18;display:flex;flex-direction:column;gap:.55rem;color:#cbd5e1">
      <div style="font-size:.82rem">${estado}</div>
      <div style="display:flex;gap:.45rem;flex-wrap:wrap">
        <button type="button" onclick="_ptMapaQuitar()" style="${bt};background:none;border:1px solid #ef444470;color:#f87171">Quitar ubicación</button>
        <button type="button" onclick="_ptMapaCerrar()" style="${bt};background:none;border:1px solid #ffffff30;color:#e2e8f0">Cancelar</button>
        <button type="button" onclick="_ptMapaUsar()" ${_ptMapPt?'':'disabled'} style="${bt};flex:1;border:none;background:${_ptMapPt?'#f59e0b':'#f59e0b55'};color:#111">✓ Usar este punto</button>
      </div>
    </div>`;
}
// Convierte el toque a % de la imagen: vale igual con cualquier zoom o scroll
function _ptMapaToque(ev){
  const box=document.getElementById('ptMapaBox');if(!box)return;
  const r=box.getBoundingClientRect();
  if(!r.width||!r.height)return;
  const x=Math.max(0,Math.min(100,(ev.clientX-r.left)/r.width*100));
  const y=Math.max(0,Math.min(100,(ev.clientY-r.top)/r.height*100));
  _ptMapPt={x:+x.toFixed(2),y:+y.toFixed(2)};
  const sc=document.getElementById('ptMapaScroll');
  const pos=sc?{l:sc.scrollLeft,t:sc.scrollTop}:null;
  _ptMapaPintar();
  // Al repintar no se pierde el lugar donde estaba mirando
  const sc2=document.getElementById('ptMapaScroll');
  if(sc2&&pos){sc2.scrollLeft=pos.l;sc2.scrollTop=pos.t;}
}
function _ptMapaZoom(d){
  _ptMapZ=Math.max(0,Math.min(_PT_MAPA_ZOOMS.length-1,_ptMapZ+d));
  _ptMapaPintar();
}
function _ptMapaUsar(){
  if(!_ptMapAct||!_ptMapPt)return;
  const act=_ptMapAct;
  const ix=act.querySelector('.pt-x'), iy=act.querySelector('.pt-y');
  if(ix)ix.value=_ptMapPt.x;
  if(iy)iy.value=_ptMapPt.y;
  // Si cayó dentro de un frente dibujado, ese frente se elige en la lista
  const fr=_ptFrenteEnPunto(_ptMapPt);
  const sel=act.querySelector('.pt-frente');
  if(fr&&sel&&[...sel.options].some(o=>o.value===fr))sel.value=fr;
  _ptUbicTexto(act);
  _ptPintarCabecera(act);
  _ptMapaCerrar();
}
function _ptMapaQuitar(){
  if(_ptMapAct){
    const ix=_ptMapAct.querySelector('.pt-x'), iy=_ptMapAct.querySelector('.pt-y');
    if(ix)ix.value='';
    if(iy)iy.value='';
    _ptUbicTexto(_ptMapAct);
    _ptPintarCabecera(_ptMapAct);
  }
  _ptMapaCerrar();
}
function _ptMapaCerrar(){
  const ov=document.getElementById('ptMapa');
  if(ov){ov.innerHTML='';ov.style.display='none';}
  _ptMapAct=null;_ptMapPt=null;
}
function _ptPintarCabecera(act){
  if(!act)return;
  const fr=act.querySelector('.pt-frente'), lbl=act.querySelector('.pt-act-fr');
  if(fr&&lbl)lbl.textContent=fr.value||'';
  const res=act.querySelector('.pt-act-res');
  if(res)res.textContent=act.classList.contains('pt-colapsada')?_ptResumenAct(act):'';
  const ch=act.querySelector('.pt-act-chev');
  if(ch)ch.textContent=act.classList.contains('pt-colapsada')?'▸':'▾';
}
function _ptColapsar(act,on){
  if(!act)return;
  act.classList.toggle('pt-colapsada',!!on);
  _ptPintarCabecera(act);
}
function _ptToggleActividad(head){
  const act=head&&head.closest('.pt-act');if(!act)return;
  _ptColapsar(act,!act.classList.contains('pt-colapsada'));
}
function _ptAgregarActividad(){
  const c=document.getElementById('ptActs');if(!c)return;
  // Las anteriores se contraen: queda a la vista solo la que se está llenando
  [...c.querySelectorAll('.pt-act')].forEach(a=>_ptColapsar(a,true));
  c.insertAdjacentHTML('beforeend',_ptFilaActividad());
  const nueva=c.lastElementChild;
  if(nueva&&nueva.scrollIntoView)nueva.scrollIntoView({behavior:'smooth',block:'start'});
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
    const x=v('.pt-x'), y=v('.pt-y');
    return{
      frente:v('.pt-frente'),
      descripcion:String(v('.pt-desc')||'').trim(),
      cantidad:cant===''?null:+cant,
      unidad:v('.pt-unid'),
      equipos:[...a.querySelectorAll('input[type="checkbox"]:checked')].map(c=>c.value),
      // Punto tocado en la imagen aérea, en % de la imagen (igual que los
      // polígonos de los frentes). null si no se marcó: es opcional.
      ubicacion:(x!==''&&y!=='')?{x:+x,y:+y}:null
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
  .pt-act-head{display:flex;justify-content:space-between;align-items:center;gap:.5rem;cursor:pointer}
  .pt-act-n{font-size:.62rem;font-weight:800;letter-spacing:.11em;text-transform:uppercase;color:#f59e0b}
  .pt-act-fr{color:var(--text);letter-spacing:.04em}
  .pt-act-res{font-size:.74rem;color:var(--muted2);margin-top:.2rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .pt-act-res:empty{display:none}
  .pt-act-chev{color:var(--muted2);font-size:.8rem}
  /* Contraída: solo la cabecera con el frente y el resumen */
  .pt-act.pt-colapsada>:not(.pt-act-head){display:none}
  .pt-act.pt-colapsada{padding:.55rem .75rem;background:var(--panel)}
  .pt-ubic-row{display:flex;align-items:center;gap:.6rem;flex-wrap:wrap}
  .pt-btn-mapa{font-size:.78rem;padding:.5rem .8rem;border-radius:7px;border:1px solid #10b98170;
    background:rgba(16,185,129,.12);color:#10b981;cursor:pointer;font-weight:700;white-space:nowrap}
  .pt-ubic{font-size:.74rem;color:var(--muted2);min-width:0}
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
