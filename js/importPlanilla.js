// ══ IMPORTADOR DE CSV → PLANILLA ════════════════════════════════════════════
// Sube de golpe los datos que hoy se escriben uno por uno en el modal de cada
// trabajador. El archivo puede traer dos clases de dato y van a sitios
// distintos:
//
//   · Ficha del trabajador  → sueldo base, asignación familiar, movilidad,
//     AFP, CUSPP, banco y cuenta. Valen para todos los meses.
//   · Conceptos del mes     → bonos, horas extra y descuentos. Solo entran al
//     mes que esté elegido en pantalla.
//
// Lo primero que hace es EMPAREJAR cada fila del archivo con el trabajador que
// ya está en el sistema — por DNI, por CUSPP o por nombre. Nunca crea personal
// nuevo: si una fila no empareja se avisa y se deja fuera, porque un alta a
// ciegas ensucia el maestro.
//
// Solo se tocan las columnas que el archivo trae. Si el CSV no tiene
// "Adelanto", el adelanto que ya estaba cargado se queda como está: importar
// no es borrar lo que no se mencionó.
//
// El parser (_csvParse, _csvDelim, _csvNum) vive en js/importCsv.js.

const _iplNorm=s=>String(s==null?'':s).toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g,'')
  .replace(/[^A-Z0-9]+/g,' ').trim();
const _iplEsc=s=>String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const _iplDni=s=>String(s==null?'':s).replace(/\D/g,'');
const _iplN=v=>Number(v||0).toLocaleString('es-PE',{minimumFractionDigits:2,maximumFractionDigits:2});
// Las palabras del nombre, ordenadas: así "PEREZ LOPEZ, JUAN" y "JUAN PEREZ
// LOPEZ" son la misma persona sin depender del orden ni de la coma.
const _iplClaveNom=s=>_iplNorm(s).split(' ').filter(Boolean).sort().join(' ');
// Sí/No tolerante — acepta SI, X, TRUE, 1 y también un monto (113.00 → sí)
function _iplBool(v){
  const s=String(v==null?'':v).trim();
  if(!s)return 0;
  const n=_iplNorm(s);
  if(['SI','S','X','TRUE','VERDADERO','V','Y','YES'].includes(n))return 1;
  if(['NO','N','FALSE','FALSO','F'].includes(n))return 0;
  return _csvNum(s)>0?1:0;
}

// ── Qué columna va a qué campo ─────────────────────────────────────────────
// Se busca por nombre de encabezado, no por posición: el orden del archivo da
// igual y las columnas que no reconoce se listan como ignoradas.

// A · Datos de la ficha del trabajador (DB.personal)
const _IPL_FICHA=[
  {campo:'sue',      rot:'Sueldo base',   tipo:'num',  alias:['SUELDO BASE','SUELDO BASICO','SUELDO','BASICO','REMUNERACION BASICA','REMUNERACION','HABER BASICO','SUELDO MENSUAL']},
  {campo:'asig',     rot:'Asig. familiar',tipo:'bool', alias:['ASIGNACION FAMILIAR','ASIG FAMILIAR','ASIG FAM','ASIGNACION FAM','AF']},
  {campo:'movilidad',rot:'Movilidad',     tipo:'num',  alias:['MOVILIDAD','BONO MOVILIDAD','B MOVILIDAD','BONO DE MOVILIDAD','MOVILIDAD SUPEDITADA']},
  {campo:'afp',      rot:'AFP / ONP',     tipo:'txt',  alias:['AFP','AFP ONP','SISTEMA PENSIONARIO','REGIMEN PENSIONARIO','SISTEMA DE PENSIONES','PENSION']},
  {campo:'cuspp',    rot:'CUSPP',         tipo:'txt',  alias:['CUSPP','CODIGO CUSPP']},
  {campo:'banco',    rot:'Banco',         tipo:'txt',  alias:['BANCO','ENTIDAD FINANCIERA']},
  {campo:'cuenta',   rot:'Cuenta',        tipo:'txt',  alias:['CUENTA','NRO CUENTA','N CUENTA','NUMERO DE CUENTA','CTA','CUENTA BANCARIA','CCI']},
  {campo:'cargo',    rot:'Cargo',         tipo:'txt',  alias:['CARGO','PUESTO','OCUPACION']}
];

// B · Conceptos del mes (DB.planillaMes)
const _IPL_MES=[
  // Horas extra
  {campo:'he25',        rot:'H.E. 25 %',      g:'Horas extra', alias:['HE 25','H E 25','HORAS EXTRAS 25','HORA EXTRA 25','HE25','EXTRAS 25']},
  {campo:'he35',        rot:'H.E. 35 %',      g:'Horas extra', alias:['HE 35','H E 35','HORAS EXTRAS 35','HORA EXTRA 35','HE35','EXTRAS 35']},
  {campo:'he100',       rot:'H.E. 100 %',     g:'Horas extra', alias:['HE 100','H E 100','HORAS EXTRAS 100','HORA EXTRA 100','HE100','EXTRAS 100']},
  {campo:'heAdicional', rot:'H.E. adicional', g:'Horas extra', alias:['HE ADICIONAL','HORAS EXTRAS ADICIONALES','EXTRA ADICIONAL']},
  // Ingresos y bonos
  {campo:'reintegro',   rot:'Reintegro',      g:'Ingresos',    alias:['REINTEGRO','REINTEGROS']},
  {campo:'bAltura',     rot:'Bonif. altura',  g:'Ingresos',    alias:['BONIFICACION ALTURA','BONIF ALTURA','B ALTURA','BONO ALTURA','ALTURA']},
  {campo:'bCv',         rot:'Bonif. C. vida', g:'Ingresos',    alias:['BONIFICACION COSTO DE VIDA','BONIF COSTO DE VIDA','B COSTO DE VIDA','BONO COSTO DE VIDA','COSTO DE VIDA','BCV']},
  {campo:'bNocturnas',  rot:'Bonif. nocturna',g:'Ingresos',    alias:['BONIFICACION NOCTURNA','BONIF NOCTURNAS','B NOCTURNAS','NOCTURNAS','SOBRETASA NOCTURNA']},
  {campo:'refrigerio',  rot:'Refrigerio',     g:'Ingresos',    alias:['REFRIGERIO','REFRIGERIOS','ALIMENTACION']},
  {campo:'licSindical', rot:'Lic. sindical',  g:'Ingresos',    alias:['LICENCIA SINDICAL','LIC SINDICAL']},
  {campo:'vacaciones',  rot:'Vacaciones',     g:'Ingresos',    alias:['VACACIONES','VACACIONES PAGADAS']},
  {campo:'bono',        rot:'Bono',           g:'Ingresos',    alias:['BONO','BONOS','BONIFICACION EXTRAORDINARIA','OTROS BONOS']},
  {campo:'gratificacion',rot:'Gratificación', g:'Ingresos',    alias:['GRATIFICACION','GRATIFICACIONES','GRATIF']},
  {campo:'gratifTrunca',rot:'Gratif. trunca', g:'Ingresos',    alias:['GRATIFICACION TRUNCA','GRATIF TRUNCA','TRUNCA']},
  // Descuentos
  {campo:'adelanto',    rot:'Adelanto',       g:'Descuentos',  alias:['ADELANTO','ADELANTOS','ANTICIPO','ANTICIPOS','PRESTAMO']},
  {campo:'vacDesc',     rot:'Desc. vacac.',   g:'Descuentos',  alias:['DESCUENTO VACACIONES','DESC VACACIONES','VACACIONES DESCUENTO']},
  {campo:'cts',         rot:'CTS',            g:'Descuentos',  alias:['CTS','DESCUENTO CTS']},
  {campo:'sindicato',   rot:'Sindicato',      g:'Descuentos',  alias:['SINDICATO','CUOTA SINDICAL','APORTE SINDICAL']},
  {campo:'rimac',       rot:'Rímac',          g:'Descuentos',  alias:['RIMAC','SEGURO RIMAC','EPS','EPS RIMAC']},
  {campo:'masVida',     rot:'Más Vida',       g:'Descuentos',  alias:['MAS VIDA','MASVIDA','MAS VIDA SALUD']},
  {campo:'fondoMina',   rot:'Fondo minero',   g:'Descuentos',  alias:['FONDO MINERO','FONDO MINA','LEY 29741','FONDO COMPLEMENTARIO','FCJMMS']},
  {campo:'otrosDesc',   rot:'Otros desc.',    g:'Descuentos',  alias:['OTROS DESCUENTOS','OTRO DESCUENTO','OTROS DESC','DESCUENTOS VARIOS']},
  {campo:'retJudicial', rot:'Ret. judicial',  g:'Descuentos',  alias:['RETENCION JUDICIAL','RET JUDICIAL','JUDICIAL','ALIMENTOS']},
  {campo:'quintaCat',   rot:'5ta categoría',  g:'Descuentos',  alias:['QUINTA CATEGORIA','5TA CATEGORIA','RENTA 5TA','RENTA DE QUINTA','IMPUESTO 5TA']},
  // Aportes del empleador
  {campo:'sctrPenSup',  rot:'SCTR pen. sup.', g:'Empleador',   alias:['SCTR PENSION SUPERFICIE','SCTR PEN SUP','SCTR PENSION SUP']},
  {campo:'sctrPenMina', rot:'SCTR pen. mina', g:'Empleador',   alias:['SCTR PENSION MINA','SCTR PEN MINA','SCTR PENSION SUBTERRANEO']},
  {campo:'sctrSalud',   rot:'SCTR salud',     g:'Empleador',   alias:['SCTR SALUD','SCTR DE SALUD']},
  {campo:'segVidaEmpl', rot:'Seg. vida',      g:'Empleador',   alias:['SEGURO DE VIDA','SEG VIDA','SEGURO VIDA']},
  {campo:'segVidaLey',  rot:'Seg. vida ley',  g:'Empleador',   alias:['SEGURO DE VIDA LEY','SEG VIDA LEY','VIDA LEY']}
];

// C · Cómo se identifica al trabajador
const _IPL_ID=[
  {campo:'dni',   alias:['DNI','D N I','DOCUMENTO','NRO DOCUMENTO','N DOCUMENTO','NUMERO DE DOCUMENTO','CI','DNI CE']},
  {campo:'cuspp', alias:['CUSPP','CODIGO CUSPP']},
  {campo:'nombre',alias:['APELLIDOS Y NOMBRES','APELLIDOS Y NOMBRE','TRABAJADOR','NOMBRE COMPLETO','NOMBRES Y APELLIDOS','NOMBRE DEL TRABAJADOR','PERSONAL','COLABORADOR']},
  {campo:'ape',   alias:['APELLIDOS','APELLIDO','APELLIDO PATERNO Y MATERNO']},
  {campo:'nom',   alias:['NOMBRES','NOMBRE']}
];

let _iplDatos=null;    // el análisis, esperando confirmación

// ── El mes al que va lo importado ──────────────────────────────────────────
// Si ya se generó la planilla manda ese mes; si no, el que esté elegido en los
// selectores de arriba. De esa forma el importador sirve apenas se entra a la
// pantalla, sin obligar a generar antes.
function _iplPer(){
  const sel=id=>{const el=document.getElementById(id);return el?+el.value||0:0;};
  const mes =+_plGenMes ||sel('plMes');
  const anio=+_plGenAnio||sel('plAnio')||new Date().getFullYear();
  return{mes,anio,lbl:(_PL_MESES[mes]||'—')+' '+anio};
}

// ── Emparejar con el personal del sistema ──────────────────────────────────
// Tres intentos, del más confiable al menos: DNI, CUSPP y nombre. El nombre
// solo vale si apunta a UNA sola persona; con dos homónimos se deja fuera y se
// avisa, en vez de elegir por sorteo.
function _iplEmparejar(id){
  const gente=(DB.personal||[]).filter(p=>p&&p.id!=null);
  const dni=_iplDni(id.dni);
  if(dni.length>=6){
    const c=gente.filter(p=>_iplDni(p.dni)===dni);
    if(c.length===1)return{p:c[0],como:'DNI'};
    if(c.length>1)return{p:null,motivo:`el DNI ${dni} está repetido en ${c.length} trabajadores`};
  }
  const cus=_iplNorm(id.cuspp);
  if(cus){
    const c=gente.filter(p=>_iplNorm(p.cuspp)===cus);
    if(c.length===1)return{p:c[0],como:'CUSPP'};
  }
  const nom=(id.nombre||[id.ape,id.nom].filter(Boolean).join(' ')).trim();
  const k=_iplClaveNom(nom);
  if(k){
    const c=gente.filter(p=>_iplClaveNom(p.ape+' '+p.nom)===k);
    if(c.length===1)return{p:c[0],como:'nombre'};
    if(c.length>1)return{p:null,motivo:`"${nom}" coincide con ${c.length} trabajadores: precise el DNI`};
  }
  const quien=dni||nom||'(sin identificar)';
  return{p:null,motivo:`no se encontró a "${quien}" en el maestro de personal`};
}

// ── Análisis del archivo ───────────────────────────────────────────────────
function _iplMapear(enc){
  const norm=enc.map(_iplNorm);
  const map={},usados=[],ids=[];
  // Una columna se reparte entre los campos: la primera que la pida se la
  // queda. Los identificadores son la excepción — no la consumen. El CUSPP
  // sirve para reconocer a quien ya lo tiene y, a la vez, para cargárselo a
  // quien todavía no lo tiene; escribir el mismo valor no cuenta como cambio.
  const tomar=(clave,alias,exclusiva)=>{
    for(const a of alias){
      const i=norm.indexOf(_iplNorm(a));
      if(i>-1&&map[clave]==null&&(!exclusiva||!usados.includes(i))){
        map[clave]=i;
        if(exclusiva)usados.push(i);else ids.push(i);
        return;
      }
    }
  };
  _IPL_ID.forEach(c=>tomar('id_'+c.campo,c.alias,false));
  _IPL_FICHA.forEach(c=>tomar('f_'+c.campo,c.alias,true));
  _IPL_MES.forEach(c=>tomar('m_'+c.campo,c.alias,true));
  const sinUsar=[];
  norm.forEach((n,i)=>{if(n&&!usados.includes(i)&&!ids.includes(i))sinUsar.push(String(enc[i]).trim());});
  return{map,sinUsar};
}

function _iplAnalizar(texto){
  const PER=_iplPer();
  const delim=_csvDelim(texto);
  const filas=_csvParse(texto,delim);
  if(!filas.length)return{error:'El archivo está vacío'};

  // El encabezado no siempre es la primera línea: los reportes traen título y
  // líneas en blanco arriba. Se busca la primera fila que reconozca algo.
  let iEnc=-1,mejor=null;
  for(let i=0;i<Math.min(15,filas.length);i++){
    const m=_iplMapear(filas[i]);
    const n=Object.keys(m.map).length;
    if(n>=1&&(!mejor||n>mejor.n)){mejor={...m,n};iEnc=i;}
  }
  if(iEnc<0)return{error:'No se reconoció ninguna columna. Se esperaba al menos el DNI (o el nombre) y un dato como el sueldo base.'};

  const{map,sinUsar}=mejor;
  const hayId=['id_dni','id_cuspp','id_nombre','id_ape','id_nom'].some(k=>map[k]!=null);
  if(!hayId)return{error:'Falta la columna que identifica al trabajador: DNI, CUSPP o Apellidos y Nombres.'};

  const ficha=_IPL_FICHA.filter(c=>map['f_'+c.campo]!=null);
  const mes  =_IPL_MES  .filter(c=>map['m_'+c.campo]!=null);
  if(!ficha.length&&!mes.length)return{error:'El archivo identifica a la gente pero no trae ningún dato que importar (sueldo, bonos o descuentos).'};

  const val=(f,i)=>i==null?'':String(f[i]==null?'':f[i]).trim();
  const listas=[],problemas=[],vistos=new Map();
  let vacias=0;

  for(let i=iEnc+1;i<filas.length;i++){
    const f=filas[i],linea=i+1;
    if(!f.some(c=>String(c||'').trim())){vacias++;continue;}

    const id={dni:val(f,map.id_dni),cuspp:val(f,map.id_cuspp),
      nombre:val(f,map.id_nombre),ape:val(f,map.id_ape),nom:val(f,map.id_nom)};
    if(!_iplDni(id.dni)&&!_iplNorm(id.cuspp)&&!_iplNorm(id.nombre)&&!_iplNorm(id.ape)&&!_iplNorm(id.nom)){vacias++;continue;}

    const quien=(id.nombre||[id.ape,id.nom].filter(Boolean).join(' ')||id.dni||'—').trim();
    const em=_iplEmparejar(id);
    if(!em.p){problemas.push({linea,quien,motivo:em.motivo});continue;}

    // Una persona, una fila. Si el archivo la repite se avisa y manda la primera.
    if(vistos.has(em.p.id)){
      problemas.push({linea,quien,motivo:`repetido: ya venía en la línea ${vistos.get(em.p.id)}`});continue;
    }
    vistos.set(em.p.id,linea);

    // Solo lo que de verdad cambia. Una columna vacía no borra lo cargado.
    const camF=[],camM=[];
    ficha.forEach(c=>{
      const crudo=val(f,map['f_'+c.campo]);
      if(crudo==='')return;
      const nuevo=c.tipo==='num'?_csvNum(crudo):c.tipo==='bool'?_iplBool(crudo):crudo.trim();
      const viejo=c.tipo==='num'?(+em.p[c.campo]||0):c.tipo==='bool'?(+em.p[c.campo]?1:0):String(em.p[c.campo]||'').trim();
      if(String(viejo)!==String(nuevo))camF.push({...c,viejo,nuevo});
    });
    const det=(DB.planillaMes||[]).find(d=>d.personalId===em.p.id&&+d.mes===+PER.mes&&String(d.anio)===String(PER.anio));
    mes.forEach(c=>{
      const crudo=val(f,map['m_'+c.campo]);
      if(crudo==='')return;
      const nuevo=_csvNum(crudo);
      const viejo=+(det&&det[c.campo])||0;
      if(viejo!==nuevo)camM.push({...c,viejo,nuevo});
    });

    if(!camF.length&&!camM.length){problemas.push({linea,quien,motivo:'sin cambios: ya tiene esos mismos valores',igual:1});continue;}
    listas.push({linea,p:em.p,como:em.como,camF,camM});
  }

  return{delim,iEnc,total:filas.length-iEnc-1,map,sinUsar,ficha,mes,listas,problemas,vacias,
    per:PER,mesLbl:PER.lbl};
}

// ── Interfaz ───────────────────────────────────────────────────────────────
function _iplAbrir(){
  const per=_iplPer();
  if(!per.mes){toast('Elija el mes al que va la información',true);return;}
  if(!(DB.personal||[]).length){toast('No hay personal cargado con quien emparejar el archivo',true);return;}
  const inp=document.getElementById('iplFile');
  if(inp){inp.value='';inp.click();}
}
function _iplArchivo(input){
  const file=input.files&&input.files[0];
  if(!file)return;
  const rd=new FileReader();
  rd.onload=()=>{
    // El Excel del cliente suele guardar en ANSI: si el UTF-8 deja caracteres
    // rotos se reintenta con windows-1252.
    let txt='';
    try{
      const buf=rd.result;
      txt=new TextDecoder('utf-8',{fatal:false}).decode(buf);
      if(txt.indexOf('�')>-1)txt=new TextDecoder('windows-1252').decode(buf);
    }catch(e){toast('No se pudo leer el archivo',true);return;}
    _iplDatos=_iplAnalizar(txt);
    _iplDatos.nombre=file.name;
    _iplPreview();
  };
  rd.onerror=()=>toast('No se pudo leer el archivo',true);
  rd.readAsArrayBuffer(file);
}

function _iplPreview(){
  const cont=document.getElementById('impPlaBody');if(!cont)return;
  const btn=document.getElementById('impPlaBtn');
  const D=_iplDatos;
  if(D.error){
    cont.innerHTML=`<div style="padding:2rem;text-align:center;color:#ef4444;font-weight:700">${_iplEsc(D.error)}</div>`;
    if(btn)btn.style.display='none';
    openM('mImpPla');return;
  }

  // Un mes cerrado no se toca: para eso se cerró.
  const cerrado=typeof plMesCerrado==='function'&&plMesCerrado(D.per.mes,D.per.anio);
  if(btn){btn.style.display='';btn.disabled=!D.listas.length||cerrado;}

  const kpi=(l,v,c)=>`<div class="kpi" style="--kc:${c};min-width:150px"><div class="kpi-lbl">${l}</div><div class="kpi-val" style="font-size:1.5rem">${v}</div></div>`;
  const TD='padding:.3rem .45rem;border-bottom:1px solid var(--border);font-size:.7rem;vertical-align:top';
  const TH='background:var(--panel2);color:var(--muted2);font-size:.6rem;font-weight:700;text-transform:uppercase;letter-spacing:.05em;padding:.35rem .45rem;position:sticky;top:0;text-align:left';

  const pinta=(c,color)=>{
    const num=c.tipo!=='txt';
    const v=x=>c.tipo==='bool'?(+x?'Sí':'No'):num?_iplN(x):(String(x||'')||'—');
    return`<span style="display:inline-block;background:${color}14;border:1px solid ${color}40;border-radius:5px;padding:0 .3rem;margin:1px 2px 1px 0;white-space:nowrap">
      <span style="color:${color};font-weight:700">${_iplEsc(c.rot)}</span>
      <span style="color:var(--muted2);text-decoration:line-through;opacity:.65;margin:0 .2rem">${_iplEsc(v(c.viejo))}</span>
      <span style="font-weight:700;font-family:monospace">${_iplEsc(v(c.nuevo))}</span></span>`;
  };
  const COMO={DNI:'#10b981',CUSPP:'#06b6d4',nombre:'#f59e0b'};
  const muestra=D.listas.slice(0,60).map(x=>`<tr>
    <td style="${TD};font-family:monospace;color:var(--muted2)">${x.linea}</td>
    <td style="${TD};font-weight:700;white-space:nowrap">${_iplEsc(x.p.ape+', '+x.p.nom)}
      <div style="font-size:.58rem;font-weight:400;color:var(--muted2)">${_iplEsc(x.p.dni||'')} · ${_iplEsc(x.p.cargo||'')}</div></td>
    <td style="${TD};text-align:center"><span style="background:${COMO[x.como]}18;color:${COMO[x.como]};border:1px solid ${COMO[x.como]}40;border-radius:4px;padding:1px 6px;font-size:.58rem;font-weight:700">${x.como}</span></td>
    <td style="${TD}">${x.camF.map(c=>pinta(c,'#8b5cf6')).join('')||'<span style="color:var(--muted2)">—</span>'}</td>
    <td style="${TD}">${x.camM.map(c=>pinta(c,'#06b6d4')).join('')||'<span style="color:var(--muted2)">—</span>'}</td>
  </tr>`).join('');

  const sinCambio=D.problemas.filter(p=>p.igual);
  const errores  =D.problemas.filter(p=>!p.igual);
  const lista=(tit,arr,color)=>arr.length?`
    <details style="margin-top:.7rem"><summary style="cursor:pointer;font-size:.76rem;font-weight:700;color:${color}">${tit} (${arr.length})</summary>
      <div style="max-height:170px;overflow:auto;margin-top:.4rem;font-size:.7rem;color:var(--muted2);line-height:1.6">
        ${arr.slice(0,100).map(p=>`<div>Línea <b>${p.linea}</b> · ${_iplEsc(p.quien)} — ${_iplEsc(p.motivo)}</div>`).join('')}
        ${arr.length>100?`<div style="opacity:.6">… y ${arr.length-100} más</div>`:''}
      </div></details>`:'';

  const nF=D.listas.reduce((s,x)=>s+x.camF.length,0);
  const nM=D.listas.reduce((s,x)=>s+x.camM.length,0);
  const chip=(t,c)=>`<span style="background:${c}14;border:1px solid ${c}40;color:${c};border-radius:5px;padding:1px .4rem;font-size:.64rem;font-weight:700;margin:2px 3px 2px 0;display:inline-block">${_iplEsc(t)}</span>`;

  cont.innerHTML=`
    <div style="font-size:.76rem;color:var(--muted2);margin-bottom:.6rem">📄 <b style="color:var(--text)">${_iplEsc(D.nombre||'archivo.csv')}</b> · separador <span class="mono">${D.delim===';'?'punto y coma':D.delim===','?'coma':'tabulación'}</span> · encabezado en la línea ${D.iEnc+1} · ${D.total} filas de datos</div>

    ${cerrado?`<div style="background:rgba(239,68,68,.1);border:1px solid #ef444460;border-radius:8px;padding:.6rem .8rem;margin-bottom:.7rem;font-size:.78rem;color:#ef4444;font-weight:700">
      🔒 La planilla de ${_iplEsc(D.mesLbl)} está cerrada. Reábrala para poder importar.</div>`:''}

    <div style="background:rgba(139,92,246,.08);border:1px solid rgba(139,92,246,.35);border-radius:8px;padding:.5rem .7rem;margin-bottom:.7rem;font-size:.74rem;color:var(--muted2)">
      Los conceptos del mes entran en <b style="color:#8b5cf6">${_iplEsc(D.mesLbl)}</b> — el mes elegido arriba. Los datos de la ficha (sueldo, AFP, banco…) valen para todos los meses.
    </div>

    <div class="kpi-row" style="margin-bottom:.8rem">
      ${kpi('Trabajadores a actualizar',D.listas.length,'#10b981')}
      ${kpi('Datos de ficha',nF,'#8b5cf6')}
      ${kpi('Conceptos del mes',nM,'#06b6d4')}
      ${kpi('Sin cambios',sinCambio.length,'#64748b')}
      ${kpi('No emparejados',errores.length,errores.length?'#ef4444':'#64748b')}
    </div>

    <div style="font-size:.72rem;color:var(--muted2);margin-bottom:.5rem">
      <b style="color:var(--text)">Columnas reconocidas</b><br>
      ${D.ficha.map(c=>chip(c.rot,'#8b5cf6')).join('')}${D.mes.map(c=>chip(c.rot,'#06b6d4')).join('')}
      ${(!D.ficha.length&&!D.mes.length)?'ninguna':''}
    </div>
    ${D.sinUsar.length?`<div style="font-size:.7rem;color:var(--muted2);margin-bottom:.6rem">Columnas que no se importan (el sistema las calcula o no las maneja): <span style="color:#94a3b8">${_iplEsc(D.sinUsar.join(' · '))}</span></div>`:''}

    ${lista('⚠ Filas que no se pudieron emparejar — no se importan',errores,'#ef4444')}
    ${lista('✓ Filas que ya tienen esos mismos valores',sinCambio,'#64748b')}

    <label style="display:flex;align-items:center;gap:.4rem;margin-top:.7rem;font-size:.74rem;color:var(--muted2);cursor:pointer">
      <input type="checkbox" id="iplSoloMes" style="width:auto" onchange="_iplPreview()"> Importar solo los conceptos del mes, sin tocar la ficha de los trabajadores
    </label>

    <div style="margin-top:.9rem;font-size:.72rem;color:var(--muted2);font-weight:700">Qué va a cambiar — primeros ${Math.min(60,D.listas.length)} de ${D.listas.length}</div>
    <div style="max-height:320px;overflow:auto;border:1px solid var(--border);border-radius:8px;margin-top:.35rem">
      <table style="width:100%;border-collapse:collapse">
        <thead><tr>
          <th style="${TH}">Línea</th><th style="${TH}">Trabajador</th><th style="${TH};text-align:center">Match</th>
          <th style="${TH}">Ficha</th><th style="${TH}">Conceptos de ${_iplEsc(D.mesLbl)}</th>
        </tr></thead>
        <tbody>${muestra||`<tr><td colspan="5" style="${TD};text-align:center;padding:1.5rem;color:var(--muted2)">Nada que actualizar</td></tr>`}</tbody>
      </table>
    </div>
    <div id="iplProgreso" style="margin-top:.7rem;font-size:.76rem;color:var(--adm);font-weight:700"></div>`;

  const chk=document.getElementById('iplSoloMes');
  if(chk&&_iplDatos._soloMes)chk.checked=true;
  openM('mImpPla');
}

// ── Guardar ────────────────────────────────────────────────────────────────
async function _iplConfirmar(){
  const D=_iplDatos;
  if(!D||D.error)return;
  if(typeof plMesCerrado==='function'&&plMesCerrado(D.per.mes,D.per.anio)){
    toast('La planilla de ese mes está cerrada',true);return;
  }
  const soloMes=!!(document.getElementById('iplSoloMes')||{}).checked;
  D._soloMes=soloMes;
  const cola=D.listas.filter(x=>x.camM.length||(!soloMes&&x.camF.length));
  if(!cola.length){toast('No hay nada que importar',true);return;}

  const nF=cola.reduce((s,x)=>s+(soloMes?0:x.camF.length),0);
  const nM=cola.reduce((s,x)=>s+x.camM.length,0);
  if(!confirm(`Se van a actualizar ${cola.length} trabajador(es):\n`
    +(nF?`  · ${nF} dato(s) de ficha (sueldo, AFP, banco…)\n`:'')
    +(nM?`  · ${nM} concepto(s) de ${D.mesLbl}\n`:'')
    +`\nLo que el archivo no menciona se queda como está. ¿Continuar?`))return;

  const btn=document.getElementById('impPlaBtn');
  const prog=document.getElementById('iplProgreso');
  if(btn){btn.disabled=true;btn.textContent='Importando...';}

  let okP=0,okM=0,fallos=0,ultimo='';
  for(let i=0;i<cola.length;i++){
    const x=cola[i];

    // A · Ficha del trabajador
    if(!soloMes&&x.camF.length){
      const p=(DB.personal||[]).find(y=>y.id===x.p.id);
      if(p){
        const prev={...p};
        x.camF.forEach(c=>{p[c.campo]=c.nuevo;});
        const e=await supaUpsert('personal',p);
        if(e){Object.assign(p,prev);fallos++;ultimo=e.message||String(e);}
        else okP++;
      }
    }
    // B · Conceptos del mes
    if(x.camM.length){
      DB.planillaMes=DB.planillaMes||[];
      let det=DB.planillaMes.find(d=>d.personalId===x.p.id&&+d.mes===+D.per.mes&&String(d.anio)===String(D.per.anio));
      const nuevo=!det;
      if(nuevo)det={id:nidSeguro('plm','planillaMes'),personalId:x.p.id,mes:+D.per.mes,anio:D.per.anio};
      const prev={...det};
      x.camM.forEach(c=>{det[c.campo]=c.nuevo;});
      if(nuevo)DB.planillaMes.push(det);
      const e=await supaUpsert('planillaMes',det);
      if(e){
        if(nuevo)DB.planillaMes=DB.planillaMes.filter(d=>d.id!==det.id);
        else Object.assign(det,prev);
        fallos++;ultimo=e.message||String(e);
      }else okM++;
    }
    if(prog&&(i%5===0||i===cola.length-1))
      prog.textContent=`Importando ${i+1} de ${cola.length}...  ✓ ${okP+okM}${fallos?'  ✕ '+fallos:''}`;
  }

  if(btn){btn.disabled=false;btn.textContent='📥 Importar';}
  closeM('mImpPla');
  if(typeof genPlanilla==='function'&&_plGenMes)genPlanilla();
  if(typeof rPersonal==='function'&&document.getElementById('page-personal')?.classList.contains('active'))rPersonal();
  if(fallos)toast(`Actualizados ${okP+okM} · ${fallos} con error: ${ultimo}`,true);
  else toast(`✓ ${okP} ficha(s) y ${okM} mes(es) actualizados`);
  _iplDatos=null;
}

// ── Plantilla de ejemplo ───────────────────────────────────────────────────
// Un CSV con los encabezados que el importador reconoce y la gente que ya está
// cargada, para llenarlo en Excel y devolverlo sin adivinar nombres.
function _iplPlantilla(){
  const cols=['DNI','Apellidos y Nombres','Sueldo base','Asignación familiar','Movilidad','AFP','CUSPP','Banco','Cuenta',
    'HE 25','HE 35','HE 100','Reintegro','Bonificación altura','Bonificación nocturna','Refrigerio','Bono','Gratificación',
    'Adelanto','CTS','Sindicato','Rímac','Más Vida','Fondo minero','Otros descuentos','Retención judicial','Quinta categoría'];
  const q=v=>'"'+String(v==null?'':v).replace(/"/g,'""')+'"';
  const gente=(DB.personal||[]).filter(p=>(p.est||'Activo')==='Activo')
    .sort((a,b)=>String(a.ape||'').localeCompare(String(b.ape||'')));
  if(!gente.length){toast('No hay personal activo para armar la plantilla',true);return;}
  const filas=gente.map(p=>[p.dni||'',(p.ape||'')+', '+(p.nom||''),p.sue||'',+p.asig?'SI':'NO',p.movilidad||'',
    p.afp||'',p.cuspp||'',p.banco||'',p.cuenta||''].concat(new Array(cols.length-9).fill('')));
  const csv='﻿'+[cols,...filas].map(f=>f.map(q).join(';')).join('\r\n');
  const a=document.createElement('a');
  a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));
  a.download='Plantilla_Planilla_'+_iplPer().lbl.replace(/ /g,'_')+'.csv';
  document.body.appendChild(a);a.click();document.body.removeChild(a);
  setTimeout(()=>URL.revokeObjectURL(a.href),1000);
  toast(`✓ Plantilla con ${gente.length} trabajador(es)`);
}
