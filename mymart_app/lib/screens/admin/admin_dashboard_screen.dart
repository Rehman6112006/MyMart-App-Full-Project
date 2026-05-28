import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:image_picker/image_picker.dart';
import '../../config/theme.dart';
import '../../models/product.dart';
import '../../models/order.dart';
import '../../models/category.dart';
import '../../models/review.dart';
import '../../services/admin_service.dart';
import '../../services/review_service.dart';
import '../../widgets/shimmer_loaders.dart';

class AdminDashboardScreen extends StatefulWidget {
  const AdminDashboardScreen({super.key});

  @override
  State<AdminDashboardScreen> createState() => _AdminDashboardScreenState();
}

class _AdminDashboardScreenState extends State<AdminDashboardScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;

  bool _loadingStats = true;
  bool _loadingProducts = true;
  bool _loadingOrders = true;
  bool _loadingReviews = true;

  Map<String, dynamic>? _stats;
  List<Product> _products = [];
  List<Order> _orders = [];
  List<Review> _reviews = [];

  String _orderStatusFilter = '';
  String _productSearch = '';

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 4, vsync: this);
    _tabController.addListener(() {
      if (!_tabController.indexIsChanging) {
        setState(() {});
      }
    });
    _loadAll();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _loadAll() async {
    _loadStats();
    _loadProducts();
    _loadOrders();
    _loadReviews();
  }

  Future<void> _loadStats() async {
    setState(() { _loadingStats = true; });
    final result = await AdminService.getDashboardStats();
    if (!mounted) return;
    setState(() {
      _stats = result['success'] == true ? result['data'] as Map<String, dynamic>? : null;
      _loadingStats = false;
    });
  }

  Future<void> _loadProducts() async {
    setState(() { _loadingProducts = true; });
    final result = await AdminService.getStoreProducts(limit: 100);
    if (!mounted) return;
    setState(() {
      _products = result['success'] == true ? result['products'] as List<Product> : [];
      _loadingProducts = false;
    });
  }

  Future<void> _loadOrders() async {
    setState(() { _loadingOrders = true; });
    final result = await AdminService.getStoreOrders(limit: 50, status: _orderStatusFilter.isEmpty ? null : _orderStatusFilter);
    if (!mounted) return;
    setState(() {
      _orders = result['success'] == true ? result['orders'] as List<Order> : [];
      _loadingOrders = false;
    });
  }

  Future<void> _loadReviews() async {
    setState(() { _loadingReviews = true; });
    final result = await ReviewService.getVendorReviews(limit: 50);
    if (!mounted) return;
    setState(() {
      _reviews = result['success'] == true ? result['reviews'] as List<Review> : [];
      _loadingReviews = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        title: Text('Admin Panel', style: GoogleFonts.poppins(fontWeight: FontWeight.w600, fontSize: 18)),
        centerTitle: false,
        backgroundColor: AppTheme.surface,
        elevation: 0.5,
        bottom: TabBar(
          controller: _tabController,
          indicatorColor: AppTheme.primary,
          labelColor: AppTheme.primary,
          unselectedLabelColor: AppTheme.textSecondary,
          labelStyle: GoogleFonts.poppins(fontSize: 12, fontWeight: FontWeight.w600),
          tabs: const [
            Tab(icon: Icon(Icons.dashboard_outlined, size: 20), text: 'Dashboard'),
            Tab(icon: Icon(Icons.inventory_2_outlined, size: 20), text: 'Products'),
            Tab(icon: Icon(Icons.receipt_long_outlined, size: 20), text: 'Orders'),
            Tab(icon: Icon(Icons.rate_review_outlined, size: 20), text: 'Reviews'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          _buildDashboardTab(),
          _buildProductsTab(),
          _buildOrdersTab(),
          _buildReviewsTab(),
        ],
      ),
    );
  }

  Widget _buildDashboardTab() {
    if (_loadingStats) return const ShimmerProductList(itemCount: 4);
    if (_stats == null) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.error_outline, size: 48, color: AppTheme.textLight),
            const SizedBox(height: 12),
            Text('Could not load dashboard stats', style: GoogleFonts.poppins(color: AppTheme.textSecondary)),
            const SizedBox(height: 16),
            ElevatedButton(onPressed: _loadStats, child: const Text('Retry')),
          ],
        ),
      );
    }
    return RefreshIndicator(
      onRefresh: _loadAll,
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Overview', style: GoogleFonts.poppins(fontSize: 18, fontWeight: FontWeight.w700)),
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(child: _statCard('Total Products', '${_stats!['totalProducts'] ?? _products.length}', Icons.inventory_2, const Color(0xFF2563EB))),
                const SizedBox(width: 12),
                Expanded(child: _statCard('Total Orders', '${_stats!['totalOrders'] ?? _orders.length}', Icons.receipt_long, const Color(0xFFD97706))),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(child: _statCard('Revenue', '\$${_stats!['totalRevenue'] ?? '0.00'}', Icons.attach_money, const Color(0xFF16A34A))),
                const SizedBox(width: 12),
                Expanded(child: _statCard('Products Live', '${_stats!['activeProducts'] ?? '0'}', Icons.check_circle_outline, const Color(0xFF16A34A))),
              ],
            ),
            const SizedBox(height: 24),
            Text('Store Info', style: GoogleFonts.poppins(fontSize: 16, fontWeight: FontWeight.w600)),
            const SizedBox(height: 12),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppTheme.surface,
                borderRadius: BorderRadius.circular(14),
                boxShadow: [BoxShadow(color: AppTheme.cardShadow, blurRadius: 10, offset: const Offset(0, 2))],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _infoRow('Store Name', _stats!['storeName'] ?? '-'),
                  const Divider(height: 16),
                  _infoRow('Store Status', _stats!['storeStatus'] ?? 'Active'),
                  const Divider(height: 16),
                  _infoRow('Total Orders', '${_stats!['totalOrders'] ?? '0'}'),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _statCard(String label, String value, IconData icon, Color color) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppTheme.surface,
        borderRadius: BorderRadius.circular(14),
        boxShadow: [BoxShadow(color: AppTheme.cardShadow, blurRadius: 10, offset: const Offset(0, 2))],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(color: color.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(10)),
            child: Icon(icon, color: color, size: 22),
          ),
          const SizedBox(height: 12),
          Text(value, style: GoogleFonts.poppins(fontSize: 22, fontWeight: FontWeight.w800)),
          const SizedBox(height: 4),
          Text(label, style: GoogleFonts.poppins(fontSize: 12, color: AppTheme.textSecondary)),
        ],
      ),
    );
  }

  Widget _infoRow(String label, String value) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label, style: GoogleFonts.poppins(fontSize: 13, color: AppTheme.textSecondary)),
        Text(value, style: GoogleFonts.poppins(fontSize: 13, fontWeight: FontWeight.w600)),
      ],
    );
  }

  Widget _buildProductsTab() {
    if (_loadingProducts) return const ShimmerProductGrid(itemCount: 4, crossAxisCount: 4);
    return Column(
      children: [
        Container(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 4),
          child: Row(
            children: [
              Expanded(
                child: TextField(
                  onChanged: (v) => setState(() => _productSearch = v.toLowerCase()),
                  decoration: InputDecoration(
                    hintText: 'Search products...',
                    hintStyle: GoogleFonts.poppins(fontSize: 13, color: AppTheme.textLight),
                    prefixIcon: const Icon(Icons.search, size: 20, color: AppTheme.textLight),
                    filled: true,
                    fillColor: AppTheme.surface,
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
                    contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                  ),
                  style: GoogleFonts.poppins(fontSize: 13),
                ),
              ),
              const SizedBox(width: 8),
              Container(
                decoration: BoxDecoration(color: AppTheme.primary, borderRadius: BorderRadius.circular(12)),
                child: IconButton(
                  icon: const Icon(Icons.add, color: Colors.white, size: 22),
                  onPressed: _showAddProductSheet,
                ),
              ),
            ],
          ),
        ),
        Expanded(
          child: _products.where((p) => _productSearch.isEmpty || p.name.toLowerCase().contains(_productSearch)).isEmpty
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.inventory_2_outlined, size: 56, color: AppTheme.textLight),
                      const SizedBox(height: 12),
                      Text(_productSearch.isEmpty ? 'No products yet' : 'No products found',
                          style: GoogleFonts.poppins(fontSize: 14, color: AppTheme.textSecondary)),
                    ],
                  ),
                )
              : RefreshIndicator(
                  onRefresh: _loadProducts,
                  child: ListView.builder(
                    padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
                    itemCount: _products.where((p) => _productSearch.isEmpty || p.name.toLowerCase().contains(_productSearch)).length,
                    itemBuilder: (context, index) {
                      final filtered = _products.where((p) => _productSearch.isEmpty || p.name.toLowerCase().contains(_productSearch)).toList();
                      final product = filtered[index];
                      return _buildProductCard(product);
                    },
                  ),
                ),
        ),
      ],
    );
  }

  Widget _buildProductCard(Product product) {
    final live = product.isActive ?? true;
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppTheme.surface,
        borderRadius: BorderRadius.circular(14),
        boxShadow: [BoxShadow(color: AppTheme.cardShadow, blurRadius: 6, offset: const Offset(0, 2))],
      ),
      child: Row(
        children: [
          ClipRRect(
            borderRadius: BorderRadius.circular(10),
            child: SizedBox(
              width: 56,
              height: 56,
              child: product.images.isNotEmpty
                  ? Image.network(product.images.first, fit: BoxFit.cover, errorBuilder: (_, _, _) => Container(color: AppTheme.background, child: const Icon(Icons.image, color: AppTheme.textLight)))
                  : Container(color: AppTheme.background, child: const Icon(Icons.image, color: AppTheme.textLight)),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(product.name, style: GoogleFonts.poppins(fontSize: 13, fontWeight: FontWeight.w600), maxLines: 1, overflow: TextOverflow.ellipsis),
                const SizedBox(height: 2),
                Text('\$${product.effectivePrice.toStringAsFixed(2)}', style: GoogleFonts.poppins(fontSize: 12, color: AppTheme.primary, fontWeight: FontWeight.w600)),
                const SizedBox(height: 2),
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(
                        color: live ? AppTheme.primaryExtraLight : AppTheme.saleLight,
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: Text(live ? 'Live' : 'Hidden', style: GoogleFonts.poppins(fontSize: 9, fontWeight: FontWeight.w600, color: live ? AppTheme.primary : AppTheme.sale)),
                    ),
                    const SizedBox(width: 8),
                    Text('Stock: ${product.stockQuantity}', style: GoogleFonts.poppins(fontSize: 10, color: AppTheme.textLight)),
                  ],
                ),
              ],
            ),
          ),
          PopupMenuButton<String>(
            icon: const Icon(Icons.more_vert, size: 18, color: AppTheme.textSecondary),
            onSelected: (v) {
              if (v == 'edit') _showEditProductSheet(product);
              if (v == 'delete') _confirmDeleteProduct(product);
            },
            itemBuilder: (_) => [
              const PopupMenuItem(value: 'edit', child: Row(children: [Icon(Icons.edit_outlined, size: 18), SizedBox(width: 8), Text('Edit')])),
              const PopupMenuItem(value: 'delete', child: Row(children: [Icon(Icons.delete_outline, size: 18, color: AppTheme.sale), SizedBox(width: 8), Text('Delete', style: TextStyle(color: AppTheme.sale))])),
            ],
          ),
        ],
      ),
    );
  }

  void _showAddProductSheet() {
    _navigateToProductForm(null);
  }

  void _showEditProductSheet(Product product) {
    _navigateToProductForm(product);
  }

  void _navigateToProductForm(Product? existing) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => _AdminProductForm(product: existing, onSaved: () {
          _loadProducts();
        }),
      ),
    );
  }

  void _confirmDeleteProduct(Product product) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Text('Delete Product', style: GoogleFonts.poppins(fontWeight: FontWeight.w600)),
        content: Text('Are you sure you want to delete "${product.name}"?', style: GoogleFonts.poppins(fontSize: 13)),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: Text('Cancel', style: GoogleFonts.poppins())),
          TextButton(
            onPressed: () async {
              final scaffoldCtx = context;
              Navigator.pop(ctx);
              final result = await AdminService.deleteProduct(product.id);
              if (result['success'] == true) {
                _loadProducts();
                if (scaffoldCtx.mounted) {
                  ScaffoldMessenger.of(scaffoldCtx).showSnackBar(
                    const SnackBar(content: Text('Product deleted'), backgroundColor: AppTheme.primary, behavior: SnackBarBehavior.floating),
                  );
                }
              } else if (scaffoldCtx.mounted) {
                ScaffoldMessenger.of(scaffoldCtx).showSnackBar(
                  SnackBar(content: Text(result['error'] ?? 'Failed'), backgroundColor: AppTheme.sale, behavior: SnackBarBehavior.floating),
                );
              }
            },
            child: Text('Delete', style: GoogleFonts.poppins(color: AppTheme.sale)),
          ),
        ],
      ),
    );
  }

  Widget _buildOrdersTab() {
    if (_loadingOrders) return const ShimmerReturnsList(itemCount: 5);
    return Column(
      children: [
        Container(
          height: 44,
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
          child: ListView(
            scrollDirection: Axis.horizontal,
            children: [
              _filterChip('All', ''),
              _filterChip('Pending', 'pending'),
              _filterChip('Confirmed', 'confirmed'),
              _filterChip('Preparing', 'preparing'),
              _filterChip('Out for Delivery', 'out_for_delivery'),
              _filterChip('Delivered', 'delivered'),
              _filterChip('Cancelled', 'cancelled'),
            ],
          ),
        ),
        Expanded(
          child: _orders.isEmpty
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.receipt_long_outlined, size: 56, color: AppTheme.textLight),
                      const SizedBox(height: 12),
                      Text('No orders found', style: GoogleFonts.poppins(fontSize: 14, color: AppTheme.textSecondary)),
                    ],
                  ),
                )
              : RefreshIndicator(
                  onRefresh: _loadOrders,
                  child: ListView.builder(
                    padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                    itemCount: _orders.length,
                    itemBuilder: (context, index) => _buildOrderCard(_orders[index]),
                  ),
                ),
        ),
      ],
    );
  }

  Widget _filterChip(String label, String value) {
    final selected = _orderStatusFilter == value;
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 4),
      child: FilterChip(
        label: Text(label, style: GoogleFonts.poppins(fontSize: 11, fontWeight: FontWeight.w500, color: selected ? Colors.white : AppTheme.textSecondary)),
        selected: selected,
        onSelected: (_) {
          setState(() {
            _orderStatusFilter = value;
            _loadOrders();
          });
        },
        selectedColor: AppTheme.primary,
        backgroundColor: AppTheme.surface,
        checkmarkColor: Colors.white,
        padding: const EdgeInsets.symmetric(horizontal: 4),
        materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
        side: BorderSide(color: selected ? AppTheme.primary : AppTheme.divider),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      ),
    );
  }

  Widget _buildOrderCard(Order order) {
    final statusColors = _statusColor(order.orderStatus);
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppTheme.surface,
        borderRadius: BorderRadius.circular(14),
        boxShadow: [BoxShadow(color: AppTheme.cardShadow, blurRadius: 6, offset: const Offset(0, 2))],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(color: statusColors.$2.withValues(alpha: 0.15), borderRadius: BorderRadius.circular(6)),
                child: Text(order.orderStatus.toUpperCase(), style: GoogleFonts.poppins(fontSize: 9, fontWeight: FontWeight.w700, color: statusColors.$2)),
              ),
              const Spacer(),
              Text('#${order.orderNumber}', style: GoogleFonts.poppins(fontSize: 12, fontWeight: FontWeight.w600)),
            ],
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              Icon(Icons.person_outline, size: 14, color: AppTheme.textLight),
              const SizedBox(width: 4),
              Text(order.addressName ?? 'Customer', style: GoogleFonts.poppins(fontSize: 12, color: AppTheme.textPrimary)),
              const Spacer(),
              Text('\$${order.totalAmount.toStringAsFixed(2)}', style: GoogleFonts.poppins(fontSize: 14, fontWeight: FontWeight.w700, color: AppTheme.primary)),
            ],
          ),
          if (order.items != null && order.items!.isNotEmpty) ...[
            const SizedBox(height: 6),
            ...order.items!.take(2).map((item) => Padding(
              padding: const EdgeInsets.only(bottom: 2),
              child: Text('${item.productName} x${item.quantity}', style: GoogleFonts.poppins(fontSize: 11, color: AppTheme.textLight)),
            )),
            if (order.items!.length > 2)
              Text('+${order.items!.length - 2} more items', style: GoogleFonts.poppins(fontSize: 10, color: AppTheme.textLight)),
          ],
          const SizedBox(height: 8),
          Row(
            children: [
              Text(order.createdAt != null ? order.createdAt!.substring(0, 10) : '', style: GoogleFonts.poppins(fontSize: 10, color: AppTheme.textLight)),
              const Spacer(),
              _buildStatusDropdown(order),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildStatusDropdown(Order order) {
    final current = order.orderStatus.toLowerCase();
    final available = _nextStatuses(current);

    if (available.isEmpty) return const SizedBox.shrink();

    return SizedBox(
      height: 32,
      child: PopupMenuButton<String>(
        onSelected: (status) async {
          final scaffoldCtx = context;
          final result = await AdminService.updateOrderStatus(order.id, status);
          if (result['success'] == true) {
            _loadOrders();
            if (scaffoldCtx.mounted) {
              ScaffoldMessenger.of(scaffoldCtx).showSnackBar(
                SnackBar(content: Text('Order status updated to $status'), backgroundColor: AppTheme.primary, behavior: SnackBarBehavior.floating),
              );
            }
          } else if (scaffoldCtx.mounted) {
            ScaffoldMessenger.of(scaffoldCtx).showSnackBar(
              SnackBar(content: Text(result['error'] ?? 'Failed'), backgroundColor: AppTheme.sale, behavior: SnackBarBehavior.floating),
            );
          }
        },
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 10),
          decoration: BoxDecoration(
            border: Border.all(color: AppTheme.divider),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text('Update', style: GoogleFonts.poppins(fontSize: 11, color: AppTheme.primary, fontWeight: FontWeight.w600)),
              const Icon(Icons.arrow_drop_down, size: 16, color: AppTheme.primary),
            ],
          ),
        ),
        itemBuilder: (_) => available.map((s) => PopupMenuItem(
          value: s,
          child: Text(s.replaceAll('_', ' ').toUpperCase(), style: GoogleFonts.poppins(fontSize: 12)),
        )).toList(),
      ),
    );
  }

  List<String> _nextStatuses(String current) {
    switch (current) {
      case 'pending': return ['confirmed', 'cancelled'];
      case 'confirmed': return ['preparing', 'cancelled'];
      case 'preparing': return ['out_for_delivery', 'cancelled'];
      case 'out_for_delivery': return ['delivered'];
      default: return [];
    }
  }

  (Color, Color) _statusColor(String status) {
    switch (status.toLowerCase()) {
      case 'pending': return (const Color(0xFFD97706), const Color(0xFFD97706));
      case 'confirmed': return (const Color(0xFF2563EB), const Color(0xFF2563EB));
      case 'preparing': return (const Color(0xFF7C3AED), const Color(0xFF7C3AED));
      case 'out_for_delivery': return (const Color(0xFF0891B2), const Color(0xFF0891B2));
      case 'delivered': return (const Color(0xFF16A34A), const Color(0xFF16A34A));
      case 'cancelled': return (const Color(0xFFDC2626), const Color(0xFFDC2626));
      default: return (AppTheme.textLight, AppTheme.textLight);
    }
  }

  Widget _buildReviewsTab() {
    if (_loadingReviews) {
      return const Padding(
      padding: EdgeInsets.only(top: 16),
      child: ShimmerReviewCard(),
    );
    }
    if (_reviews.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.rate_review_outlined, size: 56, color: AppTheme.textLight),
            const SizedBox(height: 12),
            Text('No reviews yet', style: GoogleFonts.poppins(fontSize: 14, color: AppTheme.textSecondary)),
          ],
        ),
      );
    }
    return RefreshIndicator(
      onRefresh: _loadReviews,
      child: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: _reviews.length,
        itemBuilder: (context, index) => Container(
          margin: const EdgeInsets.only(bottom: 10),
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: AppTheme.surface,
            borderRadius: BorderRadius.circular(14),
            boxShadow: [BoxShadow(color: AppTheme.cardShadow, blurRadius: 6, offset: const Offset(0, 2))],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  CircleAvatar(
                    radius: 14,
                    backgroundColor: AppTheme.primaryExtraLight,
                    child: Text(_reviews[index].userName[0].toUpperCase(), style: GoogleFonts.poppins(fontSize: 12, fontWeight: FontWeight.w600, color: AppTheme.primary)),
                  ),
                  const SizedBox(width: 8),
                  Expanded(child: Text(_reviews[index].userName, style: GoogleFonts.poppins(fontSize: 13, fontWeight: FontWeight.w600))),
                  ...List.generate(5, (i) => Icon(i < _reviews[index].rating.round() ? Icons.star : Icons.star_border, size: 14, color: const Color(0xFFFFB800))),
                ],
              ),
              const SizedBox(height: 8),
              Text(_reviews[index].comment, style: GoogleFonts.poppins(fontSize: 12, color: AppTheme.textPrimary, height: 1.3)),
              const SizedBox(height: 6),
              Text(_reviews[index].formattedDate, style: GoogleFonts.poppins(fontSize: 10, color: AppTheme.textLight)),
            ],
          ),
        ),
      ),
    );
  }
}

class _AdminProductForm extends StatefulWidget {
  final Product? product;
  final VoidCallback onSaved;

  const _AdminProductForm({this.product, required this.onSaved});

  @override
  State<_AdminProductForm> createState() => _AdminProductFormState();
}

class _AdminProductFormState extends State<_AdminProductForm> {
  final _formKey = GlobalKey<FormState>();
  late TextEditingController _nameCtrl;
  late TextEditingController _descCtrl;
  late TextEditingController _priceCtrl;
  late TextEditingController _stockCtrl;
  late TextEditingController _brandCtrl;
  late TextEditingController _imageCtrl;
  bool _active = true;
  bool _submitting = false;
  List<Category> _categories = [];
  String _categoryId = '';
  bool _loadingCategories = true;
  bool _imageUploading = false;

  @override
  void initState() {
    super.initState();
    final p = widget.product;
    _nameCtrl = TextEditingController(text: p?.name ?? '');
    _descCtrl = TextEditingController(text: p?.description ?? '');
    _priceCtrl = TextEditingController(text: p?.basePrice.toString() ?? '');
    _stockCtrl = TextEditingController(text: p?.stockQuantity.toString() ?? '');
    _brandCtrl = TextEditingController(text: p?.brand ?? '');
    _imageCtrl = TextEditingController(text: p?.images.isNotEmpty == true ? p!.images.first : '');
    _active = p?.isActive ?? true;
    _categoryId = p?.categoryId ?? '';
    _fetchCategories();
  }

  Future<void> _fetchCategories() async {
    final result = await AdminService.getCategories();
    if (!mounted) return;
    setState(() {
      _categories = (result['categories'] as List<Category>?) ?? [];
      _loadingCategories = false;
    });
  }

  Future<void> _pickAndUploadImage() async {
    final file = await ImagePicker().pickImage(source: ImageSource.gallery, maxWidth: 1024, maxHeight: 1024);
    if (file == null) return;
    setState(() => _imageUploading = true);
    try {
      final bytes = await file.readAsBytes();
      final base64 = base64Encode(bytes);
      final mimeType = file.name.endsWith('.png') ? 'image/png' : file.name.endsWith('.webp') ? 'image/webp' : 'image/jpeg';
      final dataUri = 'data:$mimeType;base64,$base64';
      final result = await AdminService.uploadProductImage(dataUri);
      if (result['success'] == true && result['imageUrl'] != null) {
        setState(() => _imageCtrl.text = result['imageUrl'] as String);
      } else {
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(result['error'] ?? 'Upload failed'), backgroundColor: AppTheme.sale, behavior: SnackBarBehavior.floating),
        );
      }
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Upload error: $e'), backgroundColor: AppTheme.sale, behavior: SnackBarBehavior.floating),
      );
    } finally {
      if (mounted) setState(() => _imageUploading = false);
    }
  }

  @override
  void dispose() {
    _nameCtrl.dispose();
    _descCtrl.dispose();
    _priceCtrl.dispose();
    _stockCtrl.dispose();
    _brandCtrl.dispose();
    _imageCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _submitting = true);

    final data = {
      'name': _nameCtrl.text.trim(),
      'description': _descCtrl.text.trim(),
      'base_price': double.tryParse(_priceCtrl.text.trim()) ?? 0,
      'stock_quantity': int.tryParse(_stockCtrl.text.trim()) ?? 0,
      'brand': _brandCtrl.text.trim(),
      if (_imageCtrl.text.trim().isNotEmpty) 'image_url': _imageCtrl.text.trim(),
      'is_active': _active,
      if (_categoryId.isNotEmpty) 'category_id': _categoryId,
    };

    final result = widget.product == null
        ? await AdminService.createProduct(data)
        : await AdminService.updateProduct(widget.product!.id, data);

    if (!mounted) return;
    setState(() => _submitting = false);

    if (result['success'] == true) {
      widget.onSaved();
      Navigator.pop(context);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(widget.product == null ? 'Product created successfully' : 'Product updated successfully'),
          backgroundColor: AppTheme.primary,
          behavior: SnackBarBehavior.floating,
        ),
      );
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(result['error'] ?? 'Failed to save product'),
          backgroundColor: AppTheme.sale,
          behavior: SnackBarBehavior.floating,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final isEdit = widget.product != null;
    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        title: Text(isEdit ? 'Edit Product' : 'Add Product', style: GoogleFonts.poppins(fontWeight: FontWeight.w600, fontSize: 16)),
        centerTitle: true,
        backgroundColor: AppTheme.surface,
        elevation: 0.5,
        leading: IconButton(icon: const Icon(Icons.arrow_back), onPressed: () => Navigator.pop(context)),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _sectionHeader('Basic Information', icon: Icons.shopping_bag_outlined),
              const SizedBox(height: 12),
              _buildTextField(
                controller: _nameCtrl,
                label: 'Product Name',
                hint: 'Enter product name',
                validator: (v) => v == null || v.trim().isEmpty ? 'Required' : null,
              ),
              const SizedBox(height: 12),
              _buildTextField(
                controller: _descCtrl,
                label: 'Description',
                hint: 'Enter product description',
                maxLines: 4,
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: _buildTextField(
                      controller: _brandCtrl,
                      label: 'Brand',
                      hint: 'Brand name',
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Category', style: GoogleFonts.poppins(fontSize: 12, fontWeight: FontWeight.w600, color: AppTheme.textSecondary)),
                        const SizedBox(height: 6),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 14),
                          decoration: BoxDecoration(
                            color: AppTheme.surface,
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: AppTheme.divider),
                          ),
                          child: _loadingCategories
                              ? const Padding(
                                  padding: EdgeInsets.symmetric(vertical: 14),
                                  child: SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2)),
                                )
                              : DropdownButtonHideUnderline(
                                  child: DropdownButton<String>(
                                    value: _categoryId.isEmpty ? null : _categoryId,
                                    hint: Text('Select', style: GoogleFonts.poppins(fontSize: 14, color: AppTheme.textLight)),
                                    isExpanded: true,
                                    icon: Icon(Icons.arrow_drop_down, color: AppTheme.textLight),
                                    items: _categories.map((c) {
                                      return DropdownMenuItem(
                                        value: c.id,
                                        child: Text(
                                          '${c.icon ?? '📦'} ${c.name}',
                                          style: GoogleFonts.poppins(fontSize: 14, color: AppTheme.textPrimary),
                                          overflow: TextOverflow.ellipsis,
                                        ),
                                      );
                                    }).toList(),
                                    onChanged: (v) => setState(() => _categoryId = v ?? ''),
                                  ),
                                ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 24),
              Divider(color: AppTheme.divider, height: 1),
              const SizedBox(height: 24),
              _sectionHeader('Pricing & Stock', icon: Icons.attach_money_outlined),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: _buildTextField(
                      controller: _priceCtrl,
                      label: 'Price',
                      hint: '0.00',
                      keyboardType: TextInputType.number,
                      prefix: '\$',
                      validator: (v) => v == null || v.trim().isEmpty ? 'Required' : null,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: _buildTextField(
                      controller: _stockCtrl,
                      label: 'Stock Quantity',
                      hint: '0',
                      keyboardType: TextInputType.number,
                      validator: (v) => v == null || v.trim().isEmpty ? 'Required' : null,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 24),
              Divider(color: AppTheme.divider, height: 1),
              const SizedBox(height: 24),
              _sectionHeader('Product Image', icon: Icons.camera_alt_outlined),
              const SizedBox(height: 12),
              GestureDetector(
                onTap: _imageUploading ? null : _pickAndUploadImage,
                child: Container(
                  width: double.infinity,
                  padding: const EdgeInsets.symmetric(vertical: 24),
                  decoration: BoxDecoration(
                    color: _imageUploading ? AppTheme.divider.withValues(alpha: 0.3) : AppTheme.surface,
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: AppTheme.divider, width: 1.5, style: BorderStyle.solid),
                  ),
                  child: Column(
                    children: [
                      if (_imageUploading)
                        const SizedBox(width: 28, height: 28, child: CircularProgressIndicator(strokeWidth: 2.5))
                      else ...[
                        Icon(Icons.cloud_upload_outlined, size: 32, color: AppTheme.primary),
                        const SizedBox(height: 8),
                        Text('Upload from device', style: GoogleFonts.poppins(fontSize: 13, fontWeight: FontWeight.w500, color: AppTheme.textSecondary)),
                        Text('PNG, JPG, WebP — max 5MB', style: GoogleFonts.poppins(fontSize: 11, color: AppTheme.textLight)),
                      ],
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  Expanded(child: Divider(color: AppTheme.divider)),
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 12),
                    child: Text('or paste URL', style: GoogleFonts.poppins(fontSize: 11, color: AppTheme.textLight)),
                  ),
                  Expanded(child: Divider(color: AppTheme.divider)),
                ],
              ),
              const SizedBox(height: 12),
              _buildTextField(
                controller: _imageCtrl,
                label: 'Image URL',
                hint: 'https://example.com/image.jpg',
              ),
              const SizedBox(height: 8),
              if (_imageCtrl.text.trim().isNotEmpty)
                ClipRRect(
                  borderRadius: BorderRadius.circular(12),
                  child: Image.network(
                    _imageCtrl.text.trim(),
                    height: 160,
                    width: double.infinity,
                    fit: BoxFit.cover,
                    errorBuilder: (_, _, _) => Container(
                      height: 160,
                      decoration: BoxDecoration(color: AppTheme.divider, borderRadius: BorderRadius.circular(12)),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.broken_image_outlined, size: 36, color: AppTheme.textLight),
                          const SizedBox(height: 4),
                          Text('Invalid image URL', style: GoogleFonts.poppins(fontSize: 12, color: AppTheme.textLight)),
                        ],
                      ),
                    ),
                  ),
                ),
              const SizedBox(height: 24),
              Divider(color: AppTheme.divider, height: 1),
              const SizedBox(height: 24),
              Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Product Status', style: GoogleFonts.poppins(fontSize: 15, fontWeight: FontWeight.w700, color: AppTheme.textPrimary)),
                        const SizedBox(height: 2),
                        Text(_active ? 'Make product unavailable' : 'Make product available for purchase',
                            style: GoogleFonts.poppins(fontSize: 11, color: AppTheme.textLight)),
                      ],
                    ),
                  ),
                  Switch(value: _active, activeThumbColor: AppTheme.primary, onChanged: (v) => setState(() => _active = v)),
                ],
              ),
              const SizedBox(height: 32),
              Row(
                children: [
                  Expanded(
                    child: SizedBox(
                      height: 50,
                      child: OutlinedButton(
                        style: OutlinedButton.styleFrom(
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                          side: BorderSide(color: AppTheme.divider),
                        ),
                        onPressed: () => Navigator.pop(context),
                        child: Text('Cancel', style: GoogleFonts.poppins(fontSize: 14, fontWeight: FontWeight.w500, color: AppTheme.textSecondary)),
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    flex: 2,
                    child: SizedBox(
                      height: 50,
                      child: ElevatedButton(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppTheme.primary,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                          elevation: 4,
                          shadowColor: AppTheme.primary.withValues(alpha: 0.4),
                        ),
                        onPressed: _submitting ? null : _submit,
                        child: _submitting
                            ? const SizedBox(width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2.5, color: Colors.white))
                            : Text(
                                isEdit ? 'Update Product' : 'Create Product',
                                style: GoogleFonts.poppins(fontSize: 15, fontWeight: FontWeight.w600, color: Colors.white),
                              ),
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 20),
            ],
          ),
        ),
      ),
    );
  }

  Widget _sectionHeader(String title, {IconData? icon}) {
    return Row(
      children: [
        if (icon != null) ...[
          Icon(icon, size: 18, color: AppTheme.primary),
          const SizedBox(width: 8),
        ],
        Text(title, style: GoogleFonts.poppins(fontSize: 15, fontWeight: FontWeight.w700, color: AppTheme.textPrimary)),
      ],
    );
  }

  Widget _buildTextField({
    required TextEditingController controller,
    required String label,
    String? hint,
    TextInputType? keyboardType,
    String? prefix,
    int? maxLines,
    String? Function(String?)? validator,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: GoogleFonts.poppins(fontSize: 12, fontWeight: FontWeight.w600, color: AppTheme.textSecondary)),
        const SizedBox(height: 6),
        TextFormField(
          controller: controller,
          keyboardType: keyboardType,
          maxLines: maxLines ?? 1,
          validator: validator,
          decoration: InputDecoration(
            hintText: hint,
            prefixText: prefix,
            prefixStyle: GoogleFonts.poppins(fontSize: 13, color: AppTheme.textPrimary),
            hintStyle: GoogleFonts.poppins(fontSize: 13, color: AppTheme.textLight),
            filled: true,
            fillColor: AppTheme.surface,
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
            enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide(color: AppTheme.divider)),
            focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide(color: AppTheme.primary, width: 1.5)),
            errorBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide(color: AppTheme.sale)),
            contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 13),
          ),
          style: GoogleFonts.poppins(fontSize: 14),
        ),
      ],
    );
  }
}