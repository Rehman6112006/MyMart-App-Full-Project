import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:geolocator/geolocator.dart';
import 'package:shared_preferences/shared_preferences.dart';

class LocationService {
  static String? _lastAddress;
  static double? _lastLatitude;
  static double? _lastLongitude;

  static String? get lastKnownAddress => _lastAddress;
  static double? get lastKnownLatitude => _lastLatitude;
  static double? get lastKnownLongitude => _lastLongitude;

  static Future<Map<String, dynamic>> getCurrentLocation({bool forceGps = false}) async {
    final gpsResult = await _getGpsLocation();
    if (gpsResult['success'] == true) {
      _cacheLocation(gpsResult['latitude'], gpsResult['longitude'], gpsResult['address']);
      return gpsResult;
    }

    if (forceGps) return gpsResult;

    final ipResult = await _getIpLocation();
    if (ipResult['success'] == true) {
      _cacheLocation(ipResult['latitude'], ipResult['longitude'], ipResult['address']);
      return ipResult;
    }

    return _getCachedLocation();
  }

  static Future<Map<String, dynamic>> _getGpsLocation() async {
    try {
      bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
      if (!serviceEnabled) {
        return {'success': false, 'error': 'Location services disabled'};
      }

      LocationPermission permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
        if (permission == LocationPermission.denied) {
          return {'success': false, 'error': 'Location permission denied'};
        }
      }
      if (permission == LocationPermission.deniedForever) {
        return {'success': false, 'error': 'Location permission permanently denied'};
      }

      final pos = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(accuracy: LocationAccuracy.high, timeLimit: Duration(seconds: 15)),
      );

      final address = await reverseGeocode(pos.latitude, pos.longitude);
      return {
        'success': true,
        'latitude': pos.latitude,
        'longitude': pos.longitude,
        'address': address,
        'source': 'gps',
      };
    } catch (e) {
      return {'success': false, 'error': e.toString()};
    }
  }

  static Future<String> reverseGeocode(double lat, double lng) async {
    // Try BigDataCloud first (free, no API key, works when OSM is blocked)
    final result = await _reverseGeocodeBigDataCloud(lat, lng);
    if (result != null) return result;

    // Fallback: OpenStreetMap Nominatim
    final osmResult = await _reverseGeocodeNominatim(lat, lng);
    if (osmResult != null) return osmResult;

    return '$lat, $lng';
  }

  static Future<String?> _reverseGeocodeNominatim(double lat, double lng) async {
    try {
      final url = 'https://nominatim.openstreetmap.org/reverse?format=json&lat=$lat&lon=$lng&addressdetails=1';
      final response = await http.get(Uri.parse(url), headers: {'User-Agent': 'MyMartApp/1.0'}).timeout(const Duration(seconds: 8));
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        final addr = data['address'];
        if (addr != null) {
          final parts = <String>[];
          if (addr['road'] != null) parts.add(addr['road']);
          if (addr['suburb'] != null) parts.add(addr['suburb']);
          if (addr['city'] != null) parts.add(addr['city']);
          if (addr['state'] != null) parts.add(addr['state']);
          return parts.isNotEmpty ? parts.join(', ') : data['display_name'] ?? 'Unknown location';
        }
        return data['display_name'] ?? 'Unknown location';
      }
    } catch (_) {}
    return null;
  }

  static Future<String?> _reverseGeocodeBigDataCloud(double lat, double lng) async {
    try {
      final url = 'https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=$lat&longitude=$lng&localityLanguage=en';
      final response = await http.get(Uri.parse(url)).timeout(const Duration(seconds: 8));
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        final parts = <String>[];
        if (data['street'] != null) parts.add(data['street']);
        if (data['locality'] != null) parts.add(data['locality']);
        if (data['city'] != null) parts.add(data['city']);
        if (data['principalSubdivision'] != null) parts.add(data['principalSubdivision']);
        if (data['countryName'] != null) parts.add(data['countryName']);
        return parts.isNotEmpty ? parts.join(', ') : null;
      }
    } catch (_) {}
    return null;
  }

  static Future<Map<String, dynamic>> searchAddress(String query) async {
    // Try BigDataCloud first (free, works when OSM is blocked)
    final bdcResult = await _searchBigDataCloud(query);
    if (bdcResult['success'] == true && (bdcResult['results'] as List).isNotEmpty) {
      return bdcResult;
    }

    // Fallback: OpenStreetMap Nominatim
    final osmResult = await _searchNominatim(query);
    if (osmResult['success'] == true && (osmResult['results'] as List).isNotEmpty) {
      return osmResult;
    }

    return {'success': false, 'results': []};
  }

  static Future<Map<String, dynamic>> _searchNominatim(String query) async {
    try {
      final url = 'https://nominatim.openstreetmap.org/search?format=json&q=${Uri.encodeComponent(query)}&limit=5&addressdetails=1';
      final response = await http.get(Uri.parse(url), headers: {'User-Agent': 'MyMartApp/1.0'}).timeout(const Duration(seconds: 8));
      if (response.statusCode == 200) {
        final List data = jsonDecode(response.body);
        return {
          'success': true,
          'results': data.map((item) => {
            'display_name': item['display_name'] ?? '',
            'lat': double.tryParse(item['lat']?.toString() ?? '') ?? 0,
            'lon': double.tryParse(item['lon']?.toString() ?? '') ?? 0,
          }).toList(),
        };
      }
    } catch (_) {}
    return {'success': false, 'results': []};
  }

  static Future<Map<String, dynamic>> _searchBigDataCloud(String query) async {
    try {
      final url = 'https://api.bigdatacloud.net/data/geocode?address=${Uri.encodeComponent(query)}&limit=5';
      final response = await http.get(Uri.parse(url)).timeout(const Duration(seconds: 8));
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        final List locations = data['locations'] ?? [];
        return {
          'success': true,
          'results': locations.map((item) => {
            'display_name': item['locality'] ?? item['city'] ?? item['label'] ?? '',
            'lat': (item['latitude'] as num?)?.toDouble() ?? 0,
            'lon': (item['longitude'] as num?)?.toDouble() ?? 0,
          }).toList(),
        };
      }
    } catch (_) {}
    return {'success': false, 'results': []};
  }

  static Future<Map<String, dynamic>> _getIpLocation() async {
    try {
      final response = await http.get(
        Uri.parse('http://ip-api.com/json/?fields=status,country,regionName,city,lat,lon,query'),
      ).timeout(const Duration(seconds: 10));

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data['status'] == 'success') {
          final lat = (data['lat'] as num).toDouble();
          final lon = (data['lon'] as num).toDouble();
          final city = data['city'] ?? '';
          final region = data['regionName'] ?? '';
          final country = data['country'] ?? '';

          final parts = <String>[];
          if (city.isNotEmpty) parts.add(city);
          if (region.isNotEmpty) parts.add(region);
          if (country.isNotEmpty) parts.add(country);

          return {
            'success': true,
            'latitude': lat,
            'longitude': lon,
            'address': parts.isNotEmpty ? parts.join(', ') : 'Unknown location',
            'source': 'ip',
          };
        }
      }
    } catch (_) {}
    return {'success': false, 'error': 'IP geolocation failed'};
  }

  static void _cacheLocation(double lat, double lng, String address) async {
    _lastLatitude = lat;
    _lastLongitude = lng;
    _lastAddress = address;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('last_location_address', address);
    await prefs.setDouble('last_location_lat', lat);
    await prefs.setDouble('last_location_lon', lng);
  }

  static Future<Map<String, dynamic>> _getCachedLocation() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final cachedAddress = prefs.getString('last_location_address');
      if (cachedAddress != null) {
        _lastAddress = cachedAddress;
        _lastLatitude = prefs.getDouble('last_location_lat');
        _lastLongitude = prefs.getDouble('last_location_lon');
        return {'success': true, 'latitude': _lastLatitude, 'longitude': _lastLongitude, 'address': _lastAddress, 'cached': true};
      }
    } catch (_) {}
    return {'success': false, 'error': 'Could not determine location'};
  }

  static Future<void> clearCache() async {
    _lastAddress = null;
    _lastLatitude = null;
    _lastLongitude = null;
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('last_location_address');
    await prefs.remove('last_location_lat');
    await prefs.remove('last_location_lon');
  }
}
