import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { COLORS } from '../theme';
import { getApiUrl, setApiUrl } from '../api';

export default function ProfileScreen({ user, onLogout }) {
  const [serverUrl, setServerUrl] = useState(getApiUrl());
  const [savedMsg, setSavedMsg] = useState('');

  async function saveServer() {
    const updated = await setApiUrl(serverUrl);
    setServerUrl(updated);
    setSavedMsg('Backend URL updated.');
    setTimeout(() => setSavedMsg(''), 2500);
  }

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {(user.name || 'S').slice(0, 1).toUpperCase()}
          </Text>
        </View>
        <Text style={styles.name}>{user.name}</Text>
        <Text style={styles.email}>{user.email}</Text>
        {user.phone ? <Text style={styles.phone}>{user.phone}</Text> : null}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Backend API Connection</Text>
        <Text style={styles.hint}>
          Update this if running on a physical phone via Expo Go (use your computer’s local IP,
          e.g., http://192.168.1.5:4000).
        </Text>
        <TextInput
          style={styles.input}
          value={serverUrl}
          onChangeText={setServerUrl}
          autoCapitalize="none"
        />
        {savedMsg ? <Text style={styles.savedText}>{savedMsg}</Text> : null}
        <TouchableOpacity style={styles.saveBtn} onPress={saveServer}>
          <Text style={styles.saveBtnText}>Save Server URL</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.logoutBtn} onPress={onLogout}>
        <Text style={styles.logoutText}>Sign Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: 16, paddingBottom: 32 },
  profileCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 22,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 16,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  avatarText: { fontSize: 26, fontWeight: '800', color: COLORS.primary },
  name: { fontSize: 19, fontWeight: '800', color: COLORS.text },
  email: { fontSize: 13.5, color: COLORS.muted, marginTop: 2 },
  phone: { fontSize: 13, color: COLORS.muted, marginTop: 2 },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 16,
  },
  cardTitle: { fontSize: 15.5, fontWeight: '700', color: COLORS.text, marginBottom: 6 },
  hint: { fontSize: 12.5, color: COLORS.muted, lineHeight: 18, marginBottom: 10 },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    marginBottom: 10,
    color: COLORS.text,
  },
  savedText: { color: COLORS.success, fontSize: 12.5, fontWeight: '600', marginBottom: 8 },
  saveBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
  },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  logoutBtn: {
    backgroundColor: COLORS.dangerSoft,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  logoutText: { color: COLORS.danger, fontWeight: '800', fontSize: 15 },
});
