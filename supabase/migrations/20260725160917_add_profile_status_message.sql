-- Korte, zelfgekozen statuszin die naast de schermnaam getoond wordt (in een ander
-- lettertype, ter onderscheid). Los van de bestaande 'status'-kolom, die de
-- goedkeuringsstatus van het account bijhoudt (pending/active/...) — vandaar de
-- andere naam, om verwarring te voorkomen.
alter table public.profiles
  add column status_message text,
  add constraint profiles_status_message_length check (status_message is null or char_length(status_message) <= 80);

create or replace view public.profile_cards as
  select id, username, display_name, avatar_url, status_message
  from public.profiles
  where status = 'active';

alter view public.profile_cards set (security_invoker = false);
