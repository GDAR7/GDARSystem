const fs=require('fs');
const R='c:/Users/LENOVO/OneDrive/Documents/GitHub/GDARSystem/';
global.localStorage={getItem:()=>null,setItem:()=>{}};
const nodos={arPanel:{id:'arPanel',innerHTML:'',style:{}}};
global.document={getElementById:id=>nodos[id]||null};
let avisos=[];
global.toast=(m,e)=>{avisos.push(String(m));};
global.confirm=()=>true;
let q=0;global.nidSeguro=()=>++q;
let fallaSupa=false;
global.supaUpsert=async()=>fallaSupa?{message:'relation "atencion_recursos" does not exist'}:null;
global.supaDelete=async()=>null;
global.DB={atencionRecursos:[],ventaPersonal:[],tarifasEq:[],equipos:[]};
global._ccMatchHH=()=>null;
global.hhVentaPeriodo=()=>({filas:[],sinTarifa:[],total:0,nDias:30});
global._edpDesde='2026-07-21';global._edpHasta='2026-08-20';

const src=fs.readFileSync(R+'js/atencionRecursos.js','utf8')
 +'\n;global._arGuardarCampo=_arGuardarCampo;global._arBorrar=_arBorrar;global._arRender=_arRender;'
 +'global._arListaCalc=_arListaCalc;global._arLista=_arLista;global._AR_DEF=_AR_DEF;'
 +'global.arCalcular=arCalcular;global._arMaterializar=_arMaterializar;';
eval(src);

let ok=0,mal=0;
const es=(l,g,e)=>{const b=String(g)===String(e);b?ok++:mal++;
  console.log((b?'  OK  ':'  MAL ')+l.padEnd(58)+'= '+g+(b?'':'  (esperado '+e+')'));};

console.log('\n== Con la tabla vacía, el panel ya muestra los cinco ==');
es('la base está vacía',_arLista().length,0);
es('pero el cálculo trae 5',_arListaCalc().length,5);
_arRender();
const h=nodos.arPanel.innerHTML;
es('el panel pinta 5 filas',(h.match(/_arGuardarCampo\(-?\d+,'participacion'/g)||[]).length,5);
es('  y no sale vacío',/Sin recursos/.test(h),false);
es('avisa que aún no está guardada',/sin guardar/.test(h),true);
es('con un botón para guardarla ya',/Guardar lista base/.test(h),true);

console.log('\n== Editar la participación la guarda sola ==');
(async()=>{
  const mec=_arListaCalc().find(r=>r.nombre==='Mecánico');
  es('su id es negativo (no está en la base)',mec.id<0,true);
  await _arGuardarCampo(mec.id,'participacion','50');
  es('ahora hay 5 en la base',_arLista().length,5);
  const g=_arLista().find(r=>r.nombre==='Mecánico');
  es('el mecánico quedó al 50 %',g.participacion,0.5);
  es('  con id de verdad',g.id>0,true);
  es('los otros se guardaron con su valor',
     _arLista().find(r=>r.nombre==='Jefe de Equipos').participacion,0.10);
  es('se avisa que se guardó',avisos.some(m=>/Lista de recursos guardada/.test(m)),true);

  console.log('\n== Y desde ahí se edita normal ==');
  await _arGuardarCampo(g.id,'participacion','80');
  es('80 %',_arLista().find(r=>r.nombre==='Mecánico').participacion,0.8);
  es('sigue habiendo 5',_arLista().length,5);
  _arRender();
  es('el aviso desaparece',/sin guardar/.test(nodos.arPanel.innerHTML),false);

  console.log('\n== El cuadro impreso refleja el cambio ==');
  const per={desde:'2026-07-21',hasta:'2026-08-20',dias:31};
  DB.ventaPersonal=[{cargo:'MECANICO',tarifaMes:14608.20}];
  const C=arCalcular([{horas:2.5,nMec:2,nAyu:1}],per);
  const fm=C.filas.find(f=>f.nombre==='Mecánico');
  es('la participación llega al cálculo',fm.participacion,0.8);

  console.log('\n== Si la tabla no existe en Supabase, se avisa ==');
  DB.atencionRecursos=[];avisos=[];fallaSupa=true;
  const m2=_arListaCalc().find(r=>r.nombre==='Mecánico');
  await _arGuardarCampo(m2.id,'participacion','50');
  es('no se guarda nada a medias',_arLista().length,0);
  es('y se explica por qué',avisos.some(m=>/atencion_recursos/.test(m)),true);
  fallaSupa=false;

  console.log('\n== Borrar uno de la lista base ==');
  DB.atencionRecursos=[];
  const des=_arListaCalc().find(r=>r.nombre==='Desg. de H. Manuales');
  await _arBorrar(des.id);
  es('quedan 4 guardados',_arLista().length,4);
  es('  y el borrado no está',_arLista().some(r=>r.nombre==='Desg. de H. Manuales'),false);
  es('los otros sí',_arLista().length,4);

  console.log('\n== Un id inventado no rompe nada ==');
  avisos=[];
  await _arGuardarCampo(-99,'participacion','50');
  es('no se cae',true,true);
  es('  y lo dice',avisos.some(m=>/No se encontró/.test(m)),true);

  console.log('\n'+(mal?'X '+mal+' fallo(s)':'OK todo bien')+'  ·  '+ok+'/'+(ok+mal));
  process.exit(mal?1:0);
})();
