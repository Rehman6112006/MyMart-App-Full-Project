import 'dart:convert';

class Review {
  final String id;
  final String productId;
  final String? userId;
  final String userName;
  final double rating;
  final String comment;
  final List<String> images;
  final String? vendorResponse;
  final String? createdAt;
  final int helpfulCount;
  final bool isVerified;

  Review({
    required this.id,
    required this.productId,
    this.userId,
    required this.userName,
    required this.rating,
    required this.comment,
    this.images = const [],
    this.vendorResponse,
    this.createdAt,
    this.helpfulCount = 0,
    this.isVerified = false,
  });

  String get formattedDate {
    if (createdAt == null) return '';
    try {
      final dt = DateTime.parse(createdAt!);
      return '${dt.day}/${dt.month}/${dt.year}';
    } catch (_) {
      return createdAt ?? '';
    }
  }

  factory Review.fromJson(Map<String, dynamic> json) {
    return Review(
      id: json['id']?.toString() ?? '',
      productId: json['product_id']?.toString() ?? '',
      userId: json['user_id']?.toString(),
      userName: json['username'] ?? json['user_name'] ?? json['user']?['name']
          ?? (json['first_name'] != null ? '${json['first_name']} ${json['last_name'] ?? ''}' : null)
          ?? 'Anonymous',
      rating: (json['rating'] is num) ? (json['rating'] as num).toDouble() : 0,
      comment: json['comment'] ?? json['review_text'] ?? '',
      images: json['images'] != null
        ? (json['images'] is List
            ? List<String>.from(json['images'])
            : (json['images'] is String && (json['images'] as String).isNotEmpty
                ? (json['images'] as String).startsWith('[')
                    ? (jsonDecode(json['images']) as List).cast<String>()
                    : [json['images'] as String]
                : []))
        : [],
      vendorResponse: json['vendor_response'],
      createdAt: json['created_at'] ?? json['createdAt'],
      helpfulCount: json['helpful_count'] ?? 0,
      isVerified: json['verified_purchase'] ?? false,
    );
  }
}
