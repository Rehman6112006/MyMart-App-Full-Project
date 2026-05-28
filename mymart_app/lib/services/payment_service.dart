import '../services/api_service.dart';

class PaymentResult {
  final bool success;
  final String? transactionId;
  final String? error;
  final Map<String, dynamic>? paymentDetails;

  PaymentResult._({
    required this.success,
    this.transactionId,
    this.error,
    this.paymentDetails,
  });

  factory PaymentResult.success(String transactionId, {Map<String, dynamic>? details}) {
    return PaymentResult._(
      success: true,
      transactionId: transactionId,
      paymentDetails: details,
    );
  }

  factory PaymentResult.failure(String error) {
    return PaymentResult._(success: false, error: error);
  }
}

class PaymentService {
  // Get payment methods
  static Future<List<Map<String, dynamic>>> getPaymentMethods() async {
    try {
      final response = await ApiService.get('/api/payment-methods', retry: false);
      if (response['success'] == true) {
        final methods = response['data'] ?? response['methods'] ?? [];
        return List<Map<String, dynamic>>.from(methods);
      }
      return _defaultPaymentMethods;
    } catch (e) {
      return _defaultPaymentMethods;
    }
  }

  static List<Map<String, dynamic>> get _defaultPaymentMethods => [
    {
      'id': 'cod',
      'name': 'Cash on Delivery',
      'icon': 'money',
      'description': 'Pay when you receive your order',
      'enabled': true,
    },
    {
      'id': 'stripe',
      'name': 'Credit/Debit Card (Stripe)',
      'icon': 'credit_card',
      'description': 'Pay securely with your card via Stripe',
      'enabled': true,
    },
  ];

  // Process UPI payment
  static Future<PaymentResult> processUpiPayment({
    required String upiId,
    required double amount,
    required String orderId,
  }) async {
    try {
      final response = await ApiService.post('/api/payments/upi', body: {
        'upi_id': upiId,
        'amount': amount,
        'order_id': orderId,
      });

      if (response['success'] == true) {
        return PaymentResult.success(
          response['transaction_id'] ?? '',
          details: response,
        );
      }
      return PaymentResult.failure(response['message'] ?? 'UPI payment failed');
    } catch (e) {
      return PaymentResult.failure('Payment error: $e');
    }
  }

  // Process Card payment (Stripe)
  static Future<PaymentResult> processCardPayment({
    required String cardNumber,
    required String expiry,
    required String cvv,
    required String name,
    required double amount,
    required String orderId,
  }) async {
    try {
      // In production, use Stripe.js for tokenization
      // This is a simulation for demo purposes
      final response = await ApiService.post('/api/payments/stripe', body: {
        'card_number': cardNumber,
        'expiry': expiry,
        'cvv': cvv,
        'name': name,
        'amount': amount,
        'order_id': orderId,
      });

      if (response['success'] == true) {
        return PaymentResult.success(
          response['transaction_id'] ?? response['payment_intent_id'] ?? '',
          details: response,
        );
      }
      return PaymentResult.failure(response['message'] ?? 'Payment failed');
    } catch (e) {
      return PaymentResult.failure('Payment error: $e');
    }
  }

  // Process Net Banking payment
  static Future<PaymentResult> processNetBankingPayment({
    required String bankId,
    required double amount,
    required String orderId,
  }) async {
    try {
      final response = await ApiService.post('/api/payments/stripe', body: {
        'bank_transfer': true,
        'bank_id': bankId,
        'amount': amount,
        'order_id': orderId,
      });

      if (response['success'] == true) {
        return PaymentResult.success(
          response['transaction_id'] ?? '',
          details: response,
        );
      }
      return PaymentResult.failure(response['message'] ?? 'Net banking payment failed');
    } catch (e) {
      return PaymentResult.failure('Payment error: $e');
    }
  }

  // Verify payment status
  static Future<bool> verifyPayment(String transactionId) async {
    try {
      final response = await ApiService.get(
        '/api/payments/verify/$transactionId',
        retry: false,
      );
      return response['success'] == true && response['verified'] == true;
    } catch (e) {
      return false;
    }
  }

  // Get transaction status
  static Future<Map<String, dynamic>?> getTransactionStatus(String transactionId) async {
    try {
      final response = await ApiService.get(
        '/api/payments/status/$transactionId',
        retry: false,
      );
      if (response['success'] == true) {
        return response['data'] ?? response;
      }
      return null;
    } catch (e) {
      return null;
    }
  }

  // List of banks for payment (International)
  static List<Map<String, String>> get netBankingBanks => [
    {'id': 'chase', 'name': 'Chase Bank'},
    {'id': 'bofa', 'name': 'Bank of America'},
    {'id': 'wells', 'name': 'Wells Fargo'},
    {'id': 'citi', 'name': 'Citibank'},
    {'id': 'hsbc', 'name': 'HSBC'},
    {'id': 'barclays', 'name': 'Barclays'},
    {'id': 'lloyds', 'name': 'Lloyds Bank'},
    {'id': 'natwest', 'name': 'NatWest'},
    {'id': 'santander', 'name': 'Santander'},
    {'id': 'other', 'name': 'Other Bank'},
  ];
}
