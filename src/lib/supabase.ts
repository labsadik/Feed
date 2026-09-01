import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const TARGET_SUPABASE_URL = 'https://dceneqgcvjikbrsqvzlt.supabase.co';
const TARGET_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_iscx9TLA81qmYO-BofDH_g_zFpcsnlW';

export const SUPABASE_URL = String(import.meta.env.VITE_SUPABASE_URL || TARGET_SUPABASE_URL);
export const SUPABASE_PUBLISHABLE_KEY = String(
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  TARGET_SUPABASE_PUBLISHABLE_KEY,
);

if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
  throw new Error('Supabase configuration is missing. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.');
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});

(supabase.auth as any).useSession = function useSession() {
  const [session, setSession] = useState<any>(null);
  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => active && setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => active && setSession(next));
    return () => { active = false; sub.subscription.unsubscribe(); };
  }, []);
  return { data: { session } };
};
