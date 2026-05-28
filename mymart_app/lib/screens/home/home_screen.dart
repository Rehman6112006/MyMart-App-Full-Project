import 'dart:async';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../../config/theme.dart';
import '../../providers/product_provider.dart';
import '../../providers/cart_provider.dart';
import '../../providers/wishlist_provider.dart';
import '../../providers/auth_provider.dart';
import '../../models/product.dart';
import '../../widgets/network_image.dart';
import '../../services/location_service.dart';
import '../../widgets/shimmer_loaders.dart';
import '../product/product_detail_screen.dart';
import '../product/product_list_screen.dart';
import '../search/search_screen.dart';
import '../location/location_sheet.dart';
import '../../localization/app_localizations.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  String Function(String) get t => AppLocalizations.of(context).translate;
  final PageController _bannerController = PageController();
  final ScrollController _scrollController = ScrollController();
  int _currentBanner = 0;
  Timer? _bannerAutoTimer;
  String? _liveAddress;
  double? _lat;
  double? _lng;
  bool _locating = false;
  bool _locationError = false;

  // Default categories with proper IDs (slug format)
  final List<Map<String, dynamic>> _defaultCategories = [
    {'id': 'fresh-vegetables', 'name': 'Fresh Vegetables', 'icon': Icons.eco, 'color': const Color(0xFF22C55E), 'bg': const Color(0xFFDCFCE7)},
    {'id': 'fresh-fruits', 'name': 'Fresh Fruits', 'icon': Icons.apple, 'color': const Color(0xFFEF4444), 'bg': const Color(0xFFFEE2E2)},
    {'id': 'chicken-meat-eggs', 'name': 'Chicken/Meat/Eggs', 'icon': Icons.restaurant, 'color': const Color(0xFFB45309), 'bg': const Color(0xFFFEF3C7)},
    {'id': 'dairy-products', 'name': 'Dairy Products', 'icon': Icons.water_drop, 'color': const Color(0xFF3B82F6), 'bg': const Color(0xFFDBEAFE)},
    {'id': 'dry-grocery', 'name': 'Dry Grocery', 'icon': Icons.inventory_2, 'color': const Color(0xFFF59E0B), 'bg': const Color(0xFFFEF9C3)},
    {'id': 'snacks-beverages', 'name': 'Snacks & Beverages', 'icon': Icons.local_cafe, 'color': const Color(0xFF8B5CF6), 'bg': const Color(0xFFEDE9FE)},
    {'id': 'bakery-breakfast', 'name': 'Bakery & Breakfast', 'icon': Icons.cake, 'color': const Color(0xFFEC4899), 'bg': const Color(0xFFFCE7F3)},
    {'id': 'frozen-foods', 'name': 'Frozen Foods', 'icon': Icons.ac_unit, 'color': const Color(0xFF06B6D4), 'bg': const Color(0xFFCFFAFE)},
    {'id': 'personal-care', 'name': 'Personal Care', 'icon': Icons.spa, 'color': const Color(0xFF10B981), 'bg': const Color(0xFFD1FAE5)},
    {'id': 'home-kitchen', 'name': 'Home & Kitchen', 'icon': Icons.home, 'color': const Color(0xFF6366F1), 'bg': const Color(0xFFEEF2FF)},
  ];

  @override
  void initState() {
    super.initState();
    _loadData();
    _fetchLiveLocation();
    _scrollController.addListener(_onScroll);
    _startBannerAutoPlay();
  }

  void _startBannerAutoPlay() {
    _bannerAutoTimer = Timer.periodic(const Duration(seconds: 4), (timer) {
      if (!mounted) return;
      // Check if controller is attached to PageView
      if (!_bannerController.hasClients) return;
      final provider = Provider.of<ProductProvider>(context, listen: false);
      if (provider.banners.isEmpty) return;
      final nextPage = (_currentBanner + 1) % provider.banners.length;
      _bannerController.animateToPage(
        nextPage,
        duration: const Duration(milliseconds: 500),
        curve: Curves.easeInOut,
      );
    });
  }

  Future<void> _loadData() async {
    if (!mounted) return;
    await Provider.of<ProductProvider>(context, listen: false).loadHomeData();
  }

  void _onScroll() {
  }

  Future<void> _fetchLiveLocation() async {
    if (_locating) return;
    setState(() {
      _locating = true;
      _locationError = false;
    });
    final result = await LocationService.getCurrentLocation();
    if (!mounted) return;
    setState(() {
      _locating = false;
      if (result['success']) {
        _liveAddress = result['address'];
        _lat = result['latitude'];
        _lng = result['longitude'];
        _locationError = false;
      } else {
        _locationError = true;
      }
    });
  }

  void _onLocationSelected(String address, double lat, double lng) {
    setState(() {
      _liveAddress = address;
      _lat = lat;
      _lng = lng;
      _locationError = false;
    });
  }

  String _getCategoryImage(String categoryName) {
    final n = categoryName.toLowerCase();
    if (n.contains('vegetable')) return 'assets/images/fresh Vegetables.png';
    if (n.contains('fruit')) return 'assets/images/Fruites.png';
    if (n.contains('meat') || n.contains('egg') || n.contains('chicken')) return 'assets/images/Meat & Eggs.png';
    if (n.contains('dairy') || n.contains('milk')) return 'assets/images/Drinks.png';
    if (n.contains('grocery') || n.contains('dry')) return 'assets/images/Daily grocesry.png';
    if (n.contains('snack') || n.contains('beverage')) return 'assets/images/snacks.png';
    if (n.contains('bakery') || n.contains('breakfast')) return 'assets/images/Bakery.png';
    if (n.contains('frozen')) return 'assets/images/frozen food.png';
    if (n.contains('personal') || n.contains('care')) return 'assets/images/Personal care.png';
    if (n.contains('home') || n.contains('kitchen') || n.contains('household')) return 'assets/images/house hold.png';
    if (n.contains('clean')) return 'assets/images/cleaning.png';
    if (n.contains('drink')) return 'assets/images/Drinks.png';
    return 'assets/images/logo.png';
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.background,
      body: RefreshIndicator(
        onRefresh: _loadData,
        color: AppTheme.primary,
        child: CustomScrollView(
          controller: _scrollController,
          physics: const AlwaysScrollableScrollPhysics(),
          slivers: [
            SliverToBoxAdapter(
              child: Consumer<ProductProvider>(
                builder: (context, provider, child) {
                  if (provider.isLoading && provider.allProducts.isEmpty) {
                    return const ShimmerHomeTop();
                  }

                  return Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Live location area (top)
                      _buildLiveLocationArea(),
                      const SizedBox(height: 12),
                      // Search bar
                      _buildSearchBar(),
                      const SizedBox(height: 12),
                      // Full-width Banners
                      _buildBannerSlider(provider),
                      const SizedBox(height: 16),
                      // All Categories in grid (2–3 rows)
                      _buildCategoryGrid(provider),
                      const SizedBox(height: 4),
                      // All vendor products
                      _buildAllProductsSection(provider),
                      const SizedBox(height: 80),
                    ],
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSearchBar() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: GestureDetector(
        onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const SearchScreen())),
        child: Container(
          height: 48,
          decoration: BoxDecoration(
            color: AppTheme.surface,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: AppTheme.divider.withValues(alpha: 0.8)),
            boxShadow: AppTheme.shadowSm,
          ),
          child: Row(
            children: [
              const SizedBox(width: 16),
              Icon(Icons.search_rounded, color: AppTheme.textTertiary, size: 22),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  t('search_products'),
                  style: GoogleFonts.inter(color: AppTheme.textTertiary, fontSize: 14, fontWeight: FontWeight.w400),
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildLiveLocationArea() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 40, 16, 0),
      child: GestureDetector(
        onTap: () {
          showModalBottomSheet(
            context: context,
            shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
            builder: (_) => LocationSheet(
              currentAddress: _liveAddress,
              currentLatitude: _lat,
              currentLongitude: _lng,
              onLocationSelected: _onLocationSelected,
            ),
          );
        },
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
          decoration: const BoxDecoration(
            border: Border(bottom: BorderSide(color: AppTheme.primary, width: 1.5)),
          ),
          child: Row(
            children: [
              Icon(
                _locationError ? Icons.location_off : Icons.location_on,
                color: AppTheme.primary,
                size: 22,
              ),
              const SizedBox(width: 6),
              Expanded(
                child: _locating
                  ? Row(children: [
                      Text('Detecting...', style: GoogleFonts.inter(fontSize: 12, color: AppTheme.textPrimary, fontWeight: FontWeight.w500)),
                    ])
                  : Text(
                      _locationError
                        ? 'Tap to enable location'
                        : _liveAddress != null
                          ? 'Deliver to $_liveAddress'
                          : 'Tap to detect location',
                      style: GoogleFonts.inter(fontSize: 12, color: AppTheme.primary, fontWeight: FontWeight.w500),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
              ),
              const SizedBox(width: 4),
              Icon(Icons.chevron_right, size: 18, color: AppTheme.primary),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildBannerSlider(ProductProvider provider) {
    final banners = provider.banners;
    if (banners.isEmpty) {
      return Container(
        margin: const EdgeInsets.symmetric(horizontal: 16),
        height: 170,
        decoration: BoxDecoration(
          gradient: AppTheme.primaryGradient,
          borderRadius: BorderRadius.circular(16),
        ),
        child: Center(
          child: Text(
            t('welcome'),
            style: GoogleFonts.inter(color: Colors.white, fontSize: 22, fontWeight: FontWeight.bold),
          ),
        ),
      );
    }

    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16),
      child: Column(
        children: [
          ClipRRect(
            borderRadius: BorderRadius.circular(16),
            child: SizedBox(
              height: 170,
              child: PageView.builder(
                controller: _bannerController,
                itemCount: banners.length,
                onPageChanged: (index) => setState(() => _currentBanner = index),
                itemBuilder: (context, index) {
                  final banner = banners[index];
                  Color bannerColor;
                  try {
                    bannerColor = Color(int.parse(
                      (banner['background_color'] ?? banner['color'] ?? 'FF059669').toString().replaceAll('#', ''),
                      radix: 16,
                    ));
                  } catch (e) {
                    bannerColor = const Color(0xFF059669);
                  }
                  return GestureDetector(
                    onTap: () {
                      final linkType = banner['link_type'] ?? 'none';
                      final linkValue = banner['link_value'] ?? '';
                      if (linkType == 'product' && linkValue.toString().isNotEmpty) {
                        Navigator.push(context, MaterialPageRoute(builder: (_) => ProductDetailScreen(productId: linkValue.toString())));
                      } else if (linkType == 'category' && linkValue.toString().isNotEmpty) {
                        Navigator.push(context, MaterialPageRoute(builder: (_) => ProductListScreen(categoryId: linkValue.toString(), categoryName: banner['title'] ?? 'Products')));
                      } else if (linkType == 'url' && linkValue.toString().isNotEmpty) {
                        launchUrl(Uri.parse(linkValue.toString()), mode: LaunchMode.externalApplication);
                      }
                    },
                    child: Container(
                      decoration: BoxDecoration(
                        image: (banner['image_url'] ?? banner['image']) != null
                            ? DecorationImage(image: CachedNetworkImageProvider(banner['image_url'] ?? banner['image']), fit: BoxFit.cover, colorFilter: const ColorFilter.mode(Colors.black26, BlendMode.darken))
                            : null,
                        gradient: (banner['image_url'] ?? banner['image']) == null
                            ? LinearGradient(begin: Alignment.topLeft, end: Alignment.bottomRight, colors: [bannerColor, bannerColor.withValues(alpha: 0.7)])
                            : null,
                      ),
                      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Text(banner['title'] ?? '', style: GoogleFonts.inter(color: Colors.white, fontSize: 22, fontWeight: FontWeight.w800), maxLines: 1, overflow: TextOverflow.ellipsis),
                          const SizedBox(height: 4),
                          Text(banner['subtitle'] ?? '', style: GoogleFonts.inter(color: Colors.white, fontSize: 20, fontWeight: FontWeight.bold), maxLines: 1, overflow: TextOverflow.ellipsis),
                        ],
                      ),
                    ),
                  );
                },
              ),
            ),
          ),
          const SizedBox(height: 10),
          _BannerIndicator(count: banners.length, current: _currentBanner),
        ],
      ),
    );
  }

  Widget _buildCategoryGrid(ProductProvider provider) {
    final categories = _defaultCategories;

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 4,
                height: 22,
                decoration: BoxDecoration(
                  color: AppTheme.primary,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              const SizedBox(width: 10),
              Text(
                t('shop_by_category'),
                style: GoogleFonts.inter(
                  fontSize: 17,
                  fontWeight: FontWeight.w700,
                  color: AppTheme.textPrimary,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          GridView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 5,
              mainAxisSpacing: 10,
              crossAxisSpacing: 6,
              childAspectRatio: 0.7,
            ),
            itemCount: categories.length,
            itemBuilder: (context, index) {
              final cat = categories[index];
              return GestureDetector(
                onTap: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (_) => ProductListScreen(
                        title: cat['name'].toString(),
                        categoryId: cat['id']?.toString() ?? cat['name'].toString().toLowerCase(),
                      ),
                    ),
                  );
                },
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Container(
                      width: 48,
                      height: 48,
                      decoration: BoxDecoration(
                        color: cat['bg'] as Color,
                        shape: BoxShape.circle,
                      ),
                      child: Image.asset(
                        _getCategoryImage(cat['name'].toString()),
                        fit: BoxFit.cover,
                        errorBuilder: (_, __, ___) => Icon(
                          cat['icon'] as IconData,
                          color: cat['color'] as Color,
                          size: 24,
                        ),
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      cat['name'].toString(),
                  style: GoogleFonts.inter(
                    fontSize: 9,
                    fontWeight: FontWeight.w600,
                    color: AppTheme.textPrimary,
                  ),
                      textAlign: TextAlign.center,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ),
              );
            },
          ),
        ],
      ),
    );
  }

  Widget _buildAllProductsSection(ProductProvider provider) {
    final products = provider.allProducts;

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  Container(
                    width: 4,
                    height: 22,
                    decoration: BoxDecoration(
                      color: AppTheme.primary,
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Text(
                    t('all_products'),
                    style: GoogleFonts.inter(
                      fontSize: 17,
                      fontWeight: FontWeight.w700,
                      color: AppTheme.textPrimary,
                    ),
                  ),
                ],
              ),
              Text(
                '${products.length} ${t('items')}',
                style: GoogleFonts.inter(
                  fontSize: 12,
                  color: AppTheme.textSecondary,
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          if (products.isEmpty && !provider.isLoading)
            Center(
              child: Padding(
                padding: const EdgeInsets.symmetric(vertical: 40),
                child: Column(
                  children: [
                    Icon(Icons.shopping_bag_outlined, size: 60, color: AppTheme.textLight),
                    const SizedBox(height: 12),
                    Text(
                      t('no_data'),
                      style: GoogleFonts.inter(
                        fontSize: 16,
                        color: AppTheme.textSecondary,
                      ),
                    ),
                  ],
                ),
              ),
            )
          else
            _buildPinterestGrid(products),
          if (provider.isLoading && products.isNotEmpty)
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 16),
              child: ShimmerProductGrid(itemCount: 2, crossAxisCount: 2),
            ),
        ],
      ),
    );
  }

  Widget _buildPinterestGrid(List<Product> products) {
    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2,
        crossAxisSpacing: 12,
        mainAxisSpacing: 12,
        childAspectRatio: 0.62,
      ),
      itemCount: products.length,
      itemBuilder: (context, index) {
        return RepaintBoundary(
          child: _PinterestProductCard(
            product: products[index],
            onTap: () {
              Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (_) => ProductDetailScreen(productId: products[index].id),
                ),
              );
            },
            onLoginRequired: () => _showLoginDialog(t('login_to_wishlist')),
          ),
        );
      },
    );
  }

  void _showLoginDialog(String message) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Row(
          children: [
            Icon(Icons.lock_outline, color: AppTheme.primary),
            const SizedBox(width: 8),
            Text(AppLocalizations.of(context).translate('login_required'), style: GoogleFonts.inter(fontWeight: FontWeight.w600)),
          ],
        ),
        content: Text(
          message,
          style: GoogleFonts.inter(),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: Text(AppLocalizations.of(context).translate('cancel'), style: GoogleFonts.inter(color: AppTheme.textSecondary)),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(ctx);
              Navigator.pushNamed(context, '/login');
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: AppTheme.primary,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            ),
            child: Text(AppLocalizations.of(context).translate('login'), style: GoogleFonts.inter(color: Colors.white, fontWeight: FontWeight.w600)),
          ),
        ],
      ),
    );
  }
}

// Pinterest-style product card - Temu/Pinduoduo Style
class _PinterestProductCard extends StatelessWidget {
  final Product product;
  final VoidCallback onTap;
  final VoidCallback? onLoginRequired;

  const _PinterestProductCard({required this.product, required this.onTap, this.onLoginRequired});

  @override
  Widget build(BuildContext context) {
    final hasDiscount = product.hasDiscount;
    final price = product.effectivePrice;
    final originalPrice = product.basePrice;
    final storeName = product.storeName;

    return GestureDetector(
      onTap: onTap,
        child: Container(
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(14),
            boxShadow: AppTheme.shadowSm,
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Product Image with Discount Badge
              Expanded(
                flex: 3,
                child: Stack(
                  children: [
                    // Image
                    ClipRRect(
                      borderRadius: const BorderRadius.vertical(top: Radius.circular(14)),
                    child: SizedBox(
                      width: double.infinity,
                      child: product.images.isNotEmpty
                          ? ProductImage(imageUrl: product.images.first)
                          : Container(
                              color: AppTheme.background,
                              child: const Center(
                                child: Icon(
                                  Icons.shopping_bag_outlined,
                                  size: 40,
                                  color: AppTheme.textLight,
                                ),
                              ),
                            ),
                    ),
                  ),
                  // Discount Badge (Top Left) - Temu Style
                  if (hasDiscount)
                    Positioned(
                      top: 0,
                      left: 0,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: const BoxDecoration(
                          color: AppTheme.sale,
                          borderRadius: BorderRadius.only(
                            topLeft: Radius.circular(12),
                            bottomRight: Radius.circular(12),
                          ),
                        ),
                        child: Text(
                          '-${((originalPrice - price) / originalPrice * 100).round()}%',
                          style: GoogleFonts.inter(
                            color: Colors.white,
                            fontSize: 11,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                    ),
                  // Wishlist Heart Button (Top Right)
                  Positioned(
                    top: 6,
                    right: 6,
                    child: Consumer<WishlistProvider>(
                      builder: (context, wishlist, _) {
                        final isWished = wishlist.isInWishlist(product.id);
                        return GestureDetector(
                          onTap: () async {
                            final result = await wishlist.toggleWishlist(product.id);
                            if (result['unauthorized'] == true) {
                              onLoginRequired?.call();
                            }
                            if (!context.mounted) return;
                            if (result['success'] != true) {
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(content: Text(result['error'] ?? 'Failed to update wishlist'), duration: const Duration(seconds: 2)),
                              );
                            }
                          },
                          child: Container(
                            padding: const EdgeInsets.all(6),
                            decoration: BoxDecoration(
                              color: Colors.white,
                              shape: BoxShape.circle,
                              boxShadow: [
                                BoxShadow(
                                  color: Colors.black.withValues(alpha: 0.1),
                                  blurRadius: 4,
                                  offset: const Offset(0, 2),
                                ),
                              ],
                            ),
                            child: Icon(
                              isWished ? Icons.favorite : Icons.favorite_border,
                              size: 16,
                              color: isWished ? const Color(0xFFFF4D4F) : AppTheme.textLight,
                            ),
                          ),
                        );
                      },
                    ),
                  ),
                  // Sold by badge (Bottom Left)
                  if (storeName != null)
                    Positioned(
                      bottom: 8,
                      left: 8,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: Colors.black.withValues(alpha: 0.6),
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: Text(
                          storeName.length > 12 ? '${storeName.substring(0, 12)}...' : storeName,
                          style: GoogleFonts.inter(
                            color: Colors.white,
                            fontSize: 8,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ),
                    ),
                ],
              ),
            ),
            // Product Info
            Expanded(
              flex: 2,
              child: Padding(
                padding: const EdgeInsets.all(10),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Product name
                    Expanded(
                      child: Text(
                        product.name,
                        style: GoogleFonts.inter(
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                          color: AppTheme.textPrimary,
                          height: 1.2,
                        ),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    const SizedBox(height: 4),
                    // Price + Add to Cart
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        // Price
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              '\$${price.toStringAsFixed(2)}',
                              style: GoogleFonts.inter(
                                fontSize: 16,
                                fontWeight: FontWeight.w800,
                                color: AppTheme.primary,
                              ),
                            ),
                            if (hasDiscount)
                              Text(
                                '\$${originalPrice.toStringAsFixed(2)}',
                                style: GoogleFonts.inter(
                                  fontSize: 10,
                                  color: AppTheme.textLight,
                                  decoration: TextDecoration.lineThrough,
                                ),
                              ),
                          ],
                        ),
                        // Quantity Toggle Button
                        _QuantityToggleButton(product: product),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// Quantity Toggle Button with +/- controls - Temu Style
class _QuantityToggleButton extends StatefulWidget {
  final Product product;

  const _QuantityToggleButton({required this.product});

  @override
  State<_QuantityToggleButton> createState() => _QuantityToggleButtonState();
}

class _QuantityToggleButtonState extends State<_QuantityToggleButton>
    with SingleTickerProviderStateMixin {
  String Function(String) get t => AppLocalizations.of(context).translate;
  late AnimationController _animController;
  late Animation<double> _scaleAnim;

  @override
  void initState() {
    super.initState();
    _animController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 150),
      lowerBound: 0.9,
      upperBound: 1.0,
      value: 1.0,
    );
    _scaleAnim = _animController;
  }

  @override
  void dispose() {
    _animController.dispose();
    super.dispose();
  }

  Future<void> _bounce() async {
    await _animController.reverse();
    await _animController.forward();
  }

  void _showLoginDialog() {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Row(
          children: [
            Icon(Icons.lock_outline, color: AppTheme.primary),
            const SizedBox(width: 8),
            Text(AppLocalizations.of(context).translate('login_required'), style: GoogleFonts.inter(fontWeight: FontWeight.w600)),
          ],
        ),
        content: Text(
          AppLocalizations.of(context).translate('login_to_cart'),
          style: GoogleFonts.inter(),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: Text(AppLocalizations.of(context).translate('cancel'), style: GoogleFonts.inter(color: AppTheme.textSecondary)),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(ctx);
              Navigator.pushNamed(context, '/login');
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: AppTheme.primary,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            ),
            child: Text(AppLocalizations.of(context).translate('login'), style: GoogleFonts.inter(color: Colors.white, fontWeight: FontWeight.w600)),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Consumer<CartProvider>(
      builder: (context, cart, child) {
        final inCart = cart.isInCart(widget.product.id);
        final quantity = cart.getQuantity(widget.product.id);

        if (inCart && quantity > 0) {
          // Show quantity controls (Temu style)
          return _buildQuantityControls(cart, quantity);
        } else {
          // Show add to cart button
          return _buildAddButton();
        }
      },
    );
  }

  Widget _buildAddButton() {
    return ScaleTransition(
      scale: _scaleAnim,
      child: GestureDetector(
        onTap: () async {
          await _bounce();
          if (!mounted) return;
          
          // Check login first before adding to cart
          final auth = Provider.of<AuthProvider>(context, listen: false);
          if (!auth.isLoggedIn) {
            _showLoginDialog();
            return;
          }
          
          final cart = Provider.of<CartProvider>(context, listen: false);
          final result = await cart.addToCart(
            widget.product.id,
            productStoreId: widget.product.storeId,
            productStoreName: widget.product.storeName,
          );

          if (!mounted) return;
          
          if (result['unauthorized'] == true || result['message']?.contains('login') == true) {
            _showLoginDialog();
            return;
          }
          
          if (result['success'] != true) {
            final message = result['message'] ?? '';
            if (message.contains('token') || message.contains('login') || message.contains('auth')) {
              _showLoginDialog();
            } else {
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text(result['message'] ?? 'Failed to add'),
                  backgroundColor: Colors.red,
                  duration: const Duration(seconds: 2),
                ),
              );
            }
          }
        },
        child: Container(
          width: 36,
          height: 36,
          decoration: BoxDecoration(
            color: AppTheme.primary,
            borderRadius: BorderRadius.circular(10),
            boxShadow: [
              BoxShadow(
                color: AppTheme.primary.withValues(alpha: 0.3),
                blurRadius: 4,
                offset: const Offset(0, 2),
              ),
            ],
          ),
          child: const Icon(Icons.add, color: Colors.white, size: 20),
        ),
      ),
    );
  }

  Widget _buildQuantityControls(CartProvider cart, int quantity) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: AppTheme.primary, width: 1.5),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Minus button
          _QuantityButton(
            icon: Icons.remove,
            onTap: () async {
              await _bounce();
              if (!mounted) return;
              
              if (quantity > 1) {
                final item = cart.getCartItem(widget.product.id);
                if (item != null) {
                  await cart.updateQuantity(item.id, quantity - 1);
                }
              } else {
                // Remove from cart
                final item = cart.getCartItem(widget.product.id);
                if (item != null) {
                  await cart.removeItem(item.id);
                }
              }
            },
          ),
          // Quantity
          Container(
            constraints: const BoxConstraints(minWidth: 28),
            alignment: Alignment.center,
            padding: const EdgeInsets.symmetric(horizontal: 4),
            child: Text(
              quantity.toString(),
              style: GoogleFonts.inter(
                fontSize: 13,
                fontWeight: FontWeight.w700,
                color: AppTheme.textPrimary,
              ),
            ),
          ),
          // Plus button
          _QuantityButton(
            icon: Icons.add,
            onTap: () async {
              await _bounce();
              if (!mounted) return;
              
              // Check login first
              final auth = Provider.of<AuthProvider>(context, listen: false);
              if (!auth.isLoggedIn) {
                _showLoginDialog();
                return;
              }
              
              final item = cart.getCartItem(widget.product.id);
              if (item != null) {
                // Check stock
                if (item.stockQuantity != null && quantity >= item.stockQuantity!) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text(t('max_stock')),
                      backgroundColor: Colors.orange,
                      duration: Duration(seconds: 1),
                    ),
                  );
                  return;
                }
                await cart.updateQuantity(item.id, quantity + 1);
              }
            },
          ),
        ],
      ),
    );
  }
}

class _QuantityButton extends StatefulWidget {
  final IconData icon;
  final VoidCallback onTap;

  const _QuantityButton({required this.icon, required this.onTap});

  @override
  State<_QuantityButton> createState() => _QuantityButtonState();
}

class _QuantityButtonState extends State<_QuantityButton>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _scaleAnim;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 100),
      lowerBound: 0.85,
      upperBound: 1.0,
      value: 1.0,
    );
    _scaleAnim = _controller;
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () async {
        await _controller.reverse();
        await _controller.forward();
        widget.onTap();
      },
      child: ScaleTransition(
        scale: _scaleAnim,
        child: Container(
          width: 24,
          height: 24,
          decoration: BoxDecoration(
            color: AppTheme.primary.withValues(alpha: 0.1),
            borderRadius: BorderRadius.circular(4),
          ),
          child: Icon(
            widget.icon,
            size: 14,
            color: AppTheme.primary,
          ),
        ),
      ),
    );
  }
}

class _BannerIndicator extends StatelessWidget {
  final int count;
  final int current;

  const _BannerIndicator({required this.count, required this.current});

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: List.generate(
        count,
        (index) => AnimatedContainer(
          duration: const Duration(milliseconds: 300),
          margin: const EdgeInsets.symmetric(horizontal: 3),
          width: current == index ? 20 : 7,
          height: 7,
          decoration: BoxDecoration(
            color: current == index ? AppTheme.primary : AppTheme.divider,
            borderRadius: BorderRadius.circular(4),
          ),
        ),
      ),
    );
  }
}

