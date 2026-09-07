// Busca funciones internas que un archivo invoca y nadie declara. Es el fallo
// que se cuela cuando se recorta código: node --check no lo ve, porque solo
// falla al ejecutarse esa rama.
const fs=require('fs');
const R='c:/Users/LENOVO/OneDrive/Documents/GitHub/GDARSystem/';
const html=fs.readFileSync(R+'index.html','utf8');
const orden=[...html.matchAll(/<script src="js\/([^"?]+)/g)].map(m=>m[1]);

// Todo lo declarado en cualquier script
const decl=new Set();
orden.forEach(f=>{
  let s='';try{s=fs.readFileSync(R+'js/'+f,'utf8');}catch(e){return;}
  let m;const re=/^(?:async\s+)?(?:function|const|let|var|class)\s+([A-Za-z_$][\w$]*)/gm;
  while((m=re.exec(s)))decl.add(m[1]);
  // también las declaradas dentro de bloques, con sangría
  const re2=/^\s+(?:async\s+)?function\s+([A-Za-z_$][\w$]*)/gm;
  while((m=re2.exec(s)))decl.add(m[1]);
});

let total=0;
orden.forEach(f=>{
  let s='';try{s=fs.readFileSync(R+'js/'+f,'utf8');}catch(e){return;}
  // Se miran solo los prefijos propios del proyecto, para no perseguir métodos
  const usa=new Set([...s.matchAll(/\b(_[a-z]{2,4}[A-Z][\w$]*)\s*\(/g)].map(m=>m[1]));
  // Las locales de cada función también cuentan como declaradas
  // Incluye las declaraciones múltiples: let a=null,b=null,c=null
  const locales=new Set();
  [...s.matchAll(/\b(?:const|let|var)\s+([^;\n]+)/g)].forEach(m=>{
    [...m[1].matchAll(/([A-Za-z_$][\w$]*)\s*=/g)].forEach(x=>locales.add(x[1]));
  });
  const faltan=[...usa].filter(n=>!decl.has(n)&&!locales.has(n));
  if(faltan.length){total+=faltan.length;console.log('  ✗ '+f+': '+faltan.join(', '));}
});
console.log(total?'\n'+total+' referencia(s) sin declarar':'\n✓ ninguna función se invoca sin estar declarada');
process.exit(total?1:0);
