const fs=require('fs');
const R='c:/Users/LENOVO/OneDrive/Documents/GitHub/GDARSystem/';
global.DB={auxiliosMecanicos:[],auxMecInsumos:[],catalogoItems:[],equipos:[],partes:[]};
global.document={getElementById:()=>null};
global.toast=()=>{};

// Solo el estado y los helpers del período, sin arrastrar la pantalla entera
const ep=fs.readFileSync(R+'js/edpProveedores.js','utf8');
const ini=ep.indexOf("let _edpEqId=");
const fin=ep.indexOf('function _edpAuxDistinto');
const cierre=ep.indexOf('}',ep.indexOf('return p.desde!=='))+1;
eval(ep.slice(ini,cierre)
  +'\n;global._edpPerAux=_edpPerAux;global._edpAuxDistinto=_edpAuxDistinto;'
  +'global._set=(k,v)=>{if(k==="desde")_edpDesde=v;if(k==="hasta")_edpHasta=v;'
  +'if(k==="auxDesde")_edpAuxDesde=v;if(k==="auxHasta")_edpAuxHasta=v;if(k==="sync")_edpAuxSync=v;};'
  +'global._get=()=>({d:_edpDesde,h:_edpHasta,ad:_edpAuxDesde,ah:_edpAuxHasta,sync:_edpAuxSync});');

let ok=0,mal=0;
const es=(l,g,e)=>{const b=String(g)===String(e);b?ok++:mal++;
  console.log((b?'  OK  ':'  MAL ')+l.padEnd(56)+'= '+g+(b?'':'  (esperado '+e+')'));};

console.log('\n== Arranca con el candado puesto ==');
es('el candado empieza puesto',_get().sync,true);
es('  y no hay fechas propias todavía',_get().ad+'|'+_get().ah,'|');
_set('sync',false);   // se suelta para probar el modo manual

console.log('\n== Sin fechas propias sigue al de horas ==');
_set('desde','2026-07-21');_set('hasta','2026-08-20');
es('desde',_edpPerAux().desde,'2026-07-21');
es('hasta',_edpPerAux().hasta,'2026-08-20');
es('  y no se marca como distinto',_edpAuxDistinto(),false);

console.log('\n== Con fechas propias, manda el suyo ==');
_set('auxDesde','2026-05-01');_set('auxHasta','2026-08-20');
es('desde va más atrás',_edpPerAux().desde,'2026-05-01');
es('hasta no cambia',_edpPerAux().hasta,'2026-08-20');
es('se marca como distinto',_edpAuxDistinto(),true);
es('el período de horas no se movió',_get().d+' → '+_get().h,'2026-07-21 → 2026-08-20');

console.log('\n== Con el candado puesto vuelve a seguir a las horas ==');
_set('sync',true);
es('desde',_edpPerAux().desde,'2026-07-21');
es('hasta',_edpPerAux().hasta,'2026-08-20');
es('ya no está distinto',_edpAuxDistinto(),false);
_set('sync',false);
es('al soltarlo recupera lo suyo',_edpPerAux().desde,'2026-05-01');

console.log('\n== Los auxilios se filtran por su rango ==');
const _pa=()=>_edpPerAux();
const auxs=[
  {id:1,eqId:9,fecha:'2026-05-10',est:'Cerrado',tiempoParada:3},   // solo con rango propio
  {id:2,eqId:9,fecha:'2026-06-15',est:'Cerrado',tiempoParada:2},   // solo con rango propio
  {id:3,eqId:9,fecha:'2026-07-25',est:'Cerrado',tiempoParada:4},   // en los dos
  {id:4,eqId:9,fecha:'2026-08-10',est:'Anulado', tiempoParada:9},  // anulado: nunca
  {id:5,eqId:8,fecha:'2026-07-25',est:'Cerrado',tiempoParada:5}    // otro equipo
];
const filtra=(desde,hasta)=>auxs.filter(a=>a.eqId===9&&a.fecha>=desde&&a.fecha<=hasta&&a.est!=='Anulado');
const conPropio=filtra(_pa().desde,_pa().hasta);
es('con rango propio entran 3',conPropio.length,3);
es('  suman 9 h de parada',conPropio.reduce((s,a)=>s+a.tiempoParada,0),9);
const soloHoras=filtra(_get().d,_get().h);
es('con el rango de horas entra 1',soloHoras.length,1);
es('  o sea 4 h',soloHoras.reduce((s,a)=>s+a.tiempoParada,0),4);
es('el anulado nunca entra',conPropio.some(a=>a.est==='Anulado'),false);
es('ni el de otro equipo',conPropio.some(a=>a.eqId!==9),false);

console.log('\n== El código quedó conectado ==');
es('_edpDescAuto usa el período de auxilios',/const _pa=_edpPerAux\(\)/.test(ep),true);
es('  y no el que le llega por parámetro',/a\.fecha>=_aDes&&a\.fecha<=_aHas/.test(ep),true);
es('el checkbox está en la pantalla',/_edpSet\('auxSync'/.test(ep),true);
es('los dos campos de fecha también',/id="edp_aux_desde"/.test(ep)&&/id="edp_aux_hasta"/.test(ep),true);
es('se deshabilitan con el candado',/_edpAuxSync\?'disabled':''/.test(ep),true);
es('se guarda con el EDP',/auxDesde:_edpPerAux\(\)\.desde/.test(ep),true);
es('y se recupera al abrirlo',/_edpAuxDesde=r\.auxDesde\|\|r\.desde/.test(ep),true);
es('el impreso avisa cuando difiere',/auxilios · las horas van del/.test(ep),true);
es('un EDP viejo cae al período de horas',/_edpAuxSync=!!\(\+r\.auxSync\)/.test(ep),true);

console.log('\n'+(mal?'X '+mal+' fallo(s)':'OK todo bien')+'  ·  '+ok+'/'+(ok+mal));
process.exit(mal?1:0);
