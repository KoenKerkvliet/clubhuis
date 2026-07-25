-- Voegt 'archived' toe als profielstatus: een beheerder kan een account archiveren
-- (alle data blijft bestaan, kan later hersteld worden naar 'active') en pas daarna
-- definitief verwijderen. Dit maakt verwijderen altijd een bewuste tweede stap.
alter table public.profiles drop constraint if exists profiles_status_check;
alter table public.profiles add constraint profiles_status_check
  check (status in ('pending', 'active', 'rejected', 'blocked', 'archived'));
