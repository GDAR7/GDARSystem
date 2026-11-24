// Avance MT · Por Operador · filtro de guardia (la del parte diario)
const fs=require('fs'),path=require('path'),vm=require('vm');
const R=path.join(__dirname,'..')+'/';
let ok=0,mal=0;
const es=(l,g,e)=>{const b=JSON.stringify(g)===JSON.stringify(e);b?ok++:mal++;
  console.log((b?'  OK  ':'  MAL ')+l.padEnd(58)+'= '+JSON.stringify(g)+(b?'':'  (esperado '+JSON.stringify(e)+')'));};
const SRC=fs.readFileSync(R+'js/avanceMT.js','utf8');
const tramo=(a,b)=>SRC.slice(SRC.indexOf(a),SRC.indexOf(b));
const ctx={console,Math,JSON,Object,Array,String,Number,Set,Date,parseFloat,
  localStorage:{getItem:()=>null,setItem(){}},today:()=>'2026-10-14',
  _AMT_TH:'',_AMT_TD:'',_amtCapM3:12,_amtMatFiltro:new Set(),_amtMatOk:m=>!!m,
  _amtFmt1:n=>(+n).toFixed(1),_amtKpi:(l,v)=>`<kpi>${l}|${v}</kpi>`,
  DB:{partes:[
    {fecha:'2026-10-12',turno:'Día',guardia:'A',op:'ANA',viajes:[{cant:5,material:'X'}]},
    {fecha:'2026-10-12',turno:'Noche',guardia:'B',op:'BETO',viajes:[{cant:3,material:'X'}]},
    {fecha:'2026-10-13',turno:'Día',guardia:'b ',op:'CARLA',viajes:[{cant:2,material:'X'}]},
    {fecha:'2026-10-13',turno:'Día',guardia:'C',op:'ANA',viajes:[{cant:1,material:'X'}]}]}};
vm.createContext(ctx);
vm.runInContext('let _amtSemIni="2026-10-12",_amtSemExportData=null,_amtMetaSem=0;'
  +tramo('function _amtSemInfo','// Exporta el cuadro activo')
  +tramo('// ── TAB 6: VIAJES POR OPERADOR','// ── TAB 7:'),ctx);
const body={innerHTML:''};
const ops=()=>[...body.innerHTML.matchAll(/color:#a78bfa">([^<]+)</g)].map(m=>m[1]);
vm.runInContext('_amtRenderSemOperadores(body)',Object.assign(ctx,{body}));
es('selector Guardia en la barra',/_amtOpGuardia=this\.value/.test(body.innerHTML)&&/Guardia C<\/option>/.test(body.innerHTML),true);
es('Todas: los 3 operadores',ops(),['ANA','BETO','CARLA']);
vm.runInContext('_amtOpGuardia="B";_amtRenderSemOperadores(body)',ctx);
es('Guardia B: BETO y CARLA ("b " también cuenta)',ops(),['BETO','CARLA']);
const aoa=()=>vm.runInContext('_amtSemExportData.aoa',ctx);
es('  el Excel dice la guardia',aoa()[0][0].endsWith('GUARDIA B'),true);
vm.runInContext('_amtOpGuardia="A";_amtRenderSemOperadores(body)',ctx);
es('Guardia A: ANA solo con sus viajes de la A (5)',[ops(),aoa()[2][8]],[['ANA'],5]);
es('las otras pestañas no llevan el selector',/guardia:true/.test(tramo('function _amtRenderSemOperadores','// ── TAB 7:'))
  &&(SRC.match(/guardia:true/g)||[]).length,1);
console.log(`\n${mal?'✗ '+mal+' FALLAS':'OK todo bien'}  ·  ${ok}/${ok+mal}`);
process.exitCode=mal?1:0;
