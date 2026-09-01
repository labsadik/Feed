import { supabase } from './lib/supabase';

export function parseYouTubeId(input: string): string | null {
  const value = input.trim();
  if (/^[A-Za-z0-9_-]{11}$/.test(value)) return value;
  try {
    const url = new URL(value);
    if (url.hostname === 'youtu.be') return url.pathname.slice(1).split('/')[0] || null;
    if (url.hostname.endsWith('youtube.com')) {
      if (url.pathname === '/watch') return url.searchParams.get('v');
      if (url.pathname.startsWith('/shorts/')) return url.pathname.split('/')[2] || null;
      if (url.pathname.startsWith('/embed/')) return url.pathname.split('/')[2] || null;
    }
  } catch {
    return null;
  }
  return null;
}

export function thumbnailFor(id: string) {
  return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
}

export function formatDuration(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) return '--:--';
  const total = Math.floor(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return h
    ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    : `${m}:${String(s).padStart(2, '0')}`;
}

export async function resolveYouTubeMetadata(input: string) {
  const normalized = parseYouTubeId(input);
  if (!normalized) throw new Error('Enter the 11-character YouTube video ID.');

  const { data, error } = await supabase.functions.invoke('youtube-oembed-metadata', {
    body: { youtubeId: normalized },
  });

  if (error) throw new Error(error.message || 'Could not resolve this YouTube video.');
  if (!data?.youtube_id || !data?.title) {
    throw new Error(data?.error || 'This YouTube video could not be resolved.');
  }

  return data as {
    youtube_id: string;
    title: string;
    thumbnail_url: string;
    channel_title: string;
    duration_seconds: number;
  };
}
