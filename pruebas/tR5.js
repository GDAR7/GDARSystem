const fs=require('fs');
const R='c:/Users/LENOVO/OneDrive/Documents/GitHub/GDARSystem/';

// El DOM mínimo: los contenedores que la pantalla toca
const nodos={};
const mk=id=>nodos[id]||(nodos[id]={id,innerHTML:'',value:'',focos:0,focus(){this.focos++;}});
['r5Body','r5Tabla','r5Buscar'].forEach(mk);
global.document={getElementById:id=>nodos[id]||null};
global.toast=m=>{global._t=m;};global.openM=()=>{};global.closeM=()=>{};
global.isModuleReadOnly=()=>false;
global.nid=()=>1;global.nidSeguro=()=>1;global.supaUpsert=async()=>null;global.syncSheet=()=>{};
global.DB={personal:[],tareaje:[],planillaMes:[],renta5ta:[],renta5taCfg:[{id:1,anio:'2026',uit:5500}]};

const src=fs.readFileSync(R+'js/renta5ta.js','utf8')
  +'\n;global.rRenta5ta=rRenta5ta;global._r5Tabla=_r5Tabla;global._r5SetBuscar=_r5SetBuscar;'
  +'global._r5Coincide=_r5Coincide;global._r5NormB=_r5NormB;global._r5BuscarNota=_r5BuscarNota;'
  +'global._r5LimpiarBuscar=_r5LimpiarBuscar;global._r5Set=_r5Set;global._r5Excel=_r5Excel;'
  +'global._getBuscar=()=>_r5Buscar;global._setAfectos=v=>{_r5SoloAfectos=v};_r5Mes=7;_r5Anio="2026";';
eval(src);

let ok=0,mal=0;
const es=(l,g,e)=>{const b=String(g)===String(e);b?ok++:mal++;
  console.log((b?'  OK  ':'  MAL ')+l.padEnd(54)+'= '+g+(b?'':'  (esperado '+e+')'));};

// Gente parecida a la de la pantalla real
DB.personal=[
  {id:1,dni:'43753444',ape:'ALCANTARA CHAVEZ',nom:'ANGEL MIGUEL', cargo:'OP. VOLQUETE',  sue:3113,est:'Activo'},
  {id:2,dni:'73748710',ape:'ALCOSER HUNGARO', nom:'ROSSY MILAGROS',cargo:'OP. RODILLO',  sue:2913,est:'Activo'},
  {id:3,dni:'42307112',ape:'AMBROSIO PAJUELO',nom:'FREDY RAUL',    cargo:'OP. VOLQUETE', sue:3113,est:'Activo'},
  {id:4,dni:'10199407',ape:'RODRIGUEZ MARTINES',nom:'ANDRES',      cargo:'ING. RESIDENTE',sue:9000,est:'Activo'},
  {id:5,dni:'78462600',ape:'ÑAHUI QUISPE',   nom:'JOSÉ MARÍA',     cargo:'AYUDANTE',     sue:1200,est:'Activo'},
  {id:6,dni:'09521349',ape:'BAJA PEREZ',     nom:'LUIS',           cargo:'OP. VOLQUETE', sue:3113,est:'Inactivo'}
];
// Tareaje para que el cálculo tenga base
DB.personal.forEach(p=>{for(let d=1;d<=30;d++)DB.tareaje.push({personalId:p.id,fecha:'2026-07-'+String(d).padStart(2,'0'),tipo:'TD'});});

const cuantas=h=>(String(h).match(/_r5Detalle\(/g)||[]).length;

console.log('\n== Búsqueda por palabras, sin importar el orden ==');
const p=n=>DB.personal.find(x=>x.id===n);
const con=(q,id)=>{_r5SetBuscar(q);return _r5Coincide(p(id));};
es('"alcoser" encuentra a ALCOSER',con('alcoser',2),true);
es('"rossy alcoser" también (orden invertido)',con('rossy alcoser',2),true);
es('"ALCOSER ROSSY" en mayúsculas',con('ALCOSER ROSSY',2),true);
es('busca por DNI',con('73748710',2),true);
es('por parte del DNI',con('7374',2),true);
es('por cargo',con('volquete',1),true);
es('y no trae a quien no corresponde',con('volquete',2),false);
es('"jose maria" halla a JOSÉ MARÍA (sin tildes)',con('jose maria',5),true);
es('"ñahui" con eñe',con('ñahui',5),true);
es('"nahui" sin eñe también',con('nahui',5),true);
es('texto que no está',con('zzzz',1),false);

console.log('\n== Escribir no rompe la búsqueda ==');
// Se escribe letra por letra, como en el teclado
_r5SetBuscar('');
'alcantara'.split('').forEach((_,i)=>_r5SetBuscar('alcantara'.slice(0,i+1)));
es('al final queda el texto completo',_getBuscar(),'alcantara');
es('y encuentra a la persona',_r5Coincide(p(1)),true);
_r5SetBuscar('');
es('borrar deja pasar a todos',['1','2','3','4','5'].every(i=>_r5Coincide(p(+i))),true);

console.log('\n== Solo se repinta la tabla, no la caja de texto ==');
_setAfectos(false);
rRenta5ta();
const htmlPantalla=nodos.r5Body.innerHTML;
es('la pantalla trae la caja de búsqueda',/id="r5Buscar"/.test(htmlPantalla),true);
es('y el contenedor de la tabla',/id="r5Tabla"/.test(htmlPantalla),true);
nodos.r5Body.innerHTML='<centinela>';     // si se repintara la pantalla, esto se pierde
nodos.r5Tabla.innerHTML='';
_r5SetBuscar('volquete');
es('buscar NO tocó la pantalla',nodos.r5Body.innerHTML,'<centinela>');
es('pero sí llenó la tabla',nodos.r5Tabla.innerHTML.length>0,true);
es('la caja de texto sigue siendo la misma',/id="r5Buscar"/.test(nodos.r5Tabla.innerHTML),false);

console.log('\n== La tabla muestra lo que corresponde ==');
_setAfectos(false);
_r5SetBuscar('');
es('sin filtro: los 5 activos',cuantas(_r5Tabla()),5);
_r5SetBuscar('volquete');
es('"volquete": 2 activos (el inactivo queda fuera)',cuantas(_r5Tabla()),2);
_r5SetBuscar('rodriguez');
es('"rodriguez": 1',cuantas(_r5Tabla()),1);
_r5SetBuscar('zzz');
es('sin coincidencias: ninguna fila',cuantas(_r5Tabla()),0);
es('y lo dice con el texto buscado',/Ningún trabajador coincide con <strong>zzz/.test(_r5Tabla()),true);

console.log('\n== El conteo junto al título ==');
_r5SetBuscar('volquete');
es('dice cuántos de cuántos',_r5BuscarNota().replace(/<[^>]+>/g,''),'2 de 5 · ');
es('y aparece en la tabla',/2<\/b> de 5/.test(_r5Tabla()),true);
_r5SetBuscar('');
es('sin búsqueda no molesta',_r5BuscarNota(),'');

console.log('\n== Con "solo afectos" puesto ==');
_setAfectos(true);
_r5SetBuscar('');
const nAfectos=cuantas(_r5Tabla());
es('hay afectos que mostrar',nAfectos>0,true);
_r5SetBuscar('ñahui');
es('el de sueldo bajo no es afecto: no sale',cuantas(_r5Tabla()),0);
es('y se sugiere destildar «Solo afectos»',/Solo afectos/.test(_r5Tabla()),true);

console.log('\n== El botón de limpiar ==');
_r5SetBuscar('rodriguez');
nodos.r5Buscar.value='rodriguez';
_r5LimpiarBuscar();
es('vacía el estado',_getBuscar(),'');
es('vacía la caja',nodos.r5Buscar.value,'');
es('y le devuelve el foco',nodos.r5Buscar.focos>0,true);

console.log('\n== Cambiar de mes conserva lo escrito ==');
_setAfectos(false);
_r5SetBuscar('alcoser');
_r5Set('mes',8);
es('el texto sobrevive',_getBuscar(),'alcoser');
es('y la caja se repinta con él',/value="alcoser"/.test(nodos.r5Body.innerHTML),true);
_r5Set('mes',7);

console.log('\n== El Excel saca lo que se está viendo ==');
let sacado=null;
global.XLSX={utils:{aoa_to_sheet:a=>{sacado=a;return{};},encode_cell:()=>'A1',book_new:()=>({}),book_append_sheet:()=>{},encode_range:()=>'A1:A1'},writeFile:()=>{}};
_r5SetBuscar('volquete');
_r5Excel();
es('exporta solo los filtrados',sacado.filter(f=>typeof f[0]==='number').length,2);
es('y el título avisa que está filtrado',/filtrado: "volquete"/.test(sacado[0][0]),true);
_r5SetBuscar('');
_r5Excel();
es('sin filtro exporta a todos',sacado.filter(f=>typeof f[0]==='number').length,5);
es('y el título no menciona filtro',/filtrado/.test(sacado[0][0]),false);
_r5SetBuscar('zzz');
_r5Excel();
es('si no queda nadie, avisa en vez de bajar un archivo vacío',/no deja nada/.test(global._t||''),true);

console.log('\n'+(mal?'X '+mal+' fallo(s)':'OK todo bien')+'  ·  '+ok+'/'+(ok+mal));
process.exit(mal?1:0);
