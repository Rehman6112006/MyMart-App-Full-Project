import '../models/category.dart';
import '../services/api_service.dart';
import '../config/api_config.dart';

class CategoryService {
  static Future<List<Category>> getCategories() async {
    final response = await ApiService.get(ApiConfig.categories);
    if (response['success']) {
      // ApiService wraps backend response in 'data' field
      // Backend returns: { success: true, count: X, categories: [...] }
      // ApiService returns: { success: true, data: { success: true, count: X, categories: [...] } }
      final data = response['data'];
      if (data is Map) {
        if (data['categories'] != null && data['categories'] is List) {
          return (data['categories'] as List)
              .map((e) => Category.fromJson(e))
              .toList();
        }
      }
    }
    return [];
  }

  static Future<List<Category>> getCategoryTree() async {
    final response = await ApiService.get(ApiConfig.categoryTree);
    if (response['success']) {
      final data = response['data'];
      if (data is Map &&
          data['categories'] != null &&
          data['categories'] is List) {
        return (data['categories'] as List)
            .map((e) => Category.fromJson(e))
            .toList();
      } else if (data is List) {
        return data.map((e) => Category.fromJson(e)).toList();
      }
    }
    return [];
  }

  static Future<List<Category>> getFeaturedCategories() async {
    final response = await ApiService.get(ApiConfig.featuredCategories);
    if (response['success']) {
      final data = response['data'];
      if (data is Map) {
        if (data['categories'] != null && data['categories'] is List) {
          return (data['categories'] as List)
              .map((e) => Category.fromJson(e))
              .toList();
        }
      }
    }
    return [];
  }

  static Future<Category?> getCategory(String id) async {
    final response = await ApiService.get('${ApiConfig.categories}/$id');
    if (response['success']) {
      final data = response['data'];
      if (data is Map) {
        return Category.fromJson(data.cast<String, dynamic>());
      }
    }
    return null;
  }
}
