import type { Profile } from './api';

export const avatarFor = (profile?: Profile | null) =>
  profile?.avatar_url ||
  `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(profile?.username || 'User')}`;

export function timeAgo(value: string) {
  const seconds = Math.max(0, (Date.now() - new Date(value).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hr ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)} d ago`;
  if (seconds < 2592000) return `${Math.floor(seconds / 604800)} wk ago`;
  if (seconds < 31536000) return `${Math.floor(seconds / 2592000)} mo ago`;
  return `${Math.floor(seconds / 31536000)} yr ago`;
}

export function compact(value: unknown) {
  const n = Number(value || 0);
  if (n < 1000) return String(n);
  return new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(n);
}

export const fullNumber = (value: unknown) => Number(value || 0).toLocaleString();
