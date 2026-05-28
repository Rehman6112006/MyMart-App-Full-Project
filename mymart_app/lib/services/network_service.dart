import 'package:flutter/material.dart';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:provider/provider.dart';

enum NetworkStatus { online, offline, checking }

class NetworkService with ChangeNotifier {
  static final NetworkService _instance = NetworkService._internal();
  factory NetworkService() => _instance;
  NetworkService._internal();

  final Connectivity _connectivity = Connectivity();

  NetworkStatus _status = NetworkStatus.checking;
  bool _isOnline = true;
  bool _hasShownOfflineBanner = false;

  NetworkStatus get status => _status;
  bool get isOnline => _isOnline;
  bool get isOffline => !_isOnline;

  Future<void> initialize() async {
    _connectivity.onConnectivityChanged.listen(_updateConnectionStatus);
    await checkConnection();
  }

  Future<void> checkConnection() async {
    _status = NetworkStatus.checking;
    notifyListeners();

    try {
      final results = await _connectivity.checkConnectivity();
      _updateConnectionStatus(results);
    } catch (e) {
      _updateStatus(false);
    }
  }

  void _updateConnectionStatus(List<ConnectivityResult> results) {
    if (results.contains(ConnectivityResult.none)) {
      _updateStatus(false);
    } else {
      _updateStatus(true);
    }
  }

  void _updateStatus(bool isConnected) {
    _isOnline = isConnected;
    _status = isConnected ? NetworkStatus.online : NetworkStatus.offline;

    if (!isConnected && !_hasShownOfflineBanner) {
      _hasShownOfflineBanner = true;
    } else if (isConnected && _hasShownOfflineBanner) {
      _hasShownOfflineBanner = false;
    }

    notifyListeners();
  }

  void resetOfflineBanner() {
    _hasShownOfflineBanner = false;
  }
}

class NetworkSensitive extends StatelessWidget {
  final Widget child;
  final Widget? offlineBanner;
  final Widget? loadingWidget;

  const NetworkSensitive({
    super.key,
    required this.child,
    this.offlineBanner,
    this.loadingWidget,
  });

  @override
  Widget build(BuildContext context) {
    return Consumer<NetworkService>(
      builder: (context, network, child) {
        if (network.status == NetworkStatus.checking) {
          return loadingWidget ?? _buildDefaultLoader();
        }

        if (network.isOffline) {
          return offlineBanner ?? _buildDefaultOfflineBanner();
        }

        return child ?? const SizedBox.shrink();
      },
    );
  }

  Widget _buildDefaultLoader() {
    return const SizedBox.shrink();
  }

  Widget _buildDefaultOfflineBanner() {
    return Scaffold(
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Icons.wifi_off_rounded, size: 80, color: Colors.grey[400]),
              const SizedBox(height: 24),
              Text(
                'No Internet Connection',
                style: TextStyle(
                  fontSize: 22,
                  fontWeight: FontWeight.bold,
                  color: Colors.grey[700],
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 12),
              Text(
                'Please check your internet connection and try again',
                style: TextStyle(fontSize: 14, color: Colors.grey[500]),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 32),
              ElevatedButton.icon(
                onPressed: () {
                  NetworkService().checkConnection();
                },
                icon: const Icon(Icons.refresh),
                label: const Text('Retry'),
                style: ElevatedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 32,
                    vertical: 12,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class NetworkAwareWidget extends StatefulWidget {
  final Widget child;
  final bool showBanner;

  const NetworkAwareWidget({
    super.key,
    required this.child,
    this.showBanner = true,
  });

  @override
  State<NetworkAwareWidget> createState() => _NetworkAwareWidgetState();
}

class _NetworkAwareWidgetState extends State<NetworkAwareWidget> {
  @override
  void initState() {
    super.initState();
    NetworkService().initialize();
  }

  @override
  Widget build(BuildContext context) {
    if (!widget.showBanner) {
      return widget.child;
    }

    return Consumer<NetworkService>(
      builder: (context, network, child) {
        return Column(
          children: [
            if (network.isOffline)
              Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(
                  vertical: 8,
                  horizontal: 16,
                ),
                color: Colors.red[400],
                child: const SafeArea(
                  bottom: false,
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.wifi_off, color: Colors.white, size: 18),
                      SizedBox(width: 8),
                      Text(
                        'No internet connection',
                        style: TextStyle(color: Colors.white, fontSize: 13),
                      ),
                    ],
                  ),
                ),
              ),
            Expanded(child: widget.child),
          ],
        );
      },
    );
  }
}
