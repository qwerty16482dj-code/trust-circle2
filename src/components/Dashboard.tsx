import  { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Session } from '@supabase/supabase-js';
import MapSection from './MapSection';

type Profile = {
  id: string;
  full_name: string | null;
  email: string | null;
};

export default function Dashboard({ session }: { session: Session }) {
  // Состояния для поиска и друзей
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [friends, setFriends] = useState<Profile[]>([]);
  
  // Состояния для личного кабинета
  const [myItems, setMyItems] = useState<any[]>([]);
  const [myBookings, setMyBookings] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'map' | 'profile'>('map');

  useEffect(() => {
    fetchFriends();
    fetchUserData();
  }, [session.user.id]);

  // Загрузка данных пользователя (Шаг 3 ТЗ)
  const fetchUserData = async () => {
    // 1. Мои опубликованные товары
    const { data: items } = await supabase
      .from('items')
      .select('*')
      .eq('owner_id', session.user.id);
    
    // 2. Мои бронирования (вещи, которые я взял в аренду)
    const { data: bookings } = await supabase
      .from('bookings')
      .select(`
        *,
        item:items (
          title,
          price_per_day
        )
      `)
      .eq('borrower_id', session.user.id);

    setMyItems(items || []);
    setMyBookings(bookings || []);
  };

  const fetchFriends = async () => {
    const { data, error } = await supabase
      .from('social_graph')
      .select(`
        profile:profiles!social_graph_following_id_fkey (
          id,
          full_name,
          email
        )
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
    if (searchQuery.length < 3) return;
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
    <div className="max-w-6xl mx-auto mt-6 p-4 space-y-6">
      {/* Шапка */}
      <div className="flex flex-col md:flex-row md:items-center justify-between bg-white p-6 rounded-3xl shadow-sm border border-slate-100 gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">Trust Circle</h2>
          <p className="text-slate-500 text-sm font-medium">Ваша репутация: <span className="text-green-600">Высокая</span></p>
        </div>
        
        {/* Переключатель вкладок */}
        <div className="flex bg-slate-100 p-1 rounded-2xl">
          <button 
            onClick={() => setActiveTab('map')}
            className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'map' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Карта
          </button>
          <button 
            onClick={() => setActiveTab('profile')}
            className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'profile' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Мой профиль
          </button>
        </div>
      </div>

      {activeTab === 'map' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in duration-500">
          {/* Левая панель (Граф и Поиск) */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
              <h3 className="text-lg font-bold mb-4 text-slate-800">🔍 Поиск связей</h3>
              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  placeholder="Имя друга..."
                  className="flex-1 px-4 py-2 bg-slate-50 border-none ring-1 ring-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm transition-all"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
                <button onClick={handleSearch} className="bg-indigo-600 text-white px-4 py-2 rounded-xl font-bold text-sm">
                  {loading ? '...' : 'Найти'}
                </button>
              </div>
              <div className="space-y-2">
                {searchResults.map(user => (
                  <div key={user.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <p className="font-semibold text-slate-700 text-sm truncate">{user.full_name || user.email}</p>
                    <button onClick={() => addFriend(user.id)} className="text-[10px] font-black bg-white text-indigo-600 border border-indigo-100 px-2 py-1 rounded-lg">
                      + ДОБАВИТЬ
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
              <h3 className="text-lg font-bold mb-4 text-slate-800">🤝 Мой круг ({friends.length})</h3>
              <div className="space-y-3">
                {friends.length === 0 && <p className="text-slate-400 text-xs italic">Пока никого нет</p>}
                {friends.map(friend => (
                  <div key={friend.id} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold uppercase">
                      {friend.full_name?.[0] || '?'}
                    </div>
                    <p className="font-bold text-slate-700 text-sm">{friend.full_name}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Карта */}
          <div className="lg:col-span-2">
            <MapSection userId={session.user.id} />
          </div>
        </div>
      ) : (
        /* Личный кабинет (Шаг 3 ТЗ) */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in slide-in-from-bottom-4 duration-500">
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
            <h3 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2">
              📦 Мои объявления ({myItems.length})
            </h3>
            {myItems.length === 0 ? (
              <p className="text-slate-400 text-sm italic">Вы еще не опубликовали ни одной вещи на карте.</p>
            ) : (
              <div className="space-y-4">
                {myItems.map(item => (
                  <div key={item.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex justify-between items-center">
                    <div>
                      <p className="font-bold text-slate-800">{item.title}</p>
                      <p className="text-xs text-slate-500">Опубликовано: {new Date(item.created_at).toLocaleDateString()}</p>
                    </div>
                    <span className="bg-white px-3 py-1 rounded-lg text-indigo-600 font-bold border border-indigo-50 shadow-sm">
                      {item.price_per_day} ₴
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
            <h3 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2">
              📅 Я арендую ({myBookings.length})
            </h3>
            {myBookings.length === 0 ? (
              <p className="text-slate-400 text-sm italic">У вас нет активных бронирований.</p>
            ) : (
              <div className="space-y-4">
                {myBookings.map(b => (
                  <div key={b.id} className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100">
                    <div className="flex justify-between items-start mb-2">
                      <p className="font-bold text-indigo-900">{b.item?.title}</p>
                      <span className="text-[10px] font-black uppercase bg-indigo-200 text-indigo-700 px-2 py-0.5 rounded">
                        {b.status}
                      </span>
                    </div>
                    <p className="text-xs text-indigo-600 font-medium italic">
                      Период: {new Date(b.start_date).toLocaleDateString()} — {new Date(b.end_date).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}