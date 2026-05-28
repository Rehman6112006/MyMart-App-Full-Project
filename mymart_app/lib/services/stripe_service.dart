import 'package:flutter/material.dart' show ThemeMode;
import 'package:flutter_stripe/flutter_stripe.dart';
import '../config/api_config.dart';
import 'api_service.dart';

class StripePaymentService {
  static bool _initialized = false;
  static String? _lastPaymentIntentId;
  static String? _lastPaymentMethodId;

  static Future<bool> initialize() async {
    if (_initialized) return true;
    
    try {
      Stripe.publishableKey = 'pk_test_51TVVc6DgFdnKsAnHylGdmpaIhlzOW5z6m0SBCMDeHqPVJiqo2kJurAZnYbqVoFqXeXBHvDyqqvdJGKOZDyp7OdBn00PTwFaVqt';
      await Stripe.instance.applySettings();
      _initialized = true;
      return true;
    } on UnsupportedError {
      _initialized = false;
      return false;
    } catch (e) {
      _initialized = false;
      return false;
    }
  }

  static bool get isStripeAvailable => _initialized;
  
  static void reset() {
    _initialized = false;
    _lastPaymentIntentId = null;
    _lastPaymentMethodId = null;
  }

  // Create a SetupIntent for saving card details
  static Future<Map<String, dynamic>> createSetupIntent() async {
    try {
      final response = await ApiService.post(ApiConfig.stripeSaveCard, body: {});
      final data = response['data'] ?? response;

      if (data['success'] == true && data['clientSecret'] != null) {
        return {
          'success': true,
          'clientSecret': data['clientSecret'],
        };
      }
      return {'success': false, 'error': data['error'] ?? 'Failed to create setup intent'};
    } catch (e) {
      return {'success': false, 'error': 'Network error: $e'};
    }
  }

  // Save card using SetupIntent (shows Stripe form once)
  static Future<Map<String, dynamic>> saveCard() async {
    try {
      final initResult = await initialize();
      if (!initResult) {
        return {'success': false, 'error': 'Card saving unavailable.'};
      }
      
      // Create setup intent from backend
      final setupResult = await createSetupIntent();
      if (!setupResult['success']) return setupResult;

      final clientSecret = setupResult['clientSecret'];

      // Initialize payment sheet for card saving
      await Stripe.instance.initPaymentSheet(
        paymentSheetParameters: SetupPaymentSheetParameters(
          paymentIntentClientSecret: clientSecret,
          merchantDisplayName: 'MyMart',
          style: ThemeMode.system,
        ),
      );

      // Present payment sheet (user enters card details once)
      await Stripe.instance.presentPaymentSheet();
      
      // After successful card save, we need to get the PaymentMethod
      // The SetupIntent's latestAttempt.payment_method contains the saved card
      // For now, we'll just return success and let _loadSavedCards refresh from backend
      // The backend's listPaymentMethods will return the newly saved card
      
      return {
        'success': true,
        'message': 'Card saved successfully!',
      };
    } on StripeException catch (e) {
      return {'success': false, 'error': e.error.localizedMessage ?? 'Failed to save card'};
    } catch (e) {
      return {'success': false, 'error': 'Failed to save card: $e'};
    }
  }

  // Get saved cards from backend
  static Future<List<Map<String, dynamic>>> getSavedCards() async {
    try {
      final response = await ApiService.get(ApiConfig.stripeCards);
      final data = response['data'] ?? response;

      if (data['success'] == true && data['cards'] != null) {
        return List<Map<String, dynamic>>.from(data['cards']);
      }
      return [];
    } catch (e) {
      return [];
    }
  }

  // Pay with saved card - NO Stripe form shown!
  static Future<Map<String, dynamic>> payWithSavedCard({
    required double amount,
    required String paymentMethodId,
    String? orderId,
  }) async {
    try {
      // Call backend to process payment with saved card
      final response = await ApiService.post(
        ApiConfig.stripeSavedCardPay,
        body: {
          'payment_method_id': paymentMethodId,
          'amount': amount,
          'order_id': orderId,
        },
      );

      final data = response['data'] ?? response;

      if (data['success'] == true) {
        _lastPaymentIntentId = data['payment_intent_id'];
        return {
          'success': true,
          'paymentIntentId': data['payment_intent_id'],
          'transactionId': data['transaction_id'],
          'status': data['status'],
          'message': data['message'] ?? 'Payment successful!',
        };
      }

      return {
        'success': false,
        'error': data['error'] ?? 'Payment failed',
      };
    } catch (e) {
      return {'success': false, 'error': 'Payment error: $e'};
    }
  }

  static Future<Map<String, dynamic>> createPaymentIntent({
    required double amount,
    String currency = 'usd',
  }) async {
    try {
      final response = await ApiService.post(
        ApiConfig.stripeCreateIntent,
        body: {'amount': amount, 'currency': currency},
      );

      final data = response['data'] ?? response;

      if (data['success'] == true && data['clientSecret'] != null) {
        _lastPaymentIntentId = data['paymentIntentId'];
        return {
          'success': true,
          'clientSecret': data['clientSecret'],
          'paymentIntentId': data['paymentIntentId'],
        };
      }
      return {'success': false, 'error': data['error'] ?? 'Failed to create payment intent'};
    } catch (e) {
      return {'success': false, 'error': 'Network error: $e'};
    }
  }

  static Future<Map<String, dynamic>> processPayment({
    required String clientSecret,
  }) async {
    try {
      // Initialize payment sheet
      await Stripe.instance.initPaymentSheet(
        paymentSheetParameters: SetupPaymentSheetParameters(
          paymentIntentClientSecret: clientSecret,
          merchantDisplayName: 'MyMart',
          style: ThemeMode.system,
        ),
      );

      
      // Present payment sheet (user will enter card details)
      await Stripe.instance.presentPaymentSheet();
      
      return {'success': true, 'message': 'Payment successful!'};
    } on StripeException catch (e) {
      return {'success': false, 'error': e.error.localizedMessage ?? 'Payment failed'};
    } on UnsupportedError {
      return {'success': false, 'error': 'Payment not supported on this platform. Please use Cash on Delivery.'};
    } catch (e) {
      // Check for platform-specific errors
      if (e.toString().contains('Platform._operatingSystem') || 
          e.toString().contains('Unsupported operation')) {
        return {'success': false, 'error': 'Card payment not supported. Please use Cash on Delivery.'};
      }
      String msg = e.toString().toLowerCase().contains('cancel') 
          ? 'Payment cancelled' 
          : 'Payment failed: $e';
      return {'success': false, 'error': msg};
    }
  }

  // Process payment with Stripe PaymentSheet (secure card entry + auto-save)
  static Future<Map<String, dynamic>> payWithCard({
    required double amount,
    String currency = 'usd',
  }) async {
    try {
      final initResult = await initialize();
      if (!initResult) {
        return {'success': false, 'error': 'Card payment unavailable. Please use Cash on Delivery.'};
      }

      // Create PaymentIntent with saveCard flag (backend sets setup_future_usage)
      final response = await ApiService.post(
        ApiConfig.stripeCreateIntent,
        body: {
          'amount': amount,
          'currency': currency,
          'save_card': true,
        },
      );

      final data = response['data'] ?? response;
      if (data['success'] != true) {
        return {'success': false, 'error': data['error'] ?? 'Failed to initialize payment'};
      }

      final clientSecret = data['clientSecret'];
      _lastPaymentIntentId = data['paymentIntentId'];


      // Show PaymentSheet with paymentIntentClientSecret (processes payment + saves card)
      await Stripe.instance.initPaymentSheet(
        paymentSheetParameters: SetupPaymentSheetParameters(
          paymentIntentClientSecret: clientSecret,
          merchantDisplayName: 'MyMart',
          style: ThemeMode.system,
        ),
      );

      await Stripe.instance.presentPaymentSheet();


      return {
        'success': true,
        'paymentIntentId': _lastPaymentIntentId,
        'message': 'Payment successful!',
      };

    } on StripeException catch (e) {
      if (e.error.localizedMessage?.toLowerCase().contains('cancel') == true) {
        return {'success': false, 'error': 'Payment cancelled'};
      }
      return {'success': false, 'error': e.error.localizedMessage ?? 'Payment failed'};

    } catch (e) {
      if (e.toString().contains('Platform._operatingSystem') || 
          e.toString().contains('Unsupported operation')) {
        return {'success': false, 'error': 'Card payment not supported. Please use Cash on Delivery.'};
      }
      return {'success': false, 'error': 'Payment error: $e'};
    }
  }
  
  
  
  // Delete saved card from backend (and Stripe)
  static Future<Map<String, dynamic>> deleteSavedCard(String cardId) async {
    try {
      final response = await ApiService.delete(
        '${ApiConfig.stripeDeleteCard}/$cardId',
      );
      
      final data = response['data'] ?? response;
      
      if (data['success'] == true) {
        return {
          'success': true,
          'message': 'Card deleted successfully',
        };
      }
      
      return {
        'success': false,
        'error': data['error'] ?? 'Failed to delete card',
      };
    } catch (e) {
      return {'success': false, 'error': 'Delete error: $e'};
    }
  }

  static String? get lastPaymentIntentId => _lastPaymentIntentId;
  static String? get lastPaymentMethodId => _lastPaymentMethodId;
}