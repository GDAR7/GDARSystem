// ══ CUÁNTO CUESTA ARRANCAR ══════════════════════════════════════════════════
// Mide lo que la aplicación descarga cada vez que alguien entra, tabla por
// tabla, y calcula cuánto se ahorraría cargando solo los últimos días.
//
//   node herramientas/medirCarga.js           mide y estima con 60 días
//   node herramientas/medirCarga.js --dias 90 con otro corte
//
// No modifica nada: solo lee.
//
// ── Una salvedad sobre la medición ─────────────────────────────────────────
// Con RLS cerrado, la llave pública ya no lee sin sesión iniciada, así que esta
// herramienta usa la service_role de herramientas/.credenciales.json. Los datos
// y el servidor son los mismos que ve la aplicación; lo que no reproduce es la
// latencia del navegador de cada persona, que se suma a esto.

const fs=require('fs');
const path=require('path');

const RAIZ=path.join(__dirname,'..');
const CRED=path.join(__dirname,'.credenciales.json');
const NL='\n';
const _E=String.fromCharCode(27);
const C={verde:_E+'[32m',rojo:_E+'[31m',ambar:_E+'[33m',gris:_E+'[90m',neg:_E+'[1m',fin:_E+'[0m'};

const iD=process.argv.indexOf('--dias');
const DIAS=iD>-1?(+process.argv[iD+1]||60):60;

function credenciales(){
  let url=process.env.GDAR_URL,key=process.env.GDAR_SERVICE_KEY;
  if((!url||!key)&&fs.existsSync(CRED)){
    const c=JSON.parse(fs.readFileSync(CRED,'utf8'));
    url=url||c.url; key=key||c.service_key;
  }
  if(!url||!key){
    console.error(NL+'Faltan las credenciales en herramientas/.credenciales.json'+NL);
    process.exit(1);
  }
  return{url:url.replace(/\/+$/,''),key};
}

// Las tablas y el orden salen de config.js, para medir lo que de verdad se carga
function tablas(){
  const cfg=fs.readFileSync(path.join(RAIZ,'js','config.js'),'utf8');
  const m=cfg.match(/const SUPA_TABLES=\{[\s\S]*?\n\};/);
  if(!m)throw new Error('No encontré SUPA_TABLES en js/config.js');
  return [...new Set([...m[0].matchAll(/(\w+)\s*:\s*'([^']+)'/g)].map(x=>x[2]))];
}

const fmtN=n=>Number(n).toLocaleString('es-PE');
const fmtMs=ms=>ms<1000?Math.round(ms)+' ms':(ms/1000).toFixed(1)+' s';
const fmtKb=b=>b<1048576?(b/1024).toFixed(0)+' KB':(b/1048576).toFixed(1)+' MB';

async function medir(url,key,tabla){
  const t0=Date.now();
  let filas=0,bytes=0,desde=0,paginas=0;
  while(true){
    const r=await fetch(url+'/rest/v1/'+tabla+'?select=*&order=id.asc',{
      headers:{apikey:key,Authorization:'Bearer '+key,Range:desde+'-'+(desde+999)}});
    if(!r.ok)throw new Error('HTTP '+r.status);
    const txt=await r.text();
    bytes+=Buffer.byteLength(txt);
    const j=JSON.parse(txt);
    if(!Array.isArray(j))throw new Error('respuesta inesperada');
    filas+=j.length;paginas++;
    if(j.length<1000)break;
    desde+=1000;
  }
  return{ms:Date.now()-t0,filas,bytes,paginas};
}

// Cuántas filas quedarían con el corte. Se pregunta al servidor en vez de
// traerse los datos: solo interesa el número.
async function recientes(url,key,tabla,corte){
  for(const col of['fecha','created_at','creado_en']){
    const r=await fetch(url+'/rest/v1/'+tabla+'?select=id&'+col+'=gte.'+corte+'&limit=1',{
      headers:{apikey:key,Authorization:'Bearer '+key,Prefer:'count=exact',Range:'0-0'}});
    if(!r.ok)continue;
    const cr=r.headers.get('content-range');   // formato  0-0/1234
    if(cr&&cr.includes('/'))return{col,n:+cr.split('/')[1]};
  }
  return null;   // sin columna de fecha: es un catálogo, se carga entero
}

(async()=>{
  const{url,key}=credenciales();
  const lista=tablas();
  const corte=new Date(Date.now()-DIAS*86400000).toISOString().slice(0,10);

  console.log(NL+C.neg+'Lo que se descarga al entrar'+C.fin);
  console.log(C.gris+'  '+lista.length+' tablas · corte propuesto: últimos '+DIAS
    +' días (desde '+corte+')'+C.fin+NL);

  const res=[];
  let tMs=0,tFilas=0,tBytes=0;
  for(const t of lista){
    try{
      const m=await medir(url,key,t);
      const r=m.filas?await recientes(url,key,t,corte):null;
      res.push({t,...m,rec:r});
      tMs+=m.ms;tFilas+=m.filas;tBytes+=m.bytes;
    }catch(e){res.push({t,error:e.message});}
  }

  const pesadas=res.filter(r=>!r.error&&r.filas).sort((a,b)=>b.bytes-a.bytes);
  console.log(C.neg+'  Las que más pesan'+C.fin);
  console.log(C.gris+'  tabla                   filas      peso     tiempo   con el corte'+C.fin);
  pesadas.slice(0,12).forEach(r=>{
    const conCorte=r.rec
      ? fmtN(r.rec.n)+' ('+Math.round(r.rec.n/r.filas*100)+'%)'
      : C.gris+'catálogo, entera'+C.fin;
    console.log('  '+r.t.padEnd(22)+String(fmtN(r.filas)).padStart(7)
      +fmtKb(r.bytes).padStart(10)+fmtMs(r.ms).padStart(9)+'   '+conCorte);
  });

  // Lo que se ahorraría: solo cuenta en las tablas que tienen fecha
  let ahorroFilas=0,ahorroBytes=0;
  res.forEach(r=>{
    if(r.error||!r.filas||!r.rec)return;
    const fuera=r.filas-r.rec.n;
    ahorroFilas+=fuera;
    ahorroBytes+=Math.round(r.bytes*(fuera/r.filas));
  });

  const errores=res.filter(r=>r.error);
  console.log(NL+C.neg+'  Hoy'+C.fin);
  console.log('    '+fmtN(tFilas)+' filas · '+fmtKb(tBytes)+' · '+fmtMs(tMs)+' de servidor');
  if(errores.length)console.log(C.gris+'    ('+errores.length+' tabla(s) sin respuesta: '
    +errores.map(e=>e.t).join(', ')+')'+C.fin);

  console.log(NL+C.neg+'  Con el corte de '+DIAS+' días'+C.fin);
  const pct=tFilas?Math.round(ahorroFilas/tFilas*100):0;
  console.log('    '+fmtN(tFilas-ahorroFilas)+' filas · '+fmtKb(tBytes-ahorroBytes)
    +C.verde+'   ('+pct+'% menos)'+C.fin);

  console.log(NL+C.gris
    +'  El tiempo real de cada persona es este más su conexión y el navegador.'+NL
    +'  Si hoy son pocos segundos, el cambio puede esperar; si son muchos, no.'+C.fin+NL);
})().catch(e=>{console.error(NL+'Falló: '+e.message+NL);process.exit(1);});
