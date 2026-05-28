class User {
  final String id;
  final String email;
  final String firstName;
  final String lastName;
  final String? phone;
  final String role;
  final String? profilePicture;
  final String? token;

  User({
    required this.id,
    required this.email,
    required this.firstName,
    required this.lastName,
    this.phone,
    required this.role,
    this.profilePicture,
    this.token,
  });

  String get fullName => '$firstName $lastName';
  bool get isVendor => role == 'vendor';
  bool get isAdmin => role == 'admin';
  bool get isCustomer => role == 'customer';

  factory User.fromJson(Map<String, dynamic> json) {
    return User(
      id: json['id']?.toString() ?? '',
      email: json['email'] ?? '',
      firstName: json['first_name'] ?? json['firstName'] ?? '',
      lastName: json['last_name'] ?? json['lastName'] ?? '',
      phone: json['phone'],
      role: json['role'] ?? 'customer',
      profilePicture: json['profile_picture'] ?? json['profilePicture'],
      token: json['token'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'email': email,
      'first_name': firstName,
      'last_name': lastName,
      'phone': phone,
      'role': role,
      'profile_picture': profilePicture,
    };
  }

  User copyWith({
    String? id,
    String? email,
    String? firstName,
    String? lastName,
    String? phone,
    String? role,
    String? profilePicture,
    String? token,
  }) {
    return User(
      id: id ?? this.id,
      email: email ?? this.email,
      firstName: firstName ?? this.firstName,
      lastName: lastName ?? this.lastName,
      phone: phone ?? this.phone,
      role: role ?? this.role,
      profilePicture: profilePicture ?? this.profilePicture,
      token: token ?? this.token,
    );
  }
}
