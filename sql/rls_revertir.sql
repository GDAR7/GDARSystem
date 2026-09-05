-- ══ VOLVER ATRÁS ════════════════════════════════════════════════════════════
--
-- Deshace sql/rls_cerrar.sql y devuelve el acceso a la llave pública.
--
-- ⚠ Al correr esto los datos vuelven a quedar accesibles para cualquiera que
--   copie la llave del JavaScript. Es la red de emergencia por si el login
--   nuevo falla y la gente no puede trabajar — no un estado para quedarse.
--
-- Si tiene que usarlo: ponga AUTH_MODO='local' en js/empresa.js, suba el
-- cambio, y avíseme para corregir lo que haya fallado en el login.

do $$
declare
  t   record;
  pol record;
  n   int := 0;
begin
  for t in
    select tablename from pg_tables where schemaname = 'public'
  loop
    for pol in
      select policyname from pg_policies
      where schemaname = 'public' and tablename = t.tablename
    loop
      execute format('drop policy %I on public.%I', pol.policyname, t.tablename);
    end loop;

    execute format('alter table public.%I disable row level security', t.tablename);
    n := n + 1;
  end loop;

  raise notice 'RLS desactivado en % tablas — los datos vuelven a estar abiertos', n;
end $$;

select
  count(*)                                     as tablas,
  count(*) filter (where not c.relrowsecurity) as sin_rls
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r';
