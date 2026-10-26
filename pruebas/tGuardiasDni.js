// Guardias FBNV (Resumen Diario de Tareaje y Roster): checkbox «DNI» que agrega
// la columna DNI a los tres cuadros, al PDF y al Excel.
const fs=require('fs'),vm=require('vm');
const R='c:/Users/LENOVO/OneDrive/Documents/GitHub/GDARSystem/';
let ok=0,mal=0;
const es=(l,g,e)=>{const b=String(g)===String(e);b?ok++:mal++;
  console.log((b?'  OK  ':'  MAL ')+l.padEnd(62)+'= '+g+(b?'':'  (esperado '+e+')'));};

const DB={
  personal:[
    {id:1,ape:'SUAREZ DE LA CRUZ',nom:'Hernan',cargo:'ING. SUPERVISOR DE CAMPO',guardia:'A',est:'Activo',dni:'04067511'},
    {id:2,ape:'RODRIGUEZ MARTINES',nom:'Andres',cargo:'ING. RESIDENTE',guardia:'B',est:'Activo',dni:'42307112'},
    {id:3,ape:'GUZMAN CAMPOS',nom:'Juan Jose',cargo:'OP. EXCAVADORA',guardia:'B',est:'Activo',dni:'46511163'},
    {id:4,ape:'APONTE GLORIO',nom:'Jorge',cargo:'SUP. SEGURIDAD',guardia:'C',est:'Activo',dni:null}
  ],
  tareaje:[
    {personalId:1,fecha:'2026-10-25',tipo:'DL'},{personalId:2,fecha:'2026-10-25',tipo:'TD'},
    {personalId:3,fecha:'2026-10-25',tipo:'TD'},{personalId:4,fecha:'2026-10-25',tipo:'TD'}
  ],
  proyectos:[]
};
const mem={};let libro=null,hoja=null;
const nodos={tarPgFecha:{value:'2026-10-25'},tarPgProy:{value:''},gdBody:{innerHTML:''}};
const ctx=vm.createContext({DB,console,Math,Number,String,Object,Array,JSON,Set,Map,isFinite,
  document:{getElementById:id=>nodos[id]||null},today:()=>'2026-10-25',toast(){},
  localStorage:{getItem:k=>k in mem?mem[k]:null,setItem:(k,v)=>{mem[k]=String(v);}},
  XLSX:{utils:{encode_cell:({r,c})=>String.fromCharCode(65+c)+(r+1),
    aoa_to_sheet:aoa=>{const ws={__aoa:aoa};aoa.forEach((row,r)=>row.forEach((v,c)=>{if(v!=='')ws[String.fromCharCode(65+c)+(r+1)]={t:typeof v==='number'?'n':'s',v};}));return ws;},
    book_new:()=>({}),book_append_sheet:(wb,ws)=>{hoja=ws;}},writeFile:(wb,n)=>{libro=n;}}});
vm.runInContext(fs.readFileSync(R+'js/guardiasFbnv.js','utf8').replace(/^const /gm,'var ').replace(/^let /gm,'var '),ctx,{filename:'guardiasFbnv.js'});
const ev=x=>vm.runInContext(x,ctx);
const H=()=>nodos.gdBody.innerHTML;

console.log('\n== Sin DNI (como hasta ahora) ==');
ev('rGuardiasFbnv()');
es('aparece el checkbox DNI, desmarcado',/id="gdDniChk"  onchange="_gdToggleDni/.test(H()),true);
es('sin columna DNI',/>DNI<\/th>/.test(H()),false);
es('cabecera de guardia de 4 columnas',(H().match(/colspan="4" class="gd-g"/g)||[]).length,3);

console.log('\n== Con DNI ==');
ev('_gdToggleDni(true)');
es('el checkbox queda marcado',/id="gdDniChk" checked/.test(H()),true);
es('una columna DNI en cada guardia',(H().match(/>DNI<\/th>/g)||[]).length,3);
es('  entre el nombre y el turno',/APELLIDOS Y NOMBRES<\/th>\s*<th[^>]*>DNI<\/th>\s*<th[^>]*>TURNO/.test(H()),true);
es('  la cabecera de guardia se ensancha a 5',(H().match(/colspan="5" class="gd-g"/g)||[]).length,3);
es('el DNI de cada persona, con su 0 inicial',/<td class="gd-d"[^>]*>04067511<\/td>/.test(H())&&/>42307112</.test(H()),true);
es('quien no tiene DNI queda vacío (sin "null")',/null|undefined/.test(H()),false);
es('se recuerda en el navegador',mem.gdar_gd_dni,'1');
es('el PDF copia el cuadro de la pantalla (con DNI)',/doc\.outerHTML/.test(fs.readFileSync(R+'js/guardiasFbnv.js','utf8')),true);

console.log('\n== Excel con DNI ==');
ev('_gdExcel()');
es('se descarga',libro,'Guardias_FBNV_2026-10-25.xlsx');
const A=hoja.__aoa;
es('cabecera: ITEM · CARGO · APELLIDOS · DNI · TURNO',A[2].slice(0,5).join(' · '),'ITEM · CARGO · APELLIDOS Y NOMBRES · DNI · TURNO');
es('  y lo mismo en el segundo bloque (columna 6)',A[2].slice(6,11).join(' · '),'ITEM · CARGO · APELLIDOS Y NOMBRES · DNI · TURNO');
const filaDe=t=>A.findIndex(r=>r.some(v=>String(v).startsWith(t)));
const r1=A[filaDe('SUAREZ DE LA CRUZ')];
es('DNI en su columna, como texto con el 0',JSON.stringify([r1[2],r1[3],r1[4]]),'["SUAREZ DE LA CRUZ, HERNAN","04067511","DL"]');
es('  la celda queda en formato texto',ev('_gdDni')&&hoja['D'+(filaDe('SUAREZ DE LA CRUZ')+1)].t,'s');
es('anchos: 5 columnas por bloque + separadora',hoja['!cols'].length,17);
es('título combinado a lo ancho de las 17 columnas',hoja['!merges'][0].e.c,16);

console.log('\n== Excel sin DNI: igual que antes ==');
ev('_gdToggleDni(false);_gdExcel()');
const B=hoja.__aoa;
es('cabecera de 4 columnas',B[2].slice(0,4).join(' · '),'ITEM · CARGO · APELLIDOS Y NOMBRES · TURNO');
es('segundo bloque en la columna 5, como siempre',B[2][5],'ITEM');
es('14 columnas',hoja['!cols'].length,14);

console.log('\n== Roster: el mismo cuadro ==');
nodos.gdRosBody={innerHTML:''};nodos.gdRosFecha={value:'2026-10-25'};
ctx._rosterGetCfg=()=>({fechaInicio:'2026-10-01',turno:'DIA'});ctx._rosterTipoPersona=()=>'TD';
ev('_gdToggleDni(true);rGuardiasRoster()');
es('también trae la columna DNI',(nodos.gdRosBody.innerHTML.match(/>DNI<\/th>/g)||[]).length,3);

console.log('\n'+(mal?'✗ '+mal+' FALLAS':'OK todo bien')+'  ·  '+ok+'/'+(ok+mal));
process.exit(mal?1:0);
