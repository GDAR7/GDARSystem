-- ══ COST CONTROL · PRECIO DE COMBUSTIBLE POR PERÍODO ════════════════════════
-- Con «Precio manual» activado, Cost Control valoriza el combustible con el
-- precio S/ por galón del período que se está calculando (21→20). Antes era un
-- solo número guardado en el navegador; ahora queda en la base, uno por período,
-- y lo ve todo el equipo. La matriz Anual usa el precio de cada mes.
--
--   · periodo         : último día del período (el 20). Ej.: 2026-10-20 = Octubre 2026.
--   · precio          : S/ por galón, con IGV (el interruptor «Comb. sin IGV» lo neta).
--   · actualizado_por / actualizado_en : quién lo grabó por última vez y cuándo.
--
-- Un período sin precio usa el último precio grabado de un período anterior.
--
-- TODOS los usuarios lo LEEN, pero SOLO EL ADMINISTRADOR (código EIBEL25 en Auth)
-- lo puede grabar: la regla está aquí en la base, no solo en la pantalla.
--
-- Se puede correr más de una vez: no duplica nada.

create table if not exists public.cc_precio_combustible (
  periodo         date primary key,
  precio          numeric(10,4) not null check (precio > 0),
  actualizado_por text,
  actualizado_en  timestamptz not null default now()
);

-- ── Seguridad ──────────────────────────────────────────────────────────────
alter table public.cc_precio_combustible enable row level security;
drop policy if exists gdar_autenticado  on public.cc_precio_combustible;
drop policy if exists ccpc_leer         on public.cc_precio_combustible;
drop policy if exists ccpc_admin_insert on public.cc_precio_combustible;
drop policy if exists ccpc_admin_update on public.cc_precio_combustible;
drop policy if exists ccpc_admin_delete on public.cc_precio_combustible;

-- Leer: cualquier usuario con sesión
create policy ccpc_leer on public.cc_precio_combustible
  for select to authenticated using (true);

-- Escribir: solo el administrador
create policy ccpc_admin_insert on public.cc_precio_combustible
  for insert to authenticated
  with check ((auth.jwt() -> 'user_metadata' ->> 'codigo') = 'EIBEL25');
create policy ccpc_admin_update on public.cc_precio_combustible
  for update to authenticated
  using      ((auth.jwt() -> 'user_metadata' ->> 'codigo') = 'EIBEL25')
  with check ((auth.jwt() -> 'user_metadata' ->> 'codigo') = 'EIBEL25');
create policy ccpc_admin_delete on public.cc_precio_combustible
  for delete to authenticated
  using ((auth.jwt() -> 'user_metadata' ->> 'codigo') = 'EIBEL25');

grant select, insert, update, delete on public.cc_precio_combustible to authenticated;

-- ── Refrescar el esquema que ve la API ─────────────────────────────────────
notify pgrst, 'reload schema';

-- ── Comprobación: la tabla existe (vacía la primera vez) ───────────────────
select periodo, precio, actualizado_por, actualizado_en
  from public.cc_precio_combustible order by periodo;
