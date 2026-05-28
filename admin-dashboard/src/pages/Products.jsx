import React from 'react';
import { motion } from 'framer-motion';
import { Package, Shield, Store, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Products() {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Vendor Products</h1>
          <p className="text-gray-500">Products are managed by individual vendors</p>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-8 border border-purple-100 text-center"
      >
        <div className="w-20 h-20 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Package size={40} className="text-purple-600" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Products Managed by Vendors</h2>
        <p className="text-gray-500 max-w-lg mx-auto mb-6">
          As an admin, you manage vendor accounts and platform settings — not individual products.
          Each vendor is responsible for their own product catalog, inventory, and pricing.
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <motion.button
            whileHover={{ scale: 1.02 }}
            onClick={() => navigate('/vendors')}
            className="px-6 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl font-medium flex items-center gap-2 shadow-lg shadow-orange-500/30"
          >
            <Store size={18} />
            Manage Vendors
            <ArrowRight size={18} />
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            onClick={() => navigate('/admin-store')}
            className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-medium flex items-center gap-2 shadow-lg shadow-purple-500/30"
          >
            <Shield size={18} />
            My Admin Store
            <ArrowRight size={18} />
          </motion.button>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-xl p-6 shadow-sm border border-gray-100"
        >
          <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center mb-3">
            <Package size={24} className="text-blue-600" />
          </div>
          <h3 className="font-semibold text-gray-900 mb-1">Vendor Catalogs</h3>
          <p className="text-sm text-gray-500">Each vendor manages their own products, inventory, and pricing through their vendor dashboard.</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-xl p-6 shadow-sm border border-gray-100"
        >
          <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center mb-3">
            <Store size={24} className="text-green-600" />
          </div>
          <h3 className="font-semibold text-gray-900 mb-1">Admin Role</h3>
          <p className="text-sm text-gray-500">Admin approves vendor accounts, manages platform settings, and oversees vendor compliance.</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-xl p-6 shadow-sm border border-gray-100"
        >
          <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center mb-3">
            <Shield size={24} className="text-purple-600" />
          </div>
          <h3 className="font-semibold text-gray-900 mb-1">Your Store</h3>
          <p className="text-sm text-gray-500">If you have an admin store, you can manage its products separately under Admin Store.</p>
        </motion.div>
      </div>
    </div>
  );
}
