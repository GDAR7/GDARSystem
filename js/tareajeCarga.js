// ══════════════════════════════════════════════════════════════════════════
//  TAREAJE · CARGA POR TRAMOS
//  Al entrar se traen solo los últimos TAR_MESES_INI meses del tareaje (desde
//  el día 1 de ese mes, más todo lo futuro ya programado). Antes se bajaba
//  todo el historial, de 1000 en 1000, cada vez que alguien abría el sistema.
//
//  Nada se borra de la base: solo se deja de DESCARGAR lo antiguo hasta que
//  haga falta. Lo antiguo llega por tres caminos:
//    · el selector "Cargado: …" del Tareaje (6 meses, 12 meses, desde el inicio)
//    · tarAsegurar(fecha): la pantalla que va a mostrar una fecha anterior a lo
//      cargado trae lo que falta desde el día 1 de ese mes
//    · tarHistorial(): las pantallas que cuentan desde el inicio (resumen
//      acumulado, planilla, HH, histograma…) traen todo, una sola vez
//
//  _tarCargaDesde:
//    null          no se usó la carga por tramos (se cargó todo, como antes)
//    ''            está TODO cargado
//    'AAAA-MM-DD'  está cargado desde esa fecha en adelante
//  Prefijo _tcg / tar*.
// ══════════════════════════════════════════════════════════════════════════

const TAR_MESES_INI=3;
let _tarCargaDesde=null;
let _tcgCola=Promise.resolve();
let _tcgOcupado=false;
let _tcgPidioTodo=false;

// Día 1 del mes de hace n meses: '2026-11-20', 3 → '2026-08-01'
function tarDesdeMeses(n,hoy){
  const h=String(hoy||(typeof today==='function'?today():new Date().toISOString().slice(0,10)));
  let y=+h.slice(0,4), m=+h.slice(5,7)-n;
  while(m<1){m+=12;y--;}
  return y+'-'+String(m).padStart(2,'0')+'-01';
}
// ¿Lo cargado alcanza para mostrar esa fecha?
function tarCubre(fecha){
  if(_tarCargaDesde===null||_tarCargaDesde==='')return true;
  if(!fecha)return true;
  return String(fecha).slice(0,10)>=_tarCargaDesde;
}
function tarTodoCargado(){return _tarCargaDesde===null||_tarCargaDesde==='';}

// Trae de la base las marcas con fecha en [desde, hasta). Sin desde = todo lo
// anterior a hasta. Sin hasta = desde en adelante, incluidas las que no tienen
// fecha (para no perder ninguna). Paginado: Supabase corta en 1000.
async function _tcgTraer(desde,hasta){
  const out=[];let from=0;
  while(true){
    let q=supa.from('tareaje').select('*');
    if(desde&&hasta)q=q.gte('fecha',desde).lt('fecha',hasta);
    else if(desde)q=q.or('fecha.gte.'+desde+',fecha.is.null');
    else if(hasta)q=q.lt('fecha',hasta);
    const{data,error}=await q.order('id').range(from,from+999);
    if(error)throw error;
    if(!data||!data.length)break;
    out.push(...data);
    if(data.length<1000)break;
    from+=1000;
  }
  return out;
}
// El id más alto de TODA la tabla, no solo de lo cargado: si no, una marca
// nueva podría tomar el id de una antigua que no se descargó y pisarla.
async function _tcgMaxId(){
  const{data,error}=await supa.from('tareaje').select('id').order('id',{ascending:false}).limit(1);
  if(error)throw error;
  return data&&data.length?(+data[0].id||0):0;
}
function _tcgFijarNx(maxServidor){
  const maxLocal=(DB.tareaje||[]).reduce((m,r)=>Math.max(m,+r.id||0),0);
  if(DB.nx)DB.nx.tar=Math.max(maxServidor||0,maxLocal)+1;
}

// Carga inicial (la llama loadSheetsData). Si ya se había cargado más atrás
// (p. ej. "desde el inicio") y se refresca, se respeta lo que se tenía.
async function tarCargaInicial(){
  const ini=tarDesdeMeses(TAR_MESES_INI);
  const desde=(_tarCargaDesde===''||(_tarCargaDesde&&_tarCargaDesde<ini))?_tarCargaDesde:ini;
  const[filas,maxId]=await Promise.all([desde?_tcgTraer(desde,null):_tcgTraer(null,null),_tcgMaxId()]);
  DB.tareaje=filas.map(toCamel);
  _tarCargaDesde=desde;
  _tcgPidioTodo=false;
  _tcgFijarNx(maxId);
  _tcgPintarSel();
}

// Amplía lo cargado hasta 'desde' ('' = todo). Las peticiones van en fila para
// que dos pantallas no traigan lo mismo a la vez.
function tarCargarDesde(desde){
  _tcgCola=_tcgCola.then(async()=>{
    if(tarTodoCargado())return;
    if(desde&&desde>=_tarCargaDesde)return;
    _tcgOcupado=true;_tcgPintarSel();
    try{
      const filas=await _tcgTraer(desde||null,_tarCargaDesde);
      const ids=new Set((DB.tareaje||[]).map(r=>+r.id));
      filas.forEach(r=>{const c=toCamel(r);if(!ids.has(+c.id))DB.tareaje.push(c);});
      DB.tareaje.sort((a,b)=>(+a.id||0)-(+b.id||0));
      _tarCargaDesde=desde||'';
      _tcgFijarNx(0);
    }catch(e){
      console.warn('[tareaje] no se pudo traer lo anterior',e&&e.message||e);
      if(typeof toast==='function')toast('No se pudo cargar el tareaje anterior. Intente de nuevo.',true);
      if(!desde)_tcgPidioTodo=false;
    }finally{
      _tcgOcupado=false;_tcgPintarSel();
    }
  });
  return _tcgCola;
}

// Para las pantallas que muestran una fecha: true si ya está; si no, trae lo
// que falta y vuelve a dibujar (cb, o la página abierta).
function tarAsegurar(fecha,cb){
  if(tarCubre(fecha))return true;
  const f=String(fecha).slice(0,10);
  tarCargarDesde(f.slice(0,7)+'-01').then(()=>{
    if(tarCubre(fecha))(cb||_tcgRepintar)();
  });
  return false;
}
// Para una fecha y el período 21→20 que la contiene: asegura desde el día 1
// del mes anterior (cubre el 21 del mes previo).
function tarAsegurarPeriodo(fecha,cb){
  const f=String(fecha||'').slice(0,10);
  if(!/^\d{4}-\d{2}-\d{2}$/.test(f))return true;
  return tarAsegurar(tarDesdeMeses(1,f),cb);
}
// Para las que cuentan desde el inicio: true si está todo; si no, lo trae una
// sola vez y vuelve a dibujar.
function tarHistorial(cb){
  if(tarTodoCargado())return true;
  if(!_tcgPidioTodo){
    _tcgPidioTodo=true;
    if(typeof toast==='function')toast('Cargando el historial completo del tareaje…');
    tarCargarDesde('').then(()=>{if(tarTodoCargado())(cb||_tcgRepintar)();});
  }
  return false;
}
function _tcgRepintar(){
  if(typeof renderPage==='function'&&typeof AP!=='undefined'&&AP)renderPage(AP);
}

// Días en obra (TD, TN, DLT, A5) de una persona antes de una fecha. Lo usa el
// A5 automático (escáner y tareo en lote): con el tareaje por tramos, alguien
// que trabajó hace un año parecería nuevo si solo se mirara lo cargado. Si lo
// cargado ya alcanza el mínimo, no se consulta la base.
const _TCG_OBRA=['TD','TN','DLT','A5'];
async function tarDiasObraAntes(personalId,fecha,minimo){
  const loc=(DB.tareaje||[]).filter(r=>r.personalId===personalId&&r.fecha&&r.fecha<fecha
    &&_TCG_OBRA.includes(r.tipo)).length;
  if(loc>=minimo||tarTodoCargado())return loc;
  // Lo no cargado es todo lo anterior a _tarCargaDesde (y a la fecha pedida)
  const corte=fecha<_tarCargaDesde?fecha:_tarCargaDesde;
  try{
    const{count,error}=await supa.from('tareaje').select('id',{count:'exact',head:true})
      .eq('personal_id',personalId).lt('fecha',corte).in('tipo',_TCG_OBRA);
    if(error)throw error;
    return loc+(count||0);
  }catch(e){
    console.warn('[tareaje] no se pudo contar días anteriores',e&&e.message||e);
    return loc;
  }
}

// ── Selector "Cargado: …" del Tareaje ─────────────────────────────────────
const _TCG_OPC=[{v:'3',l:'Últimos 3 meses'},{v:'6',l:'Últimos 6 meses'},
                {v:'12',l:'Últimos 12 meses'},{v:'todo',l:'Desde el inicio'}];
function _tcgLbl(){
  if(_tcgOcupado)return'⏳ Cargando…';
  if(tarTodoCargado())return'Cargado: desde el inicio';
  const[y,m]=_tarCargaDesde.split('-');
  const MES=['ene','feb','mar','abr','may','jun','jul','ago','set','oct','nov','dic'];
  return'Cargado: desde '+MES[+m-1]+' '+y;
}
function _tcgPintarSel(){
  const el=typeof document!=='undefined'&&document.getElementById('tareCarga');
  if(!el)return;
  if(_tarCargaDesde===null){el.style.display='none';return;}
  el.style.display='';
  el.disabled=_tcgOcupado;
  el.innerHTML='<option value="">'+_tcgLbl()+'</option>'
    +_TCG_OPC.map(o=>{
      const d=o.v==='todo'?'':tarDesdeMeses(+o.v);
      const ya=tarTodoCargado()||(d&&d>=_tarCargaDesde);
      return'<option value="'+o.v+'"'+(ya?' disabled':'')+'>'+(ya?'✓ ':'')+o.l+'</option>';
    }).join('');
  el.value='';
  el.title='El tareaje se carga por partes para que el sistema abra más rápido. Elija cuánto historial traer.';
}
function tarCargaSel(v){
  if(!v)return;
  const desde=v==='todo'?'':tarDesdeMeses(+v);
  if(!desde)_tcgPidioTodo=true;
  tarCargarDesde(desde).then(()=>{
    _tcgRepintar();
    if(typeof toast==='function'&&!_tcgOcupado)toast('Tareaje '+_tcgLbl().replace('Cargado: ','cargado '));
  });
}
