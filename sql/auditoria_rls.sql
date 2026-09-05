-- ══ AUDITORÍA DE SEGURIDAD · SOLO LECTURA ═══════════════════════════════════
-- No modifica nada. Ejecute cada consulta por separado (selecciónela y Run)
-- y pegue el resultado.
--
-- Qué se está mirando: la llave pública de Supabase viaja dentro del
-- JavaScript de la aplicación, así que cualquiera que abra el sistema puede
-- extraerla. Lo único que separa esa llave de los datos son las políticas RLS.
-- Estas consultas dicen qué tan abierta está esa puerta hoy.

-- ── 1 · ¿Qué tablas NO tienen RLS activo? ──────────────────────────────────
-- Sin RLS, la llave pública lee y escribe la tabla entera. Sin excepciones.
select
  c.relname                    as tabla,
  case when c.relrowsecurity then 'activo' else '*** SIN RLS ***' end as rls,
  (select count(*) from pg_policies p
    where p.schemaname='public' and p.tablename=c.relname) as politicas
from pg_class c
join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relkind='r'
order by c.relrowsecurity, c.relname;


-- ── 2 · Las políticas que existen, y a quién dejan pasar ───────────────────
-- Lo que importa es la columna `condicion`. Un `true` significa "cualquiera",
-- incluida la llave pública que va en el JavaScript.
select
  tablename  as tabla,
  policyname as politica,
  cmd        as operacion,          -- ALL, SELECT, INSERT, UPDATE, DELETE
  roles::text,
  qual       as condicion,          -- quién puede LEER
  with_check as condicion_escritura -- quién puede ESCRIBIR
from pg_policies
where schemaname='public'
order by
  case when qual='true' or qual is null then 0 else 1 end,
  tablename;


-- ── 3 · Resumen: cuántas tablas quedan abiertas de par en par ──────────────
select
  count(*) filter (where not c.relrowsecurity)                as sin_rls,
  count(*) filter (where c.relrowsecurity and pol.abiertas>0) as rls_pero_abierta,
  count(*) filter (where c.relrowsecurity and coalesce(pol.total,0)=0) as rls_sin_politicas,
  count(*)                                                    as total_tablas
from pg_class c
join pg_namespace n on n.oid=c.relnamespace
left join lateral (
  select count(*) total,
         count(*) filter (where qual='true' or qual is null) abiertas
  from pg_policies p where p.schemaname='public' and p.tablename=c.relname
) pol on true
where n.nspname='public' and c.relkind='r';


-- ── 4 · Las tablas que más importan ────────────────────────────────────────
-- personal lleva DNI, sueldo, banco y número de cuenta de 165 personas.
select
  c.relname as tabla,
  case when c.relrowsecurity then 'RLS activo' else '*** SIN RLS ***' end as estado,
  coalesce((select string_agg(distinct p.cmd||':'||coalesce(p.qual,'null'), '  ')
     from pg_policies p where p.schemaname='public' and p.tablename=c.relname),
    'sin políticas') as politicas
from pg_class c
join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relkind='r'
  and c.relname in ('personal','planilla_mes','planilla_cerrada','renta5ta',
                    'social','venta_personal','facturas_pago','reembolsables')
order by c.relname;
