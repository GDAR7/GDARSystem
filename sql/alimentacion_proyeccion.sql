-- ══ ALIMENTACIÓN · PROYECCIÓN MENSUAL ═══════════════════════════════════════
-- Bienestar Social → Alimentación → pestaña Proyección. Calcula desde el TAREO
-- cuántas raciones corresponden en el mes, para contrastar con lo que factura
-- la concesionaria.
--
-- Reglas que aplica el módulo (no viven en la base, se recuerdan aquí):
--   · Solo come quien tiene TD, TN o DLT ese día. DL, F, P, V, DM… no comen.
--   · Procedencia LOCAL (Oyón y las que se agreguen en alim_locales):
--        turno día   → desayuno + almuerzo
--        turno noche → desayuno + cena
--   · Procedencia de fuera: desayuno + almuerzo + cena.
--   · El DLT no guarda turno en el tareo: hereda el del día anterior de esa
--     misma persona (y si no hay, el del siguiente; si tampoco, turno día).
--   · El rancho frío no se proyecta: se carga a mano en alim_rancho.
--
-- Son tres tablas. Se puede correr más de una vez: no duplica nada.

-- ── 1 · Precios de la concesionaria, por período ───────────────────────────
-- Un juego de precios por mes: si en octubre sube el almuerzo, setiembre
-- conserva el suyo y los meses ya cerrados no se recalculan solos.
create table if not exists public.alim_precios (
  id          bigint primary key,
  periodo     text not null,               -- 'YYYY-MM'
  desayuno    numeric(10,2) not null default 0,
  almuerzo    numeric(10,2) not null default 0,
  cena        numeric(10,2) not null default 0,
  rancho      numeric(10,2) not null default 0,
  created_at  timestamptz not null default now()
);
create unique index if not exists ux_alim_precios_periodo
  on public.alim_precios (periodo);

-- ── 2 · Procedencias locales (las que comen 2 veces) ───────────────────────
create table if not exists public.alim_locales (
  id          bigint primary key,
  nombre      text not null,
  created_at  timestamptz not null default now()
);
-- No se repite un nombre, sin importar mayúsculas ni espacios
create unique index if not exists ux_alim_locales_nombre
  on public.alim_locales (lower(trim(nombre)));

-- Oyón queda cargada de entrada
insert into public.alim_locales (id, nombre)
select coalesce((select max(id) from public.alim_locales), 0) + 1, 'Oyón'
where not exists (
  select 1 from public.alim_locales where lower(trim(nombre)) = 'oyón'
);

-- ── 3 · Rancho frío cargado a mano, por persona y período ──────────────────
create table if not exists public.alim_rancho (
  id           bigint primary key,
  periodo      text not null,              -- 'YYYY-MM'
  personal_id  bigint not null,
  cant         integer not null default 0,
  created_at   timestamptz not null default now()
);
create unique index if not exists ux_alim_rancho_per_pers
  on public.alim_rancho (periodo, personal_id);

-- ── Seguridad: igual que las otras tablas (sql/rls_cerrar.sql) ─────────────
do $$
declare t text;
begin
  foreach t in array array['alim_precios','alim_locales','alim_rancho'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists gdar_autenticado on public.%I', t);
    execute format('create policy gdar_autenticado on public.%I for all to authenticated using (true) with check (true)', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
  end loop;
end $$;

-- ── Refrescar el esquema que ve la API ─────────────────────────────────────
notify pgrst, 'reload schema';

-- ── Comprobación: debe listar Oyón y las otras dos tablas vacías ───────────
select 'locales' as tabla, id::text, nombre from public.alim_locales
union all
select 'precios', id::text, periodo from public.alim_precios
union all
select 'rancho',  id::text, periodo from public.alim_rancho
order by tabla, id;
