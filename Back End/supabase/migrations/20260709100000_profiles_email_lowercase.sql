-- One email per player: normalize stored emails and enforce lowercase.

update public.profiles
set email = lower(trim(email))
where email <> lower(trim(email));

create or replace function public.normalize_profile_email()
returns trigger
language plpgsql
as $$
begin
  new.email := lower(trim(new.email));
  new.username := lower(trim(new.username));
  return new;
end;
$$;

drop trigger if exists profiles_normalize_identity on public.profiles;
create trigger profiles_normalize_identity
before insert or update on public.profiles
for each row execute function public.normalize_profile_email();

alter table public.profiles
  drop constraint if exists profiles_email_lowercase_chk;

alter table public.profiles
  add constraint profiles_email_lowercase_chk
  check (email = lower(email));
