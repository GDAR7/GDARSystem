// ══════════════════════════════════════════════════════════════════════════
//  COST CONTROL — MATRIZ ANUAL (R.O. por equipo, 12 períodos)
//  Cuatro líneas por equipo —Alquiler, Combustible, Venta, Margen— con los
//  doce períodos 21→20 del año en columnas.
//
//  No calcula nada por su cuenta: llama doce veces a _ccCalcEq(), el mismo
//  motor que alimenta la pestaña Equipos. Si los números de una pestaña
//  cambian, la otra cambia igual — por diseño.
//
//  Se calcula solo cuando la pestaña está abierta (_ccTab la pinta al
//  entrar). Si se pintara siempre, cada render de Cost Control costaría
//  doce veces más aunque nadie mire esta tabla.
// ══════════════════════════════════════════════════════════════════════════

const _CCA_MESES=['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const _CCA_MES3=['ENE','FEB','MAR','ABR','MAY','JUN','JUL','AGO','SET','OCT','NOV','DIC'];

// Los cuatro conceptos, en el orden y con los colores del módulo
const _CCA_CONCEPTOS=[
  {k:'alquiler', lab:'01.-Alquiler',    col:'#f59e0b'},
  {k:'comb',     lab:'02.-Combustible', col:'#f97316'},
  {k:'venta',    lab:'03.-Venta',       col:'#06b6d4'},
  {k:'margen',   lab:'04.-Margen',      col:'#10b981'}
];

let _ccaAnio=null;                       // null = todavía sin abrir; se fija al entrar
let _ccaTipo='', _ccaContratista='', _ccaBuscar='';
let _ccaCache=null;                      // {clave, grupos, meses, totales}

function _ccaFmt(v){
  const n=+v||0;
  if(Math.abs(n)<0.005) return '–';
  return n.toLocaleString('es-PE',{minimumFractionDigits:2,maximumFractionDigits:2});
}
function _ccaEsc(s){
  return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── Los doce períodos 21→20 de un año ───────────────────────────────────────
// Enero = 21-dic del año anterior al 20-ene. Es la misma convención de
// _ccPeriodo(), que ya etiqueta cada período por su mes de cierre.
// Los doce periodos de un anio. Con corte 21 el primero arranca el 21 de
// diciembre del anio anterior; con corte 1 son los meses calendario.
// El dia lo pone EMPRESA_CORTE en js/empresa.js.
function _ccaPeriodos(anio){
  return _CCA_MESES.map((lab,m)=>{
    const p=gdarPeriodoDeMes(anio,m);
    const ini=new Date(p.desde+'T12:00:00'),fin=new Date(p.hasta+'T12:00:00');
    return{desde:p.desde,hasta:p.hasta,label:lab,
           dias:Math.round((fin-ini)/86400000)+1};
  });
}

// El año que corresponde al período que está viendo la pestaña Equipos
function _ccaAnioPorDefecto(){
  const per=_ccPeriodo();
  return +String(per.hasta).slice(0,4);
}

// ── Cálculo del año ─────────────────────────────────────────────────────────
// La clave del caché incluye todo lo que cambia los importes: si el usuario
// mueve el modo de tarifa o el precio del combustible, se recalcula solo.
function _ccaClave(anio,KEY){
  return [anio,KEY,_ccSinIgv?1:0,_ccPrecioManual?1:0,_ccPrecioComb||0].join('|');
}

function _ccaCalcular(anio,KEY){
  const clave=_ccaClave(anio,KEY);
  if(_ccaCache&&_ccaCache.clave===clave) return _ccaCache;

  const periodos=_ccaPeriodos(anio);
  const eqs=new Map();                   // eqId → {eq, meses:[12], tot:{...}}
  const totMes=periodos.map(()=>({alquiler:0,comb:0,venta:0,margen:0}));

  periodos.forEach((per,i)=>{
    const R=_ccCalcEq(per,KEY);
    R.eqRows.forEach(r=>{
      const id=r.eq.id;
      let a=eqs.get(id);
      if(!a){
        a={eq:r.eq,
           meses:periodos.map(()=>({alquiler:0,comb:0,venta:0,margen:0,est:false,hay:false})),
           tot:{alquiler:0,comb:0,venta:0,margen:0},
           moneda:'SOLES', nEdp:0, nEst:0};
        eqs.set(id,a);
      }
      const m=a.meses[i];
      m.alquiler=r.costoProveedor; m.comb=r.costoComb;
      m.venta=r.costo;             m.margen=r.margen;
      m.est=!r.edp;                                    // sin EDP → alquiler estimado
      m.hay=true;
      if(r.edp){a.nEdp++; if(r.edp.moneda&&r.edp.moneda!=='SOLES')a.moneda=r.edp.moneda;}
      else if(r.costoProveedor)a.nEst++;
      a.tot.alquiler+=m.alquiler; a.tot.comb+=m.comb;
      a.tot.venta+=m.venta;       a.tot.margen+=m.margen;
      totMes[i].alquiler+=m.alquiler; totMes[i].comb+=m.comb;
      totMes[i].venta+=m.venta;       totMes[i].margen+=m.margen;
    });
  });

  // Agrupar por familia (el "EXCAVADORAS" del Excel = el subtipo del Máster)
  const grupos=new Map();
  [...eqs.values()].forEach(a=>{
    const g=String(a.eq.sub||a.eq.tipo||'Sin clasificar').toUpperCase();
    if(!grupos.has(g))grupos.set(g,{nombre:g,equipos:[],
      meses:periodos.map(()=>({alquiler:0,comb:0,venta:0,margen:0})),
      tot:{alquiler:0,comb:0,venta:0,margen:0}});
    const G=grupos.get(g);
    G.equipos.push(a);
    a.meses.forEach((m,i)=>{
      G.meses[i].alquiler+=m.alquiler; G.meses[i].comb+=m.comb;
      G.meses[i].venta+=m.venta;       G.meses[i].margen+=m.margen;
    });
    G.tot.alquiler+=a.tot.alquiler; G.tot.comb+=a.tot.comb;
    G.tot.venta+=a.tot.venta;       G.tot.margen+=a.tot.margen;
  });

  const lista=[...grupos.values()].sort((a,b)=>a.nombre.localeCompare(b.nombre));
  lista.forEach(G=>G.equipos.sort((a,b)=>
    String(a.eq.codigo||'').localeCompare(String(b.eq.codigo||''))));

  const totAnio=totMes.reduce((s,m)=>({
    alquiler:s.alquiler+m.alquiler, comb:s.comb+m.comb,
    venta:s.venta+m.venta,          margen:s.margen+m.margen}),
    {alquiler:0,comb:0,venta:0,margen:0});

  _ccaCache={clave,anio,KEY,periodos,grupos:lista,totMes,totAnio,
             nEquipos:eqs.size};
  return _ccaCache;
}

// ── Filtros ─────────────────────────────────────────────────────────────────
function _ccaFiltrar(D){
  const q=_ccaBuscar.trim().toLowerCase();
  return D.grupos.map(G=>{
    const equipos=G.equipos.filter(a=>{
      if(_ccaTipo&&G.nombre!==_ccaTipo)return false;
      if(_ccaContratista&&String(a.eq.proveedor||'—')!==_ccaContratista)return false;
      if(q){
        const txt=`${a.eq.codigo||''} ${a.eq.nombre||''} ${a.eq.proveedor||''} ${G.nombre}`.toLowerCase();
        if(!txt.includes(q))return false;
      }
      return true;
    });
    if(!equipos.length)return null;
    // Los totales del grupo se recalculan sobre lo que quedó visible, para que
    // la fila de familia siempre cuadre con lo que se está viendo.
    const meses=D.periodos.map(()=>({alquiler:0,comb:0,venta:0,margen:0}));
    const tot={alquiler:0,comb:0,venta:0,margen:0};
    equipos.forEach(a=>{
      a.meses.forEach((m,i)=>{
        meses[i].alquiler+=m.alquiler; meses[i].comb+=m.comb;
        meses[i].venta+=m.venta;       meses[i].margen+=m.margen;
      });
      tot.alquiler+=a.tot.alquiler; tot.comb+=a.tot.comb;
      tot.venta+=a.tot.venta;       tot.margen+=a.tot.margen;
    });
    return{...G,equipos,meses,tot};
  }).filter(Boolean);
}

function _ccaSet(campo,val){
  if(campo==='tipo')_ccaTipo=val;
  else if(campo==='contratista')_ccaContratista=val;
  else if(campo==='buscar')_ccaBuscar=val;
  _ccaPintar(campo==='buscar');
}
function _ccaNavAnio(d){_ccaAnio=(_ccaAnio||_ccaAnioPorDefecto())+d;_ccaPintar();}
function _ccaLimpiar(){_ccaTipo='';_ccaContratista='';_ccaBuscar='';_ccaPintar();}

// ── Pintado ─────────────────────────────────────────────────────────────────
// mantenerFoco: al escribir en el buscador se vuelve a pintar la tabla, y sin
// esto el cursor saltaría fuera del input en cada tecla.
function _ccaPintar(mantenerFoco){
  const cont=document.getElementById('ccPanel-anual');
  if(!cont)return;
  const sel=mantenerFoco?document.getElementById('ccaBuscar'):null;
  const pos=sel?sel.selectionStart:null;
  cont.innerHTML=_ccaPanel();
  if(mantenerFoco){
    const n=document.getElementById('ccaBuscar');
    if(n){n.focus();if(pos!=null)try{n.setSelectionRange(pos,pos);}catch(e){}}
  }
}

function _ccaPanel(){
  if(typeof _ccCalcEq!=='function')
    return`<div style="padding:2rem;text-align:center;color:var(--muted2)">El motor de cálculo no está disponible.</div>`;
  if(_ccaAnio==null)_ccaAnio=_ccaAnioPorDefecto();

  const KEY=_ccTarifaModo==='seca'?'seca':'full';
  const D=_ccaCalcular(_ccaAnio,KEY);
  const grupos=_ccaFiltrar(D);

  // Opciones de los combos: siempre sobre el año completo, no sobre lo filtrado,
  // para que no desaparezcan las opciones al elegir una.
  const tipos=D.grupos.map(G=>G.nombre);
  const contratistas=[...new Set(D.grupos.flatMap(G=>
    G.equipos.map(a=>String(a.eq.proveedor||'—'))))].sort();

  const TH=`background:var(--panel2);color:var(--muted2);font-size:.63rem;font-weight:700;text-transform:uppercase;letter-spacing:.06em;padding:.4rem .5rem;white-space:nowrap;border-bottom:1px solid var(--border)`;
  const TDn=`padding:.28rem .5rem;font-family:monospace;font-size:.72rem;text-align:right;white-space:nowrap;border-bottom:1px solid var(--border)`;
  // La primera columna se queda fija: con doce meses la tabla se desplaza y sin
  // esto se pierde de vista de qué equipo es cada fila.
  const STICKY=`position:sticky;left:0;z-index:2;background:var(--panel)`;

  let filas='';
  grupos.forEach(G=>{
    // Cabecera de familia: el margen del grupo mes a mes (igual que el Excel)
    filas+=`<tr style="background:rgba(16,185,129,.07)">
      <td style="${TDn};${STICKY};background:#0f2a22;text-align:left;font-weight:800;color:#10b981;font-size:.72rem;letter-spacing:.04em">${_ccaEsc(G.nombre)}
        <span style="font-weight:600;color:var(--muted2);font-size:.62rem;letter-spacing:0"> · ${G.equipos.length} eq. · margen</span></td>
      ${G.meses.map(m=>`<td style="${TDn};font-weight:800;color:${m.margen<0?'#ef4444':'#10b981'}">${_ccaFmt(m.margen)}</td>`).join('')}
      <td style="${TDn};font-weight:900;color:${G.tot.margen<0?'#ef4444':'#10b981'};background:rgba(16,185,129,.1)">${_ccaFmt(G.tot.margen)}</td>
    </tr>`;

    G.equipos.forEach(a=>{
      const prov=_ccaEsc(a.eq.proveedor||'—');
      const nom=_ccaEsc(`${a.eq.codigo||''} – ${a.eq.nombre||''}`.replace(/^ – /,''));
      const mon=a.moneda==='SOLES'?'S/':_ccaEsc(a.moneda);
      filas+=`<tr>
        <td colspan="14" style="${STICKY};padding:.45rem .5rem .15rem;border-bottom:none;border-top:1px solid var(--border)">
          <span style="font-weight:800;font-size:.76rem;color:#60a5fa">${nom}</span>
          <span style="color:var(--muted2);font-size:.68rem"> · ${prov}</span>
          <span style="margin-left:.4rem;font-size:.6rem;font-weight:700;padding:1px 6px;border-radius:4px;background:${a.moneda==='SOLES'?'rgba(100,116,139,.2)':'rgba(180,83,9,.25)'};color:${a.moneda==='SOLES'?'var(--muted2)':'#f59e0b'}">${mon}</span>
          ${a.nEst?`<span title="${a.nEst} mes(es) con el alquiler estimado por horas × tarifa del Máster, sin EDP emitido" style="margin-left:.3rem;font-size:.6rem;font-weight:700;padding:1px 6px;border-radius:4px;background:rgba(249,115,22,.18);color:#f97316">${a.nEst} estimado${a.nEst===1?'':'s'}</span>`:''}
        </td>
      </tr>`;
      _CCA_CONCEPTOS.forEach(C=>{
        filas+=`<tr onmouseover="this.style.background='var(--hover)'" onmouseout="this.style.background=''">
          <td style="${TDn};${STICKY};text-align:left;color:${C.col};font-weight:700;font-family:inherit;font-size:.7rem;padding-left:1.4rem">${C.lab}</td>
          ${a.meses.map(m=>{
            const v=m[C.k];
            const neg=v<0;
            // Solo el alquiler puede ser estimado; los otros tres no dependen del EDP
            const est=C.k==='alquiler'&&m.hay&&m.est&&Math.abs(v)>=0.005;
            return`<td style="${TDn};color:${neg?'#ef4444':(Math.abs(v)<0.005?'var(--muted)':C.col)}${est?';font-style:italic;border-bottom:1px dotted '+C.col:''}"${est?' title="Estimado: horas × tarifa del Máster (aún sin EDP emitido)"':''}>${_ccaFmt(v)}</td>`;
          }).join('')}
          <td style="${TDn};font-weight:800;background:var(--panel2);color:${a.tot[C.k]<0?'#ef4444':C.col}">${_ccaFmt(a.tot[C.k])}</td>
        </tr>`;
      });
    });
  });

  if(!filas) filas=`<tr><td colspan="14" style="text-align:center;padding:2.5rem;color:var(--muted2);font-size:.85rem">
    Sin movimientos en ${_ccaAnio}${(_ccaTipo||_ccaContratista||_ccaBuscar)?' con los filtros aplicados':''}</td></tr>`;

  // Totales generales, sobre lo visible
  const tMes=D.periodos.map((_,i)=>grupos.reduce((s,G)=>s+G.meses[i].margen,0));
  const tAn=grupos.reduce((s,G)=>s+G.tot.margen,0);

  const combo=(id,campo,val,opts,ph)=>`<select id="${id}" onchange="_ccaSet('${campo}',this.value)"
    style="background:var(--panel2);border:1px solid var(--border);color:var(--text);border-radius:7px;padding:.3rem .55rem;font-size:.74rem;max-width:190px">
    <option value="">${ph}</option>
    ${opts.map(o=>`<option value="${_ccaEsc(o)}"${o===val?' selected':''}>${_ccaEsc(o)}</option>`).join('')}
  </select>`;

  const nFiltros=(_ccaTipo?1:0)+(_ccaContratista?1:0)+(_ccaBuscar.trim()?1:0);

  return`
  <!-- Barra de control -->
  <div style="display:flex;align-items:center;gap:.5rem;flex-wrap:wrap;margin-bottom:.8rem">
    <div style="display:flex;align-items:center;background:var(--panel2);border:1px solid var(--border);border-radius:8px;overflow:hidden">
      <button onclick="_ccaNavAnio(-1)" title="Año anterior" style="background:none;border:none;border-right:1px solid var(--border);color:var(--text);cursor:pointer;font-size:1.1rem;padding:.3rem .7rem;line-height:1">‹</button>
      <span style="font-weight:800;font-size:.9rem;color:var(--text);min-width:64px;text-align:center;padding:0 .4rem">${_ccaAnio}</span>
      <button onclick="_ccaNavAnio(1)" title="Año siguiente" style="background:none;border:none;border-left:1px solid var(--border);color:var(--text);cursor:pointer;font-size:1.1rem;padding:.3rem .7rem;line-height:1">›</button>
    </div>
    ${combo('ccaTipo','tipo',_ccaTipo,tipos,'— Todos los tipos —')}
    ${combo('ccaContratista','contratista',_ccaContratista,contratistas,'— Todos los contratistas —')}
    <input id="ccaBuscar" value="${_ccaEsc(_ccaBuscar)}" oninput="_ccaSet('buscar',this.value)" placeholder="🔍 Buscar equipo…"
      style="background:var(--panel2);border:1px solid var(--border);color:var(--text);border-radius:7px;padding:.3rem .6rem;font-size:.74rem;width:180px">
    ${nFiltros?`<button onclick="_ccaLimpiar()" style="background:transparent;border:1px solid var(--border);color:var(--muted2);border-radius:7px;padding:.3rem .7rem;font-size:.74rem;cursor:pointer">✕ Limpiar (${nFiltros})</button>`:''}
    <div style="margin-left:auto;display:flex;align-items:center;gap:.5rem">
      <span style="font-size:.68rem;color:var(--muted2)">${grupos.reduce((s,G)=>s+G.equipos.length,0)} de ${D.nEquipos} equipo(s)</span>
      <button onclick="_ccaExcel()" style="background:rgba(16,185,129,.15);border:1px solid rgba(16,185,129,.5);color:#10b981;border-radius:7px;padding:.32rem .8rem;font-size:.76rem;font-weight:700;cursor:pointer">⬇ Excel</button>
    </div>
  </div>

  <!-- Leyenda -->
  <div style="display:flex;gap:1rem;flex-wrap:wrap;margin-bottom:.6rem;font-size:.67rem;color:var(--muted2)">
    ${_CCA_CONCEPTOS.map(C=>`<span style="display:flex;align-items:center;gap:.3rem"><span style="width:9px;height:9px;background:${C.col};border-radius:2px"></span>${C.lab}</span>`).join('')}
    <span style="display:flex;align-items:center;gap:.3rem"><em style="border-bottom:1px dotted #f59e0b;font-family:monospace">0.00</em> alquiler estimado (sin EDP)</span>
    <span>Períodos 21→20 · ${_ccTarifaModo==='seca'?'Máq. Seca':'Tarifa Full'}${_ccSinIgv?' · comb. sin IGV':''}</span>
  </div>

  <!-- Matriz -->
  <div style="overflow-x:auto;border:1px solid var(--border);border-radius:10px">
    <table style="width:100%;border-collapse:collapse;min-width:1180px">
      <thead><tr>
        <th style="${TH};${STICKY};background:var(--panel2);text-align:left;min-width:210px">Equipo · Concepto</th>
        ${_CCA_MES3.map(m=>`<th style="${TH};text-align:right">${m}</th>`).join('')}
        <th style="${TH};text-align:right;background:var(--panel)">Total ${_ccaAnio}</th>
      </tr></thead>
      <tbody>${filas}</tbody>
      <tfoot><tr style="background:var(--panel2);border-top:2px solid var(--border)">
        <td style="${TDn};${STICKY};background:var(--panel2);text-align:left;font-weight:800;font-family:inherit;font-size:.72rem;color:var(--text)">MARGEN TOTAL</td>
        ${tMes.map(v=>`<td style="${TDn};font-weight:800;color:${v<0?'#ef4444':'#10b981'}">${_ccaFmt(v)}</td>`).join('')}
        <td style="${TDn};font-weight:900;font-size:.78rem;color:${tAn<0?'#ef4444':'#10b981'}">${_ccaFmt(tAn)}</td>
      </tr></tfoot>
    </table>
  </div>`;
}

// ── Exportar ────────────────────────────────────────────────────────────────
// Formato plano: cada fila repite tipo, contratista y equipo para que en Excel
// se pueda filtrar y armar una tabla dinámica sin tocar nada.
function _ccaExcel(){
  if(typeof XLSX==='undefined'){toast('Librería de Excel no disponible',true);return;}
  if(_ccaAnio==null)_ccaAnio=_ccaAnioPorDefecto();
  const KEY=_ccTarifaModo==='seca'?'seca':'full';
  const D=_ccaCalcular(_ccaAnio,KEY);
  const grupos=_ccaFiltrar(D);
  if(!grupos.length){toast('No hay datos para exportar',true);return;}

  const BOR={top:{style:'thin',color:{rgb:'D0D7E2'}},bottom:{style:'thin',color:{rgb:'D0D7E2'}},
             left:{style:'thin',color:{rgb:'D0D7E2'}},right:{style:'thin',color:{rgb:'D0D7E2'}}};
  const S=(v,o)=>({v:v==null?'':v,t:typeof v==='number'?'n':'s',s:Object.assign({
    font:{sz:9,bold:!!(o&&o.b),italic:!!(o&&o.it),color:{rgb:(o&&o.col)||'0F172A'}},
    fill:{fgColor:{rgb:(o&&o.bg)||'FFFFFF'}},
    alignment:{horizontal:(o&&o.al)||'left',vertical:'center'},border:BOR},
    (o&&o.numFmt)?{numFmt:o.numFmt}:{})});

  const HDR=['TIPO DE EQUIPO','CONTRATISTA','EQUIPO CODIGO','EQUIPO','CONCEPTO','MONEDA',
             ..._CCA_MESES.map(m=>m.toUpperCase()),'TOTAL '+_ccaAnio];
  const NC=HDR.length;
  const XL_COL={'01.-Alquiler':'B45309','02.-Combustible':'C2410C',
                '03.-Venta':'0E7490','04.-Margen':'047857'};

  const aoa=[
    [S('COST CONTROL — MATRIZ ANUAL POR EQUIPO',{b:1,bg:'1E3A5F',col:'FFFFFF',al:'center'}),
      ...Array(NC-1).fill(S('',{bg:'1E3A5F'}))],
    [S(`Año ${_ccaAnio} · períodos 21→20 · ${_ccTarifaModo==='seca'?'Máq. Seca':'Tarifa Full'}`
       +`${_ccSinIgv?' · combustible sin IGV':''}${_ccPrecioManual?' · precio de combustible manual':''}`
       +` · ${grupos.reduce((s,G)=>s+G.equipos.length,0)} equipo(s)`,
      {bg:'EEF2F8',col:'475569',al:'center'}),...Array(NC-1).fill(S('',{bg:'EEF2F8'}))],
    HDR.map(h=>S(h,{b:1,bg:'334155',col:'FFFFFF',al:'center'}))
  ];

  grupos.forEach(G=>{
    G.equipos.forEach(a=>{
      const mon=a.moneda==='SOLES'?'S/':a.moneda;
      _CCA_CONCEPTOS.forEach(C=>{
        // Un mes con alquiler estimado sale en cursiva, igual que en pantalla
        const cel=a.meses.map(m=>S(+(m[C.k]||0).toFixed(2),{
          al:'right',numFmt:'#,##0.00',col:XL_COL[C.lab],
          it:C.k==='alquiler'&&m.hay&&m.est&&Math.abs(m[C.k])>=0.005}));
        aoa.push([
          S(G.nombre),S(a.eq.proveedor||'—'),S(a.eq.codigo||'',{b:1}),S(a.eq.nombre||''),
          S(C.lab,{b:1,col:XL_COL[C.lab]}),S(mon,{al:'center'}),
          ...cel,
          S(+(a.tot[C.k]||0).toFixed(2),{al:'right',numFmt:'#,##0.00',b:1,col:XL_COL[C.lab]})
        ]);
      });
    });
  });

  // Total general por mes (margen), al pie
  const tMes=D.periodos.map((_,i)=>grupos.reduce((s,G)=>s+G.meses[i].margen,0));
  aoa.push([S('MARGEN TOTAL',{b:1,bg:'EEF2F8'}),...Array(5).fill(S('',{bg:'EEF2F8'})),
    ...tMes.map(v=>S(+v.toFixed(2),{b:1,bg:'EEF2F8',al:'right',numFmt:'#,##0.00',col:'047857'})),
    S(+tMes.reduce((s,v)=>s+v,0).toFixed(2),{b:1,bg:'EEF2F8',al:'right',numFmt:'#,##0.00',col:'047857'})]);

  const ws=XLSX.utils.aoa_to_sheet(aoa);
  ws['!merges']=[{s:{r:0,c:0},e:{r:0,c:NC-1}},{s:{r:1,c:0},e:{r:1,c:NC-1}}];
  ws['!cols']=[{wch:20},{wch:22},{wch:14},{wch:26},{wch:16},{wch:8},
    ...Array(12).fill({wch:13}),{wch:15}];
  // Fila 3 = cabecera: se congela y se le pone autofiltro para poder segmentar
  ws['!freeze']={xSplit:5,ySplit:3};
  ws['!autofilter']={ref:XLSX.utils.encode_range(
    {s:{r:2,c:0},e:{r:aoa.length-2,c:NC-1}})};

  const wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,ws,'Matriz Anual');
  XLSX.writeFile(wb,`Cost_Control_Matriz_${_ccaAnio}.xlsx`);
  toast(`✓ Matriz ${_ccaAnio} exportada`);
}
