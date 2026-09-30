-- ══ STORAGE · DOCUMENTOS DE EDP ═════════════════════════════════════════════
-- Al guardar un EDP de proveedores, el sistema archiva el documento tal como
-- quedó, en el bucket 'Equip_eco26', carpeta 'edp/'.
--
-- Si al guardar sale:
--     «EDP guardado, pero el documento no se archivó:
--      new row violates row-level security policy»
-- es que el bucket deja escribir en otras carpetas (firmas/, equipos/) pero no
-- en 'edp/'. Este archivo da ese permiso a los usuarios que ya iniciaron sesión.
--
-- El EDP se guarda igual aunque el archivado falle: esto solo habilita que el
-- documento quede archivado para poder reabrirlo desde 📁 Archivo de EDP.

-- ── 1 · Qué políticas hay hoy (para saber qué se está cambiando) ───────────
select policyname, cmd, roles
from pg_policies
where schemaname = 'storage' and tablename = 'objects'
order by policyname;

-- ── 2 · El bucket debe existir y ser público (el documento se abre por URL) ─
insert into storage.buckets (id, name, public)
values ('Equip_eco26', 'Equip_eco26', true)
on conflict (id) do update set public = true;

-- ── 3 · Permiso para los usuarios autenticados sobre ese bucket ────────────
-- Cubre subir el documento, volver a leerlo y reemplazarlo cuando se regraba
-- un EDP con el mismo número.
drop policy if exists gdar_equip_eco26_todo on storage.objects;
create policy gdar_equip_eco26_todo on storage.objects
  for all to authenticated
  using      (bucket_id = 'Equip_eco26')
  with check (bucket_id = 'Equip_eco26');

-- Lectura pública: el documento archivado se abre en una pestaña por su URL
drop policy if exists gdar_equip_eco26_lectura on storage.objects;
create policy gdar_equip_eco26_lectura on storage.objects
  for select to anon
  using (bucket_id = 'Equip_eco26');

-- ── 4 · Comprobación: deben aparecer las dos políticas nuevas ──────────────
select policyname, cmd, roles
from pg_policies
where schemaname = 'storage' and tablename = 'objects'
  and policyname like 'gdar_equip_eco26%'
order by policyname;
