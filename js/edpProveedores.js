// ══ EDP PROVEEDORES — Estado de Pago para proveedores de equipos ══
// Página 1: EDP (horas efectivas × tarifa − descuentos de Auxilios Mecánicos, IGV, detracción)
// Página 2: Consolidado de Horas Trabajadas (Partes Diarios del equipo en el período)
let _edpEqId='', _edpNum='', _edpDesde='', _edpHasta='';
// Período aparte para los auxilios mecánicos. Los repuestos y las atenciones
// suelen venir de más atrás que las horas máquina del EDP, y mezclarlos en un
// solo rango obligaba a estirar el período de las horas.
//   _edpAuxSync = true  → sigue al período de horas máquina (así arranca)
//   _edpAuxSync = false → se escribe a mano
let _edpAuxDesde='', _edpAuxHasta='', _edpAuxSync=true;
// Tipo de cambio para pasar los descuentos (que salen en soles) a la moneda
// del equipo. Solo se usa cuando el equipo NO se valoriza en soles.
let _edpTC=0;
function _edpMonedaEq(eq){return (eq&&eq.moneda)||'SOLES';}
function _edpNecesitaTC(eq){return _edpMonedaEq(eq)!=='SOLES';}
// Factor por el que se multiplica un importe en soles. Sin tipo de cambio
// cargado se devuelve 1 y se avisa en pantalla: es preferible ver el descuento
// en soles y con aviso, que verlo desaparecer o mal convertido en silencio.
function _edpFactorTC(eq){
  if(!_edpNecesitaTC(eq))return 1;
  const tc=+_edpTC||0;
  return tc>0?1/tc:1;
}
function _edpTCFalta(eq){return _edpNecesitaTC(eq)&&!(+_edpTC>0);}
// El período que de verdad se usa para buscar auxilios
// Tarjetas plegadas. Se guarda en el navegador para no tener que volver a
// cerrarlas cada vez que se entra.
let _edpPlegado={};
try{_edpPlegado=JSON.parse(localStorage.getItem('_edpPlegado')||'{}')||{};}catch(e){_edpPlegado={};}
function edpPlegar(k){
  _edpPlegado[k]=!_edpPlegado[k];
  try{localStorage.setItem('_edpPlegado',JSON.stringify(_edpPlegado));}catch(e){}
  rEdpProveedores();
}
// La cabecera de una tarjeta plegable: el título entero es el interruptor.
function _edpCabPleg(k,titulo,resumen){
  const off=!!_edpPlegado[k];
  return`<div class="card-head" onclick="edpPlegar('${k}')" title="${off?'Mostrar':'Ocultar'}"
    style="cursor:pointer;user-select:none;display:flex;align-items:center;gap:.5rem">
    <span style="color:var(--muted2);font-size:.7rem;transition:transform .15s;display:inline-block;${off?'':'transform:rotate(90deg)'}">▶</span>
    <span class="card-title">${titulo}</span>
    ${off&&resumen?`<span style="font-size:.7rem;color:var(--muted2);font-weight:400">· ${resumen}</span>`:''}
  </div>`;
}
function _edpPerAux(){
  if(_edpAuxSync)return{desde:_edpDesde,hasta:_edpHasta};
  return{desde:_edpAuxDesde||_edpDesde,hasta:_edpAuxHasta||_edpHasta};
}
// ¿Está mirando un rango distinto al de las horas?
function _edpAuxDistinto(){
  const p=_edpPerAux();
  return p.desde!==_edpDesde||p.hasta!==_edpHasta;
}
// Cliente fijo (abreviado): ECOSERMO · RUC 20571533180
let _edpCliente='ECOSERMO', _edpRuc='20571533180', _edpDireccion='';
let _edpTarifaOv=null, _edpHminOv=null, _edpTarifaAtencion=0;
let _edpCantPres=null;   // Cantidad contractual (columna PRESUPUESTO) — opcional
let _edpAcumAnt=0;       // Total valorizado en EDP anteriores (para ACUMULADO ACTUAL)
let _edpFirmaProv='', _edpFirmaEco=''; // Nombres bajo la línea de firma
let _edpFirmaEcoId=null;               // Firma virtual (imagen) del residente para el cajetín ECOSERMO
const _EDP_FIRMA_BUCKET='Equip_eco26'; // se reusa el bucket público de equipos, carpeta firmas/
let _edpDescManual=[];
let _edpRecon=0;          // Reconocimiento contractual (+/−) en unidades de la tarifa
let _edpReconMotivo='';   // Sustento que se imprime en el EDP
// Tarifa por DÍA: cómo se cuenta lo trabajado.
//  'turno' → cada parte vale 1 (día y noche del mismo día son 2) — comportamiento histórico
//  'fecha' → se paga por día calendario (día y noche del mismo día son 1)
let _edpDiaModo='turno';
// Disponibilidad mecánica mínima exigida para tener derecho a cobrar las horas
// mínimas del contrato. Por debajo de este umbral el equipo no cumplió y solo
// se le pagan las horas que efectivamente trabajó.
const _EDP_DISP_MIN=85;
// Checkbox "Solo horas efectivas": ignora el mínimo aunque la disponibilidad
// sea buena. Arranca siempre desmarcado (no se recuerda entre EDPs).
let _edpSoloEfectivas=false;

function _edpFmtDMY(iso){if(!iso||!iso.includes('-'))return iso||'—';const[y,m,d]=iso.split('-');return`${d}/${m}/${y}`;}

// Cantidad que se valoriza según la unidad de tarifa del contrato:
//   HM  → horas a pagar (respeta el mínimo si cumplió disponibilidad)
//   DIA → días efectivamente trabajados
//   MES → incidencia (fracción del mes): días a pagar ÷ días del período
function _edpCantValorizada(tarifaUn,H){
  if(tarifaUn==='HM') return H.horasAPagar;
  if(tarifaUn==='DIA')return _edpDiaModo==='fecha'?H.diasAPagar:H.diasTrabajados;
  return H.incidencia;
}
const _edpUnLbl=u=>u==='HM'?'Hora Máquina':u==='DIA'?'Día':u==='MES'?'Mes':u;
const _edpUnAbrev=u=>u==='HM'?'h':u==='DIA'?'d':u==='MES'?'mes':'';

// Reconocimiento contractual: ajuste manual sobre lo que arroja el sistema.
// Sirve cuando el contrato obliga a reconocer días/horas que los partes no
// registran (mínimos, stand by pactado, movilización) o a descontar algo
// acordado. Va en las MISMAS unidades de la tarifa y puede ser negativo.
function _edpCantFinal(tarifaUn,H){
  const base=_edpCantValorizada(tarifaUn,H);
  const recon=+_edpRecon||0;
  return{base,recon,total:Math.max(0,+(base+recon).toFixed(4))};
}

// ── Identificadores ──────────────────────────────────────────────────────────
// El id de la fila NO se toma de DB.nx: ese contador arranca en 1 en cada carga
// de la página y hacía que un EDP nuevo pisara una fila ya guardada (upsert por
// id). Se calcula desde los EDP realmente cargados, así no puede desfasarse.
function _edpNuevoId(){
  const max=(DB.edpProveedores||[]).reduce((m,r)=>Math.max(m,+r.id||0),0);
  const id=max+1;
  if(DB.nx&&DB.nx.edpp!==undefined)DB.nx.edpp=id+1;   // mantiene el contador coherente
  return id;
}
// El N° de EDP es correlativo POR EQUIPO: cada equipo lleva su propia serie
// 01, 02, 03… igual que los estados de pago en papel.
function _edpSiguienteNum(eqId){
  const nums=(DB.edpProveedores||[])
    .filter(r=>+r.eqId===+eqId)
    .map(r=>parseInt(String(r.numEdp||'').replace(/\D/g,''),10))
    .filter(n=>!isNaN(n));
  return String(nums.length?Math.max(...nums)+1:1).padStart(2,'0');
}

// En el EDP solo va UNA actividad por día: se corta en el primer separador real
// (punto seguido de espacio, o guion entre palabras). Las abreviaturas tipo "D.P." no cortan.
function _edpDesc1(txt){
  let s=String(txt||'').trim().replace(/^[-–—•\s]+/,''); // quita la viñeta inicial
  if(!s)return'—';
  const m=s.match(/^(.*?\.)\s+\S/);        // hasta el primer punto que separa frases
  let out=m?m[1]:s;
  const g=out.search(/\s[-–—]\s*\S/);      // guion que introduce otra actividad
  if(g>0)out=out.slice(0,g);
  return out.trim()||'—';
}
const _edpN2=v=>Number(v||0).toLocaleString('es-PE',{minimumFractionDigits:2,maximumFractionDigits:2});

// Al re-renderizar se recrea el panel completo, así que hay que devolver el foco y el cursor
// al campo que se estaba escribiendo; el debounce evita reconstruir en cada tecla.
let _edpTimer=null;
// ¿Se está tecleando dentro de un campo de la barra? En un <input type=number>
// el navegador no deja leer ni reponer la posición del cursor, así que al
// repintar el foco vuelve al inicio del campo: escribir "3.44" iba dando
// "0.443". Mientras el campo tenga el foco no se repinta; se repinta en cuanto
// se sale. Los select, checkbox y fechas no tienen ese problema y siguen
// actualizando al instante.
function _edpTecleando(){
  const a=document.activeElement;
  if(!a||!a.id||!a.id.startsWith('edp_'))return null;
  if(a.tagName!=='INPUT'&&a.tagName!=='TEXTAREA')return null;
  const t=(a.type||'text').toLowerCase();
  return (t==='number'||t==='text'||t==='search'||a.tagName==='TEXTAREA')?a:null;
}
function _edpRerender(inmediato){
  clearTimeout(_edpTimer);
  const run=()=>{
    const esperando=_edpTecleando();
    if(esperando){
      // Se pospone hasta que el campo pierda el foco, sin encolar dos veces
      esperando.removeEventListener('blur',_edpRerenderAlSalir);
      esperando.addEventListener('blur',_edpRerenderAlSalir,{once:true});
      return;
    }
    const a=document.activeElement;
    const id=a&&a.id&&a.id.startsWith('edp_')?a.id:null;
    const ss=id&&a.type!=='number'?a.selectionStart:null,se=id&&a.type!=='number'?a.selectionEnd:null;
    rEdpProveedores();
    if(id){
      const el=document.getElementById(id);
      if(el){el.focus();if(ss!=null&&el.setSelectionRange)try{el.setSelectionRange(ss,se);}catch(e){}}
    }
  };
  _edpRunPendiente=run;
  if(inmediato)run();else _edpTimer=setTimeout(run,350);
}
// El repintado que quedó pendiente mientras se escribía
let _edpRunPendiente=null;
function _edpRerenderAlSalir(){
  const f=_edpRunPendiente;
  if(f)setTimeout(f,0);      // ya sin foco en el campo, se repinta de verdad
}
function _edpSet(campo,val,inmediato){
  // Al cambiar de equipo se arma otro EDP: el checkbox vuelve a su estado por
  // defecto y el N° se propone según la serie de ESE equipo.
  if(campo==='eq'){
    _edpEqId=val;_edpSoloEfectivas=false;
    // La tarifa, el mínimo y la cantidad contractual son de CADA equipo: si se
    // arrastran los overrides del anterior se valoriza con la tarifa equivocada
    // (p. ej. una cisterna mensual cobrando los S/80 por hora de un volquete).
    _edpTarifaOv=null;_edpHminOv=null;_edpCantPres=null;
    _edpRecon=0;_edpReconMotivo='';   // el reconocimiento es de un EDP concreto
    _edpDiaModo='turno';
    if(val)_edpNum=_edpSiguienteNum(val);
  }
  else if(campo==='num')_edpNum=val;
  else if(campo==='desde'){
    _edpDesde=val;
    // Con el candado puesto, el período de auxilios va detrás
    if(_edpAuxSync)_edpAuxDesde=val;
  }
  else if(campo==='hasta'){
    _edpHasta=val;
    if(_edpAuxSync)_edpAuxHasta=val;
  }
  else if(campo==='tc')_edpTC=+val||0;
  else if(campo==='auxDesde')_edpAuxDesde=val;
  else if(campo==='auxHasta')_edpAuxHasta=val;
  else if(campo==='auxSync'){
    _edpAuxSync=!!val;
    // Al enlazarlo se copia el período de horas; al soltarlo se queda con lo
    // que ya mostraba, para poder retocarlo desde ahí.
    if(_edpAuxSync){_edpAuxDesde=_edpDesde;_edpAuxHasta=_edpHasta;}
    else if(!_edpAuxDesde&&!_edpAuxHasta){_edpAuxDesde=_edpDesde;_edpAuxHasta=_edpHasta;}
  }
  else if(campo==='cliente')_edpCliente=val;
  else if(campo==='ruc')_edpRuc=val;
  else if(campo==='direccion')_edpDireccion=val;
  else if(campo==='tarifa')_edpTarifaOv=val===''?null:+val;
  else if(campo==='hmin')_edpHminOv=val===''?null:+val;
  else if(campo==='tarifaAtencion')_edpTarifaAtencion=+val||0;
  else if(campo==='cantPres')_edpCantPres=val===''?null:+val;
  else if(campo==='acumAnt')_edpAcumAnt=+val||0;
  else if(campo==='soloEf')_edpSoloEfectivas=!!val;
  else if(campo==='recon')_edpRecon=+val||0;
  else if(campo==='reconMotivo')_edpReconMotivo=val;
  else if(campo==='diaModo')_edpDiaModo=val==='fecha'?'fecha':'turno';
  else if(campo==='firmaProv')_edpFirmaProv=val;
  else if(campo==='firmaEco')_edpFirmaEco=val;
  else if(campo==='firmaEcoId'){
    _edpFirmaEcoId=val?+val:null;
    const f=(DB.firmas||[]).find(x=>+x.id===+val);
    if(f&&f.nombre)_edpFirmaEco=f.nombre; // al elegir la firma se autocompleta el nombre
  }
  _edpRerender(inmediato);
}

// ── Firmas virtuales (imagen) reutilizables ──
function _edpFirmaSel(){return _edpFirmaEcoId?(DB.firmas||[]).find(f=>+f.id===+_edpFirmaEcoId):null;}
function _edpSubirFirma(){
  let inp=document.getElementById('_edpFirmaInput');
  if(!inp){
    inp=document.createElement('input');
    inp.id='_edpFirmaInput';inp.type='file';inp.accept='image/*';inp.style.display='none';
    inp.addEventListener('change',_edpFirmaOnFile);
    document.body.appendChild(inp);
  }
  inp.value='';inp.click();
}
async function _edpFirmaOnFile(ev){
  const file=ev.target.files[0];if(!file)return;
  const nombre=(prompt('Nombre del firmante (aparecerá bajo la línea):',_edpFirmaEco||'')||'').trim();
  if(!nombre){toast('Se necesita el nombre del firmante',true);return;}
  toast('Subiendo firma...');
  const ext=(file.name.split('.').pop()||'png').toLowerCase();
  const path=`firmas/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
  const{error}=await supa.storage.from(_EDP_FIRMA_BUCKET).upload(path,file,{upsert:false});
  if(error){toast('Error al subir: '+error.message,true);return;}
  const{data:{publicUrl}}=supa.storage.from(_EDP_FIRMA_BUCKET).getPublicUrl(path);
  const rec={id:nidSeguro('frm','firmas'),rol:'RESIDENTE',nombre,imgUrl:publicUrl,imgPath:path,creadoEn:new Date().toISOString()};
  if(await supaUpsert('firmas',rec))return;
  (DB.firmas=DB.firmas||[]).push(rec);
  _edpFirmaEcoId=rec.id;_edpFirmaEco=nombre;
  toast('✓ Firma guardada');
  rEdpProveedores();
}
async function _edpDelFirma(){
  const f=_edpFirmaSel();if(!f)return;
  if(!confirm(`¿Eliminar la firma de ${f.nombre}?`))return;
  if(f.imgPath)await supa.storage.from(_EDP_FIRMA_BUCKET).remove([f.imgPath]);
  await supaDelete('firmas',f.id);
  DB.firmas=(DB.firmas||[]).filter(x=>+x.id!==+f.id);
  _edpFirmaEcoId=null;
  toast('Firma eliminada');
  rEdpProveedores();
}
function _edpAddDescManual(){
  _edpDescManual.push({desc:'',und:'und',cant:0,precio:0});
  rEdpProveedores();
}
function _edpSetDescManual(i,campo,val){
  const r=_edpDescManual[i];if(!r)return;
  r[campo]=(campo==='cant'||campo==='precio')?(+val||0):val;
  _edpRerender();
}
function _edpDelDescManual(i){
  _edpDescManual.splice(i,1);
  rEdpProveedores();
}

// Qué partes entran en la valorización del proveedor: los marcados "Ambos" o
// "Proveedor". Solo quedan fuera los que se valorizan únicamente al cliente.
//
// Un parte sin marca vale para los dos lados. Son los cargados antes de que
// existiera el campo, y así el histórico sigue valorizándose igual que
// siempre. De aquí en adelante todos salen marcados: el formulario arranca
// en "Ambos" y no deja guardar otra cosa que las tres opciones.
function edpValeProveedor(p){
  // El trim va antes del respaldo: un campo con solo espacios es lo mismo
  // que no tener marca.
  const v=String((p&&p.valoriza)||'').trim()||'Ambos';
  return v==='Ambos'||v==='Proveedor';
}
// Los que quedaron fuera, para decirlo en pantalla en vez de que desaparezcan
// en silencio.
function edpFueraProveedor(eqId,desde,hasta){
  const delPeriodo=(DB.partes||[]).filter(p=>p.eqId===eqId&&p.fecha>=desde&&p.fecha<=hasta);
  return{n:delPeriodo.filter(p=>!edpValeProveedor(p)).length};
}

// Consolidado de horas del período (H. Motor = ef del parte · Calentamiento = campo del Máster · H. Efectiva = Motor − Calentamiento)
function _edpHoras(eq,desde,hasta){
  const calent=+eq.calentamientoH||0;
  const partes=(DB.partes||[]).filter(p=>p.eqId===eq.id&&p.fecha>=desde&&p.fecha<=hasta&&edpValeProveedor(p)).sort((a,b)=>a.fecha.localeCompare(b.fecha));
  const dias=partes.map(p=>{
    const motor=+p.ef||0;
    const cal=motor>0?calent:0;
    const efectiva=Math.max(0,+(motor-cal).toFixed(2));
    const condicion=p.condicion||'OPERATIVO';
    const inop=/^INOPERATIVO/i.test(condicion);
    // Valorización por días: cada parte OPERATIVO cuenta 1.00 · INOPERATIVO cuenta 0
    const trabajo=inop?0:1;
    return{fecha:p.fecha,turno:p.turno||'—',desc:_edpDesc1(p.act),hrIni:+p.hrIni||0,hrFin:+p.hrFin||0,motor,cal,efectiva,condicion,trabajo,obs:inop?condicion:(p.observaciones||'Operativo'),im:Math.max(0,+p.im||0)};
  });
  const horasMotor=dias.reduce((s,d)=>s+d.motor,0);
  const horasCal=dias.reduce((s,d)=>s+d.cal,0);
  const horasEfectivas=dias.reduce((s,d)=>s+d.efectiva,0);
  const horasInop=dias.reduce((s,d)=>s+d.im,0);
  const diasConParte=dias.filter(d=>d.motor>0).length;
  const diasPeriodo=Math.max(1,Math.round((new Date(hasta+'T12:00')-new Date(desde+'T12:00'))/864e5)+1);
  const horasDisp=diasPeriodo*24;
  const dispMec=horasDisp>0?Math.max(0,Math.min(100,(horasDisp-horasInop)/horasDisp*100)):100;
  // Horas mínimas del CONTRATO CON EL PROVEEDOR (campo "Horas Mínimas" del Máster), no las de venta al cliente
  const horasMinimas=_edpHminOv!=null?_edpHminOv:(+eq.horasMinimas||0);

  // ── Prorrateo del mínimo por permanencia en obra ───────────────────────────
  // El mínimo es MENSUAL: si el equipo entró (o salió) a mitad del período no le
  // corresponde completo, sino la parte proporcional a los días que estuvo:
  //     mínimo proporcional = mínimo ÷ días del período × días en obra
  // Ej.: 180 h en 30 días, ingresa el 16/07 y el período cierra el 20/07 →
  //      5 días × (180/30) = 30 h de mínimo, no 180.
  // Se usan días de PERMANENCIA, no días trabajados: un equipo presente que
  // estuvo parado conserva su mínimo — para eso existe el mínimo.
  const _priParte=dias.length?dias[0].fecha:'';
  // La llegada sale del contrato del Máster; si no está, del primer parte
  const _llegada=eq.inicioContrato||_priParte||'';
  const _salida=eq.terminoContrato||'';
  const iniObra=_llegada&&_llegada>desde?_llegada:desde;
  const finObra=_salida&&_salida<hasta?_salida:hasta;
  const diasEnObra=iniObra>finObra?0
    :Math.min(diasPeriodo,Math.round((new Date(finObra+'T12:00')-new Date(iniObra+'T12:00'))/864e5)+1);
  const factorMin=diasPeriodo>0?Math.min(1,diasEnObra/diasPeriodo):1;
  const prorrateado=diasEnObra<diasPeriodo;
  const horasMinimasProp=+(horasMinimas*factorMin).toFixed(2);

  // El mínimo del contrato solo se paga si el equipo alcanzó la disponibilidad
  // mecánica exigida. Si estuvo mucho tiempo inoperativo el incumplimiento es
  // suyo, así que se le pagan únicamente las horas trabajadas.
  const cumpleDisp=dispMec>=_EDP_DISP_MIN;
  const aplicaMinimo=cumpleDisp&&!_edpSoloEfectivas;
  const horasMinimasAPagar=aplicaMinimo?Math.max(0,+(horasMinimasProp-horasEfectivas).toFixed(2)):0;
  const horasAPagar=aplicaMinimo?Math.max(horasMinimasProp,horasEfectivas):horasEfectivas;
  const motivoSinMinimo=aplicaMinimo?''
    :_edpSoloEfectivas?'Se acordó pagar solo las horas efectivas'
    :`Disponibilidad mecánica ${dispMec.toFixed(1)}% < ${_EDP_DISP_MIN}% exigido`;
  const diasTrabajados=dias.reduce((s,d)=>s+d.trabajo,0);

  // ── Valorización MENSUAL (tarifaUn = MES) ──────────────────────────────────
  // No se paga por hora ni por parte: se paga una fracción de la tarifa del mes.
  //   incidencia = días a pagar ÷ días del período (21 al 20 del mes siguiente)
  // Si el equipo estuvo los 30 días → 1.0000 (100 % de la tarifa mensual).
  // Se cuentan FECHAS únicas: dos partes el mismo día (día y noche) son un día.
  const fechas=[...new Set(dias.map(d=>d.fecha))];
  const diasReportados=fechas.length;
  // Un día es inoperativo solo si ningún parte de esa fecha fue operativo
  const diasInoperativos=fechas.filter(f=>!dias.some(d=>d.fecha===f&&d.trabajo===1)).length;
  const diasAPagar=Math.max(0,diasReportados-diasInoperativos);
  const incidencia=diasPeriodo>0?Math.min(1,+(diasAPagar/diasPeriodo).toFixed(4)):0;

  return{dias,horasMotor,horasCal,horasEfectivas,horasInop,diasConParte,diasPeriodo,dispMec,horasMinimas,horasMinimasAPagar,horasAPagar,diasTrabajados,cumpleDisp,aplicaMinimo,motivoSinMinimo,
    diasReportados,diasInoperativos,diasAPagar,incidencia,
    horasMinimasProp,diasEnObra,factorMin,prorrateado,iniObra,finObra};
}

// Descuentos: insumos de Almacén ECO usados en Auxilios Mecánicos del equipo + horas de atención mecánica (T. Parada)
function _edpDescAuto(eq,desde,hasta){
  // Los auxilios tienen su propio rango: el que llega por parámetro es el de
  // las horas máquina y aquí no manda.
  const _pa=_edpPerAux();
  const _aDes=_pa.desde||desde, _aHas=_pa.hasta||hasta;
  const auxs=(DB.auxiliosMecanicos||[]).filter(a=>a.eqId===eq.id&&a.fecha>=_aDes&&a.fecha<=_aHas&&a.est!=='Anulado');
  const insumos=[];
  auxs.forEach(a=>{
    (DB.auxMecInsumos||[]).filter(i=>i.auxilioId===a.id&&/ALMAC/i.test(i.origen||'')).forEach(i=>{
      const cat=(DB.catalogoItems||[]).find(c=>c.cod===i.cod);
      const pur=cat&&cat.pur?+cat.pur:0;
      insumos.push({desc:i.desc,cod:i.cod||'',und:i.und||'und',cant:+i.cant||0,precio:pur,total:+((+i.cant||0)*pur).toFixed(2),fecha:a.fecha,auxCod:a.cod});
    });
  });
  // Atención mecánica: monto por auxilio = T. Parada (h) × tarifa S//hh
  const atenciones=auxs.filter(a=>(+a.tiempoParada||0)>0).map(a=>{
    const horas=+a.tiempoParada||0;
    // Cuántos atendieron ESTA atención. El auxilio ya los distingue, así que
    // las cantidades del cuadro de recursos NO se digitan: salen de aquí.
    const nMec=[a.mec,a.mec2].filter(Boolean).length;
    const nAyu=[a.ayudante].filter(Boolean).length;
    return{auxCod:a.cod,fecha:a.fecha,tipo:a.tipo||'—',desc:a.desc||'—',
      mec:[a.mec,a.mec2,a.ayudante].filter(Boolean).join(' / ')||'—',
      horas,nMec,nAyu,precio:_edpTarifaAtencion,total:+(horas*_edpTarifaAtencion).toFixed(2)};
  });
  const horasAtencion=auxs.reduce((s,a)=>s+(+a.tiempoParada||0),0);
  return{insumos,horasAtencion,auxs,atenciones};
}

function rEdpProveedores(){
  const pg=document.getElementById('edpBody');if(!pg)return;
  const eqs=(DB.equipos||[]).slice().sort((a,b)=>(a.codigo||'').localeCompare(b.codigo||''));
  const eq=_edpEqId?eqs.find(e=>e.id===+_edpEqId):null;

  const inpS='background:var(--panel2);border:1px solid var(--border);border-radius:6px;padding:.32rem .55rem;color:var(--text);font-size:.76rem';
  const filtroBar=`<div class="card" style="margin-bottom:.9rem">
    ${_edpCabPleg('datos','🧾 Datos del EDP',
      (eq?eq.codigo+' · ':'')+(_edpNum?'EDP N° '+_edpNum+' · ':'')+
      (_edpDesde&&_edpHasta?_edpFmtDMY(_edpDesde)+' al '+_edpFmtDMY(_edpHasta):'sin período'))}
    <div class="card-body" style="${_edpPlegado.datos?'display:none':''}"><div class="fg-grid">
      <div class="fg"><label>Equipo</label><select id="edp_eq" onchange="_edpSet('eq',this.value,1)" style="${inpS}">
        <option value="">— Seleccionar —</option>
        ${eqs.map(e=>`<option value="${e.id}" ${e.id===+_edpEqId?'selected':''}>${e.codigo} — ${(e.nombre||'').split(' ').slice(0,4).join(' ')}${e.proveedor?' · '+e.proveedor:''}</option>`).join('')}
      </select></div>
      ${(()=>{
        // La numeración es por equipo: se muestra cuántos EDP lleva esta serie
        const nSerie=eq?(DB.edpProveedores||[]).filter(r=>+r.eqId===eq.id).length:0;
        const dup=eq&&_edpNum.trim()&&(DB.edpProveedores||[]).some(r=>+r.eqId===eq.id&&String(r.numEdp).trim()===_edpNum.trim());
        return`<div class="fg"><label>N° EDP ${eq?`<span style="color:var(--muted2);font-size:.65rem;font-weight:400;text-transform:none;letter-spacing:0">· serie de ${eq.codigo}</span>`:''}</label>
          <input id="edp_num" value="${_edpNum}" placeholder="01" oninput="_edpSet('num',this.value)" style="${inpS}${dup?';border-color:#f59e0b':''}">
          <span style="font-size:.6rem;color:${dup?'#f59e0b':'var(--muted2)'};margin-top:.15rem">
            ${!eq?'Elija un equipo para proponer el número'
              :dup?`⚠ Ya existe el EDP ${_edpNum} de ${eq.codigo}: al guardar se actualizará`
              :nSerie?`${nSerie} EDP guardado${nSerie===1?'':'s'} de este equipo · siguiente propuesto: ${_edpSiguienteNum(eq.id)}`
              :'Primer EDP de este equipo'}
          </span></div>`;
      })()}
      <div class="fg"><label>Desde</label><input type="date" class="date-ic-azul" id="edp_desde" value="${_edpDesde}" onchange="_edpSet('desde',this.value,1)" style="${inpS};color-scheme:dark"></div>
      <div class="fg"><label>Hasta</label><input type="date" class="date-ic-azul" id="edp_hasta" value="${_edpHasta}" onchange="_edpSet('hasta',this.value,1)" style="${inpS};color-scheme:dark"></div>
      <!-- Período de los auxilios mecánicos: normalmente hay que ir más atrás
           que las horas máquina, así que va aparte. El candado lo ata al de
           arriba; suelto (como arranca) se escribe a mano. -->
      <div class="fg" style="grid-column:span 2">
        <label style="display:flex;align-items:center;gap:.4rem;flex-wrap:wrap">
          <span>Auxilios mecánicos · período</span>
          <label style="display:inline-flex;align-items:center;gap:.25rem;cursor:pointer;font-size:.62rem;
            text-transform:none;letter-spacing:0;color:${_edpAuxSync?'#10b981':'var(--muted2)'}">
            <input type="checkbox" ${_edpAuxSync?'checked':''}
              onchange="_edpSet('auxSync',this.checked,1)" style="width:auto;margin:0;cursor:pointer;accent-color:#10b981">
            ${_edpAuxSync?'🔒 igual que horas máquina':'🔓 fechas propias'}
          </label>
        </label>
        <div style="display:flex;gap:.4rem">
          <input type="date" class="date-ic-azul" id="edp_aux_desde" value="${_edpPerAux().desde}"
            ${_edpAuxSync?'disabled':''} onchange="_edpSet('auxDesde',this.value,1)"
            style="${inpS};color-scheme:dark;flex:1${_edpAuxSync?';opacity:.5;cursor:not-allowed':''}">
          <input type="date" class="date-ic-azul" id="edp_aux_hasta" value="${_edpPerAux().hasta}"
            ${_edpAuxSync?'disabled':''} onchange="_edpSet('auxHasta',this.value,1)"
            style="${inpS};color-scheme:dark;flex:1${_edpAuxSync?';opacity:.5;cursor:not-allowed':''}">
        </div>
        <span style="font-size:.62rem;color:${_edpAuxDistinto()?'#f59e0b':'var(--muted2)'};margin-top:.15rem;display:block">
          ${_edpAuxDistinto()
            ?'⚠ Repuestos y atenciones se buscan en este rango, no en el de las horas'
            :'Repuestos y atenciones del equipo en este rango'}
        </span>
      </div>
      <div class="fg"><label>Cliente</label><input id="edp_cliente" value="${_edpCliente}" placeholder="Nombre del cliente final" oninput="_edpSet('cliente',this.value)" style="${inpS}"></div>
      <div class="fg"><label>RUC Cliente</label><input id="edp_ruc" value="${_edpRuc}" placeholder="20xxxxxxxxx" oninput="_edpSet('ruc',this.value)" style="${inpS}"></div>
    </div></div>
  </div>`;

  if(!eq||!_edpDesde||!_edpHasta){
    pg.innerHTML=filtroBar+`<div class="card"><div class="card-body" style="text-align:center;padding:2.5rem;color:var(--muted2);font-size:.85rem">Selecciona equipo y período (Desde/Hasta) para generar la vista previa del EDP.</div></div>`;
    return;
  }

  const H=_edpHoras(eq,_edpDesde,_edpHasta);
  const D=_edpDescAuto(eq,_edpDesde,_edpHasta);
  const tarifa=_edpTarifaOv!=null?_edpTarifaOv:(+eq.tarifa||0);
  const tarifaUn=eq.tarifaUn||'HM';
  // La cantidad valorizada es la de PAGO: horas a pagar (respeta el mínimo del contrato) o días trabajados
  const CQ=_edpCantFinal(tarifaUn,H);
  const cantEquipo=CQ.total;
  const totEquipo=+(cantEquipo*tarifa).toFixed(2);
  const _mon=eq.moneda||'SOLES';
  const _sim=_mon==='DOLARES'?'US$':_mon==='EUROS'?'€':'S/';

  const descRows=[
    ...D.insumos.map(i=>({desc:`Consumo: ${i.desc} (${_edpFmtDMY(i.fecha)} · ${i.auxCod})`,und:i.und,cant:i.cant,precio:i.precio,total:i.total})),
    ...(D.horasAtencion>0?[(()=>{
      // El importe sale del cuadro de recursos, que es lo que se imprime.
      const _p={desde:_edpPerAux().desde,hasta:_edpPerAux().hasta,
        dias:Math.max(1,Math.round((new Date(_edpPerAux().hasta+'T12:00')-new Date(_edpPerAux().desde+'T12:00'))/864e5)+1)};
      const _t=(typeof arCalcular==='function')
        ? arCalcular(D.atenciones,_p).total
        : +(D.horasAtencion*_edpTarifaAtencion).toFixed(2);
      const _h=+D.horasAtencion.toFixed(2);
      return{desc:'Atención mecánica por parte de Ecosermo',und:'hh',cant:_h,
        precio:_h>0?+(_t/_h).toFixed(4):0,total:+_t.toFixed(2)};
    })()]:[]),
    ..._edpDescManual.map(r=>({...r,total:+(r.cant*r.precio).toFixed(2)}))
  ];
  // Los descuentos vienen en soles; el equipo puede valorizarse en otra moneda.
  const _fTC=_edpFactorTC(eq);
  if(_fTC!==1)descRows.forEach(r=>{r.precio=+(r.precio*_fTC).toFixed(4);r.total=+(r.total*_fTC).toFixed(2);});
  const totDesc=+descRows.reduce((s,r)=>s+r.total,0).toFixed(2);
  const presupuestoTotal=+(totEquipo-totDesc).toFixed(2);
  const subTotal=presupuestoTotal;
  const igv=+(subTotal*0.18).toFixed(2);
  const total=+(subTotal+igv).toFixed(2);
  const detraccion=+(total*0.10).toFixed(2);
  const aAbonar=+(total-detraccion).toFixed(2);

  const editBar=`<div class="card" style="margin-bottom:.9rem">
    ${_edpCabPleg('ajustes','⚙️ Ajustes antes de imprimir',
      'tarifa '+_sim+' '+_edpN2(tarifa)+' · '+_edpN2(cantEquipo)+' '+_edpUnLbl(tarifaUn))}
    <div class="card-body" style="${_edpPlegado.ajustes?'display:none':''}"><div class="fg-grid">
      <div class="fg"><label>Tarifa Equipo ${_sim} por ${_edpUnLbl(tarifaUn)}</label>
        <input type="number" step="0.01" id="edp_tarifa" value="${tarifa}" oninput="_edpSet('tarifa',this.value)" style="${inpS}${+tarifa!==+(eq.tarifa||0)?';border-color:#f59e0b':''}">
        <span style="font-size:.6rem;color:${+tarifa!==+(eq.tarifa||0)?'#f59e0b':'var(--muted2)'};margin-top:.15rem">
          ${+tarifa!==+(eq.tarifa||0)?`⚠ Editada · en el Máster es ${_sim} ${_edpN2(+eq.tarifa||0)}`:`Del Máster de ${eq.codigo}`}
        </span></div>
      ${tarifaUn==='HM'?`<div class="fg"><label>Horas Mínimas (contrato · mes)</label>
        <input type="number" step="0.01" id="edp_hmin" value="${H.horasMinimas}" oninput="_edpSet('hmin',this.value)" style="${inpS}${H.prorrateado?';border-color:#f59e0b':''}">
        <span style="font-size:.6rem;color:${H.prorrateado?'#f59e0b':'var(--muted2)'};margin-top:.15rem">
          ${H.prorrateado
            ?`⚠ Prorrateado: ${H.diasEnObra} de ${H.diasPeriodo} días en obra → exigible <strong>${_edpN2(H.horasMinimasProp)} h</strong>`
            :'Período completo · se exige el mínimo íntegro'}
        </span></div>`:''}
      ${tarifaUn==='DIA'?(()=>{
        // Un mismo día con parte de día y de noche puede valer 2 (por turno) o 1
        // (por día calendario). Depende de lo pactado, así que se elige aquí.
        const turnos=H.diasTrabajados, fechas=H.diasAPagar;
        const esFecha=_edpDiaModo==='fecha';
        const dobles=turnos-fechas;
        const col=esFecha?'#f59e0b':'#10b981';
        const op=(v,lbl,n,sub)=>`<label style="flex:1;min-width:180px;display:flex;align-items:center;gap:.45rem;cursor:pointer;border:1px solid ${_edpDiaModo===v?col:'var(--border)'};background:${_edpDiaModo===v?col+'18':'transparent'};border-radius:7px;padding:.35rem .55rem">
            <input type="radio" name="edpDiaModo" value="${v}" ${_edpDiaModo===v?'checked':''} onchange="_edpSet('diaModo','${v}',1)" style="width:auto;margin:0;cursor:pointer;accent-color:${col}">
            <span style="flex:1"><span style="font-size:.73rem;font-weight:700;color:var(--text)">${lbl}</span>
              <span style="display:block;font-size:.6rem;color:var(--muted2)">${sub}</span></span>
            <span style="font-size:.85rem;font-weight:800;color:${_edpDiaModo===v?col:'var(--muted2)'}">${_edpN2(n)}</span>
          </label>`;
        return`<div class="fg" style="grid-column:1/-1"><label>Cómo se cuentan los días</label>
          <div style="display:flex;gap:.5rem;flex-wrap:wrap">
            ${op('turno','Por turno',turnos,'Día y noche del mismo día cuentan aparte')}
            ${op('fecha','Por día calendario',fechas,'Día y noche del mismo día cuentan como 1')}
          </div>
          <span style="font-size:.6rem;color:var(--muted2);margin-top:.2rem">
            ${dobles>0?`Hay <strong>${dobles}</strong> fecha${dobles===1?'':'s'} con doble turno · se valoriza <strong style="color:${col}">${_edpN2(esFecha?fechas:turnos)}</strong> × ${_sim} ${_edpN2(tarifa)} = ${_sim} ${_edpN2(+((esFecha?fechas:turnos)*tarifa).toFixed(2))}`
              :'Ningún día tiene doble turno: ambas opciones dan el mismo resultado'}
          </span>
        </div>`;
      })():''}
      ${tarifaUn==='MES'?`<div class="fg" style="grid-column:span 2"><label>Incidencia del mes</label>
        <div style="display:flex;align-items:center;gap:.55rem;flex-wrap:wrap;border:1px solid ${H.incidencia>=1?'#10b981':'#f59e0b'};border-radius:7px;padding:.4rem .6rem;background:${H.incidencia>=1?'#10b98112':'#f59e0b12'}">
          <span style="font-size:.72rem;color:var(--text)"><strong>${H.diasAPagar}</strong> días a pagar ÷ <strong>${H.diasPeriodo}</strong> del período</span>
          <span style="font-size:.64rem;color:var(--muted2)">${H.diasReportados} reportados${H.diasInoperativos?` · ${H.diasInoperativos} inoperativos`:''}</span>
          <span style="margin-left:auto;font-size:.85rem;font-weight:800;color:${H.incidencia>=1?'#10b981':'#f59e0b'};white-space:nowrap">${(H.incidencia*100).toFixed(2)} % · ${_sim} ${_edpN2(+(H.incidencia*tarifa).toFixed(2))}</span>
        </div></div>`:''}
      ${/* oninput solo guarda; el repintado va en onchange. Repintar en cada
           tecla recreaba el input y mandaba el cursor al inicio: al escribir
           3.44 salía 0.443. */
        _edpNecesitaTC(eq)?`<div class="fg">
        <label>Tipo de cambio S/ → ${_sim}</label>
        <input type="number" step="0.0001" min="0" id="edp_tc" value="${_edpTC||''}"
          placeholder="Ej: 3.75"
          oninput="_edpSet('tc',this.value)" onchange="_edpSet('tc',this.value,1)"
          style="${inpS}${(_edpTCFalta(eq)?';border-color:#ef4444':';border-color:#10b981')}">
        <span style="font-size:.62rem;color:${(_edpTCFalta(eq)?'#ef4444':'var(--muted2)')};margin-top:.15rem;display:block">
          ${_edpTCFalta(eq)
            ?'⚠ Los descuentos salen en soles: sin este dato se restan sin convertir'
            :'Repuestos y atención mecánica ÷ '+_edpTC+' → '+_sim}
        </span>
      </div>`:''}
      <div class="fg"><label>Tarifa Atención Mecánica ${_sim}/hh</label><input type="number" step="0.01" id="edp_tatm" value="${_edpTarifaAtencion}" oninput="_edpSet('tarifaAtencion',this.value)" style="${inpS}"></div>
      <div class="fg"><label>Cant. Presupuesto (${tarifaUn})</label><input type="number" step="0.01" value="${_edpCantPres!=null?_edpCantPres:''}" placeholder="opcional" title="Cantidad contractual — se usa para el % de avance" id="edp_cantpres" oninput="_edpSet('cantPres',this.value)" style="${inpS}"></div>
      ${(()=>{
        // Ajuste manual sobre lo que arroja el sistema: mínimos de contrato,
        // stand by pactado, movilización… Positivo suma, negativo descuenta.
        const cq=_edpCantFinal(tarifaUn,H);
        const ab=_edpUnAbrev(tarifaUn);
        const col=cq.recon>0?'#10b981':cq.recon<0?'#ef4444':'var(--border)';
        return`<div class="fg" style="grid-column:span 2">
          <label>Reconocimiento contractual (${tarifaUn}) <span style="color:var(--muted2);font-size:.65rem;font-weight:400;text-transform:none;letter-spacing:0">· + suma · − descuenta</span></label>
          <div style="display:flex;gap:.4rem">
            <input type="number" step="0.01" id="edp_recon" value="${_edpRecon||''}" placeholder="0" title="Días/horas reconocidos por contrato que los partes no registran" oninput="_edpSet('recon',this.value)" style="${inpS};width:90px;border-color:${col}">
            <input id="edp_reconmot" value="${(_edpReconMotivo||'').replace(/"/g,'&quot;')}" placeholder="Motivo (se imprime en el EDP)" oninput="_edpSet('reconMotivo',this.value)" style="${inpS};flex:1">
          </div>
          <span style="font-size:.6rem;color:${cq.recon?col:'var(--muted2)'};margin-top:.15rem">
            Sistema ${_edpN2(cq.base)} ${ab}${cq.recon?` ${cq.recon>0?'+':'−'} ${_edpN2(Math.abs(cq.recon))} ${ab} = <strong>${_edpN2(cq.total)} ${ab}</strong> · ${_sim} ${_edpN2(+(cq.total*tarifa).toFixed(2))}`:' · sin ajuste'}
          </span>
        </div>`;
      })()}
      ${(()=>{
        // Sugerencia: suma de los EDP ya guardados de este equipo (excluyendo el que se está editando)
        const prevGuardado=(DB.edpProveedores||[]).find(r=>+r.eqId===eq.id&&String(r.numEdp).trim()===_edpNum.trim());
        const sug=_edpAcumDe(eq.id,prevGuardado?prevGuardado.id:null);
        return`<div class="fg"><label>Acumulado Anterior ${_sim}</label>
          <input type="number" step="0.01" id="edp_acum" value="${_edpAcumAnt}" title="Total valorizado en EDP anteriores" oninput="_edpSet('acumAnt',this.value)" style="${inpS}">
          ${sug>0&&Math.abs(sug-_edpAcumAnt)>0.01?`<button onclick="_edpSet('acumAnt',${sug},1)" style="margin-top:.2rem;font-size:.62rem;padding:.15rem .45rem;border-radius:5px;border:1px solid #10b98150;background:rgba(16,185,129,.1);color:#10b981;cursor:pointer;align-self:flex-start">↺ Usar ${_sim} ${_edpN2(sug)} (EDPs guardados)</button>`:''}
        </div>`;
      })()}
      ${tarifaUn==='HM'?(()=>{
        // Estado del mínimo: se explica en el panel para que quien arma el EDP
        // entienda por qué salió ese número antes de mandarlo a imprimir
        const bloqueado=!H.cumpleDisp;
        const col=bloqueado?'#ef4444':_edpSoloEfectivas?'#f59e0b':'#10b981';
        const msg=bloqueado
          ?`Disponibilidad ${H.dispMec.toFixed(1)}% &lt; ${_EDP_DISP_MIN}% · el mínimo no se paga`
          :_edpSoloEfectivas?'Se paga solo lo trabajado'
          :`Disponibilidad ${H.dispMec.toFixed(1)}% ≥ ${_EDP_DISP_MIN}% · se paga el mínimo${H.prorrateado?' proporcional ('+_edpN2(H.horasMinimasProp)+' h)':''}`;
        return`<div class="fg" style="grid-column:span 2">
          <label>Horas a pagar</label>
          <div style="display:flex;align-items:center;gap:.55rem;flex-wrap:wrap;border:1px solid ${col};border-radius:7px;padding:.4rem .6rem;background:${col}12">
            <label style="display:inline-flex;align-items:center;gap:.4rem;font-size:.76rem;color:var(--text);cursor:${bloqueado?'not-allowed':'pointer'};opacity:${bloqueado?'.55':'1'}">
              <input type="checkbox" ${_edpSoloEfectivas?'checked':''} ${bloqueado?'disabled':''} onchange="_edpSet('soloEf',this.checked,1)" style="width:auto;margin:0;cursor:inherit;accent-color:${col}">
              <strong>Solo horas efectivas</strong>
            </label>
            <span style="font-size:.66rem;color:${col};font-weight:700">${msg}</span>
            <span style="margin-left:auto;font-size:.8rem;font-weight:800;color:${col};white-space:nowrap">${_edpN2(H.horasAPagar)} hrs</span>
          </div>
        </div>`;
      })():''}
      <div class="fg"><label>Firma — Rep. Proveedor</label><input value="${(_edpFirmaProv||'').replace(/"/g,'&quot;')}" placeholder="Nombre del representante" id="edp_firmaprov" oninput="_edpSet('firmaProv',this.value)" style="${inpS}"></div>
      <div class="fg"><label>Firma — Rep. ECOSERMO</label><input value="${(_edpFirmaEco||'').replace(/"/g,'&quot;')}" placeholder="Nombre del representante" id="edp_firmaeco" oninput="_edpSet('firmaEco',this.value)" style="${inpS}"></div>
      <div class="fg" style="grid-column:1/-1">
        <label>Firma virtual del Residente (se imprime en el cajetín de ECOSERMO)</label>
        <div style="display:flex;align-items:center;gap:.5rem;flex-wrap:wrap">
          <select id="edp_firmaimg" onchange="_edpSet('firmaEcoId',this.value,1)" style="${inpS};min-width:200px">
            <option value="">— Sin firma virtual —</option>
            ${(DB.firmas||[]).map(f=>`<option value="${f.id}" ${+_edpFirmaEcoId===+f.id?'selected':''}>${f.nombre}</option>`).join('')}
          </select>
          <button onclick="_edpSubirFirma()" style="font-size:.72rem;padding:.3rem .7rem;border-radius:6px;border:1px solid #3b82f650;background:rgba(59,130,246,.1);color:#3b82f6;cursor:pointer;font-weight:700">⬆ Subir firma</button>
          ${_edpFirmaSel()?`<img src="${_edpFirmaSel().imgUrl}" style="height:38px;max-width:150px;object-fit:contain;background:#fff;border:1px solid var(--border);border-radius:5px;padding:2px">
            <button onclick="_edpDelFirma()" title="Eliminar firma" style="font-size:.72rem;padding:.3rem .5rem;border-radius:6px;border:1px solid #ef444450;background:transparent;color:#ef4444;cursor:pointer">🗑</button>`:''}
        </div>
      </div>
    </div>
    <details style="margin-top:.7rem;border:1px solid var(--border);border-radius:8px;padding:.4rem .6rem" ${(DB.atencionRecursos||[]).length?'':'open'}>
      <summary style="cursor:pointer;font-size:.74rem;font-weight:700;color:var(--muted2)">🔧 Recursos de la atención mecánica ${(DB.atencionRecursos||[]).length?'<span style="font-size:.64rem;font-weight:400">· '+(DB.atencionRecursos||[]).length+' recursos</span>':'<span style="color:#fbbf24;font-size:.64rem;font-weight:700">· sin cargar, el cuadro sale en cero</span>'}</summary>
      <div id="arPanel" style="margin-top:.5rem"></div>
    </details>
    <div style="margin-top:.6rem">
      <button onclick="_edpAddDescManual()" style="font-size:.72rem;padding:.3rem .7rem;border-radius:6px;border:1px solid var(--border);background:transparent;color:var(--muted2);cursor:pointer">＋ Descuento manual</button>
      ${_edpDescManual.map((r,i)=>`<div style="display:flex;gap:.4rem;align-items:center;margin-top:.4rem">
        <input id="edp_dmdesc_${i}" placeholder="Descripción" value="${r.desc}" oninput="_edpSetDescManual(${i},'desc',this.value)" style="${inpS};flex:1">
        <input id="edp_dmund_${i}" placeholder="und" value="${r.und}" oninput="_edpSetDescManual(${i},'und',this.value)" style="${inpS};width:70px">
        <input id="edp_dmcant_${i}" type="number" placeholder="Cant." value="${r.cant}" oninput="_edpSetDescManual(${i},'cant',this.value)" style="${inpS};width:80px">
        <input id="edp_dmprecio_${i}" type="number" placeholder="Precio" value="${r.precio}" oninput="_edpSetDescManual(${i},'precio',this.value)" style="${inpS};width:90px">
        <button onclick="_edpDelDescManual(${i})" style="background:none;border:none;color:#ef4444;cursor:pointer;font-size:.8rem">✕</button>
      </div>`).join('')}
    </div>
    <div style="margin-top:.7rem;display:flex;gap:.5rem;flex-wrap:wrap">
      <button onclick="_edpPrint()" style="font-size:.78rem;padding:.4rem .9rem;border-radius:6px;border:none;background:#8b5cf6;color:#fff;cursor:pointer;font-weight:700">🖨 Imprimir / PDF</button>
      <button onclick="_edpGuardar()" style="font-size:.78rem;padding:.4rem .9rem;border-radius:6px;border:none;background:#10b981;color:#fff;cursor:pointer;font-weight:700">💾 Guardar EDP</button>
    </div>
    </div>
  </div>`;

  // Si algún parte del período quedó fuera por su marca de valorización,
  // se dice en pantalla: un parte que desaparece en silencio es peor que
  // uno que no está.
  const _fuera=edpFueraProveedor(eq.id,_edpDesde,_edpHasta);
  const avisoTC=_edpTCFalta(eq)?`<div style="margin:.4rem 0;padding:.55rem .8rem;background:rgba(239,68,68,.1);border:1px solid #ef444460;border-radius:8px;font-size:.76rem;color:#ef4444">
    ⚠ El equipo se valoriza en <b>${_edpMonedaEq(eq)}</b> y los descuentos se calculan en soles.
    Cargue el <b>tipo de cambio</b> en los ajustes o el total restará soles contra ${_sim}.</div>`:'';
  const avisoFuera=_fuera.n?`<div style="margin:.4rem 0;padding:.55rem .8rem;background:rgba(245,158,11,.1);border:1px solid #f59e0b60;border-radius:8px;font-size:.76rem;color:#f59e0b">⚠ <b>${_fuera.n} parte(s)</b> del período quedan fuera: están marcados solo para el cliente.</div>`:'';
  pg.innerHTML=filtroBar+editBar+_edpListaHtml(eq)+avisoTC+avisoFuera+`<div style="background:#fff;border-radius:8px;padding:1.2rem;overflow-x:auto">${_edpDocHtml(eq,H,D,{tarifa,tarifaUn,cantEquipo,cantBase:CQ.base,cantRecon:CQ.recon,totEquipo,descRows,totDesc,presupuestoTotal,subTotal,igv,total,detraccion,aAbonar})}</div>`;
  // El panel de recursos se dibuja aparte: su contenedor recién existe ahora
  if(typeof _arRender==='function')_arRender();
}

// ══ EDPs GUARDADOS ══════════════════════════════════════════════════════════
// Se guarda el resumen en columnas (para sumar/filtrar) + un snapshot JSON del detalle,
// para que el documento emitido no cambie aunque después se corrijan partes o auxilios.

// Suma de EDPs anteriores del mismo equipo (para la columna ACUMULADO ACTUAL)
function _edpAcumDe(eqId,excluirId){
  return +(DB.edpProveedores||[])
    .filter(r=>+r.eqId===+eqId&&r.estado!=='Anulado'&&(!excluirId||+r.id!==+excluirId))
    .reduce((s,r)=>s+(+r.subtotal||0),0).toFixed(2);
}

function _edpListaHtml(eq){
  const rows=(DB.edpProveedores||[]).filter(r=>+r.eqId===+eq.id)
    .sort((a,b)=>(b.desde||'').localeCompare(a.desde||''));
  if(!rows.length)return'';
  const TH='background:var(--panel2);color:var(--muted2);font-size:.64rem;font-weight:700;text-transform:uppercase;letter-spacing:.06em;padding:.4rem .55rem;white-space:nowrap';
  const TD='padding:.4rem .55rem;border-bottom:1px solid var(--border);font-size:.76rem;white-space:nowrap';
  const sim=r=>r.moneda==='DOLARES'?'US$':r.moneda==='EUROS'?'€':'S/';
  return`<div class="card" style="margin-bottom:.9rem">
    <div class="card-head"><span class="card-title">📚 EDPs guardados de ${eq.codigo}</span><span style="font-size:.7rem;color:var(--muted2)">${rows.length} registro${rows.length===1?'':'s'}</span></div>
    <div class="card-body"><div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;min-width:820px">
      <thead><tr>
        <th style="${TH}">N° EDP</th><th style="${TH}">Período</th><th style="${TH};text-align:right">Cant.</th>
        <th style="${TH};text-align:right">Equipo</th><th style="${TH};text-align:right">Descuentos</th>
        <th style="${TH};text-align:right">Neto</th><th style="${TH};text-align:right">Total</th>
        <th style="${TH};text-align:right">A Abonar</th><th style="${TH}">Estado</th><th style="${TH}"></th>
      </tr></thead>
      <tbody>${rows.map(r=>{
        const anul=r.estado==='Anulado';
        const col=anul?'#ef4444':r.estado==='Pagado'?'#10b981':r.estado==='Aprobado'?'#3b82f6':'#f59e0b';
        return`<tr style="${anul?'opacity:.55':''}">
          <td style="${TD};font-weight:800;color:var(--alm)">${r.numEdp||'—'}</td>
          <td style="${TD};font-family:monospace;font-size:.7rem">${_edpFmtDMY(r.desde)} → ${_edpFmtDMY(r.hasta)}</td>
          <td style="${TD};text-align:right;font-family:monospace">${_edpN2(r.cantEquipo)} ${r.tarifaUn==='HM'?'h':r.tarifaUn==='DIA'?'d':''}</td>
          <td style="${TD};text-align:right;font-family:monospace">${sim(r)} ${_edpN2(r.montoEquipo)}</td>
          <td style="${TD};text-align:right;font-family:monospace;color:${+r.montoDesc?'#ef4444':'var(--muted2)'}">${+r.montoDesc?sim(r)+' ('+_edpN2(r.montoDesc)+')':'—'}</td>
          <td style="${TD};text-align:right;font-family:monospace">${sim(r)} ${_edpN2(r.subtotal)}</td>
          <td style="${TD};text-align:right;font-family:monospace;font-weight:700">${sim(r)} ${_edpN2(r.total)}</td>
          <td style="${TD};text-align:right;font-family:monospace;font-weight:800;color:#10b981">${sim(r)} ${_edpN2(r.aAbonar)}</td>
          <td style="${TD}"><span class="badge" style="background:${col}22;color:${col};border:1px solid ${col}55;font-size:.62rem">${r.estado||'Emitido'}</span></td>
          <td style="${TD};white-space:nowrap">
            <button onclick="_edpCargar(${r.id})" title="Cargar en el formulario" style="background:none;border:1px solid #3b82f650;border-radius:5px;color:#3b82f6;cursor:pointer;font-size:.72rem;padding:.15rem .4rem">↩ Cargar</button>
            ${anul?'':`<button onclick="_edpEstado(${r.id})" title="Cambiar estado" style="background:none;border:1px solid #f59e0b50;border-radius:5px;color:#f59e0b;cursor:pointer;font-size:.72rem;padding:.15rem .4rem;margin-left:.2rem">⇄</button>`}
            <button onclick="_edpDel(${r.id})" title="Eliminar" style="background:none;border:1px solid #ef444450;border-radius:5px;color:#ef4444;cursor:pointer;font-size:.72rem;padding:.15rem .4rem;margin-left:.2rem">🗑</button>
          </td>
        </tr>`;
      }).join('')}</tbody>
    </table></div></div>
  </div>`;
}

async function _edpGuardar(){
  const eq=(DB.equipos||[]).find(e=>e.id===+_edpEqId);
  if(!eq||!_edpDesde||!_edpHasta){toast('Completa equipo y período primero',true);return;}
  if(!_edpNum.trim()){toast('Ingresa el N° de EDP',true);return;}

  const H=_edpHoras(eq,_edpDesde,_edpHasta);
  const D=_edpDescAuto(eq,_edpDesde,_edpHasta);
  const tarifa=_edpTarifaOv!=null?_edpTarifaOv:(+eq.tarifa||0);
  const tarifaUn=eq.tarifaUn||'HM';
  const CQ=_edpCantFinal(tarifaUn,H);
  const cantEquipo=CQ.total;
  const montoEquipo=+(cantEquipo*tarifa).toFixed(2);
  const descRows=[
    ...D.insumos.map(i=>({desc:`Consumo: ${i.desc} (${_edpFmtDMY(i.fecha)} · ${i.auxCod})`,und:i.und,cant:i.cant,precio:i.precio,total:i.total})),
    ...(D.horasAtencion>0?[(()=>{
      // El importe sale del cuadro de recursos, que es lo que se imprime.
      const _p={desde:_edpPerAux().desde,hasta:_edpPerAux().hasta,
        dias:Math.max(1,Math.round((new Date(_edpPerAux().hasta+'T12:00')-new Date(_edpPerAux().desde+'T12:00'))/864e5)+1)};
      const _t=(typeof arCalcular==='function')
        ? arCalcular(D.atenciones,_p).total
        : +(D.horasAtencion*_edpTarifaAtencion).toFixed(2);
      const _h=+D.horasAtencion.toFixed(2);
      return{desc:'Atención mecánica por parte de Ecosermo',und:'hh',cant:_h,
        precio:_h>0?+(_t/_h).toFixed(4):0,total:+_t.toFixed(2)};
    })()]:[]),
    ..._edpDescManual.map(r=>({...r,total:+(r.cant*r.precio).toFixed(2)}))
  ];
  // Igual que en pantalla: los descuentos vienen en soles y hay que pasarlos
  // a la moneda del equipo antes de guardarlos.
  const _fTC=_edpFactorTC(eq);
  if(_fTC!==1)descRows.forEach(r=>{r.precio=+(r.precio*_fTC).toFixed(4);r.total=+(r.total*_fTC).toFixed(2);});
  const montoDesc=+descRows.reduce((s,r)=>s+r.total,0).toFixed(2);
  const subtotal=+(montoEquipo-montoDesc).toFixed(2);
  const igv=+(subtotal*0.18).toFixed(2);
  const total=+(subtotal+igv).toFixed(2);
  const detraccion=+(total*0.10).toFixed(2);
  const aAbonar=+(total-detraccion).toFixed(2);

  // ¿Ya existe un EDP con ese N° para este equipo? → se actualiza en vez de duplicar
  const prev=(DB.edpProveedores||[]).find(r=>+r.eqId===eq.id&&String(r.numEdp).trim()===_edpNum.trim());
  if(prev&&!confirm(`Ya existe el EDP N° ${_edpNum} de ${eq.codigo}.\n\n¿Reemplazarlo con los datos actuales?`))return;

  const rec={
    id:prev?prev.id:_edpNuevoId(),
    eqId:eq.id,proveedor:eq.proveedor||'',numEdp:_edpNum.trim(),
    desde:_edpDesde,hasta:_edpHasta,
    // Período propio de los auxilios: sin esto, al reabrir el EDP los
    // repuestos se buscarían otra vez en el rango de las horas.
    auxDesde:_edpPerAux().desde,auxHasta:_edpPerAux().hasta,auxSync:_edpAuxSync?1:0,
    tc:+_edpTC||0,
    moneda:eq.moneda||'SOLES',tarifaUn,tarifa,
    cantEquipo,montoEquipo,montoDesc,subtotal,igv,total,detraccion,aAbonar,
    estado:prev?prev.estado||'Emitido':'Emitido',
    detalle:{dias:H.dias,horasMinimas:H.horasMinimas,horasEfectivas:H.horasEfectivas,
      horasAPagar:H.horasAPagar,diasTrabajados:H.diasTrabajados,dispMec:H.dispMec,
      // Queda registrado por qué se pagó (o no) el mínimo, para poder auditar el EDP después
      aplicaMinimo:H.aplicaMinimo,motivoSinMinimo:H.motivoSinMinimo,dispMinima:_EDP_DISP_MIN,
      descRows,insumos:D.insumos,atenciones:D.atenciones,
      // Reconocimiento contractual: se guarda el desglose para poder auditar
      // por qué la cantidad valorizada no coincide con la que arroja el sistema
      cantBase:CQ.base,cantRecon:CQ.recon,reconMotivo:_edpReconMotivo,
      horasMinimasProp:H.horasMinimasProp,diasEnObra:H.diasEnObra,prorrateado:H.prorrateado,
      diaModo:_edpDiaModo,turnosReportados:H.dias.length,
      incidencia:H.incidencia,diasReportados:H.diasReportados,diasInoperativos:H.diasInoperativos,diasPeriodo:H.diasPeriodo,
      cantPres:_edpCantPres,acumAnt:_edpAcumAnt,
      firmaProv:_edpFirmaProv,firmaEco:_edpFirmaEco,firmaEcoId:_edpFirmaEcoId,
      cliente:_edpCliente,rucCliente:_edpRuc},
    creadoPor:CU?CU.nombre:'',creadoEn:new Date().toISOString()
  };
  const e=await supaUpsert('edpProveedores',rec); // ya muestra su propio toast si falla
  if(e)return;
  if(prev)Object.assign(prev,rec);
  else(DB.edpProveedores=DB.edpProveedores||[]).push(rec);
  toast(`✓ EDP N° ${rec.numEdp} guardado`);
  rEdpProveedores();
}

function _edpCargar(id){
  const r=(DB.edpProveedores||[]).find(x=>+x.id===+id);if(!r)return;
  _edpEqId=String(r.eqId);_edpNum=r.numEdp||'';_edpDesde=r.desde||'';_edpHasta=r.hasta||'';
  // Los EDP guardados antes de que existiera el período de auxilios no lo
  // traen: se cae al de las horas, que es como se emitieron.
  _edpAuxSync=!!(+r.auxSync);
  _edpAuxDesde=r.auxDesde||r.desde||'';_edpAuxHasta=r.auxHasta||r.hasta||'';
  _edpTC=+r.tc||0;
  _edpTarifaOv=+r.tarifa||0;
  const d=r.detalle||{};
  _edpHminOv=d.horasMinimas!=null?d.horasMinimas:null;
  _edpCantPres=d.cantPres!=null?d.cantPres:null;
  _edpAcumAnt=+d.acumAnt||0;
  _edpRecon=+d.cantRecon||0;_edpReconMotivo=d.reconMotivo||'';
  _edpDiaModo=d.diaModo==='fecha'?'fecha':'turno';   // los EDP viejos se pagaron por turno
  _edpFirmaProv=d.firmaProv||'';_edpFirmaEco=d.firmaEco||'';_edpFirmaEcoId=d.firmaEcoId||null;
  if(d.cliente)_edpCliente=d.cliente;
  if(d.rucCliente)_edpRuc=d.rucCliente;
  _edpDescManual=[];
  rEdpProveedores();
  toast('EDP N° '+r.numEdp+' cargado');
}

async function _edpEstado(id){
  const r=(DB.edpProveedores||[]).find(x=>+x.id===+id);if(!r)return;
  const ESTADOS=['Emitido','Aprobado','Pagado','Anulado'];
  const actual=r.estado||'Emitido';
  const v=prompt(`Estado del EDP N° ${r.numEdp}:\n\n${ESTADOS.join(' · ')}`,actual);
  if(v===null)return;
  const nuevo=ESTADOS.find(x=>x.toLowerCase()===v.trim().toLowerCase());
  if(!nuevo){toast('Estado no válido',true);return;}
  r.estado=nuevo;
  if(await supaUpsert('edpProveedores',r))return;
  toast('Estado: '+nuevo);
  rEdpProveedores();
}

async function _edpDel(id){
  const r=(DB.edpProveedores||[]).find(x=>+x.id===+id);if(!r)return;
  if(!confirm(`¿Eliminar el EDP N° ${r.numEdp} de forma permanente?`))return;
  await supaDelete('edpProveedores',id);
  DB.edpProveedores=(DB.edpProveedores||[]).filter(x=>+x.id!==+id);
  toast('EDP eliminado');
  rEdpProveedores();
}

// HTML compartido entre la vista previa (in-app) y la impresión — página 1 (EDP) + página 2 (Consolidado de Horas)
function _edpDocHtml(eq,H,D,F){
  const _logoUrl=window.location.href.replace(/[^\/\\]+$/,'')+'09.-ERP/Imagenes/ECOSERMO-LOGO.png';
  const AZ='#1e3a5f';
  const HDR='#0070C0'; // encabezados de tabla: RGB(0,112,192) con letras blancas
  const esDia=F.tarifaUn!=='HM'; // DIA/MES: valorización por días — sin horómetros ni calentamiento
  // Moneda del contrato (Máster de Equipos) — por defecto Soles
  const MON=eq.moneda||'SOLES';
  const SIM=MON==='DOLARES'?'US$':MON==='EUROS'?'€':'S/';
  const MONLBL=MON==='DOLARES'?'DÓLARES (US$)':MON==='EUROS'?'EUROS (€)':'SOLES';
  // Identificación del equipo: placa en vehículos con placa · serie adicional en Línea Amarilla
  const _sub=String(eq.sub||eq.tipo||'').toUpperCase();
  const _conPlaca=/CAMIONETA|COASTER|CISTERNA|VOLQUETE/.test(_sub);
  const _esLA=String(eq.tipo||'').toUpperCase().includes('AMARILLA');
  const idExtra=_esLA
    ?(eq.numSerie?'Serie: '+eq.numSerie:'')            // Línea Amarilla: solo serie, no lleva placa
    :(_conPlaca&&eq.placa?'Placa: '+eq.placa:'');
  const eqDesc=`${eq.codigo} — ${eq.nombre||''}${idExtra?' · '+idExtra:''}`;
  const infoCell=(l,v)=>`<div><strong style="display:block;color:#64748b;font-size:9px;text-transform:uppercase;letter-spacing:.05em">${l}</strong><span style="font-size:11px;font-weight:600;color:#111">${v||'—'}</span></div>`;
  const TH=`background:${HDR};color:#fff;padding:4px 6px;font-size:9px;text-transform:uppercase;text-align:center`;
  const TD=`border:1px solid #cbd5e1;padding:3px 6px;font-size:10px;color:#111`;

  // Encabezados agrupados: PRESUPUESTO (azul) · VALORIZACIÓN ACTUAL (amarillo) · ACUMULADO ACTUAL (azul)
  const THG=`background:${HDR};color:#fff;padding:4px 6px;font-size:9.5px;font-weight:800;text-transform:uppercase;text-align:center;border:1px solid #fff`;
  const THG_AM=`background:#FFFF00;color:#111;padding:4px 6px;font-size:9.5px;font-weight:800;text-transform:uppercase;text-align:center;border:1px solid #666`;
  const THS=`background:${HDR};color:#fff;padding:3px 5px;font-size:8.5px;font-weight:700;text-transform:uppercase;text-align:center;border:1px solid #fff`;
  const THS_AM=`background:#FFFF00;color:#111;padding:3px 5px;font-size:8.5px;font-weight:700;text-transform:uppercase;text-align:center;border:1px solid #666`;
  const AM=`background:#FFFACD`; // celdas de la sección Valorización Actual
  // ── ACUMULADO ACTUAL ───────────────────────────────────────────────────────
  // Es solo un recordatorio de lo valorizado hasta la fecha, NO lo que se cobra
  // en este EDP: va en gris para que no compita con la Valorización Actual.
  // 👉 Para cambiar el tono, editar únicamente estas dos constantes.
  const ACUM_TXT='#94a3b8';   // color del texto (plomo). Más oscuro: #64748b
  const ACUM_BG ='#f1f5f9';   // fondo de las celdas. Antes era azul #dbeafe
  const TD_AC=`border:1px solid #cbd5e1;padding:3px 6px;font-size:10px;color:${ACUM_TXT}`;
  const pctFmt=v=>v==null?'':v.toFixed(1)+'%';

  // Presupuesto contractual (opcional) y avances
  const cantPres=_edpCantPres!=null?_edpCantPres:null;
  const totPres=cantPres!=null?+(cantPres*F.tarifa).toFixed(2):null;
  const pctEq=totPres?F.totEquipo/totPres*100:null;
  const acumCant=cantPres!=null?null:null;
  const acumTotEq=+(_edpAcumAnt+F.totEquipo).toFixed(2);
  const pctAcumEq=totPres?acumTotEq/totPres*100:null;

  const theadP1=`<thead>
    <tr>
      <th style="${THG};width:38px" rowspan="2">Ítem</th>
      <th style="${THG};text-align:left" rowspan="2">Descripción</th>
      <th style="${THG}" colspan="4">Presupuesto</th>
      <th style="${THG_AM}" colspan="3">Valorización Actual</th>
      <th style="${THG}" colspan="3">Acumulado Actual</th>
    </tr>
    <tr>
      <th style="${THS}">Unid.</th><th style="${THS}">Cant.</th><th style="${THS}">P. Unit ${SIM}</th><th style="${THS}">Total ${SIM}</th>
      <th style="${THS_AM}">Cant.</th><th style="${THS_AM}">Total ${SIM}</th><th style="${THS_AM}">% Avance</th>
      <th style="${THS}">Cant.</th><th style="${THS}">Total ${SIM}</th><th style="${THS}">% Avance</th>
    </tr>
  </thead>`;

  // Con reconocimiento, la fila 1.01 muestra lo que arroja el sistema y el
  // ajuste va en una línea aparte: así el proveedor ve de dónde sale el total.
  const _rec=+F.cantRecon||0;
  const _cantFila=_rec?F.cantBase:F.cantEquipo;
  const _totFila=+(_cantFila*F.tarifa).toFixed(2);
  const filaEq=`<tr>
    <td style="${TD};text-align:center">1.01</td>
    <td style="${TD};font-weight:700">${eqDesc}</td>
    <td style="${TD};text-align:center">${F.tarifaUn}</td>
    <td style="${TD};text-align:right">${cantPres!=null?_edpN2(cantPres):''}</td>
    <td style="${TD};text-align:right">${_edpN2(F.tarifa)}</td>
    <td style="${TD};text-align:right">${totPres!=null?_edpN2(totPres):''}</td>
    <td style="${TD};text-align:right;${AM}">${_edpN2(_cantFila)}</td>
    <td style="${TD};text-align:right;font-weight:700;${AM}">${SIM} ${_edpN2(_totFila)}</td>
    <td style="${TD};text-align:right;${AM}">${pctFmt(pctEq)}</td>
    <td style="${TD_AC};text-align:right"></td>
    <td style="${TD_AC};text-align:right;font-weight:600">${SIM} ${_edpN2(acumTotEq)}</td>
    <td style="${TD_AC};text-align:right">${pctFmt(pctAcumEq)}</td>
  </tr>
  ${_rec?(()=>{
    const totRec=+(_rec*F.tarifa).toFixed(2);
    const col=_rec>0?'#166534':'#b91c1c';
    const sg=_rec>0?'+':'−';
    const val=Math.abs(_rec),valS=Math.abs(totRec);
    return`<tr>
      <td style="${TD};text-align:center">1.02</td>
      <td style="${TD}">Reconocimiento contractual${_edpReconMotivo?` — ${_edpReconMotivo}`:''}</td>
      <td style="${TD};text-align:center">${F.tarifaUn}</td>
      <td style="${TD}"></td>
      <td style="${TD};text-align:right">${_edpN2(F.tarifa)}</td>
      <td style="${TD}"></td>
      <td style="${TD};text-align:right;color:${col};${AM}">${sg} ${_edpN2(val)}</td>
      <td style="${TD};text-align:right;font-weight:700;color:${col};${AM}">${sg} ${SIM} ${_edpN2(valS)}</td>
      <td style="${TD};${AM}"></td>
      <td style="${TD_AC}"></td><td style="${TD_AC}"></td><td style="${TD_AC}"></td>
    </tr>
    <tr>
      <td style="${TD}"></td>
      <td style="${TD};font-weight:700;text-align:right">TOTAL EQUIPO (${F.tarifaUn})</td>
      <td style="${TD}"></td><td style="${TD}"></td><td style="${TD}"></td><td style="${TD}"></td>
      <td style="${TD};text-align:right;font-weight:800;${AM}">${_edpN2(F.cantEquipo)}</td>
      <td style="${TD};text-align:right;font-weight:800;${AM}">${SIM} ${_edpN2(F.totEquipo)}</td>
      <td style="${TD};${AM}"></td>
      <td style="${TD_AC}"></td><td style="${TD_AC}"></td><td style="${TD_AC}"></td>
    </tr>`;
  })():''}`;

  const filasDesc=F.descRows.length
    ?F.descRows.map((r,i)=>`<tr>
      <td style="${TD};text-align:center">2.${String(i+1).padStart(2,'0')}</td>
      <td style="${TD}">${r.desc}</td>
      <td style="${TD};text-align:center">${r.und}</td>
      <td style="${TD}"></td><td style="${TD};text-align:right">${_edpN2(r.precio)}</td><td style="${TD}"></td>
      <td style="${TD};text-align:right;${AM}">(${_edpN2(r.cant)})</td>
      <td style="${TD};text-align:right;color:#b91c1c;${AM}">${SIM} (${_edpN2(r.total)})</td>
      <td style="${TD};${AM}"></td>
      <td style="${TD_AC}"></td><td style="${TD_AC};text-align:right">${SIM} (${_edpN2(r.total)})</td><td style="${TD_AC}"></td>
    </tr>`).join('')
    :`<tr><td colspan="12" style="${TD};text-align:center;color:#94a3b8">Sin descuentos registrados en Auxilios Mecánicos para este período</td></tr>`;

  const resumen=(l,v,bg)=>`<tr><td style="padding:3px 8px;font-size:10px;color:#334155">${l}</td><td style="padding:3px 8px;text-align:right;font-weight:700;font-size:10px;${bg?'background:'+bg:''}">${SIM} ${_edpN2(v)}</td></tr>`;

  // Esquina superior derecha de cada hoja: logo del proveedor (del Máster) o, si no tiene, su nombre
  const provCorner=eq.logoProveedor
    ?`<img src="${eq.logoProveedor}" style="height:40px;max-width:150px;object-fit:contain">`
    :`<div style="font-size:10px;font-weight:800;color:${AZ};max-width:160px;text-align:right">${eq.proveedor||''}</div>`;
  const headerHoja=(titulo,sub)=>`<div style="display:flex;align-items:center;justify-content:space-between;border-bottom:2px solid ${AZ};padding-bottom:8px;margin-bottom:8px">
    <img src="${_logoUrl}" style="height:44px;object-fit:contain">
    <div style="text-align:center;flex:1">
      <div style="font-size:16px;font-weight:900;color:${AZ}">${titulo}</div>
      <div style="font-size:10px;color:#64748b">${sub}</div>
    </div>
    ${provCorner}
  </div>`;

  const pagina1=`<div style="font-family:Arial,sans-serif;color:#111">
    ${headerHoja(`EDP N° ${_edpNum||'—'}`,`CONTRATA: ${eq.proveedor||'—'}`)}
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:.4rem 1rem;margin-bottom:10px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:8px">
      ${infoCell('Cliente',_edpCliente)}${infoCell('RUC Cliente',_edpRuc)}${infoCell('Proyecto',eq.proyecto)}${infoCell('Estado de Pago N°',_edpNum)}
      ${infoCell('Proveedor',eq.proveedor)}${infoCell('RUC Proveedor',eq.rucProveedor)}${infoCell('Período',_edpFmtDMY(_edpDesde)+' al '+_edpFmtDMY(_edpHasta))}${infoCell('Moneda',MONLBL)}
      <div style="grid-column:1/-1"><strong style="display:block;color:#64748b;font-size:9px;text-transform:uppercase;letter-spacing:.05em">Equipo</strong><span style="font-size:11px;font-weight:700;color:#111">${eqDesc}</span></div>
    </div>
    <table style="width:100%;border-collapse:collapse;margin-bottom:10px">
      ${theadP1}
      <tbody>
        <tr><td colspan="12" style="${TD};font-weight:800;background:#e2e8f0">1.00 EQUIPO</td></tr>
        ${filaEq}
        <tr><td colspan="12" style="${TD};font-weight:800;background:#e2e8f0">2.00 DESCUENTO</td></tr>
        ${filasDesc}
        <tr>
          <td colspan="6" style="${TD};text-align:right;font-weight:900;background:#dbeafe">PRESUPUESTO TOTAL (${SIM})</td>
          <td style="${TD};${AM}"></td>
          <td style="${TD};text-align:right;font-weight:900;background:#FFFF00">${SIM} ${_edpN2(F.presupuestoTotal)}</td>
          <td style="${TD};${AM}"></td>
          <td style="${TD_AC};background:${ACUM_BG}"></td>
          <td style="${TD_AC};text-align:right;font-weight:700;background:${ACUM_BG}">${SIM} ${_edpN2(+(_edpAcumAnt+F.presupuestoTotal).toFixed(2))}</td>
          <td style="${TD_AC};background:${ACUM_BG}"></td>
        </tr>
      </tbody>
    </table>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem">
      <table style="border:1px solid #cbd5e1"><tbody>
        <tr><td colspan="2" style="${TD};font-weight:800;background:#f1f5f9">${eq.proveedor||'PROVEEDOR'}</td></tr>
        ${resumen(`NETO (${SIM})`,F.subTotal)}${resumen(`SUB TOTAL (${SIM})`,F.subTotal)}${resumen('IGV 18%',F.igv)}${resumen(`TOTAL (${SIM})`,F.total,'#fde047')}
      </tbody></table>
      <table style="border:1px solid #cbd5e1"><tbody>
        <tr><td colspan="2" style="${TD};font-weight:800;background:#f1f5f9">ECOSERMO</td></tr>
        ${resumen('DETRACCIÓN 10%',F.detraccion)}${resumen('A ABONAR',F.aAbonar,'#fde047')}
      </tbody></table>
    </div>
    <!-- Firmas: Representante del Proveedor · Representante de ECOSERMO -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:1.4rem;margin-top:26px;page-break-inside:avoid">
      ${[
        {tit:eq.proveedor||'PROVEEDOR',rol:'REPRESENTANTE DEL PROVEEDOR',nom:_edpFirmaProv,img:''},
        {tit:'ECOSERMO',rol:`RESIDENTE DE PROYECTO${eq.proyecto?' ('+eq.proyecto+')':''}`,nom:_edpFirmaEco,img:(_edpFirmaSel()||{}).imgUrl||''}
      ].map(f=>`<div style="border:1px solid #cbd5e1;border-radius:4px;padding:6px 10px 8px">
        <div style="font-size:10px;font-weight:800;color:${AZ};border-bottom:1px solid #e2e8f0;padding-bottom:3px;margin-bottom:2px">${f.tit}</div>
        <div style="height:88px;display:flex;align-items:flex-end;justify-content:center">${f.img?`<img src="${f.img}" style="max-height:86px;max-width:100%;object-fit:contain">`:''}</div>
        <div style="border-top:1.2px solid #333;margin:0 14px 4px"></div>
        <div style="text-align:center;font-size:9.5px;font-weight:700;color:#111;min-height:12px">${f.nom||''}</div>
        <div style="text-align:center;font-size:8px;text-transform:uppercase;letter-spacing:.05em;color:#64748b">${f.rol}</div>
        <div style="text-align:center;font-size:7.5px;color:#94a3b8;margin-top:1px">Firma y sello</div>
      </div>`).join('')}
    </div>
  </div>`;

  let tablaPagina2,resumenPagina2;
  if(esDia){
    // Formato por DÍAS: cada parte diario = 1.00 de trabajo, sin horómetros ni calentamiento
    const marcaModelo=[eq.marca,eq.modelo].filter(Boolean).join(' ')||'—';
    // Pagando por día calendario la fecha vale 1: se muestra un solo parte por
    // fecha. Se prioriza el operativo y, entre ellos, el turno DÍA; si la fecha
    // solo tuvo turno NOCHE, se muestra ese.
    const _unoPorFecha=(lista)=>{
      const porFecha=new Map();
      lista.forEach(d=>{
        const act=porFecha.get(d.fecha);
        if(!act){porFecha.set(d.fecha,d);return;}
        const mejor=(a,b)=>{
          if(a.trabajo!==b.trabajo)return a.trabajo>b.trabajo?a:b;   // el operativo manda
          const esDiaA=/^D/i.test(a.turno||''),esDiaB=/^D/i.test(b.turno||'');
          if(esDiaA!==esDiaB)return esDiaA?a:b;                      // luego el turno DÍA
          return a;
        };
        porFecha.set(d.fecha,mejor(act,d));
      });
      return [...porFecha.values()].sort((a,b)=>a.fecha.localeCompare(b.fecha));
    };
    const _porFechaTab=F.tarifaUn==='MES'||_edpDiaModo==='fecha';
    const _filasFuente=_porFechaTab?_unoPorFecha(H.dias):H.dias;
    const _totFilas=_filasFuente.reduce((s,d)=>s+d.trabajo,0);
    const filasDias=_filasFuente.map((d,i)=>`<tr>
      <td style="${TD};text-align:center">${i+1}</td><td style="${TD};text-align:center">${_edpFmtDMY(d.fecha)}</td>
      <td style="${TD};text-align:center">${(eq.sub||eq.tipo||'').toUpperCase()}</td><td style="${TD};text-align:center">${marcaModelo.toUpperCase()}</td>
      <td style="${TD};text-align:center">${eq.placa||'—'}</td><td style="${TD};text-align:center">${d.turno}</td>
      <td style="${TD}">${d.desc}</td>
      <td style="${TD};text-align:right;${d.trabajo?'':'color:#b91c1c;font-weight:700'}">${_edpN2(d.trabajo)}</td><td style="${TD};text-align:right;font-weight:700;${d.trabajo?'':'color:#b91c1c'}">${_edpN2(d.trabajo)}</td>
      <td style="${TD};${d.trabajo?'':'color:#b91c1c;font-weight:700'}">${d.obs}</td>
    </tr>`).join('');
    tablaPagina2=`<table style="width:100%;border-collapse:collapse;margin-bottom:8px">
      <thead><tr>
        <th style="${TH}">Ítem</th><th style="${TH}">Fecha</th><th style="${TH}">Equipo</th><th style="${TH}">Marca / Modelo</th>
        <th style="${TH}">Placa</th><th style="${TH}">Turno</th><th style="${TH};text-align:left">Descripción</th>
        <th style="${TH}">Trabajo Día</th><th style="${TH}">Parcial</th><th style="${TH};text-align:left">Observaciones</th>
      </tr></thead>
      <tbody>${filasDias||`<tr><td colspan="10" style="${TD};text-align:center;color:#94a3b8">Sin partes diarios en este período</td></tr>`}</tbody>
      <tfoot><tr style="background:#e2e8f0;font-weight:800"><td colspan="7" style="${TD};text-align:right">TOTALES</td><td style="${TD};text-align:right">${_edpN2(_totFilas)}</td><td style="${TD};text-align:right">${_edpN2(_totFilas)}</td><td style="${TD}"></td></tr></tfoot>
    </table>`;
    // Con tarifa MENSUAL lo que se paga es una fracción del mes, no los días sueltos
    const esMes=F.tarifaUn==='MES';
    const _porFecha=esMes||_edpDiaModo==='fecha';
    const _cantPagar=esMes?H.diasAPagar:(_porFecha?H.diasAPagar:H.diasTrabajados);
    const _dobles=H.diasTrabajados-H.diasReportados;
    // Por día calendario el cuadro ya muestra una fila por fecha, así que hablar
    // de turnos o de criterio de pago sobra: los números cuadran solos.
    resumenPagina2=`<div style="max-width:${esMes?'420':'360'}px">
      <table style="border:1px solid #cbd5e1;width:100%"><tbody>
        <tr><td style="${TD}">DÍAS DEL PERÍODO</td><td style="${TD};text-align:right;font-weight:700">${H.diasPeriodo}</td></tr>
        ${!_porFecha?`<tr><td style="${TD}">TURNOS REPORTADOS</td><td style="${TD};text-align:right;font-weight:700">${H.dias.length}</td></tr>`:''}
        <tr><td style="${TD}">DÍAS REPORTADOS</td><td style="${TD};text-align:right;font-weight:700">${H.diasReportados}</td></tr>
        <tr><td style="${TD}">DÍAS INOPERATIVOS</td><td style="${TD};text-align:right;font-weight:700;${H.diasInoperativos?'color:#b91c1c':''}">${H.diasInoperativos}</td></tr>
        <tr><td style="${TD};font-weight:800;background:#fde047">${_porFecha?'DÍAS A PAGAR':'TURNOS A PAGAR'}</td><td style="${TD};text-align:right;font-weight:900;background:#fde047">${_edpN2(_cantPagar)} ${_porFecha?'días':'turnos'}</td></tr>
        ${esMes?`<tr><td style="${TD};font-weight:800;background:#fde047">INCIDENCIA</td>
          <td style="${TD};text-align:right;font-weight:900;background:#fde047">${(H.incidencia*100).toFixed(2)} %</td></tr>`:''}
      </tbody></table>
      ${!esMes&&!_porFecha&&_dobles>0?`<div style="margin-top:5px;font-size:8.5px;color:#334155;border-left:3px solid ${AZ};padding:3px 7px;background:#f8fafc">
        ${_dobles} fecha${_dobles===1?'':'s'} con doble turno (día y noche): se valoriza <strong>por turno</strong>, por eso ${H.diasTrabajados} y no ${H.diasReportados}.
      </div>`:''}
      ${esMes?`<div style="margin-top:5px;font-size:8.5px;color:#475569;border-left:3px solid ${AZ};padding:3px 7px;background:#f8fafc">
        <strong>INCIDENCIA = DÍAS A PAGAR ÷ DÍAS DEL PERÍODO</strong> (21 al 20 del mes siguiente)<br>
        ${H.diasAPagar} ÷ ${H.diasPeriodo} = ${_edpN2(H.incidencia)} · se valoriza ese factor de la tarifa mensual de ${SIM} ${_edpN2(F.tarifa)}
      </div>`:''}
    </div>`;
  }else{
    const filasHoras=H.dias.map((d,i)=>`<tr>
      <td style="${TD};text-align:center">${i+1}</td><td style="${TD}">${_edpFmtDMY(d.fecha)}</td><td style="${TD};text-align:center">${d.turno}</td>
      <td style="${TD}">${d.desc}</td><td style="${TD};text-align:right">${_edpN2(d.hrIni)}</td><td style="${TD};text-align:right">${_edpN2(d.hrFin)}</td>
      <td style="${TD};text-align:right">${_edpN2(d.motor)}</td><td style="${TD};text-align:right">${_edpN2(d.cal)}</td><td style="${TD};text-align:right;font-weight:700">${_edpN2(d.efectiva)}</td>
      <td style="${TD}">${d.obs}</td>
    </tr>`).join('');
    tablaPagina2=`<table style="width:100%;border-collapse:collapse;margin-bottom:8px">
      <thead><tr>
        <th style="${TH}">#</th><th style="${TH}">Fecha</th><th style="${TH}">Turno</th><th style="${TH};text-align:left">Descripción</th>
        <th style="${TH}">H. Inicial</th><th style="${TH}">H. Final</th><th style="${TH}">H. Motor</th><th style="${TH}">Calent.</th><th style="${TH}">H. Efectiva</th><th style="${TH};text-align:left">Observaciones</th>
      </tr></thead>
      <tbody>${filasHoras||`<tr><td colspan="10" style="${TD};text-align:center;color:#94a3b8">Sin partes diarios en este período</td></tr>`}</tbody>
      <tfoot><tr style="background:#e2e8f0;font-weight:800"><td colspan="6" style="${TD};text-align:right">TOTALES</td><td style="${TD};text-align:right">${_edpN2(H.horasMotor)}</td><td style="${TD};text-align:right">${_edpN2(H.horasCal)}</td><td style="${TD};text-align:right">${_edpN2(H.horasEfectivas)}</td><td style="${TD}"></td></tr></tfoot>
    </table>`;
    // El % se marca en rojo cuando no llega al umbral: es lo que sustenta el no pago del mínimo
    const _dCol=H.cumpleDisp?'#111':'#C00000';
    resumenPagina2=`<div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;max-width:520px">
      <table style="border:1px solid #cbd5e1"><tbody>
        <tr><td style="${TD}">DISPONIBILIDAD MECÁNICA</td><td style="${TD};text-align:right;font-weight:700;color:${_dCol}">${H.dispMec.toFixed(1)}%</td></tr>
        <tr><td style="${TD}">DISPONIBILIDAD MÍNIMA</td><td style="${TD};text-align:right;font-weight:700">${_EDP_DISP_MIN}.0%</td></tr>
        <tr><td style="${TD}">HORAS MÍNIMAS (MES)</td><td style="${TD};text-align:right;font-weight:700">${_edpN2(H.horasMinimas)} hrs</td></tr>
        ${H.prorrateado?`<tr><td style="${TD}">DÍAS EN OBRA / PERÍODO</td><td style="${TD};text-align:right;font-weight:700;color:#C00000">${H.diasEnObra} / ${H.diasPeriodo}</td></tr>
        <tr><td style="${TD};font-weight:800">HORAS MÍNIMAS PROPORC.</td><td style="${TD};text-align:right;font-weight:900">${_edpN2(H.horasMinimasProp)} hrs</td></tr>`:''}
      </tbody></table>
      <table style="border:1px solid #cbd5e1"><tbody>
        <tr><td style="${TD}">HORAS TRABAJADAS</td><td style="${TD};text-align:right;font-weight:700">${_edpN2(H.horasEfectivas)} hrs</td></tr>
        <tr><td style="${TD}">HORAS MÍNIMAS A PAGAR</td><td style="${TD};text-align:right;font-weight:700">${_edpN2(H.horasMinimasAPagar)} hrs</td></tr>
        <tr><td style="${TD};font-weight:800;background:#fde047">HORAS A PAGAR</td><td style="${TD};text-align:right;font-weight:900;background:#fde047">${_edpN2(H.horasAPagar)} hrs</td></tr>
      </tbody></table>
    </div>
    ${H.prorrateado?`<div style="max-width:520px;margin-top:6px;padding:5px 8px;border-left:3px solid ${AZ};background:#f8fafc;font-size:8.5px;color:#334155">
      <strong>MÍNIMO PRORRATEADO POR PERMANENCIA</strong> — el equipo estuvo ${H.diasEnObra} de los ${H.diasPeriodo} días del período
      (desde el ${_edpFmtDMY(H.iniObra)}), por lo que no le corresponde el mínimo mensual completo:<br>
      ${_edpN2(H.horasMinimas)} h ÷ ${H.diasPeriodo} días × ${H.diasEnObra} días = <strong>${_edpN2(H.horasMinimasProp)} h</strong> de mínimo exigible.
    </div>`:''}
    ${H.motivoSinMinimo?`<div style="max-width:520px;margin-top:6px;padding:5px 8px;border:1px solid #C00000;background:#FDECEC;font-size:8.5px;color:#C00000;font-weight:700">
      NO SE PAGAN HORAS MÍNIMAS — ${H.motivoSinMinimo}. Se valoriza únicamente ${_edpN2(H.horasEfectivas)} hrs efectivamente trabajadas.
    </div>`:''}`;
  }

  const pagina2=`<div style="font-family:Arial,sans-serif;color:#111">
    ${headerHoja(`VALORIZACIÓN DE ${esDia?'DÍAS':'HORAS'} TRABAJADOS`,`${eqDesc} · Período: ${_edpFmtDMY(_edpDesde)} al ${_edpFmtDMY(_edpHasta)}`)}
    ${tablaPagina2}
    ${resumenPagina2}
  </div>`;

  // ── Página 3: detalle de descuentos (solo si existen) ──
  let pagina3='';
  const hayDesc=(D.insumos&&D.insumos.length)||(D.atenciones&&D.atenciones.length)||_edpDescManual.length;
  if(hayDesc){
    // Los precios del catálogo están en soles: se pasan a la moneda del equipo
    const _fTCi=_edpFactorTC(eq);
    const _ins=_fTCi===1?D.insumos
      :D.insumos.map(i=>({...i,precio:+(i.precio*_fTCi).toFixed(4),total:+(i.total*_fTCi).toFixed(2)}));
    const totIns=+_ins.reduce((s,i)=>s+i.total,0).toFixed(2);
    // El total de la atención sale del cuadro de recursos (paso 2), no de
    // multiplicar las horas por una tarifa única como antes.
    const _arPerT={desde:_edpDesde,hasta:_edpHasta,
      dias:Math.max(1,Math.round((new Date(_edpHasta+'T12:00')-new Date(_edpDesde+'T12:00'))/864e5)+1)};
    const _fTCr=_edpFactorTC(eq);
    const totAten=+(((typeof arCalcular==='function')
      ? arCalcular(D.atenciones,_arPerT).total
      : D.atenciones.reduce((s,a)=>s+a.total,0))*_fTCr).toFixed(2);
    const totManual=+(_edpDescManual.reduce((s,r)=>s+(+r.cant||0)*(+r.precio||0),0)*_fTCr).toFixed(2);

    const secIns=D.insumos.length?`
      <div style="font-size:11px;font-weight:800;color:${AZ};margin:10px 0 4px;border-bottom:1px solid ${AZ};padding-bottom:2px">A. CONSUMO DE INSUMOS — ALMACÉN ECOSERMO</div>
      <table style="width:100%;border-collapse:collapse;margin-bottom:6px">
        <thead><tr>
          <th style="${TH}">#</th><th style="${TH}">Fecha</th><th style="${TH}">N° Auxilio</th><th style="${TH}">Código</th>
          <th style="${TH};text-align:left">Descripción del Insumo</th><th style="${TH}">Unid.</th>
          <th style="${TH}">Cant.</th><th style="${TH}">P. Unit ${SIM}</th><th style="${TH}">Total ${SIM}</th>
        </tr></thead>
        <tbody>${_ins.map((i,n)=>`<tr>
          <td style="${TD};text-align:center">${n+1}</td>
          <td style="${TD};text-align:center">${_edpFmtDMY(i.fecha)}</td>
          <td style="${TD};text-align:center;font-family:monospace">${i.auxCod||'—'}</td>
          <td style="${TD};text-align:center;font-family:monospace">${i.cod||'—'}</td>
          <td style="${TD}">${i.desc}</td>
          <td style="${TD};text-align:center">${i.und}</td>
          <td style="${TD};text-align:right">${_edpN2(i.cant)}</td>
          <td style="${TD};text-align:right">${_edpN2(i.precio)}${i.precio?'':' <span style="color:#b91c1c;font-size:8px">(sin P.U.R.)</span>'}</td>
          <td style="${TD};text-align:right;font-weight:700;color:#b91c1c">${_edpN2(i.total)}</td>
        </tr>`).join('')}</tbody>
        <tfoot><tr style="background:#e2e8f0;font-weight:800"><td colspan="8" style="${TD};text-align:right">SUBTOTAL INSUMOS</td><td style="${TD};text-align:right;color:#b91c1c">${SIM} ${_edpN2(totIns)}</td></tr></tfoot>
      </table>`:'';

    // Atención mecánica en dos pasos: primero las horas atendidas y quién las
    // atendió, después el costo de los recursos empleados en esas horas.
    const _arPer={desde:_edpDesde,hasta:_edpHasta,
      dias:Math.max(1,Math.round((new Date(_edpHasta+'T12:00')-new Date(_edpDesde+'T12:00'))/864e5)+1)};
    const _arC0=(typeof arCalcular==='function')?arCalcular(D.atenciones,_arPer):{filas:[],total:0};
    // Todo el cuadro pasa a la moneda del equipo: el C.U.H. y el parcial de
    // cada recurso, y el total. Así lo impreso cuadra con el resumen de abajo.
    const _fTCc=_edpFactorTC(eq);
    const _arC=_fTCc===1?_arC0:{
      ..._arC0,
      filas:_arC0.filas.map(f=>({...f,cuh:+(f.cuh*_fTCc).toFixed(4),parcial:+(f.parcial*_fTCc).toFixed(2)})),
      total:+(_arC0.total*_fTCc).toFixed(2)
    };
    const secAten=D.atenciones.length?`
      <div style="font-size:11px;font-weight:800;color:${AZ};margin:10px 0 4px;border-bottom:1px solid ${AZ};padding-bottom:2px">B. ATENCIÓN MECÁNICA — ECOSERMO (según tiempo de parada)</div>
      <table style="width:100%;border-collapse:collapse;margin-bottom:4px">
        <thead><tr>
          <th style="${TH}">#</th><th style="${TH}">Fecha</th><th style="${TH}">N° Auxilio</th><th style="${TH}">Tipo Falla</th>
          <th style="${TH};text-align:left">Descripción del Problema</th><th style="${TH};text-align:left">Mecánico(s)</th>
          <th style="${TH}">T. Parada (h)</th>
        </tr></thead>
        <tbody>${D.atenciones.map((a,n)=>`<tr>
          <td style="${TD};text-align:center">${n+1}</td>
          <td style="${TD};text-align:center">${_edpFmtDMY(a.fecha)}</td>
          <td style="${TD};text-align:center;font-family:monospace">${a.auxCod||'—'}</td>
          <td style="${TD};text-align:center">${a.tipo}</td>
          <td style="${TD}">${a.desc}</td>
          <td style="${TD};font-size:9px">${a.mec}</td>
          <td style="${TD};text-align:right;font-weight:700">${_edpN2(a.horas)}</td>
        </tr>`).join('')}</tbody>
        <tfoot><tr style="font-weight:800"><td colspan="6" style="${TD};text-align:right;border:none">Total (1)</td><td style="${TD};text-align:right;border-top:2px solid ${AZ};border-bottom:2px double ${AZ}">${_edpN2(D.horasAtencion)}</td></tr></tfoot>
      </table>
      <table style="width:100%;border-collapse:collapse;margin:8px 0 6px;max-width:640px">
        <thead><tr>
          <th style="${TH};text-align:left">Tipo de recurso</th>
          <th style="${TH}">Cantidad (2)</th><th style="${TH}">Participación (3)</th>
          <th style="${TH}">C.U.H. (4)</th><th style="${TH}">Parcial (5)=(1)*(2)*(3)*(4)</th>
        </tr></thead>
        <tbody>${_arC.filas.map(f=>`<tr>
          <td style="${TD}">${f.nombre}</td>
          <td style="${TD};text-align:center">${_edpN2(f.cantidad)}${f.auto&&f.rango.length>1?' <span style="font-size:8px;color:#555">('+f.rango.join('/')+')</span>':''}</td>
          <td style="${TD};text-align:center">${(f.participacion*100).toFixed(0)}%</td>
          <td style="${TD};text-align:right">${_edpN2(f.cuh)}${f.cuh?'':' <span style="color:#b91c1c;font-size:8px">('+f.fuente+')</span>'}</td>
          <td style="${TD};text-align:right;font-weight:700">${SIM} ${_edpN2(f.parcial)}</td>
        </tr>`).join('')}</tbody>
        <tfoot><tr style="background:#ffff00;font-weight:900">
          <td colspan="4" style="${TD};text-align:right">Total</td>
          <td style="${TD};text-align:right">${SIM} ${_edpN2(_arC.total)}</td>
        </tr></tfoot>
      </table>`:'';

    const secMan=_edpDescManual.length?`
      <div style="font-size:11px;font-weight:800;color:${AZ};margin:10px 0 4px;border-bottom:1px solid ${AZ};padding-bottom:2px">C. OTROS DESCUENTOS</div>
      <table style="width:100%;border-collapse:collapse;margin-bottom:6px">
        <thead><tr><th style="${TH}">#</th><th style="${TH};text-align:left">Descripción</th><th style="${TH}">Unid.</th><th style="${TH}">Cant.</th><th style="${TH}">P. Unit ${SIM}</th><th style="${TH}">Total ${SIM}</th></tr></thead>
        <tbody>${_edpDescManual.map((r,n)=>`<tr>
          <td style="${TD};text-align:center">${n+1}</td><td style="${TD}">${r.desc||'—'}</td><td style="${TD};text-align:center">${r.und||''}</td>
          <td style="${TD};text-align:right">${_edpN2(r.cant)}</td><td style="${TD};text-align:right">${_edpN2(r.precio)}</td>
          <td style="${TD};text-align:right;font-weight:700;color:#b91c1c">${_edpN2((+r.cant||0)*(+r.precio||0))}</td>
        </tr>`).join('')}</tbody>
        <tfoot><tr style="background:#e2e8f0;font-weight:800"><td colspan="5" style="${TD};text-align:right">SUBTOTAL OTROS</td><td style="${TD};text-align:right;color:#b91c1c">${SIM} ${_edpN2(totManual)}</td></tr></tfoot>
      </table>`:'';

    pagina3=`<div style="font-family:Arial,sans-serif;color:#111">
      ${headerHoja('DETALLE DE DESCUENTOS',`${eqDesc} · Período: ${_edpFmtDMY(_edpPerAux().desde)} al ${_edpFmtDMY(_edpPerAux().hasta)}${_edpAuxDistinto()?' (auxilios · las horas van del '+_edpFmtDMY(_edpDesde)+' al '+_edpFmtDMY(_edpHasta)+')':''} · EDP N° ${_edpNum||'—'}`)}
      ${secIns}${secAten}${secMan}
      <table style="width:100%;border-collapse:collapse;margin-top:8px;max-width:420px;margin-left:auto">
        <tbody>
          ${D.insumos.length?`<tr><td style="${TD}">Consumo de insumos (Almacén)</td><td style="${TD};text-align:right;font-weight:700">${SIM} ${_edpN2(totIns)}</td></tr>`:''}
          ${D.atenciones.length?`<tr><td style="${TD}">Atención mecánica</td><td style="${TD};text-align:right;font-weight:700">${SIM} ${_edpN2(totAten)}</td></tr>`:''}
          ${_edpDescManual.length?`<tr><td style="${TD}">Otros descuentos</td><td style="${TD};text-align:right;font-weight:700">${SIM} ${_edpN2(totManual)}</td></tr>`:''}
          <tr><td style="${TD};font-weight:900;background:#fde047">TOTAL DESCUENTOS (${SIM})</td><td style="${TD};text-align:right;font-weight:900;background:#fde047;color:#b91c1c">${SIM} ${_edpN2(F.totDesc)}</td></tr>
        </tbody>
      </table>
    </div>`;
  }

  // La línea punteada solo separa páginas en la vista previa; al imprimir se oculta (ver @media print)
  const sepStyle=`<style>.edp-sep{page-break-before:always;margin-top:14px;border-top:2px dashed #cbd5e1;padding-top:14px}
@media print{.edp-sep{border-top:none!important;margin-top:0!important;padding-top:0!important}}</style>`;
  return`${sepStyle}<div>${pagina1}</div><div class="edp-sep">${pagina2}</div>${pagina3?`<div class="edp-sep">${pagina3}</div>`:''}`;
}

function _edpPrint(){
  const eq=(DB.equipos||[]).find(e=>e.id===+_edpEqId);
  if(!eq||!_edpDesde||!_edpHasta){toast('Completa equipo y período primero',true);return;}
  const H=_edpHoras(eq,_edpDesde,_edpHasta);
  const D=_edpDescAuto(eq,_edpDesde,_edpHasta);
  const tarifa=_edpTarifaOv!=null?_edpTarifaOv:(+eq.tarifa||0);
  const tarifaUn=eq.tarifaUn||'HM';
  // La cantidad valorizada es la de PAGO: horas a pagar (respeta el mínimo del contrato) o días trabajados
  const CQ=_edpCantFinal(tarifaUn,H);
  const cantEquipo=CQ.total;
  const totEquipo=+(cantEquipo*tarifa).toFixed(2);
  const descRows=[
    ...D.insumos.map(i=>({desc:`Consumo: ${i.desc} (${_edpFmtDMY(i.fecha)} · ${i.auxCod})`,und:i.und,cant:i.cant,precio:i.precio,total:i.total})),
    ...(D.horasAtencion>0?[(()=>{
      // El importe sale del cuadro de recursos, que es lo que se imprime.
      const _p={desde:_edpPerAux().desde,hasta:_edpPerAux().hasta,
        dias:Math.max(1,Math.round((new Date(_edpPerAux().hasta+'T12:00')-new Date(_edpPerAux().desde+'T12:00'))/864e5)+1)};
      const _t=(typeof arCalcular==='function')
        ? arCalcular(D.atenciones,_p).total
        : +(D.horasAtencion*_edpTarifaAtencion).toFixed(2);
      const _h=+D.horasAtencion.toFixed(2);
      return{desc:'Atención mecánica por parte de Ecosermo',und:'hh',cant:_h,
        precio:_h>0?+(_t/_h).toFixed(4):0,total:+_t.toFixed(2)};
    })()]:[]),
    ..._edpDescManual.map(r=>({...r,total:+(r.cant*r.precio).toFixed(2)}))
  ];
  const _fTC=_edpFactorTC(eq);
  if(_fTC!==1)descRows.forEach(r=>{r.precio=+(r.precio*_fTC).toFixed(4);r.total=+(r.total*_fTC).toFixed(2);});
  const totDesc=+descRows.reduce((s,r)=>s+r.total,0).toFixed(2);
  const presupuestoTotal=+(totEquipo-totDesc).toFixed(2);
  const subTotal=presupuestoTotal;
  const igv=+(subTotal*0.18).toFixed(2);
  const total=+(subTotal+igv).toFixed(2);
  const detraccion=+(total*0.10).toFixed(2);
  const aAbonar=+(total-detraccion).toFixed(2);
  const F={tarifa,tarifaUn,cantEquipo,cantBase:CQ.base,cantRecon:CQ.recon,totEquipo,descRows,totDesc,presupuestoTotal,subTotal,igv,total,detraccion,aAbonar};

  const html=`<!DOCTYPE html><html><head><meta charset="utf-8"><title>EDP ${_edpNum||''} - ${eq.codigo}</title>
  <style>@page{size:A4 landscape;margin:1cm}*{box-sizing:border-box;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}
  body{font-family:Arial,sans-serif;margin:0}
  table{border-collapse:collapse}
  tr{page-break-inside:avoid}</style></head><body>${_edpDocHtml(eq,H,D,F)}
  <script>window.onload=()=>{window.print();}<\/script></body></html>`;
  const win=window.open('','_blank');
  if(!win){toast('Active ventanas emergentes para imprimir',true);return;}
  win.document.write(html);win.document.close();
}
