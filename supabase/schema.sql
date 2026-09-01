-- Feed canonical database schema for Supabase project dceneqgcvjikbrsqvzlt
-- Fresh setup: create the Supabase project, enable Auth/Google, then run this file.
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique,
  phone text,
  avatar_url text,
  is_admin boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.videos (
  id uuid primary key default gen_random_uuid(), youtube_id text not null unique,
  title text not null, thumbnail_url text not null, duration_seconds integer not null default 0 check(duration_seconds>=0),
  channel_title text, added_by uuid references public.profiles(id) on delete set null,
  view_count bigint not null default 0, like_count bigint not null default 0, dislike_count bigint not null default 0,
  share_count bigint not null default 0, comment_count bigint not null default 0, save_count bigint not null default 0,
  public_slug text not null unique, is_live boolean not null default false, live_start_time timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.user_follows (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  followed_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(), primary key(follower_id,followed_id), check(follower_id<>followed_id)
);
create table if not exists public.channel_follows (
  user_id uuid not null references public.profiles(id) on delete cascade, channel_title text not null,
  created_at timestamptz not null default now(), primary key(user_id,channel_title)
);
create table if not exists public.video_views (
  video_id uuid not null references public.videos(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  last_viewed_at timestamptz not null default now(), primary key(video_id,user_id)
);
create table if not exists public.watch_history (
  user_id uuid not null references public.profiles(id) on delete cascade,
  video_id uuid not null references public.videos(id) on delete cascade,
  watched_seconds integer not null default 0, completed boolean not null default false,
  last_watched_at timestamptz not null default now(), primary key(user_id,video_id)
);
create table if not exists public.saved_videos (
  video_id uuid not null references public.videos(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(), primary key(video_id,user_id)
);
create table if not exists public.video_reactions (
  video_id uuid not null references public.videos(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  reaction text not null check(reaction in('like','dislike')), created_at timestamptz not null default now(), primary key(video_id,user_id)
);
create table if not exists public.video_shares (
  video_id uuid not null references public.videos(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(), primary key(video_id,user_id)
);
create table if not exists public.video_comments (
  id uuid primary key default gen_random_uuid(), video_id uuid not null references public.videos(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check(char_length(trim(body)) between 1 and 2000), like_count bigint not null default 0,
  dislike_count bigint not null default 0, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.comment_reactions (
  comment_id uuid not null references public.video_comments(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  reaction text not null check(reaction in('like','dislike')), created_at timestamptz not null default now(), primary key(comment_id,user_id)
);

create index if not exists videos_created_at_idx on public.videos(created_at desc);
create index if not exists videos_added_by_created_at_idx on public.videos(added_by,created_at desc);
create index if not exists videos_added_by_views_idx on public.videos(added_by,view_count desc);
create index if not exists videos_live_idx on public.videos(is_live) where is_live=true;
create index if not exists user_follows_followed_idx on public.user_follows(followed_id);
create index if not exists user_follows_follower_idx on public.user_follows(follower_id);
create index if not exists watch_history_user_last_idx on public.watch_history(user_id,last_watched_at desc);
create index if not exists saved_videos_user_created_idx on public.saved_videos(user_id,created_at desc);
create index if not exists video_comments_video_created_idx on public.video_comments(video_id,created_at desc);
create index if not exists comment_reactions_comment_idx on public.comment_reactions(comment_id);
create index if not exists video_views_video_idx on public.video_views(video_id);

alter table public.profiles enable row level security;
alter table public.videos enable row level security;
alter table public.user_follows enable row level security;
alter table public.channel_follows enable row level security;
alter table public.video_views enable row level security;
alter table public.watch_history enable row level security;
alter table public.saved_videos enable row level security;
alter table public.video_reactions enable row level security;
alter table public.video_shares enable row level security;
alter table public.video_comments enable row level security;
alter table public.comment_reactions enable row level security;

-- Data API grants + RLS: public reads are limited to profile/video/comment discovery; personal activity stays user-scoped.
grant usage on schema public to anon, authenticated;
grant select on public.profiles,public.videos,public.video_comments,public.comment_reactions,public.user_follows to anon,authenticated;
grant select on public.watch_history,public.saved_videos,public.video_reactions,public.video_shares,public.video_views,public.channel_follows to authenticated;
grant update on public.profiles to authenticated;
grant insert,delete on public.user_follows to authenticated;
grant insert,update,delete on public.channel_follows to authenticated;

drop policy if exists profiles_public_select on public.profiles;
create policy profiles_public_select on public.profiles for select using(true);
drop policy if exists profiles_self_update on public.profiles;
create policy profiles_self_update on public.profiles for update to authenticated using(auth.uid()=id) with check(auth.uid()=id);
drop policy if exists videos_public_select on public.videos;
create policy videos_public_select on public.videos for select using(true);
drop policy if exists user_follows_public_select on public.user_follows;
create policy user_follows_public_select on public.user_follows for select using(true);
drop policy if exists user_follows_self_insert on public.user_follows;
create policy user_follows_self_insert on public.user_follows for insert to authenticated with check(auth.uid()=follower_id and follower_id<>followed_id);
drop policy if exists user_follows_self_delete on public.user_follows;
create policy user_follows_self_delete on public.user_follows for delete to authenticated using(auth.uid()=follower_id);
drop policy if exists channel_follows_self_select on public.channel_follows;
create policy channel_follows_self_select on public.channel_follows for select to authenticated using(auth.uid()=user_id);
drop policy if exists channel_follows_self_insert on public.channel_follows;
create policy channel_follows_self_insert on public.channel_follows for insert to authenticated with check(auth.uid()=user_id);
drop policy if exists channel_follows_self_delete on public.channel_follows;
create policy channel_follows_self_delete on public.channel_follows for delete to authenticated using(auth.uid()=user_id);
drop policy if exists watch_history_self_select on public.watch_history;
create policy watch_history_self_select on public.watch_history for select to authenticated using(auth.uid()=user_id);
drop policy if exists saved_videos_self_select on public.saved_videos;
create policy saved_videos_self_select on public.saved_videos for select to authenticated using(auth.uid()=user_id);
drop policy if exists video_reactions_self_select on public.video_reactions;
create policy video_reactions_self_select on public.video_reactions for select to authenticated using(auth.uid()=user_id);
drop policy if exists video_shares_self_select on public.video_shares;
create policy video_shares_self_select on public.video_shares for select to authenticated using(auth.uid()=user_id);
drop policy if exists comments_public_select on public.video_comments;
create policy comments_public_select on public.video_comments for select using(true);
drop policy if exists comment_reactions_public_select on public.comment_reactions;
create policy comment_reactions_public_select on public.comment_reactions for select using(true);
drop policy if exists video_views_self_select on public.video_views;
create policy video_views_self_select on public.video_views for select to authenticated using(auth.uid()=user_id);

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$
declare base text; candidate text;
begin
  base:=lower(regexp_replace(coalesce(new.raw_user_meta_data->>'user_name',new.raw_user_meta_data->>'name',split_part(coalesce(new.email,'user'),'@',1)),'[^a-zA-Z0-9_]+','','g'));
  if base='' then base:='user'; end if;
  candidate:=left(base,24)||'_'||substr(replace(new.id::text,'-',''),1,6);
  insert into public.profiles(id,username,avatar_url) values(new.id,candidate,new.raw_user_meta_data->>'avatar_url') on conflict(id) do nothing;
  return new;
end; $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create or replace function public.set_updated_at() returns trigger language plpgsql security invoker as $$ begin new.updated_at=now(); return new; end; $$;
drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles for each row execute function public.set_updated_at();
drop trigger if exists videos_set_updated_at on public.videos;
create trigger videos_set_updated_at before update on public.videos for each row execute function public.set_updated_at();
drop trigger if exists comments_set_updated_at on public.video_comments;
create trigger comments_set_updated_at before update on public.video_comments for each row execute function public.set_updated_at();


-- Ensure the foreign key constraint exists on video_comments referencing profiles
ALTER TABLE video_comments
  DROP CONSTRAINT IF EXISTS video_comments_user_id_fkey;

ALTER TABLE video_comments
  ADD CONSTRAINT video_comments_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES profiles(id)
  ON DELETE CASCADE;

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';