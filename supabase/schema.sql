-- ============================================================
-- Fichotheque — schéma Supabase (à coller dans l'éditeur SQL)
-- ============================================================
-- Un seul fichier : tables + index + triggers + RLS + bucket
-- de stockage public (téléchargement sans connexion).
-- ============================================================

create extension if not exists "pgcrypto";

-- ------------------------------------------------------------
-- Tableau des seuils de modération (deux étages, voir plus bas)
-- ------------------------------------------------------------
create table public.moderation_settings (
  key   text primary key,
  value integer not null
);

insert into public.moderation_settings (key, value) values
  ('report_downvote_threshold', 20), -- en dessous : bouton "Signaler" caché
  ('report_removal_threshold',   5);  -- nombre de signalements -> suppression

-- ------------------------------------------------------------
-- Profils (créés automatiquement à la première connexion)
-- ------------------------------------------------------------
create table public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  school_email text,
  is_admin     boolean not null default false, -- modérateur, voir apply_admin_emails
  created_at   timestamptz not null default now()
);

-- ------------------------------------------------------------
-- Cours (UE)
-- ------------------------------------------------------------
create table public.courses (
  id         uuid primary key default gen_random_uuid(),
  code       text not null unique, -- ex. 'UE1.2'
  name       text not null,
  created_at timestamptz not null default now()
);

insert into public.courses (code, name) values
  ('UE1.1', 'Analyse 1'),
  ('UE1.2', 'Algèbre 1'),
  ('UE1.3', 'Algorithmique et programmation'),
  ('UE1.4', 'Architecture des ordinateurs');

-- ------------------------------------------------------------
-- Notes (cours / fiches de révision)
-- ------------------------------------------------------------
create table public.notes (
  id            uuid primary key default gen_random_uuid(),
  course_id     uuid not null references public.courses(id) on delete cascade,
  author_id     uuid not null references public.profiles(id) on delete cascade,
  title         text not null,
  description   text,
  note_type     text not null default 'cours' check (note_type in ('cours', 'fiche', 'carte')),
  is_anonymous  boolean not null default false,
  file_path     text,        -- chemin objet dans le bucket 'notes'
  file_name     text,
  file_size     bigint,
  score         integer not null default 0,
  upvotes       integer not null default 0,
  downvotes     integer not null default 0,
  comment_count integer not null default 0,
  created_at    timestamptz not null default now(),
  removed_at    timestamptz,       -- non null => supprimé par la modération
  -- Certification CGU : la RLS refuse toute insertion sans ces
  -- champs (voir notes_insert_own) — preuve de la déclaration
  -- sur l'honneur de l'auteur.
  copyright_ack    boolean not null default false,
  copyright_ack_at timestamptz
);

create index notes_course_top_idx  on public.notes (course_id, score desc, created_at desc);
create index notes_global_top_idx  on public.notes (score desc, created_at desc);
create index notes_recent_idx      on public.notes (created_at desc);

-- ------------------------------------------------------------
-- Votes sur les notes — toujours anonymes :
-- un utilisateur ne peut lire que SES propres votes (RLS plus bas),
-- l'identité des votants n'est donc jamais exposée.
-- ------------------------------------------------------------
create table public.note_votes (
  note_id    uuid not null references public.notes(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  value      smallint not null check (value in (-1, 1)),
  created_at timestamptz not null default now(),
  primary key (note_id, user_id)
);

-- ------------------------------------------------------------
-- Signalements — exigeance hébergeur (LCEN art. 6-I-3) : le
-- formulaire légal capture identité du signalant, œuvre
-- protégée, URL du contenu et déclaration de bonne foi.
-- 'community' = seuil de downvotes ; 'legal' = contrefaçon.
-- ------------------------------------------------------------
create table public.note_reports (
  id             uuid primary key default gen_random_uuid(),
  note_id        uuid not null references public.notes(id) on delete cascade,
  reporter_id    uuid not null references public.profiles(id) on delete cascade,
  kind           text not null default 'community' check (kind in ('community', 'legal')),
  reason         text,
  reporter_email text,   -- identité de contact du signalant
  work_title     text,   -- œuvre protégée : titre
  work_author    text,   -- œuvre protégée : auteur / éditeur
  details        text,   -- description de l'atteinte
  content_url    text,   -- URL du contenu signalé
  good_faith     boolean not null default false,
  created_at     timestamptz not null default now(),
  unique (note_id, reporter_id)
);

-- ------------------------------------------------------------
-- Commentaires (1 niveau de réponses max, style Reddit)
-- ------------------------------------------------------------
create table public.comments (
  id           uuid primary key default gen_random_uuid(),
  note_id      uuid not null references public.notes(id) on delete cascade,
  author_id    uuid not null references public.profiles(id) on delete cascade,
  parent_id    uuid references public.comments(id) on delete cascade,
  body         text not null,
  score        integer not null default 0,
  upvotes      integer not null default 0,
  downvotes    integer not null default 0,
  created_at   timestamptz not null default now()
);

create index comments_note_idx on public.comments (note_id, created_at);

create table public.comment_votes (
  comment_id uuid not null references public.comments(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  value      smallint not null check (value in (-1, 1)),
  created_at timestamptz not null default now(),
  primary key (comment_id, user_id)
);

-- ------------------------------------------------------------
-- Suivre un cours (pas de suivi de personnes)
-- ------------------------------------------------------------
create table public.course_follows (
  user_id    uuid not null references public.profiles(id) on delete cascade,
  course_id  uuid not null references public.courses(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, course_id)
);

-- ------------------------------------------------------------
-- Notifications (cloche en-app uniquement pour la v1)
-- ------------------------------------------------------------
create table public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  type       text not null check (type in ('reply','note_comment','course_top','note_removed','report')),
  body       text not null,
  href       text,
  read_at    timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_user_idx on public.notifications (user_id, created_at desc);

-- ============================================================
-- Triggers
-- ============================================================

-- Maintient le profil à la première connexion (display_name = partie avant @)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, school_email)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'display_name',
      split_part(new.email, '@', 1)
    ),
    new.email
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ------------------------------------------------------------
-- Rôles admin : liste blanche par e-mail. Ces comptes peuvent
-- masquer / rétablir / supprimer n'importe quelle note (et
-- supprimer des commentaires). Pour en ajouter un : étends la
-- liste ci-dessous (et ré-exécute ce bloc — le trigger met à
-- jour les profils existants aussi).
-- ------------------------------------------------------------
create or replace function public.apply_admin_emails()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.school_email in (
    'david-alexy.jean-baptiste@univ-tlse3.fr',
    'alex.fabre--laporte@univ-tlse3.fr'
  ) then
    new.is_admin := true;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_apply_admin on public.profiles;
create trigger profiles_apply_admin
  before insert or update on public.profiles
  for each row execute function public.apply_admin_emails();

-- Rétroactif pour les comptes déjà inscrits
update public.profiles
set is_admin = true
where school_email in (
  'david-alexy.jean-baptiste@univ-tlse3.fr',
  'alex.fabre--laporte@univ-tlse3.fr'
);

-- is_admin() : interrogeable depuis les policies RLS et le client.
-- SECURITY DEFINER car les grants par colonne de profiles interdisent
-- la lecture de is_admin aux rôles anon/authenticated.
create or replace function public.is_admin()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select coalesce(
    (select p.is_admin from public.profiles p where p.id = auth.uid()),
    false
  );
$$;

grant execute on function public.is_admin() to anon, authenticated, service_role;

-- set_note_removed : masquage/rétablissement d'une note par un
-- admin. Notifie l'auteur au masquage (mêmes textes que la
-- suppression automatique par signalements).
create or replace function public.set_note_removed(p_note_id uuid, p_removed boolean)
returns void
language plpgsql security definer
set search_path = public
as $$
declare
  n record;
begin
  if not public.is_admin() then
    raise exception 'set_note_removed: admin only';
  end if;

  update public.notes
  set removed_at = case when p_removed then now() else null end
  where id = p_note_id
  returning id, author_id, title into n;

  if p_removed and found then
    insert into public.notifications (user_id, type, body, href)
    values (
      n.author_id,
      'note_removed',
      '« ' || n.title || ' » a été retiré(e) par la modération.',
      null
    );
  end if;
end;
$$;

grant execute on function public.set_note_removed(uuid, boolean) to authenticated;

-- my_school_email() : le formulaire de signalement pré-remplit
-- l'identité de contact. SECURITY DEFINER — ne retourne QUE
-- l'e-mail de l'appelant (school_email reste masqué par les
-- grants par colonne côté API).
create or replace function public.my_school_email()
returns text
language sql stable security definer
set search_path = public
as $$
  select p.school_email from public.profiles p where p.id = auth.uid()
$$;

grant execute on function public.my_school_email() to authenticated;

-- Recalcule score / upvotes / downvotes d'une note
create or replace function public.sync_note_score()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target uuid;
begin
  target := coalesce(new.note_id, old.note_id);
  update public.notes n set
    score    = coalesce(v.up, 0) - coalesce(v.down, 0),
    upvotes  = coalesce(v.up, 0),
    downvotes = coalesce(v.down, 0)
  from (
    select
      sum(case when value =  1 then 1 else 0 end) as up,
      sum(case when value = -1 then 1 else 0 end) as down
    from public.note_votes where note_id = target
  ) v
  where n.id = target;
  return null;
end;
$$;

create trigger note_votes_sync
  after insert or update or delete on public.note_votes
  for each row execute function public.sync_note_score();

-- Recalcule le score d'un commentaire (et son compteur ↑/↓)
create or replace function public.sync_comment_score()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target uuid;
begin
  target := coalesce(new.comment_id, old.comment_id);
  update public.comments c set
    score     = coalesce(v.up, 0) - coalesce(v.down, 0),
    upvotes   = coalesce(v.up, 0),
    downvotes = coalesce(v.down, 0)
  from (
    select
      sum(case when value =  1 then 1 else 0 end) as up,
      sum(case when value = -1 then 1 else 0 end) as down
    from public.comment_votes where comment_id = target
  ) v
  where c.id = target;
  return null;
end;
$$;

create trigger comment_votes_sync
  after insert or update or delete on public.comment_votes
  for each row execute function public.sync_comment_score();

-- Recalcule le nombre de commentaires d'une note
create or replace function public.sync_note_comment_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target uuid;
begin
  target := coalesce(new.note_id, old.note_id);
  update public.notes n set
    comment_count = (select count(*) from public.comments where note_id = target)
  where n.id = target;
  return null;
end;
$$;

create trigger comments_count_sync
  after insert or delete on public.comments
  for each row execute function public.sync_note_comment_count();

-- Étape 2 de la modération : assez de signalements -> suppression
-- permanente + notification "ta fiche a été retirée".
create or replace function public.handle_report_threshold()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  threshold integer;
  n record;
  reports integer;
begin
  select value into threshold
  from public.moderation_settings where key = 'report_removal_threshold';
  threshold := coalesce(threshold, 5);

  select count(*) into reports
  from public.note_reports where note_id = new.note_id;

  if reports >= threshold then
    select id, author_id, title into n
    from public.notes
    where id = new.note_id and removed_at is null;

    if found then
      update public.notes
        set removed_at = now()
        where id = n.id;

      insert into public.notifications (user_id, type, body, href)
      values (
        n.author_id,
        'note_removed',
        '« ' || n.title || ' » a été retiré(e) après signalements.',
        null
      );
    end if;
  end if;

  return new;
end;
$$;

create trigger note_report_threshold
  after insert on public.note_reports
  for each row execute function public.handle_report_threshold();

-- Notification : réponse à ton commentaire
create or replace function public.notify_on_reply()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  parent_author uuid;
  note_author   uuid;
begin
  if new.parent_id is not null then
    select author_id, note_id into parent_author, note_author
    from public.comments where id = new.parent_id;

    if parent_author is not null and parent_author <> new.author_id then
      insert into public.notifications (user_id, type, body, href)
      values (
        parent_author,
        'reply',
        'Quelqu''un a répondu à ton commentaire.',
        '/note/' || new.note_id
      );
    end if;
  end if;
  return new;
end;
$$;

create trigger comment_reply_notify
  after insert on public.comments
  for each row execute function public.notify_on_reply();

-- Notification : commentaire sur ta note
create or replace function public.notify_on_note_comment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  note_author uuid;
begin
  select author_id into note_author
  from public.notes where id = new.note_id;

  if note_author is not null
     and note_author <> new.author_id
     and (new.parent_id is null
          or note_author <> (
            select author_id from public.comments where id = new.parent_id
          )) then
    insert into public.notifications (user_id, type, body, href)
    values (
      note_author,
      'note_comment',
      'Quelqu''un a commenté « ' ||
        (select title from public.notes where id = new.note_id) || ' ».',
      '/note/' || new.note_id
    );
  end if;
  return new;
end;
$$;

create trigger note_comment_notify
  after insert on public.comments
  for each row execute function public.notify_on_note_comment();

-- Notification : une note que tu suis est devenue n°1 dans son cours.
-- ⚠️ NAÏF : peut se déclencher plusieurs fois pour le même événement
-- (limitation connue, non résolue pour la v1 — voir README).
create or replace function public.notify_course_top()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  best uuid;
  f record;
begin
  if new.removed_at is not null then
    return new;
  end if;

  select id into best
  from public.notes
  where course_id = new.course_id and removed_at is null
  order by score desc, created_at desc
  limit 1;

  if best = new.id then
    for f in
      select cf.user_id
      from public.course_follows cf
      where cf.course_id = new.course_id
        and cf.user_id <> new.author_id
    loop
      insert into public.notifications (user_id, type, body, href)
      values (
        f.user_id,
        'course_top',
        'Une note de « ' ||
          (select name from public.courses where id = new.course_id) ||
          ' » est passée n°1.',
        '/note/' || new.id
      );
    end loop;
  end if;

  return new;
end;
$$;

create trigger course_top_notify
  after insert or update of score on public.notes
  for each row execute function public.notify_course_top();

-- Notification : tout signalement légal (contrefaçon) alerte
-- les admins — la cloche pointe vers /admin pour retrait 1 clic.
create or replace function public.notify_admins_on_legal_report()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  note_title text;
  a record;
begin
  if new.kind <> 'legal' then
    return new;
  end if;

  select title into note_title from public.notes where id = new.note_id;

  for a in select id from public.profiles where is_admin loop
    insert into public.notifications (user_id, type, body, href)
    values (
      a.id,
      'report',
      'Signalement légal : « ' ||
        coalesce(note_title, 'note supprimée') || ' ».',
      '/admin'
    );
  end loop;

  return new;
end;
$$;

create trigger report_legal_notify
  after insert on public.note_reports
  for each row execute function public.notify_admins_on_legal_report();

-- ============================================================
-- Row Level Security
-- ============================================================
alter table public.profiles           enable row level security;
alter table public.courses            enable row level security;
alter table public.notes              enable row level security;
alter table public.note_votes         enable row level security;
alter table public.note_reports       enable row level security;
alter table public.comments           enable row level security;
alter table public.comment_votes      enable row level security;
alter table public.course_follows     enable row level security;
alter table public.notifications      enable row level security;
alter table public.moderation_settings enable row level security;

-- profiles : noms d'auteur visibles par tous (mais colonnes
-- restreintes par grants côté GRANTS plus bas), modifiables par soi-même
create policy "profiles_select" on public.profiles
  for select using (true);
create policy "profiles_insert_own" on public.profiles
  for insert with check (id = auth.uid());
create policy "profiles_update_own" on public.profiles
  for update using (id = auth.uid());

-- courses : consultation ouverte, création réservée aux étudiants connectés
create policy "courses_select" on public.courses
  for select using (true);
create policy "courses_insert_auth" on public.courses
  for insert with check (auth.uid() is not null);

-- notes : les notes retirées ne sont visibles que par leur auteur
-- et les admins (qui doivent pouvoir les rétablir).
create policy "notes_select" on public.notes
  for select using (removed_at is null or author_id = auth.uid() or public.is_admin());
-- Insertion : auteur ET certification CGU horodatée obligatoire —
-- la base refuse toute publication non certifiée.
create policy "notes_insert_own" on public.notes
  for insert with check (
    author_id = auth.uid()
    and copyright_ack = true
    and copyright_ack_at is not null
  );
create policy "notes_update_own" on public.notes
  for update using (author_id = auth.uid());
-- Suppression définitive : l'auteur ou un admin. La cascade
-- (votes, signalements, commentaires) nettoie le reste ; le
-- fichier storage est retiré côté client (policy plus bas).
create policy "notes_delete" on public.notes
  for delete using (author_id = auth.uid() or public.is_admin());

-- votes : un utilisateur ne lit QUE ses propres votes (anonymat garanti)
create policy "note_votes_select_own" on public.note_votes
  for select using (user_id = auth.uid());
create policy "note_votes_insert_own" on public.note_votes
  for insert with check (user_id = auth.uid());
create policy "note_votes_update_own" on public.note_votes
  for update using (user_id = auth.uid());
create policy "note_votes_delete_own" on public.note_votes
  for delete using (user_id = auth.uid());

-- signalements : un vote par étudiant ; les admins lisent tout
-- (workflow de retrait), le signalant lit les siens
create policy "reports_select_own" on public.note_reports
  for select using (reporter_id = auth.uid() or public.is_admin());
create policy "reports_insert_own" on public.note_reports
  for insert with check (reporter_id = auth.uid());

-- commentaires
create policy "comments_select" on public.comments
  for select using (true);
create policy "comments_insert_own" on public.comments
  for insert with check (author_id = auth.uid());
create policy "comments_update_own" on public.comments
  for update using (author_id = auth.uid());
create policy "comments_delete_own" on public.comments
  for delete using (author_id = auth.uid() or public.is_admin());

create policy "comment_votes_select_own" on public.comment_votes
  for select using (user_id = auth.uid());
create policy "comment_votes_insert_own" on public.comment_votes
  for insert with check (user_id = auth.uid());
create policy "comment_votes_update_own" on public.comment_votes
  for update using (user_id = auth.uid());
create policy "comment_votes_delete_own" on public.comment_votes
  for delete using (user_id = auth.uid());

-- abonnements de cours
create policy "follows_select_own" on public.course_follows
  for select using (user_id = auth.uid());
create policy "follows_insert_own" on public.course_follows
  for insert with check (user_id = auth.uid());
create policy "follows_delete_own" on public.course_follows
  for delete using (user_id = auth.uid());

-- notifications : strictement privées, mise à jour par soi-même
create policy "notifications_select_own" on public.notifications
  for select using (user_id = auth.uid());
create policy "notifications_update_own" on public.notifications
  for update using (user_id = auth.uid());
create policy "notifications_delete_own" on public.notifications
  for delete using (user_id = auth.uid());

-- seuils : lecture seule côté client
create policy "moderation_select" on public.moderation_settings
  for select using (true);

-- ============================================================
-- GRANTS de base (indispensable sur les projets Supabase
-- récents : RLS ne s'applique qu'APRÈS les grants PostgreSQL)
-- ============================================================
grant usage on schema public to anon, authenticated, service_role;
grant select on all tables in schema public to anon;
grant all on all tables in schema public to authenticated, service_role;
grant all on all sequences in schema public to authenticated, service_role;
alter default privileges in schema public grant select on tables to anon;
alter default privileges in schema public grant all on tables to authenticated, service_role;
alter default privileges in schema public grant all on sequences to authenticated, service_role;

-- ------------------------------------------------------------
-- Durcissement profiles : visibilité des noms d'auteur, mais
-- l'e-mail académique ne quitte JAMAIS l'API.
-- Les grants par colonne priment sur le grant de table : après
-- revoke, anon/authenticated ne peuvent sélectionner que
-- (id, display_name). Toute requête demandant une autre colonne
-- (dont select=*) est refusée par PostgREST.
-- service_role garde l'accès complet (back-office, edge functions).
-- ------------------------------------------------------------
revoke select on public.profiles from anon, authenticated;
grant select (id, display_name) on public.profiles to anon, authenticated;

-- ============================================================
-- Stockage : bucket public 'notes'
-- (aperçu + téléchargement SANS connexion — exigence anti-Scribd)
-- ============================================================
insert into storage.buckets (id, name, public)
values ('notes', 'notes', true)
on conflict (id) do nothing;

create policy "notes_files_public_read" on storage.objects
  for select using (bucket_id = 'notes');

create policy "notes_files_insert_own" on storage.objects
  for insert with check (
    bucket_id = 'notes'
    and auth.uid() is not null
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "notes_files_delete_own" on storage.objects
  for delete using (
    bucket_id = 'notes'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
  );

-- ============================================================
-- Realtime : notifications dans la cloche
-- ============================================================
alter publication supabase_realtime add table public.notifications;
