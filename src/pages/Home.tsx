import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { fetchVideos, type Video } from '../lib/api';
import { EmptyState, GridSkeleton, VideoGrid } from '../components/VideoCard';

export default function Home() {
  const location = useLocation();
  const search = new URLSearchParams(location.search).get('q') || '';
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError('');
    fetchVideos({ search })
      .then((rows) => alive && setVideos(rows))
      .catch((e: any) => alive && setError(e?.message || 'Could not load videos.'))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [search, reloadKey]);

  const live = videos.filter((v) => v.is_live);
  const rest = videos.filter((v) => !v.is_live);

  return (
    <div className="page">
      <header className="page-head">
        <p className="eyebrow">{search ? 'Search results' : 'Feed'}</p>
        <h1>{search ? `“${search}”` : 'Latest videos'}</h1>
        <p className="page-sub">{loading ? 'Loading library…' : `${videos.length} video${videos.length === 1 ? '' : 's'}`}</p>
      </header>

      {loading ? (
        <GridSkeleton />
      ) : error ? (
        <EmptyState
          title="Couldn’t load videos"
          hint={error}
          action={
            <button className="secondary-btn mt-4" onClick={() => setReloadKey((k) => k + 1)}>
              Retry
            </button>
          }
        />
      ) : videos.length ? (
        <>
          {live.length > 0 && (
            <section className="mb-10">
              <h2 className="section-title">Live now</h2>
              <VideoGrid videos={live} />
            </section>
          )}
          {rest.length > 0 && (
            <section>
              {live.length > 0 && <h2 className="section-title">Recently added</h2>}
              <VideoGrid videos={rest} />
            </section>
          )}
        </>
      ) : (
        <EmptyState
          title={search ? 'No videos match that search' : 'No videos yet'}
          hint={search ? 'Try a different title keyword.' : 'Videos added by admins appear here.'}
        />
      )}
    </div>
  );
}
