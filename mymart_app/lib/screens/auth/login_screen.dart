import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../config/theme.dart';
import '../../providers/auth_provider.dart';
import '../../providers/wishlist_provider.dart';
import '../../providers/cart_provider.dart';
import '../../services/api_service.dart';
import '../../config/api_config.dart';
import 'register_screen.dart';
import 'forgot_password_screen.dart';
import '../home/main_screen.dart';
import '../../widgets/animated_loader.dart';
import '../../localization/app_localizations.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> with SingleTickerProviderStateMixin {
  String Function(String) get t => AppLocalizations.of(context).translate;
  late TabController _tabController;

  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _obscurePassword = true;

  final _phoneController = TextEditingController();
  final _otpController = TextEditingController();
  bool _otpSent = false;

  bool _isLoading = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    _phoneController.dispose();
    _otpController.dispose();
    super.dispose();
  }

  Future<void> _emailPasswordLogin() async {
    if (_emailController.text.isEmpty || _passwordController.text.isEmpty) {
      setState(() => _error = 'Please enter all fields');
      return;
    }
    setState(() { _isLoading = true; _error = null; });
    try {
      final authProvider = Provider.of<AuthProvider>(context, listen: false);
      final success = await authProvider.login(_emailController.text.trim(), _passwordController.text.trim());
      if (success && mounted) {
        Provider.of<WishlistProvider>(context, listen: false).loadWishlist();
        Provider.of<CartProvider>(context, listen: false).loadCart();
        Navigator.of(context).pushReplacement(MaterialPageRoute(builder: (_) => const MainScreen()));
      }
    } catch (e) {
      setState(() => _error = 'Login failed. Please try again.');
    } finally {
      setState(() => _isLoading = false);
    }
  }

  Future<void> _sendPhoneOTP() async {
    if (_phoneController.text.isEmpty || _phoneController.text.length < 10) {
      setState(() => _error = 'Please enter a valid phone number');
      return;
    }
    String phone = _phoneController.text.trim();
    if (!phone.startsWith('+')) phone = '+1$phone';
    setState(() { _isLoading = true; _error = null; });
    try {
      final response = await ApiService.post(ApiConfig.sendOtp, body: {'phone': phone});
      if (response['success']) { setState(() => _otpSent = true); }
      else { setState(() => _error = response['message'] ?? 'Failed to send OTP'); }
    } catch (e) {
      setState(() => _error = t('network_error'));
    } finally { setState(() => _isLoading = false); }
  }

  Future<void> _verifyPhoneOTP() async {
    if (_otpController.text.length != 6) {
      setState(() => _error = 'Please enter valid OTP');
      return;
    }
    String phone = _phoneController.text.trim();
    if (!phone.startsWith('+')) phone = '+1$phone';
    setState(() { _isLoading = true; _error = null; });
    try {
      final response = await ApiService.post(ApiConfig.verifyOtp, body: {'phone': phone, 'otp': _otpController.text.trim()});
      if (response['success']) {
        final authProvider = Provider.of<AuthProvider>(context, listen: false);
        await authProvider.setUserFromResponse(response['data'] ?? {});
        if (!mounted) return;
        Navigator.of(context).pushReplacement(MaterialPageRoute(builder: (_) => const MainScreen()));
      } else { setState(() => _error = response['message'] ?? 'Invalid OTP'); }
    } catch (e) { setState(() => _error = t('network_error')); }
    finally { setState(() => _isLoading = false); }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.background,
      body: SafeArea(
        child: SingleChildScrollView(
          child: Column(
            children: [
              Container(
                width: double.infinity,
                padding: const EdgeInsets.fromLTRB(24, 40, 24, 40),
                decoration: BoxDecoration(
                  gradient: AppTheme.primaryGradientVertical,
                  borderRadius: const BorderRadius.vertical(bottom: Radius.circular(32)),
                ),
                child: Column(
                  children: [
                    Container(
                      width: 72,
                      height: 72,
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: 0.15),
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(Icons.shopping_bag_rounded, size: 36, color: Colors.white),
                    ),
                    const SizedBox(height: 20),
                    Text(
                      t('welcome_back'),
                      style: GoogleFonts.inter(
                        color: Colors.white,
                        fontSize: 26,
                        fontWeight: FontWeight.w800,
                        letterSpacing: -0.5,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      t('login_to_continue'),
                      style: GoogleFonts.inter(
                        color: Colors.white.withValues(alpha: 0.75),
                        fontSize: 15,
                        fontWeight: FontWeight.w400,
                      ),
                    ),
                  ],
                ),
              ),

              Padding(
                padding: const EdgeInsets.fromLTRB(24, 28, 24, 24),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      padding: const EdgeInsets.all(4),
                      decoration: BoxDecoration(
                        color: AppTheme.surface,
                        borderRadius: BorderRadius.circular(14),
                        boxShadow: AppTheme.shadowSm,
                      ),
                      child: Row(
                        children: [
                          Expanded(child: _buildTabItem(t('email_address'), 0)),
                          Expanded(child: _buildTabItem(t('phone_number'), 1)),
                        ],
                      ),
                    ),
                    const SizedBox(height: 28),
                    _tabController.index == 0 ? _buildEmailLogin() : _buildPhoneLogin(),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildTabItem(String label, int index) {
    final isSelected = _tabController.index == index;
    return GestureDetector(
      onTap: () { setState(() { _tabController.index = index; _error = null; }); },
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(vertical: 14),
        decoration: BoxDecoration(
          color: isSelected ? AppTheme.primary : Colors.transparent,
          borderRadius: BorderRadius.circular(11),
          boxShadow: isSelected ? AppTheme.shadowPrimary : null,
        ),
        child: Text(
          label,
          textAlign: TextAlign.center,
          style: GoogleFonts.inter(
            fontSize: 14,
            fontWeight: FontWeight.w600,
            color: isSelected ? Colors.white : AppTheme.textTertiary,
          ),
        ),
      ),
    );
  }

  Widget _buildEmailLogin() {
    return Column(
      children: [
        _buildTextField(
          controller: _emailController,
          hint: t('email_address'),
          icon: Icons.email_outlined,
          keyboardType: TextInputType.emailAddress,
        ),
        const SizedBox(height: 16),
        _buildTextField(
          controller: _passwordController,
          hint: t('password'),
          icon: Icons.lock_outlined,
          obscureText: _obscurePassword,
          suffix: IconButton(
            icon: Icon(
              _obscurePassword ? Icons.visibility_off_rounded : Icons.visibility_rounded,
              color: AppTheme.textTertiary, size: 20,
            ),
            onPressed: () => setState(() => _obscurePassword = !_obscurePassword),
          ),
        ),
        if (_error != null) _buildErrorText(),
        const SizedBox(height: 20),
        _buildPrimaryButton(
          label: t('login'),
          isLoading: _isLoading,
          onPressed: _isLoading ? null : _emailPasswordLogin,
        ),
        const SizedBox(height: 12),
        Center(
          child: TextButton(
            onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const ForgotPasswordScreen())),
            child: Text(t('forgot_password'), style: GoogleFonts.inter(fontSize: 13, color: AppTheme.textSecondary, fontWeight: FontWeight.w500)),
          ),
        ),
        const SizedBox(height: 16),
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(t('no_account'), style: GoogleFonts.inter(color: AppTheme.textSecondary, fontSize: 14)),
            TextButton(
              onPressed: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const RegisterScreen())),
              child: Text(t('sign_up'), style: GoogleFonts.inter(color: AppTheme.primary, fontWeight: FontWeight.w600, fontSize: 14)),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildPhoneLogin() {
    return Column(
      children: [
        _buildTextField(
          controller: _phoneController,
          hint: t('phone_number'),
          icon: Icons.phone_outlined,
          keyboardType: TextInputType.phone,
          prefix: "+1 ",
        ),
        if (_otpSent) ...[
          const SizedBox(height: 16),
          _buildTextField(
            controller: _otpController,
            hint: t('enter_otp'),
            icon: Icons.lock_outlined,
            keyboardType: TextInputType.number,
            maxLength: 6,
          ),
        ],
        if (_error != null) _buildErrorText(),
        const SizedBox(height: 20),
        _buildPrimaryButton(
          label: _otpSent ? t('verify_otp') : t('send_otp'),
          isLoading: _isLoading,
          onPressed: _isLoading ? null : (_otpSent ? _verifyPhoneOTP : _sendPhoneOTP),
        ),
        if (!_otpSent)
          Padding(
            padding: const EdgeInsets.only(top: 12),
            child: Text(t('otp_sent'), style: GoogleFonts.inter(fontSize: 12, color: AppTheme.textTertiary)),
          ),
      ],
    );
  }

  Widget _buildTextField({
    required TextEditingController controller,
    required String hint,
    required IconData icon,
    TextInputType? keyboardType,
    bool obscureText = false,
    Widget? suffix,
    String? prefix,
    int? maxLength,
  }) {
    return TextField(
      controller: controller,
      keyboardType: keyboardType,
      obscureText: obscureText,
      maxLength: maxLength,
      style: GoogleFonts.inter(fontSize: 15, color: AppTheme.textPrimary),
      decoration: InputDecoration(
        hintText: hint,
        hintStyle: GoogleFonts.inter(color: AppTheme.textTertiary),
        counterText: '',
        filled: true,
        fillColor: AppTheme.surface,
        prefixIcon: Padding(
          padding: const EdgeInsets.only(left: 16, right: 12),
          child: Icon(icon, color: AppTheme.textTertiary, size: 20),
        ),
        prefixIconConstraints: const BoxConstraints(minWidth: 48),
        prefix: prefix != null ? Text(prefix, style: GoogleFonts.inter(color: AppTheme.textPrimary, fontSize: 15)) : null,
        suffixIcon: suffix,
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: BorderSide.none),
        enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: BorderSide.none),
        focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: const BorderSide(color: AppTheme.primary, width: 2)),
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
      ),
    );
  }

  Widget _buildPrimaryButton({required String label, required bool isLoading, VoidCallback? onPressed}) {
    return SizedBox(
      width: double.infinity,
      height: 54,
      child: ElevatedButton(
        onPressed: onPressed,
        style: ElevatedButton.styleFrom(
          backgroundColor: AppTheme.primary,
          foregroundColor: Colors.white,
          elevation: 0,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
        ).copyWith(
          overlayColor: WidgetStateProperty.resolveWith<Color?>(
            (states) => states.contains(WidgetState.pressed) ? Colors.white.withValues(alpha: 0.2) : null,
          ),
        ),
        child: isLoading
            ? const SizedBox(
                width: 30,
                height: 30,
                child: DottedLoader(color: Colors.white, size: 30, dotSize: 7),
              )
            : Text(label, style: GoogleFonts.inter(fontSize: 15, fontWeight: FontWeight.w600, color: Colors.white)),
      ),
    );
  }

  Widget _buildErrorText() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(12),
      margin: const EdgeInsets.only(top: 14, bottom: 4),
      decoration: BoxDecoration(
        color: AppTheme.error.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppTheme.error.withValues(alpha: 0.2)),
      ),
      child: Row(
        children: [
          const Icon(Icons.error_outline, color: AppTheme.error, size: 18),
          const SizedBox(width: 8),
          Expanded(child: Text(_error!, style: GoogleFonts.inter(color: AppTheme.error, fontSize: 13))),
        ],
      ),
    );
  }
}
