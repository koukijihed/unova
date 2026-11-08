-- =====================================================================
-- UNOVA — migration : liens Google Drive par cours
--
-- On ne stocke JAMAIS une URL libre : seulement le type de ressource et
-- l'identifiant Drive (validé par format). L'application reconstruit elle-même
-- les adresses d'affichage, uniquement sur drive.google.com / docs.google.com.
-- Mêmes droits que les documents : l'enseignant du cours, le directeur de la
-- classe et l'administrateur ajoutent ; les étudiants acceptés de la classe lisent.
--
-- À exécuter UNE SEULE FOIS dans Supabase > SQL Editor, après 001 à 005.
-- Si un fichier 006_*.sql existe déjà dans supabase/migrations, renomme celui-ci 007_drive_links.sql.
-- =====================================================================

create type public.drive_link_kind as enum ('file', 'document', 'presentation', 'spreadsheet', 'folder');

create table public.course_drive_links (
  id          uuid primary key default gen_random_uuid(),
  course_id   uuid not null references public.courses(id) on delete cascade,
  kind        public.drive_link_kind not null,
  drive_id    text not null check (drive_id ~ '^[A-Za-z0-9_-]{10,100}$'),
  title       text not null check (char_length(title) between 2 and 200),
  description text check (char_length(description) <= 2000),
  category    public.document_category not null default 'cours',
  status      public.document_status not null default 'approved',
  added_by    uuid not null default auth.uid() references public.profiles(id),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (course_id, kind, drive_id)
);
create index on public.course_drive_links (course_id, status);

create trigger course_drive_links_updated_at
  before update on public.course_drive_links
  for each row execute function public.set_updated_at();

alter table public.course_drive_links enable row level security;

create policy drive_links_read on public.course_drive_links for select to authenticated
  using (
    public.can_upload_to_course(course_id)
    or (status = 'approved' and public.can_view_course(course_id))
  );
create policy drive_links_insert on public.course_drive_links for insert to authenticated
  with check (added_by = auth.uid() and public.can_upload_to_course(course_id));
create policy drive_links_update on public.course_drive_links for update to authenticated
  using (public.can_upload_to_course(course_id))
  with check (public.can_upload_to_course(course_id));
create policy drive_links_delete on public.course_drive_links for delete to authenticated
  using (
    public.can_manage_course(course_id)
    or (added_by = auth.uid() and public.is_course_teacher(course_id))
  );

-- GRANTS (exposition automatique des tables désactivée)
revoke all on public.course_drive_links from anon, authenticated;
grant all on public.course_drive_links to service_role;
grant select on public.course_drive_links to authenticated;
grant insert (course_id, kind, drive_id, title, description, category, status, added_by)
  on public.course_drive_links to authenticated;
grant update (title, description, category, status) on public.course_drive_links to authenticated;
grant delete on public.course_drive_links to authenticated;
