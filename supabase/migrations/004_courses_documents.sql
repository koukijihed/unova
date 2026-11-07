-- =====================================================================
-- UNOVA — migration 004 : cours, enseignants des cours, documents
--
-- Les cours sont rattachés à une CLASSE (le plan d'études officiel n'est pas
-- encore importé). Un lien facultatif vers l'ECUE sera ajouté plus tard, sans
-- rien casser.
-- Les fichiers sont dans le bucket privé "documents" (Supabase Storage,
-- 50 Mo max par fichier). Chemin obligatoire : <course_id>/<fichier>.
-- À exécuter UNE SEULE FOIS dans Supabase > SQL Editor, après 001, 002, 003.
-- =====================================================================

create type public.document_category as enum ('cours', 'td', 'tp', 'examen', 'resume', 'autre');
create type public.document_status   as enum ('pending', 'approved', 'rejected');

-- ---------- tables ----------------------------------------------------
create table public.courses (
  id          uuid primary key default gen_random_uuid(),
  class_id    uuid not null references public.classes(id) on delete cascade,
  name        text not null check (char_length(name) between 2 and 200),
  semester    smallint check (semester between 1 and 10),
  description text check (char_length(description) <= 2000),
  is_active   boolean not null default true,
  created_by  uuid default auth.uid() references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (class_id, name)
);
create index on public.courses (class_id);

create table public.course_teachers (
  course_id  uuid not null references public.courses(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (course_id, user_id)
);
create index on public.course_teachers (user_id);

create table public.documents (
  id            uuid primary key default gen_random_uuid(),
  course_id     uuid not null references public.courses(id) on delete cascade,
  title         text not null check (char_length(title) between 2 and 200),
  description   text check (char_length(description) <= 2000),
  category      public.document_category not null default 'cours',
  storage_path  text not null unique,
  original_name text not null check (char_length(original_name) <= 255),
  mime_type     text not null,
  size_bytes    bigint not null check (size_bytes > 0 and size_bytes <= 52428800),
  status        public.document_status not null default 'approved',
  uploaded_by   uuid not null default auth.uid() references public.profiles(id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  -- le fichier doit se trouver dans le dossier de son cours
  constraint documents_path_in_course check (storage_path like (course_id::text || '/%')),
  -- SVG et HTML refusés volontairement (risque d'injection de script)
  constraint documents_mime_allowed check (mime_type in (
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/png', 'image/jpeg', 'image/webp'
  ))
);
create index on public.documents (course_id, status);
create index on public.documents (uploaded_by);

create trigger courses_updated_at   before update on public.courses
  for each row execute function public.set_updated_at();
create trigger documents_updated_at before update on public.documents
  for each row execute function public.set_updated_at();

-- ---------- fonctions d'autorisation ----------------------------------
create or replace function public.try_uuid(p text)
returns uuid language plpgsql immutable set search_path = '' as $$
begin
  return p::uuid;
exception when others then
  return null;
end $$;

create or replace function public.is_any_director()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.program_directors where user_id = auth.uid())
$$;

create or replace function public.is_course_teacher(p_course uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.course_teachers
    where course_id = p_course and user_id = auth.uid()
  )
$$;

-- gérer un cours : administrateur, ou directeur du programme de sa classe
create or replace function public.can_manage_course(p_course uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.courses c
    where c.id = p_course
      and (public.is_admin() or public.is_director_of_class(c.class_id))
  )
$$;

-- déposer des documents : gestionnaire du cours ou enseignant du cours
create or replace function public.can_upload_to_course(p_course uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.can_manage_course(p_course) or public.is_course_teacher(p_course)
$$;

-- voir un cours : les précédents, ou étudiant ACCEPTÉ de la classe
create or replace function public.can_view_course(p_course uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.can_upload_to_course(p_course)
      or exists (
        select 1
        from public.courses c
        join public.student_enrollments e on e.class_id = c.class_id
        where c.id = p_course and c.is_active
          and e.student_id = auth.uid() and e.status = 'accepted'
      )
$$;

-- noms des enseignants d'un cours (sans exposer les profils)
create or replace function public.course_teacher_names(p_course uuid)
returns table (user_id uuid, first_name text, last_name text)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.can_view_course(p_course) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  return query
    select ct.user_id, p.first_name, p.last_name
    from public.course_teachers ct
    join public.profiles p on p.id = ct.user_id
    where ct.course_id = p_course
    order by p.last_name, p.first_name;
end $$;

-- recherche d'un ENSEIGNANT par email (administrateur ou directeur seulement)
create or replace function public.find_teacher_by_email(p_email text)
returns table (user_id uuid, first_name text, last_name text)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not (public.is_admin() or public.is_any_director()) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  return query
    select u.id, p.first_name, p.last_name
    from auth.users u
    join public.profiles p on p.id = u.id
    join public.user_roles ur on ur.user_id = u.id and ur.role_code = 'teacher'
    where lower(u.email) = lower(trim(p_email));
end $$;

-- ---------- RLS --------------------------------------------------------
alter table public.courses         enable row level security;
alter table public.course_teachers enable row level security;
alter table public.documents       enable row level security;

create policy courses_read on public.courses for select to authenticated
  using (public.can_view_course(id) or public.can_manage_course(id));
create policy courses_insert on public.courses for insert to authenticated
  with check (public.is_admin() or public.is_director_of_class(class_id));
create policy courses_update on public.courses for update to authenticated
  using (public.can_manage_course(id))
  with check (public.is_admin() or public.is_director_of_class(class_id));

create policy course_teachers_read on public.course_teachers for select to authenticated
  using (user_id = auth.uid() or public.can_manage_course(course_id));
create policy course_teachers_insert on public.course_teachers for insert to authenticated
  with check (
    public.can_manage_course(course_id)
    and exists (select 1 from public.user_roles ur
                where ur.user_id = course_teachers.user_id and ur.role_code = 'teacher')
  );
create policy course_teachers_delete on public.course_teachers for delete to authenticated
  using (public.can_manage_course(course_id));

create policy documents_read on public.documents for select to authenticated
  using (
    public.can_upload_to_course(course_id)
    or (status = 'approved' and public.can_view_course(course_id))
  );
create policy documents_insert on public.documents for insert to authenticated
  with check (uploaded_by = auth.uid() and public.can_upload_to_course(course_id));
create policy documents_update on public.documents for update to authenticated
  using (public.can_upload_to_course(course_id))
  with check (public.can_upload_to_course(course_id));
create policy documents_delete on public.documents for delete to authenticated
  using (
    public.can_manage_course(course_id)
    or (uploaded_by = auth.uid() and public.is_course_teacher(course_id))
  );

-- ---------- GRANTS (exposition automatique désactivée) ----------------
revoke all on public.courses, public.course_teachers, public.documents from anon, authenticated;
grant all on public.courses, public.course_teachers, public.documents to service_role;

grant select on public.courses, public.course_teachers, public.documents to authenticated;
grant insert (class_id, name, semester, description, is_active) on public.courses to authenticated;
grant update (name, semester, description, is_active)           on public.courses to authenticated;
grant insert (course_id, user_id)  on public.course_teachers to authenticated;
grant delete                       on public.course_teachers to authenticated;
grant insert (course_id, title, description, category, storage_path, original_name,
              mime_type, size_bytes, status, uploaded_by) on public.documents to authenticated;
grant update (title, description, category, status)         on public.documents to authenticated;
grant delete on public.documents to authenticated;

-- nouvelles fonctions : rien par défaut, puis ouverture ciblée
revoke all on function public.try_uuid(text)                 from public, anon;
revoke all on function public.is_any_director()              from public, anon;
revoke all on function public.is_course_teacher(uuid)        from public, anon;
revoke all on function public.can_manage_course(uuid)        from public, anon;
revoke all on function public.can_upload_to_course(uuid)     from public, anon;
revoke all on function public.can_view_course(uuid)          from public, anon;
revoke all on function public.course_teacher_names(uuid)     from public, anon;
revoke all on function public.find_teacher_by_email(text)    from public, anon;
grant execute on function public.try_uuid(text)              to authenticated;
grant execute on function public.is_any_director()           to authenticated;
grant execute on function public.is_course_teacher(uuid)     to authenticated;
grant execute on function public.can_manage_course(uuid)     to authenticated;
grant execute on function public.can_upload_to_course(uuid)  to authenticated;
grant execute on function public.can_view_course(uuid)       to authenticated;
grant execute on function public.course_teacher_names(uuid)  to authenticated;
grant execute on function public.find_teacher_by_email(text) to authenticated;

-- ---------- STORAGE : bucket privé "documents" ------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'documents', 'documents', false, 52428800,
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/png', 'image/jpeg', 'image/webp'
  ]
)
on conflict (id) do nothing;

-- lecture : seulement si une ligne documents correspond ET est visible pour l'utilisateur
create policy documents_files_read on storage.objects for select to authenticated
  using (
    bucket_id = 'documents'
    and exists (select 1 from public.documents d where d.storage_path = storage.objects.name)
  );

-- dépôt : seulement dans le dossier d'un cours où l'utilisateur peut déposer
create policy documents_files_insert on storage.objects for insert to authenticated
  with check (
    bucket_id = 'documents'
    and public.can_upload_to_course(public.try_uuid((storage.foldername(name))[1]))
  );

-- suppression : gestionnaires du cours, ou l'enseignant qui a déposé le fichier
create policy documents_files_delete on storage.objects for delete to authenticated
  using (
    bucket_id = 'documents'
    and exists (
      select 1 from public.documents d
      where d.storage_path = storage.objects.name
        and (public.can_manage_course(d.course_id)
             or (d.uploaded_by = auth.uid() and public.is_course_teacher(d.course_id)))
    )
  );
