-- Reembolsables B.S. · hora en que se registró cada ítem
-- La pantalla deja eliminar un registro solo durante sus primeras 48 horas
-- (el administrador siempre puede). Para eso necesita saber CUÁNDO se creó.
--
-- DEFAULT now(): cada registro nuevo (formulario o Importar CSV) recibe la
-- hora del servidor sin que la pantalla tenga que enviarla.
--
-- Los registros que YA existen reciben la hora en que se ejecute este SQL,
-- así que tienen 48 horas más para terminar la limpieza que se está haciendo.
-- Si prefiere bloquearlos de inmediato, ejecute también el UPDATE de abajo
-- (quitando los dos guiones).
--
-- Es seguro ejecutarlo dos veces (IF NOT EXISTS).

alter table public.reembolsables_bbss
  add column if not exists creado_en timestamptz not null default now();

-- Opcional: bloquear ya los registros existentes (los fecha 3 días atrás)
-- update public.reembolsables_bbss set creado_en = now() - interval '3 days';

-- Comprobación: debe mostrar la columna nueva
select id, fecha, creado_en from public.reembolsables_bbss order by id desc limit 5;
