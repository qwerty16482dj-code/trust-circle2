import { Link, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function Navbar({ email }: { email?: string }) {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="sticky top-0 z-[100] w-full bg-white/80 backdrop-blur-xl border-b border-slate-100/50">
      <div className="max-w-7xl mx-auto px-8 h-20 flex items-center justify-between">
        <div className="flex items-center gap-16">
          <Link to="/" className="text-lg font-black tracking-widest text-slate-900 uppercase">
            Trust<span className="text-indigo-600">Circle</span>
          </Link>
          
          <div className="hidden md:flex gap-10">
            <Link 
              to="/" 
              className={`text-[10px] font-bold tracking-[0.2em] transition-all ${
                isActive('/') ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-900'
              }`}
            >
              КАТАЛОГ
            </Link>
            <Link 
              to="/profile" 
              className={`text-[10px] font-bold tracking-[0.2em] transition-all ${
                isActive('/profile') ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-900'
              }`}
            >
              КАБИНЕТ
            </Link>
          </div>
        </div>

        <div className="flex items-center gap-8">
          <div className="hidden lg:block text-right">
            <p className="text-[9px] font-bold text-slate-300 uppercase tracking-widest mb-0.5">Пользователь</p>
            <p className="text-[11px] font-black text-slate-900 tracking-tight">{email}</p>
          </div>
          <button 
            onClick={handleLogout} 
            className="px-6 py-2.5 rounded-full border border-slate-200 text-[10px] font-bold tracking-widest uppercase hover:bg-slate-900 hover:text-white transition-all active:scale-95 shadow-sm"
          >
            Выход
          </button>
        </div>
      </div>
    </nav>
  );
}