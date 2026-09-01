import { supabase } from './supabase';

export type Profile = {
  id: string;
  username: string;
  avatar_url?: string | null;
  is_admin?: boolean;
};

export type Video = {
  id: string;
  public_slug: string;
  youtube_id: string;
  title: string;
  thumbnail_url: string;
  duration_seconds: number;
  channel_title?: string | null;
  added_by?: string | null;
  view_count: number;
  like_count: number;
  dislike_count: number;
  save_count: number;
  share_count: number;
  comment_count: number;
  created_at: string;
  is_live?: boolean;
  live_start_time?: string | null;
  author?: Profile | null;
};

export type Comment = {
  id: string;
  video_id: string;
  user_id: string;
  body: string;
  like_count: number;
  dislike_count: number;
  created_at: string;
  profile?: Profile | null;
};

export type PublicInfo = {
  youtube_id: string;
  title: string;
  channel_title: string;
  thumbnail_url: string;
  duration_seconds: number;
  is_live: boolean;
  live_start_time: string | null;
};

const PROFILE_FIELDS = 'id,username,avatar_url,is_admin';

/** Calls the `feed-actions` edge function (all authenticated mutations live there). */
export async function server<T = any>(action: string, body: Record<string, unknown> = {}): Promise<T> {
  const { data, error } = await supabase.functions.invoke('feed-actions', { body: { action, ...body } });
  if (error) throw new Error(error.message || 'Request failed.');
  if (data?.error) throw new Error(data.error);
  return data as T;
}

/** Live/duration/title refresh straight from YouTube (public, unauthenticated). */
export async function publicInfo(ids: string[], timeoutMs = 6000): Promise<PublicInfo[]> {
  const unique = [...new Set(ids.filter(Boolean))];
  if (!unique.length) return [];
  try {
    const request = supabase.functions.invoke('youtube-public-info', { body: { youtube_ids: unique } });
    const result = await Promise.race([
      request,
      new Promise<null>((resolve) => setTimeout(() => resolve(null), timeoutMs)),
    ]);
    return ((result as any)?.data?.videos || []) as PublicInfo[];
  } catch {
    return [];
  }
}

export async function attachAuthors(rows: Video[]): Promise<Video[]> {
  const ids = [...new Set(rows.map((v) => v.added_by).filter(Boolean) as string[])];
  if (!ids.length) return rows;
  const { data } = await supabase.from('profiles').select(PROFILE_FIELDS).in('id', ids);
  const map = new Map((data || []).map((p: any) => [p.id, p as Profile]));
  return rows.map((v) => ({ ...v, author: v.added_by ? map.get(v.added_by) || null : null }));
}

export function mergeInfo(rows: Video[], info: PublicInfo[]): Video[] {
  const map = new Map(info.map((i) => [i.youtube_id, i]));
  return rows.map((v) => {
    const i = map.get(v.youtube_id);
    if (!i) return v;
    return {
      ...v,
      title: i.title || v.title,
      thumbnail_url: i.thumbnail_url || v.thumbnail_url,
      channel_title: i.channel_title || v.channel_title,
      duration_seconds: i.duration_seconds || v.duration_seconds,
      is_live: i.is_live,
      live_start_time: i.live_start_time,
    };
  });
}

/** Full pipeline used by every listing page: authors + fresh YouTube metadata. */
export async function hydrate(rows: Video[]): Promise<Video[]> {
  const withAuthors = await attachAuthors(rows);
  const info = await publicInfo(withAuthors.map((v) => v.youtube_id));
  return mergeInfo(withAuthors, info);
}

export async function fetchVideos(options: { search?: string; limit?: number } = {}) {
  let query = supabase
    .from('videos')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(options.limit ?? 60);
  if (options.search) query = query.ilike('title', `%${options.search}%`);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return hydrate((data || []) as Video[]);
}

export async function fetchVideoBySlug(slug: string) {
  const { data, error } = await supabase.from('videos').select('*').eq('public_slug', slug).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error('Video not found.');
  return (await hydrate([data as Video]))[0];
}

export async function fetchRelated(excludeId: string, limit = 24) {
  const { data } = await supabase
    .from('videos')
    .select('*')
    .neq('id', excludeId)
    .order('created_at', { ascending: false })
    .limit(limit);
  return attachAuthors((data || []) as Video[]);
}

export async function fetchComments(videoId: string): Promise<Comment[]> {
  const { data } = await supabase
    .from('video_comments')
    .select('*')
    .eq('video_id', videoId)
    .order('created_at', { ascending: false });
  const rows = (data || []) as Comment[];
  const ids = [...new Set(rows.map((c) => c.user_id))];
  if (!ids.length) return rows;
  const { data: profiles } = await supabase.from('profiles').select(PROFILE_FIELDS).in('id', ids);
  const map = new Map((profiles || []).map((p: any) => [p.id, p as Profile]));
  return rows.map((c) => ({ ...c, profile: map.get(c.user_id) || null }));
}

export async function fetchProfileByUsername(username: string) {
  // Decodes %20 to spaces and strips 'profile@', 'u@', or leading '@'
  const decoded = decodeURIComponent(username);
  const clean = decoded.replace(/^(profile@|u@|@)/i, '').trim();
  if (!clean) return null;

  // Double quotes wrap values with spaces so PostgREST parses them correctly
  const { data, error } = await supabase
    .from('profiles')
    .select(PROFILE_FIELDS)
    .or(`username.ilike."${clean}",username.ilike."@${clean}"`)
    .maybeSingle();

  if (error) {
    console.error('Error fetching profile:', error.message);
    return null;
  }

  return (data as Profile | null) || null;
}

export async function fetchFollowCounts(profileId: string) {
  const [{ count: followers }, { count: following }] = await Promise.all([
    supabase.from('user_follows').select('*', { count: 'exact', head: true }).eq('followed_id', profileId),
    supabase.from('user_follows').select('*', { count: 'exact', head: true }).eq('follower_id', profileId),
  ]);
  return { followers: followers || 0, following: following || 0 };
}

export async function fetchVideosByAuthor(profileId: string) {
  const { data } = await supabase
    .from('videos')
    .select('*')
    .eq('added_by', profileId)
    .order('created_at', { ascending: false });
  return hydrate((data || []) as Video[]);
}

/** watch_history / saved_videos are user-scoped by RLS, so no filter needed. */
export async function fetchLibrary(table: 'watch_history' | 'saved_videos') {
  const orderColumn = table === 'watch_history' ? 'last_watched_at' : 'created_at';
  const { data } = await supabase.from(table).select('*').order(orderColumn, { ascending: false });
  const ids = (data || []).map((row: any) => row.video_id as string);
  if (!ids.length) return [] as Video[];
  const { data: videos } = await supabase.from('videos').select('*').in('id', ids);
  const rows = (videos || []) as Video[];
  const order = new Map(ids.map((id, index) => [id, index]));
  rows.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
  return hydrate(rows);
}

export async function fetchFollowingFeed(userId: string) {
  const { data } = await supabase
    .from('user_follows')
    .select('followed_id')
    .eq('follower_id', userId)
    .order('created_at', { ascending: false });
  const ids = (data || []).map((row: any) => row.followed_id as string);
  if (!ids.length) return { creators: [] as Profile[], videos: [] as Video[] };
  const [{ data: creators }, { data: videos }] = await Promise.all([
    supabase.from('profiles').select(PROFILE_FIELDS).in('id', ids),
    supabase.from('videos').select('*').in('added_by', ids).order('created_at', { ascending: false }).limit(60),
  ]);
  return {
    creators: (creators || []) as Profile[],
    videos: await hydrate((videos || []) as Video[]),
  };
}