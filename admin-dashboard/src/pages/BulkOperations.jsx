import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Upload, Download, Database, FileSpreadsheet, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { bulkImportProducts, getImportJobs, exportProducts, exportOrders, getExportJobs, getProductsTemplate } from '../services/api';

const tabs = ['Import Products', 'Export Data', 'Job History'];

export default function BulkOperations() {
  const [activeTab, setActiveTab] = useState('Import Products');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [importJobs, setImportJobs] = useState([]);
  const [exportJobs, setExportJobs] = useState([]);
  const [file, setFile] = useState(null);
  const [exportType, setExportType] = useState('products');

  useEffect(() => { fetchJobs(); }, []);

  const fetchJobs = async () => {
    try { const [impRes, expRes] = await Promise.all([getImportJobs().catch(() => null), getExportJobs().catch(() => null)]); if (impRes?.data?.success) setImportJobs(impRes.data.jobs || []); if (expRes?.data?.success) setExportJobs(expRes.data.jobs || []); } catch {}
  };

  const handleImport = async () => {
    if (!file) { setError('Please select a CSV file'); return; }
    try { setLoading(true); setError(null); const fd = new FormData(); fd.append('file', file); await bulkImportProducts(fd); setSuccess('Import started successfully!'); setFile(null); fetchJobs(); } catch { setError('Import failed. Check file format.'); } finally { setLoading(false); }
  };

  const handleExport = async () => {
    try { setLoading(true); setError(null);
      const res = exportType === 'products' ? await exportProducts() : await exportOrders();
      if (res.data?.downloadUrl) window.open(res.data.downloadUrl, '_blank');
      else setSuccess(`${exportType} export started!`);
      fetchJobs();
    } catch { setError('Export failed'); } finally { setLoading(false); }
  };

  const handleDownloadTemplate = async () => {
    try { const res = await getProductsTemplate(); if (res.data?.downloadUrl) window.open(res.data.downloadUrl, '_blank'); }
    catch { setError('Could not download template'); }
  };

  const allJobs = [...importJobs.map(j => ({ ...j, type: 'import' })), ...exportJobs.map(j => ({ ...j, type: 'export' }))];

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div><h1 className="text-2xl font-bold text-gray-900">Bulk Operations</h1><p className="text-gray-500">Import, export, and manage data in bulk</p></div>

      {error && <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3"><AlertCircle size={20} className="text-red-600" /><span className="text-red-700">{error}</span></div>}
      {success && <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3"><CheckCircle size={20} className="text-green-600" /><span className="text-green-700">{success}</span></div>}

      <div className="flex gap-2 bg-gray-100 p-1 rounded-xl w-fit">
        {tabs.map(t => <button key={t} onClick={() => setActiveTab(t)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>{t}</button>)}
      </div>

      {activeTab === 'Import Products' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm max-w-xl">
          <div className="flex items-center gap-3 mb-6"><div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center"><Upload size={22} className="text-orange-600" /></div><div><h3 className="font-semibold text-gray-900">Import Products</h3><p className="text-sm text-gray-500">Upload a CSV file to import products in bulk</p></div></div>
          <div className="space-y-4">
            <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center hover:border-emerald-300 transition-colors">
              <FileSpreadsheet size={40} className="mx-auto text-gray-300 mb-3" />
              <label className="cursor-pointer">
                <span className="text-emerald-600 font-medium hover:text-emerald-700">{file ? file.name : 'Click to select CSV file'}</span>
                <input type="file" accept=".csv" onChange={e => setFile(e.target.files[0])} className="hidden" />
              </label>
              <p className="text-xs text-gray-400 mt-1">Max 10MB</p>
            </div>
            <button onClick={handleDownloadTemplate} className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"><Download size={14} /> Download CSV template</button>
            <button onClick={handleImport} disabled={!file || loading} className="w-full py-3 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-xl font-medium disabled:opacity-50">{loading ? 'Importing...' : 'Start Import'}</button>
          </div>
        </motion.div>
      )}

      {activeTab === 'Export Data' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm max-w-xl">
          <div className="flex items-center gap-3 mb-6"><div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center"><Download size={22} className="text-blue-600" /></div><div><h3 className="font-semibold text-gray-900">Export Data</h3><p className="text-sm text-gray-500">Download data in CSV format</p></div></div>
          <div className="space-y-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-2">Export Type</label>
              <div className="grid grid-cols-2 gap-3">
                {['products', 'orders'].map(t => <button key={t} onClick={() => setExportType(t)} className={`p-4 rounded-xl border-2 text-left capitalize transition-all ${exportType === t ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 hover:border-gray-300'}`}><p className="font-medium text-gray-900">{t}</p><p className="text-xs text-gray-500 mt-1">Export all {t}</p></button>)}
              </div>
            </div>
            <button onClick={handleExport} disabled={loading} className="w-full py-3 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-xl font-medium disabled:opacity-50">{loading ? 'Exporting...' : `Export ${exportType}`}</button>
          </div>
        </motion.div>
      )}

      {activeTab === 'Job History' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <table className="w-full"><thead><tr className="border-b border-gray-100 bg-gray-50/50"><th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Type</th><th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">File</th><th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th><th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Date</th></tr></thead>
          <tbody>{allJobs.length === 0 ? <tr><td colSpan={4} className="text-center py-12 text-gray-400">No jobs yet</td></tr> : allJobs.map((j, i) => (
            <tr key={j.id || i} className="border-b border-gray-50 hover:bg-gray-50/50">
              <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${j.type === 'import' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>{j.type}</span></td>
              <td className="px-4 py-3 text-sm text-gray-700">{j.file_name || j.filename || '—'}</td>
              <td className="px-4 py-3"><span className={`px-2 py-1 rounded-full text-xs font-medium ${j.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : j.status === 'failed' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>{j.status || 'pending'}</span></td>
              <td className="px-4 py-3 text-xs text-gray-500">{j.created_at ? new Date(j.created_at).toLocaleString() : '—'}</td>
            </tr>
          ))}</tbody></table>
        </motion.div>
      )}
    </motion.div>
  );
}