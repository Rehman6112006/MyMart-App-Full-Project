import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../config/theme.dart';
import '../../services/location_service.dart';
import '../../widgets/shimmer_loaders.dart';

class MapPickerScreen extends StatefulWidget {
  final double? initialLatitude;
  final double? initialLongitude;
  final String? initialAddress;

  const MapPickerScreen({super.key, this.initialLatitude, this.initialLongitude, this.initialAddress});

  @override
  State<MapPickerScreen> createState() => _MapPickerScreenState();
}

class _MapPickerScreenState extends State<MapPickerScreen> {
  late final MapController _mapController;
  LatLng _center;
  LatLng _pinPosition;
  String _address = '';
  bool _loadingAddress = false;
  bool _mapReady = false;

  _MapPickerScreenState() : _mapController = MapController(), _center = const LatLng(24.8607, 67.0011), _pinPosition = const LatLng(24.8607, 67.0011);

  @override
  void initState() {
    super.initState();
    if (widget.initialLatitude != null && widget.initialLongitude != null) {
      _center = LatLng(widget.initialLatitude!, widget.initialLongitude!);
      _pinPosition = _center;
      _address = widget.initialAddress ?? '';
    } else if (LocationService.lastKnownLatitude != null && LocationService.lastKnownLongitude != null) {
      _center = LatLng(LocationService.lastKnownLatitude!, LocationService.lastKnownLongitude!);
      _pinPosition = _center;
    }
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _mapController.move(_center, 14);
      setState(() => _mapReady = true);
    });
    _fetchAddress();
  }

  Future<void> _fetchAddress() async {
    setState(() => _loadingAddress = true);
    final address = await LocationService.reverseGeocode(_pinPosition.latitude, _pinPosition.longitude);
    if (mounted) setState(() { _address = address; _loadingAddress = false; });
  }

  void _onMapTapped(TapPosition tapPosition, LatLng point) {
    setState(() => _pinPosition = point);
    _fetchAddress();
  }

  Future<void> _goToCurrentLocation() async {
    final result = await LocationService.getCurrentLocation(forceGps: true);
    if (result['success'] == true) {
      final pos = LatLng(result['latitude'], result['longitude']);
      setState(() { _center = pos; _pinPosition = pos; });
      _mapController.move(pos, 16);
      _fetchAddress();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        backgroundColor: AppTheme.surface,
        elevation: 0,
        leading: IconButton(icon: Container(padding: const EdgeInsets.all(8), decoration: BoxDecoration(color: AppTheme.background, shape: BoxShape.circle), child: const Icon(Icons.arrow_back_ios_new, size: 18, color: AppTheme.textPrimary)), onPressed: () => Navigator.pop(context)),
        title: Text('Select Location', style: GoogleFonts.poppins(color: AppTheme.textPrimary, fontSize: 18, fontWeight: FontWeight.w700)),
        centerTitle: true,
      ),
      body: Column(
        children: [
          Expanded(
            child: Stack(
              children: [
                FlutterMap(
                  mapController: _mapController,
                  options: MapOptions(
                    initialCenter: _center,
                    initialZoom: 14,
                    minZoom: 3,
                    maxZoom: 18,
                    onTap: _onMapTapped,
                    onMapReady: () {
                      if (mounted) setState(() => _mapReady = true);
                    },
                  ),
                  children: [
                    TileLayer(
                      urlTemplate: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
                      userAgentPackageName: 'com.mymart.app',
                    ),
                    MarkerLayer(
                      markers: [
                        Marker(
                          point: _pinPosition,
                          width: 40,
                          height: 40,
                          child: const Icon(Icons.location_on, color: Color(0xFFE53935), size: 40),
                        ),
                      ],
                    ),
                  ],
                ),
                if (!_mapReady)
                  Positioned.fill(
                    child: Container(
                      color: AppTheme.background,
                      child: Center(
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(Icons.map_outlined, size: 48, color: AppTheme.textLight),
                            const SizedBox(height: 12),
                            Text('Loading map...', style: GoogleFonts.poppins(fontSize: 14, color: AppTheme.textSecondary)),
                          ],
                        ),
                      ),
                    ),
                  ),
                Positioned(
                  top: 16, left: 16, right: 16,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                    decoration: BoxDecoration(color: AppTheme.surface, borderRadius: BorderRadius.circular(12), boxShadow: [BoxShadow(color: Colors.black12, blurRadius: 10, offset: const Offset(0, 2))]),
                    child: Row(children: [
                      Expanded(child: Text(_loadingAddress ? 'Getting address...' : (_address.isNotEmpty ? _address : 'Tap on map to select'), style: GoogleFonts.poppins(fontSize: 13, color: AppTheme.textPrimary), maxLines: 2, overflow: TextOverflow.ellipsis)),
                      const SizedBox(width: 8),
                      if (_loadingAddress) const ShimmerWidget(width: 16, height: 16, borderRadius: 8)
                      else const SizedBox.shrink()
                    ]),
                  ),
                ),
                Positioned(
                  right: 16, bottom: 120,
                  child: FloatingActionButton.small(
                    heroTag: 'locate',
                    backgroundColor: AppTheme.surface,
                    onPressed: _goToCurrentLocation,
                    child: const Icon(Icons.my_location, color: AppTheme.primary),
                  ),
                ),
                Positioned(
                  left: 16, right: 16, bottom: 24,
                  child: SizedBox(
                    width: double.infinity, height: 52,
                    child: ElevatedButton(
                      style: ElevatedButton.styleFrom(backgroundColor: AppTheme.primary, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(26)), elevation: 3),
                      onPressed: _address.isEmpty ? null : () => Navigator.pop(context, {'latitude': _pinPosition.latitude, 'longitude': _pinPosition.longitude, 'address': _address}),
                      child: Text('Confirm Location', style: GoogleFonts.poppins(fontWeight: FontWeight.w600, color: Colors.white, fontSize: 15)),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
