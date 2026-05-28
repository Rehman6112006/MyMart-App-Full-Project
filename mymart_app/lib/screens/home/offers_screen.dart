import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../../config/theme.dart';
import '../../providers/product_provider.dart';
import '../../widgets/product_card.dart';
import '../product/product_detail_screen.dart';

class OffersScreen extends StatefulWidget {
  const OffersScreen({super.key});

  @override
  State<OffersScreen> createState() => _OffersScreenState();
}

class _OffersScreenState extends State<OffersScreen> {
  final PageController _bannerController = PageController();
  int _currentBanner = 0;

  final List<Map<String, dynamic>> _activeCoupons = [
    {
      'code': 'FIRST20',
      'discount': '20% OFF',
      'desc': 'Flat 20% off on first order',
      'minOrder': 50,
      'maxDiscount': 20,
    },
    {
      'code': 'SAVE50',
      'discount': '\$5 OFF',
      'desc': 'Flat \$5 off on orders above \$30',
      'minOrder': 30,
      'maxDiscount': 5,
    },
    {
      'code': 'FREEDEL',
      'discount': 'FREE DELIVERY',
      'desc': 'Free delivery on orders above \$20',
      'minOrder': 20,
      'maxDiscount': 0,
    },
    {
      'code': 'GROCERY10',
      'discount': '10% OFF',
      'desc': '10% off on grocery items',
      'minOrder': 40,
      'maxDiscount': 8,
    },
    {
      'code': 'SUPER50',
      'discount': '\$10 OFF',
      'desc': '\$10 off on orders above \$80',
      'minOrder': 80,
      'maxDiscount': 10,
    },
    {
      'code': 'FRESH30',
      'discount': '30% OFF',
      'desc': '30% off on fresh produce',
      'minOrder': 60,
      'maxDiscount': 15,
    },
  ];

  final List<String> _bannerImages = ['🛒', '⚡', '🎉', '🥦'];

  final List<String> _bannerTitles = [
    'Flash Sale! Up to 50% OFF',
    'Fresh Vegetables Daily',
    'Free Delivery on \$29',
    'Organic & Farm Fresh',
  ];

  final List<String> _bannerSubtitles = [
    'Limited time offer',
    'Farm to table freshness',
    'On your first order',
    'Healthiest choices',
  ];

  @override
  void dispose() {
    _bannerController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.background,
      body: CustomScrollView(
        slivers: [
          SliverAppBar(
            expandedHeight: 120,
            floating: true,
            pinned: true,
            backgroundColor: AppTheme.surface,
            flexibleSpace: FlexibleSpaceBar(
              background: Container(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: [AppTheme.primary, AppTheme.primaryLight],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                ),
                child: SafeArea(
                  child: Padding(
                    padding: const EdgeInsets.all(20),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisAlignment: MainAxisAlignment.end,
                      children: [
                        Text(
                          '🔥 Offers & Deals',
                          style: GoogleFonts.poppins(
                            fontSize: 24,
                            fontWeight: FontWeight.w800,
                            color: Colors.white,
                          ),
                        ),
                        Text(
                          'Save big on your daily groceries',
                          style: GoogleFonts.poppins(
                            fontSize: 13,
                            color: Colors.white.withValues(alpha: 0.9),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
            actions: [
              IconButton(
                icon: const Icon(
                  Icons.notifications_outlined,
                  color: Colors.white,
                ),
                onPressed: () {},
              ),
            ],
          ),
          SliverToBoxAdapter(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const SizedBox(height: 20),
                _buildBannerSlider(),
                const SizedBox(height: 24),
                _buildFlashSaleSection(),
                const SizedBox(height: 24),
                _buildCouponSection(),
                const SizedBox(height: 24),
                _buildDealsOfTheDay(),
                const SizedBox(height: 100),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildBannerSlider() {
    return Column(
      children: [
        SizedBox(
          height: 160,
          child: PageView.builder(
            controller: _bannerController,
            itemCount: _bannerImages.length,
            onPageChanged: (index) {
              setState(() => _currentBanner = index);
            },
            itemBuilder: (context, index) {
              return Container(
                margin: const EdgeInsets.symmetric(horizontal: 16),
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: index % 2 == 0
                        ? [AppTheme.primary, AppTheme.primaryLight]
                        : [AppTheme.accent, Color(0xFFFCD34D)],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  borderRadius: BorderRadius.circular(24),
                  boxShadow: [
                    BoxShadow(
                      color:
                          (index % 2 == 0 ? AppTheme.primary : AppTheme.accent)
                              .withValues(alpha: 0.3),
                      blurRadius: 20,
                      offset: const Offset(0, 10),
                    ),
                  ],
                ),
                child: Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 10,
                              vertical: 4,
                            ),
                            decoration: BoxDecoration(
                              color: Colors.white.withValues(alpha: 0.2),
                              borderRadius: BorderRadius.circular(20),
                            ),
                            child: Text(
                              _bannerSubtitles[index],
                              style: GoogleFonts.poppins(
                                color: Colors.white,
                                fontSize: 10,
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                          ),
                          const SizedBox(height: 6),
                          Text(
                            _bannerTitles[index],
                            style: GoogleFonts.poppins(
                              color: Colors.white,
                              fontSize: 18,
                              fontWeight: FontWeight.w800,
                            ),
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                          ),
                          const SizedBox(height: 6),
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 14,
                              vertical: 6,
                            ),
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(20),
                            ),
                            child: Text(
                              'Shop Now',
                              style: GoogleFonts.poppins(
                                color: index % 2 == 0
                                    ? AppTheme.primary
                                    : AppTheme.accent,
                                fontSize: 11,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                    Text(
                      _bannerImages[index],
                      style: const TextStyle(fontSize: 56),
                    ),
                  ],
                ),
              );
            },
          ),
        ),
        const SizedBox(height: 12),
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: List.generate(
            _bannerImages.length,
            (index) => AnimatedContainer(
              duration: const Duration(milliseconds: 300),
              margin: const EdgeInsets.symmetric(horizontal: 4),
              width: _currentBanner == index ? 24 : 8,
              height: 8,
              decoration: BoxDecoration(
                color: _currentBanner == index
                    ? AppTheme.primary
                    : AppTheme.textLight,
                borderRadius: BorderRadius.circular(4),
              ),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildFlashSaleSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: AppTheme.sale.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: const Icon(
                      Icons.bolt,
                      color: AppTheme.sale,
                      size: 20,
                    ),
                  ),
                  const SizedBox(width: 10),
                  Text(
                    'Flash Sale',
                    style: GoogleFonts.poppins(
                      fontSize: 18,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const SizedBox(width: 8),
                  _buildCountdown('02', '35', '20'),
                ],
              ),
              TextButton(
                onPressed: () {},
                child: Text(
                  'View All',
                  style: GoogleFonts.poppins(
                    color: AppTheme.primary,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 12),
        Consumer<ProductProvider>(
          builder: (context, provider, _) {
            final deals = provider.deals;
            if (deals.isEmpty) return const SizedBox.shrink();
            return SizedBox(
              height: 250,
              child: ListView.builder(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: 16),
                itemCount: deals.length,
                itemBuilder: (context, index) {
                  final product = deals[index];
                  return Padding(
                    padding: const EdgeInsets.only(right: 12),
                    child: SizedBox(
                      width: 160,
                      child: ProductCard(
                      product: product,
                      showStoreName: false,
                      onTap: () => Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (_) => ProductDetailScreen(productId: product.id),
                        ),
                      ),
                    ),
                  ),
                );
                },
              ),
            );
          },
        ),
      ],
    );
  }

  Widget _buildCountdown(String hours, String minutes, String seconds) {
    return Row(
      children: [
        _countdownBox(hours),
        Text(
          ':',
          style: GoogleFonts.poppins(
            fontWeight: FontWeight.bold,
            color: AppTheme.sale,
          ),
        ),
        _countdownBox(minutes),
        Text(
          ':',
          style: GoogleFonts.poppins(
            fontWeight: FontWeight.bold,
            color: AppTheme.sale,
          ),
        ),
        _countdownBox(seconds),
      ],
    );
  }

  Widget _countdownBox(String value) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 2),
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(
        color: AppTheme.sale.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(6),
      ),
      child: Text(
        value,
        style: GoogleFonts.poppins(
          fontSize: 12,
          fontWeight: FontWeight.w700,
          color: AppTheme.sale,
        ),
      ),
    );
  }

  Widget _buildCouponSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: AppTheme.accent.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Icon(
                  Icons.local_offer,
                  color: AppTheme.accent,
                  size: 20,
                ),
              ),
              const SizedBox(width: 10),
              Text(
                'Available Coupons',
                style: GoogleFonts.poppins(
                  fontSize: 18,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 12),
        ListView.builder(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          padding: const EdgeInsets.symmetric(horizontal: 16),
          itemCount: _activeCoupons.length,
          itemBuilder: (context, index) {
            final coupon = _activeCoupons[index];
            return Container(
              margin: const EdgeInsets.only(bottom: 12),
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppTheme.surface,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(
                  color: AppTheme.primary.withValues(alpha: 0.2),
                  width: 1,
                ),
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
                  Container(
                    width: 70,
                    height: 70,
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        colors: [AppTheme.primary, AppTheme.primaryLight],
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                      ),
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: Center(
                      child: Text(
                        coupon['discount'],
                        style: GoogleFonts.poppins(
                          color: Colors.white,
                          fontWeight: FontWeight.w800,
                          fontSize: 13,
                        ),
                        textAlign: TextAlign.center,
                      ),
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          coupon['code'],
                          style: GoogleFonts.poppins(
                            fontSize: 16,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          coupon['desc'],
                          style: GoogleFonts.poppins(
                            fontSize: 12,
                            color: AppTheme.textSecondary,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'Min. order \$${coupon['minOrder']}',
                          style: GoogleFonts.poppins(
                            fontSize: 11,
                            color: AppTheme.textLight,
                          ),
                        ),
                      ],
                    ),
                  ),
                  Column(
                    children: [
                      IconButton(
                        icon: const Icon(
                          Icons.copy_rounded,
                          color: AppTheme.primary,
                          size: 20,
                        ),
                        onPressed: () {
                          _copyCoupon(coupon['code']);
                        },
                      ),
                      Text(
                        'Copy',
                        style: GoogleFonts.poppins(
                          fontSize: 10,
                          color: AppTheme.primary,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            );
          },
        ),
      ],
    );
  }

  Widget _buildDealsOfTheDay() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: AppTheme.primary.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Icon(
                  Icons.calendar_today,
                  color: AppTheme.primary,
                  size: 20,
                ),
              ),
              const SizedBox(width: 10),
              Text(
                'Deals of the Day',
                style: GoogleFonts.poppins(
                  fontSize: 18,
                  fontWeight: FontWeight.w700,
                ),
              ),
              const Spacer(),
              Text(
                '⏰ 08:30:15',
                style: GoogleFonts.poppins(
                  fontSize: 12,
                  color: AppTheme.sale,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 12),
        GridView.builder(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          padding: const EdgeInsets.symmetric(horizontal: 16),
          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: 2,
            childAspectRatio: 0.75,
            crossAxisSpacing: 12,
            mainAxisSpacing: 12,
          ),
          itemCount: 4,
          itemBuilder: (context, index) {
            return _buildDealCard(index);
          },
        ),
      ],
    );
  }

  Widget _buildDealCard(int index) {
    final List<Map<String, dynamic>> deals = [
      {
        'name': 'Organic Apples',
        'price': 199.99,
        'original': 299.99,
        'discount': 33,
        'emoji': '🍎',
      },
      {
        'name': 'Fresh Paneer 500g',
        'price': 129.99,
        'original': 179.99,
        'discount': 28,
        'emoji': '🧀',
      },
      {
        'name': 'Almonds 500g',
        'price': 349.99,
        'original': 499.99,
        'discount': 30,
        'emoji': '🥜',
      },
      {
        'name': 'Green Tea Box',
        'price': 89.99,
        'original': 129.99,
        'discount': 31,
        'emoji': '🍵',
      },
    ];
    final Map<String, dynamic> deal = deals[index];

    return Container(
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
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Stack(
            children: [
              Container(
                height: 100,
                width: double.infinity,
                decoration: BoxDecoration(
                  color: AppTheme.primaryExtraLight,
                  borderRadius: const BorderRadius.vertical(
                    top: Radius.circular(20),
                  ),
                ),
                child: Center(
                  child: Text(
                    deal['emoji'],
                    style: const TextStyle(fontSize: 48),
                  ),
                ),
              ),
              Positioned(
                top: 8,
                right: 8,
                child: Container(
                  padding: const EdgeInsets.all(6),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    shape: BoxShape.circle,
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.1),
                        blurRadius: 8,
                      ),
                    ],
                  ),
                  child: const Icon(
                    Icons.favorite_border,
                    size: 18,
                    color: AppTheme.sale,
                  ),
                ),
              ),
            ],
          ),
          Expanded(
            child: Padding(
              padding: const EdgeInsets.all(12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        deal['name'],
                        style: GoogleFonts.poppins(
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 4),
                      Row(
                        children: [
                          Text(
                            '\$${deal['price']}',
                            style: GoogleFonts.poppins(
                              fontSize: 14,
                              fontWeight: FontWeight.w700,
                              color: AppTheme.primary,
                            ),
                          ),
                          const SizedBox(width: 4),
                          Text(
                            '\$${deal['original']}',
                            style: GoogleFonts.poppins(
                              fontSize: 11,
                              color: AppTheme.textLight,
                              decoration: TextDecoration.lineThrough,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                  SizedBox(
                    width: double.infinity,
                    height: 32,
                    child: ElevatedButton(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppTheme.primary,
                        padding: EdgeInsets.zero,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(10),
                        ),
                      ),
                      onPressed: () => _showAddedToCartSnackbar(deal['name']),
                      child: Text(
                        'Add to Cart',
                        style: GoogleFonts.poppins(
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                          color: Colors.white,
                        ),
                      ),
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

  void _copyCoupon(String code) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Row(
          children: [
            const Icon(Icons.check_circle, color: Colors.white, size: 20),
            const SizedBox(width: 8),
            Text('Coupon $code copied!', style: GoogleFonts.poppins()),
          ],
        ),
        backgroundColor: AppTheme.primary,
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
      ),
    );
  }

  void _showAddedToCartSnackbar(String productName) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Row(
          children: [
            const Icon(Icons.check_circle, color: Colors.white, size: 20),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                '$productName added to cart!',
                style: GoogleFonts.poppins(),
              ),
            ),
          ],
        ),
        backgroundColor: AppTheme.primary,
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
        action: SnackBarAction(
          label: 'View Cart',
          textColor: Colors.white,
          onPressed: () {},
        ),
      ),
    );
  }
}
