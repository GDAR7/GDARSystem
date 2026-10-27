// Tareaje · resumen desde el inicio.
// Por trabajador, desde su primera marca hasta hoy (o el corte): trabajados,
// libres, faltas, licencias, sin marcar, % de asistencia y HH.
const fs=require('fs'),vm=require('vm');
const R='c:/Users/LENOVO/OneDrive/Documents/GitHub/GDARSystem/';
let ok=0,mal=0;
const es=(l,g,e)=>{const b=String(g)===String(e);b?ok++:mal++;
  console.log((b?'  OK  ':'  MAL ')+l.padEnd(62)+'= '+g+(b?'':'  (esperado '+e+')'));};

let id=0;
const t=(pid,fecha,tipo,proy)=>({id:++id,personalId:pid,fecha,tipo,proy:proy||'EPY-004-26'});
const dias=(pid,desde,n,tipo,proy)=>Array.from({length:n},(_,i)=>{const d=new Date(desde+'T12:00:00');d.setDate(d.getDate()+i);return t(pid,d.toISOString().slice(0,10),tipo,proy);});
const DB={
  personal:[
    {id:1,ape:'RODRIGUEZ',nom:'ANDRES',dni:'01234567',cargo:'OPERADOR',proy:'EPY-004-26',est:'Activo'},
    {id:2,ape:'MELENDREZ',nom:'YONDER',dni:'44556677',cargo:'ALMACENERO',proy:'EPY-004-26',est:'Activo'},
    {id:3,ape:'ROJAS',nom:'MICHEL',dni:'11112222',cargo:'VIGÍA',proy:'EPY-004-26',est:'Inactivo'},
    {id:4,ape:'NUEVO',nom:'SIN MARCAS',dni:'99999999',cargo:'PEÓN',proy:'EPY-004-26',est:'Activo'},
    {id:5,ape:'OYON',nom:'PEDRO',dni:'55555555',cargo:'CHOFER',proy:'EPY-002-26',est:'Activo'}
  ],
  proyectos:[{codigo:'EPY-004-26',nombre:'R3'},{codigo:'EPY-002-26',nombre:'Oyón'}],
  tareaje:[
    // Andrés: desde el 01/10 — 10 TD, 4 DL, 2 TN, 1 F, 1 DM, 1 LP; un hueco el 20/10; 21–27 TD; futuros programados
    ...dias(1,'2026-10-01',10,'TD'),...dias(1,'2026-10-11',4,'DL'),...dias(1,'2026-10-15',2,'TN'),
    t(1,'2026-10-17','F'),t(1,'2026-10-18','DM'),t(1,'2026-10-19','LP'),
    ...dias(1,'2026-10-21',7,'TD'),
    ...dias(1,'2026-10-28',10,'TD'),          // programado: no cuenta
    // Yonder: dos marcas el mismo día → cuenta una (la última)
    t(2,'2026-10-25','TD'),t(2,'2026-10-25','DLT'),t(2,'2026-10-26','A5'),t(2,'2026-10-27','X'),
    // Michel (inactivo): trabajó del 01 al 05/09 y se fue
    ...dias(3,'2026-09-01',5,'TD'),
    // Pedro: en otro proyecto
    ...dias(5,'2026-10-20',3,'TD','EPY-002-26')
  ]
};
const nodos={};const nodo=x=>nodos[x]||(nodos[x]={id:x,value:'',innerHTML:''});
let libro=null,hoja=null;
const ctx=vm.createContext({DB,console,Math,Number,String,Object,Array,JSON,Set,Date,isFinite,parseFloat,setTimeout,clearTimeout,
  document:{getElementById:nodo},today:()=>'2026-10-27',toast(){},openM(){},
  XLSX:{utils:{aoa_to_sheet:a=>{hoja=a;const ws={};return ws;},encode_cell:()=>'C5',book_new:()=>({}),book_append_sheet(){}},writeFile:(wb,n)=>{libro=n;}}});
vm.runInContext(fs.readFileSync(R+'js/tareajeAcum.js','utf8').replace(/^const /gm,'var ').replace(/^let /gm,'var '),ctx,{filename:'tareajeAcum.js'});
const ev=x=>vm.runInContext(x,ctx);
const fila=(dni)=>ev(`_tacDatos().filas.find(f=>f.dni==='${dni}')`);

console.log('\n== Un trabajador desde su inicio ==');
ev("_tacProy='';_tacBusca='';_tacInact=false;_tacHasta=''");
const a=fila('01234567');
es('inicio = su primera marca',a.inicio,'2026-10-01');
es('última = la de hoy, no las programadas',a.ultima,'2026-10-27');
es('días calendario del 01/10 al 27/10',a.cal,27);
es('trabajados = TD + TN (17 + 2)',a.trab+' · TD '+a.TD+' · TN '+a.TN,'19 · TD 17 · TN 2');
es('DL, F, DM',a.DL+' · '+a.F+' · '+a.DM,'4 · 1 · 1');
es('la licencia LP va en «Lic.»',a.LIC,1);
es('el hueco del 20/10 sale como «sin marcar»',a.sin,1);
es('% asistencia = 19 / (19 + 1)',a.asis.toFixed(1),'95.0');
es('HH = 19 × 10',a.hh,190);

console.log('\n== Dos marcas el mismo día ==');
const y=fila('44556677');
es('cuenta una sola: la última (DLT)',y.TD+' · DLT '+y.DLT+' · A5 '+y.A5+' · trab '+y.trab,'0 · DLT 1 · A5 1 · trab 2');
es('una marca desconocida va a «Otros»',y.otro,1);
es('sin faltas: 100 %',y.asis,100);

console.log('\n== Fecha de corte ==');
ev("_tacHasta='2026-10-14'");
const a2=fila('01234567');
es('hasta el 14/10: 10 TD y 4 DL',a2.trab+' · '+a2.DL+' · días '+a2.cal,'10 · 4 · días 14');
es('Yonder aún no empezaba: no aparece',fila('44556677'),undefined);
ev("_tacSet('hasta','2026-12-01')");
es('un corte en el futuro vuelve a «hoy»',ev('_tacHasta'),'');

console.log('\n== Inactivos ==');
es('apagado: el inactivo no aparece',fila('11112222'),undefined);
ev("_tacInact=true");
const m=fila('11112222');
es('encendido: aparece marcado',m&&m.inact,true);
es('  medido hasta su última marca, no hasta hoy',m.cal+' días · sin marcar '+m.sin,'5 días · sin marcar 0');
ev("_tacInact=false");

console.log('\n== Filtros ==');
const D0=ev('_tacDatos()');
es('quien no tiene ninguna marca no aparece, pero se cuenta',D0.filas.some(f=>f.dni==='99999999')+' · '+D0.sinMarcas,'false · 1');
ev("_tacProy='EPY-002-26'");
es('por proyecto: solo Pedro',ev("_tacDatos().filas.map(f=>f.dni).join()"),'55555555');
ev("_tacProy='EPY-004-26'");
es('en R3 no se cuentan sus días de Oyón',fila('55555555'),undefined);
ev("_tacProy='';_tacBusca='almacen'");
es('búsqueda por cargo, sin tildes ni mayúsculas',ev("_tacDatos().filas.map(f=>f.dni).join()"),'44556677');
ev("_tacBusca='0123'");
es('búsqueda por DNI',ev("_tacDatos().filas.map(f=>f.dni).join()"),'01234567');
ev("_tacBusca=''");

console.log('\n== Totales y orden ==');
const D=ev('_tacDatos()');
es('totales del cuadro',D.tot.trab+' trab · '+D.tot.F+' F · '+D.tot.hh+' HH',(19+2+3)+' trab · 1 F · '+(24*10)+' HH');
ev("_tacOrdenar('F')");
es('ordenar por faltas: primero quien tiene más',ev('_tacDatos().filas[0].dni'),'01234567');
ev("_tacOrdenar('F')");
es('  otro toque invierte',ev('_tacDatos().filas[0].dni')!=='01234567',true);
ev("_tacOrden={k:'nombre',asc:true}");

console.log('\n== Pantalla ==');
ev('rTarAcum()');
const H=nodo('mTarAcumBody').innerHTML;
es('tabla con todos los tipos',['Trabajados','TD','TN','DLT','A5','DL','F','DM','P','V','Lic.','R','Otros','Sin marcar','% Asist.','HH'].every(c=>H.includes('>'+c+'<')),true);
es('interruptor de inactivos',/type="checkbox"[^>]*onchange="_tacSet\('inact',this\.checked\)"/.test(H)&&/Mostrar inactivos/.test(H),true);
es('fecha de corte con máximo hoy',/type="date" value="2026-10-27" max="2026-10-27"/.test(H),true);
es('fila de totales',/TOTAL · 3 trabajador\(es\)/.test(H),true);
es('KPI con borde en los 4 lados',(H.match(/<div style="border:1px solid #[0-9a-f]{6};border-radius:8px/g)||[]).length,6);
es('avisa que no cuenta lo programado',/Los días programados después no se cuentan/.test(H),true);
DB.personal[0].ape='<b>X</b>';ev('rTarAcum()');
es('el texto no se interpreta como código',/<b>X<\/b>/.test(nodo('mTarAcumBody').innerHTML),false);
DB.personal[0].ape='RODRIGUEZ';

console.log('\n== Escribir en el buscador no se traba ==');
ev("_tacBusca='';rTarAcum()");
const cuerpo=nodo('mTarAcumBody');
es('los resultados van en su propio bloque',/<div id="tacRes">/.test(cuerpo.innerHTML),true);
const idx1=ev('_tacIdx');
cuerpo.innerHTML='CONTROLES-INTACTOS';nodo('tacRes').innerHTML='';
ev("_tacBusca='rod';rTarAcum(true)");
es('al buscar no se redibujan los controles (la caja no pierde el foco)',cuerpo.innerHTML,'CONTROLES-INTACTOS');
es('  solo la tabla, ya filtrada',/RODRIGUEZ, ANDRES/.test(nodo('tacRes').innerHTML)&&!/MELENDREZ/.test(nodo('tacRes').innerHTML),true);
es('  sin volver a recorrer el tareaje',ev('_tacIdx')===idx1,true);
const SRCa=fs.readFileSync(R+'js/tareajeAcum.js','utf8');
es('el buscador usa el redibujo parcial',/setTimeout\(\(\)=>rTarAcum\(true\),150\)/.test(SRCa),true);
ev("_tacOrdenar('F')");
es('ordenar tampoco toca los controles',cuerpo.innerHTML,'CONTROLES-INTACTOS');
ev("_tacOrden={k:'nombre',asc:true}");
ev("_tacProy='EPY-002-26';rTarAcum()");
es('cambiar de proyecto sí recalcula',ev('_tacIdx')!==idx1,true);
ev("_tacProy='';_tacBusca=''");
DB.tareaje.push(t(2,'2026-10-24','F'));
ev('abrirTarAcum()');
es('al volver a abrir toma los cambios del tareaje',fila('44556677').F,1);
DB.tareaje.pop();ev('_tacIdx=null');

console.log('\n== Excel ==');
ev('_tacExcel()');
es('se descarga con el corte en el nombre',libro,'Tareaje_desde_inicio_al_2026-10-27_TODOS.xlsx');
es('  título, filtros, encabezado y fila por trabajador',hoja[0][0]+' · '+hoja[3][1]+' · '+hoja.length,'RESUMEN DE TAREAJE DESDE EL INICIO · Trabajador · '+(4+3+1));
es('  con total al pie',hoja[hoja.length-1][1],'TOTAL');

console.log('\n== Instalación ==');
const IX=fs.readFileSync(R+'index.html','utf8');
const MEN=fs.readFileSync(R+'js/tareajeMenus.js','utf8');
es('se abre desde el menú 📅 Período',/_tmnAccion\('📊  Resumen desde el inicio','#6366f1',\(\)=>abrirTarAcum\(\)\)/.test(MEN)
  &&MEN.indexOf('Resumen desde el inicio')>MEN.indexOf('function tarMenuPeriodo'),true);
es('  sin sumar botones a la barra',/onclick="abrirTarAcum\(\)"/.test(IX),false);
es('ventana y script',/id="mTarAcumBody"/.test(IX)&&/<script src="js\/tareajeAcum\.js\?v=\d+"><\/script>/.test(IX),true);

console.log('\n'+(mal?'✗ '+mal+' FALLAS':'OK todo bien')+'  ·  '+ok+'/'+(ok+mal));
process.exit(mal?1:0);
