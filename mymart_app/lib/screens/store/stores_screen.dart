import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../config/theme.dart';
import '../../models/store.dart';
import '../../services/store_service.dart';
import '../../widgets/store_card.dart';
import 'store_detail_screen.dart';
import '../../localization/app_localizations.dart';

class StoresScreen extends StatefulWidget {
  const StoresScreen({super.key});

  @override
  State<StoresScreen> createState() => _StoresScreenState();
}

class _StoresScreenState extends State<StoresScreen> {
  List<Store> _stores = [];
  String? _error;
  bool _isGridView = true;

  @override
  void initState() {
    super.initState();
    _loadStores();
  }

  Future<void> _loadStores() async {
    setState(() {
      _error = null;
    });

    try {
      final stores = await StoreService.getActiveStores();
      if (mounted) {
        setState(() {
          _stores = stores.where((s) => s.isVerified == true).toList();
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = 'Failed to load stores';
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final t = AppLocalizations.of(context).translate;
    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        backgroundColor: AppTheme.surface,
        elevation: 0,
        title: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: AppTheme.primary.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(10),
              ),
              child: const Icon(
                Icons.store,
                color: AppTheme.primary,
                size: 20,
              ),
            ),
            const SizedBox(width: 12),
            Text(
              t('all_stores'),
              style: GoogleFonts.poppins(
                fontWeight: FontWeight.w700,
                fontSize: 20,
                color: AppTheme.textPrimary,
              ),
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: Icon(
              _isGridView ? Icons.view_list_rounded : Icons.grid_view_rounded,
              color: AppTheme.primary,
            ),
            onPressed: () {
              setState(() {
                _isGridView = !_isGridView;
              });
            },
          ),
          const SizedBox(width: 8),
        ],
      ),
      body: _error != null
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(Icons.error_outline, size: 48, color: AppTheme.textSecondary),
                      const SizedBox(height: 16),
                      Text(_error!, style: const TextStyle(color: AppTheme.textSecondary)),
                      const SizedBox(height: 16),
                      ElevatedButton(
                        onPressed: _loadStores,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppTheme.primary,
                          foregroundColor: Colors.white,
                        ),
                        child: Text(t('retry')),
                      ),
                    ],
                  ),
                )
              : _stores.isEmpty
                  ? Center(
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
                              Icons.store_outlined,
                              size: 64,
                              color: AppTheme.primary,
                            ),
                          ),
                          const SizedBox(height: 24),
                          Text(
                            t('no_stores'),
                            style: GoogleFonts.poppins(
                              fontSize: 18,
                              fontWeight: FontWeight.w600,
                              color: AppTheme.textPrimary,
                            ),
                          ),
                          const SizedBox(height: 8),
                          Text(
                            t('no_stores_desc'),
                            style: GoogleFonts.poppins(
                              fontSize: 14,
                              color: AppTheme.textSecondary,
                            ),
                          ),
                        ],
                      ),
                    )
                  : RefreshIndicator(
                      onRefresh: _loadStores,
                      color: AppTheme.primary,
                      child: Column(
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                            child: Row(
                              children: [
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                                  decoration: BoxDecoration(
                                    color: AppTheme.primary.withValues(alpha: 0.1),
                                    borderRadius: BorderRadius.circular(20),
                                  ),
                                  child: Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      const Icon(
                                        Icons.shopping_bag,
                                        size: 16,
                                        color: AppTheme.primary,
                                      ),
                                      const SizedBox(width: 6),
                                      Text(
                                        '${_stores.length} ${t('stores')}',
                                        style: GoogleFonts.poppins(
                                          fontSize: 14,
                                          fontWeight: FontWeight.w600,
                                          color: AppTheme.primary,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                          ),
                          Expanded(
                            child: _isGridView
                                ? GridView.builder(
                                    padding: const EdgeInsets.all(16),
                                    gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                                      crossAxisCount: 2,
                                      mainAxisSpacing: 16,
                                      crossAxisSpacing: 16,
                                      childAspectRatio: 0.85,
                                    ),
                                    itemCount: _stores.length,
                                    itemBuilder: (context, index) {
                                      final store = _stores[index];
                                      return StoreGridCard(
                                        store: store,
                                        index: index,
                                        onTap: () {
                                          Navigator.push(
                                            context,
                                            MaterialPageRoute(
                                              builder: (_) => StoreDetailScreen(store: store),
                                            ),
                                          );
                                        },
                                      );
                                    },
                                  )
                                : ListView.builder(
                                    padding: const EdgeInsets.symmetric(horizontal: 16),
                                    itemCount: _stores.length,
                                    itemBuilder: (context, index) {
                                      final store = _stores[index];
                                      return StoreListItem(
                                        store: store,
                                        index: index,
                                        onTap: () {
                                          Navigator.push(
                                            context,
                                            MaterialPageRoute(
                                              builder: (_) => StoreDetailScreen(store: store),
                                            ),
                                          );
                                        },
                                      );
                                    },
                                  ),
                          ),
                        ],
                      ),
                    ),
    );
  }
}
