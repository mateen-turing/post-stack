import path from 'path';
import dotenv from 'dotenv';
import { execSync } from 'child_process';

const envPath =
  process.env.NODE_ENV === 'test'
    ? path.resolve(process.cwd(), '.env.test')
    : path.resolve(process.cwd(), '.env');

dotenv.config({ path: envPath });

console.log(`🧩 Loaded environment from: ${envPath}`);
console.log(`🔧 NODE_ENV=${process.env.NODE_ENV}`);

import app from '../index';

export default async () => {
  console.log('🏗️ Running Prisma migrations for test DB...');

  execSync('npx prisma migrate reset --force --skip-seed', { stdio: 'inherit' });

  console.log('✅ Database migrated successfully.');

  const PORT = process.env.PORT || 3001;

  console.log('🚀 Starting test server...');

  const server = app.listen(PORT, () => {
    console.log(`✅ Test server running on port ${PORT}`);
  });

  // Wait briefly for server to start
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Store for global teardown
  (globalThis as any).__SERVER__ = server;
};
