import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

class NotificationProvider extends ChangeNotifier {
  bool _orderUpdates = true;
  bool _promotions = true;
  bool _wishlistAlerts = false;
  bool _priceDrops = false;

  bool get orderUpdates => _orderUpdates;
  bool get promotions => _promotions;
  bool get wishlistAlerts => _wishlistAlerts;
  bool get priceDrops => _priceDrops;

  Future<void> loadPreferences() async {
    final prefs = await SharedPreferences.getInstance();
    _orderUpdates = prefs.getBool('notif_order_updates') ?? true;
    _promotions = prefs.getBool('notif_promotions') ?? true;
    _wishlistAlerts = prefs.getBool('notif_wishlist') ?? false;
    _priceDrops = prefs.getBool('notif_price_drops') ?? false;
    notifyListeners();
  }

  Future<void> setOrderUpdates(bool v) async {
    _orderUpdates = v;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool('notif_order_updates', v);
    notifyListeners();
  }

  Future<void> setPromotions(bool v) async {
    _promotions = v;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool('notif_promotions', v);
    notifyListeners();
  }

  Future<void> setWishlistAlerts(bool v) async {
    _wishlistAlerts = v;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool('notif_wishlist', v);
    notifyListeners();
  }

  Future<void> setPriceDrops(bool v) async {
    _priceDrops = v;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool('notif_price_drops', v);
    notifyListeners();
  }
}
