// ══ CORTE DE EQUIPOS (Cost Control) ═════════════════════════════════════════
// Arma la hoja de valorización de cada equipo con los partes diarios del
// período 21→20, en los dos formatos que usa el cliente:
//
//   · MODELO HORAS  (Línea Amarilla / Línea Blanca) — llevan horómetro, así que
//     la hoja muestra hora inicial/final y horas trabajadas, y cierra con el
//     cuadro de horas mínimas + el desglose HORAS EFECT. / STANDBY por área.
//   · MODELO DÍAS   (Coaster, camionetas, cisternas, equipos y vehículos
//     menores) — no llevan horómetro: la hoja muestra la condición de trabajo y
//     cierra con el cuadro DESCRIPCIÓN / Días / Inoperatividad / Incidencia.
//
// Los filtros son los mismos del dashboard de Combustible (tipo → subtipo →
// equipo) y la salida se imprime en PDF o se baja a Excel, una hoja por equipo.

const _CE_CLIENTE='COMPAÑÍA DE MINAS BUENAVENTURA S.A.A.';
// Esto es la VENTA al cliente: quien presta el servicio siempre es ECOSERMO.
// La empresa que nos alquila el equipo va en el EDP de proveedores, no aqui.
const _CE_PROVEEDOR='EMPRESA COMUNAL DE SERVICIOS MULTIPLES OYON(ECOSERMO)';
const _CE_AREA_DEF='PROYECTOS';
const _CE_DISP_MIN=85;                       // % de disponibilidad que exige el contrato
const _CE_TIPOS_HORA=['Línea Amarilla','Línea Blanca'];   // los que se valorizan por horas
const _CE_AREAS_FIJAS=['R3','MESAPATA'];     // columnas del desglose, aunque vayan en cero
const _CE_AZ='#1e3a5f';                      // azul de las bandas y cabeceras
const _CE_ROJO='#c00000';                    // rojo de los títulos
const _CE_DIA='#0000dc';                     // turno DIA en azul · RGB (0,0,220)
const _CE_NOCHE='#111111';                   // turno NOCHE en negro
const _ceColTurno=t=>String(t||'').toUpperCase()==='NOCHE'?_CE_NOCHE:_CE_DIA;

let _ceOffset=0;                 // desplazamiento del período 21→20
let _ceTipo=null,_ceSub=null,_ceEqId=null,_ceQ='';

const _ceN2=v=>Number(v||0).toLocaleString('es-PE',{minimumFractionDigits:2,maximumFractionDigits:2});
const _ceDmy=iso=>{if(!iso||!iso.includes('-'))return iso||'';const[y,m,d]=iso.split('-');return`${d}/${m}/${y}`;};
const _ceEsc=s=>String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const _ceEsHora=eq=>_CE_TIPOS_HORA.includes(eq&&eq.tipo);
// El navegador colapsa los saltos de linea al pintar el HTML, pero en una celda
// de Excel quedan como saltos duros y estiran la fila. Se aplanan al exportar
// para que la descripcion salga continua, igual que en el PDF.
const _ceLinea=t=>String(t==null?'':t).replace(/\s+/g,' ').trim();

// ¿El parte evidencia inoperatividad? Manda la condicion, luego las horas
// inoperativas registradas y, por ultimo, el texto de observaciones/descripcion
// (ahi es donde el supervisor anota "equipo inoperativo por falla ...").
const _CE_RE_INOP=/INOPERAT|FALLA|AVER[ÍI]A|MALOGR|DESPERFECT|SIN\s+OPERAR/i;
const _CE_RE_NEG=/SIN\s+(FALLA|NOVEDAD|INOPERAT|AVER)|NO\s+PRESENT[OÓ]\s+FALLA/i;
function _ceInop(cond,texto,im){
  if(/^INOPERATIVO/i.test(cond||''))return true;
  if(+im>0)return true;
  const t=String(texto||'');
  if(_CE_RE_NEG.test(t))return false;
  return _CE_RE_INOP.test(t);
}
// Columna "Horas Minimas" del formato:
//   SUP → el equipo supero las horas minimas del dia
//   SI  → no llego al minimo pero trabajo sin inoperatividad → se le reconoce
//   NO  → no llego al minimo por estar inoperativo o con falla mecanica
function _ceMarcaHmin(horas,hminDia,hayInop){
  if(hminDia<=0)return'—';
  if(horas>=hminDia)return'SUP';
  return hayInop?'NO':'SI';
}

// Período 21→20 con desplazamiento propio (no comparte estado con Combustible)
function _cePeriodo(){
  const hoy=new Date();
  const d=hoy.getDate(),m=hoy.getMonth(),y=hoy.getFullYear();
  let baseY=y,baseM=m;
  if(d<21){baseM=m-1;if(baseM<0){baseM=11;baseY=y-1;}}
  let iniM=baseM+_ceOffset,iniY=baseY;
  while(iniM>11){iniM-=12;iniY++;}
  while(iniM<0){iniM+=12;iniY--;}
  const ini=new Date(iniY,iniM,21),fin=new Date(iniY,iniM+1,20);
  const fmtD=x=>`${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}-${String(x.getDate()).padStart(2,'0')}`;
  const MESES=['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  return{desde:fmtD(ini),hasta:fmtD(fin),ini,fin,label:`${MESES[fin.getMonth()]} ${fin.getFullYear()}`,
    dias:Math.round((fin-ini)/864e5)+1};
}
function _ceNav(d){_ceOffset+=d;rCorteEquipos();}
function _ceSelTipo(t){if(_ceTipo===t){_ceTipo=null;_ceSub=null;_ceEqId=null;}else{_ceTipo=t;_ceSub=null;_ceEqId=null;}rCorteEquipos();}
function _ceSelSub(s){if(_ceSub===s){_ceSub=null;_ceEqId=null;}else{_ceSub=s;_ceEqId=null;}rCorteEquipos();}
function _ceSelEq(id){_ceEqId=_ceEqId===id?null:id;rCorteEquipos();}
function _ceLimpiar(){_ceTipo=null;_ceSub=null;_ceEqId=null;rCorteEquipos();}

// ── Consolidado de un equipo en el período ─────────────────────────────────
function _ceDatos(eq,per){
  const partes=(DB.partes||[])
    .filter(p=>+p.eqId===+eq.id&&p.fecha>=per.desde&&p.fecha<=per.hasta)
    .sort((a,b)=>a.fecha.localeCompare(b.fecha)
      ||((a.turno==='NOCHE'?1:0)-(b.turno==='NOCHE'?1:0))
      ||((+a.id||0)-(+b.id||0)));

  // Horas minimas de VENTA al cliente (campo "Hrs Min. Venta" del Master).
  // No se usa eq.horasMinimas: ese es el minimo del contrato con el PROVEEDOR y
  // sirve para el EDP, no para valorizarle al cliente.
  const hminMes=+eq.hrsMinVenta||0;
  const hminDia=per.dias>0?hminMes/per.dias:0;

  // El 2.º parte de una misma fecha es doble turno (D.T.) — así lo separa el cliente
  const vistos={};
  const filas=partes.map(p=>{
    const n=(vistos[p.fecha]=(vistos[p.fecha]||0)+1);
    const cond=String(p.condicion||'OPERATIVO').toUpperCase();
    const hrIni=+p.hrIni||0,hrFin=+p.hrFin||0;
    const horas=+p.ef>0?+p.ef:Math.max(0,+(hrFin-hrIni).toFixed(2));
    const hayInop=_ceInop(cond,(p.observaciones||'')+' '+(p.act||''),p.im);
    return{fecha:p.fecha,turno:p.turno||'DIA',tipo:p.tipoEquipo||eq.tipo||'',
      hrIni,hrFin,horas,inop:Math.max(0,+p.im||0),cond,dt:n>1,hayInop,
      hmin:_ceMarcaHmin(horas,hminDia,hayInop),
      inoperativo:/^INOPERATIVO/i.test(cond),   // solo por condicion: cuenta dias operativos
      area:p.areaT||'',desc:p.act||'',obs:p.observaciones||''};
  });

  // Desglose de horas por área — R3 y MESAPATA siempre presentes, como en el
  // formato. Los partes sin área no se cuelan en R3: van a su propio grupo, así
  // el total de la hoja y el SUMIFS del Excel dan exactamente lo mismo.
  filas.forEach(f=>{f.areaLbl=f.area||'(Sin área)';});
  const areas=[..._CE_AREAS_FIJAS];
  filas.forEach(f=>{if(!areas.includes(f.areaLbl))areas.push(f.areaLbl);});
  const efec={},standby={};
  areas.forEach(a=>{efec[a]=0;standby[a]=0;});
  filas.forEach(f=>{efec[f.areaLbl]+=f.horas;});

  const totalHoras=filas.reduce((s,f)=>s+f.horas,0);
  const totalEfec=areas.reduce((s,a)=>s+(efec[a]||0),0);
  const horasInop=filas.reduce((s,f)=>s+f.inop,0);
  const horasCalendario=per.dias*24;
  const dispMec=horasCalendario>0?Math.max(0,Math.min(100,(horasCalendario-horasInop)/horasCalendario*100)):100;

  const cumpleDisp=dispMec>=_CE_DISP_MIN;
  const conclusion=hminMes<=0?'Sin horas mínimas pactadas'
    :cumpleDisp?'Corresponde reconocer horas minimas'
    :`No corresponde reconocer horas mínimas — disponibilidad ${dispMec.toFixed(2)}% < ${_CE_DISP_MIN}%`;

  // Cuando la conclusión dice que corresponde reconocer el mínimo, lo que falte
  // para llegar a HMIN MES se paga como standby y el total de la hoja sube
  // hasta el mínimo:  STANDBY A PAGAR = HMIN MES − TOTAL HORAS EFECT.
  // Se carga al área donde el equipo trabajó más horas.
  const aplicaMinimo=cumpleDisp&&hminMes>0;
  const standbyPagar=aplicaMinimo?Math.max(0,+(hminMes-totalEfec).toFixed(2)):0;
  const areaPrinc=areas.reduce((m,a)=>(efec[a]||0)>(efec[m]||0)?a:m,areas[0]);
  standby[areaPrinc]=standbyPagar;
  const totalStandby=standbyPagar;

  // Cuadro del modelo por días: una línea por condición, separando el doble turno
  const acum={};
  filas.forEach(f=>{
    const k=f.cond+(f.dt?' D.T.':'');
    if(!acum[k])acum[k]={desc:k,dias:0,inop:0};
    acum[k].dias++;acum[k].inop+=f.inop;
  });
  const resumenCond=Object.values(acum)
    .map(r=>({...r,inc:per.dias>0?+(r.dias/per.dias).toFixed(2):0}))
    .sort((a,b)=>b.dias-a.dias||a.desc.localeCompare(b.desc));

  const fechas=[...new Set(filas.map(f=>f.fecha))];
  const diasOperativos=fechas.filter(f=>filas.some(x=>x.fecha===f&&!x.inoperativo)).length;

  return{filas,areas,efec,standby,totalHoras,totalEfec,totalStandby,horasInop,dispMec,
    hminMes,hminDia,cumpleDisp,conclusion,aplicaMinimo,areaPrinc,resumenCond,diasReportados:fechas.length,diasOperativos};
}

// ── Equipos con parte en el período, agrupados para los chips ──────────────
function _ceMapa(per){
  const partes=(DB.partes||[]).filter(p=>p.fecha>=per.desde&&p.fecha<=per.hasta);
  const tipos={};
  partes.forEach(p=>{
    const eq=(DB.equipos||[]).find(e=>+e.id===+p.eqId);
    if(!eq)return;
    const t=eq.tipo||'Otros',s=eq.sub||'Otros';
    const h=+p.ef>0?+p.ef:0;
    if(!tipos[t])tipos[t]={h:0,n:0,subs:{}};
    tipos[t].h+=h;tipos[t].n++;
    if(!tipos[t].subs[s])tipos[t].subs[s]={h:0,n:0,eqs:{}};
    tipos[t].subs[s].h+=h;tipos[t].subs[s].n++;
    if(!tipos[t].subs[s].eqs[eq.id])tipos[t].subs[s].eqs[eq.id]={eq,h:0,n:0};
    tipos[t].subs[s].eqs[eq.id].h+=h;tipos[t].subs[s].eqs[eq.id].n++;
  });
  return tipos;
}
// Equipos que pasan los filtros activos
function _ceEquipos(per){
  const tipos=_ceMapa(per);
  const out=[];
  Object.entries(tipos).forEach(([t,dt])=>{
    if(_ceTipo&&t!==_ceTipo)return;
    Object.entries(dt.subs).forEach(([s,ds])=>{
      if(_ceSub&&s!==_ceSub)return;
      Object.values(ds.eqs).forEach(({eq})=>{
        if(_ceEqId&&+eq.id!==+_ceEqId)return;
        if(_ceQ){
          const q=_ceQ.toLowerCase();
          if(!`${eq.codigo||''} ${eq.nombre||''} ${eq.placa||''} ${eq.sub||''}`.toLowerCase().includes(q))return;
        }
        out.push(eq);
      });
    });
  });
  return out.sort((a,b)=>String(a.codigo||'').localeCompare(String(b.codigo||''),'es'));
}

// ── Hoja de un equipo ──────────────────────────────────────────────────────
function _ceHojaHtml(eq,per,num){
  const D=_ceDatos(eq,per);
  const esHora=_ceEsHora(eq);
  const TH=`background:${_CE_AZ};color:#fff;padding:4px 5px;font-size:8px;font-weight:700;text-transform:uppercase;letter-spacing:.02em;border:1px solid ${_CE_AZ}`;
  const TD='border:1px solid #cbd5e1;padding:3px 5px;font-size:8.5px;vertical-align:middle;color:#111';
  const rot='font-size:9px;font-weight:900;color:#111;white-space:nowrap';
  const proyecto=eq.proyecto||((DB.proyectos||[])[0]||{}).nombre||'OPERACIONES ECOSERMO';
  const etiqueta=`${eq.sub||eq.tipo||'EQUIPO'} ${eq.codigo||''}`.trim();

  // Cabecera — el modelo por horas lleva "VALORIZACIÓN", el de días va numerado
  const titulo=esHora
    ?`VALORIZACIÓN - ${eq.tipo||''} - ${eq.codigo||''}`
    :`${String(num).padStart(2,'0')}.- ${(eq.sub||eq.tipo||'').toUpperCase()} ${eq.codigo||''}`;

  const cabecera=`
    <div style="font-size:11px;font-weight:900;color:${_CE_ROJO};text-decoration:underline;margin-bottom:5px">${_ceEsc(titulo)}</div>
    <table style="border-collapse:collapse;margin-bottom:6px">
      <tr><td style="${rot};padding:1px 14px 1px 0">PROYECTO:</td><td style="font-size:9px;font-weight:700;color:#111;padding:1px 22px 1px 0">${_ceEsc(proyecto)}</td>
          <td style="${rot};padding:1px 10px 1px 0">Fecha:</td><td style="font-size:9px;color:#111;padding:1px 18px 1px 0">${_ceDmy(today())}</td></tr>
      <tr><td style="${rot};padding:1px 14px 1px 0">CLIENTE:</td><td style="font-size:9px;font-weight:700;color:#111;padding:1px 22px 1px 0">${_ceEsc(_CE_CLIENTE)}</td>
          <td style="${rot};padding:1px 10px 1px 0">Periodo:</td><td style="font-size:9px;color:#111;padding:1px 18px 1px 0">${_ceDmy(per.desde)} &nbsp;&nbsp; ${_ceDmy(per.hasta)}</td></tr>
      <tr><td style="${rot};padding:1px 14px 1px 0">PROVEEDOR:</td><td colspan="3" style="font-size:9px;font-weight:700;color:#111;padding:1px 0">${_ceEsc(_CE_PROVEEDOR)}</td></tr>
      <tr><td style="${rot};padding:1px 14px 1px 0">ÁREA:</td><td colspan="3" style="font-size:9px;font-weight:700;color:#111;padding:1px 0">${_ceEsc(_CE_AREA_DEF)}</td></tr>
    </table>
    <div style="background:${_CE_AZ};color:#fff;text-align:center;font-size:9px;font-weight:900;padding:3px;letter-spacing:.03em">ALQUILER DE ${_ceEsc(etiqueta.toUpperCase())}</div>`;

  // ── Tabla de detalle ──
  let tabla;
  if(esHora){
    const filas=D.filas.map((f,i)=>{
      const TDr=TD+';color:'+_ceColTurno(f.turno);   // DIA azul · NOCHE negro
      return`<tr style="background:${i%2?'#f8fafc':'#fff'}">
      <td style="${TDr};text-align:center;white-space:nowrap">${_ceDmy(f.fecha)}</td>
      <td style="${TDr};text-align:center">${_ceEsc(f.turno)}</td>
      <td style="${TDr}">${_ceEsc(f.tipo)}</td>
      <td style="${TDr};font-weight:700;white-space:nowrap">${_ceEsc(eq.codigo||'')}</td>
      <td style="${TDr};text-align:right;font-family:monospace">${_ceN2(f.hrIni)}</td>
      <td style="${TDr};text-align:right;font-family:monospace">${_ceN2(f.hrFin)}</td>
      <td style="${TDr};text-align:right;font-family:monospace;font-weight:700">${_ceN2(f.horas)}</td>
      <td style="${TDr};text-align:center;font-weight:700;color:${f.hmin==='NO'?_CE_ROJO:_ceColTurno(f.turno)}">${f.hmin}</td>
      <td style="${TDr};text-align:center">${_ceEsc(f.areaLbl)}</td>
      <td style="${TDr}">${_ceEsc(f.desc)}</td>
      <td style="${TDr}">${_ceEsc(f.obs)||'—'}</td>
    </tr>`;}).join('');
    tabla=`<table style="width:100%;border-collapse:collapse;margin-top:2px">
      <thead><tr>
        <th style="${TH}">Fecha</th><th style="${TH}">Turno</th><th style="${TH}">Tipo de Equipo</th><th style="${TH}">Código</th>
        <th style="${TH};text-align:right">Hora Inicial</th><th style="${TH};text-align:right">Hora Final</th>
        <th style="${TH};text-align:right">Horas Trabajadas</th><th style="${TH}">Horas Mínimas</th>
        <th style="${TH}">Área del Trabajo</th><th style="${TH}">Descripción del Trabajo</th><th style="${TH}">Observaciones / Comentarios</th>
      </tr></thead>
      <tbody>${filas||`<tr><td colspan="11" style="${TD};text-align:center;color:#777">Sin partes diarios en el período</td></tr>`}</tbody>
      ${D.filas.length?`<tfoot><tr>
        <td colspan="6" style="${TD};text-align:right;font-weight:900;background:#fde9d9;color:${_CE_ROJO}">TOTAL</td>
        <td style="${TD};text-align:right;font-weight:900;background:#fde9d9;color:${_CE_ROJO};font-family:monospace">${_ceN2(D.totalHoras)}</td>
        <td colspan="4" style="${TD};background:#fde9d9"></td>
      </tr></tfoot>`:''}
    </table>`;
  }else{
    const filas=D.filas.map((f,i)=>{
      const TDr=TD+';color:'+_ceColTurno(f.turno);   // DIA azul · NOCHE negro
      return`<tr style="background:${i%2?'#f8fafc':'#fff'}">
      <td style="${TDr};text-align:center;white-space:nowrap">${_ceDmy(f.fecha)}</td>
      <td style="${TDr};text-align:center">${_ceEsc(f.turno)}</td>
      <td style="${TDr}">${_ceEsc(f.tipo)}</td>
      <td style="${TDr};font-weight:700;white-space:nowrap">${_ceEsc(eq.placa||eq.codigo||'')}</td>
      <td style="${TDr};text-align:center;${f.inoperativo?`color:${_CE_ROJO};font-weight:700`:''}">${_ceEsc(f.cond)}${f.dt?' <b>D.T.</b>':''}</td>
      <td style="${TDr};text-align:center">${_ceEsc(f.areaLbl)}</td>
      <td style="${TDr}">${_ceEsc(f.desc)}</td>
      <td style="${TDr}">${_ceEsc(f.obs)||'—'}</td>
    </tr>`;}).join('');
    tabla=`<table style="width:100%;border-collapse:collapse;margin-top:2px">
      <thead><tr>
        <th style="${TH}">Fecha</th><th style="${TH}">Turno</th><th style="${TH}">Tipo de Equipo</th><th style="${TH}">Código / Placa</th>
        <th style="${TH}">Condición de Trabajo</th><th style="${TH}">Área del Trabajo</th>
        <th style="${TH}">Descripción del Trabajo</th><th style="${TH}">Observaciones / Comentarios</th>
      </tr></thead>
      <tbody>${filas||`<tr><td colspan="8" style="${TD};text-align:center;color:#777">Sin partes diarios en el período</td></tr>`}</tbody>
    </table>`;
  }

  // ── Cuadro de cierre ──
  let cierre;
  if(esHora){
    const colArea=D.areas.map(a=>`<th style="${TH};text-align:right">${_ceEsc(a)}</th>`).join('');
    cierre=`
    <table style="border-collapse:collapse;margin-top:10px">
      <thead><tr>
        <th style="${TH}">Dias</th><th style="${TH}">Hmin.</th><th style="${TH}">Hmin Mes</th>
        <th style="${TH}">Disp. Meca</th><th style="${TH}">Conclusión</th>
      </tr></thead>
      <tbody><tr>
        <td style="${TD};text-align:center">${per.dias}</td>
        <td style="${TD};text-align:center">${_ceN2(D.hminDia)}</td>
        <td style="${TD};text-align:center">${_ceN2(D.hminMes)}</td>
        <td style="${TD};text-align:center;font-weight:700;color:${D.cumpleDisp?'#166534':_CE_ROJO}">${D.dispMec.toFixed(2)}%</td>
        <td style="${TD};font-weight:700;color:${D.cumpleDisp?_CE_ROJO:'#92400e'};padding-left:10px">${_ceEsc(D.conclusion)}</td>
      </tr></tbody>
    </table>
    <table style="width:100%;border-collapse:collapse;margin-top:8px">
      <thead><tr><th style="${TH};text-align:left">Descripción</th>${colArea}<th style="${TH};text-align:right;background:${_CE_ROJO};border-color:${_CE_ROJO}">Total</th></tr></thead>
      <tbody>
        <tr><td style="${TD};font-weight:700">HORAS EFECT.</td>
          ${D.areas.map(a=>`<td style="${TD};text-align:right;font-family:monospace">${_ceN2(D.efec[a]||0)} hrs</td>`).join('')}
          <td style="${TD};text-align:right;font-family:monospace;font-weight:700;background:#fde9d9">${_ceN2(D.totalEfec)} hrs</td></tr>
        <tr><td style="${TD};font-weight:700">HORAS STANDBY A PAGAR</td>
          ${D.areas.map(a=>`<td style="${TD};text-align:right;font-family:monospace">${_ceN2(D.standby[a]||0)} hrs</td>`).join('')}
          <td style="${TD};text-align:right;font-family:monospace;font-weight:700;background:#fde9d9">${_ceN2(D.totalStandby)} hrs</td></tr>
        <tr><td style="${TD};text-align:right;font-weight:900;background:#fff2cc" colspan="${D.areas.length+1}">Total =</td>
          <td style="${TD};text-align:right;font-weight:900;background:#fff2cc;font-family:monospace;color:${_CE_ROJO}">${_ceN2(D.totalEfec+D.totalStandby)} hrs</td></tr>
      </tbody>
    </table>`;
  }else{
    cierre=`
    <table style="border-collapse:collapse;margin-top:10px">
      <thead><tr>
        <th style="${TH};text-align:left">Descripcion</th><th style="${TH};text-align:center">Dias</th>
        <th style="${TH};text-align:center">Inoperatividad</th><th style="${TH};text-align:center">Incidencia</th>
      </tr></thead>
      <tbody>${D.resumenCond.map(r=>`<tr>
        <td style="${TD};padding-right:26px">${_ceEsc(r.desc)}</td>
        <td style="${TD};text-align:center;font-family:monospace">${r.dias}</td>
        <td style="${TD};text-align:center;font-family:monospace">${_ceN2(r.inop)}</td>
        <td style="${TD};text-align:center;font-family:monospace;font-weight:700">${r.inc.toFixed(2)}</td>
      </tr>`).join('')||`<tr><td colspan="4" style="${TD};text-align:center;color:#777">Sin registros</td></tr>`}</tbody>
    </table>`;
  }

  return`<div class="ce-hoja" style="font-family:Arial,sans-serif;color:#111">${cabecera}${tabla}${cierre}</div>`;
}

function _ceDocHtml(){
  const per=_cePeriodo();
  if(!_ceEqId)return'';           // la hoja es por equipo, no un consolidado
  const eqs=_ceEquipos(per);
  if(!eqs.length)return`<div style="font-family:Arial,sans-serif;color:#777;text-align:center;padding:2rem;font-size:12px">Sin equipos con partes diarios en el período ${_ceDmy(per.desde)} al ${_ceDmy(per.hasta)}</div>`;
  return eqs.map((eq,i)=>`<div style="${i?'page-break-before:always;margin-top:26px;border-top:2px dashed #cbd5e1;padding-top:18px':''}">${_ceHojaHtml(eq,per,i+1)}</div>`).join('');
}

function _cePrint(){
  const per=_cePeriodo();
  if(!_ceEqId){toast('Seleccione un equipo para generar el reporte',true);return;}
  if(!_ceEquipos(per).length){toast('No hay equipos con partes en el período',true);return;}
  const _eqSel=(DB.equipos||[]).find(e=>+e.id===+_ceEqId);
  const html=`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${_ceNombreArchivo(_eqSel,per)}</title>
  <style>@page{size:A4 landscape;margin:1cm}*{box-sizing:border-box;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}
  body{font-family:Arial,sans-serif;font-size:8.5px;color:#111;margin:0}
  tr{page-break-inside:avoid}
  .ce-hoja{page-break-inside:auto}</style></head><body>${_ceDocHtml()}</body></html>`;
  const win=window.open('','_blank');
  if(!win){toast('Active ventanas emergentes para imprimir',true);return;}
  win.document.write(html);win.document.close();win.focus();
  setTimeout(()=>win.print(),400);
}

// ── Excel: una hoja por equipo + un resumen al inicio ──────────────────────
// Nombre del archivo: Corte_<CÓDIGO DEL EQUIPO>_<desde>_<hasta>
// Windows no admite \ / : * ? " < > | en un nombre de archivo.
function _ceNombreArchivo(eq,per){
  const cod=String((eq&&eq.codigo)||'Equipos').replace(/[\\/:*?"<>|]/g,'-').trim();
  return`Corte_${cod}_${per.desde}_${per.hasta}`;
}
function _ceExportXls(){
  if(typeof XLSX==='undefined'){toast('Librería Excel no disponible',true);return;}
  const per=_cePeriodo();
  if(!_ceEqId){toast('Seleccione un equipo para exportar',true);return;}
  const eqs=_ceEquipos(per);
  if(!eqs.length){toast('No hay equipos con partes en el período',true);return;}

  const AZ='1E3A5F';
  const sTit={font:{bold:true,sz:11,color:{rgb:'C00000'}}};
  const sLbl={font:{bold:true,sz:9}};
  const sTh={fill:{patternType:'solid',fgColor:{rgb:AZ}},font:{bold:true,sz:8,color:{rgb:'FFFFFF'}},
    alignment:{horizontal:'center',vertical:'center',wrapText:true},
    border:{top:{style:'thin'},bottom:{style:'thin'},left:{style:'thin'},right:{style:'thin'}}};
  // Igual que en la hoja impresa: el turno DIA va en azul y el NOCHE en negro
  const sTdN={font:{sz:8.5,color:{rgb:_CE_NOCHE.replace('#','').toUpperCase()}},alignment:{vertical:'center',wrapText:true},
    border:{top:{style:'thin',color:{rgb:'CBD5E1'}},bottom:{style:'thin',color:{rgb:'CBD5E1'}},
      left:{style:'thin',color:{rgb:'CBD5E1'}},right:{style:'thin',color:{rgb:'CBD5E1'}}}};
  const sTdD={...sTdN,font:{sz:8.5,color:{rgb:_CE_DIA.replace('#','').toUpperCase()}}};
  const sTd=sTdN;
  const sTot={...sTd,font:{bold:true,sz:9,color:{rgb:'C00000'}},fill:{patternType:'solid',fgColor:{rgb:'FDE9D9'}}};
  const addr=(r,c)=>XLSX.utils.encode_cell({r,c});

  const wb=XLSX.utils.book_new();

  // — Hoja Resumen —
  const resHdr=['Código','Equipo','Tipo','Subtipo','Modelo','Partes','Días Rep.','Días Oper.',
    'Horas Efect.','Horas Standby','Total Horas','Hmin Mes','Disp. Meca %','Conclusión'];
  const resRows=eqs.map(eq=>{
    const D=_ceDatos(eq,per);
    return[eq.codigo||'',eq.nombre||'',eq.tipo||'',eq.sub||'',_ceEsHora(eq)?'HORAS':'DÍAS',
      D.filas.length,D.diasReportados,D.diasOperativos,
      +D.totalEfec.toFixed(2),+D.totalStandby.toFixed(2),+D.totalHoras.toFixed(2),
      +D.hminMes.toFixed(2),+D.dispMec.toFixed(2),D.conclusion];
  });
  const wsR=XLSX.utils.aoa_to_sheet([
    [`CORTE DE EQUIPOS · Período ${_ceDmy(per.desde)} al ${_ceDmy(per.hasta)} (${per.dias} días)`],
    [],resHdr,...resRows]);
  wsR['!cols']=[{wch:14},{wch:26},{wch:16},{wch:16},{wch:9},{wch:8},{wch:10},{wch:10},
    {wch:13},{wch:14},{wch:12},{wch:11},{wch:13},{wch:46}];
  if(wsR[addr(0,0)])wsR[addr(0,0)].s=sTit;
  resHdr.forEach((_,c)=>{if(wsR[addr(2,c)])wsR[addr(2,c)].s=sTh;});
  resRows.forEach((_,r)=>resHdr.forEach((__,c)=>{const cl=wsR[addr(3+r,c)];if(cl)cl.s=sTd;}));
  XLSX.utils.book_append_sheet(wb,wsR,'Resumen');

  // — Una hoja por equipo —
  // "Horas Trabajadas" y "Horas Mínimas" se escriben como FÓRMULA, no como
  // valor, para que la hoja se pueda auditar y recalcular sola:
  //     Horas Trabajadas = Hora Final − Hora Inicial
  //     Horas Mínimas    = SUP / NO / SI contra el mínimo diario de la celda E5
  // Para que esa segunda fórmula sea verificable se agregan dos columnas
  // auxiliares al final (Inop. y Standby) con las banderas que usa el sistema.
  // Los totales y el desglose por área también quedan con SUM / SUMIFS.
  const usados={};
  const CL=c=>XLSX.utils.encode_col(c);
  eqs.forEach((eq,idx)=>{
    const D=_ceDatos(eq,per);
    const esHora=_ceEsHora(eq);
    const proyecto=eq.proyecto||((DB.proyectos||[])[0]||{}).nombre||'OPERACIONES ECOSERMO';
    const titulo=esHora?`VALORIZACIÓN - ${eq.tipo||''} - ${eq.codigo||''}`
      :`${String(idx+1).padStart(2,'0')}.- ${(eq.sub||eq.tipo||'').toUpperCase()} ${eq.codigo||''}`;

    const aoa=[[titulo],
      ['PROYECTO:',proyecto,'','Fecha:',_ceDmy(today())],
      ['CLIENTE:',_CE_CLIENTE,'','Periodo:',_ceDmy(per.desde),_ceDmy(per.hasta)],
      ['PROVEEDOR:',_CE_PROVEEDOR],
      ['ÁREA:',_CE_AREA_DEF,'','Hrs Mín./día:',+D.hminDia.toFixed(4)],   // ← E5: la referencia de las fórmulas
      [`ALQUILER DE ${(eq.sub||eq.tipo||'EQUIPO')} ${eq.codigo||''}`.toUpperCase()],
      []];
    const rHdr=aoa.length;
    const hdr=esHora
      ?['Fecha','Turno','Tipo de Equipo','Código','Hora Inicial','Hora Final','Horas Trabajadas',
        'Horas Mínimas','Área del Trabajo','Descripción del Trabajo','Observaciones / Comentarios','Inop.']
      :['Fecha','Turno','Tipo de Equipo','Código / Placa','Condición de Trabajo','Área del Trabajo',
        'Descripción del Trabajo','Observaciones / Comentarios'];
    aoa.push(hdr);
    D.filas.forEach(f=>{
      aoa.push(esHora
        ?[_ceDmy(f.fecha),f.turno,f.tipo,eq.codigo||'',+f.hrIni.toFixed(2),+f.hrFin.toFixed(2),
          +f.horas.toFixed(2),f.hmin,f.areaLbl,_ceLinea(f.desc),_ceLinea(f.obs),f.hayInop?1:0]
        :[_ceDmy(f.fecha),f.turno,f.tipo,eq.placa||eq.codigo||'',f.cond+(f.dt?' D.T.':''),f.areaLbl,_ceLinea(f.desc),_ceLinea(f.obs)]);
    });
    const rFin=aoa.length;                       // fila del TOTAL (0-based)
    const xr0=rHdr+2;                            // 1.ª fila de datos, numeración Excel
    const xrN=xr0+D.filas.length-1;              // última fila de datos
    if(esHora&&D.filas.length)aoa.push(['','','','','','TOTAL',+D.totalHoras.toFixed(2)]);

    aoa.push([]);
    let rCuadro=-1,rEfec=-1,rStandby=-1,rTot=-1;
    if(esHora){
      aoa.push(['Dias','Hmin.','Hmin Mes','Disp. Meca','Conclusión']);
      rCuadro=aoa.length;
      aoa.push([per.dias,+D.hminDia.toFixed(4),+D.hminMes.toFixed(2),+(D.dispMec/100).toFixed(4),D.conclusion]);
      aoa.push([]);
      aoa.push(['Descripción',...D.areas,'Total']);
      rEfec=aoa.length;
      aoa.push(['HORAS EFECT.',...D.areas.map(a=>+(D.efec[a]||0).toFixed(2)),+D.totalEfec.toFixed(2)]);
      rStandby=aoa.length;
      aoa.push(['HORAS STANDBY A PAGAR',...D.areas.map(a=>+(D.standby[a]||0).toFixed(2)),+D.totalStandby.toFixed(2)]);
      rTot=aoa.length;
      aoa.push(['Total =',...D.areas.map(()=>''),+(D.totalEfec+D.totalStandby).toFixed(2)]);
    }else{
      aoa.push(['Descripcion','Dias','Inoperatividad','Incidencia']);
      D.resumenCond.forEach(r=>aoa.push([r.desc,r.dias,+r.inop.toFixed(2),r.inc]));
    }

    const ws=XLSX.utils.aoa_to_sheet(aoa);
    ws['!cols']=esHora
      ?[{wch:12},{wch:8},{wch:16},{wch:16},{wch:12},{wch:12},{wch:14},{wch:13},{wch:14},{wch:46},{wch:46},{wch:7}]
      :[{wch:12},{wch:8},{wch:16},{wch:16},{wch:24},{wch:14},{wch:30},{wch:60}];

    // ── Fórmulas ──
    if(esHora&&D.filas.length){
      const nA=D.areas.length,cT=CL(nA+1);
      D.filas.forEach((f,i)=>{
        const R=xr0+i;                                   // fila en numeración Excel
        const cHr=ws[addr(rHdr+1+i,6)];
        if(cHr)cHr.f=`F${R}-E${R}`;                      // Horas Trabajadas
        const cMi=ws[addr(rHdr+1+i,7)];
        if(cMi&&D.hminDia>0)cMi.f=`IF(G${R}>=$E$5,"SUP",IF(L${R}=1,"NO","SI"))`;
      });
      const cTot=ws[addr(rFin,6)];
      if(cTot)cTot.f=`SUM(G${xr0}:G${xrN})`;
      const cHmD=ws[addr(rCuadro,1)];
      if(cHmD)cHmD.f='E5';
      const xrC=rCuadro+1,xrE=rEfec+1;
      D.areas.forEach((a,i)=>{
        const col=1+i,lit=String(a).replace(/"/g,'""');
        const ce=ws[addr(rEfec,col)];
        if(ce)ce.f=`SUMIF($I$${xr0}:$I$${xrN},"${lit}",$G$${xr0}:$G$${xrN})`;
        // Standby a pagar = lo que falta para el mínimo del mes, y solo si la
        // conclusión dice que corresponde reconocerlo (disponibilidad ≥ mínima)
        const cs=ws[addr(rStandby,col)];
        if(cs&&a===D.areaPrinc)cs.f=`IF($D$${xrC}>=${_CE_DISP_MIN/100},MAX(0,$C$${xrC}-${cT}${xrE}),0)`;
      });
      const ceT=ws[addr(rEfec,nA+1)];
      if(ceT)ceT.f=`SUM(B${rEfec+1}:${CL(nA)}${rEfec+1})`;
      const csT=ws[addr(rStandby,nA+1)];
      if(csT)csT.f=`SUM(B${rStandby+1}:${CL(nA)}${rStandby+1})`;
      const ctT=ws[addr(rTot,nA+1)];
      if(ctT)ctT.f=`${cT}${rEfec+1}+${cT}${rStandby+1}`;
    }

    // ── Formato ──
    if(ws[addr(0,0)])ws[addr(0,0)].s=sTit;
    for(let r=1;r<=4;r++){const cl=ws[addr(r,0)];if(cl)cl.s=sLbl;}
    if(ws[addr(4,3)])ws[addr(4,3)].s=sLbl;
    const band=ws[addr(5,0)];
    if(band)band.s={fill:{patternType:'solid',fgColor:{rgb:AZ}},font:{bold:true,sz:9,color:{rgb:'FFFFFF'}},alignment:{horizontal:'center'}};
    hdr.forEach((_,c)=>{if(ws[addr(rHdr,c)])ws[addr(rHdr,c)].s=sTh;});
    for(let r=rHdr+1;r<rFin;r++){
      const fl=D.filas[r-rHdr-1];
      const est=(fl&&String(fl.turno||'').toUpperCase()==='NOCHE')?sTdN:sTdD;
      hdr.forEach((__,c)=>{const cl=ws[addr(r,c)];if(cl)cl.s=est;});
    }
    if(esHora&&D.filas.length){[5,6].forEach(c=>{const cl=ws[addr(rFin,c)];if(cl)cl.s=sTot;});}

    // Excel no admite / \ ? * [ ] : en el nombre de la hoja
    let nom=String(eq.codigo||('Equipo'+(idx+1))).replace(/[\/\\?*\[\]:]/g,'-').substring(0,28);
    if(usados[nom]){usados[nom]++;nom=`${nom} (${usados[nom]})`;}else usados[nom]=1;
    XLSX.utils.book_append_sheet(wb,ws,nom.substring(0,31));
  });

  XLSX.writeFile(wb,_ceNombreArchivo(eqs[0],per)+'.xlsx');
  toast(`✓ ${eqs.length} equipo${eqs.length!==1?'s':''} exportado${eqs.length!==1?'s':''}`);
}

// ── Pantalla ───────────────────────────────────────────────────────────────
function rCorteEquipos(){
  const pg=document.getElementById('page-corteEquipos');if(!pg)return;
  const per=_cePeriodo();
  const tipos=_ceMapa(per);

  // Si la selección ya no existe en este período, limpiarla
  if(_ceTipo&&!tipos[_ceTipo]){_ceTipo=null;_ceSub=null;_ceEqId=null;}
  if(_ceSub&&(!_ceTipo||!tipos[_ceTipo].subs[_ceSub])){_ceSub=null;_ceEqId=null;}
  if(_ceEqId&&_ceSub&&!tipos[_ceTipo].subs[_ceSub].eqs[_ceEqId])_ceEqId=null;

  const eqs=_ceEquipos(per);
  const tot=eqs.reduce((a,eq)=>{
    const D=_ceDatos(eq,per);
    a.horas+=D.totalEfec;a.standby+=D.totalStandby;a.inop+=D.horasInop;
    a.dias+=D.diasOperativos;a.disp.push(D.dispMec);
    return a;
  },{horas:0,standby:0,inop:0,dias:0,disp:[]});
  const dispProm=tot.disp.length?tot.disp.reduce((s,v)=>s+v,0)/tot.disp.length:100;

  const kpis=[
    {l:'Horas Efectivas',v:_ceN2(tot.horas)+' h',c:'#f97316'},
    {l:'Días Operativos',v:tot.dias,c:'#10b981'},
    {l:'Equipos en el Corte',v:eqs.length,c:'#06b6d4'},
    {l:'Disp. Mecánica Prom.',v:dispProm.toFixed(2)+'%',c:dispProm>=_CE_DISP_MIN?'#10b981':'#ef4444'},
  ];

  // — Chips tipo → subtipo → equipo (mismo modelo que el dashboard de Combustible) —
  const fmtH=h=>Number(h||0).toFixed(0)+' h';
  const tiposSorted=Object.entries(tipos).sort((a,b)=>b[1].h-a[1].h);
  const chipTodos=`<button onclick="_ceLimpiar()" style="display:inline-flex;align-items:center;padding:.35rem .8rem;border-radius:20px;cursor:pointer;font-size:.76rem;font-weight:700;border:1.5px solid ${!_ceTipo?'#06b6d4':'var(--border)'};background:${!_ceTipo?'rgba(6,182,212,.15)':'var(--panel2)'};color:${!_ceTipo?'#06b6d4':'var(--muted2)'}">Todos</button>`;
  const chipTipos=tiposSorted.map(([t,d])=>{
    const act=_ceTipo===t;
    return`<button onclick="_ceSelTipo('${t.replace(/'/g,"\\'")}')" style="display:inline-flex;align-items:center;gap:.4rem;padding:.35rem .8rem;border-radius:20px;cursor:pointer;font-size:.76rem;font-weight:700;border:1.5px solid ${act?'#f97316':'var(--border)'};background:${act?'rgba(249,115,22,.18)':'var(--panel2)'};color:${act?'#f97316':'var(--text)'};transition:all .15s">
      ${t} <span style="font-family:monospace;font-size:.68rem;font-weight:900;color:${act?'#f97316':'var(--muted2)'}">${fmtH(d.h)}</span>${act?' ✕':''}
    </button>`;
  }).join('');

  let chipSubs='';
  if(_ceTipo&&tipos[_ceTipo]){
    const subsT=Object.entries(tipos[_ceTipo].subs).sort((a,b)=>b[1].h-a[1].h);
    chipSubs=`<div style="display:flex;gap:.35rem;flex-wrap:wrap;margin-top:.5rem;padding:.55rem .7rem;background:rgba(139,92,246,.05);border:1px dashed rgba(139,92,246,.4);border-radius:9px">
      <span style="font-size:.64rem;color:var(--muted2);text-transform:uppercase;letter-spacing:.07em;font-weight:700;align-self:center">↳ Subtipo:</span>
      ${subsT.map(([s,d])=>{
        const act=_ceSub===s;
        return`<button onclick="_ceSelSub('${s.replace(/'/g,"\\'")}')" style="display:inline-flex;align-items:center;gap:.35rem;padding:.3rem .7rem;border-radius:18px;cursor:pointer;font-size:.73rem;font-weight:700;border:1.5px solid ${act?'#8b5cf6':'var(--border)'};background:${act?'rgba(139,92,246,.2)':'var(--panel2)'};color:${act?'#a78bfa':'var(--text)'};transition:all .15s">
          ${s.toUpperCase()} <span style="font-family:monospace;font-size:.64rem;font-weight:900;color:${act?'#a78bfa':'var(--muted2)'}">${fmtH(d.h)}</span>${act?' ✕':''}
        </button>`;
      }).join('')}
    </div>`;
  }

  let chipEqs='';
  if(_ceTipo&&_ceSub&&tipos[_ceTipo]&&tipos[_ceTipo].subs[_ceSub]){
    const lista=Object.values(tipos[_ceTipo].subs[_ceSub].eqs).sort((a,b)=>b.h-a.h);
    chipEqs=`<div style="display:flex;gap:.35rem;flex-wrap:wrap;margin-top:.5rem;padding:.55rem .7rem;background:rgba(249,115,22,.05);border:1px dashed rgba(249,115,22,.35);border-radius:9px">
      <span style="font-size:.64rem;color:var(--muted2);text-transform:uppercase;letter-spacing:.07em;font-weight:700;align-self:center">↳ ${_ceEsc(_ceSub)}:</span>
      ${lista.map(({eq,h})=>{
        const act=+_ceEqId===+eq.id;
        return`<button onclick="_ceSelEq(${eq.id})" style="display:inline-flex;align-items:center;gap:.35rem;padding:.25rem .65rem;border-radius:16px;cursor:pointer;font-size:.7rem;font-weight:700;font-family:monospace;border:1.5px solid ${act?'#f97316':'var(--border)'};background:${act?'#f97316':'var(--panel2)'};color:${act?'#fff':'var(--text)'};transition:all .15s">
          ${_ceEsc(eq.codigo||'')} <span style="font-size:.62rem;font-weight:900;color:${act?'rgba(255,255,255,.75)':'var(--muted2)'}">${h.toFixed(0)}h</span>${act?' ✕':''}
        </button>`;
      }).join('')}
    </div>`;
  }

  const selEq=_ceEqId?(DB.equipos||[]).find(e=>+e.id===+_ceEqId):null;
  const titulo=selEq?`${selEq.codigo} — ${selEq.nombre||''}`
    :_ceSub?`${_ceTipo} · ${_ceSub}`
    :_ceTipo||'todos los equipos';

  pg.innerHTML=`
    <div class="ph"><div class="ph-title" style="color:#059669">✂️ Corte de Equipos</div><div class="ph-sub">Valorización de partes diarios por período — formato de horas para línea amarilla y blanca, y de días para coasters, camionetas y cisternas</div></div>
    <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:.6rem;margin-bottom:1rem">
      <div style="font-size:.78rem;color:var(--muted2)">Período 21→20 · <span class="mono">${per.desde}</span> al <span class="mono">${per.hasta}</span> · ${per.dias} días</div>
      <div style="display:flex;align-items:center;background:var(--panel2);border:1px solid var(--border);border-radius:8px;overflow:hidden">
        <button onclick="_ceNav(-1)" style="background:none;border:none;border-right:1px solid var(--border);color:var(--text);cursor:pointer;font-size:1.1rem;padding:.35rem .7rem;line-height:1">‹</button>
        <span style="font-weight:800;font-size:.88rem;color:var(--text);min-width:130px;text-align:center;padding:0 .5rem">${per.label}</span>
        <button onclick="_ceNav(1)" style="background:none;border:none;border-left:1px solid var(--border);color:var(--text);cursor:pointer;font-size:1.1rem;padding:.35rem .7rem;line-height:1">›</button>
      </div>
    </div>
    <div class="kpi-row">${kpis.map(k=>`<div class="kpi" style="--kc:${k.c}"><div class="kpi-lbl">${k.l}</div><div class="kpi-val" style="font-size:${String(k.v).length>10?'1.1rem':'1.6rem'}">${k.v}</div></div>`).join('')}</div>
    <div style="margin-bottom:1rem">
      <div style="display:flex;gap:.35rem;flex-wrap:wrap;align-items:center">
        <span style="font-size:.64rem;color:var(--muted2);text-transform:uppercase;letter-spacing:.07em;font-weight:700">Tipo de equipo:</span>
        ${chipTodos}${chipTipos}
      </div>
      ${chipSubs}
      ${chipEqs}
    </div>
    <div style="display:flex;align-items:center;gap:.5rem;flex-wrap:wrap;margin-bottom:.9rem;padding:.5rem .7rem;background:var(--panel2);border:1px solid var(--border);border-radius:8px">
      <span style="font-size:.78rem;color:var(--muted2)">${_ceEqId?'Corte de <b style="color:#059669">'+_ceEsc(titulo)+'</b>':'Elija un equipo en los filtros de arriba'}</span>
      <div class="search-wrap" style="margin-left:auto"><span>🔍</span><input class="search-input" placeholder="Buscar equipo..." value="${_ceEsc(_ceQ)}" oninput="_ceQ=this.value;rCorteEquipos()"></div>
      <button onclick="_cePrint()" style="font-size:.72rem;padding:.32rem .9rem;border-radius:6px;border:none;background:#b91c1c;color:#fff;cursor:pointer;font-weight:800;white-space:nowrap">🖨 Imprimir / PDF</button>
      <button onclick="_ceExportXls()" style="font-size:.72rem;padding:.32rem .9rem;border-radius:6px;border:none;background:#166534;color:#fff;cursor:pointer;font-weight:800;white-space:nowrap">📊 Excel</button>
    </div>
    ${_ceEqId
      ?`<div style="background:#fff;border-radius:8px;padding:1rem 1.2rem;overflow-x:auto;box-shadow:0 4px 18px rgba(0,0,0,.45)">${_ceDocHtml()}</div>`
      :`<div style="text-align:center;padding:3rem 1.2rem;background:var(--panel2);border:1px dashed var(--border);border-radius:10px">
          <div style="font-size:2.2rem;line-height:1;margin-bottom:.6rem">✂️</div>
          <div style="font-size:.95rem;font-weight:800;color:var(--text)">Seleccione un equipo para ver el resumen</div>
          <div style="font-size:.78rem;color:var(--muted2);margin-top:.4rem">Tipo de equipo → subtipo → código, en los filtros de arriba</div>
        </div>`}`;
}
