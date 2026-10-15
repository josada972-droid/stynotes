-- ============================================================
-- Migration : rôles admin + compteurs ↑/↓ sur les commentaires
-- ============================================================

-- 1) Colonne admin sur les profils
alter table public.profiles
  add column if not exists is_admin boolean not null default false;

-- 2) Liste blanche des admins par e-mail (appliquée à l'inscription
--    et rétroactivement). Pour en ajouter un : étends la liste et
--    ré-exécute ce bloc.
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

update public.profiles
set is_admin = true
where school_email in (
  'david-alexy.jean-baptiste@univ-tlse3.fr',
  'alex.fabre--laporte@univ-tlse3.fr'
);

-- 3) is_admin() : utilisable depuis les policies RLS et le client.
--    SECURITY DEFINER car les grants par colonne de profiles
--    interdisent la lecture de is_admin aux rôles anon/authenticated.
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

-- 4) set_note_removed : masquage/rétablissement par un admin,
--    avec notification à l'auteur au masquage.
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

-- 5) Compteurs ↑/↓ sur les commentaires (rétroactif depuis comment_votes)
alter table public.comments
  add column if not exists upvotes   integer not null default 0,
  add column if not exists downvotes integer not null default 0;

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

-- Rétroactif : recalcul depuis les votes existants
update public.comments c set
  score     = coalesce(v.up, 0) - coalesce(v.down, 0),
  upvotes   = coalesce(v.up, 0),
  downvotes = coalesce(v.down, 0)
from (
  select
    comment_id,
    sum(case when value =  1 then 1 else 0 end) as up,
    sum(case when value = -1 then 1 else 0 end) as down
  from public.comment_votes group by comment_id
) v
where c.id = v.comment_id;

-- 6) RLS : admin voit les notes retirées, auteur OU admin supprime
drop policy if exists "notes_select" on public.notes;
create policy "notes_select" on public.notes
  for select using (removed_at is null or author_id = auth.uid() or public.is_admin());

drop policy if exists "notes_delete" on public.notes;
create policy "notes_delete" on public.notes
  for delete using (author_id = auth.uid() or public.is_admin());

drop policy if exists "comments_delete_own" on public.comments;
create policy "comments_delete_own" on public.comments
  for delete using (author_id = auth.uid() or public.is_admin());

-- 7) Storage : un admin peut retirer le fichier de n'importe quelle note
drop policy if exists "notes_files_delete_own" on storage.objects;
create policy "notes_files_delete_own" on storage.objects
  for delete using (
    bucket_id = 'notes'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
  );
