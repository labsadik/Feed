import React, { useState } from 'react';
import { X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { parseYouTubeId, thumbnailFor } from '../youtube';

type Meta = { youtube_id:string; title:string; channel_title:string; thumbnail_url:string; duration_seconds:number; is_live:boolean; live_start_time:string|null };

type Props = { open:boolean; onClose:()=>void; onSaved?:()=>void };

export default function AddVideoModal({ open, onClose, onSaved }: Props) {
  const [id, setId] = useState('');
  const [meta, setMeta] = useState<Meta|null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  if (!open) return null;

  const preview = async () => {
    setBusy(true); setError(''); setMeta(null);
    try {
      const youtube_id = parseYouTubeId(id);
      if (!youtube_id) throw new Error('Enter a valid YouTube video ID or URL.');
      const { data, error: fnError } = await supabase.functions.invoke('youtube-public-info', { body:{ youtube_ids:[youtube_id] } });
      if (fnError) throw new Error(fnError.message || 'Metadata request failed.');
      const item = (data?.videos || [])[0] as Meta|undefined;
      if (!item) throw new Error('YouTube video could not be resolved.');
      setMeta(item);
    } catch (e:any) { setError(e?.message || 'Could not load the video.'); }
    finally { setBusy(false); }
  };

  const save = async () => {
    if (!meta) return;
    setBusy(true); setError('');
    try {
      const { data, error: fnError } = await supabase.functions.invoke('feed-actions', { body:{ action:'admin_add_video', youtube_id:meta.youtube_id } });
      if (fnError) throw new Error(fnError.message || 'Unable to add video.');
      if (data?.error) throw new Error(data.error);
      setId(''); setMeta(null); onSaved?.(); onClose();
    } catch (e:any) { setError(e?.message || 'Unable to add video.'); }
    finally { setBusy(false); }
  };

  return <div className="fixed inset-0 z-[200] grid place-items-center bg-black/55 p-4 backdrop-blur-sm" onClick={() => !busy && onClose()}>
    <div className="w-full max-w-xl overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-zinc-950" onClick={e=>e.stopPropagation()}>
      <div className="flex items-center justify-between border-b border-black/5 px-5 py-4 dark:border-white/10"><h2 className="text-lg font-black">Add video</h2><button className="icon-btn" onClick={onClose} disabled={busy} aria-label="Close"><X size={18}/></button></div>
      <div className="p-5">
        <div className="flex gap-2"><input value={id} onChange={e=>setId(e.target.value)} onKeyDown={e=>e.key==='Enter'&&preview()} placeholder="YouTube video ID" className="min-w-0 flex-1 rounded-2xl border border-black/10 bg-black/[.03] px-4 py-3 outline-none dark:border-white/10 dark:bg-white/[.04]"/><button className="primary-btn" disabled={busy} onClick={preview}>{busy?'Checking…':'Preview'}</button></div>
        {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
        {meta && <div className="mt-5 overflow-hidden rounded-2xl border border-black/5 dark:border-white/10"><img src={meta.thumbnail_url || thumbnailFor(meta.youtube_id)} className="aspect-video w-full object-cover" alt=""/><div className="space-y-1 p-4"><h3 className="font-bold">{meta.title}</h3><p className="text-sm opacity-60">YouTube channel · {meta.channel_title}</p><p className="text-sm opacity-60">{meta.is_live ? 'LIVE' : meta.duration_seconds ? `${Math.floor(meta.duration_seconds/60)}:${String(meta.duration_seconds%60).padStart(2,'0')}` : 'Duration will be read from player'}</p></div><button className="primary-btn m-4 w-[calc(100%-2rem)] justify-center" onClick={save} disabled={busy}>{busy?'Adding…':'Add to feed'}</button></div>}
      </div>
    </div>
  </div>;
}
