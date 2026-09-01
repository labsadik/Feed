import React, { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Loader2, MessageSquare, Pencil, Plus, Trash2, X } from 'lucide-react';
import { fetchVideos, server, type Video, type Comment } from '../lib/api';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { compact, timeAgo } from '../lib/format';
import { formatDuration, thumbnailFor } from '../youtube';
import AddVideoModal from '../components/AddVideoModal';
import { EmptyState } from '../components/VideoCard';

function CommentsModal({
  video,
  onClose,
}: {
  video: Video | null;
  onClose: () => void;
}) {
  if (!video) return null;

  const [comments, setComments] = useState<(Comment & { profile?: { username: string; avatar_url?: string } })[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    setLoading(true);
    supabase
      .from('video_comments')
      .select('*, profile:profiles(username, avatar_url)')
      .eq('video_id', video.id)
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (!alive) return;
        if (error) setError(error.message);
        else setComments(data || []);
        setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [video.id]);

  const deleteComment = async (commentId: string) => {
    if (!window.confirm('Delete this comment?')) return;
    try {
      const { error } = await supabase.from('video_comments').delete().eq('id', commentId);
      if (error) throw error;
      setComments((prev) => prev.filter((c) => c.id !== commentId));
    } catch (e: any) {
      alert(e?.message || 'Failed to delete comment.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-xl rounded-xl bg-white p-6 shadow-xl dark:bg-gray-900 max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between border-b pb-3 dark:border-gray-800">
          <div>
            <h2 className="text-lg font-bold">Comments for Video</h2>
            <p className="text-xs text-gray-500 truncate max-w-md">{video.title}</p>
          </div>
          <button onClick={onClose} className="p-1 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
            <X size={20} />
          </button>
        </div>

        <div className="mt-4 flex-1 overflow-y-auto space-y-3 pr-1">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 size={24} className="animate-spin text-gray-400" />
            </div>
          ) : error ? (
            <p className="text-sm text-red-500">{error}</p>
          ) : comments.length ? (
            comments.map((comment) => (
              <div key={comment.id} className="flex items-start justify-between gap-3 rounded-lg border p-3 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                      @{comment.profile?.username || 'unknown'}
                    </span>
                    <span className="text-[10px] text-gray-400">{timeAgo(comment.created_at)}</span>
                  </div>
                  <p className="mt-1 text-sm text-gray-800 dark:text-gray-200 break-words">{comment.body}</p>
                </div>
                <button
                  onClick={() => deleteComment(comment.id)}
                  className="text-gray-400 hover:text-red-500 p-1"
                  title="Delete comment"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))
          ) : (
            <p className="text-center text-sm text-gray-500 py-8">No comments on this video yet.</p>
          )}
        </div>

        <div className="mt-4 border-t pt-3 flex justify-end dark:border-gray-800">
          <button
            onClick={onClose}
            className="rounded-md border px-4 py-2 text-sm hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function EditVideoModal({
  video,
  onClose,
  onSaved,
}: {
  video: Video | null;
  onClose: () => void;
  onSaved: (updatedVideo: Video) => void;
}) {
  if (!video) return null;

  const [title, setTitle] = useState(video.title);
  const [youtubeId, setYoutubeId] = useState(video.youtube_id);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setTitle(video.title);
    setYoutubeId(video.youtube_id);
  }, [video]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !youtubeId.trim()) return;

    setSaving(true);
    setError('');

    try {
      await server('admin_update_video', {
        video_id: video.id,
        title: title.trim(),
        youtube_id: youtubeId.trim(),
      });
      onSaved({
        ...video,
        title: title.trim(),
        youtube_id: youtubeId.trim(),
      });
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to update video details.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl dark:bg-gray-900">
        <div className="flex items-center justify-between border-b pb-3 dark:border-gray-800">
          <h2 className="text-lg font-bold">Edit Video Metadata</h2>
          <button onClick={onClose} className="p-1 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={save} className="mt-4 space-y-4">
          <label className="block">
            <span className="text-sm font-medium">Video Title (Editable)</span>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 w-full rounded-md border p-2 text-sm dark:border-gray-700 dark:bg-gray-800"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium">YouTube Video ID (Editable)</span>
            <input
              type="text"
              required
              value={youtubeId}
              onChange={(e) => setYoutubeId(e.target.value)}
              className="mt-1 w-full rounded-md border p-2 text-sm dark:border-gray-700 dark:bg-gray-800"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium">Published By User ID (Read-only)</span>
            <input
              type="text"
              disabled
              value={video.added_by || 'Unknown / System'}
              className="mt-1 w-full rounded-md border bg-gray-100 p-2 text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-800"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium">YouTube Channel Title</span>
            <input
              type="text"
              disabled
              value={video.channel_title || 'N/A'}
              className="mt-1 w-full rounded-md border bg-gray-100 p-2 text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-800"
            />
          </label>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border px-4 py-2 text-sm hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="primary-btn flex items-center gap-2 rounded-md px-4 py-2 text-sm"
            >
              {saving && <Loader2 size={16} className="animate-spin" />} Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Admin() {
  const { profile, ready } = useAuth();
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState('');
  const [open, setOpen] = useState(false);
  const [editingVideo, setEditingVideo] = useState<Video | null>(null);
  const [viewingCommentsVideo, setViewingCommentsVideo] = useState<Video | null>(null);
  const [error, setError] = useState('');

  const load = () => {
    if (!profile?.id) return;
    setLoading(true);
    fetchVideos({ limit: 200 })
      .then((allVideos) => {
        const myVideos = allVideos.filter((video) => video.added_by === profile.id);
        setVideos(myVideos);
      })
      .catch((e: any) => setError(e?.message || 'Could not load videos.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (ready && profile?.is_admin) {
      load();
    }
  }, [ready, profile?.id]);

  if (!ready) return <div className="page"><p className="muted">Checking access…</p></div>;
  if (!profile?.is_admin) return <Navigate to="/" replace />;

  const remove = async (video: Video) => {
    if (!window.confirm(`Delete “${video.title}”?`)) return;
    setBusyId(video.id);
    try {
      await server('admin_delete_video', { video_id: video.id });
      setVideos((rows) => rows.filter((r) => r.id !== video.id));
    } catch (e: any) {
      setError(e?.message || 'Delete failed.');
    } finally {
      setBusyId('');
    }
  };

  const totals = videos.reduce(
    (acc, v) => ({
      views: acc.views + Number(v.view_count || 0),
      likes: acc.likes + Number(v.like_count || 0),
      comments: acc.comments + Number(v.comment_count || 0),
    }),
    { views: 0, likes: 0, comments: 0 },
  );

  return (
    <div className="page">
      <header className="page-head admin-head">
        <div>
          <p className="eyebrow">Admin Dashboard</p>
          <h1>My Published Videos</h1>
          <p className="page-sub">Manage content uploaded to your channel.</p>
        </div>
        <button className="primary-btn" onClick={() => setOpen(true)}>
          <Plus size={16} /> Add video
        </button>
      </header>

      <div className="stat-grid">
        <div className="stat-card"><span>My Videos</span><strong>{compact(videos.length)}</strong></div>
        <div className="stat-card"><span>Total Views</span><strong>{compact(totals.views)}</strong></div>
        <div className="stat-card"><span>Total Likes</span><strong>{compact(totals.likes)}</strong></div>
        <div className="stat-card"><span>Total Comments</span><strong>{compact(totals.comments)}</strong></div>
      </div>

      {error && <p className="auth-error">{error}</p>}

      {loading ? (
        <p className="muted">Loading videos…</p>
      ) : videos.length ? (
        <div className="admin-table">
          {videos.map((video) => (
            <div className="admin-row" key={video.id}>
              <Link to={`/watch/${video.public_slug}`} className="admin-thumb">
                <img src={video.thumbnail_url || thumbnailFor(video.youtube_id)} alt="" loading="lazy" />
              </Link>
              <div className="min-w-0 flex-1">
                <Link to={`/watch/${video.public_slug}`} className="admin-title">{video.title}</Link>
                <p className="muted flex items-center gap-2 flex-wrap">
                  <span>{video.is_live ? 'LIVE' : formatDuration(video.duration_seconds || 0)}</span> ·{' '}
                  <span>{compact(video.view_count)} views</span> ·{' '}
                  <span>{compact(video.like_count)} likes</span> ·{' '}
                  <button
                    onClick={() => setViewingCommentsVideo(video)}
                    className="text-primary hover:underline inline-flex items-center gap-1 font-medium"
                  >
                    <MessageSquare size={13} /> {video.comment_count || 0} comments
                  </button> ·{' '}
                  <span>{timeAgo(video.created_at)}</span>
                </p>
              </div>
              <div className="admin-actions">
                <button className="icon-btn" onClick={() => setEditingVideo(video)} disabled={busyId === video.id} aria-label="Edit Details">
                  {busyId === video.id ? <Loader2 size={16} className="animate-spin" /> : <Pencil size={16} />}
                </button>
                <button className="icon-btn danger" onClick={() => remove(video)} disabled={busyId === video.id} aria-label="Delete">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState title="No videos published" hint="You have not added any videos to your channel yet." />
      )}

      <AddVideoModal open={open} onClose={() => setOpen(false)} onSaved={load} />

      <EditVideoModal
        video={editingVideo}
        onClose={() => setEditingVideo(null)}
        onSaved={(updated) =>
          setVideos((rows) => rows.map((r) => (r.id === updated.id ? updated : r)))
        }
      />

      <CommentsModal
        video={viewingCommentsVideo}
        onClose={() => setViewingCommentsVideo(null)}
      />
    </div>
  );
}