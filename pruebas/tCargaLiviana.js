// Carga inicial liviana: quien entra a un solo módulo (la gente de campo del
// Parte de Turno) trae solo lo que ese módulo usa; el resto, todo como siempre.
const fs=require('fs'),vm=require('vm');
const R='c:/Users/LENOVO/OneDrive/Documents/GitHub/GDARSystem/';
let ok=0,mal=0;
const es=(l,g,e)=>{const b=String(g)===String(e);b?ok++:mal++;
  console.log((b?'  OK  ':'  MAL ')+l.padEnd(62)+'= '+g+(b?'':'  (esperado '+e+')'));};

const cfg=fs.readFileSync(R+'js/config.js','utf8');
const uti=fs.readFileSync(R+'js/utils.js','utf8');
const ini=cfg.indexOf('const CARGA_POR_MODULO=');
const fin=cfg.indexOf('\n// ══ SEED DEMO DATA');
const bloque=cfg.slice(ini,fin);
const tabla=cfg.slice(cfg.indexOf('const SUPA_TABLES={'),cfg.indexOf('};',cfg.indexOf('const SUPA_TABLES={'))+2);
const modUnico=uti.slice(uti.indexOf('function _cuModuloUnico()'),uti.indexOf('\n}',uti.indexOf('function _cuModuloUnico()'))+2);
const USERS=(()=>{const c={document:{getElementById:()=>null}};vm.createContext(c);
  vm.runInContext(fs.readFileSync(R+'js/empresa.js','utf8')+';this.__U=EMPRESA_USERS;',c);return c.__U;})();

async function correr(usuario,falla){
  const pedidas=[];let pintado=0,almacen=0;
  // Cadena de consulta simulada: cualquier .select().order().range()… devuelve filas
  const cadena=t=>{const q={select(){return q;},order(){return q;},range(){return q;},limit(){return q;},eq(){return q;},gte(){return q;},
    then(res,rej){if(falla)return Promise.reject(new TypeError('Failed to fetch')).then(res,rej);
      return Promise.resolve({data:t==='frentes_trabajo'?[{id:1,codigo:'FT-01',nombre:'Acceso Este'}]:[],error:null}).then(res,rej);}};return q;};
  const ctx=vm.createContext({console:{warn(){},log(){}},Math,Object,Array,JSON,Promise,String,Number,setTimeout,
    DB:{nx:{}},AP:'parteTurno',CU:usuario,
    supa:{from:t=>{pedidas.push(t);return cadena(t);}},
    toCamel:o=>({...o}),renderPage:()=>{pintado++;},toast(){},recalcularEstadosRQ(){},
    cargarAlmacen:async()=>{almacen++;},SUPA_DIFERIDAS:{},document:{getElementById:()=>null}});
  vm.runInContext(tabla.replace('const SUPA_TABLES','var SUPA_TABLES')+'\n'+modUnico+'\n'+bloque,ctx);
  await vm.runInContext('loadSheetsData()',ctx);
  return {pedidas,pintado,almacen,DB:ctx.DB};
}
const u=c=>USERS(new Proxy({},{get:(t,k)=>({label:k}),ownKeys:()=>['general','operaciones','administracion'],getOwnPropertyDescriptor:()=>({enumerable:true,configurable:true})})).find(x=>x.codigo===c);

(async()=>{
console.log('\n== Gente de campo (solo Parte de Turno) ==');
for(const c of ['ERV_RO','WIL_VE','EDW_QU','MIS_TE']){
  const r=await correr(u(c));
  es(c+': una sola consulta, la de frentes',r.pedidas.join(','),'frentes_trabajo');
}
const rc=await correr(u('ERV_RO'));
es('trae los frentes para el selector',rc.DB.frentesTrabajo&&rc.DB.frentesTrabajo[0].nombre,'Acceso Este');
es('dibuja su pantalla',rc.pintado,1);
es('no carga almacén',rc.pedidas.includes('almacen'),false);
const rf=await correr(u('ERV_RO'),true);
es('sin señal no rompe (queda el formulario)',rf.pintado,0);

console.log('\n== El resto: todo como siempre ==');
const ra=await correr(u('EIBEL25'));
es('administrador: carga todas las tablas',ra.pedidas.length>=80,true);
es('  y el almacén',ra.pedidas.includes('almacen'),true);
const ri=await correr(u('IVA_VE'));
es('Ivan Vera (varias áreas, también Parte de Turno): carga completa',ri.pedidas.length>=80,true);
const rs=await correr(u('PIE_SA'));
es('Piero Sanchez: carga completa',rs.pedidas.length>=80,true);
const rn=await correr(null);
es('sin sesión, el camino normal',rn.pedidas.length>=80,true);

console.log('\n== Conexión ==');
es('el botón de recargar pasa por la misma regla',/try\{await loadSheetsData\(\);\}/.test(cfg),true);
es('solo el Parte de Turno tiene carga liviana definida',bloque.match(/const CARGA_POR_MODULO=\{([\s\S]*?)\};/)[1].includes('parteTurno:'),true);
es('la versión de config.js subió',+((fs.readFileSync(R+'index.html','utf8').match(/js\/config\.js\?v=(\d+)"/)||[])[1])>=55,true);

console.log('\n'+(mal?'✗ '+mal+' FALLAS':'OK todo bien')+'  ·  '+ok+'/'+(ok+mal));
process.exit(mal?1:0);
})();
