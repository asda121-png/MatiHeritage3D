-- SHA-256 password digests on profiles (capstone requirement).
-- Plain passwords are never stored; Supabase Auth still verifies sign-in.

alter table public.profiles
  add column if not exists password_salt text,
  add column if not exists password_hash_sha256 text;

comment on column public.profiles.password_salt is
  'Per-user salt for SHA-256 password digest (password accounts only).';
comment on column public.profiles.password_hash_sha256 is
  'SHA-256(salt || password) hex digest — never store plain passwords.';

create or replace function public.set_password_digest(p_salt text, p_hash text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if p_salt is null or p_hash is null or length(trim(p_salt)) < 8 then
    raise exception 'Invalid password digest';
  end if;

  update public.profiles
  set
    password_salt = p_salt,
    password_hash_sha256 = p_hash
  where id = auth.uid();
end;
$$;

grant execute on function public.set_password_digest(text, text) to authenticated;
