# Supabase setup (Phase B)

All four files in `supabase/migrations/` must be run **in this order**, once each.

## 0. Only if you already ran the OLDER files (the 8,000 / 14,000 / 24,000 version)
The tables changed, so wipe the old ones first. This deletes everything in these tables, which is fine on a brand-new project. In SQL Editor run:
```sql
drop table if exists public.booking_addons, public.booking_status_history, public.availability_blocks,
  public.bookings, public.package_included_addons, public.addons, public.packages, public.portfolio_images,
  public.portfolio_projects, public.testimonials, public.site_settings, public.event_categories,
  public.admin_users cascade;
do $$ declare r record; begin
  for r in select oid::regprocedure as f from pg_proc where pronamespace = 'public'::regnamespace loop
    execute 'drop function if exists ' || r.f || ' cascade';
  end loop;
end $$;
```
Then continue with step 2. If you have not run anything yet, skip this section.

## 1. Create the project (manual, in the browser)
1. Go to https://supabase.com and sign in. Click **New project**.
2. Name: `everframe`. Choose a strong database password and save it in a password manager (not in this repo). Region: the closest one to the Philippines (Singapore).
3. Wait until the project finishes starting (about 2 minutes).
4. Turn off public sign-ups: **Authentication**, then **Sign In / Providers**, then switch off **Allow new users to sign up**. (Menu names can change; if you cannot find it, tell me what you see.)

## 2. Run the migrations (manual, in the browser)
Open **SQL Editor**, click **New query**, paste the full contents of one file, click **Run**. Repeat for each file in order:

| Order | File | Expected result |
|---|---|---|
| 1 | `20261016000001_schema.sql` | "Success. No rows returned" |
| 2 | `20261016000002_functions.sql` | "Success. No rows returned" |
| 3 | `20261016000003_rls.sql` | "Success. No rows returned" |
| 4 | `20261016000004_seed.sql` | "Success. No rows returned" |

If one fails, stop and send me the exact error text and the file name. Do not run the later files.

## 3. Verify the tables
In **Table Editor** you should see 12 tables: `addons`, `admin_users`, `availability_blocks`, `booking_addons`, `booking_status_history`, `bookings`, `event_categories`, `packages`, `portfolio_images`, `portfolio_projects`, `site_settings`, `testimonials`. Each should show that Row Level Security is enabled.

In SQL Editor run:
```sql
select service_type, name, price, max_hours, extra_hour_rate from public.packages order by sort_order;
```
Expected 7 rows: photo Basic Events 3500, photo Any Events 4500, video Basic 3500, Standard 5000, Premium 7000, photo_video Standard 8000, Premium 11000.

## 4. Create the first administrator (manual)
1. **Authentication**, then **Users**, then **Add user**, then **Create new user**. Enter your email and a strong password. Tick **Auto Confirm User**.
2. In **SQL Editor** run this, replacing the email with the one you just used:
```sql
insert into public.admin_users (user_id, display_name)
select id, 'Owner' from auth.users where email = 'YOUR-EMAIL@example.com';
```
Expected: "Success. 1 row affected" (or similar). If it says 0 rows, the email does not match.

Nobody else can become an administrator: there is no sign-up, and no screen or API can write to `admin_users`.

## 5. Keys for `.env.local` (later phases)
**Project Settings**, then **API** (or **Connect**). You need the **Project URL** and the **publishable** (older projects: `anon`) key. These two go in `.env.local` as `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
The **secret** (older: `service_role`) key is server-only: put it in `.env.local` as `SUPABASE_SERVICE_ROLE_KEY` and later in Vercel. Never paste it in chat, never commit it.

## What was tested
`supabase/tests/001_rules_and_security.sql` passed on a local PostgreSQL test database with stand-in Supabase roles. It covers visitors, a signed-in non-admin and an admin, plus price snapshots, buffer time, blocks, and the overlap safety net. A 30-round parallel test confirmed two overlapping bookings at once: exactly one succeeded each time. Supabase's own Auth and API layers were not part of these tests; they get tested in Phase C when the app connects.