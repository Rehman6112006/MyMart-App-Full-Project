import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell, Send, Mail, MessageSquare, Smartphone, User,
  Check, X, Plus, FileText, List,
  Clock, Loader, AlertCircle, RefreshCw,
  CheckCheck
} from 'lucide-react';
import {
  getAdminNotifications,
  markAllNotificationsRead,
  getNotificationTemplates,
  createNotificationTemplate,
  sendNotification,
  sendEmailNotification,
  sendSMSNotification,
  getNotificationLogs
} from '../services/api';

const tabs = [
  { id: 'notifications', label: 'All Notifications', icon: Bell },
  { id: 'send', label: 'Send Notification', icon: Send },
  { id: 'templates', label: 'Templates', icon: FileText },
  { id: 'logs', label: 'Logs', icon: List }
];

const typeColors = {
  email: 'bg-blue-100 text-blue-700 border-blue-200',
  sms: 'bg-green-100 text-green-700 border-green-200',
  push: 'bg-purple-100 text-purple-700 border-purple-200',
  whatsapp: 'bg-teal-100 text-teal-700 border-teal-200'
};

const statusColors = {
  sent: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-700',
  pending: 'bg-yellow-100 text-yellow-700'
};

function TabButton({ tab, isActive, onClick }) {
  const Icon = tab.icon;
  return (
    <motion.button
      whileHover={{ y: -1 }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className={`relative flex items-center gap-2 px-5 py-3 rounded-xl font-medium text-sm transition-all ${
        isActive
          ? 'bg-white shadow-lg shadow-emerald-200/50 text-emerald-700'
          : 'text-gray-500 hover:text-gray-700 hover:bg-white/50'
      }`}
    >
      <Icon size={16} />
      {tab.label}
    </motion.button>
  );
}

function NotificationsTab() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetch = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await getAdminNotifications();
      setNotifications(data?.notifications || data?.data || []);
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetch(); }, []);

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch {}
  };

  if (loading) return <div className="flex justify-center py-20"><Loader className="animate-spin text-emerald-500" size={40} /></div>;
  if (error) return <div className="text-center py-20 text-red-500 flex flex-col items-center gap-3"><AlertCircle size={40} /><p>{error}</p><button onClick={fetch} className="text-sm text-emerald-600 hover:underline">Retry</button></div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-gray-500">{notifications.length} notification{notifications.length !== 1 && 's'}</p>
        {notifications.some(n => !n.is_read) && (
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleMarkAllRead}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-xl hover:bg-emerald-100 transition-colors text-sm font-medium"
          ><CheckCheck size={16} /> Mark all as read</motion.button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="text-center py-20 text-gray-400 flex flex-col items-center gap-3">
          <Bell size={48} className="text-gray-300" />
          <p className="font-medium">No notifications yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {notifications.map((n, i) => (
              <motion.div key={n.id || i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className={`p-4 rounded-xl border transition-all ${
                  n.is_read ? 'bg-white border-gray-100' : 'bg-emerald-50 border-emerald-200 shadow-sm'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    n.is_read ? 'bg-gray-100 text-gray-400' : 'bg-emerald-100 text-emerald-600'
                  }`}>
                    {n.type ? (
                      n.type === 'email' ? <Mail size={18} /> :
                      n.type === 'sms' ? <MessageSquare size={18} /> :
                      n.type === 'whatsapp' ? <Smartphone size={18} /> :
                      <Bell size={18} />
                    ) : <Bell size={18} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className={`font-semibold truncate ${n.is_read ? 'text-gray-700' : 'text-emerald-800'}`}>{n.title}</h4>
                      {!n.is_read && <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />}
                      {n.type && (
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${typeColors[n.type] || 'bg-gray-100 text-gray-600'}`}>{n.type.toUpperCase()}</span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 line-clamp-2">{n.message}</p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                      <span className="flex items-center gap-1"><Clock size={12} />{new Date(n.created_at || n.sent_at).toLocaleString()}</span>
                      {n.recipient && <span className="flex items-center gap-1"><User size={12} />{n.recipient}</span>}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

function SendTab() {
  const [form, setForm] = useState({ type: 'email', title: '', message: '', recipient: '' });
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSending(true);
    setSuccess(false);
    try {
      const payload = { ...form, recipients: form.recipient.split(',').map(r => r.trim()).filter(Boolean) };
      delete payload.recipient;
      if (form.type === 'email') await sendEmailNotification(payload);
      else if (form.type === 'sms') await sendSMSNotification(payload);
      else await sendNotification(payload);
      setSuccess(true);
      setForm({ type: 'email', title: '', message: '', recipient: '' });
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to send notification');
    } finally {
      setSending(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-5">
      {success && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 font-medium flex items-center gap-2"
        ><Check size={18} /> Notification sent successfully</motion.div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
        <div className="grid grid-cols-4 gap-2">
          {['email', 'sms', 'push', 'whatsapp'].map(type => (
            <motion.button type="button" key={type} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              onClick={() => setForm(p => ({ ...p, type }))}
              className={`p-3 rounded-xl border-2 text-sm font-medium capitalize transition-all flex flex-col items-center gap-1 ${
                form.type === type ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'
              }`}
            >
              {type === 'email' ? <Mail size={20} /> : type === 'sms' ? <MessageSquare size={20} /> : type === 'push' ? <Bell size={20} /> : <Smartphone size={20} />}
              {type}
            </motion.button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Recipient(s)</label>
        <input type="text" value={form.recipient} onChange={e => setForm(p => ({ ...p, recipient: e.target.value }))}
          placeholder="user@example.com or comma-separated list"
          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition-all text-sm"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
        <input type="text" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
          placeholder="Notification title"
          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition-all text-sm"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Message</label>
        <textarea value={form.message} onChange={e => setForm(p => ({ ...p, message: e.target.value }))}
          placeholder="Write your notification message..."
          rows={5}
          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition-all text-sm resize-none"
          required
        />
      </div>

      <motion.button type="submit" disabled={sending} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
        className="w-full px-6 py-3 bg-gradient-to-r from-emerald-600 to-green-600 text-white font-semibold rounded-xl hover:from-emerald-700 hover:to-green-700 disabled:opacity-50 transition-all shadow-lg shadow-emerald-200 flex items-center justify-center gap-2"
      >
        {sending ? <><Loader className="animate-spin" size={18} /> Sending...</> : <><Send size={18} /> Send Notification</>}
      </motion.button>
    </form>
  );
}

function TemplatesTab() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', type: 'email', subject: '', message: '' });
  const [creating, setCreating] = useState(false);

  const fetch = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await getNotificationTemplates();
      setTemplates(data?.templates || data?.data || []);
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetch(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      await createNotificationTemplate(form);
      setShowModal(false);
      setForm({ name: '', type: 'email', subject: '', message: '' });
      fetch();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create template');
    } finally {
      setCreating(false);
    }
  };

  if (loading) return <div className="flex justify-center py-20"><Loader className="animate-spin text-emerald-500" size={40} /></div>;
  if (error) return <div className="text-center py-20 text-red-500 flex flex-col items-center gap-3"><AlertCircle size={40} /><p>{error}</p><button onClick={fetch} className="text-sm text-emerald-600 hover:underline">Retry</button></div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-gray-500">{templates.length} template{templates.length !== 1 && 's'}</p>
        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-xl text-sm font-medium shadow-lg shadow-emerald-200"
        ><Plus size={16} /> Create Template</motion.button>
      </div>

      {templates.length === 0 ? (
        <div className="text-center py-20 text-gray-400 flex flex-col items-center gap-3">
          <FileText size={48} className="text-gray-300" />
          <p className="font-medium">No templates yet</p>
          <button onClick={() => setShowModal(true)} className="text-sm text-emerald-600 hover:underline">Create your first template</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <AnimatePresence>
            {templates.map((t, i) => (
              <motion.div key={t.id || i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className="p-5 bg-white rounded-xl border border-gray-100 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600">
                      <FileText size={18} />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-800">{t.name}</h4>
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${typeColors[t.type] || 'bg-gray-100 text-gray-600'}`}>{t.type?.toUpperCase()}</span>
                    </div>
                  </div>
                </div>
                {t.subject && <p className="text-xs text-gray-400 mb-1"><span className="font-medium">Subject:</span> {t.subject}</p>}
                <p className="text-sm text-gray-500 line-clamp-3">{t.message}</p>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      <AnimatePresence>
        {showModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 z-50 backdrop-blur-sm" onClick={() => setShowModal(false)}
            />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
            >
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600"><FileText size={20} /></div>
                    <h3 className="text-lg font-bold text-gray-800">Create Template</h3>
                  </div>
                  <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-lg"><X size={18} /></button>
                </div>
                <form onSubmit={handleCreate} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Template Name</label>
                    <input type="text" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                      placeholder="e.g. Order Confirmation" className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                    <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none text-sm"
                    >
                      <option value="email">Email</option>
                      <option value="sms">SMS</option>
                      <option value="push">Push</option>
                      <option value="whatsapp">WhatsApp</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Subject (optional)</label>
                    <input type="text" value={form.subject} onChange={e => setForm(p => ({ ...p, subject: e.target.value }))}
                      placeholder="Email subject line" className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                    <textarea value={form.message} onChange={e => setForm(p => ({ ...p, message: e.target.value }))}
                      placeholder="Template message content" rows={4}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none text-sm resize-none"
                      required
                    />
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button type="button" onClick={() => setShowModal(false)}
                      className="flex-1 px-4 py-3 border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 font-medium text-sm"
                    >Cancel</button>
                    <motion.button type="submit" disabled={creating} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                      className="flex-1 px-4 py-3 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-xl font-medium text-sm shadow-lg shadow-emerald-200 disabled:opacity-50 flex items-center justify-center gap-2"
                    >{creating ? <><Loader className="animate-spin" size={16} /> Creating...</> : 'Create Template'}</motion.button>
                  </div>
                </form>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function LogsTab() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetch = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await getNotificationLogs();
      setLogs(data?.logs || data?.data || []);
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to load logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetch(); }, []);

  if (loading) return <div className="flex justify-center py-20"><Loader className="animate-spin text-emerald-500" size={40} /></div>;
  if (error) return <div className="text-center py-20 text-red-500 flex flex-col items-center gap-3"><AlertCircle size={40} /><p>{error}</p><button onClick={fetch} className="text-sm text-emerald-600 hover:underline">Retry</button></div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-gray-500">{logs.length} log entry{logs.length !== 1 && 's'}</p>
        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={fetch}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 text-sm font-medium"
        ><RefreshCw size={16} /> Refresh</motion.button>
      </div>

      {logs.length === 0 ? (
        <div className="text-center py-20 text-gray-400 flex flex-col items-center gap-3">
          <List size={48} className="text-gray-300" />
          <p className="font-medium">No logs yet</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-100">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Type</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Recipient</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Title</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Status</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Sent At</th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence>
                {logs.map((log, i) => (
                  <motion.tr key={log.id || i} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-full border ${typeColors[log.type] || 'bg-gray-100 text-gray-600'}`}>
                        {log.type === 'email' ? <Mail size={12} /> : log.type === 'sms' ? <MessageSquare size={12} /> : log.type === 'whatsapp' ? <Smartphone size={12} /> : <Bell size={12} />}
                        {log.type?.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{log.recipient || log.to || '-'}</td>
                    <td className="px-4 py-3 font-medium text-gray-800">{log.title || log.subject || '-'}</td>
                    <td className="px-4 py-3">
                      <span className={`text-[11px] font-medium px-2.5 py-1 rounded-full ${statusColors[log.status] || 'bg-gray-100 text-gray-600'}`}>
                        {log.status?.toUpperCase() || 'UNKNOWN'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{new Date(log.sent_at || log.created_at).toLocaleString()}</td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function Notifications() {
  const [activeTab, setActiveTab] = useState('notifications');

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-200">
          <Bell size={24} className="text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Notification Center</h1>
          <p className="text-sm text-gray-500">Manage and send platform notifications</p>
        </div>
      </div>

      <div className="flex gap-2 p-1.5 bg-gray-100/80 rounded-2xl overflow-x-auto">
        {tabs.map(tab => (
          <TabButton key={tab.id} tab={tab} isActive={activeTab === tab.id} onClick={() => setActiveTab(tab.id)} />
        ))}
      </div>

      <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
        {activeTab === 'notifications' && <NotificationsTab />}
        {activeTab === 'send' && <SendTab />}
        {activeTab === 'templates' && <TemplatesTab />}
        {activeTab === 'logs' && <LogsTab />}
      </motion.div>
    </div>
  );
}