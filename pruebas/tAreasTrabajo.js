// Data de Ingresos · Áreas de Trabajo. Se carga el módulo real y además se
// ejecuta el fragmento REAL del formulario del parte diario, para comprobar
// que el combo "Área de trabajo" sale del catálogo nuevo.
const fs=require('fs'),vm=require('vm');
const R='c:/Users/LENOVO/OneDrive/Documents/GitHub/GDARSystem/';
let ok=0,mal=0;
const es=(l,g,e)=>{const b=String(g)===String(e);b?ok++:mal++;
  console.log((b?'  OK  ':'  MAL ')+l.padEnd(60)+'= '+g+(b?'':'  (esperado '+e+')'));};

const nodos={};
const nodo=id=>nodos[id]||(nodos[id]={id,innerHTML:'',textContent:'',value:'',style:{},options:[],
  appendChild(o){this.options.push(o);}});
let upserts=[],borrados=[],avisos=[],confirmar=true,falla=false;
const DB={
  partes:[{areaT:'R3'},{areaT:'R3 '},{areaT:'Tajo Norte'},{areaT:''}],
  areasTrabajo:[{id:1,nombre:'R3',notas:''}]
};
const ctx=vm.createContext({
  DB,console,Math,Number,String,Object,Array,JSON,Set,
  document:{getElementById:nodo,createElement:()=>({value:'',textContent:''})},
  toast:(m,e)=>avisos.push({m,e:!!e}),confirm:()=>confirmar,
  openM(){},closeM(){},setTimeout:()=>0,
  supaUpsert:async(k,r)=>{if(falla)return{message:'falla simulada'};upserts.push({k,r:{...r}});return null;},
  supaDelete:async(k,id)=>{borrados.push({k,id});},
  nidSeguro:(nx,k)=>(DB[k]||[]).reduce((m,r)=>Math.max(m,+r.id||0),0)+1
});
vm.runInContext(fs.readFileSync(R+'js/areasTrabajo.js','utf8'),ctx,{filename:'areasTrabajo.js'});
const ev=x=>vm.runInContext(x,ctx);

(async()=>{
console.log('\n== Opciones para el parte diario ==');
es('sale del catálogo',ev('_atOpcionesParte().join(",")'),'R3');
DB.areasTrabajo.push({id:5,nombre:'Dique Sur',notas:'Etapa 2'},{id:6,nombre:'Cantera',notas:''});
es('  en orden alfabético',ev('_atOpcionesParte().join(",")'),'Cantera,Dique Sur,R3');
es('  sin arrastrar áreas viejas de los partes',ev('_atOpcionesParte().includes("Tajo Norte")'),false);
const guardado=DB.areasTrabajo.splice(0);
es('sin catálogo (SQL sin correr): como antes, las ya usadas',ev('_atOpcionesParte().sort().join(",")'),'R3,R3 ,Tajo Norte');
const partes=DB.partes.splice(0);
es('  y sin partes: R3 y NINGUNO',ev('_atOpcionesParte().join(",")'),'R3,NINGUNO');
DB.partes.push(...partes);DB.areasTrabajo.push(...guardado);

console.log('\n== Partes que usan un área ==');
es('R3 cuenta mayúsculas y espacios iguales',ev('_atUsos("r3")'),2);
es('Tajo Norte',ev('_atUsos("Tajo Norte")'),1);
es('un área sin partes',ev('_atUsos("Cantera")'),0);
es('un nombre vacío no cuenta los partes vacíos',ev('_atUsos("")'),0);

console.log('\n== Editar un parte viejo cuya área ya no está ==');
const sel={value:'',options:[{value:''},{value:'R3'}],appendChild(o){this.options.push(o);}};
ctx.__sel=sel;
ev('_atAsegurarOpcion(__sel,"Tajo Norte")');
es('se agrega como opción',sel.options.length,3);
es('  marcada como fuera del catálogo',sel.options[2].textContent,'Tajo Norte (fuera del catálogo)');
es('  y queda elegida',sel.value,'Tajo Norte');
ev('_atAsegurarOpcion(__sel,"R3")');
es('si ya existe no se duplica',sel.options.length,3);
es('  y se elige',sel.value,'R3');
ev('_atAsegurarOpcion(__sel,"")');
es('un parte sin área queda en blanco',sel.value,'');

console.log('\n== Guardar ==');
avisos=[];upserts=[];
ev('_atNueva()');
nodo('atNom').value='  r3 ';nodo('atNotas').value='';
await ev('_atGuardar()');
es('no deja repetir un nombre (sin importar mayúsculas)',avisos.some(a=>a.e&&/Ya existe/.test(a.m))&&upserts.length===0,true);
avisos=[];nodo('atNom').value='';
await ev('_atGuardar()');
es('exige nombre',avisos.some(a=>a.e&&/nombre/.test(a.m)),true);
nodo('atNom').value='  Botadero Este ';nodo('atNotas').value='  Cerca al km 12 ';
await ev('_atGuardar()');
es('crea el área',upserts.length,1);
es('  en areas_trabajo',upserts[0].k,'areasTrabajo');
es('  con el id siguiente',upserts[0].r.id,7);
es('  sin espacios sobrantes',upserts[0].r.nombre+'|'+upserts[0].r.notas,'Botadero Este|Cerca al km 12');
es('  y queda en DB',ev('DB.areasTrabajo.length'),4);
es('ya aparece en el parte',ev('_atOpcionesParte().includes("Botadero Este")'),true);
upserts=[];ev('_atNueva()');nodo('atNom').value='Pozo 2';nodo('atNotas').value='';
await ev('_atGuardar()');
es('notas vacías se guardan como null',upserts[0].r.notas,null);

console.log('\n== Renombrar ==');
avisos=[];upserts=[];
ev('_atEditar(1)');
es('el modal trae el nombre',nodo('atNom').value,'R3');
nodo('atNom').value='R3 Etapa 2';
await ev('_atGuardar()');
es('conserva el id',upserts[0].r.id,1);
es('avisa que los partes siguen con el nombre viejo',avisos.some(a=>/los 2 parte\(s\) anteriores siguen con «R3»/.test(a.m)),true);
es('  sin tocar los partes',DB.partes.filter(p=>p.areaT.trim()==='R3').length,2);
avisos=[];upserts=[];
ev('_atEditar(1)');nodo('atNotas').value='Solo cambio la nota';
await ev('_atGuardar()');
es('cambiar solo la nota no avisa nada raro',avisos.some(a=>/anteriores/.test(a.m)),false);

console.log('\n== Si Supabase falla ==');
falla=true;ev('_atNueva()');nodo('atNom').value='Nueva que falla';
const antes=ev('DB.areasTrabajo.length');
await ev('_atGuardar()');
falla=false;
es('no deja una fila fantasma',ev('DB.areasTrabajo.length'),antes);

console.log('\n== Borrar ==');
DB.areasTrabajo.find(a=>a.id===1).nombre='R3';
confirmar=false;borrados=[];
await ev('_atBorrar(1)');
es('si no confirma, no borra',borrados.length,0);
confirmar=true;
await ev('_atBorrar(1)');
es('borra de Supabase',borrados.length===1&&borrados[0].id===1,true);
es('  y de la lista',ev('DB.areasTrabajo.some(a=>a.id===1)'),false);
es('  los partes conservan su área',DB.partes.filter(p=>p.areaT.trim()==='R3').length,2);

console.log('\n== La página ==');
DB.areasTrabajo.push({id:9,nombre:'<b>Zona</b>',notas:'a & b'});
ev('rAreasTrabajo()');
const H=nodo('tbAreasTrabajo').innerHTML;
es('una fila por área',(H.match(/<tr>/g)||[]).length,ev('DB.areasTrabajo.length'));
es('  en orden alfabético (Botadero antes que Cantera)',H.indexOf('Botadero Este')<H.indexOf('Cantera'),true);
es('  escapa el HTML del nombre',/&lt;b&gt;Zona&lt;\/b&gt;/.test(H)&&!/<b>Zona/.test(H),true);
es('  y el de las notas',/a &amp; b/.test(H),true);
es('  sin celdas rotas',/undefined|NaN/.test(H),false);
DB.areasTrabajo.splice(0);ev('rAreasTrabajo()');
es('vacía: sugiere correr el SQL (hay partes con área)',/sql\/areas_trabajo\.sql/.test(nodo('tbAreasTrabajo').innerHTML),true);

console.log('\n== El formulario REAL del parte usa el catálogo ==');
// Se extrae de partesDiarios.js el mismo bloque que llena el combo
const pd=fs.readFileSync(R+'js/partesDiarios.js','utf8');
const ini=pd.indexOf('const areas = typeof _atOpcionesParte');
const fin=pd.indexOf(".join('');",ini)+10;
es('partesDiarios.js pide las áreas al catálogo',ini>0,true);
DB.areasTrabajo.push({id:1,nombre:'R3'},{id:2,nombre:'Dique "Sur"'},{id:3,nombre:'Cantera'});
nodo('rpArea').innerHTML='';
vm.runInContext('(function(){'+pd.slice(ini,fin)+'})()',ctx);
const opts=[...nodo('rpArea').innerHTML.matchAll(/<option value="([^"]*)">/g)].map(m=>m[1]);
es('el combo trae el catálogo',opts.join(' | '),' | Cantera | Dique &quot;Sur&quot; | R3');
es('  con el texto escapado',/>Dique &quot;Sur&quot;</.test(nodo('rpArea').innerHTML),true);
es('al editar un parte se asegura la opción',
  /if\(typeof _atAsegurarOpcion==='function'\)_atAsegurarOpcion\(rpArea,p\.areaT\)/.test(pd),true);
es('las cuatro líneas usan ese mismo formulario (un solo #rpArea)',
  (fs.readFileSync(R+'index.html','utf8').match(/id="rpArea"/g)||[]).length,1);

console.log('\n== Enganche ==');
const cfg=fs.readFileSync(R+'js/config.js','utf8');
const utl=fs.readFileSync(R+'js/utils.js','utf8');
const html=fs.readFileSync(R+'index.html','utf8');
const sql=fs.readFileSync(R+'sql/areas_trabajo.sql','utf8');
es('config: tabla registrada',/areasTrabajo:'areas_trabajo'/.test(cfg),true);
es('config: arreglo inicial en DB',/areasTrabajo:\[\],\s*nx:\{/.test(cfg),true);
es('config: en el menú, dentro de Data de Ingresos',
  /key:'dataIngresos'[\s\S]{0,200}key:'frentesTrabajo'[\s\S]{0,80}key:'areasTrabajo'/.test(cfg),true);
es('utils: la página se pinta (con flecha perezosa)',/areasTrabajo:\(\)=>rAreasTrabajo\(\)/.test(utl),true);
es('index: página, tabla y modal',
  /id="page-areasTrabajo"/.test(html)&&/id="tbAreasTrabajo"/.test(html)&&/id="mAreaTrabajo"/.test(html),true);
es('index: script cargado',/<script src="js\/areasTrabajo\.js\?v=\d+"><\/script>/.test(html),true);
es('index: partesDiarios.js con versión nueva',/partesDiarios\.js\?v=6/.test(html),true);
es('SQL: RLS con la política de siempre',
  /enable row level security/.test(sql)&&/create policy gdar_autenticado on public\.areas_trabajo/.test(sql),true);
es('SQL: nombre único sin importar mayúsculas',/on public\.areas_trabajo \(lower\(trim\(nombre\)\)\)/.test(sql),true);
es('SQL: trae las áreas ya usadas en los partes',/from public\.partes/.test(sql)&&/where not exists/.test(sql),true);
es('SQL: se puede correr dos veces',/on conflict do nothing/.test(sql),true);
const mod=fs.readFileSync(R+'js/areasTrabajo.js','utf8');
es('todo lo nuevo lleva prefijo _at',
  [...mod.matchAll(/^(?:const|let|function|async function)\s+([A-Za-z_$][\w$]*)/gm)].map(m=>m[1])
    .every(n=>/^_at/.test(n)||n==='rAreasTrabajo'),true);

console.log('\n'+(mal?'X '+mal+' fallo(s)':'OK todo bien')+'  ·  '+ok+'/'+(ok+mal));
process.exit(mal?1:0);
})().catch(e=>{console.error('X la prueba reventó:',e);process.exit(1);});
