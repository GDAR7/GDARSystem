-- ══ CONFIGURACIÓN · CONTROL DE EDICIÓN ═════════════════════════════════════
-- Un interruptor por módulo para abrir la edición de registros que ya pasaron
-- su tiempo de bloqueo (hoy: el Kardex de Combustible, 48 h). Se maneja desde
-- ⚙️ Configuración → 🔓 Control de edición.
--
--   · modulo          : 'combustible' (después se pueden sumar otros).
--   · activo          : true = edición abierta.
--   · desde           : solo los movimientos con fecha desde este día se abren.
--   · hasta           : cierre automático (vacío = queda abierta hasta que se
--                       desactive a mano).
--   · actualizado_por / actualizado_en : quién la movió por última vez y cuándo.
--
-- TODOS los usuarios la LEEN (el kardex necesita saber si está abierta), pero
-- SOLO EL ADMINISTRADOR (código EIBEL25 en Auth) la puede cambiar: la regla
-- está aquí en la base, no solo en la pantalla.
--
-- Se puede correr más de una vez: no duplica nada.

create table if not exists public.control_edicion (
  modulo          text primary key,
  activo          boolean not null default false,
  desde           date,
  hasta           timestamptz,
  actualizado_por text,
  actualizado_en  timestamptz not null default now()
);

-- ── Seguridad ──────────────────────────────────────────────────────────────
alter table public.control_edicion enable row level security;
drop policy if exists gdar_autenticado on public.control_edicion;
drop policy if exists ce_leer          on public.control_edicion;
drop policy if exists ce_admin_insert  on public.control_edicion;
drop policy if exists ce_admin_update  on public.control_edicion;
drop policy if exists ce_admin_delete  on public.control_edicion;

-- Leer: cualquier usuario con sesión
create policy ce_leer on public.control_edicion
  for select to authenticated using (true);

-- Escribir: solo el administrador
create policy ce_admin_insert on public.control_edicion
  for insert to authenticated
  with check ((auth.jwt() -> 'user_metadata' ->> 'codigo') = 'EIBEL25');
create policy ce_admin_update on public.control_edicion
  for update to authenticated
  using      ((auth.jwt() -> 'user_metadata' ->> 'codigo') = 'EIBEL25')
  with check ((auth.jwt() -> 'user_metadata' ->> 'codigo') = 'EIBEL25');
create policy ce_admin_delete on public.control_edicion
  for delete to authenticated
  using ((auth.jwt() -> 'user_metadata' ->> 'codigo') = 'EIBEL25');

grant select, insert, update, delete on public.control_edicion to authenticated;

-- ── Arranca cerrada ────────────────────────────────────────────────────────
insert into public.control_edicion (modulo, activo)
values ('combustible', false)
on conflict (modulo) do nothing;

-- ── Refrescar el esquema que ve la API ─────────────────────────────────────
notify pgrst, 'reload schema';

-- ── Comprobación: debe devolver la fila de combustible, cerrada ────────────
select modulo, activo, desde, hasta, actualizado_por, actualizado_en
  from public.control_edicion order by modulo;
