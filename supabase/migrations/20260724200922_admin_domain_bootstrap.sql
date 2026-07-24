-- Accounts die zich registreren met een @designpixels.nl e-mailadres worden meteen
-- als beheerder actief. Dit is de bootstrap voor de eerste (zelf)beheerder van Clubhuis.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_is_admin_domain boolean := new.email ilike '%@designpixels.nl';
begin
  insert into public.profiles (id, username, display_name, role, status)
  values (
    new.id,
    lower(new.raw_user_meta_data ->> 'username'),
    coalesce(new.raw_user_meta_data ->> 'display_name', new.raw_user_meta_data ->> 'username'),
    case when v_is_admin_domain then 'beheerder' else 'kind' end,
    case when v_is_admin_domain then 'active' else 'pending' end
  );
  return new;
end;
$$;
