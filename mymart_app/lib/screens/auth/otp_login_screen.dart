import 'dart:async';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../../config/theme.dart';
import '../../services/api_service.dart';
import '../../config/api_config.dart';
import '../../providers/auth_provider.dart';
import '../../widgets/shimmer_loaders.dart';
import '../home/main_screen.dart';

class OtpLoginScreen extends StatefulWidget {
  const OtpLoginScreen({super.key});

  @override
  State<OtpLoginScreen> createState() => _OtpLoginScreenState();
}

class _OtpLoginScreenState extends State<OtpLoginScreen> {
  final _emailController = TextEditingController();
  final _otpController = TextEditingController();
  bool _isLoading = false;
  bool _otpSent = false;
  bool _resendDisabled = false;
  int _resendCountdown = 0;
  String? _error;
  Timer? _resendTimer;

  @override
  void dispose() {
    _emailController.dispose();
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

  Future<void> _sendOtp() async {
    final email = _emailController.text.trim();

    if (email.isEmpty || !email.contains('@')) {
      setState(() => _error = 'Please enter a valid email');
      return;
    }

    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final response = await ApiService.post(
        ApiConfig.sendOtp,
        body: {'email': email},
      );

      if (response['success']) {
        setState(() {
          _otpSent = true;
          _error = null;
        });
        _startResendTimer();
      } else {
        setState(() {
          _error = response['message'] ?? 'Failed to send OTP';
        });
      }
    } catch (e) {
      setState(() {
        _error = 'Network error: ${e.toString()}';
      });
    } finally {
      setState(() {
        _isLoading = false;
      });
    }
  }

  Future<void> _verifyOtp() async {
    final email = _emailController.text.trim();
    final otp = _otpController.text.trim();

    if (otp.length != 6) {
      setState(() => _error = 'OTP must be 6 digits');
      return;
    }

    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final response = await ApiService.post(
        ApiConfig.verifyOtp,
        body: {'email': email, 'otp': otp},
      );

      if (response['success']) {
        if (!mounted) return;
        final authProvider = Provider.of<AuthProvider>(context, listen: false);
        await authProvider.setUserFromResponse(response['data']);

        if (!mounted) return;
        // Show success message and navigate
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('✅ Login successful!'),
            backgroundColor: Colors.green,
            duration: Duration(seconds: 2),
          ),
        );

        // Wait for snackbar to show then navigate
        await Future.delayed(const Duration(seconds: 1));

        if (!mounted) return;
        Navigator.pushReplacement(
          context,
          MaterialPageRoute(builder: (_) => const MainScreen()),
        );
      } else {
        setState(() {
          _error = response['message'] ?? 'Invalid OTP';
          _otpController.clear();
        });
      }
    } catch (e) {
      setState(() {
        _error = 'Network error: ${e.toString()}';
      });
    } finally {
      setState(() {
        _isLoading = false;
      });
    }
  }

  Future<void> _resendOtp() async {
    if (_resendDisabled) return;

    final email = _emailController.text.trim();

    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final response = await ApiService.post(
        ApiConfig.resendOtp,
        body: {'email': email},
      );

      if (response['success']) {
        _startResendTimer();
        setState(() {
          _error = null;
          _otpController.clear();
        });
      } else {
        setState(() {
          _error = response['message'] ?? 'Failed to resend OTP';
        });
      }
    } catch (e) {
      setState(() {
        _error = 'Network error: ${e.toString()}';
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
      backgroundColor: AppTheme.primary,
      body: SingleChildScrollView(
        child: SizedBox(
          height: MediaQuery.of(context).size.height,
          child: Column(
            children: [
              // Logo Section
              Expanded(
                flex: 2,
                child: Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Image.asset(
                        'assets/images/logo.png',
                        width: 120,
                        height: 120,
                        fit: BoxFit.contain,
                      ),
                      const SizedBox(height: 20),
                      Text(
                        'MyMart',
                        style: GoogleFonts.poppins(
                          fontSize: 32,
                          fontWeight: FontWeight.bold,
                          color: Colors.white,
                        ),
                      ),
                    ],
                  ),
                ),
              ),

              // Form Section
              Expanded(
                flex: 3,
                child: Container(
                  decoration: const BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.only(
                      topLeft: Radius.circular(30),
                      topRight: Radius.circular(30),
                    ),
                  ),
                  padding: const EdgeInsets.all(30),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      const SizedBox(height: 20),
                      Text(
                        _otpSent ? 'Verify OTP' : 'Login with OTP',
                        style: GoogleFonts.poppins(
                          fontSize: 24,
                          fontWeight: FontWeight.bold,
                          color: AppTheme.primary,
                        ),
                        textAlign: TextAlign.center,
                      ),
                      const SizedBox(height: 10),
                      Text(
                        _otpSent
                            ? 'Enter the OTP sent to ${_emailController.text}'
                            : 'Enter your email to receive OTP',
                        style: GoogleFonts.poppins(
                          fontSize: 14,
                          color: Colors.grey[600],
                        ),
                        textAlign: TextAlign.center,
                      ),
                      const SizedBox(height: 30),

                      // Error Message
                      if (_error != null)
                        Container(
                          padding: const EdgeInsets.all(12),
                          margin: const EdgeInsets.only(bottom: 20),
                          decoration: BoxDecoration(
                            color: AppTheme.error.withValues(alpha: 0.1),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Text(
                            _error!,
                            textAlign: TextAlign.center,
                            style: GoogleFonts.poppins(
                              color: AppTheme.error,
                              fontSize: 14,
                            ),
                          ),
                        ),

                      // Email Field
                      if (!_otpSent)
                        Column(
                          children: [
                            TextFormField(
                              controller: _emailController,
                              keyboardType: TextInputType.emailAddress,
                              decoration: InputDecoration(
                                labelText: 'Email Address',
                                labelStyle: GoogleFonts.poppins(),
                                prefixIcon: const Icon(Icons.email_outlined),
                                border: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(12),
                                ),
                                focusedBorder: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(12),
                                  borderSide: BorderSide(
                                    color: AppTheme.primary,
                                  ),
                                ),
                              ),
                              style: GoogleFonts.poppins(),
                              validator: (value) {
                                if (value == null || value.isEmpty) {
                                  return 'Please enter email';
                                }
                                if (!value.contains('@')) {
                                  return 'Please enter valid email';
                                }
                                return null;
                              },
                            ),
                            const SizedBox(height: 20),
                          ],
                        ),

                      // OTP Fields
                      if (_otpSent)
                        Column(
                          children: [
                            TextFormField(
                              controller: _otpController,
                              keyboardType: TextInputType.number,
                              maxLength: 6,
                              decoration: InputDecoration(
                                labelText: 'OTP Code',
                                labelStyle: GoogleFonts.poppins(),
                                prefixIcon: const Icon(Icons.lock_outline),
                                border: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(12),
                                ),
                                focusedBorder: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(12),
                                  borderSide: BorderSide(
                                    color: AppTheme.primary,
                                  ),
                                ),
                                hintText: '000000',
                              ),
                              style: GoogleFonts.poppins(
                                fontSize: 18,
                                letterSpacing: 4,
                              ),
                              textAlign: TextAlign.center,
                            ),
                            const SizedBox(height: 20),

                            // Resend OTP Button
                            Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Text(
                                  'Didn\'t receive OTP? ',
                                  style: GoogleFonts.poppins(
                                    color: Colors.grey[600],
                                  ),
                                ),
                                TextButton(
                                  onPressed: _resendDisabled
                                      ? null
                                      : _resendOtp,
                                  child: Text(
                                    _resendDisabled
                                        ? 'Resend ($_resendCountdown)'
                                        : 'Resend OTP',
                                    style: GoogleFonts.poppins(
                                      color: _resendDisabled
                                          ? Colors.grey
                                          : AppTheme.primary,
                                      fontWeight: FontWeight.w500,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 20),
                          ],
                        ),

                      // Submit Button
                      ElevatedButton(
                        onPressed: _isLoading
                            ? null
                            : (_otpSent ? _verifyOtp : _sendOtp),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppTheme.primary,
                          padding: const EdgeInsets.symmetric(vertical: 16),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(16),
                          ),
                          elevation: 3,
                          shadowColor: AppTheme.primary.withValues(alpha: 0.3),
                        ),
                        child: _isLoading
                            ? ButtonLoader(text: _otpSent ? 'Verifying' : 'Sending')
                            : Text(
                                _otpSent ? 'Verify OTP' : 'Send OTP',
                                style: GoogleFonts.poppins(
                                  fontSize: 18,
                                  fontWeight: FontWeight.bold,
                                  color: Colors.white,
                                ),
                              ),
                      ),

                      const SizedBox(height: 20),

                      // Forgot Password Button
                      if (!_otpSent)
                        TextButton(
                          onPressed: () {
                            Navigator.pushNamed(context, '/forgot-password');
                          },
                          child: Text(
                            'Forgot Password?',
                            style: GoogleFonts.poppins(
                              color: Colors.grey[600],
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ),

                      const SizedBox(height: 20),

                      // Back to Login
                      TextButton(
                        onPressed: () {
                          Navigator.pop(context);
                        },
                        child: Text(
                          'Back to Password Login',
                          style: GoogleFonts.poppins(
                            color: AppTheme.primary,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ),
                    ],
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
