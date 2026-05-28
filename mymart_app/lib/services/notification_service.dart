import 'dart:async';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import '../services/api_service.dart';
import '../config/api_config.dart';

class NotificationService {
  static final FlutterLocalNotificationsPlugin _plugin = FlutterLocalNotificationsPlugin();
  static Timer? _pollTimer;
  static String? _lastNotificationId;
  static bool _initialized = false;

  static Future<void> initialize() async {
    if (_initialized) return;

    const androidSettings = AndroidInitializationSettings('@mipmap/ic_launcher');
    const iosSettings = DarwinInitializationSettings(
      requestAlertPermission: false,
      requestBadgePermission: false,
      requestSoundPermission: false,
    );
    const initSettings = InitializationSettings(
      android: androidSettings,
      iOS: iosSettings,
    );

    await _plugin.initialize(
      initSettings,
      onDidReceiveNotificationResponse: _onNotificationTap,
    );

    _initialized = true;
  }

  static void _onNotificationTap(NotificationResponse response) {
    // Notification tap handled via payload
  }

  static Future<void> showNotification({
    required int id,
    required String title,
    required String body,
    String? payload,
  }) async {
    const androidDetails = AndroidNotificationDetails(
      'order_updates',
      'Order Updates',
      channelDescription: 'Notifications about your orders and promotions',
      importance: Importance.high,
      priority: Priority.high,
    );
    const iosDetails = DarwinNotificationDetails();
    const details = NotificationDetails(
      android: androidDetails,
      iOS: iosDetails,
    );

    await _plugin.show(id, title, body, details, payload: payload);
  }

  static Future<void> showOrderNotification(String orderNumber, String status) async {
    await showNotification(
      id: DateTime.now().microsecondsSinceEpoch % 100000,
      title: 'Order #$orderNumber',
      body: 'Your order has been $status',
      payload: 'order_$orderNumber',
    );
  }

  static Future<void> showPromoNotification(String title, String message) async {
    await showNotification(
      id: DateTime.now().microsecondsSinceEpoch % 100000,
      title: title,
      body: message,
      payload: 'promotion',
    );
  }

  static void startPolling(String? authToken) {
    _pollTimer?.cancel();
    _pollTimer = Timer.periodic(const Duration(seconds: 60), (_) => _checkNotifications());
  }

  static void stopPolling() {
    _pollTimer?.cancel();
    _pollTimer = null;
  }

  static Future<void> _checkNotifications() async {
    try {
      final response = await ApiService.get(ApiConfig.notifications);
      if (response['success'] == true) {
        final data = response['data'];
        final List<dynamic> notifications;
        if (data is List) {
          notifications = data;
        } else if (data is Map && data['notifications'] is List) {
          notifications = data['notifications'];
        } else {
          return;
        }

        for (final notif in notifications) {
          final notifId = notif['id']?.toString() ?? '';
          if (notifId == _lastNotificationId) break;

          final type = notif['type'] ?? '';
          final title = notif['title'] ?? notif['message'] ?? 'Notification';
          final body = notif['body'] ?? notif['description'] ?? '';

          if (type == 'order' || type == 'order_update') {
            await showOrderNotification(
              notif['order_number']?.toString() ?? '',
              notif['status']?.toString() ?? 'updated',
            );
          } else if (type == 'promotion' || type == 'promo') {
            await showPromoNotification(title, body);
          } else {
            await showNotification(
              id: DateTime.now().microsecondsSinceEpoch % 100000,
              title: title,
              body: body,
            );
          }
        }

        if (notifications.isNotEmpty) {
          _lastNotificationId = notifications.first['id']?.toString();
        }
      }
    } catch (_) {}
  }

  static void dispose() {
    stopPolling();
  }
}
