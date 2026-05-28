import { useState, useEffect, useRef } from 'react';
import { getVendorStore, createVendorStore, updateVendorStore, uploadStoreLogo } from '../services/api';
import { motion } from 'framer-motion';
import { Store, Save, AlertCircle, CheckCircle, Camera, Clock, BadgeCheck, Building2, Plus } from 'lucide-react';

export default function StorePage() {
  const [store, setStore] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [storeNotFound, setStoreNotFound] = useState(false);
  const [justCreated, setJustCreated] = useState(false);
  const [form, setForm] = useState({ storeName: '', description: '', email: '', phone: '', address: '', city: '', state: '', country: '', zip: '', website: '' });
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoPreview, setLogoPreview] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => { loadStore(); }, []);

  const loadStore = async () => {
    try {
      setLoading(true); setError(null);
      const res = await getVendorStore();
      if (res.data.success) {
        const s = res.data.store || res.data;
        setStore(s);
        setStoreNotFound(false);
        setForm({
          storeName: s.store_name || s.name || '',
          description: s.description || '',
          email: s.email || '',
          phone: s.phone || '',
          address: s.address || '',
          city: s.city || '',
          state: s.state || '',
          country: s.country || '',
          zip: s.zip || '',
          website: s.website || '',
        });
        setLogoPreview(s.logo || null);
      }
    } catch (err) {
      const status = err.response?.status;
      if (status === 404) {
        setStoreNotFound(true);
        setStore(null);
      } else {
        setError('Failed to load store');
      }
    } finally { setLoading(false); }
  };

  const handleCreate = async () => {
    if (!form.storeName.trim()) { setError('Store name is required'); return; }
    try {
      setSaving(true); setError(null);
      const res = await createVendorStore(form);
      if (res.data.success) {
        setStore(res.data.store);
        setStoreNotFound(false);
        setJustCreated(true);
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create store');
    } finally { setSaving(false); }
  };

  const handleLogoSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { setError('Please select an image file'); return; }
    if (file.size > 2 * 1024 * 1024) { setError('Image must be under 2MB'); return; }
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const base64 = ev.target?.result;
      setLogoPreview(base64);
      try {
        setLogoUploading(true); setError(null);
        await uploadStoreLogo({ imageData: base64, storeId: store?.id });
        setSuccess(true); setTimeout(() => setSuccess(false), 3000);
      } catch { setError('Failed to upload logo'); }
      finally { setLogoUploading(false); }
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    try { setSaving(true); setError(null); setSuccess(false); await updateVendorStore(form); setSuccess(true); setTimeout(() => setSuccess(false), 3000); }
    catch { setError('Failed to save store'); } finally { setSaving(false); }
  };

  if (loading) return <div className="flex items-center justify-center h-96"><div className="w-16 h-16 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" /></div>;

  const storePending = store && !store.is_verified;
  const storeActive = store && store.is_verified;

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Store</h1>
        <p className="text-gray-500">{storeNotFound ? 'Set up your store to start selling' : storePending ? 'Your store is awaiting admin approval' : 'Manage your store information'}</p>
      </div>

      {error && <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3"><AlertCircle size={20} className="text-red-600" /><span className="text-red-700">{error}</span></div>}
      {success && <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3"><CheckCircle size={20} className="text-green-600" /><span className="text-green-700">{justCreated ? 'Store created! Waiting for admin approval.' : 'Store updated successfully!'}</span></div>}

      {/* State 1: No store → Create Store */}
      {storeNotFound && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-4 mb-6 pb-4 border-b border-gray-100">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center shadow-lg">
              <Building2 size={32} className="text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">Create Your Store</h3>
              <p className="text-sm text-gray-500">Fill in the details below to get started</p>
            </div>
          </div>

          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Store Name <span className="text-red-500">*</span></label>
              <input value={form.storeName} onChange={e => setForm({...form, storeName: e.target.value})} placeholder="My Awesome Store" className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} rows={3} placeholder="Tell customers about your store..." className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none resize-none" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="store@example.com" className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} placeholder="+1 234 567 890" className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <input value={form.address} onChange={e => setForm({...form, address: e.target.value})} placeholder="123 Main St" className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                <input value={form.city} onChange={e => setForm({...form, city: e.target.value})} placeholder="New York" className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                <input value={form.state} onChange={e => setForm({...form, state: e.target.value})} placeholder="NY" className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                <input value={form.country} onChange={e => setForm({...form, country: e.target.value})} placeholder="United States" className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none" />
              </div>
            </div>
            <div className="pt-4">
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleCreate} disabled={saving}
                className="px-8 py-3 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-xl hover:from-emerald-700 hover:to-green-700 transition-all shadow-lg shadow-emerald-500/30 flex items-center gap-2 font-medium">
                {saving ? <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" /> : <Plus size={18} />} {saving ? 'Creating...' : 'Create Store'}
              </motion.button>
            </div>
          </div>
        </motion.div>
      )}

      {/* State 2: Store exists but pending verification */}
      {storePending && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-4 mb-6 pb-4 border-b border-gray-100">
            <div className="relative group">
              {logoPreview ? (
                <img src={logoPreview} alt="Store logo" className="w-20 h-20 rounded-2xl object-cover shadow-lg" />
              ) : (
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg">
                  <Store size={36} className="text-white" />
                </div>
              )}
              <button onClick={() => fileInputRef.current?.click()} disabled={logoUploading}
                className="absolute inset-0 bg-black/40 rounded-2xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                {logoUploading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Camera size={20} className="text-white" />}
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleLogoSelect} className="hidden" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">{form.storeName || 'Your Store'}</h3>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                <Clock size={12} /> Pending Verification
              </span>
              <p className="text-sm text-gray-500 mt-2">Your store has been submitted and is awaiting admin approval. You'll be notified once it's approved.</p>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
            <Clock size={20} className="text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-800">Waiting for Admin Verification</p>
              <p className="text-xs text-amber-600 mt-1">An admin will review your store details shortly. This usually takes 1-2 business days. You can still edit your store information while waiting.</p>
            </div>
          </div>

          <div className="space-y-5 mt-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Store Name</label>
              <input value={form.storeName} onChange={e => setForm({...form, storeName: e.target.value})} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} rows={3} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none resize-none" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <input value={form.address} onChange={e => setForm({...form, address: e.target.value})} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none" />
              </div>
            </div>
            <div className="pt-4">
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleSave} disabled={saving}
                className="px-8 py-3 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-xl hover:from-emerald-700 hover:to-green-700 transition-all shadow-lg shadow-emerald-500/30 flex items-center gap-2 font-medium">
                <Save size={18} /> {saving ? 'Saving...' : 'Save Changes'}
              </motion.button>
            </div>
          </div>
        </motion.div>
      )}

      {/* State 3: Store active and verified */}
      {storeActive && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-4 mb-6 pb-4 border-b border-gray-100">
            <div className="relative group">
              {logoPreview ? (
                <img src={logoPreview} alt="Store logo" className="w-20 h-20 rounded-2xl object-cover shadow-lg" />
              ) : (
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center shadow-lg">
                  <Store size={36} className="text-white" />
                </div>
              )}
              <button onClick={() => fileInputRef.current?.click()} disabled={logoUploading}
                className="absolute inset-0 bg-black/40 rounded-2xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                {logoUploading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Camera size={20} className="text-white" />}
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleLogoSelect} className="hidden" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-gray-900">{form.storeName || 'Your Store'}</h3>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                  <BadgeCheck size={12} /> Verified
                </span>
              </div>
              <p className="text-sm text-gray-500 mt-0.5">Your store is active and visible to customers</p>
            </div>
          </div>

          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Store Name</label>
              <input value={form.storeName} onChange={e => setForm({...form, storeName: e.target.value})} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} rows={4} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none resize-none" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <input value={form.address} onChange={e => setForm({...form, address: e.target.value})} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none" />
              </div>
            </div>
            <div className="pt-4">
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleSave} disabled={saving}
                className="px-8 py-3 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-xl hover:from-emerald-700 hover:to-green-700 transition-all shadow-lg shadow-emerald-500/30 flex items-center gap-2 font-medium">
                <Save size={18} /> {saving ? 'Saving...' : 'Save Changes'}
              </motion.button>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
