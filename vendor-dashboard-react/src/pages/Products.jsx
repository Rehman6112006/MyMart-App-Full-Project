import React, { useState, useEffect, useRef } from 'react';
import { getVendorProducts, createVendorProduct, updateVendorProduct, deleteVendorProduct, uploadVendorImage, getCategories } from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import { Package, Plus, Edit2, Trash2, X, AlertCircle, Search, RefreshCw, Image as ImageIcon, Camera, Upload, Loader2, DollarSign } from 'lucide-react';

const formatCurrency = (num) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(num || 0);

export default function Products() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [formData, setFormData] = useState({});
  const [categories, setCategories] = useState([]);
  const [imageUploading, setImageUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef(null);

  const emptyProduct = {
    name: '', description: '', brand: '', base_price: '', stock_quantity: '',
    category_id: '', image_url: '', is_active: true, discount_percentage: ''
  };

  useEffect(() => { loadProducts(); fetchCategories(); }, []);

  const loadProducts = async () => {
    try { setLoading(true); setError(null); const res = await getVendorProducts(); if (res.data.success) setProducts(res.data.products || []); }
    catch { setError('Failed to load products'); } finally { setLoading(false); }
  };

  const fetchCategories = async () => {
    try { const res = await getCategories(); if (res.data?.success && Array.isArray(res.data?.categories)) setCategories(res.data.categories.filter(c => c.is_active !== false)); }
    catch {}
  };

  const handleFileUpload = async (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) { setError('Please select an image file'); return; }
    if (file.size > 5 * 1024 * 1024) { setError('Image must be under 5MB'); return; }
    setImageUploading(true);
    setError(null);
    try {
      const reader = new FileReader();
      const base64 = await new Promise((resolve, reject) => {
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const res = await uploadVendorImage({ imageData: base64 });
      if (res.data?.success && res.data?.data?.imageUrl) {
        setFormData(prev => ({ ...prev, image_url: res.data.data.imageUrl }));
      } else {
        setError('Upload failed — try pasting a URL instead');
      }
    } catch (e) {
      setError(e.response?.data?.error || e.response?.data?.message || 'Image upload failed');
    } finally { setImageUploading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (!formData.name?.trim()) { setError('Product name is required'); return; }
    if (!formData.base_price || parseFloat(formData.base_price) <= 0) { setError('Please enter a valid price'); return; }
    setSaving(true);
    try {
      const payload = {
        name: formData.name.trim(),
        description: formData.description?.trim() || '',
        base_price: parseFloat(formData.base_price) || 0,
        stock_quantity: parseInt(formData.stock_quantity) || 0,
        brand: formData.brand?.trim() || '',
        image_url: formData.image_url?.trim() || '',
        is_active: formData.is_active,
        discount_percentage: parseFloat(formData.discount_percentage) || 0,
      };
      if (formData.category_id) payload.category_id = formData.category_id;
      if (editingProduct) {
        await updateVendorProduct(editingProduct, payload);
      } else {
        await createVendorProduct(payload);
      }
      setShowModal(false);
      setEditingProduct(null);
      setFormData({});
      loadProducts();
    } catch (e) {
      setError(e.response?.data?.error || e.response?.data?.message || e.message || 'Operation failed');
    } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this product permanently?')) return;
    try { await deleteVendorProduct(id); loadProducts(); }
    catch { setError('Failed to delete product'); }
  };

  const openAddModal = () => {
    setEditingProduct(null);
    setFormData({ ...emptyProduct });
    setError(null);
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
    setError(null);
    setShowModal(true);
  };

  const filtered = products.filter(p => p.name?.toLowerCase().includes(search.toLowerCase()));

  if (loading) return <div className="flex items-center justify-center h-96"><div className="w-16 h-16 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Products</h1>
          <p className="text-gray-500">Manage your product catalog</p>
        </div>
        <div className="flex items-center gap-3">
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={loadProducts}
            className="p-2.5 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors" title="Refresh">
            <RefreshCw size={18} />
          </motion.button>
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={openAddModal}
            className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-xl hover:from-emerald-700 hover:to-green-700 transition-all shadow-lg shadow-emerald-500/30 flex items-center gap-2 font-medium">
            <Plus size={18} /> Add Product
          </motion.button>
        </div>
      </motion.div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-center gap-3 text-sm text-red-700">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span className="flex-1">{error}</span>
          <button onClick={() => setError(null)} className="p-1 hover:bg-red-100 rounded-lg"><X className="w-4 h-4" /></button>
        </div>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search products..."
          className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm" />
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <Package size={48} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500 font-medium">{search ? 'No products match your search' : 'No products yet'}</p>
            {!search && <p className="text-gray-400 text-sm mt-1">Click "Add Product" to get started</p>}
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filtered.map((product, i) => (
              <motion.div key={product.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}
                className="p-4 flex items-center justify-between hover:bg-gray-50/50 transition-colors group"
              >
                <div className="flex items-center gap-4 min-w-0 flex-1">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-emerald-100 to-green-100 flex items-center justify-center overflow-hidden shrink-0">
                    {product.image_url || product.thumbnail ? (
                      <img src={product.image_url || product.thumbnail} alt={product.name} className="w-full h-full object-cover"
                        onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }} />
                    ) : null}
                    <div className={`w-full h-full items-center justify-center ${product.image_url || product.thumbnail ? 'hidden' : 'flex'}`}>
                      <Package size={22} className="text-emerald-600" />
                    </div>
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 truncate">{product.name}</p>
                    <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                      <span>{product.category_name || 'Uncategorized'}</span>
                      {product.brand && <><span>·</span><span>{product.brand}</span></>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <div className="text-right hidden sm:block">
                    <p className="font-semibold text-gray-900">{formatCurrency(product.base_price || product.price || 0)}</p>
                    <p className={`text-xs ${(product.stock_quantity ?? product.stock) > 0 ? 'text-gray-500' : 'text-red-500'}`}>
                      {(product.stock_quantity ?? product.stock) > 0 ? `Stock: ${product.stock_quantity ?? product.stock}` : 'Out of Stock'}
                    </p>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium hidden sm:inline ${product.is_active !== false ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-600'}`}>
                    {product.is_active !== false ? 'Active' : 'Inactive'}
                  </span>
                  <div className="flex items-center gap-1">
                    <button onClick={() => openEditModal(product)}
                      className="p-2 rounded-lg hover:bg-emerald-50 text-emerald-600 opacity-0 group-hover:opacity-100 transition-all">
                      <Edit2 size={16} />
                    </button>
                    <button onClick={() => handleDelete(product.id)}
                      className="p-2 rounded-lg hover:bg-red-50 text-red-500 opacity-0 group-hover:opacity-100 transition-all">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Product Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto py-8 px-4"
          >
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => { if (!saving) { setShowModal(false); setEditingProduct(null); setFormData({}); } }}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden"
            >
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-gray-50 to-white">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    {editingProduct ? 'Edit Product' : 'Add New Product'}
                  </h2>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {editingProduct ? 'Update the product details below' : 'Fill in the details to create a new product'}
                  </p>
                </div>
                <button onClick={() => { if (!saving) { setShowModal(false); setEditingProduct(null); setFormData({}); } }}
                  className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-6">
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
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="e.g., Organic Honey" />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                      <textarea value={formData.description || ''} onChange={e => setFormData({ ...formData, description: e.target.value })}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none min-h-[80px]" rows={3} placeholder="Describe your product..." />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Brand</label>
                      <input type="text" value={formData.brand || ''} onChange={e => setFormData({ ...formData, brand: e.target.value })}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="e.g., Nature's Best" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                      <div className="relative">
                        <select value={formData.category_id || ''} onChange={e => setFormData({ ...formData, category_id: e.target.value })}
                          className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none appearance-none cursor-pointer pr-10 bg-white"
                        >
                          <option value="">Select a category</option>
                          {categories.map(c => (
                            <option key={c.id} value={c.id}>{c.icon || '📦'} {c.name}</option>
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
                          className="w-full pl-8 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="0.00" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Discount %</label>
                      <input type="number" min="0" max="100" value={formData.discount_percentage || ''}
                        onChange={e => setFormData({ ...formData, discount_percentage: e.target.value })}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="0" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Stock Quantity</label>
                      <input type="number" min="0" value={formData.stock_quantity || ''}
                        onChange={e => setFormData({ ...formData, stock_quantity: e.target.value })}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="0" />
                    </div>
                  </div>
                </div>

                <hr className="border-gray-100" />

                {/* Media Section */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Camera className="w-4 h-4 text-emerald-500" /> Product Image
                  </h3>

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
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="https://example.com/image.jpg" />
                    </div>
                  </div>

                  {formData.image_url && (
                    <div className="mt-4">
                      <p className="text-xs font-medium text-gray-500 mb-2">Preview:</p>
                      <div className="relative w-36 h-36 rounded-xl border border-gray-200 overflow-hidden bg-gray-50">
                        <img src={formData.image_url} alt="Preview"
                          className="w-full h-full object-cover"
                          onError={e => { e.target.style.display = 'none'; e.target.nextElementSibling.style.display = 'flex'; }} />
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
                  <button type="button" onClick={() => { if (!saving) { setShowModal(false); setEditingProduct(null); setFormData({}); } }}
                    className="px-5 py-2.5 border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors text-sm font-medium"
                  >
                    Cancel
                  </button>
                  <button type="submit" disabled={saving}
                    className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-xl hover:from-emerald-700 hover:to-green-700 transition-all text-sm font-medium shadow-lg shadow-emerald-500/20 flex items-center gap-2 disabled:opacity-50"
                  >
                    {saving ? (
                      <><Loader2 size={16} className="animate-spin" /> Saving...</>
                    ) : editingProduct ? (
                      <><Edit2 size={16} /> Update Product</>
                    ) : (
                      <><Plus size={16} /> Create Product</>
                    )}
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
