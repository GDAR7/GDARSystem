const fs=require('fs');
const R='c:/Users/LENOVO/OneDrive/Documents/GitHub/GDARSystem/';
global.DB={partes:[]};
const ep=fs.readFileSync(R+'js/edpProveedores.js','utf8');
const i=ep.indexOf('function edpValeProveedor');
const j=ep.indexOf('// Consolidado de horas del per');
eval(ep.slice(i,j)+'\n;global.edpValeProveedor=edpValeProveedor;global.edpFueraProveedor=edpFueraProveedor;');

let ok=0,mal=0;
const es=(l,g,e)=>{const b=String(g)===String(e);b?ok++:mal++;
  console.log((b?'  OK  ':'  MAL ')+l.padEnd(54)+'= '+g+(b?'':'  (esperado '+e+')'));};

console.log('\n== Quien entra al EDP de proveedores ==');
es('"Ambos" entra',edpValeProveedor({valoriza:'Ambos'}),true);
es('"Proveedor" entra',edpValeProveedor({valoriza:'Proveedor'}),true);
es('sin marca entra (los historicos)',edpValeProveedor({}),true);
es('  vacio entra',edpValeProveedor({valoriza:''}),true);
es('  null entra',edpValeProveedor({valoriza:null}),true);
es('  espacios entran',edpValeProveedor({valoriza:'  '}),true);
es('"Cliente" es el unico que queda fuera',edpValeProveedor({valoriza:'Cliente'}),false);
es('no se cae con un parte nulo',edpValeProveedor(null),true);

console.log('\n== El historico se valoriza igual que siempre ==');
DB.partes=[
  {eqId:1,fecha:'2026-07-01',ef:10,valoriza:'Ambos'},
  {eqId:1,fecha:'2026-07-02',ef:8, valoriza:'Proveedor'},
  {eqId:1,fecha:'2026-07-03',ef:9, valoriza:'Cliente'},
  {eqId:1,fecha:'2026-07-04',ef:7},
  {eqId:1,fecha:'2026-07-05',ef:6}
];
const dentro=DB.partes.filter(p=>p.eqId===1&&edpValeProveedor(p));
es('entran 4 de 5',dentro.length,4);
es('  con 31 horas',dentro.reduce((s,p)=>s+p.ef,0),31);
es('solo se pierde el del cliente',DB.partes.length-dentro.length,1);
const F=edpFueraProveedor(1,'2026-07-01','2026-07-31');
es('el aviso cuenta 1',F.n,1);
es('  y ya no habla de sin marca',F.sinMarca===undefined,true);

console.log('\n== Sin partes de cliente no hay aviso ==');
DB.partes=DB.partes.filter(p=>p.valoriza!=='Cliente');
es('nada que avisar',edpFueraProveedor(1,'2026-07-01','2026-07-31').n,0);

console.log('\n== El texto del aviso ==');
es('dice por que quedan fuera',/marcados solo para el cliente/.test(ep),true);
es('ya no menciona los sin marca',/sin marca de/.test(ep),false);
es('el codigo explica la regla',/Un parte sin marca vale para los dos lados/.test(ep),true);

console.log('\n'+(mal?'X '+mal+' fallo(s)':'OK todo bien')+'  ·  '+ok+'/'+(ok+mal));
process.exit(mal?1:0);
