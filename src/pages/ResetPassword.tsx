import React, { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) setError(error.message);
    else {
      setDone(true);
      setTimeout(() => navigate('/'), 1500);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <p className="eyebrow">Account recovery</p>
        <h1>Set a new password</h1>
        <form className="auth-form" onSubmit={submit}>
          <label>
            <span>New password</span>
            <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
          </label>
          {error && <p className="auth-error">{error}</p>}
          {done && <p className="auth-notice">Password updated. Redirecting…</p>}
          <button className="primary-btn w-full justify-center" disabled={busy || done}>
            {busy && <Loader2 size={16} className="animate-spin" />} Update password
          </button>
        </form>
      </div>
    </div>
  );
}
