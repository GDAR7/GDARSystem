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
--   3. Inoperatividad de equipos de los ÚLTIMOS 7 DÍAS (partes diarios del
--      Reporte de Equipos): un aviso por equipo con sus horas paradas, el
--      motivo (sacado de las observaciones del parte y clasificado) y si
--      sigue inoperativo o ya opera.
--   4. Datos a corregir de esos 7 días: partes en STANDBY con horas
--      inoperativas (el standby no es falla) y partes inoperativos sin motivo.
--
-- Si ya corrió este archivo antes, vuelva a correrlo completo: es seguro
-- (no duplica avisos, conserva el secreto y reprograma las tareas).
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
  tipo        text not null,                 -- 'equipo_doc' | 'parte_falta' | 'equipo_inop' | 'dato_inop'
  nivel       text not null,                 -- 'vencido' | 'urgente' | 'proximo' | 'falta' | 'inoperativo' | 'recuperado' | 'dato'
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
  tipos   text[] not null default array['equipo_doc','parte_falta','equipo_inop','dato_inop'],
  activo  boolean not null default true
);
alter table public.avisos_correo
  alter column tipos set default array['equipo_doc','parte_falta','equipo_inop','dato_inop'];
insert into public.avisos_correo (correo) values ('arodrigueza@ecosermo.com')
  on conflict (correo) do nothing;
-- Quien ya estaba recibe también los avisos nuevos de inoperatividad
update public.avisos_correo
   set tipos = tipos || array['equipo_inop','dato_inop']
 where not (tipos @> array['equipo_inop']);

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
-- El motivo de una parada, a partir del texto libre de Observaciones del parte.
-- El orden importa: gana la primera categoría que coincide (p. ej.
-- «recalentamiento de cables» es Eléctrico, no Motor).
create or replace function public.motivo_inop(p_texto text)
returns text
language sql
immutable
as $$
  select case
    when t is null or t ~ '^[-. ]*$'                                         then 'Sin motivo registrado'
    when t ~ 'llanta|neumatic|rotacion|pinchad|caucho'                       then 'Neumáticos'
    when t ~ 'sistema de aire|aire comprimido|compresor'                     then 'Sistema de aire'
    when t ~ 'electric|cable|bateri|alternador|arranc|fusible|corto circ'    then 'Eléctrico'
    when t ~ 'laina|varillaje|cucharon|oruga|zapata|rodaje|cuchilla'         then 'Implemento / tren de rodaje'
    when t ~ 'hidraul|manguera|fuga|cilindro'                                then 'Hidráulico'
    when t ~ 'transmis|embrague|freno|direcc|diferencial|cardan'             then 'Transmisión / frenos / dirección'
    when t ~ 'motor|recalent|refrigera|radiador|inyector|turbo'              then 'Motor'
    when t ~ '\mpm ?[0-9]|preventiv'                                         then 'Mantenimiento preventivo (PM)'
    when t ~ 'cabina|ventana|venta |tanque|chasis|tolva|soldad|parabris'     then 'Estructura / cabina / tanque'
    when t ~ 'cinturon|alarma|extintor|circulina'                            then 'Seguridad'
    else 'Otros'
  end
  from (select nullif(translate(lower(trim(coalesce(p_texto, ''))), 'áéíóúüñ', 'aeiouun'), '') as t) x;
$$;

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

  -- 3. Inoperatividad de los últimos 7 días (de hace 7 días a ayer)
  --    Un parte es inoperativo si su condición lo dice, o si tiene horas
  --    inoperativas sin ser STANDBY (el standby no es falla).
  with pi as (
    select p.id, p.eq_id, p.fecha, p.observaciones, coalesce(p.im, 0) as im, e.codigo,
           (   coalesce(p.condicion, '') ilike 'INOPERATIVO%'
            or coalesce(p.condicion, '') ilike 'OPERATIVO/INOPERATIVO%'
            or (coalesce(p.im, 0) > 0 and coalesce(p.condicion, '') not ilike '%STANDBY%')) as es_inop
      from partes p
      join equipos e on e.id = p.eq_id
     where p.fecha between p_dia - 7 and p_dia - 1
       and coalesce(e.est, '') <> 'Desmovilizado'
       and coalesce(e.sub, '') <> 'Desmovilizado'
  ), agg as (
    select eq_id, max(codigo) as codigo,
           sum(im) filter (where es_inop)               as horas,
           count(distinct fecha) filter (where es_inop) as dias
      from pi group by eq_id
    having count(*) filter (where es_inop) > 0
  ), mot as (      -- el motivo del último parte inoperativo que lo explica
    select distinct on (eq_id) eq_id, observaciones
      from pi
     where es_inop and coalesce(trim(observaciones), '') !~ '^[-. ]*$'
     order by eq_id, fecha desc, id desc
  ), ult as (      -- ¿cómo terminó la semana? el último parte del equipo
    select distinct on (eq_id) eq_id, es_inop
      from pi order by eq_id, fecha desc, id desc
  )
  insert into avisos (fecha, tipo, nivel, clave, titulo, detalle, modulo, dias)
  select p_dia, 'equipo_inop',
         case when u.es_inop then 'inoperativo' else 'recuperado' end,
         'inop:' || a.eq_id,
         coalesce(a.codigo, 'Equipo ' || a.eq_id) || ' · ' ||
           case when u.es_inop then 'sigue INOPERATIVO' else 'ya opera' end ||
           ' · ' || trim(to_char(coalesce(a.horas, 0), 'FM999990.0')) || ' h paradas en 7 días',
         'Motivo: ' || motivo_inop(m.observaciones) ||
           coalesce(' — ' || left(regexp_replace(trim(m.observaciones), '^[-\s]+', ''), 140), '') ||
           ' · ' || a.dias || ' día(s) con parada',
         'reporteEquipos',
         a.dias
    from agg a
    join ult u using (eq_id)
    left join mot m using (eq_id)
  on conflict (fecha, clave) do nothing;
  get diagnostics v = row_count;  n := n + v;

  -- 4. Datos a corregir de esos 7 días, uno por equipo
  insert into avisos (fecha, tipo, nivel, clave, titulo, detalle, modulo, dias)
  select p_dia, 'dato_inop', 'dato',
         'dato:' || q.eq_id,
         coalesce(max(q.codigo), 'Equipo ' || q.eq_id) || ' · revisar partes de los últimos 7 días',
         concat_ws(' · ',
           case when count(*) filter (where q.sb) > 0 then
             count(*) filter (where q.sb) || ' parte(s) en STANDBY con ' ||
             trim(to_char(sum(q.im) filter (where q.sb), 'FM999990.0')) || ' h inoperativas (el standby no es falla)' end,
           case when count(*) filter (where q.sinmot) > 0 then
             count(*) filter (where q.sinmot) || ' parte(s) inoperativo(s) sin motivo en Observaciones' end),
         'reporteEquipos',
         null
    from (
      select p.eq_id, e.codigo, coalesce(p.im, 0) as im,
             (coalesce(p.condicion, '') ilike '%STANDBY%' and coalesce(p.im, 0) > 0) as sb,
             (coalesce(p.condicion, '') ilike '%INOPERATIVO%'
              and coalesce(trim(p.observaciones), '') ~ '^[-. ]*$') as sinmot
        from partes p
        join equipos e on e.id = p.eq_id
       where p.fecha between p_dia - 7 and p_dia - 1
         and coalesce(e.est, '') <> 'Desmovilizado'
         and coalesce(e.sub, '') <> 'Desmovilizado'
    ) q
   group by q.eq_id
  having count(*) filter (where q.sb or q.sinmot) > 0
  on conflict (fecha, clave) do nothing;
  get diagnostics v = row_count;  n := n + v;

  return n;   -- cuántos avisos nuevos dejó
end;
$$;
revoke all on function public.revisar_avisos(date) from public, anon, authenticated;
revoke all on function public.motivo_inop(text) from public, anon, authenticated;

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
