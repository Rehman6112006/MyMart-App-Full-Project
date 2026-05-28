import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../config/theme.dart';
import '../../services/api_service.dart';
import '../../config/api_config.dart';
import '../../widgets/animated_loader.dart';
import 'login_screen.dart';
import 'otp_verification_screen.dart';
import '../../localization/app_localizations.dart';

class RegisterScreen extends StatefulWidget {
  const RegisterScreen({super.key});

  @override
  State<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> {
  String Function(String) get t => AppLocalizations.of(context).translate;
  final _firstNameController = TextEditingController();
  final _lastNameController = TextEditingController();
  final _emailController = TextEditingController();
  final _phoneController = TextEditingController();
  final _passwordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();
  bool _obscurePassword = true;
  bool _obscureConfirmPassword = true;
  bool _isLoading = false;
  String? _error;
  bool _registrationSuccess = false;

  @override
  void dispose() {
    _firstNameController.dispose();
    _lastNameController.dispose();
    _emailController.dispose();
    _phoneController.dispose();
    _passwordController.dispose();
    _confirmPasswordController.dispose();
    super.dispose();
  }

  Future<void> _register() async {
    final t = AppLocalizations.of(context).translate;
    if (_firstNameController.text.isEmpty || _lastNameController.text.isEmpty || _emailController.text.isEmpty || _passwordController.text.isEmpty) {
      setState(() => _error = 'Please fill all required fields');
      return;
    }

    if (_passwordController.text != _confirmPasswordController.text) {
      setState(() => _error = t('passwords_no_match'));
      return;
    }

    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final response = await ApiService.post(
        ApiConfig.register,
        body: {
          'first_name': _firstNameController.text.trim(),
          'last_name': _lastNameController.text.trim(),
          'email': _emailController.text.trim(),
          'phone': _phoneController.text.trim(),
          'password': _passwordController.text,
        },
      );

      if (response['success']) {
        setState(() {
          _registrationSuccess = true;
        });
      } else {
        setState(() {
          _error = response['message'] ?? t('registration_failed');
        });
      }
    } catch (e) {
      setState(() {
        _error = t('network_error');
      });
    } finally {
      setState(() {
        _isLoading = false;
      });
    }
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
                      t('create_account'),
                      style: GoogleFonts.inter(
                        color: Colors.white,
                        fontSize: 26,
                        fontWeight: FontWeight.w800,
                        letterSpacing: -0.5,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      t('create_account'),
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
                child: _registrationSuccess
                    ? _buildSuccessMessage()
                    : _buildRegistrationForm(),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildSuccessMessage() {
    return Column(
      children: [
        Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: AppTheme.success.withValues(alpha: 0.1),
            borderRadius: BorderRadius.circular(20),
          ),
          child: const Icon(
            Icons.check_circle_outline,
            size: 64,
            color: AppTheme.success,
          ),
        ),
        const SizedBox(height: 16),
        Text(
          t('registration_successful'),
          style: GoogleFonts.inter(
            fontSize: 20,
            fontWeight: FontWeight.w700,
            color: AppTheme.textPrimary,
          ),
        ),
        const SizedBox(height: 8),
        Text(
          t('check_email_otp'),
          textAlign: TextAlign.center,
          style: GoogleFonts.inter(
            fontSize: 14,
            color: AppTheme.textSecondary,
          ),
        ),
        const SizedBox(height: 20),
        SizedBox(
          width: double.infinity,
          child: ElevatedButton(
            onPressed: () {
              Navigator.of(context).pushReplacement(
                MaterialPageRoute(
                  builder: (_) => OtpVerificationScreen(
                    email: _emailController.text.trim(),
                  ),
                ),
              );
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: AppTheme.primary,
              padding: const EdgeInsets.symmetric(vertical: 18),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(14),
              ),
            ),
            child: Text(
              t('verify_otp'),
              style: GoogleFonts.inter(
                fontSize: 16,
                fontWeight: FontWeight.w600,
                color: Colors.white,
              ),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildRegistrationForm() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const SizedBox(height: 4),
        Row(
          children: [
            Expanded(
              child: _buildTextField(
                controller: _firstNameController,
                hint: t('first_name'),
                icon: Icons.person_outline,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: _buildTextField(
                controller: _lastNameController,
                hint: t('last_name'),
                icon: Icons.person_outline,
              ),
            ),
          ],
        ),
        const SizedBox(height: 16),
        _buildTextField(
          controller: _emailController,
          hint: t('email_address'),
          icon: Icons.email_outlined,
          keyboardType: TextInputType.emailAddress,
        ),
        const SizedBox(height: 16),
        _buildTextField(
          controller: _phoneController,
          hint: t('phone_number'),
          icon: Icons.phone_outlined,
          keyboardType: TextInputType.phone,
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
        const SizedBox(height: 16),
        _buildTextField(
          controller: _confirmPasswordController,
          hint: t('confirm_password'),
          icon: Icons.lock_outlined,
          obscureText: _obscureConfirmPassword,
          suffix: IconButton(
            icon: Icon(
              _obscureConfirmPassword ? Icons.visibility_off_rounded : Icons.visibility_rounded,
              color: AppTheme.textTertiary, size: 20,
            ),
            onPressed: () => setState(() => _obscureConfirmPassword = !_obscureConfirmPassword),
          ),
        ),
        if (_error != null) _buildErrorText(),
        const SizedBox(height: 20),
        _buildPrimaryButton(
          label: t('sign_up'),
          isLoading: _isLoading,
          onPressed: _isLoading ? null : _register,
        ),
        const SizedBox(height: 16),
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(t('have_account'), style: GoogleFonts.inter(color: AppTheme.textSecondary, fontSize: 14)),
            TextButton(
              onPressed: () {
                Navigator.of(context).pushReplacement(
                  MaterialPageRoute(builder: (_) => const LoginScreen()),
                );
              },
              child: Text(t('sign_in'), style: GoogleFonts.inter(color: AppTheme.primary, fontWeight: FontWeight.w600, fontSize: 14)),
            ),
          ],
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
  }) {
    return TextField(
      controller: controller,
      keyboardType: keyboardType,
      obscureText: obscureText,
      style: GoogleFonts.inter(fontSize: 15, color: AppTheme.textPrimary),
      decoration: InputDecoration(
        hintText: hint,
        hintStyle: GoogleFonts.inter(color: AppTheme.textTertiary),
        filled: true,
        fillColor: AppTheme.surface,
        prefixIcon: Padding(
          padding: const EdgeInsets.only(left: 16, right: 12),
          child: Icon(icon, color: AppTheme.textTertiary, size: 20),
        ),
        prefixIconConstraints: const BoxConstraints(minWidth: 48),
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
