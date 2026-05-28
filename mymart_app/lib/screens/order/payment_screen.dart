import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../config/theme.dart';
import '../../services/payment_service.dart';

class PaymentScreen extends StatefulWidget {
  final double totalAmount;
  final String orderId;
  final String paymentMethod;
  final VoidCallback onCodSelected;
  final Function(PaymentResult) onPaymentComplete;

  const PaymentScreen({
    super.key,
    required this.totalAmount,
    required this.orderId,
    required this.paymentMethod,
    required this.onCodSelected,
    required this.onPaymentComplete,
  });

  @override
  State<PaymentScreen> createState() => _PaymentScreenState();
}

class _PaymentScreenState extends State<PaymentScreen> {
  String? _selectedUpi;
  String? _selectedBank;
  bool _isProcessing = false;

  final List<Map<String, String>> _upiApps = [
    {'id': 'gpay', 'name': 'Google Pay', 'icon': 'G'},
    {'id': 'phonepe', 'name': 'PhonePe', 'icon': 'P'},
    {'id': 'applepay', 'name': 'Apple Pay', 'icon': '\$'},
    {'id': 'bhim', 'name': 'BHIM UPI', 'icon': 'B'},
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        backgroundColor: AppTheme.surface,
        elevation: 0,
        leading: IconButton(
          icon: Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: AppTheme.background,
              shape: BoxShape.circle,
            ),
            child: const Icon(Icons.arrow_back_ios_new, size: 18, color: AppTheme.textPrimary),
          ),
          onPressed: () => Navigator.pop(context),
        ),
        title: Text(
          'Payment',
          style: GoogleFonts.poppins(
            color: AppTheme.textPrimary,
            fontSize: 18,
            fontWeight: FontWeight.w700,
          ),
        ),
        centerTitle: true,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildAmountCard(),
            const SizedBox(height: 24),
            _buildPaymentOptions(),
            const SizedBox(height: 100),
          ],
        ),
      ),
      bottomNavigationBar: _buildBottomBar(),
    );
  }

  Widget _buildAmountCard() {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [AppTheme.primary, AppTheme.primaryDark],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: AppTheme.primary.withValues(alpha: 0.3),
            blurRadius: 15,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Column(
        children: [
          Text(
            'Amount to Pay',
            style: GoogleFonts.poppins(
              color: Colors.white.withValues(alpha: 0.8),
              fontSize: 14,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            '\$${widget.totalAmount.toStringAsFixed(2)}',
            style: GoogleFonts.poppins(
              color: Colors.white,
              fontSize: 36,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.2),
              borderRadius: BorderRadius.circular(20),
            ),
            child: Text(
              'Order #${widget.orderId}',
              style: GoogleFonts.poppins(
                color: Colors.white,
                fontSize: 12,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPaymentOptions() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            const Icon(Icons.payment, color: AppTheme.primary, size: 22),
            const SizedBox(width: 8),
            Text(
              'Select Payment Method',
              style: GoogleFonts.poppins(
                fontSize: 16,
                fontWeight: FontWeight.w700,
                color: AppTheme.textPrimary,
              ),
            ),
          ],
        ),
        const SizedBox(height: 16),

        // UPI Payment
        _buildPaymentSection(
          title: 'UPI',
          icon: Icons.qr_code,
          child: Wrap(
            spacing: 12,
            runSpacing: 12,
            children: _upiApps.map((app) {
              final isSelected = _selectedUpi == app['id'];
              return GestureDetector(
                onTap: () => setState(() => _selectedUpi = app['id']),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  decoration: BoxDecoration(
                    color: isSelected ? AppTheme.primaryExtraLight : AppTheme.surface,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                      color: isSelected ? AppTheme.primary : AppTheme.divider,
                      width: isSelected ? 2 : 1,
                    ),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Container(
                        width: 32,
                        height: 32,
                        decoration: BoxDecoration(
                          color: isSelected ? AppTheme.primary : AppTheme.background,
                          shape: BoxShape.circle,
                        ),
                        child: Center(
                          child: Text(
                            app['icon']!,
                            style: TextStyle(
                              fontWeight: FontWeight.bold,
                              color: isSelected ? Colors.white : AppTheme.textPrimary,
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Text(
                        app['name']!,
                        style: GoogleFonts.poppins(
                          fontWeight: FontWeight.w600,
                          color: isSelected ? AppTheme.primary : AppTheme.textPrimary,
                        ),
                      ),
                    ],
                  ),
                ),
              );
            }).toList(),
          ),
        ),

        const SizedBox(height: 20),

        // Card Payment
        _buildPaymentSection(
          title: 'Debit/Credit Card',
          icon: Icons.credit_card,
          child: GestureDetector(
            onTap: () => _showCardPaymentDialog(),
            child: Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppTheme.surface,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppTheme.divider),
              ),
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: AppTheme.background,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: const Icon(Icons.add_card, color: AppTheme.primary),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      'Add New Card',
                      style: GoogleFonts.poppins(
                        fontWeight: FontWeight.w600,
                        color: AppTheme.textPrimary,
                      ),
                    ),
                  ),
                  const Icon(Icons.chevron_right, color: AppTheme.textLight),
                ],
              ),
            ),
          ),
        ),

        const SizedBox(height: 20),

        // Net Banking
        _buildPaymentSection(
          title: 'Net Banking',
          icon: Icons.account_balance,
          child: GestureDetector(
            onTap: () => _showNetBankingDialog(),
            child: Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppTheme.surface,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppTheme.divider),
              ),
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: AppTheme.background,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: const Icon(Icons.account_balance, color: AppTheme.primary),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      _selectedBank != null
                          ? PaymentService.netBankingBanks
                              .firstWhere((b) => b['id'] == _selectedBank)['name']!
                          : 'Select Your Bank',
                      style: GoogleFonts.poppins(
                        fontWeight: FontWeight.w600,
                        color: _selectedBank != null ? AppTheme.textPrimary : AppTheme.textSecondary,
                      ),
                    ),
                  ),
                  const Icon(Icons.chevron_right, color: AppTheme.textLight),
                ],
              ),
            ),
          ),
        ),

        const SizedBox(height: 20),

        // Cash on Delivery
        _buildPaymentSection(
          title: 'Cash on Delivery',
          icon: Icons.money,
          child: GestureDetector(
            onTap: () {
              Navigator.pop(context);
              widget.onCodSelected();
            },
            child: Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppTheme.surface,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppTheme.divider),
              ),
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: AppTheme.primaryExtraLight,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: const Icon(Icons.money, color: AppTheme.primary),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Pay on Delivery',
                          style: GoogleFonts.poppins(
                            fontWeight: FontWeight.w600,
                            color: AppTheme.textPrimary,
                          ),
                        ),
                        Text(
                          'No online payment required',
                          style: GoogleFonts.poppins(
                            fontSize: 12,
                            color: AppTheme.textSecondary,
                          ),
                        ),
                      ],
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                    decoration: BoxDecoration(
                      color: AppTheme.primary,
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Text(
                      'COD',
                      style: GoogleFonts.poppins(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: Colors.white,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildPaymentSection({
    required String title,
    required IconData icon,
    required Widget child,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Icon(icon, size: 18, color: AppTheme.textSecondary),
            const SizedBox(width: 8),
            Text(
              title,
              style: GoogleFonts.poppins(
                fontSize: 14,
                fontWeight: FontWeight.w600,
                color: AppTheme.textSecondary,
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        child,
      ],
    );
  }

  void _showCardPaymentDialog() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => _CardPaymentSheet(
        totalAmount: widget.totalAmount,
        onPay: (result) {
          Navigator.pop(context);
          Navigator.pop(context);
          widget.onPaymentComplete(result);
        },
      ),
    );
  }

  void _showNetBankingDialog() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => _NetBankingSheet(
        onSelect: (bankId) {
          setState(() => _selectedBank = bankId);
          Navigator.pop(context);
        },
      ),
    );
  }

  Widget _buildBottomBar() {
    final canPay = _selectedUpi != null || _selectedBank != null;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppTheme.surface,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.08),
            blurRadius: 20,
            offset: const Offset(0, -4),
          ),
        ],
      ),
      child: SafeArea(
        child: SizedBox(
          width: double.infinity,
          height: 56,
          child: ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: canPay ? AppTheme.primary : AppTheme.textLight,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(28)),
            ),
            onPressed: canPay && !_isProcessing ? _processPayment : null,
            child: Text(
                    'Pay \$${widget.totalAmount.toStringAsFixed(2)}',
                    style: GoogleFonts.poppins(
                      fontSize: 16,
                      fontWeight: FontWeight.w600,
                      color: Colors.white,
                    ),
                  ),
          ),
        ),
      ),
    );
  }

  Future<void> _processPayment() async {
    setState(() => _isProcessing = true);

    try {
      PaymentResult result;

      if (_selectedUpi != null) {
        result = await PaymentService.processUpiPayment(
          upiId: '$_selectedUpi@upi',
          amount: widget.totalAmount,
          orderId: widget.orderId,
        );
      } else if (_selectedBank != null) {
        result = await PaymentService.processNetBankingPayment(
          bankId: _selectedBank!,
          amount: widget.totalAmount,
          orderId: widget.orderId,
        );
      } else {
        result = PaymentResult.failure('Please select a payment method');
      }

      if (!mounted) return;
      Navigator.pop(context);
      widget.onPaymentComplete(result);
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Payment error: $e'),
          backgroundColor: AppTheme.sale,
        ),
      );
    } finally {
      if (mounted) {
        setState(() => _isProcessing = false);
      }
    }
  }
}

// Card Payment Bottom Sheet
class _CardPaymentSheet extends StatefulWidget {
  final double totalAmount;
  final Function(PaymentResult) onPay;

  const _CardPaymentSheet({
    required this.totalAmount,
    required this.onPay,
  });

  @override
  State<_CardPaymentSheet> createState() => _CardPaymentSheetState();
}

class _CardPaymentSheetState extends State<_CardPaymentSheet> {
  final _formKey = GlobalKey<FormState>();
  final _cardNumberController = TextEditingController();
  final _expiryController = TextEditingController();
  final _cvvController = TextEditingController();
  final _nameController = TextEditingController();
  bool _isProcessing = false;

  @override
  void dispose() {
    _cardNumberController.dispose();
    _expiryController.dispose();
    _cvvController.dispose();
    _nameController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.only(
        bottom: MediaQuery.of(context).viewInsets.bottom,
      ),
      decoration: const BoxDecoration(
        color: AppTheme.surface,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Form(
          key: _formKey,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: AppTheme.divider,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              const SizedBox(height: 20),
              Text(
                'Card Payment',
                style: GoogleFonts.poppins(
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                'Pay \$${widget.totalAmount.toStringAsFixed(2)}',
                style: GoogleFonts.poppins(
                  color: AppTheme.textSecondary,
                ),
              ),
              const SizedBox(height: 24),

              // Card Number
              TextFormField(
                controller: _cardNumberController,
                keyboardType: TextInputType.number,
                decoration: InputDecoration(
                  labelText: 'Card Number',
                  hintText: '1234 5678 9012 3456',
                  prefixIcon: const Icon(Icons.credit_card),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                ),
                validator: (v) => v?.length != 16 ? 'Enter valid card number' : null,
              ),
              const SizedBox(height: 16),

              Row(
                children: [
                  Expanded(
                    child: TextFormField(
                      controller: _expiryController,
                      keyboardType: TextInputType.datetime,
                      decoration: InputDecoration(
                        labelText: 'Expiry',
                        hintText: 'MM/YY',
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                      validator: (v) => v?.length != 5 ? 'Invalid' : null,
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: TextFormField(
                      controller: _cvvController,
                      obscureText: true,
                      keyboardType: TextInputType.number,
                      decoration: InputDecoration(
                        labelText: 'CVV',
                        hintText: '123',
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                      validator: (v) => v?.length != 3 ? 'Invalid' : null,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),

              TextFormField(
                controller: _nameController,
                decoration: InputDecoration(
                  labelText: 'Card Holder Name',
                  hintText: 'John Doe',
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                ),
                validator: (v) => v?.isEmpty == true ? 'Required' : null,
              ),
              const SizedBox(height: 24),

              SizedBox(
                width: double.infinity,
                height: 56,
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppTheme.primary,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(28),
                    ),
                  ),
                  onPressed: _isProcessing ? null : _processPayment,
                  child: Text(
                          'Pay \$${widget.totalAmount.toStringAsFixed(2)}',
                          style: GoogleFonts.poppins(
                            fontSize: 16,
                            fontWeight: FontWeight.w600,
                            color: Colors.white,
                          ),
                        ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _processPayment() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isProcessing = true);

    try {
      final result = await PaymentService.processCardPayment(
        cardNumber: _cardNumberController.text.replaceAll(' ', ''),
        expiry: _expiryController.text,
        cvv: _cvvController.text,
        name: _nameController.text,
        amount: widget.totalAmount,
        orderId: '',
      );

      widget.onPay(result);
    } catch (e) {
      widget.onPay(PaymentResult.failure('Payment failed: $e'));
    } finally {
      if (mounted) setState(() => _isProcessing = false);
    }
  }
}

// Net Banking Bottom Sheet
class _NetBankingSheet extends StatelessWidget {
  final Function(String) onSelect;

  const _NetBankingSheet({required this.onSelect});

  @override
  Widget build(BuildContext context) {
    return Container(
      height: MediaQuery.of(context).size.height * 0.6,
      decoration: const BoxDecoration(
        color: AppTheme.surface,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: Column(
        children: [
          const SizedBox(height: 12),
          Container(
            width: 40,
            height: 4,
            decoration: BoxDecoration(
              color: AppTheme.divider,
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          const SizedBox(height: 20),
          Text(
            'Select Bank',
            style: GoogleFonts.poppins(
              fontSize: 18,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 16),
          Expanded(
            child: ListView.separated(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              itemCount: PaymentService.netBankingBanks.length,
              separatorBuilder: (_, _) => const SizedBox(height: 8),
              itemBuilder: (context, index) {
                final bank = PaymentService.netBankingBanks[index];
                return ListTile(
                  onTap: () => onSelect(bank['id']!),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                  tileColor: AppTheme.background,
                  leading: CircleAvatar(
                    backgroundColor: AppTheme.primary,
                    child: Text(
                      bank['name']![0],
                      style: const TextStyle(color: Colors.white),
                    ),
                  ),
                  title: Text(bank['name']!),
                  trailing: const Icon(Icons.chevron_right),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}
