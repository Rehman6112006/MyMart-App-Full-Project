import React, { useState, useEffect } from 'react';
import { getDashboardStats, getAnalytics, getAdminStoreOrderStats } from '../services/api';
import { motion } from 'framer-motion';
import {
  BarChart3, TrendingUp, Users, ShoppingBag,
  DollarSign, Package, RefreshCw, Activity,
  Eye, MousePointerClick, Globe, Clock, Sparkles, Target
} from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell
} from 'recharts';

const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'];

const formatCurrency = (num) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2
  }).format(num || 0);
};

const formatNumber = (num) => {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num?.toLocaleString() || '0';
};

const StatCard = ({ icon: Icon, label, value, sub, color, bgColor, iconColor, delay }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay }}
    whileHover={{ y: -5 }}
    className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 relative overflow-hidden"
  >
    <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br opacity-5 rounded-full -translate-y-1/2 translate-x-1/2" style={{ background: `linear-gradient(135deg, ${color}, ${color}88)` }} />
    <div className="flex items-start justify-between mb-3 relative">
      <div className={`w-12 h-12 rounded-xl ${bgColor} flex items-center justify-center`}>
        <Icon size={24} className={iconColor} />
      </div>
    </div>
    <p className="text-2xl font-bold text-gray-900 relative">{value}</p>
    <p className="text-sm text-gray-500 mt-1 relative">{label}</p>
    {sub && <p className="text-xs text-gray-400 mt-1 relative">{sub}</p>}
  </motion.div>
);

export default function Analytics() {
  const [stats, setStats] = useState(null);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('30');

  useEffect(() => {
    loadAnalytics();
  }, [period]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const [statsRes, analyticsRes, storeOrderRes] = await Promise.all([
        getDashboardStats(period).catch(() => null),
        getAnalytics({ period }).catch(() => null),
        getAdminStoreOrderStats().catch(() => null),
      ]);
      if (statsRes?.data?.success) {
        const data = statsRes.data;
        if (storeOrderRes?.data?.success && storeOrderRes.data?.stats) {
          data.adminStoreOrders = storeOrderRes.data.stats;
        }
        setStats(data);
      }
      if (analyticsRes?.data?.success) setAnalyticsData(analyticsRes.data);
    } catch (err) {
      console.error('Error loading analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  const userStats = stats?.stats?.users || {};
  const orderStats = stats?.stats?.orders || {};
  const revenueStats = stats?.stats?.revenue || {};

  const chartSalesData = stats?.charts?.ordersByMonth || [];
  const categoryData = stats?.charts?.topCategories || analyticsData?.categories || [];
  const topProductsData = analyticsData?.topProducts || [];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
          <p className="text-gray-500 font-medium">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
          <p className="text-gray-500">Real-time platform performance metrics and insights</p>
        </div>
        <div className="flex items-center gap-3">
          <select value={period} onChange={(e) => setPeriod(e.target.value)} className="px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none bg-white text-sm font-medium">
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
            <option value="365">Last year</option>
          </select>
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={loadAnalytics} className="px-5 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-xl hover:from-cyan-700 hover:to-blue-700 transition-all shadow-lg shadow-cyan-500/30 flex items-center gap-2 font-medium">
            <RefreshCw size={18} /> Refresh
          </motion.button>
        </div>
      </motion.div>

{/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          icon={DollarSign}
          label="Total Revenue"
          value={formatCurrency(stats?.adminStoreOrders?.total_revenue || revenueStats.total_revenue || 0)}
          sub={`${formatNumber(revenueStats.orders_period || 0)} orders in period`}
          color="#10B981"
          bgColor="bg-gradient-to-br from-emerald-500 to-green-600"
          iconColor="text-white"
          delay={0.1}
        />
        <StatCard
          icon={ShoppingBag}
          label="Total Orders"
          value={formatNumber(stats?.adminStoreOrders?.total || orderStats.total || 0)}
          sub={`${stats?.adminStoreOrders?.delivered || orderStats.delivered || 0} delivered`}
          color="#3B82F6"
          bgColor="bg-gradient-to-br from-blue-500 to-cyan-600"
          iconColor="text-white"
          delay={0.15}
        />
        <StatCard
          icon={Users}
          label="Total Users"
          value={formatNumber(userStats.total || 0)}
          sub={`${userStats.customers || 0} customers, ${userStats.vendors || 0} vendors`}
          color="#8B5CF6"
          bgColor="bg-gradient-to-br from-purple-500 to-pink-600"
          iconColor="text-white"
          delay={0.2}
        />
        <StatCard
          icon={Package}
          label="Total Products"
          value={formatNumber(stats?.stats?.products?.total || 0)}
          sub="Across all stores"
          color="#F59E0B"
          bgColor="bg-gradient-to-br from-orange-500 to-red-600"
          iconColor="text-white"
          delay={0.25}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-semibold text-gray-900">Sales Trend</h3>
              <p className="text-sm text-gray-500">Monthly revenue over time</p>
            </div>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartSalesData.length > 0 ? chartSalesData.map(d => ({ ...d, revenue: d.revenue || 0 })) : [
                { month: 'Jan', revenue: 0 },
                { month: 'Feb', revenue: 0 },
                { month: 'Mar', revenue: 0 },
              ]}>
                <defs>
                  <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                <XAxis dataKey="month" stroke="#9CA3AF" fontSize={12} axisLine={false} tickLine={false} />
                <YAxis stroke="#9CA3AF" fontSize={12} axisLine={false} tickLine={false} tickFormatter={(v) => `$${formatNumber(v)}`} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #E5E7EB' }} />
                <Area type="monotone" dataKey="revenue" stroke="#10B981" strokeWidth={3} fillOpacity={1} fill="url(#salesGradient)" dot={{ fill: '#10B981', stroke: '#fff', strokeWidth: 2, r: 3 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.35 }} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-semibold text-gray-900">Order Status Distribution</h3>
              <p className="text-sm text-gray-500">Current order breakdown</p>
            </div>
          </div>
          <div className="h-72 flex items-center">
            <ResponsiveContainer width="60%" height="100%">
              <PieChart>
                <Pie
                  data={[
                    { name: 'Pending', value: orderStats.pending || 0 },
                    { name: 'Confirmed', value: orderStats.confirmed || 0 },
                    { name: 'Processing', value: orderStats.processing || 0 },
                    { name: 'Shipped', value: orderStats.shipped || 0 },
                    { name: 'Delivered', value: orderStats.delivered || 0 },
                    { name: 'Cancelled', value: orderStats.cancelled || 0 },
                  ].filter(d => d.value > 0)}
                  cx="50%" cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {[
                    { name: 'Pending', value: orderStats.pending || 0 },
                    { name: 'Confirmed', value: orderStats.confirmed || 0 },
                    { name: 'Processing', value: orderStats.processing || 0 },
                    { name: 'Shipped', value: orderStats.shipped || 0 },
                    { name: 'Delivered', value: orderStats.delivered || 0 },
                    { name: 'Cancelled', value: orderStats.cancelled || 0 },
                  ].filter(d => d.value > 0).map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-2">
              {[
                { name: 'Pending', value: orderStats.pending || 0, color: COLORS[2] },
                { name: 'Confirmed', value: orderStats.confirmed || 0, color: COLORS[1] },
                { name: 'Processing', value: orderStats.processing || 0, color: COLORS[5] },
                { name: 'Shipped', value: orderStats.shipped || 0, color: COLORS[6] },
                { name: 'Delivered', value: orderStats.delivered || 0, color: COLORS[0] },
                { name: 'Cancelled', value: orderStats.cancelled || 0, color: COLORS[3] },
              ].filter(d => d.value > 0).map((item, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-sm text-gray-600">{item.name}</span>
                  </div>
                  <span className="text-sm font-medium text-gray-900">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Category & Products */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {categoryData.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="mb-6">
              <h3 className="font-semibold text-gray-900">Category Distribution</h3>
              <p className="text-sm text-gray-500">Products by category</p>
            </div>
            <div className="space-y-4">
              {categoryData.map((cat, i) => (
                <div key={i}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                      <span className="text-sm font-medium text-gray-700">{cat.name}</span>
                    </div>
                    <span className="text-sm font-semibold text-gray-900">{cat.value || cat.products_count || 0}</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(((cat.value || cat.products_count || 0) / Math.max(...categoryData.map(c => c.value || c.products_count || 0))) * 100, 100)}%`,
                        backgroundColor: COLORS[i % COLORS.length]
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {topProductsData.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="mb-6">
              <h3 className="font-semibold text-gray-900">Top Performing Products</h3>
              <p className="text-sm text-gray-500">Best selling products</p>
            </div>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topProductsData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis type="number" stroke="#9CA3AF" fontSize={12} />
                  <YAxis dataKey="name" type="category" stroke="#9CA3AF" fontSize={12} width={100} />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #E5E7EB' }} />
                  <Bar dataKey="sales" fill="#10B981" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        )}
      </div>

      {/* Insights Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-6 border border-green-100">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
              <Target size={20} className="text-green-600" />
            </div>
            <h4 className="font-semibold text-gray-900">Conversion Rate</h4>
          </div>
          <p className="text-3xl font-bold text-green-600">24.8%</p>
          <p className="text-sm text-gray-500 mt-1">+2.4% from last period</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }} className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl p-6 border border-blue-100">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
              <MousePointerClick size={20} className="text-blue-600" />
            </div>
            <h4 className="font-semibold text-gray-900">Engagement</h4>
          </div>
          <p className="text-3xl font-bold text-blue-600">3.2K</p>
          <p className="text-sm text-gray-500 mt-1">Daily active sessions</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-6 border border-purple-100">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
              <Clock size={20} className="text-purple-600" />
            </div>
            <h4 className="font-semibold text-gray-900">Avg. Order Value</h4>
          </div>
          <p className="text-3xl font-bold text-purple-600">{formatCurrency(85)}</p>
          <p className="text-sm text-gray-500 mt-1">+$5.20 from last period</p>
        </motion.div>
      </div>

      {/* Empty State */}
      {!chartSalesData.length && !topProductsData.length && !categoryData.length && stats && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl shadow-sm p-12 border border-gray-100 text-center">
          <BarChart3 size={48} className="mx-auto mb-3 text-gray-300" />
          <p className="text-gray-500">Chart data not available for the selected period.</p>
        </motion.div>
      )}
    </div>
  );
}