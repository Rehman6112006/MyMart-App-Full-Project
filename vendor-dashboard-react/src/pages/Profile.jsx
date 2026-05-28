import { useState } from 'react';
import { motion } from 'framer-motion';
import { UserCircle, Lock, KeyRound, AlertCircle, CheckCircle, Save } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { changeVendorPassword } from '../services/api';

export default function Profile() {
  const { user } = useAuth();
  const [passwords, setPasswords] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const handlePasswordChange = async (e) => {
    e.preventDefault(); setError(null); setSuccess(null);
    if (passwords.newPassword !== passwords.confirmPassword) { setError('New passwords do not match'); return; }
    if (passwords.newPassword.length < 6) { setError('Password must be at least 6 characters'); return; }
    try {
      setLoading(true);
      await changeVendorPassword({ oldPassword: passwords.oldPassword, newPassword: passwords.newPassword });
      setSuccess('Password changed successfully!');
      setPasswords({ oldPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.message || 'Failed to change password');
    } finally { setLoading(false); }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 max-w-2xl">
      <div><h1 className="text-2xl font-bold text-gray-900">Profile & Settings</h1><p className="text-gray-500">Manage your account settings</p></div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg">
            <span className="text-2xl font-bold text-white">{user?.first_name?.[0]?.toUpperCase() || 'V'}</span>
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">{user?.first_name} {user?.last_name}</h3>
            <p className="text-sm text-gray-500">{user?.email}</p>
            <span className="inline-flex items-center gap-1 text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full mt-1"><CheckCircle size={12} /> Active Account</span>
          </div>
        </div>
        <div className="space-y-3">
          <div className="flex justify-between py-2 border-b border-gray-50"><span className="text-sm text-gray-500">Email</span><span className="text-sm font-medium text-gray-900">{user?.email}</span></div>
          <div className="flex justify-between py-2 border-b border-gray-50"><span className="text-sm text-gray-500">Phone</span><span className="text-sm font-medium text-gray-900">{user?.phone || 'Not set'}</span></div>
          <div className="flex justify-between py-2 border-b border-gray-50"><span className="text-sm text-gray-500">Role</span><span className="text-sm font-medium text-gray-900 capitalize">{user?.role}</span></div>
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4"><Lock size={18} className="text-amber-500" /><h3 className="font-semibold text-gray-900">Change Password</h3></div>
        {error && <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-2 mb-4"><AlertCircle size={16} className="text-red-600" /><span className="text-red-700 text-sm">{error}</span></div>}
        {success && <div className="bg-green-50 border border-green-200 rounded-xl p-3 flex items-center gap-2 mb-4"><CheckCircle size={16} className="text-green-600" /><span className="text-green-700 text-sm">{success}</span></div>}
        <form onSubmit={handlePasswordChange} className="space-y-4">
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label><div className="relative"><KeyRound size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" /><input type="password" value={passwords.oldPassword} onChange={e => setPasswords({...passwords, oldPassword: e.target.value})} required className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none" /></div></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">New Password</label><div className="relative"><KeyRound size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" /><input type="password" value={passwords.newPassword} onChange={e => setPasswords({...passwords, newPassword: e.target.value})} required minLength={6} className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none" /></div></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label><div className="relative"><KeyRound size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" /><input type="password" value={passwords.confirmPassword} onChange={e => setPasswords({...passwords, confirmPassword: e.target.value})} required className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none" /></div></div>
          <button type="submit" disabled={loading} className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-xl font-medium disabled:opacity-50 flex items-center gap-2"><Save size={16} />{loading ? 'Saving...' : 'Update Password'}</button>
        </form>
      </motion.div>
    </motion.div>
  );
}