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
      _edhLibro=XLSX.read(new Uint8Array(ev.target.result),{type:'array',cellDates:true});
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
function _edhQuitar(){_edhLibro=null;_edhArchivo='';_edhHoja='';_edhCol=-1;rEdpHoras();}

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
    <div class="ph-sub">Importar el Excel del EDP de horas de equipos · por ahora solo vista previa, no se guarda nada</div></div>`;

  const subir=`<label style="display:flex;align-items:center;gap:.6rem;flex-wrap:wrap;padding:.8rem 1rem;border:2px dashed ${AC};border-radius:10px;background:var(--panel2);cursor:pointer;margin-bottom:.9rem">
      <span style="font-size:1.4rem">📥</span>
      <span style="flex:1;min-width:200px"><b style="color:var(--text)">${_edhLibro?'Cambiar Excel':'Subir Excel del EDP'}</b>
        <span style="display:block;font-size:.72rem;color:var(--muted2)">${_edhLibro?'Archivo: '+_edhEsc(_edhArchivo):'.xlsx, .xls o .csv · se lee en este equipo, no se sube a ningún lado'}</span></span>
      <input type="file" accept=".xlsx,.xls,.xlsm,.csv" onchange="_edhLeer(this)" style="display:none">
      ${_edhLibro?`<button onclick="event.preventDefault();_edhQuitar()" class="btn btn-out" style="font-size:.72rem">✕ Quitar</button>`:''}
    </label>`;

  if(!_edhLibro){pg.innerHTML=cab+subir;return;}

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

  pg.innerHTML=cab+subir+chips+kpis+aviso+tabla;
}
