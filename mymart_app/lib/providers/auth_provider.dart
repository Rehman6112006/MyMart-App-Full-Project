import 'package:flutter/material.dart';
import '../models/user.dart';
import '../services/auth_service.dart';
import '../services/api_service.dart';

class AuthProvider with ChangeNotifier {
  User? _user;
  bool _isLoading = false;
  bool _isInitialized = false;
  String? _error;

  // Callback for logout - to clear cart and wishlist
  VoidCallback? onLogout;

  User? get user => _user;
  bool get isLoading => _isLoading;
  bool get isInitialized => _isInitialized;
  bool get isLoggedIn => _user != null;
  String? get error => _error;

  // Initialize - check if user is already logged in
  Future<void> initialize() async {
    _isLoading = true;
    notifyListeners();

    try {
      final loggedIn = await AuthService.isLoggedIn();
      if (loggedIn) {
        _user = await AuthService.getCurrentUser();
        // Also fetch fresh profile from server
        final freshUser = await AuthService.getProfile();
        if (freshUser != null) {
          _user = freshUser;
        }
      }
    } catch (e) {
      _error = e.toString();
    }

    _isLoading = false;
    _isInitialized = true;
    notifyListeners();
  }

  // Login
  Future<bool> login(String email, String password) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final response = await AuthService.login(
        email: email,
        password: password,
      );

      if (response['success'] == true) {
        final data = response['data'];

        if (data != null && data['user'] != null) {
          _user = User.fromJson(data['user']);
        } else {
          _user = User.fromJson(data ?? {});
        }
        _isLoading = false;
        notifyListeners();
        return true;
      } else {
        _error = response['message'] ?? response['error'] ?? 'Login failed';
        _isLoading = false;
        notifyListeners();
        return false;
      }
    } catch (e) {
      _error = 'Error: ${e.toString()}';
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  // Register
  Future<bool> register({
    required String email,
    required String password,
    required String firstName,
    required String lastName,
    String? phone,
    String role = 'customer',
  }) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final response = await AuthService.register(
        email: email,
        password: password,
        firstName: firstName,
        lastName: lastName,
        phone: phone,
        role: role,
      );

      if (response['success']) {
        final data = response['data'];
        // User data is inside data['user'] in API response
        final userData = data['user'] ?? data;
        _user = User.fromJson(userData);
        _isLoading = false;
        notifyListeners();
        return true;
      } else {
        _error = response['message'] ?? 'Registration failed';
        _isLoading = false;
        notifyListeners();
        return false;
      }
    } catch (e) {
      _error = 'Network error. Please try again.';
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  // Logout
  Future<void> logout() async {
    await AuthService.logout();
    _user = null;
    // Call logout callback to clear cart and wishlist
    onLogout?.call();
    notifyListeners();
  }

  // Set user from OTP verification response
  Future<void> setUserFromResponse(Map<String, dynamic> userData) async {
    try {
      // Some endpoints nest user data under 'user' key
      final data = userData['user'] is Map<String, dynamic>
          ? userData['user'] as Map<String, dynamic>
          : userData;

      // Save access token if present (supports both 'token' and 'accessToken')
      final token = data['token'] ?? data['accessToken'];
      if (token != null) {
        await AuthService.saveToken(token);
      }

      // Create user object from response
      _user = User(
        id: data['id']?.toString() ?? '',
        email: data['email'] ?? '',
        firstName: data['first_name'] ?? data['firstName'] ?? data['name'] ?? '',
        lastName: data['last_name'] ?? data['lastName'] ?? '',
        phone: data['phone'],
        role: data['role'] ?? 'customer',
      );

      // Persist user data for session restore on refresh
      await ApiService.saveUserData(data);

      notifyListeners();
    } catch (e) {
      _error = 'Error setting user: ${e.toString()}';
      notifyListeners();
    }
  }

  // Clear error
  void clearError() {
    _error = null;
    notifyListeners();
  }
}
