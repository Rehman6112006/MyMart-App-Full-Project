import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Store as ShopIcon, Mail, Lock, Eye, EyeOff, AlertCircle, ShoppingBag, Star, TrendingUp, Users, ArrowLeft, KeyRound, CheckCircle } from 'lucide-react'
import { sendForgotPasswordOTP, verifyForgotPasswordOTP, resetPassword } from '../services/api'

const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Invalid email address'),
  password: z.string().min(1, 'Password is required').min(6, 'Password must be at least 6 characters'),
})

const registerSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(50),
  lastName: z.string().max(50).optional(),
  email: z.string().min(1, 'Email is required').email('Invalid email address'),
  phone: z.string().optional(),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string().min(1, 'Please confirm your password'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})

export default function Login() {
  const { login, register: registerUser, error } = useAuth()
  const navigate = useNavigate()
  const [view, setView] = useState('login')
  const [showPassword, setShowPassword] = useState(false)
  const [regSuccess, setRegSuccess] = useState(false)
  const [formError, setFormError] = useState('')

  // Forgot password state
  const [fpStep, setFpStep] = useState(1)
  const [fpEmail, setFpEmail] = useState('')
  const [fpOtp, setFpOtp] = useState('')
  const [fpLoading, setFpLoading] = useState(false)
  const [fpSuccess, setFpSuccess] = useState('')

  const loginForm = useForm({
    resolver: zodResolver(loginSchema),
  })

  const registerForm = useForm({
    resolver: zodResolver(registerSchema),
  })

  const onLogin = async (data) => {
    setFormError('')
    const result = await login(data.email, data.password)
    if (result.success) {
      navigate('/')
    } else {
      setFormError(result.error || 'Login failed')
    }
  }

  const onRegister = async (data) => {
    setFormError('')
    const result = await registerUser({
      firstName: data.firstName,
      lastName: data.lastName || '',
      email: data.email,
      phone: data.phone || '',
      password: data.password,
      role: 'vendor',
    })
    if (result.success) {
      setRegSuccess(true)
      setTimeout(() => {
        setRegSuccess(false)
        registerForm.reset()
        setView('login')
        loginForm.setValue('email', data.email)
      }, 3000)
    } else {
      setFormError(result.error || 'Registration failed')
    }
  }

  const handleSendOtp = async () => {
    if (!fpEmail || !fpEmail.includes('@')) {
      setFormError('Please enter a valid email address')
      return
    }
    setFormError('')
    setFpLoading(true)
    try {
      const res = await sendForgotPasswordOTP(fpEmail)
      if (res.data.success) {
        setFpStep(2)
        setFpSuccess('OTP sent! Check your email inbox.')
      } else {
        setFormError(res.data.error || 'Failed to send OTP')
      }
    } catch (err) {
      setFormError(err.response?.data?.error || 'Failed to send OTP. Try again.')
    }
    setFpLoading(false)
  }

  const handleVerifyOtp = async () => {
    if (!fpOtp || fpOtp.length < 4) {
      setFormError('Please enter the OTP code')
      return
    }
    setFormError('')
    setFpLoading(true)
    try {
      const res = await verifyForgotPasswordOTP(fpEmail, fpOtp)
      if (res.data.success) {
        setFpStep(3)
        setFpSuccess('OTP verified! Set your new password.')
      } else {
        setFormError(res.data.error || 'Invalid OTP')
      }
    } catch (err) {
      setFormError(err.response?.data?.error || 'Invalid or expired OTP')
    }
    setFpLoading(false)
  }

  const handleResetPassword = async (newPassword) => {
    setFormError('')
    setFpLoading(true)
    try {
      const res = await resetPassword(fpEmail, fpOtp, newPassword)
      if (res.data.success) {
        setFpStep(4)
        setFpSuccess('Password reset successfully! You can now login.')
      } else {
        setFormError(res.data.error || 'Failed to reset password')
      }
    } catch (err) {
      setFormError(err.response?.data?.error || 'Failed to reset password. Try again.')
    }
    setFpLoading(false)
  }

  const vendorFeatures = [
    { icon: <ShopIcon size={22} />, title: 'Manage Your Store', desc: 'Customize your online store with your brand' },
    { icon: <ShoppingBag size={22} />, title: 'Product Management', desc: 'Add, edit, and organize products with images' },
    { icon: <Star size={22} />, title: 'Order Tracking', desc: 'Monitor customer orders in real-time' },
    { icon: <TrendingUp size={22} />, title: 'Analytics Dashboard', desc: 'Track sales, revenue, and insights' },
    { icon: <Users size={22} />, title: 'Customer Reviews', desc: 'Manage feedback and build trust' },
  ]

  return (
    <div className="min-h-screen flex">
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-white relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-emerald-500 to-green-500" />
        <div className="w-full max-w-md relative z-10">
          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.5, type: 'spring' }} className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-200">
              <ShopIcon size={24} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent">MyMart</h1>
              <p className="text-sm text-gray-500">Vendor Portal</p>
            </div>
          </motion.div>

          {view === 'login' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
              <h2 className="text-2xl font-bold text-gray-900 mb-1">Welcome Back</h2>
              <p className="text-gray-500 mb-6">Sign in to manage your store</p>

              {(formError || error) && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm mb-5 flex items-center gap-2" role="alert">
                  <AlertCircle size={16} /> {formError || error}
                </div>
              )}

              {regSuccess && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm mb-5">
                  Registration submitted! Admin will review your account.
                </div>
              )}

              {(loginForm.formState.errors.root || error) && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm mb-5 flex items-center gap-2" role="alert">
                  <AlertCircle size={16} /> {loginForm.formState.errors.root?.message || error}
                </div>
              )}

              <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-5" noValidate>
                <div>
                  <label htmlFor="login-email" className="block text-sm font-semibold text-gray-700 mb-2">Email Address</label>
                  <div className="relative">
                    <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      id="login-email"
                      type="email"
                      {...loginForm.register('email')}
                      placeholder="Enter your email"
                      className={`w-full pl-12 pr-4 py-3.5 border rounded-xl outline-none transition-all bg-white/50 text-sm ${
                        loginForm.formState.errors.email
                          ? 'border-red-300 focus:ring-2 focus:ring-red-500/30 focus:border-red-500'
                          : 'border-gray-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent'
                      }`}
                    />
                  </div>
                  {loginForm.formState.errors.email && (
                    <p className="text-xs text-red-500 mt-1.5" role="alert">{loginForm.formState.errors.email.message}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="login-password" className="block text-sm font-semibold text-gray-700 mb-2">Password</label>
                  <div className="relative">
                    <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      id="login-password"
                      type={showPassword ? 'text' : 'password'}
                      {...loginForm.register('password')}
                      placeholder="Enter password"
                      className={`w-full pl-12 pr-12 py-3.5 border rounded-xl outline-none transition-all bg-white/50 text-sm ${
                        loginForm.formState.errors.password
                          ? 'border-red-300 focus:ring-2 focus:ring-red-500/30 focus:border-red-500'
                          : 'border-gray-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent'
                      }`}
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                  {loginForm.formState.errors.password && (
                    <p className="text-xs text-red-500 mt-1.5" role="alert">{loginForm.formState.errors.password.message}</p>
                  )}
                </div>

                <div className="flex justify-end">
                  <button type="button" className="text-sm text-emerald-600 hover:text-emerald-700 font-medium" onClick={() => { setView('forgot'); setFormError(''); setFpEmail(loginForm.getValues('email') || ''); }}>
                    Forgot Password?
                  </button>
                </div>

                <motion.button type="submit" disabled={loginForm.formState.isSubmitting}
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  className="w-full py-4 bg-gradient-to-r from-emerald-600 to-green-600 text-white font-semibold rounded-xl hover:from-emerald-700 hover:to-green-700 transition-all shadow-lg shadow-emerald-500/30 disabled:opacity-50 flex items-center justify-center gap-2">
                  {loginForm.formState.isSubmitting ? (
                    <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Signing in...</>
                  ) : 'Sign In'}
                </motion.button>
              </form>

              <div className="text-center mt-6 text-sm text-gray-500">
                New vendor? <button type="button" className="text-emerald-600 hover:text-emerald-700 font-medium" onClick={() => { setView('register'); setFormError(''); }}>Register here</button>
              </div>
            </motion.div>
          )}

          {view === 'forgot' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <button type="button" className="text-sm text-gray-500 mb-2 hover:text-gray-700 flex items-center gap-1" onClick={() => { setView('login'); setFormError(''); setFpSuccess(''); setFpStep(1); }}>
                <ArrowLeft size={14} /> Back to Login
              </button>
              <h2 className="text-2xl font-bold text-gray-900 mb-1">Reset Password</h2>
              <p className="text-gray-500 mb-6">
                {fpStep === 1 && 'Enter your email to receive an OTP'}
                {fpStep === 2 && 'Enter the OTP sent to your email'}
                {fpStep === 3 && 'Choose your new password'}
              </p>

              {formError && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm mb-5 flex items-center gap-2" role="alert">
                  <AlertCircle size={16} /> {formError}
                </div>
              )}

              {fpSuccess && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm mb-5 flex items-center gap-2">
                  <CheckCircle size={16} /> {fpSuccess}
                </div>
              )}

              {/* Step 1: Email */}
              {fpStep === 1 && (
                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Email Address</label>
                    <div className="relative">
                      <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="email"
                        value={fpEmail}
                        onChange={(e) => setFpEmail(e.target.value)}
                        placeholder="Enter your registered email"
                        className="w-full pl-12 pr-4 py-3.5 border border-gray-200 rounded-xl outline-none transition-all bg-white/50 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                  <motion.button
                    onClick={handleSendOtp}
                    disabled={fpLoading}
                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                    className="w-full py-4 bg-gradient-to-r from-emerald-600 to-green-600 text-white font-semibold rounded-xl hover:from-emerald-700 hover:to-green-700 transition-all shadow-lg shadow-emerald-500/30 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {fpLoading ? (
                      <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Sending OTP...</>
                    ) : (
                      <><Mail size={18} /> Send OTP</>
                    )}
                  </motion.button>
                </div>
              )}

              {/* Step 2: OTP */}
              {fpStep === 2 && (
                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">OTP Code</label>
                    <div className="relative">
                      <KeyRound size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        value={fpOtp}
                        onChange={(e) => setFpOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        placeholder="Enter 6-digit OTP"
                        maxLength={6}
                        className="w-full pl-12 pr-4 py-3.5 border border-gray-200 rounded-xl outline-none transition-all bg-white/50 text-sm text-center tracking-[8px] font-mono text-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      />
                    </div>
                    <p className="text-xs text-gray-400 mt-2">Enter the 6-digit code sent to <strong>{fpEmail}</strong></p>
                  </div>
                  <motion.button
                    onClick={handleVerifyOtp}
                    disabled={fpLoading || fpOtp.length < 4}
                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                    className="w-full py-4 bg-gradient-to-r from-emerald-600 to-green-600 text-white font-semibold rounded-xl hover:from-emerald-700 hover:to-green-700 transition-all shadow-lg shadow-emerald-500/30 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {fpLoading ? (
                      <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Verifying...</>
                    ) : (
                      <><CheckCircle size={18} /> Verify OTP</>
                    )}
                  </motion.button>
                  <div className="text-center">
                    <button type="button" className="text-sm text-emerald-600 hover:text-emerald-700 font-medium" onClick={() => { setFpStep(1); setFormError(''); setFpOtp(''); }}>
                      Change email or resend
                    </button>
                  </div>
                </div>
              )}

              {/* Step 3: New Password */}
              {fpStep === 3 && (
                <Step3ResetPassword
                  loading={fpLoading}
                  onSubmit={handleResetPassword}
                />
              )}
              {fpStep === 4 && (
                <div className="text-center py-8 space-y-4">
                  <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto">
                    <CheckCircle size={36} className="text-green-600" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">Password Reset Successfully!</h3>
                  <p className="text-gray-500">You can now login with your new password.</p>
                  <motion.button
                    onClick={() => { setView('login'); setFpStep(1); setFpOtp(''); setFpEmail(''); setFpSuccess(''); }}
                    whileHover={{ scale: 1.02 }}
                    className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-green-600 text-white font-semibold rounded-xl"
                  >
                    Go to Login
                  </motion.button>
                </div>
              )}
            </motion.div>
          )}

          {view === 'register' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <button type="button" className="text-sm text-gray-500 mb-2 hover:text-gray-700" onClick={() => { setView('login'); setFormError(''); }}>← Back to Login</button>
              <h2 className="text-2xl font-bold text-gray-900 mb-1">Create Vendor Account</h2>
              <p className="text-gray-500 mb-6">Start selling on MyMart today</p>

              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm mb-4 flex items-center gap-2" role="alert">
                  <AlertCircle size={16} /> {formError}
                </div>
              )}

              <form onSubmit={registerForm.handleSubmit(onRegister)} className="space-y-4" noValidate>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="reg-firstName" className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
                    <input id="reg-firstName" {...registerForm.register('firstName')} placeholder="First name"
                      className={`w-full px-4 py-3 border rounded-xl outline-none transition-all text-sm ${
                        registerForm.formState.errors.firstName
                          ? 'border-red-300 focus:ring-2 focus:ring-red-500/30'
                          : 'border-gray-200 focus:ring-2 focus:ring-emerald-500'
                      }`} />
                    {registerForm.formState.errors.firstName && (
                      <p className="text-xs text-red-500 mt-1" role="alert">{registerForm.formState.errors.firstName.message}</p>
                    )}
                  </div>
                  <div>
                    <label htmlFor="reg-lastName" className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                    <input id="reg-lastName" {...registerForm.register('lastName')} placeholder="Last name"
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none transition-all text-sm focus:ring-2 focus:ring-emerald-500" />
                  </div>
                </div>

                <div>
                  <label htmlFor="reg-email" className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                  <input id="reg-email" type="email" {...registerForm.register('email')} placeholder="Enter email"
                    className={`w-full px-4 py-3 border rounded-xl outline-none transition-all text-sm ${
                      registerForm.formState.errors.email
                        ? 'border-red-300 focus:ring-2 focus:ring-red-500/30'
                        : 'border-gray-200 focus:ring-2 focus:ring-emerald-500'
                    }`} />
                  {registerForm.formState.errors.email && (
                    <p className="text-xs text-red-500 mt-1" role="alert">{registerForm.formState.errors.email.message}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="reg-phone" className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input id="reg-phone" {...registerForm.register('phone')} placeholder="Enter phone"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none transition-all text-sm focus:ring-2 focus:ring-emerald-500" />
                </div>

                <div>
                  <label htmlFor="reg-password" className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
                  <input id="reg-password" type="password" {...registerForm.register('password')} placeholder="Min 6 characters"
                    className={`w-full px-4 py-3 border rounded-xl outline-none transition-all text-sm ${
                      registerForm.formState.errors.password
                        ? 'border-red-300 focus:ring-2 focus:ring-red-500/30'
                        : 'border-gray-200 focus:ring-2 focus:ring-emerald-500'
                    }`} />
                  {registerForm.formState.errors.password && (
                    <p className="text-xs text-red-500 mt-1" role="alert">{registerForm.formState.errors.password.message}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="reg-confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">Confirm Password *</label>
                  <input id="reg-confirmPassword" type="password" {...registerForm.register('confirmPassword')} placeholder="Confirm password"
                    className={`w-full px-4 py-3 border rounded-xl outline-none transition-all text-sm ${
                      registerForm.formState.errors.confirmPassword
                        ? 'border-red-300 focus:ring-2 focus:ring-red-500/30'
                        : 'border-gray-200 focus:ring-2 focus:ring-emerald-500'
                    }`} />
                  {registerForm.formState.errors.confirmPassword && (
                    <p className="text-xs text-red-500 mt-1" role="alert">{registerForm.formState.errors.confirmPassword.message}</p>
                  )}
                </div>

                <motion.button type="submit" disabled={registerForm.formState.isSubmitting}
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  className="w-full py-4 bg-gradient-to-r from-emerald-600 to-green-600 text-white font-semibold rounded-xl hover:from-emerald-700 hover:to-green-700 transition-all shadow-lg disabled:opacity-50">
                  {registerForm.formState.isSubmitting
                    ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" />
                    : 'Create Account'}
                </motion.button>

                <div className="text-center text-sm text-gray-500">
                  Already have an account? <button type="button" className="text-emerald-600 hover:underline" onClick={() => { setView('login'); setFormError(''); }}>Sign in</button>
                </div>
              </form>
            </motion.div>
          )}
        </div>
      </div>

      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-emerald-500 to-green-700 p-12 items-center justify-center relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -translate-y-1/3 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-emerald-900 opacity-10 rounded-full translate-y-1/3 -translate-x-1/3" />
        <div className="max-w-md relative z-10">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <h2 className="text-3xl font-bold text-white mb-3">Grow Your Business</h2>
            <p className="text-emerald-100 mb-8">Join thousands of vendors selling on MyMart. Set up your store and start reaching millions of customers today.</p>
            <div className="space-y-4">
              {vendorFeatures.map((feature, i) => (
                <motion.div key={i} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + i * 0.07 }}
                  className="flex items-center gap-4 p-4 bg-white/10 backdrop-blur-sm rounded-xl">
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center text-white">
                    {feature.icon}
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">{feature.title}</h3>
                    <p className="text-sm text-emerald-100">{feature.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}

function Step3ResetPassword({ loading, onSubmit }) {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [err, setErr] = useState('')

  const handleSubmit = () => {
    if (password.length < 6) { setErr('Password must be at least 6 characters'); return }
    if (password !== confirm) { setErr('Passwords do not match'); return }
    setErr('')
    onSubmit(password)
  }

  return (
    <div className="space-y-5">
      {err && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center gap-2" role="alert">
          <AlertCircle size={16} /> {err}
        </div>
      )}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">New Password</label>
        <div className="relative">
          <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type={showPw ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Min 6 characters"
            className="w-full pl-12 pr-12 py-3.5 border border-gray-200 rounded-xl outline-none transition-all bg-white/50 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          />
          <button type="button" onClick={() => setShowPw(!showPw)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
            {showPw ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        </div>
      </div>
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">Confirm New Password</label>
        <div className="relative">
          <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type={showPw ? 'text' : 'password'}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Confirm your password"
            className="w-full pl-12 pr-4 py-3.5 border border-gray-200 rounded-xl outline-none transition-all bg-white/50 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          />
        </div>
      </div>
      <motion.button
        onClick={handleSubmit}
        disabled={loading}
        whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
        className="w-full py-4 bg-gradient-to-r from-emerald-600 to-green-600 text-white font-semibold rounded-xl hover:from-emerald-700 hover:to-green-700 transition-all shadow-lg shadow-emerald-500/30 disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {loading ? (
          <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Resetting...</>
        ) : (
          <><Lock size={18} /> Reset Password</>
        )}
      </motion.button>
    </div>
  )
}
