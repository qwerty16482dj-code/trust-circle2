import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Session } from '@supabase/supabase-js';

export default function ProfilePage({ session }: { session: Session }) {
  const [myItems, setMyItems] = useState<any[]>([]);
  const [myBookings, setMyBookings] = useState<any[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUserData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.user.id]);

  const fetchUserData = async () => {
    setLoading(true);
    
    // 1. Мои опубликованные товары
    const { data: items } = await supabase
      .from('items')
      .select('*')
      .eq('owner_id', session.user.id);
    
    // 2. Вещи, которые я арендую у других
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

    // 3. Запросы от других людей на мои товары
    // ИСПРАВЛЕНО: используем алиас 'item' для фильтрации
    const { data: requests } = await supabase
      .from('bookings')
      .select(`
        *,
        item:items!inner (title, owner_id),
        borrower:profiles!bookings_borrower_id_fkey (full_name, email)
      `)
      .eq('item.owner_id', session.user.id)
      .neq('borrower_id', session.user.id);

    setMyItems(items || []);
    setMyBookings(bookings || []);
    setIncomingRequests(requests || []);
    setLoading(false);
  };

  const updateBookingStatus = async (bookingId: string, status: 'confirmed' | 'cancelled') => {
    const { error } = await supabase
      .from('bookings')
      .update({ status })
      .eq('id', bookingId);

    if (error) {
      console.error('Update error:', error.message);
    } else {
      fetchUserData();
    }
  };

  if (loading) return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="w-12 h-12 border border-slate-100 border-t-slate-900 rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto py-20 px-6 space-y-24 animate-in fade-in duration-1000">
      
      {/* СЕКЦИЯ: ВХОДЯЩИЕ ЗАПРОСЫ */}
      <section className="space-y-12">
        <header className="flex justify-between items-end border-b border-slate-100 pb-8">
          <div className="space-y-2">
            <h2 className="text-4xl font-bold tracking-tighter text-slate-900 uppercase">Входящие уведомления</h2>
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Управление доступом к вашим объектам</p>
          </div>
          <div className="text-right">
            <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-4 py-1.5 rounded-full tracking-[0.2em] uppercase">
              Запросов: {incomingRequests.length}
            </span>
          </div>
        </header>

        {incomingRequests.length === 0 ? (
          <div className="py-24 text-center bg-white rounded-[44px] border border-slate-100 border-dashed">
            <p className="text-slate-300 text-[11px] font-bold uppercase tracking-widest">Активные запросы не обнаружены</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {incomingRequests.map(req => (
              <div key={req.id} className="bg-white p-10 rounded-[40px] border border-slate-100 shadow-[0_10px_40px_rgba(0,0,0,0.02)] space-y-8 group transition-all hover:border-indigo-100">
                <div className="space-y-1">
                  <p className="text-[9px] font-bold text-slate-300 uppercase tracking-[0.3em]">Объект</p>
                  <h4 className="text-xl font-bold text-slate-900 tracking-tight leading-none uppercase">{req.item?.title}</h4>
                </div>

                <div className="space-y-1">
                  <p className="text-[9px] font-bold text-slate-300 uppercase tracking-[0.3em]">Заявитель</p>
                  <p className="text-sm font-bold text-slate-800 tracking-tight leading-none">{req.borrower?.full_name}</p>
                  <p className="text-[10px] text-slate-400 font-medium lowercase mt-1">{req.borrower?.email}</p>
                </div>
                
                <div className="p-4 bg-slate-50 rounded-[20px] flex justify-between items-center">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">Период</span>
                  <span className="text-[10px] font-black text-slate-900 uppercase leading-none">
                    {new Date(req.start_date).toLocaleDateString()} — {new Date(req.end_date).toLocaleDateString()}
                  </span>
                </div>

                {req.status === 'pending' ? (
                  <div className="flex gap-3">
                    <button 
                      onClick={() => updateBookingStatus(req.id, 'confirmed')}
                      className="flex-1 bg-slate-900 text-white py-4 rounded-[20px] text-[10px] font-bold uppercase tracking-widest hover:bg-indigo-600 transition-all active:scale-95 shadow-lg shadow-slate-200"
                    >
                      Принять
                    </button>
                    <button 
                      onClick={() => updateBookingStatus(req.id, 'cancelled')}
                      className="flex-1 bg-white border border-slate-100 text-slate-400 py-4 rounded-[20px] text-[10px] font-bold uppercase tracking-widest hover:bg-red-50 hover:text-red-500 transition-all"
                    >
                      Отказ
                    </button>
                  </div>
                ) : (
                  <div className={`text-center py-4 rounded-[20px] text-[10px] font-black uppercase tracking-widest border ${
                    req.status === 'confirmed' 
                      ? 'bg-indigo-50 text-indigo-600 border-indigo-100' 
                      : 'bg-red-50 text-red-500 border-red-100'
                  }`}>
                    {req.status === 'confirmed' ? 'Подтверждено' : 'Отклонено'}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* СЕТКА С МОИМИ ТОВАРАМИ И АРЕНДАМИ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-20">
        
        {/* Мои объявления */}
        <section className="space-y-10">
          <h3 className="text-[10px] font-black text-slate-300 uppercase tracking-[0.4em] ml-2">Собственные активы</h3>
          <div className="space-y-4">
            {myItems.length === 0 ? (
              <p className="text-slate-300 text-[10px] font-bold uppercase tracking-widest italic ml-2">Список ваших объектов пуст.</p>
            ) : (
              myItems.map(item => (
                <div key={item.id} className="bg-white p-8 rounded-[32px] border border-slate-100 flex justify-between items-center group hover:bg-slate-50 transition-all">
                  <div className="space-y-1">
                    <span className="font-bold text-slate-800 tracking-tight block uppercase text-sm">{item.title}</span>
                    <span className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">Доступен к аренде</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-black text-slate-900 block leading-none">{item.price_per_day} ₴</span>
                    <span className="text-[8px] font-bold text-slate-300 uppercase tracking-tighter">за сутки</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Мои бронирования */}
        <section className="space-y-10">
          <h3 className="text-[10px] font-black text-slate-300 uppercase tracking-[0.4em] ml-2">История пользования</h3>
          <div className="space-y-4">
            {myBookings.length === 0 ? (
              <p className="text-slate-300 text-[10px] font-bold uppercase tracking-widest italic ml-2">Активные бронирования не найдены.</p>
            ) : (
              myBookings.map(b => (
                <div key={b.id} className="bg-white p-8 rounded-[32px] border border-slate-100 flex justify-between items-center">
                  <div className="space-y-1">
                    <p className="font-bold text-slate-800 tracking-tight block leading-none mb-1 text-sm uppercase">{b.item?.title}</p>
                    <p className="text-[9px] font-bold text-slate-400 tracking-tight uppercase">
                      {new Date(b.start_date).toLocaleDateString()} — {new Date(b.end_date).toLocaleDateString()}
                    </p>
                  </div>
                  <div className={`px-5 py-2 rounded-full text-[9px] font-black uppercase tracking-[0.1em] border ${
                    b.status === 'confirmed' ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : 
                    b.status === 'cancelled' ? 'bg-red-50 text-red-500 border-red-100' :
                    'bg-slate-50 text-slate-300 border-slate-100'
                  }`}>
                    {b.status === 'confirmed' ? 'Активно' : b.status === 'cancelled' ? 'Отклонено' : 'Ожидание'}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}