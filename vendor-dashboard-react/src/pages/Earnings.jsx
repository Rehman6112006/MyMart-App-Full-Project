import React, { useState, useEffect } from 'react';
import { getVendorEarnings, getVendorWallet, getVendorTransactions } from '../services/api';
import { motion } from 'framer-motion';
import { DollarSign, Wallet, AlertCircle, TrendingUp, ArrowRight, Clock, CheckCircle } from 'lucide-react';

const formatCurrency = (num) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(num || 0);

export default function Earnings() {
  const [earnings, setEarnings] = useState(null);
  const [wallet, setWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try { setLoading(true);
      const [earnRes, walletRes, txRes] = await Promise.all([
        getVendorEarnings().catch(() => null), getVendorWallet().catch(() => null),
        getVendorTransactions().catch(() => null)
      ]);
      if (earnRes?.data?.success) setEarnings(earnRes.data);
      if (walletRes?.data?.success) setWallet(walletRes.data);
      if (txRes?.data?.success) setTransactions(txRes.data.transactions || txRes.data.data || []);
    } catch { setError('Failed to load earnings'); } finally { setLoading(false); }
  };

  const e = earnings?.data || earnings || {};
  const w = wallet?.wallet || wallet?.data?.wallet || wallet || {};

  if (loading) return <div className="flex items-center justify-center h-96"><div className="w-16 h-16 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Earnings</h1>
        <p className="text-gray-500">Track your revenue and earnings</p>
      </div>

      {error && <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3"><AlertCircle size={20} className="text-red-600" /><span className="text-red-700">{error}</span></div>}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-gradient-to-br from-emerald-500 to-green-600 rounded-2xl p-6 text-white">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center"><DollarSign size={24} /></div>
            <p className="text-sm text-emerald-100">Total Revenue</p>
          </div>
          <p className="text-3xl font-bold">{formatCurrency(e.orderEarnings?.total || e.total_revenue || e.totalRevenue || 0)}</p>
          <p className="text-sm text-emerald-200 mt-1">All time earnings</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center"><Wallet size={24} className="text-blue-600" /></div>
            <div><p className="text-sm text-gray-500">Available Balance</p><p className="text-lg font-bold text-gray-900">{formatCurrency(w.available_balance ?? w.balance ?? 0)}</p></div>
          </div>
          <div className="flex items-center gap-2 text-sm text-blue-600"><TrendingUp size={14} /> Earned from sales</div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-yellow-50 flex items-center justify-center"><Clock size={24} className="text-yellow-600" /></div>
            <div><p className="text-sm text-gray-500">Pending</p><p className="text-lg font-bold text-gray-900">{formatCurrency(w.pending_balance ?? e.pendingAmount ?? 0)}</p></div>
          </div>
          <div className="flex items-center gap-2 text-sm text-yellow-600"><ArrowRight size={14} /> Awaiting settlement</div>
        </motion.div>
      </div>

      {transactions.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2"><TrendingUp size={18} className="text-emerald-500" /> Recent Transactions</h3>
          <div className="divide-y divide-gray-100">
            {transactions.slice(0, 10).map((tx, i) => (
              <div key={i} className="flex items-center justify-between py-3">
                <div>
                  <p className="font-medium text-gray-900">{tx.description || tx.type || 'Transaction'}</p>
                  <p className="text-xs text-gray-500">{new Date(tx.created_at || tx.createdAt).toLocaleDateString()}</p>
                </div>
                <span className={`font-semibold ${tx.type === 'credit' || tx.type === 'earning' ? 'text-green-600' : 'text-red-600'}`}>
                  {tx.type === 'credit' || tx.type === 'earning' ? '+' : '-'}{formatCurrency(tx.amount || 0)}
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
