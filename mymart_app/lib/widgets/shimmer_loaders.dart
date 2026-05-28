import 'package:flutter/material.dart';
import 'package:shimmer/shimmer.dart';
import 'package:google_fonts/google_fonts.dart';
import '../config/theme.dart';

Color get _base => AppTheme.shimmerBase;
Color get _highlight => AppTheme.shimmerHighlight;

Shimmer shimmerWrap({required Widget child}) {
  return Shimmer.fromColors(baseColor: _base, highlightColor: _highlight, child: child);
}

class ShimmerWidget extends StatelessWidget {
  final double width;
  final double height;
  final double borderRadius;

  const ShimmerWidget({
    super.key,
    this.width = double.infinity,
    required this.height,
    this.borderRadius = 12,
  });

  @override
  Widget build(BuildContext context) {
    return shimmerWrap(child: Container(
      width: width,
      height: height,
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(borderRadius),
      ),
    ));
  }
}

class ShimmerTextLine extends StatelessWidget {
  final double width;
  final double height;

  const ShimmerTextLine({
    super.key,
    this.width = double.infinity,
    this.height = 14,
  });

  @override
  Widget build(BuildContext context) {
    return ShimmerWidget(width: width, height: height, borderRadius: 4);
  }
}

class ShimmerAvatar extends StatelessWidget {
  final double size;

  const ShimmerAvatar({super.key, this.size = 48});

  @override
  Widget build(BuildContext context) {
    return ShimmerWidget(width: size, height: size, borderRadius: size / 2);
  }
}

class ShimmerProductCard extends StatelessWidget {
  const ShimmerProductCard({super.key});

  @override
  Widget build(BuildContext context) {
    return shimmerWrap(child: Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            child: Container(
              decoration: const BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
              ),
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(10),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(width: 60, height: 10, decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(4))),
                const SizedBox(height: 6),
                Container(width: 80, height: 12, decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(4))),
                const SizedBox(height: 6),
                Container(width: 50, height: 14, decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(4))),
              ],
            ),
          ),
        ],
      ),
    ));
  }
}

class ShimmerProductGrid extends StatelessWidget {
  final int itemCount;
  final int crossAxisCount;

  const ShimmerProductGrid({
    super.key,
    this.itemCount = 6,
    this.crossAxisCount = 2,
  });

  @override
  Widget build(BuildContext context) {
    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      padding: const EdgeInsets.symmetric(horizontal: 16),
      gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: crossAxisCount,
        childAspectRatio: 0.7,
        crossAxisSpacing: 12,
        mainAxisSpacing: 12,
      ),
      itemCount: itemCount,
      itemBuilder: (_, _) => const ShimmerProductCard(),
    );
  }
}

class ShimmerCartItem extends StatelessWidget {
  const ShimmerCartItem({super.key});

  @override
  Widget build(BuildContext context) {
    return shimmerWrap(child: Container(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Row(
        children: [
          Container(width: 80, height: 80, decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12))),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(width: 120, height: 14, decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(4))),
                const SizedBox(height: 6),
                Container(width: 80, height: 12, decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(4))),
                const SizedBox(height: 8),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Container(width: 60, height: 16, decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(4))),
                    Container(width: 90, height: 32, decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(8))),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    ));
  }
}

class ShimmerCart extends StatelessWidget {
  final int itemCount;

  const ShimmerCart({super.key, this.itemCount = 3});

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        const SizedBox(height: 16),
        Shimmer.fromColors(
          baseColor: Colors.grey[300]!,
          highlightColor: Colors.grey[100]!,
          child: Container(width: 300, height: 40, decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(20))),
        ),
        const SizedBox(height: 16),
        ...List.generate(itemCount, (_) => const ShimmerCartItem()),
      ],
    );
  }
}

class ShimmerStoreCard extends StatelessWidget {
  const ShimmerStoreCard({super.key});

  @override
  Widget build(BuildContext context) {
    return Shimmer.fromColors(
      baseColor: Colors.grey[300]!,
      highlightColor: Colors.grey[100]!,
      child: Container(
        margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16)),
        child: Row(
          children: [
            Container(width: 56, height: 56, decoration: BoxDecoration(color: Colors.white, shape: BoxShape.circle)),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(width: 140, height: 16, decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(4))),
                  const SizedBox(height: 6),
                  Container(width: 100, height: 12, decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(4))),
                  const SizedBox(height: 4),
                  Container(width: 180, height: 12, decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(4))),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class ShimmerOrderCard extends StatelessWidget {
  const ShimmerOrderCard({super.key});

  @override
  Widget build(BuildContext context) {
    return Shimmer.fromColors(
      baseColor: Colors.grey[300]!,
      highlightColor: Colors.grey[100]!,
      child: Container(
        margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16)),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Container(width: 120, height: 14, decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(4))),
                Container(width: 80, height: 24, decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12))),
              ],
            ),
            const SizedBox(height: 8),
            Container(width: double.infinity, height: 12, decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(4))),
            const SizedBox(height: 4),
            Container(width: 150, height: 12, decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(4))),
            const SizedBox(height: 12),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Container(width: 80, height: 14, decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(4))),
                Container(width: 60, height: 18, decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(4))),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class ShimmerCategories extends StatelessWidget {
  final int itemCount;

  const ShimmerCategories({super.key, this.itemCount = 8});

  @override
  Widget build(BuildContext context) {
    return Shimmer.fromColors(
      baseColor: Colors.grey[300]!,
      highlightColor: Colors.grey[100]!,
      child: SizedBox(
        height: 90,
        child: ListView.builder(
          scrollDirection: Axis.horizontal,
          padding: const EdgeInsets.symmetric(horizontal: 16),
          itemCount: itemCount,
          itemBuilder: (_, _) => const Padding(
            padding: EdgeInsets.only(right: 12),
            child: Column(
              children: [
                SizedBox(width: 56, height: 56, child: CircleAvatar(backgroundColor: Colors.white)),
                SizedBox(height: 6),
                SizedBox(width: 50, height: 10, child: DecoratedBox(decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.all(Radius.circular(4))))),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class ShimmerHomeTop extends StatelessWidget {
  const ShimmerHomeTop({super.key});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const SizedBox(height: 16),
        Shimmer.fromColors(
          baseColor: Colors.grey[300]!,
          highlightColor: Colors.grey[100]!,
          child: const Padding(
            padding: EdgeInsets.symmetric(horizontal: 16),
            child: Row(
              children: [
                SizedBox(width: 44, height: 44, child: CircleAvatar(backgroundColor: Colors.white)),
                SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      SizedBox(width: 100, height: 12, child: DecoratedBox(decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.all(Radius.circular(4))))),
                      SizedBox(height: 4),
                      SizedBox(width: 160, height: 14, child: DecoratedBox(decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.all(Radius.circular(4))))),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 16),
        Shimmer.fromColors(
          baseColor: Colors.grey[300]!,
          highlightColor: Colors.grey[100]!,
          child: const Padding(
            padding: EdgeInsets.symmetric(horizontal: 16),
            child: SizedBox(width: double.infinity, height: 50, child: DecoratedBox(decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.all(Radius.circular(16))))),
          ),
        ),
        const SizedBox(height: 16),
        Shimmer.fromColors(
          baseColor: Colors.grey[300]!,
          highlightColor: Colors.grey[100]!,
          child: const Padding(
            padding: EdgeInsets.symmetric(horizontal: 16),
            child: SizedBox(width: double.infinity, height: 160, child: DecoratedBox(decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.all(Radius.circular(16))))),
          ),
        ),
        const SizedBox(height: 16),
        const ShimmerCategories(),
        const SizedBox(height: 16),
        Shimmer.fromColors(
          baseColor: Colors.grey[300]!,
          highlightColor: Colors.grey[100]!,
          child: const Padding(
            padding: EdgeInsets.symmetric(horizontal: 16),
            child: SizedBox(width: 140, height: 18, child: DecoratedBox(decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.all(Radius.circular(4))))),
          ),
        ),
        const SizedBox(height: 12),
        const ShimmerProductGrid(itemCount: 4, crossAxisCount: 2),
      ],
    );
  }
}

class ShimmerWishlist extends StatelessWidget {
  final int itemCount;

  const ShimmerWishlist({super.key, this.itemCount = 4});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(top: 16),
      child: ShimmerProductGrid(itemCount: itemCount, crossAxisCount: 2),
    );
  }
}

class ShimmerAddressCard extends StatelessWidget {
  const ShimmerAddressCard({super.key});

  @override
  Widget build(BuildContext context) {
    return Shimmer.fromColors(
      baseColor: Colors.grey[300]!,
      highlightColor: Colors.grey[100]!,
      child: Container(
        margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16)),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(width: 20, height: 20, decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(4))),
                const SizedBox(width: 10),
                Container(width: 120, height: 14, decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(4))),
              ],
            ),
            const SizedBox(height: 8),
            Container(width: double.infinity, height: 12, decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(4))),
            const SizedBox(height: 4),
            Container(width: 180, height: 12, decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(4))),
          ],
        ),
      ),
    );
  }
}

class ShimmerCheckoutSummary extends StatelessWidget {
  const ShimmerCheckoutSummary({super.key});

  @override
  Widget build(BuildContext context) {
    return Shimmer.fromColors(
      baseColor: Colors.grey[300]!,
      highlightColor: Colors.grey[100]!,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            ...List.generate(3, (_) => const Padding(
              padding: EdgeInsets.only(bottom: 12),
              child: Row(
                children: [
                  SizedBox(width: 60, height: 60, child: DecoratedBox(decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.all(Radius.circular(8))))),
                  SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        SizedBox(width: 140, height: 14, child: DecoratedBox(decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.all(Radius.circular(4))))),
                        SizedBox(height: 4),
                        SizedBox(width: 80, height: 12, child: DecoratedBox(decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.all(Radius.circular(4))))),
                      ],
                    ),
                  ),
                  SizedBox(width: 50, height: 14, child: DecoratedBox(decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.all(Radius.circular(4))))),
                ],
              ),
            )),
            const SizedBox(height: 24, child: DecoratedBox(decoration: BoxDecoration(color: Colors.white))),
            ...List.generate(4, (_) => const Padding(
              padding: EdgeInsets.only(bottom: 8),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  SizedBox(width: 100, height: 14, child: DecoratedBox(decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.all(Radius.circular(4))))),
                  SizedBox(width: 60, height: 14, child: DecoratedBox(decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.all(Radius.circular(4))))),
                ],
              ),
            )),
          ],
        ),
      ),
    );
  }
}

class ShimmerProductList extends StatelessWidget {
  final int itemCount;

  const ShimmerProductList({super.key, this.itemCount = 6});

  @override
  Widget build(BuildContext context) {
    return ShimmerProductGrid(itemCount: itemCount, crossAxisCount: 2);
  }
}

class ShimmerMapPicker extends StatelessWidget {
  const ShimmerMapPicker({super.key});

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Shimmer.fromColors(
          baseColor: Colors.grey[300]!,
          highlightColor: Colors.grey[100]!,
          child: const SizedBox(width: double.infinity, height: 300, child: DecoratedBox(decoration: BoxDecoration(color: Colors.white))),
        ),
        Expanded(
          child: Shimmer.fromColors(
            baseColor: Colors.grey[300]!,
            highlightColor: Colors.grey[100]!,
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                children: [
                  const SizedBox(width: 200, height: 18, child: DecoratedBox(decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.all(Radius.circular(4))))),
                  const SizedBox(height: 16),
                  const SizedBox(width: double.infinity, height: 14, child: DecoratedBox(decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.all(Radius.circular(4))))),
                  const SizedBox(height: 8),
                  const SizedBox(width: double.infinity, height: 14, child: DecoratedBox(decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.all(Radius.circular(4))))),
                  const SizedBox(height: 24),
                  const Spacer(),
                  const SizedBox(width: double.infinity, height: 52, child: DecoratedBox(decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.all(Radius.circular(16))))),
                ],
              ),
            ),
          ),
        ),
      ],
    );
  }
}

class ShimmerReturnsList extends StatelessWidget {
  final int itemCount;

  const ShimmerReturnsList({super.key, this.itemCount = 3});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(top: 16),
      child: Column(
        children: List.generate(itemCount, (_) => const Padding(
          padding: EdgeInsets.only(bottom: 12),
          child: ShimmerOrderCard(),
        )),
      ),
    );
  }
}

class ShimmerProductDetail extends StatelessWidget {
  const ShimmerProductDetail({super.key});

  @override
  Widget build(BuildContext context) {
    return Shimmer.fromColors(
      baseColor: Colors.grey[300]!,
      highlightColor: Colors.grey[100]!,
      child: Column(
        children: [
          Container(height: 300, color: Colors.white),
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(width: 100, height: 20, decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(4))),
                const SizedBox(height: 12),
                Container(width: double.infinity, height: 24, decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(4))),
                const SizedBox(height: 8),
                Container(width: 200, height: 14, decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(4))),
                const SizedBox(height: 16),
                Row(
                  children: [
                    Container(width: 100, height: 32, decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(8))),
                    const SizedBox(width: 12),
                    Container(width: 80, height: 32, decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(8))),
                  ],
                ),
                const SizedBox(height: 16),
                Container(width: 140, height: 32, decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12))),
                const SizedBox(height: 16),
                Container(width: 120, height: 14, decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(4))),
                const SizedBox(height: 24),
                Container(
                  margin: const EdgeInsets.symmetric(horizontal: 16),
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16)),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Container(width: 80, height: 16, decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(4))),
                      Row(
                        children: [
                          Container(width: 40, height: 40, decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12))),
                          const SizedBox(width: 12),
                          Container(width: 30, height: 20, decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(4))),
                          const SizedBox(width: 12),
                          Container(width: 40, height: 40, decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12))),
                        ],
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 24),
                Container(
                  margin: const EdgeInsets.symmetric(horizontal: 16),
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16)),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Container(width: 20, height: 20, decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(4))),
                          const SizedBox(width: 8),
                          Container(width: 120, height: 16, decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(4))),
                        ],
                      ),
                      const SizedBox(height: 12),
                      Container(width: double.infinity, height: 12, decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(4))),
                      const SizedBox(height: 6),
                      Container(width: 250, height: 12, decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(4))),
                    ],
                  ),
                ),
                const SizedBox(height: 24),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  child: Container(width: 160, height: 18, decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(4))),
                ),
                const SizedBox(height: 12),
                SizedBox(
                  height: 220,
                  child: ListView.builder(
                    scrollDirection: Axis.horizontal,
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    itemCount: 3,
                    itemBuilder: (_, _) => Container(
                      width: 150,
                      margin: const EdgeInsets.only(right: 12),
                      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16)),
                    ),
                  ),
                ),
                const SizedBox(height: 100),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class ShimmerPaymentCards extends StatelessWidget {
  const ShimmerPaymentCards({super.key});

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Container(
          margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16)),
          child: Row(
            children: [
              Container(width: 48, height: 32, decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(8))),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(width: 140, height: 14, decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(4))),
                    const SizedBox(height: 4),
                    Container(width: 80, height: 12, decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(4))),
                  ],
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 8),
        Container(
          margin: const EdgeInsets.symmetric(horizontal: 16),
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16)),
          child: Row(
            children: [
              Container(width: 48, height: 32, decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(8))),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(width: 120, height: 14, decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(4))),
                    const SizedBox(height: 4),
                    Container(width: 100, height: 12, decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(4))),
                  ],
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class ButtonLoader extends StatefulWidget {
  final String text;
  final double fontSize;

  const ButtonLoader({
    super.key,
    this.text = 'Processing',
    this.fontSize = 15,
  });

  @override
  State<ButtonLoader> createState() => _ButtonLoaderState();
}

class _ButtonLoaderState extends State<ButtonLoader> with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  int _dotCount = 0;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1200),
    )..repeat();
    _controller.addListener(() {
      int newDots = (_controller.value * 4).floor();
      if (newDots != _dotCount) {
        setState(() => _dotCount = newDots);
      }
    });
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    String dots = '.' * (_dotCount % 4);
    return Center(
      child: Text(
        '${widget.text}$dots',
        style: GoogleFonts.poppins(
          fontSize: widget.fontSize,
          fontWeight: FontWeight.w600,
          color: Colors.white,
        ),
      ),
    );
  }
}

Widget buildShimmerButtonLoader({String text = 'Processing', double height = 52, double fontSize = 15}) {
  return SizedBox(
    width: double.infinity,
    height: height,
    child: ElevatedButton(
      onPressed: null,
      style: ElevatedButton.styleFrom(
        backgroundColor: AppTheme.primary.withValues(alpha: 0.6),
        padding: const EdgeInsets.symmetric(vertical: 14),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        elevation: 0,
      ),
      child: ButtonLoader(text: text, fontSize: fontSize),
    ),
  );
}

class ShimmerReviewCard extends StatelessWidget {
  const ShimmerReviewCard({super.key});

  @override
  Widget build(BuildContext context) {
    return shimmerWrap(child: Container(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(width: 40, height: 40, decoration: const BoxDecoration(color: Colors.white, shape: BoxShape.circle)),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(width: 100, height: 14, decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(4))),
                    const SizedBox(height: 4),
                    Container(width: 140, height: 12, decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(4))),
                  ],
                ),
              ),
              Container(width: 80, height: 16, decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(4))),
            ],
          ),
          const SizedBox(height: 12),
          Container(width: double.infinity, height: 12, decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(4))),
          const SizedBox(height: 4),
          Container(width: 200, height: 12, decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(4))),
        ],
      ),
    ));
  }
}

class ShimmerStoreGrid extends StatelessWidget {
  final int itemCount;

  const ShimmerStoreGrid({super.key, this.itemCount = 6});

  @override
  Widget build(BuildContext context) {
    return shimmerWrap(child: Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: GridView.builder(
        shrinkWrap: true,
        physics: const NeverScrollableScrollPhysics(),
        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
          crossAxisCount: 2,
          childAspectRatio: 0.75,
          crossAxisSpacing: 12,
          mainAxisSpacing: 12,
        ),
        itemCount: itemCount,
        itemBuilder: (_, _) => Container(
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(20),
          ),
          child: Column(
            children: [
              Container(
                height: 80,
                decoration: const BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
                ),
              ),
              Expanded(
                child: Padding(
                  padding: const EdgeInsets.all(12),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Container(width: double.infinity, height: 14, decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(4))),
                      const SizedBox(height: 6),
                      Container(width: 100, height: 12, decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(4))),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    ));
  }
}
