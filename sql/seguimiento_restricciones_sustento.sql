-- ══ SUSTENTO DEL LEVANTAMIENTO DE RESTRICCIONES (imágenes / PDF) ═══════════
-- Pestaña «⛔ Restricciones LPS» de Seguimiento General.
-- Los archivos se suben al mismo depósito de Storage que ya usan las fotos de
-- Auxilios Mecánicos («AuxMec_Evidencias»), dentro de la carpeta
-- restricciones/<id>/. No hace falta crear depósito ni permisos nuevos.
--
-- evidencias: lista en texto JSON, igual que las fotos de Auxilios:
--   [{"url":"…","path":"restricciones/123/…jpg","nombre":"foto.jpg","fecha":"2026-10-11","por":"Abel R."}]
--
-- Solo agrega una columna. Se puede correr más de una vez.

alter table public.seguimiento_tareas add column if not exists evidencias text;

-- Verificación: debe listar la columna
select column_name, data_type
from information_schema.columns
where table_schema='public' and table_name='seguimiento_tareas' and column_name='evidencias';
