import React, { useState, useEffect } from 'react';
import {
  getCoupons, createCoupon, updateCoupon, deleteCoupon,
  toggleCouponStatus, getCouponAnalytics
} from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Tag, RefreshCw, Plus, Edit2, Trash2, X, Save, AlertCircle, CheckCircle,
  Search, Percent, DollarSign, Truck, ToggleLeft, ToggleRight
} from 'lucide-react';

const couponTypes = [
  { value: 'percentage', label: 'Percentage', icon: Percent },
  { value: 'fixed_amount', label: 'Fixed Amount', icon: DollarSign },
  { value: 'free_shipping', label: 'Free Shipping', icon: Truck },
];

const applicableOptions = [
  { value: 'all', label: 'All' },
  { value: 'stores', label: 'Stores' },
  { value: 'categories', label: 'Categories' },
];

const filterTabs = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'expired', label: 'Expired' },
  { value: 'inactive', label: 'Inactive' },
];

const todayStr = () => new Date().toISOString().slice(0, 16);

const emptyForm = {
  code: '',
  description: '',
  discountType: 'percentage',
  discountValue: '',
  maxDiscountAmount: '',
  minOrderAmount: '',
  usageLimit: '',
  startDate: todayStr(),
  endDate: '',
  applicableType: 'all',
  applicableIds: '',
  isActive: true,
};

function parseApiCoupon(c) {
  return {
    ...c,
  };
}

export default function Coupons() {
  const [coupons, setCoupons] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editCoupon, setEditCoupon] = useState(null);
  const [formData, setFormData] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [togglingId, setTogglingId] = useState(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [couponsRes, analyticsRes] = await Promise.all([
        getCoupons(),
        getCouponAnalytics().catch(() => null),
      ]);
      const data = couponsRes.data?.coupons || couponsRes.data?.data || [];
      setCoupons(Array.isArray(data) ? data : []);
      if (analyticsRes?.data) {
        setAnalytics(analyticsRes.data);
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredCoupons = coupons.filter((c) => {
    const q = search.toLowerCase();
    if (q && !(c.code?.toLowerCase().includes(q) || c.description?.toLowerCase().includes(q))) return false;
    if (activeFilter === 'active') return c.is_active !== false && new Date(c.end_date) >= new Date();
    if (activeFilter === 'inactive') return c.is_active === false;
    if (activeFilter === 'expired') return c.end_date && new Date(c.end_date) < new Date();
    return true;
  });

  const openAddModal = () => {
    setEditCoupon(null);
    setFormData({ ...emptyForm, endDate: new Date(Date.now() + 30*24*60*60*1000).toISOString().slice(0, 16) });
    setShowModal(true);
  };

  const openEditModal = (coupon) => {
    setEditCoupon(coupon);
    setFormData({
      code: coupon.code || '',
      description: coupon.description || '',
      discountType: coupon.discount_type || 'percentage',
      discountValue: coupon.discount_value?.toString() || '',
      maxDiscountAmount: coupon.max_discount_amount?.toString() || '',
      minOrderAmount: coupon.min_order_amount?.toString() || '0',
      usageLimit: coupon.usage_limit?.toString() || '',
      startDate: coupon.start_date ? coupon.start_date.slice(0, 16) : todayStr(),
      endDate: coupon.end_date ? coupon.end_date.slice(0, 16) : '',
      applicableType: coupon.applicable_stores?.length ? 'stores' : coupon.applicable_categories?.length ? 'categories' : 'all',
      applicableIds: (coupon.applicable_stores || coupon.applicable_categories || [])?.join(', ') || '',
      isActive: coupon.is_active !== false,
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.code.trim()) { setError('Coupon code is required'); return; }
    try {
      setSaving(true);
      setError(null);

      const payload = {
        code: formData.code.toUpperCase(),
        description: formData.description,
        discountType: formData.discountType,
        discountValue: parseFloat(formData.discountValue) || 0,
        minOrderAmount: parseFloat(formData.minOrderAmount) || 0,
        maxDiscountAmount: formData.maxDiscountAmount ? parseFloat(formData.maxDiscountAmount) : null,
        usageLimit: formData.usageLimit ? parseInt(formData.usageLimit, 10) : null,
        startDate: formData.startDate ? new Date(formData.startDate).toISOString() : null,
        endDate: formData.endDate ? new Date(formData.endDate).toISOString() : null,
        isActive: formData.isActive,
        applicableStores: formData.applicableType === 'stores' && formData.applicableIds.trim()
          ? formData.applicableIds.split(',').map(s => s.trim()).filter(Boolean) : null,
        applicableCategories: formData.applicableType === 'categories' && formData.applicableIds.trim()
          ? formData.applicableIds.split(',').map(s => s.trim()).filter(Boolean) : null,
      };

      if (editCoupon) {
        await updateCoupon(editCoupon.id, payload);
        setSuccessMsg('Coupon updated successfully!');
      } else {
        await createCoupon(payload);
        setSuccessMsg('Coupon created successfully!');
      }

      setShowModal(false);
      await loadData();
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (coupon) => {
    try {
      await deleteCoupon(coupon.id);
      setSuccessMsg('Coupon deleted successfully!');
      setConfirmDelete(null);
      await loadData();
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    }
  };

  const handleToggle = async (coupon) => {
    try {
      setTogglingId(coupon.id);
      await toggleCouponStatus(coupon.id);
      setCoupons((prev) =>
        prev.map((c) => c.id === coupon.id ? { ...c, is_active: !c.is_active } : c)
      );
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setTogglingId(null);
    }
  };

  const isExpired = (c) => c.end_date && new Date(c.end_date) < new Date();

  const formatDate = (d) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const usagePercent = (c) => {
    if (!c.usage_limit) return null;
    const used = parseInt(c.usage_count || 0);
    return Math.min(Math.round((used / c.usage_limit) * 100), 100);
  };

  const discountLabel = (c) => {
    if (c.discount_type === 'free_shipping') return 'FREE';
    if (c.discount_type === 'percentage') return `${c.discount_value}%`;
    return `Rs. ${c.discount_value}`;
  };

  const renderAnalyticsCards = () => {
    if (!analytics) return null;
    const o = analytics.overall || {};
    const s = analytics.statusBreakdown || {};
    const cards = [
      { label: 'Total Coupons', value: coupons.length, color: 'from-emerald-500 to-green-600', icon: Tag },
      { label: 'Active Coupons', value: s.active ?? coupons.filter(c => c.is_active && !isExpired(c)).length, color: 'from-blue-500 to-cyan-600', icon: CheckCircle },
      { label: 'Total Redemptions', value: o.total_usages ?? coupons.reduce((a, c) => a + (parseInt(c.usage_count) || 0), 0), color: 'from-purple-500 to-violet-600', icon: Percent },
      { label: 'Total Discount Given', value: o.total_discount_given ? `Rs. ${parseFloat(o.total_discount_given).toFixed(0)}` : '—', color: 'from-orange-500 to-red-500', icon: DollarSign },
    ];

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {cards.map((card, i) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 font-medium">{card.label}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{card.value}</p>
                </div>
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${card.color} flex items-center justify-center shadow-lg`}>
                  <Icon size={22} className="text-white" />
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Coupons</h1>
          <p className="text-gray-500">Manage discount coupons and promotions</p>
        </div>
        <div className="flex gap-3">
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={loadData} className="px-4 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-all flex items-center gap-2">
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} /> Refresh
          </motion.button>
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={openAddModal} className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-xl hover:from-emerald-700 hover:to-green-700 transition-all shadow-lg shadow-emerald-500/30 flex items-center gap-2">
            <Plus size={18} /> Create Coupon
          </motion.button>
        </div>
      </motion.div>

      <AnimatePresence>
        {successMsg && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
            <CheckCircle size={20} className="text-green-600" />
            <span className="text-green-700">{successMsg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
          <AlertCircle size={20} className="text-red-600" />
          <span className="text-red-700">{error}</span>
        </div>
      )}

      {!loading && renderAnalyticsCards()}

      {!loading && (
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by code or description..." className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none bg-white" />
          </div>
          <div className="flex gap-2 flex-wrap">
            {filterTabs.map((tab) => (
              <motion.button key={tab.value} whileTap={{ scale: 0.97 }} onClick={() => setActiveFilter(tab.value)} className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${activeFilter === tab.value ? 'bg-gradient-to-r from-emerald-600 to-green-600 text-white shadow-lg shadow-emerald-500/20' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                {tab.label}
              </motion.button>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-12 h-12 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
        </div>
      ) : filteredCoupons.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-16 text-center">
          <Tag size={72} className="mx-auto mb-4 text-gray-300" />
          <h3 className="text-xl font-semibold text-gray-900">{search || activeFilter !== 'all' ? 'No Coupons Found' : 'No Coupons Yet'}</h3>
          <p className="text-gray-500 mt-1 max-w-md mx-auto">{search || activeFilter !== 'all' ? 'Try adjusting your search or filter criteria' : 'Create your first coupon to start offering discounts'}</p>
          {!search && activeFilter === 'all' && (
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={openAddModal} className="mt-6 px-6 py-3 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-xl hover:from-emerald-700 hover:to-green-700 shadow-lg shadow-emerald-500/30 inline-flex items-center gap-2">
              <Plus size={18} /> Create Coupon
            </motion.button>
          )}
        </motion.div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Code</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Description</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Discount</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Usage</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Validity</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Status</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredCoupons.map((coupon, i) => {
                  const expired = isExpired(coupon);
                  const usagePct = usagePercent(coupon);
                  const Icon = coupon.discount_type === 'free_shipping' ? Truck : coupon.discount_type === 'percentage' ? Percent : DollarSign;
                  return (
                    <motion.tr key={coupon.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }} className="hover:bg-gray-50/80 transition-colors group">
                      <td className="px-6 py-4">
                        <span className="inline-block px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg text-sm font-bold tracking-wider">{coupon.code}</span>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-medium text-gray-900 truncate max-w-[200px]">{coupon.description || '—'}</p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs font-medium">
                            <Icon size={12} /> {coupon.discount_type?.replace('_', ' ') || 'percentage'}
                          </span>
                          <span className="font-semibold text-gray-900">{discountLabel(coupon)}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1 min-w-[140px]">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-500">{coupon.usage_count || 0}{coupon.usage_limit ? ` / ${coupon.usage_limit}` : ''}</span>
                            {usagePct != null && <span className="text-xs font-medium text-gray-600">{usagePct}%</span>}
                          </div>
                          {usagePct != null && (
                            <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <motion.div initial={{ width: 0 }} animate={{ width: `${usagePct}%` }} transition={{ duration: 0.8, ease: 'easeOut' }} className={`h-full rounded-full ${usagePct >= 90 ? 'bg-red-500' : usagePct >= 60 ? 'bg-yellow-500' : 'bg-emerald-500'}`} />
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col text-sm">
                          <span className="text-gray-500">{formatDate(coupon.start_date)}</span>
                          <span className="text-gray-400">→ {formatDate(coupon.end_date)}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {expired ? (
                          <span className="inline-flex items-center px-2.5 py-1 bg-red-50 text-red-700 rounded-lg text-xs font-medium">Expired</span>
                        ) : coupon.is_active ? (
                          <span className="inline-flex items-center px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-medium">Active</span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-1 bg-gray-100 text-gray-600 rounded-lg text-xs font-medium">Inactive</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-1.5 opacity-60 group-hover:opacity-100 transition-opacity">
                          <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => handleToggle(coupon)} disabled={togglingId === coupon.id} className={`p-2 rounded-lg transition-colors ${coupon.is_active ? 'hover:bg-yellow-50 text-yellow-600' : 'hover:bg-emerald-50 text-emerald-600'}`} title={coupon.is_active ? 'Deactivate' : 'Activate'}>
                            {togglingId === coupon.id ? (
                              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                            ) : coupon.is_active ? (
                              <ToggleRight size={16} />
                            ) : (
                              <ToggleLeft size={16} />
                            )}
                          </motion.button>
                          <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => openEditModal(coupon)} className="p-2 rounded-lg hover:bg-blue-50 text-blue-600">
                            <Edit2 size={16} />
                          </motion.button>
                          <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => setConfirmDelete(coupon)} className="p-2 rounded-lg hover:bg-red-50 text-red-600">
                            <Trash2 size={16} />
                          </motion.button>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <AnimatePresence>
        {confirmDelete && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setConfirmDelete(null)}>
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="bg-white rounded-2xl w-full max-w-sm overflow-hidden" onClick={(e) => e.stopPropagation()}>
              <div className="p-6 text-center">
                <div className="w-16 h-16 mx-auto bg-red-100 rounded-2xl flex items-center justify-center mb-4">
                  <Trash2 size={32} className="text-red-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">Delete Coupon</h3>
                <p className="text-gray-500 mt-2">Are you sure you want to delete <strong>{confirmDelete.code}</strong>? This action cannot be undone.</p>
              </div>
              <div className="flex border-t border-gray-100">
                <button onClick={() => setConfirmDelete(null)} className="flex-1 px-4 py-3.5 text-gray-700 font-medium hover:bg-gray-50 transition-colors">Cancel</button>
                <button onClick={() => handleDelete(confirmDelete)} className="flex-1 px-4 py-3.5 bg-red-600 text-white font-medium hover:bg-red-700 transition-colors">Delete</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowModal(false)}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="p-6 border-b bg-gradient-to-r from-emerald-600 to-green-600 sticky top-0 z-10">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-white">{editCoupon ? 'Edit Coupon' : 'Create New Coupon'}</h3>
                  <button onClick={() => setShowModal(false)} className="p-1 hover:bg-white/20 rounded-lg transition-colors"><X size={20} className="text-white" /></button>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Coupon Code <span className="text-red-500">*</span></label>
                    <input type="text" value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })} placeholder="e.g. SAVE20" className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none uppercase tracking-wider" />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Discount Type</label>
                    <div className="grid grid-cols-3 gap-2">
                      {couponTypes.map((t) => {
                        const Icon = t.icon;
                        const isSelected = formData.discountType === t.value;
                        return (
                          <button key={t.value} type="button" onClick={() => setFormData({ ...formData, discountType: t.value })} className={`flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${isSelected ? 'bg-emerald-50 text-emerald-700 ring-2 ring-emerald-500' : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200'}`}>
                            <Icon size={15} /> {t.label === 'Percentage' ? '%' : t.label === 'Fixed Amount' ? 'Rs.' : ''}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
                    <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Describe what this coupon offers..." rows={2} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none resize-none" />
                  </div>

                  {formData.discountType !== 'free_shipping' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">{formData.discountType === 'percentage' ? 'Discount (%)' : 'Discount Amount (Rs.)'}</label>
                      <input type="number" value={formData.discountValue} onChange={(e) => setFormData({ ...formData, discountValue: e.target.value })} placeholder={formData.discountType === 'percentage' ? 'e.g. 20' : 'e.g. 500'} min="0" step="any" className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none" />
                    </div>
                  )}

                  {formData.discountType === 'percentage' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Max Discount (Rs.)</label>
                      <input type="number" value={formData.maxDiscountAmount} onChange={(e) => setFormData({ ...formData, maxDiscountAmount: e.target.value })} placeholder="Optional" min="0" step="any" className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none" />
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Min Order Amount (Rs.)</label>
                    <input type="number" value={formData.minOrderAmount} onChange={(e) => setFormData({ ...formData, minOrderAmount: e.target.value })} placeholder="0 = no minimum" min="0" step="any" className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none" />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Usage Limit</label>
                    <input type="number" value={formData.usageLimit} onChange={(e) => setFormData({ ...formData, usageLimit: e.target.value })} placeholder="Empty = unlimited" min="1" className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none" />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Start Date</label>
                    <input type="datetime-local" value={formData.startDate} onChange={(e) => setFormData({ ...formData, startDate: e.target.value })} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none" />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Expiry Date</label>
                    <input type="datetime-local" value={formData.endDate} onChange={(e) => setFormData({ ...formData, endDate: e.target.value })} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none" />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Applicable To</label>
                    <select value={formData.applicableType} onChange={(e) => setFormData({ ...formData, applicableType: e.target.value })} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none bg-white">
                      {applicableOptions.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>

                  {formData.applicableType !== 'all' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">{formData.applicableType === 'categories' ? 'Category IDs' : 'Store IDs'}</label>
                      <input type="text" value={formData.applicableIds} onChange={(e) => setFormData({ ...formData, applicableIds: e.target.value })} placeholder="Comma-separated UUIDs" className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none" />
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button type="button" onClick={() => setFormData({ ...formData, isActive: !formData.isActive })} className={`relative w-12 h-6 rounded-full transition-colors ${formData.isActive ? 'bg-emerald-500' : 'bg-gray-300'}`}>
                    <motion.div animate={{ x: formData.isActive ? 24 : 2 }} transition={{ type: 'spring', stiffness: 500, damping: 30 }} className="w-5 h-5 bg-white rounded-full shadow-md absolute top-0.5" />
                  </button>
                  <span className="text-sm font-medium text-gray-700">{formData.isActive ? 'Active' : 'Inactive'}</span>
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-2">
                    <AlertCircle size={16} className="text-red-600 shrink-0" />
                    <span className="text-red-700 text-sm">{error}</span>
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 font-medium transition-colors">Cancel</button>
                  <motion.button type="submit" disabled={saving} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="flex-1 px-4 py-3 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-xl hover:from-emerald-700 hover:to-green-700 font-medium disabled:opacity-50 flex items-center justify-center gap-2 transition-all">
                    {saving ? (
                      <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving...</>
                    ) : (
                      <><Save size={18} /> {editCoupon ? 'Update Coupon' : 'Create Coupon'}</>
                    )}
                  </motion.button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
