-- EventFlow Pro: multi-tenant foundation and event management.
create extension if not exists pgcrypto;

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 1 and 100),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  created_at timestamptz not null default now()
);

create table if not exists public.organization_members (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner','admin','event_manager','finance','ticket_operator','bar_operator','stock_operator','entry_inspector')),
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);
create index if not exists organization_members_user_id_idx on public.organization_members(user_id);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 160),
  description text check (description is null or char_length(description) <= 2000),
  venue text check (venue is null or char_length(venue) <= 200),
  starts_at timestamptz,
  ends_at timestamptz,
  status text not null default 'draft' check (status in ('draft','published','cancelled','completed')),
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint event_time_order check (starts_at is null or ends_at is null or ends_at >= starts_at)
);
create index if not exists events_org_starts_idx on public.events(organization_id, starts_at);

create or replace function public.is_org_member(target_org uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.organization_members m
    where m.organization_id = target_org and m.user_id = (select auth.uid()));
$$;

create or replace function public.has_org_role(target_org uuid, allowed_roles text[])
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.organization_members m
    where m.organization_id = target_org and m.user_id = (select auth.uid()) and m.role = any(allowed_roles));
$$;

create or replace function public.slugify(input_text text)
returns text language sql immutable set search_path = ''
as $$
  select trim(both '-' from regexp_replace(
    translate(lower(input_text),
      'áàâãäåāăąéèêëēĕėęěíìîïīĭįóòôõöøōŏőúùûüūŭůçćčñń',
      'aaaaaaaaaeeeeeeeeeiiiiiiiiooooooooouuuuuuucccnn'),
    '[^a-z0-9]+', '-', 'g'));
$$;

create or replace function public.create_organization(organization_name text)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare
  new_org_id uuid;
  base_slug text;
  candidate_slug text;
  suffix integer := 1;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if char_length(trim(organization_name)) not between 1 and 100 then
    raise exception 'Organization name must contain 1 to 100 characters';
  end if;
  base_slug := left(public.slugify(trim(organization_name)), 75);
  if base_slug = '' then base_slug := 'organizacao'; end if;
  candidate_slug := base_slug;
  while exists (select 1 from public.organizations o where o.slug = candidate_slug) loop
    suffix := suffix + 1;
    candidate_slug := left(base_slug, 80 - length(suffix::text)) || '-' || suffix::text;
  end loop;
  insert into public.organizations(name, slug) values (trim(organization_name), candidate_slug)
    returning id into new_org_id;
  insert into public.organization_members(organization_id, user_id, role)
    values (new_org_id, auth.uid(), 'owner');
  return new_org_id;
end;
$$;

create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = ''
as $$ begin new.updated_at := now(); return new; end; $$;

revoke all on function public.is_org_member(uuid) from public;
revoke all on function public.has_org_role(uuid, text[]) from public;
revoke all on function public.create_organization(text) from public;
grant execute on function public.is_org_member(uuid) to authenticated;
grant execute on function public.has_org_role(uuid, text[]) to authenticated;
grant execute on function public.create_organization(text) to authenticated;

drop trigger if exists events_set_updated_at on public.events;
create trigger events_set_updated_at before update on public.events
for each row execute function public.set_updated_at();

alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.events enable row level security;

drop policy if exists organizations_select_member on public.organizations;
create policy organizations_select_member on public.organizations
for select to authenticated using (public.is_org_member(id));

drop policy if exists memberships_select_same_org on public.organization_members;
create policy memberships_select_same_org on public.organization_members
for select to authenticated using (public.is_org_member(organization_id));

drop policy if exists events_select_member on public.events;
create policy events_select_member on public.events
for select to authenticated using (public.is_org_member(organization_id));

drop policy if exists events_insert_managers on public.events;
create policy events_insert_managers on public.events
for insert to authenticated with check (
  public.has_org_role(organization_id, array['owner','admin','event_manager'])
  and created_by = (select auth.uid())
);

drop policy if exists events_update_managers on public.events;
create policy events_update_managers on public.events
for update to authenticated
using (public.has_org_role(organization_id, array['owner','admin','event_manager']))
with check (public.has_org_role(organization_id, array['owner','admin','event_manager']));

drop policy if exists events_delete_admins on public.events;
create policy events_delete_admins on public.events
for delete to authenticated using (public.has_org_role(organization_id, array['owner','admin']));

grant select on public.organizations to authenticated;
grant select on public.organization_members to authenticated;
grant select, insert, update, delete on public.events to authenticated;
