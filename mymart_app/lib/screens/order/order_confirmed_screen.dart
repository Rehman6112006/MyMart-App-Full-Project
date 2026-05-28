import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../config/theme.dart';
import '../home/main_screen.dart';
import 'order_list_screen.dart';

class OrderConfirmedScreen extends StatelessWidget {
  final String? orderId;
  final String? orderNumber;
  final double? totalAmount;
  final bool isMultiOrder;
  final String paymentMethod; // 'cod' or 'stripe'
  
  const OrderConfirmedScreen({
    super.key,
    this.orderId,
    this.orderNumber,
    this.totalAmount,
    this.isMultiOrder = false,
    this.paymentMethod = 'cod',
  });

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.background,
      body: SafeArea(
        child: LayoutBuilder(
          builder: (context, constraints) {
            final isSmallScreen = constraints.maxHeight < 700;
            final iconSize = isSmallScreen ? 50.0 : 60.0;
            final titleSize = isSmallScreen ? 22.0 : 26.0;
            final cardPadding = isSmallScreen ? 12.0 : 16.0;
            final iconPadding = isSmallScreen ? 16.0 : 24.0;
            final spacing = isSmallScreen ? 12.0 : 20.0;
            final btnHeight = isSmallScreen ? 46.0 : 50.0;

            return Column(
              children: [
                Expanded(
                  child: SingleChildScrollView(
                    physics: const BouncingScrollPhysics(),
                    padding: EdgeInsets.all(isSmallScreen ? 16 : 24),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.center,
                      children: [
                        SizedBox(height: isSmallScreen ? 10 : 20),
                        
                        // Success Icon
                        Container(
                          padding: EdgeInsets.all(iconPadding),
                          decoration: BoxDecoration(
                            color: AppTheme.primaryLight.withValues(alpha: 0.2),
                            shape: BoxShape.circle,
                          ),
                          child: Container(
                            padding: EdgeInsets.all(isSmallScreen ? 12 : 16),
                            decoration: BoxDecoration(
                              color: AppTheme.primary.withValues(alpha: 0.1),
                              shape: BoxShape.circle,
                            ),
                            child: Icon(
                              isMultiOrder ? Icons.local_shipping_rounded : Icons.check_circle_rounded,
                              size: iconSize,
                              color: AppTheme.primary,
                            ),
                          ),
                        ),
                        
                        SizedBox(height: spacing),
                        Text(
                          isMultiOrder ? 'Orders Placed!' : 'Order Placed!',
                          style: GoogleFonts.poppins(
                            fontSize: titleSize,
                            fontWeight: FontWeight.bold,
                            color: AppTheme.textPrimary,
                          ),
                        ),
                        SizedBox(height: isSmallScreen ? 4 : 8),
                        Text(
                          isMultiOrder 
                              ? 'Orders placed successfully'
                              : 'Order placed successfully',
                          style: GoogleFonts.poppins(
                            fontSize: isSmallScreen ? 12 : 14,
                            color: AppTheme.textSecondary,
                          ),
                          textAlign: TextAlign.center,
                        ),
                        
                        SizedBox(height: spacing),
                        
                        // Order Details Card
                        Container(
                          padding: EdgeInsets.all(cardPadding),
                          decoration: BoxDecoration(
                            color: AppTheme.surface,
                            borderRadius: BorderRadius.circular(16),
                            boxShadow: [
                              BoxShadow(
                                color: AppTheme.cardShadow,
                                blurRadius: 8,
                                offset: const Offset(0, 2),
                              ),
                            ],
                          ),
                          child: Column(
                            children: [
                              if (isMultiOrder)
                                Container(
                                  padding: const EdgeInsets.all(8),
                                  decoration: BoxDecoration(
                                    color: const Color(0xFFFF9500).withValues(alpha: 0.1),
                                    borderRadius: BorderRadius.circular(10),
                                  ),
                                  child: Row(
                                    children: [
                                      Container(
                                        padding: const EdgeInsets.all(6),
                                        decoration: BoxDecoration(
                                          color: const Color(0xFFFF9500).withValues(alpha: 0.2),
                                          borderRadius: BorderRadius.circular(8),
                                        ),
                                        child: const Icon(
                                          Icons.storefront,
                                          size: 16,
                                          color: Color(0xFFFF9500),
                                        ),
                                      ),
                                      const SizedBox(width: 8),
                                      Expanded(
                                        child: Text(
                                          'Multi-Store Checkout',
                                          style: GoogleFonts.poppins(
                                            fontWeight: FontWeight.w600,
                                            fontSize: 12,
                                            color: const Color(0xFFFF9500),
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              if (isMultiOrder) const SizedBox(height: 8),
                              // Always show Order ID if available
                              _buildDetailRow(
                                isMultiOrder ? 'Parent Order' : 'Order ID', 
                                orderNumber ?? 'N/A', 
                                isBold: true
                              ),
                              const Divider(height: 16),
                              // Always show Total Amount
                              _buildDetailRow(
                                'Total Amount', 
                                totalAmount != null ? '\$${totalAmount!.toStringAsFixed(2)}' : '\$0.00',
                                valueColor: AppTheme.primary
                              ),
                              const Divider(height: 16),
                              _buildDetailRow(
                                'Payment', 
                                paymentMethod == 'card' || paymentMethod == 'stripe' ? 'Card (Stripe)' : 'Cash on Delivery', 
                                valueColor: AppTheme.primary
                              ),
                            ],
                          ),
                        ),
                        
                        SizedBox(height: spacing),
                        
                        // Status Timeline (Compact)
                        Container(
                          padding: EdgeInsets.all(cardPadding),
                          decoration: BoxDecoration(
                            color: AppTheme.surface,
                            borderRadius: BorderRadius.circular(16),
                            boxShadow: [
                              BoxShadow(
                                color: AppTheme.cardShadow,
                                blurRadius: 8,
                                offset: const Offset(0, 2),
                              ),
                            ],
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'What happens next?',
                                style: GoogleFonts.poppins(
                                  fontSize: isSmallScreen ? 13 : 15,
                                  fontWeight: FontWeight.w700,
                                  color: AppTheme.textPrimary,
                                ),
                              ),
                              SizedBox(height: isSmallScreen ? 8 : 12),
                              _buildCompactStep(
                                icon: Icons.store_outlined,
                                title: isMultiOrder ? 'Vendors confirm' : 'Vendor confirms',
                                isActive: true,
                                isFirst: true,
                              ),
                              _buildCompactStep(
                                icon: Icons.inventory_2_outlined,
                                title: 'Preparing items',
                                isActive: false,
                              ),
                              _buildCompactStep(
                                icon: Icons.delivery_dining,
                                title: 'Out for delivery',
                                isActive: false,
                              ),
                              _buildCompactStep(
                                icon: Icons.home_outlined,
                                title: 'Delivered',
                                isActive: false,
                                isLast: true,
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                
                // Action Buttons
                Container(
                  padding: EdgeInsets.all(isSmallScreen ? 12 : 16),
                  decoration: BoxDecoration(
                    color: AppTheme.surface,
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.05),
                        blurRadius: 10,
                        offset: const Offset(0, -2),
                      ),
                    ],
                  ),
                  child: Row(
                    children: [
                      Expanded(
                        child: SizedBox(
                          height: btnHeight,
                          child: ElevatedButton.icon(
                            style: ElevatedButton.styleFrom(
                              backgroundColor: AppTheme.primary,
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(isSmallScreen ? 20 : 25),
                              ),
                            ),
                            onPressed: () {
                              Navigator.of(context).pushAndRemoveUntil(
                                MaterialPageRoute(builder: (_) => const MainScreen()),
                                (route) => false,
                              );
                            },
                            icon: const Icon(Icons.home_outlined, color: Colors.white, size: 18),
                            label: Text(
                              'Home',
                              style: GoogleFonts.poppins(
                                fontSize: isSmallScreen ? 12 : 14,
                                fontWeight: FontWeight.w600,
                                color: Colors.white,
                              ),
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: SizedBox(
                          height: btnHeight,
                          child: OutlinedButton.icon(
                            style: OutlinedButton.styleFrom(
                              side: const BorderSide(color: AppTheme.primary, width: 1.5),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(isSmallScreen ? 20 : 25),
                              ),
                            ),
                            onPressed: () {
                              Navigator.of(context).pushReplacement(
                                MaterialPageRoute(builder: (_) => const OrderListScreen()),
                              );
                            },
                            icon: const Icon(Icons.receipt_long_outlined, color: AppTheme.primary, size: 18),
                            label: Text(
                              isMultiOrder ? 'Orders' : 'Track',
                              style: GoogleFonts.poppins(
                                fontSize: isSmallScreen ? 12 : 14,
                                fontWeight: FontWeight.w600,
                                color: AppTheme.primary,
                              ),
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            );
          },
        ),
      ),
    );
  }

  Widget _buildDetailRow(String label, String value, {bool isBold = false, Color? valueColor}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: GoogleFonts.poppins(
              fontSize: 12,
              color: AppTheme.textSecondary,
            ),
          ),
          Text(
            value,
            style: GoogleFonts.poppins(
              fontSize: 12,
              fontWeight: isBold ? FontWeight.w700 : FontWeight.w600,
              color: valueColor ?? AppTheme.textPrimary,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCompactStep({
    required IconData icon,
    required String title,
    required bool isActive,
    bool isFirst = false,
    bool isLast = false,
  }) {
    return IntrinsicHeight(
      child: Row(
        children: [
          Column(
            children: [
              Container(
                width: 28,
                height: 28,
                decoration: BoxDecoration(
                  color: isActive ? AppTheme.primary : AppTheme.background,
                  shape: BoxShape.circle,
                  border: Border.all(
                    color: isActive ? AppTheme.primary : AppTheme.divider,
                    width: 1.5,
                  ),
                ),
                child: Icon(icon, size: 14, color: isActive ? Colors.white : AppTheme.textLight),
              ),
              if (!isLast)
                Expanded(
                  child: Container(
                    width: 1.5,
                    margin: const EdgeInsets.symmetric(vertical: 2),
                    color: AppTheme.divider,
                  ),
                ),
            ],
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Padding(
              padding: EdgeInsets.only(bottom: isLast ? 0 : 12),
              child: Text(
                title,
                style: GoogleFonts.poppins(
                  fontSize: 11,
                  fontWeight: isActive ? FontWeight.w600 : FontWeight.w500,
                  color: isActive ? AppTheme.textPrimary : AppTheme.textLight,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
