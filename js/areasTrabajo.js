// ══ DATA DE INGRESOS – ÁREAS DE TRABAJO ══════════════════════════════════════
// Catálogo de áreas que se eligen en el parte diario. Las cuatro líneas
// (Amarilla, Blanca, Vehículos Menores, Equipos Menores) usan el mismo
// formulario, así que alimentarlo aquí alcanza a todas.
//
// Antes la lista salía de las áreas ya usadas en partes anteriores, por eso
// solo aparecía "R3" y no había forma de agregar una nueva.
//
// El parte guarda el NOMBRE del área como texto (partes.area_t), no su id:
//   · renombrar un área no cambia los partes ya registrados
//   · borrar un área solo la quita de la lista; los partes conservan el nombre
//
// Prefijo _at.

let _atEditId=null;

const _atEsc=s=>String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;')
  .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const _atClave=s=>String(s==null?'':s).trim().toLowerCase();

// Cuántos partes usan un área (se compara sin mayúsculas ni espacios)
function _atUsos(nombre){
  const n=_atClave(nombre);
  return n?(DB.partes||[]).filter(p=>_atClave(p.areaT)===n).length:0;
}

// ── Para el formulario del parte ────────────────────────────────────────────
// El catálogo, en orden alfabético. Si todavía no hay catálogo (no se corrió
// sql/areas_trabajo.sql) se usa la lista de antes, para no dejar el combo vacío.
function _atOpcionesParte(){
  const cat=[...new Set((DB.areasTrabajo||[]).map(a=>String(a.nombre||'').trim()).filter(Boolean))]
    .sort((a,b)=>a.localeCompare(b));
  if(cat.length)return cat;
  const usadas=[...new Set((DB.partes||[]).map(p=>p.areaT).filter(Boolean))];
  return usadas.length?usadas:['R3','NINGUNO'];
}
// Al editar un parte viejo cuya área ya no está en el catálogo, se agrega como
// opción marcada: si no, el combo quedaría en blanco y al guardar se perdería.
function _atAsegurarOpcion(sel,valor){
  if(!sel)return;
  const v=String(valor||'');
  if(v&&![...sel.options].some(o=>o.value===v)){
    const o=document.createElement('option');
    o.value=v;o.textContent=v+' (fuera del catálogo)';
    sel.appendChild(o);
  }
  sel.value=v;
}

// ── Página ──────────────────────────────────────────────────────────────────
function rAreasTrabajo(){
  const tb=document.getElementById('tbAreasTrabajo');
  if(!tb)return;
  const lista=[...(DB.areasTrabajo||[])]
    .sort((a,b)=>String(a.nombre||'').localeCompare(String(b.nombre||'')));
  const hayUsadas=(DB.partes||[]).some(p=>p.areaT);
  tb.innerHTML=lista.length?lista.map(a=>{
    const n=_atUsos(a.nombre);
    return`<tr>
      <td><strong>${_atEsc(a.nombre)}</strong></td>
      <td style="color:var(--muted2);white-space:normal;max-width:420px">${a.notas?_atEsc(a.notas):'—'}</td>
      <td class="mono" style="text-align:center;color:${n?'var(--text)':'var(--muted2)'}" title="Partes diarios registrados con esta área">${n}</td>
      <td style="display:flex;gap:.3rem">
        <button class="btn btn-sm" style="background:#1e3a5f;border:1px solid #2a5a8f;color:#6bb3f5" onclick="_atEditar(${+a.id})" title="Editar">✏️</button>
        <button class="btn btn-del btn-sm" onclick="_atBorrar(${+a.id})" title="Eliminar">🗑</button>
      </td>
    </tr>`;
  }).join('')
  :`<tr><td colspan="4" style="text-align:center;padding:2rem;color:var(--muted2)">
      Sin áreas registradas. Agregue la primera con ＋ Agregar${hayUsadas?', o corra <code>sql/areas_trabajo.sql</code> para traer las que ya usan los partes':''}.
    </td></tr>`;
}

function _atNueva(){
  _atEditId=null;
  const t=document.getElementById('mAreaTtl');if(t)t.textContent='＋ Área de Trabajo';
  const n=document.getElementById('atNom');if(n)n.value='';
  const o=document.getElementById('atNotas');if(o)o.value='';
  openM('mAreaTrabajo');
  setTimeout(()=>{const el=document.getElementById('atNom');if(el)el.focus();},120);
}
function _atEditar(id){
  const a=(DB.areasTrabajo||[]).find(x=>+x.id===+id);if(!a)return;
  _atEditId=+a.id;
  const t=document.getElementById('mAreaTtl');if(t)t.textContent='✏️ Editar Área';
  document.getElementById('atNom').value=a.nombre||'';
  document.getElementById('atNotas').value=a.notas||'';
  openM('mAreaTrabajo');
}

async function _atGuardar(){
  const nom=(document.getElementById('atNom')?.value||'').trim();
  const notas=(document.getElementById('atNotas')?.value||'').trim();
  if(!nom){toast('Escriba el nombre del área',true);return;}
  const rep=(DB.areasTrabajo||[]).find(a=>_atClave(a.nombre)===_atClave(nom)&&+a.id!==+_atEditId);
  if(rep){toast('Ya existe el área '+rep.nombre,true);return;}

  DB.areasTrabajo=DB.areasTrabajo||[];
  const nueva=_atEditId==null;
  const prev=nueva?null:DB.areasTrabajo.find(a=>+a.id===+_atEditId);
  const antes=prev?String(prev.nombre||''):'';
  const rec={id:nueva?nidSeguro('atr','areasTrabajo'):+_atEditId,nombre:nom,notas:notas||null};
  // El id nuevo se reserva antes de esperar a Supabase
  if(nueva)DB.areasTrabajo.push({...rec});
  const err=await supaUpsert('areasTrabajo',rec);
  if(err){if(nueva)DB.areasTrabajo=DB.areasTrabajo.filter(a=>+a.id!==+rec.id);return;}
  if(prev)Object.assign(prev,rec);

  closeM('mAreaTrabajo');
  _atEditId=null;
  rAreasTrabajo();
  const usosAntes=prev&&_atClave(antes)!==_atClave(nom)?_atUsos(antes):0;
  toast(usosAntes
    ?'✓ Área renombrada · los '+usosAntes+' parte(s) anteriores siguen con «'+antes+'»'
    :'✓ Área '+(nueva?'guardada':'actualizada'));
}

async function _atBorrar(id){
  const a=(DB.areasTrabajo||[]).find(x=>+x.id===+id);if(!a)return;
  const n=_atUsos(a.nombre);
  if(!confirm('¿Eliminar el área «'+a.nombre+'»?'
    +(n?'\n\nLa usan '+n+' parte(s): conservan el nombre, pero ya no aparecerá en la lista del formulario.':'')))return;
  await supaDelete('areasTrabajo',a.id);
  DB.areasTrabajo=(DB.areasTrabajo||[]).filter(x=>+x.id!==+a.id);
  rAreasTrabajo();
  toast('Área «'+a.nombre+'» eliminada');
}
