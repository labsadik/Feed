import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, UserPlus } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { compact } from '../lib/format';
import type { Profile } from '../lib/api';

export default function FollowButton({ target }: { target: Profile }) {
  const { session } = useAuth();
  const navigate = useNavigate();
  const [following, setFollowing] = useState(false);
  const [followers, setFollowers] = useState(0);
  const [busy, setBusy] = useState(false);
  const viewerId = session?.user?.id;
  const isSelf = viewerId === target.id;

  useEffect(() => {
    let alive = true;
    (async () => {
      const [{ count }, mine] = await Promise.all([
        supabase.from('user_follows').select('*', { count: 'exact', head: true }).eq('followed_id', target.id),
        viewerId && !isSelf
          ? supabase
              .from('user_follows')
              .select('follower_id')
              .eq('follower_id', viewerId)
              .eq('followed_id', target.id)
              .maybeSingle()
          : Promise.resolve({ data: null } as any),
      ]);
      if (!alive) return;
      setFollowers(count || 0);
      setFollowing(!!mine?.data);
    })();
    return () => {
      alive = false;
    };
  }, [target.id, viewerId, isSelf]);

  const toggle = async () => {
    if (!session) return navigate('/login');
    setBusy(true);
    try {
      if (following) {
        await supabase.from('user_follows').delete().eq('follower_id', viewerId!).eq('followed_id', target.id);
        setFollowing(false);
        setFollowers((c) => Math.max(0, c - 1));
      } else {
        await supabase.from('user_follows').insert({ follower_id: viewerId!, followed_id: target.id });
        setFollowing(true);
        setFollowers((c) => c + 1);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="follow-wrap">
      <span className="muted">{compact(followers)} followers</span>
      {!isSelf && (
        <button className={following ? 'secondary-btn' : 'primary-btn'} onClick={toggle} disabled={busy}>
          {following ? <Check size={16} /> : <UserPlus size={16} />}
          {following ? 'Following' : 'Follow'}
        </button>
      )}
    </div>
  );
}
