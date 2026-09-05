-- ══ EDP cobrado en los comprobantes de almacén ═══════════════════════════════
-- Guarda en qué EDP se cobró cada factura al cliente. Vacío = aún no cobrada.
-- La columna se edita desde la propia tabla de Comprobantes, en el módulo de
-- Requerimientos / Facturas.
--
-- Sin esto la marca se ve en pantalla pero se pierde al recargar: el campo
-- viaja a Supabase y la columna no existe todavía.

alter table public.facturas_pago
  add column if not exists edp_cobrado text;

-- Comprobación: debe devolver una fila.
select column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and table_name   = 'facturas_pago'
  and column_name  = 'edp_cobrado';
