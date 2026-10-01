// ══════════════════════════════════════════════════════════════════════════
//  HISTOGRAMA — tab del Resumen Diario de Tareaje
//  Cantidad de personal por cargo (apilado por guardia) y por tipo de jornada,
//  con filtro Staff / Obrero, selección de cargos y situación del día.
//  Usa la misma fecha, proyecto y guardia de la cabecera de la página.
// ══════════════════════════════════════════════════════════════════════════

const _TH_GUARD=['A','B','C','—'];
const _TH_GCOL={A:'#f59e0b',B:'#a855f7',C:'#10b981','—':'#64748b'};
const _TH_JORN={
  obra:{lbl:'En obra (TD, TN, DLT, A5)',tipos:['TD','TN','DLT','A5']},
  libre:{lbl:'Día libre (DL)',tipos:['DL']},
  aus:{lbl:'Ausentes (F, DM, P, V…)',tipos:['F','DM','P','V','LP','LM','LF']},
  todos:{lbl:'Todos los asignados',tipos:null}
};
const _TH_TIPO_ORD=['TD','TN','DLT','A5','DL','F','DM','P','V','LP','LM','LF'];

let _thCat='';                // '' | 'STAFF' | 'OBRERO'
let _thJorn='obra';
let _thOcultos=new Set();     // cargos desmarcados (los nuevos aparecen marcados)
let _thChartCargo=null,_thChartTipo=null;

function _thEsc(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function _thCatDe(p){return p.tipo==='Staff'?'STAFF':'OBRERO';}

// Personal con marcación ese día, según fecha / proyecto / guardia / Staff-Obrero / jornada
function _thDatos(){
  const fecha=document.getElementById('tarPgFecha')?.value||today();
  const proy=document.getElementById('tarPgProy')?.value||'';
  const gSel=document.getElementById('tarPgGuardia')?.value||'';
  const tipoDe={};
  (DB.tareaje||[]).filter(r=>r.fecha===fecha&&(!proy||r.proy===proy||!r.proy))
    .forEach(r=>{tipoDe[r.personalId]=r.tipo;});
  const permitidos=_TH_JORN[_thJorn].tipos;
  const filas=[];
  (DB.personal||[]).forEach(p=>{
    if((p.est||'Activo')!=='Activo')return;
    const t=tipoDe[p.id];if(!t)return;
    if(permitidos?!permitidos.includes(t):!_TH_TIPO_ORD.includes(t))return;
    if(_thCat&&_thCatDe(p)!==_thCat)return;
    let g=String(p.guardia||'').trim().toUpperCase();
    if(!['A','B','C'].includes(g))g='—';
    if(gSel&&g!==gSel)return;
    filas.push({p,tipo:t,g,cargo:(p.cargo||'SIN CARGO').toUpperCase().trim()});
  });
  return{fecha,proy,filas};
}

// Etiqueta de cada segmento (dentro de la barra) y total al final de la barra
const _thVL={id:'thVL',afterDatasetsDraw(chart){
  const ctx=chart.ctx,hor=chart.options.indexAxis==='y';
  const fin=[];
  ctx.save();ctx.textBaseline='middle';ctx.textAlign='center';ctx.font='bold 10px Arial';
  chart.data.datasets.forEach((ds,di)=>{
    const m=chart.getDatasetMeta(di);if(!m||m.hidden)return;
    m.data.forEach((bar,i)=>{
      const v=+ds.data[i]||0;if(!v)return;
      fin[i]=hor?Math.max(fin[i]??-1e9,bar.x):Math.min(fin[i]??1e9,bar.y);
      const largo=hor?Math.abs(bar.x-bar.base):Math.abs(bar.base-bar.y);
      if(largo<14)return;                                  // segmento muy chico: solo cuenta en el total
      ctx.fillStyle='#fff';
      ctx.fillText(v,hor?(bar.x+bar.base)/2:bar.x,hor?bar.y:(bar.y+bar.base)/2);
    });
  });
  const tot=chart.$thTot||[];
  ctx.font='bold 11px Arial';ctx.fillStyle='#e2e8f0';
  tot.forEach((v,i)=>{
    if(!v||fin[i]==null)return;
    const m0=chart.getDatasetMeta(0).data[i];
    if(hor){ctx.textAlign='left';ctx.fillText(v,fin[i]+5,m0.y);}
    else{ctx.textAlign='center';ctx.textBaseline='bottom';ctx.fillText(v,m0.x,fin[i]-3);}
  });
  ctx.restore();
}};

function _thChart(cv,labels,porGrupo,horizontal){
  const usadas=_TH_GUARD.filter(g=>labels.some(l=>porGrupo[l][g]));
  const tot=labels.map(l=>Object.values(porGrupo[l]).reduce((s,n)=>s+n,0));
  const valAx=horizontal?'x':'y',catAx=horizontal?'y':'x';
  const ch=new Chart(cv,{
    type:'bar',
    data:{labels,datasets:usadas.map(g=>({
      label:g==='—'?'Sin guardia':'Guardia '+g,data:labels.map(l=>porGrupo[l][g]||0),
      backgroundColor:_TH_GCOL[g]+'b3',borderColor:_TH_GCOL[g],borderWidth:1,borderRadius:3,
      maxBarThickness:horizontal?22:46}))},
    options:{indexAxis:horizontal?'y':'x',responsive:true,maintainAspectRatio:false,animation:false,
      layout:{padding:horizontal?{right:34}:{top:20}},
      plugins:{legend:{labels:{color:'#cbd5e1',font:{size:11,weight:'bold'},boxWidth:12}},
        tooltip:{callbacks:{footer:it=>'Total: '+tot[it[0].dataIndex]}}},
      scales:{
        [catAx]:{stacked:true,ticks:{color:'#cbd5e1',font:{size:10,weight:'bold'},autoSkip:false},grid:{display:false}},
        [valAx]:{stacked:true,beginAtZero:true,ticks:{color:'#94a3b8',precision:0},grid:{color:'rgba(148,163,184,.12)'},
          title:{display:true,text:'N° de personas',color:'#94a3b8',font:{size:10}}}}},
    plugins:[_thVL]
  });
  ch.$thTot=tot;ch.update();
  return ch;
}

function rTarHist(){
  if(typeof _tarPgInitFiltros==='function')_tarPgInitFiltros();
  const cont=document.getElementById('thBody');if(!cont)return;
  const d=_thDatos();

  // Cargos disponibles (antes de aplicar la selección) en el orden del cuadro de guardias
  const ordIdx=c=>typeof _gdOrdenIdx==='function'?_gdOrdenIdx(c):900;
  const cargosAll=[...new Set(d.filas.map(f=>f.cargo))].sort((a,b)=>ordIdx(a)-ordIdx(b)||a.localeCompare(b,'es'));
  const filas=d.filas.filter(f=>!_thOcultos.has(f.cargo));
  const cargos=cargosAll.filter(c=>!_thOcultos.has(c));

  const porCargo={};cargos.forEach(c=>porCargo[c]={});
  const porTipo={};
  filas.forEach(f=>{
    porCargo[f.cargo][f.g]=(porCargo[f.cargo][f.g]||0)+1;
    (porTipo[f.tipo]=porTipo[f.tipo]||{})[f.g]=(porTipo[f.tipo][f.g]||0)+1;
  });
  const tipos=[..._TH_TIPO_ORD.filter(t=>porTipo[t]),...Object.keys(porTipo).filter(t=>!_TH_TIPO_ORD.includes(t))];
  const nStaff=filas.filter(f=>_thCatDe(f.p)==='STAFF').length;

  const btnSeg=(v,lbl,col)=>{const act=_thCat===v;
    return`<button onclick="_thSetCat('${v}')" style="border:1px solid ${act?col:'var(--border)'};background:${act?col+'33':'transparent'};color:${act?col:'var(--muted2)'};padding:.25rem .8rem;font-size:.74rem;font-weight:700;cursor:pointer;border-radius:6px">${lbl}</button>`;};
  const selTxt=!cargosAll.length?'Sin cargos':_thOcultos.size&&cargos.length<cargosAll.length?`${cargos.length} de ${cargosAll.length} cargos`:'Todos los cargos';
  const chip=(lbl,v,col)=>`<span style="background:${col}22;color:${col};border:1px solid ${col}66;border-radius:5px;padding:.1rem .5rem;font-size:.7rem;font-weight:800">${v} ${lbl}</span>`;

  cont.innerHTML=`
    <div style="display:flex;align-items:center;gap:.6rem;flex-wrap:wrap;margin-bottom:.8rem;padding:.5rem .7rem;background:var(--panel2);border:1px solid var(--border);border-radius:8px">
      <span style="font-size:.66rem;color:var(--muted2);text-transform:uppercase;letter-spacing:.05em">Personal</span>
      <div style="display:flex;gap:.25rem">${btnSeg('','Todos','#06b6d4')}${btnSeg('STAFF','Staff','#3b82f6')}${btnSeg('OBRERO','Obrero','#10b981')}</div>
      <span style="font-size:.66rem;color:var(--muted2);text-transform:uppercase;letter-spacing:.05em;margin-left:.4rem">Situación</span>
      <select onchange="_thSetJorn(this.value)" style="background:var(--panel);border:1px solid var(--border);border-radius:6px;color:var(--text);padding:.25rem .5rem;font-size:.75rem">
        ${Object.entries(_TH_JORN).map(([k,o])=>`<option value="${k}"${k===_thJorn?' selected':''}>${o.lbl}</option>`).join('')}
      </select>
      <span style="font-size:.66rem;color:var(--muted2);text-transform:uppercase;letter-spacing:.05em;margin-left:.4rem">Cargo</span>
      <div style="position:relative" id="thCargoWrap">
        <button onclick="_thToggleMenu(event)" style="background:var(--panel);border:1px solid var(--border);border-radius:6px;color:var(--text);padding:.25rem .7rem;font-size:.75rem;cursor:pointer;white-space:nowrap">${selTxt} <span style="opacity:.5">▾</span></button>
        <div id="thCargoMenu" style="display:none;position:absolute;top:calc(100% + 3px);left:0;z-index:9999;background:var(--panel);border:1px solid var(--border);border-radius:8px;padding:.5rem .6rem;box-shadow:0 8px 24px rgba(0,0,0,.65);min-width:270px;max-height:340px;overflow-y:auto">
          <div style="display:flex;gap:.4rem;margin-bottom:.4rem">
            <button onclick="_thCargosTodos(true)" style="flex:1;background:var(--panel2);border:1px solid var(--border);border-radius:5px;color:var(--text);font-size:.7rem;padding:.2rem;cursor:pointer">Todos</button>
            <button onclick="_thCargosTodos(false)" style="flex:1;background:var(--panel2);border:1px solid var(--border);border-radius:5px;color:var(--text);font-size:.7rem;padding:.2rem;cursor:pointer">Ninguno</button>
          </div>
          ${cargosAll.map(c=>{const n=d.filas.filter(f=>f.cargo===c).length;
            return`<label style="display:flex;align-items:center;gap:.4rem;font-size:.72rem;color:var(--text);padding:.15rem 0;cursor:pointer">
              <input type="checkbox" data-cargo="${_thEsc(c)}" ${_thOcultos.has(c)?'':'checked'} onchange="_thCargoChk(this)" style="width:auto;margin:0;cursor:pointer">
              <span style="flex:1">${_thEsc(c)}</span><span style="color:var(--muted2);font-weight:700">${n}</span></label>`;}).join('')
            ||'<div style="font-size:.72rem;color:var(--muted)">Sin personal ese día</div>'}
        </div>
      </div>
      <div style="margin-left:auto;display:flex;gap:.3rem;flex-wrap:wrap">
        ${chip('personas',filas.length,'#06b6d4')}${chip('Staff',nStaff,'#3b82f6')}${chip('Obrero',filas.length-nStaff,'#10b981')}${chip('cargos',cargos.length,'#f59e0b')}
      </div>
    </div>
    <div style="background:var(--panel2);border:1px solid #06b6d4;border-radius:10px;padding:.6rem .8rem .5rem;margin-bottom:.8rem">
      <div style="font-size:.72rem;font-weight:800;letter-spacing:.06em;color:var(--muted2);text-transform:uppercase;margin-bottom:.3rem">📶 Personal por cargo${_thCat?' · '+_thCat:''}</div>
      ${cargos.length
        ?`<div style="position:relative;height:${Math.max(220,cargos.length*30+70)}px"><canvas id="thCvCargo"></canvas></div>`
        :'<div style="font-size:.75rem;color:var(--muted);padding:1.2rem;text-align:center">Sin personal para los filtros seleccionados</div>'}
    </div>
    <div style="background:var(--panel2);border:1px solid #a855f7;border-radius:10px;padding:.6rem .8rem .5rem">
      <div style="font-size:.72rem;font-weight:800;letter-spacing:.06em;color:var(--muted2);text-transform:uppercase;margin-bottom:.3rem">📊 Personal por tipo de jornada</div>
      ${tipos.length
        ?'<div style="position:relative;height:240px"><canvas id="thCvTipo"></canvas></div>'
        :'<div style="font-size:.75rem;color:var(--muted);padding:1.2rem;text-align:center">Sin datos</div>'}
    </div>`;

  if(_thChartCargo){_thChartCargo.destroy();_thChartCargo=null;}
  if(_thChartTipo){_thChartTipo.destroy();_thChartTipo=null;}
  if(typeof Chart==='undefined')return;
  const cvC=document.getElementById('thCvCargo');
  if(cvC)_thChartCargo=_thChart(cvC,cargos,porCargo,true);
  const cvT=document.getElementById('thCvTipo');
  if(cvT)_thChartTipo=_thChart(cvT,tipos,porTipo,false);
}

function _thSetCat(v){_thCat=v;rTarHist();}
function _thSetJorn(v){_thJorn=v;rTarHist();}
function _thCargoChk(el){
  const c=el.dataset.cargo;
  if(el.checked)_thOcultos.delete(c);else _thOcultos.add(c);
  rTarHist();
  document.getElementById('thCargoMenu').style.display='block';   // seguir eligiendo sin reabrir
}
function _thCargosTodos(todos){
  if(todos)_thOcultos.clear();
  else document.querySelectorAll('#thCargoMenu input[data-cargo]').forEach(i=>_thOcultos.add(i.dataset.cargo));
  rTarHist();
  document.getElementById('thCargoMenu').style.display='block';
}
function _thToggleMenu(e){
  e.stopPropagation();
  const m=document.getElementById('thCargoMenu');
  if(m)m.style.display=m.style.display==='none'?'block':'none';
}
document.addEventListener('click',e=>{
  const w=document.getElementById('thCargoWrap'),m=document.getElementById('thCargoMenu');
  // Al marcar un cargo el menú se vuelve a pintar y el clic queda en un nodo ya retirado
  if(!e.target.isConnected)return;
  if(m&&w&&!w.contains(e.target))m.style.display='none';
});
