import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../config/theme.dart';
import '../../services/api_service.dart';
import '../../config/api_config.dart';
import 'create_return_screen.dart';

class ReturnsScreen extends StatefulWidget {
  const ReturnsScreen({super.key});

  @override
  State<ReturnsScreen> createState() => _ReturnsScreenState();
}

class _ReturnsScreenState extends State<ReturnsScreen> with SingleTickerProviderStateMixin {
  List<dynamic> _returns = [];
  late TabController _tabController;

  final _tabs = ['All', 'Pending', 'Approved', 'Completed', 'Rejected'];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: _tabs.length, vsync: this);
    _tabController.addListener(() {
      if (!_tabController.indexIsChanging) setState(() {});
    });
    _loadReturns();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _loadReturns() async {
    try {
      final resp = await ApiService.get(ApiConfig.myReturns);
      final data = resp['data'] as Map<String, dynamic>?;
      final list = data?['returns'] as List? ?? data?['data'] as List? ?? [];
      if (mounted) setState(() { _returns = list; });
    } catch (_) {
    }
  }

  List<dynamic> get _filteredReturns {
    if (_tabController.index == 0) return _returns;
    final status = _tabs[_tabController.index].toLowerCase();
    if (status == 'completed') {
      return _returns.where((r) {
        final s = (r['status'] ?? '').toString().toLowerCase();
        return s == 'completed' || r['entry_type'] == 'refund';
      }).toList();
    }
    return _returns.where((r) => (r['status'] ?? '').toString().toLowerCase() == status).toList();
  }

  Color _statusColor(String? status) {
    switch (status) {
      case 'pending': return AppTheme.warning;
      case 'approved': return AppTheme.info;
      case 'rejected': return AppTheme.error;
      case 'completed': return AppTheme.primary;
      case 'cancelled': return Colors.grey;
      default: return AppTheme.textSecondary;
    }
  }

  Color _statusBg(String? status) {
    switch (status) {
      case 'pending': return const Color(0xFFFEF3C7);
      case 'approved': return const Color(0xFFDBEAFE);
      case 'rejected': return AppTheme.saleLight;
      case 'completed': return AppTheme.primaryExtraLight;
      case 'cancelled': return const Color(0xFFF3F4F6);
      default: return const Color(0xFFF3F4F6);
    }
  }

  IconData _statusIcon(String? status) {
    switch (status) {
      case 'pending': return Icons.hourglass_bottom;
      case 'approved': return Icons.verified;
      case 'rejected': return Icons.do_disturb_alt_outlined;
      case 'completed': return Icons.task_alt;
      case 'cancelled': return Icons.not_interested;
      default: return Icons.help_outline;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        backgroundColor: AppTheme.surface,
        elevation: 0,
        leading: IconButton(
          icon: Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(color: AppTheme.background, shape: BoxShape.circle),
            child: const Icon(Icons.arrow_back_ios_new, size: 18, color: AppTheme.textPrimary),
          ),
          onPressed: () => Navigator.pop(context),
        ),
        title: Text('My Returns', style: GoogleFonts.poppins(fontSize: 18, fontWeight: FontWeight.w700)),
        centerTitle: true,
        actions: [
          IconButton(
            icon: Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(color: AppTheme.primaryExtraLight, shape: BoxShape.circle),
              child: const Icon(Icons.add, size: 20, color: AppTheme.primary),
            ),
            onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const CreateReturnScreen())).then((_) => _loadReturns()),
          ),
        ],
      ),
      body: Column(
        children: [
          Container(
            color: AppTheme.surface,
            child: TabBar(
              controller: _tabController,
              isScrollable: true,
              labelColor: AppTheme.primary,
              unselectedLabelColor: AppTheme.textSecondary,
              indicatorColor: AppTheme.primary,
              labelStyle: GoogleFonts.poppins(fontSize: 13, fontWeight: FontWeight.w600),
              tabs: _tabs.map((t) {
                int count;
                if (t == 'All') {
                  count = _returns.length;
                } else if (t == 'Completed') {
                  count = _returns.where((r) => (r['status'] ?? '').toString().toLowerCase() == 'completed' || r['entry_type'] == 'refund').length;
                } else {
                  count = _returns.where((r) => (r['status'] ?? '').toString().toLowerCase() == t.toLowerCase()).length;
                }
                return Tab(text: '$t ($count)');
              }).toList(),
            ),
          ),
          Expanded(
            child: _filteredReturns.isEmpty
                    ? _buildEmptyState()
                    : RefreshIndicator(
                        onRefresh: _loadReturns,
                        child: ListView.builder(
                          padding: const EdgeInsets.all(16),
                          itemCount: _filteredReturns.length,
                          itemBuilder: (_, i) => _buildReturnCard(_filteredReturns[i]),
                        ),
                      ),
          ),
        ],
      ),
    );
  }

  Widget _buildReturnCard(dynamic ret) {
    final status = (ret['status'] ?? 'pending').toString();
    final isRefund = ret['entry_type'] == 'refund';
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: AppTheme.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppTheme.divider),
      ),
      child: Material(
        color: Colors.transparent,
        borderRadius: BorderRadius.circular(16),
        child: InkWell(
          borderRadius: BorderRadius.circular(16),
          onTap: () => _showReturnDetail(ret),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(color: _statusBg(isRefund ? 'completed' : status), borderRadius: BorderRadius.circular(10)),
                      child: Icon(isRefund ? Icons.payments : _statusIcon(status), size: 20, color: _statusColor(isRefund ? 'completed' : status)),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(_formatOrderId(ret), style: GoogleFonts.poppins(fontWeight: FontWeight.w600, fontSize: 14)),
                          if (ret['product_name'] != null)
                            Text(ret['product_name'], style: GoogleFonts.poppins(fontSize: 12, color: AppTheme.textSecondary), maxLines: 1, overflow: TextOverflow.ellipsis),
                        ],
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(color: _statusBg(isRefund ? 'completed' : status), borderRadius: BorderRadius.circular(8)),
                      child: Text(
                        isRefund ? 'REFUNDED' : status.toUpperCase(),
                        style: GoogleFonts.poppins(fontSize: 10, fontWeight: FontWeight.w700, color: _statusColor(isRefund ? 'completed' : status)),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                if (isRefund && ret['refund_amount'] != null)
                  Row(children: [
                    Icon(Icons.account_balance_wallet, size: 16, color: AppTheme.primary),
                    const SizedBox(width: 4),
                    Text('Refunded: ${formatPrice(ret['refund_amount'])}', style: GoogleFonts.poppins(fontSize: 13, fontWeight: FontWeight.w600, color: AppTheme.primary)),
                  ])
                else if (!isRefund)
                  Row(children: [
                    Icon(Icons.description_outlined, size: 14, color: AppTheme.textLight),
                    const SizedBox(width: 6),
                    Expanded(child: Text(ret['reason'] ?? 'No reason provided', style: GoogleFonts.poppins(fontSize: 13, color: AppTheme.textSecondary), maxLines: 2, overflow: TextOverflow.ellipsis)),
                  ]),
                const SizedBox(height: 8),
                Row(
                  children: [
                    Icon(Icons.date_range, size: 13, color: AppTheme.textLight),
                    const SizedBox(width: 4),
                    Text(_formatDate(ret['created_at']), style: GoogleFonts.poppins(fontSize: 11, color: AppTheme.textLight)),
                    if (ret['refund_amount'] != null && !isRefund) ...[
                      const SizedBox(width: 16),
                      Icon(Icons.monetization_on_outlined, size: 13, color: AppTheme.primary),
                      Text(formatPrice(ret['refund_amount']), style: GoogleFonts.poppins(fontSize: 11, fontWeight: FontWeight.w600, color: AppTheme.primary)),
                    ],
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            width: 80, height: 80,
            decoration: BoxDecoration(color: AppTheme.primaryExtraLight, shape: BoxShape.circle),
            child: const Icon(Icons.assignment_return_outlined, size: 40, color: AppTheme.primary),
          ),
          const SizedBox(height: 20),
          Text('No return requests', style: GoogleFonts.poppins(fontSize: 16, fontWeight: FontWeight.w600, color: AppTheme.textPrimary)),
          const SizedBox(height: 8),
          Text('Items can be returned within 7 days of delivery', style: GoogleFonts.poppins(fontSize: 13, color: AppTheme.textSecondary)),
          const SizedBox(height: 24),
          ElevatedButton.icon(
            style: ElevatedButton.styleFrom(
              backgroundColor: AppTheme.primary,
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            ),
            onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const CreateReturnScreen())).then((_) => _loadReturns()),
            icon: const Icon(Icons.assignment_return, color: Colors.white),
            label: Text('Create Return', style: GoogleFonts.poppins(color: Colors.white, fontWeight: FontWeight.w600)),
          ),
        ],
      ),
    );
  }

  String _formatOrderId(dynamic ret) {
    final num = ret['order_number'] ?? '';
    if (num.toString().isNotEmpty) return '#$num';
    final id = (ret['id'] ?? '').toString();
    return '#${id.length > 8 ? id.substring(id.length - 8) : id}';
  }

  void _showReturnDetail(dynamic ret) {
    final status = (ret['status'] ?? 'pending').toString();
    final isRefund = ret['entry_type'] == 'refund';
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (ctx) {
        return DraggableScrollableSheet(
          initialChildSize: 0.7, maxChildSize: 0.95, minChildSize: 0.5,
          expand: false,
          builder: (_, scrollCtrl) => Padding(
            padding: const EdgeInsets.all(24),
            child: ListView(
              controller: scrollCtrl,
              children: [
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(color: _statusBg(isRefund ? 'completed' : status), borderRadius: BorderRadius.circular(12)),
                      child: Icon(isRefund ? Icons.payments : _statusIcon(status), size: 24, color: _statusColor(isRefund ? 'completed' : status)),
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(_formatOrderId(ret), style: GoogleFonts.poppins(fontWeight: FontWeight.w700, fontSize: 16)),
                          Text(isRefund ? 'REFUNDED' : status.toUpperCase(), style: GoogleFonts.poppins(fontSize: 12, fontWeight: FontWeight.w600, color: _statusColor(isRefund ? 'completed' : status))),
                        ],
                      ),
                    ),
                    IconButton(icon: const Icon(Icons.close), onPressed: () => Navigator.pop(ctx)),
                  ],
                ),
                const SizedBox(height: 20),
                if (isRefund) ...[
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(color: AppTheme.primaryExtraLight, borderRadius: BorderRadius.circular(12)),
                    child: Row(
                      children: [
                        const Icon(Icons.account_balance_wallet, color: AppTheme.primary, size: 28),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text('Refund Completed', style: GoogleFonts.poppins(fontWeight: FontWeight.w600, color: AppTheme.primaryDark)),
                              if (ret['refund_amount'] != null)
                                Text('${formatPrice(ret['refund_amount'])} has been refunded to your original payment method', style: GoogleFonts.poppins(fontSize: 12, color: AppTheme.primary)),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ] else ...[
                  if (ret['product_name'] != null) ...[
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(color: AppTheme.background, borderRadius: BorderRadius.circular(12)),
                      child: Row(
                        children: [
                          Container(
                            width: 48, height: 48,
                            decoration: BoxDecoration(
                              color: AppTheme.divider,
                              borderRadius: BorderRadius.circular(10),
                              image: ret['product_image'] != null && ret['product_image'].toString().isNotEmpty
                                    ? DecorationImage(image: NetworkImage(ret['product_image']), fit: BoxFit.cover) : null,
                             ),
                             child: ret['product_image'] == null || ret['product_image'].toString().isEmpty
                                 ? const Icon(Icons.shopping_bag_outlined, color: AppTheme.textLight) : null,
                          ),
                          const SizedBox(width: 12),
                          Expanded(child: Text(ret['product_name'], style: GoogleFonts.poppins(fontSize: 14, fontWeight: FontWeight.w500))),
                        ],
                      ),
                    ),
                    const SizedBox(height: 12),
                  ],
                  _buildInfoRow('Reason', ret['reason'] ?? 'N/A'),
                  if (ret['description'] != null && ret['description'].toString().isNotEmpty)
                    _buildInfoRow('Description', ret['description']),
                  if (ret['vendor_notes'] != null && ret['vendor_notes'].toString().isNotEmpty)
                    _buildInfoRow('Vendor Note', ret['vendor_notes']),
                ],
                const SizedBox(height: 12),
                _buildInfoRow('Order Amount', formatPrice(ret['total_amount'])),
                if (ret['refund_amount'] != null) _buildInfoRow('Refund Amount', formatPrice(ret['refund_amount'])),
                _buildInfoRow('Date', _formatDate(ret['created_at'])),
                const SizedBox(height: 20),
                if (!isRefund && status == 'pending')
                  SizedBox(
                    width: double.infinity,
                    child: OutlinedButton.icon(
                      style: OutlinedButton.styleFrom(
                        foregroundColor: AppTheme.error,
                        side: const BorderSide(color: AppTheme.error),
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                      onPressed: () => _cancelReturn(ret['id']),
                      icon: const Icon(Icons.cancel_outlined, size: 18),
                      label: Text('Cancel Return Request', style: GoogleFonts.poppins(fontWeight: FontWeight.w600)),
                    ),
                  ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildInfoRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(width: 100, child: Text(label, style: GoogleFonts.poppins(fontSize: 13, color: AppTheme.textSecondary))),
          Expanded(child: Text(value, style: GoogleFonts.poppins(fontSize: 13, fontWeight: FontWeight.w500, color: AppTheme.textPrimary))),
        ],
      ),
    );
  }

  String _formatDate(dynamic d) {
    if (d == null) return '\u2014';
    try {
      final dt = DateTime.parse(d.toString());
      return '${dt.month}/${dt.day}/${dt.year}';
    } catch (_) { return d.toString(); }
  }

  Future<void> _cancelReturn(String id) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text('Cancel Return', style: GoogleFonts.poppins(fontWeight: FontWeight.w600)),
        content: Text('Are you sure you want to cancel this return request?', style: GoogleFonts.poppins()),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: Text('No', style: GoogleFonts.poppins())),
          TextButton(onPressed: () => Navigator.pop(ctx, true), child: Text('Yes, Cancel', style: GoogleFonts.poppins(color: AppTheme.error))),
        ],
      ),
    );
    if (confirm != true) return;
    try {
      await ApiService.delete('${ApiConfig.returns}/$id');
      _loadReturns();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Return cancelled', style: GoogleFonts.poppins()), backgroundColor: AppTheme.primary),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to cancel: $e', style: GoogleFonts.poppins()), backgroundColor: AppTheme.error),
        );
      }
    }
  }
}

String formatPrice(dynamic price) {
  if (price == null) return '\$0.00';
  final num = double.tryParse(price.toString()) ?? 0;
  return '\$${num.toStringAsFixed(2)}';
}
