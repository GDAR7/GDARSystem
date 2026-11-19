// ══ COST CONTROL · EDP ═══════════════════════════════════════════════════════
// Importa el Excel del EDP de horas de equipos.
//
// Primera versión: SOLO LEE Y MUESTRA. Sube el Excel, elige la hoja, ve una
// vista previa y qué equipos de cada fila existen en el Máster. No escribe nada
// en la base: el «Actualizar» se agrega cuando esté definido el formato del
// Excel y qué dato debe cambiar.
let _edhLibro=null, _edhArchivo='', _edhHoja='', _edhCol=-1;

const _edhEsc=s=>String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
// Normaliza un código para comparar: sin espacios, guiones ni guiones bajos
const _edhNorm=s=>String(s==null?'':s).toUpperCase().replace(/[\s_\-./]/g,'');

// Índice de equipos: código completo, código sin el prefijo (VOL_ECOP-001 → ECOP-001) y placa
function _edhIndice(){
  const m=new Map();
  (DB.equipos||[]).forEach(e=>{
    const cod=String(e.codigo||'');
    [cod,cod.includes('_')?cod.slice(cod.indexOf('_')+1):'',e.placa].forEach(k=>{
      const n=_edhNorm(k);if(n.length>=3&&!m.has(n))m.set(n,e);
    });
  });
  return m;
}
// Un número (horómetro, horas…) nunca es un código de equipo
function _edhEquipo(v,ix){
  if(typeof v==='number'||v instanceof Date)return null;
  const n=_edhNorm(v);return n.length>=3&&/[A-Z]/.test(n)?(ix.get(n)||null):null;
}

// Fila de encabezados, entre las 20 primeras: la que más parece encabezado.
// Cuenta celdas de texto y suma mucho por palabras típicas (FECHA, CÓDIGO,
// HORA…). Así no se confunde con el título del proyecto que va arriba.
const _EDH_CLAVES=/^(fecha|turno|c[oó]digo|equipo|hora|horas|hor[oó]metro|tipo|[aá]rea|operador|placa|item|d[ií]a)\b/i;
function _edhEncabezado(filas){
  let mejor=0,max=-1;
  for(let i=0;i<Math.min(20,filas.length);i++){
    const f=filas[i]||[];
    const txt=f.filter(c=>typeof c==='string'&&c.trim()!==''&&isNaN(+c)&&c.trim().length<=40);
    if(txt.length<3)continue;
    const p=txt.length+txt.filter(c=>_EDH_CLAVES.test(c.trim())).length*5;
    if(p>max){max=p;mejor=i;}
  }
  return mejor;
}

// Columna con más coincidencias contra el Máster de Equipos (-1 si ninguna)
function _edhColEquipo(datos,ix){
  const ancho=Math.max(0,...datos.map(f=>(f||[]).length));
  let mejor=-1,max=0;
  for(let c=0;c<ancho;c++){
    const n=datos.reduce((s,f)=>s+(_edhEquipo((f||[])[c],ix)?1:0),0);
    if(n>max){max=n;mejor=c;}
  }
  return mejor;
}

// Todo lo que muestra la página, a partir de una hoja (matriz de filas)
function _edhAnalizar(filas,colForzada){
  const ix=_edhIndice();
  const h=_edhEncabezado(filas);
  const enc=(filas[h]||[]).map((c,i)=>String(c==null?'':c).trim()||('Col '+(i+1)));
  const datos=filas.slice(h+1).filter(f=>(f||[]).some(c=>String(c==null?'':c).trim()!==''));
  const col=colForzada>=0?colForzada:_edhColEquipo(datos,ix);
  let ok=0,falta=0;const noEnc=new Set();
  const marcas=datos.map(f=>{
    if(col<0)return null;
    const v=(f||[])[col];
    if(String(v==null?'':v).trim()==='')return null;
    const e=_edhEquipo(v,ix);
    if(e)ok++;else{falta++;noEnc.add(String(v).trim());}
    return e;
  });
  return{h,enc,datos,col,ok,falta,noEnc:[...noEnc],marcas};
}
// El EDP trae una hoja por equipo con el código como nombre (EXC ECOP-002)
function _edhEquipoHoja(nombre){return _edhEquipo(nombre,_edhIndice());}

function _edhLeer(input){
  const f=input.files&&input.files[0];if(!f)return;
  if(typeof XLSX==='undefined'){toast('Librería Excel no disponible',true);return;}
  const rd=new FileReader();
  rd.onload=ev=>{
    try{
      _edhBytes=new Uint8Array(ev.target.result);
      _edhLibro=XLSX.read(_edhBytes,{type:'array',cellDates:true});
      _edhArchivo=f.name;_edhHoja=_edhLibro.SheetNames[0]||'';_edhCol=-1;
      rEdpHoras();
      toast('✓ Excel leído: '+_edhLibro.SheetNames.length+' hoja(s)');
    }catch(e){toast('No se pudo leer el archivo: '+e.message,true);}
  };
  rd.readAsArrayBuffer(f);
  input.value='';
}
function _edhSetHoja(n){_edhHoja=n;_edhCol=-1;rEdpHoras();}
function _edhSetCol(c){_edhCol=+c;rEdpHoras();}
function _edhQuitar(){_edhLibro=null;_edhBytes=null;_edhArchivo='';_edhHoja='';_edhCol=-1;rEdpHoras();}

// ── Llenar el EDP con los datos del sistema ─────────────────────────────────
// Toma el Excel subido y reemplaza cada hoja de equipo (🚜) por la hoja del
// período elegido, armada con el mismo motor de Corte de Equipos (_ceHojaXls):
// mismas columnas, la celda E5 con el mínimo diario y las fórmulas SUP/SI/NO.
// Las demás hojas (ACTA, RESUMEN, EDP-06…) quedan como vienen. No se guarda
// nada en la base: solo se descarga un Excel nuevo.
let _edhBytes=null, _edhDesde='', _edhHasta='';
function _edhIsoLocal(d){return`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
// Período 21→20 que contiene la fecha (hoy 19/11 → 21/10 al 20/11)
function _edhPeriodoDe(fecha){
  const p=String(fecha).split('-').map(Number);
  let y=p[0],m=p[1]-1;
  if(p[2]<21){m--;if(m<0){m=11;y--;}}
  return{desde:_edhIsoLocal(new Date(y,m,21)),hasta:_edhIsoLocal(new Date(y,m+1,20))};
}
function _edhRango(){
  if(!_edhDesde||!_edhHasta){const P=_edhPeriodoDe(today());_edhDesde=_edhDesde||P.desde;_edhHasta=_edhHasta||P.hasta;}
  return{desde:_edhDesde,hasta:_edhHasta};
}
function _edhSetFecha(campo,v){if(campo==='d')_edhDesde=v;else _edhHasta=v;rEdpHoras();}
// El objeto período que entiende _ceDatos. Si es un 21→20 completo va como
// período (Hmin Mes = Hrs Mín. Venta); si no, como rango con el mínimo
// diario del período que lo contiene.
function _edhPer(desde,hasta){
  const P=_edhPeriodoDe(desde);
  const pa=s=>{const[y,m,d]=s.split('-').map(Number);return new Date(y,m-1,d);};
  if(P.desde===desde&&P.hasta===hasta){
    const ini=pa(desde),fin=pa(hasta);
    return{desde,hasta,ini,fin,label:desde+' → '+hasta,dias:Math.round((fin-ini)/864e5)+1};
  }
  return _ceConRango(null,{desde,hasta});
}
// Qué se va a hacer con cada hoja (sirve para la vista y para generar)
function _edhPlan(per){
  return(_edhLibro?_edhLibro.SheetNames:[]).map(n=>{
    const eq=_edhEquipoHoja(n);
    if(!eq)return{hoja:n,eq:null,n:0};
    const n2=(DB.partes||[]).filter(p=>+p.eqId===+eq.id&&p.fecha>=per.desde&&p.fecha<=per.hasta).length;
    return{hoja:n,eq,n:n2};
  });
}
function _edhGenerar(){
  if(!_edhLibro||!_edhBytes){toast('Primero suba el Excel del EDP',true);return;}
  if(typeof _ceHojaXls!=='function'){toast('El módulo Corte de Equipos no está cargado',true);return;}
  const R=_edhRango();
  if(R.desde>R.hasta){toast('La fecha «Desde» no puede ser posterior a «Hasta»',true);return;}
  const per=_edhPer(R.desde,R.hasta);
  const plan=_edhPlan(per).filter(x=>x.eq);
  if(!plan.length){toast('El Excel no tiene hojas con el código de un equipo del Máster',true);return;}
  try{
    // Se vuelve a leer el archivo original con sus estilos, para no arrastrar
    // cambios de la vista previa y conservar el formato de las otras hojas
    const wb=XLSX.read(_edhBytes,{type:'array',cellStyles:true,cellDates:true});
    plan.forEach((x,i)=>{wb.Sheets[x.hoja]=_ceHojaXls(x.eq,per,i);});
    const base=String(_edhArchivo||'EDP').replace(/\.[^.]+$/,'');
    XLSX.writeFile(wb,`${base} - ${R.desde} al ${R.hasta}.xlsx`);
    const vacias=plan.filter(x=>!x.n).length;
    toast(`✓ EDP generado · ${plan.length} hoja(s) de equipo llenadas${vacias?` · ${vacias} sin partes en el período`:''}`);
  }catch(e){console.error('[EDP generar]',e);toast('No se pudo generar el Excel: '+e.message,true);}
}

function _edhCelda(v){
  if(v instanceof Date&&!isNaN(v))return v.toISOString().slice(0,10);
  if(typeof v==='number')return Number.isInteger(v)?String(v):v.toLocaleString('es-PE',{maximumFractionDigits:2});
  return _edhEsc(v);
}

function rEdpHoras(){
  const pg=document.getElementById('page-edpHoras');if(!pg)return;
  const AC='#059669';
  const kpi=(l,v,c)=>`<div style="background:var(--panel);border:2px solid ${c};border-radius:9px;padding:.6rem .85rem;min-width:0">
    <div style="font-size:.58rem;font-weight:700;text-transform:uppercase;letter-spacing:.09em;color:var(--muted2);margin-bottom:.2rem">${l}</div>
    <div style="font-size:1.35rem;font-weight:800;color:${c};font-family:monospace">${v}</div></div>`;

  const cab=`<div class="ph"><div class="ph-title" style="color:${AC}">📊 EDP</div>
    <div class="ph-sub">Suba el Excel del EDP y llénelo con los partes del período · se descarga un Excel nuevo, no se guarda nada en el sistema</div></div>`;

  const subir=`<label style="display:flex;align-items:center;gap:.6rem;flex-wrap:wrap;padding:.8rem 1rem;border:2px dashed ${AC};border-radius:10px;background:var(--panel2);cursor:pointer;margin-bottom:.9rem">
      <span style="font-size:1.4rem">📥</span>
      <span style="flex:1;min-width:200px"><b style="color:var(--text)">${_edhLibro?'Cambiar Excel':'Subir Excel del EDP'}</b>
        <span style="display:block;font-size:.72rem;color:var(--muted2)">${_edhLibro?'Archivo: '+_edhEsc(_edhArchivo):'.xlsx, .xls o .csv · se lee en este equipo, no se sube a ningún lado'}</span></span>
      <input type="file" accept=".xlsx,.xls,.xlsm,.csv" onchange="_edhLeer(this)" style="display:none">
      ${_edhLibro?`<button onclick="event.preventDefault();_edhQuitar()" class="btn btn-out" style="font-size:.72rem">✕ Quitar</button>`:''}
    </label>`;

  if(!_edhLibro){pg.innerHTML=cab+subir;return;}

  // Panel para llenar el EDP con los partes del período elegido
  const RG=_edhRango();
  const perG=RG.desde<=RG.hasta?_edhPer(RG.desde,RG.hasta):null;
  const planG=perG?_edhPlan(perG).filter(x=>x.eq):[];
  const conP=planG.filter(x=>x.n), sinP=planG.filter(x=>!x.n);
  const inpF=(c,v)=>`<input type="date" value="${v}" onchange="_edhSetFecha('${c}',this.value)" style="font-size:.76rem;padding:.25rem .4rem;border-radius:6px;border:1px solid var(--border);background:var(--panel2);color:var(--text)">`;
  const llenar=`<div style="border:2px solid #3b82f6;border-radius:10px;padding:.75rem .9rem;margin-bottom:.9rem;background:var(--panel)">
    <div style="display:flex;align-items:center;gap:.55rem;flex-wrap:wrap">
      <b style="color:#3b82f6;font-size:.82rem">📤 Llenar el EDP con los datos del sistema</b>
      <span style="font-size:.72rem;color:var(--muted2)">📅 Desde</span>${inpF('d',RG.desde)}
      <span style="font-size:.72rem;color:var(--muted2)">Hasta</span>${inpF('h',RG.hasta)}
      <button onclick="_edhGenerar()" class="btn" style="background:#3b82f6;color:#fff;font-size:.76rem;font-weight:700"${perG&&planG.length?'':' disabled'}>⬇ Generar Excel del EDP</button>
    </div>
    <div style="font-size:.7rem;color:var(--muted2);margin-top:.45rem;line-height:1.5">
      ${!perG?'<span style="color:#ef4444">La fecha «Desde» es posterior a «Hasta».</span>'
        :`Se reemplazan las <b style="color:var(--text)">${planG.length}</b> hojas 🚜 con los partes del ${_edhEsc(RG.desde)} al ${_edhEsc(RG.hasta)}${perG.rango?' (rango: mínimo diario del período 21→20)':''} ·
        <b style="color:#10b981">${conP.length} con partes</b>${sinP.length?` · <b style="color:#f59e0b">${sinP.length} sin partes</b> (${sinP.slice(0,12).map(x=>_edhEsc(x.hoja)).join(', ')}${sinP.length>12?'…':''}) quedan solo con el encabezado`:''} ·
        las demás hojas quedan como vienen.`}
      <br>⚠ Las fórmulas de otras hojas que apunten a celdas fijas de las hojas de equipo (p. ej. el RESUMEN) pueden quedar desfasadas si cambia el número de filas: revíselas.
    </div>
  </div>`;

  const hojas=_edhLibro.SheetNames;
  const ws=_edhLibro.Sheets[_edhHoja];
  const filas=ws?XLSX.utils.sheet_to_json(ws,{header:1,defval:'',raw:true}):[];
  const A=_edhAnalizar(filas,_edhCol);

  const chips=`<div style="display:flex;align-items:center;gap:.4rem;flex-wrap:wrap;margin-bottom:.8rem">
    <span style="font-size:.62rem;color:var(--muted2);font-weight:700;text-transform:uppercase;letter-spacing:.08em">Hoja</span>
    ${hojas.map(n=>{const eqH=_edhEquipoHoja(n);return`<button onclick="_edhSetHoja(${_edhEsc(JSON.stringify(n))})" title="${eqH?'Hoja del equipo '+_edhEsc(eqH.codigo):'Hoja sin equipo'}" style="font-size:.72rem;padding:.22rem .6rem;border-radius:6px;cursor:pointer;border:1px solid ${n===_edhHoja?AC:'var(--border)'};background:${n===_edhHoja?AC+'22':'transparent'};color:${n===_edhHoja?AC:'var(--text)'};font-weight:${n===_edhHoja?700:400}">${eqH?'🚜 ':''}${_edhEsc(n)}</button>`;}).join('')}
    <span style="font-size:.64rem;color:var(--muted2)">🚜 = hoja de un equipo del Máster (${hojas.filter(n=>_edhEquipoHoja(n)).length} de ${hojas.length})</span>
    <span style="width:1px;height:18px;background:var(--border);margin:0 .3rem"></span>
    <span style="font-size:.62rem;color:var(--muted2);font-weight:700;text-transform:uppercase;letter-spacing:.08em">Columna del equipo</span>
    <select onchange="_edhSetCol(this.value)" style="font-size:.72rem;padding:.2rem .4rem;border-radius:5px;border:1px solid var(--border);background:var(--panel2);color:var(--text)">
      <option value="-1">Automática${A.col>=0&&_edhCol<0?' ('+_edhEsc(A.enc[A.col]||'Col '+(A.col+1))+')':''}</option>
      ${A.enc.map((e,i)=>`<option value="${i}"${i===_edhCol?' selected':''}>${_edhEsc(e)}</option>`).join('')}
    </select>
  </div>`;

  const kpis=`<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:.6rem;margin-bottom:.9rem">
    ${kpi('Filas con datos',A.datos.length.toLocaleString('es-PE'),'#3b82f6')}
    ${kpi('Columnas',A.enc.length,'#8b5cf6')}
    ${kpi('Equipos encontrados',A.col<0?'—':A.ok.toLocaleString('es-PE'),'#10b981')}
    ${kpi('No están en el Máster',A.col<0?'—':A.falta.toLocaleString('es-PE'),A.falta?'#ef4444':'#64748b')}
  </div>`;

  const aviso=A.col<0
    ?`<div style="font-size:.76rem;color:#f59e0b;margin-bottom:.7rem">⚠ No se reconoció ninguna columna con códigos o placas del Máster de Equipos. Elíjala en «Columna del equipo».</div>`
    :A.noEnc.length?`<div style="font-size:.74rem;color:var(--muted2);margin-bottom:.7rem"><b style="color:#ef4444">No encontrados:</b> ${A.noEnc.slice(0,30).map(_edhEsc).join(' · ')}${A.noEnc.length>30?' · …':''}</div>`:'';

  const MAX=300,TD='padding:.3rem .5rem;border:1px solid var(--border);font-size:.72rem;white-space:nowrap';
  const tabla=`<div class="card"><div class="card-head"><span class="card-title">Vista previa · ${_edhEsc(_edhHoja)}</span>
      <span style="font-size:.68rem;color:var(--muted2)">${A.datos.length>MAX?'Primeras '+MAX+' de '+A.datos.length.toLocaleString('es-PE')+' filas':A.datos.length+' filas'} · encabezado en la fila ${A.h+1}</span></div>
    <div style="overflow:auto;max-height:62vh"><table style="border-collapse:collapse;width:max-content;min-width:100%">
      <thead><tr><th style="${TD};position:sticky;top:0;background:var(--panel2)">Equipo</th>${A.enc.map((e,i)=>`<th style="${TD};position:sticky;top:0;background:var(--panel2);font-size:.62rem;text-transform:uppercase;color:${i===A.col?AC:'var(--muted2)'}">${_edhEsc(e)}</th>`).join('')}</tr></thead>
      <tbody>${A.datos.slice(0,MAX).map((f,r)=>{
        const e=A.marcas[r];
        const est=A.col<0||String((f||[])[A.col]==null?'':(f||[])[A.col]).trim()===''?'<span style="color:var(--muted)">—</span>'
          :e?`<span style="color:#10b981" title="${_edhEsc(e.codigo)}">✓ ${_edhEsc(e.codigo)}</span>`:'<span style="color:#ef4444">⚠ no existe</span>';
        return`<tr><td style="${TD}">${est}</td>${A.enc.map((_,i)=>`<td style="${TD}${i===A.col?';font-weight:700':''}">${_edhCelda((f||[])[i])}</td>`).join('')}</tr>`;
      }).join('')}</tbody>
    </table></div></div>`;

  pg.innerHTML=cab+subir+llenar+chips+kpis+aviso+tabla;
}
