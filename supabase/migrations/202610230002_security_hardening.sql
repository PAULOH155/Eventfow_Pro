-- Tighten explicit function grants and index the event creator foreign key.
revoke execute on function public.is_org_member(uuid) from anon;
revoke execute on function public.has_org_role(uuid, text[]) from anon;
revoke execute on function public.create_organization(text) from anon;
grant execute on function public.is_org_member(uuid) to authenticated;
grant execute on function public.has_org_role(uuid, text[]) to authenticated;
grant execute on function public.create_organization(text) to authenticated;
create index if not exists events_created_by_idx on public.events(created_by);