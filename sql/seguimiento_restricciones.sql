-- ══ SEGUIMIENTO DE RESTRICCIONES DEL LPS ════════════════════════════════════
-- Pestaña «⛔ Restricciones LPS» de Seguimiento General (js/segRestricciones.js).
-- Las restricciones se guardan en la misma tabla «seguimiento_tareas» que las tareas
-- del Tablero, marcadas con es_restriccion = true. Así no se mezclan: el
-- Tablero, el Análisis de Desfases y la Carga por Persona las ignoran.
--
-- Columnas de la hoja «Seguimiento de restricciones del LPS» → tabla:
--   N°                           → numero
--   Restricción                  → titulo            (ya existe)
--   Fecha de detección           → fecha             (ya existe)
--   Actividad afectada           → actividad         (nueva)
--   Tipo                         → tipo_restr        (nueva) Interna / Externa / Sponsor / Proveedor
--   Responsable                  → responsable       (ya existe)
--   Fecha compromiso             → fecha_prom        (ya existe)
--   Estado                       → est               (ya existe) Abierta / En gestión / Levantada
--   Acciones / comentarios       → restriccion_det
--   Fecha real de levantamiento  → fecha_comp        (ya existe)
--   N° de reprogramaciones       → reprog            (nueva; sube sola al mover el compromiso)
--   Impacto                      → prioridad         (ya existe) Alta / Media / Baja
--   Causa raíz                   → restriccion       (lista de CNC)
--
-- Solo agrega columnas: no borra ni modifica nada de lo que ya hay.
-- Se puede correr más de una vez.

alter table public.seguimiento_tareas add column if not exists es_restriccion  boolean not null default false;
alter table public.seguimiento_tareas add column if not exists numero          integer;
alter table public.seguimiento_tareas add column if not exists actividad       text;
alter table public.seguimiento_tareas add column if not exists tipo_restr      text;
alter table public.seguimiento_tareas add column if not exists reprog          integer not null default 0;

-- Estas ya las usa el Tablero; van por si la tabla se creó antes que ellas
alter table public.seguimiento_tareas add column if not exists restriccion      text;
alter table public.seguimiento_tareas add column if not exists restriccion_det  text;
alter table public.seguimiento_tareas add column if not exists restriccion_resp text;
alter table public.seguimiento_tareas add column if not exists fecha_bloq       date;
alter table public.seguimiento_tareas add column if not exists reprog_hist      jsonb;

-- Verificación: debe listar las 5 columnas nuevas
select column_name, data_type
from information_schema.columns
where table_schema='public' and table_name='seguimiento_tareas'
  and column_name in ('es_restriccion','numero','actividad','tipo_restr','reprog')
order by column_name;
