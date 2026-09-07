const fs=require('fs');
const R='c:/Users/LENOVO/OneDrive/Documents/GitHub/GDARSystem/';
let LS={};
global.localStorage={getItem:k=>LS[k]==null?null:LS[k],setItem:(k,v)=>LS[k]=String(v),removeItem:k=>delete LS[k]};
global.DB={auxiliosMecanicos:[],auxMecInsumos:[],catalogoItems:[],equipos:[],partes:[],edpProveedores:[]};
global.document={getElementById:()=>null};
global.toast=()=>{};
let repintados=0;
global.rEdpProveedores=()=>{repintados++;};

const ep=fs.readFileSync(R+'js/edpProveedores.js','utf8');
// El bloque de estado y los helpers de plegado/período
const ini=ep.indexOf('let _edpEqId=');
const fin=ep.indexOf('}',ep.indexOf('return p.desde!=='))+1;
eval(ep.slice(ini,fin)
  +'\n;global.edpPlegar=edpPlegar;global._edpCabPleg=_edpCabPleg;global._edpPerAux=_edpPerAux;'
  +'global._edpAuxDistinto=_edpAuxDistinto;global._edpFmtDMY=d=>d;'
  +'global._get=()=>({sync:_edpAuxSync,pleg:_edpPlegado});'
  +'global._set=(k,v)=>{if(k==="desde")_edpDesde=v;if(k==="hasta")_edpHasta=v;};');

let ok=0,mal=0;
const es=(l,g,e)=>{const b=String(g)===String(e);b?ok++:mal++;
  console.log((b?'  OK  ':'  MAL ')+l.padEnd(54)+'= '+g+(b?'':'  (esperado '+e+')'));};

console.log('\n== El candado de auxilios arranca puesto ==');
es('marcado por defecto',_get().sync,true);
_set('desde','2026-07-21');_set('hasta','2026-08-20');
es('y sigue al período de horas',_edpPerAux().desde+' → '+_edpPerAux().hasta,'2026-07-21 → 2026-08-20');
es('  sin marcarse como distinto',_edpAuxDistinto(),false);

console.log('\n== Las tarjetas se pliegan ==');
es('empiezan abiertas',JSON.stringify(_get().pleg),'{}');
const abierta=_edpCabPleg('datos','🧾 Datos del EDP','CAG ECOP-001 · EDP N° 03');
es('la cabecera es pulsable',/onclick="edpPlegar\('datos'\)"/.test(abierta),true);
es('  con cursor de mano',/cursor:pointer/.test(abierta),true);
es('abierta: la flecha apunta abajo',/rotate\(90deg\)/.test(abierta),true);
es('  y no muestra el resumen',/CAG ECOP-001/.test(abierta),false);

edpPlegar('datos');
es('al pulsar queda plegada',_get().pleg.datos,true);
es('  y se repinta la pantalla',repintados,1);
const cerrada=_edpCabPleg('datos','🧾 Datos del EDP','CAG ECOP-001 · EDP N° 03');
es('cerrada: la flecha vuelve a la derecha',/rotate\(90deg\)/.test(cerrada),false);
es('  y aparece el resumen',/CAG ECOP-001 · EDP N° 03/.test(cerrada),true);
es('el título sigue estando',/Datos del EDP/.test(cerrada),true);

edpPlegar('datos');
es('volver a pulsar la abre',!!_get().pleg.datos,false);

console.log('\n== Cada tarjeta va por su cuenta ==');
edpPlegar('ajustes');
es('ajustes plegada',_get().pleg.ajustes,true);
es('  datos sigue abierta',!!_get().pleg.datos,false);

console.log('\n== Se recuerda entre sesiones ==');
es('queda guardado',!!LS._edpPlegado,true);
es('  con lo plegado',JSON.parse(LS._edpPlegado).ajustes,true);

console.log('\n== El cuerpo se oculta ==');
es('Datos del EDP mira su estado',/_edpPlegado\.datos\?'display:none':''/.test(ep),true);
es('Ajustes también',/_edpPlegado\.ajustes\?'display:none':''/.test(ep),true);
es('las dos usan la cabecera nueva',(ep.match(/_edpCabPleg\(/g)||[]).length,3);

console.log('\n== El resumen usa datos ya calculados ==');
const iEq=ep.indexOf('const eq=_edpEqId?');
const iFiltro=ep.indexOf('const filtroBar=');
const iTar=ep.indexOf('const tarifaUn=eq.tarifaUn');
const iCant=ep.indexOf('const cantEquipo=CQ.total');
const iEdit=ep.indexOf('const editBar=');
es('eq se define antes de filtroBar',iEq<iFiltro,true);
es('tarifaUn antes de editBar',iTar<iEdit,true);
es('cantEquipo antes de editBar',iCant<iEdit,true);

console.log('\n'+(mal?'X '+mal+' fallo(s)':'OK todo bien')+'  ·  '+ok+'/'+(ok+mal));
process.exit(mal?1:0);
