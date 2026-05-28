import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../config/theme.dart';
import '../../models/product.dart';
import '../../models/review.dart';
import '../../services/product_service.dart';
import '../../services/review_service.dart';
import '../../providers/cart_provider.dart';
import '../../providers/wishlist_provider.dart';
import '../../providers/auth_provider.dart';
import '../order/checkout_screen.dart';
import '../../widgets/network_image.dart';
import '../../widgets/shimmer_loaders.dart';
import '../../widgets/review_card.dart';
import '../../localization/app_localizations.dart';

class ProductDetailScreen extends StatefulWidget {
  final String productId;

  const ProductDetailScreen({super.key, required this.productId});

  @override
  State<ProductDetailScreen> createState() => _ProductDetailScreenState();
}

class _ProductDetailScreenState extends State<ProductDetailScreen> {
  Product? _product;
  List<Product> _relatedProducts = [];
  List<Review> _reviews = [];
  int _totalReviews = 0;
  double? _averageRating;
  int _quantity = 1;
  int _currentImageIndex = 0;

  @override
  void initState() {
    super.initState();
    _loadProduct();
  }

  Future<void> _loadProduct() async {
    final product = await ProductService.getProduct(widget.productId);
    if (mounted) {
      setState(() {
        _product = product;
      });
      if (product != null && product.categoryId != null) {
        _loadRelatedProducts(product.categoryId!);
      }
      if (product != null) {
        _loadReviews();
      }
    }
  }

  Future<void> _loadRelatedProducts(String categoryId) async {
    final result = await ProductService.getProducts(
      categoryId: categoryId,
      limit: 10,
    );
    final products = result['products'] as List<Product>? ?? [];
    setState(() {
      _relatedProducts = products
          .where((p) => p.id != widget.productId)
          .take(6)
          .toList();
    });
  }

  Future<void> _loadReviews() async {
    final result = await ReviewService.getProductReviews(
      productId: widget.productId,
      limit: 5,
    );
    if (!mounted) return;
    if (result['success'] == true) {
      setState(() {
        _reviews = result['reviews'] as List<Review>;
        _totalReviews = result['total'] ?? _reviews.length;
        _averageRating = result['averageRating'] as double?;
      });
    } else {
      debugPrint('Failed to load reviews: ${result['error']}');
    }
  }

  // Get total price for current quantity
  double get total {
    if (_product == null) return 0;
    return _product!.effectivePrice * _quantity;
  }

  void _showLoginDialog([String? message]) {
    final t = AppLocalizations.of(context).translate;
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Row(
          children: [
            const Icon(Icons.lock_outline, color: AppTheme.sale),
            const SizedBox(width: 8),
            Text(t('login_required'), style: GoogleFonts.poppins(fontWeight: FontWeight.w600)),
          ],
        ),
        content: Text(
          message ?? t('login_to_cart'),
          style: GoogleFonts.poppins(),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: Text(t('cancel'), style: GoogleFonts.poppins(color: AppTheme.textSecondary)),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(ctx);
              Navigator.pushNamed(context, '/login');
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: AppTheme.primary,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
            ),
            child: Text(t('login'), style: GoogleFonts.poppins(color: Colors.white, fontWeight: FontWeight.w600)),
          ),
        ],
      ),
    );
  }

  Future<void> _handleAddToCart() async {
    final authProvider = Provider.of<AuthProvider>(context, listen: false);
    if (!authProvider.isLoggedIn) {
      _showLoginDialog();
      return;
    }
    
    final cart = Provider.of<CartProvider>(context, listen: false);
    await cart.addToCart(_product!.id, quantity: _quantity);
  }

  Future<void> _handleBuyNow() async {
    final authProvider = Provider.of<AuthProvider>(context, listen: false);
    if (!authProvider.isLoggedIn) {
      _showLoginDialog();
      return;
    }
    
    final cart = Provider.of<CartProvider>(context, listen: false);
    final result = await cart.addToCart(_product!.id, quantity: _quantity);
    
    if (result['unauthorized'] == true) {
      _showLoginDialog();
      return;
    }
    
    if (mounted) {
      Navigator.push(
        context,
        MaterialPageRoute(
          builder: (_) => CheckoutScreen(
            totalAmount: total,
            quickAdd: true,
          ),
        ),
      );
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
        leading: IconButton(
          icon: Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: AppTheme.background,
              shape: BoxShape.circle,
            ),
            child: const Icon(
              Icons.arrow_back_ios_new,
              size: 18,
              color: AppTheme.textPrimary,
            ),
          ),
          onPressed: () => Navigator.pop(context),
        ),
        title: Text(
          t('product_details'),
          style: GoogleFonts.poppins(fontWeight: FontWeight.w600, fontSize: 16),
        ),
        centerTitle: true,
        actions: [
          if (_product != null)
            Consumer<WishlistProvider>(
              builder: (context, wishlist, _) {
                final isWished = wishlist.isInWishlist(_product!.id);
                return IconButton(
                  icon: Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: AppTheme.background,
                      shape: BoxShape.circle,
                    ),
                    child: Icon(
                      isWished ? Icons.favorite : Icons.favorite_border,
                      color: isWished ? AppTheme.sale : AppTheme.textPrimary,
                      size: 20,
                    ),
                  ),
                  onPressed: () async {
                    final result = await wishlist.toggleWishlist(_product!.id);
                    if (result['unauthorized'] == true) {
                      _showLoginDialog();
                    }
                    if (!context.mounted) return;
                    if (result['success'] != true) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(content: Text(result['error'] ?? 'Failed to update wishlist'), duration: const Duration(seconds: 2)),
                      );
                    }
                  },
                );
              },
            ),
          const SizedBox(width: 8),
        ],
      ),
      body: _product == null
          ? const SingleChildScrollView(
              child: ShimmerProductDetail(),
            )
          : Column(
              children: [
                Expanded(
                  child: SingleChildScrollView(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        _buildImageGallery(),
                        _buildProductInfo(),
                        _buildQuantitySelector(),
                        if (_product!.description != null) _buildDescription(),
                        _buildReviewsSection(),
                        if (_relatedProducts.isNotEmpty)
                          _buildRelatedProducts(),
                        const SizedBox(height: 100),
                      ],
                    ),
                  ),
                ),
                _buildBottomBar(),
              ],
            ),
    );
  }

  Widget _buildImageGallery() {
    if (_product!.images.isEmpty) {
      return Container(
        height: 300,
        color: AppTheme.background,
        child: const Center(
          child: Icon(
            Icons.shopping_bag_outlined,
            size: 80,
            color: AppTheme.textLight,
          ),
        ),
      );
    }

    return Column(
      children: [
        Container(
          height: 300,
          color: AppTheme.surface,
          child: PageView.builder(
            itemCount: _product!.images.length,
            onPageChanged: (index) {
              setState(() => _currentImageIndex = index);
            },
            itemBuilder: (context, index) {
              return ProductImage(
                imageUrl: _product!.images[index],
                fit: BoxFit.contain,
              );
            },
          ),
        ),
        if (_product!.images.length > 1)
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 12),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: List.generate(
                _product!.images.length,
                (index) => Container(
                  margin: const EdgeInsets.symmetric(horizontal: 4),
                  width: _currentImageIndex == index ? 24 : 8,
                  height: 8,
                  decoration: BoxDecoration(
                    color: _currentImageIndex == index
                        ? AppTheme.primary
                        : AppTheme.divider,
                    borderRadius: BorderRadius.circular(4),
                  ),
                ),
              ),
            ),
          ),
      ],
    );
  }

  Widget _buildProductInfo() {
    final t = AppLocalizations.of(context).translate;
    final hasDiscount = _product!.hasDiscount;
    final discountPercent = hasDiscount
        ? _product!.discountPercentage?.toInt() ?? 0
        : 0;

    return Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (_product!.brand != null)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(
                color: AppTheme.primaryExtraLight,
                borderRadius: BorderRadius.circular(8),
              ),
              child: Text(
                _product!.brand!.toUpperCase(),
                style: GoogleFonts.poppins(
                  color: AppTheme.primaryDark,
                  fontSize: 11,
                  fontWeight: FontWeight.w700,
                  letterSpacing: 1,
                ),
              ),
            ),
          const SizedBox(height: 12),
          Text(
            _product!.name,
            style: GoogleFonts.poppins(
              fontSize: 22,
              fontWeight: FontWeight.w700,
              color: AppTheme.textPrimary,
            ),
          ),
          const SizedBox(height: 8),
          Row(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                '\$${_product!.effectivePrice.toStringAsFixed(2)}',
                style: GoogleFonts.poppins(
                  fontSize: 26,
                  fontWeight: FontWeight.w800,
                  color: AppTheme.primary,
                ),
              ),
              const SizedBox(width: 8),
              if (hasDiscount) ...[
                Text(
                  '\$${_product!.basePrice.toStringAsFixed(2)}',
                  style: GoogleFonts.poppins(
                    fontSize: 16,
                    decoration: TextDecoration.lineThrough,
                    color: AppTheme.textLight,
                  ),
                ),
                const SizedBox(width: 8),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 8,
                    vertical: 4,
                  ),
                  decoration: BoxDecoration(
                    color: AppTheme.saleLight,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    '-$discountPercent%',
                    style: GoogleFonts.poppins(
                      color: AppTheme.sale,
                      fontSize: 12,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
              ],
            ],
          ),
          const SizedBox(height: 16),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            decoration: BoxDecoration(
              color: _product!.isInStock
                  ? AppTheme.primaryExtraLight
                  : AppTheme.saleLight,
              borderRadius: BorderRadius.circular(12),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(
                  _product!.isInStock ? Icons.check_circle : Icons.cancel,
                  color: _product!.isInStock ? AppTheme.primary : AppTheme.sale,
                  size: 18,
                ),
                const SizedBox(width: 6),
                Text(
                  _product!.isInStock
                      ? '${t("in_stock")} (${_product!.stockQuantity} available)'
                      : t('out_of_stock'),
                  style: GoogleFonts.poppins(
                    color: _product!.isInStock
                        ? AppTheme.primaryDark
                        : AppTheme.sale,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          if (_product!.storeName != null)
            Row(
              children: [
                const Icon(Icons.store, size: 16, color: AppTheme.textLight),
                const SizedBox(width: 6),
                Text(
                  '${t("sold_by")}: ${_product!.storeName}',
                  style: GoogleFonts.poppins(
                    color: AppTheme.textSecondary,
                    fontSize: 13,
                  ),
                ),
              ],
            ),
        ],
      ),
    );
  }

  Widget _buildQuantitySelector() {
    final t = AppLocalizations.of(context).translate;
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppTheme.surface,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: AppTheme.cardShadow,
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Row(
        children: [
          Text(
            '${t("quantity")}:',
            style: GoogleFonts.poppins(
              fontWeight: FontWeight.w600,
              fontSize: 16,
              color: AppTheme.textPrimary,
            ),
          ),
          const Spacer(),
          _quantityButton(Icons.remove, () {
            if (_quantity > 1) setState(() => _quantity--);
          }),
          Container(
            width: 56,
            alignment: Alignment.center,
            child: Text(
              '$_quantity',
              style: GoogleFonts.poppins(
                fontSize: 20,
                fontWeight: FontWeight.w700,
                color: AppTheme.textPrimary,
              ),
            ),
          ),
          _quantityButton(Icons.add, () {
            if (_quantity < _product!.stockQuantity) {
              setState(() => _quantity++);
            }
          }),
        ],
      ),
    );
  }

  Widget _quantityButton(IconData icon, VoidCallback onTap) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 40,
        height: 40,
        decoration: BoxDecoration(
          color: AppTheme.primaryExtraLight,
          borderRadius: BorderRadius.circular(12),
        ),
        child: Icon(icon, size: 20, color: AppTheme.primary),
      ),
    );
  }

  Widget _buildDescription() {
    final t = AppLocalizations.of(context).translate;
    return Container(
      margin: const EdgeInsets.all(16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppTheme.surface,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: AppTheme.cardShadow,
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.info_outline, color: AppTheme.primary, size: 20),
              const SizedBox(width: 8),
              Text(
                t('product_details'),
                style: GoogleFonts.poppins(
                  fontSize: 16,
                  fontWeight: FontWeight.w700,
                  color: AppTheme.textPrimary,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            _product!.description ?? t('no_description'),
            style: GoogleFonts.poppins(
              fontSize: 14,
              color: AppTheme.textSecondary,
              height: 1.6,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildReviewsSection() {
    final t = AppLocalizations.of(context).translate;
    return Container(
      margin: const EdgeInsets.all(16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppTheme.surface,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(color: AppTheme.cardShadow, blurRadius: 10, offset: const Offset(0, 4)),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
            Row(
              children: [
                const Icon(Icons.star, color: Color(0xFFFFB800), size: 20),
                const SizedBox(width: 6),
                Text(
                  _averageRating != null ? _averageRating!.toStringAsFixed(1) : '0.0',
                  style: GoogleFonts.poppins(fontSize: 18, fontWeight: FontWeight.w700, color: AppTheme.textPrimary),
                ),
                const SizedBox(width: 4),
                Text(
                  '($_totalReviews reviews)',
                  style: GoogleFonts.poppins(fontSize: 12, color: AppTheme.textSecondary),
                ),
              ],
            ),
          const SizedBox(height: 12),
          if (_reviews.isEmpty)
            Center(
              child: Padding(
                padding: const EdgeInsets.symmetric(vertical: 20),
                child: Column(
                  children: [
                    Icon(Icons.rate_review_outlined, size: 40, color: AppTheme.textLight),
                    const SizedBox(height: 8),
                    Text(t('no_reviews'), style: GoogleFonts.poppins(fontSize: 13, color: AppTheme.textSecondary)),
                  ],
                ),
              ),
            )
          else
            Column(
              children: [
                ..._reviews.map((r) => ReviewCard(review: r)),
                if (_totalReviews > _reviews.length)
                  Center(
                    child: TextButton(
                      onPressed: () {},
                      child: Text(t('view_all_reviews'), style: GoogleFonts.poppins(fontSize: 12, color: AppTheme.primary, fontWeight: FontWeight.w600)),
                    ),
                  ),
              ],
            ),
        ],
      ),
    );
  }


  Widget _buildRelatedProducts() {
    final t = AppLocalizations.of(context).translate;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: Text(
            t('related_products'),
            style: GoogleFonts.poppins(
              fontSize: 18,
              fontWeight: FontWeight.w700,
              color: AppTheme.textPrimary,
            ),
          ),
        ),
        const SizedBox(height: 12),
        SizedBox(
          height: 220,
          child: ListView.builder(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            scrollDirection: Axis.horizontal,
            itemCount: _relatedProducts.length,
            itemBuilder: (context, index) {
              final product = _relatedProducts[index];
              return SizedBox(
                width: 150,
                child: _RelatedProductCard(
                  product: product,
                  onTap: () {
                    Navigator.pushReplacement(
                      context,
                      MaterialPageRoute(
                        builder: (_) =>
                            ProductDetailScreen(productId: product.id),
                      ),
                    );
                  },
                  onLoginRequired: () => _showLoginDialog(t('login_to_wishlist')),
                ),
              );
            },
          ),
        ),
      ],
    );
  }

  Widget _buildBottomBar() {
    final t = AppLocalizations.of(context).translate;
    final total = _product!.effectivePrice * _quantity;

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
        child: Row(
          children: [
            Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '${t("total")}:',
                  style: GoogleFonts.poppins(
                    color: AppTheme.textSecondary,
                    fontSize: 12,
                  ),
                ),
                Text(
                  '\$${total.toStringAsFixed(2)}',
                  style: GoogleFonts.poppins(
                    fontSize: 20,
                    fontWeight: FontWeight.w800,
                    color: AppTheme.primary,
                  ),
                ),
              ],
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      style: OutlinedButton.styleFrom(
                        backgroundColor: AppTheme.surface,
                        foregroundColor: AppTheme.primary,
                        side: const BorderSide(
                          color: AppTheme.primary,
                          width: 2,
                        ),
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(16),
                        ),
                      ),
                      onPressed: _product!.isInStock
                          ? _handleAddToCart
                          : null,
                      child: Text(
                        t('add_to_cart'),
                        style: GoogleFonts.poppins(fontWeight: FontWeight.w600),
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: ElevatedButton(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppTheme.primary,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(16),
                        ),
                      ),
                      onPressed: _product!.isInStock
                          ? _handleBuyNow
                          : null,
                      child: Text(
                        t('buy_now'),
                        style: GoogleFonts.poppins(fontWeight: FontWeight.w600),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _RelatedProductCard extends StatelessWidget {
  final Product product;
  final VoidCallback onTap;
  final VoidCallback? onLoginRequired;

  const _RelatedProductCard({required this.product, required this.onTap, this.onLoginRequired});

  @override
  Widget build(BuildContext context) {
    final hasDiscount = product.hasDiscount;

    return GestureDetector(
      onTap: onTap,
      child: Container(
        margin: const EdgeInsets.only(right: 12),
        decoration: BoxDecoration(
          color: AppTheme.surface,
          borderRadius: BorderRadius.circular(16),
          boxShadow: [
            BoxShadow(
              color: AppTheme.cardShadow,
              blurRadius: 10,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              child: Stack(
                children: [
                  Container(
                    width: double.infinity,
                    decoration: BoxDecoration(
                      color: AppTheme.background,
                      borderRadius: const BorderRadius.vertical(
                        top: Radius.circular(16),
                      ),
                    ),
                    child: product.images.isNotEmpty
                        ? ClipRRect(
                            borderRadius: const BorderRadius.vertical(
                              top: Radius.circular(16),
                            ),
                            child: ProductImage(
                              imageUrl: product.images.first,
                            ),
                          )
                        : const Icon(
                            Icons.image_outlined,
                            color: AppTheme.textLight,
                          ),
                  ),
                  if (hasDiscount)
                    Positioned(
                      top: 8,
                      left: 8,
                      child: Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 6,
                          vertical: 2,
                        ),
                        decoration: BoxDecoration(
                          color: AppTheme.sale,
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(
                          '-${product.discountPercentage?.toInt() ?? 0}%',
                          style: GoogleFonts.poppins(
                            color: Colors.white,
                            fontSize: 9,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                    ),
                  // Wishlist Heart
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
                              size: 14,
                              color: isWished ? AppTheme.sale : AppTheme.textLight,
                            ),
                          ),
                        );
                      },
                    ),
                  ),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(10),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    product.name,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: GoogleFonts.poppins(
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    '\$${product.effectivePrice.toStringAsFixed(2)}',
                    style: GoogleFonts.poppins(
                      fontSize: 14,
                      fontWeight: FontWeight.w700,
                      color: AppTheme.primary,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
