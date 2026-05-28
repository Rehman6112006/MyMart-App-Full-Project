import React, { useState, useEffect } from 'react';
import {
  getStaffRoles, createStaffRole, getStoreStaff, inviteStaff,
  updateStaffRole, removeStaff, getStaffActivity, getStaffPermissions
} from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import {
  UserCog, Mail, Shield, Calendar, Search, RefreshCw,
  UserPlus, X, CheckCircle, AlertCircle, Trash2, Clock,
  Activity, Users, Ban, Eye, Settings, Loader, Plus, Save
} from 'lucide-react';

function InviteModal({ isOpen, onClose, onSubmit, roles, loading }) {
  const [form, setForm] = useState({ email: '', role: '', permissions: [] });

  useEffect(() => {
    if (isOpen) setForm({ email: '', role: '', permissions: [] });
  }, [isOpen]);

  if (!isOpen) return null;

  const togglePermission = (perm) => {
    setForm(prev => ({
      ...prev,
      permissions: prev.permissions.includes(perm)
        ? prev.permissions.filter(p => p !== perm)
        : [...prev.permissions, perm]
    }));
  };

  const permissionOptions = ['manage_orders', 'manage_products', 'manage_users', 'manage_staff', 'view_analytics', 'manage_settings'];

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] p-4" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-white rounded-2xl w-full max-w-lg overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6 border-b bg-gradient-to-r from-rose-600 to-pink-600">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                <UserPlus size={28} className="text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Invite Staff</h3>
                <p className="text-rose-100 text-sm">Send invitation email</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg"><X size={20} className="text-white" /></button>
          </div>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <div className="relative">
              <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="staff@example.com" className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-rose-500 outline-none" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
            <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-rose-500 outline-none bg-white">
              <option value="">Select role</option>
              {roles.map(r => <option key={r.id || r.name} value={r.name || r.id}>{r.name || r.role_name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Permissions</label>
            <div className="grid grid-cols-2 gap-2">
              {permissionOptions.map(perm => (
                <label key={perm} className="flex items-center gap-2 p-2 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                  <input type="checkbox" checked={form.permissions.includes(perm)} onChange={() => togglePermission(perm)} className="rounded text-rose-600 focus:ring-rose-500" />
                  <span className="text-sm text-gray-700 capitalize">{perm.replace(/_/g, ' ')}</span>
                </label>
              ))}
            </div>
          </div>
          <button onClick={() => onSubmit(form)} disabled={loading || !form.email || !form.role} className="w-full px-4 py-2.5 bg-gradient-to-r from-rose-600 to-pink-600 text-white rounded-xl hover:from-rose-700 hover:to-pink-700 font-medium transition-all disabled:opacity-50 flex items-center justify-center gap-2">
            {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><UserPlus size={18} /> Send Invitation</>}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function RolesModal({ isOpen, onClose, roles, onCreateRole, loading }) {
  const [name, setName] = useState('');
  const [permissions, setPermissions] = useState([]);
  const [editingRole, setEditingRole] = useState(null);

  useEffect(() => {
    if (!isOpen) { setName(''); setPermissions([]); setEditingRole(null); }
  }, [isOpen]);

  if (!isOpen) return null;

  const togglePerm = (perm) => {
    setPermissions(prev => prev.includes(perm) ? prev.filter(p => p !== perm) : [...prev, perm]);
  };

  const permissionOptions = ['manage_orders', 'manage_products', 'manage_users', 'manage_staff', 'view_analytics', 'manage_settings'];

  const handleCreate = () => {
    onCreateRole({ name, permissions });
    setName('');
    setPermissions([]);
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] p-4" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-white rounded-2xl w-full max-w-lg overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6 border-b bg-gradient-to-r from-purple-600 to-violet-600">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                <Shield size={28} className="text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Manage Roles</h3>
                <p className="text-purple-100 text-sm">Create and edit staff roles</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg"><X size={20} className="text-white" /></button>
          </div>
        </div>
        <div className="p-6 space-y-6">
          <div className="space-y-3">
            <h4 className="font-semibold text-gray-800">Existing Roles</h4>
            {roles.length === 0 ? (
              <p className="text-sm text-gray-500">No roles defined yet.</p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {roles.map((role, idx) => (
                  <div key={role.id || idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                    <div>
                      <p className="font-medium text-gray-900">{role.name || role.role_name}</p>
                      <p className="text-xs text-gray-500">{role.permissions?.length || 0} permissions</p>
                    </div>
                    <span className="px-2.5 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">{role.staff_count || 0} staff</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="border-t pt-4">
            <h4 className="font-semibold text-gray-800 mb-3">Create New Role</h4>
            <div className="space-y-3">
              <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Role name" className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none" />
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Permissions</p>
                <div className="grid grid-cols-2 gap-2">
                  {permissionOptions.map(perm => (
                    <label key={perm} className="flex items-center gap-2 p-2 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                      <input type="checkbox" checked={permissions.includes(perm)} onChange={() => togglePerm(perm)} className="rounded text-purple-600 focus:ring-purple-500" />
                      <span className="text-sm text-gray-700 capitalize">{perm.replace(/_/g, ' ')}</span>
                    </label>
                  ))}
                </div>
              </div>
              <button onClick={handleCreate} disabled={loading || !name} className="w-full px-4 py-2.5 bg-gradient-to-r from-purple-600 to-violet-600 text-white rounded-xl hover:from-purple-700 hover:to-violet-700 font-medium transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><Save size={18} /> Create Role</>}
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function ConfirmDialog({ isOpen, title, message, onClose, onConfirm, loading }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] p-4" onClick={onClose}>
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="bg-white rounded-2xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center"><AlertCircle className="text-red-600" size={24} /></div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">{title}</h3>
              <p className="text-sm text-gray-500">{message}</p>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} disabled={loading} className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 font-medium transition-colors disabled:opacity-50">Cancel</button>
            <button onClick={onConfirm} disabled={loading} className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
              {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><Trash2 size={16} /> Confirm</>}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default function Staff() {
  const [staff, setStaff] = useState([]);
  const [roles, setRoles] = useState([]);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [inviteOpen, setInviteOpen] = useState(false);
  const [rolesOpen, setRolesOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState({ isOpen: false, staff: null });
  const [tab, setTab] = useState('staff');

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    try {
      setLoading(true);
      setError(null);
      const [staffRes, rolesRes, activityRes] = await Promise.all([
        getStoreStaff(),
        getStaffRoles(),
        getStaffActivity()
      ]);
      setStaff(staffRes.data?.staff || staffRes.data?.users || staffRes.data || []);
      setRoles(rolesRes.data?.roles || rolesRes.data || []);
      setActivity(activityRes.data?.activity || activityRes.data?.logs || activityRes.data || []);
    } catch (err) {
      console.error('Error loading staff data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async (form) => {
    try {
      setActionLoading('invite');
      await inviteStaff(form);
      setInviteOpen(false);
      await loadAll();
    } catch (err) {
      alert('Failed to invite: ' + (err.response?.data?.error || err.message));
    } finally {
      setActionLoading(null);
    }
  };

  const handleCreateRole = async (data) => {
    try {
      setActionLoading('role');
      await createStaffRole(data);
      await loadAll();
    } catch (err) {
      alert('Failed to create role: ' + (err.response?.data?.error || err.message));
    } finally {
      setActionLoading(null);
    }
  };

  const handleRemoveStaff = async () => {
    const s = confirmDelete.staff;
    if (!s) return;
    try {
      setActionLoading(s.id);
      await removeStaff(s.id);
      setConfirmDelete({ isOpen: false, staff: null });
      await loadAll();
    } catch (err) {
      alert('Failed to remove: ' + (err.response?.data?.error || err.message));
    } finally {
      setActionLoading(null);
    }
  };

  const handleUpdateRole = async (staffId, newRole) => {
    try {
      setActionLoading(staffId);
      await updateStaffRole(staffId, { role: newRole });
      await loadAll();
    } catch (err) {
      alert('Failed to update role: ' + (err.response?.data?.error || err.message));
    } finally {
      setActionLoading(null);
    }
  };

  const filteredStaff = staff.filter(s => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (s.email || '').toLowerCase().includes(q) ||
      (s.name || s.first_name || '').toLowerCase().includes(q) ||
      (s.role || '').toLowerCase().includes(q);
  });

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-PK', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const formatTime = (date) => {
    if (!date) return '';
    return new Date(date).toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' });
  };

  const stats = {
    total: staff.length,
    active: staff.filter(s => s.is_active || s.status === 'active').length,
    roles: roles.length
  };

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Staff Management</h1>
          <p className="text-gray-500">Manage store staff, roles, and permissions</p>
        </div>
        <div className="flex gap-2">
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setRolesOpen(true)} className="px-4 py-2.5 bg-gradient-to-r from-purple-600 to-violet-600 text-white rounded-xl hover:from-purple-700 hover:to-violet-700 transition-all shadow-lg shadow-purple-500/30 flex items-center gap-2 text-sm">
            <Shield size={18} /> Manage Roles
          </motion.button>
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setInviteOpen(true)} className="px-4 py-2.5 bg-gradient-to-r from-rose-600 to-pink-600 text-white rounded-xl hover:from-rose-700 hover:to-pink-700 transition-all shadow-lg shadow-rose-500/30 flex items-center gap-2 text-sm">
            <UserPlus size={18} /> Invite Staff
          </motion.button>
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={loadAll} className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-xl hover:from-emerald-700 hover:to-green-700 transition-all shadow-lg shadow-emerald-500/30 flex items-center gap-2 text-sm">
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </motion.button>
        </div>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-rose-100 flex items-center justify-center"><UserCog className="text-rose-600" size={20} /></div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              <p className="text-sm text-gray-500">Total Staff</p>
            </div>
          </div>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center"><CheckCircle className="text-green-600" size={20} /></div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.active}</p>
              <p className="text-sm text-gray-500">Active</p>
            </div>
          </div>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center"><Shield className="text-purple-600" size={20} /></div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.roles}</p>
              <p className="text-sm text-gray-500">Roles</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        <button onClick={() => setTab('staff')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === 'staff' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
          <Users size={16} className="inline mr-1.5" /> Staff
        </button>
        <button onClick={() => setTab('activity')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === 'activity' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
          <Activity size={16} className="inline mr-1.5" /> Activity Log
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
          <AlertCircle size={20} className="text-red-600" />
          <span className="text-red-700">{error}</span>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-12 h-12 border-4 border-rose-200 border-t-rose-600 rounded-full animate-spin" />
        </div>
      ) : tab === 'staff' ? (
        <>
          {/* Search */}
          <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
            <div className="relative">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, email, or role..." className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-rose-500 outline-none" />
            </div>
          </div>

          {filteredStaff.length === 0 ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white rounded-xl shadow-sm p-12 text-center">
              <UserCog size={64} className="mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-semibold text-gray-900">No Staff Found</h3>
              <p className="text-gray-500">{staff.length === 0 ? 'Invite your first staff member to get started' : 'Try adjusting your search'}</p>
            </motion.div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Staff Member</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Role</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Joined</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredStaff.map((s, i) => (
                      <motion.tr
                        key={s.id || i}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.02 }}
                        className="hover:bg-rose-50/30 transition-colors"
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-400 to-pink-500 flex items-center justify-center">
                              <span className="text-white font-bold text-sm">
                                {((s.name || s.first_name || s.email)?.[0] || 'S').toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{s.name || s.first_name || s.email?.split('@')[0]}</p>
                              <p className="text-sm text-gray-500">{s.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <select
                              value={s.role || s.role_name || ''}
                              onChange={e => handleUpdateRole(s.id, e.target.value)}
                              disabled={actionLoading === s.id}
                              className="px-2.5 py-1 border border-gray-200 rounded-lg text-xs font-medium bg-white focus:ring-2 focus:ring-rose-500 outline-none disabled:opacity-50"
                            >
                              {roles.map(r => (
                                <option key={r.id || r.name} value={r.name || r.id}>{r.name || r.role_name}</option>
                              ))}
                            </select>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${s.is_active || s.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                            {s.is_active || s.status === 'active' ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 text-sm text-gray-500">
                            <Calendar size={14} />
                            {formatDate(s.created_at || s.joined_at)}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => setConfirmDelete({ isOpen: true, staff: s })}
                              disabled={actionLoading === s.id}
                              className="p-2 hover:bg-red-100 rounded-lg transition-colors disabled:opacity-50"
                            >
                              <Trash2 size={16} className="text-red-600" />
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="px-4 py-3 border-t bg-gray-50">
                <p className="text-sm text-gray-500">Showing {filteredStaff.length} of {staff.length} staff members</p>
              </div>
            </div>
          )}
        </>
      ) : (
        /* Activity Log Tab */
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-4 py-3 border-b bg-gray-50">
            <h3 className="font-semibold text-gray-800 flex items-center gap-2"><Activity size={18} className="text-rose-500" /> Activity Log</h3>
          </div>
          {activity.length === 0 ? (
            <div className="p-12 text-center">
              <Clock size={48} className="mx-auto mb-3 text-gray-300" />
              <p className="text-gray-500">No activity recorded yet</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {activity.map((log, i) => (
                <motion.div
                  key={log.id || i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.02 }}
                  className="flex items-start gap-3 p-4 hover:bg-gray-50"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-rose-100 to-pink-100 flex items-center justify-center flex-shrink-0">
                    <Activity size={16} className="text-rose-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900">{log.action || log.description || log.message}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{log.performed_by || log.user_name || log.email}</p>
                  </div>
                  <div className="text-xs text-gray-400 flex-shrink-0 text-right">
                    <p>{formatDate(log.created_at || log.timestamp)}</p>
                    <p>{formatTime(log.created_at || log.timestamp)}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Invite Modal */}
      <AnimatePresence>
        {inviteOpen && (
          <InviteModal
            isOpen={inviteOpen}
            onClose={() => setInviteOpen(false)}
            onSubmit={handleInvite}
            roles={roles}
            loading={actionLoading === 'invite'}
          />
        )}
      </AnimatePresence>

      {/* Roles Modal */}
      <AnimatePresence>
        {rolesOpen && (
          <RolesModal
            isOpen={rolesOpen}
            onClose={() => setRolesOpen(false)}
            roles={roles}
            onCreateRole={handleCreateRole}
            loading={actionLoading === 'role'}
          />
        )}
      </AnimatePresence>

      {/* Delete Confirm */}
      <AnimatePresence>
        <ConfirmDialog
          isOpen={confirmDelete.isOpen}
          title="Remove Staff?"
          message="This will revoke their access immediately."
          onClose={() => setConfirmDelete({ isOpen: false, staff: null })}
          onConfirm={handleRemoveStaff}
          loading={actionLoading !== null && actionLoading !== 'invite' && actionLoading !== 'role'}
        />
      </AnimatePresence>
    </div>
  );
}
