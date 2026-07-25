-- "Mijn mooiste herinneringen": een kind kiest zelf welke van zijn eigen verhalen
-- daarin komen (geen algoritme, geen populariteitswedstrijd). Cap van 20 wordt
-- client-side gehandhaafd, niet met een DB-constraint — bij deze schaal (klein,
-- vertrouwd netwerk) is dat voldoende en simpeler dan een trigger.
alter table public.stories
  add column is_favorite boolean not null default false;
