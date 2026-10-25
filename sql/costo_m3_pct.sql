-- ══ COST CONTROL · COSTO POR m³ MOVIDO · PORCENTAJES POR MES ════════════════
-- Reembolsables, Gastos Generales y Utilidad cambian de un mes a otro: se
-- guardan aquí, uno por período 21→20, para que cada mes tenga su propio costo
-- por m³ (y la Tendencia calcule cada mes con los suyos).
--
--   · periodo : mes de CIERRE del período, AAAA-MM. Septiembre 2026 = del
--               21/08 al 20/09 → '2026-09'.
--   · reemb, gg, util : porcentajes sobre la base (HM + HH).
--
-- Un mes sin fila usa los del último mes guardado anterior; si no hay
-- ninguno, los de por defecto (15 · 12 · 9.35). Al cambiar un porcentaje en la
-- pantalla, se guarda para el mes que se está viendo.
--
-- Se puede correr más de una vez: no duplica nada.

create table if not exists public.costo_m3_pct (
  periodo         text primary key check (periodo ~ '^\d{4}-\d{2}$'),
  reemb           numeric(6,2) not null default 15,
  gg              numeric(6,2) not null default 12,
  util            numeric(6,2) not null default 9.35,
  actualizado_en  timestamptz not null default now(),
  actualizado_por text
);

-- ── Importes corregidos a mano y foto del mes al guardar ───────────────────
--   · hm_manual / hh_manual : importe de Horas Máquina / Horas Hombre corregido
--                             a mano para ese mes (vacío = el calculado).
--   · hm, hh, subtotal, total, m3, costo_m3 : cómo quedó el mes al presionar
--                             Guardar (el Sub Total es HM + HH).
-- «add column if not exists»: sirve también si ya corrió la versión anterior.
alter table public.costo_m3_pct add column if not exists hm_manual numeric(14,2);
alter table public.costo_m3_pct add column if not exists hh_manual numeric(14,2);
alter table public.costo_m3_pct add column if not exists hm        numeric(14,2);
alter table public.costo_m3_pct add column if not exists hh        numeric(14,2);
alter table public.costo_m3_pct add column if not exists subtotal  numeric(14,2);
alter table public.costo_m3_pct add column if not exists total     numeric(14,2);
alter table public.costo_m3_pct add column if not exists m3        numeric(14,2);
alter table public.costo_m3_pct add column if not exists costo_m3  numeric(12,4);

-- ── Seguridad: igual que las otras tablas (sql/rls_cerrar.sql) ─────────────
alter table public.costo_m3_pct enable row level security;
drop policy if exists gdar_autenticado on public.costo_m3_pct;
create policy gdar_autenticado on public.costo_m3_pct
  for all to authenticated using (true) with check (true);
grant select, insert, update, delete on public.costo_m3_pct to authenticated;

-- ── Refrescar el esquema que ve la API ─────────────────────────────────────
notify pgrst, 'reload schema';

-- ── Comprobación: debe devolver la tabla (vacía al principio), sin error ───
select periodo, reemb, gg, util, hm_manual, hh_manual, subtotal, total, costo_m3, actualizado_por
  from public.costo_m3_pct order by periodo;
