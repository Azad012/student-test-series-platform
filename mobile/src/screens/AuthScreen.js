import React, { useState } from 'react';
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
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showServerBox, setShowServerBox] = useState(false);
  const [serverUrl, setServerUrl] = useState(getApiUrl());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit() {
    setError('');
    setLoading(true);
    try {
      if (showServerBox) {
        await setApiUrl(serverUrl);
      }
      let res;
      if (mode === 'login') {
        res = await mobileApi.login(email.trim(), password);
      } else {
        res = await mobileApi.register({
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          password,
        });
      }
      if (res.user?.role !== 'student') {
        throw new Error('Please sign in with a Student account (or register a new student).');
      }
      await setAuthToken(res.token);
      onAuthenticated(res.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function fillDemoStudent() {
    setMode('login');
    setEmail('student@testseries.app');
    setPassword('Student@123');
    setError('');
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.hero}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>STUDENT TEST SERIES</Text>
          </View>
          <Text style={styles.title}>ExamPulse Mobile</Text>
          <Text style={styles.subtitle}>
            Practice timed 100-question mock tests, track accuracy, and review every solution.
          </Text>
        </View>

        <View style={styles.card}>
          <View style={styles.toggleRow}>
            <TouchableOpacity
              style={[styles.toggleBtn, mode === 'login' && styles.toggleBtnActive]}
              onPress={() => {
                setMode('login');
                setError('');
              }}
            >
              <Text style={[styles.toggleText, mode === 'login' && styles.toggleTextActive]}>
                Login
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleBtn, mode === 'register' && styles.toggleBtnActive]}
              onPress={() => {
                setMode('register');
                setError('');
              }}
            >
              <Text style={[styles.toggleText, mode === 'register' && styles.toggleTextActive]}>
                Register
              </Text>
            </TouchableOpacity>
          </View>

          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {mode === 'register' && (
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
            </>
          )}

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
            style={[styles.primaryBtn, loading && { opacity: 0.7 }]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryBtnText}>
                {mode === 'login' ? 'Sign In' : 'Create Student Account'}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.demoBtn} onPress={fillDemoStudent}>
            <Text style={styles.demoBtnText}>Use Demo Student Account</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.serverToggle}
            onPress={() => setShowServerBox((prev) => !prev)}
          >
            <Text style={styles.serverToggleText}>
              {showServerBox ? 'Hide API Server Settings' : 'Configure Backend Server URL'}
            </Text>
          </TouchableOpacity>

          {showServerBox && (
            <View style={styles.serverBox}>
              <Text style={styles.label}>Backend API URL</Text>
              <TextInput
                style={styles.input}
                value={serverUrl}
                onChangeText={setServerUrl}
                autoCapitalize="none"
                placeholder="http://192.168.1.10:4000"
              />
              <Text style={styles.hint}>
                Use http://10.0.2.2:4000 for Android Emulator, http://localhost:4000 for Web/iOS,
                or your PC LAN IP on a physical phone.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.navy },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 20 },
  hero: { marginBottom: 22 },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(99, 102, 241, 0.25)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    marginBottom: 10,
  },
  badgeText: { color: '#C7D2FE', fontSize: 11, fontWeight: '700', letterSpacing: 0.8 },
  title: { color: '#FFFFFF', fontSize: 28, fontWeight: '800', marginBottom: 6 },
  subtitle: { color: '#CBD5E1', fontSize: 14, lineHeight: 20 },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 5,
  },
  toggleRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.bg,
    borderRadius: 10,
    padding: 4,
    marginBottom: 16,
  },
  toggleBtn: { flex: 1, paddingVertical: 9, alignItems: 'center', borderRadius: 8 },
  toggleBtnActive: { backgroundColor: COLORS.surface },
  toggleText: { fontSize: 14, fontWeight: '600', color: COLORS.muted },
  toggleTextActive: { color: COLORS.primary },
  label: { fontSize: 13, fontWeight: '600', color: COLORS.text, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14.5,
    color: COLORS.text,
    backgroundColor: '#fff',
    marginBottom: 12,
  },
  primaryBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 11,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 4,
  },
  primaryBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  demoBtn: {
    marginTop: 10,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: COLORS.primarySoft,
    alignItems: 'center',
  },
  demoBtnText: { color: COLORS.primary, fontSize: 13.5, fontWeight: '700' },
  errorBox: {
    backgroundColor: COLORS.dangerSoft,
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
  },
  errorText: { color: COLORS.danger, fontSize: 13, fontWeight: '500' },
  serverToggle: { marginTop: 14, alignItems: 'center' },
  serverToggleText: { color: COLORS.muted, fontSize: 12.5, fontWeight: '600' },
  serverBox: {
    marginTop: 12,
    padding: 12,
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  hint: { fontSize: 11.5, color: COLORS.muted, lineHeight: 16 },
});
