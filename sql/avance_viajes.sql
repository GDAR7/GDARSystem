-- ══ CONTROL DE EQUIPOS · AVANCE DE VIAJES ══════════════════════════════════
-- Corte de viajes de volquetes a media jornada (antes de que exista el parte
-- físico) y las restricciones que están frenando el ritmo. Se llena en
-- Control de Equipos → 🚛 Avance de Viajes y sale en PDF.
--
-- Una fila = un corte: fecha + turno + hora del corte. Se pueden mandar varios
-- cortes el mismo día (10:00, 12:00, 15:00…).
--
--   · id             : lo genera la pantalla (marca de tiempo).
--   · fecha / turno  : 'Día' o 'Noche'.  hora_corte : 'HH:MM'.
--   · meta           : viajes esperados por volquete en el turno (0 = sin meta).
--   · volquetes      : [{eqId, codigo, operador, viajes, origen, destino,
--                        material, noOpera, motivo}]
--   · restricciones  : [{motivo, ini, fin, eqIds, todos, descripcion, frente,
--                        ubicacion:{x,y}, fotos:[{url,path,nombre,hora,nota}]}]
--                      ubicacion en % de la imagen aérea, igual que el Parte
--                      de Turno.
--   · observaciones, autor, creado_en, actualizado_en.
--
-- Las fotos van al mismo depósito que el Parte de Turno (AuxMec_Evidencias),
-- en la carpeta avance-viajes/: no hace falta crear nada en Storage.
--
-- La leen y la escriben los usuarios con sesión, como el resto de las tablas.
-- Se puede correr más de una vez: no duplica nada.

create table if not exists public.avance_viajes (
  id             bigint primary key,
  fecha          date not null,
  turno          text not null check (turno in ('Día','Noche')),
  hora_corte     text not null,
  meta           numeric not null default 0,
  volquetes      jsonb not null default '[]'::jsonb,
  restricciones  jsonb not null default '[]'::jsonb,
  observaciones  text,
  autor          text,
  creado_en      timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);
create index if not exists avance_viajes_fecha on public.avance_viajes (fecha desc, turno);

-- ── Seguridad ──────────────────────────────────────────────────────────────
alter table public.avance_viajes enable row level security;
drop policy if exists gdar_autenticado on public.avance_viajes;
create policy gdar_autenticado on public.avance_viajes
  for all to authenticated using (true) with check (true);
grant select, insert, update, delete on public.avance_viajes to authenticated;

-- ── Refrescar el esquema que ve la API ─────────────────────────────────────
notify pgrst, 'reload schema';

-- ── Comprobación ───────────────────────────────────────────────────────────
-- Debe devolver la tabla vacía (o los cortes que ya se hayan guardado).
select id, fecha, turno, hora_corte, jsonb_array_length(volquetes) as volquetes,
       jsonb_array_length(restricciones) as restricciones
from public.avance_viajes order by fecha desc, hora_corte desc;
