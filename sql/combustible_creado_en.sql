-- ══ KARDEX DE COMBUSTIBLE · HORA DE REGISTRO ════════════════════════════════
-- Un movimiento del kardex se puede editar y eliminar durante sus primeras 48
-- horas; pasadas, queda congelado (candado).
--
-- Ese plazo corre desde que el movimiento se REGISTRÓ, no desde su fecha: si
-- no, un despacho cargado con fecha atrasada nacería bloqueado y no habría
-- forma de corregirlo. Para eso hace falta guardar la hora de creación.
--
-- Los movimientos ya cargados no la tienen; el sistema los sigue midiendo por
-- su fecha, que es lo único que hay de ellos. Si prefiere que los existentes
-- queden definitivamente cerrados, vea el bloque opcional del final.
--
-- Se puede correr más de una vez: no duplica nada.

alter table public.combustible
  add column if not exists creado_en timestamptz;

-- Los movimientos nuevos quedan sellados por el sistema, pero el default
-- protege cualquier inserción hecha por fuera.
alter table public.combustible
  alter column creado_en set default now();

-- ── Refrescar el esquema que ve la API ─────────────────────────────────────
-- Sin esto el sistema da: «Could not find the 'creado_en' column of
-- 'combustible' in the schema cache», aunque la columna ya exista.
notify pgrst, 'reload schema';

-- ── Comprobación: cuántos movimientos ya tienen hora de registro ───────────
select count(*) filter (where creado_en is not null) as con_hora,
       count(*) filter (where creado_en is null)     as sin_hora,
       count(*)                                      as total
from public.combustible;

-- ── OPCIONAL · cerrar de una vez los movimientos ya cargados ──────────────
-- Les pone como hora de registro su propia fecha a medianoche, con lo que los
-- de más de 48 horas quedan bloqueados para siempre. Descomente para correrlo.
--
-- update public.combustible
--    set creado_en = (fecha::timestamptz)
--  where creado_en is null and fecha is not null;
