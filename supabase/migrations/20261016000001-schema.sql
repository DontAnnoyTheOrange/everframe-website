-- Everframe Productions: migration 001, tables, constraints, indexes, triggers.
-- Run first. Safe to read top to bottom; each table has a short purpose comment.

-- Keeps updated_at current on every UPDATE.
create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- Who is an administrator. Rows are added manually (see README, "first admin").
create table public.admin_users (
  user_id      uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  created_at   timestamptz not null default now()
);

-- Wedding, Debut, Corporate, Concert. Used for services, portfolio filters and booking event type.
create table public.event_categories (
  id              uuid primary key default gen_random_uuid(),
  slug            text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name            text not null check (char_length(name) between 1 and 80),
  short_story     text check (char_length(short_story) <= 600),
  cover_public_id text,
  sort_order      integer not null default 0,
  is_published    boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create trigger trg_event_categories_updated before update on public.event_categories
  for each row execute function public.set_updated_at();

-- One gallery (a shoot) inside a category.
create table public.portfolio_projects (
  id           uuid primary key default gen_random_uuid(),
  category_id  uuid not null references public.event_categories (id) on delete restrict,
  slug         text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title        text not null check (char_length(title) between 1 and 160),
  description  text check (char_length(description) <= 2000),
  shoot_date   date,
  is_published boolean not null default false,
  sort_order   integer not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index idx_portfolio_projects_category on public.portfolio_projects (category_id);
create trigger trg_portfolio_projects_updated before update on public.portfolio_projects
  for each row execute function public.set_updated_at();

-- Image metadata. The file itself lives in Cloudinary.
create table public.portfolio_images (
  id                   uuid primary key default gen_random_uuid(),
  project_id           uuid not null references public.portfolio_projects (id) on delete cascade,
  cloudinary_public_id text not null unique,
  width                integer not null check (width > 0),
  height               integer not null check (height > 0),
  alt_text             text not null default '' check (char_length(alt_text) <= 300),
  caption              text check (char_length(caption) <= 300),
  sort_order           integer not null default 0,
  is_cover             boolean not null default false,
  created_at           timestamptz not null default now()
);
create index idx_portfolio_images_project on public.portfolio_images (project_id, sort_order);
-- At most one cover image per project.
create unique index uq_portfolio_images_one_cover on public.portfolio_images (project_id) where is_cover;

-- Basic / Standard / Premium. A flat price for an hour range.
create table public.packages (
  id           uuid primary key default gen_random_uuid(),
  slug         text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name         text not null,
  min_hours    numeric(4,1) not null check (min_hours > 0),
  max_hours    numeric(4,1) not null,
  price        numeric(10,2) not null check (price >= 0),
  inclusions   text[] not null default '{}',
  is_active    boolean not null default true,
  sort_order   integer not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint packages_hours_ck check (max_hours >= min_hours and max_hours <= 24)
);
create trigger trg_packages_updated before update on public.packages
  for each row execute function public.set_updated_at();

-- Optional extras. per_hour = price is multiplied by booked hours.
create table public.addons (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  price      numeric(10,2) not null check (price >= 0),
  per_hour   boolean not null default false,
  is_active  boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_addons_updated before update on public.addons
  for each row execute function public.set_updated_at();

-- One table for website, Messenger and phone bookings.
-- Package and price details are COPIED in (snapshots) so later price edits never change old bookings.
create table public.bookings (
  id                      uuid primary key default gen_random_uuid(),
  reference_code          text not null unique
                            default ('EF-' || upper(substr(md5(gen_random_uuid()::text), 1, 6))),
  status                  text not null default 'pending_confirmation'
                            check (status in ('inquiry','pending_confirmation','confirmed','rejected','cancelled','completed')),
  source                  text not null default 'website'
                            check (source in ('website','messenger','phone','other')),
  category_id             uuid not null references public.event_categories (id) on delete restrict,
  package_id              uuid references public.packages (id) on delete restrict,
  client_name             text not null check (char_length(client_name) between 2 and 120),
  client_email            text check (client_email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' and char_length(client_email) <= 254),
  client_phone            text check (char_length(client_phone) between 7 and 20),
  client_messenger        text check (char_length(client_messenger) <= 200),
  venue                   text check (char_length(venue) <= 200),
  client_message          text check (char_length(client_message) <= 2000),
  internal_notes          text check (char_length(internal_notes) <= 4000),
  starts_at               timestamptz,
  ends_at                 timestamptz,
  duration_hours          numeric(4,1) check (duration_hours > 0 and duration_hours <= 24),
  package_name_snapshot   text,
  package_price_snapshot  numeric(10,2) check (package_price_snapshot >= 0),
  addons_total            numeric(10,2) not null default 0 check (addons_total >= 0),
  custom_quote            boolean not null default false,
  total_price             numeric(10,2) check (total_price >= 0),
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  -- Time range used by the overlap safety net. Null for date-less inquiries.
  during                  tstzrange generated always as (
                            case when starts_at is not null and ends_at is not null
                                 then tstzrange(starts_at, ends_at, '[)') end
                          ) stored,
  constraint bookings_contact_ck check (client_email is not null or client_phone is not null or client_messenger is not null),
  constraint bookings_time_pair_ck check ((starts_at is null) = (ends_at is null)),
  constraint bookings_time_ck check (ends_at is null or ends_at > starts_at),
  constraint bookings_dated_ck check (status = 'inquiry' or starts_at is not null),
  -- Safety net: two CONFIRMED bookings can never overlap, whatever code path is used.
  constraint bookings_no_overlap_confirmed exclude using gist (during with &&) where (status = 'confirmed')
);
create index idx_bookings_status    on public.bookings (status);
create index idx_bookings_starts_at on public.bookings (starts_at);
create index idx_bookings_category  on public.bookings (category_id);
create index idx_bookings_package   on public.bookings (package_id);
create trigger trg_bookings_updated before update on public.bookings
  for each row execute function public.set_updated_at();

-- Add-on lines chosen for a booking, with their own price snapshot.
create table public.booking_addons (
  id                  uuid primary key default gen_random_uuid(),
  booking_id          uuid not null references public.bookings (id) on delete cascade,
  addon_id            uuid references public.addons (id) on delete set null,
  name_snapshot       text not null,
  unit_price_snapshot numeric(10,2) not null check (unit_price_snapshot >= 0),
  quantity            numeric(4,1) not null default 1 check (quantity > 0),
  line_total          numeric(10,2) not null check (line_total >= 0)
);
create index idx_booking_addons_booking on public.booking_addons (booking_id);

-- Append-only log of status changes.
create table public.booking_status_history (
  id          uuid primary key default gen_random_uuid(),
  booking_id  uuid not null references public.bookings (id) on delete cascade,
  from_status text,
  to_status   text not null,
  changed_by  uuid references auth.users (id) on delete set null,
  changed_at  timestamptz not null default now(),
  note        text check (char_length(note) <= 500)
);
create index idx_booking_history_booking on public.booking_status_history (booking_id, changed_at);

-- Admin-made unavailable ranges (day off, personal commitment).
create table public.availability_blocks (
  id         uuid primary key default gen_random_uuid(),
  starts_at  timestamptz not null,
  ends_at    timestamptz not null,
  reason     text check (char_length(reason) <= 200),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  during     tstzrange generated always as (tstzrange(starts_at, ends_at, '[)')) stored,
  constraint availability_blocks_time_ck check (ends_at > starts_at)
);
create index idx_availability_blocks_during on public.availability_blocks using gist (during);

create table public.testimonials (
  id           uuid primary key default gen_random_uuid(),
  category_id  uuid references public.event_categories (id) on delete set null,
  quote        text not null check (char_length(quote) between 1 and 600),
  author       text not null check (char_length(author) between 1 and 120),
  is_published boolean not null default false,
  sort_order   integer not null default 0,
  created_at   timestamptz not null default now()
);
create index idx_testimonials_category on public.testimonials (category_id);

-- Key/value site content: contact links, stats, turnaround, buffer minutes.
create table public.site_settings (
  key        text primary key check (key ~ '^[a-z0-9_]+$'),
  value      jsonb not null,
  is_public  boolean not null default true,
  updated_at timestamptz not null default now()
);
create trigger trg_site_settings_updated before update on public.site_settings
  for each row execute function public.set_updated_at();