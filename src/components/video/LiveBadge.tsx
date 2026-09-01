import { useEffect, useState } from 'react';
import { formatDuration } from '../../youtube';

type LiveVideo = { is_live?: boolean; live_start_time?: string | null };

function elapsed(start?: string | null) {
  if (!start) return 'LIVE';
  return formatDuration(Math.max(0, Math.floor((Date.now() - new Date(start).getTime()) / 1000)));
}

export default function LiveBadge({ video, className = '' }: { video: LiveVideo; className?: string }) {
  const [time, setTime] = useState(() => elapsed(video.live_start_time));

  useEffect(() => {
    if (!video.is_live) return;
    const id = window.setInterval(() => setTime(elapsed(video.live_start_time)), 1000);
    return () => window.clearInterval(id);
  }, [video.is_live, video.live_start_time]);

  if (!video.is_live) return null;
  return (
    <span className={`live-badge ${className}`} aria-label={`Live now ${time}`}>
      <span className="live-dot" aria-hidden="true" />
      <span>LIVE</span>
      {time !== 'LIVE' && <span className="live-elapsed">{time}</span>}
    </span>
  );
}
