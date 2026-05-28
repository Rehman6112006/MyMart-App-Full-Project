class Category {
  final String id;
  final String name;
  final String? slug;
  final String? description;
  final String? image;
  final String? icon;
  final String? color;
  final String? parentId;
  final bool? isActive;
  final bool? isFeatured;
  final List<Category> children;

  Category({
    required this.id,
    required this.name,
    this.slug,
    this.description,
    this.image,
    this.icon,
    this.color,
    this.parentId,
    this.isActive,
    this.isFeatured,
    this.children = const [],
  });

  factory Category.fromJson(Map<String, dynamic> json) {
    return Category(
      id: json['id']?.toString() ?? '',
      name: json['name'] ?? '',
      slug: json['slug'],
      description: json['description'],
      image: json['image'],
      icon: json['icon'],
      color: json['color'],
      parentId: json['parent_id']?.toString(),
      isActive: json['is_active'] ?? json['isActive'],
      isFeatured: json['is_featured'] ?? json['isFeatured'],
      children: json['children'] != null
          ? (json['children'] as List)
              .map((e) => Category.fromJson(e))
              .toList()
          : [],
    );
  }
}
