-- Advisor-fixes: search_path vastzetten + interne functies afschermen van de publieke API.

alter function public.clubhuis_is_open(text) set search_path = public;
alter function public.set_updated_at() set search_path = public;

-- are_friends / current_role_open / is_admin worden gebruikt binnen RLS-policies voor
-- ingelogde gebruikers: EXECUTE blijft nodig voor authenticated, maar anon/publiek dicht.
revoke execute on function public.are_friends(uuid, uuid) from public, anon;
revoke execute on function public.current_role_open() from public, anon;
revoke execute on function public.is_admin() from public, anon;
grant execute on function public.are_friends(uuid, uuid) to authenticated;
grant execute on function public.current_role_open() to authenticated;
grant execute on function public.is_admin() to authenticated;

-- Deze functies horen alleen via triggers te draaien, nooit via een directe RPC-aanroep.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.prevent_self_privilege_escalation() from public, anon, authenticated;
revoke execute on function public.notify(uuid, text, jsonb) from public, anon, authenticated;
revoke execute on function public.notify_friendship_change() from public, anon, authenticated;
revoke execute on function public.notify_aura() from public, anon, authenticated;
revoke execute on function public.notify_comment() from public, anon, authenticated;
revoke execute on function public.notify_scribble() from public, anon, authenticated;
