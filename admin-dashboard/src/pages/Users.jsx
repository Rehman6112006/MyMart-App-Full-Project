import React, { useState, useEffect } from 'react';
import { getUsers, updateUserStatus, deleteUser } from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Search, RefreshCw, Shield, Store, ShoppingBag, Mail, Phone, Calendar, Eye, Ban, CheckCircle, AlertCircle, Trash2, X, AlertTriangle } from 'lucide-react';

const roleConfig = {
  admin: { label: 'Admin', color: 'bg-purple-100 text-purple-700', icon: Shield },
  vendor: { label: 'Vendor', color: 'bg-blue-100 text-blue-700', icon: Store },
  customer: { label: 'Customer', color: 'bg-green-100 text-green-700', icon: ShoppingBag },
};

// Delete Confirmation Dialog Component
function DeleteDialog({ isOpen, user, onClose, onConfirm, loading }) {
  if (!isOpen || !user) return null;
  
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100]" onClick={onClose}>
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-white rounded-2xl w-full max-w-md overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
              <AlertTriangle className="text-red-600" size={24} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">Delete User?</h3>
              <p className="text-sm text-gray-500">This action cannot be undone</p>
            </div>
          </div>
          
          <div className="bg-gray-50 rounded-xl p-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-400 to-red-600 flex items-center justify-center">
                <span className="text-white font-bold text-sm">
                  {(user.first_name?.[0] || 'U').toUpperCase()}
                </span>
              </div>
              <div>
                <p className="font-medium text-gray-900">{user.first_name} {user.last_name}</p>
                <p className="text-sm text-gray-500">{user.email}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4">
            <p className="text-sm text-red-700">
              <strong>Warning:</strong> This will permanently delete:
            </p>
            <ul className="text-sm text-red-600 mt-2 space-y-1">
              <li>• User account</li>
              {user.role === 'vendor' && <li>• Store and all products</li>}
              <li>• Orders and cart items</li>
              <li>• Addresses and reviews</li>
              <li>• Wishlist and notifications</li>
            </ul>
          </div>
          
          <div className="flex gap-3">
            <button 
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 font-medium transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button 
              onClick={onConfirm}
              disabled={loading}
              className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Trash2 size={16} />
                  Delete
                </>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedUser, setSelectedUser] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  const [deleteDialog, setDeleteDialog] = useState({ isOpen: false, user: null });

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getUsers();
      if (response.data.success) {
        setUsers(response.data.users || []);
      } else if (Array.isArray(response.data)) {
        setUsers(response.data);
      }
    } catch (err) {
      console.error('Error loading users:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (user) => {
    const newStatus = !user.is_active;
    const action = newStatus ? 'activate' : 'deactivate';
    
    if (!confirm(`Are you sure you want to ${action} this user?`)) return;
    
    try {
      setActionLoading(user.id);
      await updateUserStatus(user.id, newStatus);
      await loadUsers();
    } catch (err) {
      alert('Failed to update status: ' + (err.response?.data?.error || err.message));
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteClick = (user) => {
    setDeleteDialog({ isOpen: true, user });
  };

  const handleDeleteConfirm = async () => {
    const user = deleteDialog.user;
    try {
      setActionLoading(user.id);
      await deleteUser(user.id);
      setDeleteDialog({ isOpen: false, user: null });
      await loadUsers();
    } catch (err) {
      alert('Failed to delete: ' + (err.response?.data?.error || err.message));
    } finally {
      setActionLoading(null);
    }
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch = !search || 
      u.email?.toLowerCase().includes(search.toLowerCase()) ||
      u.first_name?.toLowerCase().includes(search.toLowerCase()) ||
      u.last_name?.toLowerCase().includes(search.toLowerCase());
    
    const matchesRole = filterRole === 'all' || u.role === filterRole;
    const matchesStatus = filterStatus === 'all' || 
      (filterStatus === 'active' && u.is_active) ||
      (filterStatus === 'inactive' && !u.is_active);
    
    return matchesSearch && matchesRole && matchesStatus;
  });

  const stats = {
    total: users.length,
    customers: users.filter(u => u.role === 'customer').length,
    vendors: users.filter(u => u.role === 'vendor').length,
    admins: users.filter(u => u.role === 'admin').length,
  };

  const showUserDetails = (user) => {
    setSelectedUser(user);
    setShowModal(true);
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-PK', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Users</h1>
          <p className="text-gray-500">Manage all platform users</p>
        </div>
        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={loadUsers} className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-xl hover:from-emerald-700 hover:to-green-700 transition-all shadow-lg shadow-emerald-500/30 flex items-center gap-2">
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} /> Refresh
        </motion.button>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <User className="text-blue-600" size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              <p className="text-sm text-gray-500">Total Users</p>
            </div>
          </div>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
              <ShoppingBag className="text-green-600" size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.customers}</p>
              <p className="text-sm text-gray-500">Customers</p>
            </div>
          </div>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
              <Store className="text-purple-600" size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.vendors}</p>
              <p className="text-sm text-gray-500">Vendors</p>
            </div>
          </div>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
              <Shield className="text-red-600" size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.admins}</p>
              <p className="text-sm text-gray-500">Admins</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name or email..." className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" />
          </div>
          <div className="flex gap-2 flex-wrap">
            <select value={filterRole} onChange={(e) => setFilterRole(e.target.value)} className="px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-white">
              <option value="all">All Roles</option>
              <option value="customer">Customers</option>
              <option value="vendor">Vendors</option>
              <option value="admin">Admins</option>
            </select>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-white">
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
          <AlertCircle size={20} className="text-red-600" />
          <span className="text-red-700">{error}</span>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-12 h-12 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
        </div>
      ) : filteredUsers.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white rounded-xl shadow-sm p-12 text-center">
          <User size={64} className="mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-semibold text-gray-900">No Users Found</h3>
          <p className="text-gray-500">Try adjusting your search or filters</p>
        </motion.div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">User</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Role</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Contact</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Joined</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredUsers.map((user, i) => {
                  const roleInfo = roleConfig[user.role] || roleConfig.customer;
                  const RoleIcon = roleInfo.icon;
                  
                  return (
                    <motion.tr 
                      key={user.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.02 }}
                      className="hover:bg-emerald-50/30 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-green-500 flex items-center justify-center">
                            <span className="text-white font-bold text-sm">
                              {(user.first_name?.[0] || 'U').toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{user.first_name} {user.last_name}</p>
                            <p className="text-sm text-gray-500">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${roleInfo.color}`}>
                          <RoleIcon size={12} />
                          {roleInfo.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-gray-600">
                          {user.phone && (
                            <div className="flex items-center gap-1">
                              <Phone size={14} className="text-gray-400" />
                              {user.phone}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${user.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                          {user.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 text-sm text-gray-500">
                          <Calendar size={14} />
                          {formatDate(user.created_at)}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button onClick={() => showUserDetails(user)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                            <Eye size={16} className="text-gray-600" />
                          </button>
                          {user.role !== 'admin' && (
                            <>
                              <button 
                                onClick={() => handleToggleStatus(user)}
                                disabled={actionLoading === user.id}
                                className={`p-2 rounded-lg transition-colors ${user.is_active ? 'hover:bg-red-100' : 'hover:bg-green-100'}`}
                              >
                                {user.is_active ? (
                                  <Ban size={16} className="text-red-600" />
                                ) : (
                                  <CheckCircle size={16} className="text-green-600" />
                                )}
                              </button>
                              <button 
                                onClick={() => handleDeleteClick(user)}
                                disabled={actionLoading === user.id}
                                className="p-2 hover:bg-red-100 rounded-lg transition-colors"
                              >
                                <Trash2 size={16} className="text-red-600" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t bg-gray-50">
            <p className="text-sm text-gray-500">Showing {filteredUsers.length} of {users.length} users</p>
          </div>
        </div>
      )}

      {/* User Details Modal */}
      {showModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowModal(false)}>
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl w-full max-w-md overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-6 border-b bg-gradient-to-r from-emerald-600 to-green-600">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-xl bg-white/20 flex items-center justify-center">
                  <User size={32} className="text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">{selectedUser.first_name} {selectedUser.last_name}</h3>
                  <p className="text-emerald-100">{selectedUser.email}</p>
                </div>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Role</p>
                  <p className="font-medium capitalize">{selectedUser.role}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Status</p>
                  <p className="font-medium">{selectedUser.is_active ? 'Active' : 'Inactive'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Phone</p>
                  <p className="font-medium">{selectedUser.phone || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Joined</p>
                  <p className="font-medium">{formatDate(selectedUser.created_at)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Email Verified</p>
                  <p className="font-medium">{selectedUser.email_verified ? 'Yes' : 'No'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Phone Verified</p>
                  <p className="font-medium">{selectedUser.phone_verified ? 'Yes' : 'No'}</p>
                </div>
              </div>
              <button onClick={() => setShowModal(false)} className="w-full mt-4 px-4 py-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 font-medium">
                Close
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AnimatePresence>
        <DeleteDialog 
          isOpen={deleteDialog.isOpen}
          user={deleteDialog.user}
          onClose={() => setDeleteDialog({ isOpen: false, user: null })}
          onConfirm={handleDeleteConfirm}
          loading={actionLoading !== null}
        />
      </AnimatePresence>
    </div>
  );
}
