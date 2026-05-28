import '../services/api_service.dart';
import '../config/api_config.dart';

class WishlistService {
  // Get wishlist
  static Future<List<Map<String, dynamic>>> getWishlist() async {
    final response = await ApiService.get(ApiConfig.wishlist);
    if (response['success']) {
      final data = response['data'];
      // Backend returns { success, summary, wishlist: [...] }
      if (data is Map) {
        if (data['wishlist'] != null) {
          return List<Map<String, dynamic>>.from(data['wishlist']);
        } else if (data['items'] != null) {
          return List<Map<String, dynamic>>.from(data['items']);
        } else if (data['data'] != null) {
          return List<Map<String, dynamic>>.from(data['data']);
        }
      } else if (data is List) {
        return List<Map<String, dynamic>>.from(data);
      }
    }
    return [];
  }

  // Add to wishlist
  static Future<Map<String, dynamic>> addToWishlist(String productId) async {
    return await ApiService.post(ApiConfig.wishlist, body: {
      'productId': productId,
    });
  }

  // Remove from wishlist
  static Future<Map<String, dynamic>> removeFromWishlist(String wishlistItemId) async {
    return await ApiService.delete('${ApiConfig.wishlist}/$wishlistItemId');
  }

  // Check if product is in wishlist
  static Future<Map<String, dynamic>> checkWishlist(String productId) async {
    return await ApiService.get('${ApiConfig.wishlist}/check/$productId');
  }

  // Move to cart
  static Future<Map<String, dynamic>> moveToCart(String wishlistItemId) async {
    return await ApiService.post('${ApiConfig.wishlist}/$wishlistItemId/move-to-cart');
  }

  // Move all to cart
  static Future<Map<String, dynamic>> moveAllToCart() async {
    return await ApiService.post('${ApiConfig.wishlist}/move-all-to-cart');
  }

  // Clear wishlist
  static Future<Map<String, dynamic>> clearWishlist() async {
    return await ApiService.delete(ApiConfig.wishlist);
  }
}
