-- Iedere gebruiker kiest zelf of Clubhuis een badge op het geïnstalleerde app-icoon toont.
alter table public.profiles
  add column badges_enabled boolean not null default false;
