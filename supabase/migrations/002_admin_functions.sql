-- =====================================================================
-- UNOVA — migration 002 : fonctions d'administration
--   1) set_current_academic_year : change l'année courante de façon atomique
--   2) admin_find_user : retrouve un compte par email (administrateur seulement),
--      sans jamais exposer la liste des emails
-- À exécuter UNE SEULE FOIS dans Supabase > SQL Editor, après 001.
-- =====================================================================

create or replace function public.set_current_academic_year(p_year uuid)
returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if not exists (select 1 from public.academic_years where id = p_year) then
    raise exception 'not found';
  end if;

  -- deux instructions dans la même transaction : l'index unique
  -- "une seule année courante" n'est jamais violé
  update public.academic_years set is_current = false where is_current;
  update public.academic_years set is_current = true  where id = p_year;

  insert into public.audit_logs (actor_id, action, entity, entity_id)
  values (auth.uid(), 'academic_year.set_current', 'academic_years', p_year::text);
end $$;

create or replace function public.admin_find_user(p_email text)
returns table (user_id uuid, first_name text, last_name text)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  return query
    select u.id, p.first_name, p.last_name
    from auth.users u
    join public.profiles p on p.id = u.id
    where lower(u.email) = lower(trim(p_email));
end $$;

-- nouvelles fonctions : rien par défaut, puis ouverture ciblée
revoke all on function public.set_current_academic_year(uuid) from public, anon;
revoke all on function public.admin_find_user(text)           from public, anon;
grant execute on function public.set_current_academic_year(uuid) to authenticated;
grant execute on function public.admin_find_user(text)           to authenticated;
