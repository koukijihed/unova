-- =====================================================================
-- UNOVA — migration : génération automatique des emplois du temps
--
-- - course_requirements : besoins horaires d'un cours (séances/semaine, durée, groupe...).
-- - teacher_unavailability : créneaux où un enseignant n'est PAS disponible.
-- - timetable_generations : historique des générations.
-- - generate_timetable() : algorithme glouton exécuté DANS la base (pas dans le Worker
--   Cloudflare, dont le temps de calcul gratuit est très limité). Il ne produit que des
--   BROUILLONS, respecte les conflits (classe/groupe, enseignant, salle), les
--   indisponibilités, la pause, la capacité des salles, et conserve les séances saisies à
--   la main ou verrouillées. Il ne garantit pas une solution optimale : ce qui ne peut
--   pas être placé est signalé, le directeur ajuste à la main.
--
-- Prérequis : migrations 001 à 008.
-- À exécuter UNE SEULE FOIS dans Supabase > SQL Editor.
-- Si un fichier 009_*.sql existe déjà, renomme celui-ci 010_timetable_generation.sql.
-- =====================================================================

-- ---------- besoins horaires des cours --------------------------------
create table public.course_requirements (
  id                uuid primary key default gen_random_uuid(),
  course_id         uuid not null references public.courses(id) on delete cascade,
  session_type      public.session_type not null default 'cours',
  group_label       text check (group_label is null or char_length(group_label) between 1 and 20),
  sessions_per_week smallint not null check (sessions_per_week between 1 and 6),
  duration_minutes  smallint not null check (duration_minutes between 30 and 240 and duration_minutes % 15 = 0),
  teacher_id        uuid references public.profiles(id) on delete set null,
  preferred_room_id uuid references public.rooms(id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create unique index course_requirements_unique
  on public.course_requirements (course_id, session_type, coalesce(lower(group_label), ''));

create trigger course_requirements_updated_at
  before update on public.course_requirements
  for each row execute function public.set_updated_at();

-- ---------- indisponibilités des enseignants --------------------------
create table public.teacher_unavailability (
  id         uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  weekday    smallint not null check (weekday between 1 and 6),
  start_time time not null,
  end_time   time not null,
  note       text check (note is null or char_length(note) <= 200),
  created_at timestamptz not null default now(),
  check (end_time > start_time)
);
create index on public.teacher_unavailability (teacher_id, weekday);

-- ---------- historique des générations --------------------------------
create table public.timetable_generations (
  id         uuid primary key default gen_random_uuid(),
  class_id   uuid not null references public.classes(id) on delete cascade,
  semester   smallint not null check (semester in (1, 2)),
  actor_id   uuid references public.profiles(id) on delete set null,
  params     jsonb not null default '{}'::jsonb,
  result     jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index on public.timetable_generations (class_id, created_at desc);

alter table public.timetable_entries
  add column generation_id uuid references public.timetable_generations(id) on delete set null;
create index on public.timetable_entries (generation_id);

-- ---------- RLS --------------------------------------------------------
alter table public.course_requirements   enable row level security;
alter table public.teacher_unavailability enable row level security;
alter table public.timetable_generations enable row level security;

create policy requirements_read on public.course_requirements for select to authenticated
  using (public.can_upload_to_course(course_id));
create policy requirements_insert on public.course_requirements for insert to authenticated
  with check (public.can_manage_course(course_id));
create policy requirements_update on public.course_requirements for update to authenticated
  using (public.can_manage_course(course_id))
  with check (public.can_manage_course(course_id));
create policy requirements_delete on public.course_requirements for delete to authenticated
  using (public.can_manage_course(course_id));

create policy unavailability_read on public.teacher_unavailability for select to authenticated
  using (teacher_id = auth.uid() or public.is_admin() or public.is_any_director());
create policy unavailability_insert on public.teacher_unavailability for insert to authenticated
  with check (
    (teacher_id = auth.uid() and public.has_role('teacher')) or public.is_admin()
  );
create policy unavailability_update on public.teacher_unavailability for update to authenticated
  using ((teacher_id = auth.uid() and public.has_role('teacher')) or public.is_admin())
  with check ((teacher_id = auth.uid() and public.has_role('teacher')) or public.is_admin());
create policy unavailability_delete on public.teacher_unavailability for delete to authenticated
  using ((teacher_id = auth.uid() and public.has_role('teacher')) or public.is_admin());

create policy generations_read on public.timetable_generations for select to authenticated
  using (public.is_admin() or public.is_director_of_class(class_id));

-- ---------- GRANTS -----------------------------------------------------
revoke all on public.course_requirements, public.teacher_unavailability,
              public.timetable_generations from anon, authenticated;
grant all on public.course_requirements, public.teacher_unavailability,
             public.timetable_generations to service_role;

grant select on public.course_requirements, public.teacher_unavailability,
                public.timetable_generations to authenticated;
grant insert (course_id, session_type, group_label, sessions_per_week, duration_minutes,
              teacher_id, preferred_room_id) on public.course_requirements to authenticated;
grant update (session_type, group_label, sessions_per_week, duration_minutes,
              teacher_id, preferred_room_id) on public.course_requirements to authenticated;
grant delete on public.course_requirements to authenticated;
grant insert (teacher_id, weekday, start_time, end_time, note) on public.teacher_unavailability to authenticated;
grant update (weekday, start_time, end_time, note)             on public.teacher_unavailability to authenticated;
grant delete on public.teacher_unavailability to authenticated;

-- ---------- génération automatique ------------------------------------
create or replace function public.generate_timetable(
  p_class       uuid,
  p_semester    smallint,
  p_day_start   time       default '08:00',
  p_day_end     time       default '18:00',
  p_break_start time       default null,
  p_break_end   time       default null,
  p_days        smallint[] default array[1, 2, 3, 4, 5]::smallint[]
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_year      uuid;
  v_gen       uuid;
  v_students  integer;
  v_removed   integer := 0;
  v_kept      integer := 0;
  v_placed    integer := 0;
  v_no_room   integer := 0;
  v_unplaced  jsonb   := '[]'::jsonb;
  rec         record;
  v_existing  integer;
  v_need      integer;
  v_done      integer;
  v_i         integer;
  v_teacher   uuid;
  v_dur       interval;
  v_day       smallint;
  v_start     time;
  v_end       time;
  v_rooms     uuid[];
  v_room      uuid;
  v_ok        boolean;
begin
  if not (public.is_admin() or public.is_director_of_class(p_class)) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_semester not in (1, 2) then
    raise exception 'invalid semester';
  end if;
  if p_day_end <= p_day_start or p_day_end > time '22:00' then
    raise exception 'invalid hours';
  end if;
  if (p_break_start is null) <> (p_break_end is null)
     or (p_break_start is not null and p_break_end <= p_break_start) then
    raise exception 'invalid break';
  end if;
  if p_days is null or cardinality(p_days) = 0
     or exists (select 1 from unnest(p_days) as x where x not between 1 and 6) then
    raise exception 'invalid days';
  end if;

  select academic_year_id into v_year from public.classes where id = p_class;
  if v_year is null then
    raise exception 'not found';
  end if;

  perform pg_advisory_xact_lock(hashtext(p_class::text));

  if exists (select 1 from public.timetable_entries
             where class_id = p_class and semester = p_semester and status = 'published') then
    raise exception 'generation:published';
  end if;

  select count(*) into v_students from public.student_roster where class_id = p_class;

  -- on remplace uniquement les anciens brouillons GÉNÉRÉS et non verrouillés
  delete from public.timetable_entries
   where class_id = p_class and semester = p_semester and status = 'draft'
     and generation_id is not null and not is_locked;
  get diagnostics v_removed = row_count;

  select count(*) into v_kept from public.timetable_entries
   where class_id = p_class and semester = p_semester;

  insert into public.timetable_generations (class_id, semester, actor_id, params)
  values (p_class, p_semester, auth.uid(),
          jsonb_build_object('day_start', p_day_start, 'day_end', p_day_end,
                             'break_start', p_break_start, 'break_end', p_break_end,
                             'days', p_days))
  returning id into v_gen;

  for rec in
    select r.id as req_id, r.course_id, r.session_type, r.group_label,
           r.sessions_per_week, r.duration_minutes, r.teacher_id as req_teacher,
           r.preferred_room_id, c.name as course_name
    from public.course_requirements r
    join public.courses c on c.id = r.course_id
    where c.class_id = p_class and c.is_active
    order by r.duration_minutes desc, r.sessions_per_week desc, c.name, r.session_type
  loop
    select count(*) into v_existing
      from public.timetable_entries e
     where e.class_id = p_class and e.semester = p_semester
       and e.course_id = rec.course_id and e.session_type = rec.session_type
       and coalesce(lower(e.group_label), '') = coalesce(lower(rec.group_label), '');

    v_need := greatest(rec.sessions_per_week - v_existing, 0);
    v_done := 0;
    v_dur  := make_interval(mins => rec.duration_minutes);

    -- enseignant : celui du besoin, sinon le premier enseignant du cours
    v_teacher := rec.req_teacher;
    if v_teacher is null then
      select ct.user_id into v_teacher
        from public.course_teachers ct
        join public.profiles p on p.id = ct.user_id
       where ct.course_id = rec.course_id
       order by p.last_name, p.first_name
       limit 1;
    elsif not exists (select 1 from public.course_teachers ct
                      where ct.course_id = rec.course_id and ct.user_id = v_teacher) then
      v_teacher := null;
    end if;

    -- salles candidates : actives, assez grandes, la salle préférée d'abord
    select coalesce(array_agg(rm.id order by (rm.id = rec.preferred_room_id) desc nulls last,
                                              rm.capacity nulls last, rm.name), '{}')
      into v_rooms
      from public.rooms rm
     where rm.is_active and (rm.capacity is null or rm.capacity >= v_students);
    if v_rooms is null or cardinality(v_rooms) = 0 then
      v_rooms := array[null::uuid];
    end if;

    for v_i in 1..v_need loop
      v_ok := false;

      <<days_loop>>
      for v_day in
        select x from unnest(p_days) as x
        order by
          (select count(*) from public.timetable_entries e
            where e.class_id = p_class and e.semester = p_semester
              and e.weekday = x and e.course_id = rec.course_id),
          (select count(*) from public.timetable_entries e
            where e.class_id = p_class and e.semester = p_semester and e.weekday = x),
          x
      loop
        v_start := p_day_start;
        while v_start + v_dur <= p_day_end loop
          v_end := v_start + v_dur;

          if (p_break_start is null or not (v_start < p_break_end and p_break_start < v_end))
             and (v_teacher is null or not exists (
                   select 1 from public.teacher_unavailability u
                   where u.teacher_id = v_teacher and u.weekday = v_day
                     and u.start_time < v_end and v_start < u.end_time))
             and not exists (
                   select 1 from public.timetable_entries s
                   where s.class_id = p_class and s.semester = p_semester and s.weekday = v_day
                     and s.start_time < v_end and v_start < s.end_time
                     and (s.group_label is null or rec.group_label is null
                          or lower(s.group_label) = lower(rec.group_label)))
             and (v_teacher is null or not exists (
                   select 1 from public.timetable_entries s
                   join public.classes sc on sc.id = s.class_id
                   where s.teacher_id = v_teacher and sc.academic_year_id = v_year
                     and s.semester = p_semester and s.weekday = v_day
                     and s.start_time < v_end and v_start < s.end_time))
          then
            foreach v_room in array v_rooms loop
              begin
                insert into public.timetable_entries
                  (class_id, course_id, semester, session_type, group_label, weekday,
                   start_time, end_time, room_id, teacher_id, status, generation_id, created_by)
                values
                  (p_class, rec.course_id, p_semester, rec.session_type, rec.group_label, v_day,
                   v_start, v_end, v_room, v_teacher, 'draft', v_gen, auth.uid());
                v_ok := true;
              exception when sqlstate '23P01' then
                v_ok := false;   -- conflit (salle occupée...) : on essaie la salle suivante
              end;
              exit when v_ok;
            end loop;
            exit days_loop when v_ok;
          end if;

          v_start := v_start + interval '30 minutes';
        end loop;
      end loop;

      if v_ok then
        v_placed := v_placed + 1;
        v_done   := v_done + 1;
        if v_room is null then
          v_no_room := v_no_room + 1;
        end if;
      end if;
    end loop;

    if v_done < v_need then
      v_unplaced := v_unplaced || jsonb_build_array(jsonb_build_object(
        'course_id', rec.course_id, 'course_name', rec.course_name,
        'session_type', rec.session_type, 'group', rec.group_label,
        'missing', v_need - v_done));
    end if;
  end loop;

  update public.timetable_generations
     set result = jsonb_build_object(
           'placed', v_placed, 'removed_drafts', v_removed, 'kept', v_kept,
           'placed_without_room', v_no_room, 'unplaced', v_unplaced)
   where id = v_gen;

  insert into public.audit_logs (actor_id, action, entity, entity_id, details)
  values (auth.uid(), 'timetable.generated', 'classes', p_class::text,
          jsonb_build_object('semester', p_semester, 'placed', v_placed,
                             'unplaced_courses', jsonb_array_length(v_unplaced)));

  return jsonb_build_object(
    'generation_id', v_gen, 'placed', v_placed, 'removed_drafts', v_removed, 'kept', v_kept,
    'placed_without_room', v_no_room, 'unplaced', v_unplaced);
end $$;

-- annuler une génération : supprime ses séances encore en brouillon et non verrouillées
create or replace function public.undo_generation(p_generation uuid)
returns integer
language plpgsql security definer set search_path = '' as $$
declare v_class uuid; n integer;
begin
  select class_id into v_class from public.timetable_generations where id = p_generation;
  if v_class is null then
    raise exception 'not found';
  end if;
  if not (public.is_admin() or public.is_director_of_class(v_class)) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  delete from public.timetable_entries
   where generation_id = p_generation and status = 'draft' and not is_locked;
  get diagnostics n = row_count;

  insert into public.audit_logs (actor_id, action, entity, entity_id, details)
  values (auth.uid(), 'timetable.generation_undone', 'timetable_generations',
          p_generation::text, jsonb_build_object('count', n));
  return n;
end $$;

revoke all on function public.generate_timetable(uuid, smallint, time, time, time, time, smallint[])
  from public, anon;
revoke all on function public.undo_generation(uuid) from public, anon;
grant execute on function public.generate_timetable(uuid, smallint, time, time, time, time, smallint[])
  to authenticated;
grant execute on function public.undo_generation(uuid) to authenticated;
