import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

// --- ADD THESE TWO LINES FOR THE VIDSTACK PLAYER ---
import '@vidstack/react/player/styles/default/theme.css';
import '@vidstack/react/player/styles/default/layouts/video.css';
// ---------------------------------------------------

import { AuthProvider, useAuth } from './hooks/useAuth';
import AppLayout from './components/AppLayout';
import Home from './pages/Home';
import Watch from './pages/Watch';
import Login from './pages/Login';
import ResetPassword from './pages/ResetPassword';
import Admin from './pages/Admin';
import { MyProfile, PublicProfile } from './pages/Profile';
import { FollowingPage, HistoryPage, SavedPage } from './pages/Library';

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { session, ready } = useAuth();
  if (!ready) return <div className="page"><p className="muted">Loading…</p></div>;
  if (!session) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<Home />} />
            <Route path="/watch/:slug" element={<Watch />} />
            <Route path="/login" element={<Login />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            
            {/* Static Protected Routes (Defined before /:username to avoid route hijacking) */}
            <Route path="/profile" element={<RequireAuth><MyProfile /></RequireAuth>} />
            <Route path="/following" element={<RequireAuth><FollowingPage /></RequireAuth>} />
            <Route path="/history" element={<RequireAuth><HistoryPage /></RequireAuth>} />
            <Route path="/saved" element={<RequireAuth><SavedPage /></RequireAuth>} />
            <Route path="/admin" element={<RequireAuth><Admin /></RequireAuth>} />
            
            {/* Public Profiles */}
            <Route path="/profile/:username" element={<PublicProfile />} />
            <Route path="/u/:username" element={<PublicProfile />} />
            {/* Greedy root handle placed LAST so it doesn't intercept /following, /admin, etc. */}
            <Route path="/:username" element={<PublicProfile />} />
            
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}