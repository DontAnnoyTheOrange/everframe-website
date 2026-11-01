-- Everframe Productions: migration 008.
-- Portfolio projects can be marked "featured" (shown larger, and first on the homepage) and can have
-- a video link (YouTube, Vimeo or Facebook). Nothing existing changes. Run once, after 001-007,
-- BEFORE deploying the matching website code.

alter table public.portfolio_projects
  add column if not exists is_featured boolean not null default false,
  add column if not exists video_url text;

-- A video link is optional, must be https and short. The website checks the host as well.
alter table public.portfolio_projects
  drop constraint if exists portfolio_projects_video_url_ck;
alter table public.portfolio_projects
  add constraint portfolio_projects_video_url_ck
  check (video_url is null or (char_length(video_url) <= 300 and video_url ~ '^https://'));