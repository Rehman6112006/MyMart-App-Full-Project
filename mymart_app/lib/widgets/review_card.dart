import 'package:flutter/material.dart';
import 'package:flutter_rating_bar/flutter_rating_bar.dart';
import 'package:google_fonts/google_fonts.dart';
import '../config/theme.dart';
import '../models/review.dart';
import 'network_image.dart';

class ReviewCard extends StatelessWidget {
  final Review review;
  final int index;

  const ReviewCard({super.key, required this.review, this.index = 0});

  @override
  Widget build(BuildContext context) {
    return TweenAnimationBuilder<double>(
      tween: Tween(begin: 0, end: 1),
      duration: Duration(milliseconds: 300 + (index * 50)),
      curve: Curves.easeOutCubic,
      builder: (context, value, child) {
        return Opacity(
          opacity: value,
          child: Transform.translate(offset: Offset(0, 16 * (1 - value)), child: child),
        );
      },
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: AppTheme.surface,
          borderRadius: BorderRadius.circular(AppTheme.radiusMd),
          boxShadow: AppTheme.cardShadowLight,
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                CircleAvatar(
                  radius: 16,
                  backgroundColor: AppTheme.primaryExtraLight,
                  child: Text(
                    review.userName.isNotEmpty ? review.userName[0].toUpperCase() : '?',
                    style: GoogleFonts.poppins(fontSize: 13, fontWeight: FontWeight.w600, color: AppTheme.primary),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Flexible(
                            child: Text(review.userName, style: GoogleFonts.poppins(fontSize: 13, fontWeight: FontWeight.w600), overflow: TextOverflow.ellipsis),
                          ),
                          if (review.isVerified)
                            Padding(
                              padding: const EdgeInsets.only(left: 4),
                              child: Icon(Icons.verified, size: 14, color: AppTheme.primary),
                            ),
                        ],
                      ),
                      Row(
                        children: [
                          RatingBarIndicator(
                            rating: review.rating,
                            itemSize: 14,
                            itemBuilder: (_, _) => const Icon(Icons.star, color: AppTheme.star),
                            unratedColor: AppTheme.divider,
                          ),
                          const SizedBox(width: 6),
                          Text(review.formattedDate, style: GoogleFonts.poppins(fontSize: 10, color: AppTheme.textLight)),
                        ],
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 10),
            Text(review.comment, style: GoogleFonts.poppins(fontSize: 13, color: AppTheme.textPrimary, height: 1.4)),
            if (review.images.isNotEmpty) ...[
              const SizedBox(height: 10),
              SizedBox(
                height: 64,
                child: ListView.separated(
                  scrollDirection: Axis.horizontal,
                  itemCount: review.images.length,
                  separatorBuilder: (_, _) => const SizedBox(width: 8),
                  itemBuilder: (_, i) => ClipRRect(
                    borderRadius: BorderRadius.circular(8),
                    child: ProductImage(imageUrl: review.images[i], width: 64, height: 64, fit: BoxFit.cover),
                  ),
                ),
              ),
            ],
            if (review.vendorResponse != null) ...[
              const SizedBox(height: 10),
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: AppTheme.background,
                  borderRadius: BorderRadius.circular(AppTheme.radiusSm),
                ),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Icon(Icons.store, size: 14, color: AppTheme.primary),
                    const SizedBox(width: 6),
                    Expanded(
                      child: Text(review.vendorResponse!, style: GoogleFonts.poppins(fontSize: 12, color: AppTheme.textSecondary, height: 1.3)),
                    ),
                  ],
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
