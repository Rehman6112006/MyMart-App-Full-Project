import 'package:flutter/material.dart';
import 'package:flutter_rating_bar/flutter_rating_bar.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../config/theme.dart';
import '../../models/review.dart';
import '../../services/review_service.dart';
import '../../widgets/shimmer_loaders.dart';
import '../auth/forgot_password_screen.dart';

class VendorDashboardScreen extends StatefulWidget {
  const VendorDashboardScreen({super.key});

  @override
  State<VendorDashboardScreen> createState() => _VendorDashboardScreenState();
}

class _VendorDashboardScreenState extends State<VendorDashboardScreen> {
  List<Review> _reviews = [];
  double? _averageRating;
  int _totalReviews = 0;
  bool _isLoading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadDashboard();
  }

  Future<void> _loadDashboard() async {
    setState(() { _isLoading = true; _error = null; });
    final result = await ReviewService.getVendorReviews(limit: 50);
    if (!mounted) return;
    if (result['success'] == true) {
      setState(() {
        _reviews = result['reviews'] as List<Review>;
        _totalReviews = result['totalReviews'] ?? result['total'] ?? _reviews.length;
        _averageRating = result['averageRating'] as double?;
        _isLoading = false;
      });
    } else {
      setState(() { _error = result['error']; _isLoading = false; });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        title: Text('Reviews Dashboard', style: GoogleFonts.poppins(fontWeight: FontWeight.w600, fontSize: 16)),
        centerTitle: true,
        backgroundColor: AppTheme.surface,
        elevation: 0,
        actions: [
          TextButton(
            onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const ForgotPasswordScreen())),
            child: const Text('Forgot Password?'),
          ),
        ],
      ),
      body: _isLoading
          ? const Padding(
              padding: EdgeInsets.only(top: 16),
              child: Column(
                children: [
                  ShimmerReviewCard(),
                  ShimmerReviewCard(),
                  ShimmerReviewCard(),
                ],
              ),
            )
          : _error != null
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(Icons.error_outline, size: 48, color: AppTheme.textLight),
                      const SizedBox(height: 12),
                      Text('Could not load dashboard', style: GoogleFonts.poppins(color: AppTheme.textSecondary)),
                      const SizedBox(height: 16),
                      ElevatedButton(onPressed: _loadDashboard, child: Text('Retry')),
                    ],
                  ),
                )
              : RefreshIndicator(
                  onRefresh: _loadDashboard,
                  child: SingleChildScrollView(
                    physics: const AlwaysScrollableScrollPhysics(),
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        _buildStatsCard(),
                        const SizedBox(height: 16),
                        _buildForgotPasswordTile(),
                        const SizedBox(height: 16),
                        Text('Recent Reviews', style: GoogleFonts.poppins(fontSize: 16, fontWeight: FontWeight.w700)),
                        const SizedBox(height: 12),
                        if (_reviews.isEmpty)
                          Center(
                            child: Padding(
                              padding: const EdgeInsets.symmetric(vertical: 40),
                              child: Column(
                                children: [
                                  Icon(Icons.rate_review_outlined, size: 48, color: AppTheme.textLight),
                                  const SizedBox(height: 12),
                                  Text('No reviews yet', style: GoogleFonts.poppins(color: AppTheme.textSecondary)),
                                ],
                              ),
                            ),
                          )
                        else
                          ..._reviews.map((r) => _buildReviewTile(r)),
                      ],
                    ),
                  ),
                ),
    );
  }

  Widget _buildStatsCard() {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: const LinearGradient(colors: [Color(0xFF22C55E), Color(0xFF16A34A)], begin: Alignment.topLeft, end: Alignment.bottomRight),
        borderRadius: BorderRadius.circular(20),
        boxShadow: [BoxShadow(color: const Color(0xFF22C55E).withValues(alpha: 0.3), blurRadius: 20, offset: const Offset(0, 8))],
      ),
      child: Column(
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: [
              _statItem('$_totalReviews', 'Total Reviews'),
              Container(width: 1, height: 40, color: Colors.white.withValues(alpha: 0.3)),
              _statItem(_averageRating?.toStringAsFixed(1) ?? '0.0', 'Avg. Rating'),
            ],
          ),
          const SizedBox(height: 12),
          if (_averageRating != null)
            RatingBarIndicator(
              rating: _averageRating!,
              itemSize: 28,
              itemBuilder: (_, _) => const Icon(Icons.star, color: Colors.white),
              unratedColor: Colors.white.withValues(alpha: 0.3),
            ),
        ],
      ),
    );
  }

  Widget _statItem(String value, String label) {
    return Column(
      children: [
        Text(value, style: GoogleFonts.poppins(fontSize: 28, fontWeight: FontWeight.w800, color: Colors.white)),
        Text(label, style: GoogleFonts.poppins(fontSize: 12, color: Colors.white.withValues(alpha: 0.8))),
      ],
    );
  }

  Widget _buildForgotPasswordTile() {
    return SizedBox(
      width: double.infinity,
      child: OutlinedButton.icon(
        onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const ForgotPasswordScreen())),
        icon: const Icon(Icons.lock_outline, size: 18),
        label: const Text('Forgot Password?'),
        style: OutlinedButton.styleFrom(
          foregroundColor: AppTheme.primary,
          side: BorderSide(color: AppTheme.warning.withValues(alpha: 0.3)),
          backgroundColor: AppTheme.warning.withValues(alpha: 0.08),
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
        ),
      ),
    );
  }

  Widget _buildReviewTile(Review review) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppTheme.surface,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppTheme.divider.withValues(alpha: 0.5)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              CircleAvatar(
                radius: 14,
                backgroundColor: AppTheme.primaryExtraLight,
                child: Text(review.userName[0].toUpperCase(), style: GoogleFonts.poppins(fontSize: 12, fontWeight: FontWeight.w600, color: AppTheme.primary)),
              ),
              const SizedBox(width: 8),
              Expanded(child: Text(review.userName, style: GoogleFonts.poppins(fontSize: 13, fontWeight: FontWeight.w600))),
              RatingBarIndicator(rating: review.rating, itemSize: 14, itemBuilder: (_, _) => const Icon(Icons.star, color: Color(0xFFFFB800)), unratedColor: AppTheme.divider),
            ],
          ),
          const SizedBox(height: 8),
          Text(review.comment, style: GoogleFonts.poppins(fontSize: 12, color: AppTheme.textPrimary, height: 1.3)),
          const SizedBox(height: 6),
          Text(review.formattedDate, style: GoogleFonts.poppins(fontSize: 10, color: AppTheme.textLight)),
        ],
      ),
    );
  }
}
