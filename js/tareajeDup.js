// ══ DUPLICADOS DE TAREAJE ═══════════════════════════════════════════════════
// La misma persona con dos registros del mismo día. Pasa cuando dos sesiones
// tarean la misma celda: al guardar, cada navegador busca el registro en SU
// copia local (DB.tareaje, cargada al abrir la app). Si el otro lo grabó
// después, esa copia no lo tiene, no lo encuentra y crea uno nuevo. La tabla
// no tiene una restricción que lo impida, así que quedan los dos.
//
// Dos casos distintos:
//   · Repetido exacto  (DL + DL) → sobra uno, se borra sin más.
//   · En conflicto     (DL + TD) → hay que elegir cuál vale.
// Solo el segundo descuadra los días totales de la planilla; el primero se
// limpia igual porque estorba y al editar la celda deja el otro suelto.

let _tdupSoloMes=true;

const _tdupFec=r=>String((r&&r.fecha)||'').slice(0,10);
const _tdupNom=pid=>{
  const p=(DB.personal||[]).find(x=>+x.id===+pid);
  return p?((p.ape||'')+', '+(p.nom||'')).trim():'Personal #'+pid;
};

function _tdupBuscar(mes){
  const porClave=new Map();
  (DB.tareaje||[]).forEach(r=>{
    const f=_tdupFec(r);
    if(!f)return;
    if(mes&&!f.startsWith(mes))return;
    const k=(+r.personalId)+'|'+f;
    if(!porClave.has(k))porClave.set(k,[]);
    porClave.get(k).push(r);
  });
  const iguales=[],conflictos=[];
  porClave.forEach((regs,clave)=>{
    if(regs.length<2)return;
    regs.sort((a,b)=>+b.id-+a.id);            // el último grabado, primero
    const tipos=[...new Set(regs.map(r=>r.tipo))];
    (tipos.length>1?conflictos:iguales).push({clave,regs,tipos});
  });
  const ord=(a,b)=>a.clave.split('|')[1].localeCompare(b.clave.split('|')[1]);
  return{iguales:iguales.sort(ord),conflictos:conflictos.sort(ord)};
}

function tarDuplicados(){
  if(isModuleReadOnly('tareaje'))return toast('No tiene permiso para editar el tareaje',true);
  openM('mTarDup');
  _tdupRender();
}

function _tdupSetMes(v){_tdupSoloMes=!!v;_tdupRender();}

function _tdupMesActual(){
  return _tdupSoloMes?(document.getElementById('tareMes')?.value||''):'';
}

function _tdupChip(t){
  const v=_TARE_T[t]||{bg:'#374151',tx:'#fff',l:t};
  return '<span title="'+v.l+'" style="display:inline-block;background:'+v.bg+';color:'+v.tx
    +';border-radius:4px;padding:1px 7px;font-size:.68rem;font-weight:800">'+(t||'—')+'</span>';
}

function _tdupRender(){
  const cont=document.getElementById('mTarDupBody');
  if(!cont)return;
  const mesSel=document.getElementById('tareMes')?.value||'';
  const D=_tdupBuscar(_tdupMesActual());
  const nI=D.iguales.length,nC=D.conflictos.length;
  const chip=_tdupChip;

  const kpi=(l,n,c)=>'<div style="flex:1;min-width:130px;background:var(--panel2);border:2px solid '+c
    +';border-radius:8px;padding:.5rem .7rem"><div style="font-size:1.5rem;font-weight:800;color:'+c+'">'+n
    +'</div><div style="font-size:.66rem;color:var(--muted2);font-weight:700;text-transform:uppercase;letter-spacing:.03em">'+l+'</div></div>';

  let html='<div style="display:flex;gap:.6rem;flex-wrap:wrap;margin-bottom:.8rem">'
    +kpi('Repetidos exactos',nI,'#f59e0b')+kpi('En conflicto',nC,'#ef4444')+'</div>'
    +'<label style="display:flex;align-items:center;gap:.4rem;font-size:.74rem;color:var(--muted2);cursor:pointer;margin-bottom:.9rem">'
    +'<input type="checkbox" style="width:auto" '+(_tdupSoloMes?'':'checked')
    +' onchange="_tdupSetMes(!this.checked)"> Buscar en todos los meses, no solo en '+(mesSel||'el mes en pantalla')+'</label>';

  if(!nI&&!nC){
    html+='<div style="text-align:center;padding:2rem;color:#10b981;font-weight:700">✓ Sin días duplicados'
      +'<div style="color:var(--muted2);font-weight:400;font-size:.76rem;margin-top:.3rem">Cada persona tiene una sola marca por día.</div></div>';
    cont.innerHTML=html;return;
  }

  if(nI){
    html+='<div style="border:2px solid #f59e0b;border-radius:8px;margin-bottom:.9rem;overflow:hidden">'
      +'<div style="background:rgba(245,158,11,.12);padding:.45rem .7rem;display:flex;justify-content:space-between;align-items:center;gap:.6rem;flex-wrap:wrap">'
      +'<span style="font-weight:800;color:#f59e0b;font-size:.8rem">Repetidos exactos · '+nI+'</span>'
      +'<button onclick="tarDupLimpiarIguales()" class="btn btn-sm" style="background:#f59e0b;color:#000;font-weight:800;font-size:.72rem">🧹 Borrar los sobrantes</button></div>'
      +'<div style="max-height:170px;overflow:auto"><table style="width:100%;border-collapse:collapse;font-size:.74rem">';
    D.iguales.forEach(g=>{
      const par=g.clave.split('|');
      html+='<tr style="border-top:1px solid var(--border)"><td style="padding:.3rem .7rem">'+_tdupNom(par[0])+'</td>'
        +'<td class="mono" style="padding:.3rem .5rem;color:var(--muted2)">'+par[1]+'</td>'
        +'<td style="padding:.3rem .5rem">'+chip(g.tipos[0])+'</td>'
        +'<td style="padding:.3rem .7rem;color:var(--muted2)">'+g.regs.length+' registros · sobra'+(g.regs.length>2?'n':'')+' '+(g.regs.length-1)+'</td></tr>';
    });
    html+='</table></div>'
      +'<div style="padding:.35rem .7rem;font-size:.68rem;color:var(--muted2);border-top:1px solid var(--border)">'
      +'Todos marcan lo mismo: se conserva el último grabado y se borran los anteriores.</div></div>';
  }

  if(nC){
    html+='<div style="border:2px solid #ef4444;border-radius:8px;overflow:hidden">'
      +'<div style="background:rgba(239,68,68,.12);padding:.45rem .7rem;font-weight:800;color:#ef4444;font-size:.8rem">'
      +'En conflicto · '+nC+'</div>'
      +'<div style="padding:.35rem .7rem;font-size:.68rem;color:var(--muted2);border-bottom:1px solid var(--border)">'
      +'Estos días están marcados con dos tipos distintos y por eso los DÍAS TOTAL de la planilla se pasan. Elija cuál queda.</div>'
      +'<div style="max-height:230px;overflow:auto">';
    D.conflictos.forEach(g=>{
      const par=g.clave.split('|');
      html+='<div style="border-top:1px solid var(--border);padding:.4rem .7rem;display:flex;align-items:center;gap:.6rem;flex-wrap:wrap">'
        +'<span style="font-size:.74rem;font-weight:700;flex:1;min-width:150px">'+_tdupNom(par[0])+'</span>'
        +'<span class="mono" style="font-size:.72rem;color:var(--muted2)">'+par[1]+'</span>';
      g.regs.forEach(r=>{
        html+='<button onclick="tarDupResolver(&quot;'+g.clave+'&quot;,'+r.id+')" '
          +'title="Dejar solo esta marca y borrar las otras del día" '
          +'style="background:transparent;border:1px solid var(--border);border-radius:5px;padding:2px 5px;cursor:pointer">'
          +chip(r.tipo)+'</button>';
      });
      html+='</div>';
    });
    html+='</div></div>';
  }
  cont.innerHTML=html;
}

async function _tdupBorrar(regs){
  const ids=new Set(regs.map(r=>+r.id));
  DB.tareaje=(DB.tareaje||[]).filter(r=>!ids.has(+r.id));
  for(const r of regs)await supaDelete('tareaje',r.id);
}

async function tarDupLimpiarIguales(){
  const sobran=[];
  _tdupBuscar(_tdupMesActual()).iguales.forEach(g=>sobran.push(...g.regs.slice(1)));
  if(!sobran.length)return toast('No hay repetidos exactos');
  if(!confirm('Se borraran '+sobran.length+' registro(s) repetido(s). En cada dia queda el ultimo grabado, con la misma marca. Continuar?'))return;
  toast('Limpiando '+sobran.length+' repetidos…');
  await _tdupBorrar(sobran);
  _tdupRefrescar();
  toast('✓ '+sobran.length+' registro(s) borrado(s)');
}

async function tarDupResolver(clave,idQueda){
  const g=_tdupBuscar(_tdupMesActual()).conflictos.find(x=>x.clave===clave);
  if(!g)return _tdupRender();
  const queda=g.regs.find(r=>+r.id===+idQueda);
  const sobran=g.regs.filter(r=>+r.id!==+idQueda);
  if(!queda||!sobran.length)return _tdupRender();
  const par=clave.split('|');
  if(!confirm(_tdupNom(par[0])+' · '+par[1]+'\n\nQueda "'+queda.tipo+'" y se borra '
    +sobran.map(r=>'"'+r.tipo+'"').join(', ')+'. Continuar?'))return;
  await _tdupBorrar(sobran);
  _tdupRefrescar();
  toast('✓ '+par[1]+' queda como '+queda.tipo);
}

function _tdupRefrescar(){
  _tdupRender();
  if(typeof rTareaje==='function')try{rTareaje();}catch(e){}
  if(typeof genPlanilla==='function'&&document.getElementById('tbPlanillaBody'))
    try{genPlanilla();}catch(e){}
}
