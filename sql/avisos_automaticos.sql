-- ══ AVISOS AUTOMÁTICOS ═══════════════════════════════════════════════════════
-- La base revisa sola, cada mañana, lo que requiere atención y lo deja en la
-- tabla «avisos». De ahí lo toman:
--   · la campana 🔔 del GDAR (js/avisos.js), al entrar al sistema;
--   · la Edge Function «avisos-diarios», que manda un correo-resumen.
--
-- Qué revisa:
--   1. Documentos de equipos (Máster de Equipos): SOAT, Póliza de Seguros,
--      Revisión técnica, RIC y GPS. Avisa a los 30, 15, 7, 3, 2 y 1 días de
--      vencer y el mismo día. Vencido: el día siguiente y luego cada lunes,
--      hasta que se renueve. Solo equipos que no están desmovilizados.
--   2. Parte de turno no recibido: si ayer no hubo parte del turno Día o del
--      turno Noche.
--
-- Horario (Perú no cambia de hora: UTC−5):
--   · 9:00 a.m. → revisar_avisos()        (deja los avisos del día)
--   · 9:05 a.m. → Edge Function            (manda el correo)
--   A las 9:00 el turno noche de ayer ya tuvo tiempo de registrar su parte.
--
-- Se puede correr más de una vez: no duplica nada.
--
-- ── ANTES DE CORRER ESTE ARCHIVO ──────────────────────────────────────────
-- En el panel de Supabase → Database → Extensions, activar:
--     pg_cron   y   pg_net
-- (las dos líneas de abajo lo intentan, pero en algunos proyectos el panel
-- es el único camino).

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- ── 1. Tabla de avisos ─────────────────────────────────────────────────────
create table if not exists public.avisos (
  id          bigserial primary key,
  fecha       date not null,                 -- día en que se generó
  tipo        text not null,                 -- 'equipo_doc' | 'parte_falta'
  nivel       text not null,                 -- 'vencido' | 'urgente' | 'proximo' | 'falta'
  clave       text not null,                 -- identifica el aviso dentro del día
  titulo      text not null,
  detalle     text,
  modulo      text,                          -- pantalla del GDAR que lo resuelve
  dias        integer,                       -- días para vencer (negativo = vencido)
  creado_en   timestamptz not null default now(),
  enviado_en  timestamptz,                   -- cuándo salió en el correo
  unique (fecha, clave)
);
create index if not exists ix_avisos_fecha on public.avisos (fecha desc);

-- Destinatarios del correo. Para cambiar o sumar uno, basta un insert/update:
-- no hay que tocar la Edge Function.
create table if not exists public.avisos_correo (
  correo  text primary key,
  tipos   text[] not null default array['equipo_doc','parte_falta'],
  activo  boolean not null default true
);
insert into public.avisos_correo (correo) values ('arodrigueza@ecosermo.com')
  on conflict (correo) do nothing;

-- ── Seguridad ──────────────────────────────────────────────────────────────
-- El sistema solo LEE los avisos: los escribe la función de abajo, que corre
-- con permisos propios (security definer). Los correos no los ve nadie desde
-- el navegador.
alter table public.avisos        enable row level security;
alter table public.avisos_correo enable row level security;
drop policy if exists gdar_leer on public.avisos;
create policy gdar_leer on public.avisos for select to authenticated using (true);
grant select on public.avisos to authenticated;
revoke all on public.avisos_correo from anon, authenticated;

-- ── 2. La revisión ─────────────────────────────────────────────────────────
create or replace function public.revisar_avisos(
  p_dia date default (now() at time zone 'America/Lima')::date
) returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  n integer := 0;
  v integer;
begin
  -- 1. Documentos de equipos
  insert into avisos (fecha, tipo, nivel, clave, titulo, detalle, modulo, dias)
  select p_dia, 'equipo_doc',
         case when d.venc < p_dia then 'vencido'
              when d.venc - p_dia <= 7 then 'urgente'
              else 'proximo' end,
         'eq:' || e.id || ':' || d.doc,
         coalesce(e.codigo, 'Equipo ' || e.id) || ' · ' || d.nombre || ' ' ||
           case when d.venc < p_dia then 'VENCIDO hace ' || (p_dia - d.venc) || ' día(s)'
                when d.venc = p_dia then 'vence HOY'
                else 'vence en ' || (d.venc - p_dia) || ' día(s)' end,
         trim(coalesce(e.nombre, '') || ' · vence el ' || to_char(d.venc, 'DD/MM/YYYY')),
         'masterEquipos',
         d.venc - p_dia
    from equipos e
    cross join lateral (values
      ('soat',   'SOAT',              e.soat_venc),
      ('poliza', 'Póliza de Seguros', e.poliza_trec_venc),
      ('revtec', 'Revisión técnica',  e.revision_tecnica_venc),
      ('ric',    'RIC',               e.ric_venc),
      ('gps',    'GPS',               e.gps_venc)
    ) as d(doc, nombre, venc)
   where coalesce(e.est, '') <> 'Desmovilizado'
     and coalesce(e.sub, '') <> 'Desmovilizado'
     and d.venc is not null
     and (   (d.venc - p_dia) in (30, 15, 7, 3, 2, 1, 0)
          or (d.venc = p_dia - 1)                                  -- recién vencido
          or (d.venc < p_dia and extract(isodow from p_dia) = 1))  -- vencido: cada lunes
  on conflict (fecha, clave) do nothing;
  get diagnostics v = row_count;  n := n + v;

  -- 2. Partes de turno de ayer
  insert into avisos (fecha, tipo, nivel, clave, titulo, detalle, modulo, dias)
  select p_dia, 'parte_falta', 'falta',
         'pt:' || (p_dia - 1) || ':' || t.turno,
         'Falta el parte de turno ' || t.turno || ' del ' || to_char(p_dia - 1, 'DD/MM/YYYY'),
         'Nadie registró el parte de ese turno en Operaciones › Parte de Turno.',
         'supervision',
         null
    from (values ('Día'), ('Noche')) as t(turno)
   where not exists (select 1 from partes_turno p
                      where p.fecha = p_dia - 1 and p.turno = t.turno)
  on conflict (fecha, clave) do nothing;
  get diagnostics v = row_count;  n := n + v;

  return n;   -- cuántos avisos nuevos dejó
end;
$$;
revoke all on function public.revisar_avisos(date) from public, anon, authenticated;

-- ── 3. El secreto entre el programador y la Edge Function ──────────────────
-- Se guarda en Vault (cifrado). La Edge Function solo atiende pedidos que lo
-- traen, así nadie de afuera puede disparar correos.
do $$
begin
  if not exists (select 1 from vault.secrets where name = 'gdar_avisos_secreto') then
    perform vault.create_secret(replace(gen_random_uuid()::text, '-', ''), 'gdar_avisos_secreto');
  end if;
end $$;

-- ── 4. Programación diaria (UTC: 14:00 = 9:00 a.m. en Perú) ────────────────
select cron.unschedule(jobid) from cron.job
 where jobname in ('gdar_revisar_avisos', 'gdar_correo_avisos');

select cron.schedule('gdar_revisar_avisos', '0 14 * * *',
  $$ select public.revisar_avisos(); $$);

select cron.schedule('gdar_correo_avisos', '5 14 * * *', $$
  select net.http_post(
    url     := 'https://kotqxhpkjuaxbgwhiode.supabase.co/functions/v1/avisos-diarios',
    headers := jsonb_build_object(
                 'Content-Type', 'application/json',
                 'x-gdar-secreto', (select decrypted_secret from vault.decrypted_secrets
                                     where name = 'gdar_avisos_secreto')),
    body    := '{}'::jsonb
  );
$$);

-- ── Refrescar el esquema que ve la API ─────────────────────────────────────
notify pgrst, 'reload schema';

-- ── Comprobación ───────────────────────────────────────────────────────────
-- a) Correr la revisión de hoy a mano: devuelve cuántos avisos nuevos dejó
select public.revisar_avisos() as avisos_nuevos;
-- b) Lo que quedó
select fecha, nivel, titulo, detalle from public.avisos order by fecha desc, dias nulls first;
-- c) Las dos tareas programadas
select jobname, schedule, active from cron.job where jobname like 'gdar_%';
-- d) El secreto, para copiarlo en la Edge Function (paso 3 de la guía)
select decrypted_secret as copiar_en_la_edge_function
  from vault.decrypted_secrets where name = 'gdar_avisos_secreto';
