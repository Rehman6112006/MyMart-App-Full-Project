import '../models/cart_item.dart';
import '../services/api_service.dart';
import '../config/api_config.dart';

class CartService {
  // Get cart - handles unauthorized gracefully
  static Future<List<CartItem>> getCart() async {
    try {
      final response = await ApiService.get(ApiConfig.cart);
      
      // If unauthorized, return empty cart silently
      if (response['unauthorized'] == true || response['statusCode'] == 401) {
        return [];
      }
      
      if (response['success'] == true) {
        // Backend returns 'cart' not 'data'
        final List<dynamic>? cartItems = response['cart'];
        if (cartItems != null) {
          return cartItems.map((e) => CartItem.fromJson(e)).toList();
        }
        // Fallback: check 'data'
        final data = response['data'];
        if (data is List) {
          return data.map((e) => CartItem.fromJson(e)).toList();
        } else if (data is Map && data['cart'] != null) {
          return (data['cart'] as List).map((e) => CartItem.fromJson(e)).toList();
        }
      }
      return [];
    } catch (e) {
      return [];
    }
  }

  // Add to cart - FIXED: Send product_id correctly and handle unauthorized
  static Future<Map<String, dynamic>> addToCart({
    required String productId,
    required int quantity,
  }) async {
    try {
      // Send productId (camelCase as backend expects)
      final Map<String, dynamic> body = {
        'productId': productId,
        'quantity': quantity,
      };
      
      final response = await ApiService.post(ApiConfig.cart, body: body);
      
      // Check for unauthorized
      if (response['unauthorized'] == true) {
        return {
          'success': false,
          'unauthorized': true,
          'message': 'Please login first to add items to cart',
        };
      }
      
      // Check status code for auth errors
      if (response['statusCode'] == 401) {
        return {
          'success': false,
          'unauthorized': true,
          'message': 'Please login first to add items to cart',
        };
      }
      
      // Check status code for 404 (product not found)
      if (response['statusCode'] == 404) {
        return {
          'success': false,
          'message': response['message'] ?? response['error'] ?? 'Product not found!',
        };
      }
      
      // Ensure we return the success status correctly
      if (response['success'] == true) {
        return {
          'success': true,
          'message': response['message'] ?? 'Added to cart!',
          'cartCleared': response['cartCleared'] ?? false,
        };
      } else {
        return {
          'success': false,
          'message': response['message'] ?? response['error'] ?? 'Failed to add to cart',
        };
      }
    } catch (e) {
      return {'success': false, 'message': 'Failed to add to cart: $e'};
    }
  }

  // Update cart item
  static Future<Map<String, dynamic>> updateCartItem(String itemId, int quantity) async {
    try {
      final response = await ApiService.put('${ApiConfig.cart}/$itemId', body: {
        'quantity': quantity,
      });
      
      if (response['unauthorized'] == true || response['statusCode'] == 401) {
        return {
          'success': false,
          'unauthorized': true,
          'message': 'Please login first'
        };
      }
      
      if (response['success'] == true) {
        return {'success': true, 'message': response['message'] ?? 'Cart updated!'};
      }
      return {'success': false, 'message': response['message'] ?? 'Failed to update cart'};
    } catch (e) {
      return {'success': false, 'message': 'Failed to update cart item: $e'};
    }
  }

  // Remove cart item
  static Future<Map<String, dynamic>> removeCartItem(String itemId) async {
    try {
      final response = await ApiService.delete('${ApiConfig.cart}/$itemId');
      
      if (response['unauthorized'] == true || response['statusCode'] == 401) {
        return {
          'success': false,
          'unauthorized': true,
          'message': 'Please login first'
        };
      }
      
      if (response['success'] == true) {
        return {'success': true, 'message': response['message'] ?? 'Item removed!'};
      }
      return {'success': false, 'message': response['message'] ?? 'Failed to remove item'};
    } catch (e) {
      return {'success': false, 'message': 'Failed to remove item: $e'};
    }
  }

  // Clear cart
  static Future<Map<String, dynamic>> clearCart() async {
    try {
      final response = await ApiService.delete(ApiConfig.cart);
      
      if (response['unauthorized'] == true || response['statusCode'] == 401) {
        return {
          'success': false,
          'unauthorized': true,
          'message': 'Please login first'
        };
      }
      
      if (response['success'] == true) {
        return {'success': true, 'message': response['message'] ?? 'Cart cleared!'};
      }
      return {'success': false, 'message': response['message'] ?? 'Failed to clear cart'};
    } catch (e) {
      return {'success': false, 'message': 'Failed to clear cart: $e'};
    }
  }
}
