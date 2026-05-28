import React, { useState, useEffect } from 'react';
import { getSettings, updateSetting } from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings as SettingsIcon, Bell, Shield, Palette, Globe, Mail, Save, CheckCircle, Store, AlertCircle, Loader2 } from 'lucide-react';
import Toggle from '../components/ui/Toggle';

const settingsTabs = [
  { id: 'general', label: 'General', icon: SettingsIcon },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'appearance', label: 'Appearance', icon: Palette },
];

export default function Settings() {
  const [activeTab, setActiveTab] = useState('general');
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const [settings, setSettings] = useState({
    siteName: 'MyMart',
    siteUrl: '',
    supportEmail: '',
    currency: 'USD',
    timezone: 'UTC',
    emailNotifications: true,
    pushNotifications: true,
    orderAlerts: true,
    vendorAlerts: true,
    weeklyReports: true,
    twoFactorAuth: false,
    sessionTimeout: '30',
    passwordExpiry: '90',
    theme: 'light',
    primaryColor: '#10B981',
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getSettings();
      if (res.data?.success && res.data?.settings) {
        const s = res.data.settings;
        setSettings(prev => ({
          ...prev,
          siteName: s.site_name || s.siteName || prev.siteName,
          siteUrl: s.site_url || s.siteUrl || prev.siteUrl,
          supportEmail: s.support_email || s.supportEmail || prev.supportEmail,
          currency: s.currency || prev.currency,
          timezone: s.timezone || prev.timezone,
          emailNotifications: s.email_notifications ?? s.emailNotifications ?? prev.emailNotifications,
          pushNotifications: s.push_notifications ?? s.pushNotifications ?? prev.pushNotifications,
          orderAlerts: s.order_alerts ?? s.orderAlerts ?? prev.orderAlerts,
          vendorAlerts: s.vendor_alerts ?? s.vendorAlerts ?? prev.vendorAlerts,
          weeklyReports: s.weekly_reports ?? s.weeklyReports ?? prev.weeklyReports,
          twoFactorAuth: s.two_factor_auth ?? s.twoFactorAuth ?? prev.twoFactorAuth,
          sessionTimeout: s.session_timeout?.toString() || s.sessionTimeout || prev.sessionTimeout,
          passwordExpiry: s.password_expiry?.toString() || s.passwordExpiry || prev.passwordExpiry,
          theme: s.theme || prev.theme,
          primaryColor: s.primary_color || s.primaryColor || prev.primaryColor,
        }));
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
      setError('Could not load settings from server');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const updates = {
        site_name: settings.siteName,
        site_url: settings.siteUrl,
        support_email: settings.supportEmail,
        currency: settings.currency,
        timezone: settings.timezone,
        email_notifications: settings.emailNotifications,
        push_notifications: settings.pushNotifications,
        order_alerts: settings.orderAlerts,
        vendor_alerts: settings.vendorAlerts,
        weekly_reports: settings.weeklyReports,
        two_factor_auth: settings.twoFactorAuth,
        session_timeout: settings.sessionTimeout,
        password_expiry: settings.passwordExpiry,
        theme: settings.theme,
        primary_color: settings.primaryColor,
      };

      for (const [key, value] of Object.entries(updates)) {
        try {
          await updateSetting(key, value);
        } catch (e) {
          console.warn(`Failed to save setting "${key}":`, e);
        }
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
          <p className="text-gray-500 font-medium">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500">Manage your platform settings — changes are saved to the server</p>
      </motion.div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
          <AlertCircle size={20} className="text-red-600" />
          <span className="text-red-700">{error}</span>
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-6">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="lg:w-64 flex-shrink-0">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            {settingsTabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-5 py-4 text-left transition-all ${
                    activeTab === tab.id
                      ? 'bg-gradient-to-r from-emerald-500 to-green-600 text-white'
                      : 'hover:bg-emerald-50 text-gray-600'
                  }`}
                >
                  <Icon size={20} />
                  <span className="font-medium">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex-1">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            {activeTab === 'general' && (
              <div className="space-y-6">
                <div className="flex items-center gap-3 pb-4 border-b">
                  <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                    <Store className="text-emerald-600" size={20} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">General Settings</h3>
                    <p className="text-sm text-gray-500">Basic platform configuration</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Site Name</label>
                    <input type="text" value={settings.siteName} onChange={e => setSettings({...settings, siteName: e.target.value})} className="input-field" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Site URL</label>
                    <input type="url" value={settings.siteUrl} onChange={e => setSettings({...settings, siteUrl: e.target.value})} className="input-field" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Support Email</label>
                    <input type="email" value={settings.supportEmail} onChange={e => setSettings({...settings, supportEmail: e.target.value})} className="input-field" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Currency</label>
                    <select value={settings.currency} onChange={e => setSettings({...settings, currency: e.target.value})} className="input-field">
                      <option value="USD">USD - US Dollar</option>
                      <option value="EUR">EUR - Euro</option>
                      <option value="PKR">PKR - Pakistani Rupee</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'notifications' && (
              <div className="space-y-6">
                <div className="flex items-center gap-3 pb-4 border-b">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                    <Bell className="text-blue-600" size={20} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Notification Settings</h3>
                    <p className="text-sm text-gray-500">Manage how you receive alerts</p>
                  </div>
                </div>
                <div className="space-y-4">
                  {[
                    { key: 'emailNotifications', label: 'Email Notifications', desc: 'Receive notifications via email' },
                    { key: 'pushNotifications', label: 'Push Notifications', desc: 'Browser push notifications' },
                    { key: 'orderAlerts', label: 'Order Alerts', desc: 'Get notified for new orders' },
                    { key: 'vendorAlerts', label: 'Vendor Alerts', desc: 'Vendor registration and updates' },
                    { key: 'weeklyReports', label: 'Weekly Reports', desc: 'Receive weekly analytics reports' },
                  ].map(item => (
                    <div key={item.key} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                      <div>
                        <p className="font-medium text-gray-900">{item.label}</p>
                        <p className="text-sm text-gray-500">{item.desc}</p>
                      </div>
                      <Toggle checked={settings[item.key]} onChange={val => setSettings({...settings, [item.key]: val})} label={item.label} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'security' && (
              <div className="space-y-6">
                <div className="flex items-center gap-3 pb-4 border-b">
                  <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
                    <Shield className="text-red-600" size={20} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Security Settings</h3>
                    <p className="text-sm text-gray-500">Protect your admin account</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                    <div>
                      <p className="font-medium text-gray-900">Two-Factor Authentication</p>
                      <p className="text-sm text-gray-500">Add an extra layer of security</p>
                    </div>
                    <Toggle checked={settings.twoFactorAuth} onChange={val => setSettings({...settings, twoFactorAuth: val})} label="Two-Factor Authentication" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Session Timeout (minutes)</label>
                    <select value={settings.sessionTimeout} onChange={e => setSettings({...settings, sessionTimeout: e.target.value})} className="input-field">
                      <option value="15">15 minutes</option>
                      <option value="30">30 minutes</option>
                      <option value="60">1 hour</option>
                      <option value="120">2 hours</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Password Expiry (days)</label>
                    <select value={settings.passwordExpiry} onChange={e => setSettings({...settings, passwordExpiry: e.target.value})} className="input-field">
                      <option value="30">30 days</option>
                      <option value="60">60 days</option>
                      <option value="90">90 days</option>
                      <option value="0">Never</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'appearance' && (
              <div className="space-y-6">
                <div className="flex items-center gap-3 pb-4 border-b">
                  <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                    <Palette className="text-purple-600" size={20} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Appearance</h3>
                    <p className="text-sm text-gray-500">Customize the look and feel</p>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Theme</label>
                  <div className="grid grid-cols-3 gap-4">
                    {['light', 'dark', 'system'].map(theme => (
                      <button key={theme} onClick={() => setSettings({...settings, theme})}
                        className={`p-4 rounded-xl border-2 capitalize transition-all ${
                          settings.theme === theme ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        {theme}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Primary Color</label>
                  <div className="flex items-center gap-4">
                    <input type="color" value={settings.primaryColor} onChange={e => setSettings({...settings, primaryColor: e.target.value})} className="w-14 h-14 rounded-xl cursor-pointer border-0" />
                    <input type="text" value={settings.primaryColor} onChange={e => setSettings({...settings, primaryColor: e.target.value})} className="input-field font-mono" />
                  </div>
                </div>
              </div>
            )}

            <div className="mt-6 pt-6 border-t flex items-center justify-end gap-4">
              <AnimatePresence>
                {saved && (
                  <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="flex items-center gap-2 text-green-600">
                    <CheckCircle size={20} />
                    <span className="font-medium">Settings saved to server!</span>
                  </motion.div>
                )}
              </AnimatePresence>
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                onClick={handleSave} disabled={saving}
                className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-green-600 text-white font-medium rounded-xl hover:from-emerald-700 hover:to-green-700 transition-all shadow-lg shadow-emerald-500/30 flex items-center gap-2 disabled:opacity-50"
              >
                {saving ? <><Loader2 size={18} className="animate-spin" /> Saving...</> : <><Save size={18} /> Save Changes</>}
              </motion.button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
