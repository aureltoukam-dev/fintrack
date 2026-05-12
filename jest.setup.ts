// Polyfill pour uuid
jest.mock('react-native-get-random-values', () => ({}));
jest.mock('uuid', () => ({ v4: () => 'test-uuid-' + Math.random().toString(36).slice(2) }));

// Silence console.error in tests
jest.spyOn(console, 'error').mockImplementation(() => {});
