// Carga diferida: las columnas pesadas no vienen al arrancar y se piden
// cuando la pantalla que las usa se abre.
const fs=require('fs');
const R='c:/Users/LENOVO/OneDrive/Documents/GitHub/GDARSystem/';
let ok=0,mal=0;
const es=(l,g,e)=>{const b=String(g)===String(e);b?ok++:mal++;
  console.log((b?'  OK  ':'  MAL ')+l.padEnd(58)+'= '+g+(b?'':'  (esperado '+e+')'));};

// ── Un Supabase de mentira que registra que columnas le piden ──────────────
const filas={
  materiales:[{id:1,cod:'M1',descripcion:'Casco',imagen:'data:image/jpeg;base64,AAA'},
              {id:2,cod:'M2',descripcion:'Guante',imagen:'data:image/jpeg;base64,BBB'}],
  edp_proveedores:[{id:7,proveedor:'ACME',tarifa:10,detalle:{horasMinimas:5,cantPres:3}}]
};
let pedidos=[],fallar=null;
const supa={from:t=>{
  const q={_t:t,_cols:'*',_lim:null,
    select(c){q._cols=c;return q;},
    limit(n){q._lim=n;return q;},
    range(a,b){q._a=a;q._b=b;return q;},
    order(){return q;},
    then(res){
      pedidos.push({tabla:q._t,cols:q._cols,limite:q._lim});
      if(fallar===q._t)return res({data:null,error:{message:'sin red'}});
      let d=(filas[q._t]||[]).map(f=>{
        if(q._cols==='*')return{...f};
        const o={};q._cols.split(',').forEach(c=>{if(f[c]!==undefined)o[c]=f[c];});
        return o;
      });
      if(q._lim)d=d.slice(0,q._lim);
      return res({data:d,error:null});
    }};
  return q;
}};

// ── Se carga el trozo real de config.js ───────────────────────────────────
const cfg=fs.readFileSync(R+'js/config.js','utf8');
const ini=cfg.indexOf('// ══ COLUMNAS DE CARGA DIFERIDA ══');
const fin=cfg.indexOf('// ══ FIELD MAPPERS');
if(ini<0||fin<0){console.error('NO HALLADO el bloque de carga diferida');process.exit(1);}
const bloque=cfg.slice(ini,fin);
// El recorte llega hasta el cierre de la arrow, que es la linea "    };"
const pIni=cfg.indexOf('    const cargarPaginado=async tabla=>{');
const pRet=cfg.indexOf('      return{data:all,error:err};',pIni);
const NL=String.fromCharCode(10);
const pFin=cfg.indexOf(NL+'    };',pRet)+NL.length+6;
const paginado=cfg.slice(pIni,pFin);
if(!/};s*$/.test(paginado)){console.error('el recorte no cierra bien');process.exit(1);}

const DB={materiales:[],edpProveedores:[]};
const SUPA_TABLES={materiales:'materiales',edpProveedores:'edp_proveedores'};
const _RENAME_FROM={descripcion:'desc',concepto:'con',imagen:'img'};
const ctx=new Function('supa','DB','SUPA_TABLES','_RENAME_FROM','console',
  bloque+paginado+'return{SUPA_DIFERIDAS,cargarColumnaDiferida,cargarPaginado,_difListo};');
const api=ctx(supa,DB,SUPA_TABLES,_RENAME_FROM,console);

(async()=>{
  console.log('\n== Al arrancar no se traen las pesadas ==');
  es('materiales.imagen esta en la lista',api.SUPA_DIFERIDAS.materiales.join(),'imagen');
  es('edp_proveedores.detalle tambien',api.SUPA_DIFERIDAS.edp_proveedores.join(),'detalle');

  pedidos=[];
  let r=await api.cargarPaginado('materiales');
  const consulta=pedidos.find(p=>p.limite===null);
  es('descubre las columnas con una consulta de 1 fila',
    pedidos.some(p=>p.limite===1&&p.cols==='*'),true);
  es('y luego pide todas menos imagen',/id,cod,descripcion/.test(consulta.cols),true);
  es('  sin imagen',/imagen/.test(consulta.cols),false);
  es('las filas llegan sin la foto',r.data[0].imagen,'undefined');
  es('  pero con lo demas',r.data[0].cod,'M1');

  console.log('\n== Una tabla normal se carga entera ==');
  pedidos=[];
  filas.otra=[{id:1,x:'y'}];
  await api.cargarPaginado('otra');
  es('pide todo de una',pedidos[0].cols,'*');
  es('  sin consulta previa',pedidos.length,1);

  console.log('\n== La foto llega cuando se abre Materiales ==');
  DB.materiales=[{id:1,cod:'M1'},{id:2,cod:'M2'}];
  pedidos=[];
  await api.cargarColumnaDiferida('materiales','imagen');
  es('pide solo id e imagen',pedidos[0].cols,'id,imagen');
  es('  y la fusiona en DB',DB.materiales[0].img,'data:image/jpeg;base64,AAA');
  es('  usando el nombre que espera la app',DB.materiales[1].img!==undefined,true);
  es('  sin tocar lo que ya estaba',DB.materiales[0].cod,'M1');

  console.log('\n== No se pide dos veces ==');
  pedidos=[];
  await api.cargarColumnaDiferida('materiales','imagen');
  es('la segunda vez no consulta',pedidos.length,0);

  console.log('\n== El detalle del EDP, igual ==');
  DB.edpProveedores=[{id:7,proveedor:'ACME'}];
  pedidos=[];
  await api.cargarColumnaDiferida('edpProveedores','detalle');
  es('consulta la tabla correcta',pedidos[0].tabla,'edp_proveedores');
  es('  solo id y detalle',pedidos[0].cols,'id,detalle');
  es('  y queda disponible',DB.edpProveedores[0].detalle.horasMinimas,5);

  console.log('\n== Si falla, no rompe y se puede reintentar ==');
  DB.materiales=[{id:1,cod:'M1'}];
  fallar='materiales';
  await api.cargarColumnaDiferida('materiales','imagenB');
  es('la fila sigue entera',DB.materiales[0].cod,'M1');
  es('  sin foto, que es preferible a no dibujar',DB.materiales[0].img,'undefined');
  fallar=null;pedidos=[];
  await api.cargarColumnaDiferida('materiales','imagenB');
  es('y reintenta la proxima vez',pedidos.length>0,true);

  console.log('\n== Las pantallas la piden ==');
  const datos=fs.readFileSync(R+'js/datos.js','utf8');
  es('rMateriales es async',/async function rMateriales/.test(datos),true);
  es('  y pide las fotos',/cargarColumnaDiferida\('materiales','imagen'\)/.test(datos),true);
  const edp=fs.readFileSync(R+'js/edpProveedores.js','utf8');
  es('_edpCargar es async',/async function _edpCargar/.test(edp),true);
  es('  y pide el detalle',/cargarColumnaDiferida\('edpProveedores','detalle'\)/.test(edp),true);
  es('  solo si no lo tiene',/r\.detalle===undefined/.test(edp),true);

  console.log('\n'+(mal?'X '+mal+' fallo(s)':'OK todo bien')+'  ·  '+ok+'/'+(ok+mal));
  process.exit(mal?1:0);
})();
