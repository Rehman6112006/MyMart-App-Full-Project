class Product {
  final String id;
  final String name;
  final String? slug;
  final String? description;
  final String? sku;
  final String? categoryId;
  final String? brand;
  final double basePrice;
  final double? discountPercentage;
  final double? discountPrice;
  final int stockQuantity;
  final int? lowStockThreshold;
  final String? condition;
  final double? averageRating;
  final int? reviewCount;
  final int? viewCount;
  final bool? isActive;
  final String? storeId;
  final String? storeName;
  final List<String> images;
  final List<Map<String, dynamic>>? attributes;

  Product({
    required this.id,
    required this.name,
    this.slug,
    this.description,
    this.sku,
    this.categoryId,
    this.brand,
    required this.basePrice,
    this.discountPercentage,
    this.discountPrice,
    required this.stockQuantity,
    this.lowStockThreshold,
    this.condition,
    this.averageRating,
    this.reviewCount,
    this.viewCount,
    this.isActive,
    this.storeId,
    this.storeName,
    this.images = const [],
    this.attributes,
  });

  double get effectivePrice => discountPrice ?? basePrice;
  bool get hasDiscount => discountPrice != null && discountPrice! < basePrice;
  bool get isInStock => stockQuantity > 0;

  factory Product.fromJson(Map<String, dynamic> json) {
    // Handle thumbnail/image_url and convert to images list
    List<String> productImages = [];
    if (json['images'] != null && json['images'] is List) {
      productImages = List<String>.from(json['images']);
    } else if (json['thumbnail'] != null) {
      productImages = [json['thumbnail'].toString()];
    } else if (json['image_url'] != null) {
      productImages = [json['image_url'].toString()];
    }
    
    // Parse base_price - handle string or number
    double price = 0;
    if (json['base_price'] != null) {
      if (json['base_price'] is num) {
        price = (json['base_price'] as num).toDouble();
      } else {
        price = double.tryParse(json['base_price'].toString()) ?? 0;
      }
    }
    
    return Product(
      id: json['id']?.toString() ?? '',
      name: json['name'] ?? '',
      slug: json['slug'],
      description: json['description'],
      sku: json['sku'],
      categoryId: json['category_id']?.toString(),
      brand: json['brand'],
      basePrice: price,
      discountPercentage: json['discount_percentage'] != null
          ? (json['discount_percentage'] is num 
              ? (json['discount_percentage'] as num).toDouble()
              : double.tryParse(json['discount_percentage'].toString()))
          : null,
      discountPrice: json['discount_price'] != null
          ? (json['discount_price'] is num
              ? (json['discount_price'] as num).toDouble()
              : double.tryParse(json['discount_price'].toString()))
          : null,
      stockQuantity: json['stock_quantity'] ?? json['stockQuantity'] ?? 0,
      lowStockThreshold: json['low_stock_threshold'],
      condition: json['condition'],
      averageRating: json['average_rating'] != null
          ? (json['average_rating'] is num
              ? (json['average_rating'] as num).toDouble()
              : double.tryParse(json['average_rating'].toString()))
          : null,
      reviewCount: json['review_count'],
      viewCount: json['view_count'],
      isActive: json['is_active'] ?? json['isActive'],
      storeId: json['store_id']?.toString(),
      storeName: json['store_name'],
      images: productImages,
      attributes: json['attributes'] != null
          ? List<Map<String, dynamic>>.from(json['attributes'])
          : null,
    );
  }
}
