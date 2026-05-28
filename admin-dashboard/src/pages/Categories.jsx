import React, { useState, useEffect } from 'react';
import { getCategories, createCategory, updateCategory, deleteCategory, getProductsByCategory } from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import { Folder, RefreshCw, Plus, Edit, Trash2, Package, X, Save, AlertCircle, CheckCircle, ArrowLeft, Image, Store } from 'lucide-react';

export default function Categories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [formData, setFormData] = useState({ name: '', description: '', color: '#10B981' });
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  
  // Products view state
  const [showProducts, setShowProducts] = useState(false);
  const [categoryProducts, setCategoryProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [productsTotal, setProductsTotal] = useState(0);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getCategories();
      if (response.data.success) {
        setCategories(response.data.categories || []);
      } else {
        setCategories(response.data || []);
      }
    } catch (err) {
      console.error('Error loading categories:', err);
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadCategoryProducts = async (category) => {
    try {
      setSelectedCategory(category);
      setProductsLoading(true);
      setShowProducts(true);
      const response = await getProductsByCategory(category.id);
      if (response.data.success) {
        setCategoryProducts(response.data.products || []);
        setProductsTotal(response.data.total || 0);
      } else {
        setCategoryProducts([]);
      }
    } catch (err) {
      console.error('Error loading products:', err);
      setCategoryProducts([]);
    } finally {
      setProductsLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError('Category name is required');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      
      if (editMode && selectedCategory) {
        await updateCategory(selectedCategory.id, formData);
        setSuccessMsg('Category updated successfully!');
      } else {
        await createCategory(formData);
        setSuccessMsg('Category created successfully!');
      }
      
      setShowModal(false);
      resetForm();
      await loadCategories();
      
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (category) => {
    setSelectedCategory(category);
    setFormData({ 
      name: category.name, 
      description: category.description || '',
      color: category.color || '#10B981'
    });
    setEditMode(true);
    setShowModal(true);
  };

  const handleDelete = async (category) => {
    if (!confirm(`Are you sure you want to delete "${category.name}"?`)) return;
    
    try {
      await deleteCategory(category.id);
      setSuccessMsg('Category deleted successfully!');
      await loadCategories();
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    }
  };

  const resetForm = () => {
    setFormData({ name: '', description: '', color: '#10B981' });
    setEditMode(false);
    setSelectedCategory(null);
  };

  const openAddModal = () => {
    resetForm();
    setShowModal(true);
  };

  const goBackToCategories = () => {
    setShowProducts(false);
    setSelectedCategory(null);
    setCategoryProducts([]);
  };

  const colors = ['#10B981', '#3B82F6', '#8B5CF6', '#EC4899', '#F59E0B', '#EF4444', '#06B6D4', '#84CC16'];

  // Products view
  if (showProducts && selectedCategory) {
    return (
      <div className="space-y-6">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={goBackToCategories}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft size={24} className="text-gray-600" />
            </button>
            <div>
              <div className="flex items-center gap-3">
                <div 
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: `${selectedCategory.color || '#10B981'}20` }}
                >
                  <Folder size={20} style={{ color: selectedCategory.color || '#10B981' }} />
                </div>
                <h1 className="text-2xl font-bold text-gray-900">{selectedCategory.name}</h1>
              </div>
              <p className="text-gray-500 ml-13">{productsTotal} products in this category</p>
            </div>
          </div>
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={goBackToCategories} className="px-5 py-2.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-all flex items-center gap-2">
            Back to Categories
          </motion.button>
        </motion.div>

        {productsLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-12 h-12 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
          </div>
        ) : categoryProducts.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white rounded-xl shadow-sm p-12 text-center">
            <Package size={64} className="mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-semibold text-gray-900">No Products Found</h3>
            <p className="text-gray-500">This category has no products yet</p>
          </motion.div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Product</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Store</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Price</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Stock</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {categoryProducts.map((product) => (
                    <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {product.image_url ? (
                            <img src={product.image_url} alt={product.name} className="w-12 h-12 rounded-lg object-cover" />
                          ) : (
                            <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center">
                              <Image size={20} className="text-gray-400" />
                            </div>
                          )}
                          <div>
                            <p className="font-medium text-gray-900">{product.name}</p>
                            <p className="text-sm text-gray-500">{product.brand || 'No brand'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Store size={16} className="text-gray-400" />
                          <span className="text-gray-700">{product.store_name || 'Unknown'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-semibold text-gray-900">Rs. {parseFloat(product.base_price || 0).toLocaleString()}</span>
                        {product.discount_percentage > 0 && (
                          <span className="ml-2 text-sm text-green-600">{product.discount_percentage}% off</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          product.stock_quantity > 10 ? 'bg-green-100 text-green-700' :
                          product.stock_quantity > 0 ? 'bg-yellow-100 text-yellow-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {product.stock_quantity || 0} in stock
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          product.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {product.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Categories view
  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Categories</h1>
          <p className="text-gray-500">Manage product categories</p>
        </div>
        <div className="flex gap-3">
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={loadCategories} className="px-5 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-all flex items-center gap-2">
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} /> Refresh
          </motion.button>
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={openAddModal} className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-xl hover:from-emerald-700 hover:to-green-700 transition-all shadow-lg shadow-emerald-500/30 flex items-center gap-2">
            <Plus size={18} /> Add Category
          </motion.button>
        </div>
      </motion.div>

      {/* Success Message */}
      <AnimatePresence>
        {successMsg && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3"
          >
            <CheckCircle size={20} className="text-green-600" />
            <span className="text-green-700">{successMsg}</span>
          </motion.div>
        )}
      </AnimatePresence>

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
      ) : categories.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white rounded-xl shadow-sm p-12 text-center">
          <Folder size={64} className="mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-semibold text-gray-900">No Categories Found</h3>
          <p className="text-gray-500">Start by adding your first category</p>
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={openAddModal} className="mt-4 px-6 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-all inline-flex items-center gap-2">
            <Plus size={18} /> Add Category
          </motion.button>
        </motion.div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
          {categories.map((category, i) => (
            <motion.div
              key={category.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              whileHover={{ y: -5, shadow: '0 20px 40px -10px rgba(0,0,0,0.1)' }}
              className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100 group cursor-pointer"
              onClick={() => loadCategoryProducts(category)}
            >
              <div className="h-32 bg-gradient-to-br from-emerald-50 to-green-50 flex items-center justify-center relative">
                <div 
                  className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg transition-transform group-hover:scale-110"
                  style={{ backgroundColor: `${category.color || '#10B981'}20` }}
                >
                  <Folder size={32} style={{ color: category.color || '#10B981' }} />
                </div>
                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                  <button onClick={() => handleEdit(category)} className="p-1.5 bg-white rounded-lg shadow-sm hover:bg-emerald-50">
                    <Edit size={14} className="text-emerald-600" />
                  </button>
                  <button onClick={() => handleDelete(category)} className="p-1.5 bg-white rounded-lg shadow-sm hover:bg-red-50">
                    <Trash2 size={14} className="text-red-600" />
                  </button>
                </div>
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-gray-900 text-center truncate">{category.name}</h3>
                <p className="text-xs text-gray-500 text-center mt-1 line-clamp-2">{category.description || 'No description'}</p>
                <div className="flex items-center justify-center gap-2 mt-2 text-sm text-gray-500">
                  <Package size={14} />
                  <span>{category.product_count || 0} products</span>
                </div>
                {category.vendor_count > 0 && (
                  <div className="flex items-center justify-center gap-1 mt-1 text-xs text-gray-400">
                    <Store size={12} />
                    <span>{category.vendor_count} vendors</span>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => { setShowModal(false); resetForm(); }}>
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl w-full max-w-md overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-6 border-b bg-gradient-to-r from-emerald-600 to-green-600">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-white">{editMode ? 'Edit Category' : 'Add New Category'}</h3>
                  <button onClick={() => { setShowModal(false); resetForm(); }} className="p-1 hover:bg-white/20 rounded-lg">
                    <X size={20} className="text-white" />
                  </button>
                </div>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Category Name *</label>
                  <input 
                    type="text" 
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="Enter category name" 
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                  <textarea 
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    placeholder="Enter description" 
                    rows={3} 
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none resize-none" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Color</label>
                  <div className="flex flex-wrap items-center gap-3">
                    {colors.map(color => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setFormData({...formData, color})}
                        className={`w-10 h-10 rounded-xl transition-all ${formData.color === color ? 'ring-2 ring-offset-2 ring-emerald-500 scale-110' : ''}`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                    <input 
                      type="color" 
                      value={formData.color}
                      onChange={(e) => setFormData({...formData, color: e.target.value})}
                      className="w-10 h-10 rounded-xl cursor-pointer border-0" 
                    />
                  </div>
                </div>
                
                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-2">
                    <AlertCircle size={16} className="text-red-600" />
                    <span className="text-red-700 text-sm">{error}</span>
                  </div>
                )}

                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={() => { setShowModal(false); resetForm(); }} className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 font-medium">
                    Cancel
                  </button>
                  <motion.button 
                    type="submit" 
                    disabled={saving}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="flex-1 px-4 py-3 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-xl hover:from-emerald-700 hover:to-green-700 font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {saving ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save size={18} /> {editMode ? 'Update' : 'Create'}
                      </>
                    )}
                  </motion.button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
