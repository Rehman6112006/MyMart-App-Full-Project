import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../config/theme.dart';
import '../models/store.dart';
import 'network_image.dart';
import '../../localization/app_localizations.dart';

class StoreListItem extends StatelessWidget {
  final Store store;
  final VoidCallback onTap;
  final int index;

  const StoreListItem({
    super.key,
    required this.store,
    required this.onTap,
    this.index = 0,
  });

  Color get _gradientColor {
    final colors = [
      const Color(0xFF22C55E),
      const Color(0xFF3B82F6),
      const Color(0xFFF59E0B),
      const Color(0xFF8B5CF6),
      const Color(0xFFEC4899),
      const Color(0xFF06B6D4),
      const Color(0xFFF97316),
      const Color(0xFF10B981),
    ];
    return colors[store.storeName.hashCode % colors.length];
  }

  @override
  Widget build(BuildContext context) {
    final t = AppLocalizations.of(context).translate;
    return TweenAnimationBuilder<double>(
      tween: Tween(begin: 0, end: 1),
      duration: Duration(milliseconds: 350 + (index * 60)),
      curve: Curves.easeOutCubic,
      builder: (context, value, child) {
        return Opacity(
          opacity: value,
          child: Transform.translate(offset: Offset(0, 20 * (1 - value)), child: child),
        );
      },
      child: GestureDetector(
        onTap: onTap,
        child: Container(
          margin: const EdgeInsets.only(bottom: 16),
          decoration: BoxDecoration(
            color: AppTheme.surface,
            borderRadius: BorderRadius.circular(AppTheme.radiusXl),
            boxShadow: AppTheme.cardShadowMedium,
          ),
        child: Row(
          children: [
            Container(
              width: 100,
              height: 110,
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [
                    _gradientColor.withValues(alpha: 0.8),
                    _gradientColor,
                  ],
                ),
                borderRadius: const BorderRadius.horizontal(
                  left: Radius.circular(20),
                ),
              ),
              child: Center(
                child: store.logo != null && store.logo!.isNotEmpty
                    ? ClipRRect(
                        borderRadius: BorderRadius.circular(30),
                        child: StoreLogo(logoUrl: store.logo!, size: 60),
                      )
                    : Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(
                            Icons.store,
                            size: 36,
                            color: Colors.white.withValues(alpha: 0.9),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            store.storeName.substring(0, 1).toUpperCase(),
                            style: GoogleFonts.poppins(
                              color: Colors.white,
                              fontSize: 20,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ],
                      ),
              ),
            ),
            Expanded(
              child: Padding(
                padding: const EdgeInsets.all(14),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            store.storeName,
                            style: GoogleFonts.poppins(
                              fontWeight: FontWeight.w700,
                              fontSize: 16,
                              color: AppTheme.textPrimary,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        if (store.isVerified == true)
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 8,
                              vertical: 4,
                            ),
                            decoration: BoxDecoration(
                              color: AppTheme.primary.withValues(alpha: 0.1),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                const Icon(
                                  Icons.verified,
                                  size: 12,
                                  color: AppTheme.primary,
                                ),
                                const SizedBox(width: 4),
                                Text(
                                  t('verified'),
                                  style: const TextStyle(
                                    fontSize: 10,
                                    color: AppTheme.primary,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                              ],
                            ),
                          ),
                      ],
                    ),
                    const SizedBox(height: 6),
                    if (store.description != null &&
                        store.description!.isNotEmpty) ...[
                      Text(
                        store.description!,
                        style: GoogleFonts.poppins(
                          fontSize: 12,
                          color: AppTheme.textSecondary,
                        ),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 8),
                    ],
                    Row(
                      children: [
                        Icon(
                          Icons.location_on_outlined,
                          size: 14,
                          color: AppTheme.textLight,
                        ),
                        const SizedBox(width: 4),
                        Text(
                          store.city ?? t('nearby'),
                          style: GoogleFonts.poppins(
                            fontSize: 12,
                            color: AppTheme.textSecondary,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.only(right: 12),
              child: Icon(
                Icons.arrow_forward_ios,
                size: 16,
                color: AppTheme.textLight,
              ),
            ),
          ],
        ),
      ),
    ),
    );
  }
}

class StoreCard extends StatelessWidget {
  final Store store;
  final VoidCallback onTap;
  final int index;

  const StoreCard({super.key, required this.store, required this.onTap, this.index = 0});

  @override
  Widget build(BuildContext context) {
    final t = AppLocalizations.of(context).translate;
    return TweenAnimationBuilder<double>(
      tween: Tween(begin: 0, end: 1),
      duration: Duration(milliseconds: 300 + (index * 50)),
      curve: Curves.easeOutCubic,
      builder: (context, value, child) {
        return Opacity(
          opacity: value,
          child: Transform.translate(offset: Offset(0, 15 * (1 - value)), child: child),
        );
      },
      child: GestureDetector(
        onTap: onTap,
        child: Container(
          width: 160,
          margin: const EdgeInsets.only(right: 12),
          decoration: BoxDecoration(
            color: AppTheme.surface,
            borderRadius: BorderRadius.circular(AppTheme.radiusLg),
            boxShadow: AppTheme.cardShadowLight,
          ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              height: 80,
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [
                    AppTheme.primary.withValues(alpha: 0.8),
                    AppTheme.primaryDark.withValues(alpha: 0.9),
                  ],
                ),
                borderRadius: const BorderRadius.vertical(
                  top: Radius.circular(16),
                ),
              ),
              child: Center(
                child: store.logo != null && store.logo!.isNotEmpty
                    ? ClipRRect(
                        borderRadius: BorderRadius.circular(30),
                        child: StoreLogo(logoUrl: store.logo!, size: 60),
                      )
                    : _buildStoreIcon(),
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    store.storeName,
                    style: const TextStyle(
                      fontWeight: FontWeight.w600,
                      fontSize: 14,
                      color: AppTheme.textPrimary,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      Icon(
                        store.isVerified == true ? Icons.verified : Icons.store,
                        size: 12,
                        color: store.isVerified == true
                            ? AppTheme.primary
                            : AppTheme.textSecondary,
                      ),
                      const SizedBox(width: 4),
                      Expanded(
                        child: Text(
                          store.isVerified == true ? t('verified') : t('new'),
                          style: TextStyle(
                            fontSize: 11,
                            color: store.isVerified == true
                                ? AppTheme.primary
                                : AppTheme.textSecondary,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    ),
    );
  }

  Widget _buildStoreIcon() {
    return Container(
      width: 60,
      height: 60,
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.2),
        borderRadius: BorderRadius.circular(30),
      ),
      child: const Icon(Icons.store, size: 32, color: Colors.white),
    );
  }
}

class StoreGridCard extends StatelessWidget {
  final Store store;
  final VoidCallback onTap;
  final int index;

  const StoreGridCard({super.key, required this.store, required this.onTap, this.index = 0});

  Color get _gradientColor {
    final colors = [
      const Color(0xFF22C55E),
      const Color(0xFF3B82F6),
      const Color(0xFFF59E0B),
      const Color(0xFF8B5CF6),
      const Color(0xFFEC4899),
      const Color(0xFF06B6D4),
      const Color(0xFFF97316),
      const Color(0xFF10B981),
    ];
    return colors[store.storeName.hashCode % colors.length];
  }

  @override
  Widget build(BuildContext context) {
    final t = AppLocalizations.of(context).translate;
    return TweenAnimationBuilder<double>(
      tween: Tween(begin: 0, end: 1),
      duration: Duration(milliseconds: 300 + (index * 50)),
      curve: Curves.easeOutCubic,
      builder: (context, value, child) {
        return Opacity(
          opacity: value,
          child: Transform.translate(offset: Offset(0, 15 * (1 - value)), child: child),
        );
      },
      child: GestureDetector(
        onTap: onTap,
        child: Container(
          decoration: BoxDecoration(
            color: AppTheme.surface,
            borderRadius: BorderRadius.circular(AppTheme.radiusXl),
            boxShadow: AppTheme.cardShadowLight,
          ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              height: 90,
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [
                    _gradientColor.withValues(alpha: 0.8),
                    _gradientColor,
                  ],
                ),
                borderRadius: const BorderRadius.vertical(
                  top: Radius.circular(20),
                ),
              ),
              child: Center(
                child: store.logo != null && store.logo!.isNotEmpty
                    ? ClipRRect(
                        borderRadius: BorderRadius.circular(35),
                        child: StoreLogo(logoUrl: store.logo!, size: 70),
                      )
                    : Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(
                            Icons.store,
                            size: 32,
                            color: Colors.white.withValues(alpha: 0.9),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            store.storeName.substring(0, 1).toUpperCase(),
                            style: GoogleFonts.poppins(
                              color: Colors.white,
                              fontSize: 18,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ],
                      ),
              ),
            ),
            Expanded(
              child: Padding(
                padding: const EdgeInsets.all(12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      store.storeName,
                      style: GoogleFonts.poppins(
                        fontWeight: FontWeight.w700,
                        fontSize: 14,
                        color: AppTheme.textPrimary,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 4),
                    if (store.description != null &&
                        store.description!.isNotEmpty)
                      Expanded(
                        child: Text(
                          store.description!,
                          style: GoogleFonts.poppins(
                            fontSize: 11,
                            color: AppTheme.textSecondary,
                          ),
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                        ),
                      )
                    else
                      const Spacer(),
                    Row(
                      children: [
                        if (store.isVerified == true) ...[
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 8,
                              vertical: 4,
                            ),
                            decoration: BoxDecoration(
                              color: AppTheme.primary.withValues(alpha: 0.1),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                const Icon(
                                  Icons.verified,
                                  size: 10,
                                  color: AppTheme.primary,
                                ),
                                const SizedBox(width: 4),
                                Text(
                                  t('verified'),
                                  style: const TextStyle(
                                    fontSize: 9,
                                    color: AppTheme.primary,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
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
    );
  }
}