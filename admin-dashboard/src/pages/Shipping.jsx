import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Truck, Package, Search, MapPin, RefreshCw, AlertCircle, Eye, Clock } from 'lucide-react';
import { getAllShipments, getShippingProviders, updateShipmentStatus, addTrackingUpdate } from '../services/api';

export default function Shipping() {
  const [shipments, setShipments] = useState([]);
  const [providers, setProviders] = useState([]);
  const [activeTab, setActiveTab] = useState('shipments');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [updating, setUpdating] = useState(null);
  const [selectedShipment, setSelectedShipment] = useState(null);
  const [trackingNote, setTrackingNote] = useState('');

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try { setLoading(true); setError(null);
      const [shipRes, provRes] = await Promise.all([getAllShipments().catch(() => null), getShippingProviders().catch(() => null)]);
      if (shipRes?.data?.success) setShipments(shipRes.data.shipments || shipRes.data.data || []);
      if (provRes?.data?.success) setProviders(provRes.data.providers || provRes.data.data || []);
    } catch { setError('Failed to load data'); } finally { setLoading(false); }
  };

  const handleStatusUpdate = async (id, newStatus) => {
    try { setUpdating(id); await updateShipmentStatus(id, { status: newStatus }); fetchData(); if (selectedShipment?.id === id) setSelectedShipment(prev => ({ ...prev, status: newStatus })); }
    catch { setError('Failed to update status'); } finally { setUpdating(null); }
  };

  const handleAddTracking = async () => {
    if (!trackingNote.trim() || !selectedShipment) return;
    try { await addTrackingUpdate(selectedShipment.id, { note: trackingNote }); setTrackingNote(''); fetchData(); }
    catch { setError('Failed to add tracking update'); }
  };

  const filtered = shipments.filter(s => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (s.order_number || '').toLowerCase().includes(q) || (s.tracking_number || '').toLowerCase().includes(q);
  });

  const statusColors = { pending: 'bg-yellow-100 text-yellow-700', processing: 'bg-blue-100 text-blue-700', in_transit: 'bg-indigo-100 text-indigo-700', delivered: 'bg-emerald-100 text-emerald-700', cancelled: 'bg-red-100 text-red-700' };

  if (loading) return <div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-4 border-emerald-200 border-t-emerald-600" /></div>;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-gray-900">Shipping</h1><p className="text-gray-500">Manage shipments and delivery providers</p></div>
        <button onClick={fetchData} className="px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 flex items-center gap-2"><RefreshCw size={16} />Refresh</button>
      </div>

      {error && <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3"><AlertCircle size={20} className="text-red-600" /><span className="text-red-700">{error}</span></div>}

      <div className="flex gap-2 bg-gray-100 p-1 rounded-xl w-fit">
        {['shipments', 'providers'].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all capitalize ${activeTab === tab ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>{tab}</button>
        ))}
      </div>

      {activeTab === 'shipments' ? (
        <div className="space-y-4">
          <div className="relative"><Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by order or tracking number..." className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none" /></div>
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <table className="w-full"><thead><tr className="border-b border-gray-100 bg-gray-50/50"><th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Order</th><th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Carrier</th><th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Tracking</th><th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th><th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Date</th><th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Actions</th></tr></thead>
            <tbody>{filtered.length === 0 ? <tr><td colSpan={6} className="text-center py-12 text-gray-400">No shipments found</td></tr> : filtered.map((s, i) => (
              <motion.tr key={s.id || i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }} className="border-b border-gray-50 hover:bg-gray-50/50">
                <td className="px-4 py-3"><span className="text-xs font-mono text-gray-500 bg-gray-100 px-2 py-1 rounded">{s.order_number || '—'}</span></td>
                <td className="px-4 py-3 text-sm text-gray-700">{s.carrier || '—'}</td>
                <td className="px-4 py-3 text-sm text-blue-600 font-mono">{s.tracking_number || '—'}</td>
                <td className="px-4 py-3"><span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[s.status] || 'bg-gray-100 text-gray-700'}`}>{s.status?.replace('_', ' ') || 'pending'}</span></td>
                <td className="px-4 py-3 text-xs text-gray-500">{s.created_at ? new Date(s.created_at).toLocaleDateString() : '—'}</td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button onClick={() => setSelectedShipment(s)} className="p-1.5 hover:bg-gray-100 rounded-lg"><Eye size={16} className="text-gray-400" /></button>
                  </div>
                </td>
              </motion.tr>
            ))}</tbody></table>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {providers.length === 0 ? <div className="col-span-full text-center py-12 text-gray-400">No providers configured</div> : providers.map((p, i) => (
            <motion.div key={p.id || i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
              <div className="flex items-center gap-3 mb-3"><div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center"><Truck size={22} className="text-indigo-600" /></div><div><h3 className="font-semibold text-gray-900">{p.name || p.provider_name}</h3><p className="text-xs text-gray-500">{p.service_type || 'Standard'}</p></div></div>
              <div className="flex items-center justify-between text-sm"><span className="text-gray-500">Base Rate</span><span className="font-medium">${p.base_rate || '0.00'}</span></div>
            </motion.div>
          ))}
        </div>
      )}

      {selectedShipment && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedShipment(null)}>
          <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="bg-white rounded-2xl p-6 max-w-lg w-full max-h-[80vh] overflow-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4"><h3 className="font-semibold text-gray-900">Shipment Detail</h3><button onClick={() => setSelectedShipment(null)} className="text-gray-400 hover:text-gray-600">✕</button></div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between py-2 border-b"><span className="text-gray-500">Order</span><span className="font-medium">{selectedShipment.order_number}</span></div>
              <div className="flex justify-between py-2 border-b"><span className="text-gray-500">Carrier</span><span>{selectedShipment.carrier}</span></div>
              <div className="flex justify-between py-2 border-b"><span className="text-gray-500">Tracking</span><span className="font-mono text-blue-600">{selectedShipment.tracking_number}</span></div>
              <div className="flex justify-between py-2 border-b"><span className="text-gray-500">Status</span><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[selectedShipment.status] || 'bg-gray-100'}`}>{selectedShipment.status}</span></div>
            </div>
            <div className="mt-4 space-y-2"><p className="text-sm font-medium text-gray-700">Update Status</p><div className="flex gap-2">{Object.keys(statusColors).map(st => <button key={st} disabled={updating === selectedShipment.id} onClick={() => handleStatusUpdate(selectedShipment.id, st)} className={`px-3 py-1.5 text-xs rounded-lg font-medium ${selectedShipment.status === st ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>{st}</button>)}</div><div className="flex gap-2 mt-3"><input value={trackingNote} onChange={e => setTrackingNote(e.target.value)} placeholder="Add tracking update..." className="flex-1 px-3 py-2 border rounded-lg text-sm" /><button onClick={handleAddTracking} className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg">Add</button></div></div>
          </motion.div>
        </motion.div>
      )}
    </motion.div>
  );
}