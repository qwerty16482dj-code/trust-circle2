import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './lib/supabase';
import type { Session } from '@supabase/supabase-js';

import Login from './components/Login';
import Navbar from './components/Navbar';
import DashboardPage from './pages/DashboardPage';
import ProfilePage from './pages/ProfilePage';

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) return <div className="h-screen flex items-center justify-center bg-slate-900 text-white">Загрузка...</div>;

  return (
    <BrowserRouter>
      {!session ? (
        <Routes>
          <Route path="*" element={<Login />} />
        </Routes>
      ) : (
        <div className="min-h-screen bg-slate-50">
          <Navbar email={session.user.email} />
          <main className="max-w-7xl mx-auto p-6">
            <Routes>
              {/* Главная - это Карта */}
              <Route path="/" element={<DashboardPage session={session} />} />
              {/* Профиль */}
              <Route path="/profile" element={<ProfilePage session={session} />} />
              {/* Редирект для всех остальных путей */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      )}
    </BrowserRouter>
  );
}