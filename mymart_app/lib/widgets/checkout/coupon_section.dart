import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../config/theme.dart';

class CouponSection extends StatelessWidget {
  final String? appliedCoupon;
  final double couponDiscount;
  final VoidCallback onTap;

  const CouponSection({
    super.key,
    this.appliedCoupon,
    this.couponDiscount = 0,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: AppTheme.surface,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [BoxShadow(color: AppTheme.cardShadow, blurRadius: 10, offset: const Offset(0, 4))],
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(16),
          onTap: onTap,
          child: Padding(
            padding: const EdgeInsets.all(14),
            child: Row(
              children: [
                Icon(appliedCoupon != null ? Icons.check_circle : Icons.discount,
                    color: appliedCoupon != null ? AppTheme.primary : AppTheme.textLight, size: 20),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    appliedCoupon != null
                        ? 'Coupon: $appliedCoupon (-\$${couponDiscount.toStringAsFixed(2)})'
                        : 'Have a coupon? Tap to add',
                    style: GoogleFonts.poppins(
                      color: appliedCoupon != null ? AppTheme.primary : AppTheme.textLight,
                      fontSize: 13,
                      fontWeight: appliedCoupon != null ? FontWeight.w600 : FontWeight.normal,
                    ),
                  ),
                ),
                Icon(Icons.chevron_right, color: AppTheme.textLight, size: 20),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
