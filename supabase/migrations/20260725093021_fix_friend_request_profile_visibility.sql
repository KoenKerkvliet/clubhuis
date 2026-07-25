-- Zelfde soort bug als de profile_cards-view: de INSERT-policy op friendships checkte
-- of de addressee 'active' is via een gewone EXISTS-subquery op profiles. Die subquery
-- valt onder de RLS van profiles zelf (alleen eigen rij of al-vrienden zichtbaar), dus
-- voor een NIET-vriend (het hele punt van een vriendschapsverzoek) gaf de subquery altijd
-- niets terug en werd elk verzoek stilzwijgend geweigerd met een RLS-fout.
create or replace function public.is_profile_active(p_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.profiles where id = p_id and status = 'active');
$$;

revoke execute on function public.is_profile_active(uuid) from public, anon;
grant execute on function public.is_profile_active(uuid) to authenticated;

drop policy "friendships_insert_as_requester" on public.friendships;

create policy "friendships_insert_as_requester"
  on public.friendships for insert
  with check (
    requester_id = auth.uid()
    and public.current_role_open()
    and public.is_profile_active(addressee_id)
  );
