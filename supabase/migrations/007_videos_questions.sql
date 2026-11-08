-- =====================================================================
-- UNOVA — migration : vidéos YouTube et questions-réponses par cours
--
-- Vidéos : on ne stocke que l'identifiant YouTube (validé par format) ; l'application
--   reconstruit l'adresse d'affichage sur youtube-nocookie.com uniquement.
-- Questions-réponses : un seul niveau de réponses ; seuls les étudiants ACCEPTÉS de la
--   classe, les enseignants du cours, le directeur et l'administrateur peuvent écrire.
--
-- Prérequis : migrations 001 à 006 (la table course_drive_links doit exister).
-- À exécuter UNE SEULE FOIS dans Supabase > SQL Editor.
-- Si un fichier 007_*.sql existe déjà dans supabase/migrations, renomme celui-ci 008_videos_questions.sql.
-- =====================================================================

create type public.video_kind   as enum ('video', 'playlist');
create type public.comment_kind as enum ('comment', 'question');

-- ---------- vidéos ----------------------------------------------------
create table public.course_videos (
  id          uuid primary key default gen_random_uuid(),
  course_id   uuid not null references public.courses(id) on delete cascade,
  kind        public.video_kind not null,
  youtube_id  text not null,
  title       text not null check (char_length(title) between 2 and 200),
  description text check (char_length(description) <= 2000),
  position    integer not null default 0 check (position between 0 and 10000),
  status      public.document_status not null default 'approved',
  added_by    uuid not null default auth.uid() references public.profiles(id),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint youtube_id_format check (
    (kind = 'video'    and youtube_id ~ '^[A-Za-z0-9_-]{11}$') or
    (kind = 'playlist' and youtube_id ~ '^[A-Za-z0-9_-]{10,64}$')
  ),
  unique (course_id, kind, youtube_id)
);
create index on public.course_videos (course_id, status, position);

create trigger course_videos_updated_at
  before update on public.course_videos
  for each row execute function public.set_updated_at();

alter table public.course_videos enable row level security;

create policy videos_read on public.course_videos for select to authenticated
  using (
    public.can_upload_to_course(course_id)
    or (status = 'approved' and public.can_view_course(course_id))
  );
create policy videos_insert on public.course_videos for insert to authenticated
  with check (added_by = auth.uid() and public.can_upload_to_course(course_id));
create policy videos_update on public.course_videos for update to authenticated
  using (public.can_upload_to_course(course_id))
  with check (public.can_upload_to_course(course_id));
create policy videos_delete on public.course_videos for delete to authenticated
  using (
    public.can_manage_course(course_id)
    or (added_by = auth.uid() and public.is_course_teacher(course_id))
  );

-- ---------- commentaires et questions ---------------------------------
create table public.course_comments (
  id            uuid primary key default gen_random_uuid(),
  course_id     uuid not null references public.courses(id) on delete cascade,
  parent_id     uuid references public.course_comments(id) on delete cascade,
  document_id   uuid references public.documents(id) on delete set null,
  video_id      uuid references public.course_videos(id) on delete set null,
  drive_link_id uuid references public.course_drive_links(id) on delete set null,
  kind          public.comment_kind not null default 'comment',
  body          text not null check (char_length(body) between 1 and 2000),
  author_id     uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  author_badge  text not null default 'student'
                check (author_badge in ('student', 'teacher', 'director', 'admin')),
  is_resolved   boolean not null default false,
  hidden        boolean not null default false,
  created_at    timestamptz not null default now(),
  edited_at     timestamptz
);
create index on public.course_comments (course_id, created_at desc);
create index on public.course_comments (parent_id);
create index on public.course_comments (kind, is_resolved, created_at desc) where parent_id is null;

-- contrôles et métadonnées à l'insertion
create or replace function public.comments_before_insert()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.parent_id is not null then
    if not exists (
      select 1 from public.course_comments p
      where p.id = new.parent_id and p.course_id = new.course_id and p.parent_id is null
    ) then
      raise exception 'invalid parent comment';
    end if;
    new.kind = 'comment';
  end if;

  if new.document_id is not null and not exists (
    select 1 from public.documents d where d.id = new.document_id and d.course_id = new.course_id) then
    raise exception 'document is not in this course';
  end if;
  if new.video_id is not null and not exists (
    select 1 from public.course_videos v where v.id = new.video_id and v.course_id = new.course_id) then
    raise exception 'video is not in this course';
  end if;
  if new.drive_link_id is not null and not exists (
    select 1 from public.course_drive_links l where l.id = new.drive_link_id and l.course_id = new.course_id) then
    raise exception 'drive link is not in this course';
  end if;

  -- limite simple : 10 messages par minute et par utilisateur
  if (select count(*) from public.course_comments
       where author_id = new.author_id and created_at > now() - interval '1 minute') >= 10 then
    raise exception 'too many comments' using errcode = '54000';
  end if;

  new.author_badge = case
    when public.is_admin() then 'admin'
    when exists (select 1 from public.courses c
                 where c.id = new.course_id and public.is_director_of_class(c.class_id)) then 'director'
    when public.is_course_teacher(new.course_id) then 'teacher'
    else 'student'
  end;
  return new;
end $$;

create trigger comments_before_insert_trg
  before insert on public.course_comments
  for each row execute function public.comments_before_insert();

-- règles de modification
create or replace function public.comments_guard()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.hidden is distinct from old.hidden
     and not public.can_upload_to_course(old.course_id) then
    raise exception 'only moderators can hide comments';
  end if;

  if new.is_resolved is distinct from old.is_resolved then
    if old.parent_id is not null or old.kind <> 'question' then
      raise exception 'only questions can be resolved';
    end if;
    if not (public.can_upload_to_course(old.course_id) or old.author_id = auth.uid()) then
      raise exception 'only the author or a moderator can resolve';
    end if;
  end if;

  if new.body is distinct from old.body then
    if old.author_id <> auth.uid() or old.hidden then
      raise exception 'only the author can edit';
    end if;
    new.edited_at = now();
  end if;
  return new;
end $$;

create trigger comments_guard_trg
  before update on public.course_comments
  for each row execute function public.comments_guard();

alter table public.course_comments enable row level security;

create policy comments_read on public.course_comments for select to authenticated
  using (
    public.can_view_course(course_id)
    and (not hidden or author_id = auth.uid() or public.can_upload_to_course(course_id))
  );
create policy comments_insert on public.course_comments for insert to authenticated
  with check (
    author_id = auth.uid() and not hidden and not is_resolved
    and public.can_view_course(course_id)
  );
create policy comments_update on public.course_comments for update to authenticated
  using (author_id = auth.uid() or public.can_upload_to_course(course_id))
  with check (author_id = auth.uid() or public.can_upload_to_course(course_id));
create policy comments_delete on public.course_comments for delete to authenticated
  using (author_id = auth.uid() or public.can_upload_to_course(course_id));

-- noms et photos des auteurs des messages d'un cours (sans exposer les profils)
create or replace function public.course_comment_authors(p_course uuid)
returns table (user_id uuid, first_name text, last_name text, avatar_path text)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.can_view_course(p_course) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  return query
    select p.id, p.first_name, p.last_name, p.avatar_path
    from public.profiles p
    where p.id in (
      select c.author_id from public.course_comments c
      where c.course_id = p_course
        and (not c.hidden or c.author_id = auth.uid() or public.can_upload_to_course(p_course))
    );
end $$;

-- ---------- GRANTS (exposition automatique des tables désactivée) -----
revoke all on public.course_videos, public.course_comments from anon, authenticated;
grant all on public.course_videos, public.course_comments to service_role;

grant select on public.course_videos, public.course_comments to authenticated;
grant insert (course_id, kind, youtube_id, title, description, position, status, added_by)
  on public.course_videos to authenticated;
grant update (title, description, position, status) on public.course_videos to authenticated;
grant delete on public.course_videos to authenticated;

grant insert (course_id, parent_id, document_id, video_id, drive_link_id, kind, body, author_id)
  on public.course_comments to authenticated;
grant update (body, is_resolved, hidden) on public.course_comments to authenticated;
grant delete on public.course_comments to authenticated;

revoke all on function public.course_comment_authors(uuid) from public, anon;
grant execute on function public.course_comment_authors(uuid) to authenticated;
