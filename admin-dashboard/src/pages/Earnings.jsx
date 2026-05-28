import React, { useState, useEffect } from 'react';
import { getSettlementAdminStats, getDashboardStats, getAdminStoreOrderStats, generateSettlement, processPayoutRequest, getAllSettlements, getAllPayoutRequests, getStores } from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Wallet, DollarSign, TrendingUp, TrendingDown,
  RefreshCw, Calendar, Download, CreditCard, Banknote,
  ChevronRight, AlertCircle, ArrowUpRight, ArrowDownRight,
  Receipt, Sparkles, Store, Users, ShoppingBag, Clock, CheckCircle,
  Plus, Loader, X
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell
} from 'recharts';

const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

const formatCurrency = (num) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(num || 0);

const formatNumber = (num) => {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num?.toLocaleString() || '0';
};

const tabs = ['Overview', 'Commission', 'Payouts'];

export default function Earnings() {
  const [settlementStats, setSettlementStats] = useState(null);
  const [dashboardStats, setDashboardStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('Overview');
  const [period, setPeriod] = useState('30');
  const [settlements, setSettlements] = useState([]);
  const [payoutRequests, setPayoutRequests] = useState([]);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [vendors, setVendors] = useState([]);
  const [generateVendorId, setGenerateVendorId] = useState('');
  const [selectedPayoutId, setSelectedPayoutId] = useState('');
  const [payoutStatus, setPayoutStatus] = useState('completed');
  const [payoutTransactionId, setPayoutTransactionId] = useState('');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      setLoading(true); setError(null);
      const [settlementRes, dashboardRes, storeOrderRes, settlementsRes, payoutsRes, vendorsRes] = await Promise.all([
        getSettlementAdminStats().catch(() => null),
        getDashboardStats(period).catch(() => null),
        getAdminStoreOrderStats().catch(() => null),
        getAllSettlements({ limit: 20 }).catch(() => null),
        getAllPayoutRequests({ limit: 20 }).catch(() => null),
        getStores().catch(() => null),
      ]);
      if (settlementRes?.data?.success) setSettlementStats(settlementRes.data.stats);
      if (dashboardRes?.data?.success) {
        const data = dashboardRes.data;
        if (storeOrderRes?.data?.success && storeOrderRes.data?.stats) data.adminStoreOrders = storeOrderRes.data.stats;
        setDashboardStats(data);
      }
      if (settlementsRes?.data?.success) setSettlements(settlementsRes.data.settlements || settlementsRes.data.data || []);
      if (payoutsRes?.data?.success) setPayoutRequests(payoutsRes.data.payouts || payoutsRes.data.data || []);
      if (vendorsRes?.data?.success) setVendors(vendorsRes.data.stores || vendorsRes.data.vendors || []);
    } catch (err) { setError(err.response?.data?.error || 'Failed to load data'); }
    finally { setLoading(false); }
  };

  const handleGenerateSettlement = async () => {
    if (!generateVendorId) return;
    try {
      setActionLoading(true);
      const res = await generateSettlement({ vendorId: generateVendorId });
      if (res.data?.success) { setShowGenerateModal(false); setGenerateVendorId(''); await loadData(); }
      else setError(res.data?.error || 'Failed to generate settlement');
    } catch { setError('Failed to generate settlement'); }
    finally { setActionLoading(false); }
  };

  const handleProcessPayout = async () => {
    if (!selectedPayoutId) return;
    try {
      setActionLoading(true);
      const res = await processPayoutRequest({ payoutRequestId: selectedPayoutId, status: payoutStatus, transactionId: payoutTransactionId || undefined });
      if (res.data?.success) { setShowPayoutModal(false); setSelectedPayoutId(''); setPayoutStatus('completed'); setPayoutTransactionId(''); await loadData(); }
      else setError(res.data?.error || 'Failed to process payout');
    } catch { setError('Failed to process payout'); }
    finally { setActionLoading(false); }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
          <p className="text-gray-500 font-medium">Loading earnings...</p>
        </div>
      </div>
    );
  }

  const monthlyStats = settlementStats?.monthlyStats || [];
  const recentSettlements = settlementStats?.recentSettlements || [];
  const topVendors = settlementStats?.topVendors || [];
  const chartRevenue = dashboardStats?.charts?.ordersByMonth || [];

  const commissionData = monthlyStats.map(m => ({
    name: new Date(m.month).toLocaleString('default', { month: 'short' }),
    commission: parseFloat(m.commission) || 0,
    net: parseFloat(m.net) || 0,
    gross: parseFloat(m.gross) || 0,
  }));

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Earnings & Commissions</h1>
          <p className="text-gray-500">Track platform revenue, commissions, and payouts</p>
        </div>
        <div className="flex items-center gap-3">
          <select value={period} onChange={(e) => { setPeriod(e.target.value); loadData(); }} className="px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none bg-white text-sm font-medium">
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
            <option value="365">Last year</option>
          </select>
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={loadData} className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-xl hover:from-emerald-700 hover:to-green-700 transition-all shadow-lg shadow-emerald-500/30 flex items-center gap-2 font-medium">
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} /> Refresh
          </motion.button>
        </div>
      </motion.div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
          <AlertCircle size={20} className="text-red-600" />
          <span className="text-red-700">{error}</span>
        </div>
      )}

      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {tabs.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab ? 'bg-white text-emerald-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}>{tab}</button>
        ))}
      </div>

      {activeTab === 'Overview' && (
        <>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-emerald-600 via-emerald-500 to-green-500 rounded-2xl p-6 lg:p-8 text-white shadow-xl shadow-emerald-500/20 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
            <div className="relative z-10">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-emerald-100 text-sm font-medium flex items-center gap-2"><Sparkles size={16} /> Platform Revenue</p>
                  <p className="text-4xl lg:text-5xl font-bold mt-2 tracking-tight">{formatCurrency(dashboardStats?.adminStoreOrders?.total_revenue || dashboardStats?.stats?.revenue?.total_revenue || 0)}</p>
                  <p className="text-emerald-200 text-sm mt-1">From {dashboardStats?.adminStoreOrders?.total || dashboardStats?.stats?.orders?.total || 0} total orders</p>
                </div>
                <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                  <Wallet size={32} className="text-white" />
                </div>
              </div>
              <div className="flex items-center gap-4 mt-4">
                <div className="flex items-center gap-2 bg-white/15 rounded-xl px-4 py-2">
                  <TrendingUp size={18} className="text-emerald-200" />
                  <span className="text-emerald-100 text-sm">{formatCurrency(dashboardStats?.stats?.revenue?.revenue_period || 0)} this period</span>
                </div>
                <div className="flex items-center gap-2 bg-white/15 rounded-xl px-4 py-2">
                  <Calendar size={18} className="text-emerald-200" />
                  <span className="text-emerald-100 text-sm">{dashboardStats?.adminStoreOrders?.total || dashboardStats?.stats?.orders?.total || 0} orders</span>
                </div>
              </div>
            </div>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} whileHover={{ y: -5 }} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(settlementStats?.pendingCommission || 0)}</p>
              <p className="text-sm text-gray-500 mt-1">Pending Commission</p>
              <p className="text-xs text-gray-400 mt-1">{settlementStats?.pendingCommissionCount || 0} transactions</p>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} whileHover={{ y: -5 }} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(settlementStats?.pendingSettlements || 0)}</p>
              <p className="text-sm text-gray-500 mt-1">Pending Settlements</p>
              <p className="text-xs text-gray-400 mt-1">{settlementStats?.pendingSettlementsCount || 0} to process</p>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} whileHover={{ y: -5 }} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <p className="text-2xl font-bold text-yellow-600">{formatCurrency(settlementStats?.pendingPayouts || 0)}</p>
              <p className="text-sm text-gray-500 mt-1">Pending Payouts</p>
              <p className="text-xs text-gray-400 mt-1">{settlementStats?.pendingPayoutsCount || 0} requests</p>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} whileHover={{ y: -5 }} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <p className="text-2xl font-bold text-gray-900">{dashboardStats?.adminStoreOrders?.delivered || dashboardStats?.stats?.orders?.delivered || 0}</p>
              <p className="text-sm text-gray-500 mt-1">Delivered Orders</p>
              <p className="text-xs text-gray-400 mt-1">{dashboardStats?.adminStoreOrders?.total || dashboardStats?.stats?.orders?.total || 0} total</p>
            </motion.div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }} className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h3 className="font-semibold text-gray-900 mb-4">Revenue Trend</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartRevenue.length > 0 ? chartRevenue : [{ month: 'No Data', revenue: 0 }]}>
                    <defs><linearGradient id="revG" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/><stop offset="95%" stopColor="#10B981" stopOpacity={0}/></linearGradient></defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                    <XAxis dataKey="month" stroke="#9CA3AF" fontSize={12} axisLine={false} tickLine={false} />
                    <YAxis stroke="#9CA3AF" fontSize={12} axisLine={false} tickLine={false} tickFormatter={(v) => `$${formatNumber(v)}`} />
                    <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #E5E7EB' }} />
                    <Area type="monotone" dataKey="revenue" stroke="#10B981" strokeWidth={3} fillOpacity={1} fill="url(#revG)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.35 }} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h3 className="font-semibold text-gray-900 mb-4">Quick Stats</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl">
                  <div className="flex items-center gap-3"><Users size={20} className="text-blue-600" /><div><p className="text-sm text-gray-500">Users</p><p className="text-lg font-bold text-gray-900">{dashboardStats?.stats?.users?.total || 0}</p></div></div>
                </div>
                <div className="flex items-center justify-between p-3 bg-gradient-to-br from-emerald-50 to-green-50 rounded-xl">
                  <div className="flex items-center gap-3"><Store size={20} className="text-emerald-600" /><div><p className="text-sm text-gray-500">Stores</p><p className="text-lg font-bold text-gray-900">{dashboardStats?.stats?.stores?.total || 0}</p></div></div>
                  <span className="text-xs text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">{dashboardStats?.stats?.stores?.verified || 0} verified</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl">
                  <div className="flex items-center gap-3"><ShoppingBag size={20} className="text-purple-600" /><div><p className="text-sm text-gray-500">Orders</p><p className="text-lg font-bold text-gray-900">{dashboardStats?.adminStoreOrders?.total || dashboardStats?.stats?.orders?.total || 0}</p></div></div>
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}

      {activeTab === 'Commission' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <p className="text-sm text-gray-500">Pending Commission</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{formatCurrency(settlementStats?.pendingCommission || 0)}</p>
              <p className="text-xs text-gray-400 mt-1">{settlementStats?.pendingCommissionCount || 0} pending transactions</p>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <p className="text-sm text-gray-500">Total Settlements</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{formatCurrency(settlementStats?.pendingSettlements || 0)}</p>
              <p className="text-xs text-gray-400 mt-1">{settlementStats?.pendingSettlementsCount || 0} pending</p>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <p className="text-sm text-gray-500">Pending Payouts</p>
              <p className="text-3xl font-bold text-yellow-600 mt-1">{formatCurrency(settlementStats?.pendingPayouts || 0)}</p>
              <p className="text-xs text-gray-400 mt-1">{settlementStats?.pendingPayoutsCount || 0} requests</p>
            </motion.div>
          </div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h3 className="font-semibold text-gray-900 mb-4">Monthly Commission History</h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={commissionData.length > 0 ? commissionData : [{ name: 'No Data', commission: 0, net: 0 }]}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="name" stroke="#9CA3AF" fontSize={12} />
                  <YAxis stroke="#9CA3AF" fontSize={12} tickFormatter={(v) => `$${formatNumber(v)}`} />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #E5E7EB' }} />
                  <Bar dataKey="commission" fill="#3B82F6" radius={[6, 6, 0, 0]} name="Commission" />
                  <Bar dataKey="net" fill="#10B981" radius={[6, 6, 0, 0]} name="Net" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          {topVendors.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-white rounded-2xl shadow-sm border border-gray-100">
              <div className="p-6 border-b border-gray-100"><h3 className="font-semibold text-gray-900">Top Vendors (30 days)</h3></div>
              <div className="divide-y divide-gray-50">
                {topVendors.map((v, i) => (
                  <div key={v.id || i} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center text-white font-bold text-sm">{(v.first_name?.[0] || 'V').toUpperCase()}</div>
                      <div><p className="font-medium text-gray-900">{v.first_name} {v.last_name}</p><p className="text-sm text-gray-500">{v.transaction_count} transactions</p></div>
                    </div>
                    <div className="text-right"><p className="font-bold text-gray-900">{formatCurrency(v.total_earned)}</p><p className="text-xs text-gray-400">Commission: {formatCurrency(v.total_commission)}</p></div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </div>
      )}

      {activeTab === 'Payouts' && (
        <div className="space-y-6">
          <div className="flex flex-wrap gap-3">
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => setShowGenerateModal(true)}
              className="px-5 py-3 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-xl hover:from-emerald-700 hover:to-green-700 shadow-lg shadow-emerald-500/30 flex items-center gap-2 font-medium">
              <Plus size={18} /> Generate Settlement
            </motion.button>
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => setShowPayoutModal(true)}
              className="px-5 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-blue-500/30 flex items-center gap-2 font-medium">
              <CreditCard size={18} /> Process Payout
            </motion.button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <p className="text-sm text-gray-500">Pending Payouts</p>
              <p className="text-3xl font-bold text-yellow-600 mt-1">{formatCurrency(settlementStats?.pendingPayouts || 0)}</p>
              <p className="text-xs text-gray-400 mt-1">{settlementStats?.pendingPayoutsCount || 0} requests pending</p>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <p className="text-sm text-gray-500">Pending Settlements</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{formatCurrency(settlementStats?.pendingSettlements || 0)}</p>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <p className="text-sm text-gray-500">Pending Commission</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{formatCurrency(settlementStats?.pendingCommission || 0)}</p>
            </motion.div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white rounded-2xl shadow-sm border border-gray-100">
              <div className="p-6 border-b border-gray-100"><h3 className="font-semibold text-gray-900">Settlements</h3></div>
              {settlements.length > 0 ? (
                <div className="divide-y divide-gray-50">
                  {settlements.map((s, i) => (
                    <div key={s.id || i} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-100 to-green-100 flex items-center justify-center"><Wallet size={20} className="text-emerald-600" /></div>
                        <div><p className="font-medium text-gray-900">{s.vendor_name || `${s.first_name || ''} ${s.last_name || ''}`}</p><p className="text-sm text-gray-500">{new Date(s.created_at).toLocaleDateString()}</p></div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-gray-900">{formatCurrency(s.net_payable || 0)}</p>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${s.status === 'completed' || s.status === 'paid' ? 'bg-green-100 text-green-700' : s.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600'}`}>{s.status || 'pending'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center"><Receipt size={40} className="mx-auto mb-2 text-gray-300" /><p className="text-gray-500 text-sm">No settlements yet.</p></div>
              )}
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="bg-white rounded-2xl shadow-sm border border-gray-100">
              <div className="p-6 border-b border-gray-100"><h3 className="font-semibold text-gray-900">Payout Requests</h3></div>
              {payoutRequests.length > 0 ? (
                <div className="divide-y divide-gray-50">
                  {payoutRequests.map((p, i) => (
                    <div key={p.id || i} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-100 to-amber-100 flex items-center justify-center"><DollarSign size={20} className="text-yellow-600" /></div>
                        <div><p className="font-medium text-gray-900">{p.vendor_name || `${p.first_name || ''} ${p.last_name || ''}`}</p><p className="text-sm text-gray-500">{formatCurrency(p.amount || 0)}</p></div>
                      </div>
                      <div className="text-right">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${p.status === 'completed' || p.status === 'paid' ? 'bg-green-100 text-green-700' : p.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>{p.status || 'pending'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center"><DollarSign size={40} className="mx-auto mb-2 text-gray-300" /><p className="text-gray-500 text-sm">No payout requests yet.</p></div>
              )}
            </motion.div>
          </div>
        </div>
      )}

      {/* Generate Settlement Modal */}
      <AnimatePresence>
        {showGenerateModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={() => setShowGenerateModal(false)}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4"><h3 className="text-lg font-semibold text-gray-900">Generate Settlement</h3><button onClick={() => setShowGenerateModal(false)} className="p-2 hover:bg-gray-100 rounded-lg"><X size={18} /></button></div>
              <p className="text-sm text-gray-500 mb-4">Select a vendor to generate their settlement.</p>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-700">Vendor</label>
                  <select value={generateVendorId} onChange={e => setGenerateVendorId(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none mt-1 bg-white">
                    <option value="">Select a vendor</option>
                    {vendors.map(v => (
                      <option key={v.id || v.store_id} value={v.owner_id || v.id}>{v.store_name || v.name || v.business_name || 'Vendor'}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button onClick={() => setShowGenerateModal(false)} className="px-4 py-2 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
                <button onClick={handleGenerateSettlement} disabled={actionLoading || !generateVendorId} className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-2">
                  {actionLoading ? <Loader size={16} className="animate-spin" /> : <Plus size={16} />} Generate
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Process Payout Modal */}
      <AnimatePresence>
        {showPayoutModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={() => setShowPayoutModal(false)}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4"><h3 className="text-lg font-semibold text-gray-900">Process Payout</h3><button onClick={() => setShowPayoutModal(false)} className="p-2 hover:bg-gray-100 rounded-lg"><X size={18} /></button></div>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-700">Payout Request</label>
                  <select value={selectedPayoutId} onChange={e => setSelectedPayoutId(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none mt-1 bg-white">
                    <option value="">Select a payout request</option>
                    {(payoutRequests.length > 0 ? payoutRequests : (settlementStats?.pendingPayoutsCount > 0 ? [{ id: 'all', name: 'All pending' }] : [])).map(p => (
                      <option key={p.id} value={p.id}>{p.vendor_name || p.id || 'Unknown'} — {formatCurrency(p.amount || 0)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Status</label>
                  <select value={payoutStatus} onChange={e => setPayoutStatus(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none mt-1 bg-white">
                    <option value="completed">Completed</option>
                    <option value="failed">Failed</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Transaction ID (optional)</label>
                  <input type="text" value={payoutTransactionId} onChange={e => setPayoutTransactionId(e.target.value)} placeholder="Stripe/PayPal transaction ID" className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none mt-1" />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button onClick={() => setShowPayoutModal(false)} className="px-4 py-2 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
                <button onClick={handleProcessPayout} disabled={actionLoading || !selectedPayoutId} className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2">
                  {actionLoading ? <Loader size={16} className="animate-spin" /> : <CheckCircle size={16} />} Process
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
