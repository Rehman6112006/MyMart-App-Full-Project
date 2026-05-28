import 'package:flutter/material.dart';
import '../models/order.dart';
import '../services/order_service.dart';

class OrderProvider with ChangeNotifier {
  List<Order> _orders = [];
  bool _isLoading = false;
  bool _isLoadingMore = false;
  bool _hasMore = true;
  int _currentPage = 1;
  int _totalPages = 1;
  String? _error;

  List<Order> get orders => _orders;
  bool get isLoading => _isLoading;
  bool get isLoadingMore => _isLoadingMore;
  bool get hasMore => _hasMore;
  int get currentPage => _currentPage;
  String? get error => _error;

  List<Order> get pendingOrders =>
      _orders.where((o) => o.orderStatus == 'pending').toList();

  List<Order> get confirmedOrders =>
      _orders.where((o) => o.orderStatus == 'confirmed').toList();

  List<Order> get preparingOrders =>
      _orders.where((o) => o.orderStatus == 'preparing').toList();

  List<Order> get outForDeliveryOrders =>
      _orders.where((o) => o.orderStatus == 'out_for_delivery').toList();

  List<Order> get deliveredOrders =>
      _orders.where((o) => o.orderStatus == 'delivered').toList();

  List<Order> get cancelledOrders =>
      _orders.where((o) => o.orderStatus == 'cancelled').toList();

  Future<void> loadOrders() async {
    _isLoading = true;
    _error = null;
    _currentPage = 1;
    notifyListeners();

    try {
      final result = await OrderService.getMyOrders(page: 1);
      _orders = result['orders'] as List<Order>;
      _totalPages = result['pages'] as int;
      _hasMore = _currentPage < _totalPages;
    } catch (e) {
      _error = 'Failed to load orders';
    }

    _isLoading = false;
    notifyListeners();
  }

  Future<void> loadMoreOrders() async {
    if (_isLoadingMore || !_hasMore) return;
    _isLoadingMore = true;
    notifyListeners();

    try {
      final nextPage = _currentPage + 1;
      final result = await OrderService.getMyOrders(page: nextPage);
      final newOrders = result['orders'] as List<Order>;
      _orders.addAll(newOrders);
      _currentPage = nextPage;
      _totalPages = result['pages'] as int;
      _hasMore = _currentPage < _totalPages;
    } catch (e) {
      _error = 'Failed to load more orders';
    }

    _isLoadingMore = false;
    notifyListeners();
  }

  Future<Order?> getOrderById(String orderId) async {
    try {
      return await OrderService.getOrder(orderId);
    } catch (e) {
      return _orders.where((o) => o.id == orderId).firstOrNull;
    }
  }

  Future<Map<String, dynamic>> cancelOrder(String orderId, {String? reason}) async {
    final result = await OrderService.cancelOrder(orderId, reason: reason);
    if (result['success'] == true) {
      await loadOrders();
    }
    return result;
  }

  Future<bool> reorder(String orderId) async {
    try {
      return await OrderService.reorder(orderId);
    } catch (e) {
      return false;
    }
  }

  String getStatusLabel(String status) {
    switch (status) {
      case 'pending':
        return 'Pending';
      case 'confirmed':
        return 'Confirmed';
      case 'preparing':
        return 'Preparing';
      case 'out_for_delivery':
        return 'Out for Delivery';
      case 'delivered':
        return 'Delivered';
      case 'cancelled':
        return 'Cancelled';
      default:
        return status;
    }
  }

  int getStatusIndex(String status) {
    switch (status) {
      case 'pending':
        return 0;
      case 'confirmed':
        return 1;
      case 'preparing':
        return 2;
      case 'out_for_delivery':
        return 3;
      case 'delivered':
        return 4;
      case 'cancelled':
        return 5;
      default:
        return 0;
    }
  }

  void clearError() {
    _error = null;
    notifyListeners();
  }
}
