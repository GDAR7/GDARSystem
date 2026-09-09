-- ══ UNA SOLA FILA POR PERSONA Y DÍA ═════════════════════════════════════════
--
-- Qué arregla
-- ───────────
-- Dos sesiones tareando la misma celda crean dos filas. Cada navegador busca
-- el registro en SU copia local de DB.tareaje, cargada al abrir la aplicación;
-- si el otro lo grabó después, esa copia no lo tiene, no lo encuentra y crea
-- uno nuevo. Hoy nada en la base lo impide, y por eso existe js/tareajeDup.js:
-- un módulo entero dedicado a limpiar el desorden después de hecho.
--
-- La identidad de la fila es (personal_id, fecha). Se comprueba en el código:
-- js/tareaje.js:589 y :801 buscan el registro existente SOLO por esos dos
-- campos antes de decidir si actualizan o insertan. `proy` es un atributo de
-- la fila, no parte de su identidad, así que NO entra en el índice.
-- Lo mismo en asistencia — js/personal.js:612 y :836.
--
-- Por qué importa más de lo que parece
-- ────────────────────────────────────
-- Sin esta restricción no se puede construir una cola de escrituras offline:
-- sería el mismo escenario con horas de desconexión en lugar de segundos.
-- Con ella, el reintento pasa a ser un upsert con onConflict y el duplicado
-- se vuelve imposible en vez de corregible.
--
-- ⚠ ANTES DE APLICAR
-- ──────────────────
-- Si ya hay duplicados en la base, este script se detiene y no cambia nada.
-- Es a propósito: son datos de tareo, y decidir cuál de dos filas sobrevive
-- no es algo que deba hacer una migración sola.
--
--   1. Corra sql/diagnostico_duplicados.sql para ver qué hay.
--   2. Resuélvalos desde la aplicación: módulo Tareaje → Duplicados.
--   3. Vuelva a aplicar esta migración.

-- ── tareaje ────────────────────────────────────────────────────────────────
do $$
declare
  n int;
begin
  select count(*) into n from (
    select personal_id, fecha
    from public.tareaje
    where personal_id is not null and fecha is not null
    group by personal_id, fecha
    having count(*) > 1
  ) d;

  if n > 0 then
    raise exception
      'tareaje: hay % combinaciones (personal_id, fecha) repetidas. '
      'Resuélvalas primero — vea sql/diagnostico_duplicados.sql y el módulo '
      'Tareaje → Duplicados. No se aplicó ningún cambio.', n;
  end if;
end $$;

create unique index if not exists ux_tareaje_persona_fecha
  on public.tareaje (personal_id, fecha);

comment on index public.ux_tareaje_persona_fecha is
  'Una fila por persona y día. Habilita upsert onConflict desde la cola offline.';

-- ── asistencia ─────────────────────────────────────────────────────────────
do $$
declare
  n int;
begin
  select count(*) into n from (
    select personal_id, fecha
    from public.asistencia
    where personal_id is not null and fecha is not null
    group by personal_id, fecha
    having count(*) > 1
  ) d;

  if n > 0 then
    raise exception
      'asistencia: hay % combinaciones (personal_id, fecha) repetidas. '
      'Resuélvalas primero — vea sql/diagnostico_duplicados.sql. '
      'No se aplicó ningún cambio.', n;
  end if;
end $$;

create unique index if not exists ux_asistencia_persona_fecha
  on public.asistencia (personal_id, fecha);

comment on index public.ux_asistencia_persona_fecha is
  'Una fila por persona y día. El escáner de fotocheck ya asume esta regla.';
