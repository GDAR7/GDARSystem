// ══ MÁSTER DE EQUIPOS · HISTORIAL DE CAMBIOS ══
// Quién creó, editó o eliminó un equipo o un subtipo, cuándo, y qué campos
// cambió (antes → después). Lo anota la base con un trigger
// (sql/historial_master.sql); aquí solo se lee. Solo el administrador lo ve:
// la base no se lo entrega a nadie más.
// Es una página de ⚙️ Configuración (que hoy solo tiene EIBEL25); la página
// tampoco se muestra a nadie más, y la base solo le entrega los datos a él.
const _HM_TABLA='historial_master';
const _HM_ADMIN='EIBEL25';
const _HM_LIMITE=2000;      // los cambios más recientes que se traen

let _hmFilas=[], _hmCarga='', _hmErr='';
let _hmF={quien:'',accion:'',desde:'',hasta:'',q:''};

const _hmEsAdmin=()=>typeof CU!=='undefined'&&!!CU&&String(CU.codigo||'').trim().toUpperCase()===_HM_ADMIN;
const _hmEsc=s=>String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const _hm2=n=>String(n).padStart(2,'0');
function _hmFH(iso){
  const d=new Date(iso);if(!iso||!isFinite(d.getTime()))return'—';
  return`${_hm2(d.getDate())}/${_hm2(d.getMonth()+1)}/${d.getFullYear()} ${_hm2(d.getHours())}:${_hm2(d.getMinutes())}`;
}
function _hmDiaLocal(iso){
  const d=new Date(iso);if(!isFinite(d.getTime()))return'';
  return`${d.getFullYear()}-${_hm2(d.getMonth()+1)}-${_hm2(d.getDate())}`;
}

// Nombres de los campos tal como se ven en la ficha del equipo
const _HM_CAMPOS={codigo:'Código',nombre:'Nombre',tipo:'Tipo',sub:'Subtipo',marca:'Marca',modelo:'Modelo',
  anio:'Año',placa:'Placa',hr:'Horómetro',km:'Kilometraje',est:'Estado',status:'Status',ult_mant:'Último mant.',
  prox_mant:'Próximo mant.',num_serie:'N° serie',potencia_hp:'Potencia HP',capacidad_m3:'Capacidad m³',
  peso_kg:'Peso kg',dimensiones:'Dimensiones',ubicacion:'Ubicación',fecha_llegada:'Fecha llegada',
  fecha_salida:'Fecha salida',soat:'SOAT',soat_venc:'SOAT vence',poliza_trec:'Póliza TREC',
  poliza_trec_venc:'Póliza TREC vence',revision_tecnica:'Revisión técnica',revision_tecnica_venc:'Rev. técnica vence',
  gps:'GPS',gps_venc:'GPS vence',ric:'RIC',ric_venc:'RIC vence',proveedor:'Proveedor',ruc_proveedor:'RUC proveedor',
  logo_proveedor:'Logo proveedor',contacto:'Contacto',celular:'Celular',correo:'Correo',horas_minimas:'Horas mínimas',
  tarifa:'Tarifa',tarifa_un:'Unidad de tarifa',moneda:'Moneda',hrs_min_venta:'Hrs mín. venta',
  inicio_contrato:'Inicio contrato',termino_contrato:'Término contrato',proyecto:'Proyecto',factor_uso:'Factor de uso',
  calentamiento_h:'Calentamiento h',cc_gets:'CC GETs',cc_engrase:'CC engrase',cc_relleno_niveles:'CC relleno niveles',
  cc_mant_preventivo:'CC mant. preventivo',cc_mant_correctivo:'CC mant. correctivo',imagenes:'Imágenes',documentos:'Documentos'};
const _hmCampo=k=>_HM_CAMPOS[k]||k;

// Un valor en texto corto
function _hmVal(v){
  if(v==null||v==='')return'—';
  if(typeof v==='string'&&/^\s*[\[{]/.test(v)){try{v=JSON.parse(v);}catch(e){}}
  if(Array.isArray(v))return v.length+' archivo'+(v.length===1?'':'s');
  if(typeof v==='object')return JSON.stringify(v).slice(0,80);
  const s=String(v);return s.length>80?s.slice(0,77)+'…':s;
}
// Listas de documentos / imágenes: qué se agregó y qué se quitó
function _hmLista(v){
  if(typeof v==='string'){try{v=JSON.parse(v);}catch(e){return[];}}
  return Array.isArray(v)?v:[];
}
const _hmItemNom=x=>x==null?'':typeof x==='string'?x.split('/').pop():String(x.nombre||x.name||x.titulo||x.tipo||(x.url||'').split('/').pop()||JSON.stringify(x));
function _hmDifLista(antes,despues){
  const a=_hmLista(antes).map(_hmItemNom), d=_hmLista(despues).map(_hmItemNom);
  const mas=d.filter(x=>!a.includes(x)), menos=a.filter(x=>!d.includes(x));
  const p=[];
  if(mas.length)p.push('agregó '+mas.join(', '));
  if(menos.length)p.push('quitó '+menos.join(', '));
  return p.length?p.join(' · '):(a.length+' → '+d.length);
}

// Las líneas de detalle de un cambio (texto plano: sirve en pantalla y en Excel)
function _hmDetalle(r){
  const c=r.cambios||{};
  if(r.accion==='editar'){
    return Object.keys(c).map(k=>{
      const x=c[k]||{};
      if(k==='imagenes'||k==='documentos')return _hmCampo(k)+': '+_hmDifLista(x.antes,x.despues);
      return _hmCampo(k)+': '+_hmVal(x.antes)+' → '+_hmVal(x.despues);
    });
  }
  // crear / eliminar: lo que identifica al registro
  if(r.tabla==='subtipos_equipo')return['Subtipo: '+_hmVal(c.nombre)];
  return['codigo','nombre','tipo','sub','proveedor','tarifa'].filter(k=>c[k]!=null&&c[k]!=='')
    .map(k=>_hmCampo(k)+': '+_hmVal(c[k]));
}
const _hmQue=r=>(r.tabla==='subtipos_equipo'?'Subtipo ':'Equipo ')+(r.etiqueta||('#'+r.registro));
const _hmQuien=r=>(r.nombre||r.codigo||'—')+(r.nombre&&r.codigo?' · '+r.codigo:'');
const _HM_ACC={crear:{t:'Creó',c:'#10b981'},editar:{t:'Editó',c:'#3b82f6'},eliminar:{t:'Eliminó',c:'#ef4444'}};

// ── Lectura ────────────────────────────────────────────────────────────────
async function _hmCargar(){
  if(typeof supa==='undefined')return;
  _hmCarga='cargando';_hmPintar();
  try{
    const{data,error}=await supa.from(_HM_TABLA).select('*').order('en',{ascending:false}).limit(_HM_LIMITE);
    if(error)throw error;
    _hmFilas=data||[];_hmCarga='ok';_hmErr='';
  }catch(e){
    console.warn('[Historial Máster]',e);_hmCarga='error';
    _hmErr=(e&&e.code==='PGRST205')?'falta la tabla':String((e&&e.message)||e);
  }
  _hmPintar();
}

function _hmFiltradas(){
  const q=String(_hmF.q||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'');
  return _hmFilas.filter(r=>{
    if(_hmF.quien&&String(r.codigo||'')!==_hmF.quien)return false;
    if(_hmF.accion&&r.accion!==_hmF.accion)return false;
    const dia=_hmDiaLocal(r.en);
    if(_hmF.desde&&dia<_hmF.desde)return false;
    if(_hmF.hasta&&dia>_hmF.hasta)return false;
    if(q){
      const txt=(_hmQue(r)+' '+_hmQuien(r)+' '+_hmDetalle(r).join(' ')).toLowerCase()
        .normalize('NFD').replace(/[̀-ͯ]/g,'');
      if(!q.split(/\s+/).every(p=>txt.includes(p)))return false;
    }
    return true;
  });
}

// ── Página ─────────────────────────────────────────────────────────────────
function rHistorialMaster(){
  const p=document.getElementById('page-historialMaster');if(!p)return;
  if(!_hmEsAdmin()){
    p.innerHTML='<div class="ph"><div class="ph-title" style="color:#6366f1">🕵️ Historial Máster</div></div><div class="card" style="border:1px solid #f59e0b;color:#f59e0b;font-size:.8rem;max-width:720px;margin:0 auto">🔒 Este módulo es solo para el administrador.</div>';
    return;
  }
  _hmCargar();
}
function _hmFiltro(k,v){_hmF[k]=v;_hmPintarTabla();}

function _hmPintar(){
  const o=document.getElementById('page-historialMaster');if(!o||!_hmEsAdmin())return;
  const ctl='background:var(--panel2);border:1px solid var(--border);border-radius:6px;color:var(--text);padding:.3rem .5rem;font-size:.76rem';
  const personas=[...new Map(_hmFilas.map(r=>[String(r.codigo||''),_hmQuien(r)])).entries()]
    .sort((a,b)=>a[1].localeCompare(b[1],'es'));
  let cuerpo;
  if(_hmCarga==='cargando'&&!_hmFilas.length)cuerpo='<div style="padding:2rem;text-align:center;color:var(--muted2)">Cargando…</div>';
  else if(_hmCarga==='error')cuerpo=_hmErr==='falta la tabla'
    ?'<div style="padding:1.2rem;border:1px solid #f59e0b;border-radius:8px;color:#f59e0b">Falta ejecutar <b>sql/historial_master.sql</b> en Supabase. Desde ese momento se empiezan a anotar los cambios.</div>'
    :`<div style="padding:1.2rem;border:1px solid #ef4444;border-radius:8px;color:#ef4444">No se pudo leer el historial: ${_hmEsc(_hmErr)}</div>`;
  else cuerpo='<div id="hmTabla"></div>';
  o.innerHTML=`<div class="ph"><div class="ph-title" style="color:#6366f1">🕵️ Historial Máster</div><div class="ph-sub">Quién creó, editó o eliminó equipos y subtipos del Máster de Equipos · lo anota la base de datos y nadie lo puede modificar · solo administrador</div></div>
  <div class="card" style="padding:1rem 1.1rem">
    <div style="display:flex;align-items:center;gap:.6rem;margin-bottom:.8rem">
      <button onclick="_hmCargar()" style="${ctl};margin-left:auto;cursor:pointer">↻ Actualizar</button>
      <button onclick="_hmExcel()" style="${ctl};cursor:pointer;color:#16a34a;border-color:#16a34a80">📊 Excel</button>
    </div>
    <div style="display:flex;gap:.5rem;flex-wrap:wrap;align-items:flex-end;margin-bottom:.7rem">
      <label style="font-size:.64rem;color:var(--muted2)">PERSONA<br><select style="${ctl}" onchange="_hmFiltro('quien',this.value)"><option value="">— Todas —</option>
        ${personas.map(([c,n])=>`<option value="${_hmEsc(c)}"${_hmF.quien===c?' selected':''}>${_hmEsc(n)}</option>`).join('')}</select></label>
      <label style="font-size:.64rem;color:var(--muted2)">ACCIÓN<br><select style="${ctl}" onchange="_hmFiltro('accion',this.value)"><option value="">— Todas —</option>
        ${Object.keys(_HM_ACC).map(k=>`<option value="${k}"${_hmF.accion===k?' selected':''}>${_HM_ACC[k].t}</option>`).join('')}</select></label>
      <label style="font-size:.64rem;color:var(--muted2)">DESDE<br><input type="date" style="${ctl}" value="${_hmF.desde}" onchange="_hmFiltro('desde',this.value)"></label>
      <label style="font-size:.64rem;color:var(--muted2)">HASTA<br><input type="date" style="${ctl}" value="${_hmF.hasta}" onchange="_hmFiltro('hasta',this.value)"></label>
      <label style="font-size:.64rem;color:var(--muted2);flex:1;min-width:180px">BUSCAR<br><input style="${ctl};width:100%" placeholder="Equipo, campo o valor…" value="${_hmEsc(_hmF.q)}" oninput="_hmFiltro('q',this.value)"></label>
    </div>
    ${cuerpo}
  </div>`;
  _hmPintarTabla();
}

// Solo la tabla: así el buscador no pierde el foco al escribir
function _hmPintarTabla(){
  const el=document.getElementById('hmTabla');if(!el)return;
  const filas=_hmFiltradas();
  if(!_hmFilas.length){el.innerHTML='<div style="padding:1.5rem;text-align:center;color:var(--muted2)">Todavía no hay cambios anotados.</div>';return;}
  const TH='text-align:left;padding:.4rem .5rem;font-size:.64rem;color:var(--muted2);text-transform:uppercase;letter-spacing:.05em;border-bottom:1px solid var(--border)';
  const TD='padding:.4rem .5rem;border-bottom:1px solid var(--border);vertical-align:top;font-size:.76rem';
  el.innerHTML=`<div style="font-size:.7rem;color:var(--muted2);margin-bottom:.3rem">${filas.length} de ${_hmFilas.length} cambio${_hmFilas.length===1?'':'s'}${_hmFilas.length>=_HM_LIMITE?' (los '+_HM_LIMITE+' más recientes)':''}</div>
  <div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse">
    <thead><tr><th style="${TH}">Fecha y hora</th><th style="${TH}">Persona</th><th style="${TH}">Acción</th><th style="${TH}">Registro</th><th style="${TH}">Qué cambió</th></tr></thead>
    <tbody>${filas.map(r=>{const a=_HM_ACC[r.accion]||{t:r.accion,c:'#64748b'};
      return`<tr><td style="${TD};white-space:nowrap;font-family:monospace">${_hmFH(r.en)}</td>
        <td style="${TD};white-space:nowrap">${_hmEsc(_hmQuien(r))}</td>
        <td style="${TD}"><span style="border:1px solid ${a.c};color:${a.c};border-radius:4px;padding:.05rem .4rem;font-size:.68rem;font-weight:700">${a.t}</span></td>
        <td style="${TD};white-space:nowrap;font-weight:700">${_hmEsc(_hmQue(r))}</td>
        <td style="${TD}">${_hmDetalle(r).map(t=>`<div>${_hmEsc(t)}</div>`).join('')||'—'}</td></tr>`;}).join('')
      ||`<tr><td colspan="5" style="${TD};text-align:center;color:var(--muted2)">Ningún cambio con esos filtros.</td></tr>`}</tbody>
  </table></div>`;
}

function _hmExcel(){
  if(!window.XLSX){toast('Librería Excel no cargada, intenta en segundos',true);return;}
  const filas=_hmFiltradas();
  if(!filas.length){toast('Sin cambios para exportar',true);return;}
  const aoa=[['Fecha y hora','Persona','Código','Acción','Registro','Qué cambió']];
  filas.forEach(r=>aoa.push([_hmFH(r.en),r.nombre||'',r.codigo||'',(_HM_ACC[r.accion]||{t:r.accion}).t,_hmQue(r),_hmDetalle(r).join('\n')]));
  const wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(aoa),'Historial Máster');
  XLSX.writeFile(wb,'Historial_Master_Equipos_'+new Date().toISOString().slice(0,10)+'.xlsx');
  toast('✓ Excel descargado');
}
