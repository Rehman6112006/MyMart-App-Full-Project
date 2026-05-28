// Saved Card Service - Store card details securely for quick payments
// NOTE: We only store the last 4 digits and card brand, NOT the full card number or CVV
// Full card tokenization happens through Stripe

import 'package:shared_preferences/shared_preferences.dart';
import 'dart:convert';

class SavedCardService {
  static const String _savedCardsKey = 'saved_cards';
  static const String _defaultCardKey = 'default_card_id';

  // Card data structure (only stores non-sensitive info)
  // {
  //   "id": "card_abc123",
  //   "last4": "4242",
  //   "brand": "visa", // visa, mastercard, amex, etc.
  //   "expMonth": 12,
  //   "expYear": 2025,
  //   "stripePaymentMethodId": "pm_xxx" // Stripe's tokenized payment method
  // }

  // Get all saved cards
  static Future<List<Map<String, dynamic>>> getSavedCards() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final cardsJson = prefs.getString(_savedCardsKey);
      if (cardsJson == null) return [];
      
      final List<dynamic> cardsList = jsonDecode(cardsJson);
      return cardsList.cast<Map<String, dynamic>>();
    } catch (e) {
      return [];
    }
  }

  // Save a new card (after Stripe tokenization)
  static Future<bool> saveCard({
    required String stripePaymentMethodId,
    required String last4,
    required String brand,
    required int expMonth,
    required int expYear,
    bool setAsDefault = true,
  }) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final cards = await getSavedCards();
      
      // Check if card already exists
      final exists = cards.any((c) => c['last4'] == last4 && c['brand'] == brand);
      if (exists) {
        return false;
      }

      // Create new card entry
      final newCard = {
        'id': 'card_${DateTime.now().millisecondsSinceEpoch}',
        'stripePaymentMethodId': stripePaymentMethodId,
        'last4': last4,
        'brand': brand,
        'expMonth': expMonth,
        'expYear': expYear,
        'savedAt': DateTime.now().toIso8601String(),
      };

      cards.add(newCard);
      await prefs.setString(_savedCardsKey, jsonEncode(cards));

      // Set as default if requested or if it's the first card
      if (setAsDefault || cards.length == 1) {
        await setDefaultCard(newCard['id'] as String);
      }

      return true;
    } catch (e) {
      return false;
    }
  }

  // Get default card
  static Future<Map<String, dynamic>?> getDefaultCard() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final defaultCardId = prefs.getString(_defaultCardKey);
      
      if (defaultCardId == null) {
        final cards = await getSavedCards();
        return cards.isNotEmpty ? cards.first : null;
      }

      final cards = await getSavedCards();
      return cards.firstWhere(
        (c) => c['id'] == defaultCardId,
        orElse: () => cards.isNotEmpty ? cards.first : {},
      );
    } catch (e) {
      return null;
    }
  }

  // Set default card
  static Future<bool> setDefaultCard(String cardId) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_defaultCardKey, cardId);
      return true;
    } catch (e) {
      return false;
    }
  }

  // Delete a saved card
  static Future<bool> deleteCard(String cardId) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final cards = await getSavedCards();
      
      cards.removeWhere((c) => c['id'] == cardId);
      await prefs.setString(_savedCardsKey, jsonEncode(cards));

      // If deleted card was default, set a new default
      final defaultCardId = prefs.getString(_defaultCardKey);
      if (defaultCardId == cardId && cards.isNotEmpty) {
        await setDefaultCard(cards.first['id'] as String);
      }

      return true;
    } catch (e) {
      return false;
    }
  }

  // Clear all saved cards
  static Future<bool> clearAllCards() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove(_savedCardsKey);
      await prefs.remove(_defaultCardKey);
      return true;
    } catch (e) {
      return false;
    }
  }

  // Clear only fake/old saved cards (with pm_saved_ prefix or invalid IDs)
  static Future<bool> clearFakeCards() async {
    try {
      final cards = await getSavedCards();
      final realCards = cards.where((c) {
        final pmId = c['stripePaymentMethodId']?.toString() ?? '';
        // Keep only real Stripe PaymentMethod IDs (pm_xxx format)
        return pmId.startsWith('pm_') && !pmId.startsWith('pm_saved_');
      }).toList();
      
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_savedCardsKey, jsonEncode(realCards));
      return true;
    } catch (e) {
      return false;
    }
  }

  // Check if user has saved cards
  static Future<bool> hasSavedCards() async {
    final cards = await getSavedCards();
    return cards.isNotEmpty;
  }

  // Format card brand for display
  static String formatBrand(String brand) {
    switch (brand.toLowerCase()) {
      case 'visa':
        return 'Visa';
      case 'mastercard':
        return 'Mastercard';
      case 'amex':
        return 'American Express';
      case 'discover':
        return 'Discover';
      case 'jcb':
        return 'JCB';
      case 'diners':
        return 'Diners Club';
      default:
        return brand.toUpperCase();
    }
  }

  // Get card icon based on brand
  static String getCardIcon(String brand) {
    switch (brand.toLowerCase()) {
      case 'visa':
        return '💳'; // Visa logo
      case 'mastercard':
        return '💳'; // Mastercard logo
      default:
        return '💳';
    }
  }
}
