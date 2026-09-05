-- ══ CERRAR EL ACCESO PÚBLICO A LOS DATOS ════════════════════════════════════
--
-- Estado hoy: de 73 tablas, 64 no tienen RLS y las otras 9 lo tienen con
-- políticas abiertas. Es decir, las 73 son legibles y modificables por
-- cualquiera que copie la llave pública del JavaScript.
--
-- Este script activa RLS en todas y deja una sola política, para el rol
-- `authenticated`. El rol `anon` —el de la llave pública— queda sin ninguna
-- política, y sin política no ve ni una fila.
--
-- ⚠ NO LO EJECUTE hasta que el login por Supabase Auth esté probado y
--   funcionando. En cuanto corra, la aplicación en modo 'local' deja de
--   cargar datos. Para volver atrás está sql/rls_revertir.sql.
--
-- Orden correcto:
--   1. node herramientas/migrarAuth.js        (crear los usuarios)
--   2. AUTH_MODO='supabase' en js/empresa.js  (y probar que entra)
--   3. este script
--
-- El bloque recorre las tablas en vez de nombrarlas una a una: así no se queda
-- ninguna fuera hoy, ni las que se agreguen mañana quedan con una lista vieja.

do $$
declare
  t   record;
  pol record;
  n   int := 0;
begin
  for t in
    select tablename from pg_tables where schemaname = 'public'
  loop
    -- Fuera las políticas anteriores: varias son `using (true)`, que deja
    -- pasar a cualquiera y anularía el propósito de este script.
    for pol in
      select policyname from pg_policies
      where schemaname = 'public' and tablename = t.tablename
    loop
      execute format('drop policy %I on public.%I', pol.policyname, t.tablename);
    end loop;

    execute format('alter table public.%I enable row level security', t.tablename);

    -- Una sola política, solo para quien inició sesión. La aplicación necesita
    -- leer y escribir en todas las tablas, así que el permiso es completo:
    -- lo que cambia es QUIÉN lo obtiene. El reparto fino por área lo sigue
    -- haciendo la aplicación con los permisos del token.
    execute format(
      'create policy gdar_autenticado on public.%I '
      'for all to authenticated using (true) with check (true)', t.tablename);

    n := n + 1;
  end loop;

  raise notice 'RLS activado y política aplicada en % tablas', n;
end $$;


-- ── Comprobación ───────────────────────────────────────────────────────────
-- sin_rls y abiertas deben quedar en 0; protegidas, en el total de tablas.
select
  count(*)                                                      as tablas,
  count(*) filter (where not c.relrowsecurity)                  as sin_rls,
  count(*) filter (where p.abiertas > 0)                        as abiertas,
  count(*) filter (where c.relrowsecurity and p.autenticado > 0) as protegidas
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
left join lateral (
  select count(*) filter (where 'anon' = any(pp.roles::text[]))          as abiertas,
         count(*) filter (where 'authenticated' = any(pp.roles::text[])) as autenticado
  from pg_policies pp
  where pp.schemaname = 'public' and pp.tablename = c.relname
) p on true
where n.nspname = 'public' and c.relkind = 'r';
