import React, { useState, useEffect } from 'react';
import { getDashboardStats, getAdminStoreOrderStats, getSettlementAdminStats } from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, ShoppingBag, Store, DollarSign, Wallet, TrendingUp,
  ArrowRight, RefreshCw, Clock, CheckCircle, XCircle, Package,
  AlertTriangle, Shield, Activity, CreditCard, ArrowUpRight,
  Sparkles, BarChart3
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const formatCurrency = (num) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(num || 0);
const formatNumber = (num) => { if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'; if (num >= 1000) return (num / 1000).toFixed(1) + 'K'; return num?.toLocaleString() || '0'; };

const greetings = ['Good morning', 'Good afternoon', 'Good evening'];
const getGreeting = () => { const h = new Date().getHours(); return h < 12 ? greetings[0] : h < 18 ? greetings[1] : greetings[2]; };

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } }
};

const itemVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 70, damping: 15 } }
};

function Skeleton({ className }) {
  return <div className={`animate-pulse bg-gray-200/70 rounded-2xl ${className}`} />;
}

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [settlementStats, setSettlementStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => { loadDashboardData(); }, []);

  const loadDashboardData = async () => {
    try {
      setRefreshing(true); setError(null);
      const [statsRes, storeOrderStatsRes, settlementRes] = await Promise.all([
        getDashboardStats(),
        getAdminStoreOrderStats(),
        getSettlementAdminStats().catch(() => null),
      ]);
      if (settlementRes?.data?.success) setSettlementStats(settlementRes.data.stats);
      if (statsRes.data.success) {
        const data = statsRes.data;
        if (storeOrderStatsRes.data?.success && storeOrderStatsRes.data?.stats) {
          data.adminStoreOrders = storeOrderStatsRes.data.stats;
          data.adminStoreHasOrders = true;
        } else {
          data.adminStoreOrders = null;
          data.adminStoreHasOrders = false;
        }
        setStats(data);
      }
    } catch (err) {
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const s = stats?.stats || {};
  const adminStore = stats?.adminStoreOrders || {};
  const totalOrders = adminStore?.total || s?.orders?.total || 0;

  const statCards = [
    { label: 'Total Revenue', value: formatCurrency(adminStore?.total_revenue || s?.revenue?.total_revenue || 0), sub: `${totalOrders} total orders`, icon: DollarSign, gradient: 'from-emerald-500 to-green-600', link: '/earnings' },
    { label: 'Total Users', value: formatNumber(parseInt(s?.users?.total) || 0), sub: `${s?.users?.customers || 0} customers, ${s?.users?.vendors || 0} vendors`, icon: Users, gradient: 'from-blue-500 to-cyan-600', link: '/users' },
    { label: 'Active Stores', value: formatNumber(parseInt(s?.stores?.total) || 0), sub: `${s?.stores?.verified || 0} verified`, icon: Store, gradient: 'from-orange-500 to-red-500', link: '/vendors' },
    { label: 'Total Orders', value: formatNumber(parseInt(totalOrders) || 0), sub: `${adminStore?.delivered || s?.orders?.delivered || 0} delivered`, icon: ShoppingBag, gradient: 'from-purple-500 to-pink-600', link: '/orders' },
  ];

  const orderStatusData = [
    { label: 'Pending', value: adminStore?.pending || s?.orders?.pending || 0, color: 'bg-yellow-500', icon: Clock },
    { label: 'Processing', value: adminStore?.processing || s?.orders?.processing || 0, color: 'bg-indigo-500', icon: Package },
    { label: 'Delivered', value: adminStore?.delivered || s?.orders?.delivered || 0, color: 'bg-green-500', icon: CheckCircle },
    { label: 'Cancelled', value: adminStore?.cancelled || s?.orders?.cancelled || 0, color: 'bg-red-500', icon: XCircle },
  ];

  const chartData = stats?.charts?.ordersByMonth || [];
  const pendingStores = parseInt(s?.pending?.pending_stores) || 0;

  if (loading) return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><Skeleton className="h-8 w-64" /><Skeleton className="h-4 w-80 mt-2" /></div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {[1,2,3,4].map(i => <Skeleton key={i} className="h-36" />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Skeleton className="lg:col-span-2 h-80" />
        <Skeleton className="h-80" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Skeleton className="h-56" />
        <Skeleton className="h-56" />
        <Skeleton className="h-56" />
      </div>
    </div>
  );

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="space-y-6"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">{getGreeting()}, Admin</h1>
            <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-700 rounded-full text-xs font-medium">Platform</span>
          </div>
          <p className="text-gray-500 mt-1">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })} &middot; Here's what's happening on your platform today.</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={loadDashboardData}
          disabled={refreshing}
          className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-xl hover:from-emerald-700 hover:to-green-700 transition-all shadow-lg shadow-emerald-500/25 flex items-center gap-2 font-medium text-sm disabled:opacity-60"
        >
          <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </motion.button>
      </motion.div>

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3"
          >
            <AlertTriangle size={20} className="text-red-600 flex-shrink-0" />
            <span className="text-red-700 text-sm">{error}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={index}
              variants={itemVariants}
              whileHover={{ y: -6, scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="group relative bg-white rounded-2xl p-6 border border-gray-100 cursor-pointer overflow-hidden shadow-sm"
              onClick={() => navigate(stat.link)}
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${stat.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-500`} />
              <div className="relative flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-500 mb-1">{stat.label}</p>
                  <p className="text-2xl font-bold text-gray-900 tracking-tight">{stat.value}</p>
                  {stat.sub && (
                    <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      {stat.sub}
                    </p>
                  )}
                </div>
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.gradient} flex items-center justify-center shadow-lg flex-shrink-0 group-hover:scale-110 transition-transform duration-300`}>
                  <Icon size={22} className="text-white" />
                </div>
              </div>
              <div className="mt-3 flex items-center gap-1 text-xs font-medium text-gray-400 group-hover:text-gray-600 transition-colors">
                View details <ArrowUpRight size={12} />
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Chart + Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Chart */}
        <motion.div variants={itemVariants} className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
          <div className="bg-gradient-to-r from-emerald-600 via-emerald-500 to-green-500 px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <Activity size={14} className="text-emerald-200" />
                  <span className="text-emerald-200 text-xs font-medium uppercase tracking-wider">Revenue Trend</span>
                </div>
                <h3 className="text-xl font-bold text-white">{formatCurrency(adminStore?.total_revenue || s?.revenue?.total_revenue || 0)}</h3>
              </div>
              <motion.button
                whileHover={{ scale: 1.03 }}
                onClick={() => navigate('/earnings')}
                className="px-4 py-2 bg-white/15 text-white text-sm rounded-xl hover:bg-white/25 transition-colors backdrop-blur-sm flex items-center gap-1.5"
              >
                Details <ArrowUpRight size={14} />
              </motion.button>
            </div>
          </div>
          <div className="p-5">
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData.length > 0 ? chartData.map(d => ({ ...d, revenue: d.revenue || 0 })) : [{ month: 'Jan', revenue: 0 }]}>
                  <defs>
                    <linearGradient id="adminRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                  <XAxis dataKey="month" stroke="#9CA3AF" fontSize={12} axisLine={false} tickLine={false} />
                  <YAxis stroke="#9CA3AF" fontSize={12} axisLine={false} tickLine={false} tickFormatter={(v) => `$${formatNumber(v)}`} />
                  <Tooltip
                    contentStyle={{ borderRadius: '12px', border: '1px solid #E5E7EB', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
                    labelStyle={{ fontWeight: 600, color: '#111827' }}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="#10B981" strokeWidth={3} fillOpacity={1} fill="url(#adminRevenue)" dot={{ fill: '#10B981', stroke: '#fff', strokeWidth: 2, r: 4 }} activeDot={{ r: 6, fill: '#10B981', stroke: '#fff', strokeWidth: 2 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </motion.div>

        {/* Quick Actions */}
        <motion.div variants={itemVariants} className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-5">
            <Sparkles size={18} className="text-emerald-500" />
            <h3 className="font-semibold text-gray-900 text-lg">Quick Actions</h3>
          </div>
          <div className="space-y-2">
            {[
              { label: 'Manage Vendors', path: '/vendors', icon: Store, bg: 'bg-orange-50', color: 'text-orange-600' },
              { label: 'Manage Users', path: '/users', icon: Users, bg: 'bg-blue-50', color: 'text-blue-600' },
              { label: 'Categories', path: '/categories', icon: Package, bg: 'bg-emerald-50', color: 'text-emerald-600' },
              { label: 'Analytics', path: '/analytics', icon: BarChart3, bg: 'bg-cyan-50', color: 'text-cyan-600' },
            ].map((a) => {
              const Icon = a.icon;
              return (
                <motion.button
                  key={a.label}
                  whileHover={{ scale: 1.01, x: 4 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => navigate(a.path)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors group"
                >
                  <div className={`w-10 h-10 rounded-xl ${a.bg} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                    <Icon size={20} className={a.color} />
                  </div>
                  <span className="font-medium text-gray-700 flex-1 text-left text-sm">{a.label}</span>
                  <ArrowRight size={16} className="text-gray-300 group-hover:text-gray-500 transition-colors" />
                </motion.button>
              );
            })}
            {stats?.stats?.adminStore && (
              <motion.button
                whileHover={{ scale: 1.01, x: 4 }}
                whileTap={{ scale: 0.99 }}
                onClick={() => navigate('/admin-store')}
                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors group"
              >
                <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Shield size={20} className="text-purple-600" />
                </div>
                <span className="font-medium text-gray-700 flex-1 text-left text-sm">Admin Store</span>
                <ArrowRight size={16} className="text-gray-300 group-hover:text-gray-500 transition-colors" />
              </motion.button>
            )}
          </div>
        </motion.div>
      </div>

      {/* Order Status + Earnings + Pending Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Order Status */}
        <motion.div variants={itemVariants} className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-semibold text-gray-900 text-lg">Order Status</h3>
            <span className="text-xs text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full font-medium">{totalOrders} total</span>
          </div>
          <div className="space-y-3">
            {orderStatusData.map((item, i) => {
              const Icon = item.icon;
              const pct = totalOrders > 0 ? Math.round((item.value / totalOrders) * 100) : 0;
              const barColors = { Pending: 'bg-yellow-400', Processing: 'bg-indigo-400', Delivered: 'bg-green-400', Cancelled: 'bg-red-400' };
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + i * 0.08 }}
                  className="group"
                >
                  <div className="flex items-center gap-3 p-2.5 bg-gray-50/80 rounded-xl hover:bg-gray-100 transition-colors">
                    <div className={`w-10 h-10 rounded-xl ${item.color} flex items-center justify-center shadow-sm flex-shrink-0`}>
                      <Icon size={18} className="text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-700">{item.label}</span>
                        <span className="text-base font-bold text-gray-900">{item.value}</span>
                      </div>
                      <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.8, delay: 0.5 + i * 0.08, ease: 'easeOut' }}
                          className={`h-full rounded-full ${barColors[item.label] || 'bg-gray-400'}`}
                        />
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* Earnings Summary */}
        <motion.div variants={itemVariants} className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-5">
            <Wallet size={18} className="text-emerald-500" />
            <h3 className="font-semibold text-gray-900 text-lg">Earnings Summary</h3>
          </div>
          <div className="space-y-3">
            {[
              { label: 'Pending Commission', value: settlementStats?.pendingCommission || 0, count: settlementStats?.pendingCommissionCount || 0, gradient: 'from-emerald-50 to-green-50', icon: DollarSign, bg: 'bg-emerald-100', color: 'text-emerald-600', tagColor: 'text-emerald-600 bg-emerald-50' },
              { label: 'Pending Settlements', value: settlementStats?.pendingSettlements || 0, count: settlementStats?.pendingSettlementsCount || 0, gradient: 'from-yellow-50 to-orange-50', icon: Clock, bg: 'bg-yellow-100', color: 'text-yellow-600', tagColor: 'text-yellow-600 bg-yellow-50' },
              { label: 'Pending Payouts', value: settlementStats?.pendingPayouts || 0, count: settlementStats?.pendingPayoutsCount || 0, gradient: 'from-blue-50 to-cyan-50', icon: Wallet, bg: 'bg-blue-100', color: 'text-blue-600', tagColor: 'text-blue-600 bg-blue-50' },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 + i * 0.08 }}
                className={`flex items-center justify-between p-3.5 bg-gradient-to-br ${item.gradient} rounded-xl hover:shadow-sm transition-shadow`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl ${item.bg} flex items-center justify-center`}>
                    <item.icon size={20} className={item.color} />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">{item.label}</p>
                    <p className="text-lg font-bold text-gray-900">{formatCurrency(item.value)}</p>
                  </div>
                </div>
                {item.count > 0 && (
                  <span className={`text-xs ${item.tagColor} px-2.5 py-1 rounded-full font-medium`}>
                    {item.count} txns
                  </span>
                )}
              </motion.div>
            ))}
            {!settlementStats && (
              <div className="text-center py-8 text-gray-400 text-sm">
                <DollarSign size={32} className="mx-auto mb-2 text-gray-300" />
                No settlement data available
              </div>
            )}
          </div>
        </motion.div>

        {/* Pending Actions */}
        <motion.div variants={itemVariants} className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-5">
            <AlertTriangle size={18} className="text-amber-500" />
            <h3 className="font-semibold text-gray-900 text-lg">Pending Actions</h3>
          </div>
          <div className="space-y-3">
            {pendingStores > 0 ? (
              <motion.div
                whileHover={{ scale: 1.02 }}
                onClick={() => navigate('/vendors')}
                className="p-4 bg-gradient-to-br from-yellow-50 to-orange-50 border border-yellow-200 rounded-xl cursor-pointer hover:shadow-md transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center shadow-lg">
                    <Store size={22} className="text-white" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{pendingStores}</p>
                    <p className="text-sm text-gray-600">Pending Stores</p>
                  </div>
                </div>
                <p className="text-xs text-orange-600 mt-2 flex items-center gap-1">
                  <ArrowRight size={12} /> Review and approve pending store requests
                </p>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-8 text-gray-400"
              >
                <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-3">
                  <CheckCircle size={32} className="text-green-400" />
                </div>
                <p className="font-medium text-gray-500">All Clear</p>
                <p className="text-sm mt-1">No pending actions require attention</p>
              </motion.div>
            )}
          </div>

          {/* Platform Quick Stats */}
          <div className="mt-5 pt-5 border-t border-gray-100">
            <div className="flex items-center gap-2 mb-3">
              <BarChart3 size={14} className="text-gray-400" />
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Platform Snapshot</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Customers', value: formatNumber(parseInt(s?.users?.customers) || 0) },
                { label: 'Vendors', value: formatNumber(parseInt(s?.users?.vendors) || 0) },
                { label: 'Stores', value: formatNumber(parseInt(s?.stores?.active) || 0) },
                { label: 'Verified', value: formatNumber(parseInt(s?.stores?.verified) || 0) },
              ].map((item, i) => (
                <div key={i} className="bg-gray-50 rounded-xl p-3 text-center">
                  <p className="text-lg font-bold text-gray-900">{item.value}</p>
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider">{item.label}</p>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
