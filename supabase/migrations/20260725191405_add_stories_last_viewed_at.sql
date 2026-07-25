-- Voor een "nieuwe verhalen"-badge op het Verhalen-tabblad: vergelijk het moment van het
-- nieuwste zichtbare verhaal van een vriend met wanneer de gebruiker de feed voor het laatst
-- bekeken heeft. Default now() zodat bestaande gebruikers niet meteen een badge krijgen voor
-- alle verhalen die er al stonden.
alter table public.profiles add column stories_last_viewed_at timestamptz not null default now();
