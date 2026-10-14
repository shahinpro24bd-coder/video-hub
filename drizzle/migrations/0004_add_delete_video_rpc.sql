create or replace function public.delete_video(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.videos where id = p_id;
end;
$$;

revoke all on function public.delete_video(uuid) from public;
grant execute on function public.delete_video(uuid) to anon, authenticated;