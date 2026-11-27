import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { COLORS } from '../theme';
import { mobileApi, setAuthToken, getApiUrl, setApiUrl } from '../api';

export default function AuthScreen({ onAuthenticated }) {
  const [mode, setMode] = useState('login'); // 'login' | 'register' | 'forgot'
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [otpStep, setOtpStep] = useState(false);
  const [resendSec, setResendSec] = useState(0);

  const [showServerBox, setShowServerBox] = useState(false);
  const [serverUrl, setServerUrl] = useState(getApiUrl());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  useEffect(() => {
    if (resendSec <= 0) return;
    const timer = setTimeout(() => setResendSec((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendSec]);

  function switchMode(nextMode) {
    setMode(nextMode);
    setOtpStep(false);
    setOtp('');
    setError('');
    setInfo('');
  }

  async function handleLogin() {
    if (!email.trim() || !password) {
      setError('Email and password are required');
      return;
    }
    setError('');
    setInfo('');
    setLoading(true);
    try {
      if (showServerBox) await setApiUrl(serverUrl);
      const res = await mobileApi.login(email.trim(), password);
      if (res.user?.role !== 'student') {
        throw new Error('Please sign in with a Student account.');
      }
      await setAuthToken(res.token);
      onAuthenticated(res.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSendRegisterOtp() {
    if (!name.trim() || !email.trim() || password.length < 6) {
      setError('Please provide Name, valid Email, and Password (min 6 characters)');
      return;
    }
    setError('');
    setInfo('');
    setLoading(true);
    try {
      if (showServerBox) await setApiUrl(serverUrl);
      const res = await mobileApi.sendRegisterOtp({
        name: name.trim(),
        email: email.trim(),
      });
      setOtpStep(true);
      setResendSec(30);
      if (res.devOtp) {
        setInfo(`Demo Mode: Your OTP is ${res.devOtp}`);
      } else {
        setInfo(`A 6-digit verification OTP has been sent to ${email.trim()}`);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyRegister() {
    if (otp.length !== 6) {
      setError('Please enter a 6-digit OTP');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const res = await mobileApi.register({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        password,
        otp: otp.trim(),
      });
      if (res.user?.role !== 'student') {
        throw new Error('Please sign in with a Student account.');
      }
      await setAuthToken(res.token);
      onAuthenticated(res.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSendForgotOtp() {
    if (!email.trim()) {
      setError('Please enter your registered email address');
      return;
    }
    setError('');
    setInfo('');
    setLoading(true);
    try {
      if (showServerBox) await setApiUrl(serverUrl);
      const res = await mobileApi.sendForgotOtp(email.trim());
      setOtpStep(true);
      setResendSec(30);
      if (res.devOtp) {
        setInfo(`Demo Mode: Your Reset OTP is ${res.devOtp}`);
      } else {
        setInfo(`Password reset OTP sent to ${email.trim()}`);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleResetPassword() {
    if (otp.length !== 6) {
      setError('Please enter a 6-digit OTP');
      return;
    }
    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const res = await mobileApi.resetPassword({
        email: email.trim(),
        otp: otp.trim(),
        newPassword,
      });
      setMode('login');
      setOtpStep(false);
      setOtp('');
      setNewPassword('');
      setPassword('');
      setInfo(res.message || 'Password reset successfully! Please sign in.');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.hero}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>⚡ EXAMPULSE</Text>
          </View>
          <Text style={styles.title}>Student Portal</Text>
          <Text style={styles.subtitle}>
            Practice timed 100-question mock tests, track accuracy, and review every solution.
          </Text>
        </View>

        <View style={styles.card}>
          {mode !== 'forgot' && (
            <View style={styles.toggleRow}>
              <TouchableOpacity
                style={[styles.toggleBtn, mode === 'login' && styles.toggleBtnActive]}
                onPress={() => switchMode('login')}
              >
                <Text style={[styles.toggleText, mode === 'login' && styles.toggleTextActive]}>
                  Login
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.toggleBtn, mode === 'register' && styles.toggleBtnActive]}
                onPress={() => switchMode('register')}
              >
                <Text style={[styles.toggleText, mode === 'register' && styles.toggleTextActive]}>
                  Register
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {mode === 'forgot' && (
            <View style={{ marginBottom: 14 }}>
              <Text style={{ fontSize: 17, fontWeight: '800', color: COLORS.navy }}>
                Reset Password
              </Text>
              <Text style={{ fontSize: 13, color: COLORS.muted, marginTop: 2 }}>
                Verify your email address via OTP to set a new password.
              </Text>
            </View>
          )}

          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {info ? (
            <View style={styles.infoBox}>
              <Text style={styles.infoText}>{info}</Text>
            </View>
          ) : null}

          {/* LOGIN FORM */}
          {mode === 'login' && (
            <>
              <Text style={styles.label}>Email Address</Text>
              <TextInput
                style={styles.input}
                placeholder="student@example.com"
                placeholderTextColor={COLORS.muted}
                autoCapitalize="none"
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
              />

              <View style={styles.passHeaderRow}>
                <Text style={styles.label}>Password</Text>
                <TouchableOpacity onPress={() => switchMode('forgot')}>
                  <Text style={styles.forgotText}>Forgot Password?</Text>
                </TouchableOpacity>
              </View>
              <TextInput
                style={styles.input}
                placeholder="Minimum 6 characters"
                placeholderTextColor={COLORS.muted}
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />

              <TouchableOpacity
                style={[styles.submitBtn, loading && { opacity: 0.7 }]}
                onPress={handleLogin}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.submitBtnText}>Sign In</Text>
                )}
              </TouchableOpacity>
            </>
          )}

          {/* REGISTER STEP 1 */}
          {mode === 'register' && !otpStep && (
            <>
              <Text style={styles.label}>Full Name</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Aarav Sharma"
                placeholderTextColor={COLORS.muted}
                value={name}
                onChangeText={setName}
              />

              <Text style={styles.label}>Phone Number (Optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., 9876543210"
                placeholderTextColor={COLORS.muted}
                keyboardType="phone-pad"
                value={phone}
                onChangeText={setPhone}
              />

              <Text style={styles.label}>Email Address</Text>
              <TextInput
                style={styles.input}
                placeholder="student@example.com"
                placeholderTextColor={COLORS.muted}
                autoCapitalize="none"
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
              />

              <Text style={styles.label}>Password</Text>
              <TextInput
                style={styles.input}
                placeholder="Minimum 6 characters"
                placeholderTextColor={COLORS.muted}
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />

              <TouchableOpacity
                style={[styles.submitBtn, loading && { opacity: 0.7 }]}
                onPress={handleSendRegisterOtp}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.submitBtnText}>Send Email OTP →</Text>
                )}
              </TouchableOpacity>
            </>
          )}

          {/* REGISTER STEP 2 (OTP VERIFY) */}
          {mode === 'register' && otpStep && (
            <>
              <Text style={styles.label}>Enter 6-Digit Email OTP</Text>
              <TextInput
                style={[styles.input, styles.otpInput]}
                placeholder="123456"
                placeholderTextColor={COLORS.muted}
                keyboardType="number-pad"
                maxLength={6}
                value={otp}
                onChangeText={(t) => setOtp(t.replace(/\D/g, '').slice(0, 6))}
              />

              <TouchableOpacity
                style={[styles.submitBtn, (loading || otp.length !== 6) && { opacity: 0.7 }]}
                onPress={handleVerifyRegister}
                disabled={loading || otp.length !== 6}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.submitBtnText}>Verify OTP & Create Account</Text>
                )}
              </TouchableOpacity>

              <View style={styles.otpActionRow}>
                <TouchableOpacity onPress={() => { setOtpStep(false); setOtp(''); setError(''); setInfo(''); }}>
                  <Text style={styles.subActionText}>← Change Details</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleSendRegisterOtp}
                  disabled={resendSec > 0 || loading}
                >
                  <Text style={[styles.subActionText, { color: resendSec > 0 ? COLORS.muted : COLORS.primary, fontWeight: '700' }]}>
                    {resendSec > 0 ? `Resend OTP (${resendSec}s)` : 'Resend OTP'}
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          {/* FORGOT PASSWORD STEP 1 */}
          {mode === 'forgot' && !otpStep && (
            <>
              <Text style={styles.label}>Registered Email Address</Text>
              <TextInput
                style={styles.input}
                placeholder="student@example.com"
                placeholderTextColor={COLORS.muted}
                autoCapitalize="none"
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
              />

              <TouchableOpacity
                style={[styles.submitBtn, loading && { opacity: 0.7 }]}
                onPress={handleSendForgotOtp}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.submitBtnText}>Send Reset OTP →</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity style={styles.backToLoginBtn} onPress={() => switchMode('login')}>
                <Text style={styles.backToLoginText}>← Back to Login</Text>
              </TouchableOpacity>
            </>
          )}

          {/* FORGOT PASSWORD STEP 2 */}
          {mode === 'forgot' && otpStep && (
            <>
              <Text style={styles.label}>Enter 6-Digit Email OTP</Text>
              <TextInput
                style={[styles.input, styles.otpInput]}
                placeholder="123456"
                placeholderTextColor={COLORS.muted}
                keyboardType="number-pad"
                maxLength={6}
                value={otp}
                onChangeText={(t) => setOtp(t.replace(/\D/g, '').slice(0, 6))}
              />

              <Text style={styles.label}>New Password</Text>
              <TextInput
                style={styles.input}
                placeholder="Minimum 6 characters"
                placeholderTextColor={COLORS.muted}
                secureTextEntry
                value={newPassword}
                onChangeText={setNewPassword}
              />

              <TouchableOpacity
                style={[styles.submitBtn, (loading || otp.length !== 6) && { opacity: 0.7 }]}
                onPress={handleResetPassword}
                disabled={loading || otp.length !== 6}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.submitBtnText}>Verify OTP & Reset Password</Text>
                )}
              </TouchableOpacity>

              <View style={styles.otpActionRow}>
                <TouchableOpacity onPress={() => switchMode('login')}>
                  <Text style={styles.subActionText}>← Back to Login</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleSendForgotOtp}
                  disabled={resendSec > 0 || loading}
                >
                  <Text style={[styles.subActionText, { color: resendSec > 0 ? COLORS.muted : COLORS.primary, fontWeight: '700' }]}>
                    {resendSec > 0 ? `Resend OTP (${resendSec}s)` : 'Resend OTP'}
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          {/* Optional Server URL configuration for custom backend */}
          <TouchableOpacity
            style={styles.serverToggle}
            onPress={() => setShowServerBox((prev) => !prev)}
          >
            <Text style={styles.serverToggleText}>
              {showServerBox ? '▾ Hide Backend URL Settings' : '⚙ Backend Connection Settings'}
            </Text>
          </TouchableOpacity>

          {showServerBox && (
            <View style={styles.serverBox}>
              <Text style={styles.serverLabel}>Backend API URL (Render / Local):</Text>
              <TextInput
                style={styles.serverInput}
                value={serverUrl}
                onChangeText={setServerUrl}
                autoCapitalize="none"
                placeholder="https://exampulse-y2py.onrender.com"
                placeholderTextColor={COLORS.muted}
              />
            </View>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  scroll: { padding: 20, paddingTop: 36, paddingBottom: 40 },
  hero: { marginBottom: 20 },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.primarySoft,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    marginBottom: 8,
  },
  badgeText: {
    color: COLORS.primary,
    fontWeight: '800',
    fontSize: 11,
    letterSpacing: 0.5,
  },
  title: { fontSize: 26, fontWeight: '800', color: COLORS.text, marginBottom: 6 },
  subtitle: { fontSize: 13.5, color: COLORS.muted, lineHeight: 19 },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  toggleRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: 10,
    padding: 4,
    marginBottom: 16,
  },
  toggleBtn: { flex: 1, paddingVertical: 9, alignItems: 'center', borderRadius: 8 },
  toggleBtnActive: { backgroundColor: COLORS.primary },
  toggleText: { fontSize: 13.5, fontWeight: '700', color: COLORS.muted },
  toggleTextActive: { color: '#FFFFFF' },
  passHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  forgotText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
  },
  errorBox: {
    backgroundColor: COLORS.dangerSoft,
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
  },
  errorText: { color: COLORS.danger, fontSize: 12.5 },
  infoBox: {
    backgroundColor: COLORS.successSoft,
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
  },
  infoText: { color: COLORS.success, fontSize: 12.5, fontWeight: '600' },
  label: { fontSize: 12.5, fontWeight: '700', color: COLORS.text, marginBottom: 5, marginTop: 10 },
  input: {
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: COLORS.text,
  },
  otpInput: {
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 8,
  },
  submitBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 18,
  },
  submitBtnText: { color: '#FFFFFF', fontSize: 14.5, fontWeight: '700' },
  otpActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
  },
  subActionText: { fontSize: 12.5, color: COLORS.muted },
  backToLoginBtn: {
    marginTop: 14,
    alignItems: 'center',
  },
  backToLoginText: { fontSize: 13, color: COLORS.muted, fontWeight: '600' },
  serverToggle: { marginTop: 20, alignItems: 'center' },
  serverToggleText: { fontSize: 11.5, color: COLORS.muted, fontWeight: '600' },
  serverBox: {
    marginTop: 10,
    backgroundColor: COLORS.bg,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  serverLabel: { fontSize: 11, color: COLORS.muted, marginBottom: 4 },
  serverInput: {
    fontSize: 12,
    color: COLORS.text,
    paddingVertical: 4,
  },
});
