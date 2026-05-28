import '../services/api_service.dart';
import '../config/api_config.dart';

class BannerService {
  static Future<List<Map<String, dynamic>>> getActiveBanners() async {
    final response = await ApiService.get(ApiConfig.activeBanners);
    if (response['success']) {
      final data = response['data'];
      // Backend returns: { success, count, banners: [...] }
      // ApiService wraps it as: { success, data: { success, count, banners: [...] } }
      if (data is Map && data['banners'] != null) {
        return List<Map<String, dynamic>>.from(data['banners']);
      } else if (data is List) {
        return List<Map<String, dynamic>>.from(data);
      }
    }
    return [];
  }
}
