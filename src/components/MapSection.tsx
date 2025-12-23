import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { supabase } from '../lib/supabase';

// Исправление иконок Leaflet
// @ts-ignore
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

// Компонент для автофокуса на пользователе
function LocationMarker({ setUserCoords }: { setUserCoords: (coords: [number, number]) => void }) {
  const map = useMap();
  useEffect(() => {
    map.locate().on("locationfound", function (e) {
      setUserCoords([e.latlng.lat, e.latlng.lng]);
      map.flyTo(e.latlng, map.getZoom(), { duration: 1.5 });
    });
  }, [map, setUserCoords]);
  return null;
}

const getHandshakeIcon = (level: number) => {
  const colors = ['#10b981', '#f59e0b', '#ef4444'];
  const colorName = level > 0 && level <= 3 ? ['green', 'orange', 'red'][level - 1] : 'blue';
  return new L.Icon({
    iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${colorName}.png`,
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
  });
};

export default function MapSection({ userId }: { userId: string }) {
  const [items, setItems] = useState<any[]>([]);
  const [isAddingMode, setIsAddingMode] = useState(false);
  const [newItemCoords, setNewItemCoords] = useState<[number, number] | null>(null);
  const [userCoords, setUserCoords] = useState<[number, number] | null>(null);
  const [bookedDates, setBookedDates] = useState<Date[]>([]); 
  
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('500');
  const [startDate, setStartDate] = useState<Date | null>(new Date());
  const [endDate, setEndDate] = useState<Date | null>(null);

  useEffect(() => {
    fetchItems();
  }, [userId]);

  const fetchItems = async () => {
    const { data, error } = await supabase.rpc('get_items_with_handshakes', { p_user_id: userId });
    if (error) console.error('Data Error:', error);
    else setItems(data || []);
  };

  const fetchBookedDates = async (itemId: string) => {
    const { data } = await supabase
      .from('bookings')
      .select('start_date, end_date')
      .eq('item_id', itemId)
      .in('status', ['confirmed', 'pending']);

    const dates: Date[] = [];
    data?.forEach(booking => {
      let current = new Date(booking.start_date);
      const last = new Date(booking.end_date);
      while (current <= last) {
        dates.push(new Date(current));
        current.setDate(current.getDate() + 1);
      }
    });
    setBookedDates(dates);
  };

  const handleAddItem = async () => {
    if (!newItemCoords || !title.trim()) return;
    const { error } = await supabase.from('items').insert({
      owner_id: userId, title: title.trim(), lat: newItemCoords[0], lng: newItemCoords[1], price_per_day: parseFloat(price)
    });
    if (!error) {
      setNewItemCoords(null);
      setIsAddingMode(false);
      setTitle('');
      fetchItems();
    }
  };

  const handleBooking = async (itemId: string) => {
    if (!startDate || !endDate) return;
    const { error } = await supabase.from('bookings').insert({
      item_id: itemId,
      borrower_id: userId,
      start_date: startDate.toISOString().split('T')[0],
      end_date: endDate.toISOString().split('T')[0],
      status: 'pending'
    });
    if (!error) {
      alert('Запрос отправлен');
      setEndDate(null);
      fetchItems();
    }
  };

  const calculateTotal = (pricePerDay: number) => {
    if (!startDate || !endDate) return 0;
    const days = Math.ceil(Math.abs(endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return days * pricePerDay;
  };

  function MapEvents() {
    useMapEvents({
      click(e) { if (isAddingMode) setNewItemCoords([e.latlng.lat, e.latlng.lng]); },
    });
    return null;
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-1000">
      <div className="flex justify-between items-center px-2">
        <div>
          <h3 className="text-2xl font-bold tracking-tighter text-slate-900 uppercase">Локации</h3>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
            {userCoords ? "Объекты в вашем районе" : "Определение позиции..."}
          </p>
        </div>
        <button 
          onClick={() => { setIsAddingMode(!isAddingMode); setNewItemCoords(null); }} 
          className={`px-8 py-3 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${
            isAddingMode ? 'bg-slate-100 text-slate-500' : 'bg-slate-900 text-white shadow-xl shadow-slate-200 hover:bg-indigo-600'
          }`}
        >
          {isAddingMode ? 'Отмена' : 'Добавить объект'}
        </button>
      </div>

      {isAddingMode && (
        <div className="p-10 bg-white rounded-[40px] border border-slate-100 space-y-8 animate-in slide-in-from-top-4 duration-500 shadow-sm">
          <div className="flex items-center gap-4">
            <span className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px] font-bold">
              {newItemCoords ? '02' : '01'}
            </span>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">
              {!newItemCoords ? 'Кликните на карту, чтобы поставить маркер' : 'Детали объекта'}
            </p>
          </div>
          {newItemCoords && (
            <div className="flex flex-col lg:flex-row gap-8 items-end animate-in fade-in duration-700">
              <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Название" className="flex-1 w-full pb-3 bg-transparent border-b border-slate-100 outline-none text-sm font-medium focus:border-indigo-600 transition-all"/>
              <div className="relative w-full lg:w-40">
                <input type="number" value={price} onChange={e => setPrice(e.target.value)} className="w-full pb-3 bg-transparent border-b border-slate-100 outline-none text-sm font-medium focus:border-indigo-600 transition-all"/>
                <span className="absolute right-0 bottom-3 text-[10px] font-bold text-slate-300 uppercase">грн</span>
              </div>
              <button onClick={handleAddItem} className="w-full lg:w-auto px-10 py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-bold uppercase tracking-widest hover:bg-indigo-600 transition-all">Опубликовать</button>
            </div>
          )}
        </div>
      )}

      {/* КАРТА */}
      <div className="relative group">
        {/* ВАЖНО: добавили pointer-events-none, чтобы слой не блокировал клики */}
        <div className="absolute -inset-1 bg-gradient-to-b from-slate-100 to-transparent rounded-[44px] blur-2xl opacity-30 pointer-events-none group-hover:opacity-50 transition duration-1000"></div>
        
        <div className="relative h-[650px] w-full rounded-[44px] border border-white shadow-[0_40px_100px_rgba(0,0,0,0.04)] overflow-hidden bg-slate-50">
          <MapContainer center={[50.45, 30.52]} zoom={12} style={{ height: '100%', width: '100%', zIndex: 0 }}>
            <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />
            <MapEvents />
            <LocationMarker setUserCoords={setUserCoords} />
            
            <MarkerClusterGroup chunkedLoading>
              {items.map(item => (
                <Marker 
                  key={item.id} 
                  position={[item.lat, item.lng]} 
                  icon={getHandshakeIcon(item.handshake_level || 0)}
                  eventHandlers={{
                    click: () => { setBookedDates([]); fetchBookedDates(item.id); }
                  }}
                >
                  <Popup>
                    <div className="p-2 min-w-[280px] font-sans" onClick={e => e.stopPropagation()}>
                      <header className="mb-8">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="text-2xl font-bold tracking-tighter text-slate-900 leading-none">{item.title}</h4>
                          <span className="text-[8px] font-black uppercase tracking-widest px-2 py-1 bg-slate-100 rounded text-slate-400">lvl {item.handshake_level || 0}</span>
                        </div>
                        <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Владелец: {item.owner_full_name || 'Участник'}</p>
                      </header>
                      
                      <div className="space-y-8 pt-8 border-t border-slate-50">
                        <div className="flex justify-between items-baseline">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Тариф</span>
                          <span className="text-2xl font-black text-slate-900 leading-none">{item.price_per_day} <span className="text-sm font-medium text-slate-400 tracking-tighter">грн/день</span></span>
                        </div>

                        {item.owner_id !== userId ? (
                          <div className="space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <span className="text-[9px] font-bold text-slate-400 uppercase ml-1 tracking-widest">Старт</span>
                                <DatePicker 
                                  selected={startDate} 
                                  onChange={(date: Date | null) => setStartDate(date)} 
                                  excludeDates={bookedDates}
                                  className="w-full text-[11px] font-bold p-4 bg-slate-50 rounded-2xl border-none outline-none focus:ring-1 focus:ring-slate-200" 
                                  placeholderText="Дата" 
                                />
                              </div>
                              <div className="space-y-2">
                                <span className="text-[9px] font-bold text-slate-400 uppercase ml-1 tracking-widest">Финиш</span>
                                <DatePicker 
                                  selected={endDate} 
                                  onChange={(date: Date | null) => setEndDate(date)} 
                                  excludeDates={bookedDates}
                                  className="w-full text-[11px] font-bold p-4 bg-slate-50 rounded-2xl border-none outline-none focus:ring-1 focus:ring-slate-200" 
                                  placeholderText="Дата" 
                                />
                              </div>
                            </div>
                            <button onClick={() => handleBooking(item.id)} className="w-full py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-bold uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-xl shadow-slate-200">Забронировать</button>
                          </div>
                        ) : (
                          <div className="text-center py-4 bg-slate-50 rounded-2xl text-[10px] font-bold text-slate-400 uppercase tracking-widest border border-dashed border-slate-200">Ваше объявление</div>
                        )}
                      </div>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MarkerClusterGroup>
            {newItemCoords && <Marker position={newItemCoords} icon={getHandshakeIcon(0)} />}
          </MapContainer>
        </div>
      </div>
    </div>
  );
}