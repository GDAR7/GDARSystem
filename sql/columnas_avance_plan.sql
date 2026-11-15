-- ══ Columnas nuevas: Avance de Viajes y Plan de Trabajo ═════════════════════
-- Solo lo que falta (no recrea tablas ni políticas). Ejecutar SOLO este texto
-- en una pestaña nueva del SQL Editor.
--
-- Si otra conexión está usando la tabla, en vez de quedarse esperando sin fin
-- se corta a los 5 segundos con «canceling statement due to lock timeout»:
-- en ese caso cierre las otras pestañas del SQL Editor y vuelva a ejecutar.
-- Se puede correr más de una vez.

set lock_timeout = '5s';

-- Avance de Viajes: Avance / Reporte y viajes a capa o a acopio
alter table public.avance_viajes add column if not exists tipo     text not null default 'Avance';
alter table public.avance_viajes add column if not exists destinos jsonb not null default '[]'::jsonb;

-- Plan de Trabajo: guardia, restricciones y nota fija
alter table public.plan_trabajo add column if not exists guardia       text;
alter table public.plan_trabajo add column if not exists restricciones jsonb not null default '[]'::jsonb;
alter table public.plan_trabajo add column if not exists nota          text;

-- Que la API vea las columnas nuevas
notify pgrst, 'reload schema';

-- Comprobación: debe listar las 5 columnas
select table_name, column_name from information_schema.columns
where table_schema='public'
  and ((table_name='avance_viajes' and column_name in ('tipo','destinos'))
    or (table_name='plan_trabajo'  and column_name in ('guardia','restricciones','nota')))
order by 1,2;
