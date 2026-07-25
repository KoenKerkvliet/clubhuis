-- Zelfgekozen kleurprofiel: vervangt de blauwe kleurschaal (--color-blue-*) overal in de
-- app door een van de zes voorgedefinieerde paletten. Aura (oranje) blijft altijd apart —
-- dat is bewust een los accent, geen onderdeel van het primaire kleurprofiel.
alter table public.profiles
  add column theme_color text not null default 'blauw'
  check (theme_color in ('blauw', 'groen', 'paars', 'framboos', 'teal', 'terracotta'));
