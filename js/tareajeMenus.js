// ══ MENÚS DE LA BARRA DE TAREAJE ════════════════════════════════════════════
// Agrupa en tres desplegables los once controles que antes iban sueltos y
// hacían que la barra ocupara dos líneas, empujando la grilla fuera de la
// pantalla.
//
//   📅 Período   el mes ya visible, más el período 21→20 y el rango libre
//   👁 Vista     encabezado fijo, multi-selección, hover y las 8 columnas
//   ⬇ Exportar   PDF y Excel
//
// No cambia ninguna función existente: printTareaje, exportTareaje,
// toggleTareMult, _tarToggleFijar y _tarToggleCol se siguen llamando igual,
// solo que ahora desde dentro de un menú. Los IDs de los controles y las
// claves de localStorage tampoco cambian.
//
// Prefijo _tmn para no chocar con nada de tareaje.js.

let _tmnEl=null, _tmnDocH=null, _tmnEscH=null, _tmnAbierto=null;

function _tmnCerrar(){
  if(_tmnEl&&_tmnEl.isConnected)_tmnEl.remove();
  _tmnEl=null;_tmnAbierto=null;
  if(_tmnDocH){document.removeEventListener('click',_tmnDocH);_tmnDocH=null;}
  if(_tmnEscH){document.removeEventListener('keydown',_tmnEscH);_tmnEscH=null;}
  document.querySelectorAll('[data-tmn]').forEach(b=>{b.style.background='';});
}

// Panel flotante junto al botón. Misma mecánica que _tarColsPanel, que ya
// funcionaba bien: se cierra con Escape o al hacer clic fuera.
function _tmnAbrir(ev,clave,ancho,construir){
  const yaEstaba=_tmnAbierto===clave;
  _tmnCerrar();
  if(yaEstaba)return;                       // segundo clic en el mismo botón: cierra

  const div=document.createElement('div');
  div.style.cssText='position:fixed;z-index:99990;background:var(--panel);'
    +'border:1px solid var(--border);border-radius:10px;padding:.45rem .4rem;'
    +'box-shadow:0 10px 30px rgba(0,0,0,.55);min-width:'+ancho+'px;max-height:70vh;overflow:auto';
  div.onclick=e=>e.stopPropagation();
  construir(div);

  document.body.appendChild(div);
  _tmnEl=div;_tmnAbierto=clave;

  const b=ev.currentTarget;
  b.style.background='rgba(255,255,255,.07)';
  const r=b.getBoundingClientRect();
  let top=r.bottom+4, left=r.left;
  if(left+div.offsetWidth>window.innerWidth-8)
    left=Math.max(8,window.innerWidth-div.offsetWidth-8);
  if(top+div.offsetHeight>window.innerHeight-8)
    top=Math.max(8,r.top-div.offsetHeight-4);
  div.style.top=top+'px';div.style.left=left+'px';

  _tmnEscH=e=>{if(e.key==='Escape')_tmnCerrar();};
  document.addEventListener('keydown',_tmnEscH);
  setTimeout(()=>{
    _tmnDocH=e=>{if(!_tmnEl||!_tmnEl.contains(e.target))_tmnCerrar();};
    document.addEventListener('click',_tmnDocH);
  },10);
}

// ── Piezas sueltas para armar los menús ───────────────────────────────────
function _tmnTitulo(txt){
  const d=document.createElement('div');
  d.textContent=txt;
  d.style.cssText='font-size:.62rem;text-transform:uppercase;letter-spacing:.08em;'
    +'color:var(--muted2);font-weight:700;padding:.35rem .35rem .3rem;';
  return d;
}
function _tmnSeparador(){
  const d=document.createElement('div');
  d.style.cssText='border-top:1px solid var(--border);margin:.35rem .2rem';
  return d;
}
// Una fila con casilla. `get` dice si está encendida; `set` la cambia.
function _tmnCheck(label,color,get,set){
  const row=document.createElement('div');
  row.style.cssText='display:flex;align-items:center;padding:.32rem .45rem;'
    +'border-radius:6px;cursor:pointer';
  const cb=document.createElement('input');
  cb.type='checkbox';
  cb.style.cssText='flex:0 0 15px;width:15px;height:15px;margin:0;cursor:pointer;accent-color:'+color;
  const lbl=document.createElement('span');
  lbl.textContent=label;
  lbl.style.cssText='margin-left:9px;flex:1;font-size:.75rem';
  const pinta=()=>{
    const on=!!get();
    cb.checked=on;
    row.style.background=on?color+'1f':'';
    lbl.style.fontWeight=on?'700':'500';
    lbl.style.color=on?color:'var(--text)';
  };
  pinta();
  cb.onchange=()=>{set(cb.checked);pinta();};
  row.onclick=e=>{if(e.target!==cb)cb.click();};
  row.appendChild(cb);row.appendChild(lbl);
  return row;
}
function _tmnAccion(label,color,fn){
  const b=document.createElement('div');
  b.style.cssText='display:flex;align-items:center;gap:.5rem;padding:.4rem .5rem;'
    +'border-radius:6px;cursor:pointer;font-size:.76rem;font-weight:600;color:'+color;
  b.textContent=label;
  b.onmouseenter=()=>{b.style.background=color+'18';};
  b.onmouseleave=()=>{b.style.background='';};
  b.onclick=()=>{_tmnCerrar();fn();};
  return b;
}

// ── 👁 Vista ──────────────────────────────────────────────────────────────
function tarMenuVista(ev){
  _tmnAbrir(ev,'vista',215,div=>{
    div.appendChild(_tmnTitulo('Vista'));
    div.appendChild(_tmnCheck('Encabezado fijo','#22d3ee',
      ()=>_tarFijar,()=>_tarToggleFijar()));
    div.appendChild(_tmnCheck('Multi-selección','#a78bfa',
      ()=>_tarMultiMode,()=>toggleTareMult()));
    div.appendChild(_tmnCheck('Hover','#f59e0b',
      ()=>_tarHoverMode,()=>toggleTareHover()));

    div.appendChild(_tmnSeparador());
    div.appendChild(_tmnTitulo('Columnas'));
    const pintores=[];
    _TAR_COLS.forEach(c=>{
      const row=_tmnCheck(c.l,c.c,()=>c.get(),on=>{_tarSetCol(c.k,on);rTareaje();});
      pintores.push(row);
      div.appendChild(row);
    });

    const pie=document.createElement('div');
    pie.style.cssText='display:flex;gap:.3rem;padding:.4rem .35rem .1rem;'
      +'border-top:1px solid var(--border);margin-top:.3rem';
    const bt=(txt,col,fn)=>{
      const b=document.createElement('button');
      b.textContent=txt;
      b.style.cssText='flex:1;font-size:.68rem;font-weight:700;padding:.25rem 0;border-radius:6px;'
        +'border:1px solid '+col+'55;background:'+col+'18;color:'+col+';cursor:pointer';
      b.onclick=()=>{fn();_tmnCerrar();};
      return b;
    };
    pie.appendChild(bt('Todas','#22d3ee',()=>_tarColsTodas(true)));
    pie.appendChild(bt('Ninguna','#94a3b8',()=>_tarColsTodas(false)));
    div.appendChild(pie);
  });
}

// ── ⬇ Exportar ───────────────────────────────────────────────────────────
function tarMenuExportar(ev){
  _tmnAbrir(ev,'exportar',160,div=>{
    div.appendChild(_tmnTitulo('Exportar'));
    div.appendChild(_tmnAccion('🖨️  PDF','var(--mec)',()=>printTareaje()));
    div.appendChild(_tmnAccion('📥  Excel','#10b981',()=>exportTareaje()));
  });
}

// ── 📅 Período ───────────────────────────────────────────────────────────
// El input de mes sigue en la barra con su id de siempre; aquí van el período
// contable 21→20 y el rango libre, que eran los que ocupaban media línea.
function tarMenuPeriodo(ev){
  _tmnAbrir(ev,'periodo',250,div=>{
    div.appendChild(_tmnTitulo('Período contable'));
    const fila=document.createElement('div');
    fila.style.cssText='display:flex;gap:.3rem;padding:.15rem .35rem .4rem';
    const btn=(txt,tit,fn,destacado)=>{
      const b=document.createElement('button');
      b.textContent=txt;b.title=tit;
      b.style.cssText='flex:'+(destacado?'1':'0 0 auto')+';background:'
        +(destacado?'rgba(34,211,238,.14)':'var(--panel2)')+';border:1px solid '
        +(destacado?'#22d3ee55':'var(--border)')+';border-radius:6px;color:'
        +(destacado?'#22d3ee':'var(--text)')+';padding:.28rem .5rem;font-size:.72rem;'
        +'font-weight:'+(destacado?'700':'500')+';cursor:pointer';
      b.onclick=()=>{fn();_tmnCerrar();};
      return b;
    };
    fila.appendChild(btn('◀','Período anterior',()=>_tarPerNav(-1)));
    fila.appendChild(btn('21 → 20','Período contable en curso',()=>_tarPer2120(),true));
    fila.appendChild(btn('▶','Período siguiente',()=>_tarPerNav(1)));
    div.appendChild(fila);

    div.appendChild(_tmnSeparador());
    div.appendChild(_tmnTitulo('Rango libre'));
    const rango=document.createElement('div');
    rango.style.cssText='display:flex;align-items:center;gap:.3rem;padding:.15rem .35rem .4rem';
    const est='flex:1;min-width:0;background:var(--panel2);border:1px solid var(--border);'
      +'border-radius:6px;color:var(--text);padding:.25rem .4rem;font-size:.72rem';
    const d1=document.createElement('input');
    d1.type='date';d1.value=_tarDesde||'';d1.style.cssText=est;
    d1.onchange=()=>_tarSetRango('desde',d1.value);
    const flecha=document.createElement('span');
    flecha.textContent='→';flecha.style.cssText='color:var(--muted2);font-size:.7rem';
    const d2=document.createElement('input');
    d2.type='date';d2.value=_tarHasta||'';d2.style.cssText=est;
    d2.onchange=()=>_tarSetRango('hasta',d2.value);
    rango.appendChild(d1);rango.appendChild(flecha);rango.appendChild(d2);
    div.appendChild(rango);

    if(_tarRangoOn()){
      const pie=document.createElement('div');
      pie.style.cssText='padding:.1rem .35rem .2rem;display:flex;align-items:center;'
        +'justify-content:space-between;gap:.4rem';
      const info=document.createElement('span');
      info.textContent=_tarFechas().length+' días';
      info.style.cssText='font-size:.66rem;color:#22d3ee;font-weight:700';
      const volver=document.createElement('button');
      volver.textContent='✕ Volver al mes';
      volver.style.cssText='background:transparent;border:1px solid #ef444455;border-radius:6px;'
        +'color:#ef4444;padding:.22rem .5rem;font-size:.68rem;font-weight:700;cursor:pointer';
      volver.onclick=()=>{_tarVolverMes();_tmnCerrar();};
      pie.appendChild(info);pie.appendChild(volver);
      div.appendChild(pie);
    }
  });
}

// El botón de Período resume lo que está activo, para no tener que abrirlo
// solo para saber qué se está viendo.
function _tmnPintarBotonPeriodo(){
  const b=document.getElementById('tarBtnPeriodo');
  if(!b)return;
  const on=typeof _tarRangoOn==='function'&&_tarRangoOn();
  b.textContent=on?('📅 '+_tarFechas().length+' días ▾'):'📅 Período ▾';
  b.style.color=on?'#22d3ee':'';
  b.style.borderColor=on?'#22d3ee55':'';
  const mes=document.getElementById('tareMes');
  if(mes)mes.style.opacity=on?'.45':'1';   // el mes queda atenuado en modo rango
}


// ══ CHIPS DE JORNADA ════════════════════════════════════════════════════════
// La fila se adapta a lo que hay en el periodo: lo que tiene al menos un dia se
// muestra, y lo que esta en cero se agrupa en "Otros". Antes se pintaban los
// trece siempre, la mayoria en cero y al 35% de opacidad, ocupando dos lineas
// para no decir nada.
//
// Con color van solo los cuatro que pintan celdas en la grilla, para que el
// color del chip coincida con lo que se ve abajo. El resto, gris con borde.

const _TMN_CON_COLOR=['TD','TN','DL','F'];

let _tmnOtrosConteos=null;   // lo deja _tmnLeyendaHTML para que lo use el menu

function _tmnChip(k,v,n,activo){
  const color=_TMN_CON_COLOR.includes(k);
  const fondo =color?v.bg:'transparent';
  const texto =color?v.tx:'var(--muted2)';
  const borde =activo?(color?v.bg:'var(--muted2)'):(color?'transparent':'var(--border)');
  const tit=v.l+' · '+(n?n+' trabajador'+(n===1?'':'es')+' con al menos un día'
                        :'nadie este período')
    +(activo?' · clic para quitar el filtro':'');
  return '<span onclick="_tarLeySet(\''+k+'\')" title="'+tit+'" style="'
    +'background:'+fondo+';color:'+texto+';font-size:.6rem;font-weight:700;'
    +'padding:2px 7px;border-radius:4px;white-space:nowrap;cursor:pointer;'
    +'user-select:none;border:'+(activo?'2px':'1px')+' solid '+borde+';'
    +(activo?'box-shadow:0 0 0 2px rgba(255,255,255,.10);':'')
    +'">'+k+' – '+v.l+(n?' <span style="opacity:.75">'+n+'</span>':'')
    +(activo?' ✕':'')+'</span>';
}

function _tmnLeyendaHTML(conteos,filtro){
  const vivos=[],ceros=[];
  Object.entries(_TARE_T).forEach(([k,v])=>{
    const n=conteos[k]?conteos[k].size:0;
    // Un chip con el filtro puesto nunca se esconde: si no, al cambiar de mes
    // el filtro quedaria activo sin ninguna forma de quitarlo.
    (n||filtro===k?vivos:ceros).push({k,v,n});
  });
  _tmnOtrosConteos=ceros;

  const rotulo='<span style="font-size:.58rem;letter-spacing:.1em;color:var(--muted2);'
    +'text-transform:uppercase;font-weight:700;margin-right:.15rem">Jornadas</span>';

  const chips=vivos.map(x=>_tmnChip(x.k,x.v,x.n,filtro===x.k)).join('');

  const otros=ceros.length
    ? '<button onclick="tarMenuOtros(event)" title="Tipos sin ningún día en este período"'
      +' style="background:transparent;border:1px dashed var(--border);color:var(--muted2);'
      +'font-size:.6rem;font-weight:700;padding:2px 8px;border-radius:4px;cursor:pointer;'
      +'white-space:nowrap">Otros '+ceros.length+' ▾</button>'
    : '';

  const limpiar=filtro
    ? '<span onclick="_tarLeySet(null)" style="font-size:.6rem;font-weight:700;padding:2px 8px;'
      +'border-radius:4px;cursor:pointer;background:transparent;border:1px solid var(--border);'
      +'color:#ef4444;white-space:nowrap">✕ Quitar filtro</span>'
    : '';

  return rotulo+chips+otros+limpiar;
}

// Los que no tienen ni un dia en el periodo. Se pueden filtrar igual: a veces
// uno quiere confirmar que, en efecto, nadie tiene vacaciones este mes.
function tarMenuOtros(ev){
  _tmnAbrir(ev,'otros',210,div=>{
    div.appendChild(_tmnTitulo('Sin días en este período'));
    (_tmnOtrosConteos||[]).forEach(x=>{
      const row=document.createElement('div');
      row.style.cssText='display:flex;align-items:center;gap:.5rem;padding:.32rem .45rem;'
        +'border-radius:6px;cursor:pointer;font-size:.74rem';
      const tag=document.createElement('span');
      tag.textContent=x.k;
      tag.style.cssText='flex:0 0 34px;text-align:center;font-size:.58rem;font-weight:700;'
        +'padding:1px 0;border-radius:3px;border:1px solid var(--border);color:var(--muted2)';
      const lbl=document.createElement('span');
      lbl.textContent=x.v.l;
      lbl.style.cssText='flex:1;color:var(--text)';
      const cero=document.createElement('span');
      cero.textContent='0';
      cero.style.cssText='color:var(--muted);font-size:.68rem';
      row.appendChild(tag);row.appendChild(lbl);row.appendChild(cero);
      row.onmouseenter=()=>{row.style.background='rgba(255,255,255,.05)';};
      row.onmouseleave=()=>{row.style.background='';};
      row.onclick=()=>{_tmnCerrar();_tarLeySet(x.k);};
      div.appendChild(row);
    });
  });
}
