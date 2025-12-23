import { useEffect, useState } from 'react';
import MapSection from '../components/MapSection';
import { supabase } from '../lib/supabase';
import type { Session } from '@supabase/supabase-js';

type Profile = {
  id: string;
  full_name: string | null;
  email: string | null;
};

export default function DashboardPage({ session }: { session: Session }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [friends, setFriends] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchFriends();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.user.id]);

  const fetchFriends = async () => {
    const { data } = await supabase
      .from('social_graph')
      .select(`
        profile:profiles!social_graph_following_id_fkey (id, full_name, email)
      `)
      .eq('follower_id', session.user.id);

    if (data) {
      const formatted: Profile[] = data
        .map((item: any) => item.profile)
        .filter((p): p is Profile => p !== null);
      setFriends(formatted);
    }
  };

  const handleSearch = async () => {
    if (searchQuery.trim().length < 3) {
      setSearchResults([]);
      return;
    }
    
    setLoading(true);
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .ilike('full_name', `%${searchQuery}%`)
      .neq('id', session.user.id)
      .limit(5);
      
    setSearchResults((data as Profile[]) || []);
    setLoading(false);
  };

  const addFriend = async (friendId: string) => {
    const { error } = await supabase.from('social_graph').insert({
      follower_id: session.user.id,
      following_id: friendId,
      strength: 1
    });
    
    if (!error) {
      fetchFriends();
      setSearchResults([]);
      setSearchQuery('');
    }
  };

  return (
    <div className="py-16 px-4 max-w-7xl mx-auto space-y-16 animate-in fade-in duration-1000">
      {/* Заголовок страницы */}
      <header className="max-w-2xl space-y-4">
        <h1 className="text-5xl font-bold text-slate-900 tracking-tighter uppercase">
          Каталог объектов
        </h1>
        <p className="text-slate-400 text-lg font-medium leading-relaxed">
          Доступ к ресурсам сообщества через призму социального доверия. 
          Безопасный обмен между верифицированными участниками.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        {/* Боковая панель */}
        <aside className="lg:col-span-4 space-y-12">
          
          <section className="space-y-8 bg-white p-10 rounded-[32px] border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
            <h3 className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em]">
              Расширить круг
            </h3>
            <div className="relative group">
              <input
                type="text"
                placeholder="Поиск по базе имен"
                className="w-full pb-3 bg-transparent border-b border-slate-100 focus:border-indigo-600 transition-all outline-none text-sm font-medium placeholder:text-slate-300"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
              <button 
                onClick={handleSearch} 
                className="absolute right-0 bottom-3 text-[10px] font-bold text-indigo-600 uppercase tracking-widest hover:text-indigo-800 transition-colors"
              >
                {loading ? '...' : 'Найти'}
              </button>
            </div>

            <div className="space-y-3">
              {searchResults.map(user => (
                <div key={user.id} className="flex justify-between items-center p-4 rounded-2xl bg-slate-50/50 border border-transparent hover:border-slate-100 transition-all group">
                  <div className="overflow-hidden">
                    <p className="font-bold text-slate-800 text-sm truncate uppercase tracking-tight">
                      {user.full_name || user.email}
                    </p>
                  </div>
                  <button 
                    onClick={() => addFriend(user.id)} 
                    className="shrink-0 text-[9px] font-black text-white bg-slate-900 px-4 py-2 rounded-full opacity-0 group-hover:opacity-100 transition-all uppercase tracking-tighter"
                  >
                    Добавить
                  </button>
                </div>
              ))}
            </div>
          </section>

          <section className="space-y-8 bg-white p-10 rounded-[32px] border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
            <div className="flex justify-between items-center">
              <h3 className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em]">
                Ваши контакты
              </h3>
              <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                {friends.length}
              </span>
            </div>
            
            <div className="space-y-6">
              {friends.length === 0 ? (
                <p className="text-slate-300 text-[10px] font-bold uppercase tracking-widest italic">
                  Круг доверия еще не сформирован.
                </p>
              ) : (
                friends.map(friend => (
                  <div key={friend.id} className="flex items-center gap-4 group cursor-default">
                    <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center border border-slate-100 group-hover:bg-slate-900 group-hover:border-slate-900 transition-all duration-500">
                      <span className="text-[11px] font-bold text-slate-400 group-hover:text-white uppercase transition-colors">
                        {friend.full_name?.[0] || 'U'}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800 tracking-tight leading-none mb-1">
                        {friend.full_name}
                      </p>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                        Прямая связь
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </aside>

        {/* Карта */}
        <main className="lg:col-span-8">
          <div className="bg-white p-2 rounded-[44px] border border-slate-100 shadow-[0_20px_60px_rgba(0,0,0,0.04)] overflow-hidden">
            <div className="rounded-[36px] overflow-hidden grayscale-[0.1] hover:grayscale-0 transition-all duration-1000">
              <MapSection userId={session.user.id} />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}