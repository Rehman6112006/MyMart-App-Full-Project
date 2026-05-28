import '../models/order.dart';
import '../models/product.dart';
import '../models/category.dart';
import 'api_service.dart';
import '../config/api_config.dart';

class AdminService {
  static Future<Map<String, dynamic>> getDashboardStats() async {
    try {
      final resp = await ApiService.get(ApiConfig.adminDashboard);
      if (resp['success'] == true) {
        return {'success': true, 'data': resp['data']};
      }
      return {'success': false, 'error': resp['message'] ?? 'Failed to load dashboard'};
    } catch (e) {
      return {'success': false, 'error': e.toString()};
    }
  }

  static Future<Map<String, dynamic>> getStoreProducts({int page = 1, int limit = 20}) async {
    try {
      final resp = await ApiService.get(
        ApiConfig.adminStoreProducts,
        queryParams: {'page': page.toString(), 'limit': limit.toString()},
      );
      if (resp['success'] != true) {
        return {'success': false, 'error': resp['message'] ?? 'Failed to load products'};
      }
      final raw = resp['data'];
      List<Product> products = [];
      if (raw is Map) {
        final list = raw['products'] ?? raw['data'];
        if (list is List) {
          products = list.map((e) => Product.fromJson(e as Map<String, dynamic>)).toList();
        }
        return {
          'success': true,
          'products': products,
          'total': raw['total'] ?? products.length,
        };
      }
      if (raw is List) {
        products = raw.map((e) => Product.fromJson(e as Map<String, dynamic>)).toList();
        return {'success': true, 'products': products, 'total': products.length};
      }
      return {'success': true, 'products': products, 'total': 0};
    } catch (e) {
      return {'success': false, 'error': e.toString()};
    }
  }

  static Future<Map<String, dynamic>> createProduct(Map<String, dynamic> data) async {
    try {
      final resp = await ApiService.post(ApiConfig.adminStoreProducts, body: data);
      if (resp['success'] == true) {
        final raw = resp['data'];
        if (raw is Map) {
          final productData = raw['product'] ?? raw;
          return {
            'success': true,
            'product': Product.fromJson(productData as Map<String, dynamic>),
          };
        }
      }
      return {'success': false, 'error': resp['message'] ?? 'Failed to create product'};
    } catch (e) {
      return {'success': false, 'error': e.toString()};
    }
  }

  static Future<Map<String, dynamic>> updateProduct(String id, Map<String, dynamic> data) async {
    try {
      final resp = await ApiService.put('${ApiConfig.adminStoreProducts}/$id', body: data);
      if (resp['success'] == true) {
        final raw = resp['data'];
        if (raw is Map) {
          final productData = raw['product'] ?? raw;
          return {
            'success': true,
            'product': Product.fromJson(productData as Map<String, dynamic>),
          };
        }
      }
      return {'success': false, 'error': resp['message'] ?? 'Failed to update product'};
    } catch (e) {
      return {'success': false, 'error': e.toString()};
    }
  }

  static Future<Map<String, dynamic>> deleteProduct(String id) async {
    try {
      final resp = await ApiService.delete('${ApiConfig.adminStoreProducts}/$id');
      if (resp['success'] == true) {
        return {'success': true};
      }
      return {'success': false, 'error': resp['message'] ?? 'Failed to delete product'};
    } catch (e) {
      return {'success': false, 'error': e.toString()};
    }
  }

  static Future<Map<String, dynamic>> getStoreOrders({int page = 1, int limit = 20, String? status}) async {
    try {
      final params = <String, String>{'page': page.toString(), 'limit': limit.toString()};
      if (status != null && status.isNotEmpty) params['status'] = status;
      final resp = await ApiService.get(ApiConfig.adminStoreOrders, queryParams: params);
      if (resp['success'] != true) {
        return {'success': false, 'error': resp['message'] ?? 'Failed to load orders'};
      }
      final raw = resp['data'];
      List<Order> orders = [];
      int total = 0;
      Map<String, int>? stats;
      if (raw is Map) {
        final list = raw['orders'] ?? raw['data'];
        if (list is List) {
          orders = list.map((e) => Order.fromJson(e as Map<String, dynamic>)).toList();
        }
        total = raw['total'] ?? orders.length;
        if (raw['stats'] is Map) {
          stats = (raw['stats'] as Map).map((k, v) => MapEntry(k.toString(), (v as num).toInt()));
        }
      } else if (raw is List) {
        orders = raw.map((e) => Order.fromJson(e as Map<String, dynamic>)).toList();
        total = orders.length;
      }
      return {'success': true, 'orders': orders, 'total': total, 'stats': stats};
    } catch (e) {
      return {'success': false, 'error': e.toString()};
    }
  }

  static Future<Map<String, dynamic>> updateOrderStatus(String orderId, String status) async {
    try {
      final resp = await ApiService.put(
        '${ApiConfig.vendorOrderStatus}/$orderId/status',
        body: {'status': status},
      );
      if (resp['success'] == true) {
        return {'success': true, 'data': resp['data']};
      }
      return {'success': false, 'error': resp['message'] ?? 'Failed to update order status'};
    } catch (e) {
      return {'success': false, 'error': e.toString()};
    }
  }

  static Future<Map<String, dynamic>> getCategories() async {
    try {
      final resp = await ApiService.get(ApiConfig.categories);
      if (resp['success'] == true) {
        final raw = resp['data'];
        List<Category> categories = [];
        if (raw is Map) {
          final list = raw['categories'] ?? raw['data'];
          if (list is List) {
          categories = list
              .whereType<Map<String, dynamic>>()
              .map((e) => Category.fromJson(e))
              .toList();
          }
        } else if (raw is List) {
          categories = raw
              .whereType<Map<String, dynamic>>()
              .map((e) => Category.fromJson(e))
              .toList();
        }
        return {'success': true, 'categories': categories};
      }
      return {'success': false, 'error': resp['message'] ?? 'Failed to load categories'};
    } catch (e) {
      return {'success': false, 'error': e.toString()};
    }
  }

  static Future<Map<String, dynamic>> uploadProductImage(String base64Data) async {
    try {
      final resp = await ApiService.post(ApiConfig.uploadProductImage, body: {'imageData': base64Data});
      if (resp['success'] == true) {
        final d = resp['data'];
        if (d is Map) {
          final imageUrl = d['data']?['imageUrl'] ?? d['imageUrl'];
          if (imageUrl != null) return {'success': true, 'imageUrl': imageUrl};
        }
        return {'success': false, 'error': 'Upload succeeded but no URL returned'};
      }
      return {'success': false, 'error': resp['message'] ?? 'Upload failed'};
    } catch (e) {
      return {'success': false, 'error': e.toString()};
    }
  }
}
