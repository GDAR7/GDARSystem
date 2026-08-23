// ══ IMPORTADOR DE CSV → REEMBOLSABLES B.S. ══════════════════════════════════
// Lee un CSV y crea registros en reembolsables_bbss. Solo toma las columnas que
// pide el formulario; todo lo demás del archivo (numeración, área, IGV, totales
// calculados, valorización...) se ignora porque el sistema lo deriva solo.
// Antes de guardar nada muestra una vista previa con lo que va a entrar, lo que
// se omite y por qué.

// ── Parser CSV ─────────────────────────────────────────────────────────────
// Respeta comillas dobles, comillas escapadas ("") y saltos de línea DENTRO de
// un campo entrecomillado — el archivo del cliente los trae en la descripción.
function _csvParse(txt,delim){
  const filas=[];
  let campo='',fila=[],enComillas=false;
  txt=String(txt||'').replace(/^\uFEFF/,'');            // quita el BOM
  for(let i=0;i<txt.length;i++){
    const c=txt[i];
    if(enComillas){
      if(c==='"'){
        if(txt[i+1]==='"'){campo+='"';i++;}
        else enComillas=false;
      }else campo+=c;
      continue;
    }
    if(c==='"'){enComillas=true;continue;}
    if(c===delim){fila.push(campo);campo='';continue;}
    if(c==='\r')continue;
    if(c==='\n'){fila.push(campo);filas.push(fila);fila=[];campo='';continue;}
    campo+=c;
  }
  if(campo!==''||fila.length){fila.push(campo);filas.push(fila);}
  return filas;
}
// Separador: el que más aparezca en la primera línea
function _csvDelim(txt){
  const l=String(txt||'').split('\n')[0]||'';
  const cand=[[';',(l.match(/;/g)||[]).length],[',',(l.match(/,/g)||[]).length],['\t',(l.match(/\t/g)||[]).length]];
  cand.sort((a,b)=>b[1]-a[1]);
  return cand[0][1]>0?cand[0][0]:';';
}
// Número tolerante: acepta 1234.56 · 1.234,56 · 1,234.56 · con espacios o símbolos
function _csvNum(v){
  let s=String(v==null?'':v).trim();
  if(!s)return 0;
  s=s.replace(/\s/g,'').replace(/[^\d,.\-]/g,'');
  const c=s.lastIndexOf(','),p=s.lastIndexOf('.');
  if(c>-1&&p>-1){
    if(c>p)s=s.replace(/\./g,'').replace(',','.');   // 1.234,56
    else s=s.replace(/,/g,'');                       // 1,234.56
  }else if(c>-1){
    const dec=s.length-c-1;
    s=(dec<=2&&(s.match(/,/g)||[]).length===1)?s.replace(',','.'):s.replace(/,/g,'');
  }
  const n=parseFloat(s);
  return isFinite(n)?n:0;
}
// Fecha: serial de Excel (base 1899-12-30), dd/mm/aaaa o aaaa-mm-dd
function _csvFecha(v){
  const s=String(v==null?'':v).trim();
  if(!s)return'';
  if(/^\d{4}-\d{1,2}-\d{1,2}$/.test(s)){
    const[y,m,d]=s.split('-');
    return`${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
  }
  const m=s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})/);
  if(m)return`${m[3]}-${String(m[2]).padStart(2,'0')}-${String(m[1]).padStart(2,'0')}`;
  if(/^\d{4,6}(\.\d+)?$/.test(s)){
    const d=new Date(Date.UTC(1899,11,30)+Math.round(parseFloat(s))*864e5);
    return isNaN(d)?'':d.toISOString().slice(0,10);
  }
  return'';
}

// ── Mapa de columnas ───────────────────────────────────────────────────────
const _riNorm=s=>String(s||'').toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'')
  .replace(/[^A-Z0-9]+/g,' ').trim();

// Encabezado del CSV → campo del formulario. Se busca por nombre, no por
// posición, así que da igual el orden de las columnas del archivo.
const _RI_COLS=[
  {campo:'proyecto',   rot:'Proyecto',        alias:['PROYECTO']},
  {campo:'moneda',     rot:'Moneda',          alias:['MONEDA']},
  {campo:'fecha',      rot:'Fecha de Fact.',  alias:['FECHA DE FACT','FECHA DE FACTURA','FECHA FACT','FECHA']},
  {campo:'obs',        rot:'Observaciones',   alias:['OBSERVACIONES ANOTACIONES','OBSERVACIONES','ANOTACIONES']},
  {campo:'tipoCp',     rot:'Tipo CP',         alias:['TIPO DE CP','TIPO CP']},
  {campo:'serie',      rot:'Serie',           alias:['SERIE']},
  {campo:'correlativo',rot:'Correlativo',     alias:['CORRELATIVO']},
  {campo:'ruc',        rot:'RUC',             alias:['RUC']},
  {campo:'proveedor',  rot:'Proveedor',       alias:['PROVEEDOR']},
  {campo:'codigo',     rot:'Cód. Reemb',      alias:['CODIGO','COD REEMB','CODIGO REEMB']},
  {campo:'nombreCodif',rot:'Nombre Codif.',   alias:['NOMBRE CODIF','NOMBRE CODIFICACION','NOMBRE CODIF ']},
  {campo:'itemFac',    rot:'Ítem Fac',        alias:['ITEM FAC','ITEM FACTURA']},
  {campo:'desc',       rot:'Descripción',     alias:['DESCRIPCION']},
  {campo:'edp',        rot:'EDP',             alias:['EDP']},
  {campo:'cantidad',   rot:'Cantidad',        alias:['CANTIDAD']},
  {campo:'unidad',     rot:'Unidad',          alias:['UNIDAD']},
  {campo:'precioUnit', rot:'P. Unit s/IGV',   alias:['PRECIO UNITARIO S IGV','PRECIO UNIT S IGV','P UNIT S IGV','PRECIO UNITARIO']},
  {campo:'importeCsv', rot:'Subtotal s/IGV',  alias:['SUB TOTAL S SIN IGV','SUBTOTAL S SIN IGV','SUB TOTAL S IGV']},
  {campo:'tc',         rot:'TC',              alias:['TC','TIPO DE CAMBIO']}
];
const _RI_NUM=['cantidad','precioUnit','importeCsv','tc'];

let _riDatos=null;      // resultado del análisis, a la espera de confirmación

function _riMapear(encabezado){
  const norm=encabezado.map(_riNorm);
  const map={},sinUsar=[];
  _RI_COLS.forEach(c=>{
    for(const a of c.alias){
      const i=norm.indexOf(_riNorm(a));
      if(i>-1&&!Object.values(map).includes(i)){map[c.campo]=i;return;}
    }
  });
  const usados=Object.values(map);
  norm.forEach((n,i)=>{if(n&&!usados.includes(i))sinUsar.push(encabezado[i].trim());});
  return{map,sinUsar};
}

// ── Análisis del archivo ───────────────────────────────────────────────────
function _riAnalizar(texto){
  const delim=_csvDelim(texto);
  const filas=_csvParse(texto,delim);
  if(!filas.length)return{error:'El archivo está vacío'};
  const{map,sinUsar}=_riMapear(filas[0]);
  const faltan=['desc','precioUnit'].filter(c=>map[c]===undefined);
  if(faltan.length)return{error:'No se encontraron las columnas obligatorias: '+
    faltan.map(f=>(_RI_COLS.find(c=>c.campo===f)||{}).rot).join(', ')};

  const val=(fila,campo)=>{
    const i=map[campo];
    if(i===undefined)return'';
    const v=(fila[i]==null?'':String(fila[i])).trim();
    return _RI_NUM.includes(campo)?_csvNum(v):v;
  };
  const clave=r=>[r.serie,r.correlativo,_riNorm(r.desc),(+r.importe||0).toFixed(2)].join('|');
  const yaEnBase=new Set((DB.viaticos||[]).map(clave));
  const vistas=new Set();

  const listas=[],problemas=[],duplicadas=[];
  let vacias=0;
  for(let f=1;f<filas.length;f++){
    const fila=filas[f];
    if(!fila.some(c=>String(c||'').trim())){vacias++;continue;}
    const nLinea=f+1;
    const r={
      proyecto:val(fila,'proyecto'),
      moneda:(val(fila,'moneda')||'SOLES').toUpperCase(),
      fecha:_csvFecha(map.fecha===undefined?'':fila[map.fecha]),
      tipoCp:(val(fila,'tipoCp')||'FE').toUpperCase(),
      serie:val(fila,'serie').toUpperCase(),
      correlativo:val(fila,'correlativo'),
      ruc:val(fila,'ruc'),
      proveedor:val(fila,'proveedor'),
      codigo:val(fila,'codigo').toUpperCase(),
      nombreCodif:val(fila,'nombreCodif'),
      itemFac:val(fila,'itemFac'),
      desc:val(fila,'desc').replace(/\s+/g,' ').trim(),
      unidad:val(fila,'unidad')||'UND',
      edp:val(fila,'edp'),
      obs:val(fila,'obs'),
      tc:val(fila,'tc')
    };
    let cant=val(fila,'cantidad');
    let punit=val(fila,'precioUnit');
    const subCsv=val(fila,'importeCsv');
    if(!cant)cant=1;
    if(!punit&&subCsv&&cant)punit=+(subCsv/cant).toFixed(6);   // deducir de la columna subtotal
    r.cantidad=cant;r.precioUnit=punit;
    r.importe=+(cant*punit).toFixed(2);

    const err=[];
    if(!r.desc)err.push('sin descripción');
    if(!(punit>0))err.push('precio unitario en cero');
    if(!r.fecha)err.push('fecha ilegible');
    if(err.length){problemas.push({linea:nLinea,motivo:err.join(' · '),desc:r.desc||'(vacía)'});continue;}
    if(subCsv&&Math.abs(subCsv-r.importe)>0.02)
      problemas.push({linea:nLinea,motivo:`aviso: el subtotal del archivo (${subCsv.toFixed(2)}) no cuadra con cantidad × precio (${r.importe.toFixed(2)}) — se usa el calculado`,desc:r.desc,aviso:true});

    const k=clave(r);
    if(yaEnBase.has(k)||vistas.has(k)){duplicadas.push({linea:nLinea,rec:r});continue;}
    vistas.add(k);
    listas.push({linea:nLinea,rec:r});
  }
  return{delim,total:filas.length-1,map,sinUsar,listas,problemas,duplicadas,vacias};
}

// ── Interfaz ───────────────────────────────────────────────────────────────
function _riAbrir(){
  const inp=document.getElementById('riFile');
  if(inp){inp.value='';inp.click();}
}
function _riArchivo(input){
  const file=input.files&&input.files[0];
  if(!file)return;
  const rd=new FileReader();
  rd.onload=()=>{
    // El Excel del cliente suele guardar en ANSI: si el UTF-8 deja caracteres
    // rotos se reintenta con windows-1252 antes de dar el archivo por bueno.
    let txt='';
    try{
      const buf=rd.result;
      txt=new TextDecoder('utf-8',{fatal:false}).decode(buf);
      if(txt.indexOf('�')>-1)txt=new TextDecoder('windows-1252').decode(buf);
    }catch(e){toast('No se pudo leer el archivo',true);return;}
    _riDatos=_riAnalizar(txt);
    _riDatos.nombre=file.name;
    _riPreview();
  };
  rd.onerror=()=>toast('No se pudo leer el archivo',true);
  rd.readAsArrayBuffer(file);
}

function _riPreview(){
  const cont=document.getElementById('impCsvBody');if(!cont)return;
  const btn=document.getElementById('impCsvBtn');
  const D=_riDatos;
  if(D.error){
    cont.innerHTML=`<div style="padding:2rem;text-align:center;color:#ef4444;font-weight:700">${D.error}</div>`;
    if(btn)btn.style.display='none';
    openM('mImpCsv');return;
  }
  if(btn){btn.style.display='';btn.disabled=!D.listas.length;}

  const kpi=(l,v,c)=>`<div class="kpi" style="--kc:${c};min-width:150px"><div class="kpi-lbl">${l}</div><div class="kpi-val" style="font-size:1.5rem">${v}</div></div>`;
  const esc=s=>String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  const TD='padding:.3rem .45rem;border-bottom:1px solid var(--border);font-size:.7rem;white-space:nowrap';
  const TH='background:var(--panel2);color:var(--muted2);font-size:.6rem;font-weight:700;text-transform:uppercase;letter-spacing:.05em;padding:.35rem .45rem;position:sticky;top:0';
  const cols=['linea','fecha','tipoCp','serie','correlativo','proveedor','codigo','desc','cantidad','unidad','precioUnit','importe'];
  const rot={linea:'Línea',fecha:'Fecha',tipoCp:'CP',serie:'Serie',correlativo:'Correl.',proveedor:'Proveedor',
    codigo:'Código',desc:'Descripción',cantidad:'Cant.',unidad:'Und',precioUnit:'P.Unit',importe:'Subtotal'};
  const muestra=D.listas.slice(0,40).map(({linea,rec})=>`<tr>
    ${cols.map(c=>{
      const v=c==='linea'?linea:rec[c];
      const num=['cantidad','precioUnit','importe'].includes(c);
      return`<td style="${TD}${num?';text-align:right;font-family:monospace':''}${c==='desc'?';max-width:340px;overflow:hidden;text-overflow:ellipsis':''}" ${c==='desc'?`title="${esc(rec.desc)}"`:''}>${esc(num?Number(v||0).toFixed(2):v)}</td>`;
    }).join('')}
  </tr>`).join('');

  const errores=D.problemas.filter(p=>!p.aviso);
  const avisos=D.problemas.filter(p=>p.aviso);
  const lista=(tit,arr,color)=>arr.length?`
    <details style="margin-top:.7rem"><summary style="cursor:pointer;font-size:.76rem;font-weight:700;color:${color}">${tit} (${arr.length})</summary>
      <div style="max-height:160px;overflow:auto;margin-top:.4rem;font-size:.7rem;color:var(--muted2);line-height:1.6">
        ${arr.slice(0,80).map(p=>`<div>Línea <b>${p.linea}</b> — ${esc(p.motivo||'ya existe en el sistema')}${p.desc?' · <i>'+esc(String(p.desc).slice(0,70))+'</i>':''}</div>`).join('')}
        ${arr.length>80?`<div style="opacity:.6">… y ${arr.length-80} más</div>`:''}
      </div></details>`:'';

  const totImp=D.listas.reduce((s,x)=>s+(+x.rec.importe||0),0);

  cont.innerHTML=`
    <div style="font-size:.76rem;color:var(--muted2);margin-bottom:.6rem">📄 <b style="color:var(--text)">${esc(D.nombre||'archivo.csv')}</b> · separador <span class="mono">${D.delim===';'?'punto y coma':D.delim===','?'coma':'tabulación'}</span> · ${D.total} líneas de datos</div>
    <div class="kpi-row" style="margin-bottom:.8rem">
      ${kpi('Listos para importar',D.listas.length,'#10b981')}
      ${kpi('Ya existen',D.duplicadas.length,'#f59e0b')}
      ${kpi('Con error',errores.length,'#ef4444')}
      ${kpi('Filas vacías',D.vacias,'#64748b')}
      ${kpi('Total S/ sin IGV','S/ '+totImp.toLocaleString('es-PE',{minimumFractionDigits:2,maximumFractionDigits:2}),'#06b6d4')}
    </div>
    ${D.sinUsar.length?`<div style="font-size:.7rem;color:var(--muted2);margin-bottom:.6rem">Columnas del archivo que no se importan (el sistema las calcula o no están en el formulario): <span style="color:#94a3b8">${esc(D.sinUsar.join(' · '))}</span></div>`:''}
    ${lista('⚠ Líneas con error — no se importan',errores,'#ef4444')}
    ${lista('↻ Líneas que ya existen en el sistema',D.duplicadas,'#f59e0b')}
    ${lista('ℹ Avisos de importe',avisos,'#06b6d4')}
    ${D.duplicadas.length?`<label style="display:flex;align-items:center;gap:.4rem;margin-top:.7rem;font-size:.74rem;color:var(--muted2);cursor:pointer">
      <input type="checkbox" id="riIncDup" style="width:auto" onchange="_riPreview()"> Importar también las ${D.duplicadas.length} líneas que ya existen (crea duplicados)
    </label>`:''}
    <div style="margin-top:.9rem;font-size:.72rem;color:var(--muted2);font-weight:700">Vista previa — primeras ${Math.min(40,D.listas.length)} de ${D.listas.length}</div>
    <div style="max-height:300px;overflow:auto;border:1px solid var(--border);border-radius:8px;margin-top:.35rem">
      <table style="width:100%;border-collapse:collapse">
        <thead><tr>${cols.map(c=>`<th style="${TH}">${rot[c]}</th>`).join('')}</tr></thead>
        <tbody>${muestra||`<tr><td colspan="${cols.length}" style="${TD};text-align:center;padding:1.5rem;color:var(--muted2)">Nada que importar</td></tr>`}</tbody>
      </table>
    </div>
    <div id="riProgreso" style="margin-top:.7rem;font-size:.76rem;color:var(--bsw);font-weight:700"></div>`;

  // Conservar el check al re-renderizar
  const chk=document.getElementById('riIncDup');
  if(chk&&_riDatos._incDup)chk.checked=true;
  openM('mImpCsv');
}

async function _riConfirmar(){
  const D=_riDatos;
  if(!D||D.error)return;
  const incDup=!!document.getElementById('riIncDup')?.checked;
  D._incDup=incDup;
  const cola=incDup?D.listas.concat(D.duplicadas):D.listas;
  if(!cola.length){toast('No hay líneas para importar',true);return;}

  const btn=document.getElementById('impCsvBtn');
  const prog=document.getElementById('riProgreso');
  if(btn){btn.disabled=true;btn.textContent='Importando...';}

  let ok=0,fallos=0,ultimoError='';
  for(let i=0;i<cola.length;i++){
    const rec=cola[i].rec;
    // Ítem de factura correlativo dentro de su comprobante, como en el formulario
    const itemFac=rec.itemFac||String((DB.viaticos||[])
      .filter(x=>x.serie===rec.serie&&x.correlativo===rec.correlativo).length+1).padStart(2,'0');
    const r={id:nidSeguro('via','viaticos'),...rec,itemFac};
    DB.viaticos.push(r);
    const e=await supaUpsert('viaticos',r);
    if(e){
      DB.viaticos=DB.viaticos.filter(x=>x.id!==r.id);
      fallos++;ultimoError=e.message||String(e);
    }else ok++;
    if(prog&&(i%5===0||i===cola.length-1))
      prog.textContent=`Importando ${i+1} de ${cola.length}...  ✓ ${ok}${fallos?'  ✕ '+fallos:''}`;
  }

  if(btn){btn.disabled=false;btn.textContent='📥 Importar';}
  closeM('mImpCsv');
  rViaticos();
  if(fallos)toast(`Importados ${ok} · ${fallos} con error: ${ultimoError}`,true);
  else toast(`✓ ${ok} registro${ok!==1?'s':''} importado${ok!==1?'s':''}`);
  _riDatos=null;
}
