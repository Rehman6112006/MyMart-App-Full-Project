import 'dart:async';
import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import '../config/api_config.dart';

class ApiService {
  static const String _tokenKey = 'auth_token';
  static const String _userKey = 'user_data';
  static const Duration _timeout = Duration(seconds: 30);
  static const int _maxRetries = 3;

  static Future<String?> getToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_tokenKey);
  }

  static Future<void> saveToken(String token) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_tokenKey, token);
  }

  static Future<void> saveUserData(Map<String, dynamic> userData) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_userKey, jsonEncode(userData));
  }

  static Future<Map<String, dynamic>?> getUserData() async {
    final prefs = await SharedPreferences.getInstance();
    final data = prefs.getString(_userKey);
    if (data != null) {
      return jsonDecode(data);
    }
    return null;
  }

  static Future<void> clearAuthData() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_tokenKey);
    await prefs.remove(_userKey);
  }

  static Future<Map<String, dynamic>> get(
    String endpoint, {
    Map<String, String>? queryParams,
    bool retry = true,
  }) async {
    final token = await getToken();

    Uri url = Uri.parse('${ApiConfig.baseUrl}$endpoint');
    if (queryParams != null && queryParams.isNotEmpty) {
      url = url.replace(queryParameters: queryParams);
    }

    return _executeWithRetry(
      () => _getRequest(url, token),
      retry: retry,
      operation: 'GET $endpoint',
    );
  }

  static Future<Map<String, dynamic>> _getRequest(
    Uri url,
    String? token,
  ) async {
    final response = await http
        .get(url, headers: _getHeaders(token))
        .timeout(_timeout);

    return _handleResponse(response);
  }

  static Future<Map<String, dynamic>> post(
    String endpoint, {
    Map<String, dynamic>? body,
    bool retry = true,
  }) async {
    final token = await getToken();
    final url = Uri.parse('${ApiConfig.baseUrl}$endpoint');

    return _executeWithRetry(
      () => _postRequest(url, token, body),
      retry: retry,
      operation: 'POST $endpoint',
    );
  }

  static Future<Map<String, dynamic>> _postRequest(
    Uri url,
    String? token,
    Map<String, dynamic>? body,
  ) async {
    final response = await http
        .post(
          url,
          headers: _getHeaders(token),
          body: body != null ? jsonEncode(body) : null,
        )
        .timeout(_timeout);

    return _handleResponse(response);
  }

  static Future<Map<String, dynamic>> put(
    String endpoint, {
    Map<String, dynamic>? body,
    bool retry = true,
  }) async {
    final token = await getToken();
    final url = Uri.parse('${ApiConfig.baseUrl}$endpoint');

    return _executeWithRetry(
      () => _putRequest(url, token, body),
      retry: retry,
      operation: 'PUT $endpoint',
    );
  }

  static Future<Map<String, dynamic>> _putRequest(
    Uri url,
    String? token,
    Map<String, dynamic>? body,
  ) async {
    final response = await http
        .put(
          url,
          headers: _getHeaders(token),
          body: body != null ? jsonEncode(body) : null,
        )
        .timeout(_timeout);

    return _handleResponse(response);
  }

  static Future<Map<String, dynamic>> delete(
    String endpoint, {
    bool retry = true,
  }) async {
    final token = await getToken();
    final url = Uri.parse('${ApiConfig.baseUrl}$endpoint');

    return _executeWithRetry(
      () => _deleteRequest(url, token),
      retry: retry,
      operation: 'DELETE $endpoint',
    );
  }

  static Future<Map<String, dynamic>> _deleteRequest(
    Uri url,
    String? token,
  ) async {
    final response = await http
        .delete(url, headers: _getHeaders(token))
        .timeout(_timeout);

    return _handleResponse(response);
  }

  static Map<String, String> _getHeaders(String? token) {
    return {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      if (token != null) 'Authorization': 'Bearer $token',
    };
  }

  static Future<Map<String, dynamic>> _executeWithRetry(
    Future<Map<String, dynamic>> Function() request, {
    required bool retry,
    required String operation,
    int currentRetry = 0,
  }) async {
    try {
      return await request();
    } on TimeoutException {
      if (retry && currentRetry < _maxRetries) {
        currentRetry++;
        await Future.delayed(Duration(seconds: currentRetry));
        return _executeWithRetry(
          request,
          retry: retry,
          operation: operation,
          currentRetry: currentRetry,
        );
      }
      return _error('Request timed out. Please try again.', statusCode: 408);
    } on http.ClientException catch (e) {
      if (retry && currentRetry < _maxRetries) {
        currentRetry++;
        await Future.delayed(Duration(seconds: currentRetry));
        return _executeWithRetry(
          request,
          retry: retry,
          operation: operation,
          currentRetry: currentRetry,
        );
      }
      return _error('Network error: ${e.message}', statusCode: 0);
    } on FormatException {
      return _error('Invalid response from server', statusCode: 500);
    } catch (e) {
      // Covers SocketException on mobile and general errors on web
      final msg = e.toString().toLowerCase();
      if (msg.contains('socket') || msg.contains('connection') || msg.contains('network')) {
        return _networkError();
      }
      return _error('Something went wrong: $e', statusCode: 500);
    }
  }

  static Map<String, dynamic> _handleResponse(http.Response response) {
    try {
      final data = jsonDecode(response.body);

      if (response.statusCode >= 200 && response.statusCode < 300) {
        return {
          'success': true,
          'data': data,
          'statusCode': response.statusCode,
        };
      } else {
        String message = 'Something went wrong';
        if (data is Map) {
          message = data['message'] ?? data['error'] ?? message;
        }

        if (response.statusCode == 401) {
          return {
            'success': false,
            'message': 'Session expired. Please login again.',
            'statusCode': response.statusCode,
            'unauthorized': true,
          };
        }

        return {
          'success': false,
          'message': message,
          'statusCode': response.statusCode,
          'data': data,
        };
      }
    } catch (e) {
      return {
        'success': false,
        'message': 'Failed to parse server response',
        'statusCode': response.statusCode,
      };
    }
  }

  static Map<String, dynamic> _networkError() {
    return {
      'success': false,
      'message':
          'No internet connection. Please check your network and try again.',
      'statusCode': 0,
      'networkError': true,
    };
  }

  static Map<String, dynamic> _error(String message, {int statusCode = 500}) {
    return {'success': false, 'message': message, 'statusCode': statusCode};
  }
}

class ApiResponse<T> {
  final T? data;
  final String? error;
  final bool isSuccess;
  final bool isNetworkError;
  final int? statusCode;

  ApiResponse._({
    this.data,
    this.error,
    required this.isSuccess,
    this.isNetworkError = false,
    this.statusCode,
  });

  factory ApiResponse.success(T data, {int? statusCode}) {
    return ApiResponse._(data: data, isSuccess: true, statusCode: statusCode);
  }

  factory ApiResponse.failure(
    String error, {
    bool isNetworkError = false,
    int? statusCode,
  }) {
    return ApiResponse._(
      error: error,
      isSuccess: false,
      isNetworkError: isNetworkError,
      statusCode: statusCode,
    );
  }

  factory ApiResponse.networkError() {
    return ApiResponse._(
      error: 'No internet connection. Please check your network.',
      isSuccess: false,
      isNetworkError: true,
    );
  }

  R when<R>({
    required R Function(T data) success,
    required R Function(String error, bool isNetworkError) failure,
  }) {
    if (isSuccess && data != null) {
      return success(data as T);
    } else {
      return failure(error ?? 'Unknown error', isNetworkError);
    }
  }
}
