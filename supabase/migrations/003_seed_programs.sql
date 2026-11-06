-- =====================================================================
-- UNOVA — migration 003 : programmes officiels de l'ESSECT (liste, sans plans d'études)
--
-- MASTERS (18) : liste officielle de l'Appel à candidatures masters 2026/2027, Annexe 2
--   https://essect.rnu.tn/userfiles/files/Appel_masters_26_27.pdf
--   -> actifs. Les codes sont des identifiants internes UNOVA (modifiables).
--   -> la capacité M1 est notée dans source_note.
-- LICENCES (5 mentions) : relevées sur les pages officielles de l'ESSECT, mais
--   l'année de validité n'est pas précisée et les pages ne concordent pas
--   -> INACTIVES (invisibles du public) tant qu'un administrateur ne les a pas vérifiées.
-- AUCUN plan d'études (UE/ECUE) ici : il viendra d'un import vérifié.
-- Doctorats : non relevés (page non consultée).
--
-- Idempotent : peut être relancé sans créer de doublons.
-- À exécuter dans Supabase > SQL Editor, après 001 et 002.
-- =====================================================================

-- ---------- MASTERS ---------------------------------------------------
with n as (
  select 'Source : Appel à candidatures masters 2026/2027 (Annexe 2), https://essect.rnu.tn/userfiles/files/Appel_masters_26_27.pdf. Code interne UNOVA (modifiable).' as base
)
insert into public.programs
  (degree_type_code, code, name, department_id, is_co_constructed, is_active, source_note)
select v.degree, v.code, v.name, d.id, v.coc, true, n.base || ' Capacité M1 : ' || v.cap || '.'
from n,
(values
  ('master_recherche', 'EDR',       'Économie du Développement Régional',                                       null::text,             false, '25'),
  ('master_recherche', 'MFI',       'Macroéconomie et Finance Internationale',                                  null,                   false, '25'),
  ('master_recherche', 'MSO',       'Management et Stratégies des Organisations',                               null,                   false, '25'),
  ('master_recherche', 'DMI',       'Décisions Marketing et Innovation',                                        null,                   false, '25'),
  ('master_pro',       'GRH-DSN',   'Gestion des Ressources Humaines : Dialogue Social et Négociation',        null,                   false, '30'),
  ('master_pro',       'INAE',      'Ingénierie et Analyse Économique',                                         null,                   false, '30'),
  ('master_pro',       'FIN',       'Finance',                                                                  'finance-comptabilite', false, '45'),
  ('master_pro',       'CCA',       'Comptabilité, Contrôle et Audit',                                          'finance-comptabilite', false, '30'),
  ('master_pro',       'DGMI',      'Digital Management et Innovation',                                         null,                   false, '30'),
  ('master_pro',       'DIG-MKG',   'Digital Marketing',                                                        null,                   false, '30'),
  ('master_pro',       'CIE',       'Commerce International et Entrepreneuriat',                                null,                   false, '30'),
  ('master_pro',       'ENE',       'Économie Numérique et Entrepreneuriat',                                    null,                   false, '30'),
  ('master_pro',       'MML',       'Management et Marketing du Luxe',                                          null,                   false, '25'),
  ('master_pro',       'DDS',       'Digitalisation des Services',                                              null,                   true,  '30'),
  ('master_pro',       'FINDIG',    'Finance Digitale',                                                         'finance-comptabilite', false, '25'),
  ('master_pro',       'MEMICC',    'Management Entrepreneurial et Marketing dans les Industries Culturelles et Créatives', null,       false, '35'),
  ('master_pro',       'MGT-INNOV', 'Management de l’innovation (avec ENIT)',                                   null,                   false, '30'),
  ('master_pro',       'ONG',       'Gestion des ONG (avec TBS)',                                               null,                   false, '35')
) as v(degree, code, name, dept_slug, coc, cap)
left join public.departments d on d.slug = v.dept_slug
on conflict (code) do nothing;

-- parcours de M2 du master professionnel Finance
-- source : https://essect.rnu.tn/fr/enseignants/departement-finance-comptabilite
insert into public.program_tracks (program_id, name)
select p.id, t.name
from (values
  ('FIN', 'Gestion et Audit des Risques (GAR)'),
  ('FIN', 'Gestion des Risques de Marchés (GRIM)')
) as t(code, name)
join public.programs p on p.code = t.code
on conflict (program_id, name) do nothing;

-- ---------- LICENCES (inactives : À VÉRIFIER) -------------------------
with n as (
  select 'À VÉRIFIER avant activation : année de validité non précisée et libellés non concordants. Sources : https://essect.rnu.tn/fra/articles/226/emplois-du-temps-licences ; https://essect.rnu.tn/fra/articles/285/emplois-du-temps-licences-et-mastere ; https://essect.rnu.tn/fra/departements/CF/17/finance-comptabilite. Code interne UNOVA.' as base
)
insert into public.programs
  (degree_type_code, code, name, department_id, is_co_constructed, is_active, source_note)
select 'licence', v.code, v.name, null, false, false, n.base
from n,
(values
  ('LA-INFO-GESTION', 'Licence appliquée en informatique de gestion'),
  ('LA-ECONOMIE',     'Licence appliquée en économie'),
  ('LA-GESTION',      'Licence appliquée en gestion'),
  ('LF-ECONOMIE',     'Licence fondamentale en économie'),
  ('LF-GESTION',      'Licence fondamentale en gestion')
) as v(code, name)
on conflict (code) do nothing;

-- parcours tels qu'écrits sur le site (libellés à confirmer)
insert into public.program_tracks (program_id, name)
select p.id, t.name
from (values
  ('LA-INFO-GESTION', 'Informatique pour l’Adm. (libellé abrégé sur le site)'),
  ('LA-ECONOMIE',     'Économie de l’information et des réseaux'),
  ('LA-ECONOMIE',     'Techniques de commerce international'),
  ('LA-GESTION',      'Administration des affaires : Gestion des entreprises exportatrices'),
  ('LA-GESTION',      'Comptabilité : Techniques comptables et fiscales'),
  ('LA-GESTION',      'Finance : Ingénierie financière (et marchés selon la page)'),
  ('LA-GESTION',      'Marketing : Marketing du Web'),
  ('LF-ECONOMIE',     'Monnaie, finance et banque'),
  ('LF-ECONOMIE',     'Économie managériale et industrielle'),
  ('LF-GESTION',      'Comptabilité'),
  ('LF-GESTION',      'Finance'),
  ('LF-GESTION',      'Marketing'),
  ('LF-GESTION',      'Administration des affaires')
) as t(code, name)
join public.programs p on p.code = t.code
on conflict (program_id, name) do nothing;
