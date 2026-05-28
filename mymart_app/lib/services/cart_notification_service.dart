import 'package:flutter/material.dart';

class CartNotificationService {
  static OverlayEntry? _currentOverlay;

  static void showAddedToCart(BuildContext context, String productName, int quantity) {
    // Remove any existing overlay
    _currentOverlay?.remove();

    OverlayEntry overlayEntry = OverlayEntry(
      builder: (context) => _CartPopupNotification(
        productName: productName,
        quantity: quantity,
        onDismiss: () {
          _currentOverlay?.remove();
          _currentOverlay = null;
        },
      ),
    );

    _currentOverlay = overlayEntry;
    Overlay.of(context).insert(overlayEntry);
  }

  static void showCartCleared(BuildContext context) {
    // Remove any existing overlay
    _currentOverlay?.remove();

    OverlayEntry overlayEntry = OverlayEntry(
      builder: (context) => _CartPopupNotification(
        message: 'Cart cleared! New store items added.',
        icon: Icons.info_outline,
        backgroundColor: const Color(0xFFFF9500),
        onDismiss: () {
          _currentOverlay?.remove();
          _currentOverlay = null;
        },
      ),
    );

    _currentOverlay = overlayEntry;
    Overlay.of(context).insert(overlayEntry);
  }

  static void showMaxQuantityReached(BuildContext context) {
    // Remove any existing overlay
    _currentOverlay?.remove();

    OverlayEntry overlayEntry = OverlayEntry(
      builder: (context) => _CartPopupNotification(
        message: 'Maximum 5 units per product',
        icon: Icons.warning_amber_rounded,
        backgroundColor: const Color(0xFFFF9500),
        onDismiss: () {
          _currentOverlay?.remove();
          _currentOverlay = null;
        },
      ),
    );

    _currentOverlay = overlayEntry;
    Overlay.of(context).insert(overlayEntry);
  }
}

// Top Floating Cart Popup Notification Widget
class _CartPopupNotification extends StatefulWidget {
  final String? productName;
  final int? quantity;
  final String? message;
  final IconData? icon;
  final Color? backgroundColor;
  final VoidCallback onDismiss;

  const _CartPopupNotification({
    this.productName,
    this.quantity,
    this.message,
    this.icon,
    this.backgroundColor,
    required this.onDismiss,
  });

  @override
  State<_CartPopupNotification> createState() => _CartPopupNotificationState();
}

class _CartPopupNotificationState extends State<_CartPopupNotification>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _slideAnim;
  late Animation<double> _fadeAnim;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 400),
    );

    _slideAnim = Tween<double>(begin: -1.0, end: 0.0).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeOutBack),
    );

    _fadeAnim = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeOut),
    );

    _controller.forward();

    // Auto dismiss after 2.5 seconds
    Future.delayed(const Duration(milliseconds: 2500), () {
      if (mounted) {
        _dismiss();
      }
    });
  }

  void _dismiss() async {
    await _controller.reverse();
    widget.onDismiss();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isAddedToCart = widget.productName != null;
    final backgroundColor = widget.backgroundColor ?? const Color(0xFF52C41A);
    final icon = widget.icon ?? Icons.check_circle;

    return Positioned(
      top: MediaQuery.of(context).padding.top + 10,
      left: 16,
      right: 16,
      child: AnimatedBuilder(
        animation: _controller,
        builder: (context, child) {
          return Transform.translate(
            offset: Offset(0, _slideAnim.value * -100),
            child: Opacity(
              opacity: _fadeAnim.value,
              child: child,
            ),
          );
        },
        child: GestureDetector(
          onTap: _dismiss,
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            decoration: BoxDecoration(
              color: backgroundColor,
              borderRadius: BorderRadius.circular(16),
              boxShadow: [
                BoxShadow(
                  color: backgroundColor.withValues(alpha: 0.4),
                  blurRadius: 12,
                  offset: const Offset(0, 4),
                ),
              ],
            ),
            child: Row(
              children: [
                Container(
                  width: 40,
                  height: 40,
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.2),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Icon(icon, color: Colors.white, size: 24),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        isAddedToCart ? 'Added to cart' : widget.message ?? 'Success',
                        style: const TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.w700,
                          fontSize: 15,
                        ),
                      ),
                      if (isAddedToCart) ...[
                        const SizedBox(height: 2),
                        Text(
                          '${widget.productName} × ${widget.quantity}',
                          style: TextStyle(
                            color: Colors.white.withValues(alpha: 0.9),
                            fontSize: 13,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                    ],
                  ),
                ),
                const SizedBox(width: 8),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.2),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: const Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.shopping_cart, color: Colors.white, size: 14),
                      SizedBox(width: 4),
                      Text(
                        'VIEW',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 11,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}