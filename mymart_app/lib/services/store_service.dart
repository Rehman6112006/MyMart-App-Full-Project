import '../config/api_config.dart';
import 'api_service.dart';
import '../models/store.dart';

class StoreService {
  static Future<List<Store>> getActiveStores() async {
    try {
      final response = await ApiService.get(ApiConfig.stores);
      if (response['success'] == true) {
        final backendData = response['data'];
        List<dynamic> storesList = [];
        if (backendData is Map && backendData['stores'] != null) {
          storesList = backendData['stores'] as List<dynamic>;
        } else if (backendData is List) {
          storesList = backendData;
        }
        return storesList.map((json) => Store.fromJson(json)).toList();
      }
      return [];
    } catch (e) {
      return [];
    }
  }

  static Future<Store?> getStoreById(String storeId) async {
    try {
      final response = await ApiService.get('${ApiConfig.stores}/$storeId');
      if (response['success'] == true) {
        final data = response['data'];
        if (data is Map && data['store'] != null) {
          return Store.fromJson(data['store']);
        }
      }
      return null;
    } catch (e) {
      return null;
    }
  }

  static Future<Map<String, dynamic>> getStoreProducts(String storeId, {int page = 1, int limit = 20}) async {
    try {
      final response = await ApiService.get('${ApiConfig.stores}/$storeId/products?page=$page&limit=$limit');
      if (response['success'] == true) {
        final data = response['data'];
        if (data is Map) {
          return {
            'success': true,
            'products': data['products'] ?? [],
            'total': data['total'] ?? 0,
            'page': data['page'] ?? page,
          };
        }
      }
      return {'success': false, 'products': []};
    } catch (e) {
      return {'success': false, 'products': []};
    }
  }
}
