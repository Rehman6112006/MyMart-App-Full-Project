import '../models/user.dart';
import '../services/api_service.dart';
import '../config/api_config.dart';

class AuthService {
  // Register
  static Future<Map<String, dynamic>> register({
    required String email,
    required String password,
    required String firstName,
    required String lastName,
    String? phone,
    String role = 'customer',
  }) async {
    final response = await ApiService.post(
      ApiConfig.register,
      body: {
        'email': email,
        'password': password,
        'firstName': firstName,
        'lastName': lastName,
        'phone': phone,
        'role': role,
      },
    );

    if (response['success']) {
      final data = response['data'];
      if (data['token'] != null) {
        await ApiService.saveToken(data['token']);
        await ApiService.saveUserData(data);
      }
    }

    return response;
  }

  // Login
  static Future<Map<String, dynamic>> login({
    required String email,
    required String password,
  }) async {
    final response = await ApiService.post(
      ApiConfig.login,
      body: {'email': email, 'password': password},
    );

    if (response['success']) {
      final data = response['data'];
      // API returns token and user at top level
      if (data['token'] != null) {
        await ApiService.saveToken(data['token']);
        // Save only the user object (not the whole response)
        final userObj = data['user'] is Map<String, dynamic>
            ? data['user'] as Map<String, dynamic>
            : data;
        await ApiService.saveUserData(userObj);
      }
    }

    return response;
  }

  // Get Profile
  static Future<User?> getProfile() async {
    final response = await ApiService.get(ApiConfig.profile);
    if (response['success']) {
      final data = response['data'];
      if (data is Map<String, dynamic> && data['user'] is Map<String, dynamic>) {
        return User.fromJson(data['user'] as Map<String, dynamic>);
      }
      return User.fromJson(data ?? {});
    }
    return null;
  }

  // Update Profile
  static Future<Map<String, dynamic>> updateProfile({
    String? firstName,
    String? lastName,
    String? phone,
  }) async {
    final body = <String, dynamic>{};
    if (firstName != null) body['firstName'] = firstName;
    if (lastName != null) body['lastName'] = lastName;
    if (phone != null) body['phone'] = phone;

    final response = await ApiService.put(ApiConfig.profile, body: body);

    if (response['success']) {
      final data = response['data'];
      final userObj = data['user'] is Map<String, dynamic>
          ? data['user'] as Map<String, dynamic>
          : data;
      await ApiService.saveUserData(userObj);
    }

    return response;
  }

  // Change Password
  static Future<Map<String, dynamic>> changePassword({
    required String currentPassword,
    required String newPassword,
  }) async {
    return await ApiService.put(
      ApiConfig.changePassword,
      body: {'current_password': currentPassword, 'new_password': newPassword},
    );
  }

  // Logout
  static Future<void> logout() async {
    await ApiService.clearAuthData();
  }

  // Check if logged in
  static Future<bool> isLoggedIn() async {
    final token = await ApiService.getToken();
    return token != null;
  }

  // Get current user from local storage
  static Future<User?> getCurrentUser() async {
    final userData = await ApiService.getUserData();
    if (userData != null) {
      return User.fromJson(userData);
    }
    return null;
  }

  // Save token
  static Future<void> saveToken(String token) async {
    await ApiService.saveToken(token);
  }
}
