const fs=require('fs');
const R='c:/Users/LENOVO/OneDrive/Documents/GitHub/GDARSystem/';
const ep=fs.readFileSync(R+'js/edpProveedores.js','utf8');
let ok=0,mal=0;
const es=(l,g,e)=>{const b=String(g)===String(e);b?ok++:mal++;
  console.log((b?'  OK  ':'  MAL ')+l.padEnd(56)+'= '+g+(b?'':'  (esperado '+e+')'));};

console.log('\n== El repintado vuelve a ser el de siempre ==');
es('sin aplazamiento por foco',/_edpTecleando/.test(ep),false);
es('sin repintado pendiente',/_edpRunPendiente/.test(ep),false);
es('sin oyentes de blur',/_edpRerenderAlSalir/.test(ep),false);
es('repinta al instante cuando se le pide',/if\(inmediato\)run\(\);else _edpTimer=setTimeout\(run,350\)/.test(ep),true);
es('y devuelve el foco',/el\.focus\(\)/.test(ep),true);

console.log('\n== Las fechas ya no se pueden cortar ==');
// El date se repinta, pero conserva su valor porque viene del estado
const dHasta=(ep.match(/<input[^>]*id="edp_hasta"[^>]*>/)||[''])[0];
es('el input hasta existe',dHasta.length>0,true);
es('  sigue siendo type=date',/type="date"/.test(dHasta),true);
es('  con su valor del estado',/value="\$\{_edpHasta\}"/.test(dHasta),true);
es('  y guarda en onchange (no en cada tecla)',/onchange="_edpSet\('hasta'/.test(dHasta),true);
es('  sin oninput que dispare a medias',/oninput=/.test(dHasta),false);

console.log('\n== El tipo de cambio, sin type=number ==');
const tc=(ep.match(/<input[^>]*id="edp_tc"[^>]*>/)||[''])[0];
es('es de texto',/type="text"/.test(tc),true);
es('  con teclado numérico en el móvil',/inputmode="decimal"/.test(tc),true);
es('  ya no es number',/type="number"/.test(tc),false);
es('guarda mientras se escribe',/oninput="_edpSet\('tc',this\.value\)"/.test(tc),true);
es('y repinta al salir',/onchange="_edpSet\('tc',this\.value,1\)"/.test(tc),true);

console.log('\n== Y su valor se lee igual ==');
const num=v=>+v||0;
[['3.44',3.44],['3',3],['',0],['abc',0],['3,44',0]].forEach(([v,e])=>es('  "'+v+'"',num(v),e));

console.log('\n== El cursor se restaura en los campos de texto ==');
es('se lee la posición salvo en number y date',/a\.type!=="number"&&a\.type!=="date"/.test(ep),true);
es('  y se repone tras repintar',/setSelectionRange\(ss,se\)/.test(ep),true);

console.log('\n'+(mal?'X '+mal+' fallo(s)':'OK todo bien')+'  ·  '+ok+'/'+(ok+mal));
process.exit(mal?1:0);
