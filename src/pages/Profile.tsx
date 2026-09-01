import React, { useEffect, useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import {
  fetchFollowCounts,
  fetchProfileByUsername,
  fetchVideosByAuthor,
  type Profile as ProfileType,
  type Video,
} from '../lib/api';
import { useAuth } from '../hooks/useAuth';
import { avatarFor, compact } from '../lib/format';
import { EmptyState, GridSkeleton, VideoGrid } from '../components/VideoCard';
import FollowButton from '../components/FollowButton';

function ProfileView({ profile, own }: { profile: ProfileType; own: boolean }) {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState({ followers: 0, following: 0 });

  useEffect(() => {
    let alive = true;
    setLoading(true);
    Promise.all([fetchVideosByAuthor(profile.id), fetchFollowCounts(profile.id)]).then(([rows, c]) => {
      if (!alive) return;
      setVideos(rows);
      setCounts(c);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [profile.id]);

  const views = videos.reduce((total, v) => total + Number(v.view_count || 0), 0);

  return (
    <div className="page">
      <section className="profile-hero">
        <img className="profile-avatar" src={avatarFor(profile)} alt="" />
        <div className="min-w-0 flex-1">
          <p className="eyebrow">{profile.is_admin ? 'Admin creator' : 'Creator'}</p>
          <h1>@{profile.username}</h1>
          <p className="page-sub">
            {compact(counts.followers)} followers · {compact(counts.following)} following · {compact(videos.length)} videos ·{' '}
            {compact(views)} views
          </p>
        </div>
        {!own && <FollowButton target={profile} />}
      </section>

      <h2 className="section-title mt-10">Videos</h2>
      {loading ? <GridSkeleton count={4} /> : videos.length ? <VideoGrid videos={videos} /> : <EmptyState title="No videos published yet" />}
    </div>
  );
}

export function MyProfile() {
  const { profile, ready } = useAuth();
  if (!ready) return <div className="page"><GridSkeleton count={4} /></div>;
  if (!profile) return <Navigate to="/login" replace />;
  return <ProfileView profile={profile} own />;
}

export function PublicProfile() {
  const { username: rawUsername = '' } = useParams<{ username?: string }>();
  const { profile: me } = useAuth();
  const [profile, setProfile] = useState<ProfileType | null>(null);
  const [loading, setLoading] = useState(true);

  // Decodes URI components and strips 'profile@', 'u@', or leading '@'
  const cleanUsername = decodeURIComponent(rawUsername)
    .replace(/^(profile@|u@|@)/i, '')
    .trim();

  useEffect(() => {
    let alive = true;
    setLoading(true);

    if (!cleanUsername) {
      setLoading(false);
      setProfile(null);
      return;
    }

    fetchProfileByUsername(cleanUsername).then((row) => {
      if (!alive) return;
      setProfile(row);
      setLoading(false);
    });

    return () => {
      alive = false;
    };
  }, [cleanUsername]);

  if (loading) return <div className="page"><GridSkeleton count={4} /></div>;
  if (!profile) return <div className="page"><EmptyState title="Profile not found" hint="This creator does not exist." /></div>;
  return <ProfileView profile={profile} own={me?.id === profile.id} />;
}