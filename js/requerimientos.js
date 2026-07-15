// ══ REQUERIMIENTOS ══
const REQ_PREFIXES={MATERIALES:'MT-',ADMINISTRATIVO:'UA-',DISPOSITIVOS:'DS-',EPPS:'EPP-',EQUIPOS:'EQ-',HERRAMIENTAS:'HM-',INSUMOS:'INS-'};
const REQ_TIPOS=['MATERIALES','ADMINISTRATIVO','DISPOSITIVOS','EPPS','EQUIPOS','HERRAMIENTAS','INSUMOS'];
const COSTO_TIPOS=['','C. Directo','C. Indirecto','C. Reembolsable','C. Proveedores','C. EQ Propios'];
const ISS='padding:.25rem .4rem;font-size:.72rem;background:var(--panel2);border:1px solid var(--border);border-radius:4px;color:var(--text)';
let reqItemsArr=[];
let _reqVerCurrentId=null;
let _reqEditId=null;
let _editPersonalId=null;
function addReqItem(item){
  reqItemsArr.push(item||{tipo:'MATERIALES',cod:'MT-',desc:'',und:'und',cant:1,obs:'',tcosto:''});
  renderReqItems();
}
function removeReqItem(i){reqItemsArr.splice(i,1);renderReqItems();}
function onReqTipo(i,tipo){
  const prev=REQ_PREFIXES[reqItemsArr[i].tipo]||'';
  let cod=reqItemsArr[i].cod;
  if(cod.startsWith(prev))cod=cod.slice(prev.length);
  reqItemsArr[i].tipo=tipo;
  reqItemsArr[i].cod=(REQ_PREFIXES[tipo]||'')+cod;
  renderReqItems();
  // restore focus on tipo select
  const sel=document.querySelectorAll('#rqItemsBody tr')[i]?.querySelector('select');
  if(sel)sel.focus();
}
function renderReqItems(){
  const b=document.getElementById('rqItemsBody');if(!b)return;
  b.innerHTML=reqItemsArr.map((it,i)=>{
    const tipoOpts=REQ_TIPOS.map(t=>`<option value="${t}"${it.tipo===t?' selected':''}>${t}</option>`).join('');
    const undOpts=(DB.unidades&&DB.unidades.length?DB.unidades:[{abrev:'und'},{abrev:'gal'},{abrev:'lt'},{abrev:'kg'},{abrev:'caja'},{abrev:'par'},{abrev:'m'}]).map(u=>`<option value="${u.abrev}"${it.und===u.abrev?' selected':''}>${u.abrev}</option>`).join('');
    const cat=DB.catalogoItems.find(c=>c.cod===it.cod);
    const img=cat?.img||'';
    return`<tr>
      <td style="padding:.28rem .4rem;color:var(--muted2);font-size:.7rem;text-align:center">${i+1}</td>
      <td style="padding:.28rem .4rem">
        <select onchange="onReqTipo(${i},this.value)" style="${ISS};width:120px;cursor:pointer">${tipoOpts}</select>
      </td>
      <td style="padding:.28rem .4rem">
        <input id="rqC${i}" value="${it.cod}" oninput="reqItemsArr[${i}].cod=this.value;renderReqItems()" placeholder="${REQ_PREFIXES[it.tipo]||''}000" style="${ISS};width:90px;font-family:'Roboto Mono',monospace">
      </td>
      <td style="padding:.28rem .4rem;text-align:center;width:40px">
        ${img?`<img src="${img}" style="width:34px;height:34px;object-fit:cover;border-radius:5px;border:1px solid var(--border)">`
        :`<div style="width:34px;height:34px;background:var(--panel2);border-radius:5px;border:1px solid var(--border);display:inline-flex;align-items:center;justify-content:center;font-size:.5rem;color:var(--muted)">—</div>`}
      </td>
      <td style="padding:.28rem .4rem;position:relative">
        <input id="rqD${i}" value="${it.desc.replace(/"/g,'&quot;')}" autocomplete="off"
          oninput="reqItemsArr[${i}].desc=this.value;showReqSug(${i},this.value)"
          onblur="setTimeout(()=>hideReqAc(),200)"
          placeholder="Descripción del material..." style="${ISS};width:210px">
      </td>
      <td style="padding:.28rem .4rem"><select onchange="reqItemsArr[${i}].und=this.value" style="${ISS};width:68px">${undOpts}</select></td>
      <td style="padding:.28rem .4rem"><input type="number" value="${it.cant}" oninput="reqItemsArr[${i}].cant=+this.value" style="${ISS};width:58px;text-align:right"></td>
      <td style="padding:.28rem .4rem"><input value="${it.obs}" oninput="reqItemsArr[${i}].obs=this.value" placeholder="Obs..." style="${ISS};width:100px"></td>
      <td style="padding:.28rem .4rem"><select onchange="reqItemsArr[${i}].tcosto=this.value" style="${ISS};width:120px;cursor:pointer">${COSTO_TIPOS.map(t=>`<option value="${t}"${it.tcosto===t?' selected':''}>${t||'— Costo —'}</option>`).join('')}</select></td>
      <td style="padding:.28rem .4rem"><button class="btn btn-del btn-sm" onclick="removeReqItem(${i})">✕</button></td>
    </tr>`;
  }).join('');
}
function showReqSug(i,val){
  const drop=document.getElementById('reqAcDrop');
  if(!val||val.length<2){drop.style.display='none';return;}
  const v=val.toLowerCase();
  const allMatches=DB.catalogoItems.filter(c=>c.desc.toLowerCase().includes(v)||c.cod.toLowerCase().includes(v));
  if(!allMatches.length){drop.style.display='none';return;}
  const matches=allMatches.slice(0,30);
  const mas=allMatches.length-30;
  const inp=document.getElementById('rqD'+i);if(!inp)return;
  const r=inp.getBoundingClientRect();
  drop.style.cssText=`position:fixed;left:${r.left}px;top:${r.bottom+2}px;width:${Math.max(r.width,520)}px;z-index:9999;display:block;background:#1e2740;border:1px solid #2e3d60;border-radius:7px;box-shadow:0 8px 28px rgba(0,0,0,.7);max-height:320px;overflow-y:auto`;
  const ea=s=>(s||'').replace(/&/g,'&amp;').replace(/"/g,'&quot;');
  drop.innerHTML=matches.map(c=>`
    <div data-ri="${i}" data-tipo="${ea(c.tipo)}" data-cod="${ea(c.cod)}" data-desc="${ea(c.desc)}" data-und="${ea(c.und)}"
      onmousedown="selectReqSugFromEl(this)"
      style="padding:.4rem .75rem;cursor:pointer;font-size:.75rem;border-bottom:1px solid #2a3556;display:flex;align-items:center;gap:.6rem;background:transparent"
      onmouseover="this.style.background='#2a3a5e'" onmouseout="this.style.background='transparent'">
      ${c.img?`<img src="${c.img}" style="width:30px;height:30px;object-fit:cover;border-radius:4px;border:1px solid #2e3d60;flex-shrink:0;pointer-events:none">`
      :`<div style="width:30px;height:30px;background:#161e30;border-radius:4px;border:1px solid #2e3d60;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:.55rem;color:#64748b;pointer-events:none">—</div>`}
      <div style="display:flex;flex-direction:column;flex:1;min-width:0;gap:1px;pointer-events:none">
        <div style="display:flex;align-items:center;gap:.4rem">
          <span style="font-size:.6rem;background:rgba(249,115,22,.18);color:var(--alm);border-radius:3px;padding:1px 5px;font-weight:700;white-space:nowrap">${c.tipo}</span>
          <span style="font-family:'Roboto Mono',monospace;font-size:.68rem;color:var(--alm)">${c.cod}</span>
        </div>
        <span style="color:#e2e8f0;white-space:normal;word-break:break-word;line-height:1.35">${c.desc}</span>
      </div>
      <span style="color:#94a3b8;font-size:.68rem;background:#161e30;padding:1px 6px;border-radius:3px;white-space:nowrap;pointer-events:none">${c.und}</span>
    </div>`).join('')
  +(mas>0?`<div style="padding:.35rem .75rem;font-size:.68rem;color:#64748b;text-align:center;background:#161e30;border-top:1px solid #2a3556">Escribe más para filtrar — ${mas} resultado${mas>1?'s':''} adicionale${mas>1?'s':''}</div>`:'');
}
function selectReqSugFromEl(el){
  const d=el.closest('[data-ri]')||el;
  selectReqSug(+d.dataset.ri,d.dataset.tipo,d.dataset.cod,d.dataset.desc,d.dataset.und);
}
function selectReqSug(i,tipo,cod,desc,und){
  reqItemsArr[i].tipo=tipo;
  reqItemsArr[i].cod=cod;
  reqItemsArr[i].desc=desc;
  reqItemsArr[i].und=und;
  document.getElementById('reqAcDrop').style.display='none';
  renderReqItems();
}
function hideReqAc(){document.getElementById('reqAcDrop').style.display='none';}

// ── AUTOCOMPLETE ALMACÉN ENTRADA ──
function showAlmAc(field,val){
  const drop=document.getElementById('almAcDrop');
  if(!val||val.length<1){drop.style.display='none';return;}
  const v=val.toLowerCase();
  const matches=DB.catalogoItems.filter(c=>
    field==='cod'
      ? c.cod.toLowerCase().includes(v)
      : c.desc.toLowerCase().includes(v)||c.cod.toLowerCase().includes(v)
  ).slice(0,14);
  if(!matches.length){drop.style.display='none';return;}
  const inp=document.getElementById(field==='cod'?'aeCod':'aeNom');
  if(!inp)return;
  const r=inp.getBoundingClientRect();
  drop.style.cssText=`position:fixed;left:${r.left}px;top:${r.bottom+2}px;width:${Math.max(r.width,340)}px;z-index:9999;display:block;background:#1e2740;border:1px solid #2e3d60;border-radius:7px;box-shadow:0 8px 28px rgba(0,0,0,.75);max-height:240px;overflow-y:auto`;
  drop.innerHTML=matches.map(c=>`
    <div onmousedown="selectAlmAc('${c.cod}','${c.desc.replace(/'/g,"\\'").replace(/"/g,'&quot;')}','${c.und}')"
      style="padding:.42rem .75rem;cursor:pointer;font-size:.76rem;border-bottom:1px solid #2a3556;display:flex;align-items:center;gap:.6rem;background:transparent"
      onmouseover="this.style.background='#2a3a5e'" onmouseout="this.style.background='transparent'">
      ${c.img?`<img src="${c.img}" style="width:32px;height:32px;object-fit:cover;border-radius:4px;border:1px solid #2e3d60;flex-shrink:0">`
      :`<div style="width:32px;height:32px;background:#161e30;border-radius:4px;border:1px solid #2e3d60;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:.55rem;color:#64748b">—</div>`}
      <span style="font-family:'Roboto Mono',monospace;font-size:.68rem;color:var(--alm);min-width:68px;flex-shrink:0">${c.cod}</span>
      <span style="flex:1;color:#e2e8f0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${c.desc}</span>
      <span style="color:#94a3b8;font-size:.68rem;background:#161e30;padding:1px 6px;border-radius:3px;flex-shrink:0">${c.und}</span>
      ${c.pur?`<span style="color:#10b981;font-size:.67rem;font-family:'Roboto Mono',monospace;flex-shrink:0">S/${Number(c.pur).toFixed(2)}</span>`:''}
    </div>`).join('');
}
function selectAlmAc(cod,desc,und){
  document.getElementById('aeCod').value=cod;
  document.getElementById('aeNom').value=desc;
  document.getElementById('aeUnd').value=und;
  hideAlmAc();
}
function hideAlmAc(){document.getElementById('almAcDrop').style.display='none';}

// ── AUTOCOMPLETE ENTRADA MÚLTIPLE ──
let _emAcIdx=-1;
function showEmAc(idx,val){
  _emAcIdx=idx;
  const drop=document.getElementById('emAcDrop');
  if(!val||val.length<1){drop.style.display='none';return;}
  const v=val.toLowerCase();
  const matches=DB.catalogoItems.filter(c=>c.desc.toLowerCase().includes(v)||c.cod.toLowerCase().includes(v)).slice(0,30);
  if(!matches.length){drop.style.display='none';return;}
  const inp=document.getElementById('emAcInp'+idx);
  if(!inp)return;
  const r=inp.getBoundingClientRect();
  const dropW=Math.min(Math.max(r.width,580),window.innerWidth-20);
  const dropLeft=Math.min(r.left,window.innerWidth-dropW-8);
  drop.style.cssText=`position:fixed;left:${Math.max(4,dropLeft)}px;top:${r.bottom+2}px;width:${dropW}px;z-index:9999;display:block;background:#1e2740;border:1px solid #2e3d60;border-radius:7px;box-shadow:0 8px 28px rgba(0,0,0,.75);max-height:380px;overflow-y:auto`;
  drop.innerHTML=matches.map(c=>`
    <div onmousedown="selectEmAc(${idx},'${c.cod}','${c.desc.replace(/'/g,"\\'").replace(/"/g,'&quot;')}','${c.und}')"
      style="padding:.42rem .75rem;cursor:pointer;font-size:.76rem;border-bottom:1px solid #2a3556;display:flex;align-items:center;gap:.6rem;background:transparent"
      onmouseover="this.style.background='#2a3a5e'" onmouseout="this.style.background='transparent'">
      ${c.img?`<img src="${c.img}" style="width:32px;height:32px;object-fit:cover;border-radius:4px;border:1px solid #2e3d60;flex-shrink:0">`
      :`<div style="width:32px;height:32px;background:#161e30;border-radius:4px;border:1px solid #2e3d60;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:.55rem;color:#64748b">—</div>`}
      <span style="font-family:'Roboto Mono',monospace;font-size:.68rem;color:var(--alm);min-width:68px;flex-shrink:0">${c.cod}</span>
      <span style="flex:1;color:#e2e8f0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${c.desc}</span>
      <span style="color:#94a3b8;font-size:.68rem;background:#161e30;padding:1px 6px;border-radius:3px;flex-shrink:0">${c.und}</span>
      ${c.pur?`<span style="color:#10b981;font-size:.67rem;font-family:'Roboto Mono',monospace;flex-shrink:0">S/${Number(c.pur).toFixed(2)}</span>`:''}
    </div>`).join('');
}
function selectEmAc(idx,cod,desc,und){
  emItemsArr[idx].cod=cod;emItemsArr[idx].nom=desc;emItemsArr[idx].und=und;
  const inp=document.getElementById('emAcInp'+idx);if(inp)inp.value=cod+' – '+desc;
  const undInp=document.getElementById('emAcUnd'+idx);if(undInp)undInp.value=und;
  hideEmAc();
}
function hideEmAc(){const d=document.getElementById('emAcDrop');if(d)d.style.display='none';}
// ── Buscador de solicitante (personal activo, como en abastecimiento de combustible) ──
function _rqSolSearch(q){
  const drop=document.getElementById('rqSolDrop');if(!drop)return;
  const txt=(q||'').toLowerCase().trim();
  const lista=(DB.personal||[])
    .filter(p=>(p.est||'').toLowerCase()==='activo'||(p.est||'')==='')
    .filter(p=>{if(!txt)return true;return((p.ape||'')+' '+(p.nom||'')+' '+(p.cargo||'')+' '+(p.dni||'')).toLowerCase().includes(txt);})
    .sort((a,b)=>(a.ape||'').localeCompare(b.ape||''))
    .slice(0,30);
  if(!lista.length){drop.style.display='none';return;}
  drop.innerHTML=lista.map(p=>{
    const nombre=`${p.ape||''}, ${p.nom||''}`.trim().replace(/^,\s*/,'');
    return`<div onmousedown="_rqSolSelect('${nombre.replace(/'/g,"\\'")}')"
      style="padding:.45rem .8rem;cursor:pointer;font-size:.8rem;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center"
      onmouseover="this.style.background='var(--hover)'" onmouseout="this.style.background=''">
      <span style="font-weight:700">${nombre}</span>
      <span style="font-size:.68rem;color:var(--muted2);margin-left:.5rem;white-space:nowrap">${p.cargo||''}</span>
    </div>`;
  }).join('');
  drop.style.display='block';
}
function _rqSolSelect(nombre){
  const inp=document.getElementById('rqSol');if(inp)inp.value=nombre;
  const drop=document.getElementById('rqSolDrop');if(drop)drop.style.display='none';
}
function openMReq(){_reqEditId=null;reqItemsArr=[];addReqItem();document.getElementById('rqProy').value='';document.getElementById('rqCodProy').value='';document.getElementById('rqProyNumHint').textContent='';document.getElementById('rqSol').value='';document.querySelector('#mReq .mttl').textContent='📝 Nuevo Requerimiento de Materiales';document.querySelector('#mReq .mf .btn-a').textContent='Registrar Requerimiento';openM('mReq');}
function intentarEditarReq(id){
  const r=DB.requerimientos.find(x=>x.id===id);if(!r)return;
  const bloqueado=r.est==='Atendido'||r.est==='Anulado';
  if(bloqueado&&CU.codigo!=='EIBEL25'){
    alert('⚠️ Este requerimiento ya no se puede editar porque está '+r.est.toLowerCase()+'.\n\nComunícate con el Administrador General para que atienda tu solicitud.');
    return;
  }
  editReq(id);
}
function editReq(id){
  const r=DB.requerimientos.find(x=>x.id===id);if(!r)return;
  _reqEditId=id;
  reqItemsArr=JSON.parse(JSON.stringify(r.items));
  document.querySelector('#mReq .mttl').textContent='✏️ Editar Requerimiento: '+r.num;
  document.querySelector('#mReq .mf .btn-a').textContent='Guardar Cambios';
  document.getElementById('rqProy').value=r.proyecto||'';
  document.getElementById('rqCodProy').value=r.codProy||'';
  document.getElementById('rqF').value=r.fecha||'';
  // solicitante (input con buscador)
  document.getElementById('rqSol').value=r.solicitante||'';
  // set area select
  const areaSel=document.getElementById('rqArea');[...areaSel.options].forEach(o=>{o.selected=o.text===r.area||o.value===r.area;});
  document.getElementById('rqFEnt').value=r.fechaEnt||'';
  const priorSel=document.getElementById('rqPrior');[...priorSel.options].forEach(o=>{o.selected=o.value===r.prioridad;});
  const estSel=document.getElementById('rqEst');[...estSel.options].forEach(o=>{o.selected=o.value===r.est;});
  document.getElementById('rqObs').value=r.obs||'';
  renderReqItems();
  closeM('mReqVer');
  openM('mReq');
}
function exportReqPDF(id){
  const r=DB.requerimientos.find(x=>x.id===id);if(!r)return;
  const comps=DB.facturasPago.filter(f=>f.reqId===id);
  function e(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
  const iRows=r.items.map((it,i)=>{
    const _cat=DB.catalogoItems.find(c=>c.cod===it.cod);const _img=_cat?.img||'';
    const _imgCell=_img?'<img src="'+_img+'" style="width:38px;height:38px;object-fit:cover;border-radius:4px;border:1px solid #ddd">':`<span style="color:#ccc;font-size:10px">—</span>`;
    return'<tr><td align=center>'+(i+1)+'</td><td class=m>'+e(it.cod||'—')+'</td><td align=center>'+_imgCell+'</td><td><b>'+e(it.desc)+'</b></td><td align=center>'+e(it.und)+'</td><td align=center style="font-weight:700;font-size:13px">'+it.cant+'</td><td style="color:#666">'+e(it.obs||'—')+'</td><td style="color:#d97706;font-size:10px;white-space:nowrap">'+e(it.tcosto||'—')+'</td></tr>';
  }).join('');
  const cRows=comps.map(c=>'<tr><td>'+e(c.tipo)+'</td><td class=m>'+e(c.num)+'</td><td>'+e(c.prov)+'</td><td align=right style=color:#10b981>S/ '+c.total.toFixed(2)+'</td><td>'+e(c.est)+'</td></tr>').join('');
  const _baseUrl=window.location.href.replace(/[^\/\\]+$/,'');
  const _logoUrl=_baseUrl+'09.-ERP/Imagenes/ECOSERMO-LOGO.png';
  const css='*{margin:0;padding:0;box-sizing:border-box}'
    +'@page{margin:15px 0}'
    +'body{font-family:Segoe UI,Arial,sans-serif;font-size:12px;color:#111;padding:0 30px}'
    /* ── Tabla envolvente (thead = encabezado real que se repite por página) ── */
    +'.doc{width:100%;border-collapse:collapse}'
    +'.doc>thead>tr>td,.doc>tbody>tr>td{padding:0;border:none;vertical-align:top}'
    /* ── Encabezado ── */
    +'.ph{padding:8px 0 6px;border-top:3px solid #1e3a6e;border-bottom:2px solid #1e3a6e;margin-bottom:12px}'
    +'.ph-inner{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:10px}'
    +'.ph-logo{height:40px;max-width:160px;object-fit:contain}'
    +'.ph-center{text-align:center}'
    +'.ph-title{font-size:13px;font-weight:900;color:#1e3a6e;letter-spacing:.02em;line-height:1.2}'
    +'.ph-rq{font-family:Courier New,monospace;font-size:11px;font-weight:700;color:#d97706;letter-spacing:.08em}'
    +'.ph-right{text-align:right;font-size:7.5px;color:#999;line-height:1.7}'
    /* ── Pie de página de firmas ── */
    +'.pf{padding:6px 0 4px;border-top:2px solid #1e3a6e}'
    +'.pf-sep{display:none}'
    +'.vb-wrap{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;margin-bottom:5px}'
    +'.vb{text-align:center}'
    +'.vb-space{height:38px}'
    +'.vb-line{border-top:1.5px solid #333;margin:0 10px 5px}'
    +'.vb-label{font-size:8.5px;text-transform:uppercase;font-weight:700;color:#1e3a6e;letter-spacing:.06em}'
    +'.vb-sub{font-size:7.5px;color:#aaa;margin-top:2px}'
    /* ── Contenido ── */
    +'.proy{background:#eef3ff;border-left:4px solid #1e3a6e;border-radius:4px;padding:7px 12px;margin-bottom:12px}'
    +'.proy .lbl{font-size:8px;text-transform:uppercase;color:#888;font-weight:700;margin-bottom:2px}'
    +'.proy .val{font-weight:700;font-size:13px;color:#1e3a6e}'
    +'.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:14px;background:#f8f9fb;border-radius:6px;padding:12px;border:1px solid #e2e6f0}'
    +'.lbl{font-size:8.5px;text-transform:uppercase;color:#999;margin-bottom:2px;font-weight:700}'
    +'.val{font-weight:600;font-size:11px}'
    /* ── Tablas de contenido (.ct) ── */
    +'.ct{width:100%;border-collapse:collapse;margin-bottom:14px}'
    +'.ct th{background:#1e3a6e;color:#fff;padding:6px 8px;font-size:9px;text-transform:uppercase;font-weight:700}'
    +'.ct th.l{text-align:left}.ct th.c{text-align:center}'
    +'.ct td{padding:5px 8px;border-bottom:1px solid #eee;font-size:11px}'
    +'.ct tr{page-break-inside:avoid}'
    +'.m{font-family:Courier New,monospace}'
    +'.sec{font-size:9.5px;text-transform:uppercase;color:#1e3a6e;margin:12px 0 6px;font-weight:700;border-left:3px solid #f59e0b;padding-left:7px}'
    +'.obs-box{background:#fafafa;border-left:3px solid #ccc;padding:8px 10px;color:#555;margin-bottom:12px;font-size:11px;border-radius:0 4px 4px 0}';
  let body='';
  // ── Tabla envolvente: thead = encabezado real repetido por página ──
  body+='<table class=doc><thead><tr><td>';
  body+='<div class=ph><div class=ph-inner>';
  body+='<img src="'+_logoUrl+'" class=ph-logo alt="Ecosermo">';
  body+='<div class=ph-center><div class=ph-title>Requerimiento de Materiales</div><div class=ph-rq>N° '+e(r.num)+'</div></div>';
  body+='<div class=ph-right>Documento de uso interno<br>Generado por GDAR</div>';
  body+='</div></div>';
  body+='</td></tr></thead>';
  // ── tfoot = firmas reales repetidas en cada página ──
  body+='<tfoot><tr><td>';
  body+='<div class=pf><div class=pf-sep></div><div class=vb-wrap>';
  body+='<div class=vb><div class=vb-space></div><div class=vb-line></div><div class=vb-label>V°B° Jefe de Área</div><div class=vb-sub>Firma y sello</div></div>';
  body+='<div class=vb><div class=vb-space></div><div class=vb-line></div><div class=vb-label>V°B° Jefe de Proy. / Residente</div><div class=vb-sub>Firma y sello</div></div>';
  body+='<div class=vb><div class=vb-space></div><div class=vb-line></div><div class=vb-label>V°B° Almacén</div><div class=vb-sub>Firma y sello</div></div>';
  body+='</div></div>';
  body+='</td></tr></tfoot>';
  body+='<tbody><tr><td>';

  // ── Contenido de página ──
  if(r.proyecto)body+='<div class=proy><div class=lbl>Proyecto'+(r.codProy?' <span style="font-family:monospace;color:#d97706;font-size:10px;margin-left:6px">'+e(r.codProy)+'</span>':'')+'</div><div class=val>'+e(r.proyecto)+'</div></div>';
  body+='<div class=grid>';
  body+='<div><div class=lbl>Solicitante</div><div class=val>'+e(r.solicitante)+'</div></div>';
  body+='<div><div class=lbl>Área / Frente</div><div class=val>'+e(r.area)+'</div></div>';
  body+='<div><div class=lbl>Fecha RQ</div><div class=val>'+e(r.fecha)+'</div></div>';
  body+='<div><div class=lbl>F. Entrega</div><div class=val>'+e(r.fechaEnt||'—')+'</div></div>';
  body+='<div><div class=lbl>Prioridad</div><div class=val>'+e(r.prioridad)+'</div></div>';
  body+='<div><div class=lbl>Estado</div><div class=val>'+e(r.est)+'</div></div>';
  body+='</div>';
  body+='<div class=sec>Ítems Solicitados</div>';
  body+='<table class=ct><thead><tr><th class=c>#</th><th class=l>Código</th><th class=c>Img.</th><th class=l>Descripción</th><th class=c>Unid.</th><th class=c>Cant.</th><th class=l>Obs.</th><th class=l>T. Costo</th></tr></thead><tbody>'+iRows+'</tbody></table>';
  if(r.obs)body+='<div class=sec>Observaciones</div><div class=obs-box>'+e(r.obs)+'</div>';
  if(comps.length)body+='<div class=sec>Comprobantes Vinculados</div><table class=ct><thead><tr><th class=l>Tipo</th><th class=l>N° Comp.</th><th class=l>Proveedor</th><th class=c>Total S/</th><th class=l>Estado</th></tr></thead><tbody>'+cRows+'</tbody></table>';
  body+='</td></tr></tbody></table>';
  const S='<'+'/';
  const html='<!DOCTYPE html><html><head><meta charset=utf-8><title>'+e(r.num)+S+'title><style>'+css+S+'style>'+S+'head><body>'+body+S+'body>'+S+'html>';
  const win=window.open('','_blank');
  if(!win){toast('Active ventanas emergentes para exportar PDF',true);return;}
  win.document.write(html);win.document.close();win.focus();
  setTimeout(function(){win.print();},400);
}
// ══ PROYECTOS ══
let _editProyectoId=null;
function rProyectos(){
  document.getElementById('proyKpis').innerHTML=[
    {l:'Total Proyectos',v:DB.proyectos.length,c:'#f97316'},
    {l:'Activos',v:DB.proyectos.filter(p=>p.estado==='Activo').length,c:'#10b981'},
    {l:'Con Requerimientos',v:DB.proyectos.filter(p=>DB.requerimientos.some(r=>r.codProy===p.codigo||r.proyecto===p.nombre)).length,c:'#3b82f6'}
  ].map(k=>`<div class="kpi" style="--kc:${k.c}"><div class="kpi-lbl">${k.l}</div><div class="kpi-val">${k.v}</div></div>`).join('');
  document.getElementById('tbProyectos').innerHTML=DB.proyectos.map(p=>{
    const nReqs=DB.requerimientos.filter(r=>r.codProy===p.codigo||r.proyecto===p.nombre).length;
    return`<tr>
      <td class="mono" style="color:var(--alm);font-weight:700">${p.codigo}</td>
      <td><strong>${p.nombre}</strong></td>
      <td style="color:var(--muted2);font-size:.8rem">${p.descripcion||'—'}</td>
      <td>${bge(p.estado)}</td>
      <td style="text-align:center;color:${nReqs?'var(--alm)':'var(--muted)'};font-weight:600">${nReqs||'0'}</td>
      <td>
        <button class="btn btn-sm" style="background:rgba(245,158,11,.15);border:1px solid #f59e0b60;color:#f59e0b" onclick="openProyectoEdit(${p.id})">✏️</button>
      </td>
    </tr>`;
  }).join('');
  
}
function _nextProyCod(){
  const yy=String(new Date().getFullYear()).slice(-2);
  const re=/^([A-Z]+)-(\d+)-(\d+)$/;
  const same=DB.proyectos.map(p=>p.codigo&&p.codigo.match(re)).filter(m=>m&&m[3]===yy);
  if(same.length===0)return'EPY-001-'+yy;
  const prefix=same[same.length-1][1];
  const maxN=Math.max(...same.filter(m=>m[1]===prefix).map(m=>+m[2]));
  return prefix+'-'+String(maxN+1).padStart(3,'0')+'-'+yy;
}
function openProyectoNew(){
  _editProyectoId=null;
  document.getElementById('pCod').value=_nextProyCod();
  document.getElementById('pNom').value='';
  document.getElementById('pDesc').value='';
  document.getElementById('pEst').value='Activo';
  document.getElementById('mProyTtl').textContent='🏗 Nuevo Proyecto';
  openM('mProyecto');
}

function openProyectoEdit(id){
  const p=DB.proyectos.find(x=>x.id===id);if(!p)return;
  _editProyectoId=id;
  document.getElementById('pCod').value=p.codigo||'';
  document.getElementById('pNom').value=p.nombre||'';
  document.getElementById('pDesc').value=p.descripcion||'';
  document.getElementById('pEst').value=p.estado||'Activo';
  document.getElementById('mProyTtl').textContent='✏️ Editar Proyecto';
  openM('mProyecto');
}
function gProyecto(){
  const codigo=document.getElementById('pCod').value.trim().toUpperCase();
  const nombre=document.getElementById('pNom').value.trim();
  if(!codigo||!nombre){toast('Ingrese código y nombre del proyecto',true);return;}
  const rec={codigo,nombre,descripcion:document.getElementById('pDesc').value.trim(),estado:document.getElementById('pEst').value};
  if(_editProyectoId){
    const idx=DB.proyectos.findIndex(x=>x.id===_editProyectoId);
    if(idx>-1){Object.assign(DB.proyectos[idx],rec);syncSheet('saveProyecto',DB.proyectos[idx]);}
    _editProyectoId=null;
    closeM('mProyecto');rProyectos();toast('Proyecto actualizado');
  }else{
    if(DB.proyectos.some(p=>p.codigo===codigo)){toast('Ya existe un proyecto con ese código',true);return;}
    rec.id=nid('proy');
    DB.proyectos.push(rec);
    syncSheet('saveProyecto',rec);
    closeM('mProyecto');rProyectos();toast('Proyecto registrado: '+codigo);
  }
}

let _rReqSortAsc=true;
function _rReqToggleSort(){
  _rReqSortAsc=!_rReqSortAsc;
  const ic=document.getElementById('rqSortIcon');
  if(ic)ic.textContent=_rReqSortAsc?'▲':'▼';
  rReq();
}
function exportReqXLS(){
  if(!window.XLSX){toast('Librería Excel no cargada aún, intenta en unos segundos',true);return;}
  const pfEl=document.getElementById('rqProyFilter');
  const filtProy=pfEl?pfEl.value:'';
  let lista=DB.requerimientos;
  if(filtProy)lista=lista.filter(r=>(r.proyecto||'')===filtProy);
  const wb=XLSX.utils.book_new();
  // Hoja 1: Resumen
  const h1=['Cód. Proyecto','N° RQ','Fecha','Proyecto','Solicitante','Área','Prioridad','Estado','N° Ítems','Comprobantes'];
  const d1=lista.map(r=>[
    r.codProy||'',r.num||'',r.fecha||'',r.proyecto||'',
    r.solicitante||'',r.area||'',r.prioridad||'',r.est||'',
    (r.items||[]).length,
    DB.facturasPago.filter(f=>f.reqId===r.id).map(f=>f.num).join(', ')
  ]);
  const ws1=XLSX.utils.aoa_to_sheet([h1,...d1]);
  ws1['!cols']=[{wch:12},{wch:10},{wch:12},{wch:28},{wch:22},{wch:18},{wch:12},{wch:16},{wch:8},{wch:22}];
  XLSX.utils.book_append_sheet(wb,ws1,'Requerimientos');
  // Hoja 2: Detalle ítems
  const h2=['Cód. Proyecto','N° RQ','Fecha','Estado','Cód. Ítem','Descripción','Unidad','Cantidad','Observación','Tipo Costo'];
  const d2=[];
  lista.forEach(r=>(r.items||[]).forEach(it=>d2.push([
    r.codProy||'',r.num||'',r.fecha||'',r.est||'',
    it.cod||'',it.desc||'',it.und||'',it.cant||0,it.obs||'',it.tcosto||''
  ])));
  const ws2=XLSX.utils.aoa_to_sheet([h2,...d2]);
  ws2['!cols']=[{wch:12},{wch:10},{wch:12},{wch:16},{wch:14},{wch:35},{wch:8},{wch:9},{wch:25},{wch:16}];
  XLSX.utils.book_append_sheet(wb,ws2,'Detalle Ítems');
  XLSX.writeFile(wb,`Requerimientos_${new Date().toISOString().slice(0,10)}.xlsx`);
  toast('✓ Excel descargado');
}

function exportKardexXLS(){
  if(!window.XLSX){toast('Librería Excel no cargada aún, intenta en unos segundos',true);return;}
  // Mismo orden y filtros que rAlm()
  const filas=[...DB.almacen].sort((a,b)=>a.fecha<b.fecha?-1:a.fecha>b.fecha?1:a.id-b.id);
  const saldos={},saldoMap={};
  filas.forEach(r=>{if(saldos[r.codigo]===undefined)saldos[r.codigo]=0;saldos[r.codigo]+=(r.tipo==='E'?1:-1)*r.cant;saldoMap[r.id]=saldos[r.codigo];});
  let fm=_almFiltTipo?filas.filter(r=>r.tipo===_almFiltTipo):filas;
  if(_almFiltProy)fm=fm.filter(r=>(r.codProy||'').trim()===_almFiltProy);
  if(_almFiltMat)fm=fm.filter(r=>r.codigo&&r.codigo.toUpperCase().startsWith(_almFiltMat.toUpperCase()+'-'));
  if(_almFiltFecha)fm=fm.filter(r=>r.fecha===_almFiltFecha);
  if(_almFiltText)fm=fm.filter(r=>[r.codigo,r.nombre,r.proyecto,r.rqRef,r.numVale,r.para,r.tipoCosto,r.proveedor].some(v=>String(v||'').toLowerCase().includes(_almFiltText)));
  const wb=XLSX.utils.book_new();
  const hdr=['Fecha','Proyecto','Cód. Proyecto','RQ / VAL','Código','Descripción','Unidad','Movimiento','Cantidad','Saldo','Tipo Costo','Para Persona/Equipo','Proveedor'];
  const rows=fm.map(r=>[
    r.fecha||'',r.proyecto||'',r.codProy||'',
    r.tipo==='S'?(r.numVale||''):(r.rqRef||''),
    r.codigo||'',r.nombre||'',r.unidad||'',
    r.tipo==='E'?'Entrada':'Salida',
    r.tipo==='E'?+r.cant:-r.cant,
    saldoMap[r.id]||0,
    r.tipoCosto||'',r.para||'',r.proveedor||''
  ]);
  const ws=XLSX.utils.aoa_to_sheet([hdr,...rows]);
  ws['!cols']=[{wch:12},{wch:28},{wch:12},{wch:12},{wch:14},{wch:32},{wch:8},{wch:9},{wch:9},{wch:9},{wch:15},{wch:28},{wch:22}];
  XLSX.utils.book_append_sheet(wb,ws,'Kardex');
  XLSX.writeFile(wb,`Kardex_${new Date().toISOString().slice(0,10)}.xlsx`);
  toast('✓ Excel descargado');
}

function rReq(){
  // Actualizar opciones del filtro de proyecto preservando selección
  const pfEl=document.getElementById('rqProyFilter');
  const prevProy=pfEl?pfEl.value:'';
  if(pfEl){
    pfEl.innerHTML='<option value="">— Todos —</option>'
      +DB.proyectos.filter(p=>p.estado!=='Anulado')
        .sort((a,b)=>a.codigo.localeCompare(b.codigo))
        .map(p=>`<option value="${p.nombre}">${p.codigo} – ${p.nombre}</option>`).join('');
    pfEl.value=prevProy;
  }
  const filtProy=pfEl?pfEl.value:'';

  // Filtrar primero, luego calcular KPIs sobre el mismo subconjunto
  let lista=DB.requerimientos;
  if(filtProy) lista=lista.filter(r=>(r.proyecto||'')===filtProy);

  const tot=lista.length;
  const pend=lista.filter(r=>r.est==='Pendiente').length;
  const aten=lista.filter(r=>r.est==='Atendido').length;
  document.getElementById('reqKpis').innerHTML=[
    {l:'Total Requerimientos',v:tot,c:'#f97316'},
    {l:'Pendientes',v:pend,c:'#ef4444'},
    {l:'En Proceso',v:lista.filter(r=>r.est==='En Proceso').length,c:'#f59e0b'},
    {l:'Atendido Parcial',v:lista.filter(r=>r.est==='Atendido Parcial').length,c:'#06b6d4'},
    {l:'Atendidos',v:aten,c:'#10b981'},
    {l:'Con Comprobante',v:lista.filter(r=>DB.facturasPago.some(f=>f.reqId===r.id)).length,c:'#3b82f6'}
  ].map(k=>`<div class="kpi" style="--kc:${k.c}"><div class="kpi-lbl">${k.l}</div><div class="kpi-val">${k.v}</div></div>`).join('');
  const dir=_rReqSortAsc?1:-1;
  document.getElementById('tbReq').innerHTML=[...lista].sort((a,b)=>{
    const pc=(a.codProy||'').localeCompare(b.codProy||'');
    if(pc!==0)return pc*dir;
    const na=parseInt((a.num||'').replace(/\D/g,''))||0;
    const nb=parseInt((b.num||'').replace(/\D/g,''))||0;
    return(na-nb)*dir;
  }).map(r=>{
    const comps=DB.facturasPago.filter(f=>f.reqId===r.id);
    const compBadge=comps.length?`<span class="badge b-green" style="cursor:pointer" onclick="verTrazReq(${r.id})">🔗 ${comps.length} comp.</span>`:`<span class="badge b-yellow">Sin comp.</span>`;
    return`<tr>
      <td class="mono" style="font-weight:700;color:var(--alm)">${r.codProy||'<span style="color:var(--muted)">—</span>'}</td>
      <td class="mono" style="font-weight:600">${r.num}</td>
      <td class="mono">${r.fecha}</td>
      <td>${r.solicitante}</td>
      <td>${r.area}</td>
      <td>${bge(r.prioridad)}</td>
      <td style="color:var(--muted2);font-size:.72rem">${r.items.length} ítem(s)</td>
      <td>${bge(r.est)}</td>
      <td>${compBadge}</td>
      <td style="display:flex;gap:.3rem">
        <button class="btn btn-out btn-sm" onclick="verDetalleReq(${r.id})">👁 Ver</button>
        ${r.est!=='Atendido'?`<button class="btn btn-del btn-sm" onclick="del('requerimientos',${r.id})">🗑</button>`:''}
      </td></tr>`;
  }).join('');
}
function _proyNextNum(proy){
  if(!proy||!proy.trim())return null;
  const p=proy.trim().toUpperCase();
  const proyReqs=DB.requerimientos.filter(r=>r.proyecto&&r.proyecto.toUpperCase()===p);
  const maxNum=proyReqs.reduce((mx,r)=>{const n=parseInt((r.num||'').replace(/\D/g,''))||0;return Math.max(mx,n);},0);
  return{next:'RQ-'+String(maxNum+1).padStart(3,'0'),last:proyReqs.length?[...proyReqs].sort((a,b)=>a.num>b.num?1:-1).pop().num:null,count:proyReqs.length};
}
function showRqProyAc(val){
  const drop=document.getElementById('rqProyAcDrop');
  let lista=DB.proyectos.filter(p=>p.estado!=='Anulado');
  if(val){const v=val.toLowerCase();lista=lista.filter(p=>p.nombre.toLowerCase().includes(v)||p.codigo.toLowerCase().includes(v));}
  updateRqNumHint(val);
  if(!lista.length){drop.style.display='none';return;}
  drop.innerHTML=lista.map(p=>{
    const info=_proyNextNum(p.nombre);
    const esc=p.nombre.replace(/\\/g,'\\\\').replace(/'/g,"\\'");
    return`<div onmousedown="selectRqProy('${esc}','${p.codigo}')"
      style="padding:.5rem .8rem;cursor:pointer;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid var(--border)"
      onmouseover="this.style.background='var(--panel2)'" onmouseout="this.style.background=''">
      <div>
        <div style="font-weight:600;font-size:.83rem">${p.nombre}</div>
        <div style="font-size:.65rem;color:var(--alm);font-family:'Roboto Mono',monospace;margin-top:.1rem">${p.codigo}</div>
      </div>
      <span style="font-size:.65rem;color:var(--muted2);margin-left:.8rem;white-space:nowrap">${info&&info.count?info.count+' RQ · → '+info.next:'Primer RQ'}</span>
    </div>`;
  }).join('');
  drop.style.display='block';
}
function selectRqProy(nombre,codigo){
  document.getElementById('rqProy').value=nombre;
  document.getElementById('rqCodProy').value=codigo||'';
  hideRqProyAc();
  updateRqNumHint(nombre);
}
function hideRqProyAc(){const d=document.getElementById('rqProyAcDrop');if(d)d.style.display='none';}
function updateRqNumHint(proy){
  const hint=document.getElementById('rqProyNumHint');if(!hint)return;
  if(!proy||!proy.trim()){hint.textContent='';return;}
  // Auto-fill code if not already filled
  const codEl=document.getElementById('rqCodProy');
  if(codEl&&!codEl.value){
    const match=DB.proyectos.find(p=>p.nombre.toLowerCase()===proy.trim().toLowerCase());
    if(match)codEl.value=match.codigo;
  }
  const info=_proyNextNum(proy);
  if(!info)return;
  const codProy=codEl&&codEl.value?` [${codEl.value}]`:'';
  hint.textContent=info.last
    ?`Proyecto${codProy} · ${info.count} RQ · Último: ${info.last} · Siguiente: ${info.next}`
    :`Proyecto${codProy} · Primer requerimiento: ${info.next}`;
}
function _resolverCodProy(nombre,codManual){
  if(codManual)return codManual;
  if(!nombre)return '';
  const n=nombre.trim().toLowerCase();
  const found=DB.proyectos.find(p=>p.nombre.toLowerCase()===n||p.codigo.toLowerCase()===n);
  return found?found.codigo:'';
}
function gReq(){
  if(!reqItemsArr.length){toast('Agregue al menos un ítem',true);return;}
  const valid=reqItemsArr.some(it=>it.desc.trim());
  if(!valid){toast('Complete la descripción del ítem',true);return;}
  const items=JSON.parse(JSON.stringify(reqItemsArr));
  if(_reqEditId){
    // modo edición
    const idx=DB.requerimientos.findIndex(x=>x.id===_reqEditId);
    if(idx<0){toast('Requerimiento no encontrado',true);return;}
    const r=DB.requerimientos[idx];
    // El número NO se recalcula al editar (mantiene su RQ original).
    // Solo si se cambia de proyecto, toma el siguiente correlativo del nuevo proyecto.
    const proyNuevo=document.getElementById('rqProy').value.trim();
    const cambioProy=(r.proyecto||'').trim().toUpperCase()!==proyNuevo.toUpperCase();
    let numNuevo=null;
    if(cambioProy&&proyNuevo){const _i=_proyNextNum(proyNuevo);if(_i)numNuevo=_i.next;}
    r.proyecto=proyNuevo;
    r.codProy=_resolverCodProy(r.proyecto,document.getElementById('rqCodProy').value.trim());
    document.getElementById('rqCodProy').value=r.codProy;
    r.fecha=document.getElementById('rqF').value||today();
    r.solicitante=document.getElementById('rqSol').value;
    r.area=document.getElementById('rqArea').value;
    r.fechaEnt=document.getElementById('rqFEnt').value;
    r.prioridad=document.getElementById('rqPrior').value;
    r.est=document.getElementById('rqEst').value;
    r.obs=document.getElementById('rqObs').value;
    r.items=items;
    if(numNuevo)r.num=numNuevo;
    supaGuardarRequerimiento(r);
    _reqEditId=null;
    closeM('mReq');rReq();toast('Requerimiento actualizado: '+r.num);
    return;
  }
  const newId=nid('req');
  const _proy=document.getElementById('rqProy').value.trim();
  const _info=_proyNextNum(_proy);
  const num=_info?_info.next:'RQ-'+String(newId).padStart(3,'0');
  const _codProy=_resolverCodProy(_proy,document.getElementById('rqCodProy').value.trim());
  if(_codProy)document.getElementById('rqCodProy').value=_codProy;
  const newReq={
    id:newId,num,
    proyecto:_proy,
    codProy:_codProy,
    fecha:document.getElementById('rqF').value||today(),
    solicitante:document.getElementById('rqSol').value,
    area:document.getElementById('rqArea').value,
    fechaEnt:document.getElementById('rqFEnt').value,
    prioridad:document.getElementById('rqPrior').value,
    est:document.getElementById('rqEst').value,
    obs:document.getElementById('rqObs').value,
    userEmail:CU?CU.nombre:'',
    items
  };
  DB.requerimientos.push(newReq);
  reqItemsArr.forEach(it=>{
    if(!it.desc.trim())return;
    const existe=DB.catalogoItems.some(c=>c.tipo===it.tipo&&c.desc.toLowerCase()===it.desc.toLowerCase());
    if(!existe)DB.catalogoItems.push({id:nid('cat'),tipo:it.tipo,cod:it.cod,desc:it.desc,und:it.und});
  });
  supaGuardarRequerimiento(newReq);
  closeM('mReq');rReq();toast('Requerimiento registrado: '+num);
}
function verDetalleReq(id){
  const r=DB.requerimientos.find(x=>x.id===id);if(!r)return;
  _reqVerCurrentId=id;
  const comps=DB.facturasPago.filter(f=>f.reqId===id);
  document.getElementById('mReqVerTtl').textContent='Detalle: '+r.num;
  document.getElementById('mReqVerBody').innerHTML=`
    ${r.proyecto?`<div style="background:var(--panel2);border:1px solid var(--border);border-radius:7px;padding:.5rem .8rem;margin-bottom:.7rem"><span style="font-size:.6rem;color:var(--muted2);text-transform:uppercase;letter-spacing:.1em">Proyecto</span><div style="font-weight:700;font-size:.95rem;margin-top:.15rem">${r.proyecto}</div></div>`:''}
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:.6rem;margin-bottom:.9rem">
      <div><div style="font-size:.6rem;color:var(--muted2);text-transform:uppercase;letter-spacing:.1em">Solicitante</div><div style="font-weight:600">${r.solicitante}</div></div>
      <div><div style="font-size:.6rem;color:var(--muted2);text-transform:uppercase;letter-spacing:.1em">Área / Frente</div><div>${r.area}</div></div>
      <div><div style="font-size:.6rem;color:var(--muted2);text-transform:uppercase;letter-spacing:.1em">Fecha</div><div class="mono">${r.fecha}</div></div>
      <div><div style="font-size:.6rem;color:var(--muted2);text-transform:uppercase;letter-spacing:.1em">F. Entrega</div><div class="mono">${r.fechaEnt||'—'}</div></div>
      <div><div style="font-size:.6rem;color:var(--muted2);text-transform:uppercase;letter-spacing:.1em">Prioridad</div>${bge(r.prioridad)}</div>
      <div><div style="font-size:.6rem;color:var(--muted2);text-transform:uppercase;letter-spacing:.1em">Estado</div>${bge(r.est)}</div>
    </div>
    <div style="font-size:.62rem;color:var(--muted2);text-transform:uppercase;letter-spacing:.1em;margin-bottom:.4rem">Ítems Solicitados</div>
    <div style="overflow-x:auto;margin-bottom:.9rem"><table style="width:100%;font-size:.76rem;border-collapse:collapse">
      <thead><tr><th style="background:var(--panel2);padding:.32rem .6rem;text-align:left;font-size:.59rem;letter-spacing:.1em;color:var(--muted2);text-transform:uppercase">#</th><th style="background:var(--panel2);padding:.32rem .6rem;text-align:left;font-size:.59rem;letter-spacing:.1em;color:var(--muted2);text-transform:uppercase">Código</th><th style="background:var(--panel2);padding:.32rem .6rem;text-align:center;font-size:.59rem;letter-spacing:.1em;color:var(--muted2);text-transform:uppercase">Img.</th><th style="background:var(--panel2);padding:.32rem .6rem;text-align:left;font-size:.59rem;letter-spacing:.1em;color:var(--muted2);text-transform:uppercase">Descripción</th><th style="background:var(--panel2);padding:.32rem .6rem;text-align:left;font-size:.59rem;letter-spacing:.1em;color:var(--muted2);text-transform:uppercase">Unid.</th><th style="background:var(--panel2);padding:.32rem .6rem;text-align:right;font-size:.59rem;letter-spacing:.1em;color:var(--muted2);text-transform:uppercase">Cant.</th><th style="background:var(--panel2);padding:.32rem .6rem;text-align:left;font-size:.59rem;letter-spacing:.1em;color:var(--muted2);text-transform:uppercase">Obs.</th><th style="background:var(--panel2);padding:.32rem .6rem;text-align:left;font-size:.59rem;letter-spacing:.1em;color:var(--muted2);text-transform:uppercase;white-space:nowrap">T. Costo</th></tr></thead>
      <tbody>${r.items.map((it,i)=>{const _cat=DB.catalogoItems.find(c=>c.cod===it.cod);const _img=_cat?.img||'';const _imgCell=_img?`<img src="${_img}" style="width:36px;height:36px;object-fit:cover;border-radius:5px;border:1px solid var(--border)">`:`<div style="width:36px;height:36px;background:var(--panel2);border-radius:5px;border:1px solid var(--border);display:inline-flex;align-items:center;justify-content:center;font-size:.5rem;color:var(--muted)">—</div>`;return`<tr><td style="padding:.3rem .6rem;color:var(--muted2)">${i+1}</td><td style="padding:.3rem .6rem" class="mono">${it.cod||'—'}</td><td style="padding:.3rem .6rem;text-align:center">${_imgCell}</td><td style="padding:.3rem .6rem"><strong>${it.desc}</strong></td><td style="padding:.3rem .6rem">${it.und}</td><td style="padding:.3rem .6rem;text-align:right" class="mono">${it.cant}</td><td style="padding:.3rem .6rem;color:var(--muted2)">${it.obs||'—'}</td><td style="padding:.3rem .6rem;font-size:.72rem;color:${it.tcosto?'var(--alm)':'var(--muted2)'}">${it.tcosto||'—'}</td></tr>`}).join('')}</tbody>
    </table></div>
    ${r.obs?`<div style="margin-bottom:.9rem"><div style="font-size:.6rem;color:var(--muted2);text-transform:uppercase;letter-spacing:.1em;margin-bottom:.25rem">Observaciones</div><div style="color:var(--muted2);font-size:.8rem">${r.obs}</div></div>`:''}
    <div style="font-size:.62rem;color:var(--muted2);text-transform:uppercase;letter-spacing:.1em;margin-bottom:.4rem">🔗 Comprobantes Vinculados</div>
    ${comps.length?`<div style="overflow-x:auto"><table style="width:100%;font-size:.76rem;border-collapse:collapse">
      <thead><tr><th style="background:var(--panel2);padding:.32rem .6rem;font-size:.59rem;letter-spacing:.1em;color:var(--muted2);text-transform:uppercase;text-align:left">Tipo</th><th style="background:var(--panel2);padding:.32rem .6rem;font-size:.59rem;letter-spacing:.1em;color:var(--muted2);text-transform:uppercase;text-align:left">N° Comp.</th><th style="background:var(--panel2);padding:.32rem .6rem;font-size:.59rem;letter-spacing:.1em;color:var(--muted2);text-transform:uppercase;text-align:left">Proveedor</th><th style="background:var(--panel2);padding:.32rem .6rem;font-size:.59rem;letter-spacing:.1em;color:var(--muted2);text-transform:uppercase;text-align:right">Total S/</th><th style="background:var(--panel2);padding:.32rem .6rem;font-size:.59rem;letter-spacing:.1em;color:var(--muted2);text-transform:uppercase;text-align:left">Estado</th><th style="background:var(--panel2);padding:.32rem .6rem;font-size:.59rem;letter-spacing:.1em;color:var(--muted2);text-transform:uppercase;text-align:left">PDF</th></tr></thead>
      <tbody>${comps.map(c=>`<tr><td style="padding:.3rem .6rem">${bge(c.tipo)}</td><td style="padding:.3rem .6rem" class="mono">${c.num}</td><td style="padding:.3rem .6rem">${c.prov}</td><td style="padding:.3rem .6rem;text-align:right;color:#10b981;font-family:'Roboto Mono',monospace">${fmt(c.total)}</td><td style="padding:.3rem .6rem">${bge(c.est)}</td><td style="padding:.3rem .6rem">${(c.pdfUrl||c.pdfData)?`<a href="${c.pdfUrl||c.pdfData}" target="_blank" rel="noopener" style="color:var(--alm);text-decoration:none;font-size:.72rem">📄 ${c.pdfName||'Ver PDF'}</a>`:'<span style="color:var(--muted);font-size:.72rem">—</span>'}</td></tr>`).join('')}</tbody>
    </table></div>`:
    `<div style="color:var(--muted2);font-size:.8rem;padding:.5rem 0">Sin comprobantes vinculados aún.</div>`}`;
  openM('mReqVer');
  const btnEdit=document.getElementById('btnReqEdit');
  if(btnEdit){
    const bloqueado=r.est==='Atendido'||r.est==='Anulado';
    btnEdit.style.opacity=bloqueado?'0.45':'1';
    btnEdit.style.cursor=bloqueado?'not-allowed':'pointer';
  }
}
function verTrazReq(reqId){
  const r=DB.requerimientos.find(x=>x.id===reqId);if(!r)return;
  const comps=DB.facturasPago.filter(f=>f.reqId===reqId);
  const card=document.getElementById('cardTraz');
  const body=document.getElementById('bodyTraz');
  body.innerHTML=`
    <div style="margin-bottom:.7rem">
      <span style="font-size:.8rem;color:var(--muted2)">Requerimiento:</span>
      <strong style="margin-left:.4rem;color:var(--alm)">${r.num}</strong>
      <span style="margin-left:.6rem;font-size:.8rem">${r.solicitante} · ${r.area}</span>
      <span style="margin-left:.5rem">${bge(r.est)}</span>
    </div>
    <div style="font-size:.62rem;color:var(--muted2);text-transform:uppercase;letter-spacing:.1em;margin-bottom:.4rem">Comprobantes Vinculados</div>
    <div style="overflow-x:auto"><table style="width:100%;font-size:.77rem;border-collapse:collapse">
      <thead><tr><th style="background:var(--panel2);padding:.35rem .65rem;text-align:left;font-size:.6rem;color:var(--muted2);text-transform:uppercase;letter-spacing:.1em">Tipo</th><th style="background:var(--panel2);padding:.35rem .65rem;text-align:left;font-size:.6rem;color:var(--muted2);text-transform:uppercase;letter-spacing:.1em">N° Comprobante</th><th style="background:var(--panel2);padding:.35rem .65rem;text-align:left;font-size:.6rem;color:var(--muted2);text-transform:uppercase;letter-spacing:.1em">Proveedor</th><th style="background:var(--panel2);padding:.35rem .65rem;text-align:right;font-size:.6rem;color:var(--muted2);text-transform:uppercase;letter-spacing:.1em">Total S/</th><th style="background:var(--panel2);padding:.35rem .65rem;text-align:left;font-size:.6rem;color:var(--muted2);text-transform:uppercase;letter-spacing:.1em">Estado</th><th style="background:var(--panel2);padding:.35rem .65rem;text-align:left;font-size:.6rem;color:var(--muted2);text-transform:uppercase;letter-spacing:.1em">PDF</th></tr></thead>
      <tbody>${comps.map(c=>`<tr><td style="padding:.35rem .65rem">${bge(c.tipo)}</td><td style="padding:.35rem .65rem" class="mono">${c.num}</td><td style="padding:.35rem .65rem">${c.prov}</td><td style="padding:.35rem .65rem;text-align:right;color:#10b981;font-family:'Roboto Mono',monospace">${fmt(c.total)}</td><td style="padding:.35rem .65rem">${bge(c.est)}</td><td style="padding:.35rem .65rem">${(c.pdfUrl||c.pdfData)?`<a href="${c.pdfUrl||c.pdfData}" target="_blank" rel="noopener" style="color:var(--alm);text-decoration:none;font-size:.72rem">📄 ${c.pdfName||'Ver PDF'}</a>`:'<span style="color:var(--muted);font-size:.72rem">—</span>'}</td></tr>`).join('')}</tbody>
    </table></div>`;
  card.style.display='block';
  card.scrollIntoView({behavior:'smooth',block:'start'});
}

// ══ FACTURAS / BOLETAS DE PAGO ══
function rFPago(){
  // Poblar filtro de proyecto preservando selección
  const pfEl=document.getElementById('fpProyFilterMain');
  const prevProy=pfEl?pfEl.value:'';
  if(pfEl){
    pfEl.innerHTML='<option value="">— Todos —</option>'
      +DB.proyectos.filter(p=>p.estado!=='Anulado')
        .sort((a,b)=>a.codigo.localeCompare(b.codigo))
        .map(p=>`<option value="${p.nombre}">${p.codigo} – ${p.nombre}</option>`).join('');
    pfEl.value=prevProy;
  }
  const filtProy=pfEl?pfEl.value:'';

  // Filtrar facturas según proyecto seleccionado
  let lista=DB.facturasPago;
  if(filtProy){
    lista=lista.filter(f=>{
      if(!f.reqId) return false;
      const req=DB.requerimientos.find(r=>r.id===f.reqId);
      return req&&(req.proyecto||'')===filtProy;
    });
  }

  // KPIs DEL SUBCONJUNTO FILTRADO
  const tot=lista.reduce((a,c)=>a+c.total,0);
  const pag=lista.filter(f=>f.est==='Pagado').length;
  document.getElementById('fpagoKpis').innerHTML=[
    {l:'Total Registrado',v:fmt(tot),c:'#10b981'},
    {l:'Comprobantes',v:lista.length,c:'#f97316'},
    {l:'Pagados',v:pag,c:'#3b82f6'},
    {l:'Pendientes',v:lista.filter(f=>f.est==='Recibido'||f.est==='Verificado').length,c:'#ef4444'}
  ].map(k=>`<div class="kpi" style="--kc:${k.c}"><div class="kpi-lbl">${k.l}</div><div class="kpi-val" style="font-size:${k.v.toString().length>8?'1.2rem':'1.85rem'}">${k.v}</div></div>`).join('');
  document.getElementById('tbFPago').innerHTML=lista.map(f=>{
    const req=DB.requerimientos.find(r=>r.id===f.reqId);
    const reqBadge=req?`<span class="badge b-orange" style="cursor:pointer" onclick="verTrazReq(${req.id})">${req.num}</span>`:`<span style="color:var(--muted);font-size:.72rem">—</span>`;
    const _pdfHref=f.pdfUrl||f.pdfData||'';
    const pdfLink=_pdfHref?`<a href="${_pdfHref}" target="_blank" rel="noopener" style="color:var(--alm);text-decoration:none;font-size:.76rem;display:flex;align-items:center;gap:.2rem">📄 Ver PDF</a>`:`<span style="color:var(--muted);font-size:.72rem">—</span>`;
    return`<tr>
      <td class="mono" style="font-weight:600">${f.num}</td>
      <td>${bge(f.tipo)}</td>
      <td class="mono">${f.fecha}</td>
      <td>${f.prov}</td>
      <td>${reqBadge}</td>
      <td style="font-size:.75rem;color:var(--alm);font-weight:600;font-family:'Roboto Mono',monospace">${f.moneda||'Soles (S/)'}</td>
      <td class="tr mono" style="color:#10b981">${fmt(f.total)}</td>
      <td>${bge(f.est)}</td>
      <td style="font-size:.73rem;color:var(--alm)">${f.tipoCobro||'<span style="color:var(--muted)">—</span>'}</td>
      <td style="font-size:.73rem;color:var(--muted2)">${f.edp||'<span style="color:var(--muted)">—</span>'}</td>
      <td>${pdfLink}</td>
      <td style="display:flex;gap:.3rem">
        ${_pdfHref?(_fpYaExtraida(f)
          ?`<button class="btn btn-out btn-sm" title="Ya extraída a Reembolsables/Gastos — click para volver a extraer" onclick="extraerFactura(${f.id})" style="color:#10b981;border-color:#10b981;background:rgba(16,185,129,.15);font-weight:700">✓ Extraído</button>`
          :`<button class="btn btn-out btn-sm" title="Extraer ítems del PDF → Reembolsables/Gastos" onclick="extraerFactura(${f.id})" style="color:#10b981;border-color:#10b98150">🔍 Extraer</button>`):''}
        <button class="btn btn-out btn-sm" title="Editar" onclick="editFPago(${f.id})" style="color:#f59e0b;border-color:#f59e0b40">✏️</button>
        ${f.est!=='Pagado'?`<button class="btn btn-del btn-sm" onclick="del('facturasPago',${f.id})">🗑</button>`:''}
      </td></tr>`;
  }).join('');
  if(typeof _fpTabActiva!=='undefined'&&_fpTabActiva==='reemb')rReembolsables();
}
const todayDMY=()=>{const d=new Date();return String(d.getDate()).padStart(2,'0')+'/'+String(d.getMonth()+1).padStart(2,'0')+'/'+d.getFullYear();};
const toDMY=iso=>{if(!iso||!iso.includes('-'))return iso||'';const[y,m,d]=iso.split('-');return`${d}/${m}/${y}`;};
const toISO=dmy=>{if(!dmy||!dmy.includes('/'))return dmy||'';const[d,m,y]=dmy.split('/');return`${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`;};
function actualizarLabelMoneda(val,custom){
  const sym=val==='Soles (S/)'?'S/':val==='Dólares (USD)'?'USD':val==='Euros (€)'?'€':(custom||'').trim();
  const lm=document.getElementById('fpMontoLbl');if(lm)lm.textContent='Monto'+(sym?' '+sym:'')+ ' (sin IGV)';
  const li=document.getElementById('fpIgvLbl');if(li)li.textContent='IGV'+(sym?' '+sym:'')+ ' (18%)';
  const lt=document.getElementById('fpTotalLbl');if(lt)lt.textContent='Total'+(sym?' '+sym:'');
}
function _initFpProyFilter(selProy){
  const el=document.getElementById('fpProyFilter');if(!el)return;
  el.innerHTML='<option value="">— Todos los proyectos —</option>'
    +DB.proyectos.filter(p=>p.estado!=='Anulado').map(p=>`<option value="${p.nombre}">${p.codigo} – ${p.nombre}</option>`).join('');
  el.value=selProy||'';
}
function filtrarFpReq(proyNombre){
  const sel=document.getElementById('fpReq');if(!sel)return;
  let reqs=DB.requerimientos;
  if(proyNombre)reqs=reqs.filter(r=>(r.proyecto||'')===proyNombre);
  sel.innerHTML='<option value="">— Sin Requerimiento —</option>'
    +reqs.map(r=>`<option value="${r.id}">[${r.est}] ${r.num} – ${r.solicitante}</option>`).join('');
}
function refreshFPagoProvDatalist(){
  const dl=document.getElementById('fpProvDatalist');if(!dl)return;
  const provs=[...new Set(DB.facturasPago.map(r=>r.prov).filter(v=>v&&v.trim()))].sort();
  dl.innerHTML=provs.map(p=>`<option value="${p}">`).join('');
}
function _fpProvAutoFill(){
  const val=(document.getElementById('fpProv').value||'').trim();
  if(!val)return;
  const match=DB.facturasPago.find(r=>(r.prov||'').trim()===val&&r.ruc);
  const el=document.getElementById('fpRuc');
  if(el){el.value=match?match.ruc:'';}
}
function newFPago(){
  _fpEditId=null;
  refreshSelects();
  refreshFPagoProvDatalist();
  _initFpProyFilter('');filtrarFpReq('');
  ['fpNum','fpProv','fpRuc','fpObs','fpEdp'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  document.getElementById('fpTipoCobro').value='';
  ['fpMonto','fpIgv','fpTotal'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  document.getElementById('fpTipo').value='Factura';
  document.getElementById('fpFecha').value=todayDMY();
  document.getElementById('fpEst').value='Recibido';
  document.getElementById('fpMoneda').value='Soles (S/)';
  document.getElementById('fpMonedaOtro').value='';
  document.getElementById('fpMonedaOtroDiv').style.display='none';
  actualizarLabelMoneda('Soles (S/)','');
  document.getElementById('fpPdf').value='';
  document.getElementById('fpPdfPreview').textContent='';
  document.querySelector('#mFPago .mttl').textContent='🧾 Cargar Comprobante de Pago';
  openM('mFPago');
}
let _fpEditId=null;
function editFPago(id){
  const f=DB.facturasPago.find(x=>x.id===id);if(!f)return;
  _fpEditId=id;
  refreshSelects();
  const _fpProy=(()=>{if(!f.reqId)return'';const rq=DB.requerimientos.find(r=>r.id==f.reqId);return rq?rq.proyecto||'':''})();
  _initFpProyFilter(_fpProy);
  // Cargar TODOS los requerimientos sin filtrar para garantizar que el req guardado esté disponible
  filtrarFpReq('');
  document.getElementById('fpTipo').value=f.tipo;
  document.getElementById('fpNum').value=f.num;
  document.getElementById('fpFecha').value=toDMY(f.fecha);
  document.getElementById('fpProv').value=f.prov;
  document.getElementById('fpRuc').value=f.ruc||'';
  document.getElementById('fpMonto').value=f.monto;
  document.getElementById('fpIgv').value=f.igv;
  document.getElementById('fpTotal').value=f.total;
  document.getElementById('fpEst').value=f.est;
  const _stdMonedas=['Soles (S/)','Dólares (USD)','Euros (€)'];
  const _mon=f.moneda||'Soles (S/)';
  const _monEsStd=_stdMonedas.includes(_mon);
  document.getElementById('fpMoneda').value=_monEsStd?_mon:'Otro';
  document.getElementById('fpMonedaOtro').value=_monEsStd?'':_mon;
  document.getElementById('fpMonedaOtroDiv').style.display=_monEsStd?'none':'flex';
  actualizarLabelMoneda(_monEsStd?_mon:'Otro',_monEsStd?'':_mon);
  document.getElementById('fpObs').value=f.obs||'';
  document.getElementById('fpTipoCobro').value=f.tipoCobro||'';
  document.getElementById('fpEdp').value=f.edp||'';
  const _ppEl=document.getElementById('fpPdfPreview');
  if(f.pdfUrl){_ppEl.innerHTML=`📎 <a href="${f.pdfUrl}" target="_blank" rel="noopener" style="color:var(--alm)">${f.pdfName||'Ver archivo'}</a> <span style="color:var(--muted2)">(existente — selecciona nuevo para reemplazar)</span>`;}
  else if(f.pdfName){_ppEl.textContent='📎 '+f.pdfName+' (existente)';}
  else{_ppEl.textContent='';}
  const fpReqEl=document.getElementById('fpReq');
  if(fpReqEl&&f.reqId)fpReqEl.value=f.reqId;
  const ttl=document.querySelector('#mFPago .mttl');
  if(ttl)ttl.textContent='✏️ Editar Comprobante: '+f.num;
  openM('mFPago');
}

function _fpStoragePath(url){
  if(!url)return null;
  const marker='/object/public/Facturas_RQ_pdf/';
  const i=url.indexOf(marker);
  return i!==-1?decodeURIComponent(url.slice(i+marker.length)):null;
}
async function gFPago(){
  const num=document.getElementById('fpNum').value.trim();
  if(!num){toast('Ingrese número de comprobante',true);return;}
  const file=document.getElementById('fpPdf').files[0];
  let pdfUrl='',pdfName='';
  if(file){
    // Si es edición y ya existía un PDF, borrar el archivo anterior del bucket
    if(_fpEditId!==null){
      const _prev=DB.facturasPago.find(x=>x.id===_fpEditId);
      const _oldPath=_fpStoragePath(_prev&&_prev.pdfUrl);
      if(_oldPath)await supa.storage.from('Facturas_RQ_pdf').remove([_oldPath]);
    }
    toast('Subiendo archivo PDF...');
    const ext=(file.name.split('.').pop()||'pdf').toLowerCase();
    const path=num.replace(/[^a-zA-Z0-9_-]/g,'_')+'_'+Date.now()+'.'+ext;
    const {error:upErr}=await supa.storage.from('Facturas_RQ_pdf').upload(path,file,{upsert:true});
    if(upErr){toast('Error al subir PDF: '+upErr.message,true);return;}
    const {data:urlData}=supa.storage.from('Facturas_RQ_pdf').getPublicUrl(path);
    pdfUrl=urlData.publicUrl;
    pdfName=file.name;
  }
  const reqIdRaw=document.getElementById('fpReq').value;
  const _mSel=document.getElementById('fpMoneda').value;
  const _moneda=_mSel==='Otro'?document.getElementById('fpMonedaOtro').value.trim()||'Otro':_mSel;
  const fields={
    tipo:document.getElementById('fpTipo').value,
    num,fecha:toISO(document.getElementById('fpFecha').value)||today(),
    prov:document.getElementById('fpProv').value,
    ruc:document.getElementById('fpRuc').value,
    monto:+document.getElementById('fpMonto').value||0,
    igv:+document.getElementById('fpIgv').value||0,
    total:+document.getElementById('fpTotal').value||0,
    moneda:_moneda,
    reqId:reqIdRaw?+reqIdRaw:null,
    est:document.getElementById('fpEst').value,
    tipoCobro:document.getElementById('fpTipoCobro').value||null,
    edp:document.getElementById('fpEdp').value.trim()||null,
    obs:document.getElementById('fpObs').value,
  };
  if(_fpEditId!==null){
    const idx=DB.facturasPago.findIndex(x=>x.id===_fpEditId);
    if(idx>-1){
      const prev=DB.facturasPago[idx];
      DB.facturasPago[idx]={...prev,...fields,
        pdfName:pdfName||(prev.pdfName||''),
        pdfUrl:pdfUrl||(prev.pdfUrl||'')
      };
      syncSheet('saveFacturaPago',DB.facturasPago[idx]);
    }
    _fpEditId=null;
    const ttl=document.querySelector('#mFPago .mttl');
    if(ttl)ttl.textContent='🧾 Cargar Comprobante de Pago';
    closeM('mFPago');rFPago();rReq();toast('Comprobante actualizado: '+num);
  }else{
    const newFpId=nid('fpago');
    DB.facturasPago.push({id:newFpId,...fields,pdfName,pdfUrl});
    if(reqIdRaw){
      const req=DB.requerimientos.find(r=>r.id===+reqIdRaw);
      if(req&&req.est==='Pendiente')req.est='Atendido';
    }
    syncSheet('saveFacturaPago',DB.facturasPago[DB.facturasPago.length-1]);
    closeM('mFPago');rFPago();rReq();toast('Comprobante registrado: '+num);
  }
}


// ══ EXTRACCIÓN DE FACTURAS → REEMBOLSABLES / GASTOS ══
let _fpTabActiva='comp';
function _fpTab(t){
  _fpTabActiva=t;
  const c=document.getElementById('fpTab-comp');
  const r=document.getElementById('fpTab-reemb');
  if(c)c.style.display=t==='comp'?'':'none';
  if(r)r.style.display=t==='reemb'?'':'none';
  ['comp','reemb'].forEach(x=>{
    const b=document.getElementById('fpTabBtn-'+x);
    if(b){b.style.background=x===t?'var(--alm)':'transparent';b.style.color=x===t?'#fff':'var(--muted2)';}
  });
  if(t==='reemb')rReembolsables();
}

let _feFacturaId=null;

// ¿La factura ya tiene ítems extraídos en Reembolsables/Gastos?
function _fpYaExtraida(f){
  const rs=DB.reembolsables||[];
  if(rs.some(r=>r.facturaId===f.id))return true;
  // Respaldo: comparar N° de comprobante (E001-1262) contra serie-correlativo guardados
  const numNorm=(f.num||'').toUpperCase().replace(/[\s]/g,'');
  if(!numNorm)return false;
  return rs.some(r=>`${(r.serie||'').toUpperCase()}-${r.correlativo||''}`===numNorm);
}

// ── Catálogo de códigos de reembolsable (tabla codigo_reemb; fallback local si está vacía) ──
const _CODIGO_REEMB_DEF=[
  {codigo:'R01',desc:'Examen médicos'},
  {codigo:'R02',desc:'ISEM anexo 4'},
  {codigo:'R03',desc:'Alimentación'},
  {codigo:'R04',desc:'Lavandería'},
  {codigo:'R05',desc:'Viaticos'},
  {codigo:'R06',desc:'Hospedaje'},
  {codigo:'R07',desc:'Equipos de proteccion personal (EPPs)'},
  {codigo:'R08',desc:'Agregados'},
  {codigo:'R09',desc:'Transporte de materiales y equipos'},
  {codigo:'R10',desc:'Movilizacion en cama baja'},
  {codigo:'R11',desc:'Dispositivos de seguridad'},
  {codigo:'R12',desc:'Formatos operativos y consumibles'},
  {codigo:'R13',desc:'Materiales'},
  {codigo:'R14',desc:'Seguridad'},
  {codigo:'R15',desc:'Parqueo de vehículos menores'},
  {codigo:'R16',desc:'Mobiliario y mat. de escritorio'},
  {codigo:'R17',desc:'Internet'},
  {codigo:'R18',desc:'Equipos de operación'}
];
function _feCatalogo(){
  return (DB.codigoReemb&&DB.codigoReemb.length)?DB.codigoReemb:_CODIGO_REEMB_DEF;
}
function _fePopulateDatalist(){
  const dl=document.getElementById('dlCodigoReemb');if(!dl)return;
  dl.innerHTML=_feCatalogo().map(c=>`<option value="${c.codigo}">${c.codigo} – ${c.desc}</option>`).join('');
}
// Al escribir el código (o parte de la descripción), autocompleta el Nombre Codif.
function _feCodChange(el){
  const tr=el.closest('tr');if(!tr)return;
  const out=tr.querySelector('.fe-codif');if(!out)return;
  const v=(el.value||'').trim().toUpperCase();
  if(!v){out.value='';return;}
  const cat=_feCatalogo();
  let hit=cat.find(c=>(c.codigo||'').toUpperCase()===v);
  if(!hit)hit=cat.find(c=>(c.desc||'').toUpperCase().includes(v));
  if(hit){el.value=hit.codigo;out.value=hit.desc;}
  else out.value='';
}

// Lee el PDF y devuelve las líneas de texto agrupadas por fila visual (coordenada Y)
async function _feLoadPdfLines(url){
  let data;
  if(url.startsWith('data:')){
    const b64=url.split(',')[1];
    const bin=atob(b64);
    data=new Uint8Array(bin.length);
    for(let i=0;i<bin.length;i++)data[i]=bin.charCodeAt(i);
  }else{
    const resp=await fetch(url);
    if(!resp.ok)throw new Error('No se pudo descargar el PDF ('+resp.status+')');
    data=new Uint8Array(await resp.arrayBuffer());
  }
  const pdf=await pdfjsLib.getDocument({data}).promise;
  const lines=[];
  for(let i=1;i<=pdf.numPages;i++){
    const page=await pdf.getPage(i);
    const tc=await page.getTextContent();
    const rowsMap={};
    tc.items.forEach(it=>{
      if(!it.str||!it.str.trim())return;
      const y=Math.round(it.transform[5]/4)*4; // agrupar por banda de ~4px
      if(!rowsMap[y])rowsMap[y]=[];
      rowsMap[y].push({x:it.transform[4],s:it.str});
    });
    Object.keys(rowsMap).map(Number).sort((a,b)=>b-a).forEach(y=>{
      const line=rowsMap[y].sort((a,b)=>a.x-b.x).map(o=>o.s).join(' ').replace(/\s+/g,' ').trim();
      if(line)lines.push(line);
    });
  }
  return lines;
}

// Extrae cabecera: N° factura, fecha, RUC emisor, total
function _feParseHeader(lines,f){
  const txt=lines.join('\n');
  const out={num:f.num||'',fecha:'',ruc:'',total:+f.total||0};
  const mNum=txt.match(/\b([EFB][A-Z0-9]{0,3}\d{0,3}-\d{1,8})\b/);
  if(mNum)out.num=mNum[1];
  const lEmis=lines.find(l=>/emisi/i.test(l)&&/\d{2}[\/\-]\d{2}[\/\-]\d{4}/.test(l));
  if(lEmis)out.fecha=lEmis.match(/\d{2}[\/\-]\d{2}[\/\-]\d{4}/)[0].replace(/-/g,'/');
  else{
    const fechas=txt.match(/\b\d{2}\/\d{2}\/\d{4}\b/g);
    if(fechas&&fechas.length)out.fecha=fechas[0];
  }
  // RUC del emisor: primer RUC que no sea el de ECOSERMO (cliente)
  const rucs=(txt.match(/\b(?:10|20)\d{9}\b/g)||[]).filter(r=>r!=='20571533180');
  if(rucs.length)out.ruc=rucs[0];
  const lTot=lines.filter(l=>/importe\s+total|total\s+a\s+pagar|total\s+venta/i.test(l)).pop()
    ||lines.filter(l=>/^total\b|total\s*:/i.test(l)).pop();
  if(lTot){
    const ns=lTot.match(/\d{1,3}(?:,\d{3})*\.\d{2}/g);
    if(ns)out.total=parseFloat(ns[ns.length-1].replace(/,/g,''));
  }
  // Monto de IGV (para detectar si los precios de los ítems ya lo incluyen)
  out.igv=0;
  const lIgv=lines.filter(l=>/I\.?G\.?V/i.test(l)&&/\d+\.\d{2}/.test(l)&&!/%\s*$/.test(l.trim())).pop();
  if(lIgv){
    const ns=lIgv.match(/\d{1,3}(?:,\d{3})*\.\d{2}/g);
    if(ns)out.igv=parseFloat(ns[ns.length-1].replace(/,/g,''));
  }
  return out;
}

// Extrae los ítems (cantidad, unidad, descripción, valor unitario sin IGV, importe)
// Modelos soportados:
//  A) CODIGO CANT UNID DESC V.UNT(sin IGV) P.UNT(con IGV) DSCTO P.VENTA   (ej. Implementos Perú)
//  B) CANT "UNIDAD" DESC VALOR.UNIT(sin IGV) ICBPER                        (ej. General Quality)
//  C) CANT "UNIDAD" DESC VALOR.UNIT(sin IGV, hasta 10 decimales)           (ej. J&E)
// Regla: el 1er número final = Valor Unit sin IGV; el último = P.VENTA solo si ≈ CANT × V.UNT.
const _FE_UNITS=['UND','UNIDAD','UNIDADES','NIU','UN','U','ZZ','GLL','GAL','GLN','GALON','GALONES','KG','KGM','M','MT','MTR','M2','M3','LT','LTR','L','PZA','PZ','PAR','JGO','CJA','BOL','SER','SERV','SERVICIO','DIA','HRA','HR','GLB','MES','ROLLO','PLG','SACO','FCO','TUBO','PQT','DOC','CTO','MLL','CAJA','BOLSA','JUEGO','PIEZA'];
function _feParseItems(lines){
  const items=[];
  const skip=/(R\.?U\.?C|TOTAL|I\.?G\.?V|SUBTOTAL|SUB\s?TOTAL|GRAVADA|EXONERADA|INAFECTA|GRATUITA|DESCUENTO|SON\s?:|PERCEPCI|DETRACCI|FORMA\s+DE\s+PAGO|CUOTA|VENCIMIENTO|OBSERVACI|TIPO\s+DE\s+CAMBIO|TEL[EÉ]F|E-?MAIL|DIRECCI|EMISI[OÓ]N|VALOR\s+VENTA|ANTICIPO|REDONDEO|OTROS\s+CARGOS|OTROS\s+TRIBUTOS|ICBPER\s*:|GUIA\s+DE\s+REMISI|WHATSAPP|CONTACT|MONEDA)/i;
  const isNum=t=>/^\d{1,3}(?:,\d{3})*\.\d{1,10}$|^\d+\.\d{1,10}$/.test(t);
  const toN=t=>parseFloat(t.replace(/,/g,''));
  const qtyRe=/^\d{1,6}(?:\.\d{1,4})?$/;
  lines.forEach(line=>{
    if(skip.test(line))return;
    const tk=line.split(/\s+/).filter(Boolean);
    if(tk.length<3)return;
    // Cantidad en las primeras 3 posiciones (puede haber un código de ítem antes)
    let qi=-1;
    for(let i=0;i<Math.min(3,tk.length);i++){
      if(qtyRe.test(tk[i])){const q=parseFloat(tk[i]);if(q>0&&q<=100000){qi=i;break;}}
    }
    if(qi<0)return;
    const cant=parseFloat(tk[qi]);
    // Números al final de la línea (V.UNT, P.UNT, DSCTO, P.VENTA, ICBPER...)
    let end=tk.length;
    const nums=[];
    while(end-1>qi&&isNum(tk[end-1])){nums.unshift(toN(tk[end-1]));end--;}
    if(!nums.length)return;
    // Tokens intermedios: unidad opcional + descripción
    let mid=tk.slice(qi+1,end);
    let unidad='';
    if(mid.length){
      const u=mid[0].toUpperCase().replace(/[^A-ZÑ0-9]/g,'');
      if(_FE_UNITS.includes(u)){
        unidad=(u==='UNIDAD'||u==='UNIDADES')?'UND':(u==='GALON'||u==='GALONES'||u==='GLN')?'GAL':u;
        mid=mid.slice(1);
      }
    }
    let desc=mid.join(' ').replace(/^[\-:|·]+|[\-:|·]+$/g,'').trim();
    if(!desc||desc.length<3)return;
    if(/^\d[\d\s\/\-\.,:]*$/.test(desc))return; // solo números/fechas → no es un ítem
    if(/\d{2}\/\d{2}\/\d{4}/.test(desc))return; // contiene fecha → fila de cuotas/vencimientos, no ítem
    // Quitar código de proveedor al inicio de la descripción
    // (ej: FERABR81695, NX1200NK, P5-3, códigos de barra 7506240653929)
    const dtk=desc.split(' ');
    if(dtk.length>1){
      const c0=dtk[0];
      const esCodigo=(/^[A-Z0-9][A-Z0-9\-\.]{3,}$/i.test(c0)&&/\d/.test(c0)&&/[A-Z]/i.test(c0))||/^\d{7,}$/.test(c0);
      if(esCodigo)desc=dtk.slice(1).join(' ').trim();
    }
    if(!desc||desc.length<3)return;
    // 1er número final = Valor Unitario sin IGV
    const vunit=nums[0];
    if(!(vunit>0))return;
    const esperado=cant*vunit;
    let importe=esperado;
    if(nums.length>=2){
      const last=nums[nums.length-1];
      // último número = P.VENTA solo si coincide con CANT × V.UNT (tolerancia por redondeo)
      if(Math.abs(last-esperado)<=Math.max(esperado*0.02,0.05))importe=last;
    }
    items.push({desc,cant,unidad,punit:vunit,importe:+importe.toFixed(2)});
  });
  return items;
}

// Abre el modal y ejecuta la extracción
async function extraerFactura(id){
  const f=DB.facturasPago.find(x=>x.id===id);if(!f)return;
  const url=f.pdfUrl||f.pdfData||'';
  if(!url){toast('Esta factura no tiene PDF',true);return;}
  if(typeof pdfjsLib==='undefined'){toast('PDF.js no está cargado',true);return;}
  _feFacturaId=id;
  _feEditIds=null; // modo extracción (no edición)
  document.querySelector('#mFactExtract .mttl').textContent='🔍 Extracción de Factura → Reembolsables / Gastos';
  const _bg=document.getElementById('feBtnGuardar');if(_bg)_bg.textContent='💾 Guardar en Reembolsables';
  openM('mFactExtract');
  const _vp=document.getElementById('feVerPdf');if(_vp)_vp.href=url;
  document.getElementById('feStatus').style.display='';
  document.getElementById('feStatus').textContent='⏳ Leyendo PDF...';
  document.getElementById('feBody').style.display='none';
  try{
    const lines=await _feLoadPdfLines(url);
    const head=_feParseHeader(lines,f);
    const items=_feParseItems(lines);
    // Detectar si los precios extraídos ya incluyen IGV (ej: formato MEZA, donde P.U. es con IGV):
    // si la suma de ítems coincide con el IMPORTE TOTAL (inc. IGV) y la factura tiene IGV > 0 → convertir a sin IGV
    let _convertidoIgv=false;
    const _sumItems=items.reduce((a,i)=>a+i.importe,0);
    const _totalRef=head.total||+f.total||0;
    if(items.length&&_totalRef>0&&(head.igv||0)>0&&Math.abs(_sumItems-_totalRef)<=Math.max(_totalRef*0.01,0.1)){
      items.forEach(i=>{i.punit=+(i.punit/1.18).toFixed(4);i.importe=+(i.importe/1.18).toFixed(2);});
      _convertidoIgv=true;
    }
    // Proyecto desde el requerimiento vinculado
    const req=DB.requerimientos.find(r=>r.id===f.reqId);
    // Serie y correlativo desde el N° extraído (ej: E002-2554)
    const numFull=(head.num||f.num||'').replace(/\s/g,'');
    const mSC=numFull.match(/^([A-Z0-9]+)-(\d+)$/i);
    document.getElementById('feSerie').value=mSC?mSC[1].toUpperCase():numFull;
    document.getElementById('feCorrel').value=mSC?mSC[2]:'';
    const tipoCpMap={'Factura':'FE','Boleta de Venta':'BV','Nota de Crédito':'NC','Nota de Débito':'ND','Recibo por Honorarios':'RH'};
    document.getElementById('feTipoCp').value=tipoCpMap[f.tipo]||'FE';
    document.getElementById('feFecha').value=head.fecha||toDMY(f.fecha)||'';
    document.getElementById('feRuc').value=head.ruc||'';
    document.getElementById('feTotal').value=head.total||f.total||0;
    document.getElementById('feProv').value=f.prov||'';
    _fePopulateDatalist();
    document.getElementById('feMoneda').value=/d[oó]lar|usd/i.test(f.moneda||'')?'DOLARES':'SOLES';
    document.getElementById('feTc').value='';
    document.getElementById('feEdp').value=f.edp||'';
    document.getElementById('feObs').value='';
    document.getElementById('feProy').value=req?(req.proyecto||''):'';
    document.getElementById('feTipoCobro').value=f.tipoCobro||'';
    const tb=document.getElementById('feItems');
    tb.innerHTML='';
    if(items.length)items.forEach(it=>_feAddRow(it));
    else _feAddRow();
    document.getElementById('feStatus').style.display='none';
    document.getElementById('feBody').style.display='';
    _feRecalc();
    if(_convertidoIgv)toast('El PDF traía precios CON IGV — se convirtieron a sin IGV (÷1.18)');
    if(!items.length)toast('No se detectaron ítems automáticamente — puede ser un PDF escaneado. Agrégalos manualmente.',true);
  }catch(e){
    console.error('[extraerFactura]',e);
    document.getElementById('feStatus').textContent='⚠ Error al leer el PDF: '+(e.message||e)+'. Si es un escaneo/imagen, no se puede extraer texto.';
  }
}

const _FE_IN='width:100%;background:var(--panel2);border:1px solid var(--border);border-radius:5px;color:var(--text);padding:.28rem .4rem;font-size:.75rem;outline:none';
function _feAddRow(it){
  it=it||{desc:'',cant:1,unidad:'',punit:0,importe:0,codigo:'',nombreCodif:''};
  const tb=document.getElementById('feItems');if(!tb)return;
  const tr=document.createElement('tr');
  tr.innerHTML=`
    <td style="padding:.25rem .4rem"><input class="fe-cod" list="dlCodigoReemb" value="${(it.codigo||'').replace(/"/g,'&quot;')}" placeholder="R14..." oninput="_feCodChange(this)" style="${_FE_IN};font-family:monospace;font-weight:700"></td>
    <td style="padding:.25rem .4rem"><input class="fe-codif" value="${(it.nombreCodif||'').replace(/"/g,'&quot;')}" readonly placeholder="(auto según código)" style="${_FE_IN};opacity:.75"></td>
    <td style="padding:.25rem .4rem"><input class="fe-desc" value="${(it.desc||'').replace(/"/g,'&quot;')}" style="${_FE_IN}"></td>
    <td style="padding:.25rem .4rem"><input class="fe-cant" type="number" step="0.01" value="${it.cant}" oninput="_feRowCalc(this)" style="${_FE_IN};text-align:right;font-family:monospace"></td>
    <td style="padding:.25rem .4rem"><input class="fe-und" value="${it.unidad||''}" style="${_FE_IN};text-align:center"></td>
    <td style="padding:.25rem .4rem"><input class="fe-punit" type="number" step="0.0001" value="${it.punit}" oninput="_feRowCalc(this)" style="${_FE_IN};text-align:right;font-family:monospace"></td>
    <td style="padding:.25rem .4rem"><input class="fe-imp" type="number" step="0.01" value="${it.importe}" oninput="_feRecalc()" style="${_FE_IN};text-align:right;font-family:monospace;color:#10b981;font-weight:700"></td>
    <td style="padding:.25rem .2rem;text-align:center"><button onclick="this.closest('tr').remove();_feRecalc()" style="background:none;border:none;color:#ef4444;cursor:pointer;font-size:.85rem" title="Quitar fila">🗑</button></td>`;
  tb.appendChild(tr);
}
// Quitar IGV: divide TODOS los P. Unit entre 1.18, los sobrescribe y recalcula los subtotales
function _feQuitarIgv(){
  const trs=[...document.querySelectorAll('#feItems tr')];
  if(!trs.length){toast('No hay ítems para calcular',true);return;}
  if(!confirm('Se dividirán TODOS los P. Unit entre 1.18 (quitar IGV) y se sobrescribirán.\n\n⚠ Úsalo solo una vez: si lo presionas de nuevo, volverá a dividir los valores ya convertidos.\n\n¿Continuar?'))return;
  let n=0;
  trs.forEach(tr=>{
    const inp=tr.querySelector('.fe-punit');if(!inp)return;
    const v=+inp.value||0;if(!v)return;
    inp.value=(v/1.18).toFixed(4);
    const cant=+tr.querySelector('.fe-cant').value||0;
    const imp=tr.querySelector('.fe-imp');if(imp)imp.value=(cant*(+inp.value)).toFixed(2);
    n++;
  });
  _feRecalc();
  toast('IGV retirado de '+n+' ítem(s): P. Unit ÷ 1.18');
}
function _feRowCalc(el){
  const tr=el.closest('tr');
  const cant=+tr.querySelector('.fe-cant').value||0;
  const punit=+tr.querySelector('.fe-punit').value||0;
  tr.querySelector('.fe-imp').value=(cant*punit).toFixed(2);
  _feRecalc();
}
function _feRecalc(){
  const sum=[...document.querySelectorAll('#feItems .fe-imp')].reduce((a,i)=>a+(+i.value||0),0);
  const tot=+document.getElementById('feTotal').value||0;
  const dif=tot-sum;
  const el=document.getElementById('feResumen');
  if(el)el.innerHTML=`Suma ítems: <strong style="color:#10b981;font-family:monospace">S/ ${sum.toLocaleString('es-PE',{minimumFractionDigits:2})}</strong>
    ${tot>0?` · Total factura: <span class="mono">S/ ${tot.toLocaleString('es-PE',{minimumFractionDigits:2})}</span> · Dif: <span style="color:${Math.abs(dif)<0.5?'#10b981':'#f59e0b'};font-family:monospace">S/ ${dif.toFixed(2)}</span> <span style="color:var(--muted2);font-size:.68rem">(la dif. suele ser el IGV)</span>`:''}`;
}

// Guarda las filas como registros de Reembolsables/Gastos
function gReembolsables(){
  const trs=[...document.querySelectorAll('#feItems tr')];
  const fecha=document.getElementById('feFecha').value.trim();
  const fIso=fecha.includes('/')?toISO(fecha):fecha;
  const serie=document.getElementById('feSerie').value.trim().toUpperCase();
  const correlativo=document.getElementById('feCorrel').value.trim();
  const tipoCp=document.getElementById('feTipoCp').value;
  const ruc=document.getElementById('feRuc').value.trim();
  const prov=document.getElementById('feProv').value.trim();
  const moneda=document.getElementById('feMoneda').value;
  const tc=+document.getElementById('feTc').value||0;
  const edp=document.getElementById('feEdp').value.trim();
  const obs=document.getElementById('feObs').value.trim();
  const proy=document.getElementById('feProy').value.trim();
  const tipoCobro=document.getElementById('feTipoCobro').value;
  const leerFila=tr=>({
    desc:tr.querySelector('.fe-desc').value.trim(),
    codigo:(tr.querySelector('.fe-cod').value||'').trim().toUpperCase(),
    nombreCodif:tr.querySelector('.fe-codif').value.trim(),
    cant:+tr.querySelector('.fe-cant').value||0,
    unidad:tr.querySelector('.fe-und').value.trim(),
    punit:+tr.querySelector('.fe-punit').value||0,
    importe:+tr.querySelector('.fe-imp').value||0
  });
  let n=0;
  if(_feEditIds){
    // ── MODO EDICIÓN: actualizar los registros existentes de la factura ──
    const oldIds=[..._feEditIds];
    trs.forEach(tr=>{
      const it=leerFila(tr);
      if(!it.desc||it.importe<=0)return;
      n++;
      const id=oldIds.length?oldIds.shift():nid('reemb');
      const rec={id,facturaId:_feFacturaId,fecha:fIso,proyecto:proy,moneda,obs,
        tipoCp,serie,correlativo,ruc,proveedor:prov,codigo:it.codigo,itemFac:String(n).padStart(2,'0'),
        nombreCodif:it.nombreCodif,desc:it.desc,edp,cantidad:it.cant,unidad:it.unidad,precioUnit:it.punit,importe:it.importe,tc,tipoCobro};
      const idx=DB.reembolsables.findIndex(x=>x.id===id);
      if(idx>-1)DB.reembolsables[idx]=rec;else DB.reembolsables.push(rec);
      syncSheet('saveReembolsable',rec);
    });
    if(!n){toast('No hay ítems válidos para guardar',true);return;}
    // Filas eliminadas en el modal → borrar de la base
    oldIds.forEach(id=>{supaDelete('reembolsables',id);DB.reembolsables=DB.reembolsables.filter(x=>x.id!==id);});
    _feEditIds=null;
    closeM('mFactExtract');
    toast(`Factura actualizada: ${n} ítem(s)`);
    rFPago();
    _fpTab('reemb');
    return;
  }
  trs.forEach(tr=>{
    const it=leerFila(tr);
    if(!it.desc||it.importe<=0)return;
    n++;
    const rec={id:nid('reemb'),facturaId:_feFacturaId,fecha:fIso,proyecto:proy,moneda,obs,
      tipoCp,serie,correlativo,ruc,proveedor:prov,codigo:it.codigo,itemFac:String(n).padStart(2,'0'),
      nombreCodif:it.nombreCodif,desc:it.desc,edp,cantidad:it.cant,unidad:it.unidad,precioUnit:it.punit,importe:it.importe,tc,tipoCobro};
    DB.reembolsables.push(rec);
    syncSheet('saveReembolsable',rec);
  });
  if(!n){toast('No hay ítems válidos para guardar',true);return;}
  closeM('mFactExtract');
  toast(`${n} ítem(s) guardado(s) en Reembolsables/Gastos`);
  rFPago();
  _fpTab('reemb');
}

// ── Editar FACTURA COMPLETA de Reembolsables (reutiliza el modal de extracción) ──
let _feEditIds=null; // ids de los registros que se están editando (null = modo extracción)
function editFacturaReemb(){
  if(!_reembFiltFact){toast('Seleccione una factura en el filtro',true);return;}
  const rows=(DB.reembolsables||[]).filter(r=>{
    if(_reembFiltProv&&r.proveedor!==_reembFiltProv)return false;
    return `${r.serie||''} - ${r.correlativo||''}`.trim()===_reembFiltFact;
  }).sort((a,b)=>String(a.itemFac||'').localeCompare(String(b.itemFac||'')));
  if(!rows.length){toast('No hay ítems de esa factura',true);return;}
  const r0=rows[0];
  _feEditIds=rows.map(r=>r.id);
  _feFacturaId=r0.facturaId||null;
  _fePopulateDatalist();
  // Cabecera
  document.getElementById('feTipoCp').value=r0.tipoCp||'FE';
  document.getElementById('feSerie').value=r0.serie||'';
  document.getElementById('feCorrel').value=r0.correlativo||'';
  document.getElementById('feFecha').value=r0.fecha||'';
  document.getElementById('feRuc').value=r0.ruc||'';
  document.getElementById('feProv').value=r0.proveedor||'';
  document.getElementById('feMoneda').value=r0.moneda||'SOLES';
  document.getElementById('feTc').value=r0.tc||'';
  document.getElementById('feEdp').value=r0.edp||'';
  document.getElementById('feObs').value=r0.obs||'';
  document.getElementById('feProy').value=r0.proyecto||'';
  const tcob=document.getElementById('feTipoCobro');if(tcob&&r0.tipoCobro)tcob.value=r0.tipoCobro;
  document.getElementById('feTotal').value=(rows.reduce((a,r)=>a+(+r.importe||0),0)*1.18).toFixed(2);
  // Ítems guardados
  const tb=document.getElementById('feItems');if(tb)tb.innerHTML='';
  rows.forEach(r=>_feAddRow({desc:r.desc||'',cant:+r.cantidad||0,unidad:r.unidad||'',punit:+r.precioUnit||0,importe:+r.importe||0,codigo:r.codigo||'',nombreCodif:r.nombreCodif||''}));
  _feRecalc();
  // Modo edición: título, botón y PDF
  document.querySelector('#mFactExtract .mttl').textContent='✏️ Editar Factura '+_reembFiltFact;
  const bg=document.getElementById('feBtnGuardar');if(bg)bg.textContent='💾 Guardar Cambios';
  document.getElementById('feStatus').style.display='none';
  document.getElementById('feBody').style.display='';
  const f=(DB.facturasPago||[]).find(x=>x.id===r0.facturaId);
  const vp=document.getElementById('feVerPdf');
  if(vp){const u=f?(f.pdfUrl||f.pdfData||''):'';vp.style.display=u?'':'none';if(u)vp.href=u;}
  openM('mFactExtract');
}

// ── Editar un ítem de Reembolsables / Gastos ──
let _reembEditId=null;
function editReembolsable(id){
  const r=(DB.reembolsables||[]).find(x=>x.id===id);if(!r)return;
  _reembEditId=id;
  _fePopulateDatalist(); // el buscador de códigos también sirve en este modal
  document.getElementById('reFactura').textContent=`${r.serie||''} - ${r.correlativo||''} · ${r.proveedor||''} · Ítem ${r.itemFac||''}`;
  document.getElementById('reCod').value=r.codigo||'';
  document.getElementById('reCodif').value=r.nombreCodif||'';
  document.getElementById('reDesc').value=r.desc||'';
  document.getElementById('reCant').value=+r.cantidad||0;
  document.getElementById('reUnd').value=r.unidad||'';
  document.getElementById('rePunit').value=+r.precioUnit||0;
  document.getElementById('reTc').value=r.tc||'';
  document.getElementById('reEdp').value=r.edp||'';
  document.getElementById('reObs').value=r.obs||'';
  _reembEditCalc();
  openM('mReembEdit');
}
function _reembEditCod(){
  const el=document.getElementById('reCod'),out=document.getElementById('reCodif');
  const v=(el.value||'').trim().toUpperCase();
  if(!v){out.value='';return;}
  const cat=_feCatalogo();
  let hit=cat.find(c=>(c.codigo||'').toUpperCase()===v);
  if(!hit)hit=cat.find(c=>(c.desc||'').toUpperCase().includes(v));
  if(hit){el.value=hit.codigo;out.value=hit.desc;}
  else out.value='';
}
function _reembEditCalc(){
  const cant=+document.getElementById('reCant').value||0;
  const punit=+document.getElementById('rePunit').value||0;
  const sub=cant*punit;
  document.getElementById('reSub').textContent=`SubTotal: S/ ${sub.toFixed(2)} sin IGV · S/ ${(sub*1.18).toFixed(2)} inc. IGV`;
}
function gReembEdit(){
  const r=(DB.reembolsables||[]).find(x=>x.id===_reembEditId);
  if(!r){toast('Registro no encontrado',true);return;}
  const desc=document.getElementById('reDesc').value.trim();
  const cant=+document.getElementById('reCant').value||0;
  const punit=+document.getElementById('rePunit').value||0;
  if(!desc){toast('Ingrese la descripción',true);return;}
  if(cant<=0||punit<=0){toast('Cantidad y P. Unit deben ser mayores a 0',true);return;}
  r.codigo=(document.getElementById('reCod').value||'').trim().toUpperCase();
  r.nombreCodif=document.getElementById('reCodif').value.trim();
  r.desc=desc;
  r.cantidad=cant;
  r.unidad=document.getElementById('reUnd').value.trim();
  r.precioUnit=punit;
  r.importe=+(cant*punit).toFixed(2);
  r.tc=+document.getElementById('reTc').value||0;
  r.edp=document.getElementById('reEdp').value.trim();
  r.obs=document.getElementById('reObs').value.trim();
  syncSheet('saveReembolsable',r);
  closeM('mReembEdit');
  rReembolsables();
  toast('Ítem actualizado');
}

// ── Render del tab Reembolsables / Gastos ──
let _reembFiltProv='', _reembFiltFact='';
function _reembSetFilt(tipo,val){
  if(tipo==='prov'){_reembFiltProv=val;_reembFiltFact='';}
  else _reembFiltFact=val;
  rReembolsables();
}
function rReembolsables(){
  const pg=document.getElementById('fpTab-reemb');if(!pg)return;
  const all=[...(DB.reembolsables||[])].sort((a,b)=>(b.fecha||'').localeCompare(a.fecha||'')||b.id-a.id);
  // Opciones de filtros (facturas dependen del proveedor elegido)
  const provs=[...new Set(all.map(r=>r.proveedor).filter(Boolean))].sort();
  const factsBase=_reembFiltProv?all.filter(r=>r.proveedor===_reembFiltProv):all;
  const facts=[...new Set(factsBase.map(r=>`${r.serie||''} - ${r.correlativo||''}`.trim()).filter(f=>f!=='-'))].sort();
  if(_reembFiltProv&&!provs.includes(_reembFiltProv))_reembFiltProv='';
  if(_reembFiltFact&&!facts.includes(_reembFiltFact))_reembFiltFact='';
  // Aplicar filtros → KPIs y tabla dinámicos
  const rows=all.filter(r=>{
    if(_reembFiltProv&&r.proveedor!==_reembFiltProv)return false;
    if(_reembFiltFact&&`${r.serie||''} - ${r.correlativo||''}`.trim()!==_reembFiltFact)return false;
    return true;
  });
  const _dmy=iso=>{if(!iso||!iso.includes('-'))return iso||'';const[y,m,d]=iso.split('-');return`${d}-${m}-${y}`;};
  const _n2=v=>Number(v||0).toLocaleString('es-PE',{minimumFractionDigits:2,maximumFractionDigits:2});
  const _n3=v=>Number(v||0).toLocaleString('es-PE',{minimumFractionDigits:3,maximumFractionDigits:3});
  const totSin=rows.reduce((a,r)=>a+(+r.importe||0),0);
  const totCon=rows.reduce((a,r)=>a+(+r.importe||0)*1.18,0);
  const nFact=new Set(rows.map(r=>(r.serie||'')+'-'+(r.correlativo||''))).size;
  const nProv=new Set(rows.map(r=>r.ruc||r.proveedor)).size;
  const kpis=[
    {l:'Total S/ (sin IGV)',v:'S/ '+_n2(totSin),c:'#10b981'},
    {l:'Total S/ (inc. IGV)',v:'S/ '+_n2(totCon),c:'#06b6d4'},
    {l:'Ítems Registrados',v:rows.length,c:'#f97316'},
    {l:'Facturas / Proveedores',v:nFact+' / '+nProv,c:'#8b5cf6'},
  ];
  const TDs='padding:.4rem .55rem;border-bottom:1px solid var(--border);font-size:.74rem;white-space:nowrap;vertical-align:middle';
  const tbody=rows.map(r=>{
    const punit=+r.precioUnit||0;
    const subTotal=+r.importe||0;
    const cUnitIgv=punit*1.18;
    const igvUnit=punit*0.18;
    const totSoles=subTotal*1.18;
    const tc=+r.tc||0;
    const factura=`${r.serie||''} - ${r.correlativo||''}`.trim();
    const factFecha=`${_dmy(r.fecha)}(${factura})`;
    const totDol=tc>0?_n2(totSoles/tc):'—';
    const subDol=tc>0?_n2(subTotal/tc):'—';
    return`<tr>
      <td style="${TDs};font-family:monospace;color:var(--muted2)">${r.id}</td>
      <td style="${TDs};color:#a78bfa">${r.proyecto||'—'}</td>
      <td style="${TDs};text-align:center">${r.edp||'—'}</td>
      <td style="${TDs};font-size:.68rem">${r.moneda||'SOLES'}</td>
      <td style="${TDs};font-family:monospace">${_dmy(r.fecha)}</td>
      <td style="${TDs};max-width:130px;overflow:hidden;text-overflow:ellipsis" title="${(r.obs||'').replace(/"/g,'&quot;')}">${r.obs||'—'}</td>
      <td style="${TDs};text-align:center"><span class="badge b-orange" style="font-size:.62rem">${r.tipoCp||'FE'}</span></td>
      <td style="${TDs};font-family:monospace;font-weight:700">${r.serie||'—'}</td>
      <td style="${TDs};font-family:monospace">${r.correlativo||'—'}</td>
      <td style="${TDs};font-family:monospace;font-size:.68rem;color:var(--muted2)">${factFecha}</td>
      <td style="${TDs};font-family:monospace;font-weight:700;color:var(--alm)">${factura}</td>
      <td style="${TDs};font-family:monospace">${r.ruc||'—'}</td>
      <td style="${TDs}">${r.proveedor||'—'}</td>
      <td style="${TDs};font-family:monospace;text-align:center">${r.codigo||'—'}</td>
      <td style="${TDs};max-width:160px;overflow:hidden;text-overflow:ellipsis" title="${(r.nombreCodif||'').replace(/"/g,'&quot;')}">${r.nombreCodif||'—'}</td>
      <td style="${TDs};font-family:monospace;text-align:center">${r.itemFac||'—'}</td>
      <td style="${TDs};max-width:220px;overflow:hidden;text-overflow:ellipsis" title="${(r.desc||'').replace(/"/g,'&quot;')}">${r.desc||''}</td>
      <td style="${TDs};text-align:right;font-family:monospace;font-weight:700">${(+r.cantidad||0).toLocaleString('es-PE')}</td>
      <td style="${TDs};text-align:center;font-size:.68rem;color:var(--muted2)">${r.unidad||'—'}</td>
      <td style="${TDs};text-align:right;font-family:monospace">S/ ${_n3(punit)}</td>
      <td style="${TDs};text-align:right;font-family:monospace;font-weight:700;color:#10b981">S/ ${_n2(subTotal)}</td>
      <td style="${TDs};text-align:right;font-family:monospace">S/ ${_n2(cUnitIgv)}</td>
      <td style="${TDs};text-align:right;font-family:monospace;color:#f59e0b">S/ ${_n2(igvUnit)}</td>
      <td style="${TDs};text-align:right;font-family:monospace;font-weight:900;color:#06b6d4">S/ ${_n2(totSoles)}</td>
      <td style="${TDs};text-align:right;font-family:monospace">${totDol}</td>
      <td style="${TDs};text-align:right;font-family:monospace;color:var(--muted2)">${tc>0?_n3(tc):'—'}</td>
      <td style="${TDs};text-align:right;font-family:monospace">${subDol}</td>
      <td style="${TDs};white-space:nowrap">
        <button onclick="editReembolsable(${r.id})" title="Editar ítem" style="background:none;border:1px solid #f59e0b50;border-radius:5px;color:#f59e0b;cursor:pointer;font-size:.75rem;padding:.15rem .4rem;margin-right:.25rem">✏</button>
        <button class="btn btn-del btn-sm" onclick="del('reembolsables',${r.id})">🗑</button>
      </td>
    </tr>`;
  }).join('');
  const THs='background:var(--panel2);color:var(--muted2);font-size:.62rem;font-weight:700;text-transform:uppercase;letter-spacing:.05em;padding:.45rem .55rem;white-space:nowrap;position:sticky;top:0;z-index:2';
  pg.innerHTML=`
    <div class="kpi-row">${kpis.map(k=>`<div class="kpi" style="--kc:${k.c}"><div class="kpi-lbl">${k.l}</div><div class="kpi-val" style="font-size:${k.v.toString().length>9?'1.2rem':'1.85rem'}">${k.v}</div></div>`).join('')}</div>
    <div class="card">
      <div class="card-head" style="flex-wrap:wrap;gap:.5rem">
        <span class="card-title">🧾 Reembolsables / Gastos extraídos de facturas</span>
        <div style="display:flex;align-items:center;gap:.4rem;flex-wrap:wrap">
          <span style="font-size:.62rem;letter-spacing:.08em;color:var(--muted2);text-transform:uppercase">Proveedor</span>
          <select onchange="_reembSetFilt('prov',this.value)" style="background:var(--panel2);border:1px solid ${_reembFiltProv?'#10b981':'var(--border)'};border-radius:6px;color:var(--text);padding:.3rem .55rem;font-size:.74rem;max-width:220px;cursor:pointer;outline:none">
            <option value="">— Todos —</option>
            ${provs.map(p=>`<option value="${p.replace(/"/g,'&quot;')}" ${p===_reembFiltProv?'selected':''}>${p}</option>`).join('')}
          </select>
          <span style="font-size:.62rem;letter-spacing:.08em;color:var(--muted2);text-transform:uppercase">Factura</span>
          <select onchange="_reembSetFilt('fact',this.value)" style="background:var(--panel2);border:1px solid ${_reembFiltFact?'#10b981':'var(--border)'};border-radius:6px;color:var(--text);padding:.3rem .55rem;font-size:.74rem;max-width:170px;cursor:pointer;outline:none;font-family:monospace">
            <option value="">— Todas —</option>
            ${facts.map(f=>`<option value="${f}" ${f===_reembFiltFact?'selected':''}>${f}</option>`).join('')}
          </select>
          ${_reembFiltFact?`<button onclick="editFacturaReemb()" title="Editar la cabecera y todos los ítems de esta factura" style="background:rgba(245,158,11,.15);border:1px solid #f59e0b60;border-radius:6px;color:#f59e0b;padding:.3rem .65rem;font-size:.72rem;font-weight:700;cursor:pointer;white-space:nowrap">✏ Editar factura</button>`:''}
          ${(_reembFiltProv||_reembFiltFact)?`<button onclick="_reembFiltProv='';_reembFiltFact='';rReembolsables()" style="background:transparent;border:1px solid var(--border);border-radius:6px;color:var(--muted2);padding:.3rem .55rem;font-size:.7rem;cursor:pointer">✕ Limpiar</button>`:''}
        </div>
        <div class="card-head-right">
          <div class="search-wrap"><span>🔍</span><input class="search-input" placeholder="Buscar..." oninput="flt(this,'tbReemb')"></div>
        </div>
      </div>
      <div class="card-body"><div style="overflow-x:auto;max-height:65vh;overflow-y:auto;border-radius:8px"><table style="width:100%;border-collapse:collapse;min-width:2400px">
        <thead><tr>
          <th style="${THs}">ID</th><th style="${THs}">Proyecto</th><th style="${THs}">EDP</th><th style="${THs}">Moneda</th>
          <th style="${THs}">Fecha de Fact.</th><th style="${THs}">Observaciones</th>
          <th style="${THs}">Tipo CP</th><th style="${THs}">Serie</th><th style="${THs}">Correlativo</th>
          <th style="${THs}">Factura y Fecha</th><th style="${THs}">Factura</th>
          <th style="${THs}">RUC</th><th style="${THs}">Proveedor</th><th style="${THs}">Cód. Reemb</th>
          <th style="${THs}">Nombre Codif.</th><th style="${THs}">Ítem Fac</th><th style="${THs}">Descripción</th>
          <th style="${THs};text-align:right">Cantidad</th><th style="${THs}">Unidad</th>
          <th style="${THs};text-align:right">P. Unit s/IGV</th><th style="${THs};text-align:right">SubTotal S/ sin IGV</th>
          <th style="${THs};text-align:right">Costo Unit c/IGV</th><th style="${THs};text-align:right">IGV</th>
          <th style="${THs};text-align:right">Total S/ (inc. IGV)</th><th style="${THs};text-align:right">Total $</th>
          <th style="${THs};text-align:right">TC</th><th style="${THs};text-align:right">SubTotal $ (sin IGV)</th><th style="${THs}"></th>
        </tr></thead>
        <tbody id="tbReemb">${tbody||`<tr><td colspan="28" style="text-align:center;padding:2.5rem;color:var(--muted2);font-size:.85rem">Sin gastos registrados. Usa el botón <strong style="color:#10b981">🔍 Extraer</strong> en el tab Comprobantes.</td></tr>`}</tbody>
      </table></div></div>
    </div>`;
}
