import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../config/theme.dart';
import '../../models/order.dart';
import '../../providers/order_provider.dart';
import '../../widgets/shimmer_loaders.dart';
import '../../widgets/write_review_sheet.dart';
import 'create_return_screen.dart';
import '../../localization/app_localizations.dart';

class OrderListScreen extends StatefulWidget {
  const OrderListScreen({super.key});

  @override
  State<OrderListScreen> createState() => _OrderListScreenState();
}

class _OrderListScreenState extends State<OrderListScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final ScrollController _scrollController = ScrollController();

  final List<Map<String, dynamic>> _statusTabs = [
    {'key': 'all', 'label': 'All'},
    {'key': 'pending', 'label': 'Pending'},
    {'key': 'confirmed', 'label': 'Confirmed'},
    {'key': 'preparing', 'label': 'Preparing'},
    {'key': 'out_for_delivery', 'label': 'Delivery'},
    {'key': 'delivered', 'label': 'Delivered'},
    {'key': 'cancelled', 'label': 'Cancelled'},
  ];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: _statusTabs.length, vsync: this);
    _scrollController.addListener(_onScroll);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<OrderProvider>().loadOrders();
    });
  }

  void _onScroll() {
    if (_scrollController.position.pixels >= _scrollController.position.maxScrollExtent - 200) {
      context.read<OrderProvider>().loadMoreOrders();
    }
  }

  @override
  void dispose() {
    _scrollController.removeListener(_onScroll);
    _scrollController.dispose();
    _tabController.dispose();
    super.dispose();
  }

  List<Order> _getFilteredOrders(OrderProvider provider, String status) {
    if (status == 'all') return provider.orders;
    return provider.orders
        .where((o) => o.orderStatus.toLowerCase() == status.toLowerCase())
        .toList();
  }

  @override
  Widget build(BuildContext context) {
    final t = AppLocalizations.of(context).translate;
    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        backgroundColor: AppTheme.surface,
        elevation: 0,
        leading: IconButton(
          icon: Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: AppTheme.background,
              shape: BoxShape.circle,
            ),
            child: const Icon(
              Icons.arrow_back_ios_new,
              size: 18,
              color: AppTheme.textPrimary,
            ),
          ),
          onPressed: () => Navigator.pop(context),
        ),
        title: Text(
          t('my_orders'),
          style: GoogleFonts.poppins(fontSize: 18, fontWeight: FontWeight.w700),
        ),
        centerTitle: true,
      ),
      body: Consumer<OrderProvider>(
        builder: (context, provider, _) {
          if (provider.isLoading && provider.orders.isEmpty) {
            return Column(
              children: [
                const SizedBox(height: 16),
                shimmerWrap(child: Container(
                  height: 44, margin: const EdgeInsets.symmetric(horizontal: 16),
                  decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12)),
                )),
                const SizedBox(height: 16),
                Expanded(child: ShimmerReturnsList(itemCount: 4)),
              ],
            );
          }
          if (provider.error != null && provider.orders.isEmpty) {
            return Center(
              child: Padding(
                padding: const EdgeInsets.all(32),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(Icons.error_outline, size: 64, color: AppTheme.sale),
                    const SizedBox(height: 16),
                    Text(
                      provider.error!,
                      textAlign: TextAlign.center,
                      style: GoogleFonts.poppins(fontSize: 15, color: AppTheme.textSecondary),
                    ),
                    const SizedBox(height: 24),
                    ElevatedButton.icon(
                      onPressed: () => provider.loadOrders(),
                      icon: const Icon(Icons.refresh, size: 18),
                      label: Text(t('try_again')),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppTheme.primary,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                    ),
                  ],
                ),
      ),
    );
  }

  return Column(
    children: [
      Container(
        color: AppTheme.surface,
        child: TabBar(
          controller: _tabController,
          isScrollable: true,
          labelColor: AppTheme.primary,
          unselectedLabelColor: AppTheme.textSecondary,
          indicatorColor: AppTheme.primary,
          indicatorWeight: 3,
          labelStyle: GoogleFonts.poppins(
            fontWeight: FontWeight.w600,
            fontSize: 13,
          ),
          unselectedLabelStyle: GoogleFonts.poppins(
            fontWeight: FontWeight.w500,
            fontSize: 13,
          ),
          tabAlignment: TabAlignment.start,
          padding: const EdgeInsets.symmetric(horizontal: 8),
          tabs: _statusTabs.map((tab) {
            final key = tab['key'];
            String label;
            switch (key) {
              case 'all': label = 'All'; break;
              case 'pending': label = t('pending'); break;
              case 'confirmed': label = t('confirmed'); break;
              case 'preparing': label = t('processing'); break;
              case 'out_for_delivery': label = t('delivery'); break;
              case 'delivered': label = t('delivered'); break;
              case 'cancelled': label = t('cancelled'); break;
              default: label = key;
            }
            return Tab(text: label);
          }).toList(),
        ),
      ),
      Expanded(
        child: TabBarView(
          controller: _tabController,
          children: _statusTabs.map((tab) {
            final filtered = _getFilteredOrders(provider, tab['key']);
            return _buildOrderList(filtered, provider);
          }).toList(),
        ),
      ),
    ],
  );
        },
      ),
    );
  }

  Widget _buildOrderList(List<Order> orders, OrderProvider provider) {
    final t = AppLocalizations.of(context).translate;
    if (orders.isEmpty && !provider.isLoading) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: AppTheme.primaryExtraLight,
                shape: BoxShape.circle,
              ),
              child: const Icon(
                Icons.receipt_long_outlined,
                size: 64,
                color: AppTheme.primary,
              ),
            ),
            const SizedBox(height: 24),
            Text(
              t('no_data'),
              style: GoogleFonts.poppins(
                fontSize: 18,
                fontWeight: FontWeight.w600,
                color: AppTheme.textPrimary,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Start shopping to see your orders here',
              style: GoogleFonts.poppins(
                fontSize: 14,
                color: AppTheme.textSecondary,
              ),
            ),
          ],
        ),
      );
    }

    return RefreshIndicator(
      color: AppTheme.primary,
      onRefresh: () => provider.loadOrders(),
      child: ListView.builder(
        controller: _scrollController,
        padding: const EdgeInsets.all(16),
        itemCount: orders.length + (provider.hasMore ? 1 : 0),
        itemBuilder: (context, index) {
          if (index == orders.length) {
            return const Padding(
              padding: EdgeInsets.symmetric(vertical: 16),
              child: Center(child: SizedBox(width: 24, height: 24, child: CircularProgressIndicator(strokeWidth: 2))),
            );
          }
          final order = orders[index];
          return _OrderCard(
            order: order,
            onTap: () => _showOrderDetails(order),
          );
        },
      ),
    );
  }

  void _showOrderDetails(Order order) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => _OrderDetailsSheet(order: order),
    );
  }
}

class _OrderCard extends StatelessWidget {
  final Order order;
  final VoidCallback onTap;

  const _OrderCard({required this.order, required this.onTap});

  Color _statusColor(String status) {
    return switch (status.toLowerCase()) {
      'delivered' => AppTheme.primary,
      'confirmed' => AppTheme.info,
      'preparing' => AppTheme.accent,
      'out_for_delivery' => AppTheme.primaryLight,
      'pending' => AppTheme.textLight,
      'cancelled' => AppTheme.sale,
      _ => AppTheme.textSecondary,
    };
  }

  String _statusLabel(String status, String Function(String) t) {
    return switch (status.toLowerCase()) {
      'delivered' => t('delivered'),
      'confirmed' => t('confirmed'),
      'preparing' => t('processing'),
      'out_for_delivery' => t('delivery'),
      'pending' => t('pending'),
      'cancelled' => t('cancelled'),
      _ => status,
    };
  }

  IconData _statusIcon(String status) {
    return switch (status.toLowerCase()) {
      'delivered' => Icons.check_circle,
      'confirmed' => Icons.thumb_up,
      'preparing' => Icons.restaurant,
      'out_for_delivery' => Icons.local_shipping,
      'pending' => Icons.schedule,
      'cancelled' => Icons.cancel,
      _ => Icons.help,
    };
  }

  @override
  Widget build(BuildContext context) {
    final t = AppLocalizations.of(context).translate;
    final status = order.orderStatus.toLowerCase();

    return GestureDetector(
      onTap: onTap,
      child: Container(
        margin: const EdgeInsets.only(bottom: 10),
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: AppTheme.surface,
          borderRadius: BorderRadius.circular(16),
          boxShadow: [
            BoxShadow(
              color: AppTheme.cardShadow,
              blurRadius: 8,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Column(
          children: [
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(6),
                  decoration: BoxDecoration(
                    color: _statusColor(status).withValues(alpha: 0.1),
                    shape: BoxShape.circle,
                  ),
                  child: Icon(
                    _statusIcon(status),
                    color: _statusColor(status),
                    size: 16,
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          GestureDetector(
                            onTap: () {
                              final id = order.orderNumber.isNotEmpty ? order.orderNumber : order.id;
                              Clipboard.setData(ClipboardData(text: id));
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(
                                  content: Text(t('order_id_copied'), style: GoogleFonts.poppins(fontSize: 12)),
                                  backgroundColor: AppTheme.primary,
                                  duration: const Duration(seconds: 1),
                                  behavior: SnackBarBehavior.floating,
                                ),
                              );
                            },
                            child: Text(
                              '#${order.orderNumber.isNotEmpty ? order.orderNumber : order.id.length > 8 ? order.id.substring(order.id.length - 8) : order.id}',
                              style: GoogleFonts.poppins(
                                fontWeight: FontWeight.w700,
                                fontSize: 13,
                                color: AppTheme.textPrimary,
                              ),
                            ),
                          ),
                          const SizedBox(width: 4),
                          GestureDetector(
                            onTap: () {
                              final id = order.orderNumber.isNotEmpty ? order.orderNumber : order.id;
                              Clipboard.setData(ClipboardData(text: id));
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(
                                  content: Text(t('order_id_copied'), style: GoogleFonts.poppins(fontSize: 12)),
                                  backgroundColor: AppTheme.primary,
                                  duration: const Duration(seconds: 1),
                                  behavior: SnackBarBehavior.floating,
                                ),
                              );
                            },
                            child: Icon(Icons.copy, size: 13, color: AppTheme.textLight),
                          ),
                        ],
                      ),
                      if (order.storeName != null)
                        Text(
                          order.storeName!,
                          style: GoogleFonts.poppins(
                            color: AppTheme.textLight,
                            fontSize: 10,
                          ),
                        ),
                      Text(
                        order.createdAt != null && order.createdAt!.length >= 10
                            ? order.createdAt!.substring(0, 10) : '',
                        style: GoogleFonts.poppins(
                          color: AppTheme.textLight,
                          fontSize: 11,
                        ),
                      ),
                    ],
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: _statusColor(status).withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    _statusLabel(status, t),
                    style: GoogleFonts.poppins(
                      color: _statusColor(status),
                      fontSize: 10,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 10),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  '${order.items?.length ?? 0} ${t('items')}',
                  style: GoogleFonts.poppins(
                    color: AppTheme.textSecondary,
                    fontSize: 12,
                  ),
                ),
                Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      '\$${order.totalAmount.toStringAsFixed(2)}',
                      style: GoogleFonts.poppins(
                        fontWeight: FontWeight.w700,
                        color: AppTheme.primary,
                        fontSize: 16,
                      ),
                    ),
                    const SizedBox(width: 8),
                    const Icon(Icons.arrow_forward_ios, size: 12, color: AppTheme.textLight),
                  ],
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _OrderDetailsSheet extends StatelessWidget {
  final Order order;

  const _OrderDetailsSheet({required this.order});

  @override
  Widget build(BuildContext context) {
    final t = AppLocalizations.of(context).translate;
    return DraggableScrollableSheet(
      initialChildSize: 0.7,
      maxChildSize: 0.95,
      minChildSize: 0.5,
      builder: (context, scrollController) {
        return Container(
          decoration: const BoxDecoration(
            color: AppTheme.surface,
            borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
          ),
          child: Column(
            children: [
              Container(
                margin: const EdgeInsets.only(top: 12),
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: AppTheme.divider,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              Expanded(
                child: ListView(
                  controller: scrollController,
                  padding: const EdgeInsets.all(16),
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: GestureDetector(
                            onTap: () {
                              Clipboard.setData(ClipboardData(text: order.orderNumber));
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(
                                  content: Text(t('order_id_copied'), style: GoogleFonts.poppins(fontSize: 12)),
                                  backgroundColor: AppTheme.primary,
                                  duration: const Duration(seconds: 1),
                                  behavior: SnackBarBehavior.floating,
                                ),
                              );
                            },
                            child: Row(
                              children: [
                                Flexible(
                                  child: Text(
                                    'Order #${order.orderNumber}',
                                    style: GoogleFonts.poppins(
                                      fontSize: 18,
                                      fontWeight: FontWeight.w700,
                                      color: AppTheme.textPrimary,
                                    ),
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ),
                                const SizedBox(width: 6),
                                Icon(Icons.copy, size: 16, color: AppTheme.textLight),
                              ],
                            ),
                          ),
                        ),
                        IconButton(
                          onPressed: () => Navigator.pop(context),
                          icon: const Icon(Icons.close, color: AppTheme.textLight),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),
                    _buildSectionTitle(t('order_status')),
                    const SizedBox(height: 10),
                    _buildStatusTimeline(order.orderStatus, t),
                    const SizedBox(height: 20),
                    _buildSectionTitle(t('items')),
                    const SizedBox(height: 10),
                    ...(order.items ?? []).map((item) => _buildOrderItem(item, t)),
                    const Divider(height: 24),
                    _buildSectionTitle(t('delivery_address')),
                    const SizedBox(height: 6),
                    Text(
                      order.shippingAddress != null
                          ? (order.shippingAddress!['address'] ?? order.shippingAddress.toString())
                          : t('not_specified'),
                      style: GoogleFonts.poppins(color: AppTheme.textSecondary, fontSize: 13),
                    ),
                    const SizedBox(height: 16),
                    _buildSectionTitle(t('payment_methods')),
                    const SizedBox(height: 6),
                    Text(
                      order.paymentMethod.toUpperCase(),
                      style: GoogleFonts.poppins(
                        color: AppTheme.primary,
                        fontWeight: FontWeight.w600,
                        fontSize: 13,
                      ),
                    ),
                    const SizedBox(height: 16),
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: AppTheme.primaryExtraLight,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            t('total'),
                            style: GoogleFonts.poppins(
                              fontWeight: FontWeight.w600,
                              color: AppTheme.textPrimary,
                              fontSize: 14,
                            ),
                          ),
                          Text(
                            '\$${order.totalAmount.toStringAsFixed(2)}',
                            style: GoogleFonts.poppins(
                              fontSize: 18,
                              fontWeight: FontWeight.w800,
                              color: AppTheme.primary,
                            ),
                          ),
                        ],
                      ),
                    ),
                    if (order.canCancel) ...[
                      const SizedBox(height: 16),
                      SizedBox(
                        width: double.infinity,
                        child: OutlinedButton.icon(
                          onPressed: () => _showCancelDialog(context),
                          icon: const Icon(Icons.cancel_outlined, size: 18, color: AppTheme.sale),
                          label: Text(t('cancel_order'), style: GoogleFonts.poppins(fontWeight: FontWeight.w600, color: AppTheme.sale)),
                          style: OutlinedButton.styleFrom(
                            side: const BorderSide(color: AppTheme.sale),
                            padding: const EdgeInsets.symmetric(vertical: 14),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          ),
                        ),
                      ),
                    ],
                    if (order.orderStatus.toLowerCase() == 'delivered') ...[
                      if (order.items != null && order.items!.isNotEmpty)
                        Padding(
                          padding: const EdgeInsets.only(bottom: 8),
                          child: SizedBox(
                            width: double.infinity,
                            child: OutlinedButton.icon(
                              onPressed: () {
                                Navigator.pop(context);
                                _showWriteReviewSheet(context, order);
                              },
                              icon: const Icon(Icons.star_outline, size: 18),
                              label: Text(t('write_review'), style: GoogleFonts.poppins(fontWeight: FontWeight.w600)),
                              style: OutlinedButton.styleFrom(
                                foregroundColor: const Color(0xFFFFB800),
                                side: const BorderSide(color: Color(0xFFFFB800)),
                                padding: const EdgeInsets.symmetric(vertical: 12),
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                              ),
                            ),
                          ),
                        ),
                      const SizedBox(height: 16),
                      SizedBox(
                        width: double.infinity,
                        child: ElevatedButton.icon(
                          onPressed: () {
                            Navigator.pop(context);
                            Navigator.push(
                              context,
                              MaterialPageRoute(
                                builder: (context) => const CreateReturnScreen(),
                              ),
                            );
                          },
                          icon: const Icon(Icons.replay_outlined, size: 18),
                          label: Text(t('return_replace'), style: GoogleFonts.poppins(fontWeight: FontWeight.w600)),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppTheme.primary,
                            foregroundColor: Colors.white,
                            padding: const EdgeInsets.symmetric(vertical: 14),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          ),
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  void _showWriteReviewSheet(BuildContext context, Order order) {
    if (order.items == null || order.items!.isEmpty) return;
    if (order.items!.length == 1) {
      final item = order.items!.first;
      showModalBottomSheet(
        context: context,
        isScrollControlled: true,
        backgroundColor: Colors.transparent,
        builder: (_) => WriteReviewSheet(
          productId: item.productId,
          productName: item.productName,
          productImage: item.image,
        ),
      );
    } else {
      showModalBottomSheet(
        context: context,
        isScrollControlled: true,
        backgroundColor: Colors.transparent,
        shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
        builder: (ctx) => Container(
          padding: const EdgeInsets.all(20),
          decoration: const BoxDecoration(
            color: AppTheme.surface,
            borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(child: Container(width: 36, height: 4, decoration: BoxDecoration(color: AppTheme.divider, borderRadius: BorderRadius.circular(2)))),
              const SizedBox(height: 16),
              Text('Select Product to Review', style: GoogleFonts.poppins(fontSize: 18, fontWeight: FontWeight.w700)),
              const SizedBox(height: 12),
              ...order.items!.map((item) => ListTile(
                contentPadding: EdgeInsets.zero,
                leading: item.image != null
                    ? ClipRRect(borderRadius: BorderRadius.circular(8), child: Image.network(item.image!, width: 48, height: 48, fit: BoxFit.cover, errorBuilder: (_, _, _) => Container(width: 48, height: 48, color: AppTheme.background, child: Icon(Icons.image, color: AppTheme.textLight))))
                    : Container(width: 48, height: 48, decoration: BoxDecoration(color: AppTheme.background, borderRadius: BorderRadius.circular(8)), child: Icon(Icons.shopping_bag, color: AppTheme.textLight)),
                title: Text(item.productName, style: GoogleFonts.poppins(fontSize: 14, fontWeight: FontWeight.w500)),
                subtitle: Text('Qty: ${item.quantity}', style: GoogleFonts.poppins(fontSize: 12, color: AppTheme.textSecondary)),
                trailing: const Icon(Icons.chevron_right, color: AppTheme.textLight),
                onTap: () {
                  Navigator.pop(ctx);
                  showModalBottomSheet(
                    context: context,
                    isScrollControlled: true,
                    backgroundColor: Colors.transparent,
                    builder: (_) => WriteReviewSheet(
                      productId: item.productId,
                      productName: item.productName,
                      productImage: item.image,
                    ),
                  );
                },
              )),
            ],
          ),
        ),
      );
    }
  }

  Widget _buildSectionTitle(String title) {
    return Text(
      title,
      style: GoogleFonts.poppins(
        fontSize: 14,
        fontWeight: FontWeight.w700,
        color: AppTheme.textPrimary,
      ),
    );
  }

  Widget _buildStatusTimeline(String status, String Function(String) t) {
    final steps = [
      {'key': 'pending', 'label': t('pending')},
      {'key': 'confirmed', 'label': t('confirmed')},
      {'key': 'preparing', 'label': t('processing')},
      {'key': 'out_for_delivery', 'label': t('delivery')},
      {'key': 'delivered', 'label': t('delivered')},
    ];
    final currentIndex = steps.indexWhere((s) => s['key'] == status.toLowerCase());
    final isCancelled = status.toLowerCase() == 'cancelled';

    if (isCancelled) {
      return Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: AppTheme.saleLight,
          borderRadius: BorderRadius.circular(12),
        ),
        child: Row(
          children: [
            const Icon(Icons.cancel, color: AppTheme.sale, size: 20),
            const SizedBox(width: 8),
            Text(
              t('order_cancelled'),
              style: GoogleFonts.poppins(
                color: AppTheme.sale,
                fontWeight: FontWeight.w600,
                fontSize: 13,
              ),
            ),
          ],
        ),
      );
    }

    return Column(
      children: List.generate(steps.length, (index) {
        final isCompleted = index <= currentIndex;
        final isCurrent = index == currentIndex;

        return Row(
          children: [
            Container(
              width: 20,
              height: 20,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: isCompleted ? AppTheme.primary : AppTheme.background,
                border: Border.all(
                  color: isCompleted ? AppTheme.primary : AppTheme.divider,
                  width: 1.5,
                ),
              ),
              child: isCompleted
                  ? const Icon(Icons.check, color: Colors.white, size: 12)
                  : null,
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Text(
                steps[index]['label']!,
                style: GoogleFonts.poppins(
                  fontSize: 12,
                  fontWeight: isCurrent ? FontWeight.w700 : FontWeight.w500,
                  color: isCompleted ? AppTheme.textPrimary : AppTheme.textLight,
                ),
              ),
            ),
            if (isCurrent)
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(
                  color: AppTheme.primary,
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(
                  'Now',
                  style: GoogleFonts.poppins(
                    color: Colors.white,
                    fontSize: 9,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
          ],
        );
      }),
    );
  }

  Widget _buildOrderItem(OrderItem item, String Function(String) t) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Row(
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: AppTheme.background,
              borderRadius: BorderRadius.circular(8),
            ),
            clipBehavior: Clip.antiAlias,
            child: item.image != null && item.image!.isNotEmpty
                ? Image.network(
                    item.image!,
                    fit: BoxFit.cover,
                    errorBuilder: (_, _, _) => const Icon(Icons.shopping_bag_outlined, color: AppTheme.textLight, size: 18),
                  )
                : const Icon(
                    Icons.shopping_bag_outlined,
                    color: AppTheme.textLight,
                    size: 18,
                  ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              item.productName.isNotEmpty ? item.productName : t('product'),
              style: GoogleFonts.poppins(fontWeight: FontWeight.w600, fontSize: 13),
              overflow: TextOverflow.ellipsis,
            ),
          ),
          Text(
            'x${item.quantity}',
            style: GoogleFonts.poppins(color: AppTheme.textSecondary, fontSize: 12),
          ),
          const SizedBox(width: 8),
          Text(
            '\$${item.totalPrice.toStringAsFixed(2)}',
            style: GoogleFonts.poppins(fontWeight: FontWeight.w700, color: AppTheme.primary, fontSize: 13),
          ),
        ],
      ),
    );
  }

  void _showCancelDialog(BuildContext context) {
    final t = AppLocalizations.of(context).translate;
    final reasonController = TextEditingController();
    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDialogState) {
          bool loading = false;
          return AlertDialog(
            title: Text(t('cancel_order'), style: GoogleFonts.poppins(fontWeight: FontWeight.w700, fontSize: 18)),
            content: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  t('cancel_confirm'),
                  style: GoogleFonts.poppins(fontSize: 14, color: AppTheme.textSecondary),
                ),
                const SizedBox(height: 12),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: AppTheme.primaryExtraLight,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Icon(Icons.info_outline, color: AppTheme.primary, size: 18),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          'Your refund amount will be credited within 15 minutes. After 15 minutes, funds will be returned to the original Stripe payment card.',
                          style: GoogleFonts.poppins(fontSize: 12, color: AppTheme.primaryDark),
                        ),
                      ),
                    ],
                  ),
                ),
                if (!loading) ...[
                  const SizedBox(height: 16),
                  Text('Reason (optional)', style: GoogleFonts.poppins(fontSize: 12, fontWeight: FontWeight.w600, color: AppTheme.textPrimary)),
                  const SizedBox(height: 6),
                  TextField(
                    controller: reasonController,
                    maxLines: 3,
                    decoration: InputDecoration(
                      hintText: 'Tell us why...',
                      hintStyle: GoogleFonts.poppins(color: AppTheme.textLight, fontSize: 13),
                      filled: true,
                      fillColor: AppTheme.background,
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
                    ),
                  ),
                ] else ...[
                  const SizedBox(height: 24),
                  Center(child: ButtonLoader(text: 'Cancelling')),
                ],
              ],
            ),
            actions: loading
                ? []
                : [
                    TextButton(
                      onPressed: () => Navigator.pop(ctx),
                      child: Text('Keep Order', style: GoogleFonts.poppins(color: AppTheme.textSecondary)),
                    ),
                    ElevatedButton(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppTheme.sale,
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                      onPressed: () async {
                        setDialogState(() { loading = true; });
                        final provider = context.read<OrderProvider>();
                        final result = await provider.cancelOrder(
                          order.id,
                          reason: reasonController.text.trim().isNotEmpty
                              ? reasonController.text.trim()
                              : null,
                        );
                        if (!context.mounted) return;
                        if (result['success'] == true) {
                          if (ctx.mounted) Navigator.pop(ctx);
                          Navigator.of(context).pop();
                          if (context.mounted) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(
                                content: Text(t('order_cancelled'), style: GoogleFonts.poppins()),
                                backgroundColor: AppTheme.primary,
                                behavior: SnackBarBehavior.floating,
                              ),
                            );
                          }
                        } else {
                          setDialogState(() { loading = false; });
                          final msg = result['error'] ?? result['message'] ?? 'Failed to cancel order';
                          if (context.mounted) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(
                                content: Text(msg, style: GoogleFonts.poppins()),
                                backgroundColor: AppTheme.sale,
                                behavior: SnackBarBehavior.floating,
                              ),
                            );
                          }
                        }
                      },
                      child: Text('Yes, Cancel', style: GoogleFonts.poppins(fontWeight: FontWeight.w600)),
                    ),
                  ],
          );
        },
      ),
    );
  }
}
