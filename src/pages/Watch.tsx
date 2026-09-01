import React, { FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { MediaPlayer, MediaProvider, useMediaState } from '@vidstack/react';
import { defaultLayoutIcons, DefaultVideoLayout } from '@vidstack/react/player/layouts/default';
import { Bookmark, MessageCircle, Share2, ThumbsDown, ThumbsUp, Trash2 } from 'lucide-react';

// Vidstack Player Styles
import '@vidstack/react/player/styles/default/theme.css';
import '@vidstack/react/player/styles/default/layouts/video.css';

import {
  fetchComments,
  fetchRelated,
  fetchVideoBySlug,
  server,
  type Comment,
  type Video,
} from '../lib/api';
import { useAuth } from '../hooks/useAuth';
import { avatarFor, compact, fullNumber, timeAgo } from '../lib/format';
import { formatDuration, thumbnailFor } from '../youtube';
import { EmptyState, LiveBadge, VideoRow } from '../components/VideoCard';
import FollowButton from '../components/FollowButton';

function Telemetry({
  enabled,
  onDuration,
  onProgress,
}: {
  enabled: boolean;
  onDuration: (value: number) => void;
  onProgress: (current: number, duration: number) => void;
}) {
  const duration = useMediaState('duration');
  const current = useMediaState('currentTime');

  useEffect(() => {
    if (duration > 0) onDuration(duration);
  }, [duration, onDuration]);

  useEffect(() => {
    if (!enabled || current <= 0) return;
    const timer = window.setTimeout(() => onProgress(current, duration), 200);
    return () => window.clearTimeout(timer);
  }, [Math.floor(current / 5), enabled, duration, current, onProgress]);

  return null;
}

export default function Watch() {
  const { slug = '' } = useParams();
  const { session, profile } = useAuth();
  const navigate = useNavigate();
  const [video, setVideo] = useState<Video | null>(null);
  const [related, setRelated] = useState<Video[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [body, setBody] = useState('');
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  // SEO: Update browser tab title dynamically
  useEffect(() => {
    if (video?.title) {
      document.title = `${video.title} - Feed`;
    } else {
      document.title = 'Watch - Feed';
    }

    return () => {
      document.title = 'Feed';
    };
  }, [video?.title]);

  useEffect(() => {
    let alive = true;
    setVideo(null);
    setError('');
    (async () => {
      try {
        const row = await fetchVideoBySlug(slug);
        if (!alive) return;
        setVideo(row);
        setDuration(row.duration_seconds || 0);
        const [rel, cms] = await Promise.all([fetchRelated(row.id), fetchComments(row.id)]);
        if (!alive) return;
        setRelated(rel);
        setComments(cms);
        if (session) {
          try {
            const result = await server('register_view', { video_id: row.id });
            if (alive) setVideo((v) => (v ? { ...v, view_count: Number(result.view_count ?? v.view_count) } : v));
          } catch {
            /* view counting is best effort */
          }
        }
      } catch (e: unknown) {
        if (alive) setError(e instanceof Error ? e.message : 'Video not found.');
      }
    })();
    return () => {
      alive = false;
    };
  }, [slug, session?.user?.id]);

  const requireAuth = () => {
    if (session) return true;
    navigate('/login');
    return false;
  };

  const saveDuration = async (value: number) => {
    if (!video) return;
    const rounded = Math.round(value);
    if (!rounded || rounded === duration) return;
    if (!session) {
      setDuration(rounded);
      setVideo((v) => (v ? { ...v, duration_seconds: rounded } : v));
      return;
    }

    setDuration(rounded);
    setVideo((v) => (v ? { ...v, duration_seconds: rounded } : v));
    try {
      await server('set_duration', { video_id: video.id, duration_seconds: rounded });
    } catch {
      /* ignore */
    }
  };

  const trackProgress = async (current: number, mediaDuration: number) => {
    if (!video || !session) return;
    try {
      await server('watch_progress', {
        video_id: video.id,
        seconds: Math.floor(current),
        duration: Math.floor(mediaDuration || duration),
      });
    } catch {
      /* ignore */
    }
  };

  const react = async (reaction: 'like' | 'dislike') => {
    if (!video || !requireAuth()) return;
    const result = await server('video_reaction', { video_id: video.id, reaction });
    setVideo((v) => (v ? { ...v, like_count: Number(result.like_count), dislike_count: Number(result.dislike_count) } : v));
  };

  const save = async () => {
    if (!video || !requireAuth()) return;
    const result = await server('save_video', { video_id: video.id });
    setVideo((v) => (v ? { ...v, save_count: Number(result.save_count) } : v));
    setNotice(result.saved === false ? 'Removed from saved' : 'Saved to your library');
  };

  const share = async () => {
    if (!video) return;
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: video.title, url });
      else {
        await navigator.clipboard?.writeText(url);
        setNotice('Link copied');
      }
    } catch {
      /* user dismissed the share sheet */
    }
    if (!session) return;
    try {
      const result = await server('share_video', { video_id: video.id });
      setVideo((v) => (v ? { ...v, share_count: Number(result.share_count) } : v));
    } catch {
      /* ignore */
    }
  };

  const addComment = async (event: FormEvent) => {
    event.preventDefault();
    if (!video || !requireAuth() || !body.trim()) return;
    try {
      const result = await server('comment_add', { video_id: video.id, body: body.trim() });
      setComments((rows) => [{ ...result.comment, profile }, ...rows]);
      setBody('');
      setVideo((v) => (v ? { ...v, comment_count: Number(result.comment_count) } : v));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not post comment.');
    }
  };

  const deleteComment = async (comment: Comment) => {
    if (!video) return;
    try {
      const result = await server('comment_delete', { comment_id: comment.id });
      setComments((rows) => rows.filter((c) => c.id !== comment.id));
      setVideo((v) => (v ? { ...v, comment_count: Number(result?.comment_count ?? Math.max(0, v.comment_count - 1)) } : v));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not delete comment.');
    }
  };

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(''), 2200);
    return () => window.clearTimeout(timer);
  }, [notice]);

  if (error) {
    return (
      <div className="page">
        <EmptyState title="Video unavailable" hint={error} action={<Link className="secondary-btn mt-4" to="/">Back to feed</Link>} />
      </div>
    );
  }

  if (!video) {
    return (
      <div className="watch-layout">
        <div>
          <div className="skeleton skeleton-player" />
          <div className="skeleton skeleton-line w-3/4 mt-5" />
          <div className="skeleton skeleton-line w-1/3" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div className="skeleton skeleton-row" key={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="watch-layout">
      <section className="min-w-0">
        <div className="player-frame">
          <MediaPlayer
            key={video.youtube_id}
            className="player"
            src={`youtube/${video.youtube_id}`}
            title={video.title}
            poster={video.thumbnail_url || thumbnailFor(video.youtube_id)}
            aspectRatio="16/9"
            load="visible"
            playsInline
          >
            <MediaProvider />
            <DefaultVideoLayout icons={defaultLayoutIcons} />
            <Telemetry enabled={!!session} onDuration={saveDuration} onProgress={trackProgress} />
          </MediaPlayer>
        </div>

        <h1 className="watch-title">{video.title}</h1>
        <p className="watch-stats">
          {fullNumber(video.view_count)} views · {timeAgo(video.created_at)}
          {video.is_live ? ' · ' : duration > 0 ? ` · ${formatDuration(duration)}` : ''}
          {video.is_live && <LiveBadge video={video} />}
        </p>

        <div className="watch-bar">
          {video.author ? (
            <div className="author-block">
              <Link to={`/profile@${encodeURIComponent(video.author.username)}`} className="author-link">
                <img className="avatar avatar-lg" src={avatarFor(video.author)} alt="" />
                <span>
                  <strong>@{video.author.username}</strong>
                  <small>{video.channel_title || 'YouTube'}</small>
                </span>
              </Link>
              <FollowButton target={video.author} />
            </div>
          ) : (
            <div className="author-block">
              <img className="avatar avatar-lg" src={avatarFor(null)} alt="" />
              <span className="opacity-60 text-sm">Creator unavailable</span>
            </div>
          )}

          <div className="action-row">
            <div className="action-pair">
              <button className="action-btn" onClick={() => react('like')}>
                <ThumbsUp size={17} />
                {compact(video.like_count)}
              </button>
              <button className="action-btn" onClick={() => react('dislike')}>
                <ThumbsDown size={17} />
                {compact(video.dislike_count)}
              </button>
            </div>
            <button className="action-btn" onClick={save}>
              <Bookmark size={17} />
              {compact(video.save_count)}
            </button>
            <button className="action-btn" onClick={share}>
              <Share2 size={17} />
              {compact(video.share_count)}
            </button>
          </div>
        </div>

        {notice && <p className="notice">{notice}</p>}

        <section className="comments">
          <h2 className="section-title">
            <MessageCircle size={18} /> {fullNumber(video.comment_count)} comments
          </h2>
          <form className="comment-form" onSubmit={addComment}>
            <img className="avatar" src={avatarFor(profile)} alt="" />
            <input
              value={body}
              onChange={(event) => setBody(event.target.value)}
              placeholder={session ? 'Add a comment…' : 'Sign in to comment'}
              disabled={!session}
            />
            <button className="primary-btn" disabled={!session || !body.trim()}>
              Post
            </button>
          </form>
          <div className="comment-list">
            {comments.map((comment) => (
              <article className="comment" key={comment.id}>
                <Link to={comment.profile ? `/profile@${encodeURIComponent(comment.profile.username)}` : '/'}>
                  <img className="avatar" src={avatarFor(comment.profile)} alt="" />
                </Link>
                <div className="min-w-0 flex-1">
                  <p className="comment-head">
                    <strong>@{comment.profile?.username || 'user'}</strong>
                    <span>{timeAgo(comment.created_at)}</span>
                  </p>
                  <p className="comment-body">{comment.body}</p>
                  <div className="comment-actions">
                    <button onClick={() => session && server('comment_reaction', { comment_id: comment.id, reaction: 'like' }).catch(() => {})}>
                      <ThumbsUp size={14} /> {compact(comment.like_count)}
                    </button>
                    <button onClick={() => session && server('comment_reaction', { comment_id: comment.id, reaction: 'dislike' }).catch(() => {})}>
                      <ThumbsDown size={14} /> {compact(comment.dislike_count)}
                    </button>
                    {(profile?.is_admin || profile?.id === comment.user_id) && (
                      <button onClick={() => deleteComment(comment)} className="danger">
                        <Trash2 size={14} /> Delete
                      </button>
                    )}
                  </div>
                </div>
              </article>
            ))}
            {!comments.length && <p className="muted">No comments yet — be the first.</p>}
          </div>
        </section>
      </section>

      <aside className="up-next">
        <h2 className="section-title">Up next</h2>
        <div className="up-next-list">
          {related.map((item) => (
            <VideoRow key={item.id} video={item} />
          ))}
          {!related.length && <p className="muted">Nothing else here yet.</p>}
        </div>
      </aside>
    </div>
  );
}