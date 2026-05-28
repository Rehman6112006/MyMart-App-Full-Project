import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../config/theme.dart';

class OrderSummary extends StatelessWidget {
  final double subtotal;
  final double deliveryCharge;
  final double couponDiscount;
  final String? appliedCoupon;
  final double total;
  final String Function(String) translate;

  const OrderSummary({
    super.key,
    required this.subtotal,
    required this.deliveryCharge,
    this.couponDiscount = 0,
    this.appliedCoupon,
    required this.total,
    required this.translate,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(children: [
          const Icon(Icons.receipt_long, color: AppTheme.primary, size: 22),
          const SizedBox(width: 8),
          Text(translate('order_summary'), style: GoogleFonts.poppins(fontSize: 16, fontWeight: FontWeight.w700, color: AppTheme.textPrimary)),
        ]),
        const SizedBox(height: 12),
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: AppTheme.surface,
            borderRadius: BorderRadius.circular(16),
            boxShadow: [BoxShadow(color: AppTheme.cardShadow, blurRadius: 10, offset: const Offset(0, 4))],
          ),
          child: Column(
            children: [
              _buildRow(translate('subtotal'), '\$${subtotal.toStringAsFixed(2)}'),
              const SizedBox(height: 8),
              _buildRow(translate('delivery'), deliveryCharge == 0 ? translate('free') : '\$${deliveryCharge.toStringAsFixed(2)}',
                  isBold: deliveryCharge == 0),
              if (deliveryCharge == 0)
                Container(
                  margin: const EdgeInsets.only(top: 4),
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(color: AppTheme.primaryLight.withValues(alpha: 0.2), borderRadius: BorderRadius.circular(8)),
                  child: Text(translate('free_delivery'), style: GoogleFonts.poppins(fontSize: 12, color: AppTheme.primary, fontWeight: FontWeight.w600)),
                ),
              if (couponDiscount > 0) ...[
                const SizedBox(height: 8),
                _buildRow('Coupon (${appliedCoupon ?? ''})', '-\$${couponDiscount.toStringAsFixed(2)}', isGreen: true),
              ],
              const Divider(height: 20),
              Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                Text(translate('total'), style: GoogleFonts.poppins(fontSize: 18, fontWeight: FontWeight.w700, color: AppTheme.textPrimary)),
                Text('\$${total.toStringAsFixed(2)}', style: GoogleFonts.poppins(fontSize: 22, fontWeight: FontWeight.w800, color: AppTheme.primary)),
              ]),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildRow(String label, String value, {bool isBold = false, bool isGreen = false}) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label, style: GoogleFonts.poppins(color: AppTheme.textSecondary, fontSize: 14)),
        Text(value, style: GoogleFonts.poppins(
          color: isGreen ? AppTheme.primary : (isBold ? AppTheme.primary : AppTheme.textPrimary),
          fontSize: 14,
          fontWeight: isBold || isGreen ? FontWeight.w600 : FontWeight.normal,
        )),
      ],
    );
  }
}
