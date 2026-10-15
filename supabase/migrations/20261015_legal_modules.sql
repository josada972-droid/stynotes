-- ============================================================
-- Migration : module légal — CGU traçables + signalements
-- enrichis + sémantique "carte mentale" + alerte admins
-- ============================================================

-- ------------------------------------------------------------
-- 1) Certification CGU à chaque publication
--    La case à cocher du formulaire devient une exigence de la
--    base : aucune note ne peut être insérée sans certification
--    horodatée (preuve légale de la déclaration sur l'honneur).
-- ------------------------------------------------------------
alter table public.notes
  add column if not exists copyright_ack    boolean not null default false,
  add column if not exists copyright_ack_at timestamptz;

drop policy if exists "notes_insert_own" on public.notes;
create policy "notes_insert_own" on public.notes
  for insert with check (
    author_id = auth.uid()
    and copyright_ack = true
    and copyright_ack_at is not null
  );

-- ------------------------------------------------------------
-- 2) Signalements enrichis (exigence hébergeur — LCEN art.
--    6-I-3) : identité du signalant, œuvre protégée, URL du
--    contenu, catégorie et déclaration de bonne foi.
-- ------------------------------------------------------------
alter table public.note_reports
  add column if not exists kind          text not null default 'community'
    check (kind in ('community', 'legal')),
  add column if not exists reporter_email text,
  add column if not exists work_title     text,
  add column if not exists work_author    text,
  add column if not exists details        text,
  add column if not exists content_url    text,
  add column if not exists good_faith     boolean not null default false;

-- Les admins doivent lire tous les signalements (workflow).
drop policy if exists "reports_select_own" on public.note_reports;
create policy "reports_select_own" on public.note_reports
  for select using (reporter_id = auth.uid() or public.is_admin());

-- ------------------------------------------------------------
-- 3) my_school_email() : le formulaire pré-remplit l'identité du
--    signalant. SECURITY DEFINER — ne retourne QUE l'e-mail de
--    l'appelant (school_email reste masqué par les grants).
-- ------------------------------------------------------------
create or replace function public.my_school_email()
returns text
language sql stable security definer
set search_path = public
as $$
  select p.school_email from public.profiles p where p.id = auth.uid()
$$;

grant execute on function public.my_school_email() to authenticated;

-- ------------------------------------------------------------
-- 4) Type "carte mentale" — vocabulaire légalement sûr
-- ------------------------------------------------------------
alter table public.notes drop constraint if exists notes_note_type_check;
alter table public.notes
  add constraint notes_note_type_check check (note_type in ('cours', 'fiche', 'carte'));

-- ------------------------------------------------------------
-- 5) Alerte admins sur tout signalement légal : le type 'report'
--    rejoint la cloche, le corps pointe vers /admin (take-down
--    en un clic).
-- ------------------------------------------------------------
alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications
  add constraint notifications_type_check
  check (type in ('reply', 'note_comment', 'course_top', 'note_removed', 'report'));

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

drop trigger if exists report_legal_notify on public.note_reports;
create trigger report_legal_notify
  after insert on public.note_reports
  for each row execute function public.notify_admins_on_legal_report();
