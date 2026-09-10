// ══ AREAS ══
// Qué áreas hay y qué módulos ofrece cada una vive ahora en js/registro.js,
// que se carga antes que este archivo. Aquí se reconstruye con la forma de
// siempre, para que empresa.js siga repartiendo permisos con las mismas
// claves y el menú no note el cambio.
const AREAS=gdarConstruirAreas();

// ══ USERS ══
// La lista vive en js/empresa.js: cambia con cada cliente. Se arma aquí
// porque necesita AREAS, que se define arriba.
const USERS=EMPRESA_USERS(AREAS);

// ══ SUPABASE CONFIG ══
// SUPA_URL y SUPA_KEY llegan desde js/empresa.js, que se carga antes.
const supa = supabase.createClient(SUPA_URL, SUPA_KEY);

// ══ COLUMNAS DE CARGA DIFERIDA ══
// tabla → columnas que NO se traen al arrancar. Ver cargarPaginado().
const SUPA_DIFERIDAS={
  materiales:      ['imagen'],
  edp_proveedores: ['detalle']
};
// Trae una de esas columnas y la fusiona en DB, una sola vez. Devuelve una
// promesa para poder esperarla; si falla, la pantalla se dibuja igual pero sin
// ese dato, que es preferible a no dibujar nada.
const _difListo={};
async function cargarColumnaDiferida(dbKey,columna){
  const clave=dbKey+'.'+columna;
  if(_difListo[clave])return _difListo[clave];
  const tabla=SUPA_TABLES[dbKey];
  if(!tabla)return Promise.resolve();
  _difListo[clave]=(async()=>{
    try{
      let from=0;const porId={};
      while(true){
        const{data,error}=await supa.from(tabla).select('id,'+columna)
          .range(from,from+999).order('id');
        if(error)throw error;
        if(!data||!data.length)break;
        data.forEach(r=>{porId[r.id]=r[columna];});
        if(data.length<1000)break;
        from+=1000;
      }
      const destino=_RENAME_FROM[columna]||columna;
      (DB[dbKey]||[]).forEach(r=>{if(porId[r.id]!==undefined)r[destino]=porId[r.id];});
    }catch(e){
      console.warn('[diferida] no se pudo traer '+clave,e.message||e);
      delete _difListo[clave];   // que se pueda reintentar
    }
  })();
  return _difListo[clave];
}

// ══ FIELD MAPPERS (camelCase ↔ snake_case) ══
const _RENAME_TO   = {desc:'descripcion', con:'concepto', img:'imagen', actividades:'act', operador:'op', hrsInop:'im'};
const _RENAME_FROM = {descripcion:'desc', concepto:'con', imagen:'img'};

function toSnake(obj){
  const r={};
  for(const [k,v] of Object.entries(obj)){
    if(k==='items'||k==='pdfData')continue;


    
    const key=_RENAME_TO[k]||k.replace(/([A-Z])/g,m=>'_'+m.toLowerCase());
    r[key]=(v===''||v==='—')?null:v;
  }
  return r;
}
function toCamel(obj){
  const r={};
  for(const [k,v] of Object.entries(obj)){
    const key=_RENAME_FROM[k]||k.replace(/_([a-z])/g,(_,c)=>c.toUpperCase());
    r[key]=v??'';
  }
  return r;
}

const SUPA_TABLES={
  personal:'personal',social:'social',residencia:'residencia',
  alimentacion:'alimentacion',hospedaje:'hospedaje',lavanderia:'lavanderia',
  almacen:'almacen',requerimientos:'requerimientos',facturasPago:'facturas_pago',
  combustible:'combustible',supervision:'supervision',incidentes:'incidentes',
  petar:'petar',ambiental:'ambiental',equipos:'equipos',partes:'partes',
  mantenimientos:'mantenimientos',planner:'planner',facturas:'facturas',
  costos:'costos',frentesTrabajo:'frentes_trabajo',tipoMaterial:'tipo_material',
  tramos:'tramos',catalogoItems:'materiales',unidades:'unidades',
  asistencia:'asistencia',proyectos:'proyectos',auxiliosMecanicos:'auxilios_mecanicos',
  auxMecInsumos:'aux_mec_insumos',engrase:'engrase',tareaje:'tareaje',
  subtiposEquipo:'subtipos_equipo',
  histogramaPlan:'histograma_plan',
  planillaMes:'planilla_mes',
  lpsWbs:'lps_wbs',
  lpsLookahead:'lps_lookahead',
  lpsPlanSemanal:'lps_plan_semanal',
  lpsRestricciones:'lps_restricciones',
  lpsConfig:'lps_config',
  lpsWbsRecursos:'lps_wbs_recursos',
  lpsSectores:'lps_sectores',
  pizarraItems:'pizarra_items',
  lpsWbsDeps:'lps_wbs_deps',
  capas:'capas',
  planDibujos:'plan_dibujos',
  rosterConfig:'roster_config',
  rosterOvr:'roster_ovr',
  capasAvance:'capas_avance',
  recElementos:'rec_elementos',
  recElemCapas:'rec_elemento_capas',
  recPlanos:'rec_planos',
  personalRosterCfg:'personal_roster_cfg',
  seguimiento:'seguimiento_tareas',
  tarifasEq:'tarifas_equipos',
  ventas:'ventas',
  reembolsables:'reembolsables',
  codigoReemb:'codigo_reemb',
  edpProveedores:'edp_proveedores',
  firmas:'firmas',
  salidaEquipos:'salida_equipos',
  cursos:'cursos',
  cursosPersonal:'cursos_personal',
  renta5ta:'renta5ta',
  renta5taCfg:'renta5ta_cfg',
  ventaPersonal:'venta_personal',
  planillaCierre:'planilla_cierre',
  planillaCerrada:'planilla_cerrada',
  atencionRecursos:'atencion_recursos',
  afpTasas:'afp_tasas',
  wbsMapa:'wbs_mapa',
  wbsAvance:'wbs_avance',
  libActividades:'lib_actividades',   // Panel de Liberación de Restricciones
  libRequisitos:'lib_requisitos',
  libBitacora:'lib_bitacora',
  valPresupuesto:'val_presupuesto',   // partidas del contrato, ver js/valPresupuesto.js
  viaticos:'reembolsables_bbss'   // Reembolsables de Bienestar Social
};

const ACTION_MAP={
  savePersonal:'personal',saveSocial:'social',saveResidencia:'residencia',
  saveAlimentacion:'alimentacion',saveHospedaje:'hospedaje',saveLavanderia:'lavanderia',
  saveAlmacen:'almacen',saveSupervision:'supervision',saveIncidente:'incidentes',
  savePetar:'petar',saveAmbiental:'ambiental',saveEquipo:'equipos',
  saveMantenimiento:'mantenimientos',saveCombustible:'combustible',
  saveParte:'partes',saveFactura:'facturas',saveCosto:'costos',
  savePlanner:'planner',saveFrenteTrabajo:'frentesTrabajo',
  saveTipoMaterial:'tipoMaterial',saveTramo:'tramos',
  saveCatalogo:'catalogoItems',saveRequerimiento:'requerimientos',
  saveFacturaPago:'facturasPago',saveAsistencia:'asistencia',saveProyecto:'proyectos',
  saveAuxMec:'auxiliosMecanicos',saveAuxMecInsumo:'auxMecInsumos',saveEngrase:'engrase',saveTareaje:'tareaje',
  saveSubtipoEquipo:'subtiposEquipo',
  savePlanillaMes:'planillaMes',
  saveLpsWbs:'lpsWbs',
  saveLpsLookahead:'lpsLookahead',
  saveLpsPlan:'lpsPlanSemanal',
  saveLpsRestr:'lpsRestricciones',
  saveLpsConfig:'lpsConfig',
  saveLpsRecurso:'lpsWbsRecursos',
  saveLpsSector:'lpsSectores',
  savePizItem:'pizarraItems',
  saveLpsWbsDep:'lpsWbsDeps',
  savePlanDibujo:'planDibujos',
  saveCurso:'cursos',
  saveCursoPersonal:'cursosPersonal',
  saveRenta5ta:'renta5ta',
  saveRenta5taCfg:'renta5taCfg',
  saveVentaPersonal:'ventaPersonal',
  saveViatico:'viaticos',
  saveWbsAvance:'wbsAvance',
  saveAfpTasa:'afpTasas',
  saveAtencionRecurso:'atencionRecursos',
  savePlanillaCierre:'planillaCierre',
  savePlanillaCerrada:'planillaCerrada',
  saveRosterConfig:'rosterConfig',
  saveRosterOvr:'rosterOvr',
  savePersonalRosterCfg:'personalRosterCfg',
  saveCapaAvance:'capasAvance',
  saveSegTarea:'seguimiento',
  saveTarifaEq:'tarifasEq',
  saveVenta:'ventas',
  saveReembolsable:'reembolsables',
  saveLibActividad:'libActividades',
  saveLibRequisito:'libRequisitos',
  saveLibBitacora:'libBitacora'
};

let _pendingSaves=0;
async function supaUpsert(dbKey,record){
  const table=SUPA_TABLES[dbKey];if(!table)return null;
  _pendingSaves++;
  try{
    const {error}=await supa.from(table).upsert(toSnake(record));
    // El servidor respondió y rechazó: no es un problema de red, así que
    // guardarlo para reintentar solo repetiría el mismo rechazo.
    if(error){console.warn('[Supabase upsert]',table,error.message);toast('Error al guardar: '+error.message,true);return error;}
    return null;
  }catch(e){
    // Aquí no hubo respuesta: se cayó la red. Antes esto perdía el registro
    // —vivía solo en la copia en memoria y se iba al recargar— y en faena eso
    // es una guardia entera de tareo. Ahora queda en el navegador y se reenvía
    // cuando vuelva la conexión. Ver js/cola.js.
    console.warn('[Supabase]',e);
    if(typeof colaGuardar==='function'&&record&&record.id!==undefined){
      colaGuardar(dbKey,record).then(guardado=>{
        toast(guardado
          ? '⏳ Sin conexión: guardado aquí, se enviará al volver la red'
          : 'Error de conexión con Supabase',!guardado);
      });
    }else toast('Error de conexión con Supabase',true);
    return e;
  }
  finally{_pendingSaves--;}
}

async function supaDelete(dbKey,id){
  const table=SUPA_TABLES[dbKey];if(!table)return;
  try{
    const {data,error}=await supa.from(table).delete().eq('id',+id).select();
    if(error){toast('Error al eliminar: '+error.message,true);return;}
    if(!data||data.length===0){toast('No se encontró en BD (ID:'+id+')',true);}
  }catch(e){toast('Error al eliminar: '+e.message,true);}
}

function syncSheet(action,data){
  const dbKey=ACTION_MAP[action];
  if(dbKey)supaUpsert(dbKey,data);
}

async function supaGuardarRequerimiento(req){
  try{
    const reqData={
      id:req.id, num:req.num, fecha:req.fecha||null,
      proyecto:req.proyecto||null, cod_proy:req.codProy||null,
      solicitante:req.solicitante, area:req.area,
      fecha_ent:req.fechaEnt||null, prioridad:req.prioridad,
      est:req.est, obs:req.obs||'',
      user_email:CU?CU.nombre:'',
      created_at:new Date().toISOString()
    };
    const {data:ret,error:re}=await supa.from('requerimientos').upsert(reqData).select();
    if(re){console.warn('[Req]',re.message);return;}
    const reqId=ret[0].id;
    const localReq=DB.requerimientos.find(r=>r.num===req.num);
    if(localReq)localReq.id=reqId;
    // Borrar ítems anteriores antes de reinsertar para evitar duplicados
    await supa.from('requerimiento_materiales').delete().eq('req_id',reqId);
    for(const item of (req.items||[])){
      if(!item.desc||!item.desc.trim())continue;
      let matId;
      const {data:ex}=await supa.from('materiales').select('id').eq('cod',item.cod).maybeSingle();
      if(ex){
        matId=ex.id;
      }else{
        const {data:nm}=await supa.from('materiales').insert({
          tipo:item.tipo,cod:item.cod,descripcion:item.desc,und:item.und
        }).select();
        if(nm&&nm[0])matId=nm[0].id;
      }
      if(matId){
        await supa.from('requerimiento_materiales').insert({
          req_id:reqId,material_id:matId,cant:item.cant,obs:item.obs||'',tcosto:item.tcosto||''
        });
      }
    }
  }catch(e){console.warn('[Req]',e);}
}

// ══ ACTUALIZAR DATOS SIN CERRAR SESIÓN ══
async function refreshData(){
  if(_pendingSaves>0){
    toast('Guardando cambios pendientes...');
    let waited=0;
    while(_pendingSaves>0&&waited<8000){await new Promise(r=>setTimeout(r,150));waited+=150;}
  }
  const btn=document.getElementById('btnRefresh');
  if(btn){btn.classList.add('spinning');btn.disabled=true;}
  try{await loadSheetsData();}finally{
    if(btn){btn.classList.remove('spinning');btn.disabled=false;}
  }
}

// ══ CARGA INICIAL DESDE SUPABASE ══
async function loadSheetsData(){
  try{
    // Carga paginada en bloques de 1000 hasta traer todo.
    // Supabase corta CUALQUIER select en 1000 filas: si una tabla las supera y no
    // se pagina, las filas que faltan simplemente no llegan y parece que los datos
    // "no se guardaron" (le pasó a roster_ovr al llegar a 1364 registros).
    // Por eso TODAS las tablas se cargan así: la segunda petición solo se hace
    // cuando la primera devuelve exactamente 1000, así que no cuesta nada extra.
    // Columnas que pesan mucho y casi nunca se miran al entrar. Se dejan
    // fuera de la carga inicial y se piden cuando de verdad hacen falta:
    //   materiales.imagen        1.8 MB  ·  274 fotos en base64
    //   edp_proveedores.detalle  450 KB  ·  el detalle de cada EDP
    // Entre las dos eran 2.2 MB de los 10 que se descargaban siempre.
    // Las trae cargarColumnaDiferida() al abrir la pantalla que las usa.
    const cargarPaginado=async tabla=>{
      const omitir=SUPA_DIFERIDAS[tabla];
      let cols='*';
      if(omitir){
        // Se preguntan las columnas al servidor en vez de listarlas aqui: si
        // manana se agrega una, se carga sola y nadie tiene que acordarse.
        const{data:una}=await supa.from(tabla).select('*').limit(1);
        if(una&&una.length)
          cols=Object.keys(una[0]).filter(c=>!omitir.includes(c)).join(',');
      }
      let all=[],from=0,pageSize=1000,err=null;
      while(true){
        const{data,error}=await supa.from(tabla).select(cols).range(from,from+pageSize-1).order('id');
        if(error){console.warn('[loadPaginado]',tabla,error.message);err=error;break;}
        if(!data||data.length===0)break;
        all=all.concat(data);
        if(data.length<pageSize)break;
        from+=pageSize;
      }
      return{data:all,error:err};
    };
    // Solo las tablas de lo que esta empresa contrató. Un cliente que no
    // compró Control de Proyecto no tiene por qué descargar las quince tablas
    // del Last Planner cada vez que alguien entra. Con todo contratado —el
    // caso de siempre— la lista sale igual de larga que antes.
    // Quién necesita qué lo declara js/registro.js.
    const _tablasDelPlan=gdarTablas();
    const simpleKeys=Object.keys(SUPA_TABLES).filter(k=>
      k!=='requerimientos'&&k!=='asistencia'&&k!=='almacen'&&_tablasDelPlan.has(k));
    const results=await Promise.all(
      simpleKeys.map(dbKey=>
        cargarPaginado(SUPA_TABLES[dbKey]).then(({data,error})=>({dbKey,data,error}))
      )
    );
    const nxMap={personal:'personal',social:'social',residencia:'res',
      alimentacion:'ali',hospedaje:'hosp',lavanderia:'lav',almacen:'alm',
      combustible:'comb',supervision:'super',incidentes:'inc',petar:'pet',
      ambiental:'amb',equipos:'eq',mantenimientos:'mant',planner:'plan',
      facturas:'fact',costos:'cost',frentesTrabajo:'ft',tipoMaterial:'tm',
      tramos:'tr',catalogoItems:'cat',facturasPago:'fpago',proyectos:'proy',auxiliosMecanicos:'auxMec',auxMecInsumos:'auxMecIns',engrase:'eng',tareaje:'tar',subtiposEquipo:'sub',planillaMes:'plm',
      lpsWbs:'lpsW',lpsLookahead:'lpsL',lpsPlanSemanal:'lpsP',lpsRestricciones:'lpsR',lpsWbsRecursos:'lpsWbsR',lpsSectores:'lpsS',pizarraItems:'piz',lpsWbsDeps:'lpsDep',capas:'cap',planDibujos:'pld',rosterConfig:'rc',rosterOvr:'rovr',capasAvance:'cav',personalRosterCfg:'prc',seguimiento:'seg',ventas:'vent',reembolsables:'reemb',histogramaPlan:'hpl',cursos:'cur',cursosPersonal:'curp',renta5ta:'r5',renta5taCfg:'r5c',ventaPersonal:'vper',viaticos:'via',wbsAvance:'wav',wbsMapa:'wmap',afpTasas:'afpt',atencionRecursos:'arec',planillaCierre:'plcc',planillaCerrada:'plc'};
    let loaded=false;
    results.forEach(({dbKey,data,error})=>{
      if(!error&&data&&data.length>0){
        DB[dbKey]=data.map(toCamel);
        const nk=nxMap[dbKey];
        if(nk&&DB.nx[nk]!==undefined)
          DB.nx[nk]=Math.max(...DB[dbKey].map(r=>+r.id||0))+1;
        loaded=true;
      }
    });
    const {data:reqs,error:reqErr}=await supa
      .from('requerimientos').select('*, requerimiento_materiales(id,cant,obs,tcosto,materiales(id,tipo,cod,descripcion,und))');
    if(!reqErr&&reqs&&reqs.length>0){
      DB.requerimientos=reqs.map(r=>{
        const rec=toCamel(r);
        rec.items=(r.requerimiento_materiales||[]).map(rm=>({
          id:rm.id, materialId:rm.material_id||rm.materiales?.id,
          tipo:rm.materiales?.tipo||'', cod:rm.materiales?.cod||'',
          desc:rm.materiales?.descripcion||'', und:rm.materiales?.und||'',
          cant:rm.cant, obs:rm.obs||'', tcosto:rm.tcosto||''
        }));
        delete rec.requerimientoMateriales;
        return rec;
      });
      DB.nx.req=Math.max(...DB.requerimientos.map(r=>+r.id||0))+1;
      loaded=true;
    }
    // Carga inicial almacén: últimos 60 días
    await cargarAlmacen(false);
    if(loaded){renderPage(AP);recalcularEstadosRQ();toast('✓ Datos cargados');}
  }catch(e){console.warn('Supabase load error:',e);}
}
async function cargarAlmacen(rerender=true){
  const sel=document.getElementById('almPeriodoSel');
  const dias=sel?+sel.value:60;
  const lbl=document.getElementById('almPeriodoLbl');
  if(lbl)lbl.textContent='⏳ Cargando...';
  try{
    let q=supa.from('almacen').select('*').order('fecha',{ascending:false}).order('id',{ascending:false});
    if(dias>0){
      const desde=new Date();desde.setDate(desde.getDate()-dias);
      const desdeStr=desde.toISOString().slice(0,10);
      q=q.gte('fecha',desdeStr);
    }
    // paginación para traer todos los registros del período
    let all=[],from=0,done=false;
    while(!done){
      const{data,error}=await q.range(from,from+999);
      if(error||!data||data.length===0){done=true;break;}
      all=all.concat(data);
      if(data.length<1000)done=true;else from+=1000;
    }
    DB.almacen=all.map(toCamel);
    DB.nx.alm=DB.almacen.length?Math.max(...DB.almacen.map(r=>+r.id||0))+1:1;
    if(lbl){
      const txt=dias===0?'Todo el historial':`Últimos ${dias} días · ${DB.almacen.length} registros`;
      lbl.textContent=txt;
    }
    if(rerender)rAlm();
  }catch(e){
    console.warn('Error cargando almacén:',e);
    if(lbl)lbl.textContent='⚠ Error al cargar';
  }
}
// ══ SEED DEMO DATA TO SUPABASE (ejecutar una sola vez desde consola) ══
async function seedSupabase(){
  console.log('[Seed] Iniciando carga de datos demo...');
  async function ins(dbKey){
    const records=DB[dbKey];
    if(!records||!records.length){console.log('[Seed] Vacío:',dbKey);return;}
    const {error}=await supa.from(SUPA_TABLES[dbKey]).upsert(records.map(toSnake));
    if(error)console.warn('[Seed]',dbKey,error.message);
    else console.log('[Seed] OK:',dbKey,'→',records.length,'registros');
  }
  // 1° tablas sin dependencias
  for(const k of ['personal','social','residencia','alimentacion','hospedaje',
    'lavanderia','almacen','supervision','incidentes','petar','ambiental',
    'equipos','planner','facturas','costos','frentesTrabajo','tipoMaterial','tramos']) await ins(k);
  // 2° catálogo maestro de materiales
  await ins('catalogoItems');
  // 3° requerimientos + requerimiento_materiales
  for(const req of DB.requerimientos){
    const reqData={id:req.id,num:req.num,fecha:req.fecha||null,
      proyecto:req.proyecto||null,
      solicitante:req.solicitante,area:req.area,fecha_ent:req.fechaEnt||null,
      prioridad:req.prioridad,est:req.est,obs:req.obs||'',
      user_email:'Seed inicial',created_at:new Date().toISOString()};
    const {error:re}=await supa.from('requerimientos').upsert(reqData);
    if(re){console.warn('[Seed] requerimientos',re.message);continue;}
    for(let i=0;i<(req.items||[]).length;i++){
      const it=req.items[i];
      if(!it.desc||!it.desc.trim())continue;
      let matId;
      const {data:ex}=await supa.from('materiales').select('id').eq('cod',it.cod).maybeSingle();
      if(ex){matId=ex.id;}
      else{
        const {data:nm}=await supa.from('materiales').insert({
          tipo:it.tipo,cod:it.cod,descripcion:it.desc,und:it.und
        }).select();
        if(nm&&nm[0])matId=nm[0].id;
      }
      if(matId){
        await supa.from('requerimiento_materiales').upsert({
          id:req.id*100+i+1,req_id:req.id,material_id:matId,cant:it.cant,obs:it.obs||'',tcosto:it.tcosto||''
        });
      }
    }
    console.log('[Seed] OK: req',req.id,'→',req.items?.length||0,'materiales');
  }
  // 4° tablas con FK a equipos o requerimientos
  for(const k of ['combustible','mantenimientos','partes','facturasPago']) await ins(k);
  console.log('[Seed] ✓ Completado');
  toast('✓ Datos demo cargados en Supabase');
}

// ══ DB ══
const DB={
  personal:[],social:[],residencia:[],alimentacion:[],hospedaje:[],lavanderia:[],
  almacen:[],requerimientos:[],facturasPago:[],combustible:[],supervision:[],
  incidentes:[],petar:[],ambiental:[],equipos:[],partes:[],mantenimientos:[],
  planner:[],facturas:[],costos:[],frentesTrabajo:[],tipoMaterial:[],tramos:[],
  catalogoItems:[],unidades:[],asistencia:[],proyectos:[],auxiliosMecanicos:[],auxMecInsumos:[],engrase:[],tareaje:[],subtiposEquipo:[],histogramaPlan:[],planillaMes:[],
  lpsWbs:[],lpsLookahead:[],lpsPlanSemanal:[],lpsRestricciones:[],lpsConfig:[],lpsWbsRecursos:[],lpsSectores:[],pizarraItems:[],lpsWbsDeps:[],capas:[],planDibujos:[],rosterConfig:[],rosterOvr:[],capasAvance:[],personalRosterCfg:[],seguimiento:[],tarifasEq:[],ventas:[],reembolsables:[],codigoReemb:[],recElementos:[],recElemCapas:[],recPlanos:[],edpProveedores:[],firmas:[],salidaEquipos:[],cursos:[],cursosPersonal:[],renta5ta:[],renta5taCfg:[],ventaPersonal:[],viaticos:[],wbsAvance:[],wbsMapa:[],afpTasas:[],atencionRecursos:[],planillaCierre:[],planillaCerrada:[],valPresupuesto:[],
  nx:{personal:1,social:1,res:1,ali:1,hosp:1,lav:1,alm:1,comb:1,super:1,inc:1,pet:1,amb:1,eq:1,mant:1,plan:1,fact:1,cost:1,ft:1,tm:1,tr:1,req:1,fpago:1,cat:1,und:1,proy:1,auxMec:1,auxMecIns:1,eng:1,tar:1,sub:1,plm:1,lpsW:1,lpsL:1,lpsP:1,lpsR:1,lpsWbsR:1,lpsS:1,piz:1,lpsDep:1,cap:1,pld:1,rc:1,rovr:1,cav:1,prc:1,seg:1,teq:1,vent:1,reemb:1,hpl:1,relem:1,relc:1,rpl:1,edpp:1,frm:1,sleq:1,cur:1,curp:1,r5:1,r5c:1,vper:1,via:1,wav:1,wmap:1,afpt:1,plcc:1,plc:1,arec:1}
};

// ══ STATE ══
let CU=null,AP='dashboard';

// Devuelve true si el usuario actual tiene el módulo en modo solo lectura
function isModuleReadOnly(key){
  if(!CU)return false;
  return (CU.readOnlyModules||[]).includes(key);
}