-- ══ COSTO INDIRECTO · CARGOS DE CADA PARTIDA ═══════════════════════════════
-- Guarda qué cargos del personal alimentan cada partida de costo indirecto
-- (por ejemplo, "Guardian" ← VIGILANTE). Con eso el botón
-- 🧮 Simular desde el tareo calcula la cantidad del período con el tareo.
--
-- Solo agrega una columna: no toca ningún dato ya cargado.
-- Se puede correr más de una vez.

alter table public.presup_c_indi
  add column if not exists cargos text[] not null default '{}';

-- Comprobación: debe devolver una fila (cargos · ARRAY)
select column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and table_name   = 'presup_c_indi'
  and column_name  = 'cargos';
