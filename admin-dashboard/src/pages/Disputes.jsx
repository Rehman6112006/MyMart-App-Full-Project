import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Scale, Search, X, Eye, AlertCircle, RefreshCw, Clock,
  User, MessageSquare, ChevronDown, Flag, ArrowUpRight
} from 'lucide-react'
import {
  getAdminDisputes, getAdminDisputeDetail, updateAdminDispute, addDisputeResponse, getOrderById
} from '../services/api'

const statusFilters = ['all', 'open', 'under_review', 'resolved', 'closed']
const statusColors = {
  open: 'bg-red-100 text-red-800',
  under_review: 'bg-yellow-100 text-yellow-800',
  resolved: 'bg-emerald-100 text-emerald-800',
  closed: 'bg-gray-100 text-gray-700'
}
const priorityColors = {
  low: 'bg-gray-100 text-gray-600',
  medium: 'bg-amber-100 text-amber-700',
  high: 'bg-red-100 text-red-700',
  critical: 'bg-red-100 text-red-800'
}
const typeLabels = {
  refund: 'Refund',
  cancellation: 'Cancellation',
  damaged: 'Damaged Item',
  wrong_item: 'Wrong Item',
  not_received: 'Not Received',
  quality: 'Quality Issue',
  other: 'Other'
}

export default function Disputes() {
  const [disputes, setDisputes] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [error, setError] = useState('')
  const [selectedDispute, setSelectedDispute] = useState(null)
  const [disputeDetail, setDisputeDetail] = useState(null)
  const [orderDetail, setOrderDetail] = useState(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [search, setSearch] = useState('')
  const [responseText, setResponseText] = useState('')
  const [sendingResponse, setSendingResponse] = useState(false)

  useEffect(() => { fetchDisputes() }, [])

  const fetchDisputes = async () => {
    setLoading(true); setError('')
    try {
      const res = await getAdminDisputes()
      const data = res.data
      setDisputes(data.success && Array.isArray(data.disputes) ? data.disputes : [])
    } catch (e) { setError('Failed to load disputes') }
    finally { setLoading(false) }
  }

  const fetchDisputeDetail = async (dispute) => {
    setSelectedDispute(dispute)
    setDisputeDetail(null)
    setOrderDetail(null)
    setLoadingDetail(true)
    setResponseText('')
    try {
      const res = await getAdminDisputeDetail(dispute.id)
      const data = res.data
      if (data.success) {
        setDisputeDetail(data.dispute || data.data)
      } else {
        setDisputeDetail(dispute)
      }
    } catch (e) {
      setDisputeDetail(dispute)
    }
    try {
      const orderRes = await getOrderById(dispute.order_id)
      const orderData = orderRes.data
      setOrderDetail(orderData.success ? (orderData.order || orderData.data) : null)
    } catch (e) { /* ignore */ }
    finally { setLoadingDetail(false) }
  }

  const handleUpdateStatus = async (newStatus) => {
    if (!selectedDispute) return
    setUpdating(true)
    try {
      await updateAdminDispute(selectedDispute.id, { status: newStatus })
      setDisputeDetail(prev => prev ? { ...prev, status: newStatus } : null)
      setSelectedDispute(prev => prev ? { ...prev, status: newStatus } : null)
      await fetchDisputes()
    } catch (e) { setError('Failed to update status') }
    finally { setUpdating(false) }
  }

  const handleSendResponse = async () => {
    if (!responseText.trim() || !selectedDispute) return
    setSendingResponse(true)
    try {
      const res = await addDisputeResponse(selectedDispute.id, { message: responseText.trim() })
      const data = res.data
      if (data.success) {
        setDisputeDetail(prev => ({
          ...prev,
          responses: [...(prev?.responses || []), data.response || data.data || { message: responseText.trim(), admin_name: 'You', created_at: new Date().toISOString() }]
        }))
        setResponseText('')
      }
    } catch (e) { setError('Failed to send response') }
    finally { setSendingResponse(false) }
  }

  const formatId = (d) => {
    const num = d.dispute_number || d.id || ''
    if (num.startsWith('DSP-')) return num
    return `DSP-${num.toString().slice(-8).toUpperCase()}`
  }

  const formatOrderNum = (d) => {
    const num = d.order_number || ''
    if (num.startsWith('ORD-')) return num
    return num ? `ORD-${num.toString().slice(-8).toUpperCase()}` : '—'
  }

  const filtered = disputes.filter(d => {
    if (filter !== 'all' && d.status !== filter) return false
    if (!search) return true
    const q = search.toLowerCase()
    const id = (d.dispute_number || d.id || '').toLowerCase()
    const orderNum = (d.order_number || '').toLowerCase()
    const customer = `${d.first_name || ''} ${d.last_name || ''}`.toLowerCase()
    return id.includes(q) || orderNum.includes(q) || customer.includes(q)
  })

  const formatCurrency = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n || 0)

  if (loading) return <div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-4 border-emerald-200 border-t-emerald-600" /></div>

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Disputes</h1>
          <p className="text-sm text-gray-500 mt-1">Manage customer disputes and inquiries</p>
        </div>
        <button onClick={fetchDisputes} className="px-4 py-2 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors text-sm flex items-center gap-2">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </motion.div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-center gap-3 text-sm text-red-700">
          <AlertCircle className="w-5 h-5 shrink-0" /> {error}
          <button onClick={() => setError('')} className="ml-auto p-1 hover:bg-red-100 rounded-lg"><X className="w-4 h-4" /></button>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by dispute ID, order number or customer name..."
            className="input-field pl-10 text-sm" />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {statusFilters.map((s) => {
          const count = s === 'all' ? disputes.length : disputes.filter(d => d.status === s).length
          return (
            <motion.button key={s} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              onClick={() => setFilter(s)}
              className={`px-4 py-2 rounded-xl text-sm font-medium capitalize transition-all flex items-center gap-2 ${
                filter === s ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/30' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {s.replace('_', ' ')}
              {count > 0 && <span className={`text-xs px-1.5 py-0.5 rounded-full ${filter === s ? 'bg-emerald-500' : 'bg-gray-100 text-gray-500'}`}>{count}</span>}
            </motion.button>
          )
        })}
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
      >
        {filtered.length === 0 ? (
          <div className="py-16 text-center">
            <Scale className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No disputes found</p>
            <p className="text-xs text-gray-400 mt-1">{search ? 'Try a different search' : 'Disputes will appear here when customers raise them'}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left py-3.5 px-4 text-gray-500 font-medium">Dispute ID</th>
                  <th className="text-left py-3.5 px-4 text-gray-500 font-medium">Order</th>
                  <th className="text-left py-3.5 px-4 text-gray-500 font-medium">Customer</th>
                  <th className="text-left py-3.5 px-4 text-gray-500 font-medium">Type</th>
                  <th className="text-left py-3.5 px-4 text-gray-500 font-medium">Status</th>
                  <th className="text-left py-3.5 px-4 text-gray-500 font-medium">Priority</th>
                  <th className="text-left py-3.5 px-4 text-gray-500 font-medium">Date</th>
                  <th className="text-right py-3.5 px-4 text-gray-500 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((d, i) => (
                  <motion.tr key={d.id || i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}
                    className="border-b border-gray-50 hover:bg-emerald-50/30 transition-colors cursor-pointer group"
                    onClick={() => fetchDisputeDetail(d)}
                  >
                    <td className="py-3.5 px-4">
                      <span className="font-mono font-semibold text-gray-900 text-xs bg-gray-100 px-2 py-1 rounded-lg">
                        {formatId(d)}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-mono text-xs text-gray-600 bg-gray-50 px-2 py-1 rounded-lg">
                        {formatOrderNum(d)}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-medium text-gray-900">{d.first_name ? `${d.first_name} ${d.last_name || ''}` : '—'}</span>
                      {d.email && <p className="text-xs text-gray-400 truncate max-w-[150px]">{d.email}</p>}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="text-gray-700">{typeLabels[d.type] || d.type || '—'}</span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusColors[d.status] || 'bg-gray-100 text-gray-700'}`}>
                        {(d.status || 'unknown').replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium flex items-center gap-1 w-fit ${priorityColors[d.priority] || 'bg-gray-100 text-gray-600'}`}>
                        <Flag className="w-3 h-3" /> {d.priority || 'normal'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-gray-500 text-xs whitespace-nowrap">
                      {d.created_at ? new Date(d.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                        onClick={(e) => { e.stopPropagation(); fetchDisputeDetail(d) }}
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

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedDispute && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto py-8 px-4 bg-black/30 backdrop-blur-sm"
            onClick={() => { setSelectedDispute(null); setDisputeDetail(null); setOrderDetail(null) }}
          >
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-gray-50 to-white">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-red-50"><Scale className="w-5 h-5 text-red-500" /></div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">
                      Dispute <span className="font-mono">{formatId(selectedDispute)}</span>
                    </h2>
                    <p className="text-xs text-gray-400">Order {formatOrderNum(selectedDispute)}</p>
                  </div>
                </div>
                <button onClick={() => { setSelectedDispute(null); setDisputeDetail(null); setOrderDetail(null) }}
                  className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              {loadingDetail ? (
                <div className="flex items-center justify-center py-16">
                  <div className="animate-spin rounded-full h-10 w-10 border-4 border-emerald-200 border-t-emerald-600" />
                </div>
              ) : (
                <div className="p-6 space-y-6">
                  {/* Status & Priority */}
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[disputeDetail?.status || selectedDispute.status] || 'bg-gray-100 text-gray-700'}`}>
                      {(disputeDetail?.status || selectedDispute.status || 'unknown').replace('_', ' ')}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${priorityColors[disputeDetail?.priority || selectedDispute.priority] || 'bg-gray-100 text-gray-600'}`}>
                      <Flag className="w-3 h-3" /> {disputeDetail?.priority || selectedDispute.priority || 'normal'}
                    </span>
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {(disputeDetail?.created_at || selectedDispute.created_at) ? new Date(disputeDetail?.created_at || selectedDispute.created_at).toLocaleString() : ''}
                    </span>
                  </div>

                  {/* Customer & Order Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-gray-50 rounded-xl p-4">
                      <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2"><User className="w-4 h-4 text-red-500" /> Customer</h3>
                      <div className="space-y-2 text-sm">
                        <p><span className="text-gray-500">Name:</span> <span className="font-medium text-gray-900">
                          {disputeDetail?.first_name || selectedDispute.first_name ? `${disputeDetail?.first_name || selectedDispute.first_name} ${disputeDetail?.last_name || selectedDispute.last_name || ''}` : '—'}
                        </span></p>
                        <p><span className="text-gray-500">Email:</span> <span className="text-gray-700">{disputeDetail?.email || selectedDispute.email || '—'}</span></p>
                        <p><span className="text-gray-500">Phone:</span> <span className="text-gray-700">{disputeDetail?.phone || selectedDispute.phone || '—'}</span></p>
                      </div>
                    </div>
                    {orderDetail && (
                      <div className="bg-gray-50 rounded-xl p-4">
                        <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2"><ArrowUpRight className="w-4 h-4 text-red-500" /> Order Info</h3>
                        <div className="space-y-2 text-sm">
                          <p><span className="text-gray-500">Order:</span> <span className="font-mono text-xs font-medium">{formatOrderNum(selectedDispute)}</span></p>
                          <p><span className="text-gray-500">Total:</span> <span className="font-semibold text-emerald-600">{formatCurrency(orderDetail.total_amount || orderDetail.total || 0)}</span></p>
                          <p><span className="text-gray-500">Payment:</span> <span className="text-gray-700 capitalize">{orderDetail.payment_method || '—'}</span></p>
                          <p><span className="text-gray-500">Status:</span> <span className="text-gray-700 capitalize">{(orderDetail.order_status || orderDetail.status || '—').replace('_', ' ')}</span></p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Dispute Details */}
                  <div className="bg-gray-50 rounded-xl p-4">
                    <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2"><AlertCircle className="w-4 h-4 text-red-500" /> Dispute Details</h3>
                    <div className="space-y-2 text-sm">
                      <p><span className="text-gray-500">Type:</span> <span className="font-medium text-gray-900">{typeLabels[disputeDetail?.type || selectedDispute.type] || (disputeDetail?.type || selectedDispute.type || '—')}</span></p>
                      <p><span className="text-gray-500">Reason:</span></p>
                      <p className="text-gray-700 bg-white rounded-lg p-3 border border-gray-100">{disputeDetail?.reason || selectedDispute.reason || disputeDetail?.details || selectedDispute.details || 'No details provided'}</p>
                    </div>
                  </div>

                  {/* Timeline */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2"><MessageSquare className="w-4 h-4 text-red-500" /> Timeline</h3>
                    {(disputeDetail?.responses || []).length === 0 ? (
                      <p className="text-sm text-gray-400 text-center py-4">No responses yet</p>
                    ) : (
                      <div className="space-y-3">
                        {(disputeDetail?.responses || []).map((r, idx) => (
                          <div key={idx} className="flex gap-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-green-500 flex items-center justify-center shrink-0 mt-0.5">
                              <span className="text-white text-xs font-bold">{(r.admin_name || 'A')[0].toUpperCase()}</span>
                            </div>
                            <div className="flex-1 bg-gray-50 rounded-xl p-3">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-sm font-semibold text-gray-900">{r.admin_name || 'Admin'}</span>
                                <span className="text-xs text-gray-400">{r.created_at ? new Date(r.created_at).toLocaleString() : ''}</span>
                              </div>
                              <p className="text-sm text-gray-700">{r.message}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Admin Response Form */}
                  <div className="border-t border-gray-100 pt-4">
                    <h3 className="text-sm font-semibold text-gray-900 mb-3">Add Response</h3>
                    <div className="space-y-3">
                      <textarea value={responseText} onChange={e => setResponseText(e.target.value)}
                        placeholder="Type your response..."
                        rows={3}
                        className="input-field text-sm resize-none w-full" />
                      <div className="flex justify-end gap-2">
                        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                          onClick={handleSendResponse}
                          disabled={!responseText.trim() || sendingResponse}
                          className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                          {sendingResponse ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                          ) : (
                            <MessageSquare className="w-4 h-4" />
                          )}
                          Send Response
                        </motion.button>
                      </div>
                    </div>
                  </div>

                  {/* Status Update */}
                  <div className="border-t border-gray-100 pt-4">
                    <h3 className="text-sm font-semibold text-gray-900 mb-3">Update Status</h3>
                    <div className="flex flex-wrap gap-2">
                      {statusFilters.filter(s => s !== 'all' && s !== (disputeDetail?.status || selectedDispute.status)).map((s) => (
                        <motion.button key={s} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                          onClick={() => handleUpdateStatus(s)}
                          disabled={updating}
                          className="px-3 py-2 rounded-lg text-xs font-medium capitalize transition-all border bg-white text-gray-700 border-gray-200 hover:bg-emerald-50 hover:border-emerald-300 flex items-center gap-1.5"
                        >
                          {updating ? (
                            <div className="animate-spin rounded-full h-3 w-3 border-2 border-current border-t-transparent" />
                          ) : (
                            <><ChevronDown className="w-3 h-3" /> {s.replace('_', ' ')}</>
                          )}
                        </motion.button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
