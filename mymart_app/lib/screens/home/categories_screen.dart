import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../../config/theme.dart';
import '../../models/category.dart';
import '../../services/category_service.dart';
import '../product/product_list_screen.dart';

class CategoriesScreen extends StatefulWidget {
  const CategoriesScreen({super.key});

  @override
  State<CategoriesScreen> createState() => _CategoriesScreenState();
}

class _CategoriesScreenState extends State<CategoriesScreen> {
  List<Category> _categories = [];

  @override
  void initState() {
    super.initState();
    _loadCategories();
  }

  Future<void> _loadCategories() async {
    try {
      final categories = await CategoryService.getCategories();
      if (categories.isNotEmpty) {
        setState(() => _categories = categories);
      } else {
        setState(() => _categories = _createDefaultCategories());
      }
    } catch (e) {
      setState(() => _categories = _createDefaultCategories());
    }
  }

  List<Category> _createDefaultCategories() {
    return [
      Category(id: 'fresh-vegetables', name: 'Fresh Vegetables', icon: '🥬', color: '#22C55E'),
      Category(id: 'fresh-fruits', name: 'Fresh Fruits', icon: '🍎', color: '#EF4444'),
      Category(id: 'chicken-meat-eggs', name: 'Chicken/Meat/Eggs', icon: '🍗', color: '#B45309'),
      Category(id: 'dairy-products', name: 'Dairy Products', icon: '🥛', color: '#3B82F6'),
      Category(id: 'dry-grocery', name: 'Dry Grocery', icon: '🍚', color: '#F59E0B'),
      Category(id: 'snacks-beverages', name: 'Snacks & Beverages', icon: '🍿', color: '#8B5CF6'),
      Category(id: 'bakery-breakfast', name: 'Bakery & Breakfast', icon: '🥐', color: '#EC4899'),
      Category(id: 'frozen-foods', name: 'Frozen Foods', icon: '🧊', color: '#06B6D4'),
      Category(id: 'personal-care', name: 'Personal Care', icon: '🧴', color: '#10B981'),
      Category(id: 'home-kitchen', name: 'Home & Kitchen', icon: '🏠', color: '#6366F1'),
    ];
  }

  String _getCategoryImage(String categoryName) {
    final nameLower = categoryName.toLowerCase();
    if (nameLower.contains('vegetable')) {
      return 'assets/images/fresh Vegetables.png';
    }
    if (nameLower.contains('fruit')) return 'assets/images/Fruites.png';
    if (nameLower.contains('meat') ||
        nameLower.contains('egg') ||
        nameLower.contains('chicken')) {
      return 'assets/images/Meat & Eggs.png';
    }
    if (nameLower.contains('dairy') || nameLower.contains('milk')) {
      return 'assets/images/Drinks.png';
    }
    if (nameLower.contains('grocery') || nameLower.contains('dry')) {
      return 'assets/images/Daily grocesry.png';
    }
    if (nameLower.contains('snack') || nameLower.contains('beverage')) {
      return 'assets/images/snacks.png';
    }
    if (nameLower.contains('bakery') || nameLower.contains('breakfast')) {
      return 'assets/images/Bakery.png';
    }
    if (nameLower.contains('frozen')) return 'assets/images/frozen food.png';
    if (nameLower.contains('personal') || nameLower.contains('care')) {
      return 'assets/images/Personal care.png';
    }
    if (nameLower.contains('home') ||
        nameLower.contains('kitchen') ||
        nameLower.contains('household')) {
      return 'assets/images/house hold.png';
    }
    return 'assets/images/logo.png';
  }

  String _getCategoryIcon(String categoryName) {
    final nameLower = categoryName.toLowerCase();
    if (nameLower.contains('vegetable')) return '🥬';
    if (nameLower.contains('fruit')) return '🍎';
    if (nameLower.contains('meat') || nameLower.contains('egg') || nameLower.contains('chicken')) return '🍗';
    if (nameLower.contains('dairy') || nameLower.contains('milk')) return '🥛';
    if (nameLower.contains('grocery') || nameLower.contains('dry')) return '🍚';
    if (nameLower.contains('snack') || nameLower.contains('beverage')) return '🍿';
    if (nameLower.contains('bakery') || nameLower.contains('breakfast')) return '🥐';
    if (nameLower.contains('frozen')) return '🧊';
    if (nameLower.contains('personal') || nameLower.contains('care')) return '🧴';
    if (nameLower.contains('home') || nameLower.contains('kitchen')) return '🏠';
    return '📦';
  }

  Color _getCategoryColor(String? hexColor, int index) {
    if (hexColor != null && hexColor.startsWith('#')) {
      try {
        return Color(int.parse(hexColor.substring(1), radix: 16) + 0xFF000000);
      } catch (_) {}
    }
    final List<Color> categoryColors = [
      Color(0xFF22C55E), // Fresh Vegetables
      Color(0xFFEF4444), // Fresh Fruits
      Color(0xFFB45309), // Chicken/Meat/Eggs
      Color(0xFF3B82F6), // Dairy Products
      Color(0xFFF59E0B), // Dry Grocery
      Color(0xFF8B5CF6), // Snacks & Beverages
      Color(0xFFEC4899), // Bakery & Breakfast
      Color(0xFF06B6D4), // Frozen Foods
      Color(0xFF10B981), // Personal Care
      Color(0xFF6366F1), // Home & Kitchen
    ];
    return categoryColors[index % categoryColors.length];
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        backgroundColor: AppTheme.surface,
        elevation: 0,
        title: Row(
          children: [
            Container(
              width: 4,
              height: 24,
              decoration: BoxDecoration(
                color: AppTheme.primary,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            const SizedBox(width: 12),
            Text(
              'Categories',
              style: GoogleFonts.poppins(
                fontWeight: FontWeight.w700,
                fontSize: 20,
                letterSpacing: -0.3,
              ),
            ),
          ],
        ),
        centerTitle: false,
      ),
      body: RefreshIndicator(
              onRefresh: _loadCategories,
              child: GridView.builder(
                padding: const EdgeInsets.all(16),
                gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                  crossAxisCount: 2,
                  crossAxisSpacing: 16,
                  mainAxisSpacing: 16,
                  childAspectRatio: 1.0,
                ),
                itemCount: _categories.length,
                itemBuilder: (context, index) {
                  final category = _categories[index];
                  final imagePath = _getCategoryImage(category.name);
                  final icon = category.icon ?? _getCategoryIcon(category.name);
                  final color = _getCategoryColor(category.color, index);
                   
                  return _CategoryCard(
                    name: category.name,
                    imageUrl: category.image,
                    imagePath: imagePath,
                    icon: icon,
                    color: color,
                    onTap: () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (_) => ProductListScreen(
                            title: category.name,
                            categoryId: category.slug ?? category.id,
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

class _CategoryCard extends StatelessWidget {
  final String name;
  final String? imageUrl;
  final String imagePath;
  final String icon;
  final Color color;
  final VoidCallback onTap;

  const _CategoryCard({
    required this.name,
    this.imageUrl,
    required this.imagePath,
    required this.icon,
    required this.color,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        decoration: BoxDecoration(
          color: AppTheme.surface,
          borderRadius: BorderRadius.circular(20),
          boxShadow: [
            BoxShadow(
              color: AppTheme.cardShadow,
              blurRadius: 10,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Expanded(
              flex: 3,
              child: Container(
                decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.1),
                  borderRadius: const BorderRadius.vertical(
                    top: Radius.circular(20),
                  ),
                ),
                child: ClipRRect(
                  borderRadius: const BorderRadius.vertical(
                    top: Radius.circular(20),
                  ),
                  child: imageUrl != null && imageUrl!.isNotEmpty
                      ? CachedNetworkImage(
                          imageUrl: imageUrl!,
                          fit: BoxFit.cover,
                          placeholder: (_, __) => Center(child: Text(icon, style: const TextStyle(fontSize: 48))),
                          errorWidget: (_, __, ___) => Image.asset(
                            imagePath,
                            fit: BoxFit.cover,
                            errorBuilder: (_, __, ___) => Center(
                              child: Text(icon, style: const TextStyle(fontSize: 48)),
                            ),
                          ),
                        )
                      : Image.asset(
                          imagePath,
                          fit: BoxFit.cover,
                          errorBuilder: (_, __, ___) => Center(
                            child: Text(icon, style: const TextStyle(fontSize: 48)),
                          ),
                        ),
                ),
              ),
            ),
            Expanded(
              flex: 1,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
                child: Center(
                  child: Text(
                    name,
                    textAlign: TextAlign.center,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: GoogleFonts.poppins(
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                      color: AppTheme.textPrimary,
                    ),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
