// Configuración · Historial Máster (visor de sql/historial_master.sql).
// Lo que importa: que solo EIBEL25 vea la página y los datos, que cada cambio
// diga quién, cuándo y qué campo pasó de qué a qué, y que los filtros y el
// Excel muestren lo mismo que la pantalla.
const fs=require('fs'),vm=require('vm');
const R='c:/Users/LENOVO/OneDrive/Documents/GitHub/GDARSystem/';
let ok=0,mal=0;
const es=(l,g,e)=>{const b=String(g)===String(e);b?ok++:mal++;
  console.log((b?'  OK  ':'  MAL ')+l.padEnd(64)+'= '+g+(b?'':'  (esperado '+e+')'));};

const filas=[
  {id:3,en:'2026-11-03T15:20:00Z',tabla:'equipos',registro:'12',etiqueta:'VOL ECOP-004',accion:'editar',codigo:'FRA_AB',nombre:'Franklin Abarca',
   cambios:{tarifa:{antes:80,despues:95},proveedor:{antes:'X SAC',despues:'Y SAC'},
     documentos:{antes:[{nombre:'soat.pdf'}],despues:[{nombre:'soat.pdf'},{nombre:'poliza.pdf'}]}}},
  {id:2,en:'2026-11-02T10:00:00Z',tabla:'equipos',registro:'80',etiqueta:'EXC ECOP-009',accion:'crear',codigo:'FRA_AB',nombre:'Franklin Abarca',
   cambios:{id:80,codigo:'EXC ECOP-009',nombre:'Excavadora',tipo:'Línea Amarilla',sub:'Excavadora',proveedor:'Z SAC',tarifa:120,hr:0}},
  {id:1,en:'2026-10-30T09:00:00Z',tabla:'subtipos_equipo',registro:'7',etiqueta:'Rodillo',accion:'eliminar',codigo:'EIBEL25',nombre:'Abel Rodríguez A.',
   cambios:{id:7,nombre:'Rodillo'}}
];
let pedidos=[], faltaTabla=false;
const supa={from:t=>{pedidos.push(t);const q={select(){return q;},order(){return q;},limit(){return q;},
  then(res,rej){return Promise.resolve(faltaTabla?{data:null,error:{code:'PGRST205'}}:{data:filas,error:null}).then(res,rej);}};return q;}};

const pag={innerHTML:''}, tabla={innerHTML:''};
const ctx=vm.createContext({console:{log(){},warn(){}},Date,Math,Number,String,Object,Array,JSON,Map,Set,Promise,isFinite,
  supa,toast:()=>{},CU:{codigo:'FRA_AB'},window:{},
  document:{getElementById:id=>id==='page-historialMaster'?pag:id==='hmTabla'?tabla:null}});
vm.runInContext(fs.readFileSync(R+'js/historialMaster.js','utf8'),ctx);
const ev=x=>vm.runInContext(x,ctx);
const espera=()=>new Promise(r=>setImmediate(r));
const limpiar=()=>ev(`_hmF={quien:'',accion:'',desde:'',hasta:'',q:''}`);

(async()=>{
console.log('\n== Solo EIBEL25 ==');
ev('rHistorialMaster()');await espera();
es('otro usuario: la página dice que es solo del administrador',/solo para el administrador/.test(pag.innerHTML),true);
es('  no ve ningún cambio',/hmTabla/.test(pag.innerHTML),false);
es('  ni se pide nada a la base',pedidos.length,0);

console.log('\n== Detalle de cada cambio ==');
const det=r=>ev('_hmDetalle')(r);
const d0=det(filas[0]);
es('editar: campo antes → después',d0[0],'Tarifa: 80 → 95');
es('  con el nombre del campo de la ficha',d0[1],'Proveedor: X SAC → Y SAC');
es('  documentos: qué se agregó',d0[2],'Documentos: agregó poliza.pdf');
es('crear: lo que identifica al equipo',det(filas[1]).join(' | '),'Código: EXC ECOP-009 | Nombre: Excavadora | Tipo: Línea Amarilla | Subtipo: Excavadora | Proveedor: Z SAC | Tarifa: 120');
es('eliminar subtipo',ev('_hmQue')(filas[2])+' · '+det(filas[2]),'Subtipo Rodillo · Subtipo: Rodillo');
es('quién: nombre y código',ev('_hmQuien')(filas[0]),'Franklin Abarca · FRA_AB');

console.log('\n== Página del administrador ==');
ctx.CU={codigo:'EIBEL25'};
ev('rHistorialMaster()');await espera();await espera();
es('lee la tabla del historial',pedidos.join(),'historial_master');
es('título de Configuración',/🕵️ Historial Máster/.test(pag.innerHTML),true);
let T=tabla.innerHTML;
es('muestra los 3 cambios',/3 de 3 cambios/.test(T),true);
es('acciones con color',/>Editó</.test(T)&&/>Creó</.test(T)&&/>Eliminó</.test(T),true);
ev(`_hmFiltro('quien','FRA_AB')`);
es('filtro persona = Franklin',/2 de 3/.test(tabla.innerHTML),true);
ev(`_hmFiltro('accion','crear')`);
es('  + acción = Creó',/1 de 3/.test(tabla.innerHTML),true);
limpiar();ev(`_hmFiltro('q','tarifa 95')`);
es('buscar "tarifa 95" encuentra la edición',ev('_hmFiltradas()').length,1);
limpiar();ev(`_hmFiltro('desde','2026-11-01')`);
es('filtro desde 01/11',ev('_hmFiltradas()').length,2);
limpiar();

console.log('\n== Sin el SQL ejecutado ==');
faltaTabla=true;ev('rHistorialMaster()');await espera();await espera();
es('avisa que falta sql/historial_master.sql',/Falta ejecutar <b>sql\/historial_master.sql<\/b>/.test(pag.innerHTML),true);

console.log('\n== SQL ==');
const S=fs.readFileSync(R+'sql/historial_master.sql','utf8');
es('solo las 2 tablas del Máster',(S.match(/after insert or update or delete on public\.(\w+)/g)||[]).map(x=>x.split('.').pop()).join(','),'equipos,subtipos_equipo');
es('solo EIBEL25 lee',/for select to authenticated\s+using \(\(auth\.jwt\(\) -> 'user_metadata' ->> 'codigo'\) = 'EIBEL25'\)/.test(S),true);
es('nadie lo edita ni lo borra desde el sistema',/revoke insert, update, delete on public\.historial_master from anon, authenticated/.test(S)&&!/create policy \w+ on public\.historial_master\s+for (insert|update|delete)/.test(S),true);
es('editar anota solo lo que cambió',/is distinct from/.test(S)&&/if dif <> '\{\}'::jsonb then/.test(S),true);

console.log('\n== Conexión ==');
const H=fs.readFileSync(R+'index.html','utf8'), U=fs.readFileSync(R+'js/utils.js','utf8');
es('página en index.html',/id="page-historialMaster"/.test(H)&&/js\/historialMaster\.js\?v=\d+/.test(H),true);
es('ruta en utils.js',/historialMaster:rHistorialMaster/.test(U),true);
es('el Máster no tiene botón de historial',/_hmBoton/.test(fs.readFileSync(R+'js/masterResumen.js','utf8')),false);

console.log('\n'+(mal?'✗ '+mal+' FALLAS':'OK todo bien')+'  ·  '+ok+'/'+(ok+mal));
process.exit(mal?1:0);
})().catch(e=>{console.error(e);process.exit(1);});
