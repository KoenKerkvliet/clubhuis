-- Profielfoto's: privé bucket zoals story-photos, maar met bredere leestoegang omdat
-- avatar_url ook getoond wordt in zoekresultaten van nog-geen-vrienden (profile_cards
-- toont avatar_url al voor elk actief profiel). is_profile_active() bestaat al
-- (fix_friend_request_profile_visibility) en spiegelt precies die zichtbaarheid.
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', false)
on conflict (id) do nothing;

create policy "avatars_insert_own_folder"
  on storage.objects for insert
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "avatars_delete_own_folder_or_admin"
  on storage.objects for delete
  using (bucket_id = 'avatars' and ((storage.foldername(name))[1] = auth.uid()::text or is_admin()));

create policy "avatars_select"
  on storage.objects for select
  using (
    bucket_id = 'avatars' and (
      (storage.foldername(name))[1] = auth.uid()::text
      or are_friends(auth.uid(), ((storage.foldername(name))[1])::uuid)
      or is_admin()
      or is_profile_active(((storage.foldername(name))[1])::uuid)
    )
  );
