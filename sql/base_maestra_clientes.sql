-- ══ BASE MAESTRA DE GDAR · TABLA DE CLIENTES ════════════════════════════════
--
-- Se ejecuta en un proyecto de Supabase APARTE, propio de GDAR, distinto del de
-- cualquier cliente. Es el registro de a quién se le vendió el sistema.
--
-- NINGUNA aplicación de cliente consulta esta tabla. Solo la usa el
-- administrador desde herramientas/clientes.js.
--
-- ── Por qué queda cerrada ──────────────────────────────────────────────────
-- La tabla guarda la URL de la base de datos de cada cliente. Si fuera legible
-- con la llave pública, cualquiera podría enumerar las bases de todos los
-- clientes de un tirón. Por eso se activa RLS y NO se crea ninguna política:
-- sin políticas, la llave anon/publishable no ve ni escribe nada, y solo la
-- service_role (que nunca sale del equipo del administrador) tiene acceso.
--
-- No pegue la service_role key en ningún archivo del repositorio: es público.

create table if not exists public.clientes (
  id              bigserial primary key,
  nombre          text not null,
  ruc             text,
  -- Dónde vive su sistema
  subdominio      text unique,          -- ecosermo.gdarei.com
  repo            text,                 -- GDAR7/GDARSystem
  -- Su base de datos propia. Se guarda la URL para saber cuál es la suya;
  -- las llaves NO se guardan aquí.
  supa_url        text,
  supa_proyecto   text,                 -- el ref del proyecto, para ubicarlo rápido
  -- Relación comercial
  estado          text not null default 'activo',   -- activo · suspendido · baja
  alta            date not null default current_date,
  contacto        text,
  email           text,
  telefono        text,
  -- Operación
  ultimo_respaldo timestamptz,
  notas           text,
  creado_en       timestamptz not null default now()
);

comment on table public.clientes is
  'Registro de empresas que usan GDAR. Solo accesible con service_role.';

-- Solo un cliente por subdominio: dos apuntando al mismo sitio sería un error
-- de configuración difícil de detectar después.
create unique index if not exists clientes_subdominio_idx
  on public.clientes (lower(subdominio));

-- ── El candado ─────────────────────────────────────────────────────────────
-- Con RLS activo y sin políticas, la llave pública queda sin acceso.
alter table public.clientes enable row level security;

-- Por si alguna vez se creó una política permisiva a mano, se retira.
drop policy if exists "todo"     on public.clientes;
drop policy if exists "publico"  on public.clientes;

-- ── El primer cliente ──────────────────────────────────────────────────────
insert into public.clientes
  (nombre, ruc, subdominio, repo, supa_url, supa_proyecto, estado, alta, notas)
values
  ('ECOSERMO', '20571533180', 'ecosermo.gdarei.com', 'GDAR7/GDARSystem',
   'https://kotqxhpkjuaxbgwhiode.supabase.co', 'kotqxhpkjuaxbgwhiode',
   'activo', '2026-09-05',
   'Primer cliente. Dominio propio publicado el 2026-09-05.')
on conflict (subdominio) do nothing;

-- ── Comprobación ───────────────────────────────────────────────────────────
-- Desde el editor SQL de Supabase (que usa service_role) debe verse la fila.
-- Desde el navegador con la llave pública NO debe verse nada: esa es la señal
-- de que el candado quedó bien puesto.
select id, nombre, subdominio, estado, alta from public.clientes order by id;
