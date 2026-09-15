-- ══ CONTROL DE COSTOS · COSTO INDIRECTO ════════════════════════════════════
-- Dos tablas:
--   presup_c_indi   el presupuesto META, fijo. Una fila por capítulo, grupo o
--                   partida. Los capítulos (1) y grupos (1.01) no llevan montos:
--                   la aplicación los suma de sus partidas.
--   valor_c_indi    lo valorizado. Una fila por partida y período. El período es
--                   el mes de cierre del 21→20 ('2026-08' = 21/07 al 20/08).
--
-- El "acumulado anterior" no se guarda: es la suma de los períodos previos.
--
-- Carga inicial desde el EDP N°3 (Agosto) del proyecto EPY-004-26:
--   · 53 filas de presupuesto (44 partidas + capítulos y grupos)
--   · '2026-07' = TODO lo valorizado hasta Julio (EDP N°1 + N°2 juntos, porque el
--     EDP N°3 solo trae el acumulado). Con los EDP N°1 y N°2 se puede separar.
--   · '2026-08' = la valorización de Agosto.
--
-- Se puede correr más de una vez: las filas ya cargadas no se duplican.
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists public.presup_c_indi (
  id           bigint primary key,
  proyecto     text   not null,               -- código de proyecto (proyectos.codigo)
  item         text   not null,               -- 1 · 1.01 · 1.01.01
  descripcion  text   not null default '',
  unidad       text,
  cantidad     numeric(14,4),
  precio_unit  numeric(16,4),
  total        numeric(16,2),                 -- tal cual el presupuesto: no siempre es cant × P.U.
  created_at   timestamptz not null default now(),
  unique (proyecto, item)
);

create table if not exists public.valor_c_indi (
  id           bigint primary key,
  partida_id   bigint not null references public.presup_c_indi(id) on delete cascade,
  periodo      text   not null check (periodo ~ '^[0-9]{4}-[0-9]{2}$'),
  cantidad     numeric(14,4),
  total        numeric(16,2),
  total_manual boolean not null default false, -- true = el total no es cantidad × P.U.
  creado_por   text,
  created_at   timestamptz not null default now(),
  -- Una sola valorización por partida y período: si dos personas la cargan a la
  -- vez, la segunda recibe un error en vez de dejar una fila duplicada.
  unique (partida_id, periodo)
);
create index if not exists ix_valor_c_indi_periodo on public.valor_c_indi (periodo);

-- ── Seguridad: igual que las otras tablas (sql/rls_cerrar.sql) ─────────────
alter table public.presup_c_indi enable row level security;
alter table public.valor_c_indi  enable row level security;
drop policy if exists gdar_autenticado on public.presup_c_indi;
drop policy if exists gdar_autenticado on public.valor_c_indi;
create policy gdar_autenticado on public.presup_c_indi
  for all to authenticated using (true) with check (true);
create policy gdar_autenticado on public.valor_c_indi
  for all to authenticated using (true) with check (true);
grant select, insert, update, delete on public.presup_c_indi, public.valor_c_indi to authenticated;

-- ── Presupuesto meta ───────────────────────────────────────────────────────
insert into public.presup_c_indi (id, proyecto, item, descripcion, unidad, cantidad, precio_unit, total) values
  (1, 'EPY-004-26', '1', 'PERSONAL GERENCIA, STAFF, SUPERVISORES, AUXILIARES', null, null, null, null),
  (2, 'EPY-004-26', '1.01', 'OPERACIÓN', null, null, null, null),
  (3, 'EPY-004-26', '1.01.01', 'Ingeniero Residente', 'mes', 1, 20128, 160426.25),
  (4, 'EPY-004-26', '1.01.02', 'Ingeniero Supervisor', 'mes', 3, 16885, 319126.5),
  (5, 'EPY-004-26', '1.01.03', 'Supervisor técnico', 'mes', 3, 10219.8, 193154.22),
  (6, 'EPY-004-26', '1.02', 'SEGURIDAD Y MEDIO AMBIENTE', null, null, null, null),
  (7, 'EPY-004-26', '1.02.01', 'Ingeniero Responsable Seguridad y Medio ambiente', 'mes', 1, 17612, 133328.17),
  (8, 'EPY-004-26', '1.02.02', 'Ingeniero de Seguridad y Medio ambiente', 'mes', 3, 14893, 277009.8),
  (9, 'EPY-004-26', '1.03', 'OFICINA TÉCNICA / TOPOGRAFÍA / CONTROL PROYECTO', null, null, null, null),
  (10, 'EPY-004-26', '1.03.01', 'Ingeniero de Control de Proyectos', 'mes', 1, 13838, 104757.85),
  (11, 'EPY-004-26', '1.03.02', 'Ingeniero de Control de Planeamiento', 'mes', 1, 13838, 85795.6),
  (12, 'EPY-004-26', '1.03.03', 'Administrador de Obra', 'mes', 1, 17612, 140372.97),
  (13, 'EPY-004-26', '1.03.04', 'Asistente Administrativo', 'mes', 1, 11322, 67932),
  (14, 'EPY-004-26', '1.03.05', 'Asistenta Social', 'mes', 2, 9435, 113220),
  (15, 'EPY-004-26', '1.03.06', 'Data Enter', 'mes', 2, 9435, 113220),
  (16, 'EPY-004-26', '1.04', 'AUXILIARES', null, null, null, null),
  (17, 'EPY-004-26', '1.04.01', 'Almacenero', 'mes', 2, 7548, 93595.2),
  (18, 'EPY-004-26', '1.04.02', 'Guardian', 'mes', 2, 5661, 70196.4),
  (19, 'EPY-004-26', '1.04.03', 'Controlador de Equipos', 'mes', 3, 8823.1, 164109.66),
  (20, 'EPY-004-26', '1.04.04', 'Personal Limpieza', 'mes', 2, 5661, 70196.4),
  (21, 'EPY-004-26', '1.05', 'MANTENIMIENTO', null, null, null, null),
  (22, 'EPY-004-26', '1.05.01', 'Ing. Supervisor de mantenimiento de equipos', 'mes', 1, 15590, 124257.02),
  (23, 'EPY-004-26', '1.05.02', 'Asistente de Mant. Mecánico', 'mes', 1, 11322, 70196.4),
  (24, 'EPY-004-26', '1.05.03', 'Mecánicos', 'mes', 6, 15096, 561571.2),
  (25, 'EPY-004-26', '1.05.04', 'Ayud. Mecánicos', 'mes', 3, 8806, 163791.6),
  (26, 'EPY-004-26', '1.06', 'SOPORTE OFICINA CENTRAL', null, null, null, null),
  (27, 'EPY-004-26', '1.06.01', 'Soporte de oficina central, 0.5% del Costo Directo', 'mes', null, 22522290.9, 112611.45),
  (28, 'EPY-004-26', '2', 'SERVICIOS Y LABORATORIOS', null, null, null, null),
  (29, 'EPY-004-26', '2.01', 'Útiles Administrativos y de escritorio', 'mes', 6.57, 1200, 7884.37),
  (30, 'EPY-004-26', '2.02', 'Lapto´s, tipo I', 'mes', 6.57, 450, 5913.28),
  (31, 'EPY-004-26', '2.03', 'Lapto´s, tipo II', 'mes', 6.57, 300, 15768.73),
  (32, 'EPY-004-26', '2.04', 'Impresora', 'mes', 6.57, 320, 6307.5),
  (33, 'EPY-004-26', '2.05', 'Insumos Limpieza (Oficinas)', 'mes', 6.57, 250, 1642.58),
  (34, 'EPY-004-26', '2.06', 'Agua Consumo Obra', 'mes', 6.57, 1479, 9717.48),
  (35, 'EPY-004-26', '2.07', 'Generador 35Kv', 'mes', 6.57, 7825, 51412.62),
  (36, 'EPY-004-26', '2.08', 'Contenedor 20"', 'mes', 6.57, 1500, 19710.91),
  (37, 'EPY-004-26', '2.09', 'Implementación de energia en conteiner (Para trabajos de puesta a tierra .) - Reembolsable', 'mes', null, 2000, null),
  (38, 'EPY-004-26', '3', 'EQUIPOS Y MATERIALES INDIRECTOS', null, null, null, null),
  (39, 'EPY-004-26', '3.01', 'Detector de tormentas', 'Und', 6.57, 685, 4500.66),
  (40, 'EPY-004-26', '3.02', 'Martillo hidráulico', 'Und', 2, 20350, 40700),
  (41, 'EPY-004-26', '3.03', 'Motobombas', 'Und', 3, null, null),
  (42, 'EPY-004-26', '3.04', 'Luminarias (eq + combustible)', 'Und', 5.83, 4000, 186400),
  (43, 'EPY-004-26', '3.05', 'Vibroapisonadores', 'Und', 5.53, 2690, 29769.34),
  (44, 'EPY-004-26', '3.06', 'Zaranda', 'Und', 3, 5000, 15000),
  (45, 'EPY-004-26', '3.07', 'Trompo de concreto', 'Und', 3, 2350, 7050),
  (46, 'EPY-004-26', '3.08', 'Radio para personal y equipo', 'Und', 6, 206.25, 61875),
  (47, 'EPY-004-26', '3.09', 'Modulo de radio para cargar baterias y radios', 'Und', 6.57, 331.32, 4353.75),
  (48, 'EPY-004-26', '3.10', 'Vibrador de concreto', 'Und', 3, 580, 1740),
  (49, 'EPY-004-26', '3.11', 'Estufa electrica de 11 celdas / sole', 'Und', 6.57, 300, 5913.28),
  (50, 'EPY-004-26', '3.12', 'Alcolimetro', 'Und', 6.57, 250, 1642.58),
  (51, 'EPY-004-26', '3.13', 'Engrasadora neumatica', 'Und', 6.57, 350, 2299.61),
  (52, 'EPY-004-26', '3.14', 'Compresora de aire.', 'Und', 6, 1550, 9300),
  (53, 'EPY-004-26', '3.15', 'Plancha compactadora', 'Und', 4.55, 2350, 21384.2)
on conflict (id) do nothing;

-- ── Valorizaciones: '2026-07' = acumulado hasta Julio · '2026-08' = Agosto ──
insert into public.valor_c_indi (id, partida_id, periodo, cantidad, total, total_manual, creado_por) values
  (1, 3, '2026-07', 1.67, 33546.67, true, 'Carga inicial EDP N°3'),
  (2, 4, '2026-07', 2.34, 39510.9, false, 'Carga inicial EDP N°3'),
  (3, 5, '2026-07', 3.27, 33418.74, true, 'Carga inicial EDP N°3'),
  (4, 7, '2026-07', 0.13, 2289.56, false, 'Carga inicial EDP N°3'),
  (5, 8, '2026-07', 3.74, 55650.18, true, 'Carga inicial EDP N°3'),
  (6, 10, '2026-07', 2.37, 32796.06, false, 'Carga inicial EDP N°3'),
  (7, 11, '2026-07', 1.37, 18958.06, false, 'Carga inicial EDP N°3'),
  (8, 12, '2026-07', 2.47, 43501.64, false, 'Carga inicial EDP N°3'),
  (9, 13, '2026-07', 2, 22644, false, 'Carga inicial EDP N°3'),
  (10, 14, '2026-07', 0.87, 8208.45, false, 'Carga inicial EDP N°3'),
  (11, 15, '2026-07', 2.47, 23304.45, false, 'Carga inicial EDP N°3'),
  (12, 17, '2026-07', 3.17, 23927.16, false, 'Carga inicial EDP N°3'),
  (13, 18, '2026-07', 1.1, 6227.1, false, 'Carga inicial EDP N°3'),
  (14, 19, '2026-07', 2.1, 18528.51, false, 'Carga inicial EDP N°3'),
  (15, 20, '2026-07', 0.87, 4925.07, false, 'Carga inicial EDP N°3'),
  (16, 23, '2026-07', 2.17, 24568.74, false, 'Carga inicial EDP N°3'),
  (17, 24, '2026-07', 3.07, 46344.72, false, 'Carga inicial EDP N°3'),
  (18, 25, '2026-07', 2.11, 18580.66, false, 'Carga inicial EDP N°3'),
  (19, 27, '2026-07', 0.01, 6870.04, true, 'Carga inicial EDP N°3'),
  (20, 29, '2026-07', 2, 2400, false, 'Carga inicial EDP N°3'),
  (21, 30, '2026-07', 4, 1800, false, 'Carga inicial EDP N°3'),
  (22, 31, '2026-07', 16, 4800, false, 'Carga inicial EDP N°3'),
  (23, 32, '2026-07', 6, 1920, false, 'Carga inicial EDP N°3'),
  (24, 33, '2026-07', 2, 500, false, 'Carga inicial EDP N°3'),
  (25, 34, '2026-07', 1.25, 1848.75, false, 'Carga inicial EDP N°3'),
  (26, 35, '2026-07', 0.6, 4695, false, 'Carga inicial EDP N°3'),
  (27, 36, '2026-07', 4, 6000, false, 'Carga inicial EDP N°3'),
  (28, 39, '2026-07', 2, 1370, false, 'Carga inicial EDP N°3'),
  (29, 42, '2026-07', 4.42, 17666.67, true, 'Carga inicial EDP N°3'),
  (30, 43, '2026-07', 0.26, 694.19, true, 'Carga inicial EDP N°3'),
  (31, 45, '2026-07', 0.53, 1253.33, true, 'Carga inicial EDP N°3'),
  (32, 46, '2026-07', 53, 10931.25, false, 'Carga inicial EDP N°3'),
  (33, 47, '2026-07', 2, 662.64, false, 'Carga inicial EDP N°3'),
  (34, 48, '2026-07', 0.2, 116, false, 'Carga inicial EDP N°3'),
  (35, 49, '2026-07', 5.54, 1662, false, 'Carga inicial EDP N°3'),
  (36, 50, '2026-07', 1.67, 416.67, true, 'Carga inicial EDP N°3'),
  (37, 51, '2026-07', 1.67, 583.33, true, 'Carga inicial EDP N°3'),
  (38, 52, '2026-07', 0.73, 1136.67, true, 'Carga inicial EDP N°3'),
  (39, 53, '2026-07', 1.4, 3290, false, 'Carga inicial EDP N°3'),
  (40, 3, '2026-08', 1, 20128, false, 'Carga inicial EDP N°3'),
  (41, 4, '2026-08', 2, 33770, false, 'Carga inicial EDP N°3'),
  (42, 5, '2026-08', 2.66, 27197.02, true, 'Carga inicial EDP N°3'),
  (43, 7, '2026-08', 1, 17612, false, 'Carga inicial EDP N°3'),
  (44, 8, '2026-08', 2.74, 40806.82, false, 'Carga inicial EDP N°3'),
  (45, 10, '2026-08', 1, 13838, false, 'Carga inicial EDP N°3'),
  (46, 11, '2026-08', 1, 13838, false, 'Carga inicial EDP N°3'),
  (47, 12, '2026-08', 1, 17612, false, 'Carga inicial EDP N°3'),
  (48, 13, '2026-08', 1, 11322, false, 'Carga inicial EDP N°3'),
  (49, 14, '2026-08', 1, 9435, false, 'Carga inicial EDP N°3'),
  (50, 15, '2026-08', 2, 18870, false, 'Carga inicial EDP N°3'),
  (51, 17, '2026-08', 2, 15096, false, 'Carga inicial EDP N°3'),
  (52, 18, '2026-08', 1, 5661, false, 'Carga inicial EDP N°3'),
  (53, 19, '2026-08', 2, 17646.2, false, 'Carga inicial EDP N°3'),
  (54, 20, '2026-08', 1.94, 10982.34, false, 'Carga inicial EDP N°3'),
  (55, 22, '2026-08', 0.74, 11536.6, false, 'Carga inicial EDP N°3'),
  (56, 23, '2026-08', 1, 11322, false, 'Carga inicial EDP N°3'),
  (57, 24, '2026-08', 6, 90576, false, 'Carga inicial EDP N°3'),
  (58, 25, '2026-08', 1.97, 17347.82, false, 'Carga inicial EDP N°3'),
  (59, 27, '2026-08', 0.005, 9416.89, true, 'Carga inicial EDP N°3'),
  (60, 29, '2026-08', 1, 1200, false, 'Carga inicial EDP N°3'),
  (61, 30, '2026-08', 2, 900, false, 'Carga inicial EDP N°3'),
  (62, 31, '2026-08', 8, 2400, false, 'Carga inicial EDP N°3'),
  (63, 32, '2026-08', 3, 960, false, 'Carga inicial EDP N°3'),
  (64, 33, '2026-08', 1, 250, false, 'Carga inicial EDP N°3'),
  (65, 34, '2026-08', 1, 1479, false, 'Carga inicial EDP N°3'),
  (66, 35, '2026-08', 1, 7825, false, 'Carga inicial EDP N°3'),
  (67, 36, '2026-08', 4, 6000, false, 'Carga inicial EDP N°3'),
  (68, 39, '2026-08', 1, 685, false, 'Carga inicial EDP N°3'),
  (69, 42, '2026-08', 11.16, 44645.16, true, 'Carga inicial EDP N°3'),
  (70, 43, '2026-08', 1, 2690, false, 'Carga inicial EDP N°3'),
  (71, 44, '2026-08', 0.84, 4200, false, 'Carga inicial EDP N°3'),
  (72, 45, '2026-08', 1.03, 2425.81, true, 'Carga inicial EDP N°3'),
  (73, 46, '2026-08', 50, 10312.5, false, 'Carga inicial EDP N°3'),
  (74, 47, '2026-08', 2, 662.64, false, 'Carga inicial EDP N°3'),
  (75, 48, '2026-08', 1, 580, false, 'Carga inicial EDP N°3'),
  (76, 49, '2026-08', 5, 1500, false, 'Carga inicial EDP N°3'),
  (77, 50, '2026-08', 1, 250, false, 'Carga inicial EDP N°3'),
  (78, 51, '2026-08', 1, 350, false, 'Carga inicial EDP N°3'),
  (79, 52, '2026-08', 1, 1550, false, 'Carga inicial EDP N°3'),
  (80, 53, '2026-08', 2, 4700, false, 'Carga inicial EDP N°3')
on conflict (id) do nothing;

-- ── Comprobación ───────────────────────────────────────────────────────────
-- Debe dar: 53 · 80 · 3649154.58 · 527547.21 · 509578.80
select
  (select count(*)   from public.presup_c_indi)                          as filas_presupuesto,
  (select count(*)   from public.valor_c_indi)                           as valorizaciones,
  (select sum(total) from public.presup_c_indi)                          as presupuesto_meta,
  (select sum(total) from public.valor_c_indi where periodo = '2026-07') as hasta_julio,
  (select sum(total) from public.valor_c_indi where periodo = '2026-08') as agosto;
