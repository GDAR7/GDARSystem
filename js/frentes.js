// ══ TAB 4: FRENTES DE TRABAJO ══
let _frenteSelId=null, _frenteDibujando=false, _frentePuntos=[], _frenteColors=[
  '#f59e0b','#10b981','#3b82f6','#8b5cf6','#ec4899','#06b6d4','#84cc16','#f97316','#14b8a6','#a78bfa'
];

function _pizRenderFrentes(c){
  const frentes=(DB.frentesTrabajo||[]).sort((a,b)=>(a.nombre||a.nom||'').localeCompare(b.nombre||b.nom||''));
  c.innerHTML=`
  <div style="margin-bottom:.5rem;display:flex;align-items:center;gap:.4rem;flex-wrap:nowrap;overflow-x:auto">
    <span style="font-size:.6rem;color:var(--muted2);font-weight:700;text-transform:uppercase;letter-spacing:.08em;white-space:nowrap">&#127959; Frentes de Trabajo</span>
    <div style="width:1px;height:18px;background:var(--border);flex-shrink:0"></div>
    <button id="frenteBtnDraw" onclick="_frenteToggleDraw()" style="font-size:.7rem;padding:.2rem .6rem;border-radius:5px;border:1px solid #10b98140;background:rgba(16,185,129,.1);color:#10b981;cursor:pointer;white-space:nowrap;flex-shrink:0">&#9999; Dibujar &aacute;rea</button>
    <button id="frenteBtnBorrar" onclick="_frenteBorrar()" style="font-size:.7rem;padding:.2rem .6rem;border-radius:5px;border:1px solid #ef444440;background:rgba(239,68,68,.07);color:#ef4444;cursor:pointer;white-space:nowrap;flex-shrink:0">&#128465; Borrar &aacute;rea</button>
    <div id="frenteHint" style="font-size:.6rem;color:var(--muted2);white-space:nowrap"></div>
  </div>
  <div style="display:grid;grid-template-columns:200px 1fr;gap:.7rem;height:calc(100vh - 230px)">
    <div style="overflow-y:auto;border:1px solid var(--border);border-radius:8px;padding:.5rem;background:var(--panel2);display:flex;flex-direction:column;gap:.3rem">
      <div style="font-size:.6rem;letter-spacing:.1em;color:var(--muted2);font-weight:700;text-transform:uppercase;margin-bottom:.3rem">Frentes de Trabajo</div>
      ${frentes.length ? frentes.map((f,i)=>{
        const nom=(f.nombre||f.nom||f.frente||'Sin nombre').slice(0,28);
        const col=_frenteColors[i%_frenteColors.length];
        const pts=(f.puntos||[]).length;
        return `<div id="frente-item-${f.id}" onclick="_frenteSelect(${f.id})"
          style="cursor:pointer;padding:.35rem .5rem;border-radius:6px;border:2px solid ${col}30;background:${col}10;transition:.15s"
          onmouseover="this.style.background='${col}22'" onmouseout="this.style.background='${col}10'">
          <div style="display:flex;align-items:center;gap:.4rem">
            <span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:${col};flex-shrink:0"></span>
            <span style="font-size:.67rem;font-weight:700;color:var(--text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${nom}</span>
          </div>
          <div id="frente-stat-${f.id}" style="font-size:.56rem;color:${pts>=3?col:'var(--muted2)'};padding-left:14px;margin-top:2px">${pts>=3 ? pts+' v&eacute;rtices' : 'Sin &aacute;rea'}</div>
        </div>`;
      }).join('') : '<div style="color:var(--muted2);font-size:.68rem;text-align:center;padding:1rem">Sin frentes definidos</div>'}
    </div>
    <div style="position:relative;overflow:hidden;border-radius:8px;border:1px solid var(--border);background:#111" id="rutaMapWrap">
      <div id="rutaCanvas" style="position:relative;transform-origin:0 0;cursor:grab;display:inline-block;min-width:100%">
        <img src="${_pizImgUrl()}" style="display:block;width:100%;pointer-events:none;user-select:none" draggable="false">
        <svg id="rutaSvg" style="position:absolute;inset:0;width:100%;height:100%;pointer-events:none;overflow:visible" xmlns="http://www.w3.org/2000/svg"></svg>
        <div id="rutaCursor" style="position:absolute;width:10px;height:10px;border-radius:2px;border:2px solid #fff;background:#f59e0b;display:none;pointer-events:none;transform:translate(-50%,-50%)"></div>
      </div>
      <div style="position:absolute;bottom:.6rem;right:.6rem;display:flex;align-items:center;gap:.25rem;z-index:20;background:rgba(10,10,20,.75);border:1px solid #ffffff18;border-radius:7px;padding:.25rem .4rem;backdrop-filter:blur(6px)">
        <button onclick="_rutaZoomOut()" style="width:22px;height:22px;border-radius:4px;border:1px solid #ffffff20;background:#ffffff10;color:#e0e0e0;cursor:pointer;font-size:.9rem;line-height:1">&minus;</button>
        <span id="rutaZoomPct" style="font-size:.65rem;color:#e0e0e0;min-width:36px;text-align:center;font-weight:700">100%</span>
        <button onclick="_rutaZoomIn()" style="width:22px;height:22px;border-radius:4px;border:1px solid #ffffff20;background:#ffffff10;color:#e0e0e0;cursor:pointer;font-size:.9rem;line-height:1">+</button>
        <div style="width:1px;height:14px;background:#ffffff20;margin:0 .1rem"></div>
        <button onclick="_rutaZoomReset()" style="padding:0 .35rem;height:22px;border-radius:4px;border:1px solid #ffffff20;background:#ffffff10;color:#e0e0e0;cursor:pointer;font-size:.65rem">&#8634; Fit</button>
      </div>
    </div>
  </div>`;

  const wrap=document.getElementById('rutaMapWrap');
  if(wrap){
    wrap.addEventListener('click',_frenteMapClick);
    wrap.addEventListener('dblclick',_frenteMapDblClick);
    wrap.addEventListener('mousemove',_frenteMouseMove);
    wrap.addEventListener('contextmenu',function(e){e.preventDefault();_frenteCancelarDraw();});
    wrap.addEventListener('wheel',_rutaOnWheel,{passive:false});
    wrap.addEventListener('mousedown',_frenteOnMousedown);
  }
  document.addEventListener('mousemove',_rutaOnGlobalMousemove);
  document.addEventListener('mouseup',_frenteOnGlobalMouseup);
  requestAnimationFrame(function(){
    if(_rutaZoom===1&&_rutaPanX===0) _rutaFitView(); else _rutaApplyTransform();
    _frenteRenderSvg(DB.frentesTrabajo||[]);
  });
}

function _frenteRenderSvg(frentes){
  const svg=document.getElementById('rutaSvg');if(!svg)return;
  const W=svg.clientWidth,H=svg.clientHeight;if(!W||!H)return;
  svg.querySelectorAll('.frente-static').forEach(function(el){el.remove();});
  const sorted=(frentes||[]).sort(function(a,b){return (a.nombre||a.nom||'').localeCompare(b.nombre||b.nom||'');});
  sorted.forEach(function(f,i){
    const pts=f.puntos||[];if(pts.length<3)return;
    const col=_frenteColors[i%_frenteColors.length];
    const nom=(f.nombre||f.nom||f.frente||'').slice(0,22);
    const px=pts.map(function(p){return {x:(p.x*W/100),y:(p.y*H/100)};});
    const d='M '+px.map(function(p){return p.x.toFixed(1)+' '+p.y.toFixed(1);}).join(' L ')+' Z';
    const cx=px.reduce(function(s,p){return s+p.x;},0)/px.length;
    const cy=px.reduce(function(s,p){return s+p.y;},0)/px.length;
    const g=document.createElementNS('http://www.w3.org/2000/svg','g');
    g.classList.add('frente-static');
    const area=document.createElementNS('http://www.w3.org/2000/svg','path');
    area.setAttribute('d',d);area.setAttribute('fill',col);area.setAttribute('fill-opacity','.22');
    area.setAttribute('stroke',col);area.setAttribute('stroke-width','2');area.setAttribute('stroke-linejoin','round');
    g.appendChild(area);
    const txt=document.createElementNS('http://www.w3.org/2000/svg','text');
    txt.setAttribute('x',cx.toFixed(1));txt.setAttribute('y',cy.toFixed(1));
    txt.setAttribute('font-size','11');txt.setAttribute('font-weight','700');txt.setAttribute('fill',col);
    txt.setAttribute('stroke','#000');txt.setAttribute('stroke-width','2.5');txt.setAttribute('paint-order','stroke');
    txt.setAttribute('dominant-baseline','middle');txt.setAttribute('text-anchor','middle');txt.setAttribute('font-family','sans-serif');
    txt.textContent=nom;
    g.appendChild(txt);
    svg.appendChild(g);
  });
}

function _frenteTempRender(){
  const svg=document.getElementById('rutaSvg');if(!svg)return;
  const W=svg.clientWidth,H=svg.clientHeight;
  svg.querySelectorAll('.frente-temp').forEach(function(el){el.remove();});
  if(_frentePuntos.length<1)return;
  const px=_frentePuntos.map(function(p){return {x:(p.x*W/100).toFixed(1),y:(p.y*H/100).toFixed(1)};});
  const d='M '+px.map(function(p){return p.x+' '+p.y;}).join(' L ');
  const path=document.createElementNS('http://www.w3.org/2000/svg','path');
  path.classList.add('frente-temp');
  path.setAttribute('d',d);path.setAttribute('stroke','#f59e0b');path.setAttribute('stroke-width','2');
  path.setAttribute('fill','none');path.setAttribute('stroke-linecap','round');path.setAttribute('stroke-linejoin','round');
  svg.appendChild(path);
  if(_frentePuntos.length>=3){
    const fillPath=document.createElementNS('http://www.w3.org/2000/svg','path');
    fillPath.classList.add('frente-temp');
    fillPath.setAttribute('d',d+' Z');fillPath.setAttribute('fill','#f59e0b');fillPath.setAttribute('fill-opacity','.12');fillPath.setAttribute('stroke','none');
    svg.appendChild(fillPath);
    const close=document.createElementNS('http://www.w3.org/2000/svg','line');
    close.classList.add('frente-temp');
    close.setAttribute('x1',px[px.length-1].x);close.setAttribute('y1',px[px.length-1].y);
    close.setAttribute('x2',px[0].x);close.setAttribute('y2',px[0].y);
    close.setAttribute('stroke','#f59e0b');close.setAttribute('stroke-width','1.5');close.setAttribute('stroke-dasharray','4 3');close.setAttribute('opacity','.5');
    svg.appendChild(close);
  }
  px.forEach(function(p){
    const c=document.createElementNS('http://www.w3.org/2000/svg','circle');
    c.classList.add('frente-temp');
    c.setAttribute('cx',p.x);c.setAttribute('cy',p.y);c.setAttribute('r','4');
    c.setAttribute('fill','#f59e0b');c.setAttribute('stroke','#fff');c.setAttribute('stroke-width','1.5');
    svg.appendChild(c);
  });
}

function _frenteSelect(id){
  _frenteSelId=id;
  document.querySelectorAll('[id^="frente-item-"]').forEach(function(el){
    el.style.outline=(el.id==='frente-item-'+id)?'2px solid #f59e0b':'none';
  });
  const f=(DB.frentesTrabajo||[]).find(function(x){return x.id===id;});
  const hint=document.getElementById('frenteHint');
  if(hint)hint.textContent=f ? ('✔ '+(f.nombre||f.nom||f.frente||'Frente')+' seleccionado') : '';
  _frenteDibujando=false;_frentePuntos=[];_frenteCancelarDraw(false);
}

function _frenteToggleDraw(){
  if(!_frenteSelId){toast('Selecciona un frente primero',true);return;}
  _frenteDibujando=!_frenteDibujando;
  _rutaDidPan=false;
  const btn=document.getElementById('frenteBtnDraw');
  const cur=document.getElementById('rutaCursor');
  const canvas=document.getElementById('rutaCanvas');
  const hint=document.getElementById('frenteHint');
  if(_frenteDibujando){
    const f=(DB.frentesTrabajo||[]).find(function(x){return x.id===_frenteSelId;});
    _frentePuntos=f&&f.puntos?[].concat(f.puntos):[];
    if(btn){btn.textContent='✅ Terminar';btn.style.background='rgba(245,158,11,.15)';btn.style.color='#f59e0b';btn.style.borderColor='#f59e0b40';}
    if(cur)cur.style.display='block';
    if(canvas)canvas.style.cursor='crosshair';
    if(hint)hint.textContent='Clic=vértice · Doble clic=cerrar área · Clic derecho=cancelar';
  }else{
    _frenteGuardar();
  }
}

function _frenteMapClick(e){
  if(!_frenteDibujando||!_frenteSelId)return;
  if(e.detail>1)return;
  const canvas=document.getElementById('rutaCanvas');if(!canvas)return;
  const r=canvas.getBoundingClientRect();
  const x=parseFloat(((e.clientX-r.left)/r.width*100).toFixed(2));
  const y=parseFloat(((e.clientY-r.top)/r.height*100).toFixed(2));
  _frentePuntos.push({x:x,y:y});
  _frenteTempRender();
}

function _frenteMapDblClick(e){
  if(!_frenteDibujando)return;
  e.preventDefault();
  if(_frentePuntos.length)_frentePuntos.pop();
  if(_frentePuntos.length<3){toast('Necesitas al menos 3 vértices para definir un área',true);return;}
  _frenteGuardar();
}

function _frenteMouseMove(e){
  if(!_frenteDibujando)return;
  const canvas=document.getElementById('rutaCanvas');if(!canvas)return;
  const r=canvas.getBoundingClientRect();
  const xPct=(e.clientX-r.left)/r.width*100;
  const yPct=(e.clientY-r.top)/r.height*100;
  const cur=document.getElementById('rutaCursor');
  if(cur){cur.style.left=xPct+'%';cur.style.top=yPct+'%';}
  const svg=document.getElementById('rutaSvg');if(!svg)return;
  const W=svg.clientWidth,H=svg.clientHeight;
  const xPx=(xPct*W/100).toFixed(1),yPx=(yPct*H/100).toFixed(1);
  const prev=svg.querySelector('#frentePreview');
  if(_frentePuntos.length){
    const last=_frentePuntos[_frentePuntos.length-1];
    const lxPx=(last.x*W/100).toFixed(1),lyPx=(last.y*H/100).toFixed(1);
    const line=prev||document.createElementNS('http://www.w3.org/2000/svg','line');
    line.id='frentePreview';
    line.setAttribute('x1',lxPx);line.setAttribute('y1',lyPx);
    line.setAttribute('x2',xPx);line.setAttribute('y2',yPx);
    line.setAttribute('stroke','#f59e0b');line.setAttribute('stroke-width','2');
    line.setAttribute('stroke-dasharray','5 3');line.setAttribute('opacity','.8');
    if(!prev)svg.appendChild(line);
  }else if(prev){prev.remove();}
}

function _frenteGuardar(){
  if(!_frenteSelId){_frenteCancelarDraw();return;}
  const f=(DB.frentesTrabajo||[]).find(function(x){return x.id===_frenteSelId;});
  if(!f){_frenteCancelarDraw();return;}
  if(_frentePuntos.length<3){toast('Necesitas al menos 3 vértices para el área',true);return;}
  f.puntos=[].concat(_frentePuntos);
  syncSheet('saveFrenteTrabajo',f);
  toast('✓ Área de "'+( f.nombre||f.nom||f.frente||'Frente')+'" guardada ('+_frentePuntos.length+' vértices)');
  _frenteCancelarDraw(false);
  const svg=document.getElementById('rutaSvg');
  if(svg){
    svg.querySelectorAll('.frente-temp').forEach(function(el){el.remove();});
    const p=svg.querySelector('#frentePreview');if(p)p.remove();
  }
  _frenteRenderSvg(DB.frentesTrabajo||[]);
  const stat=document.getElementById('frente-stat-'+f.id);
  if(stat){
    const idx=(DB.frentesTrabajo||[]).findIndex(function(x){return x.id===f.id;});
    if(idx>=0){stat.style.color=_frenteColors[idx%_frenteColors.length];stat.textContent=f.puntos.length+' vértices';}
  }
}

function _frenteCancelarDraw(reset){
  if(reset===undefined)reset=true;
  _frenteDibujando=false;
  if(reset)_frentePuntos=[];
  const btn=document.getElementById('frenteBtnDraw');
  const cur=document.getElementById('rutaCursor');
  const canvas=document.getElementById('rutaCanvas');
  if(btn){btn.textContent='✏️ Dibujar área';btn.style.background='rgba(16,185,129,.1)';btn.style.color='#10b981';btn.style.borderColor='#10b98140';}
  if(cur)cur.style.display='none';
  if(canvas)canvas.style.cursor='grab';
  const svg=document.getElementById('rutaSvg');
  if(svg){
    svg.querySelectorAll('.frente-temp').forEach(function(el){el.remove();});
    const p=svg.querySelector('#frentePreview');if(p)p.remove();
  }
}

function _frenteBorrar(){
  if(!_frenteSelId)return;
  const f=(DB.frentesTrabajo||[]).find(function(x){return x.id===_frenteSelId;});
  if(!f)return;
  if(!confirm('¿Borrar el área dibujada de "'+( f.nombre||f.nom||f.frente||'Frente')+'"?'))return;
  f.puntos=[];
  syncSheet('saveFrenteTrabajo',f);
  toast('Área de "'+( f.nombre||f.nom||f.frente||'Frente')+'" borrada');
  _frenteCancelarDraw();
  _frenteRenderSvg(DB.frentesTrabajo||[]);
  const stat=document.getElementById('frente-stat-'+f.id);
  if(stat){stat.style.color='var(--muted2)';stat.textContent='Sin área';}
}

function _frenteOnMousedown(e){
  if(_frenteDibujando||e.button!==0)return;
  _rutaIsPanning=true;_rutaDidPan=false;
  _rutaPanStart={x:e.clientX-_rutaPanX,y:e.clientY-_rutaPanY};
  const canvas=document.getElementById('rutaCanvas');if(canvas)canvas.style.cursor='grabbing';
}

function _frenteOnGlobalMouseup(){
  _rutaIsPanning=false;_rutaDidPan=false;
  const canvas=document.getElementById('rutaCanvas');
  if(canvas)canvas.style.cursor=_frenteDibujando?'crosshair':'grab';
}
