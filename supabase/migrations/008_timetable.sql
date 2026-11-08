-- =====================================================================
-- UNOVA — migration : emplois du temps (saisie manuelle, conflits, publication)
--
-- - Salles (partagées entre programmes, gérées par l'administrateur).
-- - Séances hebdomadaires par classe, avec type (cours, TD, TP), groupe facultatif,
--   enseignant (obligatoirement affecté au cours) et salle.
-- - Brouillon / publié : les étudiants ne voient que le publié.
-- - Conflits refusés par la base : classe (ou groupe), enseignant, salle, sur
--   toute l'année universitaire, tous programmes confondus.
-- - Journal des modifications (servira aux notifications).
-- La génération automatique viendra dans une étape suivante.
--
-- Prérequis : migrations 001 à 007.
-- À exécuter UNE SEULE FOIS dans Supabase > SQL Editor.
-- Si un fichier 008_*.sql existe déjà, renomme celui-ci 009_timetable.sql.
-- =====================================================================

create type public.session_type     as enum ('cours', 'td', 'tp');
create type public.timetable_status as enum ('draft', 'published');

-- ---------- salles ----------------------------------------------------
create table public.rooms (
  id         uuid primary key default gen_random_uuid(),
  name       text not null unique check (char_length(name) between 1 and 60),
  capacity   integer check (capacity is null or capacity between 1 and 1000),
  is_active  boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------- séances ---------------------------------------------------
create table public.timetable_entries (
  id           uuid primary key default gen_random_uuid(),
  class_id     uuid not null references public.classes(id) on delete cascade,
  course_id    uuid not null references public.courses(id) on delete cascade,
  semester     smallint not null check (semester in (1, 2)),   -- semestre de l'année (1 ou 2)
  session_type public.session_type not null default 'cours',
  group_label  text check (group_label is null or char_length(group_label) between 1 and 20),
  weekday      smallint not null check (weekday between 1 and 6),   -- 1 = lundi ... 6 = samedi
  start_time   time not null,
  end_time     time not null,
  room_id      uuid references public.rooms(id) on delete set null,
  teacher_id   uuid references public.profiles(id) on delete set null,
  status       public.timetable_status not null default 'draft',
  is_locked    boolean not null default false,   -- réservé à la génération automatique
  created_by   uuid default auth.uid() references public.profiles(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  check (end_time > start_time)
);
create index on public.timetable_entries (class_id, semester, status);
create index on public.timetable_entries (teacher_id, weekday);
create index on public.timetable_entries (room_id, weekday);
create index on public.timetable_entries (course_id);

create trigger timetable_entries_updated_at
  before update on public.timetable_entries
  for each row execute function public.set_updated_at();

-- journal des modifications
create table public.timetable_change_logs (
  id         bigint generated always as identity primary key,
  class_id   uuid not null references public.classes(id) on delete cascade,
  entry_id   uuid,
  actor_id   uuid references public.profiles(id) on delete set null,
  action     text not null,
  details    jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index on public.timetable_change_logs (class_id, created_at desc);

-- ---------- contrôles de cohérence et de conflits ---------------------
create or replace function public.timetable_before_write()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_year uuid;
begin
  select academic_year_id into v_year from public.classes where id = new.class_id;

  if not exists (select 1 from public.courses c
                 where c.id = new.course_id and c.class_id = new.class_id) then
    raise exception 'course does not belong to this class' using errcode = '23514';
  end if;

  if new.teacher_id is not null and not exists (
    select 1 from public.course_teachers ct
    where ct.course_id = new.course_id and ct.user_id = new.teacher_id) then
    raise exception 'teacher is not assigned to this course' using errcode = '23514';
  end if;

  -- même classe (et même groupe, ou l'un des deux sans groupe)
  if exists (
    select 1 from public.timetable_entries s
    where s.id <> new.id and s.class_id = new.class_id
      and s.semester = new.semester and s.weekday = new.weekday
      and s.start_time < new.end_time and new.start_time < s.end_time
      and (s.group_label is null or new.group_label is null
           or lower(s.group_label) = lower(new.group_label))
  ) then
    raise exception 'conflict:class' using errcode = '23P01';
  end if;

  -- même enseignant, dans toute l'année universitaire (tous programmes)
  if new.teacher_id is not null and exists (
    select 1 from public.timetable_entries s
    join public.classes sc on sc.id = s.class_id
    where s.id <> new.id and s.teacher_id = new.teacher_id
      and sc.academic_year_id = v_year
      and s.semester = new.semester and s.weekday = new.weekday
      and s.start_time < new.end_time and new.start_time < s.end_time
  ) then
    raise exception 'conflict:teacher' using errcode = '23P01';
  end if;

  -- même salle, dans toute l'année universitaire
  if new.room_id is not null and exists (
    select 1 from public.timetable_entries s
    join public.classes sc on sc.id = s.class_id
    where s.id <> new.id and s.room_id = new.room_id
      and sc.academic_year_id = v_year
      and s.semester = new.semester and s.weekday = new.weekday
      and s.start_time < new.end_time and new.start_time < s.end_time
  ) then
    raise exception 'conflict:room' using errcode = '23P01';
  end if;

  return new;
end $$;

-- ne se déclenche pas quand seul le statut change (publication)
create trigger timetable_entries_before_write
  before insert or update of class_id, course_id, semester, weekday, start_time,
                              end_time, room_id, teacher_id, group_label
  on public.timetable_entries
  for each row execute function public.timetable_before_write();

-- journal
create or replace function public.timetable_log_change()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  r public.timetable_entries%rowtype;
  v_action text;
begin
  if tg_op = 'DELETE' then
    r := old; v_action := 'entry.deleted';
  elsif tg_op = 'INSERT' then
    r := new; v_action := 'entry.created';
  else
    r := new;
    v_action := case when old.status is distinct from new.status then 'entry.status' else 'entry.updated' end;
  end if;

  insert into public.timetable_change_logs (class_id, entry_id, actor_id, action, details)
  values (r.class_id, r.id, auth.uid(), v_action,
          jsonb_build_object('course_id', r.course_id, 'weekday', r.weekday,
                             'start', r.start_time, 'end', r.end_time,
                             'semester', r.semester, 'status', r.status));
  if tg_op = 'DELETE' then return old; end if;
  return new;
end $$;

create trigger timetable_entries_log
  after insert or update or delete on public.timetable_entries
  for each row execute function public.timetable_log_change();

-- publier / dépublier un semestre complet d'une classe
create or replace function public.set_timetable_status(
  p_class uuid, p_semester smallint, p_status public.timetable_status
) returns integer
language plpgsql security definer set search_path = '' as $$
declare n integer;
begin
  if not (public.is_admin() or public.is_director_of_class(p_class)) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  update public.timetable_entries
     set status = p_status
   where class_id = p_class and semester = p_semester and status <> p_status;
  get diagnostics n = row_count;

  insert into public.audit_logs (actor_id, action, entity, entity_id, details)
  values (auth.uid(), 'timetable.' || p_status::text, 'classes', p_class::text,
          jsonb_build_object('semester', p_semester, 'count', n));
  return n;
end $$;

-- ---------- RLS --------------------------------------------------------
alter table public.rooms                 enable row level security;
alter table public.timetable_entries     enable row level security;
alter table public.timetable_change_logs enable row level security;

create policy rooms_read  on public.rooms for select to authenticated using (true);
create policy rooms_admin on public.rooms for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy timetable_read on public.timetable_entries for select to authenticated
  using (
    public.is_admin()
    or public.is_director_of_class(class_id)
    or (
      status = 'published'
      and (
        exists (select 1 from public.student_enrollments e
                where e.student_id = auth.uid() and e.class_id = timetable_entries.class_id
                  and e.status = 'accepted')
        or teacher_id = auth.uid()
        or public.is_course_teacher(course_id)
      )
    )
  );
create policy timetable_insert on public.timetable_entries for insert to authenticated
  with check (public.is_admin() or public.is_director_of_class(class_id));
create policy timetable_update on public.timetable_entries for update to authenticated
  using (public.is_admin() or public.is_director_of_class(class_id))
  with check (public.is_admin() or public.is_director_of_class(class_id));
create policy timetable_delete on public.timetable_entries for delete to authenticated
  using (public.is_admin() or public.is_director_of_class(class_id));

create policy timetable_logs_read on public.timetable_change_logs for select to authenticated
  using (public.is_admin() or public.is_director_of_class(class_id));

-- ---------- GRANTS (exposition automatique des tables désactivée) -----
revoke all on public.rooms, public.timetable_entries, public.timetable_change_logs
  from anon, authenticated;
grant all on public.rooms, public.timetable_entries, public.timetable_change_logs to service_role;
grant usage, select on all sequences in schema public to service_role;

grant select on public.rooms, public.timetable_entries, public.timetable_change_logs to authenticated;
grant insert, update, delete on public.rooms to authenticated;   -- limité à l'administrateur par RLS
grant insert (class_id, course_id, semester, session_type, group_label, weekday,
              start_time, end_time, room_id, teacher_id, is_locked, created_by)
  on public.timetable_entries to authenticated;
-- le statut ne se change QUE par la fonction set_timetable_status
grant update (course_id, semester, session_type, group_label, weekday,
              start_time, end_time, room_id, teacher_id, is_locked)
  on public.timetable_entries to authenticated;
grant delete on public.timetable_entries to authenticated;

revoke all on function public.set_timetable_status(uuid, smallint, public.timetable_status)
  from public, anon;
grant execute on function public.set_timetable_status(uuid, smallint, public.timetable_status)
  to authenticated;
