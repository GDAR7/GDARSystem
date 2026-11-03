-- ══ MÁSTER DE EQUIPOS · HISTORIAL DE CAMBIOS ═══════════════════════════════
-- Anota cada cambio en las dos tablas del Máster de Equipos:
--   · equipos           (incluye sus documentos e imágenes)
--   · subtipos_equipo
-- Ninguna otra tabla se registra.
--
-- Lo anota la BASE (un trigger), no la pantalla: no se puede saltar aunque
-- alguien escriba por fuera del sistema. Por cada cambio guarda:
--   · en              : cuándo
--   · tabla, registro : qué tabla y qué id
--   · etiqueta        : el código del equipo o el nombre del subtipo
--   · accion          : crear · editar · eliminar
--   · codigo, nombre  : quién (de su sesión de Supabase Auth)
--   · cambios         : en editar, SOLO los campos que cambiaron
--                       {campo:{antes,despues}}; en crear/eliminar, la fila
--                       completa. Un guardado sin cambios no anota nada.
--
-- Solo el administrador (EIBEL25) puede LEERLO, y NADIE puede editarlo ni
-- borrarlo desde el sistema: no hay políticas de escritura. El trigger
-- escribe con permisos propios (security definer).
--
-- Se puede correr más de una vez: no duplica nada.

create table if not exists public.historial_master (
  id        bigint generated always as identity primary key,
  en        timestamptz not null default now(),
  tabla     text not null,
  registro  text,
  etiqueta  text,
  accion    text not null check (accion in ('crear','editar','eliminar')),
  codigo    text,
  nombre    text,
  cambios   jsonb
);
create index if not exists historial_master_en  on public.historial_master (en desc);
create index if not exists historial_master_reg on public.historial_master (tabla, registro);

-- ── Seguridad ──────────────────────────────────────────────────────────────
alter table public.historial_master enable row level security;
drop policy if exists gdar_autenticado on public.historial_master;
drop policy if exists hm_admin_leer    on public.historial_master;

-- Leer: solo el administrador
create policy hm_admin_leer on public.historial_master
  for select to authenticated
  using ((auth.jwt() -> 'user_metadata' ->> 'codigo') = 'EIBEL25');

-- Sin políticas de insert/update/delete: desde el sistema nadie lo altera.
revoke insert, update, delete on public.historial_master from anon, authenticated;
grant select on public.historial_master to authenticated;

-- ── El trigger ─────────────────────────────────────────────────────────────
create or replace function public.hm_registrar() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  j    jsonb := coalesce(auth.jwt(), '{}'::jsonb);
  vcod text  := coalesce(j -> 'user_metadata' ->> 'codigo',
                  case when coalesce(j ->> 'role', '') = 'service_role' then 'SISTEMA' else 'DESCONOCIDO' end);
  vnom text  := j -> 'user_metadata' ->> 'nombre';
  o    jsonb;
  n    jsonb;
  dif  jsonb := '{}'::jsonb;
  k    text;
begin
  if tg_op = 'INSERT' then
    n := to_jsonb(new);
    insert into public.historial_master (tabla, registro, etiqueta, accion, codigo, nombre, cambios)
    values (tg_table_name, n ->> 'id', coalesce(n ->> 'codigo', n ->> 'nombre'), 'crear', vcod, vnom, n);
    return new;
  elsif tg_op = 'UPDATE' then
    o := to_jsonb(old);
    n := to_jsonb(new);
    for k in select jsonb_object_keys(n) loop
      if (o -> k) is distinct from (n -> k) then
        dif := dif || jsonb_build_object(k, jsonb_build_object('antes', o -> k, 'despues', n -> k));
      end if;
    end loop;
    if dif <> '{}'::jsonb then
      insert into public.historial_master (tabla, registro, etiqueta, accion, codigo, nombre, cambios)
      values (tg_table_name, n ->> 'id', coalesce(n ->> 'codigo', n ->> 'nombre'), 'editar', vcod, vnom, dif);
    end if;
    return new;
  else
    o := to_jsonb(old);
    insert into public.historial_master (tabla, registro, etiqueta, accion, codigo, nombre, cambios)
    values (tg_table_name, o ->> 'id', coalesce(o ->> 'codigo', o ->> 'nombre'), 'eliminar', vcod, vnom, o);
    return old;
  end if;
end $$;

drop trigger if exists hm_equipos on public.equipos;
create trigger hm_equipos
  after insert or update or delete on public.equipos
  for each row execute function public.hm_registrar();

drop trigger if exists hm_subtipos on public.subtipos_equipo;
create trigger hm_subtipos
  after insert or update or delete on public.subtipos_equipo
  for each row execute function public.hm_registrar();

notify pgrst, 'reload schema';

-- ── Comprobación ───────────────────────────────────────────────────────────
-- Debe devolver los 2 triggers.
select event_object_table as tabla, trigger_name, string_agg(event_manipulation, ', ') as eventos
from information_schema.triggers
where trigger_name in ('hm_equipos', 'hm_subtipos')
group by 1, 2;
