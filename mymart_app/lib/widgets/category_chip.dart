import 'package:flutter/material.dart';
import '../../config/theme.dart';
import '../../models/category.dart';

class CategoryChip extends StatelessWidget {
  final Category category;
  final VoidCallback? onTap;

  const CategoryChip({
    super.key,
    required this.category,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    // Category icon colors
    final colors = [
      AppTheme.primary,
      AppTheme.accent,
      AppTheme.success,
      AppTheme.info,
      AppTheme.error,
      const Color(0xFF8B5CF6),
      const Color(0xFFEC4899),
      const Color(0xFF14B8A6),
    ];
    final color = colors[category.name.hashCode.abs() % colors.length];

    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 80,
        margin: const EdgeInsets.only(right: 12),
        child: Column(
          children: [
            Container(
              width: 60,
              height: 60,
              decoration: BoxDecoration(
                color: color.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(16),
              ),
              child: Icon(
                _getCategoryIcon(category.name),
                color: color,
                size: 28,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              category.name,
              textAlign: TextAlign.center,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w500,
                color: AppTheme.textPrimary,
              ),
            ),
          ],
        ),
      ),
    );
  }

  IconData _getCategoryIcon(String name) {
    final lower = name.toLowerCase();
    if (lower.contains('electronic')) return Icons.phone_android;
    if (lower.contains('cloth') || lower.contains('fashion')) return Icons.checkroom;
    if (lower.contains('food') || lower.contains('grocer')) return Icons.restaurant;
    if (lower.contains('health') || lower.contains('beauty')) return Icons.favorite;
    if (lower.contains('home') || lower.contains('furniture')) return Icons.home;
    if (lower.contains('sport')) return Icons.sports_soccer;
    if (lower.contains('book')) return Icons.menu_book;
    if (lower.contains('toy') || lower.contains('kid')) return Icons.toys;
    if (lower.contains('auto')) return Icons.directions_car;
    if (lower.contains('garden')) return Icons.yard;
    return Icons.category;
  }
}
