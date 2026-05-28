import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../config/theme.dart';

class AnimatedButton extends StatefulWidget {
  final String text;
  final VoidCallback? onPressed;
  final bool isLoading;
  final Color? backgroundColor;
  final Color? textColor;
  final double? width;
  final double height;
  final double borderRadius;
  final bool isGradient;

  const AnimatedButton({
    super.key,
    required this.text,
    this.onPressed,
    this.isLoading = false,
    this.backgroundColor,
    this.textColor,
    this.width,
    this.height = 56,
    this.borderRadius = 20,
    this.isGradient = false,
  });

  @override
  State<AnimatedButton> createState() => _AnimatedButtonState();
}

class _AnimatedButtonState extends State<AnimatedButton> with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _scaleAnimation;
  bool _isPressed = false;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      duration: const Duration(milliseconds: 150),
      vsync: this,
    );
    _scaleAnimation = Tween<double>(begin: 1.0, end: 0.96).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeInOut),
    );
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _handlePress() {
    if (widget.isLoading || widget.onPressed == null) return;

    setState(() => _isPressed = true);
    _controller.forward();

    Future.delayed(const Duration(milliseconds: 150), () {
      setState(() => _isPressed = false);
      _controller.reverse();
      widget.onPressed!();
    });
  }

  @override
  Widget build(BuildContext context) {
    final bgColor = widget.backgroundColor ?? AppTheme.primary;
    final txtColor = widget.textColor ?? Colors.white;

    return ScaleTransition(
      scale: _scaleAnimation,
      child: Container(
        width: widget.width,
        height: widget.height,
        decoration: BoxDecoration(
          gradient: widget.isGradient ? AppTheme.primaryGradient : null,
          color: widget.isGradient ? null : bgColor,
          borderRadius: BorderRadius.circular(widget.borderRadius),
          boxShadow: [
            BoxShadow(
              color: bgColor.withValues(alpha: _isPressed ? 0.25 : 0.35),
              blurRadius: _isPressed ? 8 : 14,
              offset: Offset(0, _isPressed ? 2 : 6),
            ),
          ],
        ),
        child: Material(
          color: Colors.transparent,
          child: InkWell(
            borderRadius: BorderRadius.circular(widget.borderRadius),
            onTap: _handlePress,
            onHighlightChanged: (isHighlighted) {
              if (!isHighlighted) _controller.reverse();
            },
            child: Center(
              child: widget.isLoading
                  ? SizedBox(
                      width: 24,
                      height: 24,
                      child: CircularProgressIndicator(
                        strokeWidth: 2.5,
                        valueColor: AlwaysStoppedAnimation<Color>(txtColor),
                      ),
                    )
                  : Text(
                      widget.text,
                      style: GoogleFonts.poppins(
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                        color: txtColor,
                        letterSpacing: 0.4,
                      ),
                    ),
            ),
          ),
        ),
      ),
    );
  }
}

class AnimatedIconButton extends StatefulWidget {
  final IconData icon;
  final VoidCallback onPressed;
  final Color? backgroundColor;
  final Color? iconColor;
  final double size;
  final double iconSize;

  const AnimatedIconButton({
    super.key,
    required this.icon,
    required this.onPressed,
    this.backgroundColor,
    this.iconColor,
    this.size = 44,
    this.iconSize = 20,
  });

  @override
  State<AnimatedIconButton> createState() => _AnimatedIconButtonState();
}

class _AnimatedIconButtonState extends State<AnimatedIconButton> with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _scaleAnimation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      duration: const Duration(milliseconds: 100),
      vsync: this,
    );
    _scaleAnimation = Tween<double>(begin: 1.0, end: 0.9).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeInOut),
    );
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _handlePress() {
    _controller.forward().then((_) {
      _controller.reverse();
      widget.onPressed();
    });
  }

  @override
  Widget build(BuildContext context) {
    final bgColor = widget.backgroundColor ?? AppTheme.primary;
    final iconCol = widget.iconColor ?? Colors.white;

    return ScaleTransition(
      scale: _scaleAnimation,
      child: Container(
        width: widget.size,
        height: widget.size,
        decoration: BoxDecoration(
          color: bgColor,
          shape: BoxShape.circle,
          boxShadow: [
            BoxShadow(
              color: bgColor.withValues(alpha: 0.3),
              blurRadius: 8,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Material(
          color: Colors.transparent,
          child: InkWell(
            borderRadius: BorderRadius.circular(widget.size / 2),
            onTap: _handlePress,
            child: Center(
              child: Icon(
                widget.icon,
                color: iconCol,
                size: widget.iconSize,
              ),
            ),
          ),
        ),
      ),
    );
  }
}
