import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Video } from '../lib/api';
import { formatDuration, thumbnailFor } from '../youtube';
import { avatarFor, compact, timeAgo } from '../lib/format';

function liveElapsed(start?: string | null) {
  if (!start) return '';
  return formatDuration(Math.max(1, Math.floor((Date.now() - new Date(start).getTime()) / 1000)));
}

export function LiveBadge({ video }: { video: Video }) {
  const [label, setLabel] = useState(() => liveElapsed(video.live_start_time));
  useEffect(() => {
    if (!video.is_live) return;
    const timer = window.setInterval(() => setLabel(liveElapsed(video.live_start_time)), 1000);
    return () => window.clearInterval(timer);
  }, [video.is_live, video.live_start_time]);
  if (!video.is_live) return null;
  return (
    <span className="pill pill-live">
      <i className="live-dot" />
      LIVE {label}
    </span>
  );
}

export function VideoCard({ video }: { video: Video }) {
  const authorPath = video.author ? `/profile@${encodeURIComponent(video.author.username)}` : '/';
  return (
    <article className="video-card">
      <Link to={`/watch/${video.public_slug}`} className="thumb" aria-label={video.title}>
        <img src={video.thumbnail_url || thumbnailFor(video.youtube_id)} loading="lazy" decoding="async" alt="" />
        {video.is_live ? (
          <LiveBadge video={video} />
        ) : (
          <span className="pill">{video.duration_seconds > 0 ? formatDuration(video.duration_seconds) : '--:--'}</span>
        )}
      </Link>
      <div className="video-card-body">
        <Link to={authorPath} className="shrink-0" aria-label={video.author?.username || 'Author'}>
          <img className="avatar" src={avatarFor(video.author)} alt="" />
        </Link>
        <div className="min-w-0">
          <Link to={`/watch/${video.public_slug}`}>
            <h3 className="video-title">{video.title}</h3>
          </Link>
          <Link to={authorPath} className="video-author">
            {video.author ? `@${video.author.username}` : 'Unknown creator'}
          </Link>
          <p className="video-meta">
            {compact(video.view_count)} views · {compact(video.like_count)} likes · {timeAgo(video.created_at)}
          </p>
        </div>
      </div>
    </article>
  );
}

export function VideoRow({ video }: { video: Video }) {
  return (
    <Link to={`/watch/${video.public_slug}`} className="video-row">
      <div className="video-row-thumb">
        <img src={video.thumbnail_url || thumbnailFor(video.youtube_id)} loading="lazy" alt="" />
        <span className="pill pill-sm">
          {video.is_live ? 'LIVE' : video.duration_seconds > 0 ? formatDuration(video.duration_seconds) : '--:--'}
        </span>
      </div>
      <div className="min-w-0">
        <h4>{video.title}</h4>
        <p>{video.author ? `@${video.author.username}` : 'Unknown creator'}</p>
        <p>
          {compact(video.view_count)} views · {timeAgo(video.created_at)}
        </p>
      </div>
    </Link>
  );
}

export function VideoGrid({ videos }: { videos: Video[] }) {
  return (
    <div className="video-grid">
      {videos.map((video) => (
        <VideoCard key={video.id} video={video} />
      ))}
    </div>
  );
}

export function GridSkeleton({ count = 12 }: { count?: number }) {
  return (
    <div className="video-grid">
      {Array.from({ length: count }).map((_, index) => (
        <div className="skeleton-card" key={index}>
          <div className="skeleton skeleton-thumb" />
          <div className="skeleton skeleton-line w-4/5" />
          <div className="skeleton skeleton-line w-2/5" />
        </div>
      ))}
    </div>
  );
}

export function EmptyState({ title, hint, action }: { title: string; hint?: string; action?: React.ReactNode }) {
  return (
    <div className="empty-card">
      <strong>{title}</strong>
      {hint && <p>{hint}</p>}
      {action}
    </div>
  );
}
