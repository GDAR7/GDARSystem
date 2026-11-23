// Reembolsables B.S. · selección múltiple y eliminación en lote
const fs=require('fs'),path=require('path'),vm=require('vm');
const R=path.join(__dirname,'..')+'/';
let ok=0,mal=0;
const es=(l,g,e)=>{const b=JSON.stringify(g)===JSON.stringify(e);b?ok++:mal++;
  console.log((b?'  OK  ':'  MAL ')+l.padEnd(58)+'= '+JSON.stringify(g)+(b?'':'  (esperado '+JSON.stringify(e)+')'));};
const SRC=fs.readFileSync(R+'js/reembolsables_otros.js','utf8');
const CFG=fs.readFileSync(R+'js/config.js','utf8');

const pg={innerHTML:''};
let confirmar=true,borradoBD=null,borradoPdf=null,falla=null;
const U=p=>'https://x/storage/v1/object/public/Reembolsables_BS_pdf/'+p;
const ctx={console,Math,JSON,Object,Array,String,Number,Set,Date,
  toast:()=>{},confirm:()=>confirmar,buscarFoco:()=>{},
  document:{getElementById:id=>id==='page-viaticos'?pg:null,querySelector:()=>null,querySelectorAll:()=>[]},
  SUPA_TABLES:{viaticos:'reembolsables_bbss'},
  supa:{from:t=>({delete:()=>({in:(c,ids)=>({select:async()=>{borradoBD={t,ids:[...ids]};
          return falla?{data:null,error:{message:falla}}:{data:ids.filter(i=>i!==99).map(id=>({id})),error:null};}})})}),
        storage:{from:()=>({remove:async p=>{borradoPdf=p;}})}},
  DB:{viaticos:[
    {id:1,fecha:'2026-11-01',proveedor:'A',importe:100,pdfUrl:U('f1.pdf')},
    {id:2,fecha:'2026-11-02',proveedor:'A',importe:50,pdfUrl:U('f1.pdf')},
    {id:3,fecha:'2026-11-03',proveedor:'B',importe:25,pdfUrl:U('f3.pdf')},
    {id:4,fecha:'2026-11-04',proveedor:'B',importe:10}]}};
vm.createContext(ctx);vm.runInContext(SRC,ctx);
const ev=s=>vm.runInContext(s,ctx);

ev('rViaticos()');
es('cada fila tiene su casilla',(pg.innerHTML.match(/class="viaChk"/g)||[]).length,4);
es('casilla "todos" en el encabezado',/id="viaChkTodos"/.test(pg.innerHTML),true);
es('botón Eliminar oculto sin selección',/id="viaBtnDelSel"[^>]*display:none/.test(pg.innerHTML),true);
ev('_viaSelToggle(1,true);_viaSelToggle(3,true);rViaticos()');
es('con 2 marcadas: botón visible con (2)',[/id="viaBtnDelSel"[^>]*display:;/.test(pg.innerHTML),/id="viaNSel">2</.test(pg.innerHTML)],[true,true]);
ev('_viaFiltProv="B";rViaticos()');
es('filtro oculta la fila 1: se desmarca',ev('[..._viaSel]'),[3]);
ev('_viaFiltProv="";_viaSelTodos(true)');
es('marcar todos: las 4 visibles',ev('[..._viaSel].sort()'),[1,2,3,4]);
ev('_viaSelTodos(false)');
es('desmarcar todos',ev('_viaSel.size'),0);

(async()=>{
  ev('_viaSelToggle(1,true);_viaSelToggle(3,true)');
  confirmar=false;await ev('_viaDelSel()');
  es('si cancela, no borra nada',[borradoBD,ctx.DB.viaticos.length],[null,4]);
  confirmar=true;await ev('_viaDelSel()');
  es('borra en una sola consulta',borradoBD,{t:'reembolsables_bbss',ids:[1,3]});
  es('  quedan 2 y 4',ctx.DB.viaticos.map(r=>r.id),[2,4]);
  es('  PDF f1 lo usa el 2: se conserva; f3 se borra',borradoPdf,['f3.pdf']);
  es('  la selección se limpia',ev('_viaSel.size'),0);
  ctx.DB.viaticos.push({id:99,fecha:'2026-11-05',importe:1});
  borradoPdf=null;ev('_viaSelToggle(4,true);_viaSelToggle(99,true)');
  await ev('_viaDelSel()');
  es('si la BD no borra uno, sigue en la lista',ctx.DB.viaticos.map(r=>r.id),[2,99]);
  falla='permiso';ev('_viaSelToggle(2,true)');await ev('_viaDelSel()');
  es('error de BD: no quita nada de la pantalla',ctx.DB.viaticos.map(r=>r.id),[2,99]);
  es('la tabla viaticos existe en config',/viaticos:\s*'reembolsables_bbss'/.test(CFG),true);

  console.log('\n== 48 horas ==');
  falla=null;borradoBD=null;
  const hace=h=>new Date(Date.now()-h*3600000).toISOString();
  ctx.DB.viaticos=[{id:10,fecha:'2026-11-01',importe:1,creadoEn:hace(5)},
                   {id:11,fecha:'2026-11-01',importe:1,creadoEn:hace(49)},
                   {id:12,fecha:'2026-11-01',importe:1}];
  ctx._viaFiltProv='';ev('_viaFiltProv=""');ev('rViaticos()');
  es('registrado hace 5 h: tiene casilla y 🗑',/data-via-id="10"[\s\S]*?class="viaChk"[\s\S]*?_viaDel\(10\)/.test(pg.innerHTML),true);
  es('hace 49 h: 🔒 sin casilla ni 🗑',[/_viaSelToggle\(11/.test(pg.innerHTML),/_viaDel\(11\)/.test(pg.innerHTML),/hace 49 horas/.test(pg.innerHTML)],[false,false,true]);
  es('sin hora de registro (nuevo / sin SQL): se puede',/_viaDel\(12\)/.test(pg.innerHTML),true);
  ev('_viaSelTodos(true)');
  es('marcar todos salta el bloqueado',ev('[..._viaSel].sort()'),[10,12]);
  ev('_viaSelToggle(11,true)');
  es('no se puede marcar a mano el bloqueado',ev('_viaSel.has(11)'),false);
  await ev('_viaDel(11)');
  es('🗑 directo del bloqueado: no borra',ctx.DB.viaticos.length,3);
  ctx.CU={codigo:'EIBEL25'};ev('rViaticos()');
  es('administrador: sí puede eliminar el de 49 h',/_viaDel\(11\)/.test(pg.innerHTML),true);
  delete ctx.CU;
  es('SQL de la columna creado_en con default now()',/add column if not exists creado_en timestamptz not null default now\(\)/.test(fs.readFileSync(R+'sql/reembolsables_bbss_creado_en.sql','utf8')),true);
  console.log('\n== Detalle por Código: filtro Proyecto ==');
  ctx.window={location:{href:'https://x/index.html'}};ctx.EMPRESA={logo:'l.png'};
  ctx.DB.viaticos=[{id:20,proyecto:'P1',codigo:'R01',importe:100,fecha:'2026-10-01'},
                   {id:21,proyecto:'P2',codigo:'R01',importe:30,fecha:'2026-10-01'},
                   {id:22,proyecto:'P2',codigo:'R05',importe:7,fecha:'2026-10-01'}];
  ev('_viaTab="detalle";rViaticos()');
  es('selector de proyecto con P1 y P2',[/_viaDetSetProy\(this\.value\)/.test(pg.innerHTML),/>P1<\/option>/.test(pg.innerHTML),/>P2<\/option>/.test(pg.innerHTML)],[true,true,true]);
  es('sin proyecto: total de todos',ev('_viaDetGrupos().totGen'),137);
  ev('_viaDetSetProy("P1")');
  es('P1: solo lo de P1',ev('_viaDetGrupos().totGen'),100);
  es('  los chips de código solo de P1 (sin R05)',/_viaDetSetCod\('R05'\)/.test(pg.innerHTML),false);
  es('  el PDF dice el proyecto',/PROYECTO: P1/.test(ev('_viaDetDocHtml()')),true);
  ev('_viaDetSetCod("R05");_viaDetSetProy("P1")');
  es('código que no existe en el proyecto se suelta',ev('_viaDetCod'),'');
  console.log(`\n${mal?'✗ '+mal+' FALLAS':'OK todo bien'}  ·  ${ok}/${ok+mal}`);
  process.exitCode=mal?1:0;
})();
