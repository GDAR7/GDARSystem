-- ══ QUÉ CONTRATÓ CADA CLIENTE ═══════════════════════════════════════════════
--
-- Se ejecuta en la BASE MAESTRA de GDAR, la del registro de clientes. NO en la
-- base de ningún cliente: por eso vive en sql/ y no en supabase/migrations/,
-- que son las del esquema que se aplica a cada empresa.
--
-- ── Qué es y qué no es ────────────────────────────────────────────────────
-- Esto es el registro COMERCIAL: sirve para saber a quién se le vendió qué,
-- facturar y ver de un vistazo quién tiene qué módulos.
--
-- Lo que la aplicación de cada cliente lee en tiempo de ejecución es
-- EMPRESA_PLAN en su js/empresa.js. Esta tabla no la consulta ninguna
-- aplicación; se mantienen a mano en sincronía, igual que el resto de
-- js/empresa.js.
--
-- Podría parecer mejor que la aplicación leyera el plan de aquí, pero eso
-- obligaría a que la base de cada cliente pudiera alcanzar la maestra, que es
-- justo lo que hoy garantiza que un cliente no vea nada de otro.
--
-- ⚠ Recuerde que la maestra tiene RLS activo y NINGUNA política: solo se llega
--   con la service_role, que nunca sale del equipo del administrador.

alter table public.clientes
  add column if not exists plan text,
  -- Las claves de módulo o de área contratadas, como en EMPRESA_PLAN.
  -- Vacío o nulo = contrató todo, que es el caso de ECOSERMO.
  add column if not exists modulos text[],
  add column if not exists areas text[],
  -- Para tener a la vista lo que se cobra sin abrir otra herramienta.
  add column if not exists mensualidad numeric(10,2),
  add column if not exists moneda text default 'PEN';

comment on column public.clientes.plan is
  'Nombre comercial del plan: Base, Operacion, Integral. Solo informativo.';
comment on column public.clientes.areas is
  'Areas contratadas. Nulo = todas. Debe coincidir con EMPRESA_PLAN.areas de su repositorio.';
comment on column public.clientes.modulos is
  'Modulos sueltos contratados aparte de las areas. Debe coincidir con EMPRESA_PLAN.modulos.';

-- ── El cliente que ya existe ──────────────────────────────────────────────
-- ECOSERMO tiene todo: areas y modulos quedan nulos, que es como se declara
-- "sin recortes" tanto aquí como en EMPRESA_PLAN.
update public.clientes
   set plan = coalesce(plan, 'Integral')
 where subdominio = 'ecosermo.gdarei.com';

-- ── Comprobación ──────────────────────────────────────────────────────────
select nombre,
       subdominio,
       coalesce(plan, '(sin plan)')                as plan,
       coalesce(array_length(areas, 1), 0)         as areas_contratadas,
       coalesce(array_length(modulos, 1), 0)       as modulos_sueltos,
       case when areas is null and modulos is null
            then 'todo' else 'recortado' end       as alcance
  from public.clientes
 order by nombre;
