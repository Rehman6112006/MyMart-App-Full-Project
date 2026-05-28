import React, { useState, useEffect } from 'react';
import { getReviews } from '../services/api';
import { motion } from 'framer-motion';
import { Star, Search, Filter, ThumbsUp, ThumbsDown, MessageSquare, User, Package, RefreshCw } from 'lucide-react';

const ratingConfig = {
  5: { label: 'Excellent', color: 'bg-green-100 text-green-700' },
  4: { label: 'Very Good', color: 'bg-emerald-100 text-emerald-700' },
  3: { label: 'Good', color: 'bg-blue-100 text-blue-700' },
  2: { label: 'Fair', color: 'bg-yellow-100 text-yellow-700' },
  1: { label: 'Poor', color: 'bg-red-100 text-red-700' },
};

export default function Reviews() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadReviews();
  }, []);

  const loadReviews = async () => {
    try {
      setLoading(true);
      const response = await getReviews();
      if (response.data.success) {
        setReviews(response.data.reviews || []);
      }
    } catch (err) {
      console.error('Error loading reviews:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredReviews = reviews.filter(r => {
    if (filter === 'all') return true;
    if (filter === '5') return r.rating === 5;
    if (filter === '4') return r.rating === 4;
    if (filter === '3') return r.rating === 3;
    if (filter === '2') return r.rating === 2;
    if (filter === '1') return r.rating === 1;
    return true;
  }).filter(r => !search || r.comment?.toLowerCase().includes(search.toLowerCase()) || r.product_name?.toLowerCase().includes(search.toLowerCase()));

  const stats = {
    total: reviews.length,
    avgRating: reviews.length > 0 ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1) : 0,
    fiveStar: reviews.filter(r => r.rating === 5).length,
    fourStar: reviews.filter(r => r.rating === 4).length,
    threeStar: reviews.filter(r => r.rating === 3).length,
    twoStar: reviews.filter(r => r.rating === 2).length,
    oneStar: reviews.filter(r => r.rating === 1).length,
  };

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reviews & Ratings</h1>
          <p className="text-gray-500">Monitor product reviews and customer feedback</p>
        </div>
        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={loadReviews} className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-xl hover:from-emerald-700 hover:to-green-700 transition-all shadow-lg shadow-emerald-500/30 flex items-center gap-2">
          <RefreshCw size={18} /> Refresh
        </motion.button>
      </motion.div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-gradient-to-br from-emerald-500 to-green-600 rounded-2xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-emerald-100 text-sm font-medium">Average Rating</p>
              <p className="text-4xl font-bold mt-2">{stats.avgRating}</p>
              <div className="flex items-center gap-1 mt-1">
                {[1,2,3,4,5].map(i => <Star key={i} size={16} className={i <= stats.avgRating ? 'text-yellow-300 fill-yellow-300' : 'text-emerald-300'} />)}
              </div>
            </div>
            <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center">
              <Star size={28} className="text-white" />
            </div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <p className="text-gray-500 text-sm">Total Reviews</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{stats.total}</p>
          <div className="flex items-center gap-1 mt-2 text-green-600 text-sm">
            <ThumbsUp size={14} /> All time
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <p className="text-gray-500 text-sm">Positive Reviews</p>
          <p className="text-3xl font-bold text-green-600 mt-2">{stats.fiveStar + stats.fourStar}</p>
          <p className="text-sm text-gray-400 mt-2">4-5 stars</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <p className="text-gray-500 text-sm">Negative Reviews</p>
          <p className="text-3xl font-bold text-red-600 mt-2">{stats.oneStar + stats.twoStar}</p>
          <p className="text-sm text-gray-400 mt-2">1-2 stars</p>
        </motion.div>
      </div>

      {/* Rating Breakdown */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h3 className="font-semibold text-gray-900 mb-4">Rating Distribution</h3>
        <div className="space-y-3">
          {[5,4,3,2,1].map(rating => {
            const count = rating === 5 ? stats.fiveStar : rating === 4 ? stats.fourStar : rating === 3 ? stats.threeStar : rating === 2 ? stats.twoStar : stats.oneStar;
            const percentage = stats.total > 0 ? (count / stats.total) * 100 : 0;
            return (
              <div key={rating} className="flex items-center gap-3">
                <span className="text-sm font-medium w-8">{rating} <Star size={12} className="inline text-yellow-500 fill-yellow-500" /></span>
                <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${percentage}%` }} transition={{ duration: 0.5, delay: 0.3 }} className={`h-full rounded-full ${rating >= 4 ? 'bg-green-500' : rating >= 3 ? 'bg-blue-500' : 'bg-red-500'}`} />
                </div>
                <span className="text-sm text-gray-500 w-12 text-right">{count}</span>
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* Search and Filter */}
      <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search reviews..." className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" />
          </div>
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => setFilter('all')} className={`px-4 py-2 rounded-lg font-medium transition-all ${filter === 'all' ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>All</button>
            {[5,4,3,2,1].map(r => (
              <button key={r} onClick={() => setFilter(r.toString())} className={`px-4 py-2 rounded-lg font-medium transition-all ${filter === r.toString() ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                {r} <Star size={14} className="inline text-yellow-500 fill-yellow-500" />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Reviews List */}
      <div className="space-y-4">
        {filteredReviews.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white rounded-xl shadow-sm p-12 text-center">
            <Star size={64} className="mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-semibold text-gray-900">No Reviews Found</h3>
            <p className="text-gray-500">Try adjusting your filters</p>
          </motion.div>
        ) : (
          filteredReviews.map((review, i) => {
            const ratingInfo = ratingConfig[review.rating] || ratingConfig[3];
            return (
              <motion.div
                key={review.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-100 to-green-100 flex items-center justify-center">
                    <User size={24} className="text-emerald-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="font-semibold text-gray-900">{review.user_name || 'Anonymous'}</p>
                        <p className="text-sm text-gray-500">{review.created_at ? new Date(review.created_at).toLocaleDateString() : 'Recent'}</p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${ratingInfo.color}`}>
                        {ratingInfo.label}
                      </span>
                    </div>
                    {review.product_name && (
                      <div className="flex items-center gap-2 mb-2 text-sm text-gray-600">
                        <Package size={14} />
                        <span>{review.product_name}</span>
                      </div>
                    )}
                    <p className="text-gray-700">{review.comment || 'No comment provided'}</p>
                    <div className="flex items-center gap-4 mt-3 pt-3 border-t">
                      <button className="flex items-center gap-1 text-sm text-gray-500 hover:text-emerald-600 transition-colors">
                        <ThumbsUp size={14} /> Helpful ({review.helpful_count || 0})
                      </button>
                      {review.reply && (
                        <button className="flex items-center gap-1 text-sm text-emerald-600">
                          <MessageSquare size={14} /> Replied
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}
