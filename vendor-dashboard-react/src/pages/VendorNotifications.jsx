import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Bell, BellOff, CheckCircle, AlertCircle, Mail, MessageCircle, Smartphone, RefreshCw } from 'lucide-react';
import { getVendorNotifications, markVendorNotificationsRead } from '../services/api';

const typeIcons = { email: Mail, sms: MessageCircle, push: Bell, whatsapp: Smartphone };

export default function VendorNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => { loadNotifications(); }, []);

  const loadNotifications = async () => {
    try { setLoading(true); setError(null); const res = await getVendorNotifications(); if (res.data?.success) setNotifications(res.data.notifications || res.data.data || []); } catch { setError('Failed to load notifications'); } finally { setLoading(false); }
  };

  const handleMarkAllRead = async () => {
    try { await markVendorNotificationsRead(); setSuccess('All notifications marked as read'); setTimeout(() => setSuccess(null), 3000); loadNotifications(); } catch { setError('Failed'); }
  };

  if (loading) return <div className="flex items-center justify-center py-20"><div className="animate-spin h-12 w-12 border-4 border-emerald-200 border-t-emerald-600 rounded-full" /></div>;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-gray-900">Notifications</h1><p className="text-gray-500">Stay updated on your store activity</p></div>
        <div className="flex gap-2">
          {notifications.length > 0 && <button onClick={handleMarkAllRead} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 text-sm"><CheckCircle size={16} className="inline mr-1" />Mark All Read</button>}
          <button onClick={loadNotifications} className="px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700"><RefreshCw size={16} /></button>
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3"><AlertCircle size={20} className="text-red-600" /><span className="text-red-700">{error}</span></div>}
      {success && <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3"><CheckCircle size={20} className="text-green-600" /><span className="text-green-700">{success}</span></div>}

      <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-100">
        {notifications.length === 0 ? (
          <div className="text-center py-20 text-gray-400"><BellOff size={48} className="mx-auto mb-3 text-gray-300" /><p className="font-medium">No notifications</p><p className="text-sm">You're all caught up!</p></div>
        ) : (
          notifications.map((n, i) => {
            const Icon = typeIcons[n.type] || Bell;
            return (
              <motion.div key={n.id || i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }} className={`p-4 hover:bg-gray-50/50 flex items-start gap-4 ${!n.read && !n.is_read ? 'bg-amber-50/50' : ''}`}>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${!n.read && !n.is_read ? 'bg-amber-100' : 'bg-gray-100'}`}>
                  <Icon size={18} className={!n.read && !n.is_read ? 'text-amber-600' : 'text-gray-400'} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2"><p className="font-medium text-sm text-gray-900">{n.title || 'Notification'}</p>{!n.read && !n.is_read && <span className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0" />}</div>
                  <p className="text-sm text-gray-600 mt-0.5">{n.message || n.body || n.content}</p>
                  <p className="text-xs text-gray-400 mt-1">{n.created_at ? new Date(n.created_at).toLocaleString() : ''}</p>
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </motion.div>
  );
}