import React, { useState, useEffect } from 'react';
import { getReports, generateReport } from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Download, Calendar, Eye, BarChart3, TrendingUp, Package, Users, ShoppingBag, RefreshCw, AlertCircle, Loader2 } from 'lucide-react';

const reportTypes = [
  { id: 'sales', label: 'Sales Report', icon: ShoppingBag, color: 'from-emerald-500 to-green-600', desc: 'Overview of sales performance and trends' },
  { id: 'products', label: 'Products Report', icon: Package, color: 'from-blue-500 to-cyan-600', desc: 'Product performance and inventory analysis' },
  { id: 'customers', label: 'Customers Report', icon: Users, color: 'from-purple-500 to-pink-600', desc: 'Customer behavior and demographics' },
  { id: 'vendors', label: 'Vendors Report', icon: BarChart3, color: 'from-orange-500 to-red-600', desc: 'Vendor performance and earnings' },
  { id: 'commission', label: 'Commission Report', icon: TrendingUp, color: 'from-yellow-500 to-amber-600', desc: 'Commission breakdown and payouts' },
];

export default function Reports() {
  const [selectedType, setSelectedType] = useState(null);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getReports();
      if (res.data?.success && Array.isArray(res.data?.reports)) {
        setReports(res.data.reports);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateReport = async () => {
    if (!selectedType) return;
    setGenerating(true);
    setError(null);
    try {
      const res = await generateReport({
        type: selectedType.id,
        startDate: dateRange.start || undefined,
        endDate: dateRange.end || undefined,
      });
      if (res.data?.success) {
        await loadReports();
        setSelectedType(null);
        setDateRange({ start: '', end: '' });
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to generate report');
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
          <p className="text-gray-500 font-medium">Loading reports...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
          <p className="text-gray-500">Generate and download platform reports</p>
        </div>
        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={loadReports} className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-xl hover:from-emerald-700 hover:to-green-700 transition-all shadow-lg shadow-emerald-500/30 flex items-center gap-2">
          <RefreshCw size={18} /> Refresh
        </motion.button>
      </motion.div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
          <AlertCircle size={20} className="text-red-600" />
          <span className="text-red-700">{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {reportTypes.map((type, i) => {
          const Icon = type.icon;
          return (
            <motion.div key={type.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              whileHover={{ y: -5 }}
              onClick={() => setSelectedType(type)}
              className={`bg-white rounded-2xl p-6 shadow-sm border-2 cursor-pointer transition-all ${
                selectedType?.id === type.id ? 'border-emerald-500 shadow-lg' : 'border-gray-100 hover:border-gray-200'
              }`}
            >
              <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${type.color} flex items-center justify-center shadow-lg mb-4`}>
                <Icon size={28} className="text-white" />
              </div>
              <h3 className="font-semibold text-gray-900 text-lg">{type.label}</h3>
              <p className="text-sm text-gray-500 mt-1">{type.desc}</p>
              {selectedType?.id === type.id && (
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="mt-3 px-3 py-1 bg-emerald-100 text-emerald-700 text-sm font-medium rounded-full inline-block">
                  Selected
                </motion.div>
              )}
            </motion.div>
          );
        })}
      </div>

      <AnimatePresence>
        {selectedType && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h3 className="font-semibold text-gray-900 mb-4">Generate {selectedType.label}</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                <div className="relative">
                  <Calendar size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type="date" value={dateRange.start} onChange={e => setDateRange({...dateRange, start: e.target.value})} className="input-field pl-10" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                <div className="relative">
                  <Calendar size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type="date" value={dateRange.end} onChange={e => setDateRange({...dateRange, end: e.target.value})} className="input-field pl-10" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Quick Select</label>
                <select className="input-field">
                  <option>Custom</option>
                  <option>Last 7 days</option>
                  <option>Last 30 days</option>
                  <option>Last 90 days</option>
                  <option>This year</option>
                </select>
              </div>
            </div>
            <div className="flex gap-4">
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                onClick={handleGenerateReport} disabled={generating}
                className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-green-600 text-white font-medium rounded-xl hover:from-emerald-700 hover:to-green-700 transition-all shadow-lg shadow-emerald-500/30 flex items-center gap-2 disabled:opacity-50"
              >
                {generating ? <><Loader2 size={18} className="animate-spin" /> Generating...</> : <><FileText size={18} /> Generate Report</>}
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-white rounded-2xl shadow-sm border border-gray-100">
        <div className="p-6 border-b">
          <h3 className="font-semibold text-gray-900">Generated Reports {reports.length > 0 && `(${reports.length})`}</h3>
        </div>
        {reports.length === 0 ? (
          <div className="p-12 text-center">
            <FileText size={48} className="mx-auto mb-3 text-gray-300" />
            <p className="text-gray-500">No reports generated yet. Select a report type above and generate your first report.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {reports.map((report, i) => (
              <motion.div key={report.id || i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + i * 0.05 }}
                className="p-4 flex items-center justify-between hover:bg-emerald-50/30 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                    <FileText size={20} className="text-emerald-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{report.type || report.name}</p>
                    <p className="text-sm text-gray-500">{report.period || report.date_range}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-sm text-gray-500">{report.created_at ? new Date(report.created_at).toLocaleDateString() : report.date}</p>
                    {report.size && <p className="text-xs text-gray-400">{report.size}</p>}
                  </div>
                  <div className="flex gap-2">
                    {report.file_url && (
                      <a href={report.file_url} target="_blank" rel="noopener noreferrer"
                        className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                      >
                        <Download size={18} />
                      </a>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}
