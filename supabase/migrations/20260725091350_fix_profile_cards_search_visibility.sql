-- De profile_cards view stond op security_invoker = true, waardoor hij de RLS van de
-- onderliggende profiles-tabel overnam (alleen eigen rij of al-geaccepteerde vrienden
-- zichtbaar). Daardoor kon niemand ooit een nieuwe (nog-geen-vriend) gebruiker vinden via
-- zoeken — de hele vriendschapsverzoek-flow was hierdoor kapot sinds de eerste migratie.
alter view public.profile_cards set (security_invoker = false);
