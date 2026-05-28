import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Tag, Plus, Edit3, Trash2, AlertCircle, CheckCircle, RefreshCw, Percent, Gift, DollarSign } from 'lucide-react';
import { getVendorCoupons, createVendorCoupon, updateVendorCoupon, deleteVendorCoupon } from '../services/api';

export default function VendorCoupons() {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const today = () => new Date().toISOString().split('T')[0];
  const nextMonth = () => { const d = new Date(); d.setMonth(d.getMonth() + 1); return d.toISOString().split('T')[0]; };
  const [form, setForm] = useState({ code: '', description: '', discountType: 'percentage', discountValue: '', maxDiscountAmount: '', minOrderAmount: '', usageLimit: '', startDate: today(), endDate: nextMonth(), isActive: true });

  useEffect(() => { loadCoupons(); }, []);

  const loadCoupons = async () => { try { setLoading(true); const res = await getVendorCoupons(); if (res.data?.success) setCoupons(res.data.coupons || res.data.data || []); } catch { setError('Failed to load coupons'); } finally { setLoading(false); } };

  const handleSubmit = async (e) => {
    e.preventDefault(); setError(null);
    if (!form.code?.trim()) { setError('Coupon code is required'); return; }
    try {
      const payload = {
        code: form.code,
        description: form.description,
        discountType: form.discountType,
        discountValue: parseFloat(form.discountValue) || 0,
        maxDiscountAmount: form.maxDiscountAmount ? parseFloat(form.maxDiscountAmount) : null,
        minOrderAmount: parseFloat(form.minOrderAmount) || 0,
        usageLimit: form.usageLimit ? parseInt(form.usageLimit) : null,
        startDate: form.startDate,
        endDate: form.endDate,
        isActive: form.isActive
      };
      if (editing) await updateVendorCoupon(editing, payload); else await createVendorCoupon(payload);
      setModalOpen(false); setEditing(null); setForm({ code:'', description:'', discountType:'percentage', discountValue:'', maxDiscountAmount:'', minOrderAmount:'', usageLimit:'', startDate: today(), endDate: nextMonth(), isActive: true });
      loadCoupons();
    } catch (err) { setError(err.response?.data?.error || 'Failed to save coupon'); }
  };

  const handleDelete = async (id) => { if (!window.confirm('Delete this coupon?')) return; try { await deleteVendorCoupon(id); loadCoupons(); } catch { setError('Failed to delete'); } };

  const openEdit = (c) => { setEditing(c.id); setForm({ code: c.code, description: c.description || '', discountType: c.discount_type || 'percentage', discountValue: c.discount_value?.toString() || '', maxDiscountAmount: c.max_discount_amount?.toString() || '', minOrderAmount: c.min_order_amount?.toString() || '', usageLimit: c.usage_limit?.toString() || '', startDate: (c.start_date || today()).split('T')[0], endDate: (c.end_date || nextMonth()).split('T')[0], isActive: c.is_active !== false }); setModalOpen(true); };

  const typeIcons = { percentage: Percent, fixed_amount: DollarSign, free_shipping: Gift };

  if (loading) return <div className="flex items-center justify-center py-20"><div className="animate-spin h-12 w-12 border-4 border-emerald-200 border-t-emerald-600 rounded-full" /></div>;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-gray-900">My Coupons</h1><p className="text-gray-500">Manage promotional coupons for your store</p></div>
        <button onClick={() => { setEditing(null); setForm({ code:'', description:'', discountType:'percentage', discountValue:'', maxDiscountAmount:'', minOrderAmount:'', usageLimit:'', startDate: today(), endDate: nextMonth(), isActive:true }); setModalOpen(true); }} className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-xl flex items-center gap-2"><Plus size={16} />Create Coupon</button>
      </div>

      {error && <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3"><AlertCircle size={20} className="text-red-600" /><span className="text-red-700">{error}</span></div>}

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {coupons.length === 0 ? <div className="text-center py-16 text-gray-400"><Tag size={48} className="mx-auto mb-3 text-gray-300" /><p className="font-medium">No coupons yet</p><p className="text-sm">Create your first coupon to start attracting customers</p></div> :
        <table className="w-full"><thead><tr className="border-b border-gray-100 bg-gray-50/50"><th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Code</th><th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Type</th><th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Discount</th><th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Usage</th><th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th><th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Actions</th></tr></thead>
        <tbody>{coupons.map((c, i) => {
          const Icon = typeIcons[c.discount_type] || Tag;
          return (
            <motion.tr key={c.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }} className="border-b border-gray-50 hover:bg-gray-50/50">
              <td className="px-4 py-3"><span className="text-sm font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded">{c.code}</span></td>
              <td className="px-4 py-3"><div className="flex items-center gap-1.5 text-sm text-gray-700"><Icon size={14} /> <span className="capitalize">{c.discount_type}</span></div></td>
              <td className="px-4 py-3 text-sm font-medium text-gray-900">{c.discount_type === 'free_shipping' ? 'Free Shipping' : c.discount_type === 'percentage' ? `${c.discount_value}%` : `$${c.discount_value}`}</td>
              <td className="px-4 py-3 text-sm text-gray-500">{c.usage_count || 0}/{c.usage_limit || '∞'}</td>
              <td className="px-4 py-3"><span className={`px-2.5 py-1 rounded-full text-xs font-medium ${c.is_active !== false ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{c.is_active !== false ? 'Active' : 'Inactive'}</span></td>
              <td className="px-4 py-3 text-right"><div className="flex items-center justify-end gap-1"><button onClick={() => openEdit(c)} className="p-1.5 hover:bg-gray-100 rounded-lg"><Edit3 size={14} className="text-gray-400" /></button><button onClick={() => handleDelete(c.id)} className="p-1.5 hover:bg-red-50 rounded-lg"><Trash2 size={14} className="text-red-400" /></button></div></td>
            </motion.tr>
          );
        })}</tbody></table>}
      </div>

      {modalOpen && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setModalOpen(false)}>
          <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="bg-white rounded-2xl p-6 max-w-md w-full" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">{editing ? 'Edit Coupon' : 'Create Coupon'}</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Code</label><input value={form.code} onChange={e => setForm({...form, code: e.target.value.toUpperCase()})} placeholder="e.g. SAVE20" className="w-full px-3 py-2 border rounded-xl text-sm uppercase font-mono" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Description</label><input value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="e.g. Summer Sale" className="w-full px-3 py-2 border rounded-xl text-sm" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Type</label><select value={form.discountType} onChange={e => setForm({...form, discountType: e.target.value})} className="w-full px-3 py-2 border rounded-xl text-sm">{['percentage','fixed_amount','free_shipping'].map(t => <option key={t}>{t}</option>)}</select></div>
              {form.discountType !== 'free_shipping' && <div><label className="block text-sm font-medium text-gray-700 mb-1">Discount Value</label><input type="number" value={form.discountValue} onChange={e => setForm({...form, discountValue: e.target.value})} className="w-full px-3 py-2 border rounded-xl text-sm" /></div>}
              {form.discountType === 'percentage' && <div><label className="block text-sm font-medium text-gray-700 mb-1">Max Discount Amount</label><input type="number" value={form.maxDiscountAmount} onChange={e => setForm({...form, maxDiscountAmount: e.target.value})} className="w-full px-3 py-2 border rounded-xl text-sm" /></div>}
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Min Order Amount</label><input type="number" value={form.minOrderAmount} onChange={e => setForm({...form, minOrderAmount: e.target.value})} className="w-full px-3 py-2 border rounded-xl text-sm" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label><input type="date" value={form.startDate} onChange={e => setForm({...form, startDate: e.target.value})} className="w-full px-3 py-2 border rounded-xl text-sm" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">End Date</label><input type="date" value={form.endDate} onChange={e => setForm({...form, endDate: e.target.value})} className="w-full px-3 py-2 border rounded-xl text-sm" /></div>
              </div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Usage Limit</label><input type="number" value={form.usageLimit} onChange={e => setForm({...form, usageLimit: e.target.value})} className="w-full px-3 py-2 border rounded-xl text-sm" /></div>
              <div className="flex items-center justify-between"><span className="text-sm text-gray-700">Active</span><button type="button" onClick={() => setForm({...form, isActive: !form.isActive})} className={`w-11 h-6 rounded-full transition-colors ${form.isActive ? 'bg-emerald-500' : 'bg-gray-300'}`}><div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${form.isActive ? 'translate-x-5' : 'translate-x-0.5'}`} /></button></div>
              <div className="flex gap-3 pt-2"><button type="button" onClick={() => setModalOpen(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm">Cancel</button><button type="submit" className="flex-1 py-2.5 bg-emerald-600 text-white rounded-xl text-sm">{editing ? 'Update' : 'Create'}</button></div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </motion.div>
  );
}