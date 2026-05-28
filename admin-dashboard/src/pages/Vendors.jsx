import React, { useState, useEffect } from 'react';
import { getStores, approveStore, suspendVendor, reactivateVendor, getProducts, getCategories, deleteUser } from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import { Store, CheckCircle, XCircle, Clock, Users, Search, Eye, Ban, RotateCcw, Mail, Phone, MapPin, Star, Package, DollarSign, X, Folder, RefreshCw, Trash2, AlertTriangle, TrendingUp, ShoppingBag, BadgeCheck } from 'lucide-react';

const statusConfig = {
  pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
  verified: { label: 'Verified', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  suspended: { label: 'Suspended', color: 'bg-red-100 text-red-700', icon: Ban },
  no_store: { label: 'No Store', color: 'bg-gray-100 text-gray-600', icon: Store },
};

// Delete Confirmation Dialog Component
function VendorDeleteDialog({ isOpen, vendor, onClose, onConfirm, loading }) {
  if (!isOpen || !vendor) return null;
  
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
              <h3 className="text-lg font-bold text-gray-900">Delete Vendor?</h3>
              <p className="text-sm text-gray-500">This action cannot be undone</p>
            </div>
          </div>
          
          <div className="bg-gray-50 rounded-xl p-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-green-600 flex items-center justify-center">
                <Store size={20} className="text-white" />
              </div>
              <div>
                <p className="font-medium text-gray-900">{vendor.store_name || 'N/A'}</p>
                <p className="text-sm text-gray-500">{vendor.email}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4">
            <p className="text-sm text-red-700">
              <strong>Warning:</strong> This will permanently delete:
            </p>
            <ul className="text-sm text-red-600 mt-2 space-y-1">
              <li>• Vendor account</li>
              <li>• Store and all products</li>
              <li>• Orders and cart items</li>
              <li>• Reviews and ratings</li>
              <li>• All related data</li>
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

export default function Vendors() {
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  const [vendorProducts, setVendorProducts] = useState([]);
  const [vendorCategories, setVendorCategories] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [activeTab, setActiveTab] = useState('details');
  const [deleteDialog, setDeleteDialog] = useState({ isOpen: false, vendor: null });

  useEffect(() => {
    loadVendors();
  }, []);

  const loadVendors = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getStores();
      if (response.data.success) {
        setVendors(response.data.vendors || response.data.stores || []);
      } else if (Array.isArray(response.data)) {
        setVendors(response.data);
      }
    } catch (err) {
      console.error('Error loading vendors:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id) => {
    try {
      setActionLoading(id);
      await approveStore(id);
      await loadVendors();
    } catch (err) {
      alert('Failed to approve: ' + (err.response?.data?.error || err.message));
    } finally {
      setActionLoading(null);
    }
  };

  const handleSuspend = async (id) => {
    if (!confirm('Are you sure you want to suspend this vendor?')) return;
    try {
      setActionLoading(id);
      await suspendVendor(id);
      await loadVendors();
    } catch (err) {
      alert('Failed to suspend: ' + (err.response?.data?.error || err.message));
    } finally {
      setActionLoading(null);
    }
  };

  const handleReactivate = async (id) => {
    try {
      setActionLoading(id);
      await reactivateVendor(id);
      await loadVendors();
    } catch (err) {
      alert('Failed to reactivate: ' + (err.response?.data?.error || err.message));
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteClick = (vendor) => {
    setDeleteDialog({ isOpen: true, vendor });
  };

  const handleDeleteConfirm = async () => {
    const vendor = deleteDialog.vendor;
    try {
      setActionLoading(vendor.user_id || vendor.id);
      await deleteUser(vendor.user_id || vendor.id);
      setDeleteDialog({ isOpen: false, vendor: null });
      await loadVendors();
    } catch (err) {
      alert('Failed to delete: ' + (err.response?.data?.error || err.message));
    } finally {
      setActionLoading(null);
    }
  };

  const loadVendorProducts = async (vendorId) => {
    setLoadingProducts(true);
    try {
      const response = await getProducts({ store_id: vendorId });
      if (response.data.success) {
        setVendorProducts(response.data.products || []);
      } else if (Array.isArray(response.data)) {
        setVendorProducts(response.data);
      } else {
        setVendorProducts([]);
      }
      
      // Calculate categories from products
      const cats = {};
      response.data.products?.forEach(p => {
        if (p.category_name) {
          cats[p.category_name] = (cats[p.category_name] || 0) + 1;
        }
      });
      setVendorCategories(Object.entries(cats).map(([name, count]) => ({ name, count })));
    } catch (err) {
      console.error('Error loading vendor products:', err);
      setVendorProducts([]);
    } finally {
      setLoadingProducts(false);
    }
  };

  const showVendorDetails = async (vendor) => {
    setSelectedVendor(vendor);
    setShowDetails(true);
    setActiveTab('details');
    await loadVendorProducts(vendor.id);
  };

  // Helper to determine vendor status
  const getVendorStatus = (v) => {
    if (!v.has_store) return 'no_store';
    if (!v.is_verified) return 'pending';
    if (!v.is_active) return 'suspended';
    return 'verified';
  };

  const filteredVendors = vendors.filter(v => {
    const matchesSearch = !search || 
      v.store_name?.toLowerCase().includes(search.toLowerCase()) ||
      v.email?.toLowerCase().includes(search.toLowerCase());
    
    const status = getVendorStatus(v);
    if (filter === 'pending') return matchesSearch && status === 'pending';
    if (filter === 'verified') return matchesSearch && status === 'verified';
    if (filter === 'suspended') return matchesSearch && status === 'suspended';
    if (filter === 'no_store') return matchesSearch && status === 'no_store';
    return matchesSearch;
  });

  const stats = {
    total: vendors.length,
    pending: vendors.filter(v => getVendorStatus(v) === 'pending').length,
    verified: vendors.filter(v => getVendorStatus(v) === 'verified').length,
    suspended: vendors.filter(v => getVendorStatus(v) === 'suspended').length,
    no_store: vendors.filter(v => getVendorStatus(v) === 'no_store').length,
  };

  const formatCurrency = (num) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(num || 0);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col lg:flex-row lg:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Vendor Management</h1>
          <p className="text-gray-500">Manage vendors, stores and approvals</p>
        </div>
        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={loadVendors} className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-xl hover:from-emerald-700 hover:to-green-700 transition-all shadow-lg shadow-emerald-500/30 flex items-center gap-2">
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} /> Refresh
        </motion.button>
      </motion.div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <Store className="text-blue-600" size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              <p className="text-sm text-gray-500">Total Vendors</p>
            </div>
          </div>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-yellow-100 flex items-center justify-center">
              <Clock className="text-yellow-600" size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.pending}</p>
              <p className="text-sm text-gray-500">Pending Approval</p>
            </div>
          </div>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
              <CheckCircle className="text-green-600" size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.verified}</p>
              <p className="text-sm text-gray-500">Verified</p>
            </div>
          </div>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
              <Ban className="text-red-600" size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.suspended}</p>
              <p className="text-sm text-gray-500">Suspended</p>
            </div>
          </div>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
              <Store className="text-gray-600" size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.no_store}</p>
              <p className="text-sm text-gray-500">No Store</p>
            </div>
          </div>
        </motion.div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Search and Filter */}
      <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search vendors..." className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" />
          </div>
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => setFilter('all')} className={`px-4 py-2 rounded-lg font-medium transition-all ${filter === 'all' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/30' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              All ({stats.total})
            </button>
            <button onClick={() => setFilter('pending')} className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${filter === 'pending' ? 'bg-yellow-500 text-white shadow-lg shadow-yellow-500/30' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              <Clock size={16} /> Pending ({stats.pending})
            </button>
            <button onClick={() => setFilter('no_store')} className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${filter === 'no_store' ? 'bg-gray-500 text-white shadow-lg shadow-gray-500/30' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              <Store size={16} /> No Store ({stats.no_store})
            </button>
            <button onClick={() => setFilter('verified')} className={`px-4 py-2 rounded-lg font-medium transition-all ${filter === 'verified' ? 'bg-green-600 text-white shadow-lg shadow-green-500/30' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              Verified ({stats.verified})
            </button>
            <button onClick={() => setFilter('suspended')} className={`px-4 py-2 rounded-lg font-medium transition-all ${filter === 'suspended' ? 'bg-red-600 text-white shadow-lg shadow-red-500/30' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              Suspended ({stats.suspended})
            </button>
          </div>
        </div>
      </div>

      {/* Vendors Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-12 h-12 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
        </div>
      ) : filteredVendors.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white rounded-xl shadow-sm p-12 text-center">
          <Store size={64} className="mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-semibold text-gray-900">No Vendors Found</h3>
          <p className="text-gray-500">Try adjusting your search or filter</p>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredVendors.map((vendor, index) => {
            const status = getVendorStatus(vendor);
            const statusInfo = statusConfig[status];
            const StatusIcon = statusInfo.icon;
            
            return (
              <motion.div
                key={vendor.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                whileHover={{ y: -5, shadow: '0 20px 40px -10px rgba(0,0,0,0.1)' }}
                className={`bg-white rounded-2xl shadow-sm overflow-hidden border-l-4 ${
                  status === 'verified' ? 'border-emerald-500 ring-1 ring-emerald-100' : status === 'pending' ? 'border-yellow-500' : status === 'no_store' ? 'border-gray-400' : 'border-red-500'
                }`}
              >
                <div className="p-5">
                  <div className="flex items-start gap-4 mb-4">
                    <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${status === 'verified' ? 'from-emerald-500 to-green-600' : status === 'pending' ? 'from-yellow-500 to-orange-500' : status === 'no_store' ? 'from-gray-400 to-gray-500' : 'from-red-500 to-rose-600'} flex items-center justify-center shadow-lg relative`}>
                      <Store size={28} className="text-white" />
                      {status === 'verified' && (
                        <div className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center border-2 border-white">
                          <BadgeCheck size={10} className="text-white" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-gray-900 truncate">{vendor.store_name || vendor.email}</h3>
                        {status === 'verified' && (
                          <span className="shrink-0 px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded text-[10px] font-semibold">ACTIVE</span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 truncate">{vendor.email}</p>
                      <span className={`inline-flex items-center gap-1 mt-2 px-2.5 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}>
                        <StatusIcon size={12} />
                        {statusInfo.label}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2 text-sm">
                    {vendor.phone && (
                      <div className="flex items-center gap-2 text-gray-600">
                        <Phone size={14} />
                        <span>{vendor.phone}</span>
                      </div>
                    )}
                    {vendor.city && (
                      <div className="flex items-center gap-2 text-gray-600">
                        <MapPin size={14} />
                        <span>{vendor.city}{vendor.state ? `, ${vendor.state}` : ''}</span>
                      </div>
                    )}
                  </div>

                  <div className={`grid ${status === 'verified' ? 'grid-cols-4' : 'grid-cols-3'} gap-2 mt-4 pt-4 border-t ${status === 'verified' ? 'bg-gradient-to-r from-emerald-50/50 to-green-50/50 -mx-5 px-5 py-3 border-y' : ''}`}>
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1 text-emerald-600">
                        <Package size={status === 'verified' ? 16 : 14} />
                        <span className={`font-bold ${status === 'verified' ? 'text-lg' : ''}`}>{vendor.total_products || 0}</span>
                      </div>
                      <p className={`text-gray-500 ${status === 'verified' ? 'text-xs' : 'text-xs'}`}>Products</p>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1 text-blue-600">
                        <ShoppingBag size={status === 'verified' ? 16 : 14} />
                        <span className={`font-bold ${status === 'verified' ? 'text-lg' : ''}`}>{vendor.total_orders || 0}</span>
                      </div>
                      <p className={`text-gray-500 ${status === 'verified' ? 'text-xs' : 'text-xs'}`}>Orders</p>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1 text-yellow-500">
                        <Star size={status === 'verified' ? 16 : 14} className="fill-yellow-400" />
                        <span className={`font-bold ${status === 'verified' ? 'text-lg' : ''}`}>
                          {typeof vendor.avg_rating === 'number' ? vendor.avg_rating.toFixed(1) : (parseFloat(vendor.avg_rating) || 0).toFixed(1)}
                        </span>
                      </div>
                      <p className={`text-gray-500 ${status === 'verified' ? 'text-xs' : 'text-xs'}`}>Rating</p>
                    </div>
                    {status === 'verified' && (
                      <div className="text-center">
                        <div className="flex items-center justify-center gap-1 text-emerald-600">
                          <DollarSign size={16} />
                          <span className="font-bold text-lg">{formatCurrency(vendor.total_revenue)}</span>
                        </div>
                        <p className="text-xs text-gray-500">Revenue</p>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 mt-4 pt-4 border-t">
                    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => showVendorDetails(vendor)} className="flex-1 px-3 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 flex items-center justify-center gap-1">
                      <Eye size={16} /> Details
                    </motion.button>
                    
                    {status === 'pending' && (
                      <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => handleApprove(vendor.id)} disabled={actionLoading === vendor.id} className="flex-1 px-3 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 flex items-center justify-center gap-1 disabled:opacity-50">
                        <CheckCircle size={16} /> Approve Store
                      </motion.button>
                    )}
                    
                    {status === 'no_store' && (
                      <div className="flex-1 px-3 py-2 bg-gray-100 text-gray-500 text-sm font-medium rounded-lg flex items-center justify-center gap-1 cursor-not-allowed">
                        <Store size={16} /> Waiting for Store
                      </div>
                    )}
                    
                    {status === 'verified' && (
                      <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => handleSuspend(vendor.id)} disabled={actionLoading === vendor.id} className="flex-1 px-3 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 flex items-center justify-center gap-1 disabled:opacity-50">
                        <Ban size={16} /> Suspend
                      </motion.button>
                    )}
                    
                    {status === 'suspended' && (
                      <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => handleReactivate(vendor.id)} disabled={actionLoading === vendor.id} className="flex-1 px-3 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 flex items-center justify-center gap-1 disabled:opacity-50">
                        <RotateCcw size={16} /> Reactivate
                      </motion.button>
                    )}
                    
                    <motion.button 
                      whileHover={{ scale: 1.02 }} 
                      whileTap={{ scale: 0.98 }} 
                      onClick={() => handleDeleteClick(vendor)} 
                      disabled={actionLoading === (vendor.user_id || vendor.id)} 
                      className="px-3 py-2 bg-red-100 text-red-600 text-sm font-medium rounded-lg hover:bg-red-200 flex items-center justify-center gap-1 disabled:opacity-50"
                      title="Delete Permanently"
                    >
                      <Trash2 size={16} />
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Vendor Details Modal */}
      <AnimatePresence>
        {showDetails && selectedVendor && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowDetails(false)}>
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col"
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div className="p-6 border-b bg-gradient-to-r from-emerald-600 to-green-600">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-xl bg-white/20 flex items-center justify-center">
                      <Store size={32} className="text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white">{selectedVendor.store_name}</h3>
                      <p className="text-emerald-100">{selectedVendor.email}</p>
                    </div>
                  </div>
                  <button onClick={() => setShowDetails(false)} className="p-2 hover:bg-white/20 rounded-lg">
                    <X size={20} className="text-white" />
                  </button>
                </div>
                
                {/* Tabs */}
                <div className="flex gap-4 mt-4">
                  <button 
                    onClick={() => setActiveTab('details')}
                    className={`px-4 py-2 rounded-lg font-medium transition-all ${activeTab === 'details' ? 'bg-white text-emerald-600' : 'bg-white/20 text-white hover:bg-white/30'}`}
                  >
                    Details
                  </button>
                  <button 
                    onClick={() => setActiveTab('products')}
                    className={`px-4 py-2 rounded-lg font-medium transition-all ${activeTab === 'products' ? 'bg-white text-emerald-600' : 'bg-white/20 text-white hover:bg-white/30'}`}
                  >
                    Products ({vendorProducts.length})
                  </button>
                  <button 
                    onClick={() => setActiveTab('categories')}
                    className={`px-4 py-2 rounded-lg font-medium transition-all ${activeTab === 'categories' ? 'bg-white text-emerald-600' : 'bg-white/20 text-white hover:bg-white/30'}`}
                  >
                    Categories ({vendorCategories.length})
                  </button>
                </div>
              </div>
              
              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6">
                {activeTab === 'details' && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-500">Owner Name</p>
                        <p className="font-medium">{selectedVendor.first_name} {selectedVendor.last_name}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Phone</p>
                        <p className="font-medium">{selectedVendor.phone || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Location</p>
                        <p className="font-medium">{selectedVendor.city || 'N/A'}{selectedVendor.state ? `, ${selectedVendor.state}` : ''}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Status</p>
                        <p className="font-medium capitalize">
                          {!selectedVendor.has_store ? 'No Store Created' : !selectedVendor.is_verified ? 'Pending Approval' : !selectedVendor.is_active ? 'Suspended' : 'Verified'}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Total Products</p>
                        <p className="font-medium">{selectedVendor.total_products || 0}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Total Orders</p>
                        <p className="font-medium">{selectedVendor.total_orders || 0}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Total Revenue</p>
                        <p className="font-medium text-emerald-600">{formatCurrency(selectedVendor.total_revenue)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Average Rating</p>
                        <p className="font-medium flex items-center gap-1">
                          <Star size={16} className="text-yellow-500" />
                          {typeof selectedVendor.avg_rating === 'number' ? selectedVendor.avg_rating.toFixed(1) : (parseFloat(selectedVendor.avg_rating) || 0).toFixed(1)}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                
                {activeTab === 'products' && (
                  <div>
                    {loadingProducts ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="w-8 h-8 border-3 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
                      </div>
                    ) : vendorProducts.length === 0 ? (
                      <div className="text-center py-8">
                        <Package size={48} className="mx-auto mb-3 text-gray-300" />
                        <p className="text-gray-500">No products found for this vendor</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {vendorProducts.slice(0, 10).map(product => (
                          <div key={product.id} className="flex items-center gap-4 p-3 bg-gray-50 rounded-xl">
                            <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center overflow-hidden">
                              {product.thumbnail ? (
                                <img src={product.thumbnail} alt={product.name} className="w-full h-full object-cover" />
                              ) : (
                                <Package size={24} className="text-gray-300" />
                              )}
                            </div>
                            <div className="flex-1">
                              <p className="font-medium text-gray-900 truncate">{product.name}</p>
                              <p className="text-sm text-gray-500">{product.category_name || 'Uncategorized'}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-emerald-600">{formatCurrency(product.base_price)}</p>
                              <p className="text-xs text-gray-500">Stock: {product.stock_quantity || 0}</p>
                            </div>
                          </div>
                        ))}
                        {vendorProducts.length > 10 && (
                          <p className="text-center text-sm text-gray-500 py-2">+ {vendorProducts.length - 10} more products</p>
                        )}
                      </div>
                    )}
                  </div>
                )}
                
                {activeTab === 'categories' && (
                  <div>
                    {vendorCategories.length === 0 ? (
                      <div className="text-center py-8">
                        <Folder size={48} className="mx-auto mb-3 text-gray-300" />
                        <p className="text-gray-500">No categories found for this vendor</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {vendorCategories.map(cat => (
                          <div key={cat.name} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                            <div className="flex items-center gap-3">
                              <Folder size={20} className="text-emerald-600" />
                              <span className="font-medium text-gray-900">{cat.name}</span>
                            </div>
                            <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-sm font-medium">
                              {cat.count} products
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Dialog */}
      <VendorDeleteDialog 
        isOpen={deleteDialog.isOpen}
        vendor={deleteDialog.vendor}
        onClose={() => setDeleteDialog({ isOpen: false, vendor: null })}
        onConfirm={handleDeleteConfirm}
        loading={actionLoading !== null}
      />
    </div>
  );
}
