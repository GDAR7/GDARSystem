-- ══ ÁREAS DE TRABAJO ════════════════════════════════════════════════════════
-- Catálogo de áreas que se eligen en el parte diario de las cuatro líneas
-- (Línea Amarilla, Línea Blanca, Vehículos Menores y Equipos Menores).
--
-- Antes la lista del formulario salía de las áreas ya usadas en partes
-- anteriores (por eso solo aparecía "R3") y no había dónde agregar otra.
--
-- El parte sigue guardando el NOMBRE del área (partes.area_t), no su id:
-- renombrar o borrar un área no modifica los partes ya registrados.
--
-- Se puede correr más de una vez: no duplica nada.

create table if not exists public.areas_trabajo (
  id          bigint primary key,
  nombre      text not null,
  notas       text,
  created_at  timestamptz not null default now()
);

-- Un nombre no se repite, sin importar mayúsculas ni espacios: 'R3' y ' r3' son la misma área
create unique index if not exists ux_areas_trabajo_nombre
  on public.areas_trabajo (lower(trim(nombre)));

-- ── Seguridad: igual que las otras tablas (sql/rls_cerrar.sql) ─────────────
alter table public.areas_trabajo enable row level security;
drop policy if exists gdar_autenticado on public.areas_trabajo;
create policy gdar_autenticado on public.areas_trabajo
  for all to authenticated using (true) with check (true);
grant select, insert, update, delete on public.areas_trabajo to authenticated;

-- ── Carga inicial: las áreas que ya aparecen en los partes ─────────────────
-- Así "R3" (y cualquier otra ya usada) queda en el catálogo desde el primer día.
insert into public.areas_trabajo (id, nombre)
select coalesce((select max(id) from public.areas_trabajo), 0)
         + row_number() over (order by a.nombre),
       a.nombre
from (
  select distinct trim(area_t) as nombre
  from public.partes
  where coalesce(trim(area_t), '') <> ''
) a
where not exists (
  select 1 from public.areas_trabajo t
  where lower(trim(t.nombre)) = lower(a.nombre)
)
on conflict do nothing;

-- ── Comprobación: debe listar las áreas cargadas ───────────────────────────
select id, nombre, notas from public.areas_trabajo order by nombre;
