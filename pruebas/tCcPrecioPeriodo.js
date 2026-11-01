// Cost Control · precio de combustible POR PERÍODO, grabado en Supabase.
// Lo que importa: que cada período (y cada mes de la matriz Anual) use su
// precio, que sin precio propio arrastre el último anterior, que solo el
// administrador grabe, y que sin la tabla todo siga como antes.
const fs=require('fs'),vm=require('vm');
const R='c:/Users/LENOVO/OneDrive/Documents/GitHub/GDARSystem/';
let ok=0,mal=0;
const es=(l,g,e)=>{const b=String(g)===String(e);b?ok++:mal++;
  console.log((b?'  OK  ':'  MAL ')+l.padEnd(64)+'= '+g+(b?'':'  (esperado '+e+')'));};

const DB={tarifasEq:[],ventaPersonal:[],edpProveedores:[],
  equipos:[{id:1,codigo:'VOL-01',marca:'VOLVO',modelo:'FMX',sub:'Volquete',tipo:'Línea Blanca',proveedor:'X',tarifa:80,tarifaUn:'HM',proyecto:'P'}],
  partes:[{id:1,eqId:1,fecha:'2026-07-05',ef:10},{id:2,eqId:1,fecha:'2026-09-05',ef:10},
          {id:3,eqId:1,fecha:'2026-10-05',ef:10},{id:4,eqId:1,fecha:'2026-11-05',ef:10}],
  // 100 gal por período, despachados a S/ 15 (precio real)
  combustible:['2026-07-05','2026-09-05','2026-10-05','2026-11-05'].map(f=>({eqId:1,fecha:f,gal:100,precio:15,tipoMov:'Salida'}))
};

// Supabase simulado: tabla en memoria + registro de lo que se pidió
let tabla=[{periodo:'2026-09-20',precio:16,actualizado_por:'Abel',actualizado_en:'2026-09-21T10:00:00Z'},
           {periodo:'2026-11-20',precio:18.5,actualizado_por:'Abel',actualizado_en:'2026-11-01T10:00:00Z'}];
let faltaTabla=false, rlsBloquea=false, pedidos=[];
const supa={from:()=>{
  const q={_op:'select',_fila:null,_eq:null,
    select(){return q;},
    upsert(f){q._op='upsert';q._fila=f;return q;},
    delete(){q._op='delete';return q;},
    eq(c,v){q._eq=v;return q;},
    then(res,rej){
      pedidos.push(q._op);
      if(faltaTabla)return Promise.resolve({data:null,error:{code:'PGRST205',message:'no existe'}}).then(res,rej);
      if(q._op==='select')return Promise.resolve({data:tabla.slice(),error:null}).then(res,rej);
      if(rlsBloquea)return Promise.resolve({data:[],error:null}).then(res,rej);
      if(q._op==='upsert'){tabla=tabla.filter(t=>t.periodo!==q._fila.periodo);tabla.push(q._fila);
        return Promise.resolve({data:[q._fila],error:null}).then(res,rej);}
      const quit=tabla.filter(t=>t.periodo===q._eq);tabla=tabla.filter(t=>t.periodo!==q._eq);
      return Promise.resolve({data:quit,error:null}).then(res,rej);
    }};
  return q;}};

const nodos={},avisos=[];let confirma=true;
const nodo=id=>nodos[id]||(nodos[id]={id,innerHTML:'',style:{},value:''});
const ctx=vm.createContext({DB,console:{log(){},warn(){}},Date,Math,Number,String,Object,Array,JSON,isNaN,parseFloat,parseInt,Set,Map,Promise,
  localStorage:{getItem:k=>k==='ccPrecioComb'?'20':k==='ccPrecioManual'?'1':null,setItem(){},removeItem(){}},
  document:{getElementById:id=>id==='ccpcOverlay'?(nodos.ccpcOverlay||null):nodo(id),addEventListener(){},removeEventListener(){},
    querySelectorAll:()=>[],querySelector:()=>({id:'page-costControl'}),activeElement:null,
    createElement:()=>({style:{},remove(){delete nodos.ccpcOverlay;}}),body:{appendChild:o=>{o.id='ccpcOverlay';nodos.ccpcOverlay=o;}}},
  toast:(m,e)=>avisos.push((e?'✗ ':'')+m),confirm:()=>confirma,
  setTimeout:()=>0,clearTimeout(){},window:{location:{href:'x'}},
  hhVentaPeriodo:()=>({filas:[]}),CU:{codigo:'OTRO',nombre:'Operador'}});
['js/costcontrol.js','js/ccPrecioComb.js','js/costcontrolAnual.js','js/costcontrolExport.js'].forEach(f=>
  vm.runInContext(fs.readFileSync(R+f,'utf8'),ctx,{filename:f}));
const ev=x=>vm.runInContext(x,ctx);
const per=(d,h)=>`({desde:'${d}',hasta:'${h}',label:'x',dias:30})`;
const comb=(d,h)=>ev(`_ccCalcEq(${per(d,h)},'seca')`);
const espera=()=>new Promise(r=>setImmediate(r));

(async()=>{
console.log('\n== Sin la tabla (SQL aún sin correr): todo como antes ==');
es('precio manual: el único del navegador (S/ 20)',comb('2026-09-21','2026-10-20').precioComb,20);
ctx.supa=supa;faltaTabla=true;
await ev('_ccpcCargar(true)');
es('si la tabla no existe lo dice',ev('_ccpcErr'),'falta la tabla');
es('  y sigue usando el del navegador',comb('2026-09-21','2026-10-20').precioComb,20);
ev('_ccOffset=0;_ccPeriodo=()=>'+per('2026-09-21','2026-10-20'));
ev('rCostControl()');
es('  la casilla sigue guardando en el navegador',/onchange="_ccSetPrecioComb\(this\.value\)"/.test(nodo('page-costControl').innerHTML),true);

console.log('\n== Con la tabla ==');
faltaTabla=false;
await ev('_ccpcCargar(true)');
es('carga los precios grabados',Object.keys(ev('_ccpcPrecios')).sort().join(','),'2026-09-20,2026-11-20');
let C=comb('2026-08-21','2026-09-20');
es('Septiembre: su precio grabado (16)',C.precioComb+' '+C.precioFuente,'16 grabado');
es('  costo comb. = 100 gal × 16',C.totalCombEq,1600);
C=comb('2026-09-21','2026-10-20');
es('Octubre sin precio: arrastra el de Septiembre',C.precioComb+' '+C.precioFuente+' '+C.precioDe,'16 anterior 2026-09-20');
C=comb('2026-10-21','2026-11-20');
es('Noviembre: el suyo (18.5)',C.precioComb,18.5);
C=comb('2026-06-21','2026-07-20');
es('Julio (nada grabado antes): promedio real de despachos (15)',C.precioComb+' '+C.precioFuente,'15 real');
es('el del navegador ya no se usa',C.precioComb!==20,true);

console.log('\n== Matriz Anual: cada mes con su precio ==');
ev('_ccaCache=null');
const A=ev(`_ccaCalcular(2026,'seca')`);
const fila=A.grupos[0].equipos[0].meses;
es('JUL 15 · SET 16 · OCT 16 · NOV 18.5',[6,8,9,10].map(i=>fila[i].comb/100).join(' · '),'15 · 16 · 16 · 18.5');
es('el caché se invalida al cambiar un precio',ev(`_ccaClave(2026,'seca')`).includes(String(ev('_ccpcVer'))),true);

console.log('\n== Pantalla ==');
ev('rCostControl()');let H=nodo('page-costControl').innerHTML;
es('usuario común: la casilla del precio queda bloqueada',/id="ccPrecioComb"[^>]*disabled/.test(H),true);
es('se ve de dónde sale el precio (↩ Septiembre 2026)',/↩ Septiembre 2026/.test(H),true);
es('el aviso dice el período y el origen',/de x <span[^>]*>\(sin precio propio · usa el de Septiembre 2026\)/.test(H)||/sin precio propio · usa el de Septiembre 2026/.test(H),true);
es('botón 📅 para la lista por período',/onclick="_ccpcAbrir\(\)"/.test(H),true);
ctx.CU={codigo:'EIBEL25',nombre:'Abel Rodríguez'};
ev('rCostControl()');H=nodo('page-costControl').innerHTML;
es('administrador: la casilla graba el precio de ESTE período',/onchange="_ccpcGuardar\('2026-10-20',this\.value\)"/.test(H)&&!/id="ccPrecioComb"[^>]*disabled/.test(H),true);

console.log('\n== Grabar ==');
ctx.CU={codigo:'OTRO'};avisos.length=0;
await ev(`_ccpcGuardar('2026-10-20','17')`);
es('un usuario común no graba',avisos.join(),'✗ Solo el administrador graba el precio del combustible');
ctx.CU={codigo:'EIBEL25',nombre:'Abel Rodríguez'};avisos.length=0;
await ev(`_ccpcGuardar('2026-10-20','17.2')`);
es('administrador graba Octubre',tabla.find(t=>t.periodo==='2026-10-20').precio,17.2);
es('  con su nombre',tabla.find(t=>t.periodo==='2026-10-20').actualizado_por,'Abel Rodríguez');
es('  Octubre ahora usa 17.2',comb('2026-09-21','2026-10-20').precioComb,17.2);
es('  y lo confirma',avisos.join(),'✓ Octubre 2026: S/ 17.20/gal grabado');
const v0=ev('_ccpcVer');
await ev(`_ccpcGuardar('2026-10-20','0')`);
es('borrar el número quita el precio (con confirmación)',!!tabla.find(t=>t.periodo==='2026-10-20'),false);
es('  y vuelve a arrastrar Septiembre',comb('2026-09-21','2026-10-20').precioComb,16);
es('  la matriz Anual se recalcula',ev('_ccpcVer')>v0,true);
rlsBloquea=true;avisos.length=0;
await ev(`_ccpcGuardar('2026-10-20','19')`);
es('si la base no lo acepta, avisa y no lo da por grabado',/✗ No se pudo grabar/.test(avisos.join())&&comb('2026-09-21','2026-10-20').precioComb===16,true);
rlsBloquea=false;
pedidos.length=0;await ev(`_ccpcGuardar('2026-09-20','16')`);
es('el mismo precio no vuelve a grabarse',pedidos.length,0);
await ev(`_ccpcGuardar('2026-09-20','2000')`);
es('precio absurdo: rechazado',tabla.find(t=>t.periodo==='2026-09-20').precio,16);

console.log('\n== Lista por período (📅) ==');
ev('_ccpcAbrir()');
const L=nodos.ccpcOverlay.innerHTML;
es('muestra los 12 períodos del año',(L.match(/onchange="_ccpcGuardar\('2026-\d\d-20',this\.value\)"/g)||[]).length,12);
es('marca el período en pantalla',/Octubre 2026 <span[^>]*>◀ en pantalla/.test(L),true);
es('dice quién lo grabó',/grabado<\/span> · Abel/.test(L),true);
es('explica el arrastre',/usa S\/ 16\.00 de Septiembre 2026/.test(L),true);
ev('_ccpcCerrar()');es('se cierra',!!nodos.ccpcOverlay,false);
ctx.CU={codigo:'OTRO'};ev('_ccpcAbrir()');
es('usuario común: la lista es solo lectura',/_ccpcGuardar/.test(nodos.ccpcOverlay.innerHTML),false);
ev('_ccpcCerrar()');

console.log('\n== Exportes ==');
ev('_ccTabActiva="equipos";_ccTarifaModo="seca"');
es('el Excel/PDF dice de dónde salió el precio',/precio manual S\/ 16\.00\/gal \(sin precio propio · usa el de Septiembre 2026\)/.test(ev('_ccxContexto(_ccxDatos())')),true);

console.log('\n'+(mal?'✗ '+mal+' FALLAS':'OK todo bien')+'  ·  '+ok+'/'+(ok+mal));
process.exit(mal?1:0);
})().catch(e=>{console.error(e);process.exit(1);});
