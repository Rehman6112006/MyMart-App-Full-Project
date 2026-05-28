import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../services/wishlist_service.dart';

class WishlistProvider with ChangeNotifier {
  List<Map<String, dynamic>> _items = [];
  Set<String> _wishlistProductIds = {};
  bool _isLoading = false;
  String? _error;
  bool _unauthorized = false;

  static const String _localWishlistKey = 'local_wishlist_ids';

  List<Map<String, dynamic>> get items => _items;
  Set<String> get wishlistProductIds => _wishlistProductIds;
  bool get isLoading => _isLoading;
  String? get error => _error;
  bool get unauthorized => _unauthorized;
  int get count => _wishlistProductIds.length;

  // Check if product is in wishlist
  bool isInWishlist(String productId) => _wishlistProductIds.contains(productId);

  // Load wishlist from server AND local storage
  Future<void> loadWishlist() async {
    _isLoading = true;
    notifyListeners();

    try {
      // First load local wishlist IDs (for offline/fast access)
      await _loadLocalWishlistIds();

      // Then try to load from server
      try {
        final serverItems = await WishlistService.getWishlist();
        if (serverItems.isNotEmpty) {
          _items = serverItems;
          _wishlistProductIds = serverItems
              .where((item) => item['product_id'] != null)
              .map((item) => item['product_id'].toString())
              .toSet();
        }
        _error = null;
        await _saveLocalWishlistIds();
      } catch (e) {
        if (_wishlistProductIds.isEmpty) {
          await _loadLocalWishlistIds();
        }
        _error = null;
      }
    } catch (e) {
      _error = 'Failed to load wishlist';
    }

    _isLoading = false;
    notifyListeners();
  }

  // Load local wishlist IDs from storage
  Future<void> _loadLocalWishlistIds() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final ids = prefs.getStringList(_localWishlistKey) ?? [];
      _wishlistProductIds = ids.toSet();
    } catch (e) {
      // Ignore storage errors
    }
  }

  // Save local wishlist IDs to storage
  Future<void> _saveLocalWishlistIds() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setStringList(_localWishlistKey, _wishlistProductIds.toList());
    } catch (e) {
      // Ignore storage errors
    }
  }

  // Toggle wishlist - handles both add and remove
  Future<Map<String, dynamic>> toggleWishlist(String productId) async {
    if (isInWishlist(productId)) {
      // Try to find the wishlist item ID from loaded items
      String? wishlistItemId;
      final item = _items.firstWhere(
        (item) => item['product_id']?.toString() == productId,
        orElse: () => {},
      );
      if (item.isNotEmpty && item['id'] != null) {
        wishlistItemId = item['id'].toString();
      }

      // If not in cached items, try to get it from server
      if (wishlistItemId == null) {
        try {
          final check = await WishlistService.checkWishlist(productId);
          if (check['success']) {
            final data = check['data'] as Map?;
            if (data != null && data['wishlistId'] != null) {
              wishlistItemId = data['wishlistId'].toString();
            }
          }
        } catch (_) {}
      }

      // Attempt server removal
      if (wishlistItemId != null) {
        try {
          final response = await WishlistService.removeFromWishlist(wishlistItemId);
          if (response['success'] || response['statusCode'] == 404) {
            _wishlistProductIds.remove(productId);
            _items.removeWhere((i) => i['product_id']?.toString() == productId);
            await _saveLocalWishlistIds();
            notifyListeners();
            return {'success': true, 'removed': true};
          }
        } catch (_) {}
      }

      // Server removal failed or item not synced – remove locally anyway
      _wishlistProductIds.remove(productId);
      _items.removeWhere((i) => i['product_id']?.toString() == productId);
      await _saveLocalWishlistIds();
      notifyListeners();
      return {'success': true, 'removed': true};
    } else {
      // Add to wishlist
      final response = await WishlistService.addToWishlist(productId);

      if (response['success']) {
        _wishlistProductIds.add(productId);
        await _saveLocalWishlistIds();
        await loadWishlist();
        return {'success': true, 'added': true};
      }

      // Server says already in wishlist – update local state
      if (response['statusCode'] == 400) {
        _wishlistProductIds.add(productId);
        await _saveLocalWishlistIds();
        await loadWishlist();
        return {'success': true, 'added': true, 'sync': true};
      }

      if (response['unauthorized'] == true) {
        _unauthorized = true;
        notifyListeners();
        return {'success': false, 'unauthorized': true};
      }

      // Network/server error – still add locally for offline support
      _wishlistProductIds.add(productId);
      await _saveLocalWishlistIds();
      notifyListeners();
      return {'success': true, 'added': true, 'offline': true};
    }
  }

  // Clear unauthorized flag
  void clearUnauthorized() {
    _unauthorized = false;
    notifyListeners();
  }

  // Move to cart
  Future<bool> moveToCart(String wishlistItemId) async {
    final response = await WishlistService.moveToCart(wishlistItemId);
    if (response['success'] || response['statusCode'] == 404) {
      await loadWishlist();
      return true;
    }
    return false;
  }

  // Clear all local wishlist (on logout)
  Future<void> clearLocalWishlist() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove(_localWishlistKey);
      _wishlistProductIds.clear();
      _items.clear();
      notifyListeners();
    } catch (e) {
      // Ignore
    }
  }
}
