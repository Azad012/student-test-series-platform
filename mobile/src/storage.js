import { Platform } from 'react-native';

const memoryStore = new Map();
let asyncStorageModule = null;

try {
  // Loaded dynamically when installed
  asyncStorageModule = require('@react-native-async-storage/async-storage').default;
} catch {
  asyncStorageModule = null;
}

export async function getItem(key) {
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
    return window.localStorage.getItem(key);
  }
  if (asyncStorageModule) {
    return asyncStorageModule.getItem(key);
  }
  return memoryStore.get(key) ?? null;
}

export async function setItem(key, value) {
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.setItem(key, value);
    return;
  }
  if (asyncStorageModule) {
    await asyncStorageModule.setItem(key, value);
    return;
  }
  memoryStore.set(key, value);
}

export async function removeItem(key) {
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.removeItem(key);
    return;
  }
  if (asyncStorageModule) {
    await asyncStorageModule.removeItem(key);
    return;
  }
  memoryStore.delete(key);
}
