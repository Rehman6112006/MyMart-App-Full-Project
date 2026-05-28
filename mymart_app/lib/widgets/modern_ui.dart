import 'dart:ui' as ui;
import 'package:flutter/material.dart';

class GradientText extends StatelessWidget {
  final String text;
  final TextStyle? style;
  final Gradient gradient;
  final TextAlign? textAlign;

  const GradientText(
    this.text, {
    super.key,
    this.style,
    this.gradient = const LinearGradient(
      colors: [Color(0xFF16A34A), Color(0xFF22C55E)],
    ),
    this.textAlign,
  });

  @override
  Widget build(BuildContext context) {
    return ShaderMask(
      shaderCallback: (bounds) => gradient.createShader(
        Rect.fromLTWH(0, 0, bounds.width, bounds.height),
      ),
      blendMode: BlendMode.srcIn,
      child: Text(text, style: style, textAlign: textAlign),
    );
  }
}

class GlassMorphism extends StatelessWidget {
  final Widget child;
  final double borderRadius;
  final double blur;
  final double opacity;
  final EdgeInsetsGeometry? padding;

  const GlassMorphism({
    super.key,
    required this.child,
    this.borderRadius = 16,
    this.blur = 10,
    this.opacity = 0.15,
    this.padding,
  });

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(borderRadius),
      child: BackdropFilter(
        filter: ui.ImageFilter.blur(sigmaX: blur, sigmaY: blur),
        child: Container(
          padding: padding,
          decoration: BoxDecoration(
            color: Colors.white.withValues(alpha: opacity),
            borderRadius: BorderRadius.circular(borderRadius),
            border: Border.all(
              color: Colors.white.withValues(alpha: 0.3),
            ),
          ),
          child: child,
        ),
      ),
    );
  }
}

class AnimatedCounter extends StatefulWidget {
  final int target;
  final Duration duration;
  final TextStyle? style;

  const AnimatedCounter({
    super.key,
    required this.target,
    this.duration = const Duration(milliseconds: 1000),
    this.style,
  });

  @override
  State<AnimatedCounter> createState() => _AnimatedCounterState();
}

class _AnimatedCounterState extends State<AnimatedCounter>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _animation;
  int _displayValue = 0;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(vsync: this, duration: widget.duration);
    _animation = Tween<double>(begin: 0, end: widget.target.toDouble())
        .animate(CurvedAnimation(parent: _controller, curve: Curves.easeOutCubic));
    _controller.forward();
    _controller.addListener(() {
      setState(() {
        _displayValue = _animation.value.round();
      });
    });
  }

  @override
  void didUpdateWidget(AnimatedCounter oldWidget) {
    if (oldWidget.target != widget.target) {
      _controller.forward(from: 0);
    }
    super.didUpdateWidget(oldWidget);
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Text(
      _displayValue.toString(),
      style: widget.style,
    );
  }
}
