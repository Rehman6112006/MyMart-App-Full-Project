import React, { useState, useEffect, useRef } from 'react';
import { getAdminStore, createAdminStore, updateAdminStore, getAdminStoreProducts, createAdminStoreProduct, updateAdminStoreProduct, deleteAdminStoreProduct, getCategories, uploadAdminStoreImage } from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import { Store, Package, Plus, Edit, Trash2, X, RefreshCw, AlertCircle, Image as ImageIcon, Camera, Upload, Loader2, DollarSign } from 'lucide-react';

export default function AdminStore() {
  const [store, setStore] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('store');

  const [formMode, setFormMode] = useState(null);
  const [formData, setFormData] = useState({});
  const [editingProduct, setEditingProduct] = useState(null);
  const [categories, setCategories] = useState([]);
  const [imageUploading, setImageUploading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const fileInputRef = useRef(null);

  const emptyProduct = {
    name: '', description: '', brand: '', base_price: '', stock_quantity: '',
    category_id: '', image_url: '', is_active: true, discount_percentage: ''
  };

  useEffect(() => {
    loadAll();
    fetchCategories();
  }, []);

  const loadAll = async () => {
    try {
      setLoading(true);
      setError(null);

      const [storeRes] = await Promise.all([
        getAdminStore().catch(() => ({ data: { success: true, store: null } }))
      ]);

      if (storeRes.data.success) {
        setStore(storeRes.data.store);
      }

      if (storeRes.data.store) {
        const productsRes = await getAdminStoreProducts().catch(() => ({ data: { success: true, products: [] } }));
        if (productsRes.data.success) setProducts(productsRes.data.products || []);
      }
    } catch (err) {
      console.error('Error loading admin store:', err);
      setError('Failed to load store data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateStore = async () => {
    try {
      setLoading(true);
      const res = await createAdminStore(formData);
      if (res.data.success) {
        setStore(res.data.store);
        setFormMode(null);
        setFormData({});
        loadAll();
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create store');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStore = async () => {
    try {
      setLoading(true);
      const res = await updateAdminStore(formData);
      if (res.data.success) {
        setStore(res.data.store);
        setFormMode(null);
        setFormData({});
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update store');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProduct = async (id) => {
    if (!window.confirm('Delete this product permanently?')) return;
    try {
      await deleteAdminStoreProduct(id);
      const productsRes = await getAdminStoreProducts();
      if (productsRes.data.success) setProducts(productsRes.data.products || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete product');
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await getCategories();
      if (res.data?.success && Array.isArray(res.data?.categories)) {
        setCategories(res.data.categories.filter(c => c.is_active !== false));
      }
    } catch (e) { /* optional */ }
  };

  const handleFileUpload = async (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) { setError('Please select an image file'); return }
    if (file.size > 5 * 1024 * 1024) { setError('Image must be under 5MB'); return }
    setImageUploading(true);
    setError('');
    try {
      const reader = new FileReader();
      const base64 = await new Promise((resolve, reject) => {
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const res = await uploadAdminStoreImage({ imageData: base64 });
      if (res.data?.success && res.data?.data?.imageUrl) {
        setFormData(prev => ({ ...prev, image_url: res.data.data.imageUrl }));
      } else {
        setError('Upload failed — try pasting a URL instead');
      }
    } catch (e) {
      setError(e.response?.data?.error || e.response?.data?.message || 'Image upload failed');
    } finally {
      setImageUploading(false);
    }
  };

  const handleProductSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!formData.name?.trim()) { setError('Product name is required'); return }
    if (!formData.base_price || parseFloat(formData.base_price) <= 0) { setError('Please enter a valid price'); return }
    const payload = {
      name: formData.name.trim(),
      description: formData.description?.trim() || '',
      base_price: parseFloat(formData.base_price),
      stock_quantity: parseInt(formData.stock_quantity) || 0,
      brand: formData.brand?.trim() || '',
      image_url: formData.image_url?.trim() || '',
      is_active: formData.is_active,
      discount_percentage: parseFloat(formData.discount_percentage) || 0,
    };
    if (formData.category_id) payload.category_id = formData.category_id;
    try {
      if (editingProduct) {
        await updateAdminStoreProduct(editingProduct, payload);
      } else {
        await createAdminStoreProduct(payload);
      }
      setShowModal(false);
      setEditingProduct(null);
      setFormData({});
      const productsRes = await getAdminStoreProducts();
      if (productsRes.data.success) setProducts(productsRes.data.products || []);
    } catch (e) {
      setError(e.response?.data?.error || e.response?.data?.message || e.message || 'Operation failed');
    }
  };

  const openAddModal = () => {
    setEditingProduct(null);
    setFormData({ ...emptyProduct });
    setError('');
    setShowModal(true);
  };

  const openEditModal = (product) => {
    setEditingProduct(product.id);
    setFormData({
      name: product.name || '',
      description: product.description || '',
      brand: product.brand || '',
      base_price: product.base_price?.toString() || '',
      stock_quantity: product.stock_quantity?.toString() || '0',
      category_id: product.category_id || '',
      image_url: product.image_url || '',
      is_active: product.is_active ?? true,
      discount_percentage: product.discount_percentage?.toString() || '',
    });
    setError('');
    setShowModal(true);
  };

  const formatCurrency = (num) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(num || 0);
  };

  if (loading && !store) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-12 h-12 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Store</h1>
          <p className="text-gray-500">Manage your own official store on the platform</p>
        </div>
        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={loadAll} className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-xl hover:from-emerald-700 hover:to-green-700 transition-all shadow-lg shadow-emerald-500/30 flex items-center gap-2">
          <RefreshCw size={18} /> Refresh
        </motion.button>
      </motion.div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
          <AlertCircle size={20} className="text-red-600" />
          <span className="text-red-700">{error}</span>
        </div>
      )}

      {!store ? (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl shadow-sm p-8 border border-gray-100 text-center">
          <div className="w-20 h-20 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Store size={40} className="text-purple-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Create Your Admin Store</h2>
          <p className="text-gray-500 mb-6 max-w-md mx-auto">Set up your official store to manage products and orders separately from vendor management.</p>
          {formMode === 'create' ? (
            <div className="max-w-md mx-auto space-y-4 text-left">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Store Name</label>
                <input type="text" value={formData.store_name || ''} onChange={e => setFormData({ ...formData, store_name: e.target.value })} className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none" placeholder="My Official Store" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea value={formData.description || ''} onChange={e => setFormData({ ...formData, description: e.target.value })} className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none" rows={3} placeholder="Store description" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input type="text" value={formData.phone || ''} onChange={e => setFormData({ ...formData, phone: e.target.value })} className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input type="email" value={formData.email || ''} onChange={e => setFormData({ ...formData, email: e.target.value })} className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none" />
              </div>
              <div className="flex gap-3">
                <motion.button whileHover={{ scale: 1.02 }} onClick={handleCreateStore} className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-500 to-violet-500 text-white rounded-xl font-medium">
                  Create Store
                </motion.button>
                <motion.button whileHover={{ scale: 1.02 }} onClick={() => { setFormMode(null); setFormData({}); }} className="px-6 py-3 border border-gray-200 rounded-xl font-medium text-gray-600">
                  Cancel
                </motion.button>
              </div>
            </div>
          ) : (
            <motion.button whileHover={{ scale: 1.02 }} onClick={() => setFormMode('create')} className="px-6 py-3 bg-gradient-to-r from-purple-500 to-violet-500 text-white rounded-xl font-medium inline-flex items-center gap-2 shadow-lg shadow-purple-500/30">
              <Plus size={18} /> Create Admin Store
            </motion.button>
          )}
        </motion.div>
      ) : (
        <>
          {/* Store Info */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-violet-500 rounded-2xl flex items-center justify-center shadow-lg">
                  <Store size={32} className="text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{store.store_name}</h2>
                  <p className="text-gray-500">{store.description || 'No description'}</p>
                  {store.phone && <p className="text-sm text-gray-400">{store.phone} {store.email ? `| ${store.email}` : ''}</p>}
                </div>
              </div>
              <motion.button whileHover={{ scale: 1.05 }} onClick={() => { setFormMode('edit'); setFormData({ store_name: store.store_name, description: store.description, phone: store.phone, email: store.email }); }} className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 flex items-center gap-2">
                <Edit size={16} /> Edit Store
              </motion.button>
            </div>
          </motion.div>

          {formMode === 'edit' && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
              <h3 className="font-semibold text-gray-900 mb-4">Edit Store</h3>
              <div className="max-w-md space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Store Name</label>
                  <input type="text" value={formData.store_name || ''} onChange={e => setFormData({ ...formData, store_name: e.target.value })} className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea value={formData.description || ''} onChange={e => setFormData({ ...formData, description: e.target.value })} className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none" rows={3} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                    <input type="text" value={formData.phone || ''} onChange={e => setFormData({ ...formData, phone: e.target.value })} className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input type="email" value={formData.email || ''} onChange={e => setFormData({ ...formData, email: e.target.value })} className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none" />
                  </div>
                </div>
                <div className="flex gap-3">
                  <motion.button whileHover={{ scale: 1.02 }} onClick={handleUpdateStore} className="px-6 py-2.5 bg-gradient-to-r from-purple-500 to-violet-500 text-white rounded-lg font-medium">
                    Save Changes
                  </motion.button>
                  <motion.button whileHover={{ scale: 1.02 }} onClick={() => { setFormMode(null); setFormData({}); }} className="px-6 py-2.5 border border-gray-200 rounded-lg font-medium text-gray-600">
                    Cancel
                  </motion.button>
                </div>
              </div>
            </motion.div>
          )}

          {/* Tabs */}
          <div className="flex gap-2 border-b border-gray-200">
            <button onClick={() => setActiveTab('store')} className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'store' ? 'border-purple-600 text-purple-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              <Package size={16} className="inline mr-2" />Products ({products.length})
            </button>
          </div>

          {/* Products Tab */}
          {activeTab === 'store' && (
            <div className="space-y-4">
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                onClick={openAddModal}
                className="w-full py-4 border-2 border-dashed border-gray-200 rounded-2xl text-gray-400 hover:text-emerald-600 hover:border-emerald-300 transition-colors flex items-center justify-center gap-2"
              >
                <Plus size={20} /> Add Product to Admin Store
              </motion.button>

              {products.length === 0 ? (
                <div className="bg-white rounded-xl p-12 text-center border border-gray-100">
                  <Package size={48} className="mx-auto mb-3 text-gray-300" />
                  <p className="text-gray-500">No products yet. Add your first product to the admin store.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {products.map((product, i) => (
                    <motion.div key={product.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                      className="bg-white rounded-xl p-4 border border-gray-100 flex items-center justify-between hover:shadow-sm transition-shadow group"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-xl bg-gray-100 flex items-center justify-center overflow-hidden">
                          {product.image_url || product.thumbnail ? (
                            <img src={product.image_url || product.thumbnail} alt={product.name} className="w-full h-full object-cover" />
                          ) : (
                            <Package size={24} className="text-gray-300" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{product.name}</p>
                          <p className="text-sm text-gray-500">{product.brand || 'No brand'}</p>
                          <p className="text-sm font-bold text-emerald-600">{formatCurrency(product.base_price)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${product.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                          {product.is_active ? 'Active' : 'Inactive'}
                        </span>
                        <span className="text-sm text-gray-500">Stock: {product.stock_quantity || 0}</span>
                        <button onClick={() => openEditModal(product)}
                          className="p-2 hover:bg-emerald-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100">
                          <Edit size={16} className="text-emerald-600" />
                        </button>
                        <button onClick={() => handleDeleteProduct(product.id)}
                          className="p-2 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100">
                          <Trash2 size={16} className="text-red-600" />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          )}

        </>
      )}

      {/* Add/Edit Product Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto py-8"
          >
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowModal(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden"
            >
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-gray-50 to-white">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    {editingProduct ? 'Edit Product' : 'Add New Product'}
                  </h2>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {editingProduct ? 'Update the product details below' : 'Fill in the details to create a new product'}
                  </p>
                </div>
                <button onClick={() => { setShowModal(false); setEditingProduct(null); setFormData({}); }}
                  className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              {/* Modal Form */}
              <form onSubmit={handleProductSubmit} className="p-6 space-y-6">
                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-center gap-2 text-sm text-red-700">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    {error}
                  </div>
                )}

                {/* Basic Info Section */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Package className="w-4 h-4 text-emerald-500" /> Basic Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Product Name <span className="text-red-500">*</span></label>
                      <input type="text" value={formData.name || ''} onChange={e => setFormData({ ...formData, name: e.target.value })}
                        className="input-field" placeholder="e.g., Organic Honey" />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                      <textarea value={formData.description || ''} onChange={e => setFormData({ ...formData, description: e.target.value })}
                        className="input-field min-h-[80px]" rows={3} placeholder="Describe your product..." />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Brand</label>
                      <input type="text" value={formData.brand || ''} onChange={e => setFormData({ ...formData, brand: e.target.value })}
                        className="input-field" placeholder="e.g., Nature's Best" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                      <div className="relative">
                        <select value={formData.category_id || ''} onChange={e => setFormData({ ...formData, category_id: e.target.value })}
                          className="input-field appearance-none cursor-pointer pr-10"
                        >
                          <option value="">Select a category</option>
                          {categories.map(c => (
                            <option key={c.id} value={c.id}>
                              {c.icon || '📦'} {c.name}
                            </option>
                          ))}
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <hr className="border-gray-100" />

                {/* Pricing & Stock Section */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-emerald-500" /> Pricing & Stock
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Price ($) <span className="text-red-500">*</span></label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium">$</span>
                        <input type="number" step="0.01" min="0" value={formData.base_price || ''}
                          onChange={e => setFormData({ ...formData, base_price: e.target.value })}
                          className="input-field pl-8" placeholder="0.00" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Discount %</label>
                      <input type="number" min="0" max="100" value={formData.discount_percentage || ''}
                        onChange={e => setFormData({ ...formData, discount_percentage: e.target.value })}
                        className="input-field" placeholder="0" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Stock Quantity</label>
                      <input type="number" min="0" value={formData.stock_quantity || ''}
                        onChange={e => setFormData({ ...formData, stock_quantity: e.target.value })}
                        className="input-field" placeholder="0" />
                    </div>
                  </div>
                </div>

                <hr className="border-gray-100" />

                {/* Media Section */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Camera className="w-4 h-4 text-emerald-500" /> Product Image
                  </h3>

                  {/* File Upload Area */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Upload from computer</label>
                    <input type="file" ref={fileInputRef} accept="image/*" className="hidden"
                      onChange={e => { const f = e.target.files?.[0]; if (f) handleFileUpload(f); e.target.value = '' }} />
                    <button type="button" onClick={() => fileInputRef.current?.click()} disabled={imageUploading}
                      className="w-full border-2 border-dashed border-gray-200 rounded-xl p-6 hover:border-emerald-400 hover:bg-emerald-50/30 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed group"
                    >
                      {imageUploading ? (
                        <div className="flex flex-col items-center gap-2">
                          <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
                          <span className="text-sm text-gray-500">Uploading...</span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-2">
                          <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center group-hover:bg-emerald-100 transition-colors">
                            <Upload className="w-6 h-6 text-emerald-500" />
                          </div>
                          <span className="text-sm font-medium text-gray-600">Click to upload an image</span>
                          <span className="text-xs text-gray-400">PNG, JPG, WebP — max 5MB</span>
                        </div>
                      )}
                    </button>
                  </div>

                  {/* URL Input Fallback */}
                  <div className="relative">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex-1 h-px bg-gray-200" />
                      <span className="text-xs text-gray-400 font-medium">or paste an image URL</span>
                      <div className="flex-1 h-px bg-gray-200" />
                    </div>
                    <div className="relative">
                      <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input type="url" value={formData.image_url || ''}
                        onChange={e => setFormData({ ...formData, image_url: e.target.value })}
                        className="input-field pl-10" placeholder="https://example.com/image.jpg" />
                    </div>
                  </div>

                  {/* Image Preview */}
                  {formData.image_url && (
                    <div className="mt-4">
                      <p className="text-xs font-medium text-gray-500 mb-2">Preview:</p>
                      <div className="relative w-36 h-36 rounded-xl border border-gray-200 overflow-hidden bg-gray-50">
                        <img src={formData.image_url} alt="Preview"
                          className="w-full h-full object-cover"
                          onError={e => {
                            e.target.style.display = 'none';
                            e.target.nextElementSibling.style.display = 'flex';
                          }} />
                        <div className="hidden w-full h-full items-center justify-center">
                          <div className="text-center">
                            <ImageIcon className="w-7 h-7 text-gray-300 mx-auto mb-1" />
                            <p className="text-xs text-gray-400">Invalid image URL</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <hr className="border-gray-100" />

                {/* Status Section */}
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900">Product Status</h3>
                    <p className="text-xs text-gray-500 mt-0.5">Make this product available for purchase</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" checked={formData.is_active ?? true}
                      onChange={e => setFormData({ ...formData, is_active: e.target.checked })}
                      className="sr-only peer" />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600" />
                  </label>
                </div>

                {/* Submit */}
                <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-100">
                  <button type="button" onClick={() => { setShowModal(false); setEditingProduct(null); setFormData({}); }}
                    className="px-5 py-2.5 border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors text-sm font-medium"
                  >
                    Cancel
                  </button>
                  <button type="submit"
                    className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-xl hover:from-emerald-700 hover:to-green-700 transition-all text-sm font-medium shadow-lg shadow-emerald-500/20 flex items-center gap-2"
                  >
                    {editingProduct ? <><Edit size={16} /> Update Product</> : <><Plus size={16} /> Create Product</>}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
