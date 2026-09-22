// ══════════════════════════════════════════════════════════════════════════
//  PANEL DE HORAS MÁQUINA — REPORTE MENSUAL DE UTILIZACIÓN
//
//  Compara, equipo por equipo, LA SEMANA elegida contra EL CORTE 21→20 que la
//  contiene: ¿la semana está tirando del mes hacia arriba o hacia abajo?
//
//  El corte se toma ACUMULADO desde el 21 hasta el fin de la semana elegida
//  (_rmPeriodo().aFin), no el mes cerrado: si el corte está en curso, comparar
//  contra un mes completo que todavía no ocurrió haría ganar siempre a la
//  semana.
//
//  Reglas, las mismas del panel:
//    H. Programadas = Nº de partes × horas por turno (⚙ del panel)
//    Utilización    = H. Efectivas ÷ H. Programadas       ≥75 % · 60–74 % · <60 %
//    Disp. mecánica = (H. Prog − H. Inoper.) ÷ H. Prog    ≥85 % · 75–84 % · <75 %
//    Meta del corte = _rmMetaDe(eq): Hrs Mín. Venta del Master, si no 210 h
//                     excavadoras y volquetes / 180 h el resto (🎯 del mensual)
//
//  Salen TODOS los equipos de línea, no solo los que reportaron. Los
//  desmovilizados quedan fuera.
//
//  Prefijo _phm. El período sale de _rmPeriodo(), las horas por turno de
//  _phHsProgTurno() y la meta de _rmMetaDe(): nada se calcula por duplicado.
// ══════════════════════════════════════════════════════════════════════════

// Equipos elegidos para el análisis (ids). Vacío = todos los de línea.
// Selección propia, aparte de la del reporte diario.
let _phmSel=(()=>{try{return new Set(JSON.parse(localStorage.getItem('gdar_phm_eqs')||'[]').map(Number));}catch(e){return new Set();}})();
function _phmSelGuardar(){try{localStorage.setItem('gdar_phm_eqs',JSON.stringify([..._phmSel]));}catch(e){}}
function _phmEquiposTodos(){
  const L=(typeof _PH_LINEAS!=='undefined')?_PH_LINEAS:['Línea Amarilla','Línea Blanca'];
  return (DB.equipos||[]).filter(e=>L.indexOf(e.tipo)>=0&&String(e.est||'')!=='Desmovilizado')
    .sort((a,b)=>a.tipo!==b.tipo?a.tipo.localeCompare(b.tipo)
      :String(a.codigo||'').localeCompare(String(b.codigo||'')));
}
function _phmSelCuenta(){
  const todos=_phmEquiposTodos();
  return{n:_phmSel.size?todos.filter(e=>_phmSel.has(+e.id)).length:todos.length,total:todos.length};
}
function _phmSelToggle(id,on){
  const todos=_phmEquiposTodos();
  if(!_phmSel.size)todos.forEach(e=>_phmSel.add(+e.id));
  if(on)_phmSel.add(+id); else _phmSel.delete(+id);
  if(_phmSel.size===todos.length)_phmSel.clear();
  _phmSelGuardar();rPanelHoras();
}
function _phmSelTodos(on){
  _phmSel.clear();
  if(!on)_phmSel.add(-1);
  _phmSelGuardar();rPanelHoras();
}
function _phmMenuEquipos(ev){
  if(typeof _tmnAbrir!=='function'){toast('El menú de equipos no está disponible',true);return;}
  _tmnAbrir(ev,'phmEquipos',255,div=>{
    const todos=_phmEquiposTodos();
    const marcado=id=>!_phmSel.size||_phmSel.has(+id);
    let linea='';
    todos.forEach(e=>{
      if(e.tipo!==linea){linea=e.tipo;div.appendChild(_tmnTitulo(linea));}
      div.appendChild(_tmnCheck(String(e.codigo||('#'+e.id)),
        e.tipo==='Línea Amarilla'?'#eab308':'#93a3b8',
        ()=>marcado(e.id),on=>_phmSelToggle(e.id,on)));
    });
    if(!todos.length)div.appendChild(_tmnTitulo('Sin equipos de línea'));
    const pie=document.createElement('div');
    pie.style.cssText='display:flex;gap:.3rem;padding:.4rem .35rem .1rem;border-top:1px solid var(--border);margin-top:.3rem';
    const bt=(txt,col,fn)=>{
      const b=document.createElement('button');
      b.textContent=txt;
      b.style.cssText='flex:1;font-size:.68rem;font-weight:700;padding:.25rem 0;border-radius:6px;'
        +'border:1px solid '+col+'55;background:'+col+'18;color:'+col+';cursor:pointer';
      b.onclick=()=>{_tmnCerrar();fn();};
      return b;
    };
    pie.appendChild(bt('Todos','#22d3ee',()=>_phmSelTodos(true)));
    pie.appendChild(bt('Ninguno','#94a3b8',()=>_phmSelTodos(false)));
    div.appendChild(pie);
  });
}

const _phmDMY=s=>String(s).slice(8,10)+'/'+String(s).slice(5,7)+'/'+String(s).slice(0,4);

// ── Observaciones del reporte ───────────────────────────────────────────────
// Misma tabla que el reporte diario, distinguidas por ambito='mes'. Van atadas
// al CIERRE DEL CORTE (el 20), así que al moverse de semana dentro del mismo
// mes se siguen viendo las mismas observaciones.
let _phmComEdit=null;
function _phmComs(){
  const cierre=_rmPeriodo().cFin;
  return (DB.comentariosDia||[]).filter(c=>String(c.ambito||'')==='mes'&&String(c.fecha||'')===cierre)
    .sort((a,b)=>(+a.id||0)-(+b.id||0));
}
function _phmComAbrir(){
  _phmComEdit=null;
  const sel=document.getElementById('phmComEq');
  if(sel){
    sel.innerHTML='<option value="">— General (todo el corte) —</option>'
      +_phmEquiposTodos().map(e=>`<option value="${+e.id}">${_phdEsc(e.codigo||('#'+e.id))}`
        +`${e.sub?' · '+_phdEsc(e.sub):''}</option>`).join('');
    sel.value='';
  }
  const t=document.getElementById('phmComTxt');if(t)t.value='';
  const P=_rmPeriodo();
  const d=document.getElementById('phmComPer');
  if(d)d.textContent='Corte '+_phmDMY(P.cIni)+' al '+_phmDMY(P.cFin);
  _phmComBoton();
  _phmComLista();
  openM('mPhmCom');
  setTimeout(()=>{const el=document.getElementById('phmComTxt');if(el)el.focus();},120);
}
function _phmComBoton(){
  const b=document.getElementById('phmComBtn');
  if(b)b.textContent=_phmComEdit==null?'＋ Agregar':'💾 Guardar cambios';
  const c=document.getElementById('phmComCancel');
  if(c)c.style.display=_phmComEdit==null?'none':'';
}
function _phmComCancelar(){
  _phmComEdit=null;
  const t=document.getElementById('phmComTxt');if(t)t.value='';
  const s=document.getElementById('phmComEq');if(s)s.value='';
  _phmComBoton();_phmComLista();
}
function _phmComLista(){
  const el=document.getElementById('phmComLista');if(!el)return;
  const lista=_phmComs();
  el.innerHTML=lista.length?lista.map(c=>`
    <div style="display:flex;gap:.5rem;align-items:flex-start;padding:.4rem .5rem;border:1px solid ${+c.id===+_phmComEdit?'var(--ceq)':'var(--border)'};border-radius:6px;background:var(--panel2);margin-bottom:.35rem">
      <span style="font-size:.64rem;font-weight:800;font-family:monospace;color:${c.eqId?'var(--ceq)':'var(--muted2)'};white-space:nowrap;padding-top:.1rem">${_phdEsc(_phdComEqNom(c.eqId))}</span>
      <span style="flex:1;font-size:.72rem;color:var(--text);white-space:pre-wrap;line-height:1.35">${_phdEsc(c.texto)}</span>
      <button onclick="_phmComEditar(${+c.id})" title="Editar" style="background:none;border:1px solid var(--border);border-radius:5px;color:var(--muted2);cursor:pointer;font-size:.7rem;padding:.1rem .35rem">✏️</button>
      <button onclick="_phmComBorrar(${+c.id})" title="Quitar" style="background:none;border:1px solid #7f1d1d;border-radius:5px;color:#f87171;cursor:pointer;font-size:.7rem;padding:.1rem .35rem">🗑</button>
    </div>`).join('')
    :`<div style="font-size:.72rem;color:var(--muted2);padding:.6rem;text-align:center">Sin observaciones para este corte. Si no agrega ninguna, el PDF sale como hasta ahora.</div>`;
}
function _phmComEditar(id){
  const c=(DB.comentariosDia||[]).find(x=>+x.id===+id);if(!c)return;
  _phmComEdit=+c.id;
  const s=document.getElementById('phmComEq');if(s)s.value=c.eqId?String(+c.eqId):'';
  const t=document.getElementById('phmComTxt');if(t){t.value=c.texto||'';t.focus();}
  _phmComBoton();_phmComLista();
}
async function _phmComGuardar(){
  const txt=(document.getElementById('phmComTxt')?.value||'').trim();
  if(!txt){toast('Escriba el comentario',true);return;}
  const eqV=document.getElementById('phmComEq')?.value||'';
  const eqId=eqV?+eqV:null;

  DB.comentariosDia=DB.comentariosDia||[];
  const nuevo=_phmComEdit==null;
  const prev=nuevo?null:DB.comentariosDia.find(c=>+c.id===+_phmComEdit);
  const rec={id:nuevo?nidSeguro('cmd','comentariosDia'):+_phmComEdit,
    ambito:'mes',fecha:_rmPeriodo().cFin,eqId,texto:txt,
    creadoPor:(typeof CU!=='undefined'&&CU?String(CU.nombre||CU.codigo||''):'')||null};
  if(nuevo)DB.comentariosDia.push({...rec});
  const err=await supaUpsert('comentariosDia',rec);
  if(err){if(nuevo)DB.comentariosDia=DB.comentariosDia.filter(c=>+c.id!==+rec.id);return;}
  if(prev)Object.assign(prev,rec);

  _phmComEdit=null;
  const t=document.getElementById('phmComTxt');if(t){t.value='';t.focus();}
  _phmComBoton();_phmComLista();
  rPanelHoras();
  toast('✓ Observación '+(nuevo?'agregada':'actualizada'));
}
async function _phmComBorrar(id){
  const c=(DB.comentariosDia||[]).find(x=>+x.id===+id);if(!c)return;
  if(!confirm('¿Quitar esta observación del reporte?\n\n'+(c.texto||'')))return;
  await supaDelete('comentariosDia',c.id);
  DB.comentariosDia=(DB.comentariosDia||[]).filter(x=>+x.id!==+c.id);
  if(+_phmComEdit===+c.id)_phmComEdit=null;
  _phmComBoton();_phmComLista();
  rPanelHoras();
  toast('Observación quitada');
}

// ── Datos: la semana y el corte acumulado, lado a lado ──────────────────────
function _phmDatos(){
  const HP=typeof _phHsProgTurno==='function'?_phHsProgTurno():10;
  const P=_rmPeriodo();
  const LINEAS=(typeof _PH_LINEAS!=='undefined')?_PH_LINEAS:['Línea Amarilla','Línea Blanca'];
  const eqs=(DB.equipos||[]).filter(e=>LINEAS.indexOf(e.tipo)>=0&&String(e.est||'')!=='Desmovilizado'
    &&(!_phmSel.size||_phmSel.has(+e.id)));
  const porId={};
  eqs.forEach(e=>{porId[e.id]={eq:e,tipo:e.tipo,sub:String(e.sub||'').toUpperCase(),
    nSem:0,efSem:0,imSem:0,nCor:0,efCor:0,imCor:0,diasCor:new Set()};});

  (DB.partes||[]).forEach(p=>{
    if(!p.fecha||!p.eqId)return;
    const r=porId[p.eqId];
    if(!r)return;
    const ef=Math.max(0,+p.ef||0), im=Math.max(0,+p.im||0);
    if(p.fecha>=P.fIni&&p.fecha<=P.fFin){r.nSem++;r.efSem+=ef;r.imSem+=im;}
    if(p.fecha>=P.cIni&&p.fecha<=P.aFin){r.nCor++;r.efCor+=ef;r.imCor+=im;r.diasCor.add(p.fecha);}
  });

  const metaDe=eq=>(typeof _rmMetaDe==='function'?_rmMetaDe(eq):180);
  const filas=Object.values(porId).map(r=>{
    const progSem=r.nSem*HP, progCor=r.nCor*HP, meta=metaDe(r.eq);
    const utilSem=progSem?r.efSem/progSem*100:0;
    const utilCor=progCor?r.efCor/progCor*100:0;
    return{...r,dias:r.diasCor.size,progSem,progCor,meta,utilSem,utilCor,
      dmSem:progSem?Math.max(0,(progSem-r.imSem)/progSem*100):100,
      dmCor:progCor?Math.max(0,(progCor-r.imCor)/progCor*100):100,
      avance:meta?r.efCor/meta*100:0,
      dif:utilSem-utilCor};
  }).sort((a,b)=>a.tipo!==b.tipo?a.tipo.localeCompare(b.tipo)
    :(a.sub!==b.sub?a.sub.localeCompare(b.sub)
    :String(a.eq.codigo||'').localeCompare(String(b.eq.codigo||''))));

  const tot=f=>{
    const T={progSem:0,efSem:0,imSem:0,progCor:0,efCor:0,imCor:0,meta:0,n:f.length};
    f.forEach(r=>{T.progSem+=r.progSem;T.efSem+=r.efSem;T.imSem+=r.imSem;
      T.progCor+=r.progCor;T.efCor+=r.efCor;T.imCor+=r.imCor;T.meta+=r.meta;});
    T.utilSem=T.progSem?T.efSem/T.progSem*100:0;
    T.utilCor=T.progCor?T.efCor/T.progCor*100:0;
    T.dmSem=T.progSem?Math.max(0,(T.progSem-T.imSem)/T.progSem*100):100;
    T.dmCor=T.progCor?Math.max(0,(T.progCor-T.imCor)/T.progCor*100):100;
    T.avance=T.meta?T.efCor/T.meta*100:0;
    T.dif=T.utilSem-T.utilCor;
    // Cuántos equipos con actividad en ambas ventanas mejoraron y cuántos no
    const comp=f.filter(r=>r.nSem&&r.nCor);
    T.mejoran=comp.filter(r=>r.dif>0).length;
    T.empeoran=comp.filter(r=>r.dif<0).length;
    T.comparables=comp.length;
    return T;
  };
  const T=tot(filas);

  return{HP,P,lineas:LINEAS,filas,total:T,totalDe:tot,
    fIni:P.fIni,fFin:P.fFin,cIni:P.cIni,cFin:P.cFin,aFin:P.aFin,
    diasCorte:P.diasCorte,diasTrans:P.diasTrans};
}

// ── Documento de presentación ───────────────────────────────────────────────
function _phmDoc(){
  const D=_phmDatos();
  const fmt1=v=>(+v||0).toLocaleString('es-PE',{maximumFractionDigits:1});
  const logoUrl=(typeof EMPRESA!=='undefined')?new URL(EMPRESA.logo,location.href).href:'';
  const AZ='#1e3a5f';
  const utlCol=u=>u>=75?'#15803d':u>=60?'#b45309':'#b91c1c';
  const dmCol=u=>u>=85?'#15803d':u>=75?'#b45309':'#b91c1c';
  const avCol=u=>u>=100?'#15803d':u>=60?'#b45309':'#b91c1c';
  const difCol=d=>d>0.05?'#15803d':d<-0.05?'#b91c1c':'#555';
  const difTxt=d=>(d>0.05?'▲ +':d<-0.05?'▼ ':'= ')+Math.abs(d).toFixed(1);
  const sec=t=>`<div style="font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:.05em;color:${AZ};border-bottom:2px solid ${AZ};padding-bottom:3px;margin:16px 0 6px">${t}</div>`;
  const TH=`padding:4px 5px;font-size:9px;background:${AZ};color:#fff;text-transform:uppercase;letter-spacing:.02em;border:1px solid ${AZ}`;
  const TH2=`padding:3px 5px;font-size:9px;color:#fff;text-transform:uppercase;letter-spacing:.03em;border:1px solid ${AZ};font-weight:800`;
  const TD='padding:3px 5px;font-size:10px;border:1px solid #bbb;color:#111';
  const TBL='width:100%;border-collapse:collapse;page-break-inside:auto';
  const kpi=(lbl,val,col)=>`<div style="min-width:0;border:2px solid ${col};border-radius:8px;padding:6px 8px"><div style="font-size:8px;text-transform:uppercase;letter-spacing:.05em;color:#555;font-weight:700">${lbl}</div><div style="font-size:15px;font-weight:900;color:${col};white-space:nowrap">${val}</div></div>`;
  const pct=(u,col)=>`<span style="font-weight:900;color:${col(u)}">${u.toFixed(1)}%</span>`;

  const META_PCT=75;
  // Etiquetas sobre las barras y sobre la línea de meta
  const vlBarras={id:'vlBarrasMes',afterDatasetsDraw(chart){
    const ctx=chart.ctx;
    ctx.save();ctx.textAlign='center';
    chart.data.datasets.forEach((ds,di)=>{
      if(ds.type==='line')return;
      const m=chart.getDatasetMeta(di);if(!m)return;
      const esCorte=ds.label==='Corte';
      ctx.fillStyle=esCorte?'#64748b':'#1e3a5f';
      ctx.font='bold '+(esCorte?'9':'10')+'px Arial';
      m.data.forEach((bar,i)=>{const v=ds.data[i];if(v!=null)ctx.fillText((+v).toLocaleString('es-PE')+'%',bar.x,bar.y-4);});
    });
    const dsL=chart.data.datasets[0];
    if(dsL&&dsL.type==='line'){
      const dmL=chart.getDatasetMeta(0);
      if(dmL){
        ctx.fillStyle='#dc2626';ctx.font='bold 9px Arial';
        dmL.data.forEach((pt,i)=>{
          const v=dsL.data[i];if(v==null||i!==0)return;
          ctx.fillText('Meta '+(+v).toLocaleString('es-PE')+'%',pt.x,pt.y-6);
        });
      }
    }
    ctx.restore();
  }};
  const chartImg=(items,titulo)=>{
    if(typeof Chart==='undefined'||!items.length)return'';
    const cv=document.createElement('canvas');cv.width=980;cv.height=430;
    const ch=new Chart(cv.getContext('2d'),{
      type:'bar',
      data:{
        labels:items.map(r=>r.eq?r.eq.codigo:'#'+r.eq),
        datasets:[
          {type:'line',label:'Meta '+META_PCT+'%',data:items.map(()=>META_PCT),borderColor:'#dc2626',borderDash:[6,4],borderWidth:2,pointRadius:0},
          {label:'Semana',data:items.map(r=>+r.utilSem.toFixed(1)),backgroundColor:items.map(r=>utlCol(r.utilSem)),borderRadius:3},
          // Al costado, lo acumulado del corte, en gris
          {label:'Corte',data:items.map(r=>+r.utilCor.toFixed(1)),backgroundColor:'#94a3b8',borderRadius:3}
        ]
      },
      options:{responsive:false,animation:false,devicePixelRatio:2,
        layout:{padding:{top:14}},
        plugins:{legend:{display:false},title:{display:true,text:titulo,color:AZ,font:{size:13,weight:'bold'}}},
        scales:{
          x:{ticks:{color:'#333',font:{size:9,weight:'bold'}},grid:{display:false}},
          y:{beginAtZero:true,suggestedMax:100,ticks:{color:'#333',font:{size:9},callback:v=>v+' %'},grid:{color:'#ddd'}}
        }},
      plugins:[vlBarras]
    });
    const url=cv.toDataURL('image/png');
    ch.destroy();
    return url;
  };

  let graficos='';
  D.lineas.forEach(linea=>{
    const items=D.filas.filter(r=>r.tipo===linea);
    if(!items.length)return;
    const g=chartImg(items,'UTILIZACIÓN — '+linea.toUpperCase()
      +' · SEMANA '+_phmDMY(D.fIni).slice(0,5)+'–'+_phmDMY(D.fFin).slice(0,5)
      +' vs. CORTE AL '+_phmDMY(D.aFin).slice(0,5));
    if(!g)return;
    graficos+=`<div style="page-break-inside:avoid;border:1px solid #ccc;border-radius:6px;padding:4px;background:#fff;margin-top:8px"><img src="${g}" style="width:100%;display:block"></div>`;
  });
  if(graficos)graficos+=`<div style="font-size:8.5px;color:#666;margin-top:3px">Barra de color = % de la semana, con el semáforo: <span style="color:#15803d">■</span> ≥75% · <span style="color:#b45309">■</span> 60–74% · <span style="color:#b91c1c">■</span> &lt;60% · <span style="color:#dc2626">▬ ▬</span> meta 75% · <span style="color:#94a3b8">■</span> barra gris = acumulado del corte ${_phmDMY(D.cIni)} al ${_phmDMY(D.aFin)} · el equipo sin partes aparece en 0%</div>`;

  // Tabla comparativa, agrupada por línea
  const fila=r=>`<tr${r.nSem||r.nCor?'':' style="background:#fdf6f6"'}>
    <td style="${TD};white-space:nowrap"><b>${r.eq.codigo||''}</b></td>
    <td style="${TD};font-size:9px;color:#555">${r.sub||''}</td>
    <td style="${TD};text-align:right">${r.progSem?fmt1(r.progSem):'—'}</td>
    <td style="${TD};text-align:right;font-weight:700">${r.nSem?fmt1(r.efSem):'—'}</td>
    <td style="${TD};text-align:right">${r.nSem?pct(r.utilSem,utlCol):'<span style="color:#b91c1c;font-weight:700;font-size:8.5px">SIN PARTE</span>'}</td>
    <td style="${TD};text-align:right">${r.nSem?pct(r.dmSem,dmCol):'—'}</td>
    <td style="${TD};text-align:right;background:#f6f8fa">${r.progCor?fmt1(r.progCor):'—'}</td>
    <td style="${TD};text-align:right;background:#f6f8fa;font-weight:700">${r.nCor?fmt1(r.efCor):'—'}</td>
    <td style="${TD};text-align:right;background:#f6f8fa">${r.nCor?pct(r.utilCor,utlCol):'—'}</td>
    <td style="${TD};text-align:right;background:#f6f8fa">${r.nCor?pct(r.dmCor,dmCol):'—'}</td>
    <td style="${TD};text-align:right;font-weight:900;color:${difCol(r.dif)}">${r.nSem&&r.nCor?difTxt(r.dif):'—'}</td>
    <td style="${TD};text-align:right;color:#555">${fmt1(r.meta)}</td>
    <td style="${TD};text-align:right;font-weight:900;color:${avCol(r.avance)}">${r.avance.toFixed(1)}%</td>
  </tr>`;
  let tabla='';
  D.lineas.forEach(linea=>{
    const items=D.filas.filter(r=>r.tipo===linea);
    if(!items.length)return;
    const S=D.totalDe(items);
    tabla+=`<tr><td colspan="13" style="${TD};background:#e8edf3;font-weight:900;color:${AZ};text-transform:uppercase">${linea} · ${items.length} equipo(s)</td></tr>`;
    items.forEach(r=>{tabla+=fila(r);});
    tabla+=`<tr style="background:#eef2f7;font-weight:800">
      <td style="${TD}" colspan="2">Subtotal ${linea}</td>
      <td style="${TD};text-align:right">${fmt1(S.progSem)}</td>
      <td style="${TD};text-align:right">${fmt1(S.efSem)}</td>
      <td style="${TD};text-align:right">${pct(S.utilSem,utlCol)}</td>
      <td style="${TD};text-align:right">${pct(S.dmSem,dmCol)}</td>
      <td style="${TD};text-align:right">${fmt1(S.progCor)}</td>
      <td style="${TD};text-align:right">${fmt1(S.efCor)}</td>
      <td style="${TD};text-align:right">${pct(S.utilCor,utlCol)}</td>
      <td style="${TD};text-align:right">${pct(S.dmCor,dmCol)}</td>
      <td style="${TD};text-align:right;color:${difCol(S.dif)}">${difTxt(S.dif)}</td>
      <td style="${TD};text-align:right">${fmt1(S.meta)}</td>
      <td style="${TD};text-align:right;color:${avCol(S.avance)}">${S.avance.toFixed(1)}%</td>
    </tr>`;
  });

  const coms=_phmComs();
  const obs=coms.length?sec('Observaciones')+`<table style="${TBL}">
      <tr><th style="${TH};text-align:left;width:130px">Equipo</th><th style="${TH};text-align:left">Comentario</th></tr>
      ${coms.map(c=>`<tr>
        <td style="${TD};white-space:nowrap;font-weight:800;color:${c.eqId?AZ:'#555'}">${_phdEsc(_phdComEqNom(c.eqId))}</td>
        <td style="${TD};white-space:pre-wrap;line-height:1.35">${_phdEsc(c.texto)}</td>
      </tr>`).join('')}
    </table>`:'';

  const T=D.total;
  return`
  <div style="font-family:Arial,Helvetica,sans-serif;color:#111">
    <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;border-bottom:3px solid ${AZ};padding-bottom:6px">
      <div style="flex:1;font-size:10px;color:#333">
        <div style="font-weight:800;color:${AZ}">Corte ${_phmDMY(D.cIni)} al ${_phmDMY(D.cFin)}</div>
        <div>Acumulado al ${_phmDMY(D.aFin)} · ${D.diasTrans} de ${D.diasCorte} días</div>
        <div>Semana ${_phmDMY(D.fIni)} al ${_phmDMY(D.fFin)}</div>
      </div>
      <div style="flex:2;text-align:center">
        <div style="font-size:19px;font-weight:900;color:${AZ};letter-spacing:.03em">REPORTE MENSUAL — UTILIZACIÓN DE EQUIPOS</div>
        <div style="font-size:11px;font-weight:800;color:#2563eb;margin-top:2px">RELAVERA R3 COTA 4416: RECRECIMIENTO DEL DIQUE ETAPA 2 FASE 4</div>
      </div>
      <div style="flex:1;text-align:right">${logoUrl?`<img src="${logoUrl}" alt="ECOSERMO" style="height:46px;max-width:175px;object-fit:contain">`:''}</div>
    </div>

    <div style="display:grid;grid-auto-flow:column;grid-auto-columns:1fr;gap:6px;margin-top:10px">
      ${kpi('Utilización de la semana',T.progSem?T.utilSem.toFixed(1)+'%':'—',utlCol(T.utilSem))}
      ${kpi('Utilización del corte',T.progCor?T.utilCor.toFixed(1)+'%':'—',utlCol(T.utilCor))}
      ${kpi('La semana vs el corte',T.comparables?difTxt(T.dif)+' pp':'—',difCol(T.dif))}
      ${kpi('Equipos que mejoran',T.mejoran+' de '+T.comparables,T.mejoran>=T.empeoran?'#15803d':'#b91c1c')}
      ${kpi('Disp. mecánica del corte',T.progCor?T.dmCor.toFixed(1)+'%':'—',dmCol(T.dmCor))}
      ${kpi('Avance vs meta del corte',T.avance.toFixed(1)+'%',avCol(T.avance))}
    </div>

    ${graficos}

    ${sec('Semana vs corte por equipo')}
    <table style="${TBL}">
      <tr>
        <th style="${TH};text-align:left" rowspan="2">Equipo</th>
        <th style="${TH};text-align:left" rowspan="2">Subtipo</th>
        <th style="${TH2};background:#2a5a8f" colspan="4">Semana ${_phmDMY(D.fIni).slice(0,5)} – ${_phmDMY(D.fFin).slice(0,5)}</th>
        <th style="${TH2};background:#3f6ea3" colspan="4">Corte acumulado al ${_phmDMY(D.aFin).slice(0,5)}</th>
        <th style="${TH};text-align:center" rowspan="2">Δ Utiliz.<br>(puntos)</th>
        <th style="${TH2};background:#2a5a8f" colspan="2">Meta del corte</th>
      </tr>
      <tr>
        <th style="${TH}">H. Prog.</th><th style="${TH}">H. Efect.</th><th style="${TH}">Utiliz. %</th><th style="${TH}">D.M. %</th>
        <th style="${TH}">H. Prog.</th><th style="${TH}">H. Efect.</th><th style="${TH}">Utiliz. %</th><th style="${TH}">D.M. %</th>
        <th style="${TH}">Horas</th><th style="${TH}">Avance %</th>
      </tr>
      ${tabla||`<tr><td colspan="13" style="${TD};text-align:center;color:#777">Sin equipos de línea registrados</td></tr>`}
      ${D.filas.length?`<tr style="background:#dde5ee;font-weight:900">
        <td style="${TD}" colspan="2">TOTAL</td>
        <td style="${TD};text-align:right">${fmt1(T.progSem)}</td>
        <td style="${TD};text-align:right">${fmt1(T.efSem)}</td>
        <td style="${TD};text-align:right">${pct(T.utilSem,utlCol)}</td>
        <td style="${TD};text-align:right">${pct(T.dmSem,dmCol)}</td>
        <td style="${TD};text-align:right">${fmt1(T.progCor)}</td>
        <td style="${TD};text-align:right">${fmt1(T.efCor)}</td>
        <td style="${TD};text-align:right">${pct(T.utilCor,utlCol)}</td>
        <td style="${TD};text-align:right">${pct(T.dmCor,dmCol)}</td>
        <td style="${TD};text-align:right;color:${difCol(T.dif)}">${difTxt(T.dif)}</td>
        <td style="${TD};text-align:right">${fmt1(T.meta)}</td>
        <td style="${TD};text-align:right;color:${avCol(T.avance)}">${T.avance.toFixed(1)}%</td>
      </tr>`:''}
    </table>
    <div style="font-size:8.5px;color:#666;margin-top:2px">
      H. Prog. = Nº de partes × ${D.HP}h · Utiliz. = H. Efect. ÷ H. Prog. ·
      D.M. = (H. Prog. − H. Inoper.) ÷ H. Prog. ·
      Δ = utilización de la semana menos la del corte, en puntos porcentuales ·
      Avance = H. Efect. del corte ÷ meta del equipo ·
      Utiliz.: <span style="color:#15803d">■</span> ≥75% · <span style="color:#b45309">■</span> 60–74% · <span style="color:#b91c1c">■</span> &lt;60% ·
      D.M.: <span style="color:#15803d">■</span> ≥85% · <span style="color:#b45309">■</span> 75–84% · <span style="color:#b91c1c">■</span> &lt;75% ·
      el corte se acumula del ${_phmDMY(D.cIni)} al ${_phmDMY(D.aFin)}, no al mes cerrado · los equipos desmovilizados no se listan
    </div>

    ${obs}
  </div>`;
}

// ── Excel ───────────────────────────────────────────────────────────────────
function _phmExportXls(){
  if(typeof XLSX==='undefined'){toast('Librería Excel no disponible',true);return;}
  const D=_phmDatos();
  const n1=v=>+(+v||0).toFixed(1);
  const aoa=[
    ['REPORTE MENSUAL — UTILIZACIÓN DE EQUIPOS'],
    ['Corte',_phmDMY(D.cIni)+' al '+_phmDMY(D.cFin),'Acumulado al',_phmDMY(D.aFin),
     'Semana',_phmDMY(D.fIni)+' al '+_phmDMY(D.fFin),'Horas por turno',D.HP],
    [],
    ['Equipo','Subtipo','Línea',
     'Sem H. Prog.','Sem H. Efect.','Sem Utiliz. %','Sem D.M. %',
     'Corte H. Prog.','Corte H. Efect.','Corte Utiliz. %','Corte D.M. %',
     'Δ Utiliz. (pp)','Meta h','Avance %']
  ];
  D.filas.forEach(r=>aoa.push([r.eq.codigo||'',r.sub||'',r.tipo||'',
    n1(r.progSem),n1(r.efSem),n1(r.utilSem),n1(r.dmSem),
    n1(r.progCor),n1(r.efCor),n1(r.utilCor),n1(r.dmCor),
    n1(r.dif),n1(r.meta),n1(r.avance)]));
  const T=D.total;
  aoa.push(['TOTAL','','',
    n1(T.progSem),n1(T.efSem),n1(T.utilSem),n1(T.dmSem),
    n1(T.progCor),n1(T.efCor),n1(T.utilCor),n1(T.dmCor),
    n1(T.dif),n1(T.meta),n1(T.avance)]);
  const coms=_phmComs();
  if(coms.length){
    aoa.push([],['OBSERVACIONES'],['Equipo','Comentario']);
    coms.forEach(c=>aoa.push([_phdComEqNom(c.eqId),c.texto||'']));
  }
  const ws=XLSX.utils.aoa_to_sheet(aoa);
  ws['!cols']=[{wch:16},{wch:16},{wch:14}].concat(Array(11).fill({wch:13}));
  const wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,ws,'Mensual vs Semana');
  XLSX.writeFile(wb,'Reporte Mensual Utilizacion '+D.cIni+' al '+D.aFin+'.xlsx');
}

// ── Impresión (mismo motor que los demás reportes del panel) ────────────────
function _phmPrint(){
  const win=window.open('','_blank');
  if(!win){toast('Active ventanas emergentes para imprimir',true);return;}
  win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Reporte Mensual Horas Máquina</title>
  <style>body{margin:0;background:#fff}*{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}img{max-width:100%}#doc{width:1010px;padding:20px;box-sizing:content-box;zoom:0.7559}.salto-pdf{page-break-after:always;break-after:page;height:0}</style>
  </head><body><div id="doc">${_phmDoc()}</div>
  <script>
  window.onload=function(){
    var d=document.getElementById('doc');
    var r=d.getBoundingClientRect();
    var cortes=[r.top];
    Array.prototype.forEach.call(d.querySelectorAll('.salto-pdf'),function(m){cortes.push(m.getBoundingClientRect().bottom);});
    cortes.push(r.bottom+60);
    var altos=[];
    for(var i=1;i<cortes.length;i++)altos.push(cortes[i]-cortes[i-1]);
    var hpx=Math.max.apply(null,altos)+8;
    var hmm=Math.ceil(hpx/96*25.4);
    var st=document.createElement('style');
    st.textContent='@page{size:210mm '+hmm+'mm;margin:0}';
    document.head.appendChild(st);
    window.print();
  };
  <${'/'}script></body></html>`);
  win.document.close();
}

// ── Pestaña ─────────────────────────────────────────────────────────────────
function _phmRender(){
  const el=document.getElementById('phTabBody');if(!el)return;
  const P=_rmPeriodo();
  const inpS='font-size:.72rem;padding:.2rem .4rem;border-radius:5px;border:1px solid var(--border);background:var(--panel2);color:var(--text);flex-shrink:0';
  const nCom=_phmComs().length;
  const C=_phmSelCuenta();
  const bar=`<div style="display:flex;align-items:center;gap:.5rem;flex-wrap:wrap;margin-bottom:.8rem;padding:.4rem .7rem;background:var(--panel2);border:1px solid var(--border);border-radius:8px">
    <span style="font-size:.62rem;color:var(--muted2);font-weight:700;text-transform:uppercase;letter-spacing:.08em">Semana</span>
    <button onclick="_phNav(-7)" style="background:none;border:1px solid var(--border);border-radius:5px;color:var(--text);cursor:pointer;font-size:.85rem;padding:.12rem .5rem" title="Semana anterior">‹</button>
    <input type="date" value="${_phSemIni}" onchange="_phSemIni=this.value;rPanelHoras()" style="${inpS};width:135px">
    <button onclick="_phNav(7)" style="background:none;border:1px solid var(--border);border-radius:5px;color:var(--text);cursor:pointer;font-size:.85rem;padding:.12rem .5rem" title="Semana siguiente">›</button>
    <button onclick="_phSemIni=_phSemDefault();rPanelHoras()" style="font-size:.62rem;padding:.2rem .5rem;border-radius:5px;border:1px solid var(--border);background:transparent;color:var(--muted2);cursor:pointer">Semana actual (Lun)</button>
    <div style="width:1px;height:18px;background:var(--border)"></div>
    <button onclick="_phmMenuEquipos(event)" style="font-size:.62rem;padding:.2rem .55rem;border-radius:5px;border:1px solid ${_phmSel.size?'var(--ceq)':'var(--border)'};background:${_phmSel.size?'rgba(249,115,22,.15)':'transparent'};color:${_phmSel.size?'var(--ceq)':'var(--muted2)'};cursor:pointer;white-space:nowrap;font-weight:${_phmSel.size?'700':'400'}" title="Elegir por código qué equipos entran en el análisis">🚜 Equipos (${C.n}/${C.total}) ▾</button>
    <button onclick="_phmComAbrir()" style="font-size:.62rem;padding:.2rem .55rem;border-radius:5px;border:1px solid ${nCom?'#22c55e':'var(--border)'};background:${nCom?'rgba(34,197,94,.15)':'transparent'};color:${nCom?'#22c55e':'var(--muted2)'};cursor:pointer;white-space:nowrap;font-weight:${nCom?'700':'400'}" title="Observaciones que salen al pie del PDF de este corte">💬 Comentarios (${nCom}) ▾</button>
    <span style="font-size:.62rem;color:var(--muted2)">Corte ${_phmDMY(P.cIni)} al ${_phmDMY(P.cFin)} · acumulado al ${_phmDMY(P.aFin)}</span>
    <button onclick="_phmExportXls()" style="margin-left:auto;font-size:.72rem;padding:.3rem .8rem;border-radius:6px;border:1px solid #15803d;background:rgba(21,128,61,.15);color:#22c55e;cursor:pointer;font-weight:800;white-space:nowrap">⬇ Excel</button>
    <button onclick="_phmPrint()" style="font-size:.72rem;padding:.3rem .9rem;border-radius:6px;border:none;background:#b91c1c;color:#fff;cursor:pointer;font-weight:800;white-space:nowrap">🖨 Imprimir / PDF</button>
  </div>`;
  el.innerHTML=bar+`<div style="background:#fff;border-radius:8px;padding:1.1rem 1.4rem;max-width:1050px;box-shadow:0 4px 18px rgba(0,0,0,.45)">${_phmDoc()}</div>`;
}
