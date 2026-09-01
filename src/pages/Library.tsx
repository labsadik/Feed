import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchFollowingFeed, fetchLibrary, type Profile, type Video } from '../lib/api';
import { useAuth } from '../hooks/useAuth';
import { avatarFor } from '../lib/format';
import { EmptyState, GridSkeleton, VideoGrid } from '../components/VideoCard';

function LibraryPage({
  title,
  eyebrow,
  table,
  emptyTitle,
  emptyHint,
}: {
  title: string;
  eyebrow: string;
  table: 'watch_history' | 'saved_videos';
  emptyTitle: string;
  emptyHint: string;
}) {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    fetchLibrary(table).then((rows) => {
      if (!alive) return;
      setVideos(rows);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [table]);

  return (
    <div className="page">
      <header className="page-head">
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="page-sub">{loading ? 'Loading…' : `${videos.length} video${videos.length === 1 ? '' : 's'}`}</p>
      </header>
      {loading ? <GridSkeleton count={4} /> : videos.length ? <VideoGrid videos={videos} /> : <EmptyState title={emptyTitle} hint={emptyHint} />}
    </div>
  );
}

export function HistoryPage() {
  return (
    <LibraryPage
      eyebrow="Library"
      title="Watch history"
      table="watch_history"
      emptyTitle="Nothing watched yet"
      emptyHint="Videos you play show up here automatically."
    />
  );
}

export function SavedPage() {
  return (
    <LibraryPage
      eyebrow="Library"
      title="Saved videos"
      table="saved_videos"
      emptyTitle="No saved videos"
      emptyHint="Tap the bookmark on any video to keep it here."
    />
  );
}

export function FollowingPage() {
  const { session } = useAuth();
  const [creators, setCreators] = useState<Profile[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session?.user?.id) return;
    let alive = true;
    setLoading(true);
    fetchFollowingFeed(session.user.id).then((result) => {
      if (!alive) return;
      setCreators(result.creators);
      setVideos(result.videos);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [session?.user?.id]);

  return (
    <div className="page">
      <header className="page-head">
        <p className="eyebrow">Subscriptions</p>
        <h1>Creators you follow</h1>
        <p className="page-sub">{loading ? 'Loading…' : `${creators.length} creator${creators.length === 1 ? '' : 's'}`}</p>
      </header>

      {creators.length > 0 && (
        <div className="creator-strip">
          {creators.map((creator) => (
            <Link key={creator.id} to={`/profile@${encodeURIComponent(creator.username)}`} className="creator-chip">
              <img className="avatar avatar-lg" src={avatarFor(creator)} alt="" />
              <span>@{creator.username}</span>
            </Link>
          ))}
        </div>
      )}

      {loading ? (
        <GridSkeleton count={4} />
      ) : videos.length ? (
        <VideoGrid videos={videos} />
      ) : (
        <EmptyState title="Nothing here yet" hint="Follow creators from any video page to build this feed." />
      )}
    </div>
  );
}
