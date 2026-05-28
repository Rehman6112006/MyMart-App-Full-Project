import 'package:flutter/material.dart';
import '../models/product.dart';
import '../models/category.dart';
import '../services/product_service.dart';
import '../services/category_service.dart';
import '../services/banner_service.dart';

class ProductProvider with ChangeNotifier {
  List<Product> _featuredProducts = [];
  List<Product> _newArrivals = [];
  List<Product> _deals = [];
  List<Product> _allProducts = [];
  List<Category> _categories = [];
  List<Map<String, dynamic>> _banners = [];
  bool _isLoading = false;
  String? _error;
  int _currentPage = 1;
  int _totalProducts = 0;
  bool _hasMore = true;

  List<Product> get featuredProducts => _featuredProducts;
  List<Product> get newArrivals => _newArrivals;
  List<Product> get deals => _deals;
  List<Product> get allProducts => _allProducts;
  List<Category> get categories => _categories;
  List<Map<String, dynamic>> get banners => _banners;
  bool get isLoading => _isLoading;
  String? get error => _error;
  bool get hasMore => _hasMore;

  // Load home page data (all products, categories, banners)
  Future<void> loadHomeData() async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    // Load products
    try {
      final productResult = await ProductService.getProducts(limit: 40);
      if (productResult['success'] == true) {
        final products = productResult['products'] as List<Product>;
        _allProducts = products;
        _totalProducts = (productResult['total'] as int? ?? _allProducts.length);
        _hasMore = _allProducts.length < _totalProducts;
      }
    } catch (e) {
      _error = 'Failed to load products';
    }

    // Load secondary data independently
    try {
      _categories = await CategoryService.getFeaturedCategories();
    } catch (_) {}

    try {
      _banners = await BannerService.getActiveBanners();
    } catch (_) {}

    try {
      _featuredProducts = await ProductService.getFeaturedProducts();
    } catch (_) {}

    try {
      _newArrivals = await ProductService.getNewArrivals();
    } catch (_) {}

    try {
      _deals = await ProductService.getDeals();
    } catch (_) {}

    _isLoading = false;
    notifyListeners();
  }

  // Load products by category
  Future<void> loadProducts({bool refresh = false}) async {
    if (refresh) {
      _currentPage = 1;
      _allProducts = [];
      _hasMore = true;
    }

    if (!_hasMore) return;

    _isLoading = true;
    notifyListeners();

    try {
      final result = await ProductService.getProducts(page: _currentPage, limit: 20);
      if (result['success']) {
        final products = result['products'] as List<Product>;
        if (refresh) {
          _allProducts = products;
        } else {
          _allProducts.addAll(products);
        }
        _totalProducts = result['total'];
        _hasMore = _allProducts.length < _totalProducts;
        _currentPage++;
        _error = null;
      }
    } catch (e) {
      _error = 'Failed to load products';
    }

    _isLoading = false;
    notifyListeners();
  }

  // Load products by category
  Future<List<Product>> getProductsByCategory(String categoryId) async {
    try {
      final result = await ProductService.getProducts(categoryId: categoryId);
      if (result['success']) {
        return result['products'] as List<Product>;
      }
    } catch (e) {
      _error = 'Failed to load products';
    }
    return [];
  }

  // Load categories only
  Future<void> loadCategories() async {
    _isLoading = true;
    notifyListeners();

    try {
      _categories = await CategoryService.getFeaturedCategories();
      _error = null;
    } catch (e) {
      _error = 'Failed to load categories';
    }

    _isLoading = false;
    notifyListeners();
  }
}
