const fs=require('fs');
const R='c:/Users/LENOVO/OneDrive/Documents/GitHub/GDARSystem/';
global.localStorage={getItem:()=>null,setItem:()=>{}};
const nodos={arPanel:{id:'arPanel',innerHTML:'',style:{}}};
global.document={getElementById:id=>nodos[id]||null};
let avisos=[];global.toast=m=>avisos.push(String(m));
let q=0;global.nidSeguro=()=>++q;
let fallaSupa=false;
global.supaUpsert=async()=>fallaSupa?{message:'no existe la columna base_de'}:null;
global.supaDelete=async()=>null;
let repintados=0;global.rEdpProveedores=()=>{repintados++;};
global.DB={atencionRecursos:[],ventaPersonal:[
  {cargo:'ING. SUPERVISOR DE MANTTO DE EQUIPOS',tarifaMes:64.96*248},
  {cargo:'MECANICO',tarifaMes:62.90*248},
  {cargo:'AYUDANTE MECANICO',tarifaMes:36.69*248}],
  tarifasEq:[{id:1,desc:'Camioneta 4 Pasajeros',tarifaSeca:0,tarifaFull:41.39*248,unidad:'MES'}],equipos:[]};
global._ccMatchHH=()=>null;
global.hhVentaPeriodo=()=>({filas:[],sinTarifa:[],total:0,nDias:30});
global._edpDesde='2026-07-21';global._edpHasta='2026-08-20';

const src=fs.readFileSync(R+'js/atencionRecursos.js','utf8')
 +'\n;global.arCalcular=arCalcular;global._AR_DEF=_AR_DEF;global._arRender=_arRender;'
 +'global._arMigrarDesgaste=_arMigrarDesgaste;global._arEsDerivado=_arEsDerivado;'
 +'global._resetMig=()=>{_arMigrado=false};';
eval(src);

let ok=0,mal=0;
const es=(l,g,e)=>{const b=String(g)===String(e);b?ok++:mal++;
  console.log((b?'  OK  ':'  MAL ')+l.padEnd(58)+'= '+g+(b?'':'  (esperado '+e+')'));};
const per={desde:'2026-07-21',hasta:'2026-08-20',dias:31};
// Como lo tiene guardado hoy: valor fijo de 23.90
const guardadoViejo=()=>{
  DB.atencionRecursos=_AR_DEF.map((d,i)=>({id:i+1,...d}));
  const des=DB.atencionRecursos.find(r=>r.nombre==='Desg. de H. Manuales');
  des.baseDe='';des.usaManual=1;des.cuhManual=23.90;
  DB.atencionRecursos.find(r=>r.nombre==='Camioneta Full').participacion=0.5;
  _resetMig();avisos=[];repintados=0;
};

console.log('\n== Así estaba: el desgaste con tarifa fija ==');
guardadoViejo();
const A=arCalcular([{horas:1,nMec:1,nAyu:0}],per);
const a=n=>A.filas.find(x=>x.nombre===n);
es('mecánico 62.90',a('Mecánico').parcial,62.90);
es('ayudante 0.00 (no hubo)',a('Ayudante mecánico').parcial,0);
es('el desgaste sale 1.20',a('Desg. de H. Manuales').parcial,1.20);
es('  con C.U.H. 23.90',a('Desg. de H. Manuales').cuh,23.90);
es('total 91.29',A.total,91.29);

console.log('\n== Al abrir el EDP se migra solo ==');
_arRender();
setTimeout(()=>{
  es('el desgaste pasó a derivado',_arEsDerivado(DB.atencionRecursos.find(r=>r.nombre==='Desg. de H. Manuales')),true);
  es('  ya no es valor fijo',+DB.atencionRecursos.find(r=>r.nombre==='Desg. de H. Manuales').usaManual,0);
  es('  y se avisa',avisos.some(m=>/5 % de Mecánico \+ Ayudante/.test(m)),true);
  es('  se repinta el EDP',repintados>0,true);

  const B=arCalcular([{horas:1,nMec:1,nAyu:0}],per);
  const b=n=>B.filas.find(x=>x.nombre===n);
  es('ahora el C.U.H. es la suma',b('Desg. de H. Manuales').cuh,62.90);
  es('  = mecánico + ayudante',b('Desg. de H. Manuales').cuh,
     +(b('Mecánico').parcial+b('Ayudante mecánico').parcial).toFixed(2));
  es('  y el parcial es su 5 %',b('Desg. de H. Manuales').parcial,+(62.90*0.05).toFixed(2));
  es('  o sea 3.15',b('Desg. de H. Manuales').parcial,3.15);
  es('el total sube de 91.29 a 93.24',B.total,93.24);

  console.log('\n== Solo se migra una vez ==');
  avisos=[];
  _arRender();
  setTimeout(()=>{
    es('no vuelve a avisar',avisos.length,0);

    console.log('\n== Si le pusieron otro importe a mano, no se toca ==');
    DB.atencionRecursos=_AR_DEF.map((d,i)=>({id:i+1,...d}));
    const des=DB.atencionRecursos.find(r=>r.nombre==='Desg. de H. Manuales');
    des.baseDe='';des.usaManual=1;des.cuhManual=50;   // valor propio
    _resetMig();avisos=[];
    _arMigrarDesgaste().then(hecho=>{
      es('no se migra',hecho,false);
      es('  conserva su valor',DB.atencionRecursos.find(r=>r.nombre==='Desg. de H. Manuales').cuhManual,50);
      es('  y sigue siendo fijo',+DB.atencionRecursos.find(r=>r.nombre==='Desg. de H. Manuales').usaManual,1);

      console.log('\n== Si Supabase rechaza, se deja como estaba ==');
      guardadoViejo();fallaSupa=true;
      _arMigrarDesgaste().then(h2=>{
        const d=DB.atencionRecursos.find(r=>r.nombre==='Desg. de H. Manuales');
        es('no dice que migró',h2,false);
        es('  el recurso queda intacto',+d.usaManual+'|'+d.cuhManual+'|'+(d.baseDe||''),'1|23.9|');
        fallaSupa=false;

        console.log('\n== Quien ya lo tenía derivado no se toca ==');
        DB.atencionRecursos=_AR_DEF.map((d2,i)=>({id:i+1,...d2}));
        _resetMig();avisos=[];
        _arMigrarDesgaste().then(h3=>{
          es('no hace falta migrar',h3,false);
          es('  y sigue derivado',_arEsDerivado(DB.atencionRecursos.find(r=>r.nombre==='Desg. de H. Manuales')),true);
          console.log('\n'+(mal?'X '+mal+' fallo(s)':'OK todo bien')+'  ·  '+ok+'/'+(ok+mal));
          process.exit(mal?1:0);
        });
      });
    });
  },0);
},0);
