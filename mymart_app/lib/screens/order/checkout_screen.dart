import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../config/theme.dart';
import '../../providers/cart_provider.dart';
import '../../providers/address_provider.dart';
import '../../models/order.dart';
import '../../services/order_service.dart';
import '../../services/stripe_service.dart';
import '../../services/location_service.dart';
import '../../services/coupon_service.dart';
import '../../localization/app_localizations.dart';
import '../../widgets/shimmer_loaders.dart';
import '../../widgets/checkout/delivery_time_picker.dart';
import '../../widgets/checkout/coupon_section.dart';
import '../../widgets/checkout/order_summary.dart';
import '../location/location_sheet.dart';
import 'order_confirmed_screen.dart';

class CheckoutScreen extends StatefulWidget {
  final double totalAmount;
  final bool quickAdd;

  const CheckoutScreen({
    super.key,
    required this.totalAmount,
    this.quickAdd = false,
  });

  @override
  State<CheckoutScreen> createState() => _CheckoutScreenState();
}

class _CheckoutScreenState extends State<CheckoutScreen> {
  String Function(String) get t => AppLocalizations.of(context).translate;
  String _selectedPayment = 'cod';
  bool _isLoading = false;
  String? _error;
  String? _processingMessage;
  bool _isFetchingLocation = false;
  DeliveryAddress? _deliveryAddress;
  DeliverySlot _selectedSlot = DeliverySlot(id: 'today_morning', slotName: 'Morning', slotType: 'morning', startTime: '09:00', endTime: '12:00');
  
  List<DeliverySlot> _deliverySlots = [
    DeliverySlot(id: 'today_morning', slotName: 'Morning', slotType: 'morning', startTime: '09:00', endTime: '12:00'),
    DeliverySlot(id: 'today_afternoon', slotName: 'Afternoon', slotType: 'afternoon', startTime: '12:00', endTime: '16:00'),
    DeliverySlot(id: 'today_evening', slotName: 'Evening', slotType: 'evening', startTime: '16:00', endTime: '20:00'),
  ];
  Map<String, dynamic> _deliverySettings = {};

  String? _appliedCoupon;
  double _couponDiscount = 0;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    await Future.wait([
      _detectLocation(),
      _loadDeliverySettings(),
      _loadDeliverySlots(),
    ]);
  }

  Future<void> _detectLocation() async {
    final t = AppLocalizations.of(context).translate;
    setState(() => _isFetchingLocation = true);
    try {
      final result = await LocationService.getCurrentLocation();
      if (!mounted) return;
      if (result['success'] == true) {
        final addressStr = result['address'] as String? ?? '';
        final lat = result['latitude'];
        final lng = result['longitude'];
        setState(() {
          _deliveryAddress = DeliveryAddress(
            id: '__current_location__',
            name: t('location'),
            phone: '',
            addressLine1: addressStr,
            city: addressStr.contains(',') ? addressStr.split(',').last.trim() : addressStr,
            landmark: 'GPS: ${lat?.toStringAsFixed(4) ?? ''}, ${lng?.toStringAsFixed(4) ?? ''}',
          );
          _isFetchingLocation = false;
        });
      } else {
        setState(() => _isFetchingLocation = false);
      }
    } catch (e) {
      if (mounted) setState(() => _isFetchingLocation = false);
    }
  }

  Future<void> _showLocationSheet() async {
    await showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => LocationSheet(
        currentAddress: _deliveryAddress?.addressLine1,
        currentLatitude: null,
        currentLongitude: null,
        onLocationSelected: (address, lat, lng) {
          if (!mounted) return;
          setState(() {
            _deliveryAddress = DeliveryAddress(
              id: '__current_location__',
              name: t('location'),
              phone: '',
              addressLine1: address,
              city: address.contains(',') ? address.split(',').last.trim() : address,
              landmark: lat != 0 ? 'GPS: ${lat.toStringAsFixed(4)}, ${lng.toStringAsFixed(4)}' : null,
            );
          });
        },
      ),
    );
  }

  Future<void> _loadDeliverySettings() async {
    final settings = await OrderService.getDeliverySettings();
    if (mounted) {
      setState(() {
        _deliverySettings = settings;
      });
    }
  }

  Future<void> _loadDeliverySlots() async {
    final slots = await OrderService.getDeliverySlots();
    if (mounted) {
      setState(() {
        _deliverySlots = slots;
        if (slots.isNotEmpty) {
          _selectedSlot = slots.first;
        }
      });
    }
  }

  @override
  void dispose() {
    super.dispose();
  }

  double get _deliveryCharge {
    final subtotal = widget.totalAmount;
    final freeThreshold = double.tryParse(_deliverySettings['free_delivery_threshold']?.toString() ?? '35') ?? 35;
    final baseCharge = double.tryParse(_deliverySettings['base_delivery_charge']?.toString() ?? '3') ?? 3;
    
    if (subtotal >= freeThreshold) return 0;
    return baseCharge;
  }

  double get _subtotal => widget.totalAmount;
  double get _couponSavings => _couponDiscount.clamp(0, _subtotal);
  double get _total => _subtotal + _deliveryCharge - _couponSavings;

  Future<void> _createOrders({required String paymentMethod}) async {
    final t = AppLocalizations.of(context).translate;
    try {
      final cart = Provider.of<CartProvider>(context, listen: false);
      final storeGroups = cart.itemsByStore;
      List<Map<String, dynamic>> orderResults = [];
      bool hasError = false;
      String? errorMsg;

      for (var storeId in storeGroups.keys) {
        final storeItems = storeGroups[storeId]!;
        final storeName = storeItems.first.storeName ?? 'Store';

        final result = await OrderService.createOrder(
          deliveryAddressId: _deliveryAddress!.id,
          deliverySlotId: _selectedSlot.id,
          deliveryNotes: null,
          paymentMethod: paymentMethod,
          storeId: storeId,
          storeName: storeName,
          couponCode: _appliedCoupon,
        );

        if (result.success && result.order != null) {
          orderResults.add({
            'success': true,
            'orderId': result.order!.id,
            'orderNumber': result.order!.orderNumber,
            'totalAmount': result.order!.totalAmount,
            'storeName': storeName,
          });
        } else {
          hasError = true;
          errorMsg = result.error ?? t('order_failed');
          break;
        }
      }

      if (!mounted) return;

      if (!hasError && orderResults.isNotEmpty) {
        if (!widget.quickAdd) { await cart.loadCart(); }
        if (!mounted) return;
        final firstOrder = orderResults.first;
        setState(() => _processingMessage = null);
        Navigator.pushReplacement(context, MaterialPageRoute(builder: (_) => OrderConfirmedScreen(
          orderId: firstOrder['orderId'],
          orderNumber: firstOrder['orderNumber'],
          totalAmount: firstOrder['totalAmount'],
          paymentMethod: paymentMethod,
          isMultiOrder: orderResults.length > 1,
        )));
      } else {
        setState(() { _error = errorMsg ?? t('order_failed'); _isLoading = false; });
      }
    } catch (e) {
      if (mounted) setState(() { _processingMessage = null; _error = t('network_error'); _isLoading = false; });
    }
  }

  Future<void> _placeOrder() async {
    final t = AppLocalizations.of(context).translate;
    if (_deliveryAddress == null) {
      setState(() { _error = 'Unable to detect your location. Please try again.'; });
      return;
    }

    // Save current location as a real address before placing order
    if (_deliveryAddress!.id == '__current_location__') {
      setState(() => _error = null);
      final addressProvider = Provider.of<AddressProvider>(context, listen: false);
      final saved = await addressProvider.addAddress(_deliveryAddress!);
      if (saved && mounted) {
        final addresses = addressProvider.addresses;
        setState(() { _deliveryAddress = addresses.isNotEmpty ? addresses.last : _deliveryAddress; });
      } else if (mounted) {
        setState(() { _error = 'Failed to save your location. Please try again.'; });
        return;
      }
    }

    setState(() { _isLoading = true; _error = null; });

    try {
      if (_selectedPayment == 'stripe') {
        setState(() { _isLoading = false; });
        if (!mounted) return;
        showModalBottomSheet(
          context: context,
          isScrollControlled: true,
          backgroundColor: Colors.transparent,
          builder: (ctx) => _CardPaymentBottomSheet(
            totalAmount: _total,
            onPaymentComplete: (result) {
              if (result['success'] == true) {
                setState(() => _processingMessage = t('processing'));
                _createOrders(paymentMethod: 'card');
              } else {
                if (mounted) {
                  setState(() { _error = result['error'] ?? t('payment_failed'); });
                }
              }
            },
          ),
        );
        return;
      }

      setState(() => _processingMessage = t('processing'));
      await _createOrders(paymentMethod: 'cod');
    } catch (e) {
      setState(() { _error = t('network_error'); _isLoading = false; });
    }
  }

  @override
  Widget build(BuildContext context) {
    final t = AppLocalizations.of(context).translate;
    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        backgroundColor: AppTheme.surface,
        elevation: 0,
        leading: IconButton(icon: Container(padding: const EdgeInsets.all(8), decoration: BoxDecoration(color: AppTheme.background, shape: BoxShape.circle), child: const Icon(Icons.arrow_back_ios_new, size: 18, color: AppTheme.textPrimary)), onPressed: () => Navigator.pop(context)),
        title: Text(t('checkout'), style: GoogleFonts.poppins(color: AppTheme.textPrimary, fontSize: 18, fontWeight: FontWeight.w700)),
        centerTitle: true,
      ),
      body: Stack(
        children: [
          Column(
            children: [
              Expanded(
                child: SingleChildScrollView(
                  padding: const EdgeInsets.all(20),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      if (_error != null) _buildErrorBanner(),
                      _buildDeliveryAddressSection(),
                      const SizedBox(height: 20),
                      _buildDeliveryTimeDropdown(),
                      const SizedBox(height: 20),
                      _buildPaymentSection(),
                      const SizedBox(height: 20),
                      _buildCouponSection(),
                      const SizedBox(height: 20),
                      _buildOrderSummary(),
                    ],
                  ),
                ),
              ),
              _buildBottomBar(),
            ],
          ),
          if (_processingMessage != null) _buildProcessingOverlay(),
        ],
      ),
    );
  }

  Widget _buildErrorBanner() {
    return Container(
      padding: const EdgeInsets.all(12),
      margin: const EdgeInsets.only(bottom: 16),
      decoration: BoxDecoration(
        color: Colors.red.shade50,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: Colors.red.shade200),
      ),
      child: Row(
        children: [
          Icon(Icons.error_outline, color: Colors.red.shade700, size: 20),
          const SizedBox(width: 8),
          Expanded(child: Text(_error!, style: GoogleFonts.poppins(color: Colors.red.shade700, fontSize: 13))),
        ],
      ),
    );
  }

  Widget _buildDeliveryAddressSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(children: [const Icon(Icons.location_on, color: AppTheme.primary, size: 22), const SizedBox(width: 8), Text(t('location'), style: GoogleFonts.poppins(fontSize: 16, fontWeight: FontWeight.w700, color: AppTheme.textPrimary))]),
        const SizedBox(height: 4),
        Text('We will deliver to your detected location', style: GoogleFonts.poppins(fontSize: 11, color: AppTheme.textSecondary)),
        const SizedBox(height: 10),
        GestureDetector(
          onTap: _isFetchingLocation ? null : _showLocationSheet,
          child: Container(
            width: double.infinity,
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AppTheme.primaryExtraLight,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: AppTheme.primary, width: 1.5),
              boxShadow: [BoxShadow(color: AppTheme.cardShadow, blurRadius: 10, offset: const Offset(0, 4))],
            ),
            child: _isFetchingLocation
                ? const ShimmerAddressCard()
                : _deliveryAddress != null
                    ? Row(
                        children: [
                          Container(padding: const EdgeInsets.all(10), decoration: BoxDecoration(color: AppTheme.primary, shape: BoxShape.circle), child: const Icon(Icons.my_location, color: Colors.white, size: 20)),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    Text(t('deliver_here'), style: GoogleFonts.poppins(fontWeight: FontWeight.w600, fontSize: 13)),
                                    const SizedBox(width: 8),
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                      decoration: BoxDecoration(
                                        color: AppTheme.primary.withValues(alpha: 0.15),
                                        borderRadius: BorderRadius.circular(8),
                                      ),
                                      child: Text('Change', style: GoogleFonts.poppins(fontSize: 10, color: AppTheme.primary, fontWeight: FontWeight.w600)),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 2),
                                Text(_deliveryAddress!.addressLine1, style: GoogleFonts.poppins(fontSize: 12, color: AppTheme.textSecondary), maxLines: 2, overflow: TextOverflow.ellipsis),
                                if (_deliveryAddress!.landmark != null && _deliveryAddress!.landmark!.isNotEmpty)
                                  Text(_deliveryAddress!.landmark!, style: GoogleFonts.poppins(fontSize: 10, color: AppTheme.primary, fontWeight: FontWeight.w500)),
                              ],
                            ),
                          ),
                          const Icon(Icons.chevron_right, color: AppTheme.primary, size: 22),
                        ],
                      )
                    : Padding(
                        padding: const EdgeInsets.symmetric(vertical: 8),
                        child: Center(
                          child: TextButton.icon(
                            onPressed: _showLocationSheet,
                            icon: const Icon(Icons.my_location, color: AppTheme.primary),
                            label: Text(t('detect_location'), style: GoogleFonts.poppins(color: AppTheme.primary, fontWeight: FontWeight.w600)),
                          ),
                        ),
                      ),
          ),
        ),
      ],
    );
  }

  Widget _buildDeliveryTimeDropdown() {
    return DeliveryTimePicker(
      selectedSlot: _selectedSlot,
      slots: _deliverySlots,
      translate: t,
      onSlotSelected: (slot) => setState(() => _selectedSlot = slot),
    );
  }

  Widget _buildPaymentSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(children: [const Icon(Icons.payment, color: AppTheme.primary, size: 22), const SizedBox(width: 8), Text(t('payment_method'), style: GoogleFonts.poppins(fontSize: 16, fontWeight: FontWeight.w700, color: AppTheme.textPrimary))]),
        const SizedBox(height: 12),
        Container(
          decoration: BoxDecoration(color: AppTheme.surface, borderRadius: BorderRadius.circular(16), boxShadow: [BoxShadow(color: AppTheme.cardShadow, blurRadius: 10, offset: const Offset(0, 4))]),
          child: Column(
            children: [
              _buildPaymentOption('cod', t('cash_on_delivery'), Icons.money, t('pay_when_receive')),
              const Divider(height: 1),
              _buildPaymentOption('stripe', t('credit_debit_card'), Icons.credit_card, t('pay_secure_stripe')),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildPaymentOption(String value, String title, IconData icon, String subtitle) {
    final isSelected = _selectedPayment == value;
    return GestureDetector(
      onTap: () => setState(() => _selectedPayment = value),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(color: isSelected ? AppTheme.primaryExtraLight : Colors.transparent, borderRadius: BorderRadius.circular(16)),
        child: Row(
          children: [
            Container(padding: const EdgeInsets.all(10), decoration: BoxDecoration(color: isSelected ? AppTheme.primary : AppTheme.background, shape: BoxShape.circle), child: Icon(icon, color: isSelected ? Colors.white : AppTheme.textLight, size: 20)),
            const SizedBox(width: 12),
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(title, style: GoogleFonts.poppins(fontWeight: FontWeight.w600)),
              Text(subtitle, style: GoogleFonts.poppins(fontSize: 11, color: AppTheme.textSecondary)),
            ])),
            Container(width: 24, height: 24, decoration: BoxDecoration(shape: BoxShape.circle, color: isSelected ? AppTheme.primary : AppTheme.background, border: Border.all(color: isSelected ? AppTheme.primary : AppTheme.divider, width: 2)), child: isSelected ? const Icon(Icons.check, color: Colors.white, size: 14) : null),
          ],
        ),
      ),
    );
  }

  Future<void> _applyCoupon(String code) async {
    setState(() => _couponDiscount = 0);
    try {
      final result = await CouponService.validateCoupon(code, subtotal: _subtotal);
      if (result['success'] == true && result['data'] is Map) {
        final data = result['data'] as Map;
        if (data['success'] == true) {
          final d = double.tryParse((data['coupon']?['discountAmount'] ?? '0').toString()) ?? 0;
          setState(() { _appliedCoupon = code; _couponDiscount = d; _error = null; });
          return;
        }
      }
      setState(() {
        _appliedCoupon = null;
        _couponDiscount = 0;
        _error = result['message'] ?? 'Invalid coupon';
      });
    } catch (e) {
      setState(() { _couponDiscount = 0; _error = 'Failed to validate coupon'; });
    }
  }

  void _showCouponDialog() {
    final ctrl = TextEditingController(text: _appliedCoupon ?? '');
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text('Coupon Code', style: GoogleFonts.poppins(fontWeight: FontWeight.w700)),
        content: TextField(
          controller: ctrl,
          decoration: const InputDecoration(hintText: 'Enter code', border: OutlineInputBorder()),
          textCapitalization: TextCapitalization.characters,
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          if (_appliedCoupon != null) TextButton(
            onPressed: () { Navigator.pop(ctx); setState(() { _appliedCoupon = null; _couponDiscount = 0; }); },
            child: Text('Remove', style: GoogleFonts.poppins(color: AppTheme.sale)),
          ),
          ElevatedButton(
            onPressed: () { final code = ctrl.text.trim(); Navigator.pop(ctx); if (code.isNotEmpty) _applyCoupon(code); },
            child: const Text('Apply'),
          ),
        ],
      ),
    );
  }

  Widget _buildCouponSection() {
    return CouponSection(
      appliedCoupon: _appliedCoupon,
      couponDiscount: _couponDiscount,
      onTap: _showCouponDialog,
    );
  }

  Widget _buildOrderSummary() {
    return OrderSummary(
      subtotal: _subtotal,
      deliveryCharge: _deliveryCharge,
      couponDiscount: _couponDiscount,
      appliedCoupon: _appliedCoupon,
      total: _total,
      translate: t,
    );
  }

  Widget _buildBottomBar() {
    String btnText = _selectedPayment == 'cod' ? '${t('place_order')} • \$${_total.toStringAsFixed(2)}' : '${t('pay_with_card')} • \$${_total.toStringAsFixed(2)}';
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(color: AppTheme.surface, boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.08), blurRadius: 20, offset: const Offset(0, -4))]),
      child: SafeArea(
        child: SizedBox(
          width: double.infinity, height: 56,
          child: ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AppTheme.primary, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(28)), elevation: 3, shadowColor: AppTheme.primary.withValues(alpha: 0.3)),
            onPressed: _isLoading ? null : _placeOrder,
            child: _isLoading
                ? ButtonLoader(text: t('processing'))
                : Row(mainAxisAlignment: MainAxisAlignment.center, children: [Icon(_selectedPayment == 'stripe' ? Icons.credit_card : Icons.shopping_bag_outlined, color: Colors.white), const SizedBox(width: 8), Text(btnText, style: GoogleFonts.poppins(fontSize: 16, fontWeight: FontWeight.w600, color: Colors.white))]),
          ),
        ),
      ),
    );
  }

  Widget _buildProcessingOverlay() {
    return Container(
      color: Colors.black45,
      child: Center(
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 28),
          margin: const EdgeInsets.symmetric(horizontal: 48),
          decoration: BoxDecoration(
            color: AppTheme.surface,
            borderRadius: BorderRadius.circular(AppTheme.radiusXl),
            boxShadow: AppTheme.cardShadowMedium,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              SizedBox(
                width: 48, height: 48,
                child: CircularProgressIndicator(
                  strokeWidth: 3,
                  valueColor: AlwaysStoppedAnimation<Color>(AppTheme.primary),
                ),
              ),
              const SizedBox(height: 16),
              Text(
                _processingMessage ?? t('processing'),
                style: GoogleFonts.poppins(fontSize: 15, fontWeight: FontWeight.w600, color: AppTheme.textPrimary),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 4),
              Text(
                t('please_wait'),
                style: GoogleFonts.poppins(fontSize: 12, color: AppTheme.textSecondary),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _CardPaymentBottomSheet extends StatefulWidget {
  final double totalAmount;
  final Function(Map<String, dynamic>) onPaymentComplete;

  const _CardPaymentBottomSheet({
    required this.totalAmount,
    required this.onPaymentComplete,
  });

  @override
  State<_CardPaymentBottomSheet> createState() => _CardPaymentBottomSheetState();
}

class _CardPaymentBottomSheetState extends State<_CardPaymentBottomSheet> {
  String Function(String) get t => AppLocalizations.of(context).translate;
  String? _selectedCardId;
  String? _errorMessage;
  bool _isProcessing = false;
  bool _loadingCards = true;
  List<Map<String, dynamic>> _savedCards = [];

  @override
  void initState() {
    super.initState();
    _loadSavedCards();
  }

  Future<void> _loadSavedCards() async {
    setState(() { _loadingCards = true; });
    try {
      final cards = await StripePaymentService.getSavedCards();
      if (mounted) {
        setState(() {
          _savedCards = cards;
          _loadingCards = false;
          if (cards.isNotEmpty) {
            _selectedCardId = cards.first['id']?.toString();
          }
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() { _loadingCards = false; });
      }
    }
  }

  Future<void> _deleteSavedCard(String cardId) async {
    final result = await StripePaymentService.deleteSavedCard(cardId);
    if (result['success'] == true) {
      await _loadSavedCards();
    } else {
      if (mounted) {
        setState(() { _errorMessage = result['error'] ?? 'Failed to delete card'; });
      }
    }
  }

  String _formatCardBrand(String brand) {
    switch (brand.toLowerCase()) {
      case 'visa': return 'Visa';
      case 'mastercard': return 'Mastercard';
      case 'amex': return 'American Express';
      case 'discover': return 'Discover';
      default: return brand.toUpperCase();
    }
  }

  Future<void> _payWithSavedCard() async {
    final t = AppLocalizations.of(context).translate;
    if (_selectedCardId == null) {
      setState(() { _errorMessage = 'Please select a card'; });
      return;
    }

    setState(() { _isProcessing = true; _errorMessage = null; });

    try {
      final savedCard = _savedCards.firstWhere(
        (c) => c['id']?.toString() == _selectedCardId,
      );
      final paymentMethodId = savedCard['stripePaymentMethodId'] ?? savedCard['stripe_payment_method_id'] ?? _selectedCardId;

      final result = await StripePaymentService.payWithSavedCard(
        amount: widget.totalAmount,
        paymentMethodId: paymentMethodId!,
      );

      if (!mounted) return;

      if (result['success'] == true) {
        widget.onPaymentComplete({
          'success': true,
          'paymentIntentId': result['paymentIntentId'],
          'transactionId': result['transactionId'],
          'message': result['message'] ?? t('payment_successful'),
        });
        Navigator.pop(context);
      } else {
        setState(() {
          _errorMessage = result['error'] ?? t('payment_failed');
          _isProcessing = false;
        });
      }
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _errorMessage = 'Payment error: $e';
        _isProcessing = false;
      });
    }
  }

  Future<void> _addNewCardAndPay() async {
    final t = AppLocalizations.of(context).translate;
    setState(() { _isProcessing = true; _errorMessage = null; });

    try {
      final result = await StripePaymentService.payWithCard(
        amount: widget.totalAmount,
      );

      if (!mounted) return;

      if (result['success'] == true) {
        widget.onPaymentComplete({
          'success': true,
          'paymentIntentId': result['paymentIntentId'],
          'message': result['message'] ?? t('payment_successful'),
        });
        Navigator.pop(context);
      } else {
        setState(() {
          _errorMessage = result['error'] ?? t('payment_failed');
          _isProcessing = false;
        });
      }
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _errorMessage = 'Payment error: $e';
        _isProcessing = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final t = AppLocalizations.of(context).translate;
    return Container(
      padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
      decoration: const BoxDecoration(
        color: AppTheme.surface,
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(
              child: Container(
                width: 36, height: 4,
                decoration: BoxDecoration(
                  color: AppTheme.divider,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            const SizedBox(height: 16),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(t('pay_with_card'), style: GoogleFonts.poppins(fontSize: 16, fontWeight: FontWeight.w700, color: AppTheme.textPrimary)),
                IconButton(
                  icon: const Icon(Icons.close, color: AppTheme.textSecondary, size: 20),
                  onPressed: () => Navigator.pop(context),
                ),
              ],
            ),
            Text('\$${widget.totalAmount.toStringAsFixed(2)}', style: GoogleFonts.poppins(fontSize: 24, fontWeight: FontWeight.w800, color: AppTheme.primary)),
            const SizedBox(height: 16),
            if (_errorMessage != null)
              Container(
                padding: const EdgeInsets.all(10),
                margin: const EdgeInsets.only(bottom: 12),
                decoration: BoxDecoration(
                  color: AppTheme.saleLight,
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: AppTheme.sale.withValues(alpha: 0.3)),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.error_outline, color: AppTheme.sale, size: 16),
                    const SizedBox(width: 6),
                    Expanded(child: Text(_errorMessage!, style: GoogleFonts.poppins(color: AppTheme.sale, fontSize: 12))),
                  ],
                ),
              ),
            if (_loadingCards) const ShimmerPaymentCards(),
            if (!_loadingCards && _savedCards.isNotEmpty) ...[
              Text(t('payment_methods'), style: GoogleFonts.poppins(fontSize: 14, fontWeight: FontWeight.w600, color: AppTheme.textPrimary)),
              const SizedBox(height: 8),
              ..._savedCards.map((card) => _buildCardItem(card)),
              const SizedBox(height: 14),
              SizedBox(
                width: double.infinity, height: 46,
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppTheme.primary,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    elevation: 2,
                  ),
                  onPressed: _isProcessing ? null : _payWithSavedCard,
                  child: _isProcessing
                      ? ButtonLoader(text: t('processing'), fontSize: 14)
                      : Text('Pay \$${widget.totalAmount.toStringAsFixed(2)}', style: GoogleFonts.poppins(fontSize: 14, fontWeight: FontWeight.w600, color: Colors.white)),
                ),
              ),
              const SizedBox(height: 8),
              Center(
                child: TextButton.icon(
                  icon: Icon(Icons.add_circle_outline, color: AppTheme.primary, size: 16),
                  label: Text('Pay with a different card', style: GoogleFonts.poppins(color: AppTheme.primary, fontWeight: FontWeight.w600, fontSize: 12)),
                  onPressed: _isProcessing ? null : _addNewCardAndPay,
                ),
              ),
            ],
            if (!_loadingCards && _savedCards.isEmpty) ...[
              Center(
                child: Column(
                  children: [
                    const SizedBox(height: 12),
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(color: AppTheme.background, shape: BoxShape.circle),
                      child: const Icon(Icons.credit_card_outlined, size: 36, color: AppTheme.textLight),
                    ),
                    const SizedBox(height: 12),
                    Text(t('no_saved_cards'), style: GoogleFonts.poppins(fontSize: 14, color: AppTheme.textSecondary)),
                    const SizedBox(height: 4),
                    Text(t('add_card'), style: GoogleFonts.poppins(fontSize: 12, color: AppTheme.textLight)),
                    const SizedBox(height: 16),
                    SizedBox(
                      width: double.infinity, height: 46,
                      child: ElevatedButton.icon(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppTheme.primary,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          elevation: 2,
                        ),
                        icon: const Icon(Icons.add, color: Colors.white, size: 18),
                        label: Text(
                          'Add Card & Pay \$${widget.totalAmount.toStringAsFixed(2)}',
                          style: GoogleFonts.poppins(fontSize: 13, fontWeight: FontWeight.w600, color: Colors.white),
                        ),
                        onPressed: _isProcessing ? null : _addNewCardAndPay,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildCardItem(Map<String, dynamic> card) {
    final cardId = card['id']?.toString() ?? '';
    final isSelected = _selectedCardId == cardId;
    final brand = card['brand'] ?? card['card_brand'] ?? 'card';
    final last4 = card['last4'] ?? card['last_four'] ?? '****';
    final expMonth = card['expMonth'] ?? card['exp_month'] ?? '';
    final expYear = card['expYear'] ?? card['exp_year'] ?? '';

    return GestureDetector(
      onTap: () {
        setState(() {
          _selectedCardId = cardId;
        });
      },
      child: Container(
        margin: const EdgeInsets.only(bottom: 6),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        decoration: BoxDecoration(
          color: isSelected ? AppTheme.primaryExtraLight : AppTheme.background,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: isSelected ? AppTheme.primary : AppTheme.divider, width: isSelected ? 1.5 : 1),
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(6),
              decoration: BoxDecoration(
                color: isSelected ? AppTheme.primary : AppTheme.surface,
                borderRadius: BorderRadius.circular(6),
              ),
              child: Icon(Icons.credit_card, color: isSelected ? Colors.white : AppTheme.textSecondary, size: 16),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(_formatCardBrand(brand), style: GoogleFonts.poppins(fontWeight: FontWeight.w600, fontSize: 13)),
                  Row(
                    children: [
                      Text('**** $last4', style: GoogleFonts.poppins(color: AppTheme.textSecondary, fontSize: 12)),
                      if (expMonth != '' && expYear != '')
                        Padding(
                          padding: const EdgeInsets.only(left: 8),
                          child: Text('$expMonth/$expYear', style: GoogleFonts.poppins(color: AppTheme.textLight, fontSize: 11)),
                        ),
                    ],
                  ),
                ],
              ),
            ),
            SizedBox(
              width: 32, height: 32,
              child: IconButton(
                icon: const Icon(Icons.delete_outline, color: AppTheme.sale, size: 16),
                onPressed: () => _deleteSavedCard(cardId),
                padding: EdgeInsets.zero,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
