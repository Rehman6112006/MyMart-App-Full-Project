import 'dart:async';
import 'package:http/http.dart' as http;

class ApiException implements Exception {
  final String message;
  final int? statusCode;
  final dynamic originalError;

  ApiException(this.message, {this.statusCode, this.originalError});

  @override
  String toString() => 'ApiException: $message (Status: $statusCode)';

  bool get isNetworkError =>
      originalError is TimeoutException ||
      originalError is http.ClientException ||
      originalError.toString().contains('SocketException') ||
      originalError.toString().contains('Connection refused');

  bool get isServerError => statusCode != null && statusCode! >= 500;

  bool get isUnauthorized => statusCode == 401;

  bool get isForbidden => statusCode == 403;

  bool get isNotFound => statusCode == 404;

  bool get isBadRequest => statusCode == 400;
}

class RetryOptions {
  final int maxRetries;
  final Duration delay;
  final Duration timeout;
  final List<int> retryStatusCodes;

  const RetryOptions({
    this.maxRetries = 3,
    this.delay = const Duration(seconds: 1),
    this.timeout = const Duration(seconds: 30),
    this.retryStatusCodes = const [408, 429, 500, 502, 503, 504],
  });

  RetryOptions withMaxRetries(int retries) {
    return RetryOptions(
      maxRetries: retries,
      delay: delay,
      timeout: timeout,
      retryStatusCodes: retryStatusCodes,
    );
  }

  RetryOptions withDelay(Duration newDelay) {
    return RetryOptions(
      maxRetries: maxRetries,
      delay: newDelay,
      timeout: timeout,
      retryStatusCodes: retryStatusCodes,
    );
  }
}

class RetryHelper {
  static final RetryOptions defaultOptions = RetryOptions();

  static Future<T> execute<T>({
    required Future<T> Function() request,
    RetryOptions? options,
    void Function(int attempt, Exception error)? onRetry,
  }) async {
    final opts = options ?? defaultOptions;
    Exception? lastError;
    int attempt = 0;

    while (attempt <= opts.maxRetries) {
      try {
        return await request().timeout(opts.timeout);
      } on TimeoutException catch (e) {
        lastError = ApiException(
          'Request timed out. Please try again.',
          originalError: e,
        );
      } on http.ClientException catch (e) {
        lastError = ApiException('Network error occurred', originalError: e);
      } on FormatException catch (e) {
        lastError = ApiException('Invalid response format', originalError: e);
      } catch (e) {
        final msg = e.toString();
        if (msg.contains('SocketException') || msg.contains('Connection refused')) {
          lastError = ApiException('Network error: Please check your internet connection', originalError: e);
        } else {
          lastError = ApiException('An unexpected error occurred: $e');
        }
      }

      attempt++;

      if (attempt <= opts.maxRetries) {
        onRetry?.call(attempt, lastError);

        final delayMs = opts.delay.inMilliseconds * attempt;
        await Future.delayed(Duration(milliseconds: delayMs));
      }
    }

    throw lastError ?? ApiException('Unknown error occurred');
  }

  static Future<T?> executeOrNull<T>({
    required Future<T> Function() request,
    RetryOptions? options,
    void Function(int attempt, Exception error)? onRetry,
  }) async {
    try {
      return await execute(
        request: request,
        options: options,
        onRetry: onRetry,
      );
    } catch (e) {
      return null;
    }
  }
}

class ErrorMessageHelper {
  static String getMessage(dynamic error) {
    if (error is ApiException) {
      return error.message;
    }

    if (error is TimeoutException) {
      return 'Request timed out. Please try again.';
    }

    if (error is http.ClientException) {
      return 'Network error. Please try again.';
    }

    final errorStr = error.toString();
    if (errorStr.contains('SocketException')) {
      return 'No internet connection.';
    }

    if (errorStr.contains('TimeoutException')) {
      return 'Request timed out.';
    }

    if (errorStr.contains('Connection refused')) {
      return 'Server unavailable. Please try again later.';
    }

    return 'Something went wrong. Please try again.';
  }

  static String getShortMessage(dynamic error) {
    if (error is ApiException) {
      if (error.isNetworkError) return 'No internet';
      if (error.isServerError) return 'Server error';
      if (error.isUnauthorized) return 'Session expired';
      if (error.isNotFound) return 'Not found';
      return error.message;
    }
    return 'Error occurred';
  }

  static bool isRetryable(dynamic error) {
    if (error is ApiException) {
      return error.isNetworkError || error.isServerError;
    }
    return error is TimeoutException;
  }
}

class Result<T> {
  final T? data;
  final String? error;
  final bool isSuccess;
  bool get isError => !isSuccess;
  final bool isNetworkError;

  Result._({
    this.data,
    this.error,
    required this.isSuccess,
    this.isNetworkError = false,
  });

  factory Result.success(T data) {
    return Result._(data: data, isSuccess: true);
  }

  factory Result.failure(String error, {bool isNetworkError = false}) {
    return Result._(
      error: error,
      isSuccess: false,
      isNetworkError: isNetworkError,
    );
  }

  factory Result.networkError() {
    return Result._(
      error: 'No internet connection. Please check your network.',
      isSuccess: false,
      isNetworkError: true,
    );
  }

  factory Result.timeout() {
    return Result._(
      error: 'Request timed out. Please try again.',
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
