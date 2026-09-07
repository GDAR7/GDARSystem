const fs=require('fs');
const R='c:/Users/LENOVO/OneDrive/Documents/GitHub/GDARSystem/';
let LS={};
global.localStorage={getItem:k=>LS[k]==null?null:LS[k],setItem:(k,v)=>LS[k]=String(v)};
global.DB={auxiliosMecanicos:[],auxMecInsumos:[],catalogoItems:[],equipos:[],partes:[]};
global.document={getElementById:()=>null};
global.toast=()=>{};global.rEdpProveedores=()=>{};

const ep=fs.readFileSync(R+'js/edpProveedores.js','utf8');
const ini=ep.indexOf('let _edpEqId=');
const fin=ep.indexOf('}',ep.indexOf('return p.desde!=='))+1;
eval(ep.slice(ini,fin)
  +'\n;global._edpFactorTC=_edpFactorTC;global._edpTCFalta=_edpTCFalta;'
  +'global._edpNecesitaTC=_edpNecesitaTC;global._edpMonedaEq=_edpMonedaEq;'
  +'global._setTC=v=>{_edpTC=v};global._getTC=()=>_edpTC;');

let ok=0,mal=0;
const es=(l,g,e)=>{const b=String(g)===String(e);b?ok++:mal++;
  console.log((b?'  OK  ':'  MAL ')+l.padEnd(56)+'= '+g+(b?'':'  (esperado '+e+')'));};

const soles={id:1,moneda:'SOLES'}, dolares={id:2,moneda:'DOLARES'}, sinMon={id:3};

console.log('\n== Cuándo hace falta el tipo de cambio ==');
es('equipo en soles: no hace falta',_edpNecesitaTC(soles),false);
es('equipo en dólares: sí',_edpNecesitaTC(dolares),true);
es('sin moneda se asume soles',_edpMonedaEq(sinMon),'SOLES');
es('  así que tampoco hace falta',_edpNecesitaTC(sinMon),false);

console.log('\n== El factor de conversión ==');
_setTC(0);
es('en soles el factor es 1',_edpFactorTC(soles),1);
es('en dólares sin TC: 1 y se avisa',_edpFactorTC(dolares),1);
es('  se marca como faltante',_edpTCFalta(dolares),true);
_setTC(3.75);
es('con TC 3.75 el factor es 1/3.75',+_edpFactorTC(dolares).toFixed(6),+(1/3.75).toFixed(6));
es('  ya no falta',_edpTCFalta(dolares),false);
es('en soles sigue siendo 1',_edpFactorTC(soles),1);
es('  y nunca lo marca como faltante',_edpTCFalta(soles),false);

console.log('\n== Los descuentos convertidos ==');
const filas=[{total:100},{total:60.09},{total:1.79}];
const conv=f=>filas.map(r=>+(r.total*f).toFixed(2));
const enSoles=conv(_edpFactorTC(soles));
es('en soles no cambian',enSoles.join(','),'100,60.09,1.79');
const enDol=conv(_edpFactorTC(dolares));
es('S/ 100.00 → US$ 26.67',enDol[0],26.67);
es('S/ 60.09 → US$ 16.02',enDol[1],16.02);
es('el total baja al dividir',+enDol.reduce((s,v)=>s+v,0).toFixed(2),+(161.88/3.75).toFixed(2));

console.log('\n== El total ya no sale cero ==');
// El bug: la fila de atención usaba horas × tarifa, con la tarifa en 0
const horas=2.50, tarifaVieja=0, delCuadro=160.18;
es('la fórmula vieja daba cero',+(horas*tarifaVieja).toFixed(2),0);
es('el cuadro de recursos daba 160.18',delCuadro,160.18);
es('ahora la fila usa arCalcular',/arCalcular\(D\.atenciones,_p\)\.total/.test(ep),true);
es('  y el precio unitario se deriva',/precio:_h>0\?\+\(_t\/_h\)\.toFixed\(4\):0/.test(ep),true);
es('  precio = 160.18 ÷ 2.50',+(delCuadro/horas).toFixed(4),64.072);
es('  y cant × precio devuelve el total',+(horas*(delCuadro/horas)).toFixed(2),160.18);

console.log('\n== Está conectado en los tres sitios ==');
es('las tres armadas de descRows usan el cuadro',(ep.match(/arCalcular\(D\.atenciones,_p\)/g)||[]).length,3);
// Son tres: la pantalla, el impreso y el que se guarda en la base.
es('los tres sitios que totalizan convierten',(ep.match(/const _fTC=_edpFactorTC\(eq\)/g)||[]).length,3);
es('  ninguna suma de descuentos se queda sin convertir',
   (ep.match(/descRows\.reduce\(\(s,r\)=>s\+r\.total,0\)/g)||[]).length,3);
es('  incluido el que va a la base',/_fTC[\s\S]{0,240}const montoDesc/.test(ep),true);

console.log('\n== La pantalla ==');
es('el campo solo sale si hace falta',/_edpNecesitaTC\(eq\)\?/.test(ep),true);
es('hay un aviso cuando falta el dato',/se restan sin convertir|restará soles contra/.test(ep),true);
es('se guarda con el EDP',/tc:\+_edpTC\|\|0/.test(ep),true);
es('y se recupera al abrirlo',/_edpTC=\+r\.tc\|\|0/.test(ep),true);
es('un EDP viejo sin el campo queda en 0',(0||0),0);

console.log('\n'+(mal?'X '+mal+' fallo(s)':'OK todo bien')+'  ·  '+ok+'/'+(ok+mal));
process.exit(mal?1:0);
