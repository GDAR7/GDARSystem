// Cost Control · EDP: el Excel se lee y se muestra; se reconoce la columna del
// equipo y qué filas existen en el Máster. Todavía no escribe nada en la base.
const fs=require('fs'),path=require('path'),vm=require('vm');
const R=path.join(__dirname,'..')+'/';
let ok=0,mal=0;
const es=(l,g,e)=>{const b=JSON.stringify(g)===JSON.stringify(e);b?ok++:mal++;
  console.log((b?'  OK  ':'  MAL ')+l.padEnd(62)+'= '+JSON.stringify(g)+(b?'':'  (esperado '+JSON.stringify(e)+')'));};
const SRC=fs.readFileSync(R+'js/edpHoras.js','utf8');
const HTML=fs.readFileSync(R+'index.html','utf8'),CFG=fs.readFileSync(R+'js/config.js','utf8'),UT=fs.readFileSync(R+'js/utils.js','utf8');
const ctx={console,Date,Math,JSON,toast:()=>{},
  DB:{equipos:[{id:1,codigo:'VOL_ECOP-001',placa:'ABC-123'},{id:2,codigo:'EXC_ECOP-010',placa:''}]}};
vm.createContext(ctx);vm.runInContext(SRC,ctx);
const ev=s=>vm.runInContext(s,ctx);

console.log('\n== Reconocer equipos ==');
ctx.__ix=ev('_edhIndice()');
const eq=v=>{ctx.__v=v;const e=ev('_edhEquipo(__v,__ix)');return e?e.codigo:null;};
es('código completo',eq('VOL_ECOP-001'),'VOL_ECOP-001');
es('código sin prefijo y con espacios',eq(' ecop 010 '),'EXC_ECOP-010');
es('por placa',eq('ABC123'),'VOL_ECOP-001');
es('no existe',eq('ECOP-999'),null);
es('vacío o muy corto no cuenta',[eq(''),eq('A1')],[null,null]);

console.log('\n== Analizar una hoja ==');
ctx.__f=[
  ['EDP NOVIEMBRE','',''],
  [],
  ['ITEM','EQUIPO','HORAS','TARIFA'],
  [1,'ECOP-001',220.5,180],
  [2,'ECOP-010',198,250],
  [3,'ECOP-777',100,90],
  ['','','',''],
  [4,'',5,0]
];
const A=ev('_edhAnalizar(__f,-1)');
es('encabezado en la 3ra fila',A.h,2);
es('columnas',Array.from(A.enc),['ITEM','EQUIPO','HORAS','TARIFA']);
es('filas con datos (sin la vacía)',A.datos.length,4);
es('columna del equipo automática',A.col,1);
es('encontrados / faltan',[A.ok,A.falta],[2,1]);
es('lista de no encontrados',Array.from(A.noEnc),['ECOP-777']);
es('columna forzada',ev('_edhAnalizar(__f,3)').col,3);

console.log('\n== Conexión ==');
es('menú Cost Control tiene «EDP»',/key:'edpHoras',label:'EDP'/.test(CFG),true);
es('render registrado',/edpHoras:rEdpHoras/.test(UT),true);
es('página en index',/id="page-edpHoras"/.test(HTML),true);
es('script cargado',/js\/edpHoras\.js\?v=\d+/.test(HTML),true);
es('no escribe en la base (sin sb.from)',/sb\s*\.\s*from|\.upsert\(|\.insert\(/.test(SRC),false);

console.log(`\n${mal?'✗ '+mal+' FALLAS':'OK todo bien'}  ·  ${ok}/${ok+mal}`);
process.exitCode=mal?1:0;
