import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';

class NetworkImageWithError extends StatelessWidget {
  final String? imageUrl;
  final double? width;
  final double? height;
  final BoxFit fit;
  final Widget? placeholder;
  final Widget? errorWidget;

  const NetworkImageWithError({
    super.key,
    this.imageUrl,
    this.width,
    this.height,
    this.fit = BoxFit.cover,
    this.placeholder,
    this.errorWidget,
  });

  @override
  Widget build(BuildContext context) {
    if (imageUrl == null || imageUrl!.isEmpty) {
      return errorWidget ?? _buildDefaultErrorWidget();
    }

    return CachedNetworkImage(
      imageUrl: imageUrl!,
      width: width,
      height: height,
      fit: fit,
      fadeInDuration: const Duration(milliseconds: 300),
      fadeOutDuration: const Duration(milliseconds: 150),
      placeholder: (context, url) => placeholder ?? _buildDefaultPlaceholder(),
      errorWidget: (context, url, error) => errorWidget ?? _buildDefaultErrorWidget(),
      memCacheWidth: width != null ? (width! * 2).toInt() : null,
      memCacheHeight: height != null ? (height! * 2).toInt() : null,
    );
  }

  Widget _buildDefaultPlaceholder() {
    return Container(
      width: width,
      height: height,
      color: Colors.grey[200],
      child: const SizedBox.shrink(),
    );
  }

  Widget _buildDefaultErrorWidget() {
    return Container(
      width: width,
      height: height,
      color: Colors.grey[100],
      child: const Center(
        child: Icon(
          Icons.image_not_supported,
          color: Colors.grey,
          size: 40,
        ),
      ),
    );
  }
}

class ProductImage extends StatelessWidget {
  final String? imageUrl;
  final double? width;
  final double? height;
  final BoxFit fit;

  const ProductImage({
    super.key,
    this.imageUrl,
    this.width,
    this.height,
    this.fit = BoxFit.cover,
  });

  @override
  Widget build(BuildContext context) {
    return CachedNetworkImage(
      imageUrl: imageUrl ?? '',
      width: width,
      height: height,
      fit: fit,
      fadeInDuration: const Duration(milliseconds: 300),
      fadeOutDuration: const Duration(milliseconds: 150),
      placeholder: (context, url) => Container(
        width: width,
        height: height,
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [Colors.grey[100]!, Colors.grey[200]!],
          ),
        ),
      ),
      errorWidget: (context, url, error) => Container(
        width: width,
        height: height,
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [Colors.grey[100]!, Colors.grey[200]!],
          ),
        ),
        child: const Center(
          child: Icon(
            Icons.shopping_bag,
            color: Colors.grey,
            size: 40,
          ),
        ),
      ),
      memCacheWidth: width != null ? (width! * 2).toInt() : 300,
      memCacheHeight: height != null ? (height! * 2).toInt() : 300,
    );
  }
}

class StoreLogo extends StatelessWidget {
  final String? logoUrl;
  final double? size;

  const StoreLogo({
    super.key,
    this.logoUrl,
    this.size = 60,
  });

  @override
  Widget build(BuildContext context) {
    return CachedNetworkImage(
      imageUrl: logoUrl ?? '',
      width: size,
      height: size,
      fit: BoxFit.cover,
      fadeInDuration: const Duration(milliseconds: 300),
      fadeOutDuration: const Duration(milliseconds: 150),
      placeholder: (context, url) => Container(
        width: size,
        height: size,
        decoration: BoxDecoration(
          color: Colors.grey[200],
          borderRadius: BorderRadius.circular(size! / 2),
        ),
      ),
      errorWidget: (context, url, error) => Container(
        width: size,
        height: size,
        decoration: BoxDecoration(
          color: Colors.grey[200],
          borderRadius: BorderRadius.circular(size! / 2),
        ),
        child: const Center(
          child: Icon(
            Icons.store,
            color: Colors.grey,
            size: 24,
          ),
        ),
      ),
      memCacheWidth: (size! * 2).toInt(),
      memCacheHeight: (size! * 2).toInt(),
    );
  }
}
