import 'dart:async';
import 'package:flutter/material.dart';
import '../models/cart_item.dart';
import '../services/cart_service.dart';

class CartProvider with ChangeNotifier {
  List<CartItem> _items = [];
  bool _isLoading = false;
  String? _error;
  bool _isNetworkError = false;
  String? _currentStoreId;
  String? _currentStoreName;

  List<CartItem> get items => _items;
  bool get isLoading => _isLoading;
  String? get error => _error;
  bool get isNetworkError => _isNetworkError;
  int get itemCount => _items.fold(0, (sum, item) => sum + item.quantity);
  double get totalAmount =>
      _items.fold(0, (sum, item) => sum + item.totalPrice);
  bool get isEmpty => _items.isEmpty;
  int get uniqueItemCount => _items.length;
  String? get currentStoreId => _currentStoreId;
  String? get currentStoreName => _currentStoreName;

  // Get cart items grouped by store
  Map<String, List<CartItem>> get itemsByStore {
    final Map<String, List<CartItem>> grouped = {};
    for (var item in _items) {
      final storeId = item.storeId ?? 'unknown';
      grouped.putIfAbsent(storeId, () => []).add(item);
    }
    return grouped;
  }

  // Get list of store IDs
  List<String> get storeIds => itemsByStore.keys.toList();

  // Helper: Get cart item by product ID
  CartItem? getCartItem(String productId) {
    try {
      return _items.firstWhere(
        (item) => item.productId == productId || item.productId.toString() == productId,
      );
    } catch (e) {
      return null;
    }
  }

  // Helper: Check if product is in cart
  bool isInCart(String productId) {
    return getCartItem(productId) != null;
  }

  // Helper: Get quantity of a product in cart
  int getQuantity(String productId) {
    final item = getCartItem(productId);
    return item?.quantity ?? 0;
  }

  Future<void> loadCart() async {
    _isLoading = true;
    _error = null;
    _isNetworkError = false;
    notifyListeners();

    try {
      final items = await CartService.getCart();
      _items = items;
      _error = null;

      if (items.isNotEmpty && items.first.storeId != null) {
        _currentStoreId = items.first.storeId;
        _currentStoreName = items.first.storeName;
      } else {
        _currentStoreId = null;
        _currentStoreName = null;
      }
    } on TimeoutException {
      _error = 'Request timed out. Please try again.';
      _isNetworkError = true;
    } catch (e) {
      final msg = e.toString().toLowerCase();
      if (msg.contains('socket') || msg.contains('network') || msg.contains('connection')) {
        _error = 'No internet connection';
        _isNetworkError = true;
      } else {
        _error = 'Failed to load cart. Please try again.';
      }
    }

    _isLoading = false;
    notifyListeners();
  }

  Future<Map<String, dynamic>> addToCart(
    String productId, {
    int quantity = 1,
    String? productStoreId,
    String? productStoreName,
  }) async {
    try {
      final response = await CartService.addToCart(
        productId: productId,
        quantity: quantity,
      );

      if (response['unauthorized'] == true || 
          response['statusCode'] == 401 ||
          response['message']?.toLowerCase().contains('token') == true ||
          response['message']?.toLowerCase().contains('login') == true ||
          response['message']?.toLowerCase().contains('auth') == true) {
        return {
          'success': false,
          'unauthorized': true,
          'message': 'Please login first to add items to cart'
        };
      }

      if (response['success'] == true) {
        final existing = getCartItem(productId);
        if (existing != null) {
          final idx = _items.indexWhere((i) => i.id == existing.id);
          if (idx != -1) {
            _items[idx] = _items[idx].copyWith(quantity: existing.quantity + quantity);
          }
        }
        _error = null;
        _isLoading = false;
        notifyListeners();
        loadCart();
        return {'success': true};
      } else {
        _error = response['message'] ?? 'Failed to add to cart';
        notifyListeners();
        return {'success': false, 'message': _error};
      }
    } on TimeoutException {
      _error = 'Request timed out. Please try again.';
      _isNetworkError = true;
      notifyListeners();
      return {'success': false, 'cartCleared': false, 'networkError': true};
    } catch (e) {
      final msg = e.toString().toLowerCase();
      if (msg.contains('socket') || msg.contains('network') || msg.contains('connection')) {
        _error = 'No internet connection. Please check your network.';
        _isNetworkError = true;
        notifyListeners();
        return {'success': false, 'cartCleared': false, 'networkError': true};
      }
      _error = 'Failed to add to cart. Please try again.';
      notifyListeners();
      return {'success': false, 'cartCleared': false, 'message': _error};
    }
  }

  // Quick add to cart (adds 1)
  Future<Map<String, dynamic>> quickAddToCart(String productId) async {
    return addToCart(productId, quantity: 1);
  }

  Future<bool> updateQuantity(String itemId, int quantity) async {
    if (quantity < 1) {
      return removeItem(itemId);
    }

    _error = null;
    _isNetworkError = false;

    try {
      final response = await CartService.updateCartItem(itemId, quantity);
      if (response['success'] == true) {
        final index = _items.indexWhere((item) => item.id == itemId);
        if (index != -1) {
          _items[index] = _items[index].copyWith(quantity: quantity);
          notifyListeners();
        }
        return true;
      } else {
        _error = response['message'] ?? 'Failed to update quantity';
        notifyListeners();
        return false;
      }
    } on TimeoutException {
      _error = 'Request timed out';
      _isNetworkError = true;
      notifyListeners();
      return false;
    } catch (e) {
      _error = 'Failed to update quantity';
      notifyListeners();
      return false;
    }
  }

  Future<bool> removeItem(String itemId) async {
    _error = null;
    _isNetworkError = false;

    try {
      final response = await CartService.removeCartItem(itemId);
      if (response['success'] == true) {
        _items.removeWhere((item) => item.id == itemId);
        notifyListeners();
        return true;
      } else {
        _error = response['message'] ?? 'Failed to remove item';
        notifyListeners();
        return false;
      }
    } catch (e) {
      _error = 'Failed to remove item';
      notifyListeners();
      return false;
    }
  }

  Future<bool> clearCart() async {
    _isLoading = true;
    _error = null;
    _isNetworkError = false;
    notifyListeners();

    try {
      final response = await CartService.clearCart();
      if (response['success'] == true) {
        _items = [];
        _currentStoreId = null;
        _currentStoreName = null;
        notifyListeners();
        return true;
      } else {
        _error = response['message'] ?? 'Failed to clear cart';
        notifyListeners();
        return false;
      }
    } catch (e) {
      _error = 'Failed to clear cart';
      notifyListeners();
      return false;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  void resetLocalCart() {
    _items = [];
    _currentStoreId = null;
    _currentStoreName = null;
    _error = null;
    _isNetworkError = false;
    _isLoading = false;
    notifyListeners();
  }

  void clearError() {
    _error = null;
    _isNetworkError = false;
    notifyListeners();
  }

  bool hasError() => _error != null;

  String getErrorMessage() {
    if (_isNetworkError) {
      return 'No internet connection. Please check your network.';
    }
    return _error ?? 'Something went wrong';
  }
}

extension CartItemExtension on CartItem {
  CartItem copyWith({int? quantity}) {
    return CartItem(
      id: id,
      productId: productId,
      productName: productName,
      price: price,
      quantity: quantity ?? this.quantity,
      image: image,
    );
  }
}
