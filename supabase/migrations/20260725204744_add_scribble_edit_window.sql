-- Scribbles hadden nog geen update-policy: de auteur mocht een krabbel wel plaatsen en
-- verwijderen, maar niet corrigeren. Sta bewerken toe binnen 30 minuten na plaatsen (net als
-- een kort tikfoutje rechtzetten), zodat een oude krabbel niet achteraf stilletjes aangepast
-- kan worden. Een beheerder mag altijd (voor moderatie).
create policy "scribbles_update_own_within_30_min"
  on public.scribbles for update
  using (
    (author_id = auth.uid() and created_at > now() - interval '30 minutes')
    or public.is_admin()
  )
  with check (
    (author_id = auth.uid() and created_at > now() - interval '30 minutes')
    or public.is_admin()
  );
