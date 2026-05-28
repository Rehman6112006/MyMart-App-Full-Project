import '../models/product.dart';
import '../services/api_service.dart';
import '../config/api_config.dart';

class ProductService {
  // Get all products with pagination & filters
  static Future<Map<String, dynamic>> getProducts({
    int page = 1,
    int limit = 20,
    String? categoryId,
    String? categorySlug,
    String? search,
    String? sortBy,
    String? sortOrder,
    double? minPrice,
    double? maxPrice,
  }) async {
    final queryParams = <String, String>{
      'page': page.toString(),
      'limit': limit.toString(),
    };

    // Use category_slug for slug-format IDs (e.g., fresh-fruits)
    // Use category_id for UUID-format IDs (e.g., 0a840554-55b5-47b6-bd50-0c64eff1d32b)
    if (categoryId != null) {
      // UUID format: 8-4-4-4-12 characters with hyphens (36 total with 4 hyphens)
      // Slug format: contains hyphens but shorter, like fresh-fruits (12 chars)
      bool isUuid = categoryId.length == 36 && 
                    RegExp(r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$', 
                           caseSensitive: false).hasMatch(categoryId);
      
      if (isUuid) {
        queryParams['category_id'] = categoryId;
      } else {
        // It's a slug, use category_slug
        queryParams['category_slug'] = categoryId;
      }
    }
    if (search != null) queryParams['search'] = search;
    if (sortBy != null) queryParams['sort_by'] = sortBy;
    if (sortOrder != null) queryParams['sort_order'] = sortOrder;
    if (minPrice != null) queryParams['min_price'] = minPrice.toString();
    if (maxPrice != null) queryParams['max_price'] = maxPrice.toString();


    final response = await ApiService.get(
      ApiConfig.products,
      queryParams: queryParams,
    );

    // Debug log

    if (response['success']) {
      // ApiService wraps backend response in 'data' field
      // Backend returns: { success: true, count: X, products: [...] }
      // ApiService returns: { success: true, data: { success: true, count: X, products: [...] } }
      final data = response['data']; // This is the backend response
      List<Product> products = [];
      int total = 0;

      if (data is Map) {
        if (data['products'] != null && data['products'] is List) {
          final productsList = data['products'] as List;
          products = productsList
              .map((e) => Product.fromJson(e as Map<String, dynamic>))
              .toList()
              .cast<Product>();
        } else {
        }
        total = data['total'] ?? data['count'] ?? products.length;
      } else if (data is List) {
        products = data
            .map((e) => Product.fromJson(e as Map<String, dynamic>))
            .toList()
            .cast<Product>();
        total = products.length;
      } else {
      }

      return {
        'success': true,
        'products': products,
        'total': total,
        'page': page,
      };
    }

    return {
      'success': false,
      'products': <Product>[],
      'total': 0,
      'page': page,
    };
  }

  // Get featured products
  static Future<List<Product>> getFeaturedProducts() async {
    final response = await ApiService.get(ApiConfig.featuredProducts);
    if (response['success']) {
      final data = response['data'];
      if (data is Map && data['products'] != null && data['products'] is List) {
        return (data['products'] as List)
            .map((e) => Product.fromJson(e))
            .toList();
      }
    }
    return [];
  }

  // Get new arrivals
  static Future<List<Product>> getNewArrivals() async {
    final response = await ApiService.get(ApiConfig.newArrivals);
    if (response['success']) {
      final data = response['data'];
      if (data is Map && data['products'] != null && data['products'] is List) {
        return (data['products'] as List)
            .map((e) => Product.fromJson(e))
            .toList();
      }
    }
    return [];
  }

  // Get deals
  static Future<List<Product>> getDeals() async {
    final response = await ApiService.get(ApiConfig.deals);
    if (response['success']) {
      final data = response['data'];
      if (data is Map && data['products'] != null && data['products'] is List) {
        return (data['products'] as List)
            .map((e) => Product.fromJson(e))
            .toList();
      }
    }
    return [];
  }

  // Get single product
  static Future<Product?> getProduct(String id) async {
    final response = await ApiService.get('${ApiConfig.products}/$id');
    if (response['success']) {
      final data = response['data'];
      if (data is Map) {
        // Backend returns { success: true, product: {...} }
        final productData = data['product'] ?? data;
        return Product.fromJson(productData as Map<String, dynamic>);
      }
    }
    return null;
  }

  // Get vendor products
  static Future<List<Product>> getVendorProducts() async {
    final response = await ApiService.get(ApiConfig.vendorProducts);
    if (response['success']) {
      final data = response['data'];
      if (data is Map && data['products'] != null && data['products'] is List) {
        return (data['products'] as List)
            .map((e) => Product.fromJson(e))
            .toList();
      }
    }
    return [];
  }
}
