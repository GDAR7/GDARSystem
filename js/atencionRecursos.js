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
  {nombre:'Jefe de Equipos',      cargo:'ING. SUPERVISOR DE MANTTO DE EQUIPOS', tarifaDesc:'', eqCodigo:'', cantidad:1, participacion:0.10, cuhManual:0,     usaManual:0, orden:10},
  {nombre:'Mecánico',             cargo:'MECANICO',                             tarifaDesc:'', eqCodigo:'', cantidad:1, participacion:1,    cuhManual:0,     usaManual:0, orden:20, fuenteCant:'mec'},
  {nombre:'Ayudante mecánico',    cargo:'AYUDANTE MECANICO',                    tarifaDesc:'', eqCodigo:'', cantidad:1, participacion:1,    cuhManual:0,     usaManual:0, orden:30, fuenteCant:'ayudante'},
  {nombre:'Camioneta Full',       cargo:'',  tarifaDesc:'Camioneta 4 Pasajeros', tarifaCol:'full', eqCodigo:'', cantidad:1, participacion:1, cuhManual:0,     usaManual:0, orden:40},
  // El desgaste es un 5 % de lo que costó la mano de obra que usó las
  // herramientas, no una tarifa propia.
  {nombre:'Desg. de H. Manuales', cargo:'', tarifaDesc:'', eqCodigo:'', cantidad:1, participacion:0.05, cuhManual:0, usaManual:0, baseDe:'Mecánico;Ayudante mecánico', orden:50}
];

// El mismo puesto se escribe distinto en cada sitio. Estos son los nombres con
// los que puede aparecer en HH Venta; el primero que exista manda.
const _AR_ALIAS={
  'JEFE DE EQUIPOS':['ING SUPERVISOR DE MANTTO DE EQUIPOS','SUPERVISOR DE MANTTO DE EQUIPOS','JEFE DE MANTENIMIENTO','JEFE DE MANTTO'],
  'ING SUPERVISOR DE MANTTO DE EQUIPOS':['JEFE DE EQUIPOS','JEFE DE MANTENIMIENTO','JEFE DE MANTTO'],
  'MECANICO':['MECANICO DE EQUIPOS','TECNICO MECANICO'],
  'AYUDANTE MECANICO':['AYUDANTE DE MECANICO','AUXILIAR MECANICO','AYUDANTE DE MANTENIMIENTO']
};

// Lo que hay configurado en la base. Solo esto se edita en el panel.
const _arLista=()=>[...(DB.atencionRecursos||[])].sort((a,b)=>(+a.orden||0)-(+b.orden||0));
// Lo que USA el cálculo: si todavía no se configuró nada, cae en la lista base.
// Así el cuadro del EDP se ve igual que el formato desde el primer día, sin
// obligar a cargar nada primero.
function _arListaCalc(){
  const g=_arLista();
  if(g.length)return g;
  return _AR_DEF.map((d,i)=>({id:-(i+1),...d})).sort((a,b)=>(+a.orden||0)-(+b.orden||0));
}

// ── C.U.H. de un recurso ───────────────────────────────────────────────────
// Devuelve el valor y de dónde salió, para poder mostrarlo en pantalla.
// La incidencia de un recurso: la escrita a mano si la hay, y si no la que
// sale de HH Venta. Vacía o cero = automática, así nada cambia hasta que
// alguien decida cambiarlo.
function arIncidenciaDe(r,per,auto){
  const m=+((r&&r.incidencia)||0);
  if(m>0)return{inc:m,manual:true};
  return{inc:auto==null?1:auto,manual:false};
}
function arCuh(r,per){
  if(+r.usaManual)return{cuh:+r.cuhManual||0,fuente:'fijo'};
  const dias=Math.max(1,+(per&&per.dias)||30);
  const horasPer=dias*Math.max(1,_arHorasDia);

  // Personal: tarifa de venta del cargo (HH Venta) × incidencia ÷ horas
  if(r.cargo){
    const t=_arTarifaCargo(r.cargo);
    if(!t)return{cuh:0,fuente:'sin tarifa',detalle:'el cargo no está en HH Venta'};
    const I=arIncidenciaDe(r,per,_arIncidencia(t.cargo,per));
    const otro=_arNorm(t.cargo)!==_arNorm(r.cargo)?_arEsc(t.cargo)+' · ':'';
    return{cuh:+(t.mes*I.inc/horasPer).toFixed(4),fuente:'HH Venta',inc:I.inc,incManual:I.manual,
      detalle:otro+`${_arN(t.mes)} × inc ${I.inc.toFixed(4)}${I.manual?' (fijada)':''} ÷ ${horasPer} h`};
  }
  // Tarifa del cuadro de Tarifas de Equipos, elegida a dedo (p. ej. la
  // camioneta: no es una unidad del Máster, es la tarifa contractual)
  if(r.tarifaDesc){
    const t=_arTarifaEqDesc(r.tarifaDesc);
    if(!t)return{cuh:0,fuente:'sin tarifa',detalle:'esa tarifa no está en Tarifas de Equipos'};
    const col=String(r.tarifaCol||'full')==='seca'?'seca':'full';
    const val=col==='seca'?(+t.tarifaSeca||0):(+t.tarifaFull||0);
    if(!val)return{cuh:0,fuente:'sin tarifa',detalle:'la tarifa '+col+' está en cero'};
    const un=t.unidad||'HM';
    const I=arIncidenciaDe(r,per,1);
    const _ix=I.manual?' × inc '+I.inc.toFixed(4):'';
    if(un!=='MES')return{cuh:+(val*I.inc).toFixed(4),fuente:'Tarifas Eq.',inc:I.inc,incManual:I.manual,
      detalle:col+' · por hora'+_ix};
    return{cuh:+(val*I.inc/horasPer).toFixed(4),fuente:'Tarifas Eq.',inc:I.inc,incManual:I.manual,
      detalle:`${col} ${_arN(val)}${_ix} ÷ ${horasPer} h`};
  }
  // Equipo: tarifa de venta del Máster
  if(r.eqCodigo){
    const eq=(DB.equipos||[]).find(e=>_arNorm(e.codigo)===_arNorm(r.eqCodigo));
    if(!eq)return{cuh:0,fuente:'sin equipo',detalle:'no existe ese código'};
    const t=typeof _ccMatchEq==='function'?_ccMatchEq(eq):null;
    const tarifa=t?(+t.seca||+t.full||0):(+eq.tarifa||0);
    const un=(t&&t.un)||eq.tarifaUn||'HM';
    if(!tarifa)return{cuh:0,fuente:'sin tarifa',detalle:'el equipo no tiene tarifa de venta'};
    const I=arIncidenciaDe(r,per,1);
    const _ix=I.manual?' × inc '+I.inc.toFixed(4):'';
    if(un==='HM')return{cuh:+(tarifa*I.inc).toFixed(4),fuente:'Tarifas Eq.',inc:I.inc,incManual:I.manual,
      detalle:'tarifa por hora'+_ix};
    return{cuh:+(tarifa*I.inc/horasPer).toFixed(4),fuente:'Tarifas Eq.',inc:I.inc,incManual:I.manual,
      detalle:`${_arN(tarifa)}${_ix} ÷ ${horasPer} h`};
  }
  return{cuh:0,fuente:'sin origen',detalle:'elija de dónde sale su costo'};
}

// El cargo tal como está escrito en HH Venta: primero el nombre exacto, luego
// los alias conocidos y al final por contenido, para no fallar por un "ING."
// de más o de menos.
function _arResolverCargo(cargo){
  const lista=(DB.ventaPersonal||[]).filter(t=>+t.tarifaMes>0);
  if(!cargo||!lista.length)return null;
  const n=_arNorm(cargo);
  let v=lista.find(t=>_arNorm(t.cargo)===n);
  if(v)return v;
  for(const a of(_AR_ALIAS[n]||[])){
    v=lista.find(t=>_arNorm(t.cargo)===_arNorm(a));
    if(v)return v;
  }
  return lista.find(t=>{const c=_arNorm(t.cargo);return c&&(c.includes(n)||n.includes(c));})||null;
}
// Tarifa mes de venta del cargo, de HH Venta
function _arTarifaCargo(cargo){
  const v=_arResolverCargo(cargo);
  if(v)return{mes:+v.tarifaMes,cargo:v.cargo};
  if(typeof _ccMatchHH==='function'){const m=_ccMatchHH(cargo);if(m&&+m.mes>0)return{mes:+m.mes,cargo:m.lab||cargo};}
  return null;
}
// Una tarifa del cuadro de Tarifas de Equipos, por su descripción
function _arTarifaEqDesc(desc){
  const l=DB.tarifasEq||[];
  if(!desc||!l.length)return null;
  const n=_arNorm(desc);
  return l.find(t=>_arNorm(t.desc)===n)||l.find(t=>_arNorm(t.desc).includes(n))||null;
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
// Recursos cuyo costo se deriva de otros: el desgaste de herramientas es un
// porcentaje de lo que costó la mano de obra que las usó, no una tarifa suya.
// baseDe = nombres de los recursos cuyos parciales se suman, separados por ";".
const _arBaseLista=r=>String((r&&r.baseDe)||'').split(/[;,]/).map(x=>x.trim()).filter(Boolean);
const _arEsDerivado=r=>_arBaseLista(r).length>0;

function arCalcular(atenciones,per){
  const lista=Array.isArray(atenciones)
    ? atenciones.map(a=>({horas:+a.horas||0,nMec:+a.nMec||0,nAyu:+a.nAyu||0}))
    : [{horas:+atenciones||0,nMec:0,nAyu:0}];
  const H=lista.reduce((s,a)=>s+a.horas,0);

  // Dos pasadas: los derivados necesitan el parcial de los otros ya hecho.
  const _todos=_arListaCalc();
  const _hechos={};
  const calcFila=r=>{
    const derivado=_arEsDerivado(r);
    // El C.U.H. derivado se divide entre las horas porque el parcial vuelve a
    // multiplicarlas: así (1)×(2)×(3)×(4) da exactamente el % de la suma,
    // trabaje una hora o veinte.
    const c=derivado?(()=>{
      const nombres=_arBaseLista(r);
      const suma=nombres.reduce((t,n)=>t+(+(_hechos[_arNorm(n)]||0)),0);
      const falta=nombres.filter(n=>_hechos[_arNorm(n)]===undefined);
      return{cuh:H>0?+(suma/H).toFixed(4):0,fuente:'suma de otros',
        detalle:nombres.join(' + ')+' = '+_arN(suma)+(falta.length?' · no se encontró: '+falta.join(', '):'')};
    })():arCuh(r,per);
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
      participacion:part,cuh:c.cuh,fuente:c.fuente,detalle:c.detalle,derivado,
      bruto,parcial:+bruto.toFixed(2)};
  };
  const filas=[
    ..._todos.filter(r=>!_arEsDerivado(r)).map(f=>{const x=calcFila(f);_hechos[_arNorm(f.nombre)]=x.bruto;return x;}),
    ..._todos.filter(_arEsDerivado).map(calcFila)
  // Se devuelven en el orden configurado, no en el de cálculo
  ].sort((a,b)=>(+a.r.orden||0)-(+b.r.orden||0));
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

// Los recursos de la lista base todavía no están en la tabla: llevan id
// negativo. La primera vez que se toca uno se guarda la lista entera y desde
// ahí se trabaja sobre lo guardado.
async function _arMaterializar(){
  if((DB.atencionRecursos||[]).length)return true;
  const nuevos=[];
  for(const d of _AR_DEF){
    const rec={id:nidSeguro('arec','atencionRecursos'),...d};
    (DB.atencionRecursos=DB.atencionRecursos||[]).push(rec);
    const err=await supaUpsert('atencionRecursos',rec);
    if(err){
      // Lo más probable: falta crear la tabla en Supabase. Se deshace todo para
      // no dejar media lista guardada.
      DB.atencionRecursos=(DB.atencionRecursos||[]).filter(x=>x.id!==rec.id&&!nuevos.includes(x.id));
      toast('No se pudo guardar: revise que exista la tabla atencion_recursos en Supabase · '+(err.message||err),true);
      return false;
    }
    nuevos.push(rec.id);
  }
  toast('✓ Lista de recursos guardada · ya se puede editar');
  return true;
}
async function _arGuardarCampo(id,campo,valor){
  let r=(DB.atencionRecursos||[]).find(x=>+x.id===+id);
  if(!r){
    // Id negativo = viene de la lista base y aún no está guardada
    const base=_AR_DEF[Math.abs(+id)-1];
    if(!base){toast('No se encontró ese recurso',true);return;}
    if(!await _arMaterializar())return;
    r=(DB.atencionRecursos||[]).find(x=>_arNorm(x.nombre)===_arNorm(base.nombre));
    if(!r){toast('No se encontró ese recurso',true);return;}
  }
  const prev={...r};                       // el origen toca varios campos a la vez
  if(campo==='participacion')r[campo]=+(+valor/100).toFixed(6);
  else if(campo==='cantidad'||campo==='cuhManual'||campo==='orden')r[campo]=+valor||0;
  else if(campo==='incidencia')r[campo]=Math.max(0,+valor||0);   // 0 = automática
  else if(campo==='usaManual')r[campo]=valor?1:0;
  else if(campo==='fuenteCant')r[campo]=String(valor||'');
  else if(campo==='baseDe')r[campo]=String(valor||'').trim();
  else if(campo==='origen'){
    const s=String(valor||'');
    r.cargo='';r.tarifaDesc='';r.tarifaCol='';r.eqCodigo='';r.usaManual=0;r.baseDe='';
    if(s==='f')r.usaManual=1;
    else if(s.slice(0,2)==='b:')r.baseDe=s.slice(2);
    else if(s.slice(0,2)==='c:')r.cargo=s.slice(2);
    else if(s.slice(0,2)==='t:'){const p=s.slice(2),i=p.indexOf(':');r.tarifaCol=p.slice(0,i);r.tarifaDesc=p.slice(i+1);}
    else if(s.slice(0,2)==='e:')r.eqCodigo=s.slice(2);
  }
  else r[campo]=String(valor||'').trim();
  const err=await supaUpsert('atencionRecursos',r);
  if(err){Object.assign(r,prev);return;}
  _arRender();
}

// ── De dónde sale el costo del recurso, en un solo valor ───────────────────
function _arOrigenVal(r){
  if(_arEsDerivado(r))return'b:'+r.baseDe;
  if(+r.usaManual)return'f';
  if(r.cargo)return'c:'+r.cargo;
  if(r.tarifaDesc)return't:'+(String(r.tarifaCol||'full'))+':'+r.tarifaDesc;
  if(r.eqCodigo)return'e:'+r.eqCodigo;
  return'';
}
function _arOrigenOpts(r){
  const v=_arOrigenVal(r);
  const op=(val,txt)=>`<option value="${_arEsc(val)}"${v===val?' selected':''}>${_arEsc(txt)}</option>`;
  let h=op('','— elegir origen —')+op('f','Valor fijo (a mano)');
  // Suma de los parciales de otros recursos (el desgaste de herramientas)
  const otros=_arListaCalc().filter(x=>x.nombre!==r.nombre&&!_arEsDerivado(x)).map(x=>x.nombre);
  if(otros.length){
    h+='<optgroup label="% de la suma de otros">';
    const manoObra=otros.filter(n=>/mec[aá]nico/i.test(n));
    if(manoObra.length>1)h+=op('b:'+manoObra.join(';'),manoObra.join(' + '));
    otros.forEach(n=>h+=op('b:'+n,n));
    h+='</optgroup>';
  }
  const cargos=[...new Set((DB.ventaPersonal||[]).filter(t=>+t.tarifaMes>0).map(t=>t.cargo))].sort();
  if(cargos.length)h+='<optgroup label="HH Venta · cargo">'+cargos.map(c=>op('c:'+c,c)).join('')+'</optgroup>';
  const tf=[...(DB.tarifasEq||[])].sort((a,b)=>String(a.desc||'').localeCompare(String(b.desc||'')));
  if(tf.length){
    h+='<optgroup label="Tarifas Eq. · Full">'+tf.map(t=>op('t:full:'+t.desc,t.desc+' · '+_arN(t.tarifaFull)+' '+(t.unidad||'HM'))).join('')+'</optgroup>';
    h+='<optgroup label="Tarifas Eq. · Seca">'+tf.map(t=>op('t:seca:'+t.desc,t.desc+' · '+_arN(t.tarifaSeca)+' '+(t.unidad||'HM'))).join('')+'</optgroup>';
  }
  // Si apunta a algo que ya no está en las listas, no perderlo de vista
  if(v&&h.indexOf('value="'+_arEsc(v)+'"')<0)h+=op(v,v.replace(/^[cte]:/,'')+' (ya no existe)');
  return h;
}
async function _arNuevo(){
  const nombre=prompt('Nombre del recurso:','');
  if(!nombre||!nombre.trim())return;
  const max=Math.max(0,..._arLista().map(r=>+r.orden||0));
  const rec={id:nidSeguro('arec','atencionRecursos'),nombre:nombre.trim(),cargo:'',tarifaDesc:'',tarifaCol:'',eqCodigo:'',
    cantidad:1,participacion:1,cuhManual:0,usaManual:1,fuenteCant:'',incidencia:0,orden:max+10};
  (DB.atencionRecursos=DB.atencionRecursos||[]).push(rec);
  const err=await supaUpsert('atencionRecursos',rec);
  if(err){DB.atencionRecursos=DB.atencionRecursos.filter(x=>x.id!==rec.id);return;}
  _arRender();
}
async function _arBorrar(id){
  let r=(DB.atencionRecursos||[]).find(x=>+x.id===+id);
  if(!r){
    const base=_AR_DEF[Math.abs(+id)-1];
    if(!base)return;
    if(!confirm(`¿Quitar "${base.nombre}" del cuadro de recursos?`))return;
    if(!await _arMaterializar())return;
    r=(DB.atencionRecursos||[]).find(x=>_arNorm(x.nombre)===_arNorm(base.nombre));
    if(!r)return;
    DB.atencionRecursos=(DB.atencionRecursos||[]).filter(x=>+x.id!==+r.id);
    await supaDelete('atencionRecursos',r.id);
    _arRender();
    return;
  }
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
  // Lo mismo que se imprime: si la tabla está vacía se ven igual los cinco de
  // la lista base. Antes el cuadro los mostraba y el panel salía en blanco, así
  // que no había forma de tocarlos.
  const lista=_arListaCalc();
  const _sinGuardar=!_arLista().length;
  const inp='background:var(--panel);border:1px solid var(--border);border-radius:5px;color:var(--text);padding:.15rem .3rem;font-size:.7rem;width:64px;text-align:right;font-family:monospace';
  const TD='padding:.3rem .45rem;border-bottom:1px solid var(--border);font-size:.72rem';
  const TH='background:var(--panel2);color:var(--muted2);font-size:.58rem;font-weight:700;text-transform:uppercase;letter-spacing:.05em;padding:.3rem .45rem';

  const filas=lista.map(r=>{
    const cu=arCuh(r,per);
    const malo=!cu.cuh&&!+r.usaManual;
    return`<tr>
      <td style="${TD};font-weight:700">${_arEsc(r.nombre)}
        <div style="margin-top:2px">
          <select onchange="_arGuardarCampo(${r.id},'origen',this.value)" title="De dónde sale el C.U.H." style="background:var(--panel);border:1px solid ${_arOrigenVal(r)?'var(--border)':'#ef444470'};border-radius:5px;color:var(--muted2);font-size:.58rem;padding:1px .2rem;max-width:230px">
            ${_arOrigenOpts(r)}
          </select>
        </div></td>
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
        ${(()=>{
          if(+r.usaManual)return '<span style="color:var(--muted2);font-size:.62rem">no aplica</span>';
          // La automática se muestra de marca de agua: así se ve qué se está
          // anulando antes de escribir encima.
          const auto=cu.inc!=null&&!cu.incManual?cu.inc:(r.cargo?_arIncidencia(r.cargo,per):1);
          const man=+r.incidencia||0;
          return `<input type="number" step="0.0001" min="0" value="${man>0?man:''}"
            placeholder="${Number(auto||1).toFixed(4)}" title="Vacío = la que calcula HH Venta"
            onchange="_arGuardarCampo(${r.id},'incidencia',this.value)"
            style="${inp};width:72px${man>0?';border-color:#f59e0b;color:#f59e0b':''}">`;
        })()}
        <div style="font-size:.55rem;color:${(+r.incidencia>0?'#f59e0b':'var(--muted2)')}">${(+r.incidencia>0?'fijada':'automática')}</div>
      </td>
      <td style="${TD};text-align:right">
        ${+r.usaManual
          ?`<input type="number" step="0.01" min="0" value="${+r.cuhManual||0}" onchange="_arGuardarCampo(${r.id},'cuhManual',this.value)" style="${inp}">`
          :`<span style="font-family:monospace;font-weight:700;color:${malo?'#ef4444':'inherit'}">${_arN(cu.cuh)}</span>`}
        <div style="font-size:.55rem;color:${malo?'#ef4444':'var(--muted2)'}">${_arEsc(cu.detalle||cu.fuente)}</div>
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
      ${_sinGuardar?`<span style="font-size:.62rem;color:#f59e0b;font-weight:700">⚠ lista base sin guardar · se guardará al primer cambio</span>`:''}
      <button onclick="_arNuevo()" class="btn btn-out btn-sm" style="margin-left:auto">＋ Recurso</button>
      ${_sinGuardar?'<button onclick="_arSembrar()" class="btn btn-a btn-sm" style="--ba:var(--adm)">📥 Guardar lista base</button>':''}
    </div>
    <div style="border:1px solid var(--border);border-radius:8px;overflow:hidden">
      <table style="width:100%;border-collapse:collapse">
        <thead><tr>
          <th style="${TH};text-align:left">Tipo de recurso</th>
          <th style="${TH};text-align:right">Cant. (2)</th>
          <th style="${TH};text-align:right">Particip. (3)</th>
          <th style="${TH};text-align:right" title="Vacía = la que calcula HH Venta">Incidencia</th>
          <th style="${TH};text-align:right">C.U.H. (4)</th>
          <th style="${TH}"></th>
        </tr></thead>
        <tbody>${filas||`<tr><td colspan="6" style="${TD};text-align:center;padding:1.5rem;color:var(--muted2)">Sin recursos · cargue la lista base</td></tr>`}</tbody>
      </table>
    </div>`;
}
