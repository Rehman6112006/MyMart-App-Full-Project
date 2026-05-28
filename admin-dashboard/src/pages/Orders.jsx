import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ShoppingCart, Search, X, Eye, Package, Truck, CheckCircle, AlertCircle, RefreshCw, Clock, User, MapPin, Copy, ChevronDown, Store, DollarSign, CreditCard, Banknote } from 'lucide-react'
import { getAdminStoreOrders, getAdminAllOrders, updateAdminStoreOrderStatus, markAdminStorePaymentReceived } from '../services/api'

const statuses = ['all', 'pending', 'confirmed', 'processing', 'shipped', 'delivered', 'refunded', 'cancelled']
const statusColors = {
  pending: 'bg-amber-100 text-amber-800', confirmed: 'bg-blue-100 text-blue-800',
  processing: 'bg-indigo-100 text-indigo-800', shipped: 'bg-purple-100 text-purple-800',
  delivered: 'bg-emerald-100 text-emerald-800', refunded: 'bg-teal-100 text-teal-800', cancelled: 'bg-red-100 text-red-800'
}
const statusIcons = {
  pending: Clock, confirmed: CheckCircle, processing: RefreshCw,
  shipped: Truck, delivered: CheckCircle, refunded: RefreshCw, cancelled: X
}

const paymentStatusColors = {
  pending: 'bg-yellow-100 text-yellow-800',
  paid: 'bg-emerald-100 text-emerald-800',
  refunded: 'bg-red-100 text-red-800'
}

const paymentMethodLabels = {
  cod: 'COD',
  card: 'Card',
  stripe: 'Card'
}

const tabs = ['Store Orders', 'All Platform Orders']

export default function Orders() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [error, setError] = useState('')
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [updating, setUpdating] = useState(null)
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState('Store Orders')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  useEffect(() => { setPage(1); fetchOrders() }, [activeTab])

  const fetchOrders = async (p = page) => {
    setLoading(true); setError('')
    try {
      if (activeTab === 'Store Orders') {
        const res = await getAdminStoreOrders({ page: p, limit: 20 })
        const data = res.data
        if (data.success) {
          setOrders(Array.isArray(data.orders) ? data.orders : [])
          setTotalPages(data.pages || 1)
        }
      } else {
        const res = await getAdminAllOrders({ page: p, limit: 20 })
        const data = res.data
        if (data.success) {
          setOrders(Array.isArray(data.orders) ? data.orders : Array.isArray(data.data) ? data.data : [])
          setTotalPages(data.pages || 1)
        }
      }
    } catch (e) { setError('Failed to load orders') }
    finally { setLoading(false) }
  }

  const goToPage = (p) => {
    setPage(p)
    fetchOrders(p)
  }

  const handleUpdateStatus = async (id, newStatus) => {
    setUpdating(id)
    try {
      await updateAdminStoreOrderStatus(id, newStatus)
      await fetchOrders()
      if (selectedOrder?.id === id) setSelectedOrder(prev => prev ? { ...prev, order_status: newStatus, status: newStatus } : null)
    } catch (e) { setError('Failed to update status') }
    finally { setUpdating(null) }
  }

  const formatOrderId = (o) => {
    const num = o.order_number || o.id || ''
    if (num.startsWith('ORD-')) return num
    return `ORD-${num.toString().slice(-8).toUpperCase()}`
  }

  const filtered = orders.filter(o => {
    if (filter !== 'all' && (o.order_status || o.status) !== filter) return false
    if (!search) return true
    const q = search.toLowerCase()
    const orderId = (o.order_number || o.id || '').toLowerCase()
    const customer = `${o.first_name || ''} ${o.last_name || ''}`.toLowerCase()
    return orderId.includes(q) || customer.includes(q)
  })

  const formatCurrency = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n || 0)

  if (loading) return <div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-4 border-emerald-200 border-t-emerald-600" /></div>

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
          <p className="text-sm text-gray-500 mt-1">Track and manage orders across the platform</p>
        </div>
        <button onClick={fetchOrders} className="px-4 py-2 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors text-sm flex items-center gap-2">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </motion.div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-center gap-3 text-sm text-red-700">
          <AlertCircle className="w-5 h-5 shrink-0" /> {error}
          <button onClick={() => setError('')} className="ml-auto p-1 hover:bg-red-100 rounded-lg"><X className="w-4 h-4" /></button>
        </div>
      )}

      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {tabs.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab ? 'bg-white text-emerald-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}>{tab}</button>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by order ID or customer name..."
            className="input-field pl-10 text-sm" />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {statuses.map((s) => {
          const count = s === 'all' ? orders.length : orders.filter(o => (o.order_status || o.status) === s).length
          return (
            <motion.button key={s} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              onClick={() => setFilter(s)}
              className={`px-4 py-2 rounded-xl text-sm font-medium capitalize transition-all flex items-center gap-2 ${
                filter === s ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/30' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}>
              {s.replace('_', ' ')}
              {count > 0 && <span className={`text-xs px-1.5 py-0.5 rounded-full ${filter === s ? 'bg-emerald-500' : 'bg-gray-100 text-gray-500'}`}>{count}</span>}
            </motion.button>
          )
        })}
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-16 text-center">
            <ShoppingCart className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No orders found</p>
            <p className="text-xs text-gray-400 mt-1">{search ? 'Try a different search' : 'Orders will appear here once customers place them'}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {activeTab === 'All Platform Orders' && <th className="text-left py-3.5 px-4 text-gray-500 font-medium">Store</th>}
                  <th className="text-left py-3.5 px-4 text-gray-500 font-medium">Order ID</th>
                  <th className="text-left py-3.5 px-4 text-gray-500 font-medium">Customer</th>
                  <th className="text-left py-3.5 px-4 text-gray-500 font-medium">Items</th>
                  <th className="text-left py-3.5 px-4 text-gray-500 font-medium">Total</th>
                  <th className="text-left py-3.5 px-4 text-gray-500 font-medium">Payment</th>
                  <th className="text-left py-3.5 px-4 text-gray-500 font-medium">Payment Status</th>
                  <th className="text-left py-3.5 px-4 text-gray-500 font-medium">Status</th>
                  <th className="text-left py-3.5 px-4 text-gray-500 font-medium">Date</th>
                  <th className="text-right py-3.5 px-4 text-gray-500 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((o, i) => (
                  <motion.tr key={o.id || i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}
                    className="border-b border-gray-50 hover:bg-emerald-50/30 transition-colors cursor-pointer group"
                    onClick={() => setSelectedOrder(o)}>
                    {activeTab === 'All Platform Orders' && (
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-medium bg-blue-50 text-blue-700">
                          <Store className="w-3 h-3" /> {o.store_name || '—'}
                        </span>
                      </td>
                    )}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-semibold text-gray-900 text-xs bg-gray-100 px-2 py-1 rounded-lg">{formatOrderId(o)}</span>
                        <button onClick={e => { e.stopPropagation(); navigator.clipboard.writeText(formatOrderId(o)) }}
                          className="p-1 rounded hover:bg-gray-100 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Copy className="w-3 h-3" />
                        </button>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-medium text-gray-900">{o.first_name ? `${o.first_name} ${o.last_name || ''}` : '—'}</span>
                      {o.email && <p className="text-xs text-gray-400 truncate max-w-[150px]">{o.email}</p>}
                    </td>
                    <td className="py-3.5 px-4 text-gray-600">
                      <span className="font-medium">{Array.isArray(o.items) ? o.items.length : '—'}</span>
                      <span className="text-gray-400"> item{(Array.isArray(o.items) && o.items.length !== 1) ? 's' : ''}</span>
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-emerald-600">{formatCurrency(o.total_amount || o.total || 0)}</td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-medium bg-gray-100 text-gray-700">
                        {(o.payment_method || '').toLowerCase() === 'cod' ? <Banknote className="w-3 h-3" /> : <CreditCard className="w-3 h-3" />}
                        {paymentMethodLabels[o.payment_method] || (o.payment_method || '—').toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${paymentStatusColors[o.payment_status] || 'bg-gray-100 text-gray-700'}`}>
                        {(o.order_status || o.status) === 'refunded' || o.payment_status === 'refunded' ? 'Refunded' : (o.payment_method || '').toLowerCase() !== 'cod' ? 'Payment Successful' : o.payment_status === 'paid' ? 'Payment Received' : 'Payment Pending'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusColors[o.order_status || o.status] || 'bg-gray-100 text-gray-700'}`}>
                        {(o.order_status || o.status || 'unknown').replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-gray-500 text-xs whitespace-nowrap">
                      {o.created_at ? new Date(o.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                        onClick={(e) => { e.stopPropagation(); setSelectedOrder(o) }}
                        className="p-2 rounded-lg hover:bg-emerald-50 text-emerald-600 transition-colors" title="View Details">
                        <Eye className="w-4 h-4" />
                      </motion.button>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-sm text-gray-500">Page {page} of {totalPages}</p>
          <div className="flex gap-2">
            <button onClick={() => goToPage(page - 1)} disabled={page <= 1}
              className="px-3 py-1.5 rounded-lg text-sm border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">Previous</button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
              <button key={p} onClick={() => goToPage(p)}
                className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${p === page ? 'bg-emerald-600 text-white' : 'border border-gray-200 hover:bg-gray-50'}`}>{p}</button>
            ))}
            <button onClick={() => goToPage(page + 1)} disabled={page >= totalPages}
              className="px-3 py-1.5 rounded-lg text-sm border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">Next</button>
          </div>
        </div>
      )}

      {/* Order Detail Modal */}
      <AnimatePresence>
        {selectedOrder && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto py-8 px-4 bg-black/30 backdrop-blur-sm"
            onClick={() => setSelectedOrder(null)}>
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}>
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-gray-50 to-white">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-emerald-50"><ShoppingCart className="w-5 h-5 text-emerald-600" /></div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">Order <span className="font-mono">{formatOrderId(selectedOrder)}</span></h2>
                    <p className="text-xs text-gray-400">Store: {selectedOrder.store_name || 'Admin Store'}</p>
                  </div>
                </div>
                <button onClick={() => setSelectedOrder(null)} className="p-2 rounded-xl hover:bg-gray-100 transition-colors"><X className="w-5 h-5 text-gray-500" /></button>
              </div>

              <div className="p-6 space-y-6">
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[selectedOrder.order_status || selectedOrder.status] || 'bg-gray-100 text-gray-700'}`}>
                      {(selectedOrder.order_status || selectedOrder.status || 'unknown').replace('_', ' ')}
                    </span>
                    <span className="text-xs text-gray-400">{selectedOrder.created_at ? new Date(selectedOrder.created_at).toLocaleString() : ''}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {['pending', 'confirmed', 'processing', 'shipped', 'delivered'].map((s, idx) => {
                      const current = selectedOrder.order_status || selectedOrder.status
                      const orderIdx = ['pending', 'confirmed', 'processing', 'shipped', 'delivered'].indexOf(current)
                      const isPast = idx <= orderIdx || current === 'delivered' || current === 'refunded'
                      const isCancelled = current === 'cancelled'
                      return (
                        <div key={s} className="flex items-center flex-1">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                            isCancelled ? 'bg-red-100 text-red-600' : isPast ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-400'
                          }`}>{isPast ? <CheckCircle className="w-3.5 h-3.5" /> : idx + 1}</div>
                          {idx < 4 && <div className={`flex-1 h-0.5 ${isPast && !isCancelled ? 'bg-emerald-300' : 'bg-gray-200'}`} />}
                        </div>
                      )
                    })}
                  </div>
                  <div className="flex justify-between mt-1 text-[10px] text-gray-400">
                    {['Pending', 'Confirmed', 'Processing', 'Shipped', 'Delivered'].map(s => <span key={s}>{s}</span>)}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-xl p-4">
                    <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2"><User className="w-4 h-4 text-emerald-500" /> Customer</h3>
                    <div className="space-y-2 text-sm">
                      <p><span className="text-gray-500">Name:</span> <span className="font-medium text-gray-900">{selectedOrder.first_name ? `${selectedOrder.first_name} ${selectedOrder.last_name || ''}` : '—'}</span></p>
                      <p><span className="text-gray-500">Email:</span> <span className="text-gray-700">{selectedOrder.email || '—'}</span></p>
                      <p><span className="text-gray-500">Phone:</span> <span className="text-gray-700">{selectedOrder.address_phone || selectedOrder.user_phone || '—'}</span></p>
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4">
                    <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2"><MapPin className="w-4 h-4 text-emerald-500" /> Shipping</h3>
                    <div className="space-y-2 text-sm">
                      <p className="text-gray-700">
                        {selectedOrder.address_line1 ? (
                          <>{selectedOrder.address_name && <span className="font-medium">{selectedOrder.address_name}</span>}<br />
                            {selectedOrder.address_line1}{selectedOrder.address_line2 ? `, ${selectedOrder.address_line2}` : ''}<br />
                            {selectedOrder.city}{selectedOrder.postal_code ? ` - ${selectedOrder.postal_code}` : ''}
                          </>
                        ) : (typeof selectedOrder.shipping_address === 'object' ? JSON.stringify(selectedOrder.shipping_address) : selectedOrder.shipping_address || '—')}
                      </p>
                      {selectedOrder.slot_name && <p className="text-xs text-gray-400 mt-1">Delivery: {selectedOrder.slot_name}</p>}
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="grid grid-cols-4 gap-3">
                    <div className="bg-emerald-50 rounded-xl p-3 text-center"><p className="text-xs text-gray-500">Subtotal</p><p className="font-semibold text-gray-900">{formatCurrency(selectedOrder.subtotal || selectedOrder.total_amount || 0)}</p></div>
                    <div className="bg-blue-50 rounded-xl p-3 text-center"><p className="text-xs text-gray-500">Delivery</p><p className="font-semibold text-gray-900">{formatCurrency(selectedOrder.delivery_charge || selectedOrder.shipping_cost || 0)}</p></div>
                    <div className="bg-purple-50 rounded-xl p-3 text-center">
                      <p className="text-xs text-gray-500">Method</p>
                      <p className="font-semibold text-gray-900 flex items-center justify-center gap-1">
                        {(selectedOrder.payment_method || '').toLowerCase() === 'cod' ? <Banknote className="w-3.5 h-3.5" /> : <CreditCard className="w-3.5 h-3.5" />}
                        {paymentMethodLabels[selectedOrder.payment_method] || (selectedOrder.payment_method || '—').toUpperCase()}
                      </p>
                    </div>
                    <div className="bg-emerald-50 rounded-xl p-3 text-center"><p className="text-xs text-gray-500">Total</p><p className="font-semibold text-emerald-600">{formatCurrency(selectedOrder.total_amount || selectedOrder.total || 0)}</p></div>
                  </div>
                  <div className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
                    <div className="flex items-center gap-2"><DollarSign className="w-4 h-4 text-gray-500" /><span className="text-sm text-gray-700 font-medium">Payment Status:</span></div>
                    <div className="flex items-center gap-3">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${paymentStatusColors[selectedOrder.payment_status] || 'bg-gray-100 text-gray-700'}`}>
                        {(selectedOrder.order_status || selectedOrder.status) === 'refunded' || selectedOrder.payment_status === 'refunded' ? 'Refunded' : (selectedOrder.payment_method || '').toLowerCase() !== 'cod' ? 'Payment Successful' : selectedOrder.payment_status === 'paid' ? 'Payment Received' : 'Payment Pending'}
                      </span>
                      {(selectedOrder.payment_method || '').toLowerCase() === 'cod' && selectedOrder.payment_status !== 'paid' && (selectedOrder.order_status || selectedOrder.status) === 'delivered' && activeTab === 'Store Orders' && (
                        <button onClick={() => { markAdminStorePaymentReceived(selectedOrder.id).then(() => { fetchOrders(); setSelectedOrder(prev => prev ? { ...prev, payment_status: 'paid' } : null); }); }}
                          className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-medium hover:bg-emerald-700 flex items-center gap-1"><Banknote size={14} /> Mark Paid</button>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Items ({Array.isArray(selectedOrder.items) ? selectedOrder.items.length : 0})</h3>
                  <div className="space-y-2">
                    {(Array.isArray(selectedOrder.items) ? selectedOrder.items : []).map((item, i) => (
                      <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                        <div className="w-10 h-10 rounded-lg bg-gray-200 overflow-hidden shrink-0">
                          {item.product_image ? <img src={item.product_image} alt="" className="w-full h-full object-cover" /> : <Package className="w-5 h-5 m-2.5 text-gray-400" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{item.product_name || item.name || `Item ${i + 1}`}</p>
                          <p className="text-xs text-gray-400">Qty: {item.quantity || 1} x {formatCurrency(item.unit_price || item.price || 0)}</p>
                        </div>
                        <p className="font-semibold text-gray-900 text-sm">{formatCurrency(item.total_price || item.total || 0)}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {activeTab === 'Store Orders' && (
                  <div className="border-t border-gray-100 pt-4">
                    <h3 className="text-sm font-semibold text-gray-900 mb-3">Update Status</h3>
                    <div className="flex flex-wrap gap-2">
                      {(() => {
                        const current = selectedOrder.order_status || selectedOrder.status
                        const nextSteps = {
                          'pending': ['confirmed', 'processing', 'cancelled'],
                          'confirmed': ['processing', 'cancelled'],
                          'processing': ['shipped', 'cancelled'],
                          'preparing': ['shipped', 'cancelled'],
                          'shipped': ['delivered'],
                          'out_for_delivery': ['delivered'],
                          'delivered': ['refunded'],
                        }
                        const buttons = nextSteps[current] || []
                        return buttons.map((s) => {
                          const StatusIcon = statusIcons[s] || ChevronDown
                          return (
                            <motion.button key={s} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                              onClick={() => handleUpdateStatus(selectedOrder.id, s)}
                              disabled={updating === selectedOrder.id}
                              className="px-3 py-2 rounded-lg text-xs font-medium capitalize transition-all border flex items-center gap-1.5 bg-white text-gray-700 border-gray-200 hover:bg-emerald-50 hover:border-emerald-300">
                              {updating === selectedOrder.id ? (
                                <div className="animate-spin rounded-full h-3 w-3 border-2 border-current border-t-transparent" />
                              ) : (<><StatusIcon className="w-3 h-3" /> {s.replace('_', ' ')}</>)}
                            </motion.button>
                          )
                        })
                      })()}
                      {(selectedOrder.order_status || selectedOrder.status) === 'delivered' && (
                        <p className="text-xs text-gray-400 mt-1 w-full">Only refund is available for delivered orders</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
