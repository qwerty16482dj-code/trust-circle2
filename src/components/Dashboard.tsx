import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Session } from '@supabase/supabase-js';
import MapSection from './MapSection';

type Profile = {
  id: string;
  full_name: string | null;
  email: string | null;
};

export default function Dashboard({ session }: { session: Session }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [friends, setFriends] = useState<Profile[]>([]);
  
  const [myItems, setMyItems] = useState<any[]>([]);
  const [myBookings, setMyBookings] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'map' | 'profile'>('map');

  useEffect(() => {
    fetchFriends();
    fetchUserData();
  }, [session.user.id]);

  const fetchUserData = async () => {
    const { data: items } = await supabase
      .from('items')
      .select('*')
      .eq('owner_id', session.user.id);
    
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
    // ИСПРАВЛЕНО: удалена неиспользуемая переменная error для прохождения билда
    const { data } = await supabase
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
      {/* Шапка с премиальным дизайном */}
      <div className="flex flex-col md:flex-row md:items-center justify-between bg-white p-8 rounded-[40px] shadow-[0_20px_50px_rgba(0,0,0,0.02)] border border-slate-50 gap-6">
        <div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tighter uppercase">Trust Circle</h2>
          <div className="flex items-center gap-2 mt-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Статус: Репутация Verified</p>
          </div>
        </div>
        
        <div className="flex bg-slate-50 p-1.5 rounded-[24px] border border-slate-100">
          <button 
            onClick={() => setActiveTab('map')}
            className={`px-8 py-3 rounded-[20px] text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'map' ? 'bg-white text-slate-900 shadow-xl shadow-slate-200/50' : 'text-slate-400 hover:text-slate-600'}`}
          >
            Карта
          </button>
          <button 
            onClick={() => setActiveTab('profile')}
            className={`px-8 py-3 rounded-[20px] text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'profile' ? 'bg-white text-slate-900 shadow-xl shadow-slate-200/50' : 'text-slate-400 hover:text-slate-600'}`}
          >
            Кабинет
          </button>
        </div>
      </div>

      {activeTab === 'map' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 animate-in fade-in duration-700">
          <div className="lg:col-span-1 space-y-8">
            <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-50">
              <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em] mb-6">Расширить круг</h3>
              <div className="flex gap-3 mb-6">
                <input
                  type="text"
                  placeholder="Поиск по базе имен..."
                  className="flex-1 px-5 py-4 bg-slate-50 border-none rounded-[20px] outline-none text-xs font-bold focus:ring-1 focus:ring-slate-200 transition-all"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
                <button onClick={handleSearch} className="bg-slate-900 text-white px-6 rounded-[20px] text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 transition-all">
                  {loading ? '...' : 'Найти'}
                </button>
              </div>
              <div className="space-y-3">
                {searchResults.map(user => (
                  <div key={user.id} className="flex justify-between items-center p-4 bg-slate-50 rounded-[24px] border border-slate-100 group transition-all hover:bg-white hover:shadow-md">
                    <p className="font-bold text-slate-700 text-[11px] truncate uppercase tracking-tight">{user.full_name || user.email}</p>
                    <button onClick={() => addFriend(user.id)} className="text-[9px] font-black text-indigo-600 bg-white border border-indigo-50 px-3 py-2 rounded-xl shadow-sm hover:bg-indigo-600 hover:text-white transition-all">
                      ДОБАВИТЬ
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-50">
              <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em] mb-6">Ваши контакты <span className="ml-2 px-2 py-0.5 bg-slate-100 rounded-full text-slate-400">{friends.length}</span></h3>
              <div className="space-y-4">
                {friends.length === 0 && <p className="text-slate-300 text-[10px] font-bold uppercase tracking-widest italic">Круг доверия еще не сформирован.</p>}
                {friends.map(friend => (
                  <div key={friend.id} className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-slate-50 border border-slate-100 text-slate-400 flex items-center justify-center text-[10px] font-black uppercase">
                      {friend.full_name?.[0] || '?'}
                    </div>
                    <div>
                      <p className="font-bold text-slate-800 text-xs">{friend.full_name}</p>
                      <p className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">Прямая связь</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="lg:col-span-2">
            <MapSection userId={session.user.id} />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 animate-in slide-in-from-bottom-8 duration-700">
          {/* Секция профиля */}
          <div className="bg-white p-10 rounded-[44px] shadow-sm border border-slate-50">
            <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em] mb-8">Мои предложения ({myItems.length})</h3>
            <div className="space-y-4">
              {myItems.map(item => (
                <div key={item.id} className="p-6 bg-slate-50 rounded-[32px] border border-slate-100 flex justify-between items-center group transition-all hover:bg-white hover:shadow-lg">
                  <div>
                    <p className="font-black text-slate-900 text-sm tracking-tighter uppercase">{item.title}</p>
                    <p className="text-[9px] font-bold text-slate-300 uppercase mt-1">Опубликовано на карте</p>
                  </div>
                  <span className="bg-white px-5 py-2 rounded-[18px] text-slate-900 text-[11px] font-black border border-slate-100 shadow-sm">
                    {item.price_per_day} ₴
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white p-10 rounded-[44px] shadow-sm border border-slate-50">
            <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em] mb-8">Активные брони ({myBookings.length})</h3>
            <div className="space-y-4">
              {myBookings.map(b => (
                <div key={b.id} className="p-6 bg-indigo-50/50 rounded-[32px] border border-indigo-100/50">
                  <div className="flex justify-between items-start mb-4">
                    <p className="font-black text-indigo-900 text-sm tracking-tighter uppercase">{b.item?.title}</p>
                    <span className="text-[8px] font-black uppercase tracking-widest bg-white text-indigo-500 px-3 py-1.5 rounded-full shadow-sm border border-indigo-50">
                      {b.status}
                    </span>
                  </div>
                  <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest">
                    {new Date(b.start_date).toLocaleDateString()} — {new Date(b.end_date).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}