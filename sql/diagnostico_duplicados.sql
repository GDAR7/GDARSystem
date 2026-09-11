-- ══ DUPLICADOS DE PERSONA Y DÍA · SOLO LECTURA ══════════════════════════════
-- No modifica nada. Se corre ANTES de la migración
-- supabase/migrations/20260909235900_unicidad_tareaje_asistencia.sql,
-- que se niega a crear el índice único mientras existan.
--
-- Ejecute cada consulta por separado en el SQL Editor de Supabase.


-- ── 1 · ¿Cuántos duplicados hay, y de qué clase? ───────────────────────────
-- `iguales`     las dos filas dicen lo mismo: sobra una, da igual cuál.
-- `conflictos`  dicen cosas distintas (una TD y otra DL): alguien tiene que
--               decidir. Son los únicos que requieren criterio.
with d as (
  select personal_id, fecha,
         count(*)                 as filas,
         count(distinct tipo)     as tipos_distintos
  from public.tareaje
  where personal_id is not null and fecha is not null
  group by personal_id, fecha
  having count(*) > 1
)
select
  case when tipos_distintos > 1 then 'conflicto' else 'iguales' end as clase,
  count(*)          as combinaciones,
  sum(filas - 1)    as filas_sobrantes
from d
group by 1
order by 1;


-- ── 2 · El detalle, con nombre y fecha ─────────────────────────────────────
-- Para llevar a la reunión, o para resolver a mano si son pocos.
select
  t.personal_id,
  coalesce(p.ape, '') || ', ' || coalesce(p.nom, '')  as trabajador,
  t.fecha,
  count(*)                                            as filas,
  string_agg(distinct t.tipo, ' / ' order by t.tipo)   as tipos,
  string_agg(t.id::text, ', ' order by t.id desc)      as ids_mas_nuevo_primero
from public.tareaje t
left join public.personal p on p.id = t.personal_id
where t.personal_id is not null and t.fecha is not null
group by t.personal_id, p.ape, p.nom, t.fecha
having count(*) > 1
order by t.fecha desc, trabajador;


-- ── 3 · Lo mismo para asistencia ───────────────────────────────────────────
select
  a.personal_id,
  coalesce(p.ape, '') || ', ' || coalesce(p.nom, '')  as trabajador,
  a.fecha,
  count(*)                                            as filas,
  string_agg(a.id::text, ', ' order by a.id desc)      as ids_mas_nuevo_primero
from public.asistencia a
left join public.personal p on p.id = a.personal_id
where a.personal_id is not null and a.fecha is not null
group by a.personal_id, p.ape, p.nom, a.fecha
having count(*) > 1
order by a.fecha desc, trabajador;


-- ── 4 · ¿En qué meses se concentran? ───────────────────────────────────────
-- Si salen todos del mismo mes, probablemente fue un episodio puntual de dos
-- personas tareando a la vez y no un problema de fondo.
select
  to_char(fecha::date, 'YYYY-MM') as mes,
  count(*)                        as combinaciones_duplicadas
from (
  select personal_id, fecha
  from public.tareaje
  where personal_id is not null and fecha is not null
  group by personal_id, fecha
  having count(*) > 1
) d
group by 1
order by 1 desc;
