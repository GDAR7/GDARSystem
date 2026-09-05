// ══ VERIFICADOR DE DOMINIO ══════════════════════════════════════════════════
// Comprueba que un dominio propio quedó bien apuntado a GitHub Pages.
//
//   node herramientas/verificarDominio.js erp.midominio.com
//
// Sirve igual para cada cliente nuevo: es el mismo chequeo con otro dominio.
// Revisa las cuatro cosas que se rompen en la práctica, en el orden en que
// conviene mirarlas — un fallo temprano explica los siguientes, así que el
// primero que salga en rojo es el que hay que arreglar.

const dns=require('dns').promises;
const fs=require('fs');
const path=require('path');

const DOMINIO=(process.argv[2]||'').trim().replace(/^https?:\/\//,'').replace(/\/.*$/,'');
if(!DOMINIO){
  console.error('Falta el dominio.\n  node herramientas/verificarDominio.js erp.midominio.com');
  process.exit(1);
}

// Las IP de GitHub Pages para dominios raíz (registros A)
const IPS_GH=['185.199.108.153','185.199.109.153','185.199.110.153','185.199.111.153'];
const esRaiz=DOMINIO.split('.').length<=2;

let fallos=0,avisos=0;
const ok  =(t,d)=>console.log('  \x1b[32mOK\x1b[0m   '+t+(d?'\n         '+d:''));
const mal =(t,d)=>{fallos++;console.log('  \x1b[31mMAL\x1b[0m  '+t+(d?'\n         '+d:''));};
const nota=(t,d)=>{avisos++;console.log('  \x1b[33m··\x1b[0m   '+t+(d?'\n         '+d:''));};

(async()=>{
  console.log('\nVerificando \x1b[1m'+DOMINIO+'\x1b[0m'+(esRaiz?'  (dominio raíz)':'  (subdominio)')+'\n');

  // ── 1 · El archivo CNAME del repo ─────────────────────────────────────────
  console.log('1 · Archivo CNAME en el repo');
  const rutaCname=path.join(__dirname,'..','CNAME');
  if(!fs.existsSync(rutaCname)){
    mal('No existe el archivo CNAME',
      'Sin él, el próximo push desactiva el dominio. Créelo en la raíz con una sola línea: '+DOMINIO);
  }else{
    const cont=fs.readFileSync(rutaCname,'utf8').trim();
    if(cont===DOMINIO)ok('Existe y dice '+cont);
    else mal('Existe pero dice "'+cont+'"','Debería decir exactamente: '+DOMINIO);
  }

  // ── 2 · El DNS ────────────────────────────────────────────────────────────
  console.log('\n2 · DNS');
  let apunta=false;
  try{
    const cname=await dns.resolveCname(DOMINIO).catch(()=>null);
    if(cname&&cname.length){
      const destino=cname[0].replace(/\.$/,'');
      if(/\.github\.io$/i.test(destino)){ok('CNAME → '+destino);apunta=true;}
      else mal('CNAME apunta a '+destino,'Debería apuntar a <su-usuario>.github.io');
    }else{
      const ips=await dns.resolve4(DOMINIO).catch(()=>[]);
      if(!ips.length){
        mal('El dominio no resuelve',
          'El registro no existe todavía, o el DNS aún no propagó (puede tardar horas).');
      }else{
        const buenas=ips.filter(i=>IPS_GH.includes(i));
        if(buenas.length===IPS_GH.length){ok('4 registros A de GitHub Pages');apunta=true;}
        else if(buenas.length){
          nota('Solo '+buenas.length+' de los 4 registros A de GitHub',
            'Faltan: '+IPS_GH.filter(i=>!ips.includes(i)).join(', '));
          apunta=true;
        }else{
          mal('Resuelve a '+ips.join(', '),
            esRaiz?('Para dominio raíz deben ser los 4 A: '+IPS_GH.join(', '))
                  :'Para subdominio use un CNAME a <su-usuario>.github.io');
        }
      }
    }
  }catch(e){mal('Error consultando DNS: '+e.message);}

  // ── 3 · Cloudflare con proxy activado ─────────────────────────────────────
  // La nube naranja impide que GitHub valide el dominio y emita el certificado.
  if(apunta){
    const ips=await dns.resolve4(DOMINIO).catch(()=>[]);
    const cf=ips.some(i=>/^(104\.(1[6-9]|2[0-7])\.|172\.6[4-9]\.|172\.7[0-1]\.|188\.114\.|190\.93\.|197\.234\.|198\.41\.)/.test(i));
    if(cf)nota('Parece pasar por el proxy de Cloudflare (nube naranja)',
      'Póngalo en "DNS only" (nube gris) o GitHub no podrá emitir el certificado HTTPS.');
  }

  // ── 4 · La página responde por HTTPS ──────────────────────────────────────
  console.log('\n3 · HTTPS y contenido');
  try{
    const r=await fetch('https://'+DOMINIO+'/',{redirect:'follow'});
    if(r.ok){
      const html=await r.text();
      ok('https://'+DOMINIO+' responde '+r.status);
      if(/GDAR|loginScreen/i.test(html))ok('Es el sistema GDAR (encontré la pantalla de acceso)');
      else nota('Responde, pero no reconozco el contenido','¿Está sirviendo el repo correcto?');
    }else{
      mal('https://'+DOMINIO+' responde '+r.status,
        r.status===404?'GitHub aún no publica en este dominio, o el repo no tiene Pages activo.':'');
    }
  }catch(e){
    const m=String(e.cause&&e.cause.code||e.message);
    if(/CERT|ALT_NAME|SELF_SIGNED/i.test(m))
      mal('El certificado HTTPS aún no está listo','GitHub lo emite solo; puede tardar hasta 24 h tras configurar el DNS.');
    else mal('No responde por HTTPS','('+m+')');
  }

  // ── 5 · Que los scripts resuelvan en el dominio nuevo ─────────────────────
  try{
    const r=await fetch('https://'+DOMINIO+'/js/config.js');
    if(r.ok)ok('Los scripts cargan (js/config.js responde '+r.status+')');
    else mal('js/config.js responde '+r.status,'Las rutas relativas no están resolviendo.');
  }catch(e){/* ya se reportó arriba */}

  console.log('\n'+(fallos?'\x1b[31m'+fallos+' problema(s)\x1b[0m':'\x1b[32mTodo en orden\x1b[0m')
    +(avisos?'  ·  '+avisos+' aviso(s)':'')+'\n');
  process.exit(fallos?1:0);
})();
