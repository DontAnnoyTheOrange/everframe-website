-- Everframe Productions: migration 003, Row Level Security and table permissions.
-- Rule of thumb: visitors read only published/active content; only verified admins write; bookings are admin-only.

alter table public.admin_users            enable row level security;
alter table public.event_categories       enable row level security;
alter table public.portfolio_projects     enable row level security;
alter table public.portfolio_images       enable row level security;
alter table public.packages               enable row level security;
alter table public.addons                 enable row level security;
alter table public.bookings               enable row level security;
alter table public.booking_addons         enable row level security;
alter table public.booking_status_history enable row level security;
alter table public.availability_blocks    enable row level security;
alter table public.testimonials           enable row level security;
alter table public.site_settings          enable row level security;

-- Start from zero permissions, then grant only what is needed.
revoke all on all tables in schema public from anon, authenticated;

-- Public content: readable by visitors (RLS narrows to published rows).
grant select on public.event_categories, public.portfolio_projects, public.portfolio_images,
                public.packages, public.addons, public.testimonials, public.site_settings
  to anon, authenticated;
-- Admin content tools. RLS still requires is_admin() for every write.
grant insert, update, delete on public.event_categories, public.portfolio_projects, public.portfolio_images,
                public.packages, public.addons, public.testimonials, public.site_settings
  to authenticated;
-- Private tables: read-only for signed-in users, and RLS limits that to admins.
-- Writes happen only through the admin_* / create_* functions.
grant select on public.bookings, public.booking_addons, public.booking_status_history,
                public.availability_blocks, public.admin_users
  to authenticated;
grant delete on public.availability_blocks to authenticated;

-- admin_users: you can see only your own row. Nobody can write it through the API.
create policy admin_users_select_self on public.admin_users
  for select to authenticated using (user_id = (select auth.uid()));

-- event_categories
create policy categories_read on public.event_categories
  for select to anon, authenticated using (is_published or public.is_admin());
create policy categories_admin_write on public.event_categories
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- portfolio_projects
create policy projects_read on public.portfolio_projects
  for select to anon, authenticated using (is_published or public.is_admin());
create policy projects_admin_write on public.portfolio_projects
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- portfolio_images: visible when the parent project is published.
create policy images_read on public.portfolio_images
  for select to anon, authenticated using (
    public.is_admin()
    or exists (select 1 from public.portfolio_projects p where p.id = project_id and p.is_published));
create policy images_admin_write on public.portfolio_images
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- packages and add-ons
create policy packages_read on public.packages
  for select to anon, authenticated using (is_active or public.is_admin());
create policy packages_admin_write on public.packages
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy addons_read on public.addons
  for select to anon, authenticated using (is_active or public.is_admin());
create policy addons_admin_write on public.addons
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- testimonials and settings
create policy testimonials_read on public.testimonials
  for select to anon, authenticated using (is_published or public.is_admin());
create policy testimonials_admin_write on public.testimonials
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy settings_read on public.site_settings
  for select to anon, authenticated using (is_public or public.is_admin());
create policy settings_admin_write on public.site_settings
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Bookings and related private data: admin read only. No insert/update policies exist on purpose.
create policy bookings_admin_read on public.bookings
  for select to authenticated using (public.is_admin());
create policy booking_addons_admin_read on public.booking_addons
  for select to authenticated using (public.is_admin());
create policy booking_history_admin_read on public.booking_status_history
  for select to authenticated using (public.is_admin());
create policy blocks_admin_read on public.availability_blocks
  for select to authenticated using (public.is_admin());
create policy blocks_admin_delete on public.availability_blocks
  for delete to authenticated using (public.is_admin());