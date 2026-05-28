class CartItem {
  final String id;
  final String productId;
  final String productName;
  final double price;
  final int quantity;
  final String? image;
  final String? storeId;
  final String? storeName;
  final int? stockQuantity;

  CartItem({
    required this.id,
    required this.productId,
    required this.productName,
    required this.price,
    required this.quantity,
    this.image,
    this.storeId,
    this.storeName,
    this.stockQuantity,
  });

  double get totalPrice => price * quantity;

  factory CartItem.fromJson(Map<String, dynamic> json) {
    // Helper to safely extract price
    double extractPrice(dynamic value) {
      if (value == null) return 0.0;
      if (value is double) return value;
      if (value is int) return value.toDouble();
      if (value is String) return double.tryParse(value) ?? 0.0;
      return 0.0;
    }

    // Extract price from various possible fields
    double price = extractPrice(json['price']);
    if (price == 0) price = extractPrice(json['unit_price']);
    if (price == 0) price = extractPrice(json['discount_price']);
    if (price == 0) price = extractPrice(json['base_price']);

    return CartItem(
      id: json['id']?.toString() ?? '',
      productId: json['product_id']?.toString() ?? json['productId']?.toString() ?? '',
      productName: json['product_name'] ?? json['productName'] ?? json['name'] ?? '',
      price: price,
      quantity: json['quantity'] ?? 1,
      image: json['image'] ?? json['product_image'] ?? json['image_url'] ?? json['thumbnail'],
      storeId: json['store_id']?.toString(),
      storeName: json['store_name'],
      stockQuantity: json['stock_quantity'] ?? json['stockQuantity'],
    );
  }
}
