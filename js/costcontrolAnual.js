// ══════════════════════════════════════════════════════════════════════════
//  COST CONTROL — MATRIZ ANUAL (R.O. por equipo, 12 períodos)
//  Una línea por concepto y equipo, con los doce períodos 21→20 en columnas.
//  En Máq. Seca son cuatro —Alquiler, Combustible, Venta, Margen— y en Tarifa
//  Full son cinco, porque la venta se abre en máquina y combustible.
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

// Los conceptos, en el orden y con los colores del módulo.
// En Tarifa Full la venta va abierta en dos —máquina y combustible—, porque la
// diferencia entre la tarifa Full y la Seca ES lo que se cobra por el petróleo.
// En Máq. Seca esa venta no existe, así que quedan las cuatro líneas de siempre.
const _CCA_CONCEPTOS_SECA=[
  {k:'alquiler', lab:'01.-Alquiler',    col:'#f59e0b'},
  {k:'comb',     lab:'02.-Combustible', col:'#f97316'},
  {k:'venta',    lab:'03.-Venta',       col:'#06b6d4'},
  {k:'margen',   lab:'04.-Margen',      col:'#10b981'}
];
const _CCA_CONCEPTOS_FULL=[
  {k:'alquiler',  lab:'01.-Alquiler',         col:'#f59e0b'},
  {k:'comb',      lab:'02.-Combustible',      col:'#f97316'},
  {k:'ventaEq',   lab:'03.-Venta Equipo',     col:'#06b6d4'},
  {k:'ventaComb', lab:'04.-Venta Combustible',col:'#8b5cf6'},
  {k:'margen',    lab:'05.-Margen',           col:'#10b981'}
];
function _ccaConceptos(){
  return _ccTarifaModo==='full'?_CCA_CONCEPTOS_FULL:_CCA_CONCEPTOS_SECA;
}
// Todo lo que se acumula por mes, en las dos modalidades
const _CCA_CAMPOS=['alquiler','comb','venta','ventaEq','ventaComb','margen'];
const _ccaCero=()=>({alquiler:0,comb:0,venta:0,ventaEq:0,ventaComb:0,margen:0});

let _ccaAnio=null;                       // null = todavía sin abrir; se fija al entrar
let _ccaTipo='', _ccaContratista='', _ccaBuscar='';
// Tipo / Línea del Máster (Línea Amarilla, Línea Blanca…). Distinto de _ccaTipo,
// que filtra por el subtipo (EXCAVADORA, CAMIONETA…) con que se agrupa la tabla.
let _ccaLinea='';
const _CCA_LINEAS=['Línea Amarilla','Línea Blanca','Vehículo Menor','Equipos Menores'];
let _ccaCache=null;                      // {clave, grupos, meses, totales}

// ── Qué conceptos entran al margen ──────────────────────────────────────────
// Por defecto el margen es el del motor (Full: venta − alquiler − combustible ·
// Seca: venta − alquiler). El usuario puede elegir solo algunos conceptos para
// ver, por ejemplo, Venta Comb. − Combustible o Venta Equipo − Alquiler.
// Las ventas suman y los costos restan. Solo cambia el margen; los importes de
// cada concepto quedan iguales.
const _CCA_INGRESOS=['venta','ventaEq','ventaComb'];
const _CCA_MG_OPC={seca:['alquiler','comb','venta'],full:['alquiler','comb','ventaEq','ventaComb']};
const _CCA_MG_DEF={seca:['alquiler','venta'],full:['alquiler','comb','ventaEq','ventaComb']};
const _CCA_CORTO={alquiler:'Alquiler',comb:'Combustible',venta:'Venta',ventaEq:'Venta Equipo',ventaComb:'Venta Comb.'};
let _ccaMgSel=(()=>{try{const o=JSON.parse(localStorage.getItem('ccaMgSel')||'null');
  if(o&&typeof o==='object')return o;}catch(e){}return{};})();
function _ccaMgKey(){return _ccTarifaModo==='seca'?'seca':'full';}
function _ccaMgLista(){
  const k=_ccaMgKey(),s=_ccaMgSel[k];
  const l=Array.isArray(s)?_CCA_MG_OPC[k].filter(x=>s.includes(x)):[];
  return l.length?l:_CCA_MG_DEF[k];
}
function _ccaMgEsDef(){
  const l=_ccaMgLista(),d=_CCA_MG_DEF[_ccaMgKey()];
  return l.length===d.length&&d.every(x=>l.includes(x));
}
// Margen de un mes, de un total o de una familia (todos tienen los mismos campos)
function _ccaMg(o){
  if(_ccaMgEsDef())return +o.margen||0;
  return _ccaMgLista().reduce((s,k)=>s+(_CCA_INGRESOS.includes(k)?1:-1)*(+o[k]||0),0);
}
function _ccaVal(o,k){return k==='margen'?_ccaMg(o):(+o[k]||0);}
function _ccaMgTexto(){
  const l=_ccaMgLista();
  const ing=l.filter(k=>_CCA_INGRESOS.includes(k)).map(k=>_CCA_CORTO[k]);
  const cos=l.filter(k=>!_CCA_INGRESOS.includes(k)).map(k=>_CCA_CORTO[k]);
  return (ing.length?ing.join(' + '):'0')+(cos.length?' − '+cos.join(' − '):'');
}
function _ccaMgGuardar(){try{localStorage.setItem('ccaMgSel',JSON.stringify(_ccaMgSel));}catch(e){}}
function _ccaMgToggle(k){
  const key=_ccaMgKey(),l=[..._ccaMgLista()],i=l.indexOf(k);
  if(i>=0){
    if(l.length===1){toast('Deje al menos un concepto en el margen',true);return;}
    l.splice(i,1);
  }else l.push(k);
  _ccaMgSel[key]=l;_ccaMgGuardar();_ccaPintar();
}
function _ccaMgTodos(){delete _ccaMgSel[_ccaMgKey()];_ccaMgGuardar();_ccaPintar();}

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
function _ccaPeriodos(anio){
  const fmtD=x=>`${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}-${String(x.getDate()).padStart(2,'0')}`;
  return _CCA_MESES.map((lab,m)=>{
    const ini=new Date(anio,m-1,21);     // m=0 → 21 de diciembre del año anterior
    const fin=new Date(anio,m,20);
    return{desde:fmtD(ini),hasta:fmtD(fin),label:lab,
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
  return [anio,KEY,_ccSinIgv?1:0,_ccPrecioManual?1:0,_ccPrecioComb||0,
          typeof _ccpcVer!=='undefined'?_ccpcVer+(_ccpcActivo()?'b':'n'):'',
          typeof _ccProyecto!=='undefined'?_ccProyecto:''].join('|');
}

function _ccaCalcular(anio,KEY){
  const clave=_ccaClave(anio,KEY);
  if(_ccaCache&&_ccaCache.clave===clave) return _ccaCache;

  const periodos=_ccaPeriodos(anio);
  const eqs=new Map();                   // eqId → {eq, meses:[12], tot:{...}}
  const totMes=periodos.map(_ccaCero);
  const sumar=(dst,src)=>_CCA_CAMPOS.forEach(k=>{dst[k]+=src[k]||0;});

  periodos.forEach((per,i)=>{
    const R=_ccCalcEq(per,KEY);
    R.eqRows.forEach(r=>{
      const id=r.eq.id;
      let a=eqs.get(id);
      if(!a){
        a={eq:r.eq,
           meses:periodos.map(()=>Object.assign(_ccaCero(),{est:false,hay:false})),
           tot:_ccaCero(),
           moneda:'SOLES', nEdp:0, nEst:0};
        eqs.set(id,a);
      }
      const m=a.meses[i];
      m.alquiler=r.costoProveedor; m.comb=r.costoComb;
      m.venta=r.costo;             m.margen=r.margen;
      // En Máq. Seca no hay venta de combustible: ventaEq es toda la venta
      m.ventaEq=r.ventaEq!=null?r.ventaEq:r.costo;
      m.ventaComb=r.ventaComb||0;
      m.est=!r.edp;                                    // sin EDP → alquiler estimado
      m.hay=true;
      if(r.edp){a.nEdp++; if(r.edp.moneda&&r.edp.moneda!=='SOLES')a.moneda=r.edp.moneda;}
      else if(r.costoProveedor)a.nEst++;
      sumar(a.tot,m);
      sumar(totMes[i],m);
    });
  });

  // Agrupar por familia (el "EXCAVADORAS" del Excel = el subtipo del Máster)
  const grupos=new Map();
  [...eqs.values()].forEach(a=>{
    const g=String(a.eq.sub||a.eq.tipo||'Sin clasificar').toUpperCase();
    if(!grupos.has(g))grupos.set(g,{nombre:g,equipos:[],
      meses:periodos.map(_ccaCero), tot:_ccaCero()});
    const G=grupos.get(g);
    G.equipos.push(a);
    a.meses.forEach((m,i)=>sumar(G.meses[i],m));
    sumar(G.tot,a.tot);
  });

  const lista=[...grupos.values()].sort((a,b)=>a.nombre.localeCompare(b.nombre));
  lista.forEach(G=>G.equipos.sort((a,b)=>
    String(a.eq.codigo||'').localeCompare(String(b.eq.codigo||''))));

  const totAnio=totMes.reduce((s,m)=>{sumar(s,m);return s;},_ccaCero());

  _ccaCache={clave,anio,KEY,periodos,grupos:lista,totMes,totAnio,
             nEquipos:eqs.size};
  return _ccaCache;
}

// ── Margen líquido ──────────────────────────────────────────────────────────
// Los equipos propios (contratista ECOSERMO) no se le pagan a nadie: con este
// botón su Alquiler pasa a cero y el margen sube en lo mismo. Solo cambia la
// vista; el motor y la pestaña Equipos siguen igual.
let _ccaLiquido=(()=>{try{return localStorage.getItem('ccaLiquido')==='1';}catch(e){return false;}})();
const _ccaEsPropio=eq=>/ecosermo/i.test(String(eq&&eq.proveedor||''));
function _ccaToggleLiquido(){
  _ccaLiquido=!_ccaLiquido;
  try{localStorage.setItem('ccaLiquido',_ccaLiquido?'1':'0');}catch(e){}
  _ccaPintar();
}
// Copia del equipo con el alquiler en cero (el margen del motor ya lo restaba
// en los dos modos, así que se le devuelve)
function _ccaSinAlquiler(a){
  const z=m=>Object.assign({},m,{alquiler:0,margen:(+m.margen||0)+(+m.alquiler||0),est:false});
  return{...a,meses:a.meses.map(z),tot:z(a.tot),nEst:0,liquido:true};
}

// ── Filtros ─────────────────────────────────────────────────────────────────
function _ccaFiltrar(D){
  const q=_ccaBuscar.trim().toLowerCase();
  return D.grupos.map(G=>{
    const equipos=G.equipos.map(a=>_ccaLiquido&&_ccaEsPropio(a.eq)?_ccaSinAlquiler(a):a).filter(a=>{
      if(_ccaLinea&&String(a.eq.tipo||'')!==_ccaLinea)return false;
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
    const sumar=(dst,src)=>_CCA_CAMPOS.forEach(k=>{dst[k]+=src[k]||0;});
    const meses=D.periodos.map(_ccaCero);
    const tot=_ccaCero();
    equipos.forEach(a=>{
      a.meses.forEach((m,i)=>sumar(meses[i],m));
      sumar(tot,a.tot);
    });
    return{...G,equipos,meses,tot};
  }).filter(Boolean);
}

function _ccaSet(campo,val){
  if(campo==='tipo')_ccaTipo=val;
  else if(campo==='linea')_ccaLinea=val;
  else if(campo==='contratista')_ccaContratista=val;
  else if(campo==='buscar')_ccaBuscar=val;
  _ccaPintar(campo==='buscar');
}
function _ccaNavAnio(d){_ccaAnio=(_ccaAnio||_ccaAnioPorDefecto())+d;_ccaPintar();}
function _ccaLimpiar(){_ccaTipo='';_ccaLinea='';_ccaContratista='';_ccaBuscar='';_ccaPintar();}

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
  const hayLinea=new Set(D.grupos.flatMap(G=>G.equipos.map(a=>String(a.eq.tipo||''))));
  const lineas=[..._CCA_LINEAS.filter(l=>hayLinea.has(l)),
    ...[...hayLinea].filter(l=>l&&!_CCA_LINEAS.includes(l)).sort()];
  const contratistas=[...new Set(D.grupos.flatMap(G=>
    G.equipos.map(a=>String(a.eq.proveedor||'—'))))].sort();

  const TH=`background:var(--panel2);color:var(--muted2);font-size:.63rem;font-weight:700;text-transform:uppercase;letter-spacing:.06em;padding:.4rem .5rem;white-space:nowrap;border-bottom:1px solid var(--border)`;
  const TDn=`padding:.28rem .5rem;font-family:monospace;font-size:.72rem;text-align:right;white-space:nowrap;border-bottom:1px solid var(--border)`;
  // La primera columna se queda fija: con doce meses la tabla se desplaza y sin
  // esto se pierde de vista de qué equipo es cada fila.
  const STICKY=`position:sticky;left:0;z-index:2;background:var(--panel)`;
  const mgDef=_ccaMgEsDef(), mgTxt=_ccaMgTexto();
  const nPropios=grupos.reduce((s,G)=>s+G.equipos.filter(a=>a.liquido).length,0);
  const lblMg=_ccaLiquido?'MARGEN LÍQUIDO':'MARGEN TOTAL';

  let filas='';
  grupos.forEach(G=>{
    // Cabecera de familia: el margen del grupo mes a mes (igual que el Excel)
    filas+=`<tr style="background:rgba(16,185,129,.07)">
      <td style="${TDn};${STICKY};background:#0f2a22;text-align:left;font-weight:800;color:#10b981;font-size:.72rem;letter-spacing:.04em">${_ccaEsc(G.nombre)}
        <span style="font-weight:600;color:var(--muted2);font-size:.62rem;letter-spacing:0"> · ${G.equipos.length} eq. · margen${_ccaLiquido?' líquido':''}${mgDef?'':' ('+_ccaEsc(mgTxt)+')'}</span></td>
      ${G.meses.map(m=>{const v=_ccaMg(m);return`<td style="${TDn};font-weight:800;color:${v<0?'#ef4444':'#10b981'}">${_ccaFmt(v)}</td>`;}).join('')}
      <td style="${TDn};font-weight:900;color:${_ccaMg(G.tot)<0?'#ef4444':'#10b981'};background:rgba(16,185,129,.1)">${_ccaFmt(_ccaMg(G.tot))}</td>
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
          ${a.liquido?`<span title="Margen líquido: equipo propio, su Alquiler se pone en cero" style="margin-left:.3rem;font-size:.6rem;font-weight:700;padding:1px 6px;border-radius:4px;border:1px solid #22d3ee;color:#22d3ee">💧 propio · alquiler 0</span>`:''}
          ${a.nEst?`<span title="${a.nEst} mes(es) con el alquiler estimado por horas × tarifa del Máster, sin EDP emitido" style="margin-left:.3rem;font-size:.6rem;font-weight:700;padding:1px 6px;border-radius:4px;background:rgba(249,115,22,.18);color:#f97316">${a.nEst} estimado${a.nEst===1?'':'s'}</span>`:''}
        </td>
      </tr>`;
      _ccaConceptos().forEach(C=>{
        filas+=`<tr onmouseover="this.style.background='var(--hover)'" onmouseout="this.style.background=''">
          <td style="${TDn};${STICKY};text-align:left;color:${C.col};font-weight:700;font-family:inherit;font-size:.7rem;padding-left:1.4rem">${C.lab}${C.k==='margen'&&!mgDef?` <span title="${_ccaEsc(mgTxt)}" style="color:var(--muted2);font-weight:600;font-size:.6rem">*</span>`:''}</td>
          ${a.meses.map(m=>{
            const v=_ccaVal(m,C.k);
            const neg=v<0;
            // Solo el alquiler puede ser estimado; los otros tres no dependen del EDP
            const est=C.k==='alquiler'&&m.hay&&m.est&&Math.abs(v)>=0.005;
            return`<td style="${TDn};color:${neg?'#ef4444':(Math.abs(v)<0.005?'var(--muted)':C.col)}${est?';font-style:italic;border-bottom:1px dotted '+C.col:''}"${est?' title="Estimado: horas × tarifa del Máster (aún sin EDP emitido)"':''}>${_ccaFmt(v)}</td>`;
          }).join('')}
          <td style="${TDn};font-weight:800;background:var(--panel2);color:${_ccaVal(a.tot,C.k)<0?'#ef4444':C.col}">${_ccaFmt(_ccaVal(a.tot,C.k))}</td>
        </tr>`;
      });
    });
  });

  if(!filas) filas=`<tr><td colspan="14" style="text-align:center;padding:2.5rem;color:var(--muted2);font-size:.85rem">
    Sin movimientos en ${_ccaAnio}${(_ccaTipo||_ccaLinea||_ccaContratista||_ccaBuscar)?' con los filtros aplicados':''}</td></tr>`;

  // Totales generales, sobre lo visible
  const tMes=D.periodos.map((_,i)=>grupos.reduce((s,G)=>s+_ccaMg(G.meses[i]),0));
  const tAn=grupos.reduce((s,G)=>s+_ccaMg(G.tot),0);

  // Botones para elegir qué conceptos entran al margen
  const mgSel=_ccaMgLista();
  const mgChips=_CCA_MG_OPC[_ccaMgKey()].map(k=>{
    const C=_ccaConceptos().find(c=>c.k===k)||{col:'#64748b'};
    const on=mgSel.includes(k);
    return`<button onclick="_ccaMgToggle('${k}')" title="${_CCA_INGRESOS.includes(k)?'Venta: suma':'Costo: resta'}"
      style="border:1px solid ${on?C.col:C.col+'55'};background:${on?C.col+'26':'transparent'};color:${on?C.col:'var(--muted2)'};border-radius:6px;padding:.22rem .6rem;font-size:.68rem;font-weight:700;cursor:pointer">${on?'✓ ':''}${_CCA_CORTO[k]} <span style="opacity:.7">${_CCA_INGRESOS.includes(k)?'+':'−'}</span></button>`;
  }).join('');

  const combo=(id,campo,val,opts,ph)=>`<select id="${id}" onchange="_ccaSet('${campo}',this.value)"
    style="background:var(--panel2);border:1px solid var(--border);color:var(--text);border-radius:7px;padding:.3rem .55rem;font-size:.74rem;max-width:190px">
    <option value="">${ph}</option>
    ${opts.map(o=>`<option value="${_ccaEsc(o)}"${o===val?' selected':''}>${_ccaEsc(o)}</option>`).join('')}
  </select>`;

  const nFiltros=(_ccaTipo?1:0)+(_ccaLinea?1:0)+(_ccaContratista?1:0)+(_ccaBuscar.trim()?1:0);

  return`
  <!-- Barra de control -->
  <div style="display:flex;align-items:center;gap:.5rem;flex-wrap:wrap;margin-bottom:.8rem">
    <div style="display:flex;align-items:center;background:var(--panel2);border:1px solid var(--border);border-radius:8px;overflow:hidden">
      <button onclick="_ccaNavAnio(-1)" title="Año anterior" style="background:none;border:none;border-right:1px solid var(--border);color:var(--text);cursor:pointer;font-size:1.1rem;padding:.3rem .7rem;line-height:1">‹</button>
      <span style="font-weight:800;font-size:.9rem;color:var(--text);min-width:64px;text-align:center;padding:0 .4rem">${_ccaAnio}</span>
      <button onclick="_ccaNavAnio(1)" title="Año siguiente" style="background:none;border:none;border-left:1px solid var(--border);color:var(--text);cursor:pointer;font-size:1.1rem;padding:.3rem .7rem;line-height:1">›</button>
    </div>
    ${combo('ccaTipo','tipo',_ccaTipo,tipos,'— Todos los subtipos —')}
    ${combo('ccaContratista','contratista',_ccaContratista,contratistas,'— Todos los contratistas —')}
    <input id="ccaBuscar" value="${_ccaEsc(_ccaBuscar)}" oninput="_ccaSet('buscar',this.value)" placeholder="🔍 Buscar equipo…"
      style="background:var(--panel2);border:1px solid var(--border);color:var(--text);border-radius:7px;padding:.3rem .6rem;font-size:.74rem;width:180px">
    ${combo('ccaLinea','linea',_ccaLinea,lineas,'— Todas las líneas —')}
    ${nFiltros?`<button onclick="_ccaLimpiar()" style="background:transparent;border:1px solid var(--border);color:var(--muted2);border-radius:7px;padding:.3rem .7rem;font-size:.74rem;cursor:pointer">✕ Limpiar (${nFiltros})</button>`:''}
    <div style="margin-left:auto;display:flex;align-items:center;gap:.5rem">
      <span style="font-size:.68rem;color:var(--muted2)">${grupos.reduce((s,G)=>s+G.equipos.length,0)} de ${D.nEquipos} equipo(s)
        <span style="color:var(--muted)">· exporte con los botones de arriba</span></span>
    </div>
  </div>

  <!-- Leyenda -->
  <div style="display:flex;gap:1rem;flex-wrap:wrap;margin-bottom:.6rem;font-size:.67rem;color:var(--muted2)">
    ${_ccaConceptos().map(C=>`<span style="display:flex;align-items:center;gap:.3rem"><span style="width:9px;height:9px;background:${C.col};border-radius:2px"></span>${C.lab}</span>`).join('')}
    <span style="display:flex;align-items:center;gap:.3rem"><em style="border-bottom:1px dotted #f59e0b;font-family:monospace">0.00</em> alquiler estimado (sin EDP)</span>
    <span>Períodos 21→20 · ${_ccTarifaModo==='seca'?'Máq. Seca':'Tarifa Full'}${_ccSinIgv?' · comb. sin IGV':''}${(typeof _ccProyecto!=='undefined'&&_ccProyecto)?` · <strong style="color:#a78bfa">solo ${_ccaEsc(_ccProyecto)}</strong>`:''}</span>
  </div>

  <!-- Qué entra al margen -->
  <div id="ccaMargenSel" style="display:flex;align-items:center;gap:.4rem;flex-wrap:wrap;margin-bottom:.6rem;font-size:.68rem">
    <span style="color:var(--muted2);font-weight:700">🧮 Calcular margen con:</span>
    ${mgChips}
    <span style="color:#10b981;font-weight:700;margin-left:.3rem">= ${_ccaEsc(mgTxt)}</span>
    ${mgDef?'':`<button onclick="_ccaMgTodos()" style="background:transparent;border:1px solid var(--border);color:var(--muted2);border-radius:6px;padding:.22rem .6rem;font-size:.68rem;cursor:pointer">↺ Margen completo</button>`}
    <button id="ccaBtnLiquido" onclick="_ccaToggleLiquido()" title="Pone en cero el Alquiler de los equipos propios (contratista ECOSERMO) y recalcula el margen"
      style="margin-left:auto;border:1px solid #22d3ee;background:${_ccaLiquido?'rgba(34,211,238,.18)':'transparent'};color:${_ccaLiquido?'#22d3ee':'var(--muted2)'};border-radius:6px;padding:.22rem .7rem;font-size:.68rem;font-weight:800;cursor:pointer">💧 ${_ccaLiquido?'✓ Margen líquido':'Margen líquido'}</button>
  </div>
  ${_ccaLiquido?`<div style="font-size:.66rem;color:#22d3ee;margin:-.3rem 0 .6rem">💧 Margen líquido · Alquiler en cero para ${nPropios} equipo(s) propio(s) de ECOSERMO</div>`:''}

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
        <td style="${TDn};${STICKY};background:var(--panel2);text-align:left;font-weight:800;font-family:inherit;font-size:.72rem;color:var(--text)">${lblMg}${mgDef?'':`<div style="font-weight:600;font-size:.6rem;color:var(--muted2)">${_ccaEsc(mgTxt)}</div>`}</td>
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
  // Se indexa por la clave del concepto, no por su etiqueta: la etiqueta cambia
  // de número entre Máq. Seca (cuatro líneas) y Tarifa Full (cinco).
  const XL_COL={alquiler:'B45309',comb:'C2410C',venta:'0E7490',
                ventaEq:'0E7490',ventaComb:'6D28D9',margen:'047857'};

  const aoa=[
    [S('COST CONTROL — MATRIZ ANUAL POR EQUIPO',{b:1,bg:'1E3A5F',col:'FFFFFF',al:'center'}),
      ...Array(NC-1).fill(S('',{bg:'1E3A5F'}))],
    [S(`Año ${_ccaAnio} · períodos 21→20 · ${_ccTarifaModo==='seca'?'Máq. Seca':'Tarifa Full'}`
       +`${_ccSinIgv?' · combustible sin IGV':''}${_ccPrecioManual?(typeof _ccpcActivo==='function'&&_ccpcActivo()?' · precio de combustible manual de cada período':' · precio de combustible manual'):''}`
       +`${(typeof _ccProyecto!=='undefined'&&_ccProyecto)?' · solo proyecto '+_ccProyecto:''}`
       +`${_ccaMgEsDef()?'':' · margen = '+_ccaMgTexto()}`
       +`${_ccaLiquido?' · MARGEN LÍQUIDO (alquiler de equipos propios ECOSERMO en cero)':''}`
       +` · ${grupos.reduce((s,G)=>s+G.equipos.length,0)} equipo(s)`,
      {bg:'EEF2F8',col:'475569',al:'center'}),...Array(NC-1).fill(S('',{bg:'EEF2F8'}))],
    HDR.map(h=>S(h,{b:1,bg:'334155',col:'FFFFFF',al:'center'}))
  ];

  grupos.forEach(G=>{
    G.equipos.forEach(a=>{
      const mon=a.moneda==='SOLES'?'S/':a.moneda;
      _ccaConceptos().forEach(C=>{
        // Un mes con alquiler estimado sale en cursiva, igual que en pantalla
        const cel=a.meses.map(m=>S(+_ccaVal(m,C.k).toFixed(2),{
          al:'right',numFmt:'#,##0.00',col:XL_COL[C.k],
          it:C.k==='alquiler'&&m.hay&&m.est&&Math.abs(m[C.k])>=0.005}));
        aoa.push([
          S(G.nombre),S(a.eq.proveedor||'—'),S(a.eq.codigo||'',{b:1}),S(a.eq.nombre||''),
          S(C.lab,{b:1,col:XL_COL[C.k]}),S(mon,{al:'center'}),
          ...cel,
          S(+_ccaVal(a.tot,C.k).toFixed(2),{al:'right',numFmt:'#,##0.00',b:1,col:XL_COL[C.k]})
        ]);
      });
    });
  });

  // Total general por mes (margen), al pie
  const tMes=D.periodos.map((_,i)=>grupos.reduce((s,G)=>s+_ccaMg(G.meses[i]),0));
  aoa.push([S(_ccaLiquido?'MARGEN LÍQUIDO':'MARGEN TOTAL',{b:1,bg:'EEF2F8'}),...Array(5).fill(S('',{bg:'EEF2F8'})),
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

// ── PDF de la matriz ────────────────────────────────────────────────────────
// Catorce columnas no caben en vertical: va en A4 apaisado y con letra chica.
// La impresión respeta los filtros y el modo de tarifa que estén puestos.
function _ccaPdf(){
  if(_ccaAnio==null)_ccaAnio=_ccaAnioPorDefecto();
  const KEY=_ccTarifaModo==='seca'?'seca':'full';
  const D=_ccaCalcular(_ccaAnio,KEY);
  const grupos=_ccaFiltrar(D);
  if(!grupos.length){toast('No hay datos para imprimir',true);return;}
  const CON=_ccaConceptos();
  const TD='border:1px solid #cbd5e1;padding:2px 4px;font-size:7px;color:#111';
  const der=TD+';text-align:right';
  const XC={alquiler:'#B45309',comb:'#C2410C',venta:'#0E7490',
            ventaEq:'#0E7490',ventaComb:'#6D28D9',margen:'#047857'};
  const n=v=>Math.abs(+v||0)<0.005?'–':Number(v).toLocaleString('es-PE',
    {minimumFractionDigits:2,maximumFractionDigits:2});

  let body='';
  grupos.forEach(G=>{
    body+=`<tr style="background:#ecfdf5"><td style="${TD};font-weight:800;color:#047857">${_ccaEsc(G.nombre)}
      <span style="font-weight:400;color:#64748b">· ${G.equipos.length} eq. · margen</span></td>
      ${G.meses.map(m=>{const v=_ccaMg(m);return`<td style="${der};font-weight:800;color:${v<0?'#b91c1c':'#047857'}">${n(v)}</td>`;}).join('')}
      <td style="${der};font-weight:800;background:#d1fae5;color:${_ccaMg(G.tot)<0?'#b91c1c':'#047857'}">${n(_ccaMg(G.tot))}</td></tr>`;
    G.equipos.forEach(a=>{
      body+=`<tr><td colspan="14" style="${TD};background:#f8fafc;border-top:1px solid #94a3b8">
        <strong style="color:#1e3a5f">${_ccaEsc(`${a.eq.codigo||''} – ${a.eq.nombre||''}`)}</strong>
        <span style="color:#64748b"> · ${_ccaEsc(a.eq.proveedor||'—')} · ${a.moneda==='SOLES'?'S/':_ccaEsc(a.moneda)}</span>
        ${a.nEst?`<span style="color:#c2410c"> · ${a.nEst} mes(es) estimado(s)</span>`:''}</td></tr>`;
      CON.forEach(C=>{
        body+=`<tr><td style="${TD};padding-left:14px;color:${XC[C.k]};font-weight:700">${C.lab}</td>
          ${a.meses.map(m=>{const v=_ccaVal(m,C.k);
            const est=C.k==='alquiler'&&m.hay&&m.est&&Math.abs(v)>=0.005;
            return`<td style="${der};color:${v<0?'#b91c1c':XC[C.k]}${est?';font-style:italic':''}">${n(v)}</td>`;
          }).join('')}
          <td style="${der};font-weight:800;background:#f1f5f9;color:${_ccaVal(a.tot,C.k)<0?'#b91c1c':XC[C.k]}">${n(_ccaVal(a.tot,C.k))}</td></tr>`;
      });
    });
  });
  const tMes=D.periodos.map((_,i)=>grupos.reduce((s,G)=>s+_ccaMg(G.meses[i]),0));
  const tAn=tMes.reduce((s,v)=>s+v,0);
  const ctx=[`Períodos 21→20 · ${_ccTarifaModo==='seca'?'Máq. Seca':'Tarifa Full'}`];
  if(_ccSinIgv)ctx.push('combustible sin IGV');
  if(_ccPrecioManual)ctx.push(typeof _ccpcActivo==='function'&&_ccpcActivo()?'precio de combustible manual de cada período':'precio de combustible manual');
  if(typeof _ccProyecto!=='undefined'&&_ccProyecto)ctx.push('solo proyecto '+_ccProyecto);
  if(_ccaLinea)ctx.push('línea: '+_ccaLinea);
  if(_ccaTipo)ctx.push('subtipo: '+_ccaTipo);
  if(_ccaContratista)ctx.push('contratista: '+_ccaContratista);
  if(_ccaBuscar.trim())ctx.push('búsqueda: '+_ccaBuscar.trim());
  if(!_ccaMgEsDef())ctx.push('margen = '+_ccaMgTexto());
  if(_ccaLiquido)ctx.push('MARGEN LÍQUIDO: alquiler de equipos propios ECOSERMO en cero');
  ctx.push(grupos.reduce((s,G)=>s+G.equipos.length,0)+' equipo(s)');

  const cuerpo=`<div style="font-size:9.5px;color:#475569;text-align:center;margin:-6px 0 8px">Resultado operativo por equipo · año ${_ccaAnio}</div>
    <div style="font-size:7.5px;color:#64748b;margin-bottom:8px;padding:4px 6px;background:#f1f5f9;border-left:3px solid #1e3a5f">${_ccaEsc(ctx.join(' · '))}</div>
    <table><thead><tr>
      <th style="background:#1e3a5f;color:#fff;padding:3px 4px;font-size:7px;text-align:left;border:1px solid #fff">Equipo · Concepto</th>
      ${_CCA_MES3.map(m=>`<th style="background:#1e3a5f;color:#fff;padding:3px 4px;font-size:7px;text-align:right;border:1px solid #fff">${m}</th>`).join('')}
      <th style="background:#0f2942;color:#fff;padding:3px 4px;font-size:7px;text-align:right;border:1px solid #fff">Total ${_ccaAnio}</th>
    </tr></thead><tbody>${body}</tbody>
    <tfoot><tr style="background:#e2e8f0;font-weight:900">
      <td style="${TD}">${_ccaLiquido?'MARGEN LÍQUIDO':'MARGEN TOTAL'}</td>
      ${tMes.map(v=>`<td style="${der};color:${v<0?'#b91c1c':'#047857'}">${n(v)}</td>`).join('')}
      <td style="${der};color:${tAn<0?'#b91c1c':'#047857'}">${n(tAn)}</td>
    </tr></tfoot></table>`;
  _ccxImprimir(`COST CONTROL — MATRIZ ANUAL ${_ccaAnio}`,cuerpo,true);
}
