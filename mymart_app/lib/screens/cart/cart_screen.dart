import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../config/theme.dart';
import '../../providers/cart_provider.dart';
import '../../models/cart_item.dart';
import '../order/checkout_screen.dart';
import '../../widgets/shimmer_loaders.dart';
import '../../widgets/network_image.dart';
import '../../localization/app_localizations.dart';

class CartScreen extends StatelessWidget {
  const CartScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final t = AppLocalizations.of(context).translate;
    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        backgroundColor: AppTheme.surface,
        elevation: 0,
        title: Text(
          t('my_cart'),
          style: GoogleFonts.inter(fontWeight: FontWeight.w700, fontSize: 18),
        ),
        actions: [
          Consumer<CartProvider>(
            builder: (context, cart, _) {
              if (cart.items.isNotEmpty) {
                return TextButton(
                  onPressed: () => _showClearCartDialog(context, cart),
                  child: Text(
                    t('clear'),
                    style: GoogleFonts.inter(
                      color: AppTheme.sale,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                );
              }
              return const SizedBox.shrink();
            },
          ),
        ],
      ),
      body: Consumer<CartProvider>(
        builder: (context, cart, _) {
          if (cart.isLoading && cart.items.isEmpty) {
            return const ShimmerCart();
          }

          if (cart.items.isEmpty) {
            return _buildEmptyCart(context);
          }

          final itemsByStore = cart.itemsByStore;
          final storeCount = itemsByStore.keys.length;
          final hasMultipleStores = storeCount > 1;

          return Column(
            children: [
              // Multi-vendor info banner
              Container(
                margin: const EdgeInsets.fromLTRB(16, 16, 16, 0),
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: hasMultipleStores 
                      ? const Color(0xFFFF9500).withValues(alpha: 0.1)
                      : AppTheme.primary.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(
                    color: hasMultipleStores 
                        ? const Color(0xFFFF9500).withValues(alpha: 0.3)
                        : AppTheme.primary.withValues(alpha: 0.3),
                  ),
                ),
                child: Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: (hasMultipleStores 
                            ? const Color(0xFFFF9500) 
                            : AppTheme.primary).withValues(alpha: 0.2),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Icon(
                        hasMultipleStores ? Icons.storefront : Icons.store,
                        color: hasMultipleStores 
                            ? const Color(0xFFFF9500) 
                            : AppTheme.primary,
                        size: 20,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            hasMultipleStores 
                                ? '$storeCount ${t('stores')} in your cart'
                                : '${t("sold_by")}: ${cart.items.first.storeName ?? t('unknown_store')}',
                            style: GoogleFonts.inter(
                              fontWeight: FontWeight.w600,
                              fontSize: 14,
                              color: AppTheme.textPrimary,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            hasMultipleStores
                                ? t('orders_split')
                                : t('all_same_store'),
                            style: GoogleFonts.inter(
                              fontSize: 12,
                              color: AppTheme.textSecondary,
                            ),
                          ),
                        ],
                      ),
                    ),
                    if (hasMultipleStores)
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                        decoration: BoxDecoration(
                          color: const Color(0xFFFF9500),
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Text(
                          '$storeCount orders',
                          style: GoogleFonts.inter(
                            fontSize: 12,
                            fontWeight: FontWeight.w700,
                            color: Colors.white,
                          ),
                        ),
                      ),
                  ],
                ),
              ),
              // Cart items grouped by store
              Expanded(
                child: hasMultipleStores
                    ? _buildMultiStoreCart(context, cart, itemsByStore)
                    : _buildSingleStoreCart(context, cart),
              ),
              _buildCartSummary(context, cart, hasMultipleStores),
            ],
          );
        },
      ),
    );
  }

  // Build cart items for multiple stores
  Widget _buildMultiStoreCart(
    BuildContext context,
    CartProvider cart,
    Map<String, List<CartItem>> itemsByStore,
  ) {
    final t = AppLocalizations.of(context).translate;
    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: itemsByStore.length,
      itemBuilder: (context, storeIndex) {
        final storeId = itemsByStore.keys.elementAt(storeIndex);
        final storeItems = itemsByStore[storeId]!;
                  final storeName = storeItems.first.storeName ?? t('unknown_store');
                  final storeTotal = storeItems.fold(0.0, (sum, item) => sum + item.totalPrice);

                  return Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Store header
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                        decoration: BoxDecoration(
                          color: AppTheme.primary.withValues(alpha: 0.08),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Row(
                          children: [
                            const Icon(Icons.store, size: 16, color: AppTheme.primary),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                storeName,
                                style: GoogleFonts.inter(
                                  fontWeight: FontWeight.w600,
                                  fontSize: 13,
                                  color: AppTheme.primary,
                                ),
                              ),
                            ),
                            Text(
                              '\$${storeTotal.toStringAsFixed(2)}',
                              style: GoogleFonts.inter(
                                fontWeight: FontWeight.w700,
                                fontSize: 13,
                                color: AppTheme.primary,
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 12),
                      // Store items
                      ...storeItems.map((item) => Padding(
                        padding: const EdgeInsets.only(bottom: 12),
                        child: _CartItemCard(
                          item: item,
                          onQuantityChanged: (qty) {
                            cart.updateQuantity(item.id, qty);
                          },
                          onRemove: () {
                            cart.removeItem(item.id);
                          },
                        ),
                      )),
                      const SizedBox(height: 16),
                      // Store subtotal divider
                      if (storeIndex < itemsByStore.length - 1)
                        const Divider(height: 1),
                      const SizedBox(height: 16),
                    ],
                  );
                },
              );
  }

  // Build cart items for single store
  Widget _buildSingleStoreCart(BuildContext context, CartProvider cart) {
    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: cart.items.length,
      itemBuilder: (context, index) {
        return _CartItemCard(
          item: cart.items[index],
          onQuantityChanged: (qty) {
            cart.updateQuantity(cart.items[index].id, qty);
          },
          onRemove: () {
            cart.removeItem(cart.items[index].id);
          },
        );
      },
    );
  }

  Widget _buildEmptyCart(BuildContext context) {
    final t = AppLocalizations.of(context).translate;
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                gradient: AppTheme.primaryGradient,
                shape: BoxShape.circle,
                boxShadow: AppTheme.shadowPrimary,
              ),
              child: const Icon(
                Icons.shopping_cart_outlined,
                size: 60,
                color: Colors.white,
              ),
            ),
            const SizedBox(height: 24),
            Text(
              t('your_cart_empty'),
              style: GoogleFonts.inter(
                fontSize: 20,
                fontWeight: FontWeight.w700,
                color: AppTheme.textPrimary,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              t('start_shopping'),
              style: GoogleFonts.inter(
                fontSize: 14,
                color: AppTheme.textSecondary,
              ),
            ),
            const SizedBox(height: 32),
            SizedBox(
              width: 220, height: 50,
              child: ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppTheme.primary,
                  padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(14),
                  ),
                  elevation: 0,
                ),
                onPressed: () {
                  Navigator.of(context).pushNamedAndRemoveUntil(
                    '/home',
                    (route) => false,
                    arguments: 0,
                  );
                },
                child: Text(
                  t('start_shopping_btn'),
                  style: GoogleFonts.inter(
                    fontWeight: FontWeight.w600,
                    color: Colors.white,
                    fontSize: 15,
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCartSummary(BuildContext context, CartProvider cart, bool hasMultipleStores) {
    final t = AppLocalizations.of(context).translate;
    final subtotal = cart.totalAmount;
    final storeCount = cart.itemsByStore.keys.length;
    final deliveryFee = subtotal > 0 ? 3.0 * storeCount : 0.0;
    final discount = 0.0;
    final total = subtotal + deliveryFee - discount;

    return Container(
      margin: const EdgeInsets.all(16),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: AppTheme.surface,
        borderRadius: BorderRadius.circular(20),
        boxShadow: AppTheme.shadowMd,
      ),
      child: SafeArea(
        child: Column(
          children: [
            if (hasMultipleStores) ...[
              ...cart.itemsByStore.entries.map((entry) {
                final storeName = entry.value.first.storeName ?? t('stores');
                final storeSubtotal = entry.value.fold(0.0, (sum, item) => sum + item.totalPrice);
                return Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Row(
                        children: [
                          Container(
                            width: 8,
                            height: 8,
                            decoration: BoxDecoration(
                              color: AppTheme.primary,
                              borderRadius: BorderRadius.circular(4),
                            ),
                          ),
                          const SizedBox(width: 8),
                          Text(
                            storeName,
                            style: GoogleFonts.inter(
                              fontSize: 13,
                              color: AppTheme.textSecondary,
                            ),
                          ),
                        ],
                      ),
                      Text(
                        '\$${storeSubtotal.toStringAsFixed(2)}',
                        style: GoogleFonts.inter(
                          fontSize: 13,
                          color: AppTheme.textPrimary,
                        ),
                      ),
                    ],
                  ),
                );
              }),
              const Divider(height: 20),
            ],
            _buildSummaryRow(t('subtotal'), subtotal, t: t),
            const SizedBox(height: 8),
            _buildSummaryRow(
              t('delivery_fee'), 
              deliveryFee, 
              isFee: true,
              subtitle: hasMultipleStores ? '($storeCount ${t('stores')})' : null,
              t: t,
            ),
            if (discount > 0) ...[
              const SizedBox(height: 8),
              _buildSummaryRow(t('discount'), -discount, isDiscount: true, t: t),
            ],
            const Divider(height: 20),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      t('total'),
                      style: GoogleFonts.inter(
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                        color: AppTheme.textSecondary,
                      ),
                    ),
                    if (hasMultipleStores)
                      Text(
                        '$storeCount separate orders',
                        style: GoogleFonts.inter(
                          fontSize: 11,
                          color: const Color(0xFFFF9500),
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                  ],
                ),
                Text(
                  '\$${total.toStringAsFixed(2)}',
                  style: GoogleFonts.inter(
                    fontSize: 24,
                    fontWeight: FontWeight.w800,
                    color: AppTheme.primary,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              height: 54,
              child: ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppTheme.primary,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(14),
                  ),
                  elevation: 0,
                ).copyWith(
                  overlayColor: WidgetStateProperty.resolveWith<Color?>(
                    (states) => states.contains(WidgetState.pressed) ? Colors.white.withValues(alpha: 0.2) : null,
                  ),
                ),
                onPressed: () {
                  if (cart.items.isEmpty) return;
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (_) => CheckoutScreen(totalAmount: total),
                    ),
                  );
                },
                child: Text(
                  hasMultipleStores 
                      ? '${t('checkout')} ($storeCount orders)' 
                      : t('proceed_checkout'),
                  style: GoogleFonts.inter(
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
    );
  }

  Widget _buildSummaryRow(
    String label,
    double amount, {
    bool isFee = false,
    bool isDiscount = false,
    String? subtitle,
    required String Function(String) t,
  }) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              label,
              style: GoogleFonts.inter(
                color: AppTheme.textSecondary,
                fontSize: 14,
              ),
            ),
            if (subtitle != null)
              Text(
                subtitle,
                style: GoogleFonts.inter(
                  color: AppTheme.textSecondary,
                  fontSize: 11,
                ),
              ),
          ],
        ),
        Text(
          isDiscount
              ? '-\$${amount.abs().toStringAsFixed(2)}'
              : isFee && amount == 0
              ? t('free')
              : '\$${amount.toStringAsFixed(2)}',
          style: GoogleFonts.inter(
            color: isDiscount
                ? AppTheme.primary
                : isFee
                ? AppTheme.primary
                : AppTheme.textPrimary,
            fontWeight: isFee ? FontWeight.w600 : FontWeight.w500,
            fontSize: 14,
          ),
        ),
      ],
    );
  }

  void _showClearCartDialog(BuildContext context, CartProvider cart) {
    final t = AppLocalizations.of(context).translate;
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(
          t('clear_cart'),
          style: GoogleFonts.inter(fontWeight: FontWeight.w700),
        ),
        content: Text(
          t('clear_cart_confirm'),
          style: GoogleFonts.inter(),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: Text(
              t('cancel'),
              style: GoogleFonts.inter(color: AppTheme.textSecondary),
            ),
          ),
          TextButton(
            onPressed: () {
              cart.clearCart();
              Navigator.pop(ctx);
            },
            child: Text(
              t('clear'),
              style: GoogleFonts.inter(color: AppTheme.sale),
            ),
          ),
        ],
      ),
    );
  }
}

class _CartItemCard extends StatelessWidget {
  final CartItem item;
  final Function(int) onQuantityChanged;
  final VoidCallback onRemove;

  const _CartItemCard({
    required this.item,
    required this.onQuantityChanged,
    required this.onRemove,
  });

  @override
  Widget build(BuildContext context) {
    final effectivePrice = item.price;
    final t = AppLocalizations.of(context).translate;

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppTheme.surface,
        borderRadius: BorderRadius.circular(16),
        boxShadow: AppTheme.shadowSm,
      ),
      child: Row(
        children: [
          ClipRRect(
            borderRadius: BorderRadius.circular(12),
            child: SizedBox(
              width: 88,
              height: 88,
              child: item.image != null && item.image!.isNotEmpty
                  ? ProductImage(imageUrl: item.image!)
                  : Container(
                      color: AppTheme.background,
                      child: const Icon(Icons.image_outlined, color: AppTheme.textLight),
                    ),
            ),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  item.productName.isNotEmpty ? item.productName : t('product'),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: GoogleFonts.inter(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    color: AppTheme.textPrimary,
                  ),
                ),
                if (item.storeName != null) ...[
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      const Icon(Icons.store_outlined, size: 12, color: AppTheme.textSecondary),
                      const SizedBox(width: 4),
                      Expanded(
                        child: Text(
                          item.storeName!,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: GoogleFonts.inter(
                            fontSize: 11,
                            color: AppTheme.textSecondary,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
                const SizedBox(height: 6),
                Text(
                  '\$${effectivePrice.toStringAsFixed(2)}',
                  style: GoogleFonts.inter(
                    fontSize: 17,
                    fontWeight: FontWeight.w700,
                    color: AppTheme.primary,
                  ),
                ),
                const SizedBox(height: 10),
                Row(
                  children: [
                    _QuantityButton(
                      icon: Icons.remove,
                      onTap: item.quantity > 1
                          ? () => onQuantityChanged(item.quantity - 1)
                          : null,
                    ),
                    Container(
                      width: 36,
                      alignment: Alignment.center,
                      child: Text(
                        '${item.quantity}',
                        style: GoogleFonts.inter(
                          fontSize: 15,
                          fontWeight: FontWeight.w700,
                          color: AppTheme.textPrimary,
                        ),
                      ),
                    ),
                    _QuantityButton(
                      icon: Icons.add,
                      onTap: () => onQuantityChanged(item.quantity + 1),
                    ),
                    const Spacer(),
                    GestureDetector(
                      onTap: onRemove,
                      child: Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: AppTheme.saleLight,
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: const Icon(
                          Icons.delete_outline,
                          size: 18,
                          color: AppTheme.sale,
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _QuantityButton extends StatelessWidget {
  final IconData icon;
  final VoidCallback? onTap;

  const _QuantityButton({required this.icon, this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 34,
        height: 34,
        decoration: BoxDecoration(
          color: onTap != null ? AppTheme.primaryExtraLight : AppTheme.divider,
          borderRadius: BorderRadius.circular(10),
        ),
        child: Icon(
          icon,
          size: 18,
          color: onTap != null ? AppTheme.primary : AppTheme.textLight,
        ),
      ),
    );
  }
}
