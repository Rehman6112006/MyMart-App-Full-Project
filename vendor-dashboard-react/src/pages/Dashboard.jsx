import React, { useState, useEffect } from 'react';
import { getVendorDashboardStats } from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag, Package, DollarSign, TrendingUp, Clock, CheckCircle, XCircle, AlertCircle, CreditCard, ArrowUpRight, BarChart3 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const formatCurrency = (num) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(num || 0);
const formatNumber = (num) => { if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'; if (num >= 1000) return (num / 1000).toFixed(1) + 'K'; return num?.toLocaleString() || '0'; };

const greetings = ['Good morning', 'Good afternoon', 'Good evening'];
const getGreeting = () => { const h = new Date().getHours(); return h < 12 ? greetings[0] : h < 18 ? greetings[1] : greetings[2]; };

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06 } }
};

const itemVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 70, damping: 15 } }
};

function Skeleton({ className }) {
  return <div className={`animate-pulse bg-gray-200/70 rounded-2xl ${className}`} />;
}

function StatCard({ stat, index, navigate }) {
  const Icon = stat.icon;
  return (
    <motion.div
      variants={itemVariants}
      whileHover={{ y: -6, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className="group relative bg-white rounded-2xl p-6 border border-gray-100 cursor-pointer overflow-hidden"
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
        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.gradient} flex items-center justify-center shadow-lg shadow-${stat.gradient.split(' ')[1].replace('from-', '')}/20 group-hover:scale-110 transition-transform duration-300 flex-shrink-0`}>
          <Icon size={22} className="text-white" />
        </div>
      </div>
      <div className="mt-3 flex items-center gap-1 text-xs font-medium text-gray-400 group-hover:text-gray-600 transition-colors">
        View details <ArrowUpRight size={12} />
      </div>
    </motion.div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      setLoading(true); setError(null);
      const dashRes = await getVendorDashboardStats().catch(() => null);
      if (dashRes?.data?.success) setDashboard(dashRes.data);
    } catch { setError('Failed to load dashboard'); }
    finally { setLoading(false); }
  };

  const d = dashboard?.data || dashboard || {};
  const s = d.summary || {};
  const pp = d.pendingPayments || {};

  const statCards = [
    { label: 'Total Revenue', value: formatCurrency(s.revenue?.total || d.total_revenue || 0), sub: `Avg order $${formatNumber(s.revenue?.avgOrderValue || 0)}`, icon: DollarSign, gradient: 'from-emerald-500 to-green-600', link: '/earnings' },
    { label: 'Total Orders', value: formatNumber(s.orders?.total || d.total_orders || 0), sub: `${s.orders?.completed || d.delivered_orders || 0} delivered`, icon: ShoppingBag, gradient: 'from-blue-500 to-cyan-600', link: '/orders' },
    { label: 'Active Products', value: formatNumber(s.products?.inStock || d.active_products || 0), sub: `${s.products?.total || d.total_products || 0} total products`, icon: Package, gradient: 'from-orange-500 to-red-500', link: '/products' },
  ];

  const orderStatuses = [
    { label: 'Pending', value: s.orders?.pending ?? d.pending_orders ?? 0, sub: pp.count > 0 ? `${pp.count} payment pending` : null, icon: Clock, color: 'bg-yellow-500' },
    { label: 'Processing', value: s.orders?.processing ?? d.processing_orders ?? 0, icon: Package, color: 'bg-indigo-500' },
    { label: 'Delivered', value: s.orders?.completed ?? d.delivered_orders ?? 0, icon: CheckCircle, color: 'bg-green-500' },
    { label: 'Cancelled', value: s.orders?.cancelled ?? d.cancelled_orders ?? 0, icon: XCircle, color: 'bg-red-500' },
  ];

  const monthlyData = s.revenue?.monthly || d.monthlyRevenue || d.monthlySales || d.charts?.ordersByMonth || [];

  if (loading) return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><Skeleton className="h-8 w-56" /><Skeleton className="h-4 w-72 mt-2" /></div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {[1,2,3].map(i => <Skeleton key={i} className="h-36" />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Skeleton className="lg:col-span-2 h-80" />
        <Skeleton className="h-80" />
      </div>
    </div>
  );

  const totalOrders = s.orders?.total || d.total_orders || 0;

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
            <h1 className="text-2xl font-bold text-gray-900">{getGreeting()}, {user?.firstName || user?.first_name || 'Vendor'}</h1>
            <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-700 rounded-full text-xs font-medium">Store</span>
          </div>
          <p className="text-gray-500 mt-1">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })} &middot; Here's your store performance overview.</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={loadData}
          className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-xl hover:from-emerald-700 hover:to-green-700 transition-all shadow-lg shadow-emerald-500/25 flex items-center gap-2 font-medium text-sm"
        >
          <TrendingUp size={16} />
          Refresh
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
            <AlertCircle size={20} className="text-red-600 flex-shrink-0" />
            <span className="text-red-700 text-sm">{error}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {statCards.map((stat, i) => (
          <StatCard key={i} stat={stat} index={i} navigate={navigate} />
        ))}
      </div>

      {/* Chart + Order Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Chart */}
        <motion.div variants={itemVariants} className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
          <div className="flex items-stretch">
            <div className="w-44 bg-gradient-to-b from-indigo-600 via-indigo-500 to-purple-600 p-5 flex flex-col justify-between flex-shrink-0">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <BarChart3 size={14} className="text-indigo-200" />
                  <span className="text-indigo-200 text-xs font-medium uppercase tracking-wider">Revenue</span>
                </div>
                <h3 className="text-xl font-bold text-white mt-1">{formatCurrency(s.revenue?.total || d.total_revenue || 0)}</h3>
                <p className="text-indigo-200 text-xs mt-1">
                  {s.revenue?.growth > 0 ? '+' : ''}{s.revenue?.growth || 0}% vs last period
                </p>
              </div>
              <motion.button
                whileHover={{ scale: 1.03 }}
                onClick={() => navigate('/earnings')}
                className="px-3 py-1.5 bg-white/15 text-white text-xs rounded-lg hover:bg-white/25 transition-colors backdrop-blur-sm text-center"
              >
                Full Report
              </motion.button>
            </div>
            <div className="flex-1 p-5">
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyData.length > 0 ? monthlyData : [{ month: 'Jan', revenue: 0 }]} barGap={4}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                    <XAxis dataKey="month" stroke="#9CA3AF" fontSize={12} axisLine={false} tickLine={false} />
                    <YAxis stroke="#9CA3AF" fontSize={12} axisLine={false} tickLine={false} tickFormatter={(v) => `$${formatNumber(v)}`} />
                    <Tooltip
                      contentStyle={{ borderRadius: '12px', border: '1px solid #E5E7EB', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
                      labelStyle={{ fontWeight: 600, color: '#111827' }}
                    />
                    <Bar dataKey="revenue" fill="#6366F1" radius={[6, 6, 0, 0]} maxBarSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Order Status */}
        <motion.div variants={itemVariants} className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-semibold text-gray-900 text-lg">Order Status</h3>
            <span className="text-xs text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full font-medium">{totalOrders} total</span>
          </div>
          <div className="space-y-3">
            {orderStatuses.map((item, i) => {
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
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-700">{item.label}</span>
                          {item.sub && <span className="text-[10px] text-orange-500 font-medium bg-orange-50 px-1.5 py-0.5 rounded-full">{item.sub}</span>}
                        </div>
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

          {/* Payment Pending Summary */}
          {pp.count > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              className="mt-4 p-3 bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-xl"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CreditCard size={16} className="text-orange-500" />
                  <span className="text-sm font-medium text-orange-700">Pending Payments</span>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-orange-700">{pp.count} orders</p>
                  <p className="text-xs text-orange-500">{formatCurrency(pp.totalAmount || 0)}</p>
                </div>
              </div>
            </motion.div>
          )}
        </motion.div>
      </div>

      {/* Recent Orders Summary */}
      {d.recentOrders?.length > 0 && (
        <motion.div variants={itemVariants} className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <ShoppingBag size={18} className="text-emerald-500" />
              Recent Orders
            </h3>
            <motion.button
              whileHover={{ scale: 1.03 }}
              onClick={() => navigate('/orders')}
              className="text-sm text-emerald-600 font-medium hover:text-emerald-700 flex items-center gap-1"
            >
              View All <ArrowUpRight size={14} />
            </motion.button>
          </div>
          <div className="divide-y divide-gray-50">
            {d.recentOrders.slice(0, 5).map((order, i) => {
              const statusColor = { pending: 'bg-yellow-100 text-yellow-700', confirmed: 'bg-blue-100 text-blue-700', processing: 'bg-indigo-100 text-indigo-700', shipped: 'bg-purple-100 text-purple-700', delivered: 'bg-emerald-100 text-emerald-700', cancelled: 'bg-red-100 text-red-700' };
              return (
                <motion.div
                  key={order.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.03 }}
                  className="flex items-center justify-between px-6 py-3.5 hover:bg-gray-50/50 transition-colors"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <span className="text-xs font-mono text-gray-400 bg-gray-100 px-2 py-1 rounded-md flex-shrink-0">{order.order_number || order.id?.slice(0, 8)}</span>
                    <span className="text-sm font-medium text-gray-900 truncate">{order.first_name} {order.last_name}</span>
                  </div>
                  <div className="flex items-center gap-4 flex-shrink-0">
                    <span className="text-sm font-semibold text-gray-900">{formatCurrency(order.total_amount || 0)}</span>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusColor[order.order_status || 'pending'] || 'bg-gray-100 text-gray-700'}`}>
                      {order.order_status || order.status}
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
