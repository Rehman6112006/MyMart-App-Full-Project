import '../models/review.dart';
import 'api_service.dart';
import '../config/api_config.dart';

class ReviewService {
  static Future<Map<String, dynamic>> getProductReviews({
    required String productId,
    int page = 1,
    int limit = 10,
    String sort = 'recent',
  }) async {
    try {
      final resp = await ApiService.get(
        '${ApiConfig.reviews}/product/$productId',
        queryParams: {
          'page': page.toString(),
          'limit': limit.toString(),
          'sort': sort,
        },
      );
      if (resp['success'] != true) {
        return {'success': false, 'error': resp['message'] ?? 'Failed to load reviews'};
      }
      final raw = resp['data'];
      List<Review> reviews = [];
      int total = 0;
      double? averageRating;

      if (raw is List) {
        reviews = raw.map((e) => Review.fromJson(e as Map<String, dynamic>)).toList();
        total = reviews.length;
      } else if (raw is Map) {
        final rawList = raw['reviews'] ?? raw['data'];
        if (rawList is List) {
          reviews = rawList.map((e) => Review.fromJson(e as Map<String, dynamic>)).toList();
        }
        total = raw['total'] ?? raw['total_reviews'] ?? raw['totalReviews'] ?? reviews.length;
        averageRating = (raw['average_rating'] ?? raw['averageRating'] as num?)?.toDouble();
      }

      return {
        'success': true,
        'reviews': reviews,
        'total': total,
        'averageRating': averageRating,
        'ratingDistribution': raw is Map ? (raw['rating_distribution'] ?? raw['ratingDistribution']) : null,
      };
    } catch (e) {
      return {'success': false, 'error': e.toString()};
    }
  }

  static Future<Map<String, dynamic>> addReview({
    required String productId,
    required double rating,
    required String comment,
    List<String>? images,
  }) async {
    try {
      final body = {
        'productId': productId,
        'rating': rating.round(),
        'comment': comment,
        if (images != null && images.isNotEmpty) 'images': images,
      };
      final resp = await ApiService.post(ApiConfig.reviews, body: body);
      if (resp['success'] == true) {
        return {
          'success': true,
          'review': resp['data'] != null ? Review.fromJson(resp['data'] as Map<String, dynamic>) : null,
          'data': resp['data'],
        };
      }
      return {
        'success': false,
        'error': resp['message'] ?? resp['error'] ?? 'Failed to submit review',
        'statusCode': resp['statusCode'],
        'data': resp['data'],
      };
    } catch (e) {
      return {'success': false, 'error': e.toString()};
    }
  }

  static Future<Map<String, dynamic>> getStoreRating(String storeId) async {
    try {
      final resp = await ApiService.get('${ApiConfig.reviews}/store/$storeId/rating');
      return {
        'success': true,
        'data': resp['data'],
      };
    } catch (e) {
      return {'success': false, 'error': e.toString()};
    }
  }

  static Future<Map<String, dynamic>> getVendorReviews({int page = 1, int limit = 10}) async {
    try {
      final resp = await ApiService.get(
        '${ApiConfig.reviews}/vendor',
        queryParams: {'page': page.toString(), 'limit': limit.toString()},
      );
      final data = resp['data'] as Map<String, dynamic>?;
      final reviews = (data?['reviews'] as List? ?? [])
          .map((e) => Review.fromJson(e as Map<String, dynamic>))
          .toList();
      return {
        'success': true,
        'reviews': reviews,
        'total': data?['total'] ?? reviews.length,
        'averageRating': data?['average_rating'],
        'ratingDistribution': data?['rating_distribution'],
        'totalReviews': data?['total_reviews'],
      };
    } catch (e) {
      return {'success': false, 'error': e.toString()};
    }
  }

  static Future<Map<String, dynamic>> getVendorDashboard() async {
    try {
      final resp = await ApiService.get(ApiConfig.vendorDashboard);
      return {'success': true, 'data': resp['data']};
    } catch (e) {
      return {'success': false, 'error': e.toString()};
    }
  }
}
