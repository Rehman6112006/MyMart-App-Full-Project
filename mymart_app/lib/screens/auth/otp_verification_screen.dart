import 'dart:async';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../../config/theme.dart';
import '../../services/api_service.dart';
import '../../services/auth_service.dart';
import '../../config/api_config.dart';
import '../../providers/auth_provider.dart';
import '../../widgets/shimmer_loaders.dart';
import '../home/main_screen.dart';
import 'login_screen.dart';
import 'reset_password_screen.dart';

class OtpVerificationScreen extends StatefulWidget {
  final String email;
  final bool isReset;
  final bool isRegistration;

  const OtpVerificationScreen({
    super.key,
    required this.email,
    this.isReset = false,
    this.isRegistration = false,
  });

  @override
  State<OtpVerificationScreen> createState() => _OtpVerificationScreenState();
}

class _OtpVerificationScreenState extends State<OtpVerificationScreen> {
  final _otpController = TextEditingController();
  bool _isLoading = false;
  bool _resendDisabled = false;
  int _resendCountdown = 0;
  String? _error;
  Timer? _resendTimer;

  @override
  void dispose() {
    _otpController.dispose();
    _resendTimer?.cancel();
    super.dispose();
  }

  void _startResendTimer() {
    _resendDisabled = true;
    _resendCountdown = 60;
    setState(() {});

    _resendTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (_resendCountdown > 0) {
        _resendCountdown--;
        setState(() {});
      } else {
        _resendDisabled = false;
        timer.cancel();
        setState(() {});
      }
    });
  }

  Future<void> _verifyOtp() async {
    final otp = _otpController.text.trim();

    if (otp.isEmpty || otp.length < 4) {
      setState(() => _error = 'Please enter valid OTP');
      return;
    }

    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final String endpoint = widget.isReset
          ? ApiConfig.verifyForgotPasswordOtp
          : ApiConfig.verifyOtp;

      final response = await ApiService.post(
        endpoint,
        body: {
          'email': widget.email,
          'otp': otp,
        },
      );

      if (response['success']) {
        if (widget.isReset) {
          if (!mounted) return;
          Navigator.pushReplacement(
            context,
            MaterialPageRoute(
              builder: (_) => ResetPasswordScreen(
                email: widget.email,
                otp: otp,
              ),
            ),
          );
        } else {
          if (widget.isRegistration) {
            final data = response['data'] ?? {};
            if (data['token'] != null) {
              await AuthService.saveToken(data['token']);
              await ApiService.saveUserData(data);
            }
            if (!mounted) return;
            final authProvider = Provider.of<AuthProvider>(context, listen: false);
            await authProvider.setUserFromResponse(data);
          } else {
            if (!mounted) return;
            final authProvider = Provider.of<AuthProvider>(context, listen: false);
            await authProvider.setUserFromResponse(response['data'] ?? {});
          }

          if (!mounted) return;
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(widget.isRegistration ? 'Account created successfully!' : 'Account verified successfully!'),
              backgroundColor: AppTheme.primary,
            ),
          );

          await Future.delayed(const Duration(seconds: 1));

          if (!mounted) return;
          Navigator.pushReplacement(
            context,
            MaterialPageRoute(builder: (_) => const MainScreen()),
          );
        }
      } else {
        setState(() {
          _error = response['message'] ?? 'Invalid OTP. Please try again.';
          _otpController.clear();
        });
      }
    } catch (e) {
      setState(() {
        _error = 'Network error. Please try again.';
      });
    } finally {
      setState(() {
        _isLoading = false;
      });
    }
  }

  Future<void> _resendOtp() async {
    if (_resendDisabled) return;

    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final String endpoint = widget.isReset
          ? ApiConfig.sendForgotPasswordOtp
          : ApiConfig.resendOtp;

      final response = await ApiService.post(
        endpoint,
        body: {'email': widget.email},
      );

      if (response['success']) {
        _startResendTimer();
        setState(() {
          _error = null;
          _otpController.clear();
        });
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('OTP resent successfully!'),
            backgroundColor: AppTheme.primary,
          ),
        );
      } else {
        setState(() {
          _error = response['message'] ?? 'Failed to resend OTP';
        });
      }
    } catch (e) {
      setState(() {
        _error = 'Network error. Please try again.';
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
      appBar: AppBar(
        backgroundColor: AppTheme.surface,
        elevation: 0,
        leading: IconButton(
          icon: Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: AppTheme.background,
              shape: BoxShape.circle,
            ),
            child: const Icon(Icons.arrow_back_ios_new, size: 18, color: AppTheme.textPrimary),
          ),
          onPressed: () => Navigator.pop(context),
        ),
        title: Text(
          widget.isReset ? 'Reset Password' : 'Verify OTP',
          style: GoogleFonts.poppins(fontWeight: FontWeight.w600),
        ),
        centerTitle: true,
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              const SizedBox(height: 40),
              Container(
                padding: const EdgeInsets.all(24),
                decoration: BoxDecoration(
                  color: AppTheme.primaryExtraLight,
                  shape: BoxShape.circle,
                ),
                child: const Icon(
                  Icons.mark_email_unread,
                  size: 64,
                  color: AppTheme.primary,
                ),
              ),
              const SizedBox(height: 32),
              Text(
                widget.isReset ? 'Reset Your Password' : 'Verify Your Email',
                style: GoogleFonts.poppins(
                  fontSize: 24,
                  fontWeight: FontWeight.w700,
                  color: AppTheme.textPrimary,
                ),
              ),
              const SizedBox(height: 12),
              Text(
                'Enter the OTP sent to\n${widget.email}',
                style: GoogleFonts.poppins(
                  fontSize: 14,
                  color: AppTheme.textSecondary,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 40),
              if (_error != null)
                Container(
                  padding: const EdgeInsets.all(12),
                  margin: const EdgeInsets.only(bottom: 20),
                  decoration: BoxDecoration(
                    color: AppTheme.saleLight,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: AppTheme.sale.withValues(alpha: 0.3)),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.error_outline, color: AppTheme.sale, size: 20),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          _error!,
                          style: GoogleFonts.poppins(color: AppTheme.sale, fontSize: 13),
                        ),
                      ),
                    ],
                  ),
                ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                decoration: BoxDecoration(
                  color: AppTheme.surface,
                  borderRadius: BorderRadius.circular(16),
                  boxShadow: [
                    BoxShadow(
                      color: AppTheme.cardShadow,
                      blurRadius: 10,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: TextFormField(
                  controller: _otpController,
                  keyboardType: TextInputType.number,
                  maxLength: 6,
                  textAlign: TextAlign.center,
                  style: GoogleFonts.poppins(
                    fontSize: 24,
                    fontWeight: FontWeight.w700,
                    letterSpacing: 8,
                  ),
                  decoration: InputDecoration(
                    hintText: '------',
                    hintStyle: GoogleFonts.poppins(
                      fontSize: 24,
                      fontWeight: FontWeight.w700,
                      color: AppTheme.textLight,
                      letterSpacing: 8,
                    ),
                    border: InputBorder.none,
                    counterText: '',
                  ),
                ),
              ),
              const SizedBox(height: 8),
              Text(
                'Enter 6-digit OTP',
                style: GoogleFonts.poppins(
                  fontSize: 12,
                  color: AppTheme.textLight,
                ),
              ),
              const SizedBox(height: 32),
              SizedBox(
                width: double.infinity,
                height: 56,
                child: ElevatedButton(
                  onPressed: _isLoading ? null : _verifyOtp,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppTheme.primary,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(16),
                    ),
                    elevation: 3,
                    shadowColor: AppTheme.primary.withValues(alpha: 0.3),
                  ),
                  child: _isLoading
                      ? const ButtonLoader(text: 'Verifying')
                      : Text(
                          'Verify OTP',
                          style: GoogleFonts.poppins(
                            fontSize: 16,
                            fontWeight: FontWeight.w600,
                            color: Colors.white,
                          ),
                        ),
                ),
              ),
              const SizedBox(height: 24),
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(
                    "Didn't receive OTP? ",
                    style: GoogleFonts.poppins(color: AppTheme.textSecondary),
                  ),
                  TextButton(
                    onPressed: _resendDisabled || _isLoading ? null : _resendOtp,
                    child: Text(
                      _resendDisabled
                          ? 'Resend in $_resendCountdown s'
                          : 'Resend OTP',
                      style: GoogleFonts.poppins(
                        color: _resendDisabled ? AppTheme.textLight : AppTheme.primary,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              TextButton(
                onPressed: () {
                  Navigator.of(context).pushReplacement(
                    MaterialPageRoute(builder: (_) => const LoginScreen()),
                  );
                },
                child: Text(
                  'Back to Login',
                  style: GoogleFonts.poppins(
                    color: AppTheme.textSecondary,
                    fontWeight: FontWeight.w500,
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