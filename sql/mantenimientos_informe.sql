-- ══ PROGRAMACIÓN DE EQUIPOS · INFORME TÉCNICO DE LA OT ═════════════════════
-- Campos para el informe PDF de una OT completada:
--   · lugar        : dónde se hizo el servicio (p. ej. «TALLER ECOSERMO R3»).
--   · conclusiones : conclusiones y recomendaciones (p. ej. «EQUIPO OPERATIVO»).
--   · fotos        : referencia fotográfica, lista en texto JSON, igual que las
--                    fotos de Auxilios:
--     [{"url":"…","path":"mantenimientos/123/…jpg","nombre":"foto.jpg","fecha":"2026-10-26","por":"Abel R."}]
--
-- Las fotos se suben al depósito de Storage que ya usan Auxilios Mecánicos
-- («AuxMec_Evidencias»), dentro de la carpeta mantenimientos/<id>/. No hace
-- falta crear depósito ni permisos nuevos.
--
-- Solo agrega columnas; no cambia ninguna OT existente. Se puede correr más de
-- una vez.

alter table public.mantenimientos add column if not exists lugar        text;
alter table public.mantenimientos add column if not exists conclusiones text;
alter table public.mantenimientos add column if not exists fotos        text;

-- ── Refrescar el esquema que ve la API ─────────────────────────────────────
notify pgrst, 'reload schema';

-- ── Verificación: debe listar las 3 columnas ───────────────────────────────
select column_name, data_type
from information_schema.columns
where table_schema='public' and table_name='mantenimientos'
  and column_name in ('lugar','conclusiones','fotos')
order by column_name;
