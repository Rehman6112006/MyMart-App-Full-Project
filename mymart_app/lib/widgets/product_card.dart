import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../models/product.dart';
import '../../providers/cart_provider.dart';
import '../../providers/wishlist_provider.dart';
import '../../providers/auth_provider.dart';
import '../../services/cart_notification_service.dart';
import './network_image.dart';
import '../../localization/app_localizations.dart';
import '../config/theme.dart';

const Color _primaryRed = Color(0xFF16A34A);
const Color _textGray = Color(0xFF8E8E93);
const Color _textDark = Color(0xFF111827);
const Color _bgLight = Color(0xFFF8F9FA);
const Color _amber = Color(0xFFF59E0B);
const Color _borderGray = Color(0xFFE5E5EA);

class ProductCard extends StatelessWidget {
  final dynamic product;
  final VoidCallback? onTap;
  final bool showStoreName;

  const ProductCard({
    super.key,
    required this.product,
    this.onTap,
    this.showStoreName = true,
  });

  String get productId {
    if (product is Product) return (product as Product).id;
    if (product is Map) return product['id']?.toString() ?? '';
    return '';
  }

  String get productName {
    if (product is Product) return (product as Product).name;
    if (product is Map) return product['name'] ?? '';
    return '';
  }

  double get basePrice {
    if (product is Product) return (product as Product).basePrice;
    if (product is Map) return (product['base_price'] ?? 0).toDouble();
    return 0;
  }

  double get discountPrice {
    if (product is Product) return (product as Product).effectivePrice;
    if (product is Map) {
      final dp = product['discount_price'];
      if (dp != null) return dp.toDouble();
      return (product['base_price'] ?? 0).toDouble();
    }
    return 0;
  }

  bool get hasDiscount {
    if (product is Product) return (product as Product).hasDiscount;
    if (product is Map) {
      final bp = (product['base_price'] ?? 0).toDouble();
      final dp = product['discount_price']?.toDouble() ?? bp;
      return dp < bp;
    }
    return false;
  }

  int get discountPercentage {
    if (product is Product) {
      return (product as Product).discountPercentage?.toInt() ?? 0;
    }
    if (product is Map) {
      final bp = (product['base_price'] ?? 0).toDouble();
      final dp = product['discount_price']?.toDouble() ?? bp;
      if (bp > 0 && dp < bp) {
        return ((bp - dp) / bp * 100).round();
      }
    }
    return 0;
  }

  List<String> get images {
    if (product is Product) return (product as Product).images;
    if (product is Map) {
      final imgs = product['images'];
      if (imgs is List) return List<String>.from(imgs);
    }
    return [];
  }

  String? get storeName {
    if (product is Product) return (product as Product).storeName;
    if (product is Map) return product['store_name'];
    return null;
  }

  String? get storeId {
    if (product is Product) return (product as Product).storeId;
    if (product is Map) return product['store_id']?.toString();
    return null;
  }

  @override
  Widget build(BuildContext context) {
    final productId = this.productId;
    final productName = this.productName;
    final basePrice = this.basePrice;
    final discountPrice = this.discountPrice;
    final hasDiscount = this.hasDiscount;
    final discountPercentage = this.discountPercentage;
    final storeName = this.storeName;
    final storeId = this.storeId;
    final images = this.images;
    final t = AppLocalizations.of(context).translate;

    return RepaintBoundary(
      child: TweenAnimationBuilder<double>(
        tween: Tween(begin: 0, end: 1),
        duration: const Duration(milliseconds: 400),
        curve: Curves.easeOutCubic,
        builder: (context, value, child) {
          return Opacity(
            opacity: value,
            child: Transform.translate(
              offset: Offset(0, 20 * (1 - value)),
              child: child,
            ),
          );
        },
        child: GestureDetector(
          onTap: onTap,
          child: Container(
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(AppTheme.radiusLg),
              boxShadow: [
                BoxShadow(color: Colors.black.withValues(alpha: 0.06), blurRadius: 12, offset: const Offset(0, 4)),
              ],
            ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                flex: 3,
                child: Stack(
                  children: [
                    Container(
                      width: double.infinity,
                      decoration: const BoxDecoration(
                        color: _bgLight,
                        borderRadius: BorderRadius.vertical(
                          top: Radius.circular(16),
                        ),
                      ),
                      child: images.isNotEmpty
                          ? ClipRRect(
                              borderRadius: const BorderRadius.vertical(
                                top: Radius.circular(16),
                              ),
                              child: ProductImage(
                                imageUrl: images.first,
                                fit: BoxFit.cover,
                              ),
                            )
                          : _buildPlaceholder(),
                    ),
                    if (hasDiscount)
                      Positioned(
                        top: 8,
                        left: 8,
                        child: Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 8,
                            vertical: 4,
                          ),
                          decoration: BoxDecoration(
                            color: _primaryRed,
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Text(
                            '-$discountPercentage%',
                            style: GoogleFonts.poppins(
                              color: Colors.white,
                              fontSize: 10,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ),
                      ),
                    Positioned(
                      top: 8,
                      right: 8,
                      child: Consumer<WishlistProvider>(
                        builder: (context, wishlist, _) {
                          final isWished = wishlist.isInWishlist(productId);
                          return GestureDetector(
                            onTap: () async {
                              final auth = Provider.of<AuthProvider>(context, listen: false);
                              if (!auth.isLoggedIn) {
                                _showLoginDialog(context, t('login_to_wishlist'));
                                return;
                              }
                              final result = await wishlist.toggleWishlist(productId);
                              if (!context.mounted) return;
                              if (result['success'] != true) {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  SnackBar(content: Text(result['error'] ?? 'Failed to update wishlist'), duration: const Duration(seconds: 2)),
                                );
                              } else if (result['offline'] == true) {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  SnackBar(content: const Text('Added to wishlist (offline)'), duration: const Duration(seconds: 2)),
                                );
                              }
                            },
                            child: Container(
                              padding: const EdgeInsets.all(8),
                              decoration: BoxDecoration(
                                color: Colors.white,
                                shape: BoxShape.circle,
                                boxShadow: [
                                  BoxShadow(
                                    color: Colors.black.withValues(alpha: 0.1),
                                    blurRadius: 8,
                                    offset: const Offset(0, 2),
                                  ),
                                ],
                              ),
                              child: Icon(
                                isWished ? Icons.favorite : Icons.favorite_border,
                                size: 18,
                                color: isWished
                                    ? _primaryRed
                                    : _textGray,
                              ),
                            ),
                          );
                        },
                      ),
                    ),
                  ],
                ),
              ),
              Expanded(
                flex: 2,
                child: Padding(
                  padding: const EdgeInsets.all(12),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        productName,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: GoogleFonts.poppins(
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                          color: _textDark,
                          height: 1.3,
                        ),
                      ),
                      if (showStoreName && storeName != null) ...[
                        const SizedBox(height: 4),
                        Row(
                          children: [
                            Icon(
                              Icons.storefront_outlined,
                              size: 11,
                              color: _textGray,
                            ),
                            const SizedBox(width: 3),
                            Expanded(
                              child: Text(
                                storeName,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: GoogleFonts.poppins(
                                  fontSize: 10,
                                  color: _textGray,
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ],
                      const Spacer(),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                '\$${discountPrice.toStringAsFixed(2)}',
                                style: GoogleFonts.poppins(
                                  fontSize: 16,
                                  fontWeight: FontWeight.w700,
                                  color: _primaryRed,
                                ),
                              ),
                              if (hasDiscount)
                                Text(
                                  '\$${basePrice.toStringAsFixed(2)}',
                                  style: GoogleFonts.poppins(
                                    fontSize: 10,
                                    decoration: TextDecoration.lineThrough,
                                    color: _textGray,
                                  ),
                                ),
                            ],
                          ),
                          Consumer<CartProvider>(
                            builder: (context, cart, _) {
                              final cartItem = cart.getCartItem(productId);
                              final quantity = cartItem?.quantity ?? 0;

                              if (quantity > 0) {
                                final isMaxReached = quantity >= 5;
                                return _QuantityToggle(
                                  quantity: quantity,
                                  isMaxReached: isMaxReached,
                                  onIncrease: isMaxReached
                                      ? () {
                                          CartNotificationService.showMaxQuantityReached(context);
                                        }
                                      : () async {
                                          final auth = Provider.of<AuthProvider>(context, listen: false);
                                          if (!auth.isLoggedIn) {
                                            _showLoginDialog(context, t('login_to_cart'));
                                            return;
                                          }
                                          await cart.addToCart(
                                            productId,
                                            productStoreId: storeId,
                                            productStoreName: storeName,
                                          );
                                        },
                                  onDecrease: () {
                                    if (quantity == 1 && cartItem != null) {
                                      cart.removeItem(cartItem.id);
                                    } else if (cartItem != null) {
                                      cart.updateQuantity(cartItem.id, quantity - 1);
                                    }
                                  },
                                );
                              } else {
                                return _AddToCartButton(
                                  onPressed: () async {
                                    final auth = Provider.of<AuthProvider>(context, listen: false);
                                    if (!auth.isLoggedIn) {
                                      _showLoginDialog(context, t('login_to_cart'));
                                      return;
                                    }
                                    await cart.addToCart(
                                      productId,
                                      productStoreId: storeId,
                                      productStoreName: storeName,
                                    );
                                  },
                                );
                              }
                            },
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    ),
    );
  }

  void _showLoginDialog(BuildContext context, [String message = '']) {
    final t = AppLocalizations.of(context).translate;
    if (message.isEmpty) message = t('login_to_wishlist');
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Text(t('login_required'), style: GoogleFonts.poppins(fontWeight: FontWeight.w600)),
        content: Text(message, style: GoogleFonts.poppins()),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: Text(t('cancel'), style: GoogleFonts.poppins(color: _textGray)),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(ctx);
              Navigator.pushNamed(context, '/login');
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: _primaryRed,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
            ),
            child: Text(t('login'), style: GoogleFonts.poppins(color: Colors.white, fontWeight: FontWeight.w600)),
          ),
        ],
      ),
    );
  }

  Widget _buildPlaceholder() {
    return Center(
      child: Icon(
        Icons.shopping_bag_outlined,
        size: 40,
        color: _textGray,
      ),
    );
  }
}

class _AddToCartButton extends StatelessWidget {
  final VoidCallback onPressed;

  const _AddToCartButton({required this.onPressed});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onPressed,
      child: Container(
        width: 40,
        height: 40,
        decoration: BoxDecoration(
          color: _primaryRed,
          borderRadius: BorderRadius.circular(12),
          boxShadow: [
            BoxShadow(
              color: _primaryRed.withValues(alpha: 0.4),
              blurRadius: 8,
              offset: const Offset(0, 3),
            ),
          ],
        ),
        child: const Icon(
          Icons.add,
          color: Colors.white,
          size: 20,
        ),
      ),
    );
  }
}

class _QuantityToggle extends StatelessWidget {
  final int quantity;
  final bool isMaxReached;
  final VoidCallback? onIncrease;
  final VoidCallback onDecrease;

  const _QuantityToggle({
    required this.quantity,
    this.isMaxReached = false,
    this.onIncrease,
    required this.onDecrease,
  });

  @override
  Widget build(BuildContext context) {
    final t = AppLocalizations.of(context).translate;
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          decoration: BoxDecoration(
            color: _bgLight,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: isMaxReached
                  ? _amber.withValues(alpha: 0.5)
                  : _borderGray,
              width: isMaxReached ? 1.5 : 1,
            ),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              GestureDetector(
                onTap: onDecrease,
                child: Container(
                  width: 32,
                  height: 32,
                  decoration: const BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.horizontal(left: Radius.circular(11)),
                  ),
                  child: Icon(
                    Icons.remove,
                    size: 16,
                    color: quantity == 1
                        ? _primaryRed
                        : _textDark,
                  ),
                ),
              ),
              Container(
                width: 32,
                height: 32,
                alignment: Alignment.center,
                child: Text(
                  quantity.toString(),
                  style: GoogleFonts.poppins(
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
                    color: isMaxReached
                        ? _amber
                        : _textDark,
                  ),
                ),
              ),
              GestureDetector(
                onTap: onIncrease,
                child: Container(
                  width: 32,
                  height: 32,
                  decoration: BoxDecoration(
                    color: isMaxReached
                        ? _amber
                        : _primaryRed,
                    borderRadius: BorderRadius.horizontal(right: Radius.circular(11)),
                  ),
                  child: Icon(
                    isMaxReached ? Icons.block : Icons.add,
                    size: 16,
                    color: Colors.white,
                  ),
                ),
              ),
            ],
          ),
        ),
        if (isMaxReached)
          Padding(
            padding: const EdgeInsets.only(top: 4),
            child: Text(
              t('max_stock'),
              style: GoogleFonts.poppins(
                fontSize: 9,
                fontWeight: FontWeight.w500,
                color: _amber,
              ),
            ),
          ),
      ],
    );
  }
}
