// ══════════════════════════════════════════════════════════════════════════
//  BIENESTAR SOCIAL · ALIMENTACIÓN — PROYECCIÓN MENSUAL
//
//  Calcula desde el TAREO cuántas raciones corresponden en el mes y cuánto
//  deberían costar, para contrastar con lo que factura la concesionaria.
//
//  Reglas:
//    · Solo come quien ese día tiene TD, TN o DLT. Con DL, F, P, V, DM… no
//      se le carga nada.
//    · Procedencia LOCAL (Oyón y las que se agreguen): 2 raciones
//         turno día   → desayuno + almuerzo
//         turno noche → desayuno + cena
//    · Procedencia de fuera: 3 raciones — desayuno + almuerzo + cena.
//    · El tareo NO guarda el turno del DLT: se hereda del día anterior de esa
//      misma persona con marca TD/TN; si no hay, del siguiente; si tampoco,
//      turno día. Las filas con turno heredado se marcan con ~ en el reporte.
//    · El rancho frío NO se proyecta: se carga a mano por persona (columna
//      propia) y se valoriza con su propio precio.
//
//  Los precios y las procedencias locales viven en Supabase
//  (sql/alimentacion_proyeccion.sql). Prefijo _apy.
// ══════════════════════════════════════════════════════════════════════════

let _apyTab='reg';                 // 'reg' = el registro de siempre · 'proy'
let _apyPer='';                    // 'YYYY-MM'
let _apyBuscar='';

const _APY_COMEN=['TD','TN','DLT'];          // las únicas marcas con derecho
const _APY_RACIONES=[
  {k:'des',l:'Desayuno',c:'#f59e0b'},
  {k:'alm',l:'Almuerzo',c:'#10b981'},
  {k:'cen',l:'Cena',    c:'#6366f1'},
  {k:'ran',l:'Rancho frío',c:'#06b6d4'}
];

const _apyEsc=s=>String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;')
  .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
// Se compara sin tildes ni mayúsculas: "Oyón", "OYON" y " oyon " son lo mismo
const _apyNorm=s=>String(s||'').toUpperCase().normalize('NFD')
  .replace(/[̀-ͯ]/g,'').replace(/\s+/g,' ').trim();
const _apyS2=v=>'S/ '+Number(v||0).toLocaleString('es-PE',{minimumFractionDigits:2,maximumFractionDigits:2});

function _apySetTab(t){_apyTab=t==='proy'?'proy':'reg';rAli();}
function _apyPerDef(){const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');}
function _apySetPer(v){if(!v)return;_apyPer=v;rAli();}
function _apyPerActual(){return _apyPer||(_apyPer=_apyPerDef());}
// Los días del mes elegido
function _apyFechas(){
  const[a,m]=_apyPerActual().split('-').map(Number);
  const n=new Date(a,m,0).getDate();
  const out=[];
  for(let d=1;d<=n;d++)out.push(`${a}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`);
  return out;
}
const _APY_MESES=['enero','febrero','marzo','abril','mayo','junio','julio','agosto','setiembre','octubre','noviembre','diciembre'];
function _apyPerNombre(){
  const[a,m]=_apyPerActual().split('-').map(Number);
  return (_APY_MESES[m-1]||'')+' '+a;
}

// ── Procedencias locales ────────────────────────────────────────────────────
function _apyLocales(){
  return [...(DB.alimLocales||[])].sort((a,b)=>String(a.nombre||'').localeCompare(String(b.nombre||''),'es'));
}
function _apyEsLocal(proc){
  const p=_apyNorm(proc);
  if(!p)return false;
  return (DB.alimLocales||[]).some(l=>_apyNorm(l.nombre)===p);
}
async function _apyLocalAgregar(){
  const v=prompt('Procedencia que come 2 veces al día:','');
  if(v===null)return;
  const nom=String(v).trim();
  if(!nom){toast('Escriba la procedencia',true);return;}
  if((DB.alimLocales||[]).some(l=>_apyNorm(l.nombre)===_apyNorm(nom))){
    toast('«'+nom+'» ya está en la lista',true);return;}
  DB.alimLocales=DB.alimLocales||[];
  const rec={id:nidSeguro('alml','alimLocales'),nombre:nom};
  DB.alimLocales.push({...rec});
  const err=await supaUpsert('alimLocales',rec);
  if(err){DB.alimLocales=DB.alimLocales.filter(l=>+l.id!==+rec.id);return;}
  rAli();
  toast('✓ «'+nom+'» come 2 veces al día');
}
async function _apyLocalQuitar(id){
  const l=(DB.alimLocales||[]).find(x=>+x.id===+id);if(!l)return;
  if(!confirm('¿Quitar «'+l.nombre+'» de las procedencias locales?\n\nEsa gente pasará a contar 3 raciones al día.'))return;
  await supaDelete('alimLocales',l.id);
  DB.alimLocales=(DB.alimLocales||[]).filter(x=>+x.id!==+l.id);
  rAli();
  toast('«'+l.nombre+'» ya no es local');
}

// ── Precios del período ─────────────────────────────────────────────────────
function _apyPrecios(){
  const per=_apyPerActual();
  const r=(DB.alimPrecios||[]).find(x=>String(x.periodo)===per);
  return{rec:r||null,des:+(r&&r.desayuno)||0,alm:+(r&&r.almuerzo)||0,
    cen:+(r&&r.cena)||0,ran:+(r&&r.rancho)||0};
}
async function _apySetPrecio(campo){
  const P=_apyPrecios();
  const nom={des:'Desayuno',alm:'Almuerzo',cen:'Cena',ran:'Rancho frío'}[campo]||campo;
  const v=prompt('Precio unitario de '+nom+' — '+_apyPerNombre()+' (S/):',P[campo]||'');
  if(v===null)return;
  const n=+String(v).replace(',','.');
  if(!(n>=0)){toast('Valor inválido',true);return;}
  DB.alimPrecios=DB.alimPrecios||[];
  const nuevo=!P.rec;
  const rec={id:nuevo?nidSeguro('almp','alimPrecios'):+P.rec.id,periodo:_apyPerActual(),
    desayuno:campo==='des'?n:P.des,almuerzo:campo==='alm'?n:P.alm,
    cena:campo==='cen'?n:P.cen,rancho:campo==='ran'?n:P.ran};
  if(nuevo)DB.alimPrecios.push({...rec});
  const err=await supaUpsert('alimPrecios',rec);
  if(err){if(nuevo)DB.alimPrecios=DB.alimPrecios.filter(x=>+x.id!==+rec.id);return;}
  if(P.rec)Object.assign(P.rec,rec);
  rAli();
  toast('✓ '+nom+': '+_apyS2(n));
}

// ── Rancho frío, cargado a mano ─────────────────────────────────────────────
function _apyRanchoDe(personalId){
  const per=_apyPerActual();
  const r=(DB.alimRancho||[]).find(x=>String(x.periodo)===per&&+x.personalId===+personalId);
  return r?Math.max(0,+r.cant||0):0;
}
async function _apySetRancho(personalId,valor){
  const n=Math.max(0,Math.round(+String(valor).replace(',','.')||0));
  const per=_apyPerActual();
  DB.alimRancho=DB.alimRancho||[];
  const prev=DB.alimRancho.find(x=>String(x.periodo)===per&&+x.personalId===+personalId);
  if(!n&&prev){                       // volver a 0 es borrar la fila
    await supaDelete('alimRancho',prev.id);
    DB.alimRancho=DB.alimRancho.filter(x=>+x.id!==+prev.id);
    rAli();return;
  }
  if(!n)return;
  const nuevo=!prev;
  const rec={id:nuevo?nidSeguro('almr','alimRancho'):+prev.id,periodo:per,personalId:+personalId,cant:n};
  if(nuevo)DB.alimRancho.push({...rec});
  const err=await supaUpsert('alimRancho',rec);
  if(err){if(nuevo)DB.alimRancho=DB.alimRancho.filter(x=>+x.id!==+rec.id);return;}
  if(prev)Object.assign(prev,rec);
  rAli();
}

// ── El cálculo ──────────────────────────────────────────────────────────────
// El DLT no trae turno: se hereda del día anterior de la misma persona con
// marca TD/TN; si no hay, del siguiente; si tampoco, turno día.
function _apyTurnoDlt(marcas,i){
  for(let j=i-1;j>=0;j--){const t=marcas[j].tipo;if(t==='TD')return'dia';if(t==='TN')return'noche';}
  for(let j=i+1;j<marcas.length;j++){const t=marcas[j].tipo;if(t==='TD')return'dia';if(t==='TN')return'noche';}
  return'dia';
}
function _apyDatos(){
  const F=_apyFechas();
  const dentro=new Set(F);
  const P=_apyPrecios();

  // Marcas del mes, por persona y ordenadas por fecha
  const porPers=new Map();
  (DB.tareaje||[]).forEach(r=>{
    if(!r||!dentro.has(r.fecha))return;
    const k=+r.personalId;
    if(!porPers.has(k))porPers.set(k,[]);
    porPers.get(k).push({fecha:r.fecha,tipo:String(r.tipo||'')});
  });
  porPers.forEach(arr=>arr.sort((a,b)=>a.fecha.localeCompare(b.fecha)));

  const q=_apyNorm(_apyBuscar);
  const filas=[];
  (DB.personal||[]).forEach(p=>{
    const marcas=porPers.get(+p.id);
    if(!marcas||!marcas.length)return;                 // sin tareo ese mes
    const proc=String(p.proc||'').trim();
    const nombre=`${p.ape||''} ${p.nom||''}`.trim();
    if(q&&!_apyNorm(`${nombre} ${p.dni||''} ${p.cargo||''} ${proc}`).includes(q))return;
    const local=_apyEsLocal(proc);
    let nTD=0,nTN=0,nDLT=0,des=0,alm=0,cen=0,inferidos=0;
    marcas.forEach((m,i)=>{
      if(_APY_COMEN.indexOf(m.tipo)<0)return;          // ese día no come
      let turno;
      if(m.tipo==='TD'){nTD++;turno='dia';}
      else if(m.tipo==='TN'){nTN++;turno='noche';}
      else{nDLT++;turno=_apyTurnoDlt(marcas,i);inferidos++;}
      if(!local){des++;alm++;cen++;}                   // de fuera: las tres
      else if(turno==='noche'){des++;cen++;}           // local de noche
      else{des++;alm++;}                               // local de día
    });
    const dias=nTD+nTN+nDLT;
    if(!dias)return;                                   // el mes entero sin derecho
    const ran=_apyRanchoDe(p.id);
    const costo=+(des*P.des+alm*P.alm+cen*P.cen+ran*P.ran).toFixed(2);
    filas.push({p,nombre,proc,local,nTD,nTN,nDLT,dias,des,alm,cen,ran,costo,
      inferidos,raciones:des+alm+cen});
  });
  filas.sort((a,b)=>(a.local===b.local?0:a.local?1:-1)
    ||a.nombre.localeCompare(b.nombre,'es'));

  const tot=f=>{
    const T={n:f.length,dias:0,des:0,alm:0,cen:0,ran:0,costo:0,raciones:0,inferidos:0};
    f.forEach(r=>{T.dias+=r.dias;T.des+=r.des;T.alm+=r.alm;T.cen+=r.cen;T.ran+=r.ran;
      T.costo+=r.costo;T.raciones+=r.raciones;T.inferidos+=r.inferidos;});
    T.costo=+T.costo.toFixed(2);
    return T;
  };
  const locales=filas.filter(r=>r.local), fuera=filas.filter(r=>!r.local);
  return{F,per:_apyPerActual(),precios:P,filas,locales,fuera,
    total:tot(filas),totLocal:tot(locales),totFuera:tot(fuera),totalDe:tot,
    sinPrecio:!(P.des||P.alm||P.cen||P.ran)};
}

// ── Excel ───────────────────────────────────────────────────────────────────
function _apyExportXls(){
  if(typeof XLSX==='undefined'){toast('Librería Excel no disponible',true);return;}
  const D=_apyDatos();
  const P=D.precios;
  const aoa=[
    ['PROYECCIÓN DE ALIMENTACIÓN — '+_apyPerNombre().toUpperCase()],
    ['Precios','Desayuno',P.des,'Almuerzo',P.alm,'Cena',P.cen,'Rancho frío',P.ran],
    [],
    ['Trabajador','DNI','Cargo','Procedencia','Local','TD','TN','DLT','Días',
     'Desayunos','Almuerzos','Cenas','Rancho frío','Raciones','Costo S/']
  ];
  D.filas.forEach(r=>aoa.push([r.nombre,r.p.dni||'',r.p.cargo||'',r.proc||'(sin procedencia)',
    r.local?'Sí':'No',r.nTD,r.nTN,r.nDLT,r.dias,r.des,r.alm,r.cen,r.ran,r.raciones,r.costo]));
  const T=D.total;
  aoa.push(['TOTAL','','','','',T.dias?'':'', '','',T.dias,T.des,T.alm,T.cen,T.ran,T.raciones,T.costo]);
  const ws=XLSX.utils.aoa_to_sheet(aoa);
  ws['!cols']=[{wch:32},{wch:11},{wch:22},{wch:18},{wch:7}].concat(Array(10).fill({wch:11}));
  const wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,ws,'Proyección');
  XLSX.writeFile(wb,'Proyeccion Alimentacion '+D.per+'.xlsx');
}

// ── Documento para imprimir ─────────────────────────────────────────────────
function _apyDoc(){
  const D=_apyDatos();
  const P=D.precios;
  const AZ='#1e3a5f';
  const logoUrl=(typeof EMPRESA!=='undefined')?new URL(EMPRESA.logo,location.href).href:'';
  const TH=`padding:4px 6px;font-size:9px;background:${AZ};color:#fff;text-transform:uppercase;letter-spacing:.02em;border:1px solid ${AZ}`;
  const TD='padding:3px 6px;font-size:10px;border:1px solid #bbb;color:#111';
  const TBL='width:100%;border-collapse:collapse';
  const kpi=(l,v,c)=>`<div style="min-width:0;border:2px solid ${c};border-radius:8px;padding:6px 8px"><div style="font-size:8px;text-transform:uppercase;letter-spacing:.05em;color:#555;font-weight:700">${l}</div><div style="font-size:15px;font-weight:900;color:${c};white-space:nowrap">${v}</div></div>`;
  const fila=r=>`<tr>
    <td style="${TD}">${_apyEsc(r.nombre)}</td>
    <td style="${TD};font-size:9px;color:#555">${_apyEsc(r.proc||'(sin procedencia)')}</td>
    <td style="${TD};text-align:center">${r.nTD||'—'}</td>
    <td style="${TD};text-align:center">${r.nTN||'—'}</td>
    <td style="${TD};text-align:center">${r.nDLT?r.nDLT+(r.inferidos?'~':''):'—'}</td>
    <td style="${TD};text-align:center;font-weight:700">${r.dias}</td>
    <td style="${TD};text-align:center">${r.des||'—'}</td>
    <td style="${TD};text-align:center">${r.alm||'—'}</td>
    <td style="${TD};text-align:center">${r.cen||'—'}</td>
    <td style="${TD};text-align:center;color:${r.ran?'#0e7490':'#999'}">${r.ran||'—'}</td>
    <td style="${TD};text-align:right;font-weight:800">${_apyS2(r.costo)}</td>
  </tr>`;
  const bloque=(titulo,items,T,color)=>{
    if(!items.length)return'';
    return`<tr><td colspan="11" style="${TD};background:#e8edf3;font-weight:900;color:${AZ};text-transform:uppercase">${titulo} · ${items.length} persona(s)</td></tr>`
      +items.map(fila).join('')
      +`<tr style="background:#eef2f7;font-weight:800">
        <td style="${TD}" colspan="5">Subtotal ${titulo}</td>
        <td style="${TD};text-align:center">${T.dias}</td>
        <td style="${TD};text-align:center">${T.des}</td>
        <td style="${TD};text-align:center">${T.alm}</td>
        <td style="${TD};text-align:center">${T.cen}</td>
        <td style="${TD};text-align:center">${T.ran}</td>
        <td style="${TD};text-align:right">${_apyS2(T.costo)}</td>
      </tr>`;
  };
  const T=D.total;
  return`
  <div style="font-family:Arial,Helvetica,sans-serif;color:#111">
    <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;border-bottom:3px solid ${AZ};padding-bottom:6px">
      <div style="flex:1;font-size:10px;color:#333">
        <div style="font-weight:800;color:${AZ};text-transform:capitalize">${_apyPerNombre()}</div>
        <div>Precios: Des. ${_apyS2(P.des)} · Alm. ${_apyS2(P.alm)} · Cena ${_apyS2(P.cen)} · Rancho ${_apyS2(P.ran)}</div>
      </div>
      <div style="flex:2;text-align:center">
        <div style="font-size:18px;font-weight:900;color:${AZ};letter-spacing:.03em">PROYECCIÓN DE ALIMENTACIÓN</div>
        <div style="font-size:11px;font-weight:800;color:#2563eb;margin-top:2px">CONTRASTE CON LA CONCESIONARIA</div>
      </div>
      <div style="flex:1;text-align:right">${logoUrl?`<img src="${logoUrl}" alt="ECOSERMO" style="height:44px;max-width:170px;object-fit:contain">`:''}</div>
    </div>

    <div style="display:grid;grid-auto-flow:column;grid-auto-columns:1fr;gap:6px;margin-top:10px">
      ${kpi('Personas con derecho',T.n,'#ec4899')}
      ${kpi('Desayunos',T.des,'#f59e0b')}
      ${kpi('Almuerzos',T.alm,'#10b981')}
      ${kpi('Cenas',T.cen,'#6366f1')}
      ${kpi('Rancho frío',T.ran,'#06b6d4')}
      ${kpi('Costo del mes',_apyS2(T.costo),'#b91c1c')}
    </div>

    <table style="${TBL};margin-top:12px">
      <tr>
        <th style="${TH};text-align:left">Trabajador</th><th style="${TH};text-align:left">Procedencia</th>
        <th style="${TH}">TD</th><th style="${TH}">TN</th><th style="${TH}">DLT</th><th style="${TH}">Días</th>
        <th style="${TH}">Desay.</th><th style="${TH}">Almuer.</th><th style="${TH}">Cenas</th>
        <th style="${TH}">Rancho</th><th style="${TH}">Costo S/</th>
      </tr>
      ${bloque('De fuera (3 raciones)',D.fuera,D.totFuera)}
      ${bloque('Locales (2 raciones)',D.locales,D.totLocal)}
      ${D.filas.length?`<tr style="background:#dde5ee;font-weight:900">
        <td style="${TD}" colspan="5">TOTAL</td>
        <td style="${TD};text-align:center">${T.dias}</td>
        <td style="${TD};text-align:center">${T.des}</td>
        <td style="${TD};text-align:center">${T.alm}</td>
        <td style="${TD};text-align:center">${T.cen}</td>
        <td style="${TD};text-align:center">${T.ran}</td>
        <td style="${TD};text-align:right">${_apyS2(T.costo)}</td>
      </tr>`:`<tr><td colspan="11" style="${TD};text-align:center;color:#777">Sin tareo cargado en ${_apyPerNombre()}</td></tr>`}
    </table>
    <div style="font-size:8.5px;color:#666;margin-top:3px">
      Solo come quien tiene TD, TN o DLT · los de fuera: desayuno, almuerzo y cena ·
      los locales (${_apyLocales().map(l=>_apyEsc(l.nombre)).join(', ')||'ninguna procedencia cargada'}):
      de día desayuno y almuerzo, de noche desayuno y cena ·
      el rancho frío no se proyecta, se carga a mano ·
      ~ el turno del DLT se heredó del día anterior de la misma persona
    </div>
  </div>`;
}
function _apyPrint(){
  const win=window.open('','_blank');
  if(!win){toast('Active ventanas emergentes para imprimir',true);return;}
  win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Proyección de Alimentación</title>
  <style>@page{size:A4 landscape;margin:1cm}body{margin:0;background:#fff}
  *{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}
  tr{page-break-inside:avoid}</style></head><body>${_apyDoc()}</body></html>`);
  win.document.close();win.focus();
  setTimeout(()=>win.print(),400);
}

// ── Pestaña ─────────────────────────────────────────────────────────────────
// La llama rAli(): pinta la barra de tabs y, si toca, la proyección.
function _apyPintarTabs(){
  const bar=document.getElementById('aliTabBar');
  const reg=document.getElementById('aliReg');
  const pro=document.getElementById('aliProy');
  if(!bar||!reg||!pro)return;
  const b=(t,lbl)=>{const on=_apyTab===t;return`<button onclick="_apySetTab('${t}')" style="padding:.4rem 1rem;border:none;border-radius:7px 7px 0 0;cursor:pointer;font-size:.8rem;font-weight:700;background:${on?'var(--bsw)':'transparent'};color:${on?'#fff':'var(--muted2)'}">${lbl}</button>`;};
  bar.innerHTML=`<div style="display:flex;gap:.2rem;border-bottom:2px solid var(--border);margin-bottom:.9rem">
    ${b('reg','🍽 Registro')}${b('proy','📊 Proyección Mensual')}</div>`;
  const enProy=_apyTab==='proy';
  reg.style.display=enProy?'none':'';
  pro.style.display=enProy?'':'none';
  if(enProy)_apyRender();
}
function _apyRender(){
  const el=document.getElementById('aliProy');if(!el)return;
  const D=_apyDatos();
  const P=D.precios;
  const inpS='font-size:.72rem;padding:.25rem .45rem;border-radius:5px;border:1px solid var(--border);background:var(--panel2);color:var(--text)';
  const btPrecio=(k,l,c)=>`<button onclick="_apySetPrecio('${k}')" style="font-size:.66rem;padding:.25rem .6rem;border-radius:6px;border:1px solid ${P[k]?c:'var(--border)'};background:${P[k]?c+'22':'transparent'};color:${P[k]?c:'var(--muted2)'};cursor:pointer;font-weight:700;white-space:nowrap" title="Precio unitario que cobra la concesionaria">💰 ${l}: ${P[k]?_apyS2(P[k]):'—'}</button>`;

  const loc=_apyLocales();
  const chips=loc.map(l=>`<span style="display:inline-flex;align-items:center;gap:.25rem;font-size:.66rem;padding:.15rem .45rem;border-radius:20px;border:1px solid #10b98155;background:#10b98118;color:#10b981;font-weight:700">${_apyEsc(l.nombre)}<button onclick="_apyLocalQuitar(${+l.id})" title="Quitar" style="background:none;border:none;color:#10b981;cursor:pointer;font-size:.7rem;padding:0 0 0 .1rem">✕</button></span>`).join('');

  const bar=`<div style="display:flex;align-items:center;gap:.5rem;flex-wrap:wrap;margin-bottom:.7rem;padding:.45rem .7rem;background:var(--panel2);border:1px solid var(--border);border-radius:8px">
    <span style="font-size:.62rem;color:var(--muted2);font-weight:700;text-transform:uppercase;letter-spacing:.08em">Mes</span>
    <input type="month" value="${D.per}" onchange="_apySetPer(this.value)" style="${inpS};width:145px">
    <div style="width:1px;height:18px;background:var(--border)"></div>
    ${_APY_RACIONES.map(r=>btPrecio(r.k,r.l,r.c)).join('')}
    <div class="search-wrap" style="margin-left:auto"><span>🔍</span><input id="apyBuscar" class="search-input" placeholder="Buscar..." value="${_apyEsc(_apyBuscar)}" oninput="_apyBuscar=this.value;buscarFoco('apyBuscar',rAli)"></div>
    <button onclick="_apyExportXls()" style="font-size:.72rem;padding:.3rem .8rem;border-radius:6px;border:1px solid #15803d;background:rgba(21,128,61,.15);color:#22c55e;cursor:pointer;font-weight:800;white-space:nowrap">⬇ Excel</button>
    <button onclick="_apyPrint()" style="font-size:.72rem;padding:.3rem .9rem;border-radius:6px;border:none;background:#b91c1c;color:#fff;cursor:pointer;font-weight:800;white-space:nowrap">🖨 Imprimir / PDF</button>
  </div>
  <div style="display:flex;align-items:center;gap:.4rem;flex-wrap:wrap;margin-bottom:.9rem;padding:.4rem .7rem;background:var(--panel2);border:1px solid var(--border);border-radius:8px">
    <span style="font-size:.62rem;color:var(--muted2);font-weight:700;text-transform:uppercase;letter-spacing:.08em" title="Estas procedencias comen 2 veces al día; el resto, 3">Comen 2 veces</span>
    ${chips||'<span style="font-size:.68rem;color:var(--muted2)">Ninguna cargada: todos cuentan 3 raciones</span>'}
    <button onclick="_apyLocalAgregar()" style="font-size:.66rem;padding:.2rem .55rem;border-radius:6px;border:1px dashed var(--border);background:transparent;color:var(--muted2);cursor:pointer">＋ Agregar</button>
  </div>`;

  const T=D.total;
  const kpis=[
    {l:'Personas con derecho',v:T.n,c:'#ec4899'},
    {l:'Desayunos',v:T.des,c:'#f59e0b'},
    {l:'Almuerzos',v:T.alm,c:'#10b981'},
    {l:'Cenas',v:T.cen,c:'#6366f1'},
    {l:'Rancho frío',v:T.ran,c:'#06b6d4'},
    {l:'Costo del mes',v:_apyS2(T.costo),c:'#b91c1c'}
  ].map(k=>`<div class="kpi" style="--kc:${k.c}"><div class="kpi-lbl">${k.l}</div><div class="kpi-val" style="font-size:${String(k.v).length>8?'1.15rem':'1.7rem'}">${k.v}</div></div>`).join('');

  const TDs='padding:.35rem .5rem;border-bottom:1px solid var(--border);font-size:.74rem;white-space:nowrap';
  const THs='background:var(--panel2);color:var(--muted2);font-size:.6rem;font-weight:700;text-transform:uppercase;letter-spacing:.05em;padding:.4rem .5rem;white-space:nowrap;position:sticky;top:0;z-index:2';
  const fila=r=>`<tr>
    <td style="${TDs}">${_apyEsc(r.nombre)}</td>
    <td style="${TDs};font-size:.66rem;color:var(--muted2)">${_apyEsc(r.p.cargo||'—')}</td>
    <td style="${TDs};color:${r.local?'#10b981':'var(--text)'}">${_apyEsc(r.proc||'(sin procedencia)')}</td>
    <td style="${TDs};text-align:center;font-family:monospace">${r.nTD||'—'}</td>
    <td style="${TDs};text-align:center;font-family:monospace">${r.nTN||'—'}</td>
    <td style="${TDs};text-align:center;font-family:monospace" ${r.inferidos?'title="El turno del DLT se heredó del día anterior de esta persona"':''}>${r.nDLT?r.nDLT+(r.inferidos?'~':''):'—'}</td>
    <td style="${TDs};text-align:center;font-family:monospace;font-weight:700">${r.dias}</td>
    <td style="${TDs};text-align:center;font-family:monospace;color:#f59e0b">${r.des||'—'}</td>
    <td style="${TDs};text-align:center;font-family:monospace;color:#10b981">${r.alm||'—'}</td>
    <td style="${TDs};text-align:center;font-family:monospace;color:#818cf8">${r.cen||'—'}</td>
    <td style="${TDs};text-align:center"><input type="number" min="0" step="1" value="${r.ran||''}" placeholder="0" onchange="_apySetRancho(${+r.p.id},this.value)" style="width:56px;text-align:center;font-size:.72rem;padding:.15rem .25rem;border-radius:5px;border:1px solid ${r.ran?'#06b6d4':'var(--border)'};background:var(--panel);color:${r.ran?'#06b6d4':'var(--text)'}"></td>
    <td style="${TDs};text-align:right;font-family:monospace;font-weight:800;color:#f472b6">${_apyS2(r.costo)}</td>
  </tr>`;
  const grupo=(titulo,items,S,col)=>items.length?`
    <tr><td colspan="12" style="${TDs};background:var(--panel2);font-weight:800;color:${col};text-transform:uppercase;font-size:.66rem">${titulo} · ${items.length} persona(s)</td></tr>
    ${items.map(fila).join('')}
    <tr style="background:var(--panel2);font-weight:800">
      <td style="${TDs}" colspan="6">Subtotal ${titulo}</td>
      <td style="${TDs};text-align:center;font-family:monospace">${S.dias}</td>
      <td style="${TDs};text-align:center;font-family:monospace">${S.des}</td>
      <td style="${TDs};text-align:center;font-family:monospace">${S.alm}</td>
      <td style="${TDs};text-align:center;font-family:monospace">${S.cen}</td>
      <td style="${TDs};text-align:center;font-family:monospace">${S.ran}</td>
      <td style="${TDs};text-align:right;font-family:monospace">${_apyS2(S.costo)}</td>
    </tr>`:'';

  el.innerHTML=bar
    +`<div class="kpi-row">${kpis}</div>`
    +(D.sinPrecio?`<div style="margin-bottom:.7rem;padding:.5rem .7rem;border:1px solid #f59e0b55;background:#f59e0b18;border-radius:8px;font-size:.72rem;color:#f59e0b">Sin precios cargados para ${_apyPerNombre()}: las raciones se cuentan igual, pero el costo sale en S/ 0.00. Use los botones 💰 de arriba.</div>`:'')
    +`<div class="card"><div class="card-head"><span class="card-title">📊 Proyección de ${_apyPerNombre()}</span>
        <span style="font-size:.68rem;color:var(--muted2)">${T.raciones} ración(es) proyectadas desde el tareo${T.ran?' · '+T.ran+' rancho(s) frío(s) cargado(s) a mano':''}</span></div>
      <div class="card-body" style="padding:0"><div class="tbl-wrap" style="max-height:65vh;overflow:auto">
      <table style="min-width:100%;border-collapse:collapse"><thead><tr>
        <th style="${THs};text-align:left">Trabajador</th><th style="${THs};text-align:left">Cargo</th>
        <th style="${THs};text-align:left">Procedencia</th>
        <th style="${THs}">TD</th><th style="${THs}">TN</th><th style="${THs}">DLT</th><th style="${THs}">Días</th>
        <th style="${THs}">Desay.</th><th style="${THs}">Almuer.</th><th style="${THs}">Cenas</th>
        <th style="${THs}">Rancho</th><th style="${THs};text-align:right">Costo</th>
      </tr></thead><tbody>
        ${grupo('De fuera (3 raciones)',D.fuera,D.totFuera,'#f472b6')}
        ${grupo('Locales (2 raciones)',D.locales,D.totLocal,'#10b981')}
        ${D.filas.length?'':`<tr><td colspan="12" style="${TDs};text-align:center;padding:2rem;color:var(--muted2)">Sin tareo cargado en ${_apyPerNombre()}</td></tr>`}
      </tbody></table></div></div></div>`;
}
