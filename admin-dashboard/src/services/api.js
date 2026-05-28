import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'https://my-mart-backend-two.vercel.app/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' }
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('vendor_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      localStorage.removeItem('vendor_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth
export const sendForgotPasswordOTP = (email) => api.post('/auth/forgot-password', { email });
export const verifyForgotPasswordOTP = (email, otp) => api.post('/auth/verify-otp', { email, otp });
export const resetPassword = (email, otp, newPassword) => api.post('/auth/reset-password', { email, otp, newPassword });

// Dashboard - uses vendorDashboardController
export const getVendorDashboardStats = () => api.get('/vendor/dashboard/dashboard');
export const getVendorOrderStats = () => api.get('/vendor/dashboard/dashboard');

// Products - uses products route
export const getVendorProducts = (params = {}) => api.get('/products/vendor/my-products', { params });
export const createVendorProduct = (data) => api.post('/products', data);
export const updateVendorProduct = (id, data) => api.put(`/products/${id}`, data);
export const deleteVendorProduct = (id) => api.delete(`/products/${id}`);

// Orders - uses orders route
export const getVendorOrders = (params = {}) => api.get('/orders/vendor/orders', { params });
export const getVendorOrderById = (id) => api.get(`/orders/${id}`);
export const updateVendorOrderStatus = (id, status) => api.put(`/orders/vendor/orders/${id}/status`, { status });
export const markVendorPaymentReceived = (id) => api.put(`/orders/vendor/orders/${id}/payment-status`);

// Store - uses stores route
export const getVendorStore = () => api.get('/stores/vendor/my-store');
export const createVendorStore = (data) => api.post('/stores', data);
export const updateVendorStore = (data) => api.put('/stores/vendor/my-store', data);
export const uploadVendorImage = (data) => api.post('/storage/product-image', data);
export const uploadStoreLogo = (data) => api.post('/storage/store-logo', data);

// Earnings - uses settlementRoutes
export const getVendorEarnings = () => api.get('/settlements/vendor/earnings');
export const getVendorWallet = () => api.get('/settlements/vendor/wallet');
export const getVendorTransactions = () => api.get('/settlements/vendor/transactions');
export const getVendorPayoutMethods = () => api.get('/settlements/vendor/payout-methods');
export const addVendorPayoutMethod = (data) => api.post('/settlements/vendor/payout-methods', data);
export const getVendorPayoutRequests = () => api.get('/settlements/vendor/payout-requests');
export const requestVendorPayout = (data) => api.post('/settlements/vendor/payout-requests', data);

// Categories
export const getCategories = () => api.get('/categories');

// Reviews - uses reviews route
export const getVendorReviews = (params = {}) => api.get('/reviews/vendor/reviews', { params });
export const respondToReview = (id, response) => api.put(`/reviews/${id}/response`, { response });

// Vendor Reports
export const getVendorSalesReport = (params) => api.get('/vendor/dashboard/reports/sales', { params });
export const getVendorProductsReport = (params) => api.get('/vendor/dashboard/reports/products', { params });
export const getVendorOrdersReport = (params) => api.get('/vendor/dashboard/reports/orders', { params });
export const getVendorRevenueReport = (params) => api.get('/vendor/dashboard/reports/revenue', { params });
export const getVendorCustomersReport = (params) => api.get('/vendor/dashboard/reports/customers', { params });
export const getVendorComparisonReport = (params) => api.get('/vendor/dashboard/reports/comparison', { params });
export const exportVendorReport = (type, params) => api.get(`/vendor/dashboard/reports/export`, { params: { ...params, type } });

// Vendor Coupons
export const getVendorCoupons = () => api.get('/vendor/coupons');
export const createVendorCoupon = (data) => api.post('/vendor/coupons', data);
export const updateVendorCoupon = (id, data) => api.put(`/vendor/coupons/${id}`, data);
export const deleteVendorCoupon = (id) => api.delete(`/vendor/coupons/${id}`);

// Vendor Notifications
export const getVendorNotifications = (params) => api.get('/notifications', { params });
export const markVendorNotificationsRead = () => api.put('/notifications/read-all');

// Vendor Profile / Password
export const changeVendorPassword = (data) => api.put('/auth/change-password', data);

export default api;
