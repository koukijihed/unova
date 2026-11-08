-- =====================================================================
-- UNOVA — migration 005 : libellé de classe pour les enseignants
--
-- La politique `classes_read` (migration 001) autorise les administrateurs,
-- les directeurs de la classe et les étudiants acceptés. Les enseignants
-- affectés à un cours ne pouvaient donc pas lire la classe de ce cours,
-- alors que la page /cours affiche son libellé.
--
-- Cette politique ajoute uniquement la lecture des classes où l'utilisateur
-- enseigne au moins un cours. Elle ne donne aucun autre droit.
-- À exécuter dans Supabase > SQL Editor, après 001 à 004.
-- =====================================================================

drop policy if exists classes_read_course_teacher on public.classes;

create policy classes_read_course_teacher on public.classes
  for select to authenticated
  using (
    exists (
      select 1
      from public.course_teachers ct
      join public.courses c on c.id = ct.course_id
      where c.class_id = classes.id
        and ct.user_id = auth.uid()
    )
  );
