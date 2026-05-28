class Store {
  final String id;
  final String storeName;
  final String? slug;
  final String? description;
  final String? email;
  final String? phone;
  final String? address;
  final String? city;
  final String? ownerId;
  final bool? isActive;
  final bool? isVerified;
  final String? logo;
  final double? averageRating;

  Store({
    required this.id,
    required this.storeName,
    this.slug,
    this.description,
    this.email,
    this.phone,
    this.address,
    this.city,
    this.ownerId,
    this.isActive,
    this.isVerified,
    this.logo,
    this.averageRating,
  });

  factory Store.fromJson(Map<String, dynamic> json) {
    return Store(
      id: json['id']?.toString() ?? '',
      storeName: json['store_name'] ?? json['storeName'] ?? '',
      slug: json['slug'],
      description: json['description'],
      email: json['email'],
      phone: json['phone'],
      address: json['address'],
      city: json['city'],
      ownerId: json['owner_id']?.toString(),
      isActive: json['is_active'] ?? json['isActive'],
      isVerified: json['is_verified'] ?? json['isVerified'],
      logo: json['logo'] ?? json['store_logo'],
      averageRating: json['average_rating'] != null
          ? (json['average_rating']).toDouble()
          : null,
    );
  }
}
