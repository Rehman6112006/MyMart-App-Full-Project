import 'package:flutter/material.dart';
import 'package:flutter_rating_bar/flutter_rating_bar.dart';
import 'package:google_fonts/google_fonts.dart';
import '../config/theme.dart';
import '../services/review_service.dart';

class WriteReviewSheet extends StatefulWidget {
  final String productId;
  final String productName;
  final String? productImage;

  const WriteReviewSheet({
    super.key,
    required this.productId,
    required this.productName,
    this.productImage,
  });

  @override
  State<WriteReviewSheet> createState() => _WriteReviewSheetState();
}

class _WriteReviewSheetState extends State<WriteReviewSheet> {
  double _rating = 5;
  final _commentCtrl = TextEditingController();
  bool _submitting = false;
  String? _error;

  @override
  void dispose() {
    _commentCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (_commentCtrl.text.trim().isEmpty) {
      setState(() => _error = 'Please write a review');
      return;
    }
    setState(() { _submitting = true; _error = null; });
    final result = await ReviewService.addReview(
      productId: widget.productId,
      rating: _rating,
      comment: _commentCtrl.text.trim(),
    );
    if (!mounted) return;
    setState(() => _submitting = false);
    if (result['success'] == true) {
      Navigator.pop(context, true);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Review submitted successfully!'), backgroundColor: AppTheme.primary, behavior: SnackBarBehavior.floating),
      );
    } else {
      setState(() => _error = result['error'] ?? 'Failed to submit review');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
      decoration: const BoxDecoration(
        color: AppTheme.surface,
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(
              child: Container(width: 36, height: 4, decoration: BoxDecoration(color: AppTheme.divider, borderRadius: BorderRadius.circular(2))),
            ),
            const SizedBox(height: 16),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text('Write a Review', style: GoogleFonts.poppins(fontSize: 18, fontWeight: FontWeight.w700)),
                IconButton(icon: const Icon(Icons.close, size: 20), onPressed: () => Navigator.pop(context)),
              ],
            ),
            const SizedBox(height: 4),
            Text(widget.productName, style: GoogleFonts.poppins(fontSize: 13, color: AppTheme.textSecondary), maxLines: 2, overflow: TextOverflow.ellipsis),
            const SizedBox(height: 20),
            Center(
              child: Column(
                children: [
                  Text('Tap a star to rate', style: GoogleFonts.poppins(fontSize: 13, color: AppTheme.textSecondary)),
                  const SizedBox(height: 8),
                  RatingBar.builder(
                    initialRating: _rating,
                    minRating: 1,
                    direction: Axis.horizontal,
                    itemCount: 5,
                    itemSize: 36,
                    itemPadding: const EdgeInsets.symmetric(horizontal: 4),
                    itemBuilder: (_, _) => const Icon(Icons.star, color: Color(0xFFFFB800)),
                    onRatingUpdate: (r) => setState(() => _rating = r),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),
            TextField(
              controller: _commentCtrl,
              maxLines: 4,
              maxLength: 500,
              decoration: InputDecoration(
                hintText: 'Share your experience with this product...',
                hintStyle: GoogleFonts.poppins(fontSize: 13, color: AppTheme.textLight),
                filled: true,
                fillColor: AppTheme.background,
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
                contentPadding: const EdgeInsets.all(14),
              ),
              style: GoogleFonts.poppins(fontSize: 14),
            ),
            if (_error != null)
              Padding(
                padding: const EdgeInsets.only(top: 8),
                child: Text(_error!, style: GoogleFonts.poppins(fontSize: 12, color: AppTheme.sale)),
              ),
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity, height: 48,
              child: ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppTheme.primary,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                  elevation: 2,
                ),
                onPressed: _submitting ? null : _submit,
                child: _submitting
                    ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                    : Text('Submit Review', style: GoogleFonts.poppins(fontSize: 15, fontWeight: FontWeight.w600, color: Colors.white)),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
