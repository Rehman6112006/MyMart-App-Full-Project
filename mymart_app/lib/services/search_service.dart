import '../services/api_service.dart';
import '../config/api_config.dart';

class SearchService {
  // Search products
  static Future<Map<String, dynamic>> search({
    required String query,
    int page = 1,
    int limit = 20,
  }) async {
    final response = await ApiService.get(
      ApiConfig.search,
      queryParams: {
        'q': query,
        'page': page.toString(),
        'limit': limit.toString(),
      },
    );
    
    if (response['success']) {
      return response['data'];
    }
    return {'products': [], 'total': 0};
  }

  // Get search suggestions
  static Future<List<String>> getSuggestions(String query) async {
    final response = await ApiService.get(
      ApiConfig.searchSuggestions,
      queryParams: {'q': query},
    );
    if (response['success']) {
      final data = response['data'];
      if (data is List) {
        return data.map((e) => e['text']?.toString() ?? e.toString()).toList();
      } else if (data is Map && data['suggestions'] != null) {
        return (data['suggestions'] as List)
            .map((e) => e['text']?.toString() ?? e.toString())
            .toList();
      }
    }
    return [];
  }

  // Get trending searches
  static Future<List<String>> getTrending() async {
    final response = await ApiService.get(ApiConfig.searchTrending);
    if (response['success']) {
      final data = response['data'];
      if (data is List) {
        return data.map((e) => e['text']?.toString() ?? e.toString()).toList();
      }
    }
    return [];
  }

  // Get search history
  static Future<List<String>> getHistory() async {
    final response = await ApiService.get('${ApiConfig.search}/history');
    if (response['success']) {
      final data = response['data'];
      if (data is List) {
        return data.map((e) => e['query']?.toString() ?? e.toString()).toList();
      }
    }
    return [];
  }

  // Clear search history
  static Future<void> clearHistory() async {
    await ApiService.delete('${ApiConfig.search}/history');
  }
}
