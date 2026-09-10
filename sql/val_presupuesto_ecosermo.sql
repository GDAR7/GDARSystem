-- ══ EL CONTRATO DE ECOSERMO ═════════════════════════════════════════════════
--  RELAVERA R3 COTA 4416 · ETAPA 2 FASE 4
--
-- Se ejecuta SOLO en la base de ECOSERMO. NO va en supabase/migrations/: esas
-- se aplican a todos los clientes, y el contrato de una empresa no tiene nada
-- que hacer en la base de otra.
--
-- Sale de lo que hasta hoy estaba escrito en js/valPresupuesto.js, generado y
-- comprobado partida por partida: las 128 vuelven identicas, con sus decimales.
-- Estas cifras terminan en una factura al cliente.
--
-- Es idempotente: borra y vuelve a insertar, asi que puede correrse otra vez
-- si el contrato cambia por una adenda.

begin;

delete from public.val_presupuesto;

insert into public.val_presupuesto (orden,t,item,descripcion,und,cant,pu,pres,niv,sec,mod,src) values (1,'s',null,'COSTO DIRECTO',null,null,null,22522290.9,null,'CD',null,null);
insert into public.val_presupuesto (orden,t,item,descripcion,und,cant,pu,pres,niv,sec,mod,src) values (2,'g','1.0','PRELIMINARES',null,null,null,209619.32,1,null,null,null);
insert into public.val_presupuesto (orden,t,item,descripcion,und,cant,pu,pres,niv,sec,mod,src) values (3,'g','1.01','Movilización y desmovilización de equipos',null,null,null,132168.72,2,null,null,null);
insert into public.val_presupuesto (orden,t,item,descripcion,und,cant,pu,pres,niv,sec,mod,src) values (4,'p','1.0.01.01','Movilización de Excavadora, EXC ECOP-001','vje',1,7000,14000,null,null,null,'{"t":"manual"}'::jsonb);
insert into public.val_presupuesto (orden,t,item,descripcion,und,cant,pu,pres,niv,sec,mod,src) values (5,'p','1.0.01.02','Movilización de Excavadora, EXC ECOP-002','vje',1,7000,14000,null,null,null,'{"t":"manual"}'::jsonb);
insert into public.val_presupuesto (orden,t,item,descripcion,und,cant,pu,pres,niv,sec,mod,src) values (6,'p','1.0.01.03','Movilización de Tractor oruga, TOR ECOP-001','vje',1,7000,14000,null,null,null,'{"t":"manual"}'::jsonb);
insert into public.val_presupuesto (orden,t,item,descripcion,und,cant,pu,pres,niv,sec,mod,src) values (7,'p','1.0.01.04','Movilización de Retroexcavadora, RET ECO-001','vje',1,7000,14000,null,null,null,'{"t":"manual"}'::jsonb);
insert into public.val_presupuesto (orden,t,item,descripcion,und,cant,pu,pres,niv,sec,mod,src) values (8,'p','1.0.01.05','Movilización de Motoniveladora, MOT ECOP-001','vje',1,7000,14000,null,null,null,'{"t":"manual"}'::jsonb);
insert into public.val_presupuesto (orden,t,item,descripcion,und,cant,pu,pres,niv,sec,mod,src) values (9,'p','1.0.01.06','Movilización de Rodillo 19 Ton, ROD ECOP-001','vje',1,7000,14000,null,null,null,'{"t":"manual"}'::jsonb);
insert into public.val_presupuesto (orden,t,item,descripcion,und,cant,pu,pres,niv,sec,mod,src) values (10,'p','1.0.01.07','Movilización de Cargador frontal 966, CFO-001','vje',1,7000,7000,null,null,null,'{"t":"manual"}'::jsonb);
insert into public.val_presupuesto (orden,t,item,descripcion,und,cant,pu,pres,niv,sec,mod,src) values (11,'p','1.0.01.08','Movilización de Camión volquete 15 m3, VOL ECOP-001','vje',1,1500,1500,null,null,null,'{"t":"manual"}'::jsonb);
insert into public.val_presupuesto (orden,t,item,descripcion,und,cant,pu,pres,niv,sec,mod,src) values (12,'p','1.0.01.09','Movilización de Camión volquete 15 m3, VOL ECOP-002','vje',1,1500,1500,null,null,null,'{"t":"manual"}'::jsonb);
insert into public.val_presupuesto (orden,t,item,descripcion,und,cant,pu,pres,niv,sec,mod,src) values (13,'p','1.0.01.10','Movilización de Camión volquete 15 m3, VOL ECOP-003','vje',1,1500,1500,null,null,null,'{"t":"manual"}'::jsonb);
insert into public.val_presupuesto (orden,t,item,descripcion,und,cant,pu,pres,niv,sec,mod,src) values (14,'g','1.02','Movilización de Oficinas y Almacenes',null,null,null,10000,2,null,null,null);
insert into public.val_presupuesto (orden,t,item,descripcion,und,cant,pu,pres,niv,sec,mod,src) values (15,'p','1.02.01','Movilización de oficinas','vje',2,2500,5000,null,null,null,'{"t":"manual"}'::jsonb);
insert into public.val_presupuesto (orden,t,item,descripcion,und,cant,pu,pres,niv,sec,mod,src) values (16,'g','2.0','OPERACIÓN EQUIPOS',null,null,null,16684984.73,1,null,null,null);
insert into public.val_presupuesto (orden,t,item,descripcion,und,cant,pu,pres,niv,sec,mod,src) values (17,'g','2.01','Equipos de línea amarilla y blanca',null,null,null,15677087.33,2,null,null,null);
insert into public.val_presupuesto (orden,t,item,descripcion,und,cant,pu,pres,niv,sec,mod,src) values (18,'g',null,'Excavadoras',null,null,null,5053690.88,3,null,null,null);
insert into public.val_presupuesto (orden,t,item,descripcion,und,cant,pu,pres,niv,sec,mod,src) values (19,'p','2.0.1.1.b','Excavadora EXC ECOP-001 (HE)','hm',null,383.32,null,null,null,null,'{"t":"eqHE","eq":"EXC ECOP-001"}'::jsonb);
insert into public.val_presupuesto (orden,t,item,descripcion,und,cant,pu,pres,niv,sec,mod,src) values (20,'p','2.0.1.1.c','Excavadora EXC ECOP-001 (SB)','hm',null,253.45,null,null,null,null,'{"t":"manual","sb":1}'::jsonb);
insert into public.val_presupuesto (orden,t,item,descripcion,und,cant,pu,pres,niv,sec,mod,src) values (21,'p','2.01.2.a','Excavadora EXC ECOP-002 (HE)','hm',null,383.32,null,null,null,null,'{"t":"eqHE","eq":"EXC ECOP-002"}'::jsonb);
insert into public.val_presupuesto (orden,t,item,descripcion,und,cant,pu,pres,niv,sec,mod,src) values (22,'p','2.01.2.b','Excavadora EXC ECOP-002 (SB)','hm',null,253.45,null,null,null,null,'{"t":"manual","sb":1}'::jsonb);
insert into public.val_presupuesto (orden,t,item,descripcion,und,cant,pu,pres,niv,sec,mod,src) values (23,'g',null,'Tractores',null,null,null,3142379.89,3,null,null,null);
insert into public.val_presupuesto (orden,t,item,descripcion,und,cant,pu,pres,niv,sec,mod,src) values (24,'p','2.01.5.1 a','Tractor Oruga D6 TOR ECOP-001 (HE)','hm',null,363.47,null,null,null,null,'{"t":"eqHE","eq":"TOR ECOP-001"}'::jsonb);
insert into public.val_presupuesto (orden,t,item,descripcion,und,cant,pu,pres,niv,sec,mod,src) values (25,'p','2.01.5.1 b','Tractor Oruga D6 TOR ECOP-001 (SB)','hm',null,237.5,null,null,null,null,'{"t":"manual","sb":1}'::jsonb);
insert into public.val_presupuesto (orden,t,item,descripcion,und,cant,pu,pres,niv,sec,mod,src) values (26,'g',null,'Retroexcavadoras',null,null,null,796799.64,3,null,null,null);
insert into public.val_presupuesto (orden,t,item,descripcion,und,cant,pu,pres,niv,sec,mod,src) values (27,'p','2.01.6 a','Retroexcavadora RET ECO-001 (HE)','hm',null,155.96,null,null,null,null,'{"t":"eqHE","eq":"RET ECO-001"}'::jsonb);
insert into public.val_presupuesto (orden,t,item,descripcion,und,cant,pu,pres,niv,sec,mod,src) values (28,'p','2.01.6 b','Retroexcavadora RET ECO-001 (SB)','hm',null,105.45,null,null,null,null,'{"t":"manual","sb":1}'::jsonb);
insert into public.val_presupuesto (orden,t,item,descripcion,und,cant,pu,pres,niv,sec,mod,src) values (29,'g',null,'Motoniveladoras',null,null,null,876216.28,3,null,null,null);
insert into public.val_presupuesto (orden,t,item,descripcion,und,cant,pu,pres,niv,sec,mod,src) values (30,'p','2.01.7 a','Motoniveladora 140H - MOT ECOP-001 (HE)','hm',null,299.92,null,null,null,null,'{"t":"eqHE","eq":"MOT ECOP-001"}'::jsonb);
insert into public.val_presupuesto (orden,t,item,descripcion,und,cant,pu,pres,niv,sec,mod,src) values (31,'p','2.01.7 b','Motoniveladora 140H - MOT ECOP-001 (SB)','hm',null,222,null,null,null,null,'{"t":"manual","sb":1}'::jsonb);
insert into public.val_presupuesto (orden,t,item,descripcion,und,cant,pu,pres,niv,sec,mod,src) values (32,'g',null,'Rodillo',null,null,null,1161264.22,3,null,null,null);
insert into public.val_presupuesto (orden,t,item,descripcion,und,cant,pu,pres,niv,sec,mod,src) values (33,'p','2.01.10 a','Rodillo 19 Ton - ROD ECOP-001 (HE)','hm',null,227.32,null,null,null,null,'{"t":"eqHE","eq":"ROD ECOP-001"}'::jsonb);
insert into public.val_presupuesto (orden,t,item,descripcion,und,cant,pu,pres,niv,sec,mod,src) values (34,'p','2.01.10 b','Rodillo 19 Ton - ROD ECOP-001 (SB)','hm',null,171,null,null,null,null,'{"t":"manual","sb":1}'::jsonb);
insert into public.val_presupuesto (orden,t,item,descripcion,und,cant,pu,pres,niv,sec,mod,src) values (35,'g',null,'Cargador frontal',null,null,null,509836.5,3,null,null,null);
insert into public.val_presupuesto (orden,t,item,descripcion,und,cant,pu,pres,niv,sec,mod,src) values (36,'p','2.01.30.a','Cargador frontal 966 - CFO-001 (HE)','hm',null,318.25,null,null,null,null,'{"t":"eqHE","eq":"CFO-001"}'::jsonb);
insert into public.val_presupuesto (orden,t,item,descripcion,und,cant,pu,pres,niv,sec,mod,src) values (37,'p','2.01.30 b','Cargador frontal 966 - CFO-001 (SB)','hm',null,258.4,null,null,null,null,'{"t":"manual","sb":1}'::jsonb);
insert into public.val_presupuesto (orden,t,item,descripcion,und,cant,pu,pres,niv,sec,mod,src) values (38,'g',null,'Camión volquetes',null,null,null,4136899.92,3,null,null,null);
insert into public.val_presupuesto (orden,t,item,descripcion,und,cant,pu,pres,niv,sec,mod,src) values (39,'p','2.01.14.a','Camión volquete 15 m3 - VOL ECOP-001 (HE) · CCF-852','hm',null,153.48,null,null,null,null,'{"t":"eqHE","eq":"VOL ECOP-001"}'::jsonb);
insert into public.val_presupuesto (orden,t,item,descripcion,und,cant,pu,pres,niv,sec,mod,src) values (40,'p','2.01.14.b','Camión volquete 15 m3 - VOL ECOP-001 (SB) · CCF-852','hm',null,107.3,null,null,null,null,'{"t":"manual","sb":1}'::jsonb);
insert into public.val_presupuesto (orden,t,item,descripcion,und,cant,pu,pres,niv,sec,mod,src) values (41,'p','2.01.16.a','Camión volquete 15 m3 - VOL ECOP-002 (HE) · BLS-845','hm',null,153.48,null,null,null,null,'{"t":"eqHE","eq":"VOL ECOP-002"}'::jsonb);
insert into public.val_presupuesto (orden,t,item,descripcion,und,cant,pu,pres,niv,sec,mod,src) values (42,'p','2.01.16.b','Camión volquete 15 m3 - VOL ECOP-002 (SB) · BLS-845','hm',null,107.3,null,null,null,null,'{"t":"manual","sb":1}'::jsonb);
insert into public.val_presupuesto (orden,t,item,descripcion,und,cant,pu,pres,niv,sec,mod,src) values (43,'p','2.01.22.a','Camión volquete 15 m3 - VOL ECOP-003 (HE) · BZN-912','hm',null,153.48,null,null,null,null,'{"t":"eqHE","eq":"VOL ECOP-003"}'::jsonb);
insert into public.val_presupuesto (orden,t,item,descripcion,und,cant,pu,pres,niv,sec,mod,src) values (44,'p','2.01.22.b','Camión volquete 15 m3 - VOL ECOP-003 (SB) · BZN-912','hm',null,107.3,null,null,null,null,'{"t":"manual","sb":1}'::jsonb);
insert into public.val_presupuesto (orden,t,item,descripcion,und,cant,pu,pres,niv,sec,mod,src) values (45,'g','2.02','Equipos de soporte',null,null,null,1007897.4,2,null,null,null);
insert into public.val_presupuesto (orden,t,item,descripcion,und,cant,pu,pres,niv,sec,mod,src) values (46,'p','2.02.1','Cisterna de agua 5000 gln','mes',2,28773.2,293486.64,null,null,null,'{"t":"eqMes","match":"CISTERNA DE AGUA"}'::jsonb);
insert into public.val_presupuesto (orden,t,item,descripcion,und,cant,pu,pres,niv,sec,mod,src) values (47,'p','2.02.2','Cisterna de comb 1000 gln','mes',2,14773.2,88639.2,null,null,null,'{"t":"eqMes","match":"CISTERNA DE COMBUSTIBLE"}'::jsonb);
insert into public.val_presupuesto (orden,t,item,descripcion,und,cant,pu,pres,niv,sec,mod,src) values (48,'p','2.02.3','Couster','mes',8,18022.2,446950.56,null,null,null,'{"t":"eqMes","match":"COASTER"}'::jsonb);
insert into public.val_presupuesto (orden,t,item,descripcion,und,cant,pu,pres,niv,sec,mod,src) values (49,'p','2.02.4','Camioneta 4x4','mes',8,9934.5,178821,null,null,null,'{"t":"eqMes","match":"CAMIONETA"}'::jsonb);
insert into public.val_presupuesto (orden,t,item,descripcion,und,cant,pu,pres,niv,sec,mod,src) values (50,'g','3.0','OPERACIÓN MANO DE OBRA',null,null,null,5567731.54,1,null,null,null);
insert into public.val_presupuesto (orden,t,item,descripcion,und,cant,pu,pres,niv,sec,mod,src) values (51,'g','3.01','MANO DE OBRA DIRECTA',null,null,null,2573763.57,2,null,1,null);
insert into public.val_presupuesto (orden,t,item,descripcion,und,cant,pu,pres,niv,sec,mod,src) values (52,'p','3.01.01','Operario Movimiento Tierras','mes',8,5226.8,251390.4,null,null,1,'{"t":"cargo","cargo":"OPERARIO DE MOVIMIENTO DE TIERRAS"}'::jsonb);
insert into public.val_presupuesto (orden,t,item,descripcion,und,cant,pu,pres,niv,sec,mod,src) values (53,'p','3.01.02','Oficial Movimiento Tierras','mes',5,5226.8,149433,null,null,1,'{"t":"cargo","cargo":"OFICIAL DE MOVIMIENTO DE TIERRAS"}'::jsonb);
insert into public.val_presupuesto (orden,t,item,descripcion,und,cant,pu,pres,niv,sec,mod,src) values (54,'p','3.01.03','Operario Obras Civiles','mes',3,4970.6,94271.4,null,null,1,'{"t":"cargo","cargo":"OPERARIO OBRAS CIVILES"}'::jsonb);
insert into public.val_presupuesto (orden,t,item,descripcion,und,cant,pu,pres,niv,sec,mod,src) values (55,'p','3.01.04','Vigía','mes',13,4970.6,368542.2,null,null,1,'{"t":"cargo","cargo":"VIGIA"}'::jsonb);
insert into public.val_presupuesto (orden,t,item,descripcion,und,cant,pu,pres,niv,sec,mod,src) values (56,'p','3.01.05','Peón','mes',56,4714.4,1587566.4,null,null,1,'{"t":"cargo","cargo":"PEON"}'::jsonb);
insert into public.val_presupuesto (orden,t,item,descripcion,und,cant,pu,pres,niv,sec,mod,src) values (57,'p','3.01.06','Herramientas manuales 5% (MOD)','%MO',0.05,0,122560.17,null,null,null,'{"t":"pctMOD","pct":5}'::jsonb);
insert into public.val_presupuesto (orden,t,item,descripcion,und,cant,pu,pres,niv,sec,mod,src) values (58,'g','3.02','MANO DE OBRA CALIFICADA',null,null,null,741358.69,2,null,null,null);
insert into public.val_presupuesto (orden,t,item,descripcion,und,cant,pu,pres,niv,sec,mod,src) values (59,'g','3.02.01','OPERADORES EQUIPOS LIVIANOS',null,null,null,741358.69,3,null,null,null);
insert into public.val_presupuesto (orden,t,item,descripcion,und,cant,pu,pres,niv,sec,mod,src) values (60,'p','3.02.01.01','Operador de camioneta','mes',12,4782.9,57394.8,null,null,null,'{"t":"cargo","cargo":"COND. DE CAMIONETA"}'::jsonb);
insert into public.val_presupuesto (orden,t,item,descripcion,und,cant,pu,pres,niv,sec,mod,src) values (61,'p','3.02.01.02','Operador de coaster','mes',12,5124.3,61491.6,null,null,null,'{"t":"cargo","cargo":"COND. DE COASTER"}'::jsonb);
insert into public.val_presupuesto (orden,t,item,descripcion,und,cant,pu,pres,niv,sec,mod,src) values (62,'p','3.02.01.03','Operador de Cisterna de combustible','mes',4,5226.8,20907.2,null,null,null,'{"t":"cargo","cargo":"OP. CISTERNA DE COMBUSTIBLE"}'::jsonb);
insert into public.val_presupuesto (orden,t,item,descripcion,und,cant,pu,pres,niv,sec,mod,src) values (63,'p','3.02.01.04','Operador de Cisterna de agua 5000 gln','mes',4,5226.8,20907.2,null,null,null,'{"t":"cargo","cargo":"OP. CISTERNA DE AGUA"}'::jsonb);
insert into public.val_presupuesto (orden,t,item,descripcion,und,cant,pu,pres,niv,sec,mod,src) values (64,'g','3.03','TRANSPORTE DE AGREGADOS Y OTROS MATERIALES',null,null,null,2252609.28,2,null,null,null);
insert into public.val_presupuesto (orden,t,item,descripcion,und,cant,pu,pres,niv,sec,mod,src) values (65,'g','3.03.01','OPERADORES DE LÍNEA AMARILLA Y LÍNEA BLANCA',null,null,null,2252609.28,3,null,null,null);
insert into public.val_presupuesto (orden,t,item,descripcion,und,cant,pu,pres,niv,sec,mod,src) values (66,'p','3.03.01.01','Op Volquete','mes',27,5237.3,848442.6,null,null,null,'{"t":"cargo","cargo":"OP. VOLQUETE"}'::jsonb);
insert into public.val_presupuesto (orden,t,item,descripcion,und,cant,pu,pres,niv,sec,mod,src) values (67,'p','3.03.01.02','Op Excavadora 336','mes',12,6091.4,445890.48,null,null,null,'{"t":"cargo","cargo":"OP. EXCAVADORA"}'::jsonb);
insert into public.val_presupuesto (orden,t,item,descripcion,und,cant,pu,pres,niv,sec,mod,src) values (68,'p','3.03.01.03','Op Cargador F 966','mes',3,6091.4,54822.6,null,null,null,'{"t":"cargo","cargo":"OP. CARGADOR FRONTAL"}'::jsonb);
insert into public.val_presupuesto (orden,t,item,descripcion,und,cant,pu,pres,niv,sec,mod,src) values (69,'p','3.03.01.04','Op Tractor D6T','mes',8,6091.4,292387.2,null,null,null,'{"t":"cargo","cargo":"OP. TRACTOR"}'::jsonb);
insert into public.val_presupuesto (orden,t,item,descripcion,und,cant,pu,pres,niv,sec,mod,src) values (70,'p','3.03.01.05','Op Motoniveladora','mes',3,6091.4,109645.2,null,null,null,'{"t":"cargo","cargo":"OP. MOTONIVELADORA"}'::jsonb);
insert into public.val_presupuesto (orden,t,item,descripcion,und,cant,pu,pres,niv,sec,mod,src) values (71,'p','3.03.01.06','Op Rodillo 19 TN','mes',5,5749.7,172491,null,null,null,'{"t":"cargo","cargo":"OP. RODILLO"}'::jsonb);
insert into public.val_presupuesto (orden,t,item,descripcion,und,cant,pu,pres,niv,sec,mod,src) values (72,'p','3.03.01.07','Op Retroexcavadora','mes',5,5749.7,172491,null,null,null,'{"t":"cargo","cargo":"OP. RETROEXCAVADORA"}'::jsonb);
insert into public.val_presupuesto (orden,t,item,descripcion,und,cant,pu,pres,niv,sec,mod,src) values (73,'p','3.03.01.08','OP Múltiple Línea B (Exc, Retro, Tractor, Moto, Rodillo)','mes',2,6518.3,78219.6,null,null,null,'{"t":"manual"}'::jsonb);
insert into public.val_presupuesto (orden,t,item,descripcion,und,cant,pu,pres,niv,sec,mod,src) values (74,'p','3.03.01.09','OP Múltiple Blanca (Volquete, Cisterna)','mes',2,6518.3,78219.6,null,null,null,'{"t":"manual"}'::jsonb);
insert into public.val_presupuesto (orden,t,item,descripcion,und,cant,pu,pres,niv,sec,mod,src) values (75,'s',null,'COSTO INDIRECTO',null,null,null,3649154.58,null,'CI',null,null);
insert into public.val_presupuesto (orden,t,item,descripcion,und,cant,pu,pres,niv,sec,mod,src) values (76,'g','1','PERSONAL GERENCIA, STAFF, SUPERVISORES, AUXILIARES',null,null,null,3138868.69,1,null,null,null);
insert into public.val_presupuesto (orden,t,item,descripcion,und,cant,pu,pres,niv,sec,mod,src) values (77,'g','1.01','OPERACIÓN',null,null,null,672706.97,2,null,null,null);
insert into public.val_presupuesto (orden,t,item,descripcion,und,cant,pu,pres,niv,sec,mod,src) values (78,'p','1.01.01','Ingeniero Residente','mes',1,20128,160426.25,null,null,null,'{"t":"cargo","cargo":"ING. RESIDENTE"}'::jsonb);
insert into public.val_presupuesto (orden,t,item,descripcion,und,cant,pu,pres,niv,sec,mod,src) values (79,'p','1.01.02','Ingeniero Supervisor','mes',3,16885,319126.5,null,null,null,'{"t":"cargo","cargo":"ING. SUPERVISOR DE CAMPO"}'::jsonb);
insert into public.val_presupuesto (orden,t,item,descripcion,und,cant,pu,pres,niv,sec,mod,src) values (80,'p','1.01.03','Supervisor técnico','mes',3,10219.8,193154.22,null,null,null,'{"t":"cargo","cargo":"SUP. TECNICO"}'::jsonb);
insert into public.val_presupuesto (orden,t,item,descripcion,und,cant,pu,pres,niv,sec,mod,src) values (81,'g','1.02','SEGURIDAD Y MEDIO AMBIENTE',null,null,null,410337.97,2,null,null,null);
insert into public.val_presupuesto (orden,t,item,descripcion,und,cant,pu,pres,niv,sec,mod,src) values (82,'p','1.02.01','Ingeniero Responsable Seguridad y Medio ambiente','mes',1,17612,133328.17,null,null,null,'{"t":"cargo","cargo":"ING. RESP. SEGURIDAD"}'::jsonb);
insert into public.val_presupuesto (orden,t,item,descripcion,und,cant,pu,pres,niv,sec,mod,src) values (83,'p','1.02.02','Ingeniero de Seguridad y Medio ambiente','mes',3,14893,277009.8,null,null,null,'{"t":"cargo","cargo":"INGENIERO DE SEGURIDAD, SALUD Y MEDIO AMBIENTE"}'::jsonb);
insert into public.val_presupuesto (orden,t,item,descripcion,und,cant,pu,pres,niv,sec,mod,src) values (84,'g','1.03','OFICINA TÉCNICA / TOPOGRAFÍA / CONTROL PROYECTO',null,null,null,625298.42,2,null,null,null);
insert into public.val_presupuesto (orden,t,item,descripcion,und,cant,pu,pres,niv,sec,mod,src) values (85,'p','1.03.01','Ingeniero de Control de Proyectos','mes',1,13838,104757.85,null,null,null,'{"t":"cargo","cargo":"ING. CONTROL DE PROYECTO"}'::jsonb);
insert into public.val_presupuesto (orden,t,item,descripcion,und,cant,pu,pres,niv,sec,mod,src) values (86,'p','1.03.02','Ingeniero de Control de Planeamiento','mes',1,13838,85795.6,null,null,null,'{"t":"cargo","cargo":"ING. CONTROL DE PLANEAMIENTO"}'::jsonb);
insert into public.val_presupuesto (orden,t,item,descripcion,und,cant,pu,pres,niv,sec,mod,src) values (87,'p','1.03.03','Administrador de Obra','mes',1,17612,140372.97,null,null,null,'{"t":"cargo","cargo":"ADMINISTRADOR"}'::jsonb);
insert into public.val_presupuesto (orden,t,item,descripcion,und,cant,pu,pres,niv,sec,mod,src) values (88,'p','1.03.04','Asistente Administrativo','mes',1,11322,67932,null,null,null,'{"t":"cargo","cargo":"ASISTENTE ADMINISTRATIVO"}'::jsonb);
insert into public.val_presupuesto (orden,t,item,descripcion,und,cant,pu,pres,niv,sec,mod,src) values (89,'p','1.03.05','Asistenta Social','mes',2,9435,113220,null,null,null,'{"t":"cargo","cargo":"ASISTENTA SOCIAL"}'::jsonb);
insert into public.val_presupuesto (orden,t,item,descripcion,und,cant,pu,pres,niv,sec,mod,src) values (90,'p','1.03.06','Data Enter','mes',2,9435,113220,null,null,null,'{"t":"cargo","cargo":"DATA ENTER"}'::jsonb);
insert into public.val_presupuesto (orden,t,item,descripcion,und,cant,pu,pres,niv,sec,mod,src) values (91,'g','1.04','AUXILIARES',null,null,null,398097.66,2,null,null,null);
insert into public.val_presupuesto (orden,t,item,descripcion,und,cant,pu,pres,niv,sec,mod,src) values (92,'p','1.04.01','Almacenero','mes',2,7548,93595.2,null,null,null,'{"t":"cargo","cargo":"ALMACENERO"}'::jsonb);
insert into public.val_presupuesto (orden,t,item,descripcion,und,cant,pu,pres,niv,sec,mod,src) values (93,'p','1.04.02','Guardián','mes',2,5661,70196.4,null,null,null,'{"t":"cargo","cargo":"GUARDIAN"}'::jsonb);
insert into public.val_presupuesto (orden,t,item,descripcion,und,cant,pu,pres,niv,sec,mod,src) values (94,'p','1.04.03','Controlador de Equipos','mes',3,8823.1,164109.66,null,null,null,'{"t":"cargo","cargo":"CONTROLADOR DE EQUIPOS"}'::jsonb);
insert into public.val_presupuesto (orden,t,item,descripcion,und,cant,pu,pres,niv,sec,mod,src) values (95,'p','1.04.04','Personal Limpieza','mes',2,5661,70196.4,null,null,null,'{"t":"cargo","cargo":"PERSONAL LIMPIEZA"}'::jsonb);
insert into public.val_presupuesto (orden,t,item,descripcion,und,cant,pu,pres,niv,sec,mod,src) values (96,'g','1.05','MANTENIMIENTO',null,null,null,919816.22,2,null,null,null);
insert into public.val_presupuesto (orden,t,item,descripcion,und,cant,pu,pres,niv,sec,mod,src) values (97,'p','1.05.01','Ing. Supervisor de mantenimiento de equipos','mes',1,15590,124257.02,null,null,null,'{"t":"cargo","cargo":"ING. SUPERVISOR DE MANTENIMIENTO"}'::jsonb);
insert into public.val_presupuesto (orden,t,item,descripcion,und,cant,pu,pres,niv,sec,mod,src) values (98,'p','1.05.02','Asistente de Mant. Mecánico','mes',1,11322,70196.4,null,null,null,'{"t":"cargo","cargo":"ASIST. DE EQUIPOS"}'::jsonb);
insert into public.val_presupuesto (orden,t,item,descripcion,und,cant,pu,pres,niv,sec,mod,src) values (99,'p','1.05.03','Mecánicos','mes',6,15096,561571.2,null,null,null,'{"t":"cargo","cargo":"MECANICO"}'::jsonb);
insert into public.val_presupuesto (orden,t,item,descripcion,und,cant,pu,pres,niv,sec,mod,src) values (100,'p','1.05.04','Ayud. Mecánicos','mes',3,8806,163791.6,null,null,null,'{"t":"cargo","cargo":"AYUDANTE MECANICO"}'::jsonb);
insert into public.val_presupuesto (orden,t,item,descripcion,und,cant,pu,pres,niv,sec,mod,src) values (101,'g','1.06','SOPORTE OFICINA CENTRAL',null,null,null,112611.45,2,null,null,null);
insert into public.val_presupuesto (orden,t,item,descripcion,und,cant,pu,pres,niv,sec,mod,src) values (102,'p','1.06.01','Soporte de oficina central, 0.5% del Costo Directo','%CD',0.005,0,112611.45,null,null,null,'{"t":"pctCD","pct":0.5}'::jsonb);
insert into public.val_presupuesto (orden,t,item,descripcion,und,cant,pu,pres,niv,sec,mod,src) values (103,'g','2','SERVICIOS Y LABORATORIOS',null,null,null,118357.47,1,null,null,null);
insert into public.val_presupuesto (orden,t,item,descripcion,und,cant,pu,pres,niv,sec,mod,src) values (104,'p','2.01','Útiles Administrativos y de escritorio','mes',6.57,1200,7884.36,null,null,null,'{"t":"manual"}'::jsonb);
insert into public.val_presupuesto (orden,t,item,descripcion,und,cant,pu,pres,niv,sec,mod,src) values (105,'p','2.02','Laptop''s, tipo I','mes',6.57,450,2956.64,null,null,null,'{"t":"manual"}'::jsonb);
insert into public.val_presupuesto (orden,t,item,descripcion,und,cant,pu,pres,niv,sec,mod,src) values (106,'p','2.03','Laptop''s, tipo II','mes',6.57,300,1971.09,null,null,null,'{"t":"manual"}'::jsonb);
insert into public.val_presupuesto (orden,t,item,descripcion,und,cant,pu,pres,niv,sec,mod,src) values (107,'p','2.04','Impresora','mes',6.57,320,2102.5,null,null,null,'{"t":"manual"}'::jsonb);
insert into public.val_presupuesto (orden,t,item,descripcion,und,cant,pu,pres,niv,sec,mod,src) values (108,'p','2.05','Insumos Limpieza (Oficinas)','mes',6.57,250,1642.58,null,null,null,'{"t":"manual"}'::jsonb);
insert into public.val_presupuesto (orden,t,item,descripcion,und,cant,pu,pres,niv,sec,mod,src) values (109,'p','2.06','Agua Consumo Obra','mes',6.57,1479,9717.48,null,null,null,'{"t":"manual"}'::jsonb);
insert into public.val_presupuesto (orden,t,item,descripcion,und,cant,pu,pres,niv,sec,mod,src) values (110,'p','2.07','Generador 35Kv','mes',6.57,7825,51412.61,null,null,null,'{"t":"manual"}'::jsonb);
insert into public.val_presupuesto (orden,t,item,descripcion,und,cant,pu,pres,niv,sec,mod,src) values (111,'p','2.08','Contenedor 20"','mes',6.57,1500,9855.45,null,null,null,'{"t":"manual"}'::jsonb);
insert into public.val_presupuesto (orden,t,item,descripcion,und,cant,pu,pres,niv,sec,mod,src) values (112,'p','2.09','Implementación de energía en contenedor — Reembolsable','mes',0,2000,0,null,null,null,'{"t":"manual"}'::jsonb);
insert into public.val_presupuesto (orden,t,item,descripcion,und,cant,pu,pres,niv,sec,mod,src) values (113,'g','3','EQUIPOS Y MATERIALES INDIRECTOS',null,null,null,391928.42,1,null,null,null);
insert into public.val_presupuesto (orden,t,item,descripcion,und,cant,pu,pres,niv,sec,mod,src) values (114,'p','3.01','Detector de tormentas','Und',6.57,685,4500.66,null,null,null,'{"t":"manual"}'::jsonb);
insert into public.val_presupuesto (orden,t,item,descripcion,und,cant,pu,pres,niv,sec,mod,src) values (115,'p','3.02','Martillo hidráulico','Und',2,20350,40700,null,null,null,'{"t":"manual"}'::jsonb);
insert into public.val_presupuesto (orden,t,item,descripcion,und,cant,pu,pres,niv,sec,mod,src) values (116,'p','3.03','Motobombas','Und',3,0,0,null,null,null,'{"t":"manual"}'::jsonb);
insert into public.val_presupuesto (orden,t,item,descripcion,und,cant,pu,pres,niv,sec,mod,src) values (117,'p','3.04','Luminarias (eq + combustible)','Und',5.83,4000,186400,null,null,null,'{"t":"eqMes","match":"LUMINARIA"}'::jsonb);
insert into public.val_presupuesto (orden,t,item,descripcion,und,cant,pu,pres,niv,sec,mod,src) values (118,'p','3.05','Vibroapisonadores','Und',5.53,2690,29769.34,null,null,null,'{"t":"eqMes","match":"VIBROAPISONADOR"}'::jsonb);
insert into public.val_presupuesto (orden,t,item,descripcion,und,cant,pu,pres,niv,sec,mod,src) values (119,'p','3.06','Zaranda','Und',3,5000,15000,null,null,null,'{"t":"manual"}'::jsonb);
insert into public.val_presupuesto (orden,t,item,descripcion,und,cant,pu,pres,niv,sec,mod,src) values (120,'p','3.07','Trompo de concreto','Und',3,2350,7050,null,null,null,'{"t":"manual"}'::jsonb);
insert into public.val_presupuesto (orden,t,item,descripcion,und,cant,pu,pres,niv,sec,mod,src) values (121,'p','3.08','Radio para personal y equipo','Und',6,206.25,61875,null,null,null,'{"t":"manual"}'::jsonb);
insert into public.val_presupuesto (orden,t,item,descripcion,und,cant,pu,pres,niv,sec,mod,src) values (122,'p','3.09','Módulo de radio para cargar baterías y radios','Und',6.57,331.32,4353.75,null,null,null,'{"t":"manual"}'::jsonb);
insert into public.val_presupuesto (orden,t,item,descripcion,und,cant,pu,pres,niv,sec,mod,src) values (123,'p','3.10','Vibrador de concreto','Und',3,580,1740,null,null,null,'{"t":"manual"}'::jsonb);
insert into public.val_presupuesto (orden,t,item,descripcion,und,cant,pu,pres,niv,sec,mod,src) values (124,'p','3.11','Estufa eléctrica de 11 celdas','Und',6.57,300,5913.28,null,null,null,'{"t":"manual"}'::jsonb);
insert into public.val_presupuesto (orden,t,item,descripcion,und,cant,pu,pres,niv,sec,mod,src) values (125,'p','3.12','Alcoholímetro','Und',6.57,250,1642.58,null,null,null,'{"t":"manual"}'::jsonb);
insert into public.val_presupuesto (orden,t,item,descripcion,und,cant,pu,pres,niv,sec,mod,src) values (126,'p','3.13','Engrasadora neumática','Und',6.57,350,2299.61,null,null,null,'{"t":"manual"}'::jsonb);
insert into public.val_presupuesto (orden,t,item,descripcion,und,cant,pu,pres,niv,sec,mod,src) values (127,'p','3.14','Compresora de aire','Und',6,1550,9300,null,null,null,'{"t":"manual"}'::jsonb);
insert into public.val_presupuesto (orden,t,item,descripcion,und,cant,pu,pres,niv,sec,mod,src) values (128,'p','3.15','Plancha compactadora','Und',4.55,2350,21384.2,null,null,null,'{"t":"manual"}'::jsonb);

commit;

-- ── Comprobacion ──────────────────────────────────────────────────────────
-- Tienen que salir 128 partidas, y los dos totales del contrato.
select count(*) as partidas,
       count(*) filter (where t='p') as hojas,
       count(*) filter (where src is not null) as con_origen
  from public.val_presupuesto;

select sec, pres from public.val_presupuesto where sec is not null order by orden;
