-- =====================================================================
-- UNOVA — migration 001 : fondations
-- Identité, rôles, profils, structure académique de base, inscriptions,
-- vérification CIN, sécurité (RLS), bucket des photos de profil.
--
-- À exécuter UNE SEULE FOIS dans Supabase > SQL Editor.
-- Ne contient AUCUN plan d'études (UE/ECUE) : ils viendront d'un import vérifié.
-- Le projet a "Automatically expose new tables" désactivé : les droits sont
-- donc accordés explicitement dans la section GRANTS.
-- =====================================================================

-- ---------- types ----------------------------------------------------
create type public.account_status    as enum ('active', 'suspended');
create type public.enrollment_status as enum ('pending', 'accepted', 'rejected', 'interrupted', 'graduated');

-- ---------- table de référence : rôles, départements, diplômes -------
create table public.roles (
  code     text primary key,
  label_fr text not null
);

create table public.departments (
  id         uuid primary key default gen_random_uuid(),
  slug       text not null unique,
  name       text not null,
  created_at timestamptz not null default now()
);

create table public.degree_types (
  code       text primary key,
  label_fr   text not null,
  sort_order smallint not null
);

create table public.academic_levels (
  code       text primary key,
  label_fr   text not null,
  sort_order smallint not null
);

create table public.academic_years (
  id              uuid primary key default gen_random_uuid(),
  label           text not null unique check (label ~ '^[0-9]{4}-[0-9]{4}$'),
  starts_on       date not null,
  ends_on         date not null check (ends_on > starts_on),
  is_current      boolean not null default false,
  enrollment_open boolean not null default false,
  created_at      timestamptz not null default now()
);
-- une seule année courante à la fois
create unique index academic_years_one_current on public.academic_years (is_current) where is_current;

-- ---------- programmes, parcours, classes ----------------------------
create table public.programs (
  id                uuid primary key default gen_random_uuid(),
  degree_type_code  text not null references public.degree_types(code),
  code              text not null unique,
  name              text not null,
  department_id     uuid references public.departments(id) on delete set null,
  is_co_constructed boolean not null default false,
  auto_accept       boolean not null default false,   -- acceptation automatique des étudiants vérifiés
  is_active         boolean not null default true,
  source_note       text,                              -- provenance officielle (document, URL, année)
  created_at        timestamptz not null default now()
);

create table public.program_tracks (
  id         uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs(id) on delete cascade,
  name       text not null,
  unique (program_id, name)
);

create table public.classes (
  id               uuid primary key default gen_random_uuid(),
  program_id       uuid not null references public.programs(id) on delete cascade,
  track_id         uuid references public.program_tracks(id) on delete set null,
  academic_year_id uuid not null references public.academic_years(id),
  level_code       text not null references public.academic_levels(code),
  name             text not null,
  created_at       timestamptz not null default now(),
  unique (program_id, academic_year_id, name)
);
create index on public.classes (program_id);
create index on public.classes (academic_year_id);

-- ---------- profils et rôles -----------------------------------------
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  first_name  text not null default '' check (char_length(first_name) <= 80),
  last_name   text not null default '' check (char_length(last_name) <= 80),
  phone       text check (phone is null or char_length(phone) <= 20),
  avatar_path text check (avatar_path is null or avatar_path like (id::text || '/%')),
  status      public.account_status not null default 'active',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.user_roles (
  user_id    uuid not null references public.profiles(id) on delete cascade,
  role_code  text not null references public.roles(code),
  granted_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (user_id, role_code)
);

create table public.program_directors (
  program_id uuid not null references public.programs(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  primary key (program_id, user_id)
);

-- ---------- étudiants : profil permanent, liste officielle, inscriptions
create table public.student_profiles (
  user_id         uuid primary key references public.profiles(id) on delete cascade,
  cin_verified_at timestamptz not null,
  created_at      timestamptz not null default now()
);

-- Liste officielle. Le CIN n'est JAMAIS stocké en clair : HMAC calculé côté serveur.
create table public.student_roster (
  id             uuid primary key default gen_random_uuid(),
  cin_hash       text not null unique,
  last_name_norm text not null,              -- second facteur de vérification
  first_name     text not null default '',
  last_name      text not null default '',
  class_id       uuid not null references public.classes(id),
  claimed_by     uuid unique references auth.users(id) on delete set null,
  claimed_at     timestamptz,
  created_at     timestamptz not null default now()
);
create index on public.student_roster (class_id);

create table public.claim_attempts (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references auth.users(id) on delete cascade,
  success    boolean not null,
  created_at timestamptz not null default now()
);
create index on public.claim_attempts (user_id, created_at desc);

-- Le profil est permanent ; l'inscription est propre à une année universitaire.
create table public.student_enrollments (
  id               uuid primary key default gen_random_uuid(),
  student_id       uuid not null references public.profiles(id) on delete cascade,
  class_id         uuid not null references public.classes(id),
  academic_year_id uuid not null references public.academic_years(id),
  status           public.enrollment_status not null default 'pending',
  decided_by       uuid references public.profiles(id) on delete set null,
  decided_at       timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (student_id, academic_year_id)
);
create index on public.student_enrollments (class_id, status);

create table public.audit_logs (
  id         bigint generated always as identity primary key,
  actor_id   uuid references auth.users(id) on delete set null,
  action     text not null,
  entity     text,
  entity_id  text,
  details    jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index on public.audit_logs (created_at desc);

-- ---------- triggers utilitaires -------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger enrollments_updated_at before update on public.student_enrollments
  for each row execute function public.set_updated_at();

-- l'année d'une inscription = l'année de sa classe (jamais incohérente)
create or replace function public.enrollments_sync_year()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  select c.academic_year_id into new.academic_year_id
    from public.classes c where c.id = new.class_id;
  return new;
end $$;

create trigger enrollments_sync_year_trg
  before insert or update of class_id on public.student_enrollments
  for each row execute function public.enrollments_sync_year();

-- création automatique du profil à l'inscription (prénom/nom depuis le formulaire)
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, first_name, last_name)
  values (
    new.id,
    left(coalesce(new.raw_user_meta_data ->> 'first_name', ''), 80),
    left(coalesce(new.raw_user_meta_data ->> 'last_name', ''), 80)
  );
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- assigner un directeur de programme lui donne le rôle 'director'
create or replace function public.sync_director_role()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    insert into public.user_roles (user_id, role_code)
    values (new.user_id, 'director') on conflict do nothing;
    return new;
  end if;
  if not exists (select 1 from public.program_directors where user_id = old.user_id) then
    delete from public.user_roles where user_id = old.user_id and role_code = 'director';
  end if;
  return old;
end $$;

create trigger program_directors_role
  after insert or delete on public.program_directors
  for each row execute function public.sync_director_role();

-- ---------- fonctions d'autorisation (utilisées par les politiques RLS)
create or replace function public.has_role(p_role text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.user_roles where user_id = auth.uid() and role_code = p_role
  )
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select public.has_role('admin')
$$;

create or replace function public.is_director_of_program(p_program uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.program_directors
    where program_id = p_program and user_id = auth.uid()
  )
$$;

create or replace function public.is_director_of_class(p_class uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.classes c
    join public.program_directors d on d.program_id = c.program_id
    where c.id = p_class and d.user_id = auth.uid()
  )
$$;

-- ---------- vérification CIN (appelable UNIQUEMENT par le serveur) ----
create or replace function public.claim_roster(
  p_user uuid, p_cin_hash text, p_last_name_norm text
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_roster    public.student_roster%rowtype;
  v_confirmed timestamptz;
  v_fails     int;
  v_auto      boolean;
  v_status    public.enrollment_status;
begin
  select email_confirmed_at into v_confirmed from auth.users where id = p_user;
  if v_confirmed is null then
    return jsonb_build_object('ok', false, 'error', 'email_not_confirmed');
  end if;

  if exists (select 1 from public.student_profiles where user_id = p_user) then
    return jsonb_build_object('ok', false, 'error', 'already_verified');
  end if;

  select count(*) into v_fails from public.claim_attempts
   where user_id = p_user and not success and created_at > now() - interval '1 hour';
  if v_fails >= 5 then
    return jsonb_build_object('ok', false, 'error', 'too_many_attempts');
  end if;

  select * into v_roster from public.student_roster
   where cin_hash = p_cin_hash and last_name_norm = p_last_name_norm
   for update;

  -- même réponse pour "inconnu" et "déjà utilisé" : pas d'énumération
  if not found or v_roster.claimed_by is not null then
    insert into public.claim_attempts (user_id, success) values (p_user, false);
    return jsonb_build_object('ok', false, 'error', 'not_found_or_claimed');
  end if;

  select coalesce(p.auto_accept, false) into v_auto
    from public.classes c join public.programs p on p.id = c.program_id
   where c.id = v_roster.class_id;

  v_status := (case when coalesce(v_auto, false) then 'accepted' else 'pending' end)::public.enrollment_status;

  update public.student_roster
     set claimed_by = p_user, claimed_at = now()
   where id = v_roster.id;

  insert into public.student_profiles (user_id, cin_verified_at) values (p_user, now());

  insert into public.student_enrollments (student_id, class_id, academic_year_id, status, decided_at)
  values (
    p_user, v_roster.class_id,
    (select academic_year_id from public.classes where id = v_roster.class_id),
    v_status,
    case when v_status = 'accepted' then now() end
  );

  insert into public.user_roles (user_id, role_code)
  values (p_user, 'student') on conflict do nothing;

  update public.profiles
     set first_name = coalesce(nullif(first_name, ''), v_roster.first_name),
         last_name  = coalesce(nullif(last_name, ''),  v_roster.last_name)
   where id = p_user;

  insert into public.claim_attempts (user_id, success) values (p_user, true);
  insert into public.audit_logs (actor_id, action, entity, entity_id, details)
  values (p_user, 'student.verified', 'student_roster', v_roster.id::text,
          jsonb_build_object('class_id', v_roster.class_id, 'status', v_status));

  return jsonb_build_object('ok', true, 'class_id', v_roster.class_id, 'status', v_status);
end $$;

-- ---------- gestion des étudiants par le directeur -------------------
create or replace function public.director_students(p_class uuid)
returns table (
  roster_id uuid, first_name text, last_name text, claimed boolean,
  enrollment_id uuid, enrollment_status public.enrollment_status
)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not (public.is_admin() or public.is_director_of_class(p_class)) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  return query
    select r.id, r.first_name, r.last_name, r.claimed_by is not null, e.id, e.status
    from public.student_roster r
    left join public.student_enrollments e
           on e.student_id = r.claimed_by and e.class_id = r.class_id
    where r.class_id = p_class
    order by (e.status = 'pending') desc nulls last, r.last_name, r.first_name;
end $$;

create or replace function public.director_set_enrollment(
  p_enrollment uuid, p_status public.enrollment_status
) returns void
language plpgsql security definer set search_path = '' as $$
declare v_class uuid;
begin
  select class_id into v_class from public.student_enrollments where id = p_enrollment;
  if v_class is null then raise exception 'not found'; end if;
  if not (public.is_admin() or public.is_director_of_class(v_class)) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_status not in ('pending', 'accepted', 'rejected') then
    raise exception 'invalid status';
  end if;

  update public.student_enrollments
     set status = p_status, decided_by = auth.uid(), decided_at = now()
   where id = p_enrollment;

  insert into public.audit_logs (actor_id, action, entity, entity_id, details)
  values (auth.uid(), 'enrollment.' || p_status::text, 'student_enrollments',
          p_enrollment::text, jsonb_build_object('class_id', v_class));
end $$;

create or replace function public.director_accept_all(p_class uuid)
returns integer
language plpgsql security definer set search_path = '' as $$
declare n integer;
begin
  if not (public.is_admin() or public.is_director_of_class(p_class)) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  update public.student_enrollments
     set status = 'accepted', decided_by = auth.uid(), decided_at = now()
   where class_id = p_class and status = 'pending';
  get diagnostics n = row_count;

  insert into public.audit_logs (actor_id, action, entity, entity_id, details)
  values (auth.uid(), 'enrollment.accept_all', 'classes', p_class::text,
          jsonb_build_object('count', n));
  return n;
end $$;

-- =====================================================================
-- ROW LEVEL SECURITY
-- =====================================================================
alter table public.roles               enable row level security;
alter table public.departments         enable row level security;
alter table public.degree_types        enable row level security;
alter table public.academic_levels     enable row level security;
alter table public.academic_years      enable row level security;
alter table public.programs            enable row level security;
alter table public.program_tracks      enable row level security;
alter table public.classes             enable row level security;
alter table public.profiles            enable row level security;
alter table public.user_roles          enable row level security;
alter table public.program_directors   enable row level security;
alter table public.student_profiles    enable row level security;
alter table public.student_roster      enable row level security;   -- aucune politique = aucun accès API
alter table public.claim_attempts      enable row level security;   -- aucune politique = aucun accès API
alter table public.student_enrollments enable row level security;
alter table public.audit_logs          enable row level security;

-- informations publiques sur les formations (visibles sans connexion)
create policy departments_read    on public.departments     for select to anon, authenticated using (true);
create policy degree_types_read   on public.degree_types    for select to anon, authenticated using (true);
create policy levels_read         on public.academic_levels for select to anon, authenticated using (true);
create policy programs_read       on public.programs        for select to anon, authenticated using (is_active);
create policy tracks_read         on public.program_tracks  for select to anon, authenticated using (true);

-- réservé aux connectés
create policy roles_read          on public.roles           for select to authenticated using (true);
create policy years_read          on public.academic_years  for select to authenticated using (true);

-- administrateur : gestion complète des structures
create policy departments_admin   on public.departments     for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy degree_types_admin  on public.degree_types    for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy levels_admin        on public.academic_levels for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy roles_admin         on public.roles           for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy years_admin         on public.academic_years  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy programs_admin      on public.programs        for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy tracks_admin        on public.program_tracks  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- classes : admin, directeur du programme, étudiants acceptés de la classe
create policy classes_read on public.classes for select to authenticated
  using (
    public.is_admin()
    or public.is_director_of_class(id)
    or exists (select 1 from public.student_enrollments e
               where e.student_id = auth.uid() and e.class_id = classes.id and e.status = 'accepted')
  );
create policy classes_admin on public.classes for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- profils : chacun lit et modifie le sien (colonnes limitées, voir GRANTS)
create policy profiles_read on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_admin());
create policy profiles_update_own on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- rôles et directeurs
create policy user_roles_read on public.user_roles for select to authenticated
  using (user_id = auth.uid() or public.is_admin());
create policy user_roles_admin on public.user_roles for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy program_directors_read on public.program_directors for select to authenticated
  using (user_id = auth.uid() or public.is_admin());
create policy program_directors_admin on public.program_directors for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- étudiants et inscriptions (les décisions passent par les fonctions director_*)
create policy student_profiles_read on public.student_profiles for select to authenticated
  using (user_id = auth.uid() or public.is_admin());
create policy enrollments_read on public.student_enrollments for select to authenticated
  using (student_id = auth.uid() or public.is_admin() or public.is_director_of_class(class_id));

-- journal d'audit : lecture administrateur uniquement
create policy audit_read on public.audit_logs for select to authenticated using (public.is_admin());

-- =====================================================================
-- GRANTS (obligatoires : l'exposition automatique des tables est désactivée)
-- =====================================================================
revoke all on all tables in schema public from anon, authenticated;
grant all on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;

grant select on public.departments, public.degree_types, public.academic_levels,
                public.programs, public.program_tracks                     to anon, authenticated;
grant select on public.roles, public.academic_years, public.classes,
                public.profiles, public.user_roles, public.program_directors,
                public.student_profiles, public.student_enrollments,
                public.audit_logs                                           to authenticated;

-- écriture : réservée à l'administrateur par les politiques RLS ci-dessus
grant insert, update, delete on public.departments, public.degree_types, public.academic_levels,
                                public.roles, public.academic_years, public.programs,
                                public.program_tracks, public.classes,
                                public.user_roles, public.program_directors  to authenticated;

-- profil : l'utilisateur ne peut modifier que ces colonnes
grant update (first_name, last_name, phone, avatar_path) on public.profiles to authenticated;

-- fonctions : rien par défaut, puis ouverture ciblée
revoke all on all functions in schema public from public, anon, authenticated;
grant execute on function public.has_role(text)                    to authenticated;
grant execute on function public.is_admin()                        to authenticated;
grant execute on function public.is_director_of_program(uuid)      to authenticated;
grant execute on function public.is_director_of_class(uuid)        to authenticated;
grant execute on function public.director_students(uuid)           to authenticated;
grant execute on function public.director_set_enrollment(uuid, public.enrollment_status) to authenticated;
grant execute on function public.director_accept_all(uuid)         to authenticated;
grant execute on function public.claim_roster(uuid, text, text)    to service_role;

-- =====================================================================
-- PHOTOS DE PROFIL (Supabase Storage, bucket privé, 2 Mo, images seulement)
-- Chemin attendu : <user_id>/<fichier>
-- =====================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', false, 2097152, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do nothing;

create policy avatars_read on storage.objects for select to authenticated
  using (bucket_id = 'avatars');
create policy avatars_insert_own on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy avatars_update_own on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy avatars_delete_own on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- =====================================================================
-- DONNÉES INITIALES (génériques ou vérifiées sur le site officiel)
-- Les programmes, parcours et plans d'études NE SONT PAS insérés ici :
-- ils viendront d'un import prévisualisé et vérifié.
-- =====================================================================
insert into public.roles (code, label_fr) values
  ('student',  'Étudiant'),
  ('delegate', 'Délégué'),
  ('teacher',  'Enseignant'),
  ('director', 'Directeur de programme'),
  ('admin',    'Administrateur');

insert into public.degree_types (code, label_fr, sort_order) values
  ('licence',          'Licence',               1),
  ('master_pro',       'Master professionnel',  2),
  ('master_recherche', 'Master de recherche',   3),
  ('doctorat',         'Doctorat',              4);

insert into public.academic_levels (code, label_fr, sort_order) values
  ('L1',  'Licence 1',  1),
  ('L2',  'Licence 2',  2),
  ('L3',  'Licence 3',  3),
  ('M1',  'Master 1',   4),
  ('M2',  'Master 2',   5),
  ('DOC', 'Doctorat',   6);

-- départements : noms relevés sur le site officiel de l'ESSECT
insert into public.departments (slug, name) values
  ('finance-comptabilite',  'Département Finance-Comptabilité'),
  ('sciences-eco-mqi',      'Département de Sciences Économiques, Méthodes Quantitatives et Informatique'),
  ('sciences-de-gestion',   'Département de Sciences de Gestion');
