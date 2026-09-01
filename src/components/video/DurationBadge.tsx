import { formatDuration } from '../../youtube';

export default function DurationBadge({ seconds }: { seconds?: number | null }) {
  const value = Number(seconds || 0);
  if (value <= 0) return <span className="duration-badge duration-unavailable">--:--</span>;
  return <span className="duration-badge">{formatDuration(value)}</span>;
}
