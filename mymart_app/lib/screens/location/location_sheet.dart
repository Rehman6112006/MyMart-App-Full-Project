import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../config/theme.dart';
import '../../services/location_service.dart';
import '../../providers/address_provider.dart';
import '../../providers/auth_provider.dart';
import '../../models/order.dart';
import 'map_picker_screen.dart';

class LocationSheet extends StatefulWidget {
  final String? currentAddress;
  final double? currentLatitude;
  final double? currentLongitude;
  final Function(String address, double lat, double lng) onLocationSelected;

  const LocationSheet({
    super.key,
    this.currentAddress,
    this.currentLatitude,
    this.currentLongitude,
    required this.onLocationSelected,
  });

  @override
  State<LocationSheet> createState() => _LocationSheetState();
}

class _LocationSheetState extends State<LocationSheet> {
  List<Map<String, dynamic>> _searchResults = [];
  final _searchController = TextEditingController();

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  void _searchPlaces(String query) async {
    if (query.length < 3) {
      setState(() { _searchResults = []; });
      return;
    }
    final result = await LocationService.searchAddress(query);
    if (mounted) setState(() { _searchResults = result['results'] as List<Map<String, dynamic>>? ?? []; });
  }

  void _selectLocation(String address, double lat, double lng) {
    Navigator.pop(context);
    widget.onLocationSelected(address, lat, lng);
  }

  Future<void> _useCurrentLocation() async {
    Navigator.pop(context);
    final result = await LocationService.getCurrentLocation(forceGps: true);
    if (result['success'] == true) {
      widget.onLocationSelected(result['address'], result['latitude'], result['longitude']);
    }
  }

  Future<void> _openMapPicker() async {
    final result = await Navigator.push<Map<String, dynamic>>(
      context,
      MaterialPageRoute(
        builder: (_) => MapPickerScreen(
          initialLatitude: widget.currentLatitude ?? LocationService.lastKnownLatitude,
          initialLongitude: widget.currentLongitude ?? LocationService.lastKnownLongitude,
          initialAddress: widget.currentAddress,
        ),
      ),
    );
    if (result != null && mounted) {
      Navigator.pop(context);
      widget.onLocationSelected(result['address'], result['latitude'], result['longitude']);
    }
  }

  @override
  Widget build(BuildContext context) {
    final authProvider = Provider.of<AuthProvider>(context, listen: false);
    final addressProvider = Provider.of<AddressProvider>(context, listen: false);
    final savedAddresses = authProvider.isLoggedIn ? addressProvider.addresses : <DeliveryAddress>[];

    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.only(top: 16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(width: 40, height: 4, decoration: BoxDecoration(color: AppTheme.divider, borderRadius: BorderRadius.circular(2))),
            const SizedBox(height: 16),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: Row(children: [
                const Icon(Icons.location_on, color: AppTheme.primary, size: 22),
                const SizedBox(width: 8),
                Text('Select Location', style: GoogleFonts.poppins(fontSize: 18, fontWeight: FontWeight.w700, color: AppTheme.textPrimary)),
              ]),
            ),
            const SizedBox(height: 12),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: TextField(
                controller: _searchController,
                onChanged: _searchPlaces,
                decoration: InputDecoration(
                  hintText: 'Search address...',
                  prefixIcon: const Icon(Icons.search, color: AppTheme.textLight),
                  suffixIcon: _searchController.text.isNotEmpty ? IconButton(icon: const Icon(Icons.clear, size: 18), onPressed: () { _searchController.clear(); setState(() => _searchResults = []); }) : null,
                  filled: true, fillColor: AppTheme.background,
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
                  contentPadding: const EdgeInsets.symmetric(vertical: 12),
                ),
              ),
            ),
            const SizedBox(height: 8),
            if (_searchResults.isNotEmpty)
              Flexible(
                child: ConstrainedBox(
                  constraints: const BoxConstraints(maxHeight: 200),
                  child: ListView.builder(
                    shrinkWrap: true,
                    itemCount: _searchResults.length,
                    itemBuilder: (ctx, i) {
                      final item = _searchResults[i];
                      return ListTile(
                        dense: true,
                        leading: const Icon(Icons.location_on_outlined, color: AppTheme.primary, size: 20),
                        title: Text(item['display_name'] ?? '', style: GoogleFonts.poppins(fontSize: 13), maxLines: 2, overflow: TextOverflow.ellipsis),
                        onTap: () => _selectLocation(item['display_name'], (item['lat'] as num).toDouble(), (item['lon'] as num).toDouble()),
                      );
                    },
                  ),
                ),
              ),
            if (_searchResults.isEmpty) ...[
              _buildOption(icon: Icons.my_location, title: 'Use Current Location', subtitle: 'GPS-based accurate location', onTap: _useCurrentLocation),
              _buildOption(icon: Icons.map_outlined, title: 'Pick on Map', subtitle: 'Drag pin to select exact location', onTap: _openMapPicker),
              if (savedAddresses.isNotEmpty) ...[
                Padding(
                  padding: const EdgeInsets.fromLTRB(20, 8, 20, 4),
                  child: Row(children: [Icon(Icons.bookmark_outline, color: AppTheme.textSecondary, size: 16), const SizedBox(width: 6), Text('Saved Addresses', style: GoogleFonts.poppins(fontSize: 12, color: AppTheme.textSecondary, fontWeight: FontWeight.w600))]),
                ),
                ...savedAddresses.map((addr) => _buildAddressTile(addr)),
              ],
            ],
            const SizedBox(height: 12),
          ],
        ),
      ),
    );
  }

  Widget _buildOption({required IconData icon, required String title, required String subtitle, required VoidCallback onTap}) {
    return ListTile(
      leading: Container(padding: const EdgeInsets.all(8), decoration: BoxDecoration(color: AppTheme.primaryExtraLight, shape: BoxShape.circle), child: Icon(icon, color: AppTheme.primary, size: 22)),
      title: Text(title, style: GoogleFonts.poppins(fontWeight: FontWeight.w600, fontSize: 14)),
      subtitle: Text(subtitle, style: GoogleFonts.poppins(fontSize: 11, color: AppTheme.textSecondary)),
      onTap: onTap,
    );
  }

  Widget _buildAddressTile(DeliveryAddress addr) {
    return ListTile(
      dense: true,
      leading: Icon(Icons.home_outlined, color: AppTheme.primary, size: 20),
      title: Text(addr.name, style: GoogleFonts.poppins(fontWeight: FontWeight.w600, fontSize: 13)),
      subtitle: Text(addr.fullAddress, style: GoogleFonts.poppins(fontSize: 11, color: AppTheme.textSecondary), maxLines: 1, overflow: TextOverflow.ellipsis),
      onTap: () {
        Navigator.pop(context);
        widget.onLocationSelected(addr.fullAddress, 0, 0);
      },
    );
  }
}
