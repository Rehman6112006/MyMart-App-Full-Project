import 'package:flutter/material.dart';

class AnimatedScaleIn extends StatefulWidget {
  final Widget child;
  final Duration duration;
  final double begin;
  final Curve curve;
  final int delay;

  const AnimatedScaleIn({
    super.key,
    required this.child,
    this.duration = const Duration(milliseconds: 400),
    this.begin = 0.8,
    this.curve = Curves.easeOutCubic,
    this.delay = 0,
  });

  @override
  State<AnimatedScaleIn> createState() => _AnimatedScaleInState();
}

class _AnimatedScaleInState extends State<AnimatedScaleIn>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _animation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: widget.duration,
    );
    _animation = CurvedAnimation(parent: _controller, curve: widget.curve);
    Future.delayed(Duration(milliseconds: widget.delay), () {
      if (mounted) _controller.forward();
    });
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _animation,
      builder: (context, child) => Transform.scale(
        scale: widget.begin + (1 - widget.begin) * _animation.value,
        child: Opacity(
          opacity: _animation.value,
          child: child,
        ),
      ),
      child: widget.child,
    );
  }
}

class AnimatedSlideFade extends StatefulWidget {
  final Widget child;
  final Duration duration;
  final Offset beginOffset;
  final Curve curve;
  final int delay;

  const AnimatedSlideFade({
    super.key,
    required this.child,
    this.duration = const Duration(milliseconds: 400),
    this.beginOffset = const Offset(0, 0.1),
    this.curve = Curves.easeOutCubic,
    this.delay = 0,
  });

  @override
  State<AnimatedSlideFade> createState() => _AnimatedSlideFadeState();
}

class _AnimatedSlideFadeState extends State<AnimatedSlideFade>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _animation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: widget.duration,
    );
    _animation = CurvedAnimation(parent: _controller, curve: widget.curve);
    Future.delayed(Duration(milliseconds: widget.delay), () {
      if (mounted) _controller.forward();
    });
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _animation,
      builder: (context, child) => Transform.translate(
        offset: widget.beginOffset * (1 - _animation.value),
        child: Opacity(
          opacity: _animation.value,
          child: child,
        ),
      ),
      child: widget.child,
    );
  }
}

class ShimmerLoading extends StatefulWidget {
  final double width;
  final double height;
  final double borderRadius;
  final Color? baseColor;
  final Color? highlightColor;

  const ShimmerLoading({
    super.key,
    this.width = double.infinity,
    this.height = 16,
    this.borderRadius = 8,
    this.baseColor,
    this.highlightColor,
  });

  @override
  State<ShimmerLoading> createState() => _ShimmerLoadingState();
}

class _ShimmerLoadingState extends State<ShimmerLoading>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _animation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1500),
    )..repeat();
    _animation = Tween<double>(begin: -2, end: 2).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeInOutSine),
    );
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _animation,
      builder: (context, child) => Container(
        width: widget.width,
        height: widget.height,
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(widget.borderRadius),
          gradient: LinearGradient(
            colors: [
              widget.baseColor ?? Colors.grey[300]!,
              widget.highlightColor ?? Colors.grey[100]!,
              widget.baseColor ?? Colors.grey[300]!,
            ],
            stops: const [0.0, 0.5, 1.0],
            begin: Alignment(-1 + _animation.value, -1),
            end: Alignment(1 + _animation.value, 1),
          ),
        ),
      ),
    );
  }
}
