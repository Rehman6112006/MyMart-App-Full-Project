import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import 'package:permission_handler/permission_handler.dart' as ph;

class PermissionService {
  static Future<void> requestPermissions(BuildContext context) async {
    await _requestNotificationPermission(context);
    await _requestLocationPermission(context);
  }

  static Future<void> _requestNotificationPermission(BuildContext context) async {
    final status = await ph.Permission.notification.status;
    if (status.isGranted || status.isPermanentlyDenied) return;

    if (status.isDenied) {
      final result = await ph.Permission.notification.request();
      if (result.isPermanentlyDenied && context.mounted) {
        _showSettingsDialog(context, 'Notification',
            'Notifications help you stay updated on order status, deals, and offers. Please enable them in Settings.');
      }
    }
  }

  static Future<void> _requestLocationPermission(BuildContext context) async {
    final serviceEnabled = await Geolocator.isLocationServiceEnabled();
    final permission = await Geolocator.checkPermission();

    if (permission == LocationPermission.always ||
        permission == LocationPermission.whileInUse) {
      return;
    }
    if (permission == LocationPermission.deniedForever) {
      if (context.mounted) {
        _showSettingsDialog(context, 'Location',
            'Location access helps us find nearby stores and suggest accurate delivery addresses. Please enable it in Settings.');
      }
      return;
    }

    if (permission == LocationPermission.denied && context.mounted) {
      await Geolocator.requestPermission();
    }

    if (!serviceEnabled && context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please enable location services for a better experience'),
          duration: Duration(seconds: 3),
        ),
      );
    }
  }

  static void _showSettingsDialog(
      BuildContext context, String permissionName, String message) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Text('$permissionName Permission',
            style: const TextStyle(fontWeight: FontWeight.w600)),
        content: Text(message),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Not Now'),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(ctx);
              ph.openAppSettings();
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF22C55E),
              shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(8)),
            ),
            child: const Text('Open Settings',
                style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );
  }
}
