import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../config/theme.dart';
import '../../providers/wishlist_provider.dart';
import '../../widgets/shimmer_loaders.dart';
import '../../localization/app_localizations.dart';

class WishlistScreen extends StatelessWidget {
  const WishlistScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final t = AppLocalizations.of(context).translate;
    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        backgroundColor: AppTheme.surface,
        elevation: 0,
        title: Text(t('my_wishlist'), style: GoogleFonts.poppins(fontSize: 18, fontWeight: FontWeight.w700)),
      ),
      body: Consumer<WishlistProvider>(
        builder: (context, wishlist, _) {
          if (wishlist.isLoading && wishlist.items.isEmpty) {
            return const ShimmerWishlist();
          }

          if (wishlist.items.isEmpty && wishlist.wishlistProductIds.isEmpty) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.favorite_border, size: 80, color: AppTheme.textLight),
                  const SizedBox(height: 16),
                  Text(
                    t('wishlist_empty'),
                    style: GoogleFonts.poppins(fontSize: 18, color: AppTheme.textSecondary),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    t('save_items'),
                    style: GoogleFonts.poppins(color: AppTheme.textLight),
                  ),
                ],
              ),
            );
          }

          if (wishlist.items.isEmpty && wishlist.wishlistProductIds.isNotEmpty) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.cloud_off, size: 60, color: AppTheme.textLight),
                  const SizedBox(height: 16),
                  Text(
                    '${wishlist.count} ${t('items_saved_offline')}',
                    style: GoogleFonts.poppins(fontSize: 16, color: AppTheme.textSecondary),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    t('connect_for_details'),
                    style: GoogleFonts.poppins(color: AppTheme.textLight, fontSize: 13),
                  ),
                  const SizedBox(height: 16),
                  TextButton.icon(
                    onPressed: () => wishlist.loadWishlist(),
                    icon: const Icon(Icons.refresh),
                    label: Text(t('try_again')),
                  ),
                ],
              ),
            );
          }

          return ListView.builder(
            padding: const EdgeInsets.all(16),
            itemCount: wishlist.items.length,
            itemBuilder: (context, index) {
              final item = wishlist.items[index];
              final product = item['product'] ?? item;
              
              return Container(
                margin: const EdgeInsets.only(bottom: 12),
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: AppTheme.surface,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: AppTheme.divider),
                ),
                child: Row(
                  children: [
                    Container(
                      width: 70,
                      height: 70,
                      decoration: BoxDecoration(
                        color: AppTheme.background,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      clipBehavior: Clip.antiAlias,
                      child: product['thumbnail'] != null && product['thumbnail'].toString().isNotEmpty
                          ? Image.network(
                              product['thumbnail'].toString(),
                              fit: BoxFit.cover,
                              errorBuilder: (_, _, _) => const Icon(Icons.shopping_bag_outlined, color: AppTheme.textLight),
                            )
                          : const Icon(Icons.shopping_bag_outlined, color: AppTheme.textLight),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            product['name'] ?? product['product_name'] ?? t('product'),
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            style: GoogleFonts.poppins(fontWeight: FontWeight.w600),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            '\$${(num.tryParse((product['effective_price'] ?? product['price'] ?? product['base_price'] ?? '0').toString()) ?? 0).toStringAsFixed(2)}',
                            style: GoogleFonts.poppins(
                              fontWeight: FontWeight.w700,
                              color: AppTheme.primary,
                              fontSize: 16,
                            ),
                          ),
                        ],
                      ),
                    ),
                    Column(
                      children: [
                        IconButton(
                          icon: const Icon(Icons.delete_outline, color: AppTheme.error),
                          onPressed: () {
                            if (item['id'] != null) {
                              wishlist.toggleWishlist(item['product_id']?.toString() ?? '');
                            }
                          },
                        ),
                        IconButton(
                          icon: const Icon(Icons.shopping_cart_outlined, color: AppTheme.primary),
                          onPressed: () {
                            if (item['id'] != null) {
                              wishlist.moveToCart(item['id'].toString());
                            }
                          },
                        ),
                      ],
                    ),
                  ],
                ),
              );
            },
          );
        },
      ),
    );
  }
}
