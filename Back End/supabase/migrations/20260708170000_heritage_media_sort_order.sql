-- Persist gallery media placement so admin drag/reorder is reflected for visitors.

alter table public.heritage_media
  add column if not exists sort_order integer not null default 0;

create index if not exists heritage_media_site_type_sort_idx
  on public.heritage_media (site_id, type, sort_order);

-- Batch update sort order from admin drag/drop.
create or replace function public.set_heritage_media_sort_order(
  p_site_id text,
  p_type text,
  p_ordered_ids text[]
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  i integer;
  updated_count integer := 0;
begin
  if p_site_id is null or p_type is null or p_ordered_ids is null then
    return 0;
  end if;

  if not public.mati_heritage_write_allowed() then
    raise exception 'not allowed';
  end if;

  for i in 1 .. coalesce(array_length(p_ordered_ids, 1), 0) loop
    update public.heritage_media
    set
      sort_order = i - 1,
      updated_at = now()
    where
      id = p_ordered_ids[i]
      and site_id = p_site_id
      and type = p_type
      and is_deleted = false;
    if found then
      updated_count := updated_count + 1;
    end if;
  end loop;

  return updated_count;
end;
$$;

revoke all on function public.set_heritage_media_sort_order(text, text, text[]) from public;
grant execute on function public.set_heritage_media_sort_order(text, text, text[]) to anon, authenticated;
