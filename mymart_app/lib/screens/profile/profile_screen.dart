import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:image_picker/image_picker.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../config/theme.dart';
import '../../config/api_config.dart';
import '../../localization/app_localizations.dart';
import '../../models/user.dart';
import '../../models/order.dart';
import '../../providers/auth_provider.dart';
import '../../providers/address_provider.dart';
import '../../providers/notification_provider.dart';
import '../../providers/theme_provider.dart';
import '../../providers/language_provider.dart';
import '../../services/auth_service.dart';
import '../../services/stripe_service.dart';
import '../../services/saved_card_service.dart';
import '../../services/coupon_service.dart';
import '../../services/api_service.dart';
import '../../widgets/shimmer_loaders.dart';
import '../auth/login_screen.dart';
import '../order/order_list_screen.dart';
import '../order/returns_screen.dart';
import '../vendor/vendor_dashboard_screen.dart';
import '../admin/admin_dashboard_screen.dart';
import '../wishlist/wishlist_screen.dart';


class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  String? _avatarBase64;
  int _unreadCount = 0;

  @override
  void initState() {
    super.initState();
    _loadAvatar();
    _fetchUnreadCount();
  }

  Future<void> _fetchUnreadCount() async {
    try {
      final response = await ApiService.get('${ApiConfig.notifications}?unread_only=true');
      if (response['success'] && mounted) {
        final data = response['data'] as Map?;
        if (data != null) {
          setState(() => _unreadCount = data['unread_count'] ?? 0);
        }
      }
    } catch (_) {}
  }

  Future<void> _openNotifications() async {
    try {
      final response = await ApiService.get(ApiConfig.notifications);
      if (response['success']) {
        final data = response['data'] as Map?;
        final List<dynamic> notifications = (data?['notifications'] as List<dynamic>?) ?? [];
        if (!mounted) return;
        await _showNotificationList(context, notifications);
        _fetchUnreadCount();
      }
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Failed to load notifications')),
        );
      }
    }
  }

  Future<void> _showNotificationList(BuildContext context, List<dynamic> notifications) async {
    final result = await showModalBottomSheet<Map<String, dynamic>>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _NotificationSheet(notifications: notifications),
    );
    if (result != null) {
      setState(() => _unreadCount = 0);
    }
  }

  Future<void> _loadAvatar() async {
    final prefs = await SharedPreferences.getInstance();
    final saved = prefs.getString('profile_avatar');
    if (mounted) {
      setState(() {
        _avatarBase64 = saved;
      });
    }
  }

  Future<void> _saveAvatar(String base64) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('profile_avatar', base64);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF5F7FA),
      body: Consumer<AuthProvider>(
        builder: (context, auth, _) {
          final user = auth.user;
          if (user == null) {
            return _buildGuestView(context);
          }
          return CustomScrollView(
            slivers: [
              SliverAppBar(
                pinned: true,
                expandedHeight: 0,
                floating: true,
                backgroundColor: const Color(0xFFF5F7FA),
                elevation: 0,
                title: Text(
                  'My Profile',
                  style: GoogleFonts.poppins(
                    fontSize: 20,
                    fontWeight: FontWeight.w700,
                    color: AppTheme.textPrimary,
                  ),
                ),
                actions: [
                  Stack(
                    children: [
                      IconButton(
                        icon: const Icon(Icons.notifications_outlined, color: AppTheme.textPrimary),
                        onPressed: () => _openNotifications(),
                      ),
                      if (_unreadCount > 0)
                        Positioned(
                          right: 6,
                          top: 6,
                          child: Container(
                            padding: const EdgeInsets.all(4),
                            decoration: const BoxDecoration(
                              color: Colors.red,
                              shape: BoxShape.circle,
                            ),
                            constraints: const BoxConstraints(minWidth: 16, minHeight: 16),
                            child: Text(
                              '$_unreadCount',
                              style: const TextStyle(color: Colors.white, fontSize: 9, fontWeight: FontWeight.bold),
                              textAlign: TextAlign.center,
                            ),
                          ),
                        ),
                    ],
                  ),
                ],
              ),
              SliverToBoxAdapter(
                child: SingleChildScrollView(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  child: Consumer<LanguageProvider>(
                    builder: (context, langProvider, _) {
                      return Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          _buildProfileHeaderCard(user),
                          const SizedBox(height: 24),
                          _buildMyOrdersSection(context),
                          const SizedBox(height: 24),
                          _buildAccountSettingsSection(context, auth),
                          const SizedBox(height: 24),
                          _buildSupportSection(context),
                          const SizedBox(height: 24),
                          _buildLogoutButton(context, auth),
                          const SizedBox(height: 120),
                        ],
                      );
                    },
                  ),
                ),
              ),
            ],
          );
        },
      ),
    );
  }

  Widget _buildProfileHeaderCard(User user) {
    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFF22C55E), Color(0xFF16A34A)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(24),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF22C55E).withValues(alpha: 0.3),
            blurRadius: 20,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Stack(
        children: [
          Positioned(
            top: -20, right: -20,
            child: Container(
              width: 120, height: 120,
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: 0.05),
                shape: BoxShape.circle,
              ),
            ),
          ),
          Positioned(
            bottom: -30, left: -30,
            child: Container(
              width: 100, height: 100,
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: 0.05),
                shape: BoxShape.circle,
              ),
            ),
          ),
          Positioned(
            top: 20, right: 40,
            child: Container(
              width: 60, height: 60,
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: 0.05),
                shape: BoxShape.circle,
              ),
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              children: [
                Row(
                  children: [
                    Stack(
                      children: [
                        Container(
                          width: 80,
                          height: 80,
                          decoration: BoxDecoration(
                            color: Colors.white.withValues(alpha: 0.2),
                            shape: BoxShape.circle,
                            border: Border.all(color: Colors.white.withValues(alpha: 0.3), width: 3),
                          ),
                          child: _avatarBase64 != null
                              ? ClipOval(
                                  child: Image.memory(
                                    base64Decode(_avatarBase64!),
                                    width: 80, height: 80,
                                    fit: BoxFit.cover,
                                    errorBuilder: (_, _, _) => _buildAvatarFallback(user),
                                  ),
                                )
                              : _buildAvatarFallback(user),
                        ),
                        Positioned(
                          bottom: 0, right: 0,
                          child: GestureDetector(
                            onTap: () => _pickAvatar(),
                            child: Container(
                              width: 28, height: 28,
                              decoration: BoxDecoration(
                                color: Colors.white,
                                shape: BoxShape.circle,
                                boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.1), blurRadius: 4)],
                              ),
                              child: const Icon(Icons.edit, size: 14, color: Color(0xFF22C55E)),
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            user.fullName,
                            style: GoogleFonts.poppins(
                              fontSize: 20, fontWeight: FontWeight.w700, color: Colors.white,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            user.email,
                            style: GoogleFonts.poppins(fontSize: 13, color: Colors.white.withValues(alpha: 0.85)),
                          ),
                          const SizedBox(height: 8),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                            decoration: BoxDecoration(
                              color: Colors.white.withValues(alpha: 0.2),
                              borderRadius: BorderRadius.circular(20),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                const Icon(Icons.store, size: 14, color: Colors.white),
                                const SizedBox(width: 4),
                                Text(
                                  user.role.toUpperCase(),
                                  style: GoogleFonts.poppins(
                                    color: Colors.white, fontSize: 11, fontWeight: FontWeight.w700,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildAvatarFallback(User user) {
    return Center(
      child: Text(
        user.firstName.isNotEmpty ? user.firstName[0].toUpperCase() : 'U',
        style: GoogleFonts.poppins(fontSize: 32, fontWeight: FontWeight.w700, color: Colors.white),
      ),
    );
  }

  Future<void> _pickAvatar() async {
    try {
      final XFile? image = await ImagePicker().pickImage(
        source: ImageSource.gallery,
        maxWidth: 512,
        maxHeight: 512,
      );
      if (image != null) {
        final bytes = await image.readAsBytes();
        final base64 = base64Encode(bytes);
        await _saveAvatar(base64);
        if (mounted) setState(() => _avatarBase64 = base64);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Could not pick image: $e'), backgroundColor: AppTheme.sale),
        );
      }
    }
  }

  Widget _buildMyOrdersSection(BuildContext context) {
    final t = AppLocalizations.of(context).translate;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(t('my_orders'), style: GoogleFonts.poppins(fontSize: 16, fontWeight: FontWeight.w700, color: AppTheme.textPrimary)),
          ],
        ),
        const SizedBox(height: 12),
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(20),
            boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.04), blurRadius: 12, offset: const Offset(0, 4))],
          ),
          child: Column(
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceAround,
                children: [
                  _buildOrderItem(context, Icons.shopping_bag_outlined, t('my_orders'), const Color(0xFF22C55E),
                      () => Navigator.push(context, MaterialPageRoute(builder: (_) => const OrderListScreen()))),
                  _buildOrderItem(context, Icons.local_shipping_outlined, t('track_order'), const Color(0xFF3B82F6),
                      () => Navigator.push(context, MaterialPageRoute(builder: (_) => const OrderListScreen()))),
                  _buildOrderItem(context, Icons.local_offer_outlined, t('coupons'), const Color(0xFFF59E0B),
                      () => _showCouponsSheet(context)),
                ],
              ),
              const SizedBox(height: 12),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceAround,
                children: [
                  _buildOrderItem(context, Icons.assignment_return_outlined, t('refund'), const Color(0xFF8B5CF6),
                      () => _showReturnRefundSheet(context)),
                  _buildOrderItem(context, Icons.favorite_outline, t('wishlist'), const Color(0xFFEF4444),
                      () => Navigator.push(context, MaterialPageRoute(builder: (_) => const WishlistScreen()))),
                  _buildOrderItem(context, Icons.swap_horiz_outlined, 'Returns', const Color(0xFF06B6D4),
                      () => Navigator.push(context, MaterialPageRoute(builder: (_) => const ReturnsScreen()))),
                ],
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildOrderItem(BuildContext context, IconData icon, String label, Color color, VoidCallback onTap) {
    return GestureDetector(
      onTap: onTap,
      child: Column(
        children: [
          Container(
            width: 56, height: 56,
            decoration: BoxDecoration(color: color.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(16)),
            child: Icon(icon, size: 24, color: color),
          ),
          const SizedBox(height: 8),
          Text(label, style: GoogleFonts.poppins(fontSize: 12, fontWeight: FontWeight.w500, color: AppTheme.textPrimary)),
        ],
      ),
    );
  }

  Widget _buildAccountSettingsSection(BuildContext context, AuthProvider auth) {
    final t = AppLocalizations.of(context).translate;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(t('account_settings'), style: GoogleFonts.poppins(fontSize: 16, fontWeight: FontWeight.w700, color: AppTheme.textPrimary)),
        const SizedBox(height: 12),
        Container(
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(20),
            boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.04), blurRadius: 12, offset: const Offset(0, 4))],
          ),
          child: Column(
            children: [
              _buildSettingsItem(Icons.person_outline, t('view_profile'), () => _showViewProfileSheet(context, auth)),
              const Divider(height: 1, indent: 56, endIndent: 16),
              _buildSettingsItem(Icons.location_on_outlined, t('my_addresses'), () => _showAddressesSheet(context)),
              const Divider(height: 1, indent: 56, endIndent: 16),
              _buildSettingsItem(Icons.payment_outlined, t('payment_methods'), () => _showPaymentSheet(context)),
              const Divider(height: 1, indent: 56, endIndent: 16),
              _buildSettingsItem(Icons.notifications_outlined, t('notifications'), () => _showNotificationsSheet(context)),
              const Divider(height: 1, indent: 56, endIndent: 16),
              Consumer<LanguageProvider>(
                builder: (context, langProvider, _) {
                  final currentLang = LanguageProvider.languageNames[langProvider.locale.languageCode] ?? 'English';
                  return _buildSettingsItem(
                    Icons.language_outlined, t('language'),
                    () => _showLanguageSheet(context, langProvider),
                    trailing: currentLang,
                  );
                },
              ),
              if (auth.user?.isVendor == true) ...[
                const Divider(height: 1, indent: 56, endIndent: 16),
                _buildSettingsItem(
                  Icons.dashboard_outlined, 'Vendor Dashboard',
                  () => Navigator.push(context, MaterialPageRoute(builder: (_) => const VendorDashboardScreen())),
                ),
              ],
              if (auth.user?.isAdmin == true) ...[
                const Divider(height: 1, indent: 56, endIndent: 16),
                _buildSettingsItem(
                  Icons.admin_panel_settings_outlined, 'Admin Panel',
                  () => Navigator.push(context, MaterialPageRoute(builder: (_) => const AdminDashboardScreen())),
                ),
              ],
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildSupportSection(BuildContext context) {
    final support = AppLocalizations.of(context).translate;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Support', style: GoogleFonts.poppins(fontSize: 16, fontWeight: FontWeight.w700, color: AppTheme.textPrimary)),
        const SizedBox(height: 12),
        Container(
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(20),
            boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.04), blurRadius: 12, offset: const Offset(0, 4))],
          ),
          child: Column(
            children: [
              _buildSettingsItem(Icons.headset_mic_outlined, support('help_center'), () => _showHelpSheet(context)),
              const Divider(height: 1, indent: 56, endIndent: 16),
              _buildSettingsItem(Icons.info_outline, support('about_us'), () => _showAboutSheet(context)),
              const Divider(height: 1, indent: 56, endIndent: 16),
              _buildSettingsItem(Icons.privacy_tip_outlined, support('privacy_policy'), () => _showPrivacyPolicy(context)),
              const Divider(height: 1, indent: 56, endIndent: 16),
              _buildSettingsItem(Icons.description_outlined, support('terms_of_service'), () => _showTermsOfService(context)),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildSettingsItem(IconData icon, String title, VoidCallback onTap, {String? trailing}) {
    return ListTile(
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      leading: Container(
        width: 40, height: 40,
        decoration: BoxDecoration(color: const Color(0xFFEEFDF3), borderRadius: BorderRadius.circular(12)),
        child: Icon(icon, size: 20, color: const Color(0xFF22C55E)),
      ),
      title: Text(title, style: GoogleFonts.poppins(fontSize: 14, fontWeight: FontWeight.w500, color: AppTheme.textPrimary)),
      trailing: trailing != null
          ? Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(trailing, style: GoogleFonts.poppins(fontSize: 13, color: AppTheme.textSecondary)),
                const SizedBox(width: 4),
                const Icon(Icons.chevron_right, color: AppTheme.textLight, size: 20),
              ],
            )
          : const Icon(Icons.chevron_right, color: AppTheme.textLight, size: 20),
      onTap: onTap,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
    );
  }

  Widget _buildLogoutButton(BuildContext context, AuthProvider auth) {
    final loc = AppLocalizations.of(context).translate;
    return GestureDetector(
      onTap: () async {
        final confirm = await showDialog<bool>(
          context: context,
          builder: (ctx) => AlertDialog(
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
            title: Text(loc('logout'), style: GoogleFonts.poppins(fontWeight: FontWeight.w700)),
            content: Text('Are you sure you want to logout?', style: GoogleFonts.poppins()),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(ctx, false),
                child: Text(loc('cancel'), style: GoogleFonts.poppins(color: AppTheme.textSecondary)),
              ),
              TextButton(
                onPressed: () => Navigator.pop(ctx, true),
                child: Text(loc('logout'), style: GoogleFonts.poppins(color: AppTheme.sale)),
              ),
            ],
          ),
        );
        if (confirm == true) {
          await auth.logout();
          if (context.mounted) {
            Navigator.of(context).pushAndRemoveUntil(
              MaterialPageRoute(builder: (_) => const LoginScreen()),
              (route) => false,
            );
          }
        }
      },
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.symmetric(vertical: 16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(20),
          boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.04), blurRadius: 12, offset: const Offset(0, 4))],
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.logout, size: 20, color: Color(0xFFDC2626)),
            const SizedBox(width: 8),
            Text(loc('logout'), style: GoogleFonts.poppins(fontSize: 15, fontWeight: FontWeight.w600, color: const Color(0xFFDC2626))),
          ],
        ),
      ),
    );
  }

  Widget _buildGuestView(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(20, 20, 20, 100),
      child: Column(
        children: [
          const SizedBox(height: 40),
          Container(
            padding: const EdgeInsets.all(32),
            decoration: BoxDecoration(
              gradient: RadialGradient(colors: [AppTheme.primary.withValues(alpha: 0.15), AppTheme.primary.withValues(alpha: 0.05)]),
              shape: BoxShape.circle,
            ),
            child: Container(
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: AppTheme.surface,
                shape: BoxShape.circle,
                boxShadow: [BoxShadow(color: AppTheme.primary.withValues(alpha: 0.15), blurRadius: 30, spreadRadius: 5, offset: const Offset(0, 10))],
              ),
              child: Container(
                padding: const EdgeInsets.all(16),
                decoration: const BoxDecoration(
                  gradient: LinearGradient(colors: [AppTheme.primary, AppTheme.primaryLight], begin: Alignment.topLeft, end: Alignment.bottomRight),
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.person_rounded, size: 48, color: Colors.white),
              ),
            ),
          ),
          const SizedBox(height: 32),
          ShaderMask(
            shaderCallback: (bounds) => const LinearGradient(colors: [AppTheme.primary, AppTheme.primaryLight]).createShader(bounds),
            child: Text(
              'Welcome to MyMart',
              style: GoogleFonts.poppins(fontSize: 26, fontWeight: FontWeight.w800, color: Colors.white),
              textAlign: TextAlign.center,
            ),
          ),
          const SizedBox(height: 12),
          Text(
            'Sign in to access your orders,\nsaved items, and exclusive offers',
            style: GoogleFonts.poppins(fontSize: 14, color: AppTheme.textSecondary, height: 1.6),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 36),
          _buildFeatureItem(
            icon: Icons.shopping_bag_rounded, title: 'Track Your Orders', subtitle: 'Real-time order tracking & updates',
            color: AppTheme.primary, onTap: () => Navigator.pushReplacement(context, MaterialPageRoute(builder: (_) => const LoginScreen())),
          ),
          _buildFeatureItem(
            icon: Icons.favorite_rounded, title: 'Save Favorites', subtitle: 'Create wishlists of your favorites',
            color: AppTheme.sale, onTap: () => Navigator.pushReplacement(context, MaterialPageRoute(builder: (_) => const LoginScreen())),
          ),
          _buildFeatureItem(
            icon: Icons.location_on_rounded, title: 'Manage Addresses', subtitle: 'Save multiple delivery locations',
            color: AppTheme.accent, onTap: () => Navigator.pushReplacement(context, MaterialPageRoute(builder: (_) => const LoginScreen())),
          ),
          const SizedBox(height: 28),
          Container(
            width: double.infinity,
            decoration: BoxDecoration(
              gradient: const LinearGradient(colors: [AppTheme.primary, AppTheme.primaryLight], begin: Alignment.centerLeft, end: Alignment.centerRight),
              borderRadius: BorderRadius.circular(16),
              boxShadow: [BoxShadow(color: AppTheme.primary.withValues(alpha: 0.4), blurRadius: 15, offset: const Offset(0, 8))],
            ),
            child: ElevatedButton(
              onPressed: () => Navigator.pushReplacement(context, MaterialPageRoute(builder: (_) => const LoginScreen())),
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.transparent, shadowColor: Colors.transparent,
                padding: const EdgeInsets.symmetric(vertical: 16),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.login_rounded, color: Colors.white, size: 20),
                  const SizedBox(width: 8),
                  Text('Login / Sign Up', style: GoogleFonts.poppins(fontSize: 15, fontWeight: FontWeight.w600, color: Colors.white)),
                ],
              ),
            ),
          ),
          const SizedBox(height: 40),
        ],
      ),
    );
  }

  Widget _buildFeatureItem({required IconData icon, required String title, required String subtitle, required Color color, VoidCallback? onTap}) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(16),
        margin: const EdgeInsets.only(bottom: 12),
        decoration: BoxDecoration(
          color: AppTheme.surface,
          borderRadius: BorderRadius.circular(20),
          boxShadow: [BoxShadow(color: AppTheme.cardShadow, blurRadius: 12, offset: const Offset(0, 4))],
          border: Border.all(color: color.withValues(alpha: 0.2), width: 1),
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                gradient: LinearGradient(colors: [color.withValues(alpha: 0.15), color.withValues(alpha: 0.05)], begin: Alignment.topLeft, end: Alignment.bottomRight),
                borderRadius: BorderRadius.circular(16),
              ),
              child: Icon(icon, color: color, size: 26),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title, style: GoogleFonts.poppins(fontWeight: FontWeight.w600, fontSize: 15, color: AppTheme.textPrimary)),
                  const SizedBox(height: 2),
                  Text(subtitle, style: GoogleFonts.poppins(fontSize: 12, color: AppTheme.textSecondary)),
                ],
              ),
            ),
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(color: color.withValues(alpha: 0.1), shape: BoxShape.circle),
              child: Icon(Icons.arrow_forward_ios, color: color, size: 14),
            ),
          ],
        ),
      ),
    );
  }

  void _showLanguageSheet(BuildContext context, LanguageProvider langProvider) {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (ctx) => Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Select Language', style: GoogleFonts.poppins(fontSize: 20, fontWeight: FontWeight.w700)),
            const SizedBox(height: 20),
            ...LanguageProvider.supportedLocales.map((locale) {
              final isSelected = langProvider.locale.languageCode == locale.languageCode;
              return ListTile(
                contentPadding: EdgeInsets.zero,
                leading: Container(
                  width: 40, height: 40,
                  decoration: BoxDecoration(
                    color: isSelected ? AppTheme.primary : AppTheme.primaryExtraLight,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Center(child: Text(_getLanguageEmoji(locale.languageCode), style: const TextStyle(fontSize: 20))),
                ),
                title: Text(LanguageProvider.languageNames[locale.languageCode] ?? locale.languageCode,
                    style: GoogleFonts.poppins(fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal)),
                trailing: isSelected ? const Icon(Icons.check_circle, color: AppTheme.primary) : null,
                onTap: () {
                  langProvider.setLocale(locale);
                  Navigator.pop(ctx);
                },
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              );
            }),
          ],
        ),
      ),
    );
  }

  String _getLanguageEmoji(String langCode) {
    switch (langCode) {
      case 'en': return '🇺🇸';
      case 'ur': return '🇵🇰';
      case 'ar': return '🇸🇦';
      case 'hi': return '🇮🇳';
      case 'zh': return '🇨🇳';
      default: return '🌐';
    }
  }

  void _showNotificationsSheet(BuildContext context) {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (ctx) => Consumer<NotificationProvider>(
        builder: (context, notifProvider, _) {
          return Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Notifications', style: GoogleFonts.poppins(fontSize: 20, fontWeight: FontWeight.w700)),
                const SizedBox(height: 20),
                _buildNotifToggle('Order Updates', 'Get notified when your order status changes',
                    notifProvider.orderUpdates, notifProvider.setOrderUpdates),
                _buildNotifToggle('Promotions', 'Receive exclusive offers and discounts',
                    notifProvider.promotions, notifProvider.setPromotions),
                _buildNotifToggle('Wishlist Alerts', 'Get alerts when wishlist items go on sale',
                    notifProvider.wishlistAlerts, notifProvider.setWishlistAlerts),
                _buildNotifToggle('Price Drops', 'Get notified when prices of saved items drop',
                    notifProvider.priceDrops, notifProvider.setPriceDrops),
              ],
            ),
          );
        },
      ),
    );
  }

  Widget _buildNotifToggle(String title, String subtitle, bool value, Function(bool) onChanged) {
    return ListTile(
      contentPadding: EdgeInsets.zero,
      title: Text(title, style: GoogleFonts.poppins(fontWeight: FontWeight.w500)),
      subtitle: Text(subtitle, style: GoogleFonts.poppins(fontSize: 12, color: AppTheme.textSecondary)),
      trailing: Switch(value: value, activeThumbColor: AppTheme.primary, onChanged: (v) => onChanged(v)),
    );
  }

  void _showHelpSheet(BuildContext context) {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (ctx) => Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Help Center', style: GoogleFonts.poppins(fontSize: 20, fontWeight: FontWeight.w700)),
            const SizedBox(height: 20),
            Text('Need help? Contact us at support@mymart.com', style: GoogleFonts.poppins(fontSize: 14, color: AppTheme.textSecondary)),
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppTheme.primaryExtraLight,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Row(
                children: [
                  const Icon(Icons.email_outlined, color: AppTheme.primary, size: 20),
                  const SizedBox(width: 12),
                  Text('support@mymart.com', style: GoogleFonts.poppins(fontWeight: FontWeight.w600, color: AppTheme.primary)),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _showAboutSheet(BuildContext context) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: Text('About MyMart', style: GoogleFonts.poppins(fontWeight: FontWeight.w700)),
        content: Text('MyMart - Your favorite grocery shopping app.\nVersion 1.0.0', style: GoogleFonts.poppins(fontSize: 14, color: AppTheme.textSecondary)),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: Text('Close', style: GoogleFonts.poppins(color: AppTheme.primary))),
        ],
      ),
    );
  }

  void _showPrivacyPolicy(BuildContext context) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(color: AppTheme.primaryExtraLight, borderRadius: BorderRadius.circular(8)),
              child: const Icon(Icons.privacy_tip, color: AppTheme.primary, size: 24),
            ),
            const SizedBox(width: 12),
            Text('Privacy Policy', style: GoogleFonts.poppins(fontWeight: FontWeight.w700)),
          ],
        ),
        content: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              Text('Your Privacy Matters', style: GoogleFonts.poppins(fontWeight: FontWeight.w600, fontSize: 16)),
              const SizedBox(height: 12),
              Text('MyMart is committed to protecting your personal information. We collect only necessary data to provide you with the best shopping experience.', style: GoogleFonts.poppins(fontSize: 13, color: AppTheme.textSecondary, height: 1.6)),
            ],
          ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: Text('Close', style: GoogleFonts.poppins(color: AppTheme.primary))),
        ],
      ),
    );
  }

  void _showTermsOfService(BuildContext context) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(color: AppTheme.primaryExtraLight, borderRadius: BorderRadius.circular(8)),
              child: const Icon(Icons.description, color: AppTheme.primary, size: 24),
            ),
            const SizedBox(width: 12),
            Text('Terms of Service', style: GoogleFonts.poppins(fontWeight: FontWeight.w700)),
          ],
        ),
        content: const SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              Text('Welcome to MyMart', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 16)),
              SizedBox(height: 12),
              Text('By using MyMart, you agree to the following terms and conditions. Please read them carefully before using our services.',
                  style: TextStyle(fontSize: 13, color: AppTheme.textSecondary, height: 1.6)),
            ],
          ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: Text('Close', style: GoogleFonts.poppins(color: AppTheme.primary))),
        ],
      ),
    );
  }

  void _showAddressesSheet(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (ctx) => DraggableScrollableSheet(
        initialChildSize: 0.7,
        maxChildSize: 0.95,
        minChildSize: 0.5,
        expand: false,
        builder: (context, scrollController) => Consumer<AddressProvider>(
          builder: (context, addressProvider, _) {
            final addresses = addressProvider.addresses;
            return Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text('My Addresses', style: GoogleFonts.poppins(fontSize: 20, fontWeight: FontWeight.w700)),
                      IconButton(
                        icon: const Icon(Icons.add_circle_outline, color: AppTheme.primary),
                        onPressed: () => _showAddAddressDialog(context),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  Expanded(
                    child: addresses.isEmpty
                        ? Center(
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                const Icon(Icons.location_off_outlined, size: 64, color: AppTheme.textLight),
                                const SizedBox(height: 16),
                                Text('No addresses saved', style: GoogleFonts.poppins(color: AppTheme.textSecondary)),
                                const SizedBox(height: 16),
                                ElevatedButton.icon(
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor: AppTheme.primary,
                                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                                  ),
                                  onPressed: () => _showAddAddressDialog(context),
                                  icon: const Icon(Icons.add, color: Colors.white),
                                  label: Text('Add Address', style: GoogleFonts.poppins(color: Colors.white, fontWeight: FontWeight.w600)),
                                ),
                              ],
                            ),
                          )
                        : ListView.builder(
                            controller: scrollController,
                            itemCount: addresses.length,
                            itemBuilder: (context, index) {
                              final addr = addresses[index];
                              return Container(
                                margin: const EdgeInsets.only(bottom: 12),
                                padding: const EdgeInsets.all(16),
                                decoration: BoxDecoration(
                                  color: AppTheme.surface,
                                  borderRadius: BorderRadius.circular(16),
                                  border: Border.all(
                                    color: addr.isDefault == true ? AppTheme.primary : AppTheme.divider,
                                    width: addr.isDefault == true ? 2 : 1,
                                  ),
                                ),
                                child: Row(
                                  children: [
                                    Container(
                                      padding: const EdgeInsets.all(10),
                                      decoration: BoxDecoration(color: AppTheme.primaryExtraLight, shape: BoxShape.circle),
                                      child: const Icon(Icons.home, color: AppTheme.primary, size: 20),
                                    ),
                                    const SizedBox(width: 12),
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Row(
                                            children: [
                                              Text(addr.name.isNotEmpty ? addr.name : 'Address',
                                                  style: GoogleFonts.poppins(fontWeight: FontWeight.w600)),
                                              if (addr.isDefault == true) ...[
                                                const SizedBox(width: 8),
                                                Container(
                                                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                                  decoration: BoxDecoration(color: AppTheme.primary, borderRadius: BorderRadius.circular(4)),
                                                  child: Text('Default',
                                                      style: GoogleFonts.poppins(color: Colors.white, fontSize: 10, fontWeight: FontWeight.w600)),
                                                ),
                                              ],
                                            ],
                                          ),
                                          const SizedBox(height: 4),
                                          Text(addr.fullAddress,
                                              style: GoogleFonts.poppins(fontSize: 13, color: AppTheme.textSecondary),
                                              maxLines: 2, overflow: TextOverflow.ellipsis),
                                        ],
                                      ),
                                    ),
                                    IconButton(
                                      icon: const Icon(Icons.delete_outline, color: AppTheme.sale),
                                      onPressed: () => addressProvider.deleteAddress(addr.id),
                                    ),
                                  ],
                                ),
                              );
                            },
                          ),
                  ),
                ],
              ),
            );
          },
        ),
      ),
    );
  }

  void _showAddAddressDialog(BuildContext context) {
    final nameController = TextEditingController();
    final phoneController = TextEditingController();
    final addressLine1Controller = TextEditingController();
    final addressLine2Controller = TextEditingController();
    final cityController = TextEditingController();
    final postalCodeController = TextEditingController();

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: Text('Add Address', style: GoogleFonts.poppins(fontWeight: FontWeight.w700)),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: nameController,
                decoration: InputDecoration(
                  labelText: 'Name (e.g., Home, Office)',
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: phoneController,
                keyboardType: TextInputType.phone,
                decoration: InputDecoration(
                  labelText: 'Phone Number',
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: addressLine1Controller,
                maxLines: 2,
                decoration: InputDecoration(
                  labelText: 'Address Line 1',
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: addressLine2Controller,
                decoration: InputDecoration(
                  labelText: 'Address Line 2 (Optional)',
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: cityController,
                decoration: InputDecoration(
                  labelText: 'City',
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: postalCodeController,
                keyboardType: TextInputType.number,
                decoration: InputDecoration(
                  labelText: 'Postal Code',
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                ),
              ),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: Text('Cancel', style: GoogleFonts.poppins(color: AppTheme.textSecondary)),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: AppTheme.primary,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            ),
            onPressed: () {
              if (nameController.text.isNotEmpty && phoneController.text.isNotEmpty &&
                  addressLine1Controller.text.isNotEmpty && cityController.text.isNotEmpty) {
                final address = DeliveryAddress(
                  id: DateTime.now().millisecondsSinceEpoch.toString(),
                  name: nameController.text,
                  phone: phoneController.text,
                  addressLine1: addressLine1Controller.text,
                  addressLine2: addressLine2Controller.text.isNotEmpty ? addressLine2Controller.text : null,
                  city: cityController.text,
                  postalCode: postalCodeController.text.isNotEmpty ? postalCodeController.text : null,
                  isDefault: false,
                );
                Provider.of<AddressProvider>(context, listen: false).addAddress(address);
                Navigator.pop(ctx);
              }
            },
            child: Text('Save', style: GoogleFonts.poppins(color: Colors.white)),
          ),
        ],
      ),
    );
  }

  void _showCouponsSheet(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (ctx) {
        return FutureBuilder<Map<String, dynamic>>(
          future: CouponService.getAvailableCoupons(),
          builder: (context, snapshot) {
            List<Map<String, String>> coupons = [];
            if (snapshot.hasData && snapshot.data!['success'] == true) {
              final data = snapshot.data!['data'];
              if (data is Map && data['coupons'] is List) {
                coupons = (data['coupons'] as List).map((c) {
                  final m = c as Map<String, dynamic>;
                  return {
                    'code': (m['code'] ?? '').toString(),
                    'discount': (m['discount'] ?? m['discount_percentage'] ?? '').toString(),
                    'min': (m['min_order'] ?? m['min_amount'] ?? '').toString(),
                    'exp': (m['expiry_date'] ?? m['valid_till'] ?? '').toString(),
                  };
                }).toList();
              }
            }
            if (coupons.isEmpty) {
              coupons = [];
            }
            return DraggableScrollableSheet(
              initialChildSize: 0.6,
              maxChildSize: 0.9,
              minChildSize: 0.4,
              expand: false,
              builder: (context, scrollController) => Padding(
                padding: const EdgeInsets.all(24),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text('My Coupons', style: GoogleFonts.poppins(fontSize: 20, fontWeight: FontWeight.w700)),
                        if (snapshot.connectionState == ConnectionState.waiting)
                          const SizedBox.shrink(),
                      ],
                    ),
                    const SizedBox(height: 16),
                    Expanded(
                      child: ListView.builder(
                        controller: scrollController,
                        itemCount: coupons.length,
                        itemBuilder: (context, index) {
                          final coupon = coupons[index];
                          return Container(
                            margin: const EdgeInsets.only(bottom: 12),
                            padding: const EdgeInsets.all(16),
                            decoration: BoxDecoration(
                              gradient: const LinearGradient(
                                colors: [AppTheme.primary, AppTheme.primaryLight],
                                begin: Alignment.topLeft, end: Alignment.bottomRight,
                              ),
                              borderRadius: BorderRadius.circular(16),
                            ),
                            child: Row(
                              children: [
                                Container(
                                  padding: const EdgeInsets.all(12),
                                  decoration: BoxDecoration(
                                    color: Colors.white.withValues(alpha: 0.2),
                                    borderRadius: BorderRadius.circular(12),
                                  ),
                                  child: Text(coupon['discount']!,
                                      style: GoogleFonts.poppins(color: Colors.white, fontWeight: FontWeight.w700, fontSize: 16)),
                                ),
                                const SizedBox(width: 16),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(coupon['code']!,
                                          style: GoogleFonts.poppins(color: Colors.white, fontWeight: FontWeight.w700, fontSize: 16)),
                                      const SizedBox(height: 4),
                                      Text(coupon['min']!,
                                          style: GoogleFonts.poppins(color: Colors.white.withValues(alpha: 0.8), fontSize: 12)),
                                      Text(coupon['exp']!,
                                          style: GoogleFonts.poppins(color: Colors.white.withValues(alpha: 0.7), fontSize: 11)),
                                    ],
                                  ),
                                ),
                                IconButton(
                                  icon: const Icon(Icons.copy, color: Colors.white),
                                  onPressed: () {
                                    ScaffoldMessenger.of(context).showSnackBar(
                                      SnackBar(content: Text('Coupon ${coupon['code']} copied!'), backgroundColor: AppTheme.primary),
                                    );
                                  },
                                ),
                              ],
                            ),
                          );
                        },
                      ),
                    ),
                  ],
                ),
              ),
            );
          },
        );
      },
    );
  }

  void _showPaymentSheet(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (ctx) {
        return DraggableScrollableSheet(
          initialChildSize: 0.5,
          maxChildSize: 0.85,
          minChildSize: 0.3,
          expand: false,
          builder: (context, scrollController) {
            return StatefulBuilder(
              builder: (context, setSheetState) {
                return Padding(
                  padding: const EdgeInsets.fromLTRB(24, 16, 24, 24),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Center(
                        child: Container(
                          width: 40, height: 4,
                          decoration: BoxDecoration(color: AppTheme.divider, borderRadius: BorderRadius.circular(2)),
                        ),
                      ),
                      const SizedBox(height: 16),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text('Payment Methods', style: GoogleFonts.poppins(fontSize: 20, fontWeight: FontWeight.w700)),
                          IconButton(
                            icon: const Icon(Icons.refresh, size: 20, color: AppTheme.primary),
                            onPressed: () => setSheetState(() {}),
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),
                      Expanded(
                        child: FutureBuilder<List<Map<String, dynamic>>>(
                          future: StripePaymentService.getSavedCards(),
                          builder: (context, snapshot) {
                            if (snapshot.connectionState == ConnectionState.waiting) {
                              return const ShimmerPaymentCards();
                            }
                            if (snapshot.hasError) {
                              return Center(
                                child: Column(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    const Icon(Icons.error_outline, size: 48, color: AppTheme.sale),
                                    const SizedBox(height: 12),
                                    Text('Could not load cards', style: GoogleFonts.poppins(color: AppTheme.textSecondary)),
                                    const SizedBox(height: 8),
                                    TextButton(
                                      onPressed: () => setSheetState(() {}),
                                      child: Text('Retry', style: GoogleFonts.poppins(color: AppTheme.primary)),
                                    ),
                                  ],
                                ),
                              );
                            }
                            final cards = snapshot.data ?? [];
                            if (cards.isEmpty) {
                              return Center(
                                child: Column(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Container(
                                      padding: const EdgeInsets.all(20),
                                      decoration: BoxDecoration(
                                        color: AppTheme.primaryExtraLight, shape: BoxShape.circle,
                                      ),
                                      child: const Icon(Icons.credit_card_outlined, size: 48, color: AppTheme.primary),
                                    ),
                                    const SizedBox(height: 16),
                                    Text('No saved cards', style: GoogleFonts.poppins(fontSize: 16, fontWeight: FontWeight.w600)),
                                    const SizedBox(height: 4),
                                    Text('Add a card for faster checkout', style: GoogleFonts.poppins(fontSize: 13, color: AppTheme.textSecondary)),
                                  ],
                                ),
                              );
                            }
                            return ListView(
                              controller: scrollController,
                              children: [
                                ...cards.map((card) => _buildSavedCard(card, setSheetState)),
                                const SizedBox(height: 16),
                              ],
                            );
                          },
                        ),
                      ),
                      SizedBox(
                        width: double.infinity,
                        child: ElevatedButton.icon(
                          onPressed: () async {
                            Navigator.pop(ctx);
                            await _addCardViaStripe(context);
                            if (context.mounted) _showPaymentSheet(context);
                          },
                          icon: const Icon(Icons.add_circle_outline, size: 20),
                          label: Text('Add New Card', style: GoogleFonts.poppins(fontWeight: FontWeight.w600)),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppTheme.primary,
                            foregroundColor: Colors.white,
                            padding: const EdgeInsets.symmetric(vertical: 14),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          ),
                        ),
                      ),
                    ],
                  ),
                );
              },
            );
          },
        );
      },
    );
  }

  Widget _buildSavedCard(Map<String, dynamic> card, void Function(void Function()) setSheetState) {
    final brand = (card['brand'] ?? '').toString().toLowerCase();
    final last4 = card['last4'] ?? '';
    final expMonth = card['expMonth']?.toString() ?? '';
    final expYear = card['expYear']?.toString() ?? '';
    final cardId = card['id'] ?? '';
    final isDefault = card['is_default'] == true;

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: isDefault
              ? [AppTheme.primary.withValues(alpha: 0.08), AppTheme.primary.withValues(alpha: 0.02)]
              : [AppTheme.surface, AppTheme.surface],
          begin: Alignment.topLeft, end: Alignment.bottomRight,
        ),
        border: Border.all(color: isDefault ? AppTheme.primary.withValues(alpha: 0.3) : AppTheme.divider),
        borderRadius: BorderRadius.circular(14),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: AppTheme.primaryExtraLight,
              borderRadius: BorderRadius.circular(10),
            ),
            child: _cardBrandIcon(brand),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Text(
                      '${_formatBrand(brand)} •••• $last4',
                      style: GoogleFonts.poppins(fontWeight: FontWeight.w600, fontSize: 14),
                    ),
                    if (isDefault) ...[
                      const SizedBox(width: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: AppTheme.primary,
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text('Default', style: GoogleFonts.poppins(fontSize: 9, color: Colors.white, fontWeight: FontWeight.w600)),
                      ),
                    ],
                  ],
                ),
                const SizedBox(height: 2),
                Text(
                  expMonth.isNotEmpty && expYear.isNotEmpty
                      ? 'Expires $expMonth/$expYear'
                      : 'Saved card',
                  style: GoogleFonts.poppins(fontSize: 12, color: AppTheme.textSecondary),
                ),
              ],
            ),
          ),
          GestureDetector(
            onTap: () => _confirmDeleteCard(context, cardId, brand, last4, setSheetState),
            child: Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: AppTheme.sale.withValues(alpha: 0.08),
                borderRadius: BorderRadius.circular(10),
              ),
              child: const Icon(Icons.delete_outline, color: AppTheme.sale, size: 20),
            ),
          ),
        ],
      ),
    );
  }

  Widget _cardBrandIcon(String brand) {
    switch (brand) {
      case 'visa':
        return const Icon(Icons.credit_card, color: Color(0xFF1A1F71), size: 22);
      case 'mastercard':
        return const Icon(Icons.credit_card, color: Color(0xFFEB001B), size: 22);
      case 'amex':
        return const Icon(Icons.credit_card, color: Color(0xFF2E77BC), size: 22);
      default:
        return const Icon(Icons.credit_card, color: AppTheme.primary, size: 22);
    }
  }

  String _formatBrand(String brand) {
    switch (brand) {
      case 'visa': return 'Visa';
      case 'mastercard': return 'Mastercard';
      case 'amex': return 'Amex';
      case 'discover': return 'Discover';
      case 'jcb': return 'JCB';
      case 'diners': return 'Diners';
      default: return brand.toUpperCase();
    }
  }

  void _confirmDeleteCard(BuildContext context, String cardId, String brand, String last4, void Function(void Function()) setSheetState) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: Text('Remove Card', style: GoogleFonts.poppins(fontWeight: FontWeight.w700)),
        content: Text(
          'Remove ${_formatBrand(brand)} •••• $last4 from your saved cards?',
          style: GoogleFonts.poppins(color: AppTheme.textSecondary),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: Text('Cancel', style: GoogleFonts.poppins(color: AppTheme.textSecondary)),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: AppTheme.sale,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            ),
            onPressed: () async {
              Navigator.pop(ctx);
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Removing card...'), backgroundColor: AppTheme.primary),
              );
              final result = await StripePaymentService.deleteSavedCard(cardId);
              await SavedCardService.deleteCard(cardId);
              if (context.mounted) {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text(result['success'] ? 'Card removed' : 'Card removed locally'),
                    backgroundColor: AppTheme.primary,
                  ),
                );
                setSheetState(() {});
              }
            },
            child: Text('Remove', style: GoogleFonts.poppins(color: Colors.white)),
          ),
        ],
      ),
    );
  }

  Future<void> _addCardViaStripe(BuildContext context) async {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => const Center(child: SizedBox(width: 24, height: 24)),
    );

    try {
      await StripePaymentService.initialize();
      final result = await StripePaymentService.saveCard();
      if (context.mounted) Navigator.pop(context);

      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(result['success'] ? 'Card saved successfully!' : 'Failed: ${result['error']}'),
            backgroundColor: result['success'] ? AppTheme.primary : AppTheme.sale,
          ),
        );
      }
    } catch (e) {
      if (context.mounted) Navigator.pop(context);
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e'), backgroundColor: AppTheme.sale),
        );
      }
    }
  }

  void _showViewProfileSheet(BuildContext context, AuthProvider auth) {
    final user = auth.user;
    if (user == null) return;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (ctx) => DraggableScrollableSheet(
        initialChildSize: 0.7,
        maxChildSize: 0.95,
        minChildSize: 0.5,
        expand: false,
        builder: (context, scrollController) => Padding(
          padding: const EdgeInsets.all(24),
          child: ListView(
            controller: scrollController,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text('Profile Details', style: GoogleFonts.poppins(fontSize: 20, fontWeight: FontWeight.w700)),
                  IconButton(
                    icon: const Icon(Icons.edit_outlined, color: AppTheme.primary),
                    onPressed: () => _showEditProfileDialog(context, auth),
                  ),
                ],
              ),
              const SizedBox(height: 24),
              _buildDetailTile(Icons.person_outline, 'Name', user.fullName),
              const Divider(height: 1, indent: 40),
              _buildDetailTile(Icons.email_outlined, 'Email', user.email),
              const Divider(height: 1, indent: 40),
              _buildDetailTile(Icons.phone_outlined, 'Phone', user.phone ?? 'Not set'),
              const Divider(height: 1, indent: 40),
              _buildDetailTile(Icons.badge_outlined, 'Role', user.role),
              const SizedBox(height: 24),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  onPressed: () => _showChangePasswordDialog(context),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppTheme.primary,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    padding: const EdgeInsets.symmetric(vertical: 14),
                  ),
                  icon: const Icon(Icons.lock_outline, color: Colors.white, size: 20),
                  label: Text('Change Password', style: GoogleFonts.poppins(color: Colors.white, fontWeight: FontWeight.w600)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildDetailTile(IconData icon, String label, String value) {
    return ListTile(
      contentPadding: const EdgeInsets.symmetric(vertical: 4),
      leading: Container(
        padding: const EdgeInsets.all(8),
        decoration: BoxDecoration(color: AppTheme.primaryExtraLight, shape: BoxShape.circle),
        child: Icon(icon, size: 20, color: AppTheme.primary),
      ),
      title: Text(value, style: GoogleFonts.poppins(fontWeight: FontWeight.w600)),
      subtitle: Text(label, style: GoogleFonts.poppins(fontSize: 12, color: AppTheme.textSecondary)),
    );
  }

  void _showEditProfileDialog(BuildContext context, AuthProvider auth) {
    final user = auth.user;
    if (user == null) return;

    final firstNameController = TextEditingController(text: user.firstName);
    final lastNameController = TextEditingController(text: user.lastName);
    final phoneController = TextEditingController(text: user.phone ?? '');
    bool saving = false;

    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
          title: Text('Edit Profile', style: GoogleFonts.poppins(fontWeight: FontWeight.w700)),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                TextField(
                  controller: firstNameController,
                  decoration: InputDecoration(
                    labelText: 'First Name',
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: lastNameController,
                  decoration: InputDecoration(
                    labelText: 'Last Name',
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: phoneController,
                  keyboardType: TextInputType.phone,
                  decoration: InputDecoration(
                    labelText: 'Phone Number',
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                ),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: saving ? null : () => Navigator.pop(ctx),
              child: Text('Cancel', style: GoogleFonts.poppins(color: AppTheme.textSecondary)),
            ),
            ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: AppTheme.primary,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              onPressed: saving
                  ? null
                  : () async {
                      setDialogState(() => saving = true);
                      final resp = await AuthService.updateProfile(
                        firstName: firstNameController.text,
                        lastName: lastNameController.text,
                        phone: phoneController.text.isNotEmpty ? phoneController.text : null,
                      );
                      if (resp['success'] == true) {
                        await auth.initialize();
                        if (ctx.mounted) Navigator.pop(ctx);
                      } else {
                        setDialogState(() => saving = false);
                        if (ctx.mounted) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(content: Text(resp['message'] ?? 'Update failed'), backgroundColor: AppTheme.sale),
                          );
                        }
                      }
                    },
              child: Text('Save', style: GoogleFonts.poppins(color: Colors.white)),
            ),
          ],
        ),
      ),
    );
  }

  void _showChangePasswordDialog(BuildContext context) {
    final currentPwController = TextEditingController();
    final newPwController = TextEditingController();
    final confirmPwController = TextEditingController();
    bool saving = false;

    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
          title: Text('Change Password', style: GoogleFonts.poppins(fontWeight: FontWeight.w700)),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                TextField(
                  controller: currentPwController,
                  obscureText: true,
                  decoration: InputDecoration(
                    labelText: 'Current Password',
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: newPwController,
                  obscureText: true,
                  decoration: InputDecoration(
                    labelText: 'New Password',
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: confirmPwController,
                  obscureText: true,
                  decoration: InputDecoration(
                    labelText: 'Confirm New Password',
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                ),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: saving ? null : () => Navigator.pop(ctx),
              child: Text('Cancel', style: GoogleFonts.poppins(color: AppTheme.textSecondary)),
            ),
            ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: AppTheme.primary,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              onPressed: saving
                  ? null
                  : () async {
                      if (newPwController.text != confirmPwController.text) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(content: Text('Passwords do not match'), backgroundColor: AppTheme.sale),
                        );
                        return;
                      }
                      if (newPwController.text.length < 6) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(content: Text('Password must be at least 6 characters'), backgroundColor: AppTheme.sale),
                        );
                        return;
                      }
                      setDialogState(() => saving = true);
                      final resp = await AuthService.changePassword(
                        currentPassword: currentPwController.text,
                        newPassword: newPwController.text,
                      );
                      setDialogState(() => saving = false);
                      if (resp['success'] == true) {
                        if (ctx.mounted) Navigator.pop(ctx);
                        if (context.mounted) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(content: Text('Password changed successfully'), backgroundColor: AppTheme.primary),
                          );
                        }
                      } else {
                        if (context.mounted) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(content: Text(resp['message'] ?? 'Failed to change password'), backgroundColor: AppTheme.sale),
                          );
                        }
                      }
                    },
              child: Text('Update', style: GoogleFonts.poppins(color: Colors.white)),
            ),
          ],
        ),
      ),
    );
  }

  void _showReturnRefundSheet(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (ctx) {
        return FutureBuilder<Map<String, dynamic>>(
          future: _getReturns(),
          builder: (context, snapshot) {
            if (snapshot.connectionState == ConnectionState.waiting) {
              return const ShimmerReturnsList();
            }
            final returns = snapshot.data != null && snapshot.data!['success'] == true
                ? ((snapshot.data!['data'] as Map<String, dynamic>?)?['returns'] as List? ?? [])
                : <dynamic>[];
            return DraggableScrollableSheet(
              initialChildSize: 0.7,
              maxChildSize: 0.95,
              minChildSize: 0.5,
              expand: false,
              builder: (context, scrollController) => Padding(
                padding: const EdgeInsets.all(24),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text('My Returns', style: GoogleFonts.poppins(fontSize: 20, fontWeight: FontWeight.w700)),
                        IconButton(
                          icon: const Icon(Icons.add_circle_outline, color: AppTheme.primary),
                          onPressed: () {
                            Navigator.pop(ctx);
                            _showCreateReturnSheet(context);
                          },
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),
                    Expanded(
                      child: returns.isEmpty
                          ? Center(
                              child: Column(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  const Icon(Icons.replay_outlined, size: 64, color: AppTheme.textLight),
                                  const SizedBox(height: 16),
                                  Text('No return requests', style: GoogleFonts.poppins(color: AppTheme.textSecondary)),
                                  const SizedBox(height: 16),
                                  ElevatedButton.icon(
                                    style: ElevatedButton.styleFrom(
                                      backgroundColor: AppTheme.primary,
                                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                                    ),
                                    onPressed: () {
                                      Navigator.pop(ctx);
                                      _showCreateReturnSheet(context);
                                    },
                                    icon: const Icon(Icons.add, color: Colors.white),
                                    label: Text('Create Return', style: GoogleFonts.poppins(color: Colors.white, fontWeight: FontWeight.w600)),
                                  ),
                                ],
                              ),
                            )
                          : ListView.builder(
                              controller: scrollController,
                              itemCount: returns.length,
                              itemBuilder: (context, index) {
                                final ret = returns[index] as Map<String, dynamic>;
                                final isRefund = ret['entry_type'] == 'refund';
                                return Container(
                                  margin: const EdgeInsets.only(bottom: 12),
                                  padding: const EdgeInsets.all(16),
                                  decoration: BoxDecoration(
                                    color: AppTheme.surface,
                                    borderRadius: BorderRadius.circular(16),
                                    border: Border.all(color: AppTheme.divider),
                                  ),
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Row(
                                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                        children: [
                                          Text('Order #${ret['order_number'] ?? ret['orderId'] ?? ''}',
                                              style: GoogleFonts.poppins(fontWeight: FontWeight.w600)),
                                          Container(
                                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                            decoration: BoxDecoration(
                                              color: isRefund
                                                  ? AppTheme.primaryExtraLight
                                                  : (ret['status'] == 'approved' || ret['status'] == 'refunded' || ret['status'] == 'completed')
                                                      ? AppTheme.primaryExtraLight
                                                      : AppTheme.saleLight,
                                              borderRadius: BorderRadius.circular(8),
                                            ),
                                            child: Text(
                                              isRefund ? 'REFUNDED' : (ret['status'] ?? 'pending').toString().toUpperCase(),
                                              style: GoogleFonts.poppins(fontSize: 10, fontWeight: FontWeight.w600,
                                                  color: isRefund || ret['status'] == 'approved' || ret['status'] == 'completed'
                                                      ? AppTheme.primary
                                                      : AppTheme.sale),
                                            ),
                                          ),
                                        ],
                                      ),
                                      const SizedBox(height: 8),
                                      if (isRefund && ret['refund_amount'] != null)
                                        Text('Refund: \$${ret['refund_amount']}',
                                            style: GoogleFonts.poppins(fontSize: 13, fontWeight: FontWeight.w600, color: AppTheme.primary))
                                      else if (!isRefund)
                                        Text('Reason: ${ret['reason'] ?? 'N/A'}',
                                            style: GoogleFonts.poppins(fontSize: 13, color: AppTheme.textSecondary)),
                                    ],
                                  ),
                                );
                              },
                            ),
                    ),
                  ],
                ),
              ),
            );
          },
        );
      },
    );
  }


  Future<Map<String, dynamic>> _getReturns() async {
    try {
      return await ApiService.get(ApiConfig.myReturns);
    } catch (_) {
      return {'success': false};
    }
  }

  void _showCreateReturnSheet(BuildContext context) {
    final orderIdController = TextEditingController();
    final reasonController = TextEditingController();

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (ctx) {
        bool saving = false;
        return StatefulBuilder(
          builder: (context, setSheetState) => Padding(
            padding: EdgeInsets.only(
              left: 24, right: 24, top: 24,
              bottom: MediaQuery.of(ctx).viewInsets.bottom + 24,
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Create Return Request', style: GoogleFonts.poppins(fontSize: 20, fontWeight: FontWeight.w700)),
                const SizedBox(height: 20),
                TextField(
                  controller: orderIdController,
                  decoration: InputDecoration(
                    labelText: 'Order ID / Order Number',
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: reasonController,
                  maxLines: 3,
                  decoration: InputDecoration(
                    labelText: 'Reason for Return',
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                ),
                const SizedBox(height: 20),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: saving
                        ? null
                        : () async {
                            if (orderIdController.text.isEmpty || reasonController.text.isEmpty) return;
                            setSheetState(() => saving = true);
                            try {
                              final resp = await ApiService.post(ApiConfig.returns, body: {
                                'orderId': orderIdController.text,
                                'reason': reasonController.text,
                              });
                              if (ctx.mounted) Navigator.pop(ctx);
                              if (context.mounted) {
                                final ok = resp['success'] == true || (resp['data'] is Map && (resp['data'] as Map)['success'] == true);
                                ScaffoldMessenger.of(context).showSnackBar(
                                  SnackBar(
                                    content: Text(ok
                                        ? 'Return request submitted'
                                        : resp['message'] ?? 'Failed to create return'),
                                    backgroundColor: ok ? AppTheme.primary : AppTheme.sale,
                                  ),
                                );
                              }
                            } catch (e) {
                              if (ctx.mounted) Navigator.pop(ctx);
                              if (context.mounted) {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  SnackBar(content: Text('Error: $e'), backgroundColor: AppTheme.sale),
                                );
                              }
                            }
                          },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppTheme.primary,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      padding: const EdgeInsets.symmetric(vertical: 14),
                    ),
                    child: Text('Submit Request', style: GoogleFonts.poppins(color: Colors.white, fontWeight: FontWeight.w600)),
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}

// ==================== NOTIFICATION SHEET ====================

class _NotificationSheet extends StatelessWidget {
  final List<dynamic> notifications;

  const _NotificationSheet({required this.notifications});

  @override
  Widget build(BuildContext context) {
    return DraggableScrollableSheet(
      initialChildSize: 0.6,
      maxChildSize: 0.9,
      minChildSize: 0.3,
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
                width: 40, height: 4,
                decoration: BoxDecoration(
                  color: AppTheme.divider,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              Padding(
                padding: const EdgeInsets.all(20),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text('Notifications', style: GoogleFonts.poppins(fontSize: 20, fontWeight: FontWeight.w700)),
                    if (notifications.any((n) => n['is_read'] == false))
                      TextButton(
                        onPressed: () async {
                          await ApiService.put('${ApiConfig.notifications}/read-all');
                          if (context.mounted) Navigator.pop(context, {'read': true});
                        },
                        child: const Text('Mark all read'),
                      ),
                  ],
                ),
              ),
              if (notifications.isEmpty)
                Expanded(
                  child: Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.notifications_none, size: 60, color: AppTheme.textLight),
                        const SizedBox(height: 12),
                        Text('No notifications yet', style: GoogleFonts.poppins(color: AppTheme.textSecondary)),
                      ],
                    ),
                  ),
                )
              else
                Expanded(
                  child: ListView.separated(
                    controller: scrollController,
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    itemCount: notifications.length,
                    separatorBuilder: (_, _) => const Divider(height: 1),
                    itemBuilder: (context, i) {
                      final n = notifications[i];
                      final isUnread = n['is_read'] == false;
                      return ListTile(
                        leading: Container(
                          width: 40, height: 40,
                          decoration: BoxDecoration(
                            color: isUnread ? AppTheme.primaryExtraLight : AppTheme.background,
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: Icon(
                            n['type'] == 'order_refund' ? Icons.payment : Icons.notifications_outlined,
                            color: AppTheme.primary, size: 20,
                          ),
                        ),
                        title: Text(
                          n['title'] ?? 'Notification',
                          style: GoogleFonts.poppins(
                            fontWeight: isUnread ? FontWeight.w600 : FontWeight.normal,
                            fontSize: 14,
                          ),
                        ),
                        subtitle: Text(
                          n['message'] ?? '',
                          style: GoogleFonts.poppins(fontSize: 12, color: AppTheme.textSecondary),
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                        ),
                        trailing: isUnread
                            ? Container(
                                width: 8, height: 8,
                                decoration: const BoxDecoration(
                                  color: AppTheme.primary,
                                  shape: BoxShape.circle,
                                ),
                              )
                            : null,
                        onTap: () {
                          // Mark single notification as read
                        },
                      );
                    },
                  ),
                ),
            ],
          ),
        );
      },
    );
  }
}

