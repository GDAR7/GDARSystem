// Resumen Diario de Tareaje · filtro Categoría (Obrero / Staff)
const fs=require('fs'),path=require('path'),vm=require('vm');
const R=path.join(__dirname,'..')+'/';
let ok=0,mal=0;
const es=(l,g,e)=>{const b=JSON.stringify(g)===JSON.stringify(e);b?ok++:mal++;
  console.log((b?'  OK  ':'  MAL ')+l.padEnd(58)+'= '+JSON.stringify(g)+(b?'':'  (esperado '+JSON.stringify(e)+')'));};
const TAR=fs.readFileSync(R+'js/tareaje.js','utf8');
const HTML=fs.readFileSync(R+'index.html','utf8');
const GD=fs.readFileSync(R+'js/guardiasFbnv.js','utf8');

// Solo las dos funciones del filtro
const src=TAR.slice(TAR.indexOf('function _tarPgCatVal'),TAR.indexOf('function _buildTareResumen'));
const campos={tarPgCat:''};
const ctx={document:{getElementById:id=>id in campos?{value:campos[id]}:null}};
vm.createContext(ctx);vm.runInContext(src,ctx);
ctx.P=[{id:1,tipo:'Obrero'},{id:2,tipo:'Staff'},{id:3,tipo:''},{id:4}];
const ids=()=>vm.runInContext('_tarPgFiltrarCat(P,"tarPgCat").map(p=>p.id)',ctx);
es('sin elegir: todos',ids(),[1,2,3,4]);
campos.tarPgCat='Obrero';
es('Obrero: todo lo que no es Staff (igual que la tabla)',ids(),[1,3,4]);
campos.tarPgCat='Staff';
es('Staff: solo Staff',ids(),[2]);
es('sin selector en la página: todos',vm.runInContext('_tarPgFiltrarCat(P,undefined).length',ctx),4);

console.log('\n== Conexión ==');
es('selector Categoría en la página',/id="tarPgCat"[^>]*onchange="rTareResumenPg\(\)"/.test(HTML),true);
es('  con Obrero y Staff',/<option value="Obrero">Obrero<\/option><option value="Staff">Staff<\/option>/.test(HTML),true);
es('las 5 llamadas al resumen (con la imagen) pasan la categoría',(TAR.match(/cat:'tarPgCat'/g)||[]).length,5);
es('el resumen filtra',/persF=_tarPgFiltrarCat\(persF,ids\.cat\)/.test(TAR),true);
es('el Excel filtra',/persF=_tarPgFiltrarCat\(persF,'tarPgCat'\)/.test(TAR),true);
es('  y su encabezado dice la categoría',/Categoría: \$\{cat\}/.test(TAR),true);
es('el PDF dice la categoría',/Categoría: <strong>\$\{cat\}/.test(TAR),true);
es('el Excel ya incluye la Suspensión',/_CO=\[[^\]]*'S'/.test(TAR),true);
es('se oculta en los otros tabs',/tarPgCatWrap[\s\S]{0,80}esRes\?'':'none'/.test(GD),true);

console.log(`\n${mal?'✗ '+mal+' FALLAS':'OK todo bien'}  ·  ${ok}/${ok+mal}`);
process.exitCode=mal?1:0;
