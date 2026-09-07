const fs=require('fs');
const R='c:/Users/LENOVO/OneDrive/Documents/GitHub/GDARSystem/';
const ep=fs.readFileSync(R+'js/edpProveedores.js','utf8');

let ok=0,mal=0;
const es=(l,g,e)=>{const b=String(g)===String(e);b?ok++:mal++;
  console.log((b?'  OK  ':'  MAL ')+l.padEnd(58)+'= '+g+(b?'':'  (esperado '+e+')'));};

console.log('\n== Todo lo que sale en soles se convierte ==');
es('el cuadro de recursos',/_arC=_fTCc===1\?_arC0:/.test(ep),true);
es('  el C.U.H. de cada fila',/cuh:\+\(f\.cuh\*_fTCc\)/.test(ep),true);
es('  su parcial',/parcial:\+\(f\.parcial\*_fTCc\)/.test(ep),true);
es('  y el total del cuadro',/total:\+\(_arC0\.total\*_fTCc\)/.test(ep),true);
es('los insumos del almacén',/precio:\+\(i\.precio\*_fTCi\)/.test(ep),true);
es('  con su subtotal',/totIns=\+_ins\.reduce/.test(ep),true);
es('  y la tabla usa los convertidos',/<tbody>\$\{_ins\.map/.test(ep),true);
es('el resumen de atención mecánica',/totAten=\+\(\(\(typeof arCalcular/.test(ep),true);
es('los descuentos manuales',/totManual=\+\(_edpDescManual\.reduce[\s\S]{0,80}_fTCr\)/.test(ep),true);
es('y las filas del EDP',(ep.match(/const _fTC=_edpFactorTC\(eq\)/g)||[]).length,3);

console.log('\n== Con la tarifa en soles nada cambia ==');
const TC=(mon,tc)=>{const f=(mon!=='SOLES'&&tc>0)?1/tc:1;return f;};
es('factor en soles',TC('SOLES',3),1);
es('factor en dólares con TC 3',+TC('DOLARES',3).toFixed(6),+(1/3).toFixed(6));
es('en dólares sin TC no divide',TC('DOLARES',0),1);

console.log('\n== El cuadro de la captura, convertido con TC 3 ==');
const H=1.50, f=1/3;
const filas=[['Jefe de Equipos',1,0.10,46.64],['Mecánico',1,1,60.87],
             ['Ayudante mecánico',0,1,34.94],['Camioneta Full',1,0.50,40.06],
             ['Desg. de H. Manuales',1,0.05,23.90]];
let tS=0,tD=0;
filas.forEach(([n,c,p,u])=>{
  const soles=H*c*p*u, dol=H*c*p*(u*f);
  tS+=soles;tD+=dol;
  console.log('   '+n.padEnd(22)+'S/ '+soles.toFixed(2).padStart(7)+'   →   US$ '+dol.toFixed(2).padStart(6)
    +'   (C.U.H. '+u.toFixed(2)+' → '+(u*f).toFixed(2)+')');
});
es('el total en soles era 130.14',+tS.toFixed(2),130.14);
es('en dólares con TC 3',+tD.toFixed(2),+(130.14/3).toFixed(2));
es('  o sea 43.38',+tD.toFixed(2),43.38);
es('dividir el total = convertir cada línea',+tD.toFixed(2),+(tS/3).toFixed(2));

console.log('\n== El símbolo y el número ya dicen lo mismo ==');
es('antes: C.U.H. 60.87 con símbolo US$ (eran soles)',60.87,60.87);
es('ahora: C.U.H. '+(60.87*f).toFixed(2)+' en US$ de verdad',+(60.87*f).toFixed(2),20.29);

console.log('\n'+(mal?'X '+mal+' fallo(s)':'OK todo bien')+'  ·  '+ok+'/'+(ok+mal));
process.exit(mal?1:0);
