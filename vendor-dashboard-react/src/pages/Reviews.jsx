import React, { useState, useEffect } from 'react';
import { getVendorReviews, respondToReview } from '../services/api';
import { motion } from 'framer-motion';
import { Star, AlertCircle, ThumbsUp, MessageSquare, User, Send } from 'lucide-react';

export default function Reviews() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [replyText, setReplyText] = useState({});
  const [replying, setReplying] = useState({});
  const [showReply, setShowReply] = useState({});

  useEffect(() => { loadReviews(); }, []);

  const loadReviews = async () => {
    try { setLoading(true); const res = await getVendorReviews(); if (res.data.success) setReviews(res.data.reviews || []); }
    catch { setError('Failed to load reviews'); } finally { setLoading(false); }
  };

  const handleRespond = async (id) => {
    const response = replyText[id]?.trim();
    if (!response) return;
    try {
      setReplying(prev => ({ ...prev, [id]: true }));
      await respondToReview(id, response);
      setReplyText(prev => ({ ...prev, [id]: '' }));
      setShowReply(prev => ({ ...prev, [id]: false }));
      await loadReviews();
    } catch { setError('Failed to send reply'); } finally { setReplying(prev => ({ ...prev, [id]: false })); }
  };

  if (loading) return <div className="flex items-center justify-center h-96"><div className="w-16 h-16 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" /></div>;

  const avgRating = reviews.length > 0 ? (reviews.reduce((acc, r) => acc + (r.rating || 0), 0) / reviews.length).toFixed(1) : '0.0';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Reviews</h1>
        <p className="text-gray-500">Customer feedback on your products</p>
      </div>

      {error && <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3"><AlertCircle size={20} className="text-red-600" /><span className="text-red-700">{error}</span></div>}

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-gradient-to-br from-emerald-500 to-green-600 rounded-2xl p-6 text-white">
        <div className="flex items-center gap-4">
          <div className="text-center">
            <p className="text-5xl font-bold">{avgRating}</p>
            <div className="flex items-center gap-0.5 mt-1 justify-center">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star key={star} size={16} className={star <= Math.round(parseFloat(avgRating)) ? 'text-yellow-300 fill-yellow-300' : 'text-white/30'} />
              ))}
            </div>
          </div>
          <div className="flex-1">
            <p className="text-2xl font-bold">{reviews.length}</p>
            <p className="text-emerald-100">Total Reviews</p>
            <div className="flex items-center gap-2 mt-2">
              <ThumbsUp size={16} className="text-emerald-200" />
              <span className="text-sm text-emerald-200">{reviews.filter(r => r.rating >= 4).length} positive reviews</span>
            </div>
          </div>
        </div>
      </motion.div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {reviews.length === 0 ? (
          <div className="text-center py-16">
            <MessageSquare size={48} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500 font-medium">No reviews yet</p>
            <p className="text-gray-400 text-sm mt-1">Customer reviews will appear here</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {reviews.map((review, i) => (
              <motion.div key={review.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.05 }} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-100 to-green-100 flex items-center justify-center flex-shrink-0">
                    <User size={22} className="text-emerald-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-semibold text-gray-900">{review.customer_name || `${review.first_name || ''} ${review.last_name || ''}`.trim() || 'Anonymous'}</h4>
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star key={star} size={14} className={star <= (review.rating || 0) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200'} />
                        ))}
                      </div>
                    </div>
                    {review.product_name && <p className="text-xs text-gray-500 mb-2">Product: {review.product_name}</p>}
                    <p className="text-sm text-gray-700">{review.review_text || review.comment || 'No comment provided.'}</p>
                    <p className="text-xs text-gray-400 mt-2">{new Date(review.created_at).toLocaleDateString()}</p>
                    {review.admin_response && (
                      <div className="mt-3 pl-3 border-l-2 border-emerald-300 bg-emerald-50/50 rounded-r-lg py-2 px-3">
                        <p className="text-xs font-semibold text-emerald-700">Your Reply:</p>
                        <p className="text-sm text-gray-700 mt-0.5">{review.admin_response}</p>
                      </div>
                    )}
                    <button onClick={() => setShowReply(prev => ({ ...prev, [review.id]: !prev[review.id] }))} className="mt-2 text-xs text-emerald-600 hover:text-emerald-700 font-medium">
                      {review.admin_response ? 'Edit Reply' : 'Reply'}
                    </button>
                    {showReply[review.id] && (
                      <div className="mt-3 flex gap-2">
                        <input type="text" value={replyText[review.id] || ''} onChange={e => setReplyText(prev => ({ ...prev, [review.id]: e.target.value }))}
                          placeholder="Write your reply..." className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none" />
                        <button onClick={() => handleRespond(review.id)} disabled={replying[review.id] || !replyText[review.id]?.trim()}
                          className="px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 text-sm disabled:opacity-50 flex items-center gap-1">
                          {replying[review.id] ? <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" /> : <><Send size={14} /> Send</>}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
