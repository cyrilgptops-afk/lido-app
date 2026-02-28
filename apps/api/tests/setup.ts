// Set test environment variables before any module loads
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'super-secret-jwt-key-for-testing-only-32ch';
process.env.PORT = '4001';
