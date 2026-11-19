// Cost Control · EDP: el Excel se lee y se muestra; se reconoce la columna del
// equipo y qué filas existen en el Máster. Todavía no escribe nada en la base.
const fs=require('fs'),path=require('path'),vm=require('vm');
const R=path.join(__dirname,'..')+'/';
let ok=0,mal=0;
const es=(l,g,e)=>{const b=JSON.stringify(g)===JSON.stringify(e);b?ok++:mal++;
  console.log((b?'  OK  ':'  MAL ')+l.padEnd(62)+'= '+JSON.stringify(g)+(b?'':'  (esperado '+JSON.stringify(e)+')'));};
const SRC=fs.readFileSync(R+'js/edpHoras.js','utf8');
const HTML=fs.readFileSync(R+'index.html','utf8'),CFG=fs.readFileSync(R+'js/config.js','utf8'),UT=fs.readFileSync(R+'js/utils.js','utf8');
const ctx={console,Date,Math,JSON,toast:()=>{},
  DB:{equipos:[{id:1,codigo:'VOL_ECOP-001',placa:'ABC-123'},{id:2,codigo:'EXC_ECOP-010',placa:''}]}};
vm.createContext(ctx);vm.runInContext(SRC,ctx);
const ev=s=>vm.runInContext(s,ctx);

console.log('\n== Reconocer equipos ==');
ctx.__ix=ev('_edhIndice()');
const eq=v=>{ctx.__v=v;const e=ev('_edhEquipo(__v,__ix)');return e?e.codigo:null;};
es('código completo',eq('VOL_ECOP-001'),'VOL_ECOP-001');
es('código sin prefijo y con espacios',eq(' ecop 010 '),'EXC_ECOP-010');
es('por placa',eq('ABC123'),'VOL_ECOP-001');
es('no existe',eq('ECOP-999'),null);
es('vacío o muy corto no cuenta',[eq(''),eq('A1')],[null,null]);

console.log('\n== Analizar una hoja ==');
ctx.__f=[
  ['EDP NOVIEMBRE','',''],
  [],
  ['ITEM','EQUIPO','HORAS','TARIFA'],
  [1,'ECOP-001',220.5,180],
  [2,'ECOP-010',198,250],
  [3,'ECOP-777',100,90],
  ['','','',''],
  [4,'',5,0]
];
const A=ev('_edhAnalizar(__f,-1)');
es('encabezado en la 3ra fila',A.h,2);
es('columnas',Array.from(A.enc),['ITEM','EQUIPO','HORAS','TARIFA']);
es('filas con datos (sin la vacía)',A.datos.length,4);
es('columna del equipo automática',A.col,1);
es('encontrados / faltan',[A.ok,A.falta],[2,1]);
es('lista de no encontrados',Array.from(A.noEnc),['ECOP-777']);
es('columna forzada',ev('_edhAnalizar(__f,3)').col,3);

console.log('\n== Formato real del EDP (título largo arriba) ==');
ctx.DB.equipos.push({id:3,codigo:'EXC ECOP-002'});
ctx.__f=[
  ['ECOSERMO','','',''],
  ['','','',''],
  ['PROYECTO:','','"RELAVERA R3 COTA 4416: RECRECIMIENTO DEL DIQUE"','','','','FECHA:','Tue Nov 17 2026'],
  ['FECHA','TURNO','TIPO DE EQUIPO','CODIGO','HORA INICIAL','HORA FINAL','HORAS TRABAJADAS','HORAS MINIMAS','AREA DEL TRABAJO'],
  ['21/09/2026','DIA','Excavadora','EXC ECOP-002',1246.5,1255,8.5,'SUP','R3'],
  ['21/09/2026','NOCHE','Excavadora','EXC ECOP-002',1255,1261.6,6.6,'SUP','R3']
];
const B=ev('_edhAnalizar(__f,-1)');
es('encabezado = fila FECHA/TURNO/CODIGO (4ta), no el título',B.h,3);
es('columna del equipo = CODIGO',B.enc[B.col],'CODIGO');
es('las 2 filas encontradas',[B.ok,B.falta],[2,0]);
es('un horómetro (número) no es equipo',eq(1246.5),null);
es('hoja «EXC ECOP-002» = equipo',(ev('_edhEquipoHoja("EXC ECOP-002")')||{}).codigo,'EXC ECOP-002');
es('hoja «RESUMEN TOTAL» = no es equipo',ev('_edhEquipoHoja("RESUMEN TOTAL")'),null);

console.log('\n== Conexión ==');
es('menú Cost Control tiene «EDP»',/key:'edpHoras',label:'EDP'/.test(CFG),true);
es('render registrado',/edpHoras:rEdpHoras/.test(UT),true);
es('página en index',/id="page-edpHoras"/.test(HTML),true);
es('script cargado',/js\/edpHoras\.js\?v=\d+/.test(HTML),true);
es('no escribe en la base (sin sb.from)',/sb\s*\.\s*from|\.upsert\(|\.insert\(/.test(SRC),false);

console.log('\n== Llenar el EDP con el período 21/10 → 20/11 ==');
{
  // XLSX mínimo: lo justo para armar hojas y "descargar"
  const encCol=c=>{let s='';c++;while(c){const m=(c-1)%26;s=String.fromCharCode(65+m)+s;c=(c-m-1)/26;}return s;};
  const XLSX={utils:{encode_col:encCol,encode_cell:({r,c})=>encCol(c)+(r+1),
      aoa_to_sheet:aoa=>{const ws={};aoa.forEach((f,r)=>(f||[]).forEach((v,c)=>{ws[encCol(c)+(r+1)]={v};}));ws.__aoa=aoa;return ws;}},
    read:()=>({SheetNames:['RESUMEN TOTAL','EXC ECOP-002','CFO ECOP-000'],
      Sheets:{'RESUMEN TOTAL':{A1:{v:'original'}},'EXC ECOP-002':{A1:{v:'viejo'}},'CFO ECOP-000':{A1:{v:'viejo'}}}}),
    writeFile:(wb,nom)=>{c2.__salida={wb,nom};}};
  const c2={console,Date,Math,JSON,XLSX,toasts:[],today:()=>'2026-11-19',
    DB:{equipos:[{id:7,codigo:'EXC ECOP-002',tipo:'Línea Amarilla',sub:'EXCAVADORA',hrsMinVenta:310,tarifaUn:'HM'},
                 {id:8,codigo:'CFO ECOP-000',tipo:'Línea Amarilla',sub:'CARGADOR',hrsMinVenta:300,tarifaUn:'HM'}],
        proyectos:[],
        partes:[
          {id:1,eqId:7,fecha:'2026-10-20',turno:'DIA',hrIni:0,hrFin:8,condicion:'OPERATIVO'},
          {id:2,eqId:7,fecha:'2026-10-21',turno:'DIA',hrIni:8,hrFin:16.5,condicion:'OPERATIVO'},
          {id:3,eqId:7,fecha:'2026-10-21',turno:'NOCHE',hrIni:16.5,hrFin:20.7,condicion:'OPERATIVO'},
          {id:4,eqId:7,fecha:'2026-11-20',turno:'DIA',hrIni:20.7,hrFin:27,condicion:'OPERATIVO'},
          {id:5,eqId:7,fecha:'2026-11-21',turno:'DIA',hrIni:27,hrFin:30,condicion:'OPERATIVO'}]}};
  c2.toast=(m,e)=>c2.toasts.push(m);
  vm.createContext(c2);
  vm.runInContext(fs.readFileSync(R+'js/corteEquipos.js','utf8'),c2);
  vm.runInContext(SRC,c2);
  const e2=s=>vm.runInContext(s,c2);
  e2('_edhBytes=new Uint8Array(1);_edhArchivo="EDP Nº 06.xlsx";_edhLibro=XLSX.read()');
  es('período por defecto (hoy 19/11)',e2('JSON.stringify(_edhRango())'),'{"desde":"2026-10-21","hasta":"2026-11-20"}');
  es('  es un 21→20 completo: no es rango',e2('_edhPer("2026-10-21","2026-11-20").rango'),undefined);
  es('  31 días',e2('_edhPer("2026-10-21","2026-11-20").dias'),31);
  es('12/11 → 20/11 sí es rango',e2('_edhPer("2026-11-12","2026-11-20").rango'),true);
  e2('_edhGenerar()');
  const S=c2.__salida;
  es('se descargó un Excel',!!S,true);
  es('  nombre con el período',S&&S.nom,'EDP Nº 06 - 2026-10-21 al 2026-11-20.xlsx');
  es('  la hoja RESUMEN queda igual',S&&S.wb.Sheets['RESUMEN TOTAL'].A1.v,'original');
  const H=S&&S.wb.Sheets['EXC ECOP-002'];
  es('  la hoja del equipo se reemplazó',H&&H.A1.v!=='viejo',true);
  const fechas=H.__aoa.filter(f=>/^\d\d\/\d\d\/\d{4}$/.test(String(f[0]))).map(f=>f[0]+' '+f[1]);
  es('  solo partes del 21/10 al 20/11',fechas,['21/10/2026 DIA','21/10/2026 NOCHE','20/11/2026 DIA']);
  es('  E5 = mínimo diario 310/31 = 10',H.E5.v,10);
  es('  8.5 h → SUP · 4.2 h → SI',H.__aoa.filter(f=>/^\d\d\/\d\d/.test(String(f[0]))).slice(0,2).map(f=>f[7]),['SUP','SI']);
  es('  con fórmula SUP/SI/NO contra E5/2',/E\$5\/2/.test(JSON.stringify(H)),true);
  es('  el equipo sin partes también se reemplaza',S.wb.Sheets['CFO ECOP-000'].A1.v!=='viejo',true);
  es('  y el aviso lo cuenta',/1 sin partes/.test(c2.toasts.join('|')),true);
}
es('Corte de Equipos sigue usando la misma hoja',/_ceHojaXls\(eq,per,idx\)/.test(fs.readFileSync(R+'js/corteEquipos.js','utf8')),true);

console.log(`\n${mal?'✗ '+mal+' FALLAS':'OK todo bien'}  ·  ${ok}/${ok+mal}`);
process.exitCode=mal?1:0;
