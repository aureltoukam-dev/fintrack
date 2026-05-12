/**
 * AuthStore integration tests.
 * We import the store ONCE (shared instance) so that the native mocks
 * (expo-secure-store, expo-local-authentication) are shared correctly.
 * We reset store state manually in beforeEach.
 */
import { useAuthStore } from '../../stores/authStore';
import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';

const secureStoreMock = SecureStore as any;
const localAuthMock = LocalAuthentication as any;

const initialState = {
  isLocked: false,
  isPinEnabled: false,
  isBiometricEnabled: false,
  isBiometricAvailable: true,
  isAuthReady: false,
};

beforeEach(() => {
  secureStoreMock.__reset();
  jest.clearAllMocks();
  // Restore default mock implementations after clearAllMocks
  secureStoreMock.getItemAsync.mockImplementation(async (key: string) => secureStoreMock.__store[key] ?? null);
  secureStoreMock.setItemAsync.mockImplementation(async (key: string, value: string) => { secureStoreMock.__store[key] = value; });
  secureStoreMock.deleteItemAsync.mockImplementation(async (key: string) => { delete secureStoreMock.__store[key]; });
  localAuthMock.hasHardwareAsync.mockResolvedValue(true);
  localAuthMock.authenticateAsync.mockResolvedValue({ success: true });
  // Reset store state
  useAuthStore.setState(initialState);
});

// ─── initAuth ─────────────────────────────────────────────────────────────────

describe('initAuth', () => {
  test('no PIN stored → not locked, isPinEnabled=false, isAuthReady=true', async () => {
    await useAuthStore.getState().initAuth();
    expect(useAuthStore.getState().isPinEnabled).toBe(false);
    expect(useAuthStore.getState().isLocked).toBe(false);
    expect(useAuthStore.getState().isAuthReady).toBe(true);
  });

  test('PIN stored → isPinEnabled=true, isLocked=true', async () => {
    secureStoreMock.__store['fintrack_pin_hash'] = 'somehash';
    await useAuthStore.getState().initAuth();
    expect(useAuthStore.getState().isPinEnabled).toBe(true);
    expect(useAuthStore.getState().isLocked).toBe(true);
  });

  test('biometric enabled → isBiometricEnabled=true, isLocked=true', async () => {
    secureStoreMock.__store['fintrack_biometric_enabled'] = 'true';
    await useAuthStore.getState().initAuth();
    expect(useAuthStore.getState().isBiometricEnabled).toBe(true);
    expect(useAuthStore.getState().isLocked).toBe(true);
  });

  test('hardware not available → isBiometricAvailable=false', async () => {
    localAuthMock.hasHardwareAsync.mockResolvedValueOnce(false);
    await useAuthStore.getState().initAuth();
    expect(useAuthStore.getState().isBiometricAvailable).toBe(false);
  });
});

// ─── setupPin + unlockWithPin ─────────────────────────────────────────────────

describe('setupPin / unlockWithPin', () => {
  test('setupPin stores hashed PIN and sets isPinEnabled=true', async () => {
    await useAuthStore.getState().setupPin('1234');
    expect(useAuthStore.getState().isPinEnabled).toBe(true);
    expect(useAuthStore.getState().isLocked).toBe(false);
    expect(secureStoreMock.setItemAsync).toHaveBeenCalledWith('fintrack_pin_hash', expect.any(String));
  });

  test('setupPin stores a hash, not the raw PIN', async () => {
    await useAuthStore.getState().setupPin('1234');
    const storedHash = secureStoreMock.__store['fintrack_pin_hash'];
    expect(storedHash).not.toBe('1234');
    expect(storedHash).toBeTruthy();
  });

  test('same PIN always produces the same hash (deterministic)', async () => {
    await useAuthStore.getState().setupPin('4321');
    const hash1 = secureStoreMock.__store['fintrack_pin_hash'];

    secureStoreMock.__reset();
    await useAuthStore.getState().setupPin('4321');
    const hash2 = secureStoreMock.__store['fintrack_pin_hash'];
    expect(hash1).toBe(hash2);
  });

  test('two different PINs hash differently', async () => {
    await useAuthStore.getState().setupPin('1111');
    const hash1 = secureStoreMock.__store['fintrack_pin_hash'];

    secureStoreMock.__reset();
    await useAuthStore.getState().setupPin('2222');
    const hash2 = secureStoreMock.__store['fintrack_pin_hash'];
    expect(hash1).not.toBe(hash2);
  });

  test('unlockWithPin with correct PIN → returns true, isLocked=false', async () => {
    await useAuthStore.getState().setupPin('5678');
    useAuthStore.setState({ isLocked: true });
    const result = await useAuthStore.getState().unlockWithPin('5678');
    expect(result).toBe(true);
    expect(useAuthStore.getState().isLocked).toBe(false);
  });

  test('unlockWithPin with wrong PIN → returns false, remains locked', async () => {
    await useAuthStore.getState().setupPin('5678');
    useAuthStore.setState({ isLocked: true });
    const result = await useAuthStore.getState().unlockWithPin('9999');
    expect(result).toBe(false);
    expect(useAuthStore.getState().isLocked).toBe(true);
  });

  test('unlockWithPin with no PIN configured → returns false', async () => {
    const result = await useAuthStore.getState().unlockWithPin('1234');
    expect(result).toBe(false);
  });
});

// ─── lock ─────────────────────────────────────────────────────────────────────

describe('lock', () => {
  test('lock with no PIN and no biometric → stays unlocked', () => {
    useAuthStore.setState({ isPinEnabled: false, isBiometricEnabled: false, isLocked: false });
    useAuthStore.getState().lock();
    expect(useAuthStore.getState().isLocked).toBe(false);
  });

  test('lock with PIN enabled → isLocked=true', () => {
    useAuthStore.setState({ isPinEnabled: true, isLocked: false });
    useAuthStore.getState().lock();
    expect(useAuthStore.getState().isLocked).toBe(true);
  });

  test('lock with biometric only (no PIN) → locked with no PIN fallback (bug)', async () => {
    useAuthStore.setState({ isPinEnabled: false, isBiometricEnabled: true, isLocked: false });
    useAuthStore.getState().lock();
    expect(useAuthStore.getState().isLocked).toBe(true);
    // No PIN stored → unlockWithPin always fails → user permanently locked out if biometric fails
    const result = await useAuthStore.getState().unlockWithPin('0000');
    expect(result).toBe(false); // BUG: no recovery path
  });
});

// ─── removePin ────────────────────────────────────────────────────────────────

describe('removePin', () => {
  test('clears PIN and biometric from storage and resets state', async () => {
    await useAuthStore.getState().setupPin('1234');
    await useAuthStore.getState().setBiometricEnabled(true);
    useAuthStore.setState({ isLocked: true });

    await useAuthStore.getState().removePin();
    const s = useAuthStore.getState();
    expect(s.isPinEnabled).toBe(false);
    expect(s.isBiometricEnabled).toBe(false);
    expect(s.isLocked).toBe(false);
    expect(secureStoreMock.__store['fintrack_pin_hash']).toBeUndefined();
    expect(secureStoreMock.__store['fintrack_biometric_enabled']).toBeUndefined();
  });
});

// ─── setBiometricEnabled ──────────────────────────────────────────────────────

describe('setBiometricEnabled', () => {
  test('sets isBiometricEnabled=true and persists "true" to SecureStore', async () => {
    await useAuthStore.getState().setBiometricEnabled(true);
    expect(useAuthStore.getState().isBiometricEnabled).toBe(true);
    expect(secureStoreMock.__store['fintrack_biometric_enabled']).toBe('true');
  });

  test('sets isBiometricEnabled=false and persists "false" to SecureStore', async () => {
    await useAuthStore.getState().setBiometricEnabled(false);
    expect(useAuthStore.getState().isBiometricEnabled).toBe(false);
    expect(secureStoreMock.__store['fintrack_biometric_enabled']).toBe('false');
  });
});

// ─── unlockWithBiometric ──────────────────────────────────────────────────────

describe('unlockWithBiometric', () => {
  test('successful auth → isLocked=false, returns true', async () => {
    useAuthStore.setState({ isLocked: true });
    localAuthMock.authenticateAsync.mockResolvedValueOnce({ success: true });
    const result = await useAuthStore.getState().unlockWithBiometric();
    expect(result).toBe(true);
    expect(useAuthStore.getState().isLocked).toBe(false);
  });

  test('failed auth → isLocked unchanged, returns false', async () => {
    useAuthStore.setState({ isLocked: true });
    localAuthMock.authenticateAsync.mockResolvedValueOnce({ success: false });
    const result = await useAuthStore.getState().unlockWithBiometric();
    expect(result).toBe(false);
    expect(useAuthStore.getState().isLocked).toBe(true);
  });

  test('uses correct prompt message in French', async () => {
    await useAuthStore.getState().unlockWithBiometric();
    expect(localAuthMock.authenticateAsync).toHaveBeenCalledWith(
      expect.objectContaining({ promptMessage: 'Déverrouiller FinTrack' })
    );
  });
});
