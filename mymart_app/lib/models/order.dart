class Order {
  final String id;
  final String orderNumber;
  final double subtotal;
  final double taxAmount;
  final double shippingCost;
  final double discountAmount;
  final double totalAmount;
  final String paymentMethod;
  final String paymentStatus;
  final String orderStatus;
  final Map<String, dynamic>? shippingAddress;
  final String? createdAt;
  final List<OrderItem>? items;
  final String? storeId;
  final String? storeName;
  final String? vendorId;
  
  // Delivery details
  final String? deliveryAddressId;
  final String? deliverySlotId;
  final String? deliverySlotName;
  final String? deliverySlotType;
  final String? deliveryDate;
  final String? deliveryNotes;
  final String? deliveryPersonName;
  final String? deliveryPersonPhone;
  final String? cancellationReason;
  
  // Address details
  final String? addressName;
  final String? addressPhone;
  final String? addressLine1;
  final String? addressLine2;
  final String? city;
  final String? postalCode;
  final String? landmark;

  Order({
    required this.id,
    required this.orderNumber,
    required this.subtotal,
    required this.taxAmount,
    required this.shippingCost,
    required this.discountAmount,
    required this.totalAmount,
    required this.paymentMethod,
    required this.paymentStatus,
    required this.orderStatus,
    this.shippingAddress,
    this.createdAt,
    this.items,
    this.storeId,
    this.storeName,
    this.vendorId,
    this.deliveryAddressId,
    this.deliverySlotId,
    this.deliverySlotName,
    this.deliverySlotType,
    this.deliveryDate,
    this.deliveryNotes,
    this.deliveryPersonName,
    this.deliveryPersonPhone,
    this.cancellationReason,
    this.addressName,
    this.addressPhone,
    this.addressLine1,
    this.addressLine2,
    this.city,
    this.postalCode,
    this.landmark,
  });

  String get statusLabel {
    switch (orderStatus.toLowerCase()) {
      case 'pending': return 'Pending';
      case 'confirmed': return 'Confirmed';
      case 'preparing': return 'Preparing';
      case 'out_for_delivery': return 'Out for Delivery';
      case 'delivered': return 'Delivered';
      case 'cancelled': return 'Cancelled';
      case 'refunded': return 'Refunded';
      default: return orderStatus;
    }
  }

  String get statusDescription {
    switch (orderStatus.toLowerCase()) {
      case 'pending': return 'Waiting for vendor confirmation';
      case 'confirmed': return 'Vendor confirmed your order';
      case 'preparing': return 'Your order is being prepared';
      case 'out_for_delivery': return 'Order is on the way';
      case 'delivered': return 'Order delivered successfully';
      case 'cancelled': return cancellationReason ?? 'Order cancelled';
      default: return '';
    }
  }

  bool get canCancel => orderStatus.toLowerCase() == 'pending';

  String get formattedAddress {
    if (shippingAddress is Map && shippingAddress != null) {
      return shippingAddress!['address'] ?? '';
    }
    // shipping_address from backend is a string, use addressLine1 instead
    if (addressLine1 != null && addressLine1!.isNotEmpty) {
      final parts = <String>[];
      parts.add(addressLine1!);
      if (addressLine2 != null && addressLine2!.isNotEmpty) parts.add(addressLine2!);
      if (city != null && city!.isNotEmpty) parts.add(city!);
      if (postalCode != null && postalCode!.isNotEmpty) parts.add(postalCode!);
      return parts.join(', ');
    }
    return '';
  }

  String get fullAddressWithName {
    final buffer = StringBuffer();
    if (addressName != null && addressName!.isNotEmpty) {
      buffer.write('$addressName\n');
    }
    if (addressPhone != null && addressPhone!.isNotEmpty) {
      buffer.write('$addressPhone\n');
    }
    buffer.write(formattedAddress);
    if (landmark != null && landmark!.isNotEmpty) {
      buffer.write('\nLandmark: $landmark');
    }
    return buffer.toString();
  }

  factory Order.fromJson(Map<String, dynamic> json) {
    double toDouble(dynamic value) {
      if (value == null) return 0;
      if (value is double) return value;
      if (value is int) return value.toDouble();
      if (value is String) return double.tryParse(value) ?? 0;
      return 0;
    }
    
    return Order(
      id: json['id']?.toString() ?? '',
      orderNumber: json['order_number'] ?? json['orderNumber'] ?? '',
      subtotal: toDouble(json['subtotal']),
      taxAmount: toDouble(json['tax_amount'] ?? json['taxAmount']),
      shippingCost: toDouble(json['delivery_charge'] ?? json['shippingCost']),
      discountAmount: toDouble(json['discount_amount'] ?? json['discountAmount']),
      totalAmount: toDouble(json['total_amount'] ?? json['totalAmount']),
      paymentMethod: json['payment_method'] ?? json['paymentMethod'] ?? '',
      paymentStatus: json['payment_status'] ?? json['paymentStatus'] ?? '',
      orderStatus: json['status'] ?? json['orderStatus'] ?? json['order_status'] ?? 'pending',
      shippingAddress: json['shipping_address'] is String 
          ? null 
          : (json['shipping_address'] ?? json['shippingAddress'] as Map<String, dynamic>?),
      createdAt: json['created_at'] ?? json['createdAt'],
      items: json['items'] != null
          ? (json['items'] as List).map((e) => OrderItem.fromJson(e)).toList()
          : null,
      storeId: json['store_id']?.toString(),
      storeName: json['store_name'],
      vendorId: json['vendor_id']?.toString(),
      deliveryAddressId: json['delivery_address_id']?.toString(),
      deliverySlotId: json['delivery_slot_id']?.toString(),
      deliverySlotName: json['slot_name'] ?? json['deliverySlotName'],
      deliverySlotType: json['slot_type'] ?? json['deliverySlotType'],
      deliveryDate: json['delivery_date']?.toString(),
      deliveryNotes: json['delivery_notes'],
      deliveryPersonName: json['delivery_person_name'],
      deliveryPersonPhone: json['delivery_person_phone'],
      cancellationReason: json['cancellation_reason'],
      addressName: json['address_name'],
      addressPhone: json['address_phone'],
      addressLine1: json['address_line1'],
      addressLine2: json['address_line2'],
      city: json['city'],
      postalCode: json['postal_code'],
      landmark: json['landmark'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'order_number': orderNumber,
      'subtotal': subtotal,
      'tax_amount': taxAmount,
      'delivery_charge': shippingCost,
      'discount_amount': discountAmount,
      'total_amount': totalAmount,
      'payment_method': paymentMethod,
      'payment_status': paymentStatus,
      'status': orderStatus,
      'shipping_address': shippingAddress,
      'created_at': createdAt,
      'store_id': storeId,
      'store_name': storeName,
      'vendor_id': vendorId,
      'delivery_slot_id': deliverySlotId,
      'slot_name': deliverySlotName,
      'delivery_notes': deliveryNotes,
      'delivery_person_name': deliveryPersonName,
      'cancellation_reason': cancellationReason,
    };
  }
}

class OrderItem {
  final String id;
  final String productId;
  final String productName;
  final int quantity;
  final double unitPrice;
  final double totalPrice;
  final String? image;
  final String? itemStatus;

  OrderItem({
    required this.id,
    required this.productId,
    required this.productName,
    required this.quantity,
    required this.unitPrice,
    required this.totalPrice,
    this.image,
    this.itemStatus,
  });

  factory OrderItem.fromJson(Map<String, dynamic> json) {
    double toDouble(dynamic value) {
      if (value == null) return 0;
      if (value is double) return value;
      if (value is int) return value.toDouble();
      if (value is String) return double.tryParse(value) ?? 0;
      return 0;
    }
    
    return OrderItem(
      id: json['id']?.toString() ?? '',
      productId: json['product_id']?.toString() ?? '',
      productName: json['product_name'] ?? json['productName'] ?? '',
      quantity: json['quantity'] ?? 1,
      unitPrice: toDouble(json['unit_price'] ?? json['unitPrice']),
      totalPrice: toDouble(json['total_price'] ?? json['totalPrice']),
      image: json['product_image'] ?? json['image'],
      itemStatus: json['item_status'] ?? json['itemStatus'],
    );
  }
}

// Delivery Address Model
class DeliveryAddress {
  final String id;
  final String name;
  final String phone;
  final String addressLine1;
  final String? addressLine2;
  final String city;
  final String? state;
  final String? postalCode;
  final String? landmark;
  final bool isDefault;

  DeliveryAddress({
    required this.id,
    required this.name,
    required this.phone,
    required this.addressLine1,
    this.addressLine2,
    required this.city,
    this.state,
    this.postalCode,
    this.landmark,
    this.isDefault = false,
  });

  String get fullAddress {
    final parts = <String>[addressLine1];
    if (addressLine2 != null && addressLine2!.isNotEmpty) {
      parts.add(addressLine2!);
    }
    parts.add(city);
    if (postalCode != null && postalCode!.isNotEmpty) {
      parts.add(postalCode!);
    }
    return parts.join(', ');
  }

  factory DeliveryAddress.fromJson(Map<String, dynamic> json) {
    return DeliveryAddress(
      id: json['id']?.toString() ?? '',
      name: json['name'] ?? '',
      phone: json['phone'] ?? '',
      addressLine1: json['address_line1'] ?? '',
      addressLine2: json['address_line2'],
      city: json['city'] ?? '',
      state: json['state'],
      postalCode: json['postal_code'],
      landmark: json['landmark'],
      isDefault: json['is_default'] ?? false,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'name': name,
      'phone': phone,
      'address_line1': addressLine1,
      'address_line2': addressLine2,
      'city': city,
      'state': state,
      'postal_code': postalCode,
      'landmark': landmark,
      'is_default': isDefault,
    };
  }
}

// Delivery Slot Model
class DeliverySlot {
  final String id;
  final String slotName;
  final String slotType;
  final String startTime;
  final String endTime;
  final double extraCharge;
  final bool isActive;

  DeliverySlot({
    required this.id,
    required this.slotName,
    required this.slotType,
    required this.startTime,
    required this.endTime,
    this.extraCharge = 0,
    this.isActive = true,
  });

  String get displayTime => '$startTime - $endTime';

  factory DeliverySlot.fromJson(Map<String, dynamic> json) {
    return DeliverySlot(
      id: json['id']?.toString() ?? '',
      slotName: json['slot_name'] ?? '',
      slotType: json['slot_type'] ?? '',
      startTime: json['start_time']?.toString().substring(0, 5) ?? '',
      endTime: json['end_time']?.toString().substring(0, 5) ?? '',
      extraCharge: (json['extra_charge'] ?? 0).toDouble(),
      isActive: json['is_active'] ?? true,
    );
  }
}
