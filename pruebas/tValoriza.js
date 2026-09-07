const fs=require('fs');
const R='c:/Users/LENOVO/OneDrive/Documents/GitHub/GDARSystem/';
const campos={};
const mk=id=>campos[id]={id,value:'',style:{},innerHTML:''};
['rpValoriza','rpCondicion'].forEach(mk);
global.document={getElementById:id=>campos[id]||null};
const src=fs.readFileSync(R+'js/partesDiarios.js','utf8')
  .replace(/^[\s\S]*?(?=\/\/ A qui[eé]n se le valoriza)/,'')   // solo el bloque nuevo
  .split('function calcHoras')[0]
  +'\n;global._pdValoriza=_pdValoriza;global._pdValorizaOk=_pdValorizaOk;global._PD_VALORIZA=_PD_VALORIZA;';
eval(src);

let ok=0,mal=0;
const es=(l,g,e)=>{const b=String(g)===String(e);b?ok++:mal++;
  console.log((b?'  OK  ':'  MAL ')+l.padEnd(52)+'= '+g+(b?'':'  (esperado '+e+')'));};

console.log('\n== Las tres opciones ==');
es('son las pedidas',_PD_VALORIZA.join(','),'Ambos,Cliente,Proveedor');
['Ambos','Cliente','Proveedor'].forEach(v=>es('  "'+v+'" vale',_pdValorizaOk(v),true));
es('cualquier otra cosa no',_pdValorizaOk('Otro'),false);
es('vacío tampoco',_pdValorizaOk(''),false);
es('null tampoco',_pdValorizaOk(null),false);

console.log('\n== Lo que se guarda ==');
campos.rpValoriza.value='Cliente';
es('toma lo elegido',_pdValoriza(),'Cliente');
campos.rpValoriza.value='Proveedor';
es('y lo otro también',_pdValoriza(),'Proveedor');
campos.rpValoriza.value='';
es('sin elegir nada cae en Ambos',_pdValoriza(),'Ambos');
campos.rpValoriza.value='basura';
es('un valor inventado cae en Ambos',_pdValoriza(),'Ambos');

console.log('\n== El formulario ==');
const html=fs.readFileSync(R+'index.html','utf8');
es('existe el desplegable',/id="rpValoriza"/.test(html),true);
const sel=(html.match(/<select id="rpValoriza"[^>]*>([\s\S]*?)<\/select>/)||[])[1]||'';
es('con las tres opciones',[...sel.matchAll(/<option>([^<]+)</g)].map(m=>m[1]).join(','),'Ambos,Cliente,Proveedor');
es('Ambos va primero (es el valor por defecto)',/<option>Ambos</.test(sel.split('\n')[1]||sel),true);
es('ya no está junto a Condición',Math.abs(html.indexOf('rpValoriza')-html.indexOf('rpCondicion'))<600,false);
es('tiene rótulo',/Valoriza para/.test(html),true);

console.log('\n== Se guarda y se recupera ==');
const pd=fs.readFileSync(R+'js/partesDiarios.js','utf8');
es('entra al objeto del parte',/valoriza:\s*_pdValoriza\(\)/.test(pd),true);
es('y viaja a la base',/valoriza:\s*parte\.valoriza\|\|'Ambos'/.test(pd),true);
es('se recupera al editar',/rpVal\.value=_pdValorizaOk\(p\.valoriza\)/.test(pd),true);
es('un parte viejo sin el campo cae en Ambos',/:'Ambos'/.test(pd),true);

console.log('\n== Se ve en el detalle ==');
const pz=fs.readFileSync(R+'js/pizarra.js','utf8');
es('aparece en la ficha del parte',/Valoriza para/.test(pz),true);
es('  con respaldo para los partes viejos',/p\.valoriza\|\|'Ambos'/.test(pz),true);

console.log('\n'+(mal?'X '+mal+' fallo(s)':'OK todo bien')+'  ·  '+ok+'/'+(ok+mal));
process.exit(mal?1:0);
