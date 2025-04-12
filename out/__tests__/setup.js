import { config } from 'dotenv';
import { join } from 'path';
import '@jest/globals';
// Load test environment variables
config({ path: join(process.cwd(), '.env.test') });
// Set test environment variables defaults
process.env.NODE_ENV = 'test';
process.env.PORT = '5001';
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
// Mock storage paths for testing
process.env.STORAGE_PATH = join(process.cwd(), 'test-storage');
// Global test timeout
jest.setTimeout(30000);
