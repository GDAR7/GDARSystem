-- ══ VALORIZACIONES / EDP · HORA DE REGISTRO ═════════════════════════════════
-- Una valorización se puede eliminar durante sus primeras 48 horas; pasadas,
-- el botón queda en candado. Editar sigue permitido, que es lo que hace falta
-- para cargar la HES y la factura más adelante.
--
-- El plazo corre desde que se REGISTRÓ, no desde la fecha de la valorización:
-- si no, una cargada con fecha atrasada nacería bloqueada. Para eso hace falta
-- guardar la hora de creación.
--
-- Las valorizaciones ya cargadas no la tienen; el sistema las sigue midiendo
-- por su fecha, que es lo único que hay de ellas.
--
-- Se puede correr más de una vez: no duplica nada.

alter table public.ventas
  add column if not exists creado_en timestamptz;

-- Las nuevas quedan selladas por el sistema; el default protege cualquier
-- inserción hecha por fuera.
alter table public.ventas
  alter column creado_en set default now();

-- ── Refrescar el esquema que ve la API ─────────────────────────────────────
-- Sin esto el sistema da: «Could not find the 'creado_en' column of 'ventas'
-- in the schema cache», aunque la columna ya exista.
notify pgrst, 'reload schema';

-- ── Comprobación: cuántas valorizaciones ya tienen hora de registro ────────
select count(*) filter (where creado_en is not null) as con_hora,
       count(*) filter (where creado_en is null)     as sin_hora,
       count(*)                                      as total
from public.ventas;
