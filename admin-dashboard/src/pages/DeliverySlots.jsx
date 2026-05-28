import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Clock, Package, RefreshCw, AlertCircle } from 'lucide-react';
import { getDeliverySlots } from '../services/api';

const slotIcons = { standard: Package, express: Clock, morning: Clock, evening: Clock };

export default function DeliverySlots() {
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => { fetchSlots(); }, []);

  const fetchSlots = async () => {
    try { setLoading(true); setError(null); const res = await getDeliverySlots(); if (res.data?.success) setSlots(res.data.slots || res.data.data || []); }
    catch { setError('Failed to load delivery slots'); } finally { setLoading(false); }
  };

  if (loading) return <div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-4 border-emerald-200 border-t-emerald-600" /></div>;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Delivery Slots</h1>
          <p className="text-gray-500">Manage available delivery time slots</p>
        </div>
        <button onClick={fetchSlots} className="px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 flex items-center gap-2"><RefreshCw size={16} />Refresh</button>
      </div>

      {error && <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3"><AlertCircle size={20} className="text-red-600" /><span className="text-red-700">{error}</span></div>}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {slots.length === 0 ? (
          <div className="col-span-full text-center py-16 text-gray-400">No delivery slots configured yet</div>
        ) : (
          slots.map((slot, i) => {
            const Icon = slotIcons[slot.slot_type] || Package;
            return (
              <motion.div key={slot.id || i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-cyan-100 flex items-center justify-center"><Icon size={22} className="text-cyan-600" /></div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{slot.slot_name || slot.name}</h3>
                    <p className="text-sm text-gray-500 mt-0.5">{slot.start_time} - {slot.end_time}</p>
                    <p className="text-xs text-gray-400 mt-1 capitalize">Type: {slot.slot_type || 'standard'}</p>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${slot.is_active !== false ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                    {slot.is_active !== false ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </motion.div>
  );
}