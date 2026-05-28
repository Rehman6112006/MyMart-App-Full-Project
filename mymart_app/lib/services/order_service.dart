import 'dart:async';
import '../models/order.dart';
import '../services/api_service.dart';
import '../config/api_config.dart';

class OrderResult {
  final bool success;
  final String? error;
  final Order? order;
  final bool isNetworkError;

  OrderResult._({
    required this.success,
    this.error,
    this.order,
    this.isNetworkError = false,
  });

  factory OrderResult.success(Order order) {
    return OrderResult._(success: true, order: order);
  }

  factory OrderResult.failure(String error, {bool isNetworkError = false}) {
    return OrderResult._(
      success: false,
      error: error,
      isNetworkError: isNetworkError,
    );
  }

  factory OrderResult.networkError() {
    return OrderResult._(
      success: false,
      error: 'No internet connection. Please check your network.',
      isNetworkError: true,
    );
  }

  factory OrderResult.timeout() {
    return OrderResult._(
      success: false,
      error: 'Request timed out. Please try again.',
      isNetworkError: true,
    );
  }
}

class OrderService {
  static const int _maxRetries = 3;
  static const Duration _timeout = Duration(seconds: 30);

  static Future<OrderResult> createOrder({
    required String deliveryAddressId,
    String? deliverySlotId,
    String? deliveryDate,
    String? deliveryNotes,
    String paymentMethod = 'cod',
    String? couponCode,
    String? storeId,
    String? storeName,
    String? stripePaymentIntentId,
  }) async {
    final body = <String, dynamic>{
      'delivery_address_id': deliveryAddressId,
      'payment_method': paymentMethod == 'cod' ? 'cod' : 'online',
    };

    if (deliverySlotId != null) body['delivery_slot_id'] = deliverySlotId;
    if (deliveryDate != null) body['delivery_date'] = deliveryDate;
    if (deliveryNotes != null) body['delivery_notes'] = deliveryNotes;
    if (couponCode != null) body['coupon_code'] = couponCode;
    if (storeId != null) body['store_id'] = storeId;
    if (storeName != null) body['store_name'] = storeName;
    if (stripePaymentIntentId != null) {
      body['stripe_payment_intent_id'] = stripePaymentIntentId;
    }

    int retryCount = 0;
    OrderResult? lastResult;

    while (retryCount <= _maxRetries) {
      try {
        final response = await ApiService.post(
          ApiConfig.orders,
          body: body,
        ).timeout(_timeout);

        // Response is wrapped by _handleResponse: {success, data, statusCode}
        // Server returns: {success, order, message}
        final serverData = response['data'] as Map<String, dynamic>?;

        if (serverData != null && serverData['success'] == true) {
          final order = Order.fromJson(serverData['order'] ?? serverData);
          return OrderResult.success(order);
        } else {
          return OrderResult.failure(
            serverData?['error'] ?? response['message'] ?? 'Failed to create order',
          );
        }
} on TimeoutException {
          lastResult = OrderResult.timeout();
        } catch (e) {
          final msg = e.toString().toLowerCase();
          if (msg.contains('socket') || msg.contains('network') || msg.contains('connection')) {
            lastResult = OrderResult.networkError();
          } else {
            lastResult = OrderResult.failure('Something went wrong. Please try again.');
          }
        }

      retryCount++;
      if (retryCount <= _maxRetries && lastResult.isNetworkError) {
        await Future.delayed(Duration(seconds: retryCount));
      } else {
        break;
      }
    }

    return lastResult ?? OrderResult.failure('Failed after multiple attempts');
  }

  static Future<Map<String, dynamic>> getMyOrders({int page = 1, int limit = 10, bool retry = true}) async {
    int retryCount = 0;

    while (retryCount <= _maxRetries) {
      try {
        final response = await ApiService.get(
          '${ApiConfig.orders}?page=$page&limit=$limit',
          retry: false,
        ).timeout(_timeout);

        // Response is wrapped by _handleResponse: {success, data, statusCode}
        final serverData = response['data'] as Map<String, dynamic>?;

        if (serverData != null && serverData['success'] == true) {
          final orders = serverData['orders'] as List? ?? serverData['data'] as List? ?? [];
          return {
            'orders': orders.map((e) => Order.fromJson(e)).toList(),
            'total': serverData['total'] as int? ?? 0,
            'page': serverData['page'] as int? ?? 1,
            'pages': serverData['pages'] as int? ?? 1,
          };
        }
        return {'orders': <Order>[], 'total': 0, 'page': 1, 'pages': 1};
      } on TimeoutException {
        if (!retry || retryCount >= _maxRetries) return {'orders': <Order>[], 'total': 0, 'page': 1, 'pages': 1};
        retryCount++;
        await Future.delayed(Duration(seconds: retryCount));
      } catch (e) {
        final msg = e.toString().toLowerCase();
        if ((msg.contains('socket') || msg.contains('connection')) && retry && retryCount < _maxRetries) {
          retryCount++;
          await Future.delayed(Duration(seconds: retryCount));
        } else {
          return {'orders': <Order>[], 'total': 0, 'page': 1, 'pages': 1};
        }
      }
    }
    return {'orders': <Order>[], 'total': 0, 'page': 1, 'pages': 1};
  }

  static Future<Order?> getOrder(String id, {bool retry = true}) async {
    int retryCount = 0;

    while (retryCount <= _maxRetries) {
      try {
        final response = await ApiService.get(
          '${ApiConfig.orders}/$id',
          retry: false,
        ).timeout(_timeout);

        // Response is wrapped by _handleResponse: {success, data, statusCode}
        final serverData = response['data'] as Map<String, dynamic>?;

        if (serverData != null && serverData['success'] == true) {
          return Order.fromJson(serverData['order'] ?? serverData);
        }
        return null;
      } on TimeoutException {
        if (!retry || retryCount >= _maxRetries) return null;
        retryCount++;
        await Future.delayed(Duration(seconds: retryCount));
      } catch (e) {
        final msg = e.toString().toLowerCase();
        if ((msg.contains('socket') || msg.contains('connection')) && retry && retryCount < _maxRetries) {
          retryCount++;
          await Future.delayed(Duration(seconds: retryCount));
        } else {
          return null;
        }
      }
    }
    return null;
  }

  static Future<Map<String, dynamic>> cancelOrder(String orderId, {String? reason}) async {
    try {
      final body = <String, dynamic>{};
      if (reason != null && reason.isNotEmpty) {
        body['reason'] = reason;
      }
      final response = await ApiService.put(
        '${ApiConfig.orders}/$orderId/cancel',
        body: body,
      );
      return response;
    } catch (e) {
      return {'success': false, 'error': 'Network error: $e'};
    }
  }

  static Future<bool> reorder(String orderId) async {
    try {
      final response = await ApiService.post(
        '${ApiConfig.orders}/$orderId/reorder',
      );
      return response['success'] == true;
    } catch (e) {
      return false;
    }
  }

  static Future<List<DeliveryAddress>> getAddresses() async {
    try {
      final response = await ApiService.get(
        '${ApiConfig.orders}/addresses',
        retry: false,
      ).timeout(_timeout);

      // Response is wrapped by _handleResponse: {success, data, statusCode}
      // Server returns: {success, addresses: [...], error}
      final serverData = response['data'] as Map<String, dynamic>?;

      if (serverData != null && serverData['success'] == true) {
        final data = serverData['addresses'];
        if (data is List) {
          return data.map((e) => DeliveryAddress.fromJson(e)).toList();
        }
      }
      return [];
    } catch (e) {
      return [];
    }
  }

  static Future<Map<String, dynamic>> addAddress(DeliveryAddress address) async {
    try {
      final response = await ApiService.post(
        '${ApiConfig.orders}/addresses',
        body: address.toJson(),
      ).timeout(_timeout);

      // Response is wrapped by _handleResponse: {success, data, statusCode}
      // Server returns: {success, address, error}
      final serverData = response['data'] as Map<String, dynamic>?;

      if (serverData != null && serverData['success'] == true && serverData['address'] != null) {
        return {
          'success': true,
          'address': DeliveryAddress.fromJson(serverData['address']),
        };
      }

      return {
        'success': false,
        'error': serverData?['error'] ?? 'Failed to add address',
      };
    } catch (e) {
      return {'success': false, 'error': 'Failed to add address'};
    }
  }

  static Future<bool> updateAddress(String id, DeliveryAddress address) async {
    try {
      final response = await ApiService.put(
        '${ApiConfig.orders}/addresses/$id',
        body: address.toJson(),
      ).timeout(_timeout);

      // Response is wrapped by _handleResponse: {success, data, statusCode}
      final serverData = response['data'] as Map<String, dynamic>?;
      return serverData?['success'] == true;
    } catch (e) {
      return false;
    }
  }

  static Future<bool> deleteAddress(String id) async {
    try {
      final response = await ApiService.delete(
        '${ApiConfig.orders}/addresses/$id',
      );

      // Response is wrapped by _handleResponse: {success, data, statusCode}
      final serverData = response['data'] as Map<String, dynamic>?;
      return serverData?['success'] == true;
    } catch (e) {
      return false;
    }
  }

  static Future<Map<String, dynamic>> getDeliverySettings() async {
    try {
      final response = await ApiService.get(
        '${ApiConfig.orders}/delivery-settings',
        retry: false,
      ).timeout(_timeout);

      // Response is wrapped by _handleResponse: {success, data, statusCode}
      final serverData = response['data'] as Map<String, dynamic>?;

      if (serverData != null && serverData['success'] == true) {
        return (serverData['settings'] as Map<String, dynamic>?) ?? _defaultSettings;
      }
      return _defaultSettings;
    } catch (e) {
      return _defaultSettings;
    }
  }

  static const Map<String, dynamic> _defaultSettings = {
    'base_delivery_charge': '3',
    'free_delivery_threshold': '35',
    'same_day_delivery_charge': '2',
    'min_order_amount': '10',
  };

  static Future<List<DeliverySlot>> getDeliverySlots({String? date}) async {
    try {
      var url = '${ApiConfig.orders}/delivery-slots';
      if (date != null) url += '?date=$date';

      final response = await ApiService.get(
        url,
        retry: false,
      ).timeout(_timeout);

      // Response is wrapped by _handleResponse: {success, data, statusCode}
      final serverData = response['data'] as Map<String, dynamic>?;

      if (serverData != null && serverData['success'] == true) {
        final data = serverData['slots'];
        if (data is List) {
          return data.map((e) => DeliverySlot.fromJson(e)).toList();
        }
      }
      return _defaultSlots;
    } catch (e) {
      return _defaultSlots;
    }
  }

  static List<DeliverySlot> get _defaultSlots => [
        DeliverySlot(
          id: 'today_morning',
          slotName: 'Morning',
          slotType: 'morning',
          startTime: '09:00',
          endTime: '12:00',
        ),
        DeliverySlot(
          id: 'today_afternoon',
          slotName: 'Afternoon',
          slotType: 'afternoon',
          startTime: '12:00',
          endTime: '16:00',
        ),
        DeliverySlot(
          id: 'today_evening',
          slotName: 'Evening',
          slotType: 'evening',
          startTime: '16:00',
          endTime: '20:00',
        ),
      ];
}
