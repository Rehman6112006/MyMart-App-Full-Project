import '../config/api_config.dart';
import '../services/api_service.dart';

class CouponService {
  static Future<Map<String, dynamic>> getAvailableCoupons() async {
    return await ApiService.get(ApiConfig.availableCoupons);
  }

  static Future<Map<String, dynamic>> validateCoupon(String code, {double? subtotal}) async {
    return await ApiService.post('${ApiConfig.coupons}/validate', body: {
      'code': code,
      'subtotal': ?subtotal,
    });
  }

  static Future<Map<String, dynamic>> getMyCouponHistory() async {
    return await ApiService.get('${ApiConfig.coupons}/my-usage');
  }
}
