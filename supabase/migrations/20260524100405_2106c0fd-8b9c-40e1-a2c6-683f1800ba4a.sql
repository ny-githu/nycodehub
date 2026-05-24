
-- Fix mutable search_path
create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end; $$;

-- Convert has_role to SECURITY INVOKER (user_roles RLS allows users to read own roles)
create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql stable security invoker set search_path = public
as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

-- Lock down handle_new_user (only the auth trigger should run it)
revoke execute on function public.handle_new_user() from public, anon, authenticated;
