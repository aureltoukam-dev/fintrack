const mockDb = {
  runSync: jest.fn(),
  execSync: jest.fn(),
  getAllSync: jest.fn(() => []),
  getFirstSync: jest.fn(() => null),
};

module.exports = {
  openDatabaseSync: jest.fn(() => mockDb),
  __mockDb: mockDb,
};
