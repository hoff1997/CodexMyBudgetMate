alter table public.labels
  add column if not exists description text,
  add column if not exists usage_count integer not null default 0;

create or replace function public.refresh_label_usage() returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.labels l
  set usage_count = coalesce(
    (
      select count(*)
      from public.transaction_labels tl
      where tl.label_id = l.id
    ),
    0
  );
end;
$$;

comment on function public.refresh_label_usage is 'Recomputes usage counts for labels based on transaction_labels table.';
