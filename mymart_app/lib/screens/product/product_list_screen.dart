import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../config/theme.dart';
import '../../models/product.dart';
import '../../services/product_service.dart';
import '../../widgets/product_card.dart';
import '../../widgets/shimmer_loaders.dart';
import '../../providers/cart_provider.dart';
import '../cart/cart_screen.dart';
import 'product_detail_screen.dart';
import '../../localization/app_localizations.dart';

class ProductListScreen extends StatefulWidget {
  final String? categoryId;
  final String? categoryName;
  final String? title;
  final bool isFeatured;
  final bool isNewArrival;
  final bool isDeals;

  const ProductListScreen({
    super.key,
    this.categoryId,
    this.categoryName,
    this.title,
    this.isFeatured = false,
    this.isNewArrival = false,
    this.isDeals = false,
  });

  @override
  State<ProductListScreen> createState() => _ProductListScreenState();
}

class _ProductListScreenState extends State<ProductListScreen> {
  List<Product> _products = [];
  bool _isLoading = true;
  int _page = 1;
  bool _hasMore = true;
  final _scrollController = ScrollController();

  String _title(String Function(String) t) =>
      widget.title ??
      widget.categoryName ??
      t('all_products');

  @override
  void initState() {
    super.initState();
    _loadProducts();
    _scrollController.addListener(_onScroll);
  }

  @override
  void dispose() {
    _scrollController.removeListener(_onScroll);
    _scrollController.dispose();
    super.dispose();
  }

  void _onScroll() {
    if (_scrollController.position.pixels >=
            _scrollController.position.maxScrollExtent - 200 &&
        !_isLoading &&
        _hasMore &&
        !widget.isFeatured &&
        !widget.isNewArrival &&
        !widget.isDeals) {
      _loadMore();
    }
  }

  Future<void> _refresh() async {
    _page = 1;
    _hasMore = true;
    await _loadProducts();
  }

  Future<void> _loadMore() async {
    _page++;
    await _loadProducts(append: true);
  }

  Future<void> _loadProducts({bool append = false}) async {
    if (!append) {
      setState(() {
        _isLoading = true;
      });
    }

    try {
      List<Product> products;
      if (widget.isFeatured) {
        products = await ProductService.getFeaturedProducts();
        _hasMore = false;
      } else if (widget.isNewArrival) {
        products = await ProductService.getNewArrivals();
        _hasMore = false;
      } else if (widget.isDeals) {
        products = await ProductService.getDeals();
        _hasMore = false;
      } else {
        final result = await ProductService.getProducts(
          categoryId: widget.categoryId,
          page: _page,
        );
        products = result['products'] as List<Product>;
        final total = result['total'] as int? ?? 0;
        _hasMore = (_page * 20) < total;
      }

      if (mounted) {
        setState(() {
          if (append) {
            _products.addAll(products);
          } else {
            _products = products;
          }
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
        if (!append && _products.isEmpty) {
          // Don't show snackbar, just show empty state
        }
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final t = AppLocalizations.of(context).translate;
    return Scaffold(
      appBar: AppBar(
        title: Text(_title(t)),
        actions: [
          Consumer<CartProvider>(
            builder: (context, cart, _) {
              return Badge(
                isLabelVisible: cart.itemCount > 0,
                label: Text('${cart.itemCount}', style: const TextStyle(fontSize: 10, color: Colors.white)),
                child: IconButton(
                  icon: const Icon(Icons.shopping_cart_outlined),
                  onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const CartScreen())),
                ),
              );
            },
          ),
          const SizedBox(width: 4),
        ],
      ),
      body: _isLoading && _products.isEmpty
          ? const ShimmerProductList()
          : _products.isEmpty
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(Icons.inventory_2_outlined, size: 64, color: AppTheme.textLight),
                      const SizedBox(height: 16),
                      Text(
                        t('no_products_found'),
                        style: GoogleFonts.poppins(
                          fontSize: 16,
                          color: AppTheme.textSecondary,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        t('check_back'),
                        style: GoogleFonts.poppins(
                          fontSize: 13,
                          color: AppTheme.textLight,
                        ),
                      ),
                      const SizedBox(height: 20),
                      TextButton(
                        onPressed: () => Navigator.pop(context),
                        child: Text(
                          t('go_back'),
                          style: GoogleFonts.poppins(
                            color: AppTheme.primary,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                    ],
                  ),
                )
                  : RefreshIndicator(
                      onRefresh: _refresh,
                      child: GridView.builder(
                        controller: _scrollController,
                        padding: const EdgeInsets.all(16),
                        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                          crossAxisCount: 2,
                          childAspectRatio: 0.65,
                          crossAxisSpacing: 12,
                          mainAxisSpacing: 12,
                        ),
                        itemCount: _products.length + (_hasMore ? 1 : 0),
                        itemBuilder: (context, index) {
                          if (index >= _products.length) {
                            return const ShimmerProductCard();
                          }
                          return ProductCard(
                            product: _products[index],
                            onTap: () {
                              Navigator.of(context).push(
                                MaterialPageRoute(
                                  builder: (_) => ProductDetailScreen(
                                    productId: _products[index].id,
                                  ),
                                ),
                              );
                            },
                          );
                        },
                      ),
                    ),
    );
  }
}
