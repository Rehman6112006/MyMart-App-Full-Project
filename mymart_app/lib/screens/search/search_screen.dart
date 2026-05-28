import 'dart:async';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../config/theme.dart';
import '../../services/search_service.dart';
import '../../models/product.dart';
import '../product/product_detail_screen.dart';

class SearchScreen extends StatefulWidget {
  const SearchScreen({super.key});

  @override
  State<SearchScreen> createState() => _SearchScreenState();
}

class _SearchScreenState extends State<SearchScreen> {
  final _searchController = TextEditingController();
  List<Product> _results = [];
  List<String> _suggestions = [];
  List<String> _trending = [];
  bool _hasSearched = false;
  Timer? _debounceTimer;

  @override
  void initState() {
    super.initState();
    _loadTrending();
  }

  @override
  void dispose() {
    _debounceTimer?.cancel();
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _loadTrending() async {
    final trending = await SearchService.getTrending();
    if (mounted) {
      setState(() => _trending = trending);
    }
  }

  Future<void> _search(String query) async {
    if (query.trim().isEmpty) return;

    setState(() {
      _hasSearched = true;
    });

    try {
      final result = await SearchService.search(query: query);
      final products = result['products'];

      if (mounted) {
        setState(() {
          if (products is List) {
            _results = products.map((e) => Product.fromJson(e)).toList();
          } else {
            _results = [];
          }
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _results = [];
        });
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Search failed. Please try again.')),
        );
      }
    }
  }

  void _onSearchChanged(String query) {
    setState(() {}); // Rebuild to update clear button visibility
    _debounceTimer?.cancel();
    _debounceTimer = Timer(const Duration(milliseconds: 300), () {
      _getSuggestions(query);
    });
  }

  Future<void> _getSuggestions(String query) async {
    if (query.isEmpty) {
      setState(() => _suggestions = []);
      return;
    }
    try {
      final suggestions = await SearchService.getSuggestions(query);
      if (mounted) {
        setState(() => _suggestions = suggestions);
      }
    } catch (_) {
      // Silently fail for suggestions - not critical
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        backgroundColor: AppTheme.surface,
        elevation: 0,
        toolbarHeight: 60,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: AppTheme.textPrimary),
          onPressed: () => Navigator.pop(context),
        ),
        titleSpacing: 0,
        title: Container(
          height: 44,
          decoration: BoxDecoration(
            color: AppTheme.background,
            borderRadius: BorderRadius.circular(22),
          ),
          child: TextField(
            controller: _searchController,
            autofocus: true,
            decoration: InputDecoration(
              hintText: 'Search products...',
              border: InputBorder.none,
              prefixIcon: const Icon(Icons.search, color: AppTheme.textLight),
              hintStyle: GoogleFonts.poppins(
                color: AppTheme.textLight,
                fontSize: 14,
              ),
              contentPadding: const EdgeInsets.symmetric(vertical: 10),
            ),
            style: GoogleFonts.poppins(
              fontSize: 14,
              color: AppTheme.textPrimary,
            ),
            onSubmitted: _search,
            onChanged: _onSearchChanged,
          ),
        ),
        actions: [
          if (_searchController.text.isNotEmpty)
            IconButton(
              icon: const Icon(Icons.clear, color: AppTheme.textSecondary),
              onPressed: () {
                _searchController.clear();
                setState(() {
                  _results = [];
                  _suggestions = [];
                  _hasSearched = false;
                });
              },
            ),
          const SizedBox(width: 8),
        ],
      ),
      body: _hasSearched
          ? _results.isEmpty
                ? Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Container(
                          padding: const EdgeInsets.all(24),
                          decoration: BoxDecoration(
                            color: AppTheme.primaryExtraLight,
                            shape: BoxShape.circle,
                          ),
                          child: const Icon(
                            Icons.search_off,
                            size: 48,
                            color: AppTheme.primary,
                          ),
                        ),
                        const SizedBox(height: 24),
                        Text(
                          'No results found',
                          style: GoogleFonts.poppins(
                            fontSize: 18,
                            fontWeight: FontWeight.w600,
                            color: AppTheme.textPrimary,
                          ),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          'Try different keywords',
                          style: GoogleFonts.poppins(
                            fontSize: 14,
                            color: AppTheme.textSecondary,
                          ),
                        ),
                      ],
                    ),
                  )
                : ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: _results.length,
                    itemBuilder: (context, index) {
                      final product = _results[index];
                      return _SearchResultCard(
                        product: product,
                        onTap: () {
                          Navigator.of(context).push(
                            MaterialPageRoute(
                              builder: (_) =>
                                  ProductDetailScreen(productId: product.id),
                            ),
                          );
                        },
                      );
                    },
                  )
          : Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Suggestions
                if (_suggestions.isNotEmpty)
                  ..._suggestions.map(
                    (s) => ListTile(
                      leading: const Icon(
                        Icons.search,
                        color: AppTheme.textLight,
                      ),
                      title: Text(
                        s,
                        style: GoogleFonts.poppins(),
                      ),
                      onTap: () {
                        _searchController.text = s;
                        _search(s);
                      },
                    ),
                  ),
                // Trending
                if (_trending.isNotEmpty && _suggestions.isEmpty) ...[
                  Padding(
                    padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
                    child: Row(
                      children: [
                        const Icon(
                          Icons.trending_up,
                          size: 20,
                          color: AppTheme.primary,
                        ),
                        const SizedBox(width: 8),
                        Text(
                          'Trending Searches',
                          style: GoogleFonts.poppins(
                            fontWeight: FontWeight.w700,
                            fontSize: 16,
                            color: AppTheme.textPrimary,
                          ),
                        ),
                      ],
                    ),
                  ),
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    child: Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: _trending
                          .map(
                            (t) => Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 16,
                                vertical: 8,
                              ),
                              decoration: BoxDecoration(
                                color: AppTheme.primary.withValues(alpha: 0.1),
                                borderRadius: BorderRadius.circular(20),
                              ),
                              child: Text(
                                t,
                                style: GoogleFonts.poppins(
                                  fontSize: 13,
                                  color: AppTheme.primary,
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                            ),
                          )
                          .toList(),
                    ),
                  ),
                ],
                if (_trending.isEmpty && _suggestions.isEmpty)
                  Expanded(
                    child: Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const Icon(
                            Icons.search,
                            size: 64,
                            color: AppTheme.textLight,
                          ),
                          const SizedBox(height: 16),
                          Text(
                            'Search for products',
                            style: GoogleFonts.poppins(
                              fontSize: 16,
                              color: AppTheme.textSecondary,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
              ],
            ),
    );
  }
}

class _SearchResultCard extends StatelessWidget {
  final Product product;
  final VoidCallback onTap;

  const _SearchResultCard({required this.product, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: AppTheme.surface,
          borderRadius: BorderRadius.circular(16),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.05),
              blurRadius: 8,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Row(
          children: [
            Container(
              width: 90,
              height: 90,
              decoration: BoxDecoration(
                color: AppTheme.background,
                borderRadius: BorderRadius.circular(12),
              ),
              child: product.images.isNotEmpty
                  ? ClipRRect(
                      borderRadius: BorderRadius.circular(12),
                      child: Image.network(
                        product.images.first,
                        fit: BoxFit.cover,
                        errorBuilder: (_, _, _) => const Icon(
                          Icons.shopping_bag_outlined,
                          size: 40,
                          color: AppTheme.textLight,
                        ),
                      ),
                    )
                  : const Icon(
                      Icons.shopping_bag_outlined,
                      size: 40,
                      color: AppTheme.textLight,
                    ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    product.name,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: GoogleFonts.poppins(
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                      color: AppTheme.textPrimary,
                    ),
                  ),
                  if (product.storeName != null) ...[
                    const SizedBox(height: 4),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                      decoration: BoxDecoration(
                        color: AppTheme.primary.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Icon(
                            Icons.store_outlined,
                            size: 12,
                            color: AppTheme.primary,
                          ),
                          const SizedBox(width: 4),
                          Flexible(
                            child: Text(
                              product.storeName!,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: GoogleFonts.poppins(
                                fontSize: 11,
                                color: AppTheme.primary,
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                  const SizedBox(height: 6),
                  Row(
                    children: [
                      Text(
                        '\$${product.effectivePrice.toStringAsFixed(2)}',
                        style: GoogleFonts.poppins(
                          fontSize: 16,
                          fontWeight: FontWeight.w700,
                          color: AppTheme.primary,
                        ),
                      ),
                      if (product.hasDiscount) ...[
                        const SizedBox(width: 8),
                        Text(
                          '\$${product.basePrice.toStringAsFixed(2)}',
                          style: GoogleFonts.poppins(
                            fontSize: 12,
                            color: AppTheme.textLight,
                            decoration: TextDecoration.lineThrough,
                          ),
                        ),
                        const SizedBox(width: 6),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                            color: AppTheme.sale,
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: Text(
                            '-${product.discountPercentage}%',
                            style: GoogleFonts.poppins(
                              fontSize: 10,
                              color: Colors.white,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ),
                      ],
                    ],
                  ),
                ],
              ),
            ),
            const Icon(
              Icons.arrow_forward_ios,
              size: 16,
              color: AppTheme.textLight,
            ),
          ],
        ),
      ),
    );
  }
}
