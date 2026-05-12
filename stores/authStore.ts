import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';

const PIN_KEY = 'fintrack_pin_hash';

const hashPin = (pin: string): string => {
  // Simple deterministic hash — not crypto-grade but sufficient for local PIN
  let h = 5381;
  for (let i = 0; i < pin.length; i++) {
    h = (h * 33) ^ pin.charCodeAt(i);
  }
  return String(h >>> 0);
};

interface AuthStore {
  isLocked: boolean;
  isPinEnabled: boolean;
  isBiometricEnabled: boolean;
  isBiometricAvailable: boolean;
  isAuthReady: boolean;

  initAuth: () => Promise<void>;
  lock: () => void;
  unlockWithPin: (pin: string) => Promise<boolean>;
  unlockWithBiometric: () => Promise<boolean>;
  setupPin: (pin: string) => Promise<void>;
  removePin: () => Promise<void>;
  setBiometricEnabled: (enabled: boolean) => Promise<void>;
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  isLocked: false,
  isPinEnabled: false,
  isBiometricEnabled: false,
  isBiometricAvailable: false,
  isAuthReady: false,

  initAuth: async () => {
    const [storedPin, biometricEnabled, hardware] = await Promise.all([
      SecureStore.getItemAsync(PIN_KEY),
      SecureStore.getItemAsync('fintrack_biometric_enabled'),
      LocalAuthentication.hasHardwareAsync(),
    ]);

    const isPinEnabled = !!storedPin;
    const isBiometricEnabled = biometricEnabled === 'true';
    const isBiometricAvailable = hardware;
    const isLocked = isPinEnabled || isBiometricEnabled;

    set({ isPinEnabled, isBiometricEnabled, isBiometricAvailable, isLocked, isAuthReady: true });
  },

  lock: () => {
    const { isPinEnabled, isBiometricEnabled } = get();
    if (isPinEnabled || isBiometricEnabled) {
      set({ isLocked: true });
    }
  },

  unlockWithPin: async (pin: string) => {
    const stored = await SecureStore.getItemAsync(PIN_KEY);
    if (!stored) return false;
    const correct = hashPin(pin) === stored;
    if (correct) set({ isLocked: false });
    return correct;
  },

  unlockWithBiometric: async () => {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Déverrouiller FinTrack',
      cancelLabel: 'Annuler',
      fallbackLabel: 'Code PIN',
      disableDeviceFallback: false,
    });
    if (result.success) set({ isLocked: false });
    return result.success;
  },

  setupPin: async (pin: string) => {
    await SecureStore.setItemAsync(PIN_KEY, hashPin(pin));
    set({ isPinEnabled: true, isLocked: false });
  },

  removePin: async () => {
    await SecureStore.deleteItemAsync(PIN_KEY);
    await SecureStore.deleteItemAsync('fintrack_biometric_enabled');
    set({ isPinEnabled: false, isBiometricEnabled: false, isLocked: false });
  },

  setBiometricEnabled: async (enabled: boolean) => {
    await SecureStore.setItemAsync('fintrack_biometric_enabled', String(enabled));
    set({ isBiometricEnabled: enabled });
  },
}));
