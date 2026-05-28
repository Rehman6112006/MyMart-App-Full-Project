import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Image, Plus, Edit2, Trash2, X, ExternalLink, Link as LinkIcon, DollarSign, Percent, Truck, RefreshCw, Tag, Upload, Loader } from 'lucide-react';

const bannerPositions = [
  { value: 1, label: 'Top Banner (Large)' },
  { value: 2, label: 'Mid Banner (Medium)' },
  { value: 3, label: 'Bottom Banner (Small)' },
];

const linkTypes = [
  { value: 'none', label: 'No Link', icon: null },
  { value: 'product', label: 'Product', icon: ExternalLink },
  { value: 'category', label: 'Category', icon: LinkIcon },
  { value: 'store', label: 'Store', icon: LinkIcon },
  { value: 'url', label: 'External URL', icon: ExternalLink },
];

const offerTypes = [
  { value: 'percentage', label: 'Percentage Off', icon: Percent },
  { value: 'fixed', label: 'Fixed Amount Off', icon: DollarSign },
  { value: 'free_delivery', label: 'Free Delivery', icon: Truck },
];

export default function Banners() {
  const [banners, setBanners] = useState([]);
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('banners');
  const [showBannerModal, setShowBannerModal] = useState(false);
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [editBanner, setEditBanner] = useState(null);
  const [editOffer, setEditOffer] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const [bannerForm, setBannerForm] = useState({
    title: '', subtitle: '', image_url: '', link_type: 'none', link_value: '',
    button_text: 'Shop Now', background_color: '#10B981', text_color: '#FFFFFF',
    position: 1, is_active: true, is_featured: false, sort_order: 0
  });

  const [offerForm, setOfferForm] = useState({
    title: '', description: '', banner_image: '', offer_type: 'percentage',
    discount_value: '', min_order_amount: '', max_discount_amount: '',
    coupon_code: '', usage_limit: '', is_active: true, is_featured: false
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const bannersRes = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/banners/admin/all`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` }
      });
      const bannersData = await bannersRes.json();
      if (bannersData.success) setBanners(bannersData.banners);

      const offersRes = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/banners/offers/admin/all`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` }
      });
      const offersData = await offersRes.json();
      if (offersData.success) setOffers(offersData.offers);
    } catch (err) {
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (file) => {
    setUploading(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          const base64 = reader.result;
          const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/storage/banner-image`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
            },
            body: JSON.stringify({ imageData: base64 })
          });
          const data = await res.json();
          if (data.success) {
            setBannerForm(prev => ({ ...prev, image_url: data.data.imageUrl }));
          } else {
            alert(data.error || 'Upload failed');
          }
        } catch (err) {
          alert('Failed to upload image');
        } finally {
          setUploading(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setUploading(false);
      alert('Failed to read file');
    }
  };

  const handleBannerSubmit = async (e) => {
    e.preventDefault();
    try {
      const method = editBanner ? 'PUT' : 'POST';
      const url = editBanner 
        ? `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/banners/${editBanner.id}`
        : `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/banners`;
      
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
        },
        body: JSON.stringify(bannerForm)
      });
      
      const data = await res.json();
      if (data.success) {
        setShowBannerModal(false);
        setEditBanner(null);
        resetBannerForm();
        loadData();
      } else {
        alert(data.error);
      }
    } catch (err) {
      alert('Failed to save banner');
    }
  };

  const handleOfferSubmit = async (e) => {
    e.preventDefault();
    try {
      const method = editOffer ? 'PUT' : 'POST';
      const url = editOffer 
        ? `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/banners/offers/${editOffer.id}`
        : `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/banners/offers`;
      
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
        },
        body: JSON.stringify({
          ...offerForm,
          discount_value: offerForm.discount_value ? parseFloat(offerForm.discount_value) : 0,
          min_order_amount: offerForm.min_order_amount ? parseFloat(offerForm.min_order_amount) : 0,
          max_discount_amount: offerForm.max_discount_amount ? parseFloat(offerForm.max_discount_amount) : null,
          usage_limit: offerForm.usage_limit ? parseInt(offerForm.usage_limit) : null,
        })
      });
      
      const data = await res.json();
      if (data.success) {
        setShowOfferModal(false);
        setEditOffer(null);
        resetOfferForm();
        loadData();
      } else {
        alert(data.error);
      }
    } catch (err) {
      alert('Failed to save offer');
    }
  };

  const handleDeleteBanner = async (id) => {
    if (!confirm('Delete this banner?')) return;
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/banners/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` }
      });
      const data = await res.json();
      if (data.success) loadData();
    } catch (err) {
      alert('Failed to delete');
    }
  };

  const handleDeleteOffer = async (id) => {
    if (!confirm('Delete this offer?')) return;
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/banners/offers/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` }
      });
      const data = await res.json();
      if (data.success) loadData();
    } catch (err) {
      alert('Failed to delete');
    }
  };

  const openBannerEdit = (banner) => {
    setEditBanner(banner);
    setBannerForm({
      title: banner.title || '',
      subtitle: banner.subtitle || '',
      image_url: banner.image_url || '',
      link_type: banner.link_type || 'none',
      link_value: banner.link_value || '',
      button_text: banner.button_text || 'Shop Now',
      background_color: banner.background_color || '#10B981',
      text_color: banner.text_color || '#FFFFFF',
      position: banner.position || 1,
      is_active: banner.is_active !== false,
      is_featured: banner.is_featured || false,
      sort_order: banner.sort_order || 0
    });
    setShowBannerModal(true);
  };

  const openOfferEdit = (offer) => {
    setEditOffer(offer);
    setOfferForm({
      title: offer.title || '',
      description: offer.description || '',
      banner_image: offer.banner_image || '',
      offer_type: offer.offer_type || 'percentage',
      discount_value: offer.discount_value || '',
      min_order_amount: offer.min_order_amount || '',
      max_discount_amount: offer.max_discount_amount || '',
      coupon_code: offer.coupon_code || '',
      usage_limit: offer.usage_limit || '',
      is_active: offer.is_active !== false,
      is_featured: offer.is_featured || false
    });
    setShowOfferModal(true);
  };

  const resetBannerForm = () => {
    setBannerForm({
      title: '', subtitle: '', image_url: '', link_type: 'none', link_value: '',
      button_text: 'Shop Now', background_color: '#10B981', text_color: '#FFFFFF',
      position: 1, is_active: true, is_featured: false, sort_order: 0
    });
  };

  const resetOfferForm = () => {
    setOfferForm({
      title: '', description: '', banner_image: '', offer_type: 'percentage',
      discount_value: '', min_order_amount: '', max_discount_amount: '',
      coupon_code: '', usage_limit: '', is_active: true, is_featured: false
    });
  };

  if (loading) {
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
          <h1 className="text-2xl font-bold text-gray-900">Banners & Offers</h1>
          <p className="text-gray-500">Manage promotional banners and discount offers</p>
        </div>
        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={loadData} className="px-4 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-all flex items-center gap-2">
          <RefreshCw size={18} /> Refresh
        </motion.button>
      </motion.div>

      {/* Tabs */}
      <div className="flex gap-3">
        <motion.button whileTap={{ scale: 0.98 }} onClick={() => setActiveTab('banners')} className={`px-5 py-2.5 rounded-xl font-medium transition-all flex items-center gap-2 ${activeTab === 'banners' ? 'bg-gradient-to-r from-emerald-600 to-green-600 text-white shadow-lg shadow-emerald-500/30' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
          <Image size={18} /> Banners ({banners.length})
        </motion.button>
        <motion.button whileTap={{ scale: 0.98 }} onClick={() => setActiveTab('offers')} className={`px-5 py-2.5 rounded-xl font-medium transition-all flex items-center gap-2 ${activeTab === 'offers' ? 'bg-gradient-to-r from-emerald-600 to-green-600 text-white shadow-lg shadow-emerald-500/30' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
          <Tag size={18} /> Offers ({offers.length})
        </motion.button>
        {activeTab === 'banners' && (
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => { setActiveTab('banners'); setShowBannerModal(true); setEditBanner(null); resetBannerForm(); }} className="ml-auto px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-xl hover:from-emerald-700 hover:to-green-700 transition-all shadow-lg shadow-emerald-500/30 flex items-center gap-2">
            <Plus size={18} /> Add Banner
          </motion.button>
        )}
        {activeTab === 'offers' && (
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => { setActiveTab('offers'); setShowOfferModal(true); setEditOffer(null); resetOfferForm(); }} className="ml-auto px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-xl hover:from-emerald-700 hover:to-green-700 transition-all shadow-lg shadow-emerald-500/30 flex items-center gap-2">
            <Plus size={18} /> Add Offer
          </motion.button>
        )}
      </div>

      {/* Banners Tab */}
      {activeTab === 'banners' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {banners.map((banner, i) => (
            <motion.div
              key={banner.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              whileHover={{ y: -5, shadow: '0 20px 40px -10px rgba(0,0,0,0.1)' }}
              className={`bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100 ${!banner.is_active ? 'opacity-60' : ''}`}
            >
              <div className="relative h-40 bg-gray-200">
                {banner.image_url ? (
                  <img src={banner.image_url} alt={banner.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <Image size={48} className="text-gray-400" />
                  </div>
                )}
                <div className="absolute top-2 right-2 flex gap-1">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${banner.is_active ? 'bg-green-500 text-white' : 'bg-gray-500 text-white'}`}>
                    {banner.is_active ? 'Active' : 'Inactive'}
                  </span>
                  {banner.is_featured && (
                    <span className="px-2 py-1 rounded text-xs font-medium bg-yellow-500 text-white">
                      Featured
                    </span>
                  )}
                </div>
              </div>
              <div className="p-4">
                <h3 className="font-bold text-gray-900">{banner.title}</h3>
                <p className="text-sm text-gray-500 mt-1">{banner.subtitle || 'No subtitle'}</p>
                <div className="flex items-center gap-2 mt-2 text-xs text-gray-400">
                  <span>Position: {banner.position}</span>
                  {banner.link_type !== 'none' && (
                    <span className="text-emerald-500">→ {banner.link_type}</span>
                  )}
                </div>
                <div className="flex gap-2 mt-4 pt-4 border-t">
                  <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => openBannerEdit(banner)} className="flex-1 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center justify-center gap-1">
                    <Edit2 size={16} /> Edit
                  </motion.button>
                  <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => handleDeleteBanner(banner.id)} className="px-3 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200">
                    <Trash2 size={16} />
                  </motion.button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Offers Tab */}
      {activeTab === 'offers' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {offers.map((offer, i) => (
            <motion.div
              key={offer.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              whileHover={{ y: -5, shadow: '0 20px 40px -10px rgba(0,0,0,0.1)' }}
              className={`bg-white rounded-2xl shadow-sm overflow-hidden border-l-4 ${offer.is_featured ? 'border-yellow-500' : 'border-emerald-500'} ${!offer.is_active ? 'opacity-60' : ''}`}
            >
              <div className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="inline-block px-2 py-1 bg-emerald-100 text-emerald-700 rounded text-xs font-bold">
                      {offer.coupon_code}
                    </span>
                    <h3 className="font-bold text-gray-900 mt-2">{offer.title}</h3>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${offer.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                    {offer.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <p className="text-sm text-gray-500 mt-2">{offer.description || 'No description'}</p>
                
                <div className="mt-4 p-3 bg-emerald-50 rounded-xl">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Type</span>
                    <span className="font-medium capitalize">{offer.offer_type?.replace('_', ' ')}</span>
                  </div>
                  {offer.discount_value && (
                    <div className="flex items-center justify-between text-sm mt-1">
                      <span className="text-gray-500">Discount</span>
                      <span className="font-bold text-emerald-600">
                        {offer.offer_type === 'percentage' ? `${offer.discount_value}%` : 
                         offer.offer_type === 'fixed' ? `Rs. ${offer.discount_value}` : 'FREE'}
                      </span>
                    </div>
                  )}
                  {offer.min_order_amount > 0 && (
                    <div className="flex items-center justify-between text-sm mt-1">
                      <span className="text-gray-500">Min Order</span>
                      <span className="font-medium">Rs. {offer.min_order_amount}</span>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 mt-4 pt-4 border-t">
                  <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => openOfferEdit(offer)} className="flex-1 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center justify-center gap-1">
                    <Edit2 size={16} /> Edit
                  </motion.button>
                  <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => handleDeleteOffer(offer.id)} className="px-3 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200">
                    <Trash2 size={16} />
                  </motion.button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Banner Modal */}
      {showBannerModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowBannerModal(false)}>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">{editBanner ? 'Edit Banner' : 'Add New Banner'}</h2>
              <button onClick={() => setShowBannerModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleBannerSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                <input type="text" value={bannerForm.title} onChange={(e) => setBannerForm({...bannerForm, title: e.target.value})} required className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subtitle</label>
                <input type="text" value={bannerForm.subtitle} onChange={(e) => setBannerForm({...bannerForm, subtitle: e.target.value})} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Image <span className="text-red-500">*</span></label>
                {bannerForm.image_url && (
                  <div className="relative mb-2">
                    <img src={bannerForm.image_url} alt="Preview" className="w-full h-32 object-cover rounded-xl" onError={(e) => { e.target.style.display = 'none' }} />
                    <button type="button" onClick={() => setBannerForm({...bannerForm, image_url: ''})} className="absolute top-1 right-1 p-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600">
                      <X size={14} />
                    </button>
                  </div>
                )}
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={bannerForm.image_url}
                    onChange={(e) => setBannerForm({...bannerForm, image_url: e.target.value})}
                    required={!bannerForm.image_url}
                    className="flex-1 px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                    placeholder="https://... or upload below"
                  />
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleImageUpload(file);
                      e.target.value = '';
                    }}
                  />
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    disabled={uploading}
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 disabled:opacity-50 flex items-center gap-2"
                  >
                    {uploading ? <Loader size={18} className="animate-spin" /> : <Upload size={18} />}
                    Upload
                  </motion.button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Position</label>
                  <select value={bannerForm.position} onChange={(e) => setBannerForm({...bannerForm, position: parseInt(e.target.value)})} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none bg-white">
                    {bannerPositions.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Link Type</label>
                  <select value={bannerForm.link_type} onChange={(e) => setBannerForm({...bannerForm, link_type: e.target.value})} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none bg-white">
                    {linkTypes.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
                  </select>
                </div>
              </div>
              {bannerForm.link_type !== 'none' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Link Value (ID or URL)</label>
                  <input type="text" value={bannerForm.link_value} onChange={(e) => setBannerForm({...bannerForm, link_value: e.target.value})} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none" />
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Background Color</label>
                  <input type="color" value={bannerForm.background_color} onChange={(e) => setBannerForm({...bannerForm, background_color: e.target.value})} className="w-full h-12 border rounded-xl cursor-pointer" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Text Color</label>
                  <input type="color" value={bannerForm.text_color} onChange={(e) => setBannerForm({...bannerForm, text_color: e.target.value})} className="w-full h-12 border rounded-xl cursor-pointer" />
                </div>
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={bannerForm.is_active} onChange={(e) => setBannerForm({...bannerForm, is_active: e.target.checked})} className="w-4 h-4 rounded border-gray-300 text-emerald-600" />
                  <span className="text-sm">Active</span>
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={bannerForm.is_featured} onChange={(e) => setBannerForm({...bannerForm, is_featured: e.target.checked})} className="w-4 h-4 rounded border-gray-300 text-yellow-600" />
                  <span className="text-sm">Featured</span>
                </label>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowBannerModal(false)} className="flex-1 px-4 py-3 border border-gray-200 rounded-xl hover:bg-gray-50 font-medium">Cancel</button>
                <button type="submit" className="flex-1 px-4 py-3 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-xl hover:from-emerald-700 hover:to-green-700 font-medium">{editBanner ? 'Update' : 'Create'}</button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Offer Modal */}
      {showOfferModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowOfferModal(false)}>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">{editOffer ? 'Edit Offer' : 'Add New Offer'}</h2>
              <button onClick={() => setShowOfferModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleOfferSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Offer Title *</label>
                <input type="text" value={offerForm.title} onChange={(e) => setOfferForm({...offerForm, title: e.target.value})} required className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea value={offerForm.description} onChange={(e) => setOfferForm({...offerForm, description: e.target.value})} rows={2} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none resize-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Coupon Code *</label>
                <input type="text" value={offerForm.coupon_code} onChange={(e) => setOfferForm({...offerForm, coupon_code: e.target.value.toUpperCase()})} required className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none uppercase" placeholder="SAVE20" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Offer Type *</label>
                <select value={offerForm.offer_type} onChange={(e) => setOfferForm({...offerForm, offer_type: e.target.value})} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none bg-white">
                  {offerTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              {offerForm.offer_type !== 'free_delivery' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{offerForm.offer_type === 'percentage' ? 'Discount %' : 'Discount Amount (Rs.)'}</label>
                    <input type="number" value={offerForm.discount_value} onChange={(e) => setOfferForm({...offerForm, discount_value: e.target.value})} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Max Discount (Rs.)</label>
                    <input type="number" value={offerForm.max_discount_amount} onChange={(e) => setOfferForm({...offerForm, max_discount_amount: e.target.value})} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="Optional" />
                  </div>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Minimum Order Amount (Rs.)</label>
                <input type="number" value={offerForm.min_order_amount} onChange={(e) => setOfferForm({...offerForm, min_order_amount: e.target.value})} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="0 = no minimum" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Usage Limit (Total)</label>
                <input type="number" value={offerForm.usage_limit} onChange={(e) => setOfferForm({...offerForm, usage_limit: e.target.value})} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="Empty = unlimited" />
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={offerForm.is_active} onChange={(e) => setOfferForm({...offerForm, is_active: e.target.checked})} className="w-4 h-4 rounded border-gray-300 text-emerald-600" />
                  <span className="text-sm">Active</span>
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={offerForm.is_featured} onChange={(e) => setOfferForm({...offerForm, is_featured: e.target.checked})} className="w-4 h-4 rounded border-gray-300 text-yellow-600" />
                  <span className="text-sm">Featured</span>
                </label>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowOfferModal(false)} className="flex-1 px-4 py-3 border border-gray-200 rounded-xl hover:bg-gray-50 font-medium">Cancel</button>
                <button type="submit" className="flex-1 px-4 py-3 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-xl hover:from-emerald-700 hover:to-green-700 font-medium">{editOffer ? 'Update' : 'Create'}</button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
