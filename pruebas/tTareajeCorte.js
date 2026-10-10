// Resumen Diario de Tareaje · pestaña Corte 21→20.
// Matriz persona × día del corte, asistencia (sin contar DL), faltas,
// dotación diaria, agrupación elegible y días futuros que no cuentan.
const fs=require('fs'),vm=require('vm');
const R='c:/Users/LENOVO/OneDrive/Documents/GitHub/GDARSystem/';
let ok=0,mal=0;
const es=(l,g,e)=>{const b=String(g)===String(e);b?ok++:mal++;
  console.log((b?'  OK  ':'  MAL ')+l.padEnd(62)+'= '+g+(b?'':'  (esperado '+e+')'));};

const P=(id,ape,nom,cargo,tipo,cat,guardia,est)=>({id,ape,nom,cargo,tipo,cat,guardia,est:est||'Activo',dni:'4000000'+id});
const DB={personal:[
  P(1,'QUISPE','LUIS','OP. EXCAVADORA','Obrero','Operador LA','A'),
  P(2,'MAMANI','JUAN','PEON','Obrero','Personal Piso','B'),
  P(3,'ROJAS','ANA','ING. RESIDENTE','Staff','Administrativo','A'),
  P(4,'TINEO','VICTOR','PEON','Obrero','Personal Piso',null),
  P(5,'SIN','TAREO','PEON','Obrero','Personal Piso','C'),
  P(6,'BAJA','PEDRO','OP. VOLQUETE','Obrero','Operador LB','C','Inactivo')
],tareaje:[]};
let tid=1;
const T=(pid,fecha,tipo,proy)=>DB.tareaje.push({id:tid++,personalId:pid,fecha,tipo,proy:proy||'EPY-004-26'});
// Luis: 10 TD, 1 DLT, 2 DL, 1 F (hasta el 10/10) + 3 TD futuros que no cuentan
['09-21','09-22','09-23','09-24','09-25','09-26','09-27','09-28','09-29','09-30'].forEach(d=>T(1,'2026-'+d,'TD'));
T(1,'2026-10-01','DLT');T(1,'2026-10-02','DL');T(1,'2026-10-03','DL');T(1,'2026-10-04','F');
['10-11','10-12','10-13'].forEach(d=>T(1,'2026-'+d,'TD'));
// Juan: 4 TN, 1 DM, 1 P, 2 F
['09-21','09-22','09-23','09-24'].forEach(d=>T(2,'2026-'+d,'TN'));
T(2,'2026-09-25','DM');T(2,'2026-09-26','P');T(2,'2026-09-27','F');T(2,'2026-09-28','F');
// Ana: 5 TD, otro proyecto 2 TD
['09-21','09-22','09-23','09-24','09-25'].forEach(d=>T(3,'2026-'+d,'TD'));
T(3,'2026-09-26','TD','EPY-005-26');T(3,'2026-09-27','TD','EPY-005-26');
// Víctor (sin guardia): 2 A5 y 1 DL
T(4,'2026-09-21','A5');T(4,'2026-09-22','A5');T(4,'2026-09-23','DL');
// Pedro, dado de baja: tareo del corte anterior y uno en este
T(6,'2026-09-15','TD');T(6,'2026-09-21','TD');
// Fuera del corte (siguiente)
T(1,'2026-10-21','TD');

const tar=fs.readFileSync(R+'js/tareaje.js','utf8');
const _TARE_T=vm.runInNewContext('('+tar.match(/const _TARE_T=(\{[\s\S]*?\n\});/)[1]+')');
const nodos={};const nodo=id=>nodos[id]||(nodos[id]={innerHTML:'',style:{},value:''});
nodo('tarPgFecha').value='2026-10-10';
let xls=null;
const ctx=vm.createContext({DB,console,Math,Number,String,Object,Array,JSON,Set,Date,isFinite,_TARE_T,
  today:()=>'2026-10-10',document:{getElementById:nodo},alert(){},
  XLSX:{utils:{aoa_to_sheet:a=>({aoa:a}),book_new:()=>({}),book_append_sheet(){}},writeFile:(wb,n)=>{xls=n;}}});
vm.runInContext(fs.readFileSync(R+'js/tareajeCorte.js','utf8'),ctx,{filename:'tareajeCorte'});
const ev=x=>vm.runInContext(x,ctx);
const datos=o=>{ctx.__o=Object.assign({fecha:'2026-10-10',hoy:'2026-10-10',proy:'',guardia:'',agrup:'guardia',q:''},o);
  return ev('_tcDatos(__o)');};
const de=(D,id)=>D.gente.find(r=>r.id===id);

console.log('\n== El corte ==');
let C=ev("_tcCorte('2026-10-10')");
es('10/10 cae en el corte 21/09 → 20/10',C.desde+' → '+C.hasta,'2026-09-21 → 2026-10-20');
es('  lleva el nombre del mes en que cierra',C.nombre,'Corte octubre 2026');
es('  30 días',C.dias.length,30);
C=ev("_tcCorte('2026-10-21')");
es('el 21 ya es el corte siguiente',C.desde+' → '+C.hasta,'2026-10-21 → 2026-11-20');
C=ev("_tcCorte('2026-01-05')");
es('cruza el año bien',C.desde+' → '+C.hasta+' · '+C.nombre,'2025-12-21 → 2026-01-20 · Corte enero 2026');
C=ev("_tcCorte('2026-03-20')");
es('febrero corto',C.desde+' → '+C.hasta+' · '+C.dias.length+' días','2026-02-21 → 2026-03-20 · 28 días');

console.log('\n== Quién aparece ==');
let D=datos({});
es('solo quien tiene tareo en el corte',D.gente.map(r=>r.id).sort().join(','),'1,2,3,4,6');
es('  el dado de baja con tareo en el corte sí sale',!!de(D,6),true);
es('días transcurridos hasta hoy',D.transc.length,20);

console.log('\n== Cuentas por persona ==');
let r=de(D,1);
es('Luis: días en obra (TD + DLT)',r.obra,11);
es('  días libres',r.libre,2);
es('  1 falta',r.faltas,1);
es('  los 3 TD futuros no cuentan',r.cuenta.TD,10);
es('  asistencia 11 ÷ 12 (el DL no cuenta)',(r.asis*100).toFixed(1),(11/12*100).toFixed(1));
es('  jornadas venta 10 + 2.5 + 2 DL',r.venta,14.5);
es('  el tareo del corte siguiente no entra',r.dia['2026-10-21'],undefined);
r=de(D,2);
es('Juan: 4 noches',r.obra+' / '+r.noches,'4 / 4');
es('  2 faltas y 2 otras (DM, P)',r.faltas+' / '+r.otras,'2 / 2');
es('  asistencia 4 ÷ 8 = 50%',ev('_tcPct')(r.asis),'50%');
r=de(D,4);
es('Víctor: A5 cuenta en obra',r.obra,2);
es('  sin guardia → «Sin guardia»',r.grupo,'Sin guardia');

console.log('\n== Totales y dotación ==');
es('días en obra del corte',D.tot.obra,11+4+7+2+1);
es('faltas del corte',D.tot.faltas,3);
es('asistencia general',(D.asis*100).toFixed(1),(25/(25+3+2)*100).toFixed(1));
es('dotación del 21/09: Luis, Juan, Ana, Víctor, Pedro',D.presentes[0],5);
es('  los días futuros no tienen dotación',D.presentes[25],null);
es('situación al 10/10',D.obraDia+' en obra · '+D.libresDia+' libres','0 en obra · 0 libres');
D=datos({fecha:'2026-10-02'});
es('situación al 02/10: Luis de día libre',D.libresDia,1);

console.log('\n== Filtros ==');
D=datos({proy:'EPY-004-26'});
es('proyecto 04: Ana solo con 5 días',de(D,3).obra,5);
D=datos({proy:'EPY-005-26'});
es('proyecto 05: solo Ana',D.gente.map(r=>r.id).join(','),'3');
D=datos({guardia:'A'});
es('guardia A: Luis y Ana',D.gente.map(r=>r.id).sort().join(','),'1,3');
D=datos({q:'peon'});
es('buscar por cargo',D.gente.map(r=>r.id).sort().join(','),'2,4');
D=datos({q:'40000003'});
es('buscar por DNI',D.gente.map(r=>r.id).join(','),'3');

console.log('\n== Agrupación ==');
const gr=a=>{const D=datos({agrup:a});return ev('_tcOrdenGrupos')([...new Set(D.gente.map(r=>r.grupo))],a).join(' | ');};
es('por guardia, en orden A B C y sin guardia al final',gr('guardia'),'Guardia A | Guardia B | Guardia C | Sin guardia');
es('por Staff / Obrero',gr('tipo'),'Staff | Obrero');
es('por categoría (alfabético)',gr('cat'),'Administrativo | Operador LA | Operador LB | Personal Piso');
es('por cargo',gr('cargo'),'ING. RESIDENTE | OP. EXCAVADORA | OP. VOLQUETE | PEON');

console.log('\n== La pestaña ==');
ev('rTarCorte()');
let H=nodos.tcBody.innerHTML;
es('muestra el corte',/Corte octubre 2026/.test(H),true);
es('trae la columna de asistencia',/Asist\./.test(H),true);
es('la fila de Luis con 92%',/QUISPE, LUIS[\s\S]*?92%/.test(H),true);
es('el día futuro se ve atenuado',/class="tc-x tc-TD tc-f"/.test(H),true);
es('  y el día pasado no',/class="tc-x tc-TD"/.test(H),true);
es('los colores salen de la leyenda del tareo',/\.tc-TN\{background:#1e3a8a/.test(H),true);
es('sin elegir, muestra el seguimiento del corte',/Seguimiento del corte/.test(H),true);
es('ninguna celda rota',/NaN|undefined/.test(H),false);
ev('_tcSelec(2)');H=nodos.tcBody.innerHTML;
es('tocar una fila abre la ficha',/MAMANI, JUAN[\s\S]*Turnos noche/.test(H),true);
ev('_tcSelec(2)');
es('  tocarla de nuevo la cierra',/Seguimiento del corte/.test(nodos.tcBody.innerHTML),true);
ev("_tcSetAgrup('tipo')");H=nodos.tcBody.innerHTML;
es('agrupar por Staff / Obrero',/Asistencia por staff \/ obrero/.test(H),true);
ev("_tcSetOrden('faltas')");
es('ordenar por faltas, de mayor a menor',ev('_tcOrdenar')(datos({}).gente).map(r=>r.id)[0],2);
ev("_tcMover(-1)");
es('◀ lleva al corte anterior',nodos.tarPgFecha.value,'2026-09-20');
es('  y ahí sale Pedro',/BAJA, PEDRO/.test(nodos.tcBody.innerHTML),true);
nodo('tarPgFecha').value='2026-10-10';ev("_tcSetAgrup('guardia');_tcSetOrden('nombre')");
ev('exportTarCorteXLSX()');
es('exporta el Excel del corte',xls,'Tareaje_Corte_octubre_2026_TODOS.xlsx');

console.log('\n== Enganche ==');
const html=fs.readFileSync(R+'index.html','utf8');
es('hay botón de la pestaña',/id="tarPgTabBtn-corte"/.test(html),true);
es('y su panel',/id="tarPgPanelCorte"[\s\S]{0,60}id="tcBody"/.test(html),true);
es('carga después de tareaje.js (usa _TARE_T)',html.indexOf('js/tareajeCorte.js')>html.indexOf('js/tareaje.js'),true);
const gd=fs.readFileSync(R+'js/guardiasFbnv.js','utf8');
es('el cambio de pestaña la conoce',/'corte'\)rTarCorte\(\)/.test(gd),true);
es('los filtros de la cabecera la repintan',/_tarPgTabAct==='corte'\)\{rTarCorte\(\)/.test(tar),true);

console.log('\n'+(mal?'X '+mal+' fallo(s)':'OK todo bien')+'  ·  '+ok+'/'+(ok+mal));
process.exit(mal?1:0);
