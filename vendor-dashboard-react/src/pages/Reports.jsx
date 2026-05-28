import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FileText, TrendingUp, Package, ShoppingCart, AlertCircle, Download, RefreshCw, BarChart3 } from 'lucide-react';
import { getVendorSalesReport, getVendorProductsReport, getVendorOrdersReport, getVendorRevenueReport, getVendorCustomersReport, getVendorComparisonReport, exportVendorReport } from '../services/api';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const reportTypes = [
  { key: 'sales', label: 'Sales Report', icon: TrendingUp, desc: 'Product sales performance' },
  { key: 'products', label: 'Products Report', icon: Package, desc: 'Top products & inventory' },
  { key: 'orders', label: 'Orders Report', icon: ShoppingCart, desc: 'Order volume & status' },
  { key: 'revenue', label: 'Revenue Report', icon: BarChart3, desc: 'Earnings breakdown' },
  { key: 'customers', label: 'Customers Report', icon: FileText, desc: 'Customer insights' },
  { key: 'comparison', label: 'Comparison Report', icon: TrendingUp, desc: 'Period over period' },
];

const fetchMap = { sales: getVendorSalesReport, products: getVendorProductsReport, orders: getVendorOrdersReport, revenue: getVendorRevenueReport, customers: getVendorCustomersReport, comparison: getVendorComparisonReport };

function getChartDataKey(data) {
  if (!data) return 'value';
  const sample = data.chart?.[0] || data.data?.[0] || data.monthly?.[0] || data.salesData?.[0] || Object.values(data)[0]?.[0] || {};
  if (typeof sample !== 'object') return 'value';
  const candidates = ['value', 'revenue', 'total', 'amount', 'count', 'net', 'sales', 'orders'];
  for (const key of candidates) {
    if (key in sample) return key;
  }
  const keys = Object.keys(sample).filter(k => k !== 'month' && k !== 'name' && k !== 'date' && typeof sample[k] === 'number');
  return keys[0] || 'value';
}

export default function Reports() {
  const [active, setActive] = useState('sales');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [period, setPeriod] = useState('30');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => { loadReport(active); }, [active, period]);

  const loadReport = async (type) => {
    try {
      setLoading(true); setError(null); setData(null);
      const fn = fetchMap[type]; if (!fn) return;
      const params = { period };
      if (startDate && endDate) { params.startDate = startDate; params.endDate = endDate; }
      const res = await fn(params);
      if (res.data?.success) setData(res.data);
    } catch { setError('Failed to load report'); } finally { setLoading(false); }
  };

  const handleExport = async () => {
    try {
      setExporting(true);
      const params = { period };
      if (startDate && endDate) { params.startDate = startDate; params.endDate = endDate; }
      const res = await exportVendorReport(active, params);
      if (res.data?.downloadUrl) window.open(res.data.downloadUrl, '_blank');
      else {
        const blob = new Blob([res.data], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = `${active}-report.csv`; a.click();
        window.URL.revokeObjectURL(url);
      }
    } catch { setError('Export failed'); } finally { setExporting(false); }
  };

  const chartData = data?.chart || data?.data || data?.monthly || data?.salesData || [];
  const chartDataKey = getChartDataKey(data);
  const chartXKey = chartData[0]?.month ? 'month' : chartData[0]?.name ? 'name' : chartData[0]?.date ? 'date' : 'name';
  const summary = data?.summary || data?.stats || data?.report || {};
  const tableRows = data?.tableData || data?.rows || data?.salesData || data?.products || [];

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-gray-900">Reports</h1><p className="text-gray-500">Analyze your store performance</p></div>
        <button onClick={handleExport} disabled={exporting || !data} className="px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 flex items-center gap-2 disabled:opacity-50"><Download size={16} />{exporting ? 'Exporting...' : 'Export CSV'}</button>
      </div>

      {error && <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3"><AlertCircle size={20} className="text-red-600" /><span className="text-red-700">{error}</span></div>}

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {reportTypes.map(r => {
          const Icon = r.icon;
          return (
            <button key={r.key} onClick={() => setActive(r.key)}
              className={`p-4 rounded-xl border-2 text-left transition-all ${active === r.key ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 hover:border-gray-300'}`}>
              <Icon size={20} className={active === r.key ? 'text-emerald-600' : 'text-gray-400'} />
              <p className="font-medium text-sm text-gray-900 mt-2">{r.label}</p>
              <p className="text-[10px] text-gray-500 mt-0.5">{r.desc}</p>
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <select value={period} onChange={e => setPeriod(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none">
          <option value="7">Last 7 days</option>
          <option value="30">Last 30 days</option>
          <option value="90">Last 90 days</option>
          <option value="365">Last year</option>
        </select>
        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none" />
        <span className="text-gray-400 text-sm">to</span>
        <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none" />
        <button onClick={() => loadReport(active)} className="p-2 hover:bg-gray-100 rounded-lg"><RefreshCw size={16} className="text-gray-400" /></button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">{reportTypes.find(r => r.key === active)?.label}</h3>
        </div>

        {loading ? <div className="flex items-center justify-center py-20"><div className="animate-spin h-10 w-10 border-4 border-emerald-200 border-t-emerald-600 rounded-full" /></div> :
         !data ? <div className="text-center py-16 text-gray-400">No data to display</div> :
         <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(summary).filter(([k, v]) => typeof v === 'number' || typeof v === 'string').slice(0, 4).map(([key, val]) => (
              <div key={key} className="bg-gray-50 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-gray-900">{typeof val === 'number' ? val.toLocaleString() : val}</p>
                <p className="text-xs text-gray-500 capitalize mt-1">{key.replace(/_/g, ' ')}</p>
              </div>
            ))}
          </div>

          {chartData.length > 0 && (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs><linearGradient id="reportGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/><stop offset="95%" stopColor="#10B981" stopOpacity={0}/></linearGradient></defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                  <XAxis dataKey={chartXKey} stroke="#9CA3AF" fontSize={12} axisLine={false} tickLine={false} />
                  <YAxis stroke="#9CA3AF" fontSize={12} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #E5E7EB' }} />
                  <Area type="monotone" dataKey={chartDataKey} stroke="#10B981" strokeWidth={3} fill="url(#reportGrad)" dot={{ fill: '#10B981', stroke: '#fff', strokeWidth: 2, r: 3 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          {tableRows.length > 0 && (
            <table className="w-full text-sm"><thead><tr className="border-b border-gray-100 bg-gray-50/50"><th className="text-left px-4 py-2 text-xs font-medium text-gray-500 uppercase">Item</th><th className="text-right px-4 py-2 text-xs font-medium text-gray-500 uppercase">Value</th></tr></thead>
            <tbody>{tableRows.slice(0, 10).map((row, i) => (
              <tr key={i} className="border-b border-gray-50"><td className="px-4 py-2 text-gray-700">{row.label || row.name || row.month || row.product_name || row.category || `Item ${i+1}`}</td><td className="px-4 py-2 text-right font-medium">{row.value || row.total || row.amount || row.revenue || row.count || 0}</td></tr>
            ))}</tbody></table>
          )}
         </div>
        }
      </div>
    </motion.div>
  );
}
