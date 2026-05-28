import 'dart:convert';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:image_picker/image_picker.dart';
import '../../config/theme.dart';
import '../../services/api_service.dart';
import '../../config/api_config.dart';

class CreateReturnScreen extends StatefulWidget {
  const CreateReturnScreen({super.key});

  @override
  State<CreateReturnScreen> createState() => _CreateReturnScreenState();
}

class _CreateReturnScreenState extends State<CreateReturnScreen> {
  final _reasonCtrl = TextEditingController();
  final _descCtrl = TextEditingController();
  List<dynamic> _orders = [];
  final List<XFile> _images = [];
  bool _submitting = false;
  String? _selectedOrderId;
  String? _selectedItemId;
  String _selectedReason = 'Damaged or defective item';
  String? _error;

  final List<Map<String, dynamic>> _reasons = [
    {'label': 'Damaged or defective item', 'icon': Icons.error_outline},
    {'label': 'Wrong item received', 'icon': Icons.swap_horiz},
    {'label': 'Item not as described', 'icon': Icons.description_outlined},
    {'label': 'Size or fit issue', 'icon': Icons.straighten},
    {'label': 'Quality not satisfactory', 'icon': Icons.thumb_down_alt_outlined},
    {'label': 'Missing parts or accessories', 'icon': Icons.extension_outlined},
    {'label': 'Delivery delay', 'icon': Icons.schedule},
    {'label': 'Changed my mind', 'icon': Icons.replay},
    {'label': 'Duplicate order', 'icon': Icons.content_copy},
    {'label': 'Other', 'icon': Icons.more_horiz},
  ];

  @override
  void initState() {
    super.initState();
    _loadDeliveredOrders();
  }

  @override
  void dispose() {
    _reasonCtrl.dispose();
    _descCtrl.dispose();
    super.dispose();
  }

  Future<void> _loadDeliveredOrders() async {
    try {
      final resp = await ApiService.get(ApiConfig.orders, queryParams: {'status': 'delivered'});
      final data = resp['data'] as Map<String, dynamic>?;
      final orders = data?['orders'] as List? ?? data?['data'] as List? ?? [];
      if (mounted) setState(() { _orders = orders; });
    } catch (_) {
    }
  }

  Future<void> _pickImage() async {
    final picker = ImagePicker();
    final file = await picker.pickImage(source: ImageSource.gallery, maxWidth: 1024, maxHeight: 1024);
    if (file != null) setState(() => _images.add(file));
  }

  void _removeImage(int index) => setState(() => _images.removeAt(index));

  Future<String?> _uploadImageReturnUrl(XFile file) async {
    try {
      final bytes = await file.readAsBytes();
      final base64 = base64Encode(bytes);
      final mimeType = file.name.endsWith('.png') ? 'image/png' : file.name.endsWith('.webp') ? 'image/webp' : 'image/jpeg';
      final dataUri = 'data:$mimeType;base64,$base64';
      final resp = await ApiService.post('/api/storage/product-image', body: {'imageData': dataUri});
      final serverData = resp['data'] as Map<String, dynamic>?;
      return serverData?['data']?['imageUrl'] ?? serverData?['imageUrl'];
    } catch (_) { return null; }
  }

  Future<void> _submit() async {
    if (_selectedOrderId == null) { setState(() => _error = 'Please select an order'); return; }
    if (_reasonCtrl.text.trim().isEmpty) { setState(() => _error = 'Please describe the issue'); return; }

    setState(() { _submitting = true; _error = null; });

    List<String> imageUrls = [];
    for (final img in _images) {
      final url = await _uploadImageReturnUrl(img);
      if (url != null) imageUrls.add(url);
    }

    try {
      final resp = await ApiService.post(ApiConfig.returns, body: {
        'orderId': _selectedOrderId,
        if (_selectedItemId != null) 'orderItemId': _selectedItemId,
        'reason': _selectedReason,
        'description': _reasonCtrl.text.trim(),
        if (imageUrls.isNotEmpty) 'images': imageUrls,
      });

      final data = resp['data'] as Map<String, dynamic>?;
      if (data?['success'] == true) {
        if (!mounted) return;
        showDialog(
          context: context,
          builder: (ctx) => AlertDialog(
            title: Row(
              children: [
                const Icon(Icons.verified, color: AppTheme.primary, size: 24),
                const SizedBox(width: 8),
                Text('Request Submitted', style: GoogleFonts.poppins(fontWeight: FontWeight.w700, fontSize: 18)),
              ],
            ),
            content: Text(
              'Your refund request has been submitted. Refund processing will take up to 15 minutes to complete. Funds will be returned to the original Stripe payment card.',
              style: GoogleFonts.poppins(fontSize: 14, color: AppTheme.textSecondary),
            ),
            actions: [
              ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppTheme.primary,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
                onPressed: () {
                  Navigator.pop(ctx);
                },
                child: Text('OK', style: GoogleFonts.poppins(fontWeight: FontWeight.w600)),
              ),
            ],
          ),
        );
        if (!mounted) return;
        Navigator.pop(context, true);
      } else {
        setState(() => _error = data?['error'] ?? resp['message'] ?? 'Failed to submit');
      }
    } catch (e) {
      setState(() => _error = 'Error: $e');
    } finally {
      setState(() => _submitting = false);
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
        title: Text('Create Return', style: GoogleFonts.poppins(fontSize: 18, fontWeight: FontWeight.w700)),
        centerTitle: true,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Order Selection
            Text('Select Order', style: GoogleFonts.poppins(fontSize: 14, fontWeight: FontWeight.w600)),
            const SizedBox(height: 8),
            _orders.isEmpty
                    ? Container(
                        padding: const EdgeInsets.all(20),
                        decoration: BoxDecoration(
                          color: AppTheme.primaryExtraLight,
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Row(
                          children: [
                            const Icon(Icons.info_outline, color: AppTheme.primary),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Text('No delivered orders available for return. Only delivered orders can be returned.',
                                  style: GoogleFonts.poppins(fontSize: 13, color: AppTheme.primaryDark)),
                            ),
                          ],
                        ),
                      )
                    : Container(
                        decoration: BoxDecoration(
                          border: Border.all(color: AppTheme.divider),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Column(
                          children: _orders.map((o) {
                            final orderId = o['id'] ?? '';
                            final orderNum = o['order_number'] ?? '';
                            final displayId = orderNum.toString().isNotEmpty ? '#$orderNum' : '#${orderId.toString().slice(-8)}';
                            final isSelected = _selectedOrderId == orderId;
                            return InkWell(
                              onTap: () => setState(() => _selectedOrderId = orderId.toString()),
                              child: Container(
                                padding: const EdgeInsets.all(14),
                                decoration: BoxDecoration(
                                  color: isSelected ? AppTheme.primaryExtraLight : Colors.transparent,
                                  border: Border(bottom: BorderSide(color: AppTheme.divider, width: o != _orders.last ? 0.5 : 0)),
                                ),
                                child: Row(
                                  children: [
                                    Container(
                                      width: 22, height: 22,
                                      decoration: BoxDecoration(
                                        shape: BoxShape.circle,
                                        border: Border.all(color: isSelected ? AppTheme.primary : AppTheme.textLight, width: 2),
                                        color: isSelected ? AppTheme.primary : Colors.transparent,
                                      ),
                                      child: isSelected ? const Icon(Icons.check, size: 14, color: Colors.white) : null,
                                    ),
                                    const SizedBox(width: 12),
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Text(displayId, style: GoogleFonts.poppins(fontWeight: FontWeight.w600, fontSize: 14)),
                                          Text(formatPrice(o['total_amount'] ?? 0), style: GoogleFonts.poppins(fontSize: 12, color: AppTheme.textSecondary)),
                                        ],
                                      ),
                                    ),
                                    Text(_formatDate(o['created_at']), style: GoogleFonts.poppins(fontSize: 11, color: AppTheme.textLight)),
                                  ],
                                ),
                              ),
                            );
                          }).toList(),
                        ),
                      ),
            const SizedBox(height: 24),

            // Reason Dropdown
            Text('Return Reason', style: GoogleFonts.poppins(fontSize: 14, fontWeight: FontWeight.w600)),
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 14),
              decoration: BoxDecoration(
                border: Border.all(color: AppTheme.divider),
                borderRadius: BorderRadius.circular(12),
              ),
              child: DropdownButtonHideUnderline(
                child: DropdownButton<String>(
                  value: _selectedReason,
                  isExpanded: true,
                  style: GoogleFonts.poppins(fontSize: 14, color: AppTheme.textPrimary),
                  items: _reasons.map((r) => DropdownMenuItem(
                    value: r['label'] as String,
                    child: Row(
                      children: [
                        Icon(r['icon'] as IconData, size: 18, color: AppTheme.primary),
                        const SizedBox(width: 10),
                        Text(r['label'] as String),
                      ],
                    ),
                  )).toList(),
                  onChanged: (v) => setState(() => _selectedReason = v!),
                ),
              ),
            ),
            const SizedBox(height: 20),

            // Description
            Text('Describe the Issue', style: GoogleFonts.poppins(fontSize: 14, fontWeight: FontWeight.w600)),
            const SizedBox(height: 8),
            TextField(
              controller: _reasonCtrl,
              maxLines: 4,
              maxLength: 500,
              decoration: InputDecoration(
                hintText: 'Tell us more about the issue...',
                hintStyle: GoogleFonts.poppins(color: AppTheme.textLight),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppTheme.primary)),
              ),
            ),
            const SizedBox(height: 20),

            // Image Upload
            Text('Upload Images (optional)', style: GoogleFonts.poppins(fontSize: 14, fontWeight: FontWeight.w600)),
            const SizedBox(height: 8),
            Row(
              children: [
                ..._images.asMap().entries.map((entry) {
                  final idx = entry.key;
                  final img = entry.value;
                  return Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: Stack(
                      children: [
                        Container(
                          width: 72, height: 72,
                          decoration: BoxDecoration(
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: AppTheme.divider),
                            image: DecorationImage(image: FileImage(File(img.path)), fit: BoxFit.cover),
                          ),
                        ),
                        Positioned(
                          top: -4, right: -4,
                          child: GestureDetector(
                            onTap: () => _removeImage(idx),
                            child: Container(
                              padding: const EdgeInsets.all(2),
                              decoration: const BoxDecoration(shape: BoxShape.circle, color: AppTheme.error),
                              child: const Icon(Icons.close, size: 14, color: Colors.white),
                            ),
                          ),
                        ),
                      ],
                    ),
                  );
                }),
                if (_images.length < 5)
                  GestureDetector(
                    onTap: _pickImage,
                    child: Container(
                      width: 72, height: 72,
                      decoration: BoxDecoration(
                        color: AppTheme.background,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: AppTheme.divider, style: BorderStyle.solid),
                      ),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const Icon(Icons.add_photo_alternate_outlined, color: AppTheme.textLight, size: 24),
                          Text('Add', style: GoogleFonts.poppins(fontSize: 10, color: AppTheme.textLight)),
                        ],
                      ),
                    ),
                  ),
              ],
            ),
            if (_images.isNotEmpty)
              Padding(
                padding: const EdgeInsets.only(top: 4),
                child: Text('${_images.length} image(s) selected. Max 5.', style: GoogleFonts.poppins(fontSize: 11, color: AppTheme.textLight)),
              ),
            const SizedBox(height: 24),

            // Error
            if (_error != null)
              Container(
                padding: const EdgeInsets.all(12),
                margin: const EdgeInsets.only(bottom: 16),
                decoration: BoxDecoration(
                  color: AppTheme.saleLight,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.error_outline, color: AppTheme.error, size: 20),
                    const SizedBox(width: 8),
                    Expanded(child: Text(_error!, style: GoogleFonts.poppins(fontSize: 13, color: AppTheme.error))),
                  ],
                ),
              ),

            // Info note
            Container(
              padding: const EdgeInsets.all(12),
              margin: const EdgeInsets.only(bottom: 16),
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
                      'Refund processing will take up to 15 minutes to complete. Funds will be returned to the original Stripe payment card.',
                      style: GoogleFonts.poppins(fontSize: 12, color: AppTheme.primaryDark),
                    ),
                  ),
                ],
              ),
            ),

            // Submit
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: _submitting ? null : _submit,
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppTheme.primary,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                  disabledBackgroundColor: AppTheme.primary.withValues(alpha: 0.5),
                ),
                child: Text('Submit Return Request', style: GoogleFonts.poppins(fontSize: 16, fontWeight: FontWeight.w600, color: Colors.white)),
              ),
            ),
            const SizedBox(height: 20),
          ],
        ),
      ),
    );
  }

  String _formatDate(dynamic d) {
    if (d == null) return '';
    try {
      final dt = DateTime.parse(d.toString());
      return '${dt.month}/${dt.day}/${dt.year}';
    } catch (_) { return ''; }
  }
}

extension _StringSliceExt on String {
  String slice(int end) {
    if (length <= end) return this;
    return substring(length - end);
  }
}
